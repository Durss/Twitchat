import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { onBeforeUnmount, ref, watch } from "vue";

/**
 * Returns a reactive formatted time string for a chat message.
 * Handles both absolute (HH:MM) and relative ("5s ago") display modes,
 * and auto-refreshes itself when in relative mode.
 */
export function useMessageTime(getMessageData: () => TwitchatDataTypes.ChatMessageTypes) {
	const storeParams = useStoreParams();
	const time = ref("");
	let refreshTimeout = -1;

	function refresh() {
		const messageData = getMessageData();
		const elapsedMode = storeParams.appearance.displayTimeRelative.value === true;
		const d = new Date(messageData.date);

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
			refreshTimeout = window.setTimeout(refresh, step);
		} else {
			time.value = Utils.toDigits(d.getHours()) + ":" + Utils.toDigits(d.getMinutes());
		}
	}

	refresh();

	watch(
		() => storeParams.appearance.displayTimeRelative.value,
		() => {
			clearTimeout(refreshTimeout);
			refresh();
		},
	);

	onBeforeUnmount(() => {
		clearTimeout(refreshTimeout);
	});

	return time;
}
