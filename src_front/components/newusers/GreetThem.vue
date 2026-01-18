<template>
	<div class="greetThem" v-show="messages.length > 0" :style="styles">
		<div class="header" @click="toggleList()">
			<div class="title">
				<ButtonNotification class="scrollBt clearButton"
					:aria-label="$t(scrollDownAuto? 'greet.auto_scroll_off_aria' : 'greet.auto_scroll_on_aria')"
					:icon="'scroll'+(scrollDownAuto? 'Down' : 'Up')"
					v-tooltip="$t(scrollDownAuto? 'greet.auto_scroll_down' : 'greet.auto_scroll_up')"
					@click.stop="toggleScroll()" />

				<h1>{{ $t("greet.title") }} <span class="count">({{messages.length}})</span></h1>

				<ButtonNotification class="clearBt clearButton"
					icon="checkmark"
					v-tooltip="$t('greet.clearBt')"
					@click.stop="clearAll()" />

				<ButtonNotification class="clearBt clearButton"
					icon="date"
					v-tooltip="$t('greet.resetBt')"
					@click.stop="resetHistory()"
					v-newflag="{date:1693519200000, id:'greetThem_clear'}" />
			</div>

			<div class="topForm" v-if="showList" @click.stop>
				<form class="row">
					<label for="greetThem_duration"><Icon name="timeout" theme="light" alt="timer" />{{ $t("greet.auto_delete") }}</label>
					<select id="greetThem_duration" v-model.number="$store.params.greetThemAutoDelete">
						<option v-for="v in autoDeleteOptions" :value="v.seconds">{{v.label}}</option>
					</select>
				</form>
			</div>
		</div>

		<div class="messageList" v-if="showList" ref="messageList">
			<template v-for="(m,index) in messagesFiltered" :key="m.id">
				<MessageItem class="messageListItem"
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
			<div class="more" v-if="messages.length > messagesFiltered.length">+{{ messages.length - messagesFiltered.length }}</div>
		</div>
		<div class="grip" v-if="showList" @mousedown="startDrag()" @touchstart="startDrag()"></div>
	</div>
</template>

<script lang="ts">
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import DataStore from '@/store/DataStore';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { watch, type ComponentPublicInstance } from '@vue/runtime-core';
import { Component, toNative, Vue } from 'vue-facing-decorator';
import ButtonNotification from '../ButtonNotification.vue';
import Icon from '../Icon.vue';
import MessageItem from '../messages/MessageItem.vue';

@Component({
	components:{
		Icon,
		MessageItem,
		ButtonNotification,
	}
})
class NewUsers extends Vue {

	public overIndex = -1;
	public showList = true;
	public scrollDownAuto = false;
	public indexOffset = 0;
	public deleteInterval = -1;
	public windowHeight = .3;
	public messages:(TwitchatDataTypes.GreetableMessage | TwitchatDataTypes.MessageCustomData)[] = [];

	private maxItems = 50;
	private disposed = false;
	private resizing = false;
	private mouseY = 0;

	private mouseUpHandler!:(e:MouseEvent|TouchEvent)=> void;
	private mouseMoveHandler!:(e:MouseEvent|TouchEvent)=> void;
	private publicApiEventHandler!:(e:TwitchatEvent<{count?:number}>)=> void;
	private deleteMessageHandler!:(e:GlobalEvent)=> void;
	private addMessageHandler!:(e:GlobalEvent)=> void;

