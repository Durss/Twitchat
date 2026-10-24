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
let refreshFailCount = 0;
let connectPromise: Promise<boolean> | null = null;
let authMessageHandler: ((event: MessageEvent) => void) | null = null;
const tokenRefreshMargin = 10 * 60000;

/**
 * Schedules a new connection attempt with an exponential backoff.
 *
 * Only used for recoverable failures. Twitch invalidates a refresh token as
 * soon as it's used and it's the only way back into the session, so a network
 * glitch or an API outage must never drop it.
 */
function scheduleRetry(callback: () => void): void {
	refreshFailCount++;
	const delay = Math.min(5000 * Math.pow(2, refreshFailCount - 1), 60000);
	clearTimeout(refreshTokenTimeout);
	refreshTokenTimeout = window.setTimeout(callback, delay);
}

/**
 * Reads the token currently stored on the local storage.
 * Another tab may have refreshed it behind our back, in which case ours is
 * dead but the session isn't.
 */
function getStoredToken(): TwitchDataTypes.AuthTokenResult | null {
	try {
		const params = DataStore.get(DataStore.TWITCH_BOT);
		if (!params) return null;
		return (JSON.parse(params) as IStoreData).authToken || null;
	} catch (_error) {
		return null;
	}
}

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
			//Collapse concurrent calls. Twitch invalidates a refresh token as soon as
			//it's used, so refreshing twice in parallel would leave us holding a dead
			//one and lose the session.
			if (connectPromise) return connectPromise;
			connectPromise = (async (): Promise<boolean> => {
				clearTimeout(refreshTokenTimeout);
				if (oAuthCode && oAuthCsrf) {
					await this.completeOAuthProcess(oAuthCode, oAuthCsrf);
				}
				if (!this.authToken || !this.authToken.refresh_token) return false;

				let refreshFailed = false;
				let refreshDelay = this.authToken.expires_at - Date.now() - tokenRefreshMargin;
				//Refresh token if it expires in less than 11min (or expiry is unknown)
				if (isNaN(refreshDelay) || refreshDelay <= 60000) {
					const usedToken = this.authToken.refresh_token;
					//No ApiHelper retry, it would replay a single use refresh token.
					//Recoverable failures are retried by scheduleRetry() below.
					const res = await ApiHelper.call(
						"auth/twitch/refreshtoken",
						"GET",
						{ token: usedToken },
						false,
					);
					if (res.status == 200 && res.json && res.json.access_token) {
						this.authToken = res.json;
						this.authToken.expires_at = Date.now() + this.authToken.expires_in * 1000;
						//Persist right away. Twitch killed the previous refresh token when
						//issuing this one, losing it before the end of this method would
						//leave the local storage holding a dead token.
						this.saveParams();
					} else if (res.status == 400 || res.status == 401) {
						//Twitch explicitely rejected the refresh token.
						const storedToken = getStoredToken();
						if (storedToken && storedToken.refresh_token != usedToken) {
							//Another tab rotated the token while we were refreshing. Ours
							//is dead but the session isn't, pick theirs up and retry.
							this.authToken = storedToken;
							scheduleRetry(() => void this.connect());
							return false;
						}
						//Token is dead for good, user has to authenticate again
						this.disconnect();
						toast(StoreProxy.i18n.t("error.twitch_bot_disconnected"), {
							autoClose: false,
						});
						return false;
					} else {
						//Twitchat or Twitch is unreachable. Keep the refresh token, it's
						//the only way back into the session.
						refreshFailed = true;
					}
				}

				if (isNaN(this.authToken.expires_at) || this.authToken.expires_at <= Date.now()) {
					//The access token expired and we couldn't reach the API to mint a
					//new one (5xx/timeout/offline, a 4xx would have been handled above).
					//Twitch never rejected the refresh token, so the grant is most
					//likely still good: nothing can be sent until this recovers, but
					//dropping the token here would force a whole new oAuth flow.
					this.connected = false;
					scheduleRetry(() => void this.connect());
					return false;
				}

				const tokenValidateRes = await TwitchUtils.validateToken(
					this.authToken.access_token,
				);
				if (!tokenValidateRes || !("user_id" in tokenValidateRes)) {
					if (tokenValidateRes && "status" in tokenValidateRes) {
						//Twitch rejected the access token. Force a refresh on the next
						//attempt, if the refresh token is dead too it'll be caught above.
						this.authToken.expires_at = 0;
					}
					this.connected = false;
					scheduleRetry(() => void this.connect());
					return false;
				}

				refreshFailCount = 0;
				const userRes = await TwitchUtils.getUserInfo([tokenValidateRes.user_id]);
				//Keep the previous infos if the call failed, dropping them would stop
				//the bot from sending anything until the next refresh
				if (userRes && userRes.length > 0) this.userInfos = userRes[0]!;

				//Schedule next refresh 10min before expiry. Retry in 5s if the last
				//refresh failed.
				refreshDelay = refreshFailed
					? 5000
					: this.authToken.expires_at - Date.now() - tokenRefreshMargin;
				refreshDelay = Math.max(5000, Math.min(refreshDelay, 3 * 60 * 60 * 1000));
				refreshTokenTimeout = window.setTimeout(() => {
					void this.connect();
				}, refreshDelay);
				this.connected = true;
				this.saveParams();
				return true;
			})().finally(() => {
				connectPromise = null;
			});
			return connectPromise;
		},

		disconnect(): void {
			clearTimeout(refreshTokenTimeout);
			refreshFailCount = 0;
			this.connected = false;
			this.connecting = false;
			this.authToken = null;
			this.userInfos = null;
			DataStore.remove(DataStore.TWITCH_BOT);
		},

		async startAuthFlow(event: MouseEvent): Promise<void> {
			this.connecting = true;
			let csrf = "";
			try {
				const { json } = await ApiHelper.call("auth/CSRFToken", "GET");
				csrf = json.token;
			} catch (_e) {
				toast(StoreProxy.i18n.t("error.csrf_failed"));
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
				//Only keep one listener alive. An oAuth code is single use, letting
				//them stack up would make every extra one fail the exchange.
				if (authMessageHandler) window.removeEventListener("message", authMessageHandler);
				authMessageHandler = async (event: MessageEvent) => {
					if (event.origin !== window.location.origin) return;
					if (event.data?.type !== "TWITCHBOT_AUTH_RESULT") return;
					window.removeEventListener("message", authMessageHandler!);
					authMessageHandler = null;
					clearInterval(popupCloseCheckInterval);
					const { code, csrf } = event.data.data;
					this.connected = await this.completeOAuthProcess(code, csrf);
					this.connecting = false;
				};
				window.addEventListener("message", authMessageHandler);
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
			if (result.status == 200 && result.json && result.json.access_token) {
				refreshFailCount = 0;
				this.authToken = result.json;
				this.authToken.expires_at = Date.now() + this.authToken.expires_in * 1000;
				//Persist before anything else can fail, this token is all we get
				this.saveParams();
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
