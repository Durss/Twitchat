<template>
	<TTButton
		ref="rootEl"
		icon="merge"
		v-if="actionContext !== false && !expanded"
		class="collapsed"
		@click="expand"
	></TTButton>

	<div v-else ref="rootEl" class="triggerconditionlist" data-noselect>
		<div v-if="actionContext === false">{{ $t("triggers.condition.title") }}</div>

		<TTButton
			v-if="!conditions || conditions.conditions.length == 0"
			icon="add"
			small
			@click="addCondition()"
			>{{ $t("triggers.condition.createBt") }}</TTButton
		>

		<TriggerConditionListGroupItem
			v-else
			class="list"
			:triggerData="triggerData"
			:parentCondition="conditions"
			:condition="[conditions]"
			:placeholderList="placeholderList"
		/>
	</div>
</template>
<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import type {
	ITriggerPlaceholder,
	TriggerActionData,
	TriggerConditionGroup,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import Utils from "@/utils/Utils";
import { onBeforeMount, onBeforeUnmount, reactive, ref, useTemplateRef, watch } from "vue";
import TriggerConditionListGroupItem from "./TriggerConditionListGroupItem.vue";

const props = defineProps<{
	triggerData: TriggerData;
	triggerAction?: TriggerActionData;
	conditions?: TriggerConditionGroup;
	actionContext?: boolean;
}>();

const emit = defineEmits<{
	empty: [];
}>();

const placeholderList = ref<ITriggerPlaceholder<unknown>[]>([]);
const expanded = ref(false);
const rootEl = useTemplateRef<HTMLElement>("rootEl");

onBeforeMount(() => {
	if (props.actionContext !== false && props.conditions?.conditions.length == 0) {
		addCondition();
		expand();
	}
});

onBeforeUnmount(() => {
	if (props.actionContext !== false) {
		document.removeEventListener("mousedown", handleClickOutside);
	}
});

function addCondition(): void {
	if (props.conditions) {
		props.conditions.conditions.push({
			id: Utils.getUUID(),
			type: "condition",
			operator: "=",
			placeholder: "",
			value: "",
		});
	} else if (props.actionContext === false) {
		//This will automatically mutate the "condition" prop
		props.triggerData.conditions = reactive<TriggerConditionGroup>({
			id: Utils.getUUID(),
			type: "group",
			conditions: [
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
}

function cleanEmptyConditionNodes(group: TriggerConditionGroup): void {
	if (group.conditions.length == 1 && group.conditions[0]!.type == "group") {
		//Group contains only one item, bring them to parent
		let subgroup: TriggerConditionGroup = group.conditions[0]!;
		group.conditions = subgroup.conditions;
		group.operator = subgroup.operator;
	} else {
		for (let i = 0; i < group.conditions.length; i++) {
			const node = group.conditions[i]!;
			if (node.type == "group") {
				if (node.conditions.length === 0) {
					//Sub group is empty, delete it
					group.conditions.splice(i, 1);
					i--;
				} else if (node.conditions.length === 1) {
					//Sub group only has one item, bring it up
					group.conditions = group.conditions.concat(node.conditions);
					group.conditions.splice(i, 1);
					i--;
				} else {
					cleanEmptyConditionNodes(node);
				}
			}
		}
	}
}

function expand(): void {
	updatePlaceholderList();
	expanded.value = true;
	document.addEventListener("mousedown", handleClickOutside);
}

function handleClickOutside(event: MouseEvent): void {
	const target = event.target as HTMLElement;
	let parent = target.parentElement;
	while (parent) {
		//Don't close conditions if clicking on a tooltip's content
		//a tooltip is used for the placeholder list on the condition's value input
		if (parent.classList.contains("tippy-content")) return;
		if (parent.classList.contains("vs__dropdown-menu")) return;
		parent = parent.parentElement;
	}
	if (!rootEl.value?.contains(target)) {
		expanded.value = false;
	}
}

/**
 * Get all placeholders available for the current trigger action
 * Loads up all trigger related placeholders, chat command params and looks
 * for any Random Value trigger action declaring a placeholder BEFORE the
 * current action.
 */
function updatePlaceholderList(): void {
	placeholderList.value = TriggerUtils.getActionPlaceholderList(
		props.triggerAction!,
		props.triggerData,
	);
}

watch(
	() => props.conditions,
	() => {
		if (props.conditions) {
			cleanEmptyConditionNodes(props.conditions);
		}
		if (props.conditions?.conditions.length == 0) {
			emit("empty");
		}
	},
	{ deep: true },
);
</script>

<style scoped lang="less">
.triggerconditionlist {
	display: flex;
	flex-direction: column;
	gap: 0.5em;
	align-items: center;

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		width: 100%;
	}
}

.collapsed {
	margin: auto;
	padding: 0;
	background-color: transparent;
	border-bottom-left-radius: 0;
	border-bottom-right-radius: 0;
	&:after {
		// content: "";
		display: block;
		width: 2px;
		background-color: var(--color-primary);
		height: 10px;
		margin: auto;
	}
}
</style>
