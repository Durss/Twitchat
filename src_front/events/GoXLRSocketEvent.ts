import type { GoXLRTypes } from '@/types/GoXLRTypes';
import { Event } from './EventDispatcher';

/**
* Created : 21/06/2023 
*/
export default class GoXLRSocketEvent extends Event {

	public static BUTTON_PRESSED:"BUTTON_PRESSED" = "BUTTON_PRESSED";
	public static BUTTON_RELEASED:"BUTTON_RELEASED" = "BUTTON_RELEASED";
	public static FX_ENABLED:"FX_ENABLED" = "FX_ENABLED";
	public static FX_DISABLED:"FX_DISABLED" = "FX_DISABLED";

	/**
	 * ID of the button pressed/released
	 * Only for those events:
	 * BUTTON_PRESSED
	 * BUTTON_RELEASED
	 */
	public button?:GoXLRTypes.ButtonTypesData;
	/**
	 * Enabled/disabled FX index (0->5)
	 * Only for those events:
	 * FX_ENABLED
	 * FX_DISABLED
	 */
	public fxIndex?:number;
	
	constructor(eventType:"FX_ENABLED"|"FX_DISABLED", fxIndex:number);
	constructor(eventType:"BUTTON_PRESSED"|"BUTTON_RELEASED", button?:GoXLRTypes.ButtonTypesData);
	constructor(...params:any[]) {
		const event = params[0];
		super(event);
		if(["FX_ENABLED","FX_DISABLED"].indexOf(event) > -1) {
			this.fxIndex = params[1];
		}

		if(["BUTTON_PRESSED","BUTTON_RELEASED"].indexOf(event) > -1) {
			this.button = params[1];
		}
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}