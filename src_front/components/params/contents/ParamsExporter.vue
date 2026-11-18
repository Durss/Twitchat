<template>
	<div class="paramsexporter parameterContent">
		<Icon name="share" class="icon" />

		<div class="head">
			<p>Export any kind of parameter and share them</p>
			<p class="card-item secondary">
				<Icon name="alert" class="icon" />This is a very experimental feature that may not
				work as expected.
			</p>
		</div>

		<SettingsExportForm />

		<Splitter class="splitter">👇 Select items to export 👇</Splitter>

		<ToggleBlock :icons="['broadcast']" :title="t('params.categories.triggers')" :open="false">
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedTriggerIDs.length }}</p>
			</template>
			<div class="itemList">
				<TriggerListFolderItem
					v-model:items="folderTriggerList"
					:noEdit="true"
					:selectMode="true"
				/>
			</div>
		</ToggleBlock>

		<ToggleBlock
			:icons="['count']"
			:title="t('params.categories.counters')"
			:open="false"
			v-if="storeCounters.counterList.length > 0"
		>
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedCounterIDs.length }}</p>
			</template>
			<div class="itemList">
				<div
					class="rowItem"
					v-for="item in storeCounters.counterList"
					@click="toggleCounter(item.id)"
					:key="item.id"
				>
					<span class="label"><Icon name="count" />{{ item.name }}</span>
					<div class="toggle">
						<ToggleButton v-model="counterStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock
			:icons="['placeholder']"
			:title="t('params.categories.values')"
			:open="false"
			v-if="storeValues.valueList.length > 0"
		>
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedValueIDs.length }}</p>
			</template>
			<div class="itemList">
				<div
					class="rowItem"
					v-for="item in storeValues.valueList"
					@click="toggleValue(item.id)"
					:key="item.id"
				>
					<span class="label"><Icon name="placeholder" />{{ item.name }}</span>
					<div class="toggle">
						<ToggleButton v-model="valueStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock
			:icons="['label']"
			title="Label Overlays"
			:open="false"
			v-if="storeLabels.labelList.length > 0"
		>
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedLabelIDs.length }}</p>
			</template>
			<div class="itemList">
				<div
					class="rowItem"
					v-for="item in storeLabels.labelList"
					@click="toggleLabel(item.id)"
					:key="item.id"
				>
					<span class="label"><Icon name="label" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="labelStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock
			:icons="['easing']"
			title="Animated texts"
			:open="false"
			v-if="storeAnimatedText.animatedTextList.length > 0"
		>
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedAnimatedTextIDs.length }}</p>
			</template>
			<div class="itemList">
				<div
					class="rowItem"
					v-for="item in storeAnimatedText.animatedTextList"
					@click="toggleAnimatedText(item.id)"
					:key="item.id"
				>
					<span class="label"><Icon name="easing" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="animatedTextStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock
			:icons="['train']"
			title="Custom Hype Trains"
			:open="false"
			v-if="storeCustomTrain.customTrainList.length > 0"
		>
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedCustomTrainIDs.length }}</p>
			</template>
			<div class="itemList">
				<div
					class="rowItem"
					v-for="item in storeCustomTrain.customTrainList"
					@click="toggleCustomTrain(item.id)"
					:key="item.id"
				>
					<span class="label"><Icon name="train" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="customTrainStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock
			:icons="['timer']"
			title="Timers and Countdowns"
			:open="false"
			v-if="filteredTimers.length > 0"
		>
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedTimerIDs.length }}</p>
			</template>
			<div class="itemList">
				<div
					class="rowItem"
					v-for="item in filteredTimers"
					@click="toggleTimer(item.id)"
					:key="item.id"
				>
					<span class="label">
						<Icon name="timer" v-if="item.type == 'timer'" />
						<Icon name="countdown" v-if="item.type == 'countdown'" />
						{{ item.title }}
					</span>
					<div class="toggle">
						<ToggleButton v-model="timerStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock
			:icons="['credits']"
			title="Ending credits overlay"
			:open="false"
			v-if="endingCreditsSlots.length > 0"
		>
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedEndingCreditsSlotIDs.length }}</p>
			</template>
			<div class="itemList">
				<div
					class="rowItem"
					v-for="item in endingCreditsSlots"
					@click="toggleEndingCreditsSlot(item.id)"
					:key="item.id"
				>
					<span class="label"><Icon :name="item.icon" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="endingCreditSlotStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>

		<ToggleBlock
			:icons="['timer']"
			title="Bingo Grids"
			:open="false"
			v-if="storeBingoGrid.gridList.length > 0"
		>
			<template #right_actions>
				<p class="count">x{{ storeExporter.selectedBingoGridIDs.length }}</p>
			</template>
			<div class="itemList">
				<div
					class="rowItem"
					v-for="item in storeBingoGrid.gridList"
					@click="toggleBingoGrid(item.id)"
					:key="item.id"
				>
					<span class="label"><Icon name="bingo" />{{ item.title }}</span>
					<div class="toggle">
						<ToggleButton v-model="bingoGridStates[item.id]" />
					</div>
				</div>
			</div>
		</ToggleBlock>
	</div>
