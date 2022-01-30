<template>
	<div :class="classes">
		<div class="holder" ref="messageHolder" @mousewheel="onMouseWheel($event)">
			<div v-for="m in localMessages" :key="m.tags.id" ref="message" class="subHolder"
			@mouseenter="enterMessage(m)"
			@mouseleave="leaveMessage(m)">
				<ChatMessage
					v-if="m.type == 'message'"
					class="message"
					:messageData="m"
					@showConversation="openConversation"
					@mouseleave="onMouseLeave(m)"
					:ref="'message_'+m.tags.id"
					/>
				<ChatNotice
					v-if="m.type == 'notice'"
					class="message"
					:messageData="m"
					:ref="'message_'+m.tags.id"
					/>
				<ChatHighlight
					v-if="m.type == 'highlight'"
					class="message"
					:messageData="m"
					lightMode
					:ref="'message_'+m.tags.id"
					/>

				<img class="markRead" src="@/assets/icons/markRead.svg"
					v-if="!lightMode && m.markedAsRead"
					data-tooltip="Read flag">

				<transition name="slide">
					<ChatMessageHoverActions class="hoverActions"
						v-if="m.showHoverActions"
						:messageData="m"
						@toggleMarkRead="toggleMarkRead(m)" />
				</transition>
			</div>
		</div>
		

		<div class="locked" v-if="(lockScroll || pendingMessages.length > 0) && !lightMode">
			<!-- data-tooltip="auto scroll locked"> -->
			<div class="label">
				<p v-if="lockScroll">Chat paused</p>
				<Button :icon="require('@/assets/icons/down.svg')" @click="unPause()" />
				<p v-if="pendingMessages.length > 0">(+{{pendingMessages.length}})</p>
			</div>
			<div class="bar"></div>
		</div>

		<div class="conversation"
		ref="conversationHolder"
		v-if="conversation.length > 0" :style="conversationStyles"
		@mouseenter="openConversation()"
		@mouseleave="onMouseLeave()">
			<div class="head">
				<h1>Conversation</h1>
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

@Options({
	components:{
		Button,
		ChatNotice,
		ChatMessage,
		ChatHighlight,
		ChatMessageHoverActions,
	},
	props: {
		max:Number,
		lightMode:Boolean,//Used by OBS chat
	}
})
export default class MessageList extends Vue {

	public max!: number;
	public localMessages:IRCEventDataList.Message[] = [];
	public pendingMessages:IRCEventDataList.Message[] = [];
	public conversation:IRCEventDataList.Message[] = [];
	public lightMode:boolean = false;
	public lockScroll:boolean = false;
	public conversationPos:number = 0;

	private disposed:boolean = false;
	private frameIndex:number = 0;
	private markedReadItems:IRCEventDataList.Message[] = [];
	private virtualScrollY:number = -1;
	private idDisplayed:{[key:string]:boolean} = {};
	private lastHoverdMessage!:{event:MouseEvent, message:IRCEventDataList.Message};
	private closeConvTimeout!:number;
	private deleteMessageHandler!:(e:IRCEvent)=>void;

	public get classes():string[] {
		let res = ["messagelist"];
		if(this.lightMode) res.push("lightMode");
		if(this.lockScroll || this.pendingMessages.length > 0) res.push("scrollLocked");

		res.push("size_"+store.state.params.appearance.defaultSize.value);

		return res;
	}

	public get conversationStyles():unknown {
		return { top: this.conversationPos+"px" }
	}

