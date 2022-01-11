<template>
	<div class="newusers">
		<ChatMessage v-for="m in messages"
			class="message"
			:key="m.id"
			:messageData="m" />
	</div>
</template>

<script lang="ts">
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';
import { Options, Vue } from 'vue-class-component';
import ChatMessage from '@/components/messages/ChatMessage.vue';

@Options({
	props:{},
	components:{
		ChatMessage,
	}
})
export default class NewUsers extends Vue {

	private messages:IRCEvent[] = [];
	private uidsDone:{[key:string]:boolean} = {};
	private messageHandler!:(e:unknown)=>void;

	public async mounted():Promise<void> {
		this.messageHandler = (e:unknown) => this.onMessage(e as IRCEvent);
		IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	private async onMessage(e:IRCEvent):Promise<void> {
		if(this.uidsDone[e.tags['user-id'] as string] === true) return;

		this.messages.push(e);
		this.uidsDone[e.tags['user-id'] as string] = true;
	}

}
</script>

<style scoped lang="less">
.newusers{
	position: absolute;
	top: 0;
	left: 0;
}
</style>