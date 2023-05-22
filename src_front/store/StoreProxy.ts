import type { TriggerActionCountDataAction, TriggerData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { SpotifyAuthResult, SpotifyAuthToken } from "@/utils/music/SpotifyDataTypes";
import type { PubSubDataTypes } from "@/utils/twitch/PubSubDataTypes";
import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import type VoiceAction from "@/utils/voice/VoiceAction";
import type { VoicemodTypes } from "@/utils/voice/VoicemodTypes";
import type { Composer, VueI18n } from "vue-i18n";
import type { Router } from "vue-router";

/**
* Created : 23/09/2022 
* This class only exists to solve the circular imports hell
*/
export default class StoreProxy {
	
	public static account:IAccountState & IAccountGetters & IAccountActions & {$state:IAccountState, $reset:()=>void};
	public static auth:IAuthState & IAuthGetters & IAuthActions & {$state:IAuthState, $reset:()=>void};
	public static automod:IAutomodState & IAutomodGetters & IAutomodActions & {$state:IAutomodState, $reset:()=>void};
	public static bingo:IBingoState & IBingoGetters & IBingoActions & {$state:IBingoState, $reset:()=>void};
	public static chat:IChatState & IChatGetters & IChatActions & {$state:IChatState, $reset:()=>void};
	public static chatSuggestion:IChatSuggestionState & IChatSuggestionGetters & IChatSuggestionActions & {$state:IChatSuggestionState, $reset:()=>void};
	public static emergency:IEmergencyState & IEmergencyGetters & IEmergencyActions & {$state:IEmergencyState, $reset:()=>void};
	public static music:IMusicState & IMusicGetters & IMusicActions & {$state:IMusicState, $reset:()=>void};
	public static obs:IOBSState & IOBSGetters & IOBSActions & {$state:IOBSState , $reset:()=>void};
	public static params:IParamsState & IParamsGetters & IParamsActions & {$state:IParamsState, $reset:()=>void};
	public static poll:IPollState & IPollGetters & IPollActions & {$state:IPollState, $reset:()=>void};
	public static prediction:IPredictionState & IPredictionGetters & IPredictionActions & {$state:IPredictionState, $reset:()=>void};
	public static raffle:IRaffleState & IRaffleGetters & IRaffleActions & {$state:IRaffleState, $reset:()=>void};
	public static stream:IStreamState & IStreamGetters & IStreamActions & {$state:IStreamState, $reset:()=>void};
	public static timer:ITimerState & ITimerGetters & ITimerActions & {$state:ITimerState, $reset:()=>void};
	public static triggers:ITriggersState & ITriggersGetters & ITriggersActions & {$state:ITriggersState, $reset:()=>void};
	public static tts:ITTSState & ITTSGetters & ITTSActions & {$state:ITTSState , $reset:()=>void};
	public static users:IUsersState & IUsersGetters & IUsersActions & {$state:IUsersState, $reset:()=>void};
	public static voice:IVoiceState & IVoiceGetters & IVoiceActions & {$state:IVoiceState, $reset:()=>void};
	public static main:IMainState & IMainGetters & IMainActions & {$state:IMainState, $reset:()=>void};
	public static debug:IDebugState & IDebugGetters & IDebugActions & {$state:IDebugState, $reset:()=>void};
	public static accessibility:IAccessibilityState & IAccessibilityGetters & IAccessibilityActions & {$state:IAccessibilityState, $reset:()=>void};
	public static admin:IAdminState & IAdminGetters & IAdminActions & {$state:IAdminState, $reset:()=>void};
	public static counters:ICountersState & ICountersGetters & ICountersActions & {$state:ICountersState, $reset:()=>void};
	public static rewards:IRewardsState & IRewardsGetters & IRewardsActions & {$state:IRewardsState, $reset:()=>void};
	public static i18n:VueI18n<{}, {}, {}, string, never, string, Composer<{}, {}, {}, string, never, string>>;
	public static router:Router;
	public static image:(path: string) => string;
	
}

export interface IMainState {
	/**
	 * Latest Twitchat update index
	 */
	latestUpdateIndex: number;
	/**
	 * Theme, light or dark mode
	 */
	theme: "light" | "dark";
	/**
	 * app ready ?
	 */
	initComplete: boolean;
	/**
	 * Toggle this value with "/devmode" command.
	 * Shows a debug menu to simulate any message on chat
	 */
	devmode: boolean;
	/**
	 * Method to call to trigger install of twitchat on the device
	 */
	ahsInstaller: TwitchatDataTypes.InstallHandler|null;
	/**
	 * Current alert data (user alert() to populate)
	 */
	alertData: string;
	/**
	 * Current tooltip data to display
	 */
	tooltip: string;
	/**
	 * Secret feature hehehe ( ͡~ ͜ʖ ͡°)
	 */
	cypherKey: string;
	/**
	 * Secret feature hehehe ( ͡~ ͜ʖ ͡°)
	 */
	cypherEnabled: boolean;
	/**
	 * Just a generic data storage for when I'm laszy to create a dedicated one
	 */
	tempStoreValue: unknown;
	/**
	 * If set, a confirmation window is opened
	 */
	confirmData:TwitchatDataTypes.ConfirmData|null;
	/**
	 * Chat alert feature parameters (see: params => cheat features => alert)
	 */
	chatAlertParams: TwitchatDataTypes.AlertParamsData;
	/**
	 * Message to be displayed by the chat alert feature
	 */
	chatAlert:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData|null;
	/**
	 * Contains the name of the current OBS scene (if OBS is connected)
	 */
	currentOBSScene:string;
	/**
	 * Hashmap linking an icon name to its SVG to avoid spamming useless
	 * requests
	 */
	iconCache:{[key:string]:string};
}

export interface IMainGetters {
}

export interface IMainActions {
	/**
	 * Toggle current theme (dark/light)
	 */
	toggleTheme(forced?:"light"|"dark"):Promise<void>;
	/**
	 * Reload all labels (use CTRL+Shift+M)
	 */
	reloadLabels():Promise<void>;
	/**
	 * Starts  the app
	 * @param authenticate whether we want to authenticate (ex:chat) or not (ex:home)
	 * @param callback 
	 */
	startApp(authenticate:boolean, callback:(value:unknown)=>void):Promise<void>;
	/**
	 * Loads data from local storage
	 */
	loadDataFromStorage():void;
	/**
	 * Opens up an alert at the top of the app on red bar
	 * @param message 
	 */
	alert(message:string):void;
	/**
	 * Opens up a confirm window requesting the user to confirm or cancel
	 * @param title 
	 * @param description 
	 * @param data 
	 * @param yesLabel 
	 * @param noLabel 
	 * @param STTOrigin is open from speech recognition ? If so, voice commands are displayed
	 */
	confirm<T>(title: string, description?: string, data?: T, yesLabel?:string, noLabel?:string, STTOrigin?:boolean): Promise<T|undefined>;
	/**
	 * Close confirm window
	 */
	closeConfirm():void;
	/**
	 * Open a tooltip
	 * @param text 
	 */
	openTooltip(text:string):void;
	/**
	 * Close currently opened tooltip
	 */
	closeTooltip():void;
	/**
	 * Secret feature hehehe ( ͡~ ͜ʖ ͡°)
	 */
	setCypherKey(key:string):void;
	/**
	 * Secret feature hehehe ( ͡~ ͜ʖ ͡°)
	 */
	setCypherEnabled(enabled:boolean):void;
	/**
	 * Enable/disable dev mode
	 * @param forcedState
	 */
	toggleDevMode(forcedState?:boolean):void;
	/**
	 * Sets the callback function to call in order to trigger
	 * the Twitchat installation process on the device
	 * @param value 
	 */
	setAhsInstaller(value:TwitchatDataTypes.InstallHandler):void;
	/**
	 * Sets chat alert feature params
	 * @param params 
	 */
	setChatAlertParams(params:TwitchatDataTypes.AlertParamsData):void;
	/**
	 * Opens the chat alert witht the specified message
	 * @param message 
	 */
	executeChatAlert(message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageWhisperData|null):Promise<void>;
}




export interface IAccountState {
	syncDataWithServer:TwitchatDataTypes.ParameterData<boolean>;
	publicDonation:TwitchatDataTypes.ParameterData<boolean>;
}

export interface IAccountGetters {
}

export interface IAccountActions {
}




export type IAuthState = {
	/**
	 * Is user authenticated
	 */
	authenticated: boolean;
	/**
	 * Contains the scope to request.
	 * Use anytime the user tries to click a feature that's missing
	 * a scope. The missing scope(s) is set here and the scope grant
	 * form is opened with the missing scope highlighted
	 */
	newScopesToRequest: TwitchScopesString[];
} & {
	/**
	 * Platforms sessions
	 */
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
	/**
	 * Request a twitch token refresh
	 * @param reconnectIRC 
	 * @param callback 
	 */
	twitch_tokenRefresh(reconnectIRC:boolean, callback?:(success:boolean)=>void):Promise<TwitchDataTypes.AuthTokenResult>;
	/**
	 * Authenticate with twitch
	 * @param code 
	 * @param cb 
	 */
	twitch_autenticate(code?:string, cb?:(success:boolean, betaRefused?:boolean)=>void):Promise<void>;
	/**
	 * Logs out the user
	 */
	logout():void;
	/**
	 * Request for new twitch scopes
	 * @param scopes 
	 */
	requestTwitchScopes(scopes:TwitchScopesString[]):void;
}




export interface IAutomodState {
	/**
	 * Automod parameters
	 */
	params:TwitchatDataTypes.AutomodParamsData;
}

export interface IAutomodGetters {
}

export interface IAutomodActions {
	/**
	 * Update automod parameters
	 * @param payload 
	 */
	setAutomodParams(payload:TwitchatDataTypes.AutomodParamsData):void;
}




export interface IBingoState {
	/**
	 * Current bingo data
	 */
	data:TwitchatDataTypes.BingoConfig | null;
}

export interface IBingoGetters {
}

export interface IBingoActions {
	/**
	 * Start a bingo session
	 * @param payload 
	 */
	startBingo(payload:TwitchatDataTypes.BingoConfig):void;
	/**
	 * Stops the bingo
	 */
	stopBingo():void;
	/**
	 * Check if the given user message matches the bingo answer
	 * @param message 
	 */
	checkBingoWinner(message:TwitchatDataTypes.MessageChatData):void;
}




export interface IChatState {
	/**
	 * Contains the current search term to find on chat messages
	 * Opens a search result list showing any message containing the search
	 */
	searchMessages:string;
	/**
	 * Number of messages to keep in memory
	 */
	realHistorySize:number;
	/**
	 * Message to reply to
	 */
	replyTo:TwitchatDataTypes.MessageChatData|null;
	/**
	 * Number of whispers not read
	 */
	whispersUnreadCount:number;
	/**
	 * Lists of pinned messages.
	 * Contains all the messages pinned via twitch feautre as well
	 * as all messages "saved" via the "save" option on right click
	 */
	pinedMessages:(TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData)[];
	/**
	 * Emote cache for the emote selector for faster init later
	 */
	emoteSelectorCache:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[],
	/**
	 * Received whispers
	 */
	whispers:{[key:string]:TwitchatDataTypes.MessageWhisperData[]};
	/**
	 * List of message templates sent by some feature.
	 * Ex: ad, bingo, raffle, .., messages
	 */
	botMessages:TwitchatDataTypes.IBotMessage,
	/**
	 * Available slash commands
	 */
	commands:TwitchatDataTypes.CommandData[],
	/**
	 * Spoiler feature parameters
	 */
	spoilerParams:TwitchatDataTypes.SpoilerParamsData,
	/**
	 * Is a message highlighted on the overlay
	 */
	isChatMessageHighlighted: boolean;
	/**
	 * Parameters of the chat highlight overlay.
	 * Contains the position on screen of the overlay
	 */
	chatHighlightOverlayParams: TwitchatDataTypes.ChatHighlightParams;
	/**
	 * True when using /spam command to send fake messages on chat
	 */
	spamingFakeMessages:boolean;
}

export interface IChatGetters {
	/**
	 * Get all chat messages
	 */
	messages:TwitchatDataTypes.ChatMessageTypes[];
}

export interface IChatActions {
	/**
	 * Sends a twitchat ad
	 */
	sendTwitchatAd(contentID?:TwitchatDataTypes.TwitchatAdStringTypes):void;
	/**
	 * Sends the "hey try to right click here" message
	 */
	sendRightClickHint():void;
	/**
	 * Add a message to the chat history
	 * @param message 
	 */
	addMessage(message:TwitchatDataTypes.ChatMessageTypes):Promise<void>;
	/**
	 * Delete a message
	 * @param message 
	 * @param deleteData 
	 * @param callEndpoint 
	 */
	deleteMessage(message:TwitchatDataTypes.ChatMessageTypes, deleteData?:TwitchatDataTypes.TwitchatUser, callEndpoint?:boolean):void;
	/**
	 * Delete a message by its ID
	 * @param messageID 
	 * @param deleteData 
	 * @param callEndpoint 
	 */
	deleteMessageByID(messageID:string, deleteData?:TwitchatDataTypes.TwitchatUser, callEndpoint?:boolean):void;
	/**
	 * Delete all messages of a channel
	 * @param channelId 
	 */
	delChannelMessages(channelId:string):void;
	/**
	 * Deletes the messages of a user
	 */
	delUserMessages(uid:string, channelId:string):void;
	/**
	 * Sets the emote cache for the emote selector for faster init
	 * @param payload 
	 */
	setEmoteSelectorCache(payload:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[]):void;
	/**
	 * Close whispers window
	 * @param userID 
	 */
	closeWhispers( userID:string):void;
	/**
	 * Search for messages
	 * @param value 
	 */
	doSearchMessages(value:string):void;
	/**
	 * Update one of the message templates
	 * @param value 
	 */
	updateBotMessage(value:{key:TwitchatDataTypes.BotMessageField, enabled:boolean, message:string}):void;
	/**
	 * Update the chat highlight overlay params
	 * @param params 
	 */
	setChatHighlightOverlayParams(params:TwitchatDataTypes.ChatHighlightParams):void;
	/**
	 * Update spoiler feature params
	 * @param params 
	 */
	setSpoilerParams(params:TwitchatDataTypes.SpoilerParamsData):void;
	/**
	 * Save a message.
	 * Saved messages are displayed on a dedicated window to avoid loosing them
	 * @param message 
	 */
	saveMessage(message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData):void;
	/**
	 * Remove a message from the saved ones
	 * @param message 
	 */
	unsaveMessage(message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData):void;
	/**
	 * Show a message on the chat highlight overlay
	 * @param message 
	 */
	highlightChatMessageOverlay(message?:TwitchatDataTypes.ChatMessageTypes):Promise<void>;
	/**
	 * Flag a message as suspicious.
	 * Called by pubsub (or eventsub if i could migrate there since then) to
	 * flag a message. We first receive the message from IRC then pubsub sends
	 * a message to tell us that the user is suspicious and we need to flag their message
	 * @param data 
	 * @param retryCount 
	 */
	flagSuspiciousMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number):Promise<void>;
	/**
	 * Flags a message as their first one today
	 * @param message 
	 * @param user 
	 */
	flagMessageAsFirstToday(message:TwitchatDataTypes.GreetableMessage, user:TwitchatDataTypes.TwitchatUser):void;
}




