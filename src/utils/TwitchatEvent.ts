import type { JsonObject, JsonArray, JsonValue } from 'type-fest';
import { Event } from './EventDispatcher';

/**
* Created : 14/04/2022 
*/
export default class TwitchatEvent extends Event {
	//Events
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
	public static CURRENT_TRACK:TwitchatEventType = "CURRENT_TRACK";
	public static TRACK_ADDED_TO_QUEUE:TwitchatEventType = "TRACK_ADDED_TO_QUEUE";
	public static WHEEL_OVERLAY_PRESENCE:TwitchatEventType = "WHEEL_OVERLAY_PRESENCE";
	public static RAFFLE_COMPLETE:TwitchatEventType = "RAFFLE_COMPLETE";

	//Actions
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
	public static GET_CURRENT_TRACK:TwitchatActionType = "GET_CURRENT_TRACK";
	public static WHEEL_OVERLAY_START:TwitchatActionType = "WHEEL_OVERLAY_START";
	public static GET_WHEEL_OVERLAY_PRESENCE:TwitchatActionType = "GET_WHEEL_OVERLAY_PRESENCE";

	constructor(type:TwitchatActionType, public data?:JsonObject | JsonArray | JsonValue) {
		super(type);
	}
}

export type TwitchatEventType =
	"MESSAGE_READ"
	| "MESSAGE_NON_FOLLOWER"
	| "MESSAGE_FILTERED"
	| "MESSAGE_DELETED"
	| "MESSAGE_FIRST"
	| "MESSAGE_FIRST_ALL_TIME"
	| "MESSAGE_WHISPER"
	| "FOLLOW"
	| "POLL"
	| "PREDICTION"
	| "MENTION"
	| "CURRENT_TRACK"
	| "TRACK_ADDED_TO_QUEUE"
	| "RAFFLE_COMPLETE"
	| "WHEEL_OVERLAY_PRESENCE"
;

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
	| "BINGO_TOGGLE"
	| "RAFFLE_TOGGLE"
	| "ACTIVITY_FEED_TOGGLE"
	| "VIEWERS_COUNT_TOGGLE"
	| "MOD_TOOLS_TOGGLE"
	| "CENSOR_DELETED_MESSAGES_TOGGLE"
	| "GET_CURRENT_TRACK"
	| "GET_WHEEL_OVERLAY_PRESENCE"
	| "WHEEL_OVERLAY_START"
;