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
import ChatMessage from '@/components/messages/ChatMessage.vue';
import { ChatMessageData } from '@/components/messages/ChatMessage.vue';
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';
import store from '@/store';

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
	public botsLogins:string[] = [];

	private messageHandler!:(e:unknown)=>void;

	public async mounted():Promise<void> {
		this.messageHandler = (e:unknown) => this.onMessage(e as IRCEvent);
		IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.messageHandler);

		try {
			//Load bots list
			const res = await fetch('https://api.twitchinsights.net/v1/bots/all');
			const json = await res.json();
			this.botsLogins = (json.bots as string[][]).map(b => b[0].toLowerCase());
		}catch(error) {
			//Fallback in case twitchinsights dies someday
			this.botsLogins = ["streamelements", "nightbot", "wizebot", "commanderroot", "anotherttvviewer", "streamlabs", "communityshowcase"];
		}
	}

	public unmounted():void {
		IRCClient.instance.removeEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	private async onMessage(e:IRCEvent):Promise<void> {
		let login = e.tags.username as string;
		//Ignore bot messages if requested
		if(store.state.params.hideBots && this.botsLogins.indexOf(login.toLowerCase()) > -1) {
			return;
		}

		//Add message to list
		this.messages.push({
			message:e.message,
			tags:e.tags,
			channel:e.channel,
			self:e.self,
			id:(Date.now() + Math.random()).toString(10),
		});
		if(this.messages.length > this.max) {
			this.messages.splice(0, this.messages.length - this.max);
		}
		await this.$nextTick();
		(this.$el as HTMLDivElement).scrollTop = this.$el.scrollHeight;
	}
}
</script>

<style scoped lang="less">
.messagelist{
	max-height: 100%;
	width: 100%;
	overflow-y: auto;
	position: absolute;
	bottom: 0;
	padding: 10px;
	.message {
		margin-bottom: 10px;
	}
}
</style>