<template>
	<div :class="classes">
		<Icon name="overlay" class="icon" />
		<div class="head" v-if="subContent == null">{{ $t("overlay.header") }}</div>

		<div class="card-item alert connectObs" v-if="!exchangeChannelAvailable">
			<i18n-t scope="global" keypath="overlay.connection.title">
				<template #OBS>
					<TTButton class="button"
						icon="obs"
						light alert
						@click="$store.params.openParamsPage(contentObs)">{{ $t('overlay.connection.obsBt') }}</TTButton>
				</template>
				<template #DOCK>
					<TTButton class="button"
						icon="twitchat"
						light alert
						@click="showDockTutorial = true" v-if="!showDockTutorial">{{ $t('overlay.connection.dockBt') }}</TTButton>
					<TTButton class="button"
						icon="cross"
						light alert
						@click="showDockTutorial = false" v-if="showDockTutorial">{{ $t('overlay.connection.closeBt') }}</TTButton>
				</template>
			</i18n-t>
			<div v-if="showDockTutorial" class="dockTuto">
				<div class="row" v-html="$t('overlay.connection.dock_tutorial')"></div>
				<img class="row" src="@/assets/img/obs_dock.png" alt="obs dock screen">
			</div>
		</div>

		<!-- <div class="card-item primary unified">
			<label for="unified_overlays">{{ $t("overlay.unified") }}</label>
			<input type="text" id="unified_overlays" v-model="overlayUrl">
		</div> -->

		<div class="list" v-if="subContent == null">
			<button class="item" @click="subContent = 'wheel'"><img src="@/assets/img/overlays/raffle.jpg"></button>
			<button class="item" @click="subContent = 'bitswall'" v-if="debugMode"><img src="@/assets/img/overlays/bits_wall.jpg"></button>
			<button class="item" @click="subContent = 'credits'"><img src="@/assets/img/overlays/ending_credits.jpg"></button>
			<button class="item" @click="subContent = 'music'"><img src="@/assets/img/overlays/spotify.jpg"></button>
			<button class="item" @click="subContent = 'distort'" v-if="debugMode"><img src="@/assets/img/overlays/interractive_distortions.jpg"></button>
			<button class="item" @click="subContent = 'adbreak'"><img src="@/assets/img/overlays/ad_break.jpg"></button>
			<button class="item" @click="subContent = 'chathighlight'"><img src="@/assets/img/overlays/highlights.jpg"></button>
			<button class="item" @click="subContent = 'counter'"><img src="@/assets/img/overlays/counters.jpg"></button>
			<button class="item" @click="subContent = 'timer'"><img src="@/assets/img/overlays/timer.jpg"></button>
			<button class="item" @click="subContent = 'ulule'"><img src="@/assets/img/overlays/ulule.jpg"></button>
		</div>
		
		<div class="form">
			<OverlayParamsCredits class="block"		:open="subContent == 'credits'"			v-if="subContent == 'credits'" />
			<OverlayParamsBitswall class="block"	:open="subContent == 'bitswall'"		v-if="subContent == 'bitswall'" />
			<OverlayParamsHeatDistort class="block"	:open="subContent == 'distort'"			v-if="subContent == 'distort'" />
			<OverlayParamsRaffle class="block"		:open="subContent == 'wheel'"			v-if="subContent == 'wheel'" />
			<OverlayParamsHighlight class="block"	:open="subContent == 'chathighlight'"	v-if="subContent == 'chathighlight'" />
			<OverlayParamsSpotify class="block"		:open="subContent == 'music'"			v-if="subContent == 'music'" />
			<OverlayParamsTimer class="block"		:open="subContent == 'timer'"			v-if="subContent == 'timer'" />
			<OverlayParamsCounter class="block"		:open="subContent == 'counter'"			v-if="subContent == 'counter'" />
			<!-- <OverlayParamsTTS class="block"			:open="subContent == 'tts'"				v-if="subContent == 'tts'" /> -->
			<OverlayParamsAdBreak class="block"		:open="subContent == 'adbreak'"			v-if="subContent == 'adbreak'" />
			<OverlayParamsUlule class="block"		:open="subContent == 'ulule'"			v-if="subContent == 'ulule'" />
		</div>
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
import OverlayParamsBitswall from './overlays/OverlayParamsBitswall.vue';

@Component({
	components:{
		TTButton,
		OverlayParamsTTS,
		OverlayParamsUlule,
		OverlayParamsTimer,
		OverlayParamsRaffle,
		OverlayParamsAdBreak,
		OverlayParamsSpotify,
		OverlayParamsCounter,
		OverlayParamsCredits,
		OverlayParamsBitswall,
		OverlayParamsHighlight,
		OverlayParamsHeatDistort,
	},
	emits:[]
})
export default class ParamsOverlays extends Vue implements IParameterContent {

	public debugMode:boolean = false;
	public showDockTutorial:boolean = false;
	public subContent:TwitchatDataTypes.OverlayTypes|null = null;
	
	private keyupHandler!:(e:KeyboardEvent) => void;
	
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get localConnectionAvailable():boolean { return Config.instance.OBS_DOCK_CONTEXT; }
	public get exchangeChannelAvailable():boolean { return this.localConnectionAvailable || this.obsConnected; }
	public get spotifyConfigured():boolean { return SpotifyHelper.instance.connected; }
	public get contentObs():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.OBS; }
	public get overlayUrl():string { return this.$overlayURL("unified"); }

	public get classes():string[] {
		const res = ["paramsoverlays", "parameterContent"];
		if(this.subContent !== null) res.push("contentOpened")
		return res;
	}

	public mounted():void {
		if(this.$store.params.currentPageSubContent) {
			this.subContent = this.$store.params.currentPageSubContent as TwitchatDataTypes.OverlayTypes;
		}

		this.keyupHandler = (e:KeyboardEvent) => this.onKeyUp(e);
		document.addEventListener("keyup", this.keyupHandler);
	}
	
	public beforeUnmount():void {
		document.removeEventListener("keyup", this.keyupHandler);
	}

	public reload():void {
		this.subContent = null;
	}
	
	public onNavigateBack():boolean {
		if(this.subContent != null) {
			this.subContent = null;
			return true;
		}
		return false;
	}

	/**
	 * Show a debug field on CTRL+ALT+D
	 * @param e 
	 */
	public onKeyUp(e:KeyboardEvent):void {
		if(e.key.toUpperCase() == "D" && e.ctrlKey && e.altKey) {
			this.debugMode = !this.debugMode;
			e.preventDefault();
		}
	}
}

</script>

<style scoped lang="less">
.paramsoverlays{
	&:not(.contentOpened) {
		max-width: 1200px !important;
	}
	
	.connectObs {
		display: flex;
		flex-direction: column;
		gap: .5em;
		align-items: center;
		margin: auto;
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


	.list{
		gap: .5em;
		@itemWidth: 250px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
		.item {
			overflow: hidden;
			border-radius: var(--border-radius);
			padding: 0;
			margin: 0;
			aspect-ratio: 16/9;
			transition: filter .25s;
			img {
				width: 100%;
				padding: 0;
				margin: 0;
			}
			&:hover {
				filter: brightness(1.5);
			}
		}
	}
}

@media only screen and (max-width: 450px) {
	.paramsoverlays {
		.list {
			@itemWidth: 150px;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
		}
	}
}
</style>