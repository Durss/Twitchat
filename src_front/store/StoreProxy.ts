import type { TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { SpotifyAuthResult, SpotifyAuthToken } from "@/utils/music/SpotifyDataTypes";
import type { PubSubDataTypes } from "@/utils/twitch/PubSubDataTypes";
import type VoiceAction from "@/utils/voice/VoiceAction";
import type { VoicemodTypes } from "@/utils/voice/VoicemodWebSocket";

/**
* Created : 23/09/2022 
* This class only exists to solve the circular imports hell
*/
export default class StoreProxy {
	
	public static account:IAccountState & IAccountGetters & IAccountActions & {$state:IAccountState};
	public static auth:IAuthState & IAuthGetters & IAuthActions & {$state:IAuthState};
	public static automod:IAutomodState & IAutomodGetters & IAutomodActions & {$state:IAutomodState};
	public static bingo:IBingoState & IBingoGetters & IBingoActions & {$state:IBingoState};
	public static chat:IChatState & IChatGetters & IChatActions & {$state:IChatState};
	public static chatSuggestion:IChatSuggestionState & IChatSuggestionGetters & IChatSuggestionActions & {$state:IChatSuggestionState};
	public static emergency:IEmergencyState & IEmergencyGetters & IEmergencyActions & {$state:IEmergencyState};
	public static music:IMusicState & IMusicGetters & IMusicActions & {$state:IMusicState};
	public static obs:IOBSState & IOBSGetters & IOBSActions & {$state:IOBSState };
	public static params:IParamsState & IParamsGetters & IParamsActions & {$state:IParamsState};
	public static poll:IPollState & IPollGetters & IPollActions & {$state:IPollState};
	public static prediction:IPredictionState & IPredictionGetters & IPredictionActions & {$state:IPredictionState};
	public static raffle:IRaffleState & IRaffleGetters & IRaffleActions & {$state:IRaffleState};
	public static stream:IStreamState & IStreamGetters & IStreamActions & {$state:IStreamState};
	public static timer:ITimerState & ITimerGetters & ITimerActions & {$state:ITimerState};
	public static triggers:ITriggersState & ITriggersGetters & ITriggersActions & {$state:ITriggersState};
	public static tts:ITTSState & ITTSGetters & ITTSActions & {$state:ITTSState };
	public static users:IUsersState & IUsersGetters & IUsersActions & {$state:IUsersState};
	public static voice:IVoiceState & IVoiceGetters & IVoiceActions & {$state:IVoiceState};
	public static main:IMainState & IMainGetters & IMainActions & {$state:IMainState};
	public static debug:IDebugState & IDebugGetters & IDebugActions & {$state:IDebugState};
	public static accessibility:IAccessibilityState & IAccessibilityGetters & IAccessibilityActions & {$state:IAccessibilityState};
	
}

export interface IMainState {
	latestUpdateIndex: number;
	initComplete: boolean;
	showParams: boolean;
	devmode: boolean;
	ahsInstaller: TwitchatDataTypes.InstallHandler|null;
	alertData: string;
	tooltip: string;
	cypherKey: string;
	cypherEnabled: boolean;
	tempStoreValue: unknown;
	confirmData:TwitchatDataTypes.ConfirmData|null;
	chatAlertParams: TwitchatDataTypes.AlertParamsData;
	chatAlert:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData|null;
}

export interface IMainGetters {
}

export interface IMainActions {
	startApp(authenticate:boolean, callback:(value:unknown)=>void):Promise<void>
	loadDataFromStorage():void;
	alert(message:string):void;
	confirm<T>(title: string, description?: string, data?: T, yesLabel?:string, noLabel?:string, STTOrigin?:boolean): Promise<T|undefined>;
	closeConfirm():void;
	openTooltip(text:string):void;
	closeTooltip():void;
	setShowParams(show:boolean):void;
	setCypherKey(key:string):void;
	setCypherEnabled(enabled:boolean):void;
	toggleDevMode(forcedState?:boolean):void;
	setCanSplitView(value:boolean):void;
	setAhsInstaller(value:TwitchatDataTypes.InstallHandler):void;
	setChatAlertParams(params:TwitchatDataTypes.AlertParamsData):void;
	executeChatAlert(message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData|null):Promise<void>;
}




export interface IAccountState {
	syncDataWithServer:TwitchatDataTypes.ParameterData;
	publicDonation:TwitchatDataTypes.ParameterData;
}

export interface IAccountGetters {
}

export interface IAccountActions {
}




export type IAuthState = {
	authenticated: boolean;
	newScopesToRequest: string[];
} & {
	[key in TwitchatDataTypes.ChatPlatform]:{
		client_id:string;
		access_token:string;
		expires_in:number;
		scopes:string[];
		user:TwitchatDataTypes.TwitchatUser;
	};
}

export interface IAuthGetters {
}

export interface IAuthActions {
	twitch_tokenRefresh(reconnectIRC:boolean, callback?:(success:boolean)=>void):Promise<TwitchDataTypes.AuthTokenResult>;
	twitch_autenticate(code?:string, cb?:(success:boolean)=>void):Promise<void>;
	logout():void;
}




export interface IAutomodState {
	params:TwitchatDataTypes.AutomodParamsData;
}

export interface IAutomodGetters {
}

export interface IAutomodActions {
	setAutomodParams(payload:TwitchatDataTypes.AutomodParamsData):void;
}




export interface IBingoState {
	data:TwitchatDataTypes.BingoConfig | null;
}

export interface IBingoGetters {
}

export interface IBingoActions {
	startBingo(payload:TwitchatDataTypes.BingoConfig):void;
	stopBingo():void;
	checkBingoWinner(message:TwitchatDataTypes.MessageChatData):void;
}




export interface IChatState {
	searchMessages:string;
	realHistorySize:number;
	whispersUnreadCount:number;
	pinedMessages:TwitchatDataTypes.ChatMessageTypes[];
	emoteSelectorCache:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[],
	whispers:{[key:string]:TwitchatDataTypes.MessageWhisperData[]};
	botMessages:TwitchatDataTypes.IBotMessage,
	commands:TwitchatDataTypes.CommandData[],
	spoilerParams:TwitchatDataTypes.SpoilerParamsData,
	isChatMessageHighlighted: boolean;
	chatHighlightOverlayParams: TwitchatDataTypes.ChatHighlightParams;
}

export interface IChatGetters {
	messages:TwitchatDataTypes.ChatMessageTypes[];
}

export interface IChatActions {
	sendTwitchatAd(contentID?:TwitchatDataTypes.TwitchatAdStringTypes):void;
	addMessage(message:TwitchatDataTypes.ChatMessageTypes):Promise<void>;
	deleteMessage(message:TwitchatDataTypes.ChatMessageTypes, deleteData?:TwitchatDataTypes.TwitchatUser, callEndpoint?:boolean):void;
	deleteMessageByID(messageID:string, deleteData?:TwitchatDataTypes.TwitchatUser, callEndpoint?:boolean):void;
	delUserMessages(uid:string):void;
	setEmoteSelectorCache(payload:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[]):void;
	closeWhispers( userID:string):void;
	doSearchMessages(value:string):void;
	updateBotMessage(value:{key:TwitchatDataTypes.BotMessageField, enabled:boolean, message:string}):void;
	shoutout(user:TwitchatDataTypes.TwitchatUser):Promise<void>;
	setChatHighlightOverlayParams(params:TwitchatDataTypes.ChatHighlightParams):void;
	setSpoilerParams(params:TwitchatDataTypes.SpoilerParamsData):void;
	pinMessage(message:TwitchatDataTypes.ChatMessageTypes):void;
	unpinMessage(message:TwitchatDataTypes.ChatMessageTypes):void;
	highlightChatMessageOverlay(message:TwitchatDataTypes.ChatMessageTypes|null):Promise<void>;
	flagSuspiciousMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number):void;
	gigaSpam():Promise<void>;
}




