<template>
	<component
		ref="rootEl"
		:is="nodeType"
		:class="{
			infinitelist: true,
			noScroll: !showScrollbar,
		}"
		@wheel="onWheel($event)"
	>
		<div
			v-for="(item, index) in items"
			:key="index"
			class="list-item"
			:style="{ height: props.itemSize + 'px' }"
		>
			<slot v-if="item.data" :item="item.data" :index="index" />
		</div>

		<div class="scrollbar" ref="scrollbar" v-if="showScrollbar">
			<div class="scrollCursor" ref="cursor" :style="cursorStyles"></div>
		</div>
	</component>
</template>

<script setup lang="ts" generic="T">
import {
	computed,
	type CSSProperties,
	onBeforeUnmount,
	onMounted,
	type Ref,
	ref,
	useTemplateRef,
	watch,
} from "vue";

interface IListItem {
	id: number;
	py: number;
	data: T | null;
}

const props = withDefaults(
	defineProps<{
		nodeType?: string;
		itemSize?: number;
		itemMargin?: number;
		listHeight?: number;
		scrollOffset?: number;
		lockScroll?: boolean;
		noScrollbar?: boolean;
		fillWithDuplicates?: boolean;
		dataset: T[];
		renderCallback?: (ts: number) => void;
	}>(),
	{
		nodeType: "div",
		itemSize: 50,
		itemMargin: 0,
		listHeight: 500,
		scrollOffset: 0,
		fillWithDuplicates: false,
	},
);

const emit = defineEmits<{
	"update:scrollOffset": [value: number];
}>();

const rootElRef = useTemplateRef<HTMLElement>("rootEl");
const scrollbarRef = useTemplateRef("scrollbar");
const cursorRef = useTemplateRef("cursor");

const items: Ref<IListItem[]> = ref([]);
const scrollOffset_local = ref(0);
const scrollOffset_local_eased = ref(0);
const cursorY = ref(0);
const cursorSize = ref(0);
const canScroll = ref(true);

let mouseY = 0;
let maxScrollY = 0;
let cursorOffsetY = 0;
let draggingList = false;
let draggingListOffset = 0;
let draggingCursor = false;
let disposed = false;
let trackPressed = false;
let scaleFactor = 1;
let draggSpeed = 0;
let dragStartHandler: (e: MouseEvent | TouchEvent) => void;
let dragHandler: (e: MouseEvent | TouchEvent) => void;
let dragStopHandler: (e: MouseEvent | TouchEvent) => void;
let dragStartListHandler: (e: TouchEvent) => void;

const cursorStyles = computed<CSSProperties>(() => {
	return {
		top: cursorY.value + "px",
		height: cursorSize.value + "px",
	};
});

const showScrollbar = computed<boolean>(() => {
	return props.noScrollbar === false && canScroll.value;
});

function onWheel(e: WheelEvent): void {
	scrollOffset_local.value += e.deltaY;
	if (props.lockScroll) {
		if (scrollOffset_local.value <= 0 && e.deltaY < 0) return;
		if (scrollOffset_local.value > maxScrollY && e.deltaY > 0) return;
	}
	e.preventDefault();
}

function onDragStart(e: MouseEvent | TouchEvent): void {
	e.preventDefault();
	onDrag(e);
	const scrollbarEl = scrollbarRef.value!;
	const cursorEl = cursorRef.value!;
	const cursorEl_b = cursorEl.getBoundingClientRect();
	cursorOffsetY = mouseY - cursorEl_b.top;
	if (e.target == scrollbarEl) {
		trackPressed = true;
	} else {
		draggingCursor = true;
	}
}

function ondragStartList(e: MouseEvent | TouchEvent): void {
	e.preventDefault();
	onDrag(e);
	draggingList = true;
	draggingListOffset = mouseY;
}

function onDrag(e: MouseEvent | TouchEvent): void {
	if (e.type == "mousemove" || e.type == "mousedown") {
		mouseY = (e as MouseEvent).clientY;
	} else {
		mouseY = (e as TouchEvent).touches[0]!.clientY;
	}
}

