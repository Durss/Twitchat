import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import { reactive } from "vue";
import ApiController from "../ApiController";

/**
* Created : 13/07/2023 
*/
export default class PatreonHelper {

	private static _instance:PatreonHelper;

	public connected:boolean = false;

	private _isMember:boolean = false;
	private _refreshTimeout:number = 0;
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

	public get isMember():boolean { return this._isMember; }

	public get redirectURI():string { return document.location.origin + StoreProxy.router.resolve({name:"patreon/auth"}).href; }
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Connects the user from stored data
	 */
	public async connect():Promise<void> {
		const token	= DataStore.get(DataStore.PATREON_AUTH_TOKEN);
		
		if(token) {
			window.setInitMessage("connecting to patreon");
			this._token = JSON.parse(token);
			await this.refreshToken();
			if(this.connected) {
				await this.getIsMember();
			}
		}
	}
	
	/**
	 * Disconnects the user
	 */
	public disconnect():void {
		this.connected = false;
		this._isMember = false;
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
			await this.getIsMember();
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
	public async getIsMember() {
		if(!this._token) return null;
		
		const res = await ApiController.call("patreon/isMember", "GET", {token:this._token.access_token});
		this._isMember = res.json.data.isMember;
		if(this._isMember) {
			StoreProxy.chat.cleanupDonationRelatedMessages();
		}
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
			this._token = {
				access_token: res.json.data.access_token,
				refresh_token: res.json.data.refresh_token,
				expires_at: Date.now() + res.json.data.expires_in * 1000,
			}

			DataStore.set(DataStore.PATREON_AUTH_TOKEN, this._token);
			this.connected = true;
			
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = setTimeout(()=> {
				this.refreshToken();
			}, Math.max(60 * 1000, res.json.data.expires_in - 60000));
		}else{
			this._token = null;
			this.connected = false;
			DataStore.remove(DataStore.PATREON_AUTH_TOKEN);
			StoreProxy.main.alert(StoreProxy.i18n.t("error.patreon_disconected"));
		}
	}
}

interface AuthTokenInfo {
	access_token:string;
	refresh_token:string;
	expires_at:number;
}