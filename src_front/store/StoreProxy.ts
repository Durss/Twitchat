import type HeatEvent from "@/events/HeatEvent";
import type { GoXLRTypes } from "@/types/GoXLRTypes";
import type { HeatScreen } from "@/types/HeatDataTypes";
import type { LabelItemData, LabelItemPlaceholder, LabelItemPlaceholderList } from "@/types/ILabelOverlayData";
import type { IHttpPlaceholder, TriggerActionCountDataAction, TriggerActionHTTPCallData, TriggerActionPlayabilityData, TriggerActionTypes, TriggerCallStack, TriggerData, SettingsExportData, TriggerTreeItemData } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { SpotifyAuthResult, SpotifyAuthToken } from "@/types/spotify/SpotifyDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import type { YoutubeAuthResult, YoutubeAuthToken } from "@/types/youtube/YoutubeDataTypes";
import type { TwitchScopesString } from "@/utils/twitch/TwitchScopes";
import type VoiceAction from "@/utils/voice/VoiceAction";
import type { VoicemodTypes } from "@/utils/voice/VoicemodTypes";
import type { YoutubeScopesString } from "@/utils/youtube/YoutubeScopes";
import type { StreamerbotAction } from "@streamerbot/client";
import type Groq from "groq-sdk";
import type { Composer, VueI18n } from "vue-i18n";
import type { Router } from "vue-router";
import type { ElevenLabsModel, ElevenLabsVoice } from "./elevenlabs/storeElevenLabs";
import type { LumiaVoiceList } from "./lumia/storeLumia";
import type { IPatreonMember, IPatreonTier } from "./patreon/storePatreon";
import type { PollOverlayParamStoreData } from "./poll/storePoll";
import type { PredictionOverlayParamStoreData } from "./prediction/storePrediction";
import type { TiltifyCampaign, TiltifyToken, TiltifyUser } from "./tiltify/storeTiltify";
import type { Lense, Video } from "./streamfog/storeStreamfog";

/**
* Created : 23/09/2022
* This class only exists to solve the circular imports hell
*/
export default class StoreProxy {
	public static account:IAccountState & IAccountGetters & IAccountActions & {$state:IAccountState, $reset:()=>void};
	public static auth:IAuthState & IAuthGetters & IAuthActions & {$state:IAuthState, $reset:()=>void};
	public static automod:IAutomodState & IAutomodGetters & IAutomodActions & {$state:IAutomodState, $reset:()=>void};
	public static bingo:IBingoState & IBingoGetters & IBingoActions & {$state:IBingoState, $reset:()=>void};
	public static bingoGrid:IBingoGridState & IBingoGridGetters & IBingoGridActions & {$state:IBingoGridState, $reset:()=>void};
	public static chat:IChatState & IChatGetters & IChatActions & {$state:IChatState, $reset:()=>void};
	public static chatSuggestion:IChatSuggestionState & IChatSuggestionGetters & IChatSuggestionActions & {$state:IChatSuggestionState, $reset:()=>void};
	public static emergency:IEmergencyState & IEmergencyGetters & IEmergencyActions & {$state:IEmergencyState, $reset:()=>void};
	public static music:IMusicState & IMusicGetters & IMusicActions & {$state:IMusicState, $reset:()=>void};
	public static obs:IOBSState & IOBSGetters & IOBSActions & {$state:IOBSState , $reset:()=>void};
	public static params:IParamsState & IParamsGetters & IParamsActions & {$state:IParamsState, $reset:()=>void};
	public static poll:IPollState & IPollGetters & IPollActions & {$state:IPollState, $reset:()=>void};
	public static chatPoll:IChatPollState & IChatPollGetters & IChatPollActions & {$state:IChatPollState, $reset:()=>void};
	public static prediction:IPredictionState & IPredictionGetters & IPredictionActions & {$state:IPredictionState, $reset:()=>void};
	public static raffle:IRaffleState & IRaffleGetters & IRaffleActions & {$state:IRaffleState, $reset:()=>void};
	public static stream:IStreamState & IStreamGetters & IStreamActions & {$state:IStreamState, $reset:()=>void};
	public static timers:ITimerState & ITimerGetters & ITimerActions & {$state:ITimerState, $reset:()=>void};
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
	public static heat:IHeatState & IHeatGetters & IHeatActions & {$state:IHeatState, $reset:()=>void};
	public static patreon:IPatreonState & IPatreonGetters & IPatreonActions & {$state:IPatreonState, $reset:()=>void};
	public static youtube:IYoutubeState & IYoutubeGetters & IYoutubeActions & {$state:IYoutubeState, $reset:()=>void};
	public static values:IValuesState & IValuesGetters & IValuesActions & {$state:IValuesState, $reset:()=>void};
	public static extension:IExtensionState & IExtensionGetters & IExtensionActions & {$state:IExtensionState, $reset:()=>void};
	public static qna:IQnaState & IQnaGetters & IQnaActions & {$state:IQnaState, $reset:()=>void};
	public static discord:IDiscordState & IDiscordGetters & IDiscordActions & {$state:IDiscordState, $reset:()=>void};
	public static streamlabs:IStreamlabsState & IStreamlabsGetters & IStreamlabsActions & {$state:IStreamlabsState, $reset:()=>void};
	public static streamelements:IStreamelementsState & IStreamelementsGetters & IStreamelementsActions & {$state:IStreamelementsState, $reset:()=>void};
	public static kofi:IKofiState & IKofiGetters & IKofiActions & {$state:IKofiState, $reset:()=>void};
	public static lumia:ILumiaState & ILumiaGetters & ILumiaActions & {$state:ILumiaState, $reset:()=>void};
	public static tipeee:ITipeeeState & ITipeeeGetters & ITipeeeActions & {$state:ITipeeeState, $reset:()=>void};
	public static common:ICommonState & ICommonGetters & ICommonActions & {$state:ICommonState, $reset:()=>void};
	public static labels:ILabelsState & ILabelsGetters & ILabelsActions & {$state:ILabelsState, $reset:()=>void};
	public static donationGoals:IDonationGoalState & IDonationGoalGetters & IDonationGoalActions & {$state:IDonationGoalState, $reset:()=>void};
	public static tiltify:ITiltifyState & ITiltifyGetters & ITiltifyActions & {$state:ITiltifyState, $reset:()=>void};
	public static tiktok:ITiktokState & ITiktokGetters & ITiktokActions & {$state:ITiktokState, $reset:()=>void};
	public static streamerbot:IStreamerbotState & IStreamerbotGetters & IStreamerbotActions & {$state:IStreamerbotState, $reset:()=>void};
	public static sammi:ISammiState & ISammiGetters & ISammiActions & {$state:ISammiState, $reset:()=>void};
	public static public:IPublicState & IPublicGetters & IPublicActions & {$state:IPublicState, $reset:()=>void};
	public static mixitup: IMixitupState & IMixitupGetters & IMixitupActions & { $state: IMixitupState, $reset: () => void };
	public static twitchCharity: ITwitchCharityState & ITwitchCharityGetters & ITwitchCharityActions & { $state: ITwitchCharityState, $reset: () => void };
	public static elevenLabs: IElevenLabsState & IElevenLabsGetters & IElevenLabsActions & { $state: IElevenLabsState, $reset: () => void };
	public static playability: IPlayabilityState & IPlayabilityGetters & IPlayabilityActions & { $state: IPlayabilityState, $reset: () => void };
	public static twitchBot: ITwitchBotState & ITwitchBotGetters & ITwitchBotActions & { $state: ITwitchBotState, $reset: () => void };
	public static groq: IGroqState & IGroqGetters & IGroqActions & { $state: IGroqState, $reset: () => void };
	public static animatedText: IAnimatedTextState & IAnimatedTextGetters & IAnimatedTextActions & { $state: IAnimatedTextState, $reset: () => void };
	public static customTrain: ICustomTrainState & ICustomTrainGetters & ICustomTrainActions & { $state: ICustomTrainState, $reset: () => void };
	public static streamSocket: IStreamSocketState & IStreamSocketGetters & IStreamSocketActions & { $state: IStreamSocketState, $reset: () => void };
	public static exporter: IExporterState & IExporterGetters & IExporterActions & { $state: IExporterState, $reset: () => void };
	public static endingCredits: IEndingCreditsState & IEndingCreditsGetters & IEndingCreditsActions & { $state: IEndingCreditsState, $reset: () => void };
	public static quiz: IQuizState & IQuizGetters & IQuizActions & { $state: IQuizState, $reset: () => void };
	public static streamfog: IStreamfogState & IStreamfogGetters & IStreamfogActions & { $state: IStreamfogState, $reset: () => void };
	public static i18n:VueI18n<{}, {}, {}, string, never, string, Composer<{}, {}, {}, string, never, string>> & {
		// Dirty typing override.
		// For some reason (may the "legacy" flag on main.ts ?) the VueI18n interface
		// doesn't match the actual API.
		// I couldn't find a way to make it understand the t() function now supports
		// pluralization
		t: {
			(key: string): string;
			(key: string, locale: string): string;
			(key: string, values: Record<string, unknown>): string;
			(key: string, values: Record<string, unknown>, locale: string): string;
			// Support for pluralization with count as second parameter
			(key: string, count: number): string;
			// Support for pluralization with values and count
			(key: string, values: Record<string, unknown>, count: number): string;
			// Support for pluralization with values and count
			(key: string, values: (string | number)[], count: number): string;
		};
	};
	public static router:Router;
	public static asset:(path: string) => string;
}

export type IStore = {
    [Key in keyof typeof StoreProxy]: typeof StoreProxy[Key];
};

export interface IMainState {
	/**
	 * Latest Twitchat update index
	 */
	latestUpdateIndex: number;
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
	 * When right cliking a message we can export it as an
	 * image. This object contains the export state.
	 */
	messageExportState:{id:"progress"|"complete"|"complete_downloadOnly"|"complete_copyOnly"|"discord"|"error"|"error_discord_access", params?:any}|null;
	/**
	 * Method to call to trigger install of twitchat on the device
	 */
	ahsInstaller: TwitchatDataTypes.InstallHandler|null;
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
	 * Icons cache for faster load
	 */
	iconCache:{[key:string]:string|Promise<void>};
	/**
	 * Shows an alert to the user when true.
	 */
	outdatedDataVersion:boolean;
	/**
	 * "true" if user choose to continue offline
	 */
	offlineMode:boolean;
	/**
	 * Triggers susspended from execution due to super high frequency
	 * and loop
	 */
	suspendedTriggerStacks:TriggerCallStack[];
	/**
	 * HTTP migration fix data
	 */
	httpMigrationFixData:{
					oldTriggerData: TriggerData,
					oldTriggerAction: TriggerActionHTTPCallData,
					triggerId: string,
					httpActionId: string,
					jsonPlaceholders: IHttpPlaceholder[]
				}[];
}

