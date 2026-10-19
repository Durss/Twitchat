<template>
	<div class="triggeractioncountentry triggerActionForm">
		<div class="card-item list">
			<label class="listLabel">
				<Icon name="count" class="icon" />
				<span>{{ t(param_counters.labelKey as string) }}</span>
			</label>
			<vue-select
				class="itemSelector"
				label="label"
				:placeholder="t('triggers.actions.count.select_placeholder')"
				v-model="props.action.counters"
				:options="param_counters.listValues"
				:calculate-position="placeDropdown"
				:reduce="(v: TwitchatDataTypes.ParameterDataListValue<string>) => v.value"
				:selectable="
					(v: TwitchatDataTypes.ParameterDataListValue<string>) =>
						props.action.counters.indexOf(v.value) == -1
				"
				appendToBody
				multiple
			></vue-select>
		</div>

		<div class="card-item counterList" v-if="showPerUserParams">
			<div class="head">
				<Icon name="user" class="icon" />
				<span>{{
					t("triggers.actions.count.user_source_title", selectedPerUserCounters.length)
				}}</span>
			</div>
			<div class="card-item dark" v-for="item in selectedPerUserCounters" :key="item.id">
				<label :for="'select_' + item.id" class="name">{{ item.name }}</label>
				<select
					:id="'select_' + item.id"
					v-model="props.action.counterUserSources[item.id]"
				>
					<option v-for="opt in userSourceOptions" :value="opt.key">
						{{ t(opt.labelKey, { PLACEHOLDER: opt.key.toUpperCase() }) }}
					</option>
				</select>
			</div>
		</div>

		<div class="card-item counterList" v-if="showPerUserParams">
			<div class="head">
				<Icon name="user" class="icon" />
				<span>{{
					t("triggers.actions.count.user_action_title", selectedPerUserCounters.length)
				}}</span>
			</div>

			<div class="card-item dark" v-for="item in selectedPerUserCounters" :key="item.id">
				<label :for="'select_' + item.id" class="name">{{ item.name }}</label>
				<select :id="'select_' + item.id" v-model="props.action.userAction![item.id]">
					<option v-for="opt in param_userAction.listValues" :value="opt.value">
						{{ t(opt.labelKey!) }}
					</option>
				</select>
			</div>
		</div>

		<template v-if="showAction">
			<ParamItem :paramData="param_action" v-model="props.action.action" />
			<template v-if="props.action.action == 'EDIT' && props.action.editParams">
				<div
					class="card-item secondary editWarning"
					v-if="props.action.counters.length > 1"
				>
					<Icon name="alert" />
					<span>{{ t("triggers.actions.count.edit_multiple") }}</span>
				</div>
				<ParamItem :paramData="param_editName" v-model="props.action.editParams.updateName">
					<ParamItem
						:paramData="param_editNameValue"
						v-model="props.action.editParams.name"
						noBackground
						class="child"
					/>
				</ParamItem>
				<ParamItem
					:paramData="param_editMin"
					v-model="props.action.editParams.updateMin"
					v-if="showEditMin"
				>
					<ParamItem
						:paramData="param_editMinValue"
						v-model="props.action.editParams.min"
						noBackground
						class="child"
					/>
				</ParamItem>
				<ParamItem
					:paramData="param_editMax"
					v-model="props.action.editParams.updateMax"
					v-if="showEditMax"
				>
					<ParamItem
						:paramData="param_editMaxValue"
						v-model="props.action.editParams.max"
						noBackground
						class="child"
					/>
				</ParamItem>
			</template>
			<ParamItem :paramData="param_value" v-model="props.action.addValue" v-else />
		</template>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import { usePlaceDropdown } from "@/composables/usePlaceDropDown";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import {
	COUNTER_EDIT_SOURCE_CHATTERS,
	COUNTER_EDIT_SOURCE_EVERYONE,
	COUNTER_EDIT_SOURCE_SENDER,
	COUNTER_VALUE_PLACEHOLDER_PREFIX,
	TriggerActionCountDataActionList,
	type ITriggerPlaceholder,
	type TriggerActionCounterData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	action: TriggerActionCounterData;
	triggerData: TriggerData;
}>();

const { t } = useI18n();
const { place: placeDropdown } = usePlaceDropdown();
const storeCounters = useStoreCounters();

