import type { RaffleData, WheelItem } from "@/utils/CommonDataTypes";
import type { ChatUserstate } from "tmi.js";
import type { TwitchDataTypes } from "./TwitchDataTypes";


export const ParamsContentType = {
	APPEARANCE: "appearance",
	FILTERS: "filters",
	ACCOUNT: "account",
	ABOUT: "about",
	FEATURES: "features",
	OBS: "obs",
	SPONSOR: "sponsor",
	STREAMDECK: "streamdeck",
	TRIGGERS: "triggers",
	OVERLAYS: "overlays",
	EMERGENCY: "emergency",
	SPOILER: "spoiler",
	ALERT: "alert",
	TTS: "tts",
	VOICE: "voice",
	AUTOMOD: "autmod",
	VOICEMOD: "voicemod",
} as const;
export type ParamsContentStringType = typeof ParamsContentType[keyof typeof ParamsContentType]|null;

export interface IBotMessage {
	bingo:BotMessageEntry;
	bingoStart:BotMessageEntry;
	raffle:BotMessageEntry;
	raffleJoin:BotMessageEntry;
	raffleStart:BotMessageEntry;
	shoutout:BotMessageEntry;
}
export interface BotMessageEntry {
	enabled:boolean;
	message:string;
}
export type BotMessageField = keyof IBotMessage;

export interface IRoomStatusCategory {
	emotesOnly:ParameterData;
	followersOnly:ParameterData;
	subsOnly:ParameterData;
	slowMode:ParameterData;
}
export type RoomStatusCategory = keyof IRoomStatusCategory;

export interface IParameterCategory {
	appearance:{[key:string]:ParameterData};
	filters:{[key:string]:ParameterData};
	features:{[key:string]:ParameterData};
}
export type ParameterCategory = keyof IParameterCategory;

export interface IAccountParamsCategory {
	syncDataWithServer:ParameterData;
}
export type AccountParamsCategory = keyof IAccountParamsCategory;


export interface OBSSceneCommand {
	scene:{
		sceneIndex:number;
		sceneName:string;
	}
	command:string;
}

export interface OBSMuteUnmuteCommands {
	audioSourceName:string;
	muteCommand:string;
	unmuteCommand:string;
}

export interface TriggerData {
	enabled:boolean;
	name?:string;//This should be replaced by the more generic "name" but i'm too lazy to make data migration for now :3
	prevKey?:string;
	permissions?:PermissionsData;
	cooldown?:{global:number, user:number};
	actions:TriggerActionTypes[];
	/**
	 * @deprecated Only here for typings on data migration. User "name" property
	 */
	chatCommand?:string
}

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
;
export type TriggerActionStringTypes = "obs"|"chat"|"music"|"tts"|"raffle"|"bingo"|"voicemod"|"highlight"|"trigger"|null;

export const TriggerEventTypeCategories = {
	GLOBAL: 1,
	USER: 2,
	SUBITS: 3,
	MOD: 4,
	TWITCHAT: 5,
	HYPETRAIN: 6,
	GAMES: 7,
	MUSIC: 8,
	TIMER: 9,
} as const;
export type TriggerEventTypeCategoryValue = typeof TriggerEventTypeCategories[keyof typeof TriggerEventTypeCategories];
export interface TriggerEventTypes extends ParameterDataListValue {
	category:TriggerEventTypeCategoryValue;
	label:string;
	value:string;
	icon:string,
	description?:string,
	isCategory?:boolean,
	jsonTest?:unknown,
}

export interface TriggerActionData {
	id:string;
	delay:number;
}
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
	raffleData:RaffleData;
}

