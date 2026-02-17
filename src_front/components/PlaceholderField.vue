<template>
	<div class="placeholderfield" @click.stop="focusInput">
		<span>{</span>
			<span class="prefix" v-if="prefix">{{ prefix }}</span>
			<p :class="{inputHolder:true, empty:modelValue.length === 0}">
				<span class="placeholder" v-if="modelValue.length === 0">{{ placeholder }}</span>
				<ContentEditable tag="span" ref="input"
					:class="{input:true}"
					:contenteditable="true"
					:no-nl="true"
					:no-html="true"
					v-model="localValue"
					@input="limitPlaceholderSize()"
					@blur="$emit('blur')" />
			</p>
		<span>}</span>
	</div>
</template>

<script setup lang="ts">
import { watch, ref, nextTick, onMounted } from 'vue';
import ContentEditable from '@/components/ContentEditable.vue';

interface Props {
	modelValue: string;
	prefix?: string;
	maxLength?: number;
	placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
	modelValue: "",
	prefix: "",
	maxLength: 30,
	placeholder: "...",
});

const emit = defineEmits<{
	'update:modelValue': [value: string];
	'change': [value: string];
	'blur': [];
}>();

const localValue = ref("");
const input = ref<InstanceType<typeof ContentEditable>>();

/**
 * Limit the size of the label.
 * Can't use maxLength because it's a content-editable tag.
 */
async function limitPlaceholderSize(): Promise<void> {
	const sel = window.getSelection();
	if(sel && sel.rangeCount > 0) {
		//Save caret index
		var range = sel.getRangeAt(0);
		let caretIndex = range.startOffset;
		await nextTick();
		//Normalize label and limit its size
		localValue.value = localValue.value.toUpperCase().trim().replace(/\W/gi, "").substring(0, props.maxLength);
		await nextTick();
		//Reset caret to previous position
		if(range.startContainer.firstChild) range.setStart(range.startContainer.firstChild, Math.min(localValue.value.length, caretIndex));
	}else{
		localValue.value = localValue.value.toUpperCase().trim().replace(/\W/gi, "").substring(0, props.maxLength);
	}

	emit("update:modelValue", localValue.value);
	emit("change", localValue.value);
}

function focusInput(): void {
	input.value?.$el?.focus();
}

onMounted(() => {
	localValue.value = props.modelValue;

	watch(() => props.modelValue, () => {
		localValue.value = props.modelValue;
	});
});
</script>

<style scoped lang="less">
.placeholderfield{
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	text-transform: uppercase;
	.inputHolder {
		margin: 0 .25em;
		.input {
			margin: 0;
		}
		&.empty {
			position: relative;
			display: block;
			.input {
				position: absolute;
				left: 50%;
				transform: translate(-50%);
			}
		}
		.placeholder {
			font-style: italic;
			opacity: .5;
			text-transform: initial;
		}
	}
	.input {
		margin: 0 .25em;
		min-width: 1em;
		text-align: center;
		cursor: text;
	}
	.prefix {
		opacity: .7;
	}
	&>*:first-child,
	&>*:last-child {
		font-size: 1.5em;
	}
	&.error {
		background-color: var(--color-alert-fader);
	}
}
</style>
