import {
	acceptHMRUpdate,
	defineStore,
	type PiniaCustomProperties,
	type _StoreWithGetters,
	type _StoreWithState,
} from "pinia";
import type { UnwrapRef } from "vue";
import type { IExtensionActions, IExtensionGetters, IExtensionState } from "../StoreProxy";
import TwitchUtils from "@/utils/twitch/TwitchUtils";

export const storeExtension = defineStore("Extension", {
	state: () =>
		({
			availableSlots: {} as IExtensionState["availableSlots"],
			availableExtensions: [] as IExtensionState["availableExtensions"],
		}) satisfies IExtensionState,

	getters: {} satisfies IExtensionGetters &
		ThisType<
			UnwrapRef<IExtensionState> &
				_StoreWithGetters<IExtensionGetters> &
				PiniaCustomProperties
		>,

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
	} satisfies IExtensionActions &
		ThisType<
			IExtensionActions &
				UnwrapRef<IExtensionState> &
				_StoreWithState<
					"Extension",
					IExtensionState,
					IExtensionGetters,
					IExtensionActions
				> &
				_StoreWithGetters<IExtensionGetters> &
				PiniaCustomProperties
		>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeExtension, import.meta.hot));
}
