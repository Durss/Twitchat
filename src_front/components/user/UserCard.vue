<template>
	<div class="usercard sidePanel" v-if="user" ref="rootEl">
		<div class="content">
			<template v-if="loading">
				<ClearButton aria-label="close" @click="closeCard()" />
				<div class="header">
					<Icon name="loader" alt="loading" class="loader" />
					<div class="title">
						<a :href="profilePage" target="_blank">{{ user.displayName }}</a>
					</div>
				</div>
			</template>

			<template v-else-if="error">
				<ClearButton aria-label="close" @click="closeCard()" />
				<div class="header">
					<div class="title">
						<span class="label">{{ user.displayName }}</span>
					</div>
				</div>

				<div class="card-item alert errorMessage">{{ t("error.user_profile") }}</div>
			</template>

			<template v-else-if="!loading && !error">
				<ClearButton
					aria-label="close"
					@click="closeCard()"
					v-show="!manageBadges && !manageUserNames"
				/>
				<div class="header" v-show="!manageBadges && !manageUserNames">
					<a :href="profilePage" target="_blank">
						<div class="avatar">
							<img
								v-if="user!.avatarPath"
								:src="user!.avatarPath"
								alt="avatar"
								class="large"
								referrerpolicy="no-referrer"
							/>

							<img
								v-if="!isOwnChannel && channel?.avatarPath"
								:src="channel.avatarPath"
								@click.capture.prevent="resetChanContext()"
								alt="avatar"
								class="mini"
								:style="{ borderColor: channelColor }"
								v-tooltip="channel.displayName"
								referrerpolicy="no-referrer"
							/>
						</div>

						<div class="live" v-if="currentStream">
							LIVE -
							<span class="viewers"
								>{{ currentStream.viewer_count }}<Icon name="user"
							/></span>
						</div>
					</a>
					<div class="title">
						<CustomBadgeSelector
							class="customBadges"
							:user="user"
							@manageBadges="manageBadges = true"
							:channelId="channel!.id"
							@limitReached="manageBadges = true"
						/>

						<img
							v-for="b in badges"
							:key="b.id"
							class="badge"
							:src="b.icon.hd"
							:alt="b.title"
							v-tooltip="b.title"
						/>

						<CustomUserBadges
							:tooltip="t('usercard.remove_badgesBt')"
							:user="user"
							@select="removeCustomBadge"
						/>

						<template v-if="!edittingLogin">
							<a :href="profilePage" target="_blank" class="nickname">
								<span class="label">{{ user.displayName }}</span>
								<span class="translation" v-if="translateUsername"
									>({{ user.login }})</span
								>
							</a>

							<tooltip
								tag="button"
								interactive
								class="editLoginBt"
								@click="editLogin()"
							>
								<template #default>
									<Icon name="edit" theme="secondary" />
								</template>

								<template #content>
									<div style="text-align: center">
										<div>{{ t("usercard.edit_loginBt_tt") }}</div>
										<div
											class="list"
											v-if="
												Object.keys(storeUsers.customUsernames).length > 0
											"
										>
											<TTButton
												light
												secondary
												small
												icon="edit"
												@click="manageUserNames = true"
												>{{ t("usercard.manage_usernamesBt") }}</TTButton
											>
										</div>
									</div>
								</template>
							</tooltip>
						</template>

						<form
							v-else
							class="form editLoginForm"
							@submit.prevent="submitCustomLogin()"
						>
							<input
								class=""
								type="text"
								:placeholder="t('global.login_placeholder')"
								v-model="customLogin"
								ref="customUsername"
								maxlength="25"
							/>
							<TTButton type="submit" icon="checkmark"></TTButton>
						</form>
					</div>
					<span v-if="user.displayName != user.displayNameOriginal" class="originalName"
						>({{ user.displayNameOriginal }})</span
					>
					<span v-if="isTwitchProfile && user.pronouns" class="pronouns"
						>({{ user.pronounsLabel }})</span
					>
					<div class="userID" v-tooltip="t('global.copy')" @click="copyID()" ref="userID">
						#{{ user.id }}
					</div>
				</div>

				<ChatModTools
					v-if="isTwitchProfile && canModerate"
					class="modActions"
					:messageData="fakeModMessage"
					:canDelete="false"
					:canMonitor="
						fakeModMessage?.user.channelInfo[fakeModMessage.channel_id] &&
						fakeModMessage?.platform == 'twitch'
					"
					canBlock
					v-show="!manageBadges && !manageUserNames"
					@actionComplete="loadHistory(user.id)"
				/>

				<div class="scrollable" v-show="!manageBadges && !manageUserNames">
					<div class="infoList" v-if="isTwitchProfile">
						<div
							:class="{
								info: true,
								recent:
									Date.now() - (user.created_at_ms || 0) <
									14 * 24 * 60 * 60 * 1000,
							}"
							v-tooltip="t('usercard.creation_date_tt') + '\n' + createDate"
						>
							<Icon name="alert" alt="recent account" class="icon recent" />
							<Icon name="date" alt="account creation date" class="icon" />
							{{ createDateElapsed }}
						</div>

						<div class="info" v-if="followersCount > -1">
							<Icon name="follow_outline" class="icon" />{{
								t("usercard.followers", { COUNT: followersCount }, followersCount)
							}}
						</div>

						<template v-if="isOwnChannel">
							<div class="info" v-if="subState && subStateLoaded">
								<Icon
									name="gift"
									alt="subscribed"
									class="icon"
									v-if="subState.is_gift"
								/>
								<Icon name="sub" alt="subscribed" class="icon" v-else />
								<i18n-t
									scope="global"
									tag="span"
									:keypath="
										subState.is_gift
											? 'usercard.subgifted'
											: 'usercard.subscribed'
									"
								>
									<template #TIER>{{
										{ "1000": 1, "2000": 2, "3000": 3, prime: "prime" }[
											subState.tier
										]
									}}</template>
									<template #GIFTER>{{ subState.gifter_name }}</template>
								</i18n-t>
							</div>
							<div class="info" v-else-if="subStateLoaded">
								<Icon name="sub" alt="subscribed" class="icon" />
								<span>{{ t("usercard.non_subscribed") }}</span>
							</div>

							<div
								class="info"
								v-if="canListFollowers && followDate && !is_self"
								v-tooltip="t('usercard.follow_date_tt')"
							>
								<Icon name="follow" alt="follow date" class="icon" />{{
									followDate
								}}
							</div>
							<div class="info" v-else-if="canListFollowers && !is_self">
								<Icon name="unfollow" alt="no follow" class="icon" />{{
									t("usercard.not_following")
								}}
							</div>
						</template>
					</div>

					<div class="banReason quote" v-if="banReason">
						<Icon name="ban" /> {{ banReason }}
					</div>

					<div class="ctas" v-if="isTwitchProfile">
						<form
							class="form warnForm"
							@submit.prevent="warnUser()"
							v-if="showWarningForm"
						>
							<TTButton
								type="button"
								icon="back"
								@click="showWarningForm = false"
								alert
							></TTButton>
							<input
								type="text"
								v-model="warningMessage"
								:placeholder="t('usercard.warn_placeholder')"
								maxlength="500"
								v-autofocus
							/>
							<TTButton
								type="submit"
								icon="checkmark"
								:disabled="warningMessage.length == 0"
								:loading="sendingWarning"
							></TTButton>
						</form>
						<template v-else>
							<TTButton
								v-if="canWhisper"
								small
								icon="whispers"
								@click="openWhispers()"
								>{{ t("usercard.whisperBt") }}</TTButton
							>
							<TTButton
								v-if="canModerate && canShoutout"
								small
								icon="shoutout"
								@click="shoutoutUser()"
								>{{ t("usercard.shoutoutBt") }}</TTButton
							>
							<TTButton
								v-if="canModerate && canWarn"
								small
								icon="alert"
								@click="showWarningForm = true"
								>{{ t("usercard.warnBt") }}</TTButton
							>
							<TTButton v-if="!is_tracked" small icon="magnet" @click="trackUser()">{{
								t("usercard.trackBt")
							}}</TTButton>
							<TTButton
								v-if="is_tracked"
								small
								icon="magnet"
								@click="untrackUser()"
								>{{ t("usercard.untrackBt") }}</TTButton
							>
							<TTButton
								v-if="storeTTS.params.enabled"
								small
								icon="tts"
								@click="toggleReadUser()"
								>{{ ttsReadBtLabel }}</TTButton
							>
						</template>
					</div>

					<div class="ctas">
						<TTButton
							type="link"
							small
							icon="newtab"
							:href="profilePage"
							target="_blank"
							>{{ t("usercard.profileBt") }}</TTButton
						>
						<template v-if="isTwitchProfile">
							<TTButton
								small
								type="link"
								icon="newtab"
								@click.stop="openUserCard($event, channel!.login)"
								:href="
									'https://www.twitch.tv/popout/' +
									channel!.login +
									'/viewercard/' +
									user!.login
								"
								target="_blank"
								>{{ t("usercard.viewercardBt") }}</TTButton
							>

							<TTButton
								small
								v-if="!isOwnChannel"
								type="link"
								icon="newtab"
								@click.stop="openUserCard($event)"
								:href="
									'https://www.twitch.tv/popout/' +
									storeAuth.twitch.user.login +
									'/viewercard/' +
									user!.login
								"
								target="_blank"
								>{{
									(storeAuth.twitch.user.displayName, storeAuth.twitch.user.login)
								}}</TTButton
							>

							<TTButton
								v-if="!canListModeratedChans"
								small
								secondary
								icon="mod"
								@click="grantModeratedScope()"
								>{{ t("usercard.moderator_viewercardBt") }}</TTButton
							>

							<div
								class="modItem"
								v-for="modedChan of moderatedChannelList_pinned.filter(
									(v) => v.broadcaster_id != channel!.id,
								)"
							>
								<TTButton
									small
									type="link"
									icon="newtab"
									v-tooltip="
										t('usercard.moderator_viewercardBt_tt', {
											CHANNEL: modedChan.broadcaster_name,
										})
									"
									@click.stop="openUserCard($event, modedChan.broadcaster_login)"
									:href="
										'https://www.twitch.tv/popout/' +
										modedChan.broadcaster_login +
										'/viewercard/' +
										user!.login
									"
									target="_blank"
									>{{ modedChan.broadcaster_name }}</TTButton
								>
								<TTButton icon="unpin" @click="unpinModIem(modedChan)"></TTButton>
							</div>

							<tooltip
								interactive
								trigger="click"
								:maxWidth="600"
								:inlinePositioning="false"
								:interactiveDebounce="1000"
								:theme="storeCommon.theme"
							>
								<template #default>
									<TTButton
										v-if="
											Object.keys(moderatedChannelList_pinned).length <
											moderatedChannelList.length
										"
										icon="add"
										secondary
									></TTButton>
								</template>
								<template #content>
									<div class="modList">
										<div
											class="modItem"
											v-for="modedChan in moderatedChannelList.filter(
												(v) =>
													moderatedChannelList_pinned.findIndex(
														(u) => u.broadcaster_id == v.broadcaster_id,
													) == -1,
											)"
										>
											<TTButton
												small
												icon="mod"
												@click.stop="
													openUserCard(
														$event,
														modedChan.broadcaster_login,
													)
												"
												target="_blank"
												>{{ modedChan.broadcaster_name }}</TTButton
											>
											<TTButton
												icon="pin"
												@click="pinModIem(modedChan)"
											></TTButton>
										</div>
									</div>
								</template>
							</tooltip>
						</template>
					</div>

					<div class="card-item secondary liveInfo" v-if="currentStream">
						<div class="header">
							<div class="title">{{ t("usercard.streaming") }}</div>
						</div>
						<div class="infos">
							<div class="title">{{ currentStream.title }}</div>
							<mark class="game">{{ currentStream.game_name }}</mark>
						</div>
					</div>

					<div class="card-item description quote" v-if="userDescription">
						{{ userDescription }}
					</div>

					<div class="card-item messages" v-if="messageHistory.length > 0">
						<div class="header">
							<h2 class="title">{{ t("usercard.messages") }}</h2>
						</div>

						<div class="ctas" v-if="storeGroq.enabled && storeGroq.connected">
							<TTButton
								v-if="!showGroqForm"
								@click="showGroqForm = true"
								icon="groq"
								v-newflag="{
									date: Config.instance.NEW_FLAGS_DATE_V16,
									id: 'usercard_groq',
								}"
								small
								>{{ t("groq.summarize_bt") }}</TTButton
							>

							<GroqSummaryFilterForm
								class="groq"
								v-if="showGroqForm"
								mode="all"
								:messageList="messageHistory"
								@close="showGroqForm = false"
								@complete="closeCard()"
							/>
						</div>

						<div class="list" ref="messagelist">
							<div class="subholder" v-for="m in messageHistory" :key="m.id">
								<MessageItem class="message" disableConversation :messageData="m" />
							</div>
						</div>
					</div>
				</div>
			</template>

			<div class="holder" ref="holder" v-if="manageBadges">
				<CustomBadgesManager class="scrollable" @close="manageBadges = false" />
			</div>

			<div class="holder" ref="holder" v-if="manageUserNames">
				<CustomUserNameManager class="scrollable" @close="manageUserNames = false" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import StoreProxy from "@/store/StoreProxy";
