import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import fetch from "node-fetch";
import Config from "../utils/Config.js";

/**
* Created : 25/02/2024 
*/
export default class ApiController extends AbstractController {

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
		this.server.post('/api/remote/action', async (request, response) => await this.postRemoteAction(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Executes a Twitchat action remotely
	 * TODO
	 * @param request 
	 * @param response 
	 */
	private async postRemoteAction(request:FastifyRequest, response:FastifyReply) {
	}

}