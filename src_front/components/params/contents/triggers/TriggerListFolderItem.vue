<template>
	<draggable
		class="triggerlistfolderitem"
		:animation="250"
		group="trigger"
		item-key="id"
		tag="div"
		v-model="localItems"
		:invertSwap="true"
		:swapThreshold="10"
		:emptyInsertThreshold="0"
		:disabled="noEdit !== false"
		@start="dragging = true"
		@end="onDragEnd()"
	>
		<template
			#item="{
				element: folder,
				index,
			}: {
				element: TriggerListEntry | TriggerListFolderEntry;
				index: number;
			}"
		>
			<ToggleBlock
				class="folder"
				v-if="folder.type == 'folder'"
				medium
				:editableTitle="!noEdit"
				v-model:title="folder.label"
				v-model:open="folder.expand"
				:customColor="folder.color.value"
				:ref="
					(el: any) => {
						if (el) folderRefs['folder_' + folder.id] = el;
					}
				"
				:titleDefault="'folder'"
				@dragstart="startDrag(folder)"
				@drop="onDrop($event, folder)"
				@dragenter="onDragEnter($event, folder)"
				@dragleave="onDragLeave($event, folder)"
				@update:open="$emit('change', $event)"
				@update:title="$emit('change', $event)"
			>
				<template #left_actions>
					<ParamItem
						class="colorSelector"
						v-if="noEdit === false"
						@click.stop
						v-tooltip="$t('triggers.folder_color')"
						:paramData="folder.color"
						v-model="folder.color.value"
						@change="$emit('change', $event)"
					/>
					<Icon name="broadcast" />
					<div class="count">x{{ countTriggerItems(folder) }}</div>
				</template>
				<template #right_actions>
					<ToggleButton
						class="triggerToggle"
						v-model="folder.enabled"
						@click.stop
						@change="onToggleFolder(folder)"
						data-close-popout
					/>
					<TTButton
						class="deleteBt"
						icon="add"
						v-if="noEdit === false"
						@click.stop="addTrigger(folder)"
						data-close-popout
						v-tooltip="$t('triggers.add_triggerBt')"
						transparent
					></TTButton>
					<TTButton
						class="deleteBt"
						icon="trash"
						v-if="noEdit === false"
						@click.stop="deleteFolder(folder)"
						alert
					></TTButton>
				</template>

				<div
					@drop.stop
					:class="
						folder.enabled === false && selectMode === false
							? 'childList disabled'
							: 'childList'
					"
				>
					<TriggerListFolderItem
						:class="!folder.items || folder.items.length == 0 ? 'emptyChildren' : ''"
						v-model:items="folder.items"
						:level="level + 1"
						:rewards="rewards"
						:noEdit="noEdit"
						:selectMode="selectMode"
						:forceDisableOption="forceDisableOption"
						:triggerId="triggerId"
						@change="onChange"
						@changeState="onToggleTrigger(folder, $event)"
						@delete="$emit('delete', $event)"
						@duplicate="$emit('duplicate', $event, folder)"
						@testTrigger="$emit('testTrigger', $event)"
						@createTrigger="$emit('createTrigger', $event)"
						@select="$emit('select', $event)"
					/>

					<div v-if="!folder.items || folder.items.length == 0" class="emptyFolder">
						{{ $t("global.empty") }}
					</div>
				</div>
			</ToggleBlock>

			<TriggerListItem
				v-else
				:noEdit="noEdit"
				:selectMode="selectMode"
				:forceDisableOption="forceDisableOption"
				:entryData="folder"
				@dragstart="startDrag(folder)"
				@changeState="onToggleTrigger(folder, $event)"
				@delete="$emit('delete', $event)"
				@duplicate="$emit('duplicate', $event, folder)"
				@testTrigger="$emit('testTrigger', $event)"
				@select="$emit('select', $event)"
			>
			</TriggerListItem>
		</template>
	</draggable>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import ToggleButton from "@/components/ToggleButton.vue";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import { RoughEase } from "gsap/EasePack";
import { Linear, gsap } from "gsap/gsap-core";
import { nextTick, onBeforeMount, ref, watch, type ComponentPublicInstance } from "vue";
import draggable from "vuedraggable";
import ParamItem from "../../ParamItem.vue";
import type { TriggerListEntry, TriggerListFolderEntry } from "./TriggerList.vue";
import TriggerListItem from "./TriggerListItem.vue";
import { useI18n } from "vue-i18n";
import { useConfirm } from "@/composables/useConfirm";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import Config from "@/utils/Config";

