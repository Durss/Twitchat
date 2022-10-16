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
		spotifyAuthToken: null,

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
		setSpotifyCredentials(value:{client:string, secret:string}) {
			DataStore.set(DataStore.SPOTIFY_APP_PARAMS, value);
			SpotifyHelper.instance.setAppParams(value.client, value.secret)
		},

		setSpotifyAuthResult(value:SpotifyAuthResult|null) { this.spotifyAuthParams = value; },
		
		setSpotifyToken(value:SpotifyAuthToken|null) {
			if(value && !value.expires_at) {
				value.expires_at = Date.now() + value.expires_in * 1000;
			}
			if(!value || !value.refresh_token) {
				value = null;
				DataStore.remove("spotifyAuthToken");
			}else{
				DataStore.set(DataStore.SPOTIFY_AUTH_TOKEN, value);
			}
			this.spotifyAuthToken = value;
			SpotifyHelper.instance.token = value;
			Config.instance.SPOTIFY_CONNECTED = value? value.expires_at > Date.now() : false;
			if(value) {
				SpotifyHelper.instance.getCurrentTrack();
			}
		},

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