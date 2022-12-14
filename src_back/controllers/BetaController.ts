import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Config from '../utils/Config';
import Logger from "../utils/Logger";
import * as fetch from "node-fetch";
import AbstractController from "./AbstractController";
import * as fs from "fs";

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
		this.server.post('/api/beta/user', async (request, response) => await this.addUser(request, response));
		this.server.delete('/api/beta/user', async (request, response) => await this.delUser(request, response));
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
	
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, userList}));
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
}