</template>

<script setup lang="ts">
import SettingsExportForm from "./exporter/SettingsExportForm.vue";
import ToggleBlock from "@/components/ToggleBlock.vue";
import TriggerListFolderItem from "./triggers/TriggerListFolderItem.vue";
import type { TriggerListEntry, TriggerListFolderEntry } from "./triggers/TriggerList.vue";
import type { TriggerTreeItemData } from "@/types/TriggerActionDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import ToggleButton from "@/components/ToggleButton.vue";
import Icon from "@/components/Icon.vue";
import DataStore from "@/store/DataStore";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StoreProxy from "@/store/StoreProxy";
import Splitter from "@/components/Splitter.vue";
import { computed, onMounted, ref } from "vue";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import { storeLabels as useStoreLabels } from "@/store/labels/storeLabels";
import { storeAnimatedText as useStoreAnimatedText } from "@/store/animated_text/storeAnimatedText";
import { storeCustomTrain as useStoreCustomTrain } from "@/store/customtrain/storeCustomTrain";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";
import { storeBingoGrid as useStoreBingoGrid } from "@/store/bingo_grid/storeBingoGrid";
import { storeExporter as useStoreExporter } from "@/store/exporter/storeExporter";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const storeCounters = useStoreCounters();
const storeValues = useStoreValues();
const storeLabels = useStoreLabels();
const storeAnimatedText = useStoreAnimatedText();
const storeCustomTrain = useStoreCustomTrain();
const storeTimer = useStoreTimer();
const storeBingoGrid = useStoreBingoGrid();
const storeExporter = useStoreExporter();
const storeTriggers = useStoreTriggers();

const folderTriggerList = ref<(TriggerListEntry | TriggerListFolderEntry)[]>([]);
const endingCreditsSlots = ref<
	{
		id: string;
		title: string;
		slotType: TwitchatDataTypes.EndingCreditsSlotStringTypes;
		icon: string;
	}[]
>([]);

const counterStates = ref<{ [key: string]: boolean }>({});
const valueStates = ref<{ [key: string]: boolean }>({});
const labelStates = ref<{ [key: string]: boolean }>({});
const animatedTextStates = ref<{ [key: string]: boolean }>({});
const customTrainStates = ref<{ [key: string]: boolean }>({});
const timerStates = ref<{ [key: string]: boolean }>({});
const endingCreditSlotStates = ref<{ [key: string]: boolean }>({});
const bingoGridStates = ref<{ [key: string]: boolean }>({});

const filteredTimers = computed(() => {
	return storeTimer.timerList.filter((v) => !v.isDefault);
});

