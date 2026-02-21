import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { LRUCache } from "lru-cache";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import * as fs from "fs";
import TwitchExtensionController from "./TwitchExtensionController.js";

/**
* Created : 16/01/2026 
*/
export default class QuizController extends AbstractController {

	/**
	 * LRU cache for streamer quizzes with automatic eviction
	 * Key format: "[uid]/[quizId]"
	 */
	private cachedQuizzes = new LRUCache<string, QuizParams>({
		max: 10000,
		ttl: 1000 * 60 * 5, // 5 minutes TTL
	});

	private extensionController!:TwitchExtensionController;
	
	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/

	public setTwitchExtensionController(controller:TwitchExtensionController):void {
		this.extensionController = controller;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():QuizController {
		this.server.get('/api/quiz', async (request, response) => await this.getQuiz(request, response));
		this.server.put('/api/quiz/broadcast', async (request, response) => await this.putBroadcastQuiz(request, response));

		return this;
	}

	/**
	 * Get quizs for a streamer, optionally filtered by quizId
	 * @param uid Streamer UID
	 * @param quizId Optional quiz ID to filter by
	 * @returns Quiz cache data or null if not found
	 */
	public getStreamerQuiz(uid:string, quizId?:string):QuizParams|undefined {
		//Validate UID and quizId (if provided) to prevent path traversal
		if(!uid || !/^[0-9]+$/.test(uid)) return undefined;
		if(quizId && !/^[a-zA-Z0-9_-]+$/.test(quizId)) return undefined;

		// Check LRU cache first
		if(this.cachedQuizzes.has(uid)) return this.cachedQuizzes.get(uid);
		
		// No cache found, load user data from disk and generate cache
		const userFilePath = Config.USER_DATA_PATH + uid+".json";
		const found = fs.existsSync(userFilePath);
		if(found){
			const data = JSON.parse(fs.readFileSync(userFilePath, {encoding:"utf8"})) as {quizConfigs:{quizList:QuizParams[]}};
			// Get requested quiz (must be enabled) or first enabled one if no quizId provided
			const quiz = data.quizConfigs.quizList.find(q => q.enabled && (!quizId || q.id === quizId));
			return this.setCache(uid, quiz);
		}

		return this.setCache(uid, undefined);
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Get a quiz definition
	 */
	private async getQuiz(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response);
		if(!user) return;
		const uid:string = user.user_id;
		const quizId:string = (request.query as any).quizid;
		
		const quiz = this.getStreamerQuiz(uid, quizId);
		if(!quiz) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"Quiz not found", errorCode:"QUIZ_NOT_FOUND"}));
			return;
		}
		
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:quiz}));

		return;
	}

	/**
	 * Saves given quiz to cache and tell all extension viewers it's been updated 
	 * @param request 
	 * @param response 
	 */
	private async putBroadcastQuiz(request:FastifyRequest, response:FastifyReply) {
		const user = await super.twitchUserGuard(request, response);
		if(!user) return;
		const quiz:QuizParams = (request.body as any).quiz;
		const uid:string = user.user_id;
		const quizId = quiz.id;
		
		// Validate UID and quizId
		if(!uid || !/^[0-9]+$/.test(uid) || !quizId || !/^[a-zA-Z0-9_-]+$/.test(quizId)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"Invalid UID or quiz ID", errorCode:"INVALID_PARAMS"}));
			return;
		}
		
		this.setCache(uid, quiz);
		
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true}));
	}

	/**
	 * Updates quiz cache and broadcast it to extension viewers
	 */
	private setCache(uid:string, quiz?:QuizParams):QuizParams|undefined {
		if(quiz) {
			// Don't include correct answers in the cached quiz to prevent cheating by inspecting network traffic
			if(quiz.mode == "classic") {
				quiz.questionList.forEach(question => {
					question.answerList.forEach(answer => {
						// Don't delete correct answer if question is currently revealed
						if(quiz.currentQuestionRevealed && quiz.currentQuestionId === question.id) return;
						delete answer.correct;
					});
				});
			}else 
			if(quiz.mode == "freeAnswer") {
				quiz.questionList.forEach(question => {
					// Don't delete correct answer if question is currently revealed
					if(quiz.currentQuestionRevealed && quiz.currentQuestionId === question.id) return;
					delete question.answer
				});
			}
		}
		this.cachedQuizzes.set(uid, quiz);
		this.extensionController.notifyStateUpdate(uid);

		return quiz;
	}
}


