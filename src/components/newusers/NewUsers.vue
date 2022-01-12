<template>
	<div class="newusers" v-show="messages.length > 0">
		<div class="header">
			<h1>Greet them <span class="count">({{messages.length}})</span></h1>
			<Button :icon="require('@/assets/icons/delete.svg')" class="clearBt" data-tooltip="Clear all messages" @click="clearAll()" />
		</div>
		<ChatMessage v-for="(m,index) in messages"
			ref="message"
			class="message"
			:key="m.id"
			:messageData="m"
			:deleteOverlay="index<=overIndex"
			@mouseover="onMouseOver(index)"
			@mouseout="onMouseOut(index)"
			@click="deleteMessage(m, index)" />
	</div>
</template>

<script lang="ts">
import ChatMessage, { ChatMessageData } from '@/components/messages/ChatMessage.vue';
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';

@Options({
	props:{},
	components:{
		Button,
		ChatMessage,
	}
})
export default class NewUsers extends Vue {

	public overIndex:number = -1;

	private messages:IRCEvent[] = [];
	private uidsDone:{[key:string]:boolean} = {};
	private messageHandler!:(e:unknown)=>void;

	public async mounted():Promise<void> {
		this.messageHandler = (e:unknown) => this.onMessage(e as IRCEvent);
		IRCClient.instance.addEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	public async beforeUnmount():Promise<void> {
		IRCClient.instance.removeEventListener(IRCEvent.MESSAGE, this.messageHandler);
	}

	private async onMessage(e:IRCEvent):Promise<void> {
		if(this.uidsDone[e.tags['user-id'] as string] === true) return;

		this.messages.push(e);
		this.uidsDone[e.tags['user-id'] as string] = true;
	}

	public deleteMessage(m:ChatMessageData, index:number):void {
		const instances = this.$refs.message as Vue[];
		const divs = instances.splice(0, index+1).map(i => i.$el as HTMLDivElement);
		gsap.to(divs, {
			duration:0.2,
			height:0,
			margin:0,
			padding:0,
			opacity:0,
			ease:'sine.in',
			stagger:0.05,
			onComplete:()=>{
				this.messages.splice(0, index+1);
				this.overIndex = -1;
			}
		});
	}

	public clearAll():void {
		Utils.confirm("Clear all", "You are about to clear all messages.", null, "Confirm", "Cancel").then(() => {
			this.messages = [];
		});
	}

	public onMouseOver(index:number):void {
		this.overIndex = index;
	}
	public onMouseOut(index:number):void {
		this.overIndex = -1;
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
		overflow: hidden;

		&:nth-child(odd) {
			background-color: fade(#ffffff, 2.5%);
		}

		&:hover {
			background-color: fade(#ffffff, 5%);
		}
	}
}
</style>