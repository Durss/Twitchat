<template>
	<div :class="classes"
	@mouseenter="onHoverList()"
	@mouseleave="onLeaveList()"
	@wheel="onMouseWheel($event)"
	@touchmove="onTouchMove($event)">
		<div aria-live="polite" role="alert" class="ariaMessage">{{ariaMessage}}</div>
		<div class="holder" ref="messageHolder" :style="holderStyles">
			<div v-for="m in localMessages" :key="m.tags.id" ref="message" class="subHolder"
			@click="toggleMarkRead(m, $event)">
				<ChatAd class="message"
					:messageData="m"
					v-if="m.type == 'ad' && !lightMode"
					@showModal="(v:string)=>$emit('showModal', v)"
					@delete="forceDelete(m)"
					:ref="'message_'+m.tags.id"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
				/>

				<ChatMessage
					v-else-if="m.type == 'message' || (m.type == 'whisper' && $store.state.params.features.showWhispersOnChat.value)"
					class="message"
					:messageData="m"
					:lightMode="lightMode"
					@showConversation="openConversation"
					@showUserMessages="openUserHistory"
					@mouseleave="onMouseLeave()"
					:ref="'message_'+m.tags.id"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					/>
					
				<ChatNotice
					v-else-if="m.type == 'notice'"
					class="message"
					:messageData="m"
					:ref="'message_'+m.tags.id"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					/>

				<ChatHighlight
					v-else-if="m.type == 'highlight' && $store.state.params.filters.showNotifications.value"
					class="message"
					:messageData="m"
					lightMode
					:ref="'message_'+m.tags.id"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					/>

				<ChatPollResult
					class="message"
					:ref="'message_'+m.tags.id"
					v-else-if="m.type == 'poll' && $store.state.params.filters.showNotifications.value"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					:pollData="m"
				/>

				<ChatPredictionResult
					class="message"
					:ref="'message_'+m.tags.id"
					v-else-if="m.type == 'prediction' && $store.state.params.filters.showNotifications.value"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					:predictionData="m"
				/>

				<ChatBingoResult
					class="message"
					:ref="'message_'+m.tags.id"
					v-else-if="m.type == 'bingo' && $store.state.params.filters.showNotifications.value"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					:bingoData="m"
				/>

				<ChatRaffleResult
					class="message"
					:ref="'message_'+m.tags.id"
					v-else-if="m.type == 'raffle' && $store.state.params.filters.showNotifications.value"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					:raffleData="m"
				/>

				<ChatCountdownResult
					class="message"
					:ref="'message_'+m.tags.id"
					v-else-if="m.type == 'countdown' && $store.state.params.filters.showNotifications.value"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					:countdownData="m"
				/>

				<div class="markRead" v-if="!lightMode && m.markedAsRead"></div>

				<div class="hoverActionsHolder"
				v-if="!lightMode && m.type == 'message'">
					<ChatMessageHoverActions class="hoverActions" :messageData="m" />
				</div>
			</div>
		</div>

		<div class="locked" ref="locked" v-if="lockScroll && !lightMode" @click.stop="unPause()">
			<span v-if="lockScroll">Chat paused</span>
			<span v-if="pendingMessages.length > 0">(+{{pendingMessages.length}})</span>
		</div>

		<div class="conversation"
			ref="conversationHolder"
			v-if="conversation.length > 0" :style="conversationStyles"
			@mouseenter="reopenLastConversation()"
			@mouseleave="onMouseLeave()"
			@wheel.stop=""
		>
			<div class="head">
				<h1 v-if="conversationMode">Conversation</h1>
				<h1 v-if="!conversationMode">History</h1>
				<Button class="button" aria-label="close conversation" :icon="$image('icons/cross_white.svg')" @click="onMouseLeave()" />
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
import IRCEvent from '@/utils/IRCEvent';
import type { IRCEventDataList } from '@/utils/IRCEventDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import PubSub from '@/utils/PubSub';
import PubSubEvent from '@/utils/PubSubEvent';
import TwitchatEvent from '@/utils/TwitchatEvent';
import UserSession from '@/utils/UserSession';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatAd from './ChatAd.vue';
import ChatBingoResult from './ChatBingoResult.vue';
import ChatHighlight from './ChatHighlight.vue';
import ChatMessageHoverActions from './ChatMessageHoverActions.vue';
import ChatNotice from './ChatNotice.vue';
import ChatPollResult from './ChatPollResult.vue';
import ChatPredictionResult from './ChatPredictionResult.vue';
import ChatRaffleResult from './ChatRaffleResult.vue';
import ChatCountdownResult from './ChatCountdownResult.vue';