export interface IChatSuggestionState {
	/**
	 * Current chat suggestion data
	 */
	data: TwitchatDataTypes.ChatSuggestionData | null,
}

export interface IChatSuggestionGetters {
}

export interface IChatSuggestionActions {
	/**
	 * Start a chat suggestion session
	 * @param payload 
	 */
	setChatSuggestion(payload:TwitchatDataTypes.ChatSuggestionData|null):void;
	/**
	 * Add a message to the suggestions if it matches the params
	 * @param message 
	 */
	addChatSuggestion(message:TwitchatDataTypes.MessageChatData):void;
}




export interface IDebugState {
}

export interface IDebugGetters {
}

export interface IDebugActions {
	/**
	 * Sends a fake message of the specified type on chat
	 * @param type 
	 * @param hook 
	 * @param postOnChat 
	 * @param allowConversations 
	 */
	simulateMessage(type:TwitchatDataTypes.TwitchatMessageStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>void, postOnChat?:boolean, allowConversations?:boolean):Promise<TwitchatDataTypes.ChatMessageTypes>;
	/**
	 * Sends a fake notice of the specified type on chat
	 * @param type 
	 * @param hook 
	 * @param postOnChat 
	 * @param allowConversations 
	 */
	simulateNotice(noticeType?:TwitchatDataTypes.TwitchatNoticeStringType, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>void, postOnChat?:boolean):Promise<TwitchatDataTypes.ChatMessageTypes>;
	/**
	 * Sends a random fake message of any type
	 * @param postOnChat 
	 * @param forcedMessage 
	 * @param hook 
	 */
	sendRandomFakeMessage(postOnChat:boolean, forcedMessage?:string, hook?:(message:TwitchatDataTypes.ChatMessageTypes)=>void, forcedType?:TwitchatDataTypes.TwitchatMessageStringType):Promise<TwitchatDataTypes.ChatMessageTypes>;
}




