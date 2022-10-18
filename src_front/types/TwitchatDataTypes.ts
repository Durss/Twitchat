
export namespace TwitchatDataTypes {

	export type ChatPlatform = "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook";
	
	//Parameters content types
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

	//Bot messages types
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

	//Room status types
	export interface IRoomStatusCategory {
		emotesOnly:ParameterData;
		followersOnly:ParameterData;
		subsOnly:ParameterData;
		slowMode:ParameterData;
	}
	export type RoomStatusCategory = keyof IRoomStatusCategory;

	//Generic parameter categories types
	export interface IParameterCategory {
		appearance:{[key:string]:ParameterData};
		filters:{[key:string]:ParameterData};
		features:{[key:string]:ParameterData};
	}
	export type ParameterCategory = keyof IParameterCategory;

	//Account params types
	export interface IAccountParamsCategory {
		syncDataWithServer:ParameterData;
		publicDonation:ParameterData;
	}
	export type AccountParamsCategory = keyof IAccountParamsCategory;

	//OBS chat command scene control
	export interface OBSSceneCommand {
		scene:{
			sceneIndex:number;
			sceneName:string;
		}
		command:string;
	}

	//OBS chat command mute control
	export interface OBSMuteUnmuteCommands {
		audioSourceName:string;
		muteCommand:string;
		unmuteCommand:string;
	}



	/**
	 * Data type for messages badges.
	 * These are info displayed on the left of some messages
	 * to indicate things like "whisper" or "automoded" info
	 */
	export const MessageBadgeDataType = {
		AUTOMOD: "automod",
		WHISPER: "whisper",
		EMERGENCY_BLOCKED: "emergencyBlocked",
	} as const;
	export type MessageBadgeDataStringType = typeof MessageBadgeDataType[keyof typeof MessageBadgeDataType];
	export interface MessageBadgeData {
		type:MessageBadgeDataStringType;
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

	export interface RaffleData {
		mode:"chat"|"sub"|"manual";
		command:string;
		duration:number;
		maxEntries:number;
		created_at:number;
		entries:RaffleEntry[];
		vipRatio:number;
		followRatio:number;
		subRatio:number;
		subgitRatio:number;
		subMode_includeGifters:boolean;
		subMode_excludeGifted:boolean;
		showCountdownOverlay:boolean;
		customEntries:string;
		winners?:RaffleEntry[];
	}
	export interface RaffleEntry extends EntryItem {
		score:number;
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
	
	export interface EntryItem {
		id:string;
		label:string;
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

	export interface WheelData {
		items:EntryItem[];
		winner:string;
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

	export interface MusicTrackData {
		title:string;
		artist:string;
		album:string;
		cover:string;
		duration:number;
		url:string;
	}
	export type MusicTrackDataKeys = keyof MusicTrackData;

	export interface ChatHighlightInfo {
		message?:string,
		user?:TwitchatUser,
		clip?:ClipInfo,
		params?:ChatHighlightParams,
	}
	export interface ChatHighlightParams {
		position:"tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	}
	export interface ClipInfo {
		duration:number;
		url:string;
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
		readUsers:string[];
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

	export interface VoicemodParamsData {
		enabled:boolean;
		voiceIndicator:boolean;
		commandToVoiceID:{[key:string]:string};
		chatCmdPerms:PermissionsData;
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

	export interface TwitchatImage {
		sd:string;
		hd?:string;
	}

	export interface TwitchatUser {
		id:string;
		platform:ChatPlatform;
		login:string;
		displayName:string;
		greeted:boolean;//Already displayed on the "greet them" section ?
		color?:string;//Chat color of their nickname
		avatarPath?:string;
		is_partner:boolean;//Is Twitch partner
		is_affiliate:boolean;//Is Twitch affiliat
		is_tracked:boolean;
		donor:{//Donor state of the user
			state:boolean,
			level:number,
		};
		pronouns:string|false;
		pronounsLabel:string|false;
		pronounsTooltip:string|false;
		channelInfo:{[key:string]:UserChannelInfo},
		temporary?:boolean;//true when the details are loading
	}

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
		badges:TwitchatUserBadge[];
		messageHistory:ChatMessageTypes[];
	}

