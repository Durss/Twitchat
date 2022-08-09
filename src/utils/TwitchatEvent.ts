import type { JsonObject, JsonArray, JsonValue } from 'type-fest';
import { Event } from './EventDispatcher';

/**
* Created : 14/04/2022 
*/
export default class TwitchatEvent extends Event {
	//Events
	public static TEXT_UPDATE:string = "TEXT_UPDATE";
	public static RAW_TEXT_UPDATE:string = "RAW_TEXT_UPDATE";
	public static ACTION_BATCH:string = "ACTION_BATCH";
	public static SPEECH_END:string = "SPEECH_END";

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
	public static COUNTDOWN_START:TwitchatEventType = "COUNTDOWN_START";
	public static COUNTDOWN_COMPLETE:TwitchatEventType = "COUNTDOWN_COMPLETE";
	public static TIMER_START:TwitchatEventType = "TIMER_START";
	public static TIMER_STOP:TwitchatEventType = "TIMER_STOP";
	public static TIMER_OVERLAY_PRESENCE:TwitchatEventType = "TIMER_OVERLAY_PRESENCE";
	public static CREATE_POLL:TwitchatEventType = "CREATE_POLL";
	public static STOP_POLL:TwitchatEventType = "STOP_POLL";
	public static CREATE_PREDICTION:TwitchatEventType = "CREATE_PREDICTION";
	public static STOP_PREDICTION:TwitchatEventType = "STOP_PREDICTION";
	public static CREATE_RAFFLE:TwitchatEventType = "CREATE_RAFFLE";
	public static STOP_RAFFLE:TwitchatEventType = "STOP_RAFFLE";
	public static EMERGENCY_MODE:TwitchatEventType = "EMERGENCY_MODE";
	public static CHAT_HIGHLIGHT_OVERLAY_PRESENCE:TwitchatEventType = "CHAT_HIGHLIGHT_OVERLAY_PRESENCE";

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
	public static GET_TIMER_OVERLAY_PRESENCE:TwitchatActionType = "GET_TIMER_OVERLAY_PRESENCE";
	public static GET_CURRENT_TIMERS:TwitchatActionType = "GET_CURRENT_TIMERS";
	public static SET_EMERGENCY_MODE:TwitchatActionType = "SET_EMERGENCY_MODE";
	public static GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE:TwitchatActionType = "GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE";
	public static SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE:TwitchatActionType = "SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE";
	public static SHOW_CLIP:TwitchatActionType = "SHOW_CLIP";
	public static START_EMERGENCY:TwitchatActionType = "START_EMERGENCY";
	public static STOP_EMERGENCY:TwitchatActionType = "STOP_EMERGENCY";
	public static SHOUTOUT:TwitchatActionType = "SHOUTOUT";
	public static STOP_TTS:TwitchatActionType = "STOP_TTS";
	public static ENABLE_STT:TwitchatActionType = "ENABLE_STT";
	public static DISABLE_STT:TwitchatActionType = "DISABLE_STT";

	constructor(type:TwitchatActionType|TwitchatEventType, public data?:JsonObject | JsonArray | JsonValue) {
		super(type);
	}
}

export type TwitchatEventType =
	"TEXT_UPDATE"
	| "ACTION_BATCH"
	| "SPEECH_END"
	| "MESSAGE_READ"
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
	| "WHEEL_OVERLAY_PRESENCE"
	| "RAFFLE_COMPLETE"
	| "COUNTDOWN_START"
	| "COUNTDOWN_COMPLETE"
	| "TIMER_START"
	| "TIMER_STOP"
	| "TIMER_OVERLAY_PRESENCE"
	| "CREATE_POLL"
	| "STOP_POLL"
	| "CREATE_RAFFLE"
	| "STOP_RAFFLE"
	| "CREATE_PREDICTION"
	| "STOP_PREDICTION"
	| "EMERGENCY_MODE"
	| "CHAT_HIGHLIGHT_OVERLAY_PRESENCE"
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
	| "GET_CURRENT_TIMERS"
	| "GET_TIMER_OVERLAY_PRESENCE"
	| "SET_EMERGENCY_MODE"
	| "GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE"
	| "SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE"
	| "SHOW_CLIP"
	| "START_EMERGENCY"
	| "STOP_EMERGENCY"
	| "SHOUTOUT"
	| "STOP_TTS"
	| "ENABLE_STT"
	| "DISABLE_STT"
;