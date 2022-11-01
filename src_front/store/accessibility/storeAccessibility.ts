import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { UnwrapRef } from 'vue'
import type { IAccessibilityActions, IAccessibilityGetters, IAccessibilityState } from '../StoreProxy'

let ariaPoliteTimeout = -1;

export const storeAccessibility = defineStore('Accessibility', {
	state: () => ({
		ariaPolite:"",
	} as IAccessibilityState),



	getters: {
	} as IAccessibilityGetters
	& ThisType<UnwrapRef<IAccessibilityState> & _StoreWithGetters<IAccessibilityGetters> & PiniaCustomProperties>
	& _GettersTree<IAccessibilityState>,



	actions: {
		setAriaPolite(message:string) {
			message = message.replace(/data-.*?=".*?"/gim, "");//Strip data-attributes that can contain HTML
			message = message.replace(/<[^>]*>/gim, "");//Strip HTML tags
			this.ariaPolite = message;
			clearTimeout(ariaPoliteTimeout);
			//Clear it after 10s
			ariaPoliteTimeout = setTimeout(()=> {
				this.ariaPolite = "";
			}, 10000);
		}
	} as IAccessibilityActions
	& ThisType<IAccessibilityActions
		& UnwrapRef<IAccessibilityState>
		& _StoreWithState<"Accessibility", IAccessibilityState, IAccessibilityGetters, IAccessibilityActions>
		& _StoreWithGetters<IAccessibilityGetters>
		& PiniaCustomProperties
	>,
})