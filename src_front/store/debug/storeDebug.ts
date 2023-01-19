import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import Config from '@/utils/Config';
import { LoremIpsum } from 'lorem-ipsum';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { watch, type UnwrapRef } from 'vue';
import type { IDebugActions, IDebugGetters, IDebugState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import rewardImg from '@/assets/icons/channelPoints.svg';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';

const ponderatedRandomList:TwitchatDataTypes.TwitchatMessageStringType[] = [];
const fakeUsers:TwitchatDataTypes.TwitchatUser[] = [];

export const storeDebug = defineStore('debug', {
	state: () => ({
	} as IDebugState),



	getters: {
	} as IDebugGetters
	& ThisType<UnwrapRef<IDebugState> & _StoreWithGetters<IDebugGetters> & PiniaCustomProperties>
	& _GettersTree<IDebugState>,



	actions: {
		async simulateMessage(type:TwitchatDataTypes.TwitchatMessageStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>boolean, postOnChat:boolean = true):Promise<TwitchatDataTypes.ChatMessageTypes> {
			let data!:TwitchatDataTypes.ChatMessageTypes;
			const uid:string = StoreProxy.auth.twitch.user.id;
			if(fakeUsers.length === 0) {
				const followers = await TwitchUtils.getFollowers(uid, 100);
				for (let i = 0; i < followers.length; i++) {
					fakeUsers.push(StoreProxy.users.getUserFrom("twitch", uid, followers[i].from_id, followers[i].from_login, followers[i].from_name,undefined, true, false));
				}
				if(fakeUsers.length < 10) {
					const additional:{id:string,login:string,displayName:string}[] = [
						{id:"12826",login:"twitch", displayName:"Twitch"},
						{id:"527115020",login:"twitchgaming", displayName:"twitchgaming"},
						{id:"141981764",login:"twitchdev", displayName:"TwitchDev"},
						{id:"29961813",login:"durss", displayName:"Durss"},
						{id:"44445592",login:"pokimane", displayName:"pokimane"},
						{id:"197886470",login:"twitchrivals", displayName:"TwitchRivals"},
						{id:"149747285",login:"twitchpresents", displayName:"TwitchPresents"},
					]
					for (let i = 0; i < additional.length; i++) {
						fakeUsers.push(StoreProxy.users.getUserFrom("twitch", uid, additional[i].id, additional[i].login, additional[i].displayName,undefined, false, false));
					}
				}
			}

			const user:TwitchatDataTypes.TwitchatUser = StoreProxy.users.getUserFrom("twitch", uid, uid, undefined, undefined, undefined, true, false);
			const fakeUser:TwitchatDataTypes.TwitchatUser = Utils.pickRand(fakeUsers);
			
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
						message_no_emotes:message,
						user:fakeUser,
						is_short:false,
					};
					const messageList = StoreProxy.chat.messages;
					if(messageList.length > 0 && Math.random() < .1) {
						for (let i = messageList.length-1; i > Math.max(0, messageList.length-50); i--) {
							const om = messageList[i];
							if(om.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
								m.answersTo = om;
								om.answers.push(m);
								break;
							}
						}
					}
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
					const m:TwitchatDataTypes.MessageWhisperData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						message,
						message_html:message,
						user:fakeUser,
						to:user
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
						gift_upgradeSender:Utils.pickRand(fakeUsers)
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
					const count = Math.min(fakeUsers.length, Math.round(Math.random() * 50) + 1);
					const users = Utils.shuffle(fakeUsers.concat()).splice(0, count);
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
					let reward!:TwitchDataTypes.Reward;
					if(user.is_affiliate || user.is_partner) {
						reward = Utils.pickRand(await (await TwitchUtils.getRewards()).filter(v=>v.is_enabled===true));
					}
					if(!reward) reward = Config.instance.highlightMyMessageReward;
					//Use one of the user's rewards
					const img = reward.image ?? reward.default_image;
					const icon:TwitchatDataTypes.TwitchatImage = {sd: img.url_1x, hd: img.url_4x};
					const m:TwitchatDataTypes.MessageRewardRedeemData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						user:Utils.pickRand(fakeUsers),
						reward: {
							id:reward.id,
							cost:reward.cost,
							description:reward.prompt,
							title:reward.title,
							icon,
						},
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
					const img = rewardImg;
					const contrib = Math.round(Math.random()*2000) + 10;
					const contribTot = contrib + Math.round(Math.random()*20000);
					const goal = Math.round(contribTot * (Math.random()*3+1));
					const m:TwitchatDataTypes.MessageCommunityChallengeContributionData =  {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id: uid,
						type,
						user: user,
						contribution: contrib,
						stream_contribution: contrib,
						total_contribution: contribTot,
						challenge: {
							title:"My awesome challenge",
							goal,
							progress:contribTot,
							progress_percent:parseFloat((contribTot/goal *100).toFixed(1)),
							description:"Send channel points to make my challenge a reality <3",
							icon:{
								sd:img,
								hd:img,
							},
						}
					};
					data = m;
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
						viewers:Math.round(Math.random() * 1500),
						stream:{
							title: "Hello world",
							category: "Just chatting",
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL: 
				case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START: 
				case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS: 
				case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE:
				case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING: {
					const value = Math.ceil(Math.random()*20+10)*1000;
					const currentValue = Math.round(value*Math.random());
					const level = Math.ceil(Math.random()*10);
					const approached_at = Date.now() - 3 * 60 * 1000;
					const train:TwitchatDataTypes.HypeTrainStateData = {
						channel_id:uid,
						level,
						currentValue,
						goal:value,
						approached_at,
						started_at:approached_at + Math.round(Math.random()*2*60*1000),
						updated_at:Date.now(),
						timeLeft_s:Math.ceil(Math.random()*5*60),
						state: "START",
						is_boost_train:false,
						is_new_record:false,
					};
					const m:TwitchatDataTypes.MessageHypeTrainEventData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id:uid,
						type,
						train,
						level,
						percent:Math.round(currentValue/value * 100),
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN: {
					const m:TwitchatDataTypes.MessageHypeTrainCooledDownData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id:uid,
						type,
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
						const types = [
										TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
										TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
										TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
										TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
										TwitchatDataTypes.TwitchatMessageType.CHEER
									]
						const t = Utils.pickRand(types);
						this.simulateMessage(t, (message)=> {
							if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
								//Simulate subgifts
								if(Math.random() > .8) {
									const count = Math.min(fakeUsers.length, Math.round(Math.random() * 50) + 1);
									const recipients:TwitchatDataTypes.TwitchatUser[] = fakeUsers.concat().splice(0, count);
									const m = (message as TwitchatDataTypes.MessageSubscriptionData);
									m.gift_recipients = recipients;
									m.is_gift = true;
									sum += count * parseInt(m.tier.toString().replace("prime", "1")) * 250;
								}else{
									sum += parseInt(message.tier.toString().replace("prime", "1")) * 250;
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
							channel_id:uid,
							approached_at,
							started_at:approached_at + 30000,
							updated_at:approached_at + 30000,
							timeLeft_s:0,
							goal:100,
							currentValue:Math.floor(Math.random() * 100),
							level:Math.round(sum/8000),
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

				case TwitchatDataTypes.TwitchatMessageType.MUSIC_START:
				case TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP:
				case TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE: {
					const m:TwitchatDataTypes.MessageMusicAddedToQueueData
					| TwitchatDataTypes.MessageMusicStartData
					| TwitchatDataTypes.MessageMusicStopData = {
						id:Utils.getUUID(),
						platform:"twitch",
						date:Date.now(),
						type,
						track: {
							title: "Mitchiri Neko march",
							artist: "Mitchiri MitchiriNeko",
							album: "MitchiriNeko",
							cover: "https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",
							duration: 1812,
							url: "https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87"
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.POLL: {
					const choices:TwitchatDataTypes.MessagePollDataChoice[] = [];
					const count = Math.ceil(Math.random()*10);
					let winner!:TwitchatDataTypes.MessagePollDataChoice;
					let winnerCount = 0;
					for(let i=0; i < count; i++) {
						const votes = Math.round(Math.random()*50);
						const entry = {id:Utils.getUUID(), label:"Option "+(i+1), votes};
						if(votes > winnerCount) {
							winnerCount = votes;
							winner = entry;
						}
						choices.push(entry);
					}
					const m:TwitchatDataTypes.MessagePollData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						choices,
						duration_s:180,
						title:"Who wins?",
						started_at:Date.now() - 2 * 60 * 1000,
						ended_at:Date.now(),
						winner,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
					const outcomes:TwitchatDataTypes.MessagePredictionDataOutcome[] = [];
					const count = Math.ceil(Math.random()*9)+1;
					for(let i=0; i < count; i++) {
						const voters = Math.round(Math.random()*50);
						const votes = Math.round(Math.random()*1000000);
						outcomes.push({id:Utils.getUUID(), label:"Option "+(i+1), votes, voters});
					}
					const m:TwitchatDataTypes.MessagePredictionData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						outcomes,
						duration_s:180,
						title:"Who wins?",
						started_at:Date.now() - 2 * 60 * 1000,
						ended_at:Date.now(),
						pendingAnswer:false,
						winner:Utils.pickRand(outcomes),
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN: {
					const m:TwitchatDataTypes.MessageAutobanJoinData = {
						platform:"twitchat",
						channel_id: uid,
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						user,
						rule:{
							enabled:true,
							id:Utils.getUUID(),
							label:"Ban "+user.login+" è_é",
							regex:user.login,
							serverSync:false,
							emergency:false,
							firstTimeChatters:false,
						},
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.BINGO: {
					const m:TwitchatDataTypes.MessageBingoData = {
						platform:"twitchat",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						user,
						bingoData: {
							guessEmote:false,
							guessNumber:true,
							guessCustom:false,
							min:0,
							max:1000,
							numberValue:Math.round(Math.random()*999),
							winners: [user],
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
					const entries:TwitchatDataTypes.RaffleEntry[] = [];
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					for (let i = 0; i < 10; i++) {
						entries.push({
							id:Utils.getUUID(),
							label:fakeUser.login,
							score:1,
							user: {
								channel_id:user.id,
								platform:"twitch",
								id:fakeUser.id,
							}
						});
					}
					const m:TwitchatDataTypes.MessageRaffleData = {
						platform:"twitchat",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						winner:Utils.pickRand(entries),
						raffleData: {
							command:"",
							created_at:Date.now()-30000,
							duration_s:60,
							followRatio:0,
							subRatio:0,
							vipRatio:0,
							subgiftRatio:0,
							mode:'manual',
							subMode_excludeGifted:false,
							subMode_includeGifters:false,
							showCountdownOverlay:false,
							maxEntries: 0,
							entries:[],
							customEntries:entries.map(v=>v.label).join(","),
							winners:[Utils.pickRand(entries)],
						},
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD: {
					const m:TwitchatDataTypes.MessageTwitchatAdData = {
						platform:"twitchat",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						adType:TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT: {
					const m:TwitchatDataTypes.MessageClearChatData = {
						platform:"twitch",
						type,
						id:Utils.getUUID(),
						channel_id:uid,
						date:Date.now(),
						fromAutomod:true,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
					const stream = (await TwitchUtils.loadChannelInfo([user.id]))[0];
					const m:TwitchatDataTypes.MessageShoutoutData = {
						platform:"twitch",
						channel_id:user.id,
						type,
						id:Utils.getUUID(),
						date:Date.now(),
						received:false,
						user:user,
						viewerCount: Math.round(Math.random()*999),
						moderator:user,
						stream: {
							title:stream.title,
							category:stream.game_name,
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.CONNECT: {
					const m:TwitchatDataTypes.MessageConnectData = {
						platform:"twitch",
						type,
						id:Utils.getUUID(),
						date:Date.now(),
						user:user,
						channel_id:user.id
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE: {
					const m:TwitchatDataTypes.MessageOBSSourceToggleData = {
						platform:"twitch",
						type,
						id:Utils.getUUID(),
						date:Date.now(),
						sourceItemId:0,
						sourceName:"loram ipsum",
						visible:Math.random() > .5
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE: {
					const m:TwitchatDataTypes.MessageOBSSceneChangedData = {
						platform:"twitch",
						type,
						id:Utils.getUUID(),
						date:Date.now(),
						sceneName:"Lorem ipsum"
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TIMER: {
					const duration = Math.round(Math.random()*60*10)*1000;
					const start = new Date(Date.now() - duration);
					const m:TwitchatDataTypes.MessageTimerData = {
						platform:"twitch",
						type,
						id:Utils.getUUID(),
						date:Date.now(),
						startAt:Utils.formatDate(start),
						startAt_ms:start.getTime(),
						started:true,
						duration:Utils.formatDuration(duration, true),
						duration_ms:duration,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN: {
					const duration = Math.round(Math.random() *60*60)*1000;
					const start = new Date(Date.now() - duration);
					const m:TwitchatDataTypes.MessageCountdownData = {
						platform:"twitchat",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						countdown: {
							duration:Utils.formatDuration(duration, true),
							duration_ms:duration,
							startAt:Utils.formatDate(start),
							startAt_ms:start.getTime(),
							endAt:Utils.formatDate(new Date()),
							endAt_ms:Date.now(),
							timeoutRef:-1,
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT: {
					const m:TwitchatDataTypes.MessageLowtrustTreatmentData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id:uid,
						type,
						user:fakeUser,
						moderator:user,
						restricted:Math.random() > .5,
						monitored:Math.random() > .5,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.PINNED: {
					const pin = await this.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false) ;
					const m:TwitchatDataTypes.MessagePinData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						moderator:user,
						chatMessage:pin as TwitchatDataTypes.MessageChatData,
						pinnedAt_ms:Date.now(),
						updatedAt_ms:Date.now(),
						unpinAt_ms:Date.now() + 2 * 60 * 1000,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.UNPINNED: {
					const pin = await this.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false) ;
					const m:TwitchatDataTypes.MessageUnpinData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						moderator:user,
						chatMessage:pin as TwitchatDataTypes.MessageChatData,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT: {
					const message = (await this.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, true)) as TwitchatDataTypes.MessageChatData;
					const m:TwitchatDataTypes.MessageChatHighlightData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						info:{
							message:message.message,
							user:message.user,
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT: {
					const message = (await this.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, true)) as TwitchatDataTypes.MessageChatData;
					const m:TwitchatDataTypes.MessageChatAlertData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						message
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE: {
					const m:TwitchatDataTypes.MessageStreamOnlineData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						user,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE: {
					const m:TwitchatDataTypes.MessageStreamOfflineData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						user,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.VOICEMOD: {
					const m:TwitchatDataTypes.MessageVoicemodData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						voiceID:Utils.pickRand(["nofx", "robot", "baby"])
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.BAN: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageBanData = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.BAN,
						date:Date.now(),
						id:Utils.getUUID(),
						user:fakeUser,
						channel_id:uid,
						moderator:user,
					};
					if(Math.random()> .5) {
						m.duration_s = Math.ceil(Math.random()*666);
					}
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.UNBAN: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageUnbanData = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.UNBAN,
						date:Date.now(),
						id:Utils.getUUID(),
						user:fakeUser,
						channel_id:uid,
						moderator:user,
					};
					data = m;
					break;
				}
			}
			if(hook) {
				if(hook(data) === false) return data;
			}
			if(postOnChat) StoreProxy.chat.addMessage(data);
			return data;
		},

		async simulateNotice(noticeType?:TwitchatDataTypes.TwitchatNoticeStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>boolean, postOnChat:boolean = true):Promise<TwitchatDataTypes.ChatMessageTypes> {
			let data!:TwitchatDataTypes.MessageNoticeData;
			const uid:string = StoreProxy.auth.twitch.user.id;
			if(fakeUsers.length === 0) {
				const followers = await TwitchUtils.getFollowers(uid, 100);
				for (let i = 0; i < followers.length; i++) {
					fakeUsers.push(StoreProxy.users.getUserFrom("twitch", uid, followers[i].from_id, followers[i].from_login, followers[i].from_name,undefined, true, false));
				}
			}
			const user:TwitchatDataTypes.TwitchatUser = StoreProxy.users.getUserFrom("twitch", uid, uid, undefined, undefined, undefined, true, false);
			const fakeUser:TwitchatDataTypes.TwitchatUser = Utils.pickRand(fakeUsers);

			switch(noticeType) {

				case TwitchatDataTypes.TwitchatNoticeType.VIP: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageModerationAction = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t("global.moderation_action.viped_by", {USER:fakeUser.displayName, MODERATOR:user.displayName}),
						channel_id:uid,
						user:fakeUser,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatNoticeType.UNVIP: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageModerationAction = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t("global.moderation_action.unviped", {USER:fakeUser.displayName}),
						channel_id:uid,
						user:fakeUser,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatNoticeType.MOD: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageModerationAction = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t("global.moderation_action.modded_by", {USER:fakeUser.displayName, MODERATOR:user.displayName}),
						channel_id:uid,
						user:fakeUser,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatNoticeType.UNMOD: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageModerationAction = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t("global.moderation_action.unmodded", {USER:fakeUser.displayName}),
						channel_id:uid,
						user:fakeUser,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE: {
					const title = "Let's have some fun !";
					const category = "Just chatting";
					const m:TwitchatDataTypes.MessageStreamInfoUpdate = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t("global.moderation_action.stream_title_changed", {TITLE:title}),
						channel_id:uid,
						title,
						category,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE: {
					const m:TwitchatDataTypes.MessageEmergencyModeInfo = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t("emergency.enabled"),
						channel_id:uid,
						enabled:true,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE: {
					const m:TwitchatDataTypes.MessageShieldMode = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t("global.moderation_action.shield_on", {USER:user.displayName}),
						channel_id:uid,
						enabled:true,
						user,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatNoticeType.TTS: {
					const keys = ["tts.on_notice", "tts.off_notice"];
					const m:TwitchatDataTypes.MessageNoticeData = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t(Utils.pickRand(keys), {USER:user.displayName}),
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE: {
					const lorem = new LoremIpsum({
						sentencesPerParagraph: { max: 8, min: 4 },
						wordsPerSentence: { max: 8, min: 2 }
					});
					const title = lorem.generateSentences(1);
					const m:TwitchatDataTypes.MessageStreamInfoUpdate = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:noticeType,
						message:StoreProxy.i18n.t("stream.notification", {TITLE:title}),
						channel_id:uid,
						category:"Just chatting",
						title,
					};
					data = m;
					break;
				}

				default: {
					const m:TwitchatDataTypes.MessageNoticeData = {
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						date:Date.now(),
						id:Utils.getUUID(),
						noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
						message:"generic notice message",
						channel_id:uid,
					};
					data = m;
				}

			}

			if(hook) {
				if(hook(data) === false) return data;
			}
			if(postOnChat) StoreProxy.chat.addMessage(data);
			return data;
		},
		
		async sendRandomFakeMessage(postOnChat:boolean, forcedMessage?:string, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>void):Promise<TwitchatDataTypes.ChatMessageTypes> {
			if(ponderatedRandomList.length === 0) {
				const spamTypes:{type:TwitchatDataTypes.TwitchatMessageStringType, probability:number}[]=[
					{type:TwitchatDataTypes.TwitchatMessageType.MESSAGE, probability:100},
					{type:TwitchatDataTypes.TwitchatMessageType.REWARD, probability:4},
					{type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING, probability:3},
					{type:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, probability:2},
					{type:TwitchatDataTypes.TwitchatMessageType.CHEER, probability:2},
					{type:TwitchatDataTypes.TwitchatMessageType.BAN, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.UNBAN, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.RAID, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.POLL, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.PREDICTION, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, probability:1},
				];
	
				for (let i = 0; i < spamTypes.length; i++) {
					for (let j = 0; j < spamTypes[i].probability; j++) {
						ponderatedRandomList.push(spamTypes[i].type);
					}
				}
			}

			return await this.simulateMessage(Utils.pickRand(ponderatedRandomList), (data)=> {
				if(data.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					if(forcedMessage) {
						data.message = data.message_html = data.message_no_emotes = forcedMessage;
					}
					if(Math.random() > .1) return;
					if(Math.random() > .5) {
						data.twitch_isFirstMessage = true;
					}else if(Math.random() > .5) {
						data.twitch_isPresentation = true;
					}else if(Math.random() > .5) {
						data.deleted = true;
					}else if(Math.random() > .5) {
						if(Math.random() > .35) {
							data.twitch_isSuspicious = true;
						}else{
							data.twitch_isRestricted = true;
						}
						const users:TwitchatDataTypes.TwitchatUser[] = [];
						const list = StoreProxy.users.users;
						for (let i = 0; i < list.length; i++) {
							users.push(list[i]);
							if(Math.random() > .3) break;
						}
						data.twitch_sharedBanChannels = users.map(v=> { return {id:v.id, login:v.login}; })
					}
					if(hook) {
						hook(data);
					}
				}
			}, postOnChat);
		},
	} as IDebugActions
	& ThisType<IDebugActions
		& UnwrapRef<IDebugState>
		& _StoreWithState<"Debug", IDebugState, IDebugGetters, IDebugActions>
		& _StoreWithGetters<IDebugGetters>
		& PiniaCustomProperties
	>,
})