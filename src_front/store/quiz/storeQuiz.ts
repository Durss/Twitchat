import DataStore from '@/store/DataStore';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IQuizActions, IQuizGetters, IQuizState } from '../StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import StoreProxy from '../StoreProxy';
import PublicAPI from '@/utils/PublicAPI';

export const storeQuiz = defineStore('quiz', {
	state: () => ({
		quizList: [],
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