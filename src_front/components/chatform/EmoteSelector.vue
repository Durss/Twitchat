<template>
	<div ref="rootEl" class="emoteselector" :class="classes">
		<div class="list" v-if="sStream.currentChatChannel.platform == 'youtube'">
			<div class="emotes">
				<img
					class="emote"
					v-for="e in youtubeEmotes"
					:key="e.id + e.code"
					:ref="e.id + e.code"
					loading="lazy"
					:src="e.images.url_1x"
					:alt="e.code"
					@mouseover="openTooltip($event, e)"
					@click="emit('select', e)"
				/>
			</div>
		</div>

		<div class="loader" v-else-if="filteredUsers.length == 0">
			<Icon class="loader" name="loader" />
			<p>{{ t("global.loading") }}</p>
		</div>

		<div class="list search" v-if="filteredUsers.length > 0 && filter">
			<div class="item">
				<div class="emotes">
					<div v-if="filteredEmotes.length == 0">{{ t("global.no_result") }}</div>
					<img
						class="emote"
						v-for="e in cappedFilteredEmotes"
						:key="e.id + e.code"
						:ref="e.id + e.code"
						loading="lazy"
						:src="e.images.url_1x"
						:alt="e.code"
						@mouseover="openTooltip($event, e)"
						@click="emit('select', e)"
					/>
					<span
						class="emoji"
						v-for="e in cappedFilteredEmojis"
						:key="e.emoji + e.shortcode"
						:ref="e.emoji + e.shortcode"
						:id="'emote_' + e.emoji + e.shortcode"
						@mouseover="openTooltip($event, e)"
						@click="emit('select', e)"
					>
						<img
							v-if="useEmojiImage(e)"
							class="emojiImage"
							loading="lazy"
							decoding="async"
							:src="getEmojiImageUrl(e)"
							:alt="e.shortcode"
							@error="onEmojiImageError(e)"
						/>
						<template v-else>{{ e.emoji }}</template></span
					>
				</div>
			</div>
		</div>

		<div ref="listEl" class="list" v-if="filteredUsers.length > 0 && !filter">
			<div
				class="userEtry"
				v-for="u in filteredUsers"
				:key="u.user.id"
				:data-section-id="u.user.id"
			>
				<div class="sticky">
					<img class="icon" :src="u.user.avatarPath" alt="profile pic" />
					<div class="title">{{ u.user.displayName }}</div>
				</div>

				<div class="emotes" v-if="visibleSections.has(u.user.id)">
					<img
						class="emote"
						v-for="e in u.emotes"
						:key="e.id + e.code"
						:ref="e.id + e.code"
						:id="'emote_' + e.id + e.code"
						loading="lazy"
						:src="e.images.url_1x"
						:alt="e.code"
						@mouseover="openTooltip($event, e)"
						@click="emit('select', e)"
					/>
				</div>
				<div
					v-else
					class="emotes"
					:style="{ height: getSectionHeight(u.user.id, u.emotes.length) + 'px' }"
				></div>
			</div>
			<div class="emojiSection" :data-section-id="'emojis'">
				<div class="sticky">
					<Icon name="emote" />
					<div class="title">Emojis</div>
				</div>
				<div
					v-for="(chunk, ci) in emojiChunks"
					:key="'emoji_' + ci"
					:data-section-id="'emoji_' + ci"
				>
					<div class="emotes" v-if="visibleSections.has('emoji_' + ci)">
						<span
							class="emoji"
							v-for="e in chunk"
							:key="e.emoji + e.shortcode"
							:ref="e.emoji + e.shortcode"
							:id="'emote_' + e.emoji + e.shortcode"
							@mouseover="openTooltip($event, e)"
							@click="emit('select', e)"
						>
							<img
								v-if="useEmojiImage(e)"
								class="emojiImage"
								loading="lazy"
								decoding="async"
								:src="getEmojiImageUrl(e)"
								:alt="e.shortcode"
								@error="onEmojiImageError(e)"
							/>
							<template v-else>{{ e.emoji }}</template></span
						>
					</div>
					<div
						v-else
						class="emotes"
						:style="{
							height: getSectionHeight('emoji_' + ci, chunk.length, true) + 'px',
						}"
					></div>
				</div>
			</div>
		</div>

		<div class="card-item userList" v-if="filteredUsers.length > 0 && !filter">
			<TTButton
				class="user"
				v-for="u in filteredUsers"
				:key="u.user.id"
				v-tooltip="u.user.displayName"
				@click="scrollTo(u.user.id)"
			>
				<img :src="u.user.avatarPath" alt="profile pic" class="avatar" />
			</TTButton>
			<TTButton class="user" v-tooltip="'Emojis'" @click="scrollTo('emojis')">
				<Icon name="emote" class="avatar" />
			</TTButton>
		</div>

		<TTButton
			class="grantBt"
			v-if="!canListUserEmotes"
			secondary
			icon="lock_fit"
			@click="grantEmoteScope()"
			>{{ t("global.emote_scope") }}</TTButton
		>

		<input
			v-if="filteredUsers.length > 0"
			type="text"
			v-autofocus
			v-model="filter"
			:placeholder="t('global.search_placeholder')"
			class="dark"
		/>
	</div>
