import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IOBSActions, IOBSGetters, IOBSState } from '../StoreProxy';

export const storeOBS = defineStore('obs', {
	state: () => ({
		connectionEnabled: null,
		sceneCommands: [],
		muteUnmuteCommands: {audioSourceName:"", muteCommand:"!mute", unmuteCommand:"!unmute"},
		commandsPermissions: {broadcaster:true, mods:false, vips:false, subs:false, all:false, users:""},
	} as IOBSState),



	getters: {
	} as IOBSGetters
	& ThisType<UnwrapRef<IOBSState> & _StoreWithGetters<IOBSGetters> & PiniaCustomProperties>
	& _GettersTree<IOBSState>,



	actions: {
		setOBSSceneCommands(value:TwitchatDataTypes.OBSSceneCommand[]) {
			this.sceneCommands = value;
			DataStore.set(DataStore.OBS_CONF_SCENES, value);
		},

		setOBSMuteUnmuteCommands(value:TwitchatDataTypes.OBSMuteUnmuteCommands) {
			this.muteUnmuteCommands = value;
			DataStore.set(DataStore.OBS_CONF_MUTE_UNMUTE, value);
		},

		setObsCommandsPermissions(value:TwitchatDataTypes.PermissionsData) {
			this.commandsPermissions = value;
			DataStore.set(DataStore.OBS_CONF_PERMISSIONS, value);
		},
	} as IOBSActions
	& ThisType<IOBSActions
		& UnwrapRef<IOBSState>
		& _StoreWithState<"obs", IOBSState, IOBSGetters, IOBSActions>
		& _StoreWithGetters<IOBSGetters>
		& PiniaCustomProperties
	>,
})