<template>
	<div class="triggeradapproachparams">
		<ParamItem
			:paramData="param_delay"
			noBackground
			class="delay"
			v-model="triggerData.adBreakDelay"
		/>
	</div>
</template>

<script setup lang="ts">
import { AD_APPROACHING_INTERVALS, type TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref } from "vue";
import ParamItem from "../../ParamItem.vue";
import Utils from "@/utils/Utils";

const props = defineProps<{
	triggerData: TriggerData;
}>();

const param_delay = ref<TwitchatDataTypes.ParameterData<number>>({
	type: "list",
	value: 30000,
	icon: "timer",
	labelKey: "triggers.actions.adBreak.param_delay",
});

onBeforeMount(() => {
	param_delay.value.listValues = AD_APPROACHING_INTERVALS.sort((a, b) => a - b).map((v) => {
		return { value: v, label: Utils.formatDuration(v) + "s" };
	});
	if (!props.triggerData.adBreakDelay) {
		props.triggerData.adBreakDelay = param_delay.value.value;
	}
});
</script>

<style scoped lang="less">
.triggeradapproachparams {
	.delay {
		:deep(select) {
			flex-basis: 100px;
		}
	}
}
</style>