</template>

<script setup lang="ts">
import { asset } from "@/composables/useAsset";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import Database from "@/store/Database";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import StoreProxy from "@/store/StoreProxy";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import BTTVUtils from "@/utils/emotes/BTTVUtils";
import FFZUtils from "@/utils/emotes/FFZUtils";
import SevenTVUtils from "@/utils/emotes/SevenTVUtils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { gsap } from "gsap/gsap-core";
import {
	computed,
	nextTick,
	onBeforeUnmount,
	onMounted,
	reactive,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useTippy } from "vue-tippy";
import Icon from "../Icon.vue";
import TTButton from "../TTButton.vue";

const props = withDefaults(
	defineProps<{
		popoutMode?: boolean;
	}>(),
	{
		popoutMode: false,
	},
);

const emit = defineEmits<{
	close: [];
	select: [emote: TwitchatDataTypes.Emote | TwitchatDataTypes.Emoji];
	onLoad: [];
}>();

const { t } = useI18n();
const sStream = useStoreStream();
const sChat = useStoreChat();
const sUsers = useStoreUsers();
const sParams = useStoreParams();
const emojiList = ref<TwitchatDataTypes.Emoji[]>([]);
const { getAsset } = asset();

const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

const users = ref<{ user: TwitchatDataTypes.TwitchatUser; emotes: TwitchatDataTypes.Emote[] }[]>(
	[],
);
const filter = ref("");
const youtubeEmotes = ref<TwitchatDataTypes.Emote[]>([]);
const listEl = useTemplateRef<HTMLDivElement>("listEl");
const visibleSections = reactive(new Set<string>());

const EMOJI_CHUNK_SIZE = 40;
const EMOTE_ITEM_SIZE = 34;
const EMOJI_ITEM_SIZE = 36;
const SEARCH_RESULTS_CAP = 200;

const sectionHeights = new Map<string, number>();
const tooltipCreated: { [key: string]: boolean } = {};
const failedEmojiImages = reactive<Record<string, boolean>>({});
let clickHandler!: (e: MouseEvent) => void;
let listScrollHandler: (() => void) | null = null;
let visibilityFrame = -1;

const EMOJI_IMAGE_BASE_URL = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/16.0.1/72x72";

const classes = computed(() => {
	return {
		"blured-background-window": props.popoutMode === false,
		popout: props.popoutMode,
	};
});

const canListUserEmotes = computed(() => {
	return TwitchUtils.hasScopes([TwitchScopes.READ_EMOTES]);
});

const filteredUsers = computed(() => {
	const chanId = sStream.currentChatChannel.id;
	const chanPlatform = sStream.currentChatChannel.platform;
	const res = users.value.filter((u) => {
		return (
			u.emotes.filter((e) => {
				if (e.platform != chanPlatform) return false;
				return e.ownerOnly != true || e.owner!.id == chanId;
			}).length > 0
		);
	});
	res.sort((a, b) => {
		if (a.user.id === chanId) return -1;
		if (b.user.id === chanId) return 1;
		const idA = parseInt(a.user.id);
		const idB = parseInt(b.user.id);
		if (idA < 10) return idA;
		if (idB < 10) return idB;
		if (a.user.is_bot) return 1;
		return a.user.login.localeCompare(b.user.login);
	});
	return res;
});

