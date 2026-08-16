<template>
	<div class="triggerconditionlistitem" :class="{ editing: editing }" ref="rootEl">
		<template v-if="!editing">
			<Icon name="dragZone" class="dragIcon" />
			<TTButton
				class="groupBt"
				icon="folder"
				small
				secondary
				@click="addItem()"
				v-tooltip="t('triggers.condition.group_tt')"
				v-if="parentCondition.conditions.length > 1"
			/>

			<div class="summary" @click="startEdition()">
				<template v-if="isConfigured">
					<span class="placeholder">{{ placeholderLabel }}</span>

					<span class="operator">{{ operatorLabel }}</span>

					<template v-if="condition.operator == 'modulo'">
						<span class="operatorVal">{{ condition.operatorVal }}</span>
						<span class="operator">=</span>
					</template>

					<Icon
						class="caseIcon"
						name="case_sensitive"
						v-if="showCaseSensitiveToggle && condition.caseSensitive === true"
						v-tooltip="t('triggers.condition.param_caseSensitive')"
					/>

					<span class="value" v-if="needsValue">{{ valueLabel }}</span>
				</template>

				<span class="unconfigured" v-else>{{ t("triggers.condition.unconfigured") }}</span>
			</div>

			<TTButton class="deleteBt" alert small icon="cross" @click="deleteItem()" />
		</template>

		<div class="form" v-else>
			<div class="field">
				<label>{{ t("triggers.condition.label_placeholder") }}</label>

				<div class="placeholderHolder" v-if="forceCustomPlaceholder">
					<TTButton
						class="clearCustomBt"
						@click="clearCustomPlaceholder()"
						icon="cross"
						secondary
						small
					></TTButton>
					<ParamItem
						class="value"
						noBackground
						:paramData="param_placeholder"
						v-model="condition.customPlaceholder"
						:key="'cph_' + condition.id"
						placeholdersAsPopout
					/>
				</div>
				<ParamItem
					class="placeholder"
					v-else
					noBackground
					:paramData="param_placeholder_list"
					@change="onSelectPlaceholder()"
					v-model="condition.placeholder"
					:key="'ph_' + condition.id"
				/>
			</div>

			<div class="field">
				<label>{{ t("triggers.condition.label_operator") }}</label>

				<div class="operatorHolder">
					<ParamItem
						class="operator"
						noBackground
						:paramData="param_operator"
						v-model="condition.operator as string"
						:key="'op_' + condition.id"
					/>

					<template v-if="condition.operator == 'modulo'">
						<ParamItem
							class="operatorVal"
							noBackground
							:paramData="param_operatorVal"
							v-model="condition.operatorVal"
							:key="'opv_' + condition.id"
						/>
						<p>=</p>
					</template>
				</div>
			</div>

			<div class="field" v-if="needsValue">
				<div class="label">
					<label class="text">{{ t("triggers.condition.label_value") }}</label>
					<label v-if="showCaseSensitiveToggle" class="caseField"
						>{{ t("triggers.condition.param_caseSensitive") }}
						<ToggleButton v-model="condition.caseSensitive" small />
					</label>
				</div>

				<div class="valueHolder" :class="{ isCustomValue: forceCustomValue }">
					<TTButton
						class="clearCustomBt"
						v-if="forceCustomValue"
						@click="forceCustomValue = false"
						icon="cross"
						secondary
						small
					></TTButton>
					<ParamItem
						class="value"
						v-if="forceCustomValue !== true && param_value_list.listValues"
						noBackground
						:paramData="param_value_list"
						v-model="condition.value"
						:key="'vl_' + condition.id"
						@change="onSelectFixedValue()"
					/>
					<ParamItem
						class="value"
						v-else
						noBackground
						:paramData="param_value"
						v-model="condition.value"
						:key="'v_' + condition.id"
						placeholdersAsPopout
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import {
	COUNTER_VALUE_PLACEHOLDER_PREFIX,
	placeholderCacheVersion,
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
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import ParamItem from "../../ParamItem.vue";
import { useI18n } from "vue-i18n";
import { storeCounters as useStoreCounters } from "@/store/counters/storeCounters";
import { storeValues as useStoreValues } from "@/store/values/storeValues";
import { storeTimer as useStoreTimer } from "@/store/timer/storeTimer";
import { CUSTOM_CONDITION_PLACEHOLDER } from "@/utils/triggers/TriggerActionHandler.js";
import ToggleButton from "@/components/ToggleButton.vue";

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

const editedConditionId = defineModel<string>("editedConditionId", { default: "" });

const rootEl = useTemplateRef<HTMLElement>("rootEl");
const forceCustomValue = ref<boolean>(false);
const forceCustomPlaceholder = ref<boolean>(false);
const param_placeholder = ref<TwitchatDataTypes.ParameterData<string, string>>({
	type: "string",
	value: "",
	longText: false,
	maxLength: 300,
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

/**
 * Is the condition currently opened in edition mode?
 */
const editing = computed((): boolean => editedConditionId.value === props.condition.id);

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
	return !noValueOperators.includes(props.condition.operator);
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
	return csOperators.includes(props.condition.operator);
});

/**
 * Currently selected placeholder selected for the condition
 */
const selectedPlaceholder = computed(
	(): ConditionListValues<string, ITriggerPlaceholder<string>> | undefined => {
		if (forceCustomPlaceholder.value) return undefined;
		const list = param_placeholder_list.value.listValues as
			| ConditionListValues<string, ITriggerPlaceholder<string>>[]
			| undefined;
		return list?.find((v) => v.value === props.condition.placeholder);
	},
);

/**
 * Is the condition complete enough to be rendered as text?
 */
const isConfigured = computed((): boolean => {
	return forceCustomPlaceholder.value
		? (props.condition.customPlaceholder || "") != ""
		: props.condition.placeholder != "";
});

const placeholderLabel = computed((): string => {
	if (forceCustomPlaceholder.value) return props.condition.customPlaceholder || "";
	return getEntryLabel(selectedPlaceholder.value) || props.condition.placeholder;
});

const operatorLabel = computed((): string => {
	return t("triggers.condition.operators." + props.condition.operator);
});

const valueLabel = computed((): string => {
	const value = (props.condition.value ?? "").toString();
	if (!forceCustomValue.value && param_value_list.value.listValues) {
		const item = param_value_list.value.listValues.find(
			(v) => (v.value as any)?.toString().toLowerCase() === value.toLowerCase(),
		);
		if (item) return getEntryLabel(item) || value;
	}
	return value;
});

/**
 * Get the readable label of a list entry
 */
function getEntryLabel(
	entry?: TwitchatDataTypes.ParameterDataListValue<unknown, unknown>,
): string | undefined {
	if (!entry) return undefined;
	if (entry.label != undefined) return entry.label;
	if (entry.labelKey) return t(entry.labelKey);
	return undefined;
}

/**
 * Placeholders the condition can pick from. Either the ones given by the
 * parent, or the ones related to the trigger's event type.
 */
function getActivePlaceholders(): ITriggerPlaceholder<any>[] {
	return props.placeholderList.length > 0
		? props.placeholderList
		: TriggerEventPlaceholders(props.triggerData.type);
}

onBeforeMount(() => {
	if (props.condition.placeholder)
		props.condition.placeholder = props.condition.placeholder.toUpperCase();
	if (props.condition.caseSensitive == undefined) props.condition.caseSensitive = false;

	forceCustomPlaceholder.value = props.condition.placeholder == CUSTOM_CONDITION_PLACEHOLDER;

	// Start edition if not conf is yet defined
	if (!props.condition.placeholder) nextTick().then(() => startEdition());

	buildSourceList();
});

onBeforeUnmount(() => {
	stopEdition();
	toggleEditionListeners(false);
});

//Watch for changes on the chat command params and on the placeholder cache
watch(
	[() => props.triggerData.chatCommandParams, placeholderCacheVersion],
	() => {
		buildSourceList();
	},
	{ deep: true },
);

watch([() => props.condition.placeholder, forceCustomPlaceholder], () => updateOperators());

watch(editing, (value) => toggleEditionListeners(value));

/**
 * Open edition form.
 */
function startEdition(): void {
	editedConditionId.value = props.condition.id;
}

/**
 * Close edition form
 */
function stopEdition(): void {
	if (editing.value) editedConditionId.value = "";
}

function toggleEditionListeners(enabled: boolean): void {
	document.removeEventListener("click", onClickOutside);
	document.removeEventListener("keydown", onKeyDown, true);
	if (!enabled) return;
	document.addEventListener("click", onClickOutside);
	document.addEventListener("keydown", onKeyDown, true);
}

/**
 * Leave edition mode when clicking anywhere else
 */
function onClickOutside(event: MouseEvent): void {
	const target = event.target as HTMLElement;
	if (!target.isConnected) return;
	let parent: HTMLElement | null = target;
	while (parent) {
		// Avoid closing form if clicking on a v-tooltip
		// For example a popout placeholder selector
		if (parent.classList.contains("tippy-content")) return;
		if (parent.classList.contains("vs__dropdown-menu")) return;
		parent = parent.parentElement;
	}
	if (!rootEl.value?.contains(target)) stopEdition();
}

function onKeyDown(event: KeyboardEvent): void {
	if (event.key != "Escape") return;
	stopEdition();
	event.preventDefault();
	event.stopPropagation();
}

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
		placeholders = getActivePlaceholders().concat();
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
				return {
					label: t(v.descKey, { NAME: name ? '"' + name + '"' : "" }),
					value: v.tag.toUpperCase(),
					fixedValues: v.values,
					storage: v,
				};
			}),
		);
	} else {
		placeholders = getActivePlaceholders();
		placeholderListLocal = placeholders.map((v) => {
			return {
				label: t(v.descKey, v.descReplacedValues ?? {}),
				value: v.tag.toUpperCase(),
				fixedValues: v.values,
				storage: v,
			};
		});
	}

	//Add custom placeholder for devs
	placeholderListLocal.push({
		labelKey: "triggers.condition.custom_value",
		value: CUSTOM_CONDITION_PLACEHOLDER,
	});

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
	param_placeholder.value.placeholderList = placeholders.concat();
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
	if (inputOrigin && firstRender) return;

	if (!forceCustomPlaceholder.value && !selectedPlaceholder.value) return;

	const placeholderRef = selectedPlaceholder.value?.storage;
	const cmdParamRef = props.triggerData.chatCommandParams?.find(
		(v) => v.tag.toLowerCase() == props.condition.placeholder.toLowerCase(),
	);

	param_operator.value.listValues = TriggerConditionOperatorList.map((v) => {
		return {
			label: t("triggers.condition.operators." + v),
			value: v,
		};
	}).filter((v) => {
		// Allow all operators for custom placeholder
		if (forceCustomPlaceholder.value) return true;
		//Remove arithmetical operators if placeholder isn't parsable as number
		if ((!placeholderRef || placeholderRef.numberParsable !== true) && !cmdParamRef) {
			return ![">", "<", ">=", "<="].includes(v.value);
		}
		return true;
	});

	//If selected placeholder has fixed values
	if (selectedPlaceholder.value?.fixedValues) {
		const list = selectedPlaceholder.value.fixedValues.concat();
		list.push({
			value: CUSTOM_CONDITION_PLACEHOLDER,
			labelKey: "triggers.condition.custom_value",
		});
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
	if (param_value_list.value.value == CUSTOM_CONDITION_PLACEHOLDER) {
		forceCustomValue.value = true;
		props.condition.value = "";
	}
}

