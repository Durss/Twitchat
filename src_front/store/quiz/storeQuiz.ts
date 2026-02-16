import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import SSEHelper from '@/utils/SSEHelper';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IQuizActions, IQuizGetters, IQuizState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

export const storeQuiz = defineStore('quiz', {
	state: () => ({
		quizList: [],
		liveStates: {},
	} as IQuizState),



	getters: {
	} as IQuizGetters
	& ThisType<UnwrapRef<IQuizState> & _StoreWithGetters<IQuizGetters> & PiniaCustomProperties>
	& _GettersTree<IQuizState>,



	actions: {
		async populateData():Promise<void> {
			const json = DataStore.get(DataStore.QUIZ_CONFIGS);
			if(json) {
				const data = JSON.parse(json) as IStoreData;
				this.quizList = data.quizList ?? [];
			}else{
				this.quizList = [];
			}

			PublicAPI.instance.addEventListener("GET_QUIZ_CONFIGS", (e) => {
				const quiz = this.quizList.find(v=>v.id === e.data.quizId);
				if(quiz) {
					PublicAPI.instance.broadcast("ON_QUIZ_CONFIGS", quiz);
				}
			});

			SSEHelper.instance.addEventListener("TWITCHEXT_QUIZ_ANSWER", async (e)=> {
				const eventData = e.data
				if(!eventData) return;

				this.handleAnswer(eventData.quizId, eventData.questionId, eventData.answerId, eventData.answerText, eventData.userId, eventData.opaqueUserId);
			})
		},

		addQuiz(mode: TwitchatDataTypes.QuizParams["mode"]):TwitchatDataTypes.QuizParams {
			let data:TwitchatDataTypes.QuizParams = {
				id:Utils.getUUID(),
				enabled:true,
				title:"",
				mode,
				questionList:[],
				durationPerQuestion_s:30,
				loosePointsOnFail:false,
				timeBasedScoring:false,
				currentQuestionId:"",
				quizStarted_at:"",
				questionStarted_at:"",
			};
			this.quizList.push(data);
			this.saveData(data.id);
			return data;
		},
		
		removeQuiz(id:string):void{
			const t = StoreProxy.i18n.t;
			StoreProxy.main.confirm(t("quiz.form.delete_confirm.title"), t("quiz.form.delete_confirm.description"))
			.then(()=>{
				this.quizList = this.quizList.filter(g => g.id !== id);
				this.saveData();
			}).catch(()=>{})
		},
		
		duplicateQuiz(id:string):TwitchatDataTypes.QuizParams | undefined {
			const source = this.quizList.find(g => g.id === id);
			if(!source) return;
			const clone = JSON.parse(JSON.stringify(source)) as typeof source;
			clone.id = Utils.getUUID();
			function isFreeAnswerQuestion(mode: TwitchatDataTypes.QuizParams["mode"], _question: any): _question is TwitchatDataTypes.QuizParams<"freeAnswer">["questionList"][number] {
				return mode === "freeAnswer";
			}
			clone.questionList.forEach(q => {
				q.id = Utils.getUUID();
				if(!isFreeAnswerQuestion(clone.mode, q)) {
					q.answerList.forEach(a => {
						a.id = Utils.getUUID();
					});
				}
			});
			this.quizList.push(clone)
			this.saveData(clone.id);
			return clone;
		},
		
		saveData(quizId?:string):void {
			const data:IStoreData = {
				quizList:this.quizList,
			};
			DataStore.set(DataStore.QUIZ_CONFIGS, data);
			if(quizId){
				const quiz = this.quizList.filter(q=>q.id===quizId)[0];
				if(quiz) PublicAPI.instance.broadcast("ON_QUIZ_CONFIGS", quiz);
			}else{
				for (const quiz of this.quizList) {
					PublicAPI.instance.broadcast("ON_QUIZ_CONFIGS", quiz);
				}
			}
		},

		async handleAnswer(quizId:string, questionId:string, answerId?:string, answerText?:string, userId?:string, opaqueUserId?:string):Promise<void> {
			const quiz = this.quizList.filter(q=>q.id === quizId)[0];
			if(!quiz) return;
			const question = quiz.questionList.filter(q=>q.id === questionId)[0];
			if(!question) return;
			const uid = userId || opaqueUserId;
			if(!uid) return;

			let data = this.liveStates[quizId];
			if(!data) {
				data = this.liveStates[quizId] = {
					questionVotes: {},
					users: {},
				}
			}

			let score:number = 0;
			if(Utils.isFreeAnswerQuestion(quiz.mode, question)) {
				const tolerancePercent = Math.max(0, Math.min(5, question.toleranceLevel ?? quiz.toleranceLevel ?? 0)) / 5;
				// Max tolerance level accepts half of the answer to differ
				const levensteinTolerance = tolerancePercent * question.answer.length / 2;
				if(levensteinTolerance > 0) {
					if(Utils.levenshtein(answerText ?? "", question.answer) <= levensteinTolerance) {
						score = 1;
					}else{
						score = -1;
					}
				}else{
					score = answerText === question.answer ? 1 : -1;
				}
			}else if(answerId) {
				const answer = question.answerList.filter(a=>a.id === answerId)[0];
				if(answer && Utils.isClassicQuizAnswer(quiz.mode, answer) && answer.correct) {
					score = 1;
				}else{
					// for majority quiz we can only get score once everyone has voted.
					data.questionVotes[question.id] = data.questionVotes[question.id] || [];
					data.questionVotes[question.id]!.push({uid, answer: answerId});
				}
			}
			// Apply speed multiplicator if any
			let speedMult = quiz.timeBasedScoring ? Date.now() - new Date(quiz.questionStarted_at).getTime() : 1;
			score *= speedMult;
			// Avoid loosing points if the quiz isn't configured for it
			if(score <= 0 && !quiz.loosePointsOnFail) {
				score = 0;
			}

			let userData = data.users[uid];
			if(!userData) {
				let name = "";
				if(userId) {
					// User isn't anonymous, grab their name from the Twitch API
					name = await new Promise(resolve => {
						StoreProxy.users.getUserFrom(
							"twitch",
							StoreProxy.auth.twitch.user.id, userId,
							undefined,
							undefined,
							(user)=> resolve(user.displayNameOriginal)
						);
					})
					if(!name) name = "#" + userId;
				}else{
					// User is anonymous, get random name
					name = Utils.getNameFromOpaqueId(uid);
				}
				userData = data.users[uid] = {
					name,
					score: 0,
				}
			}

			userData.score += score
		},

		startNextQuestion(quizId:string):void {
			const quiz = this.quizList.find(v=>v.id === quizId);
			if(!quiz) return
			quiz.questionStarted_at = new Date().toISOString();
			const index = quiz.questionList.findIndex(q=>q.id === quiz.currentQuestionId);
			if(index < quiz.questionList.length - 1) {
				quiz.currentQuestionId = quiz.questionList[index + 1]!.id;
			}else{
				quiz.currentQuestionId = "";
				quiz.currentQuestionId = quiz.questionList[0]?.id ?? "";//TODO: remove this, only for testing
				//TODO: quiz ended, do whatever needs to be done at that moment
			}
			PublicAPI.instance.broadcast("ON_QUIZ_CONFIGS", quiz);
		},

		revealAnswer(quizId:string):void {
			const quiz = this.quizList.find(v=>v.id === quizId);
			if(!quiz) return
			const votes: {[answerId:string]: number} = {};
			const liveData = this.liveStates[quizId];
			if(liveData) {
				const question = quiz.questionList.find(q=>q.id === quiz.currentQuestionId);
				if(question && !Utils.isFreeAnswerQuestion(quiz.mode, question)) {
					question.answerList.forEach(a => {
						votes[a.id] = 0;
					});
					const answers = liveData.questionVotes[question.id] || [];
					for (const answer of answers) {
						votes[answer.answer]! ++;
					}
				}
			}
			PublicAPI.instance.broadcast("ON_QUIZ_REVEAL_ANSWER", {quizId, votes});
		},
		
	} as IQuizActions
	& ThisType<IQuizActions
		& UnwrapRef<IQuizState>
		& _StoreWithState<"quiz", IQuizState, IQuizGetters, IQuizActions>
		& _StoreWithGetters<IQuizGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeQuiz, import.meta.hot))
}

interface IStoreData {
	quizList:TwitchatDataTypes.QuizParams[];
}