import { TriggerTypes, type TriggerActionTypes, type TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import type { JsonValue } from "type-fest";
import StoreProxy from "./StoreProxy";

/**
 * Fallback to sessionStorage if localStorage isn't available
 * Created : 18/10/2020 
 */
export default class DataStore {
	
	public static syncToServer:boolean = false;

	public static DATA_VERSION:string = "v";
	public static UPDATE_INDEX:string = "updateIndex";
	public static ACTIVITY_FEED_FILTERS:string = "activityFeedFilters";
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
	public static SYNC_DATA_TO_SERVER:string = "syncToserver";//GG for the failed camel case -_-
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
	/**
	 * //TODO remove
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
		this.syncToServer = this.get(this.SYNC_DATA_TO_SERVER) == "true";
		let v = this.get(this.DATA_VERSION);
		
		if(v=="1" || v=="2") {
			this.cleanupOldData();
			v = "3";
		}
		if(v=="3") {
			this.migrateBotMessages();
			v = "4";
		}
		if(v=="4") {
			this.migrateSOMessage();
			v = "5";
		}
		if(v=="5") {
			this.remove("p:showPollPredResults");
			v = "6";
		}
		if(v=="6") {
			this.migrateTriggers();
			v = "7";
		}
		if(v=="7") {
			//Because of an old stupid version check, users could skip updates
			//Trying to fix this here...
			this.remove("p:showPollPredResults");
			v = "8";
		}
		if(v=="8") {
			this.fixTriggersCase();
			v = "9";
		}
		if(v=="9") {
			this.migrateTriggers2();
			v = "10";
		}
		if(v=="10") {
			this.migrateEmergency();
			v = "11";
		}
		if(v=="11") {
			//Because of an old stupid version check, users could skip updates
			//Trying to fix this here...(again)
			this.remove("obsConf_sources");
			v = "12";
		}
		if(v=="12") {
			this.fixTTSPlaceholders();
			v = "13";
		}
		if(v=="13") {
			this.cleanupOldData();
			v = "14";
		}
		if(v=="14") {
			this.migrateChatCommandTriggers();
			v = "15";
		}
		if(v=="15") {
			this.migrateEmergencyAutoblock();
			v = "16";
		}
		if(v=="16") {
			this.remove("p:historySize");
			v = "17";
		}

		this.set(this.DATA_VERSION, v);

		const items = this.getAll();
		for (const key in items) {
			try{
				items[key] = JSON.parse(items[key] as string);
			}catch(error) {
				//parsing failed, that's because it's a simple string, just keep it
			}
		}
		this.rawStore = items;
		this.save();
	}

	/**
	 * Load user's data from the server
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
					this.loadFromJSON(json);
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
	public static loadFromJSON(json:any, fullOverwrite:boolean = false):void {
		const backupAutomod:TwitchatDataTypes.AutomodParamsData = JSON.parse(this.get(DataStore.AUTOMOD_PARAMS));
		for (const key in json.data) {
			const value = json.data[key];
			const str = typeof value == "string"? value : JSON.stringify(value);
			this.store.setItem(this.dataPrefix + key, str);
		}
		
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

		this.rawStore = json.data;
		this.dataImported = true;
		this.init();//Migrate remote data if necessary
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
				
				
				delete data["p:shoutoutLabel"];//Old that that some people still have
				
				//Things unnecessary to save server side
				delete data[this.GREET_HISTORY];
				delete data[this.SYNC_DATA_TO_SERVER];
				delete data[this.INTERFACE_SCALE];
				delete data.deezerEnabled;
				delete data.redirect;
				
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
	public static set(key:string, value:JsonValue|unknown, save = true, saveDelay:number = 1500):void {
		if(key == this.SYNC_DATA_TO_SERVER) {
			this.syncToServer = value as boolean;
			if(!this.dataImported) {
				this.loadRemoteData();
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
	public static clear():void {
		if(!this.store) this.init();
		//Remove only the data with the proper prefix
		for (let i = 0; i < this.store.length; i++) {
			const key = this.store.key(i);
			if(!key || key.indexOf(this.dataPrefix) == -1) continue;
			this.store.removeItem(key);
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
	private static cleanupOldData():void {
		//rename "raffle_postOnChat" to "raffle_messageEnabled" ofr more consistency
		if(this.get("raffle_postOnChat") != null) {
			this.set("raffle_messageEnabled", this.get("raffle_postOnChat"));
			this.remove("raffle_postOnChat");
		}
		this.remove("p:emotesOnly");
		this.remove("p:modsSize");
		this.remove("p:vipsSize");
		this.remove("p:followersOnly");
		this.remove("p:subsSize");
		this.remove("p:subsOnly");
		this.remove("p:slowMode");
		this.remove("p:ignoreSelf");
		this.remove("p:hideEmotes");
		this.remove("tmiToken");
		this.remove("authToken");
		this.remove("p:hideBadges");
		this.remove("p:hideBot");
	}

	/**
	 * Move raffle and bingo messages inside a more generic "botMessage"
	 * prop instead of having one prop for each field.
	 */
	private static migrateBotMessages():void {
		const raffle_message =this.get("raffle_message");
		const raffle_messageEnabled =this.get("raffle_messageEnabled");
		const bingo_message =this.get("bingo_message");
		const bingo_messageEnabled =this.get("bingo_messageEnabled");

		if(raffle_message) {
			const botMessages = {
				raffle: {
					enabled:raffle_message,
					message:raffle_messageEnabled,
				},
				bingo: {
					enabled:bingo_message,
					message:bingo_messageEnabled,
				}
			}
			//Save new data format
			this.set("botMessages", botMessages);
		}
		
		//Cleanup old data
		this.remove("raffle_message");
		this.remove("bingo_messageEnabled");
		this.remove("raffle_messageEnabled");
		this.remove("bingo_message");
	}

	/**
	 * Shoutout message has been moved inside "botMessages" property.
	 */
	private static migrateSOMessage():void {
		let label = this.get("p:shoutoutLabel");
		if(!label) return;
		label = label.replace("$USER", "{USER}");
		label = label.replace("$STREAM", "{TITLE}");
		label = label.replace("$TITLE", "{TITLE}");
		label = label.replace("$URL", "{URL}");
		label = label.replace("$CATEGORY", "{CATEGORY}");
		// store.dispatch("updateBotMessage", {key:"shoutout", enabled:true, message:label})
		this.remove("p:shoutoutLabel");
	}

	/**
	 * Flags all obs sources as "obs" types and move them to a new key while
	 * cleaning up uncessary keys.
	 */
	private static migrateTriggers():void {
		const sources = this.get("obsConf_sources");
		if(sources) {
			const actions:(TriggerActionTypes[]|TriggerData)[] = JSON.parse(sources);
			for (const key in actions) {
				const a = actions[key];
				let list = a;
				//Is chat command trigger ?
				if(!Array.isArray(a)) {
					list = (a as TriggerData).actions;
				}
				const typedList = list as TriggerActionTypes[];
				for (let i = 0; i < typedList.length; i++) {
					typedList[i].type = "obs";

					//Cleanup unnecessary data
					for (const prop in typedList[i]) {
						//@ts-ignore
						const v = typedList[i][prop];
						if(v === "") {
							//@ts-ignore
							delete typedList[i][prop];
						}
					}
				}
			}
			this.set("triggers", actions);
			this.remove("obsConf_sources");
		}
	}

	/**
	 * Lowercasing all chat command keys so the commands work
	 * properly no matter how the user writes it.
	 */
	private static fixTriggersCase():void {
		const txt = this.get("triggers");
		if(!txt) return;
		const triggers = JSON.parse(txt);
		for (const key in triggers) {
			if(key.indexOf(TriggerTypes.CHAT_COMMAND) === 0) {
				//Check if it's not full lowercased
				if(key != key.toLowerCase()) {
					triggers[key.toLowerCase()] = triggers[key];
					delete triggers[key];
				}
			}
		}
		
		this.set("triggers", triggers);
	}

	/**
	 * Encapsulate simple triggers (not chat commands) inside a new object
	 */
	private static migrateTriggers2():void {
		const txt = this.get("triggers");
		if(!txt) return;
		const triggers = JSON.parse(txt);
		for (const key in triggers) {
			if(key.indexOf(TriggerTypes.CHAT_COMMAND) === 0) {
				triggers[key].enabled = true;
			}else{
				triggers[key] = {
					enabled:true,
					actions:triggers[key]
				}
			}
		}
		
		this.set("triggers", triggers);
	}

	/**
	 * Migrate emergency button from global params to dedicated param
	 */
	private static migrateEmergency():void {
		const value = this.get("p:emergencyButton");
		StoreProxy.emergency.params.enabled = value === "true";
		this.remove("obsIp");
		this.remove("p:emergencyButton");
		this.set(this.EMERGENCY_PARAMS, StoreProxy.emergency.params);
	}

	/**
	 * Fixing wrong TTS placeholders
	 */
	private static fixTTSPlaceholders():void {
		const params = JSON.parse(this.get(this.TTS_PARAMS)) as TwitchatDataTypes.TTSParamsData;
		if(params) {
			params.readBingosPattern = params.readBingosPattern.replace(/\{USER\}/gi, "{WINNER}");
			params.readRafflePattern = params.readRafflePattern.replace(/\{USER\}/gi, "{WINNER}");
			this.set(this.TTS_PARAMS, params);
		}
	}

	/**
	 * Changes the "chatCommand" trigger prop to more generic "name"
	 */
	private static migrateChatCommandTriggers():void {
		const txt = this.get("triggers");
		if(!txt) return;
		const triggers:{[key:string]:TriggerData} = JSON.parse(txt);
		for (const key in triggers) {
			if(key.indexOf(TriggerTypes.CHAT_COMMAND) === 0
			&& triggers[key].chatCommand) {
				//Check if it's not full lowercased
				triggers[key].name = triggers[key].chatCommand;
				delete triggers[key].chatCommand
			}
		}

		this.set("triggers", triggers);
	}

	/**
	 * Changes the "chatCommand" trigger prop to more generic "name"
	 */
	private static migrateEmergencyAutoblock():void {
		const value:TwitchatDataTypes.EmergencyParamsData = JSON.parse(this.get(this.EMERGENCY_PARAMS));
		delete value.autoBlockFollows;
		delete value.autoUnblockFollows;
		this.set(this.EMERGENCY_PARAMS, value);
	}
}