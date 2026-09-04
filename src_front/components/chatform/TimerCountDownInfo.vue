<template>
	<div
		class="timercountdowninfo"
		:class="{ hovered: mainHover }"
		@mouseenter="mainHover = true"
		@mouseleave="mainHover = false"
	>
		<TimerCountDownInfoEntry
			class="timer"
			v-if="activeTimers.length > 0"
			:timer="activeTimers[0]!"
			:label="idToLabel[activeTimers[0]!.id]!"
		>
			<div v-if="activeTimers.length > 1" class="more">
				<div class="arrow">▲</div>
				<div class="label">+{{ activeTimers.length - 1 }}</div>
			</div>
		</TimerCountDownInfoEntry>

		<div class="list" v-if="activeTimers.length > 1 && mainHover">
			<TimerCountDownInfoEntry
				class="timer"
				v-for="(timer, index) in activeTimers.concat().splice(1)"
				:key="timer.id"
				:timer="timer"
				:label="idToLabel[timer.id]!"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import TimerCountDownInfoEntry from "./TimerCountDownInfoEntry.vue";

const storeTimer = useStoreTimer();

const idToLabel = ref<Record<string, string>>({});
const mainHover = ref(false);

let interval: number = -1;

const activeTimers = computed<TwitchatDataTypes.TimerData[]>(() => {
	const durationsCache: Record<string, number> = {};
	storeTimer.timerList.forEach((t) => {
		if (t.startAt_ms) {
			durationsCache[t.id] = storeTimer.getTimerComputedValue(t.id).duration_ms;
		}
	});
	return storeTimer.timerList
		.filter((t) => t.startAt_ms)
		.sort((a, b) => {
			if (a.paused && !b.paused) return 1;
			if (!a.paused && b.paused) return -1;
			return durationsCache[a.id]! - durationsCache[b.id]!;
		});
});

onMounted(() => {
	interval = window.setInterval(() => {
		computeValues();
	}, 500);

	computeValues();
});

onBeforeUnmount(() => {
	clearInterval(interval);
});

function computeValues(): void {
	idToLabel.value = {};
	storeTimer.timerList.forEach((t) => {
		if (t.startAt_ms) {
			idToLabel.value[t.id] = storeTimer.getTimerComputedValue(t.id).duration_str;
		}
	});
}
</script>

<style scoped lang="less">
.timercountdowninfo {
	display: flex;
	flex-direction: row;
	position: relative;
	margin: 0 0.5em;

	.timer {
		width: 100%;
	}

	&.hovered {
		min-width: 80px;
		.more {
			display: none;
		}
	}

	.more {
		display: flex;
		flex-direction: column;
		margin: -0.25em 0;
		margin-left: 0.25em;
		align-items: center;
		.arrow {
			font-size: 0.65em;
		}
		.label {
			color: var(--color-light);
			border-radius: var(--border-radius);
			font-size: 0.7em;
			font-family: var(--font-roboto);
			text-transform: uppercase;
		}
	}

	.list {
		position: absolute;
		top: 0;
		transform: translateY(-100%);
		width: 100%;
		display: flex;
		flex-direction: column;
		.timer {
			margin-bottom: 2px;
		}
	}
}
</style>
