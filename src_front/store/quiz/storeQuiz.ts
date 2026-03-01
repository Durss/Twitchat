import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import PublicAPI from '@/utils/PublicAPI';
import SSEHelper from '@/utils/SSEHelper';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IQuizActions, IQuizGetters, IQuizState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

let broadcastDebounceTO = -1;
export const storeQuiz = defineStore('quiz', {
	state: () => ({
		quizList: [],
		liveState: null,
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
				this.liveState = data.liveState ?? null;
			}else{
				this.quizList = [];
			}

			PublicAPI.instance.addEventListener("GET_QUIZ_CONFIGS", (e) => {
				this.broadcastQuizState(true);
			});

			SSEHelper.instance.addEventListener("TWITCHEXT_QUIZ_ANSWER", async (e)=> {
				const eventData = e.data
				if(!eventData) return;

				this.handleAnswer("twitch", eventData.quizId, eventData.questionId, eventData.answerId, eventData.answerText, eventData.userId, eventData.opaqueUserId);
			})
		},
		
		async saveData(quizId?:string):Promise<void> {
			const quiz = quizId ? this.quizList.find(q=>q.id === quizId) : undefined;
			
			// Are we saving a specifc quiz that's enabled?
			if(quiz?.enabled) {
				// Are we about to lose live quiz progress?
				if(quiz?.enabled && this.liveState && this.liveState.quizId !== quizId) {
					const t = StoreProxy.i18n.t;
					const activeQuiz = this.quizList.find(q=>q.id === this.liveState!.quizId);
					try {
						await StoreProxy.main.confirm(t("quiz.form.live_progress_warning.title"), t("quiz.form.live_progress_warning.description", { NAME: activeQuiz?.title }));
					}catch(error) {
						// User cancelled, disable the quiz
						quiz.enabled = false;
						return;
					}
					this.liveState = null;
				}
				
				// Disable all other quizzes
				this.quizList.forEach(q => {
					if(q.id === quizId) {
						q.enabled = q.enabled;
					}else{
						q.enabled = false;
					}
				})
			}
			const data:IStoreData = {
				quizList:this.quizList,
				liveState:this.liveState,
			};
			DataStore.set(DataStore.QUIZ_CONFIGS, data);
			this.broadcastQuizState();
		},

		addQuiz():TwitchatDataTypes.QuizParams {
			let data:TwitchatDataTypes.QuizParams = {
				id:Utils.getUUID(),
				enabled:this.quizList.length === 0,
				title:"",
				questionList:[],
				durationPerQuestion_s:20,
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
			clone.questionList.forEach(q => {
				q.id = Utils.getUUID();
				if(q.mode !== "freeAnswer") {
					q.answerList.forEach(a => {
						a.id = Utils.getUUID();
					});
				}
			});
			this.quizList.push(clone)
			this.saveData(clone.id);
			return clone;
		},

		async handleAnswer(platform:TwitchatDataTypes.ChatPlatform, quizId:string, questionId:string, answerId?:string, answerText?:string, userId?:string, opaqueUserId?:string):Promise<void> {
			const quiz = this.quizList.filter(q=>q.id === quizId)[0];
			if(!quiz) return;
			const question = quiz.questionList.filter(q=>q.id === questionId)[0];
			if(!question) return;
			const uid = userId || opaqueUserId;
			if(!uid) return;

			const POINTS_PER_QUESTION = 100;

			if(!this.liveState) {
				this.liveState = {
					quizId,
					questionVotes: {},
					users: {},
				}
			}

			// Check if user already voted for this question
			if(this.liveState.questionVotes[questionId]?.find(v=>v.uid === uid)) return;

			let score:number = 0;
			if(question.mode === "freeAnswer") {
				const tolerancePercent = Math.max(0, Math.min(5, question.toleranceLevel ?? quiz.toleranceLevel ?? 0)) / 5;
				// Max tolerance level accepts half of the answer to differ
				const levensteinTolerance = tolerancePercent * question.answer.length / 2;
				if(levensteinTolerance > 0) {
					if(Utils.levenshtein(answerText ?? "", question.answer) <= levensteinTolerance) {
						score = POINTS_PER_QUESTION;
					}else{
						score = -POINTS_PER_QUESTION;
					}
				}else{
					score = answerText === question.answer ? POINTS_PER_QUESTION : -POINTS_PER_QUESTION;
				}
			}else if(answerId) {
				const answer = question.answerList.filter(a=>a.id === answerId)[0];
				if(Utils.isClassicQuizAnswer(question.mode, answer)) {
					score = answer.correct? POINTS_PER_QUESTION : -POINTS_PER_QUESTION;
				}else{
					// TODO: for majority quiz we can only get score once everyone has voted.
				}
				this.liveState.questionVotes[question.id] = this.liveState.questionVotes[question.id] || [];
				this.liveState.questionVotes[question.id]!.push({uid, answer: answerId});
			}
			// Apply speed multiplicator if any
			const questionDuration = (question.duration_s ?? quiz.durationPerQuestion_s) * 1000;
			let speedMult = quiz.timeBasedScoring ? (Date.now() - new Date(quiz.questionStarted_at).getTime())/questionDuration : 1;
			score *= speedMult;
			// Avoid loosing points if the quiz isn't configured for it
			if(score <= 0 && !quiz.loosePointsOnFail) {
				score = 0;
			}

			// Get or create user data
			let userData = this.liveState.users[uid];
			if(!userData) {
				let name:string = "";
				let avatarPath:string|undefined = undefined;
				if(userId) {
					// User isn't anonymous, grab their name from the Twitch API
					const user = await new Promise<TwitchatDataTypes.TwitchatUser>(resolve => {
						StoreProxy.users.getUserFrom(
							"twitch",
							StoreProxy.auth.twitch.user.id, userId,
							undefined,
							undefined,
							(user)=> resolve(user)
						);
					})
					name = user?.displayNameOriginal ?? "";
					avatarPath = user?.avatarPath ?? "";
					if(!name) name = "#" + userId;
				}else{
					// User is anonymous, get random name
					name = Utils.getNameFromOpaqueId(uid);
				}
				userData = this.liveState.users[uid] = {
					platform,
					name,
					avatarPath,
					score: 0,
					isAnonymous: !!opaqueUserId && !userId,
				}
			}

			userData.score += score
			this.saveData(quizId);
		},

		startNextQuestion(quizId:string):void {
			const quiz = this.quizList.find(v=>v.id === quizId);
			if(!quiz) return
			delete quiz.currentQuestionRevealed;
			delete quiz.currentQuestionStats;
			quiz.questionStarted_at = new Date().toISOString();
			const index = quiz.questionList.findIndex(q=>q.id === quiz.currentQuestionId);
			if(index < quiz.questionList.length - 1) {
				quiz.currentQuestionId = quiz.questionList[index + 1]!.id;
			}else{
				quiz.currentQuestionId = "";
				quiz.currentQuestionId = quiz.questionList[0]?.id ?? "";//TODO: remove this. Only here for testing to loop back to 1st question
				//TODO: quiz ended, do whatever needs to be done at that moment
			}
			this.saveData();
		},

		resetQuizState(quizId:string):void {
			StoreProxy.main.confirm(StoreProxy.i18n.t("quiz.state.reset_confirm.title"), StoreProxy.i18n.t("quiz.state.reset_confirm.description"))
			.then(()=>{
				const quiz = this.quizList.find(v=>v.id === quizId);
				if(!quiz) return
				quiz.currentQuestionId = "";
				delete quiz.currentQuestionRevealed;
				delete quiz.currentQuestionStats;
				quiz.quizStarted_at = new Date(0).toISOString();
				quiz.questionStarted_at = new Date(0).toISOString()
				if(this.liveState?.quizId == quizId) this.liveState = null;
				this.saveData();
			}).catch(()=>{})
		},

		revealAnswer(quizId:string):void {
			const quiz = this.quizList.find(v=>v.id === quizId);
			if(!quiz) return
			quiz.questionStarted_at = new Date(0).toISOString();
			quiz.currentQuestionRevealed = true;
			quiz.currentQuestionStats = this.computeQuestionStats(quizId, quiz.currentQuestionId);
			this.saveData(quizId);
		},

		async showLeaderBoard(quizId:string):Promise<void> {
			const quiz = this.quizList.find(v=>v.id === quizId);
			if(!quiz) return
			PublicAPI.instance.broadcast("ON_QUIZ_LEADERBOARD", {leaderboard: this.liveState?.users ?? {}});
		},

		broadcastQuizState(overlayOnly?:boolean):void {
			const quiz = this.quizList.find(v=>v.enabled);
			
			const i18n = {
				mode_classic: StoreProxy.i18n.t("quiz.form.mode_classic.title"),
				mode_majority: StoreProxy.i18n.t("quiz.form.mode_majority.title"),
				mode_freeAnswer: StoreProxy.i18n.t("quiz.form.mode_freeAnswer.title"),
			};
			PublicAPI.instance.broadcast("ON_QUIZ_STATE", {quiz, i18n});
			if(overlayOnly) return;
			
			// Debounce server broadcast
			window.clearTimeout(broadcastDebounceTO);
			broadcastDebounceTO = window.setTimeout(()=>{
				ApiHelper.call("quiz/broadcast", "PUT", {
					quiz,
				});
			}, 1500);
		},

		computeQuestionStats(quizId:string, questionId:string): NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]> {
			const quiz = this.quizList.find(v=>v.id === quizId);
			const question = quiz?.questionList.find(q=>q.id === questionId);
			if(question?.mode === "freeAnswer") return {};
			if(!quiz || !question) return {};
			const votes = this.liveState?.questionVotes[question.id];
			if(!votes || votes.length === 0) return question.answerList.reduce((acc, a) => {
				acc[a.id] = {globalPercent: 0, relativePercent: 0, voteCount: 0};
				return acc;
			}, {} as NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]>);

			const maxVotes = question.answerList.reduce((max, a) => {
				const count = votes.filter(v=>v.answer == a.id).length;
				return count > max ? count : max;
			}, 0);
			return question.answerList.reduce((acc, a) => {
				acc[a.id] = {
					globalPercent: Math.round((votes.filter(v=>v.answer == a.id).length / votes.length)*1000)/1000,
					relativePercent: Math.round((votes.filter(v=>v.answer == a.id).length / maxVotes)*1000)/1000,
					voteCount: votes.filter(v=>v.answer == a.id).length
				};
				return acc;
			}, {} as NonNullable<TwitchatDataTypes.QuizParams["currentQuestionStats"]>);
		}
		
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
	quizList: TwitchatDataTypes.QuizParams[];
	liveState: TwitchatDataTypes.QuizState | null;
}