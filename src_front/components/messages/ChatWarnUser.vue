<template>
	<div class="chatwarnuser chatMessage highlight error"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="alert" alt="alert" class="icon"/>

		<div class="messageHolder">
			<i18n-t scope="global" keypath="chat.warn_chatter.title">
				<template #USER>
					<a class="userlink"
						:href="'https://twitch.tv/'+messageData.user.login"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #MODERATOR>
					<a class="userlink"
						:href="'https://twitch.tv/'+messageData.moderator.login"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.moderator, messageData.channel_id)">{{messageData.moderator.displayName}}</a>
				</template>
			</i18n-t>

			<div class="prompt quote" v-if="messageData.customReason">{{ messageData.customReason }}</div>

			<ul class="prompt quote" v-if="messageData.rules?.length > 0">
				<li v-for="rule in messageData.rules">{{ rule }}</li>
			</ul>
		</div>
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
class ChatWarnUser extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageWarnUserData;

}
export default toNative(ChatWarnUser);
</script>

<style scoped lang="less">
.chatwarnuser{
	ul {
		list-style-position: inside;
	}
}
</style>