function onDragStop(_e: MouseEvent | TouchEvent): void {
	if (draggingList) {
		scrollOffset_local.value += draggSpeed * 20;
	}
	draggingCursor = false;
	trackPressed = false;
	draggingList = false;
}

/**
 * Scrolls to given item index, centering it in the view if possible
 * @param index
 */
function scrollToIndex(index: number, ease: boolean = true): void {
	const rootEl = rootElRef.value!;
	const bounds = rootEl.getBoundingClientRect();
	scaleFactor = bounds.height / rootEl.offsetHeight || 1;
	const unscaledHeight = bounds.height / scaleFactor;
	scrollOffset_local.value =
		index * (props.itemSize + props.itemMargin) -
		unscaledHeight / 2 +
		(props.itemSize + props.itemMargin) / 2;
	if (!ease) {
		scrollOffset_local_eased.value = scrollOffset_local.value;
	}
}

async function renderList(ts: number): Promise<void> {
	if (disposed || !rootElRef.value) return;
	requestAnimationFrame((ts: number) => renderList(ts));

	const bounds = rootElRef.value.getBoundingClientRect();
	const itemsCount = Math.ceil(bounds.height / (props.itemSize + props.itemMargin)) + 1;
	maxScrollY = props.dataset.length * (props.itemSize + props.itemMargin) - bounds.height;
	scrollOffset_local_eased.value +=
		(scrollOffset_local.value - scrollOffset_local_eased.value) * 0.1;

	if (itemsCount != items.value.length) {
		const newItems: IListItem[] = [];
		for (let i = 0; i < itemsCount; i++) {
			newItems.push({ id: i, data: props.dataset[i]!, py: 0 });
		}
		items.value = newItems;
	}

	if (props.lockScroll !== false) {
		if (scrollOffset_local_eased.value < 0) {
			scrollOffset_local.value = scrollOffset_local_eased.value = 0;
		}
		if (scrollOffset_local_eased.value > maxScrollY) {
			scrollOffset_local.value = scrollOffset_local_eased.value = maxScrollY;
		}
	}

	const ih = props.itemSize + props.itemMargin;
	const vPos = canScroll.value ? scrollOffset_local_eased.value : 0;
	canScroll.value =
		props.fillWithDuplicates !== false || props.dataset.length * ih > bounds.height;

	for (let i = 0; i < items.value.length; i++) {
		const len = items.value.length;
		let index: number = (i - vPos / ih) % len;
		if (index < -1) index += len;
		let py: number = index * ih;
		// py -= ih; //offset all from one item to top to avoid a gap when scrolling to top

		let dataIndex: number = Math.round((py + vPos) / ih);
		if (props.fillWithDuplicates !== false) {
			dataIndex = dataIndex % props.dataset.length;
			if (dataIndex < 0) dataIndex += props.dataset.length;
		}

		items.value[i]!.py = py;
		items.value[i]!.data = dataIndex < props.dataset.length ? props.dataset[dataIndex]! : null;
	}

	if (draggingList) {
		scrollOffset_local.value -= (mouseY - draggingListOffset) * 2;
		draggingListOffset = mouseY;
	}

	const scrollbar = scrollbarRef.value;
	if (scrollbar) {
		const scrollbar_b = scrollbar.getBoundingClientRect();
		const scrollbarCursor = cursorRef.value as HTMLDivElement;
		const scrollbarCursor_b = scrollbarCursor.getBoundingClientRect();
		const scrollH = scrollbar_b.height - scrollbarCursor_b.height;
		if (draggingCursor) {
			const py = (mouseY - scrollbar_b.top - cursorOffsetY) / scrollH;
			scrollOffset_local.value = maxScrollY * py;
			scrollOffset_local_eased.value = maxScrollY * py;
		} else if (trackPressed) {
			const py = (mouseY - scrollbar_b.top - scrollbarCursor_b.height / 2) / scrollH;
			scrollOffset_local.value = maxScrollY * py;
		}
		cursorY.value = (scrollOffset_local_eased.value / maxScrollY) * scrollH;
		cursorSize.value = Math.max(
			20,
			(bounds.height / (maxScrollY + bounds.height)) * scrollbar_b.height,
		);
	}

	// Enable will-change css prop only if scrolling speed is slow.
	// will-change fixes jittering issues on subpixel positions but has a side effect
	// of delaying recycled item rendering on fast scrolling which creates a "hole" in
	// the list when scrolling at a high speed.
	// Enabling will-change only at low speed fixes both issues.
	if (Math.abs(scrollOffset_local_eased.value - scrollOffset_local.value) < 50) {
		rootElRef.value.style.willChange = "transform";
	} else {
		rootElRef.value.style.willChange = "auto";
	}

	rootElRef.value.querySelectorAll(".list-item").forEach((el, index) => {
		(el as HTMLElement).style.transform = `translateY(${items.value[index]!.py}px)`;
	});

	if (scrollOffset_local_eased.value != scrollOffset_local.value) {
		emit("update:scrollOffset", scrollOffset_local_eased.value);
	}
	if (props.renderCallback) {
		props.renderCallback(ts);
	}
}

