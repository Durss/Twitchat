import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import { storeChat } from '../chat/storeChat';
import type { IUsersActions, IUsersGetters, IUsersState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

let unbanFlagTimeouts:{[key:string]:number} = {};
let userMaps:Partial<{[key in TwitchatDataTypes.ChatPlatform]:{
	idToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
	loginToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
	displayNameToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
}}> = {};

let twitchUserBatchToLoad:TwitchatDataTypes.TwitchatUser[] = [];
let twitchUserBatchTimeout:number = -1;

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
		getUserFrom(platform:TwitchatDataTypes.ChatPlatform, channelId?:string, id?:string, login?:string, displayName?:string, loadCallback?:(user:TwitchatDataTypes.TwitchatUser)=>void):TwitchatDataTypes.TwitchatUser {
			let user:TwitchatDataTypes.TwitchatUser|undefined;
			//Search for the requested  via hashmaps for fast accesses
			let hashmap = userMaps[platform];
			if(!hashmap){
				hashmap = {
					idToUser:{},
					loginToUser:{},
					displayNameToUser:{},
				};
				userMaps[platform] = hashmap;
			}
			if(id && hashmap.idToUser[id])					return hashmap.idToUser[id];
			if(login && hashmap.loginToUser[login])			return hashmap.loginToUser[login];
			if(login && hashmap.displayNameToUser[login])	return hashmap.displayNameToUser[login];

			//Create user if enough given info
			if(!user && id && login) {
				if(!displayName) displayName = login;
				user = {
					platform,
					id,
					login,
					displayName,
					greeted:false,
					online:false,
					is_tracked:false,
					messageHistory:[],
					is_following:null,
					is_blocked:false,
					is_banned:false,
					is_vip:false,
					is_moderator:false,
					is_broadcaster:false,
					is_subscriber:false,
					is_partner:false,
					is_affiliate:false,
					is_gifter:false,
					pronouns:false,
					pronounsLabel:false,
					pronounsTooltip:false,
				};
				if(this.blockedUsers[platform][id] === true) {
					user.is_blocked = true;
				}
			}
			//If we don't have enough info, create a temp user object and load
			//its details from the API then register it if found.
			if(!user && (!login || !id || !displayName)) {
				user = {
					platform:platform,
					id:id??"temporary_"+Utils.getUUID(),
					login:login??displayName??"",
					displayName:displayName??login??"",
					greeted:false,
					online:false,
					is_tracked:false,
					messageHistory:[],
					temporary:true,
					is_following:null,
					is_blocked:false,
					is_banned:false,
					is_vip:false,
					is_moderator:false,
					is_broadcaster:false,
					is_subscriber:false,
					is_partner:false,
					is_affiliate:false,
					is_gifter:false,
					pronouns:false,
					pronounsLabel:false,
					pronounsTooltip:false,
				};
			}
			
			//This just makes the rest of the code know that the user
			//actually exists as it cannot be undefined anymore once
			//we're here.
			user = user!;

			if(this.blockedUsers[platform][user.id] === true) {
				user.is_blocked = true;
			}

			if(platform == "twitch") {
				//Wait half a second to let time to external code to populate the
				//object with more details like in TwitchMessengerClient that calls
				//this method, then populates the is_partner and is_affiliate and
				//other fields from IRC tags which avoids the need to get the users
				//details via an API call.
				const batchMode = !id && login;
				const to = setTimeout(()=> {
					if(!user!.temporary) {
						//User not pending for necessary data loading, check if the
						//partner/affiliate state is defined, if so, just stop there
						//Otherwise, load full info from API
						if(user!.is_partner != undefined) return false;
						if(user!.is_affiliate != undefined) return false;
					}
					const logins = twitchUserBatchToLoad
					// .filter(v=> {
					// 	if(!v.temporary) {
					// 		//User not pending for necessary data loading, check if the
					// 		//partner/affiliate state is defined, if so, just stop there
					// 		//Otherwise, load full info from API
					// 		if(v.is_partner != undefined) return false;
					// 		if(v.is_affiliate != undefined) return false;
					// 	}
					// 	return true;
					// })
					.map(v=> v.login);
					TwitchUtils.loadUserInfo(id? [id] : undefined, !id? logins : undefined).then(async (res) => {
						user = user!;
						if(res.length > 0) {
							for (let i = 0; i < res.length; i++) {
								const u = res[i];
								let index = twitchUserBatchToLoad.findIndex(v => v.login === u.login);
								const userLocal = !batchMode? user : twitchUserBatchToLoad.splice(index, 1)[0];
								if(!userLocal) {
									console.warn("Could not load back the user \""+u.login+"\" from the batch ref");
									continue;
								}
								userLocal.id = u.id;
								userLocal.login = u.login;
								userLocal.displayName = u.display_name;
								userLocal.is_partner = u.broadcaster_type == "partner";
								userLocal.is_affiliate = userLocal.is_partner || u.broadcaster_type == "affiliate";
								userLocal.avatarPath = u.profile_image_url;
								if(userLocal.id)			hashmap!.idToUser[userLocal.id] = userLocal;
								if(userLocal.login)			hashmap!.loginToUser[userLocal.login] = userLocal;
								if(userLocal.displayName)	hashmap!.displayNameToUser[userLocal.displayName] = userLocal;
								if(userLocal.temporary) {
									delete userLocal.temporary;
									this.users.push(userLocal);
									this.checkFollowerState(userLocal, channelId);
									this.checkPronouns(userLocal);
									if(loadCallback) loadCallback(userLocal);
								}
							}
						}
					});
				}, 500);
				//Only batch requests by login
				if(batchMode) {
					twitchUserBatchToLoad.push(user);
					if(twitchUserBatchTimeout > -1) clearTimeout(twitchUserBatchTimeout);
					twitchUserBatchTimeout = to;
				}
			}
			
			//Attribute a random color to the user (overwrite that externally if necessary)
			user.color = Utils.pickRand(["#ff0000","#0000ff","#008000","#b22222","#ff7f50","#9acd32","#ff4500","#2e8b57","#daa520","#d2691e","#5f9ea0","#1e90ff","#ff69b4","#8a2be2","#00ff7f"]);

			if(user.temporary != true) {
				this.users.push(user);
				this.checkFollowerState(user, channelId);
				this.checkPronouns(user);
				if(loadCallback) loadCallback(user);
				if(user.id)				hashmap.idToUser[user.id] = user;
				if(user.login)			hashmap.loginToUser[user.login] = user;
				if(user.displayName)	hashmap.displayNameToUser[user.displayName] = user;
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

		flagMod(platform:TwitchatDataTypes.ChatPlatform, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform) {
					this.users[i].is_moderator = true;
					break;
				}
			}
		},
		
		flagUnmod(platform:TwitchatDataTypes.ChatPlatform, uid:string):void {
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform) {
					this.users[i].is_moderator = false;
					break;
				}
			}
		},

		flagBlocked(platform:TwitchatDataTypes.ChatPlatform, uid:string):void {
			this.blockedUsers[platform][uid] = true;
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform) {
					this.users[i].is_blocked = true;
					break;
				}
			}
		},
		
		flagUnblocked(platform:TwitchatDataTypes.ChatPlatform, uid:string):void {
			delete this.blockedUsers[platform][uid];
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform) {
					this.users[i].is_blocked = false;
					break;
				}
			}
		},

		flagBanned(platform:TwitchatDataTypes.ChatPlatform, uid:string, duration_s?:number):void {
			this.blockedUsers[platform][uid] = true;
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform) {
					this.users[i].is_banned = true;
					break;
				}
			}
			if(unbanFlagTimeouts[uid]) {
				clearTimeout(unbanFlagTimeouts[uid]);
			}
			if(duration_s != undefined) {
				//Auto unflag the user once timeout expires
				unbanFlagTimeouts[uid] = setTimeout(()=> {
					StoreProxy.users.flagUnbanned("twitch", uid);
				}, duration_s*1000)
			}
		},
		
		flagUnbanned(platform:TwitchatDataTypes.ChatPlatform, uid:string):void {
			delete this.blockedUsers[platform][uid];
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform) {
					this.users[i].is_banned = false;
					break;
				}
			}
			if(unbanFlagTimeouts[uid]) {
				clearTimeout(unbanFlagTimeouts[uid]);
			}
		},

		flagOnlineUsers(users:TwitchatDataTypes.TwitchatUser[]):void{
			for (let i = 0; i < users.length; i++) {
				users[i].online = true;
			}
		},

		flagOfflineUsers(users:TwitchatDataTypes.TwitchatUser[]):void{
			for (let i = 0; i < users.length; i++) {
				users[i].online = false;
			}
		},

		//Check if user is following
		async checkFollowerState(user:TwitchatDataTypes.TwitchatUser, channelId?:string):Promise<boolean> {
			if(user.id && StoreProxy.params.appearance.highlightNonFollowers.value === true) {
				if(user.is_following == undefined) {
					try {
						console.log("Check if ", user.displayName, "follows", channelId, "or", UserSession.instance.twitchUser!.id);
						const res = await TwitchUtils.getFollowState(user.id, channelId ?? UserSession.instance.twitchUser!.id)
						user.is_following = res;
						return true;
					}catch(error){};
				}
			}
			return false;
		},

		//Check for user's pronouns
		checkPronouns(user:TwitchatDataTypes.TwitchatUser):Promise<void> {
			if(!user.id || user.pronouns != undefined || StoreProxy.params.features.showUserPronouns.value === false) return Promise.resolve();
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

		flagAsFollower(user:TwitchatDataTypes.TwitchatUser):void {
			user.is_following = true;
		},

		openUserCard(user:TwitchatDataTypes.TwitchatUser) { this.userCard = user; },

		async loadMyFollowings():Promise<void> {
			const followings = await TwitchUtils.getFollowings(UserSession.instance.twitchUser?.id);
			let hashmap:{[key:string]:boolean} = {};
			followings.forEach(v => { hashmap[v.to_id] = true; });
			this.myFollowings["twitch"] = hashmap;
		},

		flagLowTrustMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number) {
			const sChat = storeChat();
			//Ignore message if user is "restricted"
			if(data.low_trust_user.treatment == 'RESTRICTED') return;

			const list = sChat.messages;
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.id == data.message_id && m.type == "message") {
					m.twitch_isLowTrust = true;
					return;
				}
			}

			//If reaching this point, it's most probably because pubsub sent us the
			//event before receiving message on IRC. Wait a little and try again
			if(retryCount != 20) {
				retryCount = retryCount? retryCount++ : 1;
				setTimeout(()=>{
					this.flagLowTrustMessage(data, retryCount);
				}, 100);
			}
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