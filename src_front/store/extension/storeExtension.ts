import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IExtensionActions, IExtensionGetters, IExtensionState } from "../StoreProxy";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Config from "@/utils/Config";
import ApiHelper from "@/utils/ApiHelper";
import Utils from "@/utils/Utils";

let lastEBSCall_ts = 0;
let pendingEBSQuery: Promise<void> | null = null;
let pendingEBSUpdate: Promise<boolean> | null = null;
let queuedEBSUpdate = false;

/**
 * Defines version AFTER which a feature is available.
 * If something exists on v 0.0.2 only set previous
 * version "0.0.1" as reference.
 * It does NOT define the version number from which
 * the feature is available.
 */
const FEATURE_VERSIONS = {
	shuffleAnswers: "0.0.1",
	limitAnswers: "0.0.1",
	areasTitle: "0.0.1",
	areasCooldown: "0.0.2",
	areasPermissions: "0.0.3",
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
		ebsConfigured: false,
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
			const [allExtensions, enabledExtensions] = await Promise.all([
				TwitchUtils.listExtensions(false),
				TwitchUtils.listExtensions(true),
			]);

			if (allExtensions) this.availableExtensions = allExtensions;

			if (enabledExtensions) {
				this.availableSlots.panel = Object.keys(enabledExtensions.panel).length;
				this.availableSlots.overlay = Object.keys(enabledExtensions.overlay).length;
				this.availableSlots.component = Object.keys(enabledExtensions.component).length;

				const slots: IExtensionState["activeExtensionSlots"] = {};
				const extensions: TwitchDataTypes.Extension[] = [];
				const keys: (keyof typeof enabledExtensions)[] = ["component", "overlay", "panel"];
				for (const slotType of keys) {
					const category = enabledExtensions[slotType];
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
				// This makes sure EBS config contain the server-declared "env" prop
				// letting clients know which env the streamer is running on.
				void this.ensureEBSConfigured();
			}
		},

		async getEBSConfigs(force: boolean = false): Promise<void> {
			if (pendingEBSQuery && !force) return pendingEBSQuery;

			const request = ApiHelper.call("twitch/extension/config", "GET", undefined, false)
				.then((res) => {
					if (res.status !== 200) return;
					this.ebsConfigs.captureClicks = res.json.config?.captureClicks === true;
					this.ebsConfigs.captureKeys = res.json.config?.captureKeys === true;
					this.ebsConfigured = res.json.envMatch === true;
				})
				.catch((_) => {})
				.finally(() => {
					if (pendingEBSQuery === request) pendingEBSQuery = null;
				});

			if (!force) pendingEBSQuery = request;
			return request;
		},

		async ensureEBSConfigured(): Promise<void> {
			await this.getEBSConfigs();
			if (!this.companionEnabled) return;
			if (this.ebsConfigured) return;
			await this.updateEBSConfigs();
		},

		async updateEBSConfigs(): Promise<boolean> {
			// A write is already running. Flag a single trailing run so the latest
			// state still gets pushed.
			if (pendingEBSUpdate) {
				queuedEBSUpdate = true;
				return pendingEBSUpdate;
			}

			this.ebsConfigUpdating = true;

			const request = (async () => {
				let success = false;
				do {
					queuedEBSUpdate = false;
					// EBS edition has a 20 times per minute rate limit which corresponds
					// to "every 3s max". Here we add a fake timeout to make sure we
					// don't call this endpoint more often
					const toWait = lastEBSCall_ts + 3000 - Date.now();
					lastEBSCall_ts = Math.max(Date.now(), lastEBSCall_ts + 3000);
					if (toWait > 0) await Utils.promisedTimeout(toWait);

					const res = await ApiHelper.call("twitch/extension/config", "POST", {
						config: {
							captureClicks: this.ebsConfigs.captureClicks,
							captureKeys: this.ebsConfigs.captureKeys,
						},
					});
					await this.getEBSConfigs(true);
					lastEBSCall_ts = Math.max(lastEBSCall_ts, Date.now());
					success = res.status === 200 && res.json.success === true;
				} while (queuedEBSUpdate);
				return success;
			})().finally(() => {
				pendingEBSUpdate = null;
				this.ebsConfigUpdating = false;
			});

			pendingEBSUpdate = request;
			return request;
		},

		async clearEBSConfigs(): Promise<boolean> {
			const res = await ApiHelper.call("twitch/extension/config", "DELETE", {});
			await this.getEBSConfigs(true);
			return res.status === 200 && res.json.success === true;
		},

		hasFeature(feature: EtensionFeature): boolean {
			return Utils.compareSementicVersion(this.companionVersion, FEATURE_VERSIONS[feature]);
		},
	} satisfies StoreActions<"Extension", IExtensionState, IExtensionGetters, IExtensionActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeExtension, import.meta.hot));
}
