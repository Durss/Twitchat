<template>
	<div
		ref="rootEl"
		class="chatmodiversary chatMessage highlight"
		@contextmenu="onContextMenu($event, props.messageData, $el)"
	>
		<Icon name="modiversary" alt="modiversary" class="icon" />

		<i18n-t scope="global" tag="div" keypath="chat.user_modiversary.label">
			<template #USER>
				<a
					class="userlink"
					@click="openUserCard(props.messageData.user, props.messageData.channel_id)"
					>{{ props.messageData.user.displayName }}</a
				>
			</template>
			<template #MONTHS>
				<strong>{{ props.messageData.months }}</strong>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts" setup>
import { useChatMessage } from "@/composables/useChatMessage";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useTemplateRef } from "vue";

const props = defineProps<{ messageData: TwitchatDataTypes.MessageModiversaryData }>();
const emit = defineEmits<{
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef("rootEl");
const { openUserCard, onContextMenu } = useChatMessage(props, emit, rootEl);
</script>

<style scoped lang="less">
.chatmodiversary {
}
</style>
