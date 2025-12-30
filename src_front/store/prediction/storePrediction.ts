import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IPredictionActions, type IPredictionGetters, type IPredictionState } from '../StoreProxy';

export const storePrediction = defineStore('prediction', {
	state: () => ({
		data: null,
		overlayParams: {
			showTitle:true,
			listMode:true,
			listModeOnlyMore2:true,
			showLabels:true,
			showVotes:false,
			showVoters:false,
			showPercent:false,
			showTimer:true,
			placement:"bl",
		},
	} as IPredictionState),



	getters: {
	} as IPredictionGetters
	& ThisType<UnwrapRef<IPredictionState> & _StoreWithGetters<IPredictionGetters> & PiniaCustomProperties>
	& _GettersTree<IPredictionState>,



	actions: {
		populateData(params?:PredictionOverlayParamStoreData):void {
			if(!params) {
				//Init prediction overlay params
				const predictionParams = DataStore.get(DataStore.PREDICTION_OVERLAY_PARAMS);
				if(predictionParams) {
					params = JSON.parse(predictionParams);
				}
			}

			if(!params) return;

			this.overlayParams.showTitle =			params.showTitle !== false;
			this.overlayParams.listMode =			params.listMode !== false;
			this.overlayParams.listModeOnlyMore2 =	params.listModeOnlyMore2 !== false;
			this.overlayParams.showLabels =			params.showLabels !== false;
			this.overlayParams.showVotes =			params.showVotes !== false;
			this.overlayParams.showVoters =			params.showVoters !== false;
			this.overlayParams.showPercent =		params.showPercent !== false;
			this.overlayParams.showTimer =			params.showTimer !== false;
			this.overlayParams.showOnlyResult =		params.showOnlyResult !== false;
			this.overlayParams.hideUntilResolved =	params.hideUntilResolved !== false;
			this.overlayParams.resultDuration_s =	params.resultDuration_s || 5;
			this.overlayParams.placement =			params.placement || "br";

			/**
			 * Called when prediction overlay request for its configs
			 */
			PublicAPI.instance.addEventListener("GET_PREDICTIONS_OVERLAY_CONFIGS", ()=> {
				this.broadcastState();
			});
		},

		setPrediction(data:TwitchatDataTypes.MessagePredictionData|null, postOnChat?:boolean) {
			if(data != null) {
				if(!this.data) {
					data.isStart = true;
					TriggerActionHandler.instance.execute(data);
				}else{
					data.isStart = false;
				}
				if(postOnChat) {
					StoreProxy.chat.addMessage(data);
				}

				PublicAPI.instance.broadcast("ON_PREDICTION_PROGRESS", {prediction: data});
			}else if(this.data){
				PublicAPI.instance.broadcast("ON_PREDICTION_PROGRESS", undefined);
			}

			this.data = data;
		},

		setOverlayParams(params:PredictionOverlayParamStoreData):void {
			this.populateData(params);
			DataStore.set(DataStore.PREDICTION_OVERLAY_PARAMS, this.overlayParams);
			PublicAPI.instance.broadcast("ON_PREDICTION_OVERLAY_CONFIGS", {parameters: this.overlayParams});
		},

		broadcastState():void {
			if(this.data) {
				PublicAPI.instance.broadcast("ON_PREDICTION_PROGRESS", {prediction: this.data});
			}
			PublicAPI.instance.broadcast("ON_PREDICTION_OVERLAY_CONFIGS", {parameters: this.overlayParams});
		}
	} as IPredictionActions
	& ThisType<IPredictionActions
		& UnwrapRef<IPredictionState>
		& _StoreWithState<"prediction", IPredictionState, IPredictionGetters, IPredictionActions>
		& _StoreWithGetters<IPredictionGetters>
		& PiniaCustomProperties
	>,
});


if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storePrediction, import.meta.hot))
}

export interface PredictionOverlayParamStoreData {
	listMode:boolean;
	listModeOnlyMore2:boolean;
	showTitle:boolean;
	showLabels:boolean;
	showVotes:boolean;
	showVoters:boolean;
	showPercent:boolean;
	showTimer:boolean;
	showOnlyResult:boolean;
	hideUntilResolved:boolean;
	resultDuration_s:number;
	placement:TwitchatDataTypes.ScreenPosition;
}
