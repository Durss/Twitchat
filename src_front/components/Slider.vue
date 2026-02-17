<template>
	<div :class="classes" @pointerdown="onMouseDown" @wheel="onMouseWheel">
		<input type="range" v-model.number="localValue" :min="min" :max="max" :step="step" @pointerdown.capture.stop="" @input="renderBar()" ref="input">
		<div class="gratuations" :style="gratuationsStyles"></div>
		<div class="fill" :style="fillStyles"></div>
	</div>
</template>

<script setup lang="ts">
import { watch, type CSSProperties, ref, computed, onMounted, onBeforeUnmount, getCurrentInstance } from 'vue';

interface Props {
	secondary?: boolean;
	alert?: boolean;
	premium?: boolean;
	light?: boolean;
	disabled?: boolean;
	dotMode?: boolean;
	modelValue?: number;
	min?: number;
	max?: number;
	step?: number;
}

const props = withDefaults(defineProps<Props>(), {
	secondary: false,
	alert: false,
	premium: false,
	light: false,
	disabled: false,
	dotMode: false,
	modelValue: 0,
	min: 0,
	max: 30,
	step: 1,
});

const emit = defineEmits<{
	'update:modelValue': [value: number];
	'stop': [];
	'start': [];
	'change': [value: number];
}>();

const instance = getCurrentInstance();
const input = ref<HTMLInputElement>();

const localValue = ref(0);
const pressed = ref(false);
const fillPercent = ref(20);

let mouseUpHandler: (e: PointerEvent) => void;
let mouseMoveHandler: (e: PointerEvent) => void;

const classes = computed(() => {
	let res: string[] = ["slider"];
	if(props.secondary !== false) res.push("secondary");
	if(props.alert !== false) res.push("alert");
	if(props.premium !== false) res.push("premium");
	if(props.light) res.push("light");
	if(props.disabled) res.push("disabled");
	if(props.dotMode) res.push("dotMode");
	return res;
});

const fillStyles = computed<CSSProperties>(() => {
	if(props.dotMode !== false) {
		return {
			left: (fillPercent.value * 100)+"%"
		};
	}else{
		return {
			width: (fillPercent.value * 100)+"%"
		};
	}
});

const gratuationsStyles = computed<CSSProperties>(() => {
	const ratio = Math.abs(props.max - props.min) / props.step;
	if(ratio > 50) return {backgroundSize:"110%, 50%"};
	return {
		backgroundSize: (100/ratio)+"% 50%",
	};
});

function renderBar(): void {
	fillPercent.value = (localValue.value - props.min)/(props.max - props.min);
	emit("update:modelValue", localValue.value);
	emit("change", localValue.value);
}

function onMouseWheel(e?: WheelEvent): void {
	//Don't allow control via mouse wheel if not focused
	if(document.activeElement != input.value) return;

	const add = e? (e.deltaY > 0)? -1 : 1 : 0;
	let v = localValue.value + add * props.step;
	//Rounding to compensate for bad JS maths.
	//For JS: 0.2 + 0.1 = 0.30000000000000004
	v = Math.round(v/props.step) / (1/props.step);
	const nonClampedValue = v;
	v = Math.max(props.min, Math.min(props.max, v));
	if(v === nonClampedValue && e) e.preventDefault();
	localValue.value = v;
	renderBar();
	emit("stop");
}

function onMouseUp(e: PointerEvent): void {
	pressed.value = false;
	emit("stop");
}

function onMouseDown(e: PointerEvent): void {
	pressed.value = true;
	(e.target as HTMLDivElement).setPointerCapture(e.pointerId);
	onMouseMove(e);
	emit("start");
}

function onMouseMove(e: PointerEvent): void {
	if(!pressed.value) return;

	const bounds = (instance?.proxy?.$el as HTMLElement).getBoundingClientRect();
	//Compute percent of the width clicked
	let percent = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
	//Compute value and round it to the nearest step
	let value = percent * (props.max - props.min) + props.min;
	//using "/(1/step)" instead of " * step" because multiplication has terrible rounding issues.
	//For example: 3/10 = 0.3   but   3 * .1 = 0.30000000000000004
	value = Math.round(value/props.step) / (1/props.step);
	//Set local values
	localValue.value = value;
	fillPercent.value = (localValue.value - props.min) / (props.max - props.min);
}

