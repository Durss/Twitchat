<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon :name="messageData.type=='pinned'? 'pin' : 'unpin'" alt="notice" class="icon" />

		<div class="holder">
			<i18n-t scope="global" tag="div" :keypath="labelKey">
				<template #MODERATOR>
					<a class="userlink"
					v-if="messageData.moderator"
					@click.stop="openUserCard(messageData.moderator!, messageData.channel_id)">{{messageData.moderator!.displayName}}</a>
				</template>
			</i18n-t>
	
			<ChatMessage class="quote" :messageData="messageData.chatMessage" lightMode />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessage from './ChatMessage.vue';

@Component({
	components:{
		ChatMessage,
	},
	emits:["onRead"]
})
class ChatPinNotice extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessagePinData|TwitchatDataTypes.MessageUnpinData;

	public get classes():string[] {
		const res = ["chatpinnotice", "chatMessage", "highlight"];
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.UNPINNED) {
			res.push("unpinned");
		}
		return res;
	}

	public get labelKey():string {
		if(this.messageData.type == TwitchatDataTypes.TwitchatMessageType.PINNED) {
			return "chat.pin.pinned";
		}else{
			if(this.messageData.moderator) {
				return "chat.pin.unpinned_by"
			}
		}
		return "chat.pin.unpinned";
	}
}
export default toNative(ChatPinNotice);
</script>

<style scoped lang="less">
.chatpinnotice{
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
}
</style>