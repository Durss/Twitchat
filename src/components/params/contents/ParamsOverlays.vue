<template>
	<div class="paramsoverlays">
		<img src="@/assets/icons/overlay_purple.svg" alt="overlay icon" class="icon">
		<div class="title">Add overlays to your stream</div>
		<p class="infos">In order to work, the overlays need Twitchat to be running as they will need to comunicate with it</p>
		
		<OverlayParamsRaffle class="block" v-if="obsConnected" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsSpotify class="block" v-if="obsConnected && spotifyConfigured" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsDeezer class="block" v-if="obsConnected && deezerConfigured" @setContent="(v:string) => $emit('setContent', v)" />

		<div class="connectObs" v-if="!obsConnected">
			<div>This features needs you to connect with OBS.</div>
			<Button class="button" title="Connect with OBS" white @click="$emit('setContent', 'obs')" />
		</div>
	</div>
</template>

<script lang="ts">
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import OverlayParamsSpotify from './overlays/OverlayParamsSpotify.vue';
import OverlayParamsRaffle from './overlays/OverlayParamsRaffle.vue';
import Config from '@/utils/Config';
import OverlayParamsDeezer from './overlays/OverlayParamsDeezer.vue';

@Options({
	props:{},
	components:{
		Button,
		OverlayParamsRaffle,
		OverlayParamsDeezer,
		OverlayParamsSpotify,
	},
	emits:["setContent"]
})
export default class ParamsOverlays extends Vue {
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get spotifyConfigured():boolean { return Config.SPOTIFY_CONFIGURED; }
	public get deezerConfigured():boolean { return Config.DEEZER_CONFIGURED; }

	public mounted():void {
		console.log(Config.DEEZER_CONFIGURED);
	}

}
</script>

<style scoped lang="less">
.paramsoverlays{
	.icon {
		height: 4em;
		display: block;
		margin: auto;
		margin-bottom: 1em;
	}
	.title {
		text-align: center;
		margin-bottom: 1em;
	}
	.infos {
		font-size: .9em;
		text-align: center;
		margin-bottom: 1em;
	}
	.connectObs {
		text-align: center;
		color: @mainColor_light;
		background-color: @mainColor_alert;
		padding: .5em;
		border-radius: .5em;
		margin-top: 1em;
		.button {
			margin-top: .5em;
		}
	}
	.block {
		&:not(:first-of-type) {
			margin-top: .5em;
		}
	}
}
</style>