import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";
import SSEController from "./SSEController.js";
import Logger from "../utils/Logger.js";
import { createHash } from "node:crypto";
import Config from "../utils/Config.js";
import BingoGridController from "./BingoGridController.js";
import QuizController from "./QuizController.js";

/**
 * The extension code itself isn't part of this repository.
 * At this time, the extension code is part of a dedicated private repository.
 * Not sure yet if it will be made public later.
 * 
 * This controller handles API requests made by the "Twichat Companion" Twitch Extension.
 * 
* Created : 10/06/2023 
*/
export default class TwitchExtensionController extends AbstractController {

	private _bingoController!:BingoGridController;
	private _quizController!:QuizController;
	
	constructor(public server:FastifyInstance) {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async initialize(bingoController:BingoGridController, quizController:QuizController):Promise<void> {
		this._bingoController = bingoController;
		this._quizController = quizController;
		this.server.decorateRequest('twitchExtensionUser', null);
		this.server.get('/api/twitch/extension/streamerstate', { preHandler: this.authHook.bind(this) }, async (request, response) => await this.getStreamerState(request, response));
		this.server.get('/api/twitch/extension/bingo', { preHandler: this.authHook.bind(this) }, async (request, response) => await this.getBingoGrids(request, response));
		this.server.post('/api/twitch/extension/click', { preHandler: this.authHook.bind(this) }, async (request, response) => await this.postClickEvent(request, response));
	}
	
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Verify signature of Twitchat API call
	 * @param request 
	 * @param reply 
	 * @returns 
	 */
	private async authHook (request: FastifyRequest, reply: FastifyReply): Promise<void> {
		const headerToken = request.headers.authorization!;
		const headerHash = request.headers['x-twitchat-verify'];
		const hash = createHash('sha512')
			.update(Config.credentials.twitchat_api_secret + ':' + headerToken)
			.digest('hex');

		if (hash !== headerHash) {
			reply.status(401).send({ error: 'Invalid request signature' });
			return;
		}

		request.twitchExtensionUser = Utils.verifyTwitchExtensionJWT(headerToken);
	}

	/**
	 * Receive a click event from extension
	 * @param request 
	 * @param response 
	 */
	private async postClickEvent(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const params = request.body as {
			px: number;
			py: number;
			alt: boolean;
			ctrl: boolean;
			shift: boolean;
		};
		
		try {
			SSEController.sendToUser(request.twitchExtensionUser!.channel_id, "TWITCHEXT_CLICK", {
				px: params.px,
				py: params.py,
				alt: params.alt,
				ctrl: params.ctrl,
				shift: params.shift,
				user_id: request.twitchExtensionUser!.user_id,
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

	/**
	 * Request bingo grids from streamer
	 * @param request 
	 * @param response 
	 */
	private async getBingoGrids(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const info = await this._bingoController.getStreamerGrid(request.twitchExtensionUser!.channel_id);
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, user:info ? {id:info.ownerId, login:info.ownerName} : null, gridList: info ? info.data : []}));
	}

	/**
	 * Request a streamer's state
	 * @param request 
	 * @param response 
	 */
	private async getStreamerState(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const bingos = await this._bingoController.getStreamerGrid(request.twitchExtensionUser!.channel_id);
		const quizs = await this._quizController.getStreamerQuizs(request.twitchExtensionUser!.channel_id);
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, bingos, quizs}));
	}
}