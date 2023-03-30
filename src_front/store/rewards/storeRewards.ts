import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes';
import Config from '@/utils/Config';
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IRewardsActions, IRewardsGetters, IRewardsState } from '../StoreProxy';
import StoreProxy from '../StoreProxy';

export const storeRewards = defineStore('rewards', {
	state: () => ({
		rewards: [],
	} as IRewardsState),



	getters: {

	} as IRewardsGetters
	& ThisType<UnwrapRef<IRewardsState> & _StoreWithGetters<IRewardsGetters> & PiniaCustomProperties>
	& _GettersTree<IRewardsState>,



	actions: {

		async loadRewards():Promise<TwitchDataTypes.Reward[]> {
			if(!TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) return [];
			
			try {
				this.rewards = await TwitchUtils.getRewards(true);
			}catch(error) {
				this.rewards = [];
				console.log(error);
				StoreProxy.main.alert(StoreProxy.i18n.t("error.rewards_loading"));
				return [];
			}

			//Push "Highlight my message" reward as it's not given by the API...
			this.rewards.push(Config.instance.highlightMyMessageReward)

			//Sort by cost and name
			this.rewards = this.rewards.sort((a,b)=> {
				if(a.cost < b.cost) return -1;
				if(a.cost > b.cost) return 1;
				if(a.title.toLowerCase() < b.title.toLowerCase()) return -1;
				if(a.title.toLowerCase() > b.title.toLowerCase()) return 1;
				return 0;
			});

			return this.rewards;
		},
	
	} as IRewardsActions
	& ThisType<IRewardsActions
		& UnwrapRef<IRewardsState>
		& _StoreWithState<"raffle", IRewardsState, IRewardsGetters, IRewardsActions>
		& _StoreWithGetters<IRewardsGetters>
		& PiniaCustomProperties
	>,
})