export interface IMainGetters {
	nonPremiumLimitExceeded:boolean;
}

export interface IMainActions {
	/**
	 * Toggle current theme (dark/light)
	 */
	toggleTheme(forced?:"light"|"dark"):Promise<void>;
	/**
	 * Reload all labels (use CTRL+Alt+M)
	 */
	reloadLabels(bypassCache?:boolean):Promise<void>;
	/**
	 * Starts  the app
	 * @param authenticate whether we want to authenticate (ex:chat) or not (ex:home)
	 * @param callback
	 */
	startApp(authenticate:boolean, callback:(value:unknown)=>void):Promise<void>;
	/**
	 * Called when user is authenticated
	 */
	onAuthenticated():void
	/**
	 * Loads data from local storage
	 */
	loadDataFromStorage():void;
	/**
	 * Opens up a confirm window requesting the user to confirm or cancel
	 * @param title
	 * @param description
	 * @param data
	 * @param yesLabel
	 * @param noLabel
	 */
	confirm<T>(title: string, description?: string, data?: T, yesLabel?:string, noLabel?:string): Promise<T|undefined>;
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
	/**
	 * Shows up an alert warning the user has outdated data.
	 * This happens when they run 2 twitchat instances
	 */
	showOutdatedDataVersionAlert():void;
	hideOutdatedDataVersionAlert(offlineMode:boolean):void;
	/**
	 * Called when a trigger's exec stack is suspended
	 * @param callstack
	 */
	suspendedTriggerStack(callstack:TriggerCallStack):void;
	/**
	 * initilizes data for trigger migration fix UI
	 * When adding "Extract JSON data" trigger action, migration
	 * of existing "HTTP Call" to extract data with the new action
	 * failed on some users.
	 * This initializes the data for that UI
	 */
	initHttpMigrationFixer(): Promise<void>;
}




export interface IAccountState {
	syncDataWithServer:TwitchatDataTypes.ParameterData<boolean>;
	publicDonation:TwitchatDataTypes.ParameterData<boolean>;
}

export interface IAccountGetters {
}

export interface IAccountActions {
}



export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>

export type IAuthState = {
	/**
	 * Is user authenticated
	 */
	authenticated: boolean;
	/**
	 * Get a list of users we're sharing data with
	 */
	dataSharingUserList: string[];
	/**
	 * Contains the scope to request.
	 * Use anytime the user tries to click a feature that's missing
	 * a scope. The missing scope(s) is set here and the scope grant
	 * form is opened with the missing scope highlighted
	 */
	newScopesToRequest: TwitchScopesString[];
	/**
	 * List of channels the authenticated twitch user is a moderator on
	 * Empty if user did not grant scope
	 */
	twitchModeratedChannels: TwitchDataTypes.ModeratedUser[];
	/**
	 * Twitchat donor level of the user
	 */
	donorLevel:number;
	/**
	 * Contains the premium type of the user
	 */
	premiumType:"earlyDonor"|"patreon"|"lifetime"|"gifted"|"";
	/**
	 * true if user is exempt from ads (ex: if too few followers)
	 */
	noAd:boolean;
	/**
	 * true if donor level changed from last time
	 */
	donorLevelUpgrade:boolean;
	/**
	 * Percentage reached before lifetime premium
	 */
	lifetimePremiumPercent:number;
	/**
	 * List of Twitchat feature flags enabled for this user
	 */
	features:"export_configs"[];
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
	/**
	 * Get if user is premium.
	 * Either because a Patreon member, or because they donated the lifetime premium amount,
	 * or because they're part of the early donors I granted lifetime premium to
	 */
	isPremium:boolean;
	/**
	 * Get if user is admin
	 */
	isAdmin:boolean;
}

export interface IAuthActions {
	/**
	 * Request a twitch token refresh
	 * @param callback
	 */
	twitch_tokenRefresh(callback?:(success:boolean)=>void):Promise<TwitchDataTypes.AuthTokenResult|false>;
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
	/**
	 * Loads the specified user ID profile and donor state
	 */
	loadUserState(uid:string):Promise<void>;
	/**
	 * Called after requesting new scopes.
	 * If authenticated from popup, the code and scopes are given here
	 * to update the app auth state
	 * @param code 
	 * @param scopes 
	 */
	twitch_updateAuthScopes(code:string):Promise<boolean>
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
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Update automod parameters
	 * @param payload
	 */
	setAutomodParams(payload:TwitchatDataTypes.AutomodParamsData):void;
	/**
	 * Check if a message is automoded by a rule
	 * @param mess
	 * @param tags
	 * @returns
	 */
	isMessageAutomoded(mess:string, user:TwitchatDataTypes.TwitchatUser, channelId:string):TwitchatDataTypes.AutomodParamsKeywordFilterData|null;
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
	checkBingoWinner(message:TwitchatDataTypes.TranslatableMessage):void;
}




export interface IBingoGridState {
	/**
	 * Bingo grids created
	 */
	gridList:TwitchatDataTypes.BingoGridConfig[];
	/**
	 * List of bingo grid overlays available.
	 */
	availableOverlayList:TwitchatDataTypes.BingoGridConfig[];
	/**
	 * Stores the number of bingos of the viewers
	 */
	viewersBingoCount:{[gridId:string]:{user:TwitchatDataTypes.TwitchatUser, count:number}[]};
}

export interface IBingoGridGetters {
}

export interface IBingoGridActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Create a new bingo grid
	 * @param payload
	 */
	addGrid():TwitchatDataTypes.BingoGridConfig;
	/**
	 * Delete a bingo grid
	 */
	removeGrid(id:string):void;
	/**
	 * Shuffle given grid entries
	 * @param id
	 */
	shuffleGrid(id:string):Promise<void>;
	/**
	 * Resets given grid entries label
	 * @param id
	 */
	resetLabels(id:string):void;
	/**
	 * Resets given grid entries check states
	 * @param id
	 * @param forcedState
	 * @param callEndpoint
	 */
	resetCheckStates(id:string, forcedState?:boolean, callEndpoint?:boolean):Promise<void>;
	/**
	 * Duplicates given grid
	 * @param id
	 */
	duplicateGrid(id:string):void;
	/**
	 * Saves data to server
	 * @param gridId grid ID. This will broadcast update to overlay
	 * @param cellId [optional] cell ID that's been clicked
	 * @param broadcastViewers [optional] tells the viewers the grid got edited. Don't set this "true" when only ticking a cell
	 */
	saveData(gridId?:string, cellId?:string, broadcastViewers?:boolean):Promise<void>
	/**
	 * Inverse the check state of the given cell ID.
	 * @param gridId
	 * @param cellId
	 * @param forcedState
	 */
	toggleCell(gridId:string, cellId:string, forcedState?:boolean):void;
	/**
	 * Handles a chat command to check if it is linked to a grid
	 * @param message
	 * @param cmd
	 */
	handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void>;
	/**
	 * Adds a custom cell to the given grid
	 */
	addCustomCell(gridId:string):void;
	/**
	 * Remove given custom cell from the given grid
	 */
	removeCustomCell(gridId:string, cellId:string):void;
	/**
	 * Shows the leaderboard for the given grid on its overlay
	 * @param gridId
	 */
	showLeaderboard(gridId:string):void;
	/**
	 * Hides the leaderboard for the given grid on its overlay
	 * @param gridId
	 */
	hideLeaderboard(gridId:string):void;
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
	 * Messaging mode
	 */
	messageMode:"dm"|"dm_mods"|"question"|"message";
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
	whispers:{[uid:string]:{to:TwitchatDataTypes.TwitchatUser, from:TwitchatDataTypes.TwitchatUser, messages:TwitchatDataTypes.MessageWhisperData[]}};
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
	 * Currently highlighted message on the overlay
	 */
	highlightedMessageId: string|null;
	/**
	 * Parameters of the chat highlight overlay.
	 * Contains the position on screen of the overlay
	 */
	chatHighlightOverlayParams: TwitchatDataTypes.ChatHighlightParams;
	/**
	 * True when using /spam command to send fake messages on chat
	 */
	spamingFakeMessages:boolean;
	/**
	 * Date until which securities like anti hate raid or followbot raid
	 * should be disabled.
	 */
	securityRaidGraceEndDate:number;
	/**
	 * Pending automod messages to be reviewed by the user
	 */
	pendingAutomodMessages:TwitchatDataTypes.MessageChatData[];
}

export interface IChatGetters {
	/**
	 * Get all chat messages
	 */
	messages:TwitchatDataTypes.ChatMessageTypes[];
}

export interface IChatActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Preload message history from IndexedDB
	 */
	preloadMessageHistory():Promise<void>;
	/**
	 * Clears database history message history from IndexedDB
	 */
	clearHistory():void;
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
	addMessage(message:TwitchatDataTypes.ChatMessageTypes, saveToDB?:boolean):Promise<void>;
	/**
	 * Delete a message
	 * @param message
	 * @param deleterData
	 * @param callEndpoint
	 */
	deleteMessage(message:TwitchatDataTypes.ChatMessageTypes, deleterData?:TwitchatDataTypes.TwitchatUser, callEndpoint?:boolean):void;
	/**
	 * Delete a message by its ID
	 * @param messageID
	 * @param deleterData
	 * @param callEndpoint
	 */
	deleteMessageByID(messageID:string, deleterData?:TwitchatDataTypes.TwitchatUser, callEndpoint?:boolean):void;
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
	 * Opens up the whispers list for the given user.
	 * Initializes a fake conversation with the user to allow for the window
	 * to be displayed
	 * @param user
	 */
	openWhisperWithUser(user:TwitchatDataTypes.TwitchatUser):void;
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
	highlightChatMessageOverlay(message?:TwitchatDataTypes.TranslatableMessage):Promise<void>;
	/**
	 * Flag a message as suspicious.
	 * Called by pubsub and eventsub to flag a message.
	 * We first receive the message from IRC then pubsub/eventsub sends
	 * a message to tell us that the user is suspicious and we need to
	 * flag their message
	 * @param messageId
	 * @param flagChans
	 * @param retryCount
	 */
	flagSuspiciousMessage(messageId:string, flaggedChans:string[], retryCount?:number):Promise<void>;
	/**
	 * Flags a message as their first one today
	 * @param message
	 */
	flagMessageAsFirstToday(message:TwitchatDataTypes.GreetableMessage):void;
	/**
	 * Reset the greeting history.
	 */
	resetGreetingHistory():void;
	/**
	 * Removes any donation request related messages
	 */
	cleanupDonationRelatedMessages():void;
	/**
	 * Accepts or rejects given automoded messages
	 */
	automodAction(accept:boolean, message:TwitchatDataTypes.MessageChatData):Promise<void>;
	/**
	 * Flag a message as a spoiler
	 * @param message
	 */
	flagAsSpoiler(message:TwitchatDataTypes.MessageChatData):Promise<void>;
	/**
	 * Adds a private mod message from given info
	 */
	addPrivateModMessage(
		from:TwitchatDataTypes.TwitchatUser,
		message:TwitchatDataTypes.ParseMessageChunk[],
		action:TwitchatDataTypes.MessagePrivateModeratorData["action"],
		message_id:string,
		message_parent_id?:string,
		message_parent_ref?:TwitchatDataTypes.MessageChatData,
		message_parent_fallback?:TwitchatDataTypes.MessagePrivateModeratorData["parentMessageFallback"],
	):TwitchatDataTypes.MessagePrivateModeratorData;
	/**
	 * When a message gets lots of replies notify
	 * @param message 
	 */
	notifyManyReplies(message:TwitchatDataTypes.MessageChatData):void;
}