export interface IChatSuggestionState {
	data: TwitchatDataTypes.ChatSuggestionData | null,
}

export interface IChatSuggestionGetters {
}

export interface IChatSuggestionActions {
	setChatSuggestion(payload:TwitchatDataTypes.ChatSuggestionData|null):void;
	addChatSuggestion(message:TwitchatDataTypes.MessageChatData):void;
}




export interface IDebugState {
}

export interface IDebugGetters {
}

export interface IDebugActions {
	simulateMessage(type:TwitchatDataTypes.TwitchatMessageStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>void, postOnChat?:boolean):Promise<void>;
	simulateNotice(noticeType?:TwitchatDataTypes.TwitchatNoticeStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>void, postOnChat?:boolean):Promise<void>;
}




export interface IEmergencyState {
	emergencyStarted:boolean,
	params:TwitchatDataTypes.EmergencyParamsData,
	follows: TwitchatDataTypes.MessageFollowingData[],
}

export interface IEmergencyGetters {
}

export interface IEmergencyActions {
	setEmergencyParams(params:TwitchatDataTypes.EmergencyParamsData):void;
	setEmergencyMode(enable:boolean):Promise<void>;
	addEmergencyFollower(payload:TwitchatDataTypes.MessageFollowingData):void;
	clearEmergencyFollows():void;
	handleChatCommand(message:TwitchatDataTypes.MessageChatData, cmd:string):void;
}




