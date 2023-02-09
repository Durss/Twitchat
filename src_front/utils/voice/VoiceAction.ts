import type { TwitchatActionType } from "../../events/TwitchatEvent";

/**
* Created : 10/05/2022 
*/
export default class VoiceAction {

	public static TEXT_UPDATE:string = "TEXT_UPDATE";
	public static TEXT_UPDATE_IS_PRIVATE:boolean = true;
	public static RAW_TEXT_UPDATE:string = "RAW_TEXT_UPDATE";
	public static RAW_TEXT_UPDATE_IS_PRIVATE:boolean = true;
	public static ACTION_BATCH:string = "ACTION_BATCH";
	public static ACTION_BATCH_IS_PRIVATE:boolean = true;
	public static SPEECH_END:string = "SPEECH_END";
	public static SPEECH_END_IS_PRIVATE:boolean = true;

	// public static START_BOT:string = "START_BOT";
	// public static START_BOT_IS_GLOBAL:boolean = true;
	// public static STOP_BOT:string = "STOP_BOT";
	// public static STOP_BOT_IS_GLOBAL:boolean = true;

	public static ERASE:string = "ERASE";
	public static ERASE_IS_GLOBAL:boolean = true;
	public static NEXT:string = "NEXT";
	public static NEXT_IS_GLOBAL:boolean = true;
	public static PREVIOUS:string = "PREVIOUS";
	public static PREVIOUS_IS_GLOBAL:boolean = true;
	public static SUBMIT:string = "SUBMIT";
	public static SUBMIT_IS_GLOBAL:boolean = true;
	public static CANCEL:string = "CANCEL";
	public static CANCEL_IS_GLOBAL:boolean = true;

	public static CREATE_POLL:string = "CREATE_POLL";
	public static CREATE_POLL_ICON:string = "poll";

	public static STOP_POLL:string = "STOP_POLL";
	public static STOP_POLL_ICON:string = "poll";

	public static CREATE_PREDICTION:string = "CREATE_PREDICTION";
	public static CREATE_PREDICTION_ICON:string = "prediction";

	public static STOP_PREDICTION:string = "STOP_PREDICTION";
	public static STOP_PREDICTION_ICON:string = "prediction";

	public static CREATE_RAFFLE:string = "CREATE_RAFFLE";
	public static CREATE_RAFFLE_ICON:string = "ticket";

	public static STOP_RAFFLE:string = "STOP_RAFFLE";
	public static STOP_RAFFLE_ICON:string = "ticket";


	public static GREET_FEED_READ:TwitchatActionType = "GREET_FEED_READ";
	public static GREET_FEED_READ_ICON:string = "read";

	public static GREET_FEED_READ_ALL:TwitchatActionType = "GREET_FEED_READ_ALL";
	public static GREET_FEED_READ_ALL_ICON:string = "read";

	public static CHAT_FEED_READ:TwitchatActionType = "CHAT_FEED_READ";
	public static CHAT_FEED_READ_ICON:string = "read";

	public static CHAT_FEED_READ_ALL:TwitchatActionType = "CHAT_FEED_READ_ALL";
	public static CHAT_FEED_READ_ALL_ICON:string = "read";

	public static CHAT_FEED_PAUSE:TwitchatActionType = "CHAT_FEED_PAUSE";
	public static CHAT_FEED_PAUSE_ICON:string = "pause";

	public static CHAT_FEED_UNPAUSE:TwitchatActionType = "CHAT_FEED_UNPAUSE";
	public static CHAT_FEED_UNPAUSE_ICON:string = "pause";

	public static CHAT_FEED_SCROLL_UP:TwitchatActionType = "CHAT_FEED_SCROLL_UP";
	public static CHAT_FEED_SCROLL_UP_ICON:string = "scrollUp";

	public static CHAT_FEED_SCROLL_DOWN:TwitchatActionType = "CHAT_FEED_SCROLL_DOWN";
	public static CHAT_FEED_SCROLL_DOWN_ICON:string = "scrollDown";

	public static START_EMERGENCY:TwitchatActionType = "START_EMERGENCY";
	public static START_EMERGENCY_ICON:string = "emergency";

	public static STOP_EMERGENCY:TwitchatActionType = "STOP_EMERGENCY";
	public static STOP_EMERGENCY_ICON:string = "emergency";

	// public static POLL_TOGGLE:TwitchatActionType = "POLL_TOGGLE";
	// public static POLL_TOGGLE_ICON:string = "poll";
	
	// public static PREDICTION_TOGGLE:TwitchatActionType = "PREDICTION_TOGGLE";
	// public static PREDICTION_TOGGLE_ICON:string = "prediction";

	// public static BINGO_TOGGLE:TwitchatActionType = "BINGO_TOGGLE";
	// public static BINGO_TOGGLE_ICON:string = "bingo";

	// public static RAFFLE_TOGGLE:TwitchatActionType = "RAFFLE_TOGGLE";
	// public static RAFFLE_TOGGLE_ICON:string = "raffle";

	// public static ACTIVITY_FEED_TOGGLE:TwitchatActionType = "ACTIVITY_FEED_TOGGLE";
	// public static ACTIVITY_FEED_TOGGLE_ICON:string = "";

	public static VIEWERS_COUNT_TOGGLE:TwitchatActionType = "VIEWERS_COUNT_TOGGLE";
	public static VIEWERS_COUNT_TOGGLE_ICON:string = "user";

	public static MOD_TOOLS_TOGGLE:TwitchatActionType = "MOD_TOOLS_TOGGLE";
	public static MOD_TOOLS_TOGGLE_ICON:string = "mod";

	public static CENSOR_DELETED_MESSAGES_TOGGLE:TwitchatActionType = "CENSOR_DELETED_MESSAGES_TOGGLE";
	public static CENSOR_DELETED_MESSAGES_TOGGLE_ICON:string = "show";
	
	constructor(public id?:string|TwitchatActionType, public sentences?:string) {
	}
}