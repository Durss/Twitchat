import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IBlueskyActions, IBlueskyGetters, IBlueskyState } from "../StoreProxy";

export const storeBluesky = defineStore("bluesky", {
	state: (): IBlueskyState => ({}),
	getters: {} satisfies StoreGetters<IBlueskyGetters, IBlueskyState>,
	actions: {
		populateData() {},
	} satisfies StoreActions<"bluesky", IBlueskyState, IBlueskyGetters, IBlueskyActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeBluesky, import.meta.hot));
}

interface IStoreData {}