function onSelectPlaceholder(): void {
	const isCustom = param_placeholder_list.value.value == CUSTOM_CONDITION_PLACEHOLDER;
	if (isCustom !== forceCustomPlaceholder.value) {
		param_placeholder.value.value = "";
		delete props.condition.customPlaceholder;
	}
	forceCustomPlaceholder.value = isCustom;

	updateOperators(true);
}

/**
 * Discards the custom placeholder to get back to the placeholders list
 */
function clearCustomPlaceholder(): void {
	forceCustomPlaceholder.value = false;
	param_placeholder.value.value = "";
	delete props.condition.customPlaceholder;
	props.condition.placeholder = "";
	nextTick().then(() => updateOperators());
}

interface ConditionListValues<T, U> extends TwitchatDataTypes.ParameterDataListValue<T, U> {
	fixedValues?: TwitchatDataTypes.ParameterDataListValue<unknown>[];
}
</script>

<style scoped lang="less">
.triggerconditionlistitem {
	display: flex;
	flex-direction: row;
	// gap: 2px;
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

	.groupBt {
		border-top-right-radius: 0;
		border-bottom-right-radius: 0;
	}

	.deleteBt {
		border-top-left-radius: 0;
		border-bottom-left-radius: 0;
	}

	//Text rendering of the condition
	.summary {
		flex-grow: 1;
		min-width: 0;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		// justify-content: space-between;
		align-items: center;
		gap: 0.25em 0.4em;
		padding: 0.35em 0.5em;
		background-color: var(--background-color-fadest);
		cursor: pointer;
		line-height: 1.2em;
		transition: background-color 0.2s;
		&:hover {
			background-color: var(--background-color-fader);
		}

		.placeholder {
			font-weight: bold;
			// overflow-wrap: anywhere;
			// text-overflow: ellipsis;
			// overflow: hidden;
			// white-space: nowrap;
		}

		.operator {
			flex-shrink: 0;
			// color: var(--color-text-fade);
			font-style: italic;
			padding: 0 0.4em;
			border-radius: var(--border-radius);
			background-color: var(--color-primary);
		}

		.operatorVal,
		.value {
			padding: 0 0.4em;
			border-radius: var(--border-radius);
			background-color: var(--background-color-fader);
			// overflow-wrap: anywhere;
			// text-overflow: ellipsis;
			// overflow: hidden;
			// white-space: nowrap;
			// flex-basis: 50%;
			&:empty::after {
				content: "*";
				opacity: 0.5;
			}
		}

		.caseIcon {
			width: 0.75em;
			flex-shrink: 0;
		}

		.unconfigured {
			font-style: italic;
			color: var(--color-text-fade);
		}
	}

	//Edition form
	&.editing {
		padding: 0.5em;
		border-radius: var(--border-radius);
		background-color: var(--background-color-fadest);
	}

	.form {
		flex-grow: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5em;

		.field {
			display: flex;
			flex-direction: column;
			gap: 0.15em;

			& > .label {
				display: flex;
				flex-direction: row;
				align-items: center;
				gap: 0.5em;
				font-size: 0.8em;
				text-transform: uppercase;
				color: var(--color-text-fade);

				.text {
					flex: 1;
				}

				.caseField {
					display: flex;
					flex-direction: row;
					gap: 0.5em;
					text-transform: none;
					cursor: pointer;
				}
			}

			:deep(.listField) {
				flex-basis: 100%;
			}

			& > .placeholder,
			& > .operator {
				width: 100%;
			}
		}

		.operatorHolder {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: 0.25em;
			.operator {
				flex-grow: 1;
				min-width: 0;
			}
			.operatorVal {
				flex-basis: 6em;
				flex-shrink: 0;
			}
		}

		.placeholderHolder,
		.valueHolder {
			display: flex;
			flex-direction: row;
			min-width: 0;
			.clearCustomBt {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
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
		}

		.placeholderHolder,
		.valueHolder.isCustomValue {
			.value {
				:deep(.content) {
					.inputHolder,
					input {
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
