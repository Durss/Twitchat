<template>
	<div class="triggeractionvalueentry triggerActionForm">
		<div class="card-item list">
			<label class="listLabel">
				<Icon name="placeholder" />
				<span>{{ t(param_values.labelKey as string) }}</span>
			</label>
			<vue-select
				class="itemSelector"
				label="label"
				:placeholder="t('triggers.actions.value.select_placeholder')"
				v-model="props.action.values"
				:options="param_values.listValues"
				:calculate-position="placeDropdown"
				:reduce="(v: TwitchatDataTypes.ParameterDataListValue<string>) => v.value"
				:selectable="
					(v: TwitchatDataTypes.ParameterDataListValue<string>) =>
						props.action.values.indexOf(v.value) == -1
				"
				appendToBody
				multiple
			></vue-select>
		</div>

		<div
			class="card-item valueList"
			v-if="selectedPerUserValue.length > 0 && userSourceOptions.length > 1"
		>
			<div class="head">
				<Icon name="user" class="icon" />
				<span>{{
					t("triggers.actions.value.user_source_title", selectedPerUserValue.length)
				}}</span>
			</div>

			<div class="card-item dark" v-for="item in selectedPerUserValue" :key="item.id">
				<label :for="'select_' + item.id" class="name">{{ item.name }}</label>
				<SearchableSelect
					:inputId="'select_' + item.id"
					:options="userSourceOptions"
					v-model="props.action.valueUserSources[item.id]"
				/>
			</div>
		</div>

		<div
			class="card-item valueList"
			v-if="selectedPerUserValue.length > 0 && userSourceOptions.length > 1"
		>
			<div class="head">
				<Icon name="user" class="icon" />
				<span>{{
					t("triggers.actions.value.user_action_title", selectedPerUserValue.length)
				}}</span>
			</div>

			<div class="card-item dark" v-for="item in selectedPerUserValue" :key="item.id">
				<label :for="'select_' + item.id" class="name">{{ item.name }}</label>
				<select :id="'select_' + item.id" v-model="props.action.userAction![item.id]">
					<option v-for="opt in param_userAction.listValues" :value="opt.value">
						{{ t(opt.labelKey!) }}
					</option>
				</select>
			</div>
		</div>

		<ParamItem
			v-if="showAction"
			:paramData="param_value"
			v-model="props.action.newValue"
			key="value"
			forceChildDisplay
		>
			<ParamItem
				:childLevel="1"
				:paramData="param_maths"
				v-model="props.action.interpretMaths"
				key="maths"
				noBackground
			/>
		</ParamItem>
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import ParamItem from "@/components/params/ParamItem.vue";
import SearchableSelect from "@/components/params/SearchableSelect.vue";
import { usePlaceDropdown } from "@/composables/usePlaceDropDown";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import {
	VALUE_EDIT_SOURCE_CHATTERS,
	VALUE_EDIT_SOURCE_EVERYONE,
	VALUE_EDIT_SOURCE_SENDER,
	VALUE_PLACEHOLDER_PREFIX,
	type ITriggerPlaceholder,
	type TriggerActionValueData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import { computed, onBeforeMount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	action: TriggerActionValueData;
	triggerData: TriggerData;
}>();

//Init action's data if necessary.
//Done first as the "selectedPerUserValue" watcher below reads them right away
if (props.action.interpretMaths === undefined) props.action.interpretMaths = true;
if (!props.action.values) props.action.values = [];
if (!props.action.newValue) props.action.newValue = "";

const { t } = useI18n();
const { place: placeDropdown } = usePlaceDropdown();
const storeValues = useStoreValues();

const userPLaceholders = ref<ITriggerPlaceholder<any>[]>([]);

const param_values = ref<TwitchatDataTypes.ParameterData<string[], string>>({
	type: "list",
	labelKey: "triggers.actions.value.select_label",
	value: [],
	listValues: [],
});
const param_value = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	labelKey: "triggers.actions.value.value_label",
	value: "",
});
const param_maths = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	labelKey: "triggers.actions.value.interpret_arithmetic",
	value: true,
});
const param_userAction = ref<
	TwitchatDataTypes.ParameterData<
		NonNullable<TriggerActionValueData["userAction"]>[string],
		NonNullable<TriggerActionValueData["userAction"]>[string]
	>
