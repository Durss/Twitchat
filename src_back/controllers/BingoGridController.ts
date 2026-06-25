import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import jwt from "jsonwebtoken";
import { LRUCache } from "lru-cache";
import Config from "../utils/Config.js";
import { LRUPersistence } from "../utils/lruPersistence.js";
import Logger from "../utils/Logger.js";
import TwitchUtils from "../utils/TwitchUtils.js";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";
import SSEController, { SSECode as SSETopic } from "./SSEController.js";
import TwitchExtensionController from "./TwitchExtensionController.js";

/**
 * Created : 01/06/2024
 */
export default class BingoGridController extends AbstractController {
	/**
	 * LRU cache for channel grids with automatic eviction
	 * Key format: "[channelId]/[gridId]"
	 */
	private channelGridsCache = new LRUCache<string, IStreamerGridsCacheData>({
		max: 500,
		ttl: 1000 * 60 * 5, // 5 minutes TTL
	});

	/**
	 * LRU cache for viewer grids (in-memory with periodic disk flush)
	 * Key format: "[channelId]/[bingoId]/[viewerId]"
	 */
	private viewerGridCache = new LRUCache<string, IViewerGridCacheData>({
		max: 10000,
		ttl: 1000 * 60 * 30, // 30 minutes TTL
	});

	/**
	 * Tracks viewer grids that need to be flushed to disk
	 */
	private dirtyViewerGrids = new Set<string>();

	/**
	 * Prevents cache stampede by tracking in-flight refresh operations
	 */
	private refreshingGrids = new Map<string, Promise<IStreamerGridsCacheData | void>>();

	/**
	 * Single-use JTI replay guard for share invite tokens.
	 * Each entry self-expires when the JWT does.
	 */
	private usedShareJtis = new Map<string, NodeJS.Timeout>();
	private static readonly SHARE_INVITE_TTL_SECONDS = 120;

	/**
	 * Contains which channels a grid updates must be forwarded with
	 * Key format: "[ownerId]/[gridId]" -> receiver IDs.
	 */
	private sharePushTargets = new LRUCache<string, Set<string>>({
		max: 5000,
		ttl: 1000 * 60 * 60 * 24, // 24h
	});

	/**
	 * Stores which channel a receiver/gridId tupple should resolve to.
	 * This way, if a streamer requestes for a shared grid, it will
	 * actually resolve to the owner's grid
	 * Key format: "[receiverId]/[gridId]" -> ownerId.
	 */
	private mirrorOwners = new LRUCache<string, string>({
		max: 5000,
		ttl: 1000 * 60 * 60 * 24, // 24h
	});

	/**
	 * Persists {@link sharePushTargets} to disk so the receivers' live updates
	 * survive a server reboot (until their link tokens expire).
	 */
	private sharePushPersistence = new LRUPersistence<string, Set<string>, string[]>({
		cache: this.sharePushTargets,
		fileName: Config.BINGO_SHARE_TARGETS_FILE,
		serialize: (set) => Array.from(set),
		deserialize: (arr) => new Set(arr),
		name: "bingoShareTargets",
	});

	/**
	 * Persists {@link mirrorOwners} so the receivers' viewers keep being served
	 * from the owner's pool across a server reboot.
	 */
	private mirrorOwnersPersistence = new LRUPersistence<string, string>({
		cache: this.mirrorOwners,
		fileName: Config.BINGO_MIRROR_OWNERS_FILE,
		name: "bingoMirrorOwners",
	});

	private extensionController!: TwitchExtensionController;

	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	public setTwitchExtensionController(controller: TwitchExtensionController): void {
		this.extensionController = controller;
	}

	private getChannelGridCacheKey(channelId: string, gridId?: string): string {
		return gridId ? `${channelId}/${gridId}` : channelId;
	}

	private getViewerGridCacheKey(channelId: string, bingoId: string, viewerId: string): string {
		return `${channelId}/${bingoId}/${viewerId}`;
	}

	/**
	 * Gets a viewer's cached grid (memory first, then disk)
	 */
	private async getViewerGrid(
		streamerId: string,
		bingoId: string,
		viewerId: string,
	): Promise<IViewerGridCacheData | void> {
		// Check memory cache first
		const cacheViewerKey = this.getViewerGridCacheKey(streamerId, bingoId, viewerId);
		const cachedViewer = this.viewerGridCache.get(cacheViewerKey);
		if (cachedViewer) return cachedViewer;

		// Fall back to disk
		const file = Config.BINGO_VIEWER_FILE(streamerId, bingoId, viewerId);
		try {
			const content = await Utils.readFileAsync(file, "utf-8");
			const data = JSON.parse(content) as IViewerGridCacheData;
			this.viewerGridCache.set(cacheViewerKey, data);
			return data;
		} catch {
			// File doesn't exist or is corrupt
			return undefined;
		}
	}

	/**
	 * Gets grid definition of a channel
	 * @param channelId
	 * @param gridId if ommitted, gets all active grids of the channel
	 * @returns
	 */
	public async getChannelGrids(
		channelId: string,
		gridId?: string,
	): Promise<IStreamerGridsCacheData | void> {
		// Validate UID and gridId to prevent path traversal
		if (
			!channelId ||
			!/^[0-9]+$/.test(channelId) ||
			(gridId && !/^[a-zA-Z0-9_-]+$/.test(gridId))
		)
			return;

		const cacheKey = this.getChannelGridCacheKey(channelId, gridId);

		// Return cached if available (TTL managed by LRU cache)
		const cached = this.channelGridsCache.get(cacheKey);
		if (cached) return cached;

		// Prevent cache stampede - reuse in-flight request
		const existing = this.refreshingGrids.get(cacheKey);
		if (existing) return existing;

		// Start new refresh
		const promise = this.refreshChannelGrid(channelId, gridId);
		this.refreshingGrids.set(cacheKey, promise);

		try {
			return await promise;
		} finally {
			this.refreshingGrids.delete(cacheKey);
		}
	}

