<template>
	<div class="triggeractionlabelentry triggerActionForm">
		<div class="info">
			<Icon name="info" />
			<i18n-t scope="global" tag="span" keypath="triggers.actions.label.info">
				<template #LABELS>
					<a @click.stop="openLabels()">{{ t("triggers.actions.label.info_labels") }}</a>
				</template>
			</i18n-t>
		</div>

		<div class="card-item alert" v-if="param_label.listValues!.length <= 1">
			{{ t("triggers.actions.label.no_label") }}
		</div>

		<template v-else>
			<ParamItem
				:paramData="param_label"
				v-model="props.action.labelData.labelId"
				:error="!!props.action.labelData.labelId && !labelExists"
			/>
			<ParamItem :paramData="param_content" v-model="props.action.labelData.content" />
		</template>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeLabels as useStoreLabels } from "@/store/labels/storeLabels";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import {
	type ITriggerPlaceholder,
	type TriggerActionLabelData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	action: TriggerActionLabelData;
	triggerData: TriggerData;
}>();

const { t } = useI18n();
const storeLabels = useStoreLabels();
const storeParams = useStoreParams();

const param_label = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	labelKey: "triggers.actions.label.select_label",
	value: "",
	listValues: [],
	icon: "label",
});
const param_content = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	labelKey: "triggers.actions.label.content_label",
	value: "",
	longText: true,
	maxLength: 10000,
	icon: "html",
});

/**
 * Check if the selected label still exists and is controllable
 */
const labelExists = computed((): boolean => {
	return param_label.value.listValues!.some((v) => v.value == props.action.labelData.labelId);
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	param_content.value.placeholderList = list;
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

onBeforeMount(() => {
	//Init label data if necessary
	if (!props.action.labelData) {
		props.action.labelData = { labelId: "", content: "" };
	}

	//Build the list of controllable labels. Only labels bound to the
	//"TRIGGER" placeholder or set in "html" mode can be controlled, so no
	//automatic update overrides the content afterwards.
	const labels: TwitchatDataTypes.ParameterDataListValue<string>[] = storeLabels.labelList
		.filter((v) => v.mode == "html" || (v.mode == "placeholder" && v.placeholder == "TRIGGER"))
		.map((v) => {
			return {
				value: v.id,
				label: v.title || t("overlay.labels.default_title"),
			};
		});
	labels.unshift({ value: "", label: t("global.select_placeholder") });
	param_label.value.listValues = labels;

	//Reset selection if the previously selected label no longer exists
	//or is no longer controllable
	if (labels.findIndex((v) => v.value == props.action.labelData.labelId) === -1) {
		props.action.labelData.labelId = "";
	}
});

/**
 * Opens the labels overlay parameters
 */
function openLabels(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "label");
}
</script>

<style scoped lang="less">
.triggeractionlabelentry {
	.info {
		font-size: 0.9em;
		line-height: 1.3em;
		.icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}
		a {
			cursor: pointer;
		}
	}
}
</style>
