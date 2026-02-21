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

		<SearchForm v-if="subContent == null" v-model="search" :debounceDelay="0" />
		
		<TransitionGroup name="overlayItem" tag="div" class="list" v-if="subContent == null">
			
			<button class="item" key="animatedtext" v-if="matchesSearch('animatedtext')" @click="subContent = 'animatedtext'" v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_overlays_animatedText'}">
				<img src="@/assets/img/overlays/animated_text.jpg" alt="Animated text">
				<span>{{ getLabel('animatedtext') }}</span>
			</button>
			<button class="item" key="customtrain" v-if="matchesSearch('customtrain')" @click="subContent = 'customtrain'" v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_overlays_customTrain'}">
				<img src="@/assets/img/overlays/custom_train.jpg" alt="Custom train">
				<span>{{ getLabel('customtrain') }}</span>
			</button>
			<button class="item" key="donationgoals" v-if="matchesSearch('donationgoals')" @click="subContent = 'donationgoals'" v-newflag="{date:$config.NEW_FLAGS_DATE_V13_7, id:'params_overlays_donationgoals'}">
				<img src="@/assets/img/overlays/donation_goals.jpg" alt="Goals">
				<span>{{ getLabel('donationgoals') }}</span>
			</button>
			<button class="item" key="bingogrid" v-if="matchesSearch('bingogrid')" @click="subContent = 'bingogrid'" v-newflag="{date:$config.NEW_FLAGS_DATE_V13, id:'params_overlays_bingogrid'}">
				<img src="@/assets/img/overlays/bingo_grids.jpg" alt="Bingo grid">
				<span>{{ getLabel('bingogrid') }}</span>
			</button>
			<button class="item" key="polls" v-if="isAffiliate && matchesSearch('polls')" @click="subContent = 'polls'" v-newflag="{date:$config.NEW_FLAGS_DATE_V12, id:'params_overlays_poll'}">
				<img src="@/assets/img/overlays/polls.jpg" alt="Polls">
				<span>{{ getLabel('polls') }}</span>
			</button>
			<button class="item" key="chatPoll" v-if="matchesSearch('chatPoll')" @click="subContent = 'chatPoll'" v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_overlays_chatpoll'}">
				<img src="@/assets/img/overlays/chat_poll.jpg" alt="Polls">
				<span>{{ getLabel('chatPoll') }}</span>
			</button>
			<button class="item" key="predictions" v-if="isAffiliate && matchesSearch('predictions')" @click="subContent = 'predictions'" v-newflag="{date:$config.NEW_FLAGS_DATE_V12, id:'params_overlays_prediction'}">
				<img src="@/assets/img/overlays/predictions.jpg" alt="Predictions">
				<span>{{ getLabel('predictions') }}</span>
			</button>
			<button class="item" key="wheel" v-if="matchesSearch('wheel')" @click="subContent = 'wheel'"><img src="@/assets/img/overlays/raffle.jpg" alt="wheel">
				<span>{{ getLabel('wheel') }}</span>
			</button>
			<button class="item" key="bitswall" v-if="matchesSearch('bitswall')" @click="subContent = 'bitswall'" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'overlay_bitswall'}">
				<img src="@/assets/img/overlays/bits_wall.jpg" alt="Bits wall">
				<span>{{ getLabel('bitswall') }}</span>
			</button>
			<button class="item" key="credits" v-if="matchesSearch('credits')" @click="subContent = 'credits'" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'overlay_credits'}">
				<img src="@/assets/img/overlays/ending_credits.jpg" alt="Ending Credits">
				<span>{{ getLabel('credits') }}</span>
			</button>
			<button class="item" key="music" v-if="matchesSearch('music')" @click="subContent = 'music'"><img src="@/assets/img/overlays/spotify.jpg" alt="music">
				<span>{{ getLabel('music') }}</span>
			</button>
			<button class="item" key="distort" v-if="matchesSearch('distort')" @click="subContent = 'distort'" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'overlay_distort'}">
				<img src="@/assets/img/overlays/interractive_distortions.jpg" alt="Interactive distortions">
				<span>{{ getLabel('distort') }}</span>
			</button>
			<button class="item" key="adbreak" v-if="matchesSearch('adbreak')" @click="subContent = 'adbreak'" v-newflag="{date:$config.NEW_FLAGS_DATE_V11, id:'overlay_adbreak'}">
				<img src="@/assets/img/overlays/ad_break.jpg" alt="Ad break indicator">
				<span>{{ getLabel('adbreak') }}</span>
			</button>
			<button class="item" key="chathighlight" v-if="matchesSearch('chathighlight')" @click="subContent = 'chathighlight'"><img src="@/assets/img/overlays/highlights.jpg" alt="Chat highlight">
				<span>{{ getLabel('chathighlight') }}</span>
			</button>
			<button class="item" key="labels" v-if="matchesSearch('labels')" @click="subContent = 'labels'" v-newflag="{date:$config.NEW_FLAGS_DATE_V13, id:'params_overlays_labels'}">
				<img src="@/assets/img/overlays/labels.jpg" alt="Labels">
				<span>{{ getLabel('labels') }}</span>
			</button>
			<button class="item" key="counter" v-if="matchesSearch('counter')" @click="subContent = 'counter'"><img src="@/assets/img/overlays/counters.jpg" alt="Counters">
				<span>{{ getLabel('counter') }}</span>
			</button>
			<button class="item" key="timer" v-if="matchesSearch('timer')" @click="subContent = 'timer'" v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'params_overlays_timers'}">
				<img src="@/assets/img/overlays/timer.jpg" alt="Timers">
				<span>{{ getLabel('timer') }}</span>
			</button>
			<button class="item" key="ulule" v-if="matchesSearch('ulule')" @click="subContent = 'ulule'"><img src="@/assets/img/overlays/ulule.jpg" alt="Ulule">
				<span>{{ getLabel('ulule') }}</span>
			</button>
		</TransitionGroup>

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
			<OverlayParamsCustomTrain class="block"		:open="subContent == 'customtrain'"		v-if="subContent == 'customtrain'" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import OBSWebSocket from '@/utils/OBSWebSocket';
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
import OverlayParamsCustomTrain from './overlays/OverlayParamsCustomTrain.vue';
import Utils from '@/utils/Utils';
import SearchForm from './SearchForm.vue';

