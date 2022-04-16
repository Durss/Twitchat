import { JsonObject, JsonArray, JsonValue } from 'type-fest';
import { Event } from './EventDispatcher';

/**
* Created : 14/04/2022 
*/
export default class TwitchatEvent extends Event {
	
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

	public static GREET_FEED_READ:TwitchatActionType = "GREET_FEED_READ";
	public static GREET_FEED_READ_ALL:TwitchatActionType = "GREET_FEED_READ_ALL";
	public static CHAT_FEED_READ:TwitchatActionType = "CHAT_FEED_READ";
	public static CHAT_FEED_READ_ALL:TwitchatActionType = "CHAT_FEED_READ_ALL";
	public static CHAT_FEED_PAUSE:TwitchatActionType = "CHAT_FEED_PAUSE";
	public static CHAT_FEED_UNPAUSE:TwitchatActionType = "CHAT_FEED_UNPAUSE";
	public static CHAT_FEED_SCROLL_UP:TwitchatActionType = "CHAT_FEED_SCROLL_UP";
	public static CHAT_FEED_SCROLL_DOWN:TwitchatActionType = "CHAT_FEED_SCROLL_DOWN";
	public static POLL_TOGGLE:TwitchatActionType = "POLL_TOGGLE";
	public static PREDICTION_TOGGLE:TwitchatActionType = "PREDICTION_TOGGLE";
	public static BINGO_TOGGLE:TwitchatActionType = "BINGO_TOGGLE";
	public static RAFFLE_TOGGLE:TwitchatActionType = "RAFFLE_TOGGLE";
	public static ACTIVITY_FEED_TOGGLE:TwitchatActionType = "ACTIVITY_FEED_TOGGLE";
	public static VIEWERS_COUNT_TOGGLE:TwitchatActionType = "VIEWERS_COUNT_TOGGLE";
	public static MOD_TOOLS_TOGGLE:TwitchatActionType = "MOD_TOOLS_TOGGLE";
	public static CENSOR_DELETED_MESSAGES_TOGGLE:TwitchatActionType = "CENSOR_DELETED_MESSAGES_TOGGLE";

	constructor(type:TwitchatActionType, public data?:JsonObject | JsonArray | JsonValue) {
		super(type);
	}
}

export type TwitchatEventType =
	"TEST"//Just here for debug
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
	"GREET_FEED_READ"//Done
	| "GREET_FEED_READ_ALL"//Done
	| "CHAT_FEED_READ"//Done
	| "CHAT_FEED_READ_ALL"//Done
	| "CHAT_FEED_PAUSE"//Done
	| "CHAT_FEED_UNPAUSE"//Done
	| "CHAT_FEED_SCROLL_UP"//Done
	| "CHAT_FEED_SCROLL_DOWN"//Done
	| "POLL_TOGGLE"//Done
	| "PREDICTION_TOGGLE"//Done
	| "BINGO_TOGGLE"//Done
	| "RAFFLE_TOGGLE"//Done
	| "ACTIVITY_FEED_TOGGLE"//Done
	| "VIEWERS_COUNT_TOGGLE"//Done
	| "MOD_TOOLS_TOGGLE"//Done
	| "CENSOR_DELETED_MESSAGES_TOGGLE";//Done