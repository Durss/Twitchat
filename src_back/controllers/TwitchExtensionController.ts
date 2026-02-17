import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import Utils from "../utils/Utils.js";
import AbstractController from "./AbstractController.js";
import SSEController from "./SSEController.js";
import Logger from "../utils/Logger.js";
import { createHash } from "node:crypto";
import Config from "../utils/Config.js";
import BingoGridController from "./BingoGridController.js";
import QuizController from "./QuizController.js";
import fetch from "node-fetch";

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
	public initialize(bingoController:BingoGridController, quizController:QuizController):TwitchExtensionController {
		this._bingoController = bingoController;
		this._quizController = quizController;
		this.server.decorateRequest('twitchExtensionUser', null);
		this.server.get('/api/twitch/extension/streamerstate', { preHandler: this.authHook.bind(this) }, async (request, response) => await this.getStreamerState(request, response));
		this.server.post('/api/twitch/extension/click', { preHandler: this.authHook.bind(this) }, async (request, response) => await this.postClickEvent(request, response));
		this.server.post('/api/twitch/extension/bingoCount', { preHandler: this.authHook.bind(this) }, async (request, response) => await this.postBingoCount(request, response));
		this.server.post('/api/twitch/extension/quiz/answer', { preHandler: this.authHook.bind(this) }, async (request, response) => await this.postQuizAnswer(request, response));
		return this;
	}

	/**
	 * Notify all clients of a streamer that extension state has been updated
	 * @param channelId 
	 */
	public async notifyStateUpdate(channelId:string):Promise<void> {
		const url = Config.credentials.twitchat_api_path + "twitchat/stateUpdate";
		const hash = createHash('sha512')
			.update(Config.credentials.twitchat_api_secret + ':' + channelId)
			.digest('hex');
		console.log("Notify state update to Twitchat API for channel "+channelId);
		const res = await fetch(url, {
			method: 'POST',
			headers:{
				'Content-Type': 'application/json',
				'x-twitchat-verify': hash,
			},
			body: JSON.stringify({
				channelId,
			}),
		});
		console.log("Twitchat API response:", res.status, await res.text());
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
				userId: request.twitchExtensionUser!.user_id,
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
	 * Receive a bingo count event from extension
	 * @param request 
	 * @param response 
	 */
	private async postBingoCount(request:FastifyRequest, response:FastifyReply):Promise<void> {
		// Reject anonymous users
		if(!request.twitchExtensionUser!.user_id) return;

		const params = request.body as {
			count:number;
			gridId:string;
		};
		
		try {
			this._bingoController.setBingoCount(
				request.twitchExtensionUser!.channel_id,
				request.twitchExtensionUser!.user_id,
				params.gridId,
				params.count
			);
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
	 * Receive a quiz answer
	 * @param request 
	 * @param response 
	 */
	private async postQuizAnswer(request:FastifyRequest, response:FastifyReply):Promise<void> {
		// Reject anonymous users
		// if(!request.twitchExtensionUser!.user_id) return;

		const params = request.body as {
			quizId: string;
			questionId: string;
			answerId: string;
			answerText?: string;
			speed?: string;
		};
		
		try {
			SSEController.sendToUser(request.twitchExtensionUser!.channel_id, "TWITCHEXT_QUIZ_ANSWER", {
				quizId: params.quizId,
				questionId: params.questionId,
				answerId: params.answerId,
				answerText: params.answerText,
				userId: request.twitchExtensionUser!.user_id,
				opaqueUserId: request.twitchExtensionUser!.opaque_user_id,
			})
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
	 * Request a streamer's state
	 * @param request 
	 * @param response 
	 */
	private async getStreamerState(request:FastifyRequest, response:FastifyReply):Promise<void> {
		const streamerId = request.twitchExtensionUser!.channel_id;
		const viewerId = request.twitchExtensionUser!.user_id;
		const bingos = await this._bingoController.getViewerGridList(streamerId, viewerId);
		const quizs = await this._quizController.getStreamerQuizs(streamerId);
		
		if(quizs) {
			// Strip out correct answers from quizs
			quizs.data.forEach(quiz => {
				if(quiz.mode == "classic") {
					quiz.questionList.forEach(question => {
						question.answerList.forEach(answer => {
							delete answer.correct;
						});
					});
				}else 
				if(quiz.mode == "freeAnswer") {
					quiz.questionList.forEach(question => {
						delete question.answer
					});
				}
			});
		}

		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:{bingos, quizs:quizs?.data}}));
	}

}