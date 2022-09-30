import MessengerProxy from '@/messaging/MessengerProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
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

			if(data.guessEmote==true) {
				let emotes = await TwitchUtils.getEmotes();
				emotes = emotes.filter(v => v.emote_type == "globals");
				const twitch = Utils.pickRand(emotes);
				data.emoteValue={twitch:undefined, facebook:undefined, youtube:undefined, instagram:undefined, tiktok:undefined, twitchat:undefined}
				data.emoteValue.twitch = {
					code:twitch.name,
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
				let goal = "Find ";
				if(data.guessEmote) {
					goal += " one of the global Twitch emotes";
				}else{
					goal += " a number between "+data.min+" and "+data.max+" included";
				}
				message = message.replace(/\{GOAL\}/gi, goal as string);
				MessengerProxy.instance.sendMessage(message);
			}
		},

		stopBingo() { this.data = null; },
		
		checkBingoWinner(message:TwitchatDataTypes.MessageChatData):void {
			if(!this.data) return;

			const sChat = StoreProxy.chat;
			const bingo = this.data;
			let win = bingo.numberValue && parseInt(message.message) == bingo.numberValue;
			win ||= bingo.emoteValue && bingo.emoteValue[message.user.platform]
					&& message.message.trim().toLowerCase().indexOf(bingo.emoteValue[message.user.platform]!.code.toLowerCase()) === 0;
			if(win) {
				bingo.winners = [message.user];
				if(sChat.botMessages.bingo.enabled) {
					let txt = sChat.botMessages.bingo.message;
					txt = txt.replace(/\{USER\}/gi, message.user.displayName);
					MessengerProxy.instance.sendMessage(txt, [message.user.platform]);
				}

				// const m:TwitchatDataTypes.MessageBingoData = {
				// 	id:Utils.getUUID(),
				// 	date:Date.now(),
				// 	platform:"twitchat",
				// 	type:"bingo",
				// 	user:message.user,
				// 	bingoData:{
				// 		guessNumber:bingo.guessNumber,
				// 		guessEmote:bingo.guessEmote,
				// 		min:bingo.,
				// 		max:,
				// 	},
				// }
				// //Post result on chat
				// const payload:IRCEventDataList.BingoResult = {
				// 	type:"bingo",
				// 	data:sBingo.data!,
				// 	winner,
				// 	tags:IRCClient.instance.getFakeTags(),
				// }
				// sChat.addMessage(payload);
				// TriggerActionHandler.instance.onMessage(payload);
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