const filteredEmotes = computed(() => {
	let res: TwitchatDataTypes.Emote[] = [];
	const s = filter.value.toLowerCase();
	for (const u of filteredUsers.value) {
		for (const e of u.emotes) {
			if (e.code.toLowerCase().indexOf(s) > -1) {
				res.push(e);
			}
		}
	}
	return res;
});

const filteredEmojis = computed(() => {
	return emojiList.value.filter(
		(e) => e.shortcode.toLowerCase().indexOf(filter.value.toLowerCase()) > -1,
	);
});

const cappedFilteredEmotes = computed(() => filteredEmotes.value.slice(0, SEARCH_RESULTS_CAP));
const cappedFilteredEmojis = computed(() => filteredEmojis.value.slice(0, SEARCH_RESULTS_CAP));

const emojiChunks = computed(() => {
	const chunks: TwitchatDataTypes.Emoji[][] = [];
	for (let i = 0; i < emojiList.value.length; i += EMOJI_CHUNK_SIZE) {
		chunks.push(emojiList.value.slice(i, i + EMOJI_CHUNK_SIZE));
	}
	return chunks;
});

function normalizeEmojiCodepoint(codepoint: string): string {
	const normalized = codepoint.toLowerCase();
	if (normalized.includes("200d")) {
		return normalized;
	}
	return normalized.replace(/-fe0f/g, "");
}

function estimateHeight(itemCount: number, isEmoji: boolean): number {
	const itemSize = isEmoji ? EMOJI_ITEM_SIZE : EMOTE_ITEM_SIZE;
	const itemsPerRow = Math.floor(400 / itemSize);
	const rows = Math.ceil(itemCount / itemsPerRow);
	return rows * itemSize;
}

function getSectionHeight(sectionId: string, itemCount: number, isEmoji = false): number {
	return sectionHeights.get(sectionId) ?? estimateHeight(itemCount, isEmoji);
}

function getEmojiCodepoint(emoji: TwitchatDataTypes.Emoji): string {
	if (emoji.codepoint) return normalizeEmojiCodepoint(emoji.codepoint);
	return normalizeEmojiCodepoint(
		Array.from(emoji.emoji)
			.map((char) => char.codePointAt(0)?.toString(16))
			.filter((value): value is string => !!value)
			.join("-"),
	);
}

function getEmojiImageUrl(emoji: TwitchatDataTypes.Emoji): string {
	return `${EMOJI_IMAGE_BASE_URL}/${getEmojiCodepoint(emoji)}.png`;
}

function useEmojiImage(emoji: TwitchatDataTypes.Emoji): boolean {
	const codepoint = getEmojiCodepoint(emoji);
	return codepoint.length > 0 && failedEmojiImages[codepoint] !== true;
}

function onEmojiImageError(emoji: TwitchatDataTypes.Emoji): void {
	const codepoint = getEmojiCodepoint(emoji);
	if (!codepoint) return;
	failedEmojiImages[codepoint] = true;
}

function updateVisibleSections(): void {
	const list = listEl.value;
	if (!list) return;

	const listRect = list.getBoundingClientRect();
	const preload = 200;
	const minTop = listRect.top - preload;
	const maxBottom = listRect.bottom + preload;
	const sectionEls = list.querySelectorAll<HTMLElement>("[data-section-id]");

	for (const sectionEl of sectionEls) {
		const sectionId = sectionEl.dataset.sectionId;
		if (!sectionId) continue;

		const rect = sectionEl.getBoundingClientRect();
		const isVisible = rect.bottom >= minTop && rect.top <= maxBottom;
		if (isVisible) {
			visibleSections.add(sectionId);
		} else {
			const emotesEl = sectionEl.querySelector(".emotes");
			if (emotesEl) {
				sectionHeights.set(sectionId, emotesEl.getBoundingClientRect().height);
			}
			visibleSections.delete(sectionId);
		}
	}
}

function scheduleVisibleSectionsUpdate(): void {
	if (visibilityFrame > -1) return;
	visibilityFrame = requestAnimationFrame(() => {
		visibilityFrame = -1;
		updateVisibleSections();
	});
}

