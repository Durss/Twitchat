import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import { reactive, type UnwrapRef } from 'vue';
import { storeChat } from '../chat/storeChat';
import type { IUsersActions, IUsersGetters, IUsersState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

let unbanFlagTimeouts:{[key:string]:number} = {};
let userMaps:Partial<{[key in TwitchatDataTypes.ChatPlatform]:{
	idToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
	loginToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
	displayNameToUser:{[key:string]:TwitchatDataTypes.TwitchatUser},
}}> = {};

let twitchUserBatchToLoad:{channelId?:string, user:TwitchatDataTypes.TwitchatUser}[] = [];
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
			let hashmaps = userMaps[platform];
			if(!hashmaps){
				hashmaps = {
					idToUser:{},
					loginToUser:{},
					displayNameToUser:{},
				};
				userMaps[platform] = hashmaps;
			}
			if(login) login = login.toLowerCase();
			if(id && hashmaps.idToUser[id])								user = hashmaps.idToUser[id];
			if(login && hashmaps.loginToUser[login])						user = hashmaps.loginToUser[login];
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
						pronouns:false,
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
						id:id??"temporary_"+Utils.getUUID(),
						login:login??displayName??"",
						displayName:displayName??login??"",
						greeted:false,
						temporary:true,
						pronouns:false,
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
						is_following:channelId == user.id? true : null,
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

			if(userExisted) return user;

			if(platform == "twitch") {
				const batchMode = !id && login;
				
				if(!user!.displayName) user!.displayName = "...loading...";
				if(!user!.login) user!.login = "...loading...";
				
				//Wait half a second to let time to external code to populate the
				//object with more details like in TwitchMessengerClient that calls
				//this method, then populates the is_partner and is_affiliate and
				//other fields from IRC tags which avoids the need to get the users
				//details via an API call.
				const to = setTimeout(()=> {
					if(!user!.temporary && id && login) {
						//User not pending for necessary data loading, check if the
						//partner/affiliate state is defined, if so, just stop there
						//Otherwise, load full info from API
						if(user!.is_partner != undefined) return;
						if(user!.is_affiliate != undefined) return;
					}
					
					const logins = twitchUserBatchToLoad.map(v=> v.user.login);
console.log("load", id);
					TwitchUtils.loadUserInfo(id? [id] : undefined, !id? logins : undefined).then(async (res) => {
						user = user!;
						if(res.length > 0) {
							for (let i = 0; i < res.length; i++) {
								const u = res[i];
								let index = twitchUserBatchToLoad.findIndex(v => v.user.login === u.login);
								let userLocal = user;
								if(batchMode) {
									const data = twitchUserBatchToLoad.splice(index, 1)[0];
									userLocal = data.user;
									channelId = data.channelId;
								}
								if(!userLocal) {
									console.warn("Could not load back the user \""+u.login+"\" from the batch ref");
									continue;
								}
								userLocal.id				= u.id;
								userLocal.login				= u.login;
								userLocal.displayName		= u.display_name;
								userLocal.is_partner		= u.broadcaster_type == "partner";
								userLocal.is_affiliate		= userLocal.is_partner || u.broadcaster_type == "affiliate";
								userLocal.avatarPath		= u.profile_image_url;
								if(userLocal.id)			hashmaps!.idToUser[userLocal.id] = userLocal;
								if(userLocal.login)			hashmaps!.loginToUser[userLocal.login] = userLocal;
								if(userLocal.displayName)	hashmaps!.displayNameToUser[userLocal.displayName] = userLocal;
								if(userLocal.temporary) {
									delete userLocal.temporary;
									this.users.push(userLocal);
									this.checkPronouns(userLocal);
									if(channelId) this.checkFollowerState(userLocal, channelId);
									if(loadCallback) loadCallback(userLocal);
								}
							}
						}else{
							user.displayName = "error(#"+(user!.id)+")";
							user.login = "error(#"+(user!.id)+")";
							user.errored = true;
							delete user.temporary;
							if(loadCallback) loadCallback(user);
						}
					});
				}, 500);
				//Only batch requests by login
				if(batchMode) {
					twitchUserBatchToLoad.push({user, channelId});
					if(twitchUserBatchTimeout > -1) clearTimeout(twitchUserBatchTimeout);
					twitchUserBatchTimeout = to;
				}
			}
			
			//Attribute a random color to the user (overwrite that externally if necessary)
			user.color = Utils.pickRand(["#ff0000","#0000ff","#008000","#b22222","#ff7f50","#9acd32","#ff4500","#2e8b57","#daa520","#d2691e","#5f9ea0","#1e90ff","#ff69b4","#8a2be2","#00ff7f"]);

			if(user.id)				hashmaps.idToUser[user.id] = user;
			if(user.login)			hashmaps.loginToUser[user.login] = user;
			if(user.displayName)	hashmaps.displayNameToUser[user.displayName] = user;

			if(user.temporary != true) {
				this.users.push(user);
				this.checkPronouns(user);
				if(channelId)		this.checkFollowerState(user, channelId);
				if(loadCallback)	loadCallback(user);
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
			this.blockedUsers[platform][uid] = true;
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_banned = true;
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
			delete this.blockedUsers[platform][uid];
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.id === uid && platform == u.platform && this.users[i].channelInfo[channelId]) {
					this.users[i].channelInfo[channelId].is_banned = false;
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