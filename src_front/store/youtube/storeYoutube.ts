import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IYoutubeActions, IYoutubeGetters, IYoutubeState } from "../StoreProxy";

export const storeYoutube = defineStore("youtube", {
	state: (): IYoutubeState => ({
		youtubeAuthParams: null,
		youtubeAuthToken: null,
		newScopesToRequest: null,
	}),

	getters: {} satisfies StoreGetters<IYoutubeGetters, IYoutubeState>,

	actions: {
		setYoutubeAuthResult(value) {
			this.youtubeAuthParams = value;
		},

		async authenticate(): Promise<boolean> {
			if (!this.youtubeAuthParams) return false;
			const res = await YoutubeHelper.instance.authenticate(this.youtubeAuthParams.code);
			if (!res) return false;
			this.youtubeAuthToken = res;
			return true;
		},
	} satisfies StoreActions<"youtube", IYoutubeState, IYoutubeGetters, IYoutubeActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeYoutube, import.meta.hot));
}
