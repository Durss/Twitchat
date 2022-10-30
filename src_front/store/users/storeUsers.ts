import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { reactive, type UnwrapRef } from 'vue';
import type { IUsersActions, IUsersGetters, IUsersState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

let unbanFlagTimeouts:{[key:string]:number} = {};
let userMaps:Partial<{[key in TwitchatDataTypes.ChatPlatform]:{
	idToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
	loginToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
	displayNameToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
}}> = {};

interface BatchItem {
	channelId?:string;
	user:TwitchatDataTypes.TwitchatUser
	cb?:(user:TwitchatDataTypes.TwitchatUser) => void;
}

let twitchUserBatchLoginToLoad:BatchItem[] = [];
let twitchUserBatchIdToLoad:{channelId?:string, user:TwitchatDataTypes.TwitchatUser, cb?:(user:TwitchatDataTypes.TwitchatUser) => void}[] = [];
let twitchUserBatchLoginTimeout:number = -1;
let twitchUserBatchIdTimeout:number = -1;
const tmpDisplayName = "...loading...";

export const storeUsers = defineStore('users', {
	state: () => ({
		users: [],
		userCard: null,
		blockedUsers: {
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
		},
		myFollowings:{
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
		},
		knownBots: {
			twitchat:{},
			twitch:{},
			instagram:{},
			youtube:{},
			tiktok:{},
			facebook:{},
		}
	} as IUsersState),



	getters: {
	} as IUsersGetters
	& ThisType<UnwrapRef<IUsersState> & _StoreWithGetters<IUsersGetters> & PiniaCustomProperties>
	& _GettersTree<IUsersState>,



	actions: {
		/**
		 * Registers the bots hashmap of a platform
		 * Maps a lowercased login to a boolean (true)
		 */
		setBotsMap(platform:TwitchatDataTypes.ChatPlatform, hashmap:{[key:string]:boolean}):void {
			this.knownBots[platform] = hashmap;
		},

		/**
		 * Gets a user by their source from their ID nor login.
		 * It registers the user on the local DB "this.users" to get them back later.
		 * If only the login is given, the user's data are loaded asynchronously from
		 * remote API then added to the local DB while returning a temporary user object.
		 * 
		 * @param platform 
		 * @param id 
		 * @param login 
		 * @param displayName 
		 * @returns 
		 */
		getUserFrom(platform:TwitchatDataTypes.ChatPlatform, channelId?:string, id?:string, login?:string, displayName?:string, loadCallback?:(user:TwitchatDataTypes.TwitchatUser)=>void, forcedFollowState:boolean = false):TwitchatDataTypes.TwitchatUser {
			let user:TwitchatDataTypes.TwitchatUser|undefined;
			//Search for the requested  via hashmaps for fast accesses
			let hashmaps = userMaps[platform];
			if(!hashmaps){
				hashmaps = {
					idToUser:{},
					loginToUser:{},
					displayNameToUser:{},
				};
				userMaps[platform] = hashmaps;
			}
			if(login)													login = login.toLowerCase();
			if(id && hashmaps.idToUser[id])								user = hashmaps.idToUser[id];
			if(login && hashmaps.loginToUser[login])					user = hashmaps.loginToUser[login];
			if(displayName && hashmaps.displayNameToUser[displayName])	user = hashmaps.displayNameToUser[displayName];

			const userExisted = user != undefined;

			if(!user) {
				//Create user if enough given info
				if(id && login) {
					if(!displayName) displayName = login;
					const userData:TwitchatDataTypes.TwitchatUser = {
						platform,
						id:id ?? "",
						login:login ?? "",
						displayName:displayName ?? "",
						greeted:false,
						pronouns:undefined,
						pronounsLabel:false,
						pronounsTooltip:false,
						is_partner:false,
						is_affiliate:false,
						is_tracked:false,
						donor:{
							state:false,
							level:0,
						},
						channelInfo:{},
					};
					user = reactive(userData);
				}
				//If we don't have enough info, create a temp user object and load
				//its details from the API then register it if found.
				if(!login || !id || !displayName) {
					const userData:TwitchatDataTypes.TwitchatUser = {
						platform:platform,
						id:id??Utils.getUUID(),
						login:login??displayName??"",
						displayName:displayName??login??"",
						greeted:false,
						temporary:true,
						pronouns:undefined,
						pronounsLabel:false,
						pronounsTooltip:false,
						is_partner:false,
						is_affiliate:false,
						is_tracked:false,
						donor:{
							state:false,
							level:0,
						},
						channelInfo:{},
					};
					user = reactive(userData);
				}
			}
			
			//This just makes the rest of the code know that the user
			//actually exists as it cannot be undefined anymore once
			//we're here.
			user = user!;

			if(channelId) {
				//Init channel data for this user
				if(!user.channelInfo[channelId]) {
					user.channelInfo[channelId] = {
						messageHistory:[],
						online:false,
						is_following:channelId == user.id? true : (forcedFollowState===true? true : null),
						is_blocked:false,
						is_banned:false,
						is_vip:false,
						is_moderator:false,
						is_broadcaster:channelId == user.id,
						is_subscriber:false,
						is_gifter:false,
						badges:[],
					};
				}
	
				if(this.blockedUsers[platform][user.id] === true) {
					user.channelInfo[channelId].is_blocked = true;
				}
			}
			
			if(!user.temporary) {
				if(user.id && user.login) this.checkPronouns(user);
				if(channelId && user.id) this.checkFollowerState(user, channelId);
			}
				
			if(!user.displayName) user.displayName = tmpDisplayName;
			if(!user.login) user.login = tmpDisplayName;

			//User was already existing, consider stop there
			if(userExisted){
				if(loadCallback) loadCallback(user);
				return user;
			}

			if(platform == "twitch") {
				//Wait half a second to let time to external code to populate the
				//object with more details like in TwitchMessengerClient that calls
				//this method, then populates the is_partner and is_affiliate and
				//other fields from IRC tags which avoids the need to get the users
				//details via an API call.
				const to = setTimeout((batchType:"id"|"login")=> {
					
					let batch:BatchItem[] = batchType == "login"? twitchUserBatchLoginToLoad.splice(0) : twitchUserBatchIdToLoad.splice(0);
					//Remove items that might have been fullfilled externally
					for (let i = 0; i < batch.length; i++) {
						const item = batch[i];
						if(!item.user.temporary) {
							if(item.cb) item.cb(item.user);
							batch.splice(i,1);
							i--;
						}
					}

					let logins:string[]|undefined	= batchType == "login"? batch.map(v=>v.user.login) : undefined;
					let ids:string[]|undefined		= batchType == "login"? undefined : batch.map(v=>v.user.id);

					// console.log("LOAD BATCH", batchType, batchType=="id"? ids : logins);
					
					TwitchUtils.loadUserInfo(ids, logins)
					.then(async (res) => {
						// console.log("Batch loaded", batchType);
						// console.log(res);
						// console.log(JSON.parse(JSON.stringify(batch)));

						do {
							const batchItem:BatchItem = batch.splice(0, 1)[0];
							if(!batchItem) continue;
							let userLocal = batchItem.user;
							delete userLocal.temporary;
							// console.log("Search user", batchType=="id"? userLocal.id : userLocal.login);
							type UserKeys = keyof TwitchatDataTypes.TwitchatUser;
							const key:UserKeys = batchType;
							const apiUser = res.find(v => v[key].toLowerCase() == userLocal[key].toLowerCase());
							if(!apiUser) {
								// console.log("User not found.... ", userLocal.login, userLocal.id);
								//User not sent back by twitch API.
								//Most probably because login is wrong or user is banned
								userLocal.displayName = " error(#"+(user!.id)+")";
								userLocal.login = " error(#"+(user!.id)+")";
								userLocal.errored = true;
								
							}else{
								
								//User sent back by API
								//Update user info with the API data
								// console.log("User found", apiUser.login, apiUser.id);
								userLocal.id				= apiUser.id;
								userLocal.login				= apiUser.login;
								userLocal.is_partner		= apiUser.broadcaster_type == "partner";
								userLocal.is_affiliate		= userLocal.is_partner || apiUser.broadcaster_type == "affiliate";
								userLocal.avatarPath		= apiUser.profile_image_url;
								if(!userLocal.displayName || userLocal.displayName == tmpDisplayName)
									userLocal.displayName	= apiUser.display_name;
								if(userLocal.id)			hashmaps!.idToUser[userLocal.id] = userLocal;
								if(userLocal.login)			hashmaps!.loginToUser[userLocal.login] = userLocal;
								if(userLocal.displayName)	hashmaps!.displayNameToUser[userLocal.displayName] = userLocal;
								//If user was temporary, load more info
								delete userLocal.temporary;
								if(userLocal.id && userLocal.login) this.checkPronouns(userLocal);
								if(batchItem.channelId && userLocal.id) this.checkFollowerState(userLocal, batchItem.channelId);
							}
							if(batchItem.cb) batchItem.cb(userLocal);
						}while(batch.length > 0);
					});
				}, 500, login? "login": "id");

				//Batch requests by types.
				//All items loaded by their IDs on one batch, by logins on another batch.
				if(login) {
					twitchUserBatchLoginToLoad.push({user, channelId, cb:loadCallback});
					if(twitchUserBatchLoginToLoad.length < 100) {
						if(twitchUserBatchLoginTimeout > -1) clearTimeout(twitchUserBatchLoginTimeout);
						twitchUserBatchLoginTimeout = to;
					}
				} else {
					twitchUserBatchIdToLoad.push({user, channelId, cb:loadCallback});
					if(twitchUserBatchIdToLoad.length < 100) {
						if(twitchUserBatchIdTimeout > -1) clearTimeout(twitchUserBatchIdTimeout);
						twitchUserBatchIdTimeout = to;
					}
				}
			}
			
			//Attribute a random color to the user (overwrite that externally if necessary)
			user.color = Utils.pickRand(["#ff0000","#0000ff","#008000","#b22222","#ff7f50","#9acd32","#ff4500","#2e8b57","#daa520","#d2691e","#5f9ea0","#1e90ff","#ff69b4","#8a2be2","#00ff7f"]);

			if(user.id)				hashmaps.idToUser[user.id] = user;
			if(user.login)			hashmaps.loginToUser[user.login] = user;
			if(user.displayName)	hashmaps.displayNameToUser[user.displayName] = user;

			this.users.push(user);

			if(user.temporary != true) {
				if(loadCallback) loadCallback(user);
			}

			return user;
		},

		async initBlockedUsers():Promise<void> {
			//Get list of all blocked users and build a hashmap out of it
			try {
				const blockedUsers = await TwitchUtils.getBlockedUsers();
				for (let i = 0; i < blockedUsers.length; i++) {
					this.blockedUsers["twitch"][ blockedUsers[i].user_id ] = true;
				}
			}catch(error) {/*ignore*/}
		},

		flagMod(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_moderator = true;
					break;
				}
			}
		},
		
		flagUnmod(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_moderator = false;
					break;
				}
			}
		},

		flagVip(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_vip = true;
					break;
				}
			}
		},
		
		flagUnvip(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_vip = false;
					break;
				}
			}
		},

		flagBlocked(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			this.blockedUsers[platform][uid] = true;
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_blocked = true;
					break;
				}
			}
		},
		
		flagUnblocked(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			delete this.blockedUsers[platform][uid];
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_blocked = false;
					break;
				}
			}
		},

		flagBanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string, duration_s?:number):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_banned = true;
					if(duration_s) {
						this.users[i].channelInfo[channelId].banEndDate = Date.now() + duration_s*1000;
					}
					break;
				}
			}
			if(unbanFlagTimeouts[uid]) {
				clearTimeout(unbanFlagTimeouts[uid]);
			}
			if(duration_s != undefined) {
				//Auto unflag the user once timeout expires
				unbanFlagTimeouts[uid] = setTimeout(()=> {
					StoreProxy.users.flagUnbanned("twitch", channelId, uid);
				}, duration_s*1000)
			}
		},
		
		flagUnbanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_banned = false;
					delete this.users[i].channelInfo[channelId].banEndDate;
					break;
				}
			}
			if(unbanFlagTimeouts[uid]) {
				clearTimeout(unbanFlagTimeouts[uid]);
			}
		},

		flagOnlineUsers(users:TwitchatDataTypes.TwitchatUser[], channelId:string):void{
			for (let i = 0; i < users.length; i++) {
				users[i].channelInfo[channelId].online = true;
			}
		},

		flagOfflineUsers(users:TwitchatDataTypes.TwitchatUser[], channelId:string):void{
			for (let i = 0; i < users.length; i++) {
				users[i].channelInfo[channelId].online = false;
			}
		},

		//Check if user is following
		async checkFollowerState(user:TwitchatDataTypes.TwitchatUser, channelId:string):Promise<boolean> {
			//TODO batch queries and don't spam them all at once. This crashes everything when joining a room with thousands of chatters
			//If that's us, flag as a follower;
			if(user.channelInfo[channelId]?.is_broadcaster) {
				user.channelInfo[channelId].is_following = true;
				return true;
			}
			if(user.id && StoreProxy.params.appearance.highlightNonFollowers.value === true) {
				if(user.channelInfo[channelId].is_following == null) {
					try {
						// console.log("Check if ", user.displayName, "follows", channelId, "or", StoreProxy.auth.twitch.user.id);
						const res = await TwitchUtils.getFollowInfo(user.id, channelId ?? StoreProxy.auth.twitch.user.id)
						user.channelInfo[channelId].is_following = res != null;
						return true;
					}catch(error){};
				}
			}
			return false;
		},

		//Check for user's pronouns
		checkPronouns(user:TwitchatDataTypes.TwitchatUser):Promise<void> {
			//TODO batch queries and don't spam them all at once. This crashes everything when joining a room with thousands of chatters
			// console.log("Check pronouns?", user.login, user.id, user.pronouns, !user.id, !user.login, user.pronouns != undefined);
			if(!user.id || !user.login || user.pronouns != undefined || StoreProxy.params.features.showUserPronouns.value === false) return Promise.resolve();
			// console.log("Load pronouns !", user.login);
			return new Promise((resolve, reject)=> {
				TwitchUtils.getPronouns(user.id, user.login).then((res: TwitchatDataTypes.Pronoun | null) => {
					if (res !== null) {
						const hashmapLabel:{[key:string]:string} = {
							// https://pronouns.alejo.io
							"aeaer" : "Ae/Aer",
							"any" : "Any",
							"eem" : "E/Em",
							"faefaer" : "Fae/Faer",
							"hehim" : "He/Him",
							"heshe" : "He/She",
							"hethem" : "He/They",
							"itits" : "It/Its",
							"other" : "Other",
							"perper" : "Per/Per",
							"sheher" : "She/Her",
							"shethem" : "She/They",
							"theythem" : "They/Them",
							"vever" : "Ve/Ver",
							"xexem" : "Xe/Xem",
							"ziehir" : "Zie/Hir",
							// https://pronoundb.org
							"hh": "he/him",
							"hi": "he/it",
							"hs": "he/she",
							"ih": "it/him",
							"ii": "it/its",
							"is": "it/she",
							"shh": "she/he",
							"sh": "she/her",
							"si": "she/it",
							"st": "she/they",
							"th": "they/he",
							"ti": "they/it",
							"ts": "they/she",
							"tt": "they/them",
						};
						const hashmapTooltip: {[key: string]: string} = {
							// https://pronoundb.org
							"any": "Any pronouns",
							"other": "Other pronouns",
							"ask": "Ask me my pronouns",
							"avoid": "Avoid pronouns, use my name",
						};
						user.pronouns = res.pronoun_id;
						user.pronounsLabel = hashmapLabel[user.pronouns] ?? user.pronouns;
						if(hashmapTooltip[user.pronouns]) {
							user.pronounsTooltip = hashmapTooltip[user.pronouns];
						}
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
			user.channelInfo[channelId].is_following = true;
		},

		openUserCard(user:TwitchatDataTypes.TwitchatUser, channelId?:string) {
			if(user) {
				this.userCard = {user, channelId};
			}else{
				this.userCard = null;
			}
		},

		async loadMyFollowings():Promise<void> {
			const followings = await TwitchUtils.getFollowings(StoreProxy.auth.twitch.user.id);
			let hashmap:{[key:string]:boolean} = {};
			followings.forEach(v => { hashmap[v.to_id] = true; });
			this.myFollowings["twitch"] = hashmap;
		},

		trackUser(user:TwitchatDataTypes.TwitchatUser):void { user.is_tracked = true; },

		untrackUser(user:TwitchatDataTypes.TwitchatUser):void { user.is_tracked = false; },

	} as IUsersActions
	& ThisType<IUsersActions
		& UnwrapRef<IUsersState>
		& _StoreWithState<"users", IUsersState, IUsersGetters, IUsersActions>
		& _StoreWithGetters<IUsersGetters>
		& PiniaCustomProperties
	>,
})