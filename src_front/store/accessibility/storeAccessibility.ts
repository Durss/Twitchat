import type { StoreActions } from "@/types/pinia-helpers";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import type {
	IAccessibilityActions,
	IAccessibilityGetters,
	IAccessibilityState,
} from "../StoreProxy";

let ariaPoliteTimeout = -1;

export const storeAccessibility = defineStore("Accessibility", {
	state: (): IAccessibilityState => ({
		ariaPolite: "",
	}),

	actions: {
		setAriaPolite(message: string) {
			this.ariaPolite = Utils.stripHTMLTags(message);
			clearTimeout(ariaPoliteTimeout);
			//Clear it after 10s
			ariaPoliteTimeout = window.setTimeout(() => {
				this.ariaPolite = "";
			}, 10000);
		},
	} satisfies StoreActions<
		"Accessibility",
		IAccessibilityState,
		IAccessibilityGetters,
		IAccessibilityActions
	>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAccessibility, import.meta.hot));
}
