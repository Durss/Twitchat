import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
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
		addChatSuggestion(message:TwitchatDataTypes.MessageChatData):void {
			if(!this.data) return;

			if(Date.now() - this.data.startTime < this.data.duration * 60 * 1000) {
				if(this.data.allowMultipleAnswers
				|| this.data.choices.findIndex(v=>v.user.id == message.user.id)==-1) {
					const text = message.message.replace(this.data.command, "").trim();
					if(text.length > 0) {
						this.data.choices.push({
							id: Utils.getUUID(),
							user: message.user,
							label: text
						});
					}
				}
			}
		},
	} as IChatSuggestionActions
	& ThisType<IChatSuggestionActions
		& UnwrapRef<IChatSuggestionState>
		& _StoreWithState<"chatSuggestion", IChatSuggestionState, IChatSuggestionGetters, IChatSuggestionActions>
		& _StoreWithGetters<IChatSuggestionGetters>
		& PiniaCustomProperties
	>,
})