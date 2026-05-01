import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import type { BrowserOAuthClient, OAuthSession } from "@atproto/oauth-client-browser";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import StoreProxy from "../StoreProxy";
import type { IBlueskyActions, IBlueskyGetters, IBlueskyState } from "../StoreProxy";
import type { Agent } from "@atproto/api";

let oauthClient: BrowserOAuthClient | null = null;
let session: OAuthSession | null = null;
let agent: Agent | null = null;
let notifPollInterval: ReturnType<typeof setInterval> | null = null;
let dmPollInterval: ReturnType<typeof setInterval> | null = null;
let autoliveCheckInterval: ReturnType<typeof setInterval> | null = null;
// Empty string = first poll (seed mode: record state without dispatching)
let lastNotifAt: string = "";
// convoId → sentAt of last dispatched message; absent = first poll
const lastSeenDmTimes = new Map<string, string>();

export const storeBluesky = defineStore("bluesky", {
	state: (): IBlueskyState => ({
		connected: false,
		autoLive: false,
		sub: "",
		profile: null,
		handleResolver: "https://bsky.social",
	}),
	getters: {
		session: function () {
			return session;
		},
	} satisfies StoreGetters<IBlueskyGetters, IBlueskyState>,
	actions: {
		async populateData() {
			const json = DataStore.get(DataStore.BLUESKY_CONFIGS);
			const data = json && (JSON.parse(json) as IStoreData);
			if (data) {
				this.handleResolver = data.handleResolver || this.handleResolver;
				this.sub = data.sub;
				this.autoLive = data.autoLive;
				if (data.connected && data.sub) {
					await this.authenticate(true);
				}
			}
		},

		async initClient() {
			if (oauthClient) return oauthClient;
			const { BrowserOAuthClient } = await import("@atproto/oauth-client-browser");
			oauthClient = await BrowserOAuthClient.load({
				clientId: document.location.origin + "/oauth/client-metadata.json",
				handleResolver: this.handleResolver,
			});
			return oauthClient;
		},

		async startOAuthProcess(handle: string, readDMs: boolean = false) {
			this.connected = false;
			const client = await this.initClient();
			handle = handle.replace(/^@/, "");
			const scope = readDMs
				? "atproto transition:generic transition:chat.bsky"
				: "atproto transition:generic";
			try {
				const session = await client.signInPopup(handle, {
					scope,
					redirect_uri: "https://dev.twitchat.fr/popupBlueskyAuthResult",
				});
				if (session) {
					//Finalize popup auth
					void this.authenticate();
				} else {
					//Fallback to redirect
					const url = await client.authorize(handle);
					window.open(url, "_self", "noopener");
				}
			} catch (_error) {
				return false;
			}
			return true;
		},

		async authenticate(restore: boolean = false): Promise<void> {
			if (this.connected) return;
			try {
				const client = await this.initClient();
				if (restore) {
					session = await client.restore(this.sub);
				} else {
					const result = await client.init();
					session = result?.session ?? null;
				}
				if (session) {
					this.sub = session.sub;
					this.connected = true;

					const { Agent } = await import("@atproto/api");
					agent = new Agent(session);
					const userProfile = await agent.getProfile({ actor: agent.did! });
					this.profile = userProfile.data;
					this.saveState();
					this.startPolling();
				}
			} catch (error) {
				console.warn("Bluesky auth failed", error);
			}
			document.location.hash = "";
		},

		async disconnect() {
			this.stopPolling();
			this.connected = false;
			this.profile = null;
			this.saveState();
			if (session) {
				await session?.signOut();
			}
		},

		applyAutoLive() {
			if (this.autoLive) {
				const infos = StoreProxy.stream.currentStreamInfo[StoreProxy.auth.twitch.user.id];
				if (infos?.live) {
					this.setLiveStatus(true);
				} else {
					this.setLiveStatus(false);
				}
			}
		},

		setAutoliveFeatureState(state: boolean) {
			this.autoLive = state;
			this.applyAutoLive();
			this.saveState();
		},

		async setLiveStatus(live: boolean): Promise<void> {
			if (!agent) return;
			if (live) {
				await agent.com.atproto.repo.putRecord({
					repo: agent.did!,
					collection: "app.bsky.actor.status",
					rkey: "self",
					record: {
						$type: "app.bsky.actor.status",
						status: "app.bsky.actor.status#live",
						embed: {
							$type: "app.bsky.embed.external",
							external: {
								uri: "https://twitch.tv/twitch",
								title: "My stream",
								description: "",
							},
						},
						// Only keep it for 12min so if twitchat is closed before it has a chance
						// to set this back to off, it automatically does after 15min max.
						// applyAutoLive() is called every 10min to refresh this
						durationMinutes: 12,
						createdAt: new Date().toISOString(),
					},
				});
			} else {
				await agent.com.atproto.repo.deleteRecord({
					repo: agent.did!,
					collection: "app.bsky.actor.status",
					rkey: "self",
				});
			}
		},

		startPolling(): void {
			if (!agent) return;
			this.stopPolling();
			void this.pollDMs();
			void this.pollNotifications();
			void this.applyAutoLive();
			dmPollInterval = setInterval(() => void this.pollDMs(), 30_000);
			notifPollInterval = setInterval(() => void this.pollNotifications(), 30_000);
			autoliveCheckInterval = setInterval(() => this.applyAutoLive(), 10 * 60000);
		},

		stopPolling(): void {
			if (dmPollInterval) clearInterval(dmPollInterval);
			if (notifPollInterval) clearInterval(notifPollInterval);
			if (autoliveCheckInterval) clearInterval(autoliveCheckInterval);
			dmPollInterval = null;
			notifPollInterval = null;
			autoliveCheckInterval = null;
			lastNotifAt = "";
			lastSeenDmTimes.clear();
		},

		async pollNotifications(): Promise<void> {
			if (!agent) return;
			try {
				const { data } = await agent.listNotifications({ limit: 50 });
				if (!data.notifications.length) return;

				if (!lastNotifAt) {
					// First poll: seed the cursor without dispatching historical notifications
					lastNotifAt = data.notifications[0]!.indexedAt;
					await agent.updateSeenNotifications();
					return;
				}

				const newOnes = data.notifications.filter((n) => n.indexedAt > lastNotifAt);
				if (!newOnes.length) return;

				lastNotifAt = data.notifications[0]!.indexedAt;

				// Process oldest-first so the chat timeline is coherent
				for (const notif of newOnes.reverse()) {
					const user = StoreProxy.users.getUserFrom(
						"bluesky",
						agent.did!,
						notif.author.did,
						notif.author.handle,
						notif.author.displayName ?? notif.author.handle,
					);
					user.avatarPath = notif.author.avatar;

					const chanInfo = user.channelInfo[agent.did!];
					if (notif.reason === "follow" && chanInfo) {
						if (chanInfo.is_following) {
							// Avoid follow spam
							return;
						}
						chanInfo.is_following = true;
						chanInfo.following_date_ms = Date.now();
						const message: TwitchatDataTypes.MessageFollowingData = {
							channel_id: agent.did!,
							platform: "bluesky",
							id: Utils.getUUID(),
							date: new Date(notif.indexedAt).getTime(),
							followed_at: new Date(notif.indexedAt).getTime(),
							type: TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
							user,
						};
						void StoreProxy.chat.addMessage(message);
					} else if (notif.reason === "mention" || notif.reason === "reply") {
						const record = notif.record as { text?: string };
						const text = record.text ?? "";
						const chunks = TwitchUtils.parseMessageToChunks(
							text,
							undefined,
							true,
							"bluesky",
						);
						const message: TwitchatDataTypes.MessageChatData = {
							channel_id: agent.did!,
							platform: "bluesky",
							id: Utils.getUUID(),
							date: new Date(notif.indexedAt).getTime(),
							type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
							user,
							message: text,
							message_chunks: chunks,
							message_html: TwitchUtils.messageChunksToHTML(chunks),
							message_size: text.length,
							answers: [],
							is_short: text.length < 100,
							hasMention: true,
						};
						void StoreProxy.chat.addMessage(message);
					}
				}

				await agent.updateSeenNotifications();
			} catch (e) {
				console.warn("Bluesky notification poll failed", e);
			}
		},

		async pollDMs(): Promise<void> {
			if (!agent) return;
			try {
				const { data } = await agent.chat.bsky.convo.listConvos(
					{ limit: 20 },
					{
						headers: {
							"Atproto-Proxy": "did:web:api.bsky.chat#bsky_chat",
						},
					},
				);

				for (const convo of data.convos) {
					const lastSeen = lastSeenDmTimes.get(convo.id);

					if (!lastSeen) {
						// First time seeing this convo: seed from its latest message
						const latestMsg = convo.lastMessage as
							| { $type?: string; sentAt?: string }
							| undefined;
						lastSeenDmTimes.set(
							convo.id,
							latestMsg?.$type === "chat.bsky.convo.defs#messageView" &&
								latestMsg.sentAt
								? latestMsg.sentAt
								: new Date().toISOString(),
						);
						continue;
					}

					if (convo.unreadCount === 0) continue;

					const { data: msgsData } = await agent.chat.bsky.convo.getMessages(
						{
							convoId: convo.id,
							limit: Math.min(convo.unreadCount + 1, 20),
						},
						{
							headers: {
								"Atproto-Proxy": "did:web:api.bsky.chat#bsky_chat",
							},
						},
					);

					type MsgView = {
						$type: string;
						id: string;
						text: string;
						sender: { did: string };
						sentAt: string;
					};
					const msgViews = (msgsData.messages as MsgView[]).filter(
						(m) => m.$type === "chat.bsky.convo.defs#messageView",
					);

					if (!msgViews.length) continue;

					// Update cursor to newest message
					lastSeenDmTimes.set(convo.id, msgViews[0]!.sentAt);

					const newMsgs = msgViews.filter((m) => m.sentAt > lastSeen);
					if (!newMsgs.length) continue;

					const me = StoreProxy.users.getUserFrom(
						"bluesky",
						agent.did!,
						agent.did!,
						this.profile?.handle,
						this.profile?.displayName ?? this.profile?.handle,
					);
					me.avatarPath = this.profile?.avatar;

					// Process oldest-first
					for (const msg of newMsgs.reverse()) {
						if (msg.sender.did === agent.did!) continue;

						const member = convo.members.find((m) => m.did === msg.sender.did);
						const sender = StoreProxy.users.getUserFrom(
							"bluesky",
							agent.did!,
							msg.sender.did,
							member?.handle,
							member?.displayName ?? member?.handle,
						);
						sender.avatarPath = member?.avatar;

						const chunks = TwitchUtils.parseMessageToChunks(
							msg.text,
							undefined,
							true,
							"bluesky",
						);
						const whisper: TwitchatDataTypes.MessageWhisperData = {
							channel_id: agent.did!,
							platform: "bluesky",
							id: Utils.getUUID(),
							date: new Date(msg.sentAt).getTime(),
							type: TwitchatDataTypes.TwitchatMessageType.WHISPER,
							user: sender,
							to: me,
							message: msg.text,
							message_chunks: chunks,
							message_html: TwitchUtils.messageChunksToHTML(chunks),
							message_size: msg.text.length,
						};
						void StoreProxy.chat.addMessage(whisper);
					}
				}
			} catch (e) {
				console.warn("Bluesky DM poll failed", e);
			}
		},

		saveState() {
			const data: IStoreData = {
				sub: this.sub,
				autoLive: this.autoLive,
				connected: this.connected,
				handleResolver: this.handleResolver,
			};
			DataStore.set(DataStore.BLUESKY_CONFIGS, data);
		},
	} satisfies StoreActions<"bluesky", IBlueskyState, IBlueskyGetters, IBlueskyActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeBluesky, import.meta.hot));
}

interface IStoreData {
	sub: string;
	autoLive: boolean;
	connected: boolean;
	handleResolver: string;
}
