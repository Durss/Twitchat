import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import DataStore from '../DataStore';
import StoreProxy, { type IPollActions, type IPollGetters, type IPollState } from '../StoreProxy';

export const storePoll = defineStore('poll', {
	state: () => ({
		data: null,
		overlayParams: {
			showTitle:true,
			listMode:true,
			listModeOnlyMore2:true,
			showLabels:true,
			showVotes:false,
			showPercent:false,
			showTimer:true,
			placement:"bl",
			resultDuration_s:5,
			showOnlyResult:false,
		},
	} as IPollState),



	getters: {
	} as IPollGetters
	& ThisType<UnwrapRef<IPollState> & _StoreWithGetters<IPollGetters> & PiniaCustomProperties>
	& _GettersTree<IPollState>,



	actions: {

		populateData(params?:PollOverlayParamStoreData):void {
			if(!params) {
				//Init poll overlay params
				const pollParams = DataStore.get(DataStore.POLL_OVERLAY_PARAMS);
				if(pollParams) {
					params = JSON.parse(pollParams);
				}
			}
			if(!params) return;
			this.overlayParams.showTitle =			params.showTitle !== false;
			this.overlayParams.listMode =			params.listMode !== false;
			this.overlayParams.listModeOnlyMore2 =	params.listModeOnlyMore2 !== false;
			this.overlayParams.showLabels =			params.showLabels !== false;
			this.overlayParams.showVotes =			params.showVotes !== false;
			this.overlayParams.showPercent =		params.showPercent !== false;
			this.overlayParams.showTimer =			params.showTimer !== false;
			this.overlayParams.showOnlyResult =		params.showOnlyResult !== false;
			this.overlayParams.resultDuration_s =	params.resultDuration_s || 5;
			this.overlayParams.placement =			params.placement || "bl";

			/**
			 * Called when poll overlay request for its configs
			 */
			PublicAPI.instance.addEventListener("GET_POLLS_OVERLAY_CONFIGS", ()=> {
				this.broadcastState();
			});
		},

		setCurrentPoll(data:TwitchatDataTypes.MessagePollData|null, postOnChat?:boolean) {
			if(data != null) {
				//Executes the start poll trigger if there was no poll data before
				if(!this.data) {
					data.isStart = true;
					TriggerActionHandler.instance.execute(data);
				}else{
					data.isStart = false;
				}
				if(postOnChat) {
					StoreProxy.chat.addMessage(data);
				}

				PublicAPI.instance.broadcast("ON_POLL_PROGRESS", {poll:data});
			}else if(this.data){
				PublicAPI.instance.broadcast("ON_POLL_PROGRESS", undefined);
			}

			this.data = data;
		},

		setOverlayParams(params:PollOverlayParamStoreData):void {
			this.populateData(params);
			DataStore.set(DataStore.POLL_OVERLAY_PARAMS, this.overlayParams);
			PublicAPI.instance.broadcast("ON_POLL_OVERLAY_CONFIGS", {parameters: this.overlayParams});
		},

		broadcastState():void {
			if(this.data) {
				PublicAPI.instance.broadcast("ON_POLL_PROGRESS", {poll: this.data});
			}
			PublicAPI.instance.broadcast("ON_POLL_OVERLAY_CONFIGS", {parameters: this.overlayParams});
		}
	} as IPollActions
	& ThisType<IPollActions
		& UnwrapRef<IPollState>
		& _StoreWithState<"poll", IPollState, IPollGetters, IPollActions>
		& _StoreWithGetters<IPollGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storePoll, import.meta.hot))
}

export interface PollOverlayParamStoreData {
	listMode:boolean;
	listModeOnlyMore2:boolean;
	showTitle:boolean;
	showLabels:boolean;
	showVotes:boolean;
	showPercent:boolean;
	showTimer:boolean;
	showOnlyResult:boolean;
	resultDuration_s:number;
	placement:TwitchatDataTypes.ScreenPosition;
}
