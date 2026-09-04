import type { StoreActions } from "@/types/pinia-helpers";
import MessengerProxy from "@/messaging/MessengerProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { replacePlaceholders } from "@/utils/PlaceholderModifiers";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import type {
	IChatSuggestionActions,
	IChatSuggestionGetters,
	IChatSuggestionState,
} from "../StoreProxy";
import StoreProxy from "../StoreProxy";

export const storeChatSuggestion = defineStore("chatSuggestion", {
	state: (): IChatSuggestionState => ({
		data: null,
	}),

	actions: {
		setChatSuggestion(payload: TwitchatDataTypes.ChatSuggestionData | null) {
			this.data = payload;
			if (payload) {
				const sChat = StoreProxy.chat;
				if (sChat.botMessages.chatSuggStart.enabled === true) {
					const message = replacePlaceholders(sChat.botMessages.chatSuggStart.message, {
						CMD: payload.command,
						LENGTH: payload.maxLength,
					});
					MessengerProxy.instance.sendMessage(message);
				}
			}
		},

		addChatSuggestion(message: TwitchatDataTypes.TranslatableMessage): void {
			if (!this.data) return;

			if (Date.now() - this.data.startTime < this.data.duration * 60 * 1000) {
				//If message is too long, stop there
				if ((message.message || "").length > this.data.maxLength) return;

				//If already participated when not allowed, stop there
				if (
					!this.data.allowMultipleAnswers &&
					this.data.choices.find((v) => v.user.id == message.user.id)
				)
					return;

				const text = (message.message || "").replace(this.data.command, "").trim();
				if (text.length > 0) {
					this.data.choices.push({
						id: Utils.getUUID(),
						user: message.user,
						label: text,
					});
				}
			}
		},
	} satisfies StoreActions<
		"chatSuggestion",
		IChatSuggestionState,
		IChatSuggestionGetters,
		IChatSuggestionActions
	>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeChatSuggestion, import.meta.hot));
}
