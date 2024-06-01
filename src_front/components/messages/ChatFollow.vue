<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="follow" alt="follow" class="icon" />

		<Icon name="youtube" v-if="messageData.platform == 'youtube'" v-tooltip="$t('chat.youtube.platform_youtube')" />

		<i18n-t scope="global" tag="span" keypath="chat.follow">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"],
})
 class ChatFollow extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageFollowingData;

	public get classes():string[] {
		let res = ["chatfollow", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}

	public openUserCard():void {
		this.$store.users.openUserCard(this.messageData.user, this.messageData.channel_id);
	}

}
export default toNative(ChatFollow);
</script>

<style scoped lang="less">
.chatfollow{
}
</style>