function setupVirtualScroll(): void {
	teardownVirtualScroll();
	if (!listEl.value) return;

	listScrollHandler = () => scheduleVisibleSectionsUpdate();
	listEl.value.addEventListener("scroll", listScrollHandler, { passive: true });
	scheduleVisibleSectionsUpdate();
}

function teardownVirtualScroll(): void {
	if (listEl.value && listScrollHandler) {
		listEl.value.removeEventListener("scroll", listScrollHandler);
	}
	listScrollHandler = null;
	if (visibilityFrame > -1) {
		cancelAnimationFrame(visibilityFrame);
		visibilityFrame = -1;
	}
	visibleSections.clear();
}

watch(
	listEl,
	() => {
		if (listEl.value) {
			setupVirtualScroll();
		} else {
			teardownVirtualScroll();
		}
	},
	{ flush: "post" },
);

/**
 * Create tooltip only when hovering the image.
 * This avoids huge lag on build if creating tooltip on every items
 * at once.
 *
 * @param event
 * @param emote
 */
function openTooltip(
	event: MouseEvent,
	emote: TwitchatDataTypes.Emote | TwitchatDataTypes.Emoji,
): void {
	const isEmote = "id" in emote;
	const code = isEmote ? emote.id + emote.code : emote.shortcode;
	if (tooltipCreated[code] === true) return;
	tooltipCreated[code] = true;
	useTippy(event.currentTarget as HTMLImageElement, {
		content: isEmote
			? "<img src=" +
				emote.images.url_4x +
				' width="112" class="emote"><br><center>' +
				emote.code +
				"</center>"
			: emote.shortcode.replace(/_/g, " "),
	});
}

/**
 * Scrolls list ot a specific user
 */
function scrollTo(sectionId: string): void {
	// Template refs for dynamic :ref bindings are handled via the template
	// We use document query as a fallback since dynamic string refs aren't easily accessible in <script setup>
	const holder = rootEl.value!.querySelector(
		`[data-section-id="${sectionId}"]`,
	) as HTMLDivElement | null;
	holder?.scrollIntoView();
}

/**
 * Requests for emote scope
 */
function grantEmoteScope(): void {
	TwitchUtils.requestScopes([TwitchScopes.READ_EMOTES]);
}

function open(): void {
	if (props.popoutMode !== false) return;
	const el = rootEl.value!;
	gsap.killTweensOf(el);
	gsap.from(el, { duration: 0.1, translateX: "115%", delay: 0.2, ease: "sine.out" });
	gsap.fromTo(
		el,
		{ scaleX: 1.1 },
		{
			duration: 0.5,
			delay: 0.3,
			scaleX: 1,
			clearProps: "scaleX,translateX",
			ease: "elastic.out(1)",
		},
	);
}

function close(): void {
	if (props.popoutMode !== false) {
		emit("close");
		return;
	}
	const el = rootEl.value!;
	gsap.killTweensOf(el);
	gsap.to(el, { duration: 0.1, scaleX: 1.1, ease: "sin.in" });
	gsap.to(el, {
		duration: 0.1,
		translateX: "100%",
		scaleX: 1,
		delay: 0.1,
		clearProps: "translateX",
		ease: "sin.out",
		onComplete: () => {
			emit("close");
		},
	});
}

function onClick(e: MouseEvent): void {
	let target = e.target as HTMLDivElement;
	const el = rootEl.value!;
	while (target != document.body && target != el && target) {
		target = target.parentElement as HTMLDivElement;
	}
	if (target != el) {
		close();
	}
}

