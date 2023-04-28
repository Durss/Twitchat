<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>

		<img :src="$image(messageData.type=='pinned'? 'icons/pin.svg' : 'icons/unpin.svg')" alt="notice" class="icon">

		<div class="holder">
			<i18n-t scope="global" tag="div" :keypath="labelKey">
				<template #MODERATOR>
					<a class="userlink"
					v-if="messageData.moderator"
					@click.stop="openUserCard(messageData.moderator!)">{{messageData.moderator!.displayName}}</a>
				</template>
			</i18n-t>
	
			<ChatMessage class="message" :messageData="messageData.chatMessage" />
		</div>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';
import ChatMessage from './ChatMessage.vue';

@Component({
	components:{
		ChatMessage,
	},
	emits:["onRead"]
})
export default class ChatPinNotice extends AbstractChatMessage {
	
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

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}
}
</script>

<style scoped lang="less">
.chatpinnotice{
	.holder {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		.message {
			padding: .25em;
			width: 100%;
			flex-grow: 1;
			font-size: 1em;
			background-color: var(--mainColor_dark);
		}
	}

	&.unpinned {
		.holder {
			.message {
				text-decoration: line-through;
				opacity: .75;
				font-style: italic;
			}
		}
	}
}
</style>