	/**
	 * Gets grid definition of a viewer
	 * @param uid
	 * @param gridId if ommitted, gets all active grids of the streamer
	 * @returns
	 */
	public async getViewerGridList(
		channelId: string,
		uid?: string,
	): Promise<IViewerGridCacheData[] | void> {
		// Validate UID and gridId to prevent path traversal
		if ((uid && !/^[a-zA-Z0-9_-]+$/.test(uid)) || !channelId || !/^[0-9]+$/.test(channelId))
			return;

		// Build the list of grids visible on this channel: the channel's own grids
		// plus every grid shared WITH this channel (served from the owner's pool,
		// so the receiver's viewers play from the owner's data).
		type GridSource = {
			grid: IGrid;
			storageUid: string;
			ownerName: string;
			premium: boolean;
		};
		const sources: GridSource[] = [];

		const mirrors = this.getMirrorsForReceiver(channelId);

		// A shared (mirrored) grid replaces the receiver's own bingo: while linked,
		// only serve the mirrored grid(s) so the extension doesn't also show the
		// receiver's own (now force-disabled) grids.
		if (mirrors.length === 0) {
			const ownGrids = await this.getChannelGrids(channelId);
			if (ownGrids) {
				const ownPremium = (await super.getUserPremiumState(channelId)) != "no";
				for (const grid of ownGrids.data) {
					// Never serve a disabled grid to viewers, even if a stale cache
					// entry still holds it
					if (!grid.enabled) continue;
					sources.push({
						grid,
						storageUid: channelId,
						ownerName: ownGrids.ownerName,
						premium: ownPremium,
					});
				}
			}
		}

		for (const { gridId, ownerId } of mirrors) {
			const ownerGrids = await this.getChannelGrids(ownerId, gridId);
			const grid = ownerGrids && ownerGrids.data.find((g) => g.id == gridId);
			// Skip a shared grid the owner has disabled (the mirror may briefly
			// outlive the owner's disable before revokeShares cleans it up).
			if (ownerGrids && grid && grid.enabled) {
				const ownerPremium = (await super.getUserPremiumState(ownerId)) != "no";
				sources.push({
					grid,
					storageUid: ownerId,
					ownerName: ownerGrids.ownerName,
					premium: ownerPremium,
				});
			}
		}

		const result = new Array<IViewerGridCacheData>();

		for (const { grid, storageUid, ownerName, premium } of sources) {
			const gridId = grid.id;

			let data = grid;
			if (uid && premium) {
				const cached = await this.getViewerGrid(storageUid, gridId, uid);
				//Return cached data
				if (cached) {
					data = cached.data;

					result.push({
						data,
						ownerId: storageUid,
						ownerName,
						date: Date.now(),
					});

					//Generate user's grid
				} else {
					data = JSON.parse(JSON.stringify(grid)) as typeof grid;
					//Don't shuffle broadcaster so their public grid is the same
					//as the overlay one
					if (storageUid != uid) {
						try {
							this.shuffleGridEntries(data);
						} catch (_error) {
							Logger.error("Failed shuffling bingo entries for user", uid);
						}
					}

					const cache: IViewerGridCacheData = {
						data,
						ownerId: storageUid,
						ownerName,
						date: Date.now(),
					};

					this.saveViewerGrid(storageUid, gridId, uid, cache);

					result.push(cache);
				}
			} else {
				result.push({
					data,
					ownerId: storageUid,
					ownerName,
					date: Date.now(),
				});
			}
		}

		return result;
	}

	public async setBingoCount(
		streamerId: string,
		viewerId: string,
		gridId: string,
		count: number,
		login?: string,
		isAnon?: boolean,
	): Promise<boolean> {
		// A viewer playing from a receiver's channel is part of the owner's single
		// pool: resolve to the owner so the card is read and the count recorded
		// against that pool.
		const ownerId = this.resolveOwner(streamerId, gridId);
		const grid = await this.getViewerGrid(ownerId, gridId, viewerId);
		if (grid) {
			//Count actual possible number of bingo
			const rows = grid.data.rows;
			const cols = grid.data.cols;
			const states = grid.data.entries.map((v) => v.check);
			let maxBingoCount = 0;
			//Check filled cols count
			for (let x = 0; x < cols; x++) {
				let allTicked = true;
				for (let y = 0; y < rows; y++) {
					if (!states[x + y * cols]) {
						allTicked = false;
						break;
					}
				}
				if (allTicked) maxBingoCount++;
			}
			//Check filled rows count
			for (let y = 0; y < rows; y++) {
				let allTicked = true;
				for (let x = 0; x < cols; x++) {
					if (!states[x + y * cols]) {
						allTicked = false;
						break;
					}
				}
				if (allTicked) maxBingoCount++;
			}
			//Check filled diagonals count
			if (cols == rows) {
				let allTicked1 = true;
				let allTicked2 = true;
				for (let x = 0; x < cols; x++) {
					if (!states[x + x * cols]) {
						allTicked1 = false;
					}
					if (!states[rows - x - 1 + x * cols]) {
						allTicked2 = false;
					}
				}
				if (allTicked1) maxBingoCount++;
				if (allTicked2) maxBingoCount++;
			}

			// console.log(user.login+" has "+count+"/"+maxBingoCount+" bingos");

			//Limit bingo count to the maximum possible so users cannot cheat
			//by simply sending 999999 as the count.
			count = Math.min(maxBingoCount, count);
			// Announce the bingo on the owner's overlay AND every linked streamer's
			// overlay (one shared pool / leaderboard).
			const recipients = new Set<string>([ownerId]);
			const shareSet = this.sharePushTargets.get(this.getShareKey(ownerId, gridId));
			if (shareSet) {
				for (const receiverId of shareSet) recipients.add(receiverId);
			}
			for (const target of recipients) {
				SSEController.sendToUser(target, SSETopic.BINGO_GRID_BINGO_COUNT, {
					gridId: gridId,
					uid: viewerId,
					login,
					count,
					isAnon,
				});
			}
			return true;
		}
		return false;
	}

	/**
	 * Called when a streamer or mod ticks cells from the public page
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	public async moderateEntries(
		channelId: string,
		moderatorId: string,
		gridId: string,
		states: { [cellId: string]: boolean },
	) {
		// Resolve mirrored grids to the owner (the single master).
		const ownerId = this.resolveOwner(channelId, gridId);

		// On a mirror channel, only the broadcaster (the receiver streamer) may
		// tick the master, the receiver's moderators cannot.
		if (ownerId != channelId && moderatorId != channelId) {
			return false;
		}

		const grid = await this.getChannelGrids(ownerId, gridId);
		if (!grid) {
			return false;
		}

		try {
			await this.setTickStates(ownerId, gridId, states);
		} catch (error) {
			Logger.error("Failed updating tick states by moderator");
			console.log(error);
			return false;
		}

		// Notify the grid owner (their Twitchat must reflect the extension tick,
		// even when the broadcaster themselves ticked) and every linked streamer.
		const recipients = new Set<string>([ownerId]);
		const shareTargets = this.sharePushTargets.get(this.getShareKey(ownerId, gridId));
		if (shareTargets) {
			for (const receiverId of shareTargets) recipients.add(receiverId);
		}
		for (const target of recipients) {
			SSEController.sendToUser(target, SSETopic.BINGO_GRID_MODERATOR_TICK, {
				gridId: gridId,
				uid: moderatorId,
				states,
			});
		}

		return true;
	}

	/*****************************
	 * GRID SHARING (Phase 1)    *
	 *****************************/
	private getShareKey(ownerId: string, gridId: string): string {
		return `${ownerId}/${gridId}`;
	}

	/**
	 * Registers (or refreshes) a receiver as a live-update target of a shared grid,
	 * and the reverse read-resolution mirror index.
	 */
	private addShareTarget(ownerId: string, gridId: string, receiverId: string): void {
		const key = this.getShareKey(ownerId, gridId);
		const set = this.sharePushTargets.get(key) || new Set<string>();
		set.add(receiverId);
		// Re-set to refresh the cache TTL.
		this.sharePushTargets.set(key, set);
		// Mirror index (receiver/grid -> owner) used to resolve viewer reads.
		this.mirrorOwners.set(this.getShareKey(receiverId, gridId), ownerId);
	}

