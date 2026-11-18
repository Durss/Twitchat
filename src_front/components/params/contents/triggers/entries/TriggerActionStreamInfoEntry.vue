<template>
	<div class="triggeractionstreaminfoentry triggerActionForm">
		<StreamInfoSubForm
			v-if="!loading"
			v-model:title="title"
			v-model:tags="tags"
			v-model:category="category"
			v-model:branded="branded"
			v-model:labels="labels"
			:placeholderList="placeholderList"
			triggerMode
		/>

		<Icon v-else name="loader" class="loader" />
	</div>
</template>

<script setup lang="ts">
import StreamInfoSubForm from "@/components/streaminfo/StreamInfoSubForm.vue";
import { useTriggerActionPlaceholders } from "@/composables/useTriggerActionPlaceholders";
import type {
	ITriggerPlaceholder,
	TriggerActionStreamInfoData,
	TriggerData,
} from "@/types/TriggerActionDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { ref, watch } from "vue";

const props = defineProps<{
	action: TriggerActionStreamInfoData;
	triggerData: TriggerData;
}>();
const loading = ref(!!props.action.categoryId);
const title = ref(props.action.title);
const tags = ref(props.action.tags || []);
const branded = ref(props.action.branded === true);
const labels = ref(props.action.labels || []);
const category = ref<TwitchDataTypes.StreamCategory | null>(null);
const placeholderList = ref<ITriggerPlaceholder<any>[]>([]);
useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

if (props.action.categoryId) {
	TwitchUtils.getCategoryByID(props.action.categoryId).then((c) => {
		category.value = c ?? null;
		loading.value = false;
	});
}

watch([title, tags, category, labels, branded], () => onChange());

function onChange(): void {
	props.action.categoryId = category.value?.id ?? "";
	props.action.title = title.value;
	props.action.tags = tags.value;
	props.action.branded = branded.value;
	props.action.labels = labels.value;
}

/**
 * Called when the available placeholder list is updated
 */
function onPlaceholderUpdate(list: ITriggerPlaceholder<any>[]): void {
	placeholderList.value = list;
}
</script>

<style scoped lang="less">
.triggeractionstreaminfoentry {
	min-height: 2em; //Makes sure the loader is visible on trigger open
	.loader {
		height: 2em;
		width: 2em;
		margin: auto;
	}
}
</style>
