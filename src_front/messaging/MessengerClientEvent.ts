import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { Event } from '@/events/EventDispatcher';

export default class MessengerClientEvent extends Event {

	public static MESSAGE = "MESSAGE";
	public static DELETE_MESSAGE = "DELETE_MESSAGE";
	public static WHISPER = "WHISPER";
	public static SUB = "SUB";
	public static CHEER = "CHEER";
	public static JOIN = "JOIN";
	public static LEAVE = "LEAVE";
	public static RAID = "RAID";
	public static DISCONNECT = "DISCONNECT";
	public static CLEAR_CHAT = "CLEAR_CHAT";
	public static REFRESH_TOKEN = "REFRESH_TOKEN";
	public static REWARD = "REWARD";
	public static NOTICE = "NOTICE";
	public static WATCH_STREAK = "WATCH_STREAK";
	public static CONNECTED = "CONNECTED";
	public static DISCONNECTED = "DISCONNECTED";

	public data?:	TwitchatDataTypes.MessageChatData |
					TwitchatDataTypes.MessageWhisperData |
					TwitchatDataTypes.MessageSubscriptionData |
					TwitchatDataTypes.MessageCheerData |
					TwitchatDataTypes.MessageJoinData |
					TwitchatDataTypes.MessageLeaveData |
					TwitchatDataTypes.MessageConnectData |
					TwitchatDataTypes.MessageBanData |
					TwitchatDataTypes.MessageRaidData |
					TwitchatDataTypes.MessageClearChatData |
					TwitchatDataTypes.MessageRewardRedeemData |
					TwitchatDataTypes.MessageNoticeData |
					TwitchatDataTypes.MessageWatchStreakData |
					string
					;

	constructor(type:"MESSAGE", data:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageCustomData);
	constructor(type:"DELETE_MESSAGE", data:string);
	constructor(type:"WHISPER", data:TwitchatDataTypes.MessageWhisperData);
	constructor(type:"CHEER", data:TwitchatDataTypes.MessageCheerData);
	constructor(type:"CONNECTED", data:TwitchatDataTypes.MessageConnectData);
	constructor(type:"DISCONNECTED", data:TwitchatDataTypes.MessageDisconnectData);
	constructor(type:"JOIN", data:TwitchatDataTypes.MessageJoinData);
	constructor(type:"LEAVE", data:TwitchatDataTypes.MessageLeaveData);
	constructor(type:"RAID", data:TwitchatDataTypes.MessageRaidData);
	constructor(type:"CLEAR_CHAT", data:TwitchatDataTypes.MessageClearChatData);
	constructor(type:"SUB", data:TwitchatDataTypes.MessageSubscriptionData);
	constructor(type:"REWARD", data:TwitchatDataTypes.MessageRewardRedeemData);
	constructor(type:"NOTICE", data:TwitchatDataTypes.MessageNoticeData);
	constructor(type:"WATCH_STREAK", data:TwitchatDataTypes.MessageWatchStreakData);
	constructor(type:"REFRESH_TOKEN");
	constructor(...params:any[]) {
		super(params[0]);
		this.data = params[1];
	}

}