onMounted(async () => {
	clickHandler = (e: MouseEvent) => onClick(e);
	document.addEventListener("mousedown", clickHandler);

	fetch("/youtube/emote_list.json").then(async (query) => {
		const ytEmotes: { [code: string]: string } = await query.json();
		const res: TwitchatDataTypes.Emote[] = [];
		for (const key in ytEmotes) {
			const name = ytEmotes[key];
			res.push({
				code: key,
				id: key,
				images: {
					url_1x: "/youtube/emotes/sd/" + name,
					url_2x: "/youtube/emotes/sd/" + name,
					url_4x: "/youtube/emotes/hd/" + name,
				},
				is_public: true,
				platform: "youtube",
			});
		}

		youtubeEmotes.value = reactive(res);
	});

	if (Object.keys(sChat.emoteSelectorCache).length > 0) {
		users.value = sChat.emoteSelectorCache;
	} else {
		const emotes = await TwitchUtils.getEmotes();
		//Get unique users
		var uniqueUsers = emotes.filter(
			(v, i, a) => a.findIndex((v2) => v2.owner!.id == v.owner!.id) === i,
		);
		//Remove users with wrong IDs (like "twitch")
		uniqueUsers = uniqueUsers.filter((v) => parseInt(v.owner!.id).toString() === v.owner!.id);
		//Load all users details to get their names
		const tmpList = await TwitchUtils.getUserInfo(uniqueUsers.map((v) => v.owner!.id));
		const userList: TwitchatDataTypes.TwitchatUser[] = [];

		for (const u of tmpList) {
			const user = sUsers.getUserFrom("twitch", undefined, u.id, u.login, u.display_name);
			user.avatarPath = tmpList.find((v) => v.id == user.id)!.profile_image_url;
			userList.push(user);
		}

		//Sort them by name
		userList.sort((a, b) => (a.displayName > b.displayName ? 1 : -1));
		//Bring self to top
		userList.sort((a) => (a.id === StoreProxy.auth.twitch.user.id ? -1 : 0));
		//Build a fast access object to know the index of a user from their ID.
		const uidToIndex: { [key: string]: number } = {};
		for (let i = 0; i < userList.length; i++) {
			uidToIndex[userList[i]!.id] = i;
		}

		//Add global emotes
		uidToIndex["0"] = userList.length;
		userList.push({
			platform: "twitch",
			login: "global",
			displayName: "Global",
			displayNameOriginal: "Global",
			avatarPath: getAsset("icons/twitch.svg"),
			id: "0",
			is_affiliate: false,
			is_partner: false,
			is_tracked: false,
			is_blocked: false,
			pronouns: false,
			pronounsLabel: false,
			pronounsTooltip: false,
			channelInfo: {},
			is_bot: false,
		});

		//Build emotes list for each sorted user
		const sets: {
			user: TwitchatDataTypes.TwitchatUser;
			emotes: TwitchatDataTypes.Emote[];
		}[] = [];
		for (const e of emotes) {
			const index = uidToIndex[e.owner!.id]!;
			if (!sets[index]) {
				sets[index] = {
					user: userList.find((v) => v.id == e.owner!.id)!,
					emotes: [],
				};
			}
			sets[index].emotes.push(e);
		}

		if (sParams.appearance.bttvEmotes.value === true) {
			//Add BTTV emotes
			sets.push({
				user: {
					platform: "twitch",
					login: "BTTV",
					displayName: "BTTV",
					displayNameOriginal: "BTTV",
					avatarPath: getAsset("icons/emote.svg"),
					id: "1",
					is_affiliate: false,
					is_partner: false,
					is_tracked: false,
					is_blocked: false,
					pronouns: false,
					pronounsLabel: false,
					pronounsTooltip: false,
					channelInfo: {},
					is_bot: true,
				},
				emotes: BTTVUtils.instance.emotes,
			});
		}

		if (sParams.appearance.sevenTVEmotes.value === true) {
			//Add 7TV emotes
			sets.push({
				user: {
					platform: "twitch",
					login: "7TV",
					displayName: "7TV",
					displayNameOriginal: "7TV",
					avatarPath: getAsset("icons/emote.svg"),
					id: "2",
					is_affiliate: false,
					is_partner: false,
					is_tracked: false,
					is_blocked: false,
					pronouns: false,
					pronounsLabel: false,
					pronounsTooltip: false,
					channelInfo: {},
					is_bot: true,
				},
				emotes: SevenTVUtils.instance.emotes,
			});
		}

		if (sParams.appearance.ffzEmotes.value === true) {
			//Add FFZ emotes
			sets.push({
				user: {
					platform: "twitch",
					login: "FFZ",
					displayName: "FFZ",
					displayNameOriginal: "FFZ",
					avatarPath: getAsset("icons/emote.svg"),
					id: "3",
					is_affiliate: false,
					is_partner: false,
					is_tracked: false,
					is_blocked: false,
					pronouns: false,
					pronounsLabel: false,
					pronounsTooltip: false,
					channelInfo: {},
					is_bot: true,
				},
				emotes: FFZUtils.instance.emotes,
			});
		}

		//Save it to storage to avoid loading everything back again
		sChat.setEmoteSelectorCache(sets);
		users.value = sets;
	}

	Database.instance.getAllEmojiShortcodes().then((data) => {
		const dedupe = new Set<string>();
		for (const emoji of data) {
			if (emoji.shortcode.indexOf("tone") > -1) continue; //Skip skin tones variations to reduce list size
			if (dedupe.has(emoji.emoji)) continue;
			dedupe.add(emoji.emoji);
			emojiList.value.push(emoji);
		}
		dedupe.clear();
	});

	await nextTick();
	open();
	setupVirtualScroll();
	scheduleVisibleSectionsUpdate();
	emit("onLoad");
});

