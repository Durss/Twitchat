import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import * as fs from "fs";

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
		this.server.post('/api/bingogrid', async (request, response) => await this.userGridUpdate(request, response));
		this.server.post('/api/tickCell', async (request, response) => await this.tickCell(request, response));
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
		const user = await super.twitchUserGuard(request, response, false);
	
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
					cache = this.cachedBingoGrids[cacheKey] = {date:Date.now(), data};
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
	 * Updates a user's grid
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async userGridUpdate(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
	
		if(user) {
			const body:any = request.body;
			const gridid:string = body.gridid;
			const grid:IGridCacheData["data"] = body.grid;
			if(!this.viewerGridStates[gridid]) this.viewerGridStates[gridid] = {};
			if(!this.viewerGridStates[gridid][user.user_id]) {
				//set cache only if it does not exist to prevent users
				//from overriding the grid as they want
				this.viewerGridStates[gridid][user.user_id] = grid;
			}
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
	}

	/**
	 * Called when stream ticks a cell
	 * 
	 * @param {*} request 
	 * @param {*} response 
	 */
	private async tickCell(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response, false);
	
		if(user) {
			const body:any = request.body;
			const gridid:string = body.gridid;
			const grid:IGridCacheData["data"] = body.grid;
			if(!this.viewerGridStates[gridid]) this.viewerGridStates[gridid] = {};
			if(!this.viewerGridStates[gridid][user.user_id]) {
				//set cache only if it does not exist to prevent users
				//from overriding the grid as they want
				this.viewerGridStates[gridid][user.user_id] = grid;
			}
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send({success:true});
	}
}

interface IGridCacheData {
	date:number;
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