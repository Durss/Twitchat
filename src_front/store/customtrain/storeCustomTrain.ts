import TwitchatEvent from "@/events/TwitchatEvent";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ICustomTrainActions, ICustomTrainGetters, ICustomTrainState } from '../StoreProxy';
import StoreProxy from "../StoreProxy";

export const storeCustomTrain = defineStore('customTrain', {
	state: () => ({
		customTrainList:[],
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
				PublicAPI.instance.broadcast(TwitchatEvent.CUSTOM_TRAIN_STATE, entry);
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
				levels:[{amount:50}, {amount:100}, {amount:200}],
				triggerEventCount:2,
				textSize:30,
				textFont:"Inter",
				postLevelUpOnChat:false,
				approachingLabel:StoreProxy.i18n.t("overlay.customTrain.param_approachingLabel_default"),
				approachingEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_c1f4899e65cf4f53b2fd98e15733973a/animated/light/3.0",
				successLabel:StoreProxy.i18n.t("overlay.customTrain.param_successLabel_default"),
				successEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_bf888b2af57b4abd80653dff26768ae5/animated/dark/3.0",
				failedLabel:StoreProxy.i18n.t("overlay.customTrain.param_failedLabel_default"),
				failedEmote:"https://static-cdn.jtvnw.net/emoticons/v2/emotesv2_db3cd788399347a8b2ebfb8a85f5badb/static/light/3.0",
				cooldownDuration_s:2*3600,
				levelsDuration_s:5*60,
				postLevelUpChatMessage:StoreProxy.i18n.t("overlay.customTrain.param_postLevelUpChatMessage"),
				postSuccessChatMessage:StoreProxy.i18n.t("overlay.customTrain.param_postSuccessChatMessage"),
				postSuccessOnChat:false,
				platforms:{
					kofi:true,
					streamelements:true,
					patreon:true,
					streamlabs:true,
					tipeee:true,
					tiltify:true,
					streamlabs_charity:true,
					twitch_charity:true,
					counter:true,
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
