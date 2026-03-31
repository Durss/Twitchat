<template>
	<div
		class="triggerlistitem"
		@click="selectMode !== false ? (selected = !selected) : null"
		:class="{
			deprecated: triggerTypeDef?.disabled === true,
			disabled: entryData.trigger.enabled === false,
		}"
		@mouseenter="over = true"
		@mouseleave="over = false"
		v-newflag="{
			date: entryData.trigger.created_at || 0,
			duration: 2 * 60000,
			id: 'trigger_' + entryData.trigger.id,
		}"
	>
		<button
			class="button"
			@click="$emit('select', entryData.trigger)"
			v-tooltip="{
				content: tooltipText,
				placement: 'auto',
				theme: triggerTypeDef?.disabled ? 'alert' : 'twitchat',
			}"
		>
			<img
				v-if="entryData.iconURL"
				:src="entryData.iconURL"
				class="icon"
				:style="{ backgroundColor: entryData.iconBgColor }"
			/>
			<Icon
				v-else-if="entryData.icon"
				:name="entryData.icon"
				class="icon"
				:style="{ backgroundColor: entryData.iconBgColor }"
			/>
			<div class="label">
				<span>{{ entryData.label }}</span>
				<slot></slot>
				<span
					class="triggerId"
					v-click2Select
					v-if="storeMain.devmode && over && selectMode === false"
					@click.stop=""
					>{{
				}}</span>
			</div>
		</button>

		<div class="toggle" v-if="noEdit === false || forceDisableOption !== false">
			<ToggleButton
				v-model="entryData.trigger.enabled"
				@change="$emit('changeState', $el)"
				:aria-label="entryData.trigger.enabled ? 'trigger enabled' : 'trigger disabled'"
			/>
		</div>

		<div class="toggle" v-if="noEdit !== false || selectMode !== false">
			<ToggleButton
				v-model="selected"
				:aria-label="entryData.trigger.enabled ? 'trigger selected' : 'trigger unselected'"
			/>
		</div>

		<TTButton
			v-if="noEdit === false && storeMain.devmode"
			v-tooltip="$t('global.copy')"
			class="copyIdBt"
			transparent
			icon="id"
			:copy="entryData.trigger.id"
		/>

		<button
			class="testBt"
			@click="$emit('testTrigger', entryData.trigger)"
			v-if="noEdit === false && toggleMode === false"
			:disabled="!entryData.canTest"
			v-tooltip="$t('triggers.testBt')"
		>
			<Icon name="test" class="icon" />
		</button>

		<button
			class="duplicateBt"
			@click="$emit('duplicate', entryData)"
			v-if="noEdit === false && toggleMode === false"
			v-tooltip="$t('global.duplicate')"
		>
			<Icon name="copy" class="icon" />
		</button>

		<button
			class="deleteBt"
			@click="$emit('delete', entryData)"
			v-if="noEdit === false && toggleMode === false"
			v-tooltip="$t('triggers.deleteBt')"
		>
			<Icon name="trash" class="icon" />
		</button>
	</div>
</template>

<script setup lang="ts">
import ToggleButton from "@/components/ToggleButton.vue";
import {
	TriggerSubTypeLabel,
	TriggerTypesDefinitionList,
	type TriggerTypeDefinition,
} from "@/types/TriggerActionDataTypes";
import type { TriggerListEntry } from "./TriggerList.vue";
import TriggerUtils from "@/utils/TriggerUtils";
import { ref, watch } from "vue";
import TTButton from "@/components/TTButton.vue";
import { useI18n } from "vue-i18n";
import { storeMain as useStoreMain } from "@/store/storeMain";
import { storeExporter as useStoreExporter } from "@/store/exporter/storeExporter";

const { t } = useI18n();
const storeMain = useStoreMain();
const storeExporter = useStoreExporter();

