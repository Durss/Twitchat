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
import { onBeforeMount, ref, watch } from "vue";

const props = defineProps<{
	action: TriggerActionStreamInfoData;
	triggerData: TriggerData;
}>();
const loading = ref<boolean>(true);
const title = ref<string>("");
const tags = ref<string[]>([]);
const branded = ref<boolean>(false);
const labels = ref<{ id: string; enabled: boolean }[]>([]);
const category = ref<TwitchDataTypes.StreamCategory | null>(null);
const placeholderList = ref<ITriggerPlaceholder<any>[]>([]);
useTriggerActionPlaceholders(props.action, props.triggerData, onPlaceholderUpdate);

watch(
	() => title.value,
	() => onChange(),
);
watch(
	() => tags.value,
	() => onChange(),
);
watch(
	() => category.value,
	() => onChange(),
);
watch(
	() => labels.value,
	() => onChange(),
);
watch(
	() => branded.value,
	() => onChange(),
);

onBeforeMount(async () => {
	if (props.action.categoryId) {
		category.value = await TwitchUtils.getCategoryByID(props.action.categoryId);
	}
	title.value = props.action.title;
	tags.value = props.action.tags || [];
	branded.value = props.action.branded === true;
	labels.value = props.action.labels || [];
	loading.value = false;

	watch(
		() => title.value,
		() => onChange(),
	);
	watch(
		() => tags.value,
		() => onChange(),
	);
	watch(
		() => category.value,
		() => onChange(),
	);
	watch(
		() => labels.value,
		() => onChange(),
	);
	watch(
		() => branded.value,
		() => onChange(),
	);
});

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
