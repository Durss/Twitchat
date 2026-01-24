import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import { LRUCache } from "lru-cache";
import Config from "../utils/Config.js";
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

	private extensionController!:TwitchExtensionController;

	constructor(public server:FastifyInstance) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/

	public setTwitchExtensionController(controller:TwitchExtensionController):void {
		this.extensionController = controller;
	}

	private getCacheKey(uid:string, gridId?:string):string {
		return gridId ? `${uid}/${gridId}` : uid;
	}

	/**
	 * Gets a viewer's cached grid (memory first, then disk)
	 */
	private async getViewerGrid(streamerId:string, bingoId:string, viewerId:string):Promise<IViewerGridCacheData|void> {
		// Check memory cache first
		const cacheViewerKey = `${streamerId}/${bingoId}/${viewerId}`;
		const cachedViewer = this.viewerGridCache.get(cacheViewerKey);
		if(cachedViewer) return cachedViewer;

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
	public async getChannelGrids(channelId:string, gridId?:string):Promise<IStreamerGridsCacheData | void> {
		// Validate UID and gridId to prevent path traversal
		if(!channelId || !/^[0-9]+$/.test(channelId) || (gridId && !/^[a-zA-Z0-9_-]+$/.test(gridId))) return;

		const cacheKey = this.getCacheKey(channelId, gridId);

		// Return cached if available (TTL managed by LRU cache)
		const cached = this.channelGridsCache.get(cacheKey);
		if(cached) return cached;

		// Prevent cache stampede - reuse in-flight request
		const existing = this.refreshingGrids.get(cacheKey);
		if(existing) return existing;

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
	public async getViewerGridList(channelId:string, uid?:string):Promise<IViewerGridCacheData[] | void> {
		// Validate UID and gridId to prevent path traversal
		if((uid && !/^[0-9]+$/.test(uid)) || !channelId || !/^[0-9]+$/.test(channelId)) return;

		console.log("Get viewer grid list for channel", channelId, "and user", uid);

		const gridList = await this.getChannelGrids(channelId);
		const isStreamerPremium = await super.getUserPremiumState(channelId) != "no";
		const users = await TwitchUtils.getUsers(undefined, [channelId]);
		const ownerName = users && users.length > 0 ? users[0]!.display_name : "anonymous";
		const result = new Array<IViewerGridCacheData>();

		if(!gridList) return;

		for(const grid of gridList.data) {
			const gridId = grid.id;

			let data = grid;
			if(uid && isStreamerPremium) {
				const cached = await this.getViewerGrid(channelId, gridId, uid);
				//Return cached data
				if(cached) {
					data = cached.data;

					const cache:IViewerGridCacheData = {
						data,
						ownerId:channelId,
						ownerName,
						date:Date.now(),
					};

					result.push(cache);

				//Generate user's grid
				}else{
					data = JSON.parse(JSON.stringify(grid)) as typeof grid
					//Don't shuffle broadcaster so their public grid is the same
					//as the overlay one
					if(channelId != uid) {
						try {
							this.shuffleGridEntries(data);
						}catch(error) {
							Logger.error("Failed shuffling bingo entries for user", uid);
						}
					}

					const cache:IViewerGridCacheData = {
						data,
						ownerId:channelId,
						ownerName,
						date:Date.now(),
					};

					this.saveViewerGrid(channelId, gridId, uid, cache);
					
					result.push(cache);
				}
			}else{
				result.push({
					data,
					ownerId:channelId,
					ownerName,
					date:Date.now(),
				});
			}
		}

		return result;
	}

	public async setBingoCount(streamerId:string, viewerId:string, gridId:string, count:number, login?:string):Promise<boolean> {
		const grid = await this.getViewerGrid(streamerId, gridId, viewerId);
		if(grid) {
			//Count actual possible number of bingo
			const rows = grid.data.rows;
			const cols = grid.data.cols;
			const states = grid.data.entries.map(v=>v.check);
			let maxBingoCount = 0;
			//Check filled cols count
			for (let x = 0; x < cols; x++) {
				let allTicked = true;
				for (let y = 0; y < rows; y++) {
					if(!states[x+y*cols]) {
						allTicked = false;
						break;
					}
				}
				if(allTicked) maxBingoCount ++;
			}
			//Check filled rows count
			for (let y = 0; y < rows; y++) {
				let allTicked = true;
				for (let x = 0; x < cols; x++) {
					if(!states[x+y*cols]) {
						allTicked = false;
						break;
					}
				}
				if(allTicked) maxBingoCount ++;
			}
			//Check filled diagonals count
			if(cols == rows) {
				let allTicked1 = true;
				let allTicked2 = true;
				for (let x = 0; x < cols; x++) {
					if(!states[x+x*cols]) {
						allTicked1 = false;
					}
					if(!states[(rows-x-1)+x*cols]) {
						allTicked2 = false;
					}
				}
				if(allTicked1) maxBingoCount ++;
				if(allTicked2) maxBingoCount ++;
			}

			// console.log(user.login+" has "+count+"/"+maxBingoCount+" bingos");

			//Limit bingo count to the maximum possible so users cannot cheat
			//by simply sending 999999 as the count.
			count = Math.min(maxBingoCount, count);
			SSEController.sendToUser(streamerId, SSETopic.BINGO_GRID_BINGO_COUNT, {gridId:gridId, uid: viewerId, login, count});
			return true;
		}
		return false;
	}

	/**
	 * Saves a viewer's grid to memory cache and marks for disk flush
	 */
	private saveViewerGrid(streamerId:string, bingoId:string, viewerId:string, data:IViewerGridCacheData):void {
		const cacheKey = `${streamerId}/${bingoId}/${viewerId}`;
		this.viewerGridCache.set(cacheKey, data);
		this.dirtyViewerGrids.add(cacheKey);
	}

	/**
	 * Flushes dirty viewer grids to disk
	 */
	private async flushDirtyGrids():Promise<void> {
		const toFlush = [...this.dirtyViewerGrids];
		this.dirtyViewerGrids.clear();

		await Promise.allSettled(toFlush.map(async (key) => {
			const data = this.viewerGridCache.get(key);
			if(!data) return;

			const chunks = key.split('/');
			const streamerId = chunks[0]!;
			const bingoId = chunks[1]!;
			const viewerId = chunks[2]!;
			const folder = Config.BINGO_GRID_ROOT(streamerId, bingoId);
			const file = Config.BINGO_VIEWER_FILE(streamerId, bingoId, viewerId);

			try {
				await fs.promises.mkdir(folder, { recursive: true });
				await fs.promises.writeFile(file, JSON.stringify(data), "utf-8");
			} catch(error) {
				Logger.error(`Failed to flush viewer grid ${key}:`, String(error));
				// Re-add to dirty set for retry
				this.dirtyViewerGrids.add(key);
			}
		}));
	}



	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():BingoGridController {
		this.server.get('/api/bingogrid', async (request, response) => await this.getBingoGrid(request, response));
		this.server.put('/api/bingogrid', async (request, response) => await this.streamerGridUpdate(request, response));
		this.server.delete('/api/bingogrid', async (request, response) => await this.streamerGridDelete(request, response));
		this.server.post('/api/bingogrid/tickStates', async (request, response) => await this.updateTickStates(request, response));
		this.server.post('/api/bingogrid/bingo', async (request, response) => await this.sendBingoCount(request, response));
		this.server.post('/api/bingogrid/shuffle', async (request, response) => await this.shuffleEntries(request, response));
		this.server.post('/api/bingogrid/moderate', async (request, response) => await this.moderateEntries(request, response));

		// Periodic flush of viewer grids to disk (every 5 seconds)
		setInterval(() => {
			this.flushDirtyGrids().catch(err => Logger.error("Failed periodic grid flush:", err));
		}, 5000);

		// Cleanup viewer bingo files older than "ageMax"
		const ageMax = 15 * 24 * 60 * 60 * 1000;
		setInterval(async () => {
			const now = Date.now();
			async function parseFolder(root:string):Promise<void> {
				try {
					const files = await fs.promises.readdir(root);
					await Promise.all(files.map(async file => {
						const path = root+"/"+file;
						const stats = await fs.promises.lstat(path);
						if(stats.isDirectory()) {
							await parseFolder(path);
						}else{
							// Keep bingo data for 15 days max
							if(now - stats.mtime.getTime() > ageMax) {
								await fs.promises.unlink(path);
							}
						}
					}));
				} catch(error) {
					// Folder might not exist, that's fine
				}
			}
			await parseFolder(Config.BINGO_ROOT);
		}, 24*60*60*1000);

		return this;
	}

	/**
	 * Actually loads the channel grid from disk (called during cache refresh)
	 */
	private async refreshChannelGrid(channelId:string, gridId?:string):Promise<IStreamerGridsCacheData | void> {
		const userFilePath = Config.USER_DATA_PATH + channelId+".json";
		const cacheKey = this.getCacheKey(channelId, gridId);

		try {
			await fs.promises.access(userFilePath);
		} catch {
			return; // File doesn't exist
		}

		try {
			const users = await TwitchUtils.getUsers(undefined, [channelId]);
			const username = users && users.length > 0 ? users[0]!.display_name : "???";
			const fileContent = await Utils.readFileAsync(userFilePath, { encoding: "utf8" });
			const data = JSON.parse(fileContent) as { bingoGrids: { gridList: IStreamerGridsCacheData["data"] } };

			if(!data.bingoGrids) {
				return;
			}

			let cache: IStreamerGridsCacheData;

			if(!gridId) {
				cache = {
					date: Date.now(),
					ownerId: channelId,
					ownerName: username,
					data: data.bingoGrids.gridList.filter(v => v.enabled).map(g => ({
						id: g.id,
						enabled: g.enabled,
						title: g.title,
						entries: g.entries,
						rows: g.rows,
						cols: g.cols,
						additionalEntries: g.additionalEntries
					}))
				};
				this.channelGridsCache.set(cacheKey, cache);
				return cache;
			}

			const grid = data.bingoGrids.gridList.find(v => v.id == gridId);
			if(grid) {
				cache = {
					date: Date.now(),
					ownerId: channelId,
					ownerName: username,
					data: [{
						id: gridId,
						enabled: grid.enabled,
						title: grid.title,
						entries: grid.entries,
						rows: grid.rows,
						cols: grid.cols,
						additionalEntries: grid.additionalEntries
					}]
				};
				this.channelGridsCache.set(cacheKey, cache);
				return cache;
			}
		} catch(error) {
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
	private async getBingoGrid(request:FastifyRequest, response:FastifyReply) {
		const uid:string = (request.query as any).uid;
		const gridId:string = (request.query as any).gridid;
		
		//Validate UID and gridId to prevent path traversal
		if(!uid || !/^[0-9]+$/.test(uid) || !gridId || !/^[a-zA-Z0-9_-]+$/.test(gridId)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"Invalid user ID or grid ID", errorCode:"INVALID_PARAMS"}));
			return;
		}

		const gridCache = await this.getChannelGrids(uid, gridId);
		if(!gridCache || !gridCache.data || !gridCache.data[0]?.enabled) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"Grid or user not found, or grid disabled", errorCode:"NOT_FOUND"}));
			return;
		}

		let originalGrid = JSON.parse(JSON.stringify(gridCache)) as typeof gridCache;
		let data:IViewerGridCacheData["data"]|null = null;
		let multiplayerMode = false;

		if(await super.getUserPremiumState(uid) != "no") {
			multiplayerMode = true;
			//If user is authenticated, generate a unique randomized grid for them
			const user = await super.twitchUserGuard(request, response, false);
			if(user) {
				const cached = await this.getViewerGrid(uid, gridId, user.user_id);
				//Return cached data
				if(cached) {
					data = cached.data;

				//Generate user's grid
				}else{
					const grid = originalGrid.data.find(v=>v.id == gridId);
					if(grid) {
						data = grid;
						if(user.user_id != uid) {
							//Don't shuffle broadcaster so their public grid is the same
							//as the overlay one
							try {
								this.shuffleGridEntries(data);
							}catch(error) {
								Logger.error("Failed shuffling bingo entries for user", user.login);
							}
						}
	
						this.saveViewerGrid(uid, gridId, user.user_id, {
							data,
							ownerId:uid,
							ownerName:originalGrid.ownerName,
							date:Date.now(),
						});
					}
				}
			}
		}else if(data){
			//user not authenticated, shuffle entries
			try {
				this.shuffleGridEntries(data);
			}catch(error) {
				Logger.error("Failed shuffling bingo entries");
				console.log(error);
			}
		}
		
		if(data){
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data, multiplayerMode, owner:originalGrid.ownerName}));
		}else{
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:originalGrid.data[0], multiplayerMode, owner:originalGrid.ownerName}));
		}

		return;
	}

	/**
	 * Updates a streamer's grid params
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async streamerGridUpdate(request:FastifyRequest, response:FastifyReply, forceNewGridGen:boolean = false) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;

		const body = request.body as { grid: Omit<IStreamerGridsCacheData["data"][number], "id">, gridid: string };
		const gridId:string = body.gridid;
		const gridRef:IStreamerGridsCacheData["data"][number] = {id:gridId, ...body.grid};

		if(!gridRef) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"No grid data provided", errorCode:"NO_DATA"}));
			return;
		}

		const folder = Config.BINGO_GRID_ROOT(user.user_id, gridId);
		const cachedGrids = await this.getChannelGrids(user.user_id);
		if(!cachedGrids) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"Grid or user not found", errorCode:"NOT_FOUND"}));
			return;
		}

		// If updated grid already exists
		const cached = cachedGrids.data.find(g => g.id == gridId);
		if(gridId && cached) {
			// Update cached grid definition
			cached.cols = gridRef.cols;
			cached.rows = gridRef.rows;
			cached.title = gridRef.title;
			cached.entries = gridRef.entries;
			cached.enabled = gridRef.enabled;
			cached.additionalEntries = gridRef.additionalEntries;
			
			const cacheAllKey = this.getCacheKey(user.user_id);
			this.channelGridsCache.set(cacheAllKey, cachedGrids);
			
			const cacheOneKey = this.getCacheKey(user.user_id, gridId);
			const clone = {...cachedGrids};
			clone.data = clone.data.filter(g => g.id == gridId);
			this.channelGridsCache.set(cacheOneKey, clone);
		}else{
			// Add new grid to existing cache
			cachedGrids.data.push(gridRef);
			const cacheAllKey = this.getCacheKey(user.user_id);
			this.channelGridsCache.set(cacheAllKey, cachedGrids);

			const cacheOneKey = this.getCacheKey(user.user_id, gridId);
			const clone = {...cachedGrids};
			clone.data = [gridRef];
			this.channelGridsCache.set(cacheOneKey, clone);
		}

		let files: string[];
		try {
			files = await fs.promises.readdir(folder);
		} catch {
			this.extensionController.notifyStateUpdate(user.user_id);
			
			// Folder doesn't exist, no cache to update
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, error:"no cache to update", errorCode:"NO_CACHE"}));
			return;
		}

		if(!gridRef.enabled || forceNewGridGen) {
			// Grid disabled or asking to fully rebuild them
			// Clear memory caches for all viewers of this grid
			for(const file of files) {
				const [viewerId] = file.split(".");
				const cacheKey = `${user.user_id}/${gridId}/${viewerId}`;
				this.viewerGridCache.delete(cacheKey);
				this.dirtyViewerGrids.delete(cacheKey);
			}
			try {
				await fs.promises.rm(folder, { recursive: true, force: true });
			} catch { /* ignore */ }
			files.forEach(file => {
				const chunks = file.split(".");
				const uid = chunks[0]!;
				SSEController.sendToUser(uid, SSETopic.BINGO_GRID_UPDATE, {force:true});
			});

		} else {
			// Process files concurrently
			await Promise.all(files.map(async (file) => {
				const chunks = file.split(".");
				const viewerId = chunks[0]!;
				const grid:typeof gridRef = JSON.parse(JSON.stringify(gridRef)); // Clone to avoid all users from having same grid ref

				let viewerCachedGrid = await this.getViewerGrid(user.user_id, gridId, viewerId);
				if(!viewerCachedGrid) {
					return; // No file found and no cache to update
				}

				const sortedKeysPrev = viewerCachedGrid.data.entries.map(v=> v.id).concat((viewerCachedGrid.data.additionalEntries || []).map(v=>v.id))
				.sort((a,b) => {
					if(a < b) return -1;
					if(a > b) return 1;
					return 0;
				});

				const sortedKeysNew = grid.entries.map(v=> v.id).concat((grid.additionalEntries || []).map(v=>v.id))
				.sort((a,b) => {
					if(a < b) return -1;
					if(a > b) return 1;
					return 0;
				});

				// Check if cells have been added/removed or if grid size changed
				const forceNewGridGen_local = forceNewGridGen
				|| sortedKeysNew.join(",") != sortedKeysPrev.join(",")
				|| viewerCachedGrid.data.cols != grid.cols
				|| viewerCachedGrid.data.rows != grid.rows;

				if(forceNewGridGen_local) {
					// Don't shuffle broadcaster so their public grid is the same as the overlay one
					if(user.user_id != viewerId) {
						this.shuffleGridEntries(grid);
					}

					// Untick all cells
					grid.entries.forEach(v=> v.check = false);
					(grid.additionalEntries || []).forEach(v=> v.check = false);

					viewerCachedGrid.data = grid;
					viewerCachedGrid.date = Date.now();
				} else {
					// Only update labels
					viewerCachedGrid.data.title = grid.title;
					const allEntries = grid.entries.concat(grid.additionalEntries || []);

					// Update main entries
					viewerCachedGrid.data.entries.forEach(cell=>{
						const newCell = allEntries.find(v=>v.id == cell.id);
						if(newCell) {
							cell.label = newCell.label;
							cell.lock = newCell.lock;
							cell.check = newCell.check;
						}
					});
					// Update additional entries if any
					viewerCachedGrid.data.additionalEntries?.forEach(cell=>{
						const newCell = allEntries.find(v=>v.id == cell.id);
						if(newCell) {
							cell.label = newCell.label;
							cell.lock = newCell.lock;
							cell.check = newCell.check;
						}
					});
				}

				// Update enabled state to viewers cache
				viewerCachedGrid.data.enabled = grid.enabled;
				this.saveViewerGrid(user.user_id, gridId, viewerId, viewerCachedGrid);

				SSEController.sendToUser(viewerId, SSETopic.BINGO_GRID_UPDATE, {grid:viewerCachedGrid.data, force:forceNewGridGen_local});
			}));
		}
		
		// Refresh both the specific grid cache AND the all-grids cache
		await this.refreshChannelGrid(user.user_id, gridId);
		await this.refreshChannelGrid(user.user_id);
		this.extensionController.notifyStateUpdate(user.user_id);

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
	}

	/**
	 * Called when a streamer deletes a grid
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async streamerGridDelete(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;

		try {
			const body = request.query as {gridId:string};
			const gridId:string = body.gridId;
			const folder = Config.BINGO_GRID_ROOT(user.user_id, gridId);
			
			await fs.promises.rm(folder, { recursive: true, force: true });

			const cachedGrids = await this.getChannelGrids(user.user_id);
			if(cachedGrids) {
				cachedGrids.data = cachedGrids.data.filter(g => g.id != gridId);
				const cacheAllKey = this.getCacheKey(user.user_id);
				this.channelGridsCache.set(cacheAllKey, cachedGrids);

				const cacheOneKey = this.getCacheKey(user.user_id, gridId);
				this.channelGridsCache.delete(cacheOneKey);

				this.extensionController.notifyStateUpdate(user.user_id);
			}
	
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send({success:true});
		}catch(error) {
			Logger.error("Failed deleting bingo grid:", String(error));
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, error:"failed to delete grid", errorCode:"GRID_DELETE_FAILED"});
		}
	}

	/**
	 * Called when streamer ticks a cell from twitchat
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async updateTickStates(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;

		console.log("UPDATE TICK STATES")
		const body:any = request.body;
		const gridId:string = body.gridid;
		const states:{[cellId:string]:boolean} = body.states;

		try {
			await this.setTickStates(user.user_id, gridId, states);
		}catch(error) {
			Logger.error("Failed updating tick states");
			Logger.log(error);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send({success:false, error:"failed to update grid", errorCode:"GRID_UPDATE_FAILED"});
			return;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
	}

	/**
	 * Called when viewer send their bingo count to the broadcaster
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async sendBingoCount(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;

		const body:any = request.body;
		const uid:string = body.uid;
		const gridId:string = body.gridid;
		let count:number = body.count;

		const success = await this.setBingoCount(uid, user.user_id, gridId, count, user.login)

		if(success) {
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send({success:true, count});
		}else{
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send({success:false, error:"grid not found", errorCode:"GRID_NOT_FOUND"});
		}
	}

	/**
	 * Called when streamer shuffles entries
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async shuffleEntries(request:FastifyRequest, response:FastifyReply) {
		await this.streamerGridUpdate(request, response, true);
	}

	/**
	 * Called when a streamer or mod ticks cells from the public page
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async moderateEntries(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) {
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send({success:false, error:"invalid access token", errorCode:"INVALID_ACCESS_TOKEN"});
			return;
		}

		const body:any = request.body;
		const uid:string = body.uid;
		const gridId:string = body.gridid;
		const states:{[cellId:string]:boolean} = body.states;
		const grid = await this.getChannelGrids(uid, gridId);
		if(!grid) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send({success:false});
			return;
		}

		//Check if user is a streamer's mod or the streamer themself
		if(user.user_id != uid) {
			const moderatedChans = await TwitchUtils.getModeratedChannels(user.user_id, request.headers.authorization!);
			if(moderatedChans.findIndex(v=>v.broadcaster_id == uid) == -1) {
				response.header('Content-Type', 'application/json');
				response.status(401);
				response.send({success:false, error:"not a mod", errorCode:"NOT_A_MODERATOR"});
				return;
			}
		}

		try {
			await this.setTickStates(uid, gridId, states);
		}catch(error) {
			Logger.error("Failed updating tick states by moderator");
			console.log(error)
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send({success:false});
			return;
		}

		SSEController.sendToUser(uid, SSETopic.BINGO_GRID_MODERATOR_TICK, {gridId:gridId, uid:user.user_id, states});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
	}

	/**
	 * Shuffles a grid items
	 * @param grid
	 */
	private shuffleGridEntries(grid:IStreamerGridsCacheData["data"][number]):void {
		if(!grid) {
			Logger.warn("Cannot shuffle undefined grid");
			return;
		}
		if(grid.additionalEntries && grid.additionalEntries.length > 0) {
			//Randomly switch main entries with additional entries
			for (let i = 0; i < grid.entries.length; i++) {
				const entry = grid.entries[i]!;
				//Don't switch locked cells
				if(entry.lock) continue;
				if(Math.random() > .4) {
					const index = Math.floor(Math.random() * grid.additionalEntries.length);
					grid.entries.splice(i, 1, grid.additionalEntries[index]!);
					grid.additionalEntries[index] = entry;
				}
			}
		}
		//Shuffle entries
		for (let i = grid.entries.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			if(grid.entries[i]!.lock || grid.entries[j]!.lock) continue;
			[grid.entries[i]!, grid.entries[j]!] = [grid.entries[j]!, grid.entries[i]!];
		}
	}
	/**
	 * Updates the tick states of the given grid's cells
	 * @param streamerId
	 * @param gridId
	 * @param states
	 */
	private async setTickStates(streamerId:string, gridId:string, states:{[cellId:string]:boolean}):Promise<void> {
		const cache = await this.getChannelGrids(streamerId, gridId);
		if(cache) {
			const grid = cache.data.find(v=>v.id == gridId);
			if(!grid) {
				throw new Error("Grid not found");
			}
			// Update cache
			for (const cellId in states) {
				const state = states[cellId]!;
				let entry = grid.entries.find(v=>v.id === cellId);
				if(entry) entry.check = state;
				if(grid.additionalEntries) {
					entry = grid.additionalEntries.find(v=>v.id === cellId);
					if(entry) entry.check = state;
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

			await Promise.all(files.map(async (file) => {
				const viewerId = file.split(".")[0]!;

				// Try memory cache first
				let viewerCache = await this.getViewerGrid(streamerId, gridId, viewerId);
				if(!viewerCache) {
					// Fallback to disk
					try {
						const content = await Utils.readFileAsync(folder+"/"+file, "utf-8");
						viewerCache = JSON.parse(content) as IViewerGridCacheData;
					} catch {
						return; // Skip unreadable files
					}
				}

				viewerCache.date = Date.now();
				const grid = viewerCache.data;
				for (const cellId in states) {
					const state = states[cellId]!;
					let entry = grid.entries.find(v=>v.id === cellId);
					if(entry) entry.check = state;
					if(grid.additionalEntries) {
						entry = grid.additionalEntries.find(v=>v.id === cellId);
						if(entry) entry.check = state;
					}
				}
				this.saveViewerGrid(streamerId, gridId, viewerId, viewerCache);
				// Send new states to viewer
				SSEController.sendToUser(viewerId, SSETopic.BINGO_GRID_CELL_STATES, {gridId, states});
			}));
			this.extensionController.notifyStateUpdate(streamerId);
		}
	}
}
interface IGrid {
	id:string;
	enabled:boolean;
	title:string;
	rows:number;
	cols:number
	entries:Array<{
		id:string;
		lock:boolean;
		check:boolean;
		label:string;
	}>;
	additionalEntries?:IStreamerGridsCacheData["data"][number]["entries"],
}

interface IStreamerGridsCacheData {
	date:number;
	ownerId:string;
	ownerName:string;
	data:Array<IGrid>;
}

interface IViewerGridCacheData {
	date:number;
	ownerId:string;
	ownerName:string;
	data:IGrid;
}
