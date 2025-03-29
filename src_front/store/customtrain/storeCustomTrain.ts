import TwitchatEvent from "@/events/TwitchatEvent";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ICustomTrainActions, ICustomTrainGetters, ICustomTrainState } from '../StoreProxy';
import StoreProxy from "../StoreProxy";
import SetTimeoutWorker from "@/utils/SeTimeoutWorker";
import MessengerProxy from "@/messaging/MessengerProxy";

let simulationID = 0;

export const storeCustomTrain = defineStore('customTrain', {
	state: () => ({
		customTrainList:[],
		customTrainStates:{},
	} as ICustomTrainState),



	getters: {
	},



	actions: {
		populateData():void {
			//Init customTrain params
			const customTrainParams = DataStore.get(DataStore.CUSTOM_TRAIN_CONFIGS);
			if(customTrainParams) {
				const data = JSON.parse(customTrainParams);
				this.customTrainList = data.customTrainList || [];
			}

			/**
			 * Called when animatedtext overlay requests for a animatedtext info
			 */
			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CUSTOM_TRAIN_STATE, (event:TwitchatEvent<{ id?:string }>)=> {
				if(event.data?.id) {
					this.broadcastStates(event.data.id);
				}else{
					//Broadcast all states
					for (let i = 0; i < this.customTrainList.length; i++) {
						const entry = this.customTrainList[i];
						this.broadcastStates(entry.id);
					}
				}
			});
		},

		broadcastStates(id?:string):void {
			for (let i = 0; i < this.customTrainList.length; i++) {
				const entry = this.customTrainList[i];
				if(id && entry.id !== id || !entry.enabled) continue;
				const state = this.customTrainStates[entry.id];
				if(!state || state.activities.length < 2) continue;

				PublicAPI.instance.broadcast(TwitchatEvent.CUSTOM_TRAIN_STATE, {configs:entry, state:state as unknown as JsonObject});
			}
		},

		createCustomTrain():void {
			this.customTrainList.push({
				id: Utils.getUUID(),
				enabled:true,
				testing:false,
				title:StoreProxy.i18n.t("overlay.customTrain.default_title"),
				levelName:"LVL ",
				currency:"$"+Utils.CURRENCY_AMOUNT_TOKEN,
				colorFill:"#008667",
				colorBg:"#cdfef2",
				triggerEventCount:2,
				textSize:30,
				textFont:"Inter",
				postLevelUpOnChat:false,
				approachingLabel:StoreProxy.i18n.t("overlay.customTrain.param_approachingLabel_default"),
				approachingEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_c1f4899e65cf4f53b2fd98e15733973a/animated/light/3.0",
				successLabel:StoreProxy.i18n.t("overlay.customTrain.param_successLabel_default"),
				successLabelSummary:StoreProxy.i18n.t("overlay.customTrain.param_successLabel_summary"),
				successEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_bf888b2af57b4abd80653dff26768ae5/animated/dark/3.0",
				levelUpLabel:StoreProxy.i18n.t("overlay.customTrain.param_levelUpLabel_default"),
				levelUpEmote:"https://static-cdn.jtvnw.net/emoticons/v2/62836/static/light/3.0",
				failedLabel:StoreProxy.i18n.t("overlay.customTrain.param_failedLabel_default"),
				failedEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_db3cd788399347a8b2ebfb8a85f5badb/static/light/3.0",
				recordLabel:StoreProxy.i18n.t("overlay.customTrain.param_recordLabel_default"),
				recordEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_dee4ecfb7f0940bead9765da02c57ca9/static/light/3.0",
				recordColorBg:"#fff7db",
				recordColorFill:"#e6b400",
				cooldownDuration_s:2*3600,
				levelsDuration_s:5*60,
				expires_at:0,
				coolDownEnd_at:0,
				postLevelUpChatMessage:StoreProxy.i18n.t("overlay.customTrain.param_postLevelUpChatMessage"),
				postSuccessChatMessage:StoreProxy.i18n.t("overlay.customTrain.param_postSuccessChatMessage"),
				postSuccessOnChat:false,
				levelAmounts:[20, 50, 75, 100, 130, 170, 200, 250, 300, 350, 400, 500],
				platforms:{
					kofi:true,
					streamelements:true,
					patreon:true,
					streamlabs:true,
					tipeee:true,
					tiltify:true,
					streamlabs_charity:true,
					twitch_charity:true,
				}

			});
			this.saveData();
		},

		deleteCustomTrain(id:string):void {
			const index = this.customTrainList.findIndex(t=> t.id === id);
			if(index == -1) return;
			StoreProxy.main.confirm(StoreProxy.i18n.t("overlay.customTrain.delete_confirm.title"), StoreProxy.i18n.t("overlay.customTrain.delete_confirm.message"))
			.then(()=> {
				this.customTrainList.splice(index, 1);
				this.saveData();
			}).catch(_=> {});
		},

		registerActivity(messageId:string, platform:ICustomTrainState["customTrainStates"][string]["activities"][number]["platform"], amount:number):void {
			for (let i = 0; i < this.customTrainList.length; i++) {
				const train = this.customTrainList[i];
				// Train disabled, ignore it
				if(!train.enabled) continue;
				// Platform not enabled, ignore it
				if(platform != "trigger" && train.platforms[platform] !== true) continue;
				// Check if train/level is expired and on cooldown
				if(Date.now() < train.coolDownEnd_at) {
					if(train.testing) {
						// Reset train if it was being tested
						// Makes sure the train doesn't get stuck if reloading
						// twitchat while a test is running
						train.expires_at = 0;
						train.testing = false;
						delete this.customTrainStates[train.id];
					}else {
						continue;
					}
				}

				// Schedule train end
				const scheduleEnd = () => {
					const state = this.customTrainStates[train.id];
					if(state.timeoutRef) SetTimeoutWorker.instance.delete(state.timeoutRef)
					state.timeoutRef = SetTimeoutWorker.instance.create(()=> {
						// Function called when train ends
						const level = currentLevel();
						const total = state.activities.map(a=> a.amount).reduce((a,b)=> a + b, 0);
						const percent = (total - level.offset) / level.goal;
						train.coolDownEnd_at = Date.now() + train.cooldownDuration_s * 1000;
						train.expires_at = 0;
						delete this.customTrainStates[train.id];
						// Set all time record if none exist yet
						if(!train.testing && !train.allTimeRecord && level.index > 1) {
							train.allTimeRecord = {
								amount:total,
								date: Date.now(),
								level: level.index,
								percent,
							}
						}
						this.saveData();

						const message:TwitchatDataTypes.MessageCustomTrainSummaryData = {
							channel_id:StoreProxy.auth.twitch.user.id,
							date:Date.now(),
							id:Utils.getUUID(),
							platform:"twitchat",
							type:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_SUMMARY,
							trainId:train.id,
							trainName:train.title,
							amount:state.amount,
							level:level.index,
							percent,
							isRecord:train.allTimeRecord?.amount === state.amount,
							activities:state.activities.concat(),
						};
						StoreProxy.chat.addMessage(message);

						if(train.postSuccessOnChat && train.postSuccessChatMessage) {
							const message = train.postSuccessChatMessage
								.replace(/\{LEVEL\}/gi, level.index.toString())
								.replace(/\{AMOUNT\}/gi, Utils.formatCurrency(state.amount, train.currency))
							MessengerProxy.instance.sendMessage(message);
						}
					}, train.expires_at - Date.now());
				}

				// Init train state if not already initialized
				if(!this.customTrainStates[train.id]) {
					this.customTrainStates[train.id] = {
						approached_at:Date.now(),
						levelStarted_at:0,
						amount:0,
						activities:[],
					};
					scheduleEnd();
				}

				// Get current level info
				const currentLevel = () => {
					const state = this.customTrainStates[train.id];
					if(!state || !train) return {index:0, offset:0, goal:1};
					if(state.activities.length <= train.triggerEventCount) return {index:0, offset:0, goal:1};

					const levels = train.levelAmounts.concat().sort((a,b)=>a - b);
					levels.unshift(0);

					// Find neareset level
					let offset = 0;
					let goal = levels[0] || 0;
					let i = 0;
					for (i = 1; i < levels.length; i++) {
						const level = levels[i];
						if(level > state.amount || i === levels.length - 1) {
							offset = levels[i-1];
							goal = level - offset;
							break;
						}
					}
					return {index:i, offset, goal}
				}

				// Keep this above the amount update
				const prevLevel = currentLevel();

				if(this.customTrainStates[train.id].activities.length == 0) {
					// static 2 min 30 s cooldown for "approaching" validation
					train.expires_at = Date.now() + 2.5 * 60 * 1000;
					scheduleEnd();
				}

				// Register activity
				this.customTrainStates[train.id].amount += amount;
				this.customTrainStates[train.id].activities.push({
					id:Utils.getUUID(),
					platform,
					amount,
					created_at:Date.now(),
					messageId,
				})

				// New all time record ?
				if(!train.testing // Don't register if testing a fake train
					&& train.allTimeRecord
					&& this.customTrainStates[train.id].amount > train.allTimeRecord.amount) {
						const levels = train.levelAmounts.concat();
						levels.unshift(0);

						let offset = 0;
						let goal = levels[0] || 0;
						let i = 0;
						const amount = this.customTrainStates[train.id].amount;
						for (i = 1; i < levels.length; i++) {
							const level = levels[i];
							if(level > amount || i === levels.length - 1) {
								offset = levels[i-1];
								goal = level - offset;
								break;
							}
						}

						train.allTimeRecord.amount = amount;
						train.allTimeRecord.date = Date.now();
						train.allTimeRecord.level = i;
						train.allTimeRecord.percent = (amount - offset) / goal;
					}

				// Level up ?
				const newLevel = currentLevel();
				if(newLevel.index !== prevLevel.index) {
					train.expires_at = Date.now() + train.levelsDuration_s * 1000;
					scheduleEnd();

					// if(prevLevel.index > 0) {
						const message:TwitchatDataTypes.MessageCustomTrainLevelUpData = {
							channel_id:StoreProxy.auth.twitch.user.id,
							date:Date.now(),
							id:Utils.getUUID(),
							platform:"twitchat",
							type:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_LEVEL_UP,
							trainId:train.id,
							trainName:train.title,
							amount:this.customTrainStates[train.id].amount,
							level:newLevel.index,
							percent:(this.customTrainStates[train.id].amount - newLevel.offset) / newLevel.goal,
							isRecord:train.allTimeRecord?.amount === this.customTrainStates[train.id].amount,
						};

						StoreProxy.chat.addMessage(message);

						if(train.postLevelUpOnChat && train.postLevelUpChatMessage) {
							const message = train.postLevelUpChatMessage
								.replace(/\{LEVEL\}/gi, newLevel.index.toString())
								.replace(/\{AMOUNT\}/gi, Utils.formatCurrency(Math.ceil(train.levelAmounts[newLevel.index-1] - this.customTrainStates[train.id].amount), train.currency))
							MessengerProxy.instance.sendMessage(message);
						}
					// }
				}

				this.saveData();
			}
			this.broadcastStates();
		},

		async simulateTrain(overlayId:string):Promise<void> {
			const train = this.customTrainList.find(t=> t.id === overlayId);
			if(!train) return;

			const state = this.customTrainStates[train.id];
			if(state?.timeoutRef) SetTimeoutWorker.instance.delete(state.timeoutRef)

			simulationID ++;
			const simulationIDLocal = simulationID;
			train.expires_at = 0;
			train.coolDownEnd_at = 0;
			train.testing = true;

			delete this.customTrainStates[train.id];
			this.broadcastStates(train.id);
			await Utils.promisedTimeout(250);
			if(simulationIDLocal !== simulationID) return;
			const levels = train.levelAmounts.concat();

			for (let i = 0; i < train.triggerEventCount; i++) {
				this.registerActivity("", "trigger", levels[0]/2/(train.triggerEventCount+1));
				await Utils.promisedTimeout(3000);
				if(simulationIDLocal !== simulationID) return;
			}
			this.registerActivity("", "trigger", levels[0]/2/2);
			await Utils.promisedTimeout(3000);
			if(simulationIDLocal !== simulationID) return;
			this.registerActivity("", "trigger", levels[0]/2/2);
			await Utils.promisedTimeout(2000);
			if(simulationIDLocal !== simulationID) return;
			this.registerActivity("", "trigger", levels[0]/train.triggerEventCount + 1);
			await Utils.promisedTimeout(1000);
			if(simulationIDLocal !== simulationID) return;
			for (let i = 1; i < Math.min(levels.length, 3); i++) {
				let splits = Math.ceil(Math.random() * 5 + 1);
				const goal = levels[i] - levels[i-1] * (Math.random() * 0.75 + .25);
				for (let i = 0; i < splits; i++) {
					if(simulationIDLocal !== simulationID) return;
					this.registerActivity("", "trigger", goal/splits);
					await Utils.promisedTimeout(1000 + Math.random() * 5000);
				}
			}
			train.expires_at = 0;
		},

		saveData():void {
			this.customTrainList.forEach((train) => {
				//Make sure levels are sorted by amount
				train.levelAmounts.sort((a,b)=>a - b);
			});
			const data:CustomTrainStoreData = {
				customTrainList:this.customTrainList,
			};
			DataStore.set(DataStore.CUSTOM_TRAIN_CONFIGS, data);
		},

	} as ICustomTrainActions
	& ThisType<ICustomTrainActions
		& UnwrapRef<ICustomTrainState>
		& _StoreWithState<"customTrain", ICustomTrainState, ICustomTrainGetters, ICustomTrainActions>
		& _StoreWithGetters<ICustomTrainGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeCustomTrain, import.meta.hot))
}

export interface CustomTrainStoreData {
	customTrainList:TwitchatDataTypes.CustomTrainData[];
}
