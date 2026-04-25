<template>
	<div
		ref="rootEl"
		:class="classes"
		@mouseenter="onHoverList"
		@mouseleave="onLeaveList"
		@wheel="onMouseWheel"
		@touchstart="onTouchStart"
		@touchmove="onTouchMove"
		:style="config.backgroundColor ? { backgroundColor: config.backgroundColor } : {}"
	>
		<MessageListFilter
			class="filters"
			ref="listFilter"
			:open="hovered"
			:config="config"
			@add="$emit('addColumn', config)"
			@change="fullListRefresh()"
		/>

		<div class="messageHolder" ref="chatMessageHolder">
			<div
				v-for="m in filteredMessagesDeduped"
				:key="m.id"
				class="subHolder"
				data-message
				:ref="(el: any) => setMessageRef(m.id, el)"
				:id="'message_' + m.id + '_' + config.order"
			>
				<div
					class="fake"
					v-if="m.fake === true && !$config.DEMO_MODE"
					v-tooltip="{ content: $t('chat.fake_tag_tt'), placement: 'right' }"
				>
					{{ $t("chat.fake_tag") }}
				</div>
				<MessageItem
					:messageData="m"
					@onRead="toggleMarkRead"
					@showConversation="
						(messageData: TwitchatDataTypes.MessageChatData) =>
							openConversation(messageData, m.id)
					"
					@showUserMessages="
						(messageData: TwitchatDataTypes.MessageChatData) =>
							openUserHistory(messageData, m.id)
					"
					@unscheduleMessageOpen="unscheduleHistoryOpen"
					@onOverMessage="onEnterMessage"
					@mouseleave="onLeaveMessage"
					@setCustomActivities="setCustomActivities"
					@openFilters="openFilters()"
					:colIndex="config.order"
					:lightMode="lightMode"
					:childrenList="messageIdToChildren[m.id]"
				/>
			</div>

			<div
				key="empty"
				class="subHolder"
				:ref="(el: any) => setMessageRef('0', el)"
				v-if="filteredMessagesDeduped?.length === 0"
			>
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

		<div
			class="lockedLiveHolder"
			v-if="!lightMode && lockScroll && lockedLiveMessages.length > 0"
		>
			<div
				class="subHolder"
				v-for="m in lockedLiveMessages"
				:key="m.id"
				:ref="'message_live_' + m.id"
			>
				<div class="fake" v-if="m.fake === true" v-tooltip="$t('chat.fake_tag_tt')">
					{{ $t("chat.fake_tag") }}
				</div>
				<MessageItem :messageData="m" disableConversation />
			</div>
			<div class="footer">
				<button
					:aria-label="$t('chat.live_chat_less_aria')"
					:disabled="config.liveLockCount == 1"
					@click="incrementLockedLiveCount(-1)"
				>
					<Icon name="minus" />
				</button>

				<span class="label">{{ $t("chat.live_chat") }}</span>

				<button
					:aria-label="$t('chat.live_chat_more_aria')"
					:disabled="
						config.liveLockCount == 10 || config.liveLockCount >= pendingMessages.length
					"
					@click="incrementLockedLiveCount(1)"
				>
					<Icon name="add" />
				</button>
			</div>
		</div>

		<div
			class="locked"
			ref="locked"
			v-if="!lightMode && lockScroll && !customActivitiesDisplayed"
			@click.stop="unPause"
		>
			<span v-if="lockScroll">{{ $t("chat.paused") }}</span>
			<span v-if="pendingMessages.length > 0">(+{{ pendingMessages.length }})</span>
		</div>

		<button
			class="filteredMessages"
			v-if="customActivitiesDisplayed"
			@click="unlockListRefresh()"
		>
			<Icon name="back" alt="back" />
			<span
				><Icon name="train" alt="train" class="icon" />{{
					$t("chat.hype_train.filtered_title")
				}}</span
			>
		</button>

		<div
			class="conversation"
			ref="conversationHolder"
			v-if="conversation.length > 0"
			:style="conversationStyles"
			@mouseenter="reopenLastConversation"
			@mouseleave="onLeaveMessage"
			@wheel.stop=""
		>
			<div class="head">
				<h1 v-if="conversationMode">{{ $t("chat.conversation") }}</h1>
				<h1 v-if="!conversationMode">
					{{ $t("chat.history", { USER: conversation[0]!.user.displayName }) }}
				</h1>
				<ClearButton @click="onLeaveMessage" />
			</div>
			<div class="messages" ref="conversationMessages">
				<MessageItem
					class="message"
					v-for="m in conversation"
					:key="m.id"
					:messageData="m"
					disableConversation
				/>
			</div>
			<div class="ctas">
				<TTButton
					v-if="storeGroq.enabled && storeGroq.connected && !showSummaryForm"
					@click="showSummaryForm = true"
					v-newflag="{ date: $config.NEW_FLAGS_DATE_V16, id: 'chat_conversation_groq' }"
					icon="groq"
					small
					>{{ $t("groq.summarize_bt") }}</TTButton
				>

				<GroqSummaryFilterForm
					v-if="showSummaryForm"
					mode="all"
					:messageList="conversation"
					@close="showSummaryForm = false"
				/>
			</div>
		</div>

		<div v-if="showLoadingGradient && !lightMode" class="noMessage">
			<div class="gradient"></div>
		</div>
	</div>
</template>

<script setup lang="ts">
import EventBus from "@/events/EventBus";
import GlobalEvent from "@/events/GlobalEvent";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeTiktok as useStoreTiktok } from "@/store/tiktok/storeTiktok";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import type { CSSProperties } from "vue";
import TTButton from "../TTButton.vue";
import ClearButton from "../ClearButton.vue";
import MessageItem from "./MessageItem.vue";
import MessageListFilter from "./components/MessageListFilter.vue";
import { RoughEase } from "gsap/all";
import { Linear } from "gsap/all";
import { gsap } from "gsap/gsap-core";
import GroqSummaryFilterForm from "../GroqSummaryFilterForm.vue";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import * as Sentry from "@sentry/vue";

const props = withDefaults(
	defineProps<{
		lightMode?: boolean;
		filterId?: string;
		config: TwitchatDataTypes.ChatColumnsConfig;
	}>(),
	{
		lightMode: false,
	},
);

defineEmits<{ addColumn: [config: TwitchatDataTypes.ChatColumnsConfig] }>();

const storeParams = useStoreParams();
const storeChat = useStoreChat();
const storeStream = useStoreStream();
const storeTiktok = useStoreTiktok();
const storeAuth = useStoreAuth();
const storeUsers = useStoreUsers();
const storeGroq = useStoreGroq();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");
const listFilter = useTemplateRef<any>("listFilter");
const chatMessageHolder = useTemplateRef<HTMLDivElement>("chatMessageHolder");
const locked = useTemplateRef<HTMLDivElement>("locked");
const incompatibleSelection = useTemplateRef<HTMLDivElement>("incompatibleSelection");
const conversationHolder = useTemplateRef<HTMLDivElement>("conversationHolder");
const conversationMessages = useTemplateRef<HTMLDivElement>("conversationMessages");
const messageRefs: Record<string, HTMLDivElement> = {};

const filteredMessages = ref<TwitchatDataTypes.ChatMessageTypes[]>([]);
const pendingMessages = ref<TwitchatDataTypes.ChatMessageTypes[]>([]);
const lockedLiveMessages = ref<TwitchatDataTypes.ChatMessageTypes[]>([]);
const conversation = ref<TwitchatDataTypes.MessageChatData[]>([]);
const hovered = ref(false);
const lockScroll = ref(false);
const showSummaryForm = ref(false);
const customActivitiesDisplayed = ref(false);
const showLoadingGradient = ref(false);
const conversationMode = ref(true);
const markedReadItem = ref<HTMLDivElement | null>(null);
const selectedItem = ref<HTMLDivElement | null>(null);
const selectedMessage = ref<TwitchatDataTypes.ChatMessageTypes | null>(null);
const messageIdToChildren = ref<{ [key: string]: TwitchatDataTypes.ChatMessageTypes[] }>({});
const conversationPos = ref(0);
const selectedMessageIsChild = ref(false);

let maxMessages = 50;
let markedAsReadDate = 0;
let selectionDate = 0;
let selectionTimeout = -1;
let virtualMessageHeight = 32;
let prevTs = 0;
let counter = 0;
let disposed = false;
let forceScrollDown = false;
let loadingOldMessage = false;
let scrollUpIndexOffset = -1;
let holderOffsetY = -1;
let virtualScrollY = -1;
let updateDebounce = -1;
let prevHeight = 0;
let openConvTimeout: number = -1;
let closeConvTimeout: number = -1;
let prevTouchMove!: TouchEvent;
let touchDragOffset = 0;
let filteredChanIDs: { [key: string]: boolean } | null = null;
let userBlockSet: Set<string> | null = null;
let publicApiEventHandler!: (e: unknown) => void;
let deleteMessageHandler!: (e: GlobalEvent) => void;
let addMessageHandler!: (e: GlobalEvent) => void;
let reloadListHandler!: (e: GlobalEvent) => void;

const classes = computed(() => {
	const res = ["messagelist"];
	if (props.lightMode) res.push("lightMode");
	if (lockScroll.value) res.push("lockScroll");
	if (storeParams.appearance.alternateMessageBackground.value !== false)
		res.push("alternateBackground");
	return res;
});

