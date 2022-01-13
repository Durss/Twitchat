import { Event } from '@/utils/EventDispatcher';
import { ChatUserstate, DeleteUserstate, MsgID } from 'tmi.js';

/**
* Created : 07/12/2020 
*/
export default class IRCEvent extends Event {

	public static MESSAGE:string = "MESSAGE";
	public static CONNECTED:string = "CONNECTED";
	public static DISCONNECTED:string = "DISCONNECTED";
	public static BADGES_LOADED:string = "BADGES_LOADED";
	public static TIMEOUT:string = "TIMEOUT";
	public static NOTICE:string = "NOTICE";
	public static BAN:string = "BAN";
	public static CLEARCHAT:string = "CLEARCHAT";
	public static DELETE_MESSAGE:string = "DELETE_MESSAGE";
	public static AUTOMOD:string = "AUTOMOD";
	
	constructor(type:string, public data?:IRCEventData) {
		super(type);
	}
	
}

export type IRCEventData = IRCEventDataList.Message
						| IRCEventDataList.Timeout
						| IRCEventDataList.Ban
						| IRCEventDataList.MessageDeleted
						| IRCEventDataList.Automod
						| IRCEventDataList.Notice;

export namespace IRCEventDataList {
	export interface Message {
		message:string;
		tags:ChatUserstate;
		channel:string;
		self:boolean;
		//Custom injected props
		firstMessage:boolean;
	}

	export interface Timeout {
		channel: string;
		username: string;
		reason: string;
		duration: number;
	}

	export interface Ban {
		channel: string;
		username: string;
		reason: string;
	}

	export interface MessageDeleted {
		channel: string;
		username: string;
		deletedMessage: string;
		userstate: DeleteUserstate;
	}

	export interface Automod {
		channel: string;
		message: string;
		msgID: 'msg_rejected'
| 'msg_rejected_mandatory';
	}

	export interface Notice {
		channel: string;
		message: string;
		msgid: MsgID;
		notice: boolean;
		tags:ChatUserstate;
	}
}