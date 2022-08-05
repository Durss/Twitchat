import type { TwitchDataTypes } from "@/types/TwitchDataTypes";
import { reactive } from "vue";

/**
* Created : 17/06/2022 
* This class only exists to solve a circular imports issue
*/
export default class UserSession {

	private static _instance:UserSession;

	public authResult:TwitchDataTypes.AuthTokenResult|null = null;
	//keys are lowercased version of the emotes codes
	public emotesCacheHashmap:{[key:string]:TwitchDataTypes.Emote} = {};
	public user:TwitchDataTypes.UserInfo| null = null;
	public access_token:string|null = null;
	public authToken = {
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
		return this.user?.broadcaster_type != "";
	}
	public get emotesCache():TwitchDataTypes.Emote[]|null { return this._emotesCache; }
	public set emotesCache(value:TwitchDataTypes.Emote[]|null) {
		if(!value) return;

		const hashmap:{[key:string]:TwitchDataTypes.Emote} = {};
		value.forEach(e => {
			hashmap[e.name.toLowerCase()] = e;
		});
		this.emotesCacheHashmap = hashmap;
		this._emotesCache = value;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}