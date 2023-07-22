import rewardImg from '@/assets/icons/reward_highlight.svg';
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { reactive } from "vue";

/**
 * Created by Durss
 */
export default class Config {

	private static _instance:Config;

	public SERVER_PORT = 3018;
	public OBS_DOCK_CONTEXT:boolean = window.obsstudio != undefined;
	public IS_PROD:boolean = document.location.hostname != "localhost" && document.location.hostname != "192.168.1.10" && document.location.hostname.indexOf("ngrok") == -1;
	public TWITCH_API_PATH = "https://api.twitch.tv/helix/";
	public TWITCH_EVENTSUB_PATH = "wss://eventsub.wss.twitch.tv/ws";
	// public TWITCH_API_PATH = "http://localhost:8000/mock/";
	// public TWITCH_EVENTSUB_PATH = "ws://localhost:8001/eventsub";
	public DISCORD_URL = "https://discord.gg/fmqD2xUYvP";
	public YOUTUBE_URL = "https://www.youtube.com/@Twitchat/videos";
	public DEMO_MODE = false;//replaces cursor by huge fake one
	public MAX_PREDICTION_OUTCOMES = 10;
	public AD_MIN_FOLLOWERS_COUNT = 50;
	public TWITCH_SHOUTOUT_COOLDOWN = 2 * 60 * 1000;
	public TWITCH_SHOUTOUT_COOLDOWN_SAME_USER = 60 * 60 * 1000;
	// public TWITCH_SHOUTOUT_COOLDOWN = 10000;
	// public TWITCH_SHOUTOUT_COOLDOWN_SAME_USER = 60000;
	public FOLLOWERS_API_SHUTDOWN_DATE = new Date("08-02-2023 00:00:00");
	
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
	 * Add twitch logins to connect to their chats and get some
	 * PubSub events from
	 */
	public get debugChans():{platform:TwitchatDataTypes.ChatPlatform, login:string}[] {
		if(this.IS_PROD) return [];
		return [
			// {platform:"twitch", login:"lixiviatio"},
		];
	}

	public get API_PATH():string {
		if(!this.IS_PROD) {
			return document.location.protocol+"//"+document.location.hostname+":"+this.SERVER_PORT+"/api";
		}else{
			return document.location.protocol+"//"+document.location.hostname+"/api";
		}
	}

	public get BETA_MODE():boolean {
		// if(!this.IS_PROD) {
		// 	return true;//Simulate beta env on local
		// }
		return document.location.host.indexOf("beta") > -1 || document.location.host.indexOf("localhost") > -1;
	}

	public get TWITCH_CLIENT_ID():string { return this._serverConfig.twitch_client_id; }
	public get TWITCH_APP_SCOPES():string[] { return this._serverConfig.twitch_scopes; }
	public get SPOTIFY_CLIENT_ID():string { return this._serverConfig.spotify_client_id; }
	public get SPOTIFY_SCOPES():string { return this._serverConfig.spotify_scopes; }
	public get PATREON_CLIENT_ID():string { return this._serverConfig.patreon_client_id; }
	public get PATREON_SCOPES():string { return this._serverConfig.patreon_scopes; }

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
}