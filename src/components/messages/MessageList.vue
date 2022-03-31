<template>
	<div :class="classes"
	@mouseenter="onHoverList()"
	@mouseleave="onLeaveList()"
	@mousewheel="onMouseWheel($event)">
		<div class="holder" ref="messageHolder" id="test">
			<div v-for="m in localMessages" :key="m.tags.id" ref="message" class="subHolder"
			@mouseenter="enterMessage(m)"
			@mouseleave="leaveMessage(m)"
			@click="toggleMarkRead(m)">
				<ChatMessage
					v-if="m.type == 'message'"
					class="message"
					:messageData="m"
					:lightMode="lightMode"
					@showConversation="openConversation"
					@showUserMessages="openUserHistory"
					@mouseleave="onMouseLeave(m)"
					:ref="'message_'+m.tags.id"
					/>
					
				<ChatNotice
					v-else-if="m.type == 'notice'"
					class="message"
					:messageData="m"
					:ref="'message_'+m.tags.id"
					/>

				<ChatHighlight
					v-else-if="m.type == 'highlight'"
					class="message"
					:messageData="m"
					lightMode
					:ref="'message_'+m.tags.id"
					/>

				<ChatPollResult
					class="message"
					:ref="'message_'+m.tags.id"
					v-else-if="m.type == 'poll' && $store.state.params.filters.showPollPredResults.value"
					:pollData="m" />

				<ChatPredictionResult
					class="message"
					:ref="'message_'+m.tags.id"
					v-else-if="m.type == 'prediction' && $store.state.params.filters.showPollPredResults.value"
					:predictionData="m" />

				<div class="markRead"
					v-if="!lightMode && m.markedAsRead"></div>
				<!-- <img class="markRead" src="@/assets/icons/markRead.svg"
					v-if="!lightMode && m.markedAsRead"
					data-tooltip="Read flag"> -->

				<transition name="slide">
					<ChatMessageHoverActions class="hoverActions"
						v-if="m.showHoverActions && !lightMode"
						:messageData="m"
						@toggleMarkRead="toggleMarkRead(m)" />
				</transition>
			</div>
		</div>

		<div class="locked" v-if="(lockScroll || pendingMessages.length > 2) && !lightMode">
			<div class="label">
				<p v-if="lockScroll">Chat paused</p>
				<p v-if="pendingMessages.length > 0">(+{{pendingMessages.length}})</p>
				<Button v-if="pendingMessages.length > 0" :icon="require('@/assets/icons/down.svg')" @click.stop="unPause()" />
			</div>
		</div>

		<div class="conversation"
			ref="conversationHolder"
			v-if="conversation.length > 0" :style="conversationStyles"
			@mouseenter="reopenLastConversation()"
			@mouseleave="onMouseLeave()"
		>
			<div class="head">
				<h1 v-if="conversationMode">Conversation</h1>
				<h1 v-if="!conversationMode">History</h1>
				<Button :icon="require('@/assets/icons/cross_white.svg')" @click="onMouseLeave()" />
			</div>
			<div class="messages" ref="conversationMessages">
				<ChatMessage
					v-for="m in conversation"
					:key="m.tags.id"
					class="message"
					:messageData="m"
					disableConversation
					/>
			</div>
		</div>

		<div v-if="localMessages.length == 0 && !lightMode" class="noMessage">
			<div class="gradient"></div>
		</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import store from '@/store';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { IRCEventDataList } from '@/utils/IRCEvent';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap/all';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatHighlight from './ChatHighlight.vue';
import ChatMessageHoverActions from './ChatMessageHoverActions.vue';
import ChatNotice from './ChatNotice.vue';
import ChatPollResult from './ChatPollResult.vue';
import ChatPredictionResult from './ChatPredictionResult.vue';

@Options({
	components:{
		Button,
		ChatNotice,
		ChatMessage,
		ChatHighlight,
		ChatPollResult,
		ChatPredictionResult,
		ChatMessageHoverActions,
	},
	props: {
		max:Number,
		lightMode:Boolean,//Used by OBS chat
	}
})
export default class MessageList extends Vue {

	public max!: number;
	public localMessages:(IRCEventDataList.Message | IRCEventDataList.Highlight)[] = [];
	public pendingMessages:(IRCEventDataList.Message | IRCEventDataList.Highlight)[] = [];
	public conversation:(IRCEventDataList.Message | IRCEventDataList.Highlight)[] = [];
	public lightMode:boolean = false;
	public lockScroll:boolean = false;
	public conversationPos:number = 0;
	public conversationMode:boolean = true;//Used to change title between History/Conversation

