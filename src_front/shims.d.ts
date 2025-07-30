import type { RouteRecordRaw } from "vue-router";
import type { IStore } from "./store/StoreProxy";
import type { TwitchatDataTypes } from "./types/TwitchatDataTypes";
import type Config from "./utils/Config";

declare module '*.vue' {
	import type { DefineComponent } from 'vue';
	const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
	export default component;
	interface ElementAttrs extends AriaAttributes, DOMAttributes<T> {
	}
}

declare module '@vue/runtime-core' {
	interface ComponentCustomProperties {
		$store: IStore,
		$config: Config,
		$asset: (path:string) => string,
		$placeDropdown: (dropdownList:HTMLDivElement, component:{"$refs":{[key:string]:HTMLElement}}, params:{width:string, left:string, top:string}) => void,
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
		queryLocalFonts?(options?:{postscriptNames?:string[]}):Promise<{family:string, fullName:string, postscriptName:string, style:""}[]>;
		setInitMessage(message:string):void;
    	jsfxr: {sfxr:SFXR};
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
		giftUserId : "",
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
