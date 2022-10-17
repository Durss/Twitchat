import MessengerProxy from "@/messaging/MessengerProxy";
import TwitchMessengerClient from "@/messaging/TwitchMessengerClient";
import router from "@/router";
import DataStore from "@/store/DataStore";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import PubSub from "@/utils/twitch/PubSub";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import UserSession from "@/utils/UserSession";
import Utils from "@/utils/Utils";
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from "vue";
import StoreProxy, { type IAuthActions, type IAuthGetters, type IAuthState } from "../StoreProxy";

interface IAuthPayload {code?:string, cb?:(success:boolean)=>void, forceRefresh?:boolean};

let refreshTokenTO:number = -1;

//TODO make this platform agnostic
export const storeAuth = defineStore('auth', {
	state: () => ({
		authenticated: false,
		newScopesToRequest: [] as string[],
		
	} as IAuthState),
	
	
	
	getters: {
	} as IAuthGetters
	& ThisType<UnwrapRef<IAuthState> & _StoreWithGetters<IAuthGetters> & PiniaCustomProperties>
	& _GettersTree<IAuthState>,
	
	
	
	actions: {
		refreshAuthToken(payload:(success:boolean)=>void) {
			this.authenticate({cb:payload, forceRefresh:true});
		},

		async authenticate(payload:IAuthPayload) {
			const code = payload.code;
			const cb = payload.cb;
			const forceRefresh = payload.forceRefresh;
			const sChat = StoreProxy.chat;
			const sMain = StoreProxy.main;

			try {
	
				let json:TwitchDataTypes.AuthTokenResult;
				if(code) {
					const res = await fetch(Config.instance.API_PATH+"/auth/twitch?code="+code, {method:"GET"});
					json = await res.json();
				}else {
					json = JSON.parse(DataStore.get(DataStore.TWITCH_AUTH_TOKEN));
					//Refresh token if going to expire within the next 5 minutes
					if(json && (forceRefresh || json.expires_at < Date.now() - 60000*5)) {
						const res = await fetch(Config.instance.API_PATH+"/auth/twitch/refreshtoken?token="+json.refresh_token, {method:"GET"});
						json = await res.json();
					}
				}
				if(!json) {
					console.log("No JSON :(", json);
					if(cb) cb(false);
					return;
				}
				//Validate auth token
				let userRes:TwitchDataTypes.Token | TwitchDataTypes.Error | undefined;
				try {
					userRes = await TwitchUtils.validateToken(json.access_token);
				}catch(error) {
					/*ignore*/
				}
				if(!userRes || isNaN((userRes as TwitchDataTypes.Token).expires_in)
				&& (userRes as TwitchDataTypes.Error).status != 200) throw("invalid token");
	
				UserSession.instance.authResult = json;
				UserSession.instance.access_token = json.access_token;
				UserSession.instance.twitchAuthToken = userRes as TwitchDataTypes.Token;
				console.log("JSON", json)
				DataStore.access_token = json.access_token;
				DataStore.set(DataStore.TWITCH_AUTH_TOKEN, json, false);

				//Check if all scopes are allowed
				for (let i = 0; i < Config.instance.TWITCH_APP_SCOPES.length; i++) {
					if(UserSession.instance.twitchAuthToken.scopes.indexOf(Config.instance.TWITCH_APP_SCOPES[i]) == -1) {
						console.log("Missing scope:", Config.instance.TWITCH_APP_SCOPES[i]);
						this.authenticated = false;
						UserSession.instance.authResult = null;
						this.newScopesToRequest.push(Config.instance.TWITCH_APP_SCOPES[i]);
					}
				}
				if(this.newScopesToRequest.length > 0) {
					if(cb) cb(false);
					return;
				}
				if(!json.expires_at) {
					json.expires_at = Date.now() + UserSession.instance.twitchAuthToken.expires_in*1000;
				}
				
				//Check if user is part of the donors
				try {
					const options = {
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer "+UserSession.instance.access_token as string,
						},
					}
					const donorRes = await fetch(Config.instance.API_PATH+"/user/donor", options);
					const donorJSON = await donorRes.json();
					UserSession.instance.isDonor = donorJSON.data?.isDonor === true;
					UserSession.instance.donorLevel = donorJSON.data?.level;
				}catch(error) {}
	
				//Get full user's info
				const users = await TwitchUtils.loadUserInfo([UserSession.instance.twitchAuthToken.user_id]);
				const currentUser = users.find(v => v.id == UserSession.instance.twitchAuthToken.user_id);
				if(currentUser) {
					UserSession.instance.twitchUser = currentUser;
				}
				
				if(this.authenticated) {
					//If we were authenticated, simply update the token on IRC
					TwitchMessengerClient.instance.refreshToken(json.access_token);
				}else{
					TwitchMessengerClient.instance.credentials = {
						token:json.access_token,
						username:currentUser?.login ?? "user not found",
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
				if(!DataStore.get(DataStore.TWITCHAT_AD_WARNED) && !UserSession.instance.isDonor) {
					setTimeout(()=>{
						sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING);
					}, 5000)
				}else
				if(!DataStore.get(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT) && UserSession.instance.isDonor) {
					setTimeout(()=>{
						sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT);
					}, 5000)
				}
				sMain.toggleDevMode( DataStore.get(DataStore.DEVMODE) === "true" );

				if(cb) cb(true);
	
				const expire = UserSession.instance.twitchAuthToken.expires_in;
				let delay = Math.max(0, expire*1000 - 60000 * 5);//Refresh 5min before it actually expires
				//Refresh at least every 3h
				const maxDelay = 1000 * 60 * 60 * 3;
				if(delay > maxDelay) delay = maxDelay;
			
				console.log("Refresh token in", Utils.formatDuration(delay));
				clearTimeout(refreshTokenTO);
				refreshTokenTO = setTimeout(()=>{
					this.authenticate({forceRefresh:true});
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
			UserSession.instance.authResult = null;
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