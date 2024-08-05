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
type Test1 = AssertExact<LabelItemPlaceholder["type"], "string"|"number"|"image"|"duration"|"date"|"time"|"datetime">;

//If there's an error on TypeCheck var that's because one of the labels
//bellow has an invalid "type" value
const TypeCheck: Test1 = true;

export const LabelItemPlaceholderList = [
	{tag:"DATE",							type:"date",	descriptionKey:"overlay.labels.placeholders.DATE"} as const,
	{tag:"TIME",							type:"time",	descriptionKey:"overlay.labels.placeholders.TIME"} as const,
	{tag:"DATE_TIME",						type:"datetime",descriptionKey:"overlay.labels.placeholders.DATE_TIME"} as const,
	
	{tag:"VIEWER_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.VIEWER_COUNT"} as const,
	{tag:"FOLLOWER_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_COUNT"} as const,
	{tag:"SUB_COUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.SUB_COUNT"} as const,
	{tag:"SUB_POINTS",						type:"number",	descriptionKey:"overlay.labels.placeholders.SUB_POINTS"} as const,
	
	{tag:"STREAM_DURATION",					type:"duration",descriptionKey:"overlay.labels.placeholders.STREAM_DURATION"} as const,
	{tag:"STREAM_TITLE",					type:"string",	descriptionKey:"overlay.labels.placeholders.STREAM_TITLE"} as const,
	{tag:"STREAM_CATEGORY_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.STREAM_CATEGORY_NAME"} as const,
	{tag:"STREAM_CATEGORY_COVER",			type:"image",	descriptionKey:"overlay.labels.placeholders.STREAM_CATEGORY_COVER"} as const,
	
	{tag:"SUB_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_NAME"} as const,
	{tag:"SUB_ID",							type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_ID"} as const,
	{tag:"SUB_AVATAR",						type:"image",	descriptionKey:"overlay.labels.placeholders.SUB_AVATAR"} as const,
	{tag:"SUB_TIER",						type:"number",	descriptionKey:"overlay.labels.placeholders.SUB_TIER"} as const,

	{tag:"SUBGIFT_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_NAME"} as const,
	{tag:"SUBGIFT_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_ID"} as const,
	{tag:"SUBGIFT_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_AVATAR"} as const,
	{tag:"SUBGIFT_TIER",					type:"number",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_TIER"} as const,
	{tag:"SUBGIFT_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_COUNT"} as const,

	{tag:"SUB_YOUTUBE_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_YOUTUBE_NAME"} as const,
	{tag:"SUB_YOUTUBE_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_YOUTUBE_ID"} as const,
	{tag:"SUB_YOUTUBE_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.SUB_YOUTUBE_AVATAR"} as const,
	{tag:"SUB_YOUTUBE_TIER",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_YOUTUBE_TIER"} as const,

	{tag:"SUBGIFT_YOUTUBE_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_NAME"} as const,
	{tag:"SUBGIFT_YOUTUBE_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_ID"} as const,
	{tag:"SUBGIFT_YOUTUBE_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_AVATAR"} as const,
	{tag:"SUBGIFT_YOUTUBE_TIER",			type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_TIER"} as const,
	{tag:"SUBGIFT_YOUTUBE_COUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_YOUTUBE_COUNT"} as const,

	{tag:"SUB_GENERIC_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_GENERIC_NAME"} as const,
	{tag:"SUB_GENERIC_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_GENERIC_ID"} as const,
	{tag:"SUB_GENERIC_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.SUB_GENERIC_AVATAR"} as const,
	{tag:"SUB_GENERIC_TIER",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUB_GENERIC_TIER"} as const,

	{tag:"SUBGIFT_GENERIC_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_NAME"} as const,
	{tag:"SUBGIFT_GENERIC_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_ID"} as const,
	{tag:"SUBGIFT_GENERIC_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_AVATAR"} as const,
	{tag:"SUBGIFT_GENERIC_TIER",			type:"string",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_TIER"} as const,
	{tag:"SUBGIFT_GENERIC_COUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.SUBGIFT_GENERIC_COUNT"} as const,

	{tag:"SUPER_CHAT_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_CHAT_NAME"} as const,
	{tag:"SUPER_CHAT_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_CHAT_ID"} as const,
	{tag:"SUPER_CHAT_AVATAR",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_CHAT_AVATAR"} as const,
	{tag:"SUPER_CHAT_AMOUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.SUPER_CHAT_AMOUNT"} as const,

	{tag:"SUPER_STICKER_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_NAME"} as const,
	{tag:"SUPER_STICKER_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_ID"} as const,
	{tag:"SUPER_STICKER_AVATAR",			type:"string",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_AVATAR"} as const,
	{tag:"SUPER_STICKER_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_AMOUNT"} as const,
	{tag:"SUPER_STICKER_IMAGE",				type:"image",	descriptionKey:"overlay.labels.placeholders.SUPER_STICKER_IMAGE"} as const,

	{tag:"CHEER_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.CHEER_NAME"} as const,
	{tag:"CHEER_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.CHEER_ID"} as const,
	{tag:"CHEER_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.CHEER_AVATAR"} as const,
	{tag:"CHEER_AMOUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.CHEER_AMOUNT"} as const,

	{tag:"FOLLOWER_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_NAME"} as const,
	{tag:"FOLLOWER_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_ID"} as const,
	{tag:"FOLLOWER_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_AVATAR"} as const,

	{tag:"REWARD_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.REWARD_NAME"} as const,
	{tag:"REWARD_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.REWARD_ID"} as const,
	{tag:"REWARD_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.REWARD_AVATAR"} as const,
	{tag:"REWARD_ICON",						type:"image",	descriptionKey:"overlay.labels.placeholders.REWARD_ICON"} as const,
	{tag:"REWARD_TITLE",					type:"string",	descriptionKey:"overlay.labels.placeholders.REWARD_TITLE"} as const,

	{tag:"RAID_NAME",						type:"string",	descriptionKey:"overlay.labels.placeholders.RAID_NAME"} as const,
	{tag:"RAID_ID",							type:"string",	descriptionKey:"overlay.labels.placeholders.RAID_ID"} as const,
	{tag:"RAID_AVATAR",						type:"image",	descriptionKey:"overlay.labels.placeholders.RAID_AVATAR"} as const,
	{tag:"RAID_COUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.RAID_COUNT"} as const,
	
	{tag:"WATCH_STREAK_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.WATCH_STREAK_NAME"} as const,
	{tag:"WATCH_STREAK_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.WATCH_STREAK_ID"} as const,
	{tag:"WATCH_STREAK_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.WATCH_STREAK_AVATAR"} as const,
	{tag:"WATCH_STREAK_COUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.WATCH_STREAK_COUNT"} as const,
	
	{tag:"POWER_UP_GIANTIFIED_ID",			type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_ID"} as const,
	{tag:"POWER_UP_GIANTIFIED_NAME",		type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_NAME"} as const,
	{tag:"POWER_UP_GIANTIFIED_AVATAR",		type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_AVATAR"} as const,
	{tag:"POWER_UP_GIANTIFIED_CODE",		type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_CODE"} as const,
	{tag:"POWER_UP_GIANTIFIED_IMAGE",		type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_GIANTIFIED_IMAGE"} as const,
	
	{tag:"POWER_UP_CELEBRATION_ID",			type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_ID"} as const,
	{tag:"POWER_UP_CELEBRATION_NAME",		type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_NAME"} as const,
	{tag:"POWER_UP_CELEBRATION_AVATAR",		type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_AVATAR"} as const,
	{tag:"POWER_UP_CELEBRATION_CODE",		type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_CODE"} as const,
	{tag:"POWER_UP_CELEBRATION_IMAGE",		type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_CELEBRATION_IMAGE"} as const,
	
	{tag:"POWER_UP_MESSAGE_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_MESSAGE_ID"} as const,
	{tag:"POWER_UP_MESSAGE_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.POWER_UP_MESSAGE_NAME"} as const,
	{tag:"POWER_UP_MESSAGE_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.POWER_UP_MESSAGE_AVATAR"} as const,
	
	{tag:"KOFI_TIP_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.KOFI_TIP_NAME"} as const,
	{tag:"KOFI_TIP_AMOUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.KOFI_TIP_AMOUNT"} as const,
	{tag:"KOFI_MERCH_USER",					type:"string",	descriptionKey:"overlay.labels.placeholders.KOFI_MERCH_USER"} as const,
	{tag:"KOFI_MERCH_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.KOFI_MERCH_NAME"} as const,
	{tag:"KOFI_MERCH_AMOUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.KOFI_MERCH_AMOUNT"} as const,

	{tag:"STREAMLABS_TIP_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_TIP_NAME"} as const,
	{tag:"STREAMLABS_TIP_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_TIP_AMOUNT"} as const,
	{tag:"STREAMLABS_MERCH_USER",			type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_MERCH_USER"} as const,
	{tag:"STREAMLABS_MERCH_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMLABS_MERCH_NAME"} as const,

	{tag:"STREAMELEMENTS_TIP_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.STREAMELEMENTS_TIP_NAME"} as const,
	{tag:"STREAMELEMENTS_TIP_AMOUNT",		type:"number",	descriptionKey:"overlay.labels.placeholders.STREAMELEMENTS_TIP_AMOUNT"} as const,

	{tag:"TIPEEE_TIP_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.TIPEEE_TIP_NAME"} as const,
	{tag:"TIPEEE_TIP_AMOUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.TIPEEE_TIP_AMOUNT"} as const,
	
	{tag:"VOICEMOD_EFFECT_TITLE",			type:"number",	descriptionKey:"overlay.labels.placeholders.VOICEMOD_EFFECT_TITLE"} as const,
	{tag:"VOICEMOD_EFFECT_ICON",			type:"number",	descriptionKey:"overlay.labels.placeholders.VOICEMOD_EFFECT_ICON"} as const,
	
	{tag:"MUSIC_TITLE",						type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_TITLE"} as const,
	{tag:"MUSIC_ARTIST",					type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_ARTIST"} as const,
	{tag:"MUSIC_ALBUM",						type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_ALBUM"} as const,
	{tag:"MUSIC_COVER",						type:"image",	descriptionKey:"overlay.labels.placeholders.MUSIC_COVER"} as const,
] as const;