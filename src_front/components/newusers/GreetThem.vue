<template>
	<div class="greetThem" v-show="localMessages.length > 0" :style="styles">
		<div class="header" @click="toggleList()">
			<ButtonNotification class="scrollBt clearButton"
				:aria-label="$t(scrollDownAuto? 'greet.auto_scroll_off_aria' : 'greet.auto_scroll_on_aria')"
				:icon="'scroll'+(scrollDownAuto? 'Down' : 'Up')"
				v-tooltip="$t(scrollDownAuto? 'greet.auto_scroll_down' : 'greet.auto_scroll_up')"
				@click.stop="toggleScroll()" />

			<h1>{{ $t("greet.title") }} <span class="count">({{localMessages.length}})</span></h1>

			<ButtonNotification class="clearBt clearButton"
				icon="delete"
				v-tooltip="$t('greet.clearBt')"
				@click.stop="clearAll()" />
		</div>

		<div class="topForm" v-if="showList">
			<div class="row">
				<label><img src="@/assets/icons/timeout.svg" alt="timer">{{ $t("greet.auto_delete") }}</label>
				<select v-model.number="$store('params').greetThemAutoDelete">
					<option v-for="v in autoDeleteOptions" :value="v.seconds">{{v.label}}</option>
				</select>
			</div>
		</div>
		
		<div class="messageList" v-if="showList" ref="messageList">
			<template v-for="(m,index) in localMessages" :key="m.id">
				<MessageItem class="message"
					ref="message"
					:messageData="m"
					:data-index="index"
					:lightMode="true"
					:disableConversation="true"
					@mouseover="onMouseOver($event, index)"
					@mouseout="onMouseOut()"
					@click="deleteMessage(m, index)"
					@click.right.prevent="deleteMessage(m, index, true)"
				/>
			</template>
		</div>
		<div class="grip" @mousedown="startDrag()" @touchstart="startDrag()"></div>
	</div>
</template>

<script lang="ts">
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import Config from '@/utils/Config';
import PublicAPI from '@/utils/PublicAPI';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import { Component, Vue } from 'vue-facing-decorator';
import Button from '../Button.vue';
import MessageItem from '../messages/MessageItem.vue';
import ButtonNotification from '../ButtonNotification.vue';

@Component({
	components:{
		ButtonNotification,
		MessageItem,
	}
})
export default class NewUsers extends Vue {

	public overIndex = -1;
	public showList = true;
	public scrollDownAuto = false;
	public indexOffset = 0;
	public deleteInterval = -1;
	public windowHeight = .3;
	public localMessages:(TwitchatDataTypes.GreetableMessage)[] = [];

	private disposed = false;
	private resizing = false;
	private streakMode = true;
	private mouseY = 0;
	private highlightState:{[key:string]:boolean} = {};

	private mouseUpHandler!:(e:MouseEvent|TouchEvent)=> void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;
	private deleteMessageHandler!:(e:GlobalEvent)=> void;
	private addMessageHandler!:(e:GlobalEvent)=> void;

	public get styles():{[key:string]:string} {
		if(!this.showList) return {"min-height":"unset"};
		return {
			"height": (this.windowHeight*100) + '%',
			"min-height": "max(calc(75px + 1.5em), "+(this.windowHeight*100) + "%)",
		}
	}

	public get autoDeleteOptions():{seconds:number, label:string}[]{
		const durations = [60, 120, 180, 240, 300, 600 ,900 ,1200, 1800, 3600];
		const res:{seconds:number, label:string}[] = [];
		for (let i = 0; i < durations.length; i++) {
			res.unshift({seconds:durations[i], label:Math.round(durations[i]/60).toString()+"m"});
		}
		const v = this.$store("params").greetThemAutoDelete
		if(!durations.includes(v)) {
			res.unshift({seconds:v, label:Math.round(v/60).toString()+"m"});
		}
		res.unshift({seconds:-1, label:this.$t("greet.never")});
		res.sort((a,b)=> a.seconds - b.seconds);
		return res;
	}

