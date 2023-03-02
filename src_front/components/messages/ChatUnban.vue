<template>
	<div class="chatunban" @click.capture.ctrl.stop="copyJSON()"
	@click="$emit('onRead', messageData, $event)">
		<span class="time" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="$image('icons/unban.svg')" alt="notice" class="icon">
		
		<i18n-t scope="global" tag="span" keypath="global.moderation_action.unbanned_by">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" @click.stop="openUserCard(messageData.moderator)">{{messageData.moderator.displayName}}</a>
			</template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import gsap from 'gsap';
import { Component, Prop, Vue } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatBan extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageBanData;
	
	public mounted():void {
		let aria = this.$t("global.moderation_action.unbanned_by", {MODERATOR:this.messageData.moderator.displayName, USER:this.messageData.user.displayName});
		this.$store("accessibility").setAriaPolite(aria);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

	public copyJSON():void {
		Utils.copyToClipboard(JSON.stringify(this.messageData));
		console.log(this.messageData);
		gsap.fromTo(this.$el, {scale:1.2}, {duration:.5, scale:1, ease:"back.out(1.7)"});
	}
}
</script>

<style scoped lang="less">
.chatunban{
	.chatMessageHighlight();
	background-color: fade(@mainColor_normal, 10%);
	
	.userlink {
		color: @mainColor_normal_light;
	}
}
</style>