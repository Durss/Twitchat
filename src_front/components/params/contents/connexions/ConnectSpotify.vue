<template>
	<div class="paramsspotify parameterContent">
		<Icon name="spotify" alt="spotify icon" class="icon" />

		<div class="head">
			<div>{{ $t("connexions.spotify.usage") }}</div>
		</div>

		<div class="content">
			<a href="https://www.youtube.com/playlist?list=PLJsQIzUbrDiEDuQ66YhtM6C8D3hZKL629" target="_blank" class="youtubeTutorialBt">
				<Icon name="youtube" theme="light" />
				<span>{{ $t('overlay.youtube_demo_tt') }}</span>
				<Icon name="newtab" theme="light" />
			</a>
			
			<form class="card-item" v-if="!connected" @submit.prevent="authenticate()">
				<div class="info" v-if="!authenticating">
					<i18n-t scope="global" tag="div" keypath="connexions.spotify.how_to">
						<template #URL>
							<strong>
								<a :href="$t('music.spotify_instructions')" target="_blank">{{ $t("connexions.spotify.how_to_read") }}</a>
							</strong>
						</template>
					</i18n-t>
				</div>
	
				<ParamItem class="item" :paramData="paramClient" autofocus @change="authenticate(false)" noba />
				<ParamItem class="item" :paramData="paramSecret" @change="authenticate(false)" noba />
				<TTButton v-if="!authenticating"
					type="submit"
					:loading="loading"
					:disabled="!canConnect">{{ $t('global.connect') }}</TTButton>
			</form>

			<div class="card-item" v-else>
				<div class="card-item primary" v-if="showSuccess">{{ $t("connexions.spotify.success") }}</div>

				<i18n-t scope="global" tag="div" keypath="connexions.spotify.usage_connected">
					<template #OVERLAY>
						<a @click="openOverlays()">{{ $t("connexions.spotify.usage_connected_overlay") }}</a>
					</template>
					<template #TRIGGERS>
						<a @click="openTriggers()">{{ $t("connexions.spotify.usage_connected_triggers") }}</a>
					</template>
				</i18n-t>

				<TTButton @click="disconnect()" icon="cross" alert>{{ $t('global.disconnect') }}</TTButton>
			</div>

			<div class="card-item alert" v-if="error" @click="error=''">{{error}}</div>

			<Icon v-if="authenticating" name="loader" class="loader" />
			
			<div class="card-item needsPremium">{{ $t("connexions.spotify.usage_premium") }}</div>

		</div>
	</div>
</template>

<script lang="ts">
import Icon from '@/components/Icon.vue';
import TTButton from '@/components/TTButton.vue';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import ApiHelper from '@/utils/ApiHelper';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { ParamItem } from '../../ParamItem.vue';

@Component({
	components:{
		Icon,
		TTButton,
		ParamItem,
	},
	emits:[],
})
class ConnectSpotify extends Vue {

	public error = "";
	public open = false;
	public loading = false;
	public showSuccess = false;
	public authenticating = false;
	public paramClient:TwitchatDataTypes.ParameterData<string> = {label:"Client ID", value:"", type:"string", fieldName:"spotifyClient", maxLength:32, isPrivate:true};
	public paramSecret:TwitchatDataTypes.ParameterData<string> = {label:"Client secret", value:"", type:"password", fieldName:"spotifySecret", maxLength:32, isPrivate:true};

	public get connected():boolean { return SpotifyHelper.instance.connected.value; }
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

	public async beforeMount():Promise<void> {
		this.paramClient.value = SpotifyHelper.instance.clientID;
		this.paramSecret.value = SpotifyHelper.instance.clientSecret;

		const spotifyAuthParams = this.$store.music.spotifyAuthParams;
		if(spotifyAuthParams) {
			this.open = true;	
			this.authenticating = true;

			const {json:csrf} = await ApiHelper.call("auth/CSRFToken", "POST", {token:spotifyAuthParams.csrf});
			if(!csrf.success) {
				this.$store.common.alert(csrf.message || "Spotify authentication failed");
			}else{
				try {
					await SpotifyHelper.instance.authenticate(spotifyAuthParams.code);
					this.showSuccess = true;
				}catch(e:unknown) {
					const castError = (e as {error:string, error_description:string});
					this.error = castError.error ?? castError.error_description;
					this.showSuccess = false;
					console.log(e);
					this.$store.common.alert("Oops... something went wrong");
				}
			}

			this.authenticating = false;
			this.loading = false;
			this.$store.music.setSpotifyAuthResult(null);
		}
	}

	public disconnect():void {
		SpotifyHelper.instance.disconnect()
	}

	public openOverlays():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, TwitchatDataTypes.ParamDeepSections.SPOTIFY);
	}
	
	public openTriggers():void {
		this.$store.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
	}
}
export default toNative(ConnectSpotify);
</script>

<style scoped lang="less">
.paramsspotify{
	
	.content {
		gap: 1em;
		display: flex;
		flex-direction: column;
		
		.card-item {
			margin: auto;
			max-width: 400px;
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: .5em;
			:deep(.inputHolder) {
				flex-basis: 100%;
			}
			.item {
				align-self: stretch;
			}
		}
	}

	.needsPremium {
		background: var(--color-secondary-fader);
		text-align: center;
	}

	.loader {
		height: 3em;
	}
}
</style>