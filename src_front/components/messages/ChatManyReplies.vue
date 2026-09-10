<template>
	<div class="chatmanyreplies chatMessage highlight" ref="rootEl">
		<Icon name="reply_many" class="icon" />

		<div class="holder">
			<i18n-t scope="global" tag="div" keypath="chat.many_replies.label">
				<template #COUNT>
					<strong>{{ props.messageData.message.answers.length }}</strong>
				</template>
			</i18n-t>
			<ChatMessage class="quote" :messageData="props.messageData.message" lightMode />
			<ToggleBlock class="answers" title="view replies" small :open="false" @click.stop>
				<div
					v-for="answer in props.messageData.message.answers"
					:key="answer.id"
					style="margin-bottom: 0.5em"
				>
					<ChatMessage :messageData="answer" lightMode :disableAnswerParent="true" />
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { useChatMessage } from "@/composables/useChatMessage";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { useTemplateRef } from "vue";
import ToggleBlock from "../ToggleBlock.vue";
import ChatMessage from "./ChatMessage.vue";

const props = defineProps<{ messageData: TwitchatDataTypes.MessageManyRepliesData }>();

const emit = defineEmits<{
	onOverMessage: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef("rootEl");
useChatMessage(props, emit, rootEl);
</script>

<style scoped lang="less">
.chatmanyreplies {
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

	.answers {
		z-index: 0;
	}
}
</style>
