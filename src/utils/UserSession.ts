import type { TwitchDataTypes } from "@/types/TwitchDataTypes";
import { reactive } from "vue";

/**
* Created : 17/06/2022 
* This class only exists to solve a circular imports issue
*/
export default class UserSession {

	private static _instance:UserSession;

	public authResult:TwitchDataTypes.AuthTokenResult|null = null;
	public emotesCache:TwitchDataTypes.Emote[]|null = null;
	public user:TwitchDataTypes.UserInfo| null = null;
	public authToken = {
		client_id: "",
		login: "",
		scopes: [""],
		user_id: "",
		expires_in: 0,
	} as TwitchDataTypes.Token;
	
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
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}