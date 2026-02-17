<template>
	<div class="durationform input-field">
		<ContentEditable class="input" v-if="showDays"
			tag="span"
			ref="inputD"
			v-model="days"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			:maxLength="3"
			@keydown="onKeyDown($event, 'd')"
			@focus="onFocus($event)"
			@blur="clamp('d'); onChange()" />

		<p class="split days" v-if="showDays">{{ $t("global.date_days") }}</p>

		<ContentEditable class="input" v-if="showHours"
			tag="span"
			ref="inputH"
			v-model="hours"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			:maxLength="2"
			@keydown="onKeyDown($event, 'h')"
			@focus="onFocus($event)"
			@blur="clamp('h'); onChange()" />

		<p class="split" v-if="showHours">h</p>

		<ContentEditable class="input" v-if="showMinutes"
			tag="span"
			ref="inputM"
			v-model="minutes"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			:maxLength="9"
			@keydown="onKeyDown($event, 'm')"
			@focus="onFocus($event)"
			@blur="clamp('m'); onChange()" />

		<p class="split" v-if="showMinutes">m</p>

		<ContentEditable class="input"
			tag="span"
			ref="inputS"
			v-model="seconds"
			v-autofocus="autofocus"
			:contenteditable="true"
			:no-nl="true"
			:no-html="true"
			:id="id"
			:maxLength="9"
			@keydown="onKeyDown($event, 's')"
			@focus="onFocus($event)"
			@blur="clamp('s'); onChange()" />

		<p class="split">s</p>
	</div>
</template>

<script setup lang="ts">
import Utils from '@/utils/Utils';
import { watch, ref, computed, onBeforeMount, type ComponentPublicInstance } from 'vue';
import ContentEditable from '@/components/ContentEditable.vue';

const props = withDefaults(defineProps<{
	id?: string;
	modelValue?: number;
	min?: number;
	max?: number;
	autofocus?: boolean;
	allowMs?: boolean;
}>(), {
	id: "",
	modelValue: 0,
	min: 0,
	max: 23*3600+59*60+59,
	autofocus: false,
	allowMs: false,
});

const emit = defineEmits<{
	'update:modelValue': [value: number];
	'change': [value: number];
}>();

const days = ref("0");
const hours = ref("0");
const minutes = ref("0");
const seconds = ref("0");

const inputD = ref<ComponentPublicInstance>();
const inputH = ref<ComponentPublicInstance>();
const inputM = ref<ComponentPublicInstance>();
const inputS = ref<ComponentPublicInstance>();

const showDays = computed(() => {
	return props.max > 24*60*60;
});

const showHours = computed(() => {
	return props.max > 60*60;
});

const showMinutes = computed(() => {
	return props.max > 60;
});

function onChange(): void {
	const f = props.allowMs !== false? parseFloat : parseInt;
	let v = (f(seconds.value) || 0) + (parseInt(minutes.value) || 0) * 60 + (parseInt(hours.value) || 0) * 3600 + (parseInt(days.value) || 0) * 24*3600;
	const prevV = v;
	if(v > props.max) v = props.max;
	if(v < props.min) v = props.min;
	if(v != prevV) v = initValue(v);
	emit("update:modelValue", v);
	emit("change", v);
}

function onKeyDown(event: KeyboardEvent, field: "d"|"h"|"m"|"s"): void {
	if(event.key == "ArrowUp" || event.key == "ArrowDown") {
		let add = event.key == "ArrowUp"? 1 : -1;
		if(event.shiftKey) add *= 10;
		const f = props.allowMs !== false? parseFloat : parseInt;
		if(add != 0) {
			switch(field){
				case "d": days.value = (parseInt(days.value) + add).toString(); break;
				case "h": hours.value = (parseInt(hours.value) + add).toString(); break;
				case "m": minutes.value = (parseInt(minutes.value) + add).toString(); break;
				case "s": seconds.value = (f(seconds.value) + add).toString(); break;
			}
			clamp(field);
			onChange();
		}
	}
	const input = event.target as HTMLElement;
	if(event.key == "ArrowRight" || event.key == "ArrowLeft") {
		const sel = window.getSelection();
		const dir = event.key == "ArrowRight"? 1 : -1;
		if(sel && sel.rangeCount > 0) {
			//Save caret index
			var range = sel.getRangeAt(0);
			let caretIndex = range.startOffset;
			let inputs = [inputD.value, inputH.value, inputM.value, inputS.value].filter(v => v && v.$el != undefined);
			if(dir == 1 && caretIndex == input.innerText.length
			|| dir == -1 && caretIndex == 0) {
				let index = inputs.findIndex(v => v!.$el == input);
				index += dir;
				if(index > inputs.length-1) index = 0;
				if(index < 0) index = inputs.length-1;
				(inputs[index]!.$el as HTMLSpanElement).focus();
			}
		}
	}
}

function onFocus(event: FocusEvent): void {
	const input = event.target as HTMLElement;
	const range = document.createRange();
	range.selectNodeContents(input);
	const sel = window.getSelection();
	if(sel) {
		sel.removeAllRanges();
		sel.addRange(range);
	}
}

function clamp(field: "d"|"h"|"m"|"s"): void {
	const f = props.allowMs !== false? parseFloat : parseInt;
	switch(field){
		case "d": days.value = Utils.toDigits(loop(parseInt(days.value), 999), 1).toString(); break;
		case "h": hours.value = Utils.toDigits(loop(parseInt(hours.value), 24), 2).toString(); break;
		case "m": minutes.value = Utils.toDigits(loop(parseInt(minutes.value), 59), 2).toString(); break;
		case "s": seconds.value = Utils.toDigits(loop(f(seconds.value), 59), 2).toString(); break;
	}
}

function initValue(value: number): number {
	const d = Math.floor(value / (24*3600));
	const h = Math.floor((value - d*24*3600) / 3600);
	const m = Math.floor((value - d*24*3600 - h*3600) / 60);
	const s = value - m*60 - h*3600 - d*24*3600;
	days.value = d.toString();
	hours.value = h.toString();
	minutes.value = m.toString();
	seconds.value = s.toString();
	value = d * 24 * 3600 + h * 3600 + m *60 + s;
	clamp("d");
	clamp("h");
	clamp("m");
	clamp("s");
	return value;
}

function loop(value: number, max: number): number {
	if(value > max) value = 0;
	if(value < 0) value = max;
	return value;
}

onBeforeMount(() => {
	initValue(props.modelValue)

	watch(() => props.modelValue, () => {
		initValue(props.modelValue)
	})
});
</script>

<style scoped lang="less">
.durationform{
	color: var(--color-text);
	// width: fit-content;
	display: flex;
	align-items: center;
	flex-direction: row;
	min-width: fit-content;
	.input {
		flex-grow: 1;
		// padding: .2em;
		border-radius: 0;
		text-align: center;
		font-variant-numeric: tabular-nums;
		font-weight: 400;
	}
	.split {
		flex-shrink: 1;
		&:not(:last-child) {
			margin-right: 2px;
		}

		&.days {
			margin-right: .5em;
		}
	}
}
</style>