const userPLaceholders = ref<ITriggerPlaceholder<any>[]>([]);

const param_counters = ref<TwitchatDataTypes.ParameterData<string[], string>>({
	type: "list",
	labelKey: "triggers.actions.count.select_label",
	value: [],
	listValues: [],
});
const param_value = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	labelKey: "triggers.actions.count.value_label",
	value: "",
	maxLength: 100,
	icon: "add",
});
const param_action = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "list",
	labelKey: "triggers.actions.count.select_action",
	value: "",
	listValues: [],
});
const param_userAction = ref<
	TwitchatDataTypes.ParameterData<
		NonNullable<TriggerActionCounterData["userAction"]>[string],
		NonNullable<TriggerActionCounterData["userAction"]>[string]
	>
>({ type: "list", labelKey: "triggers.actions.count.param_action", value: "update" });
const param_editName = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "triggers.actions.count.edit_name",
	value: false,
	icon: "label",
});
const param_editNameValue = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	labelKey: "triggers.actions.count.edit_name_value",
	value: "",
	maxLength: 100,
});
const param_editMin = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "triggers.actions.count.edit_min",
	value: false,
	icon: "min",
});
const param_editMinValue = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	labelKey: "triggers.actions.count.edit_min_value",
	value: "",
	maxLength: 100,
});
const param_editMax = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "triggers.actions.count.edit_max",
	value: false,
	icon: "max",
});
const param_editMaxValue = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	labelKey: "triggers.actions.count.edit_max_value",
	value: "",
	maxLength: 100,
});

/**
 * Get counter data of any per-user counter added to the selection
 */
const selectedPerUserCounters = computed((): TwitchatDataTypes.CounterData[] => {
	return storeCounters.counterList.filter(
		(v) => v.perUser === true && props.action.counters.findIndex((v2) => v2 === v.id) > -1,
	);
});

/**
 * Build user trigger source list
 */
const userSourceOptions = computed((): { key: string; labelKey: string }[] => {
	const res: { key: string; labelKey: string }[] = [
		//Add static sources "sender" and "everyone"
		{
			labelKey: "triggers.actions.count.user_source_sender",
			key: COUNTER_EDIT_SOURCE_SENDER,
		},
		{
			labelKey: "triggers.actions.count.user_source_everyone",
			key: COUNTER_EDIT_SOURCE_EVERYONE,
		},
		{
			labelKey: "triggers.actions.count.user_source_chatters",
			key: COUNTER_EDIT_SOURCE_CHATTERS,
		},
	];

	//Add command's placeholders
	if (props.triggerData.chatCommandParams) {
		props.triggerData.chatCommandParams.forEach((v) => {
			res.push({
				labelKey: "triggers.actions.count.user_source_placeholder",
				key: v.tag,
			});
		});
	}

	//Add global placeholders that may contain a user name
	userPLaceholders.value
		.filter((v) => v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX) == -1)
		.forEach((v) => {
			res.push({
				labelKey: "triggers.actions.count.user_source_placeholder",
				key: v.tag,
			});
		});
	return res;
});

/**
 * Per-user sources and actions are irrelevant when editing counters params
 */
const showPerUserParams = computed((): boolean => {
	return (
		props.action.action != "EDIT" &&
		selectedPerUserCounters.value.length > 0 &&
		userSourceOptions.value.length > 1
	);
});

/**
 * Only allow editing min value if a selected counter has one.
 * Also shown if already enabled so it can be disabled back
 */
const showEditMin = computed((): boolean => {
	if (props.action.editParams?.updateMin) return true;
	return storeCounters.counterList.some(
		(v) => v.min !== false && props.action.counters.includes(v.id),
	);
});

/**
 * Only allow editing max value if a selected counter has one.
 * Also shown if already enabled so it can be disabled back
 */
const showEditMax = computed((): boolean => {
	if (props.action.editParams?.updateMax) return true;
	return storeCounters.counterList.some(
		(v) => v.max !== false && props.action.counters.includes(v.id),
	);
});

/**
 * Define if global actions should be displayed.
 * If only per-user delete actions are selected, we should not display the global action
 */
