<template>
	<ToggleBlock :open="open" class="spotifyparams" title="Spotify" icon="spotify">
		<div>Add the currently playing song on your screen</div>

		<div v-if="error" class="error" @click="error=''">{{error}}</div>

		<Button v-if="!spotifyConnected && !authenticating" title="Autenticate" @click="authenticate()" :loading="loading" class="authBt" />

		<div v-if="spotifyConnected">
			<div>
				<label for="spotify_overlay_url">Add this URL as a browser source</label>
				<input type="text" id="spotify_overlay_url" v-model="overlayUrl">
			</div>
			<Button v-if="spotifyConnected" title="Disconnect" @click="disconnect()" class="authBt" highlight />
		</div>

		<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="authenticating">

	</ToggleBlock>
</template>

<script lang="ts">
import store from '@/store';
import Config from '@/utils/Config';
import SpotifyHelper from '@/utils/SpotifyHelper';
import Utils from '@/utils/Utils';
import { Options, Vue } from 'vue-class-component';
import Button from '../../../Button.vue';
import ToggleBlock from '../../../ToggleBlock.vue';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	}
})
export default class SpotifyParams extends Vue {

	public error:string = "";
	public open:boolean = true;
	public loading:boolean = false;
	public authenticating:boolean = false;

	public get spotifyConnected():boolean { return store.state.spotifyAuthToken != null; }
	public get overlayUrl():string { return Utils.getOverlayURL("spotify"); }

	public authenticate():void {
		this.loading = true;
		SpotifyHelper.instance.startAuthFlow();
	}

	public async mounted():Promise<void> {
		if(store.state.spotifyAuthParams) {
			this.open = true;	
			this.authenticating = true;

			const csrfRes = await fetch(Config.API_PATH+"/CSRFToken?token="+store.state.spotifyAuthParams.csrf, {method:"POST"});
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
.spotifyparams{
	
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

}
</style>