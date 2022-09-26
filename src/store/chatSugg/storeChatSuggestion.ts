import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue';
import type { IChatSuggestionActions, IChatSuggestionGetters, IChatSuggestionState } from '../StoreProxy';

export const storeChatSuggestion = defineStore('chatSuggestion', {
	state: () => ({
		data: null,
	} as IChatSuggestionState),



	getters: {
	} as IChatSuggestionGetters
	& ThisType<UnwrapRef<IChatSuggestionState> & _StoreWithGetters<IChatSuggestionGetters> & PiniaCustomProperties>
	& _GettersTree<IChatSuggestionState>,



	actions: {
		setChatSuggestion(payload:TwitchatDataTypes.ChatSuggestionData|null) { this.data = payload; },
	} as IChatSuggestionActions
	& ThisType<IChatSuggestionActions
		& UnwrapRef<IChatSuggestionState>
		& _StoreWithState<"chatSuggestion", IChatSuggestionState, IChatSuggestionGetters, IChatSuggestionActions>
		& _StoreWithGetters<IChatSuggestionGetters>
		& PiniaCustomProperties
	>,
})