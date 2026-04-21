<template>
	<div :class="classes">
		<TTButton
			class="addFolderBt"
			icon="folder"
			v-if="!triggerId && folderTriggerList.length > 0"
			@click="addFolder()"
			v-newflag="{ date: $config.NEW_FLAGS_DATE_V11, id: 'triggers_folder' }"
			>{{ t("triggers.create_folder") }}</TTButton
		>
		<SearchForm v-if="!triggerId && folderTriggerList.length > 0" v-model="debouncedSearch">
			<Checkbox class="searchActions" v-model="searchInActions">{{
				t("triggers.search_in_actions")
			}}</Checkbox>
		</SearchForm>
		<TriggerListFolderItem
			v-model:items="filteredTriggerList"
			:rewards="rewards"
			:noEdit="noEdit || hasSearch"
			:triggerId="triggerId"
			@change="onUpdateList"
			@changeState="onToggleTrigger"
			@delete="deleteTrigger"
			@duplicate="duplicateTrigger"
			@testTrigger="emit('testTrigger', $event)"
			@createTrigger="emit('createTrigger', $event)"
			@select="emit('select', $event)"
		/>
	</div>
</template>

<script setup lang="ts">
import Checkbox from "@/components/Checkbox.vue";
import TTButton from "@/components/TTButton.vue";
import { useConfirm } from "@/composables/useConfirm";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import {
	TriggerTypesDefinitionList,
	type TriggerData,
	type TriggerTreeItemData,
	type TriggerTypeDefinition,
	type TriggerTypesValue,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import Utils from "@/utils/Utils";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import SearchForm from "../SearchForm.vue";
import TriggerListFolderItem from "./TriggerListFolderItem.vue";
import { onBeforeMount } from "vue";

const { t } = useI18n();
const { confirm } = useConfirm();
const storeTriggers = useStoreTriggers();

const props = withDefaults(
	defineProps<{
		rewards?: TwitchDataTypes.Reward[];
		noEdit?: boolean;
		triggerId?: string | null;
	}>(),
	{
		rewards: () => [],
		noEdit: false,
		triggerId: null,
	},
);

const emit = defineEmits<{
	select: [trigger: TriggerData];
	testTrigger: [trigger: TriggerData];
	createTrigger: [folderId: string];
}>();

const debouncedSearch = ref<string>("");
const searchInActions = ref<boolean>(false);
const triggerTypeToInfo = ref<Partial<{ [key in TriggerTypesValue]: TriggerTypeDefinition }>>({});
const buildIndex = ref(0);
let buildInterval = -1;
const folderTriggerList = ref<(TriggerListEntry | TriggerListFolderEntry)[]>([]);
const buildBatchSize = 25;

const hasSearch = computed((): boolean => {
	return debouncedSearch.value.trim().length > 0;
});

const filteredTriggerList = computed({
	get(): (TriggerListEntry | TriggerListFolderEntry)[] {
		if (!hasSearch.value) return folderTriggerList.value;
		const query = debouncedSearch.value.trim().toLowerCase();
		return filterTree(folderTriggerList.value, query);
	},
	set(value: (TriggerListEntry | TriggerListFolderEntry)[]) {
		if (!hasSearch.value) {
			folderTriggerList.value = value;
		}
	},
});

const classes = computed((): string[] => {
	const res = ["triggerslist"];
	return res;
});

onBeforeMount(() => {
	populateTriggers();
});

let isFirstRewardUpdate = true;
watch(
	() => props.rewards,
	() => {
		if (isFirstRewardUpdate) {
			isFirstRewardUpdate = false;
			return;
		}
		populateTriggers();
	},
);
/**
 * Sync folder enabled states from store tree back to local entries.
 * This catches external mutations (ex: toggling a folder from the triggers)
 * that bypass populateTriggers() and would otherwise be invisible to the UI.
 */
watch(
	() => storeTriggers.triggerTree,
	() => {
		const enabledMap = new Map<string, boolean>();
		function collectEnabled(items: TriggerTreeItemData[]) {
			for (const item of items) {
				if (item.type === "folder") {
					enabledMap.set(item.id, item.enabled !== false);
					if (item.children) collectEnabled(item.children);
				}
			}
		}
		collectEnabled(storeTriggers.triggerTree);
		function syncEnabled(items: (TriggerListEntry | TriggerListFolderEntry)[]) {
			for (const item of items) {
				if (item.type === "folder") {
					const storeEnabled = enabledMap.get(item.id);
					if (storeEnabled !== undefined && item.enabled !== storeEnabled) {
						item.enabled = storeEnabled;
					}
					syncEnabled(item.items);
				}
			}
		}
		syncEnabled(folderTriggerList.value);
	},
	{ deep: true },
);
startSequentialBuild();

onBeforeUnmount(() => {
	clearInterval(buildInterval);
});

function startSequentialBuild(): void {
	buildIndex.value = -1;
	clearInterval(buildInterval);
	buildInterval = window.setInterval(() => {
		buildIndex.value++;
		if (buildIndex.value > Math.floor(folderTriggerList.value.length / buildBatchSize)) {
			clearInterval(buildInterval);
		}
	}, 60);
}

function populateTriggers(): void {
	triggerTypeToInfo.value = {};
	TriggerTypesDefinitionList().forEach((v) => (triggerTypeToInfo.value[v.value] = v));

	const triggerList = storeTriggers.triggerList;

	triggerList.sort((a, b) => {
		if (parseInt(a.type) > parseInt(b.type)) return 1;
		if (parseInt(a.type) < parseInt(b.type)) return -1;
		return 0;
	});

	let triggerBuildIndex = 0;
	let flatList: TriggerListEntry[] = [];

	for (const trigger of triggerList) {
		const info = TriggerUtils.getTriggerDisplayInfo(trigger);
		const canTest = triggerTypeToInfo.value[trigger.type]!.testMessageType != undefined;
		const bIndex = Math.floor(++triggerBuildIndex / buildBatchSize);
		const entry: TriggerListEntry = {
			type: "trigger",
			index: bIndex,
			label: info.label,
			labelKey: info.labelKey,
			id: trigger.id,
			trigger,
			icon: info.icon,
			iconURL: info.iconURL,
			iconEmoji: info.iconEmoji,
			canTest,
		};
		flatList.push(entry);
		if (info.iconBgColor) entry.iconBgColor = info.iconBgColor;
	}

	if (props.triggerId != null) {
		folderTriggerList.value = flatList.filter(
			(v) => v.type == "trigger" && v.trigger.id === props.triggerId,
		);
	} else {
		const idToHasFolder: { [key: string]: boolean } = {};
		const done: any = {};
		function buildItem(
			items: TriggerTreeItemData[],
		): (TriggerListEntry | TriggerListFolderEntry)[] {
			const res: (TriggerListEntry | TriggerListFolderEntry)[] = [];
			for (const item of items) {
				if (item.type == "folder") {
					const children = buildItem(item.children || []);
					res.push({
						type: "folder",
						id: item.id,
						label: item.name!,
						items: children,
						color: { type: "color", value: item.color || "#60606c" },
						expand: item.expand == true,
						enabled: item.enabled !== false,
					});
				} else {
					const entry = flatList.find((v) => v.trigger.id == item.triggerId);
					if (entry && !done[entry.id]) {
						idToHasFolder[entry.id] = true;
						res.push(entry);
					}
				}
			}
			return res;
		}
		folderTriggerList.value = buildItem(storeTriggers.triggerTree);

		flatList.forEach((v) => {
			if (!idToHasFolder[v.id]) {
				folderTriggerList.value.push(v);
			}
		});
	}

	startSequentialBuild();
}

function deleteTrigger(entry: TriggerListEntry): void {
	confirm(t("triggers.delete_confirm"))
		.then(() => {
			storeTriggers.deleteTrigger(entry.trigger.id);
			populateTriggers();
		})
		.catch((error) => {});
}

function duplicateTrigger(
	entry: TriggerListEntry,
	parent?: TriggerListEntry | TriggerListFolderEntry,
): void {
	storeTriggers.duplicateTrigger(entry.trigger.id, parent?.id);
	populateTriggers();
	onUpdateList();
}

function onToggleTrigger(item: TriggerListEntry): void {
	storeTriggers.saveTriggers();
}

function onUpdateList(): void {
	function buildItem(root: TriggerListEntry | TriggerListFolderEntry): TriggerTreeItemData {
		switch (root.type) {
			case "folder": {
				return {
					type: "folder",
					id: root.id,
					name: root.label,
					expand: root.expand === true,
					color: root.color.value,
					enabled: root.enabled !== false,
					children: root.items.map((v) => buildItem(v)),
				};
			}
			default:
			case "trigger": {
				return { type: "trigger", id: root.id, triggerId: root.id };
			}
		}
	}

	const tree = folderTriggerList.value.map((v) => buildItem(v));
	storeTriggers.updateTriggerTree(tree);
}

function filterTree(
	items: (TriggerListEntry | TriggerListFolderEntry)[],
	query: string,
): (TriggerListEntry | TriggerListFolderEntry)[] {
	const result: (TriggerListEntry | TriggerListFolderEntry)[] = [];
	for (const item of items) {
		if (item.type === "folder") {
			const filteredChildren = filterTree(item.items, query);
			if (filteredChildren.length > 0) {
				result.push({ ...item, items: filteredChildren, expand: true });
			}
		} else {
			const values: (string | undefined)[] = [item.label];
			if (item.labelKey) values.push(t(item.labelKey));
			if (searchInActions.value) {
				item.trigger.actions.forEach((action) => {
					switch (action.type) {
						case "chat": {
							values.push(action.text);
							break;
						}
						case "customChat": {
							values.push(action.customMessage.message);
							values.push(action.customMessage.quote);
							values.push(action.customMessage.user?.name);
							break;
						}
						case "raffle": {
							values.push(action.raffleData.command);
							values.push(action.raffleData.customEntries);
							values.push(...action.raffleData.entries.map((entry) => entry.label));
							break;
						}
						case "animated_text": {
							if (action.animatedTextData.action == "show") {
								values.push(action.animatedTextData.text);
							}
							break;
						}
						case "discord": {
							values.push(action.discordAction.message);
							break;
						}
						case "highlight": {
							if (action.show) {
								values.push(action.text);
							}
							break;
						}
						case "http": {
							values.push(action.url);
							break;
						}
						case "music": {
							values.push(action.track);
							break;
						}
						case "obs": {
							values.push(action.sourceName);
							values.push(action.filterName);
							values.push(action.text);
							values.push(action.url);
							values.push(action.browserEventName);
							values.push(action.browserEventParams);
							values.push(action.recordChapterName);
							values.push(action.persistedDataKey);
							values.push(action.persistedDataValue);
							values.push(action.persistedDataPlaceholder);
							break;
						}
						case "poll": {
							values.push(action.pollData.title);
							values.push(...action.pollData.answers.map((option) => option));
							break;
						}
						case "prediction": {
							values.push(action.predictionData.title);
							values.push(...action.predictionData.answers.map((option) => option));
							break;
						}
						case "chat_poll": {
							values.push(action.chatPollData.title);
							values.push(
								...action.chatPollData.choices.map((option) => option.label),
							);
							break;
						}
						case "chatSugg": {
							values.push(action.suggData.command);
							break;
						}
						case "tts": {
							values.push(action.text);
							break;
						}
						case "random": {
							if (action.mode == "list") {
								values.push(...action.list.map((option) => option));
							}
							break;
						}
						case "stream_infos": {
							values.push(action.title);
							if (action.tags) values.push(...action.tags);
							break;
						}
					}
				});
			}
			for (const value of values) {
				if (value && value.toString().toLowerCase().includes(query.toLowerCase())) {
					result.push(item);
					break;
				}
			}
		}
	}
	return result;
}

function addFolder(): void {
	folderTriggerList.value.unshift({
		type: "folder",
		id: Utils.getUUID(),
		items: [],
		label: "",
		enabled: true,
		expand: true,
		color: { type: "color", value: "#60606c" },
	});
	onUpdateList();
	populateTriggers();
}

export interface TriggerListEntry {
	type: "trigger";
	id: string;
	index: number;
	label: string;
	labelKey?: string;
	icon: string;
	canTest: boolean;
	trigger: TriggerData;
	iconURL?: string;
	iconBgColor?: string;
	iconEmoji?: string;
}

export interface TriggerListFolderEntry {
	type: "folder";
	id: string;
	label: string;
	enabled: boolean;
	expand: boolean;
	color: TwitchatDataTypes.ParameterData<string>;
	items: (TriggerListEntry | TriggerListFolderEntry)[];
}
</script>

<style scoped lang="less">
.triggerslist {
	display: flex;
	flex-direction: column;
	gap: 1em;

	.searchActions {
		display: flex;
		align-items: center;
		gap: 0.5em;
		font-size: 0.9em;
		cursor: pointer;
		align-self: center;
		background-color: var(--background-color-fader);
		padding: 0.25em 0.5em;
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
	}

	.addFolderBt {
		align-self: center;
	}
}
</style>
