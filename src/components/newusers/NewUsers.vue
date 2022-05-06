<template>
	<div :class="classes" v-show="localMessages.length > 0">
		<div class="header" @click="toggleList()">
			<Button :aria-label="(scrollDownAuto? 'Disable' : 'Enable')+' auto scroll down'"
				:icon="require('@/assets/icons/scroll'+(scrollDownAuto? 'Down' : 'Up')+'.svg')"
				class="scrollBt"
				:data-tooltip="'Auto scroll '+(scrollDownAuto? 'Down' : 'Up')"
				@click.stop="toggleScroll()" />

			<h1>Greet them <span class="count">({{localMessages.length}})</span></h1>

			<Button aria-label=""
				:icon="require('@/assets/icons/delete.svg')"
				class="clearBt"
				data-tooltip="Clear all messages"
				@click.stop="clearAll()" />
		</div>

		<div class="topForm" v-if="showList">
			<div class="row">
				<label><img src="@/assets/icons/timeout.svg" alt="timer">Auto delete after</label>
				<select v-model.number="autoDeleteAfter">
					<option value="-1">never</option>
					<option value="60">1m</option>
					<option value="120">2m</option>
					<option value="180">3m</option>
					<option value="240">4m</option>
					<option value="300">5m</option>
					<option value="600">10m</option>
					<option value="900">15m</option>
					<option value="1200">20m</option>
					<option value="1800">30m</option>
					<option value="3600">1h</option>
				</select>
			</div>
		</div>
		
		<transition-group name="fade"
			v-if="showList"
			tag="div"
			ref="messageList"
			class="messageList"
		@leave="leave"
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
				@click="deleteMessage(m, index)"
				@click.right.prevent="deleteMessage(m, index, true)" />

			<ChatHighlight
				class="message"
				ref="message"
				v-if="m.type == 'highlight'"
				:messageData="m"
				:data-index="index"
				:lightMode="true"
				@mouseover="onMouseOver($event, index)"
				@mouseout="onMouseOut()"
				@click="deleteMessage(m, index)"
				@click.right.prevent="deleteMessage(m, index, true)" />
		</div>
		</transition-group>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import store from '@/store';
