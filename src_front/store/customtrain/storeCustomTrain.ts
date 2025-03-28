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
				// Forcing levelup label to what's on labels.
				// This value isn't editable yet, but might in the future.
				// It's stored within the train configs just in anticipation
				// for making it editable in the future.
				// Meanwhile, we make sure it's always the same as the latest
				// label for current language
				entry.levelUpLabel = StoreProxy.i18n.t("overlay.customTrain.param_levelUpLabel_default");

				PublicAPI.instance.broadcast(TwitchatEvent.CUSTOM_TRAIN_STATE, {configs:entry, state:state as unknown as JsonObject});
			}
		},

		createCustomTrain():void {
			this.customTrainList.push({
				id: Utils.getUUID(),
				enabled:true,
				title:StoreProxy.i18n.t("overlay.customTrain.default_title"),
				levelName:"LVL",
				currency:"$"+Utils.CURRENCY_AMOUNT_TOKEN,
				colorFill:"#008667",
				colorBg:"#ffffff",
				triggerEventCount:2,
				textSize:30,
				textFont:"Inter",
				postLevelUpOnChat:false,
				approachingLabel:StoreProxy.i18n.t("overlay.customTrain.param_approachingLabel_default"),
				approachingEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_c1f4899e65cf4f53b2fd98e15733973a/animated/light/3.0",
				successLabel:StoreProxy.i18n.t("overlay.customTrain.param_successLabel_default"),
				successEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_bf888b2af57b4abd80653dff26768ae5/animated/dark/3.0",
				levelUpEmote:"https://static-cdn.jtvnw.net/emoticons/v2/62836/static/light/3.0",
				failedLabel:StoreProxy.i18n.t("overlay.customTrain.param_failedLabel_default"),
				failedEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_db3cd788399347a8b2ebfb8a85f5badb/static/light/3.0",
				recordLabel:StoreProxy.i18n.t("overlay.customTrain.param_recordLabel_default"),
				recordEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_dee4ecfb7f0940bead9765da02c57ca9/static/light/3.0",
				recordColorBg:"#ffffff",
				recordColorFill:"#e6b400",
				cooldownDuration_s:2*3600,
				levelsDuration_s:5*60,
				levelUpLabel:StoreProxy.i18n.t("overlay.customTrain.param_levelUpLabel_default"),
				postLevelUpChatMessage:StoreProxy.i18n.t("overlay.customTrain.param_postLevelUpChatMessage"),
				postSuccessChatMessage:StoreProxy.i18n.t("overlay.customTrain.param_postSuccessChatMessage"),
				postSuccessOnChat:false,
				levelAmounts:"20, 50, 75, 100, 130, 170, 200, 250, 300, 350, 400, 500",
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

				// Init customTrain state if not already initialized
				if(!this.customTrainStates[train.id]) {
					this.customTrainStates[train.id] = {
						approached_at:0,
						levelStarted_at:0,
						amount:0,
						activities:[],
					};
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
				if(train.allTimeRecord && this.customTrainStates[train.id].amount > train.allTimeRecord.amount) {
					const levels = (train.levelAmounts.match(/(\d|\.)+/g) || [])
						.filter(v=> !isNaN(parseFloat(v)))
						.map(v=>parseFloat(v))
						.sort((a,b)=>a - b);
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
			}
			this.broadcastStates();
		},

		async simulateTrain(overlayId:string):Promise<void> {
			const train = this.customTrainList.find(t=> t.id === overlayId);
			if(!train) return;

			delete this.customTrainStates[train.id];
			this.broadcastStates(train.id);
			await Utils.promisedTimeout(250);
			const levels = (train.levelAmounts.match(/(\d|\.)+/g) || [])
					.filter(v=> !isNaN(parseFloat(v)))
					.map(v=>parseFloat(v))
					.sort((a,b)=>a - b);

			for (let i = 0; i < train.triggerEventCount; i++) {
				this.registerActivity("", "trigger", levels[0]/2/(train.triggerEventCount+1));
				await Utils.promisedTimeout(1000);
			}
			this.registerActivity("", "trigger", levels[0]/2/2);
			await Utils.promisedTimeout(3000);
			this.registerActivity("", "trigger", levels[0]/2/2);
			await Utils.promisedTimeout(2000);
			this.registerActivity("", "trigger", levels[0]/train.triggerEventCount + 1);
			await Utils.promisedTimeout(1000);
			for (let i = 1; i < levels.length; i++) {
				let splits = Math.ceil(Math.random() * 5);
				const goal = levels[i] - levels[i-1];
				for (let i = 0; i < splits; i++) {
					await Utils.promisedTimeout(5000 + Math.random() * 2000);
					this.registerActivity("", "trigger", goal/splits);
				}
			}
		},

		saveData():void {
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