export interface IEmergencyState {
	/**
	 * Is the mergency mode started ?
	 */
	emergencyStarted:boolean,
	/**
	 * Emergency mode params
	 */
	params:TwitchatDataTypes.EmergencyParamsData,
	/**
	 * List of followers that occured during the emergency
	 */
	follows: TwitchatDataTypes.MessageFollowingData[],
}

export interface IEmergencyGetters {
}

export interface IEmergencyActions {
	/**
	 * Sets the emergency mode aprams
	 * @param params 
	 */
	setEmergencyParams(params:TwitchatDataTypes.EmergencyParamsData):void;
	/**
	 * Enable/disable the emergency mode
	 * @param enable 
	 */
	setEmergencyMode(enable:boolean):Promise<void>;
	/**
	 * Add a follower event to the list of users that followed
	 * during an emergency
	 * @param payload 
	 */
	addEmergencyFollower(payload:TwitchatDataTypes.MessageFollowingData):void;
	/**
	 * Clear the emergency followers list
	 */
	clearEmergencyFollows():void;
	/**
	 * Check if the specified message contains the chat command
	 * that can start the emergency mode.
	 * @param message 
	 * @param cmd 
	 */
	handleChatCommand(message:TwitchatDataTypes.MessageChatData, cmd:string):Promise<void>;
}




