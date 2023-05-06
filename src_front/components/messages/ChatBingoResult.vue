<template>
	<div class="chatbingoresult chatMessage highlight">
		<span class="chatMessageTime" v-if="$store('params').appearance.displayTime.value">{{time}}</span>
		<img src="@/assets/icons/bingo.svg" alt="icon" class="icon">

		<i18n-t scope="global" tag="div" keypath="chat.bingo.title">
			<template #WINNER>
				<a class="userlink"
				v-if="messageData.bingoData.winners![0]"
				@click.stop="openUserCard(messageData.bingoData.winners![0])">{{messageData.bingoData.winners![0].displayName}}</a>
			</template>
			<template #ANSWER>
				<img class="answer emote" :src="messageData.bingoData.emoteValue?.twitch?.image.hd" v-if="messageData.bingoData.guessEmote">
				<strong class="answer" v-else-if="messageData.bingoData.guessNumber">{{messageData.bingoData.numberValue}}</strong>
				<strong class="answer" v-else>{{messageData.bingoData.customValue}}</strong>	
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
export default class ChatBingoResult extends AbstractChatMessage {

	@Prop
	declare messageData:TwitchatDataTypes.MessageBingoData;

	public openUserCard(user:TwitchatDataTypes.TwitchatUser):void {
		this.$store("users").openUserCard(user);
	}


}
</script>

<style scoped lang="less">
.chatbingoresult{
	.emote {
		width: 2em;
		height: 2em;
	}
}
</style>