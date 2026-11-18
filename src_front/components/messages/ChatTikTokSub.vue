<template>
	<div
		class="chattiktoksub chatMessage highlight"
		ref="rootEl"
		@contextmenu="onContextMenu($event, props.messageData, rootEl!)"
	>
		<Icon name="sub" alt="sub" class="icon" />
		<Icon name="tiktok" alt="tiktok" class="icon" />

		<i18n-t scope="global" keypath="chat.tiktok_sub.new" tag="span" class="messageWithTime">
			<template #USER>
				<a
					class="userlink"
					:href="getProfilePage(props.messageData.user)"
					target="_blank"
					@click.prevent="
						openUserCard(
							props.messageData.user,
							props.messageData.channel_id,
							props.messageData.platform,
						)
					"
					>{{ props.messageData.user.displayName }}</a
				>
			</template>
		</i18n-t>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useTemplateRef } from "vue";
import Icon from "../Icon.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessageTikTokSubData;
	lightMode?: boolean;
	contextMenuOff?: boolean;
}>();

const emit = defineEmits<{ onRead: [] }>();

const rootEl = useTemplateRef("rootEl");
const { openUserCard, onContextMenu, getProfilePage } = useChatMessage(props, emit, rootEl);
</script>

<style scoped lang="less">
.chattiktoksub {
}
</style>