export interface IChatPollState {
	/**
	 * Current poll data
	 */
	data:TwitchatDataTypes.ChatPollData | null,
	/**
	 * Chat poll form presets
	 */
	presets:TwitchatDataTypes.ChatPollPresets,
	/**
	 * Contains params about the prediction overlay
	 */
	overlayParams:PollOverlayParamStoreData;
}

export interface IChatPollGetters {
}

export interface IChatPollActions {
	/**
	 * Populates data from data store value
	 */
	populateData(params?:PollOverlayParamStoreData):void;
	/**
	 * Handles a chat command to check if it is linked to current poll
	 * @param message
	 * @param cmd
	 */
	handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void>;
	/**
	 * Set current poll data
	 * @param data
	 * @param replacePresets if true the presets won't be overriden
	 */
	setCurrentPoll(data:TwitchatDataTypes.ChatPollData|null, replacePresets?:boolean):void;
	/**
	 * Updates overlay params
	 * @param params
	 */
	setOverlayParams(params:PollOverlayParamStoreData):void;
	/**
	 * Broadcast current poll state.
	 * Sends overlay parameters as well
	 */
	broadcastState():void;
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
	addChatSuggestion(message:TwitchatDataTypes.TranslatableMessage):void;
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
	simulateMessage<T=TwitchatDataTypes.ChatMessageTypes>(type:TwitchatDataTypes.TwitchatMessageStringType, hook?:(message:T)=>void, postOnChat?:boolean, allowConversations?:boolean):Promise<T>;
	/**
	 * Sends a fake notice of the specified type on chat
	 * @param type
	 * @param hook
	 * @param postOnChat
	 * @param allowConversations
	 */
	simulateNotice<T=TwitchatDataTypes.ChatMessageTypes>(noticeType?:TwitchatDataTypes.TwitchatNoticeStringType, hook?:(message:T)=>void, postOnChat?:boolean):Promise<T>;
	/**
	 * Sends a random fake message of any type
	 * @param postOnChat
	 * @param forcedMessage
	 * @param hook
	 */
	sendRandomFakeMessage<T=TwitchatDataTypes.ChatMessageTypes>(postOnChat:boolean, forcedMessage?:string, hook?:(message:T)=>void, forcedType?:TwitchatDataTypes.TwitchatMessageStringType):Promise<T>;
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
	 * Populates store from DataStorage
	 */
	populateData():void;
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
	 * Removes a follower from the emergency follow
	 * @param payload
	 */
	ignoreEmergencyFollower(payload:TwitchatDataTypes.MessageFollowingData):void;
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
	handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void>;
	/**
	 * Reloads a followbot list from storage
	 */
	reloadFollowbotList(json:any):void;
	/**
	 * Saves the current followbot list to storage
	 */
	saveFollowbotList():void;
}




export interface IMusicState {
	/**
	 * Spotify app params
	 */
	spotifyAuthParams: SpotifyAuthResult|null;
	/**
	 * Stores consecutive API exceptions
	 */
	spotifyConsecutiveErrors: number;
	/**
	 * Current Spotify auth token
	 */
	spotifyAuthToken: SpotifyAuthToken|null;
	/**
	 * Music player overlay params.
	 */
	musicPlayerParams:TwitchatDataTypes.MusicPlayerParamsData,
}

export interface IMusicGetters {
}

export interface IMusicActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Sets the spotify OAuth result after going through
	 * the OAuth process
	 * @param value
	 */
	setSpotifyAuthResult(value:SpotifyAuthResult|null):void;
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
	 * Populates store from DataStorage
	 */
	populateData():void;
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
	handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd?:string):Promise<void>;
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
	 * Defines if a donate reminder should be posted when user ends
	 * their stream (after raid and/or strem cut)
	 */
	donationReminderEnabled:boolean;
	/**
	 * Defines if updates reminder should be posted when user ends
	 * their stream (after raid and/or strem cut)
	 */
	updatesReminderEnabled:boolean;
	/**
	 * Duration after which a 1st user message today is removed from the list
	 */
	greetThemAutoDelete:number;
	/**
	 * Chat features parameters
	 */
	features:TwitchatDataTypes.IParameterCategory["features"]
	/**
	 * Chat appaearance parameters
	 */
	appearance:TwitchatDataTypes.IParameterCategory["appearance"];
	/**
	 * Chat columns definitions
	 */
	chatColumnsConfig:TwitchatDataTypes.ChatColumnsConfig[];
	/**
	 * Live status of each chat column
	 */
	chatColumnStates:{
		/**
		 * Is chat autoscroll paused?
		 */
		paused:boolean
	}[];
	/**
	 * GoXLR configurations
	 */
	goxlrConfig: TwitchatDataTypes.GoXLRParams;
	/**
	 * Defines the elements pinned at the bottom of Twitchat
	 */
	pinnedMenuItems:typeof TwitchatDataTypes.PinnableMenuItems[number]["id"][];
}

export interface IParamsGetters {
}

export interface IParamsActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
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
	 * @param noToggle by default, calling open toggle visibility. Set this to true to avoid closing if already opened
	 */
	openModal(modal:TwitchatDataTypes.ModalTypes, noToggle?:boolean):void;
	/**
	 * Closes currently opened modal
	 */
	closeModal():void;
	/**
	 * Set if Twitchat should automatically connect to GoXLR on startup
	 * @param enabled
	 */
	setGoXLREnabled(enabled:boolean):void;
	/**
	 * Set GoXLR connection params
	 * @param ip
	 * @param port
	 */
	setGoXLRConnectParams(ip:string, port:number):void;
	/**
	 * Sets the encoder that should control the given chat column
	 * @param colIndex
	 * @param encoderPath
	 */
	setGoXLRChatColScrollParams(colIndex:number, encoderPath:GoXLRTypes.ButtonTypesData[]):void;
	/**
	 * Sets the encoder that should move the read mark on the given chat column
	 * @param colIndex
	 * @param encoderPath
	 */
	setGoXLRChatColReadMarkParams(colIndex:number, encoderPath:GoXLRTypes.ButtonTypesData[]):void;
	/**
	 * Toggle the pin state of chat menu item
	 * @param pinId
	 */
	toggleChatMenuPin(pinId:typeof TwitchatDataTypes.PinnableMenuItems[number]["id"]):void;
	/**
	 * Saves current pins
	 */
	saveChatMenuPins():void;
}




export interface IPollState {
	/**
	 * Current poll data
	 */
	data:TwitchatDataTypes.MessagePollData | null,
	/**
	 * Contains params about the prediction overlay
	 */
	overlayParams:PollOverlayParamStoreData;
}

export interface IPollGetters {
}

export interface IPollActions {
	/**
	 * Populates data from data store value
	 */
	populateData(params?:PollOverlayParamStoreData):void;
	/**
	 * Set current poll data
	 * @param data
	 * @param postOnChat post result on chat
	 */
	setCurrentPoll(data:TwitchatDataTypes.MessagePollData|null, postOnChat?:boolean):void;
	/**
	 * Updates overlay params
	 * @param params
	 */
	setOverlayParams(params:PollOverlayParamStoreData):void;
	/**
	 * Broadcast current poll state.
	 * Sends overlay parameters as well
	 */
	broadcastState():void;
}




export interface IPredictionState {
	/**
	 * Current prediction data
	 */
	data:TwitchatDataTypes.MessagePredictionData | null;
	/**
	 * Contains params about the prediction overlay
	 */
	overlayParams:PredictionOverlayParamStoreData;
}

export interface IPredictionGetters {
}

export interface IPredictionActions {
	/**
	 * Populates data from data store value
	 */
	populateData(params?:PredictionOverlayParamStoreData):void;
	/**
	 * Set current prediction data
	 */
	setPrediction(payload:TwitchatDataTypes.MessagePredictionData|null, postOnChat?:boolean):void;
	/**
	 * Updates overlay params
	 * @param params
	 */
	setOverlayParams(params:PredictionOverlayParamStoreData):void;
	/**
	 * Broadcast current prediction state.
	 * Sends overlay parameters as well
	 */
	broadcastState():void;
}




export interface IRaffleState {
	/**
	 * Current raffle data
	 */
	raffleList:TwitchatDataTypes.RaffleData[];
}

export interface IRaffleGetters {
}

