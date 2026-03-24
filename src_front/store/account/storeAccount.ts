import {
	acceptHMRUpdate,
	defineStore,
	type PiniaCustomProperties,
	type _StoreWithGetters,
	type _StoreWithState,
} from "pinia";
import type { UnwrapRef } from "vue";
import type { IAccountActions, IAccountGetters, IAccountState } from "../StoreProxy";

export const storeAccount = defineStore("account", {
	state: () =>
		({
			syncDataWithServer: {
				type: "boolean",
				value: true,
				labelKey: "params.sync_server",
				id: 401,
			},
			publicDonation: {
				type: "boolean",
				value: false,
				labelKey: "donor.make_public",
				id: 402,
			},
		}) satisfies IAccountState,

	getters: {} satisfies IAccountGetters &
		ThisType<
			UnwrapRef<IAccountState> & _StoreWithGetters<IAccountGetters> & PiniaCustomProperties
		>,

	actions: {} satisfies IAccountActions &
		ThisType<
			IAccountActions &
				UnwrapRef<IAccountState> &
				_StoreWithState<"account", IAccountState, IAccountGetters, IAccountActions> &
				_StoreWithGetters<IAccountGetters> &
				PiniaCustomProperties
		>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAccount, import.meta.hot));
}
