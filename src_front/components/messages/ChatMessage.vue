<template>
	<div
		ref="rootEl"
		:class="classes"
		@contextmenu="onContextMenu($event, messageData, rootEl!)"
		@mouseover="emit('onOverMessage', messageData, $event)"
	>
		<div
			class="answersTo"
			:class="{ expand: expandAnswer }"
			v-if="
				messageData.type == 'message' &&
				messageData.directlyAnswersTo &&
				$store.params.appearance.hideAnswersTo.value === false
			"
			@click.stop="expandAnswer = !expandAnswer"
		>
			<icon name="reply" />
			<a
				:href="getProfilePage(messageData.directlyAnswersTo.user)"
				target="_blank"
				@click.stop.prevent="
					openUserCard(
						messageData.directlyAnswersTo.user,
						messageData.channel_id,
						messageData.platform,
					)
				"
				@mouseenter="hoverNickName($event)"
				@mouseleave="outNickName($event)"
				data-login
				class="login"
				:style="answersToLoginStyle"
				>{{ messageData.directlyAnswersTo.user.displayName
				}}<i class="translation" v-if="translateUsername">
					({{ messageData.directlyAnswersTo.user.login }})</i
				></a
			>

			<ChatMessageChunksParser
				:forceSpoiler="messageData.directlyAnswersTo.spoiler == true"
				:containsSpoiler="messageData.directlyAnswersTo.containsSpoiler == true"
				:largeEmote="false"
				:chunks="messageData.directlyAnswersTo.message_chunks"
				:channel="messageData.directlyAnswersTo.channel_id"
				:platform="messageData.directlyAnswersTo.platform"
			/>
		</div>

		<div
			class="gradientBg"
			v-if="
				messageData.type == 'message' && messageData.twitch_animationId == 'rainbow-eclipse'
			"
		></div>
		<div
			class="noiseBg"
			v-if="messageData.type == 'message' && messageData.twitch_animationId == 'cosmic-abyss'"
		>
			<img
				src="@/assets/img/chat_animation/cosmic-abyss_1.jpg"
				alt="cosmic abyss background 1"
			/>
			<img
				src="@/assets/img/chat_animation/cosmic-abyss_2.jpg"
				alt="cosmic abyss background 2"
			/>
		</div>

		<div v-if="automodReasons" class="automod">
			<Icon name="automod" theme="light" />
			<div class="header">
				<strong>{{ t("chat.message.automod") }}</strong> {{ automodReasons }}
			</div>
			<div class="actions">
				<TTButton
					:aria-label="t('chat.message.automod_acceptBt_aria')"
					v-tooltip="t('chat.message.automod_acceptBt_aria')"
					icon="checkmark"
					light
					@click.stop="modMessage(true)"
					:loading="automodInProgress"
				/>

				<TTButton
					:aria-label="t('chat.message.automod_rejectBt_aria')"
					v-tooltip="t('chat.message.automod_rejectBt_aria')"
					light
					alert
					icon="cross"
					@click.stop="modMessage(false)"
					:loading="automodInProgress"
				/>
			</div>
		</div>

		<div v-if="isAnnouncement" class="announcementHolder">
			<Icon name="announcement" />
			<div class="header">
				<strong>{{ t("chat.message.announcement") }}</strong>
			</div>
		</div>

		<template
			v-if="
				messageData.user.is_blocked !== true || messageData.user.stop_block_censor === true
			"
		>
			<span class="chatMessageTime" v-if="$store.params.appearance.displayTime.value">{{
				time
			}}</span>

			<ChatModTools
				:messageData="messageData"
				class="mod"
				v-if="showModTools"
				:canDelete="messageData.type != 'whisper'"
			/>

			<Icon
				name="youtube"
				v-if="messageData.platform == 'youtube'"
				v-tooltip="t('chat.youtube.platform_youtube')"
			/>
			<Icon
				name="tiktok"
				v-if="messageData.platform == 'tiktok'"
				v-tooltip="t('chat.tiktok.platform_tiktok')"
			/>
			<Icon
				name="bluesky"
				v-if="messageData.platform == 'bluesky'"
				v-tooltip="t('chat.bluesky.platform_bluesky')"
			/>

			<Icon
				v-if="
					!disableConversation &&
					isConversation &&
					$store.params.features.conversationsEnabled.value &&
					!lightMode
				"
				class="icon convBt"
				name="conversation"
				@click.stop="emit('showConversation', messageData)"
			/>

			<TTButton
				class="noAutospoilBt"
				v-if="messageData.type == 'message' && messageData.autospoiled === true"
				@click.stop="stopAutoSpoil()"
				alert
				small
				icon="show"
				v-tooltip="t('chat.message.stop_autospoil')"
			/>

			<ChatMessageInfoBadges
				class="infoBadges"
				:infos="infoBadges"
				v-if="infoBadges.length > 0"
			/>

			<div class="userBadges" v-if="filteredBadges.length > 0 || miniBadges.length > 0">
				<tooltip v-for="b in filteredBadges" :key="b.id" :content="b.tooltipHTML">
					<Icon v-if="b.icon.sd.indexOf('http') == -1" :name="b.icon.sd" class="badge" />
					<img v-else :src="b.icon.sd" class="badge" />
				</tooltip>

				<span
					class="badge mini"
					v-for="b in miniBadges"
					:key="b.class"
					:class="b.class"
					v-tooltip="b.label"
				></span>
			</div>

			<CustomUserBadges :user="messageData.user" />

			<Icon
				class="noFollowBadge"
				v-if="showNofollow"
				name="unfollow"
				:alt="t('chat.message.no_follow')"
				v-tooltip="t('chat.message.no_follow')"
			/>

			<div
				class="occurrenceCount"
				ref="occurrenceCount"
				v-tooltip="t('chat.message.occurrences')"
				v-if="messageData.occurrenceCount != undefined && messageData.occurrenceCount > 0"
			>
				x{{ messageData.occurrenceCount + 1 }}
			</div>

			<span
				class="pronoun"
				v-if="
					messageData.user.pronounsLabel &&
					$store.params.features.showUserPronouns.value === true
				"
				v-tooltip="messageData.user.pronounsTooltip || ''"
				>{{ messageData.user.pronounsLabel }}</span
			>

			<span v-if="messageData.user.displayName != messageData.user.displayNameOriginal"
				>.</span
			>

			<a
				:href="getProfilePage(messageData.user)"
				target="_blank"
				@click.stop.prevent="
					openUserCard(messageData.user, messageData.channel_id, messageData.platform)
				"
				@mouseenter="hoverNickName($event)"
				@mouseleave="outNickName($event)"
				data-login
				class="login"
				:style="userLoginStyle"
				>{{ messageData.user.displayName
				}}<i class="translation" v-if="translateUsername">
					({{ messageData.user.login }})</i
				></a
			>
			<template v-if="recipient">
				<span> ➔ </span>
				<a
					:href="getProfilePage(recipient)"
					target="_blank"
					class="login"
					:style="recipientLoginStyle"
					@click.stop.prevent="
						openUserCard(recipient!, messageData.channel_id, messageData.platform)
					"
					>{{ recipient.displayName }}</a
				>
			</template>

			<span :class="messageClasses">
				<span class="text">
					<ChatMessageChunksParser
						:forceSpoiler="messageData.type == 'message' && messageData.spoiler == true"
						:containsSpoiler="
							messageData.type == 'message' && messageData.containsSpoiler == true
						"
						:largeEmote="
							messageData.type == 'message'
								? messageData.twitch_gigantifiedEmote != undefined
								: false
						"
						:chunks="localMessageChunks"
						:channel="messageData.channel_id"
						:platform="messageData.platform"
					/>
				</span>
				<span class="deleted" v-if="parentDeletedText">{{ parentDeletedText }}</span>
				<MessageTranslation class="textTranslation" :messageData="messageData" />
			</span>

			<template v-for="child in childMessages" :key="child.message.id">
				<span
					:class="child.classes"
					:id="'message_' + child.message.id + '_' + colIndex"
					@contextmenu.capture="onContextMenu($event, child.message, rootEl!)"
				>
					<span class="text">
						<ChatMessageChunksParser
							:forceSpoiler="
								child.message.type == 'message' && child.message.spoiler == true
							"
							:containsSpoiler="
								child.message.type == 'message' &&
								child.message.containsSpoiler == true
							"
							:largeEmote="
								child.message.type == 'message'
									? child.message.twitch_gigantifiedEmote != undefined
									: false
							"
							:chunks="child.message.message_chunks"
							:channel="child.message.channel_id"
							:platform="child.message.platform"
						/>
					</span>
					<span class="deleted" v-if="child.deletedText">{{ child.deletedText }}</span>
				</span>
			</template>

			<br v-if="clipInfo" />
			<div v-if="clipInfo" class="clip">
				<img :src="clipInfo.thumbnail_url" alt="thumbnail" @click.stop="openClip()" />
				<div class="infos">
					<div class="title" @click.stop="openClip()">{{ clipInfo.title }}</div>
					<div class="subtitle">
						{{ t("chat.message.clip_created_by") }} {{ clipInfo.creator_name }}
					</div>
					<div class="subtitle">
						{{ t("chat.message.clip_channel") }} {{ clipInfo.broadcaster_name }}
					</div>
					<div class="subtitle">
						{{ t("chat.message.clip_duration") }} {{ clipInfo.duration }}s
					</div>
					<div class="subtitle">
						{{ t("chat.message.clip_views") }} {{ clipInfo.view_count }}
					</div>
					<TTButton
						class="highlightBt"
						:aria-label="t('chat.message.highlightBt_aria')"
						icon="highlight"
						v-tooltip="t('chat.message.highlightBt_tt')"
						:loading="clipHighlightLoading"
						@click.stop="clipHighlight()"
						>{{ t("chat.message.highlightBt_aria") }}</TTButton
					>
					<Icon
						v-if="clipInfo.broadcaster_id != $store.auth.twitch.user.id"
						class="alertIcon"
						name="alert"
						theme="alert"
						v-tooltip="{
							theme: 'alert',
							content: t('chat.message.highlightBt_alert_tt'),
						}"
					/>
					<TTButton
						v-else-if="requestClipDLPermission"
						@click="grantClipDLScope()"
						v-tooltip="t('chat.message.clip_permission_tt')"
						secondary
						small
						icon="unlock"
						>{{ t("chat.message.clip_permission") }}</TTButton
					>
				</div>
			</div>
		</template>

		<span
			class="blockedMessage"
			v-if="messageData.user.is_blocked === true && !messageData.user.stop_block_censor"
			@click.stop="messageData.user.stop_block_censor = true"
			>{{ t("chat.message.blocked_user") }}</span
		>

		<div class="ctas" v-if="isAd">
			<TTButton @click="disableAd()" alert icon="cross">{{
				t("chat.message.disable_ad")
			}}</TTButton>
			<TTButton @click="openAdParams()" icon="edit">{{
				t("chat.message.customize_ad")
			}}</TTButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { useChatMessage } from "@/composables/useChatMessage";