export interface IRaffleActions {
	/**
	 * Populates data from data store value
	 */
	populateData(params?:PollOverlayParamStoreData):void;
	/**
	 * Start a raffle
	 * @param payload
	 */
	startRaffle(payload:TwitchatDataTypes.RaffleData):Promise<void>;
	/**
	 * Close a raffle
	 */
	stopRaffle(sessionId:string):void;
	/**
	 * Set a raffle's winner
	 * @param winner
	 * @param publish
	 * @param chatMessageDelay delay before sending message on chat
	 */
	onRaffleComplete(sessionId:string, winner:TwitchatDataTypes.RaffleEntry, publish?:boolean, chatMessageDelay?:number):void;
	/**
	 * Check if the specified message contains the commande to join
	 * any currently opened raffle
	 * @param message
	 */
	checkRaffleJoin(message:TwitchatDataTypes.ChatMessageTypes, forceEnter?:boolean):boolean;
	/**
	 * Pick a random winner amongst the users that joined the raffmle
	 * @param forcedData
	 * @param forcedWinner
	 */
	pickWinner(sessionId:string, forcedData?:TwitchatDataTypes.RaffleData, forcedWinner?:TwitchatDataTypes.RaffleEntry):Promise<void>;
	/**
	 * Saves current raffle data to store
	 */
	saveData():void;
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
	 * History of outgoing raids
	 */
	raidHistory: {uid:string, date:number}[];
	/**
	 * Date at which a commercial will start
	 */
	commercial: {[key in string]:TwitchatDataTypes.CommercialData};
	/**
	 * Is shield mode enabled?
	 */
	shieldModeEnabled: boolean,
	/**
	 * Room settings for each platforms
	 */
	roomSettings:{[key in string]:TwitchatDataTypes.IRoomSettings|undefined};
	/**
	 * Contains extra twitch channels to connect to
	 */
	connectedTwitchChans:{user:TwitchatDataTypes.TwitchatUser, color:string}[];
	/**
	 * Contains which channel is selected on the Channel Switcher
	 * Basically defines on wich channel the user will send the message
	 * when writing on the message input at the bottom of Twitchat
	 */
	currentChatChannel:{
		id:string;
		name:string;
		platform:TwitchatDataTypes.ChatPlatform;
	};
	/**
	 * Gets current VOD URL
	 */
	currentVODUrl: string;
	/**
	 * Channels to autoconnect to on twitchat loading
	 */
	autoconnectChans:{id:string, platform:TwitchatDataTypes.ChatPlatform}[],
}

export interface IStreamGetters {
}

export interface IStreamActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Preload the current stream info of the connected channel
	 */
	loadStreamInfo(platform:TwitchatDataTypes.ChatPlatform, channelId:string):Promise<void>;

	/**
	 * Set current stream info
	 * @param platform
	 * @param title
	 * @param categoryID
	 * @param channelId
	 * @param tags
	 */
	updateStreamInfos(platform:TwitchatDataTypes.ChatPlatform, channelId:string, title?:string, categoryID?:string, tags?:string[], branded?:boolean, labels?:{id:string, enabled:boolean}[]):Promise<boolean>
	/**
	 * Set outgoing raid info
	 * @param infos
	 */
	setRaiding(infos?:TwitchatDataTypes.RaidInfo):void;
	/**
	 * Called after a raid completed
	 */
	onRaidComplete():void;
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
	setPlaybackState(channelId:string, viewerCount:number|undefined):void;
	/**
	 * Called when stream starts.
	 * Disable emote-only if requested
	 * @param channelId
	 * @param startedAt
	 */
	setStreamStart(channelId:string, startedAt?:number):void;
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
	 * Get the commercial info for the given channel
	 * @param channelId
	 */
	getCommercialInfo(channelId:string):TwitchatDataTypes.CommercialData;
	/**
	 * Set current and incoming commercial data
	 * @param channelId
	 * @param data
	 * @param adStarter if set, sends a message on tchat to say who started the ad break
	 */
	setCommercialInfo(channelId:string, data:TwitchatDataTypes.CommercialData, adStarter?:TwitchatDataTypes.TwitchatUser, isStart?:boolean):void;
	/**
	 * Starts a commercial break
	 * @param duration
	 */
	startCommercial(channelId:string, duration:number, noConfirm?:boolean):Promise<void>;
	/**
	 * Get all current stream data
	 */
	getSummary(offset?:number, includeParams?:boolean, simulate?:boolean):Promise<TwitchatDataTypes.StreamSummaryData>;
	/**
	 * Connects to an extra channel
	 * @param login
	 */
	connectToExtraChan(user:TwitchatDataTypes.TwitchatUser):Promise<void>;
	/**
	 * Disconnects from an extra channel
	 * @param login
	 */
	disconnectFromExtraChan(user:TwitchatDataTypes.TwitchatUser):Promise<void>;
	/**
	 * Define autoconnect state of given channel.
	 * @param user
	 * @param pinned
	 */
	setExtraChanAutoconnectState(user:TwitchatDataTypes.TwitchatUser, pinned:boolean):void;
	/**
	 * Request cooldown duration before next hype train
	 */
	scheduleHypeTrainCooldownAlert():Promise<void>;
	/**
	 * Get current stream VOD URL
	 * Just used to populate the placeholder {CURRENT_VOD_URL}
	 */
	grabCurrentStreamVOD():Promise<void>;
}




export interface ITimerState {
	/**
	 * Timer's list
	 */
	timerList: TwitchatDataTypes.TimerData[],
}

export interface ITimerGetters {
}

export interface ITimerActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Braodcast current timer and countdown statesvia the PublicAPI
	 */
	broadcastStates(id?:string):void;
	/**
	 * Create a timer
	 */
	createTimer():void;
	/**
	 * Deletes given timer
	 */
	deleteTimer(id:string):void;
	/**
	 * Start the timer
	 */
	timerStart(id:string):void;
	/**
	 * Add a duration to the timer
	 * @param duration_ms
	 */
	timerAdd(id:string, duration_ms:number):void;
	/**
	 * Remove a duration from the timer
	 * @param duration_ms
	 */
	timerRemove(id:string, duration_ms:number):void;
	/**
	 * Pauses the timer
	 */
	timerPause(id:string):void;
	/**
	 * Unpauses the timer
	 */
	timerUnpause(id:string):void;
	/**
	 * Stop the timer
	 */
	timerStop(id:string):void;
	/**
	 * Resets the timer
	 */
	resetTimer(id:string):void;
	/**
	 * Saves data to server
	 */
	saveData():void;
	/**
	 * Gets current timer/countdown computed value
	 * Remaining time for a countodwn, elasped time for a timer
	 */
	getTimerComputedValue(id:string):{duration_ms:number, duration_str:string};
	/**
	 * Broadcasts the timer list on Public API
	 */
	broadcastTimerList():void;
}




export interface ITriggersState {
	/**
	 * contains all the triggers defintions
	 */
	triggerList: TriggerData[];
	/**
	 * Temporary store to hold copied actions data via
	 * selection & ctrl+C.
	 */
	clipboard: TriggerActionTypes[];
	/**
	 * Contains data about the currently edited trigger;
	 */
	currentEditTriggerData:TriggerData|null;
	/**
	 * contains all the triggers defintions
	 */
	triggerTree: TriggerTreeItemData[];
	/**
	 * Indicates weither a trigger ID is enabled or not.
	 * This is different from the "trigger.enabled" prop.
	 * This value depends on the parent folder's state.
	 * If any folder parent of the trigger is disabled,
	 * this value will be set to false
	 */
	triggerIdToFolderEnabled:{[key:string]:boolean}
}

export interface ITriggersGetters {
	/**
	 * Get all available trigger queues
	 */
	queues: string[];
}

export interface ITriggersActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Defines the trigger data to be editted
	 * @param data
	 */
	openTriggerEdition(data:TriggerData):void;
	/**
	 * Opens the trigger list
	 */
	openTriggerList():void;
	/**
	 * Add a new trigger
	 * @param data
	 */
	addTrigger(data:TriggerData, folderTarget?:string):void;
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
	 * Duplicate a trigger by its ID
	 * @param id
	 * @param parentId
	 */
	duplicateTrigger(id:string, parentId?:string):void;
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
	/**
	 * Called when a value placeholder is renamed.
	 * Parses all triggers that have a reference to that placeholder
	 * and rename it everywhere
	 * @param oldName
	 * @param newName
	 */
	renameValuePlaceholder(oldName:string, newName:string):void;
	/**
	 * Sets a new trigger tree
	 * @param data
	 */
	updateTriggerTree(data:TriggerTreeItemData[]):void;
	/**
	 * Computes the enabled tates for every triggers based on
	 * the folder structure.
	 * If the trigger is within a folder that is disabled, the
	 * trigger will be flagged as disabled
	 */
	computeTriggerTreeEnabledStates():void;
	/**
	 * Broadcasts current trigger list on Public API
	 */
	broadcastTriggerList():void;
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
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Updates speaking state
	 * @param speaking 
	 */
	setSpeakingState(speaking:boolean):void;
	/**
	 * Read a message via TTS
	 * @param message
	 */
	ttsReadMessage(message:TwitchatDataTypes.ChatMessageTypes):void
	/**
	 * Start/stop reading any incoming message of a user
	 * @param user
	 * @param forceRead
	 */
	ttsReadUser(user:TwitchatDataTypes.TwitchatUser, forceRead?:boolean):void
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
		platform?:TwitchatDataTypes.ChatPlatform,
	}|null;
	/**
	 * Contains custom user names used for display on place of the actual username
	 * Associates a user ID to a custom display name
	 */
	customUsernames:{[uid:string]:{ name:string, platform:TwitchatDataTypes.ChatPlatform, channel:string}};
	/**
	 * Contains custom user badges references.
	 * Associates a user ID to custom badge ID from the customBadgeList array
	 */
	customUserBadges:{[uid:string]:{id:string, platform:TwitchatDataTypes.ChatPlatform, channel:string}[]};
	/**
	 * Contains custom user badges
	 */
	customBadgeList:TwitchatDataTypes.TwitchatCustomUserBadge[];
	/**
	 * List of blocked users by platform
	 */
	blockedUsers: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
	/**
	 * List of accounts I follow by platform
	 */
	myFollowings: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
	/**
	 * List of moderators by platform
	 */
	myMods: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
	/**
	 * List of users with VIP status by platform
	 */
	myVIPs: {[key in TwitchatDataTypes.ChatPlatform]:{[key:string]:boolean}};
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
	/**
	 * Tmporary name while user info is loading
	 */
	tmpDisplayName:string;
}

export interface IUsersGetters {
	/**
	 * Get all users
	 */
	users:TwitchatDataTypes.TwitchatUser[];
}

