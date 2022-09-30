import type { RaffleData, WheelItem } from "@/utils/CommonDataTypes";
import type { PubSubDataTypes } from "@/utils/PubSubDataTypes";
import type { TriggerScheduleTypes, TriggerTypesValue } from "@/utils/TriggerActionData";
import type { ChatUserstate } from "tmi.js";

export namespace TwitchatDataTypes {

	export type ChatPlatform = "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook";
	
	export const ParamsContentType = {
		MAIN_MENU: "",
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
		twitchatAd:BotMessageEntry;
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
		publicDonation:ParameterData;
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
		actions:TriggerActionTypes[];
		name?:string;
		prevKey?:string;
		permissions?:PermissionsData;
		cooldown?:{global:number, user:number};
		scheduleParams?:TriggerScheduleData;
		/**
		 * @deprecated Only here for typings on data migration. User "name" property
		 */
		chatCommand?:string
	}


	export type TriggerScheduleTypesValue = typeof TriggerScheduleTypes[keyof typeof TriggerScheduleTypes];

	export interface TriggerScheduleData {
		type:TriggerScheduleTypesValue|"0";
		repeatDuration:number;
		repeatMinMessages:number;
		dates:{daily:boolean, yearly:boolean, value:string}[];
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
		TIMER: 2,
		TWITCHAT: 3,
		USER: 4,
		SUBITS: 5,
		MOD: 6,
		HYPETRAIN: 7,
		GAMES: 8,
		MUSIC: 9,
	} as const;
	export type TriggerEventTypeCategoryValue = typeof TriggerEventTypeCategories[keyof typeof TriggerEventTypeCategories];
	export interface TriggerEventTypes extends ParameterDataListValue {
		category:TriggerEventTypeCategoryValue;
		label:string;
		value:TriggerTypesValue|"0";
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
		numberValue?:number;
		emoteValue?:{[key in ChatPlatform]:{
			code:string,
			image:TwitchatImage,
		}|undefined};
		winners?:TwitchatDataTypes.TwitchatUser[];
	}

	export interface ChatSuggestionData {
		command:string;
		startTime:number;
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
		is_new_record:boolean;
	}

	export interface CommandData {
		id:string;
		cmd:string;
		alias:string;
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
		NONE:-1,
		SPONSOR:1,
		UPDATES:2,
		TIP_AND_TRICK:3,
		DISCORD:4,
		UPDATE_WARNING:5,
		TWITCHAT_AD_WARNING:6,
		TWITCHAT_SPONSOR_PUBLIC_PROMPT:7,
	} as const;
	export type TwitchatAdStringTypes = typeof TwitchatAdTypes[keyof typeof TwitchatAdTypes]|null;

	export interface InstallHandler extends Event {
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
		type?:"chatOverlayHighlight",
		message?:string,
		user?:TwitchatDataTypes.TwitchatUser,
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
		message:MessageChatData,
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
		user:TwitchatDataTypes.TwitchatUser;
		stream:{
			title: string;
			category: string;
		};
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

	export interface Pronoun {
		id: string;
		login: string;
		pronoun_id: string
	}

	export interface ConfirmData {
		title:string,
		description?:string,
		confirmCallback?:()=>void,
		cancelCallback?:()=>void,
		yesLabel?:string,
		noLabel?:string,
		STTOrigin?:boolean,
	}




	//The following should be on TwitchatDataTypes.ts but as it's using a ref to
	//ActivityFeedData from here, and this class is using a reference to TwitchatDataTypes,
	//if these types were on TwitchatDataTypes.ts we would get a circular dependency issue.
	//The only way to fix these circular import issues would be to have ALL types declared
	//on one single file. But i'd rather not do that.
	export const TwitchatMessageType = {
		BAN:"ban",
		RAID:"raid",
		POLL:"poll",
		JOIN:"join",
		LEAVE:"leave",
		CHEER:"cheer",
		TIMER:"timer",
		BINGO:"bingo",
		RAFFLE:"raffle",
		REWARD:"reward",
		NOTICE:"notice",
		MESSAGE:"message",
		TIMEOUT:"timeout",
		WHISPER:"whisper",
		FOLLOWING:"following",
		COUNTDOWN:"countdown",
		CLEAR_CHAT:"clear_chat",
		DISCONNECT:"disconnect",
		PREDICTION:"prediction",
		TWITCHAT_AD:"twitchatAd",
		SUBSCRIPTION:"subscription",
		AUTOBAN_JOIN:"autoban_join",
		HYPE_TRAIN_SUMMARY:"hype_train_summary",
		HYPE_TRAIN_COOLED_DOWN:"hype_train_cooled_down",
		COMMUNITY_BOOST_COMPLETE:"community_boost_complete",
		COMMUNITY_CHALLENGE_CONTRIBUTION:"community_challenge_contribution",
	} as const;

