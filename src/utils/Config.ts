import { reactive } from "vue";

/**
 * Created by Durss
 * 
 * !!!!! IMPORTANT !!!!!
 * Do NOT use any reference to the store in this file.
 * This would generate a circular dependency as the store
 * uses this Config file.
 * 
 */
export default class Config {

	private static _instance:Config;

	public SERVER_PORT = 3018;
	public IS_PROD:boolean = document.location.hostname != "localhost" && document.location.hostname != "192.168.1.10";
	public TWITCH_APP_SCOPES:string[] = [];
	public TWITCH_API_PATH = "https://api.twitch.tv/helix/";
	public DISCORD_URL = "https://discord.gg/fmqD2xUYvP";
	public OBS_WEBSOCKET_INSTALLER = "https://github.com/obsproject/obs-websocket/releases/tag/5.0.1";
	public MAX_PREDICTION_OUTCOMES = 10;
	public SPOTIFY_CLIENT_ID = "";
	public SPOTIFY_SCOPES = "";
	public DEEZER_CLIENT_ID = "";
	public DEEZER_SCOPES = "";
	public SPOTIFY_CONNECTED = false;
	public DEEZER_CONNECTED = false;
	
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

	public get API_PATH():string {
		if(!this.IS_PROD) {
			return document.location.protocol+"//"+document.location.hostname+":"+this.SERVER_PORT+"/api";
		}else{
			return "/api";
		}
	}

	public get MUSIC_SERVICE_CONFIGURED():boolean { return this.SPOTIFY_CONFIGURED || this.DEEZER_CONFIGURED; }
	public get SPOTIFY_CONFIGURED():boolean { return this.SPOTIFY_CLIENT_ID?.length > 20; }
	public get DEEZER_CONFIGURED():boolean { return this.DEEZER_CLIENT_ID?.length > 5; }

	/**
	 * Add twitch logins to connect to their chats and get some
	 * PubSub events from
	 */
	public get debugChans():string[] {
		// return ["dazjdm"];
		return [];
	}

	public get MUSIC_SERVICE_CONFIGURED_AND_CONNECTED():boolean {
		if(!this.MUSIC_SERVICE_CONFIGURED) return false;
		return this.SPOTIFY_CONNECTED || this.DEEZER_CONNECTED;
	}

	public OBS_DOCK_CONTEXT:boolean = window.obsstudio != undefined;
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}