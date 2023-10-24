<template>
	<div class="chatban chatMessage highlight alert">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon name="timeout" class="icon" v-if="messageData.duration_s" theme="light" />
		<Icon name="ban" class="icon" v-else theme="light" />
		
		<div class="content">
			<i18n-t scope="global" class="label" v-if="messageData.duration_s" tag="span" :keypath="messageData.moderator? 'global.moderation_action.timeout_by': 'global.moderation_action.timeout'">
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
			<i18n-t scope="global" class="label" v-else tag="span" :keypath="messageData.moderator? 'global.moderation_action.banned_by': 'global.moderation_action.banned'">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
				</template>
				<template #MODERATOR>
					<a class="userlink" v-if="messageData.moderator" @click.stop="openUserCard(messageData.moderator!)">{{messageData.moderator.displayName}}</a>
				</template>
			</i18n-t>
			<Button light alert small icon="unban" :loading="unbanning" v-if="showUnbanBt" @click="unbanUser()">{{ $t("global.moderation_action.unbanBt") }}</Button>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Utils from '@/utils/Utils';
import { Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage.vue';
import Button from '../Button.vue';
import TwitchUtils from '@/utils/twitch/TwitchUtils';

@Component({
	components:{
		Button,
	},
	emits:["onRead"]
})
export default class ChatBan extends AbstractChatMessage {
	
	@Prop	
	declare messageData:TwitchatDataTypes.MessageBanData;

	public unbanning:boolean = false;
	public showUnbanBt:boolean = true;

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

		this.showUnbanBt = this.messageData.user.channelInfo[this.messageData.channel_id].is_banned
						&& super.canModerateUser(this.messageData.user, this.messageData.channel_id);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

	public async unbanUser():Promise<void> {
		this.unbanning = true;
		await TwitchUtils.unbanUser(this.messageData.user, this.messageData.channel_id);
		await Utils.promisedTimeout(250);
		this.unbanning = false;
		this.showUnbanBt = false;
	}
}
</script>

<style scoped lang="less">
.chatban{
	.content {
		row-gap: .5em;
		column-gap: 1em;
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		flex-grow: 1;
		.label {
			align-self: flex-start;
			flex-grow: 1;
		}
	}
}
</style>