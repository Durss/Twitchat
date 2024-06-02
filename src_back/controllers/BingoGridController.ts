import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import * as fs from "fs";
import SSEController, { SSECode } from "./SSEController";

/**
* Created : 01/06/2024 
*/
export default class BingoGridController extends AbstractController {

	private cachedBingoGrids:{[key:string]:IGridCacheData} = {}
	/**
	 * Stores viewers grid states.
	 */
	private viewerGridStates:{[gridID:string]:{[userId:string]:IGridCacheData["data"]}} = {};
	
	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	public async initialize():Promise<void> {
		this.server.get('/api/bingogrid', async (request, response) => await this.getBingoGrid(request, response));
		this.server.post('/api/bingogrid', async (request, response) => await this.restoreViewerCache(request, response));
		this.server.post('/api/bingogrid/streamer', async (request, response) => await this.streamerGridUpdate(request, response));
		this.server.post('/api/bingogrid/tickCell', async (request, response) => await this.tickCell(request, response));
		this.server.post('/api/bingogrid/untickAll', async (request, response) => await this.untickAllCells(request, response));
		this.server.post('/api/bingogrid/bingo', async (request, response) => await this.sendBingoCount(request, response));
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
		const gridid:string = (request.query as any).gridid;

		const cacheKey = uid+"/"+gridid;
		let cache = this.cachedBingoGrids[cacheKey];
		if(!cache || Date.now() - cache.date > 5000) {
			//Get users' data
			const userFilePath = Config.USER_DATA_PATH + uid+".json";
			let found = fs.existsSync(userFilePath);
			if(found){
				const data = JSON.parse(fs.readFileSync(userFilePath, {encoding:"utf8"}));
				//TODO strongly type user data for safer read here
				const grid = data.bingoGrids.gridList.find(v=>v.id == gridid);
				found = grid != undefined;
				if(found) {
					const data:IGridCacheData["data"] = {title:grid.title, entries:grid.entries, rows:grid.rows, cols:grid.cols};
					cache = this.cachedBingoGrids[cacheKey] = {date:Date.now(), ownerId:uid, data};
				}
			}
			if(!found) {
				response.header('Content-Type', 'application/json');
				response.status(404);
				response.send(JSON.stringify({success:false, error:"Grid or user not found", errorCode:"NOT_FOUND"}));
				return;
			}
		}

		let data = JSON.parse(JSON.stringify(cache.data)) as typeof cache.data;
		
		const user = await super.twitchUserGuard(request, response, false);
		if(user) {
			if(!this.viewerGridStates[gridid]) this.viewerGridStates[gridid] = {};
			const cached = this.viewerGridStates[gridid][user.user_id];
			if(cached) {
				//Returned cached data
				data = cached;
				
			}else{
				//Generate user's cache
				//Shuffle entries
				for (let i = data.entries.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1));
					if(data.entries[i].lock || data.entries[j].lock) continue;
					[data.entries[i], data.entries[j]] = [data.entries[j], data.entries[i]];
				}
				this.viewerGridStates[gridid][user.user_id] = data;
			}
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data}));
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
		const gridid:string = body.gridid;
		const grid:IGridCacheData["data"] = body.grid;
		if(!this.viewerGridStates[gridid]) this.viewerGridStates[gridid] = {};
		if(!this.viewerGridStates[gridid][user.user_id]) {
			//set cache only if it does not exist to prevent users
			//from overriding the grid as they want
			this.viewerGridStates[gridid][user.user_id] = grid;
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
	private async streamerGridUpdate(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;
	
		const body:any = request.body;
		const gridid:string = body.gridid;
		const grid:IGridCacheData["data"] = body.grid;
		if(!this.viewerGridStates[gridid]) this.viewerGridStates[gridid] = {};
		const uids = Object.keys(this.viewerGridStates[gridid]);
		uids.forEach(uid => {
			this.viewerGridStates[gridid][uid] = grid;
			SSEController.sendToUser(uid, SSECode.BINGO_GRID_UPDATE, grid);
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
	private async tickCell(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;
	
		const body:any = request.body;
		const gridid:string = body.gridid;
		const cellid:string = body.cellid;
		const state:boolean = body.state;
		const cacheKey = user.user_id+"/"+gridid;
		const cache = this.cachedBingoGrids[cacheKey];
		if(cache) {
			const cell = cache.data.entries.find(v=>v.id == cellid);
			if(cell) {
				cell.check = state;
				const viewers = Object.keys(this.viewerGridStates[gridid] || {});
				viewers.forEach(uid => {
					//Enable cell on users cache
					const userCell = this.viewerGridStates[gridid][uid].entries.find(cell => cell.id == cellid);
					if(userCell) userCell.check = true;
					SSEController.sendToUser(uid, SSECode.TICK_BINGO_GRID_CELL, {cell:cell.id, state});
				})
			}
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
	private async untickAllCells(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
		if(!user) return;
	
		const body:any = request.body;
		const gridid:string = body.gridid;
		const cacheKey = user.user_id+"/"+gridid;
		const cache = this.cachedBingoGrids[cacheKey];
		if(cache) {
			cache.data.entries.forEach(cell => cell.check = false);
		}
		const viewers = Object.keys(this.viewerGridStates[gridid] || {});
		viewers.forEach(uid => {
			//Enable cell on users cache
			this.viewerGridStates[gridid][uid].entries.forEach(cell => cell.check = false );
			SSEController.sendToUser(uid, SSECode.BINGO_GRID_UNTICK_ALL);
		})

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
		const gridid:string = body.gridid;
		const count:number = body.count;
		
		const cacheKey = uid+"/"+gridid;
		const cache = this.cachedBingoGrids[cacheKey];
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
			SSEController.sendToUser(uid, SSECode.BINGO_GRID_BINGO_COUNT, {gridId:gridid, uid:user.user_id, login:user.login, count});
		}else{
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send({success:false});
		}
	}
}

interface IGridCacheData {
	date:number;
	ownerId:string;
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
	};
}