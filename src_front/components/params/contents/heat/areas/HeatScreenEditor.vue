<template>
	<div ref="root" class="heatscreeneditor">
		<div ref="scrollable" class="scrollable" @wheel="onMouseWheel($event)">
			<div
				ref="editor"
				:style="editorStyles"
				:class="editorClasses"
				@pointerdown="($event) => addPoint($event)"
			>
				<div ref="background" class="background" v-if="props.obsPreview"></div>
				<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
					<g v-for="area in screen.areas" :key="'area_' + screen.id">
						<polygon
							:points="getSVGPoints(area.points)"
							:class="{
								selected: area.id == currentArea?.id,
								disabled: area?.enabled === false,
							}"
							:stroke-width="5 / editorScale + 'px'"
							:stroke="
								area.showAreaOnExtension
									? 'var(--color-premium)'
									: 'var(--color-text)'
							"
							v-tooltip="area.showAreaOnExtension == true && area.title"
							@contextmenu.prevent="onRightClickArea(area)"
							@pointerdown="onPolygonPointerDown($event, area)"
						/>

						<circle
							v-for="(p, index) in area.points"
							:key="screen.id + '_' + index"
							:cx="p.x * 100 + '%'"
							:cy="p.y * 100 + '%'"
							:r="(area.id == currentArea?.id ? 15 : 8) / editorScale + 'px'"
							:class="pointClasses(area, index)"
							@click="selectPoint(area, index)"
							@dblclick="resetCurrentArea()"
							@contextmenu.prevent="onRightClickPoint(area, index)"
							@pointerdown="onPointPointerDown($event, p, area, index)"
						/>
					</g>
				</svg>
			</div>
		</div>

		<template v-if="currentArea">
			<div class="card-item primary companion" v-if="!storeExtension.companionEnabled">
				<p>{{ t("heat.areas.use_companion") }}</p>
				<TTButton icon="twitchat_companion" light @click="openCompanion()">{{
					t("heat.alertnative_bt")
				}}</TTButton>
			</div>

			<div class="form" v-else>
				<ParamItem
					v-if="currentEnabledParam"
					:paramData="currentEnabledParam"
					v-model="currentArea.enabled"
					@change="emit('update')"
				/>
				<ParamItem
					v-if="currentAreaTitleParam && storeExtension.hasFeature('areasTitle')"
					:paramData="currentAreaTitleParam"
					v-model="currentArea.title"
					@change="emit('update')"
				/>
				<ParamItem
					class="premium"
					v-if="
						currentAreaExtensionButtonParam && storeExtension.hasFeature('areasTitle')
					"
					:paramData="currentAreaExtensionButtonParam"
					v-model="currentArea.showAreaOnExtension"
					@change="emit('update')"
				/>
				<ParamItem
					class="premium"
					v-if="currentAreaCooldownParam && storeExtension.hasFeature('areasCooldown')"
					:paramData="currentAreaCooldownParam"
					v-model="currentArea.cooldown_s"
					@change="emit('update')"
				/>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import TTButton from "@/components/TTButton.vue";
import { storeExtension as useStoreExtension } from "@/store/extension/storeExtension";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { HeatArea, HeatScreen } from "@/types/HeatDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import OBSWebsocket from "@/utils/OBSWebsocket";
import Utils from "@/utils/Utils";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	type CSSProperties,
} from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeParams = useStoreParams();
const storeExtension = useStoreExtension();

const props = defineProps<{ screen: HeatScreen; obsPreview?: boolean }>();
const emit = defineEmits<{ update: [] }>();

const editorRef = useTemplateRef("editor");
const backgroundRef = useTemplateRef("background");
const scrollableRef = useTemplateRef("scrollable");
const rootRef = useTemplateRef("root");
const editMode = ref<null | "add" | "append" | "delete">(null);
const currentArea = ref<HeatArea | null>(null);
const currentPointIndex = ref(-1);
const isBuilding = ref(false);
const draggedArea = ref<HeatArea | null>(null);
const draggedPoint = ref<{ x: number; y: number } | null>(null);
const draggOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const draggOriginalOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const disposed = ref(false);
const editorScale = ref(1);
const spacePressed = ref(false);
const isPanning = ref(false);
const panStart = ref<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
let refreshTimeout = -1;

