import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import * as fs from "fs";
import * as path from "path";
import Config from '../utils/Config.js';
import AbstractController from "./AbstractController.js";
import Logger from "../utils/Logger.js";

/**
* Created : 14/12/2022 
*/
export default class AdminController extends AbstractController {
	
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
		this.server.get('/api/beta/user', async (request, response) => await this.getUser(request, response));
		this.server.get('/api/beta/user/hasData', async (request, response) => await this.getUserHasData(request, response));
		this.server.post('/api/beta/user/migrateToProduction', async (request, response) => await this.migrateUser(request, response));
		this.server.post('/api/admin/beta/user', async (request, response) => await this.addUser(request, response));
		this.server.post('/api/admin/beta/user/migrateToProduction', async (request, response) => await this.migrateUserAdmin(request, response));
		this.server.post('/api/admin/premium', async (request, response) => await this.postPremium(request, response));
		this.server.delete('/api/admin/premium', async (request, response) => await this.deletePremium(request, response));
		this.server.delete('/api/admin/beta/user', async (request, response) => await this.delUser(request, response));
		this.server.delete('/api/admin/beta/user/all', async (request, response) => await this.removeAllUsers(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Check if a user is part of beta testers
	 */
	private async getUser(request:FastifyRequest, response:FastifyReply) {
		const params = request.query as any;
		let userList:string[] = [];
		if(fs.existsSync(Config.BETA_USER_LIST)) {
			userList = JSON.parse(fs.readFileSync(Config.BETA_USER_LIST, "utf8"));
		}

		const isBetaTester = userList.includes(params.uid) || Config.credentials.admin_ids.includes(params.uid);
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{beta:isBetaTester}}));
	}

	/**
	 * Check if a user has data on the beta server
	 */
	private async getUserHasData(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, userInfo.user_id+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, userInfo.user_id+".json");
		const result:{betaDate?:number, prodDate?:number, betaVersion?:number, prodVersion?:number} = {};

		if(fs.existsSync(betaFile)) {
			result.betaDate = fs.statSync(betaFile).mtime.getTime();
			try {
				result.betaVersion = JSON.parse(fs.readFileSync(betaFile, "utf-8")).v || 0;
			}catch(error){/*ignore*/}
		}
		
		if(fs.existsSync(prodFile)) {
			result.prodDate = fs.statSync(prodFile).mtime.getTime();
			try {
				result.prodVersion = JSON.parse(fs.readFileSync(prodFile, "utf-8")).v || 0;
			}catch(error){/*ignore*/}
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:result}));
	}

	/**
	 * Add a user to the beta list
	 */
	private async addUser(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		const params = request.body as any;
		let userList:string[] = [];
		if(fs.existsSync(Config.BETA_USER_LIST)) {
			userList = JSON.parse(fs.readFileSync(Config.BETA_USER_LIST, "utf8"));
		}
		if(!userList.includes(params.uid)) userList.push(params.uid);

		fs.writeFileSync(Config.BETA_USER_LIST, JSON.stringify(userList));

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, params.uid+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, +params.uid+".json");

		if(fs.existsSync(prodFile)) {
			fs.copyFileSync(prodFile, betaFile);
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList}));
	}

	/**
	 * Migrate a user's data from beta to production
	 */
	private async migrateUser(request:FastifyRequest, response:FastifyReply) {
		const userInfo = await super.twitchUserGuard(request, response);
		if(userInfo == false) return;
		
		Logger.info("Migrate",userInfo.login,"data from beta to production.");

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, userInfo.user_id+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, userInfo.user_id+".json");
		
		console.log("Source:", betaFile);
		console.log("  Dest:", prodFile);
		if(fs.existsSync(betaFile)) {
			fs.copyFileSync(betaFile, prodFile);
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Migrate a user's data from beta to production (Admin mode)
	 */
	private async migrateUserAdmin(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		const params:any = request.body;

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, params.uid+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, params.uid+".json");
		
		if(fs.existsSync(betaFile)) {
			fs.copyFileSync(betaFile, prodFile);
		}
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Removes a user from the beta list
	 */
	private async delUser(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		const params = request.query as any;
		let userList:string[] = [];
		if(fs.existsSync(Config.BETA_USER_LIST)) {
			userList = JSON.parse(fs.readFileSync(Config.BETA_USER_LIST, "utf8"));
		}
		const index = userList.indexOf(params.uid);
		if(index > -1) {
			userList.splice(index, 1);
		}

		fs.writeFileSync(Config.BETA_USER_LIST, JSON.stringify(userList));
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList}));
	}

	/**
	 * Removes all users from the beta list
	 */
	private async removeAllUsers(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		fs.writeFileSync(Config.BETA_USER_LIST, JSON.stringify([]));
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList:[]}));
	}

	/**
	 * Gifts premium to a user
	 */
	private async postPremium(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		let uids:string[] = [];
		if(fs.existsSync(Config.giftedPremium)) {
			uids = JSON.parse(fs.readFileSync(Config.giftedPremium, "utf-8"));
		}
		const params:any = request.body;
		if(!uids.includes(params.uid)) {
			uids.push(params.uid);
			AbstractController._giftedPremium[params.uid] = true;
		}
		fs.writeFileSync(Config.giftedPremium, JSON.stringify(uids), "utf-8");
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, uids}));
	}

	/**
	 * Remove premium gift from a user
	 */
	private async deletePremium(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		let uids:string[] = [];
		if(fs.existsSync(Config.giftedPremium)) {
			uids = JSON.parse(fs.readFileSync(Config.giftedPremium, "utf-8"));
		}
		const params = request.query as any;
		uids = uids.filter(uid => uid != params.uid);
		delete AbstractController._giftedPremium[params.uid];
		fs.writeFileSync(Config.giftedPremium, JSON.stringify(uids), "utf-8");
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, uids}));
	}
}