<template>
	<div
		ref="rootEl"
		class="pinnedchatform blured-background-window"
		v-if="pinnedEntries.length > 0"
	>
		<div class="entry" v-for="entry in pinnedEntries" :key="entry.channelId">
			<h2 class="channel" v-if="pinnedEntries.length > 1 || entry.channelId !== ownChannelId">
				<Icon name="pin" />
				<span>{{ entry.broadcasterName }}</span>
			</h2>

			<div class="message">
				<strong class="login">{{ entry.message.sender_user_name }}</strong>
				<p class="text">
					<ChatMessageChunksParser
						:chunks="entry.parsedChunks"
						:channel="entry.channelId"
						:platform="'twitch'"
					/>
				</p>

				<div class="expires">
					<Icon name="timer" />
					<span v-if="entry.indefinite">{{ t("chat.pinned_message.indefinite") }}</span>
					<span v-else-if="entry.remainingMs > 0">{{
						t("chat.pinned_message.ends_in", { DURATION: entry.remainingDisplay })
					}}</span>
					<span v-else>{{ t("chat.pinned_message.expired") }}</span>
				</div>
			</div>

			<ParamItem
				:paramData="entry.param_indefinite"
				v-model="entry.param_indefinite.value"
				noBackground
			/>
			<ParamItem
				v-if="!entry.param_indefinite.value"
				:paramData="entry.param_duration"
				v-model="entry.param_duration.value"
				noBackground
			/>

			<div class="ctas">
				<TTButton
					icon="unpin"
					highlight
					alert
					:loading="entry.loadingUnpin"
					@click="unpin(entry.channelId)"
					>{{ t("chat.pinned_message.unpin_bt") }}</TTButton
				>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import { computed, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../Icon.vue";
import ChatMessageChunksParser from "../messages/components/ChatMessageChunksParser.vue";
import ParamItem from "../params/ParamItem.vue";
import TTButton from "../TTButton.vue";

interface FormState {
	param_duration: TwitchatDataTypes.ParameterData<number>;
	param_indefinite: TwitchatDataTypes.ParameterData<boolean>;
	loadingUnpin: boolean;
	seeding: boolean;
}

const { t } = useI18n();
const storeChat = useStoreChat();
const storeAuth = useStoreAuth();
const storeUsers = useStoreUsers();

const emits = defineEmits<{ close: [] }>();
const rootEl = useTemplateRef("rootEl");
const now = ref(Date.now());

const formStates = reactive<Record<string, FormState>>({});
const pendingSaves = new Map<string, number>();
const clickHandler = (e: MouseEvent) => onClick(e);
let tickInterval = -1;

const ownChannelId = computed(() => storeAuth.twitch.user.id);

const pinnedEntries = computed(() => {
	const map = storeChat.pinnedTwitchMessage;
	const entries = Object.entries(map).filter(([_, m]) => m != null);
	return entries.map(([channelId, message]) => {
		if (!formStates[channelId]) {
			formStates[channelId] = makeFormState(channelId);
			seedFormState(channelId);
		}
		const state = formStates[channelId]!;
		const endsAtMs = message.ends_at ? new Date(message.ends_at).getTime() : 0;
		const indefinite = !endsAtMs || Number.isNaN(endsAtMs);
		const remainingMs = Math.max(0, endsAtMs - now.value);
		const user = storeUsers.getUserFrom("twitch", channelId, channelId);
		return {
			channelId,
			message,
			broadcasterName: user?.displayName || user?.login || channelId,
			parsedChunks: TwitchUtils.parseMessageToChunks(message.message.text, undefined, true),
			indefinite,
			remainingMs,
			remainingDisplay: Utils.formatDuration(remainingMs, true),
			param_duration: state.param_duration,
			param_indefinite: state.param_indefinite,
			loadingUnpin: state.loadingUnpin,
		};
	});
});

onMounted(() => {
	document.addEventListener("mousedown", clickHandler);
	tickInterval = window.setInterval(() => (now.value = Date.now()), 1000);
	syncAllStates();
	open();
});

onBeforeUnmount(() => {
	document.removeEventListener("mousedown", clickHandler);
	clearInterval(tickInterval);
	flushPendingSaves();
});

watch(
	() => Object.keys(storeChat.pinnedTwitchMessage).join("|"),
	() => {
		syncAllStates();
		if (Object.keys(storeChat.pinnedTwitchMessage).length === 0) {
			close();
		}
	},
);

/**
 * Ensures form state exists for every channel currently in the pinned map
 */
function syncAllStates(): void {
	const map = storeChat.pinnedTwitchMessage;
	// Add states for new channels
	for (const channelId of Object.keys(map)) {
		if (!formStates[channelId]) {
			formStates[channelId] = makeFormState(channelId);
		}
		seedFormState(channelId);
	}
	// Drop states for channels no longer pinned
	for (const channelId of Object.keys(formStates)) {
		if (!map[channelId]) {
			delete formStates[channelId];
		}
	}
}

/**
 * Pre-fills the form for a given channel from the current pinned message.
 * Suppresses the auto-update watcher so the seed doesn't trigger an API call.
 */
function seedFormState(channelId: string): void {
	const message = storeChat.pinnedTwitchMessage[channelId];
	const state = formStates[channelId];
	if (!message || !state) return;
	state.seeding = true;
	const endsAtMs = message.ends_at ? new Date(message.ends_at).getTime() : 0;
	if (!endsAtMs) {
		state.param_indefinite.value = true;
	} else {
		state.param_indefinite.value = false;
		const seconds = Math.round(Math.max(0, endsAtMs - Date.now()) / 1000);
		state.param_duration.value = Math.min(30 * 60, Math.max(30, seconds || 60));
	}
	state.seeding = false;
}

function makeFormState(channelId: string): FormState {
	const state = reactive<FormState>({
		param_duration: reactive<TwitchatDataTypes.ParameterData<number>>({
			type: "duration",
			value: 30 * 60,
			min: 30,
			max: 30 * 60,
			labelKey: "chat.pinned_message.param_duration",
			icon: "timer",
		}),
		param_indefinite: reactive<TwitchatDataTypes.ParameterData<boolean>>({
			type: "boolean",
			value: false,
			labelKey: "chat.pinned_message.param_indefinite",
			icon: "loop",
		}),
		loadingUnpin: false,
		seeding: false,
	});
	watch(
		[() => state.param_duration.value, () => state.param_indefinite.value],
		() => {
			if (state.seeding) return;
			const existing = pendingSaves.get(channelId);
			if (existing !== undefined) clearTimeout(existing);
			pendingSaves.set(
				channelId,
				window.setTimeout(() => {
					pendingSaves.delete(channelId);
					void applyDuration(channelId);
				}, 5000),
			);
		},
		{ flush: "sync" },
	);
	return state;
}

/**
 * Flushes all pending debounced saves immediately
 */
function flushPendingSaves(): void {
	for (const [channelId, timeoutId] of pendingSaves) {
		clearTimeout(timeoutId);
		void applyDuration(channelId);
	}
	pendingSaves.clear();
}

/**
 * Pushes the current duration values to Twitch for the given channel
 */
async function applyDuration(channelId: string): Promise<void> {
	const pinned = storeChat.pinnedTwitchMessage[channelId];
	const state = formStates[channelId];
	if (!pinned || !state) return;
	try {
		const duration = state.param_indefinite.value ? 0 : state.param_duration.value;
		const ok = await TwitchUtils.updatePinnedMessage(
			pinned.broadcaster_id,
			pinned.message_id,
			duration,
		);
		if (ok) {
			await TwitchUtils.getPinnedMessage(pinned.broadcaster_id);
		}
	} catch (_error) {
		// ignore
	}
}

/**
 * Unpins the pinned message for the given channel
 */
async function unpin(channelId: string): Promise<void> {
	const pinned = storeChat.pinnedTwitchMessage[channelId];
	const state = formStates[channelId];
	if (!pinned || !state) return;
	state.loadingUnpin = true;
	try {
		await TwitchUtils.unpinMessage(pinned.broadcaster_id, pinned.message_id);
	} catch (_error) {
		// ignore
	}
	state.loadingUnpin = false;
}

/**
 * Open animation
 */
function open(): void {
	const element = rootEl.value;
	gsap.killTweensOf(element);
	gsap.from(element, {
		duration: 0.2,
		scaleX: 0,
		delay: 0.1,
		clearProps: "scaleX",
		ease: "back.out",
	});
	gsap.from(element, { duration: 0.3, scaleY: 0, clearProps: "scaleY", ease: "back.out" });
}

/**
 * Close animation
 */
function close(): void {
	const element = rootEl.value;
	if (!element) {
		emits("close");
		return;
	}
	gsap.killTweensOf(element);
	gsap.to(element, { duration: 0.3, scaleX: 0, ease: "back.in" });
	gsap.to(element, {
		duration: 0.2,
		scaleY: 0,
		delay: 0.1,
		clearProps: "scaleY, scaleX",
		ease: "back.in",
		onComplete: () => {
			emits("close");
		},
	});
}

/**
 * Detect click outside the window to close it
 */
function onClick(e: MouseEvent): void {
	let target = e.target as HTMLDivElement;
	const ref = rootEl.value;
	while (target != document.body && target != ref && target) {
		target = target.parentElement as HTMLDivElement;
	}
	if (target != ref) {
		close();
	}
}
</script>

<style scoped lang="less">
.pinnedchatform {
	gap: 1em;
	display: flex;
	flex-direction: column;
	max-width: 400px;
	width: 400px;
	max-height: 80vh;
	overflow-y: auto;
	left: auto;
	right: 0;
	margin-left: auto;
	transform-origin: bottom right;
	color: var(--color-light);
	align-items: stretch;
	padding: 1em;

	.entry {
		display: flex;
		flex-direction: column;
		gap: 0.75em;

		& + .entry {
			padding-top: 1em;
			border-top: 1px solid var(--background-color-fader);
		}

		.channel {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			gap: 0.5em;
			margin: 0;
			text-align: center;
			word-break: break-word;
			.icon {
				height: 1em;
			}
		}

		.message {
			display: flex;
			flex-direction: column;
			gap: 0.25em;
			padding: 0.5em 0.75em;
			border-radius: var(--border-radius);
			background-color: var(--background-color-fader);
			max-height: 8em;
			overflow-y: auto;

			.login {
				color: var(--color-secondary);
				font-weight: bold;
			}
			.text {
				margin: 0;
				word-break: break-word;
				white-space: pre-wrap;
				:deep(.emote) {
					height: 1.25em;
					vertical-align: middle;
					display: inline-block;
				}
			}
		}

		.expires {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: flex-end;
			gap: 0.5em;
			font-style: italic;
			opacity: 0.8;
			font-size: 0.8em;
			margin-top: 0.5em;
			.icon {
				height: 1em;
			}
		}

		.ctas {
			gap: 0.5em;
			margin-top: 0.25em;
			display: flex;
			flex-direction: row;
			justify-content: center;
			flex-wrap: wrap;
		}
	}
}
</style>

