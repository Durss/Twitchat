import type { OBSItemPath } from "@/utils/OBSWebsocket";
import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import type { JsonObject } from 'type-fest';
import type { GoXLRTypes } from "./GoXLRTypes";

export namespace TwitchatDataTypes {

	export type ChatPlatform = "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook";
	
	export type ModalTypes = "" | "search" | "gngngn" | "poll" | "chatsuggForm" | "chatsuggState" | "raffle" | "pred" | "bingo" | "liveStreams" | "streamInfo" | "TTuserList" | "pins" | "timer" | "updates" | "triggersLogs" | "login" | "tracked" | "whispers" | "twitchatAnnouncement" | "streamSummary" | "obsHeatLogs" | "extensions" | "qnaForm" | "qna" | "credits" | "heatLogs";
	
	export type NotificationTypes = "" | "raffle" | "bingo" | "poll" | "prediction" | "save" | "highlight" | "shoutout";
	
	export type OverlayTypes = "timer" | "wheel" | "credits" | "chathighlight" | "music" | "counter" | "ulule" | "heatdebug" | "distort" | "unified" | "tts" | "adbreak" | "bitswall";

	export const ParamDeepSections = {
		AD: "ad",
		OBS: "obs",
		TTS: "tts",
		HEAT: "heat",
		SPOTIFY: "spotify",
		PATREON: "patreon",
		PREMIUM: "premium",
		YOUTUBE: "youtube",
		HIGHLIGHT: "chathighlight",
		WEBSOCKET: "websocket",
		HEAT_AREAS: "heatAreas",
	} as const;
	export type ParamDeepSectionsStringType = typeof ParamDeepSections[keyof typeof ParamDeepSections] | OverlayTypes;
	
	/**
	 * Parameters menue categories
	 */
	export const ParameterPages = {
		CLOSE: "",
		MAIN_MENU: "main",
		APPEARANCE: "appearance",
		ACCOUNT: "account",
		ABOUT: "about",
		FEATURES: "features",
		OBS: "obs",
		HEAT: "heat",
		SPONSOR: "sponsor",
		DONATE: "donate",
		STREAMDECK: "streamdeck",
		GOXLR: "goxlr",
		TRIGGERS: "triggers",
		COUNTERS: "counters",
		VALUES: "values",
		OVERLAYS: "overlays",
		EMERGENCY: "emergency",
		SPOILER: "spoiler",
		ALERT: "alert",
		TTS: "tts",
		VOICE: "voice",
		AUTOMOD: "automod",
		VOICEMOD: "voicemod",
		AD: "ad",
		CONNEXIONS: "connexions",
		PREMIUM: "premium",
		YOUTUBE: "youtube",
		DISCORD: "discord",
	} as const;
	export type ParameterPagesStringType = typeof ParameterPages[keyof typeof ParameterPages];

	/**
	 * Contains info about a counter
	 */
	export interface CounterData {
		id:string;
		/**
		 * Counter name
		 */
		name:string;
		/**
		 * Counter placeholder for use in triggers
		 * If value is "XXX", the placeholder {COUNTER_VALUE_XXX} will be usable
		 * in all triggers
		 */
		placeholderKey:string;
		/**
		 * Current counter's value (if not "per user")
		 */
		value:number;
		/**
		 * Min value of the counter
		 */
		min:number|false;
		/**
		 * Max value of the counter
		 */
		max:number|false;
		/**
		 * Should the value loop to the opposite limit when reaching the min or max value
		 */
		loop:boolean;
		/**
		 * Is the counter is global (false) or per user (true)
		 */
		perUser:boolean;
		/**
		 * Users counters values
		 */
		users?:{[key:string]:number};
		/**
		 * Only available for counters overlay related to a "per user" counter
		 * Contains user info necessary for display on screen.
		 * Only contains 10 first users
		 */
		leaderboard?:{
			login:string,
			avatar:string,
			points:number
		}[];
		/**
		 * Is the counter disabled ?
		 * It can be disabled if the user has to disable counters they're not
		 * premium and have more than the maximum counters allowed 
		 */
		enabled?:boolean
	}

	export interface ValueData {
		id:string;
		/**
		 * Value's name
		 */
		name:string;
		/**
		 * Placeholder string
		 */
		placeholderKey:string;
		/**
		 * Actual value
		 */
		value:string;
		/**
		 * Is the value is global (false) or per user (true)
		 */
		perUser:boolean;
		/**
		 * Users values
		 */
		users?:{[key:string]:string};
		/**
		 * Is the counter disabled ?
		 * It can be disabled if the user has to disable counters they're not
		 * premium and have more than the maximum counters allowed 
		 */
		enabled?:boolean
	}

	/**
	 * Contains config about a chat column
	 */
	export interface ChatColumnsConfig {
		id:string;
		/**
		 * Position of the col
		 */
		order:number;
		/**
		 * Size of the col in percent of the available screen space
		 */
		size:number;
		/**
		 * Number of message to show on the "live messages" section when chat paused
		 */
		liveLockCount:number;
		/**
		 * true if the "greet them", polls, predictions, bingos,.. and forms should show up on this col
		 */
		showPanelsHere:boolean;
		/**
		 * Filter params of the col
		 */
		filters:{[key in typeof MessageListFilterTypes[number]]:boolean};
		/**
		 * Filter params of the "messages" sub section
		 */
		messageFilters:ChatColumnsConfigMessageFilters;
		/**
		 * Specific commands that should be hidden
		 */
		commandsBlockList:string[];
		/**
		 * Specific users that should be hidden
		 */
		userBlockList:string[];
		/**
		 * Custom permissions for the whispers
		 * This allows to accept whispers only from mods or specific users
		 */
		whispersPermissions:PermissionsData;
	}
	
	/**
	 * Contains chat message sub filters
	 */
	export interface ChatColumnsConfigMessageFilters {
		automod:boolean;
		suspiciousUsers:boolean;
		deleted:boolean;
		bots:boolean;
		commands:boolean;
		viewers:boolean;
		moderators:boolean;
		vips:boolean;
		subs:boolean;
		partners:boolean;
		short:boolean;
		tracked:boolean;
		pinned:boolean;
	}

	/**
	 * Bot messages types
	 */
	export interface IBotMessage {
		bingo:BotMessageEntry;
		bingoStart:BotMessageEntry;
		raffle:BotMessageEntry;
		raffleJoin:BotMessageEntry;
		raffleStart:BotMessageEntry;
		shoutout:BotMessageEntry;
		twitchatAd:BotMessageEntry;
		chatSuggStart:BotMessageEntry;
		heatSpotify:BotMessageEntry;
		heatUlule:BotMessageEntry;
		qnaStart:BotMessageEntry;
	}
	export interface BotMessageEntry {
		enabled:boolean;
		message:string;
		cooldown?:number;
		/**
		 * Used for Heat interactions.
		 * Specifies weither anonymous users are allowed to interact with it or not
		 */
		allowAnon?:boolean;
	}
	export type BotMessageField = keyof IBotMessage;
	
	/**
	 * Details about a message chunk.
	 * Chat messages are converted to arrays of chunks. Each chunks
	 * can have several types.
	 * The message can the be built back with the <ChatMessageChunksParser> component
	 * @see ChatMessageChunksParser
	 */
	export interface ParseMessageChunk {
		type: "text" | "emote" | "cheermote" | "url" | "highlight" | "user";
		value: string;
		emote?: string;
		emoteHD?: string;
		href?: string;
		username?: string;
	}

	/**
	 * Chat room settings
	 */
	export interface IRoomSettings {
		subOnly?:boolean;
		emotesOnly?:boolean;
		followOnly?:number|false;
		chatDelay?:number;
		slowMode?:number;
	}
	export type RoomSettings = keyof IRoomSettings;

	/**
	 * Generic parameter categories types
	 */
	export interface IParameterCategory {
		appearance:{[key:string]:ParameterData<string|number|boolean>};
		features:{[key:string]:ParameterData<string|number|boolean>};
	}
	export type ParameterCategory = keyof IParameterCategory;

	/**
	 * Account params types
	 */
	export interface IAccountParamsCategory {
		/**
		 * true if parameters should be saved server side
		 */
		syncDataWithServer:ParameterData<boolean>;
		/**
		 * true if user choose to make their donation public
		 */
		publicDonation:ParameterData<boolean>;
	}
	export type AccountParamsCategory = keyof IAccountParamsCategory;

	/**
	 * OBS chat command scene control
	 */
	export interface OBSSceneCommand {
		/**
		 * OBS scene info
		 */
		scene:{
			sceneIndex:number;
			sceneName:string;
		}
		/**
		 * Command to use to switch to that OBS scene
		 */
		command:string;
	}

	/**
	 * OBS chat command mute control
	 */
	export interface OBSMuteUnmuteCommands {
		/**
		 * OBS audio source name
		 */
		audioSourceName:string;
		/**
		 * Command to use to mute the source
		 */
		muteCommand:string;
		/**
		 * Command to use to unmute the source
		 */
		unmuteCommand:string;
	}

	export interface GoXLRParams {
		/**
		 * GoXLR socket enabled ?
		 */
		enabled:boolean,
		/**
		 * Socket IP
		 */
		ip:string,
		/**
		 * Socket port
		 */
		port:number,
		/**
		 * Contains an effect preset ID and an effect encoder ID for
		 * every chat columns.
		 * If requesting to scroll first chat column via "Gender"
		 * encoder of the preset N°6 the first entry of this array
		 * will contain this: ["EffectSelect6", "gender"]
		 */
		chatScrollSources:GoXLRTypes.ButtonTypesData[][],
		/**
		 * Contains an effect preset ID and an effect encoder ID for
		 * every chat columns.
		 * If requesting to move the marker of first chat column via
		 * "Gender" encoder of the preset N°6 the first entry of this
		 * array will contain this: ["EffectSelect6", "gender"]
		 */
		chatReadMarkSources:GoXLRTypes.ButtonTypesData[][],
	}



	/**
	 * Data type for message badges.
	 * These are info displayed on the left of some messages
	 * to indicate things like "whisper" or "automod" info
	 */
	export const MessageBadgeDataType = {
		RAIDER: "raider",
		PINNED: "pinned",
		AUTOMOD: "automod",
		WHISPER: "whisper",
		CYPHERED: "cyphered",
		NEW_USER: "new_user",
		HYPE_CHAT: "hypeChat",
		NEW_ACCOUNT: "new_account",
		PRESENTATION: "presentation",
		FIRST_MESSAGE_TODAY: "firstToday",
		SUSPICIOUS_USER: "suspiciousUser",
		RESTRICTED_USER: "restrictedUser",
		EMERGENCY_BLOCKED: "emergencyBlocked",
		RETURNING_CHATTER: "returningChatter",
		FIRST_TIME_CHATTER: "firstTimeChatter",
	} as const;
	export type MessageBadgeDataStringType = typeof MessageBadgeDataType[keyof typeof MessageBadgeDataType];
	export interface MessageBadgeData {
		type:MessageBadgeDataStringType;
		label?:string;
		tooltip?:string;
		tooltipLabelParams?:{[key:string]:string};
	}

