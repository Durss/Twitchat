import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { BingoData } from '@/utils/CommonDataTypes'
import IRCClient from '@/utils/IRCClient';
import TwitchUtils from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore } from 'pinia'
import { storeChat } from '../chat/storeChat';

export const storeBingo = defineStore('bingo', {
	state: () => ({
		data: null as BingoData | null,
	}),



	getters: {
	},



	actions: {
		async startBingo(payload:TwitchatDataTypes.BingoConfig) {
			const min = payload.min as number;
			const max = payload.max as number;
			const sChat = storeChat();
			
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
				IRCClient.instance.sendMessage(message);
			}
		},

		stopBingo() { this.data = null; },
	},
})