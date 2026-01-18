import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import TwitchUtils from "../utils/TwitchUtils.js";
import AbstractController from "./AbstractController.js";
import SSEController, { SSECode as SSETopic } from "./SSEController.js";

/**
* Created : 01/06/2024
*/
export default class BingoGridController extends AbstractController {

	/**
	 * Stores streamers grid cache
	 * Key has the following format:
	 * "[uid]/[gridId]"
	 */
	private cachedBingoGrids:{[uidGridId:string]:IGridCacheData} = {}

	constructor(public server:FastifyInstance) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/

	private getViewerGrid(streamerId:string, bingoId:string, viewerId:string):IGridCacheData|void {
		const file = Config.BINGO_VIEWER_FILE(streamerId, bingoId, viewerId);
		if(fs.existsSync(file)) {
			return JSON.parse(fs.readFileSync(file, "utf-8"));
		}
		return
	}

	private saveViewerGrid(streamerId:string, bingoId:string, viewerId:string, data:IGridCacheData):void {
		const folder = Config.BINGO_GRID_ROOT(streamerId, bingoId);
		if(!fs.existsSync(folder)) {
			fs.mkdirSync(folder, { recursive: true });
		}
		const file = Config.BINGO_VIEWER_FILE(streamerId, bingoId, viewerId);
		fs.writeFileSync(file, JSON.stringify(data), "utf-8");
	}



	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():BingoGridController {
		this.server.get('/api/bingogrid', async (request, response) => await this.getBingoGrid(request, response));
		this.server.put('/api/bingogrid', async (request, response) => await this.streamerGridUpdate(request, response));
		this.server.post('/api/bingogrid/tickStates', async (request, response) => await this.updateTickStates(request, response));
		this.server.post('/api/bingogrid/bingo', async (request, response) => await this.sendBingoCount(request, response));
		this.server.post('/api/bingogrid/shuffle', async (request, response) => await this.shuffleEntries(request, response));
		this.server.post('/api/bingogrid/moderate', async (request, response) => await this.moderateEntries(request, response));

		//Cleanup viewer bingo files older than "ageMax"
		const ageMax = 15 * 24 * 60 * 60 * 1000;
		setInterval(()=>{
			const now = Date.now();
			function parseFolder(root:string):void {
				const files = fs.readdirSync(root);
				files.forEach(file => {
					const path = root+"/"+file;
					const stats = fs.lstatSync(path);
					if(stats.isDirectory()) {
						parseFolder(path)
					}else{
						//Keep bingo data for 1 month max
						if(now - stats.mtime.getTime() > ageMax) {
							fs;fs.unlinkSync(path);
						}
					}
				});
			}
			parseFolder(Config.BINGO_ROOT);
		},24*60*60*1000)

		return this;
	}

