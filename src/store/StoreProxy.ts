import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { BingoData } from "@/utils/CommonDataTypes";
import type { IRCEventDataList } from "@/utils/IRCEventDataTypes";

/**
* Created : 23/09/2022 
* This class only exists to solve the circular imports hell
*/
export default class StoreProxy {
	
	public static main:IMainState & IMainActions;
	public static account:IAccountState & IAccountActions;
	public static auth:IAuthState & IAuthActions;
	public static automod:IAutomodState & IAutomodActions;
	public static bingo:IBingoState & IBingoActions;
	public static chat:IChatState & IChatActions;

}

interface IMainState {
	latestUpdateIndex: number;
	initComplete: boolean;
	showParams: boolean;
	devmode: boolean;
	canSplitView: boolean;
	ahsInstaller: TwitchatDataTypes.InstallHandler|null;
	alert: string;
	tooltip: string;
	cypherKey: string;
	cypherEnabled: false;
	tempStoreValue: unknown;
	confirm:TwitchatDataTypes.ConfirmData;
	chatAlertParams: TwitchatDataTypes.AlertParamsData;
	chatAlert:IRCEventDataList.Message|IRCEventDataList.Whisper|null;
}

interface IMainActions {
	startApp(payload:{authenticate:boolean, callback:(value:unknown)=>void}):Promise<void>
	loadDataFromStorage(authenticated:boolean):void;
	confirm(payload:TwitchatDataTypes.ConfirmData):void;
	openTooltip(payload:string):void;
	closeTooltip():void;
	setShowParams(payload:boolean):void;
	setCypherKey(payload:string):void;
	setCypherEnabled(payload:boolean):void;
	toggleDevMode(forcedState?:boolean):void;
	setCanSplitView(value:boolean):void;
	setAhsInstaller(value:TwitchatDataTypes.InstallHandler):void;
	setAlertParams(params:TwitchatDataTypes.AlertParamsData):void;
	executeChatAlert(message:IRCEventDataList.Message|IRCEventDataList.Whisper):Promise<void>;
}




interface IAccountState {
	syncDataWithServer:TwitchatDataTypes.ParameterData;
	publicDonation:TwitchatDataTypes.ParameterData;
}

interface IAccountActions {
}




interface IAuthState {
	refreshTokenTO: number;
	authenticated: boolean;
	newScopeToRequest: string[];
}

interface IAuthActions {
	refreshAuthToken(payload:(success:boolean)=>void):void;
	authenticate(payload:{code?:string, cb?:(success:boolean)=>void, forceRefresh?:boolean}):void;
	logout():void;
}




interface IAutomodState {
	params:TwitchatDataTypes.AutomodParamsData;
}

interface IAutomodActions {
	setAutomodParams(payload:TwitchatDataTypes.AutomodParamsData):void;
}




interface IBingoState {
	data:BingoData | null;
}

interface IBingoActions {
	startBingo(payload:TwitchatDataTypes.BingoConfig):void;
	stopBingo():void;
}




interface IChatState {
}

interface IChatActions {
}