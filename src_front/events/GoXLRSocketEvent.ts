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
	public static FADER_MUTE:"FADER_MUTE" = "FADER_MUTE";
	public static FADER_UNMUTE:"FADER_UNMUTE" = "FADER_UNMUTE";
	public static FADER_VOLUME:"FADER_VOLUME" = "FADER_VOLUME";

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
	 * Contains the index of the muted/unmuted fader
	 * Only for those events:
	 * FADER_MUTE
	 * FADER_UNMUTE
	 */
	public faderIndex?:1|2|3|4;
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

	/**
	 * Contains the fader channel
	 * Only for those events:
	 * FADER_VOLUME
	 */
	public faderChannel?:GoXLRTypes.InputTypesData;

	/**
	 * Contains the fader value
	 * Only for those events:
	 * FADER_VOLUME
	 */
	public faderVolume?:number;
	
	constructor(eventType:"ENCODER", encoderId:GoXLRTypes.ButtonTypesData, encoderValue:number, prevEncoderValue:number, fxIndex:number);
	constructor(eventType:"FADER_VOLUME", channel:GoXLRTypes.InputTypesData, value:number);
	constructor(eventType:"SAMPLE_PLAYBACK_COMPLETE", bankId:Extract<GoXLRTypes.ButtonTypesData, "SamplerSelectA"|"SamplerSelectB"|"SamplerSelectC">, buttonId:Extract<GoXLRTypes.ButtonTypesData, "SamplerTopLeft"|"SamplerTopRight"|"SamplerBottomLeft"|"SamplerBottomRight">);
	constructor(eventType:"FX_ENABLED"|"FX_DISABLED", fxIndex:number);
	constructor(eventType:"FADER_MUTE"|"FADER_UNMUTE", faderIndex:1|2|3|4);
	constructor(eventType:"BUTTON_PRESSED"|"BUTTON_RELEASED", button?:GoXLRTypes.ButtonTypesData);
	constructor(...params:any[]) {
		type EventTypes = (typeof GoXLRSocketEvent)[keyof typeof GoXLRSocketEvent];
		const event = params[0] as EventTypes;
		super(event as string);

		let fxList:EventTypes[] = ["FX_ENABLED","FX_DISABLED"];
		if(fxList.indexOf(event) > -1) {
			this.fxIndex = params[1];
		}

		let btActionList:EventTypes[] = ["BUTTON_PRESSED","BUTTON_RELEASED"];
		if(btActionList.indexOf(event) > -1) {
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

		if(event == "FADER_MUTE" || event == "FADER_UNMUTE") {
			this.faderIndex = params[1];
		}

		if(event == "FADER_VOLUME") {
			this.faderChannel = params[1];
			this.faderVolume = params[2];
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