defineOptions({ name: "TriggerListFolderItem" });

const { t } = useI18n();
const { confirm } = useConfirm();
const storeAuth = useStoreAuth();
const storeTriggers = useStoreTriggers();

const props = withDefaults(
	defineProps<{
		rewards?: TwitchDataTypes.Reward[];
		noEdit?: boolean;
		forceDisableOption?: boolean;
		selectMode?: boolean;
		triggerId?: string | null;
		items: (TriggerListEntry | TriggerListFolderEntry)[];
		level?: number;
	}>(),
	{
		rewards: () => [],
		noEdit: false,
		forceDisableOption: false,
		selectMode: false,
		triggerId: null,
		level: 0,
	},
);

const emit = defineEmits<{
	"update:items": [items: (TriggerListEntry | TriggerListFolderEntry)[]];
	change: [e?: any];
	changeState: [item: any];
	createTrigger: [folderId: string];
	delete: [entry: TriggerListEntry];
	duplicate: [entry: TriggerListEntry, folder?: TriggerListEntry | TriggerListFolderEntry];
	testTrigger: [trigger: TriggerListEntry["trigger"]];
	select: [trigger: TriggerListEntry["trigger"]];
}>();

const dragging = ref<boolean>(false);
const localItems = ref<(TriggerListEntry | TriggerListFolderEntry)[]>([]);
const folderRefs = ref<{ [key: string]: ComponentPublicInstance | undefined }>({});

let draggedEntry: TriggerListEntry | TriggerListFolderEntry | null = null;
let droppedOnFolder = false;
const dragCounter: { [id: string]: number } = {};

onBeforeMount(() => {
	localItems.value = props.items;
});

watch(
	() => props.items,
	() => (localItems.value = props.items),
);

function onChange(e?: {
	moved: { element: TriggerListEntry | TriggerListFolderEntry };
	newIndex: number;
	oldIndex: number;
}): void {
	emit("update:items", localItems.value);
	emit("change", e);
}

/**
 * Called when vuedraggable ends a drag.
 * Skips saving if onDrop already handled the move (drop onto folder header).
 */
function onDragEnd(): void {
	dragging.value = false;
	if (droppedOnFolder) {
		droppedOnFolder = false;
	} else {
		onChange();
	}
}

/**
 * Called when clicking delete button on a folder
 * @param id
 */
async function deleteFolder(folder: TriggerListFolderEntry): Promise<void> {
	if (folder.items.length > 0) {
		try {
			await confirm(
				t("triggers.delete_folder_confirm.title"),
				t("triggers.delete_folder_confirm.desc"),
			);
		} catch (error) {
			return;
		}
	}
	let index = localItems.value.findIndex((v) => v.id == folder.id);
	localItems.value.splice(index, 1);
	folder.items.forEach((v) => {
		localItems.value.splice(index, 0, v);
		index++;
	});
	onChange();
}

/**
 * Called when starting to drag an item
 * @param entry
 */
function startDrag(entry: TriggerListEntry | TriggerListFolderEntry): void {
	draggedEntry = entry;
	dragCounter[entry.id] = 0;
}

/**
 * Called when an item is dropped onto a folder header.
 * Defers array modification to nextTick so vuedraggable finishes first.
 * @param event
 * @param folder
 */
function onDrop(event: Event, folder: TriggerListFolderEntry): void {
	if (!dragging.value) return;
	if (!draggedEntry) return;
	if (draggedEntry == folder) return;

	event.stopPropagation();
	const entry = draggedEntry;
	draggedEntry = null;
	droppedOnFolder = true;

	nextTick(() => {
		const index = localItems.value.findIndex((v) => v.id === entry.id);
		if (index !== -1) {
			localItems.value.splice(index, 1);
			folder.items.push(entry);
		}
		onChange();
	});
}

function onDragEnter(event: MouseEvent, entry: TriggerListFolderEntry): void {
	if (draggedEntry == entry) return;
	if (!dragging.value) return;
	//Drag system is fucked up. It fires dragenter/leave event for every
	//single children of the holder unless we set a "pointer-events:none" to
	//it which I can't do because ToggleBlock contains many interactive
	//children.
	//We keep track of the number of over/leaved child to know if we're
	//still over the element or not
	if (!dragCounter[entry.id]) dragCounter[entry.id] = 0;
	dragCounter[entry.id]!++;
	(event.currentTarget as HTMLElement).classList.add("over");
}

