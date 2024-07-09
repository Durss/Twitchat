import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { AD_APPROACHING_INTERVALS } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Logger from '@/utils/Logger';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import TriggerUtils from '@/utils/TriggerUtils';
import Utils from '@/utils/Utils';
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from "type-fest";
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IStreamActions, type IStreamGetters, type IStreamState } from '../StoreProxy';
import TwitchMessengerClient from '@/messaging/TwitchMessengerClient';

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
		connectedTwitchChans:[],
	} as IStreamState),



	getters: {
	} as IStreamGetters
	& ThisType<UnwrapRef<IStreamState> & _StoreWithGetters<IStreamGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamState>,



	actions: {
		populateData():void {
			//Init stream info presets
			const presets = DataStore.get(DataStore.STREAM_INFO_PRESETS);
			if(presets) {
				this.streamInfoPreset = JSON.parse(presets);
			}

			//Init raid history
			const raidHistoryParams = DataStore.get(DataStore.RAID_HISTORY);
			if(raidHistoryParams) {
				this.raidHistory = JSON.parse(raidHistoryParams);
			}
		},

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
				TwitchUtils.getCurrentStreamInfo([channelId]).then(async v=> {
					if(v.length == 0){
						//Fallback to channel info
						const [chanInfos] = await TwitchUtils.getChannelInfo([channelId])
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

		async updateStreamInfos(platform:TwitchatDataTypes.ChatPlatform, channelId:string, title?:string, categoryID?:string, tags?:string[], branded?:boolean, labels?:{id:string, enabled:boolean}[]):Promise<boolean> {
			if(platform == "twitch") {
				if(!await TwitchUtils.setStreamInfos(channelId, title, categoryID, tags, branded, labels)) {
					return false;
				}
				const infos = this.currentStreamInfo[channelId];
				if(infos) {
					if(tags) infos.tags = tags;
					if(title) infos.title = title;
					if(categoryID) infos.category = (await TwitchUtils.getCategoryByID(categoryID))?.name;
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
					channel_id:infos.channel_id
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
				//Limit history to 200 entries
				if(this.raidHistory.length > 200) {
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
			//Give it a minute to twitch after starting stream to schedule ads
			setTimeout(()=> {
				TwitchUtils.getAdSchedule();
			}, 60000);
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

			//Unschedul ad events
			(commercialTimeouts[channelId] || []).forEach(to=> clearTimeout(to) );
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

		setCommercialInfo(channelId:string, data:TwitchatDataTypes.CommercialData, adStarter?:TwitchatDataTypes.TwitchatUser, isManualStart:boolean = false) {
			this.commercial[channelId] = data;

			let startDate = 0;
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
				const to = setTimeout(()=>{
					const message: TwitchatDataTypes.MessageAdBreakApproachingData = {
						platform:"twitch",
						id:Utils.getUUID(),
						date:Date.now(),
						delay_ms:ms,
						type:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_APPROACHING,
						start_at:data.nextAdStart_at,
						channel_id:channelId,
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
				const to = setTimeout(() => {
					Logger.instance.log("ads", {
						log:"Approaching timer complete in 5s. Start a "+(data.currentAdDuration_ms/1000)+"s ad"
					});
					TwitchUtils.startCommercial(data.currentAdDuration_ms/1000, channelId).catch(errror =>{
						//ignore
					});
				}, remainingTime - 5000);
				commercialTimeouts[channelId].push(to);
			}

			if(isManualStart) {
				//If ad has been started by someone, notify on tchat
				const message:TwitchatDataTypes.MessageAdBreakStartData = {
					type:adStarter? TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START_CHAT : TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START,
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					duration_s:Math.round(data.currentAdDuration_ms / 1000),
					startedBy:adStarter,
					channel_id:channelId,
				}
				Logger.instance.log("ads", {
					log:"Trigger ad start",
				});
				StoreProxy.chat.addMessage(message);
			}

			//Schedule ad break complete message
			if(startDate + data.currentAdDuration_ms > Date.now()) {
				const to = setTimeout(() => {
					const message:TwitchatDataTypes.MessageAdBreakCompleteData = {
						type:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_COMPLETE,
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						duration_s:Math.round(data.currentAdDuration_ms / 1000),
						startedBy:adStarter,
						channel_id:channelId,
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
					channel_id:channelId,
				}
				StoreProxy.chat.addMessage(notice);
			}
		},

		async getSummary(offset:number = 0, includeParams:boolean = false, simulate:boolean = false):Promise<TwitchatDataTypes.StreamSummaryData> {
			const channelId = StoreProxy.auth.twitch.user.id;
			const isPremium = StoreProxy.auth.isPremium;
			let prevDate = 0;
			const $tm = StoreProxy.i18n.tm;
			const result:TwitchatDataTypes.StreamSummaryData = {
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
				tips:[],
				merch:[],
				labels:{
					no_entry:$tm("overlay.credits.empty_slot"),
					train:$tm("train.ending_credits"),
					premium_only:$tm("overlay.credits.premium_only"),
				}
			};

			let dateOffset:number|undefined = offset;
			//No custom offset defined, use the actual start of stream
			if(!offset) dateOffset  = StoreProxy.stream.currentStreamInfo[channelId]?.started_at;

			const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
			let parameters:TwitchatDataTypes.EndingCreditsParams|null = null;
			let ignoredAccounts:{[key:string]:boolean} = {};
			if(json) {
				parameters = JSON.parse(json) as TwitchatDataTypes.EndingCreditsParams;
				if(parameters.ignoreBots) {
					ignoredAccounts = JSON.parse(JSON.stringify(StoreProxy.users.knownBots.twitch))
					if((parameters.ignoreCustomBots || []).length > 0) {
						parameters.ignoreCustomBots.forEach(v=> {
							ignoredAccounts[v.toLowerCase()] = true;
						});
					}
				}
			}
			const messages:TwitchatDataTypes.ChatMessageTypes[] = [];
			const chatters:{[key:string]:TwitchatDataTypes.StreamSummaryData['chatters'][0]} = {};

			if(simulate) {
				//Generate fake data
				for (let i = 0; i < 500; i++) {
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false));
				}
				for (let i = 0; i < 20; i++) {
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageCheerData>(TwitchatDataTypes.TwitchatMessageType.CHEER, (message)=>{
						if(Math.random() > .5) {
							message.pinned = true;
							message.pinDuration_ms = 360000;
							message.pinLevel = Utils.pickRand([0,1,2,3,4,5,6,7,8,9]);
						}
					}, false));
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

					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.KofiDonationData>(TwitchatDataTypes.TwitchatMessageType.KOFI, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageTipeeeDonationData>(TwitchatDataTypes.TwitchatMessageType.TIPEEE, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.StreamlabsDonationData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.StreamlabsDonationData>(TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS, undefined, false));

					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.KofiMerchData>(TwitchatDataTypes.TwitchatMessageType.KOFI, (message)=>{
						message.eventType = "merch";
						message.products = [{id:"123456", name:Utils.pickRand(["T-shirt", "Hoodie", "Hat", "Mug", "Stickers", "Pins"]), quantity:1}, {id:"234561", name:Utils.pickRand(["T-shirt", "Hoodie", "Hat", "Mug", "Stickers", "Pins"]), quantity:1}];
					}, false));

					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.StreamlabsMerchData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, (message)=>{
						message.eventType = "merch";
						message.product = Utils.pickRand(["T-shirt", "Hoodie", "Hat", "Mug", "Stickers", "Pins"]);
					}, false));

					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.StreamlabsPatreonPledgeData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, (message)=>{
						message.eventType = "patreon_pledge";
					}, false));
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
						if(m.user.channelInfo[channelId]?.is_banned) continue;
						if(ignoredAccounts[m.user.login.toLowerCase()] === true) continue;
						const sub = {uid:m.user.id, login:m.user.displayNameOriginal, tier:m.tier, total:m.gift_count || 1};
						if(m.is_resub) result.resubs.push(sub);
						else if(m.is_gift || m.is_giftUpgrade) result.subgifts.push(sub);
						else result.subs.push(sub);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.CHEER: {
						if(m.user.channelInfo[channelId]?.is_banned) continue;
						if(ignoredAccounts[m.user.login.toLowerCase()] === true) continue;
						const cheer:TwitchatDataTypes.StreamSummaryData['bits'][0] = {uid:m.user.id, login:m.user.displayNameOriginal, bits:m.bits, pinned:m.pinned && m.pinDuration_ms > 0};
						result.bits.push(cheer);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT: {
						if(m.message.user.channelInfo[channelId]?.is_banned) continue;
						if(ignoredAccounts[m.message.user.login.toLowerCase()] === true) continue;
						const hypeChat:TwitchatDataTypes.StreamSummaryData['hypeChats'][0] = {uid:m.message.user.id, login:m.message.user.displayNameOriginal, amount:m.message.twitch_hypeChat!.amount, currency:m.message.twitch_hypeChat!.currency};
						result.hypeChats.push(hypeChat);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
						if(m.user.channelInfo[channelId]?.is_banned) continue;
						if(ignoredAccounts[m.user.login.toLowerCase()] === true) continue;
						const follow:TwitchatDataTypes.StreamSummaryData['follows'][0] = {uid:m.user.id, login:m.user.displayNameOriginal};
						result.follows.push(follow);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.RAID: {
						if(m.user.channelInfo[channelId]?.is_banned) continue;
						if(ignoredAccounts[m.user.login.toLowerCase()] === true) continue;
						const raid:TwitchatDataTypes.StreamSummaryData['raids'][0] = {uid:m.user.id, login:m.user.displayNameOriginal, raiders:m.viewers};
						result.raids.push(raid);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.REWARD: {
						if(m.user.channelInfo[channelId]?.is_banned) continue;
						if(ignoredAccounts[m.user.login.toLowerCase()] === true) continue;
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
						let bits = 0;
						let subs = 0;
						if(m.train.conductor_bits) {
							m.train.conductor_bits.contributions.forEach(v=> bits += v.bits || 0);
						}
						if(m.train.conductor_subs) {
							m.train.conductor_subs.contributions.forEach(v=> {
								subs += v.sub_t1 || 0;
								subs += v.sub_t2 || 0;
								subs += v.sub_t3 || 0;
								subs += v.subgift_t1 || 0;
								subs += v.subgift_t2 || 0;
								subs += v.subgift_t3 || 0;
							});
						}
						const train:TwitchatDataTypes.StreamSummaryData['hypeTrains'][0] = {level:m.train.level, percent:m.train.currentValue};
						if(m.train.conductor_bits) {
							train.conductorBits = {uid:m.train.conductor_bits.user.id, login:m.train.conductor_bits.user.displayNameOriginal, bits};
						}
						if(m.train.conductor_subs) {
							train.conductorSubs = {uid:m.train.conductor_subs.user.id, login:m.train.conductor_subs.user.displayNameOriginal, subs};
						}
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
						if(ignoredAccounts[m.user.login.toLowerCase()] === true) continue;
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
							if(chanInfo.is_banned) continue;
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

					case TwitchatDataTypes.TwitchatMessageType.KOFI: {
						if(m.eventType == "donation" || m.eventType == "subscription") {
							const tip:TwitchatDataTypes.StreamSummaryData['tips'][number] = {login:m.userName, amount:m.amount, currency:m.currency, platform:"kofi"};
							result.tips.push(tip);
						}
						if(m.eventType == "merch") {
							const merch:TwitchatDataTypes.StreamSummaryData['merch'][number] = {login:m.userName, products:m.products.map(v=>v.name!), total:m.amount, currency:m.currency, platform:"kofi"};
							result.merch.push(merch);
						}
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.STREAMLABS: {
						if(m.eventType == "donation") {
							const tip:TwitchatDataTypes.StreamSummaryData['tips'][number] = {login:m.userName, amount:m.amount, currency:m.currency, platform:"streamlabs"};
							result.tips.push(tip);
						}
						if(m.eventType == "patreon_pledge") {
							const tip:TwitchatDataTypes.StreamSummaryData['tips'][number] = {login:m.userName, amount:m.amount, currency:m.currency, platform:"patreon"};
							result.tips.push(tip);
						}
						if(m.eventType == "merch") {
							const merch:TwitchatDataTypes.StreamSummaryData['merch'][number] = {login:m.userName, products:[m.product], total:-1, currency:"", platform:"streamlabs"};
							result.merch.push(merch);
						}
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS: {
						if(m.eventType == "donation") {
							const tip:TwitchatDataTypes.StreamSummaryData['tips'][number] = {login:m.userName, amount:m.amount, currency:m.currency, platform:"streamelements"};
							result.tips.push(tip);
						}
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.TIPEEE: {
						if(m.eventType == "donation") {
							const tip:TwitchatDataTypes.StreamSummaryData['tips'][number] = {login:m.userName, amount:m.amount, currency:m.currency, platform:"tipeee"};
							result.tips.push(tip);
						}
						break;
					}
				}
			}

			if(includeParams && parameters!=null) {
				result.params = parameters;

				const startDateBackup = StoreProxy.stream.currentStreamInfo[channelId]!.started_at;
				if(simulate || !startDateBackup) {
					StoreProxy.stream.currentStreamInfo[channelId]!.started_at = dateOffset || (Date.now() - 45 * 60000);
				}

				//Parse "text" slots placeholders and remove premium-only slots
				for (let i = 0; i < result.params.slots.length; i++) {
					const slot = result.params.slots[i];
					//Remove premium-only slots if not premium
					if(!isPremium && !simulate
					&& TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id === slot.slotType)?.premium === true) {
						// result.params.slots.splice(i, 1);
						slot.showPremiumWarning = true;
						// i--;
					}
					//Parse placeholders on text slots
					if(slot.slotType !== "text") continue;
					if(!slot.text) continue;
					slot.text = await TriggerUtils.parseGlobalPlaceholders(slot.text, false);
				}

				StoreProxy.stream.currentStreamInfo[channelId]!.started_at = startDateBackup;
			}

			return result;
		},

		async connectToExtraChan(user:TwitchatDataTypes.TwitchatUser):Promise<void> {
			const colors = ["#e04e00","#e0ae00","#2eb200","#00d6d3","#0500d6","d600ab","#dc9e7d","#fddf78","#98fa76","#a5a3ff","#ff7de5"];
			this.connectedTwitchChans.push({user, color:colors[this.connectedTwitchChans.length % colors.length]});
			TwitchMessengerClient.instance.connectToChannel(user.login);
		},
		
		async disconnectFromExtraChan(user:TwitchatDataTypes.TwitchatUser):Promise<void> {
			const index = this.connectedTwitchChans.findIndex(entry => entry.user.id === user.id);
			this.connectedTwitchChans.splice(index, 1);
			TwitchMessengerClient.instance.disconnectFromChannel(user.login);
		}

	} as IStreamActions
	& ThisType<IStreamActions
		& UnwrapRef<IStreamState>
		& _StoreWithState<"stream", IStreamState, IStreamGetters, IStreamActions>
		& _StoreWithGetters<IStreamGetters>
		& PiniaCustomProperties
	>,
})
