<template>
	<div :class="classes"
	@mouseenter="onHoverList"
	@mouseleave="onLeaveList"
	@wheel="onMouseWheel"
	@touchmove="onTouchMove">

		<div class="messageHolder" ref="chatMessageHolder" :style="holderStyles">
			<template v-for="m in filteredMessages" :key="m.id">
				<ChatAd class="message"
					v-if="m.type == 'twitchat_ad' && !lightMode"
					:ref="'message_'+m.id"
					@showModal="(v:string)=>$emit('showModal', v)"
					:messageData="m"/>

				<ChatJoinLeave class="message"
					v-else-if="(m.type == 'join' || m.type == 'leave') && !lightMode"
					:ref="'message_'+m.id"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatConnect class="message"
					v-else-if="(m.type == 'connect' || m.type == 'disconnect') && !lightMode"
					:ref="'message_'+m.id"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatMessage
					v-else-if="m.type == 'message' || m.type == 'whisper'"
					:ref="'message_'+m.id"
					class="message"
					:lightMode="lightMode"
					@showConversation="openConversation"
					@showUserMessages="openUserHistory"
					@onMouseOut="onLeaveMessage"
					@onRead="toggleMarkRead"
					:messageData="m"/>
					
				<ChatNotice
					v-else-if="m.type == 'notice'"
					:ref="'message_'+m.id"
					class="message"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatPollResult
					v-else-if="m.type == 'poll'"
					:ref="'message_'+m.id"
					class="message"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatPredictionResult
					v-else-if="m.type == 'prediction'"
					:ref="'message_'+m.id"
					class="message"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatBingoResult
					v-else-if="m.type == 'bingo'"
					:ref="'message_'+m.id"
					class="message"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatRaffleResult
					v-else-if="m.type == 'raffle'"
					:ref="'message_'+m.id"
					class="message"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatCountdownResult
					v-else-if="m.type == 'countdown'"
					:ref="'message_'+m.id"
					class="message"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatHypeTrainResult
					v-else-if="m.type == 'hype_train_summary'"
					:ref="'message_'+m.id"
					class="message"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatFollowbotEvents
					v-else-if="m.type == 'followbot_list'"
					:ref="'message_'+m.id"
					class="message"
					@onRead="toggleMarkRead"
					:messageData="m"/>

				<ChatHighlight
					v-else
					:ref="'message_'+m.id"
					class="message"
					lightMode
					@onRead="toggleMarkRead"
					:messageData="m"/>

			</template>

		</div>
		
		<teleport :to="markedReadItem" v-if="markedReadItem">
			<div class="markRead"></div>
		</teleport>

		<div class="locked" ref="locked" v-if="lockScroll && !lightMode" @click.stop="unPause">
			<span v-if="lockScroll">Chat paused</span>
			<span v-if="pendingMessages.length > 0">(+{{pendingMessages.length}})</span>
		</div>

		<div class="conversation" ref="conversationHolder"
			v-if="conversation.length > 0"
			:style="conversationStyles"
			@mouseenter="reopenLastConversation"
			@mouseleave="onLeaveMessage"
			@wheel.stop=""
		>
			<div class="head">
				<h1 v-if="conversationMode">Conversation</h1>
				<h1 v-if="!conversationMode">{{conversation[0].user.displayName}} history</h1>
				<Button class="button" aria-label="close conversation" :icon="$image('icons/cross_white.svg')" @click="onLeaveMessage" />
			</div>
			<div class="messages" ref="conversationMessages">
				<ChatMessage
					v-for="m in conversation"
					:key="m.id"
					class="message"
					:messageData="m"
					disableConversation
					/>
			</div>

			<Button class="TTSreadBt" aria-label="read this user's messages"
				:title="readLabel"
				:icon="$image('icons/tts.svg')"
				@click="toggleReadUser"
				v-if="!conversationMode && $store('tts').params.enabled === true"
				small bounce />
		</div>

		<div v-if="showLoadingGradient && !lightMode" class="noMessage">
			<div class="gradient"></div>
		</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import { watch } from '@vue/runtime-core';
