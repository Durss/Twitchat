import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import type { IAccountActions, IAccountGetters, IAccountState } from '../StoreProxy'
import StoreProxy from '../StoreProxy'

export const storeAccount = defineStore('account', {
	state: () => ({
		syncDataWithServer: { type:"toggle", value:true, labelKey:"params.sync_server", id:401 },
		publicDonation: { type:"toggle", value:false, labelKey:"donor.make_public", id:402 },
	} as IAccountState),



	getters: {
	} as IAccountGetters
	& ThisType<UnwrapRef<IAccountState> & _StoreWithGetters<IAccountGetters> & PiniaCustomProperties>
	& _GettersTree<IAccountState>,



	actions: {
	} as IAccountActions
	& ThisType<IAccountActions
		& UnwrapRef<IAccountState>
		& _StoreWithState<"account", IAccountState, IAccountGetters, IAccountActions>
		& _StoreWithGetters<IAccountGetters>
		& PiniaCustomProperties
	>,
})