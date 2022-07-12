<template>
	<div class="paramsoverlays">
		<img src="@/assets/icons/overlay_purple.svg" alt="overlay icon" class="icon">
		<div class="title">Add overlays to your stream</div>
		<p class="infos">In order to work, the overlays need Twitchat to be running.</p>
		<p class="beta">These are beta features that need more testing. If you have any issue with one of them <a :href="discordURL" target="_blank">please let me know on Discord</a></p>
		
		<OverlayParamsRaffle class="block" v-if="exchangeChannelAvailable" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsSpotify class="block" v-if="exchangeChannelAvailable && spotifyConfigured" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsDeezer class="block" v-if="exchangeChannelAvailable && deezerConfigured" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsTimer class="block" v-if="exchangeChannelAvailable" @setContent="(v:string) => $emit('setContent', v)" />

		<div class="connectObs" v-if="!exchangeChannelAvailable">
			<div>This features needs you to connect with OBS or add Twitchat as an OBS dock.</div>
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
import PublicAPI from '@/utils/PublicAPI';
import OverlayParamsTimer from './overlays/OverlayParamsTimer.vue';

@Options({
	props:{},
	components:{
		Button,
		OverlayParamsRaffle,
		OverlayParamsTimer,
		OverlayParamsDeezer,
		OverlayParamsSpotify,
	},
	emits:["setContent"]
})
export default class ParamsOverlays extends Vue {
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get localConnectionAvailable():boolean { return PublicAPI.instance.localConnectionAvailable; }
	public get exchangeChannelAvailable():boolean { return this.localConnectionAvailable || this.obsConnected; }
	public get spotifyConfigured():boolean { return Config.instance.SPOTIFY_CONFIGURED; }
	public get deezerConfigured():boolean { return Config.instance.DEEZER_CONFIGURED; }
	public get discordURL():string { return Config.instance.DISCORD_URL; }

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

	.beta {
		color: white;
		margin-top: 10px;
		font-size: .7em;
		padding: .55em;
		background-color: fade(@mainColor_warn, 100%);
		border-radius: .5em;
		text-align: center;
		position: relative;
		padding-left: 2.5em;
		&::before{
			content:" ";
			background-image: url("../../../assets/icons/info.svg");
			width: 2em;
			height: 2em;
			position: absolute;
			top: 50%;
			transform: translate(-2.5em, -50%);
		}
		a {
			font-weight: bold;
			color: white;
		}
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