export interface IMusicState {
	spotifyAuthParams: SpotifyAuthResult|null;
	spotifyAuthToken: SpotifyAuthToken|null;
	deezerConnected: boolean;
	musicPlayerParams:TwitchatDataTypes.MusicPlayerParamsData,
}

export interface IMusicGetters {
}

export interface IMusicActions {
	setSpotifyCredentials(value:{client:string, secret:string}):void;
	setSpotifyAuthResult(value:SpotifyAuthResult|null):void;
	setSpotifyToken(value:SpotifyAuthToken|null):void;
	setDeezerConnected(value:boolean):void;
}




export interface IOBSState {
	connectionEnabled:boolean|null;
	sceneCommands:TwitchatDataTypes.OBSSceneCommand[];
	muteUnmuteCommands:TwitchatDataTypes.OBSMuteUnmuteCommands,
	commandsPermissions:TwitchatDataTypes.PermissionsData,
}

export interface IOBSGetters {
}

export interface IOBSActions {
	setOBSSceneCommands(value:TwitchatDataTypes.OBSSceneCommand[]):void;
	setOBSMuteUnmuteCommands(value:TwitchatDataTypes.OBSMuteUnmuteCommands):void;
	setObsCommandsPermissions(value:TwitchatDataTypes.PermissionsData):void;
	handleChatCommand(message:TwitchatDataTypes.MessageChatData, cmd?:string):void;
}




export interface IParamsState {
	features:{[key:string]:TwitchatDataTypes.ParameterData};
	appearance:{[key:string]:TwitchatDataTypes.ParameterData};
	filters:{[key:string]:TwitchatDataTypes.ParameterData};
	chatColumnsConfig:TwitchatDataTypes.ChatColumnsConfig[];
}

export interface IParamsGetters {
}

export interface IParamsActions {
	updateParams():void;
	addChatColumn():TwitchatDataTypes.ChatColumnsConfig;
	delChatColumn(column:TwitchatDataTypes.ChatColumnsConfig):void;
	saveChatColumnConfs():void;
}




export interface IPollState {
	data:TwitchatDataTypes.MessagePollData | null,
}

export interface IPollGetters {
}

export interface IPollActions {
	setCurrentPoll(data:TwitchatDataTypes.MessagePollData|null, postOnChat?:boolean):void;
}




export interface IPredictionState {
	data:TwitchatDataTypes.MessagePredictionData | null;
}

export interface IPredictionGetters {
}

export interface IPredictionActions {
	setPrediction(payload:TwitchatDataTypes.MessagePredictionData|null, postOnChat?:boolean):void;
}




export interface IRaffleState {
	data:TwitchatDataTypes.RaffleData|null;
}

export interface IRaffleGetters {
}

export interface IRaffleActions {
	startRaffle(payload:TwitchatDataTypes.RaffleData):Promise<void>;
	stopRaffle():void;
	onRaffleComplete(winner:TwitchatDataTypes.EntryItem, publish?:boolean):void;
	checkRaffleJoin(message:TwitchatDataTypes.MessageChatData):Promise<void>;
}




export interface IStreamState {
	hypeTrain: TwitchatDataTypes.HypeTrainStateData|undefined;
	currentRaid: TwitchatDataTypes.RaidInfo|undefined;
	playbackState: PubSubDataTypes.PlaybackInfo|undefined;
	communityBoostState: TwitchatDataTypes.CommunityBoost|undefined;
	streamInfoPreset: TwitchatDataTypes.StreamInfoPreset[];
	lastRaider: TwitchatDataTypes.TwitchatUser|undefined;
	commercialEnd: number;
	roomSettings:{[key in string]:TwitchatDataTypes.IRoomSettings|undefined};
}

export interface IStreamGetters {
}

