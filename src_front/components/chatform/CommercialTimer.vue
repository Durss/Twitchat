<template>
	<div :class="classes" v-if="showTimer" ref="rootEl">
		<Icon name="ad" />

		<div
			class="timer"
			ref="label"
			v-tooltip="{
				content: isAdRunning
					? t('global.tooltips.commercial')
					: t('global.tooltips.commercial_soon'),
				offset: [0, 35],
			}"
		>
			{{ timeLeftFormatted }}s
		</div>

		<Button
			v-if="!isAdRunning && snoozeLeft > 0 && !error"
			light
			primary
			small
			icon="timeout"
			ref="snoozeBt"
			class="snoozeBt"
			@click.capture="snooze()"
			v-tooltip="t('global.tooltips.commercial_snooze')"
			:loading="snoozing"
			>Snooze {{ snoozeLeft }}/{{ snoozeMax }}</Button
		>

		<div
			v-if="error"
			class="card-item alert error"
			@click="error = false"
			aria-label="click to close"
		>
			ERROR :(
		</div>
	</div>
</template>

<script setup lang="ts">
import Utils from "@/utils/Utils";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";

const Button = TTButton;

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeStream = useStoreStream();

const showTimer = ref<boolean>(false);
const error = ref<boolean>(false);
const canSnooze = ref<boolean>(false);
const snoozing = ref<boolean>(false);
const isAdComing = ref<boolean>(true);
const isAdRunning = ref<boolean>(true);
const timeLeft = ref<number>(0);
const timeLeftFormatted = ref<string>("");
const snoozeLeft = ref<number>(3);
const snoozeMax = ref<number>(3);

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const label = useTemplateRef<HTMLDivElement>("label");

let interval: number = -1;

const classes = computed<string[]>(() => {
	const res = ["commercialtimer"];
	if (isAdRunning.value) res.push("secondary");
	return res;
});

function refreshTimer(): void {
	const maxSchedule = 10 * 60000;
	const channelId = storeAuth.twitch.user.id;
	const infos = storeStream.getCommercialInfo(channelId);
	snoozeLeft.value = infos.remainingSnooze;
	snoozeMax.value = Math.max(3, infos.remainingSnooze); //Not 100% sure we get 3 snooze max so we get the max of both values
	//Check if an ad is rolling
	isAdComing.value = false;
	isAdRunning.value = false;
	let startDate: number = 0;
	if (infos.prevAdStart_at + infos.currentAdDuration_ms >= Date.now()) {
		isAdRunning.value = true;
		startDate = infos.prevAdStart_at + infos.currentAdDuration_ms;
	} else if (
		Date.now() > infos.nextAdStart_at &&
		Date.now() < infos.nextAdStart_at + infos.currentAdDuration_ms
	) {
		isAdRunning.value = true;
		startDate = infos.nextAdStart_at + infos.currentAdDuration_ms;
	} else //Check if an ad is coming in less than "maxSchedule"" minutes
	 if (infos.nextAdStart_at > 0 && infos.nextAdStart_at - Date.now() < maxSchedule) {
		isAdComing.value = true;
		startDate = infos.nextAdStart_at;
	}
	timeLeft.value = Math.max(0, Math.round((startDate - Date.now()) / 1000));
	timeLeftFormatted.value = Utils.formatDuration(timeLeft.value * 1000);

	const prevShow = showTimer.value;
	showTimer.value = (isAdRunning.value || isAdComing.value) && timeLeft.value > 0;
	if (!prevShow && showTimer.value) {
		nextTick().then(() => {
			openAnimation();
		});
	}
}

function openAnimation(): void {
	// const snooze = (snoozeBt.value as ComponentPublicInstance).$el as HTMLDivElement | undefined;
	// if(snooze) {
	// 	gsap.from(snooze, {duration:.25, width:0, padding:0, clearProps:"all", delay: 1.5, ease:"sine.inOut"});
	// }
	gsap.from(label.value!, {
		duration: 0.5,
		width: 0,
		padding: 0,
		clearProps: "all",
		delay: 0.5,
		ease: "sine.inOut",
	});
	gsap.from(rootEl.value!, {
		duration: 0.5,
		width: 0,
		height: 0,
		padding: 0,
		ease: "sine.inOut",
	});
	gsap.from(rootEl.value!, { duration: 0.5, gap: 0, clearProps: "all", ease: "sine.inOut" });
}

async function snooze(): Promise<void> {
	if (!canSnooze.value) {
		TwitchUtils.requestScopes([TwitchScopes.ADS_SNOOZE]);
	} else {
		snoozing.value = true;
		const res = await TwitchUtils.snoozeNextAd();
		error.value = res == null;
		snoozing.value = false;
	}
}

onMounted(() => {
	refreshTimer();
	interval = window.setInterval(() => refreshTimer(), 1000);
	canSnooze.value = TwitchUtils.hasScopes([TwitchScopes.ADS_SNOOZE]);
});

onBeforeUnmount(() => {
	clearInterval(interval);
});
</script>

<style scoped lang="less">
.commercialtimer {
	gap: 0.5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	font-size: 0.8em;
	height: 2em;
	color: var(--color-light);
	background-color: var(--color-primary);
	// padding: .25em .5em;
	padding: 0 0.5em;
	border-radius: var(--border-radius);
	position: relative;

	&.secondary {
		background-color: var(--color-secondary);
		text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.5);
	}

	.icon {
		height: 1em;
	}
	.timer {
		font-family: Azeret;
		overflow: hidden;
		cursor: default;
	}
	.snoozeBt {
		position: absolute;
		flex-wrap: nowrap;
		width: max-content;
		bottom: 100%;
		left: 50%;
		transform: translate(-50%, 0) !important;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s;
		:deep(.label) {
			white-space: nowrap;
		}
	}

	&:hover {
		.snoozeBt {
			opacity: 1;
			pointer-events: auto;
		}
	}

	.error {
		font-weight: bold;
		cursor: pointer;
		position: absolute;
		flex-wrap: nowrap;
		width: max-content;
		bottom: 100%;
		left: 50%;
		transform: translate(-50%, 0) !important;
	}
}
</style>
