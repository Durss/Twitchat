import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import { AD_APPROACHING_INTERVALS } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Logger from '@/utils/Logger';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import TriggerUtils from '@/utils/TriggerUtils';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from "type-fest";
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IStreamActions, type IStreamGetters, type IStreamState } from '../StoreProxy';
import TwitchMessengerClient from '@/messaging/TwitchMessengerClient';
import EventSub from '@/utils/twitch/EventSub';
import staticEmotes from '@/utils/twitch/staticEmoteList.json';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import SetIntervalWorker from '@/utils/SetIntervalWorker';
import SetTimeoutWorker from '@/utils/SetTimeoutWorker';

const commercialTimeouts:{[key:string]:number[]} = {};
let hypeTrainCooldownTo = "";
// Given a user's feedback, "hype train cooldown" notification is sent multiple times
// dunno if i can actually trust them, but just in case this flag makes it so a
// cooldown alert won't be sent again unless a hype train happened in between
// Set to true by default to avoid sending a cooldown alert on first launch
let ignoreHypeTrainCooldown = true;

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
		currentChatChannel:{
			id:"",
			name:"",
			platform:"twitch",
		},
		autoconnectChans:[],
		currentVODUrl:"",
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

			try {
				const list = JSON.parse(DataStore.get(DataStore.AUTOCONNECT_CHANS) || "[]");
				if(Array.isArray(list)) {
					this.autoconnectChans.push(...list);
					this.autoconnectChans.forEach(async chan => {
						StoreProxy.users.getUserFrom(chan.platform, chan.id, chan.id, undefined, undefined, (user)=>{
							this.connectToExtraChan(user);
						}, undefined, undefined, undefined, false);
					})
				}
			}catch(error) {}

			// Get next hype train availability and current VOD URL every hours just in case
			SetIntervalWorker.instance.create(()=>{
				this.scheduleHypeTrainCooldownAlert();
				this.grabCurrentStreamVOD()
			}, 60 * 60 * 1000)
			this.scheduleHypeTrainCooldownAlert();
			this.grabCurrentStreamVOD()
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
				user:StoreProxy.users.getUserFrom(platform, channelId, channelId, undefined, undefined, undefined, undefined, false, undefined, false),
				previewUrl: "",
			};

			if(platform == "twitch") {
				//Load current live infos if any
				TwitchUtils.getCurrentStreamInfo([channelId]).then(async v=> {
					let categoryId = "";
					if(v.length == 0){
						//Fallback to channel info
						const result = await TwitchUtils.getChannelInfo([channelId])
						const chanInfos = result[0]!;
						infos.live		= false;
						infos.title		= chanInfos.title;
						infos.tags		= chanInfos.tags;
						infos.category	= chanInfos.game_name;
						infos.viewers	= 0;
						infos.previewUrl= "";
						categoryId		= chanInfos.game_id;
					}else{
						const info		= v[0]!;
						infos.live		= true;
						infos.title		= info.title;
						infos.tags		= info.tags;
						infos.category	= info.game_name;
						infos.viewers	= info.viewer_count;
						infos.started_at= new Date(info.started_at).getTime();
						infos.previewUrl= info.thumbnail_url.replace("{width}", "1920").replace("{height}", "1080");
						categoryId		= info.game_id;
					}

					if(StoreProxy.auth.twitch.user.id == channelId) {
						const categoryData = await TwitchUtils.getCategoryByID(categoryId);
						if(categoryData) {
							StoreProxy.labels.updateLabelValue("STREAM_TITLE", infos.title);
							StoreProxy.labels.updateLabelValue("STREAM_CATEGORY_NAME", categoryData.name);
							StoreProxy.labels.updateLabelValue("STREAM_CATEGORY_COVER", categoryData.box_art_url.replace("{width}", "138").replace("{height}", "190"));
							StoreProxy.labels.updateLabelValue("VIEWER_COUNT_TWITCH", infos.viewers);
						}
						EventSub.instance.lastChannelUpdateInfos.title = infos.title;
						EventSub.instance.lastChannelUpdateInfos.category = infos.category;
						EventSub.instance.lastChannelUpdateInfos.tags = infos.tags;
						EventSub.instance.lastChannelUpdateInfos.viewers = infos.viewers;
						EventSub.instance.lastChannelUpdateInfos.live = infos.live;
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
			if(this.currentRaid && this.currentRaid.channel_id == StoreProxy.auth.twitch.user.id) {
				this.raidHistory.push({
					uid:this.currentRaid.user.id,
					date:Date.now(),
				});
				//Sort from older to most recent
				this.raidHistory.sort((a,b)=> a.date - b.date);
				//Limit history to 200 entries
				if(this.raidHistory.length > 200) {
					this.raidHistory.shift();
				}
				DataStore.set(DataStore.RAID_HISTORY, this.raidHistory);

				//Send donation reminder if requested
				if(StoreProxy.params.donationReminderEnabled) {
					StoreProxy.params.donationReminderEnabled = false;
					StoreProxy.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.DONATE_REMINDER);
				}
				//Send donation reminder if requested
				if(StoreProxy.params.updatesReminderEnabled) {
					StoreProxy.params.donationReminderEnabled = false;
					StoreProxy.params.openModal("updates");
				}
				//Cut OBS stream if requested
				if(StoreProxy.params.features.stopStreamOnRaid.value === true) {
					window.setTimeout(() => {
						OBSWebsocket.instance.stopStreaming();
					}, 2000);
				}
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
			if(ignoreHypeTrainCooldown) this.scheduleHypeTrainCooldownAlert();
			ignoreHypeTrainCooldown = false;
			this.hypeTrain = data;
			if(data && data.state == "COMPLETED" && data.approached_at) {
				const threshold = 5*60*1000;
				const offset = data.approached_at;
				const activities:(TwitchatDataTypes.MessageSubscriptionData|TwitchatDataTypes.MessageCheerData)[] = [];
				//Search for all the sub and cheer events within the hype train time frame
				for (const m of StoreProxy.chat.messages) {
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
			if(data && (data.state == "EXPIRED" || data.state == "COMPLETED")) {
				// Wait half an hour and check for cooldown before next train
				setTimeout(()=> {
					this.scheduleHypeTrainCooldownAlert();
				}, 30 * 60 *60);

				window.setTimeout(()=> {
					//Hide hype train popin
					StoreProxy.stream.setHypeTrain(undefined);
				}, 5000)
			}
		},

		setPlaybackState(channelId:string, viewerCount:number|undefined) {
			if(!this.currentStreamInfo[channelId]) return;
			if(!viewerCount) {
				this.currentStreamInfo[channelId]!.live = false;
				this.currentStreamInfo[channelId]!.viewers = 0;
			}else{
				this.currentStreamInfo[channelId]!.live = true;
				this.currentStreamInfo[channelId]!.viewers = viewerCount;
			}
		},

		setStreamStart(channelId:string, startedAt?:number):void{
			const emoteOnly = StoreProxy.params.features.offlineEmoteOnly.value;
			const uid = StoreProxy.auth.twitch.user.id;
			if(channelId === uid) {
				StoreProxy.labels.updateLabelValue("STREAM_DURATION", startedAt || Date.now());
				if(emoteOnly){
					TwitchUtils.setRoomSettings(uid, {emotesOnly:false});
				}
				//Give it a minute to twitch after starting stream to schedule ads
				window.setTimeout(()=> {
					TwitchUtils.getAdSchedule();
				}, 60000);
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
				const to = window.setTimeout(()=>{
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
				commercialTimeouts[channelId]!.push(to);
			});

			//Force ad start a little before the timer completes
			//This is a workaround Twitch not starting ad at the given date but only
			//a few seconds to a minute or more after that.
			if(remainingTime > 0) {
				Logger.instance.log("ads", {
					log:"Wait for "+(remainingTime/1000)+"s (with 5s margin) before forcing an ad"
				});
				const to = window.setTimeout(() => {
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
				const to = window.setTimeout(() => {
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
					window.setTimeout(()=> {
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
			const uid2TikTokShare:{[uid:string]:TwitchatDataTypes.StreamSummaryData["tiktokShares"][number]} = {};
			const uid2TikTokLikes:{[uid:string]:TwitchatDataTypes.StreamSummaryData["tiktokLikes"][number]} = {};
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
				powerups:[],
				superChats:[],
				superStickers:[],
				tiktokGifts:[],
				tiktokLikes:[],
				tiktokShares:[],
				patreonMembers:[],
				labels:{
					no_entry:$tm("overlay.credits.empty_slot"),
					train:$tm("train.ending_credits"),
					premium_only:$tm("overlay.credits.premium_only"),
					sub_duration:$tm("overlay.credits.sub_duration"),
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
				//Generate fake messages
				for (let i = 0; i < 500; i++) {
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, undefined, false));
				}
				//Generate fake power-ups
				const emotes = staticEmotes as TwitchDataTypes.Emote[];
				for (let i = 0; i < 20; i++) {
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=>{
						const emote = Utils.pickRand(emotes);
						message.message_chunks.push({type:"emote", value:emote.name, emoteHD:emote.images.url_4x, emote:emote.images.url_1x});
						message.message += " "+emote.name;
						message.twitch_gigantifiedEmote = emote.name;
						message.twitch_gigantifiedEmote_url = emote.images.url_4x || emote.images.url_2x || emote.images.url_1x;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (message)=>{
						message.twitch_animationId = Utils.pickRand(["simmer", "rainbow-eclipse"]);
					}, false));
				}
				//Generate other fake message types
				for (let i = 0; i < 20; i++) {
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
						message.is_resub = true;
						message.is_gift = false;
						message.is_giftUpgrade = false;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION, (message)=>{
						message.is_resub = false;
						message.is_gift = true;
						message.is_giftUpgrade = false;
					}, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageYoutubeSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageYoutubeSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageYoutubeSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageYoutubeSubscriptionData>(TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER, undefined, false));
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
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageTikTokGiftData>(TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageTikTokGiftData>(TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageTikTokGiftData>(TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE, undefined, false));
					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageTikTokGiftData>(TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB, undefined, false));
				}

				//Raid require API calls which are slowing down generation if we request many, only request a few
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

					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageKofiData>(TwitchatDataTypes.TwitchatMessageType.KOFI, (message)=>{
						message.eventType = "subscription";
					}, false));

					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.StreamlabsMerchData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, (message)=>{
						message.eventType = "merch";
						message.product = Utils.pickRand(["T-shirt", "Hoodie", "Hat", "Mug", "Stickers", "Pins"]);
					}, false));

					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.StreamlabsPatreonPledgeData>(TwitchatDataTypes.TwitchatMessageType.STREAMLABS, (message)=>{
						message.eventType = "patreon_pledge";
					}, false));

					messages.push(await StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageTwitchCelebrationData>(TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION, undefined, false));
				}


				//Fake "show all current subs" content
				const fakeUsers = await TwitchUtils.getFakeUsers();
				for (let i = 0; i < Math.min(fakeUsers.length, 20); i++) {
					const user = fakeUsers[i]!;
					const subData:TwitchatDataTypes.StreamSummaryData["subgifts"][number] | TwitchatDataTypes.StreamSummaryData["subs"][number] = {
						uid:user.id,
						login:user.displayNameOriginal,
						tier:Utils.pickRand([1,2,3,"prime"]),
						fromActiveSubs:true,
						platform:"twitch",
					};
					if(i%3 == 0) {
						result.subs.push(subData)
					}else
					if(i%2 == 0) {
						result.resubs.push(subData)
					}else{
						const subgiftData = subData as TwitchatDataTypes.StreamSummaryData["subgifts"][number];
						subgiftData.total = Math.round(Math.random()*100 + 1);
						subgiftData.tier = Utils.pickRand([1,2,3]),
						result.subgifts.push(subgiftData)
					}
				}
			}else{
				//Filter out messages based on the stream duration
				for (let i = StoreProxy.chat.messages.length-1; i >= 0; i--) {
					const m = StoreProxy.chat.messages[i]!;
					if(dateOffset && m.date < dateOffset) break;
					//Ignore messages not from our own chan
					if(m.channel_id != channelId && m.platform != "tiktok") continue;

					//If more than 4h past between the 2 messages, consider it's a different stream and stop there
					if(!dateOffset && prevDate > 0 && prevDate - m.date > 4 * 60 * 60000) {
						result.streamDuration = messages[messages.length - 1]!.date - m.date;
						break;
					}
					messages.push(m);
					prevDate = m.date;
				}


				//Load all currently active subs from Twitch
				const shouldLoadAllsubs = parameters && parameters.slots.filter(v=>v.slotType == "subs")
										.findIndex(v=>v.enabled === true && v.showAllSubs === true) > -1;
				const shouldLoadAllsubgifters = parameters && parameters.slots.filter(v=>v.slotType == "subs")
										.findIndex(v=>v.enabled === true && v.showAllSubgifters === true) > -1;
				if(shouldLoadAllsubs || shouldLoadAllsubgifters) {
					const res = await TwitchUtils.getSubsList(false);
					if(res && res.length) {
						const uidToSubgift:{[uid:string]:TwitchatDataTypes.StreamSummaryData["subgifts"][number]} = {};
						res.forEach(sub=>{
							//Skip ignored users
							if(ignoredAccounts[sub.user_login.toLowerCase()] === true) return;
							//Ignore self
							if(sub.user_id == channelId) return;

							const subData:TwitchatDataTypes.StreamSummaryData["subs"][number] = {
								uid:sub.user_id,
								login:sub.user_name,
								tier:{1000:1, 2000:2, 3000:3, prime:"prime"}[sub.tier] as typeof result.subs[number]["tier"],
								fromActiveSubs:true,
								platform:"twitch",
							};
							result.subs.push(subData);
							if(sub.is_gift){
								const subgiftData:TwitchatDataTypes.StreamSummaryData["subgifts"][number] = uidToSubgift[sub.gifter_id] || {
									platform:"twitch",
									uid:sub.gifter_id,
									login:sub.gifter_name,
									tier:{1000:1, 2000:2, 3000:3, prime:"prime"}[sub.tier] as typeof result.subs[number]["tier"],
									fromActiveSubs:true,
									total:0,
								};
								subgiftData.total ++;
								if(!uidToSubgift[subgiftData.uid]) {
									subgiftData.total = 1;
									uidToSubgift[subgiftData.uid] = subgiftData;
									result.subgifts.push(subgiftData);
								}
							}
						})
					}
				}
			}

			for (const m of messages) {
				let userLogin:string = "";
				let userChaninfo:TwitchatDataTypes.UserChannelInfo | null = null;
				if(m.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
				|| m.type == TwitchatDataTypes.TwitchatMessageType.CHEER
				|| m.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING
				|| m.type == TwitchatDataTypes.TwitchatMessageType.RAID
				|| m.type == TwitchatDataTypes.TwitchatMessageType.REWARD
				|| m.type == TwitchatDataTypes.TwitchatMessageType.SHOUTOUT
				|| m.type == TwitchatDataTypes.TwitchatMessageType.BAN
				|| m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				|| m.type == TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION
				) {
					userLogin = m.user.login;
					userChaninfo = m.user.channelInfo[channelId]!;
				}

				if(m.type == TwitchatDataTypes.TwitchatMessageType.KOFI
				|| m.type == TwitchatDataTypes.TwitchatMessageType.STREAMLABS
				|| m.type == TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS
				|| m.type == TwitchatDataTypes.TwitchatMessageType.TIPEEE){
					userLogin = m.userName;
				}

				//Skip banned users except for bans section
				if(m.type != TwitchatDataTypes.TwitchatMessageType.BAN && userChaninfo?.is_banned) continue;
				//Skip ignored users
				if(ignoredAccounts[userLogin.toLowerCase()] === true) continue;

				switch(m.type) {
					case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
						const sub:typeof result.subs[number] = {uid:m.user.id, login:m.user.displayNameOriginal, tier:m.tier, subDuration:m.totalSubDuration || 1, platform:"twitch"};
						if(m.is_gift || m.is_giftUpgrade) result.subgifts.push( {uid:m.user.id, login:m.user.displayNameOriginal, tier:m.tier, total:m.gift_count || 1, platform:"twitch"} );
						else if(m.is_resub) result.resubs.push(sub);
						else result.subs.push(sub);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION: {
						const sub:typeof result.subs[number] = {uid:m.user.id, login:m.user.displayNameOriginal, tier:1, subDuration:m.months || 1, platform:"youtube"};
						if(m.is_resub) result.resubs.push(sub);
						else result.subs.push(sub);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT: {
						const sub:typeof result.subgifts[number] = {uid:m.user.id, login:m.user.displayNameOriginal, tier:1, total:m.gift_count, platform:"youtube"};
						result.subgifts.push(sub);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB: {
						const sub:typeof result.subs[number] = {uid:m.user.id, login:m.user.displayNameOriginal, tier:1, platform:"tiktok"};
						result.subs.push(sub);
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT: {
						result.superChats.push( {uid:m.user.id, login:m.user.displayNameOriginal, amount: m.amount, currency:m.currency} );
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER: {
						result.superStickers.push( {uid:m.user.id, login:m.user.displayNameOriginal, amount: m.amount, currency:m.currency, stickerUrl:m.sticker_url} );
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.CHEER: {
						const cheer:TwitchatDataTypes.StreamSummaryData['bits'][0] = {uid:m.user.id, login:m.user.displayNameOriginal, bits:m.bits, pinned:m.pinned && m.pinDuration_ms > 0};
						result.bits.push(cheer);
						break;
					}

					/*
					case TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT: {
						if(m.message.user.channelInfo[channelId]?.is_banned) continue;
						if(ignoredAccounts[m.message.user.login.toLowerCase()] === true) continue;
						const hypeChat:TwitchatDataTypes.StreamSummaryData['hypeChats'][0] = {uid:m.message.user.id, login:m.message.user.displayNameOriginal, amount:m.message.twitch_hypeChat!.amount, currency:m.message.twitch_hypeChat!.currency};
						result.hypeChats.push(hypeChat);
						break;
					}
					//*/

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
						const train:TwitchatDataTypes.StreamSummaryData['hypeTrains'][0] = {level:m.train.level, percent:Math.round(m.train.currentValue / m.train.goal * 100)};
						if(m.train.conductor_bits) {
							train.conductorBits = {uid:m.train.conductor_bits.user.id, login:m.train.conductor_bits.user.displayNameOriginal, bits:m.train.conductor_bits.amount};
						}
						if(m.train.conductor_subs) {
							train.conductorSubs = {uid:m.train.conductor_subs.user.id, login:m.train.conductor_subs.user.displayNameOriginal, subs:m.train.conductor_subs.amount};
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
						const chanInfo:TwitchatDataTypes.UserChannelInfo|undefined = m.user.channelInfo[channelId];
						if(!chatters[m.user.id]) {
							chatters[m.user.id] = {
								uid: m.user.id,
								login: m.user.displayNameOriginal,
								count: 0,
								vip: chanInfo?.is_vip || (simulate && Math.random() > .85),
								mod: chanInfo?.is_moderator || (simulate && Math.random() > .95),
								sub: chanInfo?.is_subscriber || (simulate && Math.random() > .75),
								bans: 0,
								tos: 0,
								tosDuration: 0,
							};
							result.chatters.push(chatters[m.user.id]!);
						}

						if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
							chatters[m.user.id]!.count ++;
							if(m.twitch_gigantifiedEmote) {
								result.powerups.push({
									login:m.user.displayNameOriginal,
									type:"gigantifiedemote",
									emoteUrl:m.message_chunks.find(v=>v.type == "emote" && v.value == m.twitch_gigantifiedEmote)?.emoteHD,
								})
							}
							if(m.twitch_animationId) {
								result.powerups.push({
									login:m.user.displayNameOriginal,
									type:"animation",
									skinID:m.twitch_animationId,
								});
							}
						}else
						if(m.type == TwitchatDataTypes.TwitchatMessageType.BAN) {
							if(m.duration_s !!= undefined) {
								chatters[m.user.id]!.tos ++;
								chatters[m.user.id]!.tosDuration += m.duration_s;
							}else{
								chatters[m.user.id]!.bans ++;
							}
						}
						break;
					}
					case TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION: {
						//Twitch API is broken for now, they don't send the emote used for
						//the celebration.
						//Still, I put things in place in anticipation for this fix, so the
						//emote URL is there but invalid for now. It contains "/null/".
						//This condition is here to ignore celebrations until they fix that.
						if(m.emoteURL.indexOf("/null/") === -1) {
							result.powerups.push({
								login:m.user.displayNameOriginal,
								type:"celebration",
								emoteUrl:m.emoteURL,
							});
						}
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.KOFI: {
						if(m.eventType == "donation") {
							const tip:TwitchatDataTypes.StreamSummaryData['tips'][number] = {login:m.userName, amount:m.amount, currency:m.currency, platform:"kofi"};
							result.tips.push(tip);
						}
						if(m.eventType == "subscription") {
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

					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT: {
						result.tiktokGifts.push( {uid:m.user.id, login:m.user.displayNameOriginal, count: m.count, amount: m.diamonds/m.count, imageUrl: m.image} );
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE: {
						let like = uid2TikTokLikes[m.user.id] || {uid:m.user.id, login:m.user.displayNameOriginal, count: 0};
						uid2TikTokLikes[m.user.id] = like;
						if(like.count == 0) {
							result.tiktokLikes.push( like );
						}
						like.count += m.count;
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE: {
						let share = uid2TikTokShare[m.user.id] || {uid:m.user.id, login:m.user.displayNameOriginal, count: 0};
						uid2TikTokShare[m.user.id] = share;
						if(share.count == 0) {
							result.tiktokShares.push( share );
						}
						share.count ++;
						break;
					}

					case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB: {
						result.subs.push( {uid:m.user.id, login:m.user.displayNameOriginal, tier:1, subDuration:m.months, platform:"tiktok"} );
						break;
					}
				}
			}

			const tiers = StoreProxy.patreon.tierList;
			const valueMap = new Map<string, number>();
			tiers.forEach(item => valueMap.set(item.id, item.attributes.amount_cents));

			result.patreonMembers = StoreProxy.patreon.memberList.filter(v=>v.attributes.patron_status == "active_patron")
			.map(v=> {
				//Find entitled tier that has the highest amount value
				let maxId: string | null = null;
				let maxValue = -Infinity;
				(v.relationships.currently_entitled_tiers.data || [{id:""}]).forEach(item => {
					const value = valueMap.get(item.id);
					if (value !== undefined && value > maxValue) {
						maxValue = value;
						maxId = item.id;
					}
				});

				const entry:typeof result.patreonMembers[number]
					= {
						uid:v.id,
						login:v.attributes.full_name,
						months:v.relationships.pledge_history.data.filter(v=>/^(subscription):/.test(v.id)).length,
						tier:maxId || "",
						lifetimeAmount: v.attributes.lifetime_support_cents / 100,
					};
					if(entry.login.trim() == "Noa") {
						console.log(v.relationships.pledge_history.data)
					}
				return entry;
			});

			if(includeParams && parameters!=null) {
				result.params = parameters;

				const startDateBackup = StoreProxy.stream.currentStreamInfo[channelId]!.started_at;
				if(simulate || !startDateBackup) {
					StoreProxy.stream.currentStreamInfo[channelId]!.started_at = dateOffset || (Date.now() - 45 * 60000);
				}

				result.premiumWarningSlots = {};
				//Parse "text" slots placeholders and remove premium-only slots
				for (const slot of result.params.slots) {
					//Remove premium-only slots if not premium
					if(!isPremium && !simulate
					&& TwitchatDataTypes.EndingCreditsSlotDefinitions.find(v=>v.id === slot.slotType)?.premium === true) {
						result.premiumWarningSlots[slot.slotType] = true;
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
			const colors = ["#e04e00","#2eb200","#0500d6","#d600ab","#00d6d3","#e0ae00"]
							.filter(color=> !this.connectedTwitchChans.map(channel=>channel.color).includes(color));
			this.connectedTwitchChans.push({user, color:colors[0]!});
			TwitchMessengerClient.instance.connectToChannel(user.login);
			EventSub.instance.connectToChannel(user);
		},

		async disconnectFromExtraChan(user:TwitchatDataTypes.TwitchatUser):Promise<void> {
			const index = this.connectedTwitchChans.findIndex(entry => entry.user.id === user.id);
			this.connectedTwitchChans.splice(index, 1);
			TwitchMessengerClient.instance.disconnectFromChannel(user.login);
			EventSub.instance.disconnectRemoteChan(user);
		},

		setExtraChanAutoconnectState(user:TwitchatDataTypes.TwitchatUser, pinned:boolean):void {
			const index = this.autoconnectChans.findIndex(v=>v.id == user.id && v.platform == user.platform);
			if(index > -1) this.autoconnectChans.splice(index, 1);
			else this.autoconnectChans.push({id:user.id, platform:user.platform});
			DataStore.set(DataStore.AUTOCONNECT_CHANS, this.autoconnectChans);
		},

		async scheduleHypeTrainCooldownAlert():Promise<void> {
			/*
			const [train] = await TwitchUtils.getHypeTrains(StoreProxy.auth.twitch.user.id);
			if(train && train.event_data.cooldown_end_time) {
				if(hypeTrainCooldownTo) SetTimeoutWorker.instance.delete(hypeTrainCooldownTo);

				const remainingTime = new Date(train.event_data.cooldown_end_time).getTime() - Date.now();
				if(remainingTime <= 0) return;

				hypeTrainCooldownTo = SetTimeoutWorker.instance.create(() => {
					if(ignoreHypeTrainCooldown) return;
					const m:TwitchatDataTypes.MessageHypeTrainCooledDownData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id:StoreProxy.auth.twitch.user.id,
						type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN,
					};
					StoreProxy.chat.addMessage(m)
					ignoreHypeTrainCooldown = true;
				}, remainingTime);
			}
				*/
		},

		async grabCurrentStreamVOD():Promise<void> {
			try {
				const result = await TwitchUtils.getCurrentStreamInfo([StoreProxy.auth.twitch.user.id]);
				if(result.length === 0) return;
				// Get current VOD's URL for trigger's placeholder
				const vod = await TwitchUtils.getVODInfo(result[0]!.id);
				if(vod) {
					StoreProxy.stream.currentVODUrl = vod.url;
				}
			}catch(error) {}
		}

	} as IStreamActions
	& ThisType<IStreamActions
		& UnwrapRef<IStreamState>
		& _StoreWithState<"stream", IStreamState, IStreamGetters, IStreamActions>
		& _StoreWithGetters<IStreamGetters>
		& PiniaCustomProperties
	>,
})


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStream, import.meta.hot))
}
