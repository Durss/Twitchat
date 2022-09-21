import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import IRCClient from '@/utils/IRCClient';
import { getTwitchatMessageType, TwitchatMessageType, type ActivityFeedData, type IRCEventDataList } from '@/utils/IRCEventDataTypes';
import type { PubSubDataTypes } from '@/utils/PubSubDataTypes'
import { defineStore } from 'pinia'
import { storeChat } from '../chat/storeChat';

export const storeStream = defineStore('stream', {
	state: () => ({
		hypeTrain: undefined as TwitchatDataTypes.HypeTrainStateData|undefined,
		raiding: undefined as PubSubDataTypes.RaidInfos|undefined,
		playbackState: undefined as PubSubDataTypes.PlaybackInfo|undefined,
		communityBoostState: undefined as PubSubDataTypes.CommunityBoost|undefined,
		streamInfoPreset: [] as TwitchatDataTypes.StreamInfoPreset[],
		lastRaiderLogin: undefined as string|undefined,
		commercialEnd: 0,//Date.now() + 120000,

		roomStatusParams: {
			followersOnly:	{ type:"toggle", value:false, label:"Followers only", id:301},
			subsOnly:		{ type:"toggle", value:false, label:"Subs only", id:302},
			emotesOnly:		{ type:"toggle", value:false, label:"Emotes only", id:300},
			slowMode:		{ type:"toggle", value:false, label:"Slow mode", id:303}
		} as TwitchatDataTypes.IRoomStatusCategory,
	}),



	getters: {
	},



	actions: {
		setRaiding(infos:PubSubDataTypes.RaidInfos|undefined) {this.raiding = infos; },

		setHypeTrain(data:TwitchatDataTypes.HypeTrainStateData|undefined) {
			const sChat = storeChat();
			this.hypeTrain = data;
			
			if(data && data.state == "COMPLETED" && data.approached_at) {
				const threshold = 5*60*1000;
				const offset = data.approached_at;
				const activities:ActivityFeedData[] = [];
				for (let i = 0; i < sChat.activityFeed.length; i++) {
					const el = sChat.activityFeed[i];
					if(!el.tags['tmi-sent-ts']) continue;
					let timestamp = el.tags['tmi-sent-ts'];
					//If receiving a timestamp, convert it to number as the Date constructor
					//accept either a number or a fully formated date/time string but not
					//a timestamp string
					const ts = parseInt(timestamp).toString() == timestamp? parseInt(timestamp) : timestamp;
					const date = new Date(ts).getTime();
					const type = getTwitchatMessageType(el);
					if(type == TwitchatMessageType.BITS
					|| type == TwitchatMessageType.SUB
					|| type == TwitchatMessageType.SUB_PRIME
					|| type == TwitchatMessageType.SUBGIFT
					|| type == TwitchatMessageType.SUBGIFT_UPGRADE) {
						if(date > offset - threshold) {
							activities.push( el );
						}
					}
				}
				
				if(activities.length > 0) {
					const res:IRCEventDataList.HypeTrainResult = {
						type:"hype_train_end",
						train:data,
						activities,
						tags: {
							id:IRCClient.instance.getFakeGuid(),
							"tmi-sent-ts": Date.now().toString()
						},
					}
					sChat.addChatMessage(res);
				}
			}
		},

		setPlaybackState(value:PubSubDataTypes.PlaybackInfo|undefined) { this.playbackState = value; },

		setCommunityBoost(value:PubSubDataTypes.CommunityBoost|undefined) { this.communityBoostState = value; },

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
				IRCClient.instance.sendNotice("commercial", "Commercial break complete");
			}else{
				const duration = Math.round((date - Date.now())/1000)
				IRCClient.instance.sendNotice("commercial", "A commercial just started for "+duration+" seconds");
			}
		},
		
	},
})