import DataStore from "@/store/DataStore";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeCommon as useStoreCommon } from "@/store/common/storeCommon";
import { storeGroq as useStoreGroq } from "@/store/groq/storeGroq";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeTTS as useStoreTTS } from "@/store/tts/storeTTS";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Utils from "@/utils/Utils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap/gsap-core";
import type { Badges } from "tmi.js";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import ClearButton from "../ClearButton.vue";
import TTButton from "../TTButton.vue";
import GroqSummaryFilterForm from "../GroqSummaryFilterForm.vue";
import MessageItem from "../messages/MessageItem.vue";
import ChatModTools from "../messages/components/ChatModTools.vue";
import CustomBadgeSelector from "./CustomBadgeSelector.vue";
import CustomBadgesManager from "./CustomBadgesManager.vue";
import CustomUserBadges from "./CustomUserBadges.vue";
import CustomUserNameManager from "./CustomUserNameManager.vue";
import { storeBluesky as useStoreBluesky } from "@/store/bluesky/storeBluesky";
import Config from "@/utils/Config";

const emit = defineEmits<{
	close: [];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeChat = useStoreChat();
const storeCommon = useStoreCommon();
const storeGroq = useStoreGroq();
const storeStream = useStoreStream();
const storeTTS = useStoreTTS();
const storeUsers = useStoreUsers();
const storeBluesky = useStoreBluesky();

const rootEl = useTemplateRef("rootEl");
const customUsernameRef = useTemplateRef("customUsername");
const userIDRef = useTemplateRef("userID");
const messagelistRef = useTemplateRef("messagelist");

const error = ref(false);
const loading = ref(true);
const edittingLogin = ref(true);
const showGroqForm = ref(false);
const manageBadges = ref(false);
const sendingWarning = ref(false);
const showWarningForm = ref(false);
const manageUserNames = ref(false);
const isTwitchProfile = ref(false);
const banReason = ref("");
const warningMessage = ref("");
const customLogin = ref("");
const createDate = ref("");
const createDateElapsed = ref("");
const followDate = ref("");
const channelColor = ref("");
const userDescription = ref("");
const canModerate = ref(false);
const isOwnChannel = ref(false);
const isSelfProfile = ref(false);
const user = ref<TwitchatDataTypes.TwitchatUser | null>(null);
const channel = ref<TwitchatDataTypes.TwitchatUser | null>(null);
const fakeModMessage = ref<TwitchatDataTypes.MessageChatData | null>(null);
const currentStream = ref<TwitchDataTypes.StreamInfo | null>(null);
const followersCount = ref(-1);
const badges = ref<TwitchatDataTypes.TwitchatUserBadge[]>([]);
const subState = ref<TwitchDataTypes.Subscriber | null>(null);
const subStateLoaded = ref(false);
const messageHistory = ref<TwitchatDataTypes.ChatMessageTypes[]>([]);
const dateOffset = ref(0);
const moderatedChannelList_pinned = ref<TwitchDataTypes.ModeratedUser[]>([]);
const canListFollowings = ref(false);
const canListFollowers = ref(false);
const canListModeratedChans = ref(false);
const canShoutout = ref(false);
const canWarn = ref(false);
const hasWhisperPerms = ref(false);

let dateOffsetTimeout: number = -1;
let messageBuildInterval: number = -1;
let panelClosed = true;

const canWhisper = computed(
	() => hasWhisperPerms.value && user.value!.id != storeAuth.twitch.user.id,
);

/**
 * Returns the login instead of the display name if the display name contains
 * mostly non-latin chars
 */
const translateUsername = computed(() => {
	const dname = user.value!.displayNameOriginal.toLowerCase();
	const uname = user.value!.login.toLowerCase();
	//If display name is different from username and at least half of the
	//display name's chars ar not latin chars, translate it
	return dname != uname && dname.replace(/^[^a-zA-Z0-9]*/gi, "").length < dname.length / 2;
});

/**
 * Gets if current profil is our own
 */
const is_self = computed(() => StoreProxy.auth.twitch.user.id === user.value?.id);

/**
 * Get if user is being tracked or not
 */
const is_tracked = computed(() => user.value!.is_tracked);

/**
 * Get a list of the channels we're a moderator on
 */
const moderatedChannelList = computed(() => storeAuth.twitchModeratedChannels);

const platform = computed((): TwitchatDataTypes.ChatPlatform => {
	const card = storeUsers.userCard;
	if (card) {
		return card.platform || card.user?.platform || "twitch";
	}
	return "twitch";
});

/**
 * Get user's profile page
 */
const profilePage = computed(() => {
	switch (platform.value) {
		case "twitch": {
			return "https://www.twitch.tv/" + user.value!.login;
		}
		case "youtube": {
			return "https://www.youtube.com/channel/" + user.value!.id;
		}
		case "tiktok": {
			return "https://www.tiktok.com/@" + user.value!.login;
		}
		case "bluesky": {
			return "https://bsky.app/profile/" + user.value!.login;
		}
	}
	return "#";
});

/**
 * Get the "read user's messages" label depedning on its current state
 */
const ttsReadBtLabel = computed(() => {
	if (!user.value) return "";
	const username = user.value.login.toLowerCase();
	const permissions: TwitchatDataTypes.PermissionsData = storeTTS.params.ttsPerms;
	let label = "";
	if (permissions.usersAllowed.findIndex((v) => v.toLowerCase() === username) == -1) {
		label = t("tts.read_user_start_light", { USER: username });
	} else {
		label = t("tts.read_user_stop_light", { USER: username });
	}
	return label;
});

/**
 * Open animation (replaces AbstractSidePanel.open)
 */
function openPanel(): Promise<void> {
	return new Promise((resolve) => {
		panelClosed = false;
		const el = rootEl.value;
		if (!el) {
			resolve();
			return;
		}
		gsap.set(el, { translateY: 0 });
		gsap.from(el, {
			duration: 0.4,
			translateY: "100%",
			clearProps: "transform",
			ease: "back.out",
			onComplete: () => resolve(),
		});
	});
}

/**
 * Close animation (replaces AbstractSidePanel.close)
 */
function closePanel(): Promise<void> {
	//contenteditable component crashes if it has focus when destroyed.
	//The following makes sure nothing has focus when closing the form.
	//This can also trigger some save process depending on the forms.
	if (document.activeElement) (document.activeElement as HTMLElement).blur();

	return new Promise((resolve) => {
		const el = rootEl.value;
		if (!el) {
			emit("close");
			resolve();
			return;
		}
		gsap.to(el, {
			duration: 0.25,
			translateY: "-100%",
			clearProps: "transform",
			ease: "back.in",
			onComplete: () => {
				emit("close");
				resolve();
			},
		});
	});
}

/**
 * Close the window when hitting escape key (replaces AbstractSidePanel.onKeyDown)
 */
function onSidePanelKeyDown(e: KeyboardEvent): void {
	if (panelClosed) return;
	const node = document.activeElement?.nodeName;
	if (
		e.key &&
		e.key.toLowerCase() == "escape" &&
		node != "INPUT" &&
		document.activeElement?.getAttribute("contenteditable") != "true"
	) {
		panelClosed = true;
		void closePanel();
	}
}

async function closeCard(): Promise<void> {
	storeUsers.openUserCard(null);
}

async function loadUserInfo(): Promise<void> {
	error.value = false;
	loading.value = true;
	isTwitchProfile.value = false;
	edittingLogin.value = false;
	manageBadges.value = false;
	manageUserNames.value = false;
	subState.value = null;
	subStateLoaded.value = false;
	currentStream.value = null;
	banReason.value = "";
	customLogin.value = "";
	createDate.value = "";
	followDate.value = "";
	userDescription.value = "";
	followersCount.value = -1;
	badges.value = [];
	messageHistory.value = [];
	isTwitchProfile.value = platform.value == "twitch";

	if (!storeUsers.userCard) {
		loading.value = false;
	}

	if (!isTwitchProfile.value) {
		loading.value = false;
		user.value = storeUsers.userCard!.user;
		customLogin.value = user.value?.displayName || "";
		loadHistory(user.value!.id);
		return;
	}

	try {
		let currentUser = user.value!;
		const loadFromLogin =
			currentUser.login != storeUsers.tmpDisplayName &&
			!currentUser.errored &&
			!currentUser.temporary;
		const users = await TwitchUtils.getUserInfo(
			loadFromLogin ? undefined : [currentUser.id],
			loadFromLogin ? [currentUser.login] : undefined,
		);
		if (users.length > 0) {
			const u = users[0]!;
			const chanInfo = currentUser.channelInfo[channel.value!.id];
			currentUser.login = u.login;
			currentUser.displayName = u.display_name;
			currentUser.displayNameOriginal = u.display_name;
			customLogin.value = storeUsers.customUsernames[u.id]?.name || u.display_name;
			createDate.value = Utils.formatDate(new Date(u.created_at));
			createDateElapsed.value = Utils.elapsedDuration(new Date(u.created_at).getTime());
			userDescription.value = u.description;
			if (!currentUser.avatarPath) currentUser.avatarPath = u.profile_image_url;
			currentUser.id = u.id;
			//Don't replace display name if already set.
			//Extensions like "Stream stickers" have a different display name
			//than the one sent back by the API.
			//Ex: when receiving s stream stickers event from pubsub, the display
			//name is "Stream Stickers", but its actual display name is "streamsticker".
			//This condition avoids replacing the first by the second.
			if (!currentUser.displayName) currentUser.displayName = u.display_name;

			//Adding partner badge if no badge is already specified
			if (chanInfo && chanInfo.badges?.length == 0) {
				const staticBadges: Badges = {};
				staticBadges[u.broadcaster_type] = "1";
				currentUser.channelInfo[channel.value!.id]!.badges =
					TwitchUtils.getBadgesFromRawBadges(channel.value!.id, undefined, staticBadges);
			}
			if (chanInfo) badges.value = currentUser.channelInfo[channel.value!.id]!.badges;

			//Async loading of data
			TwitchUtils.getCurrentStreamInfo([u.id]).then((v) => {
				currentStream.value = v[0]!;
			});
			if (chanInfo?.is_banned) {
				banReason.value = chanInfo?.banReason || "";
			} else {
				TwitchUtils.getBannedUsers(channel.value!.id, [u.id]).then((res) => {
					if (res.length > 0) {
						banReason.value = res[0]!.reason;
					}
				});
			}
			if (isOwnChannel.value) {
				TwitchUtils.getFollowerState(u.id).then((v) => {
					if (v) followDate.value = Utils.formatDate(new Date(v.followed_at));
				});
			}
			TwitchUtils.getFollowersCount([u.id]).then((v) => {
				followersCount.value = v[u.id] || 0;
			});
			if (TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) {
				TwitchUtils.getSubscriptionState([u.id]).then((v) => {
					subState.value = v.length > 0 ? v[0]! : null;
					subStateLoaded.value = true;
				});
			}
			storeUsers.loadUserPronouns(currentUser);
			fakeModMessage.value = {
				id: Utils.getUUID(),
				platform: platform.value,
				date: Date.now(),
				type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				user: currentUser,
				channel_id: channel.value!.id,
				message: "",
				message_html: "",
				message_chunks: [],
				message_size: 0,
				answers: [],
				is_short: false,
			};
			loadHistory(u.id);
		} else {
			error.value = true;
		}
	} catch (err) {
		console.log(err);
		error.value = true;
	}

	loading.value = false;
}

function pinModIem(item: TwitchDataTypes.ModeratedUser): void {
	moderatedChannelList_pinned.value.push(item);
	DataStore.set(
		DataStore.USERCARD_PINNED_CHANNEL,
		moderatedChannelList_pinned.value.map((v) => v.broadcaster_id),
	);
}

function unpinModIem(item: TwitchDataTypes.ModeratedUser): void {
	const index = moderatedChannelList_pinned.value.findIndex(
		(v) => v.broadcaster_id == item.broadcaster_id,
	);
	if (index == -1) return;
	moderatedChannelList_pinned.value.splice(index, 1);
	DataStore.set(
		DataStore.USERCARD_PINNED_CHANNEL,
		moderatedChannelList_pinned.value.map((v) => v.broadcaster_id),
	);
}

function openUserCard(event?: MouseEvent, channelName?: string): void {
	if (!channelName) {
		channelName = StoreProxy.auth.twitch.user.login;
	}
	let params = `scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no,
		width=350,height=${screen.availHeight},left=0,top=0`;
	const url = "https://www.twitch.tv/popout/" + channelName + "/viewercard/" + user.value!.login;
	try {
		window.open(url, "profilePage", params);
	} catch (error) {
		//Ignore it
	}
	if (event) {
		event.preventDefault();
		event.stopPropagation();
	}
}

/**
 * Open whispers with the user
 */
function openWhispers(): void {
	storeChat.openWhisperWithUser(user.value!);
	closeCard();
}

/**
 * Give a shoutout to the user
 */
function shoutoutUser(): void {
	storeUsers.shoutout(channel.value!.id, user.value!);
}

/**
 * Start tracking user's messages
 */
function trackUser(): void {
	storeUsers.trackUser(user.value!);
}

/**
 * Stop tracking user's messages
 */
function untrackUser(): void {
	storeUsers.untrackUser(user.value!);
}

/**
 * View the user card from our own chan
 */
function resetChanContext(): void {
	storeUsers.openUserCard(user.value);
}

/**
 * Send a warning to the user
 */
async function warnUser(): Promise<void> {
	if (warningMessage.value.length === 0) return;
	sendingWarning.value = true;
	await TwitchUtils.sendWarning(user.value!.id, warningMessage.value, channel.value!.id);
	await Utils.promisedTimeout(250);
	sendingWarning.value = false;
	showWarningForm.value = false;
}

/**
 * Start custom display name edition
 */
function editLogin(): void {
	edittingLogin.value = true;
	nextTick().then(() => {
		customUsernameRef.value!.focus();
		customUsernameRef.value!.select();
	});
}

/**
 * Called when setting a custom display name
 */
function submitCustomLogin(): void {
	edittingLogin.value = false;
	if (
		!storeUsers.setCustomUsername(
			user.value!,
			customLogin.value,
			channel.value!.id,
			user.value!.platform,
		)
	) {
		manageUserNames.value = true;
	}
	// Update customLogin from the actual displayname.
	// If clearing the custom login, the real display name is loaded back to the
	// "displayName" getter.
	customLogin.value = user.value!.displayName;
}

/**
 * Removes a custom badge from the user
 * @param badgeId
 */
function removeCustomBadge(badgeId: string): void {
	storeUsers.removeCustomBadge(user.value!.id, badgeId, channel.value!.id);
}

/**
 * Toggles whether the TTS should read this user's messages
 */
function toggleReadUser(): void {
	const permissions: TwitchatDataTypes.PermissionsData = storeTTS.params.ttsPerms;
	const read =
		permissions.usersAllowed.findIndex(
			(v) => v.toLowerCase() === user.value!.login.toLowerCase(),
		) == -1;
	storeTTS.ttsReadUser(user.value!, read);
}

/**
 * Push user ID to clipboard
 */
function copyID(): void {
	Utils.copyToClipboard(user.value!.id);
	gsap.from(userIDRef.value!, { scale: 1.5, ease: "back.out" });
}

function grantModeratedScope(): void {
	TwitchUtils.requestScopes([TwitchScopes.LIST_MODERATED_CHANS]);
}

/**
 * Detect ESC key to close window
 */
function onKeyUp(e: KeyboardEvent): void {
	if (!user.value) return;

	if (e.key == "Escape") {
		if (edittingLogin.value) {
			edittingLogin.value = false;
		} else {
			closeCard();
		}
		e.preventDefault();
		e.stopPropagation();
	}
}

/**
 * Build the message history chunk by chunk
 */
function loadHistory(uid: string): void {
	const messageList: TwitchatDataTypes.ChatMessageTypes[] = [];
	const allowedTypes: TwitchatDataTypes.TwitchatMessageStringType[] = [
		"following",
		"message",
		"reward",
		"subscription",
		"shoutout",
		"whisper",
		"ban",
		"unban",
		"cheer",
		"user_watch_streak",
		"youtube_subgift",
		"youtube_subscription",
		"tiktok_like",
		"tiktok_gift",
		"tiktok_sub",
		"low_trust_treatment",
	];
	for (const mess of storeChat.messages) {
		if (!allowedTypes.includes(mess.type)) continue;

		if (mess.type == "shoutout" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "following" && mess.user.id == uid) {
			messageList.push(mess);
		} else if ((mess.type == "ban" || mess.type == "unban") && mess.user.id == uid) {
			messageList.push(mess);
		} else if ((mess.type == "message" || mess.type == "whisper") && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "subscription" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "cheer" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "reward" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "user_watch_streak" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "youtube_subgift" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "youtube_subscription" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "tiktok_like" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "tiktok_gift" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "tiktok_sub" && mess.user.id == uid) {
			messageList.push(mess);
		} else if (mess.type == "low_trust_treatment" && mess.user.id == uid) {
			messageList.push(mess);
		}
		if (messageList.length > 100) break; //Limit message count for perf reasons
	}

	//Build messages by batch to avoid lag on open
	messageHistory.value = messageList.splice(-20);
	clearInterval(messageBuildInterval);
	messageBuildInterval = window.setInterval(() => {
		if (messageList.length == 0) clearInterval(messageBuildInterval);

		messageHistory.value.unshift(...messageList.splice(-5));

		if (messageHistory.value.length < 30) {
			nextTick(() => {
				const m = messagelistRef.value;
				if (!m) return;
				m.scrollTop = m.scrollHeight;
			});
		}
	}, 50);
}

onMounted(() => {
	let pinnedChanIds: string[] = [];
	try {
		pinnedChanIds =
			(JSON.parse(DataStore.get(DataStore.USERCARD_PINNED_CHANNEL) || "[]") as string[]) ||
			[];
	} catch (error) {
		pinnedChanIds = [];
	}
	if (!Array.isArray(pinnedChanIds)) pinnedChanIds = [];
	pinnedChanIds.forEach((id) => {
		const chan = moderatedChannelList.value.find((v) => v.broadcaster_id == id);
		if (!chan) return;
		moderatedChannelList_pinned.value.push(chan);
	});

	document.addEventListener("keydown", onSidePanelKeyDown);

	watch(
		() => storeUsers.userCard,
		async () => {
			const card = storeUsers.userCard;
			if (card && card.user) {
				const chanId = card.channelId ?? StoreProxy.auth.twitch.user.id;
				channel.value = storeUsers.getUserFrom(card.platform || "twitch", chanId, chanId);
				user.value = card.user;
				nextTick(() => {
					void openPanel();
				});
				while (user.value.temporary === true) {
					await Utils.promisedTimeout(250);
				}
				isOwnChannel.value =
					chanId == StoreProxy.auth.twitch.user.id ||
					chanId == StoreProxy.auth.youtube?.user.id ||
					chanId == StoreProxy.auth.bluesky?.user.id;
				isSelfProfile.value = user.value.id == StoreProxy.auth.twitch.user.id;
				//Check if message is from our chan or one we can moderate, and that this chan is not the current user
				canModerate.value =
					(moderatedChannelList.value.findIndex((v) => v.broadcaster_id === chanId) >
						-1 ||
						chanId == StoreProxy.auth.twitch.user.id) &&
					chanId != user.value.id;
				if (!isOwnChannel.value) {
					channelColor.value =
						storeStream.connectedTwitchChans.find((v) => v.user.id === chanId)?.color ||
						"#ffffff";
				}
				loadUserInfo();
				dateOffsetTimeout = window.setInterval(() => {
					dateOffset.value += 1000;
				}, 1000);
			} else {
				clearInterval(dateOffsetTimeout);
				if (user.value) {
					await closePanel();
				}
				user.value = null;
			}
		},
		{ immediate: true },
	);

	watch(
		() => storeAuth.twitch.scopes,
		() => {
			canListFollowings.value = TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWINGS]);
			canListFollowers.value = TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS]);
			canListModeratedChans.value = TwitchUtils.hasScopes([
				TwitchScopes.LIST_MODERATED_CHANS,
			]);
			canShoutout.value = TwitchUtils.hasScopes([TwitchScopes.SHOUTOUT]);
			canWarn.value = TwitchUtils.hasScopes([TwitchScopes.CHAT_WARNING]);
			hasWhisperPerms.value = TwitchUtils.hasScopes([
				TwitchScopes.WHISPER_READ && TwitchScopes.WHISPER_MANAGE,
			]);
			if (user.value) loadUserInfo();
		},
	);

	document.body.addEventListener("keyup", onKeyUp);
});

