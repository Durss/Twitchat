import type { SpotifyAuthResult } from '@/types/spotify/SpotifyDataTypes';
import { acceptHMRUpdate, defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IMusicActions, IMusicGetters, IMusicState } from '../StoreProxy';
import DataStore from '../DataStore';
import Utils from '@/utils/Utils';
import type { JsonObject } from "type-fest";

export const storeMusic = defineStore('music', {
	state: () => ({
		spotifyAuthParams: null,

		spotifyConsecutiveErrors: 0,
		
		musicPlayerParams: {
			autoHide:false,
			erase:true,
			showCover:true,
			showArtist:true,
			showTitle:true,
			showProgressbar:true,
			openFromLeft:false,
			noScroll:false,
			customInfoTemplate:"",
		},
	} as IMusicState),



	getters: {
	} as IMusicGetters
	& ThisType<UnwrapRef<IMusicState> & _StoreWithGetters<IMusicGetters> & PiniaCustomProperties>
	& _GettersTree<IMusicState>,



	actions: {
		populateData():void {
			//Init music player params
			const musicPlayerParams = DataStore.get(DataStore.MUSIC_PLAYER_PARAMS);
			if(musicPlayerParams) {
				Utils.mergeRemoteObject(JSON.parse(musicPlayerParams), (this.musicPlayerParams as unknown) as JsonObject);
			}
		},

		setSpotifyAuthResult(value:SpotifyAuthResult|null) { this.spotifyAuthParams = value; },

	} as IMusicActions
	& ThisType<IMusicActions
		& UnwrapRef<IMusicState>
		& _StoreWithState<"music", IMusicState, IMusicGetters, IMusicActions>
		& _StoreWithGetters<IMusicGetters>
		& PiniaCustomProperties
	>,
})

if(import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeMusic, import.meta.hot))
}