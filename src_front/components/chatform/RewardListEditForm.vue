<template>
	<form class="rewardlisteditform" @submit.prevent="onSubmit">
		<img
			v-if="icon && props.triggerMode === false"
			:src="icon"
			class="rewardIcon"
			:style="{ backgroundColor: localValue.background_color }"
		/>
		<ParamItem :paramData="param_title" v-model="localValue.title"></ParamItem>
		<ParamItem :paramData="param_description" v-model="localValue.prompt"></ParamItem>
		<ParamItem :paramData="param_cost" v-model="localValue.cost"></ParamItem>
		<ParamItem
			:paramData="param_prompt"
			v-model="localValue.is_user_input_required"
		></ParamItem>
		<ParamItem :paramData="param_paused" v-model="localValue.is_paused"></ParamItem>
		<ParamItem :paramData="param_enabled" v-model="localValue.is_enabled"></ParamItem>
		<ParamItem :paramData="param_color" v-model="localValue.background_color"></ParamItem>
		<ParamItem
			:paramData="param_skipQueue"
			v-model="localValue.should_redemptions_skip_request_queue"
		></ParamItem>
		<ParamItem :paramData="param_cooldown" v-model="limitsEnabled" @change="onChange()">
			<ParamItem
				:paramData="param_coolDown_duration"
				v-model="localValue.global_cooldown_seconds"
				noBackground
				class="child"
			></ParamItem>
			<ParamItem
				:paramData="param_coolDown_maxPerStream"
				v-model="localValue.max_per_stream"
				noBackground
				class="child"
			></ParamItem>
			<ParamItem
				:paramData="param_coolDown_maxPerUser"
				v-model="localValue.max_per_user_per_stream"
				noBackground
				class="child"
			></ParamItem>
		</ParamItem>
		<div class="cta" v-if="props.triggerMode === false">
			<TTButton
				type="submit"
				primary
				:loading="saving"
				v-if="!props.modelValue && !props.reward"
				icon="add"
				>{{ t("global.create") }}</TTButton
			>
			<TTButton type="submit" primary :loading="saving" v-else icon="save">{{
				t("global.save")
			}}</TTButton>
			<div class="card-item alert" v-if="error">{{ error }}</div>
		</div>
	</form>
</template>

<script setup lang="ts">
import type { ITriggerPlaceholder } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { computed, onBeforeMount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../TTButton.vue";
import ParamItem from "../params/ParamItem.vue";

const props = withDefaults(
	defineProps<{
		reward?: TwitchDataTypes.Reward;
		modelValue?: TwitchDataTypes.RewardEdition;
		triggerMode?: boolean;
		placeholderList?: ITriggerPlaceholder<any>[];
	}>(),
	{
		triggerMode: false,
		placeholderList: () => [],
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: TwitchDataTypes.RewardEdition];
	complete: [];
}>();

const { t } = useI18n();

const error = ref("");
const saving = ref(false);
const localValue = ref<TwitchDataTypes.RewardEdition>({
	title: "",
	prompt: "",
	cost: 100,
	background_color: "#cc0000",
	is_enabled: true,
	max_per_stream: 0,
	max_per_user_per_stream: 0,
	global_cooldown_seconds: 0,
	is_global_cooldown_enabled: false,
	is_max_per_stream_enabled: false,
	is_max_per_user_per_stream_enabled: false,
	is_paused: false,
	is_user_input_required: false,
	should_redemptions_skip_request_queue: false,
});

const param_title = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 45,
	labelKey: "rewards.manage.param_title",
});
const param_description = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	longText: true,
	maxLength: 200,
	labelKey: "rewards.manage.param_description",
});
const param_prompt = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "rewards.manage.param_prompt",
	icon: "font",
});
const param_cost = ref<TwitchatDataTypes.ParameterData<number | string>>({
	type: "number",
	value: 0,
	min: 1,
	max: 1000000000,
	labelKey: "rewards.manage.param_cost",
	icon: "channelPoints",
});
const param_paused = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "rewards.manage.param_paused",
	icon: "pause",
});
const param_enabled = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "rewards.manage.param_enabled",
	icon: "disable",
});
const param_color = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "color",
	value: "",
	labelKey: "rewards.manage.param_color",
	icon: "pipette",
});
const param_skipQueue = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "rewards.manage.param_skipQueue",
	icon: "skip",
});
const param_cooldown = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "rewards.manage.param_cooldown",
	icon: "timeout",
});
const param_coolDown_duration = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "duration",
	value: 0,
	labelKey: "rewards.manage.param_coolDown_duration",
	icon: "timer",
});
const param_coolDown_maxPerStream = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	min: 0,
	max: 1000000000,
	labelKey: "rewards.manage.param_coolDown_maxPerStream",
	icon: "user",
});
const param_coolDown_maxPerUser = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "number",
	value: 0,
	min: 0,
	max: 1000000000,
	labelKey: "rewards.manage.param_coolDown_maxPerUser",
	icon: "user",
});
const limitsEnabled = ref(false);

