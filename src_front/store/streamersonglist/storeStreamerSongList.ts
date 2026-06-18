import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import type {
	IStreamerSongListActions,
	IStreamerSongListGetters,
	IStreamerSongListState,
} from "../StoreProxy";
import StoreProxy from "../StoreProxy";

/**
 * Production OAuth2 authorize endpoint for StreamerSongList (SSL).
 * The token exchange / refresh happen server-side (confidential client).
 */
const SSL_AUTHORIZE_URL = "https://id.staging.streamersonglist.com/oauth2/auth";

export const storeStreamerSongList = defineStore("streamersonglist", {
	state: (): IStreamerSongListState => ({
		user: null,
		queue: [],
		token: null,
		connected: false,
		authResult: { code: "", csrf: "" },
	}),

	getters: {} satisfies StoreGetters<IStreamerSongListGetters, IStreamerSongListState>,

	actions: {
		populateData(): void {
			const tokenJSON = DataStore.get(DataStore.STREAMERSONGLIST_TOKEN);
			if (tokenJSON) {
				const token = JSON.parse(tokenJSON) as SSLToken;
				void ApiHelper.call(
					"streamersonglist/token/refresh",
					"POST",
					{ refreshToken: token.refresh_token },
					false,
				).then((result) => {
					if (result.json.token) {
						this.token = result.json.token;
						void this.onAuthenticated();
					} else {
						DataStore.remove(DataStore.STREAMERSONGLIST_TOKEN);
						StoreProxy.common.alert(
							StoreProxy.i18n.t("error.streamersonglist_connect_failed"),
						);
					}
				});
			}
		},

		setAuthResult(code: string, csrf: string): void {
			this.authResult.code = code;
			this.authResult.csrf = csrf;
		},

		async getOAuthURL(): Promise<string> {
			const csrfToken = await ApiHelper.call("auth/CSRFToken", "GET");
			const redirectURI =
				document.location.origin +
				StoreProxy.router.resolve({ name: "streamersonglist/auth" }).href;

			const url = new URL(SSL_AUTHORIZE_URL);
			url.searchParams.set("client_id", Config.instance.STREAMERSONGLIST_CLIENT_ID);
			url.searchParams.set("redirect_uri", redirectURI);
			url.searchParams.set("scope", Config.instance.STREAMERSONGLIST_SCOPES);
			url.searchParams.set("response_type", "code");
			url.searchParams.set("state", csrfToken.json.token);
			return url.href;
		},

		async getAccessToken(): Promise<boolean> {
			try {
				const csrfResult = await ApiHelper.call("auth/CSRFToken", "POST", {
					token: this.authResult.csrf,
				});
				if (!csrfResult.json.success) return false;
				const result = await ApiHelper.call(
					"streamersonglist/auth",
					"POST",
					{ code: this.authResult.code },
					false,
				);
				if (result.json.success) {
					this.token = result.json.token;
					await this.onAuthenticated();
					return true;
				}
				return false;
			} catch (_error) {
				return false;
			}
		},

		async onAuthenticated(): Promise<void> {
			//SSL rotates refresh tokens on every refresh, so always persist the
			//latest token we received before doing anything else.
			DataStore.set(DataStore.STREAMERSONGLIST_TOKEN, this.token);

			await this.loadInfos();
			this.connected = true;

			window.setTimeout(
				async () => {
					const res = await ApiHelper.call("streamersonglist/token/refresh", "POST", {
						refreshToken: this.token!.refresh_token,
					});
					if (res.status == 200 && res.json.token) {
						this.token = res.json.token;
						void this.onAuthenticated();
					}
				},
				(this.token!.expires_in - 60) * 1000,
			);
		},

		async disconnect(): Promise<boolean> {
			this.connected = false;
			this.user = null;
			this.queue = [];
			const token = this.token;
			DataStore.remove(DataStore.STREAMERSONGLIST_TOKEN);
			this.token = null;
			if (!token) return true;
			const result = await ApiHelper.call(
				"streamersonglist/auth",
				"DELETE",
				{ token: token.access_token },
				false,
			);
			return result.json.success === true;
		},

		async loadInfos(): Promise<{ user: SSLUserInfo; queue: SSLQueueEntry[] }> {
			const infos = await ApiHelper.call(
				"streamersonglist/info",
				"GET",
				{ token: this.token!.access_token },
				false,
				0,
			);
			this.user = infos.json.user;
			this.queue = infos.json.queue || [];
			return { user: this.user, queue: this.queue };
		},

		//TODO queue management actions (add / remove / reorder song requests)
		//against https://api.streamersonglist.com/docs/. Full read/write scopes
		//are already requested so these can be implemented without re-auth.
	} satisfies StoreActions<
		"streamersonglist",
		IStreamerSongListState,
		IStreamerSongListGetters,
		IStreamerSongListActions
	>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStreamerSongList, import.meta.hot));
}

export interface SSLToken {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
	id_token?: string;
}

export interface SSLUserInfo {
	amr: string[];
	aud: string[];
	auth_time: number;
	iat: number;
	iss: string;
	rat: number;
	sub: string;
}

export interface SSLQueueEntry {
	id: number;
	songName: string;
	requestedBy?: string;
}

