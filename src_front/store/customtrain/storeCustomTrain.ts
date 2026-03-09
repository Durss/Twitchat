import MessengerProxy from "@/messaging/MessengerProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import SetTimeoutWorker from "@/utils/SetTimeoutWorker";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ICustomTrainActions, ICustomTrainGetters, ICustomTrainState } from '../StoreProxy';
import StoreProxy from "../StoreProxy";

let simulationID = 0;
const APPROACHING_TIMEOUT_PER_ACTION = 10 * 60_000;

export const storeCustomTrain = defineStore('customTrain', {
	state: () => ({
		customTrainList:[],
		customTrainStates:{},
		selectedCustomTrainIDs:[],
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
			PublicAPI.instance.addEventListener("GET_CUSTOM_TRAIN_DATA", (event)=> {
				if(event.data?.id) {
					this.broadcastStates(event.data.id);
				}else{
					//Broadcast all states
					for (const entry of this.customTrainList) {
						this.broadcastStates(entry.id);
					}
				}
			});

			this.broadcastStates();
		},

		broadcastStates(id?:string):void {
			for (const entry of this.customTrainList) {
				if(id && entry.id !== id || !entry.enabled) continue;
				const state = this.customTrainStates[entry.id]!;
				PublicAPI.instance.broadcast("ON_CUSTOM_TRAIN_DATA", {configs:entry, state});
			}
		},

		createCustomTrain():void {
			this.customTrainList.push({
				id: Utils.getUUID(),
				enabled:true,
				testing:false,
				title:StoreProxy.i18n.t("overlay.customTrain.default_title"),
				levelName:"LVL ",
				currency:"$"+Utils.CURRENCY_AMOUNT_TOKEN,
				colorFill:"#008667",
				colorBg:"#cdfef2",
				approachEventCount:2,
				triggerEventCount:3,
				textSize:50,
				textFont:"Inter",
				postLevelUpOnChat:false,
				approachingLabel:StoreProxy.i18n.t("overlay.customTrain.param_approachingLabel_default"),
				approachingEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_c1f4899e65cf4f53b2fd98e15733973a/animated/dark/2.0",
				successLabel:StoreProxy.i18n.t("overlay.customTrain.param_successLabel_default"),
				successLabelSummary:StoreProxy.i18n.t("overlay.customTrain.param_successLabel_summary"),
				successEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_bf888b2af57b4abd80653dff26768ae5/animated/dark/2.0",
				levelUpLabel:StoreProxy.i18n.t("overlay.customTrain.param_levelUpLabel_default"),
				levelUpEmote:"https://static-cdn.jtvnw.net/emoticons/v2/62836/static/dark/2.0",
				failedLabel:StoreProxy.i18n.t("overlay.customTrain.param_failedLabel_default"),
				failedEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_db3cd788399347a8b2ebfb8a85f5badb/static/dark/2.0",
				recordLabel:StoreProxy.i18n.t("overlay.customTrain.param_recordLabel_default"),
				recordEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_dee4ecfb7f0940bead9765da02c57ca9/static/dark/2.0",
				recordColorBg:"#fff7db",
				recordColorFill:"#e6b400",
				cooldownDuration_s:1*3600,
				levelsDuration_s:5*60,
				expires_at:0,
				coolDownEnd_at:0,
				postLevelUpChatMessage:StoreProxy.i18n.t("overlay.customTrain.param_postLevelUpChatMessage"),
				postSuccessChatMessage:StoreProxy.i18n.t("overlay.customTrain.param_postSuccessChatMessage"),
				postSuccessOnChat:false,
				levelAmounts:[20, 50, 75, 100, 130, 170, 200, 250, 300, 350, 400, 500, 600, 700, 800, 900],
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
			//Just a failsafe to avoid crashing train if a platform sends shitty data (hey streamlabs o/)
			//that's not properly filtered earlier in the chain
			amount = parseFloat(amount as unknown as string);
			if(typeof amount !== "number" || isNaN(amount)) {
				console.warn("CustomTrain: Ignoring invalid activity amount", amount, "from platform", platform);
				return;
			}
			for (const train of this.customTrainList) {
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
				const scheduleEnd = (isMissedTrain:boolean = false) => {
					const state = this.customTrainStates[train.id];
					if(!state) return;
					if(state.timeoutRef) SetTimeoutWorker.instance.delete(state.timeoutRef)
					state.timeoutRef = SetTimeoutWorker.instance.create(()=> {
						// Function called when train ends
						const level = currentLevel();
						const total = state.activities.map(a=> a.amount).reduce((a,b)=> a + b, 0);
						const percent = (total - level.offset) / level.goal;
						// If train went away before starting, only set a 10s cooldown for the fail animation to complete,
						// otherwise set the cooldown to the normal duration
						train.coolDownEnd_at = isMissedTrain? Date.now() + 10_000 : Date.now() + train.cooldownDuration_s * 1000;
						train.expires_at = 0;
						delete this.customTrainStates[train.id];

						// Not enough activities to trigger the train, send "fail" message
						if(state.activities.length <= train.triggerEventCount) {
							const notification:TwitchatDataTypes.MessageCustomTrainFailData = {
								channel_id:StoreProxy.auth.twitch.user.id,
								date:Date.now(),
								id:Utils.getUUID(),
								platform:"twitchat",
								type:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_FAIL,
								trainId:train.id,
								trainName:train.title,
								fake:train.testing,
							};
							StoreProxy.chat.addMessage(notification);
							return;
						}

						// Set all time record if none exist yet
						if(!train.testing && !train.allTimeRecord && level.index > 1) {
							train.allTimeRecord = {
								amount:total,
								date: Date.now(),
							}
						}

						const notification:TwitchatDataTypes.MessageCustomTrainSummaryData = {
							channel_id:StoreProxy.auth.twitch.user.id,
							date:Date.now(),
							id:Utils.getUUID(),
							platform:"twitchat",
							type:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_SUMMARY,
							trainId:train.id,
							trainName:train.title,
							amount:state.amount,
							amountFormatted:Utils.formatCurrency(state.amount, train.currency),
							level:level.index,
							percent:Math.floor(percent * 100),
							isRecord:train.allTimeRecord?.amount === state.amount,
							activities:state.activities.concat(),
							fake:train.testing,
						};
						StoreProxy.chat.addMessage(notification);

						if(train.postSuccessOnChat && train.postSuccessChatMessage) {
							const message = train.postSuccessChatMessage
								.replace(/\{LEVEL\}/gi, level.index.toString())
								.replace(/\{AMOUNT\}/gi, Utils.formatCurrency(state.amount, train.currency))
							MessengerProxy.instance.sendMessage(message);
						}

						train.testing = false;
						this.saveData();
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
						const level = levels[i]!;
						if(level > state.amount || i === levels.length - 1) {
							offset = levels[i-1]!;
							goal = level - offset;
							break;
						}
					}
					return {index:i, offset, goal}
				}

				const trainState = this.customTrainStates[train.id]!;
				if(trainState.activities.length == 0
				|| trainState.activities.length + 1 == train.approachEventCount) {
					// static cooldown to get approaching train or to start it
					train.expires_at = Date.now() + APPROACHING_TIMEOUT_PER_ACTION;
					scheduleEnd(true);
				}

				// Keep this above the amount update
				const prevLevel = currentLevel();

				// Register activity
				trainState.amount += amount;
				trainState.activities.push({
					id:Utils.getUUID(),
					platform,
					amount,
					created_at:Date.now(),
					messageId,
				})

				// New all time record ?
				if(!train.testing // Don't register if testing a fake train
				&& train.allTimeRecord
				&& trainState.amount > train.allTimeRecord.amount) {
					const levels = train.levelAmounts.concat();
					levels.unshift(0);

					train.allTimeRecord.amount = trainState.amount;
					train.allTimeRecord.date = Date.now();
				}

				// Level up ?
				const newLevel = currentLevel();
				if(newLevel.index !== prevLevel.index) {
					train.expires_at = Date.now() + train.levelsDuration_s * 1000;
					scheduleEnd();
					const amountLeft = Math.ceil(train.levelAmounts[newLevel.index-1]! - trainState.amount);
					const amountLeftFormatted = Utils.formatCurrency(amountLeft, train.currency);

					// if(prevLevel.index > 0) {
						const message:TwitchatDataTypes.MessageCustomTrainLevelUpData = {
							channel_id:StoreProxy.auth.twitch.user.id,
							date:Date.now(),
							id:Utils.getUUID(),
							platform:"twitchat",
							type:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_LEVEL_UP,
							trainId:train.id,
							trainName:train.title,
							amount:trainState.amount,
							amountFormatted:Utils.formatCurrency(trainState.amount, train.currency),
							amountLeft,
							amountLeftFormatted,
							level:newLevel.index,
							percent:Math.floor((trainState.amount - newLevel.offset) / newLevel.goal * 100),
							isRecord:train.allTimeRecord?.amount === trainState.amount,
						};

						StoreProxy.chat.addMessage(message);

						if(train.postLevelUpOnChat && train.postLevelUpChatMessage) {
							const message = train.postLevelUpChatMessage
								.replace(/\{LEVEL\}/gi, newLevel.index.toString())
								.replace(/\{AMOUNT\}/gi, amountLeftFormatted)
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

			//TODO remove
			// train.allTimeRecord = {
			// 	amount:40,
			// 	date:0,
			// }

			delete this.customTrainStates[train.id];
			this.broadcastStates(train.id);
			await Utils.promisedTimeout(250);
			if(simulationIDLocal !== simulationID) return;
			const levels = train.levelAmounts.concat();
			const firstLevel = levels[0] || 0;

			// Fill required event counts with 1/4 of the first level amount
			for (let i = 0; i < train.approachEventCount; i++) {
				this.registerActivity("", "trigger", firstLevel/4/train.approachEventCount);
			}

			await Utils.promisedTimeout(500);
			// Fill another 1/4 of the first level amount for the trigger event count
			let remaining = Math.max(1, train.triggerEventCount - train.approachEventCount);
			for (let i = 0; i < remaining; i++) {
				this.registerActivity("", "trigger", firstLevel/4/remaining);
				await Utils.promisedTimeout(500);
				if(simulationIDLocal !== simulationID) return;
			}

			// Fill the rest of the first level
			await Utils.promisedTimeout(3000);
			this.registerActivity("", "trigger", firstLevel/4);
			await Utils.promisedTimeout(3000);
			if(simulationIDLocal !== simulationID) return;
			this.registerActivity("", "trigger", firstLevel/4);
			await Utils.promisedTimeout(5000);
			if(simulationIDLocal !== simulationID) return;
			await Utils.promisedTimeout(26000);
			this.registerActivity("", "trigger", 500);
			for (let i = 1; i < Math.min(levels.length, 3); i++) {
				let splits = Math.ceil(Math.random() * 5 + 1);
				const goal = levels[i]! - levels[i-1]! * (Math.random() * 0.75 + .25);
				for (let i = 0; i < splits; i++) {
					if(simulationIDLocal !== simulationID) return;
					this.registerActivity("", "trigger", goal/splits);
					await Utils.promisedTimeout(1000 + Math.random() * 5000);
				}
			}
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

		resetCooldown(trainId:string):void {
			const train = this.customTrainList.find(t => t.id === trainId);
			if(train) {
				train.coolDownEnd_at = 0;
			}
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
