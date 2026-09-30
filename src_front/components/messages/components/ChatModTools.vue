<template>
	<div class="chatmodtools" @mouseleave="closeToOptions()">
		<template v-if="channelInfo?.is_banned === true">
			<Icon v-if="loading_ban" name="loader" />
			<span
				v-else
				class="action unban secondary"
				v-tooltip="tooltips.unban"
				@click.stop="unbanUser()"
			></span>
		</template>
		<template v-else>
			<Icon v-if="loading_ban" name="loader" />
			<span
				v-else
				class="action ban alert"
				v-tooltip="tooltips.ban"
				@click.stop="banUser()"
			></span>

			<Icon v-if="loading_ban" name="loader" />
			<span
				v-else
				class="action timeout"
				v-tooltip="'Timeout'"
				@click.stop="openToOptions()"
			></span>
			<div
				class="toOptions"
				v-if="showToOptions"
				ref="toOptions"
				@mouseenter="resetCloseTimeout()"
			>
				<TTButton
					alert
					:aria-label="t('chat.mod_tools.to10_aria')"
					@click.stop="timeoutUser(10)"
					small
					>{{ t("chat.mod_tools.to10") }}</TTButton
				>
				<TTButton
					alert
					:aria-label="t('chat.mod_tools.to120_aria')"
					@click.stop="timeoutUser(120)"
					small
					>{{ t("chat.mod_tools.to120") }}</TTButton
				>
				<TTButton
					alert
					:aria-label="t('chat.mod_tools.to30_aria')"
					@click.stop="timeoutUser(1800)"
					small
					>{{ t("chat.mod_tools.to30") }}</TTButton
				>
				<TTButton
					alert
					:aria-label="t('chat.mod_tools.to3600_aria')"
					@click.stop="timeoutUser(3600)"
					small
					>{{ t("chat.mod_tools.to3600") }}</TTButton
				>
				<TTButton
					alert
					:aria-label="t('chat.mod_tools.to43200_aria')"
					@click.stop="timeoutUser(3600 * 12)"
					small
					>{{ t("chat.mod_tools.to43200") }}</TTButton
				>
				<TTButton
					alert
					:aria-label="t('chat.mod_tools.to1w_aria')"
					@click.stop="timeoutUser(3600 * 24 * 7)"
					small
					>{{ t("chat.mod_tools.to1w") }}</TTButton
				>
			</div>
		</template>

		<span
			v-if="props.canDelete && props.messageData.deleted !== true"
			class="action trash"
			v-tooltip="tooltips.delete"
			@click.stop="deleteMessage()"
		></span>

		<template v-if="props.canBlock">
			<Icon v-if="loading_block" name="loader" />
			<span
				v-else-if="storeUsers.blockedUsers.twitch[props.messageData.user.id]"
				class="action unblock secondary"
				v-tooltip="tooltips.unblock"
				@click.stop="unblockUser()"
			></span>
			<span
				v-else
				class="action block"
				v-tooltip="tooltips.block"
				@click.stop="blockUser()"
			></span>
		</template>

		<template v-if="props.canMonitor">
			<Icon v-if="loading_sus" name="loader" />
			<span
				v-else-if="channelInfo?.is_suspicious && !channelInfo?.is_restricted"
				class="action unmonitor secondary offsetDown"
				v-tooltip="tooltips.unmonitor"
				@click.stop="unflagUser()"
			></span>
			<span
				v-else
				class="action monitor offsetDown"
				v-tooltip="tooltips.monitor"
				@click.stop="flagUser('monitor')"
			></span>

			<Icon v-if="loading_sus" name="loader" />
			<span
				v-else-if="channelInfo?.is_restricted"
				class="action unrestrict secondary offsetUp"
				v-tooltip="tooltips.unrestrict"
				@click.stop="unflagUser()"
			></span>
			<span
				v-else
				class="action restrict offsetUp"
				v-tooltip="tooltips.restrict"
				@click.stop="flagUser('restrict')"
			></span>
		</template>
	</div>