import { storeAccessibility as useStoreAccessibility } from "@/store/accessibility/storeAccessibility";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import type { CSSProperties } from "vue";
import { computed, onBeforeMount, onMounted, ref, toRaw, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import TTButton from "../TTButton.vue";
import CustomUserBadges from "../user/CustomUserBadges.vue";
import MessageTranslation from "./MessageTranslation.vue";
import ChatMessageChunksParser from "./components/ChatMessageChunksParser.vue";
import ChatMessageInfoBadges from "./components/ChatMessageInfoBadges.vue";
import ChatModTools from "./components/ChatModTools.vue";
import { nextTick } from "vue";

const props = withDefaults(
	defineProps<{
		messageData: TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData;
		childrenList?: (TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData)[];
		lightMode?: boolean;
		contextMenuOff?: boolean;
		disableConversation?: boolean;
		highlightedWords?: string[];
		colIndex?: number;
	}>(),
	{
		lightMode: false,
		contextMenuOff: false,
		disableConversation: false,
		highlightedWords: () => [],
		colIndex: 0,
	},
);

const emit = defineEmits<{
	showConversation: [message: TwitchatDataTypes.ChatMessageTypes];
	showUserMessages: [message: TwitchatDataTypes.ChatMessageTypes];
	unscheduleMessageOpen: [message: TwitchatDataTypes.ChatMessageTypes];
	onOverMessage: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
	onRead: [message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent];
}>();

const rootEl = useTemplateRef("rootEl");
const occurrenceCountEl = useTemplateRef("occurrenceCount");
const storeAuth = useStoreAuth();
const storeParams = useStoreParams();
const storeChat = useStoreChat();
const storeAccessibility = useStoreAccessibility();
const { t, tm } = useI18n();

const channelInfo = ref<TwitchatDataTypes.UserChannelInfo | null>(null);
const recipient = ref<TwitchatDataTypes.TwitchatUser | null>(null);
const expandAnswer = ref(false);
const automodReasons = ref("");
const hypeChat = ref<TwitchatDataTypes.HypeChatData | null>(null);
const badges = ref<TwitchatDataTypes.TwitchatUserBadge[]>([]);
const clipInfo = ref<TwitchDataTypes.ClipInfo | null>(null);
const clipHighlightLoading = ref(false);
const highlightOverlayAvailable = ref(false);
const infoBadges = ref<TwitchatDataTypes.MessageBadgeData[]>([]);
const isAd = ref(false);
const isAnnouncement = ref(false);
const automodInProgress = ref(false);
const userBannedOnChannels = ref("");
const localMessageChunks = ref<TwitchatDataTypes.ParseMessageChunk[]>([]);
const requestClipDLPermission = ref(false);
let staticClasses: string[] = [];

const {
	time,
	canModerateMessage,
	canModerateUser_local,
	copyJSON,
	applyStyles,
	onContextMenu,
	openUserCard,
	getProfilePage,
} = useChatMessage(props, emit, rootEl, {
	copyJSON: copyJSONOverride,
	applyStyles: applyStylesOverride,
});

// Override pattern: declare variables first so override functions can close over them,
// then assign after composable call.
let baseCopyJSON = copyJSON;
let baseApplyStyles = applyStyles;

const showNofollow = computed(
	() =>
		storeParams.appearance.highlightNonFollowers.value === true &&
		channelInfo.value?.is_following === false,
);

const userLoginStyle = computed<CSSProperties>(() => ({
	color: Utils.getUserColor(props.messageData.user),
}));

const recipientLoginStyle = computed<CSSProperties>(() =>
	recipient.value ? { color: Utils.getUserColor(recipient.value) } : {},
);

const answersToLoginStyle = computed<CSSProperties>(() => {
	if (props.messageData.type === "message" && props.messageData.directlyAnswersTo) {
		return { color: Utils.getUserColor(props.messageData.directlyAnswersTo.user) };
	}
	return {};
});

const messageClasses = computed<string[]>(() => {
	const res: string[] = ["message"];
	const m = props.messageData;
	const spoilersEnabled = storeParams.features.spoilersEnabled.value === true;
	if (m.deleted) res.push("deleted");
	if (spoilersEnabled && m.type === "message" && m.spoiler === true) res.push("spoiler");
	return res;
});

const parentDeletedText = computed<string>(() => {
	const m = props.messageData;
	if (m.type !== "message") return "";
	const censor = storeParams.appearance.censorDeletedMessages.value === true;
	if (m.deletedData) {
		return censor
			? t("chat.message.deleted_by", { USER: m.deletedData.deleter.displayName })
			: "";
	}
	if (m.deleted) {
		return censor ? t("chat.message.deleted") : "";
	}
	return "";
});

const childMessages = computed(() => {
	if (!props.childrenList) return [];
	const spoilersEnabled = storeParams.features.spoilersEnabled.value === true;
	const censor = storeParams.appearance.censorDeletedMessages.value === true;
	return props.childrenList.map((m) => {
		const classes: string[] = ["messageChild"];
		if (m.deleted) classes.push("deleted");
		if (spoilersEnabled && m.type === "message" && m.spoiler) classes.push("spoiler");
		let deletedText = "";
		if (m.type === "message") {
			if (m.deletedData) {
				deletedText = censor
					? t("chat.message.deleted_by", { USER: m.deletedData.deleter.displayName })
					: "";
			} else if (m.deleted) {
				deletedText = censor ? t("chat.message.deleted") : "";
			}
		}
		return { message: m, classes, deletedText };
	});
});

const classes = computed<string[]>(() => {
	const res = staticClasses.concat();
	const message = props.messageData;
	const censorDeletedMessages = storeParams.appearance.censorDeletedMessages.value === true;

	if (censorDeletedMessages) res.push("censor");
	if (hypeChat.value) res.push("hypeChat");
	if (automodReasons.value) res.push("automod");
	if (props.messageData.user.is_blocked) res.push("blockedUser");
	if (props.disableConversation !== false) res.push("disableConversation");
	if (!props.lightMode && message.cyphered) res.push("cyphered");
	if (!props.lightMode && props.messageData.user.is_tracked) res.push("tracked");

	if (message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
		if (message.directlyAnswersTo && storeParams.appearance.fadeAnswers.value === true)
			res.push("fade");
		if (message.cleared) res.push("cleared");
		if (message.deleted) res.push("deleted");
		if (message.twitch_animationId) res.push("animation_" + message.twitch_animationId);
		if (message.twitch_gigantifiedEmote) res.push("gigantifiedEmote");
		if (props.childrenList && props.childrenList.length > 0) res.push("merged");
	}

	return res;
});

const showModTools = computed(() => {
	if (props.messageData.type === "whisper") return false;
	return (
		!props.lightMode &&
		canModerateMessage.value &&
		canModerateUser_local.value &&
		storeParams.features.showModTools.value === true
	);
});

/**
 * Is this message part of a conversation?
 */
const isConversation = computed(() => {
	if (props.messageData.type === "whisper") return false;
	return props.messageData.answers.length > 0 || props.messageData.answersTo != undefined;
});

/**
 * Returns the login instead of the display name if the display name contains
 * mostly non-latin chars
 */
const translateUsername = computed(() => {
	if (storeParams.appearance.translateNames.value !== true) return false;
	const dname = props.messageData.user.displayNameOriginal.toLowerCase();
	const uname = props.messageData.user.login.toLowerCase();
	return dname != uname;
});

/**
 * Get badges images. Tooltip HTML is precomputed to avoid string concat per render.
 */
const filteredBadges = computed<(TwitchatDataTypes.TwitchatUserBadge & { tooltipHTML: string })[]>(
	() => {
		if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) return [];
		if (
			storeParams.appearance.showBadges.value &&
			storeParams.appearance.minimalistBadges.value !== true
		) {
			return (badges.value ?? []).map((b) => ({
				...b,
				tooltipHTML:
					"<div style='text-align:center'><img src=" +
					(b.icon.hd || b.icon.sd) +
					" width='64' class='emote'><br>" +
					b.title +
					"</div>",
			}));
		}
		return [];
	},
);

