<template>
	<div
		class="overlaybidwar"
		v-if="params"
		:style="{
			'--color-a': params.sides[0].color,
			'--color-b': params.sides[1].color,
			'--split': splitPercent,
		}"
	>
		<div class="title" id="bidwar_title" ref="title" v-if="params.title">
			<div class="text" id="bidwar_title_text" ref="titleText">{{ params.title }}</div>
		</div>
		<div class="bar" id="bidwar_bar" ref="bar">
			<div class="fill" id="bidwar_bar_fill"></div>
			<div class="separator" id="bidwar_bar_separator"></div>
			<div
				v-for="(side, index) in params.sides"
				:key="index"
				:class="['side', index == 0 ? 'left' : 'right']"
				:id="'bidwar_side_' + index"
			>
				<span class="keyword" :id="'bidwar_side_' + index + '_keyword'">{{
					side.keyword
				}}</span>
				<span class="amount" :id="'bidwar_side_' + index + '_amount'">{{
					formatAmount(side.amount)
				}}</span>
			</div>
		</div>
		<div class="timer" id="bidwar_timer" ref="timer" v-if="timeLeft">
			<span id="bidwar_timer_value">{{ timeLeft }}</span>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useOverlayConnector } from "@/composables/useOverlayConnector";
import type TwitchatEvent from "@/events/TwitchatEvent";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import SetIntervalWorker from "@/utils/SetIntervalWorker";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import { useRoute } from "vue-router";

const params = ref<TwitchatDataTypes.BidWarData>();
/**
 * Current time, refreshed while a countdown is running
 */
const now = ref(Date.now());

let id: string = "";
let tickInterval: string = "";

const route = useRoute();
const titleText = useTemplateRef("titleText");
const titleRef = useTemplateRef("title");
const barRef = useTemplateRef("bar");
const timerRef = useTemplateRef("timer");
let daysLabel: string = "d";

useOverlayConnector((): void => {
	PublicAPI.instance.broadcast("GET_BID_WAR_CONFIGS", { id });
});

watch(() => params.value?.title, fitTitle, { flush: "post" });

/**
 * Position of the separation between the 2 choices
 */
const splitPercent = computed<string>(() => {
	if (!params.value) return "50%";
	const a = params.value.sides[0].amount;
	const b = params.value.sides[1].amount;
	const total = a + b;
	const ratio = total > 0 ? a / total : 0.5;
	return ratio * 100 + "%";
});

/**
 * Formatted time left before the bid war ends automatically.
 * Empty if there's no running countdown.
 */
const timeLeft = computed<string>(() => {
	const p = params.value;
	if (!p?.enabled || !p.autoDisable || !p.autoDisable_at) return "";
	const remaining = p.autoDisable_at - now.value;
	if (remaining <= 0) return "";
	// Round up so the countdown starts at the full duration and ends on 00:01
	return Utils.formatDuration(Math.ceil(remaining / 1000) * 1000, true, daysLabel);
});

onBeforeMount(() => {
	id = (route.query.twitchat_overlay_id as string) ?? "";
	PublicAPI.instance.addEventListener("ON_BID_WAR_CONFIGS", onConfig);
	window.addEventListener("resize", fitTitle);
	document.fonts.addEventListener("loadingdone", fitTitle);
	tickInterval = SetIntervalWorker.instance.create(() => {
		if (params.value?.autoDisable_at) now.value = Date.now();
	}, 250);
});

onBeforeUnmount(() => {
	PublicAPI.instance.removeEventListener("ON_BID_WAR_CONFIGS", onConfig);
	window.removeEventListener("resize", fitTitle);
	document.fonts.removeEventListener("loadingdone", fitTitle);
	SetIntervalWorker.instance.delete(tickInterval);
});

async function open() {
	fitTitle();
	await nextTick();
	gsap.killTweensOf([titleRef.value, barRef.value, timerRef.value]);
	gsap.from(titleRef.value, {
		delay: 0.25,
		height: 0,
		padding: 0,
		duration: 0.5,
		ease: "back.out",
		clearProps: "all",
	});
	gsap.from(barRef.value, {
		width: 0,
		padding: 0,
		duration: 0.5,
		ease: "back.out",
		clearProps: "all",
	});
	gsap.from(timerRef.value, {
		delay: 0.75,
		height: 0,
		padding: 0,
		duration: 0.5,
		ease: "back.out",
		clearProps: "all",
	});
}

