import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebsocket, { type OBSInputItem } from '@/utils/OBSWebsocket';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IOBSActions, IOBSGetters, IOBSState } from '../StoreProxy';
import type { JsonObject } from 'type-fest';
import TwitchatEvent from '@/events/TwitchatEvent';

export const storeOBS = defineStore('obs', {
	state: () => ({
		connectionEnabled: false,
		sceneCommands: [],
		muteUnmuteCommands: {audioSourceName:"", muteCommand:"!mute", unmuteCommand:"!unmute"},
		commandsPermissions: {
			broadcaster:true,
			mods:false,
			vips:false,
			subs:false,
			all:false,
			follower:false,
			follower_duration_ms:0,
			usersAllowed:[],
			usersRefused:[],
		},
	} as IOBSState),



	getters: {
	} as IOBSGetters
	& ThisType<UnwrapRef<IOBSState> & _StoreWithGetters<IOBSGetters> & PiniaCustomProperties>
	& _GettersTree<IOBSState>,



	actions: {
		populateData() {
			//Init OBS scenes params
			const obsSceneCommands = DataStore.get(DataStore.OBS_CONF_SCENES);
			if(obsSceneCommands) {
				this.sceneCommands = JSON.parse(obsSceneCommands);
			}
			
			//Init OBS command params
			const obsMuteUnmuteCommands = DataStore.get(DataStore.OBS_CONF_MUTE_UNMUTE);
			if(obsMuteUnmuteCommands) {
				Utils.mergeRemoteObject(JSON.parse(obsMuteUnmuteCommands), (this.muteUnmuteCommands as unknown) as JsonObject);
				// this.muteUnmuteCommands = JSON.parse(obsMuteUnmuteCommands);
			}
			
			//Init OBS permissions
			const obsCommandsPermissions = DataStore.get(DataStore.OBS_CONF_PERMISSIONS);
			if(obsCommandsPermissions) {
				Utils.mergeRemoteObject(JSON.parse(obsCommandsPermissions), (this.commandsPermissions as unknown) as JsonObject);
				// this.commandsPermissions = JSON.parse(obsCommandsPermissions);
			}
			
			//Initialise the new toggle param for OBS connection.
			//If any OBS param exists, set it to true because the
			//user probably configured it. Otherwise set it to false
			if(DataStore.get(DataStore.OBS_CONNECTION_ENABLED) === null) {
				if(DataStore.get(DataStore.OBS_PASS) || DataStore.get(DataStore.OBS_PORT) || this.muteUnmuteCommands || this.sceneCommands.length > 0) {
					this.connectionEnabled = true;
				}else{
					this.connectionEnabled = false;
				}
				DataStore.set(DataStore.OBS_CONNECTION_ENABLED, this.connectionEnabled);
			}else{
				this.connectionEnabled = DataStore.get(DataStore.OBS_CONNECTION_ENABLED) === "true";
			}
			
			//Init OBS connection
			//If params are specified on URL, use them (used by overlays)
			const port = DataStore.get(DataStore.OBS_PORT);
			const pass = DataStore.get(DataStore.OBS_PASS);
			const ip = DataStore.get(DataStore.OBS_IP);
			//If OBS params are on URL or if connection is enabled, connect
			if(this.connectionEnabled && (port != null || pass != null || ip != null)) {
				this.connectionEnabled = true;
				OBSWebsocket.instance.connect(port || "4455", pass || "", true, ip || "127.0.0.1");
			}

			//Updates all twitchat browser sources with current OBS credentials
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, async ()=>{
				const res = await OBSWebsocket.instance.socket.call("GetInputList", {inputKind:"browser_source"});
				const sources = (res.inputs as unknown) as OBSInputItem[];
				const filteredSources = sources.filter(v=> v.inputKind == "browser_source");

				filteredSources.forEach(browserSource=> {
					OBSWebsocket.instance.getSourceSettings<{is_local_file:boolean, url:string, local_file:string}>(browserSource.inputName)
					.then(browserSourceSettings => {
						const urlRaw = (browserSourceSettings.inputSettings.url as string || "").trim();
						if(!urlRaw) return;

						try {
							const url = new URL(urlRaw);
							let prevURL = url.toString();
							//Check if overlay's URL is a twitchat domain
							if(/.*twitchat.fr$/gi.test(url.hostname)
							|| (/^\/overlay\/.+$/gi.test(url.pathname) && url.port == "8080" && url.hostname == "localhost")) {

								//Update OBS-websocket credentials if necessary
								const portUrl = url.searchParams.get("obs_port");
								const ipUrl = url.searchParams.get("obs_ip");
								if(portUrl && ipUrl) {
									url.searchParams.set("obs_ip", ip!);
									url.searchParams.set("obs_port", port!);
									if(pass) url.searchParams.set("obs_pass", pass);
								}

								//Update host so it automatically migrates between local <=> beta <=> prod
								url.host = document.location.host;

								if(url.toString() != prevURL) {
									url.port = document.location.port;
									url.protocol = document.location.protocol;
									console.log("ℹ️ Updating browser source URL from \""+prevURL+"\" to \""+url.toString()+"\"");
									OBSWebsocket.instance.setBrowserSourceURL(browserSource.inputName, url.toString())
								}
							}
						}catch(error){}
					});
				})
			})
		},
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

		async handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd?:string):Promise<void> {
			if(!this.connectionEnabled) return;
			if(!cmd) cmd = (message.message || "").trim().split(" ")[0].toLowerCase();
			if(cmd?.length < 2) return;

			//check if it's a command to control an OBS scene
			if(await Utils.checkPermissions(this.commandsPermissions, message.user, message.channel_id)) {
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

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeOBS, import.meta.hot))
}