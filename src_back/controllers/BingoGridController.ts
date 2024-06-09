import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import Config from "../utils/Config";
import Logger from "../utils/Logger";
import TwitchUtils from "../utils/TwitchUtils";
import AbstractController from "./AbstractController";
import SSEController, { SSECode as SSETopic } from "./SSEController";

/**
* Created : 01/06/2024 
*/
export default class BingoGridController extends AbstractController {

	private cachedBingoGrids:{[key:string]:IGridCacheData} = {}
	/**
	 * Stores viewers grid states.
	 */
	private viewerGridStates:{[gridID:string]:{[userId:string]:IGridCacheData}} = {};
	
	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	public async initialize():Promise<void> {
		this.server.get('/api/bingogrid', async (request, response) => await this.getBingoGrid(request, response));
		this.server.post('/api/bingogrid', async (request, response) => await this.restoreViewerCache(request, response));
		this.server.put('/api/bingogrid', async (request, response) => await this.streamerGridUpdate(request, response));
		this.server.post('/api/bingogrid/tickStates', async (request, response) => await this.updateTickStates(request, response));
		this.server.post('/api/bingogrid/bingo', async (request, response) => await this.sendBingoCount(request, response));
		this.server.post('/api/bingogrid/shuffle', async (request, response) => await this.shuffleEntries(request, response));
		this.server.post('/api/bingogrid/moderate', async (request, response) => await this.moderateEntries(request, response));

		setInterval(()=>{
			for (const gridId in this.viewerGridStates) {
				const grid = this.viewerGridStates[gridId];
				for (const uid in grid) {
					const data = grid[uid];
					// if(data.)
				}
			}
		},60*60*1000)
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Get a bingo grid definition
	 */
	private async getBingoGrid(request:FastifyRequest, response:FastifyReply) {
		const uid:string = (request.query as any).uid;
		const gridId:string = (request.query as any).gridid;

		const gridCache = await this.getStreamerGrid(uid, gridId);
		if(!gridCache) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"Grid or user not found", errorCode:"NOT_FOUND"}));
			return;
		}

		let cache = JSON.parse(JSON.stringify(gridCache)) as typeof gridCache;
		let data = cache.data;
		
		//If user is authenticated, generate a unique randomized grid for them
		const user = await super.twitchUserGuard(request, response, false);
		if(user) {
			if(!this.viewerGridStates[gridId]) this.viewerGridStates[gridId] = {};
			const cached = this.viewerGridStates[gridId][user.user_id];
			//Returned cached data
			if(cached) {
				data = cached.data;
				
			//Generate user's cache
			}else{
				if(user.user_id != uid) {
					//Don't shuffle broadcaster so their public grid is the same
					//as the overlay one
					this.shuffleGridEntries(data);
				}
				this.viewerGridStates[gridId][user.user_id] = {
					data,
					ownerId:uid,
					ownerName:cache.ownerName,
					date:Date.now(),
				};
			}
		}else{
			//user not authenticated, shuffle entries
			try {
				this.shuffleGridEntries(data);
			}catch(error) {
				Logger.error("CRASH");
				console.log(error);
			}
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data, owner:cache.ownerName}));
		return;
	}

	/**
	 * Restores a viewer's cache.
	 * Useful in case server is rebooted.
	 * As everything's stored on RAM, when server is rebooted, everything's
	 * lost. In this case the clients all send back their grids to restore
	 * their caches
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async restoreViewerCache(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;
	
		const body:any = request.body;
		const uid:string = body.uid;
		const gridId:string = body.gridid;
		const grid:IGridCacheData["data"] = body.grid;
		if(!this.viewerGridStates[gridId]) this.viewerGridStates[gridId] = {};
		if(!this.viewerGridStates[gridId][user.user_id]) {
			//set cache only if it does not exist to prevent users
			//from overriding the grid as they want
			const cache = await this.getStreamerGrid(uid, gridId);
			if(cache) {
				//Extract all entries that are missing from user's grid definition
				//and push them in their additionalEntries so diff made on streamerGridUpdate()
				//works properly
				const missingEntries = cache.data.entries
									.concat(cache.data.additionalEntries || [])
									.filter(v=> grid.entries.findIndex(w => w.id === v.id) == -1);
				grid.additionalEntries = (grid.additionalEntries || []).concat(missingEntries);
			}
			this.viewerGridStates[gridId][user.user_id] = {
				data:grid,
				ownerId:uid,
				ownerName:cache.ownerName,
				date:Date.now(),
			};
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
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
	
		const body:any = request.body;
		const gridid:string = body.gridid;
		if(!this.viewerGridStates[gridid]) this.viewerGridStates[gridid] = {};
		const uids = Object.keys(this.viewerGridStates[gridid]);
		uids.forEach(uid => {
			const grid:IGridCacheData["data"] = JSON.parse(JSON.stringify(body.grid));//Clone to avoid all users from having same grid ref
			const cachedGrid = this.viewerGridStates[gridid][uid].data;
			const sortedKeysPrev = cachedGrid.entries.map(v=> v.id).concat((cachedGrid.additionalEntries || []).map(v=>v.id))
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
			if(forceNewGridGen || sortedKeysNew.join(",") != sortedKeysPrev.join(",")) {
				if(user.user_id != uid) {
					//Don't shuffle broadcaster so their public grid is the same
					//as the overlay one
					this.shuffleGridEntries(grid);
				}

				//Untick all cells
				grid.entries.forEach(v=> v.check = false);
				(grid.additionalEntries || []).forEach(v=> v.check = false);

				this.viewerGridStates[gridid][uid].data = grid;
				this.viewerGridStates[gridid][uid].date = Date.now();
			}else{
				//Only update labels
				cachedGrid.title = grid.title;
				cachedGrid.entries.forEach(cell=>{
					const newCell = grid.entries.find(v=>v.id == cell.id);
					if(newCell) {
						cell.label = newCell.label;
						cell.lock = newCell.lock;
						cell.check = newCell.check;
					}
				})
			}
			SSEController.sendToUser(uid, SSETopic.BINGO_GRID_UPDATE, {grid:this.viewerGridStates[gridid][uid].data, force:forceNewGridGen});
		})

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

		await this.setTickStates(user.user_id, gridId, states);

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
		const count:number = body.count;
		
		const cache = await this.getStreamerGrid(uid, gridId);
		if(cache) {
			const rows = cache.data.rows;
			const cols = cache.data.cols;
			const states = cache.data.entries.map(v=>v.check);
			let bingoCount = 0;
			//Check filled cols count
			for (let x = 0; x < cols; x++) {
				let allTicked = true;
				for (let y = 0; y < cols; y++) {
					if(!states[x+y*cols]) {
						allTicked = false;
						break;
					}
				}
				if(allTicked) bingoCount ++;
			}
			//Check filled rows count
			for (let y = 0; y < cols; y++) {
				let allTicked = true;
				for (let x = 0; x < cols; x++) {
					if(!states[x+y*cols]) {
						allTicked = false;
						break;
					}
				}
				if(allTicked) bingoCount ++;
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
						allTicked1 = false;
					}
				}
				if(allTicked1) bingoCount ++;
				if(allTicked2) bingoCount ++;
			}
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send({success:true, count:Math.min(bingoCount, count)});
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
		console.log("SEND STATES", grid.ownerName);
		SSEController.sendToUser(uid, SSETopic.BINGO_GRID_MODERATOR_TICK, {gridId:gridId, uid:user.user_id, states});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
	}

	/**
	 * Shuffles a grid items
	 * @param grid 
	 */
	private shuffleGridEntries(grid:IGridCacheData["data"]):void {
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
	 * Gets grid definition of a streamer
	 * @param uid 
	 * @param gridId 
	 * @returns 
	 */
	private async getStreamerGrid(uid:string, gridId:string):Promise<IGridCacheData> {
		const cacheKey = uid+"/"+gridId;
		let cache = this.cachedBingoGrids[cacheKey];
		if(!cache || Date.now() - cache.date > 5000) {
			//Get users' data
			const userFilePath = Config.USER_DATA_PATH + uid+".json";
			let found = fs.existsSync(userFilePath);
			if(found){
				const users = await TwitchUtils.loadUsers(undefined, [uid]);
				const username = users && users.length > 0? users[0].display_name : "???";
				const data = JSON.parse(fs.readFileSync(userFilePath, {encoding:"utf8"}));
				//TODO strongly type user data for safer read here
				const grid = data.bingoGrids.gridList.find(v=>v.id == gridId) as IGridCacheData["data"];
				found = grid != undefined;
				if(found) {
					const data:IGridCacheData["data"] = {title:grid.title, entries:grid.entries, rows:grid.rows, cols:grid.cols, additionalEntries:grid.additionalEntries};
					cache = this.cachedBingoGrids[cacheKey] = {date:Date.now(), ownerId:uid, ownerName:username, data};
				}
			}
		}
		return cache;
	}
	
	/**
	 * Updates the tick states of the given grid's cells
	 * @param uid 
	 * @param gridId 
	 * @param states 
	 */
	private async setTickStates(uid:string, gridId:string, states:{[cellId:string]:boolean}):Promise<void> {
		const cache = await this.getStreamerGrid(uid, gridId);
		if(cache) {
			//Update cache
			for (const cellId in states) {
				const state = states[cellId];
				let entry = cache.data.entries.find(v=>v.id === cellId);
				if(entry) entry.check = state;
				if(cache.data.additionalEntries) {
					entry = cache.data.additionalEntries.find(v=>v.id === cellId);
					if(entry) entry.check = state;
				}
			}

			//Update viewers caches
			const viewers = Object.keys(this.viewerGridStates[gridId] || {});
			viewers.forEach(uid => {
				const cache = this.viewerGridStates[gridId][uid];
				cache.date = Date.now();
				const grid = cache.data;
				for (const cellId in states) {
					const state = states[cellId];
					let entry = grid.entries.find(v=>v.id === cellId);
					if(entry) entry.check = state;
					if(grid.additionalEntries) {
						entry = grid.additionalEntries.find(v=>v.id === cellId);
						if(entry) entry.check = state;
					}
				}
				//Send new states to viewer
				SSEController.sendToUser(uid, SSETopic.BINGO_GRID_CELL_STATES, {gridId, states});
			});
		}
	}
}

interface IGridCacheData {
	date:number;
	ownerId:string;
	ownerName:string;
	data:{
		title:string;
		rows:number;
		cols:number
		entries:{
			id:string;
			lock:boolean;
			check:boolean;
			label:string;
		}[];
		additionalEntries?:IGridCacheData["data"]["entries"],
	};
}