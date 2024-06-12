import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import fetch from "node-fetch";;
import Config from "../utils/Config.js";

/**
* Created : 25/02/2024 
*/
export default class ApiController extends AbstractController {

	private t4pCache = {date:0, data:{}};
	
	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
		//TODO remove once T4P ends
		this.server.get('/api/t4p', async (request, response) => await this.getCurrentT4PCampaign(request, response));
		this.server.post('/api/remote/action', async (request, response) => await this.postRemoteAction(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Executes a an action
	 * @param request 
	 * @param response 
	 */
	private async postRemoteAction(request:FastifyRequest, response:FastifyReply) {
	}

	/**
	 * Get current T4P campaign info
	 * //TODO remove this once T4P ends
	 * @param request 
	 * @param response 
	 */
	private async getCurrentT4PCampaign(request:FastifyRequest, response:FastifyReply) {
		if(!this.twitchUserGuard(request, response)) return;

		//Return cache if not older than 60s
		if(Date.now() - this.t4pCache.date < 60000 && this.t4pCache.data) {
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:this.t4pCache.data}));
			return;
		}
		
		let success = true;
		let json = {};
		try {
			const res = await fetch(Config.credentials.t4p_api_path);
			json = (await res.json()).data;
		}catch(error) {
			success = false;
		}

		if(success) {
			this.t4pCache.date = Date.now();
			this.t4pCache.data = json;
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true, data:json}));
		}else{
			response.header('Content-Type', 'application/json');
			response.status(500);
			response.send(JSON.stringify({success:false}));
		}
	}
}