async function close() {
	gsap.killTweensOf([titleRef.value, barRef.value, timerRef.value]);
	gsap.to(titleRef.value, {
		delay: 0.25,
		height: 0,
		padding: 0,
		duration: 0.5,
		ease: "back.in",
	});
	gsap.to(barRef.value, {
		delay: 0.5,
		width: 0,
		padding: 0,
		duration: 0.5,
		ease: "back.in",
		onComplete: () => {
			params.value = undefined;
		},
	});
	gsap.to(timerRef.value, {
		height: 0,
		padding: 0,
		duration: 0.5,
		ease: "back.in",
	});
}

/**
 * Called when receiving overlay configs
 */
async function onConfig(e: TwitchatEvent<"ON_BID_WAR_CONFIGS">): Promise<void> {
	if (!e.data || e.data.bidwar.id != id) return;
	if (!e.data.bidwar.enabled) {
		if (params.value) close();
		return;
	}
	now.value = Date.now();
	let wasOpen = !!params.value;
	params.value = e.data.bidwar;
	if (e.data.daysLabel) daysLabel = e.data.daysLabel;
	await nextTick();
	if (!wasOpen) open();
}

/**
 * Select text content of the title to measure the width, then set the title width to this value.
 * Without this, because of "text-wrap: balance", the title width is set to the width of the
 * longest line, which shows empty space on its sides.
 */
function fitTitle(): void {
	const el = titleText.value;
	if (!el) return;
	el.style.width = "";
	const range = document.createRange();
	range.selectNodeContents(el);
	el.style.width = Math.ceil(range.getBoundingClientRect().width) + "px";
}

/**
 * Formats amount with the currency pattern
 */
function formatAmount(amount: number): string {
	return Utils.formatCurrency(amount, params.value?.currency || Utils.CURRENCY_AMOUNT_TOKEN);
}
</script>

<style scoped lang="less">
.overlaybidwar {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	padding: 1em 3em;
	display: flex;
	flex-direction: column;
	color: #ffffff;
	align-items: center;

	.title {
		z-index: 2;
		font-size: 1.5em;
		font-weight: 800;
		text-align: center;
		line-height: 1.2em;
		word-break: break-word;
		color: #000000;
		background-color: #ffffff;
		max-width: calc(100% - 2em);
		padding: 0.25em 1em;
		border-top-left-radius: 0.5em;
		border-top-right-radius: 0.5em;
		border-radius: 0.5em;
		margin-bottom: -0.25em;
		overflow: hidden;

		.text {
			max-width: 100%;
			text-wrap: balance;
		}
	}

	.bar {
		position: relative;
		height: 3em;
		border-radius: 2em;
		overflow: hidden;
		background-color: var(--color-b);
		z-index: 1;
		overflow: hidden;
		width: 100%;

		.fill {
			position: absolute;
			top: 0;
			left: 0;
			bottom: 0;
			width: var(--split);
			background-color: var(--color-a);
			transition: width 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
		}

		.separator {
			position: absolute;
			top: 0;
			bottom: 0;
			left: var(--split);
			width: 4px;
			margin-left: -2px;
			background-color: #ffffff;
			transition: left 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
		}

		.side {
			position: absolute;
			top: 0;
			bottom: 0;
			max-width: calc(50% - 1.5em);
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			align-items: center;
			line-height: 1.1em;
			text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);

			&.left {
				left: 0.75em;
				justify-items: flex-start;
			}

			&.right {
				right: 0.75em;
				justify-items: flex-end;
				flex-direction: row-reverse;
			}

			.keyword {
				font-size: 0.85em;
				font-weight: bold;
				letter-spacing: 0.1em;
				text-transform: uppercase;
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
				background-color: rgba(0, 0, 0, 0.3);
				padding: 0.5em 1em;
				border-radius: 10em;
			}

			.amount {
				font-size: 1.5em;
				font-weight: 800;
				font-variant-numeric: tabular-nums;
				white-space: nowrap;
			}
		}
	}

	.timer {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.35em;
		font-size: 1.1em;
		font-weight: bold;
		font-variant-numeric: tabular-nums;
		line-height: 1em;
		color: #000000;
		background-color: #ffffff;
		padding: 0.2em 0.5em 0.25em 0.5em;
		border-bottom-left-radius: 0.5em;
		border-bottom-right-radius: 0.5em;
		overflow: hidden;
	}
}
</style>
