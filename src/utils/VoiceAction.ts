import { TwitchatActionType } from "./TwitchatEvent";

/**
* Created : 10/05/2022 
*/
export default class VoiceAction {

	public static CREATE_POLL:string = "CREATE_POLL";
	public static CREATE_POLL_DESCRIPTION:string = "Create a poll";
	public static STOP_POLL:string = "STOP_POLL";
	public static STOP_POLL_DESCRIPTION:string = "Close current poll";
	public static STOP_PREDICTION:string = "STOP_PREDICTION";
	public static STOP_PREDICTION_DESCRIPTION:string = "Close current description and choose an outcome";

	public static GREET_FEED_READ:TwitchatActionType = "GREET_FEED_READ";
	public static GREET_FEED_READ_DESCRIPTION:string = "Mark 1 \"Greet them\" message as read";
	public static GREET_FEED_READ_ALL:TwitchatActionType = "GREET_FEED_READ_ALL";
	public static GREET_FEED_READ_ALL_DESCRIPTION:string = "Mark all \"Greet them\" messages as read";
	public static CHAT_FEED_READ:TwitchatActionType = "CHAT_FEED_READ";
	public static CHAT_FEED_READ_DESCRIPTION:string = "Mark 1 chat message as read";
	public static CHAT_FEED_READ_ALL:TwitchatActionType = "CHAT_FEED_READ_ALL";
	public static CHAT_FEED_READ_ALL_DESCRIPTION:string = "Mark all chat messages as read";
	public static CHAT_FEED_PAUSE:TwitchatActionType = "CHAT_FEED_PAUSE";
	public static CHAT_FEED_PAUSE_DESCRIPTION:string = "Pause chat";
	public static CHAT_FEED_UNPAUSE:TwitchatActionType = "CHAT_FEED_UNPAUSE";
	public static CHAT_FEED_UNPAUSE_DESCRIPTION:string = "Unpause chat";
	public static CHAT_FEED_SCROLL_UP:TwitchatActionType = "CHAT_FEED_SCROLL_UP";
	public static CHAT_FEED_SCROLL_UP_DESCRIPTION:string = "Scroll chat up";
	public static CHAT_FEED_SCROLL_DOWN:TwitchatActionType = "CHAT_FEED_SCROLL_DOWN";
	public static CHAT_FEED_SCROLL_DOWN_DESCRIPTION:string = "Scroll chat down";
	public static POLL_TOGGLE:TwitchatActionType = "POLL_TOGGLE";
	public static POLL_TOGGLE_DESCRIPTION:string = "Show/hide current poll";
	public static PREDICTION_TOGGLE:TwitchatActionType = "PREDICTION_TOGGLE";
	public static PREDICTION_TOGGLE_DESCRIPTION:string = "Show/hide current prediction";
	public static BINGO_TOGGLE:TwitchatActionType = "BINGO_TOGGLE";
	public static BINGO_TOGGLE_DESCRIPTION:string = "Show/hide current bingo";
	public static RAFFLE_TOGGLE:TwitchatActionType = "RAFFLE_TOGGLE";
	public static RAFFLE_TOGGLE_DESCRIPTION:string = "Show/hide current raffle";
	public static ACTIVITY_FEED_TOGGLE:TwitchatActionType = "ACTIVITY_FEED_TOGGLE";
	public static ACTIVITY_FEED_TOGGLE_DESCRIPTION:string = "Show/hide activity feed";
	public static VIEWERS_COUNT_TOGGLE:TwitchatActionType = "VIEWERS_COUNT_TOGGLE";
	public static VIEWERS_COUNT_TOGGLE_DESCRIPTION:string = "Show/hide viewers count";
	public static MOD_TOOLS_TOGGLE:TwitchatActionType = "MOD_TOOLS_TOGGLE";
	public static MOD_TOOLS_TOGGLE_DESCRIPTION:string = "Show/hide moderation tools";
	public static CENSOR_DELETED_MESSAGES_TOGGLE:TwitchatActionType = "CENSOR_DELETED_MESSAGES_TOGGLE";
	public static CENSOR_DELETED_MESSAGES_TOGGLE_DESCRIPTION:string = "Show/hide deleted message content";
	
	constructor(public id?:string|TwitchatActionType, public sentences?:string) {
	}
}