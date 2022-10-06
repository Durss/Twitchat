import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import { reactive } from "vue";
import rewardImg from '@/assets/icons/reward_highlight.svg';

/**
* Created : 17/06/2022 
* This class only exists to solve a circular imports issue
*/
export default class UserSession {

	private static _instance:UserSession;

	public authResult:TwitchDataTypes.AuthTokenResult|null = null;
	//keys are lowercased version of the emotes codes
	public emotesCacheHashmap:{[key:string]:TwitchDataTypes.Emote} = {};
	public twitchUser:TwitchDataTypes.UserInfo| null = null;
	public access_token:string|null = null;
	public isDonor:boolean = false;
	public donorLevel:number = 0;
	public twitchAuthToken = {
		client_id: "",
		login: "",
		scopes: [""],
		user_id: "",
		expires_in: 0,
	} as TwitchDataTypes.Token;

	private _emotesCache:TwitchDataTypes.Emote[]|null = null;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():UserSession {
		if(!UserSession._instance) {
			UserSession._instance = reactive(new UserSession()) as UserSession;
		}
		return UserSession._instance;
	}

	public get hasChannelPoints():boolean {
		return this.twitchUser?.broadcaster_type != "";
	}
	public get emotesCache():TwitchDataTypes.Emote[]|null { return this._emotesCache; }
	public set emotesCache(value:TwitchDataTypes.Emote[]|null) {
		if(!value) return;

		const hashmap:{[key:string]:TwitchDataTypes.Emote} = {};
		value.forEach(e => {
			hashmap[e.name] = e;
		});
		this.emotesCacheHashmap = hashmap;
		this._emotesCache = value;
	}

	public get highlightMyMessageReward():TwitchDataTypes.Reward {
		const img = rewardImg;
		return {
			broadcaster_name: UserSession.instance.twitchUser!.login,
			broadcaster_login: UserSession.instance.twitchUser!.login,
			broadcaster_id: UserSession.instance.twitchUser!.id,
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
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}