	/**
	 * Returns the receiver's OWN randomized card for a shared grid (like a viewer),
	 * generating and persisting it under the owner's pool on first access. The card
	 * keeps the owner's cell IDs, so tick states sync by ID while the layout differs.
	 */
	private async getOrCreateReceiverCard(
		ownerId: string,
		gridId: string,
		receiverId: string,
	): Promise<IGrid | null> {
		const existing = await this.getViewerGrid(ownerId, gridId, receiverId);
		if (existing) return existing.data;

		const grids = await this.getChannelGrids(ownerId, gridId);
		const grid = grids && grids.data.find((g) => g.id == gridId);
		if (!grids || !grid) return null;

		const card = JSON.parse(JSON.stringify(grid)) as IGrid;
		try {
			this.shuffleGridEntries(card);
		} catch (_error) {
			Logger.error("Failed shuffling shared bingo grid for receiver", receiverId);
		}
		this.saveViewerGrid(ownerId, gridId, receiverId, {
			data: card,
			ownerId,
			ownerName: grids.ownerName,
			date: Date.now(),
		});
		return card;
	}

	/**
	 * Resolves a channel access to the owning channel for a shared (mirrored)
	 * grid, or returns the channel itself when it isn't a mirror.
	 */
	private resolveOwner(channelId: string, gridId: string): string {
		return this.mirrorOwners.get(this.getShareKey(channelId, gridId)) || channelId;
	}

	/**
	 * Kills every link to a grid: tells linked receivers to unlink, drops the
	 * push + mirror indexes, and refreshes their extension viewers. Called when
	 * the owner disables or deletes the grid.
	 */
	private revokeShares(ownerId: string, gridId: string): void {
		const key = this.getShareKey(ownerId, gridId);
		const set = this.sharePushTargets.get(key);
		if (!set) return;
		for (const receiverId of set) {
			SSEController.sendToUser(receiverId, SSETopic.BINGO_GRID_SHARE_REVOKED, {
				ownerId,
				gridId,
			});
			this.mirrorOwners.delete(this.getShareKey(receiverId, gridId));
			try {
				void this.extensionController.notifyStateUpdate(receiverId);
			} catch (_error) {
				// ignore
			}
		}
		this.sharePushTargets.delete(key);
	}

	/**
	 * Lists every grid mirrored TO the given channel (i.e. grids shared with this
	 * streamer so their viewers can play from the owner's pool).
	 */
	private getMirrorsForReceiver(receiverId: string): Array<{ gridId: string; ownerId: string }> {
		const prefix = receiverId + "/";
		const res: Array<{ gridId: string; ownerId: string }> = [];
		for (const [key, ownerId] of this.mirrorOwners.entries()) {
			if (key.startsWith(prefix)) {
				res.push({ gridId: key.substring(prefix.length), ownerId });
			}
		}
		return res;
	}

	/**
	 * Broadcasts a tick to the grid owner and every streamer the grid is shared
	 * with, except the originator of the tick.
	 */
	private notifyShareTargets(
		ownerId: string,
		gridId: string,
		states: { [cellId: string]: boolean },
		originatorId: string,
	): void {
		const recipients = new Set<string>();
		if (ownerId != originatorId) recipients.add(ownerId);
		const set = this.sharePushTargets.get(this.getShareKey(ownerId, gridId));
		if (set) {
			for (const receiverId of set) {
				if (receiverId != originatorId) recipients.add(receiverId);
			}
		}
		for (const uid of recipients) {
			SSEController.sendToUser(uid, SSETopic.BINGO_GRID_MODERATOR_TICK, {
				gridId,
				uid: originatorId,
				states,
			});
		}
	}

	/**
	 * Owner shares one of their enabled grids with another streamer.
	 * Mints a short-lived (2min) single-use invite token and pushes it to the
	 * target via SSE as a toaster invite.
	 */
	private async createShare(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.premiumGuard(request, response);
		if (!user) return;

		const body = request.body as { gridid?: string; targetId?: string };
		const gridId = body.gridid || "";
		const targetId = body.targetId || "";

		response.header("Content-Type", "application/json");

		if (!/^[a-zA-Z0-9_-]+$/.test(gridId) || !/^[0-9]+$/.test(targetId)) {
			response.status(400);
			response.send(
				JSON.stringify({
					success: false,
					error: "Invalid parameters",
					errorCode: "INVALID_PARAMS",
				}),
			);
			return;
		}

		if (targetId == user.user_id) {
			response.status(400);
			response.send(
				JSON.stringify({
					success: false,
					error: "Cannot share with yourself",
					errorCode: "INVALID_TARGET",
				}),
			);
			return;
		}

		const grids = await this.getChannelGrids(user.user_id, gridId);
		const grid = grids && grids.data.find((g) => g.id == gridId);
		if (!grids || !grid || !grid.enabled) {
			response.status(404);
			response.send(
				JSON.stringify({
					success: false,
					error: "Grid not found or disabled",
					errorCode: "NOT_FOUND",
				}),
			);
			return;
		}

		const jti = Utils.getUUID();
		const token = jwt.sign(
			{
				ownerId: user.user_id,
				ownerName: grids.ownerName,
				gridId,
				gridTitle: grid.title,
				targetId,
				jti,
			} satisfies BingoShareInviteToken,
			Utils.derivedSecret("bingo_grid_invite"),
			{ algorithm: "HS256", expiresIn: BingoGridController.SHARE_INVITE_TTL_SECONDS },
		);

		const delivered = SSEController.sendToUser(targetId, SSETopic.BINGO_GRID_SHARE_INVITE, {
			token,
			ownerName: grids.ownerName,
			gridTitle: grid.title,
		});

		if (!delivered) {
			response.status(200);
			response.send(
				JSON.stringify({
					success: false,
					error: "User not connected to Twitchat",
					errorCode: "USER_OFFLINE",
				}),
			);
			return;
		}

		response.status(200);
		response.send(JSON.stringify({ success: true }));
	}

