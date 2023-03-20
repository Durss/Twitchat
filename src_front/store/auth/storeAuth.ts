import MessengerProxy from "@/messaging/MessengerProxy";
import TwitchMessengerClient from "@/messaging/TwitchMessengerClient";
import router from "@/router";
import DataStore from "@/store/DataStore";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import EventSub from "@/utils/twitch/EventSub";
import PubSub from "@/utils/twitch/PubSub";
import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from "vue";
import StoreProxy, { type IAuthActions, type IAuthGetters, type IAuthState } from "../StoreProxy";

let refreshTokenTO:number = -1;

export const storeAuth = defineStore('auth', {
	state: () => ({
		authenticated: false,
		newScopesToRequest: [] as TwitchScopesString[],
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
		async twitch_tokenRefresh(reconnectIRC:boolean, callback?:(success:boolean)=>void) {
			let twitchAuthResult:TwitchDataTypes.AuthTokenResult = JSON.parse(DataStore.get(DataStore.TWITCH_AUTH_TOKEN));
			//Refresh token if going to expire within the next 5 minutes
			if(twitchAuthResult) {
				try {
					const headers = {
						'App-Version': import.meta.env.PACKAGE_VERSION,
					};
					const res			= await fetch(Config.instance.API_PATH+"/auth/twitch/refreshtoken?token="+twitchAuthResult.refresh_token, {method:"GET", headers});
					twitchAuthResult	= await res.json();
				}catch(error) {
					if(callback) callback(false);
					return;
				}
				this.twitch.access_token	= twitchAuthResult.access_token;
				this.twitch.expires_in		= twitchAuthResult.expires_in;
				twitchAuthResult.expires_at	= Date.now() + twitchAuthResult.expires_in * 1000;
				//Store auth data in cookies for later use
				DataStore.set(DataStore.TWITCH_AUTH_TOKEN, twitchAuthResult, false);
				if(reconnectIRC) {
					TwitchMessengerClient.instance.refreshToken(twitchAuthResult.access_token);
				}

				const expire	= this.twitch.expires_in;
				let delay		= Math.max(0, expire*1000 - 60000 * 5);//Refresh 5min before it actually expires
				delay			= Math.min(delay, 1000 * 60 * 60 * 3);//Refresh at least every 3h
				if(isNaN(delay)) {
					//fail safe.
					//Refresh in 1 minute if something failed when refreshing
					delay = 60*1000;
				}
			
				console.log("Refresh token in", Utils.formatDuration(delay));
				clearTimeout(refreshTokenTO);
				refreshTokenTO = setTimeout(()=>{
					this.twitch_tokenRefresh(true);
				}, delay);
				if(callback) callback(true);
				return twitchAuthResult;
			}
		},

		async twitch_autenticate(code?:string, cb?:(success:boolean, betaRefused?:boolean)=>void) {

			try {
	
				const storeValue = DataStore.get(DataStore.TWITCH_AUTH_TOKEN);
				let twitchAuthResult:TwitchDataTypes.AuthTokenResult = storeValue? JSON.parse(storeValue) : undefined;
				if(code) {
					//Convert oAuth code to access_token
					const headers = {
						'App-Version': import.meta.env.PACKAGE_VERSION,
					};
					const res = await fetch(Config.instance.API_PATH+"/auth/twitch?code="+code, {method:"GET", headers});
					twitchAuthResult = await res.json();
					twitchAuthResult.expires_at	= Date.now() + twitchAuthResult.expires_in * 1000;
					DataStore.set(DataStore.TWITCH_AUTH_TOKEN, twitchAuthResult, false);
					clearTimeout(refreshTokenTO);
					//Schedule refresh
					refreshTokenTO = setTimeout(()=>{
						this.twitch_tokenRefresh(true);
					}, this.twitch.expires_in*1000 - 60000 * 5);
				}else {
					//OAuth process already done, just request a fresh new token if it's
					//gonna expire in less than 5 minutes
					// if(twitchAuthResult && twitchAuthResult.expires_at < Date.now() - 60000*5) {
						const res = await this.twitch_tokenRefresh(false);
						if(!res) {
							StoreProxy.main.alert("Unable to connect with Twitch API :(")
							return;
						}
						twitchAuthResult = res;
					// }
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

				userRes						= userRes as TwitchDataTypes.Token;//Just forcing typing for the rest of the code
				this.twitch.client_id		= userRes.client_id;
				this.twitch.access_token	= twitchAuthResult.access_token;
				this.twitch.scopes			= (userRes as TwitchDataTypes.Token).scopes;
				this.twitch.expires_in		= userRes.expires_in;

				if(Config.instance.BETA_MODE) {
					const headers = {
						'App-Version': import.meta.env.PACKAGE_VERSION,
					};
					const res = await fetch(Config.instance.API_PATH+"/beta/user?uid="+userRes.user_id, {method:"GET", headers});
					if(res.status != 200 || (await res.json()).data.beta !== true) {
						if(cb) cb(false, true);
						else router.push({name:"login", params:{betaReason:"true"}});
						return;
					}
				}

				// Load the current user data
				await new Promise((resolve)=> {
					//Makes sure the pronoun param is properly set up so our pronouns
					//are loaded if requested					
					// sMain.loadDataFromStorage();
					const uid = (userRes as TwitchDataTypes.Token).user_id;
					this.twitch.user = StoreProxy.users.getUserFrom("twitch", uid, uid, undefined, undefined, resolve);
				})
				if(this.twitch.user.errored === true){
					if(cb) cb(false);
					else router.push({name:"login"});
					return;
				}
				

				/*
				//Check if all scopes are allowed
				for (let i = 0; i < Config.instance.TWITCH_APP_SCOPES.length; i++) {
					if(StoreProxy.auth.twitch.scopes.indexOf(Config.instance.TWITCH_APP_SCOPES[i]) == -1) {
						console.log("Missing scope:", Config.instance.TWITCH_APP_SCOPES[i]);
						this.authenticated = false;
						this.newScopesToRequest.push(Config.instance.TWITCH_APP_SCOPES[i]);
					}
				}

				//Current token is missing some scopes, redirect to login
				if(this.newScopesToRequest.length > 0) {
					if(cb) cb(false);
					return;
				}
				//*/

				this.authenticated = true;

				//Check if user is part of the donors nor an admin
				try {
					const options = {
						method: "GET",
						headers: {
							"Content-Type": "application/json",
							"Authorization": "Bearer "+this.twitch.access_token,
						},
					}
					
					const userStateRes = await fetch(Config.instance.API_PATH+"/user", options);

					const storeLevel	= parseInt(DataStore.get(DataStore.DONOR_LEVEL))
					const prevLevel		= isNaN(storeLevel)? -1 : storeLevel;
					const userJSON:{
						data:{
							isAdmin:boolean,
							isDonor:boolean,
							level:number,
						}
					} = await userStateRes.json();
					
					this.twitch.user.donor.state	= userJSON.data.isDonor === true;
					this.twitch.user.donor.level	= userJSON.data.level;
					this.twitch.user.donor.upgrade	= userJSON.data.level != prevLevel;
					if(userJSON.data.isAdmin === true) this.twitch.user.is_admin = true;

					//Async loading of followers count to define if user is exempt
					//from ads or not
					TwitchUtils.getFollowerCount(this.twitch.user.id).then(res => {
						this.twitch.user.donor.noAd = res < Config.instance.AD_MIN_FOLLOWERS_COUNT;
					})
				}catch(error) {}
	
				const sMain = StoreProxy.main;
				const sChat = StoreProxy.chat;
				
				//If asked to sync data with server, load them
				if(DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false") {
					if(!await DataStore.loadRemoteData()) {
						//Force data sync popup to show up if remote
						//data have been deleted
						// DataStore.remove(DataStore.SYNC_DATA_TO_SERVER);
						sMain.alert("An error occured while loading your parameters");
						return;
					}
				}else{
					await DataStore.migrateLocalStorage();
				}
				//Parse data from storage
				await sMain.loadDataFromStorage();

				DataStore.set(DataStore.DONOR_LEVEL, this.twitch.user.donor.level);

				MessengerProxy.instance.connect();
				PubSub.instance.connect();
				EventSub.instance.connect();

				//Preload stream info
				TwitchUtils.loadChannelInfo([this.twitch.user.id]).then(v=> {
					const infos = v[0];
					StoreProxy.stream.currentStreamInfo = {
						title:infos.title,
						category:infos.game_name,
						started_at:Date.now(),
						tags:[],
						user:this.twitch.user,
					}
				});

				//Warn the user about the automatic "ad" message sent every 2h
				if(!DataStore.get(DataStore.TWITCHAT_AD_WARNED) && !this.twitch.user.donor.state) {
					setTimeout(()=>{
						if(this.twitch.user.donor.noAd) return;
						sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING);
					}, 5000);
				}else
				//Ask the user if they want to make their donation public
				if(!DataStore.get(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT) && this.twitch.user.donor.state) {
					setTimeout(()=>{
						sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT);
					}, 5000);
				}else
				//Show "right click message" hint
				if(!DataStore.get(DataStore.TWITCHAT_RIGHT_CLICK_HINT_PROMPT)) {
					setTimeout(()=>{
						StoreProxy.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.MESSAGE,(message:TwitchatDataTypes.ChatMessageTypes)=> {
							const m = message as TwitchatDataTypes.MessageChatData;
							const str = StoreProxy.i18n.t("chat.right_click_hint");
							console.log(StoreProxy.i18n.locale);
							m.message = str;
							m.message_html = TwitchUtils.parseEmotes(str, undefined, false, true).replace(/&lt;(\/?mark)&gt;/gi, "<$1>");
							m.user = StoreProxy.users.getUserFrom("twitch", StoreProxy.auth.twitch.user.id, "40203552", "twitchat", "Twitchat");
							m.user.avatarPath = new URL(`/src_front/assets/icons/twitchat_purple.svg`, import.meta.url).href;
							m.user.color = "#bb8eff";
						});
					}, 5000);
				}else{
					//Hot fix to make sure new changelog highlights are displayed properly
					setTimeout(()=> { sChat.sendTwitchatAd(); }, 1000);
				}

				if(cb) cb(true);
				
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
			if(DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false") {
				DataStore.clear();//Remove everything to avoid mixing data if switching with another account
			}
			MessengerProxy.instance.disconnect();
		},
	
		requestTwitchScopes(scopes:TwitchScopesString[]) {
			this.newScopesToRequest = scopes;
		},
	} as IAuthActions
	& ThisType<IAuthActions
		& UnwrapRef<IAuthState>
		& _StoreWithState<"auth", IAuthState, IAuthGetters, IAuthActions>
		& _StoreWithGetters<IAuthGetters>
		& PiniaCustomProperties
	>,
})