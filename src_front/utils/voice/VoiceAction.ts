import type { TwitchatEventMap } from "@/events/TwitchatEvent";

/**
* Created : 10/05/2022 
*/
export default class VoiceAction {

	public static TEXT_UPDATE:keyof TwitchatEventMap = "ON_STT_TEXT_UPDATE";
	public static TEXT_UPDATE_IS_PRIVATE:boolean = true;
	public static RAW_TEXT_UPDATE:keyof TwitchatEventMap = "ON_STT_RAW_TEXT_UPDATE";
	public static RAW_TEXT_UPDATE_IS_PRIVATE:boolean = true;
	public static ACTION_BATCH:keyof TwitchatEventMap = "ON_STT_ACTION_BATCH";
	public static ACTION_BATCH_IS_PRIVATE:boolean = true;
	public static SPEECH_END:keyof TwitchatEventMap = "ON_STT_SPEECH_END";
	public static SPEECH_END_IS_PRIVATE:boolean = true;

	// public static START_BOT:string = "START_BOT";
	// public static START_BOT_IS_GLOBAL:boolean = true;
	// public static STOP_BOT:string = "STOP_BOT";
	// public static STOP_BOT_IS_GLOBAL:boolean = true;

	public static ERASE:keyof TwitchatEventMap = "ON_STT_ERASE";
	public static ERASE_IS_GLOBAL:boolean = true;
	public static NEXT:keyof TwitchatEventMap = "ON_STT_NEXT";
	public static NEXT_IS_GLOBAL:boolean = true;
	public static PREVIOUS:keyof TwitchatEventMap = "ON_STT_PREVIOUS";
	public static PREVIOUS_IS_GLOBAL:boolean = true;
	public static SUBMIT:keyof TwitchatEventMap = "ON_STT_SUBMIT";
	public static SUBMIT_IS_GLOBAL:boolean = true;
	public static CANCEL:keyof TwitchatEventMap = "ON_STT_CANCEL";
	public static CANCEL_IS_GLOBAL:boolean = true;

	public static CREATE_POLL:keyof TwitchatEventMap = "ON_OPEN_POLL_CREATION_FORM";
	public static CREATE_POLL_ICON:string = "poll";

	public static STOP_POLL:keyof TwitchatEventMap = "SET_STOP_POLL";
	public static STOP_POLL_ICON:string = "poll";

	public static CREATE_PREDICTION:keyof TwitchatEventMap = "SET_OPEN_PREDICTION_CREATION_FORM";
	public static CREATE_PREDICTION_ICON:string = "prediction";

	public static STOP_PREDICTION:keyof TwitchatEventMap = "SET_STOP_PREDICTION";
	public static STOP_PREDICTION_ICON:string = "prediction";

	public static CREATE_RAFFLE:keyof TwitchatEventMap = "ON_OPEN_RAFFLE_CREATION_FORM";
	public static CREATE_RAFFLE_ICON:string = "ticket";


	public static GREET_FEED_READ:keyof TwitchatEventMap = "SET_GREET_FEED_READ";
	public static GREET_FEED_READ_ICON:string = "read";

	public static GREET_FEED_READ_ALL:keyof TwitchatEventMap = "SET_GREET_FEED_READ_ALL";
	public static GREET_FEED_READ_ALL_ICON:string = "read";

	public static CHAT_FEED_READ:keyof TwitchatEventMap = "SET_CHAT_FEED_READ";
	public static CHAT_FEED_READ_ICON:string = "read";

	public static CHAT_FEED_READ_ALL:keyof TwitchatEventMap = "SET_CHAT_FEED_READ_ALL";
	public static CHAT_FEED_READ_ALL_ICON:string = "read";

	public static CHAT_FEED_PAUSE:keyof TwitchatEventMap = "SET_CHAT_FEED_PAUSE";
	public static CHAT_FEED_PAUSE_ICON:string = "pause";

	public static CHAT_FEED_UNPAUSE:string = "SET_CHAT_FEED_PAUSE";
	public static CHAT_FEED_UNPAUSE_ICON:string = "pause";

	public static CHAT_FEED_SCROLL_UP:keyof TwitchatEventMap = "SET_CHAT_FEED_SCROLL_UP";
	public static CHAT_FEED_SCROLL_UP_ICON:string = "scrollUp";

	public static CHAT_FEED_SCROLL_DOWN:keyof TwitchatEventMap = "SET_CHAT_FEED_SCROLL_DOWN";
	public static CHAT_FEED_SCROLL_DOWN_ICON:string = "scrollDown";

	public static START_EMERGENCY = "START_EMERGENCY";
	public static START_EMERGENCY_ICON:string = "emergency";

	public static STOP_EMERGENCY = "STOP_EMERGENCY";
	public static STOP_EMERGENCY_ICON:string = "emergency";

	// public static POLL_TOGGLE:keyof TwitchatEventMap = "POLL_TOGGLE";
	// public static POLL_TOGGLE_ICON:string = "poll";
	
	// public static PREDICTION_TOGGLE:keyof TwitchatEventMap = "PREDICTION_TOGGLE";
	// public static PREDICTION_TOGGLE_ICON:string = "prediction";

	// public static BINGO_TOGGLE:keyof TwitchatEventMap = "BINGO_TOGGLE";
	// public static BINGO_TOGGLE_ICON:string = "bingo";

	// public static RAFFLE_TOGGLE:keyof TwitchatEventMap = "RAFFLE_TOGGLE";
	// public static RAFFLE_TOGGLE_ICON:string = "raffle";

	// public static ACTIVITY_FEED_TOGGLE:keyof TwitchatEventMap = "ACTIVITY_FEED_TOGGLE";
	// public static ACTIVITY_FEED_TOGGLE_ICON:string = "";

	public static VIEWERS_COUNT_TOGGLE:keyof TwitchatEventMap = "SET_VIEWERS_COUNT_TOGGLE";
	public static VIEWERS_COUNT_TOGGLE_ICON:string = "user";

	public static MOD_TOOLS_TOGGLE:keyof TwitchatEventMap = "SET_MOD_TOOLS_TOGGLE";
	public static MOD_TOOLS_TOGGLE_ICON:string = "mod";

	public static CENSOR_DELETED_MESSAGES_TOGGLE:keyof TwitchatEventMap = "SET_CENSOR_DELETED_MESSAGES_TOGGLE";
	public static CENSOR_DELETED_MESSAGES_TOGGLE_ICON:string = "show";
	
	constructor(public id?:keyof TwitchatEventMap, public sentences?:string) {
	}
}