<template>
	<div :class="classes"
	@mouseenter="onHoverList"
	@mouseleave="onLeaveList"
	@wheel="onMouseWheel"
	@touchstart="onTouchStart"
	@touchmove="onTouchMove"
	:style="config.backgroundColor? {backgroundColor:config.backgroundColor} : {}">
		<MessageListFilter class="filters"
			ref="listFilter"
			:open="hovered"
			:config="config"
			@add="$emit('addColumn', config)"
			@change="fullListRefresh()"/>

		<div class="messageHolder" ref="chatMessageHolder">
			<div v-for="m in filteredMessagesDeduped" :key="m.id" class="subHolder" data-message :ref="'message_' + m.id" :id="'message_' + m.id + '_' + config.order">
				<div class="fake" v-if="m.fake === true && !$config.DEMO_MODE" v-tooltip="{content:$t('chat.fake_tag_tt'), placement:'right'}">{{$t("chat.fake_tag")}}</div>
				<MessageItem :messageData="m"
					@onRead="toggleMarkRead"
					@showConversation="(messageData:TwitchatDataTypes.MessageChatData)=>openConversation(messageData, m.id)"
					@showUserMessages="(messageData:TwitchatDataTypes.MessageChatData)=>openUserHistory(messageData, m.id)"
					@unscheduleMessageOpen="unscheduleHistoryOpen"
					@onOverMessage="onEnterMessage"
					@mouseleave="onLeaveMessage"
					@setCustomActivities="setCustomActivities"
					@showModal="(v: string) => $emit('showModal', v)"
					@openFilters="openFilters()"
					:colIndex="config.order"
					:lightMode="lightMode"
					:childrenList="messageIdToChildren[m.id]"
				/>

			</div>

			<div key="empty" class="subHolder" ref="message_0" v-if="filteredMessagesDeduped?.length===0">
				<div class="message empty">{{ $t("chat.no_message") }}</div>
			</div>
		</div>

		<teleport :to="markedReadItem" v-if="markedReadItem">
			<div class="markRead"></div>
		</teleport>

		<teleport :to="selectedItem" v-if="selectedItem">
			<div :class="selectedClasses"></div>
		</teleport>

		<teleport :to="selectedItem" v-if="selectedItem">
			<div class="incompatibleSelection" ref="incompatibleSelection">⛔</div>
		</teleport>

		<div class="locked" ref="locked" v-if="!lightMode && lockScroll" @click.stop="unPause">
			<span v-if="lockScroll">{{ $t("chat.paused") }}</span>
			<span v-if="pendingMessages.length > 0">(+{{ pendingMessages.length }})</span>
		</div>

		<div class="lockedLiveHolder" v-if="!lightMode && lockScroll && lockedLiveMessages.length > 0">
			<div class="subHolder" v-for="m in lockedLiveMessages"
			:key="m.id" :ref="'message_live_' + m.id">
				<div class="fake" v-if="m.fake === true" v-tooltip="$t('chat.fake_tag_tt')">{{$t("chat.fake_tag")}}</div>
				<MessageItem :messageData="m"
					disableConversation
				/>
			</div>
			<div class="footer">
				<button :aria-label="$t('chat.live_chat_less_aria')"
					:disabled="config.liveLockCount == 1"
					@click="incrementLockedLiveCount(-1)"><Icon name="minus" /></button>

				<span class="label">{{ $t("chat.live_chat") }}</span>

				<button :aria-label="$t('chat.live_chat_more_aria')"
					:disabled="config.liveLockCount == 10 || config.liveLockCount>=pendingMessages.length"
					@click="incrementLockedLiveCount(1)"><Icon name="add" /></button>
			</div>
		</div>

		<button class="filteredMessages" v-if="customActivitiesDisplayed" @click="unlockListRefresh()">
			<img src="@/assets/icons/back.svg" alt="back">
			<span><img src="@/assets/icons/train.svg" alt="train" class="icon">{{$t('chat.hype_train.filtered_title')}}</span>
		</button>

		<div class="conversation" ref="conversationHolder" v-if="conversation.length > 0"
			:style="conversationStyles"
			@mouseenter="reopenLastConversation"
			@mouseleave="onLeaveMessage"
			@wheel.stop="">
			<div class="head">
				<h1 v-if="conversationMode">{{ $t("chat.conversation") }}</h1>
				<h1 v-if="!conversationMode">{{ $t("chat.history", {USER: conversation[0].user.displayName}) }}</h1>
				<ClearButton @click="onLeaveMessage" />
			</div>
			<div class="messages" ref="conversationMessages">
				<MessageItem class="message"
					v-for="m in conversation" :key="m.id"
					:messageData="m"
					disableConversation
				/>
			</div>
			<div class="ctas">
				<TTButton v-if="$store.groq.connected && !showSummaryForm"
					@click="showSummaryForm = true"
					v-newflag="{date:$config.NEW_FLAGS_DATE_V16, id:'chat_conversation_groq'}"
					icon="groq"
					small>{{ $t("groq.summarize_bt") }}</TTButton>

				<GroqSummaryFilterForm v-if="showSummaryForm"
					mode="all"
					:messageList="conversation"
					@close="showSummaryForm = false" />
			</div>
		</div>

		<div v-if="showLoadingGradient && !lightMode" claconformess="noMessage">
			<div class="gradient"></div>
		</div>
	</div>
</template>

<script lang="ts">
import EventBus from '@/events/EventBus';
import GlobalEvent from '@/events/GlobalEvent';
import TwitchatEvent from '@/events/TwitchatEvent';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import PublicAPI from '@/utils/PublicAPI';
import Utils from '@/utils/Utils';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { watch } from '@vue/runtime-core';
import { gsap } from 'gsap/gsap-core';
import type { CSSProperties } from 'vue';
import {toNative,  Component, Prop, Vue } from 'vue-facing-decorator';
import TTButton from '../TTButton.vue';
import ClearButton from '../ClearButton.vue';
import MessageItem from './MessageItem.vue';
import MessageListFilter, {MessageListFilter as MessageListFilterClass} from './components/MessageListFilter.vue';
import { RoughEase } from 'gsap/all';
import { Linear } from 'gsap/all';
import GroqSummaryFilterForm from '../GroqSummaryFilterForm.vue';
import YoutubeHelper from '@/utils/youtube/YoutubeHelper';

@Component({
	components: {
		TTButton,
		MessageItem,
		ClearButton,
		MessageListFilter,
		GroqSummaryFilterForm,
	},
	emits: ["showModal", 'addColumn']
})
class MessageList extends Vue {

	@Prop({ type: Boolean, default: false })
	public lightMode!: boolean;
	@Prop
	public filterId!: string;
	@Prop
	public config!: TwitchatDataTypes.ChatColumnsConfig;

	public filteredMessages: TwitchatDataTypes.ChatMessageTypes[] = [];
	public pendingMessages: TwitchatDataTypes.ChatMessageTypes[] = [];
	public lockedLiveMessages: TwitchatDataTypes.ChatMessageTypes[] = [];
	public conversation: TwitchatDataTypes.MessageChatData[] = [];
	public hovered = false;
	public lockScroll = false;
	public showSummaryForm = false;
	public customActivitiesDisplayed = false;
	public showLoadingGradient = false;
	public conversationMode = true;//Used to change title between "History"/"Conversation"
	public markedReadItem: HTMLDivElement | null = null;
	public selectedItem: HTMLDivElement | null = null;
	public selectedMessage: TwitchatDataTypes.ChatMessageTypes | null = null;
	public messageIdToChildren: {[key:string]:TwitchatDataTypes.ChatMessageTypes[]} = {};

	private maxMessages:number = 50;
	private markedAsReadDate:number = 0;
	private selectionDate:number = 0;
	private selectionTimeout:number = -1;
	private virtualMessageHeight:number = 32;
	private prevTs = 0;
	private counter = 0;
	private disposed = false;
	private forceScrollDown = false;
	private loadingOldMessage = false;
	private scrollUpIndexOffset = -1;
	private holderOffsetY = -1;
	private virtualScrollY = -1;
	private updateDebounce = -1;
	private conversationPos = 0;
	private prevHeight = 0;
	private openConvTimeout!: number;
	private closeConvTimeout!: number;
	private prevTouchMove!: TouchEvent;
	private touchDragOffset: number = 0;
	private filteredChanIDs: {[uid:string]:boolean}|null = null;
	private publicApiEventHandler!: (e: TwitchatEvent<{ count?: number, scrollBy?: number, col?:number, duration?:number }>) => void;
	private deleteMessageHandler!: (e: GlobalEvent) => void;
	private addMessageHandler!: (e: GlobalEvent) => void;
	private reloadListHandler!: (e: GlobalEvent) => void;

