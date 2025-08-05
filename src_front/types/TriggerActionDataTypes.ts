import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import GoXLRSocket from "@/utils/goxlr/GoXLRSocket";
import SpotifyHelper from "@/utils/music/SpotifyHelper";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { reactive } from "vue";
import type { GoXLRTypes } from "./GoXLRTypes";
import { TwitchatDataTypes } from "./TwitchatDataTypes";
import type { JSFXRSoundPreset, SFXRSoundParams } from "./jsfxr";
import type { TwitchDataTypes } from "./twitch/TwitchDataTypes";

/**
 * Util to strongly type string object paths.
 */
type Path<T, Prefix extends string = ''> = Prefix extends ''
	? RecursivePath<T>
	: `${Prefix}.${RecursivePath<T>}`;

type RecursivePath<T> = T extends Array<infer U>
	? U extends object
	? `${number}.${RecursivePath<U>}`
	: `${number}`
	: T extends object
	? {
		[P in keyof T]: (P & string) | `${P & string}.${RecursivePath<T[P]>}`
	}[keyof T]
	: never;

// interface Test {
// 	name?: string;
// 	myProp: string;
// 	myOptionalobj?: {
// 		foo: boolean;
// 	};
// 	arrayProp?:{test:string}[];
// }


export interface TriggerCallStack {
	id:string;
	/**
	 * Function to call to resume execution
	 * @returns
	 */
	resume?:()=>void;
	/**
	 * Details about all triggers executions
	 */
	stack: {
		date:number;
		triggerId:string;
	}[];
}

// type myType1 = Path<Test>;
// type myType = Path<Test, "prefix">;
// const a: Path<Test, "myPrefix"> = "myPrefix.myProp"; // valid
// const b: Path<Test, "myPrefix"> = "myPrefix.myOptionalobj.foo"; // valid
// const d: Path<Test, "myPrefix"> = "myPrefix.arrayProp.0.test"; // invalid
// const e: Path<Test, "myPrefix"> = "myPrefix.blabla"; // invalid
// const f: Path<Test, "myPrefix"> = "myPrefix.name"; // valid

export type TriggerActionTypes = {enabled?:boolean} &
								( TriggerActionEmptyData
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
								| TriggerActionCustomMessageData
								| TriggerActionHeatClickData
								| TriggerActionRewardData
								| TriggerActionExtensionData
								| TriggerActionDiscordData
								| TriggerActionLumiaData
								| TriggerActionBingoGridData
								| TriggerActionDeleteMessageData
								| TriggerActionSpoilMessageData
								| TriggerActionStreamerbotData
								| TriggerActionSammiData
								| TriggerActionMixitupData
								| TriggerActionPlayabilityData
								| TriggerActionGroqData
								| TriggerActionTimerData
								| TriggerActionStopExecData
								| TriggerActionChatPollData
								| TriggerActionAnimatedTextData
								| TriggerActionCustomTrainData
								| TriggerActionSFXRData
								| TriggerActionJSONExtractData
							);

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
	 * Trigger enabled for events coming from remote channels ?
	 * Defaults to false.
	 * Premium-only feature
	 */
	enableForRemoteChans?:boolean;
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
	 * Delay before an ad starts
	 */
	adBreakDelay?:number;
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
	 * Execution priority within queue
	 */
	queuePriority?:number;
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
	 * Conditions to be matched for the trigger to be executed
	 */
	conditions?:TriggerConditionGroup;
	/**
	 * Should this trigger be displayed on the context menu opened when
	 * right clicking a chat message ?
	 * Only for slash command triggers
	 */
	addToContextMenu?:boolean;
	/**
	 * Should this command be added to discord?
	 */
	addToDiscord?:boolean;
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
	heatClickSource?:"obs" | "area" | "all";

	/**
	 * @deprecated Only here for typings on data migration.
	*/
	prevKey?:string;
}

