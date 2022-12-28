import Config from "../utils/Config";
import { TwitchatDataTypes } from "./TwitchatDataTypes";


export type TriggerActionTypes =  TriggerActionEmptyData
								| TriggerActionObsData
								| TriggerActionChatData
								| TriggerActionTTSData
								| TriggerActionMusicEntryData
								| TriggerActionRaffleData
								| TriggerActionBingoData
								| TriggerActionVoicemodData
								| TriggerActionHighlightData
								| TriggerActionTriggerData
								| TriggerActionHTTPCallData
;


export type TriggerActionStringTypes = "obs"|"chat"|"music"|"tts"|"raffle"|"bingo"|"voicemod"|"highlight"|"trigger"|"http"|null;

export interface TriggerData {
	enabled:boolean;
	actions:TriggerActionTypes[];
	name:string;
	prevKey?:string;
	permissions?:TwitchatDataTypes.PermissionsData;
	cooldown?:{global:number, user:number, alert:boolean};
	scheduleParams?:TriggerScheduleData;
	/**
	 * @deprecated Only here for typings on data migration. Use "name" property
	 */
	chatCommand?:string
}

//Main trigger categories displayed on the parameter "Triggers" section
export const TriggerEventTypeCategories = {
	GLOBAL: 1,
	TIMER: 2,
	TWITCHAT: 3,
	USER: 4,
	SUBITS: 5,
	MOD: 6,
	HYPETRAIN: 7,
	GAMES: 8,
	MUSIC: 9,
	OBS: 10,
} as const;
export type TriggerEventTypeCategoryValue = typeof TriggerEventTypeCategories[keyof typeof TriggerEventTypeCategories];
export interface TriggerEventTypes extends TwitchatDataTypes.ParameterDataListValue {
	category:TriggerEventTypeCategoryValue;
	label:string;
	value:TriggerTypesValue|"0";
	icon:string;
	beta?:boolean;
	description?:string;
	isCategory?:boolean;
	testMessageType?:TwitchatDataTypes.TwitchatMessageStringType;
	testNoticeType?:TwitchatDataTypes.TwitchatNoticeStringType;
}

export interface TriggerActionData {
	type:TriggerActionStringTypes;
	id:string;
	delay:number;
}

//Used for temporary trigger data before user selects the trigger type
export interface TriggerActionEmptyData extends TriggerActionData{
	type:null;
}

export interface TriggerActionObsData extends TriggerActionData{
	type:"obs";
	sourceName:string;
	filterName?:string;
	show:boolean;
	text?:string;
	url?:string;
	mediaPath?:string;
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
	musicAction:string;
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
	triggerKey:string;
}

export interface TriggerActionHTTPCallData extends TriggerActionData{
	type:"http";
	url:string;
	method:"GET"|"POST"|"PUT"|"DELETE"|"PATCH"|"TRACE"|"OPTIONS"|"CONNECT"|"HEAD";
	queryParams:string[];
}

export type TriggerScheduleTypesValue = typeof TriggerScheduleTypes[keyof typeof TriggerScheduleTypes];
export interface TriggerScheduleData {
	type:TriggerScheduleTypesValue|"0";
	repeatDuration:number;
	repeatMinMessages:number;
	dates:{daily:boolean, yearly:boolean, value:string}[];
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
	SHOUTOUT:"33",
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

	TWITCHAT_AD:"ad",
} as const;
export type TriggerTypesValue = typeof TriggerTypes[keyof typeof TriggerTypes];

export interface ITriggerActionHelper {
	tag:string;
	desc:string;
	pointer:string;
}