const conversationStyles = computed<CSSProperties>(() => {
	return { top: conversationPos.value + "px" };
});

const selectedClasses = computed(() => {
	const res = ["selected"];
	if (selectedMessageIsChild.value) res.push("childSelected");
	if (selectedMessage.value?.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE)
		res.push("noSelect");
	return res;
});

const filteredMessagesDeduped = computed(() => {
	const res: TwitchatDataTypes.ChatMessageTypes[] = [];
	const done = new Map<string, boolean>();
	for (const element of filteredMessages.value) {
		if (done.has(element.id)) continue;
		done.set(element.id, true);
		res.push(element);
	}
	return res;
});

//If text size is changed, scroll to bottom of tchat
watch(
	() => storeParams.appearance.defaultSize.value,
	async () => {
		await nextTick();
		const el = chatMessageHolder.value!;
		const maxScroll = el.scrollHeight - el.offsetHeight;
		el.scrollTop = virtualScrollY = maxScroll;
		computeMaxMessageCount();
	},
);

watch(
	() => storeParams.appearance.sharedChatHide.value,
	() => fullListRefresh(),
);
watch(
	() => storeParams.features.mergeConsecutive.value,
	() => fullListRefresh(),
);
watch(
	() => storeParams.features.mergeConsecutive_maxSize.value,
	() => fullListRefresh(),
);
watch(
	() => storeParams.features.mergeConsecutive_maxSizeTotal.value,
	() => fullListRefresh(),
);
watch(
	() => storeParams.features.mergeConsecutive_minDuration.value,
	() => fullListRefresh(),
);
watch(
	() => storeStream.connectedTwitchChans,
	() => rebuildChannelIdsHashmap(),
	{ deep: true },
);
watch(
	() => storeTiktok.connected,
	() => rebuildChannelIdsHashmap(),
	{ deep: true },
);
watch(
	() => YoutubeHelper.instance.connected,
	() => rebuildChannelIdsHashmap(),
	{ deep: true },
);
watch(
	() => props.config,
	() => rebuildChannelIdsHashmap(),
	{ deep: true },
);
watch(lockScroll, () => {
	storeParams.chatColumnStates[props.config.order]!.paused = lockScroll.value;
	PublicAPI.instance.broadcastGlobalStates();
});

onBeforeMount(() => {
	publicApiEventHandler = (e) => onPublicApiEvent(e as any);
	deleteMessageHandler = (e: GlobalEvent) => onDeleteMessage(e);
	addMessageHandler = (e: GlobalEvent) => onAddMessage(e);
	reloadListHandler = (e: GlobalEvent) => fullListRefresh(e.type == GlobalEvent.RELOAD_MESSAGES);

	EventBus.instance.addEventListener(GlobalEvent.ADD_MESSAGE, addMessageHandler);
	EventBus.instance.addEventListener(GlobalEvent.DELETE_MESSAGE, deleteMessageHandler);
	EventBus.instance.addEventListener(GlobalEvent.PIN_MESSAGE, reloadListHandler);
	EventBus.instance.addEventListener(GlobalEvent.UNPIN_MESSAGE, reloadListHandler);
	EventBus.instance.addEventListener(GlobalEvent.TRACK_USER, reloadListHandler);
	EventBus.instance.addEventListener(GlobalEvent.UNTRACK_USER, reloadListHandler);
	EventBus.instance.addEventListener(GlobalEvent.RELOAD_MESSAGES, reloadListHandler);

	PublicAPI.instance.addEventListener("SET_CHAT_FEED_SELECT", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_READ", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_READ_ALL", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_PAUSE_STATE", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_SCROLL", publicApiEventHandler);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_SCROLL_BOTTOM", publicApiEventHandler);
	PublicAPI.instance.addEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_CANCEL",
		publicApiEventHandler,
	);
	PublicAPI.instance.addEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_DELETE",
		publicApiEventHandler,
	);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_SELECT_ACTION_BAN", publicApiEventHandler);
	PublicAPI.instance.addEventListener(
		"SET_CHAT_FEED_SELECT_CHOOSING_ACTION",
		publicApiEventHandler,
	);
	PublicAPI.instance.addEventListener("SET_CHAT_FEED_SELECT_ACTION_SAVE", publicApiEventHandler);
	PublicAPI.instance.addEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT",
		publicApiEventHandler,
	);
	PublicAPI.instance.addEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT",
		publicApiEventHandler,
	);

	fullListRefresh();
	rebuildChannelIdsHashmap();

	prevTs = Date.now() - 1000 / 60;
	renderFrame(Date.now());
});

onBeforeUnmount(() => {
	disposed = true;

	EventBus.instance.removeEventListener(GlobalEvent.ADD_MESSAGE, addMessageHandler);
	EventBus.instance.removeEventListener(GlobalEvent.DELETE_MESSAGE, deleteMessageHandler);
	EventBus.instance.removeEventListener(GlobalEvent.PIN_MESSAGE, reloadListHandler);
	EventBus.instance.removeEventListener(GlobalEvent.UNPIN_MESSAGE, reloadListHandler);
	EventBus.instance.removeEventListener(GlobalEvent.TRACK_USER, reloadListHandler);
	EventBus.instance.removeEventListener(GlobalEvent.UNTRACK_USER, reloadListHandler);
	EventBus.instance.removeEventListener(GlobalEvent.RELOAD_MESSAGES, reloadListHandler);

	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_SELECT", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_READ", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_READ_ALL", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_PAUSE_STATE", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_SCROLL", publicApiEventHandler);
	PublicAPI.instance.removeEventListener("SET_CHAT_FEED_SCROLL_BOTTOM", publicApiEventHandler);
	PublicAPI.instance.removeEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_CANCEL",
		publicApiEventHandler,
	);
	PublicAPI.instance.removeEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_DELETE",
		publicApiEventHandler,
	);
	PublicAPI.instance.removeEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_BAN",
		publicApiEventHandler,
	);
	PublicAPI.instance.removeEventListener(
		"SET_CHAT_FEED_SELECT_CHOOSING_ACTION",
		publicApiEventHandler,
	);
	PublicAPI.instance.removeEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_SAVE",
		publicApiEventHandler,
	);
	PublicAPI.instance.removeEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT",
		publicApiEventHandler,
	);
	PublicAPI.instance.removeEventListener(
		"SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT",
		publicApiEventHandler,
	);
});

/**
 * Called when message list is hovered.
 * Pause the chat if requested
 */
function setMessageRef(id: string, el: HTMLDivElement | null): void {
	if (el) {
		messageRefs[id] = el;
	} else {
		delete messageRefs[id];
	}
}

async function onHoverList(): Promise<void> {
	if (hovered.value) return;

	hovered.value = true;
	if (props.lightMode || !storeParams.features.lockAutoScroll.value) return;
	const scrollDown = !lockScroll.value;
	lockScroll.value = true;

	await nextTick(); //Wait for lock div to be built

	gsap.from(locked.value as HTMLDivElement, {
		duration: 0.2,
		height: 0,
		scaleY: 0,
		ease: "ease.out",
	});

	if (scrollDown) {
		const el = chatMessageHolder.value!;
		const maxScroll = el.scrollHeight - el.offsetHeight;
		el.scrollTop = virtualScrollY = maxScroll;
	}
}

/**
 * Called when rolling out message list.
 * Unpausse chat if no new message
 */
function onLeaveList(): void {
	if (!hovered.value) return;

	hovered.value = false;
	const el = chatMessageHolder.value!;
	const maxScroll = el.scrollHeight - el.offsetHeight;

	if (
		pendingMessages.value.length == 0 &&
		el.scrollTop >= maxScroll - 50 &&
		!customActivitiesDisplayed.value
	) {
		lockScroll.value = false;
		virtualScrollY = -1;
	}
}

/**
 * Opens up the message filters
 */
function openFilters(): void {
	listFilter.value!.openFilters();
}

/**
 * Cleans up all messages and rebuild the list
 */
function fullListRefresh(scrollToBottom: boolean = true): void {
	if (customActivitiesDisplayed.value) return;

	clearTimeout(updateDebounce);
	updateDebounce = window.setTimeout(async () => {
		if (!lockScroll.value) {
			pendingMessages.value = [];
			lockedLiveMessages.value = [];
			messageIdToChildren.value = {};
			scrollUpIndexOffset = -1;
		}

		const messages = storeChat.messages;

		let result: TwitchatDataTypes.ChatMessageTypes[] = [];
		let index = messages.length - 1 - Math.max(0, scrollUpIndexOffset - maxMessages);
		//Reset merged children references
		messageIdToChildren.value = {};

		for (; index >= 0; index--) {
			const m = messages[index]!;
			if (shouldShowMessage(m)) {
				//Merge messages if necessary
				if (mergeWithPrevious(m, index - 1, messages)) continue;

				//Make sure message isn't pending for display
				//This sometimes happens when stressing the list... Probably due
				//the fact that the reference point ("scrollUpIndexOffset") is based
				//on the top of the list instead of its bottom. (this needs refactoring)
				const pIndex = pendingMessages.value.findIndex((v) => v.id == m.id);
				if (pIndex > -1) {
					pendingMessages.value.splice(pIndex, 1);
				}

				result.unshift(m);
				if (result.length == maxMessages) break;
			}
		}

		filteredMessages.value = result;

		await nextTick();

		//Scroll to bottom
		const el = chatMessageHolder.value!;
		const maxScroll = el.scrollHeight - el.offsetHeight;
		if (lockScroll.value) {
			if (scrollToBottom) {
				virtualScrollY = el.scrollTop = maxScroll - 10;
			}
		} else if (scrollToBottom) {
			forceScrollDown = true;
			window.setTimeout(() => {
				forceScrollDown = false;
			}, 1000);
		}
		replaceReadMarkerAndSelector();
	}, 50);
}