const triggerList = computed<TriggerListEntry[]>(() => {
	const triggers = storeTriggers.triggerList;
	const entries = triggers.map((trigger, index) => {
		const info = TriggerUtils.getTriggerDisplayInfo(trigger);
		const entry: TriggerListEntry = {
			type: "trigger",
			id: trigger.id,
			index,
			label: info.label,
			trigger,
			icon: info.icon,
			iconURL: info.iconURL,
			canTest: false,
		};
		return entry;
	});
	return entries;
});

async function loadTriggers() {
	const list = storeTriggers.triggerList;
	const idToHasFolder: { [key: string]: boolean } = {};

	const flatList = list.map<TriggerListEntry>((v) => {
		const info = TriggerUtils.getTriggerDisplayInfo(v);
		return {
			type: "trigger",
			index: 0,
			label: info.label,
			id: v.id,
			trigger: v,
			icon: info.icon,
			iconURL: info.iconURL,
			canTest: false,
		};
	});
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
				if (entry && !idToHasFolder[entry.id]) {
					idToHasFolder[entry.id] = true;
					res.push(entry);
				}
			}
		}
		return res;
	}
	folderTriggerList.value = buildItem(storeTriggers.triggerTree);
	for (const t of triggerList.value) {
		if (!idToHasFolder[t.id]) {
			idToHasFolder[t.id] = true;
			folderTriggerList.value.push(t);
		}
	}
}

function toggleCounter(id: string) {
	counterStates.value[id] = !counterStates.value[id];
	if (counterStates.value[id]) storeExporter.selectedCounterIDs.push(id);
	else storeExporter.selectedCounterIDs.splice(storeExporter.selectedCounterIDs.indexOf(id), 1);
}

function toggleValue(id: string) {
	valueStates.value[id] = !valueStates.value[id];
	if (valueStates.value[id]) storeExporter.selectedValueIDs.push(id);
	else storeExporter.selectedValueIDs.splice(storeExporter.selectedValueIDs.indexOf(id), 1);
}

function toggleLabel(id: string) {
	labelStates.value[id] = !labelStates.value[id];
	if (labelStates.value[id]) storeExporter.selectedLabelIDs.push(id);
	else storeExporter.selectedLabelIDs.splice(storeExporter.selectedLabelIDs.indexOf(id), 1);
}

function toggleAnimatedText(id: string) {
	animatedTextStates.value[id] = !animatedTextStates.value[id];
	if (animatedTextStates.value[id]) storeExporter.selectedAnimatedTextIDs.push(id);
	else
		storeExporter.selectedAnimatedTextIDs.splice(
			storeExporter.selectedAnimatedTextIDs.indexOf(id),
			1,
		);
}

function toggleCustomTrain(id: string) {
	customTrainStates.value[id] = !customTrainStates.value[id];
	if (customTrainStates.value[id]) storeExporter.selectedCustomTrainIDs.push(id);
	else
		storeExporter.selectedCustomTrainIDs.splice(
			storeExporter.selectedCustomTrainIDs.indexOf(id),
			1,
		);
}

function toggleTimer(id: string) {
	timerStates.value[id] = !timerStates.value[id];
	if (timerStates.value[id]) storeExporter.selectedTimerIDs.push(id);
	else storeExporter.selectedTimerIDs.splice(storeExporter.selectedTimerIDs.indexOf(id), 1);
}

function toggleEndingCreditsSlot(id: string) {
	endingCreditSlotStates.value[id] = !endingCreditSlotStates.value[id];
	if (endingCreditSlotStates.value[id]) storeExporter.selectedEndingCreditsSlotIDs.push(id);
	else
		storeExporter.selectedEndingCreditsSlotIDs.splice(
			storeExporter.selectedEndingCreditsSlotIDs.indexOf(id),
			1,
		);
}

function toggleBingoGrid(id: string) {
	bingoGridStates.value[id] = !bingoGridStates.value[id];
	if (bingoGridStates.value[id]) storeExporter.selectedBingoGridIDs.push(id);
	else
		storeExporter.selectedBingoGridIDs.splice(
			storeExporter.selectedBingoGridIDs.indexOf(id),
			1,
		);
}