	private disposed:boolean = false;
	private frameIndex:number = 0;
	private prevMarkedReadItem:IRCEventDataList.Message | null = null;
	private virtualScrollY:number = -1;
	private idDisplayed:{[key:string]:boolean} = {};
	private openConvTimeout!:number;
	private closeConvTimeout!:number;
	private deleteMessageHandler!:(e:IRCEvent)=>void;

	public get classes():string[] {
		let res = ["messagelist"];
		if(this.lightMode) res.push("lightMode");
		if(this.lockScroll) res.push("lockScroll");

		res.push("size_"+store.state.params.appearance.defaultSize.value);

		return res;
	}

	public get conversationStyles():unknown {
		return { top: this.conversationPos+"px" }
	}

	public async mounted():Promise<void> {
		this.localMessages = store.state.chatMessages.concat().slice(-this.max);
		watch(() => store.state.chatMessages, async (value:(IRCEventDataList.Message | IRCEventDataList.Highlight)[]) => {
			//If scrolling is locked or there are still messages pending
			//add the new messages to the pending list
			const el = this.$refs.messageHolder as HTMLDivElement;
			const h = (this.$refs.messageHolder as HTMLDivElement).offsetHeight;
			const maxScroll = (el.scrollHeight - h);

			if(this.lockScroll || this.pendingMessages.length > 0 || el.scrollTop < maxScroll) {
				for (let i = 0; i < store.state.chatMessages.length; i++) {
					const m = store.state.chatMessages[i] as IRCEventDataList.Message;
					if(this.idDisplayed[m.tags.id as string] !== true) {
						this.idDisplayed[m.tags.id as string] = true;
						this.pendingMessages.push(m);
					}
				}
				return;
			}
			
			this.localMessages = value.concat().slice(-this.max);
			this.filterMessages();
			for (let i = 0; i < value.length; i++) {
				this.idDisplayed[value[i].tags.id as string] = true;
			}

			this.scrollToPrevMessage();
		}, {
			// deep:true
		});

		this.deleteMessageHandler = (e:IRCEvent)=> this.onDeleteMessage(e);

		IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);

		await this.$nextTick();
		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;

