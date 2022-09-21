import type { TwitchDataTypes } from '@/types/TwitchDataTypes';
import type { TrackedUser } from '@/utils/CommonDataTypes';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import type { PubSubDataTypes } from '@/utils/PubSubDataTypes';
import { defineStore } from 'pinia';
import type { ChatUserstate } from 'tmi.js';
import { storeChat } from '../chat/storeChat';

export const storeUsers = defineStore('users', {
	state: () => ({
		userCard: null as string|null,
		pronouns: {} as {[key:string]:string|boolean},
		onlineUsers: [] as string[],
		trackedUsers: [] as TrackedUser[],
		mods:[] as TwitchDataTypes.ModeratorUser[],
		followingStates: {} as {[key:string]:boolean},
		followingStatesByNames: {} as {[key:string]:boolean},
	}),



	getters: {
	},



	actions: {
		openUserCard(payload:string|null) { this.userCard = payload; },

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
				const m = list[i] as IRCEventDataList.Message;
				if(m.tags.id == data.message_id) {
					m.lowTrust = true;
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