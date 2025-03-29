import MessengerProxy from "@/messaging/MessengerProxy";
import router from "@/router";
import DataStore from "@/store/DataStore";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import SetIntervalWorker from "@/utils/SetIntervalWorker";
import EventSub from "@/utils/twitch/EventSub";
import { TwitchScopes, type TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from "vue";
import StoreProxy, { type IAuthActions, type IAuthGetters, type IAuthState } from "../StoreProxy";

let refreshTokenTO:number = -1;

export const storeAuth = defineStore('auth', {
	state: () => ({
		authenticated: false,
		dataSharingUserList: [] as string[],
		newScopesToRequest: [] as TwitchScopesString[],
		twitchat:{},
		twitch:{},
		youtube:{},
		tiktok:{},
		facebook:{},
		instagram:{},
		twitchModeratedChannels:[] as TwitchDataTypes.ModeratedUser[],
		donorLevel:-1,
		premiumType:"",
		noAd:false,
		donorLevelUpgrade:false,
		lifetimePremiumPercent:0,
	} as IAuthState),



	getters: {
		isAdmin():boolean { return this.twitch.user.is_admin === true; },
		isPremium():boolean { return this.premiumType != ""; },
	},



	actions: {
		async twitch_tokenRefresh(callback?:(success:boolean)=>void) {
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
				this.twitch.access_token		= twitchAuthResult.access_token;
				this.twitch.expires_in			= twitchAuthResult.expires_in;
				twitchAuthResult.expires_at		= Date.now() + twitchAuthResult.expires_in * 1000;
				this.twitch.scopes				= twitchAuthResult.scope || [];
				ApiHelper.accessToken			= this.twitch.access_token;
				ApiHelper.refreshTokenCallback	= this.twitch_tokenRefresh;
				TwitchUtils.updateAuthInfo(this.twitch.access_token, this.twitch.scopes, this.requestTwitchScopes, this.twitch_tokenRefresh);

				//Store auth data in cookies for later use
				DataStore.set(DataStore.TWITCH_AUTH_TOKEN, twitchAuthResult, false);

				const expire	= this.twitch.expires_in;
				let delay		= Math.max(0, expire * 1000 - 60000 * 5);//Refresh 5min before it actually expires
				delay			= Math.min(delay, 1000 * 60 * 60 * 3);//Refresh at least every 3h
				if(isNaN(delay)) {
					//fail safe.
					//Refresh in 1 minute if something failed when refreshing
					delay = 60*1000;
				}

				clearTimeout(refreshTokenTO);
				refreshTokenTO = window.setTimeout(()=>{
					this.twitch_tokenRefresh();
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
					refreshTokenTO = window.setTimeout(()=>{
						this.twitch_tokenRefresh();
					}, twitchAuthResult.expires_in*1000 - 60000 * 5);
				}else {
					//OAuth process already done, just request a fresh new token if it's
					//gonna expire in less than 5 minutes
					// if(twitchAuthResult && twitchAuthResult.expires_at < Date.now() - 60000*5) {
						const res = await this.twitch_tokenRefresh();
						if(!res) {
							StoreProxy.common.alert("Unable to connect with Twitch API :(.", false, true);
							if(cb) cb(false, false);
							else router.push({name:"login", params:{betaReason:"false"}});
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

				userRes							= userRes as TwitchDataTypes.Token;//Just forcing typing for the rest of the code
				this.twitch.client_id			= userRes.client_id;
				this.twitch.access_token		= twitchAuthResult.access_token;
				this.twitch.scopes				= (userRes as TwitchDataTypes.Token).scopes || [];
				this.twitch.expires_in			= userRes.expires_in;
				ApiHelper.accessToken			= this.twitch.access_token;
				ApiHelper.refreshTokenCallback	= this.twitch_tokenRefresh;
				TwitchUtils.updateAuthInfo(this.twitch.access_token, this.twitch.scopes, this.requestTwitchScopes, this.twitch_tokenRefresh, userRes.user_id);

				if(Config.instance.BETA_MODE) {
					window.setInitMessage("checking beta access permissions");
					const res = await ApiHelper.call("beta/user", "GET", {uid:userRes.user_id});
					if(res.status != 200 || res.json.data.beta !== true) {
						console.log("Beta refused", res.json);
						if(cb) cb(false, true);
						else router.push({name:"login", params:{betaReason:"true"}});
						return;
					}
				}

				if(!TwitchUtils.hasScopes(Config.instance.MANDATORY_TWITCH_SCOPES)) {
					if(cb) cb(false, false);
					else router.push({name:"login", params:{betaReason:"false"}});
					return;
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
							StoreProxy.common.alert("An error occured when loading your parameters. Please try with another browser.", false, true);
							return;
						}
					}

					//Parse data from storage
					await sMain.loadDataFromStorage();
				}catch(error) {
					StoreProxy.common.alert("An error occured when loading your parameters. Please try with another browser.", false, true);
					console.log(error);
					return;
				}

				DataStore.set(DataStore.DONOR_LEVEL, this.donorLevel);

				//Preload channels we're a moderator of
				const moderatedChans = await TwitchUtils.getModeratedChannels()
				this.twitchModeratedChannels = moderatedChans;
				moderatedChans.forEach(chan => {
					if(!this.twitch.user.channelInfo[chan.broadcaster_id]) {
						this.twitch.user.channelInfo[chan.broadcaster_id] = {
							badges:[],
							following_date_ms: 0,
							is_banned:false,
							is_broadcaster:false,
							is_following:null,
							is_gifter:false,
							is_new:false,
							is_raider:false,
							is_subscriber:false,
							is_vip:false,
							online:false,
							is_moderator:true,
						}
					}else{
						this.twitch.user.channelInfo[chan.broadcaster_id].is_moderator = true;
					}
				});

				MessengerProxy.instance.connect();
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
				StoreProxy.stream.currentChatChannel = {
					id:userRes.user_id,
					name:userRes.login,
					platform:"twitch",
				}

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
						if(res.followers.length > 0) {
							const last = res.followers[0];
							StoreProxy.users.getUserFrom("twitch", uid, last.user_id, last.user_login, last.user_name, (user)=>{
								StoreProxy.labels.updateLabelValue("FOLLOWER_ID", user.id);
								StoreProxy.labels.updateLabelValue("FOLLOWER_NAME", user.displayNameOriginal);
								StoreProxy.labels.updateLabelValue("FOLLOWER_AVATAR", user.avatarPath || "", user.id);
							});
							StoreProxy.labels.updateLabelValue("FOLLOWER_COUNT", res.total);
						}
					};
					loadFollowers();
					SetIntervalWorker.instance.create(()=>loadFollowers(), 5 * 60000);
				}

				if(TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) {
					//Refresh latest subscriber regularly
					const loadSubscribers = async ()=>{
						const res = await TwitchUtils.getSubsList(true);
						StoreProxy.labels.updateLabelValue("SUB_COUNT", res.subs);
						StoreProxy.labels.updateLabelValue("SUB_POINTS", res.points);
						StoreProxy.donationGoals.onSourceValueUpdate("twitch_subs");
					};
					loadSubscribers();
					SetIntervalWorker.instance.create(()=>loadSubscribers(), 5 * 60000);
				}

				//Refresh viewer count regularly
				const loadViewerCount = async ()=>{
					const [res] = await TwitchUtils.getCurrentStreamInfo([this.twitch.user.id]);
					if(res) {
						StoreProxy.labels.updateLabelValue("VIEWER_COUNT", res.viewer_count);
						StoreProxy.stream.setPlaybackState(this.twitch.user.id, res.viewer_count);
					}
				};
				loadViewerCount();
				SetIntervalWorker.instance.create(()=>loadViewerCount(), 30000);

				//Preload moderators of the channel and flag them accordingly
				TwitchUtils.getModerators().then(async res=> {
					res.forEach(u=> {
						const user = StoreProxy.users.getUserFrom("twitch", this.twitch.user.id, u.user_id, u.user_login, u.user_name);
						user.channelInfo[this.twitch.user.id].is_moderator = true;
					})
				});

				//Preload moderators of the channel and flag them accordingly
				TwitchUtils.getVIPs().then(async res=> {
					res.forEach(u=> {
						const user = StoreProxy.users.getUserFrom("twitch", this.twitch.user.id, u.user_id, u.user_login, u.user_name);
						user.channelInfo[this.twitch.user.id].is_vip = true;
					})
				});

				sMain.onAuthenticated();

				if(cb) cb(true);

			}catch(error) {
				console.log(error);
				this.authenticated = false;
				DataStore.remove("oAuthToken");
				StoreProxy.common.alert("Authentication failed");
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
			const res			= await ApiHelper.call("user", "GET");
			const storeLevel	= parseInt(DataStore.get(DataStore.DONOR_LEVEL))
			const prevLevel		= isNaN(storeLevel)? -1 : storeLevel;

			this.twitch.user				= user as Required<TwitchatDataTypes.TwitchatUser>;
			this.donorLevel					= res.json.data.donorLevel;
			this.donorLevelUpgrade			= this.donorLevel > prevLevel;
			this.premiumType				= res.json.data.premiumType;
			this.lifetimePremiumPercent		= res.json.data.lifetimePercent || 0;
			this.dataSharingUserList		= res.json.data.dataSharing || [];
			StoreProxy.discord.discordLinked= res.json.data.discordLinked === true;
			if(res.json.data.patreonLinked) StoreProxy.patreon.loadMemberState();
			this.twitch.user.channelInfo[user.id].following_date_ms = user.created_at_ms || 0;
			//Uncomment to force non-premium for debugging
			// if(!Config.instance.IS_PROD) {
			// 	this.twitch.user.donor.earlyDonor =
			// 	this.twitch.user.donor.isPremiumDonor = false
			// }
			if(res.json.data.isAdmin === true) this.twitch.user.is_admin = true;

			//Async loading of followers count to define if user is exempt
			//from ads or not
			const followers	= await TwitchUtils.getFollowersCount([this.twitch.user.id]);
			this.noAd		= followers[this.twitch.user.id] < Config.instance.AD_MIN_FOLLOWERS_COUNT;
			StoreProxy.labels.updateLabelValue("FOLLOWER_COUNT", followers[this.twitch.user.id]);
		}
	} as IAuthActions
	& ThisType<IAuthActions
		& UnwrapRef<IAuthState>
		& _StoreWithState<"auth", IAuthState, IAuthGetters, IAuthActions>
		& _StoreWithGetters<IAuthGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAuth, import.meta.hot))
}
