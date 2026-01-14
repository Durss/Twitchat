import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";
import SSEController from "./SSEController.js";
import Logger from "../utils/Logger.js";

/**
* Created : 10/06/2023 
*/
export default class TwitchExtensionController extends AbstractController {
	
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
		this.server.post('/api/twitch/extension/click', async (request, response) => await this.postClickEvent(request, response));
	}
	
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	public async postClickEvent(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const params = request.body as {
			px: number;
			py: number;
			alt: boolean;
			ctrl: boolean;
			shift: boolean;
		};
		
		try {
			const token = Utils.verifyTwitchExtensionJWT(request.headers.authorization);
			SSEController.sendToUser(token.channel_id, "TWITCHEXT_CLICK", {
				px: params.px,
				py: params.py,
				alt: params.alt,
				ctrl: params.ctrl,
				shift: params.shift,
				user_id: token.user_id,
			});
			response.header('Content-Type', 'application/json');
			response.status(200);
			response.send(JSON.stringify({success:true}));
		}catch(error) {
			Logger.error(error)
			response.header('Content-Type', 'application/json');
			response.status(401);
			response.send(JSON.stringify({success:false, message:'unauthorized'}));
		}

	}
}