onMounted(() => {
	loadTriggers();

	storeCounters.counterList.forEach((item) => {
		counterStates.value[item.id] = storeExporter.selectedCounterIDs.includes(item.id);
	});

	storeValues.valueList.forEach((item) => {
		valueStates.value[item.id] = storeExporter.selectedValueIDs.includes(item.id);
	});

	storeLabels.labelList.forEach((item) => {
		labelStates.value[item.id] = storeExporter.selectedLabelIDs.includes(item.id);
	});

	storeAnimatedText.animatedTextList.forEach((item) => {
		animatedTextStates.value[item.id] = storeExporter.selectedAnimatedTextIDs.includes(item.id);
	});

	storeCustomTrain.customTrainList.forEach((item) => {
		customTrainStates.value[item.id] = storeExporter.selectedCustomTrainIDs.includes(item.id);
	});

	filteredTimers.value.forEach((item) => {
		timerStates.value[item.id] = storeExporter.selectedTimerIDs.includes(item.id);
	});

	storeBingoGrid.gridList.forEach((item) => {
		bingoGridStates.value[item.id] = storeExporter.selectedBingoGridIDs.includes(item.id);
	});

	const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
	if (json) {
		const creditsData = StoreProxy.endingCredits.overlayData;
		endingCreditsSlots.value =
			creditsData?.slots.map((v) => {
				const def = TwitchatDataTypes.EndingCreditsSlotDefinitions.find(
					(d) => d.id == v.slotType,
				)!;
				endingCreditSlotStates.value[v.id] =
					storeExporter.selectedEndingCreditsSlotIDs.includes(v.id);
				return { id: v.id, title: v.label, slotType: v.slotType, icon: def.icon };
			}) || [];
	}
});
</script>

<style scoped lang="less">
.paramsexporter {
	gap: 1em;
	display: flex;
	flex-direction: column;

	.splitter {
		margin: 1em 0;
	}

	.itemList {
		gap: 1px;
		display: flex;
		flex-direction: column;
		.rowItem {
			box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);
			background-color: var(--background-color-fadest);
			border-radius: 0.5em;
			padding: 0;
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			min-height: 1.5em;
			position: relative;
			transition: background-color 0.1s;
			cursor: pointer;

			&:hover {
				background-color: var(--background-color-fader);
			}
			.label {
				flex-grow: 1;
				gap: 0.5em;
				display: flex;
				flex-direction: row;
				align-items: center;
				color: var(--color-text);
				padding: 0;
				margin-left: 0.5em;
				.icon {
					height: 1.5em;
					width: 1.5em;
					padding: 0.25em;
					object-fit: fill;
					margin-right: 0.5em;
				}

				.username {
					padding-left: 0.5em;
				}

				.small {
					font-style: italic;
					font-size: 0.9em;
					margin-left: -0.5em;
				}
				.badgeList {
					gap: 0.5em;
					display: flex;
					flex-direction: row;
					.badge {
						padding: 0.25em;
						height: 2em;
					}
				}
			}
			.icon {
				height: 1em;
			}

			.heatScreen {
				pointer-events: none;
				flex-grow: 1;
			}
			.toggle,
			.deleteBt,
			.badgeList {
				padding: 0 0.5em;
				border-left: 1px solid var(--color-dark-light);
			}
			.deleteBt {
				display: flex;
				align-items: center;
			}
		}
		&.heat,
		&.badges,
		&.users {
			gap: 1em;
			width: 100%;
			flex-direction: row;
			flex-wrap: wrap;
			align-items: center;
			justify-content: center;
			.rowItem {
				max-width: 200px;
				flex-grow: 1;
				align-items: center;
			}
		}

		&.badges {
			.rowItem {
				max-width: fit-content;
			}
		}

		&.users {
			.rowItem {
				padding: 0.5em;
				max-width: fit-content;
			}
		}
	}

	.count {
		font-variant-numeric: tabular-nums;
	}
}
</style>
