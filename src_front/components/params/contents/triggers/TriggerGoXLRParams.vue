<template>
	<div class="triggergoxlrparams">
		<div class="title">
			<Icon name="click" />{{ $t("triggers.actions.goxlr.select_button") }}
		</div>
		<GoXLRUI v-model="triggerData.goxlrButtons" />
	</div>
</template>

<script setup lang="ts">
import Icon from "@/components/Icon.vue";
import GoXLRUI from "@/components/goxlr/GoXLRUI.vue";
import type { TriggerData } from "@/types/TriggerActionDataTypes";
import { onMounted } from "vue";

const props = defineProps<{
	triggerData: TriggerData;
}>();

onMounted(() => {
	if (!props.triggerData.goxlrButtons) {
		props.triggerData.goxlrButtons = [];
	}
});
</script>

<style scoped lang="less">
.triggergoxlrparams {
	.title {
		margin-bottom: 0.5em;
		.icon {
			width: 1em;
			height: 1em;
			margin-right: 0.5em;
		}
	}
}
</style>
