import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import type { IExtensionActions, IExtensionGetters, IExtensionState } from '../StoreProxy'
import TwitchUtils from '@/utils/twitch/TwitchUtils'

export const storeExtension = defineStore('Extension', {
	state: () => ({
		availableSlots:{},
		availableExtensions:{},
	} as IExtensionState),



	getters: {
	} as IExtensionGetters
	& ThisType<UnwrapRef<IExtensionState> & _StoreWithGetters<IExtensionGetters> & PiniaCustomProperties>
	& _GettersTree<IExtensionState>,



	actions: {
		init():void {
			TwitchUtils.listExtensions(false).then(res => {
				if(!res) return;
				this.availableExtensions = res;
			});
			TwitchUtils.listExtensions(true).then(res => {
				if(!res) return;
				this.availableSlots.panel = Object.keys(res.panel).length;
				this.availableSlots.overlay = Object.keys(res.overlay).length;
				this.availableSlots.component = Object.keys(res.component).length;
			});
		},
	} as IExtensionActions
	& ThisType<IExtensionActions
		& UnwrapRef<IExtensionState>
		& _StoreWithState<"Extension", IExtensionState, IExtensionGetters, IExtensionActions>
		& _StoreWithGetters<IExtensionGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeExtension, import.meta.hot))
}