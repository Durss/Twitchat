import channelPointsImg from '@/assets/icons/channelPoints.svg';
import rewardImg from '@/assets/icons/reward_highlight.svg';
import StoreProxy from '@/store/StoreProxy';
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import { reactive } from "vue";
import { TwitchScopes, type TwitchScopesString } from './twitch/TwitchScopes';

/**
 * Created by Durss
 */
export default class Config {

	private static _instance:Config;

	/**
	 * Port for the twitchat's server services
	 */
	public SERVER_PORT = 3018;
	/**
	 * Is Twitchat running on a production server ?
	 */
	public IS_PROD:boolean = document.location.hostname != "localhost" && document.location.hostname != "127.0.0.1" && document.location.hostname != "192.168.1.10";
	/**
	 * Heat extension URL
	 */
	public HEAT_EXTENSION = "https://dashboard.twitch.tv/extensions/cr20njfkgll4okyrhag7xxph270sqk";
	/**
	 * Twitchat API path
	 */
	public TWITCH_API_PATH = "https://api.twitch.tv/helix/";
	/**
	 * Eventsub URL
	 */
	public TWITCH_EVENTSUB_PATH = "wss://eventsub.wss.twitch.tv/ws";
	// public TWITCH_API_PATH = "http://localhost:8000/mock/";
	// public TWITCH_EVENTSUB_PATH = "ws://localhost:8001/eventsub";
	/**
	 * Donation amount to get lifetime Twitchat subscription
	 */
	public LIFETIME_DONOR_VALUE = 89;
	/**
	 * Date for features additions
	 */
	public NEW_FLAGS_DATE_V11 = new Date("01 01 2024 01:00:00").getTime();
	public NEW_FLAGS_DATE_V12 = new Date("02 24 2024 01:00:00").getTime()
	public NEW_FLAGS_DATE_V13 = new Date("08 30 2024 01:00:00").getTime()
	public NEW_FLAGS_DATE_V13_1 = new Date("08 30 2024 01:00:00").getTime()
	public NEW_FLAGS_DATE_V13_4 = new Date("09 01 2024 01:00:00").getTime()
	public NEW_FLAGS_DATE_V13_6 = new Date("09 13 2024 01:00:00").getTime()
	public NEW_FLAGS_DATE_V13_7 = new Date("09 10 2024 01:00:00").getTime()
	public NEW_FLAGS_DATE_V14_2 = new Date("10 15 2024 01:00:00").getTime()
	public NEW_FLAGS_DATE_V15 = new Date("11 30 2024 01:00:00").getTime()
	public NEW_FLAGS_DATE_V16 = new Date("04 01 2025 01:00:00").getTime()
	/**
	 * Get if twitchat is running on an OBS dock
	 */
	public OBS_DOCK_CONTEXT:boolean = window.obsstudio != undefined;
	/**
	 * List of twitch scopes that MUST be granted for twitchat to work
	 */
	public MANDATORY_TWITCH_SCOPES:TwitchScopesString[] = [TwitchScopes.CHAT_READ, TwitchScopes.CHAT_WRITE, TwitchScopes.SEND_ANNOUNCE, TwitchScopes.CHAT_READ_EVENTSUB, TwitchScopes.CHAT_WRITE_EVENTSUB];
	/**
	 * URL of twitchat's discord
	 */
	public DISCORD_URL = "https://discord.gg/fmqD2xUYvP";
	public get DISCORD_BOT_URL():string {
		return "https://discord.com/oauth2/authorize?client_id="+this._serverConfig.discord_client_id+"&scope=applications.commands+bot";
	}
	/**
	 * URL of twitchat's youtube
	 */
	public YOUTUBE_URL = "https://www.youtube.com/@Twitchat/videos";
	/**
	 * If set to true, replaces mouse cursor with a huge fake one
	 */
	public DEMO_MODE = false;
	/**
	 * Maximum entries per prediction
	 */
	public MAX_PREDICTION_OUTCOMES = 10;
	/**
	 * No twitchat ad for users with less than this amount of followers
	 */
	public AD_MIN_FOLLOWERS_COUNT = 200;
	/**
	 * Time to wait between to SO
	 */
	public TWITCH_SHOUTOUT_COOLDOWN = 2 * 60 * 1000;
	/**
	 * Time to wait between to SO for the same user
	 */
	public TWITCH_SHOUTOUT_COOLDOWN_SAME_USER = 60 * 60 * 1000;
	/**
	 * Maximum custom user names we can create without being premium
	 */
	public MAX_CUSTOM_USERNAMES = 10;
	/**
	 * Maximum custom user names we can create when premium
	 */
	public MAX_CUSTOM_USERNAMES_PREMIUM = 10000;
	/**
	 * Maximum custom user badges we can create without being premium
	 */
	public MAX_CUSTOM_BADGES = 3;
	/**
	 * Maximum custom user badges we can create without when premium
	 */
	public MAX_CUSTOM_BADGES_PREMIUM = 100;
	/**
	 * Maximum user we can give custom badges without being premium
	 */
	public MAX_CUSTOM_BADGES_ATTRIBUTION = 30;
	/**
	 * Maximum user we can give custom badges when premium
	 */
	public MAX_CUSTOM_BADGES_ATTRIBUTION_PREMIUM = 10000;
	/**
	 * Maximum heat screens we can create without being premium
	 */
	public MAX_CUSTOM_HEAT_SCREENS = 2;
	/**
	 * Maximum heat screens we can create when premium
	 */
	public MAX_CUSTOM_HEAT_SCREENS_PREMIUM = 100;
	/**
	 * Maximum duration in ms during which an orange circle remains visible while not cicked
	 */
	public NEW_FLAG_DURATION = 30 * 24 * 60 * 60000;
	/**
	 * Maxium number of chat columns that can be created
	 */
	public MAX_CHAT_COLUMNS = 7;
	/**
	 * Maxium number of values that can be created without being premium
	 */
	public MAX_VALUES = 3;
	/**
	 * Maxium number of values that can be created when premium
	 */
	public MAX_VALUES_PREMIUM = 10000;
	/**
	 * Maxium number of triggers that can be created without being premium
	 */
	public MAX_TRIGGERS = 40;
	/**
	 * Maxium number of triggers that can be created when premium
	 */
	public MAX_TRIGGERS_PREMIUM = 1000;//TODO limit triggers count for premium. Unlimitted for now
	/**
	 * Maxium number of triggers that can be created without being premium
	 */
	public MAX_COUNTERS = 20;
	/**
	 * Maxium number of triggers that can be created when premium
	 */
	public MAX_COUNTERS_PREMIUM = 10000;//TODO limit counters count for premium. Unlimitted for now
	/**
	 * Maxium number of distortion overlays
	 */
	public MAX_DISTORTION_OVERLAYS = 1;
	/**
	 * Maxium number of distortion overlays for premium
	 */
	public MAX_DISTORTION_OVERLAYS_PREMIUM = 20;
	/**
	 * Maximum bingo grids
	 */
	public MAX_BINGO_GRIDS = 1;
	/**
	 * Maximum bingo grids for premium users
	 */
	public MAX_BINGO_GRIDS_PREMIUM = 50;
	/**
	 * Maximum labels
	 */
	public MAX_LABELS = 2;
	/**
	 * Maximum labels for premium users
	 */
	public MAX_LABELS_PREMIUM = 50;
	/**
	 * Maximum bingo grids
	 */
	public MAX_DONATION_GOALS = 2;
	/**
	 * Maximum bingo grids for premium users
	 */
	public MAX_DONATION_GOALS_PREMIUM = 50;
	/**
	 * Maximum number of timers
	 */
	public MAX_TIMERS = 2;
	/**
	 * Maximum number of timers for premium users
	 */
	public MAX_TIMERS_PREMIUM = 100;
	/**
	 * Maximum chat poll entries
	 */
	public MAX_CHAT_POLL_ENTRIES = 5;
	/**
	 * Maximum chat poll entries for premium users
	 */
	public MAX_CHAT_POLL_ENTRIES_PREMIUM = 20;