export interface TriggerActionBingoData extends TriggerActionData{
	type:"bingo";
	bingoData:BingoConfig;
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

export const ChatMessageInfoDataType = {
	AUTOMOD: "automod",
	WHISPER: "whisper",
	EMERGENCY_BLOCKED: "emergencyBlocked",
} as const;
export type ChatMessageInfoDataStringType = typeof ChatMessageInfoDataType[keyof typeof ChatMessageInfoDataType];
export interface ChatMessageInfoData {
	type:ChatMessageInfoDataStringType;
	label?:string;
	tooltip?:string;
}


export interface ParameterDataListValue {
	label:string;
	value:string | number | boolean | undefined;
	icon?:string;
	[parameter: string]: unknown;
}

export interface ParameterData {
	id?:number;
	type:"toggle"|"slider"|"number"|"text"|"password"|"list"|"browse";
	value:boolean|number|string|string[]|undefined;
	listValues?:ParameterDataListValue[];
	longText?:boolean;
	noInput?:boolean;//Disable input to only keep title (used for shoutout param)
	label:string;
	min?:number;//min numeric value
	max?:number;//max numeric value
	step?:number;//For numeric values
	maxLength?:number;
	icon?:string;
	iconURL?:string;
	placeholder?:string;//Placeholder for the input
	placeholderList?:PlaceholderEntry[];//creates clickable {XXX} placeholders
	parent?:number;
	example?:string;//Displays an icon with a tooltip containing the specified image example
	storage?:unknown;//Just a field to allow storage of random data if necessary
	children?:ParameterData[];
	accept?:string;//File types for browse inputs
	fieldName?:string;
	save?:boolean;//Save configuration to storage on change?
	tooltip?:string;//Tooltip displayed on hover
}

export interface BingoConfig {
	guessNumber:boolean;
	guessEmote:boolean;
	min:number;
	max:number;
}

export interface ChatPollData {
	command:string;
	startTime:number;
	duration:number;
	allowMultipleAnswers:boolean;
	choices:ChatPollDataChoice[];
	winners:ChatPollDataChoice[];
}

export interface ChatPollDataChoice {
	user:ChatUserstate;
	text:string;
}

export interface HypeTrainStateData {
	level:number;
	currentValue:number;
	goal:number;
	approached_at:number;
	started_at:number;
	updated_at:number;
	timeLeft:number;
	state:"APPROACHING" | "START" | "PROGRESSING" | "LEVEL_UP" | "COMPLETED" | "EXPIRE";
	is_boost_train:boolean;
}

export interface CommandData {
	id:string;
	cmd:string;
	details:string;
	needChannelPoints?:boolean;
	needTTS?:boolean;
}

export interface PermissionsData {
	broadcaster:boolean;
	mods:boolean;
	vips:boolean;
	subs:boolean;
	all:boolean;
	users:string;
}

export const TwitchatAdTypes = {
	SPONSOR:1,
	UPDATES:2,
	TIP_AND_TRICK:3,
	DISCORD:4,
	UPDATE_WARNING:5,
}

export interface InstallHandler {
	prompt:()=>void;
	userChoice:Promise<{outcome:"accepted"}>;
}

export interface WheelData {
	items:WheelItem[];
	winner:string;
}

export interface MusicMessage {
	type:"music",
	title:string,
	artist:string,
	album:string,
	cover:string,
	duration:number,
	url:string,
    [parameter: string]: unknown;//This is here to avoid lint errors on dynamic pointers
}

export interface StreamInfoUpdate {
	type:"streamInfoUpdate",
	title:string,
	category:string,
}

export interface EmergencyModeInfo {
	type:"emergencyMode",
	enabled:boolean,
}

export interface PlaceholderEntry {
	tag:string;
	desc:string;
}

export interface StreamInfoPreset {
	id: string;
	name: string;
	title: string;
	categoryID?: string;
	tagIDs?: string[];
}

export interface CountdownData {
	startAt:number;
	duration:number;
	timeoutRef:number;
}

export interface TimerData {
	startAt:number;
	duration?:number;
}

export interface TTSParamsData {
	enabled: boolean;
	volume: number;
	rate: number;
	pitch: number;
	voice: string;
	removeEmotes: boolean;
	maxLength: number;
	maxDuration: number;
	timeout: number;
	removeURL: boolean;
	replaceURL: string;
	inactivityPeriod: number;
	readMessages:boolean;
	readMessagePatern: string;
	readWhispers:boolean;
	readWhispersPattern: string;
	readNotices:boolean;
	readNoticesPattern: string;
	readRewards: boolean;
	readRewardsPattern: string;
	readSubs: boolean;
	readSubsPattern:string;
	readSubgifts:boolean,
	readSubgiftsPattern:string,
	readBits: boolean;
	readBitsMinAmount: number;
	readBitsPattern:string;
	readRaids: boolean;
	readRaidsPattern:string;
	readFollow: boolean;
	readFollowPattern:string;
	readPolls: boolean;
	readPollsPattern:string;
	readBingos: boolean;
	readBingosPattern:string;
	readRaffle: boolean;
	readRafflePattern:string;
	readPredictions: boolean;
	readPredictionsPattern:string;
	ttsPerms:PermissionsData;
}

export interface EmergencyParamsData {
	enabled:boolean;
	chatCmd:string;
	chatCmdPerms:PermissionsData;
	emotesOnly:boolean;
	subOnly:boolean;
	slowMode:boolean;
	followOnly:boolean;
	noTriggers:boolean;
	autoBlockFollows:boolean;
	autoUnblockFollows:boolean;
	autoEnableOnFollowbot:boolean;
	followOnlyDuration:number;
	slowModeDuration:number;
	toUsers:string;
	obsScene:string;
	obsSources:string[];
}

export interface EmergencyFollowerData {
	uid:string;
	login:string;
	date:number;
	blocked:boolean;
	unblocked:boolean;
	banned?:boolean;
}

export interface ChatHighlightInfo {
	type:"chatOverlayHighlight",
	message?:string,
	user?:TwitchDataTypes.UserInfo,
	params?:ChatHighlightOverlayData,
}

export interface ChatHighlightOverlayData {
	position:"tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
}

export interface SpoilerParamsData {
	permissions:PermissionsData;
}
export interface AlertParamsData {
	chatCmd:string;
	permissions:PermissionsData;
	blink:boolean;
	shake:boolean;
	sound:boolean;
	message:boolean;
}

export interface ChatAlertInfo {
	type:"chatAlert",
	message:unknown,//The proper type should be IRCEventDataList.Message; but to avoid circular imports i've set it to unknown -_-
}

export interface AnchorData {
	label:string;
	icon:string;
	div:HTMLElement;
	selected:boolean;
}

export interface MusicPlayerParamsData {
	autoHide:boolean;
	erase:boolean;
	showCover:boolean;
	showArtist:boolean;
	showTitle:boolean;
	showProgressbar:boolean;
	openFromLeft:boolean;
	noScroll:boolean;
	customInfoTemplate:string;
}

export interface MusicTriggerData {
	type:"musicEvent";
	start:boolean;
	music?:MusicMessage;
}

export interface HypeTrainTriggerData {
	type:"hypeTrainApproach"|"hypeTrainStart"|"hypeTrainProgress"|"hypeTrainEnd";
	level:number;
	percent:number;
	state?:"APPROACHING" | "START" | "PROGRESSING" | "LEVEL_UP" | "COMPLETED" | "EXPIRE";
}

export interface VoicemodParamsData {
	enabled:boolean;
	voiceIndicator:boolean;
	commandToVoiceID:{[key:string]:string};
	chatCmdPerms:PermissionsData;
}

export interface VoicemodTriggerData {
	type:"voicemod";
	voiceID?:string;
}

export interface AutomodParamsData {
	enabled:boolean;
	banUserNames:boolean;
	keywordsFilters:AutomodParamsKeywordFilterData[];
	exludedUsers:PermissionsData;
}

export interface AutomodParamsKeywordFilterData {
	id:string;
	enabled:boolean;
	label:string;
	regex:string;
	serverSync:boolean;
}

export interface ShoutoutTriggerData {
	type:"shoutout";
	user:TwitchDataTypes.UserInfo;
	stream:TwitchDataTypes.ChannelInfo;
}

export interface BanTriggerData {
	type:"ban";
	user:string;
}

export interface UnbanTriggerData {
	type:"unban";
	user:string;
}

export interface ModTriggerData {
	type:"mod";
	user:string;
}

export interface UnmodTriggerData {
	type:"unmod";
	user:string;
}

export interface VIPTriggerData {
	type:"vip";
	user:string;
}

export interface UnVIPTriggerData {
	type:"unvip";
	user:string;
}

export interface TimeoutTriggerData {
	type:"timeout";
	user:string;
	duration:number;
}