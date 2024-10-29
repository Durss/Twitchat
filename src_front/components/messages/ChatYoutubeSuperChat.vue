<template>
	<div class="chatyoutubesuperchat chatMessage highlight"
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

			<div class="quote">
				<ChatMessageChunksParser :chunks="messageData.message_chunks" :channel="messageData.channel_id" :platform="messageData.platform" />
			</div>
			<MessageTranslation :messageData="messageData" />
		</div>

		<div class="amount">{{ messageData.amountDisplay }}</div>
		
		<div class="fill" ref="fill" v-if="messageData.tier > 2"></div>
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

	public mounted():void {
		const fill = this.$refs.fill as HTMLDivElement;
		if(!fill) return;
		
		const duration_m = Math.min(300,[0,0,2,5,10,30,60,120,180,240,300][this.messageData.tier-1]);
		
		const duration_s = duration_m * 60;
		const remainingDuration = Math.max(0, duration_s - (Date.now() - this.messageData.date)/1000);
		fill.style.transition = "transform "+remainingDuration+"s linear";
		fill.style.transform = "scaleX(100%)";
		window.setTimeout(()=> {
			fill.style.transform = "scaleX(0)";
		},100);
	}

}
export default toNative(ChatYoutubeSuperChat);
</script>

<style scoped lang="less">
.chatyoutubesuperchat{
	@border: .25em;
	overflow: hidden;
	position: relative;

	.icon {
		align-self: unset;
		margin-left: 0;
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

	.fill {
		background-color: rgba(255, 255, 255, .9);
		position: absolute;
		bottom: 0;
		left: 0;
		height: @border;
		width: 100%;
		transition: transform 10s;
		will-change: transform;
		transform-origin: left top;
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