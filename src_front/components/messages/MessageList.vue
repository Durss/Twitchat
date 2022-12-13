<template>
	<div :class="classes"
		@mouseenter="onHoverList"
		@mouseleave="onLeaveList"
		@wheel="onMouseWheel"
		@touchmove="onTouchMove">
		
		<MessageListFilter class="filters"
			:open="hovered || forceConfig"
			:forceConfig="forceConfig"
			:config="config"
			@add="$emit('addColumn', config)"
			@delete="deleteColumn()"
			@change="fullListRefresh()"
			@submit="forceConfig = false"/>

		<button class="filteredMessages" v-if="lockedListRefresh" @click="unlockListRefresh()">
			<img src="@/assets/icons/back.svg" alt="back">
			<span><img src="@/assets/icons/train.svg" alt="train" class="icon">Hype train activities</span>
		</button>

		
		<div class="messageHolder" ref="chatMessageHolder">
			<div v-for="m in filteredMessages" :key="m.id" class="subHolder" :ref="'message_' + m.id">
				<ChatAd class="message"
					v-if="m.type == 'twitchat_ad'"
					@showModal="(v: string) => $emit('showModal', v)"
					:messageData="m" />

				<ChatJoinLeave class="message"
					v-else-if="(m.type == 'join' || m.type == 'leave')"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatConnect class="message"
					v-else-if="(m.type == 'connect' || m.type == 'disconnect')"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatMessage class="message"
					v-else-if="m.type == 'message' || m.type == 'whisper'"
					:lightMode="lightMode"
					@showConversation="openConversation"
					@showUserMessages="openUserHistory"
					@onOverMessage="onEnterMessage"
					@mouseleave="onLeaveMessage"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatNotice class="message"
					v-else-if="m.type == 'notice'" 
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatPollResult class="message"
					v-else-if="m.type == 'poll'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatPredictionResult class="message"
					v-else-if="m.type == 'prediction'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatBingoResult class="message"
					v-else-if="m.type == 'bingo'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatRaffleResult class="message"
					v-else-if="m.type == 'raffle'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatCountdownResult class="message"
					v-else-if="m.type == 'countdown'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatHypeTrainResult class="message"
					v-else-if="m.type == 'hype_train_summary'"
					@onRead="toggleMarkRead"
					@setCustomActivities="setCustomActivities"
					:messageData="m" />

				<ChatFollowbotEvents class="message"
					v-else-if="m.type == 'followbot_list'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatRoomSettings class="message"
					v-else-if="m.type == 'room_settings'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatClear class="message"
					v-else-if="m.type == 'clear_chat'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatShoutout class="message"
					v-else-if="m.type == 'shoutout'"
					@onRead="toggleMarkRead"
					:messageData="m" />

				<ChatHighlight v-else class="message"
					@onRead="toggleMarkRead"
					:messageData="m" />

			</div>

			<div key="empty" class="subHolder" ref="message_0" v-if="filteredMessages?.length===0">
				<div class="message empty">- no message -</div>
			</div>
		</div>

		<teleport :to="markedReadItem" v-if="markedReadItem">
			<div class="markRead"></div>
		</teleport>

		<div class="locked" ref="locked" v-if="lockScroll && !lightMode" @click.stop="unPause">
			<span v-if="lockScroll">Chat paused</span>
			<span v-if="pendingMessages.length > 0">(+{{ pendingMessages.length }})</span>
		</div>

		<div class="lockedLiveHolder" v-if="!lightMode && lockScroll && lockedLiveMessages.length > 0">
			<div class="title">
				<Button :icon="$image('icons/minus.svg')"
					:disabled="config.liveLockCount == 1"
					@click="incrementLockedLiveCount(-1)"/>
				<span class="label">live chat</span>
				<Button :icon="$image('icons/add.svg')"
					:disabled="config.liveLockCount == 10"
					@click="incrementLockedLiveCount(1)"/>
			</div>
			<div class="subHolder" v-for="m in lockedLiveMessages"
			:key="m.id" :ref="'message_live_' + m.id">
				<ChatJoinLeave class="message"
					v-if="(m.type == 'join' || m.type == 'leave')"
					:messageData="m" />

				<ChatConnect class="message"
					v-else-if="(m.type == 'connect' || m.type == 'disconnect')"
					:messageData="m" />

				<ChatMessage class="message"
					v-else-if="m.type == 'message' || m.type == 'whisper'"
					disableConversation
					:messageData="m" />

				<ChatNotice class="message"
					v-else-if="m.type == 'notice'" 
					:messageData="m" />

				<ChatPollResult class="message"
					v-else-if="m.type == 'poll'"
					:messageData="m" />

				<ChatPredictionResult class="message"
					v-else-if="m.type == 'prediction'"
					:messageData="m" />

				<ChatBingoResult class="message"
					v-else-if="m.type == 'bingo'"
					:messageData="m" />

				<ChatRaffleResult class="message"
					v-else-if="m.type == 'raffle'"
					:messageData="m" />

				<ChatCountdownResult class="message"
					v-else-if="m.type == 'countdown'"
					:messageData="m" />

				<ChatHypeTrainResult class="message"
					v-else-if="m.type == 'hype_train_summary'"
					:messageData="m" />

				<ChatFollowbotEvents class="message"
					v-else-if="m.type == 'followbot_list'"
					:messageData="m" />

				<ChatRoomSettings class="message"
					v-else-if="m.type == 'room_settings'"
					:messageData="m" />

				<ChatClear class="message"
					v-else-if="m.type == 'clear_chat'"
					:messageData="m" />

				<ChatShoutout class="message"
					v-else-if="m.type == 'shoutout'"
					:messageData="m" />

				<ChatHighlight v-else class="message"
					:messageData="m" />
			</div>
		</div>

		<div class="conversation" ref="conversationHolder" v-if="conversation.length > 0"
			:style="conversationStyles"
			@mouseenter="reopenLastConversation"
			@mouseleave="onLeaveMessage"
			@wheel.stop="">
			<div class="head">
				<h1 v-if="conversationMode">Conversation</h1>
				<h1 v-if="!conversationMode">{{ conversation[0].user.displayName }} history</h1>
				<Button class="button"
					aria-label="close conversation"
					:icon="$image('icons/cross_white.svg')"
					@click="onLeaveMessage" />
			</div>
			<div class="messages" ref="conversationMessages">
				<ChatMessage v-for="m in conversation" :key="m.id"
					class="message"
					:messageData="m"
					disableConversation />
			</div>

			<Button class="TTSreadBt" small bounce
				aria-label="read this user's messages"
				:title="readLabel"
				:icon="$image('icons/tts.svg')"
				@click="toggleReadUser"
				v-if="!conversationMode && $store('tts').params.enabled === true" />
		</div>

		<div v-if="showLoadingGradient && !lightMode" class="noMessage">
			<div class="gradient"></div>
		</div>

		<ChatMessageHoverActions class="hoverActions" 
			v-if="hoveredMessage"
			:style="hoverActionsStyles"
			@mouseleave="onLeaveMessage"
			@mouseenter="reopenLastHoverActions"
			:messageData="hoveredMessage" />
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
import ChatClear from './ChatClear.vue';
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
import ChatRoomSettings from './ChatRoomSettings.vue';
import ChatShoutout from './ChatShoutout.vue';
import ChatMessageHoverActions from './components/ChatMessageHoverActions.vue';
import MessageListFilter from './components/MessageListFilter.vue';

