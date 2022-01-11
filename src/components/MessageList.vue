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
		setTimeout(()=> {
			this.messages.push(
				JSON.parse('{"message":"durssSLIP :D encremBjr encremBjr encremWowo durssCry FootBall durssMERSLIP durssMeh durssSLIP3 durssSLIP2","tags":{"badge-info":{"subscriber":"10"},"badges":{"broadcaster":"1","subscriber":"9"},"client-nonce":"355fc4d68d820bb08608d1f645710ea5","color":"#9ACD32","display-name":"Durss","emote-only":true,"emotes":{"302628600":["FootBall"],"555555560":[":D"],"emotesv2_0268fa3d6fe245169361b3aae4f7a36d":["durssSLIP"],"emotesv2_ebeb4b3f67a34dfaa9e911e830ae373f":["durssCry"],"emotesv2_4ab88c2a7d8b4d7eb486a80cf87d01eb":["durssSLIP3"],"emotesv2_a8754d3df4f14d85b09b0ee06f7bce36":["encremBjr","encremBjr"],"emotesv2_884a146145ae45a18f34aeddcd563845":["encremWowo"],"emotesv2_6b20f3d76d2348fc9d8285b25b39eb15":["durssMERSLIP"],"emotesv2_1b1043a12eb64f9cb6ec162609d40d98":["durssMeh"],"emotesv2_6556e5058aaa4a72ba8d70c9e7378998":["durssSLIP2"]},"first-msg":false,"flags":null,"id":"38785e95-ea85-4f11-9a42-311bd7d39fe9","mod":false,"room-id":"29961813","subscriber":true,"tmi-sent-ts":"1641883099845","turbo":false,"user-id":"29961813","user-type":null,"emotes-raw":"emotesv2_0268fa3d6fe245169361b3aae4f7a36d:0-8/555555560:10-11/emotesv2_ebeb4b3f67a34dfaa9e911e830ae373f:44-51/emotesv2_4ab88c2a7d8b4d7eb486a80cf87d01eb:84-93/emotesv2_a8754d3df4f14d85b09b0ee06f7bce36:13-21,23-31/emotesv2_884a146145ae45a18f34aeddcd563845:33-42/302628600:53-60/emotesv2_6b20f3d76d2348fc9d8285b25b39eb15:62-73/emotesv2_1b1043a12eb64f9cb6ec162609d40d98:75-82/emotesv2_6556e5058aaa4a72ba8d70c9e7378998:95-104","badge-info-raw":"subscriber/10","badges-raw":"broadcaster/1,subscriber/9","username":"durss","message-type":"chat"},"channel":"#durss","self":false,"id":"1641883100882.7664"}')
			);
		}, 1000);
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