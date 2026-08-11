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

let oauthClient: BrowserOAuthClient | null = null;
let session: OAuthSession | null = null;
let agent: Agent | null = null;
let notifPollInterval: ReturnType<typeof setInterval> | null = null;
let dmPollInterval: ReturnType<typeof setInterval> | null = null;
let autoliveCheckInterval: ReturnType<typeof setInterval> | null = null;
let currentlyLive = false;
// Empty string = first poll (seed mode: record state without dispatching)
let lastNotifAt: string = "";
// convoId → sentAt of last dispatched message; absent = first poll
const lastSeenDmTimes = new Map<string, string>();
// Date of the last token refresh that actually got stored
let lastRefreshDate = 0;
// Date the current session was first authenticated, to measure its total age
// against the server side session lifetime cap
let sessionStartDate = 0;
// Reason given by the lib when it deleted the session, empty otherwise
let lastDeleteCause = "";
// True while disconnect() is revoking the session. The lib fires
// onSessionDeleted() from within signOut(), and its cause is worded exactly like
// an unwanted revocation, so this is what tells the hook not to alert the user
let signingOut = false;
// Max number of diagnostic entries kept. Entries carry their own age/expiry
// context (see describeSession()) so a shallow history is still conclusive.
// Must stay <= the "maxItems" declared on blueskyConfigs.logs in DataSchema.ts
const MAX_LOGS = 100;
// Identifies the current tab so interleaved entries reveal concurrent Twitchat
// instances, the most likely cause of refresh token races
const TAB_ID = Math.random().toString(36).slice(2, 7);
// localStorage key the lib itself uses to remember the currently signed in
// account. Comparing it with our own "sub" exposes desyncs between Twitchat's
// config and the lib's IndexedDB session store
const LIB_SUB_KEY = "@@atproto/oauth-client-browser(sub)";
// Window name/features of the OAuth popup. We open the popup ourselves and hand
// its name over to the lib so it reuses that window instead of opening its own,
// which is the only way to keep a reference on it (see startOAuthProcess())
const OAUTH_POPUP_NAME = "twitchat_bluesky_auth";
const OAUTH_POPUP_FEATURES = "width=600,height=700,menubar=no,toolbar=no";

type IBlueskyLogEntry = IBlueskyState["logs"][0];

/**
 * Builds the error message if auth failed
 */
function describeSessionError(value: unknown): string {
	const chunks: string[] = [];
	let current: unknown = value;
	for (let i = 0; i < 4 && current instanceof Error; i++) {
		const error = current as Error & {
			error?: unknown;
			errorDescription?: unknown;
			cause?: unknown;
		};
		chunks.push(error.name + ": " + error.message);
		if (typeof error.error === "string") chunks.push(error.error);
		if (typeof error.errorDescription === "string") chunks.push(error.errorDescription);
		current = error.cause;
	}
	if (chunks.length === 0) chunks.push(typeof value === "string" ? value : "unknown error");
	if (lastRefreshDate > 0) {
		chunks.push(
			"last refresh " + Math.round((Date.now() - lastRefreshDate) / 60000) + "min ago",
		);
	}
	return chunks.join(" | ");
}

/**
 * Formats a duration as a compact human readable value for the logs
 */
function describeDuration(ms: number): string {
	if (ms < 60_000) return Math.round(ms / 1000) + "s";
	if (ms < 3_600_000) return Math.round(ms / 60_000) + "min";
	if (ms < 86_400_000) return (ms / 3_600_000).toFixed(1) + "h";
	return (ms / 86_400_000).toFixed(1) + "d";
}

/**
 * Summarizes a session's token set for the logs.
 *
 * Every value here answers a specific failure mode:
 * - "refresh" missing means the session is doomed at "exp" whatever happens
 * - "exp" under 60min is the server clamping the access token to the end of the
 *   session lifetime, ie. we're in the last hour of the session cap
 * - "age" vs the session cap and "sinceRefresh" vs the refresh idle window tell
 *   which of the two server side limits was hit
 */
