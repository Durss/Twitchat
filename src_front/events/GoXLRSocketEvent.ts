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
	public static ENCODER:"ENCODER" = "ENCODER";
	public static SAMPLE_PLAYBACK_COMPLETE:"SAMPLE_PLAYBACK_COMPLETE" = "SAMPLE_PLAYBACK_COMPLETE";

	/**
	 * ID of the button pressed/released
	 * Only for those events:
	 * BUTTON_PRESSED
	 * BUTTON_RELEASED
	 */
	public buttonId?:GoXLRTypes.ButtonTypesData;
	/**
	 * Enabled/disabled FX index (0->5)
	 * Only for those events:
	 * FX_ENABLED
	 * FX_DISABLED
	 */
	public fxIndex?:number;
	/**
	 * Contains the ID of the encoder button used
	 * Only for those events:
	 * ENCODER
	 */
	public encoderId?:Extract<GoXLRTypes.ButtonTypesData, "echo"|"pitch"|"reverb"|"gender">;
	/**
	 * Contains the value of the rotated encoder button
	 * Only for those events:
	 * ENCODER
	 */
	public encoderValue?:number;
	/**
	 * Contains the previous value of the rotated encoder button
	 * Only for those events:
	 * ENCODER
	 */
	public prevEncoderValue?:number;
	/**
	 * Contains the id of the bank in which the sample is stored
	 * Only for those events:
	 * SAMPLE_PLAYBACK_COMPLETE
	 */
	public bankId?:Extract<GoXLRTypes.ButtonTypesData, "SamplerSelectA"|"SamplerSelectB"|"SamplerSelectC">;
	/**
	 * Contains the id of the sampler button that started playback
	 * Only for those events:
	 * SAMPLE_PLAYBACK_COMPLETE
	 */
	public samplerButtonId?:Extract<GoXLRTypes.ButtonTypesData, "SamplerTopLeft"|"SamplerTopRight"|"SamplerBottomLeft"|"SamplerBottomRight">;
	
	constructor(eventType:"ENCODER", encoderId:GoXLRTypes.ButtonTypesData, encoderValue:number, prevEncoderValue:number, fxIndex:number);
	constructor(eventType:"SAMPLE_PLAYBACK_COMPLETE", bankId:Extract<GoXLRTypes.ButtonTypesData, "SamplerSelectA"|"SamplerSelectB"|"SamplerSelectC">, buttonId:Extract<GoXLRTypes.ButtonTypesData, "SamplerTopLeft"|"SamplerTopRight"|"SamplerBottomLeft"|"SamplerBottomRight">);
	constructor(eventType:"FX_ENABLED"|"FX_DISABLED", fxIndex:number);
	constructor(eventType:"BUTTON_PRESSED"|"BUTTON_RELEASED", button?:GoXLRTypes.ButtonTypesData);
	constructor(...params:any[]) {
		const event = params[0];
		super(event);

		if(["FX_ENABLED","FX_DISABLED"].indexOf(event) > -1) {
			this.fxIndex = params[1];
		}

		if(["BUTTON_PRESSED","BUTTON_RELEASED"].indexOf(event) > -1) {
			this.buttonId = params[1];
		}

		if(event == "ENCODER") {
			this.encoderId = params[1];
			this.encoderValue = params[2];
			this.prevEncoderValue = params[3];
			this.fxIndex = params[4];
		}

		if(event == "SAMPLE_PLAYBACK_COMPLETE") {
			this.bankId = params[1];
			this.samplerButtonId = params[2];
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