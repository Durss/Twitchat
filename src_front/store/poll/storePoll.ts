import TwitchatEvent from '@/events/TwitchatEvent';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from 'type-fest';
import type { UnwrapRef } from 'vue';
import StoreProxy, { type IPollActions, type IPollGetters, type IPollState } from '../StoreProxy';
import DataStore from '../DataStore';

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
		},
	} as IPollState),



	getters: {
	} as IPollGetters
	& ThisType<UnwrapRef<IPollState> & _StoreWithGetters<IPollGetters> & PiniaCustomProperties>
	& _GettersTree<IPollState>,



	actions: {
		setCurrentPoll(data:TwitchatDataTypes.MessagePollData|null, postOnChat?:boolean) {
			if(data != null) {
				if(postOnChat) {
					StoreProxy.chat.addMessage(data);
				}

				PublicAPI.instance.broadcast(TwitchatEvent.POLL_PROGRESS, {poll: (data as unknown) as JsonObject});
			}else if(this.data){
				PublicAPI.instance.broadcast(TwitchatEvent.POLL_PROGRESS, {});
			}

			this.data = data;
		},

		populateData(params:PollOverlayParamStoreData):void {
			this.overlayParams.showTitle =			params.showTitle !== false;
			this.overlayParams.listMode =			params.listMode !== false;
			this.overlayParams.listModeOnlyMore2 =	params.listModeOnlyMore2 !== false;
			this.overlayParams.showLabels =			params.showLabels !== false;
			this.overlayParams.showVotes =			params.showVotes !== false;
			this.overlayParams.showPercent =		params.showPercent !== false;
			this.overlayParams.showTimer =			params.showTimer !== false;
			this.overlayParams.placement =			params.placement || "bl";
		},

		setOverlayParams(params:PollOverlayParamStoreData):void {
			this.populateData(params);
			DataStore.set(DataStore.POLL_OVERLAY_PARAMS, this.overlayParams);
			PublicAPI.instance.broadcast(TwitchatEvent.POLLS_OVERLAY_PARAMETERS, {parameters: (this.overlayParams as unknown) as JsonObject});
		}
	} as IPollActions
	& ThisType<IPollActions
		& UnwrapRef<IPollState>
		& _StoreWithState<"poll", IPollState, IPollGetters, IPollActions>
		& _StoreWithGetters<IPollGetters>
		& PiniaCustomProperties
	>,
})

export interface PollOverlayParamStoreData {
	listMode:boolean;
	listModeOnlyMore2:boolean;
	showTitle:boolean;
	showLabels:boolean;
	showVotes:boolean;
	showPercent:boolean;
	showTimer:boolean;
	placement:TwitchatDataTypes.ScreenPosition;
}