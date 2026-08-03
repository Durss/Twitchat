<template>
	<div class="triggeractionpromptparam card-item">
		<ParamItem
			noBackground
			:paramData="param_label"
			v-model="props.param.label"
			:placeholdersAsPopout="true"
		/>

		<ParamItem noBackground :paramData="param_type" v-model="props.param.type" />

		<ParamItem
			noBackground
			:paramData="param_placeholder"
			v-model="props.param.placeholder"
			:error="placeholderError"
			:errorMessage="placeholderErrorMessage"
		/>

		<template v-if="props.param.type == 'number'">
			<ParamItem noBackground :paramData="param_min" v-model="param_min.value">
				<ParamItem
					noBackground
					:paramData="param_minValue"
					v-model="props.param.min"
					:childLevel="1"
				/>
			</ParamItem>
			<ParamItem noBackground :paramData="param_max" v-model="param_max.value">
				<ParamItem
					noBackground
					:paramData="param_maxValue"
					v-model="props.param.max"
					:childLevel="1"
				/>
			</ParamItem>
		</template>

		<ParamItem
			noBackground
			v-if="props.param.type == 'list'"
			:paramData="param_listValues"
			v-model="props.param.listValues"
			:placeholdersAsPopout="true"
			@change="dedupeListEntries"
		/>

		<TTButton class="deleteBt" icon="trash" alert small @click="emit('delete')">{{
			t("global.delete")
		}}</TTButton>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import {
	TriggerActionPromptParamTypes,
	type ITriggerPlaceholder,
	type TriggerActionPromptParamData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps<{
	param: TriggerActionPromptParamData;
	/**
	 * All the params of the action. Used to spot duplicate placeholders
	 */
	params: TriggerActionPromptParamData[];
	placeholderList: ITriggerPlaceholder<any>[];
}>();

const emit = defineEmits<{
	delete: [];
}>();

const param_label = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 100,
	icon: "label",
	labelKey: "triggers.actions.prompt.param_label",
	placeholderKey: "triggers.actions.prompt.param_label_placeholder",
});

const param_placeholder = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "placeholder",
	value: "",
	maxLength: 30,
	labelKey: "triggers.actions.prompt.param_placeholder",
});

const param_type = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "string",
	icon: "font",
	labelKey: "triggers.actions.prompt.param_type",
	listValues: TriggerActionPromptParamTypes.map((v) => ({
		value: v,
		labelKey: "triggers.actions.prompt.type_" + v,
	})),
});

const param_minValue = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	min: -Number.MAX_SAFE_INTEGER,
	max: Number.MAX_SAFE_INTEGER,
	labelKey: "triggers.actions.prompt.param_min_value",
});

const param_maxValue = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 100,
	min: -Number.MAX_SAFE_INTEGER,
	max: Number.MAX_SAFE_INTEGER,
	labelKey: "triggers.actions.prompt.param_max_value",
});

const param_min = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	type: "boolean",
	value: false,
	icon: "min",
	labelKey: "triggers.actions.prompt.param_min",
});

const param_max = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	type: "boolean",
	value: false,
	icon: "max",
	labelKey: "triggers.actions.prompt.param_max",
});

const param_listValues = ref<TwitchatDataTypes.ParameterData<string[], string>>({
	type: "editablelist",
	value: [],
	max: 100,
	maxLength: 100,
	icon: "list",
	labelKey: "triggers.actions.prompt.param_list_values",
	placeholderKey: "triggers.actions.prompt.param_list_values_placeholder",
});

const placeholderError = computed((): boolean => {
	const tag = props.param.placeholder.toUpperCase().trim();
	if (tag.length === 0) return true;
	return props.params.some(
		(v) => v !== props.param && v.placeholder.toUpperCase().trim() === tag,
	);
});

const placeholderErrorMessage = computed((): string => {
	if (props.param.placeholder.trim().length === 0)
		return t("triggers.actions.prompt.param_placeholder_empty");
	return t("triggers.actions.prompt.param_placeholder_duplicate");
});

function dedupeListEntries() {
	const values = param_listValues.value.value;
	const deduped = new Map<string, boolean>();
	const filtered: typeof param_listValues.value.value = [];
	values?.forEach((v) => {
		if (deduped.has(v)) return;
		deduped.set(v, true);
		filtered.push(v);
	});
	param_listValues.value.value = filtered;
}

onBeforeMount(() => {
	param_label.value.value = props.param.label;
	param_placeholder.value.value = props.param.placeholder;
	param_type.value.value = props.param.type;
	param_listValues.value.value = props.param.listValues || [];

	param_min.value.value = props.param.min != undefined;
	if (props.param.min != undefined) param_minValue.value.value = props.param.min;
	param_max.value.value = props.param.max != undefined;
	if (props.param.max != undefined) param_maxValue.value.value = props.param.max;
});

watch(
	() => [param_min.value.value, param_minValue.value.value],
	() => {
		props.param.min = param_min.value.value ? param_minValue.value.value : undefined;
	},
);

watch(
	() => [param_max.value.value, param_maxValue.value.value],
	() => {
		props.param.max = param_max.value.value ? param_maxValue.value.value : undefined;
	},
);

//Cleanup type specific options when switching type so no useless data is stored
watch(
	() => props.param.type,
	(type) => {
		if (type !== "number") {
			param_min.value.value = false;
			param_max.value.value = false;
		}
		if (type === "list" && !props.param.listValues) props.param.listValues = [];
	},
);

watch(
	() => props.placeholderList,
	(list) => {
		param_label.value.placeholderList = list;
		param_listValues.value.placeholderList = list;
	},
	{ immediate: true },
);
</script>

<style scoped lang="less">
.triggeractionpromptparam {
	gap: 0.25em;
	display: flex;
	flex-direction: column;

	.deleteBt {
		margin: auto;
	}
}
</style>

