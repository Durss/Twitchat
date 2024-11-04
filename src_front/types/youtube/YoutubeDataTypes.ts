export interface YoutubeAuthResult {
	code: string;
	csrf: string;
}

export interface YoutubeAuthToken {
	access_token: string;
	refresh_token: string;
	scope: string;
	token_type: string;//Bearer
	expiry_date: number;//In milliseconds
}

export interface YoutubeLiveBroadcast {
	kind: string;
	etag: string;
	pageInfo: PageInfo;
	items: {
		kind: string;
		etag: string;
		id: string;
		snippet: {
			publishedAt: string;
			channelId: string;
			title: string;
			description: string;
			thumbnails: {
				default: ThumbnailInfo;
				medium: ThumbnailInfo;
				high: ThumbnailInfo;
				standard: ThumbnailInfo;
				maxres: ThumbnailInfo;
			};
			/**
			 * @deprecated since 2020
			 */
			isDefaultBroadcast: boolean;
			liveChatId: string;
		};
		status: {
			lifeCycleStatus: "complete" | "created" | "live" | "liveStarting" | "ready" | "revoked" | "testStarting" | "testing";
			privacyStatus: string;
			recordingStatus: "recording" | "recorded" | "notRecording";
			madeForKids: boolean;
			selfDeclaredMadeForKids: boolean;
		};
		contentDetails: {
			boundStreamId: string;
			boundStreamLastUpdateTimeMs: string;
			monitorStream: {
				enableMonitorStream: boolean;
				broadcastStreamDelayMs: number;
				embedHtml: string;
			};
			enableEmbed: boolean;
			enableDvr: boolean;
			enableContentEncryption: boolean;
			startWithSlate: boolean;
			recordFromStart: boolean;
			enableClosedCaptions: boolean;
			closedCaptionsType: string;
			enableLowLatency: boolean;
			latencyPreference: string;
			projection: string;
			enableAutoStart: boolean;
			enableAutoStop: boolean;
		};
		monetizationDetails: {
			enableMonitorStream: boolean;
			broadcastStreamDelayMs: number;
			embedHtml: string;
		};
	}[];
}

export interface YoutubeFollowerResult {
	etag: string;
	pollingIntervalMillis: number;
	pageInfo: PageInfo;
	nextPageToken: string;
	items: {
		kind: string;
		etag: string;
		id: string;
		subscriberSnippet: {
			title: string,
			description: string,
			channelId: string,
			thumbnails: {
				default: {
					url: string,
				},
				medium: {
					url: string,
				},
				high: {
					url: string,
				}
			}
		}
	}[]
}

/**
 * LiveChatMessage reference:
 * https://developers.google.com/youtube/v3/live/docs/liveChatMessages
 * 
 */
export interface YoutubeMessages {
	kind: string;
	etag: string;
	pollingIntervalMillis: number;
	pageInfo: PageInfo;
	nextPageToken: string;
	items: {
		kind: string;
		etag: string;
		id: string;
		snippet: YoutubeTextMessage
				| YoutubeDeletedMessage
				| YoutubeBanUserMessage
				| YoutubeResubMessage
				| YoutubeSubMessage
				| YoutubeSuperChatMessage
				| YoutubeSuperStickerMessage
				| YoutubeSubgiftMessage
				| YoutubeSubgiftReceivedChatMessage
				| YoutubeTombstoneMessage
				| YoutubeSponsorOnlyModeOn
				| YoutubeSponsorOnlyModeOff
				| YoutubeChatEnded
		authorDetails: {
			channelId: string;
			channelUrl: string;
			displayName: string;
			profileImageUrl: string;
			isVerified: boolean;
			isChatOwner: boolean;
			isChatSponsor: boolean;
			isChatModerator: boolean;
		};
	}[];
}

interface AbstractYoutubeTextMessage {
	liveChatId: string;
	authorChannelId: string;
	publishedAt: string;
	hasDisplayContent: boolean;
	displayMessage?: string;
}

interface YoutubeTombstoneMessage extends AbstractYoutubeTextMessage {
	type: "tombstone";
}

/**
 * Tells the chat has switched to sponsor only
 */
