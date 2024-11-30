import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IPublicActions, IPublicGetters, IPublicState } from './StoreProxy';
import StoreProxy from './StoreProxy';
import Utils from '@/utils/Utils';
import Config, { type ServerConfig } from '@/utils/Config';
import ApiHelper from '@/utils/ApiHelper';
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import DataStoreCommon from './DataStoreCommon';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import type { TwitchScopesString } from '@/utils/twitch/TwitchScopes';

let refreshTokenTO:number = -1;

export const storePublic = defineStore('public', {
	state: () => ({
		initComplete:false,
		authenticated:false,
		twitchUid:"",
		twitchLogin:"",
		twitchAccessToken:"",
		twitchRefreshToken:"",
		grantedScopes:[],
	} as IPublicState),



	getters: {
	} as IPublicGetters
	& ThisType<UnwrapRef<IPublicState> & _StoreWithGetters<IPublicGetters> & PiniaCustomProperties>
	& _GettersTree<IPublicState>,



	actions: {
		async startApp():Promise<void> {
			//Load app configs (cliend ID, scopes, ...)
			window.setInitMessage("loading configs");
			let jsonConfigs:ServerConfig;
			try {
				const res = await ApiHelper.call("configs", "GET");
				jsonConfigs = res.json;
			}catch(error) {
				StoreProxy.common.alert("Unable to contact server :(", true, true);
				console.log(error);
				return;
			}
			Config.instance.populateServerConfigs(jsonConfigs);

			//Authenticate user
			const token = DataStoreCommon.get(DataStoreCommon.TWITCH_AUTH_TOKEN);
			if(token) {
				try {
					await this.twitchAuth();
				}catch(error) {
					console.log(error);
					DataStoreCommon.remove("oAuthToken");
				}

			}

			this.initComplete = true;
		},
		
		twitchUnauth():void {
			DataStoreCommon.remove(DataStoreCommon.TWITCH_AUTH_TOKEN);
			this.authenticated = false;
			clearTimeout(refreshTokenTO);
		},
		
		async twitchAuth(code?:string):Promise<boolean> {
			const storeValue = DataStoreCommon.get(DataStoreCommon.TWITCH_AUTH_TOKEN);
			let twitchAuthResult:TwitchDataTypes.AuthTokenResult|null = storeValue? JSON.parse(storeValue) : null;
			if(code) {
				//Convert oAuth code to access_token
				const res = await ApiHelper.call("auth/twitch", "GET", {code});
				twitchAuthResult		= res.json;
				this.twitchAccessToken	= twitchAuthResult.access_token;
				this.grantedScopes		= twitchAuthResult.scope;
				ApiHelper.accessToken	= this.twitchAccessToken;
				twitchAuthResult.expires_at	= Date.now() + twitchAuthResult.expires_in * 1000;
				DataStoreCommon.set(DataStoreCommon.TWITCH_AUTH_TOKEN, twitchAuthResult, false);
				TwitchUtils.updateAuthInfo(twitchAuthResult.access_token, twitchAuthResult.scope, (scopes:TwitchScopesString[])=>{}, async ():Promise<false | TwitchDataTypes.AuthTokenResult>=>{ return false}, this.twitchUid);
				clearTimeout(refreshTokenTO);
				//Schedule refresh
				refreshTokenTO = window.setTimeout(()=>{
					this.twitchTokenRefresh(true);
				}, (twitchAuthResult.expires_in || 120) * 1000 - 60000 * 5);
				
			}else {
				const res = await this.twitchTokenRefresh(false);
				this.authenticated = res != false;
				if(res === false) {
					StoreProxy.common.alert("Unable to connect with Twitch API :(.", false, true);
					twitchAuthResult = null;
				}else{
					twitchAuthResult = res;
				}
			}
			if(!twitchAuthResult) {
				return false;
			}else{
				let userRes:TwitchDataTypes.Token | TwitchDataTypes.Error | undefined;
				try {
					window.setInitMessage("validating Twitch auth token");
					userRes = await TwitchUtils.validateToken(this.twitchAccessToken);
				}catch(error) { /*ignore*/ }

				if(!userRes || isNaN((userRes as TwitchDataTypes.Token).expires_in)
				&& (userRes as TwitchDataTypes.Error).status != 200) throw("invalid token");

				userRes = userRes as TwitchDataTypes.Token;//Just forcing typing for the rest of the code
				this.twitchUid = userRes.user_id;
				this.twitchLogin = userRes.login;
				TwitchUtils.updateAuthInfo(twitchAuthResult.access_token, twitchAuthResult.scope, (scopes:TwitchScopesString[])=>{}, async ():Promise<false | TwitchDataTypes.AuthTokenResult>=>{ return false}, this.twitchUid);
				this.authenticated = true;
			}
			return true;
		},

		async twitchTokenRefresh():Promise<false|TwitchDataTypes.AuthTokenResult> {
			let twitchAuthResult:TwitchDataTypes.AuthTokenResult = JSON.parse(DataStoreCommon.get(DataStoreCommon.TWITCH_AUTH_TOKEN));
			//Refresh token if it's going to expire within the next 5 minutes
			if(twitchAuthResult && twitchAuthResult.refresh_token) {
				try {
					const res 			= await ApiHelper.call("auth/twitch/refreshtoken", "GET", {token:twitchAuthResult.refresh_token});
					if(res.status != 200) throw("invalid refresh result")
					twitchAuthResult	= res.json;
				}catch(error) {
					return false;
				}
				this.twitchAccessToken		= twitchAuthResult.access_token;
				twitchAuthResult.expires_at	= Date.now() + twitchAuthResult.expires_in * 1000;
				this.grantedScopes			= twitchAuthResult.scope;
				ApiHelper.accessToken		= this.twitchAccessToken;
				//Store auth data in cookies for later use
				DataStoreCommon.set(DataStoreCommon.TWITCH_AUTH_TOKEN, twitchAuthResult, false);

				const expire	= twitchAuthResult.expires_in;
				let delay		= Math.max(0, expire * 1000 - 60000 * 5);//Refresh 5min before it actually expires
				delay			= Math.min(delay, 1000 * 60 * 60 * 3);//Refresh at least every 3h
				if(isNaN(delay)) {
					//fail safe.
					//Refresh in 1 minute if something failed when refreshing
					delay = 60*1000;
				}

				TwitchUtils.updateAuthInfo(twitchAuthResult.access_token, twitchAuthResult.scope, (scopes:TwitchScopesString[])=>{}, async ():Promise<false | TwitchDataTypes.AuthTokenResult>=>{ return false}, this.twitchUid);
				clearTimeout(refreshTokenTO);
				refreshTokenTO = window.setTimeout(()=>{
					this.twitchTokenRefresh(true);
				}, delay);
				this.authenticated = true;
				return twitchAuthResult;
			}
			this.authenticated = false;
			return false;
		},

		/**
		 * Here for debug purpose.
		 * Called when doing CTRL+Shift+L to reload the app labels
		 * this makes a little easier testing labels updates to
		 * avoid refreshing the full app
		 */
		async reloadLabels(bypassCache:boolean = false):Promise<void> {
			let url = "/labels.json";
			if(bypassCache) url += "?ck="+Utils.getUUID();
			const labelsRes = await fetch(url);
			const labelsJSON = await labelsRes.json();
			for (const lang in labelsJSON) {
				StoreProxy.i18n.setLocaleMessage(lang, labelsJSON[lang]);
			}
		},

	} as IPublicActions
	& ThisType<IPublicActions
		& UnwrapRef<IPublicState>
		& _StoreWithState<"public", IPublicState, IPublicGetters, IPublicActions>
		& _StoreWithGetters<IPublicGetters>
		& PiniaCustomProperties
	>,
})