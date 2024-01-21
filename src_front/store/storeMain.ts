import GoXLRSocketEvent from '@/events/GoXLRSocketEvent';
import HeatEvent from '@/events/HeatEvent';
import TwitchatEvent, { type TwitchatEventType } from '@/events/TwitchatEvent';
import router from '@/router';
import { TriggerTypes, rebuildPlaceholdersCache, type SocketParams, type TriggerActionChatData, type TriggerData } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiController from '@/utils/ApiController';
import ChatCypherPlugin from '@/utils/ChatCypherPlugin';
import Config, { type ServerConfig } from '@/utils/Config';
import OBSWebsocket, { type OBSSourceItem } from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import SchedulerHelper from '@/utils/SchedulerHelper';
import TTSUtils from '@/utils/TTSUtils';
import Utils from '@/utils/Utils';
import WebsocketTrigger from '@/utils/WebsocketTrigger';
import GoXLRSocket from '@/utils/goxlr/GoXLRSocket';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import HeatSocket from '@/utils/twitch/HeatSocket';
import VoiceController from '@/utils/voice/VoiceController';
import VoicemodEvent from '@/utils/voice/VoicemodEvent';
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from './DataStore';
import Database from './Database';
import StoreProxy, { type IMainActions, type IMainGetters, type IMainState } from './StoreProxy';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';