export interface IUsersActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
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
	getUserFrom(platform:TwitchatDataTypes.ChatPlatform, channelId?:string, id?:string, login?:string, displayName?:string, loadCallback?:(user:TwitchatDataTypes.TwitchatUser)=>void, forcedFollowState?:boolean, getPronouns?:boolean, forcedSubscriberState?:boolean, loadExtras?:boolean):TwitchatDataTypes.TwitchatUser;
	/**
	 * Get given user's color
	 * @param login
	 */
	getUserColorFromLogin(login:string, platform:TwitchatDataTypes.ChatPlatform):string|null;
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
	flagBanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string, duration_s?:number, moderator?:TwitchatDataTypes.TwitchatUser):Promise<void>;
	/**
	 * Flag a user as not banned
	 * @param platform
	 * @param channelId
	 * @param uid
	 */
	flagUnbanned(platform:TwitchatDataTypes.ChatPlatform, channelId:string, uid:string, moderator?:TwitchatDataTypes.TwitchatUser, silentUnban?:boolean):Promise<void>;
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
	checkFollowerState(user:Pick<TwitchatDataTypes.TwitchatUser, "channelInfo" | "id">, channelId:string):Promise<boolean>;
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
	openUserCard(user:TwitchatDataTypes.TwitchatUser|null, channelId?:string, platform?:TwitchatDataTypes.ChatPlatform):void;
	/**
	 * Load my following list
	 */
	loadMyFollowings():Promise<void>;
	/**
	 * Load my followers list
	 */
	loadMyFollowers():Promise<void>;
	/**
	 * Load my VIPs list
	 */
	loadMyVIPs():Promise<void>;
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
	/**
	 * Deletes a custom user name
	 * @param uid
	 */
	removeCustomUsername(uid:string):void;
	/**
	 * Defines a custom username to the given user
	 * @param user
	 * @param name
	 * @returns false if user has used all the non premium slots
	 */
	setCustomUsername(user:TwitchatDataTypes.TwitchatUser|string, name:string, channelId:string, platform:string):boolean;
	/**
	 * Create a new custom user badge
	 * @returns false if user the maximum custom badges has been reached, otherwise returns the created badge ID
	 */
	createCustomBadge(img:string):boolean|string;
	/**
	 * Update the image of the given custom badge
	 * @param badgeId
	 * @param img
	 */
	updateCustomBadgeImage(badgeId:string, img:string):void;
	/**
	 * Update the name of a custom badge
	 * @param badgeId
	 */
	updateCustomBadgeName(badgeId:string, name:string):void;
	/**
	 * Deletes the given custom badge
	 * Removes any references from users
	 */
	deleteCustomBadge(badgeId:string):void;
	/**
	 * Gives a custom badge to the given user
	 * @returns false if the max users with custom badges is reached
	 */
	giveCustomBadge(userId:string, platform:TwitchatDataTypes.ChatPlatform, badgeId:string, channelId:string):boolean;
	/**
	 * Removes a custom badge from the given user
	 */
	removeCustomBadge(userId:string, badgeId:string, channelId:string):void;
	/**
	 * Saves custom badges and their attributions to users
	 */
	saveCustomBadges():void;
	/**
	 * Saves custom usernames to server
	 */
	saveCustomUsername():void;
	/**
	 * Defines custom trigger placeholers
	 */
	setTriggerPlaceholders():void;
	/**
	 * Flag user as restricted
	 */
	flagRestrictedUser(channelId:string, user:TwitchatDataTypes.TwitchatUser):void;
	/**
	 * Flag user as suspicious
	 */
	flagSuspiciousUser(channelId:string, user:TwitchatDataTypes.TwitchatUser):void;
	/**
	 * unflag user (remove restricted/suspicious)
	 */
	unflagUser(channelId:string, user:TwitchatDataTypes.TwitchatUser):void;
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
	voicemodCurrentVoice:VoicemodTypes.Voice|null,
	/**
	 * Voicemod chat command params
	 */
	voicemodParams:TwitchatDataTypes.VoicemodParamsData,
}

export interface IVoiceGetters {
	voiceBotConfigured:boolean;
}

export interface IVoiceActions {
	/**
	 * Populates data from data store value
	 */
	populateData():void;
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
	/**
	 * Handles a chat command to check if a voice effect should be enabled
	 * @param message
	 * @param cmd
	 */
	handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void>;
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
	/**
	 * Gift premium membership to given user
	 */
	giftPremium(login:string):Promise<void>;
	/**
	 * Removes gifted premium membership from given user
	 */
	ungiftPremium(login:string):Promise<void>;
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
	 * Populates store from DataStorage
	 */
	populateData():void;
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
	 *
	 * @returns new value
	 */
	increment(id:string, action:TriggerActionCountDataAction, value:number, user?:TwitchatDataTypes.TwitchatUser, userId?:string):number;
	/**
	 * Deletes a per-user counter entry
	 * @param id
	 * @param user
	 * @param userId
	 */
	deleteCounterEntry(id:string, user?:TwitchatDataTypes.TwitchatUser, userId?:string):void;
	/**
	 * Deletes all per-user counter entries
	 * @param id
	 */
	deleteAllCounterEntries(id:string):void;
	/**
	 * Saves counters to server
	 */
	saveCounters():void;
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




export interface IHeatState {
	/**
	 * List of clickable areas
	 */
	screenList:HeatScreen[];
	/**
	 * List of distortion overlays
	 */
	distortionList:TwitchatDataTypes.HeatDistortionData[];
}

export interface IHeatGetters {
}

export interface IHeatActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Create a new screen.
	 */
	createScreen():string;
	/**
	 * Duplicate a screen by its ID
	 */
	duplicateScreen(id:string):void;
	/**
	 * Delete a screen by its ID
	*/
	deleteScreen(id:string):void;
	/**
	 * Update an existing screen
	 */
	updateScreen(data:HeatScreen):void;
	/**
	 * Save screens to server
	 */
	saveScreens():void;
	/**
	 * Handles a heat click event
	 * @param event
	 */
	handleClickEvent(event:HeatEvent):Promise<void>;
	/**
	 * Deletes a distorsion data
	 * @param data
	 */
	deleteDistorsion(data:TwitchatDataTypes.HeatDistortionData):Promise<void>;
	/**
	 * Saves distorion data and broadcast change for overlays
	 */
	saveDistorsions():void;
}




export interface IPatreonState {
	isMember: boolean;
	connected: boolean;
	/**
	 * Patreon auth flow params
	 */
	oauthFlowParams: {
		code:string;
		csrf:string;
	} | null;
	memberList: IPatreonMember[];
	tierList: IPatreonTier[];
}

export interface IPatreonGetters {
}

export interface IPatreonActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Sets oAuth code to then complete oAuth flow
	 * @param value
	 */
	setPatreonAuthResult(value:{code:string,csrf:string}|null):void;
	/**
	 * Get oAuth URL to redirect to to start oauth flow
	 * @param premiumContext
	 */
	getOAuthURL(premiumContext?:boolean):Promise<string>;
	/**
	 * Generate an auth token from a auth code
	 * @param code
	 */
	authenticate(code:string, premiumContext?:boolean):Promise<void>;
	/**
	 * Disconnects the user
	 */
	disconnect():void;
	/**
	 * Get redirect URI
	 * @param premiumContext
	 * @returns
	 */
	getRedirectURI(premiumContext?:boolean):string;
	/**
	 * Completes oauth flow
	 * @returns
	 */
	completeOAuthFlow(premiumContext?:boolean):Promise<boolean>;
	/**
	 * Get the user's data
	 */
	loadMemberState():Promise<void>;
	/**
	 * Loads user's member list
	 */
	loadMemberList():Promise<void>
}




export interface IValuesState {
	/**
	 * All values
	 */
	valueList:TwitchatDataTypes.ValueData[];
}

export interface IValuesGetters {
}

export interface IValuesActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Create a new value
	 * @param data
	 */
	addValue(data:TwitchatDataTypes.ValueData):void;
	/**
	 * Update a value's params
	 * @param id
	 * @param data
	 */
	editValueParams(id:string, data:Partial<TwitchatDataTypes.ValueData>):void;
	/**
	 * Update a value
	 * @param id
	 * @param valuee
	 * @param user
	 * @param userId
	 */
	updateValue(id:string, value:string, user?:TwitchatDataTypes.TwitchatUser, userId?:string, interpretMaths?:boolean):void;
	/**
	 * Deletes a per-user value entry
	 * @param id
	 * @param user
	 * @param userId
	 */
	deleteValueEntry(id:string, user?:TwitchatDataTypes.TwitchatUser, userId?:string):void;
	/**
	 * Delete a value
	 * @param data
	 */
	delValue(data:TwitchatDataTypes.ValueData):void;
	/**
	 * Save values to server
	 * @param
	 */
	saveValues():void;
}




export interface IYoutubeState {
	/**
	 * Youtube app params
	 */
	youtubeAuthParams: YoutubeAuthResult|null;
	/**
	 * Current Youtube auth token
	 */
	youtubeAuthToken: YoutubeAuthToken|null;
	/**
	 * New scopes to request
	 */
	newScopesToRequest: YoutubeScopesString[]|null;
}

export interface IYoutubeGetters {
}

export interface IYoutubeActions {
	setYoutubeAuthResult(value:{code:string,csrf:string}|null):void;
	authenticate():Promise<boolean>;
}




export interface IExtensionState {
	/**
	 * List of available extension slot types
	 * Associates a key per slot types to the number of available slots for this slot type
	 */
	availableSlots: {[key in keyof TwitchDataTypes.ActiveExtensions]:number};
	/**
	 * Lists all extensions installed on user's channel
	 */
	availableExtensions: TwitchDataTypes.Extension[];
}

export interface IExtensionGetters {
}

export interface IExtensionActions {
	init():void;
}




export interface IQnaState {
	/**
	 * List of active Q&A sessions
	 */
	activeSessions:TwitchatDataTypes.QnaSession[];
}

export interface IQnaGetters {
}

