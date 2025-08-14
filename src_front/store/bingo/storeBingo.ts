import MessengerProxy from '@/messaging/MessengerProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IBingoActions, type IBingoGetters, type IBingoState } from '../StoreProxy';

export const storeBingo = defineStore('bingo', {
	state: () => ({
		data: null as TwitchatDataTypes.BingoConfig | null,
	} as IBingoState),



	getters: {
	} as IBingoGetters
	& ThisType<UnwrapRef<IBingoState> & _StoreWithGetters<IBingoGetters> & PiniaCustomProperties>
	& _GettersTree<IBingoState>,



	actions: {
		async startBingo(data:TwitchatDataTypes.BingoConfig) {
			const sChat = StoreProxy.chat;
			let emoteCount = 0;
			if(data.guessEmote==true) {
				let emotes = await TwitchUtils.getEmotes();
				emoteCount = emotes.length;
				emotes = emotes.filter(v => v.is_public === true);
				const twitch = Utils.pickRand(emotes);
				data.emoteValue={twitch:undefined, facebook:undefined, youtube:undefined, instagram:undefined, tiktok:undefined, twitchat:undefined, kick:undefined}
				data.emoteValue.twitch = {
					code:twitch.code,
					image:{
						sd:twitch.images.url_1x,
						hd:twitch.images.url_4x,
					}
				}
			}else{
				data.numberValue = Math.round(Math.random() * (data.max-data.min) + data.min);
			}
			this.data = data;

			if(sChat.botMessages.bingoStart.enabled) {
				let message = sChat.botMessages.bingoStart.message;
				let goal = "";
				if(data.guessEmote) {
					goal = StoreProxy.i18n.t("bingo.goal_emote", {COUNT:emoteCount});
				}else if(data.guessNumber) {
					goal = StoreProxy.i18n.t("bingo.goal_number", {MIN:data.min, MAX:data.max});
				}
				message = message.replace(/\{GOAL\}/gi, goal as string);
				MessengerProxy.instance.sendMessage(message);
			}
		},

		stopBingo() { this.data = null; },

		checkBingoWinner(message:TwitchatDataTypes.TranslatableMessage):void {
			if(!this.data) return;
			if(this.data.winners && this.data.winners.length > 0) return;

			const sChat = StoreProxy.chat;
			const bingo = this.data;
			let win = false;
			const cleanMess = (message.message || "").trim().toLowerCase();
			if(bingo.guessNumber) {
				const num = bingo.numberValue;
				win = parseInt((message.message || "")) == num;
			}else
			if(bingo.guessEmote && bingo.emoteValue) {
				const emote = bingo.emoteValue[message.user.platform];
				win = emote != undefined && cleanMess.indexOf(emote.code.toLowerCase()) === 0;
			}else
			if(bingo.guessCustom) {
				const custom = (bingo.customValue || "").trim().toLowerCase();
				const tolerancePercent = (bingo.customValueTolerance ?? 0)/5;//divide by 5 because there are 6 tolerance levels (0 -> 5)
				//Allow to fail, at most, half of the expected word
				const tolerance = tolerancePercent * custom.length / 2;
				if(tolerance > 0) {
					win ||= Utils.levenshtein(cleanMess, custom) <= tolerance;
				}else{
					win ||= cleanMess == custom;
				}
			}
			if(win) {
				//Someone won
				bingo.winners = [message.user];
				if(sChat.botMessages.bingo.enabled) {
					//Post on chat if requested
					let txt = sChat.botMessages.bingo.message;
					txt = txt.replace(/\{USER\}/gi, message.user.displayNameOriginal);
					MessengerProxy.instance.sendMessage(txt, [message.user.platform]);
				}

				if(bingo.guessNumber) {
					delete bingo.customValue;
					delete bingo.emoteValue;
					bingo.genericValue = bingo.numberValue!;
				}else
				if(bingo.guessEmote && bingo.emoteValue) {
					delete bingo.numberValue;
					delete bingo.customValue;
					const key = Object.keys(bingo.emoteValue!)[0] as keyof typeof bingo.emoteValue;
					let code = bingo.emoteValue[key]?.code || "EMOTE_NOT_FOUND";
					bingo.genericValue = code;
				}else
				if(bingo.guessCustom) {
					delete bingo.numberValue;
					delete bingo.emoteValue;
					bingo.genericValue = bingo.customValue!;
				}

				//Notify broadcaster and execute trigger
				const m:TwitchatDataTypes.MessageBingoData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:message.user.platform,
					type:TwitchatDataTypes.TwitchatMessageType.BINGO,
					user:message.user,
					bingoData:bingo,
					channel_id:message.channel_id,
				}
				sChat.addMessage(m);
			}
		},
	} as IBingoActions
	& ThisType<IBingoActions
		& UnwrapRef<IBingoState>
		& _StoreWithState<"bingo", IBingoState, IBingoGetters, IBingoActions>
		& _StoreWithGetters<IBingoGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeBingo, import.meta.hot))
}