const icon = computed(() => {
	if (!props.reward) return "";
	if (props.reward.image?.url_4x) return props.reward.image.url_4x;
	return props.reward.default_image.url_4x;
});

onBeforeMount(() => {
	if (props.modelValue) {
		localValue.value = props.modelValue;
	}
	if (!props.modelValue || !props.modelValue.title) importRewardData();

	limitsEnabled.value =
		localValue.value.is_global_cooldown_enabled === true ||
		localValue.value.is_max_per_stream_enabled === true ||
		localValue.value.is_max_per_user_per_stream_enabled === true;

	if (props.placeholderList.length > 0) {
		param_title.value.placeholderList = props.placeholderList;
		param_description.value.placeholderList = props.placeholderList;
		param_cost.value.placeholderList = props.placeholderList.filter((v) => v.numberParsable);
	}
	if (props.triggerMode !== false) {
		param_cost.value.type = "string";
	}
});

onMounted(() => {
	watch(
		() => localValue.value,
		() => onChange(),
		{ deep: true },
	);
	watch(
		() => props.modelValue,
		() => {
			localValue.value = props.modelValue!;
		},
	);
	watch(
		() => props.reward,
		() => {
			importRewardData();
		},
	);
});

function onChange(): void {
	localValue.value.is_global_cooldown_enabled =
		limitsEnabled.value && (localValue.value.global_cooldown_seconds ?? 0) > 0;
	localValue.value.is_max_per_stream_enabled =
		limitsEnabled.value && (localValue.value.max_per_stream ?? 0) > 0;
	localValue.value.is_max_per_user_per_stream_enabled =
		limitsEnabled.value && (localValue.value.max_per_user_per_stream ?? 0) > 0;
	emit("update:modelValue", localValue.value);

	// let changeDebounce:number = -1;
	// if(props.triggerMode === false && props.reward) {
	// 	clearTimeout(changeDebounce);
	// 	changeDebounce = window.setTimeout(async ()=> {
	// 		if(props.reward) {
	// 			await TwitchUtils.updateReward(props.reward.id, localValue.value);
	// 		}
	// 	}, 500);
	// }
}

async function onSubmit(): Promise<void> {
	if (saving.value || props.triggerMode) return;

	saving.value = true;
	if (props.reward) {
		//If editing a reward
		const res = await TwitchUtils.updateReward(props.reward.id, localValue.value);
		if (res === false) {
			error.value = t("error.rewards.create_unknown");
		} else {
			emit("complete");
		}
	} else {
		//If creating a new reward
		const res = await TwitchUtils.createReward(localValue.value);
		if (typeof res == "string") {
			error.value = res;
		} else if (res === false) {
			error.value = t("error.rewards.edit_unknown");
		} else {
			emit("complete");
		}
	}
	saving.value = false;
}

function importRewardData(): void {
	if (!props.reward) return;

	localValue.value.title = props.reward.title;
	localValue.value.prompt = props.reward.prompt;
	localValue.value.cost = props.reward.cost;
	localValue.value.background_color = props.reward.background_color;
	localValue.value.is_enabled = props.reward.is_enabled;
	localValue.value.is_paused = props.reward.is_paused;
	localValue.value.is_max_per_user_per_stream_enabled =
		props.reward.max_per_user_per_stream_setting.is_enabled;
	localValue.value.max_per_user_per_stream =
		props.reward.max_per_user_per_stream_setting.max_per_user_per_stream;
	localValue.value.is_global_cooldown_enabled = props.reward.global_cooldown_setting.is_enabled;
	localValue.value.global_cooldown_seconds =
		props.reward.global_cooldown_setting.global_cooldown_seconds;
	localValue.value.is_max_per_stream_enabled = props.reward.max_per_stream_setting.is_enabled;
	localValue.value.max_per_stream = props.reward.max_per_stream_setting.max_per_stream;
	localValue.value.is_user_input_required = props.reward.is_user_input_required;
	localValue.value.should_redemptions_skip_request_queue =
		props.reward.should_redemptions_skip_request_queue;
}
</script>

<style scoped lang="less">
.rewardlisteditform {
	gap: 0.5em;
	display: flex;
	flex-direction: column;
	.rewardIcon {
		height: 4em;
		margin: auto;
		display: block;
		border-radius: var(--border-radius);
	}
	.cta {
		align-self: stretch;
		position: sticky;
		bottom: 0;
		padding: 0.5em 0;
		padding-top: 2em;
		margin-top: -1em;
		text-align: center;
		background: linear-gradient(
			0,
			var(--color-text-inverse) 20%,
			var(--color-text-inverse-fadest) 100%
		);
	}
}
</style>
