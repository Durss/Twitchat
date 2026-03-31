<template>
	<div class="triggerconditionlistitem">
		<Icon name="dragZone" class="dragIcon" />

		<ParamItem
			class="value"
			v-if="forceCustomPlaceholder"
			noBackground
			:paramData="param_placeholder"
			v-model="condition.placeholder"
		/>
		<ParamItem
			class="placeholder"
			v-else
			noBackground
			:paramData="param_placeholder_list"
			@change="onSelectPlaceholder()"
			v-model="condition.placeholder"
			:key="'ph_' + condition.id"
		/>

		<ParamItem
			class="operator"
			noBackground
			:paramData="param_operator"
			v-model="condition.operator"
			:key="'op_' + condition.id"
		/>

		<div v-if="condition.operator == 'modulo'" class="operatorValHolder">
			<ParamItem
				class="operator"
				noBackground
				:paramData="param_operatorVal"
				v-model="condition.operatorVal"
				:key="'opv_' + condition.id"
			/>
			<p>=</p>
		</div>

		<div
			class="valueHolder"
			:class="{
				isCustomValue: forceCustomValue,
				showCaseSensitiveToggle: showCaseSensitiveToggle,
			}"
			v-if="needsValue"
		>
			<TTButton
				class="clearCustomBt"
				v-if="forceCustomValue"
				@click="forceCustomValue = false"
				icon="cross"
				secondary
				small
			></TTButton>
			<TTButton
				v-if="showCaseSensitiveToggle"
				class="casebt"
				@click="condition.caseSensitive = !condition.caseSensitive"
				:icon="condition.caseSensitive === true ? 'case_sensitive' : 'case_insensitive'"
				:secondary="condition.caseSensitive === true"
				v-tooltip="
					$t(
						'triggers.condition.' +
							(condition.caseSensitive === true
								? 'param_caseSensitive'
								: 'param_caseInsensitive'),
					)
				"
				noBounce
			/>
			<ParamItem
				class="value"
				v-if="needsValue && forceCustomValue !== true && param_value_list.listValues"
				noBackground
				:paramData="param_value_list"
				v-model="condition.value"
				:key="'vl_' + condition.id"
				@change="onSelectFixedValue()"
			/>
			<ParamItem
				class="value"
				v-else-if="needsValue"
				noBackground
				:paramData="param_value"
				v-model="condition.value"
				:key="'v_' + condition.id"
				placeholdersAsPopout
			/>
		</div>

		<div class="ctas">
			<TTButton
				small
				icon="group"
				@click="addItem()"
				v-tooltip="$t('triggers.condition.group_tt')"
				v-if="parentCondition.conditions.length > 1"
			/>
			<TTButton alert small icon="cross" @click="deleteItem()" />
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import {
	COUNTER_VALUE_PLACEHOLDER_PREFIX,
	TriggerConditionOperatorList,
	TriggerEventPlaceholders,
	type TriggerCondition,
	type TriggerConditionGroup,
	type TriggerData,
	VALUE_PLACEHOLDER_PREFIX,
	type TriggerConditionOperator,
	type ITriggerPlaceholder,
	STOPWATCH_PLACEHOLDER_PREFIX,
	COUNTDOWN_PLACEHOLDER_PREFIX,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { computed, nextTick, onBeforeMount, ref, watch } from "vue";
import ParamItem from "../../ParamItem.vue";
import { useI18n } from "vue-i18n";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";

const { t } = useI18n();
const storeCounters = useStoreCounters();
const storeValues = useStoreValues();
const storeTimer = useStoreTimer();

const props = withDefaults(
	defineProps<{
		triggerData: TriggerData;
		condition: TriggerCondition;
		parentCondition: TriggerConditionGroup;
		placeholderList?: ITriggerPlaceholder<string>[];
	}>(),
	{
		placeholderList: () => [],
	},
);

const forceCustomValue = ref<boolean>(false);
const forceCustomPlaceholder = ref<boolean>(false);
const param_placeholder = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "string",
	value: "",
	longText: false,
});
const param_placeholder_list = ref<
	TwitchatDataTypes.ParameterData<string, string, void, void, ITriggerPlaceholder<string>>
