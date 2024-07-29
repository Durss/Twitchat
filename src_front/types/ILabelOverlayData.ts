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

	{tag:"STREAM_DURATION",					type:"duration",descriptionKey:"overlay.labels.placeholders.STREAM_DURATION"} as const,
	{tag:"STREAM_TITLE",					type:"string",	descriptionKey:"overlay.labels.placeholders.STREAM_TITLE"} as const,
	{tag:"VIEWER_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.VIEWER_COUNT"} as const,
	{tag:"STREAM_CATEGORY_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.STREAM_CATEGORY_NAME"} as const,
	{tag:"STREAM_CATEGORY_COVER",			type:"image",	descriptionKey:"overlay.labels.placeholders.STREAM_CATEGORY_COVER"} as const,
	
	{tag:"FOLLOWER_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_COUNT"} as const,
	{tag:"SUB_COUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.SUB_COUNT"} as const,
	
	{tag:"LAST_SUB_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_NAME"} as const,
	{tag:"LAST_SUB_ID",						type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_ID"} as const,
	{tag:"LAST_SUB_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_AVATAR"} as const,
	{tag:"LAST_SUB_TIER",					type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_TIER"} as const,
	{tag:"LAST_SUB_YOUTUBE_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_YOUTUBE_NAME"} as const,
	{tag:"LAST_SUB_YOUTUBE_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_YOUTUBE_ID"} as const,
	{tag:"LAST_SUB_YOUTUBE_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_YOUTUBE_AVATAR"} as const,
	{tag:"LAST_SUB_YOUTUBE_TIER",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_YOUTUBE_TIER"} as const,
	{tag:"LAST_SUB_GENERIC_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_GENERIC_NAME"} as const,
	{tag:"LAST_SUB_GENERIC_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_GENERIC_ID"} as const,
	{tag:"LAST_SUB_GENERIC_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_GENERIC_AVATAR"} as const,
	{tag:"LAST_SUB_GENERIC_TIER",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_GENERIC_TIER"} as const,
	
	{tag:"LAST_SUBGIFT_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_NAME"} as const,
	{tag:"LAST_SUBGIFT_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_ID"} as const,
	{tag:"LAST_SUBGIFT_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_AVATAR"} as const,
	{tag:"LAST_SUBGIFT_TIER",				type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_TIER"} as const,
	{tag:"LAST_SUBGIFT_COUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_COUNT"} as const,
	{tag:"LAST_SUBGIFT_YOUTUBE_NAME",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_YOUTUBE_NAME"} as const,
	{tag:"LAST_SUBGIFT_YOUTUBE_ID",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_YOUTUBE_ID"} as const,
	{tag:"LAST_SUBGIFT_YOUTUBE_AVATAR",		type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_YOUTUBE_AVATAR"} as const,
	{tag:"LAST_SUBGIFT_YOUTUBE_TIER",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_YOUTUBE_TIER"} as const,
	{tag:"LAST_SUBGIFT_YOUTUBE_COUNT",		type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_YOUTUBE_COUNT"} as const,
	{tag:"LAST_SUBGIFT_GENERIC_NAME",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_GENERIC_NAME"} as const,
	{tag:"LAST_SUBGIFT_GENERIC_ID",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_GENERIC_ID"} as const,
	{tag:"LAST_SUBGIFT_GENERIC_AVATAR",		type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_GENERIC_AVATAR"} as const,
	{tag:"LAST_SUBGIFT_GENERIC_TIER",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_GENERIC_TIER"} as const,
	{tag:"LAST_SUBGIFT_GENERIC_COUNT",		type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_GENERIC_COUNT"} as const,
	
	{tag:"LAST_SUPER_CHAT_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_CHAT_NAME"} as const,
	{tag:"LAST_SUPER_CHAT_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_CHAT_ID"} as const,
	{tag:"LAST_SUPER_CHAT_AVATAR",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_CHAT_AVATAR"} as const,
	{tag:"LAST_SUPER_CHAT_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_CHAT_AMOUNT"} as const,
	
	{tag:"LAST_SUPER_STICKER_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_STICKER_NAME"} as const,
	{tag:"LAST_SUPER_STICKER_ID",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_STICKER_ID"} as const,
	{tag:"LAST_SUPER_STICKER_AVATAR",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_STICKER_AVATAR"} as const,
	{tag:"LAST_SUPER_STICKER_AMOUNT",		type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_STICKER_AMOUNT"} as const,
	{tag:"LAST_SUPER_STICKER_IMAGE",		type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUPER_STICKER_IMAGE"} as const,
	
	{tag:"LAST_CHEER_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_CHEER_NAME"} as const,
	{tag:"LAST_CHEER_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_CHEER_ID"} as const,
	{tag:"LAST_CHEER_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_CHEER_AVATAR"} as const,
	{tag:"LAST_CHEER_AMOUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_CHEER_AMOUNT"} as const,
	
	{tag:"LAST_FOLLOWER_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_FOLLOWER_NAME"} as const,
	{tag:"LAST_FOLLOWER_ID",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_FOLLOWER_ID"} as const,
	{tag:"LAST_FOLLOWER_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_FOLLOWER_AVATAR"} as const,
	
	{tag:"LAST_REWARD_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_NAME"} as const,
	{tag:"LAST_REWARD_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_ID"} as const,
	{tag:"LAST_REWARD_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_AVATAR"} as const,
	{tag:"LAST_REWARD_ICON",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_ICON"} as const,
	{tag:"LAST_REWARD_TITLE",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_TITLE"} as const,
	
	{tag:"LAST_RAID_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_RAID_NAME"} as const,
	{tag:"LAST_RAID_ID",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_RAID_ID"} as const,
	{tag:"LAST_RAID_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_RAID_AVATAR"} as const,
	{tag:"LAST_RAID_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_RAID_COUNT"} as const,
	
	{tag:"LAST_WATCH_STREAK_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_WATCH_STREAK_NAME"} as const,
	{tag:"LAST_WATCH_STREAK_ID",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_WATCH_STREAK_ID"} as const,
	{tag:"LAST_WATCH_STREAK_AVATAR",		type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_WATCH_STREAK_AVATAR"} as const,
	{tag:"LAST_WATCH_STREAK_COUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_WATCH_STREAK_COUNT"} as const,
	
	{tag:"LAST_KOFI_TIP_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_KOFI_TIP_NAME"} as const,
	{tag:"LAST_KOFI_TIP_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_KOFI_TIP_AMOUNT"} as const,
	{tag:"LAST_KOFI_MERCH_USER",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_KOFI_MERCH_USER"} as const,
	{tag:"LAST_KOFI_MERCH_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_KOFI_MERCH_NAME"} as const,
	{tag:"LAST_KOFI_MERCH_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_KOFI_MERCH_AMOUNT"} as const,
	
	{tag:"LAST_STREAMLABS_TIP_NAME",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMLABS_TIP_NAME"} as const,
	{tag:"LAST_STREAMLABS_TIP_AMOUNT",		type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMLABS_TIP_AMOUNT"} as const,
	{tag:"LAST_STREAMLABS_MERCH_USER",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMLABS_MERCH_USER"} as const,
	{tag:"LAST_STREAMLABS_MERCH_NAME",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMLABS_MERCH_NAME"} as const,
	
	{tag:"LAST_STREAMELEMENTS_TIP_NAME",	type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMELEMENTS_TIP_NAME"} as const,
	{tag:"LAST_STREAMELEMENTS_TIP_AMOUNT",	type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMELEMENTS_TIP_AMOUNT"} as const,
	
	{tag:"LAST_TIPEEE_TIP_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_TIPEEE_TIP_NAME"} as const,
	{tag:"LAST_TIPEEE_TIP_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_TIPEEE_TIP_AMOUNT"} as const,
	
	{tag:"VOICEMOD_EFFECT_TITLE",			type:"number",	descriptionKey:"overlay.labels.placeholders.VOICEMOD_EFFECT_TITLE"} as const,
	{tag:"VOICEMOD_EFFECT_ICON",			type:"number",	descriptionKey:"overlay.labels.placeholders.VOICEMOD_EFFECT_ICON"} as const,
	
	{tag:"MUSIC_TITLE",						type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_TITLE"} as const,
	{tag:"MUSIC_ARTIST",					type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_ARTIST"} as const,
	{tag:"MUSIC_ALBUM",						type:"string",	descriptionKey:"overlay.labels.placeholders.MUSIC_ALBUM"} as const,
	{tag:"MUSIC_COVER",						type:"image",	descriptionKey:"overlay.labels.placeholders.MUSIC_COVER"} as const,
	
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
] as const;