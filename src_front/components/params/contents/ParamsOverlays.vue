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
						@click="$store.params.openParamsPage(contentObs)">{{ $t('overlay.connection.obsBt') }}</Button>
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
		
		<OverlayParamsCredits class="block blinkBorder"		:open="subContent == 'credits'"		:class="allowHighlight && subContent == 'credits'? 'blink' : ''"		@click="allowHighlight = false" ref="credits" />
		<OverlayParamsHeatDistort class="block blinkBorder"	:open="subContent == 'heatDistort'"	:class="allowHighlight && subContent == 'heatDistort'? 'blink' : ''"	@click="allowHighlight = false" ref="heatDistort" v-if="$store.main.devmode" />
		<OverlayParamsRaffle class="block blinkBorder"		:open="subContent == 'wheel'"		:class="allowHighlight && subContent == 'wheel'? 'blink' : ''"			@click="allowHighlight = false" ref="wheel" />
		<OverlayParamsHighlight class="block blinkBorder"	:open="subContent == 'highlight'"	:class="allowHighlight && subContent == 'highlight'? 'blink' : ''"		@click="allowHighlight = false" ref="highlight" />
		<OverlayParamsSpotify class="block blinkBorder"		:open="subContent == 'spotify'"		:class="allowHighlight && subContent == 'spotify'? 'blink' : ''"		@click="allowHighlight = false" ref="spotify" />
		<OverlayParamsTimer class="block blinkBorder"		:open="subContent == 'timer'"		:class="allowHighlight && subContent == 'timer'? 'blink' : ''"			@click="allowHighlight = false" ref="timer" />
		<OverlayParamsCounter class="block blinkBorder"		:open="subContent == 'counter'"		:class="allowHighlight && subContent == 'counter'? 'blink' : ''"		@click="allowHighlight = false" ref="counter" />
		<!-- <OverlayParamsTTS class="block blinkBorder"	:open="subContent == 'tts'"			:class="allowHighlight && subContent == 'tts'? 'blink' : ''" /> -->
		<OverlayParamsAdBreak class="block blinkBorder"		:open="subContent == 'adBreak'"		:class="allowHighlight && subContent == 'adBreak'? 'blink' : ''"		@click="allowHighlight = false" ref="adBreak" v-if="adStuffAvailable" />
		<OverlayParamsUlule class="block blinkBorder"		:open="subContent == 'ulule'"		:class="allowHighlight && subContent == 'ulule'? 'blink' : ''"			@click="allowHighlight = false" ref="ulule" />
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import { Component, Vue } from 'vue-facing-decorator';
import TTButton from '../../TTButton.vue';
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
		Button: TTButton,
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
	public allowHighlight:boolean = true;
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get localConnectionAvailable():boolean { return Config.instance.OBS_DOCK_CONTEXT; }
	public get exchangeChannelAvailable():boolean { return this.localConnectionAvailable || this.obsConnected; }
	public get spotifyConfigured():boolean { return SpotifyHelper.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; }
	public get overlayUrl():string { return this.$overlayURL("unified"); }
	public get adStuffAvailable():boolean { return Config.instance.AD_API_AVAILABLE; }

	public onNavigateBack(): boolean { return false; }

	public get subContent() { return this.$store.params.currentPageSubContent; }

	public mounted():void {
		if(this.subContent) {
			const holder = (this.$refs[this.subContent] as Vue)?.$el;
			if(holder) holder.scrollIntoView();
		}
	}
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
	}

	.unified {
		input {
			margin: .5em 0;
			width: 100%;
		}
	}
}
</style>