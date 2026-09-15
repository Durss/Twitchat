<template>
	<tooltip :content="timer.title" placement="left">
		<div
			class="timercountdowninfoentry"
			:class="{ paused: timer.paused, hovered: hover }"
			@mouseenter="hover = true"
			@mouseleave="hover = false"
			@click="storeTimer.timerStop(timer.id)"
		>
			<Icon name="countdown" alt="countdown" v-if="timer.type == 'countdown'" />
			<Icon name="timer" alt="timer" v-else />
			<div class="value">{{ label }}</div>
			<div class="stopLabel">{{ t("global.stop") }}</div>
			<slot></slot>
		</div>
	</tooltip>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";

defineProps<{
	timer: TwitchatDataTypes.TimerData;
	label: string;
}>();

const { t } = useI18n();
const storeTimer = useStoreTimer();

const hover = ref(false);
</script>

<style scoped lang="less">
.timercountdowninfoentry {
	cursor: pointer;
	display: flex;
	position: relative;
	flex-direction: row;
	align-items: center;
	white-space: nowrap;
	color: var(--color-text);
	font-size: 0.9em;
	padding: 0.35em;
	border-radius: var(--border-radius);
	color: var(--color-light);
	background-color: var(--color-secondary);
	font-family: var(--font-roboto);
	overflow: hidden;

	& > * {
		pointer-events: none;
	}
	.value {
		flex: 1;
		text-align: center;
	}

	.stopLabel {
		opacity: 0;
		position: absolute;
		top: 50%;
		left: calc(50% + 0.5em);
		transform: translate(-50%, -50%);
		text-transform: uppercase;
	}

	.icon {
		height: 1em;
		width: 1em;
		object-fit: fill;
		padding-right: 0.3em;
		flex-shrink: 0;
	}

	&.paused {
		background-color: var(--color-secondary-fader);
	}

	&.hovered {
		.stopLabel {
			opacity: 1;
		}
		.value {
			opacity: 0;
		}
	}
}
</style>
