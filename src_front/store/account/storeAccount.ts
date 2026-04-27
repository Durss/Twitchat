import type { StoreActions } from "@/types/pinia-helpers";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IAccountActions, IAccountGetters, IAccountState } from "../StoreProxy";

export const storeAccount = defineStore("account", {
	state: (): IAccountState => ({
		syncDataWithServer: {
			type: "boolean",
			value: true,
			labelKey: "params.sync_server",
			id: 401,
		},
		publicDonation: {
			type: "boolean",
			value: false,
			labelKey: "donor.make_public",
			id: 402,
		},
	}),

	actions: {} satisfies StoreActions<"account", IAccountState, IAccountGetters, IAccountActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAccount, import.meta.hot));
}