	export interface TwitchatUserBadge {
		icon:TwitchatImage;
		id:string;
		title?:string;
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
		SUBSCRIPTION:"subscription",
		AUTOBAN_JOIN:"autoban_join",
		CHAT_HIGHLIGHT:"chat_highlight",
		HYPE_TRAIN_START:"hype_train_start",
		HYPE_TRAIN_CANCEL:"hype_train_cancel",
		HYPE_TRAIN_SUMMARY:"hype_train_summary",
		HYPE_TRAIN_PROGRESS:"hype_train_progress",
		HYPE_TRAIN_COMPLETE:"hype_train_complete",
		MUSIC_ADDED_TO_QUEUE:"music_added_to_queue",
		HYPE_TRAIN_APPROACHING:"hype_train_approaching",
		HYPE_TRAIN_COOLED_DOWN:"hype_train_cooled_down",
		COMMUNITY_BOOST_COMPLETE:"community_boost_complete",
		COMMUNITY_CHALLENGE_CONTRIBUTION:"community_challenge_contribution",
	} as const;

	//Dynamically type TwitchatMessageStringType from TwitchatMessageType values
	export type TwitchatMessageStringType = typeof TwitchatMessageType[keyof typeof TwitchatMessageType];


	export const TwitchatNoticeType = {
		TTS:"tts",
		GENERIC:"generic",
		APP_VERSION:"appVersion",
		ERROR:"error",
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
		UNBLOCK:"unblock",
		VIP:"vip",
		UNVIP:"unvip",
		EMERGENCY_MODE:"emergencyMode",
		COMMERCIAL_ERROR:"commercialError",
		COMMERCIAL_START:"commercialStart",
		COMMERCIAL_COMPLETE:"commercialComplete",
		STREAM_INFO_UPDATE:"stream_info_update",
		CYPHER_KEY:"devcypherKey",
		DEVMODE:"devMode",
	} as const;
	export type TwitchatNoticeStringType = typeof TwitchatNoticeType[keyof typeof TwitchatNoticeType]|null;

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
									MessageBanData |
									MessageTimeoutData |
									MessageClearChatData |
									MessageRaffleData |
									MessageBingoData |
									MessageCountdownData |
									MessageAutobanJoinData |
									MessageTwitchatAdData |
									MessageTimerData |
									MessageStreamInfoUpdate |
									MessageEmergencyModeInfo |
									MessageHypeTrainEventData |
									MessageChatAlertData |
									MessageMusicStopData |
									MessageMusicStartData |
									MessageMusicAddedToQueueData |
									MessageShoutoutData |
									MessageVoicemodData |
									MessageChatHighlightData |
									MessageNoticeData
	;

	export const DeletableMessageTypes:TwitchatMessageStringType[] = [
		TwitchatMessageType.MESSAGE,
	];
	export const ActivityFeedMessageTypes:TwitchatMessageStringType[] = [
		TwitchatMessageType.POLL,
		TwitchatMessageType.BINGO,
		TwitchatMessageType.COUNTDOWN,
		TwitchatMessageType.PREDICTION,
		TwitchatMessageType.RAFFLE,
		TwitchatMessageType.CHEER,
		TwitchatMessageType.SUBSCRIPTION,
		TwitchatMessageType.REWARD,
		TwitchatMessageType.AUTOBAN_JOIN,
		TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN,
		TwitchatMessageType.HYPE_TRAIN_SUMMARY,
		TwitchatMessageType.COMMUNITY_BOOST_COMPLETE,
		TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION,
		TwitchatMessageType.FOLLOWING,
		TwitchatMessageType.RAID,
	];

