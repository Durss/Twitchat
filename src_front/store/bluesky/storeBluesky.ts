import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import type { BrowserOAuthClient, OAuthSession } from "@atproto/oauth-client-browser";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import StoreProxy from "../StoreProxy";
import type { IBlueskyActions, IBlueskyGetters, IBlueskyState } from "../StoreProxy";
import type {
	Agent,
	AppBskyEmbedExternal,
	AppBskyEmbedImages,
	AppBskyFeedDefs,
	RichText,
	$Typed,
} from "@atproto/api";
import { toast } from "@/utils/toast/toast";
import { clientAuthFetch, toLocalClientMetadata } from "@/utils/bluesky/BlueskyClientAuth";

let oauthClient: BrowserOAuthClient | null = null;
let session: OAuthSession | null = null;
let agent: Agent | null = null;
let notifPollInterval: ReturnType<typeof setInterval> | null = null;
let dmPollInterval: ReturnType<typeof setInterval> | null = null;
let autoliveCheckInterval: ReturnType<typeof setInterval> | null = null;
let currentlyLive = false;
let previewRefreshInterval: ReturnType<typeof setInterval> | null = null;
// Empty string = first poll (seed mode: record state without dispatching)
let lastNotifAt: string = "";
// convoId → sentAt of last dispatched message; absent = first poll
const lastSeenDmTimes = new Map<string, string>();
// True once the lib deleted the session: it's gone for good, and retrying won't
// bring it back
let sessionDeleted = false;
// True while disconnect() is revoking the session. The lib fires
// onSessionDeleted() from within signOut(), which is indistinguishable from a
// revocation asked for elsewhere, so this is what tells the hook not to alert
let signingOut = false;
// Window name/features of the OAuth popup. We open the popup ourselves and hand
// its name over to the lib so it reuses that window instead of opening its own,
// which is the only way to keep a reference on it (see startOAuthProcess())
const OAUTH_POPUP_NAME = "twitchat_bluesky_auth";
const OAUTH_POPUP_FEATURES = "width=600,height=700,menubar=no,toolbar=no";

function readLocalLink(): ILocalLink | null {
	try {
		const json = DataStore.get(DataStore.BLUESKY_LINK);
		const link = json && (JSON.parse(json) as ILocalLink);
		return link && typeof link.sub === "string" ? link : null;
	} catch (error) {
		console.warn("Bluesky link read failed", error);
		return null;
	}
}

function writeLocalLink(sub: string, dead?: boolean): void {
	const link: ILocalLink = { sub };
	if (dead) link.dead = true;
	//Never synced, no need to schedule a server save
	void DataStore.set(DataStore.BLUESKY_LINK, link, false);
}

