<template>
	<div :class="classes" v-show="localMessages.length > 0">
		<div class="header" @click="toggleList()">
			<Button :icon="require('@/assets/icons/scroll'+(scrollDownAuto? 'Down' : 'Up')+'.svg')"
				class="scrollBt"
				:data-tooltip="'Auto scroll '+(scrollDownAuto? 'Down' : 'Up')"
				@click.stop="toggleScroll()" />
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
			ref="messageList"
			class="messageList"
		>
		<div v-for="(m,index) in localMessages" :key="m.tags.id">

			<ChatMessage
				class="message"
				ref="message"
				v-if="m.type == 'message'"
				:messageData="m"
				:data-index="index"
				:lightMode="true"
				:disableConversation="true"
				@mouseover="onMouseOver($event, index)"
				@mouseout="onMouseOut()"
				@click="deleteMessage(m, index)" />

			<ChatHighlight
				class="message"
				ref="message"
				v-if="m.type == 'highlight'"
				:messageData="m"
				:data-index="index"
				:lightMode="true"
				@mouseover="onMouseOver($event, index)"
				@mouseout="onMouseOut()"
				@click="deleteMessage(m, index)" />
		</div>
		</transition-group>
				<!-- :deleteOverlay="highlightState[m.tags.id]" -->
				<!-- :deleteOverlay="(streakMode && index<=overIndex) || index == overIndex" -->
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import store from '@/store';
import Store from '@/store/Store';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { IRCEventDataList } from '@/utils/IRCEvent';
import Utils from '@/utils/Utils';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatHighlight from '../messages/ChatHighlight.vue';

@Options({
	props:{},
	components:{
		Button,
		ChatMessage,
		ChatHighlight,
	}
})
export default class NewUsers extends Vue {

	public overIndex:number = -1;
	public showList:boolean = true;
	public scrollDownAuto:boolean = false;
	public indexOffset:number = 0;
	public localMessages:(IRCEventDataList.Message | IRCEventDataList.Highlight)[] = [];

	private streakMode:boolean = true;
	private highlightState:{[key:string]:boolean} = {};

	private keyboardEventHandler!:(e:KeyboardEvent) => void;
	private messageHandler!:(e:IRCEvent)=> void;

	public get classes():string[] {
		let res = ["newusers"];
		res.push("size_"+store.state.params.appearance.defaultSize.value);
		return res;
	}

	public mounted():void {
		const storeValue = Store.get("greetScrollDownAuto");
		if(storeValue == "true") this.scrollDownAuto = true;

		this.messageHandler = (e:IRCEvent) => this.onMessage(e);
		
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
		IRCClient.instance.addEventListener(IRCEvent.UNFILTERED_MESSAGE, this.messageHandler);
		IRCClient.instance.addEventListener(IRCEvent.HIGHLIGHT, this.messageHandler);
	}

	public beforeUnmount():void {
		document.removeEventListener("keydown", this.keyboardEventHandler);
		document.removeEventListener("keyup", this.keyboardEventHandler);
		IRCClient.instance.removeEventListener(IRCEvent.UNFILTERED_MESSAGE, this.messageHandler);
		IRCClient.instance.removeEventListener(IRCEvent.HIGHLIGHT, this.messageHandler);
	}

	private async onMessage(e:IRCEvent):Promise<void> {
		const maxLength = 200;
		const m = e.data as (IRCEventDataList.Message | IRCEventDataList.Highlight);
		if(m.firstMessage) this.localMessages.push(m);
		if(this.localMessages.length >= maxLength) {
			this.localMessages = this.localMessages.slice(-maxLength);
		}
		await this.$nextTick();
		this.scrollTo();
	}

	public deleteMessage(m:IRCEventDataList.Message, index:number):void {
		let el = (this.$refs["message"] as Vue[])[index] as ChatMessage;
		
		if(!this.streakMode) {
			m.firstMessage = false;
			this.localMessages.splice(index, 1);
			this.indexOffset = parseInt(el.$el.dataset.index as string);
		}else{
			this.indexOffset = 0;
			this.overIndex = -1;
			let messages = this.localMessages;
			let index = messages.findIndex(v => v.tags.id == m.tags.id);
			for (let i = 0; i < index+1; i++) {
				messages[0].firstMessage = false;
				messages.splice(0, 1);
			}

			let el = (this.$refs.messageList as Vue).$el;
			gsap.killTweensOf(el);
			gsap.to(el, {duration: .25, scrollTo: 0});
		}
	}

