/**
 * Contains parameters about a label displayed on the
 * "Labels" overlay.
 */
export interface LabelItemData {
	id:string;
	title:string;
	enabled:boolean;
	placeholder:typeof LabelItemPlaceholderList[number]["tag"] | "";
	html:string;
	css:string;
	mode:"placeholder"|"html";
	fontSize:number;
	fontFamily:string;
	fontColor:string;
	scrollContent:boolean;
	backgroundEnabled:boolean;
	backgroundColor:string;
}

/**
 * Contains definition about a LabelItemData placeholder
 */
export interface LabelItemPlaceholder {
	tag:typeof LabelItemPlaceholderList[number]["tag"];
	type:typeof LabelItemPlaceholderList[number]["type"];
	descriptionKey:string;
	descriptionKeyName?:string;
}

type AssertExact<T, Expected> = [T] extends [Expected] ? ([Expected] extends [T] ? true : never) : never;
type Test1 = AssertExact<LabelItemPlaceholder["type"], "string"|"number"|"image"|"duration"|"date"|"time"|"datetime"|"hours"|"minutes"|"seconds"|"day"|"month"|"year">;

//If there's an error on TypeCheck var that's because one of the labels
//below has an invalid "type" value
const TypeCheck: Test1 = true;

export const LabelItemPlaceholderList = [
	{tag:"DATE",								type:"date",	descriptionKey:"overlay.labels.placeholders.DATE", backup:true} as const,
	{tag:"TIME",								type:"time",	descriptionKey:"overlay.labels.placeholders.TIME", backup:true} as const,
	{tag:"DATE_TIME",							type:"datetime",descriptionKey:"overlay.labels.placeholders.DATE_TIME", backup:true} as const,
	{tag:"DAY",									type:"day",		descriptionKey:"overlay.labels.placeholders.DAY", backup:true} as const,
	{tag:"MONTH",								type:"month",	descriptionKey:"overlay.labels.placeholders.MONTH", backup:true} as const,
	{tag:"YEAR",								type:"year",	descriptionKey:"overlay.labels.placeholders.YEAR", backup:true} as const,
	{tag:"HOURS",								type:"hours",	descriptionKey:"overlay.labels.placeholders.HOURS", backup:true} as const,
	{tag:"MINUTES",								type:"minutes",	descriptionKey:"overlay.labels.placeholders.MINUTES", backup:true} as const,
	{tag:"SECONDS",								type:"seconds",	descriptionKey:"overlay.labels.placeholders.SECONDS", backup:true} as const,

	{tag:"VIEWER_COUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.VIEWER_COUNT", backup:true} as const,
	{tag:"FOLLOWER_COUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_COUNT", backup:true} as const,
	{tag:"SUB_COUNT",							type:"number",	descriptionKey:"overlay.labels.placeholders.SUB_COUNT", backup:true} as const,
	{tag:"SUB_POINTS",							type:"number",	descriptionKey:"overlay.labels.placeholders.SUB_POINTS", backup:true} as const,

	{tag:"STREAM_DURATION",						type:"duration",descriptionKey:"overlay.labels.placeholders.STREAM_DURATION", backup:true} as const,
	{tag:"STREAM_TITLE",						type:"string",	descriptionKey:"overlay.labels.placeholders.STREAM_TITLE", backup:true} as const,
	{tag:"STREAM_CATEGORY_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.STREAM_CATEGORY_NAME", backup:true} as const,
	{tag:"STREAM_CATEGORY_COVER",				type:"image",	descriptionKey:"overlay.labels.placeholders.STREAM_CATEGORY_COVER", backup:true} as const,

	{tag:"SUB_NAME",							type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_NAME", backup:true} as const,
	{tag:"SUB_ID",								type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_ID", backup:true} as const,
	{tag:"SUB_AVATAR",							type:"image",	descriptionKey:"overlay.labels.placeholders.SUB_AVATAR", backup:true} as const,
	{tag:"SUB_TIER",							type:"number",	descriptionKey:"overlay.labels.placeholders.SUB_TIER", backup:true} as const,

	{tag:"SUBGIFT_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_NAME", backup:true} as const,
	{tag:"SUBGIFT_ID",							type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_ID", backup:true} as const,
	{tag:"SUBGIFT_AVATAR",						type:"image",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_AVATAR", backup:true} as const,
	{tag:"SUBGIFT_TIER",						type:"number",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_TIER", backup:true} as const,
	{tag:"SUBGIFT_COUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_COUNT", backup:true} as const,

	{tag:"SUB_YOUTUBE_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_YOUTUBE_NAME", backup:true} as const,
	{tag:"SUB_YOUTUBE_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_YOUTUBE_ID", backup:true} as const,
	{tag:"SUB_YOUTUBE_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.SUB_YOUTUBE_AVATAR", backup:true} as const,
	{tag:"SUB_YOUTUBE_TIER",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_YOUTUBE_TIER", backup:true} as const,

	{tag:"SUBGIFT_YOUTUBE_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_NAME", backup:true} as const,
	{tag:"SUBGIFT_YOUTUBE_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_ID", backup:true} as const,
	{tag:"SUBGIFT_YOUTUBE_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_AVATAR", backup:true} as const,
	{tag:"SUBGIFT_YOUTUBE_TIER",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_TIER", backup:true} as const,
	{tag:"SUBGIFT_YOUTUBE_COUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_COUNT", backup:true} as const,

	{tag:"FOLLOWER_YOUTUBE_USER",				type:"string",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_YOUTUBE_USER", backup:true} as const,
	{tag:"FOLLOWER_YOUTUBE_AVATAR",				type:"number",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_YOUTUBE_AVATAR", backup:true} as const,

	{tag:"SUB_GENERIC_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_GENERIC_NAME", backup:true} as const,
	{tag:"SUB_GENERIC_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_GENERIC_ID", backup:true} as const,
	{tag:"SUB_GENERIC_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.SUB_GENERIC_AVATAR", backup:true} as const,
	{tag:"SUB_GENERIC_TIER",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_GENERIC_TIER", backup:true} as const,

	{tag:"SUBGIFT_GENERIC_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_NAME", backup:true} as const,
	{tag:"SUBGIFT_GENERIC_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_ID", backup:true} as const,
	{tag:"SUBGIFT_GENERIC_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_AVATAR", backup:true} as const,
	{tag:"SUBGIFT_GENERIC_TIER",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_TIER", backup:true} as const,
	{tag:"SUBGIFT_GENERIC_COUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_COUNT", backup:true} as const,

	{tag:"SUPER_CHAT_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_CHAT_NAME", backup:true} as const,
	{tag:"SUPER_CHAT_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_CHAT_ID", backup:true} as const,
	{tag:"SUPER_CHAT_AVATAR",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_CHAT_AVATAR", backup:true} as const,
	{tag:"SUPER_CHAT_AMOUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.SUPER_CHAT_AMOUNT", backup:true} as const,

	{tag:"SUPER_STICKER_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_NAME", backup:true} as const,
	{tag:"SUPER_STICKER_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_ID", backup:true} as const,
	{tag:"SUPER_STICKER_AVATAR",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_AVATAR", backup:true} as const,
	{tag:"SUPER_STICKER_AMOUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_AMOUNT", backup:true} as const,
	{tag:"SUPER_STICKER_IMAGE",					type:"image",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_IMAGE", backup:true} as const,

	{tag:"CHEER_NAME",							type:"string",	descriptionKey:"overlay.labels.placeholders.CHEER_NAME", backup:true} as const,
	{tag:"CHEER_ID",							type:"string",	descriptionKey:"overlay.labels.placeholders.CHEER_ID", backup:true} as const,
	{tag:"CHEER_AVATAR",						type:"image",	descriptionKey:"overlay.labels.placeholders.CHEER_AVATAR", backup:true} as const,
	{tag:"CHEER_AMOUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.CHEER_AMOUNT", backup:true} as const,

	{tag:"FOLLOWER_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_NAME", backup:true} as const,
	{tag:"FOLLOWER_ID",							type:"string",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_ID", backup:true} as const,
	{tag:"FOLLOWER_AVATAR",						type:"image",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_AVATAR", backup:true} as const,

	{tag:"FOLLOWER_GENERIC_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_GENERIC_NAME", backup:true} as const,
	{tag:"FOLLOWER_GENERIC_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_GENERIC_ID", backup:true} as const,
	{tag:"FOLLOWER_GENERIC_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_GENERIC_AVATAR", backup:true} as const,

	{tag:"REWARD_NAME",							type:"string",	descriptionKey:"overlay.labels.placeholders.REWARD_NAME", backup:true} as const,
	{tag:"REWARD_ID",							type:"string",	descriptionKey:"overlay.labels.placeholders.REWARD_ID", backup:true} as const,
	{tag:"REWARD_AVATAR",						type:"image",	descriptionKey:"overlay.labels.placeholders.REWARD_AVATAR", backup:true} as const,
	{tag:"REWARD_ICON",							type:"image",	descriptionKey:"overlay.labels.placeholders.REWARD_ICON", backup:true} as const,
	{tag:"REWARD_TITLE",						type:"string",	descriptionKey:"overlay.labels.placeholders.REWARD_TITLE", backup:true} as const,

	{tag:"RAID_NAME",							type:"string",	descriptionKey:"overlay.labels.placeholders.RAID_NAME", backup:true} as const,
	{tag:"RAID_ID",								type:"string",	descriptionKey:"overlay.labels.placeholders.RAID_ID", backup:true} as const,
	{tag:"RAID_AVATAR",							type:"image",	descriptionKey:"overlay.labels.placeholders.RAID_AVATAR", backup:true} as const,
	{tag:"RAID_COUNT",							type:"number",	descriptionKey:"overlay.labels.placeholders.RAID_COUNT", backup:true} as const,

	{tag:"WATCH_STREAK_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.WATCH_STREAK_NAME", backup:true} as const,
	{tag:"WATCH_STREAK_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.WATCH_STREAK_ID", backup:true} as const,
	{tag:"WATCH_STREAK_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.WATCH_STREAK_AVATAR", backup:true} as const,
	{tag:"WATCH_STREAK_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.WATCH_STREAK_COUNT", backup:true} as const,

	{tag:"POWER_UP_GIANTIFIED_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_ID", backup:true} as const,
	{tag:"POWER_UP_GIANTIFIED_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_NAME", backup:true} as const,
	{tag:"POWER_UP_GIANTIFIED_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_AVATAR", backup:true} as const,
	{tag:"POWER_UP_GIANTIFIED_CODE",			type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_CODE", backup:true} as const,
	{tag:"POWER_UP_GIANTIFIED_IMAGE",			type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_IMAGE", backup:true} as const,

	{tag:"POWER_UP_CELEBRATION_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_ID", backup:true} as const,
	{tag:"POWER_UP_CELEBRATION_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_NAME", backup:true} as const,
	{tag:"POWER_UP_CELEBRATION_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_AVATAR", backup:true} as const,
	{tag:"POWER_UP_CELEBRATION_CODE",			type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_CODE", backup:true} as const,
	{tag:"POWER_UP_CELEBRATION_IMAGE",			type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_IMAGE", backup:true} as const,

	{tag:"POWER_UP_MESSAGE_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_MESSAGE_ID", backup:true} as const,
	{tag:"POWER_UP_MESSAGE_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_MESSAGE_NAME", backup:true} as const,
	{tag:"POWER_UP_MESSAGE_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_MESSAGE_AVATAR", backup:true} as const,

	{tag:"KOFI_TIP_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.KOFI_TIP_NAME", backup:true} as const,
	{tag:"KOFI_TIP_AMOUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.KOFI_TIP_AMOUNT", backup:true} as const,
	{tag:"KOFI_MERCH_USER",						type:"string",	descriptionKey:"overlay.labels.placeholders.KOFI_MERCH_USER", backup:true} as const,
	{tag:"KOFI_MERCH_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.KOFI_MERCH_NAME", backup:true} as const,
	{tag:"KOFI_MERCH_AMOUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.KOFI_MERCH_AMOUNT", backup:true} as const,

	{tag:"STREAMLABS_TIP_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_TIP_NAME", backup:true} as const,
	{tag:"STREAMLABS_TIP_AMOUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_TIP_AMOUNT", backup:true} as const,
	{tag:"STREAMLABS_MERCH_USER",				type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_MERCH_USER", backup:true} as const,
	{tag:"STREAMLABS_MERCH_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_MERCH_NAME", backup:true} as const,
	{tag:"STREAMLABS_CHARITY_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_CHARITY_NAME", backup:true} as const,
	{tag:"STREAMLABS_CHARITY_IMAGE",			type:"image",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_CHARITY_IMAGE", backup:true} as const,
	{tag:"STREAMLABS_CHARITY_RAISED",			type:"number",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_CHARITY_RAISED", backup:true} as const,
	{tag:"STREAMLABS_CHARITY_RAISED_PERSONNAL",	type:"number",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_CHARITY_RAISED_PERSONNAL", backup:true} as const,
	{tag:"STREAMLABS_CHARITY_GOAL",				type:"number",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_CHARITY_GOAL", backup:true} as const,
	{tag:"STREAMLABS_CHARITY_LAST_TIP_USER",	type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_CHARITY_LAST_TIP_USER", backup:true} as const,
	{tag:"STREAMLABS_CHARITY_LAST_TIP_AMOUNT",	type:"number",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_CHARITY_LAST_TIP_AMOUNT", backup:true} as const,

	// {tag:"TILTIFY_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.TILTIFY_NAME", backup:true} as const,
	// {tag:"TILTIFY_IMAGE",						type:"image",	descriptionKey:"overlay.labels.placeholders.TILTIFY_IMAGE", backup:true} as const,
	// {tag:"TILTIFY_RAISED",						type:"number",	descriptionKey:"overlay.labels.placeholders.TILTIFY_RAISED", backup:true} as const,
	// {tag:"TILTIFY_GOAL",						type:"number",	descriptionKey:"overlay.labels.placeholders.TILTIFY_GOAL", backup:true} as const,
	{tag:"TILTIFY_LAST_TIP_USER",				type:"string",	descriptionKey:"overlay.labels.placeholders.TILTIFY_LAST_TIP_USER", backup:true} as const,
	{tag:"TILTIFY_LAST_TIP_AMOUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.TILTIFY_LAST_TIP_AMOUNT", backup:true} as const,

	{tag:"PATREON_USER",						type:"string",	descriptionKey:"overlay.labels.placeholders.PATREON_USER", backup:true} as const,
	{tag:"PATREON_AMOUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.PATREON_AMOUNT", backup:true} as const,
	{tag:"PATREON_TITLE",						type:"string",	descriptionKey:"overlay.labels.placeholders.PATREON_TITLE", backup:true} as const,
	{tag:"PATREON_AVATAR",						type:"image",	descriptionKey:"overlay.labels.placeholders.PATREON_AVATAR", backup:true} as const,
	{tag:"PATREON_MEMBER_COUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.PATREON_MEMBER_COUNT", backup:true} as const,

	{tag:"STREAMELEMENTS_TIP_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMELEMENTS_TIP_NAME", backup:true} as const,
	{tag:"STREAMELEMENTS_TIP_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.STREAMELEMENTS_TIP_AMOUNT", backup:true} as const,

	{tag:"TIPEEE_TIP_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.TIPEEE_TIP_NAME", backup:true} as const,
	{tag:"TIPEEE_TIP_AMOUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.TIPEEE_TIP_AMOUNT", backup:true} as const,

	{tag:"TWITCH_CHARITY_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.TWITCH_CHARITY_NAME", backup:true} as const,
	{tag:"TWITCH_CHARITY_IMAGE",				type:"image",	descriptionKey:"overlay.labels.placeholders.TWITCH_CHARITY_IMAGE", backup:true} as const,
	{tag:"TWITCH_CHARITY_RAISED",				type:"number",	descriptionKey:"overlay.labels.placeholders.TWITCH_CHARITY_RAISED", backup:true} as const,
	{tag:"TWITCH_CHARITY_GOAL",					type:"number",	descriptionKey:"overlay.labels.placeholders.TWITCH_CHARITY_GOAL", backup:true} as const,
	{tag:"TWITCH_CHARITY_LAST_TIP_USER",		type:"string",	descriptionKey:"overlay.labels.placeholders.TWITCH_CHARITY_LAST_TIP_USER", backup:true} as const,
	{tag:"TWITCH_CHARITY_LAST_TIP_AMOUNT",		type:"number",	descriptionKey:"overlay.labels.placeholders.TWITCH_CHARITY_LAST_TIP_AMOUNT", backup:true} as const,
	{tag:"TWITCH_CHARITY_LAST_TIP_AVATAR",		type:"image",	descriptionKey:"overlay.labels.placeholders.TWITCH_CHARITY_LAST_TIP_AVATAR", backup:true} as const,

	{tag:"VOICEMOD_EFFECT_TITLE",				type:"number",	descriptionKey:"overlay.labels.placeholders.VOICEMOD_EFFECT_TITLE", backup:true} as const,
	{tag:"VOICEMOD_EFFECT_ICON",				type:"number",	descriptionKey:"overlay.labels.placeholders.VOICEMOD_EFFECT_ICON", backup:false} as const,

	{tag:"MUSIC_TITLE",							type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_TITLE", backup:true} as const,
	{tag:"MUSIC_ARTIST",						type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_ARTIST", backup:true} as const,
	{tag:"MUSIC_ALBUM",							type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_ALBUM", backup:true} as const,
	{tag:"MUSIC_COVER",							type:"image",	descriptionKey:"overlay.labels.placeholders.MUSIC_COVER", backup:true} as const,

	{tag:"TIKTOK_VIEWER_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.TIKTOK_VIEWER_COUNT", backup:true} as const,
	{tag:"TIKTOK_LIKE_TOTAL",					type:"number",	descriptionKey:"overlay.labels.placeholders.TIKTOK_LIKE_TOTAL", backup:true} as const,
	{tag:"TIKTOK_LIKE_USER",					type:"string",	descriptionKey:"overlay.labels.placeholders.TIKTOK_LIKE_USER", backup:true} as const,
	{tag:"TIKTOK_LIKE_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.TIKTOK_LIKE_AVATAR", backup:true} as const,
	{tag:"TIKTOK_LIKE_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.TIKTOK_LIKE_COUNT", backup:true} as const,

	{tag:"TIKTOK_LIKE_FOLLOWER",				type:"number",	descriptionKey:"overlay.labels.placeholders.TIKTOK_LIKE_FOLLOWER", backup:true} as const,

	{tag:"TIKTOK_SUB_USER",						type:"string",	descriptionKey:"overlay.labels.placeholders.TIKTOK_SUB_USER", backup:true} as const,
	{tag:"TIKTOK_SUB_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.TIKTOK_SUB_AVATAR", backup:true} as const,

	{tag:"TIKTOK_SHARE_USER",					type:"string",	descriptionKey:"overlay.labels.placeholders.TIKTOK_SHARE_USER", backup:true} as const,
	{tag:"TIKTOK_SHARE_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.TIKTOK_SHARE_AVATAR", backup:true} as const,

	{tag:"TIKTOK_GIFT_USER",					type:"string",	descriptionKey:"overlay.labels.placeholders.TIKTOK_GIFT_USER", backup:true} as const,
	{tag:"TIKTOK_GIFT_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.TIKTOK_GIFT_AVATAR", backup:true} as const,
	{tag:"TIKTOK_GIFT_IMAGE",					type:"image",	descriptionKey:"overlay.labels.placeholders.TIKTOK_GIFT_IMAGE", backup:true} as const,
	{tag:"TIKTOK_GIFT_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.TIKTOK_GIFT_COUNT", backup:true} as const,
	{tag:"TIKTOK_GIFT_DIAMONDS",				type:"number",	descriptionKey:"overlay.labels.placeholders.TIKTOK_GIFT_DIAMONDS", backup:true} as const,
] as const;
