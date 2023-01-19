<template>
	<ToggleBlock :open="open" class="OverlayParamsSpotify" title="Spotify" :icons="['spotify_purple']">
		<div class="holder">
			<div class="error" v-if="error" @click="error=''">{{error}}</div>
	
			<div v-if="!spotifyConnected && !authenticating">{{ $t("overlay.music_common.music") }}</div>
	
			<div class="row player_holder">
				<div class="label">{{ $t("global.example") }}</div>
				<OverlayMusicPlayer class="player" v-if="currentTrack" :staticTrackData="currentTrack" embed />
			</div>
	
			<div class="spotifasshole" v-if="!spotifyConnected && !authenticating">
				<div class="info">
					<i18n-t tag="div" keypath="overlay.spotify.how_to">
						<template #URL>
							<strong>
								<a href="https://github.com/durss/twitchat/blob/main/SPOTIFY.md" target="_blank">{{ $t("overlay.spotify.how_to_read") }}</a>
							</strong>
						</template>
					</i18n-t>
				</div>
				<form>
					<ParamItem class="item" :paramData="paramClient" autofocus />
					<ParamItem class="item" :paramData="paramSecret" />
				</form>
			</div>
	
			<Button v-if="!spotifyConnected && !authenticating"
				:title="$t('overlay.spotify.authBt')"
				@click="authenticate()"
				:loading="loading"
				:disabled="!canConnect" />
	
			<div class="row" v-if="spotifyConnected">
				<label for="spotify_overlay_url">{{ $t("overlay.music_common.music_url") }}</label>
				<OverlayParamsMusic />
			</div>
			
			<div v-if="spotifyConnected">
				<i18n-t scope="global" tag="div" keypath="overlay.music_common.infos">
					<template #TRIGGERS>
						<a @click="$emit('setContent', contentTriggers)">{{ $t("overlay.music_common.triggerBt") }}</a>
					</template>
				</i18n-t>
			</div>

			<Button v-if="spotifyConnected" :title="$t('global.disconnect')" @click="disconnect()" highlight />
	
			<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="authenticating">
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import DataStore from '@/store/DataStore';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import OverlayMusicPlayer from '../../../overlays/OverlayMusicPlayer.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';
import OverlayParamsMusic from './OverlayParamsMusic.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
		OverlayParamsMusic,
		OverlayMusicPlayer,
	},
	emits:["setContent"]
})
export default class OverlayParamsSpotify extends Vue {

	public error = "";
	public open = false;
	public loading = false;
	public authenticating = false;
	public paramClient:TwitchatDataTypes.ParameterData = {label:"Client ID", value:"", type:"text", fieldName:"spotifyClient"};
	public paramSecret:TwitchatDataTypes.ParameterData = {label:"Client secret", value:"", type:"password", fieldName:"spotifySecret"};
	public currentTrack:TwitchatDataTypes.MusicTrackData = {title:"Mitchiri Neko march",artist:"Mitchiri MitchiriNeko",album:"MitchiriNeko",cover:"https://i.scdn.co/image/ab67616d0000b2735b2419cbca2c5f1935743722",duration:1812,url:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=2b3eff5aba224d87"};

	public get spotifyConnected():boolean { return Config.instance.SPOTIFY_CONNECTED; }
	public get canConnect():boolean {
		return (this.paramClient.value as string).length >= 30 && (this.paramSecret.value as string).length >= 30;
	}
	
	public get contentTriggers():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.TRIGGERS; } 

	public authenticate():void {
		this.loading = true;
		this.$store("music").setSpotifyCredentials({
			client: (this.paramClient.value as string).trim(),
			secret: (this.paramSecret.value as string).trim(),
		});
		SpotifyHelper.instance.startAuthFlow();
	}

	public async mounted():Promise<void> {
		this.currentTrack.cover = this.$image("img/musicExampleCover.jpg");
		
		const spotifyAppParams = DataStore.get(DataStore.SPOTIFY_APP_PARAMS);
		if(spotifyAppParams) {
			const p:{client:string, secret:string} = JSON.parse(spotifyAppParams);
			SpotifyHelper.instance.setAppParams(p.client, p.secret);
			this.paramClient.value = p.client;
			this.paramSecret.value = p.secret;
		}

		const spotifyAuthParams = this.$store("music").spotifyAuthParams;
		if(spotifyAuthParams) {
			this.open = true;	
			this.authenticating = true;

			const csrfRes = await fetch(Config.instance.API_PATH+"/auth/CSRFToken?token="+spotifyAuthParams.csrf, {method:"POST"});
			const csrf = await csrfRes.json();
			if(!csrf.success) {
				this.$store("main").alert = csrf.message;
			}else{
				try {
					await SpotifyHelper.instance.authenticate(spotifyAuthParams.code);
				}catch(e:unknown) {
					this.error = (e as {error:string, error_description:string}).error_description;
				}
			}

			this.authenticating = false;
			this.loading = false;
			this.$store("music").setSpotifyAuthResult(null);
		}
	}

	public disconnect():void {
		this.$store("music").setSpotifyToken(null);
	}

}
</script>

<style scoped lang="less">
.OverlayParamsSpotify{

	.holder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1em;
	
		.error {
			justify-self: center;
			color: @mainColor_light;
			display: block;
			text-align: center;
			padding: 5px;
			border-radius: 5px;
			margin: auto;
			margin-top: 10px;
			background-color: @mainColor_alert;
			cursor: pointer;
		}
	
		.row {
			display: flex;
			flex-direction: column;
			gap:1em;
		}
	
		&.spotifasshole {
			margin-top: .5em;
			.info {
				color: @mainColor_alert;
				font-size: .9em;
			}
			form {
				margin-top: .5em;
			}
		}
	
		.player_holder {
			border: 1px dashed @mainColor_normal;
			background: fade(@mainColor_normal, 15%);
			border-radius: .25em;
			margin-left: auto;
			margin-right: auto;
			padding: .5em;
			
			.label {
				text-align: center;
				margin: 0;
				margin-bottom: .5em;
			}
			
			.player {
				margin: 0;
				margin-top: -1em;//No idea why i need that...
			}
		}
	}
}
</style>