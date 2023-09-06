import StoreProxy from "@/store/StoreProxy";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import type { GoXLRTypes } from "./GoXLRTypes";
import { TwitchatDataTypes } from "./TwitchatDataTypes";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";

/**
 * Util to strongly type string object paths.
 */
type Path<T> = T extends Array<infer U>
? U extends object
? `${number}.${Path<U>}`
: `${number}`
: T extends object
? {
	[P in keyof T]: (P & string) | `${P & string}.${Path<T[P]>}`
}[keyof T]
: never;

export type TriggerActionTypes =  TriggerActionEmptyData
								| TriggerActionDelayData
								| TriggerActionObsData
								| TriggerActionChatData
								| TriggerActionTTSData
								| TriggerActionMusicEntryData
								| TriggerActionRaffleData
								| TriggerActionRaffleEnterData
								| TriggerActionBingoData
								| TriggerActionVoicemodData
								| TriggerActionHighlightData
								| TriggerActionTriggerData
								| TriggerActionHTTPCallData
								| TriggerActionWSData
								| TriggerActionPollData
								| TriggerActionPredictionData
								| TriggerActionCounterData
								| TriggerActionRandomData
								| TriggerActionStreamInfoData
								| TriggerActionTriggerToggleData
								| TriggerActionChatSuggestionsData
								| TriggerActionVibrateData
								| TriggerActionGoXLRData
								| TriggerCustomBadgesData
								| TriggerCustomUsernameData
								| TriggerActionValueData
;

export type TriggerActionStringTypes = TriggerActionTypes["type"];

export interface TriggerData {
	id:string;
	/**
	 * Date at which the trigger have been created in milliseconds
	 */
	created_at?:number;
	/**
	 * Trigger type
	 */
	type:TriggerTypesValue;
	/**
	 * Trigger enabled ?
	 */
	enabled:boolean;
	/**
	 * Trigger action list
	 */
	actions:TriggerActionTypes[];
	/**
	 * Trigger's custom name
	 */
	name?:string;
	
	/**
	 * Reward ID for reward related events
	 */
	rewardId?:string;
	/**
	 * Chat command name for chat command related events
	 */
	chatCommand?:string;
	/**
	 * Chat command aliases for chat command related events
	 */
	chatCommandAliases?:string[];
	/**
	 * Optional chat command params
	 */
	chatCommandParams?:TriggerChatCommandParam[];
	/**
	 * Schedule name for schedule related events
	 */
	scheduleName?:string;
	/**
	 * OBS source name for OBS source related events
	 */
	obsSource?:string;
	/**
	 * OBS scene name for OBS scene related events
	 */
	obsScene?:string;
	/**
	 * OBS input name for mute/unmute related events
	 */
	obsInput?:string;
	/**
	 * OBS filter name for filter toggle related events
	 */
	obsFilter?:string;
	/**
	 * Counter ID for counters related events
	 */
	counterId?:string;
	/**
	 * Counter ID for counters related events
	 */
	valueId?:string;
	/**
	 * List of GoXLR buttons that should start this trigger
	 */
	goxlrButtons?:GoXLRTypes.ButtonTypesData[];
	/**
	 * Execution queue for this trigger
	 */
	queue?:string;
	/**
	 * Trigger's permission for user related trigger events (only chat commands for now)
	 */
	permissions?:TwitchatDataTypes.PermissionsData;
	/**
	 * Trigger's cooldowns for chat command events
	 */
	cooldown?:TriggerCooldownData;
	/**
	 * Schedule params for schedule triggers
	 */
	scheduleParams?:TriggerScheduleData;
	/**
	 * Conditions to be matched for the trigger ot be executed
	 */
	conditions?:TriggerConditionGroup;
	/**
	 * Should this trigger be displayed on the context menu opened when
	 * right clicking a chat message ?
	 * Only for slash command triggers
	 */
	addToContextMenu?:boolean;
	/**
	 * Contains IDs of the clickable areas
	 */
	heatAreaIds?:string[];
	/**
	 * Contains the OBS source the user must click
	 */
	heatObsSource?:string;
	/**
	 * Defines if anonymous clicks should be allowed or not
	 */
	heatAllowAnon?:boolean;
	/**
	 * Defines if user must click on an OBS source or a custom zone
	 */
	heatClickSource?:"obs" | "area";

	/**
	 * @deprecated Only here for typings on data migration.
	 */
	prevKey?:string;
}

export interface TriggerChatCommandParam {
	type:"TEXT"|"USER";
	tag:string;
}

export interface TriggerConditionGroup {
	id:string;
	type:"group";
	conditions:(TriggerCondition | TriggerConditionGroup)[];
	operator:"OR"|"AND";
}

export interface TriggerCondition {
	id:string;
	type:"condition";
	placeholder:string;
	operator:TriggerConditionOperator;
	value:string;
}

export const TriggerConditionOperatorList = [">","<",">=","<=","=","!=","contains","not_contains","starts_with","not_starts_with","ends_with","not_ends_with"] as const;
export type TriggerConditionOperator = typeof TriggerConditionOperatorList[keyof typeof TriggerConditionOperatorList];

export interface TriggerCooldownData {
	/**
	 * Global cooldown in seconds
	 */
	global:number;
	/**
	 * User cooldown in seconds
	 */
	user:number;
	/**
	 * defines if a message should be posted on tchat if command is cooling down
	 */
	alert:boolean;
}

export interface TriggerLog {
	id:string;
	trigger:TriggerData;
	date:number;
	testMode:boolean;
	complete:boolean;
	skipped:boolean;
	error:boolean;
	criticalError:boolean;
	data:TwitchatDataTypes.ChatMessageTypes;
	messages:{date:number, value:string}[];
	steps:{
		id:string;
		date:number;
		data:TriggerActionTypes;
		messages:{date:number, value:string}[];
	}[]
}

export interface SocketParams {
	ip:string;
	port:string;
	secured:boolean;
}


export interface TriggerEventTypeCategory {
	id:number,
	labelKey:string;
	icons:string[];
};
//Main trigger categories displayed on the parameter "Triggers" section
export const TriggerEventTypeCategories = {
	GLOBAL:			{id:1, labelKey:"triggers.categories.global", icons:["whispers"]} as TriggerEventTypeCategory,
	TIMER:			{id:2, labelKey:"triggers.categories.timer", icons:["timer"]} as TriggerEventTypeCategory,
	TWITCHAT:		{id:3, labelKey:"triggers.categories.twitchat", icons:["twitchat"]} as TriggerEventTypeCategory,
	USER:			{id:4, labelKey:"triggers.categories.user", icons:["user"]} as TriggerEventTypeCategory,
	SUBITS:			{id:5, labelKey:"triggers.categories.subits", icons:["coin"]} as TriggerEventTypeCategory,
	MOD:			{id:6, labelKey:"triggers.categories.mod", icons:["mod"]} as TriggerEventTypeCategory,
	HYPETRAIN:		{id:7, labelKey:"triggers.categories.hypetrain", icons:["train"]} as TriggerEventTypeCategory,
	GAMES:			{id:8, labelKey:"triggers.categories.games", icons:["ticket"]} as TriggerEventTypeCategory,
	MUSIC:			{id:9, labelKey:"triggers.categories.music", icons:["spotify"]} as TriggerEventTypeCategory,
	OBS:			{id:10, labelKey:"triggers.categories.obs", icons:["obs"]} as TriggerEventTypeCategory,
	MISC:			{id:11, labelKey:"triggers.categories.misc", icons:["broadcast"]} as TriggerEventTypeCategory,
	COUNTER_VALUE:	{id:12, labelKey:"triggers.categories.count_and_values", icons:["count", "placeholder"]} as TriggerEventTypeCategory,
	GOXLR:			{id:13, labelKey:"triggers.categories.goxlr", icons:["goxlr"]} as TriggerEventTypeCategory,
};
export type TriggerEventTypeCategoryID = typeof TriggerEventTypeCategories[keyof typeof TriggerEventTypeCategories]['id'];

export interface TriggerTypeDefinition extends TwitchatDataTypes.ParameterDataListValue<TriggerTypesValue> {
	category:TriggerEventTypeCategory;
	labelKey:string;
	icon:string;
	beta?:boolean;
	premium?:boolean;
	disabled?:boolean;
	disabledReasonLabelKey?:string;
	noToggle?:boolean;
	descriptionKey?:string;
	isCategory?:boolean;
	testMessageType?:TwitchatDataTypes.TwitchatMessageStringType;
	testNoticeType?:TwitchatDataTypes.TwitchatNoticeStringType;
	goxlrMiniCompatible?:boolean;
	newDate?:number;
}

export interface TriggerMusicEventType extends Omit<TriggerTypeDefinition, "value"> {
	value:TriggerMusicTypesValue;
}

export interface TriggerScheduleEventType extends Omit<TriggerTypeDefinition, "value"> {
	value:TriggerScheduleTypesValue;
}

export interface TriggerActionData {
	type:TriggerActionStringTypes;
	id:string;
	/**
	 * If true, the trigger's conditions must be matched
	 * If not defined or false, the trigger must ahve no condition
	 * or the condition must not be matched
	 */
	condition?:boolean;
	/**
	 * @deprecated moved to a dedicated action
	 */
	delay?:number;
}

//Used for temporary trigger data before user selects the trigger type
export interface TriggerActionEmptyData extends TriggerActionData{
	type:null;
}

export interface TriggerActionDelayData extends TriggerActionData{
	type:"delay";
	/**
	 * Delay in seconds
	 */
	delay:number;
}

