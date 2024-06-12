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
	type:"string"|"number"|"image";
	descriptionKey:string;
}

export const LabelItemPlaceholderList = [
	{tag:"SUB_COUNT",						type:"number",	descriptionKey:"overlay.labels.placeholders.SUB_COUNT"} as const,
	{tag:"FOLLOWER_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.FOLLOWER_COUNT"} as const,
	{tag:"LAST_SUB_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_NAME"} as const,
	{tag:"LAST_SUB_AVATAR",					type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_AVATAR"} as const,
	{tag:"LAST_SUB_TIER",					type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUB_TIER"} as const,
	{tag:"LAST_SUBGIFT_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_NAME"} as const,
	{tag:"LAST_SUBGIFT_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_AVATAR"} as const,
	{tag:"LAST_SUBGIFT_TIER",				type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_TIER"} as const,
	{tag:"LAST_SUBGIFT_COUNT",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_SUBGIFT_COUNT"} as const,
	{tag:"LAST_CHEER_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_CHEER_NAME"} as const,
	{tag:"LAST_CHEER_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_CHEER_AVATAR"} as const,
	{tag:"LAST_CHEER_AMOUNT",				type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_CHEER_AMOUNT"} as const,
	{tag:"LAST_FOLLOWER_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_FOLLOWER_NAME"} as const,
	{tag:"LAST_FOLLOWER_AVATAR",			type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_FOLLOWER_AVATAR"} as const,
	{tag:"LAST_REWARD_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_NAME"} as const,
	{tag:"LAST_REWARD_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_AVATAR"} as const,
	{tag:"LAST_REWARD_ICON",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_ICON"} as const,
	{tag:"LAST_REWARD_TITLE",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_REWARD_TITLE"} as const,
	{tag:"LAST_RAID_NAME",					type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_RAID_NAME"} as const,
	{tag:"LAST_RAID_AVATAR",				type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_RAID_AVATAR"} as const,
	{tag:"LAST_RAID_COUNT",					type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_RAID_COUNT"} as const,
	{tag:"LAST_WATCH_STREAK_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_WATCH_STREAK_NAME"} as const,
	{tag:"LAST_WATCH_STREAK_AVATAR",		type:"image",	descriptionKey:"overlay.labels.placeholders.LAST_WATCH_STREAK_AVATAR"} as const,
	{tag:"LAST_WATCH_STREAK_COUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_WATCH_STREAK_COUNT"} as const,
	{tag:"LAST_KOFI_TIP_NAME",				type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_KOFI_TIP_NAME"} as const,
	{tag:"LAST_KOFI_TIP_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_KOFI_TIP_AMOUNT"} as const,
	{tag:"LAST_STREAMLABS_TIP_NAME",		type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMLABS_TIP_NAME"} as const,
	{tag:"LAST_STREAMLABS_TIP_AMOUNT",		type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMLABS_TIP_AMOUNT"} as const,
	{tag:"LAST_STREAMELEMENTS_TIP_NAME",	type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMELEMENTS_TIP_NAME"} as const,
	{tag:"LAST_STREAMELEMENTS_TIP_AMOUNT",	type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_STREAMELEMENTS_TIP_AMOUNT"} as const,
	{tag:"LAST_TIPEEE_TIP_NAME",			type:"string",	descriptionKey:"overlay.labels.placeholders.LAST_TIPEEE_TIP_NAME"} as const,
	{tag:"LAST_TIPEEE_TIP_AMOUNT",			type:"number",	descriptionKey:"overlay.labels.placeholders.LAST_TIPEEE_TIP_AMOUNT"} as const,
	{tag:"VOICEMOD_EFFECT_TITLE",	type:"number",	descriptionKey:"overlay.labels.placeholders.VOICEMOD_EFFECT_TITLE"} as const,
	{tag:"VOICEMOD_EFFECT_ICON",	type:"number",	descriptionKey:"overlay.labels.placeholders.VOICEMOD_EFFECT_ICON"} as const,
] as const;