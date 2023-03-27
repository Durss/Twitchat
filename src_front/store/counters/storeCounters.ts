import TwitchatEvent from '@/events/TwitchatEvent';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { TriggerTypes } from '@/types/TriggerActionDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ICountersActions, ICountersGetters, ICountersState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

export const storeCounters = defineStore('counters', {
	state: () => ({
		data: [],
	} as ICountersState),



	getters: {
	} as ICountersGetters
	& ThisType<UnwrapRef<ICountersState> & _StoreWithGetters<ICountersGetters> & PiniaCustomProperties>
	& _GettersTree<ICountersState>,



	actions: {
		addCounter(data:TwitchatDataTypes.CounterData):void {
			this.data.push(data);
			DataStore.set(DataStore.COUNTERS, this.data);
		},
		updateCounter(data:TwitchatDataTypes.CounterData):void {
			for (let i = 0; i < this.data.length; i++) {
				if(this.data[i].id == data.id) {
					if(data.perUser) {
						data.users = this.data[i].users;
					}else{
						delete data.users;
					}
					this.data.splice(i, 1, data);
					break;
				}
			}
			DataStore.set(DataStore.COUNTERS, this.data);

			if(!data.perUser) {
				PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_UPDATE, {counter:data} as unknown as JsonObject);
			}
		},
		
		delCounter(data:TwitchatDataTypes.CounterData):void {
			for (let i = 0; i < this.data.length; i++) {
				if(this.data[i].id == data.id) {
					this.data.splice(i, 1);
					break;
				}
			}
			DataStore.set(DataStore.COUNTERS, this.data);

			//Delete triggers related to the deleted counter
			const triggers = StoreProxy.triggers.triggerList;
			for (let i = 0; i < triggers.length; i++) {
				const t = triggers[i];
				if(t.counterID === data.id){
					StoreProxy.triggers.deleteTrigger(t.id);
				}
			}
		},

		increment(id:string, addedValue:number, user?:TwitchatDataTypes.TwitchatUser):void {
			const c = this.data.find(v=>v.id == id);
			if(!c) return;
			let value = c.value;
			if(c.perUser && user) {
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
				looped:false,
				maxed:false,
				mined:false,
				user,
			};
			if(c.max !== false && value >= c.max) {
				if(value > c.max && c.loop) {
					const min = c.min || 0;
					value = min + value % c.max;
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
			DataStore.set(DataStore.COUNTERS, this.data);

			if(!c.perUser) {
				PublicAPI.instance.broadcast(TwitchatEvent.COUNTER_UPDATE, {counter:c});
			}
		},
		
	} as ICountersActions
	& ThisType<ICountersActions
		& UnwrapRef<ICountersState>
		& _StoreWithState<"counters", ICountersState, ICountersGetters, ICountersActions>
		& _StoreWithGetters<ICountersGetters>
		& PiniaCustomProperties
	>,
})