function onDragLeave(event: MouseEvent, entry: TriggerListFolderEntry): void {
	if (draggedEntry == entry) return;
	if (!dragCounter[entry.id]) dragCounter[entry.id] = 0;
	if (--dragCounter[entry.id]! < 1) {
		dragCounter[entry.id] = 0;
		(event.currentTarget as HTMLElement).classList.remove("over");
	}
}

/**
 * Toggles a trigger state
 * @param item
 * @param el
 */
function onToggleTrigger(item: TriggerListEntry | TriggerListFolderEntry, el: HTMLElement): void {
	if (
		item.type == "trigger" &&
		item.trigger.enabled &&
		!storeAuth.isPremium &&
		storeTriggers.triggerList.filter(
			(v) => v.enabled !== false && storeTriggers.triggerIdToFolderEnabled[v.id] !== false,
		).length > Config.instance.MAX_TRIGGERS
	) {
		window.setTimeout(() => {
			item.trigger.enabled = false;
		}, 350);
		vibrate(el);
	} else {
		emit("change");
		emit("changeState", item);
	}
}

/**
 * Adds a trigger within the folder
 */
function addTrigger(folder: TriggerListFolderEntry): void {
	emit("createTrigger", folder.id);
}

/**
 * Enable/disable a folder
 */
function onToggleFolder(folder: TriggerListFolderEntry): void {
	emit("change");
	//If there are too much items enabled, disable the folder
	if (
		folder.enabled &&
		!storeAuth.isPremium &&
		storeTriggers.triggerList.filter(
			(v) => v.enabled !== false && storeTriggers.triggerIdToFolderEnabled[v.id] !== false,
		).length > Config.instance.MAX_TRIGGERS
	) {
		//Need to wait for animation to complete
		window.setTimeout(() => {
			folder.enabled = false;
			//Emit the revert
			emit("change");
		}, 200);
		const ref = folderRefs.value["folder_" + folder.id];
		if (ref) vibrate(ref.$el as HTMLElement);
	}
}

function countTriggerItems(folder: TriggerListFolderEntry): number {
	function parseFolder(folder: TriggerListFolderEntry): number {
		let count = 0;
		folder.items.forEach((v) => {
			if (v.type == "trigger") count++;
			if (v.type == "folder") count += parseFolder(v);
		});
		return count;
	}
	return parseFolder(folder);
}

function vibrate(el: HTMLElement): void {
	window.setTimeout(() => {
		gsap.fromTo(
			el,
			{ backgroundColor: "rgba(255,0,0,1)" },
			{
				duration: 0.5,
				backgroundColor: "rgba(255,0,0,0)",
				clearProps: "background-color",
			},
		);
		gsap.fromTo(
			el,
			{ x: -5 },
			{
				duration: 0.25,
				x: 5,
				ease: RoughEase.ease.config({
					strength: 8,
					points: 20,
					template: Linear.easeNone,
					randomize: false,
				}),
				clearProps: "x",
			},
		);
	}, 150);
}
</script>

<style scoped lang="less">
.triggerlistfolderitem {
	display: flex;
	flex-direction: column;
	gap: 2px;

	.folder {
		margin: 0.25em 0;
		z-index: 998999;
		&.over {
			outline: 2px solid var(--color-secondary);
		}
	}

	.triggerToggle {
		align-self: center;
	}

	.childList {
		position: relative;
		.emptyFolder {
			text-align: center;
			font-style: italic;
			position: absolute;
			top: 50%;
			transform: translateY(-50%);
			width: 100%;
			pointer-events: none;
			z-index: -1;
		}
		.emptyChildren {
			// padding: .5em;
			min-height: 1em;
		}
		:deep(.sortable-ghost) {
			background-color: var(--toggle-block-header-background-hover);
		}
		.triggerlistitem {
			transition: opacity 0.5s;
		}
		&.disabled {
			.triggerlistitem {
				opacity: 0.5;
			}
		}
	}
	.colorSelector {
		padding: 0;
		height: 100%;
		width: 1em;
		margin-left: -0.5em;
		margin-right: 0.25em;
		box-shadow: 2px 0 2px rgba(0, 0, 0, 0.2);
		:deep(.content) {
			height: 100%;
			.holder,
			.inputHolder {
				border-radius: 0;
				align-self: stretch;
				height: 100%;
			}
		}
	}
}
</style>
