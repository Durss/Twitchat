import MessengerProxy from "@/messaging/MessengerProxy";
import TwitchMessengerClient from "@/messaging/TwitchMessengerClient";
import router from "@/router";
import DataStore from "@/store/DataStore";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import PatreonHelper from "@/utils/patreon/PatreonHelper";
import EventSub from "@/utils/twitch/EventSub";
import PubSub from "@/utils/twitch/PubSub";
import { TwitchScopes, type TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from "vue";
import StoreProxy, { type IAuthActions, type IAuthGetters, type IAuthState } from "../StoreProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import SetIntervalWorker from "@/utils/SetIntervalWorker";

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
		twitchModeratedChannels:[] as TwitchDataTypes.ModeratedUser[],
		lastCheer: {},//channelId => infos
		lastFollower: {},//channelId => infos
		lastSubscriber: {},//channelId => infos
		lastSubgifter: {},//channelId => infos
		totalFollowers: {},//channelId => infos
		totalSubscribers: {},//channelId => infos
		partnerPoints: {},//channelId => infos
	} as IAuthState),
	
	
	
	getters: {
		isPremium():boolean { return PatreonHelper.instance.isMember || this.twitch.user.donor.earlyDonor || this.twitch.user.donor.isPremiumDonor; },
		
		isRealPremium():boolean { return PatreonHelper.instance.isMember || this.twitch.user.donor.isPremiumDonor; },

		isDonor():boolean { return this.twitch.user.donor.state || this.isPremium; },
		
		isAdmin():boolean { return this.twitch.user.is_admin === true; },
	},
	
	
	
	actions: {
		async twitch_tokenRefresh(reconnectIRC:boolean, callback?:(success:boolean)=>void) {
			let twitchAuthResult:TwitchDataTypes.AuthTokenResult = JSON.parse(DataStore.get(DataStore.TWITCH_AUTH_TOKEN));
			//Refresh token if it's going to expire within the next 5 minutes
			if(twitchAuthResult && twitchAuthResult.refresh_token) {
				try {
					const res 			= await ApiHelper.call("auth/twitch/refreshtoken", "GET", {token:twitchAuthResult.refresh_token});
					if(res.status != 200) throw("invalid refresh result")
					twitchAuthResult	= res.json;
				}catch(error) {
					if(callback) callback(false);
					return false;
				}
				this.twitch.access_token	= twitchAuthResult.access_token;
				this.twitch.expires_in		= twitchAuthResult.expires_in;
				twitchAuthResult.expires_at	= Date.now() + twitchAuthResult.expires_in * 1000;
				//Store auth data in cookies for later use
				DataStore.set(DataStore.TWITCH_AUTH_TOKEN, twitchAuthResult, false);
				//This is not necessary
				// if(reconnectIRC) {
				// 	TwitchMessengerClient.instance.refreshToken(twitchAuthResult.access_token);
				// }

				const expire	= this.twitch.expires_in;
				let delay		= Math.max(0, expire * 1000 - 60000 * 5);//Refresh 5min before it actually expires
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
			if(callback) callback(false);
			return false;
		},

		async twitch_autenticate(code?:string, cb?:(success:boolean, betaRefused?:boolean)=>void) {
			window.setInitMessage("twitch authentication");

			try {
	
				const storeValue = DataStore.get(DataStore.TWITCH_AUTH_TOKEN);
				let twitchAuthResult:TwitchDataTypes.AuthTokenResult = storeValue? JSON.parse(storeValue) : undefined;
				if(code) {
					//Convert oAuth code to access_token
					const res = await ApiHelper.call("auth/twitch", "GET", {code});
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
							StoreProxy.main.alert("Unable to connect with Twitch API :(.", false, true);
							return;
						}else{
							twitchAuthResult = res;
						}
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
					const res = await ApiHelper.call("beta/user", "GET", {uid:userRes.user_id});
					if(res.status != 200 || res.json.data.beta !== true) {
						if(cb) cb(false, true);
						else router.push({name:"login", params:{betaReason:"true"}});
						return;
					}
				}

				// Load the current user data
				window.setInitMessage("loading Twitch user info");
				const uid = (userRes as TwitchDataTypes.Token).user_id;
				await this.loadUserState(uid);
				if(this.twitch.user.errored === true){
					if(cb) cb(false);
					else router.push({name:"login"});
					return;
				}

				this.authenticated = true;
	
				const sMain = StoreProxy.main;
				const sUsers = StoreProxy.users;
				const sStream = StoreProxy.stream;
				const sRewards = StoreProxy.rewards;
				const sExtension = StoreProxy.extension;

				await PatreonHelper.instance.connect();//Wait for result to make sure a patreon user doesn't get the TWITCHAT_AD_WARNED message
				
				try {
					window.setInitMessage("migrating local parameter data");
					await DataStore.emergencyBackupStorage();
					await DataStore.migrateLocalStorage();

					//If asked to sync data with server, load them
					if(DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false") {
						window.setInitMessage("downloading your parameters");
						if(!await DataStore.loadRemoteData()) {
							//Force data sync popup to show up if remote
							//data have been deleted
							// DataStore.remove(DataStore.SYNC_DATA_TO_SERVER);
							sMain.alert("An error occured when loading your parameters. Please try with another browser.", false, true);
							return;
						}
					}

					//Parse data from storage
					await sMain.loadDataFromStorage();
				}catch(error) {
					sMain.alert("An error occured when loading your parameters. Please try with another browser.", false, true);
					console.log(error);
					return;
				}

				DataStore.set(DataStore.DONOR_LEVEL, this.twitch.user.donor.level);

				MessengerProxy.instance.connect();
				PubSub.instance.connect();
				EventSub.instance.connect();
				sRewards.loadRewards();
				sExtension.init();
				sStream.loadStreamInfo("twitch", this.twitch.user.id);
				sUsers.preloadTwitchModerators(this.twitch.user.id);

				//Loads state of current or incoming ads
				TwitchUtils.getAdSchedule();
				TwitchUtils.loadGlobalBadges();
				StoreProxy.users.loadMyFollowings();
				StoreProxy.users.loadMyFollowers();
				StoreProxy.users.initBlockedUsers();

				//Use an anonymous method to avoid blocking loading while
				//all twitch tags are loading
				try {
					if(StoreProxy.auth.twitch.user.is_affiliate || StoreProxy.auth.twitch.user.is_partner) {
						TwitchUtils.getPolls();
						TwitchUtils.getPredictions();
					}
				}catch(e) {
					//User is probably not an affiliate
				}

				if(TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
					//Refresh followers count and latest follower regularly
					const loadFollowers = async ()=>{
						const res = await TwitchUtils.getLastFollowers(uid);
						this.totalFollowers[uid] = res.total;
						if(res.followers.length > 0) {
							const last = res.followers[0];
							this.lastFollower[uid] = StoreProxy.users.getUserFrom("twitch", uid, last.user_id, last.user_login, last.user_name);
						}
					};
					loadFollowers();
					const id = SetIntervalWorker.instance.create(()=>loadFollowers(), 5 * 60000);
				}

				if(TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) {
					//Refresh latest subscriber regularly
					const loadSubscribers = async ()=>{
						const res = await TwitchUtils.getSubsList(true);
						this.partnerPoints[uid] = res.points;
						this.totalSubscribers[uid] = res.subs;
					};
					loadSubscribers();
					const id = SetIntervalWorker.instance.create(()=>loadSubscribers(), 5 * 60000);
				}

				//Preload moderators of the channel and flag them accordingly
				TwitchUtils.getModerators().then(async res=> {
					res.forEach(u=> {
						const user = StoreProxy.users.getUserFrom("twitch", this.twitch.user.id, u.user_id, u.user_login, u.user_name);
						user.channelInfo[this.twitch.user.id].is_moderator = true;
					})
				});

				//Preload channels we can moderate
				TwitchUtils.getModeratedChannels().then(async res=> {
					this.twitchModeratedChannels = res;
				});
				
				sMain.onAuthenticated();

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

		async loadUserState(uid:string):Promise<void> {
			const user = await new Promise<TwitchatDataTypes.TwitchatUser>(async (resolve)=> {
				await StoreProxy.users.getUserFrom("twitch", uid, uid, undefined, undefined, resolve);
			});
			user.donor = {
				earlyDonor:false,
				level:-1,
				noAd:false,
				state:false,
				upgrade:false,
				isPremiumDonor:false,
			}
			const res = await ApiHelper.call("user");

			const storeLevel	= parseInt(DataStore.get(DataStore.DONOR_LEVEL))
			const prevLevel		= isNaN(storeLevel)? -1 : storeLevel;
			
			this.twitch.user						= user as Required<TwitchatDataTypes.TwitchatUser>;
			this.twitch.user.donor.state			= res.json.data.isDonor === true;
			this.twitch.user.donor.level			= res.json.data.level;
			this.twitch.user.donor.upgrade			= res.json.data.level != prevLevel;
			this.twitch.user.donor.earlyDonor		= res.json.data.isEarlyDonor === true;
			this.twitch.user.donor.isPremiumDonor	= res.json.data.isPremiumDonor === true;
			StoreProxy.discord.discordLinked		= res.json.data.discordLinked === true;
			//Uncomment to force non-premium for debugging
			// if(!Config.instance.IS_PROD) {
			// 	this.twitch.user.donor.earlyDonor = 
			// 	this.twitch.user.donor.isPremiumDonor = false
			// }
			if(res.json.data.isAdmin === true) this.twitch.user.is_admin = true;

			//Async loading of followers count to define if user is exempt
			//from ads or not
			TwitchUtils.getLastFollowers(this.twitch.user.id).then(res => {
				this.twitch.user.donor.noAd = res.total < Config.instance.AD_MIN_FOLLOWERS_COUNT;
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