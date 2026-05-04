import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import MessengerProxy from "@/messaging/MessengerProxy";
import router from "@/router";
import DataStore from "@/store/DataStore";
import Database from "@/store/Database";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import SetIntervalWorker from "@/utils/SetIntervalWorker";
import EventSub from "@/utils/twitch/EventSub";
import { TwitchScopes, type TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { acceptHMRUpdate, defineStore } from "pinia";
import StoreProxy, { type IAuthActions, type IAuthGetters, type IAuthState } from "../StoreProxy";
import * as Sentry from "@sentry/vue";
import SSEHelper from "@/utils/SSEHelper";

let refreshTokenTO: number = -1;

export const storeAuth = defineStore("auth", {
	state: (): IAuthState => ({
		authenticated: false,
		dataSharingUserList: [],
		newScopesToRequest: [],
		twitchat: null,
		twitch: {} as IAuthState["twitch"],
		youtube: null,
		tiktok: null,
		facebook: null,
		instagram: null,
		kick: null,
		bluesky: null,
		twitchModeratedChannels: [],
		donorLevel: -1,
		premiumType: "",
		noAd: false,
		donorLevelUpgrade: false,
		lifetimePremiumPercent: 0,
		featureFlags: [],
	}),

	getters: {
		isAdmin(): boolean {
			return this.twitch.user.is_admin === true;
		},
		isPremium(): boolean {
			return this.premiumType != "";
		},
	} satisfies StoreGetters<IAuthGetters, IAuthState>,

	actions: {
		async twitch_tokenRefresh(callback?: (success: boolean) => void) {
			let twitchAuthResult: TwitchDataTypes.AuthTokenResult = JSON.parse(
				DataStore.get(DataStore.TWITCH_AUTH_TOKEN),
			);
			//Refresh token if it's going to expire within the next 5 minutes
			if (twitchAuthResult && twitchAuthResult.refresh_token) {
				try {
					const res = await ApiHelper.call("auth/twitch/refreshtoken", "GET", {
						token: twitchAuthResult.refresh_token,
					});
					if (res.status != 200) throw "invalid refresh result";
					twitchAuthResult = res.json;
				} catch (_error) {
					if (callback) callback(false);
					return false;
				}
				this.twitch.access_token = twitchAuthResult.access_token;
				this.twitch.expires_in = twitchAuthResult.expires_in;
				twitchAuthResult.expires_at = Date.now() + twitchAuthResult.expires_in * 1000;
				this.twitch.scopes = twitchAuthResult.scope || [];
				ApiHelper.accessToken = this.twitch.access_token;
				ApiHelper.refreshTokenCallback = () => this.twitch_tokenRefresh();
				TwitchUtils.updateAuthInfo(
					this.twitch.access_token,
					this.twitch.scopes,
					(scopes: TwitchScopesString[]) => this.requestTwitchScopes(scopes),
					() => this.twitch_tokenRefresh(),
				);

				//Store auth data in cookies for later use
				DataStore.set(DataStore.TWITCH_AUTH_TOKEN, twitchAuthResult, false);

				const expire = this.twitch.expires_in;
				let delay = Math.max(0, expire * 1000 - 60000 * 5); //Refresh 5min before it actually expires
				delay = Math.min(delay, 1000 * 60 * 60 * 3); //Refresh at least every 3h
				if (isNaN(delay)) {
					//fail safe.
					//Refresh in 1 minute if something failed when refreshing
					delay = 60 * 1000;
				}

				clearTimeout(refreshTokenTO);
				refreshTokenTO = window.setTimeout(() => {
					void this.twitch_tokenRefresh();
				}, delay);
				if (callback) callback(true);
				return twitchAuthResult;
			}
			if (callback) callback(false);
			return false;
		},

		async twitch_autenticate(
			code?: string,
			cb?: (success: boolean, betaRefused?: boolean) => void,
		) {
			window.setInitMessage("twitch authentication");

			try {
				const storeValue = DataStore.get(DataStore.TWITCH_AUTH_TOKEN);
				let twitchAuthResult: TwitchDataTypes.AuthTokenResult = storeValue
					? JSON.parse(storeValue)
					: undefined;
				if (code) {
					//Convert oAuth code to access_token
					const res = await ApiHelper.call("auth/twitch", "GET", { code });
					twitchAuthResult = res.json;
					twitchAuthResult.expires_at = Date.now() + twitchAuthResult.expires_in * 1000;
					DataStore.set(DataStore.TWITCH_AUTH_TOKEN, twitchAuthResult, false);
					clearTimeout(refreshTokenTO);
					//Schedule refresh
					refreshTokenTO = window.setTimeout(
						() => {
							void this.twitch_tokenRefresh();
						},
						twitchAuthResult.expires_in * 1000 - 60000 * 5,
					);
				} else {
					//OAuth process already done, just request a fresh new token if it's
					//gonna expire in less than 5 minutes
					// if(twitchAuthResult && twitchAuthResult.expires_at < Date.now() - 60000*5) {
					const res = await this.twitch_tokenRefresh();
					if (!res) {
						StoreProxy.common.alert(
							"Unable to connect with Twitch API :(.",
							false,
							true,
						);
						if (cb) cb(false, false);
						else router.push({ name: "login", params: { betaReason: "false" } });
						return;
					} else {
						twitchAuthResult = res;
					}
					// }
				}
				if (!twitchAuthResult) {
					console.log("No JSON :(", twitchAuthResult);
					if (cb) cb(false);
					return;
				}
				//Validate access token
				let userRes: TwitchDataTypes.Token | TwitchDataTypes.Error | undefined;
				try {
					window.setInitMessage("validating Twitch auth token");
					userRes = await TwitchUtils.validateToken(twitchAuthResult.access_token);
				} catch (_error) {
					/*ignore*/
				}

				if (
					!userRes ||
					(isNaN((userRes as TwitchDataTypes.Token).expires_in) &&
						(userRes as TwitchDataTypes.Error).status != 200)
				)
					throw "invalid token";

				userRes = userRes as TwitchDataTypes.Token; //Just forcing typing for the rest of the code
				this.twitch.client_id = userRes.client_id;
				this.twitch.access_token = twitchAuthResult.access_token;
				this.twitch.scopes = (userRes as TwitchDataTypes.Token).scopes || [];
				this.twitch.expires_in = userRes.expires_in;
				ApiHelper.accessToken = this.twitch.access_token;
				ApiHelper.refreshTokenCallback = () => this.twitch_tokenRefresh();
				TwitchUtils.updateAuthInfo(
					this.twitch.access_token,
					this.twitch.scopes,
					(scopes: TwitchScopesString[]) => this.requestTwitchScopes(scopes),
					() => this.twitch_tokenRefresh(),
					userRes.user_id,
				);

				if (Config.instance.BETA_MODE) {
					window.setInitMessage("checking beta access permissions");
					const res = await ApiHelper.call("beta/user", "GET");
					if (res.status != 200 || res.json.data.beta !== true) {
						console.log("Beta refused", res.json);
						if (cb) cb(false, true);
						else router.push({ name: "login", params: { betaReason: "true" } });
						return;
					}
				}

				if (!TwitchUtils.hasScopes(Config.instance.MANDATORY_TWITCH_SCOPES)) {
					if (cb) cb(false, false);
					else router.push({ name: "login", params: { betaReason: "false" } });
					return;
				}

				// Load the current user data
				window.setInitMessage("loading Twitch user info");
				const uid = (userRes as TwitchDataTypes.Token).user_id;
				await this.loadUserState(uid);
				if (this.twitch.user.errored === true) {
					if (cb) cb(false);
					else router.push({ name: "login" });
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
					if (DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false") {
						window.setInitMessage("downloading your parameters");
						if (!(await DataStore.loadRemoteData())) {
							//Force data sync popup to show up if remote
							//data have been deleted
							// DataStore.remove(DataStore.SYNC_DATA_TO_SERVER);
							StoreProxy.common.alert(
								"An error occured when loading your parameters. Please try with another browser.",
								true,
								true,
							);
							return;
						}
					}

					//Parse data from storage
					sMain.loadDataFromStorage();
				} catch (error) {
					StoreProxy.common.alert(
						"An error occured when loading your parameters. Please try with another browser.",
						true,
						true,
					);
					console.log(error);
					return;
				}

				DataStore.set(DataStore.DONOR_LEVEL, this.donorLevel);

				//Preload channels we're a moderator of
				const moderatedChans = await TwitchUtils.getModeratedChannels();
				this.twitchModeratedChannels = moderatedChans;
				moderatedChans.forEach((chan) => {
					if (!this.twitch.user.channelInfo[chan.broadcaster_id]) {
						this.twitch.user.channelInfo[chan.broadcaster_id] = {
							badges: [],
							following_date_ms: 0,
							is_banned: false,
							is_broadcaster: false,
							is_following: null,
							is_gifter: false,
							is_new: false,
							is_raider: false,
							is_subscriber: false,
							is_vip: false,
							online: false,
							is_moderator: true,
						};
					} else {
						this.twitch.user.channelInfo[chan.broadcaster_id]!.is_moderator = true;
					}
				});

				void MessengerProxy.instance.connect();
				void EventSub.instance.connect();
				void sRewards.loadRewards();
				sExtension.init();
				void sStream.loadStreamInfo("twitch", this.twitch.user.id);

				//Loads state of current or incoming ads
				void TwitchUtils.getAdSchedule();
				void TwitchUtils.loadGlobalBadges();
				void Database.instance.loadEmojiShortcodes();
				void sUsers.loadMyFollowings();
				void sUsers.loadMyFollowers();
				void sUsers.loadMyVIPs();
				void sUsers.initBlockedUsers();
				void sUsers.loadMyModerators();
				void sUsers.loadMySubscribers();
				StoreProxy.stream.currentChatChannel = {
					id: userRes.user_id,
					name: userRes.login,
					platform: "twitch",
				};

				if (StoreProxy.auth.twitch.user.is_affiliate) {
					void TwitchUtils.getPolls();
					void TwitchUtils.getPredictions();
				}

				if (TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
					//Refresh followers count and latest follower regularly
					const loadFollowers = async () => {
						const res = await TwitchUtils.getFollowers(uid);
						if (res.list.length > 0) {
							const last = res.list[0]!;
							sUsers.getUserFrom(
								"twitch",
								uid,
								last.user_id,
								last.user_login,
								last.user_name,
								(user) => {
									StoreProxy.labels.updateLabelValue("FOLLOWER_ID", user.id);
									StoreProxy.labels.updateLabelValue(
										"FOLLOWER_NAME",
										user.displayNameOriginal,
									);
									StoreProxy.labels.updateLabelValue(
										"FOLLOWER_AVATAR",
										user.avatarPath || "",
										user.id,
									);
								},
							);
						}
						StoreProxy.labels.updateLabelValue("FOLLOWER_COUNT", res.total);
					};
					void loadFollowers();
					SetIntervalWorker.instance.create(() => loadFollowers(), 5 * 60000);
				}

				if (TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) {
					//Refresh latest subscriber and sub count regularly
					SetIntervalWorker.instance.create(
						() => sUsers.loadMySubscribers(true),
						5 * 60000,
					);
				}

				//Refresh viewer count regularly
				const loadViewerCount = async () => {
					const [res] = await TwitchUtils.getCurrentStreamInfo([this.twitch.user.id]);
					if (res) {
						StoreProxy.labels.updateLabelValue("VIEWER_COUNT_TWITCH", res.viewer_count);
						StoreProxy.stream.setPlaybackState(this.twitch.user.id, res.viewer_count);
					}
				};
				void loadViewerCount();
				SetIntervalWorker.instance.create(() => loadViewerCount(), 60000);

				// Listen for feature flags updates
				SSEHelper.instance.addEventListener("FEATURE_FLAGS_UPDATE", (event) => {
					if (event.data) {
						this.featureFlags = event.data;
					}
				});

				sMain.onAuthenticated();

				if (cb) cb(true);
			} catch (error) {
				console.log(error);
				this.authenticated = false;
				DataStore.remove("oAuthToken");
				StoreProxy.common.alert("Authentication failed");
				if (cb) cb(false);
				router.push({ name: "login" }); //Redirect to login if connection failed
			}
		},

		logout() {
			this.authenticated = false;
			if (DataStore.get(DataStore.SYNC_DATA_TO_SERVER) !== "false") {
				DataStore.clear(); //Remove everything to avoid mixing data if switching with another account
			}
			MessengerProxy.instance.disconnect();
		},

		requestTwitchScopes(scopes: TwitchScopesString[]) {
			this.newScopesToRequest = scopes;
		},

		async loadUserState(uid: string): Promise<void> {
			const user = await new Promise<TwitchatDataTypes.TwitchatUser>((resolve) => {
				StoreProxy.users.getUserFrom("twitch", uid, uid, undefined, undefined, resolve);
			});
			const res = await ApiHelper.call("user", "GET");
			const storeLevel = parseInt(DataStore.get(DataStore.DONOR_LEVEL));
			const prevLevel = isNaN(storeLevel) ? -1 : storeLevel;

			// Log user info to Sentry in case I need to reach them to solve an issue
			Sentry.setUser({ id: user.id, username: user.displayName });

			this.twitch.user = user;
			this.donorLevel = res.json.data.donorLevel;
			this.donorLevelUpgrade = this.donorLevel > prevLevel;
			this.premiumType = res.json.data.premiumType;
			this.lifetimePremiumPercent = res.json.data.lifetimePercent || 0;
			this.dataSharingUserList = res.json.data.dataSharing || [];
			this.featureFlags = res.json.data.features || [];
			StoreProxy.discord.discordLinked = res.json.data.discordLinked === true;
			StoreProxy.api.connected = res.json.data.has_api_key === true;
			if (res.json.data.patreonLinked) void StoreProxy.patreon.loadMemberState();
			this.twitch.user.channelInfo[user.id]!.following_date_ms = user.created_at_ms || 0;
			//Uncomment to force non-premium for debugging
			// if(!Config.instance.IS_PROD) {
			// 	this.twitch.user.donor.earlyDonor =
			// 	this.twitch.user.donor.isPremiumDonor = false
			// }
			if (res.json.data.isAdmin === true) this.twitch.user.is_admin = true;

			//Async loading of followers count to define if user is exempt
			//from ads or not
			const followers = await TwitchUtils.getFollowersCount([this.twitch.user.id]);
			this.noAd = followers[this.twitch.user.id]! < Config.instance.AD_MIN_FOLLOWERS_COUNT;
			StoreProxy.labels.updateLabelValue("FOLLOWER_COUNT", followers[this.twitch.user.id]!);
		},

		async twitch_updateAuthScopes(code: string): Promise<boolean> {
			if (!code) {
				StoreProxy.common.alert(StoreProxy.i18n.t("login.auth_failed"));
				return false;
			}
			if (code) {
				//Convert oAuth code to access_token
				try {
					const res = await ApiHelper.call("auth/twitch", "GET", { code });
					if (res.status != 200) throw "invalid auth result";
					if (!res.json || !res.json.access_token) throw "invalid auth result";

					const twitchAuthResult = res.json;
					twitchAuthResult.expires_at = Date.now() + twitchAuthResult.expires_in * 1000;
					DataStore.set(DataStore.TWITCH_AUTH_TOKEN, twitchAuthResult, false);
					clearTimeout(refreshTokenTO);
					//Schedule refresh
					refreshTokenTO = window.setTimeout(
						() => {
							void this.twitch_tokenRefresh();
						},
						twitchAuthResult.expires_in * 1000 - 60000 * 5,
					);
					void EventSub.instance.connect();

					this.twitch.access_token = twitchAuthResult.access_token;
					this.twitch.scopes = twitchAuthResult.scope;
					this.twitch.expires_in = twitchAuthResult.expires_in;
					ApiHelper.accessToken = this.twitch.access_token;
					ApiHelper.refreshTokenCallback = () => this.twitch_tokenRefresh();
					TwitchUtils.updateAuthInfo(
						this.twitch.access_token,
						this.twitch.scopes,
						(scopes: TwitchScopesString[]) => this.requestTwitchScopes(scopes),
						() => this.twitch_tokenRefresh(),
						this.twitch.user.id,
					);
					void TwitchUtils.loadEmoteSets(this.twitch.user.id);
					void TwitchUtils.getModeratedChannels().then(async (moderatedChans) => {
						this.twitchModeratedChannels = moderatedChans;
					});
					return true;
				} catch (_error) {
					StoreProxy.common.alert(StoreProxy.i18n.t("login.auth_failed"));
					return false;
				}
			}
			return false;
		},
	} satisfies StoreActions<"auth", IAuthState, IAuthGetters, IAuthActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAuth, import.meta.hot));
}
