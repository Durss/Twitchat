<template>
	<div :class="classes">
		<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{time}}</span>
		<Icon name="list" theme="secondary" />
		<span class="queue" v-if="messageData.queueTitle">{{messageData.queueTitle}}</span>
		<span class="message" v-html="message"></span>
	</div>
</template>

<script lang="ts">
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import {toNative,  Component, Prop } from 'vue-facing-decorator';
import AbstractChatMessage from './AbstractChatMessage';

@Component({
	components:{},
	emits:["onRead"]
})
class ChatQueueCommand extends AbstractChatMessage {
	
	@Prop
	declare messageData:TwitchatDataTypes.MessageQueueCommandData;

	/**
	 * Gets text message with parsed emotes
	 */
	public get message():string {
		let text = this.messageData.message ?? "";
			text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
			text = text.replace(/&lt;(\/)?strong&gt;/gi, "<$1strong>");//Allow <strong> tags
			text = text.replace(/&lt;(\/)?mark&gt;/gi, "<$1mark>");//Allow <mark> tags
		return text;
	}

	public get classes():string[] {
		let res = ["chatqueuecommand", "chatMessage"];
		return res;
	}

	public mounted():void {
		this.$store.accessibility.setAriaPolite(this.message);
	}
}
export default toNative(ChatQueueCommand);
</script>

<style scoped lang="less">
.chatqueuecommand{
	.icon {
		width: 1em;
		height: 1em;
		vertical-align: middle;
		opacity: 0.7;
	}
	
	.queue {
		margin: 0 .25em 0 .5em;
		padding: .1em .4em;
		border-radius: var(--border-radius);
		background-color: var(--color-secondary-fadest);
		color: var(--color-secondary);
		font-size: .85em;
		font-weight: normal;
		vertical-align: middle;
		display: inline-block;
		line-height: 1.2em;
	}
	
	.message {
		font-style: italic;
		color: var(--color-secondary);
		font-weight: normal;
		:deep(strong) {
			font-weight: bold;
			font-style: normal;
		}
		:deep(mark) {
			background-color: var(--color-secondary-fadest);
			color: var(--color-text);
			padding: 0 .2em;
			border-radius: .2em;
		}
	}
}
</style>