		IRCClient.instance.removeEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);
	}

	public onHoverList():void {
		if(this.lightMode || !store.state.params.features.lockAutoScroll.value) return;
		this.lockScroll = true;
	}

	public onLeaveList():void {
		// if(this.catchingUpPendingMessages) return;
		const el = this.$refs.messageHolder as HTMLDivElement;
		const h = (this.$refs.messageHolder as HTMLDivElement).offsetHeight;
		const maxScroll = (el.scrollHeight - h);

		if(this.pendingMessages.length == 0 && el.scrollTop >= maxScroll - 50) {
			this.lockScroll = false;
		}
	}

	/**
	 * Called when a message is deleted
	 * Messages are automatically deleted from the store collection
	 * but if we scroll up to lock the messages, it switches to a
	 * local history that's not linked anymore to the main collection.
	 * If the message is added to that history, it won't be deleted
	 * automatically, hence, we need this to do it.
	 */
	public onDeleteMessage(e:IRCEvent):void {
		const data = e.data as IRCEventDataList.MessageDeleted;
		if(this.pendingMessages.length > 0) {
			let index = this.pendingMessages.findIndex(v => v.tags.id === data.tags['target-msg-id']);
			if(index > -1) {
				this.pendingMessages.splice(index, 1);
			}
		}
		let index = this.localMessages.findIndex(v => v.tags.id === data.tags['target-msg-id']);
		if(index > -1) {
			this.localMessages.splice(index, 1);
		}
	}

	/**
	 * Catch up all pending messages
	 */
	public async unPause():Promise<void> {
		let messages = this.pendingMessages.slice(-this.max);
		this.pendingMessages = [];
		this.localMessages = this.localMessages.concat(messages).slice(-this.max);
		this.filterMessages();

		//Using setTimeout as a workaround for a shit mouseenter behavior.
		//When clicking the "scroll down" button, its holder is removed
		//from the DOM which makes the main holder fire a mouseenter event.
		//Because of that the "lockScroll" flag is set back to true right
		//after clicking the "scroll down" button which freezes the scroll.
		//I couldn't find any better solution than this.
		//Not even a "await this.$nextTick()".
		setTimeout(()=> {
			this.lockScroll = false;
			
			const el = this.$refs.messageHolder as HTMLDivElement;
			const h = (this.$refs.messageHolder as HTMLDivElement).offsetHeight;
			const maxScroll = (el.scrollHeight - h);
			this.virtualScrollY = maxScroll;
		}, 0);
	}

	/**
	 * Filters out messages for the chat light (overlay)
	 */
	private filterMessages():void {
		if(!this.lightMode) return;

		for (let i = 0; i < this.localMessages.length; i++) {
			const m = this.localMessages[i];
			if(m.type != "message" || m.automod || m.deleted) {
				this.localMessages.splice(i, 1);
				i--;
			}
		}
	}

	/**
	 * If hovering and scrolling down with wheel, load next message
	 */
	public async onMouseWheel(event:WheelEvent):Promise<void> {
		if(this.lightMode) return;
		if(event.deltaY < 0) {
			this.lockScroll = true;
		}else{
			//If scrolling down while at the bottom of the list, load next message
			const el = this.$refs.messageHolder as HTMLDivElement;
			const h = (this.$refs.messageHolder as HTMLDivElement).offsetHeight;
			const maxScroll = (el.scrollHeight - h);
			
			if(maxScroll < 0) {
				this.showNextPendingMessage(true);
				return;
			}

			const messRefs = this.$refs.message as HTMLDivElement[];
			const lastMessRef = messRefs[messRefs.length-1];

			if((maxScroll - el.scrollTop) <= lastMessRef.offsetHeight) {
				event.preventDefault();
				event.stopPropagation();
				this.showNextPendingMessage(true);
			}
		}
	}

	/**
	 * Called 60 times/sec to scroll the list and load new messages
	 * if there are pending ones.
	 */
	public async renderFrame():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		const el = this.$refs.messageHolder as HTMLDivElement;
		const h = (this.$refs.messageHolder as HTMLDivElement).offsetHeight;
		const maxScroll = (el.scrollHeight - h);

		if(!this.lockScroll) {
			//On init the virtualscroll is -1, scroll to the bottom and init the virtualscroll
			if(this.virtualScrollY == -1) this.virtualScrollY = maxScroll;

			const dist = Math.abs(maxScroll-this.virtualScrollY);
			if(dist > 10 || this.pendingMessages.length > 0) {
				//Linear scroll if need to scroll by more than 10px
				this.virtualScrollY += Math.max(2, this.pendingMessages.length*2);
			}else{
				//easeout scroll when reaching bottom
				const ease = .1;
				this.virtualScrollY += (maxScroll-this.virtualScrollY) * ease;
			}
			//Avoid virtual scroll to go beyond bottom
			if(this.virtualScrollY >= maxScroll-2) {
				this.virtualScrollY = maxScroll;
			}
			el.scrollTop = this.virtualScrollY;
		}

		//Show next pending message if at the bottom and scroll isn't locked
		if(el.scrollTop >= maxScroll
		&& !this.lockScroll
		&& this.pendingMessages.length > 0) {
			this.showNextPendingMessage();
		}
		
	}

	/**
	 * Get the next pending message and display it to the list
	 */
	private showNextPendingMessage(wheelOrigin:boolean = false):void {
		if(this.pendingMessages.length == 0) return;
		
		const m = this.pendingMessages.shift() as IRCEventDataList.Message;
		this.idDisplayed[m.tags.id as string] = true;
		this.localMessages.push( m );
		if(this.localMessages.length > this.max) {
			this.localMessages = this.localMessages.slice(-this.max);
		}
		this.scrollToPrevMessage(wheelOrigin);
	}

	/**
	 * Call this after adding a new message.
	 * Will scroll so the previous message is on the bottom of the list
	 * so the new message displays smoothly from the bottom of the screen
	 */
	private async scrollToPrevMessage(wheelOrigin:boolean = false):Promise<void> {
		await this.$nextTick();
		const el = this.$refs.messageHolder as HTMLDivElement;
		const h = (this.$refs.messageHolder as HTMLDivElement).offsetHeight;
		const maxScroll = (el.scrollHeight - h);

		const messRefs = this.$refs.message as HTMLDivElement[];
		const lastMessRef = messRefs[ messRefs.length - 1 ];
		
		if(lastMessRef) {
			if(wheelOrigin) {
				//If scrolling down with mouse wheel while scrolling is locked, interpolate
				//scroll via tween as the renderFrame does nothing while scroll is locked
				gsap.killTweensOf(el);
				gsap.to(el, {duration:.35, scrollTop:maxScroll, ease:"sine.inOut", onUpdate:()=>{
					this.virtualScrollY = el.scrollTop;
				}});
			}else{
				this.virtualScrollY = maxScroll - lastMessRef.offsetHeight;
			}
		}

		//Check if last marked as read message is still there
		if(this.prevMarkedReadItem) {
			if((this.$refs["message_"+this.prevMarkedReadItem.tags.id] as Vue[]).length == 0) {
				this.prevMarkedReadItem = null;
			}
		}
	}

	/**
	 * Avoids closing the conversation when rolling over it
	 */
	public async reopenLastConversation():Promise<void> {
		clearTimeout(this.closeConvTimeout);
	}

	/**
	 * Called when asking to read a conversation
	 * Display the full conversation if any
	 */
	public async openConversation(event:MouseEvent, m:IRCEventDataList.Message):Promise<void> {
		if(this.lightMode || !m || (!m.answerTo && !m.answers)) return;

		this.conversationMode = true;

		if(m.answers) {
			this.conversation = m.answers.concat();
			this.conversation.unshift( m );
		}else if(m.answerTo) {
			this.conversation = (m.answerTo.answers as IRCEventDataList.Message[]).concat();
			this.conversation.unshift( m.answerTo );
		}
		await this.$nextTick();
		this.openConversationHolder(event);
	}

	/**
	 * Called to open a user's messages history
	 */
	public async openUserHistory(event:MouseEvent, m:IRCEventDataList.Message):Promise<void> {
		if(this.lightMode || !m) return;

		clearTimeout(this.openConvTimeout);
		this.openConvTimeout = setTimeout(async ()=> {
			this.conversationMode = false;
	
			let messageList:IRCEventDataList.Message[] = [];
			for (let i = 0; i < store.state.chatMessages.length; i++) {
				const mess = store.state.chatMessages[i] as (IRCEventDataList.Message|IRCEventDataList.Highlight);
				if(mess.type == "message" && mess.tags['user-id'] == m.tags['user-id']) {
					messageList.push(mess);
				}
			}
			this.conversation = messageList;
	
			await this.$nextTick();
			this.openConversationHolder(event);
		}, 350)
	}

	/**
	 * Opens up the conversation holder.
	 * Call this after making sure the messages are rendered
	 */
	private openConversationHolder(event:MouseEvent):void {
		clearTimeout(this.closeConvTimeout);

		let el = event.target as HTMLDivElement;
		var top = 0;
		do {
			top += el.offsetTop  || 0;
			el = el.offsetParent as HTMLDivElement;
		} while(el);

		const mainHolder = this.$refs.messageHolder as HTMLDivElement;
		const holder = this.$refs.conversationHolder as HTMLDivElement;
		this.conversationPos = Math.max(0, top - holder.offsetHeight - mainHolder.scrollTop);
		
		const messholder = this.$refs.conversationMessages as HTMLDivElement;
		messholder.scrollTop = messholder.scrollHeight;
		gsap.to(mainHolder, {opacity:.25, duration:.25});
	}

	/**
	 * Called when rolling out of a message
	 * Close the conversation if any displayed
	 */
	public onMouseLeave():void {
		clearTimeout(this.openConvTimeout);
		if(this.conversation.length == 0) return;
		//Timeout avoids blinking when leaving the message but
		//hovering another one or the conversation window
		this.closeConvTimeout = setTimeout(()=>{
			this.conversation = [];
			const mainHolder = this.$refs.messageHolder as HTMLDivElement;
			gsap.to(mainHolder, {opacity:1, clearProps:true, duration:.25});
		}, 0);
	}

	/**
	 * Called when hovering a message
	 */
	public enterMessage(m:IRCEventDataList.Message):void {
		if(m.type != "message" && m.type != "highlight") return;
		if(m.tags['user-id'] && m.tags['user-id'] != store.state.user.user_id) {
			m.showHoverActions = true;
		}
	}

	/**
	 * Called on a message rollout
	 */
	public leaveMessage(m:IRCEventDataList.Message):void {
		m.showHoverActions = false;
	}

	/**
	 * Called on a message is clicked
	 */
	public toggleMarkRead(m:IRCEventDataList.Message):void {
		if(store.state.params.features.markAsRead.value !== true) return;
		m.markedAsRead = !m.markedAsRead;
		if(this.prevMarkedReadItem && this.prevMarkedReadItem != m) {
			this.prevMarkedReadItem.markedAsRead = false;
		}
		if(m.markedAsRead) {
			this.prevMarkedReadItem = m;
		}
	}

}
</script>

