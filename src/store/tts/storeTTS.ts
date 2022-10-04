import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue';
import type { ITTSActions, ITTSGetters, ITTSState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

export const storeTTS = defineStore('tts', {
	state: () => ({
		speaking: false,
		params: {
			enabled:false,
			volume:1,
			rate:1,
			pitch:1,
			voice:'',
			maxLength:0,
			maxDuration:30,
			timeout:0,
			removeEmotes:true,
			removeURL:true,
			replaceURL:'link',
			inactivityPeriod:0,
			readMessages:false,
			readMessagePatern:'{USER} says: {MESSAGE}',
			readWhispers:false,
			readWhispersPattern:'{USER} whispers: {MESSAGE}',
			readNotices:false,
			readNoticesPattern:'{MESSAGE}',
			readRewards:false,
			readRewardsPattern:"{USER} redeemed reward {REWARD_NAME}",
			readSubs:false,
			readSubsPattern:"{USER} subscribed at tier {TIER}",
			readSubgifts:false,
			readSubgiftsPattern:"{USER} gifted {COUNT} sub tier {TIER} to {RECIPIENTS}",
			readBits:false,
			readBitsMinAmount:0,
			readBitsPattern:"{USER} sent {BITS} bits",
			readRaids:false,
			readRaidsPattern:"{USER} raided with {VIEWERS} viewers",
			readFollow:false,
			readFollowPattern:"{USER} is now following",
			readPolls:false,
			readPollsPattern:"Poll \"{TITLE}\" ended. Winning choice is, {WINNER}",
			readPredictions:false,
			readPredictionsPattern:"Prediction \"{TITLE}\" ended. Winning choice is, {WINNER}",
			readBingos:false,
			readBingosPattern:"{WINNER} won the bingo",
			readRaffle:false,
			readRafflePattern:"{WINNER} won the raffle",
			ttsPerms:{
				broadcaster:true,
				mods:true,
				vips:true,
				subs:true,
				all:true,
				users:""
			},
		},
	} as ITTSState),



	getters: {
	} as ITTSGetters
	& ThisType<UnwrapRef<ITTSState> & _StoreWithGetters<ITTSGetters> & PiniaCustomProperties>
	& _GettersTree<ITTSState>,



	actions: {

		ttsReadMessage(message:TwitchatDataTypes.ChatMessageTypes) {
			TTSUtils.instance.readNow(message);
		},

		ttsReadUser(user:TwitchatDataTypes.TwitchatUser, read:boolean) {
			let list = this.params.ttsPerms.users.toLowerCase().split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);
			
			const index = list.indexOf(user.login);
			if(index > -1) {
				if(!read) list.splice(index, 1);
			}else if(read){
				list.push(user.login);
			}
			list = list.filter(v => v.trim().length > 2);
			this.params.ttsPerms.users = list.join(",");
			if(read) {
				StoreProxy.chat.addMessage({
					type:"notice",
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					message:"User <mark>"+user.displayName+"</mark>'s messages will be read out loud.",
					noticeId:TwitchatDataTypes.TwitchatNoticeType.TTS
				});
			}else{
				StoreProxy.chat.addMessage({
					type:"notice",
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					message:"User <mark>"+user.displayName+"</mark>'s messages won't be read out loud anymore.",
					noticeId:TwitchatDataTypes.TwitchatNoticeType.TTS
				});
			}
		},

		setTTSParams(params:TwitchatDataTypes.TTSParamsData) {
			this.params = params;
			DataStore.set(DataStore.TTS_PARAMS, params);
			TTSUtils.instance.enabled = params.enabled;
		},
	} as ITTSActions
	& ThisType<ITTSActions
		& UnwrapRef<ITTSState>
		& _StoreWithState<"tts", ITTSState, ITTSGetters, ITTSActions>
		& _StoreWithGetters<ITTSGetters>
		& PiniaCustomProperties
	>,
})