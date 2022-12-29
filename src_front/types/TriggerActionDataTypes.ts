import StoreProxy from "@/store/StoreProxy";
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
	const t = StoreProxy.i18n.t;

	const map:{[key:string]:ITriggerActionHelper[]} = {}
	map[TriggerTypes.ANY_MESSAGE] = 
	map[TriggerTypes.FIRST_TODAY] = 
	map[TriggerTypes.FIRST_ALL_TIME] = 
	map[TriggerTypes.RETURNING_USER] = 
	map[TriggerTypes.PRESENTATION] =
	map[TriggerTypes.CHAT_COMMAND] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
		{tag:"MESSAGE", desc:t('triggers.placeholders.message'), pointer:"message"},
	];
	
	map[TriggerTypes.PIN_MESSAGE] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"chatMessage.user.displayName"},
		{tag:"MESSAGE", desc:t('triggers.placeholders.message'), pointer:"chatMessage.message"},
		{tag:"MODERATOR", desc:t('triggers.placeholders.pinned_by'), pointer:"moderator.displayName"},
	];

	map[TriggerTypes.UNPIN_MESSAGE] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"chatMessage.user.displayName"},
		{tag:"MESSAGE", desc:t('triggers.placeholders.message'), pointer:"chatMessage.message"},
	];
	
	map[TriggerTypes.POLL_RESULT] = [
		{tag:"TITLE", desc:t('triggers.placeholders.poll_title'), pointer:"title"},
		{tag:"WIN", desc:t('triggers.placeholders.poll_win'), pointer:"winner.label"},
	];
	
	map[TriggerTypes.PREDICTION_RESULT] = [
		{tag:"TITLE", desc:t('triggers.placeholders.prediction_title'), pointer:"title"},
		{tag:"WIN", desc:t('triggers.placeholders.prediction_win'), pointer:"winner.label"},
	];
	
	map[TriggerTypes.BINGO_RESULT] = [
		{tag:"WINNER", desc:t('triggers.placeholders.winner'), pointer:"bingoData.winners[].displayName"},
	];
	
	map[TriggerTypes.RAFFLE_RESULT] = [
		{tag:"WINNER", desc:t('triggers.placeholders.winner'), pointer:"raffleData.winners[].label"},
	];
	
	map[TriggerTypes.SUB] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
		{tag:"SUB_TIER", desc:t('triggers.placeholders.sub_tier'), pointer:"tier"},
		{tag:"MESSAGE", desc:t('triggers.placeholders.sub_message'), pointer:"message"},
	];
	
	map[TriggerTypes.SUBGIFT] = [
		{tag:"USER", desc:t('triggers.placeholders.sub_gifter'), pointer:"user.displayName"},
		{tag:"RECIPIENT", desc:t('triggers.placeholders.sub_gift_recipient'), pointer:"gift_recipients[].displayName"},
		{tag:"SUB_TIER", desc:t('triggers.placeholders.sub_tier'), pointer:"tier"},
	];
	
	map[TriggerTypes.CHEER] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
		{tag:"BITS", desc:t('triggers.placeholders.bits'), pointer:"bits"},
		{tag:"MESSAGE", desc:t('triggers.placeholders.message'), pointer:"message"},
	];
	
	map[TriggerTypes.FOLLOW] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
	];
	
	map[TriggerTypes.RAID] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
		{tag:"TITLE", desc:t('triggers.placeholders.stream_title'), pointer:"stream.title"},
		{tag:"CATEGORY", desc:t('triggers.placeholders.stream_category'), pointer:"stream.category"},
	];
	
	map[TriggerTypes.SHOUTOUT] = [
		{tag:"USER", desc:"User that gave us a shoutout", pointer:"user.displayName"},
	];
	
	map[TriggerTypes.SHOUTOUT_IN] = [
		{tag:"USER", desc:t('triggers.placeholders.shoutout_in'), pointer:"user.displayName"},
	];
	map[TriggerTypes.SHOUTOUT_OUT] = [
		{tag:"USER", desc:t('triggers.placeholders.shoutout_out'), pointer:"user.displayName"},
	];
	
	map[TriggerTypes.REWARD_REDEEM] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
		{tag:"TITLE", desc:t('triggers.placeholders.reward_title'), pointer:"reward.title"},
		{tag:"DESCRIPTION", desc:t('triggers.placeholders.reward_description'), pointer:"reward.description"},
		{tag:"COST", desc:t('triggers.placeholders.reward_cost'), pointer:"reward.cost"},
		{tag:"MESSAGE", desc:"User message if any", pointer:"message"},
	];
	
	map[TriggerTypes.MUSIC_START] = 
	map[TriggerTypes.TRACK_ADDED_TO_QUEUE] = [
		{tag:"CURRENT_TRACK_ARTIST", desc:t('triggers.placeholders.track_artist'), pointer:"track.artist"},
		{tag:"CURRENT_TRACK_TITLE", desc:t('triggers.placeholders.track_title'), pointer:"track.title"},
		{tag:"CURRENT_TRACK_ALBUM", desc:t('triggers.placeholders.track_album'), pointer:"track.album"},
		{tag:"CURRENT_TRACK_COVER", desc:t('triggers.placeholders.track_cover'), pointer:"track.cover"},
		{tag:"CURRENT_TRACK_URL", desc:t('triggers.placeholders.track_url'), pointer:"track.url"},
	];
	
	map[TriggerTypes.STREAM_INFO_UPDATE] = [
		{tag:"TITLE", desc:t('triggers.placeholders.stream_title'), pointer:"title"},
		{tag:"CATEGORY", desc:t('triggers.placeholders.stream_category'), pointer:"category"},
	];
	
	map[TriggerTypes.HIGHLIGHT_CHAT_MESSAGE] = [
		{tag:"AVATAR", desc:t('triggers.placeholders.user_avatar'), pointer:"info.user.avatarPath"},
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"info.user.displayName"},
		{tag:"MESSAGE", desc:t('triggers.placeholders.message'), pointer:"info.message"},
	];
	
	map[TriggerTypes.CHAT_ALERT] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"message.user.displayName"},
		{tag:"ALERT", desc:t('triggers.placeholders.message'), pointer:"message.message"},
	];
	
	map[TriggerTypes.HYPE_TRAIN_START] = 
	map[TriggerTypes.HYPE_TRAIN_PROGRESS] = [
		{tag:"LEVEL", desc:t('triggers.placeholders.train_level'), pointer:"level"},
		{tag:"PERCENT", desc:t('triggers.placeholders.train_percent'), pointer:"percent"},
	];

	map[TriggerTypes.HYPE_TRAIN_END] = [
		{tag:"LEVEL", desc:t('triggers.placeholders.train_end_level'), pointer:"level"},
		{tag:"PERCENT", desc:t('triggers.placeholders.train_end_percent'), pointer:"percent"},
	];

	map[TriggerTypes.VOICEMOD] = [
		{tag:"VOICE_ID", desc:t('triggers.placeholders.voicemod_voice'), pointer:"voiceID"},
	];

	map[TriggerTypes.TIMEOUT] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
		{tag:"DURATION", desc:t('triggers.placeholders.timer_duration'), pointer:"duration_s"},
	];
	
	map[TriggerTypes.TIMER_START] = [
		{tag:"START_DATE", desc:t('triggers.placeholders.start_date'), pointer:"startAt"},
	];
	map[TriggerTypes.TIMER_STOP] = [
		{tag:"START_DATE", desc:t('triggers.placeholders.start_date'), pointer:"startAt"},
		{tag:"DURATION", desc:t('triggers.placeholders.timer_duration'), pointer:"duration"},
	];

	map[TriggerTypes.COUNTDOWN_START] = [
		{tag:"START_AT", desc:t('triggers.placeholders.start_date'), pointer:"countdown.startAt"},
		{tag:"DURATION", desc:t('triggers.placeholders.countdown_duration'), pointer:"countdown.duration"},
	]; 
	map[TriggerTypes.COUNTDOWN_STOP] = JSON.parse(JSON.stringify(map[TriggerTypes.COUNTDOWN_START]));
	map[TriggerTypes.COUNTDOWN_STOP].push(
		{tag:"END_AT", desc:t('triggers.placeholders.countdown_end_date'), pointer:"countdown.endAt"},
	)

	map[TriggerTypes.VIP] = 
	map[TriggerTypes.UNVIP] = 
	map[TriggerTypes.MOD] = 
	map[TriggerTypes.UNMOD] = 
	map[TriggerTypes.UNBAN] = 
	map[TriggerTypes.BAN] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
	];

	map[TriggerTypes.SHOUTOUT] = [
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
		{tag:"AVATAR", desc:t('triggers.placeholders.user_avatar'), pointer:"user.avatarPath"},
		{tag:"TITLE", desc:t('triggers.placeholders.stream_title'), pointer:"stream.title"},
		{tag:"CATEGORY", desc:t('triggers.placeholders.stream_category'), pointer:"stream.category"},
	];
	
	map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE] = [
		{tag:"TITLE", desc:t('triggers.placeholders.challenge_title'), pointer:"challenge.title"},
		{tag:"DESCRIPTION", desc:t('triggers.placeholders.challenge_description'), pointer:"challenge.description"},
		{tag:"GOAL", desc:t('triggers.placeholders.challenge_goal'), pointer:"challenge.goal"},
		{tag:"CURRENT", desc:t('triggers.placeholders.challenge_current'), pointer:"challenge.progress"},
	];

	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS] = JSON.parse(JSON.stringify(map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE]));
	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS].push(
		{tag:"USER", desc:t('triggers.placeholders.user'), pointer:"user.displayName"},
		{tag:"CONTRIBUTION", desc:t('triggers.placeholders.challenge_contribution'), pointer:"contribution"},
		{tag:"CONTRIBUTION_TOTAL", desc:t('triggers.placeholders.challenge_contribution_total'), pointer:"total_contribution"},
	);

	//If requesting chat command helpers and there is a music
	//service available, concat the music service helpers
	if(map[key]
	&& key != TriggerTypes.MUSIC_START
	&& key != TriggerTypes.TRACK_ADDED_TO_QUEUE
	&& Config.instance.MUSIC_SERVICE_CONFIGURED_AND_CONNECTED) {
		map[key] = map[key].concat(map[TriggerTypes.TRACK_ADDED_TO_QUEUE]);
	}

	return map[key] ?? [];
}

