<template>
	<div class="chatstreamsocketaction chatMessage highlight"
		@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>

		<Icon name="streamsocket" alt="streamsocket" class="icon"/>

		<i18n-t scope="global" keypath="chat.stream_socket.action" tag="span" class="holder">
			<template #USER>
				<a class="userlink"
					:href="getProfilePage(messageData.user)"
					target="_blank"
					@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id, messageData.platform)">{{messageData.user.displayName}}</a>
			</template>
			<template #ACTION>
				<strong>{{messageData.actionName}}</strong>
			</template>
		</i18n-t>

		<div class="bits" v-if="messageData.bits || 10">
			<Icon name="bits" />
			<strong>{{ messageData.bits || 10 }}</strong>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import Icon from '../Icon.vue';

@Component({
	components:{
		Icon,
	},
	emits:[],
})
class ChatStreamSocketAction extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageStreamSocketActionData;

}
export default toNative(ChatStreamSocketAction);
</script>

<style scoped lang="less">
.chatstreamsocketaction{
	.holder {
		flex-grow: 1;
	}
	.bits {
		gap: .25em;
		display: flex;
		flex-direction: row;
		align-items: center;
		font-size: 1.25em;
		.icon {
			height: 1em;
		}
	}

}
</style>
