import type { JsonObject, JsonArray, JsonValue } from 'type-fest';
import { Event } from './EventDispatcher';

/**
* Created : 14/04/2022 
*/
export default class TwitchatEvent extends Event {
	public static TWITCHAT_READY:TwitchatEventType = "TWITCHAT_READY";
	public static CUSTOM_OBS_WS_EVENT:TwitchatEventType = "CustomEvent";
	public static OBS_WEBSOCKET_CONNECTED:TwitchatEventType = "OBS_WEBSOCKET_CONNECTED";
	public static TEXT_UPDATE:string = "TEXT_UPDATE";
	public static RAW_TEXT_UPDATE:string = "RAW_TEXT_UPDATE";
	public static ACTION_BATCH:string = "ACTION_BATCH";
	public static SPEECH_END:string = "SPEECH_END";
	public static REMOTE_TEMP_TEXT_EVENT:TwitchatEventType = "REMOTE_TEMP_TEXT_EVENT";
	public static REMOTE_FINAL_TEXT_EVENT:TwitchatEventType = "REMOTE_FINAL_TEXT_EVENT";

	//Events
	public static MESSAGE_READ:TwitchatEventType = "MESSAGE_READ";
	public static MESSAGE_NON_FOLLOWER:TwitchatEventType = "MESSAGE_NON_FOLLOWER";
	public static MESSAGE_FILTERED:TwitchatEventType = "MESSAGE_FILTERED";
	public static MESSAGE_DELETED:TwitchatEventType = "MESSAGE_DELETED";
	public static MESSAGE_FIRST:TwitchatEventType = "MESSAGE_FIRST";
	public static MESSAGE_FIRST_ALL_TIME:TwitchatEventType = "MESSAGE_FIRST_ALL_TIME";
	public static MESSAGE_WHISPER:TwitchatEventType = "MESSAGE_WHISPER";
	public static FOLLOW:TwitchatEventType = "FOLLOW";
	public static REWARD_REDEEM:TwitchatEventType = "REWARD_REDEEM";
	public static POLL_PROGRESS:TwitchatEventType = "POLL_PROGRESS";
	public static PREDICTION_PROGRESS:TwitchatEventType = "PREDICTION_PROGRESS";
	public static MENTION:TwitchatEventType = "MENTION";
	public static CURRENT_TRACK:TwitchatEventType = "CURRENT_TRACK";
	public static TRACK_ADDED_TO_QUEUE:TwitchatEventType = "TRACK_ADDED_TO_QUEUE";
	public static WHEEL_OVERLAY_PRESENCE:TwitchatEventType = "WHEEL_OVERLAY_PRESENCE";
	public static COUNTDOWN_START:TwitchatEventType = "COUNTDOWN_START";
	public static COUNTDOWN_COMPLETE:TwitchatEventType = "COUNTDOWN_COMPLETE";
	public static TIMER_START:TwitchatEventType = "TIMER_START";
	public static TIMER_STOP:TwitchatEventType = "TIMER_STOP";
	public static TIMER_OVERLAY_PRESENCE:TwitchatEventType = "TIMER_OVERLAY_PRESENCE";
	public static RAFFLE_RESULT:TwitchatEventType = "RAFFLE_RESULT";
	public static EMERGENCY_MODE:TwitchatEventType = "EMERGENCY_MODE";
	public static CHAT_HIGHLIGHT_OVERLAY_PRESENCE:TwitchatEventType = "CHAT_HIGHLIGHT_OVERLAY_PRESENCE";
	public static CHAT_HIGHLIGHT_OVERLAY_CONFIRM:TwitchatEventType = "CHAT_HIGHLIGHT_OVERLAY_CONFIRM";
	public static VOICEMOD_CHANGE:TwitchatEventType = "VOICEMOD_CHANGE";
	public static SET_COLS_COUNT:TwitchatEventType = "SET_COLS_COUNT";
	public static COUNTER_UPDATE:TwitchatEventType = "COUNTER_UPDATE";
	public static COUNTER_LIST:TwitchatEventType = "COUNTER_LIST";
	public static OBS_SCENE_CHANGE:TwitchatEventType = "OBS_SCENE_CHANGE";
	public static OBS_SOURCE_TOGGLE:TwitchatEventType = "OBS_SOURCE_TOGGLE";
	public static OBS_MUTE_TOGGLE:TwitchatEventType = "OBS_MUTE_TOGGLE";
	public static OBS_FILTER_TOGGLE:TwitchatEventType = "OBS_FILTER_TOGGLE";
	public static OBS_PLAYBACK_ENDED:TwitchatEventType = "OBS_PLAYBACK_ENDED";
	public static OBS_PLAYBACK_STARTED:TwitchatEventType = "OBS_PLAYBACK_STARTED";
	public static OBS_PLAYBACK_PAUSED:TwitchatEventType = "OBS_PLAYBACK_PAUSED";
	public static OBS_PLAYBACK_RESTARTED:TwitchatEventType = "OBS_PLAYBACK_RESTARTED";
	public static OBS_PLAYBACK_NEXT:TwitchatEventType = "OBS_PLAYBACK_NEXT";
	public static OBS_PLAYBACK_PREVIOUS:TwitchatEventType = "OBS_PLAYBACK_PREVIOUS";
	public static OBS_INPUT_NAME_CHANGED:TwitchatEventType = "OBS_INPUT_NAME_CHANGED";
	public static OBS_SCENE_NAME_CHANGED:TwitchatEventType = "OBS_SCENE_NAME_CHANGED";
	public static OBS_FILTER_NAME_CHANGED:TwitchatEventType = "OBS_FILTER_NAME_CHANGED";

