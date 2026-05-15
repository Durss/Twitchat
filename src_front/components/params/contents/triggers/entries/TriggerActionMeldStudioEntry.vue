<template>
	<div class="triggeractionmeldstudioentry triggerActionForm" v-if="action.meldstudioData">
		<ParamItem :paramData="param_action" v-model="action.meldstudioData.action" noBackground />
	</div>
</template>

<script setup lang="ts">
import ParamItem from "@/components/params/ParamItem.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import type {
	ITriggerPlaceholder,
	TriggerActionMeldStudioData,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { onBeforeMount, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = withDefaults(
	defineProps<{
		action: TriggerActionMeldStudioData;
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
		NonNullable<TriggerActionMeldStudioData["meldstudioData"]>["action"],
		NonNullable<TriggerActionMeldStudioData["meldstudioData"]>["action"]
	>
>({
	type: "list",
	value: "unset",
	labelKey: "triggers.actions.meldstudio.param_action",
});

type ActionKeys = NonNullable<TriggerActionMeldStudioData["meldstudioData"]>["action"];
const actions: Record<ActionKeys, boolean> = {
	unset: true,
	clip_record: true,
	show_scene: true,
	screenshot: true,
	layer_visibility: true,
	start_record: true,
	stop_record: true,
	start_stream: true,
	stop_stream: true,
	toggle_effect: true,
	track_mute: true,
};
param_action.value.listValues = [];
for (const key in actions) {
	if (!Object.hasOwn(actions, key)) continue;
	param_action.value.listValues.push({
		value: key as ActionKeys,
		labelKey: `triggers.actions.meldstudio.actions.${key}`,
	});
}

onBeforeMount(() => {
	if (!props.action.meldstudioData) {
		props.action.meldstudioData = {
			action: "unset",
		};
	}
});

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	// param_post.value.placeholderList = list;
}

useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);
</script>

<style scoped lang="less">
.triggeractionmeldstudioentry {
}
</style>
