import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";
import * as fs from "fs";

/**
* Created : 16/01/2026 
*/
export default class QuizController extends AbstractController {

	/**
	 * Stores streamers grid cache
	 * Key has the following format:
	 * "[uid]/[quizId]"
	 */
	private cachedBingoGrids:{[uidGridId:string]:IQuizCacheData} = {}
	
	constructor(public server:FastifyInstance) {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():QuizController {
		this.server.get('/api/quiz', async (request, response) => await this.getQuiz(request, response));

		return this;
	}

	public getStreamerQuizs(uid:string, quizId?:string):IQuizCacheData|null {
		//Validate UID and gridId to prevent path traversal
		if(!uid || !/^[0-9]+$/.test(uid) || !quizId || !/^[a-zA-Z0-9_-]+$/.test(quizId)) return

		const cacheKey = uid+"/"+quizId;
		let cache = this.cachedBingoGrids[cacheKey];
		if(!cache || Date.now() - cache.date > 5000) {
			//Get users' data
			const userFilePath = Config.USER_DATA_PATH + uid+".json";
			const found = fs.existsSync(userFilePath);
			if(found){
				const data = JSON.parse(fs.readFileSync(userFilePath, {encoding:"utf8"})) as {quizConfigs:{quizList:QuizParams[]}};
				cache = {
					date: Date.now(),
					ownerId: uid,
					data:quizId? [data.quizConfigs.quizList.find(quiz => quiz.id === quizId)] : data.quizConfigs.quizList,
				}
				this.cachedBingoGrids[cacheKey] = cache;
			}
		}
		return cache;
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
		
		//Validate UID and gridId to prevent path traversal
		if(!uid || !/^[0-9]+$/.test(uid) || !quizId || !/^[a-zA-Z0-9_-]+$/.test(quizId)) {
			response.header('Content-Type', 'application/json');
			response.status(400);
			response.send(JSON.stringify({success:false, error:"Invalid user ID or grid ID", errorCode:"INVALID_PARAMS"}));
			return;
		}

		const cache = this.getStreamerQuizs(uid, quizId);
		response.header('Content-Type', 'application/json');
		response.status(200);
		response.send(JSON.stringify({success:true, data:cache.data}));

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