export interface IQnaActions {
	/**
	 * Populates data from data store value
	 */
	populateData():void;
	/**
	 * Starts a new Q&A sessions
	 * @returns session created or false if a conflicting session exists
	 */
	createSession(command:string, allowUpvotes:boolean, shareWithMods:boolean):TwitchatDataTypes.QnaSession;
	/**
	 * Stops an existing Q&A sessions
	 */
	stopSession(id:string):void;
	/**
	 * Destroys an existing Q&A sessions
	 */
	deleteSession(id:string):void;
	/**
	 * Handles a chat command to check if the message should be added
	 * to an existing session
	 * @param message
	 * @param cmd
	 */
	handleChatCommand(message:TwitchatDataTypes.TranslatableMessage, cmd:string):Promise<void>;
	/**
	 * Adds message to given session
	 * Properly handles adding message to a remote session when moderating
	 * @param message
	 * @param session
	 */
	addMessageToSession(message:TwitchatDataTypes.TranslatableMessage, session:TwitchatDataTypes.QnaSession):Promise<void>;
	/**
	 * Removes message from given session
	 * Properly handles removing message from a remote session when moderating
	 * @param message
	 * @param session
	 */
	removeMessageFromSession(message:TwitchatDataTypes.QnaSession["messages"][number], session:TwitchatDataTypes.QnaSession):Promise<void>;
	/**
	 * Deletes the given message from the sessions
	 * @param messageID id of the message
	 */
	onDeleteMessage(messageID:string):void;
	/**
	 * Sends shared sessions with connected mods
	 */
	shareSessionsWithMods():void;
	/**
	 * Highlights given entry on overlay
	 */
	highlightEntry(entry:TwitchatDataTypes.QnaSession["messages"][0]):void;
	/**
	 * Broadcasts Q&A list to public API
	 */
	broadcastQnaList():void
	/**
	 * Broadcasts Q&A list on Public API
	 */
	broadcastQnAList():void;
}




export interface IDiscordState {
	discordLinked:boolean;
	chatCols:number[];
	banLogThread:boolean;
	banLogTarget:string;
	chatCmdTarget:string;
	logChanTarget:string;
	ticketChanTarget:string;
	linkedToGuild:string;
	reactionsEnabled:boolean;
	quickActions:TwitchatDataTypes.DiscordQuickActionData[];
	channelList: {
		id: string;
		name: string;
	}[]
}

export interface IDiscordGetters {
}

export interface IDiscordActions {
	/**
	 * Populates data from data store value
	 */
	populateData():void;
	/**
	 * Init the discord link state
	 */
	initialize():Promise<void>;
	/**
	 * Checks if the given code is valid for the current user
	 * @param code
	 */
	validateCode(code:string):Promise<{success:boolean, errorCode?:string, guildName?:string}>;
	/**
	 * Submit the given code to confirm discord link
	 * @param code
	 */
	submitCode(code:string):Promise<true|{code:string, channelName?:string}>;
	/**
	 * Remove the lmink with discord
	 */
	unlinkDiscord():Promise<true|string>;
	/**
	 * Create a new quick action
	 */
	addQuickAction():void;
	/**
	 * Delete the given quick action
	 * @param action
	 */
	delQuickAction(action:TwitchatDataTypes.DiscordQuickActionData):void;
	/**
	 * Trigger a save of the params to server
	 */
	saveParams():void;
	/**
	 * Loads discord's channel list
	 */
	loadChannelList():Promise<void>
}




export interface IStreamlabsState {
	accessToken:string;
	socketToken:string;
	connected:boolean;
	authResult:{code:string, csrf:string};
	/**
	 * SL Charity team info.
	 */
	charityTeam:{
		id:string;
		teamURL:string;
		title:string;
		amountGoal_cents:number;
		amountRaised_cents:number;
		amountRaisedPersonnal_cents:number;
		currency:string;
		campaignId:string;
		pageUrl:string;
		cause:{
			id:string;
			title:string;
			description:string;
			website:string;
		}
	} | null;
	syncingTips:boolean;
	syncingCampaign:boolean;
	syncingLeaderboard:boolean;
}

export interface IStreamlabsGetters {
	isLoading:boolean;
}

export interface IStreamlabsActions {
	/**
	 * Populates the store from user's data
	 * @param data
	 */
	populateData():void;
	/**
	 * Connect to WS with given token
	 */
	connect(token:string, isReconnect?:boolean):Promise<boolean>;
	/**
	 * Disconnects from streamlabs
	 */
	disconnect(clearStore?:boolean):void;
	/**
	 * Saves current data to server
	 */
	saveData():void;
	/**
	 * Get the oAuth URL for streamlabs
	 */
	getOAuthURL():Promise<string>
	/**
	 * Called after authenticating with Streamlabs
	 */
	setAuthResult(code:string, csrf:string):void;
	/**
	 * Authenticate to streamlabs after getting oAuth code
	 */
	getAccessToken():Promise<boolean>;
	/**
	 * Connects to given streamlabs charity campaign
	 * if url is omitted, reloads current campaign info
	 */
	loadCharityCampaignInfo(url?:string):Promise<boolean>;
	/**
	 * Fully resync the charity campaign amount
	 */
	resyncCharityTips():Promise<void>;
	/**
	 * Disconnects from current campaign
	 */
	disconnectCharityCampaign():void;
	/**
	 * Simulate SL Charity events
	 */
	simulateEvents():Promise<void>;
	/**
	 * Resync personnal tips based on donation history
	 */
	resyncFromDonationList():Promise<void>;
}




export interface IStreamelementsState {
	accessToken:string;
	refreshToken:string;
	connected:boolean;
	authResult:{code:string, csrf:string};
	//All tips for current session
	tipSession:number;
	//Latest tip received
	tipLatest:{
		amount:number;
		message:string;
		username:string;
	};
	//Sum amount of all time tips received
	tipTotal:number;
	//Number of tips received
	tipCount:number;
	//Sum amount of tips rreceived this week
	tipWeek:number;
	//Sum amount of tips rreceived this month
	tipMonth:number;
	//Donation goal(?!)
	tipGoal:number;
	//Top donation this session
	tipSessionTopDonation:{
		amount:number;
		username:string;
	};
	//Top donator this session
	tipSessionTopDonator:{
		amount:number;
		username:string;
	};
	//Top donation this week
	tipWeeklyTopDonation:{
		amount:number;
		username:string;
	};
	//Top donator this week
	tipWeeklyTopDonator:{
		amount:number;
		username:string;
	};
	//Top donation this month
	tipMonthlyTopDonation:{
		amount:number;
		username:string;
	};
	//Top donator this month
	tipMonthlyTopDonator:{
		amount:number;
		username:string;
	};
	//Top donation all time
	tipAlltimeTopDonation:{
		amount:number;
		username:string;
	};
	//Top donator all time
	tipAlltimeTopDonator:{
		amount:number;
		username:string;
	};
}

export interface IStreamelementsGetters {
}

export interface IStreamelementsActions {
	/**
	 * Populates the store from user's data
	 */
	populateData():void;
	/**
	 * Connect to WS with given token
	 */
	connect(token:string, isReconnect?:boolean):Promise<boolean>;
	/**
	 * Disconnects from streamlabs
	 */
	disconnect():void;
	/**
	 * Saves current data to server
	 */
	saveData():void;
	/**
	 * Get the oAuth URL for streamlabs
	 */
	getOAuthURL():Promise<string>
	/**
	 * Called after authenticating with Streamlabs
	 */
	setAuthResult(code:string, csrf:string):void;
	/**
	 * Authenticate to streamlabs after getting oAuth code
	 */
	getAccessToken():Promise<boolean>
}




export interface IKofiState {
	webhooktoken:string;
	webhooks:{url:string, fails:number, enabled:boolean}[];
	connected:boolean;
}

export interface IKofiGetters {
}

export interface IKofiActions {
	/**
	 * Populates the store
	 */
	populateData():void;
	/**
	 * Connects to Ko-fi
	 */
	connect(token:string):Promise<boolean>;
	/**
	 * Disconnects from Ko-fi
	 */
	disconnect():Promise<boolean>;
	/**
	 * Called when receiving a ko-fi event
	 * @param data
	 */
	onEvent(data:any):void;
	/**
	 * Removes a webhook
	 */
	addWebhook(url:string):void;
	/**
	 * Removes a webhook
	 */
	removeWebhook(webhook:IKofiState["webhooks"][number]):void;
	/**
	 * Restarts a disabled webhook
	 */
	restartWebhook(webhook:IKofiState["webhooks"][number]):Promise<void>;
	/**
	 * Saves configs to server
	 */
	saveConfigs():void;
}




export interface ILumiaState {
	connected:boolean;
	socketToken:string;
}

export interface ILumiaGetters {
}

export interface ILumiaActions {
	/**
	 * Populates the store
	 */
	populateData():void;
	/**
	 * Connects to Lumia Stream websocket
	 * @param token
	 * @param isReconnect
	 */
	connect(token:string, isReconnect?:boolean):Promise<boolean>
	/**
	 * Disconnects from Lumia Stream websocket
	 */
	disconnect():void;
	/**
	 * Set lights color
	 * @param rgb
	 * @param duration
	 * @param transition
	 */
	setColor(rgb:number|string, brightness:number, duration:number, transition:number):void;
	/**
	 * Reads given text with given voice
	 * @param message
	 * @param voice
	 */
	sendTTS(message:string, voice:typeof LumiaVoiceList[number]):void;
	/**
	 * Saves data
	 */
	saveData():void;
}




export interface ITipeeeState {
	accessToken:string;
	refreshToken:string;
	connected:boolean;
	authResult:{code:string, csrf:string};
}

export interface ITipeeeGetters {
}

export interface ITipeeeActions {
	/**
	 * Populates the store
	 */
	populateData():void;
	/**
	 * Connects to tipeee
	 */
	connect(token:string, isReconnect?:boolean):Promise<boolean>;
	/**
	 * Refresh tipeee access token
	 */
	doRefreshToken():Promise<void>;
	/**
	 * Disconnects from tipeee
	 */
	disconnect(resetToken?:boolean):void;
	/**
	 * Get the oAuth URL for streamlabs
	 */
	getOAuthURL():Promise<string>;
	/**
	 * Called after authenticating with tipeee
	 */
	setAuthResult(code:string, csrf:string):void;
	/**
	 * Authenticate to tipeee after getting oAuth code
	 */
	completeOAuthProcess():Promise<boolean>;
	/**
	 * Saves data
	 */
	saveData():void;
}




export interface ICommonState {
	/**
	 * Hashmap linking an icon name to its SVG to avoid spamming useless
	 * requests
	 */
	iconCache:{[key:string]:string|Promise<void>};
	/**
	 * Current alert data (user alert() to populate)
	 */
	alertData: {
		/**
		 * Message to display
		 */
		message:string;
		/**
		 * defines if it's a critical error. It will remain on screen and won't be replacable
		 */
		critical:boolean;
		/**
		 * Show contact button (discord link)
		 */
		showContact:boolean;
	};
	/**
	 * Contains the name of the current OBS scene (if OBS is connected)
	 */
	currentOBSScene:string;
	/**
	 * Theme, light or dark mode
	 */
	theme: "light" | "dark";
}

export interface ICommonGetters {
}

