<template>
	<div :class="rootClasses" :style="rootStyles" @dragenter="onDragEnter" @dragleave="onDragLeave" @drop.prevent>
		<div class="header" ref="headerRef" @click="toggle()">
			<!-- Small mode: arrow on left -->
			<button v-if="small && !noArrow" type="button" class="arrow" :class="{ open: isOpen && !isClosing }">
				<Icon name="arrowRight" />
			</button>

			<!-- Left actions slot -->
			<div class="leftActions">
				<slot name="left_actions" />
			</div>

			<!-- Icons -->
			<Icon
				v-for="icon in displayIcons"
				:key="icon"
				:name="icon"
				:theme="iconTheme"
				class="headerIcon"
			/>

			<!-- Title section -->
			<div v-if="editableTitle" class="titleSection editable" :class="{ singleLine: isSingleLineMode }">
				<ContentEditable
					ref="titleEditRef"
					tag="h2"
					class="titleText"
					:class="{ default: displayTitle === titleDefault }"
					:contenteditable="isEditingTitle"
					:model-value="displayTitle"
					:no-nl="true"
					:no-html="true"
					@click.stop
					@focus="onTitleFocus"
					@blur="onTitleBlur"
					@update:model-value="onTitleInput"
					@mouseover="isEditingTitle = true"
				/>
				<Icon name="edit" class="editIcon" />
				<h3 v-if="subtitle" class="subtitle">{{ subtitle }}</h3>
			</div>

			<div v-else-if="title || titleDefault || subtitle" ref="titleRef" class="titleSection" :class="{ singleLine: isSingleLineMode }">
				<h2 class="titleText">{{ title || titleDefault }}</h2>
				<h3 v-if="subtitle" class="subtitle">{{ subtitle }}</h3>
			</div>

			<!-- Hidden element for measuring natural title height at fixed width -->
			<div ref="titleMeasureRef" class="titleMeasure" aria-hidden="true">{{ title || titleDefault }}</div>

			<!-- Custom title slot -->
			<slot name="title" />

			<!-- Right actions (hidden when collapsed) -->
			<div ref="rightActionsRef" class="rightActions" :class="{ hidden: actionsCollapsed }">
				<slot name="right_actions" />
			</div>

			<!-- Collapsed actions button -->
			<button
				v-if="actionsCollapsed"
				type="button"
				class="collapseToggle"
				@click.stop="actionsMenuOpen = !actionsMenuOpen"
			>
				<Icon name="settings" />
			</button>

			<!-- Default mode: arrow on right -->
			<button v-if="!small && !noArrow" type="button" class="arrow right" :class="{ open: isOpen && !isClosing }">
				<Icon name="arrowRight" />
			</button>

			<!-- Collapsed actions popout -->
			<div v-if="actionsMenuOpen" class="actionsPopout" @click.capture="detectPopoutClose">
				<slot name="right_actions" />
			</div>

			<!-- Custom background color overlay -->
			<div v-if="customColor" class="customBg" :style="{ backgroundColor: customColor }" />
		</div>

		<!-- Collapsible content -->
		<div v-if="contentVisible" ref="contentRef" class="content">
			<slot />
			<slot name="content" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch, type CSSProperties } from 'vue';
import { gsap } from 'gsap/gsap-core';
import Icon from './Icon.vue';
import ContentEditable from './ContentEditable.vue';

// Props
const props = withDefaults(defineProps<{
	icons?: string[];
	title?: string;
	titleDefault?: string;
	subtitle?: string;
	open?: boolean;
	error?: boolean;
	alert?: boolean;
	primary?: boolean;
	secondary?: boolean;
	premium?: boolean;
	small?: boolean;
	medium?: boolean;
	disabled?: boolean;
	noBackground?: boolean;
	noArrow?: boolean;
	noTitleColor?: boolean;
	editableTitle?: boolean;
	titleMaxLength?: number;
	customColor?: string;
}>(), {
	icons: () => [],
	open: true,
	error: false,
	alert: false,
	primary: false,
	secondary: false,
	premium: false,
	small: false,
	medium: false,
	disabled: false,
	noBackground: false,
	noArrow: false,
	noTitleColor: false,
	editableTitle: false,
	titleMaxLength: 100,
	customColor: '',
});