export function TriggerEvents():TriggerEventTypes[] {
	const t = StoreProxy.i18n.t;
	return [
		{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", label:t("triggers.events.CHAT_COMMAND.label"), value:TriggerTypes.CHAT_COMMAND, isCategory:true, description:t("triggers.events.CHAT_COMMAND.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE, noToggle:true},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"whispers", label:t("triggers.events.ANY_MESSAGE.label"), value:TriggerTypes.ANY_MESSAGE, description:t("triggers.events.ANY_MESSAGE.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:t("triggers.events.REWARD_REDEEM.label"), value:TriggerTypes.REWARD_REDEEM, isCategory:true, description:t("triggers.events.REWARD_REDEEM.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.REWARD, noToggle:true},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:t("triggers.events.COMMUNITY_CHALLENGE_PROGRESS.label"), value:TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS, description:t("triggers.events.COMMUNITY_CHALLENGE_PROGRESS.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"channelPoints", label:t("triggers.events.COMMUNITY_CHALLENGE_COMPLETE.label"), value:TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE, description:t("triggers.events.COMMUNITY_CHALLENGE_COMPLETE.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
		{category:TriggerEventTypeCategories.GLOBAL, icon:"info", label:t("triggers.events.STREAM_INFO_UPDATE.label"), value:TriggerTypes.STREAM_INFO_UPDATE, description:t("triggers.events.STREAM_INFO_UPDATE.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE},
		{category:TriggerEventTypeCategories.USER, icon:"firstTime", label:t("triggers.events.FIRST_ALL_TIME.label"), value:TriggerTypes.FIRST_ALL_TIME, description:t("triggers.events.FIRST_ALL_TIME.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"firstTime", label:t("triggers.events.FIRST_TODAY.label"), value:TriggerTypes.FIRST_TODAY, description:t("triggers.events.FIRST_TODAY.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"returning", label:t("triggers.events.RETURNING_USER.label"), value:TriggerTypes.RETURNING_USER, description:t("triggers.events.RETURNING_USER.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"presentation", label:t("triggers.events.PRESENTATION.label"), value:TriggerTypes.PRESENTATION, description:t("triggers.events.PRESENTATION.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"follow", label:t("triggers.events.FOLLOW.label"), value:TriggerTypes.FOLLOW, description:t("triggers.events.FOLLOW.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.FOLLOWING},
		{category:TriggerEventTypeCategories.USER, icon:"raid", label:t("triggers.events.RAID.label"), value:TriggerTypes.RAID, description:t("triggers.events.RAID.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.RAID},
		{category:TriggerEventTypeCategories.GAMES, icon:"poll", label:t("triggers.events.POLL_RESULT.label"), value:TriggerTypes.POLL_RESULT, description:t("triggers.events.POLL_RESULT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.POLL},
		{category:TriggerEventTypeCategories.GAMES, icon:"prediction", label:t("triggers.events.PREDICTION_RESULT.label"), value:TriggerTypes.PREDICTION_RESULT, description:t("triggers.events.PREDICTION_RESULT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.PREDICTION},
		{category:TriggerEventTypeCategories.GAMES, icon:"ticket", label:t("triggers.events.RAFFLE_RESULT.label"), value:TriggerTypes.RAFFLE_RESULT, description:t("triggers.events.RAFFLE_RESULT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.RAFFLE},
		{category:TriggerEventTypeCategories.GAMES, icon:"bingo", label:t("triggers.events.BINGO_RESULT.label"), value:TriggerTypes.BINGO_RESULT, description:t("triggers.events.BINGO_RESULT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO},
		{category:TriggerEventTypeCategories.SUBITS, icon:"sub", label:t("triggers.events.SUB.label"), value:TriggerTypes.SUB, description:t("triggers.events.SUB.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
		{category:TriggerEventTypeCategories.SUBITS, icon:"gift", label:t("triggers.events.SUBGIFT.label"), value:TriggerTypes.SUBGIFT, description:t("triggers.events.SUBGIFT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
		{category:TriggerEventTypeCategories.SUBITS, icon:"bits", label:t("triggers.events.CHEER.label"), value:TriggerTypes.CHEER, description:t("triggers.events.CHEER.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.CHEER},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:t("triggers.events.HYPE_TRAIN_APPROACHING.label"), value:TriggerTypes.HYPE_TRAIN_APPROACHING, description:t("triggers.events.HYPE_TRAIN_APPROACHING.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:t("triggers.events.HYPE_TRAIN_START.label"), value:TriggerTypes.HYPE_TRAIN_START, description:t("triggers.events.HYPE_TRAIN_START.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:t("triggers.events.HYPE_TRAIN_PROGRESS.label"), value:TriggerTypes.HYPE_TRAIN_PROGRESS, description:t("triggers.events.HYPE_TRAIN_PROGRESS.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:t("triggers.events.HYPE_TRAIN_END.label"), value:TriggerTypes.HYPE_TRAIN_END, description:t("triggers.events.HYPE_TRAIN_END.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:t("triggers.events.HYPE_TRAIN_CANCELED.label"), value:TriggerTypes.HYPE_TRAIN_CANCELED, description:t("triggers.events.HYPE_TRAIN_CANCELED.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", label:t("triggers.events.HYPE_TRAIN_COOLDOWN.label"), value:TriggerTypes.HYPE_TRAIN_COOLDOWN, description:t("triggers.events.HYPE_TRAIN_COOLDOWN.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN},
		{category:TriggerEventTypeCategories.MOD, icon:"shoutout", label:t("triggers.events.SHOUTOUT_OUT.label"), value:TriggerTypes.SHOUTOUT_OUT, description:t("triggers.events.SHOUTOUT_OUT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
		{category:TriggerEventTypeCategories.MOD, icon:"shoutout", label:t("triggers.events.SHOUTOUT_IN.label"), value:TriggerTypes.SHOUTOUT_IN, description:t("triggers.events.SHOUTOUT_IN.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
		{category:TriggerEventTypeCategories.MOD, icon:"shield", label:t("triggers.events.SHIELD_MODE_ON.label"), value:TriggerTypes.SHIELD_MODE_ON, description:t("triggers.events.SHIELD_MODE_ON.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE},
		{category:TriggerEventTypeCategories.MOD, icon:"shield", label:t("triggers.events.SHIELD_MODE_OFF.label"), value:TriggerTypes.SHIELD_MODE_OFF, description:t("triggers.events.SHIELD_MODE_OFF.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE},
		{category:TriggerEventTypeCategories.MOD, icon:"pin", label:t("triggers.events.PIN_MESSAGE.label"), value:TriggerTypes.PIN_MESSAGE, description:t("triggers.events.PIN_MESSAGE.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.PINNED},
		{category:TriggerEventTypeCategories.MOD, icon:"pin", label:t("triggers.events.UNPIN_MESSAGE.label"), value:TriggerTypes.UNPIN_MESSAGE, description:t("triggers.events.UNPIN_MESSAGE.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.UNPINNED},
		{category:TriggerEventTypeCategories.MOD, icon:"timeout", label:t("triggers.events.TIMEOUT.label"), value:TriggerTypes.TIMEOUT, description:t("triggers.events.TIMEOUT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.TIMEOUT},
		{category:TriggerEventTypeCategories.MOD, icon:"ban", label:t("triggers.events.BAN.label"), value:TriggerTypes.BAN, description:t("triggers.events.BAN.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.BAN},
		{category:TriggerEventTypeCategories.MOD, icon:"unban", label:t("triggers.events.UNBAN.label"), value:TriggerTypes.UNBAN, description:t("triggers.events.UNBAN.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNBAN},
		{category:TriggerEventTypeCategories.MOD, icon:"vip", label:t("triggers.events.VIP.label"), value:TriggerTypes.VIP, description:t("triggers.events.VIP.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.VIP},
		{category:TriggerEventTypeCategories.MOD, icon:"unvip", label:t("triggers.events.UNVIP.label"), value:TriggerTypes.UNVIP, description:t("triggers.events.UNVIP.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNVIP},
		{category:TriggerEventTypeCategories.MOD, icon:"mod", label:t("triggers.events.MOD.label"), value:TriggerTypes.MOD, description:t("triggers.events.MOD.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.MOD},
		{category:TriggerEventTypeCategories.MOD, icon:"unmod", label:t("triggers.events.UNMOD.label"), value:TriggerTypes.UNMOD, description:t("triggers.events.UNMOD.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNMOD},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:t("triggers.events.TRACK_ADDED_TO_QUEUE.label"), value:TriggerTypes.TRACK_ADDED_TO_QUEUE, description:t("triggers.events.TRACK_ADDED_TO_QUEUE.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:t("triggers.events.MUSIC_START.label"), value:TriggerTypes.MUSIC_START, description:t("triggers.events.MUSIC_START.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_START},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:t("triggers.events.MUSIC_STOP.label"), value:TriggerTypes.MUSIC_STOP, description:t("triggers.events.MUSIC_STOP.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP},
		{beta:true, category:TriggerEventTypeCategories.TIMER, icon:"date", label:t("triggers.events.SCHEDULE.label"), value:TriggerTypes.SCHEDULE, description:t("triggers.events.SCHEDULE.description"), isCategory:true, noToggle:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.GENERIC},
		{category:TriggerEventTypeCategories.TIMER, icon:"timer", label:t("triggers.events.TIMER_START.label"), value:TriggerTypes.TIMER_START, description:t("triggers.events.TIMER_START.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
		{category:TriggerEventTypeCategories.TIMER, icon:"timer", label:t("triggers.events.TIMER_STOP.label"), value:TriggerTypes.TIMER_STOP, description:t("triggers.events.TIMER_STOP.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
		{category:TriggerEventTypeCategories.TIMER, icon:"countdown", label:t("triggers.events.COUNTDOWN_START.label"), value:TriggerTypes.COUNTDOWN_START, description:t("triggers.events.COUNTDOWN_START.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
		{category:TriggerEventTypeCategories.TIMER, icon:"countdown", label:t("triggers.events.COUNTDOWN_STOP.label"), value:TriggerTypes.COUNTDOWN_STOP, description:t("triggers.events.COUNTDOWN_STOP.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"shoutout", label:t("triggers.events.SHOUTOUT.label"), value:TriggerTypes.SHOUTOUT, description:t("triggers.events.SHOUTOUT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT_TWITCHAT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"emergency", label:t("triggers.events.EMERGENCY_MODE_START.label"), value:TriggerTypes.EMERGENCY_MODE_START, description:t("triggers.events.EMERGENCY_MODE_START.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"emergency", label:t("triggers.events.EMERGENCY_MODE_STOP.label"), value:TriggerTypes.EMERGENCY_MODE_STOP, description:t("triggers.events.EMERGENCY_MODE_STOP.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMERGENCY_MODE},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"highlight", label:t("triggers.events.HIGHLIGHT_CHAT_MESSAGE.label"), value:TriggerTypes.HIGHLIGHT_CHAT_MESSAGE, description:t("triggers.events.HIGHLIGHT_CHAT_MESSAGE.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"alert", label:t("triggers.events.CHAT_ALERT.label"), value:TriggerTypes.CHAT_ALERT, description:t("triggers.events.CHAT_ALERT.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"voicemod", label:t("triggers.events.VOICEMOD.label"), value:TriggerTypes.VOICEMOD, description:t("triggers.events.VOICEMOD.description"), testMessageType:TwitchatDataTypes.TwitchatMessageType.VOICEMOD},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"list", label:t("triggers.events.OBS_SCENE.label"), value:TriggerTypes.OBS_SCENE, description:t("triggers.events.OBS_SCENE.description"), isCategory:true, noToggle:true},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"show", label:t("triggers.events.OBS_SOURCE_ON.label"), value:TriggerTypes.OBS_SOURCE_ON, description:t("triggers.events.OBS_SOURCE_ON.description"), isCategory:true, noToggle:true},
		{beta:true, category:TriggerEventTypeCategories.OBS, icon:"hide", label:t("triggers.events.OBS_SOURCE_OFF.label"), value:TriggerTypes.OBS_SOURCE_OFF, description:t("triggers.events.OBS_SOURCE_OFF.description"), isCategory:true, noToggle:true},
	]
}

export const TriggerMusicTypes = {
	ADD_TRACK_TO_QUEUE:"1",
	NEXT_TRACK:"2",
	PAUSE_PLAYBACK:"3",
	RESUME_PLAYBACK:"4",
	GET_CURRENT_TRACK:"5",
	START_PLAYLIST:"6",
} as const;
export type TriggerMusicTypesValue = typeof TriggerMusicTypes[keyof typeof TriggerMusicTypes];

export function MusicTriggerEvents():TriggerEventTypes[] {
	const t = StoreProxy.i18n.t;
	return [
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:t("triggers.musicEvents.ADD_TRACK_TO_QUEUE"), value:TriggerMusicTypes.ADD_TRACK_TO_QUEUE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:t("triggers.musicEvents.NEXT_TRACK"), value:TriggerMusicTypes.NEXT_TRACK},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:t("triggers.musicEvents.PAUSE_PLAYBACK"), value:TriggerMusicTypes.PAUSE_PLAYBACK},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:t("triggers.musicEvents.RESUME_PLAYBACK"), value:TriggerMusicTypes.RESUME_PLAYBACK},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", label:t("triggers.musicEvents.START_PLAYLIST"), value:TriggerMusicTypes.START_PLAYLIST},
	]
}

export const TriggerScheduleTypes = {
	REGULAR_REPEAT:"1",
	SPECIFIC_DATES:"2",
} as const;

export function ScheduleTriggerEvents():TriggerEventTypes[] {
	const t = StoreProxy.i18n.t;
	return [
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", label:t("triggers.scheduleEvents.REGULAR_REPEAT"), value:TriggerScheduleTypes.REGULAR_REPEAT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", label:t("triggers.scheduleEvents.SPECIFIC_DATES"), value:TriggerScheduleTypes.SPECIFIC_DATES},
	]
}