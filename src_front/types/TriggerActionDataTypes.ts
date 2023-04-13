import StoreProxy from "@/store/StoreProxy";
import Config from "../utils/Config";
import { TwitchatDataTypes } from "./TwitchatDataTypes";


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
								| TriggerActionCountData
								| TriggerActionCountGetData
								| TriggerActionRandomData
								| TriggerActionStreamInfoData
								| TriggerActionTriggerToggleData
;

export type TriggerActionStringTypes = TriggerActionTypes["type"];

export interface TriggerData {
	id:string;
	/**
	 * Trigegr type
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
	 * Execution que for this trigger
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
	global:number;
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
	icon:string;
};
//Main trigger categories displayed on the parameter "Triggers" section
export const TriggerEventTypeCategories:{[key:string]:TriggerEventTypeCategory} = {
	GLOBAL:		{id:1, labelKey:"triggers.categories.global", icon:"whispers"},
	TIMER:		{id:2, labelKey:"triggers.categories.timer", icon:"timer"},
	TWITCHAT:	{id:3, labelKey:"triggers.categories.twitchat", icon:"twitchat"},
	USER:		{id:4, labelKey:"triggers.categories.user", icon:"user"},
	SUBITS:		{id:5, labelKey:"triggers.categories.subits", icon:"coin"},
	MOD:		{id:6, labelKey:"triggers.categories.mod", icon:"mod"},
	HYPETRAIN:	{id:7, labelKey:"triggers.categories.hypetrain", icon:"train"},
	GAMES:		{id:8, labelKey:"triggers.categories.games", icon:"ticket"},
	MUSIC:		{id:9, labelKey:"triggers.categories.music", icon:"spotify"},
	OBS:		{id:10, labelKey:"triggers.categories.obs", icon:"obs"},
	MISC:		{id:11, labelKey:"triggers.categories.misc", icon:"broadcast"},
	COUNTER:	{id:12, labelKey:"triggers.categories.count", icon:"count"},
} as const;
export type TriggerEventTypeCategoryID = typeof TriggerEventTypeCategories[keyof typeof TriggerEventTypeCategories]['id'];

export interface TriggerTypeDefinition extends TwitchatDataTypes.ParameterDataListValue<TriggerTypesValue> {
	category:TriggerEventTypeCategory;
	labelKey:string;
	icon:string;
	beta?:boolean;
	noToggle?:boolean;
	descriptionKey?:string;
	isCategory?:boolean;
	testMessageType?:TwitchatDataTypes.TwitchatMessageStringType;
	testNoticeType?:TwitchatDataTypes.TwitchatNoticeStringType;
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

export type TriggerActionObsDataAction = "show"|"hide"|"mute"|"unmute"|"replay";
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

export interface TriggerActionVoicemodData extends TriggerActionData{
	type:"voicemod";
	voiceID:string;
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

export interface TriggerActionCountData extends TriggerActionData{
	type:"count";
	addValue:string;//Can be a placeholder, needs to be parseFloat() before updating counter
	counters:string[];
}

/**
 * @deprecated Removed in favor of global counter placeholders
 */
export interface TriggerActionCountGetData extends TriggerActionData{
	type:"countget";
	counter:string;
	placeholder:string;
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
}

export interface TriggerActionStreamInfoData extends TriggerActionData{
	type:"stream_infos";
	title:string;
	categoryId:string;
	tags:string[];
}

export interface TriggerScheduleData {
	type:TriggerScheduleTypesValue|"0";
	repeatDuration:number;
	repeatMinMessages:number;
	dates:{daily:boolean, monthly:boolean, yearly:boolean, value:string}[];
}

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
	STREAM_INFO_UPDATE:"19",
	TRACK_ADDED_TO_QUEUE:"14",
	MUSIC_START:"24",
	MUSIC_STOP:"25",
	TIMER_START:"15",
	TIMER_STOP:"16",
	COUNTDOWN_START:"17",
	COUNTDOWN_STOP:"18",
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

	TWITCHAT_AD:"ad",
	TWITCHAT_LIVE_FRIENDS:"live_friends",
	TWITCHAT_SHOUTOUT_QUEUE:"shoutout_queue",
} as const;
export type TriggerTypesKey = keyof typeof TriggerTypes;
export type TriggerTypesValue = typeof TriggerTypes[TriggerTypesKey];