export type TriggerActionObsDataAction = "show"|"hide"|"mute"|"unmute"|"replay"|"switch_to";
export interface TriggerActionObsData extends TriggerActionData{
	type:"obs";
	action:TriggerActionObsDataAction;
	sourceName:string;
	filterName?:string;
	text?:string;
	url?:string;
	mediaPath?:string;
	/**
	 * @deprecated replaced by "action" prop
	 */
	show?:boolean|"replay";
}

export interface TriggerActionChatData extends TriggerActionData{
	type:"chat";
	text:string;
}

export interface TriggerActionTTSData extends TriggerActionData{
	type:"tts";
	text:string;
}

export interface TriggerActionRaffleData extends TriggerActionData{
	type:"raffle";
	raffleData:TwitchatDataTypes.RaffleData;
}

export interface TriggerActionRaffleEnterData extends TriggerActionData{
	type:"raffle_enter";
}

export interface TriggerActionBingoData extends TriggerActionData{
	type:"bingo";
	bingoData:TwitchatDataTypes.BingoConfig;
}

export interface TriggerCustomBadgesData extends TriggerActionData{
	id:string;
	type:"customBadges";
	customBadgeUserSource:string;
	customBadgeAdd:string[];
	customBadgeDel:string[];
}

export interface TriggerCustomUsernameData extends TriggerActionData{
	id:string;
	type:"customUsername";
	customUsername:string;
	customUsernameUserSource:string;
}

export const TriggerActionVoicemodDataActionList = ["voice", "sound", "beepOn", "beepOff"] as const;
export type TriggerActionVoicemodDataAction = typeof TriggerActionVoicemodDataActionList[number];
export interface TriggerActionVoicemodData extends TriggerActionData{
	type:"voicemod";
	/**
	 * Type of action
	 * @default "voice"
	 */
	action:TriggerActionVoicemodDataAction;
	/**
	 * Voice ID to enabled when "voice" action type is selected
	 */
	voiceID:string;
	/**
	 * Sound ID to to play when "sound" action type is selected
	 */
	soundID:string;
	/**
	 * Placeholder containing the voice or sound name
	 */
	placeholder:string
}

export interface TriggerActionMusicEntryData extends TriggerActionData{
	type:"music";
	musicAction:TriggerMusicTypesValue;
	track:string;
	confirmMessage:string;
	playlist:string;
}

export interface TriggerActionHighlightData extends TriggerActionData{
	type:"highlight";
	show:boolean;
	text:string;
}

export interface TriggerActionTriggerData extends TriggerActionData{
	type:"trigger";
	triggerId:string;
	/**
	 * @deprecated do not use! only here for data migration typing
	 */
	triggerKey?:string;
}

export type TriggerActionTriggerToggleDataAction = "enable"|"disable"|"toggle";
export interface TriggerActionTriggerToggleData extends TriggerActionData{
	type:"triggerToggle";
	triggerId:string;
	action:TriggerActionTriggerToggleDataAction;
}

export type TriggerActionHTTPCallDataAction = "GET"|"POST"|"PUT"|"DELETE"|"PATCH"|"TRACE"|"OPTIONS"|"CONNECT"|"HEAD";
export interface TriggerActionHTTPCallData extends TriggerActionData{
	type:"http";
	url:string;
	method:TriggerActionHTTPCallDataAction;
	queryParams:string[];
	outputPlaceholder?:string;
}

export interface TriggerActionWSData extends TriggerActionData{
	type:"ws";
	topic:string;
	params:string[];
}

export interface TriggerActionPollData extends TriggerActionData{
	type:"poll";
	pollData:TwitchatDataTypes.PollConfig;
}

export interface TriggerActionPredictionData extends TriggerActionData{
	type:"prediction";
	predictionData:TwitchatDataTypes.PredictionConfig;
}

export interface TriggerActionChatSuggestionsData extends TriggerActionData{
	type:"chatSugg";
	suggData:TwitchatDataTypes.ChatSuggestionData;
}

export interface TriggerActionVibrateData extends TriggerActionData{
	type:"vibrate";
	pattern:string;
}


export const TriggerActionGoXLRDataActionList = [
	{code:"fx_on", mini:false},
	{code:"fx_off", mini:false}, 
	{code:"sample_play", mini:false},
	{code:"set_fader", mini:true},
	{code:"profile", mini:true},
] as const;
export type TriggerActionGoXLRDataAction = typeof TriggerActionGoXLRDataActionList[number]['code'];
export interface TriggerActionGoXLRData extends TriggerActionData{
	type:"goxlr";
	/**
	 * Action type to execute
	 */
	action:TriggerActionGoXLRDataAction;
	/**
	 * Index of the preset (0-5)
	 */
	fxPresetIndex?:number;
	/**
	 * Value to move the fader to
	 */
	faderValue?:string;
	/**
	 * Profile to switch to
	 */
	profile?:string;
	/**
	 * Fader to update the value of
	 */
	faderId?:GoXLRTypes.InputTypesData;
	/**
	 * Target of the sample to play
	 */
	sampleIndex?:["A"|"B"|"C", "BottomLeft"|"BottomRight"|"TopLeft"|"TopRight"];
}

export const TriggerActionCountDataActionList = ["ADD", "DEL", "SET"] as const;
export type TriggerActionCountDataAction = typeof TriggerActionCountDataActionList[number];
export interface TriggerActionCounterData extends TriggerActionData{
	type:"count";
	/**
	 * Value to add.
	 * Can be a number, an arithmetical operation, placejolders or a bit of all
	 */
	addValue:string;
	/**
	 * Counter IDs to update
	 */
	counters:string[];
	/**
	 * Specifies weither a per-user counter should be updated
	 * based on the user executing the action (@see COUNTER_EDIT_SOURCE_SENDER)
	 * or if everyone should be updated (@see COUNTER_EDIT_SOURCE_EVERYONE)
	 * or a user whose name is stored on a placeholder (string name of the placeholder)
	 */
	counterUserSources:{[key:string]:string};
	/**
	 * Action to execute on the counter's value
	 * Set as optionnal because added afterwards and missing from counters created before that.
	 * Default action to execute if data is missing should be "add"
	 */
	action?:TriggerActionCountDataAction;
}

export interface TriggerActionValueData extends TriggerActionData{
	type:"value";
	/**
	 * New value
	 */
	newValue:string;
	/**
	 * Value IDs to update
	 */
	values:string[];
}

export type TriggerActionRandomDataMode = "list"|"number"|"trigger";
export interface TriggerActionRandomData extends TriggerActionData{
	type:"random";
	mode:TriggerActionRandomDataMode;
	min:number;
	max:number;
	float:boolean;
	placeholder:string;
	list:string[];
	triggers:string[];
	/**
	 * If true, disabled triggers should be skipped when picking
	 * a random one.
	 */
	skipDisabled?:boolean;
	/**
	 * Should the randomly executed trigger be disabled after
	 * its execution?
	 */
	disableAfterExec?:boolean;
}

export interface TriggerActionStreamInfoData extends TriggerActionData{
	type:"stream_infos";
	title:string;
	categoryId:string;
	tags:string[];
	branded?:boolean;
	labels?:{id:string, enabled:boolean}[];
}

export interface TriggerScheduleData {
	type:TriggerScheduleTypesValue|"0";
	repeatDuration:number;
	repeatMinMessages:number;
	dates:{daily:boolean, monthly:boolean, yearly:boolean, value:string}[];
}

export const VIBRATION_PATTERNS = [
	{id:"1", label:"∿_∿", pattern:[110, 50, 110]},
	{id:"2", label:"∿_∿_∿", pattern:[110, 50, 110, 50, 110]},
	{id:"3", label:"∿_∿∿∿∿", pattern:[110, 50, 800]},
	{id:"4", label:"∿_∿_∿_∿_∿", pattern:[110, 50, 110, 50, 110, 50, 110, 50, 110]},
	{id:"5", label:"∿∿∿∿∿∿∿∿", pattern:[1100]},
	{id:"6", label:"∿___∿_∿_∿∿∿", pattern:[110, 400, 110, 50, 110, 50, 400]},
	{id:"7", label:"∿∿∿___∿∿∿___∿∿∿", pattern:[250, 250, 250, 250, 250]},
]

