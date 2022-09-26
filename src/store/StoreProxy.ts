import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/TwitchDataTypes";
import type { BingoData, RaffleData, TrackedUser, WheelItem } from "@/utils/CommonDataTypes";
import type { ActivityFeedData, ChatMessageTypes, IRCEventData, IRCEventDataList } from "@/utils/IRCEventDataTypes";
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
	
	public static account:IAccountState & IAccountActions & {$state:IAccountState};
	public static auth:IAuthState & IAuthActions & {$state:IAuthState};
	public static automod:IAutomodState & IAutomodActions & {$state:IAutomodState};
	public static bingo:IBingoState & IBingoActions & {$state:IBingoState};
	public static chat:IChatState & IChatActions & {$state:IChatState};
	public static chatSuggestion:IChatSuggestionState & IChatSuggestionActions & {$state:IChatSuggestionState};
	public static emergency:IEmergencyState & IEmergencyActions & {$state:IEmergencyState};
	public static music:IMusicState & IMusicActions & {$state:IMusicState};
	public static obs:IOBSState & IOBSActions & {$state:IOBSState };
	public static params:IParamsState & IParamsActions & {$state:IParamsState};
	public static poll:IPollState & IPollActions & {$state:IPollState};
	public static prediction:IPredictionState & IPredictionActions & {$state:IPredictionState};
	public static raffle:IRaffleState & IRaffleActions & {$state:IRaffleState};
	public static stream:IStreamState & IStreamActions & {$state:IStreamState};
	public static timer:ITimerState & ITimerActions & {$state:ITimerState};
	public static triggers:ITriggersState & ITriggersActions & {$state:ITriggersState};
	public static tts:ITTSState & ITTSActions & {$state:ITTSState };
	public static users:IUsersState & IUsersActions & {$state:IUsersState};
	public static voice:IVoiceState & IVoiceActions & {$state:IVoiceState};
	public static main:IMainState & IMainActions & {$state:IMainState};
	
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
	pinedMessages:IRCEventDataList.Message[];
	activityFeed:ActivityFeedData[];
	emoteSelectorCache:{user:TwitchDataTypes.UserInfo, emotes:TwitchDataTypes.Emote[]}[],
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
	addChatMessage(payload:IRCEventData):Promise<void>;
	delChatMessage(messageId:string, deleteData?:PubSubDataTypes.ModerationData):void;
	delUserMessages(username:string):void;
	setEmoteSelectorCache(payload:{user:TwitchDataTypes.UserInfo, emotes:TwitchDataTypes.Emote[]}[]):void;
	closeWhispers( userID:string):void;
	doSearchMessages(value:string):void;
	updateBotMessage(value:{key:TwitchatDataTypes.BotMessageField, enabled:boolean, message:string}):void;
	shoutout(username:string):Promise<void>;
	setChatHighlightOverlayParams(params:TwitchatDataTypes.ChatHighlightOverlayData):void;
	setSpoilerParams(params:TwitchatDataTypes.SpoilerParamsData):void;
	pinMessage(message:IRCEventDataList.Message):void;
	unpinMessage(message:IRCEventDataList.Message):void;
	highlightChatMessageOverlay(payload:IRCEventDataList.Message|null):Promise<void>;
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
	setEmergencyMode(enable:boolean):void;
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
	data:TwitchDataTypes.Poll | null,
}

export interface IPollGetters {
}

export interface IPollActions {
	setPolls(data:TwitchDataTypes.Poll[], postOnChat?:boolean):void;
}




export interface IPredictionState {
	data:TwitchDataTypes.Prediction | null;
}

export interface IPredictionGetters {
}

export interface IPredictionActions {
	setPredictions(payload:TwitchDataTypes.Prediction[]):void;
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
	raiding: PubSubDataTypes.RaidInfos|undefined;
	playbackState: PubSubDataTypes.PlaybackInfo|undefined;
	communityBoostState: PubSubDataTypes.CommunityBoost|undefined;
	streamInfoPreset: TwitchatDataTypes.StreamInfoPreset[];
	lastRaiderLogin: string|undefined;
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
	ttsReadMessage(payload:IRCEventDataList.Message):void
	ttsReadUser(payload:{username:string, read:boolean}):void
	setTTSParams(params:TwitchatDataTypes.TTSParamsData):void
}




export interface IUsersState {
	users: TwitchatDataTypes.TwitchatUser[];
	userCard: string|null;
	pronouns: {[key:string]:string|boolean};
	onlineUsers: string[];
	trackedUsers: TrackedUser[];
	mods: TwitchDataTypes.ModeratorUser[];
	followingStates: {[key:string]:boolean};
	followingStatesByNames: {[key:string]:boolean};
	myFollowings: {[key:string]:boolean};
}

export interface IUsersGetters {
}

export interface IUsersActions {
	getUserFrom(source:TwitchatDataTypes.ChatSource, id?:string, login?:string, displayName?:string):TwitchatDataTypes.TwitchatUser|undefined;
	addUser(user:TwitchatDataTypes.TwitchatUser):void;
	openUserCard(payload:string|null):void;
	loadMyFollowings():Promise<void>;
	setViewersList(users:string[]):void;
	flagLowTrustMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number):void;
	trackUser(payload:IRCEventDataList.Message):void;
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