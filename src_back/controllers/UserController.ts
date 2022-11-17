import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Logger from '../utils/Logger';
import * as fs from "fs";
import Config from '../utils/Config';
import { schemaValidator } from '../utils/DataSchema';
import * as JsonPatch from 'fast-json-patch';

/**
* Created : 13/03/2022 
*/
export default class UserController {

	
	constructor(public server:FastifyInstance) {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/user/chatters', async (request, response) => await this.getChatters(request, response));
		this.server.get('/api/user/all', async (request, response) => await this.getUsers(request, response));
		this.server.get('/api/user/data', async (request, response) => await this.getUserData(request, response));
		this.server.post('/api/user/data', async (request, response) => await this.setUserData(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

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

		const uid = (request.query as any).uid ?? userInfo.user_id;

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
		const channel = (request.query as any).channel;
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
				Logger.error("Invalid format, some data has been removed from "+userInfo.login+"'s data");
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
	private async getUsers(request:FastifyRequest, response:FastifyReply) {
		//Missing auth token
		if(!request.headers.authorization) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false}));
			return;
		}
		
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}
	
		//Only allow admins
		if(Config.credentials.admin_ids.indexOf(userInfo.user_id) == -1) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"You're not allowed to call this endpoint", success:false}));
			return;
		}
	
		const files = fs.readdirSync(Config.USER_DATA_PATH);
		const list = files.filter(v => v.indexOf("_cleanup") == -1);
		const users = []
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