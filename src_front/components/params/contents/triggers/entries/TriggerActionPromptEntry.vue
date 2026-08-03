<template>
	<div class="triggeractionpromptentry triggerActionForm">
		<div class="card-item info">
			<Icon name="info" alt="info" />
			<span>{{ t("triggers.actions.prompt.info") }}</span>
		</div>

		<ParamItem :paramData="param_title" v-model="action.promptData.title" />
		<ParamItem :paramData="param_description" v-model="action.promptData.description" />
		<ParamItem :paramData="param_timeout" v-model="param_timeout.value">
			<ParamItem
				noBackground
				:paramData="param_timeoutValue"
				v-model="action.promptData.timeout_s"
				:childLevel="1"
			/>
		</ParamItem>
		<ParamItem :paramData="param_stopOnCancel" v-model="action.promptData.stopOnCancel" />

		<Splitter>{{ t("triggers.actions.prompt.params") }}</Splitter>

		<div class="paramList">
			<TriggerActionPromptParam
				v-for="(param, index) in action.promptData.params"
				:key="param.id"
				:param="param"
				:params="action.promptData.params"
				:placeholderList="placeholderList"
				@delete="deleteParam(index)"
			/>

			<TTButton
				icon="add"
				@click="addParam()"
				v-if="action.promptData.params.length < maxParams"
				>{{ t("triggers.actions.prompt.add_param_bt") }}</TTButton
			>
		</div>

		<i18n-t
			scope="global"
			class="card-item info"
			tag="div"
			keypath="triggers.actions.common.custom_placeholder_example"
			v-if="outputPlaceholders.length > 0"
		>
			<template #PLACEHOLDER>
				<template v-for="(tag, index) in outputPlaceholders" :key="tag">
					<mark v-click2Select>{{ "{" + tag + "}" }}</mark>
					<template v-if="index < outputPlaceholders.length - 1">{{
						t("global.or")
					}}</template>
				</template>
			</template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import TTButton from "@/components/TTButton.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import {
	TRIGGER_ACTION_PROMPT_MAX_PARAMS,
	type ITriggerPlaceholder,
	type TriggerActionPromptData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { computed, onBeforeMount, ref, watch } from "vue";
import TriggerActionPromptParam from "./common/TriggerActionPromptParam.vue";
import { useI18n } from "vue-i18n";
import Splitter from "@/components/Splitter.vue";

const { t } = useI18n();
const props = defineProps<{
	action: TriggerActionPromptData;
	triggerData: TriggerData;
}>();

const maxParams = TRIGGER_ACTION_PROMPT_MAX_PARAMS;

const param_title = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 100,
	icon: "font",
	labelKey: "triggers.actions.prompt.param_title",
});

const param_description = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 500,
	longText: true,
	icon: "info",
	labelKey: "triggers.actions.prompt.param_description",
});

const param_timeoutValue = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 60,
	min: 1,
	max: 60 * 60 * 24,
	labelKey: "triggers.actions.prompt.param_timeout_value",
});

const param_timeout = ref<TwitchatDataTypes.ParameterData<boolean, any, any>>({
	type: "boolean",
	value: false,
	icon: "timer",
	labelKey: "triggers.actions.prompt.param_timeout",
	tooltipKey: "triggers.actions.prompt.param_timeout_tt",
});

const param_stopOnCancel = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	icon: "stop",
	labelKey: "triggers.actions.prompt.param_stop_on_cancel",
	tooltipKey: "triggers.actions.prompt.param_stop_on_cancel_tt",
});

const { placeholderList } = useTriggerActionPlaceholders(
	props.action,
	props.triggerData,
	(list: ITriggerPlaceholder<any>[]) => {
		param_title.value.placeholderList = list;
		param_description.value.placeholderList = list;
	},
);

const outputPlaceholders = computed((): string[] => {
	return props.action.promptData.params
		.map((v) => v.placeholder.toUpperCase().trim())
		.filter((v) => v.length > 0);
});

onBeforeMount(() => {
	if (!props.action.promptData) {
		props.action.promptData = {
			title: "",
			description: "",
			stopOnCancel: true,
			params: [],
		};
	}
	if (!props.action.promptData.params) props.action.promptData.params = [];
	if (props.action.promptData.params.length === 0) addParam();

	param_title.value.value = props.action.promptData.title;
	param_description.value.value = props.action.promptData.description;
	param_stopOnCancel.value.value = props.action.promptData.stopOnCancel !== false;

	const timeout = props.action.promptData.timeout_s;
	param_timeout.value.value = (timeout || 0) > 0;
	if (timeout) param_timeoutValue.value.value = timeout;
});

watch(
	() => [param_timeout.value.value, param_timeoutValue.value.value],
	() => {
		props.action.promptData.timeout_s = param_timeout.value.value
			? param_timeoutValue.value.value
			: undefined;
	},
);

function addParam(): void {
	if (props.action.promptData.params.length >= maxParams) return;
	props.action.promptData.params.push({
		id: Utils.getUUID(),
		label: "",
		placeholder: "",
		type: "string",
		listValues: [],
	});
}

function deleteParam(index: number): void {
	props.action.promptData.params.splice(index, 1);
}
</script>

<style scoped lang="less">
.triggeractionpromptentry {
	gap: 0.5em;
	display: flex;
	flex-direction: column;

	.paramList {
		gap: 0.5em;
		display: flex;
		flex-direction: column;

		& > .button {
			align-self: center;
		}
	}
}
</style>