const props = withDefaults(
	defineProps<{
		entryData: TriggerListEntry;
		noEdit?: boolean;
		forceDisableOption?: boolean;
		selectMode?: boolean;
		toggleMode?: boolean;
	}>(),
	{
		noEdit: false,
		forceDisableOption: false,
		selectMode: false,
		toggleMode: false,
	},
);

defineEmits<{
	changeState: [el: HTMLElement];
	delete: [entry: TriggerListEntry];
	testTrigger: [entry: TriggerListEntry["trigger"]];
	select: [entry: TriggerListEntry["trigger"]];
	duplicate: [entry: TriggerListEntry];
}>();

const over = ref<boolean>(false);
const selected = ref<boolean>(false);
const tooltipText = ref<string>("");
const triggerTypeDef = ref<TriggerTypeDefinition | undefined>(undefined);

triggerTypeDef.value = TriggerTypesDefinitionList().find(
	(v) => v.value === props.entryData.trigger.type,
);
const info = TriggerUtils.getTriggerDisplayInfo(props.entryData.trigger);
const event = TriggerTypesDefinitionList().find((v) => v.value === props.entryData.trigger.type);
if (triggerTypeDef.value?.disabled === true && triggerTypeDef.value.disabledReasonLabelKey)
	tooltipText.value = t(triggerTypeDef.value.disabledReasonLabelKey, {
		SUB_ITEM_NAME: TriggerSubTypeLabel(props.entryData.trigger),
	});
else if (!event) tooltipText.value = "unknown category";
else
	tooltipText.value = t(info.descriptionKey || event?.descriptionKey || event?.labelKey, {
		SUB_ITEM_NAME: TriggerSubTypeLabel(props.entryData.trigger),
	});

selected.value = storeExporter.selectedTriggerIDs.includes(props.entryData.trigger.id);

watch(
	() => selected.value,
	(newVal) => {
		if (newVal) storeExporter.selectedTriggerIDs.push(props.entryData.trigger.id);
		else
			storeExporter.selectedTriggerIDs.splice(
				storeExporter.selectedTriggerIDs.indexOf(props.entryData.trigger.id),
				1,
			);
	},
);
</script>

<style scoped lang="less">
.triggerlistitem {
	box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);
	background-color: var(--background-color-fadest);
	border-radius: 0.5em;
	padding: 0;
	display: flex;
	flex-direction: row;
	min-height: 1.5em;
	position: relative;
	transition: background-color 0.1s;
	overflow: hidden;

	&:hover {
		background-color: var(--background-color-fader);
	}

	&.deprecated {
		background-color: var(--color-alert);
		&:hover {
			background-color: var(--color-alert-light);
		}
	}
	&.disabled {
		.button > .icon,
		.label {
			opacity: 0.5;
		}
	}
	.label {
		transition: opacity 0.1s;
		text-align: left;
	}
	.selectCb {
		margin: auto 0.25em;
	}

	.button {
		display: flex;
		flex-direction: row;
		gap: 0.25em;
		padding: 0 0.5em 0 0;
		align-items: center;
		flex-grow: 1;
		overflow: hidden;
		word-wrap: break-word;
		color: var(--color-text);
		.icon {
			height: 1.5em;
			width: 1.5em;
			padding: 0.25em;
			object-fit: fill;
			transition: opacity 0.1s;
		}
	}
	.toggle {
		display: flex;
		align-items: center;
		padding: 0 0.5em;
		border-left: 1px solid var(--color-dark-light);
	}
	.copyIdBt {
		padding: 0;
		width: 1.5em;
		flex-grow: 0;
		flex-shrink: 0;
	}
	.deleteBt,
	.testBt,
	.duplicateBt {
		color: var(--color-text);
		flex-shrink: 0;
		.icon {
			height: 0.9em;
			padding: 0 0.5em;
		}

		&:disabled,
		&[disabled] {
			pointer-events: none;
			.icon {
				opacity: 0.35;
			}
		}
	}
}
</style>
