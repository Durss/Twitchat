import Utils from "@/utils/Utils";
import {
	acceptHMRUpdate,
	defineStore,
	type PiniaCustomProperties,
	type _StoreWithGetters,
	type _StoreWithState,
} from "pinia";
import type { UnwrapRef } from "vue";
import type {
	IAccessibilityActions,
	IAccessibilityGetters,
	IAccessibilityState,
} from "../StoreProxy";

let ariaPoliteTimeout = -1;

export const storeAccessibility = defineStore("Accessibility", {
	state: () =>
		({
			ariaPolite: "",
		}) satisfies IAccessibilityState,

	getters: {} satisfies IAccessibilityGetters &
		ThisType<
			UnwrapRef<IAccessibilityState> &
				_StoreWithGetters<IAccessibilityGetters> &
				PiniaCustomProperties
		>,

	actions: {
		setAriaPolite(message: string) {
			this.ariaPolite = Utils.stripHTMLTags(message);
			clearTimeout(ariaPoliteTimeout);
			//Clear it after 10s
			ariaPoliteTimeout = window.setTimeout(() => {
				this.ariaPolite = "";
			}, 10000);
		},
	} satisfies IAccessibilityActions &
		ThisType<
			IAccessibilityActions &
				UnwrapRef<IAccessibilityState> &
				_StoreWithState<
					"Accessibility",
					IAccessibilityState,
					IAccessibilityGetters,
					IAccessibilityActions
				> &
				_StoreWithGetters<IAccessibilityGetters> &
				PiniaCustomProperties
		>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAccessibility, import.meta.hot));
}
