<template>
	<div class="chatmanyreplies chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="reply_many" class="icon" />

		<div class="holder">
			<i18n-t scope="global" tag="div" keypath="chat.many_replies.label">
				<template #COUNT>
					<strong>{{ messageData.message.answers.length }}</strong>
				</template>
			</i18n-t>
			<ChatMessage class="quote" :messageData="messageData.message" lightMode />
			<ToggleBlock class="answers" title="view replies" small :open="false">
				<div v-for="answer in messageData.message.answers" :key="answer.id" style="margin-bottom: 0.5em;">
					<ChatMessage :messageData="answer" lightMode />
				</div>
			</ToggleBlock>
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessage from './ChatMessage.vue';
import ToggleBlock from '../ToggleBlock.vue';

@Component({
	components:{
		ChatMessage,
		ToggleBlock,
	},
	emits:["onRead"]
})
class ChatManyReplies extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageManyRepliesData;
}
export default toNative(ChatManyReplies);
</script>

<style scoped lang="less">
.chatmanyreplies{
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
				opacity: .75;
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