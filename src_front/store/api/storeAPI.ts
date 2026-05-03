import type { StoreActions } from "@/types/pinia-helpers";
import SSEEvent from "@/events/SSEEvent";
import ApiHelper from "@/utils/ApiHelper";
import SSEHelper from "@/utils/SSEHelper";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IAPIActions, IAPIGetters, IAPIState } from "../StoreProxy";
import PublicAPI from "@/utils/PublicAPI";
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import { toast } from "@/utils/toast/toast";
import ToastRemoteApiInfo from "@/utils/toast/ToastRemoteApiInfo.vue";
import StoreProxy from "../StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";

export const storeAPI = defineStore("api", {
	state: (): IAPIState => ({
		connected: false,
	}),

	actions: {
		populateData(): void {
			SSEHelper.instance.addEventListener(SSEEvent.REMOTE_ACTION, (event) => {
				this.onRemoteAction(event.data);
			});
		},

		async generateKey(): Promise<string | false> {
			const result = await ApiHelper.call("remote/key", "POST", undefined, false);
			if (result.json.success && result.json.data?.privateKey) {
				this.connected = true;
				return result.json.data.privateKey;
			}
			return false;
		},

		async deleteKey(toaster: boolean): Promise<boolean> {
			const result = await ApiHelper.call("remote/key", "DELETE", undefined, false);
			if (result.json.success) {
				this.connected = false;

				if (toaster) {
					toast(StoreProxy.i18n.t("api.revoke_success"), {
						type: "success",
						onClick: () => {
							StoreProxy.params.openParamsPage(
								TwitchatDataTypes.ParameterPages.CONNECTIONS,
								TwitchatDataTypes.ParamDeepSections.TWITCHAT_API,
							);
						},
					});
				}
				return true;
			}
			if (toaster) {
				toast(StoreProxy.i18n.t("api.revoke_error"), { type: "error" });
			}
			return false;
		},

		onRemoteAction(data?: { action: keyof TwitchatEventMap; data?: unknown }): void {
			if (!data?.data || !data?.action) return;
			PublicAPI.instance.broadcast(data.action, data.data, true, true);

			toast(ToastRemoteApiInfo, {
				autoClose: 4_000,
				contentProps: {
					action: data.action,
					data: data.data,
				},
				type: "success",
			});
		},
	} satisfies StoreActions<"api", IAPIState, IAPIGetters, IAPIActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeAPI, import.meta.hot));
}
