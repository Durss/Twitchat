import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/TwitchDataTypes";
import type { BingoData, RaffleData, WheelItem } from "@/utils/CommonDataTypes";
import type { IRCEventDataList } from "@/utils/IRCEventDataTypes";
import type { PubSubDataTypes } from "@/utils/PubSubDataTypes";
import type { SpotifyAuthResult, SpotifyAuthToken } from "@/utils/SpotifyDataTypes";
import type VoiceAction from "@/utils/VoiceAction";
import type { VoicemodTypes } from "@/utils/VoicemodWebSocket";
import type { ChatUserstate } from "tmi.js";

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
	
}

export interface IMainState {
	latestUpdateIndex: number;
	initComplete: boolean;
	showParams: boolean;
	devmode: boolean;
	canSplitView: boolean;
	ahsInstaller: TwitchatDataTypes.InstallHandler|null;
	alert: string;
	tooltip: string;
	cypherKey: string;
	cypherEnabled: boolean;
	tempStoreValue: unknown;
	confirmData:TwitchatDataTypes.ConfirmData;
	chatAlertParams: TwitchatDataTypes.AlertParamsData;
	chatAlert:IRCEventDataList.Message|IRCEventDataList.Whisper|null;
}

export interface IMainGetters {
}

export interface IMainActions {
	startApp(payload:{authenticate:boolean, callback:(value:unknown)=>void}):Promise<void>
	loadDataFromStorage(authenticated?:boolean):void;
	showAlert(message:string):void;
	confirm(payload:TwitchatDataTypes.ConfirmData):void;
	openTooltip(payload:string):void;
	closeTooltip():void;
	setShowParams(payload:boolean):void;
	setCypherKey(payload:string):void;
	setCypherEnabled(payload:boolean):void;
	toggleDevMode(forcedState?:boolean):void;
	setCanSplitView(value:boolean):void;
	setAhsInstaller(value:TwitchatDataTypes.InstallHandler):void;
	setChatAlertParams(params:TwitchatDataTypes.AlertParamsData):void;
	executeChatAlert(message:IRCEventDataList.Message|IRCEventDataList.Whisper):Promise<void>;
}




export interface IAccountState {
	syncDataWithServer:TwitchatDataTypes.ParameterData;
	publicDonation:TwitchatDataTypes.ParameterData;
}

export interface IAccountGetters {
}

export interface IAccountActions {
}




export interface IAuthState {
	refreshTokenTO: number;
	authenticated: boolean;
	newScopeToRequest: string[];
}

export interface IAuthGetters {
}

export interface IAuthActions {
	refreshAuthToken(payload:(success:boolean)=>void):void;
	authenticate(payload:{code?:string, cb?:(success:boolean)=>void, forceRefresh?:boolean}):void;
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
	data:BingoData | null;
}

export interface IBingoGetters {
}

export interface IBingoActions {
	startBingo(payload:TwitchatDataTypes.BingoConfig):void;
	stopBingo():void;
}




export interface IChatState {
	searchMessages:string;
	realHistorySize:number;
	whispersUnreadCount:number;
	messages:TwitchatDataTypes.ChatMessageTypes[];
	pinedMessages:TwitchatDataTypes.ChatMessageTypes[];
	activityFeed:TwitchatDataTypes.ChatMessageTypes[];
	emoteSelectorCache:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchDataTypes.Emote[]}[],
	whispers:{[key:string]:IRCEventDataList.Whisper[]};
	botMessages:TwitchatDataTypes.IBotMessage,
	commands:TwitchatDataTypes.CommandData[],
	spoilerParams:TwitchatDataTypes.SpoilerParamsData,
	isChatMessageHighlighted: boolean;
	chatHighlightOverlayParams: TwitchatDataTypes.ChatHighlightOverlayData;
}

export interface IChatGetters {
}

export interface IChatActions {
	sendTwitchatAd(contentID?:TwitchatDataTypes.TwitchatAdStringTypes):void;
	addMessage(message:TwitchatDataTypes.ChatMessageTypes):Promise<void>;
	delChatMessage(messageId:string, deleteData?:TwitchatDataTypes.TwitchatUser):void;
	delUserMessages(uid:string):void;
	setEmoteSelectorCache(payload:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchDataTypes.Emote[]}[]):void;
	closeWhispers( userID:string):void;
	doSearchMessages(value:string):void;
	updateBotMessage(value:{key:TwitchatDataTypes.BotMessageField, enabled:boolean, message:string}):void;
	shoutout(source:TwitchatDataTypes.ChatSource, username:TwitchatDataTypes.TwitchatUser):Promise<void>;
	setChatHighlightOverlayParams(params:TwitchatDataTypes.ChatHighlightOverlayData):void;
	setSpoilerParams(params:TwitchatDataTypes.SpoilerParamsData):void;
	pinMessage(message:TwitchatDataTypes.ChatMessageTypes):void;
	unpinMessage(message:TwitchatDataTypes.ChatMessageTypes):void;
	highlightChatMessageOverlay(message:TwitchatDataTypes.ChatMessageTypes|null):Promise<void>;
}