	/**
	 * Gets grid definition of a streamer
	 * @param uid
	 * @param gridId if ommitted, gets all active grids of the streamer
	 * @returns
	 */
	public async getStreamerGrid(uid:string, gridId?:string):Promise<IGridCacheData | void> {
		//Validate UID and gridId to prevent path traversal
		if(!uid || !/^[0-9]+$/.test(uid) || (gridId && !/^[a-zA-Z0-9_-]+$/.test(gridId))) return

		const cacheKey = uid+"/"+gridId;
		let cache = this.cachedBingoGrids[cacheKey];
		if(!cache || Date.now() - cache.date > 5000) {
			//Get users' data
			const userFilePath = Config.USER_DATA_PATH + uid+".json";
			const found = fs.existsSync(userFilePath);
			if(found){
				const users = await TwitchUtils.getUsers(undefined, [uid]);
				const username = users && users.length > 0? users[0].display_name : "???";
				const data = JSON.parse(fs.readFileSync(userFilePath, {encoding:"utf8"})) as {bingoGrids:{gridList:IGridCacheData["data"]}};
				if(!data.bingoGrids) {
					return;
				}
				if(!gridId) {
					cache = this.cachedBingoGrids[cacheKey] = {
						date:Date.now(),
						ownerId:uid,
						ownerName:username,
						data:data.bingoGrids.gridList.filter(v=>v.enabled).map(g=>{
							return {
								id:g.id,
								enabled:g.enabled,
								title:g.title,
								entries:g.entries,
								rows:g.rows,
								cols:g.cols,
								additionalEntries:g.additionalEntries
							}
						})};
				}
				//TODO strongly type user data for safer read here
				const grid = data.bingoGrids.gridList.find(v=>v.id == gridId);
				if(grid) {
					const data:IGridCacheData["data"] = [
						{
							id:gridId,
							enabled:grid.enabled,
							title:grid.title,
							entries:grid.entries,
							rows:grid.rows,
							cols:grid.cols,
							additionalEntries:grid.additionalEntries
						}
					];
					cache = this.cachedBingoGrids[cacheKey] = {date:Date.now(), ownerId:uid, ownerName:username, data};
				}
			}
		}
		return cache;
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

		const gridCache = await this.getStreamerGrid(uid, gridId);
		if(!gridCache || !gridCache.data[0].enabled) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"Grid or user not found, or grid disabled", errorCode:"NOT_FOUND"}));
			return;
		}

		let originalGrid = JSON.parse(JSON.stringify(gridCache)) as typeof gridCache;
		let data = originalGrid.data[0];
		let multiplayerMode = false;

		if(super.getUserPremiumState(uid) != "no") {
			multiplayerMode = true;
			//If user is authenticated, generate a unique randomized grid for them
			const user = await super.twitchUserGuard(request, response, false);
			if(user) {
				const cached = this.getViewerGrid(uid, gridId, user.user_id);
				//Return cached data
				if(cached) {
					data = cached.data[0];

				//Generate user's grid
				}else{
					if(user.user_id != uid) {
						//Don't shuffle broadcaster so their public grid is the same
						//as the overlay one
						try {
							this.shuffleGridEntries(data[0]);
						}catch(error) {
							Logger.error("Failed shuffling bingo entries for user", user.login);
						}
					}

					this.saveViewerGrid(uid, gridId, user.user_id, {
						data:data[0],
						ownerId:uid,
						ownerName:originalGrid.ownerName,
						date:Date.now(),
					});
				}
			}
		}else{
			//user not authenticated, shuffle entries
			try {
				this.shuffleGridEntries(data[0]);
			}catch(error) {
				Logger.error("Failed shuffling bingo entries");
				console.log(error);
			}
		}
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data, multiplayerMode, owner:originalGrid.ownerName}));

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
		// if(user.user_id)

		const body:any = request.body;
		const gridRef:IGridCacheData["data"][number] = body.grid;
		const gridid:string = body.gridid;
		const folder = Config.BINGO_GRID_ROOT(user.user_id, gridid);
		const cachedGrid = await this.getStreamerGrid(user.user_id, gridid);
		if(!cachedGrid) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"Grid or user not found", errorCode:"NOT_FOUND"}));
			return;
		}
		if(!fs.existsSync(folder)) {
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, error:"no cache to update", errorCode:"NO_CACHE"}));
			return;
		}

		const files = fs.readdirSync(folder);
		cachedGrid.data[0].enabled = gridRef.enabled;
		cachedGrid.data[0].entries = gridRef.entries;
		cachedGrid.data[0].cols = gridRef.cols;
		cachedGrid.data[0].rows = gridRef.rows;
		cachedGrid.data[0].title = gridRef.title;
		cachedGrid.data[0].additionalEntries = gridRef.additionalEntries;

		if(!gridRef.enabled || forceNewGridGen) {
			//Grid disabled or asking to fully rebuild them
			fs.rmSync(folder, { recursive: true, force: true });
			files.forEach(file => {
				const [uid] = file.split(".");
				SSEController.sendToUser(uid, SSETopic.BINGO_GRID_UPDATE, {force:true});
			})

		}else{

			files.forEach(file => {
				const [viewerId] = file.split(".");
				const grid:typeof gridRef = JSON.parse(JSON.stringify(gridRef));//Clone to avoid all users from having same grid ref
				const cachedGrid = JSON.parse(fs.readFileSync(folder+"/"+file, "utf-8")) as IGridCacheData;
				const sortedKeysPrev = cachedGrid.data[0].entries.map(v=> v.id).concat((cachedGrid.data[0].additionalEntries || []).map(v=>v.id))
				.sort((a,b) => {
					if(a < b) return -1;
					if(a > b) return 1;
					return 0
				});

				const sortedKeysNew = grid.entries.map(v=> v.id).concat((grid.additionalEntries || []).map(v=>v.id))
				.sort((a,b) => {
					if(a < b) return -1;
					if(a > b) return 1;
					return 0
				});

				//If cells mismatch, replace the grid after shuffling entries
				const forceNewGridGen_local = forceNewGridGen
				|| sortedKeysNew.join(",") != sortedKeysPrev.join(",")
				|| cachedGrid.data[0].cols != grid.cols
				|| cachedGrid.data[0].rows != grid.rows;
				if(forceNewGridGen_local) {
					if(user.user_id != viewerId) {
						//Don't shuffle broadcaster so their public grid is the same
						//as the overlay one
						this.shuffleGridEntries(grid);
					}

					//Untick all cells
					grid.entries.forEach(v=> v.check = false);
					(grid.additionalEntries || []).forEach(v=> v.check = false);

					cachedGrid.data[0] = grid;
					cachedGrid.date = Date.now();
				}else{
					//Only update labels
					cachedGrid.data[0].title = grid.title;
					cachedGrid.data[0].entries.forEach(cell=>{
						const newCell = grid.entries.find(v=>v.id == cell.id);
						if(newCell) {
							cell.label = newCell.label;
							cell.lock = newCell.lock;
							cell.check = newCell.check;
						}
					})
				}

				//Update enabled state to viewers cache
				cachedGrid.data[0].enabled = grid.enabled;
				this.saveViewerGrid(user.user_id, gridid, viewerId, cachedGrid);

				SSEController.sendToUser(viewerId, SSETopic.BINGO_GRID_UPDATE, {grid:cachedGrid.data[0], force:forceNewGridGen_local});
			})
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
	}

	/**
	 * Called when streamer ticks a cell
	 *
	 * @param {*} request
	 * @param {*} response
	 */
	private async updateTickStates(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;

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

		const grid = await this.getViewerGrid(uid, gridId, user.user_id);
		if(grid) {
			//Count actual possible number of bingo
			const rows = grid.data[0].rows;
			const cols = grid.data[0].cols;
			const states = grid.data[0].entries.map(v=>v.check);
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

			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send({success:true, count});
			SSEController.sendToUser(uid, SSETopic.BINGO_GRID_BINGO_COUNT, {gridId:gridId, uid:user.user_id, login:user.login, count});
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
	 * Called when a mod ticks cells
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
		const grid = await this.getStreamerGrid(uid, gridId);
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

		await this.setTickStates(uid, gridId, states);
		SSEController.sendToUser(uid, SSETopic.BINGO_GRID_MODERATOR_TICK, {gridId:gridId, uid:user.user_id, states});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
	}

	/**
	 * Shuffles a grid items
	 * @param grid
	 */
	private shuffleGridEntries(grid:IGridCacheData["data"][number]):void {
		if(!grid) {
			Logger.warn("Cannot shuffle undefined grid");
			return;
		}
		if(grid.additionalEntries && grid.additionalEntries.length > 0) {
			//Randomly switch main entries with additional entries
			for (let i = 0; i < grid.entries.length; i++) {
				const entry = grid.entries[i];
				//Don't switch locked cells
				if(entry.lock) continue;
				if(Math.random() > .4) {
					const index = Math.floor(Math.random() * grid.additionalEntries.length);
					grid.entries.splice(i, 1, grid.additionalEntries[index]);
					grid.additionalEntries[index] = entry;
				}
			}
		}
		//Shuffle entries
		for (let i = grid.entries.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			if(grid.entries[i].lock || grid.entries[j].lock) continue;
			[grid.entries[i], grid.entries[j]] = [grid.entries[j], grid.entries[i]];
		}
	}
	/**
	 * Updates the tick states of the given grid's cells
	 * @param streamerId
	 * @param gridId
	 * @param states
	 */
	private async setTickStates(streamerId:string, gridId:string, states:{[cellId:string]:boolean}):Promise<void> {
		const cache = await this.getStreamerGrid(streamerId, gridId);
		if(cache) {
			//Update cache
			for (const cellId in states) {
				const state = states[cellId];
				let entry = cache.data[0].entries.find(v=>v.id === cellId);
				if(entry) entry.check = state;
				if(cache.data[0].additionalEntries) {
					entry = cache.data[0].additionalEntries.find(v=>v.id === cellId);
					if(entry) entry.check = state;
				}
			}

			//Update viewers caches
			const folder = Config.BINGO_GRID_ROOT(streamerId, gridId);
			if(fs.existsSync(folder)) {
				const files = fs.readdirSync(folder);
				files.forEach(file => {
					const viewerId = file.split(".")[0];
					const cache = JSON.parse(fs.readFileSync(folder+"/"+file, "utf-8")) as IGridCacheData;
					cache.date = Date.now();
					const grid = cache.data[0];
					for (const cellId in states) {
						const state = states[cellId];
						let entry = grid.entries.find(v=>v.id === cellId);
						if(entry) entry.check = state;
						if(grid.additionalEntries) {
							entry = grid.additionalEntries.find(v=>v.id === cellId);
							if(entry) entry.check = state;
						}
					}
					this.saveViewerGrid(streamerId, gridId, viewerId, cache);
					//Send new states to viewer
					SSEController.sendToUser(viewerId, SSETopic.BINGO_GRID_CELL_STATES, {gridId, states});
				});
			}
		}
	}
}

interface IGridCacheData {
	date:number;
	ownerId:string;
	ownerName:string;
	data:{
		id?:string;
		enabled:boolean;
		title:string;
		rows:number;
		cols:number
		entries:{
			id:string;
			lock:boolean;
			check:boolean;
			label:string;
		}[];
		additionalEntries?:IGridCacheData["data"][number]["entries"],
	}[];
}
