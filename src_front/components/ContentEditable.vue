<template>
	<component
		:is="tag"
		ref="elementRef"
		class="editableField"
		:style="{ '--placeholder': isEmpty && placeholder ? '\'' + placeholder + '\'' : undefined }"
		:contenteditable="computedContentEditableValue"
		@input="update(false)"
		@blur="onBlur"
		@keypress.capture="onKeypress"
		@keydown.capture="onKeyDown"
	></component>
</template>

<script setup lang="ts">
/**
 * Extracted from the following inactive repository while fixing an issue
 * that emits warnings on the console and adding few features:
 * https://github.com/hl037/vue-contenteditable
 */
import { computed, nextTick, onMounted, useTemplateRef, watch } from "vue";

const props = withDefaults(
	defineProps<{
		tag: string;
		placeholder?: string;
		noHtml?: boolean;
		noNl?: boolean;
		modelValue?: string | number;
		trimContent?: boolean;
		numeric?: boolean;
		float?: boolean;
		min?: number;
		max?: number;
		contenteditable?: boolean;
		maxLength?: number;
	}>(),
	{
		modelValue: "",
		noHtml: true,
		trimContent: true,
		contenteditable: true,
		numeric: false,
		float: false,
		min: Number.NEGATIVE_INFINITY,
		max: Number.POSITIVE_INFINITY,
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: string | number];
	submit: [value: string | number];
	cancel: [];
	blur: [];
}>();

const isEmpty = computed(() => {
	// "\n" is the default value after clearing a content-editable's content
	const value = props.modelValue;
	// Numeric fields are never considered empty (no placeholder to display)
	if (typeof value !== "string") return false;
	return value.length == 0 || value == "\n";
});

const computedContentEditableValue = computed(() => {
	if (!props.contenteditable) return false;
	return props.noHtml ? "plaintext-only" : true;
});

const elementRef$ = useTemplateRef<HTMLElement>("elementRef");

function focus() {
	elementRef$.value?.focus();
}

function moveCaretTo(position: number) {
	if (elementRef$.value) {
		const range = document.createRange();
		const sel = window.getSelection();
		const nodes = elementRef$.value.childNodes;
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (node instanceof Text) {
				if (node.length >= position) {
					range.setStart(node, position);
					break;
				} else {
					position -= node.length;
				}
			} else {
				position--;
			}
		}
		range.collapse(true);
		sel?.removeAllRanges();
		sel?.addRange(range);
	}
}

function currentContent(): string | number {
	if (elementRef$.value == null) {
		return props.numeric ? Number(props.modelValue) || 0 : (props.modelValue ?? "");
	}
	let content: string | number =
		props.noHtml || props.numeric ? elementRef$.value.innerText : elementRef$.value.innerHTML;
	if (props.numeric) {
		content = parseFloat((content as string).replace(",", "."));
		if (!props.float) {
			content = Math.floor(content);
		}
	}
	return content;
}

function updateContent(newcontent: string | number) {
	if (props.numeric && typeof newcontent === "string") {
		newcontent = parseFloat(newcontent.replace(",", "."));
		if (!props.float) {
			newcontent = Math.floor(newcontent);
		}
	}
	if (typeof newcontent === "number") {
		newcontent = Math.min(props.max, Math.max(props.min, newcontent));
		if (isNaN(newcontent)) newcontent = 0;
		newcontent = newcontent.toString();
	}
	if (props.trimContent) newcontent = newcontent.trim();
	if (props.noHtml || props.numeric) {
		elementRef$.value!.innerText = newcontent;
	} else {
		elementRef$.value!.innerHTML = newcontent;
	}
}

async function update(isBlurEvent: boolean) {
	// Browsers insert a stray <br> (or <div><br></div>) when the field is
	// fully erased, to keep the caret/line-height. Remove it so the DOM stays
	// empty. textContent === '' is true when only that <br> remains.
	const el = elementRef$.value;
	if (el && el.textContent === "" && el.childNodes.length > 0) {
		el.replaceChildren();
	}
	if (props.maxLength != undefined) await limitLabelSize();
	// On blur, re-render the normalized value so the displayed content matches
	// the emitted model. Only done for numeric fields, which clamp to min/max
	// and drop invalid characters, so the field never shows an out-of-range or
	// non-numeric value. currentContent() below then reads back the clamped value.
	if (isBlurEvent && props.numeric) updateContent(currentContent());
	emit("update:modelValue", currentContent());
}

async function onBlur() {
	await update(true);
	emit("blur");
}

function onKeypress(event: KeyboardEvent) {
	if (event.key == "Enter" && props.noNl) {
		event.preventDefault();
		emit("submit", currentContent());
	}
}

function onKeyDown(event: KeyboardEvent) {
	if (event.key == "Escape") {
		event.preventDefault();
		emit("cancel");
		return;
	}
	if (props.numeric) {
		if (props.min < 0) {
			// Allow minus sign only at the start for numeric values
			const caretPos = window.getSelection()?.getRangeAt(0).startOffset ?? 0;
			if (event.key == "-" && caretPos == 0) {
				return;
			}

			// Allow comma or dot for float values only if not already present
			if (
				(event.key == "." || event.key == ",") &&
				props.float &&
				!/,|\./g.test(currentContent().toString())
			) {
				return;
			}
		}
		// Only block printable non-digit characters. Navigation/editing keys
		// (arrows, backspace, delete, home, end, tab…) and keyboard shortcuts
		// (ctrl/cmd + …) have a key name longer than 1 char or hold a modifier,
		// so they must be let through, otherwise the caret can't even be moved.
		if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !/[\d]/.test(event.key)) {
			event.preventDefault();
		}
	}
}

/**
 * Limit the size of the label.
 */
async function limitLabelSize(): Promise<void> {
	const sel = window.getSelection();
	let text = currentContent().toString();
	if (text.length <= (props.maxLength ?? text.length)) return;
	if (sel && sel.rangeCount > 0 && elementRef$.value) {
		//Save caret index
		const range = sel.getRangeAt(0);
		const caretIndex = range.startOffset;
		await nextTick();
		//Limit label's size
		text = text.substring(0, props.maxLength ?? text.length);
		elementRef$.value.innerText = text;
		await nextTick();
		//Reset caret to previous position
		if (range.startContainer.firstChild)
			range.setStart(
				range.startContainer.firstChild,
				Math.max(0, Math.min(text.length, caretIndex - 1)),
			);
	}
}

onMounted(() => {
	updateContent(props.modelValue ?? "");
});

watch(
	() => props.modelValue,
	(newval) => {
		if (newval != currentContent()) {
			updateContent(newval ?? "");
		}
	},
);

watch(
	() => props.noHtml,
	() => {
		updateContent(props.modelValue ?? "");
	},
);

watch(
	() => props.tag,
	() => {
		updateContent(props.modelValue ?? "");
	},
	{ flush: "post" },
);

defineExpose({
	focus,
	moveCaretTo,
	blur: () => {
		elementRef$.value?.blur();
	},
});
</script>
<style lang="less" scoped>
.editableField {
	// Needded to see caret when content is empty
	display: block;
	&::after {
		content: var(--placeholder);
		display: inline-block;
		// width: 100px;
		font-style: italic;
		// top: 0;
		pointer-events: none;
		font-style: italic;
		opacity: 0.5;
		text-transform: initial;
	}
}
</style>
