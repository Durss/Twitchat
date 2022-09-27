import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IPollActions, type IPollGetters, type IPollState } from '../StoreProxy';


export const storePoll = defineStore('poll', {
	state: () => ({
		data: null,
	} as IPollState),



	getters: {
	} as IPollGetters
	& ThisType<UnwrapRef<IPollState> & _StoreWithGetters<IPollGetters> & PiniaCustomProperties>
	& _GettersTree<IPollState>,



	actions: {
		setCurrentPoll(data:TwitchatDataTypes.MessagePollData|null, postOnChat?:boolean) {
			if(this.data != null && data==null && postOnChat) {
				StoreProxy.chat.addMessage(this.data);
				TriggerActionHandler.instance.onMessage(this.data);
			}
			
			this.data = data;
		},
	} as IPollActions
	& ThisType<IPollActions
		& UnwrapRef<IPollState>
		& _StoreWithState<"poll", IPollState, IPollGetters, IPollActions>
		& _StoreWithGetters<IPollGetters>
		& PiniaCustomProperties
	>,
})