@Options({
	components: {
		Button,
		ChatAd,
		ChatClear,
		ChatNotice,
		ChatConnect,
		ChatMessage,
		ChatShoutout,
		ChatHighlight,
		ChatJoinLeave,
		ChatPollResult,
		ChatBingoResult,
		ChatRoomSettings,
		ChatRaffleResult,
		MessageListFilter,
		ChatFollowbotEvents,
		ChatHypeTrainResult,
		ChatCountdownResult,
		ChatPredictionResult,
		ChatMessageHoverActions,
	},
	props: {
		config: Object,
		filterId: String,
		maxMessages: Number,
		lightMode: {
			type: Boolean,
			default: false,
		},//Used by OBS chat
	},
	emits: ["showModal", 'addColumn']
})
export default class MessageList extends Vue {

	public maxMessages!: number;
	public lightMode!: boolean;
	public filterId!: string;
	public config!: TwitchatDataTypes.ChatColumnsConfig;

	public hoveredMessage: TwitchatDataTypes.ChatMessageTypes | null = null;
	public filteredMessages: TwitchatDataTypes.ChatMessageTypes[] = [];
	public pendingMessages: TwitchatDataTypes.ChatMessageTypes[] = [];
	public lockedLiveMessages: TwitchatDataTypes.ChatMessageTypes[] = [];
	public conversation: TwitchatDataTypes.MessageChatData[] = [];
	public hovered = false;
	public forceConfig = false;
	public lockScroll = false;
	public lockedListRefresh = false;
	public showLoadingGradient = false;
	public conversationMode = true;//Used to change title between "History"/"Conversation"
	public markedReadItem: HTMLDivElement | null = null;

	private prevTs = 0;
	private counter = 0;
	private disposed = false;
	private loadingOldMessage = false;
	private prevMarkedReadMessage: TwitchatDataTypes.ChatMessageTypes | null = null;
	private scrollUpIndexOffset = -1;
	private holderOffsetY = -1;
	private virtualScrollY = -1;
	private updateDebounce = -1;
	private conversationPos = 0;
	private hoverActionsPos = 0;
	private prevHeight = 0;
	private openConvTimeout!: number;
	private closeConvTimeout!: number;
	private prevTouchMove!: TouchEvent;
	private publicApiEventHandler!: (e: TwitchatEvent) => void;
	private deleteMessageHandler!: (e: GlobalEvent) => void;
	private addMessageHandler!: (e: GlobalEvent) => void;

	public get classes(): string[] {
		let res = ["messagelist"];
		if (this.lightMode) res.push("lightMode");
		if (this.lockScroll) res.push("lockScroll");
		return res;
	}

	// public get holderStyles():StyleValue {
	// 	if(this.holderOffsetY == 0) return {};
	// 	return {
	// 		transform:"translateY(calc("+this.holderOffsetY+"px - .25em))",
	// 	};
	// }

	public get conversationStyles(): StyleValue {
		return { top: this.conversationPos + "px" }
	}

	public get hoverActionsStyles(): StyleValue {
		return { top: this.hoverActionsPos + "px" }
	}

