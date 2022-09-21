import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import Config from '@/utils/Config';
import DeezerHelper from '@/utils/DeezerHelper';
import type { SpotifyAuthResult, SpotifyAuthToken } from '@/utils/SpotifyDataTypes'
import SpotifyHelper from '@/utils/SpotifyHelper';
import { defineStore } from 'pinia'

export const storeMusic = defineStore('music', {
	state: () => ({
		spotifyAuthParams: null as SpotifyAuthResult|null,
		spotifyAuthToken: null as SpotifyAuthToken|null,

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
		} as TwitchatDataTypes.MusicPlayerParamsData,
	}),



	getters: {
	},



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
	},
})