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
		this.server.put('/api/mod/qna/message', async (request, response) => await this.putQnaMessage(request, response));
		this.server.delete('/api/mod/qna/message', async (request, response) => await this.deleteQnaMessage(request, response));
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
		channels.forEach(chan => {
			if(!this.isUserPremium(chan.broadcaster_id)) return;
			SSEController.sendToUser(chan.broadcaster_id, SSECode.SHARED_MOD_INFO_REQUEST);
		});

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
		moderators.forEach(mod => {
			SSEController.sendToUser(mod.user_id, SSECode.QNA_STATE, request.body);
		})

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Adds a message to an existing Q&A session
	 * @param request 
	 * @param response 
	 */
	private async putQnaMessage(request:FastifyRequest, response:FastifyReply) {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return;

		const body:any = request.body;
		if(!body.entry
		|| !body.entry.channelId
		|| !body.entry.message
		|| !body.entry.message.id
		|| !body.entry.message.chunks
		|| !body.entry.platform
		|| !body.entry.user
		|| !body.entry.user.id
		|| !body.entry.user.name
		|| !body.sessionId
		|| !body.ownerId) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"invalid parameters", errorCode:"INVALID_PARAMETERS"}));
			return
		}

		const channels = await TwitchUtils.getModeratedChannels(user.user_id, request.headers.authorization!);
		if(channels.findIndex(v=>v.broadcaster_id == body.ownerId) == -1 || !this.isUserPremium(body.ownerId)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"invalid parameters", errorCode:"INVALID_PARAMETERS_2"}));
			return
		}

		SSEController.sendToUser(body.ownerId, SSECode.QNA_ACTION, {
			action:"add_message",
			message:body.entry,
			sessionId:body.sessionId,
			moderatorId:user.user_id,
		});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Deletes a message from an existing Q&A session
	 * @param request 
	 * @param response 
	 */
	private async deleteQnaMessage(request:FastifyRequest, response:FastifyReply) {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return;

		const body:any = request.query;
		if(!body.messageId
		|| !body.sessionId
		|| !body.ownerId) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"invalid parameters", errorCode:"INVALID_PARAMETERS"}));
			return
		}

		const channels = await TwitchUtils.getModeratedChannels(user.user_id, request.headers.authorization!);
		if(channels.findIndex(v=>v.broadcaster_id == body.ownerId) == -1 || !this.isUserPremium(body.ownerId)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"invalid parameters", errorCode:"INVALID_PARAMETERS_2"}));
			return
		}

		SSEController.sendToUser(body.ownerId, SSECode.QNA_ACTION, {
			action:"del_message",
			messageId:body.messageId,
			sessionId:body.sessionId,
			moderatorId:user.user_id,
		});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}
}