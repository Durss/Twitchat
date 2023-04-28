<template>
	<div class="chatban chatMessage highlight">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img :src="$image('icons/timeout.svg')" alt="notice" class="icon" v-if="messageData.duration_s">
		<img :src="$image('icons/ban.svg')" alt="notice" class="icon" v-else>
		
		<i18n-t scope="global" v-if="messageData.duration_s" tag="span" :keypath="messageData.moderator? 'global.moderation_action.timeout_by': 'global.moderation_action.timeout'">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
			</template>
			<template #MODERATOR>
				<a class="userlink" v-if="messageData.moderator" @click.stop="openUserCard(messageData.moderator!)">{{messageData.moderator.displayName}}</a>
			</template>
			<template #DURATION>
				<strong>{{ formatedBanDuration }}</strong>
			</template>
		</i18n-t>
		<i18n-t scope="global" v-else tag="span" :keypath="messageData.moderator? 'global.moderation_action.banned_by': 'global.moderation_action.banned'">
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
import Utils from '@/utils/Utils';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';

@Component({
	components:{},
	emits:["onRead"]
})
export default class ChatBan extends AbstractChatMessage {
	
	@Prop	
	declare messageData:TwitchatDataTypes.MessageBanData;

	public get formatedBanDuration():string{
		return Utils.formatDuration(this.messageData.duration_s!*1000);
	}

	public mounted():void {
		let aria = "";
		if(this.messageData.duration_s) {
			if(this.messageData.moderator) {
				aria = this.$t("global.moderation_action.timeout_by", {MODERATOR:this.messageData.moderator.displayName, USER:this.messageData.user.displayName, DURATION:this.messageData.duration_s});
			}else{
				aria = this.$t("global.moderation_action.timeout", {USER:this.messageData.user.displayName, DURATION:this.messageData.duration_s});
			}
		}else{
			if(this.messageData.moderator) {
				aria = this.$t("global.moderation_action.banned_by", {MODERATOR:this.messageData.moderator.displayName, USER:this.messageData.user.displayName});
			}else{
				aria = this.$t("global.moderation_action.banned", {USER:this.messageData.user.displayName});
			}
		}
		this.$store("accessibility").setAriaPolite(aria);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}
}
</script>

<style scoped lang="less">
.chatban{
	background-color: fade(@mainColor_warn, 15%);
}
</style>