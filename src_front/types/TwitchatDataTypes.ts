import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";

export namespace TwitchatDataTypes {

	export type ChatPlatform = "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook";
	
	export type ModalTypes = "" | "search" | "gngngn" | "poll" | "chatpoll" | "raffle" | "pred" | "bingo" | "liveStreams" | "streamInfo" | "TTuserList" | "pins" | "timer" | "updates" | "triggersLogs" | "login";

	/**
	 * Parameters menue categories
	 */
	export const ParamsCategories = {
		MAIN_MENU: "",
		APPEARANCE: "appearance",
		ACCOUNT: "account",
		ABOUT: "about",
		FEATURES: "features",
		OBS: "obs",
		SPONSOR: "sponsor",
		STREAMDECK: "streamdeck",
		TRIGGERS: "triggers",
		COUNTERS: "counters",
		OVERLAYS: "overlays",
		EMERGENCY: "emergency",
		SPOILER: "spoiler",
		ALERT: "alert",
		TTS: "tts",
		VOICE: "voice",
		AUTOMOD: "automod",
		VOICEMOD: "voicemod",
	} as const;
	export type ParamsContentStringType = typeof ParamsCategories[keyof typeof ParamsCategories];

	/**
	 * Contains info about a counter
	 */
	export interface CounterData {
		id:string;
		name:string;
		value:number;
		min:number|false;
		max:number|false;
		loop:boolean;
		perUser:boolean;
		users?:{[key:string]:number};
	}