export type QuizParams<Mode = "classic" | "majority" | "freeAnswer"> = {
		/**
	 * Quiz ID
	 */
	id:string;
	/**
	 * Quiz title
	 */
	title:string
	/**
	 * Quiz mode.
	 */
	mode:Mode;
	/**
	 * Number of seconds to answer
	 */
	durationPerQuestion_s:number;
	/**
	 * If true, users that answer wrong will loose points
	 */
	loosePointsOnFail:boolean;
	/**
	 * If true, the faster the answer, the more points earned
	 */
	timeBasedScoring:boolean;
	/**
	 * Is the quiz enabled ?
	 * Can be false after user stops being premium and is required to disable
	 * entries if they have more than the maximum allowed
	 */
	enabled:boolean;
	/**
	 * UTC date at which the quiz started
	 */
	quizStarted_at:string;
	/**
	 * UTC date at which the current question started
	 */
	questionStarted_at:string;
	/**
	 * Current question ID
	 */
	currentQuestionId:string;
	/**
	 * Is the current question revealed to users?
	 */
	currentQuestionRevealed?:boolean;
	/**
	 * Votes for the current question.
	 */
	currentQuestionVotes?:{[answerId:string]:number};
	/**
	 * Orthographic tolerance for answer matching in "freeAnswer" mode.
	 * 0 = exact match
	 * ...
	 * 5 = very tolerant
	 */
	toleranceLevel?:0|1|2|3|4|5;
} & ({
	/**
	 * Quiz mode.
	 * classic: earn points by answering questions correctly
	 */
	mode:"classic";
	/**
	 * List of questions
	 */
	questionList: {
		/**
		 * Question ID
		 */
		id:string;
		/**
		 * Question text
		 */
		question:string;
		/**
		 * Nuber of seconds to answer this question (overrides durationPerQuestion_s)
		 */
		duration_s?:number;
		/**
		 * Possible answers for this question
		 */
		answerList:{
			/**
			 * Answer ID
			 */
			id:string;
			/**
			 * Answer text
			 */
			title:string;
			/**
			 * Is this the answer correct ?
			 */
			correct?:boolean;
		}[];
	}[];
} | {
	/**
	 * Quiz mode.
	 * majority: earn points by being part of the most popular answer
	 */
	mode:"majority";
	/**
	 * List of questions
	 */
	questionList: {
		/**
		 * Question ID
		 */
		id:string;
		/**
		 * Question text
		 */
		question:string;
		/**
		 * Nuber of seconds to answer this question (overrides durationPerQuestion_s)
		 */
		duration_s?:number
		/**
		 * Possible answers for this question
		 */
		answerList:{
			/**
			 * Answer ID
			 */
			id:string;
			/**
			 * Answer text
			 */
			title:string;
		}[];
	}[];
} | {
	/**
	 * Quiz mode.
	 * freeAnswer: viewers must type the answer on chat or extension
	 */
	mode:"freeAnswer";
	/**
	 * List of questions
	 */
	questionList: {
		/**
		 * Question ID
		 */
		id:string;
		/**
		 * Question text
		 */
		question:string;
		/**
		 * Expected answer
		 */
		answer?:string
		/**
		 * Number of seconds to answer this question (overrides durationPerQuestion_s)
		 */
		duration_s?:number
		/**
		 * Orthographic tolerance for answer matching in "freeAnswer" mode.
		 * Overrides the global quiz tolerance level.
		 * 0 = exact match
		 * ...
		 * 5 = very tolerant
		 */
		toleranceLevel?:0|1|2|3|4|5;
	}[];
})
