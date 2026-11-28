<template>
	<div
		class="changelogbidwar"
		:style="{
			'--color-a': '#2f6fed',
			'--color-b': '#d6127f',
			'--split': splitPercent,
		}"
	>
		<div class="title" id="bidwar_title" ref="title">
			<div class="text" id="bidwar_title_text" ref="titleText">{{ labels.title }}</div>
		</div>
		<div class="bar" id="bidwar_bar" ref="bar">
			<div class="fill" id="bidwar_bar_fill"></div>
			<div class="fillB" id="bidwar_bar_fill_b"></div>
			<div
				v-for="(_, index) in labels.sides"
				:key="'fx_' + index"
				:class="['fx', index == 0 ? 'left' : 'right', { winning: winner === index }]"
				:id="'bidwar_side_' + index + '_fx'"
			></div>
			<div class="separator" id="bidwar_bar_separator"></div>
			<div
				v-for="(side, index) in labels.sides"
				:key="index"
				:class="['side', index == 0 ? 'left' : 'right', { winning: winner === index }]"
				:id="'bidwar_side_' + index"
			>
				<span class="keyword" :id="'bidwar_side_' + index + '_keyword'">{{
					side.keyword
				}}</span>
				<span class="amount" :id="'bidwar_side_' + index + '_amount'">{{
					formatAmount(side.amount.value)
				}}</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import SetIntervalWorker from "@/utils/SetIntervalWorker";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

const i18n = useI18n();
const barRef = useTemplateRef("bar");

let side1Amount = ref(20);
let side2Amount = ref(20);

/**
 * Position of the separation between the 2 choices
 */
const splitPercent = computed<string>(() => {
	const a = labels.value.sides[0]!.amount.value;
	const b = labels.value.sides[1]!.amount.value;
	const total = a + b;
	const ratio = total > 0 ? a / total : 0.5;
	return ratio * 100 + "%";
});

/**
 * Index of the side currently leading, -1 on a tie
 */
const winner = computed<number>(() => {
	const a = side1Amount.value;
	const b = side2Amount.value;
	if (a == b) return -1;
	return a > b ? 0 : 1;
});

// Make the amount pop when a side takes the lead
watch(winner, (index) => {
	if (index < 0) return;
	const amount = barRef.value?.querySelectorAll(".amount")[index];
	if (!amount) return;
	gsap.killTweensOf(amount);
	gsap.fromTo(
		amount,
		{ scale: 1.4 },
		{ scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)", clearProps: "transform" },
	);
});

const labels = computed(() => {
	let locale = i18n.locale.value.toLowerCase();
	if (locale != "fr" && locale != "en") locale = "en";
	return {
		fr: {
			title: "Je rase quoi ?",
			sides: [
				{
					keyword: "sourcils",
					amount: side1Amount,
				},
				{
					keyword: "cheveux",
					amount: side2Amount,
				},
			],
		},
		en: {
			title: "What do I shave?",
			sides: [
				{
					keyword: "eyebrows",
					amount: side1Amount,
				},
				{
					keyword: "hair",
					amount: side2Amount,
				},
			],
		},
	}[locale]!;
});

function fakeTip() {
	if (side1Amount.value > 1000 || side2Amount.value > 1000) {
		side1Amount.value = 0;
		side2Amount.value = 0;
	}
	let side = Utils.pickRand([0, 1]) as 0 | 1;
	let amount = Math.round(
		(Math.random() * Math.max(10, side1Amount.value + side2Amount.value)) / 4,
	);
	if (Math.random() > 0.9) amount += Math.random();
	labels.value.sides[side]!.amount.value += amount;
}

const interval = SetIntervalWorker.instance.create(() => {
	fakeTip();
}, 1000);

onMounted(() => {
	fakeTip();
});

onBeforeUnmount(() => {
	SetIntervalWorker.instance.delete(interval);
});

/**
 * Formats amount with the currency pattern
 */
function formatAmount(amount: number): string {
	return Utils.formatCurrency(amount, "${AMOUNT}");
}
</script>

<style scoped lang="less">
.changelogbidwar {
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	.title {
		z-index: 2;
		font-size: 1em;
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
		// Shared by everything following the split so they stay in sync
		@splitEase: cubic-bezier(0.3, 1.4, 0.5, 1);
		position: relative;
		height: 3em;
		border-radius: 2em;
		overflow: hidden;
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
			transition: width 0.6s @splitEase;
		}

		// Right side's gradient, starting at the split instead of the bar's left edge
		.fillB {
			position: absolute;
			top: 0;
			bottom: 0;
			left: var(--split);
			right: 0;
			background: var(--color-b);
			transition: left 0.6s @splitEase;
		}

		// Glow + light sweeping toward the separator on the leading side
		.fx {
			position: absolute;
			top: 0;
			bottom: 0;
			overflow: hidden;
			opacity: 0;
			box-shadow: inset 0 0 0.75em #ffffff80;
			transition:
				opacity 0.3s,
				width 0.6s @splitEase,
				left 0.6s @splitEase;
			animation: bidwarGlow 1.5s ease-in-out infinite paused;

			&::before {
				content: "";
				position: absolute;
				inset: 0;
				background: linear-gradient(
					var(--shine-angle),
					transparent 35%,
					#ffffff66 50%,
					transparent 65%
				);
				transform: translateX(-100%);
				animation: bidwarShine 1.5s ease-in-out infinite paused;
			}

			&.left {
				--shine-angle: 105deg;
				left: 0;
				width: var(--split);
				// Follow the bar's rounded end so the glow isn't cut off
				border-radius: 2em 0 0 2em;
			}

			&.right {
				--shine-angle: -105deg;
				left: var(--split);
				right: 0;
				border-radius: 0 2em 2em 0;
				&::before {
					animation-direction: reverse;
				}
			}

			&.winning {
				opacity: 1;
				animation-play-state: running;
				&::before {
					animation-play-state: running;
				}
			}

			// Sweep across, then rest for the remaining 40% of the cycle
			@keyframes bidwarShine {
				0% {
					transform: translateX(-100%);
				}
				60%,
				100% {
					transform: translateX(100%);
				}
			}
			@keyframes bidwarGlow {
				0% {
					box-shadow: inset 0 0 0.25em #ffffff80;
				}
				50% {
					box-shadow: inset 0 0 1em #ffffff80;
				}
				100% {
					box-shadow: inset 0 0 0.25em #ffffff80;
				}
			}
		}

		.separator {
			position: absolute;
			top: 0;
			bottom: 0;
			left: var(--split);
			width: 4px;
			margin-left: -2px;
			background-color: #ffffff;
			transition: left 0.6s @splitEase;
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
				font-size: 0.75em;
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
				font-size: 1.25em;
				font-weight: 800;
				font-variant-numeric: tabular-nums;
				white-space: nowrap;
			}
		}
	}
}
</style>
