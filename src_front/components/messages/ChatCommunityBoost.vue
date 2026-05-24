<template>
	<div class="chatcommunityboost chatMessage highlight">
		<Icon name="boost" alt="boost" class="icon" />

		<i18n-t scope="global" tag="span" keypath="chat.boosted">
			<template #COUNT>
				<strong>{{ messageData.viewers }}</strong>
			</template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { toNative, Component, Prop } from "vue-facing-decorator";
import AbstractChatMessage from "./AbstractChatMessage";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageCommunityBoostData;
}>();
</script>

<style scoped lang="less">
.chatcommunityboost {
}
</style>
