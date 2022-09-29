import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import type { PubSubDataTypes } from '@/utils/PubSubDataTypes';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
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
		commercialEnd: 0,//Date.now() + 120000,

		roomStatusParams: {
			followersOnly:	{ type:"toggle", value:false, label:"Followers only", id:301},
			subsOnly:		{ type:"toggle", value:false, label:"Subs only", id:302},
			emotesOnly:		{ type:"toggle", value:false, label:"Emotes only", id:300},
			slowMode:		{ type:"toggle", value:false, label:"Slow mode", id:303}
		},
	} as IStreamState),



	getters: {
	} as IStreamGetters
	& ThisType<UnwrapRef<IStreamState> & _StoreWithGetters<IStreamGetters> & PiniaCustomProperties>
	& _GettersTree<IStreamState>,



	actions: {
		setRaiding(infos:TwitchatDataTypes.RaidInfo|undefined) { this.currentRaid = infos; },

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
						if(m.date > offset - threshold) {
							activities.push( m );
						}
					}
				}
				
				if(activities.length > 0) {
					const res:TwitchatDataTypes.MessageHypeTrainSummaryData = {
						type:"hype_train_summary",
						channel_id:UserSession.instance.twitchUser!.login,
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

		setPlaybackState(value:PubSubDataTypes.PlaybackInfo|undefined) { this.playbackState = value; },

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
					type:"notice",
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					message:"Commercial break complete",
					noticeId:TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_COMPLETE
				});
			}else{
				const duration = Math.round((date - Date.now())/1000);
				StoreProxy.chat.addMessage({
					type:"notice",
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					message:"A commercial just started for "+duration+" seconds",
					noticeId:TwitchatDataTypes.TwitchatNoticeType.COMMERCIAL_COMPLETE
				});
			}
		},
		
	} as IStreamActions
	& ThisType<IStreamActions
		& UnwrapRef<IStreamState>
		& _StoreWithState<"stream", IStreamState, IStreamGetters, IStreamActions>
		& _StoreWithGetters<IStreamGetters>
		& PiniaCustomProperties
	>,
})