	public async scrollToLatestRead():Promise<void> {
		let foundItem = false;
		for (let index = this.localMessages.length-1; index >= 0; index--) {
			const m = this.localMessages[index];
			if(m.markedAsRead) {
				const messRef = (this.$refs.message as HTMLDivElement[])[index];
				
				const el = this.$refs.messageHolder as HTMLDivElement;
				const h = (this.$el as HTMLDivElement).clientHeight;
				const scrollY = messRef.offsetTop - h/2;
				if(scrollY < this.virtualScrollY) {
					//If element is higher than half of screen, scroll to it
					this.virtualScrollY = scrollY;
					this.lockScroll = true;
					await (async ()=> {
						return new Promise((resolve,)=> {
							gsap.to(el, {scrollTo:this.virtualScrollY, duration: .5, ease:"sine.inOut", onComplete:()=>{
								resolve(null);
							}});
						})
					})();
				}
				//Flash element after potential scroll
				gsap.set(messRef, {backgroundColor:"rgba(255,255,255,0)"});
				gsap.to(messRef, {backgroundColor:"rgba(255,255,255,.5)", duration: .1, yoyo:true, repeat:5, ease:"sine.inOut"});
				foundItem = true;
				break;
			}
		}
		//Fail safe in case something goes wrong this will prevent from
		//being unable to hide the "mark as read" button from the notifications
		if(!foundItem) {
			this.markedReadItems = [];
			store.state.isMessageMarkedAsRead = false;
		}
	}

	public async mounted():Promise<void> {
		this.localMessages = store.state.chatMessages.concat();
		watch(() => store.state.chatMessages, async (value:IRCEventDataList.Message[]) => {
			//If scrolling is locked or there are still messages pending
			//add the new messages to the pending list
			if(this.lockScroll || this.pendingMessages.length > 0) {
				for (let i = 0; i < store.state.chatMessages.length; i++) {
					const m = store.state.chatMessages[i] as IRCEventDataList.Message;
					if(this.idDisplayed[value[i].tags.id as string] !== true) {
						this.idDisplayed[m.tags.id as string] = true;
						this.pendingMessages.push(m);
					}
				}
				return;
			}
			
			this.localMessages = value.concat();
			for (let i = 0; i < value.length; i++) {
				this.idDisplayed[value[i].tags.id as string] = true;
			}

			this.scrollToPrevMessage();
		}, {
			// deep:true
		});
		
		const list = this.$refs.messageHolder as HTMLDivElement;
		list.addEventListener("scroll", ()=>{
			if(this.disposed) return;
			const el = this.$refs.messageHolder as HTMLDivElement;
			const h = (this.$el as HTMLDivElement).clientHeight;
			const maxScroll = (el.scrollHeight - h);
			const scrollAtBottom = (maxScroll - el.scrollTop) < 2;
			if(scrollAtBottom) {
				this.lockScroll = false;
			}
		});

		this.deleteMessageHandler = (e:IRCEvent)=> this.onDeleteMessage(e);

		IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, this.deleteMessageHandler)

