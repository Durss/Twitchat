<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/follow.svg" alt="follow" class="icon">

		<i18n-t scope="global" tag="span" keypath="chat.follow">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard()">{{messageData.user.displayName}}</a>
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
	emits:["onRead"],
})
export default class ChatFollow extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageFollowingData;

	public get classes():string[] {
		let res = ["chatfollow", "chatMessage", "highlight"];
		if(this.messageData.deleted === true) res.push("deleted");
		return res;
	}

	public openUserCard():void {
		this.$store("users").openUserCard(this.messageData.user, this.messageData.channel_id);
	}

}
</script>

<style scoped lang="less">
.chatfollow{
}
</style>