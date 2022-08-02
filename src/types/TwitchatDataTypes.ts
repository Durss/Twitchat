import type { ChatUserstate } from "tmi.js";
import type { TwitchDataTypes } from "./TwitchDataTypes";

export type ParamsContenType = 'appearance'
							| 'filters'
							| 'account'
							| 'about'
							| 'features'
							| 'obs'
							| 'eventsAction'
							| 'sponsor'
							| 'streamdeck'
							| 'triggers'
							| 'overlays'
							| 'emergency'
							| 'spoiler'
							| 'alert'
							| 'voice'
							| null ;

export type BotMessageField = "raffle" | "bingo" | "raffleStart" | "bingoStart" | "shoutout";
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

export type RoomStatusCategory = "emotesOnly"|"followersOnly"|"subsOnly"|"slowMode";
export interface IRoomStatusCategory {
	emotesOnly:ParameterData;
	followersOnly:ParameterData;
	subsOnly:ParameterData;
	slowMode:ParameterData;
}

export type ParameterCategory = "appearance" | "filters"| "features";
export interface IParameterCategory {
	appearance:{[key:string]:ParameterData};
	filters:{[key:string]:ParameterData};
	features:{[key:string]:ParameterData};
}

export type AccountParamsCategory = "syncDataWithServer";
export interface IAccountParamsCategory {
	syncDataWithServer:ParameterData;
}


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
	chatCommand?:string;
	prevKey?:string;
	permissions?:PermissionsData;
	cooldown?:{global:number, user:number};
	actions:TriggerActionTypes[];
}

export type TriggerActionTypes =  TriggerActionEmptyData
								| TriggerActionObsData
								| TriggerActionChatData
								| TriggerActionMusicEntryData
;

export interface TriggerEventTypes extends ParameterDataListValue {
	label:string;
	value:string;
	description?:string,
	isCategory?:boolean,
	jsonTest?:unknown,
}

export interface TriggerActionData {
	id:string;
	delay:number;
}
export interface TriggerActionEmptyData extends TriggerActionData{
	type:"";
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

export interface TriggerActionMusicEntryData extends TriggerActionData{
	type:"music";
	musicAction:string;
	track:string;
	confirmMessage:string;
	playlist:string;
}

export interface ParameterDataListValue {
	label:string;
	value:string | number | boolean | undefined;
	[paramater: string]: unknown;
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
	placeholder?:string;
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
	started_at:number;
	timeLeft:number;
	state:"APPROACHING" | "START" | "PROGRESSING" | "LEVEL_UP" | "COMPLETED" | "EXPIRE";
	is_boost_train:boolean;
}

export interface CommandData {
	id:string;
	cmd:string;
	details:string;
	needChannelPoints?:boolean;
}

export interface PermissionsData {
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
}

export interface InstallHandler {
	prompt:()=>void;
	userChoice:Promise<{outcome:"accepted"}>;
}

export interface WheelItem {
	id:string;
	label:string;
	data:unknown;
}

export interface WheelData {
	items:WheelItem[];
	winner:WheelItem;
}

export interface MusicMessage {
	type:"music",
	title:string,
	artist:string,
	album:string,
	cover:string,
	duration:number,
	url:string,
    [paramater: string]: unknown;//This is here to avoid lint errors on dynamic pointers
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
}

export interface MusicTriggerData {
	type:"musicEvent";
	start:boolean;
	music?:MusicMessage;
}