		await this.$nextTick();
		this.renderFrame();
	}

	public beforeUnmount():void {
		this.disposed = true;
	}

	/**
	 * Called when a message is deleted
	 * Messages are automatically deleted from the ref collection
	 * but if we scroll up to lock the messages, it switches to a
	 * local history that's not linked anymore to the main collection.
	 * If the message is added to that history, it won't be deleted
	 * automatically, hence, we need this to do it.
	 */
	public onDeleteMessage(e:IRCEvent):void {
		if(this.pendingMessages.length > 0) {
			const data = e.data as IRCEventDataList.MessageDeleted;
			let index = this.pendingMessages.findIndex(v => v.tags.id === data.tags['target-msg-id']);
			if(index > -1) {
				this.pendingMessages.splice(index, 1);
			}
		}
	}

	/**
	 * Catch up all pending messages
	 */
	public async unPause():Promise<void> {
		let messages = this.pendingMessages.slice(-this.max);
		this.localMessages = this.localMessages.concat(messages);
		this.pendingMessages = [];
		this.localMessages = this.localMessages.slice(-this.max);

		this.lockScroll = false;
		
		const el = this.$refs.messageHolder as HTMLDivElement;
		const h = (this.$el as HTMLDivElement).clientHeight;
		const maxScroll = (el.scrollHeight - h);
		this.virtualScrollY = maxScroll
	}

	/**
	 * If hovering and scrolling down whit wheel, load next message
	 */
	public async onMouseWheel(event:WheelEvent):Promise<void> {
		//If scrolling down while at the bottom of the list, load next message
		if(event.deltaY < 0) {
			this.lockScroll = true;
		}else{
			const el = this.$refs.messageHolder as HTMLDivElement;
			const h = (this.$el as HTMLDivElement).clientHeight;
			const maxScroll = (el.scrollHeight - h);
			if((maxScroll - el.scrollTop) < 50) {
				this.showNextPendingMessage();
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
		const h = (this.$el as HTMLDivElement).clientHeight;
		const maxScroll = (el.scrollHeight - h);
		if(!this.lockScroll) {
			if(this.virtualScrollY == -1) this.virtualScrollY = maxScroll;

			const dist = Math.abs(maxScroll-this.virtualScrollY);
			if(dist > 100) {
				this.virtualScrollY += 20;
			}else{
				// const ease = Math.max(.1, Math.min(100, dist)/200);
				const ease = .1;
				this.virtualScrollY += (maxScroll-this.virtualScrollY) * ease;
			}
			// if(this.virtualScrollY > maxScroll) this.virtualScrollY = maxScroll;
			el.scrollTop = this.virtualScrollY;
		}

		if(!this.lockScroll && this.pendingMessages.length > 0 && ++this.frameIndex%15 == 0) {
			this.showNextPendingMessage();
		}
		
	}

	/**
	 * Get the next pending message and display it to the list
	 */
	private showNextPendingMessage():void {
		if(this.pendingMessages.length == 0) return;
		const m = this.pendingMessages.shift() as IRCEventDataList.Message;
		this.idDisplayed[m.tags.id as string] = true;
		this.localMessages.push( m );
		if(this.localMessages.length > this.max) {
			this.localMessages = this.localMessages.slice(-this.max);
		}
		this.scrollToPrevMessage();
	}

	/**
	 * Call this after adding a new message.
	 * Will scroll so the previous message is on the bottom of the list
	 * so the new message displays smoothly from the bottom of the screen
	 */
	private async scrollToPrevMessage():Promise<void> {
		await this.$nextTick();
		const el = this.$refs.messageHolder as HTMLDivElement;
		const h = (this.$el as HTMLDivElement).clientHeight;
		const messRefs = this.$refs.message as HTMLDivElement[];
		const lastMessRef = messRefs[messRefs.length-2];
		
		if(lastMessRef) {
			this.virtualScrollY = lastMessRef.offsetTop + lastMessRef.clientHeight - h;
			el.scrollTop = this.virtualScrollY;
		}

		this.refreshMarkedAsReadHistory();
	}

	/**
	 * Check if the messages marked as read are still there
	 * Clean them if they're not
	 */
	private refreshMarkedAsReadHistory():void {
		// console.log("REFRESH");
		for (let i = 0; i < this.markedReadItems.length; i++) {
			const m = this.markedReadItems[i];
			if((this.$refs["message_"+m.tags.id] as Vue[]).length == 0) {
				this.markedReadItems.splice(i, 1);
				i--;
			}
		}
		store.state.isMessageMarkedAsRead = this.markedReadItems.length > 0;
	}

	/**
	 * Called when asking to read a conversation
	 * Display the full conversation if any
	 */
	public async openConversation(event:MouseEvent, m:IRCEventDataList.Message):Promise<void> {
		if(!event) {
			event = this.lastHoverdMessage.event;
			m = this.lastHoverdMessage.message;
		}
		if(!m || (!m.answerTo && !m.answers)) return;

		this.lastHoverdMessage = { event, message:m };
		
		if(m.answers) {
			this.conversation = m.answers.concat();
			this.conversation.unshift( m );
		}else if(m.answerTo) {
			this.conversation = (m.answerTo.answers as IRCEventDataList.Message[]).concat();
			this.conversation.unshift( m.answerTo );
		}
		await this.$nextTick();
		
		let el = event.target as HTMLDivElement;
		var top = 0;
		do {
			top += el.offsetTop  || 0;
			el = el.offsetParent as HTMLDivElement;
		} while(el);

		const mainHolder = this.$refs.messageHolder as HTMLDivElement;
		const holder = this.$refs.conversationHolder as HTMLDivElement;
		this.conversationPos = Math.max(0, top - holder.clientHeight - mainHolder.scrollTop);
		
		const messholder = this.$refs.conversationMessages as HTMLDivElement;
		messholder.scrollTop = messholder.scrollHeight;
		gsap.to(mainHolder, {opacity:.25, duration:.25});

		clearTimeout(this.closeConvTimeout);
	}

	/**
	 * Called when rolling out of a message
	 * Close the conversation if any displayed
	 */
	public onMouseLeave():void {
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
		m.showHoverActions = true;
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
		m.markedAsRead = !m.markedAsRead;
		if(m.markedAsRead) {
			this.markedReadItems.push( m );
			store.state.isMessageMarkedAsRead = true;
		}else {
			this.markedReadItems = this.markedReadItems.filter(m2=>m2.tags.id != m.tags.id);
			store.state.isMessageMarkedAsRead = this.markedReadItems.length > 0;
		}
		m.showHoverActions = false;
	}

}
</script>

<style scoped lang="less">
.messagelist{
	padding: 10px;
	position: relative;

	&.size_1 {
		font-size: 10px;
		.message{ padding: 2px; }
	}
	&.size_2 {
		font-size: 14px;
		.message{ padding: 2px; }
	}
	&.size_3 {
		font-size: 18px;
		.message{ padding: 5px; }
	}
	&.size_4 {
		font-size: 24px;
		.message{ padding: 5px; }
	}
	&.size_5 {
		font-size: 30px;
		.message{ padding: 10px; }
	}

	&.lightMode {
		.holder {
			overflow: hidden;
			.message:nth-child(even) {
				background-color: transparent;
			}
		}
	}

	:deep(.time) {
		color: fade(#ffffff, 75%);
		font-size: 13px;
		margin-right: 5px;
		vertical-align: middle;
		width: 36px;
		display: inline-block;
	}

	.message {
		overflow: hidden;
		font-family: "Inter";
		color: #fff;
		padding: 5px;
	}

	.holder {
		max-height: 100%;
		width: calc(100% - 10px);
		overflow-y: auto;
		overflow-x: hidden;
		position: absolute;
		bottom: 0;
		padding: 10px 0;
		padding-bottom: 0;

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
				align-self: center;
				max-width: 30px;
				opacity: .75;
				margin-left: 5px;
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
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 100%;
		padding: 0;
		margin: 0;
		text-align: center;
		border-radius: 5px;
		.label {
			color: #fff;
			width: min-content;
			white-space: nowrap;
			margin: auto;
			padding: 5px;
			font-size: 14px;
			border-top-left-radius: 10px;
			border-top-right-radius: 10px;
			background-color: @mainColor_normal;//#888888;
			.button {
				width: 100%;
				background: none;
				padding: 0;
				&:hover {
					background: rgba(255, 255, 255, .5);
				}
			}
		}
		.bar {
			height: 10px;
			margin-top: -10px;
			border-top-left-radius: 10px;
			border-top-right-radius: 10px;
			background: linear-gradient(0deg, @mainColor_normal 10%, fade(@mainColor_normal, 0) 100%);
		}
	}

	.noMessage {
		position:absolute;
		width: calc(100% - 20px);
		bottom: 0;
		color: rgba(255, 255, 255, .3);
		font-family: "Inter";
		font-style: italic;
		mask-image: url(../../assets/chatPlaceholder.png);
		mask-repeat: no-repeat;
		mask-size: cover;
		.gradient {
			width: 100%;
			height: 400px;
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