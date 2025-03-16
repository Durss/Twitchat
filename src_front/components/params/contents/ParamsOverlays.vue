<template>
	<div :class="classes">
		<Icon name="overlay" class="icon" />
		<div class="head" v-if="subContent == null">{{ $t("overlay.header") }}</div>

		<div class="card-item alert connectObs" v-if="!exchangeChannelAvailable">
			<i18n-t scope="global" keypath="overlay.connection.title" v-if="!showDockTutorial">
				<template #OBS>
					<TTButton icon="obs"
						light alert small
						@click="$store.params.openParamsPage(contentConnexions, subcontentObs)">{{ $t('overlay.connection.obsBt') }}</TTButton>
				</template>
				<template #DOCK>
					<TTButton icon="twitchat"
						light alert small
						@click="showDockTutorial = true" v-if="!showDockTutorial">{{ $t('overlay.connection.dockBt') }}</TTButton>
				</template>
			</i18n-t>
			<div v-if="showDockTutorial" class="dockTuto">
				<TTButton class="backBt"
					icon="back"
					light alert small
					@click="showDockTutorial = false" v-if="showDockTutorial">{{ $t('global.back') }}</TTButton>
				<div class="row" v-html="$t('overlay.connection.dock_tutorial')"></div>
				<img class="row" src="@/assets/img/obs_dock.png" alt="obs dock screen">
			</div>
		</div>

		<!-- <div class="card-item primary unified">
			<label for="unified_overlays">{{ $t("overlay.unified") }}</label>
			<input type="text" id="unified_overlays" v-model="overlayUrl">
		</div> -->

		<div class="list" v-if="subContent == null">
			<button class="item" @click="subContent = 'donationgoals'" v-newflag="{date:$config.NEW_FLAGS_DATE_V13_7, id:'params_overlays_donationgoals'}"><img src="@/assets/img/overlays/donation_goals.jpg" alt="Goals"></button>
			<button class="item" @click="subContent = 'bingogrid'" v-newflag="{date:$config.NEW_FLAGS_DATE_V13, id:'params_overlays_bingogrid'}"><img src="@/assets/img/overlays/bingo_grids.jpg" alt="Bingo grid"></button>
			<button class="item" @click="subContent = 'polls'" v-if="isAffiliate" v-newflag="{date:$config.NEW_FLAGS_DATE_V12, id:'params_overlays_poll'}"><img src="@/assets/img/overlays/polls.jpg" alt="Polls"></button>
			<button class="item" @click="subContent = 'chatPoll'" v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_overlays_chatpoll'}"><img src="@/assets/img/overlays/chat_poll.jpg" alt="Polls"></button>
			<button class="item" @click="subContent = 'predictions'" v-if="isAffiliate" v-newflag="{date:$config.NEW_FLAGS_DATE_V12, id:'params_overlays_prediction'}"><img src="@/assets/img/overlays/predictions.jpg" alt="Predictions"></button>
			<button class="item" @click="subContent = 'wheel'"><img src="@/assets/img/overlays/raffle.jpg" alt="wheel"></button>
			<button class="item" @click="subContent = 'bitswall'" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'overlay_bitswall'}"><img src="@/assets/img/overlays/bits_wall.jpg" alt="Bits wall"></button>
			<button class="item" @click="subContent = 'credits'" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'overlay_credits'}"><img src="@/assets/img/overlays/ending_credits.jpg" alt="Ending Credits"></button>
			<button class="item" @click="subContent = 'music'"><img src="@/assets/img/overlays/spotify.jpg" alt="music"></button>
			<button class="item" @click="subContent = 'distort'" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'overlay_distort'}"><img src="@/assets/img/overlays/interractive_distortions.jpg" alt="Interactive distortions"></button>
			<button class="item" @click="subContent = 'adbreak'" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'overlay_adbreak'}"><img src="@/assets/img/overlays/ad_break.jpg" alt="Ad break indicator"></button>
			<button class="item" @click="subContent = 'chathighlight'"><img src="@/assets/img/overlays/highlights.jpg" alt="Chat highlight"></button>
			<button class="item" @click="subContent = 'animatedtext'" v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_overlays_animatedText'}"><img src="@/assets/img/overlays/animated_text.jpg" alt="Animated text"></button>
			<button class="item" @click="subContent = 'labels'" v-newflag="{date:$config.NEW_FLAGS_DATE_V13, id:'params_overlays_labels'}"><img src="@/assets/img/overlays/labels.jpg" alt="Labels"></button>
			<button class="item" @click="subContent = 'counter'"><img src="@/assets/img/overlays/counters.jpg" alt="Counters"></button>
			<button class="item" @click="subContent = 'timer'" v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_overlays_timers'}"><img src="@/assets/img/overlays/timer.jpg" alt="Timers"></button>
			<button class="item" @click="subContent = 'ulule'"><img src="@/assets/img/overlays/ulule.jpg" alt="Ulule"></button>
		</div>

		<div class="form">
			<OverlayParamsCredits class="block"			:open="subContent == 'credits'"			v-if="subContent == 'credits'" />
			<OverlayParamsBitswall class="block"		:open="subContent == 'bitswall'"		v-if="subContent == 'bitswall'" />
			<OverlayParamsHeatDistort class="block"		:open="subContent == 'distort'"			v-if="subContent == 'distort'" />
			<OverlayParamsRaffle class="block"			:open="subContent == 'wheel'"			v-if="subContent == 'wheel'" />
			<OverlayParamsHighlight class="block"		:open="subContent == 'chathighlight'"	v-if="subContent == 'chathighlight'" />
			<OverlayParamsSpotify class="block"			:open="subContent == 'music'"			v-if="subContent == 'music'" />
			<OverlayParamsTimer class="block"			:open="subContent == 'timer'"			v-if="subContent == 'timer'" />
			<OverlayParamsCounter class="block"			:open="subContent == 'counter'"			v-if="subContent == 'counter'" />
			<!-- <OverlayParamsTTS class="block"				:open="subContent == 'tts'"				v-if="subContent == 'tts'" /> -->
			<OverlayParamsAdBreak class="block"			:open="subContent == 'adbreak'"			v-if="subContent == 'adbreak'" />
			<OverlayParamsUlule class="block"			:open="subContent == 'ulule'"			v-if="subContent == 'ulule'" />
			<OverlayParamsPredictions class="block"		:open="subContent == 'predictions'"		v-if="subContent == 'predictions'" />
			<OverlayParamsPolls class="block"			:open="subContent == 'polls'"			v-if="subContent == 'polls'" />
			<OverlayParamsChatPoll class="block"		:open="subContent == 'chatPoll'"		v-if="subContent == 'chatPoll'" />
			<OverlayParamsBingoGrid class="block"		:open="subContent == 'bingogrid'"		v-if="subContent == 'bingogrid'" />
			<OverlayParamsLabels class="block"			:open="subContent == 'labels'"			v-if="subContent == 'labels'" />
			<OverlayParamsDonationGoal class="block"	:open="subContent == 'donationgoals'"	v-if="subContent == 'donationgoals'" />
			<OverlayParamsAnimatedText class="block"	:open="subContent == 'animatedtext'"	v-if="subContent == 'animatedtext'" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebsocket from '@/utils/OBSWebsocket';
