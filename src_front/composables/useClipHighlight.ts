import { storeChat as useStoreChat } from "@/store/chat/storeChat";
import { storeParams as useStoreParams } from "@/store/params/storeParams";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import Utils from "@/utils/Utils";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { isRef, ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

/**
 * Either a clip already loaded by the component, or a loader called when highlighting
 */
type ClipSource =
	| Ref<TwitchDataTypes.ClipInfo | null>
	| (() => Promise<TwitchDataTypes.ClipInfo | null>);

/**
 * Sends a clip to the "chat highlight" overlay.
 * Owns the loading and overlay availability states of the highlight button.
 */
export function useClipHighlight(
	props: { messageData: TwitchatDataTypes.ChatMessageTypes },
	clipSource: ClipSource,
	options: {
		/**
		 * Request the clip's MP4 source so the overlay plays it instead of the
		 * Twitch player. Only available for our own clips, and only once Twitch
		 * has processed them
		 */
		fetchMp4?: boolean;
	} = {},
) {
	const storeParams = useStoreParams();
	const storeChat = useStoreChat();
	const i18n = useI18n();

	const clipHighlightLoading = ref(false);
	const highlightOverlayAvailable = ref(false);

	/**
	 * Check if highlight overlay is available
	 */
	async function checkOverlayPresence(): Promise<boolean> {
		const res = await Utils.getHighlightOverPresence();
		highlightOverlayAvailable.value = res;
		return res;
	}

	/**
	 * Gets te clip data.
	 * Retrive MP4 url if necessary
	 */
	async function getClipData(): Promise<TwitchatDataTypes.ClipInfo | undefined> {
		// Pending clip create already has the necessary data
		if (
			props.messageData.type ==
				TwitchatDataTypes.TwitchatMessageType.CLIP_PENDING_PUBLICATION &&
			props.messageData.clipData
		) {
			return props.messageData.clipData;
		}
		const info = isRef(clipSource) ? clipSource.value : await clipSource();
		if (!info) return undefined;

		const clip: TwitchatDataTypes.ClipInfo = {
			url: info.embed_url,
			// mp4:info.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
			duration: info.duration,
		};
		if (options.fetchMp4 !== false && TwitchUtils.hasScopes([TwitchScopes.MANAGE_CLIPS])) {
			const clipSrcPath = await TwitchUtils.getClipsSrcPath([info.id]);
			if (clipSrcPath.length > 0) {
				clip.mp4 = clipSrcPath[0]!.landscape_download_url;
			}
		}
		return clip;
	}

	/**
	 * Send a clip to the overlay
	 */
	async function clipHighlight(): Promise<void> {
		clipHighlightLoading.value = true;

		if (!(await checkOverlayPresence())) {
			storeParams.openParamsPage(
				TwitchatDataTypes.ParameterPages.OVERLAYS,
				TwitchatDataTypes.ParamDeepSections.HIGHLIGHT,
			);
			clipHighlightLoading.value = false;
			return;
		}

		const clipHighlightData: TwitchatDataTypes.ChatHighlightInfo = {
			clip: await getClipData(),
			date: props.messageData.date,
			message_id: props.messageData.id,
			params: storeChat.chatHighlightOverlayParams,
			dateLabel: i18n.tm("global.date_ago"),
		};
		PublicAPI.instance.broadcast("SET_CHAT_HIGHLIGHT_OVERLAY_CLIP", clipHighlightData);
		storeChat.highlightedMessageId = props.messageData.id;
		await Utils.promisedTimeout(1000);
		clipHighlightLoading.value = false;
	}

	return {
		clipHighlightLoading,
		highlightOverlayAvailable,
		checkOverlayPresence,
		clipHighlight,
	};
}
