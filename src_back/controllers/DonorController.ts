import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import Config from "../utils/Config.js";
import AbstractController from "./AbstractController.js";

/**
* Created : 16/10/2022 
*/
export default class DonorController extends AbstractController {
	
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
		this.server.get('/api/user/donor/all', async (request, response) => await this.getAllDonors(request, response));
		this.server.get('/api/user/donor/anon', async (request, response) => await this.getAnonState(request, response));
		this.server.post('/api/user/donor/anon', async (request, response) => await this.setAnonState(request, response));

		//Update donors data when donor list source is updated
		if(!fs.existsSync(Config.donorsList)) {
			fs.writeFileSync(Config.donorsList, "{}");
		}
		fs.watchFile(Config.donorsList, (curr, prev)=> {
			this.updatePublicDonorsList();
		});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Gets the public list of donors
	 */
	private async getAllDonors(request:FastifyRequest, response:FastifyReply) {
		// Added this test as someone keeps polling the service anonymously
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

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
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;
	
		//Get current state
		let json:Record<string, boolean> = {};
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
		const body:any = request.body;
		//Get uer info
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;
	
		if(fs.existsSync( Config.donorsAnonStates )) {
			let json:Record<string, boolean> = {};
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
			const donors = JSON.parse(fs.readFileSync(Config.donorsList, "utf8"));
			const anonStates = JSON.parse(fs.readFileSync(Config.donorsAnonStates, "utf8"));
			let res:{uid:string, v:number}[] = [];
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