	/**
	 * Receiver accepts a share invite. Verifies the invite token, registers the
	 * receiver as a live-update target, mints a durable link token and returns
	 * the current grid snapshot.
	 */
	private async acceptShare(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.twitchUserGuard(request, response);
		if (!user) return;

		const body = request.body as { token?: string };
		response.header("Content-Type", "application/json");

		let payload: BingoShareInviteToken;
		try {
			payload = jwt.verify(body.token || "", Utils.derivedSecret("bingo_grid_invite"), {
				algorithms: ["HS256"],
			}) as BingoShareInviteToken;
		} catch {
			response.status(401);
			response.send(
				JSON.stringify({
					success: false,
					error: "Invalid or expired token",
					errorCode: "INVALID_TOKEN",
				}),
			);
			return;
		}

		if (payload.targetId != user.user_id || this.usedShareJtis.has(payload.jti)) {
			response.status(401);
			response.send(
				JSON.stringify({
					success: false,
					error: "Invalid token",
					errorCode: "INVALID_TOKEN",
				}),
			);
			return;
		}

		// Burn the JTI so the invite can't be reused. Auto-cleanup once expired.
		const cleanup = setTimeout(
			() => this.usedShareJtis.delete(payload.jti),
			BingoGridController.SHARE_INVITE_TTL_SECONDS * 1000,
		);
		this.usedShareJtis.set(payload.jti, cleanup);

		const grids = await this.getChannelGrids(payload.ownerId, payload.gridId);
		const grid = grids && grids.data.find((g) => g.id == payload.gridId);
		if (!grid || !grid.enabled) {
			response.status(404);
			response.send(
				JSON.stringify({ success: false, error: "Grid not found", errorCode: "NOT_FOUND" }),
			);
			return;
		}

		this.addShareTarget(payload.ownerId, payload.gridId, user.user_id);

		// Give the receiver their own randomized card (like a viewer), sharing the
		// owner's cell IDs so ticks stay in sync.
		const card =
			(await this.getOrCreateReceiverCard(payload.ownerId, payload.gridId, user.user_id)) ||
			grid;

		// Refresh the receiver's extension right away so the shared grid shows up
		// immediately (otherwise it only appears on the next state update).
		try {
			await this.extensionController.notifyStateUpdate(user.user_id);
		} catch (_error) {
			// ignore
		}

		const linkToken = jwt.sign(
			{
				ownerId: payload.ownerId,
				ownerName: payload.ownerName,
				gridId: payload.gridId,
				receiverId: user.user_id,
			} satisfies BingoShareLinkToken,
			Utils.derivedSecret("bingo_grid_link"),
			{ algorithm: "HS256", expiresIn: "24h" },
		);

		// Inform the owner that their grid got linked.
		SSEController.sendToUser(payload.ownerId, SSETopic.BINGO_GRID_SHARE_ACCEPTED, {
			gridId: payload.gridId,
			receiverId: user.user_id,
			receiverName: user.login,
		});

		response.status(200);
		response.send(
			JSON.stringify({
				success: true,
				linkToken,
				ownerId: payload.ownerId,
				ownerName: payload.ownerName,
				gridId: payload.gridId,
				grid: card,
			}),
		);
	}

	/**
	 * Verifies a link token and returns its payload, or sends an error response.
	 */
	private verifyLinkToken(
		token: string,
		callerId: string,
		response: FastifyReply,
	): BingoShareLinkToken | null {
		let payload: BingoShareLinkToken;
		try {
			payload = jwt.verify(token, Utils.derivedSecret("bingo_grid_link"), {
				algorithms: ["HS256"],
			}) as BingoShareLinkToken;
		} catch {
			response.header("Content-Type", "application/json");
			response.status(401);
			response.send(
				JSON.stringify({
					success: false,
					error: "Invalid or expired token",
					errorCode: "INVALID_TOKEN",
				}),
			);
			return null;
		}
		if (payload.receiverId != callerId) {
			response.header("Content-Type", "application/json");
			response.status(403);
			response.send(
				JSON.stringify({ success: false, error: "Forbidden", errorCode: "FORBIDDEN" }),
			);
			return null;
		}
		return payload;
	}

	/**
	 * Receiver (co-host) ticks a cell of a shared grid. Applies it to the owner's
	 * master grid and broadcasts to the owner + any other linked streamers.
	 */
	private async shareTick(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.twitchUserGuard(request, response);
		if (!user) return;

		const body = request.body as {
			linkToken?: string;
			states?: { [cellId: string]: boolean };
		};
		const payload = this.verifyLinkToken(body.linkToken || "", user.user_id, response);
		if (!payload) return;

		// Refresh the receiver's delivery membership.
		this.addShareTarget(payload.ownerId, payload.gridId, user.user_id);

		try {
			await this.setTickStates(payload.ownerId, payload.gridId, body.states || {});
		} catch (error) {
			Logger.error("Failed updating tick states from shared grid");
			console.log(error);
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send(
				JSON.stringify({
					success: false,
					error: "failed to update grid",
					errorCode: "GRID_UPDATE_FAILED",
				}),
			);
			return;
		}

		this.notifyShareTargets(payload.ownerId, payload.gridId, body.states || {}, user.user_id);

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(JSON.stringify({ success: true }));
	}

	/**
	 * Receiver (re)registers for live updates (e.g. after an SSE reconnect) and
	 * gets the current grid snapshot to reconcile with.
	 */
	private async subscribeShare(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.twitchUserGuard(request, response);
		if (!user) return;

		const body = request.body as { linkToken?: string };
		const payload = this.verifyLinkToken(body.linkToken || "", user.user_id, response);
		if (!payload) return;

		this.addShareTarget(payload.ownerId, payload.gridId, user.user_id);

		// Return the receiver's own randomized card (with its current synced check
		// states) so the receiver reconciles to it after a reconnect/reshuffle.
		const grid = await this.getOrCreateReceiverCard(
			payload.ownerId,
			payload.gridId,
			user.user_id,
		);

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(JSON.stringify({ success: true, grid: grid || null }));
	}

	/**
	 * Receiver removes the link. Drops them from the delivery index.
	 */
	private async unlinkShare(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.twitchUserGuard(request, response);
		if (!user) return;

		const body = request.body as { linkToken?: string };
		let payload: BingoShareLinkToken | null = null;
		try {
			payload = jwt.verify(body.linkToken || "", Utils.derivedSecret("bingo_grid_link"), {
				algorithms: ["HS256"],
			}) as BingoShareLinkToken;
		} catch {
			// Invalid/expired token: nothing to clean, still answer success.
		}

		if (payload && payload.receiverId == user.user_id) {
			const key = this.getShareKey(payload.ownerId, payload.gridId);
			const set = this.sharePushTargets.get(key);
			if (set) {
				set.delete(user.user_id);
				if (set.size == 0) this.sharePushTargets.delete(key);
				else this.sharePushTargets.set(key, set);
			}
			this.mirrorOwners.delete(this.getShareKey(user.user_id, payload.gridId));
			// Refresh the receiver's extension so the grid disappears from it.
			try {
				await this.extensionController.notifyStateUpdate(user.user_id);
			} catch (_error) {
				// ignore
			}
		}

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(JSON.stringify({ success: true }));
	}

	/**
	 * Drops every link where the given user is the receiver.
	 */
	private clearReceiverShares(receiverId: string): boolean {
		const mirrors = this.getMirrorsForReceiver(receiverId);
		for (const { gridId, ownerId } of mirrors) {
			const key = this.getShareKey(ownerId, gridId);
			const set = this.sharePushTargets.get(key);
			if (set) {
				set.delete(receiverId);
				if (set.size == 0) this.sharePushTargets.delete(key);
				else this.sharePushTargets.set(key, set);
			}
			this.mirrorOwners.delete(this.getShareKey(receiverId, gridId));
		}
		return mirrors.length > 0;
	}