onBeforeUnmount(() => {
	clearInterval(messageBuildInterval);
	document.body.removeEventListener("keyup", onKeyUp);
	document.removeEventListener("keydown", onSidePanelKeyDown);
});
</script>

<style scoped lang="less">
.usercard {
	.content {
		.loader {
			margin: auto;
			display: block;
			width: 5em;
			height: 5em;
			padding: 1em;
		}

		.modList {
			gap: 0.5em;
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			max-width: 400px;
			padding: 0.5em;
		}
		.modItem {
			gap: 1px;
			display: flex;
			flex-direction: row;
			& > :first-child {
				border-top-right-radius: 0;
				border-bottom-right-radius: 0;
			}
			& > :last-child {
				border-top-left-radius: 0;
				border-bottom-left-radius: 0;
			}
		}

		.errorMessage,
		.warn {
			text-align: center;
		}

		& > .header,
		& > div > .header {
			display: flex;
			flex-direction: column;
			align-items: center;
			width: calc(100% - 3em);
			margin: 0 auto;
			flex-shrink: 0; //necessery for shit old safari -_-
			a {
				text-decoration: none;
			}

			.title {
				font-size: 1.5em;
				display: flex;
				align-items: center;
				justify-content: center;
				width: 100%;

				.customBadges {
					font-size: 0.8em;
					margin-right: 0.25em;
					z-index: 2;
				}

				.nickname {
					max-width: 80%;
					display: inline-block;

					.label {
						text-overflow: ellipsis;
						overflow: hidden;
						line-height: 1.2em;
						text-wrap: nowrap;
						width: 100%;
						display: inline-block;
					}

					.translation {
						font-style: italic;
						font-size: 0.8em;
						margin-left: 0.25em;
					}
				}

				.badge,
				:deep(.customUserBadge) {
					height: 0.8em;
					margin-right: 3px;
					&.customUserBadge {
						cursor: not-allowed;
					}
				}

				.editLoginBt {
					height: 0.7em;
					margin-left: 0.25em;
					flex-shrink: 0;
					.icon {
						height: 100%;
						display: block;
						:deep(svg) {
							vertical-align: top;
						}
					}
				}

				.editLoginForm {
					gap: 0;
					font-size: 1rem;
					display: flex;
					flex-direction: row;
					.button {
						border-top-left-radius: 0;
						border-bottom-left-radius: 0;
					}

					input {
						border-top-right-radius: 0;
						border-bottom-right-radius: 0;
					}
				}
			}

			.originalName {
				font-style: italic;
				margin-bottom: 0.25em;
			}

			.pronouns {
				border-radius: 3px;
				color: var(--color-text);
				border: 1px solid var(--color-text-fade);
				padding: 0 2px;
				font-size: 0.8em;
				margin-bottom: 0.25em;
			}

			.live {
				position: relative;
				display: block;
				background-color: var(--color-alert);
				color: var(--color-light);
				font-weight: bold;
				font-size: 0.7em;
				padding: 0.35em 0.75em;
				border-radius: 0.5em;
				width: fit-content;
				left: 50%;
				transform: translate(-50%, -50%);
				z-index: 1;
				box-shadow: 0 -0.25em 0.5em rgba(0, 0, 0, 0.5);

				.viewers {
					font-weight: normal;
					.icon {
						height: 0.8em;
						margin-left: 2px;
					}
				}
			}

			.userID {
				font-size: 0.7em;
				cursor: copy;
				z-index: 1;
			}

			.avatar {
				position: relative;
				.large {
					width: 5em;
					height: 5em;
					border-radius: 50%;
					margin: auto;
					display: block;
					transition:
						width 0.25s,
						height 0.25s,
						border-radius 0.25s;
					&:hover {
						width: 10em;
						height: 10em;
						border-radius: 5px;
					}
				}
				.mini {
					cursor: not-allowed;
					width: 2em;
					height: 2em;
					bottom: 0;
					right: -0.5em;
					border: 2px solid transparent;
					border-radius: 50%;
					position: absolute;
					box-shadow: -3px -1px 8px rgba(0, 0, 0, 1);
				}
			}
		}

		.infoList {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			gap: 0.5em;
			cursor: default;
			flex-shrink: 0; //necessery for shit old safari -_-
			.info {
				font-size: 0.9em;
				border-radius: 0.5em;
				border: 1px solid var(--color-text);
				padding: 0.25em 0.5em;
				.icon {
					height: 1em;
					margin-right: 0.5em;
					vertical-align: middle;
				}

				&.ban {
					.timeoutDuration {
						margin-left: 0.5em;
						// font-family: Azeret;
						font-size: 0.8em;
						font-variant-numeric: tabular-nums;
					}
				}
				&.recent {
					border-width: 0;
					color: var(--color-light);
					background-color: var(--color-secondary);
				}
				&:not(.recent) {
					.icon.recent {
						display: none;
					}
				}
			}
		}

		.liveInfo {
			align-self: center;
			flex-shrink: 0;
			.infos {
				.game {
					margin-top: 0.25em;
					display: inline-block;
				}
			}
		}

		.modActions {
			margin-top: -0.25em;
			margin-bottom: 0;
			align-self: center;
			flex-shrink: 0; //necessery for shit old safari -_-
		}

		.banReason {
			background-color: var(--color-alert-fadest);
		}

		.ctas {
			display: flex;
			flex-direction: row;
			justify-content: center;
			flex-wrap: wrap;
			gap: 0.5em;
			flex-shrink: 0; //necessery for shit old safari -_-

			.warnForm {
				gap: 0;
				display: flex;
				flex-direction: row;
				& > * {
					border-radius: 0;
					&:first-child {
						border-top-left-radius: var(--border-radius);
						border-bottom-left-radius: var(--border-radius);
					}
					&:last-child {
						border-top-right-radius: var(--border-radius);
						border-bottom-right-radius: var(--border-radius);
					}
				}
				.button {
					flex-shrink: 0;
					flex-basis: 1.5em;
				}
			}
		}

		.description {
			flex-shrink: 0;
			align-self: center;
			text-align: center;
		}

		.scrollable {
			overflow-y: auto;
			gap: 1em;
			display: flex;
			flex-direction: column;
			padding-bottom: 0.5em; //Avoid glitchy scroll when pressing down a button if at the bottom of the scrollable holder
			.card-item:not(.groq) {
				flex-shrink: 0;
			}
		}

		.messages {
			display: flex;
			flex-direction: column;

			&.messages {
				.list {
					gap: 1em;
					max-height: min(50vh, 300px);
					overflow-y: auto;
					text-align: left;
					.subholder {
						margin-bottom: 3px;
					}
				}
				.ctas {
					align-self: center;
					margin: 0.5em auto;
				}
			}
		}
	}
}
</style>
