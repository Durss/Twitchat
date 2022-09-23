import type { IAccountActions, IAccountState, IAuthActions, IAuthState, IAutomodActions, IAutomodState, IBingoActions, IBingoState, IChatActions, IChatState, IChatSuggestionActions, IChatSuggestionState, IEmergencyActions, IEmergencyState, IMainActions, IMainState, IMusicActions, IMusicState, IOBSActions, IOBSState, IParamsActions, IParamsState, IPollActions, IPollState, IPredictionActions, IPredictionState, IRaffleActions, IRaffleState, IStreamActions, IStreamState, ITimerActions, ITimerState, ITriggersActions, ITriggersState, ITTSActions, ITTSState, IUsersActions, IUsersState, IVoiceActions, IVoiceState } from "./store/StoreProxy";

declare module '@vue/runtime-core' {
	interface IStore {
		(id:"account"):(IAccountState & IAccountActions);
		(id:"auth"):(IAuthState & IAuthActions);
		(id:"automod"):(IAutomodState & IAutomodActions);
		(id:"bingo"):(IBingoState & IBingoActions);
		(id:"chat"):(IChatState & IChatActions);
		(id:"chatSuggestion"):(IChatSuggestionState & IChatSuggestionActions);
		(id:"emergency"):(IEmergencyState & IEmergencyActions);
		(id:"music"):(IMusicState & IMusicActions);
		(id:"obs"):(IOBSState & IOBSActions);
		(id:"params"):(IParamsState & IParamsActions);
		(id:"poll"):(IPollState & IPollActions);
		(id:"prediction"):(IPredictionState & IPredictionActions);
		(id:"raffle"):(IRaffleState & IRaffleActions);
		(id:"stream"):(IStreamState & IStreamActions);
		(id:"timer"):(ITimerState & ITimerActions);
		(id:"triggers"):(ITriggersState & ITriggersActions);
		(id:"tts"):(ITTSState & ITTSActions);
		(id:"users"):(IUsersState & IUsersActions);
		(id:"voice"):(IVoiceState & IVoiceActions);
		(id:"main"):(IMainState & IMainActions);
	}

	interface ComponentCustomProperties {
		$store: IStore,
		$store2: (test:boolean)=>string,
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