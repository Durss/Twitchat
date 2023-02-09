import MessengerProxy from '@/messaging/MessengerProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
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
				data.emoteValue={twitch:undefined, facebook:undefined, youtube:undefined, instagram:undefined, tiktok:undefined, twitchat:undefined}
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
		
		checkBingoWinner(message:TwitchatDataTypes.MessageChatData):void {
			if(!this.data) return;
			if(this.data.winners && this.data.winners.length > 0) return;

			const sChat = StoreProxy.chat;
			const bingo = this.data;
			const num = bingo.numberValue;
			const emote = bingo.emoteValue && bingo.emoteValue[message.user.platform];
			const custom = bingo.customValue;
			const cleanMess = message.message.trim().toLowerCase();
			let win = parseInt(message.message) == num;
			win ||= cleanMess == custom?.trim().toLowerCase()
			win ||= emote != undefined && cleanMess.indexOf(emote.code.toLowerCase()) === 0;
			if(win) {
				//Someone won
				bingo.winners = [message.user];
				if(sChat.botMessages.bingo.enabled) {
					//Post on chat if requested
					let txt = sChat.botMessages.bingo.message;
					txt = txt.replace(/\{USER\}/gi, message.user.displayName);
					MessengerProxy.instance.sendMessage(txt, [message.user.platform]);
				}

				//Notify broadcaster and execute trigger
				const m:TwitchatDataTypes.MessageBingoData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.BINGO,
					user:message.user,
					bingoData:bingo,
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