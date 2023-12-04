import type { IAccessibilityActions, IAccessibilityGetters, IAccessibilityState, IAccountActions, IAccountGetters, IAccountState, IAdminActions, IAdminGetters, IAdminState, IAuthActions, IAuthGetters, IAuthState, IAutomodActions, IAutomodGetters, IAutomodState, IBingoActions, IBingoGetters, IBingoState, IChatActions, IChatGetters, IChatState, IChatSuggestionActions, IChatSuggestionGetters, IChatSuggestionState, ICountersActions, ICountersGetters, ICountersState, IDebugActions, IDebugGetters, IDebugState, IEmergencyActions, IEmergencyGetters, IEmergencyState, IHeatActions, IHeatGetters, IHeatState, IMainActions, IMainGetters, IMainState, IMusicActions, IMusicGetters, IMusicState, IOBSActions, IOBSGetters, IOBSState, IParamsActions, IParamsGetters, IParamsState, IPatreonActions, IPatreonGetters, IPatreonState, IPollActions, IPollGetters, IPollState, IPredictionActions, IPredictionGetters, IPredictionState, IRaffleActions, IRaffleGetters, IRaffleState, IRewardsActions, IRewardsGetters, IRewardsState, IStreamActions, IStreamGetters, IStreamState, ITimerActions, ITimerGetters, ITimerState, ITriggersActions, ITriggersGetters, ITriggersState, ITTSActions, ITTSState, IUsersActions, IUsersGetters, IUsersState, IValuesActions, IValuesGetters, IValuesState, IVoiceActions, IVoiceGetters, IVoiceState, IYoutubeActions, IYoutubeGetters, IYoutubeState } from "./store/StoreProxy";
import type { TwitchatDataTypes } from "./types/TwitchatDataTypes";
import type Config from "./utils/Config";

declare module '@vue/runtime-core' {
	interface IStore {
		account:(IAccountState & IAccountGetters & IAccountActions) & {$state:IAccountState; $reset:()=>void};
		auth:(IAuthState & IAuthGetters & IAuthActions) & {$state:IAuthState; $reset:()=>void};
		automod:(IAutomodState & IAutomodGetters & IAutomodActions) & {$state:IAutomodState; $reset:()=>void};
		bingo:(IBingoState & IBingoGetters & IBingoActions) & {$state:IBingoState; $reset:()=>void};
		chat:(IChatState & IChatGetters & IChatActions) & {$state:IChatState; $reset:()=>void};
		chatSuggestion:(IChatSuggestionState & IChatSuggestionGetters & IChatSuggestionActions) & {$state:IChatSuggestionState; $reset:()=>void};
		emergency:(IEmergencyState & IEmergencyGetters & IEmergencyActions) & {$state:IEmergencyState; $reset:()=>void};
		music:(IMusicState & IMusicGetters & IMusicActions) & {$state:IMusicState; $reset:()=>void};
		obs:(IOBSState & IOBSGetters & IOBSActions) & {$state:IOBSState ; $reset:()=>void};
		params:(IParamsState & IParamsGetters & IParamsActions) & {$state:IParamsState; $reset:()=>void};
		poll:(IPollState & IPollGetters & IPollActions) & {$state:IPollState; $reset:()=>void};
		prediction:(IPredictionState & IPredictionGetters & IPredictionActions) & {$state:IPredictionState; $reset:()=>void};
		raffle:(IRaffleState & IRaffleGetters & IRaffleActions) & {$state:IRaffleState; $reset:()=>void};
		stream:(IStreamState & IStreamGetters & IStreamActions) & {$state:IStreamState; $reset:()=>void};
		timer:(ITimerState & ITimerGetters & ITimerActions) & {$state:ITimerState; $reset:()=>void};
		triggers:(ITriggersState & ITriggersGetters & ITriggersActions) & {$state:ITriggersState; $reset:()=>void};
		tts:(ITTSState & ITTSGetters & ITTSActions) & {$state:ITTSState ; $reset:()=>void};
		users:(IUsersState & IUsersGetters & IUsersActions) & {$state:IUsersState; $reset:()=>void};
		voice:(IVoiceState & IVoiceGetters & IVoiceActions) & {$state:IVoiceState; $reset:()=>void};
		debug:(IDebugState & IDebugGetters & IDebugActions) & {$state:IDebugState; $reset:()=>void};
		main:(IMainState & IMainGetters & IMainActions) & {$state:IMainState; $reset:()=>void};
		accessibility:(IAccessibilityState & IAccessibilityGetters & IAccessibilityActions) & {$state:IAccessibilityState; $reset:()=>void};
		admin:(IAdminState & IAdminGetters & IAdminActions) & {$state:IAdminState; $reset:()=>void};
		counters:(ICountersState & ICountersGetters & ICountersActions) & {$state:ICountersState; $reset:()=>void};
		values:(IValuesState & IValuesGetters & IValuesActions) & {$state:IValuesState; $reset:()=>void};
		rewards:(IRewardsState & IRewardsGetters & IRewardsActions) & {$state:IRewardsState; $reset:()=>void};
		heat:(IHeatState & IHeatGetters & IHeatActions) & {$state:IHeatState; $reset:()=>void};
		patreon:(IPatreonState & IPatreonGetters & IPatreonActions) & {$state:IPatreonState; $reset:()=>void};
		youtube:(IYoutubeState & IYoutubeGetters & IYoutubeActions) & {$state:IYoutubeState; $reset:()=>void};
	}

