import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from '@/utils/ApiHelper';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import type { ICustomTrainActions, ICustomTrainGetters, ICustomTrainState } from '../StoreProxy';
import Utils from "@/utils/Utils";
import StoreProxy from "../StoreProxy";
import PublicAPI from "@/utils/PublicAPI";
import TwitchatEvent from "@/events/TwitchatEvent";

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
				title:"",
				currency:"",
				color:"#000000",
				levels:[{amount:50}, {amount:100}, {amount:200}],
				triggerEventCount:3,
				textSize:20,
				textFont:"Inter",
				postProgressOnChat:false,
				approachingLabel:StoreProxy.i18n.t("overlay.customTrain.approachingLabel"),
				approachingEmote:"",
				failedLabel:StoreProxy.i18n.t("overlay.customTrain.failedLabel"),
				failedEmote:"",
				successLabel:StoreProxy.i18n.t("overlay.customTrain.successLabel"),
				successEmote:"",
				cooldownDuration_ms:2*3600*1000,
				levelsDuration_ms:5*60*1000,
				platforms:TwitchatDataTypes.CustomTrainData_Platforms.concat(),
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