export interface IChatSuggestionState {
	data: TwitchatDataTypes.ChatSuggestionData | null,
}

export interface IChatSuggestionGetters {
}

export interface IChatSuggestionActions {
	setChatSuggestion(payload:TwitchatDataTypes.ChatSuggestionData|null):void,
	setChatSuggestion(payload:TwitchatDataTypes.ChatSuggestionData|null):void,
}




export interface IEmergencyState {
	emergencyStarted:boolean,
	params:TwitchatDataTypes.EmergencyParamsData,
	follows: TwitchatDataTypes.EmergencyFollowerData[],
}

export interface IEmergencyGetters {
}

export interface IEmergencyActions {
	setEmergencyParams(params:TwitchatDataTypes.EmergencyParamsData):void;
	setEmergencyMode(enable:boolean):Promise<void>;
	addEmergencyFollower(payload:TwitchatDataTypes.EmergencyFollowerData):Promise<void>;
	clearEmergencyFollows():Promise<void>;
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
}




export interface IParamsState {
	features:{[key:string]:TwitchatDataTypes.ParameterData};
	appearance:{[key:string]:TwitchatDataTypes.ParameterData};
	filters:{[key:string]:TwitchatDataTypes.ParameterData};
}

export interface IParamsGetters {
}

export interface IParamsActions {
	updateParams():void;
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
	setPrediction(payload:TwitchatDataTypes.MessagePredictionData):void;
}




export interface IRaffleState {
	data:RaffleData|null;
}

export interface IRaffleGetters {
}

export interface IRaffleActions {
	startRaffle(payload:RaffleData):Promise<void>;
	stopRaffle():void;
	onRaffleComplete(winner:WheelItem, publish?:boolean):void;
}




export interface IStreamState {
	hypeTrain: TwitchatDataTypes.HypeTrainStateData|undefined;
	raiding: TwitchatDataTypes.MessageRaidData|undefined;
	playbackState: PubSubDataTypes.PlaybackInfo|undefined;
	communityBoostState: PubSubDataTypes.CommunityBoost|undefined;
	streamInfoPreset: TwitchatDataTypes.StreamInfoPreset[];
	lastRaider: TwitchatDataTypes.TwitchatUser|undefined;
	commercialEnd: number;
	roomStatusParams:TwitchatDataTypes.IRoomStatusCategory;
}

export interface IStreamGetters {
}

export interface IStreamActions {
	setRaiding(infos:PubSubDataTypes.RaidInfos|undefined):void;
	setHypeTrain(data:TwitchatDataTypes.HypeTrainStateData|undefined):void;
	setPlaybackState(value:PubSubDataTypes.PlaybackInfo|undefined):void;
	setCommunityBoost(value:PubSubDataTypes.CommunityBoost|undefined):void;
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
	triggers: {[key:string]:TwitchatDataTypes.TriggerData};
}

export interface ITriggersGetters {
}

export interface ITriggersActions {
	setTrigger(key:string, data:TwitchatDataTypes.TriggerData):void;
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
	ttsReadUser(payload:{username:string, read:boolean}):void
	setTTSParams(params:TwitchatDataTypes.TTSParamsData):void
}




export interface IUsersState {
	users: TwitchatDataTypes.TwitchatUser[];
	userCard: string|null;
	onlineUsers: string[];
	trackedUsers: {user:TwitchatDataTypes.TwitchatUser, messages:TwitchatDataTypes.MessageChatData[]}[];
	mods: TwitchDataTypes.ModeratorUser[];
	followingStates: {[key:string]:boolean};
	followingStatesByNames: {[key:string]:boolean};
	myFollowings: {[key:string]:boolean};
}

export interface IUsersGetters {
}

export interface IUsersActions {
	getUserFrom(source:TwitchatDataTypes.ChatSource, id?:string, login?:string, displayName?:string, isMod?:boolean, isVIP?:boolean, isBoradcaster?:boolean, isSub?:boolean):TwitchatDataTypes.TwitchatUser|undefined;
	checkFollowerState(user:TwitchatDataTypes.TwitchatUser):void;
	checkPronouns(user:TwitchatDataTypes.TwitchatUser):void;
	flagAsFollower(user:TwitchatDataTypes.TwitchatUser):void;
	addUser(user:TwitchatDataTypes.TwitchatUser):void;
	openUserCard(payload:string|null):void;
	loadMyFollowings():Promise<void>;
	setViewersList(users:string[]):void;
	flagLowTrustMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number):void;
	trackUser(payload:TwitchatDataTypes.TwitchatUser):{user:TwitchatDataTypes.TwitchatUser, messages:TwitchatDataTypes.MessageChatData[]}|null;
	untrackUser(payload:ChatUserstate):void;
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