// Pending scroll target accumulated across rapid wheel events (not yet flushed to DOM)
let pendingScrollLeft: number | null = null;
let pendingScrollTop: number | null = null;

const keyDownHandler = (e: KeyboardEvent) => onKeyDown(e);
const keyUpHandler = (e: KeyboardEvent) => onKeyUp(e);
const mouseUpHandler = (e: PointerEvent) => onMouseUp(e);
const mouseMoveHandler = (e: PointerEvent) => onMouseMove(e);
const documentPointerDownHandler = (e: PointerEvent) => onDocumentPointerDown(e);

const param_showExtensionButton = ref<Record<string, TwitchatDataTypes.ParameterData<boolean>>>({});
const param_areaTitle = ref<Record<string, TwitchatDataTypes.ParameterData<string>>>({});
const param_cooldown = ref<Record<string, TwitchatDataTypes.ParameterData<number>>>({});
const param_enabled = ref<Record<string, TwitchatDataTypes.ParameterData<boolean>>>({});

function ensureTitleParam(area: HeatArea) {
	if (!param_areaTitle.value[area.id]) {
		param_areaTitle.value[area.id] = {
			type: "string",
			maxLength: 500,
			value: area.title || "",
			icon: "label",
			labelKey: "heat.areas.param_show_extension_button_title",
		};
	}
	return param_areaTitle.value[area.id]!;
}

function ensureExtensionButtonParam(area: HeatArea) {
	if (!param_showExtensionButton.value[area.id]) {
		param_showExtensionButton.value[area.id] = {
			type: "boolean",
			value: false,
			icon: "show",
			premiumOnly: true,
			labelKey: "heat.areas.param_show_extension_button",
		};
	}
	return param_showExtensionButton.value[area.id]!;
}

function ensureCooldownParam(area: HeatArea) {
	if (!param_cooldown.value[area.id]) {
		param_cooldown.value[area.id] = {
			type: "duration",
			value: 0,
			icon: "timer",
			max: 3600 * 24 - 1,
			premiumOnly: true,
			labelKey: "heat.areas.param_cooldown",
		};
	}
	return param_cooldown.value[area.id]!;
}

function ensureEnabledParam(area: HeatArea) {
	if (!param_enabled.value[area.id]) {
		param_enabled.value[area.id] = {
			type: "boolean",
			value: true,
			icon: "disable",
			labelKey: "heat.areas.param_enabled",
		};
	}
	return param_enabled.value[area.id]!;
}

const currentAreaExtensionButtonParam = computed(() => {
	if (!currentArea.value) return null;
	const param = ensureExtensionButtonParam(currentArea.value);
	param.value = currentArea.value.showAreaOnExtension == true;
	return param;
});

const currentAreaTitleParam = computed(() => {
	if (!currentArea.value) return null;
	const param = ensureTitleParam(currentArea.value);
	param.value = currentArea.value.title ?? "";
	return param;
});

const currentAreaCooldownParam = computed(() => {
	if (!currentArea.value) return null;
	const param = ensureCooldownParam(currentArea.value);
	param.value = currentArea.value.cooldown_s || 0;
	return param;
});

const currentEnabledParam = computed(() => {
	if (!currentArea.value) return null;
	currentArea.value.enabled = currentArea.value.enabled ?? true;
	const param = ensureEnabledParam(currentArea.value);
	param.value = currentArea.value.enabled;
	return param;
});

const editorClasses = computed(() => {
	const res = ["editor"];
	if (editMode.value) res.push(editMode.value);
	if (spacePressed.value) res.push(isPanning.value ? "panning" : "space-held");
	return res;
});

const editorStyles = computed(() => {
	const res: CSSProperties = {};
	res.width = editorScale.value * 100 + "%";
	return res;
});

onBeforeMount(() => {
	if (props.screen.areas.length == 0) {
		props.screen.areas.push({
			id: Utils.getUUID(),
			points: [],
		});
	}

	for (const area of props.screen.areas) {
		ensureExtensionButtonParam(area);
	}

	document.addEventListener("keydown", keyDownHandler, { capture: true });
	document.addEventListener("keyup", keyUpHandler);
	document.addEventListener("pointerup", mouseUpHandler);
	document.addEventListener("pointermove", mouseMoveHandler);
	document.addEventListener("pointerdown", documentPointerDownHandler);

	refreshImage();
});