interface YoutubeSponsorOnlyModeOn extends AbstractYoutubeTextMessage {
	type: "sponsorOnlyModeStartedEvent";
}

/**
 * Tells the isn't sponsor in only mode
 */
interface YoutubeSponsorOnlyModeOff extends AbstractYoutubeTextMessage {
	type: "sponsorOnlyModeEndedEvent";
}

/**
 * Chat is closed.
 * No more message will be received
 */
interface YoutubeChatEnded extends AbstractYoutubeTextMessage {
	type: "chatEndedEvent";
}

interface YoutubeTextMessage extends AbstractYoutubeTextMessage {
	type: "textMessageEvent";
	displayMessage: string;
	textMessageDetails: {
		messageText: string;
	};
}

interface YoutubeDeletedMessage extends AbstractYoutubeTextMessage {
	type: "messageDeletedEvent";
	messageDeletedDetails: {
		deletedMessageId: string;
	};
}

interface YoutubeBanUserMessage extends AbstractYoutubeTextMessage {
	type: "userBannedEvent";
	userBannedDetails: {
		bannedUserDetails: {
			channelId: string;
			channelUrl: string;
			displayName: string;
			profileImageUrl: string;
		};
		banType: "permanent"|"temporary";
		banDurationSeconds?: number;
	};
}

interface YoutubeResubMessage extends AbstractYoutubeTextMessage {
	type: "memberMilestoneChatEvent";
	memberMilestoneChatDetails: {
		memberMonth: number;
		memberLevelName: string;
		userComment?: string;
	};
}

interface YoutubeSubMessage extends AbstractYoutubeTextMessage {
	type: "newSponsorEvent";
	newSponsorDetails: {
		/**
		 * Defines if user upgraded their membership (true) or
		 * is a new subscriber (false)
		 */
		isUpgrade: boolean;
		memberLevelName?: string;
	};
}

interface YoutubeSubgiftMessage extends AbstractYoutubeTextMessage {
	type: "membershipGiftingEvent";
	membershipGiftingDetails: {
		giftMembershipsCount: number;
		giftMembershipsLevelName: string;
	};
}

interface YoutubeSubgiftReceivedChatMessage extends AbstractYoutubeTextMessage {
	type: "giftMembershipReceivedEvent";
	giftMembershipReceivedDetails: {
		memberLevelName: string;
		gifterChannelId: string;
		associatedMembershipGiftingMessageId: string;
	};
}

interface YoutubeSuperChatMessage extends AbstractYoutubeTextMessage {
	type: "superChatEvent";
	superChatDetails: {
		/**
		 * 1$ = 1 000 000
		 */
		amountMicros: number;
		/**
		 * From 1 to 
		 */
		tier: number;
		currency: string;
		amountDisplayString: string;
		userComment: string;
	};
}

interface YoutubeSuperStickerMessage extends AbstractYoutubeTextMessage {
	type: "superStickerDetails";
	superStickerDetails: {
		/**
		 * 1$ = 1 000 000
		 */
		amountMicros: number;
		/**
		 * From 1 to 10
		 */
		tier: number;
		currency: string;
		amountDisplayString: string;
		superStickerMetadata: {
			altText: string;
			/**
			 * Language of the alt text
			 */
			language: string;
			/**
			 * ID to image can be found here:
			 * https://youtube.googleapis.com/super_stickers/sticker_ids_to_urls.csv
			 */
			stickerId: string;
		}
	}
}

export interface YoutubeChannelInfo {
	etag: string;
	pageInfo: PageInfo;
	items: {
		kind: string;
		etag: string;
		id: string;
		snippet: {
			title: string;
			description: string;
			customUrl: string;
			publishedAt: string;
			thumbnails: {
				default: ThumbnailInfo;
				medium: ThumbnailInfo;
				high: ThumbnailInfo;
			};
			localized: {
				title: string;
				description: string;
			};
			country: string;
			defaultLanguage?: string
		};
		status: {
			privacyStatus: string;
			isLinked: boolean;
			longUploadsStatus: string;
		};
	}[];
}

interface ThumbnailInfo {
	url: string;
	width: number;
	height: number;
}

interface PageInfo {
	totalResults: number;
	resultsPerPage: number;
}