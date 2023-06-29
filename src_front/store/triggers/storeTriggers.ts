import DataStore from '@/store/DataStore';
import { TriggerTypes, type TriggerActionTypes, type TriggerData, COUNTER_VALUE_PLACEHOLDER_PREFIX } from '@/types/TriggerActionDataTypes';
import SchedulerHelper from '@/utils/SchedulerHelper';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { ITriggersActions, ITriggersGetters, ITriggersState } from '../StoreProxy';

export const storeTriggers = defineStore('triggers', {
	state: () => ({
		triggerList: [],
	} as ITriggersState),



	getters: {
		
		queues():string[] {
			const done:{[key:string]:boolean} = {};
			const res = [];
			for (const key in this.triggerList) {
				const queue = this.triggerList[key].queue;
				if(queue && !done[queue]) {
					done[queue] = true;
					res.push(queue)
				}
			}
			return res;
		},

	},



	actions: {
		addTrigger(data:TriggerData) {
			//remove incomplete entries
			function cleanEmptyActions(actions:TriggerActionTypes[]):TriggerActionTypes[] {
				return actions.filter(v=> {
					if(v.type == null) return false;
					if(v.type == "obs") return true;//v.sourceName?.length > 0;
					if(v.type == "chat") return true;//v.text?.length > 0;
					if(v.type == "music") return true;
					if(v.type == "tts") return true;
					if(v.type == "raffle") return true;
					if(v.type == "raffle_enter") return true;
					if(v.type == "bingo") return true;
					if(v.type == "voicemod") return true;
					if(v.type == "highlight") return true;
					if(v.type == "trigger") return true;
					if(v.type == "http") return true;
					if(v.type == "ws") return true;
					if(v.type == "poll") return true;
					if(v.type == "prediction") return true;
					if(v.type == "count") return true;
					if(v.type == "random") return true;
					if(v.type == "stream_infos") return true;
					if(v.type == "delay") return true;
					//@ts-ignore
					console.warn("Trigger action type not whitelisted on store : "+v.type);
					return false;
				})

			}
			data.actions = cleanEmptyActions(data.actions);

			//If it is a schedule trigger add it to the scheduler
			if(data.type === TriggerTypes.SCHEDULE) {
				SchedulerHelper.instance.scheduleTrigger(data);
			}
			
			this.triggerList.push(data);
			this.saveTriggers();
		},

		deleteTrigger(id:string) {
			this.triggerList = this.triggerList.filter(v=> v.id != id);
			this.saveTriggers();
		},

		saveTriggers():void {
			DataStore.set(DataStore.TRIGGERS, this.triggerList);
			TriggerActionHandler.instance.populate(this.triggerList);
		},

		renameOBSSource(oldName:string, newName:string):void {
			//Search for any trigger linked to the renamed source or any
			//trigger action controling that source and rename it
			for (let i = 0; i < this.triggerList.length; i++) {
				const t = this.triggerList[i];
				if(t.obsSource === oldName) t.obsSource = newName;
				if(t.obsInput === oldName) t.obsInput = newName;
				for (let j = 0; j < t.actions.length; j++) {
					const a = t.actions[j];
					if(a.type == "obs") {
						if(a.sourceName == oldName) a.sourceName = newName;
					}
				}
			}
			this.saveTriggers();
		},

		renameOBSScene(oldName:string, newName:string):void {
			//Search for any trigger linked to the renamed scene and any
			//trigger action controling that scene and rename it
			for (let i = 0; i < this.triggerList.length; i++) {
				const t = this.triggerList[i];
				if(t.obsScene === oldName) t.obsInput = newName;
			}
			this.saveTriggers();
		},

		renameOBSFilter(sourceName:string, oldName:string, newName:string):void {
			//Search for any trigger action controling that filter and rename it
			for (let i = 0; i < this.triggerList.length; i++) {
				const t = this.triggerList[i];
				if(t.obsFilter === oldName) t.obsFilter = newName;
				for (let j = 0; j < t.actions.length; j++) {
					const a = t.actions[j];
					if(a.type == "obs" && a.sourceName == sourceName) {
						if(a.filterName == oldName) a.filterName = newName;
					}
				}
			}
			this.saveTriggers();
		},

		renameCounterPlaceholder(oldPlaceholder:string, newPlaceholder:string):void {
			//Search for any trigger linked to the renamed scene and any
			//trigger action controling that scene and rename it
			for (let i = 0; i < this.triggerList.length; i++) {
				const t = this.triggerList[i];
				let json = JSON.stringify(t);
				
				//Is the old placeholder somewhere on the trigger data ?
				if(json.toLowerCase().indexOf((COUNTER_VALUE_PLACEHOLDER_PREFIX + oldPlaceholder).toLowerCase()) == -1 ) continue;

				//Add placeholders prefix
				let newPlaceholderLoc = COUNTER_VALUE_PLACEHOLDER_PREFIX + newPlaceholder.toUpperCase();
				let oldPlaceholderLoc = COUNTER_VALUE_PLACEHOLDER_PREFIX + oldPlaceholder.toUpperCase();
				//Make it regex safe
				newPlaceholderLoc = newPlaceholderLoc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				oldPlaceholderLoc = oldPlaceholderLoc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				
				//Nuclear way to replace placeholders on trigger data
				json = json.replace(new RegExp("\\{"+oldPlaceholderLoc+"\\}", "gi"), "{"+newPlaceholderLoc.toUpperCase()+"}");
				this.triggerList[i] = JSON.parse(json);
			}
			this.saveTriggers();
		},

	} as ITriggersActions
	& ThisType<ITriggersActions
		& UnwrapRef<ITriggersState>
		& _StoreWithState<"triggers", ITriggersState, ITriggersGetters, ITriggersActions>
		& _StoreWithGetters<ITriggersGetters>
		& PiniaCustomProperties
	>,
})