import SpotifyHelper from '@/utils/music/SpotifyHelper';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
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
import OverlayParamsPredictions from './overlays/OverlayParamsPredictions.vue';
import OverlayParamsPolls from './overlays/OverlayParamsPolls.vue';
import OverlayParamsBingoGrid from './overlays/OverlayParamsBingoGrid.vue';
import OverlayParamsLabels from './overlays/OverlayParamsLabels.vue';
import OverlayParamsDonationGoal from './overlays/OverlayParamsDonationGoal.vue';
import OverlayParamsChatPoll from './overlays/OverlayParamsChatPoll.vue';
import OverlayParamsAnimatedText from './overlays/OverlayParamsAnimatedText.vue';

@Component({
	components:{
		TTButton,
		OverlayParamsTTS,
		OverlayParamsPolls,
		OverlayParamsUlule,
		OverlayParamsTimer,
		OverlayParamsLabels,
		OverlayParamsRaffle,
		OverlayParamsAdBreak,
		OverlayParamsSpotify,
		OverlayParamsCounter,
		OverlayParamsCredits,
		OverlayParamsChatPoll,
		OverlayParamsBitswall,
		OverlayParamsBingoGrid,
		OverlayParamsHighlight,
		OverlayParamsPredictions,
		OverlayParamsHeatDistort,
		OverlayParamsDonationGoal,
		OverlayParamsAnimatedText,
	},
	emits:[]
})
class ParamsOverlays extends Vue implements IParameterContent {

	public debugMode:boolean = false;
	public showDockTutorial:boolean = false;
	public subContent:TwitchatDataTypes.OverlayTypes|null = null;

	private keyupHandler!:(e:KeyboardEvent) => void;

	public get isAffiliate():boolean { return this.$store.auth.twitch.user.is_affiliate || this.$store.auth.twitch.user.is_partner; }
	public get obsConnected():boolean { return OBSWebsocket.instance.connected; }
	public get localConnectionAvailable():boolean { return Config.instance.OBS_DOCK_CONTEXT; }
	public get exchangeChannelAvailable():boolean { return this.localConnectionAvailable || this.obsConnected; }
	public get spotifyConfigured():boolean { return SpotifyHelper.instance.connected; }
	public get subcontentObs():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNEXIONS; }
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

export default toNative(ParamsOverlays);
</script>

<style scoped lang="less">
.paramsoverlays{
	&:not(.contentOpened) {
		max-width: 1200px !important;
	}

	.connectObs {
		display: flex;
		flex-direction: row;
		align-items: flex;
		flex-wrap: wrap;
		margin: auto;
		gap: .5em;
		.dockTuto {
			flex-grow: 1;
			text-align: center;
			img {
				margin-top: .5em;
				max-width: 100%;
			}
			.backBt {
				margin-bottom: .5em;
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
		@itemWidth: 200px;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
		.item {
			padding: 0;
			margin: 0;
			aspect-ratio: 16/9;
			transition: filter .25s;
			border: 0;
			img {
				overflow: hidden;
				border-radius: var(--border-radius);
				width: 100%;
				padding: 0;
				margin: 0;
			}
			&:hover {
				filter: brightness(1.5);
			}
		}
		:deep(.newFlag) {
			img {
				border: 4px solid var(--color-secondary);
			}
		}
	}
}

@media only screen and (max-width: 600px) {
	.paramsoverlays {
		.list {
			@itemWidth: 40vw;
			grid-template-columns: repeat(auto-fill, minmax(@itemWidth, 1fr));
		}
	}
}
</style>
