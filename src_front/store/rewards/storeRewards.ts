import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Config from "@/utils/Config";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IRewardsActions, IRewardsGetters, IRewardsState } from "../StoreProxy";
import StoreProxy from "../StoreProxy";

export const storeRewards = defineStore("rewards", {
	state: (): IRewardsState => ({
		rewardList: [],
	}),

	getters: {} satisfies StoreGetters<IRewardsGetters, IRewardsState>,

	actions: {
		async loadRewards(): Promise<TwitchDataTypes.Reward[]> {
			//Permission not granted?
			if (!TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) return [];
			//Not at least affiliate?
			if (
				!StoreProxy.auth.twitch.user.is_affiliate &&
				!StoreProxy.auth.twitch.user.is_partner
			)
				return [];

			try {
				this.rewardList = await TwitchUtils.getRewards(true);
			} catch (error) {
				this.rewardList = [];
				console.log(error);
				StoreProxy.common.alert(StoreProxy.i18n.t("error.rewards_loading"));
				return [];
			}

			//Sort by cost and name
			this.rewardList = this.rewardList.sort((a, b) => {
				if (a.cost < b.cost) return -1;
				if (a.cost > b.cost) return 1;
				if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
				if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
				return 0;
			});

			//Push "Highlight my message" reward as it's not given by the API...
			this.rewardList.unshift(Config.instance.highlightMyMessageReward);

			//Push "All rewards" item for triggers. This needs to be filtered out where unnecessary
			this.rewardList.unshift(Config.instance.allRewards);

			return this.rewardList;
		},
	} satisfies StoreActions<"rewards", IRewardsState, IRewardsGetters, IRewardsActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeRewards, import.meta.hot));
}
