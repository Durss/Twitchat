import DataStore from '@/store/DataStore';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IQuizActions, IQuizGetters, IQuizState } from '../StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';

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
			}
		},

		
		async saveConfigs():Promise<void> {
			const data:IStoreData = {
				quizList:[],
			};
			DataStore.set(DataStore.QUIZ_CONFIGS, data);
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