	/**
	 * Data that populates ParamItem components
	 */
	export interface ParameterData<T, U = unknown, V = unknown, W = any> {
		id?:number;
		/**
		 * Parameter type
		 */
		type:"boolean"|"number"|"string"|"slider"|"password"|"list"|"browse"|"editablelist"|"color"|"date"|"datetime"|"time"|"imagelist"|"duration";
		/**
		 * Parameter value
		 */
		value:T;
		/**
		 * List values for the "list" type
		 */
		listValues?:TwitchatDataTypes.ParameterDataListValue<U>[];
		/**
		 * Contains the raw selected list item
		 */
		selectedListValue?:ParameterDataListValue<U>;
		/**
		 * List values for the "editablelist" type
		 */
		options?:string[];
		/**
		 * Can select multiple entries for "list" type ?
		 */
		multiple?:boolean;
		/**
		 * Disable input to only keep title (used for shoutout param)
		 */
		noInput?:boolean;
		/**
		 * Param's label
		 */
		label?:string;
		/**
		 * Label (i18n key) so the text can update if changing current language.
		 * If "label" is also defined, this value will be concatenated to it.
		 */
		labelKey?:string;
		/**
		 * Min value for "number" type
		 */
		min?:number;
		/**
		 * Max value for "number" type
		 */
		max?:number;
		/**
		 * Step value for "number" type
		 */
		step?:number;
		/**
		 * Maximum text length for "string" type or max items for "list" type
		 * with "multiple" enabled
		 */
		maxLength?:number;
		/**
		 * Wether it's a long text or not from "string" type
		 * if true a textarea will be displayed instead of an input
		 */
		longText?:boolean;
		/**
		 * Icon name to display on le left (see files on "src_front/assets/icons")
		 */
		icon?:string;
		/**
		 * Forces a theme for the icon
		 */
		iconTheme?:"light"|"dark"|"primary"|"secondary"|"alert";
		/**
		 * Icon URL to display on the left
		 */
		iconURL?:string;
		/**
		 * Input's placeholder
		 */
		placeholder?:string;
		/**
		 * Input's placeholder (i18n key) so it can update if changing current language.
		 */
		placeholderKey?:string;
		/**
		 * Dynamic clickable placeholders.
		 * This creates a list of clickable items that will push a value on the input
		 * Only works for "string" type
		 */
		placeholderList?:PlaceholderEntry[];
		/**
		 * Parent parameter ID.
		 * Only used for global parameters. @see ParamsList
		 */
		parent?:number;
		/**
		 * Image Url. If set it displays an icon with a tooltip containing the specified image
		 */
		example?:string;
		/**
		 * Just a field to allow storage of random data if necessary
		 */
		storage?:W;
		/**
		 * Children parameters
		 */
		children?:ParameterData<V>[];
		/**
		 * File types for browse inputs
		 */
		accept?:string;
		/**
		 * Input's "name" attribute
		 */
		fieldName?:string;
		/**
		 * Save configuration to storage on change?
		 */
		save?:boolean;
		/**
		 * Twitch scopes necessary for this feature. Will disable the component if scope isn't granted
		 */
		twitch_scopes?:TwitchScopesString[];
		/**
		 * Regex defining which chars are allowed on the field
		 */
		allowedCharsRegex?:string;
		/**
		 * Tooltip displayed on hover
		 */
		tooltip?:string;
		/**
		 * Tooltip displayed on hover (i18n key)
		 */
		tooltipKey?:string;
		/**
		 * Disable possibility to change the value
		 */
		disabled?:boolean;
		/**
		 * Defines if user must be premium to set this parameter
		 */
		premiumOnly?:boolean;
		/**
		 * Show an error state
		 */
		error?:boolean;
		/**
		 * Optional error message to be displayed
		 */
		errorMessage?:string;
		/**
		 * Callback called when value is changed (if v-model can't be used)
		 */
		editCallback?:(data:ParameterData<T, U, V, W>) => void;
	}
	export interface ParameterDataListValue<T> {
		/**
		 * Raw text label
		 */
		label?:string;
		/**
		 * i18n key of the labal
		 */
		labelKey?:string;
		/**
		 * Value of the entry
		 */
		value:T;
		/**
		 * Is entry disabled?
		*/
		disabled?:boolean;
		/**
		 * Icon name of the entry
		 */
		icon?:string;
		/**
		 * Flag ISO code. Only used by the ParamItem with "list" type and "multiple" flag on
		 */
		flag?:string;
		// [parameter: string]: unknown;
	}

	/**
	 * Contains info about a wheel overlay data
	 */
	export interface WheelData {
		items:EntryItem[];
		winner:string;
	}

	/**
	 * Generic item entry
	 */
	export interface EntryItem {
		id:string;
		label:string;
	}

	/**
	 * Config for a poll game (used by triggers)
	 */
	export interface PollConfig {
		pointsPerVote:number;
		voteDuration:number;
		title:string;
		answers:string[];
	}

	/**
	 * Config for a prediction game (used by triggers)
	 */
	export interface PredictionConfig {
		voteDuration:number;
		title:string;
		answers:string[];
	}

	/**
	 * Config for a bingo game
	 */
	export interface BingoConfig {
		guessNumber:boolean;
		guessEmote:boolean;
		guessCustom:boolean;
		min:number;
		max:number;
		numberValue?:number;
		customValue?:string;
		customValueTolerance?: number;
		emoteValue?:{[key in ChatPlatform]:{
			code:string,
			image:TwitchatImage,
		}|undefined};
		winners?:TwitchatDataTypes.TwitchatUser[];
	}

	/**
	 * Config for a raffle game
	 */
	export interface RaffleData {
		mode:"chat"|"sub"|"manual"|"values";
		command?:string;
		reward_id?:string;
		value_id?:string;
		value_splitter?:string;
		duration_s:number;
		maxEntries:number;
		multipleJoin:boolean;
		created_at:number;
		entries:RaffleEntry[];
		vipRatio:number;
		followRatio:number;
		subRatio:number;
		subT2Ratio:number;
		subT3Ratio:number;
		subgiftRatio:number;
		subMode_includeGifters:boolean;
		subMode_excludeGifted:boolean;
		showCountdownOverlay:boolean;
		customEntries:string;
		winners?:RaffleEntry[];
		/**
		 * Only used by raffle form to show winner within the form
		 * when raffle completes
		 */
		resultCallback?:()=>void;
		/**
		 * @deprecated use duration_s instead. Only hear for typing on data migration
		 */
		duration?:number;
	}
	export interface RaffleEntry extends EntryItem {
		score:number;
		joinCount:number;
		user?:{
			id:string;
			channel_id:string;
			platform:ChatPlatform;
		}
	}
	
	/**
	 * Config for a "chat suggestion" session
	 */
	export interface ChatSuggestionData {
		command:string;
		startTime:number;
		maxLength:number;
		duration:number;
		allowMultipleAnswers:boolean;
		choices:ChatSuggestionDataChoice[];
		winners:ChatSuggestionDataChoice[];
	}
	export interface ChatSuggestionDataChoice {
		id:string;
		user:TwitchatDataTypes.TwitchatUser;
		label:string;
	}

	/**
	 * Contains current hype train info
	 */
	export interface HypeTrainStateData {
		channel_id:string;
		level:number;
		currentValue:number;
		goal:number;
		approached_at:number;
		started_at:number;
		updated_at:number;
		timeLeft_s:number;
		state:"APPROACHING" | "START" | "PROGRESSING" | "LEVEL_UP" | "COMPLETED" | "EXPIRE";
		is_boost_train:boolean;
		is_new_record:boolean;
		conductor_subs?:HypeTrainConductorData;
		conductor_bits?:HypeTrainConductorData;
	}

	/**
	 * Stores the data about one of the hype train's conductors
	 */
	export interface HypeTrainConductorData {
		type:"SUBS" | "BITS";
		user:TwitchatUser;
		contributions:HypeTrainConductorContributionsData[];
	}

	/**
	 * Stores contributions of a hype train conductor
	 */
	export interface HypeTrainConductorContributionsData {
		bits?:number;
		sub_t1?:number;
		sub_t2?:number;
		sub_t3?:number;
		subgift_t1?:number;
		subgift_t2?:number;
		subgift_t3?:number;
	}

	/**
	 * Contains info about a command for the autocomplete
	 * form when write "/xxx" on the chat input
	 */
	export interface CommandData {
		id:string;
		cmd:string;
		alias:string;
		details?:string;
		detailsKey?:string;
		needChannelPoints?:boolean;
		needTTS?:boolean;
		needAdmin?:boolean;
		needModerator?:boolean,
		needDiscordChan?:boolean;
		twitchCmd?:boolean,
		twitch_scopes?:TwitchScopesString[],
	}

	/**
	 * Generic permission data
	 */
	export interface PermissionsData {
		broadcaster:boolean;
		follower:boolean;
		follower_duration_ms:number;
		mods:boolean;
		vips:boolean;
		subs:boolean;
		all:boolean;
		usersAllowed:string[];
		usersRefused:string[];
		
		/**
		 * @deprecated Only here for typings on data migration. Removed in favor of the new "usersAllowed" prop
		 */
		users?:string;
	}

	/**
	 * Represents a placeholder for forms.
	 * Placeholders are clickable tags that are inserted inside
	 * a text field.
	 */
	export interface PlaceholderEntry {
		tag:string;
		descKey:string;
		descReplacedValues?:{[key:string]:string};
		example?:string;
		globalTag?:boolean;
		category?:"stream"|"counter"|"value"|"timer"|"music"|"goxlr"|"twitch";
		/**
		 * Is placeholder private
		 * Used for a deprecated placeholder that i don't want to simply break
		 * but i don't want users to keep using
		 */
		private?:boolean;
	}

	/**
	 * Contains info about a stream (either current stream or presets)
	 */
	export interface StreamInfoPreset {
		id: string;
		name: string;
		title: string;
		categoryID?: string;
		tags?: string[];
		branded?:boolean;
		labels?:{id:string, enabled:boolean}[];
		/**
		 * @deprecated Only here for typings on data migration. Removed in favor of the new "tags" prop
		 */
		tagIDs?: string[];
	}

	/**
	 * Contains info about a stream
	 */
	export interface StreamInfo {
		user:TwitchatUser;
		title:string;
		category:string;
		tags:string[];
		started_at:number;
		live:boolean;
		viewers:number;
		lastSoDoneDate:number;
	}

	/**
	 * Contains data about current and incoming commercial
	 */
	export interface CommercialData {
		/**
		 * Date in milliseconds the previous mid-roll started
		 */
		prevAdStart_at:number;
		/**
		 * Date in milliseconds the next mid-roll will start
		 */
		nextAdStart_at:number;
		/**
		 * Duration in milliseconds of the current md-roll
		 */
		currentAdDuration_ms:number;
		/**
		 * Number of snooze remaining
		 */
		remainingSnooze:number;
		/**
		 * Date in milliseconds a snooze will be unlocked
		 */
		nextSnooze_at:number;
	}

	/**
	 * Contains info about a countdown
	 */
	export interface CountdownData {
		startAt:string;
		startAt_ms:number;
		endAt?:string;
		endAt_ms?:number;
		paused?:boolean;
		aborted?:boolean;
		pausedAt?:number;
		pausedDuration:number;
		duration:string;
		duration_ms:number;
		finalDuration?:string;
		finalDuration_ms?:number;
		timeoutRef:number;
	}

	/**
	 * Contains info about a timer
	 */
	export interface TimerData {
		startAt:string;
		startAt_ms:number;
		offset_ms:number;
		paused?:boolean;
		pausedAt?:number;
		endAt?:string;
		endAt_ms?:number;
		duration?:string;
		duration_ms?:number;
	}

	/**
	 * Generic screen position
	 * tl = top left
	 * t = top
	 * tr = top right
	 * ...
	 */
	export type ScreenPosition = "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";

	/**
	 * Contains info about an highlighted chat message.
	 * Used by the "chat highlight" overlay
	 */
	export interface ChatHighlightInfo {
		message?:string,
		user?:TwitchatUser,
		clip?:ClipInfo,
		params?:ChatHighlightParams,
	}
	export interface ChatHighlightParams {
		position:ScreenPosition;
	}
	export interface ClipInfo {
		duration:number;
		url:string;
		mp4:string;
	}

	/**
	 * Different "ad" types
	 * Ads are messages displayed on startup or when using
	 * command /tip or  /updates
	 */
	export const TwitchatAdTypes = {
		NONE:-1,
		DONATE:1,
		TIP_AND_TRICK:2,
		DISCORD:3,
		TWITCHAT_AD_WARNING:4,
		TWITCHAT_SPONSOR_PUBLIC_PROMPT:5,
		DONATE_REMINDER:6,
		UPDATE_REMINDER:7,
		AD_BREAK_SCOPE_REQUEST:8,
	} as const;
	export type TwitchatAdStringTypes = typeof TwitchatAdTypes[keyof typeof TwitchatAdTypes]|null;

	/**
	 * Stores the install callback sent by the browser
	 * This callback is used to "install" Twitchat on the device
	 * (mostly made for mobile but also work on desktop)
	 */
	export interface InstallHandler extends Event {
		prompt:()=>void;
		userChoice:Promise<{outcome:"accepted"}>;
	}