	//Dynamically type TwitchatMessageStringType from TwitchatMessageType values
	export type TwitchatMessageStringType = typeof TwitchatMessageType[keyof typeof TwitchatMessageType]|null;


	export const TwitchatNoticeType = {
		TTS:"tts",
		ONLINE:"online",
		OFFLINE:"offline",
		UNNKNOWN:"unknown",
		CLEAR_CHAT:"clearChat",
		TIMEOUT:"timeout",
		UNTIMEOUT:"untimeout",
		BAN:"ban",
		UNBAN:"unban",
		MOD:"mod",
		UNMOD:"unmod",
		VIP:"vip",
		UNVIP:"unvip",
		MESSAGE_DELETE:"messageDelete",
		EMERGENCY_MODE:"emergencyMode",
		COMMERCIAL_ERROR:"commercialError",
		COMMERCIAL_START:"commercialStart",
		COMMERCIAL_COMPLETE:"commercialComplete",
		BROADCAST_SETTINGS_UPDATE:"broadcastSettingsUpdate",
		DEVMODE:"devMode",
	}
	export type TwitchatNoticeStringType = typeof TwitchatNoticeType[keyof typeof TwitchatNoticeType]|null;


	//NEW DATA TYPES FOR FULL REFACTOR

	export interface AbstractTwitchatMessage {
		type:TwitchatMessageStringType;
		id: string;
		date: number;
		platform:ChatPlatform;
	}

	export interface TwitchatImage {
		sd:string;
		hd?:string;
	}

	export interface TwitchatUser {
		platform:ChatPlatform;
		login:string;
		displayName:string;
		greeted:boolean;
		online:boolean;
		color?:string;
		avatarPath?:string;
		id:string;
		is_following?:boolean;
		is_blocked?:boolean;
		is_banned?:boolean;
		is_vip?:boolean;
		is_moderator?:boolean;
		is_broadcaster?:boolean;
		is_subscriber?:boolean;
		is_gifter?:boolean;
		pronouns?:string|false;
		badges?:TwitchatUserBadge[];
		temporary?:boolean;//true when the details are loading
	}

	export interface TwitchatUserBadge {
		icon:TwitchatImage;
		id:string;
		title?:string;
	}

	export type ChatMessageTypes = MessageChatData |
									MessageWhisperData |
									MessagePollData |
									MessagePredictionData |
									MessageFollowingData |
									MessageSubscriptionData |
									MessageCheerData |
									MessageRewardRedeemData |
									MessageCommunityChallengeContributionData |
									MessageHypeTrainSummaryData |
									MessageHypeTrainCooledDownData |
									MessageCommunityBoostData |
									MessageRaidData |
									MessageJoinData |
									MessageLeaveData |
									messageBanData |
									MessageTimeoutData |
									MessageClearChatData |
									MessageRaffleData |
									MessageBingoData |
									MessageCountdownData |
									MessageAutobanJoinData |
									MessageTwitchatAdData |
									MessageTimerData |
									MessageNoticeData
	;

	export interface MessageChatData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"message";
		user: TwitchatUser;
		message:string;
		message_html:string;
		
		todayFirst?: boolean;
		automod?: AutomodParamsKeywordFilterData;
		answersTo?: MessageChatData;
		answers?: MessageChatData[];
		cyphered?: boolean;
		markedAsRead?:boolean;
		deleted?: boolean;
		deletedData?: {
			deleter:TwitchatUser;
		};
		occurrenceCount?: number;
		highlightWord?: string;
		hasMention?: boolean;
		spoiler?: boolean;
		
		twitch_automod?: TwitchatDataTypes.AutomodData;
		twitch_isSlashMe?:boolean;
		twitch_isFirstMessage?:boolean;
		twitch_isReturning?:boolean;
		twitch_isPresentation?:boolean;
		twitch_isLowTrust?: boolean;//True when user is flagged as suspicious
		twitch_isHighlighted?: boolean;//True when using "hihglight my message" reward
		twitch_announcementColor?: "primary" | "purple" | "blue" | "green" | "orange";//Announcement color
	}

	export interface MessageWhisperData extends AbstractTwitchatMessage {
		type:"whisper";
		user: TwitchatUser;
		to: TwitchatUser;
		message:string;
		message_html:string;
		occurrenceCount?: number;
		markedAsRead?:boolean;
		cyphered?: boolean;
	}

