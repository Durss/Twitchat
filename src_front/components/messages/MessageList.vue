<template>
	<div :class="classes"
	@mouseenter="onHoverList()"
	@mouseleave="onLeaveList()"
	@wheel="onMouseWheel($event)"
	@touchmove="onTouchMove($event)">
		<div aria-live="polite" role="alert" class="ariaMessage">{{ariaMessage}}</div>

		<div class="holder" ref="chatMessageHolder" :style="holderStyles">
			<template v-for="m in filteredMessages" :key="m.id">
				<ChatAd class="message"
					v-if="m.type == 'twitchat_ad' && !lightMode"
					:ref="'message_'+m.id"
					:messageData="m"
					@showModal="(v:string)=>$emit('showModal', v)"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
				/>

				<ChatJoinLeave class="message"
					v-else-if="(m.type == 'join' || m.type == 'leave') && !lightMode"
					:ref="'message_'+m.id"
					:messageData="m"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
				/>

				<ChatConnect class="message"
					v-else-if="(m.type == 'connect' || m.type == 'disconnect') && !lightMode"
					:ref="'message_'+m.id"
					:messageData="m"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
				/>

				<ChatMessage
					v-else-if="m.type == 'message' || m.type == 'whisper'"
					:ref="'message_'+m.id"
					class="message"
					:messageData="m"
					:lightMode="lightMode"
					@showConversation="openConversation"
					@showUserMessages="openUserHistory"
					@mouseenter="onHoverMessage(m)"
					@mouseleave="onLeaveMessage()"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					/>
					
				<ChatNotice
					v-else-if="m.type == 'notice'"
					:ref="'message_'+m.id"
					class="message"
					:messageData="m"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					/>

				<ChatPollResult
					v-else-if="m.type == 'poll'"
					:ref="'message_'+m.id"
					class="message"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					:pollData="m"
				/>

				<ChatPredictionResult
					v-else-if="m.type == 'prediction'"
					:ref="'message_'+m.id"
					class="message"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					:predictionData="m"
				/>

				<ChatBingoResult
					v-else-if="m.type == 'bingo'"
					:ref="'message_'+m.id"
					class="message"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					:bingoData="m"
				/>

				<ChatRaffleResult
					v-else-if="m.type == 'raffle'"
					:ref="'message_'+m.id"
					class="message"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					:raffleData="m"
				/>

				<ChatCountdownResult
					v-else-if="m.type == 'countdown'"
					:ref="'message_'+m.id"
					class="message"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					:countdownData="m"
				/>

				<ChatHypeTrainResult
					v-else-if="m.type == 'hype_train_summary'"
					ref="message"
					class="message"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					:result="m" />

				<ChatFollowbotEvents
					v-else-if="m.type == 'followbot_list'"
					ref="message"
					class="message"
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					:result="m" />

				<ChatHighlight
					v-else
					:ref="'message_'+m.id"
					class="message"
					:messageData="m"
					lightMode
					@ariaMessage="(v:string)=>setAriaMessage(v)"
					@click="toggleMarkRead(m, $event)"
					/>

			</template>

			<!-- <div class="hoverActionsHolder"
			v-if="!lightMode && m.type == 'message' && !m.user.channelInfo[m.channel_id].is_blocked">
				<ChatMessageHoverActions class="hoverActions" :messageData="m" />
			</div> -->
			<teleport :to="hoverchatMessageHolder" v-if="hoverchatMessageHolder">
				<ChatMessageHoverActions class="hoverActions" :messageData="hoveredMessage" />
			</teleport>
			
			<teleport :to="markedReadItem" v-if="markedReadItem">
				<div class="markRead"></div>
			</teleport>
		</div>

		<div class="locked" ref="locked" v-if="lockScroll && !lightMode" @click.stop="unPause()">
			<span v-if="lockScroll">Chat paused</span>
			<span v-if="pendingMessages.length > 0">(+{{pendingMessages.length}})</span>
		</div>

		<div class="conversation" ref="conversationHolder"
			v-if="conversation.length > 0"
			:style="conversationStyles"
			@mouseenter="reopenLastConversation()"
			@mouseleave="onLeaveMessage()"
			@wheel.stop=""
		>
			<div class="head">
				<h1 v-if="conversationMode">Conversation</h1>
				<h1 v-if="!conversationMode">{{conversation[0].user.displayName}} history</h1>
				<Button class="button" aria-label="close conversation" :icon="$image('icons/cross_white.svg')" @click="onLeaveMessage()" />
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
				@click="toggleReadUser()"
				v-if="!conversationMode && $store('tts').params.enabled === true"
				small bounce />
		</div>

		<div v-if="filteredMessages.length == 0 && !lightMode" class="noMessage">
			<div class="gradient"></div>
		</div>
	</div>
