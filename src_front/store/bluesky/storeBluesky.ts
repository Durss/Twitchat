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
	getters: {} satisfies StoreGetters<IBlueskyGetters, IBlueskyState>,
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
			try {
				oauthClient = await BrowserOAuthClient.load({
					clientId: document.location.origin + "/oauth/client-metadata.json",
					handleResolver: this.handleResolver,
				});
			} catch (error) {
				console.log(error);
			}
			return oauthClient;
		},

		async startOAuthProcess(handle: string, readDMs: boolean = false) {
			this.connected = false;
			const client = await this.initClient();
			if (!client) return false;
			handle = handle.replace(/^@/, "");
			const scope = readDMs
				? "atproto transition:generic transition:chat.bsky"
				: "atproto transition:generic";
			try {
				const session = await client.signInPopup(handle, {
					scope,
					redirect_uri: `https://${document.location.host}/popupBlueskyAuthResult.html`,
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
				if (!client) return;
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
			}
			document.location.hash = "";
		},

		async disconnect() {
			this.stopPolling();
			this.connected = false;
			this.profile = null;
			StoreProxy.auth.bluesky = null;
			this.saveConfigs();
			if (session) {
				await session?.signOut();
			}
		},

		applyAutoLive() {
			if (this.autoLive) {
				const infos = StoreProxy.stream.currentStreamInfo[StoreProxy.auth.twitch.user.id];
				if (infos?.live) {
					void this.setLiveStatus(true);
				} else {
					void this.setLiveStatus(false);
				}
			}
		},

		setAutoliveFeatureState(state: boolean) {
			this.autoLive = state;
			this.applyAutoLive();
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

		async postMessage(message: string): Promise<boolean> {
			if (!agent) return false;
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
					return true;
				}
			} catch (error) {
				console.error(error);
			}
			return false;
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
			this.applyAutoLive();
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

		saveConfigs() {
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
	connected: boolean;
	handleResolver: string;
}