onBeforeUnmount(() => {
	teardownVirtualScroll();
	document.removeEventListener("mousedown", clickHandler);
});
</script>

<style scoped lang="less">
.emoteselector {
	width: min-content;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;
	overflow-y: hidden;

	& > *:not(:last-child) {
		margin-bottom: 5px;
	}

	.userList {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 0.5em;
		max-height: 6em;
		overflow-y: auto;
		justify-content: center;
		margin: 0.5em 0;
		.user {
			cursor: pointer;
			padding: 0;
			height: 2em;
			width: 2em;
			font-size: 1em;
			border-radius: 50%;
			.avatar {
				width: 100%;
				border-radius: 50%;
			}
			&:hover {
				.avatar {
					filter: brightness(150%);
				}
			}
		}
	}

	& > .loader {
		margin: auto;
		text-align: center;
		color: var(--color-light);
		.icon {
			width: 2em;
			height: 2em;
		}
		p {
			font-style: italic;
			font-size: 1em;
		}
	}

	.list {
		width: 400px;
		max-width: 100%;
		overflow-x: hidden;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		flex-shrink: 1;
		color: var(--color-text);

		.sticky {
			top: 0;
			position: sticky;
			backdrop-filter: opacity(0%);

			display: flex;
			flex-direction: row;
			background-color: var(--background-color-fader);
			border-radius: 2em;
			padding: 0.5em;
			backdrop-filter: blur(5px);

			& > .icon {
				height: 2em;
				margin-top: -0.5em;
				margin-left: -0.5em;
				margin-bottom: -0.5em;
				border-radius: 50%;
			}
			& > .title {
				align-self: center;
				flex-grow: 1;
				text-align: center;
				overflow-wrap: break-word;
				overflow: hidden;
				font-weight: bold;
				padding: 0 0.5em;
			}
		}
		.emotes,
		.hypetrain {
			display: flex;
			flex-direction: row;
			flex-wrap: wrap;
			justify-content: center;
			margin-bottom: 1em;
			.emote {
				height: 2em;
				width: 2em;
				padding: 2px;
				cursor: pointer;
				border: 1px solid transparent;
				border-radius: 5px;
				object-fit: contain;
				&:hover {
					border-color: var(--color-secondary);
				}
			}

			.emoji {
				font-size: 1.5em;
				cursor: pointer;
				border: 1px solid transparent;
				border-radius: 5px;
				width: 1.5em;
				height: 1.5em;
				padding: 0.25em 0;
				text-align: center;
				display: flex;
				align-items: center;
				justify-content: center;
				&:hover {
					border-color: var(--color-secondary);
				}
			}

			.emojiImage {
				width: 1.25em;
				height: 1.25em;
				display: block;
				object-fit: contain;
				pointer-events: none;
				user-select: none;
			}
		}

		.hypetrain {
			font-size: 0.9em;
			text-align: center;
			line-height: 1.3em;
			padding-top: 1em;
		}

		.emojiSection {
			.emotes {
				margin-bottom: 0;
			}
		}

		&.search {
			.item {
				.emotes {
					border-radius: var(--border-radius);
					// background-color: transparent;
				}
			}
		}
	}
	input {
		width: 100%;
		color: var(--color-text);
	}

	&.popout {
		padding: 0.5em;
		border-radius: var(--border-radius);
		background-color: var(--background-color-primary);
		font-size: 0.8em;
		margin-left: unset;
		.list {
			max-height: 300px;
		}
		.userList {
			max-height: 3em;
		}
	}

	.grantBt {
		margin-top: 1em;
	}
}
</style>