export function TriggerActionHelpers(key:string):ITriggerActionHelper[] {
	const map:{[key:string]:ITriggerActionHelper[]} = {}
	map[TriggerTypes.ANY_MESSAGE] = 
	map[TriggerTypes.FIRST_TODAY] = 
	map[TriggerTypes.FIRST_ALL_TIME] = 
	map[TriggerTypes.RETURNING_USER] = 
	map[TriggerTypes.PRESENTATION] =
	map[TriggerTypes.CHAT_COMMAND] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"MESSAGE", desc:"Message content", pointer:"message"},
	];
	
	map[TriggerTypes.PIN_MESSAGE] = [
		{tag:"USER", desc:"Chatter's name", pointer:"chatMessage.user.displayName"},
		{tag:"MESSAGE", desc:"Message content", pointer:"chatMessage.message"},
		{tag:"MODERATOR", desc:"User that pinned the mesage", pointer:"moderator.displayName"},
	];

	map[TriggerTypes.UNPIN_MESSAGE] = [
		{tag:"USER", desc:"Chatter's name", pointer:"chatMessage.user.displayName"},
		{tag:"MESSAGE", desc:"Message content", pointer:"chatMessage.message"},
	];
	
	map[TriggerTypes.POLL_RESULT] = [
		{tag:"TITLE", desc:"Poll title", pointer:"title"},
		{tag:"WIN", desc:"Winning choice title", pointer:"winner.label"},
	];
	
	map[TriggerTypes.PREDICTION_RESULT] = [
		{tag:"TITLE", desc:"Prediction title", pointer:"title"},
		{tag:"WIN", desc:"Winning choice title", pointer:"winner.label"},
	];
	
	map[TriggerTypes.BINGO_RESULT] = [
		{tag:"WINNER", desc:"Winner name", pointer:"bingoData.winners[].displayName"},
	];
	
	map[TriggerTypes.RAFFLE_RESULT] = [
		{tag:"WINNER", desc:"Winner name", pointer:"raffleData.winners[].label"},
	];
	
	map[TriggerTypes.SUB] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"SUB_TIER", desc:"Sub tier 1, 2 or 3", pointer:"tier"},
		{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
	];
	
	map[TriggerTypes.SUBGIFT] = [
		{tag:"USER", desc:"User name of the sub gifter", pointer:"user.displayName"},
		{tag:"RECIPIENT", desc:"Recipient user name", pointer:"gift_recipients[].displayName"},
		{tag:"SUB_TIER", desc:"Sub tier 1, 2 or 3", pointer:"tier"},
	];
	
	map[TriggerTypes.CHEER] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"BITS", desc:"Number of bits", pointer:"bits"},
		{tag:"MESSAGE", desc:"Message of the user", pointer:"message"},
	];
	
	map[TriggerTypes.FOLLOW] = [
		{tag:"USER", desc:"User name of the new follower", pointer:"user.displayName"},
	];
	
	map[TriggerTypes.RAID] = [
		{tag:"USER", desc:"User name of the new follower", pointer:"user.displayName"},
		{tag:"TITLE", desc:"Stream title", pointer:"stream.title"},
		{tag:"CATEGORY", desc:"Stream category", pointer:"stream.category"},
	];
	
	map[TriggerTypes.SHOUTOUT] = [
		{tag:"USER", desc:"User that gave us a shoutout", pointer:"user.displayName"},
		{tag:"USER", desc:"User that gave us a shoutout", pointer:"user.displayName"},
	];
	
	map[TriggerTypes.SHOUTOUT_IN] = [
		{tag:"USER", desc:"User that gave us a shoutout", pointer:"user.displayName"},
	];
	map[TriggerTypes.SHOUTOUT_OUT] = [
		{tag:"USER", desc:"User you gave a shoutout to", pointer:"user.displayName"},
	];
	
	map[TriggerTypes.REWARD_REDEEM] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"TITLE", desc:"Reward title", pointer:"reward.title"},
		{tag:"DESCRIPTION", desc:"Reward description", pointer:"reward.description"},
		{tag:"COST", desc:"Reward cost", pointer:"reward.cost"},
		{tag:"MESSAGE", desc:"User message if any", pointer:"message"},
	];
	
	map[TriggerTypes.MUSIC_START] = 
	map[TriggerTypes.TRACK_ADDED_TO_QUEUE] = [
		{tag:"CURRENT_TRACK_ARTIST", desc:"Current track artist name", pointer:"track.artist"},
		{tag:"CURRENT_TRACK_TITLE", desc:"Current track's title", pointer:"track.title"},
		{tag:"CURRENT_TRACK_ALBUM", desc:"Current track's album name", pointer:"track.album"},
		{tag:"CURRENT_TRACK_COVER", desc:"Current track's cover", pointer:"track.cover"},
		{tag:"CURRENT_TRACK_URL", desc:"Current track URL", pointer:"track.url"},
	];
	
	map[TriggerTypes.STREAM_INFO_UPDATE] = [
		{tag:"TITLE", desc:"Stream title", pointer:"title"},
		{tag:"CATEGORY", desc:"Stream category", pointer:"category"},
	];
	
	map[TriggerTypes.HIGHLIGHT_CHAT_MESSAGE] = [
		{tag:"AVATAR", desc:"User's avatar", pointer:"info.user.avatarPath"},
		{tag:"USER", desc:"User's name", pointer:"info.user.displayName"},
		{tag:"MESSAGE", desc:"Message without emotes", pointer:"info.message"},
	];
	
	map[TriggerTypes.CHAT_ALERT] = [
		{tag:"USER", desc:"User's name", pointer:"message.user.displayName"},
		{tag:"ALERT", desc:"User's message without emotes", pointer:"message.message"},
	];
	
	map[TriggerTypes.HYPE_TRAIN_START] = 
	map[TriggerTypes.HYPE_TRAIN_PROGRESS] = [
		{tag:"LEVEL", desc:"Current level", pointer:"level"},
		{tag:"PERCENT", desc:"Current level progression (0 -> 100)", pointer:"percent"},
	];

	map[TriggerTypes.HYPE_TRAIN_END] = [
		{tag:"LEVEL", desc:"Level reached", pointer:"level"},
		{tag:"PERCENT", desc:"Percent reached", pointer:"percent"},
	];

	map[TriggerTypes.VOICEMOD] = [
		{tag:"VOICE_ID", desc:"Contains the voice's ID", pointer:"voiceID"},
	];

	map[TriggerTypes.TIMEOUT] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
		{tag:"DURATION", desc:"Timeout duration in seconds", pointer:"duration_s"},
	];
	
	map[TriggerTypes.TIMER_START] = [
		{tag:"START_DATE", desc:"Formated start date", pointer:"startAt"},
	];
	map[TriggerTypes.TIMER_STOP] = [
		{tag:"START_DATE", desc:"Formated start date", pointer:"startAt"},
		{tag:"DURATION", desc:"Timer's final duration formated", pointer:"duration"},
	];

	map[TriggerTypes.COUNTDOWN_START] = [
		{tag:"START_AT", desc:"Start date fromated", pointer:"countdown.startAt"},
		{tag:"DURATION", desc:"Countdown's duration formated", pointer:"countdown.duration"},
	]; 
	map[TriggerTypes.COUNTDOWN_STOP] = JSON.parse(JSON.stringify(map[TriggerTypes.COUNTDOWN_START]));
	map[TriggerTypes.COUNTDOWN_STOP].push(
		{tag:"END_AT", desc:"End date fromated", pointer:"countdown.endAt"},
	)

	map[TriggerTypes.VIP] = 
	map[TriggerTypes.UNVIP] = 
	map[TriggerTypes.MOD] = 
	map[TriggerTypes.UNMOD] = 
	map[TriggerTypes.UNBAN] = 
	map[TriggerTypes.BAN] = [
		{tag:"USER", desc:"User name", pointer:"user.displayName"},
	];

	map[TriggerTypes.SHOUTOUT] = [
		{tag:"USER", desc:"User's name", pointer:"user.displayName"},
		{tag:"AVATAR", desc:"User's avatar", pointer:"user.avatarPath"},
		{tag:"TITLE", desc:"Stream title", pointer:"stream.title"},
		{tag:"CATEGORY", desc:"Stream category", pointer:"stream.category"},
	];
	
	map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE] = [
		{tag:"TITLE", desc:"Challenge title", pointer:"challenge.title"},
		{tag:"DESCRIPTION", desc:"Challenge description", pointer:"challenge.description"},
		{tag:"GOAL", desc:"Challenge goal", pointer:"challenge.goal"},
		{tag:"CURRENT", desc:"Challenge current progress", pointer:"challenge.progress"},
	];

	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS] = JSON.parse(JSON.stringify(map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE]));
	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS].push(
		{tag:"USER", desc:"User's name", pointer:"user.displayName"},
		{tag:"CONTRIBUTION", desc:"User's contribution", pointer:"contribution"},
		{tag:"CONTRIBUTION_TOTAL", desc:"User's total contribution", pointer:"total_contribution"},
	);

	//If requesting chat command helpers and there is a music
	//service available, concat the music service helpers
	if(map[key]
	&& key != TriggerTypes.MUSIC_START
	&& key != TriggerTypes.TRACK_ADDED_TO_QUEUE
	&& Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED) {
		map[key] = map[key].concat(map[TriggerTypes.TRACK_ADDED_TO_QUEUE]);
	}

	return map[key];
}

