import rewardImg from '@/assets/icons/channelPoints.svg';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { LoremIpsum } from 'lorem-ipsum';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { watch, type UnwrapRef, reactive } from 'vue';
import type { IDebugActions, IDebugGetters, IDebugState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import { GoXLRTypes } from '@/types/GoXLRTypes';
import StickerList from "../../utils/youtube/sticker_list.json";
import staticEmotes from '@/utils/twitch/staticEmoteList.json';

let streamInfoCache:TwitchDataTypes.ChannelInfo|null = null;
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
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const users = fakeUsers.concat().splice(0,5);
					const sent = Math.random() > .5;
					const to = sent ? Utils.pickRand(users) : user;
					const from = sent ? user : Utils.pickRand(users);
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
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
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
								if(om.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && Math.random() < .2) {
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
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
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
						is_primeUpgrade:false,
						is_targetedSubgift:false,
						gift_upgradeSender:Utils.pickRand(fakeUsers)
					};
					m.message_size = TwitchUtils.computeMessageSize(chunks);
					if(Math.random() > .8) {
						m.tier = Utils.pickRand([1,2,3]),
						m.is_gift = true;
						m.gift_count = Math.floor(Math.random() * 20) + 1;
						m.gift_recipients = fakeUsers.concat().splice(0, m.gift_count);
						m.is_targetedSubgift = m.gift_count === 1,
						fakeUser.channelInfo[user.id].totalSubgifts = m.gift_count;
					}else if(Math.random() > .8) {
						m.is_giftUpgrade = true;
					}
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.CHEER: {
					let bits = 0;
					const cheerList:string[] = [];
					do {
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
					}while(bits === 0)

					message += " "+Utils.shuffle(cheerList).join(" ");
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
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
						pinned:false,
						pinDuration_ms:0,
						pinLevel:0,
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
						const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
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
					const res = await TwitchUtils.searchLiveChannels(Utils.pickRand(["just chatting", "valorant", "minecraft", "art", "makers & crafting"]));
					const chan = Utils.pickRand(res);
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
							duration_str: Utils.formatDuration(Date.now() - new Date(chan.started_at).getTime()),
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
					const train:TwitchatDataTypes.HypeTrainStateData = {
						channel_id:uid,
						level,
						currentValue,
						goal:value,
						approached_at:Date.now() - 3 * 60000,
						started_at:Date.now() - Math.round(Math.random() * 2 * 60000),
						updated_at:Date.now(),
						ends_at:Date.now() + 5 * 60000,
						state: "START",
						is_boost_train:false,
						is_golden_kappa:false,
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
						clipPublicUrl:"",
						clipUrl:"",
						loading:true,
						error:false,
						channel_id:uid,
					};

					function fillClipInfo(m:TwitchatDataTypes.MessageClipCreate):void {
						m.clipID = "UnusualFriendlyLasagnaOpieOP-ot8P67E0N6trA6hW";
						m.clipUrl = "https://www.twitch.tv/twitch/clip/UnusualFriendlyLasagnaOpieOP-ot8P67E0N6trA6hW";
						m.loading = false;
					}

					if(type == TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE) {
						fillClipInfo(m);
					}else{
						window.setTimeout(()=>{
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
						await this.simulateMessage<TwitchatDataTypes.MessageCheerData|TwitchatDataTypes.MessageSubscriptionData|TwitchatDataTypes.MessageHypeChatData>(t, (message)=> {
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
						const profile = await TwitchUtils.getUserInfo([conductor_subs.id]);
						conductor_subs.avatarPath = profile[0].profile_image_url;
					}
					if(!conductor_bits.avatarPath) {
						const profile = await TwitchUtils.getUserInfo([conductor_bits.id]);
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
							ends_at:approached_at + 30000,
							goal:100,
							currentValue:Math.floor(Math.random() * 100),
							level:Math.round(sum/8000),
							is_new_record:Math.random() > .5,
							is_boost_train:false,
							is_golden_kappa:false,
							state:'COMPLETED',
							conductor_subs:{
								user:conductor_subs,
								amount:Math.round(Math.random()*100),
							},
							conductor_bits:{
								user:conductor_bits,
								amount:Math.round(Math.random()*10000),
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
					const m:TwitchatDataTypes.MessageMusicStartData
					| TwitchatDataTypes.MessageMusicStopData = {
						id:Utils.getUUID(),
						platform:"twitch",
						date:Date.now(),
						type,
						track: {
							id: "xxx",
							title: "Mitchiri Neko march",
							artist: "Mitchiri MitchiriNeko",
							album: "MitchiriNeko",
							cover: "https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",
							duration: 181200,
							url: "https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87",
						},
						userOrigin: user,
						channel_id:uid,
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
						user,
						triggerIdSource:StoreProxy.triggers.triggerList[0]?.id,
						trackAdded: {
							id: "xxx",
							title: "Mitchiri Neko march",
							artist: "Mitchiri MitchiriNeko",
							album: "MitchiriNeko",
							cover: "https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",
							duration: 181200,
							url: "https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87"
						},
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.POLL: {
					const choices:TwitchatDataTypes.MessagePollDataChoice[] = [];
					const count = Math.max(2, Math.ceil(Math.random()*5));
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
					const lorem = new LoremIpsum({
						sentencesPerParagraph: { max: 8, min: 4 },
						wordsPerSentence: { max: 5, min: 2 }
					});
					const m:TwitchatDataTypes.MessagePollData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						choices,
						duration_s:180,
						title:lorem.generateSentences(1).replace(".","")+"?",
						started_at:Date.now() - 2 * 60 * 1000,
						ended_at:Date.now(),
						winner,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
					const outcomes:TwitchatDataTypes.MessagePredictionDataOutcome[] = [];
					const count = Math.random() > .5? 2 : Math.ceil(Math.random()*9)+1;
					let totalPoints = 0;
					let totalUsers = 0;
					for(let i=0; i < count; i++) {
						const voters = Math.round(Math.random()*50);
						const votes = Math.round(Math.random()*10000);
						totalPoints += votes;
						totalUsers += voters;
						outcomes.push({id:Utils.getUUID(), label:"Option "+(i+1), votes, voters});
					}
					const lorem = new LoremIpsum({
						sentencesPerParagraph: { max: 8, min: 4 },
						wordsPerSentence: { max: 5, min: 2 }
					});
					const m:TwitchatDataTypes.MessagePredictionData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						outcomes,
						duration_s:180,
						title:lorem.generateSentences(1).replace(".","")+"?",
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

				case TwitchatDataTypes.TwitchatMessageType.CHAT_POLL: {
					const choices:TwitchatDataTypes.MessageChatPollData["poll"]["choices"] = [];
					const count = Math.max(2, Math.ceil(Math.random()*5));
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
					const lorem = new LoremIpsum({
						sentencesPerParagraph: { max: 8, min: 4 },
						wordsPerSentence: { max: 5, min: 2 }
					});
					const m:TwitchatDataTypes.MessageChatPollData = {
						id:Utils.getUUID(),
						platform:"twitch",
						channel_id:uid,
						date:Date.now(),
						type,
						poll: {
							choices,
							duration_s:180,
							title:lorem.generateSentences(1).replace(".","")+"?",
							started_at:Date.now() - 2 * 60 * 1000,
							ended_at:Date.now(),
							winner,
							permissions:{
								broadcaster:true,
								mods:true,
								vips:false,
								subs:false,
								follower:false,
								follower_duration_ms:0,
								all:false,
								usersAllowed:[],
								usersRefused:[],
							}
						},
						isStart:false,
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
							genericValue:"",
							min:0,
							max:1000,
							numberValue:Math.round(Math.random()*999),
							winners: [user],
						},
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.BINGO_GRID: {
					const grid = Utils.pickRand(StoreProxy.bingoGrid.gridList);
					const m:TwitchatDataTypes.MessageBingoGridData = {
						platform:"twitchat",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						bingoGridId: grid?.id || Utils.getUUID(),
						bingoGridName: grid?.title || "My awesome grid",
						channel_id:uid,
						colIndex:Math.round(Math.random()*grid.cols),
						rowIndex:Math.round(Math.random()*grid.rows),
						complete:Math.random() > .5,
						user,
						coords: {
							x:Math.round(Math.random()*grid.cols),
							y:Math.round(Math.random()*grid.rows),
						},
						diagonal:Math.random() > .5? 1 : 0,
						reset:Math.random() > .5,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.BINGO_GRID_VIEWER: {
					const grid = Utils.pickRand(StoreProxy.bingoGrid.gridList);
					const m:TwitchatDataTypes.MessageBingoGridViewerData = {
						platform:"twitchat",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						bingoGridId: grid?.id || Utils.getUUID(),
						bingoGridName: grid?.title || "My awesome grid",
						channel_id:uid,
						bingoCount:Math.round(Math.random()*5+1),
						user:fakeUser,
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
							autoClose:false,
							subMode_excludeGifted:false,
							subMode_includeGifters:false,
							showCountdownOverlay:false,
							maxEntries: 0,
							entries:[],
							customEntries:entries.map(v=>v.label).join(","),
							winners:[Utils.pickRand(entries)],
						},
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.RAFFLE_PICK_WINNER: {
					const m:TwitchatDataTypes.MessageRafflePickWinnerData = {
						id:Utils.getUUID(),
						channel_id:StoreProxy.auth.twitch.user.id,
						date:Date.now(),
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.RAFFLE_PICK_WINNER,
					}
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
						channel_id:uid,
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
					const stream = streamInfoCache || (await TwitchUtils.getChannelInfo([user.id]))[0];
					streamInfoCache = stream;
					const m:TwitchatDataTypes.MessageShoutoutData = {
						platform:"twitch",
						channel_id:user.id,
						type,
						id:Utils.getUUID(),
						date:Date.now(),
						received:false,
						user:Utils.pickRand(fakeUsers),
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

				case TwitchatDataTypes.TwitchatMessageType.DISCONNECT: {
					const m:TwitchatDataTypes.MessageDisconnectData = {
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
						visible:Math.random() > .5,
						channel_id:uid,
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
						previousSceneName:"Dolor sit amet",
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TIMER: {
					const duration = Math.round(Math.random()*60*10)*1000;
					const start = new Date(Date.now() - duration);
					const m:TwitchatDataTypes.MessageTimerData = {
						type:TwitchatDataTypes.TwitchatMessageType.TIMER,
						platform:"twitchat",
						id:Utils.getUUID(),
						date:Date.now(),
						channel_id:StoreProxy.auth.twitch.user.id,
						startedAt_ms:start.getTime(),
						startedAt_str:Utils.formatDate(new Date(start.getTime()), true),
						duration_ms:duration,
						duration_str:Utils.formatDuration(duration, true),
						stopped:true,
						timer_id:Utils.getUUID(),
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN: {
					const duration = Math.round(Math.random() *60*60)*1000;
					const start = new Date(Date.now() - duration);
					const m:TwitchatDataTypes.MessageCountdownData = {
						type:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN,
						platform:"twitchat",
						id:Utils.getUUID(),
						date:Date.now(),
						channel_id:StoreProxy.auth.twitch.user.id,
						startedAt_ms:start.getTime(),
						startedAt_str:Utils.formatDate(new Date(start.getTime()), true),
						duration_ms:duration,
						duration_str:Utils.formatDuration(duration, true),
						aborted:false,
						complete:true,
						endedAt_ms:Date.now(),
						endedAt_str:Utils.formatDate(new Date(), true),
						finalDuration_ms:duration,
						finalDuration_str:Utils.formatDuration(duration, true),
						countdown_id:Utils.getUUID(),
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
						channel_id:uid,
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
							perUser:false,
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
						channel_id:uid,
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

				case TwitchatDataTypes.TwitchatMessageType.BLOCKED_TERMS: {
					const m:TwitchatDataTypes.MessageBlockedTermsData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id:uid,
						type,
						user:fakeUser,
						action:"add_blocked",
						terms:["lorem ipsum"],
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
						channel_id:uid,
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
						channel_id:uid,
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
							message_id:message.id,
							params:{
								position:"bl",
							},
							dateLabel:StoreProxy.i18n.tm("global.date_ago"),
						},
						channel_id:uid,
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
						message,
						channel_id:uid,
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
						},
						channel_id:uid,
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
						},
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.VOICEMOD: {
					const voice = Utils.pickRand([{name:"Clean mic", id:"fake-id-01"}, {name:"Robot", id:"fake-id-02"}, {name:"Megaphone", id:"fake-id-03"}]);
					const sound = Utils.pickRand([{name:"Fart", id:"fake-id-01"}, {name:"Honk", id:"fake-id-02"}, {name:"Scream", id:"fake-id-03"}]);
					const m:TwitchatDataTypes.MessageVoicemodData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						type,
						voiceID:voice.id,
						voiceName:voice.name,
						soundID:sound.id,
						soundName:sound.name,
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.BAN:
				case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_BAN: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageBanData|TwitchatDataTypes.MessageYoutubeBanData = {
						platform:type == TwitchatDataTypes.TwitchatMessageType.BAN? "twitch" : "youtube",
						type,
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
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						user:fakeUser,
						channel_id:uid,
						moderator:user,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST: {
					if(fakeUser.temporary) {
						await new Promise((resolve)=> {
							watch(()=>fakeUser.temporary, ()=> resolve(fakeUser));
						})
					}
					const m:TwitchatDataTypes.MessageUnbanRequestData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						user:fakeUser,
						channel_id:uid,
						moderator:user,
						isResolve:false,
						isFlagByAutomod:false,
						message,
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
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						user:fakeUser,
						channel_id:uid,
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
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const m:TwitchatDataTypes.MessageWatchStreakData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						user:fakeUser,
						channel_id:uid,
						streak:Utils.pickRand([3,5,7,10,15]),//Not sure these are valid values
						channelPointsEarned:Utils.pickRand([350,450]),//Not sure there are other valid values
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						message_size:0,
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
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						message:userMessage,
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK: {
					const m:TwitchatDataTypes.MessageHeatClickData = {
						platform:"twitch",
						type,
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
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						button:Utils.pickRand((GoXLRTypes.ButtonTypes as unknown) as GoXLRTypes.ButtonTypesData[]),
						pressed:Math.random() > .5,
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE: {
					const m:TwitchatDataTypes.MessageGoXLRFXEnableChangeData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						enabled:Math.random() > .5,
						fxIndex:Utils.pickRand([0,1,2,3,4,5]),
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.GOXLR_SAMPLE_COMPLETE: {
					const m:TwitchatDataTypes.MessageGoXLRSampleCompleteData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						buttonId:Utils.pickRand(["SamplerTopLeft", "SamplerBottomLeft", "SamplerBottomRight", "SamplerTopRight"]),
						bank:Utils.pickRand(["SamplerSelectA", "SamplerSelectB", "SamplerSelectC"]),
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START:
				case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START_CHAT: {
					const m:TwitchatDataTypes.MessageAdBreakStartData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						duration_s:Utils.pickRand([10, 15, 20, 23, 25, 27, 30, 35, 60, 90, 120]),
						startedBy:user,
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_COMPLETE: {
					const m:TwitchatDataTypes.MessageAdBreakCompleteData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						duration_s:Utils.pickRand([10, 15, 20, 23, 25, 27, 30, 35, 60, 90, 120]),
						startedBy:user,
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_APPROACHING: {
					const m:TwitchatDataTypes.MessageAdBreakApproachingData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						delay_ms:30000,
						start_at:Date.now() + 30000,
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.OBS_START_STREAM: {
					const m:TwitchatDataTypes.MessageOBSStartStreamData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.OBS_STOP_STREAM: {
					const m:TwitchatDataTypes.MessageOBSStopStreamData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.STREAMLABS: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const amount = Math.round(Math.random()*50);
					const m:TwitchatDataTypes.MessageStreamlabsData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						amount,
						amountFormatted:amount+"€",
						currency:"EUR",
						eventType:"donation",
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						userName:fakeUser.displayNameOriginal,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.PATREON: {
					const amount = Math.round(Math.random()*50);
					const m:TwitchatDataTypes.PatreonNewMemberData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						eventType:"new_member",
						tier: {
							amount:amount,
							description:"My amazing pledge description",
							title:"My amazing pledge"
						},
						user: {
							username:fakeUser.displayNameOriginal,
							avatar:fakeUser.avatarPath || "",
							url:"https://www.patreon.com/user/creators?u=78146260"
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const amount = Math.round(Math.random()*50);
					const m:TwitchatDataTypes.MessageStreamelementsData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						amount,
						amountFormatted:amount+"€",
						currency:"EUR",
						eventType:"donation",
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						userName:fakeUser.displayNameOriginal,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.KOFI: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const amount = Math.round(Math.random()*50);
					const m:TwitchatDataTypes.MessageKofiData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						amount,
						amountFormatted:amount+"€",
						currency:"EUR",
						eventType:"donation",
						isPublic:true,
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						userName:fakeUser.displayNameOriginal,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TIPEEE: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const amount = Math.round(Math.random()*50);
					const m:TwitchatDataTypes.MessageTipeeeDonationData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						amount,
						amountFormatted:amount+"€",
						currency:"EUR",
						eventType:"donation",
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						userName:fakeUser.displayNameOriginal,
						recurring:false,
						recurringCount:0,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TILTIFY: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const amount = Math.round(Math.random()*50);
					const m:TwitchatDataTypes.TiltifyDonationData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						amount,
						amountFormatted:amount+"€",
						currency:"EUR",
						eventType:"donation",
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						userName:fakeUser.displayNameOriginal,
						campaign: {
							id:"xxx",
							title:"My awesome campaign",
							url:"https://tiltify.com"
						}
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION: {
					const emote = Utils.pickRand(staticEmotes);
					const m:TwitchatDataTypes.MessageTwitchCelebrationData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						user:fakeUser,
						cost:40,
						emoteID:emote.id,
						emoteURL:emote.images.url_4x || emote.images.url_2x || emote.images.url_1x,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.GIGANTIFIED_EMOTE: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const emote = Utils.pickRand(staticEmotes);
					const m:TwitchatDataTypes.MessageTwitchGigantifiedEmoteData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						user:fakeUser,
						cost:40,
						emoteID:emote.id,
						emoteURL:emote.images.url_4x || emote.images.url_2x || emote.images.url_1x,
						message,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						message_chunks:chunks,
						message_size:0,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.WARN_CHATTER: {
					const m:TwitchatDataTypes.MessageWarnUserData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						user:fakeUser,
						moderator:user,
						rules:[],
						customReason:"Be respecful",
						abstractedReason:"Be respecful",
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.WARN_ACKNOWLEDGE: {
					const m:TwitchatDataTypes.MessageWarnAcknowledgementData = {
						platform:"twitch",
						type,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						user:fakeUser,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const tier = Math.ceil(Math.random()*7);
					const m:TwitchatDataTypes.MessageYoutubeSuperChatData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						user:fakeUser,
						channel_id:uid,
						message,
						message_chunks:chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						youtube_liveId:Utils.getUUID(),
						amount:[1,2,5,10,20,50,100][tier-1],
						amountDisplay:"$"+[1,2,5,10,20,50,100][tier-1],
						currency:"$",
						tier,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER: {
					type keyType = keyof typeof StickerList;
					const keys = Object.keys(StickerList) as keyType[];
					const tier = Math.ceil(Math.random()*7);
					const stickerId = Utils.pickRand(keys);
					const m:TwitchatDataTypes.MessageYoutubeSuperStickerData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						user:fakeUser,
						channel_id:uid,
						youtube_liveId:Utils.getUUID(),
						amount:[1,2,5,10,20,50,100][tier-1],
						amountDisplay:"$"+[1,2,5,10,20,50,100][tier-1],
						currency:"$",
						tier,
						sticker_url:StickerList[stickerId] || "",
						sticker_id:stickerId
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const months = Math.random() > .25? Math.round(Math.random()*50) : 1;
					const m:TwitchatDataTypes.MessageYoutubeSubscriptionData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						user:fakeUser,
						channel_id:uid,
						message,
						message_chunks:chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						youtube_liveId:Utils.getUUID(),
						is_resub:months > 1,
						levelName:"My amazing subscription",
						months,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT: {
					const gift_count = Math.floor(Math.random() * 10) + 1;
					const m:TwitchatDataTypes.MessageYoutubeSubgiftData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						user:fakeUser,
						channel_id:uid,
						youtube_liveId:Utils.getUUID(),
						levelName:"My amazing subscription",
						gift_count,
						gift_recipients: fakeUsers.concat().splice(0, gift_count),
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.WEBSOCKET_TOPIC: {
					const topic = Utils.pickRand(["topic1","topic2","topic3"]);
					const m:TwitchatDataTypes.MessageWebsocketTopicData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						channel_id:uid,
						topic,
						message:"{\"topic\":\""+topic+"\"}"
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT: {
					const count = Math.round(Math.random()*100);
					const m:TwitchatDataTypes.MessageTikTokGiftData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						channel_id:uid,
						image:"https://p19-webcast.tiktokcdn.com/img/maliva/webcast-va/eba3a9bb85c33e017f3648eaf88d7189~tplv-obj.png",
						user:fakeUser,
						count,
						diamonds:count,
						giftId:"123456",
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE: {
					const count = Math.round(Math.random()*20);
					const m:TwitchatDataTypes.MessageTikTokLikeData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						channel_id:uid,
						user:fakeUser,
						count,
						streamLikeCount:Math.round(Math.random()*100000)+1234,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE: {
					const m:TwitchatDataTypes.MessageTikTokShareData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						channel_id:uid,
						user:fakeUser,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB: {
					const m:TwitchatDataTypes.MessageTikTokSubData = {
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"youtube",
						type,
						channel_id:uid,
						user:fakeUser,
						months:1,
					};
					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION: {
					const amount = Math.round(Math.random()*50);
					const currency = StoreProxy.twitchCharity.currentCharity?.current_amount.currency || "EUR";
					const goal = !StoreProxy.twitchCharity.currentCharity? amount*10 : StoreProxy.twitchCharity.currentCharity.target_amount.value/Math.pow(10, StoreProxy.twitchCharity.currentCharity.target_amount.decimal_places);
					const raised = !StoreProxy.twitchCharity.currentCharity? amount*5 : StoreProxy.twitchCharity.currentCharity.current_amount.value/Math.pow(10, StoreProxy.twitchCharity.currentCharity.current_amount.decimal_places);
					const message:TwitchatDataTypes.MessageCharityDonationData = {
						id:Utils.getUUID(),
						type:TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION,
						date:Date.now(),
						channel_id:StoreProxy.auth.twitch.user.id,
						platform:"twitch",
						user,
						amount,
						currency,
						amountFormatted: amount + currency,
						goal,
						goalFormatted: goal + currency,
						raised,
						raisedFormatted: raised + currency,
						campaign: {
							id: StoreProxy.twitchCharity.currentCharity?.id || "123",
							title:StoreProxy.twitchCharity.currentCharity?.charity_name || "My Twitch charity campaign",
							url:StoreProxy.twitchCharity.currentCharity?.charity_website || "https://dashboard.twitch.tv/charity",
						},
					};

					// StoreProxy.chat.addMessage(message);
					data = message;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE: {
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const m:TwitchatDataTypes.MessagePrivateModeratorData = {
						id:Utils.getUUID(),
						type:TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE,
						date:Date.now(),
						channel_id:StoreProxy.auth.twitch.user.id,
						platform:"twitch",
						user:fakeUser,
						message:message,
						message_chunks:chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
						action:Utils.pickRand(["dm", "dm_mods", "question", "message"]),
					};

					data = m;
					break;
				}

				case TwitchatDataTypes.TwitchatMessageType.GOAL_STEP_COMPLETE: {
					const fakeStep:TwitchatDataTypes.DonationGoalOverlayConfig["goalList"][number] = {
						amount:132,
						id:"068bdae5-2936-4659-0000-cc2725ca63f8",
						secret:false,
						title:"My amazing step",
					};
					const m:TwitchatDataTypes.MessageGoalStepCompleteData = {
						id:Utils.getUUID(),
						type:TwitchatDataTypes.TwitchatMessageType.GOAL_STEP_COMPLETE,
						date:Date.now(),
						channel_id:StoreProxy.auth.twitch.user.id,
						platform:"twitchat",
						goalConfig: {
							id:"068bdae5-2936-4659-0001-cc2725ca63f8",
							autoDisplay:true,
							color:"#6441a5",
							currency:"USD",
							dataSource:"counter",
							enabled:true,
							goalList: [
								fakeStep,
							],
							hideDelay:0,
							hideDone:true,
							limitEntryCount:false,
							maxDisplayedEntries:1,
							notifyTips:true,
							title:"My amazing goal",
						},
						stepConfig:fakeStep,
						stepIndex:0,
					};

					data = m;
					break;
				}

				default: {
					let message = "The request message type \""+type+"\" is lacking implementation on storeDebug."
					const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
					const m:TwitchatDataTypes.MessageCustomData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:uid,
						style: "error",
						message,
						message_chunks:chunks,
						message_html:TwitchUtils.messageChunksToHTML(chunks),
					};
					data = m;
				}
			}

			data.fake = true;

			data = reactive(data);

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
						message:StoreProxy.i18n.t("global.moderation_action.shield_on", {MODERATOR:user.displayName}),
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
			return await this.simulateMessage<TwitchatDataTypes.ChatMessageTypes>(messageType, (data)=> {
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


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeDebug, import.meta.hot))
}

