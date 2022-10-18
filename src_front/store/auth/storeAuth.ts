import MessengerProxy from "@/messaging/MessengerProxy";
import TwitchMessengerClient from "@/messaging/TwitchMessengerClient";
import router from "@/router";
import DataStore from "@/store/DataStore";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import PubSub from "@/utils/twitch/PubSub";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from "vue";
import StoreProxy, { type IAuthActions, type IAuthGetters, type IAuthState } from "../StoreProxy";

let refreshTokenTO:number = -1;

//TODO make this platform agnostic
export const storeAuth = defineStore('auth', {
	state: () => ({
		authenticated: false,
		newScopesToRequest: [] as string[],
		twitchat:{},
		twitch:{},
		youtube:{},
		tiktok:{},
		facebook:{},
	} as IAuthState),
	
	
	
	getters: {
	} as IAuthGetters
	& ThisType<UnwrapRef<IAuthState> & _StoreWithGetters<IAuthGetters> & PiniaCustomProperties>
	& _GettersTree<IAuthState>,
	
	
	
	actions: {
		refreshAuthToken(callback?:(success:boolean)=>void) {
			this.authenticate(undefined, callback, true);
		},

		async authenticate(code?:string, cb?:(success:boolean)=>void, forceRefresh?:boolean) {
			const sChat = StoreProxy.chat;
			const sMain = StoreProxy.main;

			try {
	
				let twitchAuthResult:TwitchDataTypes.AuthTokenResult;
				if(code) {
					//Convert oAuth code to access_token
					const res = await fetch(Config.instance.API_PATH+"/auth/twitch?code="+code, {method:"GET"});
					twitchAuthResult = await res.json();
				}else {
					twitchAuthResult = JSON.parse(DataStore.get(DataStore.TWITCH_AUTH_TOKEN));
					//Refresh token if going to expire within the next 5 minutes
					if(twitchAuthResult && (forceRefresh || twitchAuthResult.expires_at < Date.now() - 60000*5)) {
						const res = await fetch(Config.instance.API_PATH+"/auth/twitch/refreshtoken?token="+twitchAuthResult.refresh_token, {method:"GET"});
						twitchAuthResult = await res.json();
					}
				}
				if(!twitchAuthResult) {
					console.log("No JSON :(", twitchAuthResult);
					if(cb) cb(false);
					return;
				}
				//Validate access token
				let userRes:TwitchDataTypes.Token | TwitchDataTypes.Error | undefined;
				try {
					userRes = await TwitchUtils.validateToken(twitchAuthResult.access_token);
				}catch(error) { /*ignore*/ }

				if(!userRes || isNaN((userRes as TwitchDataTypes.Token).expires_in)
				&& (userRes as TwitchDataTypes.Error).status != 200) throw("invalid token");

				userRes = userRes as TwitchDataTypes.Token;//Just forcing typing for the rest of the code

				this.twitch.client_id		= userRes.client_id;
				this.twitch.access_token	= twitchAuthResult.access_token;
				this.twitch.scopes			= (userRes as TwitchDataTypes.Token).scopes;
				this.twitch.expires_in		= userRes.expires_in;

				let twitchatUser!:TwitchatDataTypes.TwitchatUser;
				await new Promise((resolve)=> {
					userRes = userRes as TwitchDataTypes.Token;//Just forcing typing for the rest of the code
					twitchatUser = StoreProxy.users.getUserFrom("twitch", userRes.user_id, userRes.user_id, undefined, undefined, resolve);
				})

				this.twitch.user = twitchatUser;
	
				DataStore.set(DataStore.TWITCH_AUTH_TOKEN, twitchAuthResult, false);

				//Check if all scopes are allowed
				for (let i = 0; i < Config.instance.TWITCH_APP_SCOPES.length; i++) {
					if(StoreProxy.auth.twitch.scopes.indexOf(Config.instance.TWITCH_APP_SCOPES[i]) == -1) {
						console.log("Missing scope:", Config.instance.TWITCH_APP_SCOPES[i]);
						this.authenticated = false;
						this.newScopesToRequest.push(Config.instance.TWITCH_APP_SCOPES[i]);
					}
				}
				if(this.newScopesToRequest.length > 0) {
					if(cb) cb(false);
					return;
				}
				if(!twitchAuthResult.expires_at) {
					twitchAuthResult.expires_at = Date.now() + this.twitch.expires_in*1000;
				}
				
				//Check if user is part of the donors
				try {
					const options = {
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer "+this.twitch.access_token,
						},
					}
					const donorRes = await fetch(Config.instance.API_PATH+"/user/donor", options);
					const donorJSON = await donorRes.json();
					this.twitch.user.donor.state	= donorJSON.data?.isDonor === true;
					this.twitch.user.donor.level	= donorJSON.data?.level;
				}catch(error) {}
	
				
				if(this.authenticated) {
					//If we were authenticated, simply update the token on IRC
					TwitchMessengerClient.instance.refreshToken(twitchAuthResult.access_token);
				}else{
					TwitchMessengerClient.instance.credentials = {
						token:twitchAuthResult.access_token,
						username:this.twitch.user.login ?? "user not found",
					}
				}
				
				this.authenticated = true;

				if(DataStore.syncToServer === true && this.authenticated) {
					if(!await DataStore.loadRemoteData()) {
						//Force data sync popup to show up if remote
						//data have been deleted
						DataStore.remove(DataStore.SYNC_DATA_TO_SERVER);
					}
				}

				sMain.loadDataFromStorage();

				MessengerProxy.instance.connect();
				PubSub.instance.connect();
	
				sChat.sendTwitchatAd();
				if(!DataStore.get(DataStore.TWITCHAT_AD_WARNED) && !this.twitch.user.donor.state) {
					setTimeout(()=>{
						sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING);
					}, 5000)
				}else
				if(!DataStore.get(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT) && this.twitch.user.donor.state) {
					setTimeout(()=>{
						sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT);
					}, 5000)
				}
				sMain.toggleDevMode( DataStore.get(DataStore.DEVMODE) === "true" );

				if(cb) cb(true);
				const expire = this.twitch.expires_in;
				let delay = Math.max(0, expire*1000 - 60000 * 5);//Refresh 5min before it actually expires
				//Refresh at least every 3h
				const maxDelay = 1000 * 60 * 60 * 3;
				if(delay > maxDelay) delay = maxDelay;
			
				console.log("Refresh token in", Utils.formatDuration(delay));
				clearTimeout(refreshTokenTO);
				refreshTokenTO = setTimeout(()=>{
					this.authenticate(undefined, undefined, true);
				}, delay);
				
			}catch(error) {
				console.log(error);
				this.authenticated = false;
				DataStore.remove("oAuthToken");
				StoreProxy.main.alertData = "Authentication failed";
				if(cb) cb(false);
				router.push({name: 'login'});//Redirect to login if connection failed
			}
		},
	
		logout() {
			this.authenticated = false;
			DataStore.remove("oAuthToken");
			MessengerProxy.instance.disconnect();
		},
	} as IAuthActions
	& ThisType<IAuthActions
		& UnwrapRef<IAuthState>
		& _StoreWithState<"auth", IAuthState, IAuthGetters, IAuthActions>
		& _StoreWithGetters<IAuthGetters>
		& PiniaCustomProperties
	>,
})