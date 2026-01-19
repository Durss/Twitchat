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
		this.server.post('/api/mod/privateMessage', async (request, response) => await this.postPrivateMessage(request, response));
		this.server.put('/api/mod/qna/message', async (request, response) => await this.putQnaMessage(request, response));
		this.server.put('/api/mod/spoil/message', async (request, response) => await this.putSpoilMessage(request, response));
		this.server.put('/api/mod/privateMessage', async (request, response) => await this.putPrivateMessage(request, response));
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
		for(const channel of channels) {
			if(await this.getUserPremiumState(channel.broadcaster_id) == "no") return;
			SSEController.sendToUser(channel.broadcaster_id, SSECode.SHARED_MOD_INFO_REQUEST);
		}

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
	 * Sends a private message to given mod
	 * @param request
	 * @param response
	 */
	private async postPrivateMessage(request:FastifyRequest, response:FastifyReply) {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return;

		const body:any = request.body;
		if(!body.to_uid
		|| !body.message
		|| !body.messageId
		|| !body.action) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"invalid parameters", errorCode:"INVALID_PARAMETERS"}));
			return
		}

		//Check if target user is one of our mods
		const moderators = await TwitchUtils.getModerators(user.user_id, request.headers.authorization!);
		if(user.user_id !== body.to_uid && moderators.findIndex(v=>v.user_id == body.to_uid) == -1) {
			//Check if user is a mod on the given channel
			const moderated = await TwitchUtils.getModeratedChannels(user.user_id, request.headers.authorization!);
			if(moderated.findIndex(v=>v.broadcaster_id == body.to_uid) == -1) {
				response.header('Content-Type', 'application/json');
				response.status(400);
				response.send(JSON.stringify({success:false, error:"cannot send private message", errorCode:"NOT_MODERATOR"}));
				return
			}
		}

		const message = {
			action: body.action,
			message: body.message,
			from_uid: user.user_id,
			from_login: user.login,
			messageId: body.messageId,
			messageIdParent: body.messageParentId,
			messageParentFallback: body.messageParentFallback,
		};
		SSEController.sendToUser(body.to_uid, SSECode.PRIVATE_MOD_MESSAGE, message);

		if(body.action == "dm_mods") {
			moderators.forEach(mod => {
				SSEController.sendToUser(mod.user_id, SSECode.PRIVATE_MOD_MESSAGE, message);
			})
		}

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

		//Make sure user is a mod and broadcaster is premium
		const channels = await TwitchUtils.getModeratedChannels(user.user_id, request.headers.authorization!);
		if(channels.findIndex(v=>v.broadcaster_id == body.ownerId) == -1 || await this.getUserPremiumState(body.ownerId) === "no") {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"cannot remotely add a message to a private Q&A session", errorCode:"PRIVATE_QNA_SESSION"}));
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
	 * Called when a mod requests to flag a message as a spoiler
	 * @param request
	 * @param response
	 * @returns
	 */
	private async putSpoilMessage(request:FastifyRequest, response:FastifyReply) {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return;

		const body:any = request.body;
		if(!body.messageId || !body.ownerId) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"invalid parameters", errorCode:"INVALID_PARAMETERS"}));
			return
		}

		//Make sure user is a mod
		const channels = await TwitchUtils.getModeratedChannels(user.user_id, request.headers.authorization!);
		if(channels.findIndex(v=>v.broadcaster_id == body.ownerId) == -1
		// || this.getUserPremiumState(body.ownerId) === "no"
		) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"you are not allowed to remotely spoil messages on this channel", errorCode:"SPOIL_NOT_ALLOWED"}));
			return
		}

		SSEController.sendToUser(body.ownerId, SSECode.SPOIL_MESSAGE, {
			messageId:body.messageId,
			moderatorId:user.user_id,
		});

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Called when answering a moderator's question sent in private
	 * @param request
	 * @param response
	 * @returns
	 */
	private async putPrivateMessage(request:FastifyRequest, response:FastifyReply) {
		const user = await this.twitchUserGuard(request, response);
		if(!user) return;

		const body:any = request.body;
		if(!body.messageId || typeof body.answer != "boolean") {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"invalid parameters", errorCode:"INVALID_PARAMETERS"}));
			return
		}

		//Send info to all mods
		const moderators = await TwitchUtils.getModerators(user.user_id, request.headers.authorization!);
		moderators.forEach(mod => {
			SSEController.sendToUser(mod.user_id, SSECode.PRIVATE_MOD_MESSAGE_ANSWER, {
				messageId:body.messageId,
				answer:body.answer === true,
			});
		})


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
		if(channels.findIndex(v=>v.broadcaster_id == body.ownerId) == -1 || await this.getUserPremiumState(body.ownerId) === "no") {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"invalid parameters", errorCode:"INVALID_PARAMETERS"}));
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
