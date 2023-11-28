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
			isDefaultBroadcast: boolean;
			liveChatId: string;
		};
		status: {
			lifeCycleStatus: "complete"|"created"|"live"|"liveStarting"|"ready"|"revoked"|"testStarting"|"testing";
			privacyStatus: string;
			recordingStatus: string;
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

interface ThumbnailInfo {
	url: string;
	width: number;
	height: number;
}

interface PageInfo {
	totalResults: number;
	resultsPerPage: number;
}