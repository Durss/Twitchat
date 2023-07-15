import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IPatreonActions, IPatreonGetters, IPatreonState } from '../StoreProxy';

export const storePatreon = defineStore('patreon', {
	state: () => ({
		patreonAuthParams: null,
		patreonAuthToken: null,
	} as IPatreonState),



	getters: {
	} as IPatreonGetters
	& ThisType<UnwrapRef<IPatreonState> & _StoreWithGetters<IPatreonGetters> & PiniaCustomProperties>
	& _GettersTree<IPatreonState>,



	actions: {
		setPatreonAuthResult(value) { this.patreonAuthParams = value; },
	} as IPatreonActions
	& ThisType<IPatreonActions
		& UnwrapRef<IPatreonState>
		& _StoreWithState<"patreon", IPatreonState, IPatreonGetters, IPatreonActions>
		& _StoreWithGetters<IPatreonGetters>
		& PiniaCustomProperties
	>,
})