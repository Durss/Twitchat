<template>
	<div :class="classes">
		<div class="fill" :style="barStyles"></div>
		<div class="timer" ref="timer" :style="timerStyles" v-if="percent<1 && duration != undefined">{{timeLeft}}</div>
	</div>
</template>

<script setup lang="ts">
import Utils from '@/utils/Utils';
import type { CSSProperties } from 'vue';
import { computed, ref } from 'vue';

interface Props {
	percent?: number;
	duration?: number;
	secondary?: boolean;
	premium?: boolean;
	alert?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	percent: 0,
	duration: 1,
	secondary: false,
	premium: false,
	alert: false,
});

const timer = ref<HTMLElement>();

const timeLeft = computed(() => Utils.formatDuration(props.duration * Math.max(0, Math.min(1, (1-props.percent)))));

const elapsedPercent = computed(() => Math.max(0, Math.min(1, (1-props.percent))));

const classes = computed(() => {
	const list = ["progressbar"];
	if(props.secondary !== false) list.push("secondary");
	if(props.premium !== false) list.push("premium");
	if(props.alert !== false) list.push("alert");
	return list;
});

const barStyles = computed<CSSProperties>(() => {
	return {
		transform: `scaleX(${elapsedPercent.value*100}%)`,
	}
});

const timerStyles = computed<CSSProperties>(() => {
	if(timer.value) {
		const parent = timer.value.parentElement!.getBoundingClientRect();
		const bounds = timer.value.getBoundingClientRect();
		const barSize = elapsedPercent.value * parent.width;
		let px = barSize - bounds.width;
		const offset = -px / bounds.width;
		if(px < 0) px -= barSize - bounds.width;
		return {
			right:"auto",
			transform: "translateX("+px+"px)",
			backgroundPositionX: offset > 0? (offset*100)+"%" : "0%"
		}
	}else{
		return {
			right: (props.percent*100)+"%",
		}
	}
});
</script>

<style scoped lang="less">
.progressbar{
	height: 5px;
	width: 100%;
	@bg: #555;
	@bg: var(--grayout);
	background: @bg;
	position: relative;
	@shadow: 0 4px 4px rgba(0, 0, 0, .5);
	flex-shrink: 0;

	.fill {
		box-shadow: @shadow;
		height: 4px;
		width: 100%;
		background-color: var(--color-primary);
		transform-origin: left;
		will-change: transform;
		position: absolute;
	}

	.timer {
		position: absolute;
		font-family: var(--font-roboto);
		background-color: var(--color-primary);
		color: var(--color-light);
		top: 0;
		font-size: .9em;
		padding: 2px 5px;
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		box-shadow: @shadow;
		transform: translateX(0);
		will-change: transform;
		@c:var(--color-primary);
		background-color: @c;
		background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
		background-size: 200% 100%;
	}

	&.secondary {
		@c: var(--color-secondary);
		.fill {
			background-color: @c;
		}
		.timer {
			background-color: @c;
			background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
			background-size: 200% 100%;
		}
	}

	&.alert {
		@c: var(--color-alert);
		.fill {
			background-color: @c;
		}
		.timer {
			background-color: @c;
			background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
			background-size: 200% 100%;
		}
	}

	&.premium {
		@c: var(--color-premium);
		.fill {
			background-color: @c;
		}
		.timer {
			background-color: @c;
			background: linear-gradient(90deg, @c 0%, @c 50%, @bg 50%, @bg 100%);
			background-size: 200% 100%;
		}
	}
}
</style>
