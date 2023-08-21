import { rebuildPlaceholdersCache } from '@/types/TriggerActionDataTypes';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { IValuesActions, IValuesGetters, IValuesState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';
import Utils from '@/utils/Utils';

export const storeValues = defineStore('values', {
	state: () => ({
		valueList: [],
	} as IValuesState),



	getters: {
	} as IValuesGetters
	& ThisType<UnwrapRef<IValuesState> & _StoreWithGetters<IValuesGetters> & PiniaCustomProperties>
	& _GettersTree<IValuesState>,



	actions: {
		addValue(data:TwitchatDataTypes.ValueData):void {
			this.valueList.push(data);
			DataStore.set(DataStore.VALUES, this.valueList);
			rebuildPlaceholdersCache();
		},

		updateValue(id:string, data:Partial<TwitchatDataTypes.ValueData>):void {
			let prevValue = "";
			for (let i = 0; i < this.valueList.length; i++) {
				if(this.valueList[i].id == id) {
					const d = this.valueList[i];
					prevValue = d.value;
					if(data.name) d.name = data.name;
					if(data.value) d.value = data.value;
					if(data.placeholderKey) d.placeholderKey = data.placeholderKey;

					if(d.value != prevValue) {
						const message:TwitchatDataTypes.MessageValueUpdateData = {
							date:Date.now(),
							type:TwitchatDataTypes.TwitchatMessageType.VALUE_UPDATE,
							id:Utils.getUUID(),
							platform:"twitchat",
							value:d,
							newValue: d.value,
							oldValue: prevValue,
						};
						console.log("Send message", message);
						StoreProxy.chat.addMessage(message);
					}
					break;
				}
			}

			DataStore.set(DataStore.VALUES, this.valueList);
		},
		
		delValue(data:TwitchatDataTypes.ValueData):void {
			for (let i = 0; i < this.valueList.length; i++) {
				if(this.valueList[i].id == data.id) {
					this.valueList.splice(i, 1);
					break;
				}
			}
			DataStore.set(DataStore.VALUES, this.valueList);

			// Delete triggers related to the deleted value
			const triggers = StoreProxy.triggers.triggerList;
			for (let i = 0; i < triggers.length; i++) {
				const t = triggers[i];
				if(t.valueId === data.id){
					StoreProxy.triggers.deleteTrigger(t.id);
				}
			}
			rebuildPlaceholdersCache();
		},

		
	} as IValuesActions
	& ThisType<IValuesActions
		& UnwrapRef<IValuesState>
		& _StoreWithState<"counters", IValuesState, IValuesGetters, IValuesActions>
		& _StoreWithGetters<IValuesGetters>
		& PiniaCustomProperties
	>,
})