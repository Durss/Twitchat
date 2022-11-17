<template>
	<div class="paramsoverlays">
		<img src="@/assets/icons/overlay_purple.svg" alt="overlay icon" class="icon">
		<div class="title">Add overlays to your stream</div>

		<div class="unified" v-if="exchangeChannelAvailable">
			Include all overlays in one single browser source:
			<input type="text" id="spotify_overlay_url" v-model="overlayUrl">
		</div>
		
		<OverlayParamsRaffle class="block" v-if="exchangeChannelAvailable" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsTimer class="block" v-if="exchangeChannelAvailable" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsHighlight class="block" v-if="exchangeChannelAvailable" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsSpotify class="block" v-if="exchangeChannelAvailable && spotifyConfigured" @setContent="(v:string) => $emit('setContent', v)" />
		<OverlayParamsDeezer class="block" v-if="exchangeChannelAvailable && deezerConfigured" @setContent="(v:string) => $emit('setContent', v)" />

		<div class="connectObs" v-if="!exchangeChannelAvailable">
			<div>These features need you to</div>
			<Button class="button" :icon="$image('icons/obs_purple.svg')" title="Connect with OBS" white @click="$emit('setContent', contentObs)" />
			<div class="or">or</div>
			<Button class="button" :icon="$image('icons/twitchat_purple.svg')" title="Dock Twitchat on OBS" white @click="showDockTutorial = true" v-if="!showDockTutorial" />
			<Button class="button" :icon="$image('icons/cross.svg')" title="Close" white @click="showDockTutorial = false" v-if="showDockTutorial" />
			<div v-if="showDockTutorial" class="dockTuto">
				<div class="row">On OBS, open <strong>Docks</strong> => <strong>Custom Browser Docks</strong> and add Twitchat this way</div>
				<img class="row" src="@/assets/img/obs_dock.png" alt="obs dock screen">
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Options, Vue } from 'vue-class-component';
import Button from '../../Button.vue';
import OverlayParamsDeezer from './overlays/OverlayParamsDeezer.vue';
import OverlayParamsHighlight from './overlays/OverlayParamsHighlight.vue';
import OverlayParamsRaffle from './overlays/OverlayParamsRaffle.vue';
import OverlayParamsSpotify from './overlays/OverlayParamsSpotify.vue';
import OverlayParamsTimer from './overlays/OverlayParamsTimer.vue';

@Options({
	props:{},
	components:{
		Button,
		OverlayParamsRaffle,
		OverlayParamsTimer,
		OverlayParamsDeezer,
		OverlayParamsSpotify,
		OverlayParamsHighlight,
	},
	emits:["setContent"]
})
export default class ParamsOverlays extends Vue {

	public showDockTutorial:boolean = false;
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get localConnectionAvailable():boolean { return Config.instance.OBS_DOCK_CONTEXT; }
	public get exchangeChannelAvailable():boolean { return this.localConnectionAvailable || this.obsConnected; }
	public get spotifyConfigured():boolean { return Config.instance.SPOTIFY_CONFIGURED; }
	public get deezerConfigured():boolean { return Config.instance.DEEZER_CONFIGURED; }
	public get contentObs():TwitchatDataTypes.ParamsContentStringType { return TwitchatDataTypes.ParamsCategories.OBS; }
	public get overlayUrl():string { return this.$overlayURL("unified"); }

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
			display: block;
			margin-left: auto;
			margin-right: auto;
		}
		.or {
			margin-top: .5em;
		}
		.dockTuto {
			margin-top: 1em;
			img {
				margin-top: .5em;
				max-width: 100%;
			}
		}
	}
	.block {
		&:not(:first-of-type) {
			margin-top: .5em;
		}
	}

	.unified {
		border-radius: 1em;
		background-color: white;
		box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
		padding: .5em;
		text-align: center;
		input {
			margin: .5em;
			width: 90%;
		}
	}
}
</style>