onBeforeUnmount(() => {
	disposed.value = true;
	clearTimeout(refreshTimeout);
	document.removeEventListener("keydown", keyDownHandler, { capture: true });
	document.removeEventListener("keyup", keyUpHandler);
	document.removeEventListener("pointerup", mouseUpHandler);
	document.removeEventListener("pointermove", mouseMoveHandler);
	document.removeEventListener("pointerdown", documentPointerDownHandler);
});

function openCompanion(): void {
	storeParams.openParamsPage(
		TwitchatDataTypes.ParameterPages.CONNECTIONS,
		TwitchatDataTypes.ParamDeepSections.TWITCHAT_COMPANION,
	);
}

function pointClasses(area: HeatArea, index: number): string[] {
	if (area.id != currentArea.value?.id) return [];
	if (index == currentPointIndex.value) return ["selected"];
	return [];
}

function getSVGPoints(p: { x: number; y: number }[]): string {
	return p.map((w) => w.x * 1920 + "," + w.y * 1080).join(",");
}

function addPoint(event: PointerEvent): void {
	if (event.button == 2) return; //Ignore right click
	if (spacePressed.value) {
		const scrollable = scrollableRef.value;
		if (scrollable) {
			isPanning.value = true;
			panStart.value = {
				x: event.clientX,
				y: event.clientY,
				scrollLeft: scrollable.scrollLeft,
				scrollTop: scrollable.scrollTop,
			};
		}
		return;
	}
	if (draggedPoint.value) return;

	const editor = editorRef.value;
	if (!editor) return;
	const bounds = editor.getBoundingClientRect();
	const x = (event.x - bounds.x) / bounds.width;
	const y = (event.y - bounds.y) / bounds.height;

	const [areaIndex, pointIndex] = getSegmentUnderPoint(event.x, event.y);

	const newPoint = { x, y };

	if (areaIndex > -1 && pointIndex > -1) {
		currentArea.value = props.screen.areas[areaIndex]!;
		currentPointIndex.value = pointIndex;
		currentArea.value.points.splice(pointIndex, 0, newPoint);
	} else if (isBuilding.value && currentArea.value) {
		currentArea.value.points.push(newPoint);
		currentPointIndex.value = currentArea.value.points.length - 1;
	} else if (currentArea.value) {
		resetCurrentArea();
		return;
	} else {
		currentArea.value = {
			id: Utils.getUUID(),
			points: [newPoint],
		};
		currentPointIndex.value = 0;
		props.screen.areas.push(currentArea.value);
		isBuilding.value = true;
	}

	if (event.shiftKey) {
		applyShiftSnap(newPoint, currentArea.value, currentPointIndex.value);
	}

	draggedPoint.value = newPoint;
	emit("update");
}

function applyShiftSnap(point: { x: number; y: number }, area: HeatArea, index: number): void {
	const len = area.points.length;
	if (len < 2) return;
	const prev = area.points[(index - 1 + len) % len];
	if (!prev || prev === point) return;
	if (Math.abs(point.x - prev.x) < Math.abs(point.y - prev.y)) {
		point.x = prev.x;
	} else {
		point.y = prev.y;
	}
}

function selectPoint(area: HeatArea, index: number): void {
	currentArea.value = area;
	currentPointIndex.value = index;
}

function onRightClickArea(area: HeatArea): void {
	if (area.id == currentArea.value?.id) {
		resetCurrentArea();
	}
}

function onRightClickPoint(area: HeatArea, pointIndex: number): void {
	area.points.splice(pointIndex, 1);
	currentPointIndex.value = -1;
}

function resetCurrentArea(): void {
	currentArea.value = null;
	currentPointIndex.value = -1;
	isBuilding.value = false;
}

function onDocumentPointerDown(event: PointerEvent): void {
	if (!currentArea.value) return;
	if (event.button == 2) return; //Ignore right click
	const target = event.target as Node | null;
	if (target && rootRef.value?.contains(target)) return;
	resetCurrentArea();
}

function startDragPoint(
	event: PointerEvent,
	point: { x: number; y: number },
	area: HeatArea,
	index: number,
): void {
	if (spacePressed.value) return;
	if (event.ctrlKey || event.metaKey) {
		area.points.splice(index, 1);
		currentPointIndex.value = -1;
	} else {
		draggedPoint.value = point;
		currentArea.value = area;
		currentPointIndex.value = index;
	}
}

