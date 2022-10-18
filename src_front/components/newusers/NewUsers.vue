<template>
	<div class="newusers" v-show="localMessages.length > 0" :style="styles">
		<div class="header" @click="toggleList()">
			<Button :aria-label="(scrollDownAuto? 'Disable' : 'Enable')+' auto scroll down'"
				:icon="$image('icons/scroll'+(scrollDownAuto? 'Down' : 'Up')+'.svg')"
				class="scrollBt"
				:data-tooltip="'Auto scroll '+(scrollDownAuto? 'Down' : 'Up')"
				@click.stop="toggleScroll()" />

			<h1>Greet them <span class="count">({{localMessages.length}})</span></h1>

			<Button aria-label=""
				:icon="$image('icons/delete.svg')"
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
		
		<!-- <transition-group name="fade"
			v-if="showList"
			tag="div"
			ref="messageList"
			class="messageList"
			@leave="(el, done)=>leave(el, done)"
		> -->
		<div class="messageList" v-if="showList" ref="messageList">
			<ChatMessage
				v-for="(m,index) in localMessages" :key="m.id"
				class="message"
				ref="message"
				:messageData="m"
				:data-index="index"
				:lightMode="true"
				:disableConversation="true"
				@mouseover="onMouseOver($event, index)"
				@mouseout="onMouseOut()"
				@click="deleteMessage(m, index)"
				@click.right.prevent="deleteMessage(m, index, true)" />
		</div>
		<!-- </transition-group> -->
		<div class="grip" @mousedown="startDrag()" @touchstart="startDrag()"></div>
		<div class="gripMax" v-if="showMaxHeight" :style="maxHeightStyles">Max height</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
