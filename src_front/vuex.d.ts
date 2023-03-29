import type { IAccessibilityActions, IAccessibilityGetters, IAccessibilityState, IAccountActions, IAccountGetters, IAccountState, IAdminActions, IAdminGetters, IAdminState, IAuthActions, IAuthGetters, IAuthState, IAutomodActions, IAutomodGetters, IAutomodState, IBingoActions, IBingoGetters, IBingoState, IChatActions, IChatGetters, IChatState, IChatSuggestionActions, IChatSuggestionGetters, IChatSuggestionState, ICountersActions, ICountersGetters, ICountersState, IDebugActions, IDebugGetters, IDebugState, IEmergencyActions, IEmergencyGetters, IEmergencyState, IMainActions, IMainGetters, IMainState, IMusicActions, IMusicGetters, IMusicState, IOBSActions, IOBSGetters, IOBSState, IParamsActions, IParamsGetters, IParamsState, IPollActions, IPollGetters, IPollState, IPredictionActions, IPredictionGetters, IPredictionState, IRaffleActions, IRaffleGetters, IRaffleState, IRewardsActions, IRewardsGetters, IRewardsState, IStreamActions, IStreamGetters, IStreamState, ITimerActions, ITimerGetters, ITimerState, ITriggersActions, ITriggersGetters, ITriggersState, ITTSActions, ITTSState, IUsersActions, IUsersGetters, IUsersState, IVoiceActions, IVoiceGetters, IVoiceState } from "./store/StoreProxy";

declare module '@vue/runtime-core' {
	interface IStore {
		(id:"account"):(IAccountState & IAccountGetters & IAccountActions) & {$state:IAccountState; $reset:()=>void};
		(id:"auth"):(IAuthState & IAuthGetters & IAuthActions) & {$state:IAuthState; $reset:()=>void};
		(id:"automod"):(IAutomodState & IAutomodGetters & IAutomodActions) & {$state:IAutomodState; $reset:()=>void};
		(id:"bingo"):(IBingoState & IBingoGetters & IBingoActions) & {$state:IBingoState; $reset:()=>void};
		(id:"chat"):(IChatState & IChatGetters & IChatActions) & {$state:IChatState; $reset:()=>void};
		(id:"chatSuggestion"):(IChatSuggestionState & IChatSuggestionGetters & IChatSuggestionActions) & {$state:IChatSuggestionState; $reset:()=>void};
		(id:"emergency"):(IEmergencyState & IEmergencyGetters & IEmergencyActions) & {$state:IEmergencyState; $reset:()=>void};
		(id:"music"):(IMusicState & IMusicGetters & IMusicActions) & {$state:IMusicState; $reset:()=>void};
		(id:"obs"):(IOBSState & IOBSGetters & IOBSActions) & {$state:IOBSState ; $reset:()=>void};
		(id:"params"):(IParamsState & IParamsGetters & IParamsActions) & {$state:IParamsState; $reset:()=>void};
		(id:"poll"):(IPollState & IPollGetters & IPollActions) & {$state:IPollState; $reset:()=>void};
		(id:"prediction"):(IPredictionState & IPredictionGetters & IPredictionActions) & {$state:IPredictionState; $reset:()=>void};
		(id:"raffle"):(IRaffleState & IRaffleGetters & IRaffleActions) & {$state:IRaffleState; $reset:()=>void};
		(id:"stream"):(IStreamState & IStreamGetters & IStreamActions) & {$state:IStreamState; $reset:()=>void};
		(id:"timer"):(ITimerState & ITimerGetters & ITimerActions) & {$state:ITimerState; $reset:()=>void};
		(id:"triggers"):(ITriggersState & ITriggersGetters & ITriggersActions) & {$state:ITriggersState; $reset:()=>void};
		(id:"tts"):(ITTSState & ITTSGetters & ITTSActions) & {$state:ITTSState ; $reset:()=>void};
		(id:"users"):(IUsersState & IUsersGetters & IUsersActions) & {$state:IUsersState; $reset:()=>void};
		(id:"voice"):(IVoiceState & IVoiceGetters & IVoiceActions) & {$state:IVoiceState; $reset:()=>void};
		(id:"debug"):(IDebugState & IDebugGetters & IDebugActions) & {$state:IDebugState; $reset:()=>void};
		(id:"main"):(IMainState & IMainGetters & IMainActions) & {$state:IMainState; $reset:()=>void};
		(id:"accessibility"):(IAccessibilityState & IAccessibilityGetters & IAccessibilityActions) & {$state:IAccessibilityState; $reset:()=>void};
		(id:"admin"):(IAdminState & IAdminGetters & IAdminActions) & {$state:IAdminState; $reset:()=>void};
		(id:"counters"):(ICountersState & ICountersGetters & ICountersActions) & {$state:ICountersState; $reset:()=>void};
		(id:"rewards"):(IRewardsState & IRewardsGetters & IRewardsActions) & {$state:IRewardsState; $reset:()=>void};
	}

	interface ComponentCustomProperties {
		$store: IStore,
		$image: (path:string) => string,
		$placeDropdown: (dropdownList:HTMLDivElement, component:Vue, params:{width:string, left:string, top:string}) => void,
		$overlayURL: (id:string, params?:{k:string, v:string}[]) => string,
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