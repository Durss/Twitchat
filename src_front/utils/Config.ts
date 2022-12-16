import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { reactive } from "vue";
import rewardImg from '@/assets/icons/reward_highlight.svg';
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import StoreProxy from "@/store/StoreProxy";

/**
 * Created by Durss
 */
export default class Config {

	private static _instance:Config;

	public SERVER_PORT = 3018;
	public OBS_DOCK_CONTEXT:boolean = window.obsstudio != undefined;
	public IS_PROD:boolean = document.location.hostname != "localhost" && document.location.hostname != "192.168.1.10";
	public TWITCH_API_PATH = "https://api.twitch.tv/helix/";
	public DISCORD_URL = "https://discord.gg/fmqD2xUYvP";
	public OBS_WEBSOCKET_INSTALLER = "https://github.com/obsproject/obs-websocket/releases/tag/5.0.1";
	public MAX_PREDICTION_OUTCOMES = 10;
	public SPOTIFY_CONNECTED = false;
	public DEEZER_CONNECTED = false;
	
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
			{platform:"twitch", login:"durss"},
			{platform:"twitch", login:"mewstelle"},
			{platform:"twitch", login:"jeansimonlapointe"},
			// {platform:"twitch", login:"durssbot"},
			// {platform:"twitch", login:"littlebigwhale"},
			// {platform:"twitch", login:"andythefrenchy"},
		];
	}

	public get API_PATH():string {
		if(!this.IS_PROD) {
			return document.location.protocol+"//"+document.location.hostname+":"+this.SERVER_PORT+"/api";
		}else{
			return "/api";
		}
	}

	public get BETA_MODE():boolean {
		if(!this.IS_PROD) {
			return true;//Simulate beta env on local
		}
		return document.location.host.indexOf("beta") > -1;
	}

	public get TWITCH_CLIENT_ID():string { return this._serverConfig.twitch_client_id; }
	public get TWITCH_APP_SCOPES():string[] { return this._serverConfig.twitch_scopes; }
	public get SPOTIFY_CLIENT_ID():string { return this._serverConfig.spotify_client_id; }
	public get SPOTIFY_SCOPES():string { return this._serverConfig.spotify_scopes; }
	public get DEEZER_CLIENT_ID():string { return this.IS_PROD? this._serverConfig.deezer_client_id : this._serverConfig.deezer_dev_client_id; }
	public get DEEZER_SCOPES():string { return this._serverConfig.deezer_scopes; }

	public get MUSIC_SERVICE_CONFIGURED():boolean { return this.SPOTIFY_CONFIGURED || this.DEEZER_CONFIGURED; }
	public get SPOTIFY_CONFIGURED():boolean { return this.SPOTIFY_CLIENT_ID?.length > 20; }
	public get DEEZER_CONFIGURED():boolean { return this.DEEZER_CLIENT_ID?.length > 5; }

	public get MUSIC_SERVICE_CONFIGURED_AND_CONNECTED():boolean {
		if(!this.MUSIC_SERVICE_CONFIGURED) return false;
		return this.SPOTIFY_CONNECTED || this.DEEZER_CONNECTED;
	}

	public get highlightMyMessageReward():TwitchDataTypes.Reward {
		const img = rewardImg;
		return {
			broadcaster_name: StoreProxy.auth.twitch.user.displayName,
			broadcaster_login: StoreProxy.auth.twitch.user.login,
			broadcaster_id: StoreProxy.auth.twitch.user.id,
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
	deezer_scopes: string;
	deezer_client_id: string;
	deezer_dev_client_id: string;

}