</template>

<script setup lang="ts">
import { useConfirm } from "@/composables/useConfirm";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import { gsap } from "gsap/gsap-core";
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import Icon from "../../Icon.vue";
import TTButton from "../../TTButton.vue";

/**
 * TODO replace <TTButton> to simplement native <button> elements
 */
const props = withDefaults(
	defineProps<{
		messageData: TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData;
		canDelete?: boolean;
		canBlock?: boolean;
		canMonitor?: boolean;
	}>(),
	{
		canDelete: false,
		canBlock: false,
		canMonitor: false,
	},
);

const emit = defineEmits<{ actionComplete: [] }>();

const { t, locale } = useI18n();
const { confirm } = useConfirm();
const storeChat = useStoreChat();
const storeUsers = useStoreUsers();
const toOptionsEl = useTemplateRef<HTMLDivElement>("toOptions");

const showToOptions = ref(false);
const loading_block = ref(false);
const loading_ban = ref(false);
const loading_sus = ref(false);

let closeTimeout = 0;

const channelInfo = computed(
	() => props.messageData.user?.channelInfo[props.messageData.channel_id],
);

/**
 * Tooltips of the action icons.
 * Contents are functions so labels are only translated when a tooltip is actually
 * built (on first hover) instead of on every render of every message.
 * Only depends on the locale so these objects stay the same across renders, and a
 * language change updates the tooltips already built.
 */
const tooltips = computed(() => {
	void locale.value;
	const username = () => props.messageData.user.displayNameOriginal;
	const label = (key: string) => ({ content: () => t(key, { USER: username() }) });
	return {
		ban: label("chat.mod_tools.banBt"),
		unban: label("chat.mod_tools.unbanBt"),
		delete: { content: () => t("global.delete") },
		block: label("chat.mod_tools.blockBt"),
		unblock: label("chat.mod_tools.unblockBt"),
		monitor: label("chat.mod_tools.monitorBt"),
		unmonitor: label("chat.mod_tools.unmonitorBt"),
		restrict: label("chat.mod_tools.restrictBt"),
		unrestrict: label("chat.mod_tools.unrestrictBt"),
	};
});

