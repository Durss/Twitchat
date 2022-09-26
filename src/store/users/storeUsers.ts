import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { TrackedUser } from '@/utils/CommonDataTypes';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import type { PubSubDataTypes } from '@/utils/PubSubDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import { defineStore } from 'pinia';
import type { ChatUserstate } from 'tmi.js';
import { storeChat } from '../chat/storeChat';

export const storeUsers = defineStore('users', {
	state: () => ({
		users: [] as TwitchatDataTypes.TwitchatUser[],
		userCard: null as string|null,
		onlineUsers: [] as string[],
		trackedUsers: [] as TrackedUser[],
		mods:[] as TwitchDataTypes.ModeratorUser[],
		pronouns: {} as {[key:string]:string|boolean},
		followingStates: {} as {[key:string]:boolean},
		followingStatesByNames: {} as {[key:string]:boolean},
		myFollowings: {} as {[key:string]:boolean},
	}),



	getters: {
	},



	actions: {
		/**
		 * Gets a user by their source from their ID nor login.
		 * It registers the user on the local DB "this.users" to get them back later.
		 * If only the login is given, the user's data are loaded asynchronously from
		 * remote API then added to the local DB while returning a temporary user object.
		 * 
		 * @param source 
		 * @param id 
		 * @param login 
		 * @param displayName 
		 * @returns 
		 */
		getUserFrom(source:TwitchatDataTypes.ChatSource, id?:string, login?:string, displayName?:string):TwitchatDataTypes.TwitchatUser|undefined {
			let user:TwitchatDataTypes.TwitchatUser|undefined;
			//Don't use "users.find(...)", perfs are much lower than good old for() loop
			//find() takes ~10-15ms for 1M users VS ~3-4ms for the for() loop
			for (let i = 0; i < this.users.length; i++) {
				const u = this.users[i];
				if(u.source != source) continue;
				if(u.id === id) { user = u; break; }
				if(u.login === login) { user = u; break; }
			}
			//Create user if enough given info
			if(!user && id && login) {
				if(!displayName) displayName = login;
				user = { source, id, login, displayName };
				this.users.push(user);
			}
			//If we don't have enough info, create a temp user object and load
			//its details from the API then register it if found.
			if(!user && (login || id)) {
				user = { source, id:id??"", login:login??"", displayName:login??"", temporary:true};
				if(source == "twitch") {
					TwitchUtils.loadUserInfo(id? [id] : undefined, login ? [login] : undefined).then(res => {
						if(res.length > 0) {
							user!.id = res[0].id;
							user!.login = res[0].login;
							user!.displayName = res[0].display_name;
							delete user!.temporary;
							this.users.push(user!);
						}
					});
				}
			}
			return user;
		},

		addUser(user:TwitchatDataTypes.TwitchatUser):void {
			const exists = this.getUserFrom(user.source, user.id, user.login);
			if(!exists) {
				this.users.push(user);
			}
		},

		openUserCard(payload:string|null) { this.userCard = payload; },

		async loadMyFollowings():Promise<void> {
			const followings = await TwitchUtils.getFollowings(UserSession.instance.twitchUser?.id);
			let hashmap:{[key:string]:boolean} = {};
			followings.forEach(v => {
				hashmap[v.to_id] = true;
			});
			this.myFollowings = hashmap;
		},

		setViewersList(users:string[]) {
			//Dedupe users
			const list:string[] = [];
			const done:{[key:string]:boolean} = {};
			for (let i = 0; i < users.length; i++) {
				const user = users[i];
				if(!done[user]) {
					list.push(user);
					done[user] = true;
				}
			}
			this.onlineUsers.splice(0, this.onlineUsers.length);//cleanup prev users
			this.onlineUsers = this.onlineUsers.concat(list);//Add new users
			//Don't just do "this.onlineUsers = users" or the arrays's reference/reactivity
			//accross the app would be broken
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

		trackUser(payload:IRCEventDataList.Message) {
			const list = this.trackedUsers as TrackedUser[];
			const index = list.findIndex(v=>v.user['user-id'] == payload.tags['user-id']);
			if(index == -1) {
				//Was not tracked, track the user
				this.trackedUsers.push({user:payload.tags, messages:[payload]});
			}else{
				//User was already tracked, untrack her/him
				list.splice(index,1);
			}
		},

		untrackUser(payload:ChatUserstate) {
			const list = this.trackedUsers as TrackedUser[];
			const index = list.findIndex(v=>v.user['user-id'] == payload['user-id']);
			if(index != -1) {
				this.trackedUsers.splice(index, 1);
			}
		},
	},
})