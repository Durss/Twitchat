<template>
	<ToggleBlock :open="open" class="OverlayParamsSpotify" title="Spotify" :icons="['spotify_purple']">
		<div v-if="error" class="error" @click="error=''">{{error}}</div>

		<div v-if="!spotifyConnected && !authenticating">
			Display the currently playing track on your overlay and allow your users to add tracks to the queue or control the playback.
		</div>
		<div class="spotifasshole" v-if="!spotifyConnected && !authenticating">
			<div class="info">Sadly, <strong>Spotify</strong> is refusing Twitchat to use their API with unlimited users and extended quotas <i>(necessary)</i>.<br>
			To use it you'll have to <a href="https://github.com/durss/twitchat/blob/main/SPOTIFY.md" target="_blank"><strong>READ THIS TUTORIAL</strong></a> and fill-in the values bellow:</div>
			<form>
				<ParamItem class="item" :paramData="paramClient" autofocus />
				<ParamItem class="item" :paramData="paramSecret" />
			</form>
		</div>
		<Button v-if="!spotifyConnected && !authenticating"
			title="Autenticate"
			@click="authenticate()"
			:loading="loading" class="authBt"
			:disabled="!canConnect" />

		<div v-if="spotifyConnected" class="content">
			<div class="row">
				<label for="spotify_overlay_url">Set this in an OBS browser source to display currently playing spotify track:</label>
				<input type="text" id="spotify_overlay_url" v-model="overlayUrl">
				<ToggleBlock small title="CSS customization" :open="false">
					<div>You can change the appearance of the player by overriding these CSS IDs on OBS browser source params</div>
					<ul>
						<li>#music_cover { ... }</li>
						<li>#music_title { ... }</li>
						<li>#music_artist { ... }</li>
						<li>#music_progress { ... }</li>
					</ul>
				</ToggleBlock>
				
			</div>
			<div class="row">
				<div>You can allow your viewers to control playback or add musics to the queue from chat commands !</div>
				<div>Head over the <a @click="$emit('setContent', 'triggers')">Triggers tab</a></div>
			</div>
			<Button title="Disconnect" @click="disconnect()" class="authBt" highlight />
		</div>

		<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="authenticating">

	</ToggleBlock>
</template>

<script lang="ts">
import store from '@/store';
import Store from '@/store/Store';
import type { ParameterData } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import SpotifyHelper from '@/utils/SpotifyHelper';
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';
import ParamItem from '../../ParamItem.vue';

@Options({
	props:{},
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:["setContent"]
})
export default class OverlayParamsSpotify extends Vue {

	public error = "";
	public open = false;
	public loading = false;
	public authenticating = false;
	public paramClient:ParameterData = {label:"Client ID", value:"", type:"text", fieldName:"spotifyClient"};
	public paramSecret:ParameterData = {label:"Client secret", value:"", type:"password", fieldName:"spotifySecret"};

	public get spotifyConnected():boolean { return Config.instance.SPOTIFY_CONNECTED; }
	public get overlayUrl():string { return this.$overlayURL("music"); }
	public get canConnect():boolean {
		return (this.paramClient.value as string).length >= 30 && (this.paramSecret.value as string).length >= 30;
	}

	public authenticate():void {
		this.loading = true;
		store.dispatch("setSpotifyCredentials", {
			client: (this.paramClient.value as string).trim(),
			secret: (this.paramSecret.value as string).trim(),
		});
		SpotifyHelper.instance.startAuthFlow();
	}

	public async mounted():Promise<void> {
		const spotifyAppParams = Store.get(Store.SPOTIFY_APP_PARAMS);
		if(spotifyAppParams) {
			const p:{client:string, secret:string} = JSON.parse(spotifyAppParams);
			SpotifyHelper.instance.setAppParams(p.client, p.secret);
			this.paramClient.value = p.client;
			this.paramSecret.value = p.secret;
		}

		if(store.state.spotifyAuthParams) {
			this.open = true;	
			this.authenticating = true;

			const csrfRes = await fetch(Config.instance.API_PATH+"/CSRFToken?token="+store.state.spotifyAuthParams.csrf, {method:"POST"});
			const csrf = await csrfRes.json();
			if(!csrf.success) {
				store.state.alert = csrf.message;
			}else{
				try {
					await SpotifyHelper.instance.authenticate(store.state.spotifyAuthParams.code);
				}catch(e:unknown) {
					this.error = (e as {error:string, error_description:string}).error_description;
				}
			}

			this.authenticating = false;
			this.loading = false;
			store.dispatch("setSpotifyAuthResult", null);
		}
	}

	public disconnect():void {
		store.dispatch("setSpotifyToken", null);
	}

}
</script>

<style scoped lang="less">
.OverlayParamsSpotify{
	
	.authBt, .loader {
		display: block;
		margin:auto;
		margin-top: 1em;
	}

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

	.content {
		.row {
			display: flex;
			flex-direction: column;
			&:not(:first-child) {
				margin-top: 1em;
			}

			ul {
				margin-top: .5em;
				li {
					list-style-type: disc;
					list-style-position: inside;
				}
			}
		}
	}

	.spotifasshole {
		margin-top: .5em;
		.info {
			color: @mainColor_alert;
			font-size: .9em;
		}
		form {
			margin-top: .5em;
		}
	}

}
</style>