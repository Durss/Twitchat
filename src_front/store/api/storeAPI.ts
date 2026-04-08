import SSEEvent from "@/events/SSEEvent";
import ApiHelper from "@/utils/ApiHelper";
import SSEHelper from "@/utils/SSEHelper";
import {
	acceptHMRUpdate,
	defineStore,
	type PiniaCustomProperties,
	type _StoreWithGetters,
	type _StoreWithState,
} from "pinia";
import type { UnwrapRef } from "vue";
import type { IAPIActions, IAPIGetters, IAPIState } from "../StoreProxy";

export const storeAPI = defineStore("api", {
	state: () =>
		({
			connected: false,
		}) satisfies IAPIState,

	getters: {} satisfies IAPIGetters &
		ThisType<UnwrapRef<IAPIState> & _StoreWithGetters<IAPIGetters> & PiniaCustomProperties>,

	actions: {
		populateData(): void {
			SSEHelper.instance.addEventListener(SSEEvent.REMOTE_ACTION, (event) => {
				this.onRemoteAction(event.data);
			});
		},

		async generateKey(): Promise<string | false> {
			const result = await ApiHelper.call("remote/key", "POST", undefined, false);
			if (result.json.success && result.json.data?.privateKey) {
				this.connected = true;
				return result.json.data.privateKey;
			}
			return false;
		},

		async deleteKey(): Promise<boolean> {
			const result = await ApiHelper.call("remote/key", "DELETE", undefined, false);
			if (result.json.success) {
				this.connected = false;
				return true;
			}
			return false;
		},

		onRemoteAction(data?: { action: string; data?: unknown }): void {
			console.log("ON REMOTE ACTION", data);
			// Dispatch a custom DOM event so any part of the app can listen
			// window.dispatchEvent(new CustomEvent("twitchat-remote-action", { detail: data }));
		},
	} satisfies IAPIActions &
		ThisType<
			IAPIActions &
				UnwrapRef<IAPIState> &
				_StoreWithState<"api", IAPIState, IAPIGetters, IAPIActions> &
				_StoreWithGetters<IAPIGetters> &
				PiniaCustomProperties
		>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAPI, import.meta.hot));
}
