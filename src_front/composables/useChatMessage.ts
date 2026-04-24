import { storeAuth as useStoreAuth } from "@/store/auth/storeAuth";
import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { storeUsers as useStoreUsers } from "@/store/users/storeUsers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ContextMenuHelper from "@/utils/ContextMenuHelper";
import Utils from "@/utils/Utils";
import { gsap } from "gsap/gsap-core";
import type { Ref } from "vue";
import { onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from "vue";

export function useChatMessage(
	props: {
		messageData: TwitchatDataTypes.ChatMessageTypes;
		lightMode: boolean;
		contextMenuOff: boolean;
	},
	emit: (event: "onRead", message: TwitchatDataTypes.ChatMessageTypes, e: MouseEvent) => void,
	rootEl: Ref<HTMLElement | null>,
) {
	const storeAuth = useStoreAuth();
	const storeParams = useStoreParams();
	const storeChat = useStoreChat();
	const storeUsers = useStoreUsers();

	const time = ref("");
	const canModerateMessage = ref(false);
	const canModerateUser_local = ref(false);
	let refreshTimeout: number = -1;
	let clickHandler: (e: MouseEvent) => void;

	/**
	 * Check if the currently authenticated user can moderate the message
	 */
	function canModerateUser(user: TwitchatDataTypes.TwitchatUser, channelId: string): boolean {
		const authenticatedUser =
			user.platform == "youtube" ? storeAuth.youtube.user : storeAuth.twitch.user;
		//Authenticated user may be undefined if disconnecting youtube but youtube messages are
		//loaded back from DB.
		if (!authenticatedUser?.channelInfo[channelId]) return false;
		return (
			//If broadcaster of the channel... or
			authenticatedUser.channelInfo[channelId]?.is_broadcaster ||
			//If moderator on this channel and user to moderate isn't also a moderator
			(authenticatedUser.channelInfo[channelId]?.is_moderator &&
				!user.channelInfo[channelId]?.is_moderator) ||
			//If own message and we're mod
			(user.id == authenticatedUser.id &&
				authenticatedUser.channelInfo[channelId]?.is_moderator)
		);
	}

	/**
	 * Refreshes the date at a regular interval if needed
	 */
	function refreshDate() {
		const elapsedMode = storeParams.appearance.displayTimeRelative.value === true;
		const d = new Date(props.messageData.date);

		if (elapsedMode) {
			const elapsed = Date.now() - d.getTime();
			const step =
				elapsed < 60000
					? 1000
					: elapsed < 60000 * 5
						? 5000
						: elapsed < 60000 * 10
							? 10000
							: 60000;

			time.value = Utils.elapsedDuration(d.getTime(), step);

			clearTimeout(refreshTimeout);
			refreshTimeout = window.setTimeout(() => {
				refreshDate();
			}, step);
		} else {
			time.value = Utils.toDigits(d.getHours()) + ":" + Utils.toDigits(d.getMinutes());
		}
	}

	/**
	 * Copy JSON data of the message
	 */
	function copyJSON(): void {
		void Utils.copyToClipboard(JSON.stringify(props.messageData));
		console.log(props.messageData);
		gsap.fromTo(
			rootEl.value!,
			{ scale: 1.2 },
			{ duration: 0.5, scale: 1, ease: "back.out(1.7)" },
		);
	}

	/**
	 * Apply custom highlight colors
	 */
	function applyStyles(): void {
		if (props.lightMode !== false) return;

		if (props.messageData.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) return;

		if (props.messageData.twitch_automod) return;
		if (props.messageData.automod) return;

		const holder = rootEl.value! as HTMLElement;
		const params = storeParams.appearance;
		const chanInfo = props.messageData.user.channelInfo[props.messageData.channel_id];
		let color = "";
		if (props.messageData.twitch_isFirstMessage && params.highlight1stEver.value === true) {
			color = params.highlight1stEver_color.value as string;
		} else if (props.messageData.todayFirst && params.highlight1stToday.value === true) {
			color = params.highlight1stToday_color.value as string;
		} else if (props.messageData.hasMention && params.highlightMentions.value === true) {
			color = params.highlightMentions_color.value as string;
		} else if (chanInfo && chanInfo.is_raider && params.raidHighlightUser.value === true) {
			color = params.raidHighlightUser_color.value as string;
			//Watch for change to remove border when raider highlight
			//duration has complete for this user
			watch(
				() => chanInfo.is_raider,
				() => {
					applyStyles();
				},
			);
		} else if (chanInfo && chanInfo.is_moderator && params.highlightMods.value === true) {
			color = params.highlightMods_color.value as string;
		} else if (chanInfo && chanInfo.is_vip && params.highlightVips.value === true) {
			color = params.highlightVips_color.value as string;
		} else if (props.messageData.user.is_partner && params.highlightPartners.value === true) {
			color = params.highlightPartners_color.value as string;
		} else if (chanInfo && chanInfo.is_subscriber && params.highlightSubs.value === true) {
			color = params.highlightSubs_color.value as string;
		}
		if (color) {
			holder.style.border = "1px solid " + color + "90";
			holder.style.backgroundColor = color + "10";
		} else {
			holder.style.border = "";
			holder.style.backgroundColor = "";
		}
	}

	/**
	 * Open the context menu on right click on desktop or long press on mobile
	 */
	function onContextMenu(
		e: MouseEvent | TouchEvent,
		message: TwitchatDataTypes.ChatMessageTypes,
		htmlNode: HTMLElement,
	): void {
		if (props.contextMenuOff !== false) return;
		if (e.target) {
			const el = e.target as HTMLElement;
			if (el.tagName == "A" && el.dataset.login === undefined) return;
		}
		if (window.getSelection()?.isCollapsed == false) return;
		const canModerate =
			canModerateMessage.value &&
			message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE;

		void ContextMenuHelper.instance.messageContextMenu(
			e,
			message,
			canModerate,
			canModerateUser_local.value,
			htmlNode,
		);
		e.stopPropagation();
	}

	/**
	 * Opens up a user card
	 */
	function openUserCard(
		user: TwitchatDataTypes.TwitchatUser,
		chanId?: string,
		platform?: TwitchatDataTypes.ChatPlatform,
	): void {
		storeUsers.openUserCard(
			user,
			chanId || props.messageData.channel_id,
			platform || props.messageData.platform,
		);
	}

	/**
	 * Delete current message from history
	 */
	function deleteMessage(): void {
		storeChat.deleteMessage(props.messageData);
	}

	/**
	 * Get user's profile page
	 */
	function getProfilePage(user: TwitchatDataTypes.TwitchatUser): string {
		switch (props.messageData.platform) {
			case "twitch": {
				return "https://www.twitch.tv/" + user.login;
			}
			case "youtube": {
				return "https://www.youtube.com/channel/" + user.id;
			}
		}
		return "#";
	}

	onBeforeMount(() => {
		if (
			props.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE ||
			props.messageData.type == TwitchatDataTypes.TwitchatMessageType.WHISPER
		) {
			canModerateUser_local.value = canModerateUser(
				props.messageData.user,
				props.messageData.channel_id,
			);
		} else if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT) {
			canModerateUser_local.value = canModerateUser(
				props.messageData.message.user,
				props.messageData.message.channel_id,
			);
		}

		if (
			props.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE ||
			props.messageData.type == TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT
		) {
			canModerateMessage.value =
				canModerateUser_local.value &&
				//If it's not announcement (they're not deletable)
				(!("twitch_announcementColor" in props.messageData) ||
					props.messageData.twitch_announcementColor == undefined) &&
				//If message is not older than 6h. Passed this we cannot delete a message on Twitch
				Date.now() - props.messageData.date < 6 * 60 * 60000;
		}

		refreshDate();
		//Watch for "relative" param update to refresh time accordingly
		watch(
			() => storeParams.appearance.displayTimeRelative.value,
			() => {
				clearTimeout(refreshTimeout);
				refreshDate();
			},
		);
	});

	onMounted(() => {
		clickHandler = (e: MouseEvent) => {
			if (e.ctrlKey || e.metaKey) {
				copyJSON();
				e.stopPropagation();
			} else {
				emit("onRead", props.messageData, e);
			}
		};
		rootEl.value!.addEventListener("click", clickHandler);

		//Apply styles and watch for params change for chat messages
		if (props.messageData.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
			applyStyles();

			const params = storeParams.appearance;
			watch(
				() => params.highlight1stEver.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlight1stEver_color.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlight1stToday.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlight1stToday_color.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightMentions.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightMentions_color.value,
				() => applyStyles(),
			);
			watch(
				() => params.raidHighlightUser.value,
				() => applyStyles(),
			);
			watch(
				() => params.raidHighlightUser_color.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightMods.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightMods_color.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightVips.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightVips_color.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightPartners.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightPartners_color.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightSubs.value,
				() => applyStyles(),
			);
			watch(
				() => params.highlightSubs_color.value,
				() => applyStyles(),
			);
		}
	});

	onBeforeUnmount(() => {
		clearTimeout(refreshTimeout);
		rootEl.value?.removeEventListener("click", clickHandler);
	});

	return {
		time,
		canModerateMessage,
		canModerateUser_local,
		canModerateUser,
		refreshDate,
		copyJSON,
		applyStyles,
		onContextMenu,
		openUserCard,
		deleteMessage,
		getProfilePage,
	};
}
