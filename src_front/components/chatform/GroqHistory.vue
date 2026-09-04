<template>
	<div class="groqhistory sidePanel" ref="rootEl">
		<div class="head">
			<div class="title">
				<Icon name="groq" />
				<h1>{{ t("groq.history.title") }}</h1>
			</div>

			<ClearButton @click="close()" />
		</div>

		<div class="content" ref="holder">
			<GroqHistoryItem
				class="card-item"
				v-for="entry in entries"
				:key="entry.id"
				:entry="entry"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import { useSidePanel } from "@/composables/useSidePanel";
import ClearButton from "../ClearButton.vue";
import GroqHistoryItem from "./GroqHistoryItem.vue";

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const storeGroq = useStoreGroq();
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const holder = useTemplateRef<HTMLDivElement>("holder");
const { close } = useSidePanel(rootEl, emit);

const pageindex = 0;
const itemsPerPage = 20;

const entries = computed(() => {
	const list = storeGroq.answerHistory;
	const start = Math.max(0, list.length - (pageindex + 1) * itemsPerPage);
	return list.slice(start, start + itemsPerPage);
});

onMounted(() => {
	const el = holder.value!;
	el.scrollTop = el.scrollHeight;
	watch(
		() => storeGroq.answerHistory,
		() => {
			nextTick(() => {
				el.scrollTop = el.scrollHeight;
			});
		},
		{ deep: true },
	);
});
</script>

<style scoped lang="less">
.groqhistory {
	.content {
		overflow-y: auto;
	}
}
</style>
