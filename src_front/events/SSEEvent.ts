import { Event } from './EventDispatcher';

/**
* Created : 21/06/2023 
*/
export default class SSEEvent<T = undefined> extends Event {

	public static ON_CONNECT = "ON_CONNECT";
	public static KO_FI_EVENT = "KO_FI_EVENT";
	public static NOTIFICATION = "NOTIFICATION";
	public static BINGO_GRID_UPDATE = "BINGO_GRID_UPDATE";
	public static BINGO_GRID_BINGO_COUNT = "BINGO_GRID_BINGO_COUNT";
	public static TICK_BINGO_GRID_CELL = "TICK_BINGO_GRID_CELL";
	public static TRIGGER_SLASH_COMMAND = "TRIGGER_SLASH_COMMAND";
	public static AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED";
	public static BINGO_GRID_UNTICK_ALL = "BINGO_GRID_UNTICK_ALL";
	
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