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
		snippet: {
			type: string;
			liveChatId: string;
			authorChannelId: string;
			publishedAt: string;
			hasDisplayContent: boolean;
			displayMessage: string;
			textMessageDetails: {
				messageText: string;
			};
		};
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