import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
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

		handleChatCommand(message:TwitchatDataTypes.MessageChatData, cmd?:string):void {
			if(!cmd) cmd = message.message.trim().split(" ")[0].toLowerCase();
			if(cmd?.length < 2) return;

			//check if it's a command to control an OBS scene
			if(Utils.checkPermissions(this.commandsPermissions, message.user, message.channel_id)) {
				for (let i = 0; i < this.sceneCommands.length; i++) {
					const scene = this.sceneCommands[i];
					if(scene.command.trim().toLowerCase() == cmd) {
						OBSWebsocket.instance.setCurrentScene(scene.scene.sceneName);
					}
				}

				const audioSourceName = this.muteUnmuteCommands.audioSourceName;
				if(audioSourceName) {
					//Check if it's a command to mute/unmute an audio source
					if(cmd == this.muteUnmuteCommands.muteCommand) {
						OBSWebsocket.instance.setMuteState(audioSourceName, true);
					}
					if(cmd == this.muteUnmuteCommands.unmuteCommand) {
						OBSWebsocket.instance.setMuteState(audioSourceName, false);
					}
				}
			}
		},
	} as IOBSActions
	& ThisType<IOBSActions
		& UnwrapRef<IOBSState>
		& _StoreWithState<"obs", IOBSState, IOBSGetters, IOBSActions>
		& _StoreWithGetters<IOBSGetters>
		& PiniaCustomProperties
	>,
})