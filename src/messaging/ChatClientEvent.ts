import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Event } from '@/utils/EventDispatcher';

export default class ChatClientEvent extends Event {

	public static MESSAGE = "MESSAGE";
	public static SUB = "SUB";
	public static CHEER = "CHEER";
	public static JOIN = "JOIN";
	public static LEAVE = "LEAVE";
	public static BAN = "BAN";
	public static TIMEOUT = "TIMEOUT";
	public static RAID = "RAID";
	public static DISCONNECT = "DISCONNECT";
	public static CLEAR_CHAT = "CLEAR_CHAT";

	public data!:	TwitchatDataTypes.MessageChatData |
					TwitchatDataTypes.MessageSubscriptionData |
					TwitchatDataTypes.MessageCheerData |
					TwitchatDataTypes.MessageJoinData |
					TwitchatDataTypes.MessageLeaveData |
					TwitchatDataTypes.messageBanData |
					TwitchatDataTypes.MessageTimeoutData |
					TwitchatDataTypes.MessageRaidData |
					TwitchatDataTypes.MessageDisconnectData |
					TwitchatDataTypes.MessageClearChatData
					;
	
	constructor(type:"MESSAGE", data:TwitchatDataTypes.MessageChatData);
	constructor(type:"CHEER", data:TwitchatDataTypes.MessageCheerData);
	constructor(type:"JOIN", data:TwitchatDataTypes.MessageJoinData);
	constructor(type:"LEAVE", data:TwitchatDataTypes.MessageLeaveData);
	constructor(type:"BAN", data:TwitchatDataTypes.messageBanData);
	constructor(type:"TIMEOUT", data:TwitchatDataTypes.MessageTimeoutData);
	constructor(type:"RAID", data:TwitchatDataTypes.MessageRaidData);
	constructor(type:"DISCONNECT", data:TwitchatDataTypes.MessageDisconnectData);
	constructor(type:"CLEAR_CHAT", data:TwitchatDataTypes.MessageClearChatData);
	constructor(type:"SUB", data:TwitchatDataTypes.MessageSubscriptionData);
	
	constructor(...params:any[]) {
		super(params[0]);
		this.data = params[1];
	}
	
}