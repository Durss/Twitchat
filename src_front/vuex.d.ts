import type { IAccessibilityActions, IAccessibilityGetters, IAccessibilityState, IAccountActions, IAccountGetters, IAccountState, IAuthActions, IAuthGetters, IAuthState, IAutomodActions, IAutomodGetters, IAutomodState, IBingoActions, IBingoGetters, IBingoState, IChatActions, IChatGetters, IChatState, IChatSuggestionActions, IChatSuggestionGetters, IChatSuggestionState, IDebugActions, IDebugGetters, IDebugState, IEmergencyActions, IEmergencyGetters, IEmergencyState, IMainActions, IMainGetters, IMainState, IMusicActions, IMusicGetters, IMusicState, IOBSActions, IOBSGetters, IOBSState, IParamsActions, IParamsGetters, IParamsState, IPollActions, IPollGetters, IPollState, IPredictionActions, IPredictionGetters, IPredictionState, IRaffleActions, IRaffleGetters, IRaffleState, IStreamActions, IStreamGetters, IStreamState, ITimerActions, ITimerGetters, ITimerState, ITriggersActions, ITriggersGetters, ITriggersState, ITTSActions, ITTSState, IUsersActions, IUsersGetters, IUsersState, IVoiceActions, IVoiceGetters, IVoiceState } from "./store/StoreProxy";

declare module '@vue/runtime-core' {
	interface IStore {
		(id:"account"):(IAccountState & IAccountGetters & IAccountActions) & {$state:IAccountState};
		(id:"auth"):(IAuthState & IAuthGetters & IAuthActions) & {$state:IAuthState};
		(id:"automod"):(IAutomodState & IAutomodGetters & IAutomodActions) & {$state:IAutomodState};
		(id:"bingo"):(IBingoState & IBingoGetters & IBingoActions) & {$state:IBingoState};
		(id:"chat"):(IChatState & IChatGetters & IChatActions) & {$state:IChatState};
		(id:"chatSuggestion"):(IChatSuggestionState & IChatSuggestionGetters & IChatSuggestionActions) & {$state:IChatSuggestionState};
		(id:"emergency"):(IEmergencyState & IEmergencyGetters & IEmergencyActions) & {$state:IEmergencyState};
		(id:"music"):(IMusicState & IMusicGetters & IMusicActions) & {$state:IMusicState};
		(id:"obs"):(IOBSState & IOBSGetters & IOBSActions) & {$state:IOBSState };
		(id:"params"):(IParamsState & IParamsGetters & IParamsActions) & {$state:IParamsState};
		(id:"poll"):(IPollState & IPollGetters & IPollActions) & {$state:IPollState};
		(id:"prediction"):(IPredictionState & IPredictionGetters & IPredictionActions) & {$state:IPredictionState};
		(id:"raffle"):(IRaffleState & IRaffleGetters & IRaffleActions) & {$state:IRaffleState};
		(id:"stream"):(IStreamState & IStreamGetters & IStreamActions) & {$state:IStreamState};
		(id:"timer"):(ITimerState & ITimerGetters & ITimerActions) & {$state:ITimerState};
		(id:"triggers"):(ITriggersState & ITriggersGetters & ITriggersActions) & {$state:ITriggersState};
		(id:"tts"):(ITTSState & ITTSGetters & ITTSActions) & {$state:ITTSState };
		(id:"users"):(IUsersState & IUsersGetters & IUsersActions) & {$state:IUsersState};
		(id:"voice"):(IVoiceState & IVoiceGetters & IVoiceActions) & {$state:IVoiceState};
		(id:"debug"):(IDebugState & IDebugGetters & IDebugActions) & {$state:IDebugState};
		(id:"main"):(IMainState & IMainGetters & IMainActions) & {$state:IMainState};
		(id:"accessibility"):(IAccessibilityState & IAccessibilityGetters & IAccessibilityActions) & {$state:IAccessibilityState};
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