import DataStore from '@/store/DataStore';
import { COUNTER_VALUE_PLACEHOLDER_PREFIX, TriggerTypes, type TriggerActionTypes, type TriggerTreeItemData, type TriggerData, VALUE_PLACEHOLDER_PREFIX } from '@/types/TriggerActionDataTypes';
import SchedulerHelper from '@/utils/SchedulerHelper';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { ITriggersActions, ITriggersGetters, ITriggersState } from '../StoreProxy';
import Utils from '@/utils/Utils';
import StoreProxy from '../StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';

let discordCmdUpdateDebounce:number = -1;

export const storeTriggers = defineStore('triggers', {
	state: () => ({
		triggerList: [],
		clipboard: [],
		triggerTree: [],
		currentEditTriggerData: null,
		triggerIdToFolderEnabled: {},
	} as ITriggersState),



	getters: {
		
		queues():string[] {
			const done:{[key:string]:boolean} = {};
			const res = [];
			for (const key in this.triggerList) {
				const queue = this.triggerList[key].queue;
				if(queue && !done[queue] && typeof queue == "string") {
					done[queue] = true;
					res.push(queue)
				}
			}
			return res;
		},

	},



	actions: {
		openTriggerEdition(data:TriggerData) {
			this.currentEditTriggerData = data;
			StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
		},
		
		openTriggerList() {
			this.currentEditTriggerData = null;
		},

		addTrigger(data:TriggerData) {
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

		duplicateTrigger(id:string) {
			const trigger = this.triggerList.find(v=> v.id === id);
			if(trigger) {
				const clone:TriggerData = JSON.parse(JSON.stringify(trigger));
				clone.id = Utils.getUUID();
				let name = clone.name || Utils.getTriggerDisplayInfo(clone).label;
				name += " (CLONE)";
				clone.name = name;
				this.triggerList.push(clone);
				this.saveTriggers();
			}
		},

		saveTriggers():void {
			//remove incomplete entries
			function cleanEmptyActions(actions:TriggerActionTypes[]):TriggerActionTypes[] {
				return actions.filter(v=> {
					if(v.type == null) return false;
					return true;
				});
				// .filter(v=> {
				// 	if(v.type == null) return false;
				// 	if(v.type == null) return false;
				// 	if(v.type == "obs") return true;//v.sourceName?.length > 0;
				// 	if(v.type == "chat") return true;//v.text?.length > 0;
				// 	if(v.type == "music") return true;
				// 	if(v.type == "tts") return true;
				// 	if(v.type == "raffle") return true;
				// 	if(v.type == "raffle_enter") return true;
				// 	if(v.type == "bingo") return true;
				// 	if(v.type == "voicemod") return true;
				// 	if(v.type == "highlight") return true;
				// 	if(v.type == "trigger") return true;
				// 	if(v.type == "triggerToggle") return true;
				// 	if(v.type == "http") return true;
				// 	if(v.type == "ws") return true;
				// 	if(v.type == "poll") return true;
				// 	if(v.type == "prediction") return true;
				// 	if(v.type == "count") return true;
				// 	if(v.type == "value") return true;
				// 	if(v.type == "random") return true;
				// 	if(v.type == "stream_infos") return true;
				// 	if(v.type == "delay") return true;
				// 	if(v.type == "goxlr") return true;
				// 	if(v.type == "customBadges") return true;
				// 	if(v.type == "customUsername") return true;
				// 	if(v.type == "chatSugg") return true;
				// 	if(v.type == "customChat") return true;
				// 	if(v.type == "vibrate") return true;
				// 	if(v.type == "heat_click") return true;
				// 	console.warn("Trigger action type not whitelisted on store : "+v.type);
				// 	return false;
				// })

			}
			
			const list = JSON.parse(JSON.stringify(this.triggerList));
			list.forEach((data:TriggerData)=> {
				data.actions = cleanEmptyActions(data.actions);
			})
			
			//Create discord commands if requested by some slash commands
			//and discord is linked
			if(StoreProxy.discord.discordLinked) {
				clearTimeout(discordCmdUpdateDebounce);
				discordCmdUpdateDebounce = setTimeout(() => {
					const commands:{name:string, params:{name:string}[]}[] = [];
					list.forEach((data:TriggerData)=> {
						if(data.type == TriggerTypes.SLASH_COMMAND
						&& data.chatCommand
						&& data.addToDiscord === true) {
							const params: typeof commands[number]["params"] = [];
							if(data.chatCommandParams) {
								data.chatCommandParams.forEach(p => {
									params.push({name:p.tag});
								});
							}
							commands.push({
								name:data.chatCommand.replace(/[^a-z0-9]/gi, ""),
								params
							});
						}
					})
					if(commands.length > 0) {
						ApiHelper.call("discord/commands", "POST", {commands}, false).then(res=>{
							console.log("res=>",res)
						});
					}
				}, 10000);
			}

			DataStore.set(DataStore.TRIGGERS, list);
			TriggerActionHandler.instance.populate(list);
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
			//Search for any trigger linked to the renamed counter and any
			//trigger action updating that counter and rename it
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
				json = json.replace(new RegExp("\\{"+oldPlaceholderLoc+"\\}", "g"), "{"+newPlaceholderLoc.toUpperCase()+"}");
				this.triggerList[i] = JSON.parse(json);
			}
			this.saveTriggers();
		},

		renameValuePlaceholder(oldPlaceholder:string, newPlaceholder:string):void {
			//Search for any trigger linked to the renamed value and any
			//trigger action updating that value and rename it
			for (let i = 0; i < this.triggerList.length; i++) {
				const t = this.triggerList[i];
				let json = JSON.stringify(t);
				
				//Is the old placeholder somewhere on the trigger data ?
				if(json.toLowerCase().indexOf((VALUE_PLACEHOLDER_PREFIX + oldPlaceholder).toLowerCase()) == -1 ) continue;

				//Add placeholders prefix
				let newPlaceholderLoc = VALUE_PLACEHOLDER_PREFIX + newPlaceholder.toUpperCase();
				let oldPlaceholderLoc = VALUE_PLACEHOLDER_PREFIX + oldPlaceholder.toUpperCase();
				//Make it regex safe
				newPlaceholderLoc = newPlaceholderLoc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				oldPlaceholderLoc = oldPlaceholderLoc.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				
				//Nuclear way to replace placeholders on trigger data
				json = json.replace(new RegExp("\\{"+oldPlaceholderLoc+"\\}", "g"), "{"+newPlaceholderLoc.toUpperCase()+"}");
				this.triggerList[i] = JSON.parse(json);
			}
			this.saveTriggers();
		},

		updateTriggerTree(data:TriggerTreeItemData[]):void {
			this.triggerTree = data;
			this.computeTriggerTreeEnabledStates();
			DataStore.set(DataStore.TRIGGERS_TREE, this.triggerTree);
		},

		computeTriggerTreeEnabledStates():void {
			this.triggerIdToFolderEnabled = {};

			/**
			 * Defines if a a trigger is enabled depending on its parent folder/s
			 * @param root 
			 * @param enabled 
			 */
			const parseItem = (root:TriggerTreeItemData[], enabled:boolean = true) => {
				root.forEach(v=> {
					if(v.type == "trigger") {
						this.triggerIdToFolderEnabled[v.triggerId!] = enabled;
					}else
					if(v.type == "folder") {
						parseItem(v.children || [], enabled && v.enabled !== false);
					}
				})
			}

			parseItem(this.triggerTree);
		}

	} as ITriggersActions
	& ThisType<ITriggersActions
		& UnwrapRef<ITriggersState>
		& _StoreWithState<"triggers", ITriggersState, ITriggersGetters, ITriggersActions>
		& _StoreWithGetters<ITriggersGetters>
		& PiniaCustomProperties
	>,
})