export const storeBluesky = defineStore("bluesky", {
	state: (): IBlueskyState => ({
		connected: false,
		connectionError: null,
		autoLive: false,
		dmsAlerts: false,
		mentionsAlerts: false,
		sub: "",
		profile: null,
		handleResolver: "https://bsky.social",
	}),
	getters: {} satisfies StoreGetters<IBlueskyGetters, IBlueskyState>,
	actions: {
		async populateData() {
			const json = DataStore.get(DataStore.BLUESKY_CONFIGS);
			const data = json && (JSON.parse(json) as IStoreData);
			let legacySub = "";
			if (data) {
				this.handleResolver = data.handleResolver || this.handleResolver;
				this.autoLive = data.autoLive === true;
				this.dmsAlerts = data.dmsAlerts === true;
				this.mentionsAlerts = data.mentionsAlerts === true;
				legacySub = data.sub || "";
			}

			let link = readLocalLink();
			if (!link && legacySub) {
				//Links used to be synced. Move the synced one to this browser, after
				//which it's just a regular link: if its session doesn't live here the
				//restore below fails like any other lost session.
				writeLocalLink(legacySub);
				link = { sub: legacySub };
			}
			if (!link?.sub) {
				return;
			}
			this.sub = link.sub;

			if (link.dead) {
				//Session already known to be gone, retrying it would only fail again
				this.connectionError = StoreProxy.i18n.t("bluesky.session_lost");
				return;
			}

			await this.authenticate(true);
		},

		async initClient() {
			if (oauthClient) return oauthClient;

			//Data eviction wipes the lib's IndexedDB session store without any notice,
			//which only surfaces later as "session deleted by another process"
			void navigator.storage?.persisted?.().catch(() => {
				/*not supported, nothing to report*/
			});

			const { BrowserOAuthClient, OAuthClient, TokenRevokedError } =
				await import("@atproto/oauth-client-browser");
			const clientId = (document.location.origin +
				"/oauth/client-metadata.json") as `https://${string}/${string}`;
			try {
				oauthClient = new BrowserOAuthClient({
					//Metadata is loaded here rather than through
					//BrowserOAuthClient.load() so the lib gets a copy it accepts,
					//see toLocalClientMetadata()
					clientMetadata: toLocalClientMetadata(
						await OAuthClient.fetchMetadata({ clientId }),
					),
					//Authenticates Twitchat on the token/PAR/revocation endpoints,
					//which is what gets us 2 year sessions instead of 2 weeks
					fetch: clientAuthFetch(clientId),
					handleResolver: this.handleResolver,
					// Called anytime the lib deletes ocal session
					onSessionDeleted: (sub, cause) => {
						sessionDeleted = true;
						console.warn("Bluesky session deleted", cause);
						//A TokenRevokedError means signOut()/revoke() was called
						//explicitly, as opposed to a token that couldn't be refreshed
						const deliberate = signingOut || cause instanceof TokenRevokedError;
						// Session died while running, nothing else notices it.
						//
						// This hook is a repeatable notification, not a one-shot event: the
						// lib calls it once per pending token request that finds nothing in
						// its store (see SessionGetter), and mirrors it to every other tab
						// through a BroadcastChannel. startPolling() alone fires three
						// requests at once, so one lost session lands here several times.
						// Reacting to the connected->disconnected transition only is what
						// keeps it to a single alert. While already disconnected there's
						// nothing to tear down, and authenticate() owns the user feedback.
						if (this.connected && sub === this.sub) {
							//A revocation we asked for is the expected outcome of
							//disconnecting, not a failure. Still reached with connected=true
							//when the disconnect happened in another tab.
							if (!deliberate) toast(StoreProxy.i18n.t("bluesky.session_lost"));
							this.stopPolling();
							this.connected = false;
							this.profile = null;
							StoreProxy.auth.bluesky = null;
							session = null;
							agent = null;
							if (deliberate) {
								//Disconnected from another tab, which already cleared the link
								this.sub = "";
								this.connectionError = null;
							} else {
								this.connectionError = StoreProxy.i18n.t("bluesky.session_lost");
								writeLocalLink(sub, true);
							}
						}
					},
				});
			} catch (error) {
				console.log(error);
			}
			return oauthClient;
		},

		async startOAuthProcess(handle: string, readDMs: boolean = false) {
			this.connected = false;
			this.connectionError = null;
			sessionDeleted = false;

			//Open the popup right away, before any async work, so the browser doesn't
			//block it.
			const popup = window.open("about:blank", OAUTH_POPUP_NAME, OAUTH_POPUP_FEATURES);

			const client = await this.initClient();
			if (!client) {
				popup?.close();
				return false;
			}
			handle = handle.replace(/^@/, "");
			const scope = readDMs
				? "atproto transition:generic transition:chat.bsky"
				: "atproto transition:generic";

			//Popup blocked by the browser, fallback to a full page redirect
			if (!popup) {
				try {
					const url = await client.authorize(handle, { scope });
					window.open(url, "_self", "noopener");
					return true;
				} catch (error) {
					console.warn("Bluesky authorization failed", error);
					return false;
				}
			}

			// Detect popup close to abort auth
			const aborter = new AbortController();
			//The lib closes the popup itself once it got the result, so this watcher
			//also fires on the success path. If it wins the race it aborts a completed
			//sign in, and the lib then revokes the session it just created.
			let aborted = false;
			const closeWatcher = setInterval(() => {
				if (!popup.closed || aborted) return;
				aborted = true;
				aborter.abort();
			}, 500);

			try {
				await client.signInPopup(handle, {
					scope,
					signal: aborter.signal,
					popupName: OAUTH_POPUP_NAME,
					popupFeatures: OAUTH_POPUP_FEATURES,
					redirect_uri: `https://${document.location.host}/popupBlueskyAuthResult.html`,
				});
				//Finalize popup auth
				void this.authenticate();
				return true;
			} catch (error) {
				console.warn("Bluesky popup auth failed", error);
				return false;
			} finally {
				clearInterval(closeWatcher);
				//Nothing closes it if the flow failed before the popup got navigated
				//anywhere. It's a no-op if the lib already closed it.
				popup.close();
			}
		},

		async authenticate(restore: boolean = false): Promise<void> {
			if (this.connected) {
				return;
			}
			sessionDeleted = false;
			try {
				const client = await this.initClient();
				if (!client) {
					throw new Error(
						"OAuth client init failed (handleResolver=" + this.handleResolver + ")",
					);
				}
				if (restore) {
					// Attempt to restore sessions 3 times before giving up
					for (let i = 0; i < 3; i++) {
						try {
							session = await client.restore(this.sub);
							break;
						} catch (error) {
							if (i == 2 || sessionDeleted) throw error;
							await Utils.promisedTimeout(3000);
						}
					}
				} else {
					const result = await client.init();
					session = result?.session ?? null;
				}
				if (session) {
					this.sub = session.sub;
					writeLocalLink(session.sub);
					this.connected = true;
					this.connectionError = null;

					const { Agent } = await import("@atproto/api");
					agent = new Agent(session);
					const userProfile = await agent.getProfile({ actor: agent.did! });
					this.profile = userProfile.data;
					const user = StoreProxy.users.getUserFrom(
						"bluesky",
						userProfile.data.did,
						userProfile.data.did,
						userProfile.data.handle,
						userProfile.data.displayName,
					);
					user.avatarPath = userProfile.data.avatar;
					StoreProxy.auth.bluesky = { user };
					this.saveConfigs();
					this.startPolling();
				}
			} catch (error) {
				console.warn("Bluesky auth failed", error);
				if (restore) {
					this.connectionError = StoreProxy.i18n.t(
						sessionDeleted ? "bluesky.session_lost" : "bluesky.session_restore_failed",
					);
					//Session gone for good, next start won't retry it
					if (sessionDeleted) writeLocalLink(this.sub, true);
					toast(this.connectionError, { autoClose: false });
				}
			}
			document.location.hash = "";
		},

		resetConnection(): void {
			//Clears our own config but never revokes: any session still held by the
			//lib is orphaned here, staying alive server side with no way back to it
			sessionDeleted = false;
			this.stopPolling();
			this.connected = false;
			this.sub = "";
			writeLocalLink("");
			this.profile = null;
			this.connectionError = null;
			StoreProxy.auth.bluesky = null;
			session = null;
			agent = null;
			this.saveConfigs();
		},

		async disconnect() {
			sessionDeleted = false;
			this.stopPolling();
			//Set before signOut() so the onSessionDeleted hook knows this one is
			//expected and doesn't flag it as an error
			this.connected = false;
			this.sub = "";
			writeLocalLink("");
			this.connectionError = null;
			this.profile = null;
			StoreProxy.auth.bluesky = null;
			this.saveConfigs();
			signingOut = true;
			try {
				if (session) {
					await session?.signOut();
				}
			} finally {
				signingOut = false;
				session = null;
				agent = null;
			}
		},

		async applyAutoLive(foreRefresh?: boolean) {
			if (this.autoLive) {
				const infos = StoreProxy.stream.currentStreamInfo[StoreProxy.auth.twitch.user.id];
				if (infos?.live && infos.user) {
					void this.setLiveStatus(
						true,
						"https://twitch.tv/" + infos.user?.login,
						infos.title,
						infos.previewUrl,
						foreRefresh,
					);
					return;
				} else {
					const res = await TwitchUtils.getCurrentStreamInfo([
						StoreProxy.auth.twitch.user.id,
					]);
					if (res.length == 1) {
						void this.setLiveStatus(
							true,
							"https://twitch.tv/" + res[0]!.user_login,
							res[0]!.title,
							res[0]!.thumbnail_url
								.replace("{width}", "1920")
								.replace("{height}", "1080"),
							foreRefresh,
						);
						return;
					}
				}
			}
			void this.setLiveStatus(false, undefined, undefined, undefined, foreRefresh);
		},

		setAutoliveFeatureState(state: boolean) {
			this.autoLive = state;
			void this.applyAutoLive();
			this.saveConfigs();
		},

		async getLatestPosts(): Promise<false | AppBskyFeedDefs.FeedViewPost[]> {
			if (!agent) return false;
			const feed = await agent.getAuthorFeed({
				actor: agent.assertDid,
				includePins: false,
				filter: "posts_no_replies",
				limit: 100,
			});
			if (!feed.success) return false;
			return feed.data.feed.filter((v) => !v.reason && v.post.record && v.post.record.text);
		},

		async postMessage(message: string): Promise<{ success: boolean; error?: string }> {
			if (!agent) return { success: false, error: "Agent not initialized" };
			try {
				// make mentions, links and hashtags clickable
				const { RichText } = await import("@atproto/api");
				const richText = new RichText({ text: message });
				await richText.detectFacets(agent);

				const record: Parameters<Agent["post"]>[0] = {
					createdAt: new Date().toISOString(),
					text: richText.text,
					facets: richText.facets,
				};

				// Generate an embed for the message: a preview card for the last link,
				// or an image embed if the only link(s) point directly to images.
				// Embed generation must never prevent the message from being posted.
				const embed = await buildEmbed(richText);
				if (embed) record.embed = embed;

				const result = await agent.post(record);
				if (result.uri) {
					return { success: true };
				}
			} catch (error: any) {
				return { success: false, error: error.message ?? JSON.stringify(error) };
			}
			return { success: false, error: "Unknown error" };
		},

		async setLiveStatus(
			live: boolean,
			url?: string,
			title?: string,
			previewUrl?: string,
			foreRefresh?: boolean,
		): Promise<void> {
			if (!agent) return;
			if (live === currentlyLive && foreRefresh !== true) return;
			try {
				if (live) {
					const external: AppBskyEmbedExternal.External = {
						uri: url ?? "",
						title: title ?? "",
						description: title ?? "",
					};
					const thumb = previewUrl ? await uploadStreamPreview(previewUrl) : undefined;
					if (thumb) external.thumb = thumb;

					await agent.com.atproto.repo.putRecord({
						repo: agent.did!,
						collection: "app.bsky.actor.status",
						rkey: "self",
						record: {
							$type: "app.bsky.actor.status",
							status: "app.bsky.actor.status#live",
							embed: {
								$type: "app.bsky.embed.external",
								external,
							},
							durationMinutes: 30,
							createdAt: new Date().toISOString(),
						},
					});
					currentlyLive = true;

					// Refresh preview every 5m30 (twitch refreshes it every ~5min)
					if (!previewRefreshInterval) {
						previewRefreshInterval = setInterval(
							() => void this.applyAutoLive(true),
							5.5 * 60_000,
						);
					}
				} else {
					await agent.com.atproto.repo.deleteRecord({
						repo: agent.did!,
						collection: "app.bsky.actor.status",
						rkey: "self",
					});
					currentlyLive = false;
					if (previewRefreshInterval) clearInterval(previewRefreshInterval);
					previewRefreshInterval = null;
				}
			} catch (error) {
				//Was an unhandled rejection before. This runs on the longest interval,
				//so when notifications and DMs are both off it's the only request left
				//keeping the token refreshed: worth knowing when it breaks.
				console.warn("Bluesky autoLive update failed", error);
			}
		},

		startPolling(): void {
			if (!agent) return;
			//Every API call is an opportunity for the lib to refresh an expiring
			//token, so what's enabled here dictates how often that happens. With all
			//of them off, autoLive's 28min tick is the only thing keeping it warm.
			this.stopPolling();
			void this.pollDMs();
			void this.pollNotifications();
			void this.applyAutoLive();
			dmPollInterval = setInterval(() => void this.pollDMs(), 30_000);
			notifPollInterval = setInterval(() => void this.pollNotifications(), 30_000);
			autoliveCheckInterval = setInterval(() => this.applyAutoLive(true), 28 * 60_000);
		},

		stopPolling(): void {
			if (dmPollInterval) clearInterval(dmPollInterval);
			if (notifPollInterval) clearInterval(notifPollInterval);
			if (autoliveCheckInterval) clearInterval(autoliveCheckInterval);
			if (previewRefreshInterval) clearInterval(previewRefreshInterval);
			previewRefreshInterval = null;
			dmPollInterval = null;
			notifPollInterval = null;
			autoliveCheckInterval = null;
			lastNotifAt = "";
			lastSeenDmTimes.clear();
		},

		async pollNotifications(): Promise<void> {
			if (!agent || !this.mentionsAlerts) return;
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
						undefined,
						true,
						true,
						true,
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
			if (!agent || !this.dmsAlerts) return;
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

		saveConfigs() {
			const data: IStoreData = {
				autoLive: this.autoLive,
				dmsAlerts: this.dmsAlerts,
				mentionsAlerts: this.mentionsAlerts,
				handleResolver: this.handleResolver,
			};
			DataStore.set(DataStore.BLUESKY_CONFIGS, data);
		},
	} satisfies StoreActions<"bluesky", IBlueskyState, IBlueskyGetters, IBlueskyActions>,
});

/**
 * Builds the embed that best fits the links in the message:
 * - the last regular link gets a preview card (app.bsky.embed.external),
 * - if the message only contains direct image link(s), the last one is embedded
 *   as an actual image (app.bsky.embed.images).
 * Returns undefined when there's no link or the embed couldn't be built.
 */
async function buildEmbed(
	richText: RichText,
): Promise<$Typed<AppBskyEmbedExternal.Main> | $Typed<AppBskyEmbedImages.Main> | undefined> {
	if (!agent) return;

	const links: string[] = [];
	for (const segment of richText.segments()) {
		if (segment.isLink() && segment.link) links.push(segment.link.uri);
	}
	if (!links.length) return;

	// Search for a non image URL and attempt to build a card
	const lastRegularLink = links.findLast(
		(url) => !/\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(url),
	);
	if (lastRegularLink) return buildLinkCardEmbed(lastRegularLink);

	// No embed found; fallback to image embed attempt
	return buildImageEmbed(links[links.length - 1]!);
}

/**
 * Builds an "external" embed (link preview card) for the given link, or undefined
 * if its metadata couldn't be fetched.
 */
async function buildLinkCardEmbed(
	url: string,
): Promise<$Typed<AppBskyEmbedExternal.Main> | undefined> {
	if (!agent) return;
	try {
		// cardyb is Bluesky's public card-generation service (same one used by the
		// official web client). It's CORS-enabled.
		const res = await fetch(
			"https://cardyb.bsky.app/v1/extract?url=" + encodeURIComponent(url),
		);
		if (!res.ok) return;
		const card = (await res.json()) as {
			error?: string;
			title?: string;
			description?: string;
			image?: string;
		};
		if (card.error) return;

		const external: AppBskyEmbedExternal.External = {
			uri: url,
			title: card.title ?? "",
			description: card.description ?? "",
		};

		// Attach a thumbnail when one is available. Any failure here just drops the
		// thumbnail rather than the whole card.
		if (card.image) {
			const thumb = await uploadThumb(card.image);
			if (thumb) external.thumb = thumb;
		}

		return { $type: "app.bsky.embed.external", external };
	} catch (error) {
		console.warn("Bluesky link card generation failed", error);
		return;
	}
}

/**
 * Builds an "images" embed for a direct image link, downloading it through
 * cardyb's image proxy (arbitrary image hosts often block cross-origin fetches,
 * the proxy serves them with permissive CORS). Returns undefined on failure.
 */
async function buildImageEmbed(url: string): Promise<$Typed<AppBskyEmbedImages.Main> | undefined> {
	if (!agent) return;
	try {
		const res = await fetch("https://cardyb.bsky.app/v1/image?url=" + encodeURIComponent(url));
		if (!res.ok) return;
		const blob = await res.blob();
		if (!blob.type.startsWith("image/")) return;

		// Capture the aspect ratio (optional) so Bluesky lays the image out properly.
		let aspectRatio: AppBskyEmbedImages.Image["aspectRatio"];
		try {
			const bitmap = await createImageBitmap(blob);
			aspectRatio = { width: bitmap.width, height: bitmap.height };
			bitmap.close();
		} catch {
			// ignore
		}

		const image = await uploadImageBlob(blob);
		if (!image) return;

		return {
			$type: "app.bsky.embed.images",
			images: [{ alt: "", image, ...(aspectRatio ? { aspectRatio } : {}) }],
		};
	} catch (error) {
		console.warn("Bluesky image embed generation failed", error);
		return;
	}
}

/**
 * Convert stream preview URL to bluesky blob
 */
async function uploadStreamPreview(previewUrl: string) {
	if (!agent) return;
	try {
		const url = previewUrl + (previewUrl.includes("?") ? "&" : "?") + "t=" + Date.now();
		const res = await fetch(url);
		if (!res.ok) return;
		return await uploadImageBlob(await res.blob());
	} catch (error) {
		console.warn("Bluesky stream preview upload failed", error);
		return;
	}
}

/**
 * Downloads a thumbnail image and uploads it as a blob.
 */
async function uploadThumb(imageUrl: string) {
	if (!agent) return;
	try {
		const res = await fetch(imageUrl);
		if (!res.ok) return;
		return await uploadImageBlob(await res.blob());
	} catch (error) {
		console.warn("Bluesky thumbnail upload failed", error);
		return;
	}
}

/**
 * Uploads an image blob, downscaling it first if it exceeds Bluesky's ~1MB blob
 * limit.
 */
async function uploadImageBlob(blob: Blob) {
	if (!agent) return;
	// Bluesky rejects blobs larger than 1MB.
	const MAX_BYTES = 976 * 1024;
	if (blob.size > MAX_BYTES) {
		const resized = await downscaleImage(blob, MAX_BYTES);
		if (!resized) return;
		blob = resized;
	}

	const bytes = new Uint8Array(await blob.arrayBuffer());
	const uploaded = await agent.uploadBlob(bytes, {
		encoding: blob.type || "image/jpeg",
	});
	return uploaded.data.blob;
}

/**
 * Re-encodes an image as a JPEG that fits under maxBytes by capping its
 * dimensions and progressively lowering quality. Returns undefined if it can't
 * be brought under the limit.
 */
async function downscaleImage(blob: Blob, maxBytes: number): Promise<Blob | undefined> {
	const bitmap = await createImageBitmap(blob);
	const canvas = document.createElement("canvas");
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		bitmap.close();
		return;
	}

	const MAX_SIZE = 1000;
	const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height));
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();

	for (let quality = 0.9; quality >= 0.4; quality -= 0.1) {
		const out = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/jpeg", quality),
		);
		if (out && out.size <= maxBytes) return out;
	}
	return;
}

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeBluesky, import.meta.hot));
}

interface IStoreData {
	/**
	 * @deprecated now stored in DataStore.BLUESKY_LINK
	 */
	sub?: string;
	autoLive: boolean;
	dmsAlerts: boolean;
	mentionsAlerts: boolean;
	handleResolver: string;
}

type ILocalLink = {
	sub: string;
	/** Set once the session is known to be gone, so next start doesn't retry it */
	dead?: boolean;
};
