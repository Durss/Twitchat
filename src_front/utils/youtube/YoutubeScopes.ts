export const YoutubeScopes = {
	CHAT_READ: "https://www.googleapis.com/auth/youtube.readonly",
	CHAT_MODERATE: "https://www.googleapis.com/auth/youtube.force-ssl",
} as const;
export type YoutubeScopesString = typeof YoutubeScopes[keyof typeof YoutubeScopes];

export const YoutubeScope2Icon:Partial<{[key in YoutubeScopesString]:string}> = {};
YoutubeScope2Icon[YoutubeScopes.CHAT_READ]		= "whispers";
YoutubeScope2Icon[YoutubeScopes.CHAT_MODERATE]	= "mod";