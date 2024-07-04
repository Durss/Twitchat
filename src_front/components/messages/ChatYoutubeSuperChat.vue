<template>
	<div class="chatyoutubesuperchat chatMessage highlight"
	:class="'tier_'+Math.min(7,messageData.tier)"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="youtube" alt="notice" class="icon"/>

		<img :src="messageData.user.avatarPath" class="avatar" alt="avatar" v-if="messageData.user.avatarPath">
		
		<div class="holder">
			<a class="userlink"
				:href="'https://twitch.tv/'+messageData.user.login"
				target="_blank"
				@click.stop.prevent="openUserCard(messageData.user)">{{messageData.user.displayName}}</a>

			<div class="quote">
				<ChatMessageChunksParser :chunks="messageData.message_chunks" :channel="messageData.channel_id" :platform="messageData.platform" />
			</div>
			<MessageTranslation :messageData="messageData" />
		</div>

		<div class="amount">{{ messageData.amountDisplay }}</div>
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
class ChatYoutubeSuperChat extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageYoutubeSuperChatData;

}
export default toNative(ChatYoutubeSuperChat);
</script>

<style scoped lang="less">
.chatyoutubesuperchat{
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

	a {
		color:#000000;
	}

	.quote {
		color:inherit;
		:deep(a) {
			color:inherit;
			font-weight: bold;
		}
	}

	.amount {
		font-weight: bold;
		font-size: 2em;
	}

	&.tier_1 {
		font-weight: normal;
		color: #000;
		background-color:#1e88e5;
	}
	&.tier_2 {
		font-weight: normal;
		color: #000;
		background-color:#00e5ff;
	}
	&.tier_3 {
		font-weight: normal;
		color: #000;
		background-color:#1de9b6;
	}
	&.tier_4 {
		font-weight: normal;
		color: #000;
		background-color:#ffca28;
	}
	&.tier_5 {
		a {
			color:#ffffff;
		}
		background-color:#e91e63;
	}
	&.tier_6 {
		a {
			color:#ffffff;
		}
		background-color:#e91e63;
	}
	&.tier_7 {
		a {
			color:#ffffff;
		}
		background-color:#e62117;
	}
}
</style>