import type { IAccessibilityActions, IAccessibilityState, IAccountActions, IAccountState, IAuthActions, IAuthState, IAutomodActions, IAutomodState, IBingoActions, IBingoState, IChatActions, IChatState, IChatSuggestionActions, IChatSuggestionState, IDebugActions, IDebugState, IEmergencyActions, IEmergencyState, IMainActions, IMainState, IMusicActions, IMusicState, IOBSActions, IOBSState, IParamsActions, IParamsState, IPollActions, IPollState, IPredictionActions, IPredictionState, IRaffleActions, IRaffleState, IStreamActions, IStreamState, ITimerActions, ITimerState, ITriggersActions, ITriggersState, ITTSActions, ITTSState, IUsersActions, IUsersState, IVoiceActions, IVoiceState } from "./store/StoreProxy";

declare module '@vue/runtime-core' {
	interface IStore {
		(id:"account"):(IAccountState & IAccountActions) & {$state:IAccountState};
		(id:"auth"):(IAuthState & IAuthActions) & {$state:IAuthState};
		(id:"automod"):(IAutomodState & IAutomodActions) & {$state:IAutomodState};
		(id:"bingo"):(IBingoState & IBingoActions) & {$state:IBingoState};
		(id:"chat"):(IChatState & IChatActions) & {$state:IChatState};
		(id:"chatSuggestion"):(IChatSuggestionState & IChatSuggestionActions) & {$state:IChatSuggestionState};
		(id:"emergency"):(IEmergencyState & IEmergencyActions) & {$state:IEmergencyState};
		(id:"music"):(IMusicState & IMusicActions) & {$state:IMusicState};
		(id:"obs"):(IOBSState & IOBSActions) & {$state:IOBSState };
		(id:"params"):(IParamsState & IParamsActions) & {$state:IParamsState};
		(id:"poll"):(IPollState & IPollActions) & {$state:IPollState};
		(id:"prediction"):(IPredictionState & IPredictionActions) & {$state:IPredictionState};
		(id:"raffle"):(IRaffleState & IRaffleActions) & {$state:IRaffleState};
		(id:"stream"):(IStreamState & IStreamActions) & {$state:IStreamState};
		(id:"timer"):(ITimerState & ITimerActions) & {$state:ITimerState};
		(id:"triggers"):(ITriggersState & ITriggersActions) & {$state:ITriggersState};
		(id:"tts"):(ITTSState & ITTSActions) & {$state:ITTSState };
		(id:"users"):(IUsersState & IUsersActions) & {$state:IUsersState};
		(id:"voice"):(IVoiceState & IVoiceActions) & {$state:IVoiceState};
		(id:"debug"):(IDebugState & IDebugActions) & {$state:IDebugState};
		(id:"main"):(IMainState & IMainActions) & {$state:IMainState};
		(id:"accessibility"):(IAccessibilityState & IAccessibilityActions) & {$state:IAccessibilityState};
	}

	interface ComponentCustomProperties {
		$store: IStore,
		$image: (path:string) => string,
		$placeDropdown: (dropdownList:HTMLDivElement, component:Vue, params:{width:string, left:string, top:string}) => void,
		$overlayURL: (id:string) => string,
		$confirm: <T>(title: string,
			description?: string,
			data?: T,
			yesLabel?:string,
			noLabel?:string,
			STTOrigin?:boolean) => Promise<T|undefined>,
	}
}
declare global {
	interface Window {
		obsstudio?: any;
	}
}