import Store from '@/store/Store';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { IRCEventDataList } from '@/utils/IRCEvent';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
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
	public autoDeleteAfter:number = 600;
	public deleteInterval:number = -1;
	public localMessages:(IRCEventDataList.Message | IRCEventDataList.Highlight)[] = [];

	private streakMode:boolean = true;
	private highlightState:{[key:string]:boolean} = {};

	private keyboardEventHandler!:(e:KeyboardEvent) => void;
	private messageHandler!:(e:IRCEvent)=> void;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;

	public get classes():string[] {
		let res = ["newusers"];
		return res;
	}

	public mounted():void {
		const storeValue = Store.get("greetScrollDownAuto");
		if(storeValue == "true") this.scrollDownAuto = true;

		const autoDeleteStore = Store.get("greetAutoDeleteAfter");
		if(autoDeleteStore != null) {
			this.autoDeleteAfter = parseInt(autoDeleteStore);
		}

		watch(()=>this.autoDeleteAfter, ()=>{
			//Save new "auto delete after" value when changed
			Store.set("greetAutoDeleteAfter", this.autoDeleteAfter);
		});

		//Automatically deletes messages after the configured delay
		this.deleteInterval = setInterval(()=> {
			if(this.autoDeleteAfter == -1) return;

			const clearTimeoffset = Date.now() - this.autoDeleteAfter * 1000;
			for (let i = 0; i < this.localMessages.length; i++) {
				const m = this.localMessages[i];
				if(parseInt(m.tags['tmi-sent-ts'] as string) < clearTimeoffset) {
					this.localMessages.splice(i, 1);
					i--;
				}
			}
		}, 5000);

		//Debug to add all the current messages to the list
		//Uncomment it if you want messages to be added to the list after
		//a hor reload during development
		// this.localMessages = this.localMessages.concat(store.state.chatMessages.filter(m => m.type == "message" || m.type == "highlight") as (IRCEventDataList.Message | IRCEventDataList.Highlight)[]).splice(0,50);

		this.messageHandler = (e:IRCEvent) => this.onMessage(e);
		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		
		//Listen for shift/Ctr keys to define if deleting in streak or single mode
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
		PublicAPI.instance.addEventListener(TwitchatEvent.GREET_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GREET_FEED_READ_ALL, this.publicApiEventHandler);
	}

	public beforeUnmount():void {
		clearInterval(this.deleteInterval);
		document.removeEventListener("keydown", this.keyboardEventHandler);
		document.removeEventListener("keyup", this.keyboardEventHandler);
		IRCClient.instance.removeEventListener(IRCEvent.UNFILTERED_MESSAGE, this.messageHandler);
		IRCClient.instance.removeEventListener(IRCEvent.HIGHLIGHT, this.messageHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GREET_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GREET_FEED_READ_ALL, this.publicApiEventHandler);
	}

	/**
	 * Called when a new message is received
	 */
	private async onMessage(e:IRCEvent):Promise<void> {
		const maxLength = 100;
		const m = e.data as (IRCEventDataList.Message | IRCEventDataList.Highlight);
		if(m.type != "message" && m.type != "highlight") return;
		if(m.firstMessage) this.localMessages.push(m);
		if(this.localMessages.length >= maxLength) {
			this.localMessages = this.localMessages.slice(-maxLength);
		}
		await this.$nextTick();
		this.scrollTo();
	}

	/**
	 * Called when requesting an action from the public API
	 */
	private onPublicApiEvent(e:TwitchatEvent):void {
		const data = e.data as {count?:number};
		let readCount = 0;
		switch(e.type) {
			case TwitchatEvent.GREET_FEED_READ: {
				if(data && !isNaN(data.count as number)) {
					readCount = data.count as number;
				}else{
					readCount = 1;
				}
				break;
			}
			case TwitchatEvent.GREET_FEED_READ_ALL: {
				readCount = this.localMessages.length
				break;
			}
		}
		
		for (let i = 0; i < readCount; i++) {
			if(this.localMessages.length === 0) break;
			this.localMessages[0].firstMessage = false;
			this.localMessages.splice(0, 1);
		}
	}

	/**
	 * Called when clicking a message
	 * Either removes a streak of messages or one single message
	 */
	public deleteMessage(m:IRCEventDataList.Message, index:number, singleMode:boolean):void {
		let el = (this.$refs["message"] as Vue[])[index] as ChatMessage;

		if(!this.streakMode || singleMode) {
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

	/**
	 * Removes all messages
	 */
	public clearAll():void {
		//Store the count of messages to delete so if new messages are added
		//while confirming the clear, these new messages are kept
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

	/**
	 * Called when rolling over an item
	 */
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
					//doing it the Vue way by simply updating a prop set
					//to the component so it automatically updates when updating
					//that prop ?
					//Because it's drastically faster this way. There's a huge
					//rendering pipeline performance issue i couldn't solve
					//by any other method.
					let color = Utils.getLessVars().mainColor_light as string;
					color = color.replace(/\)/gi, ", .1)");
					(items[i].$el as HTMLDivElement).style.background = color as string;
				}
				
			}
		}else{
			this.highlightState[this.localMessages[index].tags.id as string] = true;
			let color = Utils.getLessVars().mainColor_light as string;
			color = color.replace(/\)/gi, ", .1)");
			(items[index].$el as HTMLDivElement).style.background = color as string;
		}
	}

	/**
	 * Called when rolling out of an item
	 */
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
		Store.set("greetScrollDownAuto", this.scrollDownAuto);
		if(this.scrollDownAuto) {
			this.scrollTo();
		}
	}

	private scrollTo():void {
		let el = this.$refs.messageList as Vue;
		if(el) {
			if(this.scrollDownAuto) {
				el.$el.scrollTop = el.$el.scrollHeight;
			}
		}
	}

	/**
	 * Animates a newly added item
	 */
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

	/**
	 * Animates an item when removed from the list
	 */
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
	// background-color: #218bac;
	background-color: @windowStateColor;
	box-shadow: 0 5px 5px 0 rgba(0,0,0,0.5);
	display: flex;
	flex-direction: column;

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

	.topForm {
		display: flex;
		flex-direction: column;
		background-color: rgba(0, 0, 0, .2);
		align-items: center;
		padding: 4px 0;
		.row {
			display: flex;
			flex-direction: row;
			align-items: center;

			label {
				font-size: 16px;
				margin: 0;
				margin-right: 5px;
				color: @mainColor_light;
				img {
					height: .8em;
					margin-right: 3px;
					// vertical-align: middle;
				}
			}
			select {
				font-size: 14px;
				padding: 0px 2px;
				border-radius: 5px;
			}
		}
	}

	.messageList {
		overflow-y: auto;

		.message {
			cursor: pointer;
			overflow: hidden;
			font-family: "Inter";
			color: #fff;
			background-color: fade(#ffffff, 5%);
			margin: .5em 0;
			font-size: var(--messageSize);
			transition: background-color .25s;

			:deep(.time) {
				color: fade(#ffffff, 75%);
				font-size: .8em;
				vertical-align: middle;
				margin-right: .7em;
				font-variant-numeric: tabular-nums;
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