export interface IMusicState {
	/**
	 * Spotify app params
	 */
	spotifyAuthParams: SpotifyAuthResult|null;
	/**
	 * Current Spotify auth token
	 */
	spotifyAuthToken: SpotifyAuthToken|null;
	/**
	 * Is deezer connected
	 * @deprecated not used since deezer killed the possibility to control playback
	 */
	deezerConnected: boolean;
	/**
	 * Music player overlay params.
	 */
	musicPlayerParams:TwitchatDataTypes.MusicPlayerParamsData,
}

export interface IMusicGetters {
}

export interface IMusicActions {
	/**
	 * Sets the spotify OAuth result after going through
	 * the OAuth process
	 * @param value 
	 */
	setSpotifyAuthResult(value:SpotifyAuthResult|null):void;
	/**
	 * Sets if deezer is connected or not
	 * @param value 
	 * @deprecated not used since deezer killed the possibility to control playback
	 */
	setDeezerConnected(value:boolean):void;
}




export interface IOBSState {
	/**
	 * Is OBS connected ?
	 */
	connectionEnabled:boolean|null;
	/**
	 * Scenes to chat command
	 */
	sceneCommands:TwitchatDataTypes.OBSSceneCommand[];
	/**
	 * Mute/Unmute OBS mic parameters
	 */
	muteUnmuteCommands:TwitchatDataTypes.OBSMuteUnmuteCommands,
	/**
	 * Contains who's allowed to use OBS chat commands
	 */
	commandsPermissions:TwitchatDataTypes.PermissionsData,
}

export interface IOBSGetters {
}

export interface IOBSActions {
	/**
	 * Set OBS scenes chat commands params
	 * @param value 
	 */
	setOBSSceneCommands(value:TwitchatDataTypes.OBSSceneCommand[]):void;
	/**
	 * Set OBS mute/unmute chat commands params
	 * @param value 
	 */
	setOBSMuteUnmuteCommands(value:TwitchatDataTypes.OBSMuteUnmuteCommands):void;
	/**
	 * Set OBS chat commands permissions
	 * @param value 
	 */
	setObsCommandsPermissions(value:TwitchatDataTypes.PermissionsData):void;
	/**
	 * Check if the specified message matches any of the OBS chat commands
	 * @param message 
	 * @param cmd 
	 */
	handleChatCommand(message:TwitchatDataTypes.MessageChatData, cmd?:string):Promise<void>;
}