	public get readLabel(): string {
		if (!this.conversation[0].user.displayName) return "";
		const username = this.conversation[0].user.displayName.toLowerCase();
		const permissions: TwitchatDataTypes.PermissionsData = this.$store("tts").params.ttsPerms;
		let label = "";
		if (permissions.users.toLowerCase().split(/[^a-z0-9_]+/gi).indexOf(username) == -1) {
			label = "Read " + username + "'s future messages";
		} else {
			label = "Stop reading " + username + "'s messages";
		}
		return label;
	}

	public beforeUpdate(): void {
		// console.log("Update list");
	}

	public async beforeMount(): Promise<void> {

		//If text size is changed, scroll to bottom of tchat
		watch(() => this.$store("params").appearance.defaultSize.value, async () => {
			await this.$nextTick();
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			el.scrollTop = this.virtualScrollY = maxScroll;
		});

		let refreshDebounce = -1;

		//Update list when filters are changed
		watch(() => this.config.filters, () => {
			clearTimeout(refreshDebounce);
			refreshDebounce = setTimeout(()=>{
				this.fullListRefresh();
			}, 250);
		}, {deep: true});
		
		//Update list when message filters are changed
		watch(() => this.config.messageFilters, () => {
			clearTimeout(refreshDebounce);
			refreshDebounce = setTimeout(()=>{
				this.fullListRefresh();
			}, 250);
		}, {deep: true});

		this.publicApiEventHandler = (e: TwitchatEvent) => this.onPublicApiEvent(e);
		this.deleteMessageHandler = (e: GlobalEvent) => this.onDeleteMessage(e);
		this.addMessageHandler = (e: GlobalEvent) => this.onAddMessage(e);

		EventBus.instance.addEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
		EventBus.instance.addEventListener(GlobalEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.publicApiEventHandler);

		this.fullListRefresh();

		let noConfig = true;
		for (const key in this.config.filters) {
			if(this.config.filters[key as typeof TwitchatDataTypes.MessageListFilterTypes[number]] === true) {
				noConfig = false;
				break;
			}
		}
		this.forceConfig = noConfig;

		this.prevTs = Date.now() - 1000 / 60;
		this.renderFrame(Date.now());
	}

	public beforeUnmount(): void {
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
	public async onHoverList(): Promise<void> {
		this.hovered = true;
		if (this.lightMode || !this.$store("params").features.lockAutoScroll.value) return;
		const scrollDown = !this.lockScroll;
		this.lockScroll = true;

		await this.$nextTick();//Wait for lock div to be built

		gsap.from(this.$refs.locked as HTMLDivElement, { duration: .2, height: 0, scaleY: 0, ease: "ease.out" });

		if (scrollDown) {
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			el.scrollTop = this.virtualScrollY = maxScroll;
		}
	}

	/**
	 * Called when rolling out message list.
	 * Unpausse chat if no new message
	 */
	public onLeaveList(): void {
		this.hovered = false;
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);

		if (this.pendingMessages.length == 0 && el.scrollTop >= maxScroll - 50) {
			this.lockScroll = false;
		}
	}

	/**
	 * Toggles whether the TTS should read this user's messages
	 */
	public toggleReadUser(): void {
		const username = this.conversation[0].user.login?.toLowerCase();
		const permissions: TwitchatDataTypes.PermissionsData = this.$store("tts").params.ttsPerms;
		const read = permissions.users.toLowerCase().split(/[^a-z0-9_]+/gi).indexOf(username) == -1;
		this.$store("tts").ttsReadUser(this.conversation[0].user, read);
	}

	/**
	 * Called when requesting to delete the current column
	 */
	public deleteColumn():void {
		this.$store("main")
		.confirm("Delete column?", "Do you want to delete this column? This cannot be undone.")
		.then(()=> {
			this.$store("params").delChatColumn(this.config);
		})
	}

