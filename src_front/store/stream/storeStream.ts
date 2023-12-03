import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { AD_APPROACHING_INTERVALS } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from "type-fest";
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IStreamActions, type IStreamGetters, type IStreamState } from '../StoreProxy';
import Logger from '@/utils/Logger';

const commercialTimeouts:{[key:string]:number[]} = {};

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
		commercial: {},
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
		async loadStreamInfo(platform:TwitchatDataTypes.ChatPlatform, channelId:string):Promise<void> {
			const infos:TwitchatDataTypes.StreamInfo = this.currentStreamInfo[channelId] || {
				title:"",
				category:"",
				started_at:0,
				tags:[],
				live:false,
				viewers:0,
				lastSoDoneDate:0,
				user:StoreProxy.users.getUserFrom(platform, channelId, channelId),
			};

			if(platform == "twitch") {
				//Load current live infos if any
				TwitchUtils.loadCurrentStreamInfo([channelId]).then(async v=> {
					if(v.length == 0){
						//Fallback to channel info
						let [chanInfos] = await TwitchUtils.loadChannelInfo([channelId])
						infos.live		= false;
						infos.title		= chanInfos.title;
						infos.tags		= chanInfos.tags;
						infos.category	= chanInfos.game_name;
						infos.viewers	= 0;
					}else{
						infos.live		= true;
						infos.title		= v[0].title;
						infos.tags		= v[0].tags;
						infos.category	= v[0].game_name;
						infos.viewers	= v[0].viewer_count;
						infos.started_at= new Date(v[0].started_at).getTime();
					}
				});
			}

			this.currentStreamInfo[channelId] = infos;
		},

		async updateStreamInfos(platform:TwitchatDataTypes.ChatPlatform, title:string, categoryID:string, channelId:string, tags?:string[], branded?:boolean, labels?:{id:string, enabled:boolean}[]):Promise<boolean> {
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
				if(this.raidHistory.length > 1000) {
					this.raidHistory.shift();
				}
				DataStore.set(DataStore.RAID_HISTORY, this.raidHistory);
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

		getCommercialInfo(channelId:string):TwitchatDataTypes.CommercialData {
			let info = this.commercial[channelId];
			if(!info) {
				//No data yet, return fake data
				info = {
					remainingSnooze:		0,
					currentAdDuration_ms:	0,
					prevAdStart_at:			0,
					nextAdStart_at:			0,
					nextSnooze_at:			0,
				}
				this.commercial[channelId] = info;
				//Request data asynchronously.
				//This will call the setCommercialInfo() with fresh new data
				TwitchUtils.getAdSchedule();
			}
			return info;
		},

		setCommercialInfo(channelId:string, data:TwitchatDataTypes.CommercialData, adStarter?:TwitchatDataTypes.TwitchatUser, isStart:boolean = false) {
			this.commercial[channelId] = data;

			let startDate:number = 0;
			if(data.prevAdStart_at + data.currentAdDuration_ms >= Date.now()){
				startDate = data.prevAdStart_at;
			}else {
				startDate = data.nextAdStart_at;
			}

			const remainingTime = startDate - Date.now();

			//Cleanup previously scheduled trigger messages
			(commercialTimeouts[channelId] || []).forEach(to=> clearTimeout(to) );
			commercialTimeouts[channelId] = []

			//Re schedule new trigger messages at these given intervals
			AD_APPROACHING_INTERVALS.forEach(ms => {
				//If this interval has already passed, ignore it
				if(remainingTime < ms) return;
				Logger.instance.log("ads", {
					log:"Schedule approaching ad trigger in "+((remainingTime-ms)/1000)+"s"
				});
				//Schedule message
				let to = setTimeout(()=>{
					const message: TwitchatDataTypes.MessageAdBreakApproachingData = {
						platform:"twitch",
						id:Utils.getUUID(),
						date:Date.now(),
						delay_ms:ms,
						type:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_APPROACHING,
						start_at:data.nextAdStart_at,
					};
					Logger.instance.log("ads", {
						log:"Trigger ad approaching in "+(ms/1000)+"s"
					});
					StoreProxy.chat.addMessage(message);
				}, remainingTime - ms);
				//Keep timeout's ref so we can clear it whenever needed
				commercialTimeouts[channelId].push(to);
			});

			//Force ad start a liuttle before the timer completes
			//This is a workaround Twitch not starting ad at the given date but only
			//a few seconds to a minute or more after that.
			if(remainingTime > 0) {
				Logger.instance.log("ads", {
					log:"Wait for "+(remainingTime/1000)+"s (with 5s margin) before forcing an ad"
				});
				let to = setTimeout(() => {
					Logger.instance.log("ads", {
						log:"Approaching timer complete in 5s. Start a "+(data.currentAdDuration_ms/1000)+"s ad"
					});
					TwitchUtils.startCommercial(data.currentAdDuration_ms/1000, channelId);
				}, remainingTime - 5000);
				commercialTimeouts[channelId].push(to);
			}

			if(isStart) {
				//If ad has been started by someone, notify on tchat
				const message:TwitchatDataTypes.MessageAdBreakStartData = {
					type:adStarter? TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START_CHAT : TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START,
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					duration_s:Math.round(data.currentAdDuration_ms / 1000),
					startedBy:adStarter,
				}
				Logger.instance.log("ads", {
					log:"Trigger ad start",
				});
				StoreProxy.chat.addMessage(message);
			}

			//Schedule ad break complete message
			if(startDate + data.currentAdDuration_ms > Date.now()) {
				let to = setTimeout(() => {
					const message:TwitchatDataTypes.MessageAdBreakCompleteData = {
						type:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_COMPLETE,
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						duration_s:Math.round(data.currentAdDuration_ms / 1000),
						startedBy:adStarter,
					}
					Logger.instance.log("ads", {
						log:"Trigger ad complete"
					});
					StoreProxy.chat.addMessage(message);
					setTimeout(()=> {
						TwitchUtils.getAdSchedule();//get fresh new ad schedule data
					}, 10000);
				}, startDate + data.currentAdDuration_ms - Date.now());
				commercialTimeouts[channelId].push(to);
				
				Logger.instance.log("ads", {
					log:"Schedule ad complete trigger in "+((startDate+data.currentAdDuration_ms - Date.now())/1000)+"s"
				});
			}
			
			PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_DATA, (data as unknown) as JsonObject);
		},

		async startCommercial(channelId:string, duration:number, noConfirm:boolean = false):Promise<void> {
			if(isNaN(duration)) duration = 30;
			if(!noConfirm) {
				try {
					await StoreProxy.main.confirm(
						StoreProxy.i18n.t("global.moderation_action.commercial_start_confirm.title"),
						StoreProxy.i18n.t("global.moderation_action.commercial_start_confirm.description", {DURATION:duration})
					);
				}catch(error) {
					return;
				}
			}
			try {
				const res = await TwitchUtils.startCommercial(duration, channelId);
				if(!res || res.length == 0) {
					throw({message:"Invalid "+duration+"s length commercial duration"})
				}
			}catch(error) {
				const e = (error as unknown) as {error:string, message:string, status:number}
				
				const notice:TwitchatDataTypes.MessageNoticeData = {
					id:Utils.getUUID(),
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					platform:"twitchat",
					noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
					message:StoreProxy.i18n.t("error.commercial_start", {DETAILS:e.message || "no detail :("}),
				}
				StoreProxy.chat.addMessage(notice);
			}
		},

		async getSummary(offset:number = 0, includeParams:boolean = false, simulate:boolean = false):Promise<TwitchatDataTypes.StreamSummaryData> {
			const channelId = StoreProxy.auth.twitch.user.id;
			const isPremium = StoreProxy.auth.isPremium;
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

			let dateOffset:number|undefined = offset;
			//No custom offset defined, use the actual start of stream
			if(!offset) dateOffset  = StoreProxy.stream.currentStreamInfo[channelId]?.started_at;

			const messages:TwitchatDataTypes.ChatMessageTypes[] = [];
			const chatters:{[key:string]:TwitchatDataTypes.StreamSummaryData['chatters'][0]} = {};

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
						message.is_resub = false;
						message.is_gift = false;
						message.is_giftUpgrade = false;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (message)=>{
						message.is_resub = false;
						message.is_gift = true;
						message.is_giftUpgrade = false;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (message)=>{
						message.is_resub = true;
						message.is_gift = false;
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
			}else{
				//Filter out messages based on the stream duration
				for (let i = StoreProxy.chat.messages.length-1; i >= 0; i--) {
					const m = StoreProxy.chat.messages[i];
					if(dateOffset && m.date < dateOffset) break;

					//If more than 4h past between the 2 messages, consider it's a different stream and stop there
					if(!dateOffset && prevDate > 0 && prevDate - m.date > 4 * 60 * 60000) {
						result.streamDuration = messages[messages.length - 1].date - m.date;
						break;
					}
					messages.push(m);
					prevDate = m.date;
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

			if(includeParams) {
				//Load ending credits parameters
				const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
				if(json) {
					result.params = JSON.parse(json) as TwitchatDataTypes.EndingCreditsParams;
					
					let startDateBackup = StoreProxy.stream.currentStreamInfo[channelId]!.started_at;
					if(simulate || !startDateBackup) {
						StoreProxy.stream.currentStreamInfo[channelId]!.started_at = dateOffset || (Date.now() - 1 * 3600000 + 23 * 60000 + 45 * 1000);
					}

					//Parse "text" slots placeholders and remove premium-only slots
					for (let i = 0; i < result.params.slots.length; i++) {
						const slot = result.params.slots[i];
						//Remove premium-only slots if not premium
						if(!isPremium && !simulate
						&& TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id === slot.slotType)?.premium === true) {
							result.params.slots.splice(i, 1);
							i--;
						}
						//Parse placeholders on text slots
						if(slot.slotType !== "text") continue;
						if(!slot.text) continue;
						slot.text = await Utils.parseGlobalPlaceholders(slot.text, false);
					}

					StoreProxy.stream.currentStreamInfo[channelId]!.started_at = startDateBackup;
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