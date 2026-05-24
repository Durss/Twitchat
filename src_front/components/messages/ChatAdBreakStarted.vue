<template>
	<div class="chatadbreakstarted chatMessage highlight" ref="rootEl">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{
			time
		}}</span>

		<Icon name="ad" alt="follow" class="icon" />

		<i18n-t scope="global" tag="span" keypath="chat.ad_break_start.label">
			<template #USER>
				<a
					v-if="messageData.startedBy"
					class="userlink"
					@click.stop="openUserCard(messageData.startedBy!, messageData.channel_id)"
					>{{ messageData.startedBy!.displayName }}</a
				>
				<strong v-else>???</strong>
			</template>
			<template #DURATION>
				<strong>{{ duration }}</strong>
			</template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { useTemplateRef } from "vue";
import Icon from "../Icon.vue";

const rootEl = useTemplateRef("rootEl");
const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();
const props = defineProps<{
	messageData: TwitchatDataTypes.MessageAdBreakStartData;
}>();
const duration = Utils.formatDuration(props.messageData.duration_s * 1000);
const { time, openUserCard } = useChatMessage(props, emit, rootEl);
</script>

<style scoped lang="less">
.chatadbreakstarted {
}
</style>
