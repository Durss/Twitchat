import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
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
			if(data) {
				if(postOnChat) {
					StoreProxy.chat.addMessage(data);
				}

				PublicAPI.instance.broadcast(TwitchatEvent.POLL_PROGRESS, {poll: (data as unknown) as JsonObject});
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