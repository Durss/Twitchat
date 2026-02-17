<template>
	<div class="volumebar">
		<Icon name="volume" alt="volume" class="icon" />
		<div class="holder"
		ref="holder"
		@mousedown="mousePressed = true"
		@mousemove="onSeek($event)"
		@click="onSeek($event, true)">
			<div class="fill" :style="fillStyles"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Icon from './Icon.vue';

interface Props {
	modelValue?: number;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: 0.25,
});

const emit = defineEmits<{
	'update:modelValue': [value: number];
}>();

const mousePressed = ref(false);
const holder = ref<HTMLDivElement>();

let mouseUpHandler: () => void;

const fillStyles = computed(() => {
	return {
		width: `${props.modelValue * 100}%`,
	}
});

function onSeek(e: MouseEvent, force = false): void {
	if(!mousePressed.value && !force) return;
	const bar = holder.value;
	if (!bar) return;
	const bounds = bar.getBoundingClientRect();
	const percent = e.offsetX / bounds.width;
	emit("update:modelValue", percent);
}

onMounted(() => {
	mouseUpHandler = () => mousePressed.value = false;
	document.addEventListener("mouseup", mouseUpHandler);
});

onBeforeUnmount(() => {
	document.removeEventListener("mouseup", mouseUpHandler);
});
</script>

<style scoped lang="less">
.volumebar{
	display: flex;
	flex-direction: row;
	min-width: 200px;
	align-items: center;

	.icon {
		height: 1em;
		margin-right: .25em;
	}

	.holder {
		flex-grow: 1;
		height: 1em;
		cursor: pointer;
		position: relative;

		&::before {
			content: "";
			width: 100%;
			height: .25em;
			background-color: var(--color-light-fader);
			position: absolute;
			top: 50%;
			left: 0;
			transform: translate(0, -50%);
		}

		.fill {
			width: 50%;
			height: .25em;
			margin-top: .33em;
			background-color: var(--color-light);
		}
	}
}
</style>