<template>
	<div class="chattipandtrickad" @contextmenu="onRightClick($event)">
		<div v-if="tipIndex===0" class="entry">
			<Icon name="obs" alt="elgato" class="icon" theme="light" />
			<h1>{{ $t("tips.alerts.title") }}</h1>
			<div>{{ $t("tips.alerts.info_1") }}</div>
			<TTButton primary light @click.stop="openParamPage(contentTriggers)" >{{ $t('tips.tryBt') }}</TTButton>
		</div>

		<div v-if="tipIndex===1" class="entry">
			<Icon name="elgato" alt="elgato" class="icon" theme="light" />
			<h1>{{ $t('tips.streamdeck.title') }}</h1>
			<div>{{ $t('tips.streamdeck.info_1') }}</div>
			<div>{{ $t('tips.streamdeck.info_2') }}</div>
			<TTButton primary light @click.stop="openParamPage(contentConnexions, subcontentStreamdeck)" >{{ $t('tips.tryBt') }}</TTButton>
		</div>

		<div v-if="tipIndex===2" class="entry">
			<Icon name="raid" alt="raid" class="icon" theme="light" />
			<h1>{{ $t('tips.obs_stop.title') }}</h1>
			<div>{{ $t('tips.obs_stop.info_1') }}</div>
			<TTButton primary light @click.stop="openParamItem('features.stopStreamOnRaid')" >{{ $t('tips.tryBt') }}</TTButton>
		</div>

		<div v-if="tipIndex===3" class="entry">
			<Icon name="bingo" alt="bingo" class="icon" theme="light" />
			<h1>{{ $t('tips.bingo.title') }}</h1>
			<div>{{ $t('tips.bingo.info_1') }}</div>
			<TTButton primary light @click.stop="openModal('bingo')" >{{ $t('tips.tryBt') }}</TTButton>
		</div>

		<div v-if="tipIndex===4" class="entry">
			<Icon name="ticket" alt="raffle" class="icon" theme="light" />
			<h1>{{ $t('tips.raffle.title') }}</h1>
			<div>{{ $t('tips.raffle.info_1') }}</div>
			<div>{{ $t('tips.raffle.info_2') }}</div>
			<TTButton primary light @click.stop="openModal('raffle')" >{{ $t('tips.tryBt') }}</TTButton>
		</div>

		<div v-if="tipIndex===5" class="entry">
			<Icon name="obs" alt="obs" class="icon" theme="light" />
			<h1>{{ $t('tips.obs.title') }}</h1>
			<div>{{ $t('tips.obs.info_1') }}</div>
			<div>{{ $t('tips.obs.info_2') }}</div>
			<TTButton primary light @click.stop="openParamPage(contentConnexions, subcontentObs)" >{{ $t('tips.tryBt') }}</TTButton>
		</div>

		<div v-if="tipIndex===6" class="entry">
			<Icon name="api" alt="api" class="icon" theme="light" />
			<h1>{{ $t('tips.api.title') }}</h1>
			<div>{{ $t('tips.api.info_1') }}</div>
			<div>{{ $t('tips.api.info_2') }}</div>
			<TTButton primary light icon="github"
				href="https://github.com/Durss/Twitchat/blob/main/PUBLIC_API.md"
				target="_blank"
				type="link">{{ $t('tips.api.readBt') }}</TTButton>
		</div>

		<!-- <div v-if="tipIndex===7" class="entry">
			<Icon name="music" alt="music" class="icon" theme="light" />
			<h1>{{ $t('tips.music.title') }}</h1>
			<div v-html="$t('tips.music.info_1')"></div>
			<div>{{ $t('tips.music.info_2') }}</div>
			<TTButton primary light @click.stop="openParamPage(contentConnexions, subcontentSpotify)" >{{ $t('tips.tryBt') }}</TTButton>
		</div> -->

		<div v-if="tipIndex===7" class="entry">
			<Icon name="overlay" alt="overlay" class="icon" theme="light" />
			<h1>{{ $t('tips.overlays.title') }}</h1>
			<div v-html="$t('tips.overlays.info_1')"></div>
			<div v-html="$t('tips.overlays.info_2')"></div>
			<TTButton primary light @click.stop="openParamPage(contentOverlays)" >{{ $t('tips.tryBt') }}</TTButton>
		</div>

		<div v-if="tipIndex===8" class="entry">
			<Icon name="countdown" alt="timer" class="icon" theme="light" />
			<h1>{{ $t('tips.countdown.title') }}</h1>
			<i18n-t scope="global" tag="div" keypath="tips.countdown.info_1">
				<template #CMD1><mark class="cmd">/timerStart</mark></template>
				<template #CMD2><mark class="cmd">/countdown</mark></template>
			</i18n-t>
			<TTButton primary light icon="countdown" @click.stop="openModal('timer')">{{ $t('tips.tryBt') }}</TTButton>
		</div>

		<div v-if="tipIndex===9" class="entry">
			<Icon name="obs" alt="obs dock" class="icon" theme="light" />
			<h1>{{ $t('tips.dock.title') }}</h1>
			<div v-html="$t('tips.dock.info_1')"></div>
			<div v-html="$t('tips.dock.info_2')"></div>
			<img src="@/assets/img/obs_dock.png" alt="obs dock screen">
		</div>

		<div v-if="tipIndex===10" class="entry">
			<Icon name="highlight" alt="chat highlight" class="icon" theme="light" />
			<h1>{{ $t('tips.highlight.title') }}</h1>
			<div>{{ $t('tips.highlight.info') }}</div>

			<a class="demo" href="https://www.youtube.com/watch?v=Yv3ACHtNj3Q" target="_blank"><img src="@/assets/img/param_examples/chatHighlightVideo.jpg" class="cover"></a>

			<TTButton primary light @click.stop="openParamPage(contentOverlays, contentChatHighlight)" icon="overlay">{{ $t('tips.highlight.config_overlayBt') }}</TTButton>
			<div class="or">{{ $t("global.or") }}</div>
			<TTButton primary light @click.stop="openParamPage(contentTriggers)" icon="broadcast">{{ $t('tips.highlight.configure_triggerBt') }}</TTButton>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
		TTButton,
	},
})
class ChatTipAndTrickAd extends Vue {

