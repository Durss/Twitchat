import { TriggerEvents, TriggerTypes, type TriggerActionObsDataAction, type TriggerActionDelayData, type TriggerData, type TriggerEventTypes, type TriggerTypesValue } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import type { JsonValue } from "type-fest";
import StoreProxy from "./StoreProxy";

/**
 * Fallback to sessionStorage if localStorage isn't available
 * Created : 18/10/2020 
 */
export default class DataStore {
	
	public static syncToServer:boolean = true;

	public static DATA_VERSION:string = "v";
	public static UPDATE_INDEX:string = "updateIndex";
	public static GREET_AUTO_DELETE_AFTER:string = "greetAutoDeleteAfter";
	public static GREET_AUTO_SCROLL_DOWN:string = "greetScrollDownAuto";
	public static GREET_AUTO_HEIGHT:string = "greetHeight";
	public static OBS_PORT:string = "obsPort";
	public static OBS_PASS:string = "obsPass";
	public static OBS_IP:string = "obsIP";
	public static OBS_CONNECTION_ENABLED:string = "obsConnectionEnabled";
	public static OBS_CONF_SCENES:string = "obsConf_scenes";
	public static OBS_CONF_MUTE_UNMUTE:string = "obsConf_muteUnmute";
	public static OBS_CONF_PERMISSIONS:string = "obsConf_permissions";
	public static TRIGGERS:string = "triggers";
	public static BOT_MESSAGES:string = "botMessages";
	public static RAFFLE_OVERLAY_COUNTDOWN:string = "raffle_showCountdownOverlay";
	public static CYPHER_KEY:string = "cypherKey";
	public static DEVMODE:string = "devmode";
	public static SPOTIFY_APP_PARAMS:string = "spotifyAppParams";
	public static SPOTIFY_AUTH_TOKEN:string = "spotifyAuthToken";
	public static STREAM_INFO_PRESETS:string = "streamInfoPresets";
	public static TTS_PARAMS:string = "ttsParams";
	public static EMERGENCY_PARAMS:string = "emergencyParams";
	public static EMERGENCY_FOLLOWERS:string = "emergencyFollowers";
	public static ALERT_PARAMS:string = "chatAlertParams";
	public static SPOILER_PARAMS:string = "spoilerParams";
	public static CHAT_HIGHLIGHT_PARAMS:string = "chatHighlightParams";
	public static TWITCH_AUTH_TOKEN:string = "oAuthToken";
	public static SYNC_DATA_TO_SERVER:string = "syncToServerV2";//Renamed to force sync on people after twitchat refactoring.
	public static GREET_HISTORY:string = "greetHistory";
	public static MUSIC_PLAYER_PARAMS:string = "musicPlayerParams";
	public static VOICEMOD_PARAMS:string = "voicemodParams";
	public static AUTOMOD_PARAMS:string = "automodParams";
	public static DONOR_LEVEL:string = "donorLevel";
	public static TWITCHAT_AD_WARNED:string = "adWarned";
	public static TWITCHAT_AD_NEXT_DATE:string = "adNextTS";
	public static TWITCHAT_SPONSOR_PUBLIC_PROMPT:string = "sponsorPublicPrompt";
	public static TWITCHAT_RIGHT_CLICK_HINT_PROMPT:string = "rightClickHintPrompt";
	public static INTERFACE_SCALE:string = "interfaceScale";
	public static CHAT_COLUMNS_CONF:string = "chatColumnsConf";
	public static COLLAPSE_PARAM_AD_INFO:string = "collapseParamAdInfo";
	public static COUNTERS:string = "counters";
	public static LANGUAGE:string = "lang";
	public static CHAT_COL_CTA:string = "chatColCTA";
	public static WEBSOCKET_TRIGGER:string = "websocketTrigger";
	/**
	 * @deprecated Only here for typings on data migration
	 */
	public static LEFT_COL_SIZE:string = "leftColSize";

	private static store:Storage;
	private static dataPrefix:string = "twitchat_";
	private static saveTO:number = -1;
	private static dataImported:boolean = false;
	private static rawStore:{[key:string]:(JsonValue|unknown)} = {};
	
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Initialize the storage.
	 */
	public static init():void {
		this.store = localStorage? localStorage : sessionStorage;
		this.syncToServer = this.get(this.SYNC_DATA_TO_SERVER) !== "false";

		//load LocalStorage data and parse values from string to number and booleans
		//if necessary and keep it on a local typed stored "rawStore"
		const items = this.getAll();
		for (const key in items) {
			try{
				items[key] = JSON.parse(items[key] as string);
			}catch(error) {
				//parsing failed, that's because it's a simple string, just keep it
			}
		}
		this.rawStore = items;
	}