export interface TriggerScheduleData {
	type:TriggerScheduleTypesValue|"0";
	repeatDuration:number;
	repeatMinMessages:number;
	dates:{daily:boolean, monthly:boolean, yearly:boolean, value:string}[];
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

export const TriggerConditionOperatorList = [">","<",">=","<=","=","!=","contains","not_contains","starts_with","not_starts_with","ends_with","not_ends_with","empty","not_empty","longer_than","shorter_than"] as const;
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

export interface SocketParams {
	ip:string;
	port:number;
	secured:boolean;
}


export interface TriggerEventTypeCategory {
	id:number,
	labelKey:string;
	icons:string[];
}
//Main trigger categories displayed on the parameter "Triggers" section
export const TriggerEventTypeCategories = {
	CHAT_REWARDS:	{id:1, labelKey:"triggers.categories.global", icons:["whispers"]} as TriggerEventTypeCategory,
	TIMER:			{id:2, labelKey:"triggers.categories.timer", icons:["timer"]} as TriggerEventTypeCategory,
	TWITCHAT:		{id:3, labelKey:"triggers.categories.twitchat", icons:["twitchat"]} as TriggerEventTypeCategory,
	USER:			{id:4, labelKey:"triggers.categories.user", icons:["user"]} as TriggerEventTypeCategory,
	SUBITS:			{id:5, labelKey:"triggers.categories.subits", icons:["coin"]} as TriggerEventTypeCategory,
	MOD:			{id:6, labelKey:"triggers.categories.mod", icons:["mod"]} as TriggerEventTypeCategory,
	HYPETRAIN:		{id:7, labelKey:"triggers.categories.hypetrain", icons:["train"]} as TriggerEventTypeCategory,
	CUSTOM_TRAIN:	{id:8, labelKey:"triggers.categories.custom_train", icons:["train"]} as TriggerEventTypeCategory,
	GAMES:			{id:9, labelKey:"triggers.categories.games", icons:["ticket"]} as TriggerEventTypeCategory,
	MUSIC:			{id:10, labelKey:"triggers.categories.music", icons:["spotify"]} as TriggerEventTypeCategory,
	OBS:			{id:11, labelKey:"triggers.categories.obs", icons:["obs"]} as TriggerEventTypeCategory,
	MISC:			{id:12, labelKey:"triggers.categories.misc", icons:["broadcast"]} as TriggerEventTypeCategory,
	COUNTER_VALUE:	{id:13, labelKey:"triggers.categories.count_and_values", icons:["count", "placeholder"]} as TriggerEventTypeCategory,
	GOXLR:			{id:14, labelKey:"triggers.categories.goxlr", icons:["goxlr"]} as TriggerEventTypeCategory,
	STREAMLABS:		{id:15, labelKey:"triggers.categories.streamlabs", icons:["streamlabs"]} as TriggerEventTypeCategory,
	KOFI:			{id:16, labelKey:"triggers.categories.kofi", icons:["kofi"]} as TriggerEventTypeCategory,
	STREAMELEMENTS:	{id:17, labelKey:"triggers.categories.streamelements", icons:["streamelements"]} as TriggerEventTypeCategory,
	TIPEEE:			{id:18, labelKey:"triggers.categories.tipeee", icons:["tipeee"]} as TriggerEventTypeCategory,
	TWITCH_CHARITY:	{id:19, labelKey:"triggers.categories.twitch_charity", icons:["twitch_charity"]} as TriggerEventTypeCategory,
	TILTIFY:		{id:20, labelKey:"triggers.categories.tiltify", icons:["tiltify"]} as TriggerEventTypeCategory,
	PATREON:		{id:21, labelKey:"triggers.categories.patreon", icons:["patreon"]} as TriggerEventTypeCategory,
	YOUTUBE:		{id:22, labelKey:"triggers.categories.youtube", icons:["youtube"]} as TriggerEventTypeCategory,
	TIKTOK:			{id:23, labelKey:"triggers.categories.tiktok", icons:["tiktok"]} as TriggerEventTypeCategory,
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
	descriptionKey?:string;
	isCategory?:boolean;
	testMessageType?:TwitchatDataTypes.TwitchatMessageStringType;
	testNoticeType?:TwitchatDataTypes.TwitchatNoticeStringType;
	goxlrMiniCompatible?:boolean;
	private?:boolean;
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
	delay?:number|string;
	/**
	 * Conditions to be matched for the next action to be executed
	 */
	conditionList?:TriggerConditionGroup;
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

export type TriggerActionObsDataAction = "sources"|"startstream"|"stopstream"|"startrecord"|"pauserecord"|"resumerecord"|"stoprecord"|"emitevent"|"startvirtualcam"|"stopvirtualcam"|"createchapter"|"hotKey"|"screenshot";
export type TriggerActionObsSourceDataAction = "show"|"hide"|"mute"|"unmute"|"replay"|"stop"|"next"|"prev"|"switch_to"|"move"|"rotate"|"resize"|"toggle_visibility";
export interface TriggerActionObsData extends TriggerActionData{
	type:"obs";
	/**
	 * Type of OBS action to perform
	 */
	obsAction:TriggerActionObsDataAction;
	/**
	 * Type of action to perform on the given source or filter
	 * Note: would make much more sense to call it "sourceAction", but,
	 * you know, technical debt combo lazyness to make amigration script...
	 */
	action:TriggerActionObsSourceDataAction;
	/**
	 * Source name to control
	 */
	sourceName:string;
	/**
	 * Filter name to control
	 */
	filterName?:string;
	/**
	 * New text of Text soource
	 */
	text?:string;
	/**
	 * New URL of a browser source
	 */
	url?:string;
	/**
	 * New custom CSS of a browser source
	 */
	browserSourceCss?:string;
	/**
	 * New position X in pixels
	 */
	pos_x?:string;
	/**
	 * New position Y in pixels
	 */
	pos_y?:string;
	/**
	 * New width
	 */
	width?:string;
	/**
	 * New height
	 */
	height?:string;
	/**
	 * New angle
	 */
	angle?:string;
	/**
	 * Should displacement be relative?
	 */
	relativeTransform?:boolean;
	/**
	 * Should the source displacement be animated
	 */
	animate?:boolean;
	/**
	 * Animation easing type if "animate" is true
	 */
	animateEasing?:"sine.out"
	| "sine.in"
	| "sine.inOut"
	| "back.out"
	| "back.in"
	| "back.inOut"
	| "bounce.out"
	| "bounce.in"
	| "bounce.inOut"
	| "elastic.out"
	| "elastic.in"
	| "elastic.inOut"
	| "linear.none";
	/**
	 * Animation duration if "animate" is true
	 */
	animateDuration?:number;
	/**
	 * Media path (remote or local file path, or a placeholder)
	 */
	mediaPath?:string;
	/**
	 * Should we wait for the media to complete before processing the rest of the trigger?
	 */
	waitMediaEnd?:boolean;
	/**
	 * Name of the event to broadacast to browser sources
	 */
	browserEventName?:string;
	/**
	 * Parameter of the event to broadacast to browser sources
	 */
	browserEventParams?:string;
	/**
	 * Name of the record chapter to create
	 */
	recordChapterName?:string;
	/**
	 * @deprecated replaced by "action" prop
	 */
	show?:boolean|"replay";
	/**
	 * Hotkey action to trigger
	 */
	hotKeyAction?:string;
	/**
	 * Defines whether we want to `save` the screenshot to the hard
	 * drive at the specified path with `screenshotImgSavePath` or
	 * to `get` base64 data of it and save it to `screenshotImgSavePlaceholder`
	 */
	screenshotImgMode?:"save"|"get";
	/**
	 * Image format for source screenshot
	 */
	screenshotImgFormat?:string;
	/**
	 * Request custom image size ?
	 */
	screenshotImgCustomSize?:boolean;
	/**
	 * Custom image width
	 */
	screenshotImgWidth?:number;
	/**
	 * Custom image height
	 */
	screenshotImgHeight?:number;
	/**
	 * Path to save the file to
	 */
	screenshotImgSavePath?:string;
	/**
	 * Placeholder to save the screenshot to
	 */
	screenshotImgSavePlaceholder?:string;
}

export interface TriggerActionChatData extends TriggerActionData{
	type:"chat";
	/**
	 * Text to send on chat
	 */
	text:string;
	/**
	 * Should message be sent as a reply?
	 */
	sendAsReply:boolean;
}

export interface TriggerActionCustomMessageData extends TriggerActionData{
	type:"customChat";
	/**
	 * Twitchat notification params
	 */
	customMessage:TwitchatDataTypes.MessageCustomDataAPI;
}

export interface TriggerActionTTSData extends TriggerActionData{
	type:"tts";
	/**
	 * Text to read out loud
	 */
	text:string;
	/**
	 * Voice parameters for TTS
	 */
	voiceParams?:TwitchatDataTypes.TTSVoiceParamsData;
}

export interface TriggerActionRaffleData extends TriggerActionData{
	type:"raffle";
	/**
	 * Raffle params
	 */
	raffleData:TwitchatDataTypes.RaffleData;
}

export interface TriggerActionRaffleEnterData extends TriggerActionData{
	type:"raffle_enter";
}

export interface TriggerActionBingoData extends TriggerActionData{
	type:"bingo";
	/**
	 * Bingo params
	 */
	bingoData:TwitchatDataTypes.BingoConfig;
}

export interface TriggerActionStreamerbotData extends TriggerActionData{
	type:"streamerbot";
	/**
	 * Streamerbot params
	 */
	streamerbotData?:{
		actionId:string;
		params?:{
			key:string;
			value:string;
		}[];
	};
}

export interface TriggerActionSammiData extends TriggerActionData{
	type:"sammi";
	/**
	 * SAMMI params
	 */
	sammiData?:{
		buttonId:string;
	};
}

export interface TriggerActionMixitupData extends TriggerActionData{
	type:"mixitup";
	/**
	 * Mix It Up params
	 */
	mixitupData?:{
		commandId:string;
		params?:{
			value:string;
		}[];
	};
}

export interface TriggerActionPlayabilityData extends TriggerActionData{
	type:"playability";
	/**
	 * Playability params
	 */
	playabilityData?:{
		outputs:{
			code:string;
			type:"axis"|"keyboard"|"mouseButton"|"trigger"|"button";
			value:number|boolean|"press_release";
		}[];
	};
}

export interface TriggerActionGroqData extends TriggerActionData{
	type:"groq";
	/**
	 * Groq params
	 */
	groqData?:{
		/**
		 * Prerompt
		 */
		preprompt:string;
		/**
		 * Prompt
		 */
		prompt:string;
		/**
		 * Groq model to use
		 */
		model:string;
		/**
		 * Use JSON mode to get formatted result
		 */
		jsonMode:boolean;
		/**
		 * JSON example
		 */
		json?:string;
		/**
		 * Placeholder containing the Groq response result
		 */
		outputPlaceholder?:string;
		/**
		 * Extract placeholders as simple text or with JSONPath
		 * @deprecated Use outputPlaceholder + TriggerActionJSONExtractData for JSON extraction
		 */
		outputPlaceholderList?:IHttpPlaceholder[];
	};
}

export const TriggerActionTimerData_ACTION = ["start", "pause", "resume", "stop", "add", "remove", "set"] as const;
/**
 * Represents a custom timer control action
 */
export interface TriggerActionTimerData extends TriggerActionData{
	type:"timer";
	/**
	 * Timer params
	 */
	timerData:{
		/**
		 * Timer ID
		 */
		timerId:string;
		/**
		 * Action to perform
		 */
		action:typeof TriggerActionTimerData_ACTION[number];
		/**
		 * Duration to add
		 */
		duration?:string;
	};
}

/**
 * Represents a bingo grid action
 */
export interface TriggerActionBingoGridData extends TriggerActionData{
	type:"bingoGrid";
	/**
	 * Bingo grid params
	 */
	bingoGrid: {
		/**
		 * Action type to perform
		 */
		action:"tick"|"untick"|"toggle"|"tick_all"|"untick_all"|"rename"|"add_cell"|"shuffle";
		/**
		 * Should cell related actions target a cell
		 * by its coordinates or its ID
		 */
		cellActionMode:"coords"|"id",
		/**
		 * Grid ID to update
		*/
		grid:string;
		/**
		 * Cell ID to act on
		 */
		cellId:string;
		/**
		 * X coordinate of the cell to act on
		 */
		x:number|string;
		/**
		 * Y coordinate of the cell to act on
		 */
		y:number|string;
		/**
		 * New cell label
		 */
		label:string;
	}
}

/**
 * Custom badge updates
 */
export interface TriggerCustomBadgesData extends TriggerActionData{
	type:"customBadges";
	/**
	 * Placeholder containing the user to update
	 */
	customBadgeUserSource:string;
	/**
	 * Badge IDs to add to the user
	 */
	customBadgeAdd:string[];
	/**
	 * Badge IDs to remove from the user
	 */
	customBadgeDel:string[];
}

/**
 * Custom user name update
 */
export interface TriggerCustomUsernameData extends TriggerActionData{
	type:"customUsername";
	/**
	 * New name to give the the user
	 */
	customUsername:string;
	/**
	 * Placeholder containing the user to update
	 */
	customUsernameUserSource:string;
}

export const TriggerActionVoicemodDataActionList = ["voice", "sound", "beepOn", "beepOff", "hearMyselfOn", "hearMyselfOff", "voiceChangerOn", "voiceChangerOff"] as const;
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

export const TriggerActionMusicEntryDataSelectionList = ["1","2","3","top3","top5","top10","top15","top20","top25","top30","top40","top50"] as const;
export type TriggerActionMusicEntryDataSelection = typeof TriggerActionMusicEntryDataSelectionList[number];
export interface TriggerActionMusicEntryData extends TriggerActionData{
	type:"music";
	/**
	 * Action to perform
	 */
	musicAction:TriggerMusicTypesValue;
	/**
	 * Track to add to the queue.
	 * Can be:
	 * - a textual search
	 * - a track title/artist
	 * - a track ID
	 * - a track URL
	 * - a placeholder containing one of the above
	 */
	track:string;
	/**
	 * When searching for a track by its name, API can return multiple entries
	 * This field defines which track to pick amongst the API results.
	 */
	musicSelectionType:TriggerActionMusicEntryDataSelection;
	/**
	 * Message to send on chat when adding a track to the queue
	 */
	confirmMessage:string;
	/**
	 * Should the track be lower than a certain duration ?
	 */
	limitDuration?:boolean;
	/**
	 * Maximum number of trakcs a user can have in the queue
	 * -1 = unlimited
	 */
	maxPerUser?:number;
	/**
	 * Maximum track duration for a SR
	 */
	maxDuration?:number;
	/**
	 * Optional error message to send on chat if SR failed
	 */
	failMessage?:string;
	/**
	 * Playlist to start or to add a track to
	 */
	playlist:string;
}

export interface TriggerActionHighlightData extends TriggerActionData{
	type:"highlight";
	/**
	 * Show (true) or hide (false) the highlight overlay
	 */
	show:boolean;
	/**
	 * Message to show on highlight overlay
	 */
	text:string;
}

export interface TriggerActionTriggerData extends TriggerActionData{
	type:"trigger";
	/**
	 * Trigger ID to execute
	 */
	triggerId:string;
	/**
	 * @deprecated do not use! only here for data migration typing
	 */
	triggerKey?:string;
}

export type TriggerActionTriggerToggleDataAction = "enable"|"disable"|"toggle";
export interface TriggerActionTriggerToggleData extends TriggerActionData{
	type:"triggerToggle";
	/**
	 * Trigger ID to enable/disable/toggle
	 */
	triggerId:string;
	/**
	 * Action to perform
	 */
	action:TriggerActionTriggerToggleDataAction;
}

export type TriggerActionHTTPCallDataAction = "GET"|"POST"|"PUT"|"DELETE"|"PATCH"|"TRACE"|"OPTIONS"|"CONNECT"|"HEAD";
export interface TriggerActionHTTPCallData extends TriggerActionData{
	type:"http";
	/**
	 * Request URL
	 */
	url:string;
	/**
	 * Request method
	 */
	method:TriggerActionHTTPCallDataAction;
	/**
	 * Placeholders to add as query parameters (or JSON body of "sendAsBody" is true)
	 */
	queryParams:string[];
	/**
	 * Should data be sent as a JSON body for POST requests
	 */
	sendAsBody?:boolean;
	/**
	 * Should custom headers be sent
	 * @see customHeaders
	 */
	customHeaders?:boolean;
	/**
	 * Request headers
	 */
	headers?:{key:string, value:string}[];
	/**
	 * Placeholder containing the request result
	 */
	outputPlaceholder?:string;
	/**
	 * Extract placeholders with JSONPath
	 * @deprecated Use outputPlaceholder + TriggerActionJSONExtractData for JSON extraction
	 */
	outputPlaceholderList?: (Omit<IHttpPlaceholder, "type"> & { type: "json" | "text" })[];
	/**
	 * Custom body value
	 */
	customBody?:string;
}

export interface TriggerActionWSData extends TriggerActionData{
	type:"ws";
	/**
	 * Custom payload to send to websocket
	*/
	payload:string;
	/**
	 * Placeholder to send to websocket
	*/
	params:string[];
	/**
	 * Custom topic param to send to websocket
	 * @deprecated removed in favor of only the "payload" prop that now defines the whole body
	 */
	topic?:string;
}

export interface TriggerActionPollData extends TriggerActionData{
	type:"poll";
	/**
	 * Poll params
	 */
	pollData:TwitchatDataTypes.PollConfig;
}

export interface TriggerActionPredictionData extends TriggerActionData{
	type:"prediction";
	/**
	 * Prediction params
	 */
	predictionData:TwitchatDataTypes.PredictionConfig;
}

export interface TriggerActionChatSuggestionsData extends TriggerActionData{
	type:"chatSugg";
	/**
	 * Chat suggestion params
	 */
	suggData:TwitchatDataTypes.ChatSuggestionData;
}

export interface TriggerActionVibrateData extends TriggerActionData{
	type:"vibrate";
	/**
	 * Vibration pattern id
	 * @see TriggerActionDataTypes.VIBRATION_PATTERNS
	 */
	pattern:string;
}

export interface TriggerActionHeatClickData extends TriggerActionData{
	type:"heat_click";
	/**
	 * Heat data to forward
	 */
	heatClickData:{
		/**
		 * X position in percent
		 */
		x:string;
		/**
		 * Y position in percent
		 */
		y:string;
		/**
		 * Should the heat click event be forwarded?
		 * Only available for a heat trigger
		 */
		forward:boolean;
		/**
		 * Ctrl pressed ?
		 */
		ctrl:boolean;
		/**
		 * Shift pressed ?
		 */
		shift:boolean;
		/**
		 * Alt pressed ?
		 */
		alt:boolean;
		/**
		 * Distortion overlay ID to forward the click to
		 */
		overlayId:string;
	}
}

export const TriggerActionRewardDataActionList = [
	"toggle",
	"edit",
	"create",
	"delete",
	"refund",
] as const;
export type TriggerActionRewardDataAction = typeof TriggerActionRewardDataActionList[number];
export const TriggerActionRewardDataStateList = [
	"toggle",
	"enable",
	"disable",
] as const;
export type TriggerActionRewardDataState = typeof TriggerActionRewardDataStateList[number];
export interface TriggerActionRewardData extends TriggerActionData{
	type:"reward";
	rewardAction: {
		/**
		 * Action type to perform
		 */
		action:TriggerActionRewardDataAction;
		/**
		 * Reward data to create or edit
		 */
		rewardEdit?:TwitchDataTypes.RewardEdition;
		/**
		 * Reward to delete or toggle
		 */
		rewardId?:string;
		/**
		 * New is_enabled state for "toggle" action
		 */
		state:TriggerActionRewardDataState;
	}
}

export interface TriggerActionExtensionData extends TriggerActionData{
	type:"extension";
	extension: {
		/**
		 * Extension ID
		 */
		id:string;
		/**
		 * Enable state
		 */
		enable:boolean;
		/**
		 * Extension slot index target
		 */
		slotIndex:string;
		/**
		 * Extension slot index target
		 */
		slotType:Exclude<TwitchDataTypes.Extension["type"][number], "mobile">;
	}
}

export interface TriggerActionLumiaData extends TriggerActionData {
	type:"lumia";
	lumia: {
		/**
		 * Action type to perform
		 */
		action:"color"|"tts";
		/**
		 * Color of the lights for "color" action
		 */
		color?:string;
		/**
		 * Message to read for "tts" action
		 */
		message?:string;
		/**
		 * Voice to read the message with for "tts" action
		 */
		voice?:string;
		/**
		 * Color transition duration in milliseconds
		 */
		colorTransition_s?:number;
		/**
		 * Duration to keep color in milliseconds
		 */
		colorDuration_s?:number;
		/**
		 * Brightness of the lights
		 */
		colorBrightness?:number;
	}
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
	 * It's not a number but a string so we can use placeholders as value
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
	 * or if every existing user should be updated (@see COUNTER_EDIT_SOURCE_EVERYONE)
	 * or if all current chatters should be updated (@see COUNTER_EDIT_SOURCE_CHATTERS)
	 * or a user whose name is stored on a placeholder (string name of the placeholder)
	 */
	counterUserSources:{[key:string]:string};
	/**
	 * Action to execute on the counter's value
	 * Set as optionnal because added afterwards and missing from counters created before that.
	 * Default action to execute if data is missing should be "add"
	 */
	action?:TriggerActionCountDataAction;
	/**
	 * Action type to perform for per-user counter entries.
	 * update: update the entry
	 * delete: delete the entry
	 */
	userAction?:{[valueId:string]:"update"|"delete"},
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
	/**
	 * Specifies weither a per-user value should be updated
	 * based on the user executing the action (@see VALUE_EDIT_SOURCE_SENDER)
	 * or if every existing user should be updated (@see VALUE_EDIT_SOURCE_EVERYONE)
	 * or if all current chatters should be updated (@see VALUE_EDIT_SOURCE_CHATTERS)
	 * or a user whose name is stored on a placeholder (string name of the placeholder)
	 */
	valueUserSources:{[valueId:string]:string};
	/**
	 * Action type to perform for per-user values entries.
	 * update: update the entry
	 * delete: delete the entry
	 */
	userAction?:{[valueId:string]:"update"|"delete"},
	/**
	 * Defines if arithmetic operators should be interpreted
	 */
	interpretMaths?:boolean;
}

export type TriggerActionRandomDataMode = "list"|"number"|"trigger"|"value"|"counter";
export interface TriggerActionRandomData extends TriggerActionData{
	type:"random";
	/**
	 * Type of random to generate
	 */
	mode:TriggerActionRandomDataMode;
	/**
	 * Min number to generate
	 */
	min:number;
	/**
	 * Max number to generate
	 */
	max:number;
	/**
	 * Should generated number be a float
	 */
	float:boolean;
	/**
	 * Placeholder to save the result to
	 */
	placeholder:string;
	/**
	 * Removed entry from the list after randomly picking it
	 * Works for "list", "trigger", "value", and "counter" modes
	 */
	removePickedEntry:boolean;
	/**
	 * List of custom textual items
	 */
	list:string[];
	/**
	 * Trigger list to pick one from
	 */
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
	/**
	 * Value ID to randomly pick entry from.
	 * Only for per-user values
	 */
	valueSource?:string;
	/**
	 * Splitter for non-per-user values
	 */
	valueSplitter?:string;
	/**
	 * Counter ID to randomly pick entry from.
	 * Only for per-user counters
	 */
	counterSource?:string;
	/**
	 * used for value and counter sources.
	 * Placeholders to extract the user info and the actual value
	 * of that user
	 */
	valueCounterPlaceholders?:{
		userName:string;
		userId:string;
		value:string;
	}
}

export interface TriggerActionStreamInfoData extends TriggerActionData {
	type:"stream_infos";
	/**
	 * New stream title
	 */
	title:string;
	/**
	 * New stream category
	 */
	categoryId:string;
	/**
	 * New stream tags
	 */
	tags:string[];
	/**
	 * New branded content state
	 */
	branded?:boolean;
	/**
	 * New labels states
	 */
	labels?:{id:string, enabled:boolean}[];
}

/**
 * Represents a discord action data
 */
export interface TriggerActionDiscordData extends TriggerActionData {
	type:"discord";
	discordAction:{
		/**
		 * Define the discord action type to execute
		 */
		action:"message";
		/**
		 * Message to send to discord
		 */
		message:string;
		/**
		 * Channel ID to send the message to
		 */
		channelId:string;
	}
}

/**
 * Represents a message delete request
 */
export interface TriggerActionDeleteMessageData extends TriggerActionData {
	type:"delete_message";
}

/**
 * Represents a message spoil request
 */
export interface TriggerActionSpoilMessageData extends TriggerActionData {
	type:"spoil_message";
}

/**
 * Represents a trigger execution interrupt
 */
export interface TriggerActionStopExecData extends TriggerActionData{
	type:"trigger_stop";
}

/**
 * Contains a chat poll data
 */
export interface TriggerActionChatPollData extends TriggerActionData{
	type:"chat_poll";
	chatPollData:TwitchatDataTypes.ChatPollData;
}

/**
 * Contains a animated text command data
 */
export interface TriggerActionAnimatedTextData extends TriggerActionData{
	type:"animated_text";
	animatedTextData: TriggerActionAnimatedTextData_ActionShow | TriggerActionAnimatedTextData_ActionHide
}
export const TriggerActionAnimatedTextData_ActionList = ["show", "hide"] as const;
interface TriggerActionAnimatedTextData_ActionAbstract {
	/**
	 * Action to perform
	 */
	action: typeof TriggerActionAnimatedTextData_ActionList[number]
	/**
	 * Overlay to control
	 */
	overlayId:string;
}
interface TriggerActionAnimatedTextData_ActionShow extends TriggerActionAnimatedTextData_ActionAbstract {
	/**
	 * Action to perform
	 */
	action:"show";
	/**
	 * Text to display
	 */
	text:string;
	/**
	 * Automatically hide the text after a duration that depends on the text length
	 */
	autoHide:boolean;
	/**
	 * Pause trigger's execution until the text animation completes
	 */
	pauseUntilComplete?:boolean
}
interface TriggerActionAnimatedTextData_ActionHide extends TriggerActionAnimatedTextData_ActionAbstract {
	/**
	 * Action to perform
	 */
	action:"hide";
	/**
	 * Pause trigger's execution until the text animation completes
	 */
	pauseUntilComplete?:boolean
}

/**
 * Contains actions to perform on custom train
 */
export interface TriggerActionCustomTrainData extends TriggerActionData{
	type:"custom_train";
	customTrainData: {
		/**
		 * Train ID to control
		 */
		trainId:string;
		/**
		 * Action to perform
		 */
		action: typeof TriggerActionCustomTrainData_ActionList[number];
		/**
		 * Value to add/remove
		 * It's a string because it can contain placeholders and math operations
		 */
		value:string;

	}
}
export const TriggerActionCustomTrainData_ActionList = ["add", "del"] as const;

/**
 * Beep action details
 */
export interface TriggerActionSFXRData extends TriggerActionData{
	type:"sfxr";
	sfxr: {
		/**
		 * Sound effect preset ID to use
		 */
		presetId:typeof JSFXRSoundPreset[number] | "custom";
		/**
		 * Volume of the sound
		 */
		volume:number;
		/**
		 * Should trigger execution be paused until the sound effect is played?
		 */
		waitForEnd:boolean;
		/**
		 * Should audio be played on overlay?
		 */
		playOnOverlay:boolean;
		/**
		 * Raw configuration of the JSFXR sound effect
		 */
		rawConfig?:string;
	}
}

/**
 * Extract data from JSON using JSONPath from a placeholder
 */
export interface TriggerActionJSONExtractData extends TriggerActionData{
	type:"json_extract";
	jsonExtractData:{
		/**
		 * Placeholder containing the JSON data to extract from
		 */
		sourcePlaceholder:string;
		/**
		 * Extract placeholders with JSONPath
		 */
		outputPlaceholderList?:IHttpPlaceholder[];
	}
}

/**
 * Represents a tree structure item.
 * Either a trigger folder or a trigger item entry
 */
export interface TriggerTreeItemData{
	type:"folder"|"trigger";
	id:string;
	/**
	 * Folder's name
	 */
	name?:string;
	/**
	 * Trigger ID for a "trigger" type
	 */
	triggerId?:string;
	/**
	 * Set to false to disable triggers within this folder
	 */
	enabled?:boolean;
	/**
	 * Is the folder expanded?
	 */
	expand?:boolean;
	/**
	 * Custom folder color
	 */
	color?:string;
	/**
	 * Folder's children
	 */
	children?:TriggerTreeItemData[];
}

export const ANY_OBS_SCENE = "any_obs_scene";
export const ANY_COUNTER = "any_counter";
export const ANY_VALUE = "any_value";
export const AD_APPROACHING_INTERVALS = [5*60000, 4*60000, 3*60000, 2*60000, 1*60000, 30000, 20000, 10000, 5000];

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
	// PRESENTATION:"46",//Twitch removed this feature
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
	// HYPE_CHAT:"79",
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
	ANNOUNCEMENTS:"92",
	AD_STARTED:"93",
	AD_APPROACHING:"94",
	AD_COMPLETE:"95",
	TRACK_ADD_TO_QUEUE_FAILED:"96",
	QNA_START:"97",
	QNA_DELETE:"98",
	QNA_STOP:"99",
	USER_JOIN:"100",//private undocumented trigger type
	USER_LEAVE:"101",//private undocumented trigger type
	CREDITS_COMPLETE:"102",
	STREAMLABS_DONATION:"103",
	STREAMLABS_MERCH:"104",
	STREAMLABS_PATREON_PLEDGE:"105",
	KOFI_DONATION:"106",
	KOFI_MERCH:"107",
	KOFI_SUBSCRIPTION:"108",
	POLL_START:"109",
	PREDICTION_START:"110",
	STREAMELEMENTS_DONATION:"111",
	STREAMELEMENTS_MERCH:"112",
	TIPEEE_DONATION:"113",
	TIPEEE_SUB:"114",
	TIPEEE_RESUB:"115",
	BINGO_GRID_LINE:"116",
	BINGO_GRID_CELL:"117",
	BINGO_GRID_ALL:"118",
	BINGO_GRID_RESET:"119",
	BINGO_GRID_VIEWER_LINE:"120",
	WARN_CHATTER:"121",
	WARN_ACKNOWLEDGE:"122",
	RAFFLE_PICK_WINNER:"123",
	POWER_UP_MESSAGE:"124",
	POWER_UP_GIANT_EMOTE:"125",
	POWER_UP_CELEBRATION:"126",
	YOUTUBE_SUPER_CHAT:"127",
	YOUTUBE_SUPER_STICKER:"128",
	YOUTUBE_SUBSCRIPTION:"129",
	YOUTUBE_SUBGIFT:"130",
	VOICEMOD_SOUND_EFFECT:"131",
	WEBSOCKET_TOPIC:"132",
	STREAMLABS_CHARITY_TIP:"133",
	TILTIFY_TIP:"134",
	OBS_RECORDING_START:"135",
	OBS_RECORDING_STOP:"136",
	TWITCHAT_STARTED:"137",
	PATREON_NEW_MEMBER:"138",
	KOFI_COMMISSION:"139",
	TIKTOK_SUB:"140",
	TIKTOK_GIFT:"141",
	TIKTOK_LIKE:"142",
	TIKTOK_SHARE:"143",
	CLEAR_CHAT:"144",
	SUB_ONLY_ON:"145",
	SUB_ONLY_OFF:"146",
	FOLLOW_ONLY_ON:"147",
	FOLLOW_ONLY_OFF:"148",
	EMOTE_ONLY_ON:"149",
	EMOTE_ONLY_OFF:"150",
	SLOW_MODE_ON:"151",
	SLOW_MODE_OFF:"152",
	MONITOR_ON:"153",
	RESTRICT_ON:"154",
	MONITOR_RESTRICT_OFF:"155",
	TWITCH_CHARITY_DONATION:"156",
	PLAYABILITY_INPUT:"157",
	HIGHLIGHT_CHAT_MESSAGE_CLOSE:"158",
	MESSAGE_ANSWER:"159",
	GOAL_STEP_COMPLETE:"160",
	CHAT_POLL_START:"161",
	CHAT_POLL_RESULT:"162",
	CUSTOM_TRAIN_START:"163",
	CUSTOM_TRAIN_LEVEL_UP:"164",
	CUSTOM_TRAIN_COMPLETE:"165",
	CUSTOM_TRAIN_FAIL:"166",
	CUSTOM_TRAIN_COOLDOWN:"167",
	STREAMSOCKET_ACTION:"168",
	TWITCH_COMBO:"169",

	TWITCHAT_AD:"ad",
	TWITCHAT_LIVE_FRIENDS:"live_friends",
	TWITCHAT_SHOUTOUT_QUEUE:"shoutout_queue",
	TWITCHAT_MESSAGE:"twitchat_message",
	GLOBAL_PLACEHOLDERS:"global_placeholders",
} as const;
export type TriggerTypesKey = keyof typeof TriggerTypes;
export type TriggerTypesValue = typeof TriggerTypes[TriggerTypesKey];

export interface IHttpPlaceholder {
	type:"json",
	path:string;
	placeholder:string;
};

export interface ITriggerPlaceholder<Type, ListValueType=unknown, PointerPrefix extends string=""> extends TwitchatDataTypes.PlaceholderEntry {
	pointer:Path<Type, PointerPrefix>;
	/**
	 * Is this a user ID ?
	 * Triggers will use this to grab related user's data
	 */
	isUserID:boolean;
	/**
	 * Can placeholder be parsed as number?
	 */
	numberParsable:boolean;
	/**
	 * Just a optional prop to store anything
	 */
	storage?:unknown;
	/**
	 * Values the placeholder can have
	 * Used to provide a list of fixed entries under trigger conditions
	 */
	values?:TwitchatDataTypes.ParameterDataListValue<ListValueType>[];
}

export const USER_ID:string = "USER_ID";
export const USER_NAME:string = "USER";
export const USER_DISPLAY_NAME:string = "USER_CUSTOM_NAME";
export const USER_AVATAR:string = "AVATAR";
export const USER_FOLLOWAGE:string = "USER_FOLLOWAGE";
export const USER_FOLLOWAGE_MS:string = "USER_FOLLOWAGE_MS";
export const USER_COLOR:string = "USER_COLOR";
export const USER_BADGES:string = "USER_BADGES";
export const USER_CUSTOM_BADGES:string = "USER_CUSTOM_BADGES";
export const VALUE_PLACEHOLDER_PREFIX:string = "VALUE_";
export const VALUE_EDIT_SOURCE_SENDER:string = "SENDER";
export const VALUE_EDIT_SOURCE_EVERYONE:string = "EVERYONE";
export const VALUE_EDIT_SOURCE_CHATTERS:string = "CHATTERS";
export const COUNTER_VALUE_PLACEHOLDER_PREFIX:string = "COUNTER_VALUE_";
export const COUNTER_EDIT_SOURCE_SENDER:string = "SENDER";
export const COUNTER_EDIT_SOURCE_EVERYONE:string = "EVERYONE";
export const COUNTER_EDIT_SOURCE_CHATTERS:string = "CHATTERS";
export const STOPWATCH_PLACEHOLDER_PREFIX:string = "SW_";
export const COUNTDOWN_PLACEHOLDER_PREFIX:string = "CD_";
export const CURRENT_VOD_URL:string = "CURRENT_VOD_URL";

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
		"music":[
			{tag:"FAIL_REASON", descKey:'triggers.placeholders.track_add_fail_reason', pointer:"__track_fail__", numberParsable:false, isUserID:false},
		],
		// "reward":[
		// 	{tag:"COST", descKey:'triggers.placeholders.track_add_fail_reason', pointer:"__reward__.cost", numberParsable:false, isUserID:false},
		// ]
	}

	actionPlaceholdersCache = map;
	return map[key] ?? [];
}

/**
 * Cleanup the placeholders cache to force it to be rebuilt next time.
 * This is used by the counters, when changing the placeholder of a counter
 * the cache needs to be rebuilt to get those changes.
 */
