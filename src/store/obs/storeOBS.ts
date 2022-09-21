import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import { defineStore } from 'pinia'

export const storeOBS = defineStore('obs', {
	state: () => ({
		connectionEnabled: null as boolean|null,
		sceneCommands: [] as TwitchatDataTypes.OBSSceneCommand[],
		muteUnmuteCommands: {audioSourceName:"", muteCommand:"!mute", unmuteCommand:"!unmute"} as TwitchatDataTypes.OBSMuteUnmuteCommands,
		commandsPermissions: {mods:false, vips:false, subs:false, all:false, users:""} as TwitchatDataTypes.PermissionsData,
	}),



	getters: {
	},



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
	},
})