export const storeMain = defineStore("main", {
	state: () => ({
		latestUpdateIndex: 14,
		theme:"dark",
		initComplete: false,
		devmode: false,
		messageExportState: null,
		ahsInstaller: null,
		alertData:{
			message:"",
			critical:false,
			showContact:false,
		},
		tooltip: "",
		cypherKey: "",
		cypherEnabled: false,
		tempStoreValue: null,
		confirmData:null,
		currentOBSScene:"",
		iconCache:{},
		accessibility:{
			ariaPolite:"",
		},
		chatAlertParams: {
			chatCmd:"!alert",
			message:true,
			shake:true,
			sound:true,
			blink:false,
			vibrate:true,
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
		nonPremiumLimitExceeded: ()=> {
			if(StoreProxy.auth.isPremium) return false;

			return StoreProxy.counters.counterList.filter(v=>v.enabled != false).length > Config.instance.MAX_COUNTERS
				|| StoreProxy.values.valueList.filter(v=>v.enabled != false).length > Config.instance.MAX_VALUES
				|| StoreProxy.triggers.triggerList.filter(v=>v.enabled != false).length > Config.instance.MAX_TRIGGERS
				|| StoreProxy.heat.screenList.filter(v=>v.enabled != false).length > Config.instance.MAX_CUSTOM_HEAT_SCREENS
				|| StoreProxy.users.customBadgeList.filter(v=>v.enabled != false).length > Config.instance.MAX_CUSTOM_BADGES
				|| Object.keys(StoreProxy.users.customUserBadges).length > Config.instance.MAX_CUSTOM_BADGES_ATTRIBUTION
				|| Object.keys(StoreProxy.users.customUsernames).length > Config.instance.MAX_CUSTOM_USERNAMES
				|| StoreProxy.heat.distortionList.filter(v=>v.enabled).length > Config.instance.MAX_DISTORTION_OVERLAYS;
		}
	},

	
	actions: {

		/**
		 * Called with do argument when doing CTRL+Shift+K to to
		 * switch between dark and light mode.
		 * Also called when user requests a specific theme
		 */
		toggleTheme(theme?:"light"|"dark"):void {
			let list = document.body.classList;
			if(theme == "light") {
				list.remove("dark");
				list.add("light");
			}else
			if(theme == "dark") {
				list.remove("light");
				list.add("dark");
			}else
			if(list.contains("dark")) {
				list.remove("dark");
				list.add("light");
				theme = "light";
			}else
			if(list.contains("light")) {
				list.remove("light");
				list.add("dark");
				theme = "dark";
			}
			this.theme = theme!;
			DataStore.set(DataStore.THEME, theme);
		},

		/**
		 * Here for debug purpose.
		 * Called when doing CTRL+Shift+L to reload the app labels
		 * this makes a little easier testing labels updates to
		 * avoid refreshing the full app
		 */
		async reloadLabels(bypassCache:boolean = false):Promise<void> {
			let url = "/labels.json";
			if(bypassCache) url += "?ck="+Utils.getUUID();
			const labelsRes = await fetch(url);
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
			const sParams = StoreProxy.params;

			//Load app configs (cliend ID, scopes, ...)
			window.setInitMessage("loading configs");
			try {
				const res = await ApiController.call("configs");
				jsonConfigs = res.json;
			}catch(error) {
				this.alert("Unable to contact server :(", true, true);
				console.log(error);
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

			//Listen for twitchat API event
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TIMERS, ()=> {
				sTimer.broadcastStates();
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

			/**
			 * Called when labels editor updated labels
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.LABELS_UPDATE, (e:TwitchatEvent)=> {
				this.reloadLabels(true);
			});
			
			PublicAPI.instance.initialize(authenticate);
			
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
			
			window.setInitMessage("");
			
			callback(null);
		},

		onAuthenticated():void {
			//Only listen for these events if authenticated.
			//This avoids them from being listened from the overlay or homepage where it's useless

			const sAuth = StoreProxy.auth;
			const sChat = StoreProxy.chat;
			const sUsers = StoreProxy.users;
			const sVoice = StoreProxy.voice;
			const sStream = StoreProxy.stream;
			const sEmergency = StoreProxy.emergency;

			//Warn the user about the automatic "ad" message sent every 2h
			if(DataStore.get(DataStore.TWITCHAT_AD_WARNED) !== "true" && !sAuth.isDonor) {
				setTimeout(()=>{
					sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING);
				}, 5000);
			}else
			//Warn the user about the new ad break capabilities
			if(DataStore.get(DataStore.AD_BREAK_SCOPES_REQUEST) !== "true" && !TwitchUtils.hasScopes([TwitchScopes.ADS_READ, TwitchScopes.ADS_SNOOZE])) {
				setTimeout(()=>{
					sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.AD_BREAK_SCOPE_REQUEST);
				}, 5000);
			}else
			//Ask the user if they want to make their donation public
			if(!DataStore.get(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT) && sAuth.twitch.user.donor.state) {
				setTimeout(()=>{
					sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT);
				}, 5000);
			}else
			//Show "right click message" hint
			if(!DataStore.get(DataStore.TWITCHAT_RIGHT_CLICK_HINT_PROMPT)) {
				setTimeout(()=>{
					sChat.sendRightClickHint();
				}, 5000);
			}else{
				//Hot fix to make sure new changelog highlights are displayed properly
				setTimeout(()=> { sChat.sendTwitchatAd(); }, 1000);
			}

			const lastUpdateRead = parseInt(DataStore.get(DataStore.UPDATE_INDEX));
			if(isNaN(lastUpdateRead) || lastUpdateRead < StoreProxy.main.latestUpdateIndex) {
				//Force last updates if any not read
				// possibleAds = [TwitchatDataTypes.TwitchatAdTypes.UPDATES];
				StoreProxy.params.openModal("updates");
			}

			/**
			 * Connect to Spotify (won't do anything if no credentials are available)
			 */
			SpotifyHelper.instance.connect();

			/**
			 * Init cypher secret feature
			 */
			const cypherKey = DataStore.get(DataStore.CYPHER_KEY);
			if(cypherKey) {
				this.cypherKey = cypherKey;
				ChatCypherPlugin.instance.initialize(cypherKey);
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
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(trigger);

				for (let i = 0; i < VoicemodWebSocket.instance.voices.length; i++) {
					const v = VoicemodWebSocket.instance.voices[i];
					if(v.id == e.voiceID) {
						const img = await VoicemodWebSocket.instance.getBitmapForVoice(v.id);
						v.image = img;
						sVoice.voicemodCurrentVoice = v;
					}
				}
			});
			
			/**
			 * Called when a raffle animation (the wheel) completes
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_RESULT, (e:TwitchatEvent)=> {
				const data = (e.data as unknown) as {winner:TwitchatDataTypes.RaffleEntry};
				StoreProxy.raffle.onRaffleComplete(data.winner);
			});
			
			/**
			 * Called when doing a shoutout to the latest raider
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.SHOUTOUT, (e:TwitchatEvent)=> {
				const raider = sStream.lastRaider;
				if(raider) {
					const me = StoreProxy.auth.twitch.user;
					sUsers.shoutout(me.id, raider);
				}else{
					this.alert(StoreProxy.i18n.t("error.auto_shoutout"));
				}
			});
			
			/**
			 * Called when emergency mode is started or stoped
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.SET_EMERGENCY_MODE, (e:TwitchatEvent)=> {
				const enable = (e.data as unknown) as {enabled:boolean};
				let enabled = enable.enabled;
				//If no JSON is specified, just toggle the state
				if(!e.data || enabled === undefined) enabled = !sEmergency.emergencyStarted;
				sEmergency.setEmergencyMode(enabled)
			});
		
			/**
			 * Called when asking to pick a raffle winner
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_PICK_WINNER, (e:TwitchatEvent)=> {
				StoreProxy.raffle.pickWinner();
			});
		
			/**
			 * Called when requesting ad break overlay parameters
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_AD_BREAK_OVERLAY_PARAMETERS, (e:TwitchatEvent)=> {
				const data = DataStore.get(DataStore.AD_BREAK_OVERLAY_PARAMS);
				const ad = StoreProxy.stream.getCommercialInfo(StoreProxy.auth.twitch.user.id);
				PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_OVERLAY_PARAMETERS, JSON.parse(data));
				PublicAPI.instance.broadcast(TwitchatEvent.AD_BREAK_DATA, (ad as unknown) as JsonObject);
			});
		
			/**
			 * Called when requesting bits wall overlay parameters
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_BITS_WALL_OVERLAY_PARAMETERS, (e:TwitchatEvent)=> {
				const data = DataStore.get(DataStore.BITS_WALL_PARAMS);
				const json = JSON.parse(data) as TwitchatDataTypes.BitsWallOverlayData;
				if(!sAuth.isPremium) {
					json.break_durations = {1:10, 100:20, 1000:30, 5000:40, 10000:50};
				}
				PublicAPI.instance.broadcast(TwitchatEvent.BITSWALL_OVERLAY_PARAMETERS, (json as unknown) as JsonObject);
			});
		
			/**
			 * Called when asking to toggle message merging
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.MERGE_TOGGLE, (e:TwitchatEvent)=> {
				StoreProxy.params.features.mergeConsecutive.value = !StoreProxy.params.features.mergeConsecutive.value;
			});
		
			/**
			 * Called when requesting stream summary data
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_SUMMARY_DATA, async (e:TwitchatEvent)=> {
				try {
					const d = (e.data as unknown) as {offset:number, includeParams:boolean};
					const summary = await StoreProxy.stream.getSummary(d.offset, d.includeParams === true);
					PublicAPI.instance.broadcast(TwitchatEvent.SUMMARY_DATA, (summary as unknown) as JsonObject)
				}catch(error) {
					console.error("An error occured when computing summary data");
					console.error(error);
				}
			});
		
			/**
			 * Called when requesting a distortion overlay's data
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_DISTORT_OVERLAY_PARAMETERS, async (e:TwitchatEvent)=> {
				const distortionID = (e.data as JsonObject || {}).distortionID;
				const params = StoreProxy.heat.distortionList.find(v=>v.id == distortionID);

				const json = {
					params:(params as unknown) as JsonObject
				}
				PublicAPI.instance.broadcast(TwitchatEvent.DISTORT_OVERLAY_PARAMETERS, json);
			});
		
			/**
			 * Called when music player is clicked on the unified overlay
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.MUSIC_PLAYER_HEAT_CLICK, (e:TwitchatEvent)=> {
				const data = e.data as {x:number, y:number, uid:string, shift:boolean, alt:boolean, ctrl:boolean, testMode:boolean, login:string, page:string};
				//Init trigger data
				const action:TriggerActionChatData = {
					id:Utils.getUUID(),
					text:"",
					type:'chat',
				}
				const trigger:TriggerData = {
					id:Utils.getUUID(),
					type:TriggerTypes.TWITCHAT_MESSAGE,
					enabled:true,
					actions:[action],
					cooldown: {
						user: 0,
						global: 0,
						alert:false,
					}
				}
								
				const fakeMessage:TwitchatDataTypes.MessageNoticeData = { id:"fake_schedule_message", date:Date.now(), type:"notice", noticeId:"generic", message:"", platform:"twitchat", channel_id:"" };
				trigger.id = Utils.getUUID();
				action.text = StoreProxy.chat.botMessages.heatSpotify.message;
				trigger.cooldown!.global = StoreProxy.chat.botMessages.heatSpotify.cooldown!;
				TriggerActionHandler.instance.executeTrigger(trigger, fakeMessage, data.testMode == true);
			});

			/**
			 * Called when pushing custom messages on Twitchat
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.CUSTOM_CHAT_MESSAGE, (e:TwitchatEvent)=> {
				const data = e.data as TwitchatDataTypes.MessageCustomDataAPI;
				const chunks = TwitchUtils.parseMessageToChunks(data.message || "", undefined, true);
				const message:TwitchatDataTypes.MessageCustomData = {
					id: Utils.getUUID(),
					date: Date.now(),
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.CUSTOM,
					actions: data.actions,
					message: data.message,
					message_chunks: chunks,
					message_html: TwitchUtils.messageChunksToHTML(chunks),
					col: data.col,
					style: data.style,
					icon: data.icon,
					user: data.user,
					channel_id:StoreProxy.auth.twitch.user.id,
				};
				StoreProxy.chat.addMessage(message);
			});

			/**
			 * Called when switching to another scene
			 */
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_SCENE_CHANGE, async (event:TwitchatEvent):Promise<void> => {
				//If no scene whas stored, get the current one to use it as the "previousSceneName" on the trigge rmessage
				if(!this.currentOBSScene) {
					this.currentOBSScene = await OBSWebsocket.instance.getCurrentScene();
				}
				const e = event.data as {sceneName:string};
				const m:TwitchatDataTypes.MessageOBSSceneChangedData = {
					id: Utils.getUUID(),
					date: Date.now(),
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE,
					sceneName: e.sceneName,
					previousSceneName: this.currentOBSScene,
					channel_id:StoreProxy.auth.twitch.user.id,
				};
				this.currentOBSScene = e.sceneName;
				TriggerActionHandler.instance.execute(m);
				rebuildPlaceholdersCache();
			});

			/**
			 * Called when a source visibility is toggled
			 */
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_SOURCE_TOGGLE, (event:TwitchatEvent):void => {
				const data = (event.data as unknown) as {item:OBSSourceItem, event:{sceneItemId:number, sceneItemEnabled:boolean, sceneName:string}};
				const m:TwitchatDataTypes.MessageOBSSourceToggleData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE,
					sourceName:data.item.sourceName,
					sourceItemId:data.event.sceneItemId,
					visible:data.event.sceneItemEnabled,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(m);
			});

			/**
			 * Called when a source is muted or unmuted
			 */
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_MUTE_TOGGLE, (event:TwitchatEvent):void => {
				const data = (event.data as unknown) as {inputName:string, inputMuted:boolean};
				const m:TwitchatDataTypes.MessageOBSInputMuteToggleData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE,
					inputName:data.inputName,
					muted:data.inputMuted,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(m);
			});

			/**
			 * Called when a filter visibility is toggled
			 */
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_FILTER_TOGGLE, (event:TwitchatEvent):void => {
				const data = (event.data as unknown) as {sourceName: string, filterName: string, filterEnabled: boolean};
				const m:TwitchatDataTypes.MessageOBSFilterToggleData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE,
					sourceName:data.sourceName,
					filterName:data.filterName,
					enabled:data.filterEnabled,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(m);
			});

			/**
			 * Called when streaming is started/stoped on OBS
			 */
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_STREAM_STATE, (event:TwitchatEvent):void => {
				const data = (event.data as unknown) as {outputActive: boolean, outputState: string};
				let m:TwitchatDataTypes.MessageOBSStartStreamData | TwitchatDataTypes.MessageOBSStopStreamData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.OBS_START_STREAM,
					channel_id:StoreProxy.auth.twitch.user.id,
				};
				if(!data.outputActive){
					m = {...m,
						type: TwitchatDataTypes.TwitchatMessageType.OBS_STOP_STREAM,
					};
				}
				TriggerActionHandler.instance.execute(m);
			});

			/**
			 * Called when a playback event occurs on a media source
			 * @param event 
			 */
			function onPlayBackStateChanged(event:TwitchatEvent):void {
				const data = (event.data as unknown) as {inputName:string};
				const typeToState:Partial<{[key in TwitchatEventType]:TwitchatDataTypes.MessageOBSPlaybackStateValue}> = {};
				typeToState[TwitchatEvent.OBS_PLAYBACK_ENDED]		= "complete";
				typeToState[TwitchatEvent.OBS_PLAYBACK_STARTED]		= "start";
				typeToState[TwitchatEvent.OBS_PLAYBACK_PAUSED]		= "pause";
				typeToState[TwitchatEvent.OBS_PLAYBACK_NEXT]		= "next";
				typeToState[TwitchatEvent.OBS_PLAYBACK_PREVIOUS]	= "prev";
				typeToState[TwitchatEvent.OBS_PLAYBACK_RESTARTED]	= "restart";
				const m:TwitchatDataTypes.MessageOBSPlaybackStateUpdateData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE,
					inputName:data.inputName,
					state:typeToState[event.type as TwitchatEventType]!,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(m);
			}
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_PLAYBACK_ENDED, (e) => onPlayBackStateChanged(e));
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_PLAYBACK_STARTED, (e) => onPlayBackStateChanged(e));
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_PLAYBACK_PAUSED, (e) => onPlayBackStateChanged(e));
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_PLAYBACK_NEXT, (e) => onPlayBackStateChanged(e));
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_PLAYBACK_PREVIOUS, (e) => onPlayBackStateChanged(e));
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_PLAYBACK_RESTARTED, (e) => onPlayBackStateChanged(e));
			
			/**
			 * Called when an OBS source is renamed.
			 * Rename it on all triggers
			 */
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_INPUT_NAME_CHANGED, (event:TwitchatEvent):void => {
				const data = event.data as {oldInputName:string, inputName:string};
				StoreProxy.triggers.renameOBSSource(data.oldInputName, data.inputName);
			});
			
			/**
			 * Called when an OBS scene is renamed.
			 * Rename it on all triggers
			 */
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_SCENE_NAME_CHANGED, (event:TwitchatEvent):void => {
				const data = event.data as {oldSceneName:string, sceneName:string};
				StoreProxy.triggers.renameOBSScene(data.oldSceneName, data.sceneName);
			});

			/**
			 * Called when an OBS Filter is renamed.
			 * Rename it on all triggers
			 */
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_FILTER_NAME_CHANGED, (event:TwitchatEvent):void => {
				const data = event.data as {sourceName: string; oldFilterName: string; filterName: string};
				StoreProxy.triggers.renameOBSFilter(data.sourceName, data.oldFilterName, data.filterName);
			});

			/**
			 * Called when a user clicks on the stream
			 * Detects for a few twitch overlay being clicked as well as all the custom areas
			 */
			HeatSocket.instance.addEventListener(HeatEvent.CLICK, async (event:HeatEvent):Promise<void> => {
				StoreProxy.heat.handleClickEvent(event);
			});

			/**
			 * Handle GoXLR button events (press/release)
			 */
			function onGoXLRButton(event:GoXLRSocketEvent):void {
				const message:TwitchatDataTypes.MessageGoXLRButtonData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					pressed:event.type == GoXLRSocketEvent.BUTTON_PRESSED,
					button:event.buttonId!,
					type:TwitchatDataTypes.TwitchatMessageType.GOXLR_BUTTON,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(message);
			}
			GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.BUTTON_PRESSED, onGoXLRButton);
			GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.BUTTON_RELEASED, onGoXLRButton);
			
			/**
			 * Handle GoXLR FX state
			 */
			function onGoXLRFx(event:GoXLRSocketEvent):void {
				const message:TwitchatDataTypes.MessageGoXLRFXEnableChangeData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					fxIndex:event.fxIndex!,
					enabled:event.type == GoXLRSocketEvent.FX_ENABLED,
					type:TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(message);
			}
			GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.FX_ENABLED, onGoXLRFx);
			GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.FX_DISABLED, onGoXLRFx);
			
			/**
			 * Handle GoXLR mute state
			 */
			function onGoXLRMute(event:GoXLRSocketEvent):void {
				const message:TwitchatDataTypes.MessageGoXLRSoundInputData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					mute:event.type == GoXLRSocketEvent.FADER_MUTE,
					faderIndex: event.faderIndex!,
					type:TwitchatDataTypes.TwitchatMessageType.GOXLR_SOUND_INPUT,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(message);
			}
			GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.FADER_MUTE, onGoXLRMute);
			GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.FADER_UNMUTE, onGoXLRMute);

			/**
			 * Handle GoXLR sampler complete
			 */
			GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.SAMPLE_PLAYBACK_COMPLETE, (e:GoXLRSocketEvent)=>{
				const message:TwitchatDataTypes.MessageGoXLRSampleCompleteData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.GOXLR_SAMPLE_COMPLETE,
					bank:e.bankId!,
					buttonId:e.samplerButtonId!,
					channel_id:StoreProxy.auth.twitch.user.id,
				}
				TriggerActionHandler.instance.execute(message);
			});
			
			/**
			 * Handle GoXLR encoder value change
			 */
			GoXLRSocket.instance.addEventListener(GoXLRSocketEvent.ENCODER, (e:GoXLRSocketEvent)=>{
				const configs = [StoreProxy.params.goxlrConfig.chatScrollSources, StoreProxy.params.goxlrConfig.chatReadMarkSources];
				for (let j = 0; j < configs.length; j++) {
					const config = configs[j];
					const indexToButtonId = ["EffectSelect1", "EffectSelect2", "EffectSelect3", "EffectSelect4", "EffectSelect5", "EffectSelect6"];
					for (let i = 0; i < config.length; i++) {
						const column = config[i];
						if(column[0] == indexToButtonId[e.fxIndex!]
						&& column[1] == e.encoderId!) {
							const key = e.fxIndex+"_"+e.encoderId+"_"+e.encoderValue;
							const id = e.encoderId!;
							const value = e.encoderValue!;
							const encoderParams = GoXLRSocket.instance.getEncoderPossibleValues(id);
							const resetValue = encoderParams.values[Math.round(encoderParams.values.length/2)]
							if(value !== resetValue) {
								const prevValue = e.prevEncoderValue!;
								const index1 = encoderParams.values.indexOf(prevValue);
								const index2 = encoderParams.values.indexOf(value);
								const delta = Math.round((index2 - index1)/encoderParams.step);
								//Scroll chat column
								if(j == 0) {
									PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_SCROLL, { col:i, scrollBy:delta }, true);
								}else{
									PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_READ, { col:i, count:delta }, true);
								}
								// let resetValue = prevValue;
								// let resetValue = encoderParams.values[Math.round(encoderParams.values.length/2)];
								// if(prevValue == encoderParams.values[0]) resetValue = encoderParams.values[1];
								// if(prevValue == encoderParams.values[encoderParams.values.length-1]) resetValue = encoderParams.values[encoderParams.values.length-2];
								//Reset encoder value
								GoXLRSocket.instance.setEncoderValue(id, resetValue);
							}
						}
				}
				}
			});

			if(DataStore.get(DataStore.HEAT_ENABLED) === "true" && StoreProxy.auth.twitch.user) {
				HeatSocket.instance.connect( StoreProxy.auth.twitch.user.id );
			}
		},
		
		loadDataFromStorage() {
			window.setInitMessage("load user data to memory");
			/**
			 * CAREFUL THIS METHOD CAN BE CALLED MULTIPLE TIMES
			 * Don't do anything that could break if called multiple times!
			 */
			const sOBS = StoreProxy.obs;
			const sTTS = StoreProxy.tts;
			const sChat = StoreProxy.chat;
			const sAuth = StoreProxy.auth;
			const sHeat = StoreProxy.heat;
			const sVoice = StoreProxy.voice;
			const sMusic = StoreProxy.music;
			const sUsers = StoreProxy.users;
			const sStream = StoreProxy.stream;
			const sParams = StoreProxy.params;
			const sTriggers = StoreProxy.triggers;
			const sAutomod = StoreProxy.automod;
			const sValues = StoreProxy.values;
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
						}else
						if(typeof pointer.value === 'string') {
							pointer.value = v;
						}else
						if(typeof pointer.value === 'number') {
							pointer.value = parseFloat(v);
						}else{
							pointer.value = JSON.parse(v);
						}
					}
				}
			}
			const theme = DataStore.get(DataStore.THEME);
			if(theme) {
				this.theme = theme as "light" | "dark";
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
			if(triggers && triggers != "undefined") {//Dunno how some users ended up having "undefined" as JSON T_T...
				Utils.mergeRemoteObject(JSON.parse(triggers), (sTriggers.triggerList as unknown) as JsonObject);
				// sTriggers.triggerList = JSON.parse(triggers);
				TriggerActionHandler.instance.populate(sTriggers.triggerList);
			}

			//Init triggers tree structure
			const triggerTree = DataStore.get(DataStore.TRIGGERS_TREE);
			if(triggerTree) {
				Utils.mergeRemoteObject(JSON.parse(triggerTree), (sTriggers.triggerTree as unknown) as JsonObject);
				sTriggers.computeTriggerTreeEnabledStates();
			}
				
			//Init stream info presets
			const presets = DataStore.get(DataStore.STREAM_INFO_PRESETS);
			if(presets) {
				sStream.streamInfoPreset = JSON.parse(presets);
			}

			//Init emergency followers
			const emergencyFollows = DataStore.get(DataStore.EMERGENCY_FOLLOWERS);
			if(emergencyFollows) {
				//Convert imported data to proper data format used for display on the popin
				sEmergency.follows = JSON.parse(emergencyFollows)
				//This is just a security in case user have old data format saved to ignore them from parsing
				//and avoid exceptions
				.filter((entry:TwitchatDataTypes.EmergencyFollowEntryData) => {
					return entry.uid !== undefined && entry.login !== undefined;
				})
				.map((entry:TwitchatDataTypes.EmergencyFollowEntryData):TwitchatDataTypes.MessageFollowingData => {
					const date = entry.date || Date.now();
					const channel_id = entry.channelId || sAuth.twitch.user.id;
					const platform = entry.platform || "twitch";
					return {
						id:Utils.getUUID(),
						date,
						channel_id,
						platform,
						followed_at:date,
						type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
						user:StoreProxy.users.getUserFrom(platform, channel_id, entry.uid, entry.login, entry.login, undefined, true),
						followbot:true,
						todayFirst:false,
					}
				});
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

			//Init counters
			const countersParams = DataStore.get(DataStore.COUNTERS);
			if(countersParams) {
				Utils.mergeRemoteObject(JSON.parse(countersParams), (sCounters.counterList as unknown) as JsonObject);
			}

			//Init values
			const valuesParams = DataStore.get(DataStore.VALUES);
			if(valuesParams) {
				Utils.mergeRemoteObject(JSON.parse(valuesParams), (sValues.valueList as unknown) as JsonObject);
			}

			//Init heat screens
			const heatScreensParams = DataStore.get(DataStore.HEAT_SCREENS);
			if(heatScreensParams) {
				Utils.mergeRemoteObject(JSON.parse(heatScreensParams), (sHeat.screenList as unknown) as JsonObject);
				DataStore.set(DataStore.CHAT_COLUMNS_CONF, sParams.chatColumnsConfig);
			}

			//Init custom user display names
			const customUsernamesParams = DataStore.get(DataStore.CUSTOM_USERNAMES);
			if(customUsernamesParams) {
				sUsers.customUsernames = JSON.parse(customUsernamesParams);
			}

			//Init custom user badges links (associations between user IDs and badge indices)
			const customUserbadgesParams = DataStore.get(DataStore.CUSTOM_USER_BADGES);
			if(customUserbadgesParams) {
				sUsers.customUserBadges = JSON.parse(customUserbadgesParams);
			}

			//Init custom user badge list
			const customBadgeListParams = DataStore.get(DataStore.CUSTOM_BADGE_LIST);
			if(customBadgeListParams) {
				sUsers.customBadgeList = JSON.parse(customBadgeListParams);
			}

			//Init goxlr params
			const goXLRParams = DataStore.get(DataStore.GOXLR_CONFIG);
			if(goXLRParams) {
				sParams.goxlrConfig = JSON.parse(goXLRParams);
				const ip = sParams.goxlrConfig.ip;
				const port = sParams.goxlrConfig.port;
				if(ip && port && sParams.goxlrConfig.enabled) {
					GoXLRSocket.instance.connect(ip, port).catch(error=>{});
				}
			}

			//Init raid history
			const raidHistoryParams = DataStore.get(DataStore.RAID_HISTORY);
			if(raidHistoryParams) {
				sStream.raidHistory = JSON.parse(raidHistoryParams);
			}

			//Init heat distortions
			const heatDistortionParams = DataStore.get(DataStore.OVERLAY_DISTORTIONS);
			if(heatDistortionParams) {
				sHeat.distortionList = JSON.parse(heatDistortionParams);
			}
			

			Database.instance.connect().then(async ()=> {
				await StoreProxy.chat.preloadMessageHistory();
				
				//Reload devmode state
				this.toggleDevMode( DataStore.get(DataStore.DEVMODE) === "true" );
			});

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

			/**
			 * Connect to Youtube (won't do anything if no credentials are available)
			 */
			YoutubeHelper.instance.connect();
		},

		alert(message:string, isCritical:boolean = false, showContact:boolean = false) {
			this.alertData.message = message;
			this.alertData.critical = isCritical;
			this.alertData.showContact = showContact;
		},

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
					channel_id:StoreProxy.auth.twitch.user.id,
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