/**
 * Rebuilds the hashmap used to quickly check if a message
 * should be displayed on this column or not based on its
 * channel source.
 */
function rebuildChannelIdsHashmap(): void {
	//Check for all valid IDs depending on the connected platforms
	const validIds = storeStream.connectedTwitchChans.concat().map((v) => v.user.id);
	if (storeAuth.youtube.user) validIds.push(storeAuth.youtube.user.id);
	if (storeTiktok.connected) validIds.push("tiktok");
	validIds.push(storeAuth.twitch.user.id);

	//Only keep configured entries that match a valid channel ID
	const chanIds: { [uid: string]: boolean } = {};
	Object.keys(props.config.channelIDs || {})
		.filter((id) => validIds.includes(id))
		.forEach((id) => {
			chanIds[id] = true;
		});

	filteredChanIDs = Object.keys(chanIds).length > 0 ? chanIds : null;

	//Pre-build user block list as a Set for O(1) lookup in shouldShowMessage
	const blockList = props.config.userBlockList;
	userBlockSet =
		blockList && blockList.length > 0
			? new Set(blockList.map((v) => v.toLowerCase()))
			: null;

	fullListRefresh();
}

/**
 * Returns if a message should be displayed or not
 * @param m
 */
function shouldShowMessage(m: TwitchatDataTypes.ChatMessageTypes): boolean {
	//Hide shared chat messages if requested
	if (
		m.twitchSharedChat === true &&
		m.channelSource &&
		storeParams.appearance.sharedChatHide.value === true
	) {
		return false;
	}

	if (props.lightMode) {
		//If in light mode, only allow normal chat messages that are not deleted/moded/...
		return (
			m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE &&
			!m.automod &&
			!m.deleted &&
			!m.twitch_automod &&
			!m.twitch_isSuspicious &&
			!m.twitch_isRestricted &&
			!m.user.is_blocked
		);
	}

	//Avoid adding any new message when showing a custom list of emssage (ex: hype train filtered activities)
	if (customActivitiesDisplayed.value) return false;
	//Check if this message should be displayed on this column
	const colValid = Array.isArray(m.col)
		? m.col.length == 0 || m.col.includes(props.config.order)
		: m.col == undefined || m.col == props.config.order || m.col < 0;
	if (!colValid) return false;

	if (m.type == TwitchatDataTypes.TwitchatMessageType.SCOPE_REQUEST) return true;

	//Filter by channel ID if necessary
	if (filteredChanIDs) {
		const chanId = m.platform == "tiktok" ? "tiktok" : m.channel_id;
		if (filteredChanIDs[chanId] !== true) return false;
	}

	//If message is deleted, keep it only if requested to show messages AND deleted messages
	if (m.deleted) {
		return (
			props.config.messageFilters.deleted === true && props.config.filters.message === true
		);
	}

	switch (m.type) {
		case TwitchatDataTypes.TwitchatMessageType.HISTORY_SPLITTER:
		case TwitchatDataTypes.TwitchatMessageType.CUSTOM:
		case TwitchatDataTypes.TwitchatMessageType.SUSPENDED_TRIGGER_STACK:
		case TwitchatDataTypes.TwitchatMessageType.HATE_RAID: {
			return true;
		}

		case TwitchatDataTypes.TwitchatMessageType.MESSAGE: {
			if (props.config.filters.message === false) return false;

			if (storeUsers.customBadgeList.length > 0) {
				//If requested mandatory badges, check if user has it
				if (
					props.config.mandatoryBadges_flag &&
					(props.config.mandatoryBadges || [])?.length > 0
				) {
					const badges = storeUsers.customUserBadges[m.user.id];
					if (!badges) return false;
					for (let i = 0; i < props.config.mandatoryBadges!.length; i++) {
						const badge = props.config.mandatoryBadges![i];
						if (badges.find((b) => b.id == badge)) return true;
					}
				}

				//If requested forbidden badges, check if user has it
				if (
					props.config.forbiddenBadges_flag &&
					(props.config.forbiddenBadges || [])?.length > 0
				) {
					const badges = storeUsers.customUserBadges[m.user.id];
					if (badges) {
						for (let i = 0; i < props.config.forbiddenBadges!.length; i++) {
							const badge = props.config.forbiddenBadges![i];
							if (badges.find((b) => b.id == badge)) return false;
						}
					}
				}
			}

			//Force tracked users if requested
			if (m.user.is_tracked && props.config.messageFilters.tracked) {
				return true;
			}

			//Force pinned messages if requested
			if (m.is_saved && props.config.messageFilters.pinned) {
				return true;
			}

			//Ignore specific users
			if (
				userBlockSet &&
				m.user.displayNameOriginal.length > 0 &&
				userBlockSet.has(m.user.login.toLowerCase())
			) {
				return false;
			}

			//Ignore specific commands
			if (
				props.config.messageFilters.commands === true &&
				props.config.commandsBlockList.length > 0
			) {
				const cleanMess = m.message.trim().toLowerCase();
				const userCmd = cleanMess.split(" ")[0];
				for (const cmd of props.config.commandsBlockList) {
					if (cmd.length > 0) {
						// If command contains a space, check if the message starts with the whole thing
						if (cmd.indexOf(" ") > -1) {
							if (cleanMess.indexOf(cmd) == 0) {
								return false;
							}
							// If command does not contain a space, check if the message starts with the exact
							// command. It does not match "!command2" if the user types "!command"
						} else if (userCmd === cmd) {
							return false;
						}
					}
				}
			}

			//Second test for some types so deleted/automoded/... messages can still be
			//displayed even if all the viewers/mod/vip/sub filters are off
			if (m.twitch_automod || m.twitch_isRestricted) {
				return props.config.messageFilters.automod !== false;
			}
			if (m.twitch_isSuspicious) {
				return props.config.messageFilters.suspiciousUsers !== false;
			}
			if (m.is_short) {
				return props.config.messageFilters.short !== false;
			}
			if (m.message.trim().charAt(0) == "!") {
				return props.config.messageFilters.commands !== false;
			}

			//User types filters
			if (m.user.is_bot && m.bypassBotFilter !== true) {
				return props.config.messageFilters.bots !== false;
			}
			if (m.user.is_partner) {
				return props.config.messageFilters.partners !== false;
			}
			const chanInfo = m.user.channelInfo[m.channel_id];
			if (chanInfo) {
				if (chanInfo.is_moderator) {
					return props.config.messageFilters.moderators !== false;
				}
				if (chanInfo.is_vip) {
					return props.config.messageFilters.vips !== false;
				}
				if (chanInfo.is_subscriber) {
					return props.config.messageFilters.subs !== false;
				}
			}

			return props.config.messageFilters.viewers !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
			return (
				props.config.filters.whisper === true &&
				Utils.checkPermissionsSync(props.config.whispersPermissions, m.user, m.channel_id)
			);
		}

		case TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT: {
			return (
				props.config.filters.message === true &&
				props.config.messageFilters.viewers === true
			);
		}

		case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB:
		case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION:
		case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT:
		case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
			return props.config.filters.subscription === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION:
		case TwitchatDataTypes.TwitchatMessageType.REWARD: {
			return props.config.filters.reward === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.PREDICTION: {
			return props.config.filters.prediction === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.POLL:
		case TwitchatDataTypes.TwitchatMessageType.CHAT_POLL: {
			return props.config.filters.poll === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER:
		case TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT:
		case TwitchatDataTypes.TwitchatMessageType.GIGANTIFIED_EMOTE:
		case TwitchatDataTypes.TwitchatMessageType.TWITCH_COMBO:
		case TwitchatDataTypes.TwitchatMessageType.CHEER:
		case TwitchatDataTypes.TwitchatMessageType.CUSTOM_POWER_UP: {
			return props.config.filters.cheer === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.FOLLOWBOT_LIST:
		case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
			return props.config.filters.following === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.RAID: {
			return props.config.filters.raid === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_SUMMARY:
		case TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_SUMMARY: {
			return props.config.filters.hype_train_summary === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.RAFFLE: {
			return props.config.filters.raffle === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.BINGO: {
			return props.config.filters.bingo === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.COUNTDOWN: {
			return props.config.filters.countdown === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.TIMER: {
			return props.config.filters.countdown === true && m.stopped;
		}

		case TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN: {
			return props.config.filters.hype_train_cooled_down === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION: {
			return props.config.filters.community_challenge_contribution === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE: {
			return props.config.filters.community_boost_complete === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.JOIN: {
			return props.config.filters.join === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.LEAVE: {
			return props.config.filters.leave === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.BAN:
		case TwitchatDataTypes.TwitchatMessageType.YOUTUBE_BAN: {
			return props.config.filters.ban === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.UNBAN: {
			return props.config.filters.unban === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST: {
			return props.config.filters.unban_request !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.PINNED:
		case TwitchatDataTypes.TwitchatMessageType.UNPINNED: {
			return props.config.filters.pinned === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.PRIVATE_MOD_MESSAGE: {
			return props.config.filters.private_mod_message !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.MANY_REPLIES:
		case TwitchatDataTypes.TwitchatMessageType.WARN_CHATTER:
		case TwitchatDataTypes.TwitchatMessageType.WARN_ACKNOWLEDGE:
		case TwitchatDataTypes.TwitchatMessageType.BLOCKED_TERMS:
		case TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN:
		case TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT:
		case TwitchatDataTypes.TwitchatMessageType.CONNECT:
		case TwitchatDataTypes.TwitchatMessageType.DISCONNECT:
		case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
			return props.config.filters.notice === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE:
		case TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE: {
			return props.config.filters.stream_online === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.SHOUTOUT: {
			return props.config.filters.shoutout === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD: {
			if (m.adType == TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK)
				return props.config.filters.twitchat_ad === true;
			//Force other ad types to first columns
			return props.config.order == 0;
		}

		case TwitchatDataTypes.TwitchatMessageType.ROOM_SETTINGS: {
			return (
				props.config.filters.message === true &&
				props.config.messageFilters.viewers === true
			);
		}

		case TwitchatDataTypes.TwitchatMessageType.CLIP_PENDING_PUBLICATION: {
			return props.config.filters.message === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK: {
			return props.config.filters.user_watch_streak !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.MUSIC_START:
			if (!m.userOrigin) return false;
		case TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE: {
			return props.config.filters.music_added_to_queue == true;
		}

		case TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START: {
			return props.config.filters.ad_break_start_chat === true;
		}

		case TwitchatDataTypes.TwitchatMessageType.STREAMLABS: {
			return props.config.filters.streamlabs !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS: {
			return props.config.filters.streamelements !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.KOFI: {
			return props.config.filters.kofi !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.TIPEEE: {
			return props.config.filters.tipeee !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.TILTIFY: {
			return props.config.filters.tiltify !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.PATREON: {
			return props.config.filters.patreon !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT: {
			return props.config.filters.tiktok_gift !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE: {
			return props.config.filters.tiktok_like !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE: {
			return props.config.filters.tiktok_share !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION: {
			return props.config.filters.twitch_charity_donation !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.STREAMSOCKET_ACTION: {
			return props.config.filters.streamsocket_action !== false;
		}

		case TwitchatDataTypes.TwitchatMessageType.QUIZ_COMPLETE: {
			return props.config.filters.quiz_complete !== false;
		}

		default:
			return false;
	}
}

/**
 * Called when a message is added
 */
function onAddMessage(e: GlobalEvent): void {
	if (customActivitiesDisplayed.value) return;

	const m = e.data as TwitchatDataTypes.ChatMessageTypes;
	if (!shouldShowMessage(m)) return;

	if (mergeWithPrevious(m)) return;
	//If scrolling is locked or there are still messages pending,
	//add the new message to the pending list

	if (lockScroll.value) {
		pendingMessages.value.push(m);
		if (storeParams.features.liveMessages.value === true) {
			//add to "live message" list if allowed
			lockedLiveMessages.value.push(m);
			lockedLiveMessages.value = lockedLiveMessages.value.slice(
				-(props.config.liveLockCount ?? 3),
			); //Only keep last N messages
		}
	} else {
		lockedLiveMessages.value = [];
		let list = filteredMessages.value.concat();
		list.push(m);
		list = list.slice(-maxMessages);
		filteredMessages.value = list;
		showLoadingGradient.value = false;
		scrollToPrevMessage();
	}
}

/**
 * Called when a message is deleted
 */
function onDeleteMessage(e: GlobalEvent): void {
	//Force delete right now to avoid duplicate IDs if it's added
	//back before the fullListRefresh().
	//If a message occurence count is incremented, the message is deleted
	//then added back. Deleting is asynchronous bnut adding is synchronous
	//which opens possibilities for a message to be twice on the list
	const data = e.data as { message: TwitchatDataTypes.ChatMessageTypes; force: boolean };
	for (let i = filteredMessages.value.length - 1; i >= 0; i--) {
		const m = filteredMessages.value[i]!;
		if (m.id == data.message.id) {
			filteredMessages.value.splice(i, 1);
			break;
		}
	}

	for (let i = lockedLiveMessages.value.length - 1; i >= 0; i--) {
		const m = lockedLiveMessages.value[i]!;
		if (m.id == data.message.id) {
			lockedLiveMessages.value.splice(i, 1);
			break;
		}
	}
	fullListRefresh(false);
}

/**
 * Called when requesting an action from the public API
 */
function onPublicApiEvent(
	e:
		| { type: "SET_CHAT_FEED_SELECT"; data: TwitchatEventMap["SET_CHAT_FEED_SELECT"] }
		| { type: "SET_CHAT_FEED_READ"; data: TwitchatEventMap["SET_CHAT_FEED_READ"] }
		| { type: "SET_CHAT_FEED_READ_ALL"; data: TwitchatEventMap["SET_CHAT_FEED_READ_ALL"] }
		| {
				type: "SET_CHAT_FEED_PAUSE_STATE";
				data: TwitchatEventMap["SET_CHAT_FEED_PAUSE_STATE"];
		  }
		| { type: "SET_CHAT_FEED_SCROLL"; data: TwitchatEventMap["SET_CHAT_FEED_SCROLL"] }
		| {
				type: "SET_CHAT_FEED_SCROLL_BOTTOM";
				data: TwitchatEventMap["SET_CHAT_FEED_SCROLL_BOTTOM"];
		  }
		| {
				type: "SET_CHAT_FEED_SELECT_ACTION_CANCEL";
				data: TwitchatEventMap["SET_CHAT_FEED_SELECT_ACTION_CANCEL"];
		  }
		| {
				type: "SET_CHAT_FEED_SELECT_ACTION_DELETE";
				data: TwitchatEventMap["SET_CHAT_FEED_SELECT_ACTION_DELETE"];
		  }
		| {
				type: "SET_CHAT_FEED_SELECT_ACTION_BAN";
				data: TwitchatEventMap["SET_CHAT_FEED_SELECT_ACTION_BAN"];
		  }
		| {
				type: "SET_CHAT_FEED_SELECT_CHOOSING_ACTION";
				data: TwitchatEventMap["SET_CHAT_FEED_SELECT_CHOOSING_ACTION"];
		  }
		| {
				type: "SET_CHAT_FEED_SELECT_ACTION_SAVE";
				data: TwitchatEventMap["SET_CHAT_FEED_SELECT_ACTION_SAVE"];
		  }
		| {
				type: "SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT";
				data: TwitchatEventMap["SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT"];
		  }
		| {
				type: "SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT";
				data: TwitchatEventMap["SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT"];
		  },
): void {
	let count =
		e.type == "SET_CHAT_FEED_READ" && e.data.count && !isNaN(e.data.count as number)
			? e.data.count
			: 0;
	let scrollBy =
		e.type == "SET_CHAT_FEED_SCROLL" && e.data.scrollBy && !isNaN(e.data.scrollBy as number)
			? e.data.scrollBy
			: 100;
	if (typeof scrollBy == "string") scrollBy = parseInt(scrollBy);
	const col = e.data?.colIndex || 0;
	if (col != props.config.order) return;

	switch (e.type) {
		case "SET_CHAT_FEED_READ": {
			if (count === 0) count = 1;
			const messageList = storeChat.messages;
			let offset = messageList.length - 1;
			let currentMessageIndex = -1;
			if (markedAsReadDate === 0) markedAsReadDate = Date.now();

			//Search for first message marked as read
			for (let i = offset; i >= 0; i--) {
				const m = messageList[i]!;
				if (m.date <= markedAsReadDate && shouldShowMessage(m)) {
					currentMessageIndex = i;
					break;
				}
			}

			//Moving read mark upward
			if (currentMessageIndex > -1) {
				if (count < 0) {
					for (let i = currentMessageIndex; i > 0; i--) {
						const m = messageList[i]!;
						if (shouldShowMessage(m)) count++;
						if (count === 1) {
							markedAsReadDate = m.date;
							replaceReadMarkerAndSelector(true);
							break;
						}
					}
					//Moving read mark downward
				} else if (count > 0) {
					for (let i = currentMessageIndex; i < messageList.length; i++) {
						const m = messageList[i]!;
						if (shouldShowMessage(m)) count--;
						if (count === -1) {
							markedAsReadDate = m.date;
							replaceReadMarkerAndSelector(true);
							break;
						}
					}
				}
			}

			break;
		}

		case "SET_CHAT_FEED_READ_ALL": {
			//Read all case
			if (count === 0 || count > filteredMessages.value.length - 1) {
				count = filteredMessages.value.length - 1;
			}
			if (count < 0) count = 0;
			const m = filteredMessages.value[count]!;
			toggleMarkRead(m);
			break;
		}

		case "SET_CHAT_FEED_PAUSE_STATE": {
			let pause = e.data.pause;
			if (pause === undefined) pause = !lockScroll.value;
			if (pause != lockScroll.value) {
				if (!pause) unPause();
				else lockScroll.value = true;
			}
			break;
		}

		case "SET_CHAT_FEED_SCROLL": {
			lockScroll.value = true;
			const messagesHolder = chatMessageHolder.value!;
			const maxScroll = messagesHolder.scrollHeight - messagesHolder.offsetHeight;
			virtualScrollY += scrollBy;
			if (virtualScrollY < 0) virtualScrollY = 0;
			if (virtualScrollY > maxScroll) virtualScrollY = maxScroll;

			if (e.data.mode == "messages") {
				scrollBy *= virtualMessageHeight;
				messagesHolder.scrollBy(0, scrollBy);
				onScroll(scrollBy);
			} else {
				gsap.to(messagesHolder, {
					scrollTop: messagesHolder.scrollTop + scrollBy,
					duration: 0.5,
					ease: "power1.inOut",
					onComplete: () => {
						if (Math.abs(messagesHolder.scrollTop - maxScroll) < 10) {
							if (pendingMessages.value.length === 0) unPause();
						}
					},
				});
			}
			break;
		}

		case "SET_CHAT_FEED_SCROLL_BOTTOM": {
			fullListRefresh();
			lockScroll.value = false;
			break;
		}

		case "SET_CHAT_FEED_SELECT": {
			const messageList = storeChat.messages;
			let offset = messageList.length - 1;
			let currentMessageIndex = -1;
			let add = 1;
			if (selectionDate === 0) {
				selectionDate = Date.now();
				add = 0;
			}

			//Search for a message selected
			for (let i = offset; i >= 0; i--) {
				const m = messageList[i]!;
				if (m.date <= selectionDate && shouldShowMessage(m)) {
					currentMessageIndex = i;
					break;
				}
			}

			if (currentMessageIndex > -1) {
				//Moving selection upward
				let count = e.data.direction || 1;
				if (count < 0) {
					for (let i = currentMessageIndex; i > 0; i--) {
						const m = messageList[i]!;
						if (shouldShowMessage(m)) count++;
						if (count === add) {
							selectionDate = m.date;
							replaceReadMarkerAndSelector();
							break;
						}
					}
					//Moving selection downward
				} else if (count > 0) {
					for (let i = currentMessageIndex; i < messageList.length; i++) {
						const m = messageList[i]!;
						if (shouldShowMessage(m)) count--;
						if (count === -add) {
							selectionDate = m.date;
							replaceReadMarkerAndSelector();
							break;
						}
					}
				}
				clearTimeout(selectionTimeout);
				selectionTimeout = window.setTimeout(() => {
					if (selectedItem.value)
						selectedItem.value.classList.remove("selectedChildMessage");
					selectedItem.value = null;
					selectedMessage.value = null;
					selectionDate = 0;
					PublicAPI.instance.broadcast("SET_CHAT_FEED_SELECT_ACTION_CANCEL", {
						colIndex: props.config.order,
					});
				}, 5000);
			}
			break;
		}

		case "SET_CHAT_FEED_SELECT_ACTION_CANCEL": {
			selectedItem.value = null;
			selectedMessage.value = null;
			selectionDate = 0;
			break;
		}

		case "SET_CHAT_FEED_SELECT_ACTION_DELETE": {
			if (
				!selectedMessage.value ||
				selectedMessage.value.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE
			) {
				showSelectionError();
				return;
			}
			storeChat.deleteMessage(selectedMessage.value);
			selectedItem.value = null;
			selectedMessage.value = null;
			selectionDate = 0;
			break;
		}

		case "SET_CHAT_FEED_SELECT_ACTION_BAN": {
			if (
				!selectedMessage.value ||
				selectedMessage.value.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE
			) {
				showSelectionError();
				return;
			}
			TwitchUtils.banUser(
				selectedMessage.value.user,
				selectedMessage.value.channel_id,
				e.data.duration,
			);
			selectedItem.value = null;
			selectedMessage.value = null;
			selectionDate = 0;
			break;
		}

		case "SET_CHAT_FEED_SELECT_ACTION_SAVE": {
			if (
				!selectedMessage.value ||
				selectedMessage.value.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE
			) {
				showSelectionError();
				return;
			}
			if (selectedMessage.value.is_saved !== true) {
				storeChat.saveMessage(selectedMessage.value);
			} else {
				storeChat.unsaveMessage(selectedMessage.value);
			}
			break;
		}

		case "SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT": {
			if (
				!selectedMessage.value ||
				selectedMessage.value.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE
			) {
				showSelectionError();
				return;
			}
			storeChat.highlightChatMessageOverlay(selectedMessage.value);
			break;
		}

		case "SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT": {
			if (
				!selectedMessage.value ||
				selectedMessage.value.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE
			) {
				showSelectionError();
				return;
			}
			storeUsers.shoutout(selectedMessage.value.channel_id, selectedMessage.value.user);
			break;
		}

		case "SET_CHAT_FEED_SELECT_CHOOSING_ACTION": {
			clearTimeout(selectionTimeout);
			selectionTimeout = window.setTimeout(() => {
				if (selectedItem.value) selectedItem.value.classList.remove("selectedChildMessage");
				selectedItem.value = null;
				selectedMessage.value = null;
				selectionDate = 0;
			}, 5000);
			break;
		}
	}
}

/**
 * Catch up all pending messages
 */
function unPause(): void {
	fullListRefresh();
	lockScroll.value = false;

	gsap.to(locked.value as HTMLDivElement, {
		duration: 0.2,
		height: 0,
		scaleY: 0,
		ease: "ease.in",
		onComplete: () => {
			lockScroll.value = false;
		},
	});
}

/**
 * If hovering and scrolling down with wheel, load next message
 */
function onMouseWheel(event: WheelEvent): void {
	//"shiftkey" filter avoids pausing chat when scrolling horizontally via shift+wheel
	if (event.shiftKey) return;

	onScroll(event.deltaY, event);
}

/**
 * Called when scrolling the list
 */
function onScroll(amount: number, event?: WheelEvent): void {
	if (props.lightMode) return;

	if (amount < 0) {
		//Scrolling up, lock auto scroll (updates)
		lockScroll.value = true;
	} else {
		//If scrolling down while at the bottom of the list, load next message
		const el = chatMessageHolder.value!;
		const maxScroll = el.scrollHeight - el.offsetHeight;

		const messRefs = el.querySelectorAll(".message");
		if (messRefs.length == 0) {
			//If scrolling the chat down before any message shows up, just load next message
			showNextPendingMessage();
			return;
		}

		const lastMessRef = messRefs[messRefs.length - 1];
		//If scrolling down while last item visible on screen
		if (maxScroll - el.scrollTop <= (lastMessRef as HTMLDivElement).offsetHeight) {
			if (pendingMessages.value.length > 0) {
				if (event) {
					event.preventDefault();
					event.stopPropagation();
				}
				showNextPendingMessage();
			}
		}
	}
}

/**
 * Start scrolling chat on mobile
 * Used to set a drag offset to avoid glitchy chat scroll
 * when actually trying to scroll horizontally
 */
function onTouchStart(event: TouchEvent): void {
	touchDragOffset = event.touches[0]!.clientY;
}

/**
 * Scroll chat on mobile
 */
function onTouchMove(event: TouchEvent): void {
	const el = chatMessageHolder.value!;
	const maxScroll = el.scrollHeight - el.offsetHeight;
	if (prevTouchMove) {
		const direction = event.touches[0]!.clientY - prevTouchMove.touches[0]!.clientY;
		const dragOffset = event.touches[0]!.clientY - touchDragOffset;
		//Pause chat if dragging it upward for at least 50px
		if (direction > 0 && dragOffset > 50) lockScroll.value = true;
		else {
			const lock = Math.abs(el.scrollTop - maxScroll) != 0;
			if (!lock) {
				unlockListRefresh();
			} else {
				lockScroll.value = true;
			}
		}
	}
	prevTouchMove = event;
}

/**
 * Called 60 times/sec to scroll the list and load new messages
 * if there are pending ones.
 */
function renderFrame(ts: number): void {
	if (disposed) return;
	requestAnimationFrame((ts) => renderFrame(ts));

	const timeScale = (60 / 1000) * Math.min(Math.min(1000 / 15, Math.max(0.1, ts - prevTs)));
	prevTs = ts;

	const messageHolder = chatMessageHolder.value;
	if (!messageHolder) return;
	const holderHeight = messageHolder.offsetHeight;
	const hasResized = prevHeight != holderHeight;
	const maxScroll = messageHolder.scrollHeight - holderHeight;
	const messageItems = messageHolder.getElementsByClassName("subHolder");

	if (messageItems.length === 0) return;
	const lastMessage = messageItems[messageItems.length - 1] as HTMLDivElement;
	const bottom = lastMessage.offsetTop + lastMessage.offsetHeight;
	let easeValue = hasResized ? 1 : 0.2;

	if (forceScrollDown) {
		virtualScrollY = maxScroll;
	}

	//Compute scroll offset before/after which point prev/next messages
	//should be loaded
	const scrollPageOffset = Math.min(virtualMessageHeight * 5, maxScroll * 0.25);

	if (hasResized) {
		//If enhancing size, refresh max message count
		if (prevHeight < holderHeight) {
			computeMaxMessageCount();
		}
		prevHeight = holderHeight;
	}

	//On init the virtualscroll is -1, scroll to the bottom and init the virtualscroll
	if (!lockScroll.value && messageHolder.scrollTop < maxScroll) {
		if (virtualScrollY == -1) virtualScrollY = maxScroll;
		const dist = Math.abs(maxScroll - virtualScrollY);
		if (dist > 50 || pendingMessages.value.length > 0) {
			//Linear scroll if need to scroll by more than 10px
			virtualScrollY += Math.max(10, pendingMessages.value.length * 4) * timeScale;
		} else {
			//easeout scroll when reaching bottom
			virtualScrollY += (maxScroll - virtualScrollY) * easeValue * timeScale;
		}
		//Avoid virtual scroll to go beyond bottom
		if (virtualScrollY >= maxScroll - 2) {
			virtualScrollY = maxScroll;
		}
		messageHolder.scrollTop = virtualScrollY;
	}

	//If messages height is smaller than the holder height, move the holder to the bottom
	if (bottom < holderHeight) {
		if (holderOffsetY <= 0) easeValue = 1;
		holderOffsetY += (holderHeight - bottom - holderOffsetY) * easeValue;
		if (Math.abs(holderHeight - bottom - holderOffsetY) < 2) {
			holderOffsetY = holderHeight - bottom;
		}

		messageHolder.style.transform = "translateY(calc(" + holderOffsetY + "px - .25em))";
	} else if (holderOffsetY != 0) {
		holderOffsetY = 0;
		messageHolder.style.transform = "translateY(0)";
	}

	// messageHolder.style.paddingTop = (scrollPageOffset+10)+"px";

	//Show next pending message if at the bottom and scroll isn't locked

	if (
		messageHolder.scrollTop >= maxScroll - scrollPageOffset &&
		pendingMessages.value.length > 0
	) {
		gsap.killTweensOf(messageHolder);
		showNextPendingMessage();
		//Show older messages if near the top
	} else if (messageHolder.scrollTop < scrollPageOffset) {
		gsap.killTweensOf(messageHolder);
		showPrevMessage();
	}
}

/**
 * Get the next pending message and display it to the list
 */
function showNextPendingMessage(): void {
	if (pendingMessages.value.length == 0) return;

	//Add 8 messages
	let addCount = 8;
	let messageCountToAdd = addCount;
	let message!: TwitchatDataTypes.ChatMessageTypes | undefined;
	let localArray: TwitchatDataTypes.ChatMessageTypes[] = [];
	do {
		message = pendingMessages.value.shift();
		//Remove it from locked live list if it exists
		const index = lockedLiveMessages.value.findIndex((v) => v.id == message!.id);
		if (index > -1) lockedLiveMessages.value.splice(index, 1);

		//Message isn't supposed to be displayed, ignore it
		if (!shouldShowMessage(message!)) {
			message = undefined;
		} else if (message) {
			if (mergeWithPrevious(message, undefined, pendingMessages.value)) continue;
			//Add message
			messageCountToAdd--;
			localArray.push(message);
		}
	} while (pendingMessages.value.length > 0 && messageCountToAdd > 0);

	filteredMessages.value.push(...localArray);

	//Reset index so we can scroll upward again even if chat is still paused
	scrollUpIndexOffset = -1;

	//No message added, stop there
	if (messageCountToAdd == addCount) return;

	if (filteredMessages.value.length > maxMessages) {
		filteredMessages.value = filteredMessages.value.slice(-maxMessages);
	}
}

/**
 * Shows previous messages when scrolling upward
 */
async function showPrevMessage(): Promise<void> {
	if (!lockScroll.value) return;
	if (loadingOldMessage || filteredMessages.value.length === 0) return;

	const list = storeChat.messages;
	loadingOldMessage = true;

	const lastId: string = filteredMessages.value[0]!.id;
	if (scrollUpIndexOffset == -1) {
		scrollUpIndexOffset = pendingMessages.value.length + filteredMessages.value.length;
	}

	// Record scroll anchor position before any DOM changes.
	// This is used after the loop to compensate scrollTop for newly
	// prepended content, preventing a runaway scroll-to-top feedback loop.
	const messageHolder = chatMessageHolder.value!;
	const prevScrollTop = messageHolder.scrollTop;
	const anchorDomId = "message_" + lastId + "_" + props.config.order;
	const anchorEl = document.getElementById(anchorDomId);
	const anchorOffsetBefore = anchorEl ? anchorEl.offsetTop : 0;

	//Add 8 messages
	let addCount = 8;
	let messageCountToAdd = addCount;
	let addNext = false;
	let i = list.length - scrollUpIndexOffset;

	// Collect locally so the reactive array is mutated only once,
	// avoiding a render per pop/unshift inside the loop.
	const toPrepend: TwitchatDataTypes.ChatMessageTypes[] = [];

	for (; i > 0; i--) {
		let m = list[i]!;
		if (m.id == lastId) {
			addNext = true;
		} else if (addNext) {
			m = list[i - 1]!;
			if (shouldShowMessage(m)) {
				scrollUpIndexOffset = list.length - i;
				toPrepend.unshift(m);
				if (--messageCountToAdd == -1) break;
			}
		}
	}

	if (toPrepend.length > 0) {
		const current = filteredMessages.value;
		const popCount = toPrepend.length;
		const removed = current.slice(-popCount);
		filteredMessages.value = [
			...toPrepend,
			...current.slice(0, current.length - popCount),
		];

		for (const v of removed) pendingMessages.value.unshift(v);

		// Wait for DOM to reflect the prepended messages, then adjust
		// scrollTop so the user's visual position stays stable.
		// Without this, scrollTop stays near 0 after prepending, which
		// triggers another showPrevMessage() on the next renderFrame(),
		// creating a runaway loop that scrolls all the way to the first message.
		await nextTick();
		const anchorElAfter = document.getElementById(anchorDomId);
		if (anchorElAfter && messageHolder) {
			const delta = anchorElAfter.offsetTop - anchorOffsetBefore;
			messageHolder.scrollTop = prevScrollTop + delta;
			virtualScrollY = messageHolder.scrollTop;
		}
	}
	replaceReadMarkerAndSelector();
	loadingOldMessage = false;
}

/**
 * Call this after adding a new message.
 * Will scroll so the previous message is on the bottom of the list
 * so the new message displays smoothly from the bottom of the screen
 */
async function scrollToPrevMessage(wheelOrigin = false): Promise<void> {
	await nextTick();
	scrollUpIndexOffset = -1;
	const messagesHolder = chatMessageHolder.value!;
	const maxScroll = messagesHolder.scrollHeight - messagesHolder.offsetHeight;

	const messRefs = messagesHolder.querySelectorAll(".messageHolder>.subHolder");
	if (messRefs.length == 0) return;
	const lastMessRef = messRefs[messRefs.length - 1] as HTMLDivElement;

	if (
		storeParams.appearance.alternateMessageBackground.value !== false &&
		filteredMessages.value.length >= maxMessages
	) {
		counter++;
		if (counter % 2 == 0) {
			(rootEl.value as HTMLDivElement).classList.add("alternateOdd");
		} else {
			(rootEl.value as HTMLDivElement).classList.remove("alternateOdd");
		}
	}

	if (lastMessRef) {
		if (wheelOrigin) {
			//If scrolling down with mouse wheel while scrolling is locked,
			//scroll to bottom directly for faster scrolldown
			virtualScrollY = messagesHolder.scrollTop = maxScroll;
		} else {
			const style = window.getComputedStyle(lastMessRef);
			const margin = parseFloat(style.marginBottom);
			virtualScrollY = messagesHolder.scrollTop =
				maxScroll - (lastMessRef.offsetHeight + margin);
		}
	}
	replaceReadMarkerAndSelector();
}

/**
 * Avoids closing the conversation when rolling over it
 */
function reopenLastConversation(): void {
	clearTimeout(closeConvTimeout);
}

/**
 * Called when asking to read a conversation
 * Display the full conversation if any
 */
function openConversation(m: TwitchatDataTypes.MessageChatData, idRef: string): void {
	if (props.lightMode || !m || (!m.answersTo && !m.answers)) return;

	conversationMode.value = true;
	const conv: TwitchatDataTypes.MessageChatData[] = [];
	const parsedIds: { [id: string]: true } = {};

	//Recursive parsing of the conversation
	//Go though all answers of all messages to get the full conversation
	function parseMessage(m: TwitchatDataTypes.MessageChatData) {
		if (parsedIds[m.id] === true) return;
		parsedIds[m.id] = true;
		conv.push(m);

		if (m.answersTo) {
			parseMessage(m.answersTo);
		}
		if (m.answers) {
			m.answers.forEach((a) => {
				if (parsedIds[a.id] === true) return;
				parseMessage(a);
			});
		}
	}
	parseMessage(m);

	// Sort conversation items by date
	conversation.value = conv.sort((a, b) => a.date - b.date);

	openConversationHolder(idRef);
}

/**
 * Called to open a user's messages history
 */
function openUserHistory(m: TwitchatDataTypes.MessageChatData, idRef: string): void {
	if (props.lightMode || !m) return;

	clearTimeout(openConvTimeout);
	openConvTimeout = window.setTimeout(() => {
		conversationMode.value = false;

		let messageList: TwitchatDataTypes.MessageChatData[] = [];
		for (let i = storeChat.messages.length - 1; i >= 0; i--) {
			const mess = storeChat.messages[i]!;
			if (mess.type == "message" && mess.user.id == m.user.id) {
				messageList.unshift(mess);
				if (messageList.length > 100) break;
			}
		}
		conversation.value = messageList;

		openConversationHolder(idRef);
	}, 350);
}

/**
 * Called to unschedule the user message history opening.
 * When rolling hover the nickname, the opening is done only after a delay to
 * avoid the winodw from opening everytime the mouse goes over a username.
 * Here we kill that delay to avoid opening it even if rolloing out the username
 * while staying inside the message bounds
 */
function unscheduleHistoryOpen(m: TwitchatDataTypes.MessageChatData): void {
	if (props.lightMode || !m) return;
	clearTimeout(openConvTimeout);
}

/**
 * Opens up the conversation holder.
 * Call this after making sure the messages are rendered
 */
async function openConversationHolder(idRef: string): Promise<void> {
	if (conversation.value.length == 0) return;
	await nextTick();

	clearTimeout(closeConvTimeout);
	const holderBounds = rootEl.value!.getBoundingClientRect();
	const messageHolder = messageRefs[idRef]!;
	const messageBounds = messageHolder.getBoundingClientRect();
	const chatMessagesHolder = chatMessageHolder.value!;
	const convHolder = conversationHolder.value!;
	const convMessagesholder = conversationMessages.value!;

	conversationPos.value = Math.max(
		convHolder.getBoundingClientRect().height,
		messageBounds.top - holderBounds.top + 10,
	); //+10 shouldn't be necessary but for some reason i couldn't figure out, it is... It makes sure holder is down enough so we can move mouse inside it without rolling out the message

	//Scroll history to top

	convMessagesholder.scrollTop = convMessagesholder.scrollHeight;
	gsap.to(chatMessagesHolder, { opacity: 0.25, duration: 0.25 });
}

/**
 * Called when rolling over a message
 */
function onEnterMessage(data: TwitchatDataTypes.ChatMessageTypes): void {
	clearTimeout(closeConvTimeout);
}

/**
 * Called when rolling out of a message
 * Close the conversation if any displayed
 */
function onLeaveMessage(): void {
	clearTimeout(openConvTimeout);
	//This avoids exception when closing content if a content-editable element currently has focus
	const target = document.activeElement as HTMLElement | undefined;
	if (target && rootEl.value!.contains(target)) {
		target?.blur();
	}
	//Timeout avoids blinking when leaving the message but
	//hovering another one or the conversation window
	closeConvTimeout = window.setTimeout(() => {
		conversation.value = [];
		showSummaryForm.value = false;
		const mainHolder = chatMessageHolder.value!;
		gsap.to(mainHolder, { opacity: 1, duration: 0.25 });
	}, 0);
}

/**
 * Called when a message is clicked
 */
function toggleMarkRead(m: TwitchatDataTypes.ChatMessageTypes, event?: MouseEvent): void {
	//Do nothing if feature isn't enabled
	if (storeParams.features.markAsRead.value !== true) return;

	if (!m.date) {
		Sentry.captureMessage("[CHAT] Message missing date when trying to mark it as read", {
			level: "warning",
			extra: { message: m, fromClick: event != null },
		});
		return;
	}

	if (event) {
		let target = event.target as HTMLElement;
		do {
			if (target.tagName.toLowerCase() == "a") return;
			target = target.parentElement as HTMLElement;
		} while (target != document.body);
	}

	//Do not mark as read if there's a text selection
	if (window.getSelection()?.type === "Range") return;

	if (markedAsReadDate == m.date) {
		//Disable marker if the message was already marked as read
		markedAsReadDate = 0;
	} else {
		markedAsReadDate = m.date;
	}

	replaceReadMarkerAndSelector();

	if (
		m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE ||
		m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER
	) {
		PublicAPI.instance.broadcast("ON_MESSAGE_MARKED_AS_READ", {
			manual: event != null,
			selected: markedAsReadDate == m.date,
			channel: m.channel_id,
			message:
				m.type == TwitchatDataTypes.TwitchatMessageType.WHISPER
					? "<not set for privacy reasons>"
					: m.message,
			user: {
				id: m.user.id,
				login: m.user.login,
				displayName: m.user.displayNameOriginal,
			},
		});
	}
}

/**
 * Sets a custom list of activities
 */
function setCustomActivities(activities: TwitchatDataTypes.ChatMessageTypes[]): void {
	filteredMessages.value = activities;
	customActivitiesDisplayed.value = true;
	virtualScrollY = -1; //Forces utoscroll to bottom
}

/**
 * Unlocks list refresh
 */
function unlockListRefresh(): void {
	customActivitiesDisplayed.value = false;
	virtualScrollY = -1; //Forces autoscroll to bottom
	fullListRefresh();
	lockScroll.value = false;
}

/**
 * Increments/Decrements the number of live messages displayed at the
 * bottom when the chat is paused
 */
function incrementLockedLiveCount(count: number): void {
	let v = props.config.liveLockCount;
	if (!v || isNaN(v)) v = 3;
	v += count;
	if (v < 1) v = 1;
	if (v > 10) v = 10;
	props.config.liveLockCount = v;
	const list = pendingMessages.value;
	const finalList: TwitchatDataTypes.ChatMessageTypes[] = [];
	for (let i = list.length - 1; i >= 0; i--) {
		const m = list[i]!;
		if (shouldShowMessage(m)) {
			finalList.unshift(m);
			if (finalList.length === v) break;
		}
	}
	lockedLiveMessages.value = finalList;
}

/**
 * Computes the maximum messages to display depending on the
 * configured text size.
 * /!\ Ratios are hardcoded which is far from secure. For a better
 * solution create a fake message out of dom and measure its
 * sizes instead of this.
 */
function computeMaxMessageCount(): void {
	const el = rootEl.value as HTMLDivElement;
	const sizesRatio = [
		0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.1, 2.2,
		2.3,
	];
	const size = storeParams.appearance.defaultSize.value as number;
	virtualMessageHeight = (32 + 9) * sizesRatio[size - 1]!;
	const newCount = Math.ceil(el.offsetHeight / virtualMessageHeight) + 20;
	if (newCount != maxMessages) {
		fullListRefresh();
	}
	maxMessages = newCount;
}

/**
 * Replaces the read marker and selector
 */
function replaceReadMarkerAndSelector(movingReadMark: boolean = false): void {
	if (selectedMessageIsChild.value && selectedItem.value) {
		selectedItem.value.classList.remove("selectedChildMessage");
		selectedMessageIsChild.value = false;
	}

	markedReadItem.value = null;
	selectedItem.value = null;
	selectedMessage.value = null;
	let toFindCount = 0;

	if (markedAsReadDate > 0) toFindCount++;
	if (selectionDate > 0) toFindCount++;

	if (toFindCount == 0) return;

	let foundCount = 0;
	for (let i = filteredMessages.value.length - 1; i >= 0; i--) {
		const mLoc = filteredMessages.value[i]!;
		if (!markedReadItem.value && markedAsReadDate > 0 && mLoc.date <= markedAsReadDate) {
			const div = messageRefs[mLoc.id]!;
			markedReadItem.value = div;
			foundCount++;
		}

		if (!selectedItem.value && selectionDate > 0 && mLoc.date <= selectionDate) {
			//Using element IDs instead of $refs so we can target sub elements.
			//Merged messages are handled within a message, this list doesn't have any reference
			//to the actual children except via their element ID
			const div = document.getElementById(
				"message_" + mLoc.id + "_" + props.config.order,
			) as HTMLDivElement;
			selectedItem.value = div;
			selectedMessage.value = mLoc as TwitchatDataTypes.MessageChatData;
			foundCount++;

			//Search on merged children if any
			const children = messageIdToChildren.value[mLoc.id];
			if (children) {
				for (const child of children) {
					if (selectionDate > 0 && child.date <= selectionDate) {
						const div = document.getElementById(
							"message_" + child.id + "_" + props.config.order,
						) as HTMLDivElement;
						selectedItem.value.classList.remove("selectedChildMessage");
						selectedItem.value = div;
						selectedMessage.value = child as TwitchatDataTypes.MessageChatData;
						selectedMessageIsChild.value = true;
						div.classList.add("selectedChildMessage");
					}
				}
			}
		}
		if (foundCount == toFindCount) break;
	}

	//Scroll chat to make sure the selection remains visible on screen
	const item = movingReadMark ? markedReadItem.value : selectedItem.value;
	if (item) {
		const messageHolder = chatMessageHolder.value;
		if (!messageHolder) return;
		let messageBounds = item.getBoundingClientRect();
		let listBounds = messageHolder.getBoundingClientRect();
		let thresholdTop = listBounds.top + (listBounds.height * 1) / 4;
		let thresholdBottom = listBounds.top + (listBounds.height * 3) / 4;
		//If message is above 1/4 of the chat height, scroll top
		if (messageBounds.top < thresholdTop) {
			lockScroll.value = true;
			virtualScrollY -= thresholdTop - messageBounds.top;
			messageHolder.scrollTop = virtualScrollY;
			gsap.killTweensOf(messageHolder);

			//If message is below 3/4 of the chat height, scroll down
		} else if (messageBounds.top > thresholdBottom) {
			virtualScrollY += messageBounds.top - thresholdBottom;
			messageHolder.scrollTop = virtualScrollY;
			gsap.killTweensOf(messageHolder);
			onScroll(messageBounds.height);
		}
	}
}

/**
 * Attempt to merge consecutive messages of the same type and user
 *
 * @returns true if the message has been merged
 */
function mergeWithPrevious(
	newMessage: TwitchatDataTypes.ChatMessageTypes,
	indexOffset?: number,
	messageList?: TwitchatDataTypes.ChatMessageTypes[],
): boolean {
	const isMergeable =
		TwitchatDataTypes.MergeableMessageTypesString.hasOwnProperty(newMessage.type) &&
		TwitchatDataTypes.MergeableMessageTypesString[
			newMessage.type as TwitchatDataTypes.MergeableMessageTypes
		] === true;
	if (!isMergeable) return false;

	const newCast = newMessage as TwitchatDataTypes.MergeableMessage;
	//If merge option is disable, stop there and clean potential children
	if (storeParams.features.mergeConsecutive.value == false) {
		if (isMergeable) delete messageIdToChildren.value[newMessage.id];
		return false;
	}
	const maxSize = storeParams.features.mergeConsecutive_maxSize.value as number;
	const maxSizeTotal = storeParams.features.mergeConsecutive_maxSizeTotal.value as number;
	const minDuration = storeParams.features.mergeConsecutive_minDuration.value as number;

	//If message size is higher than max allowed, don't merged
	if (
		newMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE ||
		newMessage.type == TwitchatDataTypes.TwitchatMessageType.WHISPER
	) {
		//Message longer than the max allowed size, don't merge
		if (newMessage.message_size > maxSize) return false;
		//don't merge messages with multiple occurences flag
		if ((newMessage.occurrenceCount || 0) > 0) return false;
		//don't merge deleted messages
		if (newMessage.deleted) return false;
		//don't merge announcements and power ups
		if (
			newMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE &&
			(newMessage.twitch_announcementColor ||
				newMessage.twitch_gigantifiedEmote ||
				newMessage.twitch_animationId ||
				newMessage.twitch_automod)
		)
			return false;
	}

	if (!messageList)
		messageList =
			pendingMessages.value.length > 0 ? pendingMessages.value : filteredMessages.value;
	//No message to merge with
	if (messageList.length < 2) return false;

	if (indexOffset == undefined) indexOffset = messageList.length - 1;
	//Search for message to merge with
	for (let i = indexOffset; i >= 0; i--) {
		const prevMessage = messageList[i]!;
		if (!shouldShowMessage(prevMessage)) continue;

		//Prev displayable message isnt the same type, don't merge
		if (prevMessage.type != newMessage.type) return false;

		const prevCast = prevMessage as TwitchatDataTypes.MergeableMessage;
		//Not the same user don't merge
		if (prevCast.user.id !== newCast.user.id) return false;
		if (prevCast.channel_id !== newCast.channel_id) return false;

		//Get date of the latest children if any, or the date of the message itself
		const children = messageIdToChildren.value[prevMessage.id];
		const prevDate =
			children && children?.length > 0
				? children[children.length - 1]!.date
				: prevMessage.date;
		//Too much time elapsed between the 2 messages
		if (newMessage.date - prevDate > minDuration * 1000) return false;

		//Merging 2 chat messages from the same user...
		if (
			prevMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE ||
			prevMessage.type == TwitchatDataTypes.TwitchatMessageType.WHISPER
		) {
			const isMessage = prevMessage.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE;
			if (((isMessage && prevMessage.occurrenceCount) || 0) > 0) return false;
			if (
				isMessage &&
				(prevMessage.twitch_announcementColor ||
					prevMessage.twitch_gigantifiedEmote ||
					prevMessage.twitch_animationId)
			)
				return false;
			//don't merge deleted
			if (isMessage && prevMessage.deleted) return false;

			//If message is too big, don't merge
			//Check forward for when doing a full chat refresh
			let newSize = newCast.message_size;
			if (messageIdToChildren.value[newMessage.id]) {
				messageIdToChildren.value[newMessage.id]!.forEach(
					(v) => (newSize += (v as TwitchatDataTypes.MessageChatData).message_size),
				);
			}
			if (newSize + newCast.message_size > maxSizeTotal) return false;

			//Check backward for when adding a new message
			let prevSize = prevMessage.message_size;
			if (messageIdToChildren.value[prevMessage.id]) {
				messageIdToChildren.value[prevMessage.id]!.forEach(
					(v) => (prevSize += (v as TwitchatDataTypes.MessageChatData).message_size),
				);
			}
			if (prevSize + newCast.message_size > maxSizeTotal) return false;
		} else //Merging rewards from the same user...
		 if (
			newMessage.type == TwitchatDataTypes.TwitchatMessageType.REWARD &&
			prevMessage.type == TwitchatDataTypes.TwitchatMessageType.REWARD
		) {
			//Dont merge rewards with prompts unless they're the same reward type
			if (
				newMessage.message_html &&
				prevMessage.message_html &&
				newMessage.reward.id != prevMessage.reward.id
			)
				return false;
			if (newMessage.message_html && !prevMessage.message_html) return false;
			if (!newMessage.message_html && prevMessage.message_html) return false;
		} else //Merge cheers
		 if (
			newMessage.type == TwitchatDataTypes.TwitchatMessageType.CHEER &&
			prevMessage.type == TwitchatDataTypes.TwitchatMessageType.CHEER
		) {
			//Dont merge pinned cheers
			if (newMessage.pinned || prevMessage.pinned) return false;
		}

		//Merge with previous message
		if (!messageIdToChildren.value[prevMessage.id])
			messageIdToChildren.value[prevMessage.id] = [];
		messageIdToChildren.value[prevMessage.id]!.push(newMessage);

		//If added child had children extract them to their new parent
		const newChildren = messageIdToChildren.value[newMessage.id];
		const prevChildren = messageIdToChildren.value[prevMessage.id];
		if (newChildren && prevChildren && newChildren.length > 0) {
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
function showSelectionError(): void {
	gsap.fromTo(
		selectedItem.value,
		{ x: -5 },
		{
			duration: 0.2,
			x: 5,
			ease: RoughEase.ease.config({
				strength: 8,
				points: 20,
				template: Linear.easeNone,
				randomize: false,
			}),
			clearProps: "x",
		},
	);
	const stopSign = incompatibleSelection.value;
	if (stopSign) {
		gsap.fromTo(stopSign, { scale: 2, opacity: 1 }, { duration: 1, scale: 0.5, opacity: 0 });
	}
}
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

	&.alternateBackground {
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
		padding: 0.5em;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0;
		margin-right: 0.5em;
		z-index: 1;
		& > .icon {
			height: 1em;
			width: 1em;
		}
		span:not(.icon) {
			flex-grow: 1;
			text-align: center;
			.icon {
				height: 0.7em;
				margin-right: 0.5em;
			}
		}
	}

	.messageHolder {
		gap: 0.5em;
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
					padding: 0.5em 0;
				}
				// &:hover {
				// 	// Disabled as it causes CSS re renders of all subsequent nodes
				// 	// which is not ideal for performances
				// 	// It made it so hovering a message behind the "read mark" layer
				// 	// would make it appear over it
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
			box-shadow: 0px 0 5px 0px rgba(0, 0, 0, 0.5);
			position: absolute;
			bottom: 0;
			left: 0;
			pointer-events: none;
		}

		.selected {
			width: 100%;
			height: 100%;
			background-color: var(--color-secondary-fadest);
			border: 2px solid var(--color-secondary);
			border-radius: var(--border-radius);
			position: absolute;
			bottom: 0;
			left: 0;
			z-index: 1;
			pointer-events: none;

			&.noSelect {
				background-color: var(--color-alert-fadest);
				border-color: var(--color-alert);
			}

			&.childSelected {
				display: none;
			}
		}

		::v-deep(.selectedChildMessage) {
			background-color: var(--color-secondary-fadest);
			border: 2px solid var(--color-secondary);
			border-radius: var(--border-radius);
		}

		.subHolder:last-child {
			.markRead {
				border-bottom: none;
			}
		}
	}

	.fake {
		display: flex;
		color: var(--color-light);
		background-color: var(--color-secondary);
		border-radius: var(--border-radius);
		align-self: stretch;
		padding: 0.2em 0.5em;
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
		border-radius: 0;
		background: var(--color-primary);
		color: #fff;
		white-space: nowrap;
		padding: 0.5em;
		font-size: 0.8em;
		transition: background-color 0.25s;
		transform-origin: bottom center;
		cursor: pointer;

		&:hover {
			background: var(--color-primary-light);
		}
	}

	.lockedLiveHolder {
		background: var(--color-primary-fadest);
		border: 1px solid var(--color-primary);
		border-bottom: none;
		border-top-left-radius: var(--border-radius);
		border-top-right-radius: var(--border-radius);
		padding-top: 0.25em;

		.footer {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			font-size: 0.8em;
			margin-bottom: 0.5em;
			color: var(--color-text);
			.label {
				font-style: italic;
				margin: 0 0.5em;
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

		.subHolder {
			position: relative;
			display: flex;
			flex-direction: row;
			&:nth-child(odd) {
				background-color: rgba(255, 255, 255, 0.025);
			}
			.message {
				flex-grow: 1;
				max-width: 100%; //necessary for shit old safari to avoid message expanding full width
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
			animation:
				scroll 5s linear infinite,
				fade 1s linear alternate infinite;
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
				opacity: 0.5;
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
		box-shadow: 0px 0px 5px 2px rgba(0, 0, 0, 0.5);
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
				background-color: rgba(255, 255, 255, 0.025);
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

