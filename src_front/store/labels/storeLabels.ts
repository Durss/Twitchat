import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { ILabelsActions, ILabelsGetters, ILabelsState } from '../StoreProxy';


export const storeLabels = defineStore('labels', {
	state: () => ({
		labelList:[],
	} as ILabelsState),



	getters: {
		
	} as ILabelsGetters
	& ThisType<UnwrapRef<ILabelsState> & _StoreWithGetters<ILabelsGetters> & PiniaCustomProperties>
	& _GettersTree<ILabelsState>,



	actions: {
		async populateData():Promise<void> {
		},

	} as ILabelsActions
	& ThisType<ILabelsActions
		& UnwrapRef<ILabelsState>
		& _StoreWithState<"raffle", ILabelsState, ILabelsGetters, ILabelsActions>
		& _StoreWithGetters<ILabelsGetters>
		& PiniaCustomProperties
	>,
})