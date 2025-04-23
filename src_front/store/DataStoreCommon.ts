import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { JsonValue } from "type-fest";

/**
 * Fallback to sessionStorage if localStorage isn't available
 * Created : 18/10/2020
 */
export default class DataStoreCommon {

	public static syncToServer:boolean = true;

	public static DATA_VERSION:string = "v";
	public static SAVE_VERSION:string = "saveVersion";
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
	public static VOICE_BOT_ACTIONS:string = "voiceActions";
	public static VOICE_BOT_LANG:string = "voiceLang";
	public static AUTOMOD_PARAMS:string = "automodParams";
	public static DONOR_LEVEL:string = "donorLevel";
	public static TWITCHAT_AD_WARNED:string = "adWarned";
	public static TWITCHAT_AD_NEXT_DATE:string = "adNextTS";
	public static TWITCHAT_SPONSOR_PUBLIC_PROMPT:string = "sponsorPublicPrompt";
	public static TWITCHAT_RIGHT_CLICK_HINT_PROMPT:string = "rightClickHintPrompt";
	public static CHAT_COLUMNS_CONF:string = "chatColumnsConf";
	public static COLLAPSE_PARAM_AD_INFO:string = "collapseParamAdInfo";
	public static COUNTERS:string = "counters";
	public static VALUES:string = "values";
	public static LANGUAGE:string = "lang";
	public static CHAT_COL_CTA:string = "chatColCTA";
	public static WEBSOCKET_TRIGGER:string = "websocketTrigger";
	public static REDIRECT:string = "redirect";
	public static TRIGGER_SORT_TYPE:string = "triggerSortType";
	public static TOOLTIP_AUTO_OPEN:string = "tooltipAutoOpen";
	public static THEME:string = "theme";
	public static POLL_DEFAULT_DURATION:string = "pollDuration";
	public static PREDICTION_DEFAULT_DURATION:string = "predictionDuration";
	public static ULULE_PROJECT:string = "ululeProject";
	public static ULULE_GOALS:string = "ululeGoals";
	public static ULULE_TITLE:string = "ululeTitle";
	public static ULULE_CURRENCY:string = "ululeCurrency";
	public static HEAT_ENABLED:string = "heatEnabled";
	public static HEAT_SCREENS:string = "heatScreens";
	public static PATREON_AUTH_TOKEN:string = "patreonAuthToken";
	public static CUSTOM_USERNAMES:string = "customUsernames";
	public static CUSTOM_BADGE_LIST:string = "customBadgeList";
	public static CUSTOM_USER_BADGES:string = "customUserBadges";
	public static ANNOUNCEMENTS_READ:string = "announcementsRead";
	public static NEW_FLAGS:string = "newFlags";
	public static GOXLR_CONFIG:string = "goxlrConfig";
	public static RAID_HISTORY:string = "raidHistory";
	public static SENT_MESSAGE_HISTORY:string = "sentMessageHistory";
	public static ENDING_CREDITS_PARAMS:string = "endingCreditsParams";
	public static AD_BREAK_SCOPES_REQUEST:string = "adBreakScopesRequested";
	public static AD_BREAK_OVERLAY_PARAMS:string = "adBreakOverlayParams";
	public static OVERLAY_DISTORTIONS:string = "overlayDistortions";
	public static YOUTUBE_AUTH_TOKEN:string = "youtubeAuthToken";
	public static TRIGGERS_TREE:string = "triggersTree";
	public static PARAMS_SECTIONS:string = "paramsSections";
	public static PARAMS_SECTIONS_CTA:string = "paramsSectionsCTA";
	public static BITS_WALL_PARAMS:string = "bitsWallParams";
	public static AB_SENTRY:string = "ab_sentry";
	public static DISCORD_PARAMS:string = "discordParams";
	public static STREAMLABS:string = "streamlabs";
	public static STREAMLABS_CHARITY_CACHE:string = "streamlabsCharityCache";
	public static STREAMELEMENTS:string = "streamelements";
	public static PREDICTION_OVERLAY_PARAMS:string = "predictionOverlayParams";
	public static POLL_OVERLAY_PARAMS:string = "pollOverlayParams";
	public static CHAT_POLL_PRESETS:string = "chatPollPresets";
	public static CHAT_POLL_OVERLAY_PARAMS:string = "chatPollOverlayParams";
	public static TIPEEE:string = "tipeee";
	public static PINNED_CHAT_MENU_ITEM:string = "pinnedChatMenuItem";
	public static LUMIA:string = "lumia";
	public static BINGO_GRIDS:string = "bingoGrids";
	public static OVERLAY_LABELS:string = "overlayLabels";
	public static OVERLAY_LABELS_CACHE:string = "overlayLabelsCache";
	public static USER_ID:string = "userId";
	public static USERCARD_PINNED_CHANNEL:string = "usercardPinnedChannel";
	public static AUTOCONNECT_CHANS:string = "autoconnectChans";
	public static DONATION_GOALS:string = "donationGoals";
	public static TILTIFY:string = "tiltify";
	public static TILTIFY_TOKEN:string = "tiltifyToken";
	public static RAFFLES_RUNNING:string = "rafflesRunning";
	public static TIKTOK_CONFIGS:string = "tiktokConfigs";
	public static STREAMERBOT_CONFIGS:string = "streamerbotConfigs";
	public static STREAMERBOT_WS_PASSWORD:string = "streamerbotWsPassword";
	public static SAMMI_CONFIGS:string = "sammiConfigs";
	public static SAMMI_API_PASSWORD:string = "sammiApiPassword";
	public static MIXITUP_CONFIGS:string = "mixitupConfigs";
	public static GROQ_API_KEY:string = "groqApiKey";
	public static GROQ_CONFIGS:string = "groqConfigs";
	public static ELEVENLABS_API_KEY:string = "elevenlabsApiKey";
	public static PLAYABILITY_CONFIGS:string = "playabilityConfigs";
	public static KOFI_CONFIGS:string = "kofiConfigs";
	public static TWITCH_BOT:string = "twitchBot";
	public static TIMERS_CONFIGS:string = "timersConfigs";
	public static ANIMATED_TEXT_CONFIGS:string = "animatedTextConfigs";
	public static CUSTOM_TRAIN_CONFIGS:string = "customTrainConfigs";
	public static CENSOR_VIEWER_COUNT:string = "censorViewerCount";
	public static STREAM_SOCKET_SECRET:string = "streamSocketSecret";

