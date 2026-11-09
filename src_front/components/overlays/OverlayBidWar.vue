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
		<div class="title" id="bidwar_title" v-if="params.title">{{ params.title }}</div>
		<div class="bar" id="bidwar_bar">
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
	</div>
</template>

<script setup lang="ts">
import { useOverlayConnector } from "@/composables/useOverlayConnector";
import type TwitchatEvent from "@/events/TwitchatEvent";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { computed, onBeforeMount, onBeforeUnmount, ref } from "vue";
import { useRoute } from "vue-router";

const params = ref<TwitchatDataTypes.BidWarData>();

let id: string = "";

const route = useRoute();

useOverlayConnector(requestInfo);

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

onBeforeMount(() => {
	id = (route.query.twitchat_overlay_id as string) ?? "";
	PublicAPI.instance.addEventListener("ON_BID_WAR_CONFIGS", onConfig);
});

onBeforeUnmount(() => {
	PublicAPI.instance.removeEventListener("ON_BID_WAR_CONFIGS", onConfig);
});

function requestInfo(): void {
	PublicAPI.instance.broadcast("GET_BID_WAR_CONFIGS", { id });
}

/**
 * Called when receiving overlay configs
 */
function onConfig(e: TwitchatEvent<"ON_BID_WAR_CONFIGS">): void {
	if (!e.data || e.data.id != id) return;
	params.value = e.data;
}

/**
 * Formats amount with the currency pattern.
 * Displays decimals only if necessary.
 */
function formatAmount(amount: number): string {
	const value = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2);
	const pattern = params.value?.currency || Utils.CURRENCY_AMOUNT_TOKEN;
	if (!pattern.includes(Utils.CURRENCY_AMOUNT_TOKEN)) return value + pattern;
	return pattern.replace(Utils.CURRENCY_AMOUNT_TOKEN, value);
}
</script>

<style scoped lang="less">
.overlaybidwar {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	padding: 1em;
	display: flex;
	flex-direction: column;
	color: #ffffff;

	.title {
		font-size: 1.5em;
		font-weight: 800;
		text-align: center;
		line-height: 1.2em;
		word-break: break-word;
		color: #000000;
		background-color: #ffffff;
		max-width: calc(100% - 2em);
		align-self: center;
		padding: 0.25em 1em;
		border-top-left-radius: 0.5em;
		border-top-right-radius: 0.5em;
	}

	.bar {
		position: relative;
		height: 3em;
		border-radius: 2em;
		overflow: hidden;
		background-color: var(--color-b);

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
}
</style>
