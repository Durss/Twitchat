import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import type { ITwitchBotActions, ITwitchBotGetters, ITwitchBotState } from "../StoreProxy";
import StoreProxy from "../StoreProxy";
import { toast } from "@/utils/toast/toast";

let oAuthCode: string = "";
let oAuthCsrf: string = "";
let refreshTokenTimeout = -1;
let popupCloseCheckInterval = -1;
export const storeTwitchBot = defineStore("switchbot", {
	state: (): ITwitchBotState => ({
		connected: false,
		connecting: false,
		authToken: null,
		userInfos: null,
	}),

	getters: {} satisfies StoreGetters<ITwitchBotGetters, ITwitchBotState>,

	actions: {
		async populateData(): Promise<void> {
			const params = DataStore.get(DataStore.TWITCH_BOT);
			if (params) {
				const data = JSON.parse(params) as IStoreData;
				if (data?.authToken && data.authToken.access_token) {
					this.authToken = data.authToken;
					void this.connect();
				}
			}
		},

		async connect(): Promise<boolean> {
			clearTimeout(refreshTokenTimeout);
			if (oAuthCode && oAuthCsrf) {
				await this.completeOAuthProcess(oAuthCode, oAuthCsrf);
			}
			if (this.authToken && this.authToken.refresh_token) {
				let refreshDelay = this.authToken.expires_at - Date.now() - 10 * 60000;
				let refreshFailed = false;
				//Refresh token if it expires in less than 10min (or expiry is unknown)
				if (isNaN(refreshDelay) || refreshDelay <= 60000) {
					try {
						const res = await ApiHelper.call("auth/twitch/refreshtoken", "GET", {
							token: this.authToken.refresh_token,
						});
						if (res.status != 200 || !res.json || !res.json.access_token) {
							throw "invalid refresh result";
						}
						this.authToken = res.json;
						this.authToken.expires_at = Date.now() + this.authToken.expires_in * 1000;
					} catch (_error) {
						refreshFailed = true;
					}
				}

				const expired =
					isNaN(this.authToken.expires_at) || this.authToken.expires_at <= Date.now();
				const userRes = expired
					? null
					: await TwitchUtils.validateToken(this.authToken.access_token);
				if (!userRes || isNaN((userRes as TwitchDataTypes.Token).expires_in)) {
					this.disconnect();
					toast(StoreProxy.i18n.t("error.twitch_bot_disconnected"), { autoClose: false });
					return false;
				}
				this.userInfos = userRes as TwitchDataTypes.Token;

				//Schedule next refresh 10min before expiry. Retry in 1min if the last
				//refresh failed.
				refreshDelay = refreshFailed
					? 60000
					: this.authToken.expires_at - Date.now() - 10 * 60000;
				refreshDelay = Math.max(60000, Math.min(refreshDelay, 3 * 60 * 60 * 1000));
				refreshTokenTimeout = window.setTimeout(() => {
					void this.connect();
				}, refreshDelay);
				this.connected = true;
				this.saveParams();
				return true;
			}
			return false;
		},

		disconnect(): void {
			clearTimeout(refreshTokenTimeout);
			this.connected = false;
			this.authToken = null;
			DataStore.remove(DataStore.TWITCH_BOT);
		},

		async startAuthFlow(event: MouseEvent): Promise<void> {
			this.connecting = true;
			let csrf = "";
			try {
				const { json } = await ApiHelper.call("auth/CSRFToken", "GET");
				csrf = json.token;
			} catch (_e) {
				StoreProxy.common.alert(StoreProxy.i18n.t("error.csrf_failed"));
			}
			const url = TwitchUtils.getOAuthURL(
				csrf,
				["chat:edit", "user:write:chat", "moderator:manage:announcements"],
				"/twitchbot",
			);
			const win = window.open(url, "twitchbot", "width=800,height=600");
			if (win) {
				//detect popup close with cross origin support
				clearInterval(popupCloseCheckInterval);
				popupCloseCheckInterval = window.setInterval(() => {
					if (win.closed) {
						clearInterval(popupCloseCheckInterval);
						this.connecting = false;
					}
				}, 1000);
				window.addEventListener("message", async (event) => {
					clearInterval(popupCloseCheckInterval);
					if (event.data.type === "TWITCHBOT_AUTH_RESULT") {
						const { code, csrf } = event.data.data;
						this.connected = await this.completeOAuthProcess(code, csrf);
						this.connecting = false;
					}
				});
				event.preventDefault();
			} else {
				//Couldn't open popup, redirect
				window.location.href = url;
			}
		},

		async completeOAuthProcess(code: string, csrf: string): Promise<boolean> {
			oAuthCode = code;
			oAuthCsrf = csrf;
			const result = await ApiHelper.call("auth/twitch", "GET", {
				code: oAuthCode,
				csrf: oAuthCsrf,
			});
			oAuthCode = oAuthCsrf = "";
			if (result.status == 200) {
				this.authToken = result.json;
				this.authToken.expires_at = Date.now() + this.authToken.expires_in * 1000;
				void this.connect();
				return true;
			}
			return false;
		},

		saveParams(): void {
			let params: IStoreData = {
				authToken: this.authToken!,
			};
			DataStore.set(DataStore.TWITCH_BOT, params);
		},
	} satisfies StoreActions<"twitchbot", ITwitchBotState, ITwitchBotGetters, ITwitchBotActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTwitchBot, import.meta.hot));
}

interface IStoreData {
	authToken: TwitchDataTypes.AuthTokenResult;
}
