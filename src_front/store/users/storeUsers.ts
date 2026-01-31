import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import MessengerProxy from '@/messaging/MessengerProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import Utils from '@/utils/Utils';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { reactive, type UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IUsersActions, IUsersGetters, IUsersState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import ApiHelper from '@/utils/ApiHelper';
import EventSub from '@/utils/twitch/EventSub';
import { setTriggerEventPlaceholderValues, TriggerTypes, USER_CUSTOM_BADGES } from '@/types/TriggerActionDataTypes';

interface BatchItem {
	channelId?:string;
	user:TwitchatDataTypes.TwitchatUser
	cb?:(user:TwitchatDataTypes.TwitchatUser) => void;
}

//Don't store this as a state prop.
//Having this list reactive kills performances while being
//unnecessary
const userList:TwitchatDataTypes.TwitchatUser[] = [];
//FIXME few duplicates happen in the userlist

//TODO make massive refactoring on user ban/block logic. There are ban/block calls everywhere on the app intead of here.

const unbanFlagTimeouts:{[key:string]:number} = {};
const userMaps:Partial<{[key in TwitchatDataTypes.ChatPlatform]:{
	idToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
	loginToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
	displayNameToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
}}> = {};

const twitchUserBatchLoginToLoad:BatchItem[] = [];
const twitchUserBatchIdToLoad:{channelId?:string, user:TwitchatDataTypes.TwitchatUser, cb?:(user:TwitchatDataTypes.TwitchatUser) => void}[] = [];
const moderatorsCache:{[key:string]:{[key:string]:true}} = {};
let twitchUserBatchLoginTimeout = -1;
let twitchUserBatchIdTimeout = -1;

