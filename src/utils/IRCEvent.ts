import { Event } from '@/utils/EventDispatcher';
import { ChatUserstate } from 'tmi.js';

/**
* Created : 07/12/2020 
*/
export default class IRCEvent extends Event {

	public static MESSAGE:string = "MESSAGE";
	
	constructor(type:string, public message:string, public tags:ChatUserstate, public channel:string, public self:boolean) {
		super(type);
	}
	
}