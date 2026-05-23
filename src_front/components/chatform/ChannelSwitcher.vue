<template>
	<div class="channelswitcher">
		<div
			class="current"
			v-if="currentChannel"
			v-tooltip="{
				touch: 'hold',
				content:
					channels.length == 1
						? t('chat.form.connect_extra_chan')
						: t('chat.form.extra_chan_tt', {
								USER: currentChannel.user.displayNameOriginal,
							}),
			}"
			@click.capture="open($event)"
			@click.right="cycleChannel($event)"
		>
			<img
				class="avatar"
				v-if="currentChannel.user.avatarPath"
				:src="currentChannel.user.avatarPath.replace(/300x300/gi, '50x50')"
				:style="{ color: currentChannel.color }"
				alt="avatar"
				referrerpolicy="no-referrer"
			/>
			<div class="avatar" :style="{ color: currentChannel.color }" v-else></div>
			<Icon :name="currentChannel.platform" class="platformIcon" />
		</div>

		<div class="popin blured-background-window" ref="popin" v-if="expand">
			<template v-if="showForm && !user">
				<p class="head"><Icon name="online" />{{ t("chat.form.connect_extra_chan") }}</p>
				<SearchUserForm
					v-model="user"
					:staticUserList="liveFollingList"
					:excludedUserIds="channels.map((v) => v.user.id)"
					@close="showForm = false"
					@select="onSelectUser"
					inline
				/>
				<!-- <input type="text" v-model="youtubeUrl" @keyup.enter="connectYoutube"> -->
				<p class="infos"><Icon name="info" />{{ t("chat.form.extra_chan_info") }}</p>
			</template>

			<template v-else-if="userParams"> </template>

			<template v-else>
				<button
					v-for="entry in channels"
					:class="currentChannelId == entry.user.id ? 'entry selected' : 'entry'"
					@click="onSelectChannel(entry.user.id, entry.user.login, entry.platform)"
				>
					<img
						class="avatar"
						v-if="entry.user.avatarPath"
						:src="entry.user.avatarPath.replace(/300x300/gi, '50x50')"
						:style="{ color: entry.color }"
						alt="avatar"
						referrerpolicy="no-referrer"
					/>
					<div class="avatar" :style="{ color: entry.color }" v-else></div>

					<Icon :name="entry.platform" class="platformIcon" />

					<span class="pseudo">{{ entry.user.displayName }}</span>

					<TTButton
						v-if="entry.isRemoteChan"
						class="actionBt"
						icon="offline"
						transparent
						medium
						v-tooltip="t('global.disconnect')"
						@click.capture.stop="disconnect(entry.user)"
					/>

					<TTButton
						v-if="
							entry.isRemoteChan &&
							(canPinChans ||
								storeStream.autoconnectChans.find(
									(v) =>
										v.id == entry.user.id && v.platform == entry.user.platform,
								))
						"
						class="actionBt"
						transparent
						medium
						:icon="
							storeStream.autoconnectChans.find(
								(v) => v.id == entry.user.id && v.platform == entry.user.platform,
							)
								? 'pin'
								: 'unpin'
						"
						@click.capture.stop="togglePinState(entry)"
					/>

					<!-- <TTButton v-if="entry.isRemoteChan"
						class="actionBt"
						icon="params"
						transparent
						medium
						v-tooltip="$t('chat.form.extra_chan_params_tt')"
						@click.capture.stop="openParams(entry.user)" /> -->
				</button>
				<TTButton
					class="addChanBt"
					icon="add"
					v-if="storeStream.connectedTwitchChans.length < 6"
					@click="showForm = true"
					transparent
					medium
				/>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import TTButton from "@/components/TTButton.vue";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { gsap } from "gsap/gsap-core";
import {
	computed,
	nextTick,
	onBeforeMount,
	onBeforeUnmount,
	reactive,
	ref,
	useTemplateRef,
	watch,
} from "vue";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import SearchUserForm from "../SearchUserForm.vue";
import { useI18n } from "vue-i18n";
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeStream as useStoreStream } from "@/store/stream/storeStream";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";

interface ChannelEntry {
	platform: TwitchatDataTypes.ChatPlatform;
	user: TwitchatDataTypes.TwitchatUser;
	color: string;
	isRemoteChan: boolean;
}

