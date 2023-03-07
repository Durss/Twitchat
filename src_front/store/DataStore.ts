import { TriggerTypes, type TriggerActionTypes, type TriggerData } from "@/types/TriggerActionDataTypes";
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
	public static INTERFACE_SCALE:string = "interfaceScale";
	public static CHAT_COLUMNS_CONF:string = "chatColumnsConf";
	public static COLLAPSE_PARAM_AD_INFO:string = "collapseParamAdInfo";
	public static COUNTERS:string = "counters";
	public static LANGUAGE:string = "lang";
	public static CHAT_COL_CTA:string = "chatColCTA";
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
	 * Migrates data if necessary
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
		
		if(v < 13) {
			return {};
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
			//data then saves i on the localStorage.

			//Redoing old migration to make sure they're effective
			this.cleanupPreV7Data(data);
			delete data["syncToserver"];
			v = 32;
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
		const backupAutomod:TwitchatDataTypes.AutomodParamsData = JSON.parse(this.get(DataStore.AUTOMOD_PARAMS));

		// const items = this.getAll();
		// for (const key in items) {
		// 	try{
		// 		items[key] = JSON.parse(items[key] as string);
		// 	}catch(error) {
		// 		//parsing failed, that's because it's a simple string, just keep it
		// 	}
		// }

		this.rawStore = await this.migrateData(json);//Migrate remote data if necessary

		if(backupAutomod) {
			//Make sure we don't loose unsynced automod rules
			//(should think of a generic way of doing this..)
			const automod:TwitchatDataTypes.AutomodParamsData = JSON.parse(this.get(DataStore.AUTOMOD_PARAMS));
			for (let i = 0; i < backupAutomod.keywordsFilters.length; i++) {
				const el = backupAutomod.keywordsFilters[i];
				if(!el.serverSync) {
					automod.keywordsFilters.splice(i, 0, el);
				}
			}
			this.set(DataStore.AUTOMOD_PARAMS, automod);
		}

		this.dataImported = true;
		this.save();
	}

	/**
	 * Save user's data server side
	 * @returns 
	 */
	public static async save(force:boolean = false, delay:number = 1500):Promise<void> {
		clearTimeout(this.saveTO);
		if(!force) {
			if(!this.syncToServer) return;//User wants to only save data locally
			if(!StoreProxy.auth.twitch.access_token) return;
			if(!this.dataImported) return;//Don't export anything before importing data first
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
		const txt = data[DataStore.TRIGGERS];
		if(!txt) return;
		const triggers:{[key:string]:TriggerData} = JSON.parse(txt);
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
		const value:TwitchatDataTypes.EmergencyParamsData = JSON.parse(data[this.EMERGENCY_PARAMS]);
		delete value.autoBlockFollows;
		delete value.autoUnblockFollows;
		data[this.EMERGENCY_PARAMS] = value;
	}

	/**
	 * Made a mistake storing minutes instead of seconds
	 */
	private static migrateRaffleTriggerDuration(data:any):void {
		const txt = data[DataStore.TRIGGERS];
		if(!txt) return;
		const triggers:{[key:string]:TriggerData} = JSON.parse(txt);
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
		const txt = data[DataStore.TRIGGERS];
		if(!txt) return;
		const triggers:{[key:string]:TriggerData} = JSON.parse(txt);
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
		const converTable:{[key:number]:number} = {1:2, 2:3, 3:6, 4:9, 5:12, 6:17, 7:20}
		size = converTable[size]
		data["p:defaultSize"] = size;
	}

	/**
	 * Renamed placeholder "RECIPIENT" to "RECIPIENTS"
	 */
	private static migrateTriggerSubgiftPlaceholder(data:any):void {
		const txt = data[DataStore.TRIGGERS];
		if(!txt) return;
		const triggers:{[key:string]:TriggerData} = JSON.parse(txt);
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
		const txt = data[DataStore.STREAM_INFO_PRESETS];
		if(!txt) return;
		const presets:TwitchatDataTypes.StreamInfoPreset[] = JSON.parse(txt);
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
		const triggerSrc = data[DataStore.TRIGGERS];
		if(triggerSrc) {
			const triggers:{[key:string]:TriggerData} = JSON.parse(triggerSrc);
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
		const automodSrc = data[DataStore.AUTOMOD_PARAMS];
		if(automodSrc) {
			const confs:TwitchatDataTypes.AutomodParamsData = JSON.parse(automodSrc);
			if(confs.exludedUsers.users) {
				const usersAllowed = confs.exludedUsers.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				confs.exludedUsers.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				confs.exludedUsers.usersRefused = [];
				delete confs.exludedUsers.users;
				// console.log("AUTOMOD");
				// console.log(confs);
				data[DataStore.AUTOMOD_PARAMS] = confs;
			}
		}
		
		//Migrate TTS
		const ttsSrc = data[DataStore.TTS_PARAMS];
		if(ttsSrc) {
			const confs:TwitchatDataTypes.TTSParamsData = JSON.parse(ttsSrc);
			if(confs.ttsPerms.users) {
				const usersAllowed = confs.ttsPerms.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				confs.ttsPerms.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				confs.ttsPerms.usersRefused = [];
			}

			//Transfer "readUsers" data to "usersAllowed"
			if(confs.readUsers && confs.readUsers.length > 0) {
				for (let i = 0; i < confs.readUsers.length; i++) {
					const user = confs.readUsers[i].toLowerCase();
					if(confs.ttsPerms.usersAllowed.findIndex(v=>v.toLowerCase() == user) == -1) {
						confs.ttsPerms.usersAllowed.push(user);
					}
				}
				delete confs.readUsers;
			}
			delete confs.ttsPerms.users;
			// console.log("TTS");
			// console.log(confs);
			data[DataStore.TTS_PARAMS] = confs;
		}
		
		//Migrate OBS
		const obsSrc = data[DataStore.OBS_CONF_PERMISSIONS];
		if(obsSrc) {
			const perms:TwitchatDataTypes.PermissionsData = JSON.parse(obsSrc);
			if(perms.users) {
				const usersAllowed = perms.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				perms.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				perms.usersRefused = [];
				delete perms.users;
				// console.log("OBS");
				// console.log(perms);
				data[DataStore.OBS_CONF_PERMISSIONS] = perms;
			}
		}
		
		//Migrate emergency mode
		const emergencySrc = data[DataStore.EMERGENCY_PARAMS];
		if(emergencySrc) {
			const perms:TwitchatDataTypes.EmergencyParamsData = JSON.parse(emergencySrc);
			if(perms.chatCmdPerms.users) {
				const usersAllowed = perms.chatCmdPerms.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				perms.chatCmdPerms.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				perms.chatCmdPerms.usersRefused = [];
				delete perms.chatCmdPerms.users;
				// console.log("EMERGENCY");
				// console.log(perms);
				data[DataStore.EMERGENCY_PARAMS] = perms;
			}
		}
		
		//Migrate spoiler
		const spoilerSrc = data[DataStore.SPOILER_PARAMS];
		if(spoilerSrc) {
			const perms:TwitchatDataTypes.SpoilerParamsData = JSON.parse(spoilerSrc);
			if(perms.permissions.users) {
				const usersAllowed = perms.permissions.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				perms.permissions.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				perms.permissions.usersRefused = [];
				delete perms.permissions.users;
				// console.log("SPOILER");
				// console.log(perms);
				data[DataStore.SPOILER_PARAMS] = perms;
			}
		}
		
		//Migrate chat alert
		const alertSrc = data[DataStore.ALERT_PARAMS];
		if(alertSrc) {
			const perms:TwitchatDataTypes.AlertParamsData = JSON.parse(alertSrc);
			if(perms.permissions.users) {
				const usersAllowed = perms.permissions.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				perms.permissions.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				perms.permissions.usersRefused = [];
				delete perms.permissions.users;
				// console.log("CHAT ALERT");
				// console.log(perms);
				data[DataStore.ALERT_PARAMS] = perms;
			}
		}
		
		//Migrate voicemod
		const voicemodSrc = data[DataStore.VOICEMOD_PARAMS];
		if(voicemodSrc) {
			const perms:TwitchatDataTypes.VoicemodParamsData = JSON.parse(voicemodSrc);
			if(perms.chatCmdPerms.users) {
				const usersAllowed = perms.chatCmdPerms.users?.toLowerCase().split(/[^a-z0-9_]+/gi);//Split users by non-alphanumeric characters
				perms.chatCmdPerms.usersAllowed = usersAllowed?.filter(v=>v.length > 0) ?? [];
				perms.chatCmdPerms.usersRefused = [];
				delete perms.chatCmdPerms.users;
				// console.log("VOICEMOD");
				// console.log(perms);
				data[DataStore.VOICEMOD_PARAMS] = perms;
			}
		}

	}

	/**
	 * Converts string lists like "value1, value2, value3" to an array of strings
	 */
	private static migrateChatColUserAndCommands(data:any):void {
		const confsStr = data[DataStore.CHAT_COLUMNS_CONF];
		if(confsStr) {
			const confs:TwitchatDataTypes.ChatColumnsConfig[] = JSON.parse(confsStr);
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
		const confsStr = data[DataStore.EMERGENCY_PARAMS];
		if(confsStr) {
			const confs:TwitchatDataTypes.EmergencyParamsData = JSON.parse(confsStr);
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
}