<style scoped lang="less">
.messagelist{
	// padding: 10px;
	position: relative;
	display: flex;
	flex-direction: column;

	&.size_1 {
		.message{ font-size: 11px; padding: 2px; }
	}
	&.size_2 {
		.message{ font-size: 13px; padding: 2px; }
	}
	&.size_3 {
		.message{ font-size: 18px; padding: 5px; }
	}
	&.size_4 {
		.message{ font-size: 24px; padding: 5px; }
	}
	&.size_5 {
		.message{ font-size: 30px; padding: 10px; }
	}

	&.lightMode {
		padding: 0;
		.holder {
			padding: 0;
			overflow: hidden;
			.message:nth-child(even) {
				background-color: transparent;
			}
		}
	}

	&.lockScroll {
		.holder {
			// margin-bottom: 40px;
		}
	}

	:deep(.time) {
		color: fade(#ffffff, 75%);
		font-size: .8em;
		vertical-align: middle;
		display: inline-block;
		margin-right: .7em;
		font-variant-numeric: tabular-nums;
	}

	.message {
		overflow: hidden;
		font-family: "Inter";
		color: #fff;
		padding: 5px;
		// border-bottom: 1px solid rgba(255, 255, 255, .05);
	}

	.holder {
		max-height: 100%;
		width: calc(100% - 10px);
		overflow-y: auto;
		overflow-x: hidden;
		// position: absolute;
		// bottom: 0;
		// padding: 10px 0;
		padding: 0;
		padding-bottom: 0;
		// margin-bottom: 10px;

		transition: margin-bottom .25s;

		//TODO fix switching even/odd problem when deleting/adding messages and enable this back
		// .subHolder:nth-child(odd) {
			// background-color: rgba(255, 255, 255, .05);
		// }
		.subHolder {
			display: flex;
			flex-direction: row;
			position: relative;

			&:hover {
				background-color: rgba(255, 255, 255, .2);
			}

			.message {
				flex-grow: 1;
			}
			.markRead {
				width: 100%;
				height: 10000px;
				background: fade(@mainColor_dark, 80%);
				border-bottom: 2px solid @mainColor_light;
				position: absolute;
				bottom: 0;
				pointer-events: none;
			}
		}

		.hoverActions {
			position: absolute;
			right: 0;
			top: 50%;
			transform:translateY(-50%);
		}

		.slide-enter-active {
			transition: all 0.2s;
			transform: translate(0%, -50%);
		}

		.slide-leave-active {
			transition: all 0.2s;
		}
		
		.slide-enter-from,
		.slide-leave-to {
			transform: translate(100%, -50%);
		}
	}

	.locked {
		z-index: 1;
		// position: absolute;
		// bottom: 0px;
		// left: 50%;
		// transform: translateX(-50%);
		width: 100%;
		padding: 0;
		padding-bottom: 5px;
		margin: 0;
		text-align: center;
		border-radius: 5px;
		pointer-events: none;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		background: @mainColor_normal;

		.label {
			display: flex;
			flex-direction: row;
			align-items: center;
			color: #fff;
			width: min-content;
			white-space: nowrap;
			margin: auto;
			padding: 5px;
			font-size: 14px;
			.button {
				width: 100%;
				background: none;
				padding: 0;
				pointer-events: all;
				margin-left: 5px;
				&:hover {
					background: rgba(255, 255, 255, .5);
				}
			}
		}
	}

	.noMessage {
		position:absolute;
		width: calc(100% - 20px);
		max-width: 560px;
		bottom: 0;
		mask-image: url(../../assets/chatPlaceholder.png);
		mask-repeat: no-repeat;
		mask-size: cover;
		.gradient {
			width: 100%;
			height: 513px;
			background: url(../../assets/chatPlaceholder_gradient.png);
			animation: scroll 5s linear infinite, fade 1s linear alternate infinite;
			
		}
		@keyframes scroll {
			from {background-position-y: 800px;}
			to {background-position-y: -800px;}
		}
		@keyframes fade {
			from {opacity: 1;}
			to {opacity: .5;}
		}
	}

	.conversation {
		position: absolute;
		background-color: @mainColor_dark;
		padding: 10px;
		left: 0;
		width: 100%;
		max-width: 100%;
		box-shadow: 0px 0px 20px 0px rgba(0,0,0,1);
		.head {
			display: flex;
			flex-direction: row;
			border-bottom: 1px solid @mainColor_dark_light;
			padding-bottom: 10px;
			margin-bottom: 10px;
			h1 {
				text-align: center;
				flex-grow: 1;
				color: @mainColor_light;
			}
			.button {
				width: 20px;
				height: 20px;
				padding: 3px;
				border-radius: 5px;
			}
		}
		.messages {
			max-height: 200px;
			overflow-y: auto;
			overflow-x: hidden;
		}
	}
}
</style>