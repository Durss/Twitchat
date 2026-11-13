import type { StoreActions } from "@/types/pinia-helpers";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import PublicAPI from "@/utils/PublicAPI";
import TriggerUtils from "@/utils/TriggerUtils";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { JsonObject } from "type-fest";
import DataStore from "../DataStore";
import type {
	IEndingCreditsActions,
	IEndingCreditsGetters,
	IEndingCreditsState,
} from "../StoreProxy";
import StoreProxy from "../StoreProxy";

let debounce: number = -1;

export const storeEndingCredits = defineStore("EndingCredits", {
	state: (): IEndingCreditsState => ({
		overlayData: {
			scale: 30,
			padding: 100,
			paddingTitle: 30,
			fontTitle: "Inter",
			fontEntry: "Inter",
			colorTitle: "#e04e00",
			colorEntry: "#039372",
			textShadow: 50,
			timing: "speed",
			startDelay: 0,
			duration: 60,
			speed: 200,
			fadeSize: 50,
			loop: true,
			showIcons: true,
			stickyTitle: false,
			hideEmptySlots: true,
			ignoreBots: true,
			powerUpEmotes: true,
			ignoreCustomBots: [],
			slots: [],
		},
	}),

	actions: {
		populateData(): void {
			const json = DataStore.get(DataStore.ENDING_CREDITS_PARAMS);
			if (json) {
				Utils.mergeRemoteObject(
					JSON.parse(json),
					this.overlayData as unknown as JsonObject,
				);
			}
		},

		async saveParams(): Promise<void> {
			clearTimeout(debounce);
			debounce = window.setTimeout(async () => {
				this.overlayData.fontTitle = this.overlayData.fontTitle ?? "Inter";
				this.overlayData.fontEntry = this.overlayData.fontEntry ?? "Inter";

				DataStore.set(DataStore.ENDING_CREDITS_PARAMS, this.overlayData);

				//Parse "text" slots placholders
				const result = JSON.parse(
					JSON.stringify(this.overlayData),
				) as TwitchatDataTypes.EndingCreditsParams;
				const channelId = StoreProxy.auth.twitch.user.id;
				let fakeStartDate = StoreProxy.stream.currentStreamInfo[channelId]?.started_at;
				if (!fakeStartDate) fakeStartDate = Date.now() - 60 * 60000;
				for (const slot of result.slots) {
					if (slot.slotType !== "text") continue;
					slot.text = (slot.text || "").replace(
						/\{MY_STREAM_DURATION\}/gi,
						Utils.formatDuration(Date.now() - fakeStartDate),
					);
					slot.text = slot.text.replace(
						/\{MY_STREAM_DURATION_MS\}/gi,
						(Date.now() - fakeStartDate).toString(),
					);
					if (slot.text) {
						slot.text = await TriggerUtils.parseGlobalPlaceholders(slot.text, false);
					}
				}
				PublicAPI.instance.broadcast("ON_ENDING_CREDITS_CONFIGS", result);
			}, 50);
		},
	} satisfies StoreActions<
		"EndingCredits",
		IEndingCreditsState,
		IEndingCreditsGetters,
		IEndingCreditsActions
	>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeEndingCredits, import.meta.hot));
}
