import DataStore from '@/store/DataStore'
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import type VoiceAction from '@/utils/voice/VoiceAction'
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import type { IVoiceActions, IVoiceGetters, IVoiceState } from '../StoreProxy'
import VoiceController from '@/utils/voice/VoiceController'
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket'
import Utils from '@/utils/Utils'

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
			id:"nofx",
			friendlyName: "clean",
			bitmapChecksum:"",
			enabled:true,
			favorited:false,
			isCustom:false,
			isNew:false,
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
		populateData() {
			//Init Voice control actions
			const voiceActions = DataStore.get("voiceActions");
			if(voiceActions) {
				this.voiceActions = JSON.parse(voiceActions);
			}

			//Init Voice control language
			const voiceLang = DataStore.get("voiceLang");
			if(voiceLang) {
				this.voiceLang = voiceLang;
				VoiceController.instance.lang = voiceLang;
			}

			//Init voicemod
			const voicemodParams = DataStore.get(DataStore.VOICEMOD_PARAMS);
			if(voicemodParams) {
				this.setVoicemodParams(JSON.parse(voicemodParams));
				if(this.voicemodParams.enabled) {
					VoicemodWebSocket.instance.connect().then(()=>{}).catch(()=> {});
				}
			}
		},
		setVoiceLang(value:string) {
			this.voiceLang = value
			DataStore.set(DataStore.VOICE_BOT_LANG, value);
		},

		setVoiceActions(value:VoiceAction[]) {
			this.voiceActions = value;
			DataStore.set(DataStore.VOICE_BOT_ACTIONS, value);
		},

		setVoicemodParams(payload:TwitchatDataTypes.VoicemodParamsData) {
			this.voicemodParams = payload;
			DataStore.set(DataStore.VOICEMOD_PARAMS, payload);
		},

		async handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void>{
			//Check if it's a voicemod command
			if(this.voicemodParams.enabled
			&& this.voicemodParams.commandToVoiceID[cmd]
			&& await Utils.checkPermissions(this.voicemodParams.chatCmdPerms, message.user, message.channel_id)) {
				VoicemodWebSocket.instance.enableVoiceEffect(this.voicemodParams.commandToVoiceID[cmd]);
			}
		},
	} as IVoiceActions
	& ThisType<IVoiceActions
		& UnwrapRef<IVoiceState>
		& _StoreWithState<"voice", IVoiceState, IVoiceGetters, IVoiceActions>
		& _StoreWithGetters<IVoiceGetters>
		& PiniaCustomProperties
	>,
})
