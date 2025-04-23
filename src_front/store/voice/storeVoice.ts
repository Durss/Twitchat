import DataStore from '@/store/DataStore'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import type VoiceAction from '@/utils/voice/VoiceAction'
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import type { IVoiceActions, IVoiceGetters, IVoiceState } from '../StoreProxy'
import VoiceController from '@/utils/voice/VoiceController'
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket'
import Utils from '@/utils/Utils'
import VoicemodEvent from '@/utils/voice/VoicemodEvent'
import StoreProxy from '../StoreProxy'
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler'

export const storeVoice = defineStore('voice', {
	state: () => ({
		voiceActions: [] as VoiceAction[],
		voiceLang: "en-US",
		voiceText: {
			tempText:"",
			rawTempText:"",
			finalText:"",
		},

		voicemodCurrentVoice:null,

		voicemodParams: {
			enabled:false,
			voiceIndicator:true,
			commandToVoiceID:{},
			chatCmdPerms:Utils.getDefaultPermissions(true, true, false, false, false, false),
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

			/**
			 * Init voicemod voice change event handler
			 */
			VoicemodWebSocket.instance.addEventListener(VoicemodEvent.VOICE_CHANGE, async (e:VoicemodEvent)=> {
				//Execute trigger
				const trigger:TwitchatDataTypes.MessageVoicemodData = {
					id:Utils.getUUID(),
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.VOICEMOD,
					platform:"twitchat",
					voiceID:e.voiceID,
					voiceName:e.voiceName,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(trigger);
			});
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


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeVoice, import.meta.hot))
}