export interface IStreamActions {
	setRaiding(infos:TwitchatDataTypes.RaidInfo|undefined):void;
	setRoomSettings(channelId:string, settings:TwitchatDataTypes.IRoomSettings):void;
	setHypeTrain(data:TwitchatDataTypes.HypeTrainStateData|undefined):void;
	setPlaybackState(value:PubSubDataTypes.PlaybackInfo|undefined):void;
	setCommunityBoost(value:TwitchatDataTypes.CommunityBoost|undefined):void;
	saveStreamInfoPreset(preset:TwitchatDataTypes.StreamInfoPreset):void;
	deleteStreamInfoPreset(preset:TwitchatDataTypes.StreamInfoPreset):void;
	setCommercialEnd(date:number):void;
}




export interface ITimerState {
	timerStart: number;
	countdown: TwitchatDataTypes.CountdownData|null;
}

export interface ITimerGetters {
}

export interface ITimerActions {
	startTimer():void;
	stopTimer():void;
	startCountdown(duration:number):void;
	stopCountdown():void;
}




export interface ITriggersState {
	triggers: {[key:string]:TriggerData};
}

export interface ITriggersGetters {
}

export interface ITriggersActions {
	setTrigger(key:string, data:TriggerData):void;
	deleteTrigger(key:string):void;
}




export interface ITTSState {
	speaking: boolean,
	params:TwitchatDataTypes.TTSParamsData,
}

export interface ITTSGetters {
}

export interface ITTSActions {
	ttsReadMessage(message:TwitchatDataTypes.ChatMessageTypes):void
	ttsReadUser(user:TwitchatDataTypes.TwitchatUser, read:boolean):void
	setTTSParams(params:TwitchatDataTypes.TTSParamsData):void
}




export interface IUsersState {
	userCard: {
		user:TwitchatDataTypes.TwitchatUser|null,
		channelId?:string,
	}|null;
	blockedUsers: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
	myFollowings: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
	knownBots: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
}

export interface IUsersGetters {
	users:TwitchatDataTypes.TwitchatUser[];
}

export interface IUsersActions {
	setBotsMap(platform:TwitchatDataTypes.ChatPlatform, hashmap:{[key:string]:boolean}):void;
	preloadTwitchModerators(channelId:string):Promise<void>;
	getUserFrom(platform:TwitchatDataTypes.ChatPlatform, channelId?:string, id?:string, login?:string, displayName?:string, loadCallback?:(user:TwitchatDataTypes.TwitchatUser)=>void, forcedFollowState?:boolean, getPronouns?:boolean):TwitchatDataTypes.TwitchatUser;
	initBlockedUsers():Promise<void>;
	flagMod(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	flagUnmod(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	flagVip(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	flagUnvip(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	flagBlocked(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	flagUnblocked(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	flagBanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string, duration_s?:number):void;
	flagUnbanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	flagOnlineUsers(users:TwitchatDataTypes.TwitchatUser[], channelId:string):void;
	flagOfflineUsers(users:TwitchatDataTypes.TwitchatUser[], channelId:string):void;
	checkFollowerState(user:TwitchatDataTypes.TwitchatUser, channelId:string):Promise<boolean>;
	checkPronouns(user:TwitchatDataTypes.TwitchatUser):Promise<void>;
	flagAsFollower(user:TwitchatDataTypes.TwitchatUser, channelId:string):void;
	openUserCard(user:TwitchatDataTypes.TwitchatUser|null, channelId?:string):void;
	loadMyFollowings():Promise<void>;
	trackUser(user:TwitchatDataTypes.TwitchatUser):void;
	untrackUser(user:TwitchatDataTypes.TwitchatUser):void;
}




export interface IVoiceState {
	voiceActions: VoiceAction[];
	voiceLang: string;
	voiceText: {
		tempText:string;
		rawTempText:string;
		finalText:string;
	},
	voicemodCurrentVoice:VoicemodTypes.Voice,
	voicemodParams:TwitchatDataTypes.VoicemodParamsData,
}

export interface IVoiceGetters {
}

export interface IVoiceActions {
	setVoiceLang(value:string):void;
	setVoiceActions(value:VoiceAction[]):void;
	setVoicemodParams(payload:TwitchatDataTypes.VoicemodParamsData):void;
}




export interface IAccessibilityState {
	ariaPolite:string;
}

export interface IAccessibilityGetters {
}

export interface IAccessibilityActions {
	setAriaPolite(value:string):void;
}