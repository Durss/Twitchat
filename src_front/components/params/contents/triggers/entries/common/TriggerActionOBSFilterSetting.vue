<template>
	<div class="triggeractionobsfiltersetting card-item">
		<ParamItem noBackground :paramData="param_key" v-model="props.setting.key" />

		<ParamItem noBackground :paramData="param_type" v-model="props.setting.type" />

		<ParamItem
			v-if="props.setting.type == 'boolean'"
			noBackground
			:paramData="param_valueBool"
			v-model="boolValue"
		/>
		<ParamItem
			v-else
			noBackground
			:paramData="param_valueStr"
			v-model="props.setting.value"
			:placeholdersAsPopout="true"
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
	TriggerActionObsFilterSettingTypes,
	type ITriggerPlaceholder,
	type TriggerActionObsFilterSettingData,
	type TriggerActionObsFilterSettingType,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = defineProps<{
	setting: TriggerActionObsFilterSettingData;
	placeholderList: ITriggerPlaceholder<any>[];
}>();

const emit = defineEmits<{
	delete: [];
}>();

const param_key = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 100,
	icon: "key",
	labelKey: "triggers.actions.obs.param_filterSettings_key",
});

const param_type = ref<
	TwitchatDataTypes.ParameterData<
		TriggerActionObsFilterSettingType,
		TriggerActionObsFilterSettingType
	>
>({
	type: "list",
	value: "string",
	icon: "font",
	labelKey: "triggers.actions.obs.param_filterSettings_type",
	listValues: TriggerActionObsFilterSettingTypes.map((v) => ({
		value: v,
		labelKey: "triggers.actions.obs.param_filterSettings_type_" + v,
	})),
});

const param_valueStr = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 1000,
	icon: "edit",
	labelKey: "triggers.actions.obs.param_filterSettings_value",
});

const param_valueBool = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	icon: "edit",
	labelKey: "triggers.actions.obs.param_filterSettings_value",
});

/**
 * Values are always stored as strings so placeholders can be used on them.
 * Proxy the toggle's boolean to that string storage.
 */
const boolValue = computed<boolean>({
	get: () => props.setting.value === "true",
	set: (v) => {
		props.setting.value = v ? "true" : "false";
	},
});

onBeforeMount(() => {
	param_key.value.value = props.setting.key;
	param_type.value.value = props.setting.type;
	param_valueStr.value.value = props.setting.value;
	param_valueBool.value.value = boolValue.value;
});

//Only numeric placeholders make sense on a numeric setting
watch(
	[() => props.placeholderList, () => props.setting.type],
	() => {
		param_valueStr.value.placeholderList =
			props.setting.type == "number"
				? props.placeholderList.filter((v) => v.numberParsable === true)
				: props.placeholderList;
		param_valueStr.value.longText = props.setting.type == "json";
	},
	{ immediate: true },
);

//Normalize the stored value when switching type so no garbage is kept
watch(
	() => props.setting.type,
	(type) => {
		if (type == "boolean" && props.setting.value !== "true" && props.setting.value !== "false") {
			props.setting.value = "false";
		}
	},
);
</script>

<style scoped lang="less">
.triggeractionobsfiltersetting {
	gap: 0.25em;
	display: flex;
	flex-direction: column;

	.deleteBt {
		margin: auto;
	}
}
</style>
