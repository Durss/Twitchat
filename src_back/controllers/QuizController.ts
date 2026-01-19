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
	private cachedQuizzes = new LRUCache<string, IQuizCacheData>({
		max: 500,
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

		return this;
	}

	public getStreamerQuizs(uid:string, quizId?:string):IQuizCacheData|null {
		//Validate UID and quizId to prevent path traversal
		if(!uid || !/^[0-9]+$/.test(uid) || !quizId || !/^[a-zA-Z0-9_-]+$/.test(quizId)) return null

		const cacheKey = uid+"/"+quizId;
		
		// Check LRU cache first
		let cache = this.cachedQuizzes.get(cacheKey);
		if(cache) return cache;
		
		// Cache miss - load from disk
		const userFilePath = Config.USER_DATA_PATH + uid+".json";
		const found = fs.existsSync(userFilePath);
		if(found){
			const data = JSON.parse(fs.readFileSync(userFilePath, {encoding:"utf8"})) as {quizConfigs:{quizList:QuizParams[]}};
			cache = {
				date: Date.now(),
				ownerId: uid,
				data:quizId? [data.quizConfigs.quizList.find(quiz => quiz.id === quizId)!] : data.quizConfigs.quizList,
			}
			this.cachedQuizzes.set(cacheKey, cache);
			return cache;
		}
		
		return null;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Get a quiz definition
	 */
	private async getQuiz(request:FastifyRequest, response:FastifyReply) {
		const uid:string = (request.query as any).uid;
		const quizId:string = (request.query as any).quizid;
		
		const quiz = this.getStreamerQuizs(uid, quizId);
		if(!quiz) {
			response.header('Content-Type', 'application/json');
			response.status(404);
			response.send(JSON.stringify({success:false, error:"Quiz not found", errorCode:"QUIZ_NOT_FOUND"}));
			return;
		}
		
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:quiz.data}));

		return;
	}
}

interface IQuizCacheData {
	date:number;
	ownerId:string;
	data:QuizParams[];
}


type QuizParams<Mode = "classic" | "majority"> = {
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
	 * Current question ID
	 */
	currentQuestionId:string;
	/**
	 * UTC date at which the quiz started
	 */
	quizStarted_at:string;
	/**
	 * UTC date at which the current question started
	 */
	questionStarted_at:string;
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
})