const showAction = computed((): boolean => {
	if (props.action.counters.length === 0) return true;
	if (props.action.action == "EDIT") return true;
	let deleteBatchActions = 0;
	for (const cid of props.action.counters) {
		if (props.action.userAction && props.action.userAction[cid] === "delete")
			deleteBatchActions++;
	}

	return deleteBatchActions < props.action.counters.length;
});

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

onBeforeMount(() => {
	param_userAction.value.listValues = [
		{ value: "update", labelKey: "triggers.actions.count.action_update" },
		{ value: "delete", labelKey: "triggers.actions.count.action_delete" },
	];

	//If trigger is related to a counter event (looped, maxed, mined) remove it
	//from the editable counter to avoid infinite loop
	const counters: TwitchatDataTypes.ParameterDataListValue<string>[] = storeCounters.counterList
		.map((v) => {
			return { value: v.id, label: `${v.name} {${v.placeholderKey}}` };
		})
		.filter((v) => {
			return v.value != props.triggerData.counterId;
		});

	//Init counter's action if necessary
	if (!props.action.action) props.action.action = "ADD";
	//Init counter's list if necessary
	if (!props.action.counters) props.action.counters = [];
	if (!props.action.addValue) props.action.addValue = "";

	//Check if selected counter still exists
	for (let i = 0; i < props.action.counters.length; i++) {
		const cid = props.action.counters[i];
		if (counters.findIndex((v) => v.value == cid) === -1) {
			//Counter not found, user probably remove it
			props.action.counters.splice(i, 1);
			i--;
		}
	}

	param_counters.value.listValues = counters;

	//Populate action list from types definition
	let actionList: TwitchatDataTypes.ParameterDataListValue<string>[] = [];
	for (const value of TriggerActionCountDataActionList) {
		actionList.push({
			value,
			labelKey: "triggers.actions.count.action_" + value.toLowerCase(),
		});
	}
	param_action.value.listValues = actionList;
	updatePerUserCounterSources();
});

/**
 * Initialize the "counterUserSources" data property if not
 * existing yet and set "SENDER" default value
 */
function updatePerUserCounterSources(): void {
	//Init per-user counter sources if necessary
	for (const c of selectedPerUserCounters.value) {
		if (!props.action.counterUserSources) {
			props.action.counterUserSources = {};
		}
		if (!props.action.userAction) {
			props.action.userAction = {};
		}
		if (!props.action.counterUserSources[c.id]) {
			props.action.counterUserSources[c.id] = COUNTER_EDIT_SOURCE_SENDER;
		}
		if (!props.action.userAction[c.id]) {
			props.action.userAction[c.id] = "update";
		}
	}
}

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	userPLaceholders.value = list;
	const numberPlaceholders = list.filter((v) => v.numberParsable == true);
	param_value.value.placeholderList = numberPlaceholders;
	param_editMinValue.value.placeholderList = numberPlaceholders;
	param_editMaxValue.value.placeholderList = numberPlaceholders;
	param_editNameValue.value.placeholderList = list;
}

watch(
	() => props.action.action,
	() => {
		if (props.action.action == "EDIT" && !props.action.editParams) {
			props.action.editParams = {
				updateName: true,
				name: "",
				updateMin: false,
				min: "",
				updateMax: false,
				max: "",
			};
		}
	},
	{ immediate: true },
);

watch(
	() => selectedPerUserCounters.value,
	() => updatePerUserCounterSources(),
);
</script>

<style scoped lang="less">
.triggeractioncountentry {
	.itemSelector {
		flex-grow: 1;
		flex-basis: 300px;
	}

	.list {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		.itemSelector {
			margin-left: 1.5em;
		}

		.icon {
			width: 1em;
			height: 1em;
			object-fit: fill;
			margin-right: 0.5em;
		}
	}

	.editWarning {
		font-size: 0.9em;
		.icon {
			height: 1em;
			margin-right: 0.25em;
		}
	}

	.counterList {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		.head {
			margin-bottom: 0.25em;
			.icon {
				height: 1em;
				margin-right: 0.5em;
			}
		}
		.card-item {
			display: flex;
			flex-direction: row;
			align-items: center;
			flex-wrap: wrap;
			box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.25);
			.name {
				font-weight: bold;
				flex-grow: 1;
			}
			select {
				width: 100%; //Allows proper auto size
				flex-grow: 1;
				max-width: 300px;
				flex-basis: 300px;
			}
		}
	}
}
</style>