function describeSession(value: unknown): string {
	const tokenSet = (value as { tokenSet?: Record<string, unknown> } | null)?.tokenSet;
	const chunks: string[] = [];
	if (tokenSet) {
		chunks.push("refresh=" + (tokenSet.refresh_token ? "yes" : "NONE"));
		if (typeof tokenSet.expires_at === "string") {
			const remaining = new Date(tokenSet.expires_at).getTime() - Date.now();
			chunks.push("exp=in " + describeDuration(remaining));
		} else {
			chunks.push("exp=none");
		}
		if (typeof tokenSet.scope === "string") chunks.push("scope=" + tokenSet.scope);
	}
	if (sessionStartDate > 0) chunks.push("age=" + describeDuration(Date.now() - sessionStartDate));
	if (lastRefreshDate > 0) {
		chunks.push("sinceRefresh=" + describeDuration(Date.now() - lastRefreshDate));
	}
	return chunks.join(" ");
}

/**
 * Describes the current browsing context. A backgrounded tab is throttled,
 * which is what makes the OAuth popup's 500ms acknowledgment window (and the
 * revocation that follows when it's missed) reachable.
 */
function describeContext(): string {
	return (
		"visibility=" +
		document.visibilityState +
		" focus=" +
		document.hasFocus() +
		" libSub=" +
		(localStorage.getItem(LIB_SUB_KEY) ? "set" : "none")
	);
}

