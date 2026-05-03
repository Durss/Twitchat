<template>
	<div class="triggeractionclickheatentry">
		<ParamItem :paramData="param_overlay" v-model="props.action.heatClickData.overlayId" />
		<template v-if="isHeatTrigger">
			<ParamItem :paramData="param_forward" v-model="props.action.heatClickData.forward" />
		</template>
		<template v-if="!isHeatTrigger || !param_forward.value">
			<ParamItem :paramData="param_x" v-model="props.action.heatClickData.x" />
			<ParamItem :paramData="param_y" v-model="props.action.heatClickData.y" />
			<ParamItem :paramData="param_ctrl" v-model="props.action.heatClickData.ctrl" />
			<ParamItem :paramData="param_shift" v-model="props.action.heatClickData.shift" />
			<ParamItem :paramData="param_alt" v-model="props.action.heatClickData.alt" />
		</template>
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import { storeHeat as useStoreHeat } from "@/store/heat/storeHeat";
import {
	TriggerTypes,
	type ITriggerPlaceholder,
	type TriggerActionHeatClickData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onBeforeMount, ref } from "vue";

const props = defineProps<{
	action: TriggerActionHeatClickData;
	triggerData: TriggerData;
}>();

const storeHeat = useStoreHeat();

const param_overlay = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "list",
	value: "",
	labelKey: "triggers.actions.heat_click.param_overlay",
});
const param_forward = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: true,
	labelKey: "triggers.actions.heat_click.param_forward",
});
const param_x = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 500,
	labelKey: "triggers.actions.heat_click.param_x",
});
const param_y = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	maxLength: 500,
	labelKey: "triggers.actions.heat_click.param_y",
});
const param_ctrl = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "triggers.actions.heat_click.param_ctrl",
});
const param_shift = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "triggers.actions.heat_click.param_shift",
});
const param_alt = ref<TwitchatDataTypes.ParameterData<boolean>>({
	type: "boolean",
	value: false,
	labelKey: "triggers.actions.heat_click.param_alt",
});

const isHeatTrigger = computed((): boolean => {
	return props.triggerData.type == TriggerTypes.HEAT_CLICK;
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	param_x.value.placeholderList = list.filter((v) => v.numberParsable == true);
	param_y.value.placeholderList = list.filter((v) => v.numberParsable == true);
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

onBeforeMount(() => {
	if (!props.action.heatClickData) {
		props.action.heatClickData = {
			overlayId: "",
			forward: isHeatTrigger.value,
			x: "",
			y: "",
			alt: false,
			shift: false,
			ctrl: false,
		};
	}
	param_overlay.value.listValues = storeHeat.distortionList.map((v) => {
		let label = "";
		if (v.name) {
			label = v.name;
		} else {
			const chunks: string[] = [];
			if (v.obsItemPath.sceneName) chunks.push(v.obsItemPath.sceneName);
			if (v.obsItemPath.groupName) chunks.push(v.obsItemPath.groupName);
			if (v.obsItemPath.source.name) chunks.push(v.obsItemPath.source.name);
			label = chunks.join(" => ");
		}
		return { value: v.id, label };
	});
});
</script>

<style scoped lang="less">
.triggeractionclickheatentry {
	&,
	.list {
		gap: 0.25em;
		display: flex;
		flex-direction: column;
	}
}
</style>