	protected static store:Storage;
	protected static dataPrefix:string = "twitchat_";
	protected static dataImported:boolean = false;
	protected static rawStore:{[key:string]:(JsonValue|unknown)} = {};

	/**
	 * These values won't be saved to the server
	 */
	protected static UNSYNCED_DATA:string[] = [
		"syncToserver",
		this.USER_ID,
		this.AB_SENTRY,
		this.OBS_PASS,
		this.TWITCH_AUTH_TOKEN,
		this.SPOTIFY_AUTH_TOKEN,
		this.SPOTIFY_APP_PARAMS,
		this.GREET_HISTORY,
		this.SYNC_DATA_TO_SERVER,
		this.CHAT_COL_CTA,
		this.PARAMS_SECTIONS_CTA,
		this.REDIRECT,
		this.TOOLTIP_AUTO_OPEN,
		this.POLL_DEFAULT_DURATION,
		this.PREDICTION_DEFAULT_DURATION,
		this.PATREON_AUTH_TOKEN,
		this.ANNOUNCEMENTS_READ,
		this.NEW_FLAGS,
		this.SENT_MESSAGE_HISTORY,
		this.YOUTUBE_AUTH_TOKEN,
		this.STREAMLABS,
		this.STREAMELEMENTS,
		this.TIPEEE,
		this.TILTIFY_TOKEN,
		this.STREAMLABS_CHARITY_CACHE,
		this.STREAMERBOT_WS_PASSWORD,
		this.SAMMI_API_PASSWORD,
		this.GROQ_API_KEY,
		this.ELEVENLABS_API_KEY,
		this.TWITCH_BOT,
		this.EMERGENCY_FOLLOWERS,
		this.STREAM_SOCKET_SECRET,
	];


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
		console.error("You must override migrateDate() method");
	}

	/**
	 * Save user's data server side
	 * @returns
	 */
	public static async save(force:boolean = false, delay:number = 1500):Promise<void> {
		//override if necessary
	}

	/**
	 * Load user's data from the server
	 * @imp
	 * @returns if user has data or not
	 */
	public static async loadRemoteData(importToLS:boolean = true):Promise<boolean> {
		return true;
	}

	/**
	 * Replace local data by the given JSON
	 */
	public static async loadFromJSON(json:any):Promise<void> {
		const automodRulesBackup:TwitchatDataTypes.AutomodParamsKeywordFilterData[] = [];
		let automod:TwitchatDataTypes.AutomodParamsData = JSON.parse(this.get(DataStoreCommon.AUTOMOD_PARAMS));

		json = await this.migrateData(json);//Migrate remote data if necessary

		//Make sure we don't loose unsynced automod rules
		//(should think of a generic way of doing this..)
		if(automod && automod.keywordsFilters && automod.keywordsFilters.length > 0) {
			for (let i = 0; i < automod.keywordsFilters.length; i++) {
				const el = automod.keywordsFilters[i];
				if(!el.serverSync) {
					automodRulesBackup.push( automod.keywordsFilters.splice(i, 1)[0] );
					i--;
					if(i < 0) break;
				}
			}

			//Update storage without non synced rules
			this.set(DataStoreCommon.AUTOMOD_PARAMS, automod);

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
			if(key == undefined) console.log("UNDEFINED KEY", key);
			else this.rawStore[key] = value;
		}

		//Bring back auto mode rules backed up before
		if(automodRulesBackup.length > 0) {
			automod = JSON.parse(this.get(DataStoreCommon.AUTOMOD_PARAMS));
			for (let i = 0; i < automodRulesBackup.length; i++) {
				automod.keywordsFilters.push(automodRulesBackup[i]);
			}
			this.set(DataStoreCommon.AUTOMOD_PARAMS, automod);
		}

		this.dataImported = true;
		this.save();
	}

	/**
	 * Get a value
	 * @param key
	 * @returns
	 */
	public static get<T = string|null>(key:string):T {
		if(!this.store) this.init();
		return this.store.getItem(this.dataPrefix + key) as T;
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

}