import gsap from 'gsap';
import type { StyleValue } from 'vue';
import { Options, Vue } from 'vue-class-component';
import Button from '../Button.vue';
import ChatAd from './ChatAd.vue';
import ChatBingoResult from './ChatBingoResult.vue';
import ChatConnect from './ChatConnect.vue';
import ChatCountdownResult from './ChatCountdownResult.vue';
import ChatFollowbotEvents from './ChatFollowbotEvents.vue';
import ChatHighlight from './ChatHighlight.vue';
import ChatHypeTrainResult from './ChatHypeTrainResult.vue';
import ChatJoinLeave from './ChatJoinLeave.vue';
import ChatNotice from './ChatNotice.vue';
import ChatPollResult from './ChatPollResult.vue';
import ChatPredictionResult from './ChatPredictionResult.vue';
import ChatRaffleResult from './ChatRaffleResult.vue';

@Options({
	components:{
		Button,
		ChatAd,
		ChatNotice,
		ChatConnect,
		ChatMessage,
		ChatHighlight,
		ChatJoinLeave,
		ChatPollResult,
		ChatBingoResult,
		ChatRaffleResult,
		ChatFollowbotEvents,
		ChatHypeTrainResult,
		ChatCountdownResult,
		ChatPredictionResult,
	},
	props: {
		maxMessages:Number,
		lightMode:{
			type:Boolean,
			default:false,
		},//Used by OBS chat
	},
	emits:["showModal"]
})
export default class MessageList extends Vue {

	public maxMessages!: number;
	public lightMode!:boolean;
	public hoveredMessage:TwitchatDataTypes.ChatMessageTypes | null = null;
	public filteredMessages:TwitchatDataTypes.ChatMessageTypes[] = [];
	public pendingMessages:TwitchatDataTypes.ChatMessageTypes[] = [];
	public conversation:TwitchatDataTypes.MessageChatData[] = [];
	public lockScroll = false;
	public showLoadingGradient = false;
	public conversationPos = 0;
	public conversationMode = true;//Used to change title between "History"/"Conversation"
	public markedReadItem:HTMLDivElement|null = null;
	public hoverchatMessageHolder:HTMLElement = document.body;

	private prevTs = 0;
	private counter = 0;
	private disposed = false;
	private prevMarkedReadMessage:TwitchatDataTypes.ChatMessageTypes | null = null;
	private holderOffsetY = -1;
	private virtualScrollY = -1;
	private updateDebounce = -1;
	private openConvTimeout!:number;
	private closeConvTimeout!:number;
	private prevTouchMove!:TouchEvent;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;
	private deleteMessageHandler!:(e:GlobalEvent)=> void;
	private addMessageHandler!:(e:GlobalEvent)=> void;

	public get classes():string[] {
		let res = ["messagelist"];
		if(this.counter%2===0) res.push("alternateOdd");
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

	public get readLabel():string {
		if(!this.conversation[0].user.displayName) return "";
		const username = this.conversation[0].user.displayName.toLowerCase();
		const permissions:TwitchatDataTypes.PermissionsData = this.$store("tts").params.ttsPerms;
		let label = "";
		if(permissions.users.toLowerCase().split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi).indexOf(username) == -1) {
			label = "Read "+username+"'s future messages";
		}else{
			label = "Stop reading "+username+"'s messages";
		}
		return label;
	}

	public beforeUpdate():void {
		// console.log("Update list");
	}

	public async beforeMount():Promise<void> {

		//If text size is changed, scroll to bottom of tchat
		watch(()=>this.$store("params").appearance.defaultSize.value, async ()=> {
			await this.$nextTick();
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			el.scrollTop = this.virtualScrollY = maxScroll;
		});

		//Listen for specific params change.
		//If one is updated, the chat is completely rebuilt.
		watch(()=>this.$store("params").filters, ()=> this.fulllListRefresh(), {deep:true});
		watch(()=>this.$store("params").features.notifyJoinLeave.value, ()=> this.fulllListRefresh());
		

		this.publicApiEventHandler = (e:TwitchatEvent) => this.onPublicApiEvent(e);
		this.deleteMessageHandler = (e:GlobalEvent) => this.onDeleteMessage(e);
		this.addMessageHandler = (e:GlobalEvent) => this.onAddMessage(e);

		EventBus.instance.addEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
		EventBus.instance.addEventListener(GlobalEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.publicApiEventHandler);

		this.fulllListRefresh();

		this.prevTs = Date.now() - 1000/60;
		this.renderFrame(Date.now());
	}

