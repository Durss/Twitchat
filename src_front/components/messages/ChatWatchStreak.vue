<template>
	<div class="chatwatchstreak chatMessage highlight">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		
		<Icon name="watchStreak" alt="notice" class="icon"/>
		
		<i18n-t scope="global" tag="span" keypath="chat.watch_streak.label">
			<template #USER>
				<a class="userlink" @click.stop="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>
			</template>
			<template #COUNT>
				<strong>{{ messageData.streak }}</strong>
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
export default class ChatWatchStreak extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageWatchStreakData;
	
	public mounted():void {
		let aria = this.$t("chat.watch_streak.label", {USER:this.messageData.user.displayName, COUNT:this.messageData.streak});
		this.$store("accessibility").setAriaPolite(aria);
	}

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user, this.messageData.channel_id);
	}

}
</script>

<style scoped lang="less">
.chatwatchstreak{
}
</style>