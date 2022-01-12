<template>
	<div class="newusers" v-show="messages.length > 0">
		<div class="header">
			<h1>Greet them <span class="count">({{messages.length}})</span></h1>
			<Button :icon="require('@/assets/icons/delete.svg')" class="clearBt" data-tooltip="Clear all messages" @click="clearAll()" />
		</div>
		<ChatMessage v-for="(m,index) in messages"
			class="message"
			:key="m.id"
			:messageData="m"
			@click="deleteMessage(m, index)" />
	</div>
</template>

<script lang="ts">
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';
import { Options, Vue } from 'vue-class-component';
import ChatMessage, { ChatMessageData } from '@/components/messages/ChatMessage.vue';
import Button from '../Button.vue';
import Utils from '@/utils/Utils';

@Options({
	props:{},
	components:{
		Button,
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

	public deleteMessage(m:ChatMessageData, index:number):void {
		this.messages.splice(index, 1);
	}

	public clearAll():void {
		Utils.confirm("Clear all", "You are about to clear all messages.", null, "Confirm", "Cancel").then(() => {
			this.messages = [];
		});
	}

}
</script>

<style scoped lang="less">
.newusers{
	position: absolute;
	top: 0;
	left: 0;
	max-height: 35vh;
	width: 100%;
	background-color: #0a2950;
	backdrop-filter: blur(5px);
	padding: 10px;
	padding-top: 0;
	overflow-y: auto;
	box-shadow: 0 5px 5px 0 rgba(0,0,0,0.5);

	.header {
		padding: 10px 0;
		position: sticky;
		top: 0;
		background-color: #0a2950;
		display: flex;
		flex-direction: row;
		justify-content: center;
		h1 {
			text-align: center;
			color: #ffffff;

			.count {
				// font-style: italic;
				font-size: 16px;
				font-weight: normal;
			}
		}
		.clearBt {
			margin-left: 10px;
			height: 25px;
			width: 25px;
			padding: 3px;
			border-radius: 5px;
		}
	}

	.message {
		cursor: pointer;

		&:nth-child(odd) {
			background-color: fade(#ffffff, 2.5%);
		}

		&:hover {
			background-color: fade(#ffffff, 5%);
		}
	}
}
</style>