export interface ICommonActions {
	/**
	 * Initialize common processes
	 */
	initialize(authenticated:boolean):Promise<void>;
	/**
	 * Opens up an alert at the top of the app on red bar
	 * @param message
	 * @param isCritical defines if it's a critical error. It will remain on screen and won't be replacable
	 * @param showContact defines if contact info should be displayed (discord link)
	 */
	alert(message:string, isCritical?:boolean, showContact?:boolean):void;
}




export interface IPublicState {
	initComplete:boolean;
	authenticated:boolean;
	twitchUid:string;
	twitchLogin:string;
	twitchAccessToken:string;
	twitchRefreshToken:string;
	grantedScopes:string[];
}

export interface IPublicGetters {
}

export interface IPublicActions {
	/**
	 * Starts "public" app
	 */
	startApp():void;
	/**
	 * Completes twitch auth flow
	 */
	twitchAuth(code?:string):Promise<boolean>;
	/**
	 * Request a twitch token refresh
	 * @param reconnectIRC
	 * @param callback
	 */
	twitchTokenRefresh(reconnectIRC:boolean):Promise<false|TwitchDataTypes.AuthTokenResult>;
	/**
	 * Disconnect from twithc
	 */
	twitchUnauth():void;
	/**
	 * Reload all labels (use CTRL+Alt+M)
	 */
	reloadLabels(bypassCache?:boolean):Promise<void>;
}





export interface ILabelsState {
	labelList:LabelItemData[];
	placeholders:Partial<{[key in LabelItemPlaceholder["tag"]]:{
		value:string|number;
		category:string;
		placeholder:LabelItemPlaceholder
	}}>;
}

export interface ILabelsGetters {
	allPlaceholders:ILabelsState["placeholders"];
}

export interface ILabelsActions {
	/**
	 * Populates data from storage
	 */
	populateData():void;
	/**
	 * Get a label by its tag
	 */
	getLabelByKey(key:typeof LabelItemPlaceholderList[number]["tag"]):string|number|undefined;
	/**
	 * Add a new label
	 */
	addLabel():void;
	/**
	 * Remove a new label
	 */
	removeLabel(labelId:string):void;
	/**
	 * Saves data to storage
	 * If given labelId the update propagates to related overlays
	 * @param labelId
	 */
	saveData(labelId?:string):void;
	/**
	 * Updates given placeholder's value
	 *
	 * @param key
	 * @param value
	 * @param userId useful for AVATAR placeholders. This forces avatar loading if necessary (only for Twitch users!)
	 */
	updateLabelValue(key:typeof LabelItemPlaceholderList[number]["tag"], value:string|number, userId?:string):Promise<void>;
	/**
	 * Updates a numerci label value by adding the given value to it
	 * @param key
	 * @param value
	 */
	incrementLabelValue(key:typeof LabelItemPlaceholderList[number]["tag"], value:number):Promise<void>;
	/**
	 * Broadcasts placeholders values to the overlays
	 */
	broadcastPlaceholders():void;
	/**
	 * Broadcasts given label's params
	 */
	broadcastLabelParams(labelId:string):void;
	/**
	 * Duplicate given label
	 * @param labelId
	 */
	duplicateLabel(labelId:string):void;
}





export interface IDonationGoalState {
	overlayList:TwitchatDataTypes.DonationGoalOverlayConfig[];
}

export interface IDonationGoalGetters {
}

export interface IDonationGoalActions {
	/**
	 * Populates data from storage
	 */
	populateData():void;
	/**
	 * Create a new overlay
	 */
	addOverlay():TwitchatDataTypes.DonationGoalOverlayConfig;
	/**
	 * Delete an overlay
	 * @param id
	 */
	removeOverlay(id:string):void;
	/**
	 * Duplicate an overlay
	 * @param id
	 */
	duplicateOverlay(id:string):void;
	/**
	 * Save current data
	 */
	saveData(updatedOverlayId?:string):void;
	/**
	 * Broadcasts data of given overlay ID
	 * @param overlayId
	 */
	broadcastData(overlayId?:string):void;
	/**
	 * Called when streamlabs charity campaign got updated
	 */
	onSourceValueUpdate(platform:TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"], sourceId?:string):void;
	/**
	 * Called when a new donation is received
	 */
	onDonation(username:string, amount:string, platform:TwitchatDataTypes.DonationGoalOverlayConfig["dataSource"], campaignId?:string):void;
	/**
	 * Simulates a donation for given overlay with given fake amount
	 * @param overlayId
	 * @param newAmount
	 * @param addedAmount
	 */
	simulateDonation(overlayId:string, newAmount:number, addedAmount:number):Promise<void>
}





export interface ITiltifyState {
	user:TiltifyUser|null;
	campaignList:TiltifyCampaign[];
	connected:boolean;
	token:TiltifyToken|null;
	authResult:{code:string, csrf:string};
}

export interface ITiltifyGetters {
}

export interface ITiltifyActions {
	/**
	 * Populates the store
	 */
	populateData():void;
	/**
	 * Get the oAuth URL for streamlabs
	 */
	getOAuthURL():Promise<string>;
	/**
	 * Called after authenticating with Streamlabs
	 */
	setAuthResult(code:string, csrf:string):void;
	/**
	 * Authenticate to streamlabs after getting oAuth code
	 */
	getAccessToken():Promise<boolean>;
	/**
	 * Called when authentication completes
	 */
	onAuthenticated():Promise<void>;
	/**
	 * Disconnects from Tiltify
	 */
	disconnect():Promise<boolean>;
	/**
	 * Called when receiving a tiltify event
	 * @param data
	 */
	onEvent(data:any):void;
	/**
	 * Loads info about the user and their campaigns
	 */
	loadInfos():Promise<{user:TiltifyUser, campaigns:TiltifyCampaign[]}>
}





export interface ITiktokState {
	connected:boolean;
	ip:string;
	port:number;
}

export interface ITiktokGetters {
}

export interface ITiktokActions {
	/**
	 * Populates the store
	 */
	populateData():void;
	/**
	 * Initiate connection to tikfinity socket
	 */
	connect():Promise<boolean>
	/**
	 * Closes connection with tikfinity socket
	 */
	disconnect():void
	/**
	 * Called on a TikTok event (message, gift, like,...)
	 * @param data
	 */
	onEvent(data:unknown):void;
	/**
	 * Saves current configs to store
	 */
	saveConfigs():void;
}





export interface IStreamerbotState {
	connected:boolean;
	ip:string;
	port:number;
	password:string;
	actionList:StreamerbotAction[];
}

export interface IStreamerbotGetters {
}

export interface IStreamerbotActions {
	/**
	 * Populates the store
	 */
	populateData():void;
	/**
	 * Connect with SB
	 */
	connect():Promise<boolean>;
	/**
	 * Disconnects from Streamer.bot
	 */
	disconnect():void;
	/**
	 * Execute an action by its ID
	 */
	doAction(id:string, args:{[key:string]:string}):void;
	/**
	 * Saves current configs to store
	 */
	saveConfigs():void;
	/**
	 * Lists available actions
	 */
	listActions():Promise<void>
}





export interface ISammiState {
	connected:boolean;
	ip:string;
	port:number;
	password:string;
}

export interface ISammiGetters {
}

export interface ISammiActions {
	/**
	 * Populates the store
	 */
	populateData():void;
	/**
	 * Connect with Sammi
	 */
	connect():Promise<boolean>;
	/**
	 * Disconnects from Sammi
	 */
	disconnect():void;
	/**
	 * Execute an action by its ID
	 */
	triggerButton(id:string):Promise<boolean>;
	/**
	 * Saves current configs to store
	 */
	saveConfigs():void;
}




export interface IMixitupState {
	connected: boolean;
	ip: string;
	port: number;
	commandList:{
		ID: string;
		Name: string;
		Type: string;
		IsEnabled: boolean;
		Unlocked: boolean;
		GroupName: string|null;
	}[];
}

export interface IMixitupGetters {
}

export interface IMixitupActions {
	/**
	 * Populates the store
	 */
	populateData(): Promise<void>;
	/**
	 * Connect to Mixitup
	 */
	connect(): Promise<boolean>;
	/**
	 * Disconnect from Mixitup
	 */
	disconnect(): void;
	/**
	 * Executes given command
	 * @param id
	 * @param platform
	 * @param args
	 */
	execCommand(id:string, platform:TwitchatDataTypes.ChatPlatform, args?:{[key:string]:string}):Promise<void>;
	/**
	 * Saves current configs to store
	 */
	saveConfigs(): void;
	/**
	 * Lists all available commands
	 */
	listCommands():Promise<void>;
}




export interface ITwitchCharityState {
	currentCharity:TwitchDataTypes.CharityCampaign | null;
}

export interface ITwitchCharityGetters {
}

export interface ITwitchCharityActions {
	/**
	 * Populates the store
	 */
	populateData(): Promise<void>;
	/**
	 * Called when a new charity compaign is started
	 */
	onCharityStart(charity:TwitchDataTypes.CharityCampaign):void;
	/**
	 * Called when a charity progresses
	 */
	onCharityProgress(charityId:string, currentAmount:TwitchDataTypes.CharityCampaign["current_amount"], goalAmount:TwitchDataTypes.CharityCampaign["target_amount"]):void;
	/**
	 * Called when receiving a new donation
	 * @param charityId
	 * @param user
	 * @param amount
	 * @param currency
	 */
	onCharityDonation(charityId:string, user:TwitchatDataTypes.TwitchatUser, amount:number, currency:string):void
	/**
	 * Called when a charity compaign is stopped
	 */
	onCharityStop(charityId:string):void;
	/**
	 * Update global labels
	 */
	updateLabels():void;
}




export interface IElevenLabsState {
	connected:boolean;
	apiKey:string;
	voiceList:ElevenLabsVoice[];
	modelList:ElevenLabsModel[];
	creditsUsed:number;
	creditsTotal:number;
}

export interface IElevenLabsGetters {
}

export interface IElevenLabsActions {
	/**
	 * Populates the store
	 */
	populateData(): Promise<void>;
	/**
	 * Connects to ElevenLabs
	 */
	connect(): Promise<boolean>;
	/**
	 * Disconnects from ElevenLabs
	 */
	disconnect(): void;
	/**
	 * Called when a new charity compaign is started
	 */
	read(message:string, voiceId:string, modelId:string, lang?:string, settings?:{
		similarity_boost?:number
		stability?:number
		style?:number
	}):Promise<string|false>;
	/**
	 * Loads available voices list
	 */
	loadParams():Promise<boolean>;
	/**
	 * Saves current confis
	 */
	saveConfigs():void;
	/**
	 * Load remaining api credits.
	 * Warn on chat when count is low
	 */
	loadApiCredits():Promise<void>;
	/**
	 * Builds up a cache from the history
	 */
	buildHistoryCache(onlyLatest?:boolean):Promise<void>;
}




export interface IPlayabilityState {
	connected: boolean;
	ip: string;
	port: number;
	mappingList: {
		input: {
			type: string;
			code: string;
			settings: {}
		},
		output: {
			type: NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["type"];
			code: NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["code"];
			value: NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"][number]["value"];
		},
		description: string;
		id: number;
	}[];
}

export interface IPlayabilityGetters {
}

export interface IPlayabilityActions {
	/**
	 * Populates the store
	 */
	populateData(): Promise<void>;
	/**
	 * Connect to Playability
	 */
	connect(isReconnect?:boolean): Promise<boolean>;
	/**
	 * Disconnect from Playability
	 */
	disconnect(): void;
	/**
	 * Simulates an ouput list
	 * @param outputs
	 */
	execOutputs(outputs:NonNullable<TriggerActionPlayabilityData["playabilityData"]>["outputs"]):Promise<void>;
	/**
	 * Saves current configs to store
	 */
	saveConfigs(): void;
	/**
	 * Reload current profile definition
	 */
	loadProfile():void;
}




export interface ITwitchBotState {
	connected:boolean;
	connecting:boolean;
	authToken:TwitchDataTypes.AuthTokenResult|null;
	userInfos:TwitchDataTypes.Token|null;
}

export interface ITwitchBotGetters {
}

export interface ITwitchBotActions {
	/**
	 * Populates the store
	 */
	populateData(): Promise<void>;
	/**
	 * Connects Twitch bot account
	 */
	connect(): Promise<boolean>;
	/**
	 * Disconnects Twitch bot account
	 */
	disconnect(): void;
	/**
	 * Starts oAuth flow.
	 * Attempts to open a popup or redirect to the twitch auth page
	 */
	startAuthFlow(event:MouseEvent):Promise<void>;
	/**
	 * Sets oAuth result
	 */
	completeOAuthProcess(code:string, csrf:string):Promise<boolean>;
	/**
	 * Saves parameters
	 */
	saveParams():void;
}




export interface IGroqState {
	enabled:boolean;
	connected:boolean;
	apiKey:string;
	creditsUsed:number;
	creditsTotal:number;
	defaultModel:string;
	availableModels:(Groq.Models.Model & {active:boolean, context_window:number, type:"text"|"stt"|"tts"|"vision"})[];
	answerHistory:TwitchatDataTypes.GroqHistoryItem[];
}

export interface IGroqGetters {
}

export interface IGroqActions {
	/**
	 * Populates the store
	 */
	populateData(): Promise<void>;
	/**
	 * Preload message history from IndexedDB
	 */
	preloadMessageHistory():Promise<void>;
	/**
	 * Connects to Groq
	 */
	connect(): Promise<boolean>;
	/**
	 * Disconnects from Groq
	 */
	disconnect(): void;
	/**
	 * Saves current configs
	 */
	saveConfigs(): void;
	/**
	 * Ask for a summary about the given messages
	 * @param messagesList
	 * @param preprompt
	 * @param repromptEntry
	 */
	getSummary(messagesList:TwitchatDataTypes.ChatMessageTypes[], preprompt?:string, repromptEntry?:TwitchatDataTypes.GroqHistoryItem):Promise<string>;
	/**
	 * Removes an answer from DB
	 */
	removeAnswer(id:string):Promise<void>;
	/**
	 * Reprompt an history entry
	 */
	repromptHistoryEntry(id:string, prompt:string):Promise<void>;
	/**
	 * Executes a query
	 */
	executeQuery(preprompt:string, prompt:string, model?:string, jsonSchema?:string):Promise<string|false>
}




export interface IAnimatedTextState {
	/**
	 * AnimatedText's list
	 */
	animatedTextList: TwitchatDataTypes.AnimatedTextData[],
}

export interface IAnimatedTextGetters {
}

export interface IAnimatedTextActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Braodcast current animatedText states via the PublicAPI
	 */
	broadcastStates(id?:string):void;
	/**
	 * Create a animatedText
	 */
	createAnimatedText():void;
	/**
	 * Deletes given animatedText
	 */
	deleteAnimatedText(id:string):void;
	/**
	 * Saves data to server
	 */
	saveData():void;
	/**
	 * Starts the animation of the given text
	 * Promise resolves after text is hidden
	 */
	animateText(overlayId:string, text:string, autoHide?:boolean, bypassAll?:boolean):Promise<void>
	/**
	 * Hide text currently displayed
	 */
	hideText(overlayId:string):Promise<void>
}