export interface ITriggerPlaceholder {
	tag:string;
	descKey:string;
	descReplacedValues?:{[key:string]:string};
	pointer:string;
	isUserID:boolean;
	numberParsable:boolean;
}

export const USER_PLACEHOLDER:string = "USER";
export const USER_ID_PLACEHOLDER:string = "USER_ID";
export const COUNTER_VALUE_PLACEHOLDER_PREFIX:string = "COUNTER_VALUE_";

/**
 * Placeholders related to a trigger action type
 */
let actionPlaceholdersCache:Partial<{[key in NonNullable<TriggerActionStringTypes>]:ITriggerPlaceholder[]}>;
export function TriggerActionPlaceholders(key:TriggerActionStringTypes):ITriggerPlaceholder[] {
	if(!key) return [];

	if(actionPlaceholdersCache) {
		return actionPlaceholdersCache[key] ?? [];
	}

	const map:Partial<{[key in NonNullable<TriggerActionStringTypes>]:ITriggerPlaceholder[]}> = {
		"music":[
			{tag:"ADDED_TRACK_ARTIST", descKey:'triggers.placeholders.track_added_artist', pointer:"trackAdded.artist", numberParsable:false, isUserID:false},
			{tag:"ADDED_TRACK_TITLE", descKey:'triggers.placeholders.track_added_title', pointer:"trackAdded.title", numberParsable:false, isUserID:false},
			{tag:"ADDED_TRACK_ALBUM", descKey:'triggers.placeholders.track_added_album', pointer:"trackAdded.album", numberParsable:false, isUserID:false},
			{tag:"ADDED_TRACK_COVER", descKey:'triggers.placeholders.track_added_cover', pointer:"trackAdded.cover", numberParsable:false, isUserID:false},
			{tag:"ADDED_TRACK_URL", descKey:'triggers.placeholders.track_added_url', pointer:"trackAdded.url", numberParsable:false, isUserID:false},
		]
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
let eventPlaceholdersCache:Partial<{[key in TriggerTypesValue]:ITriggerPlaceholder[]}>|undefined;
export function TriggerEventPlaceholders(key:TriggerTypesValue):ITriggerPlaceholder[] {
	if(eventPlaceholdersCache) {
		return eventPlaceholdersCache[key] ?? [];
	}

	const map:Partial<{[key in TriggerTypesValue]:ITriggerPlaceholder[]}> = {};
	//Init all existing triggers to empty placeholder array
	for (const key in TriggerTypes) {
		const trigger = TriggerTypes[key as TriggerTypesKey]
		map[trigger] = [];
	}

	map[TriggerTypes.ANY_MESSAGE] = 
	map[TriggerTypes.FIRST_TODAY] = 
	map[TriggerTypes.FIRST_ALL_TIME] = 
	map[TriggerTypes.RETURNING_USER] = 
	map[TriggerTypes.PRESENTATION] =
	map[TriggerTypes.CHAT_COMMAND] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.PIN_MESSAGE] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"chatMessage.user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"chatMessage.message", numberParsable:true, isUserID:false},
		{tag:"MODERATOR", descKey:'triggers.placeholders.pinned_by', pointer:"moderator.displayName", numberParsable:false, isUserID:false},
		{tag:"MODERATOR_ID", descKey:'triggers.placeholders.pinned_by_id', pointer:"moderator.id", numberParsable:false, isUserID:false},
	];

	map[TriggerTypes.UNPIN_MESSAGE] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"chatMessage.user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"chatMessage.message", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.POLL_RESULT] = [
		{tag:"TITLE", descKey:'triggers.placeholders.poll_title', pointer:"title", numberParsable:false, isUserID:false},
		{tag:"WIN", descKey:'triggers.placeholders.poll_win', pointer:"winner.label", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.PREDICTION_RESULT] = [
		{tag:"TITLE", descKey:'triggers.placeholders.prediction_title', pointer:"title", numberParsable:false, isUserID:false},
		{tag:"WIN", descKey:'triggers.placeholders.prediction_win', pointer:"winner.label", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.BINGO_RESULT] = [
		{tag:"WINNER", descKey:'triggers.placeholders.winner', pointer:"bingoData.winners[].displayName", numberParsable:false, isUserID:false},
		{tag:"WIN_VALUE", descKey:'triggers.placeholders.winner', pointer:"bingoData.numberValue", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.RAFFLE_RESULT] = [
		{tag:"WINNER", descKey:'triggers.placeholders.winner', pointer:"raffleData.winners[].label", numberParsable:false, isUserID:false},
	];
	
	map[TriggerTypes.SUB] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"SUB_TIER", descKey:'triggers.placeholders.sub_tier', pointer:"tier", numberParsable:true, isUserID:false},
		{tag:"MESSAGE", descKey:'triggers.placeholders.sub_message', pointer:"message", numberParsable:true, isUserID:false},
		{tag:"MONTHS_TOTAL", descKey:'triggers.placeholders.sub_months_total', pointer:"totalSubDuration", numberParsable:true, isUserID:false},
		{tag:"MONTHS_PREPAID", descKey:'triggers.placeholders.sub_months_prepaid', pointer:"months", numberParsable:true, isUserID:false},
		{tag:"MONTHS_STREAK", descKey:'triggers.placeholders.sub_months_streak', pointer:"streakMonths", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.SUBGIFT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.sub_gifter', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"RECIPIENTS", descKey:'triggers.placeholders.sub_gift_recipient', pointer:"gift_recipients[].displayName", numberParsable:false, isUserID:false},
		{tag:"RECIPIENTS_ID", descKey:'triggers.placeholders.sub_gift_recipient_id', pointer:"gift_recipients[].id", numberParsable:false, isUserID:false},
		{tag:"SUB_TIER", descKey:'triggers.placeholders.sub_tier', pointer:"tier", numberParsable:true, isUserID:false},
		{tag:"MONTHS_PREPAID", descKey:'triggers.placeholders.sub_months_prepaid', pointer:"months", numberParsable:true, isUserID:false},
		{tag:"GIFT_COUNT", descKey:'triggers.placeholders.sub_gift_count', pointer:"gift_count", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.CHEER] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"BITS", descKey:'triggers.placeholders.bits', pointer:"bits", numberParsable:true, isUserID:false},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.FOLLOW] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
	];
	
	map[TriggerTypes.RAID] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false},
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false},
		{tag:"VIEWERS", descKey:'triggers.placeholders.stream_category', pointer:"viewers", numberParsable:true, isUserID:false},
		{tag:"DURATION", descKey:'triggers.placeholders.stream_duration', pointer:"stream.duration", numberParsable:true, isUserID:false},
		{tag:"WAS_LIVE", descKey:'triggers.placeholders.stream_live', pointer:"stream.wasLive", numberParsable:false, isUserID:false},
	];
	
	map[TriggerTypes.RAID_STARTED] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
	];
	
	map[TriggerTypes.SHOUTOUT_IN] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.shoutout_in', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"AVATAR", descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false},
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false},
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false},
	];
	map[TriggerTypes.SHOUTOUT_OUT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.shoutout_out', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"USER_STREAM_TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false},
		{tag:"USER_STREAM_CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false},
	];
	
	map[TriggerTypes.REWARD_REDEEM] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"TITLE", descKey:'triggers.placeholders.reward_title', pointer:"reward.title", numberParsable:false, isUserID:false},
		{tag:"DESCRIPTION", descKey:'triggers.placeholders.reward_description', pointer:"reward.description", numberParsable:false, isUserID:false},
		{tag:"COST", descKey:'triggers.placeholders.reward_cost', pointer:"reward.cost", numberParsable:true, isUserID:false},
		{tag:"MESSAGE", descKey:"triggers.placeholders.reward_message", pointer:"message", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.MUSIC_START] = 
	map[TriggerTypes.TRACK_ADDED_TO_QUEUE] = [
		{tag:"CURRENT_TRACK_ARTIST", descKey:'triggers.placeholders.track_artist', pointer:"track.artist", numberParsable:false, isUserID:false},
		{tag:"CURRENT_TRACK_TITLE", descKey:'triggers.placeholders.track_title', pointer:"track.title", numberParsable:false, isUserID:false},
		{tag:"CURRENT_TRACK_ALBUM", descKey:'triggers.placeholders.track_album', pointer:"track.album", numberParsable:false, isUserID:false},
		{tag:"CURRENT_TRACK_COVER", descKey:'triggers.placeholders.track_cover', pointer:"track.cover", numberParsable:false, isUserID:false},
		{tag:"CURRENT_TRACK_URL", descKey:'triggers.placeholders.track_url', pointer:"track.url", numberParsable:false, isUserID:false},
	];
	
	map[TriggerTypes.STREAM_INFO_UPDATE] = [
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"title", numberParsable:false, isUserID:false},
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"category", numberParsable:false, isUserID:false},
	];
	
	map[TriggerTypes.HIGHLIGHT_CHAT_MESSAGE] = [
		{tag:"AVATAR", descKey:'triggers.placeholders.user_avatar', pointer:"info.user.avatarPath", numberParsable:false, isUserID:false},
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"info.user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"info.user.id", numberParsable:false, isUserID:true},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"info.message", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.CHAT_ALERT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"message.user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"message.user.id", numberParsable:false, isUserID:true},
		{tag:"ALERT", descKey:'triggers.placeholders.message', pointer:"message.message", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.HYPE_TRAIN_START] = 
	map[TriggerTypes.HYPE_TRAIN_PROGRESS] = [
		{tag:"LEVEL", descKey:'triggers.placeholders.train_level', pointer:"level", numberParsable:true, isUserID:false},
		{tag:"PERCENT", descKey:'triggers.placeholders.train_percent', pointer:"percent", numberParsable:true, isUserID:false},
	];

	map[TriggerTypes.HYPE_TRAIN_END] = [
		{tag:"LEVEL", descKey:'triggers.placeholders.train_end_level', pointer:"level", numberParsable:true, isUserID:false},
		{tag:"PERCENT", descKey:'triggers.placeholders.train_end_percent', pointer:"percent", numberParsable:true, isUserID:false},
	];

	map[TriggerTypes.VOICEMOD] = [
		{tag:"VOICE_ID", descKey:'triggers.placeholders.voicemod_voice', pointer:"voiceID", numberParsable:false, isUserID:false},
	];

	map[TriggerTypes.TIMEOUT] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"DURATION", descKey:'triggers.placeholders.timer_duration', pointer:"duration_s", numberParsable:true, isUserID:false},
	];
	
	map[TriggerTypes.TIMER_START] = [
		{tag:"START_DATE", descKey:'triggers.placeholders.start_date', pointer:"startAt", numberParsable:false, isUserID:false},
	];
	map[TriggerTypes.TIMER_STOP] = [
		{tag:"START_DATE", descKey:'triggers.placeholders.start_date', pointer:"startAt", numberParsable:false, isUserID:false},
		{tag:"DURATION", descKey:'triggers.placeholders.timer_duration', pointer:"duration", numberParsable:false, isUserID:false},
	];

	map[TriggerTypes.COUNTDOWN_START] = [
		{tag:"START_AT", descKey:'triggers.placeholders.start_date', pointer:"countdown.startAt", numberParsable:false, isUserID:false},
		{tag:"DURATION", descKey:'triggers.placeholders.countdown_duration', pointer:"countdown.duration", numberParsable:false, isUserID:false},
	]; 
	map[TriggerTypes.COUNTDOWN_STOP] = JSON.parse(JSON.stringify(map[TriggerTypes.COUNTDOWN_START]));
	map[TriggerTypes.COUNTDOWN_STOP]!.push(
		{tag:"END_AT", descKey:'triggers.placeholders.countdown_end_date', pointer:"countdown.endAt", numberParsable:false, isUserID:false},
	)

	map[TriggerTypes.VIP] = 
	map[TriggerTypes.UNVIP] = 
	map[TriggerTypes.MOD] = 
	map[TriggerTypes.UNMOD] = 
	map[TriggerTypes.UNBAN] = 
	map[TriggerTypes.BAN] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
	];
	
	map[TriggerTypes.STREAM_ONLINE] =
	map[TriggerTypes.STREAM_OFFLINE] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"info.user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"info.user.id", numberParsable:false, isUserID:true},
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"info.user.title", numberParsable:false, isUserID:false},
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"info.user.category", numberParsable:false, isUserID:false},
	];

	
	map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE] = [
		{tag:"TITLE", descKey:'triggers.placeholders.challenge_title', pointer:"challenge.title", numberParsable:false, isUserID:false},
		{tag:"DESCRIPTION", descKey:'triggers.placeholders.challenge_description', pointer:"challenge.description", numberParsable:false, isUserID:false},
		{tag:"GOAL", descKey:'triggers.placeholders.challenge_goal', pointer:"challenge.goal", numberParsable:true, isUserID:false},
	];

	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS] = JSON.parse(JSON.stringify(map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE]));
	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS]!.push(
		{tag:"PROGRESS", descKey:'triggers.placeholders.challenge_current', pointer:"challenge.progress", numberParsable:true, isUserID:false},
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"CONTRIBUTION", descKey:'triggers.placeholders.challenge_contribution', pointer:"contribution", numberParsable:true, isUserID:false},
		{tag:"CONTRIBUTION_TOTAL", descKey:'triggers.placeholders.challenge_contribution_total', pointer:"total_contribution", numberParsable:true, isUserID:false},
	);
	
	map[TriggerTypes.COUNTER_ADD] =
	map[TriggerTypes.COUNTER_DEL] =
	map[TriggerTypes.COUNTER_LOOPED] =
	map[TriggerTypes.COUNTER_MINED] =
	map[TriggerTypes.COUNTER_MAXED] = [
		{tag:"NAME", descKey:'triggers.placeholders.counter_name', pointer:"counter.name", numberParsable:false, isUserID:false},
		{tag:"VALUE", descKey:'triggers.placeholders.counter_value', pointer:"value", numberParsable:true, isUserID:false},
		{tag:"UPDATE", descKey:'triggers.placeholders.counter_update', pointer:"added", numberParsable:true, isUserID:false},
		{tag:"UPDATE_ABS", descKey:'triggers.placeholders.counter_update_abs', pointer:"added_abs", numberParsable:true, isUserID:false},
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.counter_username', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.counter_userid', pointer:"user.id", numberParsable:false, isUserID:true},
	];

	map[TriggerTypes.SLASH_COMMAND] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false},
	];

	map[TriggerTypes.USER_WATCH_STREAK] = [
		{tag:USER_PLACEHOLDER, descKey:'triggers.placeholders.user', pointer:"user.displayName", numberParsable:false, isUserID:false},
		{tag:USER_ID_PLACEHOLDER, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true},
		{tag:"STREAK_COUNT", descKey:'triggers.placeholders.watch_streak', pointer:"streak", numberParsable:true, isUserID:false},
	];


	//If requesting chat command helpers and there is a music
	//service available, concat the music service helpers
	if(map[key]
	&& key != TriggerTypes.MUSIC_START
	&& key != TriggerTypes.TRACK_ADDED_TO_QUEUE
	&& Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED) {
		map[key] = map[key]!.concat(map[TriggerTypes.TRACK_ADDED_TO_QUEUE]!);
	}

	const counters = StoreProxy.counters.counterList;
	const counterPlaceholders:ITriggerPlaceholder[] = [];
	for (let i = 0; i < counters.length; i++) {
		const c = counters[i];
		if(c.placeholderKey) {
			counterPlaceholders.push({tag:COUNTER_VALUE_PLACEHOLDER_PREFIX + c.placeholderKey, descKey:'triggers.placeholders.counter_global_value', descReplacedValues:{"NAME":c.name}, pointer:"__counter.value", numberParsable:true, isUserID:false});
		}
	}
	
	//Add global placeholders where missing
	let k!:TriggerTypesValue;
	for (k in map) {
		const entry = map[k]!;
		if(entry.findIndex(v=>v.tag == "MY_STREAM_TITLE") == -1) {
			entry.push({tag:"MY_STREAM_TITLE", descKey:'triggers.placeholders.stream_title', pointer:"__my_stream__.title", numberParsable:false, isUserID:false});
		}
		if(entry.findIndex(v=>v.tag == "MY_STREAM_CATEGORY") == -1) {
			entry.push({tag:"MY_STREAM_CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"__my_stream__.category", numberParsable:false, isUserID:false});
		}

		if(entry.findIndex(v=>v.tag == "TRIGGER_NAME") == -1) {
			entry.push({tag:"TRIGGER_NAME", descKey:"triggers.placeholders.trigger_name", pointer:"__trigger__.name", numberParsable:false, isUserID:false});
		}

		map[k] = entry.concat(counterPlaceholders);
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
		{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", labelKey:"triggers.events.CHAT_COMMAND.label", value:TriggerTypes.CHAT_COMMAND, isCategory:true, descriptionKey:"triggers.events.CHAT_COMMAND.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE, noToggle:true},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", labelKey:"triggers.events.ANY_MESSAGE.label", value:TriggerTypes.ANY_MESSAGE, descriptionKey:"triggers.events.ANY_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", labelKey:"triggers.events.REWARD_REDEEM.label", value:TriggerTypes.REWARD_REDEEM, isCategory:true, descriptionKey:"triggers.events.REWARD_REDEEM.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.REWARD, noToggle:true},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", labelKey:"triggers.events.COMMUNITY_CHALLENGE_PROGRESS.label", value:TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS, descriptionKey:"triggers.events.COMMUNITY_CHALLENGE_PROGRESS.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", labelKey:"triggers.events.COMMUNITY_CHALLENGE_COMPLETE.label", value:TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE, descriptionKey:"triggers.events.COMMUNITY_CHALLENGE_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
		{category:TriggerEventTypeCategories.USER, icon:"firstTime", labelKey:"triggers.events.FIRST_ALL_TIME.label", value:TriggerTypes.FIRST_ALL_TIME, descriptionKey:"triggers.events.FIRST_ALL_TIME.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"firstTime", labelKey:"triggers.events.FIRST_TODAY.label", value:TriggerTypes.FIRST_TODAY, descriptionKey:"triggers.events.FIRST_TODAY.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"returning", labelKey:"triggers.events.RETURNING_USER.label", value:TriggerTypes.RETURNING_USER, descriptionKey:"triggers.events.RETURNING_USER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
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
		{category:TriggerEventTypeCategories.TIMER, icon:"date", labelKey:"triggers.events.SCHEDULE.label", value:TriggerTypes.SCHEDULE, descriptionKey:"triggers.events.SCHEDULE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.GENERIC},
		{category:TriggerEventTypeCategories.TIMER, icon:"timer", labelKey:"triggers.events.TIMER_START.label", value:TriggerTypes.TIMER_START, descriptionKey:"triggers.events.TIMER_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
		{category:TriggerEventTypeCategories.TIMER, icon:"timer", labelKey:"triggers.events.TIMER_STOP.label", value:TriggerTypes.TIMER_STOP, descriptionKey:"triggers.events.TIMER_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
		{category:TriggerEventTypeCategories.TIMER, icon:"countdown", labelKey:"triggers.events.COUNTDOWN_START.label", value:TriggerTypes.COUNTDOWN_START, descriptionKey:"triggers.events.COUNTDOWN_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
		{category:TriggerEventTypeCategories.TIMER, icon:"countdown", labelKey:"triggers.events.COUNTDOWN_STOP.label", value:TriggerTypes.COUNTDOWN_STOP, descriptionKey:"triggers.events.COUNTDOWN_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
		{category:TriggerEventTypeCategories.OBS, icon:"list", labelKey:"triggers.events.OBS_SCENE.label", value:TriggerTypes.OBS_SCENE, descriptionKey:"triggers.events.OBS_SCENE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE},
		{category:TriggerEventTypeCategories.OBS, icon:"show", labelKey:"triggers.events.OBS_SOURCE_ON.label", value:TriggerTypes.OBS_SOURCE_ON, descriptionKey:"triggers.events.OBS_SOURCE_ON.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"hide", labelKey:"triggers.events.OBS_SOURCE_OFF.label", value:TriggerTypes.OBS_SOURCE_OFF, descriptionKey:"triggers.events.OBS_SOURCE_OFF.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"mute", labelKey:"triggers.events.OBS_INPUT_MUTE.label", value:TriggerTypes.OBS_INPUT_MUTE, descriptionKey:"triggers.events.OBS_INPUT_MUTE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"unmute", labelKey:"triggers.events.OBS_INPUT_UNMUTE.label", value:TriggerTypes.OBS_INPUT_UNMUTE, descriptionKey:"triggers.events.OBS_INPUT_UNMUTE.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"play", labelKey:"triggers.events.OBS_PLAYBACK_STARTED.label", value:TriggerTypes.OBS_PLAYBACK_STARTED, descriptionKey:"triggers.events.OBS_PLAYBACK_STARTED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"stop", labelKey:"triggers.events.OBS_PLAYBACK_ENDED.label", value:TriggerTypes.OBS_PLAYBACK_ENDED, descriptionKey:"triggers.events.OBS_PLAYBACK_ENDED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		//These event require an OBS plugin to be triggered and are not super relevant...
		//I chose to disable them for now
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"pause", labelKey:"triggers.events.OBS_PLAYBACK_PAUSED.label", value:TriggerTypes.OBS_PLAYBACK_PAUSED, descriptionKey:"triggers.events.OBS_PLAYBACK_PAUSED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"loop", labelKey:"triggers.events.OBS_PLAYBACK_RESTARTED.label", value:TriggerTypes.OBS_PLAYBACK_RESTARTED, descriptionKey:"triggers.events.OBS_PLAYBACK_RESTARTED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"next", labelKey:"triggers.events.OBS_PLAYBACK_NEXT.label", value:TriggerTypes.OBS_PLAYBACK_NEXT, descriptionKey:"triggers.events.OBS_PLAYBACK_NEXT.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"prev", labelKey:"triggers.events.OBS_PLAYBACK_PREVIOUS.label", value:TriggerTypes.OBS_PLAYBACK_PREVIOUS, descriptionKey:"triggers.events.OBS_PLAYBACK_PREVIOUS.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"graphicFilters", labelKey:"triggers.events.OBS_FILTER_ON.label", value:TriggerTypes.OBS_FILTER_ON, descriptionKey:"triggers.events.OBS_FILTER_ON.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"graphicFiltersOff", labelKey:"triggers.events.OBS_FILTER_OFF.label", value:TriggerTypes.OBS_FILTER_OFF, descriptionKey:"triggers.events.OBS_FILTER_OFF.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE},
		{category:TriggerEventTypeCategories.MISC, icon:"voicemod", labelKey:"triggers.events.VOICEMOD.label", value:TriggerTypes.VOICEMOD, descriptionKey:"triggers.events.VOICEMOD.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.VOICEMOD},
		{category:TriggerEventTypeCategories.MISC, icon:"online", labelKey:"triggers.events.STREAM_ONLINE.label", value:TriggerTypes.STREAM_ONLINE, descriptionKey:"triggers.events.STREAM_ONLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE},
		{category:TriggerEventTypeCategories.MISC, icon:"offline", labelKey:"triggers.events.STREAM_OFFLINE.label", value:TriggerTypes.STREAM_OFFLINE, descriptionKey:"triggers.events.STREAM_OFFLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE},
		{category:TriggerEventTypeCategories.COUNTER, icon:"count", labelKey:"triggers.events.COUNTER_ADD.label", value:TriggerTypes.COUNTER_ADD, descriptionKey:"triggers.events.COUNTER_ADD.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER, icon:"count", labelKey:"triggers.events.COUNTER_DEL.label", value:TriggerTypes.COUNTER_DEL, descriptionKey:"triggers.events.COUNTER_DEL.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER, icon:"count", labelKey:"triggers.events.COUNTER_MAXED.label", value:TriggerTypes.COUNTER_MAXED, descriptionKey:"triggers.events.COUNTER_MAXED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER, icon:"count", labelKey:"triggers.events.COUNTER_MINED.label", value:TriggerTypes.COUNTER_MINED, descriptionKey:"triggers.events.COUNTER_MINED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER, icon:"count", labelKey:"triggers.events.COUNTER_LOOPED.label", value:TriggerTypes.COUNTER_LOOPED, descriptionKey:"triggers.events.COUNTER_LOOPED.description", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.TRACK_ADDED_TO_QUEUE.label", value:TriggerTypes.TRACK_ADDED_TO_QUEUE, descriptionKey:"triggers.events.TRACK_ADDED_TO_QUEUE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.MUSIC_START.label", value:TriggerTypes.MUSIC_START, descriptionKey:"triggers.events.MUSIC_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_START},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.MUSIC_STOP.label", value:TriggerTypes.MUSIC_STOP, descriptionKey:"triggers.events.MUSIC_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP},
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