</template>

<script lang="ts">
import ChatMessage from '@/components/messages/ChatMessage.vue';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import TwitchatEvent from '@/utils/TwitchatEvent';
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
import ChatMessageHoverActions from './components/ChatMessageHoverActions.vue';
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
	public hoveredMessage:TwitchatDataTypes.ChatMessageTypes | null = null;
	public filteredMessages:TwitchatDataTypes.ChatMessageTypes[] = [];
	public pendingMessages:TwitchatDataTypes.ChatMessageTypes[] = [];
	public conversation:TwitchatDataTypes.MessageChatData[] = [];
	public ariaMessage = "";
	public ariaMessageTimeout = -1;
	public lockScroll = false;
	public conversationPos = 0;
	public scrollAtBottom = true;
	public conversationMode = true;//Used to change title between "History"/"Conversation"
	public markedReadItem:HTMLDivElement|null = null;
	public hoverchatMessageHolder:HTMLDivElement|null = null;

	private counter = 0;
	private prevTs = 0;
	private disposed = false;
	private lastDisplayedMessage?:HTMLDivElement;
	private holderOffsetY = 0;
	private prevMarkedReadMessage:TwitchatDataTypes.ChatMessageTypes | null = null;
	private virtualScrollY = -1;
	private idDisplayed:{[key:string]:boolean} = {};
	private openConvTimeout!:number;
	private closeConvTimeout!:number;
	private prevTouchMove!:TouchEvent;
	private publicApiEventHandler!:(e:TwitchatEvent)=> void;

	public get classes():string[] {
		let res = ["messagelist"];
		res.push("alternateBG");
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

	public async mounted():Promise<void> {
		//Listen for new messages
		watch(() => this.$store("chat").messages, async (value) => {
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);

			//If scrolling is locked or there are still messages pending,
			//add the new messages to the pending list
			const chatPaused = this.lockScroll || this.pendingMessages.length > 0 || el.scrollTop < maxScroll;
			const list = this.$store("chat").messages;
			const len = list.length;
			//There should be no need to read more than 50 new messages at a time
			//Unless the chat is ultra spammy in which case we wouldn't notice
			//messages are missing from the list anyway...
			let i = Math.max(0, len - 50);
			for (; i < len; i++) {
				const m = list[i];
				if(this.idDisplayed[m.id as string] !== true && this.shouldShowMessage(m)) {
					this.idDisplayed[m.id as string] = true;
					if(chatPaused) {
						this.pendingMessages.push(m);
					}else{
						this.filteredMessages.push(m);
					}
				}
			}
			return;
		});

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

		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.publicApiEventHandler);

		this.fulllListRefresh();

		this.prevTs = Date.now();
		this.renderFrame(this.prevTs);
	}

	public beforeUnmount():void {
		this.disposed = true;

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
			el.scrollTop = this.virtualScrollY = maxScroll
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
	private async fulllListRefresh():Promise<void> {
		this.pendingMessages = [];
		this.idDisplayed = {};
		const s = Date.now();
		const sChat = StoreProxy.chat;
		const messages = sChat.messages.concat();
		const result:TwitchatDataTypes.ChatMessageTypes[] = [];
		for (let i = messages.length-1; i >= 0; i--) {
			const m = messages[i];
			if(this.shouldShowMessage(m)) {
				this.idDisplayed[m.id] = true;
				result.unshift(m);
			}
			if(result.length == this.max) break;
		}

		this.filteredMessages = result;
		const e = Date.now();
		console.log("full refresh duration:", e-s);

		await this.$nextTick();

		//Scroll toi bottom
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);
		this.virtualScrollY = maxScroll;
		this.lockScroll = false;
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

		const timeScale = (60/1000) * (ts - this.prevTs);
		this.prevTs = ts;

		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const h = el.offsetHeight;
		const maxScroll = (el.scrollHeight - h);

		const messRefs = el.querySelectorAll(".message");
		if(messRefs.length == 0) return;//view not ready yet
		
		// const lastMessRef = messRefs[ messRefs.length - 1 ];
		// const bottom = lastMessRef.offsetTop + lastMessRef.offsetHeight;
		const lastMess = el.children[el.children.length-1] as HTMLDivElement;
		if(!lastMess) return;//No message yet, just stop here

		const bottom = lastMess.offsetTop + lastMess.offsetHeight;

		let ease = .2;
		ease = .1;//TODO remove
		if(!this.lockScroll) {
			//On init the virtualscroll is -1, scroll to the bottom and init the virtualscroll
			if(this.virtualScrollY == -1) this.virtualScrollY = maxScroll;

			const dist = Math.abs(maxScroll-this.virtualScrollY);
			if(dist > 10 || this.pendingMessages.length > 0) {
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
		
		if(bottom < h) {
			console.log("SMALLER");
			//If messages height is smaller than the holder height, move the holder to the bottom
			if(this.holderOffsetY == 0) ease = 1;
			this.holderOffsetY += (h - bottom - this.holderOffsetY) * ease * timeScale;
			if(Math.abs(h - bottom - this.holderOffsetY) < 2) {
				this.holderOffsetY = h - bottom;
			}
		}else{
			this.holderOffsetY = 0;
		}

		//Show next pending message if at the bottom and scroll isn't locked
		if(this.virtualScrollY >= maxScroll-1
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
		
		let message!:TwitchatDataTypes.ChatMessageTypes;
		do {
			message = this.pendingMessages.shift()!;
		}while(!this.shouldShowMessage(message))

		this.idDisplayed[message.id] = true;
		this.filteredMessages.push( message );
		if(this.filteredMessages.length > this.max) {
			this.filteredMessages = this.filteredMessages.slice(-this.max);
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
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);

		const messRefs = el.querySelectorAll(".message");
		if(messRefs.length == 0) return;
		const lastMessRef = messRefs[ messRefs.length - 1 ] as HTMLDivElement;

		//This avoids a glith when a filtered message is receive.
		//In such case, no new message is created but this method is still called.
		//Without this condition the scroll would glitch back to the previous
		//message then back to the bottom.
		//This condition avoids this "glitch".
		if(lastMessRef == this.lastDisplayedMessage) return;
		
		if(this.filteredMessages.length >= this.max) {
			this.counter++;
		}
		
		if(lastMessRef) {
			if(wheelOrigin) {
				//If scrolling down with mouse wheel while scrolling is locked, interpolate
				//scroll via tween as the renderFrame does nothing while scroll is locked
				gsap.killTweensOf(el);
				gsap.to(el, {duration:1.2, scrollTop:maxScroll, ease:"sine.inOut", onUpdate:()=>{
					this.virtualScrollY = el.scrollTop;
				}});
			}else{
				this.virtualScrollY = maxScroll - lastMessRef.offsetHeight;
			}
		}

		//Check if last marked as read message is still there
		if(this.prevMarkedReadMessage) {
			if((this.$refs["message_"+this.prevMarkedReadMessage.id] as Vue[]).length == 0) {
				this.prevMarkedReadMessage = null;
			}
		}

		this.lastDisplayedMessage = lastMessRef;
	}

	/**
	 * Avoids closing the conversation when rolling over it
	 */
	public async setAriaMessage(message:string):Promise<void> {
		message = message.replace(/data-.*?=".*?"/gim, "");//Strip data-attributes that can contain HTML
		message = message.replace(/<[^>]*>/gim, "");//Strip HTML tags
		this.ariaMessage = message;
		clearTimeout(this.ariaMessageTimeout);
		this.ariaMessageTimeout = setTimeout(()=> {
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

	public onHoverMessage(m:any):void {
		this.hoveredMessage=m;
		const div = (this.$refs["message_"+m.id] as Vue[])[0];
		this.hoverchatMessageHolder = div.$el;
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
		const messageHolder			= (this.$refs["message_"+this.hoveredMessage?.id] as Vue[])[0];
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
		this.hoverchatMessageHolder = null;
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
			const div = (this.$refs["message_"+this.hoveredMessage?.id] as Vue[])[0];
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
		.holder {
			padding: 0;
			overflow: hidden;
		}
	}

	.ariaMessage {
		position: absolute;
		top: 0;
		transform: translate(0, -10000px);
		z-index: 100;
	}

	&.alternateBG:not(.lightMode) {
		.holder {
			.message:nth-child(odd) {
				background-color: rgba(255, 255, 255, .025);
				&:hover {
					background-color: rgba(255, 255, 255, .2);
				}
			}
		}
		&.alternateOdd {
			.holder {
				.message:nth-child(odd) {
					background-color: transparent;
					&:hover {
						background-color: rgba(255, 255, 255, .2);
					}
				}
				.message:nth-child(even) {
					background-color: rgba(255, 255, 255, .025);
					&:hover {
						background-color: rgba(255, 255, 255, .2);
					}
				}
			}
		}
	}

	.holder {
		overflow-y: auto;
		overflow-x: hidden;
		flex-grow: 1;
		.message {
			&:hover {
				background-color: rgba(255, 255, 255, .2);
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

		.hoverActions {
			position: absolute;
			// visibility: hidden;
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