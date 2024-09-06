import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import * as crypto from "crypto";
import Logger from "../utils/Logger.js";

/**
* Created : 06/09/2024 
*/
export default class TiltifyController extends AbstractController {
	
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
		this.server.post('/api/tiltify/webhook', async (request, response) => await this.postWebhok(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Called when receiving a webhook event
	 * @param request 
	 * @param response 
	 * @returns 
	 */
	private async postWebhok(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const body = request.body as any;
		const bodyStr = JSON.stringify(body);
		const signature = request.headers["x-tiltify-signature"];
		const timestamp = request.headers["x-tiltify-timestamp"];
		const key = timestamp+"."+bodyStr;
		const hash = crypto.createHmac('sha256', Config.credentials.tiltify_webhook_verify)
		.update(key)
		.digest('base64');

		if(hash !== signature) {
			Logger.warn("Tiltify: Invalid webhook signature");
			response.status(401);
			response.send("Unauthorized");
			return;
		}
		console.log("Signatures match?", hash == signature);
		
		response.status(200);
		response.send("OK");
	}
}