	private _serverConfig!:ServerConfig;

	constructor() {

	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():Config {
		if(!Config._instance) {
			Config._instance = reactive(new Config()) as Config;
		}
		return Config._instance;
	}

	/**
	 * Path to twitchat's API
	 */
	public get API_PATH():string {
		if(!this.IS_PROD) {
			return document.location.protocol+"//"+document.location.hostname+":"+this.SERVER_PORT+"/api";
		}else{
			return document.location.protocol+"//"+document.location.hostname+"/api";
		}
	}

	/**
	 * Get if current twitchat instance is a beta instance
	 */
	public get BETA_MODE():boolean {
		// if(!this.IS_PROD) {
		// 	return true;//Simulate beta env on local
		// }
		return document.location.host.indexOf("beta") > -1 || document.location.host.indexOf("localhost") > -1;
	}

	/**
	 * Twitch client ID of Twitchat app
	 */
	public get TWITCH_CLIENT_ID():string { return this._serverConfig.twitch_client_id; }
	/**
	 * List of twitch scopes Twitchat can request
	 */
	public get TWITCH_APP_SCOPES():string[] { return this._serverConfig.twitch_scopes; }
	/**
	 * Not used since Spotify refused Twitchat extended quotas...
	 */
	public get SPOTIFY_CLIENT_ID():string { return this._serverConfig.spotify_client_id; }
	/**
	 * Scopes required for spotify auth
	 */
	public get SPOTIFY_SCOPES():string { return this._serverConfig.spotify_scopes; }
	/**
	 * Patreon app client ID
	 */
	public get PATREON_CLIENT_ID():string { return this._serverConfig.patreon_client_id; }
	/**
	 * Patreon app requested scopes
	*/
	public get PATREON_SCOPES():string { return this._serverConfig.patreon_scopes; }
	/**
	 * Paypal app client ID
	 */
	public get PAYPAL_CLIENT_ID():string { return this._serverConfig.paypal_client_id; }
	/**
	 * Contact mail
	 */
	public get CONTACT_MAIL():string { return this._serverConfig.contact_mail; }
	/**
	 * Youtube's client ID
	*/
	public get YOUTUBE_CLIENT_ID():string { return this._serverConfig.youtube_client_id; }
	/**
	 * Youtube's scopes
	 */
	public get YOUTUBE_SCOPES():string[] { return this._serverConfig.youtube_scopes; }
	/**
	 * Streamlabs client ID
	 */
	public get STREAMLABS_CLIENT_ID():string { return this._serverConfig.streamlabs_client_id; }
	/**
	 * Streamelements client ID
	 */
	public get STREAMELEMENTS_CLIENT_ID():string { return this._serverConfig.streamelements_client_id; }
	/**
	 * Tipeee client ID
	 */
	public get TIPEEE_CLIENT_ID():string { return this._serverConfig.tipeee_client_id; }
	/**
	 * Tiltify client ID
	 */
	public get TILTIFY_CLIENT_ID():string { return this._serverConfig.tiltify_client_id; }
	/**
	 * Tiltify scopes
	 */
	public get TILTIFY_SCOPES():string { return this._serverConfig.tiltify_scopes; }

	/**
	 * Fake Twitch "highlight my message" reward
	 */
	public get highlightMyMessageReward():TwitchDataTypes.Reward {
		const img = rewardImg;
		return {
			broadcaster_name: "Durss",
			broadcaster_login: "durss",
			broadcaster_id: "29961813",
			id: "highlighted-message",
			image:{
				url_1x:img,
				url_2x:img,
				url_4x:img,
			},
			background_color: "#9147ff",
			is_enabled: true,
			cost: -1,
			title: "Highlight my message",
			prompt: "",
			is_user_input_required: true,
			max_per_stream_setting: {
				is_enabled: false,
				max_per_stream: 0,
			},
			max_per_user_per_stream_setting: {
				is_enabled: false,
				max_per_user_per_stream: 0,
			},
			global_cooldown_setting: {
				is_enabled: false,
				global_cooldown_seconds: 0,
			},
			is_paused: false,
			is_in_stock: true,
			default_image: {
				url_1x:channelPointsImg,
				url_2x:channelPointsImg,
				url_4x:channelPointsImg,
			},
			should_redemptions_skip_request_queue: false,
		}
	}

	/**
	 * Fake Twitch "highlight my message" reward
	 */
	public get allRewards():TwitchDataTypes.Reward {
		const img = channelPointsImg;
		return {
			broadcaster_name: "Durss",
			broadcaster_login: "durss",
			broadcaster_id: "29961813",
			id: "*",
			image:{
				url_1x:img,
				url_2x:img,
				url_4x:img,
			},
			background_color: "#9147ff",
			is_enabled: true,
			cost: -1,
			title: StoreProxy.i18n.t("triggers.rewards.all_rewards"),
			prompt: "",
			is_user_input_required: false,
			max_per_stream_setting: {
				is_enabled: false,
				max_per_stream: 0,
			},
			max_per_user_per_stream_setting: {
				is_enabled: false,
				max_per_user_per_stream: 0,
			},
			global_cooldown_setting: {
				is_enabled: false,
				global_cooldown_seconds: 0,
			},
			is_paused: false,
			is_in_stock: true,
			default_image: {
				url_1x:img,
				url_2x:img,
				url_4x:img,
			},
			should_redemptions_skip_request_queue: false,
		}
	}



	/******************
	* PUBLIC METHODS *
	******************/
	public populateServerConfigs(data:ServerConfig):void {
		this._serverConfig = data;
	}

	public getParamByKey(key:string):unknown {
		return this[key as keyof typeof Config.instance];
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
}

export interface ServerConfig {
	twitch_client_id: string;
	twitch_scopes: string[];
	spotify_client_id: string;
	spotify_scopes: string;
	patreon_client_id: string;
	patreon_scopes: string;
	paypal_client_id: string;
	contact_mail: string;
	youtube_client_id: string;
	youtube_scopes: string[];
	discord_client_id: string;
	streamlabs_client_id:string;
	streamlabs_redirect_uri:string;
	streamelements_client_id:string;
	tipeee_client_id:string;
	tipeee_redirect_uri:string;
	tiltify_client_id:string;
	tiltify_scopes:string;
}