	//Actions
	public static GREET_FEED_READ:TwitchatActionType = "GREET_FEED_READ";
	public static GREET_FEED_READ_ALL:TwitchatActionType = "GREET_FEED_READ_ALL";
	public static CHAT_FEED_READ:TwitchatActionType = "CHAT_FEED_READ";
	public static CHAT_FEED_READ_ALL:TwitchatActionType = "CHAT_FEED_READ_ALL";
	public static CHAT_FEED_PAUSE:TwitchatActionType = "CHAT_FEED_PAUSE";
	public static CHAT_FEED_UNPAUSE:TwitchatActionType = "CHAT_FEED_UNPAUSE";
	public static CHAT_FEED_SCROLL_UP:TwitchatActionType = "CHAT_FEED_SCROLL_UP";
	public static CHAT_FEED_SCROLL_DOWN:TwitchatActionType = "CHAT_FEED_SCROLL_DOWN";
	public static CHAT_FEED_SCROLL:TwitchatActionType = "CHAT_FEED_SCROLL";
	public static CHAT_FEED_SCROLL_BOTTOM:TwitchatActionType = "CHAT_FEED_SCROLL_BOTTOM";
	public static CHAT_FEED_SELECT:TwitchatActionType = "CHAT_FEED_SELECT";
	public static CHAT_FEED_SELECT_ACTION_CANCEL:TwitchatActionType = "CHAT_FEED_SELECT_ACTION_CANCEL";
	public static CHAT_FEED_SELECT_ACTION_DELETE:TwitchatActionType = "CHAT_FEED_SELECT_ACTION_DELETE";
	public static CHAT_FEED_SELECT_ACTION_BAN:TwitchatActionType = "CHAT_FEED_SELECT_ACTION_BAN";
	public static CHAT_FEED_SELECT_CHOOSING_ACTION:TwitchatActionType = "CHAT_FEED_SELECT_CHOOSING_ACTION";
	public static CHAT_FEED_SELECT_ACTION_PIN:TwitchatActionType = "CHAT_FEED_SELECT_ACTION_PIN";
	public static CHAT_FEED_SELECT_ACTION_HIGHLIGHT:TwitchatActionType = "CHAT_FEED_SELECT_ACTION_HIGHLIGHT";
	public static CHAT_FEED_SELECT_ACTION_SHOUTOUT:TwitchatActionType = "CHAT_FEED_SELECT_ACTION_SHOUTOUT";
	public static CLEAR_CHAT_HIGHLIGHT:TwitchatActionType = "CLEAR_CHAT_HIGHLIGHT";
	public static POLL_TOGGLE:TwitchatActionType = "POLL_TOGGLE";
	public static POLL_CREATE:TwitchatActionType = "POLL_CREATE";
	public static PREDICTION_TOGGLE:TwitchatActionType = "PREDICTION_TOGGLE";
	public static PREDICTION_CREATE:TwitchatActionType = "PREDICTION_CREATE";
	public static BINGO_TOGGLE:TwitchatActionType = "BINGO_TOGGLE";
	public static RAFFLE_TOGGLE:TwitchatActionType = "RAFFLE_TOGGLE";
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
	public static RAFFLE_START:TwitchatActionType = "RAFFLE_START";
	public static RAFFLE_PICK_WINNER:TwitchatActionType = "RAFFLE_PICK_WINNER";
	public static RAFFLE_END:TwitchatActionType = "RAFFLE_END";
	public static GET_COLS_COUNT:TwitchatActionType = "GET_COLS_COUNT";
	public static COUNTER_GET_ALL:TwitchatActionType = "COUNTER_GET_ALL";
	public static COUNTER_GET:TwitchatActionType = "COUNTER_GET";
	public static COUNTER_ADD:TwitchatActionType = "COUNTER_ADD";
	public static TIMER_ADD:TwitchatActionType = "TIMER_ADD";
	public static COUNTDOWN_ADD:TwitchatActionType = "COUNTDOWN_ADD";
	public static CREATE_POLL:TwitchatActionType = "CREATE_POLL";
	public static STOP_POLL:TwitchatActionType = "STOP_POLL";
	public static CREATE_PREDICTION:TwitchatActionType = "CREATE_PREDICTION";
	public static STOP_PREDICTION:TwitchatActionType = "STOP_PREDICTION";
	public static CREATE_RAFFLE:TwitchatActionType = "CREATE_RAFFLE";
	public static STOP_RAFFLE:TwitchatActionType = "STOP_RAFFLE";

