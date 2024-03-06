import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { JsonObject } from "type-fest";
import type { UnwrapRef } from 'vue';
import type { IAutomodActions, IAutomodGetters, IAutomodState } from '../StoreProxy';

export const storeAutomod = defineStore('automod', {
	state: () => ({
		params:{
			enabled:false,
			banUserNames:false,
			keywordsFilters:[],
			exludedUsers:{
				broadcaster:true,
				mods:true,
				vips:true,
				subs:false,
				all:false,
				follower:false,
				follower_duration_ms:0,
				usersAllowed:[],
				usersRefused:[],
			},
		}
	} as IAutomodState),



	getters: {
	} as IAutomodGetters
	& ThisType<UnwrapRef<IAutomodState> & _StoreWithGetters<IAutomodGetters> & PiniaCustomProperties>
	& _GettersTree<IAutomodState>,



	actions: {
		populateData():void {
			//Init automod
			const automodParams = DataStore.get(DataStore.AUTOMOD_PARAMS);
			if(automodParams) {
				Utils.mergeRemoteObject(JSON.parse(automodParams), (this.params as unknown) as JsonObject);
				this.setAutomodParams(this.params);
			}
		},

		setAutomodParams(payload:TwitchatDataTypes.AutomodParamsData) {
			this.params = payload;
			DataStore.set(DataStore.AUTOMOD_PARAMS, payload);
		},
	} as IAutomodActions
	& ThisType<IAutomodActions
		& UnwrapRef<IAutomodState>
		& _StoreWithState<"automod", IAutomodState, IAutomodGetters, IAutomodActions>
		& _StoreWithGetters<IAutomodGetters>
		& PiniaCustomProperties
	>,
})