function onPolygonPointerDown(event: PointerEvent, area: HeatArea): void {
	if (spacePressed.value) return;
	event.stopPropagation();
	startDragArea(event, area);
}

function onPointPointerDown(
	event: PointerEvent,
	point: { x: number; y: number },
	area: HeatArea,
	index: number,
): void {
	if (spacePressed.value) return;
	event.stopPropagation();
	startDragPoint(event, point, area, index);
}

function startDragArea(event: PointerEvent, area: HeatArea): void {
	if (spacePressed.value) return;
	if (editMode.value == "append") {
		addPoint(event);
	} else {
		currentPointIndex.value = -1;
		currentArea.value = area;
		draggedArea.value = area;
		draggOffset.value.x = event.x;
		draggOffset.value.y = event.y;
		draggOriginalOffset.value.x = event.x;
		draggOriginalOffset.value.y = event.y;
		isBuilding.value = false;
	}
}

function onKeyDown(event: KeyboardEvent): void {
	//Do not copy/past actions if focus is on a form input
	const target = event.target as HTMLElement;
	if (["TEXTAREA", "INPUT"].indexOf(target.nodeName) > -1) return;
	if (target.getAttribute("contenteditable")) return;

	if (event.key == " ") {
		spacePressed.value = true;
		event.preventDefault();
		return;
	}

	const metaKey = event.metaKey || event.ctrlKey;

	//Delete an area or a point
	if ((event.key == "Delete" || event.key == "Backspace") && currentArea.value) {
		const index = props.screen.areas.findIndex((v) => v.id == currentArea.value!.id);
		if (index > -1) {
			if (currentPointIndex.value > -1) {
				currentArea.value.points.splice(currentPointIndex.value, 1);
			} else {
				props.screen.areas.splice(index, 1);
			}
			currentArea.value = null;
			emit("update");
		}
		event.preventDefault();
	}

	//Unselect an area
	if (event.key == "Escape" && currentArea.value) {
		event.stopPropagation();
		event.preventDefault();
		resetCurrentArea();
	}

	//Copy current area to clipboard
	if (event.key == "c" && metaKey && currentArea.value) {
		const wrapper = {
			dataType: "heatarea",
			data: currentArea.value,
		};
		Utils.copyToClipboard(JSON.stringify(wrapper));
	}

	//Paste an area from clipboard
	if (event.key == "v" && metaKey) {
		navigator.clipboard.readText().then((text) => {
			try {
				const json = JSON.parse(text);
				if (json.dataType == "heatarea") {
					const area = json.data;
					area.id = Utils.getUUID();
					props.screen.areas.push(area);
					currentArea.value = area;
					emit("update");
				}
			} catch (error) {}
		});
	}

	//Move area or point with arrows
	if (currentArea.value) {
		const editor = editorRef.value;
		if (!editor) return;
		const bounds = editor.getBoundingClientRect();
		const scale = metaKey ? 50 : event.shiftKey ? 10 : 1;
		let addX = 0;
		let addY = 0;
		if (event.key == "ArrowLeft") addX = (-1 / bounds.width) * scale;
		if (event.key == "ArrowRight") addX = (1 / bounds.width) * scale;
		if (event.key == "ArrowUp") addY = (-1 / bounds.height) * scale;
		if (event.key == "ArrowDown") addY = (1 / bounds.height) * scale;

		if (addX != 0 || addY != 0) {
			if (currentPointIndex.value > -1) {
				currentArea.value.points[currentPointIndex.value]!.x += addX;
				currentArea.value.points[currentPointIndex.value]!.y += addY;
			} else {
				for (const point of currentArea.value.points) {
					point.x += addX;
					point.y += addY;
				}
			}
			event.preventDefault();
			event.stopPropagation();
		}
	}
}

function onKeyUp(event: KeyboardEvent): void {
	if (event.key == " ") {
		spacePressed.value = false;
	}
}

