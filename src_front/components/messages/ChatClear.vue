<template>
	<div class="chatclear">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<i18n-t scope="global" tag="span" keypath="chat.clear.title">
			<template #ROOM><strong>#{{room}}</strong></template>
			<template #USER>
				<i18n-t scope="global" tag="span" v-if="!messageData.fromAutomod && messageData.user" keypath="chat.clear.title_by">
					<template #USER>
						<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
					</template>
				</i18n-t>
				<i18n-t scope="global" tag="span" v-else-if="messageData.fromAutomod" keypath="chat.clear.title_by">
					<template #USER><strong>automod</strong></template>
				</i18n-t>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatClear extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageClearChatData;
	
	public room:string = "";

	public mounted():void {
		this.room = this.$store("users").getUserFrom(this.messageData.platform, this.messageData.channel_id, this.messageData.channel_id).login;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user!);
	}

}
</script>

<style scoped lang="less">
.chatclear{
	.chatMessageHighlight();
}
</style>