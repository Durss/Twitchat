<template>
	<div class="chatunban">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="$image('icons/unban.svg')" alt="notice" class="icon">
		
		<i18n-t scope="global" tag="span" :keypath="messageData.moderator? 'global.moderation_action.unbanned_by' : 'global.moderation_action.unbanned'">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" v-if="messageData.moderator" @click.stop="openUserCard(messageData.moderator!)">{{messageData.moderator.displayName}}</a>
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
export default class ChatBan extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageBanData;
	
	public mounted():void {
		let aria = "";
		if(this.messageData.moderator) {
			aria = this.$t("global.moderation_action.unbanned_by", {MODERATOR:this.messageData.moderator.displayName, USER:this.messageData.user.displayName});
		}else{
			aria = this.$t("global.moderation_action.unbanned", {USER:this.messageData.user.displayName});
		}
		this.$store("accessibility").setAriaPolite(aria);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

}
</script>

<style scoped lang="less">
.chatunban{
	.chatMessageHighlight();
	background-color: fade(@mainColor_normal, 10%);
	
	.userlink {
		color: var(--mainColor_normal_light);
	}
}
</style>