	public clearAll():void {
		let deleteCount = this.localMessages.length;
		Utils.confirm("Clear all", "You are about to clear all messages.", null, "Confirm", "Cancel").then(() => {
			for (let i = 0; i < deleteCount; i++) {
				if(this.localMessages[i].firstMessage) {
					this.localMessages[i].firstMessage = false;
					this.localMessages.splice(i, 1);
					i--;
					deleteCount--;
				}
			}
		});
	}

	public onMouseOver(e:MouseEvent, index:number):void {
		this.overIndex = index;
		let items = this.$refs.message as Vue[];
		if(this.streakMode) {
			for (let i = 0; i <= index; i++) {
				const item = this.localMessages[i];
				if(!item) continue;
				if(!this.highlightState[item.tags.id as string]) {
					this.highlightState[item.tags.id as string] = true;
					//Why the hell do I use inline styles this way instead of
					//doing it the Vue style by simply updating a prop set
					//to the component so it automatically updates when updating
					//that prop ?
					//Because it's drastically faster this way. There's a huge
					//rendering pipeline performance issue i couldn't solve
					//by any other method.
					(items[i].$el as HTMLDivElement).style.background = "red";
					(items[i].$el as HTMLDivElement).style.color = "white";
					(items[i].$el as HTMLDivElement).style.opacity = ".5";
					(items[i].$el as HTMLDivElement).style.textDecoration = "line-through";
				}
				
			}
		}else{
			this.highlightState[this.localMessages[index].tags.id as string] = true;
			(items[index].$el as HTMLDivElement).style.background = "red";
			(items[index].$el as HTMLDivElement).style.color = "white";
			(items[index].$el as HTMLDivElement).style.opacity = ".5";
			(items[index].$el as HTMLDivElement).style.textDecoration = "line-through";
		}
	}

	public onMouseOut():void {
		this.overIndex = -1;
		let items = this.$refs.message as Vue[];
		for (let i = 0; i < this.localMessages.length; i++) {
			const id = this.localMessages[i].tags.id as string;
			if(this.highlightState[id] === true) {
				this.highlightState[id] = false;
				(items[i].$el as HTMLDivElement).removeAttribute("style");
			}
		}
	}

	public async toggleList():Promise<void> {
		this.showList = !this.showList
		if(this.showList) {
			await this.$nextTick();
			this.scrollTo();
		}
	}

	public toggleScroll():void {
		this.scrollDownAuto = !this.scrollDownAuto;
		Store.set("greetScrollDownAuto", this.scrollDownAuto? 'true' : 'false');
		if(this.scrollDownAuto) {
			this.scrollTo();
		}
	}

	private scrollTo():void {
		let el = this.$refs.messageList as Vue;
		if(el) {
			if(this.scrollDownAuto) {
				el.$el.scrollTop = el.$el.scrollHeight;
			}else{
				// el.$el.scrollTop = 0;
			}
		}
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
		if(delay > .75) {
			done();
		}else{
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

}
</script>

<style scoped lang="less">
.newusers{
	position: fixed;
	top: 0;
	left: 50%;
	transform: translateX(-50%);
	max-height: 35vh;
	width: 100%;
	margin: auto;
	// background-color: #218bac;
	background-color: darken(@mainColor_normal, 20%);
	box-shadow: 0 5px 5px 0 rgba(0,0,0,0.5);
	display: flex;
	flex-direction: column;

	&.size_1 {
		.messageList{
			font-size: 10px;
			.message{ padding: 2px; }
		}
	}
	&.size_2 {
		.messageList{
			font-size: 14px;
			.message{ padding: 2px; }
		}
	}
	&.size_3 {
		.messageList{
			font-size: 18px;
			.message{ padding: 5px; }
		}
	}
	&.size_4 {
		.messageList{
			font-size: 24px;
			.message{ padding: 5px; }
		}
	}
	&.size_5 {
		.messageList{
			font-size: 30px;
			.message{ padding: 10px; }
		}
	}

	.header {
		padding: 10px 0;
		display: flex;
		flex-direction: row;
		justify-content: center;
		cursor: pointer;
		h1 {
			text-align: center;
			color: #ffffff;
			margin: 0 10px;

			.count {
				// font-style: italic;
				font-size: 16px;
				font-weight: normal;
			}
		}
		.clearBt, .scrollBt {
			height: 25px;
			width: 25px;
			padding: 3px;
			border-radius: 5px;
		}
	}

	.messageList {
		overflow-y: auto;

		.message {
			cursor: pointer;
			overflow: hidden;
			font-family: "Inter";
			color: #fff;
			padding: 5px;
			background-color: fade(#ffffff, 5%);
			margin-bottom: 5px;

			:deep(.time) {
				color: fade(#ffffff, 75%);
				margin-right: 5px;
				vertical-align: middle;
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

}
</style>