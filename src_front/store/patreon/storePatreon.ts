import ApiHelper from '@/utils/ApiHelper';
import Config from '@/utils/Config';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IPatreonActions, IPatreonGetters, IPatreonState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import type { PatreonDataTypes } from '@/utils/patreon/PatreonDataTypes';
import SSEHelper from '@/utils/SSEHelper';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';

let refreshTimeout:number = 0;

export const storePatreon = defineStore('patreon', {
	state: () => ({
		token: null,
		isMember: false,
		connected: false,
		oauthFlowParams: null,
		webhookExists: false,
		webhookScopesGranted: false,
	} as IPatreonState),



	getters: {
	} as IPatreonGetters
	& ThisType<UnwrapRef<IPatreonState> & _StoreWithGetters<IPatreonGetters> & PiniaCustomProperties>
	& _GettersTree<IPatreonState>,



	actions: {
		async populateData():Promise<void> {
			const token	= DataStore.get(DataStore.PATREON_AUTH_TOKEN);
			
			if(token) {
				this.token = JSON.parse(token);
				await this.refreshToken();
				if(this.connected) {
					await this.loadMemberState();
				}
			}
			
			SSEHelper.instance.addEventListener("PATREON_MEMBER_CREATE", (event) =>{
				const data = event.data;
				if(!data) return;

				const message:TwitchatDataTypes.MessagePatreonData = {
					channel_id:StoreProxy.auth.twitch.user.id,
					date:Date.now(),
					eventType:"new_member",
					id:Utils.getUUID(),
					platform:"twitchat",
					type:TwitchatDataTypes.TwitchatMessageType.PATREON,
					tier: data.tier,
					user:data.user,
				}
				StoreProxy.chat.addMessage(message);
			})
		},
		
		setPatreonAuthResult(value):void { this.oauthFlowParams = value; },
		
		/**
		 * Get URL to redirect to to start oAuth flow
		 * @param premiumContext
		 * @returns 
		 */
		async getOAuthURL(premiumContext:boolean = false):Promise<string> {
			const {json} = await ApiHelper.call("auth/CSRFToken", "GET");
			const url = new URL("https://www.patreon.com/oauth2/authorize");
			url.searchParams.append("response_type", "code");
			url.searchParams.append("client_id", Config.instance.PATREON_CLIENT_ID);
			url.searchParams.append("redirect_uri", StoreProxy.patreon.getRedirectURI(premiumContext));
			url.searchParams.append("scope", premiumContext? "identity" : Config.instance.PATREON_SCOPES);
			url.searchParams.append("state", json.token);

			return url.href;
		},
		
		/**
		 * Disconnects the user
		 */
		disconnect():void {
			ApiHelper.call("patreon/user/webhook", "DELETE", {token:this.token!.access_token});
			this.connected = false;
			this.isMember = false;
			this.token = null;
			clearTimeout(refreshTimeout);
			DataStore.remove(DataStore.PATREON_AUTH_TOKEN);
		},

		/**
		 * Get redirect URI
		 * @param premiumContext 
		 * @returns 
		 */
		getRedirectURI(premiumContext:boolean = false):string {
			const suffix = premiumContext? "/premium" : "";
			return document.location.origin + StoreProxy.router.resolve({name:"patreon/auth"}).href + suffix;
		},

		/**
		 * Completes oauth flow
		 * @returns 
		 */
		async completeOAuthFlow(premiumContext:boolean = false):Promise<boolean> {
			const authParams = StoreProxy.patreon.oauthFlowParams;
			if(!authParams) return false;
			const {json:csrf} = await ApiHelper.call("auth/CSRFToken", "POST", {token:authParams.csrf}, false);
			if(!csrf.success) {
				StoreProxy.common.alert(csrf.message || "Patreon authentication failed");
			}else{
				try {
					await this.authenticate(authParams.code, premiumContext);
					StoreProxy.patreon.setPatreonAuthResult(null);
					return true;
				}catch(e:unknown) {
					console.log(e);
					StoreProxy.common.alert("Oops... something went wrong");
				}
			}
			return false;
		},

		/**
		 * Generate an auth token from a auth code 
		 * @param code 
		 */
		async authenticate(code:string, premiumContext:boolean = false):Promise<void> {
			const res = await ApiHelper.call("patreon/authenticate", "POST", {code:code, redirect_uri:this.getRedirectURI(premiumContext)}, false);

			if(res.status == 200) {
				this.token = {
					access_token: res.json.data.access_token,
					refresh_token: res.json.data.refresh_token,
					expires_at: Date.now() + res.json.data.expires_in,
					scopes: res.json.data.scope.split(" ") as PatreonDataTypes.AuthTokenInfo["scopes"],
				};
				this.webhookScopesGranted = this.token.scopes.includes("w:campaigns.webhook") || false
		
				DataStore.set(DataStore.PATREON_AUTH_TOKEN, this.token);
				await this.loadMemberState();
				this.connected = true;
		
				clearTimeout(refreshTimeout);
				refreshTimeout = setTimeout(()=> {
					this.refreshToken();
				}, Math.max(60 * 1000, res.json.data.expires_in - 60000));
			}
		},

		/**
		 * Get the user's data
		 */
		async loadMemberState():Promise<void> {
			if(!this.token) return;
			
			const res = await ApiHelper.call("patreon/isMember", "GET", {token:this.token.access_token});
			if(res.status != 200) {
				if(res.json.errorCode == "MAX_LINKED_ACCOUNTS") {
					StoreProxy.common.alert(StoreProxy.i18n.t('error.patreon_max_linked'))
				}
			}else{
				this.isMember = res.json.data?.isMember === true;
				if(this.isMember) {
					StoreProxy.chat.cleanupDonationRelatedMessages();
				}
			}

			
			//Check if webhook exists in case user granted the necessary scope
			//If it does not, create it.
			if(this.token.scopes.includes("w:campaigns.webhook")) {
				const webhookRes = await ApiHelper.call("patreon/user/webhook", "GET", {token:this.token!.access_token});
				this.webhookExists = webhookRes.json.success===true && webhookRes.json.webhookExists===true;
				
				if(!this.webhookExists) {
					await this.createWebhook();
				}
			}
		},

		/**
		 * Get the user's data
		 */
		async createWebhook():Promise<void> {
			if(!this.token) return;
			
			const res = await ApiHelper.call("patreon/user/webhook", "POST", {token:this.token.access_token}, false);
			if(res.status != 200) {
			}else{
				this.webhookExists = true;
			}
		},

		/**
		 * Refreshes access token
		 */
		async refreshToken():Promise<void> {
			if(!this.token) return;
			const res = await ApiHelper.call("patreon/refresh_token", "POST", {token:this.token.refresh_token});
			if(res.status == 200 && res.json) {
				this.token = {
					access_token: res.json.data.access_token,
					refresh_token: res.json.data.refresh_token,
					expires_at: Date.now() + res.json.data.expires_in * 1000,
					scopes: res.json.data.scope.split(" ") as PatreonDataTypes.AuthTokenInfo["scopes"],
				}
				this.webhookScopesGranted = this.token.scopes.includes("w:campaigns.webhook") || false
	
				DataStore.set(DataStore.PATREON_AUTH_TOKEN, this.token);
				this.connected = true;
				
				clearTimeout(refreshTimeout);
				refreshTimeout = setTimeout(()=> {
					this.refreshToken();
				}, Math.max(60 * 1000, res.json.data.expires_in - 60000));
			}else{
				this.token = null;
				this.connected = false;
				DataStore.remove(DataStore.PATREON_AUTH_TOKEN);
				StoreProxy.common.alert(StoreProxy.i18n.t("error.patreon_disconected"));
			}
		},

	} as IPatreonActions
	& ThisType<IPatreonActions
		& UnwrapRef<IPatreonState>
		& _StoreWithState<"patreon", IPatreonState, IPatreonGetters, IPatreonActions>
		& _StoreWithGetters<IPatreonGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storePatreon, import.meta.hot))
}