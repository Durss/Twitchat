<template>
	<div class="triggeractiontriggertoggleentry triggerActionForm">
		<div class="field col" v-if="!action.triggerId">
			<div class="item title">
				{{ $t("triggers.actions.triggerToggle.select") }}
			</div>

			<SimpleTriggerList class="list" @select="onSelectTrigger" />
		</div>

		<template v-else>
			<div class="card-item field">
				<Icon name="broadcast" />
				<div class="item title">{{ $t("triggers.actions.triggerToggle.selected") }}</div>
				<SimpleTriggerList
					:filteredItemId="action.triggerId"
					@click="action.triggerId = ''"
					primary
				/>
				<button class="openTriggerBt" @click="openTrigger()"><Icon name="newtab" /></button>
			</div>

			<ParamItem :paramData="param_action" v-model="action.action" />
		</template>
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import { storeTriggers as useStoreTriggers } from "@/store/triggers/storeTriggers";
import type {
	TriggerActionTriggerToggleData,
	TriggerActionTriggerToggleDataAction,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref } from "vue";
import SimpleTriggerList from "../SimpleTriggerList.vue";

const props = defineProps<{
	action: TriggerActionTriggerToggleData;
	triggerData: TriggerData;
}>();

const storeTriggers = useStoreTriggers();

const param_action = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	labelKey: "triggers.actions.triggerToggle.action",
});

onBeforeMount(() => {
	const values: TwitchatDataTypes.ParameterDataListValue<TriggerActionTriggerToggleDataAction>[] =
		[];
	values.push({ value: "enable", labelKey: "triggers.actions.triggerToggle.action_enable" });
	values.push({
		value: "disable",
		labelKey: "triggers.actions.triggerToggle.action_disable",
	});
	values.push({ value: "toggle", labelKey: "triggers.actions.triggerToggle.action_toggle" });
	param_action.value.listValues = values;
});

function onSelectTrigger(triggerID: string): void {
	props.action.triggerId = triggerID;
}

function openTrigger(): void {
	const trigger = storeTriggers.triggerList.find((v) => v.id == props.action.triggerId);
	if (trigger) storeTriggers.openTriggerEdition(trigger);
}
</script>

<style scoped lang="less">
.triggeractiontriggertoggleentry {
	.field {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5em;
		&.col {
			flex-direction: column;
		}

		.icon {
			height: 1em;
			margin-top: -5px;
		}

		.list {
			flex-grow: 1;
			max-height: 300px;
			overflow-y: auto;
			width: 100%;
		}

		.openTriggerBt {
			height: 1em;
			transition: transform 0.2s;
			color: var(--color-text);
			&:hover {
				transform: scale(1.2);
			}
		}
	}
}
</style>
