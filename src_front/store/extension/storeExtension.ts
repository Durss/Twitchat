import type { StoreActions } from "@/types/pinia-helpers";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IExtensionActions, IExtensionGetters, IExtensionState } from "../StoreProxy";
import TwitchUtils from "@/utils/twitch/TwitchUtils";

export const storeExtension = defineStore("Extension", {
	state: (): IExtensionState => ({
		availableSlots: {
			panel: 0,
			overlay: 0,
			component: 0,
		},
		availableExtensions: [],
	}),

	actions: {
		init(): void {
			void TwitchUtils.listExtensions(false).then((res) => {
				if (!res) return;
				this.availableExtensions = res;
			});
			void TwitchUtils.listExtensions(true).then((res) => {
				if (!res) return;
				this.availableSlots.panel = Object.keys(res.panel).length;
				this.availableSlots.overlay = Object.keys(res.overlay).length;
				this.availableSlots.component = Object.keys(res.component).length;
			});
		},
	} satisfies StoreActions<"Extension", IExtensionState, IExtensionGetters, IExtensionActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeExtension, import.meta.hot));
}
