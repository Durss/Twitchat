import MessengerProxy from '@/messaging/MessengerProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { BingoData } from '@/utils/CommonDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IBingoActions, type IBingoGetters, type IBingoState } from '../StoreProxy';

export const storeBingo = defineStore('bingo', {
	state: () => ({
		data: null as BingoData | null,
	} as IBingoState),



	getters: {
	} as IBingoGetters
	& ThisType<UnwrapRef<IBingoState> & _StoreWithGetters<IBingoGetters> & PiniaCustomProperties>
	& _GettersTree<IBingoState>,



	actions: {
		async startBingo(payload:TwitchatDataTypes.BingoConfig) {
			const min = payload.min as number;
			const max = payload.max as number;
			const sChat = StoreProxy.chat;
			
			let emotes = await TwitchUtils.getEmotes();
			emotes = emotes.filter(v => v.emote_type == "globals");

			const data:BingoData = {
				guessNumber: payload.guessNumber,
				guessEmote: payload.guessEmote,
				numberValue: Math.round(Math.random() * (max-min) + min),
				emoteValue: Utils.pickRand(emotes),
				winners: [],
			};
			this.data = data;
			
			if(sChat.botMessages.bingoStart.enabled) {
				let message = sChat.botMessages.bingoStart.message;
				let goal = "Find ";
				if(payload.guessEmote) {
					goal += " one of the global Twitch emotes";
				}else{
					goal += " a number between "+min+" and "+max+" included";
				}
				message = message.replace(/\{GOAL\}/gi, goal as string);
				MessengerProxy.instance.sendMessage(message);
			}
		},

		stopBingo() { this.data = null; },
	} as IBingoActions
	& ThisType<IBingoActions
		& UnwrapRef<IBingoState>
		& _StoreWithState<"bingo", IBingoState, IBingoGetters, IBingoActions>
		& _StoreWithGetters<IBingoGetters>
		& PiniaCustomProperties
	>,
})