	public get messagesFiltered():(TwitchatDataTypes.GreetableMessage | TwitchatDataTypes.MessageCustomData)[] {
		return this.messages.concat().splice(0,this.maxItems);
	}

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
		for (const duration of durations) {
			res.unshift({seconds:duration, label:Math.round(duration/60).toString()+"m"});
		}
		const v = this.$store.params.greetThemAutoDelete
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
			this.$store.params.greetThemAutoDelete = parseInt(autoDeleteStore);
		}

		//Save new "auto delete after" value when changed
		watch(()=>this.$store.params.greetThemAutoDelete, ()=>{
			DataStore.set(DataStore.GREET_AUTO_DELETE_AFTER, this.$store.params.greetThemAutoDelete);
		});

		//Automatically deletes messages after the configured delay
		this.deleteInterval = window.setInterval(()=> {
			const delay = this.$store.params.greetThemAutoDelete;
			if(delay == -1) return;

			const clearTimeoffset = Date.now() - delay * 1000;
			for (let i = 0; i < this.messages.length; i++) {
				const m = this.messages[i]!;
				if(m.date < clearTimeoffset) {
					this.messages.splice(i, 1);
					i--;
				}
			}
		}, 5000);

		//Debug to add all the current messages to the list
		//Uncomment it if you want messages to be added to the list after
		//a hot reload during development
		// if(!Config.instance.IS_PROD) {
		// 	const history = this.$store.chat.messages.filter(m => m.type == "message") as TwitchatDataTypes.GreetableMessage[];
		// 	this.messages = this.messages.concat(history);
		// }

		// watch(()=>this.localMessages, (v)=>{
		// 	console.log("update");
		// }, {deep:true})

		this.publicApiEventHandler = (e) => this.onPublicApiEvent(e);
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
		this.renderFrame();
	}

	/**
	 * Called when a new message is received
	 */
	private async onAddMessage(event:GlobalEvent):Promise<void> {
		const m = (event.data as (TwitchatDataTypes.GreetableMessage | TwitchatDataTypes.MessageCustomData));
		if(!m.todayFirst) return;

		this.messages.push(m);
		await this.$nextTick();
		this.scrollTo();
	}

	/**
	 * Called when a message is deleted
	 */
	private onDeleteMessage(e:GlobalEvent):void {
		const data = e.data as {message:(TwitchatDataTypes.GreetableMessage | TwitchatDataTypes.MessageCustomData), force:boolean};

		//remove from displayed messages
		for (let i = this.messages.length-1; i >= 0; i--) {
			const m = this.messages[i]!;
			if(m.id == data.message.id) {
				this.messages.splice(i, 1);
				break;
			}
		}
	}

	/**
	 * Called when requesting an action from the public API
	 */
	private onPublicApiEvent(e:TwitchatEvent<{count?:number}>):void {
		const data = e.data!;
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
				readCount = this.messages.length
				break;
			}
		}

		for (let i = 0; i < readCount; i++) {
			if(this.messages.length === 0) break;
			this.messages.splice(0, 1);
		}
	}

	/**
	 * Called when clicking a message
	 * Either removes a streak of messages or one single message
	 */
	public deleteMessage(m:TwitchatDataTypes.GreetableMessage | TwitchatDataTypes.MessageCustomData, index:number, singleMode = false):void {
		if(singleMode) {
			let el = (this.$refs["message"] as ComponentPublicInstance[])[index]!;
			this.indexOffset = parseInt((el.$el as HTMLElement).dataset.index as string);
			this.messages.splice(index, 1);
		}else{
			this.indexOffset = 0;
			this.overIndex = -1;
			let messages = this.messages;
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
		this.messages = [];
	}

	/**
	 * Reset greeting history
	 */
	public resetHistory():void {
		this.$confirm(this.$t("greet.reset_confirm_title"), this.$t("greet.reset_confirm_description"), null)
		.then(() => {
			this.$store.chat.resetGreetingHistory();
		}).catch(()=>{});
	}

	/**
	 * Called when rolling over an item
	 */
	public onMouseOver(e:MouseEvent, index:number):void {
		if(this.resizing) return;

		this.overIndex = index;
		let items = (this.$refs.messageList as HTMLElement).querySelectorAll<HTMLElement>(".messageListItem");
		for (const item of items) {
			//Why the hell do I use inline styles this way instead of
			//doing it the Vue way by simply updating a prop set
			//to the component so it automatically updates when updating
			//that prop ?
			//Because it's drastically faster this way. There's a huge
			//rendering pipeline performance issue i couldn't solve
			//by any other method.
			item.style.opacity = ".3";

		}
	}

	/**
	 * Called when the mouse moves
	 */
	private async onMouseMove(e:MouseEvent|TouchEvent):Promise<void> {
		if(e.type == "mousemove") {
			this.mouseY = (e as MouseEvent).clientY;
		}else{
			this.mouseY = (e as TouchEvent).touches[0]!.clientY;
		}
	}

	/**
	 * Called when rolling out of an item
	 */
	public onMouseOut():void {
		this.overIndex = -1;
		let items = this.$refs.message as ComponentPublicInstance[];
		for (const item of items) {
			(item.$el as HTMLDivElement).removeAttribute("style");
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

	private renderFrame():void {
		if(this.disposed || !this.resizing) return;
		requestAnimationFrame(()=>this.renderFrame());

		const bounds = ((this.$el as HTMLDivElement).parentElement as HTMLDivElement).getBoundingClientRect();
		const maxHeight = .8;
		this.windowHeight = Math.min(maxHeight, (this.mouseY - bounds.top) / bounds.height);

		DataStore.set(DataStore.GREET_AUTO_HEIGHT, this.windowHeight);
	}

}
export default toNative(NewUsers);
</script>

<style scoped lang="less">
.greetThem{
	background-color: var(--background-color-secondary);
	display: flex;
	flex-direction: column;
	min-height: calc(75px + 1.5em);
	max-height: 60vh;
	z-index: 1;
	position: relative;

	.header {
		background-color: var(--color-primary);
		padding: .5em 0;
		cursor: pointer;
		.title {
			display: flex;
			flex-direction: row;
			justify-content: center;
			color: var(--color-light);
			h1 {
				text-align: center;
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
				border-radius: var(--border-radius);
			}
		}

		.topForm {
			display: flex;
			flex-direction: column;
			align-items: center;
			.row {
				display: flex;
				flex-direction: row;
				align-items: center;
				font-size: .8em;

				label {
					margin: 0;
					margin-right: 5px;
					color: var(--color-light);
					.icon {
						height: .8em;
						margin-right: 3px;
					}
				}
				select {
					font-size: .8em;
					padding: 0px 2px;
					color: var(--color-light);
					background-color: rgba(0,0,0,.5);
					option {
						color: var(--color-light);
						background-color: var(--color-dark);
					}
				}
			}
		}
	}

	.messageList {
		overflow-y: auto;
		flex-grow: 1;
		border: 2px solid var(--color-primary);
		border-bottom-left-radius: var(--border-radius);
		border-bottom-right-radius: var(--border-radius);
		box-shadow: 0 2px 2px 0 rgba(0,0,0,0.5);
		.messageListItem {
			cursor: pointer;
			overflow: hidden;
			font-family: var(--font-inter);
			transition: background-color .25s;
			margin: 0;

			&:nth-child(odd) {
				background-color: fade(#ffffff, 5%);
			}

			&>:deep(*) {
				//avoid being able to click on nicknames, links, ...
				pointer-events: none;
			}
		}

		.more {
			text-align: center;
			font-style: italic;
			font-size: .8em;
			padding: .25em;
			color: var(--color-text);
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

}
</style>
