<template>
	<div class="messagelist">
		<div class="holder" ref="messageHolder">
			<ChatMessage v-for="m in messages"
				class="message"
				:key="m.id"
				:messageData="m" />
		</div>

		<div v-if="messages.length == 0" class="noMessage">- no message -</div>
	</div>
</template>

<script lang="ts">
import ChatMessage, { ChatMessageData } from '@/components/messages/ChatMessage.vue';
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';
import { Options, Vue } from 'vue-class-component';

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
	public counter:number = 0;

	private messageHandler!:(e:unknown)=>void;

	public async mounted():Promise<void> {
		this.messageHandler = (e:unknown) => this.onMessage(e as IRCEvent);
		IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	public unmounted():void {
		IRCClient.instance.removeEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	private async onMessage(e:IRCEvent):Promise<void> {
		//Add message to list
		this.messages.push({
			message:e.message,
			tags:e.tags,
			channel:e.channel,
			self:e.self,
			id:(Date.now() + Math.random()).toString(10),
			highlight:(this.counter++)%2 == 0,
		});
		if(this.messages.length > this.max) {
			this.messages.splice(0, this.messages.length - this.max);
		}
		await this.$nextTick();
		let el = this.$refs.messageHolder as HTMLDivElement;
		el.scrollTop = el.scrollHeight;
	}
}
</script>

<style scoped lang="less">
.messagelist{
	position: relative;

	.holder {
		max-height: 100%;
		width: 100%;
		overflow-y: auto;
		position: absolute;
		bottom: 0;
		padding: 10px;
	}

	.noMessage {
		.center();
		position:fixed;
		color: rgba(255, 255, 255, .3);
		font-family: "Inter";
		font-style: italic;
	}
}
</style>