function onMouseWheel(event: WheelEvent): void {
	if (event.deltaY == 0) return;
	// if (!event.ctrlKey && !event.metaKey) return;

	const scrollable = scrollableRef.value;
	if (!scrollable) return;

	const prevScale = editorScale.value;
	const nextScale = Math.min(5, Math.max(1, prevScale * (event.deltaY > 0 ? 0.9 : 1.1)));
	if (nextScale === prevScale) {
		event.preventDefault();
		return;
	}

	const rect = scrollable.getBoundingClientRect();
	const cursorX = event.clientX - rect.left;
	const cursorY = event.clientY - rect.top;

	// Read from pending values so rapid events accumulate correctly instead of reading stale DOM
	const currentScrollLeft = pendingScrollLeft ?? scrollable.scrollLeft;
	const currentScrollTop = pendingScrollTop ?? scrollable.scrollTop;
	const ratio = nextScale / prevScale;
	pendingScrollLeft = (currentScrollLeft + cursorX) * ratio - cursorX;
	pendingScrollTop = (currentScrollTop + cursorY) * ratio - cursorY;

	editorScale.value = nextScale;

	// Apply after Vue widens the editor so scrollLeft isn't clamped to the old max
	nextTick(() => {
		if (pendingScrollLeft === null) return;
		scrollable.scrollLeft = pendingScrollLeft;
		scrollable.scrollTop = pendingScrollTop!;
		pendingScrollLeft = null;
		pendingScrollTop = null;
	});

	event.preventDefault();
}

function onMouseUp(event: PointerEvent): void {
	if (isPanning.value) {
		isPanning.value = false;
		panStart.value = null;
		return;
	}
	let offsetX = event.x - draggOriginalOffset.value.x;
	let offsetY = event.y - draggOriginalOffset.value.y;
	if (
		(draggedPoint.value || draggedArea.value) &&
		(Math.abs(offsetX) > 0.5 || Math.abs(offsetY) > 0.5)
	) {
		event.preventDefault();
		event.stopPropagation();
		emit("update");
	}
	draggedPoint.value = null;
	draggedArea.value = null;
}

function onMouseMove(event: PointerEvent): void {
	if (isPanning.value && panStart.value) {
		const scrollable = scrollableRef.value;
		if (scrollable) {
			scrollable.scrollLeft = panStart.value.scrollLeft - (event.clientX - panStart.value.x);
			scrollable.scrollTop = panStart.value.scrollTop - (event.clientY - panStart.value.y);
		}
		return;
	}

	const editor = editorRef.value;
	if (!editor) return;
	const bounds = editor.getBoundingClientRect();

	const [areaIndex, pointIndex] = getSegmentUnderPoint(event.x, event.y);

	editMode.value = null;
	if (areaIndex > -1 && pointIndex > -1) editMode.value = "append";

	if (draggedPoint.value) {
		//Move a single point
		draggedPoint.value.x = (event.x - bounds.x) / bounds.width;
		draggedPoint.value.y = (event.y - bounds.y) / bounds.height;
		if (event.shiftKey && currentArea.value) {
			applyShiftSnap(draggedPoint.value, currentArea.value, currentPointIndex.value);
		}
	}

	if (draggedArea.value) {
		const centroid = computeCentroid(draggedArea.value.points);
		centroid.x *= bounds.width;
		centroid.y *= bounds.height;
		let offsetX = event.x - draggOffset.value.x;
		let offsetY = event.y - draggOffset.value.y;

		//Limit area position to avoid losing it out of screen
		if (centroid.x + offsetX < 0) offsetX -= centroid.x + offsetX;
		if (centroid.x + offsetX > bounds.width) offsetX += bounds.width - (centroid.x + offsetX);
		if (centroid.y + offsetY < 0) offsetY -= centroid.y + offsetY;
		if (centroid.y + offsetY > bounds.height) offsetY += bounds.height - (centroid.y + offsetY);

		//Move all points
		for (const point of draggedArea.value.points) {
			point.x += offsetX / bounds.width;
			point.y += offsetY / bounds.height;
		}
		draggOffset.value.x = event.x;
		draggOffset.value.y = event.y;
	}
}

/**
 * Checks if the given coordinates are near any of the areas segments
 * @param x
 * @param y
 */
