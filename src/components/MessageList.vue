<template>
	<div class="messagelist">
		<ChatMessage v-for="m in messages"
			class="message"
			:key="m.id"
			:messageData="m" />
	</div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import ChatMessage from '@/components/ChatMessage.vue';
import { ChatMessageData } from '@/components/ChatMessage.vue';
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';

@Options({
	components:{
		ChatMessage
	},
	props: {
		max:Number,
	}
})
export default class MessageList extends Vue {
	public max!: number;
	public messages:ChatMessageData[] = [];

	private messageHandler!:(e:unknown)=>void;

	public mounted():void {
		this.messageHandler = (e:unknown) => this.onMessage(e as IRCEvent);
		IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	public unmounted():void {
		IRCClient.instance.removeEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	private async onMessage(e:IRCEvent):Promise<void> {
		this.messages.push({
			message:e.message,
			tags:e.tags,
			channel:e.channel,
			self:e.self,
			id:(Date.now() + Math.random()).toString(10),
		});
		if(this.messages.length > this.max) {
			this.messages.splice(0, 1);
		}
		await this.$nextTick();
		(this.$el as HTMLDivElement).scrollTop = this.$el.scrollHeight;
	}
}
</script>

<style scoped lang="less">
.messagelist{
	overflow-y: auto;
	.message {
		margin-bottom: 5px;
	}
}
</style>