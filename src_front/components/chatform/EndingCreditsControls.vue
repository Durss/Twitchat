<template>
	<div class="endingcreditscontrols blured-background-window" ref="rootEl">
		<div class="speed">
			<div class="label"><Icon name="timer" /> {{ t("credits_control.speed") }}</div>
			<Slider
				@change="onSpeed()"
				@stop="onStopDragSlider()"
				dotMode
				light
				class="slider"
				v-model="speed"
				:min="-10"
				:max="10"
			></Slider>
		</div>
		<TTButton @click="prev()" icon="prev">{{ t("credits_control.prevBt") }}</TTButton>
		<TTButton @click="next()" icon="next">{{ t("credits_control.nextBt") }}</TTButton>
		<TTButton @click="stop()" icon="stop">{{ t("credits_control.stopBt") }}</TTButton>
		<TTButton @click="start()" icon="refresh">{{
			t("credits_control.force_startBt")
		}}</TTButton>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import { gsap } from "gsap/gsap-core";
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import Icon from "../Icon.vue";
import Slider from "../Slider.vue";
import TTButton from "../TTButton.vue";

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const storeStream = useStoreStream();
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

const speed = ref<number>(0);
const ignoreSpeedchange = ref<boolean>(false);

async function stop(): Promise<void> {
	const summary: TwitchatDataTypes.StreamSummaryData = {
		streamDuration: 0,
		follows: [],
		raids: [],
		subs: [],
		resubs: [],
		subgifts: [],
		bits: [],
		hypeChats: [],
		rewards: [],
		shoutouts: [],
		hypeTrains: [],
		polls: [],
		predictions: [],
		chatters: [],
		merch: [],
		tips: [],
		powerups: [],
		superChats: [],
		superStickers: [],
		tiktokGifts: [],
		tiktokLikes: [],
		tiktokShares: [],
		patreonMembers: [],
		labels: {
			no_entry: "",
			premium_only: "",
			train: "",
			sub_duration: "",
		},
	};
	PublicAPI.instance.broadcast("SET_ENDING_CREDITS_DATA", summary);
}

onMounted(() => {
	open();
	document.addEventListener("mousedown", onClick);
});

onBeforeUnmount(() => {
	document.removeEventListener("mousedown", onClick);
});

async function start(): Promise<void> {
	const summary = await storeStream.getSummary(undefined, true);
	PublicAPI.instance.broadcast("SET_ENDING_CREDITS_DATA", summary);
}

function prev(): void {
	PublicAPI.instance.broadcast("SET_ENDING_CREDITS_CONTROL", { prev: true });
}

function next(): void {
	PublicAPI.instance.broadcast("SET_ENDING_CREDITS_CONTROL", { next: true });
}

function onSpeed(): void {
	if (ignoreSpeedchange.value) return;
	const sign = speed.value < 0 ? -1 : 1;
	const computedSpeed = (100 / (1 + Math.exp(-0.1 * (Math.abs(speed.value) * 10 - 50)))) * sign;
	PublicAPI.instance.broadcast("SET_ENDING_CREDITS_CONTROL", {
		speed: speed.value == 0 ? 0 : computedSpeed / 5,
	});
}

function onStopDragSlider(): void {
	let tween = { speed: speed.value };
	speed.value = 0;
	onSpeed();
	ignoreSpeedchange.value = true;
	gsap.to(tween, {
		speed: 0,
		duration: 0.25,
		onUpdate: () => {
			speed.value = tween.speed;
		},
		onComplete: () => {
			ignoreSpeedchange.value = false;
		},
	});
}

function open(): void {
	const element = rootEl.value!;
	gsap.killTweensOf(element);
	gsap.from(element, {
		duration: 0.2,
		scaleX: 0,
		delay: 0.1,
		clearProps: "scaleX",
		ease: "back.out",
	});
	gsap.from(element, { duration: 0.3, scaleY: 0, clearProps: "scaleY", ease: "back.out" });
}

function close(): void {
	const element = rootEl.value!;
	gsap.killTweensOf(element);
	gsap.to(element, { duration: 0.3, scaleX: 0, ease: "back.in" });
	gsap.to(element, {
		duration: 0.2,
		scaleY: 0,
		delay: 0.1,
		clearProps: "scaleY, scaleX",
		ease: "back.in",
		onComplete: () => {
			emit("close");
		},
	});
}

function onClick(e: MouseEvent): void {
	let target = e.target as HTMLDivElement;
	const el = rootEl.value!;
	while (target != document.body && target != el && target) {
		target = target.parentElement as HTMLDivElement;
	}
	if (target != el) {
		//Close if clicking out of the holder
		close();
	}
}
</script>

<style scoped lang="less">
.endingcreditscontrols {
	width: fit-content;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;
	color: var(--color-light);
	gap: 0.25em;
	display: flex;
	flex-direction: column;

	.speed {
		@sliderSize: 200px;
		@width: 30px;
		text-align: center;
		.icon {
			height: 1em;
			vertical-align: bottom;
		}
		.slider {
			width: @sliderSize;
			height: @width;
			left: 50%;
			transform: rotate(-90deg) translateY(-100%);
			// margin: calc(@sliderSize / 2 - .5em) 0;//calc(-@sliderSize / 2 + 2.5em);//No idea why +2.5em works :]
			margin: calc(@sliderSize / 2 - 0.5em) calc(-@sliderSize / 2 + @width);
		}
		.label {
			margin-bottom: calc(@sliderSize / 2);
		}
	}
}
</style>