	export interface MessagePollDataChoice {
		id: string;
		label: string;
		votes: number;
	}
	export interface MessagePollData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"poll";
		title: string;
		choices: MessagePollDataChoice[];
		duration_s: number;
		started_at: string;
		ended_at?: string;
	}


	export interface MessagePredictionDataOutcome {
		id: string;
		label: string;
		votes: number;
		voters: TwitchatUser[];
	}
	export interface MessagePredictionData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"prediction";
		title: string;
		duration_s: number;
		outcomes: MessagePredictionDataOutcome[];
		pendingAnswer: boolean;
		started_at: number;
		ended_at?: number;
		winning_outcome_id?: string;
	}

	export interface MessageFollowingData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"following";
		user:TwitchatUser;
		followed_at: number;
		automod?: AutomodParamsKeywordFilterData;
		blocked?:boolean;//If twitchat's automod strikes
	}

	export interface MessageSubscriptionData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"subscription";
		user: TwitchatUser;//User subscribing or gifting the sub
		tier: 1|2|3|"prime";
		is_gift: boolean;
		is_giftUpgrade: boolean;
		is_resub: boolean;
		gift_upgradeSender?: TwitchatUser;
		gift_recipients?: TwitchatUser[];
		months:number;//Number of months the user subscribed for
		streakMonths:number;//Number of consecutive months the user has been subscribed for
		totalSubDuration:number;//Number of months the user has been subscribed for
		message?:string;
		message_html?:string;
	}

	export interface MessageCheerData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"cheer";
		bits: number;
		user: TwitchatUser;
		message: string;
		message_html: string;
	}

	export interface MessageRewardRedeemData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"reward";
		user: TwitchatUser;
		reward: {
			title:string;
			cost:number;
			description:string;
			icon:TwitchatImage;
		};
		message?:string;
		message_html?:string;
	}

	export interface MessageCommunityChallengeContributionData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"community_challenge_contribution";
		user: TwitchatUser;
		contribution: number;
		stream_contribution?:number;//This user's stream contribution
		total_contribution?:number;//this user's total contribution
		challenge: {
			title:string;
			goal:number;
			progress:number;
			description?:string;
			icon?:TwitchatImage;
		}
	}

	export interface MessageHypeTrainSummaryData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"hype_train_summary";
		train: HypeTrainStateData;
		activities: (MessageSubscriptionData|MessageCheerData)[];
	}

	export interface MessageHypeTrainCooledDownData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"hype_train_cooled_down";
	}

	export interface MessageCommunityBoostData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"community_boost_complete";
		viewers:number;
	}

	export interface MessageRaidData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"raid";
		user:TwitchatUser;
		viewers:number;
	}

	export interface MessageJoinData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"join";
		users:TwitchatUser[];
	}

	export interface MessageLeaveData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"leave";
		users:TwitchatUser[];
	}

	export interface messageBanData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"ban";
		user:TwitchatUser;
		reason:string;
	}

	export interface MessageTimeoutData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"timeout";
		user:TwitchatUser;
		reason:string;
		duration_s:number;
	}

	export interface MessageClearChatData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"clear_chat";
	}

	export interface MessageRaffleData extends AbstractTwitchatMessage {
		type:"raffle";
		raffleData:RaffleData;
	}

	export interface MessageBingoData extends AbstractTwitchatMessage {
		type:"bingo";
		user:TwitchatUser;
		bingoData:BingoConfig;
	}

	export interface MessageCountdownData extends AbstractTwitchatMessage {
		type:"countdown";
		data:CountdownData;
	}

	export interface MessageTimerData extends AbstractTwitchatMessage {
		type:"timer";
		started:boolean,
		startAt:number;
		duration?:number;
	}

	export interface MessageNoticeData extends AbstractTwitchatMessage {
		channel_id?: string;
		type:"notice";
		noticeId:TwitchatNoticeStringType;
		message:string;
	}

	export interface MessageAutobanJoinData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"autoban_join";
		user:TwitchatUser;
		rule:TwitchatDataTypes.AutomodParamsKeywordFilterData;
	}

	export interface MessageTwitchatAdData extends AbstractTwitchatMessage {
		type:"twitchatAd";
		adType:TwitchatAdStringTypes;
	}












	

	export interface RaidInfo {
		channel_id: string;
		user:TwitchatUser;
		viewerCount: number;
		startedAt:number;
		timerDuration_s:number;
	}

	export interface CommunityBoost {
		channel_id: string;
		goal:number;
		progress:number;
	}

	export interface AutomodData {
		reasons:string[];
	}
}