/**
 * Displays minimalist badges
 */
const miniBadges = computed<{ label: string; class?: string }[]>(() => {
	if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) return [];
	const result: { label: string; class?: string }[] = [];
	if (
		storeParams.appearance.showBadges.value === true &&
		storeParams.appearance.minimalistBadges.value === true &&
		badges.value
	) {
		for (const b of badges.value) {
			switch (b.id) {
				case "predictions": {
					const color = (b.version ?? "").indexOf("pink") > -1 ? "pink" : "blue";
					result.push({ label: b.title ?? "Prediction", class: "prediction " + color });
					break;
				}
				case "subscriber":
					result.push({
						label: b.title ?? t("chat.message.badges.subscriber"),
						class: "subscriber",
					});
					break;
				case "vip":
					result.push({ label: t("chat.message.badges.vip"), class: "vip" });
					break;
				case "premium":
					result.push({ label: t("chat.message.badges.prime"), class: "premium" });
					break;
				case "moderator":
					result.push({ label: t("chat.message.badges.moderator"), class: "moderator" });
					break;
				case "staff":
					result.push({ label: t("chat.message.badges.twitch_staff"), class: "staff" });
					break;
				case "broadcaster":
					result.push({
						label: t("chat.message.badges.broadcaster"),
						class: "broadcaster",
					});
					break;
				case "partner":
					result.push({ label: t("chat.message.badges.partner"), class: "partner" });
					break;
				case "founder":
					result.push({ label: t("chat.message.badges.founder"), class: "founder" });
					break;
				case "ambassador":
					result.push({
						label: t("chat.message.badges.ambassador"),
						class: "ambassador",
					});
					break;
			}
		}
	}
	return result;
});