	/**
	 * Contains config about a chat column
	 */
	export interface ChatColumnsConfig {
		id:string;
		order:number;
		size:number;
		liveLockCount:number
		filters:{[key in typeof MessageListFilterTypes[number]]:boolean};
		//Specific sub filters for chat messages
		messageFilters:ChatColumnsConfigMessageFilters;
		commandsBlockList:string[];
		userBlockList:string[];
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
	}
	export interface BotMessageEntry {
		enabled:boolean;
		message:string;
	}
	export type BotMessageField = keyof IBotMessage;

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
		appearance:{[key:string]:ParameterData};
		features:{[key:string]:ParameterData};
	}
	export type ParameterCategory = keyof IParameterCategory;

	/**
	 * Account params types
	 */
	export interface IAccountParamsCategory {
		syncDataWithServer:ParameterData;
		publicDonation:ParameterData;
	}
	export type AccountParamsCategory = keyof IAccountParamsCategory;

	/**
	 * OBS chat command scene control
	 */
	export interface OBSSceneCommand {
		scene:{
			sceneIndex:number;
			sceneName:string;
		}
		command:string;
	}

	/**
	 * OBS chat command mute control
	 */
	export interface OBSMuteUnmuteCommands {
		audioSourceName:string;
		muteCommand:string;
		unmuteCommand:string;
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
		SUSPICIOUS_USER: "suspiciousUser",
		RESTRICTED_USER: "restrictedUser",
		EMERGENCY_BLOCKED: "emergencyBlocked",
	} as const;
	export type MessageBadgeDataStringType = typeof MessageBadgeDataType[keyof typeof MessageBadgeDataType];
	export interface MessageBadgeData {
		type:MessageBadgeDataStringType;
		label?:string;
		tooltip?:string;
	}

	/**
	 * Data that populates ParamItem components
	 */
	export interface ParameterData {
		id?:number;
		type:"toggle"|"slider"|"number"|"text"|"password"|"list"|"browse"|"editablelist";
		value:boolean|number|string|string[]|undefined;
		listValues?:ParameterDataListValue[];
		options?:string[];//List options for "editablelist"
		longText?:boolean;
		noInput?:boolean;//Disable input to only keep title (used for shoutout param)
		label?:string;
		labelKey?:string;//Label (i18n key). Concatenated to "label" if defined
		min?:number;//min numeric value
		max?:number;//max numeric value
		step?:number;//For numeric values
		maxLength?:number;
		icon?:string;
		iconURL?:string;
		placeholder?:string;//Placeholder for the input
		placeholderKey?:string;//i18n key for the placeholder of the input 
		placeholderList?:PlaceholderEntry[];//creates clickable {XXX} placeholders
		parent?:number;
		example?:string;//Displays an icon with a tooltip containing the specified image example
		storage?:unknown;//Just a field to allow storage of random data if necessary
		children?:ParameterData[];
		accept?:string;//File types for browse inputs
		fieldName?:string;//INput's "name" attribute
		save?:boolean;//Save configuration to storage on change?
		twitch_scopes?:TwitchScopesString[];//Twitch scope necessary for this feature. Will disable the component if scope isn't granted
		tooltip?:string;//Tooltip displayed on hover
		tooltipKey?:string;//Tooltip displayed on hover (i18n key)
		disabled?:boolean;//Disable possibility to change the value
		editCallback?:(data:any) => void;//Callback called when value is changed (if v-model can't be used)
	}
	export interface ParameterDataListValue {
		label?:string;
		labelKey?:string;
		value:string | number | boolean | undefined;
		icon?:string;
		[parameter: string]: unknown;
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
		mode:"chat"|"sub"|"manual";
		command?:string;
		reward_id?:string;
		duration_s:number;
		maxEntries:number;
		created_at:number;
		entries:RaffleEntry[];
		vipRatio:number;
		followRatio:number;
		subRatio:number;
		subgiftRatio:number;
		subMode_includeGifters:boolean;
		subMode_excludeGifted:boolean;
		showCountdownOverlay:boolean;
		customEntries:string;
		winners?:RaffleEntry[];
		/**
		 * @deprectaed use duration_s instead. Only hear for typing on data migration
		 */
		duration?:number;
	}
	export interface RaffleEntry extends EntryItem {
		score:number;
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
		details:string;
		needChannelPoints?:boolean;
		needTTS?:boolean;
		needAdmin?:boolean;
		needModerator?:boolean,
		twitchCmd?:boolean,
		twitch_scope?:TwitchScopesString,
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
		example?:string;
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
		/**
		 * @deprecated Only here for typings on data migration. Removed in favor of the new "tags" prop
		 */
		tagIDs?: string[];
	}

	export interface StreamInfo {
		user:TwitchatUser;
		title:string;
		category:string;
		tags:string[];
		started_at:number;
	}
	export type StreamInfoKeys = keyof StreamInfo;

	/**
	 * Contains info about a countdown
	 */
	export interface CountdownData {
		startAt:string;
		startAt_ms:number;
		endAt?:string;
		endAt_ms?:number;
		duration:string;
		duration_ms:number;
		timeoutRef:number;
	}

	/**
	 * Contains info about a timer
	 */
	export interface TimerData {
		startAt:string;
		startAt_ms:number;
		endAt?:string;
		endAt_ms?:number;
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
		SPONSOR:1,
		UPDATES:2,
		TIP_AND_TRICK:3,
		DISCORD:4,
		UPDATE_WARNING:5,
		TWITCHAT_AD_WARNING:6,
		TWITCHAT_SPONSOR_PUBLIC_PROMPT:7,
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
	}

	/**
	 * Represents a user
	 */
	export interface TwitchatUser {
		id:string;
		platform:ChatPlatform;
		login:string;
		displayName:string;
		color?:string;//Chat color of their nickname
		avatarPath?:string;
		is_raider:boolean;//Is the user raided use recently
		is_partner:boolean;//Is Twitch partner
		is_affiliate:boolean;//Is Twitch affiliat
		is_tracked:boolean;
		is_bot:boolean;
		is_admin?:boolean;
		donor:{//Donor state of the user
			state:boolean,
			level:number,
			noAd:boolean,//True if user is exempt from ads (ex: if to few followers)
			upgrade:boolean,//true if donor level changed from last time
		};
		pronouns:string|false|null;//undefined=no loaded yet; false=no pronouns found; string=pronouns loaded
		pronounsLabel:string|false;
		pronounsTooltip:string|false;
		channelInfo:{[key:string]:UserChannelInfo},
		temporary?:boolean;//true when the details are loading
		errored?:boolean;//true if user data loading failed
	}

	/**
	 * Represents a channel specific user data
	 */
	export interface UserChannelInfo {
		online:boolean;
		is_following:boolean|null;
		is_blocked:boolean;
		is_banned:boolean;
		is_vip:boolean;
		is_moderator:boolean;
		is_broadcaster:boolean;
		is_subscriber:boolean;
		is_gifter:boolean;
		following_date_ms:number;
		badges:TwitchatUserBadge[];
		banEndDate?:number;
		lastActivityDate?:number;
		totalSubgifts?:number;
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
	 * Represents a change log encry
	 */
	export interface ChangelogEntry {
		l:string;//label
		i?:string;//icon name
		g?:string;//image path for highlights
		v?:string;//video path for highlights
		d?:string;//Description for highlights
		a?:{
			l:string;//label of the button
			a?:string;//aria-label value of the button
			page?:TwitchatDataTypes.ParamsContentStringType;//Parameter page to go to
			param?:TwitchatDataTypes.ParamsContentStringType;//Parameter page to go to
		}
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
		FOLLOWING:"following",
		COUNTDOWN:"countdown",
		CLEAR_CHAT:"clear_chat",
		CHAT_ALERT:"chat_alert",
		DISCONNECT:"disconnect",
		PREDICTION:"prediction",
		MUSIC_STOP:"music_stop",
		MUSIC_START:"music_start",
		TWITCHAT_AD:"twitchat_ad",
		RAID_STARTED:"raid_started",
		SUBSCRIPTION:"subscription",
		AUTOBAN_JOIN:"autoban_join",
		SCOPE_REQUEST:"scope_request",
		ROOM_SETTINGS:"room_settings",
		STREAM_ONLINE:"stream_online",
		STREAM_OFFLINE:"stream_offline",
		CHAT_HIGHLIGHT:"chat_highlight",
		FOLLOWBOT_LIST:"followbot_list",
		COUNTER_UPDATE:"counter_update",
		HYPE_TRAIN_START:"hype_train_start",
		OBS_SCENE_CHANGE:"obs_scene_change",
		OBS_SOURCE_TOGGLE:"obs_source_toggle",
		HYPE_TRAIN_CANCEL:"hype_train_cancel",
		HYPE_TRAIN_SUMMARY:"hype_train_summary",
		HYPE_TRAIN_PROGRESS:"hype_train_progress",
		HYPE_TRAIN_COMPLETE:"hype_train_complete",
		LOW_TRUST_TREATMENT:"low_trust_treatment",
		MUSIC_ADDED_TO_QUEUE:"music_added_to_queue",
		HYPE_TRAIN_APPROACHING:"hype_train_approaching",
		HYPE_TRAIN_COOLED_DOWN:"hype_train_cooled_down",
		CLIP_PENDING_PUBLICATION:"clip_pending_publication",
		COMMUNITY_BOOST_COMPLETE:"community_boost_complete",
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
		raffle:true,
		reward:true,
		notice:true,
		pinned:true,//Don't set it to false! we need to find it back when unpinning a message
		message:true,
		whisper:true,
		connect:true,
		shoutout:true,
		unpinned:true,
		voicemod:false,
		following:true,
		countdown:true,
		clear_chat:true,
		disconnect:true,
		prediction:true,
		chat_alert:false,
		music_stop:false,
		twitchat_ad:true,
		music_start:false,
		subscription:true,
		autoban_join:true,
		raid_started:false,
		room_settings:true,
		stream_online:true,
		scope_request:true,
		followbot_list:true,
		stream_offline:true,
		chat_highlight:false,//Used for "highlight on overlay" events
		counter_update:false,
		hype_train_start:false,
		obs_scene_change:false,
		obs_source_toggle:false,
		hype_train_cancel:false,
		hype_train_summary:true,
		low_trust_treatment:true,
		hype_train_progress:false,
		hype_train_complete:false,
		music_added_to_queue:false,
		hype_train_cooled_down:true,
		hype_train_approaching:false,
		clip_pending_publication:true,
		community_boost_complete:true,
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
		DEVMODE:"devMode",//When enabling/disabling devmode via "/devmode" command
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
									| MessageRoomSettingsData
									| MessageStreamOnlineData
									| MessageStreamOfflineData
									| MessageCounterUpdatesData
									| MessageUnpinData
									| MessageClipCreate
									| MessageRaidStartData
									| MessagePinData
									| MessageScopeRequestData
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
		TwitchatMessageType.COUNTDOWN,
		TwitchatMessageType.PREDICTION,
		TwitchatMessageType.TWITCHAT_AD,
		TwitchatMessageType.SUBSCRIPTION,
		TwitchatMessageType.STREAM_ONLINE,//also works for STREAM_OFFLINE
		TwitchatMessageType.HYPE_TRAIN_SUMMARY,
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
		platform:ChatPlatform;
		deleted?:boolean;
		fake?:boolean;
		col?:number;//Use this to send a message on a specific column index
	}

	export interface GreetableMessage extends AbstractTwitchatMessage {
		todayFirst?: boolean;
		channel_id:string;
		user:TwitchatUser;
	}

	/**
	 * A regular user's message 
	 */
	export interface MessageChatData extends GreetableMessage {
		channel_id: string;
		type:"message";
		user: TwitchatUser;
		message:string;
		message_html:string;
		message_no_emotes:string;
		answers: MessageChatData[];
		is_short: boolean;//true if message is short or contains mostly emotes
		is_pinned?: boolean;
		
		
		automod?: AutomodParamsKeywordFilterData;
		answersTo?: MessageChatData;
		cyphered?: boolean;
		deletedData?: {
			deleter:TwitchatUser;
		};
		occurrenceCount?: number;
		hasMention?: boolean;
		spoiler?: boolean;
		bypassBotFilter?: boolean;//used so messages sent by extensions are displayed
		elevatedInfo?:{duration_s:number, amount:number};
		
		twitch_automod?: AutomodData;
		twitch_isSlashMe?:boolean;
		twitch_isFirstMessage?:boolean;//True if first message ever on this channel
		twitch_isReturning?:boolean;//True if new user coming back
		twitch_isPresentation?:boolean;//True if user used the presentation feature
		twitch_isSuspicious?: boolean;//True when user is flagged as suspicious
		twitch_sharedBanChannels?: {id:string, login:string}[];//contains the channels in which the user is banned
		twitch_isRestricted?: boolean;//True when user is flagged as restricted
		twitch_isHighlighted?: boolean;//True when using "highlight my message" reward
		twitch_announcementColor?: "primary" | "purple" | "blue" | "green" | "orange";//Announcement color
		raw_data?:any;
	}

	/**
	 * Whisper message 
	 */
	export interface MessageWhisperData extends AbstractTwitchatMessage {
		type:"whisper";
		channel_id:string;
		user: TwitchatUser;
		to: TwitchatUser;
		message:string;
		message_html:string;
		occurrenceCount?: number;
		cyphered?: boolean;
		spoiler?: boolean;
		is_pinned?: boolean;
	}

	/**
	 * Represents a poll's data
	 */
	export interface MessagePollData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"poll";
		title: string;
		choices: MessagePollDataChoice[];
		duration_s: number;
		started_at: number;
		ended_at?: number;
		winner?:MessagePollDataChoice;
	}
	export interface MessagePollDataChoice {
		id: string;
		label: string;
		votes: number;
	}

	/**
	 * Represents a prediction's data
	 */
	export interface MessagePredictionData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"prediction";
		title: string;
		duration_s: number;
		outcomes: MessagePredictionDataOutcome[];
		pendingAnswer: boolean;
		started_at: number;
		ended_at?: number;
		winner?:MessagePredictionDataOutcome;
	}
	export interface MessagePredictionDataOutcome {
		id: string;
		label: string;
		votes: number;
		voters: number;
	}

	/**
	 * Represents a "new follower" message
	 */
	export interface MessageFollowingData extends GreetableMessage {
		channel_id: string;
		type:"following";
		user:TwitchatUser;
		followed_at: number;
		automod?: AutomodParamsKeywordFilterData;
		loading?: boolean;//Used to indicate a ban/block process in progress on the emergency review
		followbot?:boolean;//Defines if it's from a followbot
	}

	/**
	 * Represents a new subscription message
	 */
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
		gift_count?: number;
		months:number;//Number of months the user subscribed for
		streakMonths:number;//Number of consecutive months the user has been subscribed for
		totalSubDuration:number;//Number of months the user has been subscribed for
		message?:string;
		message_html?:string;
		raw_data?:any;
	}

	/**
	 * Represents a bits data
	 */
	export interface MessageCheerData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"cheer";
		bits: number;
		user: TwitchatUser;
		message: string;
		message_html: string;
	}

	/**
	 * Represents a reward redeem message
	 */
	export interface MessageRewardRedeemData extends GreetableMessage {
		channel_id: string;
		type:"reward";
		user: TwitchatUser;
		reward: {
			id:string;
			title:string;
			cost:number;
			description:string;
			icon:TwitchatImage;
		};
		message?:string;
		message_html?:string;
	}

	/**
	 * Represents a community challenge contribution
	 */
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
		train: HypeTrainStateData;
		activities: (MessageSubscriptionData|MessageCheerData)[];
	}

	/**
	 * Represents a hype train in progress
	 */
	export interface MessageHypeTrainEventData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"hype_train_approaching"|"hype_train_start"|"hype_train_cancel"|"hype_train_progress"|"hype_train_complete";
		train: HypeTrainStateData;
		level:number;
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
		viewers:number;
	}

	/**
	 * Represents info about an incoming raid
	 */
	export interface MessageRaidData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"raid";
		user:TwitchatUser;
		viewers:number;
		stream:{
			title: string;
			category: string;
		};
	}

	/**
	 * Represents a "chat connected" message
	 */
	export interface MessageConnectData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"connect";
		user:TwitchatUser;
	}
	
	/**
	 * Represents a "chat connection lost" message
	 */
	export interface MessageDisconnectData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"disconnect";
		user:TwitchatUser;
	}

	/**
	 * Represents a chat user joining message
	 */
	export interface MessageJoinData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"join";
		users:TwitchatUser[];
	}
	
	/**
	 * Represents a chat user leaving message
	 */
	export interface MessageLeaveData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"leave";
		users:TwitchatUser[];
	}

	/**
	 * Represents a chat clear 
	 */
	export interface MessageClearChatData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"clear_chat";
		user?:TwitchatUser;
		fromAutomod:boolean;
	}

	/**
	 * Represents a raffle message
	 */
	export interface MessageRaffleData extends AbstractTwitchatMessage {
		type:"raffle";
		raffleData:RaffleData;
		winner:RaffleEntry;
	}

	/**
	 * Represents a bingo message
	 */
	export interface MessageBingoData extends AbstractTwitchatMessage {
		type:"bingo";
		user:TwitchatUser;
		bingoData:BingoConfig;
	}

	/**
	 * Represents a countdown complete message
	 */
	export interface MessageCountdownData extends AbstractTwitchatMessage {
		type:"countdown";
		countdown:CountdownData;
	}

	/**
	 * Represents a timer message
	 */
	export interface MessageTimerData extends AbstractTwitchatMessage {
		type:"timer";
		started:boolean,
		startAt:string;
		startAt_ms:number;
		duration?:string;
		duration_ms?:number;
	}

	/**
	 * Represents a notice message (which has multiple sub types)
	 */
	export interface MessageNoticeData extends AbstractTwitchatMessage {
		channel_id?: string;
		type:"notice";
		noticeId:TwitchatNoticeStringType;
		message:string;
	}

	/**
	 * Represents a message when autoban bans a user based on
	 * their login
	 */
	export interface MessageAutobanJoinData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"autoban_join";
		user:TwitchatUser;
		rule:TwitchatDataTypes.AutomodParamsKeywordFilterData;
	}

	/**
	 * Represents info about a twitchat ad (updates, tips & tricks, ...)
	 */
	export interface MessageTwitchatAdData extends AbstractTwitchatMessage {
		type:"twitchat_ad";
		adType:TwitchatAdStringTypes;
	}

	/**
	 * Represents a created clip pending publivation
	 */
	export interface MessageClipCreate extends AbstractTwitchatMessage {
		type:"clip_pending_publication";
		clipUrl:string;
		clipID:string;
		loading:boolean;
		error:boolean;
		clipData?:ClipInfo;
	}

	/**
	 * Represents a stream info update message 
	 */
	export interface MessageStreamInfoUpdate extends MessageNoticeData {
		noticeId:"stream_info_update";
		title:string;
		category:string;
	}

	/**
	 * Represents a mod/unmod/vip/unvip/ban/unban/timeout event
	 */
	export interface MessageModerationAction extends MessageNoticeData {
		user:TwitchatUser;//User moderated
	}
	
	/**
	 * Represents a status change of the shield mode
	 */
	export interface MessageShieldMode extends MessageNoticeData {
		user:TwitchatUser;
		enabled:boolean;
	}

	/**
	 * Represents a user banned message
	 */
	export interface MessageBanData extends AbstractTwitchatMessage {
		type:"ban",
		channel_id: string;
		moderator:TwitchatUser;
		user:TwitchatUser;//User moderated
		duration_s?:number;
	}

	/**
	 * Represents a user unbanned message
	 */
	export interface MessageUnbanData extends AbstractTwitchatMessage {
		type:"unban",
		channel_id: string;
		moderator:TwitchatUser;
		user:TwitchatUser;//User moderated
	}

	/**
	 * Represents an emergency mode state change (enable or disable)
	 */
	export interface MessageEmergencyModeInfo extends MessageNoticeData{
		noticeId:"emergencyMode";
		enabled:boolean;
	}

	/**
	 * Represents a chat alert message
	 * (when a user uses the !alert command)
	 */
	export interface MessageChatAlertData extends AbstractTwitchatMessage{
		type:"chat_alert";
		message:MessageChatData;
	}

	/**
	 * Represents a music start data
	 */
	export interface MessageMusicStartData extends AbstractTwitchatMessage {
		type:"music_start";
		track:MusicTrackData;
	}

	/**
	 * Represents a music stop data
	 */
	export interface MessageMusicStopData extends AbstractTwitchatMessage {
		type:"music_stop";
		track:MusicTrackData|null;
	}

	/**
	 * Represents a music added to queue data
	 */
	export interface MessageMusicAddedToQueueData extends AbstractTwitchatMessage {
		type:"music_added_to_queue";
		track:MusicTrackData|null;
		user?:TwitchatUser;
		message?:string;
	}

	/**
	 * Represents a voicemod voice change data
	 */
	export interface MessageVoicemodData extends AbstractTwitchatMessage {
		type:"voicemod";
		voiceID?:string;
	}

	/**
	 * Represents a shoutout data
	 */
	export interface MessageShoutoutData extends AbstractTwitchatMessage {
		type:"shoutout";
		received:boolean;//If true it means that the shoutout has been given to self on another channel
		viewerCount:number;
		channel_id:string;
		user:TwitchatDataTypes.TwitchatUser;
		moderator:TwitchatDataTypes.TwitchatUser;
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
		info:ChatHighlightInfo;
	}

	/**
	 * Represents a followbot message
	 * When getting followboted, all follow events are merge into one
	 * single MessageFollowbotData
	 */
	export interface MessageFollowbotData extends AbstractTwitchatMessage {
		type:"followbot_list";
		users:TwitchatUser[];
	}

	/**
	 * Represents a room settings message
	 * Sent on channel connexion to show current room's restrictions
	 */
	export interface MessageRoomSettingsData extends AbstractTwitchatMessage {
		type:"room_settings";
		channel_id: string;
		channel_name: string;
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
		user:TwitchatUser;
		restricted:boolean;
		monitored:boolean;
		moderator:TwitchatUser;
	}

	/**
	 * Respresents an OBS scene change event
	 */
	export interface MessageOBSSceneChangedData extends AbstractTwitchatMessage {
		type:"obs_scene_change";
		sceneName:string;
	}

	/**
	 * Respresents an OBS scene change event
	 */
	export interface MessageOBSSourceToggleData extends AbstractTwitchatMessage {
		type:"obs_source_toggle";
		sourceName:string;
		sourceItemId:number;
		visible:boolean;
	}

	/**
	 * Respresents an OBS scene change event
	 */
	export interface MessagePinData extends AbstractTwitchatMessage {
		type:"pinned";
		moderator:TwitchatUser;
		chatMessage:MessageChatData;
		pinnedAt_ms: number;
		updatedAt_ms: number;
		unpinAt_ms: number;
		timeoutRef?: number;
	}

	/**
	 * Respresents an OBS scene change event
	 */
	export interface MessageUnpinData extends AbstractTwitchatMessage {
		type:"unpinned";
		moderator?:TwitchatUser;
		chatMessage:MessageChatData;
	}

	/**
	 * Respresents a stream start event
	 */
	export interface MessageStreamOnlineData extends AbstractTwitchatMessage {
		type:"stream_online";
		info:StreamInfo;

	}

	/**
	 * Respresents a stream stop event
	 */
	export interface MessageStreamOfflineData extends AbstractTwitchatMessage {
		type:"stream_offline";
		info:StreamInfo;
	}

	/**
	 * Respresents a counter value update
	 */
	export interface MessageCounterUpdatesData extends AbstractTwitchatMessage {
		type:"counter_update";
		counter:CounterData;
		added:number;
		value:number;
		maxed:boolean;
		mined:boolean;
		looped:boolean;
		user?:TwitchatUser;
	}

	/**
	 * Respresents an outgoing raid
	 */
	export interface MessageRaidStartData extends AbstractTwitchatMessage {
		type:"raid_started";
		user:TwitchatUser;
	}

	/**
	 * Respresents an on-chat scope request
	 */
	export interface MessageScopeRequestData extends AbstractTwitchatMessage {
		type:"scope_request";
		twitch_scopes:TwitchScopesString[];
	}

}