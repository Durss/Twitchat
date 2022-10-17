import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import Config from "../utils/Config";

/**
* Created : 16/10/2022 
*/
export default class DonorController {
	
	constructor(public server:FastifyInstance) {
		
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize():Promise<void> {
		this.server.get('/api/user/donor', async (request, response) => await this.getIsDonor(request, response));
		this.server.get('/api/user/donor/all', async (request, response) => await this.getAllDonors(request, response));
		this.server.get('/api/user/donor/anon', async (request, response) => await this.getAnonState(request, response));
		this.server.post('/api/user/donor/anon', async (request, response) => await this.setAnonState(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Gets if a user is part of the donors (create donors.json file with twitch UID array inside)
	 */
	private async getIsDonor(request:FastifyRequest, response:FastifyReply) {
		let userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}

		let user, level = -1;
		if(fs.existsSync( Config.donorsList )) {
			let json = [];
			try {
				json = JSON.parse(fs.readFileSync(Config.donorsList, "utf8"));
			}catch(error){
				response.header('Content-Type', 'application/json');
				response.status(404);
				response.send(JSON.stringify({success:false, message:"Unable to load donors data file"}));
				return;
			}
			user = json.hasOwnProperty(userInfo.user_id);
			if(user) {
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

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{isDonor:user != undefined && level > -1, level}}));
	}

	/**
	 * Gets the public list of donors
	 */
	private async getAllDonors(request:FastifyRequest, response:FastifyReply) {
		let json = [];
		if(fs.existsSync(Config.donorsPublicList)) {
			try {
				json = JSON.parse(fs.readFileSync(Config.donorsPublicList, "utf8"));
			}catch(error){
				response.header('Content-Type', 'application/json');
				response.status(404);
				response.send(JSON.stringify({success:false, message:"Unable to load donors data file"}));
				return;
			}
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{list:json}}));
	}

	/**
	 * Gets the anon donor state of the current user
	 */
	private async getAnonState(request:FastifyRequest, response:FastifyReply) {
		//Get uer info
		let userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}
	
		//Get current state
		let json = {};
		try {
			json = JSON.parse(fs.readFileSync(Config.donorsAnonStates, "utf8"));
		}catch(error){

			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, message:"Unable to load anon donors state data file"}));
			return;
		}
		

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{public:json[ userInfo.user_id ]}}));
		return;
	}

	/**
	 * Sets the anon donor state of the current user
	 */
	private async setAnonState(request:FastifyRequest, response:FastifyReply) {
		let body:any = request.body;
		//Get uer info
		let userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}
	
		if(fs.existsSync( Config.donorsAnonStates )) {
			let json = {};
			try {
				json = JSON.parse(fs.readFileSync(Config.donorsAnonStates, "utf8"));
			}catch(error){
				response.header('Content-Type', 'application/json');
				response.status(404);
				response.send(JSON.stringify({success:false, message:"Unable to load anon donors state data file"}));
				return;
			}
	
			if(body.public === true) {
				json[userInfo.user_id] = true;
			}else{
				delete json[userInfo.user_id];
			}
	
			fs.writeFileSync(Config.donorsAnonStates, JSON.stringify(json), "utf8");
			
			this.updatePublicDonorsList();
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}


	/**
	 * Updates the donors list
	 */
	private updatePublicDonorsList() {
		try {
			let donors = JSON.parse(fs.readFileSync(Config.donorsList, "utf8"));
			let anonStates = JSON.parse(fs.readFileSync(Config.donorsAnonStates, "utf8"));
			let res = [];
			for (let uid in donors) {
				const v = donors[uid];
				if(anonStates[uid] !== true) uid = "-1";
				res.push( {uid, v} );
			}
			res = res.filter(v=> v.v > .001)//I set 0,001 for people that's been offered donor badge. Ignore them
			//Sort by donation
			res.sort((a,b)=> {
				if(a.v < b.v) return 1;
				if(a.v > b.v) return -1;
				return 0
			});
			res.forEach(e => {
				e.v = Config.donorsLevels.findIndex(v=> v > e.v) - 1;
			})
	
			fs.writeFileSync(Config.donorsPublicList, JSON.stringify(res), "utf-8");
	
		}catch(error){
			console.log(error);
			return false;
		}
		return true;
	}
}