// Emits
const emit = defineEmits<{
	'update:open': [value: boolean];
	'update:title': [value: string];
}>();

// Template refs
const headerRef = useTemplateRef<HTMLElement>('headerRef');
const contentRef = useTemplateRef<HTMLElement>('contentRef');
const rightActionsRef = useTemplateRef<HTMLElement>('rightActionsRef');
const titleRef = useTemplateRef<HTMLElement>('titleRef');
const titleMeasureRef = useTemplateRef<HTMLElement>('titleMeasureRef');
const titleEditRef = useTemplateRef<InstanceType<typeof ContentEditable>>('titleEditRef');

// State
const isOpen = ref(props.open);
const isClosing = ref(false);
const contentVisible = ref(props.open);
const localTitle = ref(props.title || props.titleDefault || '');
const isEditingTitle = ref(false);
const actionsCollapsed = ref(false);
const actionsMenuOpen = ref(false);
const isSingleLineMode = ref(false);

// Drag state
let dragCount = 0;
let dragTimeout: number | undefined;

// Observers
let resizeObserver: ResizeObserver | null = null;

// Computed
const hasThemedHeader = computed(() =>
	(props.error || props.alert || props.primary || props.secondary || props.premium) && !props.small
);

const iconTheme = computed(() => {
	if (props.noTitleColor) return '';
	if (hasThemedHeader.value) return 'light';
	if (props.small) return 'secondary';
	return '';
});

const displayIcons = computed(() => {
	const icons = [...props.icons];
	if (props.error) icons.push('automod');
	return icons;
});

const displayTitle = computed(() => {
	// When editing, show actual localTitle (even if empty) to allow clearing default
	if (isEditingTitle.value) return localTitle.value;
	// When not editing, fallback to default if localTitle is empty
	return localTitle.value || props.titleDefault || '';
});

const rootClasses = computed(() => [
	'toggleblock',
	{
		closed: !isOpen.value || isClosing.value,
		error: props.error,
		alert: props.alert,
		primary: props.primary,
		secondary: props.secondary,
		premium: props.premium,
		small: props.small,
		medium: props.medium && !props.small,
		noBackground: props.noBackground,
		noTitleColor: props.noTitleColor,
	},
]);

const rootStyles = computed<CSSProperties>(() => {
	if (!props.customColor) return {};
	return { backgroundColor: `${props.customColor}20` };
});

// Methods
async function toggle(forcedState?: boolean): Promise<void> {
	const targetState = forcedState ?? !isOpen.value;
	if (targetState === isOpen.value) return;
	if (props.disabled && targetState) return;

	gsap.killTweensOf(contentRef.value);

	if (targetState) {
		// Opening
		isOpen.value = true;
		contentVisible.value = true;
		await nextTick();
		gsap.from(contentRef.value, {
			height: 0,
			paddingTop: 0,
			paddingBottom: 0,
			duration: 0.25,
			ease: 'sine.inOut',
			clearProps: 'all',
		});
	} else {
		// Closing
		isClosing.value = true;
		gsap.to(contentRef.value, {
			height: 0,
			paddingTop: 0,
			paddingBottom: 0,
			duration: 0.25,
			ease: 'sine.inOut',
			clearProps: 'all',
			onComplete: () => {
				isOpen.value = false;
				contentVisible.value = false;
				isClosing.value = false;
			},
		});
	}
}

function onTitleFocus(): void {
	if (localTitle.value === props.titleDefault) {
		localTitle.value = '';
	}
	const el = titleEditRef.value?.$el;
	if (el) {
		const range = document.createRange();
		range.selectNodeContents(el);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	}
}

