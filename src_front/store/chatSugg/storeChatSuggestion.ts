import MessengerProxy from '@/messaging/MessengerProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IChatSuggestionActions, IChatSuggestionGetters, IChatSuggestionState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

export const storeChatSuggestion = defineStore('chatSuggestion', {
	state: () => ({
		data: null,
	} as IChatSuggestionState),



	getters: {
	} as IChatSuggestionGetters
	& ThisType<UnwrapRef<IChatSuggestionState> & _StoreWithGetters<IChatSuggestionGetters> & PiniaCustomProperties>
	& _GettersTree<IChatSuggestionState>,



	actions: {
		setChatSuggestion(payload:TwitchatDataTypes.ChatSuggestionData|null) {
			this.data = payload;
			if(payload) {
				const sChat = StoreProxy.chat;
				if(sChat.botMessages.chatSuggStart.enabled === true) {
					
					let message = sChat.botMessages.chatSuggStart.message;
					message = message.replace(/\{CMD\}/gi, payload.command);
					message = message.replace(/\{LENGTH\}/gi, payload.maxLength.toString());
					MessengerProxy.instance.sendMessage(message);
				}
			}
		},

		addChatSuggestion(message:TwitchatDataTypes.TranslatableMessage):void {
			if(!this.data) return;

			if(Date.now() - this.data.startTime < this.data.duration * 60 * 1000) {
				//If message is too long, stop there
				if((message.message || "").length > this.data.maxLength) return;
				
				//If already participated when not allowed, stop there
				if(!this.data.allowMultipleAnswers
				&& this.data.choices.find(v=>v.user.id == message.user.id)) return;

				const text = (message.message || "").replace(this.data.command, "").trim();
				if(text.length > 0) {
					this.data.choices.push({
						id: Utils.getUUID(),
						user: message.user,
						label: text
					});
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

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeChatSuggestion, import.meta.hot))
}