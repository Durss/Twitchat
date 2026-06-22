import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IExtensionActions, IExtensionGetters, IExtensionState } from "../StoreProxy";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Config from "@/utils/Config";
import ApiHelper from "@/utils/ApiHelper";
import Utils from "@/utils/Utils";

let lastEBSCall_ts = 0;

/**
 * Defines version AFTER which a feature is available.
 * If something exists on v 0.0.2 only set previous
 * version "0.0.1" as reference.
 * It does NOT define the version number from which
 * the feature is available.
 */
const FEATURE_VERSIONS = {
	shuffleAnswers: "0.0.1",
} as const;

export type EtensionFeature = keyof typeof FEATURE_VERSIONS;

export const storeExtension = defineStore("Extension", {
	state: (): IExtensionState => ({
		availableSlots: {
			panel: 0,
			overlay: 0,
			component: 0,
		},
		availableExtensions: [],
		enabledExtensions: [],
		activeExtensionSlots: {},
		ebsConfigUpdating: false,
		ebsConfigs: { captureClicks: false, captureKeys: false },
	}),

	getters: {
		companionInstalled: function () {
			return !!this.availableExtensions.find(
				(v) => v.id === Config.instance.TWITCHAT_EXTENSION_ID,
			);
		},
		companionEnabled: function () {
			return !!this.enabledExtensions.find(
				(v) => v.id === Config.instance.TWITCHAT_EXTENSION_ID,
			);
		},
		companionVersion: function () {
			return (
				this.enabledExtensions.find((v) => v.id === Config.instance.TWITCHAT_EXTENSION_ID)
					?.version || "0.0.0"
			);
		},
	} satisfies StoreGetters<IExtensionGetters, IExtensionState>,

	actions: {
		async populateData() {
			await this.updateInternalStates(true);
		},

		async setExtensionState(
			enable: boolean,
			slotIndex: string,
			slotType: TwitchDataTypes.Extension["type"][number],
			extension: TwitchDataTypes.Extension,
		): Promise<boolean> {
			const result = await TwitchUtils.updateExtension(
				extension.id,
				extension.version,
				enable,
				slotIndex,
				slotType,
			);

			await this.updateInternalStates();

			return result;
		},

		async updateInternalStates(isInit?: boolean): Promise<void> {
			const [list, listEnabled] = await Promise.all([
				TwitchUtils.listExtensions(false),
				TwitchUtils.listExtensions(true),
			]);

			if (list) this.availableExtensions = list;

			if (listEnabled) {
				this.availableSlots.panel = Object.keys(listEnabled.panel).length;
				this.availableSlots.overlay = Object.keys(listEnabled.overlay).length;
				this.availableSlots.component = Object.keys(listEnabled.component).length;

				const slots: IExtensionState["activeExtensionSlots"] = {};
				const extensions: TwitchDataTypes.Extension[] = [];
				const keys: (keyof typeof listEnabled)[] = ["component", "overlay", "panel"];
				for (const slotType of keys) {
					const category = listEnabled[slotType];
					for (const slotId in category) {
						const element = category[slotId];
						if (!element?.active) continue;
						slots[element.id] = {
							type: slotType,
							index: slotId,
							version: element.version,
						};
						extensions.push({
							can_activate: true,
							id: element.id,
							name: element.name,
							version: element.version,
							type: [slotType],
						});
					}
				}
				this.activeExtensionSlots = slots;
				this.enabledExtensions = extensions;
			}

			if (isInit && this.companionEnabled) {
				ApiHelper.call("twitch/extension/config", "GET")
					.then((res) => {
						if (res.json.config) {
							this.ebsConfigs.captureClicks = res.json.config.captureClicks === true;
							this.ebsConfigs.captureKeys = res.json.config.captureKeys === true;

							// This makes sure EBS config contain the server-declared "env" prop
							// letting clients know which env the streamer is running on.
							// This makes sure EBS server knows to which env reroute viewer
							// queries to.
							void this.updateEBSConfigs();
						}
					})
					.catch((_) => {});
			}
		},

		async updateEBSConfigs(): Promise<boolean> {
			this.ebsConfigUpdating = true;
			const elapsed = Date.now() - lastEBSCall_ts;
			const toWait = 3000 - elapsed;
			if (toWait > 0) {
				// EBS edition has a 20 times per minute rate limit which corresponds
				// to "every 3s max". Here we add a fake timeout to make sure we
				// don't call this endpoint more often
				await Utils.promisedTimeout(toWait);
			}
			const res = await ApiHelper.call("twitch/extension/config", "POST", {
				config: {
					captureClicks: this.ebsConfigs.captureClicks,
					captureKeys: this.ebsConfigs.captureKeys,
				},
			});
			lastEBSCall_ts = Date.now();
			this.ebsConfigUpdating = false;
			const success = res.status === 200 && res.json.success === true;
			return success;
		},

		hasFeature(feature: EtensionFeature): boolean {
			return Utils.compareSementicVersion(this.companionVersion, FEATURE_VERSIONS[feature]);
		},
	} satisfies StoreActions<"Extension", IExtensionState, IExtensionGetters, IExtensionActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeExtension, import.meta.hot));
}
