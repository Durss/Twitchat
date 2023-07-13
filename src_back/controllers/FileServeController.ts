import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController";
import Config from "../utils/Config";
import * as fs from "fs";
import * as path from "path";
import Logger from "../utils/Logger";

/**
* Created : 22/02/2023
*/
export default class FileServeController extends AbstractController {
	
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
		
		//Defautl API route
		this.server.get('/api', async (request:FastifyRequest, response:FastifyReply) => { return { success: true }; });
		
		//Get latest script.js file for cache bypass
		this.server.get('/api/script', async (request:FastifyRequest, response:FastifyReply) => this.getScript(request, response) );
		
		//Get latest app configs
		this.server.get('/api/configs', async (request:FastifyRequest, response:FastifyReply) => this.getConfigs(request, response) );
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private getScript(request:FastifyRequest, response:FastifyReply):void {
		Logger.info("Serving script for cache bypass")
		const assets = path.join(Config.PUBLIC_ROOT, "assets");
		const file = fs.readdirSync(assets).find(v => /index\..*\.js/gi.test(v));
		const txt = fs.readFileSync(path.join(assets, file), {encoding:"utf8"});
		response.header('Content-Type', 'application/javascript');
		response.status(200);
		response.send(txt);
	}

	private getConfigs(request:FastifyRequest, response:FastifyReply):void {
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({
			twitch_client_id:Config.credentials.twitch_client_id,
			twitch_scopes:Config.credentials.twitch_scopes,
	
			spotify_scopes:Config.credentials.spotify_scopes,
			spotify_client_id:Config.credentials.spotify_client_id,
			
			patreon_client_id:Config.credentials.patreon_client_id,
		}));
	}

}