@Component({
	components:{
		TTButton,
		SearchForm,
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
		OverlayParamsCustomTrain,
		OverlayParamsPredictions,
		OverlayParamsHeatDistort,
		OverlayParamsDonationGoal,
		OverlayParamsAnimatedText,
	},
	emits:[]
})
class ParamsOverlays extends Vue implements IParameterContent {

	public showDockTutorial:boolean = false;
	public subContent:TwitchatDataTypes.OverlayTypes|null = null;
	public search:string = "";

	private overlaySearchKeys:{[key:string]:string} = {
		'animatedtext': 'overlay.animatedText.search_terms',
		'customtrain': 'overlay.customTrain.search_terms',
		'donationgoals': 'donation_goals.search_terms',
		'bingogrid': 'overlay.bingo_grid.search_terms',
		'polls': 'overlay.polls.search_terms',
		'chatPoll': 'overlay.chatPoll.search_terms',
		'predictions': 'overlay.predictions.search_terms',
		'wheel': 'overlay.raffle.search_terms',
		'bitswall': 'overlay.bitswall.search_terms',
		'credits': 'overlay.credits.search_terms',
		'music': 'overlay.music_common.search_terms',
		'distort': 'overlay.heatDistort.search_terms',
		'adbreak': 'overlay.adBreak.search_terms',
		'chathighlight': 'overlay.highlight.search_terms',
		'labels': 'overlay.labels.search_terms',
		'counter': 'overlay.counters.search_terms',
		'timer': 'overlay.timer.search_terms',
		'ulule': 'overlay.ulule.search_terms',
	};

	public get isAffiliate():boolean { return this.$store.auth.twitch.user.is_affiliate || this.$store.auth.twitch.user.is_partner; }
	public get obsConnected():boolean { return OBSWebSocket.instance.connected.value; }
	public get localConnectionAvailable():boolean { return Config.instance.OBS_DOCK_CONTEXT; }
	public get exchangeChannelAvailable():boolean { return this.localConnectionAvailable || this.obsConnected; }
	public get spotifyConfigured():boolean { return SpotifyHelper.instance.connected.value; }
	public get subcontentObs():TwitchatDataTypes.ParamDeepSectionsStringType { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get contentConnexions():TwitchatDataTypes.ParameterPagesStringType { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }
	public get overlayUrl():string { return Utils.overlayURL("unified"); }

	public get classes():string[] {
		const res = ["paramsoverlays", "parameterContent"];
		if(this.subContent !== null) res.push("contentOpened")
		return res;
	}

	public mounted():void {
		if(this.$store.params.currentPageSubContent) {
			this.subContent = this.$store.params.currentPageSubContent as TwitchatDataTypes.OverlayTypes;
		}
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

	public matchesSearch(id:string):boolean {
		if(!this.search) return true;
		const key = this.overlaySearchKeys[id];
		if(!key) return true;
		const terms = this.$tm(key) as string[];
		if(!terms || !Array.isArray(terms)) return true;
		return terms.some(term => Utils.search(term, this.search));
	}

	public getLabel(id:string):string {
		const key = this.overlaySearchKeys[id];
		if(!key) return id;
		const terms = this.$tm(key) as string[];
		if(!terms || !Array.isArray(terms) || terms.length === 0) return id;
		const label = (terms[0] as unknown as string).toString();
		return label.charAt(0).toUpperCase() + label.slice(1);
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
		align-items: center;
		justify-content: center;
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
			transition: filter .25s, opacity .25s, transform .25s;
			border: 0;
			position: relative;
			background-color: var(--background-color-fadest);
			border-radius: var(--border-radius);
			overflow: hidden;
			img {
				position: relative;
				width: 100%;
				z-index: 1;
			}
			&:hover {
				filter: brightness(1.5);
			}
			span {
				position: absolute;
				bottom: 1em;
				left: 50%;
				width: calc(100% - 2em);
				color: var(--color-text);
				transform: translateX(-50%);
			}
		}
		:deep(.newFlag) {
			img {
				border: 4px solid var(--color-secondary);
			}
		}
	}

	.overlayItem-enter-from,
	.overlayItem-leave-to {
		opacity: 0;
		transform: scale(.8);
	}
	.overlayItem-leave-to {
		opacity: 0;
		transform: scale(.8);
		display: none;
		transition: none;
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