export const TriggerTypes = {
	FIRST_ALL_TIME:"1",
	FIRST_TODAY:"2",
	POLL_RESULT:"3",
	PREDICTION_RESULT:"4",
	RAFFLE_RESULT:"5",
	BINGO_RESULT:"6",
	CHAT_COMMAND:"7",
	SUB:"8",
	SUBGIFT:"9",
	CHEER:"10",
	FOLLOW:"11",
	RAID:"12",
	REWARD_REDEEM:"13",
	TRACK_ADDED_TO_QUEUE:"14",
	MUSIC_START:"24",
	MUSIC_STOP:"25",
	TIMER_START:"15",
	TIMER_STOP:"16",
	COUNTDOWN_START:"17",
	COUNTDOWN_STOP:"18",
	STREAM_INFO_UPDATE:"19",
	EMERGENCY_MODE_START:"20",
	EMERGENCY_MODE_STOP:"21",
	HIGHLIGHT_CHAT_MESSAGE:"22",
	CHAT_ALERT:"23",
	HYPE_TRAIN_COOLDOWN:"45",
	HYPE_TRAIN_APPROACHING:"26",
	HYPE_TRAIN_START:"27",
	HYPE_TRAIN_PROGRESS:"28",
	HYPE_TRAIN_END:"29",
	HYPE_TRAIN_CANCELED:"32",
	RETURNING_USER:"30",
	VOICEMOD:"31",
	TIMEOUT:"34",
	BAN:"35",
	UNBAN:"36",
	VIP:"37",
	UNVIP:"38",
	MOD:"39",
	UNMOD:"40",
	SCHEDULE:"41",
	ANY_MESSAGE:"42",
	COMMUNITY_CHALLENGE_PROGRESS:"43",
	COMMUNITY_CHALLENGE_COMPLETE:"44",
	PRESENTATION:"46",
	SHOUTOUT_IN:"47",
	SHOUTOUT_OUT:"48",
	OBS_SCENE:"49",
	OBS_SOURCE_ON:"50",
	OBS_SOURCE_OFF:"51",
	SHIELD_MODE_ON:"52",
	SHIELD_MODE_OFF:"53",
	PIN_MESSAGE:"54",
	UNPIN_MESSAGE:"55",
	STREAM_ONLINE:"56",
	STREAM_OFFLINE:"57",
	COUNTER_ADD:"58",
	COUNTER_DEL:"59",
	COUNTER_MAXED:"60",
	COUNTER_MINED:"61",
	COUNTER_LOOPED:"62",
	RAID_STARTED:"63",
	SLASH_COMMAND:"64",
	OBS_INPUT_MUTE:"65",
	OBS_INPUT_UNMUTE:"66",
	OBS_PLAYBACK_STARTED:"67",
	OBS_PLAYBACK_ENDED:"68",
	OBS_PLAYBACK_PAUSED:"69",//Not actually used as they require an OBS plugin to be triggered
	OBS_PLAYBACK_RESTARTED:"70",//Not actually used as they require an OBS plugin to be triggered
	OBS_PLAYBACK_NEXT:"71",//Not actually used as they require an OBS plugin to be triggered
	OBS_PLAYBACK_PREVIOUS:"72",//Not actually used as they require an OBS plugin to be triggered
	OBS_FILTER_ON:"73",
	OBS_FILTER_OFF:"74",
	USER_WATCH_STREAK:"75",
	OBS_START_STREAM:"76",
	OBS_STOP_STREAM:"77",
	COUNTER_EDIT:"78",
	HYPE_CHAT:"79",
	FOLLOWED_STREAM_ONLINE:"80",
	FOLLOWED_STREAM_OFFLINE:"81",
	HEAT_CLICK:"82",
	CLIP_CREATED:"83",
	GOXLR_FX_ENABLED:"84",
	GOXLR_FX_DISABLED:"85",
	GOXLR_BUTTON_PRESSED:"86",
	GOXLR_BUTTON_RELEASED:"87",
	GOXLR_SAMPLE_COMPLETE:"88",
	VALUE_UPDATE:"89",
	GOXLR_INPUT_MUTE:"90",
	GOXLR_INPUT_UNMUTE:"91",

	TWITCHAT_AD:"ad",
	TWITCHAT_LIVE_FRIENDS:"live_friends",
	TWITCHAT_SHOUTOUT_QUEUE:"shoutout_queue",
	TWITCHAT_MESSAGE:"twitchat_message",
} as const;
export type TriggerTypesKey = keyof typeof TriggerTypes;
export type TriggerTypesValue = typeof TriggerTypes[TriggerTypesKey];

export interface ITriggerPlaceholder<T> extends TwitchatDataTypes.PlaceholderEntry {
	pointer:Path<T>;
	isUserID:boolean;
	numberParsable:boolean;
	customTag?:boolean;
}

export const USER_PLACEHOLDER:string = "USER";
export const USER_ID_PLACEHOLDER:string = "USER_ID";
export const VALUE_PLACEHOLDER_PREFIX:string = "VALUE_";
export const COUNTER_VALUE_PLACEHOLDER_PREFIX:string = "COUNTER_VALUE_";
export const COUNTER_EDIT_SOURCE_SENDER:string = "SENDER";
export const COUNTER_EDIT_SOURCE_EVERYONE:string = "EVERYONE";

/**
 * Placeholders related to a trigger action type
 */
let actionPlaceholdersCache:Partial<{[key in NonNullable<TriggerActionStringTypes>]:ITriggerPlaceholder<any>[]}>;
export function TriggerActionPlaceholders(key:TriggerActionStringTypes):ITriggerPlaceholder<any>[] {
	if(!key) return [];

	if(actionPlaceholdersCache) {
		return actionPlaceholdersCache[key] ?? [];
	}

	const map:Partial<{[key in NonNullable<TriggerActionStringTypes>]:ITriggerPlaceholder<any>[]}> = {
		//None
	}

	actionPlaceholdersCache = map;
	return map[key] ?? [];
}

/**
 * Cleansup the placeholders cache to force it to be rebuilt next time.
 * This is used by the counters, when changing the placeholder of a counter
 * the cache needs to be rebuilt to get those changes.
 */
export function rebuildPlaceholdersCache():void { eventPlaceholdersCache = undefined };

/**
 * Placeholders related to a trigger event type
 */