function getSegmentUnderPoint(x: number, y: number): [number, number] {
	const editor = editorRef.value;
	if (!editor) return [-1, -1];
	const bounds = editor.getBoundingClientRect();
	x = (x - bounds.x) / bounds.width;
	y = (y - bounds.y) / bounds.height;

	let areaIndex = -1;
	let pointIndex = -1;
	let minDist = Number.MAX_SAFE_INTEGER;

	for (let i = 0; i < props.screen.areas.length; i++) {
		const area = props.screen.areas[i]!;
		//Parse all points going 1 beyond to also check segment between last and first point
		for (let j = 1; j < area.points.length + 1; j++) {
			const prevP = area.points[j - 1]!;
			//Make sure we loop the index to check segment between last and first point
			const point = area.points[j % area.points.length]!;
			//Compute size of the segment
			const dist = Math.sqrt(
				Math.pow(point.x * 1920 - prevP.x * 1920, 2) +
					Math.pow(point.y * 1080 - prevP.y * 1080, 2),
			);
			//Compute distance between start point and cusrsor
			const dist1 = Math.sqrt(
				Math.pow(x * 1920 - prevP.x * 1920, 2) + Math.pow(y * 1080 - prevP.y * 1080, 2),
			);
			//Compute distance between end point and cusrsor
			const dist2 = Math.sqrt(
				Math.pow(point.x * 1920 - x * 1920, 2) + Math.pow(point.y * 1080 - y * 1080, 2),
			);
			const distFromSegment = dist1 + dist2 - dist;
			if (distFromSegment < 0.5 && distFromSegment < minDist) {
				areaIndex = i;
				pointIndex = j;
				minDist = distFromSegment;
			}
		}
	}
	return [areaIndex, pointIndex];
}

/**
 * Compute the centroid coordinates of a polygon
 * @param points
 */
function computeCentroid(points: { x: number; y: number }[]) {
	let cx = 0;
	let cy = 0;
	const n = points.length;
	for (let i = 0; i < n; i++) {
		cx += points[i]!.x;
		cy += points[i]!.y;
	}
	cx /= n;
	cy /= n;

	return { x: cx, y: cy };
}

/**
 * Grabs an OBS screenshot to set it as area's background
 */
async function refreshImage(): Promise<void> {
	if (disposed.value) return;
	const area = backgroundRef.value;
	if (area && props.obsPreview == true && OBSWebsocket.instance.connected.value) {
		const scene = props.screen.activeOBSScene ? props.screen.activeOBSScene : undefined;
		const image = await OBSWebsocket.instance.getScreenshot(scene);
		area.style.backgroundImage = "url(" + image + ")";
	}

	clearTimeout(refreshTimeout);
	refreshTimeout = window.setTimeout(() => refreshImage(), 60);
}
</script>

<style scoped lang="less">
.heatscreeneditor {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.scrollable {
		width: 100%;
		aspect-ratio: 16/9;
		overflow: auto;
		outline: 1px solid var(--color-text);
	}

	.editor {
		cursor: crosshair;
		user-select: none;
		position: relative;
		overflow: hidden;
		width: 100%;
		aspect-ratio: 16/9;
		.background {
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			opacity: 0.5;
			position: absolute;
			background-size: contain;
			background-repeat: no-repeat;
			background-position: center center;
		}
		// &.delete {
		// 	cursor: crosshair;
		// }

		svg {
			position: relative;
			z-index: 1;
			:deep(polygon) {
				fill: var(--color-text-fader);
				// stroke: var(--color-text);
				cursor: grab;
				&:active {
					cursor: grabbing;
				}

				&.selected {
					fill: var(--color-secondary-fader);
					stroke: var(--color-secondary);
				}

				&.disabled {
					fill: var(--color-text-fadest);
					stroke: var(--color-text-fader);
					stroke-dasharray: 10 10;
				}
			}
			:deep(circle) {
				fill: var(--color-text);
				cursor: pointer;

				&.selected {
					fill: var(--color-secondary);
				}
			}
		}

		&.add {
			cursor: crosshair;
		}
		&.space-held {
			cursor: grab;
			:deep(polygon),
			:deep(circle) {
				cursor: inherit;
			}
		}
		&.panning {
			cursor: grabbing;
			:deep(polygon),
			:deep(circle) {
				cursor: inherit;
			}
		}
		&.append {
			cursor: copy;
			:deep(polygon) {
				cursor: inherit;
			}
		}
	}

	.form {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
	}

	.companion {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
}
</style>
