<template>
	<div class="paramsoverlays parameterContent">
		<Icon name="overlay" class="icon" />
		<div class="head">{{ $t("overlay.header") }}</div>

		<div class="card-item alert connectObs" v-if="!exchangeChannelAvailable">
			<i18n-t scope="global" keypath="overlay.connection.title">
				<template #OBS>
					<Button class="button"
						icon="obs"
						light alert
						@click="$store('params').openParamsPage(contentObs)">{{ $t('overlay.connection.obsBt') }}</Button>
				</template>
				<template #DOCK>
					<Button class="button"
						icon="twitchat"
						light alert
						@click="showDockTutorial = true" v-if="!showDockTutorial">{{ $t('overlay.connection.dockBt') }}</Button>
					<Button class="button"
						icon="cross"
						light alert
						@click="showDockTutorial = false" v-if="showDockTutorial">{{ $t('overlay.connection.closeBt') }}</Button>
				</template>
			</i18n-t>
			<div v-if="showDockTutorial" class="dockTuto">
				<div class="row" v-html="$t('overlay.connection.dock_tutorial')"></div>
				<img class="row" src="@/assets/img/obs_dock.png" alt="obs dock screen">
			</div>
		</div>

		<div class="card-item primary unified">
			<label for="unified_overlays">{{ $t("overlay.unified") }}</label>
			<input type="text" id="unified_overlays" v-model="overlayUrl">
		</div>
		
		<OverlayParamsCredits class="block" :open="subContent == 'credits'" :class="subContent == 'credits'? 'selected' : ''" />
		<OverlayParamsHeatDistort v-if="$store('main').devmode" class="block" :open="subContent == 'heatDistort'" :class="subContent == 'heatDistort'? 'selected' : ''" />
		<OverlayParamsRaffle class="block" :open="subContent == 'wheel'" :class="subContent == 'wheel'? 'selected' : ''" />
		<OverlayParamsHighlight class="block" :open="subContent == 'highlight'" :class="subContent == 'highlight'? 'selected' : ''" />
		<OverlayParamsSpotify class="block" :open="subContent == 'spotify'" :class="subContent == 'spotify'? 'selected' : ''" />
		<OverlayParamsTimer class="block" :open="subContent == 'timer'" :class="subContent == 'timer'? 'selected' : ''" />
		<OverlayParamsCounter class="block" :open="subContent == 'counter'" :class="subContent == 'counter'? 'selected' : ''" />
		<!-- <OverlayParamsTTS class="block" :open="subContent == 'tts'" :class="subContent == 'tts'? 'selected' : ''" /> -->
		<OverlayParamsAdBreak v-if="adStuffAvailable" class="block" :open="subContent == 'adBreak'" :class="subContent == 'adBreak'? 'selected' : ''" />
		<OverlayParamsUlule class="block" :open="subContent == 'ulule'" :class="subContent == 'ulule'? 'selected' : ''" />
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../../Button.vue';
import type IParameterContent from './IParameterContent';
import OverlayParamsCounter from './overlays/OverlayParamsCounter.vue';
import OverlayParamsHighlight from './overlays/OverlayParamsHighlight.vue';
import OverlayParamsRaffle from './overlays/OverlayParamsRaffle.vue';
import OverlayParamsSpotify from './overlays/OverlayParamsSpotify.vue';
import OverlayParamsTimer from './overlays/OverlayParamsTimer.vue';
import OverlayParamsUlule from './overlays/OverlayParamsUlule.vue';
import OverlayParamsCredits from './overlays/OverlayParamsCredits.vue';
import OverlayParamsHeatDistort from './overlays/OverlayParamsHeatDistort.vue';
import OverlayParamsTTS from './overlays/OverlayParamsTTS.vue';
import OverlayParamsAdBreak from './overlays/OverlayParamsAdBreak.vue';

@Component({
	components:{
		Button,
		OverlayParamsTTS,
		OverlayParamsUlule,
		OverlayParamsTimer,
		OverlayParamsRaffle,
		OverlayParamsAdBreak,
		OverlayParamsSpotify,
		OverlayParamsCounter,
		OverlayParamsCredits,
		OverlayParamsHighlight,
		OverlayParamsHeatDistort,
	},
	emits:[]
})
export default class ParamsOverlays extends Vue implements IParameterContent {

	public debugMode:boolean = false;
	public showDockTutorial:boolean = false;
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get localConnectionAvailable():boolean { return Config.instance.OBS_DOCK_CONTEXT; }
	public get exchangeChannelAvailable():boolean { return this.localConnectionAvailable || this.obsConnected; }
	public get spotifyConfigured():boolean { return SpotifyHelper.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; }
	public get overlayUrl():string { return this.$overlayURL("unified"); }
		public get adStuffAvailable():boolean { return Config.instance.AD_API_AVAILABLE; }

	public onNavigateBack(): boolean { return false; }

	public get subContent() { return this.$store("params").currentPageSubContent; }

}
</script>

<style scoped lang="less">
.paramsoverlays{
	.connectObs {
		display: flex;
		flex-direction: column;
		gap: .5em;
		align-items: center;
		.dockTuto {
			text-align: center;
			img {
				margin-top: .5em;
				max-width: 100%;
			}
		}
	}
	.block {
		width: 100%;
		flex-grow: 1;

		&.selected {
			border: 5px solid transparent;
			border-radius: 1em;
			animation: blink .5s 3 forwards;
			animation-delay: 1s;
			@keyframes blink {
				0% {
					border-color: var(--color-secondary);
				}
				50% {
					border-color: transparent;
				}
				100% {
					border-color: var(--color-secondary);
				}
			}
		}
	}

	.unified {
		input {
			margin: .5em 0;
			width: 100%;
		}
	}
}
</style>