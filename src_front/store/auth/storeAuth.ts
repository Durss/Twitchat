import MessengerProxy from "@/messaging/MessengerProxy";
import TwitchMessengerClient from "@/messaging/TwitchMessengerClient";
import router from "@/router";
import DataStore from "@/store/DataStore";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiController from "@/utils/ApiController";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import PatreonHelper from "@/utils/patreon/PatreonHelper";
import EventSub from "@/utils/twitch/EventSub";
import PubSub from "@/utils/twitch/PubSub";
import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
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
		
		// isPremium():boolean { return false; },
		isPremium():boolean { return PatreonHelper.instance.isMember || this.twitch.user.donor.earlyDonor; },

	},
	
	
	
	actions: {
		async twitch_tokenRefresh(reconnectIRC:boolean, callback?:(success:boolean)=>void) {
			let twitchAuthResult:TwitchDataTypes.AuthTokenResult = JSON.parse(DataStore.get(DataStore.TWITCH_AUTH_TOKEN));
			//Refresh token if it's going to expire within the next 5 minutes
			if(twitchAuthResult) {
				try {
					const res 			= await ApiController.call("auth/twitch/refreshtoken", "GET", {token:twitchAuthResult.refresh_token});
					twitchAuthResult	= res.json;
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
			return;
		},

		async twitch_autenticate(code?:string, cb?:(success:boolean, betaRefused?:boolean)=>void) {
			window.setInitMessage("Twitch authentication");

			try {
	
				const storeValue = DataStore.get(DataStore.TWITCH_AUTH_TOKEN);
				let twitchAuthResult:TwitchDataTypes.AuthTokenResult = storeValue? JSON.parse(storeValue) : undefined;
				if(code) {
					//Convert oAuth code to access_token
					const res = await ApiController.call("auth/twitch", "GET", {code});
					twitchAuthResult = res.json;
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
					window.setInitMessage("validating Twitch auth token");
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
					window.setInitMessage("checking beta access permissions");
					const res = await ApiController.call("beta/user", "GET", {uid:userRes.user_id});
					if(res.status != 200 || res.json.data.beta !== true) {
						if(cb) cb(false, true);
						else router.push({name:"login", params:{betaReason:"true"}});
						return;
					}
				}

				// Load the current user data
				window.setInitMessage("loading Twitch user info");
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

				this.authenticated = true;

				//Check if user is part of the donors nor an admin
				try {
					window.setInitMessage("loading Twitchat user info");
					await this.loadUserState();
				}catch(error) {}
	
				const sMain = StoreProxy.main;
				const sChat = StoreProxy.chat;
				const sRewards = StoreProxy.rewards;
				
				try {
					window.setInitMessage("migrate local user data");
					await DataStore.migrateLocalStorage();

					//If asked to sync data with server, load them
					if(DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false") {
						window.setInitMessage("download remote user data");
						if(!await DataStore.loadRemoteData()) {
							//Force data sync popup to show up if remote
							//data have been deleted
							// DataStore.remove(DataStore.SYNC_DATA_TO_SERVER);
							sMain.alert("An error occured while loading your parameters");
							return;
						}
					}

					//Parse data from storage
					await sMain.loadDataFromStorage();
				}catch(error) {
					sMain.alert("An error occured when loading your parameters. Please try with another browser. Contact me on Twitch @durss.");
					console.log(error);
				}

				DataStore.set(DataStore.DONOR_LEVEL, this.twitch.user.donor.level);

				MessengerProxy.instance.connect();
				PubSub.instance.connect();
				EventSub.instance.connect();
				await PatreonHelper.instance.connect();//Wait for result to make sure a patreon user doesn't get the TWITCHAT_AD_WARNED message
				sRewards.loadRewards();

				//Preload stream info
				TwitchUtils.loadCurrentStreamInfo([this.twitch.user.id]).then(async v=> {
					let title = "";
					let category = "";
					let started_at = 0;
					let tags:string[] = [];
					let viewers = 0;
					let live = false;
					if(v.length == 0){
						let [info] = await TwitchUtils.loadChannelInfo([this.twitch.user.id])
						title		= info.title;
						tags		= info.tags;
						category	= info.game_name;
					}else{
						live		= true;
						title		= v[0].title;
						tags		= v[0].tags;
						category	= v[0].game_name;
						viewers		= v[0].viewer_count;
						started_at	= new Date(v[0].started_at).getTime();

					}
					StoreProxy.stream.currentStreamInfo[this.twitch.user.id] = {
						title,
						category,
						started_at,
						tags,
						live,
						viewers,
						user:this.twitch.user,
						lastSoDoneDate:0,
					};
				});

				//Preload moderators of the channel and flag them accordingly
				TwitchUtils.getModerators(this.twitch.user.id).then(async res=> {
					res.forEach(u=> {
						const user = StoreProxy.users.getUserFrom("twitch", this.twitch.user.id, u.user_id, u.user_login, u.user_name);
						user.channelInfo[this.twitch.user.id].is_moderator = true;
					})
				});

				//Warn the user about the automatic "ad" message sent every 2h
				if(!DataStore.get(DataStore.TWITCHAT_AD_WARNED) && !this.isPremium) {
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
						sChat.sendRightClickHint();
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
				StoreProxy.main.alert("Authentication failed");
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

		async loadUserState():Promise<void> {
			const res = await ApiController.call("user");

			const storeLevel	= parseInt(DataStore.get(DataStore.DONOR_LEVEL))
			const prevLevel		= isNaN(storeLevel)? -1 : storeLevel;
			
			this.twitch.user.donor.state		= res.json.data.isDonor === true;
			this.twitch.user.donor.level		= res.json.data.level;
			this.twitch.user.donor.upgrade		= res.json.data.level != prevLevel;
			this.twitch.user.donor.earlyDonor	= res.json.data.isEarlyDonor === true;
			if(res.json.data.isAdmin === true) this.twitch.user.is_admin = true;

			//Async loading of followers count to define if user is exempt
			//from ads or not
			TwitchUtils.getFollowerCount(this.twitch.user.id).then(res => {
				this.twitch.user.donor.noAd = res < Config.instance.AD_MIN_FOLLOWERS_COUNT;
			})
		}
	} as IAuthActions
	& ThisType<IAuthActions
		& UnwrapRef<IAuthState>
		& _StoreWithState<"auth", IAuthState, IAuthGetters, IAuthActions>
		& _StoreWithGetters<IAuthGetters>
		& PiniaCustomProperties
	>,
})