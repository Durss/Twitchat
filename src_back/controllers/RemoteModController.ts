import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import fetch from "node-fetch";
import Config from "../utils/Config.js";
import TwitchUtils from "../utils/TwitchUtils.js";
import SSEController, { SSECode } from "./SSEController.js";

/**
* Created : 13/07/2024 
*/
export default class RemoteModController extends AbstractController {

	
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
		this.server.get('/api/mod/request', async (request, response) => await this.getModParams(request, response));
		this.server.post('/api/mod/qna', async (request, response) => await this.postQnaParams(request, response));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	/**
	 * Request streamer any available shared mod params
	 * @param request 
	 * @param response 
	 */
	private async getModParams(request:FastifyRequest, response:FastifyReply) {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return;

		const channels = await TwitchUtils.getModeratedChannels(user.user_id, request.headers.authorization!);
		console.log("Ask shared mode info to", channels.map(v=>v.broadcaster_login));
		channels.forEach(chan => {
			if(!this.isUserPremium(chan.broadcaster_id)) return;
			SSEController.sendToUser(chan.broadcaster_id, SSECode.SHARED_MOD_INFO_REQUEST);
		})

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Share given Q&A params to connected mods
	 * @param request 
	 * @param response 
	 */
	private async postQnaParams(request:FastifyRequest, response:FastifyReply) {
		const user = await this.premiumGuard(request, response);
		if(!user) return;

		const moderators = await TwitchUtils.getModerators(user.user_id, request.headers.authorization!);
		console.log("Send q&a params to", moderators.map(v=>v.user_login));
		moderators.forEach(mod => {
			SSEController.sendToUser(mod.user_id, SSECode.QNA_STATE, request.body);
		})

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}
}