export interface IParamsState {
	/**
	 * Current parameters page to be displayed
	 */
	currentPage:TwitchatDataTypes.ParameterPagesStringType;
	/**
	 * Just a storage for an optionnal "currentPage" sub parameter.
	 * Ex: Used to expand a specific overlay section on the Overlays page.
	 */
	currentPageSubContent:TwitchatDataTypes.ParamDeepSectionsStringType|"";
	/**
	 * Current parameters search
	 * Set when using the search form at the top of the parameters homepage
	 */
	currentParamSearch:string;
	/**
	 * Current modal to open
	 */
	currentModal:TwitchatDataTypes.ModalTypes;
	/**
	 * Duration after which a 1st user message today is removed from the list
	 */
	greetThemAutoDelete:number;
	/**
	 * Chat features parameters
	 */
	features:{[key:string]:TwitchatDataTypes.ParameterData<unknown>};
	/**
	 * Chat appaearance parameters
	 */
	appearance:{[key:string]:TwitchatDataTypes.ParameterData<unknown>};
	/**
	 * Chat columns definitions
	 */
	chatColumnsConfig:TwitchatDataTypes.ChatColumnsConfig[];
}

export interface IParamsGetters {
}

export interface IParamsActions {
	/**
	 * Call when a chat features or chat appearance parameter is updated
	 * Triggers a data save
	 */
	updateParams():void;
	/**
	 * Create a new chat colum
	 * @param after 
	 */
	addChatColumn(after?:TwitchatDataTypes.ChatColumnsConfig):TwitchatDataTypes.ChatColumnsConfig;
	/**
	 * Delete a chat columns
	 * @param column 
	 */
	delChatColumn(column:TwitchatDataTypes.ChatColumnsConfig):void;
	/**
	 * Move a chat column
	 * @param column 
	 * @param direction -1=left/top; 1=right/bottom
	 */
	moveChatColumn(column:TwitchatDataTypes.ChatColumnsConfig, direction:-1|1):void;
	/**
	 * Save all chat columns configs
	 */
	saveChatColumnConfs():void;
	/**
	 * Update the duration after which a 1st user message of the day is removed
	 * from the greet them feed
	 * @param value 
	 */
	setGreetThemAutoDelete(value:number):void;
	/**
	 * Open a specific parameters page
	 * @param value 
	 */
	openParamsPage(value:TwitchatDataTypes.ParameterPagesStringType, subContent?:TwitchatDataTypes.ParamDeepSectionsStringType):void;
	/**
	 * Close parameters
	 */
	closeParameters():void;
	/**
	 * Search for a specific param
	 * @param search 
	 */
	searchParam(search:string):void;
	/**
	 * Search for a specific param by its data path (ex: features.markAsRead)
	 * @param search 
	 */
	searchParamByPath(search:string):void;
	/**
	 * Open the specified modal
	 * @param modal 
	 */
	openModal(modal:TwitchatDataTypes.ModalTypes):void;
	/**
	 * Closes currently opened modal
	 */
	closeModal():void;
}




export interface IPollState {
	/**
	 * Current poll data
	 */
	data:TwitchatDataTypes.MessagePollData | null,
}

export interface IPollGetters {
}

export interface IPollActions {
	/**
	 * Set current poll data
	 * @param data 
	 * @param postOnChat 
	 */
	setCurrentPoll(data:TwitchatDataTypes.MessagePollData|null, postOnChat?:boolean):void;
}




export interface IPredictionState {
	/**
	 * Current prediction data
	 */
	data:TwitchatDataTypes.MessagePredictionData | null;
}

export interface IPredictionGetters {
}

export interface IPredictionActions {
	/**
	 * Set current prediction data
	 */
	setPrediction(payload:TwitchatDataTypes.MessagePredictionData|null, postOnChat?:boolean):void;
}




export interface IRaffleState {
	/**
	 * Current raffle data
	 */
	data:TwitchatDataTypes.RaffleData|null;
}

export interface IRaffleGetters {
}

export interface IRaffleActions {
	/**
	 * Start a raffle
	 * @param payload 
	 */
	startRaffle(payload:TwitchatDataTypes.RaffleData):Promise<void>;
	/**
	 * Close a raffle
	 */
	stopRaffle():void;
	/**
	 * Set a raffle's winner
	 * @param winner 
	 * @param publish 
	 */
	onRaffleComplete(winner:TwitchatDataTypes.RaffleEntry, publish?:boolean):void;
	/**
	 * Check if the specified message contains the commande to join
	 * any currently opened raffle
	 * @param message 
	 */
	checkRaffleJoin(message:TwitchatDataTypes.ChatMessageTypes):Promise<void>;
	/**
	 * Pick a random winner amongst the users that joined the raffmle
	 * @param forcedData 
	 * @param forcedWinner 
	 */
	pickWinner(forcedData?:TwitchatDataTypes.RaffleData, forcedWinner?:TwitchatDataTypes.RaffleEntry):Promise<void>;
}




export interface IStreamState {
	/**
	 * Current hype train data
	 */
	hypeTrain: TwitchatDataTypes.HypeTrainStateData|undefined;
	/**
	 * Current outgoing raid info
	 */
	currentRaid: TwitchatDataTypes.RaidInfo|undefined;
	/**
	 * Current community boost info if any
	 */
	communityBoostState: TwitchatDataTypes.CommunityBoost|undefined;
	/**
	 * Stream info presets params
	 */
	streamInfoPreset: TwitchatDataTypes.StreamInfoPreset[];
	/**
	 * Info about the latest received raid
	 */
	lastRaider: TwitchatDataTypes.TwitchatUser|undefined;
	/**
	 * Current stream info
	 */
	currentStreamInfo: {[key in string]:TwitchatDataTypes.StreamInfo|undefined};
	/**
	 * Date at which the current commercial will end
	 */
	commercialEnd: number;
	/**
	 * Date at which we can start a new commercial
	 */
	startAdCooldown: number,
	/**
	 * Can we start an ad ?
	*/
	canStartAd: boolean,
	/**
	 * Is shield mode enabled?
	 */
	shieldModeEnabled: boolean,
	/**
	 * Room settings for each platforms
	 */
	roomSettings:{[key in string]:TwitchatDataTypes.IRoomSettings|undefined};
}

