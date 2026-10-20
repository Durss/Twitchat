<template>
	<div
		class="chatwatchstreak chatMessage highlight"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
		ref="rootEl"
	>
		<Icon name="watchStreak" alt="notice" class="icon" />

		<div class="holder">
			<i18n-t
				scope="global"
				tag="span"
				keypath="chat.watch_streak.label"
				:class="{ messageWithTime: !showQuote }"
			>
				<template #USER>
					<a
						class="userlink"
						@click="openUserCard(props.messageData.user, props.messageData.channel_id)"
						>{{ props.messageData.user.displayName }}</a
					>
				</template>
				<template #COUNT>
					<strong>{{ props.messageData.streak }}</strong>
				</template>
				<template #POINTS>
					<strong>{{ props.messageData.channelPointsEarned }}</strong>
				</template>
			</i18n-t>

			<div class="quote messageWithTime" v-if="showQuote">
				<ChatMessageChunksParser
					:chunks="props.messageData.message_chunks!"
					:channel="props.messageData.channel_id"
					:platform="props.messageData.platform"
				/>
			</div>
			<MessageTranslation :messageData="props.messageData" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeAccessibility as useStoreAccessibility } from "@/store/accessibility/storeAccessibility";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, onMounted, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import MessageTranslation from "./MessageTranslation.vue";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageWatchStreakData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();
const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const { t } = useI18n();
const storeAccessibility = useStoreAccessibility();
const rootEl = useTemplateRef("rootEl");
const { onContextMenu, openUserCard } = useChatMessage(props, emit, rootEl);

const showQuote = computed(() => {
	return (props.messageData.message_chunks || []).length > 0;
});

onMounted(() => {
	const aria = t("chat.watch_streak.label", {
		USER: props.messageData.user.displayName,
		COUNT: props.messageData.streak,
	});
	storeAccessibility.setAriaPolite(aria);
});
</script>

<style scoped lang="less">
.chatwatchstreak {
	.holder {
		gap: 0.5em;
		display: flex;
		flex-direction: column;
	}
}
</style>
