import type { StoreActions } from "@/types/pinia-helpers";
import type { SpotifyAuthResult } from "@/types/spotify/SpotifyDataTypes";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IMusicActions, IMusicGetters, IMusicState } from "../StoreProxy";
import DataStore from "../DataStore";
import Utils from "@/utils/Utils";
import type { JsonObject } from "type-fest";

export const storeMusic = defineStore("music", {
	state: (): IMusicState => ({
		spotifyAuthParams: null,

		spotifyConsecutiveErrors: 0,

		musicPlayerParams: {
			autoHide: false,
			erase: true,
			showCover: true,
			showArtist: true,
			showTitle: true,
			showProgressbar: true,
			openFromLeft: false,
			noScroll: false,
			customInfoTemplate: "",
		},
	}),

	actions: {
		populateData(): void {
			//Init music player params
			const musicPlayerParams = DataStore.get(DataStore.MUSIC_PLAYER_PARAMS);
			if (musicPlayerParams) {
				Utils.mergeRemoteObject(
					JSON.parse(musicPlayerParams),
					this.musicPlayerParams as unknown as JsonObject,
				);
			}
		},

		setSpotifyAuthResult(value: SpotifyAuthResult | null) {
			this.spotifyAuthParams = value;
		},
	} satisfies StoreActions<"music", IMusicState, IMusicGetters, IMusicActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeMusic, import.meta.hot));
}