export interface IStreamGetters {
}

export interface IStreamActions {
	/**
	 * Set current stream info
	 * @param platform 
	 * @param title 
	 * @param categoryID 
	 * @param channelId 
	 * @param tags 
	 */
	setStreamInfos(platform:TwitchatDataTypes.ChatPlatform, title:string, categoryID:string, channelId:string, tags?:string[]):Promise<void>
	/**
	 * Set outgoing raid info
	 * @param infos 
	 */
	setRaiding(infos:TwitchatDataTypes.RaidInfo|undefined):void;
	/**
	 * Update room settings
	 * @param channelId 
	 * @param settings 
	 */
	setRoomSettings(channelId:string, settings:TwitchatDataTypes.IRoomSettings):void;
	/**
	 * Set current hyper train info
	 * @param data 
	 */
	setHypeTrain(data:TwitchatDataTypes.HypeTrainStateData|undefined):void;
	/**
	 * Set playback state (viewer count)
	 * @param channelId 
	 * @param value 
	 */
	setPlaybackState(channelId:string, value:PubSubDataTypes.PlaybackInfo|undefined):void;
	/**
	 * Called when stream starts.
	 * Disable emote-only if requested
	 * @param channelId 
	 */
	setStreamStart(channelId:string):void;
	/**
	 * Called when stream ends.
	 * Enable emote-only if requested
	 * @param channelId 
	 */
	setStreamStop(channelId:string):void;
	/**
	 * Set current community boost info
	 * @param value 
	 */
	setCommunityBoost(value:TwitchatDataTypes.CommunityBoost|undefined):void;
	/**
	 * Save a new stream info preset
	 * @param preset 
	 */
	saveStreamInfoPreset(preset:TwitchatDataTypes.StreamInfoPreset):void;
	/**
	 * Delete a stream info preset
	 * @param preset 
	 */
	deleteStreamInfoPreset(preset:TwitchatDataTypes.StreamInfoPreset):void;
	/**
	 * Set the date at which the current commervial ends
	 * @param date 
	 */
	setCommercialEnd(date:number):void;
	/**
	 * Starts a commercial break
	 * @param duration 
	 */
	startCommercial(duration:number):void;
}




export interface ITimerState {
	/**
	 * Date at which the current timer started
	 */
	timerStartDate: number;
	/**
	 * Offset to apply to the current timer.
	 * Allows to add or remove to from a the timer
	 */
	timerOffset: number;
	/**
	 * Current countdown info
	 */
	countdown: TwitchatDataTypes.CountdownData|null;
}

export interface ITimerGetters {
}

export interface ITimerActions {
	/**
	 * Braodcast current timer and countdown statesvia the PublicAPI
	 */
	boradcastStates():void;
	/**
	 * Start the timer
	 */
	timerStart():void;
	/**
	 * Add a duration to the timer
	 * @param duration_ms 
	 */
	timerAdd(duration_ms:number):void;
	/**
	 * Remove a duration from the timer
	 * @param duration_ms 
	 */
	timerRemove(duration_ms:number):void;
	/**
	 * Stop the timer
	 */
	timerStop():void;
	/**
	 * Start the countdown
	 * @param durEation_ms 
	 */
	countdownStart(durEation_ms:number):void;
	/**
	 * Add a duration to the countdown
	 * @param duration_ms 
	 */
	countdownAdd(duration_ms:number):void;
	/**
	 * Remove a duration from the countdown
	 * @param duration_ms 
	 */
	countdownRemove(duration_ms:number):void;
	/**
	 * Stop the countdown
	 */
	countdownStop():void;
}




export interface ITriggersState {
	/**
	 * contains all the triggers defintions
	 */
	triggerList: TriggerData[];
}

export interface ITriggersGetters {
	/**
	 * Get all available trigger queues
	 */
	queues: string[];
}

export interface ITriggersActions {
	/**
	 * Add a new trigger
	 * @param data 
	 */
	addTrigger(data:TriggerData):void;
	/**
	 * Save all triggers params
	 */
	saveTriggers():void;
	/**
	 * Delete a trigger by its ID
	 * @param id
	 */
	deleteTrigger(id:string):void;
	/**
	 * Called when an OBS source is renamed.
	 * Parses all triggers that have a reference to that source
	 * and rename it everywhere
	 * @param oldName 
	 * @param newName 
	 */
	renameOBSSource(oldName:string, newName:string):void;
	/**
	 * Called when an OBS scene is renamed.
	 * Parses all triggers that have a reference to that scene
	 * and rename it everywhere
	 * @param oldName 
	 * @param newName 
	 */
	renameOBSScene(oldSceneName:string, sceneName:string):void;
	/**
	 * Called when an OBS filter is renamed.
	 * Parses all triggers that have a reference to that filter
	 * and rename it everywhere
	 * @param oldName 
	 * @param newName 
	 */
	renameOBSFilter(sourceName:string, oldFilterName:string, filterName:string):void;
	/**
	 * Called when a counter placeholder is renamed.
	 * Parses all triggers that have a reference to that placeholder
	 * and rename it everywhere
	 * @param oldName 
	 * @param newName 
	 */
	renameCounterPlaceholder(oldName:string, newName:string):void;
}




