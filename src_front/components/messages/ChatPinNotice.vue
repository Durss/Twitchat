<template>
	<div :class="classes" ref="rootEl">
		<Icon :name="messageData.type == 'pinned' ? 'pin' : 'unpin'" alt="notice" class="icon" />

		<div class="holder">
			<i18n-t scope="global" tag="div" :keypath="labelKey">
				<template #MODERATOR>
					<a
						class="userlink"
						v-if="messageData.moderator"
						@click.stop="openUserCard(messageData.moderator!, messageData.channel_id)"
						>{{ messageData.moderator!.displayName }}</a
					>
				</template>
			</i18n-t>

			<ChatMessage class="quote" :messageData="messageData.chatMessage" lightMode />
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { computed, useTemplateRef } from "vue";
import ChatMessage from "./ChatMessage.vue";

const props = defineProps<{
	messageData: TwitchatDataTypes.MessagePinData | TwitchatDataTypes.MessageUnpinData;
}>();

const emit = defineEmits<{
	onRead: [];
}>();

const rootEl = useTemplateRef("rootEl");
const { time, openUserCard } = useChatMessage(props, emit, rootEl);

const classes = computed(() => {
	const res = ["chatpinnotice", "chatMessage", "highlight"];
	if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.UNPINNED) {
		res.push("unpinned");
	}
	return res;
});

const labelKey = computed(() => {
	if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.PINNED) {
		return "chat.pin.pinned";
	} else {
		if (props.messageData.moderator) {
			return "chat.pin.unpinned_by";
		}
	}
	return "chat.pin.unpinned";
});
</script>

<style scoped lang="less">
.chatpinnotice {
	.holder {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		.quote {
			font-size: 1em;
		}
	}

	&.unpinned {
		.holder {
			.quote {
				opacity: 0.75;
				text-decoration: line-through;
				&:hover {
					text-decoration: none;
				}
			}
		}
	}
}
</style>
