import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Event } from '@/utils/EventDispatcher';

export default class MessengerClientEvent extends Event {

	public static MESSAGE = "MESSAGE";
	public static WHISPER = "WHISPER";
	public static SUB = "SUB";
	public static CHEER = "CHEER";
	public static JOIN = "JOIN";
	public static LEAVE = "LEAVE";
	public static BAN = "BAN";
	public static TIMEOUT = "TIMEOUT";
	public static RAID = "RAID";
	public static DISCONNECT = "DISCONNECT";
	public static CLEAR_CHAT = "CLEAR_CHAT";
	public static REFRESH_TOKEN = "REFRESH_TOKEN";
	public static REWARD = "REWARD";

	public data?:	TwitchatDataTypes.MessageChatData |
					TwitchatDataTypes.MessageWhisperData |
					TwitchatDataTypes.MessageSubscriptionData |
					TwitchatDataTypes.MessageCheerData |
					TwitchatDataTypes.MessageJoinData |
					TwitchatDataTypes.MessageLeaveData |
					TwitchatDataTypes.messageBanData |
					TwitchatDataTypes.MessageTimeoutData |
					TwitchatDataTypes.MessageRaidData |
					TwitchatDataTypes.MessageDisconnectData |
					TwitchatDataTypes.MessageClearChatData |
					TwitchatDataTypes.MessageRewardRedeemData |
					TwitchatDataTypes.MessageNoticeData
					;
	
	constructor(type:"MESSAGE", data:TwitchatDataTypes.MessageChatData);
	constructor(type:"WHISPER", data:TwitchatDataTypes.MessageWhisperData);
	constructor(type:"CHEER", data:TwitchatDataTypes.MessageCheerData);
	constructor(type:"JOIN", data:TwitchatDataTypes.MessageJoinData);
	constructor(type:"LEAVE", data:TwitchatDataTypes.MessageLeaveData);
	constructor(type:"BAN", data:TwitchatDataTypes.messageBanData);
	constructor(type:"TIMEOUT", data:TwitchatDataTypes.MessageTimeoutData);
	constructor(type:"RAID", data:TwitchatDataTypes.MessageRaidData);
	constructor(type:"DISCONNECT", data:TwitchatDataTypes.MessageDisconnectData);
	constructor(type:"CLEAR_CHAT", data:TwitchatDataTypes.MessageClearChatData);
	constructor(type:"SUB", data:TwitchatDataTypes.MessageSubscriptionData);
	constructor(type:"NOTICE", data:TwitchatDataTypes.MessageNoticeData);
	constructor(type:"REWARD", data:TwitchatDataTypes.MessageRewardRedeemData);
	constructor(type:"REFRESH_TOKEN");
	
	constructor(...params:any[]) {
		super(params[0]);
		this.data = params[1];
	}
	
}