	export const ActivityFeedNoticeTypes:TwitchatDataTypes.TwitchatNoticeStringType[] = [
		TwitchatNoticeType.EMERGENCY_MODE,
		TwitchatNoticeType.COMMERCIAL_START,
		TwitchatNoticeType.COMMERCIAL_ERROR,
		TwitchatNoticeType.COMMERCIAL_COMPLETE,
	];

	export interface AbstractTwitchatMessage {
		type:TwitchatMessageStringType;
		id:string;
		date:number;
		platform:ChatPlatform;
		deleted?:boolean;
		markedAsRead?:boolean;
	}

	export interface MessageChatData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"message";
		user: TwitchatUser;
		message:string;
		message_html:string;
		answers: MessageChatData[];
		
		todayFirst?: boolean;
		automod?: AutomodParamsKeywordFilterData;
		answersTo?: MessageChatData;
		cyphered?: boolean;
		deletedData?: {
			deleter:TwitchatUser;
		};
		occurrenceCount?: number;
		highlightWord?: string;
		hasMention?: boolean;
		spoiler?: boolean;
		elevatedInfo?:{duration_s:number, amount:number};
		
		twitch_automod?: AutomodData;
		twitch_isSlashMe?:boolean;
		twitch_isFirstMessage?:boolean;//True if first message ever on this channel
		twitch_isReturning?:boolean;//True if new user coming back
		twitch_isPresentation?:boolean;//True if user used the presentation feature
		twitch_isLowTrust?: boolean;//True when user is flagged as suspicious
		twitch_isHighlighted?: boolean;//True when using "hihglight my message" reward
		twitch_announcementColor?: "primary" | "purple" | "blue" | "green" | "orange";//Announcement color
	}

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
		voters: number;
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
			id:string;
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

	export interface MessageHypeTrainEventData extends AbstractTwitchatMessage {
		channel_id: string;
		type:"hype_train_approaching"|"hype_train_start"|"hype_train_cancel"|"hype_train_progress"|"hype_train_complete";
		train: HypeTrainStateData;
		level:number;
		percent:number;
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

	//Only for incoming raids
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

	export interface MessageBanData extends MessageNoticeData {
		channel_id: string;
		noticeId:"ban"|"unban";
		user:TwitchatUser;
		moderator?:TwitchatUser;
		reason:string;
	}
	
	export interface MessageTimeoutData extends MessageNoticeData {
		channel_id: string;
		noticeId:"timeout"|"untimeout";
		user:TwitchatUser;
		moderator?:TwitchatUser;
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
		countdown:CountdownData;
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
		type:"twitchat_ad";
		adType:TwitchatAdStringTypes;
	}

	export interface MessageStreamInfoUpdate extends MessageNoticeData {
		noticeId:"stream_info_update";
		title:string;
		category:string;
	}

	export interface MessageEmergencyModeInfo extends MessageNoticeData{
		noticeId:"emergencyMode";
		enabled:boolean;
	}

	export interface MessageChatAlertData extends AbstractTwitchatMessage{
		type:"chat_alert";
		message:MessageChatData;
	}

	export interface MessageMusicStartData extends AbstractTwitchatMessage {
		type:"music_start";
		track:MusicTrackData;
	}

	export interface MessageMusicStopData extends AbstractTwitchatMessage {
		type:"music_stop";
		track:MusicTrackData|null;
	}

	export interface MessageMusicAddedToQueueData extends AbstractTwitchatMessage {
		type:"music_added_to_queue";
		track:MusicTrackData|null;
	}

	export interface MessageVoicemodData extends AbstractTwitchatMessage {
		type:"voicemod";
		voiceID?:string;
	}

	export interface MessageShoutoutData extends AbstractTwitchatMessage {
		type:"shoutout";
		user:TwitchatDataTypes.TwitchatUser;
		stream:{
			title: string;
			category: string;
		};
	}

	export interface MessageChatHighlightData extends AbstractTwitchatMessage {
		type:"chat_highlight";
		info:ChatHighlightInfo;
	}

}