export const storeUsers = defineStore('users', {
	state: () => ({
		tmpDisplayName:"…loading…",
		pendingShoutouts: {},
		userCard: null,
		customUsernames: {},
		customUserBadges: {},
		customBadgeList:[],
		myMods: {
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
			kick:{},
		},
		myVIPs: {
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
			kick:{},
		},
		blockedUsers: {
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
			kick:{},
		},
		myFollowings:{
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
			kick:{},
		},
		myFollowers:{
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
			kick:{},
		},
		knownBots: {
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
			kick:{},
		}
	} as IUsersState),



	getters: {
		users():TwitchatDataTypes.TwitchatUser[] { return userList; },
	},



	actions: {
		populateData():void {
			//Init custom user display names
			const customUsernamesParams = DataStore.get(DataStore.CUSTOM_USERNAMES);
			if(customUsernamesParams) {
				this.customUsernames = JSON.parse(customUsernamesParams);
			}

			//Init custom user badges links (associations between user IDs and badge indices)
			const customUserbadgesParams = DataStore.get(DataStore.CUSTOM_USER_BADGES);
			if(customUserbadgesParams) {
				this.customUserBadges = JSON.parse(customUserbadgesParams);
			}

			//Init custom user badge list
			const customBadgeListParams = DataStore.get(DataStore.CUSTOM_BADGE_LIST);
			if(customBadgeListParams) {
				this.customBadgeList = JSON.parse(customBadgeListParams);
				this.setTriggerPlaceholders();
			}
		},
		/**
		 * Registers the bots hashmap of a platform
		 * Maps a lowercased login to a boolean (true)
		 */
		setBotsMap(platform:TwitchatDataTypes.ChatPlatform, hashmap:{[key:string]:boolean}):void {
			this.knownBots[platform] = hashmap;
		},

		/**
		 * Registers the bots hashmap of a platform
		 */
		isAFollower(platform:TwitchatDataTypes.ChatPlatform, id:string):boolean {
			return  this.myFollowers[platform][id] != undefined;
		},

		/**
		 * Preloads twitch moderators
		 */
		async preloadTwitchModerators(channelId:string):Promise<void> {
			const users = await TwitchUtils.getModerators();
			moderatorsCache[channelId] = {};
			users.forEach(v => {
				moderatorsCache[channelId]![v.user_id] = true;
			});
		},

		/**
		 * Gets a user by their source from their ID nor login.
		 * It registers the user on the local DB to get them back later.
		 * If only the login is given, the user's data are loaded asynchronously from
		 * remote API then added to the local DB while returning a temporary user object.
		 *
		 * @param platform
		 * @param id
		 * @param login
		 * @param displayName
		 * @returns
		 */
		getUserFrom(platform:TwitchatDataTypes.ChatPlatform, channelId?:string, id?:string, login?:string, displayName?:string, loadCallback?:(user:TwitchatDataTypes.TwitchatUser)=>void, forcedFollowState:boolean = false, getPronouns:boolean = false, forcedSubscriberState:boolean = false, loadExtras:boolean = true):TwitchatDataTypes.TwitchatUser {
			// const s = Date.now();
			let user:TwitchatDataTypes.TwitchatUser|undefined;
			//Search for the requested user via hashmaps for fast accesses
			let hashmaps = userMaps[platform];
			if(!hashmaps){
				hashmaps = {
					idToUser:{},
					loginToUser:{},
					displayNameToUser:{},
				};
				userMaps[platform] = hashmaps;
			}

			//Cleanup any "@" here so we don't have to do that for every commands
			if(login && login != this.tmpDisplayName)				login = login.replace("@", "").toLowerCase().trim();
			if(displayName && displayName != this.tmpDisplayName)	displayName = displayName.replace("@", "").trim();

			//Search user on hashmaps
			if(id)															user = hashmaps.idToUser[id];
			else if(login && hashmaps.loginToUser[login])					user = hashmaps.loginToUser[login];
			else if(displayName && hashmaps.displayNameToUser[displayName])	user = hashmaps.displayNameToUser[displayName];

			const userExisted = user != undefined;

			if(!user) {
				//Create user if enough given info
				if(id && login) {
					const userData:TwitchatDataTypes.TwitchatUser = {
						platform,
						id:id ?? "",
						login:login ?? "",
						displayName: displayName ?? login ?? "",
						displayNameOriginal:displayName ?? "",
						pronouns:null,
						pronounsLabel:false,
						pronounsTooltip:false,
						is_partner:false,
						is_affiliate:false,
						is_tracked:false,
						is_blocked:false,
						is_bot:this.knownBots[platform][login ?? ""] === true,
						channelInfo:{},
					};
					user = reactive(userData);
				}else
				//If we don't have enough info, create a temp user object and load
				//its details from the API then register it if found.
				if(!login || !id || !displayName) {
					if(!login && displayName) login = displayName.toLowerCase();
					const userData:TwitchatDataTypes.TwitchatUser = {
						platform:platform,
						id:id??Utils.getUUID(),
						login:login??"",
						displayName:displayName??login??"",
						displayNameOriginal:displayName??login??"",
						temporary:true,
						pronouns:null,
						pronounsLabel:false,
						pronounsTooltip:false,
						is_partner:false,
						is_affiliate:false,
						is_tracked:false,
						is_blocked:false,
						is_bot:this.knownBots[platform][login ?? ""] === true,
						channelInfo:{},
					};

					user = reactive(userData);
				}

				// user = reactive(user!);
			}

			//Override "displayName" property by a getter that returns either the
			//"displayNameOriginal" value or the "customUsername" if any is defined
			//This is to avoid updating "displayName" accessors everywhere on the app.
			Object.defineProperty(user, 'displayName', {
				set: function(name) {
					(this as TwitchatDataTypes.TwitchatUser).displayNameOriginal = name;
				},
				get: function() {
					const ref = (this as TwitchatDataTypes.TwitchatUser);
					return StoreProxy.users.customUsernames[ref.id]?.name || ref.displayNameOriginal || ref.login
				}}
			);

			//This just makes the rest of the code know that the user
			//actually exists as it cannot be undefined anymore once
			//we're here.
			user = user!;

			if(channelId) {
				//Init channel data for this user if not already existing
				if(!user.channelInfo[channelId]) {
					let following_date_ms = 0;
					let is_following:boolean|null = channelId == user.id || forcedFollowState===true;
					if(!is_following) {
						if(this.myFollowers[platform][user.id] !== undefined) {
							is_following = true;
							following_date_ms = this.myFollowers[platform][user.id]!;
						}else{
							is_following = null;
						}
					}
					user.channelInfo[channelId]! = {
						online:false,
						is_new:false,
						following_date_ms,
						is_following,
						is_raider:false,
						is_banned:false,
						is_vip:this.myVIPs[platform][user.id]!,
						is_moderator:moderatorsCache[channelId] && moderatorsCache[channelId][user.id] === true || channelId == user.id,
						is_broadcaster:channelId == user.id,
						is_subscriber:forcedSubscriberState,
						is_gifter:false,
						badges:[],
					};
				}

				if(this.blockedUsers[platform][user.id] === true) {
					user.is_blocked = true;
				}
			}

			if(loadExtras && !user.temporary && user.platform == "twitch") {
				if(getPronouns && user.id && user.login && user.pronouns == null) this.loadUserPronouns(user);
				if(channelId && user.id && user.channelInfo[channelId]!.is_following == null) this.checkFollowerState(user, channelId);
			}

			if(!user.displayName) user.displayName = this.tmpDisplayName;
			if(!user.login) user.login = this.tmpDisplayName;

			//User was already existing, consider stop there
			if(userExisted && !user.temporary){
				if(loadCallback) loadCallback(user);
				// const e = Date.now();
				// console.log("Duration 1 :", user.login, user.id, e-s);
				return user;
			}

			const needCreationDate = user.created_at_ms == undefined;// && StoreProxy.params.appearance.recentAccountUserBadge.value === true;
			if(platform == "twitch" && (user.temporary || needCreationDate)) {
				//Wait half a second to let time to external code to populate the
				//object with more details like in TwitchMessengerClient that calls
				//this method, then populates the is_partner and is_affiliate and
				//other fields from IRC tags which avoids the need to get the users
				//details via an API call.
				const to = window.setTimeout((batchType:"id"|"login")=> {

					const batch:BatchItem[] = batchType == "login"? twitchUserBatchLoginToLoad.splice(0) : twitchUserBatchIdToLoad.splice(0);

					//Remove items that might have been fullfilled externally
					for (let i = 0; i < batch.length; i++) {
						const item = batch[i]!;
						if(!item.user.temporary && !needCreationDate) {
							if(item.cb) item.cb(item.user);
							batch.splice(i,1);
							i--;
						}
					}

					const logins:string[]|undefined	= batchType == "login"? batch.map(v=>v.user.login) : undefined;
					const ids:string[]|undefined	= batchType == "login"? undefined : batch.map(v=>v.user.id);

					if((ids?.length == 0 || ids == undefined) && (logins?.length == 0 || logins == undefined)) return;

					// console.log("LOAD BATCH", batchType, batchType=="id"? ids : logins);

					TwitchUtils.getUserInfo(ids, logins)
					.then(async (res) => {
						// console.log("Batch loaded", batchType);
						// console.log(res);
						// console.log(JSON.parse(JSON.stringify(batch)));

						do {
							const batchItem = batch.shift();
							if(!batchItem) continue;
							const userLocal = batchItem.user;
							delete userLocal.temporary;
							// console.log("Search user", batchType=="id"? userLocal.id : userLocal.login);
							type UserKeys = keyof TwitchatDataTypes.TwitchatUser;
							const key:UserKeys = batchType;
							const apiUser = res.find(v => v[key].toLowerCase() == userLocal[key].toLowerCase());
							if(!apiUser) {
								// console.log("User not found.... ", userLocal.login, userLocal.id);
								//User not sent back by twitch API.
								//Most probably because login is wrong or user is banned
								let fallbackLogin = userLocal.login || userLocal.displayNameOriginal;
								if(fallbackLogin == this.tmpDisplayName) fallbackLogin = "#"+userLocal.id;
								userLocal.displayName =
								// userLocal.login = "❌("+fallbackLogin+")";
								userLocal.login = fallbackLogin;
								userLocal.errored = true;
								console.log("Twitch did not return user data for:", userLocal);
								console.log("Requested these IDs/Logins:", ids, logins);
								console.log("Received:", res);

							}else{

								//User sent back by API
								//Update user info with the API data
								// console.log("User found", apiUser.login, apiUser.id);
								userLocal.id				= apiUser.id;
								userLocal.login				= apiUser.login;
								userLocal.displayName		= userLocal.displayNameOriginal = apiUser.display_name;
								userLocal.is_partner		= apiUser.broadcaster_type == "partner";
								userLocal.is_affiliate		= userLocal.is_partner || apiUser.broadcaster_type == "affiliate";
								userLocal.created_at_ms		= new Date(apiUser.created_at).getTime();
								if(!userLocal.avatarPath)	userLocal.avatarPath = apiUser.profile_image_url;
								if(userLocal.id)			hashmaps!.idToUser[userLocal.id] = userLocal;
								if(userLocal.login)			hashmaps!.loginToUser[userLocal.login] = userLocal;
								if(userLocal.displayNameOriginal)	hashmaps!.displayNameToUser[userLocal.displayNameOriginal] = userLocal;

								//Load pronouns if requested
								if(getPronouns && userLocal.id && userLocal.login) this.loadUserPronouns(userLocal);

								//Set moderator state for all connected channels
								for (const chan in moderatorsCache) {
									if(!userLocal.channelInfo[chan]) continue;

									const cache = moderatorsCache[chan]!;
									userLocal.channelInfo[chan].is_moderator = cache && cache[userLocal.id] === true;
								}
								//Check follower state
								if(batchItem.channelId && userLocal.id && userLocal.channelInfo[batchItem.channelId]!.is_following == null) {
									this.checkFollowerState(userLocal, batchItem.channelId);
								}
							}
							if(batchItem.cb) batchItem.cb(userLocal);
						}while(batch.length > 0);
					});
				}, 500, id? "id": "login");

				//Batch requests by types.
				//All items loaded by their IDs on one batch, by logins on another batch.
				if(id) {
					twitchUserBatchIdToLoad.push({user, channelId, cb:loadCallback});
					if(twitchUserBatchIdToLoad.length < 100) {
						if(twitchUserBatchIdTimeout > -1) clearTimeout(twitchUserBatchIdTimeout);
						twitchUserBatchIdTimeout = to;
					}
				} else if(login) {
					twitchUserBatchLoginToLoad.push({user, channelId, cb:loadCallback});
					if(twitchUserBatchLoginToLoad.length < 100) {
						if(twitchUserBatchLoginTimeout > -1) clearTimeout(twitchUserBatchLoginTimeout);
						twitchUserBatchLoginTimeout = to;
					}
				}
			}else
			if(platform != "twitch" && user.temporary) {
				user.temporary = false;//Avoid blocking promise execution on caller
			}

			//Attribute a random color to the user (overwrite that externally if necessary)
			user.color = Utils.pickRand(["#ff0000","#0000ff","#008000","#b22222","#ff7f50","#9acd32","#ff4500","#2e8b57","#daa520","#d2691e","#5f9ea0","#1e90ff","#ff69b4","#8a2be2","#00ff7f"]);

			if(user.id)						hashmaps.idToUser[user.id] = user;
			if(user.login)					hashmaps.loginToUser[user.login] = user;
			if(user.displayNameOriginal)	hashmaps.displayNameToUser[user.displayNameOriginal] = user;

			userList.push(user);

			if(user.temporary != true) {
				if(loadCallback) loadCallback(user);
			}
			// const e = Date.now();
			// console.log("Duration 2 :", user.login, user.id, e-s);
			return user;
		},

		getUserColorFromLogin(login:string, platform:TwitchatDataTypes.ChatPlatform):string|null {
			const hashmap = userMaps[platform];
			if(!hashmap) return null;
			let u = hashmap.loginToUser[login] || hashmap.displayNameToUser[login];
			if(u) return Utils.getUserColor(u) || null;
			return null;
		},

		async initBlockedUsers():Promise<void> {
			if(!TwitchUtils.hasScopes([TwitchScopes.LIST_BLOCKED])) return;

			//Get list of all blocked users and build a hashmap out of it
			try {
				const blockedUsers = await TwitchUtils.getBlockedUsers();
				for (let i = 0; i < blockedUsers.length; i++) {
					this.blockedUsers["twitch"][ blockedUsers[i]!.user_id ] = true;
				}
			}catch(error) {/*ignore*/}
		},

		flagMod(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (const u of userList) {
				if(u.id === uid && platform == u.platform && u.channelInfo[channelId]) {
					u.channelInfo[channelId]!.is_moderator = true;
					break;
				}
			}
		},

		flagUnmod(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (const u of userList) {
				if(u.id === uid && platform == u.platform && u.channelInfo[channelId]) {
					u.channelInfo[channelId]!.is_moderator = false;
					break;
				}
			}
		},

		flagVip(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (const u of userList) {
				if(u.id === uid && platform == u.platform && u.channelInfo[channelId]) {
					u.channelInfo[channelId]!.is_vip = true;
					break;
				}
			}
		},

		flagUnvip(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (const u of userList) {
				if(u.id === uid && platform == u.platform && u.channelInfo[channelId]) {
					u.channelInfo[channelId]!.is_vip = false;
					break;
				}
			}
		},

		flagBlocked(platform:TwitchatDataTypes.ChatPlatform, uid:string):void {
			let user!:TwitchatDataTypes.TwitchatUser;
			this.blockedUsers[platform][uid] = true;
			for (const u of userList) {
				if(u.id === uid && platform == u.platform) {
					user = u;
					user.is_blocked = true;
					break;
				}
			}

			if(!user) return;

			const m:TwitchatDataTypes.MessageNoticeData = {
				date:Date.now(),
				id:Utils.getUUID(),
				message: StoreProxy.i18n.t("global.moderation_action.blocked", {USER:user.displayName}),
				noticeId: TwitchatDataTypes.TwitchatNoticeType.BLOCKED,
				platform,
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				channel_id:"",
			}
			StoreProxy.chat.addMessage(m);
		},

		flagUnblocked(platform:TwitchatDataTypes.ChatPlatform, uid:string):void {
			let user!:TwitchatDataTypes.TwitchatUser;
			this.blockedUsers[platform][uid] = false;
			for (const u of userList) {
				if(u.id === uid && platform == u.platform) {
					user = u;
					user.is_blocked = false;
					break;
				}
			}

			if(!user) return;

			const m:TwitchatDataTypes.MessageNoticeData = {
				date:Date.now(),
				id:Utils.getUUID(),
				message: StoreProxy.i18n.t("global.moderation_action.unblocked", {USER:user.displayName}),
				noticeId: TwitchatDataTypes.TwitchatNoticeType.UNBLOCKED,
				platform,
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				channel_id:"",
			}
			StoreProxy.chat.addMessage(m);
		},

		async flagBanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string, duration_s?:number, moderator?:TwitchatDataTypes.TwitchatUser):Promise<void> {
			let bannedUser:TwitchatDataTypes.TwitchatUser|null = null;
			//Search user
			for (const u of userList) {
				if(u.id === uid && platform == u.platform && u.channelInfo[channelId]) {
					bannedUser = u;
					break;
				}
			}
			if(!bannedUser) {
				bannedUser = await new Promise((resolve)=>{
					StoreProxy.users.getUserFrom(platform, channelId, uid, undefined, undefined,(user=>{
						resolve(user);
					}), undefined, undefined, undefined, false);
				})
			}

			//Check if user is already banned
			if(!bannedUser || bannedUser.channelInfo[channelId]!.is_banned) {
				// Ignore if user is already banned.
				// As we listen from 2 sources of bans on Eventsub to get more accurate timeout
				// info missing from the main source of moderation info, we can get
				// double ban events
				return;
			}

			const banEndDate = Date.now() + (duration_s || 0) * 1000;
			//User already perma banned, stop there
			if(bannedUser.channelInfo[channelId]!.is_banned && !duration_s) return;
			//If already temporary banned and ban end is less than 2s
			//away from the expected one, stop there
			if(bannedUser.channelInfo[channelId]!.is_banned
				&& bannedUser.channelInfo[channelId]!.banEndDate
				&& Math.abs(banEndDate - bannedUser.channelInfo[channelId]!.banEndDate!) < 2) return;

			bannedUser.channelInfo[channelId]!.is_banned = true;
			if(bannedUser.channelInfo[channelId]!.is_moderator === true
			&& StoreProxy.params.features.autoRemod.value == true) {
				//When banned or timed out, twitch removes the moderator role
				//This flag reminds us to flag them back as mod when timeout completes
				//Only for our own channel
				bannedUser.channelInfo[channelId]!.autoRemod = (channelId == StoreProxy.auth.twitch.user.id);
			}
			bannedUser.channelInfo[channelId]!.is_moderator = false;
			//Set ban state
			if(duration_s) {
				bannedUser.channelInfo[channelId]!.banEndDate = banEndDate;
			}else{
				delete bannedUser.channelInfo[channelId]!.banEndDate;
			}

			//Get ban reason from twitch
			if(platform == "twitch") {
				const res = await TwitchUtils.getBannedUsers(channelId, [bannedUser.id]);
				if(res.length > 0) {
					bannedUser.channelInfo[channelId]!.banReason = res[0]!.reason;
				}
			}
			if(unbanFlagTimeouts[uid]) {
				clearTimeout(unbanFlagTimeouts[uid]);
			}

			if(duration_s != undefined) {
				//Auto unflag the user once timeout expires
				unbanFlagTimeouts[uid] = window.setTimeout(()=> {
					StoreProxy.users.flagUnbanned(platform, channelId, uid, undefined, true);
					if(platform == "twitch") {
						//If requested to re grant mod role after a moderator timeout completes, do it
						if(StoreProxy.params.features.autoRemod.value == true) {
							for (const u of userList) {
								if(u.id === uid
								&& platform == u.platform
								&& platform == "twitch"
								&& u.channelInfo[channelId]!.autoRemod === true) {
									u.channelInfo[channelId]!.autoRemod = false;
									TwitchUtils.addRemoveModerator(false, channelId, u);
									break;
								}
							}
						}

						//If we got banned from a remote chan reconnect to eventsub topics.
						//When getting banned, twitch revokes all eventsub topics.
						//We then need to resubscribe to those topics once unbaned
						if(uid == StoreProxy.auth.twitch.user.id) {
							StoreProxy.users.getUserFrom("twitch", channelId, channelId, undefined, undefined, (user => {
								EventSub.instance.connectToChannel(user);
							}), undefined, undefined, undefined, false)
						}
					}
				}, duration_s*1000);

			}else{

				//Send logs to discord if requested
				const sDiscord = StoreProxy.discord;
				if(sDiscord.discordLinked && sDiscord.banLogTarget && bannedUser) {
					//Get creation date of the user if not already existing
					if(!bannedUser.created_at_ms && platform == "twitch") {
						const res = await TwitchUtils.getUserInfo([uid]);
						if(res.length > 0) bannedUser.created_at_ms = new Date(res[0]!.created_at).getTime();
					}

					//Get history of the user to be logged to discord
					let history = [];
					const t = StoreProxy.i18n.t;
					const messages = StoreProxy.chat.messages;
					let message = "";
					for (let i = messages.length-1; i > Math.max(0, messages.length - 500); i--) {
						const m = messages[i]!;
						let labelCode = "";
						let params:{[key:string]:string} = {DATE:Utils.formatDate(new Date(m.date))};
						if((m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE || m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER)
						&& m.user.id == uid) {
							params.MESSAGE = m.message;
							labelCode = m.deleted? "message_deleted" : "message";
							if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && m.answersTo) {
								labelCode = m.deleted? "message_answer_deleted" : "message_answer";
								params.USER = m.answersTo.user.login;
								params.MESSAGE_ANSWERED = m.answersTo.message;
							}
						}
						if(m.type == TwitchatDataTypes.TwitchatMessageType.REWARD && m.user.id == uid) {
							labelCode = "redeem";
							params.REWARD = m.reward.title;
							if(m.message){
								labelCode = "redeem_message";
								params.MESSAGE = m.message;
							}
						}
						if(m.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING && m.user.id == uid) {
							labelCode = "follow";
						}
						if(m.type == TwitchatDataTypes.TwitchatMessageType.CHEER && m.user.id == uid) {
							labelCode = "cheer";
							params.BITS = m.bits.toString();
							if(m.message){
								labelCode = "cheer_message";
								params.MESSAGE = m.message;
							}
						}
						if(m.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION && m.user.id == uid) {
							if((m.gift_recipients?.length || 0) > 0) {
								labelCode = "subgift";
								params.TIER = m.tier.toString();
								params.COUNT = m.gift_recipients!.length.toString();
								params.RECIPIENTS = (m.gift_recipients || []).map(v=>v.login).join(", ");
							}else{
								labelCode = "sub";
								params.TIER = m.tier.toString();
								if(m.message) {
									labelCode = "sub_message";
									params.MESSAGE = m.message;
								}
							}
						}
						if(labelCode) {
							const str = t("discord.log_pattern."+labelCode, params);
							if(str && (message+"\n"+str).length > 1900) {
								history.unshift(message);
								message = str;
							}else{
								message = str +"\n"+ message;
							}
						}
					}
					if(message) {
						history.unshift(message);
					}
					//Format first message sent
					const followDate = bannedUser.channelInfo[channelId]!.following_date_ms;
					const followDateStr = followDate? Utils.formatDate(new Date(followDate), true) : t('discord.log_pattern.not_following');
					const createDateStr = bannedUser.created_at_ms? Utils.formatDate(new Date(bannedUser.created_at_ms!)) : "-";
					let error = "";
					history.unshift(`**${t('discord.log_pattern.uid')}**: \`${bannedUser.id}\`
**${t('discord.log_pattern.login')}**: \`${bannedUser.login}\`
**${t('discord.log_pattern.displayname')}**: \`${bannedUser.displayName}\`
**${t('discord.log_pattern.created_at')}**: \`${createDateStr}\`
**${t('discord.log_pattern.followed_at')}**: \`${followDateStr}\``);
					const channel = await new Promise<TwitchatDataTypes.TwitchatUser>((resolve)=>{
						this.getUserFrom(platform, channelId, channelId, undefined, undefined, (user)=>{
							resolve(user);
						}, undefined, undefined, undefined, false);
					})
					let messageStr = t("discord.log_pattern.intro", {USER:bannedUser.login, UID:bannedUser.id, CHANNEL_NAME:channel.displayNameOriginal, CHANNEL_ID:channelId});
					if(bannedUser.channelInfo[channelId]!.banReason) messageStr += "\n**"+t("discord.log_pattern.reason")+"**: `"+bannedUser.channelInfo[channelId]!.banReason+"`";

					if(sDiscord.banLogThread == true) {
						//Send in a thread
						const result = await ApiHelper.call("discord/thread", "POST", {
							message:messageStr,
							channelId:sDiscord.banLogTarget,
							threadName:bannedUser.login+" #"+bannedUser.id,
							history,
						});

						if(!result.json.success) {
							if(result.json.errorCode == "POST_FAILED") {
								error = StoreProxy.i18n.t("error.discord.MISSING_ACCESS", {CHANNEL:result.json.channelName});
							}else
							if(result.json.errorCode == "CREATE_THREAD_FAILED") {
								error = StoreProxy.i18n.t("error.discord.MISSING_ACCESS_THREAD", {CHANNEL:result.json.channelName});
							}else{
								error = StoreProxy.i18n.t("error.discord.UNKNOWN");
							}
						}
					}else{
						//Send as normal messages
						const result = await ApiHelper.call("discord/message", "POST", {
							message:messageStr,
							channelId:sDiscord.banLogTarget,
						});
						if(!result.json.success) {
							if(result.json.errorCode == "POST_FAILED") {
								error = StoreProxy.i18n.t("error.discord.MISSING_ACCESS", {CHANNEL:result.json.channelName});
							}else{
								error = StoreProxy.i18n.t("error.discord.UNKNOWN");
							}
						}

						if(!error) {
							history.forEach(async message=> {
								await ApiHelper.call("discord/message", "POST", {
									message,
									channelId:sDiscord.banLogTarget,
								});
							});
						}
					}

					if(error) {
						const message:TwitchatDataTypes.MessageCustomData = {
							date:Date.now(),
							id:Utils.getUUID(),
							channel_id:channelId,
							platform,
							type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
							message: error,
							style: "error",
							icon: "alert",
						};
						StoreProxy.chat.addMessage(message);
					}
				}
			}

			//Delete all previous messages of the user
			StoreProxy.chat.delUserMessages(uid, channelId);

			//Send notification on chat
			if(bannedUser) {
				const m:TwitchatDataTypes.MessageBanData|TwitchatDataTypes.MessageYoutubeBanData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform,
					channel_id:channelId,
					type:platform === "twitch"? TwitchatDataTypes.TwitchatMessageType.BAN : TwitchatDataTypes.TwitchatMessageType.YOUTUBE_BAN,
					user:bannedUser,
					moderator,
					reason: bannedUser.channelInfo[channelId]!.banReason,
				};
				if(duration_s) m.duration_s = duration_s;
				StoreProxy.chat.addMessage(m);
			}
		},

		async flagUnbanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string, moderator?:TwitchatDataTypes.TwitchatUser, silentUnban:boolean = false):Promise<void> {
			let unbannedUser:TwitchatDataTypes.TwitchatUser|undefined;
			for (const u of userList) {
				if(u.id === uid && platform == u.platform && u.channelInfo[channelId]) {
					unbannedUser = u;
					break;
				}
			}
			if(!unbannedUser) {
				unbannedUser = await new Promise((resolve)=>{
					StoreProxy.users.getUserFrom(platform, channelId, uid, undefined, undefined,(user=>{
						resolve(user);
					}), undefined, undefined, undefined, false);
				})
			}

			//Already unbanned or user not found, ignore
			if(!unbannedUser || !unbannedUser.channelInfo[channelId]!.is_banned) return;

			unbannedUser.channelInfo[channelId]!.is_banned = false;
			delete unbannedUser.channelInfo[channelId]!.banEndDate;

			if(unbanFlagTimeouts[uid]) {
				clearTimeout(unbanFlagTimeouts[uid]);
			}

			if(!silentUnban && unbannedUser) {
				const m:TwitchatDataTypes.MessageUnbanData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform,
					channel_id:channelId,
					type:TwitchatDataTypes.TwitchatMessageType.UNBAN,
					user:unbannedUser,
					moderator,
				};
				StoreProxy.chat.addMessage(m);
			}
		},

		flagOnlineUsers(users:TwitchatDataTypes.TwitchatUser[], channelId:string):void{
			for (let i = 0; i < users.length; i++) {
				users[i]!.channelInfo[channelId]!.online = true;
			}
		},

		flagOfflineUsers(users:TwitchatDataTypes.TwitchatUser[], channelId:string):void{
			for (let i = 0; i < users.length; i++) {
				users[i]!.channelInfo[channelId]!.online = false;
			}
		},

		//Check if user is following
		async checkFollowerState(user:Pick<TwitchatDataTypes.TwitchatUser, "channelInfo" | "id" | "platform">, channelId:string):Promise<boolean> {
			const chanInfo = user.channelInfo[channelId];
			if(!chanInfo) return false;
			
			if(channelId != StoreProxy.auth.twitch.user?.id) {
				//Only get follower state for our own chan, ignore others as it not possible anymore
				chanInfo.is_following = true;
				return true;
			}
			//If that's us, flag as a follower;
			if(chanInfo.is_broadcaster) {
				chanInfo.is_following = true;
				return true;
			}
			if(chanInfo.is_following == null && user.platform == "twitch") {
				try {
					// console.log("Check if ", user.displayName, "follows", channelId, "or", StoreProxy.auth.twitch.user.id);
					const res = await TwitchUtils.getFollowerState(user.id);
					if(res != null) {
						chanInfo.is_following = true;
						chanInfo.following_date_ms = new Date(res.followed_at).getTime();
					}else{
						chanInfo.is_following = false;
					}
					return true;
				}catch(error){
					// user.channelInfo[channelId]!.is_following = false;
				}
			}
			return false;
		},

		//load user's pronouns
		loadUserPronouns(user:TwitchatDataTypes.TwitchatUser):Promise<void> {
			// console.log("Check pronouns?", user.login, user.id, user.pronouns, !user.id, !user.login, user.pronouns != undefined);

			//Do not get user's pronouns if missing info or pronouns already loaded or not requesting to show pronoouns
			if(!user.id || !user.login || user.pronouns != undefined || StoreProxy.params.features.showUserPronouns.value === false) return Promise.resolve();

			// console.log("Load pronouns !", user.login);
			return new Promise((resolve, reject)=> {
				TwitchUtils.getPronouns(user.id, user.login, user.platform).then((res: TwitchatDataTypes.Pronoun | null) => {
					if (res !== null) {
						user.pronouns = res.pronoun_id;
						user.pronounsLabel = StoreProxy.i18n.tm("pronouns")[user.pronouns] ?? user.pronouns;
						const tt = StoreProxy.i18n.tm("pronouns")["tooltip_"+user.pronouns];
						if(tt) user.pronounsTooltip = tt;
					}else{
						user.pronouns = false;
					}
					resolve();
				}).catch(()=>{
					/*ignore*/
					resolve();
				});
			});

		},

		flagAsFollower(user:TwitchatDataTypes.TwitchatUser, channelId:string):void {
			user.channelInfo[channelId]!.is_following = true;
			this.myFollowers[user.platform][user.id] = Date.now();
		},

		openUserCard(user:TwitchatDataTypes.TwitchatUser, channelId?:string, platform?:TwitchatDataTypes.ChatPlatform) {
			if(user) {
				this.userCard = {user, channelId, platform};
			}else{
				this.userCard = null;
			}
		},

		async loadMyFollowings():Promise<void> {
			if(!TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS])) return;

			const followings = await TwitchUtils.getFollowings(StoreProxy.auth.twitch.user.id);
			const hashmap:{[key:string]:boolean} = {};
			followings.forEach(v => { hashmap[v.broadcaster_id] = true; });
			this.myFollowings["twitch"] = hashmap;
		},

		async loadMyFollowers():Promise<void> {
			if(!TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) return;

			let parseOffset = 0;
			const hashmap:{[key:string]:number} = {};
			const uid:string = StoreProxy.auth.twitch.user.id;
			try {
				await TwitchUtils.getFollowers(null, 70000, async(list)=> {
					if(list.length === 0) return;

					for (let i = parseOffset; i < list.length; i++) {
						hashmap[list[i]!.user_id] = new Date(list[i]!.followed_at).getTime();
					}
					parseOffset = list.length;
					this.myFollowers["twitch"] = hashmap;
					await this.getUserFrom("twitch", uid, list[0]!.user_id, list[0]!.user_login, list[0]!.user_name, undefined, true, undefined, undefined, false);
				})
			}catch(error) {}
		},

		async loadMyVIPs():Promise<void> {
			if(!TwitchUtils.hasScopes([TwitchScopes.READ_VIPS])) return;

			const vips = await TwitchUtils.getVIPs();
			const hashmap:{[key:string]:boolean} = {};
			vips.forEach(v => { hashmap[v.user_id] = true; });
			this.myVIPs["twitch"] = hashmap;
		},

		trackUser(user:TwitchatDataTypes.TwitchatUser):void {
			user.is_tracked = true;
			EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.TRACK_USER, user));
		},

		untrackUser(user:TwitchatDataTypes.TwitchatUser):void {
			user.is_tracked = false;
			EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.UNTRACK_USER, user));
		},

		async shoutout(channelId:string, user:TwitchatDataTypes.TwitchatUser, fromQueue:boolean = false):Promise<boolean> {
			let executed = false;
			let canExecute = true;

			//Init queue if necessary
			if(!this.pendingShoutouts[channelId]) this.pendingShoutouts[channelId] = [];

			//If user is in an error state, stop there
			if(user.errored) {
				StoreProxy.common.alert(StoreProxy.i18n.t("error.user_not_found"));
				canExecute = false;
			}

			//Check if we're live
			// if(!StoreProxy.stream.currentStreamInfo[channelId]
			// || !StoreProxy.stream.currentStreamInfo[channelId]?.live) {
			// 	StoreProxy.common.alert(StoreProxy.i18n.t("error.shoutout_offline"));
			// 	canExecute = false;
			// 	sendChatSO = false;
			// }

			if(user.platform == "twitch" && canExecute) {
				//Has necessary authorization been granted?
				if(!TwitchUtils.hasScopes([TwitchScopes.SHOUTOUT])) {
					StoreProxy.auth.requestTwitchScopes([TwitchScopes.SHOUTOUT]);
				}else{
					//Check if user already has a pending shoutout (if current SO isn't executed by a pending one)
					if(!fromQueue && this.pendingShoutouts[channelId]!.filter(v=>v.user.id == user.id).length > 0) {
						StoreProxy.common.alert(StoreProxy.i18n.t("error.shoutout_pending"));

					}else{

						//Check if there are pending SO or if last SO was done earlier than the minimum cooldown
						let addToQueue = this.pendingShoutouts[channelId]!.length > 0
									  || Date.now() - StoreProxy.stream.currentStreamInfo[channelId]!.lastSoDoneDate < Config.instance.TWITCH_SHOUTOUT_COOLDOWN;
						if(!addToQueue || fromQueue) {
							//If no pending SO or if SO executed from pending list, try to execute it
							const res = await TwitchUtils.sendShoutout(channelId, user);
							//If API call failed, add the SO to queue.
							//It fails if an SO has been made before and Twitchat
							//didn't know about (because not yet started)
							if(res === "RATE_LIMIT") {
								addToQueue = !fromQueue;
							}else if(res === true){
								executed = true;
								addToQueue = false;
							}
							//Set the last SO date offset for this user to now
							let soDate = Date.now();
							if(!fromQueue) {
								//If not executed from queue that means twitchat didn't know about
								//a previously made SO. In this case we offset the virtual SO date
								//of the current user in such a way it will have to wait the minimum
								//cooldown duration. After that if it fails again it will switch
								//to the maximum one because this line won't be executed
								soDate -= Config.instance.TWITCH_SHOUTOUT_COOLDOWN_SAME_USER - Config.instance.TWITCH_SHOUTOUT_COOLDOWN;
							}
							user.channelInfo[channelId]!.lastShoutout = soDate;
							//Set the last SO date offset for this channel to now
							StoreProxy.stream.currentStreamInfo[channelId]!.lastSoDoneDate = Date.now();
						}

						//Shoutout not executed, add it to the pending queue
						if(addToQueue) {
							//Add pending SO
							this.pendingShoutouts[channelId]!.push({
								id:Utils.getUUID(),
								executeIn:0,
								user,
							});
						}
						if(!executed) {
							//Force timers refresh
							this.executePendingShoutouts();
						}
					}
				}
			}
			return executed;
		},

		executePendingShoutouts():void {
			//Parse all channels
			for (const channelId in this.pendingShoutouts) {
				const list = this.pendingShoutouts[channelId];
				if(!list || list.length == 0) continue;

				const elapsed = Date.now() - StoreProxy.stream.currentStreamInfo[channelId]!.lastSoDoneDate;
				let cooldown = -elapsed;
				//Compute cooldowns for every pending shoutouts
				for (let i = 0; i < list.length; i++) {
					const so = list[i]!;
					const userLastSoDate = so.user.channelInfo[channelId]!.lastShoutout || 0;
					const virtualElapsed = Date.now() - userLastSoDate + cooldown;

					//Compute minimum cooldown to wait for this SO
					cooldown += Math.max(Config.instance.TWITCH_SHOUTOUT_COOLDOWN_SAME_USER - virtualElapsed, Config.instance.TWITCH_SHOUTOUT_COOLDOWN);

					so.executeIn = cooldown;

					//If cooldown has fully elapsed, execute SO
					if(so.executeIn <= 0) {
						//Remove it from list
						list.splice(i,1);
						i--
						//Execute SO
						this.shoutout(channelId, so.user, true).then(result => {
							//SO failed
							if(!result) {
								//Update last SO date for this user to update its cooldown
								so.user.channelInfo[channelId]!.lastShoutout = Date.now();
								//Bring it back to bottom
								list.push(so);
								//Force timers refresh
								so.executeIn = 0;
								this.executePendingShoutouts();
							}
						})
					}
				}

			}
		},

		removeCustomUsername(uid:string):void {
			delete this.customUsernames[uid];
			this.saveCustomUsername();
		},

		setCustomUsername(user:TwitchatDataTypes.TwitchatUser|string, name:string, channelId:string, platform:TwitchatDataTypes.ChatPlatform):boolean {
			name = name.trim().substring(0, 25);
			const uid = typeof user === "string"? user : user.id;
			const displayName = typeof user === "string"? "" : user.displayNameOriginal;
			const platformLoc = typeof user === "string"? platform : user.platform;
			if(name.length == 0 || name === displayName) {
				delete this.customUsernames[uid];
			}else{
				//User can give up to 10 custom user names if not premium
				if(!this.customUsernames[uid]
				&& !StoreProxy.auth.isPremium
				&& Object.keys(this.customUsernames).length >= Config.instance.MAX_CUSTOM_USERNAMES) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.max_custom_usernames", {COUNT:Config.instance.MAX_CUSTOM_USERNAMES}));
					return false;
				}
				this.customUsernames[uid] = {name, platform:platformLoc, channel:channelId};
			}

			this.saveCustomUsername();
			return true;
		},

		createCustomBadge(img:string):boolean|string {
			let id = "";
			//add badge to global list if necessary
			const existingIndex = this.customBadgeList.findIndex(v=>v.img == img);
			if(existingIndex == -1) {
				//User can create up to 3 custom badges if not premium
				if(!StoreProxy.auth.isPremium && this.customBadgeList.length >= Config.instance.MAX_CUSTOM_BADGES) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.max_custom_badges", {MAX:Config.instance.MAX_CUSTOM_BADGES, MAX_PREMIUM:Config.instance.MAX_CUSTOM_BADGES_PREMIUM}));
					return false;
				}
				id = Utils.getUUID();
				this.customBadgeList.push({id, img});
			}else{
				id = this.customBadgeList[existingIndex]!.id;
			}

			this.saveCustomBadges();
			return id;
		},

		updateCustomBadgeImage(badgeId:string, img:string):void {
			const index = this.customBadgeList.findIndex(v=>v.id == badgeId);
			if(index > -1) {
				this.customBadgeList[index]!.img = img;
			}
			this.saveCustomBadges();
		},

		updateCustomBadgeName(badgeId:string, name:string):void {
			const index = this.customBadgeList.findIndex(v=>v.id == badgeId);
			if(index > -1) {
				this.customBadgeList[index]!.name = name;
				if(name.length === 0) {
					delete this.customBadgeList[index]!.name;
				}
			}
			this.saveCustomBadges();
		},

		deleteCustomBadge(badgeId:string):void {
			//Remove any reference of the badge from the users
			const userBadges = this.customUserBadges;
			for (const uid in userBadges) {
				const index = userBadges[uid]!.findIndex(v=> v.id == badgeId);
				if(index > -1) {
					userBadges[uid]!.splice(index, 1);
					if(userBadges[uid]!.length == 0) {
						delete userBadges[uid];
					}
				}
			}

			const index = this.customBadgeList.findIndex(v=>v.id == badgeId);
			if(index > -1) {
				this.customBadgeList.splice(index, 1);
			}

			this.saveCustomBadges();
		},

		giveCustomBadge(userId:string, platform:TwitchatDataTypes.ChatPlatform, badgeId:string, channelId:string):boolean {
			if(!this.customUserBadges[userId]) this.customUserBadges[userId] = [];
			//Add badge to the user if necessary
			if(this.customUserBadges[userId].findIndex(v => v.id == badgeId) == -1) {
				//User can give badges to 30 users max if not premium
				if(!StoreProxy.auth.isPremium && Object.keys(this.customUserBadges).length >= Config.instance.MAX_CUSTOM_BADGES_ATTRIBUTION) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.max_custom_badges_given", {MAX:Config.instance.MAX_CUSTOM_BADGES_ATTRIBUTION, MAX_PREMIUM:Config.instance.MAX_CUSTOM_BADGES_ATTRIBUTION_PREMIUM}));
					return false;
				}
				this.customUserBadges[userId].push({id:badgeId, platform:platform, channel:channelId!});
			}
			this.saveCustomBadges();
			return true;
		},

		removeCustomBadge(userId:string, badgeId:string, channelId:string):void {
			if(!this.customUserBadges[userId]) return;

			const index = this.customUserBadges[userId].findIndex(badge => badge.id == badgeId && badge.channel == channelId);

			if(index > -1) this.customUserBadges[userId].splice(index, 1);
			if(this.customUserBadges[userId].length === 0) {
				delete this.customUserBadges[userId];
			}

			this.saveCustomBadges();
		},

		saveCustomBadges():void {
			DataStore.set(DataStore.CUSTOM_BADGE_LIST, this.customBadgeList);
			DataStore.set(DataStore.CUSTOM_USER_BADGES, this.customUserBadges);
			this.setTriggerPlaceholders();
		},

		saveCustomUsername():void {
			DataStore.set(DataStore.CUSTOM_USERNAMES, this.customUsernames);
		},

		setTriggerPlaceholders():void {
			const values:TwitchatDataTypes.ParameterDataListValue<string, TwitchatDataTypes.TwitchatCustomUserBadge>[]
				= this.customBadgeList.map(v=>({value:v.id, label:v.name || v.id, storage:v, image:v.img}));
			[TriggerTypes.ANY_MESSAGE,
			TriggerTypes.FIRST_TODAY,
			TriggerTypes.FIRST_ALL_TIME,
			TriggerTypes.RETURNING_USER,
			TriggerTypes.ANNOUNCEMENTS,
			TriggerTypes.CHAT_COMMAND,
			TriggerTypes.USER_WATCH_STREAK,
			TriggerTypes.CHEER,
			TriggerTypes.SUB,
			TriggerTypes.SUBGIFT,
			TriggerTypes.POWER_UP_GIANT_EMOTE,
			TriggerTypes.POWER_UP_MESSAGE,
			TriggerTypes.POWER_UP_CELEBRATION,
			TriggerTypes.PIN_MESSAGE,
			TriggerTypes.UNPIN_MESSAGE,
			TriggerTypes.RAID,
			TriggerTypes.SHOUTOUT_IN,
			TriggerTypes.SHOUTOUT_OUT,
			TriggerTypes.FOLLOWED_STREAM_ONLINE,
			TriggerTypes.FOLLOWED_STREAM_OFFLINE,
			TriggerTypes.HEAT_CLICK,
			TriggerTypes.BINGO_GRID_VIEWER_LINE,
			TriggerTypes.REWARD_REDEEM].forEach(v=>{
				setTriggerEventPlaceholderValues(v, USER_CUSTOM_BADGES, values);
			});
		},

		flagRestrictedUser(channelId:string, user:TwitchatDataTypes.TwitchatUser):void {
			user.channelInfo[channelId]!.is_restricted = true;
			user.channelInfo[channelId]!.is_suspicious = false;
		},
		
		flagSuspiciousUser(channelId:string, user:TwitchatDataTypes.TwitchatUser):void {
			user.channelInfo[channelId]!.is_restricted = false;
			user.channelInfo[channelId]!.is_suspicious = true;
		},
		
		unflagUser(channelId:string, user:TwitchatDataTypes.TwitchatUser):void {
			delete user.channelInfo[channelId]!.is_suspicious;
			delete user.channelInfo[channelId]!.is_restricted;
		},

	} as IUsersActions
	& ThisType<IUsersActions
		& UnwrapRef<IUsersState>
		& _StoreWithState<"users", IUsersState, IUsersGetters, IUsersActions>
		& _StoreWithGetters<IUsersGetters>
		& PiniaCustomProperties
	>,
})


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeUsers, import.meta.hot))
}
