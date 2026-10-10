import { storeParams as useStoreParams } from "@/store/params/storeParams";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import { computed, onBeforeUnmount, ref } from "vue";

/**
 * Clock shared by all messages so relative times all refresh on the same tick.
 * Runs while at least one message using it is mounted.
 */
const now = ref(Date.now());
let instanceCount = 0;
let tickInterval = -1;

/**
 * Returns a reactive formatted time string for a chat message.
 * Handles both absolute (HH:MM) and relative ("5s ago") display modes,
 * and auto-refreshes itself when in relative mode.
 */
export function useMessageTime(getMessageData: () => TwitchatDataTypes.ChatMessageTypes) {
	const storeParams = useStoreParams();

	if (instanceCount++ === 0) {
		tickInterval = window.setInterval(() => (now.value = Date.now()), 1000);
	}

	onBeforeUnmount(() => {
		if (--instanceCount === 0) clearInterval(tickInterval);
	});

	return computed(() => {
		const date = getMessageData().date;

		if (storeParams.appearance.displayTimeRelative.value === true) {
			void now.value; //Makes sure computed updates when "now" changes
			return Utils.elapsedDuration(date);
		}

		const d = new Date(date);
		return Utils.toDigits(d.getHours()) + ":" + Utils.toDigits(d.getMinutes());
	});
}
