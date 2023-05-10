<template>
	<div class="chatautobanjoin chatMessage highlight">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<img src="@/assets/icons/mod.svg" alt="mod" class="icon">

		<ChatMessageInfoBadges :infos="badgeInfos" />

		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.autoban_join.message">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
				</template>
				<template #RULE>
					<mark>{{ messageData.rule.label }}</mark>
				</template>
			</i18n-t>
	
			<div class="ctas" v-if="canUnban || canBlock">
				<Button white v-if="canUnban"
					small
					:loading="moderating"
					icon="unban"
					@click.stop="unbanUser()">{{ $t('chat.autoban_join.unbanBt') }}</Button>
	
				<Button alert v-if="canBlock"
					small
					:loading="moderating"
					icon="ban"
					@click.stop="blockUser()">{{ $t('chat.autoban_join.banBt') }}</Button>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { Component, Prop } from 'vue-facing-decorator';
import Button from '../Button.vue';
import AbstractChatMessage from './AbstractChatMessage.vue';
import ChatMessageInfoBadges from './components/ChatMessageInfoBadges.vue';

@Component({
	components:{
		Button,
		ChatMessageInfoBadges,
	},
	emits:["onRead"],
})
export default class ChatAutobanJoin extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageAutobanJoinData;

	public moderating = false;
	public canUnban = true;
	public canBlock = true;
	public badgeInfos:TwitchatDataTypes.MessageBadgeData[] = [];

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
		this.badgeInfos.push({type:"automod", tooltip:"<strong>Rule:</strong> "+this.messageData.rule.label});
	}

	public async unbanUser():Promise<void> {
		this.moderating = true;
		if(this.messageData.user.platform == "twitch") {
			await TwitchUtils.unbanUser(this.messageData.user, this.messageData.channel_id);
		}
		this.moderating = false;
		this.canUnban = false;
	}

	public async blockUser():Promise<void> {
		this.moderating = true;
		try {
			await TwitchUtils.blockUser(this.messageData.user);
		}catch(error) {}
		this.moderating = false;
		this.canBlock = false;
	}
}
</script>

<style scoped lang="less">
.chatautobanjoin{
	.ctas {
		display: block;
		width: 100%;
		display: flex;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 1em;
		margin-top: .5em;
	}
}
</style>