export const storeBluesky = defineStore("bluesky", {
	state: (): IBlueskyState => ({
		connected: false,
		connectionError: null,
		logs: [],
		autoLive: false,
		dmsAlerts: false,
		mentionsAlerts: false,
		sub: "",
		profile: null,
		handleResolver: "https://bsky.social",
	}),
	getters: {} satisfies StoreGetters<IBlueskyGetters, IBlueskyState>,
	actions: {
		log(step: string, info?: string): void {
			const entry: IBlueskyLogEntry = { date: Date.now(), step, tab: TAB_ID };
			if (info) entry.info = info.length > 500 ? info.slice(0, 500) : info;

			//Re-read what's stored before appending. Twitchat can run in several tabs
			//at once (main window, OBS dock...) and they all share the same
			//localStorage key, so building on the in-memory array only would make the
			//last tab to write erase the others' entries. That interleaving is
			//precisely what we're trying to observe, hence the merge.
			let stored: IBlueskyLogEntry[] = [];
			try {
				const json = DataStore.get(DataStore.BLUESKY_CONFIGS);
				const data = json && (JSON.parse(json) as IStoreData);
				if (data && Array.isArray(data.logs)) stored = data.logs;
			} catch (error) {
				//Corrupted storage shouldn't take the logger (nor its caller) down
				console.warn("Bluesky log read failed", error);
			}

			this.logs = [...stored, entry].slice(-MAX_LOGS);
			console.log("[bluesky] " + step, info ?? "");
			this.saveConfigs();
		},

		async populateData() {
			const json = DataStore.get(DataStore.BLUESKY_CONFIGS);
			const data = json && (JSON.parse(json) as IStoreData);
			if (!data) {
				this.log("populateData", "no stored config " + describeContext());
				return;
			}
			this.handleResolver = data.handleResolver || this.handleResolver;
			this.sub = data.sub;
			this.autoLive = data.autoLive === true;
			this.dmsAlerts = data.dmsAlerts === true;
			this.mentionsAlerts = data.mentionsAlerts === true;
			if (Array.isArray(data.logs)) this.logs = data.logs.slice(-MAX_LOGS);

			//Logged on every start, connected or not: a "sub" that disagrees with the
			//lib's own record means our config and the lib's IndexedDB session store
			//went out of sync, which silently orphans a live session
			this.log(
				"populateData",
				"connected=" +
					(data.connected === true) +
					" sub=" +
					(data.sub || "none") +
					" autoLive=" +
					this.autoLive +
					" mentions=" +
					this.mentionsAlerts +
					" dms=" +
					this.dmsAlerts +
					" " +
					describeContext(),
			);

			if (data.connected && data.sub) {
				await this.authenticate(true);
			} else if (localStorage.getItem(LIB_SUB_KEY)) {
				//Not restoring although the lib still holds a session for this origin
				this.log(
					"populateData:orphanSession",
					"lib holds a session we won't restore, it stays alive server side",
				);
			}
		},

		async initClient() {
			if (oauthClient) return oauthClient;
			this.log("initClient:start", "resolver=" + this.handleResolver);

			//Data eviction wipes the lib's IndexedDB session store without any notice,
			//which only surfaces later as "session deleted by another process"
			void navigator.storage
				?.persisted?.()
				.then((persisted) => this.log("initClient:storage", "persisted=" + persisted))
				.catch(() => {
					/*not supported, nothing to report*/
				});

			const { BrowserOAuthClient } = await import("@atproto/oauth-client-browser");
			try {
				oauthClient = await BrowserOAuthClient.load({
					clientId: document.location.origin + "/oauth/client-metadata.json",
					handleResolver: this.handleResolver,
					// Called anytime the lib deletes ocal session
					onSessionDeleted: (sub, cause) => {
						lastDeleteCause = describeSessionError(cause);
						console.warn("Bluesky session deleted", cause);
						//"was successfully revoked" means signOut()/revoke() was called
						//explicitly, as opposed to a token that couldn't be refreshed.
						//Tagging it makes the two impossible to confuse afterwards.
						const deliberate =
							signingOut || lastDeleteCause.includes("successfully revoked");
						this.log(
							"session:deleted",
							"sub=" +
								sub +
								" deliberate=" +
								deliberate +
								" wasConnected=" +
								this.connected +
								" sameSub=" +
								(sub === this.sub) +
								" age=" +
								(sessionStartDate > 0
									? describeDuration(Date.now() - sessionStartDate)
									: "unknown") +
								" sinceRefresh=" +
								(lastRefreshDate > 0
									? describeDuration(Date.now() - lastRefreshDate)
									: "never") +
								" " +
								describeContext() +
								" cause=" +
								lastDeleteCause,
						);
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
							if (!deliberate) toast("Bluesky session lost: " + cause);
							this.stopPolling();
							this.connected = false;
							this.connectionError = lastDeleteCause;
							this.profile = null;
							StoreProxy.auth.bluesky = null;
							session = null;
							agent = null;
						}
					},
					// Called anytime session is created/refreshed
					onSessionUpdated: (sub, updated) => {
						//The delay between two of these bounds the refresh idle window,
						//and the token summary shows how close the session cap is
						this.log(
							"session:updated",
							"sub=" + sub + " " + describeSession(updated) + " " + describeContext(),
						);
						lastRefreshDate = Date.now();
					},
				});
				this.log("initClient:done");
			} catch (error) {
				console.log(error);
				this.log("initClient:failed", describeSessionError(error));
			}
			return oauthClient;
		},

		async startOAuthProcess(handle: string, readDMs: boolean = false) {
			this.connected = false;
			this.connectionError = null;
			lastDeleteCause = "";
			this.log(
				"oauth:start",
				"handle=" + handle + " readDMs=" + readDMs + " " + describeContext(),
			);

			//Open the popup right away, before any async work, so the browser doesn't
			//block it.
			const popup = window.open("about:blank", OAUTH_POPUP_NAME, OAUTH_POPUP_FEATURES);

			const client = await this.initClient();
			if (!client) {
				popup?.close();
				this.log("oauth:abort", "oauth client init failed");
				return false;
			}
			handle = handle.replace(/^@/, "");
			const scope = readDMs
				? "atproto transition:generic transition:chat.bsky"
				: "atproto transition:generic";

			//Popup blocked by the browser, fallback to a full page redirect
			if (!popup) {
				this.log("oauth:popupBlocked", "falling back to full page redirect");
				try {
					const url = await client.authorize(handle, { scope });
					window.open(url, "_self", "noopener");
					return true;
				} catch (error) {
					console.warn("Bluesky authorization failed", error);
					this.log("oauth:redirectFailed", describeSessionError(error));
					return false;
				}
			}

			// Detect popup close to abort auth
			const aborter = new AbortController();
			//The lib closes the popup itself once it got the result, so this watcher
			//also fires on the success path. If it wins the race it aborts a completed
			//sign in, and the lib then revokes the session it just created.
			let abortLogged = false;
			const closeWatcher = setInterval(() => {
				if (!popup.closed || abortLogged) return;
				abortLogged = true;
				this.log("oauth:popupClosed", "aborting sign in, " + describeContext());
				aborter.abort();
			}, 500);

			try {
				const start = Date.now();
				await client.signInPopup(handle, {
					scope,
					signal: aborter.signal,
					popupName: OAUTH_POPUP_NAME,
					popupFeatures: OAUTH_POPUP_FEATURES,
					redirect_uri: `https://${document.location.host}/popupBlueskyAuthResult.html`,
				});
				this.log(
					"oauth:popupSuccess",
					"took=" + describeDuration(Date.now() - start) + " " + describeContext(),
				);
				//Finalize popup auth
				void this.authenticate();
				return true;
			} catch (error) {
				console.warn("Bluesky popup auth failed", error);
				//Failing here right after the user approved means the session was
				//created server side then thrown away (aborted signal, or the popup's
				//500ms acknowledgment window elapsed)
				this.log(
					"oauth:popupFailed",
					"aborted=" +
						aborter.signal.aborted +
						" " +
						describeContext() +
						" error=" +
						describeSessionError(error),
				);
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
				this.log("auth:skipped", "already connected");
				return;
			}
			lastDeleteCause = "";
			this.log(
				"auth:start",
				"mode=" +
					(restore ? "restore" : "callback") +
					" sub=" +
					(this.sub || "none") +
					" " +
					describeContext(),
			);
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
							this.log("auth:restored", "attempt=" + (i + 1));
							break;
						} catch (error) {
							//Logging each attempt separates a transient network failure
							//(recovers on retry) from a session the server rejected
							//(lastDeleteCause set, gives up immediately)
							this.log(
								"auth:restoreFailed",
								"attempt=" +
									(i + 1) +
									" giveUp=" +
									(i == 2 || !!lastDeleteCause) +
									" deleteCause=" +
									(lastDeleteCause || "none") +
									" error=" +
									describeSessionError(error),
							);
							if (i == 2 || lastDeleteCause) throw error;
							await Utils.promisedTimeout(3000);
						}
					}
				} else {
					const result = await client.init();
					session = result?.session ?? null;
					//init() resolves with nothing when there were no callback params in
					//the URL and no session to restore: a silent no-op, not an error
					if (!session) this.log("auth:noSession", "client.init() returned no session");
				}
				if (session) {
					this.sub = session.sub;
					this.connected = true;
					this.connectionError = null;
					if (sessionStartDate === 0) sessionStartDate = Date.now();

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
					this.log(
						"auth:success",
						"did=" +
							userProfile.data.did +
							" handle=" +
							userProfile.data.handle +
							" mode=" +
							(restore ? "restore" : "callback"),
					);
					this.saveConfigs();
					this.startPolling();
				}
			} catch (error) {
				console.warn("Bluesky auth failed", error);
				this.log(
					"auth:failed",
					"mode=" +
						(restore ? "restore" : "callback") +
						" deleteCause=" +
						(lastDeleteCause || "none") +
						" error=" +
						describeSessionError(error),
				);
				if (restore) {
					this.connectionError = lastDeleteCause || describeSessionError(error);
					toast("Bluesky connection failed: " + this.connectionError, {
						autoClose: false,
					});
				}
			}
			document.location.hash = "";
		},

		resetConnection(): void {
			//Clears our own config but never revokes: any session still held by the
			//lib is orphaned here, staying alive server side with no way back to it
			this.log(
				"resetConnection",
				"sub=" +
					(this.sub || "none") +
					" previousError=" +
					(this.connectionError || "none") +
					" " +
					describeContext(),
			);
			lastDeleteCause = "";
			sessionStartDate = 0;
			this.stopPolling();
			this.connected = false;
			this.sub = "";
			this.profile = null;
			StoreProxy.auth.bluesky = null;
			session = null;
			agent = null;
			this.saveConfigs();
		},

		async disconnect(manual?: boolean) {
			//User initiated. The session:deleted entry that follows carries a
			//"successfully revoked" cause, exactly like an unwanted revocation would,
			//so this entry is what tells the two apart after the fact.
			this.log(
				"disconnect",
				"manual=" +
					manual +
					" sub=" +
					(this.sub || "none") +
					" age=" +
					(sessionStartDate > 0
						? describeDuration(Date.now() - sessionStartDate)
						: "unknown"),
			);
			lastDeleteCause = "";
			sessionStartDate = 0;
			this.stopPolling();
			//Set before signOut() so the onSessionDeleted hook knows this one is
			//expected and doesn't flag it as an error
			this.connected = false;
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
							foreRefresh,
						);
						return;
					}
				}
			}
			void this.setLiveStatus(false, undefined, undefined, foreRefresh);
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
			foreRefresh?: boolean,
		): Promise<void> {
			if (!agent) return;
			if (live === currentlyLive && foreRefresh !== true) return;
			try {
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
									uri: url,
									title,
									description: title,
								},
							},
							// Only keep it for 12min so if twitchat is closed before it has a chance
							// to set this back to off, it automatically does after 15min max.
							// applyAutoLive() is called every 10min to refresh this
							durationMinutes: 30,
							createdAt: new Date().toISOString(),
						},
					});
					currentlyLive = true;
				} else {
					await agent.com.atproto.repo.deleteRecord({
						repo: agent.did!,
						collection: "app.bsky.actor.status",
						rkey: "self",
					});
					currentlyLive = false;
				}
			} catch (error) {
				//Was an unhandled rejection before. This runs on the longest interval,
				//so when notifications and DMs are both off it's the only request left
				//keeping the token refreshed: worth knowing when it breaks.
				this.log(
					"autoLive:failed",
					"live=" + live + " error=" + describeSessionError(error),
				);
			}
		},

		startPolling(): void {
			if (!agent) return;
			//Every API call is an opportunity for the lib to refresh an expiring
			//token, so what's enabled here dictates how often that happens. With all
			//of them off, autoLive's 28min tick is the only thing keeping it warm.
			this.log(
				"polling:start",
				"mentions=" +
					this.mentionsAlerts +
					" dms=" +
					this.dmsAlerts +
					" autoLive=" +
					this.autoLive,
			);
			this.stopPolling();
			void this.pollDMs();
			void this.pollNotifications();
			void this.applyAutoLive();
			dmPollInterval = setInterval(() => void this.pollDMs(), 30_000);
			notifPollInterval = setInterval(() => void this.pollNotifications(), 30_000);
			autoliveCheckInterval = setInterval(() => this.applyAutoLive(true), 28 * 60_000);
		},

		stopPolling(): void {
			if (dmPollInterval || notifPollInterval || autoliveCheckInterval) {
				this.log("polling:stop");
			}
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
				//A failing poll is often the first visible sign the token went bad,
				//minutes before the lib gives up on the session altogether
				this.log("poll:notifFailed", describeSessionError(e));
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
				this.log("poll:dmFailed", describeSessionError(e));
			}
		},

		saveConfigs() {
			const data: IStoreData = {
				sub: this.sub,
				autoLive: this.autoLive,
				dmsAlerts: this.dmsAlerts,
				mentionsAlerts: this.mentionsAlerts,
				connected: this.connected,
				handleResolver: this.handleResolver,
				logs: this.logs,
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
	sub: string;
	autoLive: boolean;
	dmsAlerts: boolean;
	mentionsAlerts: boolean;
	connected: boolean;
	handleResolver: string;
	logs: IBlueskyLogEntry[];
}
