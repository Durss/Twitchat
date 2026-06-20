import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import Utils from "@/utils/Utils";
import { Centrifuge } from "centrifuge";
import type { PublicationContext, Subscription } from "centrifuge";
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

/**
 * SSL REST API base URL
 */
const SSL_API_BASE = "https://api.staging.streamersonglist.com";

/**
 * Websocket URL
 */
const SSL_EVENTS_URL = "wss://events.staging.streamersonglist.com/connection/websocket";

let centrifuge: Centrifuge | null = null;
let subscription: Subscription | null = null;

/**
 * Envelope wrapping every socket event.
 * When "data" is null the client is expected to refetch the related resource over the REST API.
 */
interface SSLEventEnvelope {
	type: string;
	data: unknown;
}

/**
 * Payload of a "queue_add" event
 */
interface SSLQueueDetails {
	id: number;
	note: string | null;
	createdAt: string; // ISO-8601
	songId: number | null;
	nonlistSong: string | null;
	streamerId: number;
	position: number;
	song: {
		title: string;
		artist: string;
		lastPlayed: string | null; // ISO-8601
		lastPlayedFrom: string;
		timesPlayed: number;
		comment: string | null;
		capo: string | null;
		attributes: { name: string; image: string | null }[];
	};
	requests: {
		id: number;
		name: string;
		amount: number;
		requestText: string;
		source: string;
		createdAt: string; // ISO-8601
		user: { username: string; platform: string } | null;
	}[];
}

export const storeStreamerSongList = defineStore("streamersonglist", {
	state: (): IStreamerSongListState => ({
		user: null,
		queue: [],
		token: null,
		streamerId: null,
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

			void this.connectToSocket();

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
			this.disconnectSocket();
			this.connected = false;
			this.user = null;
			this.queue = [];
			this.streamerId = null;
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

		async connectToSocket(): Promise<void> {
			if (!this.token) return;
			if (centrifuge) return; //Already connected/connecting

			//Resolve streamer ID to the subscribe to their events
			if (this.streamerId == null) {
				try {
					const res = await fetch(SSL_API_BASE + "/users/self", {
						headers: { Authorization: "Bearer " + this.token.access_token },
					});
					if (!res.ok) throw new Error("HTTP " + res.status);
					const self = (await res.json()) as { id?: number };
					if (typeof self.id !== "number") throw new Error("Missing streamer ID");
					this.streamerId = self.id;
				} catch (error) {
					console.error("[StreamerSongList] Could not resolve streamer ID", error);
					return;
				}
			}

			//Builds the common fields shared by every Twitchat trigger message.
			const baseEvent = (): TwitchatDataTypes.AbstractTwitchatMessage => ({
				id: Utils.getUUID(),
				date: Date.now(),
				platform: "twitchat",
				channel_id: StoreProxy.auth.twitch.user.id,
				type: "message",
			});

			centrifuge = new Centrifuge(SSL_EVENTS_URL);
			centrifuge.on("error", (ctx) => {
				console.warn("[StreamerSongList] Socket error", ctx);
			});

			//"streamer:{id}" is the public channel carrying every streamer's events
			subscription = centrifuge.newSubscription("streamer:" + this.streamerId);
			subscription.on("publication", (ctx: PublicationContext) => {
				const envelope = ctx.data as SSLEventEnvelope | null;
				if (!envelope || !envelope.type) return;

				switch (envelope.type) {
					case "queue_add": {
						const details = envelope.data as SSLQueueDetails | null;
						if (!details) break;
						const songTitle = details.song?.title || details.nonlistSong || "";
						const songArtist = details.song?.artist || "";
						const requestedBy = details.requests?.[0]?.name || "";
						//Keep the local queue in sync
						this.queue.push({
							id: details.id,
							songName: songTitle,
							requestedBy: requestedBy || undefined,
						});
						const message: TwitchatDataTypes.MessageStreamerSongListQueueAddData = {
							...baseEvent(),
							type: TwitchatDataTypes.TwitchatMessageType.STREAMERSONGLIST_QUEUE_ADD,
							streamerSongListQueueAdd: {
								songId: details.id.toString(),
								songTitle,
								songArtist,
								requestedBy,
								note: details.note || "",
							},
						};
						void TriggerActionHandler.instance.execute(message);
						break;
					}

					case "queue_remove": {
						const id = (envelope.data as { id: number } | null)?.id;
						if (id == null) break;
						const removed = this.queue.find((v) => v.id === id);
						this.queue = this.queue.filter((v) => v.id !== id);
						const message: TwitchatDataTypes.MessageStreamerSongListQueueRemoveData = {
							...baseEvent(),
							type: TwitchatDataTypes.TwitchatMessageType
								.STREAMERSONGLIST_QUEUE_REMOVE,
							streamerSongListQueueRemove: {
								songId: id.toString(),
								songTitle: removed?.songName || "",
							},
						};
						void TriggerActionHandler.instance.execute(message);
						break;
					}

					case "queue_update": {
						//Bulk change (reorder, ...): refetch the queue, then notify.
						void this.loadInfos().finally(() => {
							const message: TwitchatDataTypes.MessageStreamerSongListQueueUpdateData =
								{
									...baseEvent(),
									type: TwitchatDataTypes.TwitchatMessageType
										.STREAMERSONGLIST_QUEUE_UPDATE,
								};
							void TriggerActionHandler.instance.execute(message);
						});
						break;
					}

					//Other categories (play_history / song / saved-queue) carry no
					//payload and aren't surfaced as triggers yet.
				}
			});
			subscription.subscribe();
			centrifuge.connect();
		},

		disconnectSocket(): void {
			if (subscription) {
				subscription.unsubscribe();
				subscription = null;
			}
			if (centrifuge) {
				centrifuge.disconnect();
				centrifuge = null;
			}
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