@Options({
	components:{
		Button,
		ChatAd,
		ChatNotice,
		ChatMessage,
		ChatHighlight,
		ChatPollResult,
		ChatBingoResult,
		ChatRaffleResult,
		ChatCountdownResult,
		ChatPredictionResult,
		ChatMessageHoverActions,
	},
	props: {
		max:Number,
		lightMode:{
			type:Boolean,
			default:false,
		},//Used by OBS chat
	},
	emits:["showModal"]
})
export default class MessageList extends Vue {

	public max!: number;
	public lightMode!:boolean;
	public localMessages:MessageTypes[] = [];
	public pendingMessages:MessageTypes[] = [];
	public conversation:MessageTypes[] = [];
	public ariaMessage = "";
	public ariaMessageTimeout = -1;
	public lockScroll = false;
	public conversationPos = 0;
	public scrollAtBottom = true;
	public conversationMode = true;//Used to change title between "History"/"Conversation"

	private disposed = false;
	private holderOffsetY = 0;
	private prevMarkedReadItem:MessageTypes | null = null;
	private virtualScrollY = -1;
	private idDisplayed:{[key:string]:boolean} = {};
	private openConvTimeout!:number;
	private closeConvTimeout!:number;
	private prevTouchMove!:TouchEvent;
	private deleteMessageHandler!:(e:IRCEvent)=>void;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;

	public get classes():string[] {
		let res = ["messagelist"];
		res.push("alternateBG");
		if(this.lightMode) res.push("lightMode");
		if(this.lockScroll) res.push("lockScroll");
		return res;
	}

	public get holderStyles():StyleValue {
		if(this.holderOffsetY == 0) return {};
		return {
			transform:"translateY(calc("+this.holderOffsetY+"px - .25em))",
		};
	}

	public get conversationStyles():StyleValue {
		return { top: this.conversationPos+"px" }
	}

	public async mounted():Promise<void> {
		this.localMessages = store.state.chatMessages.concat().slice(-this.max);
		for (let i = 0; i < this.localMessages.length; i++) {
			this.idDisplayed[this.localMessages[i].tags.id as string] = true;
		}
		
		watch(() => store.state.chatMessages, async (value) => {
			const el = this.$refs.messageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			
			//If scrolling is locked or there are still messages pending
			//add the new messages to the pending list
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
		});

		watch(()=>store.state.params.appearance.defaultSize.value, async ()=> {
			await this.$nextTick();
			const el = this.$refs.messageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			el.scrollTop = this.virtualScrollY = maxScroll;
		})

		this.deleteMessageHandler = (e:IRCEvent)=> this.onDeleteMessage(e);
		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);

		PubSub.instance.addEventListener(PubSubEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.publicApiEventHandler);

		await this.$nextTick();
		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;