>({ type: "list", labelKey: "triggers.actions.value.param_action", value: "update" });

/**
 * Define if global actions should be displayed.
 * If only per-user delete actions are selected, we should not display the global action
 */
const showAction = computed((): boolean => {
	if (props.action.values.length === 0) return true;
	let deleteBatchActions = 0;
	for (const cid of props.action.values) {
		if (props.action.userAction && props.action.userAction[cid] === "delete")
			deleteBatchActions++;
	}

	return deleteBatchActions < props.action.values.length;
});

/**
 * Build user trigger source list
 */
const userSourceOptions = computed((): TwitchatDataTypes.ParameterDataListValue<string>[] => {
	const res: TwitchatDataTypes.ParameterDataListValue<string>[] = [
		//Add static sources "sender" and "everyone"
		{
			label: t("triggers.actions.value.user_source_sender"),
			value: VALUE_EDIT_SOURCE_SENDER,
		},
		{
			label: t("triggers.actions.value.user_source_everyone"),
			value: VALUE_EDIT_SOURCE_EVERYONE,
		},
		{
			label: t("triggers.actions.value.user_source_chatters"),
			value: VALUE_EDIT_SOURCE_CHATTERS,
		},
	];

	//Add placeholders that may contain a user name (chat command params included)
	res.push(
		...TriggerUtils.getPlaceholderGroupedListValues(
			userPLaceholders.value.filter((v) => v.tag.indexOf(VALUE_PLACEHOLDER_PREFIX) == -1),
		),
	);
	return res;
});

/**
 * Get value data of any per-user value added to the selection
 */
const selectedPerUserValue = computed((): TwitchatDataTypes.ValueData[] => {
	return storeValues.valueList.filter(
		(v) => v.perUser === true && props.action.values.findIndex((v2) => v2 === v.id) > -1,
	);
});

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

onBeforeMount(() => {
	param_userAction.value.listValues = [
		{ value: "update", labelKey: "triggers.actions.value.action_update" },
		{ value: "delete", labelKey: "triggers.actions.value.action_delete" },
	];
	//If trigger is related to a value event (looped, maxed, mined) remove it
	//from the editable value to avoid infinite loop
	const values: TwitchatDataTypes.ParameterDataListValue<string>[] = storeValues.valueList
		.map((v) => {
			return { value: v.id, label: v.name };
		})
		.filter((v) => {
			return v.value != props.triggerData.valueId;
		});

	//Check if selected values still exists
	for (let i = 0; i < props.action.values.length; i++) {
		const cid = props.action.values[i];
		if (values.findIndex((v) => v.value == cid) === -1) {
			//Value not found, user probably remove it
			props.action.values.splice(i, 1);
			i--;
		}
	}

	param_values.value.listValues = values;

	updatePerUserValueSources();
});

/**
 * Initialize the "valueUserSources" data property if not
 * existing yet and set "SENDER" default value
 */
function updatePerUserValueSources(): void {
	//Init per-user value sources if necessary
	for (const c of selectedPerUserValue.value) {
		if (!props.action.valueUserSources) {
			props.action.valueUserSources = {};
		}
		if (!props.action.userAction) {
			props.action.userAction = {};
		}
		if (!props.action.valueUserSources[c.id]) {
			props.action.valueUserSources[c.id] = VALUE_EDIT_SOURCE_SENDER;
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
	param_value.value.placeholderList = list;
}

watch(
	() => selectedPerUserValue.value,
	() => updatePerUserValueSources(),
);
</script>

<style scoped lang="less">
.triggeractionvalueentry {
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

	.valueList {
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
			select,
			.searchableselect {
				width: 100%; //Allows proper auto size
				flex-grow: 1;
				max-width: 300px;
				flex-basis: 300px;
			}
		}
	}
}
</style>