	public beforeMount():void {
		const storeValue = DataStore.get(DataStore.GREET_AUTO_SCROLL_DOWN);
		if(storeValue == "true") this.scrollDownAuto = true;
		let height = DataStore.get(DataStore.GREET_AUTO_HEIGHT)
		if(height) this.windowHeight = parseFloat(height);
		
		const autoDeleteStore = DataStore.get(DataStore.GREET_AUTO_DELETE_AFTER);
		if(autoDeleteStore != null) {
			this.$store("params").greetThemAutoDelete = parseInt(autoDeleteStore);
		}

		//Save new "auto delete after" value when changed
		watch(()=>this.$store("params").greetThemAutoDelete, ()=>{
			DataStore.set(DataStore.GREET_AUTO_DELETE_AFTER, this.$store("params").greetThemAutoDelete);
		});

		//Automatically deletes messages after the configured delay
		this.deleteInterval = setInterval(()=> {
			const delay = this.$store("params").greetThemAutoDelete;
			if(delay == -1) return;

			const clearTimeoffset = Date.now() - delay * 1000;
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
			const history = this.$store("chat").messages.filter(m => m.type == "message") as TwitchatDataTypes.GreetableMessage[];
			this.localMessages = this.localMessages.concat(history).splice(0,50);
		}

		// watch(()=>this.localMessages, (v)=>{
		// 	console.log("update");
		// }, {deep:true})

		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		this.mouseUpHandler = () => this.resizing = false;
		this.mouseMoveHandler = (e:MouseEvent|TouchEvent) => this.onMouseMove(e);
		this.deleteMessageHandler = (e:GlobalEvent) => this.onDeleteMessage(e);
		this.addMessageHandler = (e:GlobalEvent) => this.onAddMessage(e);
		
		document.addEventListener("mouseup", this.mouseUpHandler);
		document.addEventListener("touchend", this.mouseUpHandler);
		document.addEventListener("mousemove", this.mouseMoveHandler);
		document.addEventListener("touchmove", this.mouseMoveHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GREET_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.GREET_FEED_READ_ALL, this.publicApiEventHandler);
		EventBus.instance.addEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
		EventBus.instance.addEventListener(GlobalEvent.DELETE_MESSAGE, this.deleteMessageHandler);

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
		EventBus.instance.removeEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
		EventBus.instance.removeEventListener(GlobalEvent.DELETE_MESSAGE, this.deleteMessageHandler);
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
	private async onAddMessage(event:GlobalEvent):Promise<void> {
		const maxLength = 100;
		const m = (event.data as TwitchatDataTypes.GreetableMessage);
		if(!m.todayFirst) return;
		
		if(m.user.is_blocked === true) return;//Ignore blocked users
		//Ignore self messages
		if(m.user.id == StoreProxy.auth.twitch.user.id) return;
		//Ignore bot messages
		if(StoreProxy.users.knownBots[m.platform][m.user.login.toLowerCase()] === true) return;
		
		this.localMessages.push(m);
		if(this.localMessages.length >= maxLength) {
			this.localMessages = this.localMessages.slice(-maxLength);
		}
		await this.$nextTick();
		this.scrollTo();
	}

	/**
	 * Called when a message is deleted
	 */
	private onDeleteMessage(e:GlobalEvent):void {
		const data = e.data as {message:TwitchatDataTypes.GreetableMessage, force:boolean};
		
		//remove from displayed messages
		for (let i = this.localMessages.length-1; i >= 0; i--) {
			const m = this.localMessages[i];
			if(m.id == data.message.id) {
				this.localMessages.splice(i, 1);
				break;
			}
		}
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
	public deleteMessage(m:TwitchatDataTypes.GreetableMessage, index:number, singleMode = false):void {
		if(!this.streakMode || singleMode) {
			let el = (this.$refs["message"] as Vue[])[index];
			this.indexOffset = parseInt((el.$el as HTMLElement).dataset.index as string);
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
		this.$confirm(this.$t("greet.clear_confirm_title"), this.$t("greet.clear_confirm_description"), null).then(() => {
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
					(items[i].$el as HTMLDivElement).style.opacity = ".3";
				}
				
			}
		}else{
			this.highlightState[this.localMessages[index].id as string] = true;
			(items[index].$el as HTMLDivElement).style.opacity = ".3";
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

	private renderFrame():void {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		if(!this.resizing) return;

		const bounds = ((this.$el as HTMLDivElement).parentElement as HTMLDivElement).getBoundingClientRect();
		const maxHeight = .8;
		this.windowHeight = Math.min(maxHeight, (this.mouseY - bounds.top) / bounds.height);
		
		DataStore.set(DataStore.GREET_AUTO_HEIGHT, this.windowHeight);
	}

}
</script>

<style scoped lang="less">
.greetThem{
	// background-color: #218bac;
	background-color: var(--windowStateColor);
	box-shadow: 0 5px 5px 0 rgba(0,0,0,0.5);
	display: flex;
	flex-direction: column;
	min-height: calc(75px + 1.5em);
	max-height: 60vh;
	z-index: 1;
	position: relative;

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
				color: var(--mainColor_light);
				img {
					height: .8em;
					margin-right: 3px;
				}
			}
			select {
				font-size: .8em;
				padding: 0px 2px;
				border-radius: 5px;
				color: var(--mainColor_light);
				background-color: rgba(0,0,0,.5);
				border-color:  rgba(0, 0, 0, .8);
				option {
					background-color: var(--mainColor_dark);
				}
			}
		}
	}

	.messageList {
		overflow-y: auto;

		.message {
			position: relative;
			cursor: pointer;
			overflow: hidden;
			font-family: var(--font-inter);
			color: #fff;
			transition: background-color .25s;
			border: 1px solid transparent;
			padding: 0 0 0 .5em;

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
		color: var(--mainColor_light);
		border-bottom: 1px dashed var(--mainColor_light);
		background-color: fade(@windowStateColor,60%);
		display: flex;
		align-items: flex-end;
		padding-bottom: 5px;
	}

}
</style>