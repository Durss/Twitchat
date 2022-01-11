<template>
	<div class="chat">
		<MessageList :max="10" :messages="messageList" />
	</div>
</template>

<script lang="ts">
import { ChatMessageData } from '@/components/ChatMessage.vue';
import MessageList from '@/components/MessageList.vue';
import { Event } from '@/utils/EventDispatcher';
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';
import { Options, Vue } from 'vue-class-component';

@Options({
	components:{
		MessageList
	}
})
export default class Chat extends Vue {

	public messageList:ChatMessageData[] = [];

	private messageHandler!:(e:Event)=>void;

	public mounted():void {
		this.messageHandler = (e:Event) => this.onMessage(e);
		IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	public unmounted():void {
		IRCClient.instance.removeEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	private onMessage(e:Event):void {
		let ircEvent = e as IRCEvent;
		
		this.messageList.push({
			message:ircEvent.message,
			tags:ircEvent.tags,
			channel:ircEvent.channel,
			self:ircEvent.self,
		});
		if(this.messageList.length > 20) {
			this.messageList.splice(0, this.messageList.length - 20);
		}
	}

}

</script>

<style scoped lang="less">
.chat{
	
}
</style>