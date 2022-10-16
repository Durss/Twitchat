import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import { LoremIpsum } from 'lorem-ipsum';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IDebugActions, IDebugGetters, IDebugState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

export const storeDebug = defineStore('debug', {
	state: () => ({
	} as IDebugState),



	getters: {
	} as IDebugGetters
	& ThisType<UnwrapRef<IDebugState> & _StoreWithGetters<IDebugGetters> & PiniaCustomProperties>
	& _GettersTree<IDebugState>,



	actions: {
		simulateMessage(type:TwitchatDataTypes.TwitchatMessageStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>void):void {
			let data!:TwitchatDataTypes.ChatMessageTypes;
			const uid:string = UserSession.instance.twitchUser!.id;
			const user:TwitchatDataTypes.TwitchatUser = StoreProxy.users.getUserFrom("twitch", uid, uid);
			const lorem = new LoremIpsum({
				sentencesPerParagraph: { max: 8, min: 4 },
				wordsPerSentence: { max: 8, min: 2 }
			});
			const message = lorem.generateSentences(Math.round(Math.random()*2) + 1);
			switch(type) {
				case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
					const m:TwitchatDataTypes.MessageChatData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						answers:[],
						message,
						message_html:message,
						user
					};
					data = m;
					break;
				}
				
				case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
					const recipients:TwitchatDataTypes.TwitchatUser[] = [];
					const count = Math.round(Math.random() * 50) + 1;
					for (let i = 0; i < count; i++) {
						recipients.push(StoreProxy.users.getUserFrom("twitch", uid, (Math.round(Math.random() * 999999999)).toString()))
					}
					const m:TwitchatDataTypes.MessageSubscriptionData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						message,
						message_html:message,
						user,
						months: Math.floor(Math.random() * 6) + 1,
						streakMonths: Math.floor(Math.random() * 46),
						totalSubDuration: Math.floor(Math.random() * 46),
						tier:Utils.pickRand([1,2,3,"prime"]),
						gift_recipients:recipients,
						is_gift:false,
						is_giftUpgrade:false,
						is_resub:false,
						gift_upgradeSender:StoreProxy.users.getUserFrom("twitch", uid, (Math.round(Math.random() * 999999999).toString())),
					};
					data = m;
					break;
				}
					
				case TwitchatDataTypes.TwitchatMessageType.JOIN:
				case TwitchatDataTypes.TwitchatMessageType.LEAVE: {
					const users:TwitchatDataTypes.TwitchatUser[] = [];
					const count = Math.round(Math.random() * 50) + 1;
					for (let i = 0; i < count; i++) {
						users.push(StoreProxy.users.getUserFrom("twitch", uid, (Math.round(Math.random() * 999999999)).toString()))
					}
					const m:TwitchatDataTypes.MessageJoinData|TwitchatDataTypes.MessageLeaveData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						users,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.REWARD: {
					const users:TwitchatDataTypes.TwitchatUser[] = [];
					const count = Math.round(Math.random() * 50) + 1;
					for (let i = 0; i < count; i++) {
						users.push(StoreProxy.users.getUserFrom("twitch", uid, (Math.round(Math.random() * 999999999)).toString()))
					}
					// const m:TwitchatDataTypes.MessageRewardRedeemData = {
					// 	id:Utils.getUUID(),
					// 	platform:"twitch",
					// 	channel_id:uid,
					// 	date:Date.now(),
					// 	type,
					// 	reward
					// };
					// data = m;
					break;
				}
			}
			if(hook) {
				hook(data);
			}
			StoreProxy.chat.addMessage(data);
		}
	} as IDebugActions
	& ThisType<IDebugActions
		& UnwrapRef<IDebugState>
		& _StoreWithState<"Debug", IDebugState, IDebugGetters, IDebugActions>
		& _StoreWithGetters<IDebugGetters>
		& PiniaCustomProperties
	>,
})