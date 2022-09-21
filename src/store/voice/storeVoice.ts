import DataStore from '@/store/DataStore'
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import type VoiceAction from '@/utils/VoiceAction'
import type { VoicemodTypes } from '@/utils/VoicemodWebSocket'
import { defineStore } from 'pinia'

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
		} as VoicemodTypes.Voice,

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
				users:""
			},
		} as TwitchatDataTypes.VoicemodParamsData,
	}),



	getters: {
	},



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
	},
})