export interface ICustomTrainState {
	/**
	 * Custom train's list
	 */
	customTrainList: TwitchatDataTypes.CustomTrainData[],
	/**
	 * Custom train's states
	 * This is a hash map of all custom trains currently running on the channel.
	 */
	customTrainStates: {[trainId:string]:TwitchatDataTypes.CustomTrainState}
}

export interface ICustomTrainGetters {
}

export interface ICustomTrainActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Braodcast current custom train states via the PublicAPI
	 */
	broadcastStates(id?:string):void;
	/**
	 * Create a custom train
	 */
	createCustomTrain():void;
	/**
	 * Deletes given custom train
	 */
	deleteCustomTrain(id:string):void;
	/**
	 * Registers an activity to any running custom train
	 */
	registerActivity(messageId:string, platform:ICustomTrainState["customTrainStates"][string]["activities"][number]["platform"], amount:number):void;
	/**
	 * Simulates a fake hype train
	 */
	simulateTrain(overlayId:string):Promise<void>;
	/**
	 * Saves data to server
	 */
	saveData():void;
	/**
	 * Resets cooldown of given train
	 */
	resetCooldown(trainId:string):void;
}





export interface IStreamSocketState {
	connected:boolean;
	invalidSecret:boolean;
	connecting:boolean;
	socketSecret:string;
}

export interface IStreamSocketGetters {
}

export interface IStreamSocketActions {
	/**
	 * Populates the store from user's data
	 * @param data
	 */
	populateData():void;
	/**
	 * Connect to WS with given token
	 */
	connect(secret:string, isReconnect?:boolean):Promise<boolean>;
	/**
	 * Disconnects from streamlabs
	 */
	disconnect(clearStore?:boolean):void;
	/**
	 * Saves current data to server
	 */
	saveData():void;
}





export interface IExporterState {
	/**
	 * True when exporting selected settings
	 */
	exportingSelectedSettings:boolean;

	selectedTriggerIDs:string[];
	selectedTimerIDs:string[];
	selectedCounterIDs:string[];
	selectedValueIDs:string[];
	selectedLabelIDs:string[];
	selectedAnimatedTextIDs:string[];
	selectedCustomTrainIDs:string[];
	selectedEndingCreditsSlotIDs:string[];
	selectedBingoGridIDs:string[];
}

export interface IExporterGetters {
}

export interface IExporterActions {
	/**
	 * Export the selected triggers to a sharable preset file
	 */
	exportSelectedSettings(
		exportName:string,
		description:string,
		autoDeleteDate:string|undefined,
		paramList:SettingsExportData["params"],
		password?:string
	):Promise<string|false>;
	/**
	 * Imports settings from a sharable preset file
	 * @param data 
	 */
	importSettings(data:SettingsExportData):void;
}





export interface IEndingCreditsState {
	/**
	 * True when exporting selected settings
	 */
	overlayData:TwitchatDataTypes.EndingCreditsParams;
}

export interface IEndingCreditsGetters {
}

export interface IEndingCreditsActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():void;
	/**
	 * Save current ending credits params
	 */
	saveParams():Promise<void>;
}





export interface IQuizState {
	/**
	 * True when exporting selected settings
	 */
	quizList:TwitchatDataTypes.QuizParams[];
	/**
	 * Stores current states of live quizes.
	 * Contains users votes.
	 */
	liveStates:{[quizId:string]: TwitchatDataTypes.QuizState};
}

export interface IQuizGetters {
}

export interface IQuizActions {
	/**
	 * Populates store from DataStorage
	 */
	populateData():Promise<void>;
	/**
	 * Create a new quiz
	 * @param payload
	 */
	addQuiz(mode: TwitchatDataTypes.QuizParams["mode"]):TwitchatDataTypes.QuizParams;
	/**
	 * Delete a quiz
	 */
	removeQuiz(id:string):void;
	/**
	 * Duplicates given quiz
	 * @param id
	 */
	duplicateQuiz(id:string):TwitchatDataTypes.QuizParams|undefined;
	/**
	 * Registers an answer to a quiz question
	 * @param quizId 
	 * @param questionId 
	 * @param answerId 
	 * @param answerText 
	 */
	handleAnswer(quizId:string, questionId:string, answerId?:string, answerText?:string, userId?:string, opaqueUserId?:string):Promise<void>;
	/**
	 * Saves data to server
	 * @param quizId quiz ID. This will broadcast update to overlay
	 */
	saveData(quizId?:string):Promise<void>;
	/**
	 * Starts the next question of given quiz ID
	 * @param quizId 
	 */
	startNextQuestion(quizId:string):void;
	/**
	 * Reveal answer for current question of given quiz ID
	 * @param quizId 
	 */
	revealAnswer(quizId:string):void;
}





export interface IStreamfogState {
	connected:boolean;
	invalidID:boolean;
	connecting:boolean;
	userId:string;
	lensesList:Lense[]
	userLensesList:Lense[]
	videoList:Video[]
}

export interface IStreamfogGetters {
}

export interface IStreamfogActions {
	/**
	 * Populates the store from user's data
	 * @param data
	 */
	populateData():void;
	/**
	 * Connect to streamfog
	 */
	connect(userId:string, isReconnect?:boolean):Promise<true|string>;
	/**
	 * Lists all lenses available
	 */
	listAllLenses():Promise<Lense[]|false>
	/**
	 * Lists user lenses
	 */
	listUserLenses():Promise<boolean>
	/**
	 * Activate given lense for given duration (optional)
	 */
	activateLense(lenseId:string, duration_ms?:number):Promise<boolean>
	/**
	 * Deactivate any currently active lense
	 */
	deactivateLense():Promise<boolean>;
	/**
	 * Enables playing a video animation
	 */
	playVideoAnimation(videoId:string):Promise<boolean>
	/**
	 * Saves current data to server
	 */
	saveData():void;
}