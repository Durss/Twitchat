import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Config from '../utils/Config';
import AbstractController from "./AbstractController";
import * as fs from "fs";
import * as path from "path";

/**
* Created : 14/12/2022 
*/
export default class BetaController extends AbstractController {
	
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
		if(fs.existsSync(Config.betaList)) {
			userList = JSON.parse(fs.readFileSync(Config.betaList, "utf8"));
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
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}

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
		
		const params = request.query as any;
		let userList:string[] = [];
		if(fs.existsSync(Config.betaList)) {
			userList = JSON.parse(fs.readFileSync(Config.betaList, "utf8"));
		}
		if(!userList.includes(params.uid)) userList.push(params.uid);

		fs.writeFileSync(Config.betaList, JSON.stringify(userList));

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
		const userInfo = await Config.getUserFromToken(request.headers.authorization);
		if(!userInfo) {
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({message:"Invalid access token", success:false}));
			return;
		}

		const prodFile = path.join(Config.PRODUCTION_USER_DATA_PATH_FROM_BETA, userInfo.user_id+".json");
		const betaFile = path.join(Config.USER_DATA_PATH, userInfo.user_id+".json");
		
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
		if(fs.existsSync(Config.betaList)) {
			userList = JSON.parse(fs.readFileSync(Config.betaList, "utf8"));
		}
		let index = userList.indexOf(params.uid);
		if(index > -1) {
			userList.splice(index, 1);
		}

		fs.writeFileSync(Config.betaList, JSON.stringify(userList));
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList}));
	}

	/**
	 * Removes all users from the beta list
	 */
	private async removeAllUsers(request:FastifyRequest, response:FastifyReply) {
		if(!await this.adminGuard(request, response)) return;
		
		fs.writeFileSync(Config.betaList, JSON.stringify([]));
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList:[]}));
	}
}