let eventPlaceholdersCache:Partial<{[key in TriggerTypesValue]:ITriggerPlaceholder<any>[]}>|undefined;
export function TriggerEventPlaceholders(key:TriggerTypesValue):ITriggerPlaceholder<any>[] {
	if(eventPlaceholdersCache && eventPlaceholdersCache[key]) {
		return eventPlaceholdersCache[key] ?? [];
	}

	const map:Partial<{[key in TriggerTypesValue]:ITriggerPlaceholder<any>[]}> = {};
	//Init all existing triggers to empty placeholder array
	for (const key in TriggerTypes) {
		const trigger = TriggerTypes[key as TriggerTypesKey]
		map[trigger] = [];
	}

	type SafeMessage = Omit<TwitchatDataTypes.MessageChatData, "answers" | "answersTo" | "children">;
	type SafeReward = Omit<TwitchatDataTypes.MessageRewardRedeemData, "children">;

	map[TriggerTypes.ANY_MESSAGE] = 
	map[TriggerTypes.FIRST_TODAY] = 
	map[TriggerTypes.FIRST_ALL_TIME] = 
	map[TriggerTypes.RETURNING_USER] = 
	map[TriggerTypes.PRESENTATION] =
	map[TriggerTypes.CHAT_COMMAND] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<SafeMessage>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
	];

	map[TriggerTypes.HYPE_CHAT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"message.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageHypeChatData, "message"> & {message:SafeMessage}>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"message.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageHypeChatData, "message"> & {message:SafeMessage}>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageHypeChatData, "message"> & {message:SafeMessage}>,
		{tag:"PAID_AMOUNT", descKey:'triggers.placeholders.hype_chat_paid', pointer:"message.twitch_hypeChat.amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageHypeChatData, "message"> & {message:SafeMessage}>,
		{tag:"PAID_CURRENCY", descKey:'triggers.placeholders.hype_chat_currency', pointer:"message.twitch_hypeChat.currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageHypeChatData, "message"> & {message:SafeMessage}>,
		{tag:"PAID_LEVEL", descKey:'triggers.placeholders.hype_chat_level', pointer:"message.twitch_hypeChat.level", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageHypeChatData, "message"> & {message:SafeMessage}>,
		{tag:"PIN_DURATION", descKey:'triggers.placeholders.hype_chat_duration', pointer:"message.twitch_hypeChat.duration_s", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageHypeChatData, "message"> & {message:SafeMessage}>,
	];

	//Clone to break reference and add chat command specific placeholder
	map[TriggerTypes.CHAT_COMMAND] = JSON.parse(JSON.stringify(map[TriggerTypes.CHAT_COMMAND]))
	map[TriggerTypes.CHAT_COMMAND]!.push(
		{tag:"COMMAND", descKey:'triggers.placeholders.command', pointer:"__command__", numberParsable:true, isUserID:false},
	)
	
	map[TriggerTypes.PIN_MESSAGE] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"chatMessage.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"chatMessage.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"chatMessage.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:"MODERATOR", descKey:'triggers.placeholders.pinned_by', pointer:"moderator.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:"MODERATOR_ID", descKey:'triggers.placeholders.pinned_by_id', pointer:"moderator.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
	];

	map[TriggerTypes.UNPIN_MESSAGE] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"chatMessage.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"chatMessage.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"chatMessage.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
	];
	
	map[TriggerTypes.POLL_RESULT] = [
		{tag:"TITLE", descKey:'triggers.placeholders.poll_title', pointer:"title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePollData>,
		{tag:"WIN", descKey:'triggers.placeholders.poll_win', pointer:"winner.label", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePollData>,
	];
	
	map[TriggerTypes.PREDICTION_RESULT] = [
		{tag:"TITLE", descKey:'triggers.placeholders.prediction_title', pointer:"title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
		{tag:"WIN", descKey:'triggers.placeholders.prediction_win', pointer:"winner.label", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
		{tag:"TOTAL_POINTS", descKey:'triggers.placeholders.prediction_points', pointer:"totalPoints", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
		{tag:"TOTAL_USERS", descKey:'triggers.placeholders.prediction_users', pointer:"totalUsers", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
		{tag:"WINNING_USERS", descKey:'triggers.placeholders.prediction_users_win', pointer:"winner.voters", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
	];
	
	map[TriggerTypes.BINGO_RESULT] = [
		{tag:"WINNER", descKey:'triggers.placeholders.winner', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoData>,
		{tag:"WIN_VALUE", descKey:'triggers.placeholders.winner', pointer:"bingoData.numberValue", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoData>,
	];
	
	map[TriggerTypes.RAFFLE_RESULT] = [
		{tag:"WINNER", descKey:'triggers.placeholders.winner', pointer:"winner.label", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaffleData>,
	];
	
	map[TriggerTypes.SUB] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"SUB_TIER", descKey:'triggers.placeholders.sub_tier', pointer:"tier", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.sub_message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MONTHS_TOTAL", descKey:'triggers.placeholders.sub_months_total', pointer:"totalSubDuration", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MONTHS_PREPAID", descKey:'triggers.placeholders.sub_months_prepaid', pointer:"months", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MONTHS_STREAK", descKey:'triggers.placeholders.sub_months_streak', pointer:"streakMonths", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
	];
	
	map[TriggerTypes.SUBGIFT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.sub_gifter', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"RECIPIENTS", descKey:'triggers.placeholders.sub_gift_recipient', pointer:"gift_recipients.0.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"RECIPIENTS_ID", descKey:'triggers.placeholders.sub_gift_recipient_id', pointer:"gift_recipients.0.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"SUB_TIER", descKey:'triggers.placeholders.sub_tier', pointer:"tier", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MONTHS_PREPAID", descKey:'triggers.placeholders.sub_months_prepaid', pointer:"months", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"GIFT_COUNT", descKey:'triggers.placeholders.sub_gift_count', pointer:"gift_count", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
	];
	
	map[TriggerTypes.CHEER] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:"BITS", descKey:'triggers.placeholders.bits', pointer:"bits", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
	];
	
	map[TriggerTypes.FOLLOW] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageFollowingData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageFollowingData>,
	];
	
	map[TriggerTypes.RAID] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"VIEWERS", descKey:'triggers.placeholders.stream_viewers', pointer:"viewers", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"DURATION", descKey:'triggers.placeholders.stream_duration', pointer:"stream.duration", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"WAS_LIVE", descKey:'triggers.placeholders.stream_live', pointer:"stream.wasLive", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
	];
	
	map[TriggerTypes.RAID_STARTED] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
	];
	
	map[TriggerTypes.SHOUTOUT_IN] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.shoutout_in', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:"AVATAR", descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
	];
	map[TriggerTypes.SHOUTOUT_OUT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.shoutout_out', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:"USER_STREAM_TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:"USER_STREAM_CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
	];
	
	map[TriggerTypes.REWARD_REDEEM] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<SafeReward>,
		{tag:"TITLE", descKey:'triggers.placeholders.reward_title', pointer:"reward.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:"DESCRIPTION", descKey:'triggers.placeholders.reward_description', pointer:"reward.description", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:"COST", descKey:'triggers.placeholders.reward_cost', pointer:"reward.cost", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:"MESSAGE", descKey:"triggers.placeholders.reward_message", pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeReward>,
	];
	
	map[TriggerTypes.TRACK_ADDED_TO_QUEUE] = [
		{tag:"ADDED_TRACK_ARTIST", descKey:'triggers.placeholders.track_added_artist', pointer:"trackAdded.artist", numberParsable:false, isUserID:false, example:"Mitchiri Neko"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_TITLE", descKey:'triggers.placeholders.track_added_title', pointer:"trackAdded.title", numberParsable:false, isUserID:false, example:"Mitchiri Neko march"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_ALBUM", descKey:'triggers.placeholders.track_added_album', pointer:"trackAdded.album", numberParsable:false, isUserID:false, example:"Fake Album"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_COVER", descKey:'triggers.placeholders.track_added_cover', pointer:"trackAdded.cover", numberParsable:false, isUserID:false, example:StoreProxy.image("img/musicExampleCover.jpg")} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_URL", descKey:'triggers.placeholders.track_added_url', pointer:"trackAdded.url", numberParsable:false, isUserID:false, example:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=deddb27b6b6148a6"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
	];
	
	map[TriggerTypes.STREAM_INFO_UPDATE] = [
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamInfoUpdate>,
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamInfoUpdate>,
	];
	
	map[TriggerTypes.HIGHLIGHT_CHAT_MESSAGE] = [
		{tag:"AVATAR", descKey:'triggers.placeholders.user_avatar', pointer:"info.user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"info.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"info.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"info.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
	];
	
	map[TriggerTypes.CHAT_ALERT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"message.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"message.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
		{tag:"ALERT", descKey:'triggers.placeholders.message', pointer:"message.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
	];
	
	map[TriggerTypes.HYPE_TRAIN_START] = 
	map[TriggerTypes.HYPE_TRAIN_PROGRESS] =
		map[TriggerTypes.HYPE_TRAIN_END] = [
		{tag:"LEVEL", descKey:'triggers.placeholders.train_level', pointer:"level", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHypeTrainEventData>,
		{tag:"PERCENT", descKey:'triggers.placeholders.train_percent', pointer:"percent", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHypeTrainEventData>,
	];

	map[TriggerTypes.VOICEMOD] = [
		{tag:"VOICE_ID", descKey:'triggers.placeholders.voicemod_voice', pointer:"voiceID", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageVoicemodData>,
	];

	map[TriggerTypes.TIMEOUT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
		{tag:"DURATION", descKey:'triggers.placeholders.timer_duration', pointer:"duration_s", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
	];
	
	map[TriggerTypes.TIMER_START] = [
		{tag:"START_DATE", descKey:'triggers.placeholders.start_date', pointer:"timer.startAt", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTimerData>,
	];
	map[TriggerTypes.TIMER_STOP] = [
		{tag:"START_DATE", descKey:'triggers.placeholders.start_date', pointer:"timer.startAt", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTimerData>,
		{tag:"DURATION", descKey:'triggers.placeholders.timer_duration', pointer:"timer.duration", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTimerData>,
		{tag:"DURATION_MS", descKey:'triggers.placeholders.timer_duration_ms', pointer:"timer.duration_ms", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTimerData>,
	];

	map[TriggerTypes.COUNTDOWN_START] = [
		{tag:"START_AT", descKey:'triggers.placeholders.start_date', pointer:"countdown.startAt", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
		{tag:"DURATION", descKey:'triggers.placeholders.countdown_duration_formated', pointer:"countdown.finalDuration", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
		{tag:"DURATION_MS", descKey:'triggers.placeholders.countdown_duration_ms', pointer:"countdown.finalDuration_ms", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
	]; 
	map[TriggerTypes.COUNTDOWN_STOP] = JSON.parse(JSON.stringify(map[TriggerTypes.COUNTDOWN_START]));
	map[TriggerTypes.COUNTDOWN_STOP]!.push(
		{tag:"END_AT", descKey:'triggers.placeholders.countdown_end_date', pointer:"countdown.endAt", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
	)

	map[TriggerTypes.VIP] = 
	map[TriggerTypes.UNVIP] = 
	map[TriggerTypes.MOD] = 
	map[TriggerTypes.UNMOD] = 
	map[TriggerTypes.UNBAN] = 
	map[TriggerTypes.BAN] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageModerationAction>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageModerationAction>,
	];
	
	map[TriggerTypes.FOLLOWED_STREAM_ONLINE] =
	map[TriggerTypes.FOLLOWED_STREAM_OFFLINE] = 
	map[TriggerTypes.STREAM_ONLINE] =
	map[TriggerTypes.STREAM_OFFLINE] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"info.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"info.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"info.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"info.category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
	];
	
	
	map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE] = [
		{tag:"TITLE", descKey:'triggers.placeholders.challenge_title', pointer:"challenge.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:"DESCRIPTION", descKey:'triggers.placeholders.challenge_description', pointer:"challenge.description", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:"GOAL", descKey:'triggers.placeholders.challenge_goal', pointer:"challenge.goal", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
	];

	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS] = JSON.parse(JSON.stringify(map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE]));
	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS]!.push(
		{tag:"PROGRESS", descKey:'triggers.placeholders.challenge_current', pointer:"challenge.progress", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:"CONTRIBUTION", descKey:'triggers.placeholders.challenge_contribution', pointer:"contribution", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:"CONTRIBUTION_TOTAL", descKey:'triggers.placeholders.challenge_contribution_total', pointer:"total_contribution", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
	);
	
	map[TriggerTypes.COUNTER_EDIT] =
	map[TriggerTypes.COUNTER_ADD] =
	map[TriggerTypes.COUNTER_DEL] =
	map[TriggerTypes.COUNTER_LOOPED] =
	map[TriggerTypes.COUNTER_MINED] =
	map[TriggerTypes.COUNTER_MAXED] = [
		{tag:"NAME", descKey:'triggers.placeholders.counter_name', pointer:"counter.name", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:"VALUE", descKey:'triggers.placeholders.counter_value', pointer:"value", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:"UPDATE", descKey:'triggers.placeholders.counter_update', pointer:"added", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:"UPDATE_ABS", descKey:'triggers.placeholders.counter_update_abs', pointer:"added_abs", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.counter_username', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.counter_userid', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
	];

	map[TriggerTypes.VALUE_UPDATE] = [
		{tag:"VALUE_NAME", descKey:'triggers.placeholders.value_name', pointer:"value.name", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageValueUpdateData>,
		{tag:"NEW_VALUE", descKey:'triggers.placeholders.new_value', pointer:"newValue", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageValueUpdateData>,
		{tag:"OLD_VALUE", descKey:'triggers.placeholders.old_value', pointer:"oldValue", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageValueUpdateData>,
	];

	map[TriggerTypes.SLASH_COMMAND] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<SafeMessage>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:"COMMAND", descKey:'triggers.placeholders.command', pointer:"__command__", numberParsable:true, isUserID:false},
	];

	map[TriggerTypes.USER_WATCH_STREAK] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
		{tag:"STREAK_COUNT", descKey:'triggers.placeholders.watch_streak', pointer:"streak", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
	];

	map[TriggerTypes.OBS_SCENE] = [
		{tag:"NEW_SCENE_NAME", descKey:'triggers.placeholders.obs_scene_name', pointer:"sceneName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageOBSSceneChangedData>,
		{tag:"PREVIOUS_SCENE_NAME", descKey:'triggers.placeholders.obs_scene_name_previous', pointer:"previousSceneName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageOBSSceneChangedData>,
	];

	map[TriggerTypes.HEAT_CLICK] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.login", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"USER_ANONYMOUS", descKey:'triggers.placeholders.heat_anonymous', pointer:"anonymous", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"COORD_X", descKey:'triggers.placeholders.heat_coord_x', pointer:"coords.x", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"COORD_Y", descKey:'triggers.placeholders.heat_coord_y', pointer:"coords.y", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"KEY_ALT", descKey:'triggers.placeholders.heat_key_alt', pointer:"alt", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"KEY_SHIFT", descKey:'triggers.placeholders.heat_key_shift', pointer:"shift", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"KEY_CTRL", descKey:'triggers.placeholders.heat_key_ctrl', pointer:"ctrl", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
	];

	map[TriggerTypes.CLIP_CREATED] = [
		{tag:"CLIP", descKey:'triggers.placeholders.clip_url', pointer:"clipUrl", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageClipCreate>,
	];

	map[TriggerTypes.GOXLR_FX_DISABLED] =
	map[TriggerTypes.GOXLR_FX_ENABLED] = [
		{tag:"PRESET_INDEX", descKey:'triggers.placeholders.goxlr_preset_index', pointer:"fxIndex", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoXLRFXEnableChangeData>,
		{tag:"FX_ENABLED", descKey:'triggers.placeholders.goxlr_fxenabled', pointer:"enabled", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoXLRFXEnableChangeData>,
	];

	map[TriggerTypes.GOXLR_BUTTON_PRESSED] =
	map[TriggerTypes.GOXLR_BUTTON_RELEASED] = [
		{tag:"BUTTON_ID", descKey:'triggers.placeholders.goxlr_button_id', pointer:"button", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoXLRButtonData>,
	];

	map[TriggerTypes.GOXLR_INPUT_MUTE] =
	map[TriggerTypes.GOXLR_INPUT_UNMUTE] = [
		{tag:"FADER_INDEX", descKey:'triggers.placeholders.goxlr_fader_index', pointer:"faderIndex", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoXLRSoundInputData>,
	];

	const counters = StoreProxy.counters.counterList;
	const counterPlaceholders:ITriggerPlaceholder<any>[] = [];
	for (let i = 0; i < counters.length; i++) {
		const c = counters[i];
		if(c.placeholderKey) {
			counterPlaceholders.push({category:"counter", tag:COUNTER_VALUE_PLACEHOLDER_PREFIX + c.placeholderKey.toUpperCase(), descKey:'triggers.placeholders.counter_global_value', descReplacedValues:{"NAME":c.name}, pointer:"__counter__.value", numberParsable:true, isUserID:false, globalTag:true, example:(c.value || 123).toString()});
		}
	}

	const values = StoreProxy.values.valueList;
	const valuePlaceholders:ITriggerPlaceholder<any>[] = [];
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		if(v.placeholderKey) {
			valuePlaceholders.push({category:"value", tag:VALUE_PLACEHOLDER_PREFIX + v.placeholderKey.toUpperCase(), descKey:'triggers.placeholders.value_global_value', descReplacedValues:{"NAME":v.name}, pointer:"__value__.value", numberParsable:true, isUserID:false, globalTag:true, example:"Lorem ipsum"});
		}
	}
	
	//Add global placeholders where missing
	let k!:TriggerTypesValue;
	for (k in map) {
		let entry = map[k]!;
		if(entry.findIndex(v=>v.tag == "MY_STREAM_TITLE") == -1) {
			entry.push({category:"stream", tag:"MY_STREAM_TITLE", descKey:'triggers.placeholders.my_stream_title', pointer:"__my_stream__.title", numberParsable:false, isUserID:false, globalTag:true, example:"Talking about stuff"});
		}
		
		if(entry.findIndex(v=>v.tag == "MY_STREAM_CATEGORY") == -1) {
			entry.push({category:"stream", tag:"MY_STREAM_CATEGORY", descKey:'triggers.placeholders.my_stream_category', pointer:"__my_stream__.category", numberParsable:false, isUserID:false, globalTag:true, example:"Just chatting"});
		}
		
		if(entry.findIndex(v=>v.tag == "VIEWER_COUNT") == -1) {
			entry.push({category:"stream", tag:"VIEWER_COUNT", descKey:"triggers.placeholders.viewer_count", pointer:"__my_stream__.viewers", numberParsable:true, isUserID:false, globalTag:true, example:"333"});
		}

		if(entry.findIndex(v=>v.tag == "ULULE_CAMPAIGN_NAME") == -1) {
			entry.push({tag:"ULULE_CAMPAIGN_NAME", descKey:'triggers.placeholders.ulule_campaign_name', pointer:"__ulule__.name", numberParsable:false, isUserID:false, globalTag:true, example:"My ulule campaign"});
		}

		if(entry.findIndex(v=>v.tag == "ULULE_CAMPAIGN_URL") == -1) {
			entry.push({tag:"ULULE_CAMPAIGN_URL", descKey:'triggers.placeholders.ulule_campaign_url', pointer:"__ulule__.url", numberParsable:false, isUserID:false, globalTag:true, example:"https://ulule.com"});
		}

		if(entry.findIndex(v=>v.tag == "TRIGGER_NAME") == -1) {
			entry.push({tag:"TRIGGER_NAME", descKey:"triggers.placeholders.trigger_name", pointer:"__trigger__.name", numberParsable:false, isUserID:false, globalTag:true, example:"My trigger"});
		}
		
		if(entry.findIndex(v=>v.tag == "OBS_SCENE") == -1) {
			entry.push({tag:"OBS_SCENE", descKey:"triggers.placeholders.obs_scene", pointer:"__obs__.scene", numberParsable:false, isUserID:false, globalTag:true, example:"OBS scene"});
		}
		
		if(entry.findIndex(v=>v.tag == "TIMER_VALUE") == -1) {
			entry.push({category:"timer", tag:"TIMER", descKey:"triggers.placeholders.timer_value", pointer:"__timer__.value", numberParsable:true, isUserID:false, globalTag:true, example:"123"});
			entry.push({category:"timer", tag:"TIMER_F", descKey:"triggers.placeholders.timer_value_formated", pointer:"__timer__.value_formated", numberParsable:false, isUserID:false, globalTag:true, example:"1:23"});
		}
		
		if(entry.findIndex(v=>v.tag == "COUNTDOWN_VALUE") == -1) {
			entry.push({category:"timer", tag:"COUNTDOWN_VALUE", descKey:"triggers.placeholders.countdown_value", pointer:"__countdown__.value", numberParsable:true, isUserID:false, globalTag:true, example:"123"});
			entry.push({category:"timer", tag:"COUNTDOWN_VALUE_F", descKey:"triggers.placeholders.countdown_value_formated", pointer:"__countdown__.value_formated", numberParsable:false, isUserID:false, globalTag:true, example:"1:23"});
			entry.push({category:"timer", tag:"COUNTDOWN_DURATION", descKey:"triggers.placeholders.countdown_duration", pointer:"__countdown__.duration", numberParsable:true, isUserID:false, globalTag:true, example:"123"});
			entry.push({category:"timer", tag:"COUNTDOWN_DURATION_F", descKey:"triggers.placeholders.countdown_duration_formated", pointer:"__countdown__.duration_formated", numberParsable:false, isUserID:false, globalTag:true, example:"1:23"});
		}
		
		//If a music service is available, concat the music service helpers
		if(SpotifyHelper.instance.connected) {
			entry.push(
				{category:"music", tag:"CURRENT_TRACK_ARTIST", descKey:'triggers.placeholders.track_artist', pointer:"__current_track__.artist", numberParsable:false, isUserID:false, globalTag:true, example:"Mitchiri Neko"},
				{category:"music", tag:"CURRENT_TRACK_TITLE", descKey:'triggers.placeholders.track_title', pointer:"__current_track__.title", numberParsable:false, isUserID:false, globalTag:true, example:"Mitchiri Neko march"},
				{category:"music", tag:"CURRENT_TRACK_ALBUM", descKey:'triggers.placeholders.track_album', pointer:"__current_track__.album", numberParsable:false, isUserID:false, globalTag:true, example:"Fake Album"},
				{category:"music", tag:"CURRENT_TRACK_COVER", descKey:'triggers.placeholders.track_cover', pointer:"__current_track__.cover", numberParsable:false, isUserID:false, globalTag:true, example:StoreProxy.image("img/musicExampleCover.jpg")},
				{category:"music", tag:"CURRENT_TRACK_URL", descKey:'triggers.placeholders.track_url', pointer:"__current_track__.url", numberParsable:false, isUserID:false, globalTag:true, example:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=deddb27b6b6148a6"}
			);
		}

		//If a goxlr is connected concat available placeholder
		if(GoXLRSocket.instance.connected) {
			entry.push(
				{category:"goxlr", tag:"GOXLR_COUGH", descKey:'triggers.placeholders.goxlr_cough', pointer:"__goxlr__.cough", numberParsable:false, isUserID:false, globalTag:true, example:"true"},
				{category:"goxlr", tag:"GOXLR_PROFILE", descKey:'triggers.placeholders.goxlr_profile', pointer:"__goxlr__.profile", numberParsable:false, isUserID:false, globalTag:true, example:"true"},
				{category:"goxlr", tag:"GOXLR_INPUT_MIC", descKey:'triggers.placeholders.goxlr_input_mic', pointer:"__goxlr__.input.mic", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_CHAT", descKey:'triggers.placeholders.goxlr_input_chat', pointer:"__goxlr__.input.chat", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_MUSIC", descKey:'triggers.placeholders.goxlr_input_music', pointer:"__goxlr__.input.music", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_GAME", descKey:'triggers.placeholders.goxlr_input_game', pointer:"__goxlr__.input.game", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_CONSOLE", descKey:'triggers.placeholders.goxlr_input_console', pointer:"__goxlr__.input.console", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_LINEIN", descKey:'triggers.placeholders.goxlr_input_linein', pointer:"__goxlr__.input.linein", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_SYSTEM", descKey:'triggers.placeholders.goxlr_input_system', pointer:"__goxlr__.input.system", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_SAMPLE", descKey:'triggers.placeholders.goxlr_input_sample', pointer:"__goxlr__.input.sample", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_FX_ENABLED", descKey:'triggers.placeholders.goxlr_fx_state', pointer:"__goxlr__.fx.enabled", numberParsable:true, isUserID:false, globalTag:true, example:"true"},
				{category:"goxlr", tag:"GOXLR_FX_PRESET", descKey:'triggers.placeholders.goxlr_fx_preset', pointer:"__goxlr__.fx.preset", numberParsable:false, isUserID:false, globalTag:true, example:"3"},
				{category:"goxlr", tag:"GOXLR_FX_MEGAPHONE", descKey:'triggers.placeholders.goxlr_megaphone', pointer:"__goxlr__.fx.megaphone", numberParsable:false, isUserID:false, globalTag:true, example:"true"},
				{category:"goxlr", tag:"GOXLR_FX_ROBOT", descKey:'triggers.placeholders.goxlr_robot', pointer:"__goxlr__.fx.robot", numberParsable:false, isUserID:false, globalTag:true, example:"true"},
				{category:"goxlr", tag:"GOXLR_FX_HARDTUNE", descKey:'triggers.placeholders.goxlr_hardtune', pointer:"__goxlr__.fx.hardtune", numberParsable:false, isUserID:false, globalTag:true, example:"true"},
				{category:"goxlr", tag:"GOXLR_FX_REVERB", descKey:'triggers.placeholders.goxlr_reverb', pointer:"__goxlr__.fx.reverb", numberParsable:false, isUserID:false, globalTag:true, example:"12"},
				{category:"goxlr", tag:"GOXLR_FX_PITCH", descKey:'triggers.placeholders.goxlr_pitch', pointer:"__goxlr__.fx.pitch", numberParsable:false, isUserID:false, globalTag:true, example:"-5"},
				{category:"goxlr", tag:"GOXLR_FX_ECHO", descKey:'triggers.placeholders.goxlr_echo', pointer:"__goxlr__.fx.echo", numberParsable:false, isUserID:false, globalTag:true, example:"50"},
				{category:"goxlr", tag:"GOXLR_FX_GENDER", descKey:'triggers.placeholders.goxlr_gender', pointer:"__goxlr__.fx.gender", numberParsable:false, isUserID:false, globalTag:true, example:"-12"},
				{category:"goxlr", tag:"GOXLR_FADER_1_MUTE", descKey:'triggers.placeholders.goxlr_fader_1_mute', pointer:"__goxlr__.fader.a", numberParsable:false, isUserID:false, globalTag:true, example:"false"},
				{category:"goxlr", tag:"GOXLR_FADER_2_MUTE", descKey:'triggers.placeholders.goxlr_fader_2_mute', pointer:"__goxlr__.fader.b", numberParsable:false, isUserID:false, globalTag:true, example:"false"},
				{category:"goxlr", tag:"GOXLR_FADER_3_MUTE", descKey:'triggers.placeholders.goxlr_fader_3_mute', pointer:"__goxlr__.fader.c", numberParsable:false, isUserID:false, globalTag:true, example:"false"},
				{category:"goxlr", tag:"GOXLR_FADER_4_MUTE", descKey:'triggers.placeholders.goxlr_fader_4_mute', pointer:"__goxlr__.fader.d", numberParsable:false, isUserID:false, globalTag:true, example:"false"},
			);
		}

		entry = entry.concat(counterPlaceholders);
		entry = entry.concat(valuePlaceholders);
		map[k] = entry;
	}

	eventPlaceholdersCache = map;
	return map[key] ?? [];
}

/**
 * All trigger types details sorted by categories
 * Their order is reflected on the frontend
 */
let eventsCache:TriggerTypeDefinition[];
export function TriggerTypesDefinitionList():TriggerTypeDefinition[] {
	if(eventsCache) return eventsCache;
	eventsCache = [
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"emergency", labelKey:"triggers.events.EMERGENCY_MODE_START.label", value:TriggerTypes.EMERGENCY_MODE_START, descriptionKey:"triggers.events.EMERGENCY_MODE_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"emergency", labelKey:"triggers.events.EMERGENCY_MODE_STOP.label", value:TriggerTypes.EMERGENCY_MODE_STOP, descriptionKey:"triggers.events.EMERGENCY_MODE_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"highlight", labelKey:"triggers.events.HIGHLIGHT_CHAT_MESSAGE.label", value:TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, descriptionKey:"triggers.events.HIGHLIGHT_CHAT_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"alert", labelKey:"triggers.events.CHAT_ALERT.label", value:TriggerTypes.CHAT_ALERT, descriptionKey:"triggers.events.CHAT_ALERT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"commands", labelKey:"triggers.events.SLASH_COMMAND.label", value:TriggerTypes.SLASH_COMMAND, descriptionKey:"triggers.events.SLASH_COMMAND.description"},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"chatCommand", labelKey:"triggers.events.CHAT_COMMAND.label", value:TriggerTypes.CHAT_COMMAND, isCategory:true, descriptionKey:"triggers.events.CHAT_COMMAND.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE, noToggle:true},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", labelKey:"triggers.events.ANY_MESSAGE.label", value:TriggerTypes.ANY_MESSAGE, descriptionKey:"triggers.events.ANY_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", labelKey:"triggers.events.REWARD_REDEEM.label", value:TriggerTypes.REWARD_REDEEM, isCategory:true, descriptionKey:"triggers.events.REWARD_REDEEM.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.REWARD, noToggle:true},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", labelKey:"triggers.events.COMMUNITY_CHALLENGE_PROGRESS.label", value:TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS, descriptionKey:"triggers.events.COMMUNITY_CHALLENGE_PROGRESS.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", labelKey:"triggers.events.COMMUNITY_CHALLENGE_COMPLETE.label", value:TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE, descriptionKey:"triggers.events.COMMUNITY_CHALLENGE_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
		{category:TriggerEventTypeCategories.USER, icon:"firstTime", labelKey:"triggers.events.FIRST_ALL_TIME.label", value:TriggerTypes.FIRST_ALL_TIME, descriptionKey:"triggers.events.FIRST_ALL_TIME.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"firstTime", labelKey:"triggers.events.FIRST_TODAY.label", value:TriggerTypes.FIRST_TODAY, descriptionKey:"triggers.events.FIRST_TODAY.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"returning", labelKey:"triggers.events.RETURNING_USER.label", value:TriggerTypes.RETURNING_USER, descriptionKey:"triggers.events.RETURNING_USER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE, disabled:true, disabledReasonLabelKey:"triggers.events.RETURNING_USER.disabled_reason"},
		{category:TriggerEventTypeCategories.USER, icon:"presentation", labelKey:"triggers.events.PRESENTATION.label", value:TriggerTypes.PRESENTATION, descriptionKey:"triggers.events.PRESENTATION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"follow", labelKey:"triggers.events.FOLLOW.label", value:TriggerTypes.FOLLOW, descriptionKey:"triggers.events.FOLLOW.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.FOLLOWING},
		{category:TriggerEventTypeCategories.USER, icon:"raid", labelKey:"triggers.events.RAID.label", value:TriggerTypes.RAID, descriptionKey:"triggers.events.RAID.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAID},
		{category:TriggerEventTypeCategories.USER, icon:"watchStreak", labelKey:"triggers.events.USER_WATCH_STREAK.label", value:TriggerTypes.USER_WATCH_STREAK, descriptionKey:"triggers.events.USER_WATCH_STREAK.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK},
		{category:TriggerEventTypeCategories.GAMES, icon:"poll", labelKey:"triggers.events.POLL_RESULT.label", value:TriggerTypes.POLL_RESULT, descriptionKey:"triggers.events.POLL_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.POLL},
		{category:TriggerEventTypeCategories.GAMES, icon:"prediction", labelKey:"triggers.events.PREDICTION_RESULT.label", value:TriggerTypes.PREDICTION_RESULT, descriptionKey:"triggers.events.PREDICTION_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.PREDICTION},
		{category:TriggerEventTypeCategories.GAMES, icon:"ticket", labelKey:"triggers.events.RAFFLE_RESULT.label", value:TriggerTypes.RAFFLE_RESULT, descriptionKey:"triggers.events.RAFFLE_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAFFLE},
		{category:TriggerEventTypeCategories.GAMES, icon:"bingo", labelKey:"triggers.events.BINGO_RESULT.label", value:TriggerTypes.BINGO_RESULT, descriptionKey:"triggers.events.BINGO_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO},
		{category:TriggerEventTypeCategories.SUBITS, icon:"sub", labelKey:"triggers.events.SUB.label", value:TriggerTypes.SUB, descriptionKey:"triggers.events.SUB.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
		{category:TriggerEventTypeCategories.SUBITS, icon:"gift", labelKey:"triggers.events.SUBGIFT.label", value:TriggerTypes.SUBGIFT, descriptionKey:"triggers.events.SUBGIFT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
		{category:TriggerEventTypeCategories.SUBITS, icon:"bits", labelKey:"triggers.events.CHEER.label", value:TriggerTypes.CHEER, descriptionKey:"triggers.events.CHEER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHEER},
		{newDate:1693519200000, category:TriggerEventTypeCategories.SUBITS, icon:"hypeChat", labelKey:"triggers.events.HYPE_CHAT.label", value:TriggerTypes.HYPE_CHAT, descriptionKey:"triggers.events.HYPE_CHAT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_APPROACHING.label", value:TriggerTypes.HYPE_TRAIN_APPROACHING, descriptionKey:"triggers.events.HYPE_TRAIN_APPROACHING.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_START.label", value:TriggerTypes.HYPE_TRAIN_START, descriptionKey:"triggers.events.HYPE_TRAIN_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_PROGRESS.label", value:TriggerTypes.HYPE_TRAIN_PROGRESS, descriptionKey:"triggers.events.HYPE_TRAIN_PROGRESS.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_END.label", value:TriggerTypes.HYPE_TRAIN_END, descriptionKey:"triggers.events.HYPE_TRAIN_END.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_CANCELED.label", value:TriggerTypes.HYPE_TRAIN_CANCELED, descriptionKey:"triggers.events.HYPE_TRAIN_CANCELED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_COOLDOWN.label", value:TriggerTypes.HYPE_TRAIN_COOLDOWN, descriptionKey:"triggers.events.HYPE_TRAIN_COOLDOWN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN},
		{category:TriggerEventTypeCategories.MOD, icon:"info", labelKey:"triggers.events.STREAM_INFO_UPDATE.label", value:TriggerTypes.STREAM_INFO_UPDATE, descriptionKey:"triggers.events.STREAM_INFO_UPDATE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE},
		{category:TriggerEventTypeCategories.MOD, icon:"shoutout", labelKey:"triggers.events.SHOUTOUT_OUT.label", value:TriggerTypes.SHOUTOUT_OUT, descriptionKey:"triggers.events.SHOUTOUT_OUT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
		{category:TriggerEventTypeCategories.MOD, icon:"shoutout", labelKey:"triggers.events.SHOUTOUT_IN.label", value:TriggerTypes.SHOUTOUT_IN, descriptionKey:"triggers.events.SHOUTOUT_IN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
		{category:TriggerEventTypeCategories.MOD, icon:"shield", labelKey:"triggers.events.SHIELD_MODE_ON.label", value:TriggerTypes.SHIELD_MODE_ON, descriptionKey:"triggers.events.SHIELD_MODE_ON.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE},
		{category:TriggerEventTypeCategories.MOD, icon:"shield", labelKey:"triggers.events.SHIELD_MODE_OFF.label", value:TriggerTypes.SHIELD_MODE_OFF, descriptionKey:"triggers.events.SHIELD_MODE_OFF.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE},
		{category:TriggerEventTypeCategories.MOD, icon:"pin", labelKey:"triggers.events.PIN_MESSAGE.label", value:TriggerTypes.PIN_MESSAGE, descriptionKey:"triggers.events.PIN_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.PINNED},
		{category:TriggerEventTypeCategories.MOD, icon:"pin", labelKey:"triggers.events.UNPIN_MESSAGE.label", value:TriggerTypes.UNPIN_MESSAGE, descriptionKey:"triggers.events.UNPIN_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.UNPINNED},
		{category:TriggerEventTypeCategories.MOD, icon:"timeout", labelKey:"triggers.events.TIMEOUT.label", value:TriggerTypes.TIMEOUT, descriptionKey:"triggers.events.TIMEOUT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BAN},
		{category:TriggerEventTypeCategories.MOD, icon:"ban", labelKey:"triggers.events.BAN.label", value:TriggerTypes.BAN, descriptionKey:"triggers.events.BAN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BAN},
		{category:TriggerEventTypeCategories.MOD, icon:"unban", labelKey:"triggers.events.UNBAN.label", value:TriggerTypes.UNBAN, descriptionKey:"triggers.events.UNBAN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.UNBAN},
		{category:TriggerEventTypeCategories.MOD, icon:"vip", labelKey:"triggers.events.VIP.label", value:TriggerTypes.VIP, descriptionKey:"triggers.events.VIP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.VIP},
		{category:TriggerEventTypeCategories.MOD, icon:"unvip", labelKey:"triggers.events.UNVIP.label", value:TriggerTypes.UNVIP, descriptionKey:"triggers.events.UNVIP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNVIP},
		{category:TriggerEventTypeCategories.MOD, icon:"mod", labelKey:"triggers.events.MOD.label", value:TriggerTypes.MOD, descriptionKey:"triggers.events.MOD.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.MOD},
		{category:TriggerEventTypeCategories.MOD, icon:"unmod", labelKey:"triggers.events.UNMOD.label", value:TriggerTypes.UNMOD, descriptionKey:"triggers.events.UNMOD.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNMOD},
		{category:TriggerEventTypeCategories.MOD, icon:"raid", labelKey:"triggers.events.RAID_STARTED.label", value:TriggerTypes.RAID_STARTED, descriptionKey:"triggers.events.RAID_STARTED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAID_STARTED},
		{category:TriggerEventTypeCategories.MOD, icon:"clip", labelKey:"triggers.events.CLIP_CREATED.label", value:TriggerTypes.CLIP_CREATED, descriptionKey:"triggers.events.CLIP_CREATED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE},
		{category:TriggerEventTypeCategories.TIMER, icon:"date", labelKey:"triggers.events.SCHEDULE.label", value:TriggerTypes.SCHEDULE, descriptionKey:"triggers.events.SCHEDULE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.GENERIC},
		{category:TriggerEventTypeCategories.TIMER, icon:"timer", labelKey:"triggers.events.TIMER_START.label", value:TriggerTypes.TIMER_START, descriptionKey:"triggers.events.TIMER_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
		{category:TriggerEventTypeCategories.TIMER, icon:"timer", labelKey:"triggers.events.TIMER_STOP.label", value:TriggerTypes.TIMER_STOP, descriptionKey:"triggers.events.TIMER_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
		{category:TriggerEventTypeCategories.TIMER, icon:"countdown", labelKey:"triggers.events.COUNTDOWN_START.label", value:TriggerTypes.COUNTDOWN_START, descriptionKey:"triggers.events.COUNTDOWN_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
		{category:TriggerEventTypeCategories.TIMER, icon:"countdown", labelKey:"triggers.events.COUNTDOWN_STOP.label", value:TriggerTypes.COUNTDOWN_STOP, descriptionKey:"triggers.events.COUNTDOWN_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
		{category:TriggerEventTypeCategories.OBS, icon:"list", labelKey:"triggers.events.OBS_SCENE.label", value:TriggerTypes.OBS_SCENE, descriptionKey:"triggers.events.OBS_SCENE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE},
		{category:TriggerEventTypeCategories.OBS, icon:"show", labelKey:"triggers.events.OBS_SOURCE_ON.label", value:TriggerTypes.OBS_SOURCE_ON, descriptionKey:"triggers.events.OBS_SOURCE_ON.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"hide", labelKey:"triggers.events.OBS_SOURCE_OFF.label", value:TriggerTypes.OBS_SOURCE_OFF, descriptionKey:"triggers.events.OBS_SOURCE_OFF.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"online", labelKey:"triggers.events.OBS_START_STREAM.label", value:TriggerTypes.OBS_START_STREAM, descriptionKey:"triggers.events.OBS_START_STREAM.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_START_STREAM},
		{category:TriggerEventTypeCategories.OBS, icon:"offline", labelKey:"triggers.events.OBS_STOP_STREAM.label", value:TriggerTypes.OBS_STOP_STREAM, descriptionKey:"triggers.events.OBS_STOP_STREAM.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_STOP_STREAM},
		{category:TriggerEventTypeCategories.OBS, icon:"mute", labelKey:"triggers.events.OBS_INPUT_MUTE.label", value:TriggerTypes.OBS_INPUT_MUTE, descriptionKey:"triggers.events.OBS_INPUT_MUTE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"unmute", labelKey:"triggers.events.OBS_INPUT_UNMUTE.label", value:TriggerTypes.OBS_INPUT_UNMUTE, descriptionKey:"triggers.events.OBS_INPUT_UNMUTE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"play", labelKey:"triggers.events.OBS_PLAYBACK_STARTED.label", value:TriggerTypes.OBS_PLAYBACK_STARTED, descriptionKey:"triggers.events.OBS_PLAYBACK_STARTED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		{category:TriggerEventTypeCategories.OBS, icon:"stop", labelKey:"triggers.events.OBS_PLAYBACK_ENDED.label", value:TriggerTypes.OBS_PLAYBACK_ENDED, descriptionKey:"triggers.events.OBS_PLAYBACK_ENDED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		//These event require are not super relevant as they can only be triggered from OBS 28+ after clicking
		//a media source, then using the media player buttons... I don't think much people use those so I
		//chose to disable them for now.
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"pause", labelKey:"triggers.events.OBS_PLAYBACK_PAUSED.label", value:TriggerTypes.OBS_PLAYBACK_PAUSED, descriptionKey:"triggers.events.OBS_PLAYBACK_PAUSED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"loop", labelKey:"triggers.events.OBS_PLAYBACK_RESTARTED.label", value:TriggerTypes.OBS_PLAYBACK_RESTARTED, descriptionKey:"triggers.events.OBS_PLAYBACK_RESTARTED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"next", labelKey:"triggers.events.OBS_PLAYBACK_NEXT.label", value:TriggerTypes.OBS_PLAYBACK_NEXT, descriptionKey:"triggers.events.OBS_PLAYBACK_NEXT.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"prev", labelKey:"triggers.events.OBS_PLAYBACK_PREVIOUS.label", value:TriggerTypes.OBS_PLAYBACK_PREVIOUS, descriptionKey:"triggers.events.OBS_PLAYBACK_PREVIOUS.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		{category:TriggerEventTypeCategories.OBS, icon:"graphicFilters", labelKey:"triggers.events.OBS_FILTER_ON.label", value:TriggerTypes.OBS_FILTER_ON, descriptionKey:"triggers.events.OBS_FILTER_ON.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"graphicFiltersOff", labelKey:"triggers.events.OBS_FILTER_OFF.label", value:TriggerTypes.OBS_FILTER_OFF, descriptionKey:"triggers.events.OBS_FILTER_OFF.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE},
		{category:TriggerEventTypeCategories.MISC, icon:"voicemod", labelKey:"triggers.events.VOICEMOD.label", value:TriggerTypes.VOICEMOD, descriptionKey:"triggers.events.VOICEMOD.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.VOICEMOD},
		{category:TriggerEventTypeCategories.MISC, icon:"online", labelKey:"triggers.events.STREAM_ONLINE.label", value:TriggerTypes.STREAM_ONLINE, descriptionKey:"triggers.events.STREAM_ONLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE},
		{category:TriggerEventTypeCategories.MISC, icon:"offline", labelKey:"triggers.events.STREAM_OFFLINE.label", value:TriggerTypes.STREAM_OFFLINE, descriptionKey:"triggers.events.STREAM_OFFLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE},
		{category:TriggerEventTypeCategories.MISC, icon:"online", labelKey:"triggers.events.FOLLOWED_STREAM_ONLINE.label", value:TriggerTypes.FOLLOWED_STREAM_ONLINE, descriptionKey:"triggers.events.FOLLOWED_STREAM_ONLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE, disabledReasonLabelKey:"triggers.events.FOLLOWED_STREAM_ONLINE.disabled_reason"},
		{category:TriggerEventTypeCategories.MISC, icon:"offline", labelKey:"triggers.events.FOLLOWED_STREAM_OFFLINE.label", value:TriggerTypes.FOLLOWED_STREAM_OFFLINE, descriptionKey:"triggers.events.FOLLOWED_STREAM_OFFLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE, disabledReasonLabelKey:"triggers.events.FOLLOWED_STREAM_OFFLINE.disabled_reason"},
		{newDate:1693519200000, beta:true, category:TriggerEventTypeCategories.MISC, icon:"heat", labelKey:"triggers.events.HEAT_CLICK.label", value:TriggerTypes.HEAT_CLICK, descriptionKey:"triggers.events.HEAT_CLICK.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"count", labelKey:"triggers.events.COUNTER_EDIT.label", value:TriggerTypes.COUNTER_EDIT, descriptionKey:"triggers.events.COUNTER_EDIT.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"add", labelKey:"triggers.events.COUNTER_ADD.label", value:TriggerTypes.COUNTER_ADD, descriptionKey:"triggers.events.COUNTER_ADD.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"minus", labelKey:"triggers.events.COUNTER_DEL.label", value:TriggerTypes.COUNTER_DEL, descriptionKey:"triggers.events.COUNTER_DEL.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"max", labelKey:"triggers.events.COUNTER_MAXED.label", value:TriggerTypes.COUNTER_MAXED, descriptionKey:"triggers.events.COUNTER_MAXED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"min", labelKey:"triggers.events.COUNTER_MINED.label", value:TriggerTypes.COUNTER_MINED, descriptionKey:"triggers.events.COUNTER_MINED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"loop", labelKey:"triggers.events.COUNTER_LOOPED.label", value:TriggerTypes.COUNTER_LOOPED, descriptionKey:"triggers.events.COUNTER_LOOPED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{newDate:1693519200000, beta:true, category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"placeholder", labelKey:"triggers.events.VALUE_UPDATE.label", value:TriggerTypes.VALUE_UPDATE, descriptionKey:"triggers.events.VALUE_UPDATE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.VALUE_UPDATE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.TRACK_ADDED_TO_QUEUE.label", value:TriggerTypes.TRACK_ADDED_TO_QUEUE, descriptionKey:"triggers.events.TRACK_ADDED_TO_QUEUE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.MUSIC_START.label", value:TriggerTypes.MUSIC_START, descriptionKey:"triggers.events.MUSIC_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_START},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.MUSIC_STOP.label", value:TriggerTypes.MUSIC_STOP, descriptionKey:"triggers.events.MUSIC_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP},
		{newDate:1693519200000, premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"goxlr_fx", labelKey:"triggers.events.GOXLR_FX_ENABLED.label", value:TriggerTypes.GOXLR_FX_ENABLED, descriptionKey:"triggers.events.GOXLR_FX_ENABLED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE, goxlrMiniCompatible:false},
		{newDate:1693519200000, premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"goxlr_fx", labelKey:"triggers.events.GOXLR_FX_DISABLED.label", value:TriggerTypes.GOXLR_FX_DISABLED, descriptionKey:"triggers.events.GOXLR_FX_DISABLED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE, goxlrMiniCompatible:false},
		{newDate:1693519200000, premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"press", labelKey:"triggers.events.GOXLR_BUTTON_PRESSED.label", value:TriggerTypes.GOXLR_BUTTON_PRESSED, descriptionKey:"triggers.events.GOXLR_BUTTON_PRESSED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_BUTTON, goxlrMiniCompatible:true},
		{newDate:1693519200000, premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"release", labelKey:"triggers.events.GOXLR_BUTTON_RELEASED.label", value:TriggerTypes.GOXLR_BUTTON_RELEASED, descriptionKey:"triggers.events.GOXLR_BUTTON_RELEASED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_BUTTON, goxlrMiniCompatible:true},
		{newDate:1693519200000, premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"play", labelKey:"triggers.events.GOXLR_SAMPLE_COMPLETE.label", value:TriggerTypes.GOXLR_SAMPLE_COMPLETE, descriptionKey:"triggers.events.GOXLR_SAMPLE_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_SAMPLE_COMPLETE, goxlrMiniCompatible:false},
		{newDate:1693519200000, premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"mute", labelKey:"triggers.events.GOXLR_INPUT_MUTE.label", value:TriggerTypes.GOXLR_INPUT_MUTE, descriptionKey:"triggers.events.GOXLR_INPUT_MUTE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_SOUND_INPUT, goxlrMiniCompatible:true},
		{newDate:1693519200000, premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"unmute", labelKey:"triggers.events.GOXLR_INPUT_UNMUTE.label", value:TriggerTypes.GOXLR_INPUT_UNMUTE, descriptionKey:"triggers.events.GOXLR_INPUT_MUTE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_SOUND_INPUT, goxlrMiniCompatible:true},
	];
	return eventsCache;
}

export const TriggerMusicTypes = {
	NO_ACTION:"0",
	ADD_TRACK_TO_QUEUE:"1",
	NEXT_TRACK:"2",
	PAUSE_PLAYBACK:"3",
	RESUME_PLAYBACK:"4",
	GET_CURRENT_TRACK:"5",
	START_PLAYLIST:"6",
} as const;
export type TriggerMusicTypesValue = typeof TriggerMusicTypes[keyof typeof TriggerMusicTypes];

let musicCache:TriggerMusicEventType[];
export function MusicTriggerEvents():TriggerMusicEventType[] {
	if(musicCache) return musicCache;

	musicCache = [
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.musicEvents.ADD_TRACK_TO_QUEUE", value:TriggerMusicTypes.ADD_TRACK_TO_QUEUE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.musicEvents.NEXT_TRACK", value:TriggerMusicTypes.NEXT_TRACK},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.musicEvents.PAUSE_PLAYBACK", value:TriggerMusicTypes.PAUSE_PLAYBACK},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.musicEvents.RESUME_PLAYBACK", value:TriggerMusicTypes.RESUME_PLAYBACK},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.musicEvents.START_PLAYLIST", value:TriggerMusicTypes.START_PLAYLIST},
	];
	return musicCache;
}

export const TriggerScheduleTypes = {
	NO_ACTION:"0",
	REGULAR_REPEAT:"1",
	SPECIFIC_DATES:"2",
} as const;
export type TriggerScheduleTypesValue = typeof TriggerScheduleTypes[keyof typeof TriggerScheduleTypes];

let scheduleCache:TriggerScheduleEventType[];
export function ScheduleTriggerEvents():TriggerScheduleEventType[] {
	if(scheduleCache) return scheduleCache;

	scheduleCache = [
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", labelKey:"triggers.scheduleEvents.REGULAR_REPEAT", value:TriggerScheduleTypes.REGULAR_REPEAT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", labelKey:"triggers.scheduleEvents.SPECIFIC_DATES", value:TriggerScheduleTypes.SPECIFIC_DATES},
	];
	return scheduleCache;
}