<template>
	<div class="placeholderfield" @click.stop="focusInput">
		<span>{</span>
		<span class="prefix" v-if="prefix">{{ prefix }}</span>
		<ContentEditable
			tag="p"
			ref="input"
			:class="{ inputHolder: true, empty: modelValue.length === 0 }"
			:contenteditable="true"
			:no-nl="true"
			:placeholder="placeholder"
			:no-html="true"
			v-model="localValue"
			@input="limitPlaceholderSize()"
			@blur="$emit('blur')"
		/>
		<span class="suffix" v-if="suffix">{{ suffix }}</span>
		<span>}</span>
	</div>
</template>

<script setup lang="ts">
import { watch, ref, nextTick, onMounted } from "vue";
import ContentEditable from "@/components/ContentEditable.vue";

const props = withDefaults(
	defineProps<{
		modelValue: string;
		prefix?: string;
		suffix?: string;
		maxLength?: number;
		placeholder?: string;
	}>(),
	{
		modelValue: "",
		prefix: "",
		suffix: "",
		maxLength: 30,
		placeholder: "...",
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: string];
	change: [value: string];
	blur: [];
}>();

const localValue = ref("");
const input = ref<InstanceType<typeof ContentEditable>>();

/**
 * Limit the size of the label.
 * Can't use maxLength because it's a content-editable tag.
 */
async function limitPlaceholderSize(): Promise<void> {
	const sel = window.getSelection();
	if (sel && sel.rangeCount > 0) {
		//Save caret index
		var range = sel.getRangeAt(0);
		let caretIndex = range.startOffset;
		await nextTick();
		//Normalize label and limit its size
		localValue.value = localValue.value
			.toUpperCase()
			.trim()
			.replace(/\W/gi, "")
			.substring(0, props.maxLength);
		await nextTick();
		//Reset caret to previous position
		if (range.startContainer.firstChild)
			range.setStart(
				range.startContainer.firstChild,
				Math.min(localValue.value.length, caretIndex),
			);
	} else {
		localValue.value = localValue.value
			.toUpperCase()
			.trim()
			.replace(/\W/gi, "")
			.substring(0, props.maxLength);
	}

	emit("update:modelValue", localValue.value);
	emit("change", localValue.value);
}

function focusInput(): void {
	input.value?.$el?.focus();
}

onMounted(() => {
	localValue.value = props.modelValue;

	watch(
		() => props.modelValue,
		() => {
			localValue.value = props.modelValue;
		},
	);
});
</script>

<style scoped lang="less">
.placeholderfield {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	text-transform: uppercase;
	.inputHolder {
		margin: 0 3px;
		.input {
			margin: 0;
		}
		&.empty {
			position: relative;
			display: block;
			.input {
				left: 50%;
				transform: translate(-50%);
			}
		}
	}
	.prefix,
	.suffix {
		opacity: 0.7;
	}
	& > *:first-child,
	& > *:last-child {
		font-size: 1.5em;
	}
	&.error {
		background-color: var(--color-alert-fader);
	}
}
</style>
