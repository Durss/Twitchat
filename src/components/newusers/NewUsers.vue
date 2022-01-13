<template>
	<div class="newusers" v-show="localMessages.length > 0">
		<div class="header" @click="showList = !showList">
			<h1>Greet them <span class="count">({{localMessages.length}})</span></h1>
			<Button :icon="require('@/assets/icons/delete.svg')"
				class="clearBt"
				data-tooltip="Clear all messages"
				@click.stop="clearAll()" />
		</div>
		
		<transition-group name="fade"
			v-if="showList"
			@leave="leave"
			tag="div"
		>
			<ChatMessage
				v-for="(m,index) in localMessages"
				class="message"
				ref="message"
				:key="m.tags.id"
				:messageData="m"
				:data-index="index"
				:disableAutomod="true"
				:disableFirstTime="true"
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
import { watch } from '@vue/runtime-core';
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
	public showList:boolean = true;
	public indexOffset:number = 0;
	public localMessages:IRCEventDataList.Message[] = [];

	private idToDisplayed:{[id:string]:boolean} = {};

	private keyboardEventHandler!:(e:KeyboardEvent) => void;


	public mounted():void {
		watch(() => store.state.chatMessages, async (value) => {
			const list = (store.state.chatMessages as IRCEventDataList.Message[]).filter(m => m.firstMessage).concat();
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(this.idToDisplayed[m.tags.id as string]) continue;
				this.idToDisplayed[m.tags.id as string] = true;
				this.localMessages.push(m);
			}
		}, {
			deep:true
		});
		
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
		
		if(!this.streakMode) {
			m.firstMessage = false;
			this.indexOffset = parseInt(el.$el.dataset.index as string);
		}else{
			this.indexOffset = 0;
			this.overIndex = -1;
			let messages = this.localMessages;
			let index = messages.findIndex(v => v.tags.id == m.tags.id);
			for (let i = 0; i < index+1; i++) {
				messages[i].firstMessage = false;
			}
		}
	}

	public clearAll():void {
		let messages = this.localMessages;
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
			scaleY:0,
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
		let delay = (parseInt(el.dataset.index as string)-this.indexOffset) * 0.075;
		gsap.to(el, {
			duration:0.15,
			height:0,
			scaleY:0,
			margin:0,
			padding:0,
			// fontSize:0,
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
	padding-top: 10px;
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
		z-index: 1;//Avoids glitch when hovering message items due to stiky position
		cursor: pointer;
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
		// transition: background-color 0.2s, ;

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