	/**
	 * Makes asynchronous data migrations after being authenticated
	 */
	public static async migrateData(data:any):Promise<any> {
		let v = parseInt(data[this.DATA_VERSION]) || 1;
		
		if(v < 11) {
			return {};
		}
		
		if(v<=12) {
			this.fixTTSPlaceholders(data);
			v = 13;
		}
		if(v==13) {
			this.cleanupOldData(data);
			v = 14;
		}
		if(v==14) {
			this.migrateChatCommandTriggers(data);
			v = 15;
		}
		if(v==15) {
			this.migrateEmergencyAutoblock(data);
			v = 16;
		}
		if(v==16) {
			delete data["p:historySize"];
			v = 17;
		}
		if(v==17) {
			//Here was a beta temporary fix not needed anymore.
			v = 18;
		}
		if(v==18) {
			this.migrateRaffleTriggerDuration(data);
			v = 19;
		}
		if(v==19 || v==20) {
			this.migrateRaffleTriggerTypoAndTextSize(data);
			v = 21;
		}
		if(v==21) {
			this.migrateTriggerSubgiftPlaceholder(data);
			v = 22;
		}
		if(v==22) {
			await this.migrateStreamTags(data);
			v = 23;
		}
		if(v==23) {
			//Here was a beta temporary fix not needed anymore.
			v = 24;
		}
		if(v==24) {
			await this.migrateStreamTags(data);
			v = 25;
		}
		if(v==25) {
			this.migratePermissions(data);
			v = 26;
		}
		if(v==26) {
			this.migrateChatColUserAndCommands(data);
			v = 27;
		}
		if(v==27) {
			this.migrateEmergencyTOs(data);
			v = 28;
		}
		if(v==28) {
			this.migratePermissions(data);
			this.migrateEmergencyTOs(data);
			v = 29;
		}
		if(v==29 || v==30){
			this.cleanupPreV7Data(data);
			delete data["syncToserver"];
			v = 31
		}
		if(v==31) {
			//v31 is a refactor of the datastore logic to fix failing migration cleanups
			//Instead of migrating data of the localStorage it now migrates JSON
			//data then saves it on the localStorage.

			//Redoing old migration to make sure they're effective
			this.cleanupPreV7Data(data);
			delete data["syncToserver"];
			v = 32;
		}
		if(v==32) {
			this.enableLiveOnOffNotification(data);
			v = 33;
		}
		if(v==33) {
			this.cleanNonAttributedOBSScenes(data);
			v = 34;
		}
		if(v==34) {
			this.migrateTrackAddedTriggerPlaceholder(data);
			v = 35;
		}
		if(v==35) {
			this.migrateOBSTriggerActions(data);
			v = 36;
		}
		if(v==36) {
			this.migrateTriggersData(data);
			v = 37;
		}

		data[this.DATA_VERSION] = v;
		return data;
	}

	/**
	 * Load user's data from the server
	 * @imp
	 * @returns if user has data or not
	 */
	public static async loadRemoteData(importToLS:boolean = true):Promise<boolean> {
		if(!this.store) this.init();

		try {
			const headers = {
				'Authorization': 'Bearer '+StoreProxy.auth.twitch.access_token,
				'App-Version': import.meta.env.PACKAGE_VERSION,
			};
			const res = await fetch(Config.instance.API_PATH+"/user/data", {method:"GET", headers});
			if(importToLS) {
				// console.log("Import to local storage...");
				//Import data to local storage.
				const json = await res.json();
				if(json.success === true) {
					await this.loadFromJSON(json.data);
				}
			}
			return res.status != 404;
		}catch(error) {
			console.error("Remote data loading failed !");
			console.log(error);
			return false;
		}
	}

	/**
	 * Replace local data by the given JSON
	 */
	public static async loadFromJSON(json:any):Promise<void> {
		const automodRulesBackup:TwitchatDataTypes.AutomodParamsKeywordFilterData[] = [];
		let automod:TwitchatDataTypes.AutomodParamsData = JSON.parse(this.get(DataStore.AUTOMOD_PARAMS));

		this.rawStore = await this.migrateData(json);//Migrate remote data if necessary

		if(automod && automod.keywordsFilters && automod.keywordsFilters.length > 0) {
			//Make sure we don't loose unsynced automod rules
			//(should think of a generic way of doing this..)
			for (let i = 0; i < automod.keywordsFilters.length; i++) {
				const el = automod.keywordsFilters[i];
				if(!el.serverSync) {
					automodRulesBackup.push( automod.keywordsFilters.splice(i, 1)[0] );
					i--;
					if(i < 0) break;
				}
			}

			//Update storage without non synced rules
			this.set(DataStore.AUTOMOD_PARAMS, automod);

			//Cleanup rules.
			//I made a huge mistake leading to rules duplicating at every call of this
			//method leading to memory overflow. This removes any duplicate
			const doneEntries:{[key:string]:boolean} = {};
			for (let i = 0; i < automodRulesBackup.length; i++) {
				const value = automodRulesBackup[i];
				const key = JSON.stringify(value);
				if(doneEntries[key] !== true) {
					doneEntries[key] = true;
				}else{
					automodRulesBackup.splice(i,1);
					i--;
					if(i < 0) break;
				}
			}
		}

		//Update localstorage data
		for (const key in json) {
			const value = json[key];
			const str = typeof value == "string"? value : JSON.stringify(value);
			this.store.setItem(this.dataPrefix + key, str);
		}

		//Bring back auto mode rules backed up before
		if(automodRulesBackup.length > 0) {
			automod = JSON.parse(this.get(DataStore.AUTOMOD_PARAMS));
			for (let i = 0; i < automodRulesBackup.length; i++) {
				automod.keywordsFilters.push(automodRulesBackup[i]);
			}
			this.set(DataStore.AUTOMOD_PARAMS, automod);
		}

		this.dataImported = true;
		this.save();
	}