	public tipIndex = 0;
	private maxIndex = 11;

	public get contentOverlays() { return TwitchatDataTypes.ParameterPages.OVERLAYS; }
	public get contentChatHighlight() { return TwitchatDataTypes.ParamDeepSections.HIGHLIGHT; }
	public get contentConnexions() { return TwitchatDataTypes.ParameterPages.CONNECTIONS; }
	public get contentTriggers() { return TwitchatDataTypes.ParameterPages.TRIGGERS; }
	public get subcontentObs() { return TwitchatDataTypes.ParamDeepSections.OBS; }
	public get subcontentSpotify() { return TwitchatDataTypes.ParamDeepSections.SPOTIFY; }
	public get subcontentStreamdeck() { return TwitchatDataTypes.ParamDeepSections.STREAMDECK; }

	public beforeMount():void {
		this.tipIndex = Math.floor(Math.random()*(this.maxIndex+1));
	}

	public openModal(modal:TwitchatDataTypes.ModalTypes):void { this.$store.params.openModal(modal); }
	public openParamItem(paramPath:string):void { this.$store.params.searchParamByPath(paramPath); }
	public openParamPage(page:TwitchatDataTypes.ParameterPagesStringType, subContent?:TwitchatDataTypes.ParamDeepSectionsStringType):void { this.$store.params.openParamsPage(page, subContent); }

	public onRightClick(e:MouseEvent):void {
		if(e.ctrlKey || e.metaKey) {
			e.preventDefault();
			this.tipIndex = (this.tipIndex + 1)%(this.maxIndex+1)
		}
	}
}
export default toNative(ChatTipAndTrickAd);
</script>

<style scoped lang="less">
.chattipandtrickad{
	.entry {
		gap: .5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.icon {
			height: 4em;
			width: 4em;
			max-width: 100%;
			margin-bottom: .5em;
		}

		.demo {
			display: block;
			.cover {
				margin:auto;
				display: block;
				max-height: 150px;
				aspect-ratio: 16 / 9;
				border-radius: .5em;
			}
		}

		.or {
			text-transform: uppercase;
		}
		.button {
			font-size: 1rem;
		}
	}
}
</style>
