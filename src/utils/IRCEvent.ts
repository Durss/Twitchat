import { Event } from '@/utils/EventDispatcher';
import { ChatUserstate } from 'tmi.js';

/**
* Created : 07/12/2020 
*/
export default class IRCEvent extends Event {

	public static MESSAGE:string = "MESSAGE";
	public static CONNECTED:string = "CONNECTED";
	public static DISCONNECTED:string = "DISCONNECTED";
	public static BADGES_LOADED:string = "BADGES_LOADED";
	
	constructor(type:string, public message:string, public tags:ChatUserstate, public channel:string, public self:boolean) {
		super(type);
	}
	
}