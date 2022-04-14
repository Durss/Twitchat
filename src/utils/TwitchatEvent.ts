import { JsonObject, JsonArray, JsonValue } from 'type-fest';
import { Event } from './EventDispatcher';

/**
* Created : 14/04/2022 
*/
export default class TwitchatEvent extends Event{
	
	public static MESSAGE_READ:TwitchatEventType = "MESSAGE_READ";
	public static MESSAGE_NON_FOLLOWER:TwitchatEventType = "MESSAGE_NON_FOLLOWER";
	public static MESSAGE_FILTERED:TwitchatEventType = "MESSAGE_FILTERED";
	public static MESSAGE_DELETED:TwitchatEventType = "MESSAGE_DELETED";
	public static MESSAGE_FIRST:TwitchatEventType = "MESSAGE_FIRST";
	public static MESSAGE_FIRST_ALL_TIME:TwitchatEventType = "MESSAGE_FIRST_ALL_TIME";
	public static MESSAGE_WHISPER:TwitchatEventType = "MESSAGE_WHISPER";
	public static FOLLOW:TwitchatEventType = "FOLLOW";
	public static POLL:TwitchatEventType = "POLL";
	public static PREDICTION:TwitchatEventType = "PREDICTION";
	public static MENTION:TwitchatEventType = "MENTION";

	constructor(public eventType:TwitchatActionType, public data:JsonObject | JsonArray | JsonValue) {
		super(eventType);
	}
}

export type TwitchatEventType =
	"TEST"
	| "MESSAGE_READ"//Done
	| "MESSAGE_NON_FOLLOWER"//Done
	| "MESSAGE_FILTERED"//Done
	| "MESSAGE_DELETED"//Done
	| "MESSAGE_FIRST"//Done
	| "MESSAGE_FIRST_ALL_TIME"//Done
	| "MESSAGE_WHISPER"//Done
	| "FOLLOW"//Done
	| "POLL"//Done
	| "PREDICTION"//Done
	| "MENTION"//Done

export type TwitchatActionType =
	"GREET_FEED_READ"
	| "GREET_FEED_READ_ALL"
	| "CHAT_FEED_READ"
	| "CHAT_FEED_READ_ALL"
	| "CHAT_FEED_PAUSE"
	| "CHAT_FEED_UNPAUSE"
	| "CHAT_FEED_SCROLL_UP"
	| "CHAT_FEED_SCROLL_DOWN"
	| "POLL_TOGGLE"
	| "PREDICTION_TOGGLE"
	| "ACTIVITY_FEED_TOGGLE"
	| "VIEWERS_COUNT_TOGGLE"
	| "MOD_TOOLS_TOGGLE"
	| "DELETED_MESSAGES_TOGGLE";