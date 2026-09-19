import { FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import { LRUCache } from "lru-cache";
import Config from "../utils/Config.js";
import TwitchUtils, { TwitchToken } from "../utils/TwitchUtils.js";
import type { PatreonMember } from "./PatreonController.js";
import Logger from "../utils/Logger.js";
import Utils from "../utils/Utils.js";

type PremiumType = "no" | "lifetime" | "temporary" | "early_gift" | "gift";

/**
 * Created : 14/12/2022
 */
export default class AbstractController {
	protected static _dataPreloaded: boolean = false;
	protected static _earlyDonors: { [key: string]: boolean } = {};
	protected static _giftedPremium: { [key: string]: boolean } = {};
	/**
	 * Associate a UID to a reference UID
	 * If user B wants to share data of user A, this dictionnary
	 * will contain :
	 * {
	 * 	B:A
	 * }
	 */
	protected static _dataSharing: { [uid: string]: string } = {};

	private static readonly PREMIUM_TTL = 2 * 60 * 1000;
	private static readonly NO_PREMIUM_TTL = 60 * 1000;
	/**
	 * Twitch user ID to premium state.
	 */
	private static premiumState_cache = new LRUCache<string, PremiumType>({
		max: 10_000,
		ttl: AbstractController.PREMIUM_TTL,
	});

	/**
	 * Cache for frequently read config files.
	 * Shared by every controller, those files are global config.
	 */
	private static _configFileCache = new LRUCache<string, { data: any; mtime: number }>({
		max: 20,
		ttl: 1000 * 30, // 30 seconds TTL - files don't change often
	});

	/**
	 * Tracks in-flight file reads to prevent cache stampede
	 */
	private static _pendingFileReads = new Map<string, Promise<any>>();

	constructor() {}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/******************
	 * PUBLIC METHODS *
	 ******************/

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Clears the premium state cache.
	 */
	protected clearPremiumCache(uid?: string): void {
		if (uid) {
			AbstractController.premiumState_cache.delete(uid);
		} else {
			AbstractController.premiumState_cache.clear();
		}
	}

	/**
	 * Preloads the early donors and data sharing on a local cache
	 */
	protected preloadData(): void {
		if (AbstractController._dataPreloaded) return;

		if (fs.existsSync(Config.earlyDonors)) {
			const uids: string[] = JSON.parse(fs.readFileSync(Config.earlyDonors, "utf-8"));
			for (let i = 0; i < uids.length; i++) {
				AbstractController._earlyDonors[uids[i]!] = true;
			}
		}

		if (fs.existsSync(Config.giftedPremium)) {
			const uids: string[] = JSON.parse(fs.readFileSync(Config.giftedPremium, "utf-8"));
			for (let i = 0; i < uids.length; i++) {
				AbstractController._giftedPremium[uids[i]!] = true;
			}
		}

		if (fs.existsSync(Config.DATA_SHARING)) {
			AbstractController._dataSharing = JSON.parse(
				fs.readFileSync(Config.DATA_SHARING, "utf-8"),
			);
		} else {
			AbstractController._dataSharing = {};
		}
		AbstractController._dataPreloaded = true;
	}

	/**
	 * Returns true if it passes the user is authenticated
	 * @param request
	 * @param response
	 * @param blockRequest
	 * @param skipCache re-validate the token against Twitch instead of its cached state
	 */
	protected async twitchUserGuard(
		request: FastifyRequest,
		response: FastifyReply,
		blockRequest: boolean = true,
		skipCache: boolean = false,
	): Promise<false | TwitchToken> {
		//Missing auth token
		if (!request.headers.authorization) {
			if (blockRequest) {
				response
					.header("Content-Type", "application/json")
					.status(401)
					.send(
						JSON.stringify({
							errorCode: "MISSING_ACCESS_TOKEN",
							error: "Missing Twitch access token",
							success: false,
						}),
					);
			}
			return false;
		}

		const userInfo = await TwitchUtils.getUserFromToken(
			request.headers.authorization,
			skipCache,
		);
		if (!userInfo) {
			if (blockRequest) {
				response
					.header("Content-Type", "application/json")
					.status(401)
					.send(
						JSON.stringify({
							errorCode: "INVALID_ACCESS_TOKEN",
							error: "Invalid Twitch access token",
							success: false,
						}),
					);
			}
			return false;
		}

		return userInfo;
	}

	/**
	 * Returns true if it passes the admin check
	 * @param request
	 * @param response
	 */
	protected async adminGuard(
		request: FastifyRequest,
		response: FastifyReply,
	): Promise<false | TwitchToken> {
		//Admin endpoints must never run on a cached validation, a token revoked
		//a few seconds ago has to be rejected right away
		const userInfo = await this.twitchUserGuard(request, response, true, true);
		if (userInfo === false) return false;

		//Only allow admins
		if (Config.credentials.admin_ids.indexOf(userInfo.user_id) == -1) {
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(
				JSON.stringify({
					errorCode: "MISSING_ADMIN_PERMISSION",
					message: "You're not allowed to call this endpoint",
					success: false,
				}),
			);
			return false;
		}

		return userInfo;
	}

	/**
	 * Returns true if it passes the admin check
	 * @param request
	 * @param response
	 */
	protected async premiumGuard(
		request: FastifyRequest,
		response: FastifyReply,
	): Promise<false | TwitchToken> {
		const userInfo = await this.twitchUserGuard(request, response);
		if (userInfo === false) return false;
		let uid = userInfo.user_id;

		if ((await this.getUserPremiumState(uid)) === "no") {
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(
				JSON.stringify({
					message: "You're not allowed to call this premium-only endpoint",
					errorCode: "NOT_PREMIUM",
					success: false,
				}),
			);
			return false;
		}
		return userInfo;
	}

	/**
	 * Get if given user ID is premium or not
	 * @param uid
	 */
	protected async getUserPremiumState(uid: string): Promise<PremiumType> {
		const cached = AbstractController.premiumState_cache.get(uid);
		if (cached != undefined) return cached;
		let premiumType: PremiumType = "no";

		//Check if user is part of early donors with offered premium
		if (AbstractController._earlyDonors[uid] === true) {
			premiumType = "early_gift";
		}

		//Check if user has been offered premium
		if (premiumType == "no" && AbstractController._giftedPremium[uid] === true) {
			premiumType = "gift";
		}

		//Check if user is part of active patreon members
		if (premiumType == "no") {
			//Get patreon member ID from twitch user ID
			const jsonMap = await this.readCachedJsonFile<{ [uid: string]: string }>(
				Config.twitch2Patreon,
				{},
			);
			const memberID = jsonMap[uid];
			//No patreon account linked, no need to load the members list
			if (memberID) {
				//Get if user is part of the active patreon members
				const members = await this.readCachedJsonFile<PatreonMember[]>(
					Config.patreonMembers,
					[],
				);
				if (members.findIndex((v) => v.id === memberID) > -1) {
					premiumType = "temporary";
				}
			}
		}

		//Check if user donated for more than the lifetime premium amount
		if (premiumType == "no") {
			const json = await this.readCachedJsonFile<{ [uid: string]: number }>(
				Config.donorsList,
				{},
			);
			const donorAmount = json.hasOwnProperty(uid) ? json[uid]! : -1;
			if (donorAmount >= Config.lifetimeDonorThreshold) {
				premiumType = "lifetime";
			}
		}

		// Remember premium state of the user
		AbstractController.premiumState_cache.set(uid, premiumType, {
			ttl:
				premiumType == "no"
					? AbstractController.NO_PREMIUM_TTL
					: AbstractController.PREMIUM_TTL,
		});

		return premiumType;
	}

	/**
	 * Reads a JSON config file with caching.
	 * Uses the file mtime to invalidate the cache when the file changes, and
	 * shares in-flight reads so a burst of requests can't stampede the same file.
	 */
	protected async readCachedJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
		// Check if we have a pending read for this file (cache stampede prevention)
		const pending = AbstractController._pendingFileReads.get(filePath);
		if (pending) return pending as Promise<T>;

		// Check cache
		const cached = AbstractController._configFileCache.get(filePath);
		if (cached) {
			// Verify file hasn't changed (async stat is fast)
			try {
				const stats = await fs.promises.stat(filePath);
				if (stats.mtimeMs === cached.mtime) {
					return cached.data as T;
				}
			} catch {
				// File doesn't exist or error, return default
				return defaultValue;
			}
		}

		// Read file
		const readPromise = (async () => {
			try {
				const [content, stats] = await Promise.all([
					Utils.readFileAsync(filePath, "utf-8"),
					fs.promises.stat(filePath),
				]);
				const data = JSON.parse(content) as T;
				AbstractController._configFileCache.set(filePath, { data, mtime: stats.mtimeMs });
				return data;
			} catch {
				return defaultValue;
			} finally {
				AbstractController._pendingFileReads.delete(filePath);
			}
		})();

		AbstractController._pendingFileReads.set(filePath, readPromise);
		return readPromise;
	}

	/**
	 * Add headers to disable cache on a query response
	 * @param response
	 */
	protected disableCache(
		response: FastifyReply | { setHeader: (key: string, value: string) => void },
	): void {
		if ("header" in response) {
			response.header("Cache-Control", "no-store, max-age=0, must-revalidate");
			response.header("Expires", "0");
			response.header("Pragma", "no-cache");
			response.header("Surrogate-Control", "no-store");
		} else {
			//Fastify-static returns a wraper of the response that proxies "setHeader()"
			//calls to the response "header()"
			response.setHeader("Cache-Control", "no-store, max-age=0, must-revalidate");
			response.setHeader("Expires", "0");
			response.setHeader("Pragma", "no-cache");
			response.setHeader("Surrogate-Control", "no-store");
		}
	}

	/**
	 * Enables data sharing between 2 users.
	 * "receiver" will use data from "sharer"
	 * @param sharer user ID
	 * @param receiver user ID
	 */
	protected enableUserDataSharing(sharer: string, receiver: string): boolean {
		if (AbstractController._dataSharing[sharer] === receiver) return false;
		AbstractController._dataSharing[receiver] = sharer;
		fs.writeFileSync(
			Config.DATA_SHARING,
			JSON.stringify(AbstractController._dataSharing),
			"utf-8",
		);
		Logger.info("Enable data sharing between users " + sharer + "(main) and " + receiver);
		return true;
	}

	/**
	 * Disables data sharing between 2 users.
	 * @param uid user ID
	 */
	protected disableUserDataSharing(uid1: string, uid2: string): void {
		const ref = AbstractController._dataSharing[uid1];
		if (ref !== uid2) return;

		delete AbstractController._dataSharing[uid1];
		fs.writeFileSync(
			Config.DATA_SHARING,
			JSON.stringify(AbstractController._dataSharing),
			"utf-8",
		);

		//Copy ref data to removed user
		const refFilePath = Config.USER_DATA_PATH + ref + ".json";
		const targetFilePath = Config.USER_DATA_PATH + uid2 + ".json";
		fs.copyFileSync(refFilePath, targetFilePath);

		Logger.info("Disable data sharing between users " + uid1 + " and " + uid2);
	}

	/**
	 * Gets the shared user ID for the given one.
	 * If user A shares their data with user B, calling this
	 * method with "B" will return "A".
	 * Otherwise it will simply return the given user ID.
	 * @param uid user ID
	 */
	protected getSharedUID(uid: string): string {
		return AbstractController._dataSharing[uid] || uid;
	}

	/**
	 * Get a list of the users "uid" is sharing data with
	 * @param uid
	 */
	protected getDataSharingList(uid: string): string[] {
		const res: string[] = [];
		const dict = AbstractController._dataSharing;
		for (const sharing in dict) {
			if (sharing == uid) {
				res.push(dict[sharing]!);
			}
			if (dict[sharing] === uid) {
				res.push(sharing);
			}
		}

		return res;
	}

	/**
	 * Gifts premium to a user.
	 * @param uid
	 * @returns
	 */
	protected giftPremium(uid: string): boolean {
		if (AbstractController._giftedPremium[uid] === true) return false;

		//Add user to premium
		let uids: string[] = [];
		if (fs.existsSync(Config.giftedPremium)) {
			uids = JSON.parse(fs.readFileSync(Config.giftedPremium, "utf-8"));
		}
		if (!uids.includes(uid)) {
			uids.push(uid);
			fs.writeFileSync(Config.giftedPremium, JSON.stringify(uids), "utf-8");
		}
		AbstractController._giftedPremium[uid] = true;
		AbstractController.premiumState_cache.delete(uid);

		Logger.info("🎁🎁🎁Gifted premium to user " + uid + "🎁🎁🎁");
		return true;
	}

	/**
	 * Removes premium gift from a user.
	 * @param uid
	 * @returns
	 */
	protected ungiftPremium(uid: string): boolean {
		//Add user to premium
		let uids: string[] = [];
		if (fs.existsSync(Config.giftedPremium)) {
			uids = JSON.parse(fs.readFileSync(Config.giftedPremium, "utf-8"));
		}
		console.log("Check for", uid, uids.includes(uid));
		if (uids.includes(uid)) {
			console.log("Remove", uid);
			uids = uids.filter((v) => v != uid);
			fs.writeFileSync(Config.giftedPremium, JSON.stringify(uids), "utf-8");
		}
		AbstractController._giftedPremium[uid] = false;
		AbstractController.premiumState_cache.delete(uid);

		Logger.info("🎁❌❌Gifted premium removed from user " + uid + "❌❌🎁");
		return true;
	}
}
