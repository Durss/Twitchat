import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ICountersActions, ICountersGetters, ICountersState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import { rebuildPlaceholdersCache } from '@/types/TriggerActionDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

export const storeCounters = defineStore('counters', {
	state: () => ({
		counterList: [],
	} as ICountersState),



	getters: {
	} as ICountersGetters
	& ThisType<UnwrapRef<ICountersState> & _StoreWithGetters<ICountersGetters> & PiniaCustomProperties>
	& _GettersTree<ICountersState>,



	actions: {
		addCounter(data:TwitchatDataTypes.CounterData):void {
			this.counterList.push(data);
			DataStore.set(DataStore.COUNTERS, this.counterList);
			rebuildPlaceholdersCache();
		},

		updateCounter(data:TwitchatDataTypes.CounterData):void {
			for (let i = 0; i < this.counterList.length; i++) {
				if(this.counterList[i].id == data.id) {
					if(data.perUser) {
						//Backup users to the new instance
						data.users = this.counterList[i].users;
					}else{
						delete data.users;
					}
					//If placeholder has been updated, update it on all triggers
					if((data.placeholderKey ?? "").toLowerCase() != (this.counterList[i].placeholderKey ?? "").toLowerCase()) {
						StoreProxy.triggers.renameCounterPlaceholder(this.counterList[i].placeholderKey, data.placeholderKey);
					}
					//Delete old, add new
					this.counterList.splice(i, 1, data);
					break;
				}
			}

			DataStore.set(DataStore.COUNTERS, this.counterList);

			this.broadcastCounterValue(data.id);
			rebuildPlaceholdersCache();
		},

		broadcastCounterValue(id:string):void {
			let counter = this.counterList.find(v=> v.id == id);
			if(!counter) return;
			
			if(counter.perUser) {
				//Clone counter object
				counter = JSON.parse(JSON.stringify(counter)) as TwitchatDataTypes.CounterData;
				//Convert hashmap to sortable array
				const list = counter.users ?? {};
				let users = Object.keys(list).map(v=> ({uid:v, value:list[v]}));
				users.sort((a,b)=>{
					if(a.value > b.value) return -1;
					if(a.value < b.value) return 1;
					return 0;
				})
				//Only keep top 20 users to avoid clogging WS tunnel
				users = users.splice(0, 20);
				const chanId = StoreProxy.auth.twitch.user.id;
				let loadedUsers = 0;
				counter.leaderboard = [];
				if(users.length == 0) {
					//If there are no user, broadcast right away
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_UPDATE, {counter} as unknown as JsonObject);
				}else{
					///...otherwise load users details
					users.forEach(v=> {
						StoreProxy.users.getUserFrom("twitch", chanId, v.uid, undefined, undefined, async (res)=> {
							loadedUsers ++;
							if(!res.errored) {
								if(!res.avatarPath) {
									//Avatar is missing, get it from twitch
									let data = await TwitchUtils.loadUserInfo([res.id]);
									if(data?.length > 0) {
										res.avatarPath = data[0].profile_image_url;
									}
								}
								//Add user to leaderboard
								counter!.leaderboard!.push({
									avatar:res.avatarPath!,
									login:res.displayName,
									points:v.value
								})
							}
							//All users ready, broadcast change
							if(loadedUsers == users.length) {
								//Sort them by score DESC
								counter!.leaderboard!.sort((a,b)=>{
									if(a.points > b.points) return -1;
									if(a.points < b.points) return 1;
									return 0;
								})
								PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_UPDATE, {counter} as unknown as JsonObject);
							}
						});
					})
				}
			}else{
				PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_UPDATE, {counter} as unknown as JsonObject);
			}
		},
		
		delCounter(data:TwitchatDataTypes.CounterData):void {
			for (let i = 0; i < this.counterList.length; i++) {
				if(this.counterList[i].id == data.id) {
					this.counterList.splice(i, 1);
					break;
				}
			}
			DataStore.set(DataStore.COUNTERS, this.counterList);

			//Delete triggers related to the deleted counter
			const triggers = StoreProxy.triggers.triggerList;
			for (let i = 0; i < triggers.length; i++) {
				const t = triggers[i];
				if(t.counterId === data.id){
					StoreProxy.triggers.deleteTrigger(t.id);
				}
			}
			rebuildPlaceholdersCache();
		},

		increment(id:string, addedValue:number, user?:TwitchatDataTypes.TwitchatUser):void {
			const c = this.counterList.find(v=>v.id == id);
			if(!c) return;
			let value = c.value;
			if(c.perUser && user) {
				if(user.temporary || user.errored) return;
				if(!c.users) c.users = {};
				value = c.users[user.id] || 0;
			}

			value += addedValue;
			const message:TwitchatDataTypes.MessageCounterUpdatesData = {
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE,
				counter:c,
				id:Utils.getUUID(),
				platform:"twitchat",
				value,
				added: addedValue,
				added_abs: Math.abs(addedValue),
				looped:false,
				maxed:false,
				mined:false,
				user,
			};
			
			if(c.max !== false && value >= c.max) {
				if(value > c.max && c.loop) {
					const min = c.min || 0;
					value = min + (value - c.max);
					message.looped = true;
				}else{
					value = c.max || 0;
					message.maxed = true;
				}
			}else if(c.min !== false && value <= c.min){
				if(value < c.min && c.loop) {
					const max = c.max || 0;
					value = max - (c.min - value);
					message.looped = true;
				}else{
					value = c.min || 0;
					message.mined = true;
				}
			}
			//Final clamping just in case we add or remove more than the available range
			//to a looped value.
			if(c.min && value < c.min) value = c.min;
			if(c.max && value > c.max) value = c.max;
			
			if(c.perUser && user) {
				c.users![user.id] = value;
			}else{
				c.value = value;
			}

			message.value = value;

			StoreProxy.chat.addMessage(message);
			DataStore.set(DataStore.COUNTERS, this.counterList);

			this.broadcastCounterValue(c.id);
		},
		
	} as ICountersActions
	& ThisType<ICountersActions
		& UnwrapRef<ICountersState>
		& _StoreWithState<"counters", ICountersState, ICountersGetters, ICountersActions>
		& _StoreWithGetters<ICountersGetters>
		& PiniaCustomProperties
	>,
})