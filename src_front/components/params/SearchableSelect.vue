<template>
	<vue-select
		class="searchableselect"
		label="label"
		:modelValue="selectedOption"
		@update:modelValue="onSelect"
		:inputId="inputId"
		:options="flatOptions"
		:placeholder="placeholder"
		:disabled="disabled"
		:clearable="false"
		:selectable="(v: ListOption) => v.isGroup !== true && v.disabled !== true"
		:getOptionKey="(v: ListOption) => v.key"
		:filter="filterOptions"
		:calculate-position="placeDropdown"
		appendToBody
	>
		<template #option="option: ListOption">
			<div v-if="option.isGroup" class="category">{{ option.label }}</div>
			<div v-else :class="{ subItem: option.parentGroup != undefined }">
				<span class="text">{{ option.label }}</span>
				<span class="labelSmall" v-if="option.secondaryLabel">{{
					option.secondaryLabel
				}}</span>
			</div>
		</template>

		<template #no-options>{{ t("global.no_result") }}</template>

		<template #selected-option="option: ListOption">
			<span class="text">{{ option.label }}</span>
			<span class="labelSmall" v-if="option.secondaryLabel">{{ option.secondaryLabel }}</span>
		</template>
	</vue-select>
</template>

<script setup lang="ts">
import { usePlaceDropdown } from "@/composables/usePlaceDropDown";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

interface ListOption extends TwitchatDataTypes.ParameterDataListValue<unknown> {
	key: string;
	label: string;
	isGroup?: true;
	/**
	 * Group the entry belongs to
	 */
	parentGroup?: ListOption;
}

const props = defineProps<{
	options: TwitchatDataTypes.ParameterDataListValue<unknown>[];
	inputId?: string;
	placeholder?: string;
	disabled?: boolean;
}>();

const model = defineModel<unknown>();

const { t } = useI18n();
const { place: placeDropdown } = usePlaceDropdown();

const flatOptions = computed((): ListOption[] => {
	const res: ListOption[] = [];
	const toFlat = (
		v: TwitchatDataTypes.ParameterDataListValue<unknown>,
		parentGroup?: ListOption,
	): ListOption => ({
		//Options can't be keyed by value, a value can be anything
		key: String(res.length),
		label: v.label ?? (v.labelKey ? t(v.labelKey) : String(v.value)),
		value: v.value,
		secondaryLabel: v.secondaryLabel,
		disabled: v.disabled,
		parentGroup,
	});

	for (const option of props.options) {
		if (!option.group) {
			res.push(toFlat(option));
			continue;
		}
		const header: ListOption = { ...toFlat(option), isGroup: true };
		res.push(header);
		for (const entry of option.group) res.push(toFlat(entry, header));
	}
	return res;
});

/**
 * Currently selected option
 */
const selectedOption = computed((): ListOption | null => {
	if (model.value === undefined || model.value === null || model.value === "") return null;
	const option = flatOptions.value.find((v) => v.isGroup !== true && v.value === model.value);
	if (option) return option;
	//Value not in the list anymore, display it as is
	return { key: "__missing", label: String(model.value), value: model.value };
});

/**
 * Called when an entry is selected
 */
function onSelect(option: ListOption | null): void {
	model.value = option?.value;
}

/**
 * Filters entries on their label and secondary label.
 * Searching for a group's label keeps all its entries.
 * A group header is kept only if at least one of its entries is.
 */
function filterOptions(options: ListOption[], search: string): ListOption[] {
	const searchClean = search.toLowerCase().trim();
	if (!searchClean) return options;

	const res: ListOption[] = [];
	let lastGroup: ListOption | undefined = undefined;
	for (const option of options) {
		if (option.isGroup) continue;
		const matches =
			option.label.toLowerCase().includes(searchClean) ||
			(option.secondaryLabel || "").toLowerCase().includes(searchClean) ||
			(option.parentGroup?.label || "").toLowerCase().includes(searchClean);
		if (!matches) continue;
		if (option.parentGroup && option.parentGroup !== lastGroup) res.push(option.parentGroup);
		lastGroup = option.parentGroup;
		res.push(option);
	}
	return res;
}
</script>

<style scoped lang="less"></style>
