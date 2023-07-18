<template>
	<ToggleBlock :open="open" class="connectspotifyform" title="Spotify" :icons="['spotify']">
		<div class="holder">
			<div v-if="!connected">{{ $t("connexions.spotify.usage") }}</div>

			<div class="card-item alert" v-if="error" @click="error=''">{{error}}</div>
	
			<div class="info" v-if="!connected && !authenticating">
				<i18n-t scope="global" tag="div" keypath="connexions.spotify.how_to">
					<template #URL>
						<strong>
							<a href="https://github.com/durss/twitchat/blob/main/SPOTIFY.md" target="_blank">{{ $t("connexions.spotify.how_to_read") }}</a>
						</strong>
					</template>
				</i18n-t>
			</div>

			<form @submit.prevent="authenticate()" v-if="!connected">
				<ParamItem class="item" :paramData="paramClient" autofocus @change="authenticate(false)" />
				<ParamItem class="item" :paramData="paramSecret" @change="authenticate(false)" />
				<Button class="item" v-if="!connected && !authenticating"
					type="submit"
					:loading="loading"
					:disabled="!canConnect">{{ $t('global.connect') }}</Button>
			</form>
	
			<div class="card-item primary" v-if="connected && showSuccess">{{ $t("connexions.spotify.success") }}</div>

			<template v-if="connected">
				<i18n-t scope="global" tag="div" keypath="connexions.spotify.usage_connected">
					<template #OVERLAY>
						<a @click="openOverlays()">{{ $t("connexions.spotify.usage_connected_overlay") }}</a>
					</template>
					<template #TRIGGERS>
						<a @click="openTriggers()">{{ $t("connexions.spotify.usage_connected_triggers") }}</a>
					</template>
				</i18n-t>
				<Button class="connectBt" @click="disconnect()" icon="cross" alert>{{ $t('global.disconnect') }}</Button>
			</template>
	
			<Icon v-if="authenticating" name="loader" />
		</div>

	</ToggleBlock>
</template>

<script lang="ts">
import Button from '@/components/Button.vue';
import ToggleBlock from '@/components/ToggleBlock.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiController from '@/utils/ApiController';
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
	public paramClient:TwitchatDataTypes.ParameterData<string> = {label:"Client ID", value:"", type:"string", fieldName:"spotifyClient", maxLength:32};
	public paramSecret:TwitchatDataTypes.ParameterData<string> = {label:"Client secret", value:"", type:"password", fieldName:"spotifySecret", maxLength:32};

	public get connected():boolean { return SpotifyHelper.instance.connected; }
	public get canConnect():boolean {
		return this.paramClient.value.length >= 30 && this.paramSecret.value.length >= 30;
	}
	
	public authenticate(startAuthFlow:boolean = true):void {
		this.loading = startAuthFlow;
		SpotifyHelper.instance.setCredentials(
			this.paramClient.value.trim(),
			this.paramSecret.value.trim()
		)
		if(startAuthFlow) {
			SpotifyHelper.instance.startAuthFlow();
		}
	}

	public async mounted():Promise<void> {
		this.paramClient.value = SpotifyHelper.instance.clientID;
		this.paramSecret.value = SpotifyHelper.instance.clientSecret;

		const spotifyAuthParams = this.$store("music").spotifyAuthParams;
		if(spotifyAuthParams) {
			this.open = true;	
			this.authenticating = true;

			const {json:csrf} = await ApiController.call("auth/CSRFToken", "POST", {token:spotifyAuthParams.csrf});
			if(!csrf.success) {
				this.$store("main").alert(csrf.message || "Spotify authentication failed");
			}else{
				try {
					await SpotifyHelper.instance.authenticate(spotifyAuthParams.code);
					this.showSuccess = true;
				}catch(e:unknown) {
					this.error = (e as {error:string, error_description:string}).error_description;
					this.showSuccess = false;
					console.log(e);
					this.$store("main").alert("Oops... something went wrong");
				}
			}

			this.authenticating = false;
			this.loading = false;
			this.$store("music").setSpotifyAuthResult(null);
		}
	}

	public disconnect():void {
		SpotifyHelper.instance.disconnect()
	}

	public openOverlays():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.SPOTIFY);
	}
	
	public openTriggers():void {
		this.$store("params").openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
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

		form {
			display: flex;
			flex-direction: column;
			gap: .5em;
		}
	}
}
</style>