	/**
	 * Represents text to speech configs
	 */
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
		read1stMessageToday: boolean;
		read1stMessageTodayPattern:string;
		read1stTimeChatters: boolean;
		read1stTimeChattersPattern:string;
		readMonitored: boolean;
		readMonitoredPattern:string;
		readRestricted: boolean;
		readRestrictedPattern:string;
		readAutomod: boolean;
		readAutomodPattern:string;
		readTimeouts: boolean;
		readTimeoutsPattern:string;
		readBans: boolean;
		readBansPattern:string;
		readUnbans: boolean;
		readUnbansPattern:string;
		ttsPerms:PermissionsData;
		/**
		 * @deprecated was a kind of duplicate of what "ttsPerms" allows
		 */
		readUsers?:string[];
	}

	/**
	 * Represents emergency mode params
	 */
	export interface EmergencyParamsData {
		enabled:boolean;
		chatCmd:string;
		chatCmdPerms:PermissionsData;
		emotesOnly:boolean;
		subOnly:boolean;
		slowMode:boolean;
		followOnly:boolean;
		noTriggers:boolean;
		autoEnableOnFollowbot:boolean;
		followOnlyDuration:number;
		slowModeDuration:number;
		toUsers:string[];
		obsScene:string;
		obsSources:string[];
		autoEnableOnShieldmode:boolean;
		enableShieldMode:boolean;
		/**
		 * @deprecated Only here for typings on data migration. Removed in favor of manual blocking after disabling emergency mode
		 */
		autoBlockFollows?:boolean;
		/**
		 * @deprecated Only here for typings on data migration. Removed in favor of manual blocking after disabling emergency mode
		 */
		autoUnblockFollows?:boolean;
	}

	/**
	 * Represents spoiler params
	 */
	export interface SpoilerParamsData {
		permissions:PermissionsData;
		autoSpoilNewUsers:boolean;
	}
	
	/**
	 * Represents chat alert params
	 */
	export interface AlertParamsData {
		chatCmd:string;
		permissions:PermissionsData;
		blink:boolean;
		shake:boolean;
		sound:boolean;
		vibrate:boolean;
		message:boolean;
	}

	/**
	 * Represents an anchor for the homepage
	 */
	export interface AnchorData {
		label:string;
		icon:string;
		div:HTMLElement;
		selected:boolean;
	}

	/**
	 * Represents music player params for overlay
	 */
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

	/**
	 * Represents info about a music track
	 */
	export interface MusicTrackData {
		title:string;
		artist:string;
		album:string;
		cover:string;
		duration:number;
		url:string;
	}
	export type MusicTrackDataKeys = keyof MusicTrackData;

	/**
	 * Represents voicemod params
	 */
	export interface VoicemodParamsData {
		enabled:boolean;
		voiceIndicator:boolean;
		commandToVoiceID:{[key:string]:string};
		chatCmdPerms:PermissionsData;
	}

	/**
	 * Represents twitchat's automod params
	 */
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
		emergency:boolean;
		firstTimeChatters:boolean;
	}

	/**
	 * Represent a pronoun's info
	 */
	export interface Pronoun {
		id: string;
		login: string;
		pronoun_id: string
	}

	/**
	 * Represents info about a confirm window
	 */
	export interface ConfirmData {
		title:string,
		description?:string,
		confirmCallback?:()=>void,
		cancelCallback?:()=>void,
		yesLabel?:string,
		noLabel?:string,
		STTOrigin?:boolean,
	}

	/**
	 * Represents generic data for a multi-res image
	 */
	export interface TwitchatImage {
		sd:string;
		hd?:string;
	}

	/**
	 * Represents an emote's position on a text
	 */
	export interface EmoteDef {
		begin: number;
		end: number;
		id: string;
		sd?: string;
		hd?: string;
	}

	/**
	 * Represents a user
	 */
	export interface TwitchatUser {
		id:string;
		platform:ChatPlatform;
		login:string;
		/**
		 * Get the display name of the user.
		 * Returns eith the actual twitch display name, or the custom one defined
		 * on twitchat.
		 */
		displayName:string;
		/**
		 * Original twitch display name of the user
		 */
		displayNameOriginal:string;
		/**
		 * URL of the avatar
		 */
		avatarPath?:string;
		/**
		 * Account createion date
		 */
		created_at_ms?:number;
		/**
		 * Nickname chat color
		 */
		color?:string;
		/**
		 * Is a twitch partner?
		 */
		is_partner:boolean;
		/**
		 * Is a twitch affiliate?
		 */
		is_affiliate:boolean;
		/**
		 * Should this user's messages be highlighted?
		 */
		is_tracked:boolean;
		/**
		 * Is this a known bot account?
		 */
		is_bot:boolean;
		/**
		 * Is the user blocked by me?
		 */
		is_blocked:boolean;
		/**
		 * When a user is blocked, their messages are censored until we click
		 * on of them in which case messages stop being censored until next 
		 * app start.
		 * This flag is here for this, stopping censor to ignore "is_blocked" state
		 */
		stop_block_censor?:boolean;
		/**
		 * Is a Twitchat admin?
		 */
		is_admin?:boolean;
		/**
		 * Twitchat donor state of the user
		 */
		donor?:{
			/**
			 * Is a donor?
			 */
			state:boolean,
			/**
			 * Donor level
			 */
			level:number,
			/**
			 * true if user is exempt from ads (ex: if too few followers)
			 */
			noAd:boolean,
			/**
			 * true if donor level changed from last time
			 */
			upgrade:boolean,
			/**
			 * true if user is part of the early twitchat donors
			 */
			earlyDonor:boolean,
			/**
			 * true if user donated enough to unlock lifetime premium
			 */
			isPremiumDonor:boolean,
		};
		/**
		 * undefined=no loaded yet; false=no pronouns found; string=pronouns code
		 */
		pronouns:string|false|null;
		/**
		 * Pronouns label
		 */
		pronounsLabel:string|false;
		/**
		 * Pronouns tooltip
		 */
		pronounsTooltip:string|false;
		/**
		 * Contains one entry per connected channel with
		 * channel specific info.
		 */
		channelInfo:{[key:string]:UserChannelInfo},
		/**
		 * true when the details are loading
		 */
		temporary?:boolean;
		/**
		 * true if user data loading failed
		 */
		errored?:boolean;
		/**
		 * true if data respresents an anonymous user.
		 * For exemple an anonymous Heat user
		 */
		anonymous?:boolean;
		/**
		 * If set to true, this user's messages won't be automatically set
		 * as spoiler if the related option is enabled on the spoiler section
		 */
		noAutospoil?:boolean;
		/**
		 * Has user linked their discord to twitchat?
		 */
		discordLinked?:boolean;
	}

	/**
	 * Represents a channel specific user data
	 */
	export interface UserChannelInfo {
		/**
		 * true if user is connected on the channel's chat
		 */
		online:boolean;
		/**
		 * true if user talked for the first time ever on our chat during this session
		 */
		is_new:boolean;
		/**
		 * true if user raided us
		 * Stays to "true" for the specified amount of duration on the parameters
		 * then switched back to false
		 */
		is_raider:boolean;
		/**
		 * Defines if user is a follower of the channel
		 * null = don't know yet
		 * true = is a follower
		 * false = is not a follower
		 */
		is_following:boolean|null;
		/**
		 * true if user is banned on the channel
		 */
		is_banned:boolean;
		/**
		 * true if user is a VIP of the channel
		 */
		is_vip:boolean;
		/**
		 * true if user is a moderator of the channel
		 */
		is_moderator:boolean;
		/**
		 * true if user is the broadcaster of the channel
		 */
		is_broadcaster:boolean;
		/**
		 * true if user is subscribed to the channel
		 */
		is_subscriber:boolean;
		/**
		 * true if user has gifted subs on the channel
		 */
		is_gifter:boolean;
		/**
		 * Date at which the user followed the channel
		 * Value = 0 if not checked yet
		 */
		following_date_ms:number;
		/**
		 * User badges for this channel
		 */
		badges:TwitchatUserBadge[];
		/**
		 * Date at which the ban expires on this channel
		 */
		banEndDate?:number;
		/**
		 * Contains the ban reason
		 */
		banReason?:string;
		/**
		 * Last date the user interracted on this channel
		 */
		lastActivityDate?:number;
		/**
		 * Number of subgifts the user made on this channel
		 * Only available after making a subgift
		 */
		totalSubgifts?:number;
		/**
		 * Store the date at which this user last got a shoutout
		 */
		lastShoutout?:number;
		/**
		 * Defines if the user should be moded back after their timeout completes
		 */
		autoRemod?:boolean;
	}
	
	/**
	 * Represents the info about a user's badge
	 */
	export interface TwitchatUserBadge {
		icon:TwitchatImage;
		id:TwitchatUserBadgeType;
		title?:string;
		version?:string;
	}

	/**
	 * Available user badge types
	 */
	export type TwitchatUserBadgeType = "predictions" | "subscriber" | "vip" | "premium" | "moderator" | "staff" | "broadcaster" | "partner" | "founder" | "ambassador";
	
	/**
	 * Represents the info about a a custom user's badge
	 */
	export interface TwitchatCustomUserBadge {
		id:string;
		img:string;
		name?:string;
		enabled?:boolean;
	}

	/**
	 * Contains info about outgoing raid (when we are raiding someone)
	 */
	export interface RaidInfo {
		channel_id: string;
		user:TwitchatUser;
		viewerCount: number;
		startedAt:number;
		timerDuration_s:number;
	}

	/**
	 * Represents info about a community boost
	 */
	export interface CommunityBoost {
		channel_id: string;
		goal:number;
		progress:number;
	}

	/**
	 * Represents info about an automod event
	 */
	export interface AutomodData {
		words: string[];
		reasons:string[];
	}

	/**
	 * Represents info about an automod event
	 */
	export interface AutomodData {
		words: string[];
		reasons:string[];
	}

	/**
	 * Represents a raw emergency follow entry
	 */
	export interface EmergencyFollowEntryData {
		platform:ChatPlatform;
		uid:string;
		channelId:string;
		login:string;
		date:number;
	}

	/**
	 * Represents an emote
	 */
	export interface Emote {
		id: string;
		code: string;
		images: {
			url_1x: string;
			url_2x: string;
			url_4x: string;
		};
		platform: ChatPlatform;
		is_public: boolean;//Defines is anyone can use it
		source?: "BTTV"|"7TV"|"FFZ";
		owner?: TwitchatUser;
	}

	/**
	 * Contains a Hype chat message details
	 */
	export interface HypeChatData {
		/**
		 * Display duration
		 */
		duration_s:number;
		/**
		 * Paid amount
		 */
		amount:number;
		/**
		 * Currency example : "EUR" "USD" "CHF" "GBP"
		 */
		currency:string;
		/**
		 * Hype chat paid level.
		 * From 0 to 9
		 */
		level:number;
	}

	/**
	 * Represents a change log encry
	 */
	export interface ChangelogEntry {
		/**
		 * Title
		 */
		l:string;
		/**
		 * Icon name
		 */
		i?:string;
		/**
		 * Image
		 */
		g?:string;
		/**
		 * Video
		 */
		v?:string;
		/**
		 * Description
		 */
		d?:string;
		/**
		 * Is premium feautre?
		 */
		p?:boolean;
		/**
		 * Youtube video URL
		 */
		y?:string;
		/**
		 * Call to action
		 */
		a?:{
			/**
			 * Button label
			 */
			l:string;
			/**
			 * Parameter page to go to
			 */
			param?:TwitchatDataTypes.ParameterPagesStringType;//Parameter page to go to
			/**
			 * Parameter sub section to go to
			 */
			subparam?:TwitchatDataTypes.ParamDeepSectionsStringType;
		}
	}

	/**
	 * Contains the info about a past or pending shoutout
	 */
	export interface ShoutoutHistoryItem {
		id:string;
		/**
		 * User receiving the shoutout
		 */
		user:TwitchatDataTypes.TwitchatUser;
		/**
		 * Remaining duration before execution
		 */
		executeIn:number;
	}

	/**
	 * Represents a twitchat announcement message
	 */
	export interface TwitchatAnnouncementData{
		id:string;
		dateStart:number;
		important:boolean;
		donorsOnly:boolean;
		premiumOnly:boolean;
		patreonOnly:boolean;
		heatOnly:boolean;
		title:{[key:string]:string};
		text:{[key:string]:string};
		dateEnd?:number;
		versionMax?:string;
	}

	/**
	 * Contains some info about current stream
	 * Used to communicate that to a remote overlay
	 */
	export interface StreamSummaryData {
		streamDuration:number;
		params?:EndingCreditsParams;
		follows:{uid:string, login:string}[];
		raids:{uid:string, login:string, raiders:number}[];
		subs:{uid:string, login:string, tier:1|2|3|"prime"}[];
		resubs:{uid:string, login:string, tier:1|2|3|"prime"}[];
		subgifts:{uid:string, login:string, tier:1|2|3|"prime", total:number}[];
		bits:{uid:string, login:string, bits:number, pinned:boolean}[];
		hypeChats:{uid:string, login:string, amount:number, currency:string}[];
		rewards:{uid:string, login:string, reward:{name:string, id:string, icon:string}}[];
		shoutouts:{uid:string, login:string, received:boolean, viewers:number}[];
		hypeTrains:{level:number, percent:number, conductorBits?:{uid:string, login:string, bits:number}, conductorSubs?:{uid:string, login:string, subs:number}}[];
		polls:{title:string, votes:number, choices:{title:string, votes:number, win:boolean}[]}[];
		predictions:{title:string, points:number, outcomes:{title:string, points:number, voters:number, win:boolean}[]}[];
		chatters:{uid:string, login:string, count:number, vip:boolean, mod:boolean, sub:boolean, bans:number, tos:number, tosDuration:number}[];
	}
	
	/**
	 * Represents an Heat Distortion overlay parameters
	 */
	export interface HeatDistortionData {
		id:string;
		name:string;
		obsItemPath:OBSItemPath;
		permissions:PermissionsData;
		refuseAnon:boolean;
		effect:"liquid"|"expand"|"shrink"|"heart";
		filterName:string;
		browserSourceName:string;
		enabled:boolean;
		triggerOnly:boolean;
	}
	
	/**
	 * Represents a click event sent to the browser sources when
	 * a click occurs on heat
	 */
	export interface HeatClickData extends JsonObject{
		id:string;
		channelId:string;
		anonymous:boolean;
		x:number;
		y:number;
		rotation:number;
		scaleX:number;
		scaleY:number;
		uid:string;
		login:string;
		isSub:boolean;
		isBan:boolean;
		isMod:boolean;
		isVip:boolean;
		isBroadcaster:boolean;
		isFollower:boolean;
		followDate:number;
		testMode:boolean;
		alt:boolean;
		ctrl:boolean;
		shift:boolean;
		page:string;
		twitchatOverlayID:string;
	}

	export interface QnaSession {
		/**
		 * Session ID
		 */
		id:string;
		/**
		 * Are submissions opened?
		 */
		open:boolean;
		/**
		 * Command to use to submit a question
		 */
		command:string;
		/**
		 * Submitted questions
		 */
		messages:TranslatableMessage[];
	}
	
	/**
	 * Contains only the Array props from the StreamSummaryData
	 */
	type ExtractArrayProps<T> = {[K in keyof T]: T[K] extends any[] ? ExcludeUndefined<T[K][number]> : never;}
	type UnionFromArrayProps<T> = ExcludeUndefined<ExtractArrayProps<T>[keyof ExtractArrayProps<T>]>;
	type ExcludeUndefined<T> = T extends undefined ? never : T;
	export type StreamSummaryDataListItem = UnionFromArrayProps<StreamSummaryData>;

	export type EndingCreditsSlotStringTypes = "text" | "bans" | "mods" | "subs" | "vips" | "raids" | "polls" | "so_in" | "so_out" | "cheers" | "follows" | "rewards" | "chatters" | "timeouts" | "hypechats" | "hypetrains" | "predictions";
	export const EndingCreditsSlotDefinitions:EndingCreditsSlotDefinition[] = [
		{id:"cheers",		premium:false,	hasAmount:true,		canMerge:true,		icon:"bits",			label:"overlay.credits.categories.cheers",			defaultLabel:"overlay.credits.labels.cheers",		amountLabel:"overlay.credits.amounts.cheers"},
		{id:"subs",			premium:false,	hasAmount:true,		canMerge:true,		icon:"sub",				label:"overlay.credits.categories.subs",			defaultLabel:"overlay.credits.labels.subs",			amountLabel:"overlay.credits.amounts.subs"},
		{id:"follows",		premium:false,	hasAmount:false,	canMerge:false,		icon:"follow",			label:"overlay.credits.categories.follows",			defaultLabel:"overlay.credits.labels.follows"},
		{id:"raids",		premium:false,	hasAmount:true,		canMerge:true,		icon:"raid",			label:"overlay.credits.categories.raids",			defaultLabel:"overlay.credits.labels.raids",		amountLabel:"overlay.credits.amounts.raids"},
		{id:"chatters",		premium:false,	hasAmount:true,		canMerge:false,		icon:"user",			label:"overlay.credits.categories.chatters",		defaultLabel:"overlay.credits.labels.chatters", 	amountLabel:"overlay.credits.amounts.chatters"},
		// {id:"hypechats",	premium:true,	hasAmount:true,		canMerge:true,		icon:"hypeChat",		label:"overlay.credits.categories.hypechats",		defaultLabel:"overlay.credits.labels.hypechats",	amountLabel:"overlay.credits.amounts.hypechats"},
		{id:"hypetrains",	premium:true,	hasAmount:false,	canMerge:false,		icon:"train",			label:"overlay.credits.categories.hypetrains",		defaultLabel:"overlay.credits.labels.hypetrains"},
		{id:"rewards",		premium:true,	hasAmount:true,		canMerge:false,		icon:"channelPoints",	label:"overlay.credits.categories.rewards",			defaultLabel:"overlay.credits.labels.rewards",		amountLabel:"overlay.credits.amounts.rewards"},
		{id:"bans",			premium:true,	hasAmount:true,		canMerge:false,		icon:"ban",				label:"overlay.credits.categories.bans",			defaultLabel:"overlay.credits.labels.bans",			amountLabel:"overlay.credits.amounts.bans"},
		{id:"timeouts",		premium:true,	hasAmount:true,		canMerge:false,		icon:"timeout",			label:"overlay.credits.categories.timeouts",		defaultLabel:"overlay.credits.labels.timeouts",		amountLabel:"overlay.credits.amounts.timeouts"},
		{id:"so_in",		premium:true,	hasAmount:true,		canMerge:false,		icon:"shoutout",		label:"overlay.credits.categories.so_in",			defaultLabel:"overlay.credits.labels.so_in",		amountLabel:"overlay.credits.amounts.so_in"},
		{id:"so_out",		premium:true,	hasAmount:true,		canMerge:false,		icon:"shoutout",		label:"overlay.credits.categories.so_out",			defaultLabel:"overlay.credits.labels.so_out",		amountLabel:"overlay.credits.amounts.so_out"},
		{id:"polls",		premium:true,	hasAmount:true,		canMerge:false,		icon:"poll",			label:"overlay.credits.categories.polls",			defaultLabel:"overlay.credits.labels.polls",		amountLabel:"overlay.credits.amounts.polls"},
		{id:"predictions",	premium:true,	hasAmount:true,		canMerge:false,		icon:"prediction",		label:"overlay.credits.categories.predictions",		defaultLabel:"overlay.credits.labels.predictions",	amountLabel:"overlay.credits.amounts.predictions"},
		{id:"text",			premium:true,	hasAmount:false,	canMerge:false,		icon:"font",			label:"overlay.credits.categories.text",			defaultLabel:"overlay.credits.labels.text"},
	];
	
	export interface EndingCreditsSlotDefinition {
		id:EndingCreditsSlotStringTypes,
		icon:string,
		label:string,
		defaultLabel:string,
		premium:boolean,
		hasAmount:boolean,
		canMerge:boolean,
		amountLabel?:string,
	}
	
	export interface EndingCreditsSlotParams {
		id:string;
		slotType:EndingCreditsSlotStringTypes;
		label:string;
		maxEntries:number;
		enabled:boolean,
		layout:"colLeft"|"col"|"colRight"|"left"|"center"|"right"|"2cols"|"3cols";
		customHTML?:boolean;
		htmlTemplate?:string;
		showAmounts?:boolean;
		showBadges?:boolean;
		showMods?:boolean;
		showVIPs?:boolean;
		showSubs?:boolean;
		showResubs?:boolean;
		showSubgifts?:boolean;
		sortByNames?:boolean;
		sortByRoles?:boolean;
		sortByAmounts?:boolean;
		sortBySubTypes?:boolean;
		showChatters?:boolean;
		showTrainConductors?:boolean;
		uniqueUsers?:boolean;
		text?:string,
		filterRewards?:boolean,
		showRewardUsers?:boolean,
		showNormalCheers?:boolean,
		showPinnedCheers?:boolean,
		rewardIds?:string[],
	}

	export interface EndingCreditsParams {
		lang?:string;
		scale:number;
		padding:number;
		paddingTitle:number;
		stickyTitle:boolean;
		colorTitle:string;
		colorEntry:string;
		fontTitle:string;
		fontEntry:string;
		ignoreBots:boolean;
		ignoreCustomBots:string[];
		textShadow:number;
		timing:"speed" | "duration";
		duration:number;
		startDelay:number;
		loop:boolean;
		showIcons:boolean;
		speed:number;
		fadeSize:number;
		slots:EndingCreditsSlotParams[];
		hideEmptySlots?:boolean;//Optional because added later
	}

	/**
	 * Contains some info about the ad break overlay
	 */
	export interface AdBreakOverlayData {
		showApproaching:boolean;
		showRunning:boolean;
		approachingDelay:number;
		approachingStyle:"bar"|"text";
		runningStyle:"bar"|"text";
		approachingSize:number;
		runningSize:number;
		approachingThickness:number;
		runningThickness:number;
		approachingColor:string;
		runningColor:string;
		approachingPlacement:ScreenPosition;
		runningPlacement:ScreenPosition;
		approachingLabel:string;
		runningLabel:string;
	}

	/**
	 * Contains params about the bits wall overlay
	 */
	export interface BitsWallOverlayData {
		size:number;
		break:boolean;
		opacity:number;
		break_senderOnly:boolean;
		break_durations?:{1:number, 100:number, 1000:number, 5000:number, 10000:number};
	}

	/**
	 * Contains params about the bits wall overlay
	 */
	export interface DiscordQuickActionData {
		id:string;
		action:"message";
		message?:string;
	}



	/**
	 * Available message types 
	 */
	export const TwitchatMessageType = {
		BAN:"ban",
		RAID:"raid",
		POLL:"poll",
		JOIN:"join",
		UNBAN:"unban",
		LEAVE:"leave",
		CHEER:"cheer",
		TIMER:"timer",
		BINGO:"bingo",
		CUSTOM:"custom",
		PINNED:"pinned",
		RAFFLE:"raffle",
		REWARD:"reward",
		NOTICE:"notice",
		MESSAGE:"message",
		WHISPER:"whisper",
		CONNECT:"connect",
		UNPINNED:"unpinned",
		SHOUTOUT:"shoutout",
		VOICEMOD:"voicemod",
		QNA_STOP:"qna_stop",
		QNA_START:"qna_start",
		HYPE_CHAT:"hype_chat",
		FOLLOWING:"following",
		COUNTDOWN:"countdown",
		QNA_DELETE:"qna_delete",
		CLEAR_CHAT:"clear_chat",
		CHAT_ALERT:"chat_alert",
		DISCONNECT:"disconnect",
		PREDICTION:"prediction",
		HEAT_CLICK:"heat_click",
		MUSIC_STOP:"music_stop",
		MUSIC_START:"music_start",
		TWITCHAT_AD:"twitchat_ad",
		VALUE_UPDATE:"value_update",
		GOXLR_BUTTON:"goxlr_button",
		RAID_STARTED:"raid_started",
		SUBSCRIPTION:"subscription",
		AUTOBAN_JOIN:"autoban_join",
		CREDITS_COMPLETE:"credits_complete",
		SCOPE_REQUEST:"scope_request",
		ROOM_SETTINGS:"room_settings",
		STREAM_ONLINE:"stream_online",
		GOXLR_FX_STATE:"goxlr_fx_state",
		STREAM_OFFLINE:"stream_offline",
		CHAT_HIGHLIGHT:"chat_highlight",
		FOLLOWBOT_LIST:"followbot_list",
		COUNTER_UPDATE:"counter_update",
		AD_BREAK_START:"ad_break_start",
		OBS_STOP_STREAM:"obs_stop_stream",
		HISTORY_SPLITTER:"history_splitter",
		OBS_START_STREAM:"obs_start_stream",
		HYPE_TRAIN_START:"hype_train_start",
		OBS_SCENE_CHANGE:"obs_scene_change",
		AD_BREAK_COMPLETE:"ad_break_complete",
		GOXLR_SOUND_INPUT:"goxlr_sound_input",
		USER_WATCH_STREAK:"user_watch_streak",
		OBS_SOURCE_TOGGLE:"obs_source_toggle",
		OBS_FILTER_TOGGLE:"obs_filter_toggle",
		HYPE_TRAIN_CANCEL:"hype_train_cancel",
		HYPE_TRAIN_SUMMARY:"hype_train_summary",
		AD_BREAK_START_CHAT:"ad_break_start_chat",
		HYPE_TRAIN_PROGRESS:"hype_train_progress",
		HYPE_TRAIN_COMPLETE:"hype_train_complete",
		LOW_TRUST_TREATMENT:"low_trust_treatment",
		AD_BREAK_APPROACHING:"ad_break_approaching",
		MUSIC_ADDED_TO_QUEUE:"music_added_to_queue",
		GOXLR_SAMPLE_COMPLETE:"goxlr_sample_complete",
		OBS_INPUT_MUTE_TOGGLE:"obs_input_mute_toggle",
		HYPE_TRAIN_APPROACHING:"hype_train_approaching",
		HYPE_TRAIN_COOLED_DOWN:"hype_train_cooled_down",
		CLIP_CREATION_COMPLETE:"clip_creation_complete",
		CLIP_PENDING_PUBLICATION:"clip_pending_publication",
		COMMUNITY_BOOST_COMPLETE:"community_boost_complete",
		OBS_PLAYBACK_STATE_UPDATE:"obs_playback_state_update",
		COMMUNITY_CHALLENGE_CONTRIBUTION:"community_challenge_contribution",
	} as const;

	//Dynamically type TwitchatMessageStringType from TwitchatMessageType values
	export type TwitchatMessageStringType = typeof TwitchatMessageType[keyof typeof TwitchatMessageType];
	
	export const DisplayableMessageTypes:{[key in TwitchatMessageStringType]:boolean} = {
		ban:true,
		raid:true,
		unban:true,
		poll:true,
		join:true,
		leave:true,
		cheer:true,
		timer:true,
		bingo:true,
		custom:true,
		raffle:true,
		reward:true,
		notice:true,
		pinned:true,//Don't set it to false! we need to find it back when unpinning a message
		message:true,
		whisper:true,
		connect:true,
		shoutout:true,
		unpinned:true,
		qna_stop:false,
		qna_start:false,
		qna_delete:false,
		hype_chat:true,
		voicemod:false,
		following:true,
		countdown:true,
		clear_chat:true,
		disconnect:true,
		prediction:true,
		heat_click:false,
		chat_alert:false,
		music_stop:false,
		twitchat_ad:true,
		music_start:false,
		subscription:true,
		autoban_join:true,
		value_update:false,
		goxlr_button:false,
		raid_started:false,
		room_settings:true,
		stream_online:true,
		scope_request:true,
		credits_complete:false,
		followbot_list:true,
		stream_offline:true,
		ad_break_start:false,
		chat_highlight:false,//Used for "highlight on overlay" events
		counter_update:false,
		goxlr_fx_state:false,
		history_splitter:true,
		obs_stop_stream:false,
		user_watch_streak:true,
		hype_train_start:false,
		obs_scene_change:false,
		obs_start_stream:false,
		obs_source_toggle:false,
		ad_break_complete:false,
		obs_filter_toggle:false,
		hype_train_cancel:false,
		hype_train_summary:true,
		goxlr_sound_input:false,
		low_trust_treatment:true,
		ad_break_start_chat:true,
		hype_train_progress:false,
		hype_train_complete:false,
		ad_break_approaching:false,
		music_added_to_queue:true,
		goxlr_sample_complete:false,
		obs_input_mute_toggle:false,
		hype_train_cooled_down:true,
		hype_train_approaching:false,
		clip_creation_complete:false,
		clip_pending_publication:true,
		community_boost_complete:true,
		obs_playback_state_update:false,
		community_challenge_contribution:true,
	} as const;


	/**
	 * Available notice types
	 * All these are managed by the same ChatNotice.vue component
	 */
	export const TwitchatNoticeType = {
		GENERIC:"generic",//For any generic (not strongly typed) messages. Ex: any comming from twitch's IRC that can't all be known for sure
		ERROR:"error",//For any error message
		TTS:"tts",//For TTS releated messages. Ex:"User's message will be read out loud"
		APP_VERSION:"appVersion",//When using command "/version"
		MOD:"mod",//When granting mod role to a user
		UNMOD:"unmod",//When removing mod role from a user
		SHIELD_MODE:"shieldMode",//When starting/stopping shield mode
		VIP:"vip",///When granting VIP role to a user
		UNVIP:"unvip",//When removing VIP role from a user
		EMERGENCY_MODE:"emergencyMode",//When emergency mode is started/stoped
		COMMERCIAL_ERROR:"commercialError",//When a commercial request fails
		COMMERCIAL_START:"commercialStart",//When a commercial is started
		COMMERCIAL_COMPLETE:"commercialComplete",//When a commercial completes
		STREAM_INFO_UPDATE:"stream_info_update",//When updating a stream info (title, category,...)
		CYPHER_KEY:"cypherKey",//When configuring/removing a cypher key (secret feature hehehe ( ͡~ ͜ʖ ͡°) )
		MARKER_CREATED:"markerCreated",
		DEVMODE:"devMode",//When enabling/disabling devmode via "/devmode" command
		BLOCKED:"blocked",//When a user is blocked
		UNBLOCKED:"unblocked",//When a user is unblocked
	} as const;
	export type TwitchatNoticeStringType = typeof TwitchatNoticeType[keyof typeof TwitchatNoticeType]|null;

	/**
	 * Message types 
	 */
	export type ChatMessageTypes = MessageChatData
									| MessageWhisperData
									| MessagePollData
									| MessagePredictionData
									| MessageFollowingData
									| MessageSubscriptionData
									| MessageCheerData
									| MessageRewardRedeemData
									| MessageCommunityChallengeContributionData
									| MessageHypeTrainSummaryData
									| MessageHypeTrainCooledDownData
									| MessageCommunityBoostData
									| MessageRaidData
									| MessageJoinData
									| MessageLeaveData
									| MessageBanData
									| MessageUnbanData
									| MessageModerationAction
									| MessageClearChatData
									| MessageRaffleData
									| MessageBingoData
									| MessageCountdownData
									| MessageAutobanJoinData
									| MessageTwitchatAdData
									| MessageTimerData
									| MessageStreamInfoUpdate
									| MessageEmergencyModeInfo
									| MessageHypeTrainEventData
									| MessageChatAlertData
									| MessageMusicStopData
									| MessageMusicStartData
									| MessageMusicAddedToQueueData
									| MessageShoutoutData
									| MessageVoicemodData
									| MessageChatHighlightData
									| MessageConnectData
									| MessageDisconnectData
									| MessageFollowbotData
									| MessageNoticeData
									| MessageLowtrustTreatmentData
									| MessageOBSSceneChangedData
									| MessageOBSSourceToggleData
									| MessageOBSStartStreamData
									| MessageOBSStopStreamData
									| MessageOBSFilterToggleData
									| MessageOBSInputMuteToggleData
									| MessageOBSPlaybackStateUpdateData
									| MessageRoomSettingsData
									| MessageStreamOnlineData
									| MessageStreamOfflineData
									| MessageCounterUpdateData
									| MessageValueUpdateData
									| MessageUnpinData
									| MessageClipCreate
									| MessageRaidStartData
									| MessagePinData
									| MessageScopeRequestData
									| MessageMarkerCreatedData
									| MessageWatchStreakData
									| MessageHypeChatData
									| MessageHeatClickData
									| MessageGoXLRButtonData
									| MessageGoXLRFXEnableChangeData
									| MessageGoXLRSampleCompleteData
									| MessageGoXLRSoundInputData
									| MessageHistorySplitterData
									| MessageAdBreakStartData
									| MessageAdBreakApproachingData
									| MessageAdBreakCompleteData
									| MessageCustomData
									| MessageQnaStartData
									| MessageQnaStopData
									| MessageQnaDeleteData
									| MessageCreditsCompleteData
	;
	
	/**
	 * Defines any message that could be deleted.
	 * Used by TTS to check if the message still exists before reading it
	 */
	export const DeletableMessageTypes:TwitchatMessageStringType[] = [
		TwitchatMessageType.MESSAGE,
	];
	
	/**
	 * Defines the filters
	 */
	export const MessageListFilterTypes = [
		TwitchatMessageType.BAN,
		TwitchatMessageType.RAID,
		TwitchatMessageType.POLL,
		TwitchatMessageType.JOIN,
		TwitchatMessageType.UNBAN,
		TwitchatMessageType.LEAVE,
		TwitchatMessageType.CHEER,
		TwitchatMessageType.BINGO,
		TwitchatMessageType.RAFFLE,
		TwitchatMessageType.REWARD,
		TwitchatMessageType.NOTICE,
		TwitchatMessageType.PINNED,
		TwitchatMessageType.MESSAGE,
		TwitchatMessageType.WHISPER,
		TwitchatMessageType.SHOUTOUT,
		TwitchatMessageType.FOLLOWING,
		// TwitchatMessageType.HYPE_CHAT,
		TwitchatMessageType.COUNTDOWN,
		TwitchatMessageType.PREDICTION,
		TwitchatMessageType.TWITCHAT_AD,
		TwitchatMessageType.SUBSCRIPTION,
		TwitchatMessageType.STREAM_ONLINE,//also works for STREAM_OFFLINE
		TwitchatMessageType.USER_WATCH_STREAK,
		TwitchatMessageType.HYPE_TRAIN_SUMMARY,
		TwitchatMessageType.AD_BREAK_START_CHAT,
		TwitchatMessageType.MUSIC_ADDED_TO_QUEUE,
		TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN,
		TwitchatMessageType.COMMUNITY_BOOST_COMPLETE,
		TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION,
	] as const;

	/**
	 * Common props for all message types
	 */
	export interface AbstractTwitchatMessage {
		type:TwitchatMessageStringType;
		id:string;
		date:number;
		channel_id:string;
		platform:ChatPlatform;
		/**
		 * If this is set to true the message won't be displayed on main chat columns.
		 * But they will be displayed on search results
		 */
		// hidden:boolean;
		/**
		 * true if message has been deleted
		 */
		deleted?:boolean;
		/**
		 * true if message has been part of the cleared messages
		 * when using /clear command
		 */
		cleared?:boolean;
		/**
		 * Is it a fake message ?
		 */
		fake?:boolean;
		/**
		 * Optional column index to display the message to
		 * Can be an array of column indices
		 */
		col?:number|number[];
	}

	export type MergeableMessageTypes = Extract<ChatMessageTypes, {message_size?:number}>["type"];
	
	//Ensure the object contains all requested keys
	export const MergeableMessageTypesString:Record<MergeableMessageTypes, boolean> = {
		message:true,
		reward:true,
		whisper:true,
		cheer:true,
		subscription:false,
		user_watch_streak:false,
	}
	export interface MergeableMessage {
		/**
		 * User that posted the message
		 */
		user: TwitchatUser;
		/**
		 * Size of the message in chars (emotes/cheermotes count as 2 chars)
		 */
		message_size:number;
	}

	export type GreetableMessageTypes = Extract<ChatMessageTypes, {is_greetable_message?:boolean}>["type"];
	//Ensure the object contains all requested keys
	//This object is used to check if a message type is a greetable message
	export const GreetableMessageTypesString:Record<GreetableMessageTypes, boolean> ={
		cheer:true,
		reward:true,
		message:true,
		following:true,
		subscription:true,
		user_watch_streak:true,
	}
	export interface GreetableMessage extends AbstractTwitchatMessage {
		/**
		 * Do not use this property.
		 * It's only here for the GreetableMessageTypes type definition
		 * @deprecated
		 */
		is_greetable_message?:boolean;
		/**
		 * Is it the first message of the user today ?
		 */
		todayFirst?: boolean;
		/**
		 * Channel ID the message has been sent to
		 */
		channel_id:string;
		/**
		 * User that sent the message
		 */
		user:TwitchatUser;
	}
	

	export type TranslatableMessageTypes = Extract<ChatMessageTypes, {translation?:TranslatableMessage["translation"]}>["type"];
	//Ensure the object contains all requested keys
	export const TranslatableMessageTypesString:Record<TranslatableMessageTypes, boolean> = {
		cheer:true,
		reward:true,
		whisper:true,
		message:true,
		subscription:true,
		user_watch_streak:true,
	}
	export interface TranslatableMessage extends AbstractTwitchatMessage {
		/**
		 * User that sent the message
		 */
		user:TwitchatUser;
		/**
		 * Translation details
		 */
		translation?:{
			/**
			 * ISO 639-1 code for the flag icon
			 */
			flagISO:string;
			/**
			 * Original ISO 639-1 language code
			 */
			languageCode:string;
			/**
			 * Original language name
			 */
			languageName:string;
			/**
			 * Translated message
			 */
			translation:string;
		}
		/**
		 * Set to true if translation gave nothing or an error
		 */
		translation_failed?:boolean;
		/**
		 * Text message content
		 */
		message?:string;
		/**
		 * Message splitted by chunks types (text, url and emote)
		 */
		message_chunks?:ParseMessageChunk[];
		/**
		 * Message content as HTML
		 * All emotes are replaced by HTML tags
		 */
		message_html?:string;
	}

	/**
	 * A regular user's message
	 */
	export interface MessageChatData extends GreetableMessage, MergeableMessage, TranslatableMessage {
		type:"message";
		/**
		 * Channel ID the message has been posted in
		 */
		channel_id: string;
		/**
		 * User that posted the message
		 */
		user: TwitchatUser;
		/**
		 * Text message content
		 */
		message:string;
		/**
		 * Message splitted by chunks types (text, url and emote)
		 */
		message_chunks:ParseMessageChunk[];
		/**
		 * Message content as HTML
		 * All emotes are replaced by HTML tags
		 */
		message_html:string;
		/**
		 * @see MergeableMessage
		 */
		message_size:number;
		/**
		 * All messages that answered to this message
		 */
		answers: MessageChatData[];
		/**
		 * Is this the automatic twitchat ad message ?
		 */
		is_ad?: boolean;
		/**
		 * Tells if the message is considered as short.
		 * true if the message contains mostly emotes or a short word
		 */
		is_short: boolean;
		/**
		 * True if message has been saved
		 */
		is_saved?: boolean;
		/**
		 * True if message has been pinned on chat
		 */
		is_pinned?: boolean;
		
		/**
		 * Twitchat's automod info
		 */
		automod?: AutomodParamsKeywordFilterData;
		/**
		 * The message this message answers to if any
		 */
		answersTo?: MessageChatData;
		/**
		 * Is the message content cyphered ?
		 */
		cyphered?: boolean;
		/**
		 * Info about the mod that deleted the message
		 */
		deletedData?: {
			deleter:TwitchatUser;
		};
		/**
		 * Number of times this message has been sent
		 * Only incremented if related parameter has been enabled
		 */
		occurrenceCount?: number;
		/**
		 * true if we're mentionned on this message
		 */
		hasMention?: boolean;
		/**
		 * true if should be displayed as a spoiler
		 */
		spoiler?: boolean;
		/**
		 * true if message has been automatically set as spoiler
		 * e.g: when "auto spoil 1st time chatters" option is enabled
		 */
		autospoiled?: boolean;
		/**
		 * This is used to messages sent by extensions can bypass the bots filter.
		 * If user chose to hide bots messages, this message will be displayed
		 * anyways as long as this prop is set to true
		 */
		bypassBotFilter?: boolean;
		
		/**
		 * CIs defined if user paied for their message
		 */
		twitch_hypeChat?:HypeChatData;
		/**
		 * Twitch automod info if the message has been held by automod
		 */
		twitch_automod?: AutomodData;
		/**
		 * true if user used the /me command for this message
		 */
		twitch_isSlashMe?:boolean;
		/**
		 * true if it's the first message the user ever sent on this channel
		 */
		twitch_isFirstMessage?:boolean;
		/**
		 * true if it's a returning user
		 * I think twitch removed it.
		 */
		twitch_isReturning?:boolean;
		/**
		 * true if user used the "presentation" feature
		 */
		twitch_isPresentation?:boolean;
		/**
		 * Contains the channels in which the user is banned in case of shared ban user
		 */
		twitch_sharedBanChannels?: {id:string, login:string}[];
		/**
		 * true if user is flagged as suspicious
		 */
		twitch_isSuspicious?: boolean;
		/**
		 * true when user is flagged as restricted
		 */
		twitch_isRestricted?: boolean;
		/**
		 * true if user used the "highlight my message" channel point reward
		 */
		twitch_isHighlighted?: boolean;
		/**
		 * Color of the announcement if this is a /announce message
		 */
		twitch_announcementColor?: "primary" | "purple" | "blue" | "green" | "orange";
		/**
		 * Raw IRC data of t he message
		 */
		raw_data?:any;
	}

	/**
	 * Whisper message 
	 */
	export interface MessageWhisperData extends AbstractTwitchatMessage, TranslatableMessage {
		type:"whisper";
		channel_id:string;
		/**
		 * User that sent the whisper
		 */
		user: TwitchatUser;
		/**
		 * Recipient of the whisper
		 */
		to: TwitchatUser;
		/**
		 * Text message content
		 */
		message:string;
		/**
		 * Message splitted by chunks types (text, url and emote)
		 */
		message_chunks:ParseMessageChunk[];
		/**
		 * Message content as HTML
		 * All emotes are replaced by HTML tags
		 */
		message_html:string;
		/**
		 * @see MergeableMessage
		 */
		message_size:number;
		/**
		 * Is the message content cyphered ?
		 */
		cyphered?: boolean;
		/**
		 * Info about the mod that deleted the message
		 */
		/**
		 * Number of times this message has been sent
		 * Only incremented if related parameter has been enabled
		 */
		occurrenceCount?: number;
		/**
		 * True if message has been saved
		 */
		is_saved?: boolean;
		/**
		 * true if should be displayed as a spoiler
		 */
		spoiler?: boolean;
	}

	/**
	 * Represents a poll's data
	 */
	export interface MessagePollData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"poll";
		/**
		 * Poll creator
		 */
		creator?: TwitchatUser;
		/**
		 * Poll title
		 */
		title: string;
		/**
		 * Poll choices
		 */
		choices: MessagePollDataChoice[];
		/**
		 * Poll duration in seconds
		 */
		duration_s: number;
		/**
		 * Timestamp when the poll has been started
		 */
		started_at: number;
		/**
		 * Timestamp when the poll has ended
		 */
		ended_at?: number;
		/**
		 * Winning choice
		 */
		winner?:MessagePollDataChoice;
	}
	export interface MessagePollDataChoice {
		id: string;
		/**
		 * Choice text
		 */
		label: string;
		/**
		 * Number of votes the choice got
		 */
		votes: number;
	}

	/**
	 * Represents a prediction's data
	 */
	export interface MessagePredictionData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"prediction";
		/**
		 * Prediction creator
		 */
		creator?: TwitchatUser;
		/**
		 * Prediction title
		 */
		title: string;
		/**
		 * Prediction duration in seconds
		 */
		duration_s: number;
		/**
		 * Prediction possible outcomes
		 */
		outcomes: MessagePredictionDataOutcome[];
		/**
		 * true if the prediction is pending for choosing the winning outcome
		 */
		pendingAnswer: boolean;
		/**
		 * Timestamp when the Prediction has been started
		 */
		started_at: number;
		/**
		 * Timestamp when the Prediction has ended
		 */
		ended_at?: number;
		/**
		 * Winning choice
		 */
		winner?:MessagePredictionDataOutcome;
		/**
		 * Total channel points bet
		 */
		totalPoints:number;
		/**
		 * Total users participating
		 */
		totalUsers:number;
	}
	export interface MessagePredictionDataOutcome {
		id: string;
		/**
		 * Text of the choice
		 */
		label: string;
		/**
		 * Number of "votes", represents the total channel points spent on it
		 */
		votes: number;
		/**
		 * Number of users that voted for this answer
		 */
		voters: number;
	}

	/**
	 * Represents a "new follower" message
	 */
	export interface MessageFollowingData extends GreetableMessage {
		channel_id: string;
		type:"following";
		/**
		 * User that followed
		 */
		user:TwitchatUser;
		/**
		 * Timestamp the user followed
		 */
		followed_at: number;
		/**
		 * Automod info if the user's name match a twitchat automod rule
		 */
		automod?: AutomodParamsKeywordFilterData;
		/**
		 * This is used to indicate a ban/block process in progress on the emergency review
		 */
		loading?: boolean;
		/**
		 * true if twitchat thinks it's part of a followbot
		 */
		followbot?:boolean;
	}

	/**
	 * Represents a new subscription message
	 */
	export interface MessageSubscriptionData extends GreetableMessage, TranslatableMessage {
		channel_id: string;
		type:"subscription";
		/**
		 * User that subscribed or gifted a sub
		 */
		user: TwitchatUser;
		/**
		 * Sub tier
		 */
		tier: 1|2|3|"prime";
		/**
		 * true if it's a gift
		 */
		is_gift: boolean;
		/**
		 * true if user renewed a subgift they got before
		 */
		is_giftUpgrade: boolean;
		/**
		 * true if user renews their sub
		 */
		is_resub: boolean;
		/**
		 * User that gifted the sub to a user that renews their sub after being sub gifted
		 */
		gift_upgradeSender?: TwitchatUser;
		/**
		 * Users that received the sub gift
		 */
		gift_recipients?: TwitchatUser[];
		/**
		 * Number of gifts given
		 */
		gift_count?: number;
		/**
		 * Number of months the user subscribed for
		 */
		months:number;
		/**
		 * Number of consecutive months the user has been subscribed for
		 */
		streakMonths:number;
		/**
		 * Number of months the user has been subscribed for
		 */
		totalSubDuration:number;
		/**
		 * Optional message sent when sharing our sub
		 */
		message?:string;
		/**
		 * Message splitted by chunks types (text, url and emote)
		 */
		message_chunks?:ParseMessageChunk[];
		/**
		 * Optional message sent when sharing our sub with emotes remplaced by HTML tags
		 */
		message_html?:string;
		/**
		 * @see MergeableMessage
		 */
		message_size:number;
		/**
		 * raw IRC data of the sub
		 */
		raw_data?:any;
	}

	/**
	 * Represents a bits data
	 */
	export interface MessageCheerData extends GreetableMessage, MergeableMessage, TranslatableMessage {
		channel_id: string;
		type:"cheer";
		/**
		 * Number of bits sent
		 */
		bits: number;
		/**
		 * User that sent bits
		 */
		user: TwitchatUser;
		/**
		 * Text message
		 */
		message: string;
		/**
		 * Message splitted by chunks types (text, url and emote)
		 */
		message_chunks?:ParseMessageChunk[];
		/**
		 * Text message with cheermotes replaced by HTML tags
		 */
		message_html: string;
		/**
		 * @see MergeableMessage
		 */
		message_size: number;
		/**
		 * Is message pinned ?
		 */
		pinned:boolean;
		/**
		 * Pin level
		 */
		pinLevel:number;//0|1|2|3|4|5|6|7;
		/**
		 * Pin duration in ms if message is pinned
		 */
		pinDuration_ms:number;
		/**
		 * Raw IRC data of the message
		 */
		raw_data?:any;
	}

	/**
	 * Represents a reward redeem message
	 */
	export interface MessageRewardRedeemData extends GreetableMessage, MergeableMessage, TranslatableMessage {
		channel_id: string;
		type:"reward";
		/**
		 * User that redeemed a channel point reward
		 */
		user: TwitchatUser;
		/**
		 * Reward's info
		 */
		reward: {
			id:string;
			title:string;
			cost:number;
			description:string;
			icon:TwitchatImage;
			color:string;
		};
		/**
		 * Optional message the reward requires the user to send when redeeming it
		*/
		message?:string;
		/**
		 * Message splitted by chunks types (text, url and emote)
		*/
		message_chunks?:ParseMessageChunk[];
		/**
		 * Optional message the reward requires the user to send when redeeming it with emotes replaced by HTML tags
		*/
		message_html?:string;
		/**
		 * Redeem ID.
		 * Need to refund it later
		 */
		redeemId?:string;
		/**
		 * Is redeem refund?
		 */
		refund?:boolean
	}

	/**
	 * Represents a community challenge contribution
	 */
	export interface MessageCommunityChallengeContributionData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"community_challenge_contribution";
		/**
		 * User contributing to the challenge
		 */
		user: TwitchatUser;
		/**
		 * How many points the user contributed
		 */
		contribution: number;
		/**
		 * How many points the user contributed during current stream
		 */
		stream_contribution?:number;
		/**
		 * How many points the user contributed for this challenge since its beginning
		 */
		total_contribution?:number;
		/**
		 * Challenge infos
		 */
		challenge: {
			title:string;
			goal:number;
			progress:number;
			progress_percent:number;
			description?:string;
			icon?:TwitchatImage;
		}
	}

	/**
	 * Represents a hype train result message
	 */
	export interface MessageHypeTrainSummaryData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"hype_train_summary";
		/**
		 * Hype train infos
		 */
		train: HypeTrainStateData;
		/**
		 * Chat activities related to this hype train
		 */
		activities: (MessageSubscriptionData|MessageCheerData|MessageHypeChatData)[];
	}

	/**
	 * Represents a hype train in progress
	 */
	export interface MessageHypeTrainEventData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"hype_train_approaching"|"hype_train_start"|"hype_train_cancel"|"hype_train_progress"|"hype_train_complete";
		/**
		 * Hype train infos
		 */
		train: HypeTrainStateData;
		/**
		 * Current hype train level
		 */
		level:number;
		/**
		 * Current hyper train level percent
		 */
		percent:number;
	}

	/**
	 * Represents a hype train cooldown message
	 */
	export interface MessageHypeTrainCooledDownData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"hype_train_cooled_down";
	}

	/**
	 * Represents a community boost data
	 */
	export interface MessageCommunityBoostData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"community_boost_complete";
		/**
		 * Number of viewers the channel has been boosted to
		 */
		viewers:number;
	}

	/**
	 * Represents info about an incoming raid
	 */
	export interface MessageRaidData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"raid";
		/**
		 * User raiding
		 */
		user:TwitchatUser;
		/**
		 * Number of viewers coming with the raid
		 */
		viewers:number;
		/**
		 * Stream info of the raider
		 */
		stream:{
			wasLive: boolean;
			title: string;
			category: string;
			/**
			 * Stream duration in ms
			 */
			duration: number;
		}
	}

	/**
	 * Represents a "chat connected" message
	 */
	export interface MessageConnectData extends AbstractTwitchatMessage {
		/**
		 * Channel ID we connected to
		 */
		channel_id: string;
		type:"connect";
		/**
		 * User that connected to the chat
		 */
		user:TwitchatUser;
	}
	
	/**
	 * Represents a "chat connection lost" message
	 */
	export interface MessageDisconnectData extends AbstractTwitchatMessage {
		/**
		 * Channel ID we disconnected from
		 */
		channel_id: string;
		type:"disconnect";
		/**
		 * User that got disconnected from the chat
		 */
		user:TwitchatUser;
	}

	/**
	 * Represents a chat user joining message
	 * Join events are batch into one single message for all the users
	 * joining the channel
	 */
	export interface MessageJoinData extends AbstractTwitchatMessage {
		/**
		 * Channel ID the users joined
		 */
		channel_id: string;
		type:"join";
		/**
		 * Users that joined the channel
		 */
		users:TwitchatUser[];
	}
	
	/**
	 * Represents a chat user leaving message
	 * Leave events are batch into one single message for all the users
	 * leaving the channel
	 */
	export interface MessageLeaveData extends AbstractTwitchatMessage {
		/**
		 * Channel ID the users left
		 */
		channel_id: string;
		type:"leave";
		/**
		 * Users that left the channel
		 */
		users:TwitchatUser[];
	}

	/**
	 * Represents a chat clear 
	 */
	export interface MessageClearChatData extends AbstractTwitchatMessage {
		/**
		 * Chennel ID that got cleared
		 */
		channel_id: string;
		type:"clear_chat";
		/**
		 * User that cleared the channel
		 */
		user?:TwitchatUser;
		/**
		 * true if the channel has been cleared from automod
		 */
		fromAutomod:boolean;
	}

	/**
	 * Represents a raffle message
	 */
	export interface MessageRaffleData extends AbstractTwitchatMessage {
		type:"raffle";
		/**
		 * Contains the current raffle's data
		 */
		raffleData:RaffleData;
		/**
		 * Winning entry of the raffle
		 */
		winner:RaffleEntry;
	}

	/**
	 * Represents a bingo message
	 */
	export interface MessageBingoData extends AbstractTwitchatMessage {
		type:"bingo";
		/**
		 * User that won the bingo
		 */
		user:TwitchatUser;
		/**
		 * Contains the current bingo's data
		 */
		bingoData:BingoConfig;
	}

	/**
	 * Represents a countdown complete message
	 */
	export interface MessageCountdownData extends AbstractTwitchatMessage {
		type:"countdown";
		/**
		 * Countdown's data
		 */
		countdown:CountdownData;
	}

	/**
	 * Represents a timer message
	 */
	export interface MessageTimerData extends AbstractTwitchatMessage {
		type:"timer";
		/**
		 * true if timer is running
		 */
		started:boolean,
		/**
		 * Timer's data
		 */
		timer:TimerData;
	}

	/**
	 * Represents a notice message (which has multiple sub types)
	 */
	export interface MessageNoticeData extends AbstractTwitchatMessage {
		type:"notice";
		/**
		 * Notice type
		 */
		noticeId:TwitchatNoticeStringType;
		/**
		 * Notice message
		 */
		message:string;
	}

	/**
	 * Represents a message when autoban bans a user based on
	 * their login
	 */
	export interface MessageAutobanJoinData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"autoban_join";
		/**
		 * User that got banned
		 */
		user:TwitchatUser;
		/**
		 * Rule at the origin of the autoban
		 */
		rule:TwitchatDataTypes.AutomodParamsKeywordFilterData;
	}

	/**
	 * Represents info about a twitchat ad (updates, tips & tricks, ...)
	 */
	export interface MessageTwitchatAdData extends AbstractTwitchatMessage {
		type:"twitchat_ad";
		/**
		 * Type of ad
		 */
		adType:TwitchatAdStringTypes;
	}

	/**
	 * Represents a created clip pending publivation
	 */
	export interface MessageClipCreate extends AbstractTwitchatMessage {
		type:"clip_pending_publication" | "clip_creation_complete";
		/**
		 * Path to clip
		 */
		clipUrl:string;
		/**
		 * ID of the clip
		 */
		clipID:string;
		/**
		 * true if clip is still being created
		 */
		loading:boolean;
		/**
		 * true if clip creation failed
		 */
		error:boolean;
		/**
		 * Details about the clip
		 */
		clipData?:ClipInfo;
	}

	/**
	 * Represents a stream info update message 
	 */
	export interface MessageStreamInfoUpdate extends MessageNoticeData {
		noticeId:"stream_info_update";
		/**
		 * Stream title
		 */
		title:string;
		/**
		 * Stream category
		 */
		category:string;
	}

	/**
	 * Represents a mod/unmod/vip/unvip/ban/unban/timeout event
	 */
	export interface MessageModerationAction extends MessageNoticeData {
		/**
		 * User that got moderated
		 */
		user:TwitchatUser;
	}
	
	/**
	 * Represents a status change of the shield mode
	 */
	export interface MessageShieldMode extends MessageNoticeData {
		/**
		 * User that started/stoped the shield mod
		 */
		user:TwitchatUser;
		/**
		 * shieldmode state
		 */
		enabled:boolean;
	}

	/**
	 * Represents a user banned message
	 */
	export interface MessageBanData extends AbstractTwitchatMessage {
		type:"ban",
		channel_id: string;
		/**
		 * User that made the moderation action
		 */
		moderator?:TwitchatUser;
		/**
		 * Banned user
		 */
		user:TwitchatUser;
		/**
		 * Ban duration in seconds (if it's a timeout)
		 */
		duration_s?:number;
		/**
		 * Ban reason
		 */
		reason?:string;
	}

	/**
	 * Represents a user unbanned message
	 */
	export interface MessageUnbanData extends AbstractTwitchatMessage {
		type:"unban",
		channel_id: string;
		/**
		 * User that made the moderation action
		 */
		moderator:TwitchatUser;
		/**
		 * Unbaned user
		 */
		user:TwitchatUser;
	}

	/**
	 * Represents an emergency mode state change (enable or disable)
	 */
	export interface MessageEmergencyModeInfo extends MessageNoticeData{
		noticeId:"emergencyMode";
		/**
		 * Emergency state
		 */
		enabled:boolean;
	}

	/**
	 * Represents a chat alert message
	 * (when a user uses the !alert command)
	 */
	export interface MessageChatAlertData extends AbstractTwitchatMessage{
		type:"chat_alert";
		/**
		 * User's message (with chat command stripped out)
		 */
		message:MessageChatData;
	}

	/**
	 * Represents a music start data
	 */
	export interface MessageMusicStartData extends AbstractTwitchatMessage {
		type:"music_start";
		/**
		 * Info about the track that started playing
		 */
		track:MusicTrackData;
	}

	/**
	 * Represents a music stop data
	 */
	export interface MessageMusicStopData extends AbstractTwitchatMessage {
		type:"music_stop";
		/**
		 * Info about the track that stoped playing
		 */
		track:MusicTrackData|null;
	}

	/**
	 * Represents a music added to queue data
	 */
	export interface MessageMusicAddedToQueueData extends AbstractTwitchatMessage {
		type:"music_added_to_queue";
		/**
		 * Info about the track that's been added to the queue
		 */
		trackAdded?:MusicTrackData;
		/**
		 * User that added the track
		 */
		user?:TwitchatUser;
		/**
		 * Message the user sent to add the track
		 */
		message?:string;
		/**
		 * Trigger ID that executed the song request
		 */
		triggerIdSource?:string;
		/**
		 * If set, adding to queue failed.
		 * This contains the failure reason
		 */
		failCode?:undefined|"spotify_not_connected" | "wrong_url" | "max_duration" | "api" | "no_result" | "no_active_device";
		/**
		 * Textual reason for the failure
		 */
		failReason?:string;
		/**
		 * Maximum allowed duration by the trigger action that
		 * executed the track add
		 */
		maxDuration?:number;
		/**
		 * Search made to add a track
		 */
		search?:string;
	}

	/**
	 * Represents a voicemod voice change data
	 */
	export interface MessageVoicemodData extends AbstractTwitchatMessage {
		type:"voicemod";
		/**
		 * Voice ID that got enabled
		 */
		voiceID?:string;
	}

	/**
	 * Represents a shoutout data
	 */
	export interface MessageShoutoutData extends AbstractTwitchatMessage {
		type:"shoutout";
		/**
		 * true if we've been given a shoutout
		 * false if we gave a shoutout to someone
		 */
		received:boolean;
		/**
		 * Number of viewers that saw the shoutout
		 */
		viewerCount:number;
		/**
		 * Channel ID that made the shoutout or ID of the channel we gave a shoutout to
		 */
		channel_id:string;
		/**
		 * User that gave us a shoutout or user we gave a shoutout to
		 */
		user:TwitchatDataTypes.TwitchatUser;
		/**
		 * User that made the shoutout
		 */
		moderator:TwitchatDataTypes.TwitchatUser;
		/**
		 * Stream info of the channel that gave us a shoutout
		 */
		stream:{
			title: string;
			category: string;
		};
	}

	/**
	 * Represents a chat highlight message
	 */
	export interface MessageChatHighlightData extends AbstractTwitchatMessage {
		type:"chat_highlight";
		/**
		 * Details about the highlight
		 */
		info:ChatHighlightInfo;
	}

	/**
	 * Represents a followbot message
	 * When getting followboted, all follow events are merge into one
	 * single MessageFollowbotData
	 */
	export interface MessageFollowbotData extends AbstractTwitchatMessage {
		type:"followbot_list";
		/**
		 * Users being part of the followbot raid
		 */
		users:TwitchatUser[];
	}

	/**
	 * Represents a room settings message
	 * Sent on channel connexion to show current room's restrictions
	 */
	export interface MessageRoomSettingsData extends AbstractTwitchatMessage {
		type:"room_settings";
		/**
		 * Channel ID
		 */
		channel_id: string;
		/**
		 * Channel name (ex: durss)
		 */
		channel_name: string;
		/**
		 * Room's settings
		 */
		settings:IRoomSettings;
	}

	/**
	 * Represents a low trust user update
	 * Sent when monitoring, restricting, or removing monitoring/restriction
	 * on a user
	 */
	export interface MessageLowtrustTreatmentData extends AbstractTwitchatMessage {
		type:"low_trust_treatment";
		channel_id: string;
		/**
		 * User flaged as monitored or restrected
		 */
		user:TwitchatUser;
		/**
		 * true if user is now restricted from chatting
		 * all their messages will be pending for moderation
		 */
		restricted:boolean;
		/**
		 * true if user is now monitored.
		 * all their message will be displayed with a "suspicious" flag
		 */
		monitored:boolean;
		/**
		 * Moderator that made the change
		 */
		moderator:TwitchatUser;
	}

	/**
	 * Represents an OBS scene change event
	 */
	export interface MessageOBSSceneChangedData extends AbstractTwitchatMessage {
		type:"obs_scene_change";
		/**
		 * Name of the OBS scene we switched to
		 */
		sceneName:string;
		/**
		 * Name of the OBS scene we're coming from
		 */
		previousSceneName:string;
	}

	/**
	 * Represents an OBS source visibility change
	 */
	export interface MessageOBSSourceToggleData extends AbstractTwitchatMessage {
		type:"obs_source_toggle";
		/**
		 * Name of the source that's been toggled
		 */
		sourceName:string;
		/**
		 * Id of the source that's been toggled
		 */
		sourceItemId:number;
		/**
		 * true if the source is now visible
		 */
		visible:boolean;
	}

	/**
	 * Represents an OBS start stream event
	 */
	export interface MessageOBSStartStreamData extends AbstractTwitchatMessage {
		type:"obs_start_stream";
	}

	/**
	 * Represents an OBS stop stream event
	 */
	export interface MessageOBSStopStreamData extends AbstractTwitchatMessage {
		type:"obs_stop_stream";
	}

	/**
	 * Represents an OBS source filter visibility change
	 */
	export interface MessageOBSFilterToggleData extends AbstractTwitchatMessage {
		type:"obs_filter_toggle";
		/**
		 * Name of the parent source of the filter
		 */
		sourceName:string;
		/**
		 * Filter name
		 */
		filterName:string;
		/**
		 * true if the filter is now enabled
		 */
		enabled:boolean;
	}

	/**
	 * Represents an OBS input mute toggle
	 */
	export interface MessageOBSInputMuteToggleData extends AbstractTwitchatMessage {
		type:"obs_input_mute_toggle";
		/**
		 * Name of the input that's been toggled
		 */
		inputName:string;
		/**
		 * true if the input is now muted
		 */
		muted:boolean;
	}

	/**
	 * Represents an OBS media playback change event
	 */
	export interface MessageOBSPlaybackStateUpdateData extends AbstractTwitchatMessage {
		type:"obs_playback_state_update";
		/**
		 * Name of the source which playback started/ended
		 */
		inputName:string;
		/**
		 * true if the playback has started, false if it ended
		 */
		state:MessageOBSPlaybackStateValue;
	}
	export type MessageOBSPlaybackStateValue = "start"|"pause"|"complete"|"next"|"prev"|"restart";

	/**
	 * Represents a pinned message
	 */
	export interface MessagePinData extends AbstractTwitchatMessage {
		type:"pinned";
		/**
		 * User that pinned the message
		 */
		moderator:TwitchatUser;
		/**
		 * Message that got pinned
		 */
		chatMessage:MessageChatData;
		/**
		 * Timestamp when the message got pinned
		 */
		pinnedAt_ms: number;
		/**
		 * Timestamp when the pin config of the message got changed
		 */
		updatedAt_ms: number;
		/**
		 * Timestamp when the message got unpinned 
		 */
		unpinAt_ms: number;
		/**
		 * Just a store for the setTimeout() ref so we can clear it later when pin's config change
		 */
		timeoutRef?: number;
	}

	/**
	 * Represents an unpined message
	 */
	export interface MessageUnpinData extends AbstractTwitchatMessage {
		type:"unpinned";
		/**
		 * user that unpinned the message
		 */
		moderator?:TwitchatUser;
		/**
		 * Message that got unpinned
		 */
		chatMessage:MessageChatData;
	}

	/**
	 * Represents a stream start event
	 */
	export interface MessageStreamOnlineData extends AbstractTwitchatMessage {
		type:"stream_online";
		/**
		 * Current stream info
		 */
		info:StreamInfo;

	}

	/**
	 * Represents a stream stop event
	 */
	export interface MessageStreamOfflineData extends AbstractTwitchatMessage {
		type:"stream_offline";
		/**
		 * Current stream info
		 */
		info:StreamInfo;
	}

	/**
	 * Represents a counter value update
	 */
	export interface MessageCounterUpdateData extends AbstractTwitchatMessage {
		type:"counter_update";
		/**
		 * Counter's reference
		 */
		counter:CounterData;
		/**
		 * Value added to the counter
		 */
		added:number;
		/**
		 * Absolute value added to the counter
		 */
		added_abs:number;
		/**
		 * Current value of the counter
		 */
		value:number;
		/**
		 * true if the counter reached its max value
		*/
		maxed:boolean;
		/**
		 * true if the counter reached its min value
		 */
		mined:boolean;
		/**
		 * true if the counter reached its min or max and got looped to the other limit
		 */
		looped:boolean;
		/**
		 * User that made the counter update
		 */
		user?:TwitchatUser;
	}

	/**
	 * Represents a Value object update
	 */
	export interface MessageValueUpdateData extends AbstractTwitchatMessage {
		type:"value_update",
		/**
		 * Value object updated
		 */
		value:ValueData,
		/**
		 * New value
		 */
		newValue:string;
		/**
		 * Old value
		 */
		oldValue:string;
	}

	/**
	 * Represents an outgoing raid
	 */
	export interface MessageRaidStartData extends AbstractTwitchatMessage {
		type:"raid_started";
		/**
		 * User that's being raided
		 */
		user:TwitchatUser;
	}

	/**
	 * Represents an on-chat scope request
	 */
	export interface MessageScopeRequestData extends AbstractTwitchatMessage {
		type:"scope_request";
		/**
		 * Twitch scopes to request
		 */
		twitch_scopes:TwitchScopesString[];
	}

	/**
	 * Represents a "marker created" message
	 */
	export interface MessageMarkerCreatedData extends MessageNoticeData {
		/**
		 * User that created the marker
		 */
		user:TwitchatUser;
	}

	/**
	 * Represents a user watch streak
	 */
	export interface MessageWatchStreakData extends GreetableMessage, TranslatableMessage {
		type:"user_watch_streak";
		/**
		 * User that created the marker
		 */
		user:TwitchatUser;
		/**
		 * Number of consecutive streams the user watched
		 */
		streak:number;
		/**
		 * Number of channel points earned
		 */
		channelPointsEarned:number;
		/**
		 * Text message content
		 */
		message?:string;
		/**
		 * Message splitted by chunks types (text, url and emote)
		 */
		message_chunks?:ParseMessageChunk[];
		/**
		 * Message content as HTML
		 * All emotes are replaced by HTML tags
		 */
		message_html?:string;
		/**
		 * @see MergeableMessage
		 */
		message_size:number;
	}

	/**
	 * Represents a hype chat message
	 * These messages are also sent as standard messages
	 */
	export interface MessageHypeChatData extends AbstractTwitchatMessage {
		type:"hype_chat";
		/**
		 * User that created the marker
		 */
		message:MessageChatData;
	}

	/**
	 * Represents a hype chat message
	 * These messages are also sent as standard messages
	 */
	export interface MessageHeatClickData extends AbstractTwitchatMessage {
		type:"heat_click";
		channel_id: string;
		/**
		 * User that clicked.
		 * "null" for anonymous users
		 */
		user:Pick<TwitchatDataTypes.TwitchatUser, "channelInfo" | "id" | "login"> | null;
		/**
		 * Is it an anonymous user?
		 */
		anonymous:boolean;
		/**
		 * Is CTRL key pressed
		 */
		ctrl:boolean;
		/**
		 * Is SHIFT key pressed
		 */
		shift:boolean;
		/**
		 * Is ALT key pressed
		 */
		alt:boolean;
		/**
		 * Coordinates of the click in percent (0-100)
		 */
		coords:{x:number, y:number};
		/**
		 * Clicked area ID
		 */
		areaId?:string;
		/**
		 * Clicked OBS source
		 */
		obsSource?:string;
	}

	/**
	 * Represents a GoXLR button press/release
	 */
	export interface MessageGoXLRButtonData extends AbstractTwitchatMessage {
		type:"goxlr_button";
		/**
		 * Button pressed/released
		 */
		button:GoXLRTypes.ButtonTypesData;
		/**
		 * Is button pressed ?
		 */
		pressed:boolean;
	}

	/**
	 * Represents a GoXLR FX state change
	 */
	export interface MessageGoXLRFXEnableChangeData extends AbstractTwitchatMessage {
		type:"goxlr_fx_state";
		/**
		 * Is button pressed ?
		 */
		enabled:boolean;
		/**
		 * Enabled/disabled FX index (0->5)
		 */
		fxIndex:number;
	}

	/**
	 * Represents a GoXLR sample playback complete
	 */
	export interface MessageGoXLRSampleCompleteData extends AbstractTwitchatMessage {
		type:"goxlr_sample_complete";
		/**
		 * Active bank when starting the sample
		 */
		bank:Extract<GoXLRTypes.ButtonTypesData, "SamplerSelectA" | "SamplerSelectB" | "SamplerSelectC">;
		/**
		 * Sampler button that started the sample
		 */
		buttonId:Extract<GoXLRTypes.ButtonTypesData, "SamplerTopLeft"|"SamplerTopRight"|"SamplerBottomLeft"|"SamplerBottomRight">;
	}

	/**
	 * Represents a GoXLR fader mute/unmute action
	 */
	export interface MessageGoXLRSoundInputData extends AbstractTwitchatMessage {
		type:"goxlr_sound_input";
		/**
		 * Is channel muted ?
		 */
		mute:boolean;
		/**
		 * Muted/unmuted fader index (1 -> 4)
		 */
		faderIndex:1|2|3|4;
	}

	/**
	 * Represents a splitter between preloaded messages from IndexedDB and current session messages
	 */
	export interface MessageHistorySplitterData extends AbstractTwitchatMessage {
		type:"history_splitter";
	}

	/**
	 * Represents an ad break started manually
	 */
	export interface MessageAdBreakStartData extends AbstractTwitchatMessage {
		type:"ad_break_start" | "ad_break_start_chat";
		/**
		 * Ad duration in seconds
		 */
		duration_s:number;
		/**
		 * User that started the ad break if not started automatically
		 */
		startedBy?:TwitchatUser;
	}

	/**
	 * Represents an ad break approaching
	 */
	export interface MessageAdBreakApproachingData extends AbstractTwitchatMessage {
		type:"ad_break_approaching";
		/**
		 * Date in milliseconds the ad will start
		 */
		start_at:number;
		/**
		 * Delay in milliseconds before ad break
		 */
		delay_ms:number;
	}

	/**
	 * Represents an ad break completing
	 */
	export interface MessageAdBreakCompleteData extends AbstractTwitchatMessage {
		type:"ad_break_complete";
		/**
		 * Duration of the ad in seconds
		 */
		duration_s:number;
		/**
		 * User that started the ad break if not started automatically
		 */
		startedBy?:TwitchatUser;
	}

	/**
	 * Represents a custom message sent via API
	 */
	export interface MessageCustomData extends AbstractTwitchatMessage {
		type:"custom";
		/**
		 * User name
		 */
		user?:{
			name:string,
			color?:string
		};
		/**
		 * Message sent
		 */
		message?:string;
		/**
		 * Option quote displayed in a dedicated holder
		 */
		quote?:string;
		/**
		 * Message sent (raw chunks)
		 */
		message_chunks?:ParseMessageChunk[];
		/**
		 * Quote (raw chunks)
		 */
		quote_chunks?:ParseMessageChunk[];
		/**
		 * Message sent (html parsed)
		 */
		message_html?:string;
		/**
		 * Quote (html parsed)
		 */
		quote_html?:string;
		/**
		 * Icon ID
		 */
		icon?:string;
		/**
		 * Optional highlight color
		 */
		highlightColor?:string;
		/**
		 * Message style
		 */
		style?:"message"|"highlight"|"error";
		/**
		 * CTAs to add on the message
		 */
		actions?:{
			id?:string;
			/**
			 * Button's icon
			 */
			icon?:string;
			/**
			 * Button's label
			 */
			label:string,
			/**
			 * Type of action to executee
			 */
			actionType?:"url"|"trigger"|"message"|"discord",
			/**
			 * Target to open URL to (_blank, _self, ...)
			 */
			urlTarget?:string,
			/**
			 * URL to open in a new tab for "url" type.
			 */
			url?:string,
			/**
			 * Trigger ID to execute for "trigger" type.
			 */
			triggerId?:string,
			/**
			 * Message to send on chat for "message" type.
			 */
			message?:string,
			/**
			 * Button's style
			 */
			theme?:"primary"|"secondary"|"alert"|""|"default"|"light",
			/**
			 * Placeholder to store any data that will be sent in PSOT to the discord endpoint
			 */
			data?:any,
		}[];
	}

	export type MessageCustomDataAPI = Pick<TwitchatDataTypes.MessageCustomData, "actions" | "col" | "style" | "highlightColor" | "icon" | "message" | "user" | "quote">

	/**
	 * Represents a Q&A session start
	 */
	export interface MessageQnaStartData extends AbstractTwitchatMessage {
		type:"qna_start";
		/**
		 * Q&A session data
		 */
		qnaSession:QnaSession;
	}
	
	/**
	 * Represents a Q&A session i stopped.
	 * Stopping is when we chose to stop accepting entries
	 */
	export interface MessageQnaStopData extends AbstractTwitchatMessage {
		type:"qna_stop";
		/**
		 * Q&A session data
		 */
		qnaSession:QnaSession;
	}
	
	/**
	 * Represents a Q&A session deletion.
	 * When destroying a Q&A session
	 */
	export interface MessageQnaDeleteData extends AbstractTwitchatMessage {
		type:"qna_delete";
		/**
		 * Q&A session data
		 */
		qnaSession:QnaSession;
	}
	
	/**
	 * Represents a encing credits that completed
	 */
	export interface MessageCreditsCompleteData extends AbstractTwitchatMessage {
		type:"credits_complete";
	}

}