	/**
	 * Migrates data on the LocalStorage
	 */
	public static async migrateLocalStorage():Promise<void> {
		//load LocalStorage data and parse values from string to numbers and booleans
		//if necessary then keep it on a local typed stored "rawStore"
		const items = this.getAll();
		for (const key in items) {
			try{
				items[key] = JSON.parse(items[key] as string);
			}catch(error) {
				//parsing failed, that's because it's a simple string, just keep it
			}
		}

		const json = await this.migrateData(items);//Migrate remote data if necessary

		//Update localstorage data
		for (const key in json) {
			const value = json[key];
			const str = typeof value == "string"? value : JSON.stringify(value);
			this.store.setItem(this.dataPrefix + key, str);
		}

		this.rawStore = json;
	}

	/**
	 * Save user's data server side
	 * @returns 
	 */
	public static async save(force:boolean = false, delay:number = 1500):Promise<void> {
		clearTimeout(this.saveTO);
		if(!force) {
			if(!this.syncToServer) return;//User wants to only save data locally
			if(!this.dataImported) return;//Don't export anything before importing data first
			if(!StoreProxy.auth.twitch.access_token) return;
		}
		
		return new Promise((resolve) => {
			this.saveTO = setTimeout(async () => {
				const data = JSON.parse(JSON.stringify(this.rawStore));
				//Do not save sensitive data to server
				delete data[this.OBS_PASS];
				delete data[this.TWITCH_AUTH_TOKEN];
				delete data[this.SPOTIFY_AUTH_TOKEN];
				delete data[this.SPOTIFY_APP_PARAMS];
				
				//Things unnecessary to save server side
				delete data[this.GREET_HISTORY];
				delete data[this.SYNC_DATA_TO_SERVER];
				delete data[this.INTERFACE_SCALE];
				delete data[this.CHAT_COL_CTA];
				delete data.deezerEnabled;
				delete data.redirect;
				delete data["p:shoutoutLabel"];//Old data that some people still have
				
				//Remove automod items the user asked not to sync to server
				const automod = data.automodParams as TwitchatDataTypes.AutomodParamsData;
				if(automod) {
					for (let i = 0; i < automod.keywordsFilters.length; i++) {
						if(!automod.keywordsFilters[i].serverSync) {
							automod.keywordsFilters.splice(i,1);
							i--;
						}
					}
				}
	
				const headers = {
					"Content-Type": "application/json",
					'Authorization': 'Bearer '+StoreProxy.auth.twitch.access_token,
					'App-Version': import.meta.env.PACKAGE_VERSION,
				}
				await fetch(Config.instance.API_PATH+"/user/data", {method:"POST", headers, body:JSON.stringify(data)});
				
				//If we forced upload, consider data has been imported as they are
				//the same on local and remote. This will allow later automatic saves
				if(force) this.dataImported = true;
				resolve();
			}, force? 0 : delay);
		})
	}

	/**
	 * Get a value
	 * @param key 
	 * @returns 
	 */
	public static get(key:string):string {
		if(!this.store) this.init();
		return this.store.getItem(this.dataPrefix + key) as string;
	}

	/**
	 * Get all values
	 * @returns 
	 */
	public static getAll():{[key:string]:string|null} {
		if(!this.store) this.init();
		const props:{[key:string]:string|null} = {};
		for (let i = 0; i < this.store.length; i++) {
			const key = this.store.key(i);
			if(!key || key.indexOf(this.dataPrefix) == -1) continue;
			const k = key.replace(this.dataPrefix, "");
			props[k] = this.store.getItem(key);
		}
		return props;
	}

