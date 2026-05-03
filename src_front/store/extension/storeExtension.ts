import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IExtensionActions, IExtensionGetters, IExtensionState } from "../StoreProxy";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import Config from "@/utils/Config";

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
	}),

	getters: {
		companionEnabled: function () {
			return !!this.enabledExtensions.find(
				(v) => v.id === Config.instance.TWITCH_EXTENSION_ID,
			);
		},
	} satisfies StoreGetters<IExtensionGetters, IExtensionState>,

	actions: {
		init(): void {
			void this.updateInternalStates();
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

			void this.updateInternalStates();

			return result;
		},

		async updateInternalStates(): Promise<void> {
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
						slots[element.id] = { type: slotType, index: slotId };
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
		},
	} satisfies StoreActions<"Extension", IExtensionState, IExtensionGetters, IExtensionActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeExtension, import.meta.hot));
}
