import { Event } from '@/utils/EventDispatcher';
import type { IRCEventData } from './IRCEventDataTypes';

/**
* Created : 07/12/2020 
*/
export default class IRCEvent extends Event {

	public static MESSAGE = "MESSAGE";
	public static UNFILTERED_MESSAGE = "UNFILTERED_MESSAGE";
	public static CONNECTED = "CONNECTED";
	public static DISCONNECTED = "DISCONNECTED";
	public static BADGES_LOADED = "BADGES_LOADED";
	public static TIMEOUT = "TIMEOUT";
	public static NOTICE = "NOTICE";
	public static HIGHLIGHT = "HIGHLIGHT";
	public static BAN = "BAN";
	public static CLEARCHAT = "CLEARCHAT";
	public static DELETE_MESSAGE = "DELETE_MESSAGE";
	public static AUTOMOD = "AUTOMOD";
	public static ROOMSTATE = "ROOMSTATE";
	public static WHISPER = "WHISPER";
	public static JOIN = "JOIN";
	public static REFRESH_TOKEN = "REFRESH_TOKEN";
	
	constructor(type:string, public data?:IRCEventData) {
		super(type);
	}
	
}