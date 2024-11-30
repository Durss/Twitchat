<template>
	<div :class="classes"
	@contextmenu="onContextMenu($event, messageData, $el)">
		<div class="fill" ref="fill"></div>

		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		
		<Icon name="hypeChat" alt="hypeChat" class="icon" theme="light"/>

		<div class="holder">
			<div class="message">
				
			<a :href="'https://twitch.tv/'+messageData.message.user.login" target="_blank"
				@click.stop.prevent="openUserCard(messageData.message.user, messageData.message.channel_id)"
				class="login">{{messageData.message.user.displayName}} :</a>
				<ChatMessageChunksParser :chunks="messageData.message.message_chunks" :channel="messageData.message.channel_id" :platform="messageData.platform" />
			</div>
	
			<div class="price">{{currency}}{{ messageData.message.twitch_hypeChat!.amount }}</div>
		</div>
	</div>
</template>

<script lang="ts">
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';
import ChatMessageChunksParser from './components/ChatMessageChunksParser.vue';

@Component({
	components:{
		ChatMessageChunksParser,
	},
	emits:["onRead"]
})
class ChatHypeChatMessage extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageHypeChatData;

	public classes:string[] = ["chathypechatmessage", "chatMessage", "highlight"];
	
	public get currency():string {
		let curr = this.messageData.message.twitch_hypeChat!.currency;
		return {EUR:"€",USD:"$", GBP:"£"}[curr] || curr;
	}
	
	public beforeMount():void {
		const level = this.messageData.message.twitch_hypeChat!.level;
		this.classes.push("level" + level);
		if(level > 4) {
			this.classes.push("animate");
		}
	}

	public mounted():void {
		const fill = this.$refs.fill as HTMLDivElement;
		const duration = this.messageData.message.twitch_hypeChat!.duration_s;
		const remainingDuration = Math.max(0, duration - (Date.now() - this.messageData.date)/1000);
		fill.style.transition = "width "+remainingDuration+"s linear";
		fill.style.width = "100%";
		window.setTimeout(()=> {
			fill.style.width = "0%";
		},0);
	}

}
export default toNative(ChatHypeChatMessage);
</script>

<style scoped lang="less">
.chathypechatmessage{
	overflow: hidden;
	.fill {
		background-color: rgba(255, 255, 255, .5);
		position: absolute;
		bottom: 0;
		left: 0;
		height: 3px;
		width: 100%;
		transition: width 10s;
	}
	.holder {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		row-gap: .5em;
		column-gap: 1em;
		align-items: center;
		margin-bottom: 3px;
		flex-grow: 1;
		color: #ffffff;
		.message {
			flex-grow: 1;
			flex-basis: 150px;
			.login {
				font-weight: bold;
				color: #ffffff;
				text-decoration: none;
				margin-right: .25em;
			}
			:deep(a) {
				color: #ffffff;
			}
			:deep(.copyBt) {
				svg path {
					fill: #ffffff !important;
				}
			}
		}
	}
	.price {
		font-weight: bold;
		font-size: 1.5em;
	}
	&.level0 {
		background-color:#6b816e;
	}
	&.level1 {
		background-color: #32843b;
	}
	&.level2 {
		background-color:#007a6c;
	}
	&.level3 {
		background-color:#0080a9;
	}
	&.level4 {
		background-color:#0070db;
	}
	&.level5 {
		background-color: rgba(0, 0, 0, 0);
		background-image: linear-gradient(90deg,#016dda,#0404ac,#016dda,#0404ac);
	}
	&.level6 {
		background-color: rgba(0, 0, 0, 0);
		background-image: linear-gradient(90deg,#7614c7,#5060fc,#7614c7,#5060fc);
	}
	&.level7 {
		background-color: rgba(0, 0, 0, 0);
		background-image: linear-gradient(90deg,#a001d4,#d211a3,#a001d4,#d211a3);
	}
	&.level8 {
		background-color: rgba(0, 0, 0, 0);
		background-image: linear-gradient(90deg,#9004bd,#cb4227,#9004bd,#cb4227);
	}
	&.level9 {
		background-color: rgba(0, 0, 0, 0);
		background-image: linear-gradient(90deg,#3919bc,#cf0110,#3919bc,#cf0110);
	}

	&.animate {
		@keyframes animateBg {
			0% { background-position: 100% 0%; }
			100% { background-position: 0% 0%; }
		}
		background-size: 300% 100%;
		animation: animateBg 10s linear infinite;
	}
}
</style>