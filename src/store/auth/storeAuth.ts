import router from "@/router";
import type { TwitchDataTypes } from "@/types/TwitchDataTypes";
import Config from "@/utils/Config";
import IRCClient from "@/utils/IRCClient";
import PubSub from "@/utils/PubSub";
import TwitchUtils from "@/utils/TwitchUtils";
import UserSession from "@/utils/UserSession";
import Utils from "@/utils/Utils";
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import DataStore from "@/store/DataStore";
import StoreProxy, { type IAuthActions, type IAuthGetters, type IAuthState } from "../StoreProxy";
import type { UnwrapRef } from "vue";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";

interface IAuthPayload {code?:string, cb?:(success:boolean)=>void, forceRefresh?:boolean}

export const storeAuth = defineStore('auth', {
	state: () => ({
		refreshTokenTO: 0,
		authenticated: false,
		newScopeToRequest: [] as string[],
	} as IAuthState),
	
	
	
	getters: {
	} as IAuthGetters
	& ThisType<UnwrapRef<IAuthState> & _StoreWithGetters<IAuthGetters> & PiniaCustomProperties>
	& _GettersTree<IAuthState>,
	
	
	
	actions: {
		refreshAuthToken(payload:(success:boolean)=>void) {this.authenticate({cb:payload, forceRefresh:true}); },

		async authenticate(payload:IAuthPayload) {
			const code = payload.code;
			const cb = payload.cb;
			const forceRefresh = payload.forceRefresh;
			try {
	
				let json:TwitchDataTypes.AuthTokenResult;
				if(code) {
					const res = await fetch(Config.instance.API_PATH+"/gettoken?code="+code, {method:"GET"});
					json = await res.json();
				}else {
					json = JSON.parse(DataStore.get(DataStore.TWITCH_AUTH_TOKEN));
					//Refresh token if going to expire within the next 5 minutes
					if(json && (forceRefresh || json.expires_at < Date.now() - 60000*5)) {
						const res = await fetch(Config.instance.API_PATH+"/refreshtoken?token="+json.refresh_token, {method:"GET"});
						json = await res.json();
					}
				}
				if(!json) {
					console.log("No JSON :(", json);
					if(cb) cb(false);
					return;
				}
				//Validate auth token
				const userRes = await TwitchUtils.validateToken(json.access_token);
				const status = (userRes as TwitchDataTypes.Error).status;
				if(isNaN((userRes as TwitchDataTypes.Token).expires_in)
				&& status != 200) throw("invalid token");
	
				UserSession.instance.access_token = json.access_token;
				UserSession.instance.authToken = userRes as TwitchDataTypes.Token;
				//Check if all scopes are allowed
				for (let i = 0; i < Config.instance.TWITCH_APP_SCOPES.length; i++) {
					if(UserSession.instance.authToken.scopes.indexOf(Config.instance.TWITCH_APP_SCOPES[i]) == -1) {
						console.log("Missing scope:", Config.instance.TWITCH_APP_SCOPES[i]);
						this.authenticated = false;
						UserSession.instance.authResult = null;
						this.newScopeToRequest.push(Config.instance.TWITCH_APP_SCOPES[i]);
					}
				}
				if(this.newScopeToRequest.length > 0) {
					if(cb) cb(false);
					return;
				}
				if(!json.expires_at) {
					json.expires_at = Date.now() + UserSession.instance.authToken.expires_in*1000;
				}
				UserSession.instance.authResult = json;
				DataStore.access_token = json.access_token;
				DataStore.set(DataStore.TWITCH_AUTH_TOKEN, json, false);
				
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
				const users = await TwitchUtils.loadUserInfo([UserSession.instance.authToken.user_id]);
				const currentUser = users.find(v => v.id == UserSession.instance.authToken.user_id);
				if(currentUser) {
					UserSession.instance.twitchUser = currentUser;
				}
				
				if(this.authenticated) {
					//If we were authenticated, simply update the token on IRC
					IRCClient.instance.updateToken(json.access_token);
				}else{
					IRCClient.instance.connect(UserSession.instance.authToken.login, UserSession.instance.access_token as string);
					PubSub.instance.connect();
				}
				this.authenticated = true;
				const sUsers = StoreProxy.users;
				sUsers.mods = await TwitchUtils.getModerators();
				sUsers.followingStates[UserSession.instance.authToken.user_id] = true;
				sUsers.followingStatesByNames[UserSession.instance.authToken.login.toLowerCase()] = true;
				if(cb) cb(true);
	
				const expire = UserSession.instance.authToken.expires_in;
				let delay = Math.max(0, expire*1000 - 60000 * 5);//Refresh 5min before it actually expires
				//Refresh at least every 3h
				const maxDelay = 1000 * 60 * 60 * 3;
				if(delay > maxDelay) delay = maxDelay;
			
				console.log("Refresh token in", Utils.formatDuration(delay));
				clearTimeout(this.refreshTokenTO);
				this.refreshTokenTO = setTimeout(()=>{
					this.authenticate({forceRefresh:true});
				}, delay);
				
			}catch(error) {
				console.log(error);
				this.authenticated = false;
				DataStore.remove("oAuthToken");
				StoreProxy.main.alert = "Authentication failed";
				if(cb) cb(false);
				router.push({name: 'login'});//Redirect to login if connection failed
			}
		},
	
		logout() {
			UserSession.instance.authResult = null;
			this.authenticated = false;
			DataStore.remove("oAuthToken");
			IRCClient.instance.disconnect();
		},
	} as IAuthActions
	& ThisType<IAuthActions
		& UnwrapRef<IAuthState>
		& _StoreWithState<"auth", IAuthState, IAuthGetters, IAuthActions>
		& _StoreWithGetters<IAuthGetters>
		& PiniaCustomProperties
	>,
})