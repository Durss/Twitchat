import rewardImg from '@/assets/icons/channelPoints.svg';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { LoremIpsum } from 'lorem-ipsum';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { watch, type UnwrapRef } from 'vue';
import type { IDebugActions, IDebugGetters, IDebugState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import { GoXLRTypes } from '@/types/GoXLRTypes';

const ponderatedRandomList:TwitchatDataTypes.TwitchatMessageStringType[] = [];

export const storeDebug = defineStore('debug', {
	state: () => ({
	} as IDebugState),



	getters: {
	} as IDebugGetters
	& ThisType<UnwrapRef<IDebugState> & _StoreWithGetters<IDebugGetters> & PiniaCustomProperties>
	& _GettersTree<IDebugState>,



	actions: {
		async simulateMessage(type:TwitchatDataTypes.TwitchatMessageStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>boolean, postOnChat:boolean = true, allowConversations:boolean = true):Promise<TwitchatDataTypes.ChatMessageTypes> {
			let data!:TwitchatDataTypes.ChatMessageTypes;
			const uid:string = StoreProxy.auth.twitch.user.id;
			const fakeUsers = await TwitchUtils.getFakeUsers();

			const user:TwitchatDataTypes.TwitchatUser = StoreProxy.users.getUserFrom("twitch", uid, uid, undefined, undefined, undefined, true, false);
			const fakeUser:TwitchatDataTypes.TwitchatUser = Utils.pickRand(fakeUsers);
			
			const lorem = new LoremIpsum({
				sentencesPerParagraph: { max: 8, min: 4 },
				wordsPerSentence: { max: 8, min: 2 }
			});
			let message = lorem.generateSentences(Math.round(Math.random()*2) + 1);
			for (let i = 0; i < message.length; i++) {
				if(message.charAt(i) === " ") {
					if(Math.random() > .92) {
						const emote = Utils.pickRand(["BOP", "PogChamp", "MyAvatar", "NomNom", "VoHiYo", "LUL", "TwitchUnity", "bleedPurple", "NotLikeThis", "twitchRaid"]);
						message = message.substring(0, i) + " " + emote + " " + message.substring(i+1);
						i += emote.length + 1;
					}
				}
			}
			if(Math.random() > .92) {
				message += " this-is-a-link.test";
			}
			
			switch(type) {
				case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
					let chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					let users = fakeUsers.concat().splice(0,5);
					let sent = Math.random() > .5;
					let to = sent ? Utils.pickRand(users) : user;
					let from = sent ? user : Utils.pickRand(users);
					const m:TwitchatDataTypes.MessageWhisperData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						message_size:0,
						user:from,
						to
					};
					m.message_size = TwitchUtils.computeMessageSize(m.message_chunks);
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
					let chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const m:TwitchatDataTypes.MessageChatData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						answers:[],
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						message_size:0,
						user:fakeUser,
						is_short:false,
					};
					m.message_size = TwitchUtils.computeMessageSize(m.message_chunks);
					if(allowConversations) {
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
					}
					data = m;
					break;
				}
				
				case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
					let chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const m:TwitchatDataTypes.MessageSubscriptionData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						message,
						message_chunks:chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_size:0,
						user:fakeUser,
						months: Math.random() > .75? Math.floor(Math.random() * 6) + 1 : 0,
						streakMonths: Math.floor(Math.random() * 46),
						totalSubDuration: Math.floor(Math.random() * 46),
						tier:Utils.pickRand([1,2,3,"prime"]),
						is_gift:false,
						is_giftUpgrade:false,
						is_resub:false,
						gift_upgradeSender:Utils.pickRand(fakeUsers)
					};
					m.message_size = TwitchUtils.computeMessageSize(chunks);
					if(Math.random() > .8) {
						fakeUser.channelInfo[uid].totalSubgifts = Math.floor(Math.random() * 1000);
					}
					data = m;
					break;
				}
				
				case TwitchatDataTypes.TwitchatMessageType.CHEER: {
					let bits = 0;
					const cheerList:string[] = [];
					for (const key in TwitchUtils.cheermoteCache[uid]) {
						const cheer = TwitchUtils.cheermoteCache[uid][key];
						const count = cheer.tiers.length;
						for (let i = 0; i < count; i++) {
							if(Math.random() > .98) {
								const value = cheer.tiers[i].min_bits + Math.floor(Math.random()*cheer.tiers[i].min_bits * .99);
								bits += value;
								cheerList.push(cheer.prefix+value);
							}
						}
					}
					message += " "+Utils.shuffle(cheerList).join(" ");
					let chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					await TwitchUtils.parseCheermotes( chunks, uid);
					const m:TwitchatDataTypes.MessageCheerData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						message,
						message_chunks:chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_size:TwitchUtils.computeMessageSize(chunks),
						user:fakeUser,
						bits,
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
						message_size:0,
						reward: {
							id:reward.id,
							cost:reward.cost,
							description:reward.prompt,
							title:reward.title,
							color:reward.background_color,
							icon,
						},
					};
					if(Math.random() > .75) {
						let chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
						m.message = message;
						m.message_chunks = chunks;
						m.message_html = TwitchUtils.messageChunksToHTML(chunks);
						m.message_size = TwitchUtils.computeMessageSize(chunks);
					}
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
							progress:contribTot+123,
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
					let res = await TwitchUtils.searchLiveChannels(Utils.pickRand(["just chatting", "valorant", "minecraft", "art", "makers & crafting"]));
					let chan = Utils.pickRand(res);
					const m:TwitchatDataTypes.MessageRaidData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						user:StoreProxy.users.getUserFrom("twitch", uid, chan.id, chan.broadcaster_login, chan.display_name),
						viewers:Math.round(Math.random() * 1500),
						stream:{
							title: chan.title,
							category: chan.game_name,
							duration: Date.now() - new Date(chan.started_at).getTime(),
							wasLive: Math.random() > .5
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

				case TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE:
				case TwitchatDataTypes.TwitchatMessageType.CLIP_PENDING_PUBLICATION: {
					const m:TwitchatDataTypes.MessageClipCreate = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						clipID:"",
						clipUrl:"",
						loading:true,
						error:false,
					};

					function fillClipInfo(m:TwitchatDataTypes.MessageClipCreate):void {
						m.clipID = "UnusualFriendlyLasagnaOpieOP-ot8P67E0N6trA6hW";
						m.clipUrl = "https://www.twitch.tv/twitch/clip/UnusualFriendlyLasagnaOpieOP-ot8P67E0N6trA6hW";
						m.loading = false;
					}

					if(type == TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE) {
						fillClipInfo(m);
					}else{
						setTimeout(()=>{
							fillClipInfo(m);
						}, 2000);
					}
					
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
										TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT,
										TwitchatDataTypes.TwitchatMessageType.CHEER,
									]
						const t = Utils.pickRand(types);
						await this.simulateMessage(t, (message)=> {
							if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
								//Simulate subgifts
								if(Math.random() > .8) {
									const count = Math.min(fakeUsers.length, Math.round(Math.random() * 50) + 1);
									const recipients:TwitchatDataTypes.TwitchatUser[] = fakeUsers.concat().splice(0, count);
									const m = (message as TwitchatDataTypes.MessageSubscriptionData);
									m.gift_recipients = recipients;
									m.gift_count = recipients.length;
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
						}, false, false);
					}

					const conductor_subs = Utils.pickRand(fakeUsers);
					const conductor_bits = Utils.pickRand(fakeUsers);
					//Load avatars if necessary
					if(!conductor_subs.avatarPath) {
						const profile = await TwitchUtils.loadUserInfo([conductor_subs.id]);
						conductor_subs.avatarPath = profile[0].profile_image_url;
					}
					if(!conductor_bits.avatarPath) {
						const profile = await TwitchUtils.loadUserInfo([conductor_bits.id]);
						conductor_bits.avatarPath = profile[0].profile_image_url;
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
							state:'COMPLETED',
							conductor_subs:{
								type:"SUBS",
								user:conductor_subs,
								contributions:[{sub_t1:Math.round(Math.random()*100)}]
							},
							conductor_bits:{
								type:"BITS",
								user:conductor_bits,
								contributions:[{bits:Math.round(Math.random()*10000)}]
							},
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
				case TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP: {
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

				case TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE: {
					const m:TwitchatDataTypes.MessageMusicAddedToQueueData= {
						id:Utils.getUUID(),
						platform:"twitch",
						date:Date.now(),
						type,
						trackAdded: {
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
					let totalPoints = 0;
					let totalUsers = 0;
					for(let i=0; i < count; i++) {
						const voters = Math.round(Math.random()*50);
						const votes = Math.round(Math.random()*1000000);
						totalPoints += votes;
						totalUsers += voters;
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
						totalPoints,
						totalUsers,
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
							joinCount:1,
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
							created_at:Date.now()-30000,
							duration_s:60,
							followRatio:0,
							subRatio:0,
							subT2Ratio:0,
							subT3Ratio:0,
							vipRatio:0,
							subgiftRatio:0,
							mode:'manual',
							multipleJoin:false,
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
						user,
						fromAutomod:Math.random() > .5,
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
						sceneName:"Lorem ipsum",
						previousSceneName:"Dolor sit amet"
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
						started:true,
						timer:{
							startAt:Utils.formatDate(start),
							startAt_ms:start.getTime(),
							duration:Utils.formatDuration(duration, true),
							duration_ms:duration,
							offset_ms:0,
							endAt:Utils.formatDate(new Date()),
							endAt_ms:Date.now(),
						}
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
							pausedDuration:0,
							aborted:false,
							finalDuration:Utils.formatDuration(duration, true),
							finalDuration_ms:duration,
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE: {
					let counter = Utils.pickRand(StoreProxy.counters.counterList ?? []);
					if(!counter) {
						counter = {
							id:Utils.getUUID(),
							placeholderKey:"",
							loop:false,
							max:false,
							min:false,
							name:"Fake counter",
							perUser:false,
							value:Math.round(Math.random()*9999),
						}
					}
					const m:TwitchatDataTypes.MessageCounterUpdateData = {
						platform:"twitchat",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						counter,
						added:10,
						added_abs: 10,
						looped:false,
						maxed:false,
						mined:false,
						value:counter.value,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.VALUE_UPDATE: {
					let value = Utils.pickRand(StoreProxy.values.valueList ?? []);
					const lorem = new LoremIpsum({
						sentencesPerParagraph: { max: 8, min: 4 },
						wordsPerSentence: { max: 8, min: 2 }
					});
					if(!value) {
						value = {
							id:Utils.getUUID(),
							placeholderKey:"",
							name:"Fake value",
							value:lorem.generateSentences(1),
						}
					}
					const m:TwitchatDataTypes.MessageValueUpdateData = {
						platform:"twitchat",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						value:value,
						newValue:lorem.generateSentences(1),
						oldValue:value.value,
					};
					console.log("FAKE ", m);
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
						info: {
							user:fakeUser,
							title:"Amazing stream!",
							category:"Just chatting",
							started_at:Date.now(),
							tags:[],
							live:false,
							viewers:0,
							lastSoDoneDate:0,
						}
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
						info: {
							user:fakeUser,
							title:"Amazing stream!",
							category:"Just chatting",
							started_at:Date.now(),
							tags:[],
							live:false,
							viewers:0,
							lastSoDoneDate:0,
						}
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
						platform:"twitch",
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
						platform:"twitch",
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

				case TwitchatDataTypes.TwitchatMessageType.RAID_STARTED: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageRaidStartData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.RAID_STARTED,
						date:Date.now(),
						id:Utils.getUUID(),
						user:fakeUser,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageWatchStreakData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK,
						date:Date.now(),
						id:Utils.getUUID(),
						user:fakeUser,
						channel_id:uid,
						streak:Utils.pickRand([3,6,9]),//Not sure thera are other valid values than 3
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						});
					}
					const userMessage:TwitchatDataTypes.MessageChatData = await this.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false, false) as TwitchatDataTypes.MessageChatData;
					const level = Utils.pickRand([0,1,2,3,4,5,6,7,8,9]);
					userMessage.twitch_hypeChat = {
						level,
						amount:[1.2,6,12,24,60,120,240,360,480,600][level],
						currency:Utils.pickRand(["EUR","USD","CHF","CA","GBP"]),
						duration_s:[30, 150, 60*5, 60*10, 60*30, 60*60, 60*60*2, 60*60*3, 60*60*4, 60*60*5][level]
					}
					const m:TwitchatDataTypes.MessageHypeChatData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT,
						date:Date.now(),
						id:Utils.getUUID(),
						message:userMessage,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK: {
					const m:TwitchatDataTypes.MessageHeatClickData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK,
						date:Date.now(),
						id:Utils.getUUID(),
						alt:Math.random() > .8,
						shift:Math.random() > .8,
						ctrl:Math.random() > .8,
						anonymous:false,
						user,
						channel_id:user.id,
						coords:{x:Math.random()*100, y:Math.random()*100},
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.GOXLR_BUTTON: {
					const m:TwitchatDataTypes.MessageGoXLRButtonData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.GOXLR_BUTTON,
						date:Date.now(),
						id:Utils.getUUID(),
						button:Utils.pickRand((GoXLRTypes.ButtonTypes as unknown) as GoXLRTypes.ButtonTypesData[]),
						pressed:Math.random() > .5,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE: {
					const m:TwitchatDataTypes.MessageGoXLRFXEnableChangeData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE,
						date:Date.now(),
						id:Utils.getUUID(),
						enabled:Math.random() > .5,
						fxIndex:Utils.pickRand([0,1,2,3,4,5]),
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.GOXLR_SAMPLE_COMPLETE: {
					const m:TwitchatDataTypes.MessageGoXLRSampleCompleteData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.GOXLR_SAMPLE_COMPLETE,
						date:Date.now(),
						id:Utils.getUUID(),
						buttonId:Utils.pickRand(["SamplerTopLeft", "SamplerBottomLeft", "SamplerBottomRight", "SamplerTopRight"]),
						bank:Utils.pickRand(["SamplerSelectA", "SamplerSelectB", "SamplerSelectC"]),
					};
					data = m;
					break;
				}
			}

			data.fake = true;
			
			if(hook) {
				if(hook(data) === false) return data;
			}
			if(postOnChat) StoreProxy.chat.addMessage(data);
			return data;
		},

		async simulateNotice(noticeType?:TwitchatDataTypes.TwitchatNoticeStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>boolean, postOnChat:boolean = true):Promise<TwitchatDataTypes.ChatMessageTypes> {
			let data!:TwitchatDataTypes.MessageNoticeData;
			const uid:string = StoreProxy.auth.twitch.user.id;
			const fakeUsers = await TwitchUtils.getFakeUsers();
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
						platform:"twitch",
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
						platform:"twitch",
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
						platform:"twitch",
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
						platform:"twitch",
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
						platform:"twitch",
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
						platform:"twitch",
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
						platform:"twitch",
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
						platform:"twitch",
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
						platform:"twitch",
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
						platform:"twitch",
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

			data.fake = true;

			if(hook) {
				if(hook(data) === false) return data;
			}
			if(postOnChat) StoreProxy.chat.addMessage(data);
			return data;
		},
		
		async sendRandomFakeMessage(postOnChat:boolean, forcedMessage?:string, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>void, forcedType?:TwitchatDataTypes.TwitchatMessageStringType):Promise<TwitchatDataTypes.ChatMessageTypes> {
			if(ponderatedRandomList.length === 0) {
				const spamTypes:{type:TwitchatDataTypes.TwitchatMessageStringType, probability:number}[]=[
					{type:TwitchatDataTypes.TwitchatMessageType.MESSAGE, probability:100},
					{type:TwitchatDataTypes.TwitchatMessageType.REWARD, probability:4},
					{type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING, probability:3},
					{type:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, probability:2},
					{type:TwitchatDataTypes.TwitchatMessageType.CHEER, probability:2},
					{type:TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.BAN, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.UNBAN, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.RAID, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.POLL, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.BINGO, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.PREDICTION, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN, probability:1},
					{type:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION, probability:1},
				];
	
				for (let i = 0; i < spamTypes.length; i++) {
					for (let j = 0; j < spamTypes[i].probability; j++) {
						ponderatedRandomList.push(spamTypes[i].type);
					}
				}
			}

			const messageType = forcedType? forcedType : Utils.pickRand(ponderatedRandomList);
			return await this.simulateMessage(messageType, (data)=> {
				if(data.type === TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					if(forcedMessage) {
						data.message_chunks = TwitchUtils.parseMessageToChunks(forcedMessage, undefined, true);
						data.message = data.message_html = forcedMessage;
					}else{
						if(Math.random() < .1)  {
							if(Math.random() > .9) {
								data.twitch_isFirstMessage = true;
							}else if(Math.random() > .9) {
								data.twitch_isPresentation = true;
							}else if(Math.random() > .9) {
								data.deleted = true;
							}else if(Math.random() > .9) {
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
						}
					}
				}
				if(hook) {
					hook(data);
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