>({ type: "list", value: "" });
const param_operator = ref<
	TwitchatDataTypes.ParameterData<TriggerConditionOperator, TriggerConditionOperator>
>({ type: "list", value: ">" });
const param_operatorVal = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "string",
	value: "",
	maxLength: 500,
});
const param_value = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "string",
	value: "",
	longText: false,
});
const param_value_list = ref<TwitchatDataTypes.ParameterData<string, unknown>>({
	type: "list",
	value: "",
});

let firstRender = true;
const CUSTOM = "@___CUSTOM_VALUE___@";

const needsValue = computed((): boolean => {
	const noValueOperators: TriggerCondition["operator"][] = [
		"empty",
		"not_empty",
		"is_boolean",
		"is_not_boolean",
		"is_number",
		"is_not_number",
		"is_float",
		"is_not_float",
	];
	return !noValueOperators.includes(param_operator.value.value);
});

const showCaseSensitiveToggle = computed((): boolean => {
	const csOperators: TriggerCondition["operator"][] = [
		"=",
		"!=",
		"contains",
		"not_contains",
		"starts_with",
		"ends_with",
		"not_starts_with",
		"not_ends_with",
	];
	return csOperators.includes(param_operator.value.value);
});

onBeforeMount(() => {
	if (props.condition.placeholder)
		props.condition.placeholder = props.condition.placeholder.toUpperCase();
	if (props.condition.caseSensitive == undefined) props.condition.caseSensitive = false;

	buildSourceList();
});

//Watch for changes on the chat command params to rebuild source list
watch(
	() => props.triggerData.chatCommandParams,
	() => {
		buildSourceList();
	},
	{ deep: true },
);

/**
 * Create the source list used as the first operator of the condition
 */
