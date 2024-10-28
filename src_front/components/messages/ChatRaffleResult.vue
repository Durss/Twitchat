<template>
	<div class="chatraffleresult chatMessage highlight">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon name="ticket" alt="icon" class="icon"/>
		
		<i18n-t scope="global" tag="div" :keypath="messageData.winner.tip? 'chat.raffle.title_tip' : 'chat.raffle.title'">
			<template #USER v-if="user">
				<a class="userlink" @click.stop="openUserCard(user!, messageData.winner.user?.channel_id)">{{user!.displayName}}</a>
			</template>
			<template #USER v-else><strong>{{messageData.winner.label}}</strong></template>
			<template #AMOUNT><strong>{{messageData.winner.tip?.amount}}</strong></template>
			<template #PLATFORM><strong>{{tipPlatform}}</strong></template>
		</i18n-t>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Component, Prop, toNative } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"]
})
class ChatRaffleResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageRaffleData;
	
	public tipPlatform:string = "";
	
	public user:TwitchatDataTypes.TwitchatUser|null = null;

	public beforeMount():void {
		switch(this.messageData.winner.tip?.source) {
			case "kofi": this.tipPlatform = "Ko-Fi"; break;
			case "streamlabs": this.tipPlatform = "Streamlabs"; break;
			case "streamlabs_charity": this.tipPlatform = "Streamlabs Charity"; break;
			case "streamlements": this.tipPlatform = "Streamlements"; break;
			case "tipeee": this.tipPlatform = "Tipeee"; break;
			case "tiltify": this.tipPlatform = "Tiltify"; break;
			default: this.tipPlatform = "Unknown platform";
		}
		
		const w = this.messageData.winner;
		if(w.user) {
			this.user = this.$store.users.getUserFrom(w.user.platform, w.user.channel_id, w.user.id);
		}
	}
}
export default toNative(ChatRaffleResult);
</script>

<style scoped lang="less">
.chatraffleresult{
}
</style>