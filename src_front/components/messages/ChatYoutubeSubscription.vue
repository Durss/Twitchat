<template>
	<div class="chatyoutubesubscription chatMessage highlight"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="youtube" alt="notice" class="icon"/>

		<!-- <img :src="messageData.user.avatarPath" class="avatar" alt="avatar" v-if="messageData.user.avatarPath" referrerpolicy="no-referrer"> -->
		
		<div class="holder">
			<i18n-t scope="global" tag="p" :keypath="messageData.months == 1? 'chat.youtube_sub.new' : 'chat.youtube_sub.resub'">
				<template #USER>
					<a class="userlink"
						:href="getProfilePage(messageData.user)"
						target="_blank"
						@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id, messageData.platform)">{{messageData.user.displayName}}</a>
				</template>
				<template #MONTHS>
					<span class="months">{{ messageData.months }}</span>
				</template>
				<template #TIER>
					"<span class="level">{{ messageData.levelName }}</span>"
				</template>
			</i18n-t>

			<div class="quote">
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
class ChatYoutubeSubscription extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageYoutubeSubscriptionData;

}
export default toNative(ChatYoutubeSubscription);
</script>

<style scoped lang="less">
.chatyoutubesubscription{
	@border: .25em;
	overflow: hidden;
	.icon {
		align-self: unset;
	}
	.avatar {
		height: 2em;
		border-radius: 50%;
		margin-right: .5em;
	}
	.holder {
		gap: .25em;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		align-items: flex-start;
	}

	.quote {
		color:inherit;
		:deep(a) {
			color:inherit;
			font-weight: bold;
		}
	}

	.level {
		font-weight: bold;
		font-style: italic;
	}

	.months {
		font-weight: bold;
	}
}
</style>