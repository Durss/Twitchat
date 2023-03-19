<template>
	<ToggleBlock :open="open" class="connectspotifyform" title="Spotify" :icons="['spotify_purple']">
		<div class="holder">
			<div class="error" v-if="error" @click="error=''">{{error}}</div>

			<div class="row">{{ $t("connexions.spotify.usage") }}</div>
	
			<div class="row spotifasshole" v-if="!connected && !authenticating">
				<div class="info">
					<i18n-t scope="global" tag="div" keypath="connexions.spotify.how_to">
						<template #URL>
							<strong>
								<a href="https://github.com/durss/twitchat/blob/main/SPOTIFY.md" target="_blank">{{ $t("connexions.spotify.how_to_read") }}</a>
							</strong>
						</template>
					</i18n-t>
				</div>
			</div>

			<form class="row" @submit.prevent="authenticate()" v-if="!connected">
				<ParamItem class="item" :paramData="paramClient" autofocus />
				<ParamItem class="item" :paramData="paramSecret" />
				<Button class="item" v-if="!connected && !authenticating"
					type="submit"
					:title="$t('connexions.spotify.connectBt')"
					:loading="loading"
					:disabled="!canConnect" />
			</form>
	
			<div class="row success" v-if="connected && showSuccess">
				{{ $t("connexions.spotify.success") }}
			</div>

			<Button class="connectBt" v-if="connected" :title="$t('connexions.spotify.disconnectBt')" @click="disconnect()" highlight />
	
			<img src="@/assets/loader/loader.svg" alt="loader" class="loader" v-if="authenticating">
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { Component, Vue } from 'vue-facing-decorator';
import ParamItem from '../../ParamItem.vue';

@Component({
	components:{
		Button,
		ParamItem,
		ToggleBlock,
	},
	emits:[],
})
export default class ConnectSpotifyForm extends Vue {

	public error = "";
	public open = false;
	public loading = false;
	public showSuccess = false;
	public authenticating = false;
	public paramClient:TwitchatDataTypes.ParameterData = {label:"Client ID", value:"", type:"string", fieldName:"spotifyClient"};
	public paramSecret:TwitchatDataTypes.ParameterData = {label:"Client secret", value:"", type:"password", fieldName:"spotifySecret"};

	public get connected():boolean { return Config.instance.SPOTIFY_CONNECTED; }
	public get canConnect():boolean {
		return (this.paramClient.value as string).length >= 30 && (this.paramSecret.value as string).length >= 30;
	}
	
	public authenticate():void {
		this.loading = true;
		this.$store("music").setSpotifyCredentials({
			client: (this.paramClient.value as string).trim(),
			secret: (this.paramSecret.value as string).trim(),
		});
		SpotifyHelper.instance.startAuthFlow();
	}

	public async mounted():Promise<void> {
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

			const headers = {
				'App-Version': import.meta.env.PACKAGE_VERSION,
			};
			const csrfRes = await fetch(Config.instance.API_PATH+"/auth/CSRFToken?token="+spotifyAuthParams.csrf, {method:"POST", headers});
			const csrf = await csrfRes.json();
			if(!csrf.success) {
				this.$store("main").alert = csrf.message;
			}else{
				try {
					await SpotifyHelper.instance.authenticate(spotifyAuthParams.code);
					this.showSuccess = true;
				}catch(e:unknown) {
					this.error = (e as {error:string, error_description:string}).error_description;
					this.showSuccess = false;
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
.connectspotifyform{
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
			gap:.5em;
			:deep(input) {
				flex-basis: 200px;
			}

			&.success {
				color: @mainColor_light;
				background-color: @mainColor_normal;
				padding: .25em .5em;
				border-radius: .5em;
			}
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
	}
}
</style>