watch(
	() => props.scrollOffset,
	() => {
		if (scrollOffset_local_eased.value === props.scrollOffset) return;
		scrollOffset_local.value = props.scrollOffset;
	},
);

onMounted(() => {
	scrollOffset_local.value = props.scrollOffset;

	const scrollbarEl = scrollbarRef.value;
	if (scrollbarEl) {
		const cursorEl = cursorRef.value!;

		dragStartListHandler = (e: TouchEvent) => ondragStartList(e);
		dragStartHandler = (e: MouseEvent | TouchEvent) => onDragStart(e);
		dragHandler = (e: MouseEvent | TouchEvent) => onDrag(e);
		dragStopHandler = (e: MouseEvent | TouchEvent) => onDragStop(e);

		scrollbarEl.addEventListener("mousedown", dragStartHandler);
		cursorEl.addEventListener("mousedown", dragStartHandler);
		cursorEl.addEventListener("touchstart", dragStartHandler);
		document.addEventListener("mousemove", dragHandler);
		document.addEventListener("touchmove", dragHandler);
		document.addEventListener("mouseup", dragStopHandler);
		document.addEventListener("touchend", dragStopHandler);
		rootElRef.value!.addEventListener("touchstart", dragStartListHandler);
	}

	requestAnimationFrame(() => renderList(0));
});

onBeforeUnmount(() => {
	disposed = true;
	const scrollbarEl = scrollbarRef.value;
	if (scrollbarEl) {
		const cursorEl = cursorRef.value!;

		scrollbarEl.removeEventListener("mousedown", dragStartHandler);
		cursorEl.removeEventListener("mousedown", dragStartHandler);
		cursorEl.removeEventListener("touchstart", dragStartHandler);
		document.removeEventListener("mousemove", dragHandler);
		document.removeEventListener("touchmove", dragHandler);
		document.removeEventListener("mouseup", dragStopHandler);
		document.removeEventListener("touchend", dragStopHandler);
		rootElRef.value!.removeEventListener("touchstart", dragStartListHandler);
	}
});
defineExpose({
	scrollToIndex,
});
</script>

<style scoped lang="less">
.infinitelist {
	@scrollWidth: 0.5em;
	position: relative;
	overflow: hidden;
	height: 100%;

	.list-item {
		width: calc(100% - @scrollWidth - 0.25em);
		position: absolute;
	}

	&.noScroll {
		.list-item {
			width: 100%;
		}
	}

	.scrollbar {
		position: absolute;
		top: 0;
		right: 0;
		height: 100%;
		width: @scrollWidth;
		background: var(--color-dark-fadest);
		border-radius: 1em;
		.scrollCursor {
			position: absolute;
			top: 0;
			left: 0;
			cursor: pointer;
			width: @scrollWidth;
			background-color: var(--color-dark-extralight);
			border-radius: 1em;
		}
	}
}
</style>