const props = withDefaults(
	defineProps<{
		modelValue?: string;
		platform?: string;
		name?: string;
	}>(),
	{
		modelValue: "",
		platform: "twitch",
		name: "",
	},
);

const emit = defineEmits<{
	"update:modelValue": [value: string];
	"update:platform": [value: string];
	"update:name": [value: string];
	change: [value: string];
}>();

const { t } = useI18n();
const storeAuth = useStoreAuth();
const storeStream = useStoreStream();
const storeUsers = useStoreUsers();

const expand = ref<boolean>(false);
const showForm = ref<boolean>(false);
const youtubeUrl = ref<string>("");
const currentChannelId = ref<string>("");
const user = ref<TwitchDataTypes.UserInfo | undefined>(undefined);
const userParams = ref<TwitchatDataTypes.TwitchatUser | null>(null);
const liveFollingList = ref<TwitchDataTypes.UserInfo[]>([]);

const popin = useTemplateRef<HTMLDivElement>("popin");

let clickHandler!: (e: MouseEvent) => void;

const canPinChans = computed<boolean>(() => {
	return storeStream.autoconnectChans.length < 6;
});

const channels = computed<ChannelEntry[]>(() => {
	let chans: ChannelEntry[] = reactive([]);

	chans.push({
		platform: "twitch",
		user: storeAuth.twitch.user,
		isRemoteChan: false,
		color: "transparent",
	});
	if (storeAuth.youtube?.user) {
		chans.push({
			platform: "youtube",
			user: storeAuth.youtube.user,
			isRemoteChan: false,
			color: "transparent",
		});
	}

	storeStream.connectedTwitchChans.forEach((entry) => {
		chans.push({
			platform: "twitch",
			user: entry.user,
			isRemoteChan: true,
			color: entry.color,
		});
	});

	return chans;
});

const currentChannel = computed<ChannelEntry | undefined>(() => {
	return channels.value.find((v) => v.user.id == currentChannelId.value);
});

/**
 * Loads currently live following for fast channel access
 */
async function loadLiveFollowing(): Promise<void> {
	liveFollingList.value = [];
	const list = await TwitchUtils.getActiveFollowedStreams();
	liveFollingList.value = await TwitchUtils.getUserInfo(list.map((v) => v.user_id));
}

/**
 * Called when selecting a twitch user after searching for them
 */
async function onSelectUser(selected?: TwitchDataTypes.UserInfo): Promise<void> {
	if (selected) user.value = selected;
	if (!user.value) return;
	const ttUser = await storeUsers.getUserFrom(
		"twitch",
		user.value.id,
		user.value.id,
		user.value.login,
		user.value.display_name,
	);
	storeStream.connectToExtraChan(ttUser);
	user.value = undefined;
	showForm.value = false;
}

/**
 * Called when selecting a connected channel to make it the current one
 */
function onSelectChannel(
	channelId: string,
	channelName: string,
	platform: TwitchatDataTypes.ChatPlatform,
): void {
	emit("update:name", channelName);
	emit("update:platform", platform);
	emit("update:modelValue", channelId);
	emit("change", channelId);
	close();
}

/**
 * Calle dwhen right clicking button.
 * Cycles through connected channels for faster switch
 */
function cycleChannel(event: MouseEvent): void {
	event.preventDefault();
	let index = channels.value.findIndex((v) => v.user.id == currentChannelId.value);
	index = ++index % channels.value.length;
	const channel = channels.value[index];
	if (channel) {
		onSelectChannel(channel.user.id, channel.user.login, channel.platform);
	}
}

/**
 * Disconnect from given twitch channel
 */
function disconnect(target: TwitchatDataTypes.TwitchatUser): void {
	if (storeStream.currentChatChannel.id === target.id) {
		const channel = channels.value[0];
		if (channel) {
			storeStream.currentChatChannel.id = channel.user.id;
			storeStream.currentChatChannel.name = channel.user.login;
			storeStream.currentChatChannel.platform = channel.platform;
		}
	}
	storeStream.disconnectFromExtraChan(target);
}

/**
 * Toggle pin states of an entry
 */
function togglePinState(entry: ChannelEntry): void {
	const pinned =
		storeStream.autoconnectChans.findIndex(
			(v) => v.id == entry.user.id && v.platform == entry.user.platform,
		) == -1;
	storeStream.setExtraChanAutoconnectState(entry.user, pinned);
}

