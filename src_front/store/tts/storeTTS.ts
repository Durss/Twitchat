import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue';
import type { ITTSActions, ITTSGetters, ITTSState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import type { JsonObject } from 'type-fest';

export const storeTTS = defineStore('tts', {
	state: () => ({
		speaking: false,
		params: {
			elevenlabs_model: "",
			elevenlabs_lang: "",
			elevenlabs_style: 0,
			elevenlabs_similarity: .5,
			elevenlabs_stability: .5,
			enabled:false,
			volume:1,
			rate:1,
			pitch:1,
			voice:{
				id:"",
				platform:"system",
			},
			maxLength:0,
			maxDuration:30,
			timeout:0,
			removeEmotes:true,
			allRemoteChans:true,
			removeURL:true,
			replaceURL:'link',
			inactivityPeriod:0,
			readMessages:false,
			readMessagePatern:"",
			readWhispers:false,
			readWhispersPattern:"",
			readNotices:false,
			readNoticesPattern:"",
			readRewards:false,
			readRewardsPattern:"",
			readSubs:false,
			readSubsPattern:"",
			readSubgifts:false,
			readSubgiftsPattern:"",
			readBits:false,
			readBitsMinAmount:0,
			readBitsPattern:"",
			readRaids:false,
			readRaidsPattern:"",
			readFollow:false,
			readFollowPattern:"",
			readPolls:false,
			readPollsPattern:"",
			readPredictions:false,
			readPredictionsPattern:"",
			readBingos:false,
			readBingosPattern:"",
			readRaffle:false,
			readRafflePattern:"",
			read1stMessageToday:false,
			read1stMessageTodayPattern:"",
			read1stTimeChatters:false,
			read1stTimeChattersPattern:"",
			readMonitored:false,
			readMonitoredPattern:"",
			readRestricted:false,
			readRestrictedPattern:"",
			readAutomod:false,
			readAutomodPattern:"",
			readTimeouts:false,
			readTimeoutsPattern:"",
			readBans:false,
			readBansPattern:"",
			readUnbans:false,
			readUnbansPattern:"",
			readKofiTip:false,
			readKofiTipPattern:"",
			readKofiMerch:false,
			readKofiMerchPattern:"",
			readKofiSub:false,
			readKofiSubPattern:"",
			readStreamlabsTip:false,
			readStreamlabsTipPattern:"",
			readStreamlabsMerch:false,
			readStreamlabsMerchPattern:"",
			readStreamlabsPatreon:false,
			readStreamlabsPatreonPattern:"",
			readStreamelementsTip:false,
			readStreamelementsTipPattern:"",
			ttsPerms:{
				broadcaster:true,
				mods:true,
				vips:true,
				subs:true,
				all:true,
				follower:true,
				follower_duration_ms:0,
				usersAllowed:[],
				usersRefused:[],
			},
		},
	} as ITTSState),



	getters: {
	} as ITTSGetters
	& ThisType<UnwrapRef<ITTSState> & _StoreWithGetters<ITTSGetters> & PiniaCustomProperties>
	& _GettersTree<ITTSState>,



	actions: {

		populateData():void {
			//Init TTS actions
			const tts = DataStore.get(DataStore.TTS_PARAMS);
			if (tts) {
				Utils.mergeRemoteObject(JSON.parse(tts), (this.params as unknown) as JsonObject);
				TTSUtils.instance.enabled = this.params.enabled;
			}
		},

		ttsReadMessage(message:TwitchatDataTypes.ChatMessageTypes) {
			TTSUtils.instance.readNow(message);
		},

		ttsReadUser(user:TwitchatDataTypes.TwitchatUser, read:boolean) {
			let list = this.params.ttsPerms.usersAllowed;
			const index = list.findIndex(v=> v.toLowerCase() == user.login.toLowerCase());
			if(index > -1) {
				//User already there, remove them if requested to stop reading them
				if(!read) list.splice(index, 1);
			}else if(read){
				//User not yet in the list, add them if requested to read them
				list.push(user.login);
			}
			//Remove users whose name is less than 2 chars
			list = list.filter(v => v.trim().length > 2);
			this.params.ttsPerms.usersAllowed = list;
			this.setTTSParams(this.params);//Triggers a server save

			let message = "";
			if(read) {
				message = StoreProxy.i18n.t("tts.on_notice", {USER:user.displayName});
			}else{
				message = StoreProxy.i18n.t("tts.off_notice", {USER:user.displayName});
			}
			StoreProxy.chat.addMessage({
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				id:Utils.getUUID(),
				date:Date.now(),
				platform:user.platform,
				noticeId:TwitchatDataTypes.TwitchatNoticeType.TTS,
				message,
				channel_id:StoreProxy.auth.twitch.user.id,
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

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTTS, import.meta.hot))
}
