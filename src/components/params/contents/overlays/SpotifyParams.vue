<template>
	<ToggleBlock :open="open" class="spotifyparams" title="Spotify" icon="spotify">
		<div>Add the currently playing song on your screen</div>

		<Button v-if="!spotifyConnected && !authenticating" title="Autenticate" @click="authenticate()" :loading="loading" class="authBt" />

		<div v-if="spotifyConnected">
			<Button v-if="spotifyConnected" title="Disconnect" @click="disconnect()" class="authBt" highlight />
		</div>

		<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="authenticating">

	</ToggleBlock>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import ToggleBlock from '../../../ToggleBlock.vue';
import SpotifyHelper from '@/utils/SpotifyHelper';
import Button from '../../../Button.vue';
import store from '@/store';
import Config from '@/utils/Config';

@Options({
	props:{},
	components:{
		Button,
		ToggleBlock,
	}
})
export default class SpotifyParams extends Vue {

	public open:boolean = false;
	public loading:boolean = false;
	public authenticating:boolean = false;

	public get spotifyConnected():boolean { return store.state.spotifyAuthToken != null; }

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
				await SpotifyHelper.instance.authenticate(store.state.spotifyAuthParams.code);
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

}
</style>