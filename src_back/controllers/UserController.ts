import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Logger from '../utils/Logger';
import * as fs from "fs";
import Config from '../utils/Config';
import { schemaValidator } from '../utils/DataSchema';
import * as JsonPatch from 'fast-json-patch';
import * as fetch from "node-fetch";
import AbstractController from "./AbstractController";

/**
* Created : 13/03/2022 
*/
export default class UserController extends AbstractController {

	
	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/user', async (request, response) => await this.getUserState(request, response));
		this.server.get('/api/user/chatters', async (request, response) => await this.getChatters(request, response));
		this.server.get('/api/user/all', async (request, response) => await this.getAllUsers(request, response));
		this.server.get('/api/user/data', async (request, response) => await this.getUserData(request, response));
		this.server.post('/api/user/data', async (request, response) => await this.setUserData(request, response));
		
		//Old endpoint URL.
		//It's just here to make sure people running on the old version won't have issues
		//while they're streaming.
		//Remove this after a few days once nobody else runs on the old frontend
		this.server.get('/api/userdata', async (request, response) => await this.getUserData(request, response));
		this.server.post('/api/userdata', async (request, response) => await this.getUserData(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Get a user's donor/admin state
	 */
	private async getUserState(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}

		let isDonor:boolean = false, level:number = -1;
		if(fs.existsSync( Config.donorsList )) {
			let json:{[key:string]:number} = {};
			try {
				json = JSON.parse(fs.readFileSync(Config.donorsList, "utf8"));
			}catch(error){
				response.header('Content-Type', 'application/json');
				response.status(404);
				response.send(JSON.stringify({success:false, message:"Unable to load donors data file"}));
				return;
			}
			isDonor = json.hasOwnProperty(userInfo.user_id);
			if(isDonor) {
				level = Config.donorsLevels.findIndex(v=> v > json[userInfo.user_id]) - 1;
			}
		}

		//Update user's storage file to get a little idea on how many people use twitchat
		const userFilePath = Config.USER_DATA_PATH + userInfo.user_id+".json";
		if(!fs.existsSync(userFilePath)) {
			fs.writeFileSync(userFilePath, JSON.stringify({}), "utf8");
		}else{
			fs.utimes(userFilePath, new Date(), new Date(), ()=>{/*don't care*/});
		}

		const data:{isDonor:boolean, level:number, isAdmin?:true} = {isDonor:isDonor && level > -1, level};
		if(Config.credentials.admin_ids.includes(userInfo.user_id)) {
			data.isAdmin = true;
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data}));
	}

	/**
	 * Get/set a user's data
	 */
	private async getUserData(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}

		const uid:string = (request.query as any).uid ?? userInfo.user_id;

		//Get users' data
		const userFilePath = Config.USER_DATA_PATH + uid+".json";
		if(!fs.existsSync(userFilePath)) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false}));
		}else{
			const data = fs.readFileSync(userFilePath, {encoding:"utf8"});
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:JSON.parse(data)}));
		}
	}

	/**
	 * Get chatters list
	 */
	private async getChatters(request:FastifyRequest, response:FastifyReply) {
		const channel:string = (request.query as any).channel;
		const chattersRes = await fetch("https://tmi.twitch.tv/group/user/"+channel.toLowerCase()+"/chatters", {method:"GET"});
		let chatters = [];
		if(chattersRes.status === 200) {
			chatters = await chattersRes.json();
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:chatters}));
		}else{
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false}));
		}
	}

	/**
	 * Get/set a user's data
	 */
	private async setUserData(request:FastifyRequest, response:FastifyReply) {
		const body:any = request.body;
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}

		//Get users' data
		const userFilePath = Config.USER_DATA_PATH + userInfo.user_id+".json";

		//avoid saving private data to server
		delete body.obsPass;
		delete body.oAuthToken;
		//Do not save this to the server to avoid config to be erased
		//on one of the instances
		delete body["p:hideChat"];
		
		// body.data["p:slowMode"] = true;//Uncomment to test JSON diff
	
		//Test data format
		try {
			const clone = JSON.parse(JSON.stringify(body));
			// fs.writeFileSync(userDataFolder+userInfo.user_id+"_full.json", JSON.stringify(clone), "utf8");
	
			//schemaValidator() is supposed to tell if the format is valid or not.
			//Because we enabled "removeAdditional" option, no error will be thrown
			//if a field is not in the schema. Instead it will simply remove it.
			//V9+ of the lib is supposed to allow us to retrieve the removed props,
			//but it doesn't yet. As a workaround we use JSONPatch that compares
			//the JSON before and after validation.
			//This is not the most efficient way to do this, but we have no much
			//other choice for now.
			schemaValidator(body);
			const diff = JsonPatch.compare(clone, body, false);
			if(diff?.length > 0) {
				Logger.error("Invalid format, some data have been removed from "+userInfo.login+"'s data");
				console.log(diff);
				fs.writeFileSync(Config.USER_DATA_PATH+userInfo.user_id+"_cleanup.json", JSON.stringify(diff), "utf8");
			}
			fs.writeFileSync(userFilePath, JSON.stringify(body), "utf8");

			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true}));
		}catch(error){
			Logger.error("User data save failed for "+userInfo.login);
			console.log(error);
			const message = schemaValidator.errors;
			Logger.log(message);
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message, success:false}));
		}
	}

	/**
	 * Get users list
	 */
	private async getAllUsers(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
	
		const files = fs.readdirSync(Config.USER_DATA_PATH);
		const list = files.filter(v => v.indexOf("_cleanup") == -1);
		const users:{id:String, date:number}[] = []
		list.forEach(v => {
			users.push({
				id: v.replace(".json", ""),
				date:fs.statSync(Config.USER_DATA_PATH + v).mtime.getTime()
			})
		} );
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, users}));
	}
}