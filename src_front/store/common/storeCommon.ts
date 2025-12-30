import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { ICommonActions, ICommonGetters, ICommonState } from '../StoreProxy';
import StreamdeckSocket from '@/utils/StreamdeckSocket';

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
		theme:"dark",
	} as ICommonState),



	getters: {
	} as ICommonGetters
	& ThisType<UnwrapRef<ICommonState> & _StoreWithGetters<ICommonGetters> & PiniaCustomProperties>
	& _GettersTree<ICommonState>,



	actions: {

		async initialize(authenticated:boolean):Promise<void> {

			PublicAPI.instance.initialize(authenticated);

			//Init OBS connection
			//If params are specified on URL, use them (used by overlays)
			const port = Utils.getQueryParameterByName("obs_port");
			const pass = Utils.getQueryParameterByName("obs_pass");
			const ip = Utils.getQueryParameterByName("obs_ip");
			//If OBS params are on URL, connect
			if(port != null && ip != null) {
				// if(sOBS) sOBS.connectionEnabled = true;
				await OBSWebsocket.instance.connect(port, pass ?? "", true, ip);
			}
			StreamdeckSocket.instance.connect(undefined, authenticated);
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


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeCommon, import.meta.hot))
}