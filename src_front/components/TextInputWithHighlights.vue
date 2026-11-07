<template>
	<div class="textinputwithhighlights">
		<textarea
			v-if="multiline"
			ref="field"
			v-bind="$attrs"
			v-model="value"
			v-autofocus="autofocus"
			v-on="mirrorListeners"
		></textarea>
		<input
			v-else
			ref="field"
			type="text"
			v-bind="$attrs"
			v-model="value"
			v-autofocus="autofocus"
			v-on="mirrorListeners"
		/>
		<div class="mirror" ref="mirror" aria-hidden="true" v-if="active">
			<div class="content" ref="mirrorContent" :class="{ singleLine: !multiline }"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { findPlaceholders } from "@/utils/PlaceholderModifiers";
import { computed, onBeforeUnmount, useTemplateRef, watch } from "vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
	defineProps<{
		multiline?: boolean;
		placeholders?: TwitchatDataTypes.PlaceholderEntry[];
		//Applies v-autofocus to the field, a directive set on the component would land on its root
		autofocus?: boolean;
	}>(),
	{
		multiline: false,
		placeholders: () => [],
		autofocus: false,
	},
);

const value = defineModel<string>({ default: "" });

const CSS_HIGHLIGHT_ID = "twitchat-text-placeholder";

/**
 * Styles to copy from the input and applied to the mirror holder.
 * This makes sure mirror looks as close as possible to the input
 */
const TYPOGRAPHY_STYLES = [
	"font-family",
	"font-size",
	"font-weight",
	"font-style",
	"font-variant",
	"font-stretch",
	"font-kerning",
	"font-feature-settings",
	"font-variation-settings",
	"line-height",
	"letter-spacing",
	"word-spacing",
	"text-indent",
	"text-transform",
	"text-align",
	"tab-size",
	"direction",
	"padding-top",
	"padding-right",
	"padding-bottom",
	"padding-left",
];
const WRAPPING_STYLES = ["white-space", "overflow-wrap", "word-break"];
const BORDER_WIDTH_STYLES = [
	"border-top-width",
	"border-right-width",
	"border-bottom-width",
	"border-left-width",
];

const highlightSupported =
	typeof Highlight != "undefined" && typeof CSS != "undefined" && !!CSS.highlights;

const fieldRef = useTemplateRef("field");
const mirrorRef = useTemplateRef("mirror");
const mirrorContentRef = useTemplateRef("mirrorContent");

const knownTags = computed(() => new Set(props.placeholders.map((p) => p.tag.toUpperCase())));

//Without placeholders there's nothing to highlight, the field stays a plain one
const active = computed(() => highlightSupported && knownTags.value.size > 0);
const mirrorListeners = computed(() =>
	active.value ? { input: refresh, scroll: syncScroll } : {},
);

//Only created once a mirror is mounted
let resizeObserver: ResizeObserver | null = null;
let ranges: Range[] = [];
let fieldWidth = 0;
let fieldHeight = 0;

watch(
	[fieldRef, mirrorRef],
	([field, mirror]) => {
		resizeObserver?.disconnect();
		clearRanges();
		if (!field || !mirror) return;
		fieldWidth = fieldHeight = 0;
		resizeObserver ??= new ResizeObserver(onFieldResize);
		resizeObserver.observe(field);
		copyFieldStyles();
		refresh();
	},
	{ flush: "post" },
);

watch(
	value,
	() => {
		const content = mirrorContentRef.value;
		if (content && content.textContent !== fieldRef.value?.value) refresh();
	},
	{ flush: "post" },
);

watch(knownTags, () => refresh());

onBeforeUnmount(() => {
	if (!resizeObserver) return;
	resizeObserver.disconnect();
	clearRanges();
	if (CSS.highlights.get(CSS_HIGHLIGHT_ID)?.size === 0) {
		CSS.highlights.delete(CSS_HIGHLIGHT_ID);
	}
});

function focus(): void {
	fieldRef.value?.focus();
}

/**
 * Copies the field's text to the mirror and highlights its placeholders
 */
function refresh(): void {
	const field = fieldRef.value;
	const content = mirrorContentRef.value;
	if (!field || !content) return;

	clearRanges();
	// read from field itself as it's more reactive on mobile
	const text = field.value;
	const node =
		content.firstChild instanceof Text ? content.firstChild : content.appendChild(new Text());
	node.data = text;

	const occurrences = findPlaceholders(text, (tag) => knownTags.value.has(tag));
	if (occurrences.length > 0) {
		const highlight = getHighlight();
		for (const occurrence of occurrences) {
			const range = new Range();
			range.setStart(node, occurrence.start);
			range.setEnd(node, occurrence.end);
			highlight.add(range);
			ranges.push(range);
		}
	}

	replaceMirror();
	syncScroll();
}