	public get classes(): string[] {
		let res = ["messagelist"];
		if (this.lightMode) res.push("lightMode");
		if (this.lockScroll) res.push("lockScroll");
		if (this.$store.params.appearance.alternateMessageBackground.value !== false) res.push("alertnateBackground");
		return res;
	}

	public get conversationStyles(): CSSProperties {
		return { top: this.conversationPos + "px" }
	}

	public get selectedClasses():string[] {
		let res = ["selected"];
		if(this.selectedMessage?.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) res.push("noSelect");
		return res;
	}

	public get filteredMessagesDeduped(): TwitchatDataTypes.ChatMessageTypes[] {
		const res:TwitchatDataTypes.ChatMessageTypes[] = [];
		const done:{[key:string]:boolean} = {};
		for (let i = 0; i < this.filteredMessages.length; i++) {
			const element = this.filteredMessages[i];
			if(done[element.id] === true) continue;
			done[element.id] = true;
			res.push(element);
		}
		return res;
	}

	public beforeUpdate(): void {
		// console.log("Update list");
	}

	public async beforeMount(): Promise<void> {

		//If text size is changed, scroll to bottom of tchat
		watch(() => this.$store.params.appearance.defaultSize.value, async () => {
			await this.$nextTick();
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			el.scrollTop = this.virtualScrollY = maxScroll;
			this.computeMaxMessageCount();
		});

		watch(()=>this.$store.params.appearance.sharedChatHide.value, async () => this.fullListRefresh());
		watch(()=>this.$store.params.features.mergeConsecutive.value, async () => this.fullListRefresh());
		watch(()=>this.$store.params.features.mergeConsecutive_maxSize.value, async () => this.fullListRefresh());
		watch(()=>this.$store.params.features.mergeConsecutive_maxSizeTotal.value, async () => this.fullListRefresh());
		watch(()=>this.$store.params.features.mergeConsecutive_minDuration.value, async () => this.fullListRefresh());
		watch(()=>this.$store.stream.connectedTwitchChans, ()=> this.rebuildChannelIdsHashmap(), {deep:true});
		watch(()=>this.$store.tiktok.connected, ()=> this.rebuildChannelIdsHashmap(), {deep:true});
		watch(()=>YoutubeHelper.instance.connected, ()=> this.rebuildChannelIdsHashmap(), {deep:true});
		watch(()=>this.config, ()=> this.rebuildChannelIdsHashmap(), {deep:true});

		this.publicApiEventHandler = (e) => this.onPublicApiEvent(e);
		this.deleteMessageHandler = (e: GlobalEvent) => this.onDeleteMessage(e);
		this.addMessageHandler = (e: GlobalEvent) => this.onAddMessage(e);
		this.reloadListHandler = (e: GlobalEvent) => this.fullListRefresh(e.type == GlobalEvent.RELOAD_MESSAGES);

		EventBus.instance.addEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
		EventBus.instance.addEventListener(GlobalEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		EventBus.instance.addEventListener(GlobalEvent.PIN_MESSAGE, this.reloadListHandler);
		EventBus.instance.addEventListener(GlobalEvent.UNPIN_MESSAGE, this.reloadListHandler);
		EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, this.reloadListHandler);
		EventBus.instance.addEventListener(GlobalEvent.UNTRACK_USER, this.reloadListHandler);
		EventBus.instance.addEventListener(GlobalEvent.RELOAD_MESSAGES, this.reloadListHandler);

		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SELECT, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_BOTTOM, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_CANCEL, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_DELETE, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_BAN, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SELECT_CHOOSING_ACTION, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_PIN, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_HIGHLIGHT, this.publicApiEventHandler);
		PublicAPI.instance.addEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_SHOUTOUT, this.publicApiEventHandler);

		this.fullListRefresh();
		this.rebuildChannelIdsHashmap();

		this.prevTs = Date.now() - 1000 / 60;
		this.renderFrame(Date.now());
	}

	public beforeUnmount(): void {
		this.disposed = true;

		EventBus.instance.removeEventListener(GlobalEvent.ADD_MESSAGE, this.addMessageHandler);
		EventBus.instance.removeEventListener(GlobalEvent.DELETE_MESSAGE, this.deleteMessageHandler);
		EventBus.instance.removeEventListener(GlobalEvent.PIN_MESSAGE, this.reloadListHandler);
		EventBus.instance.removeEventListener(GlobalEvent.UNPIN_MESSAGE, this.reloadListHandler);
		EventBus.instance.removeEventListener(GlobalEvent.TRACK_USER, this.reloadListHandler);
		EventBus.instance.removeEventListener(GlobalEvent.UNTRACK_USER, this.reloadListHandler);
		EventBus.instance.removeEventListener(GlobalEvent.RELOAD_MESSAGES, this.reloadListHandler);

		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SELECT, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_READ, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_READ_ALL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_PAUSE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_UNPAUSE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_BOTTOM, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_UP, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SCROLL_DOWN, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_CANCEL, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_DELETE, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_BAN, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SELECT_CHOOSING_ACTION, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_PIN, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_HIGHLIGHT, this.publicApiEventHandler);
		PublicAPI.instance.removeEventListener(TwitchatEvent.CHAT_FEED_SELECT_ACTION_SHOUTOUT, this.publicApiEventHandler);
	}

	/**
	 * Called when message list is hovered.
	 * Pause the chat if requested
	 */
	public async onHoverList(): Promise<void> {
		if(this.hovered) return;

		this.hovered = true;
		if (this.lightMode || !this.$store.params.features.lockAutoScroll.value) return;
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
		if(!this.hovered) return;

		this.hovered = false;
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);

		if (this.pendingMessages.length == 0
		&& el.scrollTop >= maxScroll - 50
		&& !this.customActivitiesDisplayed) {
			this.lockScroll = false;
			this.virtualScrollY = -1;//Forces autoscroll to bottom
		}
	}

	/**
	 * Opens up the message filters
	 */
	public openFilters(): void {
		(this.$refs.listFilter as MessageListFilterClass).openFilters();
	}

	/**
	 * Cleans up all messages and rebuild the list
	 */
	public fullListRefresh(scrollToBottom:boolean = true): void {
		if(this.customActivitiesDisplayed) return;

		clearTimeout(this.updateDebounce);
		this.updateDebounce = window.setTimeout(async () => {
			if(!this.lockScroll) {
				this.pendingMessages = [];
				this.lockedLiveMessages = [];
				this.messageIdToChildren = {};
				this.scrollUpIndexOffset = -1;
			}

			// const s = Date.now();

			const sChat = StoreProxy.chat;
			const messages = sChat.messages;

			let result: TwitchatDataTypes.ChatMessageTypes[] = [];
			let index = messages.length - 1 - Math.max(0, this.scrollUpIndexOffset - this.maxMessages);
			//Reset merged children references
			this.messageIdToChildren = {};

			for (; index >= 0; index--) {

				const m = messages[index];
				if (await this.shouldShowMessage(m)) {
					//Merge messages if necessary
					if(await this.mergeWithPrevious(m, index-1, messages)) continue;

					//Make sure message isn't pending for display
					//This sometimes happens when stressing the list... Probably due
					//the fact that the reference point ("scrollUpIndexOffset") is based
					//on the top of the list instead of its bottom. (this needs refactoring)
					const pIndex = this.pendingMessages.findIndex(v=>v.id == m.id);
					if(pIndex > -1) {
						this.pendingMessages.splice(pIndex, 1);
					}

					result.unshift(m);
					// result.push(m);
					if (result.length == this.maxMessages) break;
				}
			}

			this.filteredMessages = result;

			// const e = Date.now();
			// console.log("full refresh duration:", e-s);

			await this.$nextTick();

			//Scroll to bottom
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);
			if(this.lockScroll) {
				if(scrollToBottom) {
					this.virtualScrollY = el.scrollTop = maxScroll - 10;
				}
			}else if(scrollToBottom){
				this.forceScrollDown = true;
				window.setTimeout(()=> {
					this.forceScrollDown = false;
				}, 1000);
			}
			// this.lockScroll = false;
			this.replaceReadMarkerAndSelector();
		}, 50)
	}

	/**
	 * Rebuilds the hashmap used to quickly check if a message
	 * should be displayed on this column or not based on its
	 * channel source.
	 */
	private rebuildChannelIdsHashmap() {
		//Check for all valid IDs depending on the connected platforms
		const validIds = this.$store.stream.connectedTwitchChans.concat().map(v=>v.user.id);
		if(this.$store.auth.youtube.user) validIds.push(this.$store.auth.youtube.user.id);
		if(this.$store.tiktok.connected) validIds.push("tiktok");
		validIds.push(this.$store.auth.twitch.user.id);

		//Only keep configured entries that match a valid channel ID
		const chanIds:{[uid:string]:boolean} = {};
		Object.keys(this.config.channelIDs || {})
		.filter(id=>validIds.includes(id))
		.forEach(id => {
			chanIds[id] = true;
		});

		this.filteredChanIDs = Object.keys(chanIds).length > 0? chanIds : null;
		this.fullListRefresh();
	}

	/**
	 * Returns if a message should be displayed or not
	 * @param m
	 */
	private async shouldShowMessage(m: TwitchatDataTypes.ChatMessageTypes): Promise<boolean> {
		//Hide shared chat messages if requested
		if(m.twitchSharedChat === true && m.channelSource && this.$store.params.appearance.sharedChatHide.value === true) {
			return false;
		}

		if(this.lightMode) {
			//If in light mode, only allow normal chat messages that are not deleted/moded/...
			return m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				&& !m.automod
				&& !m.deleted
				&& !m.twitch_automod
				&& !m.twitch_isSuspicious
				&& !m.twitch_isRestricted
				&& !m.user.is_blocked;
		}

		//Avoid adding any new message when showing a custom list of emssage (ex: hype train filtered activities)
		if(this.customActivitiesDisplayed) return false;
		//Check if this message should be displayed on this column
		const colValid = Array.isArray(m.col)?
							m.col.length == 0 || m.col.includes(this.config.order)
						:
							m.col == undefined || m.col == this.config.order || m.col < 0;
		if(!colValid) return false;

		//Filter by channel ID if necessary
		if(this.filteredChanIDs) {
			const chanId = m.platform == "tiktok"? "tiktok" : m.channel_id;
			if(this.filteredChanIDs[chanId] !== true) return false;
		}

		//If message is deleted, keep it only if requested to show messages AND deleted messages
		if (m.deleted) {
			return this.config.messageFilters.deleted === true && this.config.filters.message === true;
		}

		switch (m.type) {
			case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
				if(this.config.filters.message === false) return false;

				if(this.$store.users.customBadgeList.length > 0) {

					//If requested mandatory badges, check if user has it
					if(this.config.mandatoryBadges_flag && (this.config.mandatoryBadges || [])?.length > 0) {
						const badges = this.$store.users.customUserBadges[m.user.id];
					if(!badges) return false;
						for (let i = 0; i < this.config.mandatoryBadges!.length; i++) {
							const badge = this.config.mandatoryBadges![i];
							if(badges.find(b => b.id == badge)) return true;
						}
					}

					//If requested forbidden badges, check if user has it
					if(this.config.forbiddenBadges_flag && (this.config.forbiddenBadges || [])?.length > 0) {
						const badges = this.$store.users.customUserBadges[m.user.id];
						if(badges) {
							for (let i = 0; i < this.config.forbiddenBadges!.length; i++) {
								const badge = this.config.forbiddenBadges![i];
								if(badges.find(b => b.id == badge)) return false;
							}
						}
					}
				}

				//Force tracked users if requested
				if (m.user.is_tracked && this.config.messageFilters.tracked) {
					return true;
				}

				//Force pinned messages if requested
				if (m.is_saved && this.config.messageFilters.pinned) {
					return true;
				}

				//Ignore specific users
				if (this.config.userBlockList && m.user.displayNameOriginal.length > 0
				&& this.config.userBlockList.map(v=>v.toLowerCase()).includes(m.user.login.toLowerCase())) {
					return false;
				}

				//Ignore specific commands
				if (this.config.messageFilters.commands === true && this.config.commandsBlockList.length > 0) {
					const cleanMess = m.message.trim().toLowerCase();
					for (let i = 0; i < this.config.commandsBlockList.length; i++) {
						const cmd = this.config.commandsBlockList[i];
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
				return this.config.filters.whisper === true && await Utils.checkPermissions(this.config.whispersPermissions, m.user, m.channel_id);
			}

			case TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT: {
				return this.config.filters.message === true && this.config.messageFilters.viewers === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB:
			case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION:
			case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT:
			case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
				return this.config.filters.subscription === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION:
			case TwitchatDataTypes.TwitchatMessageType.REWARD: {
				return this.config.filters.reward === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.PREDICTION:{
				return this.config.filters.prediction === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.POLL: {
				return this.config.filters.poll === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER:
			case TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT:
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

			case TwitchatDataTypes.TwitchatMessageType.TIMER: {
				return this.config.filters.countdown === true && m.stopped;
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

			case TwitchatDataTypes.TwitchatMessageType.BAN:
			case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_BAN: {
				return this.config.filters.ban === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNBAN: {
				return this.config.filters.unban === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST: {
				return this.config.filters.unban_request !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.PINNED:
			case TwitchatDataTypes.TwitchatMessageType.UNPINNED: {
				return this.config.filters.pinned === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE: {
				return this.config.filters.private_mod_message !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.WARN_CHATTER:
			case TwitchatDataTypes.TwitchatMessageType.WARN_ACKNOWLEDGE:
			case TwitchatDataTypes.TwitchatMessageType.BLOCKED_TERMS:
			case TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN:
			case TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT:
			case TwitchatDataTypes.TwitchatMessageType.CONNECT:
			case TwitchatDataTypes.TwitchatMessageType.DISCONNECT:
			case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
				return this.config.filters.notice === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE:
			case TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE: {
				return this.config.filters.stream_online === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
				return this.config.filters.shoutout === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD: {
				if(m.adType == TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK) return this.config.filters.twitchat_ad === true;
				//Force other ad types to first columns
				return this.config.order == 0;
			}

			case TwitchatDataTypes.TwitchatMessageType.ROOM_SETTINGS: {
				return this.config.filters.message === true && this.config.messageFilters.viewers === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.CLIP_PENDING_PUBLICATION: {
				return this.config.filters.message === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK: {
				return this.config.filters.user_watch_streak !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.MUSIC_START: if(!m.userOrigin) return false;
			case TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE: {
				return this.config.filters.music_added_to_queue == true;
			}

			case TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST:
			case TwitchatDataTypes.TwitchatMessageType.HISTORY_SPLITTER: {
				return true;
			}

			case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START: {
				return this.config.filters.ad_break_start_chat === true;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMLABS: {
				return this.config.filters.streamlabs !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS: {
				return this.config.filters.streamelements !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.KOFI: {
				return this.config.filters.kofi !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIPEEE: {
				return this.config.filters.tipeee !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.TILTIFY: {
				return this.config.filters.tiltify !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.PATREON: {
				return this.config.filters.patreon !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.CUSTOM: {
				//Column filter is made earlier
				return true;
			}

			case TwitchatDataTypes.TwitchatMessageType.SUSPENDED_TRIGGER_STACK:
			case TwitchatDataTypes.TwitchatMessageType.HATE_RAID: {
				return true;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT: {
				return this.config.filters.tiktok_gift !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE: {
				return this.config.filters.tiktok_like !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE: {
				return this.config.filters.tiktok_share !== false;
			}

			case TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION: {
				return this.config.filters.twitch_charity_donation !== false;
			}

			default: return false;
		}
	}

	/**
	 * Called when a message is added
	 */
	private async onAddMessage(e: GlobalEvent): Promise<void> {
		if(this.customActivitiesDisplayed) return;

		// const el = this.$refs.chatMessageHolder as HTMLDivElement;
		// const maxScroll = (el.scrollHeight - el.offsetHeight);
		const m = e.data as TwitchatDataTypes.ChatMessageTypes;
		if (!await this.shouldShowMessage(m)) return;

		if(await this.mergeWithPrevious(m)) return;

		//If scrolling is locked or there are still messages pending,
		//add the new message to the pending list
		if (this.lockScroll) {
			this.pendingMessages.push(m);
			if(this.$store.params.features.liveMessages.value === true) {
				//add to "live message" list if allowed
				this.lockedLiveMessages.push(m);
				this.lockedLiveMessages = this.lockedLiveMessages.slice(-(this.config.liveLockCount ?? 3));//Only keep last N messages
			}

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
		//Force delete right now to avoid duplicate IDs if it's added
		//back before the fullListRefresh().
		//If a message occurence count is incremented, the message is deleted
		//then added back. Deleting is asynchronous bnut adding is synchronous
		//which opens possibilities for a message to be twice on the list
		const data = e.data as {message:TwitchatDataTypes.ChatMessageTypes, force:boolean};
		for (let i = this.filteredMessages.length - 1; i >= 0; i--) {
			const m = this.filteredMessages[i];
			if (m.id == data.message.id) {
				this.filteredMessages.splice(i,1);
				break;
			}
		}

		for (let i = this.lockedLiveMessages.length - 1; i >= 0; i--) {
			const m = this.lockedLiveMessages[i];
			if (m.id == data.message.id) {
				this.lockedLiveMessages.splice(i,1);
				break;
			}
		}
		this.fullListRefresh(false);
	}

	/**
	 * Called when requesting an action from the public API
	 */
	private async onPublicApiEvent(e:TwitchatEvent<{ count?: number, scrollBy?: number, col?:number, duration?:number }>): Promise<void> {
		const data = e.data!;
		let count = (data?.count && !isNaN(data.count as number)) ? data.count : 0;
		let scrollBy = (data?.scrollBy && !isNaN(data.scrollBy as number)) ? data.scrollBy : 100;
		if(typeof scrollBy == "string") scrollBy = parseInt(scrollBy);
		const col = (data.col || 0);
		if(col != this.config.order) return;

		switch (e.type) {
			case TwitchatEvent.CHAT_FEED_READ: {
				if (count === 0) count = 1;
				const messageList = this.$store.chat.messages;
				let offset = messageList.length-1;
				let currentMessageIndex = -1;
				if(this.markedAsReadDate === 0) this.markedAsReadDate = Date.now();

				//Search for first message marked as read
				for (let i = offset; i >= 0; i--) {
					const m = messageList[i];
					if(m.date <= this.markedAsReadDate && await this.shouldShowMessage(m)) {
						currentMessageIndex = i;
						break;
					}
				}

				if(currentMessageIndex > -1) {
					//Moving read mark upward
					if(count < 0) {
						for (let i = currentMessageIndex; i > 0; i--) {
							const m = messageList[i];
							if(await this.shouldShowMessage(m)) count ++;
							if(count === 1) {
								this.markedAsReadDate = m.date;
								this.replaceReadMarkerAndSelector(true);
								break;
							}
						}

					//Moving read mark downward
					}else if(count > 0){
						for (let i = currentMessageIndex; i < messageList.length; i++) {
							const m = messageList[i];
							if(await this.shouldShowMessage(m)) count --;
							if(count === -1) {
								this.markedAsReadDate = m.date;
								this.replaceReadMarkerAndSelector(true);
								break;
							}
						}
					}
				}

				break;
			}

			case TwitchatEvent.CHAT_FEED_READ_ALL: {
				//Read all case
				if (count === 0 || count > this.filteredMessages.length - 1) {
					count = this.filteredMessages.length - 1;
				}
				if (count < 0) count = 0;
				const m = this.filteredMessages[count];
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

			case TwitchatEvent.CHAT_FEED_SCROLL: {
				this.lockScroll = true;
				const messagesHolder = this.$refs.chatMessageHolder as HTMLDivElement;
				const maxScroll = (messagesHolder.scrollHeight - messagesHolder.offsetHeight);
				scrollBy *= this.virtualMessageHeight;
				this.virtualScrollY += scrollBy;
				if(this.virtualScrollY < 0) this.virtualScrollY = 0;
				if(this.virtualScrollY > maxScroll) this.virtualScrollY = maxScroll;

				messagesHolder.scrollBy(0, scrollBy);
				await this.onScroll(scrollBy);
				break;
			}

			case TwitchatEvent.CHAT_FEED_SCROLL_UP: {
				this.lockScroll = true;
				const el = this.$refs.chatMessageHolder as HTMLDivElement;
				gsap.to(el, { scrollTop: el.scrollTop - scrollBy, duration: .5, ease: "power1.inOut" });
				break;
			}

			case TwitchatEvent.CHAT_FEED_SCROLL_DOWN: {
				const messagesHolder = this.$refs.chatMessageHolder as HTMLDivElement;
				const maxScroll = (messagesHolder.scrollHeight - messagesHolder.offsetHeight);
				const vScroll = messagesHolder.scrollTop + scrollBy;

				// if(vScroll > maxScroll - 2) {
				// 	messagesHolder.scrollTop = maxScroll;
				// 	await this.onScroll(scrollBy);
				// 	if(this.pendingMessages.length == 0) {
				// 		this.unPause();
				// 	}
				// }else{
					gsap.to(messagesHolder, {
						scrollTop: vScroll, duration: .5, ease: "power1.inOut", onUpdate:()=>{
						}, onComplete: () => {
							if(Math.abs(messagesHolder.scrollTop - maxScroll) < 10){
								if (this.pendingMessages.length === 0) this.unPause();
							}
						}
					});
				// }
				break;
			}

			case TwitchatEvent.CHAT_FEED_SCROLL_BOTTOM: {
				this.fullListRefresh();
				this.lockScroll = false;
				break;
			}

			case TwitchatEvent.CHAT_FEED_SELECT: {
				const messageList = this.$store.chat.messages;
				let offset = messageList.length-1;
				let currentMessageIndex = -1;
				let add = 1;
				if(this.selectionDate === 0) {
					this.selectionDate = Date.now();
					add = 0;
				}

				//Search for a message selected
				for (let i = offset; i >= 0; i--) {
					const m = messageList[i];
					if(m.date <= this.selectionDate && await this.shouldShowMessage(m)) {
						currentMessageIndex = i;
						break;
					}
				}

				if(currentMessageIndex > -1) {
					//Moving selection upward
					if(count < 0) {
						for (let i = currentMessageIndex; i > 0; i--) {
							const m = messageList[i];
							if(await this.shouldShowMessage(m)) count ++;
							if(count === add) {
								this.selectionDate = m.date;
								this.replaceReadMarkerAndSelector();
								break;
							}
						}

					//Moving selection downward
					}else if(count > 0){
						for (let i = currentMessageIndex; i < messageList.length; i++) {
							const m = messageList[i];
							if(await this.shouldShowMessage(m)) count --;
							if(count === -add) {
								this.selectionDate = m.date;
								this.replaceReadMarkerAndSelector();
								break;
							}
						}
					}
					clearTimeout(this.selectionTimeout);
					this.selectionTimeout = window.setTimeout(()=>{
						this.selectedItem = null;
						this.selectedMessage = null;
						this.selectionDate = 0;
						PublicAPI.instance.broadcast(TwitchatEvent.CHAT_FEED_SELECT_ACTION_CANCEL);
					}, 5000);
				}
				break;
			}

			case TwitchatEvent.CHAT_FEED_SELECT_ACTION_CANCEL: {
				this.selectedItem = null;
				this.selectedMessage = null;
				this.selectionDate = 0;
				break;
			}

			case TwitchatEvent.CHAT_FEED_SELECT_ACTION_DELETE: {
				if(!this.selectedMessage || this.selectedMessage.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					this.showSelectionError();
					return;
				}
				this.$store.chat.deleteMessage(this.selectedMessage);
				this.selectedItem = null;
				this.selectedMessage = null;
				this.selectionDate = 0;
				break;
			}

			case TwitchatEvent.CHAT_FEED_SELECT_ACTION_BAN: {
				if(!this.selectedMessage || this.selectedMessage.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					this.showSelectionError();
					return;
				}
				TwitchUtils.banUser(this.selectedMessage.user, this.selectedMessage.channel_id, data.duration);
				this.selectedItem = null;
				this.selectedMessage = null;
				this.selectionDate = 0;
				break;
			}

			case TwitchatEvent.CHAT_FEED_SELECT_ACTION_PIN: {
				if(!this.selectedMessage || this.selectedMessage.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					this.showSelectionError();
					return;
				}
				if(this.selectedMessage.is_saved !== true) {
					this.$store.chat.saveMessage(this.selectedMessage);
				}else{
					this.$store.chat.unsaveMessage(this.selectedMessage);
				}
				break;
			}

			case TwitchatEvent.CHAT_FEED_SELECT_ACTION_HIGHLIGHT: {
				if(!this.selectedMessage || this.selectedMessage.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					this.showSelectionError();
					return;
				}
				this.$store.chat.highlightChatMessageOverlay(this.selectedMessage);
				break;
			}

			case TwitchatEvent.CHAT_FEED_SELECT_ACTION_SHOUTOUT: {
				if(!this.selectedMessage || this.selectedMessage.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
					this.showSelectionError();
					return;
				}
				this.$store.users.shoutout(this.selectedMessage.channel_id, this.selectedMessage.user);
				break;
			}

			case TwitchatEvent.CHAT_FEED_SELECT_CHOOSING_ACTION: {
				clearTimeout(this.selectionTimeout);
				this.selectionTimeout = window.setTimeout(()=>{
					this.selectedItem = null;
					this.selectedMessage = null;
					this.selectionDate = 0;
				}, 5000);
				break;
			}

		}
	}

	/**
	 * Catch up all pending messages
	 */
	public async unPause(): Promise<void> {
		this.fullListRefresh();
		this.lockScroll = false;

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
		if (event.shiftKey) return;

		await this.onScroll(event.deltaY, event);
	}

	/**
	 * Called when scrolling the list
	 */
	private async onScroll(amount:number, event?:WheelEvent):Promise<void> {
		if (this.lightMode) return;

		if (amount < 0) {
			//Scrolling up, lock auto scroll (updates)
			this.lockScroll = true;
		} else {
			//If scrolling down while at the bottom of the list, load next message
			const el = this.$refs.chatMessageHolder as HTMLDivElement;
			const maxScroll = (el.scrollHeight - el.offsetHeight);

			const messRefs = el.querySelectorAll(".message");
			if (messRefs.length == 0) {
				//If scrolling the chat down before any message shows up, just load next message
				await this.showNextPendingMessage();
				return;
			}

			const lastMessRef = messRefs[messRefs.length - 1];
			//If scrolling down while last item visible on screen
			if ((maxScroll - el.scrollTop) <= (lastMessRef as HTMLDivElement).offsetHeight) {
				if (this.pendingMessages.length > 0) {
					if(event) {
						event.preventDefault();
						event.stopPropagation();
					}
					await this.showNextPendingMessage();
				}
			}
		}
	}

	/**
	 * Start scrolling chat on mobile
	 * Used to set a drag offset to avoid glitchy chat scroll
	 * when actually trying to scroll horizontally
	 */
	public onTouchStart(event: TouchEvent): void {
		this.touchDragOffset = event.touches[0].clientY;
	}

	/**
	 * Scroll chat on mobile
	 */
	public onTouchMove(event: TouchEvent): void {
		const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const maxScroll = (el.scrollHeight - el.offsetHeight);
		if (this.prevTouchMove) {
			const direction = event.touches[0].clientY - this.prevTouchMove.touches[0].clientY;
			const dragOffset = event.touches[0].clientY - this.touchDragOffset;
			//Pause chat if dragging it upward for at least 50px
			if (direction > 0 && dragOffset > 50) this.lockScroll = true;
			else {
				const lock = Math.abs(el.scrollTop - maxScroll) != 0;
				if(!lock) {
					this.unlockListRefresh();
				}else{
					this.lockScroll = true;
				}
			}
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
		let easeValue		= hasResized? 1 : .2;

		if(this.forceScrollDown) {
			this.virtualScrollY = maxScroll;
		}

		//Compute scroll offset before/after which point prev/next messages
		//should be loaded
		const scrollPageOffset = Math.min(this.virtualMessageHeight * 5, maxScroll*.25);

		if(hasResized) {
			//If enhancing size, refresh max message count
			if(this.prevHeight < holderHeight) {
				this.computeMaxMessageCount();
			}
			this.prevHeight = holderHeight;
		}

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

		// messageHolder.style.paddingTop = (scrollPageOffset+10)+"px";

		//Show next pending message if at the bottom and scroll isn't locked
		if (messageHolder.scrollTop >= maxScroll - scrollPageOffset
		&& this.pendingMessages.length > 0) {
			gsap.killTweensOf(messageHolder);
			await this.showNextPendingMessage();

		//Show older messages if near the top
		}else if(messageHolder.scrollTop < scrollPageOffset) {
			//Make sure we don't reach the top.
			//If we did the list would keep scrolling up until reaching the first message unless
			//we bring it back just a little like this
			// messageHolder.scrollTop = this.virtualScrollY = scrollPageOffset + 2;
			gsap.killTweensOf(messageHolder);
			this.showPrevMessage();
		}
	}

	/**
	 * Get the next pending message and display it to the list
	 */
	private async showNextPendingMessage():Promise<void> {
		if (this.pendingMessages.length == 0) return;

		//Add 8 messages
		let addCount = 8;
		let messageCountToAdd = addCount;
		let message!: TwitchatDataTypes.ChatMessageTypes | undefined;
		do {
			message = this.pendingMessages.shift();
			//Remove it from locked live list if it exists
			const index = this.lockedLiveMessages.findIndex(v=>v.id == message!.id);
			if(index > -1) this.lockedLiveMessages.splice(index, 1);

			//Message isn't supposed to be displayed, ignore it
			if(!await this.shouldShowMessage(message!)) {
				message = undefined;
			}else if(message) {
				if(await this.mergeWithPrevious(message, undefined, this.pendingMessages)) continue;
				//Add message
				messageCountToAdd --;
				this.filteredMessages.push(message);
			}
		} while (this.pendingMessages.length > 0 && messageCountToAdd > 0)

		//Reset index so we can scroll upward again even if chat is still paused
		this.scrollUpIndexOffset = -1;

		//No message added, stop there
		if(messageCountToAdd == addCount) return;

		if (this.filteredMessages.length > this.maxMessages) {
			this.filteredMessages = this.filteredMessages.slice(-this.maxMessages);
		}
	}

	/**
	 * Shows previous messages when scrolling upward
	 */
	private async showPrevMessage():Promise<void> {
		if(!this.lockScroll) return;
		if(this.loadingOldMessage || this.filteredMessages.length === 0) return;

		const list = this.$store.chat.messages;
		this.loadingOldMessage = true;

		const removed:TwitchatDataTypes.ChatMessageTypes[]	= [];
		const lastId:string = this.filteredMessages[0].id;
		if(this.scrollUpIndexOffset == -1) {
			this.scrollUpIndexOffset = this.pendingMessages.length + this.filteredMessages.length;
		}

		//Add 8 messages
		let addCount = 8;
		let messageCountToAdd = addCount;
		let addNext = false;
		let messageAdded = false;
		let i = list.length - this.scrollUpIndexOffset;

		for (; i > 0; i--) {
			let m = list[i];
			if(m.id == lastId) {
				addNext = true;
			}else if(addNext) {
				m = list[i-1];
				if(await this.shouldShowMessage(m)) {
					this.scrollUpIndexOffset = list.length - i;
					removed.push(this.filteredMessages.pop()!);
					this.filteredMessages.unshift(m);
					messageAdded = true;
					if(--messageCountToAdd == -1) break;
				}
			}
		}

		if(messageAdded) {
			removed.forEach(v=> this.pendingMessages.unshift( v ));
		}else if(removed){
			//We reached the first message of the history, stop there and put messages
			//back to avoid emptying the list if we keep scrolling up
			removed.forEach(v=> this.filteredMessages.push( v ));
		}
		this.replaceReadMarkerAndSelector();
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

		if (this.$store.params.appearance.alternateMessageBackground.value !== false
		&& this.filteredMessages.length >= this.maxMessages) {

			this.counter++;
			if (this.counter % 2 == 0) {
				(this.$el as HTMLDivElement).classList.add("alternateOdd");
			} else {
				(this.$el as HTMLDivElement).classList.remove("alternateOdd");
			}
		}

		if (lastMessRef) {
			if (wheelOrigin) {
				//If scrolling down with mouse wheel while scrolling is locked,
				//scroll to bottom directly for faster scrolldown
				this.virtualScrollY = messagesHolder.scrollTop = maxScroll;
			} else {
				const style = window.getComputedStyle(lastMessRef);
				const margin = parseFloat(style.marginBottom);
				this.virtualScrollY =
				messagesHolder.scrollTop = maxScroll - (lastMessRef.offsetHeight + margin);
			}
		}
		this.replaceReadMarkerAndSelector();
	}

	/**
	 * Avoids closing the conversation when rolling over it
	 */
	public async reopenLastConversation(): Promise<void> {
		clearTimeout(this.closeConvTimeout);
	}

	/**
	 * Called when asking to read a conversation
	 * Display the full conversation if any
	 */
	public async openConversation(m: TwitchatDataTypes.MessageChatData, idRef:string): Promise<void> {
		if (this.lightMode || !m || (!m.answersTo && !m.answers)) return;

		this.conversationMode = true;
		const conv:TwitchatDataTypes.MessageChatData[] = [];
		const parsedIds:{[id:string]:true} = {};

		//Recursive parsing of the conversation
		//Go though all answers of all messages to get the full conversation
		function parseMessage(m:TwitchatDataTypes.MessageChatData) {
			if(parsedIds[m.id] === true) return;
			parsedIds[m.id] = true;
			conv.push(m);

			if(m.answersTo) {
				parseMessage(m.answersTo);
			}
			if(m.answers) {
				m.answers.forEach((a) => {
					if(parsedIds[a.id] === true) return;
					parseMessage(a);
				});
			}
		}
		parseMessage(m);

		// Sort conversation items by date
		this.conversation = conv.sort((a, b) => a.date - b.date);

		this.openConversationHolder(idRef);
	}

	/**
	 * Called to open a user's messages history
	 */
	public async openUserHistory(m: TwitchatDataTypes.MessageChatData, idRef:string): Promise<void> {
		if (this.lightMode || !m) return;

		clearTimeout(this.openConvTimeout);
		this.openConvTimeout = window.setTimeout(async () => {
			this.conversationMode = false;

			let messageList: TwitchatDataTypes.MessageChatData[] = [];
			for (let i = this.$store.chat.messages.length - 1; i >= 0; i--) {
				const mess = this.$store.chat.messages[i];
				if (mess.type == "message" && mess.user.id == m.user.id) {
					messageList.unshift(mess);
					if (messageList.length > 100) break;//Limit to 100 for perf reasons
				}
			}
			this.conversation = messageList;

			this.openConversationHolder(idRef);
		}, 350)
	}

	/**
	 * Called to unschedule the user message history opening.
	 * When rolling hover the nickname, the opening is done only after a delay to
	 * avoid the winodw from opening everytime the mouse goes over a username.
	 * Here we kill that delay to avoid opening it even if rolloing out the username
	 * while staying inside the message bounds
	 */
	public async unscheduleHistoryOpen(m: TwitchatDataTypes.MessageChatData): Promise<void> {
		if (this.lightMode || !m) return;
		clearTimeout(this.openConvTimeout);
	}

	/**
	 * Opens up the conversation holder.
	 * Call this after making sure the messages are rendered
	 */
	private async openConversationHolder(idRef: string): Promise<void> {
		if (this.conversation.length == 0) return;
		await this.$nextTick();

		clearTimeout(this.closeConvTimeout);
		const holderBounds = this.$el.getBoundingClientRect();
		const messageHolder = (this.$refs["message_" +idRef] as HTMLDivElement[])[0];
		const messageBounds = messageHolder.getBoundingClientRect();
		const chatMessagesHolder = this.$refs.chatMessageHolder as HTMLDivElement;
		const conversationHolder = this.$refs.conversationHolder as HTMLDivElement;
		const convMessagesholder = this.$refs.conversationMessages as HTMLDivElement;

		this.conversationPos = Math.max(conversationHolder.getBoundingClientRect().height, messageBounds.top - holderBounds.top + 10);//+10 shouldn't be necessary but for some reason i couldn't figure out, it is... It makes sure holder is down enough so we can move mouse inside it without rolling out the message

		//Scroll history to top
		convMessagesholder.scrollTop = convMessagesholder.scrollHeight;
		gsap.to(chatMessagesHolder, { opacity: .25, duration: .25 });
	}

	/**
	 * Called when rolling over a message
	 */
	public onEnterMessage(data: TwitchatDataTypes.ChatMessageTypes): void {
		clearTimeout(this.closeConvTimeout);
	}

	/**
	 * Called when rolling out of a message
	 * Close the conversation if any displayed
	 */
	public onLeaveMessage(): void {
		clearTimeout(this.openConvTimeout);
		//This avoids exception when closing content if a content-editable element currently has focus
		const target = (document.activeElement as HTMLElement|undefined);
		if (this.$el.contains(target)) {
			target?.blur();
		}
		//Timeout avoids blinking when leaving the message but
		//hovering another one or the conversation window
		this.closeConvTimeout = window.setTimeout(() => {
			this.conversation = [];
			this.showSummaryForm = false;
			const mainHolder = this.$refs.chatMessageHolder as HTMLDivElement;
			gsap.to(mainHolder, { opacity: 1, duration: .25 });
		}, 0);
	}

	/**
	 * Called when a message is clicked
	 */
	public toggleMarkRead(m: TwitchatDataTypes.ChatMessageTypes, event?: MouseEvent): void {
		//Do nothing if feature isn't enabled
		if (this.$store.params.features.markAsRead.value !== true) return;

		if (event) {
			let target = event.target as HTMLElement;
			do {
				if (target.tagName.toLowerCase() == "a") return;//Do not mark as read if clicked on a link
				target = target.parentElement as HTMLElement;
			}while(target != document.body);
		}

		//Do not mark as read if there's a text selection
		if(window.getSelection()?.type === "Range") return;

		if(this.markedAsReadDate == m.date) {
			//Disable marker if the message was already marked as read
			this.markedAsReadDate = 0;
		}else{
			this.markedAsReadDate = m.date;
		}

		this.replaceReadMarkerAndSelector();

		if (m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			const message = {
				channel: m.channel_id,
				message: m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER? "<not set for privacy reasons>" : m.message,
				user: {
					id: m.user.id,
					login: m.user.login,
					displayName: m.user.displayNameOriginal,
				}
			}
			PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_READ, { manual: event != null, selected: this.markedAsReadDate == m.date, message });
		}
	}

	/**
	 * Sets a custom list of activities
	 */
	public setCustomActivities(activities:TwitchatDataTypes.ChatMessageTypes[]):void {
		this.filteredMessages = activities;
		this.customActivitiesDisplayed = true;
		this.virtualScrollY = -1;//Forces utoscroll to bottom
	}

	/**
	 * Unlocks list refresh
	 */
	public unlockListRefresh():void {
		this.customActivitiesDisplayed = false;
		this.virtualScrollY = -1;//Forces autoscroll to bottom
		this.fullListRefresh();
		this.lockScroll = false;
	}

	/**
	 * Increments/Decrements the number of live messages displayed at the
	 * bottom when the chat is paused
	 */
	public async incrementLockedLiveCount(count:number):Promise<void> {
		let v = this.config.liveLockCount;
		if(!v || isNaN(v)) v = 3;
		v += count;
		if(v < 1) v = 1;
		if(v > 10) v = 10;
		this.config.liveLockCount = v;
		const list = this.pendingMessages;
		const finalList:TwitchatDataTypes.ChatMessageTypes[] = [];
		for (let i = list.length-1; i >= 0; i--) {
			const m = list[i];
			if(await this.shouldShowMessage(m)) {
				finalList.unshift(m);
				if(finalList.length === v) break;
			}
		}
		this.lockedLiveMessages = finalList;
	}

	/**
	 * Computes the maximum messages to display depending on the
	 * configured text size.
	 * /!\ Ratios are hardcoded which is far from secure. For a better
	 * solution create a fake message out of dom and measure its
	 * sizes instead of this.
	 */
	private computeMaxMessageCount():void {
		// const el = this.$refs.chatMessageHolder as HTMLDivElement;
		const el = this.$el as HTMLDivElement;
		const sizesRatio = [.4,.5,.6,.7,.8,.9,1,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2,2.1,2.2,2.3];
		const size = this.$store.params.appearance.defaultSize.value as number;
		this.virtualMessageHeight = (32 + 9) * sizesRatio[size-1];//32 = min content height ; 9 = top+bottom padding
		const newCount = Math.ceil(el.offsetHeight/this.virtualMessageHeight) + 20;
		if(newCount != this.maxMessages) {
			this.fullListRefresh();
		}
		this.maxMessages = newCount;
	}

	/**
	 * Replaces the read marker and selector
	 */
	private replaceReadMarkerAndSelector(movingReadMark:boolean = false):void {
		this.markedReadItem = null;
		this.selectedItem = null;
		this.selectedMessage = null;
		let toFindCount = 0;

		if(this.markedAsReadDate > 0) toFindCount++;
		if(this.selectionDate > 0) toFindCount++;

		if(toFindCount == 0) return;

		let foundCount = 0;
		for (let i = this.filteredMessages.length-1; i >= 0; i--) {
			const mLoc = this.filteredMessages[i];
			if(!this.markedReadItem && this.markedAsReadDate > 0 && mLoc.date <= this.markedAsReadDate) {
				const div = (this.$refs["message_" + mLoc.id] as HTMLDivElement[])[0];
				this.markedReadItem = div;
				foundCount ++;
			}

			if(!this.selectedItem && this.selectionDate > 0 && mLoc.date <= this.selectionDate) {
				//Using element IDs instead of $refs so we can target sub elements.
				//Merged messages are handled within a message, this list doesn't have any reference
				//to the actual children except via their element ID
				const div = document.getElementById("message_" + mLoc.id + "_" + this.config.order) as HTMLDivElement;
				this.selectedItem = div;
				this.selectedMessage = mLoc as TwitchatDataTypes.MessageChatData;
				foundCount ++;

				//Search on merged children if any
				const children = this.messageIdToChildren[mLoc.id]
				// const mergeable = mLoc as TwitchatDataTypes.MergeableMessage;
				if(children) {
				// if(mergeable.children) {
					for (let j = 0; j < children.length; j++) {
						const child = children[j];
					// for (let j = 0; j < mergeable.children.length; j++) {
					// 	const child = mergeable.children[j];
						if(this.selectionDate > 0 && child.date <= this.selectionDate) {
							const div = document.getElementById("message_" + child.id + "_" + this.config.order) as HTMLDivElement;
							// const div = (this.$refs["message_" + mLoc.id] as HTMLDivElement[])[0];
							this.selectedItem = div;
							this.selectedMessage = child as TwitchatDataTypes.MessageChatData;
						}
					}
				}
			}
			if(foundCount == toFindCount) break;
		}


		//Scroll chat to make sure the selection remains visible on screen
		const item = movingReadMark? this.markedReadItem : this.selectedItem;
		if(item) {
			const messageHolder	= this.$refs.chatMessageHolder as HTMLDivElement;
			if (!messageHolder) return;
			let messageBounds = item.getBoundingClientRect();
			let listBounds = messageHolder.getBoundingClientRect();
			let thresholdTop = listBounds.top + listBounds.height* 1/4;
			let thresholdBottom = listBounds.top + listBounds.height* 3/4;
			//If message is above 1/4 of the chat height, scroll top
			if(messageBounds.top < thresholdTop) {

				this.lockScroll = true;
				this.virtualScrollY -= thresholdTop - messageBounds.top;
				messageHolder.scrollTop = this.virtualScrollY;
				gsap.killTweensOf(messageHolder)
				// gsap.to(messageHolder, {duration:.25, ease:Linear.easeNone, scrollTop:this.virtualScrollY});

				//If message is below 3/4 of the chat height, scroll down
			}else if(messageBounds.top > thresholdBottom) {
				this.virtualScrollY += messageBounds.top - thresholdBottom;
				messageHolder.scrollTop = this.virtualScrollY;
				gsap.killTweensOf(messageHolder)
				// gsap.to(messageHolder, {duration:.25, ease:Linear.easeNone, scrollTop:this.virtualScrollY});
				this.onScroll(messageBounds.height);
			}
		}
	}

	/**
	 * Attempt to merge consecutive messages of the same type and user
	 *
	 * @returns true if the message has been merged
	 */
	private async mergeWithPrevious(newMessage:TwitchatDataTypes.ChatMessageTypes, indexOffset?:number, messageList?:TwitchatDataTypes.ChatMessageTypes[]):Promise<boolean> {
		const isMergeable = TwitchatDataTypes.MergeableMessageTypesString.hasOwnProperty(newMessage.type)
		&& TwitchatDataTypes.MergeableMessageTypesString[newMessage.type as TwitchatDataTypes.MergeableMessageTypes] === true;
		if(!isMergeable) return false;

		const newCast = newMessage as TwitchatDataTypes.MergeableMessage;
		//If merge option is disable, stop there and clean potential children
		if(StoreProxy.params.features.mergeConsecutive.value == false) {
			if(isMergeable) delete this.messageIdToChildren[newMessage.id];
			return false;
		}
		const maxSize		= this.$store.params.features.mergeConsecutive_maxSize.value as number;
		const maxSizeTotal	= this.$store.params.features.mergeConsecutive_maxSizeTotal.value as number;
		const minDuration	= this.$store.params.features.mergeConsecutive_minDuration.value as number;

		//If message size is higher than max allowed, don't merged
		if(newMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| newMessage.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			//Message longer than the max allowed size, don't merge
			if(newMessage.message_size > maxSize) return false;
			//don't merge messages with multiple occurences flag
			if((newMessage.occurrenceCount || 0) > 0) return false;
			//don't merge announcements and power ups
			if(newMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			&& (newMessage.twitch_announcementColor
				|| newMessage.twitch_gigantifiedEmote
				|| newMessage.twitch_animationId
				|| newMessage.twitch_automod
			)) return false;
		}

		if(!messageList) messageList = this.pendingMessages.length > 0? this.pendingMessages : this.filteredMessages;
		//No message to merge with
		if(messageList.length < 2) return false;

		if(indexOffset == undefined) indexOffset = messageList.length-1;
		//Search for message to merge with
		for (let i = indexOffset; i >= 0; i--) {
			const prevMessage = messageList[i];
			if(!await this.shouldShowMessage(prevMessage)) continue;

			//Prev displayable message isnt the same type, don't merge
			if(prevMessage.type != newMessage.type) return false;

			const prevCast = prevMessage as TwitchatDataTypes.MergeableMessage;
			//Not the same user don't merge
			if(prevCast.user.id !== newCast.user.id) return false;
			if(prevCast.channel_id !== newCast.channel_id) return false;

			//Get date of the latest children if any, or the date of the message itself
			const prevDate = this.messageIdToChildren[prevMessage.id]?.length > 0? this.messageIdToChildren[prevMessage.id][this.messageIdToChildren[prevMessage.id].length-1].date : prevMessage.date;
			//Too much time elapsed between the 2 messages
			if(newMessage.date - prevDate > minDuration * 1000) return false;

			//Merging 2 chat messages from the same user...
			if(prevMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			|| prevMessage.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
				const isMessage = prevMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE;
				//don't merge messages with multiple occurences flag
				if((isMessage && prevMessage.occurrenceCount || 0) > 0) return false;
				//don't merge /announce and power ups
				if(isMessage
				&& (prevMessage.twitch_announcementColor
					|| prevMessage.twitch_gigantifiedEmote
					|| prevMessage.twitch_animationId
				)) return false;

				//If message is too big, don't merge
				//Check forward for when doing a full chat refresh
				let newSize = newCast.message_size;
				if(this.messageIdToChildren[newMessage.id]) {
					this.messageIdToChildren[newMessage.id].forEach(v=> newSize += (v as TwitchatDataTypes.MessageChatData).message_size);
				}
				if(newSize + newCast.message_size > maxSizeTotal) return false;

				//Check backward for when adding a new message
				let prevSize = prevMessage.message_size
				if(this.messageIdToChildren[prevMessage.id]) {
					this.messageIdToChildren[prevMessage.id].forEach(v=> prevSize += (v as TwitchatDataTypes.MessageChatData).message_size);
				}
				if(prevSize + newCast.message_size > maxSizeTotal) return false;
			}else

			//Merging rewards from the same user...
			if(newMessage.type == TwitchatDataTypes.TwitchatMessageType.REWARD
			&& prevMessage.type == TwitchatDataTypes.TwitchatMessageType.REWARD) {
				//Dont merge rewards with prompts unless they're the same reward type
				if(newMessage.message_html && prevMessage.message_html
				&& newMessage.reward.id != prevMessage.reward.id) return false;
				if(newMessage.message_html && !prevMessage.message_html) return false;
				if(!newMessage.message_html && prevMessage.message_html) return false;
			}else

			//Merge cheers
			if(newMessage.type == TwitchatDataTypes.TwitchatMessageType.CHEER
			&& prevMessage.type == TwitchatDataTypes.TwitchatMessageType.CHEER) {
				//Dont merge pinned cheers
				if(newMessage.pinned || prevMessage.pinned) return false;
			}

			//Merge with previous message
			if(!this.messageIdToChildren[prevMessage.id]) this.messageIdToChildren[prevMessage.id] = [];
			this.messageIdToChildren[prevMessage.id].push(newMessage);
			// prevCast.children.push(newMessage);

			//If added child had children extract them to their new parent
			const newChildren = this.messageIdToChildren[newMessage.id];
			const prevChildren = this.messageIdToChildren[prevMessage.id];
			if(newChildren && newChildren.length > 0) {
				prevChildren.push(...newChildren);
				newChildren.splice(0);
			}
			return true;
		}
		return false;
	}

	/**
	 * Shows an error when trying to execute a Stream Deck + action on a message that doesn't
	 * support it
	 */
	private showSelectionError():void {
		gsap.fromTo(this.selectedItem, {x:-5}, {duration:.2, x:5, ease:RoughEase.ease.config({strength:8, points:20, template:Linear.easeNone, randomize:false}) , clearProps:"x"})
		const stopSign = this.$refs.incompatibleSelection as HTMLDivElement;
		if(stopSign) {
			gsap.fromTo(stopSign, {scale:2, opacity:1}, {duration:1, scale:.5, opacity:0});
		}
	}
}

export default toNative(MessageList);
</script>

<style scoped lang="less">
.messagelist {
	position: relative;
	max-height: 100%;
	display: flex;
	flex-direction: column;

	&.lightMode {
		padding: 0;
		.messageHolder {
			padding: 0;
			overflow: hidden;
		}
	}

	&.alertnateBackground {

		&:not(.alternateOdd) {
			.messageHolder {
				.subHolder:nth-child(even) {
					background-color: var(--background-color-fadest);
				}
			}
		}

		&.alternateOdd {
			.messageHolder {
				.subHolder:nth-child(odd) {
					background-color: var(--background-color-fadest);
				}
			}
		}
	}

	.filters {
		position: absolute;
		right: 0;
		z-index: 2;
	}

	.filteredMessages {
		color: var(--color-light);
		background-color: var(--color-primary);
		padding: .5em;
		display: flex;
		align-items: center;
		margin-right: .5em;
		z-index: 1;
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
		gap: .5em;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		overflow-x: hidden;
		flex-grow: 1;
		//Scrolling is locked to 10px min from the top to avoid infinite
		//automatic scrolling to prev items, this padding compensates for
		//this so we can entirely see the 1st message
		padding-top: 10px;
		padding-bottom: 3px;

		.subHolder {
			position: relative;
			display: flex;
			flex-direction: row;
			flex-shrink: 0;

			.message {
				flex-grow: 1;
				&.empty {
					font-style: italic;
					color: var(--color-light-fade);
					text-align: center;
					font-style: italic;
					width: 100%;
					padding: .5em 0;
				}
				// &:hover {
				// 	// Disabled as it causes CSS re renders of all subsequent nodes
				// 	// which is not ideal for performances
				//	// It made it so hovering a message behind the "read mark" layer
				//	// would make it appear over it
				// 	z-index: 2000;
				// }
			}
		}

		.markRead {
			width: 100%;
			height: 10000px;
			background: var(--grayout);
			// background: var(--color-dark);
			border-bottom: 2px solid var(--splitter-color);
			box-shadow: 0px 0 5px 0px rgba(0, 0, 0, .5);
			position: absolute;
			bottom: 0;
			left: 0;
			pointer-events: none;
		}

		.selected {
			width: 100%;
			height: 100%;
			background-color: var(--color-light-fade);
			outline: 1px solid var(--color-light);
			position: absolute;
			bottom: 0;
			left: 0;
			z-index: 1;
			pointer-events: none;

			&.noSelect {
				background-color: var(--color-alert-fadest);
				outline: 1px solid var(--color-alert);
			}
		}

		.subHolder:last-child {
			.markRead {
				border-bottom: none;
			}
		}
	}

	.fake {
		display: flex;
		color:var(--color-light);
		background-color: var(--color-secondary);
		border-radius: var(--border-radius);
		align-self: stretch;
		padding: .2em .5em;
		margin-right: 5px;
		font-weight: bold;
		cursor: default;
		align-items: center;
		font-size: var(--messageSize);
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
		background: var(--color-primary);
		color: #fff;
		white-space: nowrap;
		padding: .5em;
		font-size: .8em;
		transition: background-color .25s;
		transform-origin: bottom center;
		cursor: pointer;

		&:hover {
			background: var(--color-primary-light);
		}
	}

	.lockedLiveHolder {
		background: var(--color-primary-fadest);
		border-top: 1px solid fade(#000, 50%);
		padding-top: .25em;

		.footer {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			font-size: .8em;
			margin-bottom: .5em;
			color: var(--color-text);
			.label {
				font-style: italic;
				margin: 0 .5em;
			}
			button {
				color: inherit;
				height: 1.5em;
				width: 1.5em;
				padding: 2px;
				border-radius: var(--border-radius);
				&:hover {
					background-color: var(--color-text-fadest);
				}

				.icon {
					height: 100%;
				}
			}
		}

		.subHolder{
			position: relative;
			display: flex;
			flex-direction: row;
			&:nth-child(odd) {
				background-color: rgba(255, 255, 255, .025);
			}
			.message {
				flex-grow: 1;
				max-width: 100%;//necessary for shit old safari to avoid message expanding full width
			}
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
		z-index: 4;
		background-color: var(--background-color-secondary);
		padding: 10px;
		left: 0;
		width: 100%;
		max-width: 100%;
		box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, .5);
		transform: translateY(-100%);
		color: var(--color-text);

		.head {
			display: flex;
			flex-direction: row;
			border-bottom: 1px solid var(--splitter-color);
			padding-bottom: 10px;
			margin-bottom: 10px;

			h1 {
				text-align: center;
				flex-grow: 1;
			}
		}

		.messages {
			max-height: 200px;
			overflow-y: auto;
			overflow-x: hidden;
			.message:nth-child(odd) {
				background-color: rgba(255, 255, 255, .025);
			}
		}

		.ctas {
			display: flex;
			flex-direction: row;
			justify-content: center;
			margin-top: 10px;
			button {
				margin: 0 5px;
			}
		}
	}

	.incompatibleSelection {
		opacity: 0;
		pointer-events: none;
		font-size: 2em;
		position: absolute;
		.center();
	}

}
</style>