export interface ITTSState {
	/**
	 * If text to speach reading a message?
	 */
	speaking: boolean,
	/**
	 * Text to speech params
	 */
	params:TwitchatDataTypes.TTSParamsData,
}

export interface ITTSGetters {
}

export interface ITTSActions {
	/**
	 * Read a message via TTS
	 * @param message 
	 */
	ttsReadMessage(message:TwitchatDataTypes.ChatMessageTypes):void
	/**
	 * Start/stop reading any incoming message of a user
	 * @param user 
	 * @param read 
	 */
	ttsReadUser(user:TwitchatDataTypes.TwitchatUser, read:boolean):void
	/**
	 * Set text to speech params
	 * @param params
	 */
	setTTSParams(params:TwitchatDataTypes.TTSParamsData):void
}




export interface IUsersState {
	/**
	 * Current user to display on the user card
	 */
	userCard: {
		user:TwitchatDataTypes.TwitchatUser|null,
		channelId?:string,
	}|null;
	/**
	 * List of blocked users by platform
	 */
	blockedUsers: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
	/**
	 * List of accounts I follow by platform
	 */
	myFollowings: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
	/**
	 * List of users follwing me by platform
	 */
	myFollowers: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:number}};
	/**
	 * List of known bots by platform
	 */
	knownBots: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
	/**
	 * Contains all the shoutout made per channel.
	 * Also contains pending shoutouts.
	 * If doing a shoutout while the endpoint is cooling down
	 * the user is added to this list for later process
	 */
	pendingShoutouts:Partial<{[key:string]:TwitchatDataTypes.ShoutoutHistoryItem[]}>;
}

export interface IUsersGetters {
	/**
	 * Get all users
	 */
	users:TwitchatDataTypes.TwitchatUser[];
}

