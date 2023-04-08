<template>
	<div class="paramsoverlays">
		<img src="@/assets/icons/overlay_purple.svg" alt="overlay icon" class="icon">
		<div class="head">{{ $t("overlay.header") }}</div>

		<div class="connectObs" v-if="!exchangeChannelAvailable">
			<i18n-t scope="global" keypath="overlay.connection.title">
				<template #OBS>
					<Button class="button"
						:icon="$image('icons/obs_purple.svg')"
						:title="$t('overlay.connection.obsBt')"
						white
						@click="$store('params').openParamsPage(contentObs)" />
				</template>
				<template #DOCK>
					<Button class="button"
						:icon="$image('icons/twitchat_purple.svg')"
						:title="$t('overlay.connection.dockBt')"
						white
						@click="showDockTutorial = true" v-if="!showDockTutorial" />
					<Button class="button"
						:icon="$image('icons/cross.svg')"
						:title="$t('overlay.connection.closeBt')"
						white
						@click="showDockTutorial = false" v-if="showDockTutorial" />
				</template>
			</i18n-t>
			<div v-if="showDockTutorial" class="dockTuto">
				<div class="row" v-html="$t('overlay.connection.dock_tutorial')"></div>
				<img class="row" src="@/assets/img/obs_dock.png" alt="obs dock screen">
			</div>
		</div>

		<div class="unified" v-if="true || exchangeChannelAvailable">
			<label for="unified_overlays">{{ $t("overlay.unified") }}</label>
			<input type="text" id="unified_overlays" v-model="overlayUrl">
		</div>
		
		<OverlayParamsRaffle class="block" :open="subContent == 'wheel'" :class="subContent == 'wheel'? 'selected' : ''" />
		<OverlayParamsTimer class="block" :open="subContent == 'timer'" :class="subContent == 'timer'? 'selected' : ''" />
		<OverlayParamsCounter class="block" :open="subContent == 'counter'" :class="subContent == 'counter'? 'selected' : ''" />
		<OverlayParamsHighlight class="block" :open="subContent == 'highlight'" :class="subContent == 'highlight'? 'selected' : ''" />
		<OverlayParamsSpotify class="block" :open="subContent == 'spotify'" :class="subContent == 'spotify'? 'selected' : ''" />
		<!-- <OverlayParamsDeezer class="block" /> -->
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../../Button.vue';
import type IParameterContent from './IParameterContent';
import OverlayParamsCounter from './overlays/OverlayParamsCounter.vue';
import OverlayParamsDeezer from './overlays/OverlayParamsDeezer.vue';
import OverlayParamsHighlight from './overlays/OverlayParamsHighlight.vue';
import OverlayParamsRaffle from './overlays/OverlayParamsRaffle.vue';
import OverlayParamsSpotify from './overlays/OverlayParamsSpotify.vue';
import OverlayParamsTimer from './overlays/OverlayParamsTimer.vue';

@Component({
	components:{
		Button,
		OverlayParamsRaffle,
		OverlayParamsTimer,
		OverlayParamsDeezer,
		OverlayParamsSpotify,
		OverlayParamsCounter,
		OverlayParamsHighlight,
	},
	emits:[]
})
export default class ParamsOverlays extends Vue implements IParameterContent {

	public showDockTutorial:boolean = false;
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get localConnectionAvailable():boolean { return Config.instance.OBS_DOCK_CONTEXT; }
	public get exchangeChannelAvailable():boolean { return this.localConnectionAvailable || this.obsConnected; }
	public get spotifyConfigured():boolean { return Config.instance.SPOTIFY_CONFIGURED; }
	public get deezerConfigured():boolean { return Config.instance.DEEZER_CONFIGURED; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; }
	public get overlayUrl():string { return this.$overlayURL("unified"); }

	public onNavigateBack(): boolean { return false; }

	public get subContent():TwitchatDataTypes.ParamOverlaySectionsStringType {
		return (this.$store("params").currentPageSubContent) as TwitchatDataTypes.ParamOverlaySectionsStringType;
	}

}
</script>

<style scoped lang="less">
.paramsoverlays{
	.parameterContent();

	.connectObs {
		display: flex;
		flex-direction: column;
		gap: .5em;
		align-items: center;
		color: @mainColor_light;
		background-color: @mainColor_alert;
		padding: .5em;
		border-radius: .5em;
		margin-top: 1em;
		.button {
			display: block;
			margin-left: auto;
			margin-right: auto;
		}
		.dockTuto {
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
		:deep(.icon) {
			width: 1.5em;
			height: 1.5em;
		}

		&.selected {
			border: 5px solid transparent;
			border-radius: 1em;
			animation: blink .5s 3 forwards;
			animation-delay: 1s;
			@keyframes blink {
				0% {
					border-color: @mainColor_highlight;
				}
				50% {
					border-color: transparent;
				}
				100% {
					border-color: @mainColor_highlight;
				}
			}
		}
	}

	.unified {
		border-radius: 1em;
		background-color: white;
		box-shadow: 0px 1px 1px rgba(0,0,0,0.25);
		padding: .5em;
		text-align: center;
		margin-top: 1em;
		input {
			margin: .5em;
			width: 90%;
		}
	}
}
</style>