function buildSourceList(): void {
	let placeholderListLocal: ConditionListValues<string, ITriggerPlaceholder<string>>[] = [];
	let placeholders: ITriggerPlaceholder<any, unknown, "">[] = [];
	if (props.placeholderList.length == 0) {
		//Add commmand params
		if (props.triggerData.chatCommandParams) {
			props.triggerData.chatCommandParams.forEach((v) => {
				placeholderListLocal.push({
					value: v.tag.toUpperCase(),
					label: t("triggers.condition.placeholder_cmd_param", {
						NAME: "{" + v.tag.toUpperCase() + "}",
					}),
				});
			});
		}

		//Add trigger's placeholders
		placeholders = TriggerEventPlaceholders(props.triggerData.type).concat();
		let debouncedRebuild = -1;
		placeholderListLocal = placeholderListLocal.concat(
			placeholders.map((v) => {
				let name = "";
				//If it's a counter tag, get counter's name
				if (v.tag.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX) > -1) {
					const counterTag = v.tag.replace(COUNTER_VALUE_PLACEHOLDER_PREFIX, "");
					const counter = storeCounters.counterList.find(
						(v) => v.placeholderKey?.toLowerCase() === counterTag.toLowerCase(),
					);
					if (counter) name = counter.name;
				}
				if (v.tag.indexOf(VALUE_PLACEHOLDER_PREFIX) > -1) {
					const valueTag = v.tag.replace(VALUE_PLACEHOLDER_PREFIX, "");
					const counter = storeValues.valueList.find(
						(v) => v.placeholderKey?.toLowerCase() === valueTag.toLowerCase(),
					);
					if (counter) name = counter.name;
				}
				if (v.tag.indexOf(COUNTDOWN_PLACEHOLDER_PREFIX) > -1) {
					const valueTag = v.tag.replace(COUNTDOWN_PLACEHOLDER_PREFIX, "");
					const timer = storeTimer.timerList.find(
						(v) => v.placeholderKey && valueTag.indexOf(v.placeholderKey) == 0,
					);
					if (timer) name = timer.title;
				}
				if (v.tag.indexOf(STOPWATCH_PLACEHOLDER_PREFIX) > -1) {
					const valueTag = v.tag.replace(STOPWATCH_PLACEHOLDER_PREFIX, "");
					const timer = storeTimer.timerList.find(
						(v) => v.placeholderKey && valueTag.indexOf(v.placeholderKey) == 0,
					);
					if (timer) name = timer.title;
				}
				watch(
					() => v.values,
					() => {
						clearTimeout(debouncedRebuild);
						debouncedRebuild = window.setTimeout(() => {
							buildSourceList();
						}, 20);
					},
					{ deep: true },
				);
				return {
					label: t(v.descKey, { NAME: name ? '"' + name + '"' : "" }),
					value: v.tag.toUpperCase(),
					fixedValues: v.values,
					storage: v,
				};
			}),
		);
	} else {
		placeholders = props.placeholderList;
		placeholderListLocal = placeholders.map((v) => {
			return {
				label: t(v.descKey, v.descReplacedValues ?? {}),
				value: v.tag.toUpperCase(),
				fixedValues: v.values,
				storage: v,
			};
		});
	}

	// if(storeAuth.isAdmin && storeMain.devmode) {
	// 	//Add custom placeholder for devs
	// 	placeholderListLocal.push({
	// 		label: "Custom",
	// 		value:CUSTOM,
	// 	});
	// }

	//Fail safe, if the placeholder isn't found on the list, push it to avoid reseting it to another
	//random one in case it's been deleted or I fuck up something in the futur
	if (
		props.condition.placeholder != "" &&
		placeholderListLocal.findIndex((v) => v.value == props.condition.placeholder) == -1
	) {
		placeholderListLocal.push({
			label: props.condition.placeholder,
			value: props.condition.placeholder,
		});
	}

	param_placeholder_list.value.listValues = placeholderListLocal;
	param_value.value.placeholderList = placeholders.concat();
	//Wait for list to render and update its internal "selectedListValue" value.
	//Might be something fixable within the ParamItem component to avoid that
	//async behavior, but too lazy for now :3
	nextTick().then(() => {
		updateOperators();
		firstRender = false;
	});
}

/**
 * Removes arithmetical operators if the placeholder
 * isn't defined as number parsable.
 */
function updateOperators(inputOrigin: boolean = false): void {
	if ((inputOrigin && firstRender) || !param_placeholder_list.value.selectedListValue) return;

	const placeholderRef = param_placeholder_list.value.selectedListValue.storage;
	const cmdParamRef = props.triggerData.chatCommandParams?.find(
		(v) => v.tag.toLowerCase() == props.condition.placeholder.toLowerCase(),
	);

	param_operator.value.listValues = TriggerConditionOperatorList.map((v) => {
		return {
			label: t("triggers.condition.operators." + v),
			value: v,
		};
	}).filter((v) => {
		//Remove arithmetical operators if placeholder isn't parsable as number
		if ((!placeholderRef || placeholderRef.numberParsable !== true) && !cmdParamRef) {
			return ![">", "<", ">=", "<="].includes(v.value);
		}
		return true;
	});

	//If selected placeholder has fixed values
	if (
		param_placeholder_list.value.selectedListValue &&
		(
			param_placeholder_list.value.selectedListValue as ConditionListValues<
				string,
				ITriggerPlaceholder<string>
			>
		).fixedValues
	) {
		const list = (
			param_placeholder_list.value.selectedListValue as ConditionListValues<
				string,
				ITriggerPlaceholder<string>
			>
		).fixedValues!.concat();
		list.push({ value: CUSTOM, labelKey: "triggers.condition.custom_value" });
		param_value_list.value.listValues = list;
		param_value_list.value.type = "imagelist";

		//If condition's value does not exist on the fixed ones, force
		//custom field to be displayed with that value.
		const item = list.find(
			(v) =>
				(v.value as any).toString().toLowerCase() ==
				(props.condition.value as any).toString().toLowerCase(),
		);
		if (props.condition.value && !item) {
			forceCustomValue.value = true;
		}

		if (item) props.condition.value = item.value as string;
	} else {
		forceCustomValue.value = false;
		delete param_value_list.value.listValues;
	}
}

