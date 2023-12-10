import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IYoutubeActions, IYoutubeGetters, IYoutubeState } from '../StoreProxy';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';

export const storeYoutube = defineStore('youtube', {
	state: () => ({
		youtubeAuthParams: null,
		youtubeAuthToken: null,
		newScopesToRequest: null,
	} as IYoutubeState),



	getters: {
	} as IYoutubeGetters
	& ThisType<UnwrapRef<IYoutubeState> & _StoreWithGetters<IYoutubeGetters> & PiniaCustomProperties>
	& _GettersTree<IYoutubeState>,



	actions: {
		setYoutubeAuthResult(value) { this.youtubeAuthParams = value; },

		async authenticate():Promise<boolean> {
			if(!this.youtubeAuthParams) return false;
			const res = await YoutubeHelper.instance.authenticate(this.youtubeAuthParams.code);
			if(!res) return false;
			this.youtubeAuthToken = res;
			return true;
		},
	} as IYoutubeActions
	& ThisType<IYoutubeActions
		& UnwrapRef<IYoutubeState>
		& _StoreWithState<"youtube", IYoutubeState, IYoutubeGetters, IYoutubeActions>
		& _StoreWithGetters<IYoutubeGetters>
		& PiniaCustomProperties
	>,
})