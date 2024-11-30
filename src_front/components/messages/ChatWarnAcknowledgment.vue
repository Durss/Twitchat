<template>
	<div class="chatwarnuser chatMessage highlight success"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="alert" alt="alert" class="icon"/>

		<i18n-t tag="div" scope="global" keypath="chat.warn_acknowledge.title">
			<template #USER>
				<a class="userlink"
					:href="'https://twitch.tv/'+messageData.user.login"
					target="_blank"
					@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{
	},
	emits:["onRead"],
})
class ChatWarnAcknowledgment extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageWarnAcknowledgementData;

}
export default toNative(ChatWarnAcknowledgment);
</script>

<style scoped lang="less">
.chatwarnuser{
	ul {
		list-style-position: inside;
	}
}
</style>