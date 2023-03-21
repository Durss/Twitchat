import DataStore from '@/store/DataStore';
import Config from '@/utils/Config';
import DeezerHelper from '@/utils/music/DeezerHelper';
import type { SpotifyAuthResult, SpotifyAuthToken } from '@/utils/music/SpotifyDataTypes';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia';
import type { UnwrapRef } from 'vue';
import type { IMusicActions, IMusicGetters, IMusicState } from '../StoreProxy';

export const storeMusic = defineStore('music', {
	state: () => ({
		spotifyAuthParams: null,
		
		deezerConnected: false,
		
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
		setSpotifyAuthResult(value:SpotifyAuthResult|null) { this.spotifyAuthParams = value; },

		setDeezerConnected(value:boolean) {
			this.deezerConnected = value;
			Config.instance.DEEZER_CONNECTED = value;
			if(!value) {
				DeezerHelper.instance.dispose();
			}
		},
	} as IMusicActions
	& ThisType<IMusicActions
		& UnwrapRef<IMusicState>
		& _StoreWithState<"music", IMusicState, IMusicGetters, IMusicActions>
		& _StoreWithGetters<IMusicGetters>
		& PiniaCustomProperties
	>,
})