function updateLimit(): void {
	//Compute percent of the width clicked
	//Compute value and round it to the nearest step
	let value = fillPercent.value * (props.max - props.min) + props.min;
	//using "/(1/step)" instead of " * step" because multiplication has terrible rounding issues.
	//For example: 3/10 = 0.3   but   3 * .1 = 0.30000000000000004
	value = Math.round(value/props.step) / (1/props.step);
	//Set local values
	localValue.value = value;
	fillPercent.value = (localValue.value - props.min) / (props.max - props.min);
}

onMounted(() => {
	localValue.value = props.modelValue;
	fillPercent.value = (localValue.value - props.min) / (props.max - props.min);
	mouseUpHandler = (e: PointerEvent) => onMouseUp(e);
	mouseMoveHandler = (e: PointerEvent) => onMouseMove(e);
	document.addEventListener("pointerup", mouseUpHandler);
	document.addEventListener("pointermove", mouseMoveHandler);

	watch(() => props.min, () => updateLimit());
	watch(() => props.max, () => updateLimit());
	watch(() => props.modelValue, () => {
		localValue.value = props.modelValue;
		renderBar();
	});
});

onBeforeUnmount(() => {
	document.removeEventListener("pointerup", mouseUpHandler);
	document.removeEventListener("pointermove", mouseMoveHandler);
});
</script>

<style scoped lang="less">
.slider{
	.bevel();
	height: 1em;
	position: relative;
	width: 100%;
	background-color: var(--color-primary-fadest);
	border-radius: 1em;
	touch-action: none;
	cursor: pointer;
	overflow: hidden;
	user-select: none;

	.gratuations {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: transparent;
		@c2: var(--color-primary-light);
		background: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		background-size: 100% 50%;
		background-repeat: repeat-x;
		background-position: left center;
	}
	
	.fill {
		.emboss();
		position: relative;
		margin-top: 1px;
		margin-left: 1px;
		width: 50px;
		border-radius: 1em;
		height: calc(100% - 2px);
		background-color: var(--color-primary);
		min-width: 1px;
		z-index: 1;
		// transition: width .1s;
	}
	&.dotMode {
		padding: 0 8px;
		.fill {
			width: calc(1em - 2px);
			height: calc(100% - 2px);
			transform: translateX(-50%);
		}
		.gratuations {
			width: calc(100% - 10px);
			margin-left: 5px;
		}
	}

	input {
		position: absolute;
		top: 0;
		left: 0;
		padding: 0;
		margin: 0;
		height: 100%;
		width: 100%;
		opacity: 0;
		z-index: 2;
		cursor: pointer;
	}

	&.disabled {
		opacity: .5;
		pointer-events: none;
	}
	
	&.secondary {
		background-color: var(--color-secondary-fadest);
		.fill {
			background-color: var(--color-secondary);
		}
		.gratuations {
			@c2: var(--color-secondary-light);
			background-image: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		}
	}
	
	&.alert {
		background-color: var(--color-alert-fadest);
		.fill {
			background-color: var(--color-alert);
		}
		.gratuations {
			@c2: var(--color-alert-light);
			background-image: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		}
	}
	
	&.light {
		background-color: var(--color-light-fadest);
		.fill {
			background-color: var(--color-light);
		}
		.gratuations {
			@c2: var(--color-light-light);
			background-image: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		}
	}
	
	&.premium {
		background-color: var(--color-premium-fadest);
		.fill {
			background-color: var(--color-premium);
		}
		.gratuations {
			@c2: var(--color-premium-light);
			background-image: linear-gradient(90deg, transparent 0%, transparent calc(100% - 1px), @c2 100%);
		}
	}
}
</style>