function getHighlight(): Highlight {
	let highlight = CSS.highlights.get(CSS_HIGHLIGHT_ID);
	if (!highlight) {
		highlight = new Highlight();
		CSS.highlights.set(CSS_HIGHLIGHT_ID, highlight);
	}
	return highlight;
}

function clearRanges(): void {
	if (ranges.length == 0) return;
	const highlight = CSS.highlights.get(CSS_HIGHLIGHT_ID);
	for (const range of ranges) highlight?.delete(range);
	ranges = [];
}

function onFieldResize(entries: ResizeObserverEntry[]): void {
	const size = entries[entries.length - 1]?.borderBoxSize?.[0];
	if (size) {
		fieldWidth = size.inlineSize;
		fieldHeight = size.blockSize;
	}
	copyFieldStyles();
	replaceMirror();
}

/**
 * Applies the field's styles to the mirror so it renders as close as possible
 */
function copyFieldStyles(): void {
	const field = fieldRef.value;
	const mirror = mirrorRef.value;
	const content = mirrorContentRef.value;
	if (!field || !mirror || !content) return;

	const style = getComputedStyle(field);
	for (const name of TYPOGRAPHY_STYLES) {
		content.style.setProperty(name, style.getPropertyValue(name));
	}
	for (const name of WRAPPING_STYLES) {
		if (props.multiline) content.style.setProperty(name, style.getPropertyValue(name));
		else content.style.removeProperty(name);
	}
	for (const name of BORDER_WIDTH_STYLES) {
		mirror.style.setProperty(name, style.getPropertyValue(name));
	}
	//A <textarea> clips its scrolled text on its padding box, like the mirror,
	//but an <input> clips it horizontally on its content box
	if (props.multiline) mirror.style.removeProperty("clip-path");
	else mirror.style.clipPath = `inset(0 ${style.paddingRight} 0 ${style.paddingLeft})`;
}

/**
 * Place the mirror
 */
function replaceMirror(): void {
	const field = fieldRef.value;
	const mirror = mirrorRef.value;
	if (!field || !mirror) return;

	const borderX =
		parseFloat(mirror.style.borderLeftWidth) + parseFloat(mirror.style.borderRightWidth);
	const borderY =
		parseFloat(mirror.style.borderTopWidth) + parseFloat(mirror.style.borderBottomWidth);
	const vScrollbarWidth = Math.max(
		0,
		Math.round(field.offsetWidth - field.clientWidth - borderX),
	);
	const hScrollbarHeight = Math.max(
		0,
		Math.round(field.offsetHeight - field.clientHeight - borderY),
	);
	mirror.style.left = field.offsetLeft + "px";
	mirror.style.top = field.offsetTop + "px";
	mirror.style.width = (fieldWidth || field.offsetWidth) - vScrollbarWidth + "px";
	mirror.style.height = (fieldHeight || field.offsetHeight) - hScrollbarHeight + "px";
}

function syncScroll(): void {
	const field = fieldRef.value;
	const content = mirrorContentRef.value;
	if (!field || !content) return;
	content.style.transform = `translate(${-field.scrollLeft}px, ${-field.scrollTop}px)`;
}

defineExpose({ field: fieldRef, focus });
</script>

<style scoped lang="less">
.textinputwithhighlights {
	position: relative;
	display: flex;

	& > input,
	& > textarea {
		flex-grow: 1;
		min-width: 0;
	}

	&:has(> :disabled) .mirror {
		opacity: 0.5;
	}

	.mirror {
		position: absolute;
		top: 0;
		left: 0;
		box-sizing: border-box;
		border-style: solid;
		border-color: transparent;
		overflow: hidden;
		color: transparent;
		pointer-events: none;
		user-select: none;
		z-index: -1;

		.content {
			box-sizing: border-box;
			white-space: pre-wrap;
			overflow-wrap: break-word;

			&.singleLine {
				height: 100%;
				display: flex;
				align-items: center;
				white-space: pre;
			}

			&::highlight(twitchat-text-placeholder) {
				background-color: var(--color-primary-fader);
				text-decoration: underline var(--color-primary);
			}
		}
	}
}
</style>
