import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IStreamActions, type IStreamGetters, type IStreamState } from '../StoreProxy';
import OBSWebsocket from '@/utils/OBSWebsocket';

export const storeStream = defineStore('stream', {
	state: () => ({
		hypeTrain: undefined,
		currentRaid: undefined,
		playbackState: undefined,
		communityBoostState: undefined,
		streamInfoPreset: [],
		lastRaider: undefined,
		shieldModeEnabled: false,
		canStartAd: true,
		commercialEnd: 0,//Date.now() + 120000,
		startAdCooldown: 0,
		roomSettings:{},//channelId => settings
		currentStreamInfo: {},//channelId => infos
		raidHistory: [],
		// raidHistory: [{
		// 	uid:"152242149",
		// 	date:Date.now() - 15*24*3600000
		// },
		// {
		// 	uid:"43809079",
		// 	date:Date.now() - 9*24*3600000
		// },
		// {
		// 	uid:"152242149",
		// 	date:Date.now() - 12.5*24*3600000
		// },
		// {
		// 	uid:"152242149",
		// 	date:Date.now() - 8.65*24*3600000
		// },
		// {
		// 	uid:"18615783",
		// 	date:Date.now() - 9.5*24*3600000
		// },
		// {
		// 	uid:"53964156",
		// 	date:Date.now() - 16.65*24*3600000
		// },
		// {
		// 	uid:"53964156",
		// 	date:Date.now() - 31.65*24*3600000
		// }],
	} as IStreamState),



	getters: {
	} as IStreamGetters
	& ThisType<UnwrapRef<IStreamState> & _StoreWithGetters<IStreamGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamState>,



	actions: {
		async setStreamInfos(platform:TwitchatDataTypes.ChatPlatform, title:string, categoryID:string, channelId:string, tags?:string[], branded?:boolean, labels?:{id:string, enabled:boolean}[]):Promise<boolean> {
			if(platform == "twitch") {
				if(!await TwitchUtils.setStreamInfos(channelId, title, categoryID, tags, branded, labels)) {
					return false;
				}
				const category = await TwitchUtils.getCategoryByID(categoryID);
				let viewers = 0;
				let live = false;
				let start = Date.now();
				let tagList:string[] = [];
				if(this.currentStreamInfo[channelId]) {
					live = this.currentStreamInfo[channelId]!.live;
					start = this.currentStreamInfo[channelId]!.started_at;
					tagList = this.currentStreamInfo[channelId]!.tags;
					viewers = this.currentStreamInfo[channelId]!.viewers;
				}
				if(tags) tagList = tags;
				this.currentStreamInfo[channelId] = {
					tags:tagList,
					title,
					live,
					viewers,
					started_at:start,
					category:category.name,
					user:StoreProxy.auth.twitch.user,
					lastSoDoneDate:0,
					streamStartedAt_ms:0,
				}
				return true;
			}
			return false;
		},

		setRaiding(infos?:TwitchatDataTypes.RaidInfo) {
			if(!this.currentRaid && infos) {
				const m:TwitchatDataTypes.MessageRaidStartData = {
					date:Date.now(),
					id:Utils.getUUID(),
					platform:"twitch",
					type:TwitchatDataTypes.TwitchatMessageType.RAID_STARTED,
					user:infos!.user,
				}
				StoreProxy.chat.addMessage(m);
			}
			this.currentRaid = infos;
		},

		onRaidComplete() {
			if(this.currentRaid) {
				this.raidHistory.push({
					uid:this.currentRaid.user.id,
					date:Date.now(),
				});
				//Limit history to 100 entries
				if(this.raidHistory.length > 100) {
					this.raidHistory.shift();
				}
			}
			//Send donation reminder if requested
			if(StoreProxy.params.donationReminderEnabled) {
				StoreProxy.params.donationReminderEnabled = false;
				StoreProxy.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.DONATE_REMINDER);
			}
			//Cut OBS stream if requested
			if(StoreProxy.params.features.stopStreamOnRaid.value === true) {
				setTimeout(() => {
					OBSWebsocket.instance.stopStreaming();
				}, 2000);
			}
			this.currentRaid = undefined;
		},

		setRoomSettings(channelId:string, settings:TwitchatDataTypes.IRoomSettings) {
			const roomSettings:TwitchatDataTypes.IRoomSettings = this.roomSettings[channelId] ?? {};
			if(settings.chatDelay != undefined) roomSettings.chatDelay = settings.chatDelay;
			if(settings.emotesOnly != undefined) roomSettings.emotesOnly = settings.emotesOnly;
			if(settings.followOnly != undefined) roomSettings.followOnly = settings.followOnly;
			if(settings.slowMode != undefined) roomSettings.slowMode = settings.slowMode;
			if(settings.subOnly != undefined) roomSettings.subOnly = settings.subOnly;
			this.roomSettings[channelId] = roomSettings;
		},

		setHypeTrain(data:TwitchatDataTypes.HypeTrainStateData|undefined) {
			this.hypeTrain = data;
			if(data && data.state == "COMPLETED" && data.approached_at) {
				const threshold = 5*60*1000;
				const offset = data.approached_at;
				const activities:(TwitchatDataTypes.MessageSubscriptionData|TwitchatDataTypes.MessageCheerData)[] = [];
				//Search for all the sub and cheer events within the hype train time frame
				for (let i = 0; i < StoreProxy.chat.messages.length; i++) {
					const m = StoreProxy.chat.messages[i];
					if(m.type == TwitchatDataTypes.TwitchatMessageType.CHEER
					|| m.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION) {
						//If message is within the train time frame and on the proper channel
						if(m.channel_id == data.channel_id && m.date > offset - threshold) {
							activities.push( m );
						}
					}
				}

				if(activities.length > 0) {
					const res:TwitchatDataTypes.MessageHypeTrainSummaryData = {
						type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY,
						channel_id:StoreProxy.auth.twitch.user.id,
						train:data,
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						activities:activities,
					}
					StoreProxy.chat.addMessage(res);
				}
			}
		},

		setPlaybackState(channelId:string, value:PubSubDataTypes.PlaybackInfo|undefined) {
			if(!this.currentStreamInfo[channelId]) return;
			if(!value) {
				this.currentStreamInfo[channelId]!.live = false;
				this.currentStreamInfo[channelId]!.viewers = 0;
			}else{
				this.currentStreamInfo[channelId]!.live = true;
				this.currentStreamInfo[channelId]!.viewers = value?.viewers;
			}
		},

		setStreamStart(channelId:string):void{
			const emoteOnly = StoreProxy.params.features.offlineEmoteOnly.value;
			const uid = StoreProxy.auth.twitch.user.id;
			if(emoteOnly && channelId === uid){
				TwitchUtils.setRoomSettings(uid, {emotesOnly:false});
			}
		},
		
		setStreamStop(channelId:string):void{
			const emoteOnly = StoreProxy.params.features.offlineEmoteOnly.value;
			const uid = StoreProxy.auth.twitch.user.id;
			if(emoteOnly && channelId === uid){
				TwitchUtils.setRoomSettings(uid, {emotesOnly:true});
			}

			//Send donation reminder if requested
			if(StoreProxy.params.donationReminderEnabled) {
				StoreProxy.params.donationReminderEnabled = false;
				StoreProxy.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.DONATE_REMINDER);
			}
		},

		setCommunityBoost(value:TwitchatDataTypes.CommunityBoost|undefined) { this.communityBoostState = value; },

		saveStreamInfoPreset(preset:TwitchatDataTypes.StreamInfoPreset) {
			const index = this.streamInfoPreset.findIndex(v=> v.id == preset.id);
			if(index > -1) {
				//update existing preset
				this.streamInfoPreset[index] = preset;
			}else{
				//add new preset
				this.streamInfoPreset.push(preset);
			}
			DataStore.set(DataStore.STREAM_INFO_PRESETS, this.streamInfoPreset);
		},

		deleteStreamInfoPreset(preset:TwitchatDataTypes.StreamInfoPreset) {
			const index = this.streamInfoPreset.findIndex(v=> v.id == preset.id);
			if(index > -1) {
				//update existing preset
				this.streamInfoPreset.splice(index, 1);
			}
			DataStore.set(DataStore.STREAM_INFO_PRESETS, this.streamInfoPreset);
		},

		setCommercialEnd(date:number) {
			this.commercialEnd = date;
			if(date === 0) {
				StoreProxy.chat.addMessage({
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					message:StoreProxy.i18n.t("global.moderation_action.commercial_complete"),
					noticeId:TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_COMPLETE
				});
			}else{
				const duration = Math.round((date - Date.now())/1000);
				StoreProxy.chat.addMessage({
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					message:StoreProxy.i18n.t("global.moderation_action.commercial_start", {DURATION:duration}),
					noticeId:TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_COMPLETE
				});
			}
		},

		startCommercial(duration:number):void {
			if(!this.canStartAd) return;
	
			if(isNaN(duration)) duration = 30;
			StoreProxy.main.confirm(
				StoreProxy.i18n.t("global.moderation_action.commercial_start_confirm.title"),
				StoreProxy.i18n.t("global.moderation_action.commercial_start_confirm.description")
			).then(async () => {
				try {
					const res = await TwitchUtils.startCommercial(duration, StoreProxy.auth.twitch.user.id);
					if(res && res.length > 0) {
						this.canStartAd = false;
						this.startAdCooldown = Date.now() + res.retry_after * 1000;
						setTimeout(()=>{
							this.canStartAd = true;
							this.startAdCooldown = 0;
						}, this.startAdCooldown);
						this.setCommercialEnd( Date.now() + res.length * 1000 );
					}
				}catch(error) {
					const e = (error as unknown) as {error:string, message:string, status:number}
					
					const notice:TwitchatDataTypes.MessageNoticeData = {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						platform:"twitchat",
						noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
						message:StoreProxy.i18n.t("error.commercial_start", {DETAILS:e.message}),
					}
					StoreProxy.chat.addMessage(notice);
					if(e.message) {
						StoreProxy.main.alert(e.message);
					}
				}
			}).catch(()=>{/*ignore*/});
		},

		async getSummary(offset:number = 0, includeParams:boolean = false, simulate:boolean = false):Promise<TwitchatDataTypes.StreamSummaryData> {
			const channelId = StoreProxy.auth.twitch.user.id;
			const res = await TwitchUtils.loadCurrentStreamInfo([channelId]);
			let prevDate:number = 0;
			let result:TwitchatDataTypes.StreamSummaryData = {
				streamDuration:0,
				follows:[],
				raids:[],
				subs:[],
				resubs:[],
				subgifts:[],
				bits:[],
				hypeChats:[],
				rewards:[],
				shoutouts:[],
				hypeTrains:[],
				chatters:[],
				polls:[],
				predictions:[],
			};
			if(includeParams) {
				const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
				if(json) {
					result.params = JSON.parse(json) as TwitchatDataTypes.EndingCreditsParams;
				}
			}

			let dateOffset:number|undefined = offset;
			if(res.length > 0) {
				dateOffset = new Date(res[0].started_at).getTime();
				result.streamDuration = Date.now() - dateOffset;
			}

			const messages = simulate? [] : StoreProxy.chat.messages;
			const chatters:{[key:string]:TwitchatDataTypes.StreamSummaryData['chatters'][0]} = {};
			for (let i = messages.length-1; i >= 0; i--) {
				const m = messages[i];
				if(dateOffset && m.date < dateOffset) break;
				//If more than 4h past between the 2 messages, consider it's a different stream and stop there
				if(!dateOffset && prevDate > 0 && prevDate - m.date > 4 * 60 * 60000) {
					result.streamDuration = messages[messages.length - 1].date - m.date;
					break;
				}
				prevDate = m.date;
			}

			if(simulate) {
				//Generate fake data
				for (let i = 0; i < 100; i++) {
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false));
				}
				for (let i = 0; i < 20; i++) {
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.CHEER, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageFollowingData>(TwitchatDataTypes.TwitchatMessageType.FOLLOWING, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (message)=>{
						message.is_gift = false;
						message.is_giftUpgrade = false;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (message)=>{
						message.is_gift = true;
						message.is_giftUpgrade = false;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageHypeChatData>(TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageRewardRedeemData>(TwitchatDataTypes.TwitchatMessageType.REWARD, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageBanData>(TwitchatDataTypes.TwitchatMessageType.BAN, (message)=>{
						delete message.duration_s;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageBanData>(TwitchatDataTypes.TwitchatMessageType.BAN, (message)=>{
						message.duration_s = Math.ceil(Math.random()*666) + 1;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageShoutoutData>(TwitchatDataTypes.TwitchatMessageType.SHOUTOUT, (message)=>{
						message.received = false;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageShoutoutData>(TwitchatDataTypes.TwitchatMessageType.SHOUTOUT, (message)=>{
						message.received = true;
					}, false));
				}

				//Raid require API calls which are slowing down generation if we request many
				for (let i = 0; i < 3; i++) {
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessagePollData>(TwitchatDataTypes.TwitchatMessageType.POLL, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessagePredictionData>(TwitchatDataTypes.TwitchatMessageType.PREDICTION, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageHypeTrainSummaryData>(TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageRaidData>(TwitchatDataTypes.TwitchatMessageType.RAID, undefined, false));
					
				}
			}
			
			for (let i = 0; i < messages.length; i++) {
				const m = messages[i];
				
				switch(m.type) {
					case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
						const sub = {uid:m.user.id, login:m.user.displayNameOriginal, tier:m.tier, total:m.gift_count || 1};
						if(m.is_resub) result.resubs.push(sub);
						else if(m.is_gift || m.is_giftUpgrade) result.subgifts.push(sub);
						else result.subs.push(sub);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.CHEER: {
						const cheer:TwitchatDataTypes.StreamSummaryData['bits'][0] = {uid:m.user.id, login:m.user.displayNameOriginal, bits:m.bits};
						result.bits.push(cheer);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT: {
						const hypeChat:TwitchatDataTypes.StreamSummaryData['hypeChats'][0] = {uid:m.message.user.id, login:m.message.user.displayNameOriginal, amount:m.message.twitch_hypeChat!.amount, currency:m.message.twitch_hypeChat!.currency};
						result.hypeChats.push(hypeChat);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
						const follow:TwitchatDataTypes.StreamSummaryData['follows'][0] = {uid:m.user.id, login:m.user.displayNameOriginal};
						result.follows.push(follow);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.RAID: {
						const raid:TwitchatDataTypes.StreamSummaryData['raids'][0] = {uid:m.user.id, login:m.user.displayNameOriginal, raiders:m.viewers};
						result.raids.push(raid);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.REWARD: {
						const reward:TwitchatDataTypes.StreamSummaryData['rewards'][0] = {uid:m.user.id, login:m.user.displayNameOriginal, reward:{name:m.reward.title, id:m.reward.id, icon:m.reward.icon.hd ?? m.reward.icon.sd}};
						result.rewards.push(reward);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
						const shoutout:TwitchatDataTypes.StreamSummaryData['shoutouts'][0] = {uid:m.user.id, login:m.user.displayNameOriginal, received:m.received, viewers:m.viewerCount};
						result.shoutouts.push(shoutout);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY: {
						const train:TwitchatDataTypes.StreamSummaryData['hypeTrains'][0] = {level:m.train.level, percent:m.train.currentValue};
						result.hypeTrains.push(train);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.POLL: {
						let totalVotes = 0;
						m.choices.forEach(v => totalVotes += v.votes);
						const poll:TwitchatDataTypes.StreamSummaryData['polls'][0] = {title:m.title, votes:totalVotes, choices:m.choices.map(v=> {
							return {title:v.label, votes:v.votes, win:m.winner?.id === v.id};
						})};
						result.polls.push(poll);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
						let totalVotes = 0;
						m.outcomes.forEach(v => totalVotes += v.votes);
						const pred:TwitchatDataTypes.StreamSummaryData['predictions'][0] = {title:m.title, points:totalVotes, outcomes:m.outcomes.map(v=> {
							return {title:v.label, points:v.votes, voters:v.voters, win:m.winner?.id === v.id};
						})};
						result.predictions.push(pred);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.BAN:
					case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
						const chanInfo = m.user.channelInfo[channelId]
						if(!chanInfo) continue;
						if(!chatters[m.user.id]) {
							chatters[m.user.id] = {
								uid: m.user.id,
								login: m.user.displayNameOriginal,
								count: 0,
								vip: chanInfo.is_vip || (simulate && Math.random() > .85),
								mod: chanInfo.is_moderator || (simulate && Math.random() > .95),
								sub: chanInfo.is_subscriber || (simulate && Math.random() > .75),
								bans: 0,
								tos: 0,
								tosDuration: 0,
							};
							result.chatters.push(chatters[m.user.id]);
						}
						
						if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
							chatters[m.user.id].count ++;
						}else
						if(m.type == TwitchatDataTypes.TwitchatMessageType.BAN) {
							if(m.duration_s !!= undefined) {
								chatters[m.user.id].tos ++;
								chatters[m.user.id].tosDuration += m.duration_s;
							}else{
								chatters[m.user.id].bans ++;
							}
						}
						break;
					}
				}
			}

			return result;
		},
		
	} as IStreamActions
	& ThisType<IStreamActions
		& UnwrapRef<IStreamState>
		& _StoreWithState<"stream", IStreamState, IStreamGetters, IStreamActions>
		& _StoreWithGetters<IStreamGetters>
		& PiniaCustomProperties
	>,
})