function onTitleBlur(): void {
	if (!localTitle.value.trim()) {
		localTitle.value = props.titleDefault || '';
	}
	isEditingTitle.value = false;
}

function onTitleInput(value: string | number): void {
	const str = String(value).substring(0, props.titleMaxLength);
	localTitle.value = str;
}

const MIN_TITLE_WIDTH_COLLAPSE = 150; // Width below which actions collapse
const MIN_TITLE_WIDTH_EXPAND = 205;   // Width above which actions can expand (hysteresis)

function checkActionsOverflow(): void {
	const actions = rightActionsRef.value;
	const titleSection = titleRef.value || titleEditRef.value?.$el?.parentElement;
	if (!actions) return;

	const buttons = actions.querySelectorAll('button, .button, [role="button"]');
	if (buttons.length < 2) {
		actionsCollapsed.value = false;
		actionsMenuOpen.value = false;
		return;
	}

	// If title section exists, check width with hysteresis to prevent oscillation
	if (titleSection) {
		const titleWidth = titleSection.getBoundingClientRect().width;
		
		if (actionsCollapsed.value) {
			// Currently collapsed: only expand if we have plenty of space
			if (titleWidth > MIN_TITLE_WIDTH_EXPAND) {
				actionsCollapsed.value = false;
				actionsMenuOpen.value = false;
			}
		} else {
			// Currently expanded: collapse if title is too narrow
			if (titleWidth < MIN_TITLE_WIDTH_COLLAPSE) {
				actionsCollapsed.value = true;
			}
		}
	}
}

function checkTitleOverflow(): void {
	const measureEl = titleMeasureRef.value;
	if (!measureEl) return;

	// Measure element has fixed width and natural wrapping
	// This tells us if the text CONTENT needs more than 2 lines
	const style = getComputedStyle(measureEl);
	const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 || 20;
	const maxTwoLineHeight = lineHeight * 2.3;

	const needsSingleLine = measureEl.scrollHeight > maxTwoLineHeight;
	isSingleLineMode.value = needsSingleLine;
}

function onDragEnter(): void {
	dragCount++;
	clearTimeout(dragTimeout);
	dragTimeout = window.setTimeout(() => toggle(true), 750);
}

function onDragLeave(): void {
	if (--dragCount < 1) {
		clearTimeout(dragTimeout);
	}
}

function closeActionsMenuOnClickOutside(event: MouseEvent): void {
	if (!actionsMenuOpen.value) return;
	const target = event.target as HTMLElement;
	const popout = headerRef.value?.querySelector('.actionsPopout');
	const toggleBtn = headerRef.value?.querySelector('.collapseToggle');
	if (!popout?.contains(target) && !toggleBtn?.contains(target)) {
		actionsMenuOpen.value = false;
	}
}

function detectPopoutClose(e:MouseEvent): void {
	if((e.target as HTMLElement).dataset.closePopout !== undefined) {
		// Give time to actual button click to be processed before closing
		// As we're listening on capture phase, the button click will happen after this
		setTimeout(() => {
			actionsMenuOpen.value = false;
		}, 20);
	}
}

// Watchers
watch(() => props.open, (newVal) => toggle(newVal));

watch(isOpen, (newVal) => emit('update:open', newVal));

watch(localTitle, (newVal) => {
	emit('update:title', newVal.trim());
	// Re-check title overflow when title changes
	nextTick(() => checkTitleOverflow());
});

watch(() => props.title, (newVal) => {
	if (newVal !== undefined) localTitle.value = newVal;
});