	/**
	 * Called by the receiver's app on startup: the front-end link is ephemeral, so
	 * after a refresh it has forgotten any links. Drop them on the backend too and
	 * resync the extension so a stale mirrored grid doesn't linger.
	 */
	private async resetShares(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const user = await super.twitchUserGuard(request, response);
		if (!user) return;

		const hadShares = this.clearReceiverShares(user.user_id);
		if (hadShares) {
			try {
				await this.extensionController.notifyStateUpdate(user.user_id);
			} catch (_error) {
				// ignore
			}
		}

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send(JSON.stringify({ success: true }));
	}

	/**
	 * Saves a viewer's grid to memory cache and marks for disk flush
	 */
	private saveViewerGrid(
		streamerId: string,
		bingoId: string,
		viewerId: string,
		data: IViewerGridCacheData,
	): void {
		const cacheKey = this.getViewerGridCacheKey(streamerId, bingoId, viewerId);
		this.viewerGridCache.set(cacheKey, data);
		this.dirtyViewerGrids.add(cacheKey);
	}

	/**
	 * Flushes dirty viewer grids to disk
	 */
	private async flushDirtyGrids(): Promise<void> {
		const toFlush = [...this.dirtyViewerGrids];
		this.dirtyViewerGrids.clear();

		await Promise.allSettled(
			toFlush.map(async (key) => {
				const data = this.viewerGridCache.get(key);
				if (!data) return;

				const chunks = key.split("/");
				const streamerId = chunks[0]!;
				const bingoId = chunks[1]!;
				const viewerId = chunks[2]!;
				const folder = Config.BINGO_GRID_ROOT(streamerId, bingoId);
				const file = Config.BINGO_VIEWER_FILE(streamerId, bingoId, viewerId);

				try {
					await fs.promises.mkdir(folder, { recursive: true });
					await fs.promises.writeFile(file, JSON.stringify(data), "utf-8");
				} catch (error) {
					Logger.error(`Failed to flush viewer grid ${key}:`, String(error));
					// Re-add to dirty set for retry
					this.dirtyViewerGrids.add(key);
				}
			}),
		);
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public initialize(): BingoGridController {
		this.server.get(
			"/api/bingogrid",
			async (request, response) => await this.getBingoGrid(request, response),
		);
		this.server.put(
			"/api/bingogrid",
			async (request, response) => await this.streamerGridUpdate(request, response),
		);
		this.server.delete(
			"/api/bingogrid",
			async (request, response) => await this.streamerGridDelete(request, response),
		);
		this.server.post(
			"/api/bingogrid/tickStates",
			async (request, response) => await this.updateTickStates(request, response),
		);
		this.server.post(
			"/api/bingogrid/bingo",
			async (request, response) => await this.sendBingoCount(request, response),
		);
		this.server.post(
			"/api/bingogrid/shuffle",
			async (request, response) => await this.shuffleEntries(request, response),
		);
		this.server.post(
			"/api/bingogrid/share",
			async (request, response) => await this.createShare(request, response),
		);
		this.server.post(
			"/api/bingogrid/share/accept",
			async (request, response) => await this.acceptShare(request, response),
		);
		this.server.post(
			"/api/bingogrid/share/tick",
			async (request, response) => await this.shareTick(request, response),
		);
		this.server.post(
			"/api/bingogrid/share/subscribe",
			async (request, response) => await this.subscribeShare(request, response),
		);
		this.server.post(
			"/api/bingogrid/share/unlink",
			async (request, response) => await this.unlinkShare(request, response),
		);
		this.server.post(
			"/api/bingogrid/share/reset",
			async (request, response) => await this.resetShares(request, response),
		);

		// Restore the shared-grid indexes from disk, then start the periodic save
		// loops. Loading first avoids the empty in-memory caches being flushed
		// over the snapshots before they are restored.
		void this.sharePushPersistence.load().then(() => this.sharePushPersistence.start());
		void this.mirrorOwnersPersistence.load().then(() => this.mirrorOwnersPersistence.start());

		// Periodic flush of viewer grids to disk (every 5 seconds)
		setInterval(() => {
			this.flushDirtyGrids().catch((err) => Logger.error("Failed periodic grid flush:", err));
		}, 5000);

		// Cleanup viewer bingo files older than "ageMax"
		const ageMax = 15 * 24 * 60 * 60 * 1000;
		setInterval(
			async () => {
				const now = Date.now();
				async function parseFolder(root: string): Promise<void> {
					try {
						const files = await fs.promises.readdir(root);
						await Promise.all(
							files.map(async (file) => {
								const path = root + "/" + file;
								const stats = await fs.promises.lstat(path);
								if (stats.isDirectory()) {
									await parseFolder(path);
								} else {
									// Keep bingo data for 15 days max
									if (now - stats.mtime.getTime() > ageMax) {
										await fs.promises.unlink(path);
									}
								}
							}),
						);
					} catch (_error) {
						// Folder might not exist, that's fine
					}
				}
				await parseFolder(Config.BINGO_ROOT);
			},
			24 * 60 * 60 * 1000,
		);

		return this;
	}

	/**
	 * Actually loads the channel grid from disk (called during cache refresh)
	 */
	private async refreshChannelGrid(
		channelId: string,
		gridId?: string,
	): Promise<IStreamerGridsCacheData | void> {
		const userFilePath = Config.USER_DATA_PATH + channelId + ".json";
		const cacheKey = this.getChannelGridCacheKey(channelId, gridId);

		try {
			await fs.promises.access(userFilePath);
		} catch {
			return; // File doesn't exist
		}

		try {
			const users = await TwitchUtils.getUsers(undefined, [channelId]);
			const username = users && users.length > 0 ? users[0]!.display_name : "???";
			const fileContent = await Utils.readFileAsync(userFilePath, { encoding: "utf8" });
			const data = JSON.parse(fileContent) as {
				bingoGrids: { gridList: IStreamerGridsCacheData["data"] };
			};

			if (!data.bingoGrids) {
				return;
			}

			let cache: IStreamerGridsCacheData;

			if (!gridId) {
				cache = {
					date: Date.now(),
					ownerId: channelId,
					ownerName: username,
					data: data.bingoGrids.gridList
						.filter((v) => v.enabled)
						.map((g) => ({
							id: g.id,
							enabled: g.enabled,
							title: g.title,
							entries: g.entries,
							rows: g.rows,
							cols: g.cols,
							additionalEntries: g.additionalEntries,
						})),
				};
				this.channelGridsCache.set(cacheKey, cache);
				return cache;
			}

			const grid = data.bingoGrids.gridList.find((v) => v.id == gridId);
			if (grid) {
				cache = {
					date: Date.now(),
					ownerId: channelId,
					ownerName: username,
					data: [
						{
							id: gridId,
							enabled: grid.enabled,
							title: grid.title,
							entries: grid.entries,
							rows: grid.rows,
							cols: grid.cols,
							additionalEntries: grid.additionalEntries,
						},
					],
				};
				this.channelGridsCache.set(cacheKey, cache);
				return cache;
			}
		} catch (error) {
			Logger.error(`Failed to load streamer grid ${cacheKey}:`, String(error));
			return;
		}
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Get a bingo grid definition
	 */
	private async getBingoGrid(request: FastifyRequest, response: FastifyReply) {
		const uid: string = (request.query as any).uid;
		const gridId: string = (request.query as any).gridid;

		//Validate UID and gridId to prevent path traversal
		if (!uid || !/^[a-zA-Z0-9_-]+$/.test(uid) || !gridId || !/^[a-zA-Z0-9_-]+$/.test(gridId)) {
			response.header("Content-Type", "application/json");
			response.status(400);
			response.send(
				JSON.stringify({
					success: false,
					error: "Invalid user ID or grid ID",
					errorCode: "INVALID_PARAMS",
				}),
			);
			return;
		}

		// Resolve mirrored grids to the owner so every viewer (from any channel)
		// plays a card generated from, and stored under, the owner's data.
		const storageUid = this.resolveOwner(uid, gridId);

		const gridCache = await this.getChannelGrids(storageUid, gridId);
		if (!gridCache || !gridCache.data || !gridCache.data[0]?.enabled) {
			response.header("Content-Type", "application/json");
			response.status(404);
			response.send(
				JSON.stringify({
					success: false,
					error: "Grid or user not found, or grid disabled",
					errorCode: "NOT_FOUND",
				}),
			);
			return;
		}

		let originalGrid = JSON.parse(JSON.stringify(gridCache)) as typeof gridCache;
		let data: IViewerGridCacheData["data"] | null = null;
		let multiplayerMode = false;

		if ((await super.getUserPremiumState(storageUid)) != "no") {
			multiplayerMode = true;
			//If user is authenticated, generate a unique randomized grid for them
			const user = await super.twitchUserGuard(request, response, false);
			if (user) {
				const cached = await this.getViewerGrid(storageUid, gridId, user.user_id);
				//Return cached data
				if (cached) {
					data = cached.data;

					//Generate user's grid
				} else {
					const grid = originalGrid.data.find((v) => v.id == gridId);
					if (grid) {
						data = grid;
						if (user.user_id != storageUid) {
							//Don't shuffle broadcaster so their public grid is the same
							//as the overlay one
							try {
								this.shuffleGridEntries(data);
							} catch (_error) {
								Logger.error("Failed shuffling bingo entries for user", user.login);
							}
						}

						this.saveViewerGrid(storageUid, gridId, user.user_id, {
							data,
							ownerId: storageUid,
							ownerName: originalGrid.ownerName,
							date: Date.now(),
						});
					}
				}
			}
		} else if (data) {
			//user not authenticated, shuffle entries
			try {
				this.shuffleGridEntries(data);
			} catch (error) {
				Logger.error("Failed shuffling bingo entries");
				console.log(error);
			}
		}

		if (data) {
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(
				JSON.stringify({
					success: true,
					data,
					multiplayerMode,
					owner: originalGrid.ownerName,
				}),
			);
		} else {
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(
				JSON.stringify({
					success: true,
					data: originalGrid.data[0],
					multiplayerMode,
					owner: originalGrid.ownerName,
				}),
			);
		}

		return;
	}

	/**
	 * Updates a streamer's grid params
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async streamerGridUpdate(
		request: FastifyRequest,
		response: FastifyReply,
		forceNewGridGen: boolean = false,
	) {
		const user = await super.twitchUserGuard(request, response, false);
		if (!user) return;

		const body = request.body as {
			grid: Omit<IStreamerGridsCacheData["data"][number], "id">;
			gridid: string;
		};
		const gridId: string = body.gridid;
		const gridRef: IStreamerGridsCacheData["data"][number] = { id: gridId, ...body.grid };

		if (!gridRef) {
			response.header("Content-Type", "application/json");
			response.status(400);
			response.send(
				JSON.stringify({
					success: false,
					error: "No grid data provided",
					errorCode: "NO_DATA",
				}),
			);
			return;
		}

		if (!gridId || !/^[a-zA-Z0-9_-]+$/.test(gridId)) {
			response.header("Content-Type", "application/json");
			response.status(400);
			response.send(
				JSON.stringify({
					success: false,
					error: "Invalid grid ID",
					errorCode: "INVALID_GRID_ID",
				}),
			);
			return;
		}

		const folder = Config.BINGO_GRID_ROOT(user.user_id, gridId);
		const cachedGrids = await this.getChannelGrids(user.user_id);
		if (!cachedGrids) {
			response.header("Content-Type", "application/json");
			response.status(404);
			response.send(
				JSON.stringify({
					success: false,
					error: "Grid or user not found",
					errorCode: "NOT_FOUND",
				}),
			);
			return;
		}

		// If updated grid already exists
		const cached = cachedGrids.data.find((g) => g.id == gridId);
		if (gridId && cached) {
			// Update cached grid definition
			cached.cols = gridRef.cols;
			cached.rows = gridRef.rows;
			cached.title = gridRef.title;
			cached.entries = gridRef.entries;
			cached.enabled = gridRef.enabled;
			cached.additionalEntries = gridRef.additionalEntries;

			// Keep the all-grids cache enabled-only (same contract as
			// refreshChannelGrid) so a just-disabled grid is dropped from it
			// immediately and getViewerGridList stops serving it to the extension.
			const cacheAllKey = this.getChannelGridCacheKey(user.user_id);
			this.channelGridsCache.set(cacheAllKey, {
				...cachedGrids,
				data: cachedGrids.data.filter((g) => g.enabled),
			});

			const cacheOneKey = this.getChannelGridCacheKey(user.user_id, gridId);
			const clone = { ...cachedGrids };
			clone.data = clone.data.filter((g) => g.id == gridId);
			this.channelGridsCache.set(cacheOneKey, clone);
		} else {
			// Add new grid to existing cache
			cachedGrids.data.push(gridRef);
			// Enabled-only contract (see above): a newly pushed grid only stays in
			// the all-grids cache while it's enabled.
			const cacheAllKey = this.getChannelGridCacheKey(user.user_id);
			this.channelGridsCache.set(cacheAllKey, {
				...cachedGrids,
				data: cachedGrids.data.filter((g) => g.enabled),
			});

			const cacheOneKey = this.getChannelGridCacheKey(user.user_id, gridId);
			const clone = { ...cachedGrids };
			clone.data = [gridRef];
			this.channelGridsCache.set(cacheOneKey, clone);
		}

		if (!gridRef.enabled) {
			// Disabling a grid kills every link associated with it.
			this.revokeShares(user.user_id, gridId);
		} else {
			// Each linked receiver has their own randomized card stored as a viewer
			// of the owner's pool, so the regular viewer loop below already pushes
			// their relabeled/reshuffled card. We only need to refresh their
			// extension viewers so those re-fetch from the resolved owner data.
			const shareTargets = this.sharePushTargets.get(this.getShareKey(user.user_id, gridId));
			if (shareTargets) {
				for (const receiverId of shareTargets) {
					try {
						void this.extensionController.notifyStateUpdate(receiverId);
					} catch (_error) {
						// ignore
					}
				}
			}
		}

		let files: string[];
		try {
			files = await fs.promises.readdir(folder);
		} catch {
			// Folder doesn't exist - but we may still have dirty grids in memory
			// that need to be cleared (happens when shuffling twice quickly)
			if (forceNewGridGen || !gridRef.enabled) {
				const dirtyPrefix = `${user.user_id}/${gridId}/`;
				const viewersToNotify = new Set<string>();

				for (const dirtyKey of this.dirtyViewerGrids) {
					if (dirtyKey.startsWith(dirtyPrefix)) {
						const viewerId = dirtyKey.substring(dirtyPrefix.length);
						this.viewerGridCache.delete(dirtyKey);
						this.dirtyViewerGrids.delete(dirtyKey);
						viewersToNotify.add(viewerId);
					}
				}

				// Notify viewers that were only in memory
				viewersToNotify.forEach((viewerId) => {
					SSEController.sendToUser(viewerId, SSETopic.BINGO_GRID_UPDATE, { force: true });
				});
			}

			try {
				await this.extensionController.notifyStateUpdate(user.user_id);
			} catch (_error) {
				// ignore
			}

			// Folder doesn't exist, no disk cache to update
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send(
				JSON.stringify({
					success: true,
					error: "no cache to update",
					errorCode: "NO_CACHE",
				}),
			);
			return;
		}

		if (!gridRef.enabled || forceNewGridGen) {
			// Grid disabled or asking to fully rebuild them
			// Collect all viewer IDs to notify (from disk files AND dirty memory cache)
			const viewersToNotify = new Set<string>();

			// Clear memory caches for viewers with files on disk
			for (const file of files) {
				const [viewerId] = file.split(".");
				if (viewerId) {
					const cacheKey = this.getViewerGridCacheKey(user.user_id, gridId, viewerId);
					this.viewerGridCache.delete(cacheKey);
					this.dirtyViewerGrids.delete(cacheKey);
					viewersToNotify.add(viewerId);
				}
			}

			// Also clear viewers that are in memory but not yet flushed to disk
			const dirtyPrefix = `${user.user_id}/${gridId}/`;
			for (const dirtyKey of this.dirtyViewerGrids) {
				if (dirtyKey.startsWith(dirtyPrefix)) {
					const viewerId = dirtyKey.substring(dirtyPrefix.length);
					this.viewerGridCache.delete(dirtyKey);
					this.dirtyViewerGrids.delete(dirtyKey);
					viewersToNotify.add(viewerId);
				}
			}

			try {
				await fs.promises.rm(folder, { recursive: true, force: true });
			} catch {
				/* ignore */
			}

			// Notify all affected viewers
			viewersToNotify.forEach((viewerId) => {
				SSEController.sendToUser(viewerId, SSETopic.BINGO_GRID_UPDATE, { force: true });
			});
		} else {
			// Process files concurrently
			await Promise.all(
				files.map(async (file) => {
					const chunks = file.split(".");
					const viewerId = chunks[0]!;
					const grid: typeof gridRef = JSON.parse(JSON.stringify(gridRef)); // Clone to avoid all users from having same grid ref

					let viewerCachedGrid = await this.getViewerGrid(user.user_id, gridId, viewerId);
					if (!viewerCachedGrid) {
						return; // No file found and no cache to update
					}

					const sortedKeysPrev = viewerCachedGrid.data.entries
						.map((v) => v.id)
						.concat((viewerCachedGrid.data.additionalEntries || []).map((v) => v.id))
						.sort((a, b) => {
							if (a < b) return -1;
							if (a > b) return 1;
							return 0;
						});

					const sortedKeysNew = grid.entries
						.map((v) => v.id)
						.concat((grid.additionalEntries || []).map((v) => v.id))
						.sort((a, b) => {
							if (a < b) return -1;
							if (a > b) return 1;
							return 0;
						});

					// Check if cells have been added/removed or if grid size changed
					const forceNewGridGen_local =
						forceNewGridGen ||
						sortedKeysNew.join(",") != sortedKeysPrev.join(",") ||
						viewerCachedGrid.data.cols != grid.cols ||
						viewerCachedGrid.data.rows != grid.rows;

					if (forceNewGridGen_local) {
						// Don't shuffle broadcaster so their public grid is the same as the overlay one
						if (user.user_id != viewerId) {
							this.shuffleGridEntries(grid);
						}

						// Untick all cells
						grid.entries.forEach((v) => (v.check = false));
						(grid.additionalEntries || []).forEach((v) => (v.check = false));

						viewerCachedGrid.data = grid;
						viewerCachedGrid.date = Date.now();
					} else {
						// Only update labels
						viewerCachedGrid.data.title = grid.title;
						const allEntries = grid.entries.concat(grid.additionalEntries || []);

						// Update main entries
						viewerCachedGrid.data.entries.forEach((cell) => {
							const newCell = allEntries.find((v) => v.id == cell.id);
							if (newCell) {
								cell.label = newCell.label;
								cell.lock = newCell.lock;
								cell.check = newCell.check;
							}
						});
						// Update additional entries if any
						viewerCachedGrid.data.additionalEntries?.forEach((cell) => {
							const newCell = allEntries.find((v) => v.id == cell.id);
							if (newCell) {
								cell.label = newCell.label;
								cell.lock = newCell.lock;
								cell.check = newCell.check;
							}
						});
					}

					// Update enabled state to viewers cache
					viewerCachedGrid.data.enabled = grid.enabled;
					this.saveViewerGrid(user.user_id, gridId, viewerId, viewerCachedGrid);

					SSEController.sendToUser(viewerId, SSETopic.BINGO_GRID_UPDATE, {
						grid: viewerCachedGrid.data,
						force: forceNewGridGen_local,
					});
				}),
			);
		}

