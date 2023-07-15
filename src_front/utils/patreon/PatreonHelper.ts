import StoreProxy from "@/store/StoreProxy";
import { reactive } from "vue";
import ApiController from "../ApiController";
import DataStore from "@/store/DataStore";
import type { PatreonData } from "./PatreonDataTypes";

/**
* Created : 13/07/2023 
*/
export default class PatreonHelper {

	private static _instance:PatreonHelper;

	public connected:boolean = false;

	private _refreshTimeout:number = 0
	private _token:AuthTokenInfo | null = null;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():PatreonHelper {
		if(!PatreonHelper._instance) {
			PatreonHelper._instance = reactive(new PatreonHelper()) as PatreonHelper;
			PatreonHelper._instance.initialize();
		}
		return PatreonHelper._instance;
	}

	public get redirectURI():string { return document.location.origin + StoreProxy.router.resolve({name:"patreon/auth"}).href; }
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Connects the user from stored data
	 */
	public connect():void {
		const token	= DataStore.get(DataStore.PATREON_AUTH_TOKEN);
		
		if(token) {
			this._token = JSON.parse(token);
			this.refreshToken();
		}
	}
	
	/**
	 * Disconnects the user
	 */
	public disconnect():void {
		this.connected = false;
		clearTimeout(this._refreshTimeout);
		DataStore.remove(DataStore.PATREON_AUTH_TOKEN);
	}

	/**
	 * Generate an auth token from a auth code 
	 * @param code 
	 */
	public async authenticate(code:string):Promise<void> {
		const res = await ApiController.call("patreon/authenticate", "POST", {code:code, redirect_uri:this.redirectURI});

		if(res.status == 200) {
			this._token = {
				access_token: res.json.data.access_token,
				refresh_token: res.json.data.refresh_token,
				expires_at: Date.now() + res.json.data.expires_in,
			};
	
			DataStore.set(DataStore.PATREON_AUTH_TOKEN, this._token);
			this.connected = true;
	
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = setTimeout(()=> {
				this.refreshToken();
			}, Math.max(60 * 1000, res.json.data.expires_in - 60000));
		}
	}

	/**
	 * Get the user's data
	 */
	public async getUser():Promise<{success: boolean,message?: string | undefined,data: PatreonData.UserData}|null> {
		if(!this._token) return null;
		
		const res = await ApiController.call("patreon/user", "GET", {token:this._token.access_token});
		return res.json;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}

	/**
	 * Refreshes access token
	 */
	private async refreshToken():Promise<void> {
		const res = await ApiController.call("patreon/refresh_token", "POST", {token:this._token?.refresh_token});
		if(res.status == 200 && res.json) {
			this.connected = true;
			this._token = {
				access_token: res.json.data.access_token,
				refresh_token: res.json.data.refresh_token,
				expires_at: Date.now() + res.json.data.expires_in * 1000,
			}
			
			console.log("REFRESH", res.json);
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = setTimeout(()=> {
				this.refreshToken();
			}, Math.max(60 * 1000, res.json.data.expires_in - 60000));
		}else{
			this._token = null;
			this.connected = false;
			StoreProxy.main.alert(StoreProxy.i18n.t("error.patreon_disconected"));
		}
	}
}

interface AuthTokenInfo {
	access_token:string;
	refresh_token:string;
	expires_at:number;
}