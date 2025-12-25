import TwitchatEvent from '@/events/TwitchatEvent';
import { rebuildPlaceholdersCache, type TriggerActionCountDataAction } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ICountersActions, ICountersGetters, ICountersState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

const broadcastTimeoutDebounce:{[key:string]:number} = {};

export const storeCounters = defineStore('counters', {
	state: () => ({
		counterList: [],
		selectedCounterIDs: [],
	} as ICountersState),



	getters: {
	} as ICountersGetters
	& ThisType<UnwrapRef<ICountersState> & _StoreWithGetters<ICountersGetters> & PiniaCustomProperties>
	& _GettersTree<ICountersState>,



	actions: {
		populateData():void {
			//Init counters
			const countersParams = DataStore.get(DataStore.COUNTERS);
			if(countersParams) {
				Utils.mergeRemoteObject(JSON.parse(countersParams), (this.counterList as unknown) as JsonObject);
			}
			
			PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_ADD, (e:TwitchatEvent) => {
				const id = (e.data as JsonObject).counterId as string;
				const action = (e.data as JsonObject).counterAction as TriggerActionCountDataAction;
				const value = parseInt((e.data as JsonObject).countAdd as string);
				const counter = this.counterList.find(v=>v.id == id);
				if(counter && !isNaN(value)) {
					this.increment(id, action || "ADD", value);
				}
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_GET, (e:TwitchatEvent) => {
				const id = (e.data as JsonObject).cid as string;
				this.broadcastCounterValue(id);
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.COUNTER_GET_ALL, (e:TwitchatEvent) => {
				const counters = this.counterList.map(v=> {
					return {
						id:v.id,
						name:v.name,
						perUser:v.perUser === true,
					}
				});
				if(counters) {
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_LIST, {counters});
				}
			});
		},

		addCounter(data:TwitchatDataTypes.CounterData):void {
			this.counterList.push(data);
			this.saveCounters()
			rebuildPlaceholdersCache();
		},

		updateCounter(data:TwitchatDataTypes.CounterData):void {
			for (let i = 0; i < this.counterList.length; i++) {
				const counter = this.counterList[i]!;
				if(counter.id == data.id) {
					if(data.perUser) {
						//Backup users to the new instance
						data.users = counter.users;
					}else{
						delete data.users;
					}
					//If placeholder has been updated, update it on all triggers
					if(data.placeholderKey && data.placeholderKey.toLowerCase() != (counter.placeholderKey ?? "").toLowerCase()) {
						StoreProxy.triggers.renameCounterPlaceholder(counter.placeholderKey, data.placeholderKey);
					}
					//Delete old, add new
					this.counterList.splice(i, 1, data);
					break;
				}
			}

			this.saveCounters();

			this.broadcastCounterValue(data.id);
			rebuildPlaceholdersCache();
		},

		broadcastCounterValue(id:string):void {
			clearTimeout(broadcastTimeoutDebounce[id]);
			//Debounce broadcast to avoid spamming when updating lots of users at once
			broadcastTimeoutDebounce[id] = window.setTimeout(()=>{
				let counter = this.counterList.find(v=> v.id == id);
				if(!counter) return;

				if(counter.perUser) {
					//Clone counter object
					counter = JSON.parse(JSON.stringify(counter)) as TwitchatDataTypes.CounterData;
					//Convert hashmap to sortable array
					const list = counter.users ?? {};
					let users = Object.keys(list).map(v=> ({uid:v, value:list[v]}));
					users.sort((a,b)=>{
						if(a.value!.value > b.value!.value) return -1;
						if(a.value!.value < b.value!.value) return 1;
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
										const data = await TwitchUtils.getUserInfo([res.id]);
										if(data?.length > 0) {
											res.avatarPath = data[0]!.profile_image_url;
										}
									}
									//Add user to leaderboard
									counter!.leaderboard!.push({
										avatar:res.avatarPath!,
										login:res.displayNameOriginal,
										points:v.value!.value
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
							}, undefined, undefined, undefined, false);
						})
					}
				}else{
					//Tell overlays potentially using this value to update
					StoreProxy.labels.broadcastPlaceholders();
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_UPDATE, {counter} as unknown as JsonObject);
				}
				StoreProxy.donationGoals.onSourceValueUpdate("counter", id);
			}, 250);
		},

		delCounter(data:TwitchatDataTypes.CounterData):void {
			for (let i = 0; i < this.counterList.length; i++) {
				if(this.counterList[i]!.id == data.id) {
					this.counterList.splice(i, 1);
					break;
				}
			}
			this.saveCounters()

			//Delete triggers related to the deleted counter
			const triggers = StoreProxy.triggers.triggerList;
			for (const t of triggers) {
				if(t.counterId === data.id){
					StoreProxy.triggers.deleteTrigger(t.id);
				}
			}
			rebuildPlaceholdersCache();
		},

		increment(id:string, action:TriggerActionCountDataAction, value:number, user?:TwitchatDataTypes.TwitchatUser, userId?:string):number {
			const c = this.counterList.find(v=>v.id == id);
			if(!c) return 0;
			let counterValue = c.value;
			if(c.perUser) {
				if(!c.users) c.users = {};
				if(user) {
					if(user.temporary || user.errored) return 0;
					if(!c.users[user.id]) c.users[user.id] = {login:user.login, value:0, platform:user.platform};
					counterValue = c.users[user.id]!.value || 0;
				}else if(userId && c.users[userId]) {
					counterValue = c.users[userId].value || 0;
				}
			}

			switch(action) {
				case "DEL": counterValue -= value; value = -value; break;//Invert value so proper triggers are executed
				case "SET": counterValue = value; break;
				case "ADD":
				default: counterValue += value; break;
			}

			let looped = false;
			let maxed = false;
			let mined = false;
			let canReloop = false;

			if(c.max !== false && counterValue >= c.max) {
				if(counterValue > c.max && c.loop) {
					const min = c.min || 0;
					counterValue = min + counterValue - c.max;
					looped = true;
					maxed = true;
					canReloop = counterValue > c.max && c.min != c.max;//last condition avoids infinite loop
				}else{
					counterValue = c.max || 0;
					maxed = true;
				}
			}else if(c.min !== false && counterValue <= c.min){
				if(counterValue < c.min && c.loop) {
					const max = c.max || 0;
					counterValue = max - (c.min - counterValue);
					looped = true;
					mined = true;
					canReloop = counterValue < c.min && c.min != c.max;//last condition avoids infinite loop
				}else{
					counterValue = c.min || 0;
					mined = true;
				}
			}

			if(c.perUser) {
				const uid = (user? user.id : userId) || "";
				c.users![uid] = {
					login: user?.login || c.users![uid]!.login,
					platform: c.users![uid]?.platform || user?.platform || "twitch",
					value:parseFloat(counterValue.toString())//Forcing parsing as float. For some unsolved reason there was very few cases where value became a string
				}
			}else{
				c.value = parseFloat(counterValue.toString());//Forcing parsing as float. For some unsolved reason there was very few cases where value became a string
			}

			//Do not execute triggers if edditing a user by their ID.
			//If only "userId" is given, don't execute it so we can update
			//loads of counters at once without clogging the trigger system
			if(!userId) {
				const message:TwitchatDataTypes.MessageCounterUpdateData = {
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE,
					counter:c,
					id:Utils.getUUID(),
					platform:"twitchat",
					value: counterValue,
					added: value,
					added_abs: Math.abs(value),
					looped,
					maxed,
					mined,
					user,
					channel_id:StoreProxy.auth.twitch.user.id,
				};

				StoreProxy.chat.addMessage(message);
			}

			this.saveCounters()

			this.broadcastCounterValue(c.id);

			//If counter is over/below the max/min value and should be looped
			//simulate another update to generate another trigger event as
			//much as needed
			if(canReloop) {
				this.increment(id, action, 0, user, userId);
			}
			return counterValue;
		},

		deleteCounterEntry(id:string, user?:TwitchatDataTypes.TwitchatUser, userId?:string):void {
			for (const entry of this.counterList) {
				if(entry.id == id) {
					if(entry.perUser) {
						if(!entry.users) entry.users = {};
						const uid = (user? user.id : userId) || "";
						delete entry.users[uid];
					}
					break;
				}
			}

			this.saveCounters();
		},

		deleteAllCounterEntries(id:string):void {
			for (const entry of this.counterList) {
				if(entry.id == id) {
					entry.users = {};
				}
			}

			this.saveCounters();
		},

		saveCounters():void {
			DataStore.set(DataStore.COUNTERS, this.counterList);
			const counters = this.counterList.map(v=> {
				return {
					id:v.id,
					name:v.name,
					perUser:v.perUser === true,
				}
			});
			if(counters) {
				PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_LIST, {counters});
			}
		}

	} as ICountersActions
	& ThisType<ICountersActions
		& UnwrapRef<ICountersState>
		& _StoreWithState<"counters", ICountersState, ICountersGetters, ICountersActions>
		& _StoreWithGetters<ICountersGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeCounters, import.meta.hot))
}
