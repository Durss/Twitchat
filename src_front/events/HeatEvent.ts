import { Event } from './EventDispatcher';

/**
* Created : 21/06/2023 
*/
export default class HeatEvent extends Event {

	public static CLICK = "CLICK";
	
	constructor(eventType:string, public coordinates?:{x:number, y:number}, public uid?:string, public ctrl?:boolean, public alt?:boolean, public shift?:boolean) {
		super(eventType);
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