import Utils from '@/utils/Utils';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
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

	public overIndex = -1;
	public showList = true;
	public showMaxHeight = false;
	public scrollDownAuto = false;
	public indexOffset = 0;
	public autoDeleteAfter = 600;
	public deleteInterval = -1;
	public windowHeight = .3;
	public maxHeightPos = 0;
	public maxHeightSize = 0;
	public localMessages:(TwitchatDataTypes.MessageChatData)[] = [];

	private disposed = false;
	private resizing = false;
	private streakMode = true;
	private mouseY = 0;
	private highlightState:{[key:string]:boolean} = {};

	private mouseUpHandler!:(e:MouseEvent|TouchEvent)=> void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;

	public get styles():{[key:string]:string} {
		if(!this.showList) return {"min-height":"unset"};
		return {
			"height": (this.windowHeight*100) + '%',
			"min-height": "max(calc(75px + 1.5em), "+(this.windowHeight*100) + "%)",
		}
	}

	public get maxHeightStyles():{[key:string]:string} {
		return {
			top: this.maxHeightPos + 'px',
			height: this.maxHeightSize + 'px',
		}
	}

	public beforeMount():void {
		const storeValue = DataStore.get(DataStore.GREET_AUTO_SCROLL_DOWN);
		if(storeValue == "true") this.scrollDownAuto = true;
		let height = DataStore.get(DataStore.GREET_AUTO_HEIGHT)
		if(height) this.windowHeight = parseFloat(height);

		const autoDeleteStore = DataStore.get(DataStore.GREET_AUTO_DELETE_AFTER);
		if(autoDeleteStore != null) {
			this.autoDeleteAfter = parseInt(autoDeleteStore);
		}

		//Save new "auto delete after" value when changed
		watch(()=>this.autoDeleteAfter, ()=>{
			DataStore.set(DataStore.GREET_AUTO_DELETE_AFTER, this.autoDeleteAfter);
		});

		//Called when new message is received
		watch(()=>this.$store("chat").messages, ()=>{
			this.onMessage()
		});

		//Automatically deletes messages after the configured delay
		this.deleteInterval = setInterval(()=> {
			if(this.autoDeleteAfter == -1) return;

			const clearTimeoffset = Date.now() - this.autoDeleteAfter * 1000;
			for (let i = 0; i < this.localMessages.length; i++) {
				const m = this.localMessages[i];
				if(m.date < clearTimeoffset) {
					this.localMessages.splice(i, 1);
					i--;
				}
			}
		}, 5000);

		//Debug to add all the current messages to the list
		//Uncomment it if you want messages to be added to the list after
		//a hot reload during development
		if(!Config.instance.IS_PROD) {
			const history = this.$store("chat").messages.filter(m => m.type == "message") as TwitchatDataTypes.MessageChatData[];
			this.localMessages = this.localMessages.concat(history).splice(0,50);
		}

		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		this.mouseUpHandler = () => this.resizing = this.showMaxHeight = false;
		this.mouseMoveHandler = (e:MouseEvent|TouchEvent) => this.onMouseMove(e);
		
		document.addEventListener("mouseup", this.mouseUpHandler);
		document.addEventListener("touchend", this.mouseUpHandler);
		document.addEventListener("mousemove", this.mouseMoveHandler);
		document.addEventListener("touchmove", this.mouseMoveHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GREET_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GREET_FEED_READ_ALL, this.publicApiEventHandler);
		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
		clearInterval(this.deleteInterval);
		document.removeEventListener("mouseup", this.mouseUpHandler);
		document.removeEventListener("touchend", this.mouseUpHandler);
		document.removeEventListener("mousemove", this.mouseMoveHandler);
		document.removeEventListener("touchmove", this.mouseMoveHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GREET_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.GREET_FEED_READ_ALL, this.publicApiEventHandler);
	}

	/**
	 * Called when starting window resize
	 */
	public startDrag():void {
		this.resizing = true;
	}

	/**
	 * Called when a new message is received
	 */
	private async onMessage():Promise<void> {
		const maxLength = 100;
		const list = this.$store("chat").messages;
		const m = list[list.length - 1]; //TODO make sure we're not skipping messages. Is the watcher triggered for EVERY message or by batch?
		
		if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) return;
		if(m.user.channelInfo[m.channel_id].is_blocked === true) return;//Ignore blocked users
		//Ignore self messages
		if(m.user.id == StoreProxy.auth.twitch.user.id) return;
		//Ignore bot messages
		if(StoreProxy.users.knownBots[m.platform][m.user.login.toLowerCase()] === true) return;
		//Ignore hidden users from params
		if((this.$store("params").filters.hideUsers.value as string).toLowerCase().indexOf(m.user.login.toLowerCase()) > -1) return;
		
		if(m.todayFirst) this.localMessages.push(m);
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
			this.localMessages.splice(0, 1);
		}
	}

	/**
	 * Called when clicking a message
	 * Either removes a streak of messages or one single message
	 */
	public deleteMessage(m:TwitchatDataTypes.MessageChatData, index:number, singleMode = false):void {
		if(!this.streakMode || singleMode) {
			let el = (this.$refs["message"] as Vue[])[index] as ChatMessage;
			this.indexOffset = parseInt(el.$el.dataset.index as string);
			this.localMessages.splice(index, 1);
		}else{
			this.indexOffset = 0;
			this.overIndex = -1;
			let messages = this.localMessages;
			let index = messages.findIndex(v => v.id == m.id);
			for (let i = 0; i < index+1; i++) {
				messages.splice(0, 1);
			}
		}
	}

	/**
	 * Removes all messages
	 */
	public clearAll():void {
		//Store the count of messages to delete so if new messages are added
		//while confirming the clear, these new messages are kept
		let deleteCount = this.localMessages.length;
		this.$confirm("Clear all", "You are about to clear all messages.", null, "Confirm", "Cancel").then(() => {
			this.localMessages.splice(0, deleteCount);
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
				if(!this.highlightState[item.id]) {
					this.highlightState[item.id] = true;
					//Why the hell do I use inline styles this way instead of
					//doing it the Vue way by simply updating a prop set
					//to the component so it automatically updates when updating
					//that prop ?
					//Because it's drastically faster this way. There's a huge
					//rendering pipeline performance issue i couldn't solve
					//by any other method.
					let color = Utils.getLessVars().mainColor_light as string;
					color = color.replace(/\)/gi, ", .5)");
					// (items[i].$el as HTMLDivElement).style.borderColor = color as string;
					(items[i].$el as HTMLDivElement).style.opacity = ".5";
				}
				
			}
		}else{
			this.highlightState[this.localMessages[index].id as string] = true;
			let color = Utils.getLessVars().mainColor_light as string;
			color = color.replace(/\)/gi, ", .5)");
			// (items[index].$el as HTMLDivElement).style.borderColor = color as string;
			(items[index].$el as HTMLDivElement).style.opacity = ".5";
		}
	}

	/**
	 * Called when the mouse moves
	 */
	private async onMouseMove(e:MouseEvent|TouchEvent):Promise<void> {
		if(e.type == "mousemove") {
			this.mouseY = (e as MouseEvent).clientY;
		}else{
			this.mouseY = (e as TouchEvent).touches[0].clientY;
		}
	// 	if(!this.resizing) return;
	// 	const py = e.clientY;
	// 	const bounds = ((this.$el as HTMLDivElement).parentElement as HTMLDivElement).getBoundingClientRect();
	// 	const maxHeight = .6;
	// 	this.windowHeight = Math.min(maxHeight, (py - bounds.top) / bounds.height);
		
	// 	await this.$nextTick();

	// 	const boundsEl = (this.$el as HTMLDivElement).getBoundingClientRect();
	// 	const prev = (py - bounds.top) / bounds.height;
	// 	const next = (boundsEl.height - bounds.top) / bounds.height;
	// 	this.maxHeightPos = boundsEl.height;
	// 	this.maxHeightSize = Math.min(bounds.height * maxHeight - boundsEl.height, py - boundsEl.height);

	// 	this.showMaxHeight = (prev-next)*100 > 2;
	// 	Store.set(Store.GREET_AUTO_HEIGHT, this.windowHeight);
	}

	/**
	 * Called when rolling out of an item
	 */
	public onMouseOut():void {
		this.overIndex = -1;
		let items = this.$refs.message as Vue[];
		for (let i = 0; i < this.localMessages.length; i++) {
			const id = this.localMessages[i].id;
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
		DataStore.set(DataStore.GREET_AUTO_SCROLL_DOWN, this.scrollDownAuto);
		if(this.scrollDownAuto) {
			this.scrollTo();
		}
	}

	private scrollTo():void {
		let el = this.$refs.messageList as HTMLDivElement;
		if(el && this.scrollDownAuto) {
			el.scrollTop = el.scrollHeight;
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
	public leave(el:Element, done:()=>void):void {
		let delay = (parseInt((el as HTMLElement).dataset.index as string)-this.indexOffset) * 0.075;
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

	private async renderFrame():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		if(!this.resizing) return;

		const bounds = ((this.$el as HTMLDivElement).parentElement as HTMLDivElement).getBoundingClientRect();
		const maxHeight = .8;
		this.windowHeight = Math.min(maxHeight, (this.mouseY - bounds.top) / bounds.height);
		
		await this.$nextTick();

		const boundsEl = (this.$el as HTMLDivElement).getBoundingClientRect();
		const prev = (this.mouseY - bounds.top) / bounds.height;
		const next = (boundsEl.height - bounds.top) / bounds.height;
		this.maxHeightPos = boundsEl.height;
		this.maxHeightSize = Math.min(bounds.height * maxHeight - boundsEl.height, this.mouseY - boundsEl.height);

		const percent = prev-next;
		this.showMaxHeight = percent*100 > 2 && boundsEl.height/bounds.height+.02 < maxHeight;
		DataStore.set(DataStore.GREET_AUTO_HEIGHT, this.windowHeight);
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
	min-height: calc(75px + 1.5em);
	max-height: 60vh;
	z-index: 1;

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
				font-size: .65em;
				font-weight: normal;
			}
		}
		.clearBt, .scrollBt {
			height: 1.5em;
			width: 1.5em;
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
			font-size: .8em;

			label {
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
				font-size: .8em;
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
			padding: .5em 0;
			font-size: var(--messageSize);
			transition: background-color .25s;
			border: 1px solid transparent;

			&:nth-child(odd) {
				background-color: fade(#ffffff, 5%);
			}

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

	.grip {
		height: 10px;
		width: 100%;
		position: absolute;
		bottom: -6px;
		// background-color: fade(red, 50%);
		cursor: ns-resize;
		user-select: none;
	}

	.gripMax {
		width: 100%;
		position: absolute;
		top: 0;
		font-size: 10px;
		text-transform: uppercase;
		cursor: ns-resize;
		user-select: none;
		color: @mainColor_light;
		border-bottom: 1px dashed @mainColor_light;
		background-color: fade(@windowStateColor,60%);
		display: flex;
		align-items: flex-end;
		padding-bottom: 5px;
	}

}
</style>