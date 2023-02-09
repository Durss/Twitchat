import DataStore from '@/store/DataStore'
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import type VoiceAction from '@/utils/voice/VoiceAction'
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import type { IVoiceActions, IVoiceGetters, IVoiceState } from '../StoreProxy'

export const storeVoice = defineStore('voice', {
	state: () => ({
		voiceActions: [] as VoiceAction[],
		voiceLang: "en-US",
		voiceText: {
			tempText:"",
			rawTempText:"",
			finalText:"",
		},
		
		voicemodCurrentVoice:{
			voiceID: "nofx",
			friendlyName: "clean",
			image:"",
		},

		voicemodParams: {
			enabled:false,
			voiceIndicator:true,
			commandToVoiceID:{},
			chatCmdPerms:{
				broadcaster:true,
				mods:true,
				vips:false,
				subs:false,
				all:false,
				follower:false,
				follower_duration_ms:0,
				usersAllowed:[],
				usersRefused:[],
			},
		},
	} as IVoiceState),



	getters: {
	} as IVoiceGetters
	& ThisType<UnwrapRef<IVoiceState> & _StoreWithGetters<IVoiceGetters> & PiniaCustomProperties>
	& _GettersTree<IVoiceState>,



	actions: {
		setVoiceLang(value:string) {
			this.voiceLang = value
			DataStore.set("voiceLang", value);
		},

		setVoiceActions(value:VoiceAction[]) {
			this.voiceActions = value;
			DataStore.set("voiceActions", value);
		},
		
		setVoicemodParams(payload:TwitchatDataTypes.VoicemodParamsData) {
			this.voicemodParams = payload;
			DataStore.set(DataStore.VOICEMOD_PARAMS, payload);
		},
	} as IVoiceActions
	& ThisType<IVoiceActions
		& UnwrapRef<IVoiceState>
		& _StoreWithState<"voice", IVoiceState, IVoiceGetters, IVoiceActions>
		& _StoreWithGetters<IVoiceGetters>
		& PiniaCustomProperties
	>,
})