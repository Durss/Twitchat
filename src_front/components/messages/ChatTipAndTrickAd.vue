<template>
	<div class="chattipandtrickad" @contextmenu="onRightClick($event)">
		<div v-if="tipIndex === 0" class="entry">
			<Icon name="obs" alt="elgato" class="icon" theme="light" />
			<h1>{{ t("tips.alerts.title") }}</h1>
			<div>{{ t("tips.alerts.info_1") }}</div>
			<TTButton
				primary
				light
				@click.stop="openParamPage(TwitchatDataTypes.ParameterPages.TRIGGERS)"
				>{{ t("tips.tryBt") }}</TTButton
			>
		</div>

		<div v-if="tipIndex === 1" class="entry">
			<Icon name="elgato" alt="elgato" class="icon" theme="light" />
			<h1>{{ t("tips.streamdeck.title") }}</h1>
			<div>{{ t("tips.streamdeck.info_1") }}</div>
			<div>{{ t("tips.streamdeck.info_2") }}</div>
			<TTButton
				primary
				light
				@click.stop="
					openParamPage(
						TwitchatDataTypes.ParameterPages.OVERLAYS,
						TwitchatDataTypes.ParamDeepSections.STREAMDECK,
					)
				"
				>{{ t("tips.tryBt") }}</TTButton
			>
		</div>

		<div v-if="tipIndex === 2" class="entry">
			<Icon name="raid" alt="raid" class="icon" theme="light" />
			<h1>{{ t("tips.obs_stop.title") }}</h1>
			<div>{{ t("tips.obs_stop.info_1") }}</div>
			<TTButton primary light @click.stop="openParamItem('features.stopStreamOnRaid')">{{
				t("tips.tryBt")
			}}</TTButton>
		</div>

		<div v-if="tipIndex === 3" class="entry">
			<Icon name="bingo" alt="bingo" class="icon" theme="light" />
			<h1>{{ t("tips.bingo.title") }}</h1>
			<div>{{ t("tips.bingo.info_1") }}</div>
			<TTButton primary light @click.stop="openModal('bingo')">{{
				t("tips.tryBt")
			}}</TTButton>
		</div>

		<div v-if="tipIndex === 4" class="entry">
			<Icon name="ticket" alt="raffle" class="icon" theme="light" />
			<h1>{{ t("tips.raffle.title") }}</h1>
			<div>{{ t("tips.raffle.info_1") }}</div>
			<div>{{ t("tips.raffle.info_2") }}</div>
			<TTButton primary light @click.stop="openModal('raffle')">{{
				t("tips.tryBt")
			}}</TTButton>
		</div>

		<div v-if="tipIndex === 5" class="entry">
			<Icon name="obs" alt="obs" class="icon" theme="light" />
			<h1>{{ t("tips.obs.title") }}</h1>
			<div>{{ t("tips.obs.info_1") }}</div>
			<div>{{ t("tips.obs.info_2") }}</div>
			<TTButton
				primary
				light
				@click.stop="
					openParamPage(
						TwitchatDataTypes.ParameterPages.CONNECTIONS,
						TwitchatDataTypes.ParamDeepSections.OBS,
					)
				"
				>{{ t("tips.tryBt") }}</TTButton
			>
		</div>

		<div v-if="tipIndex === 6" class="entry">
			<Icon name="api" alt="api" class="icon" theme="light" />
			<h1>{{ t("tips.api.title") }}</h1>
			<div>{{ t("tips.api.info_1") }}</div>
			<div>{{ t("tips.api.info_2") }}</div>
			<TTButton
				primary
				light
				icon="github"
				href="https://github.com/Durss/Twitchat/blob/main/PUBLIC_API.md"
				target="_blank"
				type="link"
				>{{ t("tips.api.readBt") }}</TTButton
			>
		</div>

		<div v-if="tipIndex === 7" class="entry">
			<Icon name="music" alt="music" class="icon" theme="light" />
			<h1>{{ t("tips.music.title") }}</h1>
			<div v-html="t('tips.music.info_1')"></div>
			<div>{{ t("tips.music.info_2") }}</div>
			<TTButton
				primary
				light
				@click.stop="
					openParamPage(
						TwitchatDataTypes.ParameterPages.CONNECTIONS,
						TwitchatDataTypes.ParamDeepSections.SPOTIFY,
					)
				"
				>{{ t("tips.tryBt") }}</TTButton
			>
		</div>

		<div v-if="tipIndex === 8" class="entry">
			<Icon name="overlay" alt="overlay" class="icon" theme="light" />
			<h1>{{ t("tips.overlays.title") }}</h1>
			<div v-html="t('tips.overlays.info_1')"></div>
			<div v-html="t('tips.overlays.info_2')"></div>
			<TTButton
				primary
				light
				@click.stop="openParamPage(TwitchatDataTypes.ParameterPages.OVERLAYS)"
				>{{ t("tips.tryBt") }}</TTButton
			>
		</div>

		<div v-if="tipIndex === 9" class="entry">
			<Icon name="countdown" alt="timer" class="icon" theme="light" />
			<h1>{{ t("tips.countdown.title") }}</h1>
			<i18n-t scope="global" tag="div" keypath="tips.countdown.info_1">
				<template #CMD1><mark class="cmd">/timerStart</mark></template>
				<template #CMD2><mark class="cmd">/countdown</mark></template>
			</i18n-t>
			<TTButton primary light icon="countdown" @click.stop="openModal('timer')">{{
				t("tips.tryBt")
			}}</TTButton>
		</div>

		<div v-if="tipIndex === 10" class="entry">
			<Icon name="obs" alt="obs dock" class="icon" theme="light" />
			<h1>{{ t("tips.dock.title") }}</h1>
			<div v-html="t('tips.dock.info_1')"></div>
			<div v-html="t('tips.dock.info_2')"></div>
			<img src="@/assets/img/obs_dock.png" alt="obs dock screen" />
		</div>

		<div v-if="tipIndex === 11" class="entry">
			<Icon name="highlight" alt="chat highlight" class="icon" theme="light" />
			<h1>{{ t("tips.highlight.title") }}</h1>
			<div>{{ t("tips.highlight.info") }}</div>

			<a class="demo" href="https://www.youtube.com/watch?v=Yv3ACHtNj3Q" target="_blank"
				><img src="@/assets/img/param_examples/chatHighlightVideo.jpg" class="cover"
			/></a>

			<TTButton
				primary
				light
				@click.stop="
					openParamPage(
						TwitchatDataTypes.ParameterPages.OVERLAYS,
						TwitchatDataTypes.ParamDeepSections.HIGHLIGHT,
					)
				"
				icon="overlay"
				>{{ t("tips.highlight.config_overlayBt") }}</TTButton
			>
		</div>

		<div v-if="tipIndex === 12" class="entry">
			<Icon name="quiz" alt="quiz" class="icon" theme="light" />
			<h1>{{ t("tips.quiz.title") }}</h1>
			<div v-html="t('tips.quiz.info')" />

			<TTButton
				primary
				light
				@click.stop="
					openParamPage(
						TwitchatDataTypes.ParameterPages.OVERLAYS,
						TwitchatDataTypes.ParamDeepSections.QUIZ,
					)
				"
				icon="overlay"
				>{{ t("tips.quiz.createBt") }}</TTButton
			>
		</div>

		<div v-if="tipIndex === 13" class="entry">
			<Icon name="bluesky" alt="bluesky" class="icon" theme="light" />
			<h1>{{ t("tips.bluesky.title") }}</h1>
			<div v-html="t('tips.bluesky.info')" />

			<TTButton
				primary
				light
				@click.stop="
					openParamPage(
						TwitchatDataTypes.ParameterPages.CONNECTIONS,
						TwitchatDataTypes.ParamDeepSections.BLUESKY,
					)
				"
				icon="overlay"
				>{{ t("tips.bluesky.connectBt") }}</TTButton
			>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";

const { t } = useI18n();
const storeParams = useStoreParams();

const maxIndex = 13;
const tipIndex = ref(Math.floor(Math.random() * (maxIndex + 1)));
tipIndex.value = maxIndex;

function openModal(modal: TwitchatDataTypes.ModalTypes): void {
	storeParams.openModal(modal);
}

function openParamItem(paramPath: string): void {
	storeParams.searchParamByPath(paramPath);
}

function openParamPage(
	page: TwitchatDataTypes.ParameterPagesStringType,
	subContent?: TwitchatDataTypes.ParamDeepSectionsStringType,
): void {
	storeParams.openParamsPage(page, subContent);
}

function onRightClick(e: MouseEvent): void {
	if (e.ctrlKey || e.metaKey) {
		e.preventDefault();
		tipIndex.value = (tipIndex.value + 1) % (maxIndex + 1);
	}
}
</script>

<style scoped lang="less">
.chattipandtrickad {
	.entry {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
		.icon {
			height: 4em;
			width: 4em;
			max-width: 100%;
			margin-bottom: 0.5em;
		}

		.demo {
			display: block;
			.cover {
				margin: auto;
				display: block;
				max-height: 150px;
				aspect-ratio: 16 / 9;
				border-radius: 0.5em;
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