export function rebuildPlaceholdersCache():void { eventPlaceholdersCache = undefined }

/**
 * Defines custom values for given placeholder of given trigger type.
 */
export function setTriggerEventPlaceholderValues(triggerType:TriggerTypesValue, placeholderTag:string, values:TwitchatDataTypes.ParameterDataListValue<unknown>[]) {
	const placeholderList = TriggerEventPlaceholders(triggerType);
	const placeholder = placeholderList.find(v=>v.tag.toLowerCase() === placeholderTag.toLowerCase());
	if(placeholder) {
		placeholder.values = values;
		eventPlaceholderValuesCache[triggerType] = {
			tag:placeholder.tag,
			values,
		}
	}
}

/**
 * Placeholders related to a trigger event type
 */
let eventPlaceholdersCache:Partial<{[key in TriggerTypesValue]:ITriggerPlaceholder<any>[]}>|undefined;
let eventPlaceholderValuesCache:Partial<{[key in TriggerTypesValue]:{tag:string, values:TwitchatDataTypes.ParameterDataListValue<unknown>[]}}> = {};
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

	type SafeMessage = Omit<TwitchatDataTypes.MessageChatData, "answers" | "children" | "answersTo" | "directlyAnswersTo">;
	type SafeReward = Omit<TwitchatDataTypes.MessageRewardRedeemData, "children">;
	type SafeHypeTrain = TwitchatDataTypes.MessageHypeTrainEventData & {train:Omit<TwitchatDataTypes.MessageHypeTrainEventData["train"], "sharedStates">};

	map[TriggerTypes.ANY_MESSAGE] =
	map[TriggerTypes.FIRST_TODAY] =
	map[TriggerTypes.FIRST_ALL_TIME] =
	map[TriggerTypes.RETURNING_USER] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_COLOR, descKey:'triggers.placeholders.user_color', pointer:"user.color", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_BADGES, descKey:'triggers.placeholders.user_badges', pointer:"__user_badges__", numberParsable:false, isUserID:false},
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
	];

	map[TriggerTypes.POWER_UP_MESSAGE] = [...map[TriggerTypes.ANY_MESSAGE]!,
		{tag:"SKIN", descKey:'triggers.placeholders.power_up_message', pointer:"twitch_animationId", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
	];

	map[TriggerTypes.MESSAGE_ANSWER] = [...map[TriggerTypes.ANY_MESSAGE]!,
		{tag:"PARENT_"+USER_NAME, descKey:'triggers.placeholders.parent_user', pointer:"directlyAnswersTo.user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage & {directlyAnswersTo:SafeMessage}>,
		{tag:"PARENT_"+USER_DISPLAY_NAME, descKey:'triggers.placeholders.parent_user_customName', pointer:"directlyAnswersTo.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage & {directlyAnswersTo:SafeMessage}>,
		{tag:"PARENT_"+USER_ID, descKey:'triggers.placeholders.parent_user_id', pointer:"directlyAnswersTo.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<SafeMessage & {directlyAnswersTo:SafeMessage}>,
		{tag:"PARENT_MESSAGE", descKey:'triggers.placeholders.parent_message', pointer:"directlyAnswersTo.message", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage & {directlyAnswersTo:SafeMessage}>,
		{tag:"PARENT_MESSAGE_JSON", descKey:'triggers.placeholders.parent_message_json', pointer:"directlyAnswersTo.message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage & {directlyAnswersTo:SafeMessage}>,
		{tag:"PARENT_MESSAGE_HTML", descKey:'triggers.placeholders.parent_message_html', pointer:"directlyAnswersTo.message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage & {directlyAnswersTo:SafeMessage}>,
	];

	map[TriggerTypes.POWER_UP_GIANT_EMOTE] = [...map[TriggerTypes.ANY_MESSAGE]!,
		{tag:"EMOTE", descKey:'triggers.placeholders.power_up_emote', pointer:"emoteID", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchGigantifiedEmoteData>,
		{tag:"EMOTE_URL", descKey:'triggers.placeholders.power_up_emote_url', pointer:"emoteURL", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchGigantifiedEmoteData>,
		{tag:"BITS", descKey:'triggers.placeholders.bits', pointer:"cost", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchGigantifiedEmoteData>,
	];

	map[TriggerTypes.POWER_UP_CELEBRATION] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:USER_COLOR, descKey:'triggers.placeholders.user_color', pointer:"user.color", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:USER_BADGES, descKey:'triggers.placeholders.user_badges', pointer:"__user_badges__", numberParsable:false, isUserID:false},
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"EMOTE", descKey:'triggers.placeholders.power_up_emote', pointer:"emoteID", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:"EMOTE_URL", descKey:'triggers.placeholders.power_up_emote_url', pointer:"emoteURL", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
		{tag:"BITS", descKey:'triggers.placeholders.bits', pointer:"cost", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchCelebrationData>,
	];

	map[TriggerTypes.ANNOUNCEMENTS] = [...map[TriggerTypes.ANY_MESSAGE]!,
		{tag:"COLOR", descKey:'triggers.placeholders.announcement_color', pointer:"message.twitch_announcementColor", numberParsable:false, isUserID:false, values:[{label:"primary", value:"primary"}, {label:"purple", value:"purple"}, {label:"blue", value:"blue"}, {label:"green", value:"green"}, {label:"orange", value:"orange"}]} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageHypeChatData, "message"> & {message:SafeMessage}>,
	];

	//Clone to break reference and add chat command specific placeholder
	map[TriggerTypes.CHAT_COMMAND] = [...map[TriggerTypes.ANY_MESSAGE]!,
		{tag:"COMMAND", descKey:'triggers.placeholders.command', pointer:"__command__", numberParsable:true, isUserID:false},
	];

	map[TriggerTypes.PIN_MESSAGE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"chatMessage.user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"chatMessage.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"chatMessage.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"chatMessage.user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"chatMessage.user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"chatMessage.user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"chatMessage.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:"MODERATOR", descKey:'triggers.placeholders.pinned_by', pointer:"moderator.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:"MODERATOR_ID", descKey:'triggers.placeholders.pinned_by_id', pointer:"moderator.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessagePinData, "chatMessage"> & {chatMessage:SafeMessage}>,
	];

	map[TriggerTypes.UNPIN_MESSAGE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"chatMessage.user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"chatMessage.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"chatMessage.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"chatMessage.user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"chatMessage.user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"chatMessage.user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"chatMessage.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageUnpinData, "chatMessage"> & {chatMessage:SafeMessage}>,
	];


	map[TriggerTypes.PREDICTION_START] = [
		{tag:"TITLE", descKey:'triggers.placeholders.poll_title', pointer:"title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePollData>,
	];

	map[TriggerTypes.POLL_RESULT] = [
		{tag:"TITLE", descKey:'triggers.placeholders.poll_title', pointer:"title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePollData>,
		{tag:"WIN", descKey:'triggers.placeholders.poll_win', pointer:"winner.label", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePollData>,
	];
	map[TriggerTypes.CHAT_POLL_RESULT] = [
		{tag:"TITLE", descKey:'triggers.placeholders.poll_title', pointer:"poll.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatPollData>,
		{tag:"WIN", descKey:'triggers.placeholders.poll_win', pointer:"poll.winner.label", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatPollData>,
	];

	map[TriggerTypes.PREDICTION_START] = [
		{tag:"TITLE", descKey:'triggers.placeholders.prediction_title', pointer:"title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
	];

	map[TriggerTypes.PREDICTION_RESULT] = [
		{tag:"TITLE", descKey:'triggers.placeholders.prediction_title', pointer:"title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
		{tag:"WIN", descKey:'triggers.placeholders.prediction_win', pointer:"winner.label", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
		{tag:"TOTAL_POINTS", descKey:'triggers.placeholders.prediction_points', pointer:"totalPoints", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
		{tag:"TOTAL_USERS", descKey:'triggers.placeholders.prediction_users', pointer:"totalUsers", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
		{tag:"WINNING_USERS", descKey:'triggers.placeholders.prediction_users_win', pointer:"winner.voters", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePredictionData>,
	];

	map[TriggerTypes.BINGO_RESULT] = [
		{tag:"WINNER", descKey:'triggers.placeholders.winner', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoData>,
		{tag:"WIN_VALUE_NUM", descKey:'triggers.placeholders.bingo_number', pointer:"bingoData.numberValue", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoData>,
		{tag:"WIN_VALUE_EMOTE", descKey:'triggers.placeholders.bingo_emote', pointer:"bingoData.emoteValue", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoData>,
		{tag:"WIN_VALUE_TEXT", descKey:'triggers.placeholders.bingo_custom', pointer:"bingoData.customValue", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoData>,
		{tag:"WIN_VALUE_GENERIC", descKey:'triggers.placeholders.bingo_generic', pointer:"bingoData.genericValue", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoData>,
	];

	map[TriggerTypes.RAFFLE_RESULT] = [
		{tag:"WINNER", descKey:'triggers.placeholders.winner', pointer:"winner.label", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaffleData>,
	];

	map[TriggerTypes.SUB] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"SUB_TIER", descKey:'triggers.placeholders.sub_tier', pointer:"tier", numberParsable:true, isUserID:false, values:[{label:'prime', value:'prime'}, {label:"1", value:1},{label:"2", value:2},{label:"3", value:3}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.sub_message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MONTHS_TOTAL", descKey:'triggers.placeholders.sub_months_total', pointer:"totalSubDuration", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MONTHS_PREPAID", descKey:'triggers.placeholders.sub_months_prepaid', pointer:"months", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MONTHS_STREAK", descKey:'triggers.placeholders.sub_months_streak', pointer:"streakMonths", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"IS_RESUB", descKey:'triggers.placeholders.sub_resub', pointer:"is_resub", numberParsable:true, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"IS_PRIME_UPGRADE", descKey:'triggers.placeholders.sub_prime_upgrade', pointer:"is_primeUpgrade", numberParsable:true, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"IS_GIFT_UPGRADE", descKey:'triggers.placeholders.sub_gift_upgrade', pointer:"is_giftUpgrade", numberParsable:true, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"GIFT_UPGRADE_SENDER_ID", descKey:'triggers.placeholders.sub_gift_upgrade_user_id', pointer:"gift_upgradeSender.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"GIFT_UPGRADE_SENDER_NAME", descKey:'triggers.placeholders.sub_gift_upgrade_user_name', pointer:"gift_upgradeSender.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
	];

	map[TriggerTypes.SUBGIFT] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.sub_gifter', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.sub_gifter_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"RECIPIENTS", descKey:'triggers.placeholders.sub_gift_recipient', pointer:"gift_recipients.0.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"RECIPIENTS_ID", descKey:'triggers.placeholders.sub_gift_recipient_id', pointer:"gift_recipients.0.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"SUB_TIER", descKey:'triggers.placeholders.subgift_tier', pointer:"tier", numberParsable:true, isUserID:false, values:[{label:"1", value:1},{label:"2", value:2},{label:"3", value:3}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"MONTHS_PREPAID", descKey:'triggers.placeholders.sub_months_prepaid', pointer:"months", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
		{tag:"GIFT_COUNT", descKey:'triggers.placeholders.sub_gift_count', pointer:"gift_count", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageSubscriptionData>,
	];

	map[TriggerTypes.CHEER] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"BITS", descKey:'triggers.placeholders.bits', pointer:"bits", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:"PINNED", descKey:'triggers.placeholders.cheer_pin', pointer:"pinned", numberParsable:false, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:"PIN_LEVEL", descKey:'triggers.placeholders.cheer_pinLevel', pointer:"pinLevel", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
		{tag:"PIN_DURATION", descKey:'triggers.placeholders.cheer_pinDuration', pointer:"pinDuration_ms", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCheerData>,
	];

	map[TriggerTypes.TWITCH_COMBO] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchComboData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchComboData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchComboData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchComboData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchComboData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchComboData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"BITS", descKey:'triggers.placeholders.bits', pointer:"bits", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTwitchComboData>,
	];

	map[TriggerTypes.FOLLOW] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageFollowingData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageFollowingData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageFollowingData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageFollowingData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageFollowingData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageFollowingData>,
	];

	map[TriggerTypes.RAID] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"VIEWERS", descKey:'triggers.placeholders.stream_viewers', pointer:"viewers", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"DURATION", descKey:'triggers.placeholders.stream_duration', pointer:"stream.duration", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"DURATION_TXT", descKey:'triggers.placeholders.stream_duration_str', pointer:"stream.duration_str", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:"WAS_LIVE", descKey:'triggers.placeholders.stream_live', pointer:"stream.wasLive", numberParsable:false, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
	];

	map[TriggerTypes.RAID_STARTED] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageRaidData>,
	];

	map[TriggerTypes.SHOUTOUT_IN] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.shoutout_in', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
	];
	map[TriggerTypes.SHOUTOUT_OUT] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.shoutout_out', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"USER_STREAM_TITLE", descKey:'triggers.placeholders.stream_title', pointer:"stream.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
		{tag:"USER_STREAM_CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"stream.category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageShoutoutData>,
	];

	map[TriggerTypes.REWARD_REDEEM] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<SafeReward>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"TITLE", descKey:'triggers.placeholders.reward_title', pointer:"reward.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:"DESCRIPTION", descKey:'triggers.placeholders.reward_description', pointer:"reward.description", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:"COST", descKey:'triggers.placeholders.reward_cost', pointer:"reward.cost", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:"MESSAGE", descKey:"triggers.placeholders.reward_message", pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeReward>,
		{tag:"REWARD_ID", descKey:"triggers.placeholders.reward_id", pointer:"reward.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeReward>,
	];

	map[TriggerTypes.TRACK_ADDED_TO_QUEUE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.track_added_by', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_ID, descKey:'triggers.placeholders.track_added_by_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"SEARCH_QUERY", descKey:'triggers.placeholders.track_search_query', pointer:"search", numberParsable:false, isUserID:false, example:"Mitchiri Neko March"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_ARTIST", descKey:'triggers.placeholders.track_added_artist', pointer:"trackAdded.artist", numberParsable:false, isUserID:false, example:"Mitchiri Neko"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_TITLE", descKey:'triggers.placeholders.track_added_title', pointer:"trackAdded.title", numberParsable:false, isUserID:false, example:"Mitchiri Neko march"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_ALBUM", descKey:'triggers.placeholders.track_added_album', pointer:"trackAdded.album", numberParsable:false, isUserID:false, example:"Fake Album"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_COVER", descKey:'triggers.placeholders.track_added_cover', pointer:"trackAdded.cover", numberParsable:false, isUserID:false, example:StoreProxy.asset("img/musicExampleCover.jpg")} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADDED_TRACK_URL", descKey:'triggers.placeholders.track_added_url', pointer:"trackAdded.url", numberParsable:false, isUserID:false, example:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=deddb27b6b6148a6"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
	];

	map[TriggerTypes.MUSIC_START] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.track_added_by', pointer:"userOrigin.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicStartData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"userOrigin.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicStartData>,
		{tag:USER_ID, descKey:'triggers.placeholders.track_added_by_id', pointer:"userOrigin.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicStartData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"userOrigin", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicStartData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"userOrigin", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicStartData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"userOrigin.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicStartData>,
	];

	map[TriggerTypes.TRACK_ADD_TO_QUEUE_FAILED] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.track_added_by', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_ID, descKey:'triggers.placeholders.track_added_by_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"SEARCH_QUERY", descKey:'triggers.placeholders.track_search_query', pointer:"search", numberParsable:false, isUserID:false, example:"Mitchiri Neko March"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
		{tag:"ADD_FAIL_CODE", descKey:'triggers.placeholders.track_added_fail_code', pointer:"failCode", numberParsable:false, isUserID:false, values:[{label:"spotify_not_connected", value:"spotify_not_connected"}, {label:"wrong_url", value:"wrong_url"}, {label:"no_result", value:"no_result"}, {label:"api", value:"api"}, {label:"max_duration", value:"max_duration"}, {label:"spotify_not_connected", value:"spotify_not_connected"}], example:"spotify_not_connected"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData, TwitchatDataTypes.MessageMusicAddedToQueueData["failCode"]>,
		{tag:"ADD_FAIL_REASON", descKey:'triggers.placeholders.track_added_fail', pointer:"failReason", numberParsable:false, isUserID:false, example:"Something went wrong"} as ITriggerPlaceholder<TwitchatDataTypes.MessageMusicAddedToQueueData>,
	];

	map[TriggerTypes.STREAM_INFO_UPDATE] = [
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamInfoUpdate>,
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamInfoUpdate>,
	];

	map[TriggerTypes.HIGHLIGHT_CHAT_MESSAGE] = [
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"info.user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"info.user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"info.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"info.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"info.user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"info.user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"info.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageChatHighlightData>,
	];

	map[TriggerTypes.CHAT_ALERT] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"message.user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"message.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"message.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"message.user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"message.user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
		{tag:"ALERT", descKey:'triggers.placeholders.message', pointer:"message.message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<Omit<TwitchatDataTypes.MessageChatAlertData, "message"> & {message:SafeMessage}>,
	];

	map[TriggerTypes.HYPE_TRAIN_START] =
	map[TriggerTypes.HYPE_TRAIN_PROGRESS] =
	map[TriggerTypes.HYPE_TRAIN_END] = [
		{tag:"LEVEL", descKey:'triggers.placeholders.train_level', pointer:"level", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeHypeTrain>,
		{tag:"PERCENT", descKey:'triggers.placeholders.train_percent', pointer:"percent", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeHypeTrain>,
		{tag:"TRAIN_TYPE", descKey:'triggers.placeholders.train_type', pointer:"train.type", numberParsable:false, isUserID:false, values:[{label:"regular", value:"regular"}, {label:"golden_kappa", value:"golden_kappa"}, {labelKey:"treasure", value:"treasure"}]} as ITriggerPlaceholder<SafeHypeTrain>,
	];

	map[TriggerTypes.VOICEMOD] = [
		{tag:"VOICE_ID", descKey:'triggers.placeholders.voicemod_voice', pointer:"voiceID", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageVoicemodData>,
		{tag:"VOICE_NAME", descKey:'triggers.placeholders.voicemod_voice_name', pointer:"voiceName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageVoicemodData>,
	];

	map[TriggerTypes.VOICEMOD_SOUND_EFFECT] = [
		{tag:"SOUND_ID", descKey:'triggers.placeholders.voicemod_sound', pointer:"soundID", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageVoicemodData>,
		{tag:"SOUND_NAME", descKey:'triggers.placeholders.voicemod_sound_name', pointer:"soundName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageVoicemodData>,
	];

	map[TriggerTypes.TIMEOUT] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
		{tag:"DURATION", descKey:'triggers.placeholders.timer_duration_ms', pointer:"duration_s", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBanData>,
	];

	map[TriggerTypes.TIMER_START] = [
		{tag:"TIMER_ID", descKey:'triggers.placeholders.timer_id', pointer:"timer_id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTimerData>,
	];
	map[TriggerTypes.TIMER_STOP] = [
		{tag:"TIMER_ID", descKey:'triggers.placeholders.timer_id', pointer:"timer_id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTimerData>,
		{tag:"DURATION", descKey:'triggers.placeholders.timer_duration_formatted', pointer:"duration_str", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTimerData>,
		{tag:"DURATION_MS", descKey:'triggers.placeholders.timer_duration_ms', pointer:"duration_ms", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTimerData>,
	];

	map[TriggerTypes.COUNTDOWN_START] = [
		{tag:"TIMER_ID", descKey:'triggers.placeholders.timer_id', pointer:"countdown_id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
		{tag:"DURATION", descKey:'triggers.placeholders.countdown_duration_formatted', pointer:"duration_str", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
		{tag:"DURATION_MS", descKey:'triggers.placeholders.countdown_duration_ms', pointer:"duration_ms", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
	];
	map[TriggerTypes.COUNTDOWN_STOP] =  [...map[TriggerTypes.COUNTDOWN_START]!,
		{tag:"REAL_DURATION", descKey:'triggers.placeholders.countdown_duration_formatted', pointer:"finalDuration_str", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
		{tag:"REAL_DURATION_MS", descKey:'triggers.placeholders.countdown_duration_ms', pointer:"finalDuration_ms", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCountdownData>,
	];

	map[TriggerTypes.VIP] =
	map[TriggerTypes.UNVIP] =
	map[TriggerTypes.MOD] =
	map[TriggerTypes.UNMOD] =
	map[TriggerTypes.UNBAN] =
	map[TriggerTypes.BAN] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageModerationAction>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageModerationAction>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageModerationAction>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageModerationAction>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageModerationAction>,
	];

	map[TriggerTypes.WARN_CHATTER] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnUserData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnUserData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnUserData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnUserData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnUserData>,
		{tag:"REASON", descKey:'triggers.placeholders.warn_reason', pointer:"abstractedReason", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnUserData>,
	];

	map[TriggerTypes.WARN_ACKNOWLEDGE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnAcknowledgementData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnAcknowledgementData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnAcknowledgementData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnAcknowledgementData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWarnAcknowledgementData>,
	];

	map[TriggerTypes.FOLLOWED_STREAM_ONLINE] =
	map[TriggerTypes.FOLLOWED_STREAM_OFFLINE] =
	map[TriggerTypes.STREAM_ONLINE] =
	map[TriggerTypes.STREAM_OFFLINE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"info.user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"info.user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"info.user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"info.user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"info.user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"info.user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"TITLE", descKey:'triggers.placeholders.stream_title', pointer:"info.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:"CATEGORY", descKey:'triggers.placeholders.stream_category', pointer:"info.category", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
		{tag:"PREVIEW_URL", descKey:'triggers.placeholders.stream_previewUrl', pointer:"info.previewUrl", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData>,
	];


	map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE] = [
		{tag:"TITLE", descKey:'triggers.placeholders.challenge_title', pointer:"challenge.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:"DESCRIPTION", descKey:'triggers.placeholders.challenge_description', pointer:"challenge.description", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:"GOAL", descKey:'triggers.placeholders.challenge_goal', pointer:"challenge.goal", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
	];

	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS] = JSON.parse(JSON.stringify(map[TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE]));
	map[TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS]!.push(
		{tag:"PROGRESS", descKey:'triggers.placeholders.challenge_current', pointer:"challenge.progress", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:"CONTRIBUTION", descKey:'triggers.placeholders.challenge_contribution', pointer:"contribution", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
		{tag:"CONTRIBUTION_TOTAL", descKey:'triggers.placeholders.challenge_contribution_total', pointer:"total_contribution", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCommunityChallengeContributionData>,
	);

	map[TriggerTypes.COUNTER_EDIT] =
	map[TriggerTypes.COUNTER_ADD] =
	map[TriggerTypes.COUNTER_DEL] =
	map[TriggerTypes.COUNTER_LOOPED] =
	map[TriggerTypes.COUNTER_MINED] =
	map[TriggerTypes.COUNTER_MAXED] = [
		{tag:"COUNTER_ID", descKey:'triggers.placeholders.counter_id', pointer:"counter.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:"NAME", descKey:'triggers.placeholders.counter_name', pointer:"counter.name", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:"VALUE", descKey:'triggers.placeholders.counter_value', pointer:"value", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:"UPDATE", descKey:'triggers.placeholders.counter_update', pointer:"added", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:"UPDATE_ABS", descKey:'triggers.placeholders.counter_update_abs', pointer:"added_abs", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:USER_NAME, descKey:'triggers.placeholders.counter_username', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:USER_ID, descKey:'triggers.placeholders.counter_userid', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCounterUpdateData>,
	];

	map[TriggerTypes.VALUE_UPDATE] = [
		{tag:"VALUE_ID", descKey:'triggers.placeholders.counter_id', pointer:"value.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageValueUpdateData>,
		{tag:"VALUE_NAME", descKey:'triggers.placeholders.value_name', pointer:"value.name", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageValueUpdateData>,
		{tag:"NEW_VALUE", descKey:'triggers.placeholders.new_value', pointer:"newValue", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageValueUpdateData>,
		{tag:"OLD_VALUE", descKey:'triggers.placeholders.old_value', pointer:"oldValue", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageValueUpdateData>,
	];

	map[TriggerTypes.SLASH_COMMAND] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<SafeMessage>,
		{tag:"COMMAND", descKey:'triggers.placeholders.command', pointer:"__command__", numberParsable:true, isUserID:false},
	];

	map[TriggerTypes.USER_WATCH_STREAK] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"STREAK_COUNT", descKey:'triggers.placeholders.watch_streak', pointer:"streak", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
		{tag:"POINTS_EARNED", descKey:'triggers.placeholders.points_earned', pointer:"channelPointsEarned", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWatchStreakData>,
	];

	map[TriggerTypes.OBS_SCENE] = [
		{tag:"NEW_SCENE_NAME", descKey:'triggers.placeholders.obs_scene_name', pointer:"sceneName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageOBSSceneChangedData>,
		{tag:"PREVIOUS_SCENE_NAME", descKey:'triggers.placeholders.obs_scene_name_previous', pointer:"previousSceneName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageOBSSceneChangedData>,
	];

	map[TriggerTypes.HEAT_CLICK] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.login", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"USER_ANONYMOUS", descKey:'triggers.placeholders.heat_anonymous', pointer:"anonymous", numberParsable:false, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"COORD_X", descKey:'triggers.placeholders.heat_coord_x', pointer:"coords.x", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"COORD_Y", descKey:'triggers.placeholders.heat_coord_y', pointer:"coords.y", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"KEY_ALT", descKey:'triggers.placeholders.heat_key_alt', pointer:"alt", numberParsable:false, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"KEY_SHIFT", descKey:'triggers.placeholders.heat_key_shift', pointer:"shift", numberParsable:false, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
		{tag:"KEY_CTRL", descKey:'triggers.placeholders.heat_key_ctrl', pointer:"ctrl", numberParsable:false, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageHeatClickData>,
	];

	map[TriggerTypes.CLIP_CREATED] = [
		{tag:"CLIP", descKey:'triggers.placeholders.clip_url', pointer:"clipPublicUrl", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageClipCreate>,
	];

	map[TriggerTypes.GOXLR_FX_DISABLED] =
	map[TriggerTypes.GOXLR_FX_ENABLED] = [
		{tag:"PRESET_INDEX", descKey:'triggers.placeholders.goxlr_preset_index', pointer:"fxIndex", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoXLRFXEnableChangeData>,
		{tag:"FX_ENABLED", descKey:'triggers.placeholders.goxlr_fxenabled', pointer:"enabled", numberParsable:false, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoXLRFXEnableChangeData>,
	];

	map[TriggerTypes.USER_JOIN] =
	map[TriggerTypes.USER_LEAVE] = [
		{tag:"USER_IDS", descKey:'triggers.placeholders.user_list_id', pointer:"users.0.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageJoinData|TwitchatDataTypes.MessageLeaveData>,
		{tag:"USER_NAMES", descKey:'triggers.placeholders.user_list_name', pointer:"users.0.login", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageJoinData|TwitchatDataTypes.MessageLeaveData>,
	];

	map[TriggerTypes.GOXLR_BUTTON_PRESSED] =
	map[TriggerTypes.GOXLR_BUTTON_RELEASED] = [
		{tag:"BUTTON_ID", descKey:'triggers.placeholders.goxlr_button_id', pointer:"button", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoXLRButtonData>,
	];

	map[TriggerTypes.GOXLR_INPUT_MUTE] =
	map[TriggerTypes.GOXLR_INPUT_UNMUTE] = [
		{tag:"FADER_INDEX", descKey:'triggers.placeholders.goxlr_fader_index', pointer:"faderIndex", numberParsable:true, isUserID:false, values:[{label:"Fader 1", value:1},{label:"Fader 2", value:2},{label:"Fader 3", value:3},{label:"Fader 4", value:4}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoXLRSoundInputData>,
	];

	map[TriggerTypes.AD_STARTED] =
	map[TriggerTypes.AD_COMPLETE] = [
		{tag:"AD_DURATION", descKey:'triggers.placeholders.ad_break_duration', pointer:"duration_s", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageAdBreakStartData | TwitchatDataTypes.MessageAdBreakCompleteData>,
		{tag:USER_NAME, descKey:'triggers.placeholders.ad_break_user', pointer:"startedBy.displayNameOriginal", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageAdBreakStartData | TwitchatDataTypes.MessageAdBreakCompleteData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"startedBy.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageAdBreakStartData | TwitchatDataTypes.MessageAdBreakCompleteData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"startedBy.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageAdBreakStartData | TwitchatDataTypes.MessageAdBreakCompleteData>,
	];

	map[TriggerTypes.QNA_START] =
	map[TriggerTypes.QNA_STOP] =
	map[TriggerTypes.QNA_DELETE] = [
		{tag:"COMMAND", descKey:'triggers.placeholders.qna_command', pointer:"qnaSession.command", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageQnaStartData | TwitchatDataTypes.MessageQnaStopData | TwitchatDataTypes.MessageQnaDeleteData>,
	];

	map[TriggerTypes.STREAMLABS_DONATION] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsDonationData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsDonationData>,
		{tag:"AMOUNT_FORMATTED", descKey:'triggers.placeholders.donation_amount_formatted', pointer:"amountFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsDonationData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsDonationData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsDonationData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsDonationData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsDonationData>,
	];
	map[TriggerTypes.STREAMLABS_MERCH] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsMerchData>,
		{tag:"PRODUCT", descKey:'triggers.placeholders.merch_product', pointer:"product", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsMerchData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsMerchData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsMerchData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsMerchData>,
	];
	map[TriggerTypes.STREAMLABS_PATREON_PLEDGE] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsPatreonPledgeData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsPatreonPledgeData>,
		{tag:"AMOUNT_FORMATTED", descKey:'triggers.placeholders.donation_amount_formatted', pointer:"amountFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsPatreonPledgeData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsPatreonPledgeData>,
	];

	map[TriggerTypes.KOFI_DONATION] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiDonationData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiDonationData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiDonationData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiDonationData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiDonationData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiDonationData>,
		{tag:"IS_PUBLIC", descKey:'triggers.placeholders.kofi_public', pointer:"isPublic", numberParsable:true, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.KofiDonationData>,
	];
	map[TriggerTypes.KOFI_MERCH] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"PRODUCT_IDS", descKey:'triggers.placeholders.kofi_product_ids', pointer:"products.0.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"PRODUCT_NAMES", descKey:'triggers.placeholders.kofi_product_names', pointer:"products.0.name", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.merch_amount', pointer:"amount", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"AMOUNT_FORMATTED", descKey:'triggers.placeholders.merch_amount_formatted', pointer:"amountFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
		{tag:"IS_PUBLIC", descKey:'triggers.placeholders.kofi_public', pointer:"isPublic", numberParsable:true, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.KofiMerchData>,
	];
	map[TriggerTypes.KOFI_SUBSCRIPTION] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.subscription_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"TIER", descKey:'triggers.placeholders.kofi_tier', pointer:"tier", numberParsable:true, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"FIRST_TIME_SUB", descKey:'triggers.placeholders.kofi_first_time_sub', pointer:"firstTimeSub", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"IS_PUBLIC", descKey:'triggers.placeholders.kofi_public', pointer:"isPublic", numberParsable:true, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
	];
	map[TriggerTypes.KOFI_COMMISSION] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.subscription_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
		{tag:"IS_PUBLIC", descKey:'triggers.placeholders.kofi_public', pointer:"isPublic", numberParsable:true, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.KofiSubscriptionData>,
	];

	map[TriggerTypes.STREAMELEMENTS_DONATION] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamelementsDonationData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamelementsDonationData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamelementsDonationData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamelementsDonationData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamelementsDonationData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamelementsDonationData>,
	];

	map[TriggerTypes.TIPEEE_DONATION] =
	map[TriggerTypes.TIPEEE_SUB] = [
		{tag:"USER_NAME", descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTipeeeDonationData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTipeeeDonationData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTipeeeDonationData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTipeeeDonationData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTipeeeDonationData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTipeeeDonationData>,
	];

	map[TriggerTypes.TIPEEE_RESUB] = [...map[TriggerTypes.TIPEEE_DONATION]!,
		{tag:"RESUB_MONTHS", descKey:'triggers.placeholders.tipeee_resub_months', pointer:"recurringCount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTipeeeDonationData>,
	];

	map[TriggerTypes.BINGO_GRID_VIEWER_LINE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"GRID_ID", descKey:'triggers.placeholders.bingo_grid_id', pointer:"bingoGridId", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
		{tag:"GRID_NAME", descKey:'triggers.placeholders.bingo_grid_name', pointer:"bingoGridName", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
		{tag:"BINGO_COUNT", descKey:'triggers.placeholders.bingo_grid_count', pointer:"bingoCount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridViewerData>,
	];

	map[TriggerTypes.BINGO_GRID_LINE] =
	map[TriggerTypes.BINGO_GRID_ALL] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:USER_FOLLOWAGE, descKey:'triggers.placeholders.followage', pointer:"user", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:USER_FOLLOWAGE_MS, descKey:'triggers.placeholders.followage_ms', pointer:"user", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:"GRID_ID", descKey:'triggers.placeholders.bingo_grid_id', pointer:"bingoGridId", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:"GRID_NAME", descKey:'triggers.placeholders.bingo_grid_name', pointer:"bingoGridName", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:"CELL_X", descKey:'triggers.placeholders.bingo_grid_cell_x', pointer:"coords.x", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:"CELL_Y", descKey:'triggers.placeholders.bingo_grid_cell_y', pointer:"coords.y", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:"COL_INDEX", descKey:'triggers.placeholders.bingo_grid_col', pointer:"colIndex", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:"ROW_INDEX", descKey:'triggers.placeholders.bingo_grid_row', pointer:"rowIndex", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:"DIAG_INDEX", descKey:'triggers.placeholders.bingo_grid_diag', pointer:"diagonal", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
	];

	map[TriggerTypes.BINGO_GRID_CELL] = [...map[TriggerTypes.BINGO_GRID_ALL]!,
		{tag:"CELL_LABEL", descKey:'triggers.placeholders.bingo_grid_cell_label', pointer:"cellLabel", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
	];

	map[TriggerTypes.BINGO_GRID_RESET] = [
		{tag:"GRID_ID", descKey:'triggers.placeholders.bingo_grid_id', pointer:"bingoGridId", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
		{tag:"GRID_NAME", descKey:'triggers.placeholders.bingo_grid_name', pointer:"bingoGridName", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageBingoGridData>,
	];

	map[TriggerTypes.YOUTUBE_SUPER_CHAT] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"AMOUNT", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
		{tag:"TIER", descKey:'triggers.placeholders.superchat_tier', pointer:"tier", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperChatData>,
	];

	map[TriggerTypes.YOUTUBE_SUPER_STICKER] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"AMOUNT", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
		{tag:"TIER", descKey:'triggers.placeholders.supersticker_tier', pointer:"tier", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
		{tag:"STICKER_ID", descKey:'triggers.placeholders.supersticker_id', pointer:"sticker_id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
		{tag:"STICKER_URL", descKey:'triggers.placeholders.supersticker_url', pointer:"sticker_url", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSuperStickerData>,
	];

	map[TriggerTypes.YOUTUBE_SUBSCRIPTION] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
		{tag:"MESSAGE_JSON", descKey:'triggers.placeholders.message_json', pointer:"message_chunks", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
		{tag:"MESSAGE_HTML", descKey:'triggers.placeholders.message_html', pointer:"message_html", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
		{tag:"LEVEL", descKey:'triggers.placeholders.youtube_sub_tier', pointer:"levelName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
		{tag:"MONTHS", descKey:'triggers.placeholders.youtube_sub_months', pointer:"months", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubscriptionData>,
	];

	map[TriggerTypes.YOUTUBE_SUBGIFT] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubgiftData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubgiftData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubgiftData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubgiftData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"LEVEL", descKey:'triggers.placeholders.youtube_sub_tier', pointer:"levelName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubgiftData>,
		{tag:"RECIPIENTS", descKey:'triggers.placeholders.sub_gift_recipient', pointer:"gift_recipients.0.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubgiftData>,
		{tag:"RECIPIENTS_ID", descKey:'triggers.placeholders.sub_gift_recipient_id', pointer:"gift_recipients.0.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageYoutubeSubgiftData>,
	];

	map[TriggerTypes.WEBSOCKET_TOPIC] = [
		{tag:"TOPIC", descKey:'triggers.placeholders.ws_topic', pointer:"topic", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWebsocketTopicData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.ws_message', pointer:"message", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageWebsocketTopicData>,
	];

	map[TriggerTypes.STREAMLABS_CHARITY_TIP] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"AMOUNT_NUMERIC", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"AMOUNT_FORMATTED", descKey:'triggers.placeholders.donation_amount_formatted', pointer:"amountFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"RAISED_TOTAL_NUMERIC", descKey:'triggers.placeholders.sl_raised', pointer:"totalRaised", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"RAISED_TOTAL_FORMATTED", descKey:'triggers.placeholders.sl_raised_formatted', pointer:"totalRaisedFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"GOAL_NUMERIC", descKey:'triggers.placeholders.sl_goal', pointer:"goal", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"GOAL_FORMATTED", descKey:'triggers.placeholders.sl_goal_formatted', pointer:"goalFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"CAMPAIGN_ID", descKey:'triggers.placeholders.sl_campaign_id', pointer:"campaign.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"CAMPAIGN_NAME", descKey:'triggers.placeholders.sl_campaign_title', pointer:"campaign.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
		{tag:"CAMPAIGN_PAGE", descKey:'triggers.placeholders.sl_campaign_url', pointer:"campaign.url", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.StreamlabsCharityData>,
	];

	map[TriggerTypes.TWITCH_CHARITY_DONATION] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"AMOUNT_NUMERIC", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"AMOUNT_FORMATTED", descKey:'triggers.placeholders.donation_amount_formatted', pointer:"amountFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"RAISED_TOTAL_NUMERIC", descKey:'triggers.placeholders.sl_raised', pointer:"raised", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"RAISED_TOTAL_FORMATTED", descKey:'triggers.placeholders.sl_raised_formatted', pointer:"raisedFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"GOAL_NUMERIC", descKey:'triggers.placeholders.sl_goal', pointer:"goal", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"GOAL_FORMATTED", descKey:'triggers.placeholders.sl_goal_formatted', pointer:"goalFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"CAMPAIGN_ID", descKey:'triggers.placeholders.sl_campaign_id', pointer:"campaign.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"CAMPAIGN_NAME", descKey:'triggers.placeholders.sl_campaign_title', pointer:"campaign.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
		{tag:"CAMPAIGN_PAGE", descKey:'triggers.placeholders.sl_campaign_url', pointer:"campaign.url", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCharityDonationData>,
	];

	map[TriggerTypes.TILTIFY_TIP] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"userName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.TiltifyDonationData>,
		{tag:"MESSAGE", descKey:'triggers.placeholders.message', pointer:"message", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.TiltifyDonationData>,
		{tag:"CURRENCY", descKey:'triggers.placeholders.currency', pointer:"currency", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.TiltifyDonationData>,
		{tag:"AMOUNT_NUMERIC", descKey:'triggers.placeholders.donation_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.TiltifyDonationData>,
		{tag:"AMOUNT_FORMATTED", descKey:'triggers.placeholders.donation_amount_formatted', pointer:"amountFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.TiltifyDonationData>,
		{tag:"CAMPAIGN_ID", descKey:'triggers.placeholders.sl_campaign_id', pointer:"campaign.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.TiltifyDonationData>,
		{tag:"CAMPAIGN_NAME", descKey:'triggers.placeholders.sl_campaign_title', pointer:"campaign.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.TiltifyDonationData>,
		{tag:"CAMPAIGN_PAGE", descKey:'triggers.placeholders.sl_campaign_url', pointer:"campaign.url", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.TiltifyDonationData>,
	];

	map[TriggerTypes.PATREON_NEW_MEMBER] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.username", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePatreonData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatar", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePatreonData>,
		{tag:"USER_URL", descKey:'triggers.placeholders.user_url', pointer:"user.avatar", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePatreonData>,
		{tag:"AMOUNT", descKey:'triggers.placeholders.subscription_amount', pointer:"tier.amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePatreonData>,
		{tag:"TIER_TITLE", descKey:'triggers.placeholders.user_url', pointer:"tier.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePatreonData>,
	];

	map[TriggerTypes.TIKTOK_GIFT] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"GIFT_COUNT", descKey:'triggers.placeholders.tiktok_gift_count', pointer:"count", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
		{tag:"GIFT_ID", descKey:'triggers.placeholders.tiktok_gift_id', pointer:"giftId", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
		{tag:"GIFT_NAME", descKey:'triggers.placeholders.tiktok_gift_name', pointer:"giftName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
		{tag:"GIFT_IMAGE", descKey:'triggers.placeholders.tiktok_gift_image', pointer:"image", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
		{tag:"DIAMONDS", descKey:'triggers.placeholders.tiktok_diamonds', pointer:"diamonds", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokGiftData>,
	];

	map[TriggerTypes.TIKTOK_SUB] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokSubData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokSubData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokSubData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokSubData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"MONTH", descKey:'triggers.placeholders.tiktok_sub_month', pointer:"months", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokSubData>,
	];

	map[TriggerTypes.TIKTOK_LIKE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokLikeData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokLikeData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokLikeData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokLikeData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"LIKE_COUNT", descKey:'triggers.placeholders.tiktok_like_count', pointer:"count", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokLikeData>,
		{tag:"STREAM_LIKE_COUNT", descKey:'triggers.placeholders.tiktok_like_total', pointer:"count", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokLikeData>,
	];

	map[TriggerTypes.TIKTOK_SHARE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokShareData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokShareData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokShareData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokShareData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
	];

	map[TriggerTypes.TIKTOK_SHARE] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokShareData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokShareData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokShareData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageTikTokShareData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
	];

	map[TriggerTypes.PLAYABILITY_INPUT] = [
		{tag:"INPUT_NAME", descKey:'triggers.placeholders.playability_inputName', pointer:"inputCode", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePlayabilityInputData>,
		{tag:"INPUT_TYPE", descKey:'triggers.placeholders.playability_inputType', pointer:"inputType", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePlayabilityInputData>,
		{tag:"INPUT_VALUE", descKey:'triggers.placeholders.playability_inputValue', pointer:"inputValue", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessagePlayabilityInputData>,
	];

	map[TriggerTypes.GOAL_STEP_COMPLETE] = [
		{tag:"STEP_ID", descKey:'triggers.placeholders.goal_step_id', pointer:"stepConfig.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoalStepCompleteData>,
		{tag:"STEP_INDEX", descKey:'triggers.placeholders.goal_step_index', pointer:"stepIndex", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoalStepCompleteData>,
		{tag:"STEP_TITLE", descKey:'triggers.placeholders.goal_step_title', pointer:"stepConfig.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoalStepCompleteData>,
		{tag:"STEP_SECRET", descKey:'triggers.placeholders.goal_step_secret', pointer:"stepConfig.secret", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoalStepCompleteData>,
		{tag:"STEP_AMOUNT", descKey:'triggers.placeholders.goal_step_amount', pointer:"stepConfig.amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoalStepCompleteData>,
		{tag:"GOALS_ID", descKey:'triggers.placeholders.goal_overlay_id', pointer:"goalConfig.id", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoalStepCompleteData>,
		{tag:"GOALS_TITLE", descKey:'triggers.placeholders.goal_overlay_title', pointer:"goalConfig.title", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageGoalStepCompleteData>,
	];

	map[TriggerTypes.CUSTOM_TRAIN_COMPLETE] = [
		{tag:"TRAIN_ID", descKey:'triggers.placeholders.custom_train_id', pointer:"trainId", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
		{tag:"TRAIN_NAME", descKey:'triggers.placeholders.custom_train_name', pointer:"trainName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
		{tag:"TRAIN_LEVEL", descKey:'triggers.placeholders.custom_train_level', pointer:"level", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
		{tag:"TRAIN_PERCENT", descKey:'triggers.placeholders.custom_train_percent', pointer:"percent", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
		{tag:"TRAIN_AMOUNT", descKey:'triggers.placeholders.custom_train_amount', pointer:"amount", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
		{tag:"TRAIN_AMOUNT_FORMATTED", descKey:'triggers.placeholders.custom_train_amountFormatted', pointer:"amountFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
		{tag:"TRAIN_RECORD", descKey:'triggers.placeholders.custom_train_record', pointer:"isRecord", numberParsable:false, isUserID:false, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
	];

	map[TriggerTypes.CUSTOM_TRAIN_LEVEL_UP] = [ ...map[TriggerTypes.CUSTOM_TRAIN_COMPLETE]!,
		{tag:"TRAIN_AMOUNT_LEFT", descKey:'triggers.placeholders.custom_train_amountLeft', pointer:"amountLeft", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
		{tag:"TRAIN_AMOUNT_LEFT_FORMATTED", descKey:'triggers.placeholders.custom_train_amountLeftFormatted', pointer:"amountLeftFormatted", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
	]

	map[TriggerTypes.CUSTOM_TRAIN_START] =
	map[TriggerTypes.CUSTOM_TRAIN_FAIL] =
	map[TriggerTypes.CUSTOM_TRAIN_COOLDOWN] = [
		{tag:"TRAIN_ID", descKey:'triggers.placeholders.custom_train_id', pointer:"trainId", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
		{tag:"TRAIN_NAME", descKey:'triggers.placeholders.custom_train_name', pointer:"trainName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageCustomTrainLevelUpData>,
	];

	map[TriggerTypes.STREAMSOCKET_ACTION] = [
		{tag:USER_NAME, descKey:'triggers.placeholders.user', pointer:"user.displayNameOriginal", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamSocketActionData>,
		{tag:USER_DISPLAY_NAME, descKey:'triggers.placeholders.user_customName', pointer:"user.displayName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamSocketActionData>,
		{tag:USER_ID, descKey:'triggers.placeholders.user_id', pointer:"user.id", numberParsable:false, isUserID:true} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamSocketActionData>,
		{tag:USER_AVATAR, descKey:'triggers.placeholders.user_avatar', pointer:"user.avatarPath", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamSocketActionData>,
		{tag:USER_CUSTOM_BADGES, descKey:'triggers.placeholders.user_custom_badges', pointer:"__user_custom_badges__", numberParsable:false, isUserID:false},
		{tag:"ACTION_ID", descKey:'triggers.placeholders.streamsocket_action_id', pointer:"actionId", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamSocketActionData>,
		{tag:"ACTION_NAME", descKey:'triggers.placeholders.streamsocket_action_name', pointer:"actionName", numberParsable:false, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamSocketActionData>,
		{tag:"ACTION_BITS", descKey:'triggers.placeholders.streamsocket_action_bits', pointer:"bits", numberParsable:true, isUserID:false} as ITriggerPlaceholder<TwitchatDataTypes.MessageStreamSocketActionData>,
	];

	const counters = StoreProxy.counters.counterList;
	const counterPlaceholders:ITriggerPlaceholder<any>[] = [];
	for (let i = 0; i < counters.length; i++) {
		const c = counters[i];
		if(c.placeholderKey) {
			counterPlaceholders.push({category:"counter", tag:COUNTER_VALUE_PLACEHOLDER_PREFIX + c.placeholderKey.toUpperCase(), descKey:'triggers.placeholders.counter_global_value', descReplacedValues:{"NAME":c.name}, pointer:"__counter__.value", numberParsable:true, isUserID:false, globalTag:true, example:(c.value || 123).toString()} as ITriggerPlaceholder<TwitchatDataTypes.CounterData, string, "__counter__">);
		}
	}

	const values = StoreProxy.values.valueList;
	const valuePlaceholders:ITriggerPlaceholder<any>[] = [];
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		if(v.placeholderKey) {
			valuePlaceholders.push({category:"value", tag:VALUE_PLACEHOLDER_PREFIX + v.placeholderKey.toUpperCase(), descKey:'triggers.placeholders.value_global_value', descReplacedValues:{"NAME":v.name}, pointer:"__value__.value", numberParsable:true, isUserID:false, globalTag:true, example:"Lorem ipsum"} as ITriggerPlaceholder<TwitchatDataTypes.ValueData, string, "__value__">);
		}
	}

	const timers = StoreProxy.timers.timerList;
	const timersPlaceholders:ITriggerPlaceholder<any>[] = [];
	for (let i = 0; i < timers.length; i++) {
		const t = timers[i];
		if(t.placeholderKey) {
			const prefix = t.type == "timer"? STOPWATCH_PLACEHOLDER_PREFIX : COUNTDOWN_PLACEHOLDER_PREFIX;
			const tagBase = prefix + t.placeholderKey.toUpperCase();
			timersPlaceholders.push({category:"timer", tag:tagBase+"_PAUSED", descKey:'triggers.placeholders.timer_paused', descReplacedValues:{"NAME":t.title}, pointer:"__timer__.paused", numberParsable:false, isUserID:false, globalTag:true, storage:t.id} as ITriggerPlaceholder<TwitchatDataTypes.TimerData, string, "__timer__">);
			if(t.type == "timer") {
				timersPlaceholders.push({category:"timer", tag:tagBase+"_ELAPSED", descKey:'triggers.placeholders.timer_duration_formatted', descReplacedValues:{"NAME":t.title}, pointer:"__timer__.elapsed_formatted", numberParsable:true, isUserID:false, globalTag:true, example:"60000", storage:t.id});
				timersPlaceholders.push({category:"timer", tag:tagBase+"_ELAPSED_MS", descKey:'triggers.placeholders.timer_duration_ms', descReplacedValues:{"NAME":t.title}, pointer:"__timer__.elapsed_ms", numberParsable:true, isUserID:false, globalTag:true, example:"60", storage:t.id});
			}
			if(t.type == "countdown") {
				timersPlaceholders.push({category:"timer", tag:tagBase+"_DURATION", descKey:'triggers.placeholders.countdown_duration_formatted', descReplacedValues:{"NAME":t.title}, pointer:"__timer__.duration_formatted", numberParsable:true, isUserID:false, globalTag:true, example:"60000", storage:t.id});
				timersPlaceholders.push({category:"timer", tag:tagBase+"_DURATION_MS", descKey:'triggers.placeholders.countdown_duration_ms', descReplacedValues:{"NAME":t.title}, pointer:"__timer__.duration_ms", numberParsable:true, isUserID:false, globalTag:true, example:"60", storage:t.id});
				timersPlaceholders.push({category:"timer", tag:tagBase+"_REMAINING", descKey:'triggers.placeholders.countdown_remaining_formatted', descReplacedValues:{"NAME":t.title}, pointer:"__timer__.remaining_formatted", numberParsable:true, isUserID:false, globalTag:true, example:"60000", storage:t.id});
				timersPlaceholders.push({category:"timer", tag:tagBase+"_REMAINING_MS", descKey:'triggers.placeholders.countdown_remaining_ms', descReplacedValues:{"NAME":t.title}, pointer:"__timer__.remaining_ms", numberParsable:true, isUserID:false, globalTag:true, example:"60", storage:t.id});
			}
		}
	}

	//Add global placeholders where missing
	let k!:TriggerTypesValue;
	const hasUlule = DataStore.get(DataStore.ULULE_PROJECT);
	for (k in map) {
		let entry = map[k]!;
		if(entry.findIndex(v=>v.tag == "MY_LOGIN") == -1) {
			entry.push({tag:"MY_ID", descKey:'triggers.placeholders.my_user_id', pointer:"__me__.id", numberParsable:false, isUserID:true, globalTag:true, example:"123456"} as ITriggerPlaceholder<TwitchatDataTypes.TwitchatUser, string, "__me__">);
			entry.push({tag:"MY_LOGIN", descKey:'triggers.placeholders.my_user', pointer:"__me__.login", numberParsable:false, isUserID:false, globalTag:true, example:"Durss"} as ITriggerPlaceholder<TwitchatDataTypes.TwitchatUser, string, "__me__">);
		}
		if(entry.findIndex(v=>v.tag == "NOW") == -1) {
			entry.push({tag:"NOW", descKey:'triggers.placeholders.now', pointer:"__date__.now", numberParsable:true, isUserID:false, globalTag:true, example:Date.now().toString()});
			entry.push({tag:"DATE", descKey:'triggers.placeholders.date', pointer:"__date__.date", numberParsable:false, isUserID:false, globalTag:true, example:Utils.formatDate(new Date(), false)});
			entry.push({tag:"TIME", descKey:'triggers.placeholders.time', pointer:"__date__.time", numberParsable:false, isUserID:false, globalTag:true, example:Utils.formatDate(new Date(), true, true)});
			entry.push({tag:"DATETIME", descKey:'triggers.placeholders.datetime', pointer:"__date__.datetime", numberParsable:false, isUserID:false, globalTag:true, example:Utils.formatDate(new Date(), true)});
			entry.push({tag:"PLATFORM", descKey:'triggers.placeholders.platform', pointer:"platform", numberParsable:false, isUserID:false, globalTag:true, example:"twitch",
				values:[
					{label:"Twitch", value:"twitch"},
					{label:"YouTube", value:"youtube"},
					{label:"TikTok", value:"tiktok"},
				]
			} as ITriggerPlaceholder<TwitchatDataTypes.AbstractTwitchatMessage>);
		}
		if(entry.findIndex(v=>v.tag == "MY_STREAM_TITLE") == -1) {
			entry.push({category:"stream", tag:"MY_STREAM_TITLE", descKey:'triggers.placeholders.my_stream_title', pointer:"__my_stream__.title", numberParsable:false, isUserID:false, globalTag:true, example:"Talking about stuff"} as ITriggerPlaceholder<TwitchatDataTypes.StreamInfo, string, "__my_stream__">);
			entry.push({category:"stream", tag:"MY_STREAM_CATEGORY", descKey:'triggers.placeholders.my_stream_category', pointer:"__my_stream__.category", numberParsable:false, isUserID:false, globalTag:true, example:"Just chatting"} as ITriggerPlaceholder<TwitchatDataTypes.StreamInfo, string, "__my_stream__">);
			entry.push({category:"stream", tag:"VIEWER_COUNT", descKey:"triggers.placeholders.viewer_count", pointer:"__my_stream__.viewers", numberParsable:true, isUserID:false, globalTag:true, example:"333"} as ITriggerPlaceholder<TwitchatDataTypes.StreamInfo, string, "__my_stream__">);
			entry.push({category:"stream", tag:"MY_STREAM_DURATION", descKey:"triggers.placeholders.my_stream_duration", pointer:"__my_stream__.duration", numberParsable:false, isUserID:false, globalTag:true, example:"01:23:45"});
			entry.push({category:"stream", tag:"MY_STREAM_DURATION_MS", descKey:"triggers.placeholders.my_stream_duration_ms", pointer:"__my_stream__.duration_ms", numberParsable:true, isUserID:false, globalTag:true, example:"16200000"});
			entry.push({category:"stream", tag:"MY_STREAM_LIVE", descKey:"triggers.placeholders.my_stream_live", pointer:"__my_stream__.live", numberParsable:false, isUserID:false, globalTag:true, values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}], example:"false"} as ITriggerPlaceholder<TwitchatDataTypes.StreamInfo, boolean, "__my_stream__">);
			entry.push({category:"stream", tag:"CURRENT_VOD_URL", descKey:'triggers.placeholders.current_vod_url', pointer:"__current_vod__", numberParsable:false, isUserID:true, globalTag:true, example:"https://www.twitch.tv/videos/123456"});
		}

		if(entry.findIndex(v=>v.tag == "ULULE_CAMPAIGN_NAME") == -1 && hasUlule) {
			entry.push({tag:"ULULE_CAMPAIGN_NAME", descKey:'triggers.placeholders.ulule_campaign_name', pointer:"__ulule__.name", numberParsable:false, isUserID:false, globalTag:true, example:"My ulule campaign"});
		}

		if(entry.findIndex(v=>v.tag == "ULULE_CAMPAIGN_URL") == -1 && hasUlule) {
			entry.push({tag:"ULULE_CAMPAIGN_URL", descKey:'triggers.placeholders.ulule_campaign_url', pointer:"__ulule__.url", numberParsable:false, isUserID:false, globalTag:true, example:"https://ulule.com"});
		}

		if(entry.findIndex(v=>v.tag == "TRIGGER_NAME") == -1 && key != TriggerTypes.GLOBAL_PLACEHOLDERS) {
			entry.push({tag:"TRIGGER_NAME", descKey:"triggers.placeholders.trigger_name", pointer:"__trigger__.name", numberParsable:false, isUserID:false, globalTag:true, example:"My trigger"});
			entry.push({tag:"TRIGGER_ID", descKey:"triggers.placeholders.trigger_id", pointer:"__trigger__.id", numberParsable:false, isUserID:false, globalTag:true, example:"00000000-0000-0000-0000-000000000000"});
		}

		if(entry.findIndex(v=>v.tag == "OBS_SCENE") == -1) {
			entry.push({tag:"OBS_SCENE", descKey:"triggers.placeholders.obs_scene", pointer:"__obs__.scene", numberParsable:false, isUserID:false, globalTag:true, example:"OBS scene"});
		}

		if(entry.findIndex(v=>v.tag == "TWITCH_LAST_SUB") == -1 && TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) {
			entry.push({category:"twitch", tag:"TWITCH_LAST_SUB", descKey:"triggers.placeholders.last_sub", pointer:"__twitch__.lastsub_login", numberParsable:false, isUserID:false, globalTag:true, example:"Durss"});
			entry.push({category:"twitch", tag:"TWITCH_LAST_SUB_ID", descKey:"triggers.placeholders.last_sub_id", pointer:"__twitch__.lastsub_id", numberParsable:false, isUserID:true, globalTag:true, example:"29961813"});
			entry.push({category:"twitch", tag:"TWITCH_LAST_SUB_TIER", descKey:"triggers.placeholders.last_sub_tier", pointer:"__twitch__.lastsub_tier", numberParsable:false, isUserID:true, globalTag:true, example:"1"});
			entry.push({category:"twitch", tag:"TWITCH_LAST_SUBGIFTER", descKey:"triggers.placeholders.last_subgifter", pointer:"__twitch__.lastsubgifter_login", numberParsable:false, isUserID:false, globalTag:true, example:"Durss"});
			entry.push({category:"twitch", tag:"TWITCH_LAST_SUBGIFTER_ID", descKey:"triggers.placeholders.last_subgifter_id", pointer:"__twitch__.lastsubgifter_id", numberParsable:false, isUserID:true, globalTag:true, example:"29961813"});
			entry.push({category:"twitch", tag:"TWITCH_LAST_SUBGIFTER_TIER", descKey:"triggers.placeholders.last_subgifter_tier", pointer:"__twitch__.lastsubgifter_tier", numberParsable:false, isUserID:true, globalTag:true, example:"1"});
			entry.push({category:"twitch", tag:"TWITCH_TOTAL_SUBS_ACTIVE", descKey:"triggers.placeholders.total_sub", pointer:"__twitch__.totalsubs", numberParsable:true, isUserID:false, globalTag:true, example:"1312"});
			entry.push({category:"twitch", tag:"TWITCH_PARTNER_PLUS_POINTS", descKey:"triggers.placeholders.partner_plus_points", pointer:"__twitch__.partnerpluspoints", numberParsable:true, isUserID:false, globalTag:true, example:"1312", private:true});
		}
		if(entry.findIndex(v=>v.tag == "TWITCH_LAST_FOLLOW") == -1 && TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
			entry.push({category:"twitch", tag:"TWITCH_LAST_FOLLOW", descKey:"triggers.placeholders.last_follow", pointer:"__twitch__.lastFollow_login", numberParsable:false, isUserID:false, globalTag:true, example:"Durss"});
			entry.push({category:"twitch", tag:"TWITCH_LAST_FOLLOW_ID", descKey:"triggers.placeholders.last_follow_id", pointer:"__twitch__.lastfollow_id", numberParsable:false, isUserID:true, globalTag:true, example:"29961813"});
			entry.push({category:"twitch", tag:"TWITCH_TOTAL_FOLLOWERS", descKey:"triggers.placeholders.total_follow", pointer:"__twitch__.totalfollowers", numberParsable:true, isUserID:false, globalTag:true, example:"1312"});
		}
		if(entry.findIndex(v=>v.tag == "TWITCH_LAST_CHEER") == -1) {
			entry.push({category:"twitch", tag:"TWITCH_LAST_CHEER", descKey:"triggers.placeholders.last_cheer", pointer:"__twitch__.lastcheer_login", numberParsable:false, isUserID:false, globalTag:true, example:"Durss"});
			entry.push({category:"twitch", tag:"TWITCH_LAST_CHEER_ID", descKey:"triggers.placeholders.last_cheer_id", pointer:"__twitch__.lastcheer_id", numberParsable:false, isUserID:true, globalTag:true, example:"29961813"});
			entry.push({category:"twitch", tag:"TWITCH_LAST_CHEER_AMOUNT", descKey:"triggers.placeholders.last_cheer_amount", pointer:"__twitch__.lastcheer_amount", numberParsable:true, isUserID:false, globalTag:true, example:"1312"});
		}

		//If a music service is available, concat the music service helpers
		if(SpotifyHelper.instance.connected && entry.findIndex(v=>v.tag == "CURRENT_TRACK_ARTIST") == -1) {
			entry.push(
				{category:"music", tag:"CURRENT_TRACK_ARTIST", descKey:'triggers.placeholders.track_artist', pointer:"__current_track__.artist", numberParsable:false, isUserID:false, globalTag:true, example:"Mitchiri Neko"} as ITriggerPlaceholder<TwitchatDataTypes.MusicTrackDataKeys, string, "__current_track__">,
				{category:"music", tag:"CURRENT_TRACK_TITLE", descKey:'triggers.placeholders.track_title', pointer:"__current_track__.title", numberParsable:false, isUserID:false, globalTag:true, example:"Mitchiri Neko march"} as ITriggerPlaceholder<TwitchatDataTypes.MusicTrackDataKeys, string, "__current_track__">,
				{category:"music", tag:"CURRENT_TRACK_ALBUM", descKey:'triggers.placeholders.track_album', pointer:"__current_track__.album", numberParsable:false, isUserID:false, globalTag:true, example:"Fake Album"} as ITriggerPlaceholder<TwitchatDataTypes.MusicTrackDataKeys, string, "__current_track__">,
				{category:"music", tag:"CURRENT_TRACK_COVER", descKey:'triggers.placeholders.track_cover', pointer:"__current_track__.cover", numberParsable:false, isUserID:false, globalTag:true, example:StoreProxy.asset("img/musicExampleCover.jpg")} as ITriggerPlaceholder<TwitchatDataTypes.MusicTrackDataKeys, string, "__current_track__">,
				{category:"music", tag:"CURRENT_TRACK_URL", descKey:'triggers.placeholders.track_url', pointer:"__current_track__.url", numberParsable:false, isUserID:false, globalTag:true, example:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=deddb27b6b6148a6"} as ITriggerPlaceholder<TwitchatDataTypes.MusicTrackDataKeys, string, "__current_track__">,
				{category:"music", tag:"CURRENT_PLAYLIST_TITLE", descKey:'triggers.placeholders.playlist_title', pointer:"__current_track__.playlist.title", numberParsable:false, isUserID:false, globalTag:true, example:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=deddb27b6b6148a6"} as ITriggerPlaceholder<TwitchatDataTypes.MusicTrackDataKeys, string, "__current_track__">,
				{category:"music", tag:"CURRENT_PLAYLIST_URL", descKey:'triggers.placeholders.playlist_url', pointer:"__current_track__.playlist.url", numberParsable:false, isUserID:false, globalTag:true, example:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=deddb27b6b6148a6"} as ITriggerPlaceholder<TwitchatDataTypes.MusicTrackDataKeys, string, "__current_track__">,
				{category:"music", tag:"CURRENT_PLAYLIST_COVER", descKey:'triggers.placeholders.playlist_cover', pointer:"__current_track__.playlist.cover", numberParsable:false, isUserID:false, globalTag:true, example:"https://open.spotify.com/track/1qZMyyaTyyJUjnfqtnmDdR?si=deddb27b6b6148a6"} as ITriggerPlaceholder<TwitchatDataTypes.MusicTrackDataKeys, string, "__current_track__">,
				{category:"music", tag:"SPOTIFY_IS_PLAYING", descKey:'triggers.placeholders.spotify_is_playing', pointer:"__current_track__.spotify_is_playing", numberParsable:false, isUserID:false, globalTag:true, example:"true", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
			);
		}

		//If a goxlr is connected concat available placeholder
		if(GoXLRSocket.instance.connected && entry.findIndex(v=>v.tag == "GOXLR_COUGH") == -1) {
			entry.push(
				{category:"goxlr", tag:"GOXLR_COUGH", descKey:'triggers.placeholders.goxlr_cough', pointer:"__goxlr__.cough", numberParsable:false, isUserID:false, globalTag:true, example:"true", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
				{category:"goxlr", tag:"GOXLR_PROFILE", descKey:'triggers.placeholders.goxlr_profile', pointer:"__goxlr__.profile", numberParsable:false, isUserID:false, globalTag:true, example:"true"},
				{category:"goxlr", tag:"GOXLR_INPUT_MIC", descKey:'triggers.placeholders.goxlr_input_mic', pointer:"__goxlr__.input.mic", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_CHAT", descKey:'triggers.placeholders.goxlr_input_chat', pointer:"__goxlr__.input.chat", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_MUSIC", descKey:'triggers.placeholders.goxlr_input_music', pointer:"__goxlr__.input.music", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_GAME", descKey:'triggers.placeholders.goxlr_input_game', pointer:"__goxlr__.input.game", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_CONSOLE", descKey:'triggers.placeholders.goxlr_input_console', pointer:"__goxlr__.input.console", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_LINEIN", descKey:'triggers.placeholders.goxlr_input_linein', pointer:"__goxlr__.input.linein", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_SYSTEM", descKey:'triggers.placeholders.goxlr_input_system', pointer:"__goxlr__.input.system", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_INPUT_SAMPLE", descKey:'triggers.placeholders.goxlr_input_sample', pointer:"__goxlr__.input.sample", numberParsable:true, isUserID:false, globalTag:true, example:"128"},
				{category:"goxlr", tag:"GOXLR_FX_ENABLED", descKey:'triggers.placeholders.goxlr_fx_state', pointer:"__goxlr__.fx.enabled", numberParsable:true, isUserID:false, globalTag:true, example:"true", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
				{category:"goxlr", tag:"GOXLR_FX_PRESET", descKey:'triggers.placeholders.goxlr_fx_preset', pointer:"__goxlr__.fx.preset", numberParsable:false, isUserID:false, globalTag:true, example:"3"},
				{category:"goxlr", tag:"GOXLR_FX_MEGAPHONE", descKey:'triggers.placeholders.goxlr_megaphone', pointer:"__goxlr__.fx.megaphone", numberParsable:false, isUserID:false, globalTag:true, example:"true", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
				{category:"goxlr", tag:"GOXLR_FX_ROBOT", descKey:'triggers.placeholders.goxlr_robot', pointer:"__goxlr__.fx.robot", numberParsable:false, isUserID:false, globalTag:true, example:"true", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
				{category:"goxlr", tag:"GOXLR_FX_HARDTUNE", descKey:'triggers.placeholders.goxlr_hardtune', pointer:"__goxlr__.fx.hardtune", numberParsable:false, isUserID:false, globalTag:true, example:"true", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
				{category:"goxlr", tag:"GOXLR_FX_REVERB", descKey:'triggers.placeholders.goxlr_reverb', pointer:"__goxlr__.fx.reverb", numberParsable:false, isUserID:false, globalTag:true, example:"12"},
				{category:"goxlr", tag:"GOXLR_FX_PITCH", descKey:'triggers.placeholders.goxlr_pitch', pointer:"__goxlr__.fx.pitch", numberParsable:false, isUserID:false, globalTag:true, example:"-5"},
				{category:"goxlr", tag:"GOXLR_FX_ECHO", descKey:'triggers.placeholders.goxlr_echo', pointer:"__goxlr__.fx.echo", numberParsable:false, isUserID:false, globalTag:true, example:"50"},
				{category:"goxlr", tag:"GOXLR_FX_GENDER", descKey:'triggers.placeholders.goxlr_gender', pointer:"__goxlr__.fx.gender", numberParsable:false, isUserID:false, globalTag:true, example:"-12"},
				{category:"goxlr", tag:"GOXLR_FADER_1_MUTE", descKey:'triggers.placeholders.goxlr_fader_1_mute', pointer:"__goxlr__.fader.a", numberParsable:false, isUserID:false, globalTag:true, example:"false", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
				{category:"goxlr", tag:"GOXLR_FADER_2_MUTE", descKey:'triggers.placeholders.goxlr_fader_2_mute', pointer:"__goxlr__.fader.b", numberParsable:false, isUserID:false, globalTag:true, example:"false", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
				{category:"goxlr", tag:"GOXLR_FADER_3_MUTE", descKey:'triggers.placeholders.goxlr_fader_3_mute', pointer:"__goxlr__.fader.c", numberParsable:false, isUserID:false, globalTag:true, example:"false", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
				{category:"goxlr", tag:"GOXLR_FADER_4_MUTE", descKey:'triggers.placeholders.goxlr_fader_4_mute', pointer:"__goxlr__.fader.d", numberParsable:false, isUserID:false, globalTag:true, example:"false", values:[{labelKey:"global.yes", value:true}, {labelKey:"global.no", value:false}]},
			);
		}

		/* DISABLED BECAUSE OF S*** AS HELL STREAMELEMENTS API THAT DOESN'T WORK
		if(StoreProxy.streamelements.connected && entry.findIndex(v=>v.tag == "STREAMELEMENTS_TIP_LATEST_AMOUNT") == -1) {
			entry.push(
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_LATEST_AMOUNT", pointer:"__streamelements__.tipLatest.amount", descKey:"triggers.placeholders.sl_tipLatest_amount", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_LATEST_MESSAGE", pointer:"__streamelements__.tipLatest.message", descKey:"triggers.placeholders.sl_tipLatest_message", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_LATEST_USERNAME", pointer:"__streamelements__.tipLatest.username", descKey:"triggers.placeholders.sl_tipLatest_username", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_SESSION", pointer:"__streamelements__.tipSession", descKey:"triggers.placeholders.sl_tipSession", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_TOTAL", pointer:"__streamelements__.tipTotal", descKey:"triggers.placeholders.sl_tipTotal", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_COUNT", pointer:"__streamelements__.tipCount", descKey:"triggers.placeholders.sl_tipCount", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_WEEK", pointer:"__streamelements__.tipWeek", descKey:"triggers.placeholders.sl_tipWeek", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_MONTH", pointer:"__streamelements__.tipMonth", descKey:"triggers.placeholders.sl_tipMonth", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_GOAL", pointer:"__streamelements__.tipGoal", descKey:"triggers.placeholders.sl_tipGoal", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_SESSION_TOP_DONATION_AMOUNT", pointer:"__streamelements__.tipSessionTopDonation.amount", descKey:"triggers.placeholders.sl_tipSessionTopDonation_amount", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_SESSION_TOP_DONATION_USERNAME", pointer:"__streamelements__.tipSessionTopDonation.username", descKey:"triggers.placeholders.sl_tipSessionTopDonation_username", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_WEEKLY_TOP_DONATION_AMOUNT", pointer:"__streamelements__.tipWeeklyTopDonation.amount", descKey:"triggers.placeholders.sl_tipWeeklyTopDonation_amount", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_WEEKLY_TOP_DONATION_USERNAME", pointer:"__streamelements__.tipWeeklyTopDonation.username", descKey:"triggers.placeholders.sl_tipWeeklyTopDonation_username", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_MONTHLY_TOP_DONATION_AMOUNT", pointer:"__streamelements__.tipMonthlyTopDonation.amount", descKey:"triggers.placeholders.sl_tipMonthlyTopDonation_amount", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_MONTHLY_TOP_DONATION_USERNAME", pointer:"__streamelements__.tipMonthlyTopDonation.username", descKey:"triggers.placeholders.sl_tipMonthlyTopDonation_username", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_ALLTIME_TOP_DONATION_AMOUNT", pointer:"__streamelements__.tipAlltimeTopDonation.amount", descKey:"triggers.placeholders.sl_tipAlltimeTopDonation_amount", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__streamlabs__">,
				{category:"streamlabs", tag:"STREAMELEMENTS_TIP_ALLTIME_TOP_DONATION_USERNAME", pointer:"__streamelements__.tipAlltimeTopDonation.username", descKey:"triggers.placeholders.sl_tipAlltimeTopDonation_username", numberParsable:false, isUserID:false, globalTag:true, example:""} as ITriggerPlaceholder<IStreamelementsState, string, "__test__">,
			);
		}
		//*/

		entry = entry.concat(counterPlaceholders);
		entry = entry.concat(valuePlaceholders);
		entry = entry.concat(timersPlaceholders);
		map[k] = entry;
	}

	//Inject custom values
	for (const triggerType in eventPlaceholderValuesCache) {
		let typedKey = triggerType as TriggerTypesValue;
		if(!map[typedKey]) continue;
		const placeholder = map[typedKey].find(v=>v.tag == eventPlaceholderValuesCache[typedKey]?.tag)
		if(!placeholder) continue;
		placeholder.values = eventPlaceholderValuesCache[typedKey]!.values;
	}

	eventPlaceholdersCache = reactive(map);
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
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.TWITCHAT, icon:"highlight", labelKey:"triggers.events.HIGHLIGHT_CHAT_MESSAGE_CLOSE.label", value:TriggerTypes.HIGHLIGHT_CHAT_MESSAGE_CLOSE, descriptionKey:"triggers.events.HIGHLIGHT_CHAT_MESSAGE_CLOSE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT_CLOSE},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"alert", labelKey:"triggers.events.CHAT_ALERT.label", value:TriggerTypes.CHAT_ALERT, descriptionKey:"triggers.events.CHAT_ALERT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"commands", labelKey:"triggers.events.SLASH_COMMAND.label", value:TriggerTypes.SLASH_COMMAND, descriptionKey:"triggers.events.SLASH_COMMAND.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13_7, category:TriggerEventTypeCategories.TWITCHAT, icon:"twitchat", labelKey:"triggers.events.TWITCHAT_STARTED.label", value:TriggerTypes.TWITCHAT_STARTED, descriptionKey:"triggers.events.TWITCHAT_STARTED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TWITCHAT_STARTED},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13_1, category:TriggerEventTypeCategories.TWITCHAT, icon:"broadcast", labelKey:"triggers.events.WEBSOCKET_TOPIC.label", value:TriggerTypes.WEBSOCKET_TOPIC, descriptionKey:"triggers.events.WEBSOCKET_TOPIC.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.WEBSOCKET_TOPIC},

		{category:TriggerEventTypeCategories.CHAT_REWARDS, icon:"chatCommand", labelKey:"triggers.events.CHAT_COMMAND.label", value:TriggerTypes.CHAT_COMMAND, isCategory:true, descriptionKey:"triggers.events.CHAT_COMMAND.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.CHAT_REWARDS, icon:"whispers", labelKey:"triggers.events.ANY_MESSAGE.label", value:TriggerTypes.ANY_MESSAGE, descriptionKey:"triggers.events.ANY_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.CHAT_REWARDS, icon:"reply", labelKey:"triggers.events.MESSAGE_ANSWER.label", value:TriggerTypes.MESSAGE_ANSWER, descriptionKey:"triggers.events.MESSAGE_ANSWER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.CHAT_REWARDS, icon:"channelPoints", labelKey:"triggers.events.REWARD_REDEEM.label", value:TriggerTypes.REWARD_REDEEM, isCategory:true, descriptionKey:"triggers.events.REWARD_REDEEM.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.REWARD},
		{disabled:true, disabledReasonLabelKey:"triggers.events.COMMUNITY_CHALLENGE_PROGRESS.disabled_reason", category:TriggerEventTypeCategories.CHAT_REWARDS, icon:"channelPoints", labelKey:"triggers.events.COMMUNITY_CHALLENGE_PROGRESS.label", value:TriggerTypes.COMMUNITY_CHALLENGE_PROGRESS, descriptionKey:"triggers.events.COMMUNITY_CHALLENGE_PROGRESS.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},
		{disabled:true, disabledReasonLabelKey:"triggers.events.COMMUNITY_CHALLENGE_COMPLETE.disabled_reason", category:TriggerEventTypeCategories.CHAT_REWARDS, icon:"channelPoints", labelKey:"triggers.events.COMMUNITY_CHALLENGE_COMPLETE.label", value:TriggerTypes.COMMUNITY_CHALLENGE_COMPLETE, descriptionKey:"triggers.events.COMMUNITY_CHALLENGE_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION},

		{category:TriggerEventTypeCategories.USER, icon:"firstTime", labelKey:"triggers.events.FIRST_ALL_TIME.label", value:TriggerTypes.FIRST_ALL_TIME, descriptionKey:"triggers.events.FIRST_ALL_TIME.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"firstTime", labelKey:"triggers.events.FIRST_TODAY.label", value:TriggerTypes.FIRST_TODAY, descriptionKey:"triggers.events.FIRST_TODAY.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.USER, icon:"returning", labelKey:"triggers.events.RETURNING_USER.label", value:TriggerTypes.RETURNING_USER, descriptionKey:"triggers.events.RETURNING_USER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE, disabled:true, disabledReasonLabelKey:"triggers.events.RETURNING_USER.disabled_reason"},
		{category:TriggerEventTypeCategories.USER, icon:"follow", labelKey:"triggers.events.FOLLOW.label", value:TriggerTypes.FOLLOW, descriptionKey:"triggers.events.FOLLOW.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.FOLLOWING},
		{category:TriggerEventTypeCategories.USER, icon:"raid", labelKey:"triggers.events.RAID.label", value:TriggerTypes.RAID, descriptionKey:"triggers.events.RAID.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAID},
		{category:TriggerEventTypeCategories.USER, icon:"watchStreak", labelKey:"triggers.events.USER_WATCH_STREAK.label", value:TriggerTypes.USER_WATCH_STREAK, descriptionKey:"triggers.events.USER_WATCH_STREAK.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK},
		{category:TriggerEventTypeCategories.USER, icon:"online", labelKey:"triggers.events.USER_JOIN.label", value:TriggerTypes.USER_JOIN, descriptionKey:"triggers.events.USER_JOIN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.JOIN, private:true},
		{category:TriggerEventTypeCategories.USER, icon:"offline", labelKey:"triggers.events.USER_LEAVE.label", value:TriggerTypes.USER_LEAVE, descriptionKey:"triggers.events.USER_LEAVE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.LEAVE, private:true},

		{newDate:Config.instance.NEW_FLAGS_DATE_V13, premium:true, category:TriggerEventTypeCategories.YOUTUBE, icon:"youtube", labelKey:"triggers.events.YOUTUBE_SUPER_CHAT.label", value:TriggerTypes.YOUTUBE_SUPER_CHAT, descriptionKey:"triggers.events.YOUTUBE_SUPER_CHAT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, premium:true, category:TriggerEventTypeCategories.YOUTUBE, icon:"youtube", labelKey:"triggers.events.YOUTUBE_SUPER_STICKER.label", value:TriggerTypes.YOUTUBE_SUPER_STICKER, descriptionKey:"triggers.events.YOUTUBE_SUPER_STICKER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, premium:true, category:TriggerEventTypeCategories.YOUTUBE, icon:"youtube", labelKey:"triggers.events.YOUTUBE_SUBSCRIPTION.label", value:TriggerTypes.YOUTUBE_SUBSCRIPTION, descriptionKey:"triggers.events.YOUTUBE_SUBSCRIPTION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, premium:true, category:TriggerEventTypeCategories.YOUTUBE, icon:"youtube", labelKey:"triggers.events.YOUTUBE_SUBGIFT.label", value:TriggerTypes.YOUTUBE_SUBGIFT, descriptionKey:"triggers.events.YOUTUBE_SUBGIFT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT},

		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.TIKTOK, icon:"tiktok", labelKey:"triggers.events.TIKTOK_SUB.label", value:TriggerTypes.TIKTOK_SUB, descriptionKey:"triggers.events.TIKTOK_SUB.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIKTOK_SUB},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.TIKTOK, icon:"tiktok", labelKey:"triggers.events.TIKTOK_GIFT.label", value:TriggerTypes.TIKTOK_GIFT, descriptionKey:"triggers.events.TIKTOK_GIFT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIKTOK_GIFT},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.TIKTOK, icon:"tiktok", labelKey:"triggers.events.TIKTOK_LIKE.label", value:TriggerTypes.TIKTOK_LIKE, descriptionKey:"triggers.events.TIKTOK_LIKE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIKTOK_LIKE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.TIKTOK, icon:"tiktok", labelKey:"triggers.events.TIKTOK_SHARE.label", value:TriggerTypes.TIKTOK_SHARE, descriptionKey:"triggers.events.TIKTOK_SHARE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIKTOK_SHARE},

		{newDate:Config.instance.NEW_FLAGS_DATE_V12, category:TriggerEventTypeCategories.GAMES, icon:"poll", labelKey:"triggers.events.POLL_START.label", value:TriggerTypes.POLL_START, descriptionKey:"triggers.events.POLL_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.POLL},
		{category:TriggerEventTypeCategories.GAMES, icon:"poll", labelKey:"triggers.events.POLL_RESULT.label", value:TriggerTypes.POLL_RESULT, descriptionKey:"triggers.events.POLL_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.POLL},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, category:TriggerEventTypeCategories.GAMES, icon:"prediction", labelKey:"triggers.events.PREDICTION_START.label", value:TriggerTypes.PREDICTION_START, descriptionKey:"triggers.events.PREDICTION_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.PREDICTION},
		{category:TriggerEventTypeCategories.GAMES, icon:"prediction", labelKey:"triggers.events.PREDICTION_RESULT.label", value:TriggerTypes.PREDICTION_RESULT, descriptionKey:"triggers.events.PREDICTION_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.PREDICTION},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.GAMES, icon:"chatPoll", labelKey:"triggers.events.CHAT_POLL_START.label", value:TriggerTypes.CHAT_POLL_START, descriptionKey:"triggers.events.CHAT_POLL_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_POLL},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.GAMES, icon:"chatPoll", labelKey:"triggers.events.CHAT_POLL_RESULT.label", value:TriggerTypes.CHAT_POLL_RESULT, descriptionKey:"triggers.events.CHAT_POLL_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHAT_POLL},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.GAMES, icon:"ticket", labelKey:"triggers.events.RAFFLE_PICK_WINNER.label", value:TriggerTypes.RAFFLE_PICK_WINNER, descriptionKey:"triggers.events.RAFFLE_PICK_WINNER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAFFLE},
		{category:TriggerEventTypeCategories.GAMES, icon:"ticket", labelKey:"triggers.events.RAFFLE_RESULT.label", value:TriggerTypes.RAFFLE_RESULT, descriptionKey:"triggers.events.RAFFLE_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAFFLE},
		{category:TriggerEventTypeCategories.GAMES, icon:"bingo", labelKey:"triggers.events.BINGO_RESULT.label", value:TriggerTypes.BINGO_RESULT, descriptionKey:"triggers.events.BINGO_RESULT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.GAMES, icon:"bingo_grid", labelKey:"triggers.events.BINGO_GRID_VIEWER_LINE.label", value:TriggerTypes.BINGO_GRID_VIEWER_LINE, descriptionKey:"triggers.events.BINGO_GRID_VIEWER_LINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID_VIEWER},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.GAMES, icon:"bingo_grid", labelKey:"triggers.events.BINGO_GRID_LINE.label", value:TriggerTypes.BINGO_GRID_LINE, descriptionKey:"triggers.events.BINGO_GRID_LINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.GAMES, icon:"bingo_grid", labelKey:"triggers.events.BINGO_GRID_ALL.label", value:TriggerTypes.BINGO_GRID_ALL, descriptionKey:"triggers.events.BINGO_GRID_ALL.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.GAMES, icon:"bingo_grid", labelKey:"triggers.events.BINGO_GRID_CELL.label", value:TriggerTypes.BINGO_GRID_CELL, descriptionKey:"triggers.events.BINGO_GRID_CELL.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.GAMES, icon:"bingo_grid", labelKey:"triggers.events.BINGO_GRID_RESET.label", value:TriggerTypes.BINGO_GRID_RESET, descriptionKey:"triggers.events.BINGO_GRID_RESET.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BINGO_GRID},

		{category:TriggerEventTypeCategories.SUBITS, icon:"sub", labelKey:"triggers.events.SUB.label", value:TriggerTypes.SUB, descriptionKey:"triggers.events.SUB.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
		{category:TriggerEventTypeCategories.SUBITS, icon:"gift", labelKey:"triggers.events.SUBGIFT.label", value:TriggerTypes.SUBGIFT, descriptionKey:"triggers.events.SUBGIFT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION},
		{category:TriggerEventTypeCategories.SUBITS, icon:"bits", labelKey:"triggers.events.CHEER.label", value:TriggerTypes.CHEER, descriptionKey:"triggers.events.CHEER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CHEER},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.SUBITS, icon:"watchStreak", labelKey:"triggers.events.POWER_UP_MESSAGE.label", value:TriggerTypes.POWER_UP_MESSAGE, descriptionKey:"triggers.events.POWER_UP_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.SUBITS, icon:"watchStreak", labelKey:"triggers.events.POWER_UP_GIANT_EMOTE.label", value:TriggerTypes.POWER_UP_GIANT_EMOTE, descriptionKey:"triggers.events.POWER_UP_GIANT_EMOTE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.SUBITS, icon:"watchStreak", labelKey:"triggers.events.POWER_UP_CELEBRATION.label", value:TriggerTypes.POWER_UP_CELEBRATION, descriptionKey:"triggers.events.POWER_UP_CELEBRATION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16_1, category:TriggerEventTypeCategories.SUBITS, icon:"bits", labelKey:"triggers.events.TWITCH_COMBO.label", value:TriggerTypes.TWITCH_COMBO, descriptionKey:"triggers.events.TWITCH_COMBO.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TWITCH_COMBO},

		// {newDate:1693519200000, category:TriggerEventTypeCategories.SUBITS, icon:"hypeChat", labelKey:"triggers.events.HYPE_CHAT.label", value:TriggerTypes.HYPE_CHAT, descriptionKey:"triggers.events.HYPE_CHAT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_CHAT},
		{disabled:true, disabledReasonLabelKey:"triggers.events.HYPE_TRAIN_APPROACHING.disabled_reason", category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_APPROACHING.label", value:TriggerTypes.HYPE_TRAIN_APPROACHING, descriptionKey:"triggers.events.HYPE_TRAIN_APPROACHING.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_START.label", value:TriggerTypes.HYPE_TRAIN_START, descriptionKey:"triggers.events.HYPE_TRAIN_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_PROGRESS.label", value:TriggerTypes.HYPE_TRAIN_PROGRESS, descriptionKey:"triggers.events.HYPE_TRAIN_PROGRESS.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_END.label", value:TriggerTypes.HYPE_TRAIN_END, descriptionKey:"triggers.events.HYPE_TRAIN_END.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_CANCELED.label", value:TriggerTypes.HYPE_TRAIN_CANCELED, descriptionKey:"triggers.events.HYPE_TRAIN_CANCELED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL},
		{category:TriggerEventTypeCategories.HYPETRAIN, icon:"train", labelKey:"triggers.events.HYPE_TRAIN_COOLDOWN.label", value:TriggerTypes.HYPE_TRAIN_COOLDOWN, descriptionKey:"triggers.events.HYPE_TRAIN_COOLDOWN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN},

		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.CUSTOM_TRAIN, icon:"train", labelKey:"triggers.events.CUSTOM_TRAIN_START.label", value:TriggerTypes.CUSTOM_TRAIN_START, descriptionKey:"triggers.events.CUSTOM_TRAIN_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_START},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.CUSTOM_TRAIN, icon:"train", labelKey:"triggers.events.CUSTOM_TRAIN_LEVEL_UP.label", value:TriggerTypes.CUSTOM_TRAIN_LEVEL_UP, descriptionKey:"triggers.events.CUSTOM_TRAIN_LEVEL_UP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_LEVEL_UP},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.CUSTOM_TRAIN, icon:"train", labelKey:"triggers.events.CUSTOM_TRAIN_COMPLETE.label", value:TriggerTypes.CUSTOM_TRAIN_COMPLETE, descriptionKey:"triggers.events.CUSTOM_TRAIN_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_SUMMARY},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.CUSTOM_TRAIN, icon:"train", labelKey:"triggers.events.CUSTOM_TRAIN_FAIL.label", value:TriggerTypes.CUSTOM_TRAIN_FAIL, descriptionKey:"triggers.events.CUSTOM_TRAIN_FAIL.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_FAIL},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.CUSTOM_TRAIN, icon:"train", labelKey:"triggers.events.CUSTOM_TRAIN_COOLDOWN.label", value:TriggerTypes.CUSTOM_TRAIN_COOLDOWN, descriptionKey:"triggers.events.CUSTOM_TRAIN_COOLDOWN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CUSTOM_TRAIN_COOLDOWN},

		{category:TriggerEventTypeCategories.MOD, icon:"info", labelKey:"triggers.events.STREAM_INFO_UPDATE.label", value:TriggerTypes.STREAM_INFO_UPDATE, descriptionKey:"triggers.events.STREAM_INFO_UPDATE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE},
		{category:TriggerEventTypeCategories.MOD, icon:"shoutout", labelKey:"triggers.events.SHOUTOUT_OUT.label", value:TriggerTypes.SHOUTOUT_OUT, descriptionKey:"triggers.events.SHOUTOUT_OUT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
		{category:TriggerEventTypeCategories.MOD, icon:"shoutout", labelKey:"triggers.events.SHOUTOUT_IN.label", value:TriggerTypes.SHOUTOUT_IN, descriptionKey:"triggers.events.SHOUTOUT_IN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT},
		{category:TriggerEventTypeCategories.MOD, icon:"shield", labelKey:"triggers.events.SHIELD_MODE_ON.label", value:TriggerTypes.SHIELD_MODE_ON, descriptionKey:"triggers.events.SHIELD_MODE_ON.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE},
		{category:TriggerEventTypeCategories.MOD, icon:"shield", labelKey:"triggers.events.SHIELD_MODE_OFF.label", value:TriggerTypes.SHIELD_MODE_OFF, descriptionKey:"triggers.events.SHIELD_MODE_OFF.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE},
		{disabled:true, disabledReasonLabelKey:"triggers.events.PIN_MESSAGE.disabled_reason", category:TriggerEventTypeCategories.MOD, icon:"pin", labelKey:"triggers.events.PIN_MESSAGE.label", value:TriggerTypes.PIN_MESSAGE, descriptionKey:"triggers.events.PIN_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.PINNED},
		{disabled:true, disabledReasonLabelKey:"triggers.events.UNPIN_MESSAGE.disabled_reason", category:TriggerEventTypeCategories.MOD, icon:"pin", labelKey:"triggers.events.UNPIN_MESSAGE.label", value:TriggerTypes.UNPIN_MESSAGE, descriptionKey:"triggers.events.UNPIN_MESSAGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.UNPINNED},
		{category:TriggerEventTypeCategories.MOD, icon:"timeout", labelKey:"triggers.events.TIMEOUT.label", value:TriggerTypes.TIMEOUT, descriptionKey:"triggers.events.TIMEOUT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BAN},
		{category:TriggerEventTypeCategories.MOD, icon:"ban", labelKey:"triggers.events.BAN.label", value:TriggerTypes.BAN, descriptionKey:"triggers.events.BAN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.BAN},
		{category:TriggerEventTypeCategories.MOD, icon:"unban", labelKey:"triggers.events.UNBAN.label", value:TriggerTypes.UNBAN, descriptionKey:"triggers.events.UNBAN.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.UNBAN},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.MOD, icon:"alert", labelKey:"triggers.events.WARN_CHATTER.label", value:TriggerTypes.WARN_CHATTER, descriptionKey:"triggers.events.WARN_CHATTER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.WARN_CHATTER},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13, category:TriggerEventTypeCategories.MOD, icon:"alert", labelKey:"triggers.events.WARN_ACKNOWLEDGE.label", value:TriggerTypes.WARN_ACKNOWLEDGE, descriptionKey:"triggers.events.WARN_ACKNOWLEDGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.WARN_ACKNOWLEDGE},
		{category:TriggerEventTypeCategories.MOD, icon:"vip", labelKey:"triggers.events.VIP.label", value:TriggerTypes.VIP, descriptionKey:"triggers.events.VIP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.VIP},
		{category:TriggerEventTypeCategories.MOD, icon:"unvip", labelKey:"triggers.events.UNVIP.label", value:TriggerTypes.UNVIP, descriptionKey:"triggers.events.UNVIP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNVIP},
		{category:TriggerEventTypeCategories.MOD, icon:"mod", labelKey:"triggers.events.MOD.label", value:TriggerTypes.MOD, descriptionKey:"triggers.events.MOD.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.MOD},
		{category:TriggerEventTypeCategories.MOD, icon:"unmod", labelKey:"triggers.events.UNMOD.label", value:TriggerTypes.UNMOD, descriptionKey:"triggers.events.UNMOD.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.UNMOD},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"clearChat", labelKey:"triggers.events.CLEAR_CHAT.label", value:TriggerTypes.CLEAR_CHAT, descriptionKey:"triggers.events.UNMOD.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"sub", labelKey:"triggers.events.SUB_ONLY_ON.label", value:TriggerTypes.SUB_ONLY_ON, descriptionKey:"triggers.events.SUB_ONLY_ON.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_ON},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"sub", labelKey:"triggers.events.SUB_ONLY_OFF.label", value:TriggerTypes.SUB_ONLY_OFF, descriptionKey:"triggers.events.SUB_ONLY_OFF.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_OFF},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"follow", labelKey:"triggers.events.FOLLOW_ONLY_ON.label", value:TriggerTypes.FOLLOW_ONLY_ON, descriptionKey:"triggers.events.FOLLOW_ONLY_ON.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_ON},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"follow", labelKey:"triggers.events.FOLLOW_ONLY_OFF.label", value:TriggerTypes.FOLLOW_ONLY_OFF, descriptionKey:"triggers.events.FOLLOW_ONLY_OFF.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_OFF},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"emote", labelKey:"triggers.events.EMOTE_ONLY_ON.label", value:TriggerTypes.EMOTE_ONLY_ON, descriptionKey:"triggers.events.EMOTE_ONLY_ON.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_ON},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"emote", labelKey:"triggers.events.EMOTE_ONLY_OFF.label", value:TriggerTypes.EMOTE_ONLY_OFF, descriptionKey:"triggers.events.EMOTE_ONLY_OFF.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_OFF},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"slow", labelKey:"triggers.events.SLOW_MODE_ON.label", value:TriggerTypes.SLOW_MODE_ON, descriptionKey:"triggers.events.SLOW_MODE_ON.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_ON},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"slow", labelKey:"triggers.events.SLOW_MODE_OFF.label", value:TriggerTypes.SLOW_MODE_OFF, descriptionKey:"triggers.events.SLOW_MODE_OFF.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_OFF},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"shield", labelKey:"triggers.events.MONITOR_ON.label", value:TriggerTypes.MONITOR_ON, descriptionKey:"triggers.events.MONITOR_ON.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"lock_fit", labelKey:"triggers.events.RESTRICT_ON.label", value:TriggerTypes.RESTRICT_ON, descriptionKey:"triggers.events.RESTRICT_ON.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.MOD, icon:"lock_fit", labelKey:"triggers.events.MONITOR_RESTRICT_OFF.label", value:TriggerTypes.MONITOR_RESTRICT_OFF, descriptionKey:"triggers.events.MONITOR_RESTRICT_OFF.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT},
		{category:TriggerEventTypeCategories.MOD, icon:"raid", labelKey:"triggers.events.RAID_STARTED.label", value:TriggerTypes.RAID_STARTED, descriptionKey:"triggers.events.RAID_STARTED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.RAID_STARTED},
		{category:TriggerEventTypeCategories.MOD, icon:"clip", labelKey:"triggers.events.CLIP_CREATED.label", value:TriggerTypes.CLIP_CREATED, descriptionKey:"triggers.events.CLIP_CREATED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE},
		{category:TriggerEventTypeCategories.MOD, icon:"announcement", labelKey:"triggers.events.ANNOUNCEMENTS.label", value:TriggerTypes.ANNOUNCEMENTS, descriptionKey:"triggers.events.ANNOUNCEMENTS.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MESSAGE},
		{category:TriggerEventTypeCategories.MOD, icon:"ad", labelKey:"triggers.events.AD_APPROACHING.label", value:TriggerTypes.AD_APPROACHING, descriptionKey:"triggers.events.AD_APPROACHING.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_APPROACHING},
		{category:TriggerEventTypeCategories.MOD, icon:"ad", labelKey:"triggers.events.AD_STARTED.label", value:TriggerTypes.AD_STARTED, descriptionKey:"triggers.events.AD_STARTED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_START},
		{category:TriggerEventTypeCategories.MOD, icon:"ad", labelKey:"triggers.events.AD_COMPLETE.label", value:TriggerTypes.AD_COMPLETE, descriptionKey:"triggers.events.AD_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.AD_BREAK_COMPLETE},
		{category:TriggerEventTypeCategories.MOD, icon:"qna", labelKey:"triggers.events.QNA_START.label", value:TriggerTypes.QNA_START, descriptionKey:"triggers.events.QNA_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.QNA_START},
		{category:TriggerEventTypeCategories.MOD, icon:"qna", labelKey:"triggers.events.QNA_STOP.label", value:TriggerTypes.QNA_STOP, descriptionKey:"triggers.events.QNA_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.QNA_STOP},
		{category:TriggerEventTypeCategories.MOD, icon:"qna", labelKey:"triggers.events.QNA_DELETE.label", value:TriggerTypes.QNA_DELETE, descriptionKey:"triggers.events.QNA_DELETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.QNA_DELETE},

		{category:TriggerEventTypeCategories.TIMER, icon:"date", labelKey:"triggers.events.SCHEDULE.label", value:TriggerTypes.SCHEDULE, descriptionKey:"triggers.events.SCHEDULE.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.NOTICE, testNoticeType:TwitchatDataTypes.TwitchatNoticeType.GENERIC},
		{category:TriggerEventTypeCategories.TIMER, icon:"timer", labelKey:"triggers.events.TIMER_START.label", value:TriggerTypes.TIMER_START, descriptionKey:"triggers.events.TIMER_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
		{category:TriggerEventTypeCategories.TIMER, icon:"timer", labelKey:"triggers.events.TIMER_STOP.label", value:TriggerTypes.TIMER_STOP, descriptionKey:"triggers.events.TIMER_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIMER},
		{category:TriggerEventTypeCategories.TIMER, icon:"countdown", labelKey:"triggers.events.COUNTDOWN_START.label", value:TriggerTypes.COUNTDOWN_START, descriptionKey:"triggers.events.COUNTDOWN_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},
		{category:TriggerEventTypeCategories.TIMER, icon:"countdown", labelKey:"triggers.events.COUNTDOWN_STOP.label", value:TriggerTypes.COUNTDOWN_STOP, descriptionKey:"triggers.events.COUNTDOWN_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTDOWN},

		{category:TriggerEventTypeCategories.OBS, icon:"list", labelKey:"triggers.events.OBS_SCENE.label", value:TriggerTypes.OBS_SCENE, descriptionKey:"triggers.events.OBS_SCENE.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SCENE_CHANGE},
		{category:TriggerEventTypeCategories.OBS, icon:"show", labelKey:"triggers.events.OBS_SOURCE_ON.label", value:TriggerTypes.OBS_SOURCE_ON, descriptionKey:"triggers.events.OBS_SOURCE_ON.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"hide", labelKey:"triggers.events.OBS_SOURCE_OFF.label", value:TriggerTypes.OBS_SOURCE_OFF, descriptionKey:"triggers.events.OBS_SOURCE_OFF.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_SOURCE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"online", labelKey:"triggers.events.OBS_START_STREAM.label", value:TriggerTypes.OBS_START_STREAM, descriptionKey:"triggers.events.OBS_START_STREAM.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_START_STREAM},
		{category:TriggerEventTypeCategories.OBS, icon:"offline", labelKey:"triggers.events.OBS_STOP_STREAM.label", value:TriggerTypes.OBS_STOP_STREAM, descriptionKey:"triggers.events.OBS_STOP_STREAM.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_STOP_STREAM},
		{category:TriggerEventTypeCategories.OBS, icon:"mute", labelKey:"triggers.events.OBS_INPUT_MUTE.label", value:TriggerTypes.OBS_INPUT_MUTE, descriptionKey:"triggers.events.OBS_INPUT_MUTE.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"unmute", labelKey:"triggers.events.OBS_INPUT_UNMUTE.label", value:TriggerTypes.OBS_INPUT_UNMUTE, descriptionKey:"triggers.events.OBS_INPUT_UNMUTE.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_INPUT_MUTE_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"play", labelKey:"triggers.events.OBS_PLAYBACK_STARTED.label", value:TriggerTypes.OBS_PLAYBACK_STARTED, descriptionKey:"triggers.events.OBS_PLAYBACK_STARTED.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		{category:TriggerEventTypeCategories.OBS, icon:"stop", labelKey:"triggers.events.OBS_PLAYBACK_ENDED.label", value:TriggerTypes.OBS_PLAYBACK_ENDED, descriptionKey:"triggers.events.OBS_PLAYBACK_ENDED.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13_7, category:TriggerEventTypeCategories.OBS, icon:"recordStart", labelKey:"triggers.events.OBS_RECORDING_START.label", value:TriggerTypes.OBS_RECORDING_START, descriptionKey:"triggers.events.OBS_RECORDING_START.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_RECORDING_START},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13_7, category:TriggerEventTypeCategories.OBS, icon:"recordStop", labelKey:"triggers.events.OBS_RECORDING_STOP.label", value:TriggerTypes.OBS_RECORDING_STOP, descriptionKey:"triggers.events.OBS_RECORDING_STOP.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_RECORDING_STOP},
		//These event require are not super relevant as they can only be triggered from OBS 28+ after clicking
		//a media source, then using the media player buttons... I don't think much people use those so I
		//chose to disable them for now.
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"pause", labelKey:"triggers.events.OBS_PLAYBACK_PAUSED.label", value:TriggerTypes.OBS_PLAYBACK_PAUSED, descriptionKey:"triggers.events.OBS_PLAYBACK_PAUSED.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"loop", labelKey:"triggers.events.OBS_PLAYBACK_RESTARTED.label", value:TriggerTypes.OBS_PLAYBACK_RESTARTED, descriptionKey:"triggers.events.OBS_PLAYBACK_RESTARTED.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"next", labelKey:"triggers.events.OBS_PLAYBACK_NEXT.label", value:TriggerTypes.OBS_PLAYBACK_NEXT, descriptionKey:"triggers.events.OBS_PLAYBACK_NEXT.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		// {beta:true, category:TriggerEventTypeCategories.OBS, icon:"prev", labelKey:"triggers.events.OBS_PLAYBACK_PREVIOUS.label", value:TriggerTypes.OBS_PLAYBACK_PREVIOUS, descriptionKey:"triggers.events.OBS_PLAYBACK_PREVIOUS.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_PLAYBACK_STATE_UPDATE},
		{category:TriggerEventTypeCategories.OBS, icon:"graphicFilters", labelKey:"triggers.events.OBS_FILTER_ON.label", value:TriggerTypes.OBS_FILTER_ON, descriptionKey:"triggers.events.OBS_FILTER_ON.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE},
		{category:TriggerEventTypeCategories.OBS, icon:"graphicFiltersOff", labelKey:"triggers.events.OBS_FILTER_OFF.label", value:TriggerTypes.OBS_FILTER_OFF, descriptionKey:"triggers.events.OBS_FILTER_OFF.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.OBS_FILTER_TOGGLE},

		{category:TriggerEventTypeCategories.MISC, icon:"voicemod", labelKey:"triggers.events.VOICEMOD.label", value:TriggerTypes.VOICEMOD, descriptionKey:"triggers.events.VOICEMOD.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.VOICEMOD},
		// {category:TriggerEventTypeCategories.MISC, icon:"voicemod", labelKey:"triggers.events.VOICEMOD_SOUND_EFFECT.label", value:TriggerTypes.VOICEMOD_SOUND_EFFECT, descriptionKey:"triggers.events.VOICEMOD_SOUND_EFFECT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.VOICEMOD},
		{category:TriggerEventTypeCategories.MISC, icon:"online", labelKey:"triggers.events.STREAM_ONLINE.label", value:TriggerTypes.STREAM_ONLINE, descriptionKey:"triggers.events.STREAM_ONLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE},
		{category:TriggerEventTypeCategories.MISC, icon:"offline", labelKey:"triggers.events.STREAM_OFFLINE.label", value:TriggerTypes.STREAM_OFFLINE, descriptionKey:"triggers.events.STREAM_OFFLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE},
		{category:TriggerEventTypeCategories.MISC, icon:"online", labelKey:"triggers.events.FOLLOWED_STREAM_ONLINE.label", value:TriggerTypes.FOLLOWED_STREAM_ONLINE, descriptionKey:"triggers.events.FOLLOWED_STREAM_ONLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE, disabledReasonLabelKey:"triggers.events.FOLLOWED_STREAM_ONLINE.disabled_reason"},
		{category:TriggerEventTypeCategories.MISC, icon:"offline", labelKey:"triggers.events.FOLLOWED_STREAM_OFFLINE.label", value:TriggerTypes.FOLLOWED_STREAM_OFFLINE, descriptionKey:"triggers.events.FOLLOWED_STREAM_OFFLINE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE, disabledReasonLabelKey:"triggers.events.FOLLOWED_STREAM_OFFLINE.disabled_reason"},
		{category:TriggerEventTypeCategories.MISC, icon:"heat", labelKey:"triggers.events.HEAT_CLICK.label", value:TriggerTypes.HEAT_CLICK, descriptionKey:"triggers.events.HEAT_CLICK.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.HEAT_CLICK},
		{category:TriggerEventTypeCategories.MISC, icon:"credits", labelKey:"triggers.events.CREDITS_COMPLETE.label", value:TriggerTypes.CREDITS_COMPLETE, descriptionKey:"triggers.events.CREDITS_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.CREDITS_COMPLETE},
		{category:TriggerEventTypeCategories.MISC, icon:"playability", labelKey:"triggers.events.PLAYABILITY_INPUT.label", value:TriggerTypes.PLAYABILITY_INPUT, descriptionKey:"triggers.events.PLAYABILITY_INPUT.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.PLAYABILITY_INPUT},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.MISC, icon:"streamsocket", labelKey:"triggers.events.STREAMSOCKET_ACTION.label", value:TriggerTypes.STREAMSOCKET_ACTION, descriptionKey:"triggers.events.STREAMSOCKET_ACTION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAMSOCKET_ACTION},
		{newDate:Config.instance.NEW_FLAGS_DATE_V16, category:TriggerEventTypeCategories.MISC, icon:"goal", labelKey:"triggers.events.GOAL_STEP_COMPLETE.label", value:TriggerTypes.GOAL_STEP_COMPLETE, descriptionKey:"triggers.events.GOAL_STEP_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOAL_STEP_COMPLETE},

		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"count", labelKey:"triggers.events.COUNTER_EDIT.label", value:TriggerTypes.COUNTER_EDIT, descriptionKey:"triggers.events.COUNTER_EDIT.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"add", labelKey:"triggers.events.COUNTER_ADD.label", value:TriggerTypes.COUNTER_ADD, descriptionKey:"triggers.events.COUNTER_ADD.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"minus", labelKey:"triggers.events.COUNTER_DEL.label", value:TriggerTypes.COUNTER_DEL, descriptionKey:"triggers.events.COUNTER_DEL.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"max", labelKey:"triggers.events.COUNTER_MAXED.label", value:TriggerTypes.COUNTER_MAXED, descriptionKey:"triggers.events.COUNTER_MAXED.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"min", labelKey:"triggers.events.COUNTER_MINED.label", value:TriggerTypes.COUNTER_MINED, descriptionKey:"triggers.events.COUNTER_MINED.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"loop", labelKey:"triggers.events.COUNTER_LOOPED.label", value:TriggerTypes.COUNTER_LOOPED, descriptionKey:"triggers.events.COUNTER_LOOPED.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.COUNTER_UPDATE},
		{category:TriggerEventTypeCategories.COUNTER_VALUE, icon:"placeholder", labelKey:"triggers.events.VALUE_UPDATE.label", value:TriggerTypes.VALUE_UPDATE, descriptionKey:"triggers.events.VALUE_UPDATE.description", isCategory:true, testMessageType:TwitchatDataTypes.TwitchatMessageType.VALUE_UPDATE},

		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.TRACK_ADDED_TO_QUEUE.label", value:TriggerTypes.TRACK_ADDED_TO_QUEUE, descriptionKey:"triggers.events.TRACK_ADDED_TO_QUEUE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.TRACK_ADD_TO_QUEUE_FAILED.label", value:TriggerTypes.TRACK_ADD_TO_QUEUE_FAILED, descriptionKey:"triggers.events.TRACK_ADD_TO_QUEUE_FAILED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_ADDED_TO_QUEUE},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.MUSIC_START.label", value:TriggerTypes.MUSIC_START, descriptionKey:"triggers.events.MUSIC_START.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_START},
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.events.MUSIC_STOP.label", value:TriggerTypes.MUSIC_STOP, descriptionKey:"triggers.events.MUSIC_STOP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.MUSIC_STOP},

		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.STREAMLABS, icon:"streamlabs", labelKey:"triggers.events.STREAMLABS_DONATION.label", value:TriggerTypes.STREAMLABS_DONATION, descriptionKey:"triggers.events.STREAMLABS_DONATION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAMLABS},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.STREAMLABS, icon:"streamlabs", labelKey:"triggers.events.STREAMLABS_MERCH.label", value:TriggerTypes.STREAMLABS_MERCH, descriptionKey:"triggers.events.STREAMLABS_MERCH.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAMLABS},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.STREAMLABS, icon:"streamlabs", labelKey:"triggers.events.STREAMLABS_PATREON_PLEDGE.label", value:TriggerTypes.STREAMLABS_PATREON_PLEDGE, descriptionKey:"triggers.events.STREAMLABS_PATREON_PLEDGE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAMLABS},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13_7, category:TriggerEventTypeCategories.STREAMLABS, icon:"streamlabs", labelKey:"triggers.events.STREAMLABS_CHARITY_TIP.label", value:TriggerTypes.STREAMLABS_CHARITY_TIP, descriptionKey:"triggers.events.STREAMLABS_CHARITY_TIP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAMLABS},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.KOFI, icon:"kofi", labelKey:"triggers.events.KOFI_DONATION.label", value:TriggerTypes.KOFI_DONATION, descriptionKey:"triggers.events.KOFI_DONATION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.KOFI},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.KOFI, icon:"kofi", labelKey:"triggers.events.KOFI_MERCH.label", value:TriggerTypes.KOFI_MERCH, descriptionKey:"triggers.events.KOFI_MERCH.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.KOFI},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.KOFI, icon:"kofi", labelKey:"triggers.events.KOFI_SUBSCRIPTION.label", value:TriggerTypes.KOFI_SUBSCRIPTION, descriptionKey:"triggers.events.KOFI_SUBSCRIPTION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.KOFI},
		{newDate:Config.instance.NEW_FLAGS_DATE_V14_2, premium:true, category:TriggerEventTypeCategories.KOFI, icon:"kofi", labelKey:"triggers.events.KOFI_COMMISSION.label", value:TriggerTypes.KOFI_COMMISSION, descriptionKey:"triggers.events.KOFI_COMMISSION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.KOFI},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.STREAMELEMENTS, icon:"streamelements", labelKey:"triggers.events.STREAMELEMENTS_DONATION.label", value:TriggerTypes.STREAMELEMENTS_DONATION, descriptionKey:"triggers.events.STREAMELEMENTS_DONATION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.STREAMELEMENTS},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.TIPEEE, icon:"tipeee", labelKey:"triggers.events.TIPEEE_DONATION.label", value:TriggerTypes.TIPEEE_DONATION, descriptionKey:"triggers.events.TIPEEE_DONATION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIPEEE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.TIPEEE, icon:"tipeee", labelKey:"triggers.events.TIPEEE_SUB.label", value:TriggerTypes.TIPEEE_SUB, descriptionKey:"triggers.events.TIPEEE_SUB.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIPEEE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V12, premium:true, category:TriggerEventTypeCategories.TIPEEE, icon:"tipeee", labelKey:"triggers.events.TIPEEE_RESUB.label", value:TriggerTypes.TIPEEE_RESUB, descriptionKey:"triggers.events.TIPEEE_RESUB.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TIPEEE},
		{newDate:Config.instance.NEW_FLAGS_DATE_V15, category:TriggerEventTypeCategories.TWITCH_CHARITY, icon:"twitch_charity", labelKey:"triggers.events.TWITCH_CHARITY_DONATION.label", value:TriggerTypes.TWITCH_CHARITY_DONATION, descriptionKey:"triggers.events.TWITCH_CHARITY_DONATION.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TWITCH_CHARITY_DONATION},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13_7, category:TriggerEventTypeCategories.TILTIFY, icon:"tiltify", labelKey:"triggers.events.TILTIFY_TIP.label", value:TriggerTypes.TILTIFY_TIP, descriptionKey:"triggers.events.TILTIFY_TIP.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.TILTIFY},
		{newDate:Config.instance.NEW_FLAGS_DATE_V13_7, category:TriggerEventTypeCategories.PATREON, icon:"patreon", labelKey:"triggers.events.PATREON_NEW_MEMBER.label", value:TriggerTypes.PATREON_NEW_MEMBER, descriptionKey:"triggers.events.PATREON_NEW_MEMBER.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.PATREON},

		{premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"goxlr_fx", labelKey:"triggers.events.GOXLR_FX_ENABLED.label", value:TriggerTypes.GOXLR_FX_ENABLED, descriptionKey:"triggers.events.GOXLR_FX_ENABLED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE, goxlrMiniCompatible:false},
		{premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"goxlr_fx", labelKey:"triggers.events.GOXLR_FX_DISABLED.label", value:TriggerTypes.GOXLR_FX_DISABLED, descriptionKey:"triggers.events.GOXLR_FX_DISABLED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_FX_STATE, goxlrMiniCompatible:false},
		{premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"press", labelKey:"triggers.events.GOXLR_BUTTON_PRESSED.label", value:TriggerTypes.GOXLR_BUTTON_PRESSED, descriptionKey:"triggers.events.GOXLR_BUTTON_PRESSED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_BUTTON, goxlrMiniCompatible:true},
		{premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"release", labelKey:"triggers.events.GOXLR_BUTTON_RELEASED.label", value:TriggerTypes.GOXLR_BUTTON_RELEASED, descriptionKey:"triggers.events.GOXLR_BUTTON_RELEASED.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_BUTTON, goxlrMiniCompatible:true},
		{premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"play", labelKey:"triggers.events.GOXLR_SAMPLE_COMPLETE.label", value:TriggerTypes.GOXLR_SAMPLE_COMPLETE, descriptionKey:"triggers.events.GOXLR_SAMPLE_COMPLETE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_SAMPLE_COMPLETE, goxlrMiniCompatible:false},
		{premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"mute", labelKey:"triggers.events.GOXLR_INPUT_MUTE.label", value:TriggerTypes.GOXLR_INPUT_MUTE, descriptionKey:"triggers.events.GOXLR_INPUT_MUTE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_SOUND_INPUT, goxlrMiniCompatible:true},
		{premium:true, category:TriggerEventTypeCategories.GOXLR, icon:"unmute", labelKey:"triggers.events.GOXLR_INPUT_UNMUTE.label", value:TriggerTypes.GOXLR_INPUT_UNMUTE, descriptionKey:"triggers.events.GOXLR_INPUT_MUTE.description", testMessageType:TwitchatDataTypes.TwitchatMessageType.GOXLR_SOUND_INPUT, goxlrMiniCompatible:true},
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
	ADD_TRACK_TO_PLAYLIST:"7",
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
		{category:TriggerEventTypeCategories.MUSIC, icon:"music", labelKey:"triggers.musicEvents.ADD_TRACK_TO_PLAYLIST", value:TriggerMusicTypes.ADD_TRACK_TO_PLAYLIST},
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
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", labelKey:"triggers.scheduleEvents.NO_ACTION", value:TriggerScheduleTypes.NO_ACTION, disabled:true},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", labelKey:"triggers.scheduleEvents.REGULAR_REPEAT", value:TriggerScheduleTypes.REGULAR_REPEAT},
		{category:TriggerEventTypeCategories.TWITCHAT, icon:"date", labelKey:"triggers.scheduleEvents.SPECIFIC_DATES", value:TriggerScheduleTypes.SPECIFIC_DATES},
	];
	return scheduleCache;
}



/**
 * Get a trigger's sub type's label (reward name, counter name, ...)
 */
export const TriggerSubTypeLabel = (triggerData:TriggerData):string|undefined => {
	switch(triggerData.type) {
		case TriggerTypes.SLASH_COMMAND:
		case TriggerTypes.CHAT_COMMAND:
			return triggerData.chatCommand || "...";

		case TriggerTypes.REWARD_REDEEM:
			return StoreProxy.rewards.rewardList.find(v=>v.id == triggerData.rewardId)?.title ?? "REWARD NOT FOUND";

		case TriggerTypes.OBS_SCENE:
			return triggerData.obsScene || "...";

		case TriggerTypes.OBS_SOURCE_ON:
		case TriggerTypes.OBS_SOURCE_OFF:
			return triggerData.obsSource || "...";

		case TriggerTypes.OBS_PLAYBACK_STARTED:
		case TriggerTypes.OBS_PLAYBACK_ENDED:
		case TriggerTypes.OBS_PLAYBACK_PAUSED:
		case TriggerTypes.OBS_PLAYBACK_RESTARTED:
		case TriggerTypes.OBS_PLAYBACK_NEXT:
		case TriggerTypes.OBS_PLAYBACK_PREVIOUS:
		case TriggerTypes.OBS_INPUT_MUTE:
		case TriggerTypes.OBS_INPUT_UNMUTE:
			return triggerData.obsInput || "...";

		case TriggerTypes.OBS_FILTER_ON:
		case TriggerTypes.OBS_FILTER_OFF:
			return triggerData.obsFilter + " ("+triggerData.obsSource+")" || "...";

		case TriggerTypes.COUNTER_EDIT:
		case TriggerTypes.COUNTER_ADD:
		case TriggerTypes.COUNTER_DEL:
		case TriggerTypes.COUNTER_LOOPED:
		case TriggerTypes.COUNTER_MAXED:
		case TriggerTypes.COUNTER_MINED:
			return StoreProxy.counters.counterList.find(v=>v.id == triggerData.counterId)?.name ?? "COUNTER NOT FOUND";

		case TriggerTypes.VALUE_UPDATE:
			return StoreProxy.values.valueList.find(v=>v.id == triggerData.valueId)?.name ?? "VALUE NOT FOUND";
	}
	return "...";
}