/**
 * Open params form for a user
 */
function openParams(target: TwitchatDataTypes.TwitchatUser): void {
	userParams.value = target;
}

/**
 * Opens the window
 */
async function open(event: MouseEvent): Promise<void> {
	loadLiveFollowing();
	event.stopPropagation();
	event.preventDefault();
	if (expand.value) {
		onClickDOM(event);
		return;
	}
	expand.value = true;
	await nextTick();
	const holder = popin.value!;
	gsap.killTweensOf(holder);
	gsap.fromTo(
		holder,
		{ scaleY: 0 },
		{ duration: 0.25, scaleY: 1, ease: "back.out", delay: 0.05 },
	);
}

/**
 * Closes the window
 */
function close(): void {
	const holder = popin.value;
	if (!holder) return;
	gsap.killTweensOf(holder);
	gsap.to(holder, {
		duration: 0.1,
		scaleY: 0,
		clearProps: "scaleY",
		ease: "back.in",
		onComplete: () => {
			expand.value = false;
			showForm.value = false;
		},
	});
}

function connectYoutube(): void {
	YoutubeHelper.instance.connectToLiveByURL(youtubeUrl.value);
}

/**
 * Detects click outside of the window to close it
 */
function onClickDOM(e: MouseEvent): void {
	if (!expand.value) return;
	const holder = popin.value;
	if (!holder) return;

	let target = e.target as HTMLElement;
	while (target != document.body && target != holder && target != null) {
		target = target.parentElement as HTMLElement;
	}
	if (target === document.body) {
		close();
	}
}

onBeforeMount(() => {
	if (channels.value.findIndex((v) => v.user.id === props.modelValue) == -1) {
		currentChannelId.value = channels.value[0]!.user.id;
	} else {
		currentChannelId.value = props.modelValue;
	}

	watch(
		() => props.modelValue,
		() => {
			currentChannelId.value = props.modelValue;
		},
	);

	loadLiveFollowing();
	clickHandler = (e: MouseEvent) => onClickDOM(e);
	document.addEventListener("click", clickHandler, true);
});

onBeforeUnmount(() => {
	document.removeEventListener("click", clickHandler, true);
});
</script>

<style scoped lang="less">
.channelswitcher {
	position: relative;
	.entry {
		gap: 0.5em;
		display: flex;
		flex-direction: row;
		align-items: center;
		cursor: pointer;
		padding: 2px;
		padding-right: 5px;
		border-radius: var(--border-radius);
		color: var(--color-text);
		text-align: left;
		.avatar {
			width: 1.5em;
			height: 1.5em;
			border-radius: 50%;
			border: 2px solid currentColor;
		}

		.platformIcon {
			height: 1em;
			max-width: 1em;
			flex-shrink: 0;
		}
		.pseudo {
			text-wrap: nowrap;
			flex-grow: 1;
		}
		.actionBt {
			flex-shrink: 0;
			margin-right: -5px;
		}
		&:hover {
			background-color: var(--background-color-fader);
		}
		&.selected {
			background-color: var(--color-primary-fader);
		}
	}

	.popin {
		position: absolute;
		bottom: 100%;
		gap: 0.25em;
		display: flex;
		flex-direction: column;
		width: max-content;
		p > .icon {
			height: 1em;
			margin-right: 0.5em;
			vertical-align: middle;
		}

		.infos {
			font-style: italic;
			font-size: 0.85em;
			color: var(--color-secondary);
			white-space: pre-line;
			font-weight: normal;
		}
	}

	.current {
		cursor: pointer;
		.platformIcon {
			height: 15px;
			max-width: 15px;
			position: absolute;
			bottom: 0;
			right: -3px;
			background-color: var(--color-text-inverse);
			padding: 2px; // 2px 2px 3px;
			border-radius: 50%;
		}
		.avatar {
			width: 1.5em;
			height: 1.5em;
			border-radius: 50%;
			border: 2px solid currentColor;
			transition: all 0.1s;
		}

		&:hover {
			.avatar {
				transform: scale(1.1);
				filter: brightness(1.2);
			}
		}
	}

	.head {
		white-space: pre-line;
	}
}
</style>
