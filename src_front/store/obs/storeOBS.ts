import DataStore from '@/store/DataStore';
import { rebuildPlaceholdersCache, TriggerTypes } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import OBSWebSocket, { type OBSInputItem, type OBSSourceItem } from '@/utils/OBSWebSocket';
import type { TwitchatEventMap } from '@/events/TwitchatEvent';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import Utils from '@/utils/Utils';
import { acceptHMRUpdate, defineStore, type _GettersTree, type _StoreWithGetters, type _StoreWithState, type PiniaCustomProperties } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import type { IOBSActions, IOBSGetters, IOBSState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

export const storeOBS = defineStore('obs', {
	state: () => ({
		connectionEnabled: false,
		sceneCommands: [],
		muteUnmuteCommands: {audioSourceName:"", muteCommand:"!mute", unmuteCommand:"!unmute"},
		commandsPermissions: Utils.getDefaultPermissions(true, true, false, false, false, false),
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
				OBSWebSocket.instance.connect(port || "4455", pass || "", true, ip || "127.0.0.1");
			}

			OBSWebSocket.instance.addEventListener("ON_OBS_WEBSOCKET_DISCONNECTED", async ()=>{
				const m:TwitchatDataTypes.MessageObsWsConnectStateChangeData = {
					type:"obs_ws_connect_state_change",
					state: "disconnected",
					channel_id: StoreProxy.auth.twitch.user.id,
					date: Date.now(),
					id: Utils.getUUID(),
					platform: "twitchat",
				};
				TriggerActionHandler.instance.execute(m)
			})

			OBSWebSocket.instance.addEventListener("ON_OBS_WEBSOCKET_CONNECTED", async ()=>{
				const m:TwitchatDataTypes.MessageObsWsConnectStateChangeData = {
					type:"obs_ws_connect_state_change",
					state: "connected",
					channel_id: StoreProxy.auth.twitch.user.id,
					date: Date.now(),
					id: Utils.getUUID(),
					platform: "twitchat",
				};
				TriggerActionHandler.instance.execute(m)
				
				const res = await OBSWebSocket.instance.socket.call("GetInputList", {inputKind:"browser_source"});
				const sources = (res.inputs as unknown) as OBSInputItem[];
				const filteredSources = sources.filter(v=> v.inputKind == "browser_source");
				
				//Updates all twitchat browser sources with current OBS credentials
				filteredSources.forEach(browserSource=> {
					OBSWebSocket.instance.getSourceSettings<{is_local_file:boolean, url:string, local_file:string}>(browserSource.inputName)
					.then(browserSourceSettings => {
						const urlRaw = (browserSourceSettings.inputSettings.url as string || "").trim();
						if(!urlRaw) return;

						try {
							const url = new URL(urlRaw);
							let prevURL = url.toString();
							//Check if overlay's URL is a twitchat domain
							if(/.*twitchat.fr$/gi.test(url.hostname)
							|| (/^\/overlay\/.+$/gi.test(url.pathname) && url.port == "8081" && url.hostname == "localhost")) {

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
									OBSWebSocket.instance.setBrowserSourceURL(browserSource.inputName, url.toString())
								}
							}
						}catch(error){}
					});
				})
			})

			/**
			 * Called when switching to another scene
			 */
			let changeDebounce:number = -1;
			OBSWebSocket.instance.addEventListener("ON_OBS_SCENE_CHANGE", async (event):Promise<void> => {
				clearTimeout(changeDebounce);
				//Debounce consecutive events changes.
				//When leaving studio mode, 2 events are triggered in a row, once for the scene we're leaving
				//and once for the scene we're entering. This debounce avoids the first event to be interpreted
				changeDebounce = window.setTimeout(async ()=> {
					const e = event.data as {sceneName:string};
					//If no scene whas stored, get the current one to use it as the "previousSceneName" on the trigge rmessage
					if(!StoreProxy.common.currentOBSScene) {
						StoreProxy.common.currentOBSScene = await OBSWebSocket.instance.getCurrentScene();
					}else
					//Ignore if old and new scene are the same
					//For some reason, leaving studio mode on OBS triggers 2 scene change events
					if(StoreProxy.common.currentOBSScene == e.sceneName) return;

					const m:TwitchatDataTypes.MessageOBSSceneChangedData = {
						id: Utils.getUUID(),
						date: Date.now(),
						platform: "twitchat",
						type: TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE,
						sceneName: e.sceneName,
						previousSceneName: StoreProxy.common.currentOBSScene,
						channel_id:StoreProxy.auth.twitch.user.id,
					};
					StoreProxy.common.currentOBSScene = e.sceneName;
					TriggerActionHandler.instance.execute(m);
					rebuildPlaceholdersCache();
				}, 30);
			});

			/**
			 * Called when a source visibility is toggled
			 */
			OBSWebSocket.instance.addEventListener("ON_OBS_SOURCE_TOGGLE", (event):void => {
				const m:TwitchatDataTypes.MessageOBSSourceToggleData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE,
					sourceName:event.data.item.sourceName,
					sourceItemId:event.data.event.sceneItemId,
					visible:event.data.event.sceneItemEnabled,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(m);
			});

			/**
			 * Called when a source is muted or unmuted
			 */
			OBSWebSocket.instance.addEventListener("ON_OBS_MUTE_TOGGLE", (event):void => {
				const m:TwitchatDataTypes.MessageOBSInputMuteToggleData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE,
					inputName:event.data.inputName,
					muted:event.data.inputMuted,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(m);
			});

			/**
			 * Called when a filter visibility is toggled
			 */
			OBSWebSocket.instance.addEventListener("ON_OBS_FILTER_TOGGLE", (event):void => {
				const m:TwitchatDataTypes.MessageOBSFilterToggleData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE,
					sourceName:event.data.sourceName,
					filterName:event.data.filterName,
					enabled:event.data.filterEnabled,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(m);
			});

			/**
			 * Called when streaming is started/stoped on OBS
			 */
			OBSWebSocket.instance.addEventListener("ON_OBS_STREAM_STATE", (event):void => {
				let m:TwitchatDataTypes.MessageOBSStartStreamData | TwitchatDataTypes.MessageOBSStopStreamData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.OBS_START_STREAM,
					channel_id:StoreProxy.auth.twitch.user.id,
				};
				if(!event.data.outputActive){
					m = {...m,
						type: TwitchatDataTypes.TwitchatMessageType.OBS_STOP_STREAM,
					};
				}
				TriggerActionHandler.instance.execute(m);
			});

			/**
			 * Called when streaming is started/stoped on OBS
			 */
			OBSWebSocket.instance.addEventListener("ON_OBS_RECORD_STATE", (event):void => {
				const type = event.data.outputActive? TwitchatDataTypes.TwitchatMessageType.OBS_RECORDING_START : TwitchatDataTypes.TwitchatMessageType.OBS_RECORDING_STOP;
				TriggerActionHandler.instance.execute({
					id:Utils.getUUID(),
					channel_id:StoreProxy.auth.twitch.user.id,
					date:Date.now(),
					platform:"twitchat",
					type:type
				}, false);
			});

			/**
			 * Called when a playback event occurs on a media source
			 * @param event
			 */
			function onPlayBackStateChanged(event:
			{type:"ON_OBS_PLAYBACK_ENDED", data:TwitchatEventMap["ON_OBS_PLAYBACK_ENDED"]}
			| {type:"ON_OBS_PLAYBACK_STARTED", data:TwitchatEventMap["ON_OBS_PLAYBACK_STARTED"]}
			| {type:"ON_OBS_PLAYBACK_PAUSED", data:TwitchatEventMap["ON_OBS_PLAYBACK_PAUSED"]}
			| {type:"ON_OBS_PLAYBACK_NEXT", data:TwitchatEventMap["ON_OBS_PLAYBACK_NEXT"]}
			| {type:"ON_OBS_PLAYBACK_PREVIOUS", data:TwitchatEventMap["ON_OBS_PLAYBACK_PREVIOUS"]}
			| {type:"ON_OBS_PLAYBACK_RESTARTED", data:TwitchatEventMap["ON_OBS_PLAYBACK_RESTARTED"]}):void {
				const data = event.data;
				const typeToState:Partial<{[key in keyof TwitchatEventMap]:TwitchatDataTypes.MessageOBSPlaybackStateValue}> = {};
				typeToState["ON_OBS_PLAYBACK_ENDED"]		= "complete";
				typeToState["ON_OBS_PLAYBACK_STARTED"]		= "start";
				typeToState["ON_OBS_PLAYBACK_PAUSED"]		= "pause";
				typeToState["ON_OBS_PLAYBACK_NEXT"]			= "next";
				typeToState["ON_OBS_PLAYBACK_PREVIOUS"]		= "prev";
				typeToState["ON_OBS_PLAYBACK_RESTARTED"]	= "restart";
				const m:TwitchatDataTypes.MessageOBSPlaybackStateUpdateData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE,
					inputName:data.inputName,
					state:typeToState[event.type]!,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(m);
			}

			/**
			 * Called when an OBS source is renamed.
			 * Rename it on all triggers
			 */
			OBSWebSocket.instance.addEventListener("ON_OBS_INPUT_NAME_CHANGED", (event):void => {
				const data = event.data as {oldInputName:string, inputName:string};
				StoreProxy.triggers.renameOBSSource(data.oldInputName, data.inputName);
			});

			/**
			 * Called when an OBS scene is renamed.
			 * Rename it on all triggers
			 */
			OBSWebSocket.instance.addEventListener("ON_OBS_SCENE_NAME_CHANGED", (event):void => {
				const data = event.data as {oldSceneName:string, sceneName:string};
				StoreProxy.triggers.renameOBSScene(data.oldSceneName, data.sceneName);
			});

			/**
			 * Called when an OBS Filter is renamed.
			 * Rename it on all triggers
			 */
			OBSWebSocket.instance.addEventListener("ON_OBS_FILTER_NAME_CHANGED", (event):void => {
				const data = event.data as {sourceName: string; oldFilterName: string; filterName: string};
				StoreProxy.triggers.renameOBSFilter(data.sourceName, data.oldFilterName, data.filterName);
			});

			OBSWebSocket.instance.heatClickTriggerType = TriggerTypes.HEAT_CLICK;//Read "heatClickTriggerType" to understand this line
			OBSWebSocket.instance.addEventListener("ON_OBS_PLAYBACK_ENDED", (e) => onPlayBackStateChanged(e as any));
			OBSWebSocket.instance.addEventListener("ON_OBS_PLAYBACK_STARTED", (e) => onPlayBackStateChanged(e as any));
			OBSWebSocket.instance.addEventListener("ON_OBS_PLAYBACK_PAUSED", (e) => onPlayBackStateChanged(e as any));
			OBSWebSocket.instance.addEventListener("ON_OBS_PLAYBACK_NEXT", (e) => onPlayBackStateChanged(e as any));
			OBSWebSocket.instance.addEventListener("ON_OBS_PLAYBACK_PREVIOUS", (e) => onPlayBackStateChanged(e as any));
			OBSWebSocket.instance.addEventListener("ON_OBS_PLAYBACK_RESTARTED", (e) => onPlayBackStateChanged(e as any));
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
			if(!cmd) cmd = (message.message || "").trim().split(" ")[0]!.toLowerCase();
			if(cmd?.length < 2) return;

			//check if it's a command to control an OBS scene
			if(await Utils.checkPermissions(this.commandsPermissions, message.user, message.channel_id)) {
				for (const scene of this.sceneCommands) {
					if(scene.command.trim().toLowerCase() == cmd) {
						OBSWebSocket.instance.setCurrentScene(scene.scene.sceneName);
					}
				}

				const audioSourceName = this.muteUnmuteCommands.audioSourceName;
				if(audioSourceName) {
					//Check if it's a command to mute/unmute an audio source
					if(cmd == this.muteUnmuteCommands.muteCommand) {
						OBSWebSocket.instance.setMuteState(audioSourceName, true);
					}
					if(cmd == this.muteUnmuteCommands.unmuteCommand) {
						OBSWebSocket.instance.setMuteState(audioSourceName, false);
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
