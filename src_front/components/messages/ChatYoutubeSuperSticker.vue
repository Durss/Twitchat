<template>
	<div class="chatyoutubesupersticker chatMessage highlight"
	:class="'tier_'+Math.min(7,messageData.tier)"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="youtube" alt="notice" class="icon"/>

		<img :src="messageData.user.avatarPath" class="avatar" alt="avatar" v-if="messageData.user.avatarPath" referrerpolicy="no-referrer">
		
		<div class="holder">
			<a class="userlink"
				:href="getProfilePage(messageData.user)"
				target="_blank"
				@click.stop.prevent="openUserCard(messageData.user, messageData.channel_id, messageData.platform)">{{messageData.user.displayName}}</a>
			<div class="amount">{{ messageData.amountDisplay }}</div>
		</div>

		<tooltip :content="'<center><img src='+messageData.sticker_url+' width=\'200\' class=\'emote\'>'">
			<img :src="messageData.sticker_url" class="sticker" alt="sticker" v-if="messageData.sticker_url" referrerpolicy="no-referrer">
		</tooltip>
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
class ChatYoutubeSuperSticker extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageYoutubeSuperStickerData;

}
export default toNative(ChatYoutubeSuperSticker);
</script>

<style scoped lang="less">
.chatyoutubesupersticker{
	.icon {
		align-self: unset;
		margin-left: 0;
	}
	.avatar {
		height: 2em;
		border-radius: 50%;
		margin-right: .5em;
	}
	.sticker {
		height: 5em;
	}
	.holder {
		gap: .5em;
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		font-weight: bold;
		align-items: flex-start;
	}

	a {
		color:#000000;
	}

	.amount {
		font-size: 1.5em;
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