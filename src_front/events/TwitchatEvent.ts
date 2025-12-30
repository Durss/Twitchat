import { Event } from './EventDispatcher';
import type { PollOverlayParamStoreData } from "@/store/poll/storePoll";
import type { PredictionOverlayParamStoreData } from "@/store/prediction/storePrediction";
import type { LabelItemData } from "@/types/ILabelOverlayData";
import type { TriggerActionCountDataAction } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { OBSSourceItem } from '@/utils/OBSWebsocket';

/**
* Created : 14/04/2022
*/
export default class TwitchatEvent<EventName extends keyof TwitchatEventMap, Data = TwitchatEventMap[EventName]> extends Event {

	constructor(type:EventName, public data:Data) {
		super(type);
	}
}

export type TwitchatEventMap = {
	/**
	 * Twitchat completed initialization and is ready.
	 */
	ON_TWITCHAT_READY: undefined;
	/**
	 * OBS Websocket connection established
	 */
	ON_OBS_WEBSOCKET_CONNECTED: undefined;
	/**
	 * OBS Websocket connection lost
	 */
	ON_OBS_WEBSOCKET_DISCONNECTED: undefined;
	/**
	 * Set voice bot enabled/disabled state
	 */
	SET_VOICE_CONTROL_STATE: {
		enabled: boolean;
	};
	/**
	 * Scroll a chat feed up
	 */
	SET_CHAT_FEED_SCROLL_UP: {
		/**
		 * Number of pixels to scroll by
		 */
		scrollBy:number
		/**
		 * Column index
		 */
		colIndex:number
	};
	/**
	 * Scroll a chat feed down
	 */
	SET_CHAT_FEED_SCROLL_DOWN: {
		/**
		 * Number of pixels to scroll by
		 */
		scrollBy:number
		/**
		 * Column index
		 */
		colIndex:number
	};
	/**
	 * Scroll a chat feed by a specific amount
	 */
	SET_CHAT_FEED_SCROLL: {
		/**
		 * Number of pixels to scroll by.
		 * Default value: 100
		 */
		scrollBy?:number
		/**
		 * Column index
		 */
		colIndex:number,
	}
	/**
	 * Move read marker in chat feed
	 */
	SET_CHAT_FEED_READ: {
		/**
		 * Number of messages to read
		 */
		count:number
		/**
		 * Column index
		 */
		colIndex:number
	};
	SET_CHAT_FEED_READ_ALL: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_PAUSE: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_UNPAUSE: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_SCROLL_BOTTOM: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_SELECT: {
		/**
		 * Direction to move selection
		 * -1 = up
		 * 1 = down
		 * Can be greater than 1 or less than -1 to move multiple steps
		 */
		direction:number;
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_SELECT_ACTION_DELETE: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_SELECT_ACTION_BAN: {
		/**
		 * Column index
		 */
		colIndex:number;
		/**
		 * Optional ban duration in seconds.
		 * If not set, a permanent ban is done
		 */
		duration?:number;
	};
	SET_CHAT_FEED_SELECT_CHOOSING_ACTION: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_SELECT_ACTION_SAVE: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_CHAT_FEED_SELECT_ACTION_CANCEL: {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	SET_GREET_FEED_READ: {
		/**
		 * Number of messages to mark as read
		 */
		messageCount:number;
	};
	SET_GREET_FEED_READ_ALL: undefined;
	
	ON_VOICEMOD_VOICE_CHANGE: {
		/**
		 * Voice ID that got selected
		 */
		voiceId:string;
	};

	GET_ENDING_CREDITS_PRESENCE: undefined;
	SET_ENDING_CREDITS_PRESENCE: undefined;
	GET_ENDING_CREDITS_DATA: {
		/**
		 * Date offset to get data from
		 */
		dateOffset?:number;
		/**
		 * Include overlay parameters to response
		 */
		includeOverlayParams?:boolean
	};
	SET_ENDING_CREDITS_DATA: TwitchatDataTypes.StreamSummaryData;
	ON_ENDING_CREDITS_COMPLETE: undefined;
	ON_ENDING_CREDITS_CONFIGS: TwitchatDataTypes.EndingCreditsParams;
	SET_ENDING_CREDITS_CONTROL: {
		/**
		 * Go to previous section
		 */
		prev?:true
		/**
		 * Go to next section
		 */
		next?:true
		/**
		 * Scrolling speed multiplier (can be negative for reverse direction)
		 */
		speed?:number
		/**
		 * Section ID to jump to
		 */
		scrollToSectionID?: string
	};

	GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE: undefined;
	SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE: undefined;
	SET_CHAT_HIGHLIGHT_OVERLAY_CLIP: TwitchatDataTypes.ChatHighlightInfo;
	SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE: TwitchatDataTypes.ChatHighlightInfo | undefined
	/**
	 * Sent by chat highlight overlay when a clip completes playing to
	 * request main app to close the highlight
	 */
	ON_CHAT_HIGHLIGHT_OVERLAY_CLOSE: undefined;
	
	ON_MESSAGE_MARKED_AS_READ: {
		/**
		 * Manually marked as read
		 */
		manual: boolean;
		/**
		 * Message actually selected (marked as read) or unselected (unmarked)
		 */
		selected: boolean;
		/**
		 * Channel ID of the message
		 */
		channel: string;
		/**
		 * Message content
		 */
		message: string;
		/**
		 * User info
		 */
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	};

	GET_ANIMATED_TEXT_CONFIGS: {
		/**
		 * Animated text overlay ID
		 */
		id:string
	};
	ON_ANIMATED_TEXT_CONFIGS:TwitchatDataTypes.AnimatedTextData;
	SET_ANIMATED_TEXT_CONTENT: {
		/**
		 * Overlay ID to send the text to
		 */
		id: string;
		/**
		 * Query ID to identify this text set action
		 * Returned by the ANIMATED_TEXT_SHOW_COMPLETE, ANIMATED_TEXT_HIDE_COMPLETE and ANIMATED_TEXT_CLOSE events
		 */
		queryId: string;
		/**
		 * Text to display
		 */
		text: string;
		/**
		 * Auto hide after showing.
		 * Duration is based on the text length and animated text settings
		 */
		autoHide?: boolean;
		/**
		 * Hides current text immediately, bypassing any hide animation, empty the
		 * message queue and shows the new text right away.
		 */
		bypassAll?: boolean;
	}
	ON_ANIMATED_TEXT_SHOW_COMPLETE:{
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		 */
		queryId:string
	}
	ON_ANIMATED_TEXT_HIDE_COMPLETE:{
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		*/
		queryId:string
	}
	ON_ANIMATED_TEXT_CLOSE:{
		/**
		 * ID of the overlay that finished closing animation
		*/
		id:string;
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		*/
		queryId:string
	}

	GET_BINGO_GRID_CONFIGS: {
		/**
		 * Bingo grid ID to get parameters for
		 */
		id:string
	}
	ON_BINGO_GRID_CONFIGS: {
		/**
		 * Bingo grid ID
		 */
		id:string;
		/**
		 * Bingo configs
		 */
		bingo:TwitchatDataTypes.BingoGridConfig|null;
		/**
		 * Row indexes to show a bingo animation on
		 */
		newVerticalBingos?:number[];
		/**
		 * Column indexes to show a bingo animation on
		 */
		newHorizontalBingos?:number[];
		/**
		 * Diagonal indexes to show a bingo animation on
		 * 0 => top-left to bottom-right
		 * 1 => bottom-left to top-right
		 */
		newDiagonalBingos?:(0|1)[];
	}
	SET_BINGO_GRID_OVERLAY_PRESENCE: {
		/**
		 * Bingo grid ID to advertise presence of
		 */
		id:string
	}
	ON_BINGO_GRID_HEAT_CLICK: {
		/**
		 * Bingo grid ID to get parameters for
		 */
		id:string;
		/**
		 * Cell entry ID that was clicked
		 */
		entryId:string;
		/**
		 * Heat click data
		 */
		click:TwitchatDataTypes.HeatClickData
	}
	ON_BINGO_GRID_VIEWER_EVENT:{
		/**
		 * Bingo grid ID
		 */
		id: string;
		/**
		 * User info
		 */
		user: {
			name: string;
			id: string;
			avatar: string;
		};
		/**
		 * Number of bingos completed (lines, rows, diagonals)
		 */
		count: number;
	}
	ON_BINGO_GRID_LEADER_BOARD:{
		/**
		 * Bingo grid ID
		 */
		id: string;
		/**
		 * Scoreboard entries
		 * Set to undefined to hide the leaderboard
		 */
		scores?: {
			user_name: string;
			user_pic: string | undefined;
			score: number;
			pos: number;
		}[];
	}

	GET_ALL_COUNTERS: undefined;
	GET_COUNTER: {
		/**
		 * Counter ID to get value of
		 */
		id:string
	}
	ON_COUNTER_LIST:{
		counterList:{
			id: string;
			name: string;
			perUser: boolean;
		}[]
	}
	ON_COUNTER_UPDATE:{
		counter:TwitchatDataTypes.CounterData
	}
	SET_COUNTER_ADD:{
		id: string
		action: TriggerActionCountDataAction
		/**
		 * Value to add to the counter.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		value: string
	}

	GET_CUSTOM_TRAIN_DATA: {
		/**
		 * Custom train ID to get state for
		 * */
		id:string
	}
	ON_CUSTOM_TRAIN_DATA: {
		configs:TwitchatDataTypes.CustomTrainData;
		state:TwitchatDataTypes.CustomTrainState;
	}

	ON_DISTORT_OVERLAY_CONFIGS: {
		params:TwitchatDataTypes.HeatDistortionData
	};
	GET_DISTORT_OVERLAY_CONFIGS: {
		/**
		 * Distortion overlay ID to get parameters for
		 */
		id:string
	};

	GET_DONATION_GOALS_OVERLAY_CONFIGS: {
		/**
		 * Overlay ID to get parameters for
		 */
		id:string
	};
	ON_DONATION_GOALS_OVERLAY_CONFIGS: {
		params:TwitchatDataTypes.DonationGoalOverlayConfig;
		goal:number;
		raisedTotal:number;
		raisedPersonnal:number;
		skin:"default"|string
	}
	ON_DONATION_EVENT:{
		/**
		 * Overlay ID the donation event should be displayed on
		 */
		overlayId:string;
		/**
		 * Donation event username
		 */
		username:string;
		/**
		 * Donation amount
		 */
		amount:string;
	}

	GET_CURRENT_TRACK: undefined;
	ON_CURRENT_TRACK: {
		params:TwitchatDataTypes.MusicPlayerParamsData;
		trackName?:string;
		artistName?:string;
		trackDuration?:number;
		trackPlaybackPos?:number;
		cover?:string;
		skin?:string;
	};
	ON_TRACK_ADDED_TO_QUEUE: TwitchatDataTypes.MusicTrackData;

	ON_MUSIC_PLAYER_HEAT_CLICK: TwitchatDataTypes.HeatClickData;

	GET_POLLS_OVERLAY_PRESENCE: undefined;
	ON_POLLS_OVERLAY_PRESENCE: undefined;
	GET_POLLS_OVERLAY_CONFIGS: undefined;
	ON_POLL_OVERLAY_CONFIGS: {parameters:PollOverlayParamStoreData};
	ON_POLL_PROGRESS:{poll:TwitchatDataTypes.MessagePollData}|undefined
	
	GET_PREDICTIONS_OVERLAY_PRESENCE: undefined;
	ON_PREDICTIONS_OVERLAY_PRESENCE: undefined;
	GET_PREDICTIONS_OVERLAY_CONFIGS: undefined;
	ON_PREDICTION_OVERLAY_CONFIGS: {parameters:PredictionOverlayParamStoreData};
	ON_PREDICTION_PROGRESS:{prediction:TwitchatDataTypes.MessagePredictionData}|undefined;

	GET_TIMER_OVERLAY_PRESENCE:undefined;
	ON_TIMER_OVERLAY_PRESENCE: undefined;
	GET_TIMER_LIST:undefined;
	ON_TIMER_LIST:{
		timerList:{
			id: string;
			title: string;
			enabled: boolean;
			type: "timer" | "countdown";
		}[]
	}

	GET_TIMER: {
		/**
		 * Timer ID to get configs for
		 */
		id:string
	};
	ON_TIMER_START:TwitchatDataTypes.TimerData;
	SET_TIMER_ADD:{
		/**
		 * Timer ID to add time to
		 */
		id?:string;
		/**
		 * Value to add to the timer.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		value:string;
	};
	ON_TIMER_STOP:TwitchatDataTypes.TimerData;
	ON_COUNTDOWN_START:TwitchatDataTypes.TimerData;
	SET_COUNTDOWN_ADD:{
		/**
		 * Countdown ID to add time to
		 */
		id?:string;
		/**
		 * Value to add to the countdown.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		value:string;
	};
	ON_COUNTDOWN_COMPLETE:TwitchatDataTypes.TimerData;

	GET_WHEEL_OVERLAY_PRESENCE: undefined;
	ON_WHEEL_OVERLAY_PRESENCE: undefined;
	ON_WHEEL_OVERLAY_START:TwitchatDataTypes.WheelData;
	ON_WHEEL_OVERLAY_ANIMATION_COMPLETE:{
		/**
		 * Winner info
		 */
		winner:TwitchatDataTypes.EntryItem;
		/**
		 * Raffle session ID the animation is for
		 */
		sessionId:string;
		/**
		 * Delay in ms before sending a chat message about the result
		 */
		delay?:number;
	};
	
	GET_AD_BREAK_OVERLAY_PRESENCE: undefined;
	ON_AD_BREAK_OVERLAY_PRESENCE: undefined;
	GET_AD_BREAK_OVERLAY_CONFIGS: undefined;
	ON_AD_BREAK_OVERLAY_CONFIGS: TwitchatDataTypes.AdBreakOverlayData;
	ON_AD_BREAK_OVERLAY_DATA: TwitchatDataTypes.CommercialData;

	GET_BITSWALL_OVERLAY_PRESENCE: undefined;
	ON_BITSWALL_OVERLAY_PRESENCE: undefined;
	GET_BITSWALL_OVERLAY_CONFIGS: undefined;
	ON_BITSWALL_OVERLAY_CONFIGS: TwitchatDataTypes.BitsWallOverlayData;
	
	GET_CHAT_POLL_OVERLAY_PRESENCE: undefined;
	ON_CHAT_POLL_OVERLAY_PRESENCE: undefined;
	GET_CHAT_POLL_OVERLAY_CONFIGS: undefined
	ON_CHAT_POLL_OVERLAY_CONFIGS: {parameters:PollOverlayParamStoreData};
	ON_CHAT_POLL_PROGRESS: {poll:TwitchatDataTypes.ChatPollData} | undefined;

	/**
	 * A chat message has been deleted
	 */
	ON_MESSAGE_DELETED: {
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	};
	ON_BITS:{
		channel:string,
		message:string,
		message_chunks?:TwitchatDataTypes.ParseMessageChunk[]
		user: {
			id:string,
			login:string,
			displayName:string,
		}
		bits:number,
		pinned:boolean,
		pinLevel:number,
	}
	ON_MESSAGE_WHISPER:{
		/**
		 * Number of unread whispers
		 */
		unreadCount: number;
		/**
		 * Message received
		 */
		message: string;
		/**
		 * User info
		 */
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}
	ON_MESSAGE_FROM_NON_FOLLOWER:{
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}
	ON_MENTION:{
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}
	ON_MESSAGE_FIRST_TODAY:{
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}
	ON_MESSAGE_FIRST_ALL_TIME:{
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}
	ON_REWARD_REDEEM:{
		channel: string;
		message?: string;
		message_chunks?: TwitchatDataTypes.ParseMessageChunk[];
		user: {
			id: string;
			login: string;
			displayName: string;
		};
		reward: {
			id: string;
			cost: number;
			title: string;
		};
	}
	ON_SUBSCRIPTION:{
		channel: string;
		message: string;
		message_chunks: TwitchatDataTypes.ParseMessageChunk[];
		user: {
			id: string;
			login: string;
			displayName: string;
		};
		tier:TwitchatDataTypes.MessageSubscriptionData["tier"],
		months:number,
		recipients:{uid:string, login:string}[],
		streakMonths:number,
		totalSubDuration:number,
		giftCount:number,
		isPrimeUpgrade:boolean,
		isGift:boolean,
		isGiftUpgrade:boolean,
		isResub:boolean,
	}
	ON_FOLLOW:{
		channel: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}

	/**
	 * Enable/disable/toggle emergency mode
	 * Either give an object with "enabled" boolean to force a specific
	 * state, or don't give any parameter to toggle current state
	 */
	SET_EMERGENCY_MODE:{
		enabled:boolean;
		/**
		 * If set to true, a confirmation modal will be shown
		 * to confirm the action
		 */
		promptConfirmation?:boolean;
	} | undefined;
	ON_EMERGENCY_MODE_CHANGED: {
		/**
		 * New emergency mode state
		 */
		enabled:boolean;
	}

	GET_LABEL_OVERLAY_PLACEHOLDERS:undefined;
	ON_LABEL_OVERLAY_PLACEHOLDERS:{
		[tag: string]: {
			value: string | number;
			type: "string" | "number" | "date" | "time" | "datetime" | "day" | "month" | "year" | "hours" | "minutes" | "seconds" | "duration" | "image";
		};
	}
	GET_LABEL_OVERLAY_CONFIGS:{
		/**
		 * Label ID
		 */
		id:string;
	};
	ON_LABEL_OVERLAY_CONFIGS:{
		/**
		 * Label ID
		 */
		id: string;
		data: LabelItemData | null;
		exists?: boolean;
		isValid?: boolean;
	}

	GET_CHAT_COLUMNS_COUNT:undefined;
	ON_CHAT_COLUMNS_COUNT:{
		/**
		 * Number of chat columns
		 */
		count:number
	}

	GET_QNA_SESSION_LIST: undefined
	ON_QNA_SESSION_LIST: {
		sessionList:{
			id: string;
			command: string;
			open: boolean;
		}[]
	}
	/**
	 * Highlights the top most message of given Q&A session
	 */
	SET_QNA_HIGHLIGHT: {
		/**
		 * Q&A session ID
		*/
		id:string;
	}
	/**
	 * Skips the top most message of given Q&A session
	*/
	SET_QNA_SKIP: {
		/**
		 * Q&A session ID
		 */
		id:string;
	}

	SET_EXECUTE_TRIGGER:{
		/**
		 * Trigger ID to execute
		 */
		id:string;
	}
	GET_TRIGGER_LIST:undefined
	ON_TRIGGER_LIST:{
		triggerList:{
			id: string;
			name: string;
			disabled: boolean;
		}[]
	}
	SET_TRIGGER_STATE:{
		/**
		 * Trigger ID to change state of
		 */
		id:string;
		/**
		 * Force trigger state
		 * true to enable it
		 * false to disabled
		 * 
		 * Don't set this field to just toggle current state
		 */
		forcedState?:boolean;
	};

	SET_PLAY_SFXR: {
		/**
		 * SFXR sound parameters as a string
		 * Generate string at:
		 * https://tsfxr.jdmnk.dev
		 */
		params:string;
		/**
		 * Volume from 0 to 1
		 */
		volume:number;
	}

	/**
	 * Accept latest message held by automod
	 */
	SET_AUTOMOD_ACCEPT: undefined
	/**
	 * Rject latest message held by automod
	 */
	SET_AUTOMOD_REJECT: undefined
	/**
	 * Toggle merge feature
	 * See settings => chat features => Merge consecutive messages of a user
	 */
	SET_MERGE_TOGGLE: undefined
	/**
	 * Hide current chat alert
	 * See settings => chat features => Enable chat alert
	 */
	SET_HIDE_CHAT_ALERT: undefined
	/**
	 * Toggle current poll display
	 */
	SET_POLL_TOGGLE:undefined;
	/**
	 * Toggle current prediction display
	 */
	SET_PREDICTION_TOGGLE:undefined;
	/**
	 * Toggle current bingo display (NOT bingo GRID!)
	 */
	SET_BINGO_TOGGLE:undefined;
	/**
	 * Toggle viewers count display
	 */
	SET_VIEWERS_COUNT_TOGGLE:undefined;
	/**
	 * Toggle moderation tools display
	 */
	SET_MOD_TOOLS_TOGGLE:undefined;
	/**
	 * Toggle censorship of deleted messages
	 */
	SET_CENSOR_DELETED_MESSAGES_TOGGLE:undefined;
	/**
	 * Toggle current raffle display
	 */
	SET_RAFFLE_TOGGLE:undefined;
	SET_SHOUTOUT:undefined;
	SET_CLEAR_CHAT_HIGHLIGHT:undefined;
	SET_STOP_POLL:undefined;
	SET_STOP_PREDICTION:undefined;
	SET_SEND_MESSAGE:{
		message:string;
	};
	SET_RAFFLE_PICK_WINNER:undefined;
	SET_STOP_CURRENT_TTS_AUDIO:undefined;
	SET_SEND_CUSTOM_CHAT_MESSAGE:{
		//Message to display
		message?: string;
		//Defines if the close button should be disaplay
		//defaults to "true" if omitted
		canClose?:boolean;
		//Defines if the message should be displayed on the "greet them" section
		todayFirst?:boolean;
		//User info
		user?: {
			name: string;
			color?: string;
		};
		//Column index to display the message to
		col?: number;
		//Button icon see list of values above
		icon?: 'ad' | 'add' | 'alert' | 'animate' | 'announcement' | 'anon' | 'api' | 'automod' | 'badge' | 'ban' | 'bingo' | 'bits' | 'block' | 'boost' | 'bot' | 'broadcast' | 'broadcaster' | 'change' | 'channelPoints' | 'chatCommand' | 'chatPoll' | 'checkmark' | 'clearChat' | 'click' | 'clip' | 'coffee' | 'coin' | 'color' | 'commands' | 'conversation' | 'copy' | 'count' | 'countdown' | 'credits' | 'cross' | 'date' | 'debug' | 'delete' | 'dice' | 'discord' | 'donor' | 'download' | 'dragZone' | 'easing' | 'edit' | 'elevated' | 'elgato' | 'emergency' | 'emote' | 'enter' | 'filters' | 'firstTime' | 'fix' | 'follow' | 'follow_outline' | 'font' | 'fontSize' | 'fullscreen' | 'gift' | 'github' | 'goxlr' | 'goxlr_bleep' | 'goxlr_fx' | 'hand' | 'heat' | 'help' | 'hide' | 'highlight' | 'history' | 'hypeChat' | 'idea' | 'info' | 'internet' | 'kofi' | 'leave' | 'list' | 'live' | 'loader' | 'lock' | 'loop' | 'magnet' | 'markRead' | 'max' | 'merge' | 'microphone' | 'microphone_mute' | 'microphone_recording' | 'min' | 'minus' | 'mod' | 'move' | 'music' | 'mute' | 'newtab' | 'next' | 'noMusic' | 'notification' | 'number' | 'obs' | 'offline' | 'online' | 'orderable' | 'overlay' | 'params' | 'partner' | 'patreon' | 'pause' | 'paypal' | 'pin' | 'pipette' | 'placeholder' | 'play' | 'poll' | 'polygon' | 'prediction' | 'premium' | 'presentation' | 'press' | 'prev' | 'prime' | 'pros' | 'qna' | 'raid' | 'read' | 'refresh' | 'reply' | 'returning' | 'reward_highlight' | 'rightClick' | 'rotate' | 'save' | 'scale' | 'scroll' | 'scrollDown' | 'scrollUp' | 'search' | 'shadow' | 'shield' | 'shieldMode' | 'shoutout' | 'show' | 'skip' | 'slow' | 'spotify' | 'stars' | 'stop' | 'sub' | 'test' | 'thickness' | 'ticket' | 'tiktok' | 'timeout' | 'timer' | 'train' | 'train_boost' | 'translate' | 'trash' | 'tts' | 'twitch' | 'twitchat' | 'twitter' | 'ulule' | 'unban' | 'unblock' | 'unfollow' | 'unlock' | 'unmod' | 'unmute' | 'unpin' | 'unvip' | 'update' | 'upload' | 'url' | 'user' | 'vibrate' | 'vip' | 'voice' | 'voicemod' | 'volume' | 'watchStreak' | 'whispers' | 'youtube';
		//Color of the message for "highlight" style
		highlightColor?: string;
		//Message style
		style?: "message"|"highlight"|"error";
		//Option quote displayed in a dedicated holder
		quote?:string;
		//buttons to add
		actions?: {
			//Button icon see list of values above
			icon?:string;
			//Button label
			label:string;
			//Type of action
			actionType?:"url"|"trigger"|"message"|"discord";
			//Page to open in a new tab for "url" actionType
			url?:string;
			//window target for "url" actionType
			urlTarget?:string;
			//Trigger to execute for "trigger" actionType.
			//Use CTRL+Alt+D on your triggers list to show their IDs
			triggerId?:string;
			//Message sent on chat for "message" and "discord" actionType values
			message?:string;
			//Button style
			theme?:"default"|"primary"|"secondary"|"alert";
		}[];
	};

	/**
	 * Requests for global states
	 * @answer ON_GLOBAL_STATES
	 */
	GET_GLOBAL_STATES: undefined

	ON_GLOBAL_STATES: {
		activeTimers: string[];
		activeCountowns: string[];
		counterValues: { [counterId: string]: number };
		emergencyMode: boolean;
		ttsSpeaking: boolean;
		canAutoShoutout: boolean;
		moderationToolsVisible: boolean;
		censorshipEnabled: boolean;
		hasActiveChatAlert: boolean;
		voiceBotEnabled: boolean;
	};

	/**
	 * @private
	 */
	ON_FLAG_MAIN_APP:undefined;
	/**
	 * Live text when using speech-to-text
	 * @private
	 */
	ON_STT_TEXT_UPDATE: { text:string };
	/**
	 * @private
	 */
	ON_STT_RAW_TEXT_UPDATE: { text:string };
	/**
	 * @private
	 */
	ON_STT_REMOTE_TEMP_TEXT_EVENT: { text:string };
	/**
	 * @private
	 */
	ON_STT_REMOTE_FINAL_TEXT_EVENT: { text:string };
	/**
	 * @private
	 */
	ON_STT_SPEECH_END: { text:string };
	/**
	 * @private
	 */
	ON_STT_ACTION_BATCH: {id:keyof TwitchatEventMap, value?:{text:string}}[];
	/**
	 * @private
	 */
	ON_STT_ERASE: undefined;
	/**
	 * @private
	 */
	ON_STT_NEXT: undefined;
	/**
	 * @private
	 */
	ON_STT_PREVIOUS: undefined;
	/**
	 * @private
	 */
	ON_STT_SUBMIT: undefined;
	/**
	 * @private
	 */
	ON_STT_CANCEL: undefined;
	/**
	 * Internal event for development that tells when Twitchat labels
	 * have been updated. Labels being the localized text.
	 * @private
	 */
	ON_LABELS_UPDATE:undefined;
	/**
	 * Start a new raffle
	 * @private
	 */
	ON_OPEN_RAFFLE_CREATION_FORM:undefined;
	/**
	 * Open poll creation form
	 * @private
	 */
	ON_OPEN_POLL_CREATION_FORM:undefined;
	/**
	 * Open prediction creation form
	 * @private
	 */
	SET_OPEN_PREDICTION_CREATION_FORM:undefined;
	/**
	 * Scene has changed in OBS
	 * @private
	 */
	ON_OBS_SCENE_CHANGE:  {
		sceneName: string;
	};
	/**
	 * Source mute state has changed in OBS
	 * @private
	 */
	ON_OBS_MUTE_TOGGLE: {
		inputName: string;
		inputMuted: boolean;
	}
	/**
	 * Playback has started in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_STARTED: {
		inputName: string;
	}
	/**
	 * Playback has paused in an OBS media source
	 * @private
	 */ 
	ON_OBS_PLAYBACK_PAUSED: {
		inputName: string;
	}
	/**
	 * Started playing next item in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_NEXT: {
		inputName: string;
	}
	/**
	 * Started playing previous item in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_PREVIOUS: {
		inputName: string;
	}
	/**
	 * Playback has restarted in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_RESTARTED: {
		inputName: string;
	}
	/**
	 * Playback has ended in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_ENDED: {
		inputName: string;
	}
	/**
	 * An input name has changed in OBS
	 * @private
	 */
	ON_OBS_INPUT_NAME_CHANGED: {
		inputName: string;
		oldInputName: string;
	}
	/**
	 * A scene name has changed in OBS
	 * @private
	 */
	ON_OBS_SCENE_NAME_CHANGED: {
		sceneName: string;
		oldSceneName: string;
	}
	/**
	 * A source filter name has changed in OBS
	 * @private
	 */
	ON_OBS_FILTER_NAME_CHANGED: {
		sourceName: string;
		filterName: string;
		oldFilterName: string;
	}
	/**
	 * A source has been added to a scene in OBS
	 * @private
	 */
	ON_OBS_SOURCE_TOGGLE:{
		item: OBSSourceItem;
		event: {
			sceneName: string;
			sceneItemId: number;
			sceneItemEnabled: boolean;
		};
	}
	/**
	 * A source filter has been enabled/disabled in OBS
	 * @private
	 */
	ON_OBS_FILTER_TOGGLE:{
		sourceName: string;
		filterName: string;
		filterEnabled: boolean;
	}
	/**
	 * Stream state has changed in OBS
	 * @private
	 */
	ON_OBS_STREAM_STATE: {
		outputActive: boolean;
		outputState: string;
	}
	/**
	 * Recording state has changed in OBS
	 * @private
	 */
	ON_OBS_RECORD_STATE: {
		outputActive: boolean;
		outputState: string;
		outputPath: string;
	}
}