	constructor(type:TwitchatActionType|TwitchatEventType, public data?:JsonObject | JsonArray | JsonValue) {
		super(type);
	}
}

export const TwitchatEventTypeList = [
	"CustomEvent",//Do not uppercase/change this ! it matches an OBS-WS event
	"TWITCHAT_READY",
	"OBS_WEBSOCKET_CONNECTED",
	"TEXT_UPDATE",
	"ACTION_BATCH",
	"SPEECH_END",
	"REMOTE_TEMP_TEXT_EVENT",
	"REMOTE_FINAL_TEXT_EVENT",
	"MESSAGE_READ",
	"MESSAGE_NON_FOLLOWER",
	"MESSAGE_FILTERED",
	"MESSAGE_DELETED",
	"MESSAGE_FIRST",
	"MESSAGE_FIRST_ALL_TIME",
	"MESSAGE_WHISPER",
	"FOLLOW",
	"REWARD_REDEEM",
	"MENTION",
	"CURRENT_TRACK",
	"TRACK_ADDED_TO_QUEUE",
	"WHEEL_OVERLAY_PRESENCE",
	"COUNTDOWN_START",
	"COUNTDOWN_COMPLETE",
	"TIMER_START",
	"TIMER_STOP",
	"TIMER_OVERLAY_PRESENCE",
	"POLL_PROGRESS",
	"PREDICTION_PROGRESS",
	"RAFFLE_RESULT",
	"EMERGENCY_MODE",
	"CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
	"CHAT_HIGHLIGHT_OVERLAY_CONFIRM",
	"VOICEMOD_CHANGE",
	"SET_COLS_COUNT",
	"COUNTER_UPDATE",
	"COUNTER_LIST",
	"OBS_SCENE_CHANGE",
	"OBS_SOURCE_TOGGLE",
	"OBS_MUTE_TOGGLE",
	"OBS_FILTER_TOGGLE",
	"OBS_PLAYBACK_ENDED",
	"OBS_PLAYBACK_STARTED",
	"OBS_PLAYBACK_PAUSED",
	"OBS_PLAYBACK_RESTARTED",
	"OBS_PLAYBACK_NEXT",
	"OBS_PLAYBACK_PREVIOUS",
	"OBS_INPUT_NAME_CHANGED",
	"OBS_SCENE_NAME_CHANGED",
	"OBS_FILTER_NAME_CHANGED",
] as const;
export type TwitchatEventType = typeof TwitchatEventTypeList[number];

export const TwitchatActionTypeList = [
	"GREET_FEED_READ",
	"GREET_FEED_READ_ALL",
	"CHAT_FEED_READ",
	"CHAT_FEED_READ_ALL",
	"CHAT_FEED_PAUSE",
	"CHAT_FEED_UNPAUSE",
	"CHAT_FEED_SCROLL_UP",
	"CHAT_FEED_SCROLL_DOWN",
	"CHAT_FEED_SCROLL",
	"CHAT_FEED_SCROLL_BOTTOM",
	"CHAT_FEED_SELECT",
	"CHAT_FEED_SELECT_ACTION_CANCEL",
	"CHAT_FEED_SELECT_ACTION_DELETE",
	"CHAT_FEED_SELECT_ACTION_BAN",
	"CHAT_FEED_SELECT_CHOOSING_ACTION",
	"CHAT_FEED_SELECT_ACTION_PIN",
	"CHAT_FEED_SELECT_ACTION_HIGHLIGHT",
	"CHAT_FEED_SELECT_ACTION_SHOUTOUT",
	"CLEAR_CHAT_HIGHLIGHT",
	"POLL_TOGGLE",
	"POLL_CREATE",
	"PREDICTION_TOGGLE",
	"PREDICTION_CREATE",
	"BINGO_TOGGLE",
	"RAFFLE_TOGGLE",
	"VIEWERS_COUNT_TOGGLE",
	"MOD_TOOLS_TOGGLE",
	"CENSOR_DELETED_MESSAGES_TOGGLE",
	"GET_CURRENT_TRACK",
	"GET_WHEEL_OVERLAY_PRESENCE",
	"WHEEL_OVERLAY_START",
	"GET_CURRENT_TIMERS",
	"GET_TIMER_OVERLAY_PRESENCE",
	"SET_EMERGENCY_MODE",
	"GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE",
	"SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE",
	"SHOW_CLIP",
	"START_EMERGENCY",
	"STOP_EMERGENCY",
	"SHOUTOUT",
	"STOP_TTS",
	"ENABLE_STT",
	"DISABLE_STT",
	"RAFFLE_START",
	"RAFFLE_PICK_WINNER",
	"RAFFLE_END",
	"GET_COLS_COUNT",
	"COUNTER_GET_ALL",
	"COUNTER_GET",
	"COUNTER_ADD",
	"TIMER_ADD",
	"COUNTDOWN_ADD",
	"CREATE_POLL",
	"STOP_POLL",
	"CREATE_PREDICTION",
	"STOP_PREDICTION",
	"CREATE_RAFFLE",
	"STOP_RAFFLE",
] as const;
export type TwitchatActionType = typeof TwitchatActionTypeList[number];