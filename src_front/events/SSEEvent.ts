import { Event } from './EventDispatcher';

/**
* Created : 21/06/2023 
*/
export default class SSEEvent<T = undefined> extends Event {

	public static ON_CONNECT = "ON_CONNECT";
	public static KO_FI_EVENT = "KO_FI_EVENT";
	public static NOTIFICATION = "NOTIFICATION";
	public static TRIGGER_SLASH_COMMAND = "TRIGGER_SLASH_COMMAND";
	public static AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED";
	
	constructor(eventType:string, public data?:T) {
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