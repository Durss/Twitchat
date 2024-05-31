import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { ICommonActions, ICommonGetters, ICommonState } from '../StoreProxy';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/events/TwitchatEvent';
import StoreProxy from '../StoreProxy';
import Utils from '@/utils/Utils';
import OBSWebsocket from '@/utils/OBSWebsocket';

//Contains things shared between app and overlays
//Only keep things necessary for the overlays here !
export const storeCommon = defineStore('common', {
	state: () => ({
		iconCache:{},
		alertData:{
			message:"",
			critical:false,
			showContact:false,
		},
		currentOBSScene:"",
	} as ICommonState),



	getters: {
	} as ICommonGetters
	& ThisType<UnwrapRef<ICommonState> & _StoreWithGetters<ICommonGetters> & PiniaCustomProperties>
	& _GettersTree<ICommonState>,



	actions: {

		initialize(authenticated:boolean):void {
			const sOBS = StoreProxy.obs;
			const sTimer = StoreProxy.timer;
			const sVoice = StoreProxy.voice;

			//Listen for twitchat API event
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TIMERS, ()=> {
				sTimer.broadcastStates();
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.TEXT_UPDATE, (e:TwitchatEvent<{text:string}>)=> {
				sVoice.voiceText.tempText = e.data!.text;
				sVoice.voiceText.finalText = "";
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.RAW_TEXT_UPDATE, (e:TwitchatEvent<{text:string}>)=> {
				sVoice.voiceText.rawTempText = e.data!.text;
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.SPEECH_END, (e:TwitchatEvent<{text:string}>)=> {
				sVoice.voiceText.finalText = e.data!.text;
			});

			PublicAPI.instance.initialize(authenticated);

			//Init OBS connection
			//If params are specified on URL, use them (used by overlays)
			const port = Utils.getQueryParameterByName("obs_port");
			const pass = Utils.getQueryParameterByName("obs_pass");
			const ip = Utils.getQueryParameterByName("obs_ip");
			//If OBS params are on URL, connect
			if(port != null && ip != null) {
				if(sOBS) sOBS.connectionEnabled = true;
				OBSWebsocket.instance.connect(port, pass ?? "", true, ip);
			}
		},

		alert(message:string, isCritical:boolean = false, showContact:boolean = false) {
			this.alertData.message = message;
			this.alertData.critical = isCritical;
			this.alertData.showContact = showContact;
		},

	} as ICommonActions
	& ThisType<ICommonActions
		& UnwrapRef<ICommonState>
		& _StoreWithState<"common", ICommonState, ICommonGetters, ICommonActions>
		& _StoreWithGetters<ICommonGetters>
		& PiniaCustomProperties
	>,
})
