import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import { type IPatreonActions, type IPatreonGetters, type IPatreonState } from '../StoreProxy';

export const storePatreon = defineStore('poll', {
	state: () => ({
		patreonAuthParams: null,
		patreonAuthToken: null,
	} as IPatreonState),



	getters: {
	} as IPatreonGetters
	& ThisType<UnwrapRef<IPatreonState> & _StoreWithGetters<IPatreonGetters> & PiniaCustomProperties>
	& _GettersTree<IPatreonState>,



	actions: {
	} as IPatreonActions
	& ThisType<IPatreonActions
		& UnwrapRef<IPatreonState>
		& _StoreWithState<"poll", IPatreonState, IPatreonGetters, IPatreonActions>
		& _StoreWithGetters<IPatreonGetters>
		& PiniaCustomProperties
	>,
})