<template>
	<div class="chatwatchstreak chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="watchStreak" alt="notice" class="icon"/>
		
		<div class="holder">
			<i18n-t scope="global" tag="span" keypath="chat.watch_streak.label">
				<template #USER>
					<a class="userlink" @click.stop="openUserCard(messageData.user, messageData.channel_id)">{{messageData.user.displayName}}</a>
				</template>
				<template #COUNT>
					<strong>{{ messageData.streak }}</strong>
				</template>
				<template #POINTS>
					<strong>{{ messageData.channelPointsEarned }}</strong>
				</template>
			</i18n-t>

			<div class="quote" v-if="messageData.message_chunks && messageData.message_chunks.length > 0">
				<ChatMessageChunksParser :chunks="messageData.message_chunks" :channel="messageData.channel_id" :platform="messageData.platform" />
			</div>
			<MessageTranslation :messageData="messageData" />
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';
import MessageTranslation from './MessageTranslation.vue';

@Component({
	components:{
		MessageTranslation,
		ChatMessageChunksParser,
	},
	emits:["onRead"]
})
class ChatWatchStreak extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageWatchStreakData;
	
	public mounted():void {
		let aria = this.$t("chat.watch_streak.label", {USER:this.messageData.user.displayName, COUNT:this.messageData.streak});
		this.$store.accessibility.setAriaPolite(aria);
	}

}
export default toNative(ChatWatchStreak);
</script>

<style scoped lang="less">
.chatwatchstreak{
	.holder {
		gap: .5em;
		display: flex;
		flex-direction: column;
	}
}
</style>