onBeforeMount(() => {
	channelInfo.value = props.messageData.user.channelInfo[props.messageData.channel_id]!;
	//Make a copy of badges so they stay this way (decoupled from store mutations)
	badges.value = structuredClone(toRaw(channelInfo.value?.badges) ?? []);
	//Cloned because TwitchUtils.highlightChunks mutates the array
	localMessageChunks.value = structuredClone(toRaw(props.messageData.message_chunks));

	const mess = props.messageData;
	const highlightedWords: string[] = props.highlightedWords.concat();

	watch(
		() => storeParams.appearance.helloBadge.value,
		() => updateBadges(),
	);

	if (channelInfo.value?.is_raider) {
		//Remove "raider" badge from the view when removed from data
		watch(
			() => channelInfo.value?.is_raider,
			() => {
				for (let i = 0; i < infoBadges.value.length; i++) {
					const b = infoBadges.value[i]!;
					if (b.type == TwitchatDataTypes.MessageBadgeDataType.RAIDER) {
						infoBadges.value.splice(i, 1);
						break;
					}
				}
			},
		);
	}

	//Define message badges (these are different from user badges!)
	if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
		const chatMess = props.messageData;
		isAd.value = chatMess.is_ad === true;
		//Manage twitch automod content
		if (chatMess.twitch_automod) {
			automodReasons.value = chatMess.twitch_automod.reasons.join(", ");
			highlightedWords.push(...chatMess.twitch_automod.words);
		}
		//Manage hype chat content
		if (chatMess.twitch_hypeChat) {
			hypeChat.value = chatMess.twitch_hypeChat;
		}
		isAnnouncement.value = chatMess.twitch_announcementColor != undefined;
		watch(
			() => chatMess.twitch_isSuspicious,
			() => updateBadges(),
		);
		watch(
			() => chatMess.is_saved,
			() => updateSavedState(),
		);
	}

	//Pre compute some classes to reduce watchers count on "classes" getter
	const staticClassesList = ["chatmessageholder", "chatMessage"];
	if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
		staticClassesList.push("whisper");
	} else {
		if (props.messageData.twitch_isSlashMe) staticClassesList.push("slashMe");
		if (props.messageData.twitch_isHighlighted) staticClassesList.push("highlighted");
		if (props.messageData.type === "message" && props.messageData.hasMention) {
			highlightedWords.push(storeAuth.twitch.user.login);
			highlightedWords.push(
				...((storeParams.appearance.highlightMentions_custom.value as string[]) || []),
			);
		}
		if (isAnnouncement.value) {
			staticClassesList.push("announcement", props.messageData.twitch_announcementColor!);
		}
	}

	//If it's a whisper, display recipient
	if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
		recipient.value = props.messageData.to;
	}

	//If it has a clip link, add clip card
	let clipId = "";
	const text = props.messageData.message_html;
	if (/twitch\.tv\/[^/]+\/clip\//gi.test(text)) {
		const matches = text.match(/twitch\.[^/]{2,10}\/[^/]+\/clip\/([^/?\s\\"<']+)/i);
		clipId = matches ? matches[1]! : "";
	} else if (/clips\.twitch\.tv\//gi.test(text)) {
		const matches = text.match(/clips\.twitch\.[^/]{2,10}\/([^/?\s\\"<']+)/i);
		clipId = matches ? matches[1]! : "";
	}

	if (clipId != "") {
		clipHighlightLoading.value = true;
		Utils.getHighlightOverPresence().then((res) => {
			highlightOverlayAvailable.value = res;
			clipHighlightLoading.value = false;
		});
		//Do it asynchronously to avoid blocking rendering
		void (async () => {
			const clip = await TwitchUtils.getClipById(clipId, 5);
			if (clip) {
				clipInfo.value = clip;
				if (
					clip.broadcaster_id == storeAuth.twitch.user.id &&
					!TwitchUtils.hasScopes([TwitchScopes.MANAGE_CLIPS])
				) {
					requestClipDLPermission.value = true;
				}
			}
		})();
	}

	TwitchUtils.highlightChunks(localMessageChunks.value, highlightedWords);

	staticClasses = staticClassesList;
	storeAccessibility.setAriaPolite(props.messageData.message);
	updateBadges();
});

onMounted(() => {
	//If message has just been posted and it has an occurenceCount value
	//make it bounce
	if (Date.now() - props.messageData.date < 500 && occurrenceCountEl.value) {
		void (async () => {
			await nextTick();
			const { default: gsap } = await import("gsap");
			gsap.fromTo(
				occurrenceCountEl.value,
				{ scaleY: 1.5, scaleX: 2 },
				{ delay: 0.25, immediateRender: false, scale: 1, duration: 0.2 },
			);
		})();
	}
});

/**
 * Called when rolling over the nick name
 */
function hoverNickName(_event: MouseEvent): void {
	if (props.messageData.type === "whisper") return;
	if (storeParams.features.userHistoryEnabled.value) {
		emit("showUserMessages", props.messageData);
	}
}

/**
 * Called when rolling out the nick name
 */
function outNickName(_event: MouseEvent): void {
	if (props.messageData.type === "whisper") return;
	if (storeParams.features.userHistoryEnabled.value) {
		emit("unscheduleMessageOpen", props.messageData);
	}
}

/**
 * Copy JSON data of the message
 */
function copyJSONOverride(): void {
	if (props.messageData.type === "whisper") {
		baseCopyJSON?.();
	} else {
		const answersBckp = props.messageData.answers;
		const answerToBckp = props.messageData.answersTo;
		//Remove data to avoid infinite JSON stringify recursion
		props.messageData.answers = [];
		props.messageData.answersTo = undefined;
		baseCopyJSON?.();
		props.messageData.answers = answersBckp;
		props.messageData.answersTo = answerToBckp;
	}
}

/**
 * Accept or reject an automoded chat message
 */
async function modMessage(accept: boolean): Promise<void> {
	if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) return;
	automodInProgress.value = true;
	storeChat.automodAction(accept, props.messageData);
	automodInProgress.value = false;
}

/**
 * Open a clip on a new tab
 */
function openClip(): void {
	window.open(clipInfo.value?.url, "_blank");
}

/**
 * Send a clip to the overlay
 */
async function clipHighlight(): Promise<void> {
	Utils.getHighlightOverPresence().then((res) => {
		highlightOverlayAvailable.value = res;
	});
	if (!highlightOverlayAvailable.value) {
		storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.OVERLAYS, "chathighlight");
		return;
	}

	clipHighlightLoading.value = true;
	const clipHighlightData: TwitchatDataTypes.ChatHighlightInfo = {
		date: props.messageData.date,
		message_id: props.messageData.id,
		clip: {
			url: clipInfo.value!.embed_url,
			// mp4:this.clipInfo!.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
			duration: clipInfo.value!.duration,
		},
		params: storeChat.chatHighlightOverlayParams,
		dateLabel: tm("global.date_ago"),
	};
	if (TwitchUtils.hasScopes([TwitchScopes.MANAGE_CLIPS])) {
		const clipSrcPath = await TwitchUtils.getClipsSrcPath([clipInfo.value!.id]);
		if (clipSrcPath.length > 0) {
			clipHighlightData.clip!.mp4 = clipSrcPath[0]!.landscape_download_url;
		}
	}
	PublicAPI.instance.broadcast("SET_CHAT_HIGHLIGHT_OVERLAY_CLIP", clipHighlightData);
	storeChat.highlightedMessageId = props.messageData.id;
	await Utils.promisedTimeout(1000);
	clipHighlightLoading.value = false;
}

/**
 * Requests for clip download scope
 */
function grantClipDLScope(): void {
	TwitchUtils.requestScopes([TwitchScopes.MANAGE_CLIPS]);
	watch(
		() => storeAuth.twitch.scopes,
		() => {
			requestClipDLPermission.value = !TwitchUtils.hasScopes([TwitchScopes.MANAGE_CLIPS]);
		},
		{ once: true },
	);
}

/**
 * Disable ad if a donor or redirect to ad params otherwise
 */
function disableAd(): void {
	//If we're a donor, just disable the ad and delete the message as a feedback
	if (storeAuth.donorLevel > -1 || storeAuth.isPremium) {
		storeChat.updateBotMessage({
			key: "twitchatAd",
			enabled: false,
			message: storeChat.botMessages.twitchatAd.message,
		});
		storeChat.deleteMessage(props.messageData, undefined, false);
	} else {
		openAdParams();
	}
}

/**
 * Open ad params page
 */
function openAdParams(): void {
	storeParams.openParamsPage(TwitchatDataTypes.ParameterPages.AD);
}

/**
 * Apply custom highlight colors
 */
function applyStylesOverride(): void {
	//Do not apply highlights on announcement.
	//Styles would conflict
	if (isAnnouncement.value || !baseApplyStyles) return;
	baseApplyStyles();
}

/**
 * Stop auto spoiling this user's messages
 */
function stopAutoSpoil(): void {
	const m = props.messageData as TwitchatDataTypes.MessageChatData;
	m.spoiler = false;
	m.autospoiled = false;
	m.user.noAutospoil = true;
	if (props.childrenList) {
		props.childrenList.forEach((m) => (m.spoiler = false));
	}
}

/**
 * Called when "saved" state is changed
 */
function updateSavedState(): void {
	const m = props.messageData as TwitchatDataTypes.MessageChatData;
	const badgeIndex = infoBadges.value.findIndex(
		(v) => v.type == TwitchatDataTypes.MessageBadgeDataType.SAVED,
	);
	if (m.is_saved) {
		if (badgeIndex == -1) {
			infoBadges.value.push({ type: TwitchatDataTypes.MessageBadgeDataType.SAVED });
		}
	} else {
		if (badgeIndex > -1) {
			infoBadges.value.splice(badgeIndex, 1);
		}
	}
}

function updateBadges(): void {
	const mess = props.messageData;
	const localInfoBadges: TwitchatDataTypes.MessageBadgeData[] = [];

	if (mess.cyphered) localInfoBadges.push({ type: "cyphered" });

	if (channelInfo.value?.is_raider) {
		localInfoBadges.push({ type: TwitchatDataTypes.MessageBadgeDataType.RAIDER });
	}

	//Creation date is loaded asynchronously, watch for it if requested
	if (storeParams.appearance.recentAccountUserBadge.value === true) {
		const setRecentBadge = (list: TwitchatDataTypes.MessageBadgeData[]) => {
			//Don't show the warning for ourself
			if (mess.user.id == storeAuth.twitch.user.id) return;
			const age = Date.now() - (mess.user.created_at_ms || 0);
			if (age < 14 * 24 * 60 * 60000) {
				const label = Utils.elapsedDuration(mess.user.created_at_ms || 0);
				list.push({
					type: TwitchatDataTypes.MessageBadgeDataType.NEW_ACCOUNT,
					label,
					tooltipLabelParams: { DURATION: label },
				});
			}
		};
		setRecentBadge(localInfoBadges);
		if (props.messageData.user.created_at_ms == undefined) {
			watch(
				() => mess.user.created_at_ms,
				() => setRecentBadge(infoBadges.value),
			);
		}
	}

	//Define message badges (these are different from user badges!)
	if (mess.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
		localInfoBadges.push({ type: TwitchatDataTypes.MessageBadgeDataType.WHISPER });
	} else if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
		//Add twitchat's automod badge
		if (mess.automod) {
			localInfoBadges.push({
				type: TwitchatDataTypes.MessageBadgeDataType.AUTOMOD,
				tooltip:
					"<strong>" + t("chat.message.automod_rule") + "</strong> " + mess.automod.label,
			});
		}

		//Add "first day on your chat" badge
		if (
			channelInfo.value?.is_new &&
			!props.messageData.twitch_isFirstMessage &&
			storeParams.appearance.firstUserBadge.value === true
		) {
			localInfoBadges.push({ type: TwitchatDataTypes.MessageBadgeDataType.NEW_USER });
		}

		if (props.messageData.twitch_isSuspicious) {
			const users = props.messageData.twitch_sharedBanChannels?.map((v) => v.login) ?? [];
			if (users.length > 0) {
				userBannedOnChannels.value = users
					.join(", ")
					.replace(/(.*),/, "$1 " + t("global.and"));
			}
			const tt =
				users.length > 0
					? t("chat.message.banned_in", { CHANNELS: userBannedOnChannels.value })
					: "";
			localInfoBadges.push({
				type: TwitchatDataTypes.MessageBadgeDataType.SUSPICIOUS_USER,
				label: users.length > 1 ? "(x" + users.length + ")" : "",
				tooltip: tt,
			});
		}

		if (mess.twitch_isRestricted)
			localInfoBadges.push({ type: TwitchatDataTypes.MessageBadgeDataType.RESTRICTED_USER });
		if (mess.twitch_isReturning === true)
			localInfoBadges.push({
				type: TwitchatDataTypes.MessageBadgeDataType.RETURNING_CHATTER,
			});
		if ((mess.twitch_watchStreak || 0) > 0)
			localInfoBadges.push({
				type: TwitchatDataTypes.MessageBadgeDataType.WATCH_STREAK,
				label: mess.twitch_watchStreak!.toString(),
			});
		if (mess.twitch_isFirstMessage === true)
			localInfoBadges.push({
				type: TwitchatDataTypes.MessageBadgeDataType.FIRST_TIME_CHATTER,
			});
		if (mess.twitch_gigantifiedEmote || mess.twitch_animationId)
			localInfoBadges.push({ type: TwitchatDataTypes.MessageBadgeDataType.POWER_UP });

		if (
			mess.todayFirst === true &&
			mess.twitch_isFirstMessage !== true &&
			mess.twitch_isReturning !== true &&
			storeParams.appearance.helloBadge.value === true &&
			props.lightMode === false
		)
			localInfoBadges.push({
				type: TwitchatDataTypes.MessageBadgeDataType.FIRST_MESSAGE_TODAY,
			});

		if (mess.twitch_hypeChat) {
			const currency =
				({ EUR: "€", USD: "$", GBP: "£" } as Record<string, string>)[
					mess.twitch_hypeChat.currency
				] || mess.twitch_hypeChat.currency;
			localInfoBadges.push({
				type: TwitchatDataTypes.MessageBadgeDataType.HYPE_CHAT,
				label: currency + mess.twitch_hypeChat.amount,
			});
		}
	}

	infoBadges.value = localInfoBadges;
}
</script>

<style scoped lang="less">
.chatmessageholder {
	&.highlighted {
		.message {
			background-color: var(--color-primary);
			color: #fff;
			padding: 0 0.5em;
		}
	}

	&.animation_simmer {
		border-radius: 0;
		padding: 1em;
		background: linear-gradient(90deg, #3866dd, #ff4c5b);
		z-index: 0;
		color: #fff;
		&::before {
			content: "";
			top: 0.75em;
			left: 0.75em;
			z-index: -1;
			width: calc(100% - 1.5em);
			height: calc(100% - 1.5em);
			position: absolute;
			background-color: var(--color-dark);
		}
	}

	&.animation_rainbow-eclipse {
		border-radius: 0;
		padding: 1em;
		overflow: hidden;
		z-index: 0;
		color: #fff;
		&::before {
			content: "";
			top: 0.75em;
			left: 0.75em;
			z-index: -1;
			width: calc(100% - 1.5em);
			height: calc(100% - 1.5em);
			position: absolute;
			background-color: var(--color-dark);
		}
		.gradientBg {
			z-index: -2;
			filter: blur(3px);
			position: absolute;
			overflow: hidden;
			height: calc(100% - 0.5em);
			width: calc(100% - 0.5em);
			margin-left: -0.75em;
			margin-top: -0.75em;
			border-radius: 3px;
			top: 1em;
			left: 1em;
			&::before {
				animation: rotate 4s linear infinite;
				background-image: conic-gradient(#b23ff8, #3cc890, #38a7ca, #b23ff8);
				background-position: 0 0;
				background-repeat: no-repeat;
				content: "";
				height: 99999px;
				left: 50%;
				position: absolute;
				top: 50%;
				transform: translate(-50%, -50%) rotate(0deg);
				width: 99999px;
				z-index: 0;
			}
		}

		@keyframes rotate {
			100% {
				transform: translate(-50%, -50%) rotate(1turn);
			}
		}
	}

	&.animation_cosmic-abyss {
		border-radius: 0;
		padding: 1em;
		z-index: 0;
		color: #fff;
		&::before {
			content: "";
			top: 0.75em;
			left: 0.75em;
			z-index: -1;
			width: calc(100% - 1.5em);
			height: calc(100% - 1.5em);
			position: absolute;
			background-color: var(--color-dark);
		}

		.noiseBg {
			z-index: -2;
			position: absolute;
			overflow: hidden;
			height: 100%;
			width: 100%;
			margin-left: -1em;
			margin-top: -1em;
			border-radius: 3px;
			img {
				width: 100%;
				object-fit: cover;
				position: absolute;
				top: 0;
				left: 0;
				&:nth-child(2) {
					opacity: 0;
					animation: fadeInOut 3s infinite linear;
				}
			}
			@keyframes fadeInOut {
				0%,
				100% {
					opacity: 0;
				}
				50% {
					opacity: 1;
				}
			}
		}
	}

	&.gigantifiedEmote {
		:deep(.chunk:last-child .emote) {
			height: 5em;
			max-height: 5em;
			display: block;
		}
	}

	&.slashMe {
		.message {
			font-style: italic;
		}
	}

	&.censor {
		&.deleted,
		.messageChild.deleted {
			.message,
			&.messageChild.deleted {
				.text,
				.textTranslation {
					display: none;
				}
			}
			&:hover {
				.message,
				&.messageChild {
					.text {
						display: inline;
					}
					.textTranslation {
						display: block;
					}
					.deleted {
						display: none;
					}
				}
			}
		}
	}

	&.deleted {
		opacity: 0.35;
		transition: opacity 0.2s;
		&:not(.censor) {
			.message,
			&.messageChild.deleted {
				text-decoration: line-through;
			}
		}
		&:hover {
			opacity: 1;
			.message,
			&.messageChild.deleted {
				text-decoration: none;
			}
		}
	}

	&.fade:not(.deleted) {
		opacity: 0.35;
		transition: opacity 0.2s;
		&:hover {
			opacity: 1;
		}
	}

	&.cleared:not(.deleted) {
		opacity: 0.35;
		transition: opacity 0.2s;
		&:hover {
			opacity: 1;
		}
	}

	&.tracked {
		color: var(--color-text);
		background-color: var(--color-secondary-fader);
		text-shadow: var(--text-shadow-contrast);
	}

	.icon {
		// opacity: 0.75;
		height: 1em;
		vertical-align: middle;

		&:not(:last-child) {
			margin-right: 0.25em;
		}

		&.convBt {
			cursor: pointer;
			margin-bottom: -0.4em;
			:deep(svg) {
				height: 1em;
			}
		}
	}
	.mod {
		display: inline-flex;
		vertical-align: middle;
	}

	.infoBadges,
	.noAutospoilBt {
		margin-right: 0.25em;
		font-size: 1em;
		max-height: 1em;
		padding: 0 0.15em;
		border-radius: 0.25em;
		vertical-align: middle;
	}

	.message {
		.text {
			word-break: break-word;
		}
		:deep(.emote) {
			height: 1.75em;
			display: inline-block;
		}
	}

	.userBadges {
		gap: 2px;
		display: inline-flex;
		flex-direction: row;
		color: var(--color-text);
		margin-right: 0.25em;
		vertical-align: middle;
	}

	.badge,
	:deep(.customUserBadge) {
		width: 1em;
		height: 1em;
		vertical-align: middle;

		&.mini {
			display: inline-block;
			width: 0.4em;
			height: 1em;
			margin: 0 1px 0px 0;
			&.prediction {
				width: 1em;
				border-radius: 50%;
				margin-right: 0.25em;
				&.pink {
					background-color: #f50e9b;
				}
				&.blue {
					background-color: #387aff;
				}
			}
			&.vip {
				background-color: #e00bb9;
			}
			&.subscriber {
				background-color: #9147ff;
			}
			&.premium {
				background-color: #00a3ff;
			}
			&.moderator {
				background-color: #39db00;
			}
			&.staff {
				background-color: #666666;
			}
			&.broadcaster {
				background-color: #ff0000;
			}
			&.partner {
				background: linear-gradient(
					0deg,
					rgba(145, 71, 255, 1) 0%,
					rgba(145, 71, 255, 1) 40%,
					rgba(255, 255, 255, 1) 41%,
					rgba(255, 255, 255, 1) 59%,
					rgba(145, 71, 255, 1) 60%,
					rgba(145, 71, 255, 1) 100%
				);
			}
			&.founder {
				background: linear-gradient(0deg, #e53fcc 0%, #884ef6 100%);
			}
			&.ambassador {
				background: linear-gradient(0deg, #40e4cb 0%, #9048ff 100%);
			}
		}
	}

	.login {
		cursor: pointer;
		font-weight: bold;
		text-decoration: none;
		text-wrap: nowrap;
		// -webkit-text-stroke: fade(#000, 50%) .25px;
		&:hover {
			background-color: var(--background-color-fader);
			border-radius: 3px;
		}
		.translation {
			font-weight: normal;
			font-size: 0.9em;
		}
		&::after {
			content: ": ";
			display: inline-block;
		}
	}

	.occurrenceCount {
		cursor: default;
		display: inline-block;
		background: var(--color-primary);
		padding: 0.2em 0.4em;
		margin-right: 0.25em;
		font-weight: bold;
		border-radius: 10px;
		color: var(--color-light);
	}

	.pronoun {
		border-radius: 3px;
		color: var(--color-text);
		border: 1px solid var(--color-text-fade);
		padding: 0 2px;
		margin-right: 0.25em;
	}

	.sharedBan {
		color: var(--color-secondary);
		font-weight: bold;
		margin-right: 0.25em;
	}

	.messageChild {
		position: relative;
		word-break: break-word;
		:deep(a) {
			word-break: break-all;
		}

		:deep(mark) {
			font-weight: normal;
			background-color: var(--color-primary);
			color: var(--color-light);
			text-shadow: var(--text-shadow-contrast);
			padding: 0px 5px;
		}
		.text {
			margin-left: 0.25em;
			position: relative;
			&::before {
				content: "┕";
				color: var(--color-secondary);
				position: relative;
				font-size: 1em;
				top: 0.5em;
				margin-right: -0.25em;
				margin-left: -0.25em;
			}
			&:hover {
				outline: 1px solid var(--color-text-fade);
			}
		}
	}

	.clip {
		align-self: center;
		display: flex;
		flex-direction: row;
		border-radius: 0.25em;
		padding: 0.5em;
		position: relative;
		flex-wrap: wrap;

		img {
			cursor: pointer;
			object-fit: cover;
			width: max(50%, 190px);
			min-width: 190px;
			flex-basis: 190px;
		}

		.infos {
			padding: 0 0.5em;
			min-width: 150px;
			flex: 1;
			.title {
				font-weight: bold;
				margin-bottom: 0.25em;
				cursor: pointer;
			}
			.subtitle {
				font-size: 0.8em;
			}
			.highlightBt {
				font-size: 0.8rem;
			}
			.alertIcon {
				height: 1rem;
				margin: 0 0 0.5em 0.5em;
			}
		}
	}

	&.blockedUser {
		cursor: pointer;
		.blockedMessage {
			font-style: italic;
			color: var(--color-alert);
		}
	}

	&.automod {
		margin-top: 0.25em;
		border-radius: 0.25em;
		background-color: var(--color-alert-fader);
		padding-top: 0;

		.automod {
			background-color: var(--color-alert);
			padding: 0.25em;
			border-top-left-radius: 0.5em;
			border-top-right-radius: 0.5em;
			margin: -0.25em; //Expand over holder's padding
			margin-bottom: 10px;
			display: flex;
			flex-direction: row;
			align-items: center;

			img {
				height: 1.25em;
				margin-right: 0.5em;
			}

			.header {
				color: var(--color-light);
				flex-grow: 1;
			}

			.actions {
				.button {
					border-radius: 0.5em;
					&:not(:last-child) {
						margin-right: 0.5em;
					}
				}
			}
		}

		.login {
			color: var(--color-text) !important;
		}
	}

	&.cyphered {
		background-image: repeating-linear-gradient(
			-45deg,
			#ffffff10,
			#ffffff10 20px,
			#ffffff30 20px,
			#ffffff30 40px
		);
	}

	&.whisper,
	&.cyphered {
		background-color: var(--color-text-inverse);
		@c1: rgba(0, 0, 0, 0);
		@c2: var(--background-color-fadest);
		background-image: repeating-linear-gradient(-45deg, @c1, @c1 20px, @c2 20px, @c2 40px);
		.message {
			font-style: italic;
		}
	}

	.noFollowBadge {
		height: 1em;
		margin-right: 0.25em;
		vertical-align: middle;
	}

	&.announcement {
		border-radius: 0;
		border-image-slice: 1;
		border-left: 0.6em solid var(--background-color-fader);
		border-right: 0.6em solid var(--background-color-fade);
		padding-top: 0;
		padding-bottom: 0.25em;
		background-color: var(--background-color-fadest);

		.announcementHolder {
			display: flex;
			margin: 0;
			padding: 0.2em;
			margin-bottom: 0.25em;
			flex-direction: row;
			justify-content: center;
			background-color: var(--background-color-fadest);
			width: calc(100% + 0.5em);
			margin-left: -0.25em;

			img {
				height: 1em;
				margin-right: 0.5em;
			}

			.header {
				color: var(--color-text);
			}
		}
		&.purple {
			border-image-source: linear-gradient(#9146ff, #ff75e6) !important;
		}
		&.blue {
			border-image-source: linear-gradient(#00d6d6, #9146ff) !important;
		}
		&.green {
			border-image-source: linear-gradient(#00db84, #57bee6) !important;
		}
		&.orange {
			border-image-source: linear-gradient(#ffb31a, #e0e000) !important;
		}

		padding: 0 0.25em;
	}

	.ctas {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.5em;
		margin-top: 0.5em;
	}

	.answersTo {
		margin-left: 0.5em;
		margin-bottom: 4px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		opacity: 0.75;
		font-size: 0.9em;
		cursor: default;
		width: calc(100% - 1em);
		&.expand {
			white-space: unset;
			overflow: visible;
			text-overflow: unset;
		}
	}
}
</style>