	/**
	 * Cleans up all messages and rebuild the list
	 */
	public fullListRefresh(): void {
		if(this.lockedListRefresh) return;

		clearTimeout(this.updateDebounce);
		this.updateDebounce = setTimeout(async () => {
			this.pendingMessages = [];
			this.lockedLiveMessages = [];
			this.scrollUpIndexOffset = -1;

			// const s = Date.now();

			const sChat = StoreProxy.chat;
			const messages = sChat.messages.concat();

			let result: TwitchatDataTypes.ChatMessageTypes[] = [];
			for (let i = messages.length - 1; i >= 0; i--) {
				const m = messages[i];
				if (this.shouldShowMessage(m)) {
					result.unshift(m);
				}
				if (result.length == this.maxMessages) break;
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
	private shouldShowMessage(m: TwitchatDataTypes.ChatMessageTypes): boolean {
		let blockedSpecificCmds = this.config.commandsBlockList.toLowerCase().split(",").map(v=>v.trim());//Split commands by non-alphanumeric characters
		let blockedSpecificUsers = this.config.userBlockList.toLowerCase().split(/[^a-z0-9_]+/gi);//Split commands by non-alphanumeric characters

		if(this.lightMode) {
			//If in light mode, only allow normal chat messages that are not deleted/moded/...
			return m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				&& !m.automod
				&& !m.deleted
				&& !m.twitch_automod
				&& !m.twitch_isSuspicious
				&& !m.twitch_isRestricted
				&& !m.user.channelInfo[m.channel_id].is_blocked;
		}

		switch (m.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				if(this.config.filters.message === false) return false;
				
				//Ignore specific users
				if (m.user.displayName.length > 0 && blockedSpecificUsers.includes(m.user.login.toLowerCase())) {
					return false;
				}

				//Ignore specific commands
				if (this.config.messageFilters.commands === true && blockedSpecificCmds.length > 0) {
					const cleanMess = m.message.trim().toLowerCase();
					for (let i = 0; i < blockedSpecificCmds.length; i++) {
						const cmd = blockedSpecificCmds[i];
						if(cmd.length > 0 && cleanMess.indexOf(cmd) > -1) {
							return false;
						}
					}
				}


				//Second test for some types so deleted/automoded/... messages can still be
				//displayed even if all the viewers/mod/vip/sub filters are off
				if ((m.twitch_automod || m.twitch_isRestricted)) {
					return this.config.messageFilters.automod !== false;
				}
				if (m.deleted) {
					return this.config.messageFilters.deleted !== false;
				}
				if (m.twitch_isSuspicious) {
					return this.config.messageFilters.suspiciousUsers !== false;
				}
				if (m.is_short) {
					return this.config.messageFilters.short !== false;
				}
				if (m.message.trim().charAt(0) == "!") {
					return this.config.messageFilters.commands !== false;
				}

				//User types filters
				if(m.user.is_bot && m.bypassBotFilter !== true) {
					return this.config.messageFilters.bots !== false;
				}
				const chanInfo = m.user.channelInfo[m.channel_id];
				if(m.user.is_partner) {
					return this.config.messageFilters.partners !== false;
				}
				if(chanInfo.is_moderator) {
					return this.config.messageFilters.moderators !== false;
				}
				if(chanInfo.is_vip) {
					return this.config.messageFilters.vips !== false;
				}
				if(chanInfo.is_subscriber) {
					return this.config.messageFilters.subs !== false;
				}

				return this.config.messageFilters.viewers !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
				return this.config.filters.whisper === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT: {
				return this.config.filters.message === true && this.config.messageFilters.viewers === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				return this.config.filters.subscription === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				return this.config.filters.reward === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.PREDICTION:{
				return this.config.filters.prediction === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				return this.config.filters.poll === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.CHEER: {
				return this.config.filters.cheer === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.FOLLOWBOT_LIST:
			case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
				return this.config.filters.following === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAID: {
				return this.config.filters.raid === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY: {
				return this.config.filters.hype_train_summary === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				return this.config.filters.reward === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
				return this.config.filters.raffle === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.BINGO: {
				return this.config.filters.bingo === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN: {
				return this.config.filters.countdown === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN: {
				return this.config.filters.hype_train_cooled_down === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
				return this.config.filters.community_challenge_contribution === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE: {
				return this.config.filters.community_boost_complete === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.JOIN: {
				return this.config.filters.join === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.LEAVE: {
				return this.config.filters.leave === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				return this.config.filters.notice === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
				return this.config.filters.shoutout === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD: {
				return this.config.filters.twitchat_ad === true
				//Force sponsor message if chat messages are displayed
				|| (m.adType == TwitchatDataTypes.TwitchatAdTypes.SPONSOR && this.config.filters.message === true);
			}

			case TwitchatDataTypes.TwitchatMessageType.CONNECT:
			case TwitchatDataTypes.TwitchatMessageType.ROOM_SETTINGS:
			case TwitchatDataTypes.TwitchatMessageType.DISCONNECT: {
				return this.config.filters.message === true;
			}
			default: return false;
		}
	}

	/**
	 * Called when a message is add
	 */
	private onAddMessage(e: GlobalEvent): void {
		if(this.lockedListRefresh) return;

		// const el = this.$refs.chatMessageHolder as HTMLDivElement;
		// const maxScroll = (el.scrollHeight - el.offsetHeight);
		const m = e.data as TwitchatDataTypes.ChatMessageTypes;
		if (!this.shouldShowMessage(m)) return;

		//If scrolling is locked or there are still messages pending,
		//add the new messages to the pending list
		const chatPaused = this.lockScroll;// || this.pendingMessages.length > 0 || el.scrollTop < maxScroll;
		if (chatPaused) {
			this.pendingMessages.push(m);
			this.lockedLiveMessages.push(m);
			this.lockedLiveMessages = this.lockedLiveMessages.slice(-(this.config.liveLockCount ?? 3));//Only keep last N messages
		} else {
			this.lockedLiveMessages = [];
			let list = this.filteredMessages.concat();
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
	private onDeleteMessage(e: GlobalEvent): void {
		const message = e.data as TwitchatDataTypes.ChatMessageTypes;

		//remove from displayed messages
		for (let i = this.filteredMessages.length - 1; i >= 0; i--) {
			const m = this.filteredMessages[i];
			if (m.id == message.id) {
				if(!this.shouldShowMessage(m) || m.type == TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD) {
					this.filteredMessages.splice(i, 1);
				}
				return;
			}
		}

		//Check if it's in the pending messages
		for (let i = this.pendingMessages.length - 1; i >= 0; i--) {
			const m = this.pendingMessages[i];
			if (m.id == message.id) return
		}

		if(this.shouldShowMessage(message) && message.type != TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD) {
			if(this.pendingMessages.length > 0) {
				this.pendingMessages.push(message);
			}else{
				this.filteredMessages.push(message);
			}
		}
	}

	/**
	 * Called when requesting an action from the public API
	 */
	private onPublicApiEvent(e: TwitchatEvent): void {
		const data = e.data as { count?: number, scrollBy?: number };
		let readCount = (data?.count && !isNaN(data.count as number)) ? data.count : 0;
		let scrollBy = (data?.scrollBy && !isNaN(data.scrollBy as number)) ? data.scrollBy : 100;
		switch (e.type) {
			case TwitchatEvent.CHAT_FEED_READ: {
				if(!this.config.filters.message) return;
				if(!this.config.messageFilters.viewers) return;
				if (readCount === 0) readCount = 1;
				const offset = this.filteredMessages.findIndex(v => {
					return v.markedAsRead === true
				})
				if (offset > -1) readCount += offset;
			}
			/* falls through */
			case TwitchatEvent.CHAT_FEED_READ_ALL: {
				if(!this.config.filters.message) return;
				if(!this.config.messageFilters.viewers) return;
				if (readCount === 0 || readCount > this.filteredMessages.length - 1) {
					readCount = this.filteredMessages.length - 1;
				}
				if (readCount < 0) readCount = 0;
				const m = this.filteredMessages[readCount];
				this.toggleMarkRead(m);
				break;
			}
			case TwitchatEvent.CHAT_FEED_PAUSE: {
				this.lockScroll = true;
				break;
			}
			case TwitchatEvent.CHAT_FEED_UNPAUSE: {
				this.unPause();
				break;
			}
			case TwitchatEvent.CHAT_FEED_SCROLL_UP: {
				this.lockScroll = true;
				const el = this.$refs.chatMessageHolder as HTMLDivElement;
				gsap.to(el, { scrollTop: el.scrollTop - scrollBy, duration: .5, ease: "power1.inOut" });
				break;
			}
			case TwitchatEvent.CHAT_FEED_SCROLL_DOWN: {
				const el = this.$refs.chatMessageHolder as HTMLDivElement;
				const vScroll = el.scrollTop + scrollBy;
				const unPause = vScroll >= el.scrollHeight - el.offsetHeight;
				gsap.to(el, {
					scrollTop: vScroll, duration: .5, ease: "power1.inOut", onComplete: () => {
						if (unPause) this.unPause();
					}
				});
				break;
			}
		}
	}

	/**
	 * Catch up all pending messages
	 */
	public async unPause(): Promise<void> {
		this.fullListRefresh();

		gsap.to(this.$refs.locked as HTMLDivElement, {
			duration: .2, height: 0, scaleY: 0, ease: "ease.in", onComplete: () => {
				this.lockScroll = false;
			}
		});
	}


	/**
	 * If hovering and scrolling down with wheel, load next message
	 */
	public async onMouseWheel(event: WheelEvent): Promise<void> {
		//"shiftkey" filter avoids pausing chat when scrolling horizontally via shift+wheel
		if (this.lightMode || event.shiftKey) return;

		if (event.deltaY < 0) {
			this.lockScroll = true;
		} else {
			//If scrolling down while at the bottom of the list, load next message
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);

			if (maxScroll < 0) {
				this.showNextPendingMessage(true);
				return;
			}

			const messRefs = el.querySelectorAll(".message");
			if (messRefs.length == 0) {
				//If hovering the chat before any message shows up, just load next message
				this.showNextPendingMessage(true);
				return;
			}
			const lastMessRef = messRefs[messRefs.length - 1];

			if ((maxScroll - el.scrollTop) <= (lastMessRef as HTMLDivElement).offsetHeight) {
				if (this.pendingMessages.length > 0) {
					event.preventDefault();
					event.stopPropagation();
					this.showNextPendingMessage(true);
				}
			}
		}
	}

	/**
	 * Scroll chat on mobile
	 */
	public onTouchMove(event: TouchEvent): void {
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);
		if (this.prevTouchMove) {
			const direction = event.touches[0].clientY - this.prevTouchMove.touches[0].clientY;
			//Pause if dragging up
			if (direction > 0) this.lockScroll = true;
			else this.lockScroll = Math.abs(el.scrollTop - maxScroll) != 0;
		}
		this.prevTouchMove = event;
	}

	/**
	 * Called 60 times/sec to scroll the list and load new messages
	 * if there are pending ones.
	 */
	public async renderFrame(ts: number): Promise<void> {
		if (this.disposed) return;
		requestAnimationFrame((ts) => this.renderFrame(ts));

		const timeScale = (60 / 1000) * Math.min(Math.min(1000 / 15, Math.max(.1, ts - this.prevTs)));
		this.prevTs = ts;

		const messageHolder	= this.$refs.chatMessageHolder as HTMLDivElement;
		if (!messageHolder) return;
		const holderHeight	= messageHolder.offsetHeight;
		const hasResized	= this.prevHeight != holderHeight;
		const maxScroll		= (messageHolder.scrollHeight - holderHeight);
		const messageItems	= messageHolder.getElementsByClassName("subHolder");
		
		if (messageItems.length === 0) return;//No message yet, just stop here
		const lastMessage	= messageItems[messageItems.length-1] as HTMLDivElement;
		const bottom		= lastMessage.offsetTop + lastMessage.offsetHeight;
		let easeValue		= hasResized? 1 : .3;
		if(hasResized) this.prevHeight = holderHeight;

		if (!this.lockScroll) {
			//On init the virtualscroll is -1, scroll to the bottom and init the virtualscroll
			if (this.virtualScrollY == -1) this.virtualScrollY = maxScroll;

			const dist = Math.abs(maxScroll - this.virtualScrollY);
			if (dist > 50 || this.pendingMessages.length > 0) {
				//Linear scroll if need to scroll by more than 10px
				this.virtualScrollY += Math.max(10, this.pendingMessages.length * 4) * timeScale;
			} else {
				//easeout scroll when reaching bottom
				this.virtualScrollY += (maxScroll - this.virtualScrollY) * easeValue * timeScale;
			}
			//Avoid virtual scroll to go beyond bottom
			if (this.virtualScrollY >= maxScroll - 2) {
				this.virtualScrollY = maxScroll;
			}
			messageHolder.scrollTop = this.virtualScrollY;
		}

		//If messages height is smaller than the holder height, move the holder to the bottom
		if (bottom < holderHeight) {
			if (this.holderOffsetY <= 0) easeValue = 1;
			this.holderOffsetY += (holderHeight - bottom - this.holderOffsetY) * easeValue;
			if (Math.abs(holderHeight - bottom - this.holderOffsetY) < 2) {
				this.holderOffsetY = holderHeight - bottom;
			}
			
			messageHolder.style.transform = "translateY(calc(" + this.holderOffsetY + "px - .25em))";
		} else if (this.holderOffsetY != 0) {
			this.holderOffsetY = 0;
			messageHolder.style.transform = "translateY(0)";
		}


		//Show next pending message if at the bottom and scroll isn't locked
		if (this.virtualScrollY >= maxScroll - 1
			&& !this.lockScroll
			&& this.pendingMessages.length > 0) {
			this.showNextPendingMessage();
		}else if(messageHolder.scrollTop < 50) {
			this.showPrevMessage();
		}
	}

	/**
	 * Get the next pending message and display it to the list
	 */
	private showNextPendingMessage(wheelOrigin = false): void {
		if (this.pendingMessages.length == 0) return;

		const prevCount = this.pendingMessages.length;
		const prevItem = this.pendingMessages[0];
		let message!: TwitchatDataTypes.ChatMessageTypes | undefined;
		try {
			do {
				message = this.pendingMessages.shift();
				if(message != undefined) {
					const index = this.lockedLiveMessages.findIndex(v=>v.id == message!.id);
					if(index > -1) {
						this.lockedLiveMessages.splice(index, 1);
					}
				}
			} while (this.pendingMessages.length > 0 && !this.shouldShowMessage(message!))
		} catch (error) {
			console.log(error);
			console.log(message);
			console.log(prevCount);
			console.log(prevItem);
		}

		if (!message) {
			if (this.pendingMessages.length > 0) {
				this.showNextPendingMessage(wheelOrigin);
			}
		} else {
			this.filteredMessages.push(message);
			if (this.filteredMessages.length > this.maxMessages) {
				this.filteredMessages = this.filteredMessages.slice(-this.maxMessages);
			}
			this.scrollToPrevMessage(wheelOrigin);
		}

	}

	/**
	 * Shows previous message when scrolling upward
	 */
	private async showPrevMessage():Promise<void> {
		if(!this.lockScroll) return;
		if(this.loadingOldMessage || this.filteredMessages.length === 0) return;
		
		const list = this.$store("chat").messages;

		this.loadingOldMessage = true;

		const popped	= this.filteredMessages.pop();
		const lastId	= this.filteredMessages[0].id;
		if(this.scrollUpIndexOffset == -1) {
			this.scrollUpIndexOffset = this.pendingMessages.length + this.filteredMessages.length;
		}

		let addNext = false;
		let messageAdded = false;
		let i = list.length - this.scrollUpIndexOffset - 1;
		
		for (; i > 0; i--) {
			let m = list[i];
			if(m.id == lastId) {
				addNext = true;
			}else if(addNext) {
				m = list[i-1];
				if(this.shouldShowMessage(m)) {
					this.scrollUpIndexOffset = list.length - i;
					this.filteredMessages.unshift(m);
					messageAdded = true;
					break;
				}
			}
		}

		if(messageAdded) {
			// await this.$nextTick();
			const messagesHolder = this.$refs.chatMessageHolder as HTMLDivElement;
			this.virtualScrollY = 51;
			messagesHolder.scrollTop = this.virtualScrollY;
			if(popped) this.pendingMessages.unshift( popped );
		}else if(popped){
			//We reached the first message of the history, stop there
			this.filteredMessages.push( popped );
		}
		this.loadingOldMessage = false;
	}

	/**
	 * Call this after adding a new message.
	 * Will scroll so the previous message is on the bottom of the list
	 * so the new message displays smoothly from the bottom of the screen
	 */
	private async scrollToPrevMessage(wheelOrigin = false): Promise<void> {
		await this.$nextTick();
		this.scrollUpIndexOffset = -1;
		const messagesHolder = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (messagesHolder.scrollHeight - messagesHolder.offsetHeight);

		const messRefs = messagesHolder.querySelectorAll(".messageHolder>.subHolder");
		if (messRefs.length == 0) return;
		const lastMessRef = messRefs[messRefs.length - 1] as HTMLDivElement;

		if (this.filteredMessages.length >= this.maxMessages) {
			this.counter++;
			if (this.counter % 2 == 0) {
				(this.$el as HTMLDivElement).classList.add("alternateOdd");
			} else {
				(this.$el as HTMLDivElement).classList.remove("alternateOdd");
			}
		}

		if (lastMessRef) {
			if (wheelOrigin) {
				//If scrolling down with mouse wheel while scrolling is locked, interpolate
				//scroll via tween as the renderFrame does nothing while scroll is locked
				gsap.killTweensOf(messagesHolder);
				this.virtualScrollY = messagesHolder.scrollTop = maxScroll;
			} else {
				const style = window.getComputedStyle(lastMessRef);
				const margin = parseFloat(style.marginBottom);
				// this.virtualScrollY = maxScroll - (lastMessRef.offsetHeight + margin);
				this.virtualScrollY =
				messagesHolder.scrollTop = maxScroll - (lastMessRef.offsetHeight + margin);
			}
		}

		//Check if last marked as read message is still there
		if (this.prevMarkedReadMessage) {
			if ((this.$refs["message_" + this.prevMarkedReadMessage.id] as Vue[]).length == 0) {
				this.prevMarkedReadMessage = null;
			}
		}
	}

	/**
	 * Avoids closing the conversation when rolling over it
	 */
	public async reopenLastConversation(): Promise<void> {
		clearTimeout(this.closeConvTimeout);
	}

	/**
	 * Avoids closing the conversation when rolling over it
	 */
	public async reopenLastHoverActions(): Promise<void> {
		clearTimeout(this.closeConvTimeout);
	}

	/**
	 * Called when asking to read a conversation
	 * Display the full conversation if any
	 */
	public async openConversation(event: MouseEvent, m: TwitchatDataTypes.MessageChatData): Promise<void> {
		if (this.lightMode || !m || (!m.answersTo && !m.answers)) return;

		this.conversationMode = true;

		if (m.answers.length > 0) {
			this.conversation = m.answers.concat();
			this.conversation.unshift(m);
		} else if (m.answersTo) {
			this.conversation = m.answersTo.answers.concat();
			this.conversation.unshift(m.answersTo);
		}
		this.openConversationHolder(m);
	}

	/**
	 * Called to open a user's messages history
	 */
	public async openUserHistory(event: MouseEvent, m: TwitchatDataTypes.MessageChatData): Promise<void> {
		if (this.lightMode || !m) return;

		clearTimeout(this.openConvTimeout);
		this.openConvTimeout = setTimeout(async () => {
			this.conversationMode = false;

			let messageList: TwitchatDataTypes.MessageChatData[] = [];
			for (let i = 0; i < this.$store("chat").messages.length; i++) {
				const mess = this.$store("chat").messages[i];
				if (mess.type == "message" && mess.user.id == m.user.id) {
					messageList.push(mess);
					if (messageList.length > 100) break;//Limit to 100 for perf reasons
				}
			}
			this.conversation = messageList;

			this.openConversationHolder(m);
		}, 350)
	}

	/**
	 * Opens up the conversation holder.
	 * Call this after making sure the messages are rendered
	 */
	private async openConversationHolder(m: TwitchatDataTypes.MessageChatData): Promise<void> {
		if (this.conversation.length == 0) return;
		await this.$nextTick();
		clearTimeout(this.closeConvTimeout);
		const holderBounds = this.$el.getBoundingClientRect();
		const messageHolder = (this.$refs["message_" + m.id] as HTMLDivElement[])[0];
		const messageBounds = messageHolder.getBoundingClientRect();
		const chatMessagesHolder = this.$refs.chatMessageHolder as HTMLDivElement;
		const conversationHolder = this.$refs.conversationHolder as HTMLDivElement;
		const convMessagesholder = this.$refs.conversationMessages as HTMLDivElement;

		this.conversationPos = Math.max(conversationHolder.getBoundingClientRect().height, messageBounds.top - holderBounds.top);

		//Scroll history to top
		convMessagesholder.scrollTop = convMessagesholder.scrollHeight;
		gsap.to(chatMessagesHolder, { opacity: .25, duration: .25 });
	}

	/**
	 * Called when rolling over a message
	 */
	public onEnterMessage(data: TwitchatDataTypes.ChatMessageTypes): void {
		this.hoveredMessage = data;

		clearTimeout(this.closeConvTimeout);
		const messageHolder = (this.$refs["message_" + data.id] as HTMLDivElement[])[0];
		const holderBounds = this.$el.getBoundingClientRect();
		const messageBounds = messageHolder.getBoundingClientRect();
		// const chatMessagesHolder	= this.$refs.chatMessageHolder as HTMLDivElement;
		// const conversationHolder	= this.$refs.conversationHolder as HTMLDivElement;
		// const convMessagesholder	= this.$refs.conversationMessages as HTMLDivElement;

		this.hoverActionsPos = messageBounds.top - holderBounds.top;

	}

	/**
	 * Called when rolling out of a message
	 * Close the conversation if any displayed
	 */
	public onLeaveMessage(): void {
		clearTimeout(this.openConvTimeout);
		if (this.conversation.length == 0 && !this.hoveredMessage) return;
		//Timeout avoids blinking when leaving the message but
		//hovering another one or the conversation window
		this.closeConvTimeout = setTimeout(() => {
			this.hoveredMessage = null;
			this.conversation = [];
			const mainHolder = this.$refs.chatMessageHolder as HTMLDivElement;
			gsap.to(mainHolder, { opacity: 1, duration: .25 });
		}, 0);
	}


	/**
	 * Called on a message is clicked
	 */
	public toggleMarkRead(m: TwitchatDataTypes.ChatMessageTypes, event?: MouseEvent): void {
		if (event) {
			let target = event.target as HTMLElement;
			do {
				if (target.tagName.toLowerCase() == "a") return;//Do not mark as read if clicked on a link
				target = target.parentNode as HTMLElement;
			}while(target != document.body);
		}
		
		//Do not mark as read if there's a selection
		if(window.getSelection()?.type === "Range") return;

		if (this.$store("params").features.markAsRead.value !== true) return;
		m.markedAsRead = !m.markedAsRead;
		if (this.prevMarkedReadMessage && this.prevMarkedReadMessage != m) {
			this.prevMarkedReadMessage.markedAsRead = false;
		}
		if (m.markedAsRead) {
			this.prevMarkedReadMessage = m;
			const div = (this.$refs["message_" + m.id] as HTMLDivElement[])[0];
			this.markedReadItem = div;
		} else {
			this.markedReadItem = null;
		}

		if (m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			const message = {
				channel: m.channel_id,
				message: m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER? "<not set for privacy reasons>" : m.message,
				user: {
					id: m.user.id,
					login: m.user.login,
					displayName: m.user.displayName,
				}
			}
			PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_READ, { manual: event != null, selected: m.markedAsRead === true, message });
		}
	}

	/**
	 * Sets a custom list of activities
	 */
	public setCustomActivities(activities:TwitchatDataTypes.ChatMessageTypes[]):void {
		this.filteredMessages = activities;
		this.lockedListRefresh = true;
		this.virtualScrollY = -1;//Forces utoscroll to bottom
	}

	/**
	 * Sets a custom list of activities
	 */
	public unlockListRefresh():void {
		this.lockedListRefresh = false;
		this.virtualScrollY = -1;//Forces utoscroll to bottom
		this.fullListRefresh();
	}

	/**
	 * Increments/Decrements the number of live messages displayed at the
	 * bottom when the chat is paused
	 */
	public incrementLockedLiveCount(count:number):void {
		let v = this.config.liveLockCount;
		if(!v || isNaN(v)) v = 3;
		v += count;
		if(v < 1) v = 1;
		if(v > 10) v = 10;
		this.config.liveLockCount = v;
		const list = this.pendingMessages;
		const finalList:TwitchatDataTypes.ChatMessageTypes[] = [];
		for (let i = this.pendingMessages.length-1; i > 0; i--) {
			const m = this.pendingMessages[i];
			if(this.shouldShowMessage(m)) {
				finalList.unshift(m);
				if(finalList.length === v) break;
			}
		}
		this.lockedLiveMessages = finalList
	}
}

</script>

<style scoped lang="less">
.messagelist {
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
			.subHolder:nth-child(even) {
				background-color: rgba(255, 255, 255, .025);
			}
		}
	}

	&.alternateOdd {
		.messageHolder {
			.subHolder:nth-child(odd) {
				background-color: rgba(255, 255, 255, .025);
			}
		}
	}

	.filters {
		position: absolute;
		right: 0;
		z-index: 2;
	}

	.filteredMessages {
		color: @mainColor_light;
		background-color: @mainColor_normal;
		padding: .5em;
		display: flex;
		align-items: center;
		margin-right: .5em;
		img {
			height: 1em;
		}
		span {
			flex-grow: 1;
			text-align: center;
			.icon {
				height: .7em;
				margin-right: .5em;
			}
		}
	}

	.messageHolder {
		overflow-y: auto;
		overflow-x: hidden;
		flex-grow: 1;

		.subHolder {
			position: relative;

			.message {
				position: relative;
				&.empty {
					font-style: italic;
					color: fade(@mainColor_light, 50);
					text-align: center;
					font-style: italic;
					width: 100%;
				}
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

	.lockedLiveHolder {
		// background: fade(@mainColor_normal, 20%);
		background: @mainColor_dark_light;
		border-top: 1px solid fade(#000, 50%);
		padding-top: .25em;

		.title {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			color: fade(@mainColor_light, 50%);
			font-size: .6em;
			.label {
				font-style: italic;
				margin: 0 .5em;
			}
			.button {
				.clearButton();
				width: 2em;
				color: @mainColor_light;
				background-color: fade(@mainColor_light, 20%);
				&:hover {
					background-color: fade(@mainColor_light, 30%) !important;
				}
			}
		}

		.subHolder:nth-child(odd) {
			background-color: rgba(255, 255, 255, .025);
		}
	}

	.noMessage {
		position: absolute;
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
			from {
				background-position-y: 800px;
			}

			to {
				background-position-y: -800px;
			}
		}

		@keyframes fade {
			from {
				opacity: 1;
			}

			to {
				opacity: .5;
			}
		}
	}

	.conversation {
		position: absolute;
		z-index: 2;
		background-color: @mainColor_dark;
		padding: 10px;
		left: 0;
		top: 0;
		width: 100%;
		max-width: 100%;
		box-shadow: 0px 0px 20px 0px rgba(0, 0, 0, 1);
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
			height: unset;
			line-height: 1.5em;
			overflow: unset;
			font-size: .7em;
			display: block;
			margin: auto;
			padding: 0 .25em;
		}
	}

	.hoverActions {
		font-size: var(--messageSize);
		position: absolute;
		z-index: 1;
		top: 0;
		right: 10px;
		transform: translateY(-100%);
	}
}
</style>