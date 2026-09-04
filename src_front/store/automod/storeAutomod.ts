import type { StoreActions } from "@/types/pinia-helpers";
import DataStore from "@/store/DataStore";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { JsonObject } from "type-fest";
import type { IAutomodActions, IAutomodGetters, IAutomodState } from "../StoreProxy";
import UnicodeUtils from "@/utils/UnicodeUtils";

export const storeAutomod = defineStore("automod", {
	state: (): IAutomodState => ({
		params: {
			enabled: false,
			banUserNames: false,
			keywordsFilters: [],
			exludedUsers: Utils.getDefaultPermissions(true, true, true, false, false, false),
		},
	}),

	actions: {
		populateData(): void {
			//Init automod
			const automodParams = DataStore.get(DataStore.AUTOMOD_PARAMS);
			if (automodParams) {
				Utils.mergeRemoteObject(
					JSON.parse(automodParams),
					this.params as unknown as JsonObject,
				);
				this.setAutomodParams(this.params);
			}
		},

		setAutomodParams(payload: TwitchatDataTypes.AutomodParamsData) {
			this.params = payload;
			DataStore.set(DataStore.AUTOMOD_PARAMS, payload);
		},

		/**
		 * Check if a message is automoded by a rule
		 * @param mess
		 * @param tags
		 * @returns
		 */
		isMessageAutomoded(
			mess: string,
			user: TwitchatDataTypes.TwitchatUser,
			channelId: string,
		): TwitchatDataTypes.AutomodParamsKeywordFilterData | null {
			if (
				this.params.enabled &&
				!Utils.checkPermissions(this.params.exludedUsers, user, channelId)
			) {
				const rules = this.params
					.keywordsFilters as TwitchatDataTypes.AutomodParamsKeywordFilterData[];

				const messClean = UnicodeUtils.instance
					.normalizeAlphaNum(mess)
					.toLowerCase()
					.trim();
				let messLeet = "";
				for (const r of rules) {
					if (!r.enabled || !r.regex.trim() || r.regex.trim().length < 2) continue; //Rule disabled, skip it

					//Check if reg is valid
					let reg!: RegExp,
						valid = true;
					try {
						reg = new RegExp(r.regex.trim(), "gi");
					} catch (_e) {
						valid = false;
					}

					if (valid && reg.test(messClean)) {
						//Reg matches
						return r;
					} else {
						//Check leet encoding seperately to avoid conflicts
						if (messLeet === "") {
							messLeet = UnicodeUtils.instance
								.normalizeLeet(mess)
								.toLowerCase()
								.trim();
						}
						if (reg.test(messLeet)) {
							//Reg matches
							return r;
						}
					}
				}
			}
			return null;
		},
	} satisfies StoreActions<"automod", IAutomodState, IAutomodGetters, IAutomodActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAutomod, import.meta.hot));
}