	public beforeUnmount():void {
		this.disposed = true;

		EventBus.instance.removeEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
		EventBus.instance.removeEventListener(GlobalEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.publicApiEventHandler);
	}

	/**
	 * Called when message list is hovered.
	 * Pause the chat if requested
	 */
	public async onHoverList():Promise<void> {
		if(this.lightMode || !this.$store("params").features.lockAutoScroll.value) return;
		const scrollDown = !this.lockScroll;
		this.lockScroll = true;

		await this.$nextTick();//Wait for lock div to be built

		gsap.from(this.$refs.locked as HTMLDivElement, {duration:.2, height:0, scaleY:0, ease:"ease.out"});

		if(scrollDown) {
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			el.scrollTop = this.virtualScrollY = maxScroll;
		}
	}

	/**
	 * Called when rolling out message list.
	 * Unpausse chat if no new message
	 */
	public onLeaveList():void {
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);

		if(this.pendingMessages.length == 0 && el.scrollTop >= maxScroll - 50) {
			this.lockScroll = false;
		}
	}

	/**
	 * Toggles whether the TTS should read this user's messages
	 */
	public toggleReadUser():void {
		const username = this.conversation[0].user.login?.toLowerCase();
		const permissions:TwitchatDataTypes.PermissionsData = this.$store("tts").params.ttsPerms;
		const read = permissions.users.toLowerCase().split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi).indexOf(username) == -1;
		this.$store("tts").ttsReadUser(this.conversation[0].user, read);
	}

	/**
	 * Cleans up all messages and rebuild the list
	 */
	private fulllListRefresh():void {
		clearTimeout(this.updateDebounce);
		this.updateDebounce = setTimeout(async ()=> {
			this.pendingMessages = [];
			
			// const s = Date.now();

			const sChat = StoreProxy.chat;
			const messages = sChat.messages.concat();
			let result:TwitchatDataTypes.ChatMessageTypes[] = [];
			for (let i = messages.length-1; i >= 0; i--) {
				const m = messages[i];
				if(this.shouldShowMessage(m)) {
					result.unshift(m);
				}
				if(result.length == this.maxMessages) break;
			}
	
			this.filteredMessages = result;

			// const e = Date.now();
			// console.log("full refresh duration:", e-s);
	
			await this.$nextTick();
	
			//Scroll to bottom
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			this.virtualScrollY = maxScroll;
			this.lockScroll = false;
		}, 50)
	}

	/**
	 * Returns if a message should be displayed or not
	 * @param m 
	 */
	private shouldShowMessage(m:TwitchatDataTypes.ChatMessageTypes):boolean {
		const sParams = StoreProxy.params;
		const sUsers = StoreProxy.users;
		const meUID = StoreProxy.auth.twitch.user.id;
		const blockedCmds = sParams.filters.blockedCommands.value as string;
		let blockedSpecificCmds = blockedCmds.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);//Split commands by non-alphanumeric characters
		blockedSpecificCmds = blockedSpecificCmds.map(v=>v.replace(/^!/gi, ""))//Remove "!" at the beginning
		
		switch(m.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE:{
				let canAdd = true;
				//If in light mode, ignore automoded and deleted messages or messages sent by blocked users
				if(this.lightMode && (m.automod || m.deleted || m.user.channelInfo[m.channel_id].is_blocked)) {
					canAdd = false;
				}else
				//Ignore deleted messages if requested
				if(canAdd && sParams.filters.keepDeletedMessages.value === false && m.deleted) {
					canAdd = false;
				}else
				//Ignore /me messages if requested
				if(canAdd && sParams.filters.showSlashMe.value === false && m.twitch_isSlashMe) {
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"slashMe"});
					canAdd = false;
				}else
				//Ignore self if requested
				if(canAdd && sParams.filters.showSelf.value === false && m.user.id == meUID) {
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"self"});
					canAdd = false;
				}else
				//Ignore bot messages if requested
				if(canAdd && sParams.filters.showBots.value === false
				&& sUsers.knownBots[m.platform][m.user.login.toLowerCase()] === true
				&& m.bypassBotFilter !== true) {
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"bot"});
					canAdd = false;
				}else
				//Ignore custom users
				if(canAdd && m.user.displayName.length > 0 && (sParams.filters.hideUsers.value as string).toLowerCase().indexOf(m.user.displayName.toLowerCase()) > -1) {
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"user"});
					canAdd = false;
				}else
						
				//Ignore commands
				if(canAdd && sParams.filters.ignoreCommands.value === true && /^ *!.*/gi.test(m.message)) {
					if(sParams.filters.ignoreListCommands.value === true && blockedSpecificCmds.length > 0) {
						//Ignore specific commands
						const cmd = m.message.split(" ")[0].substring(1).trim().toLowerCase();
						if(blockedSpecificCmds.includes(cmd)) {
							//TODO Broadcast to OBS-ws
							// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"command"});
							canAdd = false;
						}
					}else{
						//Ignore all commands
						//TODO Broadcast to OBS-ws
						// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"command"});
						canAdd = false;
					}
				}
				return canAdd;
			}

			case TwitchatDataTypes.TwitchatMessageType.WHISPER:{
				return sParams.features.showWhispersOnChat.value === true;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION:{
				return sParams.filters.showNotifications.value === true 
					&& sParams.filters.showSubs.value === true;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.REWARD:{
				return sParams.filters.showNotifications.value === true 
					&& sParams.filters.showRewards.value === true;
			}
			
			case TwitchatDataTypes.TwitchatMessageType.PREDICTION:
			case TwitchatDataTypes.TwitchatMessageType.POLL:{
				return sParams.filters.showNotifications.value === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER:{
				return sParams.filters.showNotifications.value === true 
					&& sParams.filters.showCheers.value === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING:{
				return sParams.filters.showNotifications.value === true 
					&& sParams.filters.showFollow.value === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAID:{
				return sParams.filters.showNotifications.value === true 
					&& sParams.filters.showRaids.value === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY:{
				return sParams.filters.showNotifications.value === true 
					&& sParams.filters.showHypeTrain.value === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.REWARD:{
				return sParams.filters.showNotifications.value === true 
					&& sParams.filters.showRewards.value === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE:
			case TwitchatDataTypes.TwitchatMessageType.BINGO:
			case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN:
			case TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN:
			case TwitchatDataTypes.TwitchatMessageType.FOLLOWBOT_LIST:
			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN:
			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION:{
				return sParams.filters.showNotifications.value === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.JOIN:
			case TwitchatDataTypes.TwitchatMessageType.LEAVE:{
				return sParams.features.notifyJoinLeave.value !== false
			}
			default: return true;
		}
	}

	/**
	 * Called when a message is add
	 */
	private onAddMessage(e:GlobalEvent):void {
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);
		const m = e.data as TwitchatDataTypes.ChatMessageTypes;

		//If scrolling is locked or there are still messages pending,
		//add the new messages to the pending list
		const chatPaused = this.lockScroll || this.pendingMessages.length > 0 || el.scrollTop < maxScroll;
		if(chatPaused) {
			this.pendingMessages.push(m);
		}else{
			let list = this.filteredMessages;
			list.push(m);
			list = list.slice(-this.maxMessages);
			this.filteredMessages = list;
			this.showLoadingGradient = false;
			this.scrollToPrevMessage();
		}
	}

	/**
	 * Called when a message is deleted
	 */
	private onDeleteMessage(e:GlobalEvent):void {
		const message = e.data as TwitchatDataTypes.MessageChatData;
		
		//remove from displayed messages
		for (let i = this.filteredMessages.length-1; i >= 0; i--) {
			const m = this.filteredMessages[i];
			if(m.id == message.id) {
				this.filteredMessages.splice(i, 1);
				break;
			}
		}
		
		//Remove from pending messages
		for (let i = this.pendingMessages.length-1; i >= 0; i--) {
			const m = this.pendingMessages[i];
			if(m.id == message.id) {
				this.pendingMessages.splice(i, 1);
				break;
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
				const offset = this.filteredMessages.findIndex(v => {
					return v.markedAsRead === true
				})
				if(offset > -1) readCount += offset;
			}
			/* falls through */
			case TwitchatEvent.CHAT_FEED_READ_ALL: {
				if(readCount === 0 || readCount > this.filteredMessages.length-1) {
					readCount = this.filteredMessages.length-1;
				}
				if(readCount < 0) readCount = 0;
				const m = this.filteredMessages[readCount];
				this.toggleMarkRead(m);
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
				const el = this.$refs.chatMessageHolder as HTMLDivElement;
				gsap.to(el, {scrollTop:el.scrollTop - scrollBy, duration: .5, ease: "power1.inOut"});
				break;
			}
			case TwitchatEvent.CHAT_FEED_SCROLL_DOWN:{
				const el = this.$refs.chatMessageHolder as HTMLDivElement;
				const vScroll = el.scrollTop + scrollBy;
				const unPause = vScroll >= el.scrollHeight - el.offsetHeight;
				gsap.to(el, {scrollTop:vScroll, duration: .5, ease: "power1.inOut", onComplete:()=>{
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
		this.fulllListRefresh();

		gsap.to(this.$refs.locked as HTMLDivElement, {duration:.2, height:0, scaleY:0, ease:"ease.in", onComplete:()=> {
			this.lockScroll = false;
		}});
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
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			
			if(maxScroll < 0) {
				this.showNextPendingMessage(true);
				return;
			}

			const messRefs = el.querySelectorAll(".message");
			if(messRefs.length == 0) {
				//If hovering the chat before any message shows up, just load next message
				this.showNextPendingMessage(true);
				return;
			}
			const lastMessRef = messRefs[messRefs.length-1];

			if((maxScroll - el.scrollTop) <= (lastMessRef as HTMLDivElement).offsetHeight) {
				if(this.pendingMessages.length > 0) {
					event.preventDefault();
					event.stopPropagation();
					this.showNextPendingMessage(true);
				}
			}
		}
	}

	/**
	 * Scrol chat on mobile
	 */
	public onTouchMove(event:TouchEvent):void {
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
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
	public async renderFrame(ts:number):Promise<void> {
		if(this.disposed) return;
		requestAnimationFrame((ts)=>this.renderFrame(ts));

		const timeScale = (60/1000) * Math.min(Math.min(1000/15, Math.max(.1, ts - this.prevTs)));
		this.prevTs = ts;

		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		if(!el || this.filteredMessages.length == 0) return;

		const h			= el.offsetHeight;
		const maxScroll	= (el.scrollHeight - h);
		const lastMess	= (this.$refs["message_"+this.filteredMessages[this.filteredMessages.length-1].id] as Vue[])[0];
		if(!lastMess) return;//No message yet, just stop here

		const bottom = lastMess.$el.offsetTop + lastMess.$el.offsetHeight;

		let ease = .2;
		if(!this.lockScroll) {
			//On init the virtualscroll is -1, scroll to the bottom and init the virtualscroll
			if(this.virtualScrollY == -1) this.virtualScrollY = maxScroll;

			const dist = Math.abs(maxScroll-this.virtualScrollY);
			if(dist > 50 || this.pendingMessages.length > 0) {
				//Linear scroll if need to scroll by more than 10px
				this.virtualScrollY += Math.max(10, this.pendingMessages.length*4) * timeScale;
			}else{
				//easeout scroll when reaching bottom
				this.virtualScrollY += (maxScroll-this.virtualScrollY) * ease * timeScale;
			}
			//Avoid virtual scroll to go beyond bottom
			if(this.virtualScrollY >= maxScroll-2) {
				this.virtualScrollY = maxScroll;
			}
			el.scrollTop = this.virtualScrollY;
		}
		
		//If messages height is smaller than the holder height, move the holder to the bottom
		if(bottom < h) {
			let py = this.holderOffsetY;
			//Init to bottom
			if(this.holderOffsetY == -1) py = h - bottom;
			//No easing holder is higher than visible height
			if(py == 0) ease = 1;
			//Ease position
			py += (h - bottom - py) * ease * timeScale;
			//If position close to end pos, round it to expected pos
			if(Math.abs(h - bottom - py) < 2) {
				py = h - bottom;
			}
			this.holderOffsetY = py;
		}else if(this.holderOffsetY != 0) {
			this.holderOffsetY = 0;
		}

		//Show next pending message if at the bottom and scroll isn't locked
		if(this.virtualScrollY >= maxScroll-1
		&& !this.lockScroll
		&& this.pendingMessages.length > 0) {
			this.showNextPendingMessage();
		}
		
	}

	/**
	 * Get the next pending message and display it to the list
	 */
	private showNextPendingMessage(wheelOrigin = false):void {
		if(this.pendingMessages.length == 0) return;
		
		let message!:TwitchatDataTypes.ChatMessageTypes;
		do {
			message = this.pendingMessages.shift()!;
		}while(!this.shouldShowMessage(message))

		this.filteredMessages.push( message );
		if(this.filteredMessages.length > this.maxMessages) {
			this.filteredMessages = this.filteredMessages.slice(-this.maxMessages);
		}
		this.filteredMessages = this.filteredMessages.slice(-this.maxMessages);
		this.scrollToPrevMessage(wheelOrigin);
	}

	/**
	 * Call this after adding a new message.
	 * Will scroll so the previous message is on the bottom of the list
	 * so the new message displays smoothly from the bottom of the screen
	 */
	private async scrollToPrevMessage(wheelOrigin = false):Promise<void> {
		await this.$nextTick();
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);

		const messRefs = el.querySelectorAll(".messageHolder>.message");
		if(messRefs.length == 0) return;
		const lastMessRef = messRefs[ messRefs.length - 1 ] as HTMLDivElement;

		if(this.filteredMessages.length >= this.maxMessages) {
			this.counter++;
		}
		
		if(lastMessRef) {
			if(wheelOrigin) {
				//If scrolling down with mouse wheel while scrolling is locked, interpolate
				//scroll via tween as the renderFrame does nothing while scroll is locked
				gsap.killTweensOf(el);
				gsap.to(el, {duration:.2, scrollTop:maxScroll, ease:"sine.inOut", onUpdate:()=>{
					this.virtualScrollY = el.scrollTop;
				}});
			}else{
				const style = window.getComputedStyle(lastMessRef);
				const margin = parseFloat(style.marginBottom);
				this.virtualScrollY = maxScroll - (lastMessRef.offsetHeight + margin);
			}
		}

		//Check if last marked as read message is still there
		if(this.prevMarkedReadMessage) {
			if((this.$refs["message_"+this.prevMarkedReadMessage.id] as Vue[]).length == 0) {
				this.prevMarkedReadMessage = null;
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
	public async openConversation(event:MouseEvent, m:TwitchatDataTypes.MessageChatData):Promise<void> {
		if(this.lightMode || !m || (!m.answersTo && !m.answers)) return;

		this.conversationMode = true;

		if(m.answers.length > 0) {
			this.conversation = m.answers.concat();
			this.conversation.unshift( m );
		}else if(m.answersTo) {
			this.conversation = m.answersTo.answers.concat();
			this.conversation.unshift( m.answersTo );
		}
		await this.$nextTick();
		this.openConversationHolder(m);
	}

	/**
	 * Called to open a user's messages history
	 */
	public async openUserHistory(event:MouseEvent, m:TwitchatDataTypes.MessageChatData):Promise<void> {
		if(this.lightMode || !m) return;

		clearTimeout(this.openConvTimeout);
		this.openConvTimeout = setTimeout(async ()=> {
			this.conversationMode = false;
	
			let messageList:TwitchatDataTypes.MessageChatData[] = [];
			for (let i = 0; i < this.$store("chat").messages.length; i++) {
				const mess = this.$store("chat").messages[i];
				if(mess.type == "message" && mess.user.id == m.user.id) {
					messageList.push(mess);
					if(messageList.length > 100) break;//Limit to 100 for perf reasons
				}
			}
			this.conversation = messageList;
	
			await this.$nextTick();
			this.openConversationHolder(m);
		}, 350)
	}

	/**
	 * Opens up the conversation holder.
	 * Call this after making sure the messages are rendered
	 */
	private openConversationHolder(m:TwitchatDataTypes.MessageChatData):void {
		clearTimeout(this.closeConvTimeout);
		const messageHolder			= (this.$refs["message_"+m.id] as Vue[])[0];
		const messageBounds			= (messageHolder.$el as HTMLDivElement).getBoundingClientRect();
		const chatMessagesHolder	= this.$refs.chatMessageHolder as HTMLDivElement;
		const conversationHolder	= this.$refs.conversationHolder as HTMLDivElement;
		const convMessagesholder	= this.$refs.conversationMessages as HTMLDivElement;

		this.conversationPos = Math.max(conversationHolder.getBoundingClientRect().height, messageBounds.top);
		
		//Scroll history to top
		convMessagesholder.scrollTop = convMessagesholder.scrollHeight;
		gsap.to(chatMessagesHolder, {opacity:.25, duration:.25});
	}

	/**
	 * Called when rolling out of a message
	 * Close the conversation if any displayed
	 */
	public onLeaveMessage():void {
		this.hoveredMessage = null;
		this.hoverchatMessageHolder = document.body;
		clearTimeout(this.openConvTimeout);
		if(this.conversation.length == 0) return;
		//Timeout avoids blinking when leaving the message but
		//hovering another one or the conversation window
		this.closeConvTimeout = setTimeout(()=>{
			this.conversation = [];
			const mainHolder = this.$refs.chatMessageHolder as HTMLDivElement;
			gsap.to(mainHolder, {opacity:1, duration:.25});
		}, 0);
	}


	/**
	 * Called on a message is clicked
	 */
	public toggleMarkRead(m:TwitchatDataTypes.ChatMessageTypes, event?:MouseEvent):void {
		if(event) {
			const target = event.target as HTMLElement;
			if(target.tagName.toLowerCase() == "a") return;//Do not mark as read if clicked on a link
		}
		if(this.$store("params").features.markAsRead.value !== true) return;
		m.markedAsRead = !m.markedAsRead;
		if(this.prevMarkedReadMessage && this.prevMarkedReadMessage != m) {
			this.prevMarkedReadMessage.markedAsRead = false;
		}
		if(m.markedAsRead) {
			this.prevMarkedReadMessage = m;
			const div = (this.$refs["message_"+m.id] as Vue[])[0];
			this.markedReadItem = div.$el;
		}else{
			this.markedReadItem = null;
		}

		if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			//TODO broadcast message
			const message = {
				channel: m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE? m.channel_id : m.to.id,
				message:m.message,
			}
			PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_READ, {manual:event!=null, selected:m.markedAsRead === true, message});
		}
	}
}
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
		.messageHolder {
			padding: 0;
			overflow: hidden;
		}
	}

	&:not(.alternateOdd) {
		.messageHolder {
			// Not using background-color to avoid conflicting with actual message's BG.
			// Could wrap all messages inside a div to avoid using ::before, dunno which
			// solution has the best perfs...
			.message:nth-child(odd)::before {
				content: "";
				z-index: 1;
				position: absolute;
				top:0;
				left:0;
				width: 100%;
				height: 100%;
				background-color: rgba(255, 255, 255, .025);
			}
		}
	}
	&.alternateOdd {
		.messageHolder {
			// Not using background-color to avoid conflicting with actual message's BG.
			// Could wrap all messages inside a div to avoid using ::before, dunno which
			// solution has the best perfs...
			.message:nth-child(even)::before {
				content: "";
				z-index: 1;
				position: absolute;
				top:0;
				left:0;
				width: 100%;
				height: 100%;
				background-color: rgba(255, 255, 255, .025);
			}
		}
	}

	.messageHolder {
		overflow-y: auto;
		overflow-x: hidden;
		flex-grow: 1;
		.message {
			position: relative;
			// Not using background-color to avoid conflicting with actual message's BG.
			// Could wrap all messages inside a div to avoid using ::before, dunno which
			// solution has the best perfs...
			&:hover::before {
				content: "";
				pointer-events: none;
				z-index: 1;
				position: absolute;
				top:0;
				left:0;
				width: 100%;
				height: 100%;
				background-color: rgba(255, 255, 255, .2) !important;
			}
		}

		.markRead {
			width: 100%;
			height: 10000px;
			background: fade(@mainColor_dark, 80%);
			border-bottom: 2px solid @mainColor_light;
			position: absolute;
			bottom: 0;
			left: 0;
			pointer-events: none;
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
		transform: translateY(-100%);
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
				.clearButton();
				width: 1.25em;
				height: 1.25em;
				padding: .5em;
			}
		}
		.messages {
			max-height: 200px;
			overflow-y: auto;
			overflow-x: hidden;
		}

		.TTSreadBt {
			.clearButton();
			font-size: .7em;
			display: block;
			margin: auto;
			padding: 0 .25em;
		}
	}
}
</style>