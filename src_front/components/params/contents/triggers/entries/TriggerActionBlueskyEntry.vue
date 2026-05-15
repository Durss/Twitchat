<template>
	<div class="triggeractionblueskyentry triggerActionForm" v-if="action.blueskyData">
		<ParamItem :paramData="param_action" v-model="action.blueskyData.action" noBackground />
		<ParamItem
			v-if="action.blueskyData.action == 'post'"
			:paramData="param_post"
			v-model="action.blueskyData.postMessage"
			noBackground
		/>
		<template v-if="action.blueskyData.action == 'get_latest_post'">
			<ParamItem
				:paramData="param_getPostPlaceholderMessage"
				v-model="action.blueskyData.getPostPlaceholderMessage"
				noBackground
			/>
			<ParamItem
				:paramData="param_getPostPlaceholderURL"
				v-model="action.blueskyData.getPostPlaceholderURL"
				noBackground
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import type {
	ITriggerPlaceholder,
	TriggerActionBlueskyData,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref } from "vue";

const props = withDefaults(
	defineProps<{
		action: TriggerActionBlueskyData;
		triggerData?: TriggerData;
	}>(),
	{
		triggerData: () => [] as unknown as TriggerData,
		obsScenes: () => [],
		obsSources: () => [],
		obsInputs: () => [],
	},
);

const param_action = ref<
	TwitchatDataTypes.ParameterData<
		NonNullable<TriggerActionBlueskyData["blueskyData"]>["action"],
		NonNullable<TriggerActionBlueskyData["blueskyData"]>["action"]
	>
>({
	type: "list",
	value: "post",
	listValues: [
		{ value: "post", labelKey: "triggers.actions.bluesky.actions.post" },
		{ value: "get_latest_post", labelKey: "triggers.actions.bluesky.actions.get_latest_post" },
	],
	labelKey: "triggers.actions.bluesky.param_action",
});
const param_post = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "string",
	value: "",
	labelKey: "triggers.actions.bluesky.param_post",
});
const param_getPostPlaceholderMessage = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "placeholder",
	value: "",
	labelKey: "triggers.actions.bluesky.param_getPostPlaceholderMessage",
});
const param_getPostPlaceholderURL = ref<TwitchatDataTypes.ParameterData<string>>({
	type: "placeholder",
	value: "",
	labelKey: "triggers.actions.bluesky.param_getPostPlaceholderURL",
});

onBeforeMount(() => {
	if (!props.action.blueskyData) {
		props.action.blueskyData = {
			action: "post",
		};
	}
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	param_post.value.placeholderList = list;
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);
</script>

<style scoped lang="less">
.triggeractionblueskyentry {
}
</style>
