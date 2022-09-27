import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IPredictionActions, type IPredictionGetters, type IPredictionState } from '../StoreProxy';

export const storePrediction = defineStore('prediction', {
	state: () => ({
		data: null,
	} as IPredictionState),



	getters: {
	} as IPredictionGetters
	& ThisType<UnwrapRef<IPredictionState> & _StoreWithGetters<IPredictionGetters> & PiniaCustomProperties>
	& _GettersTree<IPredictionState>,



	actions: {
		setPrediction(data:TwitchatDataTypes.MessagePredictionData, postOnChat?:boolean) {
			if(this.data != null && data==null && postOnChat) {
				StoreProxy.chat.addMessage(this.data);
				TriggerActionHandler.instance.onMessage(this.data);
			}
			
			this.data = data;
		},
	} as IPredictionActions
	& ThisType<IPredictionActions
		& UnwrapRef<IPredictionState>
		& _StoreWithState<"prediction", IPredictionState, IPredictionGetters, IPredictionActions>
		& _StoreWithGetters<IPredictionGetters>
		& PiniaCustomProperties
	>,
})