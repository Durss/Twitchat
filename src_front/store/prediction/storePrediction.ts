import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
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
		setPrediction(data:TwitchatDataTypes.MessagePredictionData|null, postOnChat?:boolean) {
			if(data != null) {
				if(postOnChat) {
					console.log("POST MESSAGE", data);
					StoreProxy.chat.addMessage(data);
				}

				PublicAPI.instance.broadcast(TwitchatEvent.PREDICTION_PROGRESS, {prediction: (data as unknown) as JsonObject});
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