export const TriggerEvents:TriggerEventTypes[] = [
	{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", label:"Chat command", value:TriggerTypes.CHAT_COMMAND, isCategory:true, description:"Execute actions when sending a command on your chat", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE, noToggle:true},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", label:"Any message", value:TriggerTypes.ANY_MESSAGE, description:"Execute actions everytime a message is received on chat", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Channel point reward", value:TriggerTypes.REWARD_REDEEM, isCategory:true, description:"Execute actions when the following channel point reward is redeemed<br><mark>{SUB_ITEM_NAME}</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.REWARD, noToggle:true},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Community challenge progress", value:TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS, description:"Execute actions when a user contributes to a community challenge", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:"Community challenge complete", value:TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE, description:"Execute actions when a community challenge completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
	{category:TriggerEventTypeCategories.GLOBAL, icon:"info", label:"Stream info update", value:TriggerTypes.STREAM_INFO_UPDATE, description:"Execute actions when the stream info are updated", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE},
	{category:TriggerEventTypeCategories.USER, icon:"firstTime", label:"First message of a user all time", value:TriggerTypes.FIRST_ALL_TIME, description:"Execute actions when a user sends a message for the first time on your channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.USER, icon:"firstTime", label:"First message of a user today", value:TriggerTypes.FIRST_TODAY, description:"Execute actions when a user sends a message for the first time today", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.USER, icon:"returning", label:"Returning user", value:TriggerTypes.RETURNING_USER, description:"Execute actions when a user comes back after chatting at least twice in the last 30 days.", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.USER, icon:"presentation", label:"User presentation", value:TriggerTypes.PRESENTATION, description:"Execute actions when a user sends a presentation message.", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
	{category:TriggerEventTypeCategories.USER, icon:"follow", label:"Follow", value:TriggerTypes.FOLLOW, description:"Execute actions when someone follows the channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.FOLLOWING},
	{category:TriggerEventTypeCategories.USER, icon:"raid", label:"Raid", value:TriggerTypes.RAID, description:"Execute actions when someone raids the channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAID},
	{category:TriggerEventTypeCategories.USER, icon:"shoutout", label:"Shoutout given", value:TriggerTypes.SHOUTOUT_OUT, description:"Execute actions when giving a shoutout to someone", testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
	{category:TriggerEventTypeCategories.USER, icon:"shoutout", label:"Shoutout received", value:TriggerTypes.SHOUTOUT_IN, description:"Execute actions when given a shoutout on another channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
	{category:TriggerEventTypeCategories.GAMES, icon:"poll", label:"Poll result", value:TriggerTypes.POLL_RESULT, description:"Execute actions when a poll completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.POLL},
	{category:TriggerEventTypeCategories.GAMES, icon:"prediction", label:"Prediction result", value:TriggerTypes.PREDICTION_RESULT, description:"Execute actions when a prediction completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.PREDICTION},
	{category:TriggerEventTypeCategories.GAMES, icon:"ticket", label:"Raffle result", value:TriggerTypes.RAFFLE_RESULT, description:"Execute actions when a raffle completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAFFLE},
	{category:TriggerEventTypeCategories.GAMES, icon:"bingo", label:"Bingo result", value:TriggerTypes.BINGO_RESULT, description:"Execute actions when a bingo completes", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO},
	{category:TriggerEventTypeCategories.SUBITS, icon:"sub", label:"Sub", value:TriggerTypes.SUB, description:"Execute actions when someone subscribes to the channel", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
	{category:TriggerEventTypeCategories.SUBITS, icon:"gift", label:"Subgift", value:TriggerTypes.SUBGIFT, description:"Execute actions when someones subgifts someone else", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
	{category:TriggerEventTypeCategories.SUBITS, icon:"bits", label:"Bits", value:TriggerTypes.CHEER, description:"Execute actions when someone sends bits", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHEER},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train approach", value:TriggerTypes.HYPE_TRAIN_APPROACHING, description:"Execute actions when a hype train approaches", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train start", value:TriggerTypes.HYPE_TRAIN_START, description:"Execute actions when a hype train starts", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train progress", value:TriggerTypes.HYPE_TRAIN_PROGRESS, description:"Execute actions when a hype train progresses", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train end", value:TriggerTypes.HYPE_TRAIN_END, description:"Execute actions when a hype train ends", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train canceled", value:TriggerTypes.HYPE_TRAIN_CANCELED, description:"Execute actions when a hype train fails", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL},
	{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:"Hype train cooldown", value:TriggerTypes.HYPE_TRAIN_COOLDOWN, description:"Execute actions when a hype train can, be started again", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN},
	{category:TriggerEventTypeCategories.MOD, icon:"timeout", label:"User timed out", value:TriggerTypes.TIMEOUT, description:"Execute actions when a user is <mark>/timeout</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.TIMEOUT},
	{category:TriggerEventTypeCategories.MOD, icon:"ban", label:"User banned", value:TriggerTypes.BAN, description:"Execute actions when a user is <mark>/ban</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.BAN},
	{category:TriggerEventTypeCategories.MOD, icon:"unban", label:"User unbanned", value:TriggerTypes.UNBAN, description:"Execute actions when a user is <mark>/unban</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNBAN},
	{category:TriggerEventTypeCategories.MOD, icon:"vip", label:"User /vip", value:TriggerTypes.VIP, description:"Execute actions when a user is added to your VIPs", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.VIP},
	{category:TriggerEventTypeCategories.MOD, icon:"unvip", label:"User /unvip", value:TriggerTypes.UNVIP, description:"Execute actions when a user is removed from your VIPs <i>(only works when using <mark>/unvip</mark> command from twitchat</i>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNVIP},
	{category:TriggerEventTypeCategories.MOD, icon:"mod", label:"User /mod", value:TriggerTypes.MOD, description:"Execute actions when a user is added to your mods", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.MOD},
	{category:TriggerEventTypeCategories.MOD, icon:"unmod", label:"User /unmod", value:TriggerTypes.UNMOD, description:"Execute actions when a user is removed from your mods <i>(only works when using <mark>/unmod</mark> command from twitchat</i>", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNMOD},
	{category:TriggerEventTypeCategories.MOD, icon:"shield", label:"Shield mode enabled", value:TriggerTypes.SHIELD_MODE_ON, description:"Execute actions when shield mode is enabled", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE},
	{category:TriggerEventTypeCategories.MOD, icon:"shield", label:"Shield mode disabled", value:TriggerTypes.SHIELD_MODE_OFF, description:"Execute actions when shield mode is disabled", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE},
	{category:TriggerEventTypeCategories.MOD, icon:"pin", label:"Pin message", value:TriggerTypes.PIN_MESSAGE, description:"Execute actions when shield mode is disabled", testMessageType:TwitchatDataTypes.TwitchatMessageType.PINNED},
	{category:TriggerEventTypeCategories.MOD, icon:"pin", label:"Unpin message", value:TriggerTypes.UNPIN_MESSAGE, description:"Execute actions when shield mode is disabled", testMessageType:TwitchatDataTypes.TwitchatMessageType.UNPINNED},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Track added to queue", value:TriggerTypes.TRACK_ADDED_TO_QUEUE, description:"Execute actions when a music is added to the queue", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Music starts playing", value:TriggerTypes.MUSIC_START, description:"Execute actions when a music starts playing", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_START},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Music stops playing", value:TriggerTypes.MUSIC_STOP, description:"Execute actions when a music stops playing", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP},
	{beta:true, category:TriggerEventTypeCategories.TIMER, icon:"date", label:"Scheduled actions", value:TriggerTypes.SCHEDULE, description:"Execute actions regularly or at specific date/time", isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.GENERIC},
	{category:TriggerEventTypeCategories.TIMER, icon:"timer", label:"Timer start", value:TriggerTypes.TIMER_START, description:"Execute actions when a timer is started with the command <mark>/timerStart</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
	{category:TriggerEventTypeCategories.TIMER, icon:"timer", label:"Timer stop", value:TriggerTypes.TIMER_STOP, description:"Execute actions when a timer is stoped with the command <mark>/timerStop</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
	{category:TriggerEventTypeCategories.TIMER, icon:"countdown", label:"Countdown start", value:TriggerTypes.COUNTDOWN_START, description:"Execute actions when a countdown is started with the command <mark>/countdown</mark>", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
	{category:TriggerEventTypeCategories.TIMER, icon:"countdown", label:"Countdown stop", value:TriggerTypes.COUNTDOWN_STOP, description:"Execute actions when a countdown completes or is stoped", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"shoutout", label:"Shoutout (Twitchat)", value:TriggerTypes.SHOUTOUT, description:"Execute actions when doing a shoutout via <mark>/so</mark> command or shoutout button", testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT_TWITCHAT},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"emergency", label:"Emergency start", value:TriggerTypes.EMERGENCY_MODE_START, description:"Execute actions when enabling the emergency mode", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"emergency", label:"Emergency stop", value:TriggerTypes.EMERGENCY_MODE_STOP, description:"Execute actions when stopping the emergency mode", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"highlight", label:"Highlighted message", value:TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, description:"Execute actions when requesting to highlight a message", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"alert", label:"Chat alert", value:TriggerTypes.CHAT_ALERT, description:"Execute actions when the Chat Alert feature is triggered <i>(Parameters => Features => Enable chat alert)</i>", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"voicemod", label:"Voicemod - voice changed", value:TriggerTypes.VOICEMOD, description:"Execute actions when changing the voice effect on voicemod", testMessageType:TwitchatDataTypes.TwitchatMessageType.VOICEMOD},
	{beta:true, category:TriggerEventTypeCategories.OBS, icon:"list", label:"Switch to scene", value:TriggerTypes.OBS_SCENE, description:"Execute actions when switching to <mark>{SUB_ITEM_NAME}</mark> OBS scene", isCategory:true, noToggle:true},
	{beta:true, category:TriggerEventTypeCategories.OBS, icon:"show", label:"Source show", value:TriggerTypes.OBS_SOURCE_ON, description:"Execute actions when showing <mark>{SUB_ITEM_NAME}</mark> OBS source", isCategory:true, noToggle:true},
	{beta:true, category:TriggerEventTypeCategories.OBS, icon:"hide", label:"Source hide", value:TriggerTypes.OBS_SOURCE_OFF, description:"Execute actions when hiding <mark>{SUB_ITEM_NAME}</mark> OBS source", isCategory:true, noToggle:true},
]

export const TriggerMusicTypes = {
	ADD_TRACK_TO_QUEUE:"1",
	NEXT_TRACK:"2",
	PAUSE_PLAYBACK:"3",
	RESUME_PLAYBACK:"4",
	GET_CURRENT_TRACK:"5",
	START_PLAYLIST:"6",
} as const;
export type TriggerMusicTypesValue = typeof TriggerMusicTypes[keyof typeof TriggerMusicTypes];

export const MusicTriggerEvents:TriggerEventTypes[] = [
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Add a track to the queue", value:TriggerMusicTypes.ADD_TRACK_TO_QUEUE},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Play next track", value:TriggerMusicTypes.NEXT_TRACK},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Pause playback", value:TriggerMusicTypes.PAUSE_PLAYBACK},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Resume playback", value:TriggerMusicTypes.RESUME_PLAYBACK},
	{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:"Start playlist", value:TriggerMusicTypes.START_PLAYLIST},
]

export const TriggerScheduleTypes = {
	REGULAR_REPEAT:"1",
	SPECIFIC_DATES:"2",
} as const;

export const ScheduleTriggerEvents:TriggerEventTypes[] = [
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", label:"Regular repeat", value:TriggerScheduleTypes.REGULAR_REPEAT},
	{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", label:"Specific dates", value:TriggerScheduleTypes.SPECIFIC_DATES},
]