export interface IUsersActions {
	/**
	 * Set a bots hashmap for the speified platforms
	 * @param platform 
	 * @param hashmap 
	 */
	setBotsMap(platform:TwitchatDataTypes.ChatPlatform, hashmap:{[key:string]:boolean}):void;
	/**
	 * Check if the specified user is following
	 * @param platform 
	 * @param login 
	 */
	isAFollower(platform:TwitchatDataTypes.ChatPlatform, login:string):boolean;
	/**
	 * Loads channel's moderators
	 * @param channelId 
	 */
	preloadTwitchModerators(channelId:string):Promise<void>;
	/**
	 * Load currently banned accounts
	 * @param channelId 
	 */
	preloadUserBanStates(channelId:string):Promise<void>;
	/**
	 * Get a user from their id nor login.
	 * Asynchronously load any missing data if necessary.
	 * Async loading are batched if the function is called sequentially for many users
	 * 
	 * @param platform 
	 * @param channelId 
	 * @param id 
	 * @param login 
	 * @param displayName 
	 * @param loadCallback 
	 * @param forcedFollowState 
	 * @param getPronouns 
	 */
	getUserFrom(platform:TwitchatDataTypes.ChatPlatform, channelId?:string, id?:string, login?:string, displayName?:string, loadCallback?:(user:TwitchatDataTypes.TwitchatUser)=>void, forcedFollowState?:boolean, getPronouns?:boolean):TwitchatDataTypes.TwitchatUser;
	/**
	 * Load a list of the blocked users
	 */
	initBlockedUsers():Promise<void>;
	/**
	 * Flag a user as moderator
	 * @param platform 
	 * @param channelId 
	 * @param uid 
	 */
	flagMod(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	/**
	 * Flag a user as not a moderator
	 * @param platform 
	 * @param channelId 
	 * @param uid 
	 */
	flagUnmod(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	/**
	 * Flag a user as a VIP
	 * @param platform 
	 * @param channelId 
	 * @param uid 
	 */
	flagVip(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	/**
	 * Flag a user as not a VIP
	 * @param platform 
	 * @param channelId 
	 * @param uid 
	 */
	flagUnvip(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	/**
	 * Flag a user as blocked
	 * @param platform 
	 * @param uid 
	 */
	flagBlocked(platform:TwitchatDataTypes.ChatPlatform, uid:string):void;
	/**
	 * Flag a user as not blocked
	 * @param platform 
	 * @param uid 
	 */
	flagUnblocked(platform:TwitchatDataTypes.ChatPlatform, uid:string):void;
	/**
	 * Flag a user as banned
	 * @param platform 
	 * @param channelId 
	 * @param uid 
	 * @param duration_s 
	 */
	flagBanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string, duration_s?:number):void;
	/**
	 * Flag a user as not banned
	 * @param platform 
	 * @param channelId 
	 * @param uid 
	 */
	flagUnbanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string):void;
	/**
	 * Flag users as online
	 * @param platform 
	 * @param channelId 
	 */
	flagOnlineUsers(users:TwitchatDataTypes.TwitchatUser[], channelId:string):void;
	/**
	 * Flag users as offline
	 * @param platform 
	 * @param channelId 
	 */
	flagOfflineUsers(users:TwitchatDataTypes.TwitchatUser[], channelId:string):void;
	/**
	 * Check if a user is a follower
	 * @param user 
	 * @param channelId 
	 */
	checkFollowerState(user:TwitchatDataTypes.TwitchatUser, channelId:string):Promise<boolean>;
	/**
	 * Load pronouns of a user
	 * @param user 
	 */
	loadUserPronouns(user:TwitchatDataTypes.TwitchatUser):Promise<void>;
	/**
	 * Flag a user as a follower
	 * @param user 
	 * @param channelId 
	 */
	flagAsFollower(user:TwitchatDataTypes.TwitchatUser, channelId:string):void;
	/**
	 * Open the user card of the specified user
	 * Close the window if user is set to null
	 * @param user 
	 * @param channelId 
	 */
	openUserCard(user:TwitchatDataTypes.TwitchatUser|null, channelId?:string):void;
	/**
	 * Load my following list
	 */
	loadMyFollowings():Promise<void>;
	/**
	 * Load my followers list
	 */
	loadMyFollowers():Promise<void>;
	/**
	 * Start track a user's messages
	 * All their messages will be highlighted on chat
	 * @param user 
	 */
	trackUser(user:TwitchatDataTypes.TwitchatUser):void;
	/**
	 * Stop tracking a user's message
	 * @param user 
	 */
	untrackUser(user:TwitchatDataTypes.TwitchatUser):void;
	/**
	 * Sends a shoutout to a user
	 * @param channelId 
	 * @param user 
	 * @returns if SO has been done or not
	 */
	shoutout(channelId:string, user:TwitchatDataTypes.TwitchatUser, fromQueue?:boolean):Promise<boolean>;
	/**
	 * Execute any pending shoutout
	 */
	executePendingShoutouts():void;
}




export interface IVoiceState {
	/**
	 * Speech to text voice actions
	 */
	voiceActions: VoiceAction[];
	/**
	 * Speech tot ext language
	 */
	voiceLang: string;
	/**
	 * Current speech to text recognition result
	 */
	voiceText: {
		tempText:string;
		rawTempText:string;
		finalText:string;
	},
	/**
	 * Current voicemod voice effect
	 */
	voicemodCurrentVoice:VoicemodTypes.Voice,
	/**
	 * Voicemod chat command params
	 */
	voicemodParams:TwitchatDataTypes.VoicemodParamsData,
}

export interface IVoiceGetters {
}

export interface IVoiceActions {
	/**
	 * Set speech to text language
	 * @param value 
	 */
	setVoiceLang(value:string):void;
	/**
	 * Set voice actions
	 */
	setVoiceActions(value:VoiceAction[]):void;
	/**
	 * Set current voicemode voice
	 */
	setVoicemodParams(payload:TwitchatDataTypes.VoicemodParamsData):void;
}




export interface IAccessibilityState {
	/**
	 * Accessibility text changed on each message received
	 */
	ariaPolite:string;
}

export interface IAccessibilityGetters {
}

export interface IAccessibilityActions {
	/**
	 * Set current accessibility text message
	 * @param value 
	 */
	setAriaPolite(value:string):void;
}




export interface IAdminState {
}

export interface IAdminGetters {
}

export interface IAdminActions {
	/**
	 * Add a user the beta testers
	 * @param login 
	 */
	addBetaUser(login:string):Promise<void>;
	/**
	 * Remove a user from the beta testers
	 * @param login 
	 */
	removeBetaUser(login:string):Promise<void>;
	/**
	 * Migrate beta tester user's data to production
	 */
	migrateUserDataToProd(login:string):Promise<void>;
	/**
	 * Clear all beta testers
	 */
	removeAllBetaUser():Promise<void>;
}




export interface ICountersState {
	/**
	 * All counters
	 */
	counterList:TwitchatDataTypes.CounterData[];
}

export interface ICountersGetters {
}

export interface ICountersActions {
	/**
	 * Create a new counter
	 * @param data 
	 */
	addCounter(data:TwitchatDataTypes.CounterData):void;
	/**
	 * Update a counter's parameters
	 * @param data 
	 */
	updateCounter(data:TwitchatDataTypes.CounterData):void;
	/**
	 * Broadcast a counter's value on public API
	 * @param id 
	 */
	broadcastCounterValue(id:string):void;
	/**
	 * Delete a counter
	 * @param data 
	 */
	delCounter(data:TwitchatDataTypes.CounterData):void;
	/**
	 * Add a value to the specified counter
	 * When edditing a per-user counter it's possible to either give a user
	 * instance of the user to update and all related triggers (looped, maxed, mined,...)
	 * will be executed.
	 * If updating LOTS of users at once, it's preferable to only give the userId to
	 * in which case triggers won't be executed
	 * @param id 
	 * @param action 
	 * @param value 
	 * @param user 
	 * @param userId 
	 */
	increment(id:string, action:TriggerActionCountDataAction, value:number, user?:TwitchatDataTypes.TwitchatUser, userId?:string):void;
}




export interface IRewardsState {
	/**
	 * Twitch channel point rewards list of the authenticated user
	 */
	rewardList:TwitchDataTypes.Reward[];
}

export interface IRewardsGetters {
}

export interface IRewardsActions {
	/**
	 * Load twitch channel point rewards
	 */
	loadRewards():Promise<TwitchDataTypes.Reward[]>;
}