function banUser(): void {
	if (!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
	loading_ban.value = true;
	confirm(
		t("chat.mod_tools.ban_confirm_title", {
			USER: props.messageData.user.displayNameOriginal,
		}),
		t("chat.mod_tools.ban_confirm_desc"),
	)
		.then(async () => {
			try {
				if (props.messageData.fake === true) {
					//Avoid banning user for real if doing it from a fake message
					void storeUsers.flagBanned(
						props.messageData.platform,
						props.messageData.channel_id,
						props.messageData.user.id,
					);
				} else {
					switch (props.messageData.platform) {
						case "twitch": {
							await TwitchUtils.banUser(
								props.messageData.user,
								props.messageData.channel_id,
								undefined,
								t("global.moderation_action.ban_reason"),
							);
							break;
						}
						case "youtube": {
							if (props.messageData.type != "message") break;
							await YoutubeHelper.instance.banUser(
								props.messageData.user.id,
								props.messageData.youtube_liveId!,
							);
							break;
						}
					}
				}
			} catch (_error) {}
			loading_ban.value = false;
			emit("actionComplete");
		})
		.catch(() => {
			loading_ban.value = false;
		});
}

async function unbanUser(): Promise<void> {
	if (!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
	loading_ban.value = true;
	try {
		if (props.messageData.fake === true) {
			//Avoid banning user for real if doing it from a fake message
			void storeUsers.flagUnbanned(
				props.messageData.platform,
				props.messageData.channel_id,
				props.messageData.user.id,
			);
		} else {
			switch (props.messageData.platform) {
				case "twitch": {
					await TwitchUtils.unbanUser(
						props.messageData.user,
						props.messageData.channel_id,
					);
					break;
				}
				case "youtube": {
					if (props.messageData.type != "message") break;
					await YoutubeHelper.instance.unbanUser(
						props.messageData.user.id,
						props.messageData.youtube_liveId!,
					);
					break;
				}
			}
		}
	} catch (_error) {}
	loading_ban.value = false;
	emit("actionComplete");
}

function blockUser(): void {
	if (!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
	loading_block.value = true;
	confirm(
		t("chat.mod_tools.block_confirm_title", {
			USER: props.messageData.user.displayNameOriginal,
		}),
		t("chat.mod_tools.block_confirm_desc"),
	)
		.then(async () => {
			try {
				if (props.messageData.fake === true) {
					//Avoid blocking user for real if doing it from a fake message
					storeUsers.flagBlocked(props.messageData.platform, props.messageData.user.id);
				} else {
					await TwitchUtils.blockUser(props.messageData.user);
				}
			} catch (_error) {}
			loading_block.value = false;
			emit("actionComplete");
		})
		.catch(() => {
			loading_block.value = false;
		});
}

async function unblockUser(): Promise<void> {
	if (!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return;
	loading_block.value = true;
	try {
		if (props.messageData.fake === true) {
			//Avoid blocking user for real if doing it from a fake message
			storeUsers.flagUnblocked(props.messageData.platform, props.messageData.user.id);
		} else {
			await TwitchUtils.unblockUser(props.messageData.user);
		}
	} catch (_error) {}
	loading_block.value = false;
	emit("actionComplete");
}

async function timeoutUser(duration: number): Promise<void> {
	if (!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return;
	loading_ban.value = true;
	closeToOptions(true);
	try {
		if (props.messageData.fake === true) {
			//Avoid banning user for real if doing it from a fake message
			void storeUsers.flagBanned(
				props.messageData.platform,
				props.messageData.channel_id,
				props.messageData.user.id,
				duration,
			);
		} else {
			switch (props.messageData.platform) {
				case "twitch": {
					await TwitchUtils.banUser(
						props.messageData.user,
						props.messageData.channel_id,
						duration,
					);
					break;
				}
				case "youtube": {
					if (props.messageData.type != "message") break;
					await YoutubeHelper.instance.banUser(
						props.messageData.user.id,
						props.messageData.youtube_liveId!,
						duration,
					);
					break;
				}
			}
		}
	} catch (_error) {}
	loading_ban.value = false;
	emit("actionComplete");
}

function deleteMessage(): void {
	if (!TwitchUtils.requestScopes([TwitchScopes.DELETE_MESSAGES])) return;
	storeChat.deleteMessage(props.messageData, undefined, props.messageData.fake !== true);
}

async function openToOptions(): Promise<void> {
	showToOptions.value = true;
	await nextTick();
	gsap.from(toOptionsEl.value, { width: 0, duration: 0.2, ease: "sin.inOut" });
}

function closeToOptions(noDelay = false): void {
	closeTimeout = window.setTimeout(
		() => {
			const holder = toOptionsEl.value;
			if (!holder) return;
			gsap.to(holder, {
				width: 0,
				duration: 0.2,
				ease: "sin.inOut",
				onComplete: () => {
					showToOptions.value = false;
				},
			});
		},
		noDelay ? 0 : 500,
	);
}

function resetCloseTimeout(): void {
	clearTimeout(closeTimeout);
}

async function flagUser(mode: "restrict" | "monitor"): Promise<void> {
	if (!TwitchUtils.requestScopes([TwitchScopes.MANAGE_SUSPICIOUS_USERS])) return;
	loading_sus.value = true;
	const state = mode == "restrict" ? "RESTRICTED" : "ACTIVE_MONITORING";
	try {
		const success = await TwitchUtils.setSuspiciousUser(
			props.messageData.channel_id,
			props.messageData.user.id,
			state,
		);
		if (!success) throw new Error("probably trying to set same state");
		if (mode == "restrict") {
			storeUsers.flagRestrictedUser(props.messageData.channel_id, props.messageData.user);
		} else {
			storeUsers.flagSuspiciousUser(props.messageData.channel_id, props.messageData.user);
		}
	} catch (_error) {
		await TwitchUtils.unsetSuspiciousUser(
			props.messageData.channel_id,
			props.messageData.user.id,
		);
	}
	storeUsers.flagSuspiciousUser(props.messageData.channel_id, props.messageData.user);
	loading_sus.value = false;
	emit("actionComplete");
	// Give some time for EventSub to send update message
	await Utils.promisedTimeout(500);
	emit("actionComplete");
}

async function unflagUser(): Promise<void> {
	if (!TwitchUtils.requestScopes([TwitchScopes.MANAGE_SUSPICIOUS_USERS])) return;
	loading_sus.value = true;
	try {
		await TwitchUtils.unsetSuspiciousUser(
			props.messageData.channel_id,
			props.messageData.user.id,
		);
	} catch (_error) {}
	storeUsers.unflagUser(props.messageData.channel_id, props.messageData.user);
	loading_sus.value = false;
	emit("actionComplete");
	// Give some time for EventSub to send update message
	await Utils.promisedTimeout(500);
	emit("actionComplete");
}
</script>

<style scoped lang="less">
//Action icons are drawn with a CSS mask instead of <Icon> components.
//There's one set of these per chat message, an <Icon> costs a component
//instance plus its SVG DOM whereas this is a single empty element.
.maskIcon(@url) {
	-webkit-mask-image: url(@url);
	mask-image: url(@url);
}

.chatmodtools {
	gap: 5px;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;

	.icon,
	.action {
		height: 1em;
		width: 1em;
		cursor: pointer;
	}

	.action {
		display: inline-block;
		flex-shrink: 0;
		background-color: currentColor;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
		//Left aligned like the <svg> of an <Icon> for icons narrower than they are tall
		-webkit-mask-position: left center;
		mask-position: left center;
		-webkit-mask-size: contain;
		mask-size: contain;

		&.alert {
			color: var(--color-alert);
		}
		&.secondary {
			color: var(--color-secondary);
		}
		&.offsetUp {
			position: relative;
			top: -2px;
		}
		&.offsetDown {
			position: relative;
			top: 1px;
		}

		&.ban {
			.maskIcon("../../../assets/icons/ban.svg");
		}
		&.unban {
			.maskIcon("../../../assets/icons/unban.svg");
		}
		&.timeout {
			.maskIcon("../../../assets/icons/timeout.svg");
		}
		&.trash {
			.maskIcon("../../../assets/icons/trash.svg");
		}
		&.block {
			.maskIcon("../../../assets/icons/block.svg");
		}
		&.unblock {
			.maskIcon("../../../assets/icons/unblock.svg");
		}
		//Icons show the current state and preview the action on hover
		&.monitor,
		&.unmonitor:hover {
			.maskIcon("../../../assets/icons/hide.svg");
		}
		&.unmonitor,
		&.monitor:hover {
			.maskIcon("../../../assets/icons/show.svg");
		}
		&.restrict,
		&.unrestrict:hover {
			.maskIcon("../../../assets/icons/unlock.svg");
		}
		&.unrestrict,
		&.restrict:hover {
			.maskIcon("../../../assets/icons/lock.svg");
		}
	}

	.toOptions {
		overflow: hidden;
		display: inline-flex;
		flex-direction: row;
		bottom: 0;
		.button {
			border-radius: 0;
			padding: 0 0.25em;
			margin-right: 1px;
			&:first-child {
				border-top-left-radius: var(--border-radius);
				border-bottom-left-radius: var(--border-radius);
			}
			&:last-child {
				border-top-right-radius: var(--border-radius);
				border-bottom-right-radius: var(--border-radius);
			}
		}
	}
}
</style>
