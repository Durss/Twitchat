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
			readMessagePatern:StoreProxy.i18n.tm("tts.patterns.readMessagePatern"),
			readWhispers:false,
			readWhispersPattern:StoreProxy.i18n.tm("tts.patterns.readWhispersPattern"),
			readNotices:false,
			readNoticesPattern:StoreProxy.i18n.tm("tts.patterns.readNoticePattern"),
			readRewards:false,
			readRewardsPattern:StoreProxy.i18n.tm("tts.patterns.readRewardsPattern"),
			readSubs:false,
			readSubsPattern:StoreProxy.i18n.tm("tts.patterns.readSubsPattern"),
			readSubgifts:false,
			readSubgiftsPattern:StoreProxy.i18n.tm("tts.patterns.readSubgiftsPattern"),
			readBits:false,
			readBitsMinAmount:0,
			readBitsPattern:StoreProxy.i18n.tm("tts.patterns.readBitsPattern"),
			readRaids:false,
			readRaidsPattern:StoreProxy.i18n.tm("tts.patterns.readRaidsPattern"),
			readFollow:false,
			readFollowPattern:StoreProxy.i18n.tm("tts.patterns.readFollowPattern"),
			readPolls:false,
			readPollsPattern:StoreProxy.i18n.tm("tts.patterns.readPollsPattern"),
			readPredictions:false,
			readPredictionsPattern:StoreProxy.i18n.tm("tts.patterns.readPredictionsPattern"),
			readBingos:false,
			readBingosPattern:StoreProxy.i18n.tm("tts.patterns.readBingosPattern"),
			readRaffle:false,
			readRafflePattern:StoreProxy.i18n.tm("tts.patterns.readRafflePattern"),
			read1stTimeChatters:false,
			read1stTimeChattersPattern:StoreProxy.i18n.tm("tts.patterns.read1stTimeChattersPattern"),
			readAutomod:false,
			readAutomodPattern:StoreProxy.i18n.tm("tts.patterns.readAutomodPattern"),
			ttsPerms:{
				broadcaster:true,
				mods:true,
				vips:true,
				subs:true,
				all:true,
				follower:true,
				follower_duration_ms:0,
				users:""
			},
			readUsers:[],
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
			let list = this.params.readUsers;
			const index = list.indexOf(user.login);
			if(index > -1) {
				if(!read) list.splice(index, 1);
			}else if(read){
				list.push(user.login);
			}
			list = list.filter(v => v.trim().length > 2);
			this.params.ttsPerms.users = list.join(",");
			this.setTTSParams(this.params);//Triggers a server save

			let message = "";
			if(read) {
				message = StoreProxy.i18n.t("tts.on_notice", {USER:user.displayName});
			}else{
				message = StoreProxy.i18n.t("tts.on_notice", {USER:user.displayName});
			}
			StoreProxy.chat.addMessage({
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				id:Utils.getUUID(),
				date:Date.now(),
				platform:user.platform,
				noticeId:TwitchatDataTypes.TwitchatNoticeType.TTS,
				message,
			});
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