		try {
			await this.extensionController.notifyStateUpdate(user.user_id);
		} catch (_error) {
			// ignore
		}

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send({ success: true });
	}

	/**
	 * Called when a streamer deletes a grid
	 * @param request
	 * @param response
	 * @returns
	 */
	private async streamerGridDelete(request: FastifyRequest, response: FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if (!user) return;

		try {
			const body = request.query as { gridId: string };
			const gridId: string = body.gridId;

			if (!gridId || !/^[a-zA-Z0-9_-]+$/.test(gridId)) {
				response.header("Content-Type", "application/json");
				response.status(400);
				response.send(
					JSON.stringify({
						success: false,
						error: "Invalid grid ID",
						errorCode: "INVALID_GRID_ID",
					}),
				);
				return;
			}

			// Deleting a grid kills every link associated with it.
			this.revokeShares(user.user_id, gridId);

			const folder = Config.BINGO_GRID_ROOT(user.user_id, gridId);

			await fs.promises.rm(folder, { recursive: true, force: true });

			const cachedGrids = await this.getChannelGrids(user.user_id);
			if (cachedGrids) {
				cachedGrids.data = cachedGrids.data.filter((g) => g.id != gridId);
				const cacheAllKey = this.getChannelGridCacheKey(user.user_id);
				this.channelGridsCache.set(cacheAllKey, cachedGrids);

				const cacheOneKey = this.getChannelGridCacheKey(user.user_id, gridId);
				this.channelGridsCache.delete(cacheOneKey);

				try {
					await this.extensionController.notifyStateUpdate(user.user_id);
				} catch (_error) {
					// ignore
				}
			}

			response.header("Content-Type", "application/json");
			response.status(200);
			response.send({ success: true });
		} catch (error) {
			Logger.error("Failed deleting bingo grid:", String(error));
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send({
				success: false,
				error: "failed to delete grid",
				errorCode: "GRID_DELETE_FAILED",
			});
		}
	}

	/**
	 * Called when streamer ticks a cell from twitchat
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async updateTickStates(request: FastifyRequest, response: FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if (!user) return;

		const body: any = request.body;
		const gridId: string = body.gridid;
		const states: { [cellId: string]: boolean } = body.states;

		try {
			await this.setTickStates(user.user_id, gridId, states);
		} catch (error) {
			Logger.error("Failed updating tick states");
			Logger.log(error);
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send({
				success: false,
				error: "failed to update grid",
				errorCode: "GRID_UPDATE_FAILED",
			});
			return;
		}

		// Propagate the owner's own ticks to any streamer this grid is shared with.
		this.notifyShareTargets(user.user_id, gridId, states, user.user_id);

		response.header("Content-Type", "application/json");
		response.status(200);
		response.send({ success: true });
	}

	/**
	 * Called when viewer send their bingo count to the broadcaster
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async sendBingoCount(request: FastifyRequest, response: FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if (!user) return;

		const body: any = request.body;
		const uid: string = body.uid;
		const gridId: string = body.gridid;
		let count: number = body.count;

		const success = await this.setBingoCount(uid, user.user_id, gridId, count, user.login);

		if (success) {
			response.header("Content-Type", "application/json");
			response.status(200);
			response.send({ success: true, count });
		} else {
			response.header("Content-Type", "application/json");
			response.status(404);
			response.send({ success: false, error: "grid not found", errorCode: "GRID_NOT_FOUND" });
		}
	}

	/**
	 * Called when streamer shuffles entries
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async shuffleEntries(request: FastifyRequest, response: FastifyReply) {
		await this.streamerGridUpdate(request, response, true);
	}
	/**
	 * Shuffles a grid items
	 * @param grid
	 */
	private shuffleGridEntries(grid: IStreamerGridsCacheData["data"][number]): void {
		if (!grid) {
			Logger.warn("Cannot shuffle undefined grid");
			return;
		}
		if (grid.additionalEntries && grid.additionalEntries.length > 0) {
			//Randomly switch main entries with additional entries
			for (let i = 0; i < grid.entries.length; i++) {
				const entry = grid.entries[i]!;
				//Don't switch locked cells
				if (entry.lock) continue;
				if (Math.random() > 0.4) {
					const index = Math.floor(Math.random() * grid.additionalEntries.length);
					grid.entries.splice(i, 1, grid.additionalEntries[index]!);
					grid.additionalEntries[index] = entry;
				}
			}
		}
		//Shuffle entries
		for (let i = grid.entries.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			if (grid.entries[i]!.lock || grid.entries[j]!.lock) continue;
			[grid.entries[i]!, grid.entries[j]!] = [grid.entries[j]!, grid.entries[i]!];
		}
	}
	/**
	 * Updates the tick states of the given grid's cells
	 * @param streamerId
	 * @param gridId
	 * @param states
	 */
	private async setTickStates(
		streamerId: string,
		gridId: string,
		states: { [cellId: string]: boolean },
	): Promise<void> {
		const cache = await this.getChannelGrids(streamerId, gridId);
		if (cache) {
			const grid = cache.data.find((v) => v.id == gridId);
			if (!grid) {
				throw new Error("Grid not found");
			}
			// Update cache
			for (const cellId in states) {
				const state = states[cellId]!;
				let entry = grid.entries.find((v) => v.id === cellId);
				if (entry) entry.check = state;
				if (grid.additionalEntries) {
					entry = grid.additionalEntries.find((v) => v.id === cellId);
					if (entry) entry.check = state;
				}
			}

			// Update viewers caches
			const folder = Config.BINGO_GRID_ROOT(streamerId, gridId);
			let files: string[];
			try {
				files = await fs.promises.readdir(folder);
			} catch {
				return; // Folder doesn't exist, nothing to update
			}

			await Promise.all(
				files.map(async (file) => {
					const viewerId = file.split(".")[0]!;

					// Try memory cache first
					let viewerCache = await this.getViewerGrid(streamerId, gridId, viewerId);
					if (!viewerCache) {
						// Fallback to disk
						try {
							const content = await Utils.readFileAsync(folder + "/" + file, "utf-8");
							viewerCache = JSON.parse(content) as IViewerGridCacheData;
						} catch {
							return; // Skip unreadable files
						}
					}

					viewerCache.date = Date.now();
					const grid = viewerCache.data;
					for (const cellId in states) {
						const state = states[cellId]!;
						let entry = grid.entries.find((v) => v.id === cellId);
						if (entry) entry.check = state;
						if (grid.additionalEntries) {
							entry = grid.additionalEntries.find((v) => v.id === cellId);
							if (entry) entry.check = state;
						}
					}
					this.saveViewerGrid(streamerId, gridId, viewerId, viewerCache);
				}),
			);
			try {
				void this.extensionController.notifyStateUpdate(streamerId);
			} catch (_error) {
				// ignore
			}
			// Refresh the extension viewers of every streamer this grid is shared
			// with so they see the master tick (their cards live in the owner pool).
			const shareSet = this.sharePushTargets.get(this.getShareKey(streamerId, gridId));
			if (shareSet) {
				for (const receiverId of shareSet) {
					try {
						void this.extensionController.notifyStateUpdate(receiverId);
					} catch (_error) {
						// ignore
					}
				}
			}
		}
	}
}
interface IGrid {
	id: string;
	enabled: boolean;
	title: string;
	rows: number;
	cols: number;
	entries: Array<{
		id: string;
		lock: boolean;
		check: boolean;
		label: string;
	}>;
	additionalEntries?: IStreamerGridsCacheData["data"][number]["entries"];
}

interface IStreamerGridsCacheData {
	date: number;
	ownerId: string;
	ownerName: string;
	data: Array<IGrid>;
}

interface IViewerGridCacheData {
	date: number;
	ownerId: string;
	ownerName: string;
	data: IGrid;
}

interface BingoShareInviteToken {
	ownerId: string;
	ownerName: string;
	gridId: string;
	gridTitle: string;
	targetId: string;
	jti: string;
	iat?: number;
	exp?: number;
}

interface BingoShareLinkToken {
	ownerId: string;
	ownerName: string;
	gridId: string;
	receiverId: string;
	iat?: number;
	exp?: number;
}
