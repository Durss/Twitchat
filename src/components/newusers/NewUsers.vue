<template>
	<div class="newusers" v-show="messages.length > 0">
		<div class="header">
			<h1>Greet them <span class="count">({{messages.length}})</span></h1>
			<Button :icon="require('@/assets/icons/delete.svg')" class="clearBt" data-tooltip="Clear all messages" @click="clearAll()" />
		</div>
		
		<transition-group name="fade" appear
			@leave="leave"
			tag="div"
		>
			<ChatMessage
				v-for="(m,index) in messages"
				:key="m.tags.id"
				class="message"
				:messageData="m"
				:data-index="index"
				ref="message"
				:deleteOverlay="(streakMode && index<=overIndex) || index == overIndex"
				@mouseover="onMouseOver($event, index)"
				@mouseout="onMouseOut()"
				@click="deleteMessage(m, index)" />
		</transition-group>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import store from '@/store';
import { IRCEventDataList } from '@/utils/IRCEvent';
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
	public streakMode:boolean = true;
	public indexOffset:number = 0;

	private keyboardEventHandler!:(e:KeyboardEvent) => void;

	public get messages():IRCEventDataList.Message[] {
		return (store.state.chatMessages as IRCEventDataList.Message[]).filter(m => m.firstMessage);
	}

	public mounted():void {
		this.keyboardEventHandler = (e:KeyboardEvent) => {
			if(e.key != "Control" && e.key != "Shift") return;

			if(e.type == "keyup" && !this.streakMode) {
				this.streakMode = true;
			}else if(e.type == "keydown") {
				this.streakMode = false;
			}
		};
		document.addEventListener("keydown", this.keyboardEventHandler);
		document.addEventListener("keyup", this.keyboardEventHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("keydown", this.keyboardEventHandler);
		document.removeEventListener("keyup", this.keyboardEventHandler);
	}

	public deleteMessage(m:IRCEventDataList.Message, index:number):void {
		let el = (this.$refs["message"] as Vue[])[index] as ChatMessage;
		this.indexOffset = parseInt(el.$el.dataset.index as string)
		
		if(!this.streakMode) {
			m.firstMessage = false;
		}else{
			this.overIndex = -1;
			let messages = this.messages;
			let index = messages.findIndex(v => v.tags.id == m.tags.id);
			for (let i = 0; i < index+1; i++) {
				messages[i].firstMessage = false;
			}
		}
	}

	public clearAll():void {
		let messages = this.messages;
		Utils.confirm("Clear all", "You are about to clear all messages.", null, "Confirm", "Cancel").then(() => {
			for (let i = 0; i < messages.length; i++) {
				if(messages[i].firstMessage) {
					messages[i].firstMessage = false;
				}
			}
		});
	}

	public onMouseOver(e:MouseEvent, index:number):void {
		this.overIndex = index;
	}
	public onMouseOut():void {
		this.overIndex = -1;
	}

	public enter(el:HTMLElement, done:()=>void):void {
		gsap.from(el, {
			duration:0.2,
			height:0,
			// scaleY:0,
			margin:0,
			padding:0,
			ease:'sine.in',
			clearProps:'all',
			onComplete:()=>{
				done();
			}
		});
	}
	public leave(el:HTMLElement, done:()=>void):void {
		console.log(this.indexOffset);
		let delay = (parseInt(el.dataset.index as string)-this.indexOffset) * 0.07;
		gsap.to(el, {
			duration:0.3,
			height:0,
			// scaleY:0,
			margin:0,
			padding:0,
			fontSize:0,
			delay,
			ease:'sine.in',
			clearProps:'all',
			onComplete:()=>{
				done();
			}
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
		overflow: hidden;
		transition: all 0.2s;

		&:nth-child(odd) {
			background-color: fade(#ffffff, 2.5%);
		}

		&:hover {
			background-color: fade(#ffffff, 5%);
		}
		/* Enter and leave animations can use different */
		/* durations and timing functions.              */
		.fade-enter-active {
			transition: all 0.2s;
		}

		.fade-leave-active {
			transition: all 0.2s;
		}

		.fade-enter-from,
		.fade-leave-to {
			height: 0;
			margin: 0;
			padding: 0;
			opacity: 0;
			transform: scaleY(0);
		}
	}
}
</style>