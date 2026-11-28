<template>
	<span class="messagetime" :class="{ extraGap }">
		{{ time }}
	</span>
</template>

<script setup lang="ts">
import { useMessageTime } from "@/composables/useMessageTime";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed } from "vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.ChatMessageTypes;
}>();

const time = useMessageTime(() => props.messageData);

const extraGap = computed(() => {
	if (props.messageData.type === "message" && props.messageData.twitch_announcementColor)
		return true;
	return false;
});
</script>

<style scoped lang="less">
.messagetime {
	font-size: calc(var(--messageSize) * 0.9);
	font-family: var(--font-roboto);
	opacity: 0.7;
	align-self: flex-start;
	color: var(--color-text);

	&.extraGap {
		margin-right: 0.8em;
	}
}
</style>
