import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IStreamActions, type IStreamGetters, type IStreamState } from '../StoreProxy';

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
	} as IStreamState),



	getters: {
	} as IStreamGetters
	& ThisType<UnwrapRef<IStreamState> & _StoreWithGetters<IStreamGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamState>,



	actions: {
		setRaiding(infos:TwitchatDataTypes.RaidInfo|undefined) { this.currentRaid = infos; },

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
			if(data) console.log("SET", data.state);
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
						if(m.date > offset - threshold) {
							activities.push( m );
						}
					}
				}

				console.log("ACTIVITIES LEN", activities.length);
				
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

		setPlaybackState(channelId:string, value:PubSubDataTypes.PlaybackInfo|undefined) { this.playbackState = value; },

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

		startAd(duration:number):void {
			if(!this.canStartAd) return;
	
			if(isNaN(duration)) duration = 30;
			StoreProxy.main.confirm(
				StoreProxy.i18n.t("global.moderation_action.commercial_start_confirm.title"),
				StoreProxy.i18n.t("global.moderation_action.commercial_start_confirm.description")
			).then(async () => {
				try {
					const res = await TwitchUtils.startCommercial(duration, StoreProxy.auth.twitch.user.id);
					if(res.length > 0) {
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
					console.log(error);
					
					const notice:TwitchatDataTypes.MessageNoticeData = {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						platform:"twitchat",
						noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
						message:StoreProxy.i18n.t("error.commercial_start", {DETAILS:e.message}),
					}
					StoreProxy.chat.addMessage(notice);
					// this.$store("store").state.alert = "An unknown error occured when starting commercial"
				}
			}).catch(()=>{/*ignore*/});
		},
		
	} as IStreamActions
	& ThisType<IStreamActions
		& UnwrapRef<IStreamState>
		& _StoreWithState<"stream", IStreamState, IStreamGetters, IStreamActions>
		& _StoreWithGetters<IStreamGetters>
		& PiniaCustomProperties
	>,
})