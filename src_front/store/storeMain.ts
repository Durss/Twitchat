import TwitchatEvent from '@/events/TwitchatEvent';
import router from '@/router';
import { TriggerTypes, type SocketParams } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ChatCypherPlugin from '@/utils/ChatCypherPlugin';
import Config, { type ServerConfig } from '@/utils/Config';
import DeezerHelper from '@/utils/music/DeezerHelper';
import DeezerHelperEvent from '@/utils/music/DeezerHelperEvent';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import SchedulerHelper from '@/utils/SchedulerHelper';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import VoiceController from '@/utils/voice/VoiceController';
import VoicemodEvent from '@/utils/voice/VoicemodEvent';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from './DataStore';
import StoreProxy, { type IMainActions, type IMainGetters, type IMainState } from './StoreProxy';

export const storeMain = defineStore("main", {
	state: () => ({
		latestUpdateIndex: 12,
		initComplete: false,
		devmode: false,
		ahsInstaller: null,
		alertData:"",
		tooltip: "",
		cypherKey: "",
		cypherEnabled: false,
		tempStoreValue: null,
		confirmData:null,
		accessibility:{
			ariaPolite:"",
		},
		chatAlertParams: {
			chatCmd:"!alert",
			message:true,
			shake:true,
			sound:true,
			blink:false,
			permissions:{
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
		chatAlert:null,
	} as IMainState),
	

	getters: {
	} as IMainGetters
		& ThisType<UnwrapRef<IMainState> & _StoreWithGetters<IMainGetters> & PiniaCustomProperties>
		& _GettersTree<IMainState>,

	
	actions: {

		/**
		 * Here for debug purpose.
		 * Called when doing CTRL+Shift+L to reload the app labels
		 * this makes a little easier testing labels updates to
		 * avoid refreshing the full app
		 */
		async reloadLabels():Promise<void> {
			const labelsRes = await fetch("/labels.json");
			const labelsJSON = await labelsRes.json();
			for (const lang in labelsJSON) {
				StoreProxy.i18n.setLocaleMessage(lang, labelsJSON[lang]);
			}
		},

		async startApp(authenticate:boolean, callback:(value:unknown)=>void) {
			let jsonConfigs:ServerConfig;
			const sOBS = StoreProxy.obs;
			const sChat = StoreProxy.chat;
			const sAuth = StoreProxy.auth;
			const sTimer = StoreProxy.timer;
			const sVoice = StoreProxy.voice;
			const sMusic = StoreProxy.music;
			const sUsers = StoreProxy.users;
			const sStream = StoreProxy.stream;
			const sParams = StoreProxy.params;
			const sEmergency = StoreProxy.emergency;

			//Load app configs (cliend ID, scopes, ...)
			try {
				const res = await fetch(Config.instance.API_PATH+"/configs");
				jsonConfigs = await res.json();
			}catch(error) {
				this.alert("Unable to contact server :(");
				this.initComplete = true;
				return;
			}
			Config.instance.populateServerConfigs(jsonConfigs);
			
			//Makes sure all parameters have a unique ID !
			let uniqueIdsCheck:{[key:number]:boolean} = {};
			const pointers = [sParams.features, sParams.appearance];
			for (let i = 0; i < pointers.length; i++) {
				const values = pointers[i];
				for (const key in values) {
					const p = values[key] as TwitchatDataTypes.ParameterData<unknown>;
					if(uniqueIdsCheck[p.id as number] === true) {
						this.alert("Duplicate parameter id (" + p.id + ") found for parameter \"" + key + "\"");
						break;
					}
					uniqueIdsCheck[p.id as number] = true;
				}
			}
			
			//Make sure all triggers have a unique ID !
			uniqueIdsCheck = {};
			for (const key in TriggerTypes) {
				//@ts-ignore
				const v = TriggerTypes[key];
				if(uniqueIdsCheck[v] === true) {
					this.alert("Duplicate trigger type id (" + v + ") found for trigger \"" + key + "\"");
					break;
				}
				uniqueIdsCheck[v] = true;
			}

			//Authenticate user
			const token = DataStore.get(DataStore.TWITCH_AUTH_TOKEN);
			if(token && authenticate) {
				SpotifyHelper.instance.connect();
				const cypherKey = DataStore.get(DataStore.CYPHER_KEY);
				if(cypherKey) {
					this.cypherKey = cypherKey;
					ChatCypherPlugin.instance.initialize(cypherKey);
				}
				DeezerHelper.instance.addEventListener(DeezerHelperEvent.CONNECTED, ()=>{
					sMusic.setDeezerConnected(true);
				});
				DeezerHelper.instance.addEventListener(DeezerHelperEvent.CONNECT_ERROR, ()=>{
					sMusic.setDeezerConnected(false);
					this.alert(StoreProxy.i18n.t("error.deezer.auth_failed"));//"Deezer authentication failed";
				});
				VoicemodWebSocket.instance.addEventListener(VoicemodEvent.VOICE_CHANGE, async (e:VoicemodEvent)=> {
					//Execute trigger
					const trigger:TwitchatDataTypes.MessageVoicemodData = {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.VOICEMOD,
						platform:"twitchat",
						voiceID:e.voiceID,
					}
					TriggerActionHandler.instance.execute(trigger);

					for (let i = 0; i < VoicemodWebSocket.instance.voices.length; i++) {
						const v = VoicemodWebSocket.instance.voices[i];
						if(v.voiceID == e.voiceID) {
							const img = await VoicemodWebSocket.instance.getBitmapForVoice(v.voiceID);
							v.image = img;
							sVoice.voicemodCurrentVoice = v;
						}
					}
				});

				try {
					await new Promise((resolve,reject)=> {
						sAuth.twitch_autenticate(undefined, (success:boolean, betaRefused?:boolean)=>{
							if(betaRefused == true) {
								this.initComplete = true;
								router.push({name:"login", params:{betaReason:"true"}});
								return;
							}
							if(success) {
								resolve(null);
							}else{
								reject();
							}
						});
					});

				}catch(error) {
					console.log(error);
					sAuth.authenticated = false;
					DataStore.remove("oAuthToken");
					this.initComplete = true;
					callback(null);
					return;
				}
				
			}

			//Listen for twitch API event
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TIMERS, ()=> {
				sTimer.boradcastStates();
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (e:TwitchatEvent)=> {
				sChat.isChatMessageHighlighted = (e.data as {message:string}).message != undefined;
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.TEXT_UPDATE, (e:TwitchatEvent)=> {
				sVoice.voiceText.tempText = (e.data as {text:string}).text;
				sVoice.voiceText.finalText = "";
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.RAW_TEXT_UPDATE, (e:TwitchatEvent)=> {
				sVoice.voiceText.rawTempText = (e.data as {text:string}).text;
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.SPEECH_END, (e:TwitchatEvent)=> {
				sVoice.voiceText.finalText = (e.data as {text:string}).text;
			});
			
			if(authenticate) {
				//Avoid listening for these events on the overlays
				PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_RESULT, (e:TwitchatEvent)=> {
					const data = (e.data as unknown) as {winner:TwitchatDataTypes.RaffleEntry};
					StoreProxy.raffle.onRaffleComplete(data.winner);
				});
				
				PublicAPI.instance.addEventListener(TwitchatEvent.SHOUTOUT, (e:TwitchatEvent)=> {
					const raider = sStream.lastRaider;
					if(raider) {
						const me = StoreProxy.auth.twitch.user;
						sUsers.shoutout(me.id, raider);
					}else{
						this.alert(StoreProxy.i18n.t("error.auto_shoutout"));
					}
				});
				
				PublicAPI.instance.addEventListener(TwitchatEvent.SET_EMERGENCY_MODE, (e:TwitchatEvent)=> {
					const enable = (e.data as unknown) as {enabled:boolean};
					let enabled = enable.enabled;
					//If no JSON is specified, just toggle the state
					if(!e.data || enabled === undefined) enabled = !sEmergency.emergencyStarted;
					sEmergency.setEmergencyMode(enabled)
				});
			
				PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_PICK_WINNER, (e:TwitchatEvent)=> {
					StoreProxy.raffle.pickWinner();
				});

				OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_SCENE_CHANGE, (event:TwitchatEvent):void => {
					const m:TwitchatDataTypes.MessageOBSSceneChangedData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitchat",
						type:'obs_scene_change',
						sceneName:(event.data as {sceneName:string}).sceneName,
					}
					TriggerActionHandler.instance.execute(m);
				});
	
				OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_SOURCE_TOGGLE, (event:TwitchatEvent):void => {
					const data = (event.data as unknown) as {item:OBSSourceItem, event:{sceneItemId:number, sceneItemEnabled:boolean, sceneName:string}};
					const m:TwitchatDataTypes.MessageOBSSourceToggleData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitchat",
						type:'obs_source_toggle',
						sourceName:data.item.sourceName,
						sourceItemId:data.event.sceneItemId,
						visible:data.event.sceneItemEnabled,
					}
					TriggerActionHandler.instance.execute(m);
				});
			}

			PublicAPI.instance.initialize();
			
			//Init OBS connection
			//If params are specified on URL, use them (used by overlays)
			const port = Utils.getQueryParameterByName("obs_port");
			const pass = Utils.getQueryParameterByName("obs_pass");
			const ip = Utils.getQueryParameterByName("obs_ip");
			//If OBS params are on URL, connect
			if(port != null && ip != null) {
				sOBS.connectionEnabled = true;
				OBSWebsocket.instance.connect(port, pass ?? "", true, ip);
			}
			
			this.initComplete = true;
			
			callback(null);
		},
		
		loadDataFromStorage() {
			/**
			 * CAREFUL THIS METHOD CAN BE CALLED MULTIPLE TIMES
			 * Don't do anything that could break if called multiple times!
			 */
			const sOBS = StoreProxy.obs;
			const sTTS = StoreProxy.tts;
			const sChat = StoreProxy.chat;
			const sVoice = StoreProxy.voice;
			const sMusic = StoreProxy.music;
			const sStream = StoreProxy.stream;
			const sParams = StoreProxy.params;
			const sTriggers = StoreProxy.triggers;
			const sAutomod = StoreProxy.automod;
			const sCounters = StoreProxy.counters;
			const sEmergency = StoreProxy.emergency;
			//Loading parameters from local storage and pushing them to current store
			const props = DataStore.getAll();
			for (const cat in sParams.$state) {
				const c = cat as TwitchatDataTypes.ParameterCategory;
				for (const key in props) {
					const k = key.replace(/^p:/gi, "");
					if(props[key] == null) continue;
					const t = typeof sParams.$state[c];
					if(t == "object" && /^p:/gi.test(key) && k in sParams.$state[c]) {
						const v:string = props[key] as string;
						/* eslint-disable-next-line */
						const pointer = sParams.$state[c][k as TwitchatDataTypes.ParameterCategory];
						if(typeof pointer.value === 'boolean') {
							pointer.value = (v == "true");
						}
						if(typeof pointer.value === 'string') {
							pointer.value = v;
						}
						if(typeof pointer.value === 'number') {
							pointer.value = parseFloat(v);
						}
					}
				}
			}

			//Init OBS scenes params
			const obsSceneCommands = DataStore.get(DataStore.OBS_CONF_SCENES);
			if(obsSceneCommands) {
				sOBS.sceneCommands = JSON.parse(obsSceneCommands);
			}
			
			//Init OBS command params
			const obsMuteUnmuteCommands = DataStore.get(DataStore.OBS_CONF_MUTE_UNMUTE);
			if(obsMuteUnmuteCommands) {
				Utils.mergeRemoteObject(JSON.parse(obsMuteUnmuteCommands), (sOBS.muteUnmuteCommands as unknown) as JsonObject);
				// sOBS.muteUnmuteCommands = JSON.parse(obsMuteUnmuteCommands);
			}
			
			//Init OBS permissions
			const obsCommandsPermissions = DataStore.get(DataStore.OBS_CONF_PERMISSIONS);
			if(obsCommandsPermissions) {
				Utils.mergeRemoteObject(JSON.parse(obsCommandsPermissions), (sOBS.commandsPermissions as unknown) as JsonObject);
				// sOBS.commandsPermissions = JSON.parse(obsCommandsPermissions);
			}

			//Init TTS actions
			const tts = DataStore.get(DataStore.TTS_PARAMS);
			if (tts) {
				Utils.mergeRemoteObject(JSON.parse(tts), (sTTS.params as unknown) as JsonObject);
				// sTTS.params = JSON.parse(tts);
				TTSUtils.instance.enabled = sTTS.params.enabled;
			}
			
			//Init emergency actions
			const emergency = DataStore.get(DataStore.EMERGENCY_PARAMS);
			if(emergency) {
				Utils.mergeRemoteObject(JSON.parse(emergency), (sEmergency.params as unknown) as JsonObject);
				// sEmergency.params = JSON.parse(emergency);
			}
			
			//Init alert actions
			const alert = DataStore.get(DataStore.ALERT_PARAMS);
			if(alert) {
				Utils.mergeRemoteObject(JSON.parse(alert), (this.chatAlertParams as unknown) as JsonObject);
				// this.chatAlertParams = JSON.parse(alert);
			}
			
			//Init spoiler param
			const spoiler = DataStore.get(DataStore.SPOILER_PARAMS);
			if(spoiler) {
				Utils.mergeRemoteObject(JSON.parse(spoiler), (sChat.spoilerParams as unknown) as JsonObject);
				// sChat.spoilerParams = JSON.parse(spoiler);
			}
			
			//Init chat highlight params
			const chatHighlight = DataStore.get(DataStore.CHAT_HIGHLIGHT_PARAMS);
			if(chatHighlight) {
				Utils.mergeRemoteObject(JSON.parse(chatHighlight), (sChat.chatHighlightOverlayParams as unknown) as JsonObject);
				// sChat.chatHighlightOverlayParams = JSON.parse(chatHighlight);
			}
			
			//Init triggers
			const triggers = DataStore.get(DataStore.TRIGGERS);
			if(triggers) {
				Utils.mergeRemoteObject(JSON.parse(triggers), (sTriggers.triggerList as unknown) as JsonObject);
				// sTriggers.triggerList = JSON.parse(triggers);
				TriggerActionHandler.instance.populate(sTriggers.triggerList);
			}
				
			//Init stream info presets
			const presets = DataStore.get(DataStore.STREAM_INFO_PRESETS);
			if(presets) {
				sStream.streamInfoPreset = JSON.parse(presets);
			}

			//Init emergency followers
			const emergencyFollows = DataStore.get(DataStore.EMERGENCY_FOLLOWERS);
			if(emergencyFollows) {
				sEmergency.follows = JSON.parse(emergencyFollows);
			}

			//Init music player params
			const musicPlayerParams = DataStore.get(DataStore.MUSIC_PLAYER_PARAMS);
			if(musicPlayerParams) {
				Utils.mergeRemoteObject(JSON.parse(musicPlayerParams), (sMusic.musicPlayerParams as unknown) as JsonObject);
				// sMusic.musicPlayerParams = JSON.parse(musicPlayerParams);
			}
			
			//Init Voice control actions
			const voiceActions = DataStore.get("voiceActions");
			if(voiceActions) {
				sVoice.voiceActions = JSON.parse(voiceActions);
			}
			
			//Init Voice control language
			const voiceLang = DataStore.get("voiceLang");
			if(voiceLang) {
				sVoice.voiceLang = voiceLang;
				VoiceController.instance.lang = voiceLang;
			}
			
			//Init bot messages
			const botMessages = DataStore.get(DataStore.BOT_MESSAGES);
			if(botMessages) {
				//Merge remote and local to avoid losing potential new
				//default values on local data
				Utils.mergeRemoteObject(JSON.parse(botMessages), (sChat.botMessages as unknown) as JsonObject, false);
				// sChat.botMessages = JSON.parse(botMessages);
			}

			//Init voicemod
			const voicemodParams = DataStore.get(DataStore.VOICEMOD_PARAMS);
			if(voicemodParams) {
				sVoice.setVoicemodParams(JSON.parse(voicemodParams));
				if(sVoice.voicemodParams.enabled) {
					VoicemodWebSocket.instance.connect();
				}
			}

			//Init trigger websocket
			const triggerSocketParams = DataStore.get(DataStore.WEBSOCKET_TRIGGER);
			if(triggerSocketParams) {
				let params = JSON.parse(triggerSocketParams) as SocketParams;
				let url = params.secured === true? "wss://" : "ws://";
				url += params.ip;
				if(params.port) url += ":"+params.port;
		
				WebsocketTrigger.instance.connect(url).then(()=> {
				}).catch(()=> {
				});
			}

			//Init automod
			const automodParams = DataStore.get(DataStore.AUTOMOD_PARAMS);
			if(automodParams) {
				Utils.mergeRemoteObject(JSON.parse(automodParams), (sAutomod.params as unknown) as JsonObject);
				// sAutomod.params = JSON.parse(automodParams);
				sAutomod.setAutomodParams(sAutomod.params);
			}

			//Init chat cols
			const chatColConfs = DataStore.get(DataStore.CHAT_COLUMNS_CONF);
			if(chatColConfs) {
				sParams.chatColumnsConfig = JSON.parse(chatColConfs);
				for (let i = 0; i < sParams.chatColumnsConfig.length; i++) {
					sParams.chatColumnsConfig[i].id = Utils.getUUID();
				}
				DataStore.set(DataStore.CHAT_COLUMNS_CONF, sParams.chatColumnsConfig);
			}

			//Init automod
			const countersParams = DataStore.get(DataStore.COUNTERS);
			if(countersParams) {
				Utils.mergeRemoteObject(JSON.parse(countersParams), (sCounters.counterList as unknown) as JsonObject);
				// sCounters.counterList = JSON.parse(countersParams);
			}
			
			//Reload devmode state
			this.toggleDevMode( DataStore.get(DataStore.DEVMODE) === "true" );

			SchedulerHelper.instance.start();
			
			//Initialise the new toggle param for OBS connection.
			//If any OBS param exists, set it to true because the
			//user probably configured it. Otherwise set it to false
			if(DataStore.get(DataStore.OBS_CONNECTION_ENABLED) === null) {
				if(DataStore.get(DataStore.OBS_PASS) || DataStore.get(DataStore.OBS_PORT) || sOBS.muteUnmuteCommands || sOBS.sceneCommands.length > 0) {
					sOBS.connectionEnabled = true;
				}else{
					sOBS.connectionEnabled = false;
				}
				DataStore.set(DataStore.OBS_CONNECTION_ENABLED, sOBS.connectionEnabled);
			}else{
				sOBS.connectionEnabled = DataStore.get(DataStore.OBS_CONNECTION_ENABLED) === "true";
			}
			
			//Init OBS connection
			//If params are specified on URL, use them (used by overlays)
			const port = DataStore.get(DataStore.OBS_PORT);
			const pass = DataStore.get(DataStore.OBS_PASS);
			const ip = DataStore.get(DataStore.OBS_IP);
			//If OBS params are on URL or if connection is enabled, connect
			if(sOBS.connectionEnabled && (port != undefined || pass != undefined || ip != undefined)) {
				sOBS.connectionEnabled = true;
				OBSWebsocket.instance.connect(port, pass, true, ip);
			}
		},

		alert(message:string) { this.alertData = message; },

		confirm<T>(title: string, description?: string, data?: T, yesLabel?:string, noLabel?:string, STTOrigin?:boolean): Promise<T|undefined> {
			return <Promise<T|undefined>>new Promise((resolve, reject) => {
				this.confirmData = {
					title,
					description,
					yesLabel,
					noLabel,
					STTOrigin,
					confirmCallback : () => {
						resolve(data);
					},
					cancelCallback : () => {
						reject(data);
					}
				}
			});
		},

		closeConfirm():void { this.confirmData = null; },

		openTooltip(payload:string) { this.tooltip = payload; },
		
		closeTooltip() { this.tooltip = ""; },
		
		setCypherKey(payload:string) {
			this.cypherKey = payload;
			ChatCypherPlugin.instance.cypherKey = payload;
			DataStore.set(DataStore.CYPHER_KEY, payload);
		},

		setCypherEnabled(payload:boolean) { this.cypherEnabled = payload; },
		
		toggleDevMode(forcedState?:boolean) {
			if(forcedState == this.devmode) return;
			
			let notify = true;
			if(forcedState !== undefined) {
				this.devmode = forcedState;
				notify = forcedState
			}else{
				this.devmode = !this.devmode;
			}
			if(this.devmode != JSON.parse(DataStore.get(DataStore.DEVMODE))) {
				DataStore.set(DataStore.DEVMODE, this.devmode);
			}
			if(notify) {
				let str = StoreProxy.i18n.t("global.dev_mode.enabled");
				if(!this.devmode) {
					str = StoreProxy.i18n.t("global.dev_mode.disabled");
				}
				const message:TwitchatDataTypes.MessageNoticeData = {
					id: Utils.getUUID(),
					date: Date.now(),
					platform: "twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					noticeId:TwitchatDataTypes.TwitchatNoticeType.DEVMODE,
					message:str,
				}
				StoreProxy.chat.addMessage(message);
			}
		},

		setAhsInstaller(value:TwitchatDataTypes.InstallHandler) { this.$state.ahsInstaller = value; },

		setChatAlertParams(params:TwitchatDataTypes.AlertParamsData) {
			this.chatAlertParams = params;
			DataStore.set(DataStore.ALERT_PARAMS, params);
		},

		async executeChatAlert(message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData|null) {
			this.chatAlert = message;
			await Utils.promisedTimeout(50);
			this.chatAlert = null;
		},
	} as IMainActions & ThisType<IMainActions & UnwrapRef<IMainState> & _StoreWithState<"main", IMainState, IMainGetters, IMainActions> & _StoreWithGetters<IMainGetters> & PiniaCustomProperties>
})