/**
 * Converts the current condition item to a group item and add a new condition in it
 */
function addItem(): void {
	const index = props.parentCondition.conditions.findIndex((v) => v.id === props.condition.id);
	props.parentCondition.conditions.splice(index, 1, {
		id: Utils.getUUID(),
		type: "group",
		conditions: [
			props.condition,
			{
				id: Utils.getUUID(),
				type: "condition",
				operator: "=",
				placeholder: "",
				value: "",
			},
		],
		operator: "AND",
	});
}

/**
 * Delete current item.
 */
function deleteItem(): void {
	const index = props.parentCondition.conditions.findIndex((v) => v.id === props.condition.id);
	if (index === -1) return; //Item not found
	props.parentCondition.conditions.splice(index, 1);
}

/**
 * Called when a fixed value is selected.
 * Detect if its the "custom" entry that's selected to switch to the
 * custom field.
 */
function onSelectFixedValue(): void {
	if (param_value_list.value.value == CUSTOM) {
		forceCustomValue.value = true;
		props.condition.value = "";
	}
}

function onSelectPlaceholder(): void {
	if (param_placeholder_list.value.value == CUSTOM) {
		forceCustomPlaceholder.value = true;
		props.condition.placeholder = "";
	}

	updateOperators(true);
}

export interface ConditionListValues<T, U> extends TwitchatDataTypes.ParameterDataListValue<T, U> {
	fixedValues?: TwitchatDataTypes.ParameterDataListValue<unknown>[];
}
</script>

<style scoped lang="less">
.triggerconditionlistitem {
	display: flex;
	flex-direction: row;
	gap: 2px;
	&:hover,
	&:active,
	&:focus-within {
		.dragIcon {
			flex-shrink: 0;
			height: 1.5em;
			width: 1em;
			opacity: 1;
			margin-right: 0;
		}
	}
	.dragIcon {
		width: 0;
		opacity: 0;
		transition: all 0.1s;
		align-self: center;
		margin-right: -0.5em;
		padding: 0.4em 0.25em;
		cursor: grab;
		&:active {
			cursor: grabbing;
		}
	}
	.operator {
		flex-basis: 80px;
		flex-shrink: 0;
	}

	.operatorValHolder {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 2px;
	}

	.valueHolder {
		min-width: 50%;
		display: flex;
		flex-direction: row;
		.value {
			width: 100%;
			:deep(.popoutMode) {
				height: 100%;
			}
			:deep(.content) {
				height: 100%;
				.holder,
				.inputHolder {
					height: 100%;
					input {
						height: 100%;
					}
				}
			}
		}
		.clearCustomBt {
			height: 100%;
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
		}
		.casebt {
			z-index: 1;
			width: 1.5em;
			margin-right: -1.5em;
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
			border-right: 1px solid var(--color-text-fade);
		}
		&.showCaseSensitiveToggle {
			:deep(input) {
				padding-left: 1.6em;
			}
			:deep(.vs__selected-options) {
				padding-left: 1em;
			}
		}
		&.isCustomValue {
			.value {
				:deep(.content) {
					.inputHolder,
					input {
						height: 100%;
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}
				}
			}
		}
	}

	.ctas {
		flex-shrink: 0;
		display: flex;
		flex-direction: row;
		gap: 0;
		.button {
			border-radius: 0;
			&:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			&:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
		}
	}
}
</style>