	interface ComponentCustomProperties {
		$store: IStore,
		$config: Config,
		$image: (path:string) => string,
		$placeDropdown: (dropdownList:HTMLDivElement, component:Vue, params:{width:string, left:string, top:string}) => void,
		$overlayURL: (id:TwitchatDataTypes.OverlayTypes, params?:{k:string, v:string}[]) => string,
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
		setInitMessage(message:string):void;
	}
	interface Array<T> {
		findLastIndex(
			predicate: (value: T, index: number, obj: T[]) => unknown,
			thisArg?: any
		): number;
	}

	const PaypalFunding = {
		PAYPAL: "paypal",
		VENMO: "venmo",
		APPLEPAY: "applepay",
		ITAU: "itau",
		CREDIT: "credit",
		PAYLATER: "paylater",
		CARD: "card",
		IDEAL: "ideal",
		SEPA: "sepa",
		BANCONTACT: "bancontact",
		GIROPAY: "giropay",
		SOFORT: "sofort",
		EPS: "eps",
		MYBANK: "mybank",
		P24: "p24",
		PAYU: "payu",
		BLIK: "blik",
		TRUSTLY: "trustly",
		OXXO: "oxxo",
		BOLETO: "boleto",
		BOLETOBANCARIO: "boletobancario",
		WECHATPAY: "wechatpay",
		MERCADOPAGO: "mercadopago",
		MULTIBANCO: "multibanco",
		SATISPAY: "satispay",
		PAIDY: "paidy",
	} as const;
	type PAYPAL_FUNDING_TYPE = typeof PaypalFunding;
	type PAYPAL_FUNDING_VALUES = typeof PaypalFunding[keyof typeof PaypalFunding];
	type PAYPAL_BUTTON = {
		focus:()=>void;
		close:()=>void;
		hide:()=>void;
		isEligible:()=>void;
		show:()=>void;
		render:(divID:string)=>void;
	}
	const PAYPAL_ORDER = {
		orderID: "",
		payerID: "",
		paymentID: "",
		billingToken: "",
		facilitatorAccessToken: "",
		paymentSource: "paypal",
	}
	type PAYPAL_ORDER_TYPE = typeof PAYPAL_ORDER;
	
	type PAYPAL_ORDER_ACTION = {
		resolved: boolean;
		rejected: boolean;
		errorHandled: boolean;
		value: {
			id: string;
			intent: string;
			status: string;
			purchase_units: {
				reference_id: string;
				amount: {
					currency_code: string;
					value: string;
				  };
				payee: {
					email_address: string;
					merchant_id: string;
				  };
				shipping: {
					name: {
						full_name: string;
					  };
					address: {
						address_line_1: string;
						admin_area_2: string;
						admin_area_1: string;
						postal_code: string;
						country_code: string;
					  };
				  };
			  }[];
			payer: {
				name: {
					given_name: string;
					surname: string;
				  };
				email_address: string;
				payer_id: string;
				address: {
					address_line_1: string;
					admin_area_2: string;
					admin_area_1: string;
					postal_code: string;
					country_code: string;
				  };
			  };
			create_time: string;
			links: {
				href: string;
				rel: string;
				method: string;
			  }[];
		  };
		handlers: any[];
		dispatching: boolean;
	  }

	const paypal: {
		FUNDING:PAYPAL_FUNDING_TYPE;
		Buttons:(params:{
			fundingSource:PAYPAL_FUNDING_VALUES;
			style:{
				layout?: 'vertical' | 'horizontal';
				color?: 'blue' | 'gold' | 'silver' | 'blue' | 'white' | 'black' | '';
				shape?: 'rect' | 'pill';
				label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment';
			};
			onCancel?: () => void;
			onError?: () => void;
			createOrder?: () => Promise<string>;
			onApprove?: (order:PAYPAL_ORDER_TYPE, action:{order:{get:()=>PAYPAL_ORDER_ACTION}, redirect:()=>void, restart:()=>void}) => Promise<void>;
		})=>PAYPAL_BUTTON;
	}
}