	/**
	 * Set a value
	 * 
	 * @param key 
	 * @param value 
	 * @param save 	schedule a save to the server
	 * @returns 
	 */
	public static async set(key:string, value:JsonValue|unknown, save = true, saveDelay:number = 1500):Promise<void> {
		if(key == this.SYNC_DATA_TO_SERVER) {
			this.syncToServer = value as boolean;
			if(!this.dataImported) {
				await this.loadRemoteData();
			}
		}
		
		if(!this.store) this.init();
		if(value == undefined) return;
		this.rawStore[key] = value;
		const str = typeof value == "string"? value : JSON.stringify(value);
		this.store.setItem(this.dataPrefix + key, str);
		
		if(save) this.save(false, saveDelay);
	}

	/**
	 * Remove a value
	 * 
	 * @param key 
	 */
	public static remove(key:string):void {
		if(!this.store) this.init();
		delete this.rawStore[key];
		this.store.removeItem(this.dataPrefix + key);
		this.save();
	}

	/**
	 * Clear all values
	 */
	public static clear(keepSession:boolean = false):void {
		if(!this.store) this.init();
		//Remove only the data with the proper prefix
		for (let i = 0; i < this.store.length; i++) {
			const key = this.store.key(i);
			if(!key || key.indexOf(this.dataPrefix) == -1) continue;
			if(keepSession) {
				const cleanKey = key.replace(this.dataPrefix, "");
				if(cleanKey === this.TWITCH_AUTH_TOKEN) continue;
			}
			delete this.rawStore[key];
			this.store.removeItem(key);
			i--;
		}
		this.rawStore = {};
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/



	/**********************************
	 **** DATA MIGRATION UTILITIES ****
	 **********************************/

	/**
	 * Fixing wrong TTS placeholders
	 */
	private static fixTTSPlaceholders(data:any):void {
		const params = data[this.TTS_PARAMS] as TwitchatDataTypes.TTSParamsData;
		if(params) {
			params.readBingosPattern = params.readBingosPattern.replace(/\{USER\}/gi, "{WINNER}");
			params.readRafflePattern = params.readRafflePattern.replace(/\{USER\}/gi, "{WINNER}");
			data[this.TTS_PARAMS] = params;
		}
	}

	/**
	 * Temporary utility to cleanup some old storage data
	 * Can be removed after some updates.
	 */
	private static cleanupOldData(data:any):void {
		//rename "raffle_postOnChat" to "raffle_messageEnabled" ofr more consistency
		if(data["raffle_postOnChat"] != null) {
			data["raffle_messageEnabled"] = data["raffle_postOnChat"];
			delete data["raffle_postOnChat"];
		}
		delete data["p:emotesOnly"];
		delete data["p:modsSize"];
		delete data["p:vipsSize"];
		delete data["p:followersOnly"];
		delete data["p:subsSize"];
		delete data["p:subsOnly"];
		delete data["p:slowMode"];
		delete data["p:ignoreSelf"];
		delete data["p:hideEmotes"];
		delete data["tmiToken"];
		delete data["authToken"];
		delete data["p:hideBadges"];
		delete data["p:hideBot"];
	}


	/**
	 * Changes the "chatCommand" trigger prop to more generic "name"
	 */
	private static migrateChatCommandTriggers(data:any):void {
		const triggers:{[key:string]:TriggerData} = data[DataStore.TRIGGERS];
		if(!triggers) return;
		for (const key in triggers) {
			if(key.indexOf(TriggerTypes.CHAT_COMMAND) === 0
			&& triggers[key].chatCommand) {
				//Check if it's not full lowercased
				triggers[key].name = triggers[key].chatCommand as string;
				delete triggers[key].chatCommand
			}
		}

		data[DataStore.TRIGGERS] = triggers;
	}

	/**
	 * Changes the "chatCommand" trigger prop to more generic "name"
	 */
	private static migrateEmergencyAutoblock(data:any):void {
		const params:TwitchatDataTypes.EmergencyParamsData = data[this.EMERGENCY_PARAMS];
		if(params) {
			delete params.autoBlockFollows;
			delete params.autoUnblockFollows;
			data[this.EMERGENCY_PARAMS] = params;
		}
	}

	/**
	 * Made a mistake storing minutes instead of seconds
	 */
	private static migrateRaffleTriggerDuration(data:any):void {
		const triggers:{[key:string]:TriggerData} = data[DataStore.TRIGGERS];
		if(!triggers) return;
		for (const key in triggers) {
			const actions = triggers[key].actions;
			for (let i = 0; i < actions.length; i++) {
				const a = actions[i];
				if(a.type == "raffle" && a.raffleData && a.raffleData.duration && !isNaN(a.raffleData.duration)) {
					a.raffleData.duration_s = a.raffleData.duration * 60;
					// console.log("convert", a.raffleData.duration, "to", a.raffleData.duration_s);
					delete a.raffleData.duration;
				}
			}
		}

		data[DataStore.TRIGGERS] = triggers;
	}

	/**
	 * Made a mistake storing minutes instead of seconds
	 */
	private static migrateRaffleTriggerTypoAndTextSize(data:any):void {
		const triggers:{[key:string]:TriggerData} = data[DataStore.TRIGGERS];
		if(!triggers) return;
		for (const key in triggers) {
			const actions = triggers[key].actions;
			for (let i = 0; i < actions.length; i++) {
				const a = actions[i];
				if(a.type == "raffle" && a.raffleData) {
					//renaming "subgitRatio" to "subgiftRatio"
					//@ts-ignore
					if(a.raffleData.subgitRatio != undefined) {
						//@ts-ignore
						a.raffleData.subgiftRatio = a.raffleData.subgitRatio;
						//@ts-ignore
						delete a.raffleData.subgitRatio;
						// console.log("FIX", a);
					}
				}
			}
		}
		data[DataStore.TRIGGERS] = triggers;
		delete data["leftColSize"];//Remaining old data

		//Convert old size scale to the new one
		const sizeStr = data["p:defaultSize"];
		let size = parseFloat(sizeStr);
		if(isNaN(size)) size = 2;
		const convertionTable:{[key:number]:number} = {1:2, 2:3, 3:6, 4:9, 5:12, 6:17, 7:20}
		size = convertionTable[size]
		data["p:defaultSize"] = size;
	}

	/**
	 * Renamed placeholder "RECIPIENT" to "RECIPIENTS"
	 */
	private static migrateTriggerSubgiftPlaceholder(data:any):void {
		const triggers:{[key:string]:TriggerData} = data[DataStore.TRIGGERS];
		if(!triggers) return;
		for (const key in triggers) {
			const actions = triggers[key].actions;
			for (let i = 0; i < actions.length; i++) {
				const a = actions[i];

				if(a.type == "http") {
					a.queryParams.map(v=> v=="RECIPIENT"? "RECIPIENTS" : v);
				}else{
					//Nuclear way to replace other placeholders
					let json = JSON.stringify(a);
					json = json.replace(/\{RECIPIENT\}/gi, "{RECIPIENTS}");
					actions[i] = JSON.parse(json);
				}
			}
		}

		data[DataStore.TRIGGERS] = triggers;
	}

	/**
	 * Migrate stream tags following the new open tags endpoint
	 */
	private static async migrateStreamTags(data:any):Promise<void> {
		const presets:TwitchatDataTypes.StreamInfoPreset[] = data[DataStore.STREAM_INFO_PRESETS];
		if(!presets) return;
		let tags:string[] = [];
		for (let i = 0; i < presets.length; i++) {
			const p = presets[i];
			if(p.tagIDs) {
				tags = tags.concat(p.tagIDs);
			}
		}

		const result = await TwitchUtils.searchTag(tags);

		for (let i = 0; i < presets.length; i++) {
			const p = presets[i];
			if(p.tagIDs) {
				p.tags = [];
				for (let j = 0; j < p.tagIDs.length; j++) {
					const id = p.tagIDs[j];
					const tag = result.find(v=> v.id == id);
					if(tag) {
						p.tags.push(Utils.replaceDiacritics(tag.label).replace(/[^a-z0-9]/gi, "").substring(0, 25));
					}
				}
				delete p.tagIDs;
			}
		}

		data[DataStore.STREAM_INFO_PRESETS] = presets;
	}

	/**
	 * MIgrate all permissions systems (T_T)
	 */
	private static migratePermissions(data:any):void {
		//Migrate triggers
		const triggers:{[key:string]:TriggerData} = data[DataStore.TRIGGERS];
		if(triggers) {
			for (const key in triggers) {
				const perms = triggers[key].permissions;
				if(perms && perms.users) {
					const usersAllowed = perms.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
					perms.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
					perms.usersRefused = [];
					delete perms.users;
					// console.log("COMMAND "+key);
					// console.log(perms);
				}
			}
			data[DataStore.TRIGGERS] = triggers;
		}
		
		//Migrate automod
		const automod:TwitchatDataTypes.AutomodParamsData = data[DataStore.AUTOMOD_PARAMS];
		if(automod) {
			if(automod.exludedUsers.users) {
				const usersAllowed = automod.exludedUsers.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				automod.exludedUsers.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				automod.exludedUsers.usersRefused = [];
				delete automod.exludedUsers.users;
				// console.log("AUTOMOD");
				// console.log(automod);
				data[DataStore.AUTOMOD_PARAMS] = automod;
			}
		}
		
		//Migrate TTS
		const tts:TwitchatDataTypes.TTSParamsData = data[DataStore.TTS_PARAMS];
		if(tts) {
			if(tts.ttsPerms.users) {
				const usersAllowed = tts.ttsPerms.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				tts.ttsPerms.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				tts.ttsPerms.usersRefused = [];
			}

			//Transfer "readUsers" data to "usersAllowed"
			if(tts.readUsers && tts.readUsers.length > 0) {
				for (let i = 0; i < tts.readUsers.length; i++) {
					const user = tts.readUsers[i].toLowerCase();
					if(tts.ttsPerms.usersAllowed.findIndex(v=>v.toLowerCase() == user) == -1) {
						tts.ttsPerms.usersAllowed.push(user);
					}
				}
				delete tts.readUsers;
			}
			delete tts.ttsPerms.users;
			// console.log("TTS");
			// console.log(confs);
			data[DataStore.TTS_PARAMS] = tts;
		}
		
		//Migrate OBS
		const obs:TwitchatDataTypes.PermissionsData = data[DataStore.OBS_CONF_PERMISSIONS];
		if(obs) {
			if(obs.users) {
				const usersAllowed = obs.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				obs.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				obs.usersRefused = [];
				delete obs.users;
				// console.log("OBS");
				// console.log(perms);
				data[DataStore.OBS_CONF_PERMISSIONS] = obs;
			}
		}
		
		//Migrate emergency mode
		const emergency:TwitchatDataTypes.EmergencyParamsData = data[DataStore.EMERGENCY_PARAMS];
		if(emergency) {
			if(emergency.chatCmdPerms.users) {
				const usersAllowed = emergency.chatCmdPerms.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				emergency.chatCmdPerms.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				emergency.chatCmdPerms.usersRefused = [];
				delete emergency.chatCmdPerms.users;
				// console.log("EMERGENCY");
				// console.log(perms);
				data[DataStore.EMERGENCY_PARAMS] = emergency;
			}
		}
		
		//Migrate spoiler
		const spoiler:TwitchatDataTypes.SpoilerParamsData = data[DataStore.SPOILER_PARAMS];
		if(spoiler) {
			if(spoiler.permissions.users) {
				const usersAllowed = spoiler.permissions.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				spoiler.permissions.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				spoiler.permissions.usersRefused = [];
				delete spoiler.permissions.users;
				// console.log("SPOILER");
				// console.log(perms);
				data[DataStore.SPOILER_PARAMS] = spoiler;
			}
		}
		
		//Migrate chat alert
		const alertSrc:TwitchatDataTypes.AlertParamsData = data[DataStore.ALERT_PARAMS];
		if(alertSrc) {
			if(alertSrc.permissions.users) {
				const usersAllowed = alertSrc.permissions.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				alertSrc.permissions.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				alertSrc.permissions.usersRefused = [];
				delete alertSrc.permissions.users;
				// console.log("CHAT ALERT");
				// console.log(perms);
				data[DataStore.ALERT_PARAMS] = alertSrc;
			}
		}
		
		//Migrate voicemod
		const voicemod:TwitchatDataTypes.VoicemodParamsData = data[DataStore.VOICEMOD_PARAMS];
		if(voicemod) {
			if(voicemod.chatCmdPerms.users) {
				const usersAllowed = voicemod.chatCmdPerms.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				voicemod.chatCmdPerms.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				voicemod.chatCmdPerms.usersRefused = [];
				delete voicemod.chatCmdPerms.users;
				// console.log("VOICEMOD");
				// console.log(perms);
				data[DataStore.VOICEMOD_PARAMS] = voicemod;
			}
		}

	}

	/**
	 * Converts string lists like "value1, value2, value3" to an array of strings
	 */
	private static migrateChatColUserAndCommands(data:any):void {
		const confs:TwitchatDataTypes.ChatColumnsConfig[] = data[DataStore.CHAT_COLUMNS_CONF];
		if(confs) {
			for (let i = 0; i < confs.length; i++) {
				const c = confs[i];
				if(typeof c.commandsBlockList == "string") {
					c.commandsBlockList = (c.commandsBlockList as string).split(",");
					for (let i = 0; i < c.commandsBlockList.length; i++) {
						const v = c.commandsBlockList[i];
						if(v.trim().length == 0) {
							c.commandsBlockList.splice(i,1);
							i--;
						}else{
							c.commandsBlockList[i] = v.trim();
						}
					}
				}
				if(typeof c.userBlockList == "string") {
					c.userBlockList = (c.userBlockList as string).split(/[^a-z0-9_]+/gi);
					for (let i = 0; i < c.userBlockList.length; i++) {
						const v = c.userBlockList[i];
						if(v.trim().length == 0) {
							c.userBlockList.splice(i,1);
							i--;
						}else{
							c.userBlockList[i] = v.trim();
						}
					}
				}
			}
			data[DataStore.CHAT_COLUMNS_CONF] = confs;
		}
	}

	/**
	 * Converts TO user list from string to array of string
	 */
	private static migrateEmergencyTOs(data:any):void {
		const confs:TwitchatDataTypes.EmergencyParamsData = data[DataStore.EMERGENCY_PARAMS];
		if(confs) {
			if(typeof confs.toUsers === "string") {
				confs.toUsers = (confs.toUsers as string).split(/[^a-z0-9_]+/gi).filter(v=> v.length > 0);
			}else{
				confs.toUsers = confs.toUsers.filter(v=> v.length > 0);
			}
			data[DataStore.EMERGENCY_PARAMS] = confs;
		}
	}

	/**
	 * Cleanup useless old data
	 */
	private static cleanupPreV7Data(data:any):void {
		delete data["level"];
		delete data["isDonor"];
		delete data["p:hideUsers"];
		delete data["p:censorDeletedMessages"];
		delete data["p:showSelf"];
		delete data["p:blockedCommands"];
		delete data["p:ignoreListCommands"];
		delete data["p:ignoreCommands"];
		delete data["p:showSlashMe"];
		delete data["p:showBots"];
		delete data["p:keepDeletedMessages"];
		delete data["p:firstTimeMessage"];
		delete data["p:keepHighlightMyMessages"];
		delete data["p:historySize"];
		delete data["p:notifyJoinLeave"];
		delete data["p:raidStreamInfo"];
		delete data["p:receiveWhispers"];
		delete data["p:showWhispersOnChat"];
		delete data["p:showCheers"];
		delete data["p:showFollow"];
		delete data["p:showHypeTrain"];
		delete data["p:showNotifications"];
		delete data["p:showRaids"];
		delete data["p:showRewards"];
		delete data["p:showRewardsInfos"];
		delete data["p:showSubs"];
		delete data["p:splitView"];
		delete data["p:splitViewSwitch"];
		delete data["p:emergencyButton"];
		delete data["leftColSize"];
		delete data["activityFeedFilters"];
	}

	/**
	 * Forces new stream online/offline notifications
	 * @param data
	 */
	private static enableLiveOnOffNotification(data:any):void {
		const cols:TwitchatDataTypes.ChatColumnsConfig[] = data[this.CHAT_COLUMNS_CONF]
		if(cols) {
			const index = cols.length == 1? 0 : 1;
			cols[index].filters.stream_online = true;
			//Set where to show "greet them" and forms
			cols[index].showPanelsHere = true;
		}
	}

	/**
	 * So far all OBS scenes were stored even if no command was attributed
	 * to a scene. Here we clean all scene with no command now that they're
	 * filtered out on save.
	 * @param data
	 */
	private static cleanNonAttributedOBSScenes(data:any):void {
		const scenes:TwitchatDataTypes.OBSSceneCommand[] = data[this.OBS_CONF_SCENES];
		if(scenes) {
			data[this.OBS_CONF_SCENES] = scenes.filter(v=> (v.command ?? "") != "");
		}
	}

	/**
	 * Until then when using the "add track to queue" trigger action, the placeholder
	 * to display the track info on the confirmation message was the same than the
	 * one used to display the currently playing track.
	 * Basically we only had {CURRENT_TRACK_XXX} placeholders.
	 * Now there are {ADDED_TRACK_XXX} placeholders.
	 * Here we migrate all {CURRENT_TRACK_XXX} placeholders to {ADDED_TRACK_XXX}
	 * only for the track added actions
	 */
	private static migrateTrackAddedTriggerPlaceholder(data:any):void {
		const triggers:{[key:string]:TriggerData} = data[DataStore.TRIGGERS];
		if(!triggers) return;
		for (const key in triggers) {
			for (let i = 0; i < triggers[key].actions.length; i++) {
				const a = triggers[key].actions[i];
				if(a.type == "music" && a.confirmMessage) {
					a.confirmMessage = a.confirmMessage.replace(/\{CURRENT_TRACK_(.*?)\}/gi, "{ADDED_TRACK_$1}");
				}
			}
		}

		data[DataStore.TRIGGERS] = triggers;
	}

	/**
	 * Until then OBS trigger action just had a "show" property containing:
	 * true => show source
	 * false => hide source
	 * "replay" => replay media source
	 * 
	 * This prop is now named "action" and contains only string values.
	 */
	private static migrateOBSTriggerActions(data:any):void {
		const triggers:{[key:string]:TriggerData} = data[DataStore.TRIGGERS];
		if(!triggers) return;
		for (const key in triggers) {
			for (let i = 0; i < triggers[key].actions.length; i++) {
				const a = triggers[key].actions[i];
				if(a.type == "obs" && a.show) {
					let action:TriggerActionObsDataAction = a.show == "replay"? "replay" : a.show === true? "show" : "hide";
					a.action = action;
					delete a.show;
				}
			}
		}

		data[DataStore.TRIGGERS] = triggers;
	}

	/**
	 * Migrates triggers data to the new triggers system
	 * @param data 
	 * 
	 */
	public static migrateTriggersData(data:any):void {
		const triggers:{[key:string]:TriggerData} = data[DataStore.TRIGGERS];
		if(Array.isArray(triggers)) return;//Already migrated to new data format
		if(!triggers) return;
		const triggerList:TriggerData[] = [];
		let events:TriggerEventTypes[] = TriggerEvents();
		const allowedKeys:{[key:string]:boolean} = {};
		events.forEach(v => allowedKeys[v.value] = true);
		for (const key in triggers) {
			const t = triggers[key];
			const chunks = key.split("_");
			const triggerKey = chunks.shift();
			const subkey = chunks.join("_");
			if(!triggerKey || !allowedKeys[triggerKey]) continue;//Ignore potentially old trigger types
			t.id = Utils.getUUID();
			t.type = triggerKey as TriggerTypesValue;
			switch(t.type) {
				case TriggerTypes.CHAT_COMMAND: t.chatCommand = t.name; break;
				case TriggerTypes.REWARD_REDEEM: t.rewardId = subkey; break;
				case TriggerTypes.SCHEDULE: t.rewardId = t.name; break;
				case TriggerTypes.OBS_SCENE: t.obsScene = t.name =subkey; break;
				case TriggerTypes.OBS_SOURCE_ON: t.obsSource = t.name = subkey; break;
				case TriggerTypes.OBS_SOURCE_OFF: t.obsSource = t.name = subkey; break;
				case TriggerTypes.COUNTER_LOOPED:
				case TriggerTypes.COUNTER_MAXED:
				case TriggerTypes.COUNTER_MINED:
				case TriggerTypes.COUNTER_DEL:
				case TriggerTypes.COUNTER_ADD: t.counterId = subkey; break;
			}
			if(t.queue == "") delete t.queue;
			if(t.name == "") delete t.name;

			for (let i = 0; i < t.actions.length; i++) {
				const a = t.actions[i];
				a.id = Utils.getUUID();//Override old useless IDs that were Math.random() values

				//Migrate OBS actions
				if(a.type == "obs") {
					if(a.show == true) a.action = "show";
					if(a.show == false) a.action = "hide";
					if(a.show == "replay") a.action = "replay";
					delete a.show;
				}
				//Convert delays to dedicated actions
				if(a.delay && a.delay > 0) {
					const newAction:TriggerActionDelayData = { delay:a.delay!, id:Utils.getUUID(), type:"delay"};
					t.actions.splice(i+1, 0, newAction);
					i++;//Skip newly added action
				}
				delete a.delay;
			}
			triggerList.push(t);
		}

		function keyToTrigger(key:string):TriggerData|null {
			const type = key.split("_")[0] as TriggerTypesValue;
			const subType = key.replace(type+"_", "").toLowerCase();
			switch(type) {
				case TriggerTypes.CHAT_COMMAND: {
					const item = triggerList.find(v => v.type == type && v.chatCommand?.toLowerCase() == subType.toLowerCase() );
					if(item) return item
					break;
				}
				case TriggerTypes.REWARD_REDEEM: {
					const item = triggerList.find(v => v.type == type && v.rewardId?.toLowerCase() == subType );
					if(item) return item
					break;
				}
				case TriggerTypes.COUNTER_LOOPED: 
				case TriggerTypes.COUNTER_MAXED: 
				case TriggerTypes.COUNTER_MINED: 
				case TriggerTypes.COUNTER_ADD: 
				case TriggerTypes.COUNTER_DEL: {
					const item = triggerList.find(v => v.type == type && v.rewardId?.toLowerCase() == subType );
					if(item) return item
					break;
				}
				default: {
					const item = triggerList.find(v => v.type == type );
					if(item) return item
				}
			}
			return null;
		}

		//Migrate any trigger action using triggers
		for (let j = 0; j < triggerList.length; j++) {
			const t = triggerList[j];
			
			for (let i = 0; i < t.actions.length; i++) {
				const a = t.actions[i];
				//Migrate random entries
				if(a.type === "random" && a.triggers) {
					const ids = [];
					for (let h = 0; h < a.triggers.length; h++) {
						const trigger = keyToTrigger(a.triggers[h]);
						if(trigger) ids.push(trigger.id);
					}
					console.log("Migrated random ", a.triggers, ids);
					a.triggers = ids;
				}else
				//Migrate random entries
				if(a.type === "trigger" && a.triggerKey) {
					const trigger = keyToTrigger(a.triggerKey);
					console.log("Migrated trigger ", a.triggerKey, trigger);
					delete a.triggerKey;
					if(trigger) a.triggerId = trigger.id;
				}
			}
		}
		

		console.log(triggerList);

		data[DataStore.TRIGGERS] = triggerList;
	}
}