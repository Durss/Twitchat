import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { LoremIpsum } from 'lorem-ipsum';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IDebugActions, IDebugGetters, IDebugState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import rewardImg from '@/assets/icons/channelPoints.svg';

export const storeDebug = defineStore('debug', {
	state: () => ({
	} as IDebugState),



	getters: {
	} as IDebugGetters
	& ThisType<UnwrapRef<IDebugState> & _StoreWithGetters<IDebugGetters> & PiniaCustomProperties>
	& _GettersTree<IDebugState>,



	actions: {
		async simulateMessage(type:TwitchatDataTypes.TwitchatMessageStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>boolean):Promise<void> {
			let data!:TwitchatDataTypes.ChatMessageTypes;
			const uid:string = StoreProxy.auth.twitch.user.id;
			const user:TwitchatDataTypes.TwitchatUser = StoreProxy.users.getUserFrom("twitch", uid, uid);
			const tmpFake = Utils.pickRand(StoreProxy.users.users);
			//Reloading the user from getUserFrom() to make sure the channel specific data are initialized
			const fakeUser:TwitchatDataTypes.TwitchatUser = StoreProxy.users.getUserFrom("twitch", uid, tmpFake.id, tmpFake.login, tmpFake.displayName);
			

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
						user:fakeUser
					};
					data = m;
					break;
				}
				
				case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
					const m:TwitchatDataTypes.MessageSubscriptionData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						message,
						message_html:message,
						user:fakeUser,
						months: Math.floor(Math.random() * 6) + 1,
						streakMonths: Math.floor(Math.random() * 46),
						totalSubDuration: Math.floor(Math.random() * 46),
						tier:Utils.pickRand([1,2,3,"prime"]),
						is_gift:false,
						is_giftUpgrade:false,
						is_resub:false,
						gift_upgradeSender:StoreProxy.users.getUserFrom("twitch", uid, (Math.round(Math.random() * 999999999).toString())),
					};
					data = m;
					break;
				}
				
				case TwitchatDataTypes.TwitchatMessageType.CHEER: {
					const m:TwitchatDataTypes.MessageCheerData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						message,
						message_html:message,
						user:fakeUser,
						bits:Math.round(Math.random() * 1000),
					};
					data = m;
					break;
				}
				
				case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
					const m:TwitchatDataTypes.MessageFollowingData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						user:fakeUser,
						followed_at:Date.now(),
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
					const reward = Utils.pickRand(await (await TwitchUtils.getRewards()).filter(v=>v.is_enabled===true));
					if(!reward) {
						//User has no public reward, send a fake one
						const m:TwitchatDataTypes.MessageRewardRedeemData = {
							id:Utils.getUUID(),
							platform:"twitch",
							channel_id:uid,
							date:Date.now(),
							type,
							user,
							reward: {
								id:Utils.getUUID(),
								cost:50,
								description:"I tell you how amazing Twitchat is <3",
								title:"Praise twitchat",
								icon:{
									sd:rewardImg,
									hd:rewardImg,
								},
							},
						};
						data = m;
					}else{
						//Use one of the user's rewards
						const img = reward.image ?? reward.default_image;
						const icon:TwitchatDataTypes.TwitchatImage = {sd: img.url_1x, hd: img.url_4x};
						const m:TwitchatDataTypes.MessageRewardRedeemData = {
							id:Utils.getUUID(),
							platform:"twitch",
							channel_id:uid,
							date:Date.now(),
							type,
							user,
							reward: {
								id:reward.id,
								cost:reward.cost,
								description:reward.prompt,
								title:reward.title,
								icon,
							},
						};
						data = m;
					}
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.RAID: {
					const m:TwitchatDataTypes.MessageRaidData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						user,
						viewers:Math.round(Math.random() * 1500)
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY: {
					const approached_at = Date.now() - Math.round(Math.random()*60*1000*10 + 60*1000);
					const activities:(TwitchatDataTypes.MessageSubscriptionData | TwitchatDataTypes.MessageCheerData)[] = [];
					const count = Math.round(Math.random() * 40) + 5;
					let sum = 0;
					//Generate fake events
					for (let i = 0; i < count; i++) {
						const types = [TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, TwitchatDataTypes.TwitchatMessageType.CHEER]
						const t = Utils.pickRand(types);
						this.simulateMessage(t, (message)=> {
							if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
								//Simulate subgifts
								if(Math.random() > .3) {
									const recipients:TwitchatDataTypes.TwitchatUser[] = [];
									const count = Math.round(Math.random() * 50) + 1;
									const m = (message as TwitchatDataTypes.MessageSubscriptionData);
									for (let i = 0; i < count; i++) {
										recipients.push(StoreProxy.users.getUserFrom("twitch", StoreProxy.auth.twitch.user.id, (Math.round(Math.random() * 999999999)).toString()))
									}
									m.gift_recipients = recipients;
									m.is_gift = true;
									sum += count * parseInt(m.tier.toString().replace("prime", "1")) * 250;
								}else{
									sum += parseInt(message.tier.toString().replace("prime", "1")) * 250;;
								}
							}else if(message.type == TwitchatDataTypes.TwitchatMessageType.CHEER){
								//Simulate cheer
								sum += message.bits;
							}
							activities.push(message as (TwitchatDataTypes.MessageSubscriptionData | TwitchatDataTypes.MessageCheerData));
							return false;//Avoid sending it on chat
						})
					}
					
					const m:TwitchatDataTypes.MessageHypeTrainSummaryData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						train: {
							approached_at,
							started_at:approached_at + 30000,
							updated_at:approached_at + 30000,
							timeLeft:0,
							goal:100,
							currentValue:Math.floor(Math.random() * 100),
							level:Math.round(sum/12000),
							is_new_record:Math.random() > .5,
							is_boost_train:false,
							state:'COMPLETED'
						},
						activities,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE: {
					const m:TwitchatDataTypes.MessageCommunityBoostData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						viewers:Math.ceil(Math.random() * 15) * 250,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.BAN: {
					const m:TwitchatDataTypes.MessageBanData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						noticeId:type,
						user:fakeUser,
						moderator:user,
						message:fakeUser.displayName+" has been banned by "+user.displayName,
						reason:"you're a butt hole",
					};
					data = m;
					break;
				}
			}
			if(hook) {
				if(hook(data) === false) return;
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