<template>
	<div class="triggeractionjsonextract triggerActionForm">
		<ParamItem
			class="sourceField"
			:paramData="param_sourcePlaceholder"
			v-model="props.action.jsonExtractData.sourcePlaceholder"
		/>

		<TriggerActionHttpPlaceholder
			:placeholderList="props.action.jsonExtractData.outputPlaceholderList!"
		/>

		<ParamItem :paramData="param_stopOnError" v-model="props.action.stopOnError" />
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import type {
	ITriggerPlaceholder,
	TriggerActionJSONExtractData,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import { onBeforeMount, ref } from "vue";
import TriggerActionHttpPlaceholder from "./common/TriggerActionHttpPlaceholder.vue";

const props = defineProps<{
	action: TriggerActionJSONExtractData;
	triggerData: TriggerData;
}>();

const param_sourcePlaceholder = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	listValues: [],
	searchable: true,
	labelKey: "triggers.actions.json_extract.source_placeholder",
});
const param_stopOnError = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "stop",
	labelKey: "triggers.actions.json_extract.stop_on_error",
	tooltipKey: "triggers.actions.json_extract.stop_on_error_tt",
});

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

onBeforeMount(() => {
	if (!props.action.jsonExtractData) {
		props.action.jsonExtractData = {
			sourcePlaceholder: "",
			outputPlaceholderList: [],
		};
	}
	if (!props.action.jsonExtractData.outputPlaceholderList)
		props.action.jsonExtractData.outputPlaceholderList = [];
	if (props.action.stopOnError === undefined) props.action.stopOnError = true;
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	// Update the dropdown list with available placeholders
	param_sourcePlaceholder.value.listValues = TriggerUtils.getPlaceholderGroupedListValues(list);
}
</script>

<style scoped lang="less">
.triggeractionjsonextract {
	gap: 0.5em;
	display: flex;
	flex-direction: column;
	.sourceField {
		:deep(.holder) {
			flex-direction: column;
			.listField {
				flex-basis: auto;
			}
		}
	}
}
</style>
