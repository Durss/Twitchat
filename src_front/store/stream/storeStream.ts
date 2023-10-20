import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IStreamActions, type IStreamGetters, type IStreamState } from '../StoreProxy';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { AD_APPROACHING_INTERVALS } from '@/types/TriggerActionDataTypes';

const commercialApproachingTimeouts:{[key:string]:number[]} = {};

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

		getCommercialInfo(channelId:string):TwitchatDataTypes.CommercialData {
			let info = this.commercial[channelId];
			if(!info) {
				//No data yet, return fake data
				info = {
					adCooldown_ms:			0,
					currentAdStart_at:		0,
					remainingSnooze:		0,
					currentAdDuration_ms:	0,
					nextAdStart_at:			Date.now() + 360 * 24 * 60 * 60 * 1000,//Set it a year later to make sure it doesn't impact stuff
					nextSnooze_at:			Date.now() + 360 * 24 * 60 * 60 * 1000,//Set it a year later to make sure it doesn't impact stuff
				}
				this.commercial[channelId] = info;
				//Request data asynchronously.
				//This will call the setCommercialInfo() with fresh new data
				TwitchUtils.getAdSchedule();
			}
			return info;
		},

		setCommercialInfo(channelId:string, data:TwitchatDataTypes.CommercialData, adStarter?:TwitchatDataTypes.TwitchatUser) {
			this.commercial[channelId] = data;
			const remainingTime = data.nextAdStart_at - Date.now();

			//Cleanup previously scheduled trigger messages
			(commercialApproachingTimeouts[channelId] || []).forEach(to=> clearTimeout(to) );
			commercialApproachingTimeouts[channelId] = []

			//Re schedule new trigger messages at these given intervals
			AD_APPROACHING_INTERVALS.forEach(ms => {
				//If this interval has already passed, ignore it
				if(remainingTime < ms) return;
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
					StoreProxy.chat.addMessage(message);
				}, remainingTime - ms);
				//Keep timeout's ref so we can clear it whenever needed
				commercialApproachingTimeouts[channelId].push(to);
			});

			if(data.currentAdStart_at > 0 && data.currentAdDuration_ms > 0) {
				let to = setTimeout(() => {
					const message:TwitchatDataTypes.MessageAdBreakCompleteData = {
						type:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_COMPLETE,
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						duration_s:Math.round(data.currentAdDuration_ms / 1000),
						startedBy:adStarter,
					}
					StoreProxy.chat.addMessage(message);
					TwitchUtils.getAdSchedule();//get fresh new ad schedul data
				}, data.currentAdStart_at - Date.now() + data.currentAdDuration_ms);
				commercialApproachingTimeouts[channelId].push(to);
			}

			if(adStarter) {
				const message:TwitchatDataTypes.MessageAdBreakStartData = {
					type:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START,
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					duration_s:Math.round(data.currentAdDuration_ms / 1000),
					startedBy:adStarter,
				}
				StoreProxy.chat.addMessage(message);
			}
			
		},

		startCommercial(channelId:string, duration:number):void {
			if(!this.canStartAd) return;
	
			if(isNaN(duration)) duration = 30;
			StoreProxy.main.confirm(
				StoreProxy.i18n.t("global.moderation_action.commercial_start_confirm.title"),
				StoreProxy.i18n.t("global.moderation_action.commercial_start_confirm.description")
			).then(async () => {
				try {
					const res = await TwitchUtils.startCommercial(duration, channelId);
					if(res && res.length > 0) {
						this.canStartAd = false;
						this.commercial[channelId].adCooldown_ms = res.retry_after * 1000;
						setTimeout(()=>{
							this.commercial[channelId].adCooldown_ms = 0;
						}, this.commercial[channelId].adCooldown_ms);
					}else{
						throw({message:"Invalid 0s length commercial duration"})
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
			}).catch(()=>{/*ignore*/});
		},

		async getSummary(offset:number = 0):Promise<TwitchatDataTypes.StreamSummaryData> {
			const res = await TwitchUtils.loadCurrentStreamInfo([StoreProxy.auth.twitch.user.id]);
			let prevDate:number = 0;
			let result:TwitchatDataTypes.StreamSummaryData = {
				streamDuration:0,
				follows:[] as {uid:string, login:string}[],
				raids:[] as {uid:string, login:string, raiders:number}[],
				subs:[] as {uid:string, login:string, tier:1|2|3|"prime"}[],
				resubs:[] as {uid:string, login:string, tier:1|2|3|"prime"}[],
				subgifts:[] as {uid:string, login:string, tier:1|2|3|"prime"}[],
				bits:[] as {uid:string, login:string, bits:number}[],
				hypeChats:[] as {uid:string, login:string, amount:number, currency:string}[],
				rewards:[] as {uid:string, login:string, reward:{name:string, id:string, icon:string}}[],
				shoutouts:[] as {uid:string, login:string, received:boolean}[],
				hypeTrains:[] as {level:number, percent:number}[],
			};
			let dateOffset:number|undefined = offset;
			if(res.length > 0) {
				dateOffset = new Date(res[0].started_at).getTime();
				result.streamDuration = Date.now() - dateOffset;
			}

			const messages = StoreProxy.chat.messages;
			for (let i = messages.length-1; i >= 0; i--) {
				const m = messages[i];
				if(dateOffset && m.date < dateOffset) break;
				//If more than 4h past between the 2 messages, consider it's a different stream and stop there
				if(!dateOffset && prevDate > 0 && prevDate - m.date > 4 * 60 * 60000) {
					result.streamDuration = messages[messages.length - 1].date - m.date;
					break;
				}
				prevDate = m.date;
				
				switch(m.type) {
					case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
						const sub = {uid:m.user.id, login:m.user.displayNameOriginal, tier:m.tier};
						if(m.is_resub) result.resubs.push(sub);
						else if(m.is_gift || m.is_giftUpgrade) result.subgifts.push(sub);
						else result.subs.push(sub);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.CHEER: {
						const cheer = {uid:m.user.id, login:m.user.displayNameOriginal, bits:m.bits};
						result.bits.push(cheer);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT: {
						const hypeChat = {uid:m.message.user.id, login:m.message.user.displayNameOriginal, amount:m.message.twitch_hypeChat!.amount, currency:m.message.twitch_hypeChat!.currency};
						result.hypeChats.push(hypeChat);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
						const follow = {uid:m.user.id, login:m.user.displayNameOriginal};
						result.follows.push(follow);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.RAID: {
						const raid = {uid:m.user.id, login:m.user.displayNameOriginal, raiders:m.viewers};
						result.raids.push(raid);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.REWARD: {
						const reward = {uid:m.user.id, login:m.user.displayNameOriginal, reward:{name:m.reward.title, id:m.reward.id, icon:m.reward.icon.hd ?? m.reward.icon.sd}};
						result.rewards.push(reward);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
						const shoutout = {uid:m.user.id, login:m.user.displayNameOriginal, received:m.received};
						result.shoutouts.push(shoutout);
						break;
					}
					
					case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE: {
						const train = {level:m.train.level, percent:m.train.currentValue};
						result.hypeTrains.push(train);
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