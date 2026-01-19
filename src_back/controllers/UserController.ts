import JsonPatch from 'fast-json-patch';
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import { LRUCache } from "lru-cache";
import * as path from 'path';
import Config from '../utils/Config.js';
import { schemaValidator } from '../utils/DataSchema.js';
import Logger from '../utils/Logger.js';
import Utils from '../utils/Utils.js';
import AbstractController from "./AbstractController.js";
import DiscordController from './DiscordController.js';
import { PatreonMember } from './PatreonController.js';
import SSEController from './SSEController.js';

/**
* Created : 13/03/2022
*/
export default class UserController extends AbstractController {

	/**
	 * LRU cache for user data versions (prevents unbounded growth)
	 */
	private _lastUserDataVersion = new LRUCache<string, number>({
		max: 10000,
		ttl: 1000 * 60 * 60 * 24, // 24 hours
	});

	/**
	 * Cache for frequently read config files
	 */
	private _configFileCache = new LRUCache<string, { data: any; mtime: number }>({
		max: 20,
		ttl: 1000 * 30, // 30 seconds TTL - files don't change often
	});

	/**
	 * Tracks in-flight file reads to prevent cache stampede
	 */
	private _pendingFileReads = new Map<string, Promise<any>>();

	constructor(public server:FastifyInstance, private discordController:DiscordController) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/

	/**
	 * Reads a JSON config file with caching
	 * Uses file mtime to invalidate cache when file changes
	 */
	private async readCachedJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
		// Check if we have a pending read for this file (cache stampede prevention)
		const pending = this._pendingFileReads.get(filePath);
		if (pending) return pending as Promise<T>;