// Lifecycle
onMounted(() => {
	// Observer for both title overflow and actions collapse
	resizeObserver = new ResizeObserver(() => {
		checkTitleOverflow();
		checkActionsOverflow();
	});

	// Observe header for size changes
	if (headerRef.value) resizeObserver.observe(headerRef.value);

	// Observe title section if it exists
	const titleSection = titleRef.value || titleEditRef.value?.$el?.parentElement;
	if (titleSection) resizeObserver.observe(titleSection);

	// Initial checks
	nextTick(() => {
		setTimeout(() => {
			checkTitleOverflow();
			checkActionsOverflow();
		}, 100);
	});

	document.addEventListener('click', closeActionsMenuOnClickOutside);
});

onUnmounted(() => {
	resizeObserver?.disconnect();
	clearTimeout(dragTimeout);
	document.removeEventListener('click', closeActionsMenuOnClickOutside);
});

// Expose toggle for external use
defineExpose({ toggle });
</script>

<style scoped lang="less">
.toggleblock {
	border-radius: var(--border-radius);
	background-color: var(--background-color-fadest);

	&:not(.small) {
		.emboss();
	}

	// Header
	.header {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0;
		padding-left: 0.5em;
		cursor: pointer;
		overflow: hidden;
		border-radius: var(--border-radius) var(--border-radius) 0 0;
		border-bottom: 2px solid var(--color-dark-fader);
		background-color: var(--toggle-block-header-background);
		color: var(--color-text);
		transition: background-color 0.25s;

		&:hover {
			background-color: var(--toggle-block-header-background-hover);
		}
	}

	// Arrow button
	.arrow {
		flex-shrink: 0;
		width: 1.5em;
		align-self: stretch;
		color: inherit;
		.icon {
			height: 1em;
			transition: transform 0.25s;
		}
		&.open .icon {
			transform: rotate(90deg);
		}
		&.right {
			margin-left: -.5em;
		}
	}

	// Header icons
	.headerIcon {
		flex-shrink: 0;
		height: 1em;
		width: 1.5em;
		object-fit: fill;
	}

	:deep(.icon) {
		height: 1em;
	}

	// Hidden element for measuring title at reference width
	.titleMeasure {
		position: absolute;
		visibility: hidden;
		pointer-events: none;
		width: 300px; // Fixed reference width for measurement
		word-break: break-word;
		white-space: normal;
		font-size: 1.1em;
	}

	// Title section
	.titleSection {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0.25em 0;
		font-size: 1.2em;
		min-width: 100px;

		.titleText {
			word-break: break-word;
		}

		.subtitle {
			font-size: 0.8em;
			font-weight: normal;
			font-style: italic;
		}

		// When title would exceed 2 lines, switch to single-line scrollable
		&.singleLine .titleText {
			white-space: nowrap;
			overflow-x: auto;
			overflow-y: hidden;

			&::-webkit-scrollbar {
				height: 4px;
			}
			&::-webkit-scrollbar-track {
				background-color: transparent;
			}
			&::-webkit-scrollbar-thumb {
				border-radius: 20px;
				background-color: var(--color-dark-extralight);
			}
		}

		// Editable title styles
		&.editable {
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;

			.titleText {
				cursor: text;
				min-width: 50px;
				width: fit-content;
				font-weight: bold;
				padding: 0.25em 0.5em;
				padding-right: 1.25em;
				border-radius: var(--border-radius);
				line-height: 1.1em;

				&:hover,
				&:focus {
					.bevel();
					background-color: var(--color-text-inverse-fader);
				}

				&.default {
					opacity: 0.8;
					font-style: italic;
					font-weight: normal;
				}
			}

			.editIcon {
				height: 0.7em;
				margin-left: -1em;
				pointer-events: none;
				flex-shrink: 0;
			}

			.subtitle {
				flex: 1 1 100%;
			}
		}
	}

	// Right actions
	.rightActions {
		display: flex;
		align-items: center;
		align-self: stretch;
		flex-shrink: 0;

		&.hidden {
			display: none;
		}

		:deep(.button) {
			border-radius: 0 !important;
			align-self: stretch;
			flex-shrink: 0;
		}
	}

	// Left actions
	.leftActions {
		display: flex;
		align-items: center;
		align-self: stretch;
		flex-shrink: 0;
		gap: 0.25em;

		:deep(.button) {
			border-radius: 0 !important;
			align-self: stretch;
			flex-shrink: 0;
		}
	}

	// Collapse toggle button
	.collapseToggle {
		flex-shrink: 0;
		padding: 0 0.5em;
		align-self: stretch;
		display: flex;
		align-items: center;
		color: inherit;

		&:hover {
			background-color: var(--color-dark-fadest);
		}

		.icon {
			height: 1em;
		}
	}

	// Actions popout
	.actionsPopout {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		z-index: 10;
		display: flex;
		background-color: var(--background-color-secondary);
		border-radius: var(--border-radius);
		box-shadow: -5px 0px 5px rgba(0, 0, 0, .5);

		:deep(button),
		:deep(.button) {
			justify-content: center;
			border-radius: 0;
		}
	}

	// Custom background overlay
	.customBg {
		position: absolute;
		inset: 0;
		opacity: 0.3;
		z-index: 0;
		pointer-events: none;
	}

	.header > *:not(.customBg) {
		z-index: 1;
	}

	// Content
	.content {
		padding: 0.5em;
		overflow: hidden;
		color: var(--color-text);
	}

	// Closed state
	&.closed .header {
		border-bottom: none;
		border-radius: var(--border-radius);
	}

	// ===== Themes =====
	&.error,
	&.alert {
		background-color: var(--color-alert-fadest);
		.header {
			color: var(--color-light);
			background-color: var(--color-alert);
			&:hover {
				background-color: var(--color-alert-light);
			}
		}
		.collapseToggle:hover {
			background-color: var(--color-alert);
		}
	}

	&.primary {
		background-color: var(--color-primary-fadest);
		.header {
			color: var(--color-light);
			background-color: var(--color-primary);
			&:hover {
				background-color: var(--color-primary-light);
			}
		}
		.collapseToggle:hover {
			background-color: var(--color-primary);
		}
	}

	&.secondary {
		background-color: var(--color-secondary-fadest);
		.header {
			color: var(--color-light);
			background-color: var(--color-secondary);
			&:hover {
				background-color: var(--color-secondary-light);
			}
		}
		.collapseToggle:hover {
			background-color: var(--color-secondary);
		}
	}

	&.premium {
		background-color: var(--color-premium-fadest);
		.header {
			color: var(--color-light);
			background-color: var(--color-premium);
			&:hover {
				background-color: var(--color-premium-light);
			}
		}
		.collapseToggle:hover {
			background-color: var(--color-premium);
		}
	}

	// ===== Sizes =====
	&.medium > .header {
		font-size: 0.8em;
	}

	&.small {
		background-color: transparent;

		.header {
			padding: 0;
			font-size: 0.7em;
			background-color: transparent;
			border-bottom: none;
			border-radius: var(--border-radius);
			color: var(--color-secondary);

			&:hover {
				background-color: var(--color-dark-fadest);
			}
		}

		.titleSection {
			text-align: left;
			align-items: flex-start;
			line-height: 1.25em;
			text-shadow: var(--text-shadow-contrast);
		}

		.arrow {
			background-color: transparent;
		}

		.content {
			padding: 0.5em;
		}

		// Small + theme = colored text only
		&.primary .header {
			color: var(--color-primary);
			background-color: transparent;
			&:hover {
				background-color: var(--color-dark-fadest);
			}
		}
		&.premium .header {
			color: var(--color-premium);
			background-color: transparent;
			&:hover {
				background-color: var(--color-dark-fadest);
			}
		}
		&.error .header,
		&.alert .header {
			color: var(--color-alert);
			background-color: transparent;
			&:hover {
				background-color: var(--color-dark-fadest);
			}
		}
		&.noTitleColor .header {
			color: var(--color-text);
		}
	}

	&.noBackground {
		background-color: transparent;
	}
}
</style>