		PubSub.instance.removeEventListener(PubSubEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		IRCClient.instance.removeEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.publicApiEventHandler);
	}

	public async onHoverList():Promise<void> {
		if(this.lightMode || !store.state.params.features.lockAutoScroll.value) return;
		const scrollDown = !this.lockScroll;
		this.lockScroll = true;

		await this.$nextTick();

		gsap.from(this.$refs.locked as HTMLDivElement, {duration:.2, height:0, scaleY:0, ease:"ease.out"});

		if(scrollDown) {
			const el = this.$refs.messageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			el.scrollTop = this.virtualScrollY = maxScroll
		}
	}

	public onLeaveList():void {
		// if(this.catchingUpPendingMessages) return;
		const el = this.$refs.messageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);

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
	public onDeleteMessage(e:IRCEvent|PubSubEvent):void {
		let messageID = "";
		if(typeof e.data == "string") {
			messageID = e.data;
		}else{
			const data = e.data as IRCEventDataList.MessageDeleted;
			messageID = data.tags['target-msg-id'] as string;
		}
		const keepDeletedMessages = store.state.params.filters.keepDeletedMessages.value;

		if(this.pendingMessages.length > 0) {
			let index = this.pendingMessages.findIndex(v => v.tags.id === messageID);
			if(index > -1) {
				const m = this.pendingMessages[index];
				if(m.type == "message") {
					if(keepDeletedMessages === true && !m.automod) {
						m.deleted = true;
					}else{
						this.pendingMessages.splice(index, 1);
					}
				}
			}
		}

		//Remove deleted message from currently displayed messages
		let index = this.localMessages.findIndex(v => { return v.tags.id === messageID });
		if(index > -1) {
			const m = this.localMessages[index];
			if(m.type == "message") {
				if(keepDeletedMessages === true && !m.automod) {
					m.deleted = true;
				}else{
					this.localMessages.splice(index, 1);
				}
			}
		}
	}

	/**
	 * Called when requesting an action from the public API
	 */
	private onPublicApiEvent(e:TwitchatEvent):void {
		const data = e.data as {count?:number, scrollBy?:number};
		let readCount = (data?.count && !isNaN(data.count as number))? data.count : 0;
		let scrollBy = (data?.scrollBy && !isNaN(data.scrollBy as number))? data.scrollBy : 100;
		switch(e.type) {
			case TwitchatEvent.CHAT_FEED_READ: {
				if(readCount === 0) readCount = 1;
				const offset = this.localMessages.findIndex(v => {
					if(v.type == "ad") return;
					return v.markedAsRead === true
				})
				if(offset > -1) readCount += offset;
			}
			/* falls through */
			case TwitchatEvent.CHAT_FEED_READ_ALL: {
				if(readCount === 0 || readCount > this.localMessages.length-1) {
					readCount = this.localMessages.length-1;
				}
				if(readCount < 0) readCount = 0;
				const m = this.localMessages[readCount];
				if(m.type != "ad") {
					this.toggleMarkRead(m);
				}
				break;
			}
			case TwitchatEvent.CHAT_FEED_PAUSE:{
				this.lockScroll = true;
				break;
			}
			case TwitchatEvent.CHAT_FEED_UNPAUSE:{
				this.unPause();
				break;
			}
			case TwitchatEvent.CHAT_FEED_SCROLL_UP:{
				this.lockScroll = true;
				const el = this.$refs.messageHolder as HTMLDivElement;
				gsap.to(el, {scrollTop:el.scrollTop - scrollBy, duration: .15, ease: "power1.inOut"});
				break;
			}
			case TwitchatEvent.CHAT_FEED_SCROLL_DOWN:{
				const el = this.$refs.messageHolder as HTMLDivElement;
				const vScroll = el.scrollTop + scrollBy;
				const unPause = vScroll >= el.scrollHeight - el.offsetHeight;
				gsap.to(el, {scrollTop:vScroll, duration: .15, ease: "power1.inOut", onComplete:()=>{
					if(unPause) this.unPause();
				}});
				break;
			}
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
		
		//Scroll toi bottom
		const el = this.$refs.messageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);
		this.virtualScrollY = maxScroll;

		gsap.to(this.$refs.locked as HTMLDivElement, {duration:.2, height:0, scaleY:0, ease:"ease.in", onComplete:()=> {
			this.lockScroll = false;
		}});
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
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			
			if(maxScroll < 0) {
				this.showNextPendingMessage(true);
				return;
			}

			const messRefs = this.$refs.message as HTMLDivElement[];
			if(!messRefs) {
				//If hovering the chat before any message shows up, just load next message
				this.showNextPendingMessage(true);
				return;
			}
			const lastMessRef = messRefs[messRefs.length-1];

			if((maxScroll - el.scrollTop) <= lastMessRef.offsetHeight) {
				if(this.pendingMessages.length > 0) {
					event.preventDefault();
					event.stopPropagation();
					this.showNextPendingMessage(true);
				}
			}
		}
	}

	public onTouchMove(event:TouchEvent):void {
		const el = this.$refs.messageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);
		if(this.prevTouchMove) {
			const direction = event.touches[0].clientY - this.prevTouchMove.touches[0].clientY;
			//Pause if dragging up
			if(direction > 0) this.lockScroll = true;
			else this.lockScroll = Math.abs(el.scrollTop - maxScroll) != 0;
		}
		this.prevTouchMove = event;
	}

	/**
	 * Called 60 times/sec to scroll the list and load new messages
	 * if there are pending ones.
	 */
	public async renderFrame():Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame(()=>this.renderFrame());

		const el = this.$refs.messageHolder as HTMLDivElement;
		const h = el.offsetHeight;
		const maxScroll = (el.scrollHeight - h);

		const messRefs = this.$refs.message as HTMLDivElement[];
		if(!messRefs) return;//view not ready yet
		
		// const lastMessRef = messRefs[ messRefs.length - 1 ];
		// const bottom = lastMessRef.offsetTop + lastMessRef.offsetHeight;
		const lastMess = el.children[el.children.length-1] as HTMLDivElement;
		if(!lastMess) return;//No message yet, just stop here

		const bottom = lastMess.offsetTop + lastMess.offsetHeight;

		let ease = .1;
		if(!this.lockScroll) {
			//On init the virtualscroll is -1, scroll to the bottom and init the virtualscroll
			if(this.virtualScrollY == -1) this.virtualScrollY = maxScroll;

			const dist = Math.abs(maxScroll-this.virtualScrollY);
			if(dist > 10 || this.pendingMessages.length > 0) {
				//Linear scroll if need to scroll by more than 10px
				this.virtualScrollY += Math.max(5, this.pendingMessages.length*4);
			}else{
				//easeout scroll when reaching bottom
				this.virtualScrollY += (maxScroll-this.virtualScrollY) * ease;
			}
			//Avoid virtual scroll to go beyond bottom
			if(this.virtualScrollY >= maxScroll-2) {
				this.virtualScrollY = maxScroll;
			}
			el.scrollTop = this.virtualScrollY;
		}
		
		if(bottom < h) {
			//If messages height is smaller than the holder height, move the holder to the bottom
			if(this.holderOffsetY == 0) ease = 1;
			this.holderOffsetY += (h - bottom - this.holderOffsetY) * ease;
			if(Math.abs(h - bottom - this.holderOffsetY) < 2) {
				this.holderOffsetY = h - bottom;
			}
		}else{
			this.holderOffsetY = 0;
		}

		//Show next pending message if at the bottom and scroll isn't locked
		if(this.virtualScrollY >= maxScroll
		&& !this.lockScroll
		&& this.pendingMessages.length > 0) {
			this.showNextPendingMessage();
		}

		this.scrollAtBottom = Math.abs(el.scrollTop - maxScroll) < 5;
		
	}

	/**
	 * Get the next pending message and display it to the list
	 */
	private showNextPendingMessage(wheelOrigin = false):void {
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
	private async scrollToPrevMessage(wheelOrigin = false):Promise<void> {
		await this.$nextTick();
		const el = this.$refs.messageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);

		const messRefs = this.$refs.message as HTMLDivElement[];
		const lastMessRef = messRefs[ messRefs.length - 1 ];
		
		if(lastMessRef) {
			if(wheelOrigin) {
				//If scrolling down with mouse wheel while scrolling is locked, interpolate
				//scroll via tween as the renderFrame does nothing while scroll is locked
				gsap.killTweensOf(el);
				gsap.to(el, {duration:.2, scrollTop:maxScroll, ease:"sine.inOut", onUpdate:()=>{
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
	public async setAriaMessage(message:string):Promise<void> {
		message = message.replace(/data-.*?=".*?"/gim, "");//Strip data-attributes that can contain HTML
		message = message.replace(/<[^>]*>/gim, "");//Strip HTML tags
		this.ariaMessage = message;
		clearTimeout(this.ariaMessageTimeout);
		this.ariaMessageTimeout = window.setTimeout(()=> {
			this.ariaMessage = "";
		}, 10000);
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
		this.openConvTimeout = window.setTimeout(async ()=> {
			this.conversationMode = false;
	
			let messageList:IRCEventDataList.Message[] = [];
			for (let i = 0; i < store.state.chatMessages.length; i++) {
				const mess = store.state.chatMessages[i] as (IRCEventDataList.Message|IRCEventDataList.Highlight);
				if(mess.type == "message" && mess.tags['user-id'] == m.tags['user-id']) {
					messageList.push(mess);
					if(messageList.length > 100) break;//Limit to 100 for perf reasons
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
		const mainHolder = this.$refs.messageHolder as HTMLDivElement;
		const holder = this.$refs.conversationHolder as HTMLDivElement;
		this.conversationPos = Math.max(0, event.clientY - holder.offsetHeight);
		
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
		this.closeConvTimeout = window.setTimeout(()=>{
			this.conversation = [];
			const mainHolder = this.$refs.messageHolder as HTMLDivElement;
			gsap.to(mainHolder, {opacity:1, duration:.25});
		}, 0);
	}


	/**
	 * Called on a message is clicked
	 */
	public toggleMarkRead(m:MessageTypes, event?:MouseEvent):void {
		if(event) {
			const target = event.target as HTMLElement;
			if(target.tagName.toLowerCase() == "a") return;//Do not mark as read if clicked on a link
		}
		if(store.state.params.features.markAsRead.value !== true) return;
		m.markedAsRead = !m.markedAsRead;
		if(this.prevMarkedReadItem && this.prevMarkedReadItem != m) {
			this.prevMarkedReadItem.markedAsRead = false;
		}
		if(m.markedAsRead) {
			this.prevMarkedReadItem = m;
		}

		const messageStr = m.type == "whisper"? m.params[1] : m.message;
		const message = {
			channel:m.channel as string,
			message:messageStr as string,
			tags:m.tags,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_READ, {manual:event!=null, selected:m.markedAsRead === true, message});
	}

	/**
	 * This is a warkaround a tricky issue.
	 * When a messages is deleted by the storage, it's automatically
	 * delete from this list, EXCEPT if the mouse is over the chat.
	 * For IRC messages there's something actually deletes the messages
	 * (see onDeleteMessage method) but this won't work for TwitchatAds
	 * as they're running outside IRC context.
	 * This "forceDelete" method handles that deletion
	 */
	public forceDelete(m:IRCEventDataList.TwitchatAd):void {
		for (let i = 0; i < this.localMessages.length; i++) {
			const el = this.localMessages[i];
			if(el.tags.id == m.tags.id) {
				this.localMessages.splice(i, 1);
				i--;
			}
		}
	}
}
type MessageTypes = IRCEventDataList.Highlight
				|  IRCEventDataList.PollResult
				|  IRCEventDataList.PredictionResult
				|  IRCEventDataList.BingoResult
				|  IRCEventDataList.RaffleResult
				|  IRCEventDataList.Message
				|  IRCEventDataList.Commercial
				|  IRCEventDataList.TwitchatAd
				|  IRCEventDataList.Whisper
				|  IRCEventDataList.CountdownResult
;
</script>

<style scoped lang="less">
.messagelist{
	display: flex;
	position: relative;
	flex-direction: column;
	max-height: 100%;
	padding-bottom: 0;

	&.lightMode {
		padding: 0;
		.holder {
			padding: 0;
			overflow: hidden;
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

	.ariaMessage {
		position: absolute;
		top: 0;
		transform: translate(0, -10000px);
		z-index: 100;
	}

	.message {
		overflow: hidden;
		font-family: "Inter";
		color: #fff;
		margin: .5em 0;
		font-size: var(--messageSize);
	}

	// &.alternateBG:not(.lightMode) {
		// .holder {
			//TODO fix switching even/odd problem when deleting/adding messages and enable this back
			// .subHolder:nth-child(odd) {
				// background-color: rgba(255, 255, 255, .05);

				// .message {
				// 	display: flex;
				// 	flex-direction: row-reverse;
				// }
			// }
		// }
	// }

	.holder {
		overflow-y: auto;
		overflow-x: hidden;
		flex-grow: 1;
		.subHolder {
			position: relative;
			// display: flex;
			// flex-direction: row;
			// &:last-child {
			// 	padding-bottom: 5px;
			// }
			&:hover {
				background-color: rgba(255, 255, 255, .2);

				.hoverActionsHolder {
					visibility: visible;
				}
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

			.hoverActionsHolder {
				position: absolute;
				visibility: hidden;
				z-index: 1;
				top: 0;
				right: 0;
				margin: .5em 0;
				transform:translate(0, calc(-100% - .5em));
				display: flex;
				flex-direction: row;
				align-items: flex-end;
				justify-content: space-around;
				flex-wrap: wrap;
				font-size: var(--messageSize);
			}
		}
	}

	.locked {
		z-index: 1;
		width: 100%;
		padding: 0;
		padding-bottom: 5px;
		margin: 0;
		text-align: center;
		border-radius: 5px;
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		background: @mainColor_normal;
		color: #fff;
		white-space: nowrap;
		font-size: .7em;
		padding: .7em;
		transition: background-color .25s;
		transform-origin: bottom center;
		cursor: pointer;
		&:hover {
			background: @mainColor_normal_light;
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
		-webkit-mask-image: url(../../assets/chatPlaceholder.png);
		-webkit-mask-repeat: no-repeat;
		-webkit-mask-size: cover;
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
		top: 0;
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