		// Check cache
		const cached = this._configFileCache.get(filePath);
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
					Utils.readFileAsync(filePath, 'utf-8'),
					fs.promises.stat(filePath)
				]);
				const data = JSON.parse(content) as T;
				this._configFileCache.set(filePath, { data, mtime: stats.mtimeMs });
				return data;
			} catch {
				return defaultValue;
			} finally {
				this._pendingFileReads.delete(filePath);
			}
		})();

		this._pendingFileReads.set(filePath, readPromise);
		return readPromise;
	}



	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/user', async (request, response) => await this.getUserState(request, response));
		this.server.get('/api/user/all', async (request, response) => await this.getAllUsers(request, response));
		this.server.get('/api/user/data', async (request, response) => await this.getUserData(request, response));
		this.server.get('/api/user/data/backup', async (request, response) => await this.getUserData(request, response, true));
		this.server.post('/api/user/data', async (request, response) => await this.postUserData(request, response));
		this.server.post('/api/user/data/backup', async (request, response) => await this.postUserDataBackup(request, response));
		this.server.post('/api/user/gift_premium', async (request, response) => await this.postGiftPremium(request, response));
		this.server.delete('/api/user/data', async (request, response) => await this.deleteUserData(request, response));
		this.server.delete('/api/auth/dataShare', async (request, response) => await this.deleteDataShare(request, response));

		this.server.get('/api/user/settingsPreset', async (request, response) => await this.getSettingsPresets(request, response));
		this.server.post('/api/user/settingsPreset', async (request, response) => await this.postSettingsPresets(request, response));

		super.preloadData();
	}



	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Get a user's donor/admin state
	 */
	private async getUserState(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		const uid = userInfo.user_id;
		type PremiumStates = "earlyDonor"|"patreon"|"lifetime"|"gifted"|"";
		let premiumType:PremiumStates = "";
		let donorLevel:number = -1;
		let amount:number = -1;
		let lifetimePercent:number = 0;

		// Load donors list with caching
		const donorsJson = await this.readCachedJsonFile<{[key:string]:number}>(Config.donorsList, {});
		if(donorsJson.hasOwnProperty(uid)) {
			amount = donorsJson[uid]!;
			donorLevel = Config.donorsLevels.findIndex(v=> v >= amount) - 1;
			lifetimePercent = amount / Config.lifetimeDonorThreshold;
		}

		// Update user's storage file to get a little idea on how many people use twitchat
		const userFilePath = Config.USER_DATA_PATH + uid+".json";
		try {
			await fs.promises.access(userFilePath);
			// File exists, update mtime (fire and forget)
			await fs.promises.utimes(userFilePath, new Date(), new Date()).catch(() => {/* ignore */});
		} catch {
			// File doesn't exist, create it
			await fs.promises.writeFile(userFilePath, JSON.stringify({}), "utf8");
		}

		// Is got gifted premium?
		if(premiumType == "" && AbstractController._giftedPremium[uid] === true) {
			premiumType = "gifted";
		}

		// Is user an early donor of twitchat?
		if(premiumType == "" && AbstractController._earlyDonors[uid] === true) {
			premiumType = "earlyDonor";
		}

		// Has user donated enough to be lifetime premium?
		if(premiumType == "" && amount >= Config.lifetimeDonorThreshold) {
			premiumType = "lifetime";
		}

		// Check if user has a patreon webhook secret (with caching)
		let patreonLinked = false;
		const patreonWebhookSecrets = await this.readCachedJsonFile<{[key:string]:{twitchId:string, secret:string}}>(
			Config.patreonUid2WebhookSecret, {}
		);
		for (const key in patreonWebhookSecrets) {
			if(patreonWebhookSecrets[key]!.twitchId === uid) {
				patreonLinked = true;
				break;
			}
		}

		// Is user part of Patreon donors? (with caching)
		if(premiumType == "") {
			const [jsonP2T, jsonPMembers] = await Promise.all([
				this.readCachedJsonFile<{[key:string]:string}>(Config.twitch2Patreon, {}),
				this.readCachedJsonFile<PatreonMember[]>(Config.patreonMembers, [])
			]);
			const patreonID = jsonP2T[uid];
			if(patreonID && jsonPMembers.findIndex(v=>v.id === patreonID) > -1) {
				premiumType = "patreon";
			}
		}
				
		// Get user's feature flags
		type Flag = keyof NonNullable<typeof Config.credentials.feature_flags>;
		let features: Flag[] = [];
		if(Config.credentials.feature_flags) {
			Object.keys(Config.credentials.feature_flags).forEach(flag => {
				const typedFlag = flag as Flag;
				if (Config.credentials.feature_flags![typedFlag].includes(uid)) {
					features.push(typedFlag);
				}
			});
		}

		const data:{dataSharing:string[],
					donorLevel:number,
					isAdmin?:true,
					premiumType:PremiumStates,
					lifetimePercent:number
					patreonLinked?:true,
					discordLinked?:true
					features?:Flag[]
				} = {
				donorLevel,
				lifetimePercent,
				premiumType,
				dataSharing: super.getDataSharingList(uid)
			};
		if(Config.credentials.admin_ids.includes(uid)) {
			data.isAdmin = true;
		}

		if(DiscordController.isDiscordLinked(uid) === true) {
			data.discordLinked = true;
		}

		if(Config.FORCE_NON_PREMIUM && Config.LOCAL_TESTING) {
			data.premiumType = "";
		}

		if(patreonLinked) {
			data.patreonLinked = true;
		}

		if(features.length > 0) {
			data.features = features;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data}));
	}

	/**
	 * Get/set a user's data
	 */
	private async getUserData(request:FastifyRequest, response:FastifyReply, backup = false) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		const uid:string = super.getSharedUID((request.query as any).uid ?? userInfo.user_id);
		
		//Validate UID to prevent path traversal
		if(!/^[0-9]+$/.test(uid)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"Invalid user ID", errorCode:"INVALID_UID"}));
			return;
		}

		//Get users' data
		let userFilePath = path.join(Config.USER_DATA_PATH, `${uid}.json`);
		if(backup == true) {
			userFilePath = path.join(Config.USER_DATA_BACKUP_PATH, `${uid}.json`);
		}

		try {
			const data = await Utils.readFileAsync(userFilePath, {encoding:"utf8"});
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:JSON.parse(data)}));
		} catch {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false}));
		}
	}

	/**
	 * Saves an emergency backup after a massive fail of mine...
	 */
	private async postUserDataBackup(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		if (request.headers["force"]) Logger.info("FORCE BACKUP", userInfo.login);

		//Get users' data
		const userFilePath = Config.USER_DATA_BACKUP_PATH + userInfo.user_id+".json";
		const forceBackup = request.headers["force"] == "true";

		let fileExists = false;
		try {
			await fs.promises.access(userFilePath);
			fileExists = true;
		} catch { /* file doesn't exist */ }

		if(!fileExists || forceBackup) {
			const body:any = request.body;
			await fs.promises.writeFile(userFilePath, JSON.stringify(body), "utf8");
		}
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Get/set a user's data
	 */
	private async postUserData(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;
		const body:any = (request.body as any);
		const data:any = body.data;
		const forcedUpload = body.forced === true;

		//Get users' data
		const uid = super.getSharedUID(userInfo.user_id);
		
		//Validate UID to prevent path traversal
		if(!/^[0-9]+$/.test(uid)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"Invalid user ID", errorCode:"INVALID_UID"}));
			return;
		}
		const userFilePath = Config.USER_DATA_PATH + uid+".json";
		const version = request.headers["app-version"];

		//avoid saving private data to server
		delete data.obsPass;
		delete data.oAuthToken;

		// body.data["p:slowMode"] = true;//Uncomment to test JSON diff

		//Test data format
		try {
			const dataClone = JSON.parse(JSON.stringify(data));

			// Initialize local data version for this user
			if(!this._lastUserDataVersion.has(userInfo.user_id)) {
				let version = 0;
				try {
					const refJson = await Utils.readFileAsync(userFilePath, "utf-8");
					version = JSON.parse(refJson).saveVersion;
				} catch { /* file doesn't exist or parse error */ }
				this._lastUserDataVersion.set(userInfo.user_id, version || 0);
				Logger.info("[DATA] Init local cache:",userInfo.login, dataClone.saveVersion, this._lastUserDataVersion.get(userInfo.user_id)?.toString() ?? "???");
			}

			const cachedVersion = this._lastUserDataVersion.get(userInfo.user_id) ?? 0;

			// If forcing data upload, make its version above the minimum expected one
			if(forcedUpload && cachedVersion != undefined) {
				Logger.info("[DATA] Force data upload:",userInfo.login, dataClone.saveVersion, cachedVersion.toString());
				data.saveVersion = dataClone.saveVersion = cachedVersion + 1;
				Logger.info("                 :", dataClone.saveVersion, cachedVersion.toString());
			}

			// Data outdated?
			if(dataClone.saveVersion <= cachedVersion) {
				Logger.warn("[DATA]",userInfo.login+" has outdated data version. Got " + dataClone.saveVersion + " but expected > " + cachedVersion+". Has "+SSEController.countUserConnexions(userInfo.user_id)+" active connexions")
				if(SSEController.countUserConnexions(userInfo.user_id) > 1) {
					// Stop saving if there are more than 1 active connections until I figure out why
					// someone got warned with only 1 active connection
					response.header('Content-Type', 'application/json');
					response.status(409);
					response.send(JSON.stringify({success:false, error:"outdated data version. Got " + dataClone.saveVersion + " but expected > " + cachedVersion, errorCode:"OUTDATED_DATA_VERSION"}));
					return;
				}
			}

			this._lastUserDataVersion.set(userInfo.user_id, dataClone.saveVersion);

			const success = schemaValidator(data);
			const errorsFilePath = Config.USER_DATA_PATH + uid+"_errors.json";
			if(!success) {
				Logger.error(schemaValidator.errors?.length+" validation error(s) for user "+userInfo.login+"'s data (v"+version+")");
				// Save schema errors if any (fire and forget)
				await fs.promises.writeFile(errorsFilePath, JSON.stringify(schemaValidator.errors), "utf-8").catch(() => {});
			} else {
				// Remove old error file if exists (fire and forget)
				await fs.promises.unlink(errorsFilePath).catch(() => {});
			}

			// schemaValidator() is supposed to tell if the format is valid or not.
			// Because we enabled "removeAdditional" option, no error will be thrown
			// if a field is not in the schema. Instead it will simply remove it.
			// V9+ of the lib is supposed to allow us to retrieve the removed props,
			// but it doesn't yet. As a workaround we use JSONPatch that compares
			// the JSON before and after validation.
			// This is not the most efficient way to do this, but I found no better
			// way to log these errors for now
			const diff = JsonPatch.compare(dataClone, data as any, false);
			const cleanupFilePath = Config.USER_DATA_PATH + uid+"_cleanup.json";
			if(diff?.length > 0) {
				Logger.error("Invalid format, some data have been removed from "+userInfo.login+"'s data (v"+version+")");
				console.log(diff);
				// Fire and forget
				await fs.promises.writeFile(cleanupFilePath, JSON.stringify(diff), "utf-8").catch(() => {});
			} else {
				// Fire and forget
				await fs.promises.unlink(cleanupFilePath).catch(() => {});
			}
			await fs.promises.writeFile(userFilePath, JSON.stringify(data), "utf8");

			if(data.discordParams) {
				this.discordController.updateParams(uid, data.discordParams);
			}

			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, version:this._lastUserDataVersion.get(userInfo.user_id)}));
		}catch(error){
			Logger.error("User data save failed for "+userInfo.login);
			console.log(error);
			const message = schemaValidator.errors;
			Logger.log(message);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false, error:message, errorCode:"INVALID_DATA_FORMAT"}));
		}
	}

	/**
	 * Allows users to get premium gift from code
	 */
	private async postGiftPremium(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		let codeValid:boolean|null = false;
		let premiumState = await super.getUserPremiumState(userInfo.user_id);
		let alreadyLifetimePremium = premiumState == "lifetime" || premiumState == "early_gift" || premiumState == "gift";
		// If user isn't lifetime premium already, check if code is valid
		if(!alreadyLifetimePremium) {
			const body:any = (request.body as {code:string});
			codeValid = Config.USE_PREMIUM_CREDITS(body.code);
			if(codeValid) {
				super.giftPremium(userInfo.user_id);
				try {
					Utils.sendSMSAlert("[TWITCHAT] "+userInfo.login+" got premium membership with code "+body.code);
					Utils.sendDashboardNotification("Gift code redeemed", userInfo.login+" got premium membership with code "+body.code, undefined, "success");	
				}catch(_){
					Logger.error("Unable to send SMS alert for premium code usage.");
				}
			}
		}

		const result = codeValid === true? "success" : codeValid === false? "empty_credits" : "invalid_code";
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, result, alreadyPremium: alreadyLifetimePremium}));
	}

	/**
	 * Delete a user's data
	 */
	private async deleteUserData(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		// Delete user's data
		const userFilePath = Config.USER_DATA_PATH + userInfo.user_id+".json";
		try {
			await fs.promises.rm(userFilePath);
			Logger.info("❌ User "+userInfo.login+" requested to delete their personal data.");
		} catch(error) {
			Logger.error("Failed to delete user data for "+userInfo.login, error+"");
		}

		// Also clear from version cache
		this._lastUserDataVersion.delete(userInfo.user_id);

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Get users list
	 */
	private async getAllUsers(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;

		const files = await fs.promises.readdir(Config.USER_DATA_PATH);
		const list = files.filter(v => v.indexOf("_cleanup") == -1 && v != ".git" && v.indexOf("_errors") == -1);

		// Get file stats in parallel (batched to avoid overwhelming the system)
		const users = await Promise.all(
			list.map(async (v) => {
				try {
					const stats = await fs.promises.stat(Config.USER_DATA_PATH + v);
					return {
						id: v.replace(".json", ""),
						date: stats.mtime.getTime()
					};
				} catch {
					return null;
				}
			})
		).then(results => results.filter((u): u is {id: string; date: number} => u !== null));

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, users}));
	}

	/**
	 * Unlinks a user data sharing
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async deleteDataShare(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response);
		if(!user) return;

		const params:any = request.query;
		const uid = params.uid;
		super.disableUserDataSharing(uid, user.user_id);
		super.disableUserDataSharing(user.user_id, uid);

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, users:this.getDataSharingList(user.user_id)}));
	}

	/**
	 * Get a settings presets
	 */
	private async getSettingsPresets(request:FastifyRequest, response:FastifyReply) {
		if(!await this.twitchUserGuard(request, response)) return;

		const params = request.query as {name:string};
		if(!params.name || typeof params.name !== "string" || params.name.trim().length === 0) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"Invalid name or data", errorCode:"INVALID_NAME_OR_DATA"}));
			return;
		}
		
		const folder = Config.SETTINGS_PRESETS_FOLDER;
		await fs.promises.mkdir(folder, { recursive: true });

		const normalizedName = params.name.toLowerCase()
			// Avoid navigating to parent/child folder. This is also filtered by next regex
			// but better being extra safe here in case next regex is updated at some point
			.replace(/[\/\\\.]/g, "")
			// Only keep alpha numeric, dash and underscore chars
			.replace(/[^a-z0-9_\-]/gi, "_");
		const parts = normalizedName.split('_');
		const userId = parts.pop() || "";
		const presetName = parts.join('_');
		
		// Validate userId to prevent path traversal
		if(!/^[0-9]+$/.test(userId)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"Invalid preset name format", errorCode:"INVALID_NAME_FORMAT"}));
			return;
		}
		
		const filePath = path.join(folder, userId, presetName+".json");
		try {
			const json = await Utils.readFileAsync(filePath, "utf8");
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:JSON.parse(json)}));
		} catch {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"Preset not found", errorCode:"NOT_FOUND"}));
		}
	}

	/**
	 * Creates settings presets
	 */
	private async postSettingsPresets(request:FastifyRequest, response:FastifyReply) {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return;
		if(Config.credentials.feature_flags?.export_configs?.includes(user.user_id) !== true) {
			response.header('Content-Type', 'application/json');
			response.status(403);
			response.send(JSON.stringify({success:false, error:"User is not allowed to export settings", errorCode:"USER_NOT_ALLOWED"}));
			return;
		}

		const params:any = request.body;
		if(!params.name || typeof params.name !== "string" || params.name.trim().length === 0
		|| (!params.encrypted && !params.data)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"Invalid name or data", errorCode:"INVALID_NAME_OR_DATA"}));
			return;
		}
		
		const folder = path.join(Config.SETTINGS_PRESETS_FOLDER, user.user_id);
		await fs.promises.mkdir(folder, { recursive: true });

		const content = params.data? JSON.stringify({authorId:user.user_id, data:params.data}) : JSON.stringify({authorId:user.user_id, data:params.encrypted});
		const fileName = params.name.toLowerCase()
			// Avoid navigating to parent/child folder. This is also filtered by next regex
			// but better being extra safe here in case next regex is updated at some point
			.replace(/[\/\\\.]/g, "")
			// Only keep alpha numeric, dash and underscore chars
			.replace(/[^a-z0-9_\-]/gi, "_")
			// Limit topo 20 chars long
			.substring(0, 20);
		await fs.promises.writeFile(path.join(folder, fileName+".json"), content, "utf8");

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, fileName:fileName+"_"+user.user_id}));
	}
}