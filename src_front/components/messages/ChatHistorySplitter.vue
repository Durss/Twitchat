<template>
	<div class="chathistorysplitter chatMessage">
		<Splitter theme="alert">{{ $t("chat.splitter.label") }}</Splitter>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Splitter from "../Splitter.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageHistorySplitterData;
}>();
const emits = defineEmits<{
	onRead: [];
}>();
</script>

<style scoped lang="less">
.chathistorysplitter {
	line-height: 0.8em;
}
</style>
