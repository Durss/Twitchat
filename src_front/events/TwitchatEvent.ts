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
	"TWITCHAT_READY": undefined;
	/**
	 * OBS Websocket connection established
	 */
	"OBS_WEBSOCKET_CONNECTED": undefined;
	/**
	 * OBS Websocket connection lost
	 */
	"OBS_WEBSOCKET_DISCONNECTED": undefined;
	/**
	 * Scene has changed in OBS
	 */
	"OBS_SCENE_CHANGE":  {
		sceneName: string;
	};
	/**
	 * Source mute state has changed in OBS
	 */
	"OBS_MUTE_TOGGLE": {
		inputName: string;
		inputMuted: boolean;
	}
	/**
	 * Playback has started in an OBS media source
	 */
	"OBS_PLAYBACK_STARTED": {
		inputName: string;
	}
	/**
	 * Playback has paused in an OBS media source
	 */ 
	"OBS_PLAYBACK_PAUSED": {
		inputName: string;
	}
	/**
	 * Started 
	 */
	"OBS_PLAYBACK_NEXT": {
		inputName: string;
	}
	"OBS_PLAYBACK_PREVIOUS": {
		inputName: string;
	}
	"OBS_PLAYBACK_RESTARTED": {
		inputName: string;
	}
	"OBS_PLAYBACK_ENDED": {
		inputName: string;
	}
	"OBS_INPUT_NAME_CHANGED": {
		inputName: string;
		oldInputName: string;
	}
	"OBS_SCENE_NAME_CHANGED": {
		sceneName: string;
		oldSceneName: string;
	}
	"OBS_FILTER_NAME_CHANGED": {
		sourceName: string;
		filterName: string;
		oldFilterName: string;
	}
	"OBS_SOURCE_TOGGLE":{
		item: OBSSourceItem;
		event: {
			sceneName: string;
			sceneItemId: number;
			sceneItemEnabled: boolean;
		};
	}
	"OBS_FILTER_TOGGLE":{
		sourceName: string;
		filterName: string;
		filterEnabled: boolean;
	}
	"OBS_STREAM_STATE": {
		outputActive: boolean;
		outputState: string;
	}
	"OBS_RECORD_STATE": {
		outputActive: boolean;
		outputState: string;
		outputPath: string;
	}
	"ENABLE_STT": undefined;
	"DISABLE_STT": undefined;
	/**
	 * Live text when using speech-to-text
	 */
	"STT_TEXT_UPDATE": { text:string };
	"STT_RAW_TEXT_UPDATE": { text:string };
	"STT_REMOTE_TEMP_TEXT_EVENT": { text:string };
	"STT_REMOTE_FINAL_TEXT_EVENT": { text:string };
	"STT_SPEECH_END": { text:string };
	"STT_ACTION_BATCH": {id:keyof TwitchatEventMap, value?:{text:string}}[];
	"STT_ERASE": undefined;
	"STT_NEXT": undefined;
	"STT_PREVIOUS": undefined;
	"STT_SUBMIT": undefined;
	"STT_CANCEL": undefined;
	/**
	 * Scroll a chat feed up
	 */
	"CHAT_FEED_SCROLL_UP": {
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
	"CHAT_FEED_SCROLL_DOWN": {
		/**
		 * Number of pixels to scroll by
		 */
		scrollBy:number
		/**
		 * Column index
		 */
		colIndex:number
	};
	"CHAT_FEED_SCROLL": {
		/**
		 * Number of pixels to scroll by
		 */
		scrollBy:number
		/**
		 * Column index
		 */
		colIndex:number,
	}
	/**
	 * Move read marker in chat feed
	 */
	"CHAT_FEED_READ": {
		/**
		 * Number of messages to read
		 */
		count:number
		/**
		 * Column index
		 */
		colIndex:number
	};
	"CHAT_FEED_READ_ALL": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_PAUSE": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_UNPAUSE": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_SCROLL_BOTTOM": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_SELECT": {
		/**
		 * Direction to move selection
		 * -1 = up
		 * 1 = down
		*/
		direction:number;
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_SELECT_ACTION_DELETE": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_SELECT_ACTION_BAN": {
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
	"CHAT_FEED_SELECT_CHOOSING_ACTION": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_SELECT_ACTION_PIN": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_SELECT_ACTION_HIGHLIGHT": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_SELECT_ACTION_SHOUTOUT": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"CHAT_FEED_SELECT_ACTION_CANCEL": {
		/**
		 * Column index
		 */
		colIndex:number;
	};
	"GREET_FEED_READ": { count:number };
	"GREET_FEED_READ_ALL": undefined;
	"CREDITS_OVERLAY_PRESENCE": undefined;
	"GET_CREDITS_OVERLAY_PRESENCE": undefined;
	"GET_SUMMARY_DATA": {
		/**
		 * Date offset to get data from
		 */
		offset?:number;
		/**
		 * Include overlay parameters to data sent back
		 */
		includeParams?:boolean
	};
	"SUMMARY_DATA": TwitchatDataTypes.StreamSummaryData;
	"VOICEMOD_VOICE_CHANGE": { voice:string};
	
	"ENDING_CREDITS_COMPLETE": undefined;
	"ENDING_CREDITS_CONFIGS": TwitchatDataTypes.EndingCreditsParams;
	"ENDING_CREDITS_CONTROL": {
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
		scrollTo?: string
	};

	"GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE": undefined;
	"SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE": undefined;
	"CHAT_HIGHLIGHT_OVERLAY_PRESENCE": undefined;
	"SHOW_CLIP": TwitchatDataTypes.ChatHighlightInfo;
	"ON_CHAT_HIGHLIGHT_OVERLAY_CLOSE": undefined;
	"SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE": TwitchatDataTypes.ChatHighlightInfo | undefined
	/**
	 * Sent by highlight overlay after requested message is shown 
	 */
	"CHAT_HIGHLIGHT_OVERLAY_CONFIRM": undefined
	"MESSAGE_READ": {
		manual: boolean;
		selected: boolean;
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	};

	"GET_ANIMATED_TEXT_CONFIGS": {
		/**
		 * Animated text overlay ID
		 */
		id:string
	};
	"ANIMATED_TEXT_CONFIGS":TwitchatDataTypes.AnimatedTextData;
	"ANIMATED_TEXT_SET": {
		/**
		 * Overlay ID to send the text to
		 */
		overlayId: string;
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
	"ANIMATED_TEXT_SHOW_COMPLETE":{
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		 */
		queryId:string
	}
	"ANIMATED_TEXT_HIDE_COMPLETE":{
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		*/
		queryId:string
	}
	"ANIMATED_TEXT_CLOSE":{
		/**
		 * ID of the overlay that finished closing animation
		*/
		overlayId:string;
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		*/
		queryId:string
	}

	"GET_BINGO_GRID_PARAMETERS": {
		/**
		 * Bingo grid ID to get parameters for
		 */
		bid:string
	}
	"BINGO_GRID_PARAMETERS": {
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
	"BINGO_GRID_OVERLAY_PRESENCE": {
		/**
		 * Bingo grid ID to get parameters for
		 */
		bid:string
	}
	"BINGO_GRID_HEAT_CLICK": {
		/**
		 * Bingo grid ID to get parameters for
		 */
		gridId:string;
		/**
		 * Cell entry ID that was clicked
		 */
		entryId:string;
		/**
		 * Heat click data
		 */
		click:TwitchatDataTypes.HeatClickData
	}
	"BINGO_GRID_OVERLAY_VIEWER_EVENT":{
		/**
		 * Bingo grid ID
		 */
		gridId: string;
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
	"BINGO_GRID_OVERLAY_LEADER_BOARD":{
		/**
		 * Bingo grid ID
		 */
		gridId: string;
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

	"COUNTER_GET_ALL": undefined;
	"COUNTER_GET": {
		/**
		 * Counter ID to get value for
		 */
		cid:string
	}
	"COUNTER_LIST":{
		counters:{
			id: string;
			name: string;
			perUser: boolean;
		}[]
	}
	"COUNTER_UPDATE":{
		counter:TwitchatDataTypes.CounterData
	}
	"COUNTER_ADD":{
		counterId: string
		counterAction: TriggerActionCountDataAction
		/**
		 * Value to add to the counter.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		countAdd: string
	}

	"GET_CUSTOM_TRAIN_STATE": {
		/**
		 * Custom train ID to get state for
		 * */
		id:string
	}
	"CUSTOM_TRAIN_STATE": {
		configs:TwitchatDataTypes.CustomTrainData;
		state:TwitchatDataTypes.CustomTrainState;
	}

	"DISTORT_OVERLAY_PARAMETERS": {params:TwitchatDataTypes.HeatDistortionData};
	"GET_DISTORT_OVERLAY_PARAMETERS": {
		/**
		 * Distortion overlay ID to get parameters for
		 */
		distortionID:string
	};

	"GET_DONATION_GOALS_OVERLAY_PARAMS": {
		/**
		 * Overlay ID to get parameters for
		 */
		overlayId:string
	};
	"DONATION_GOALS_OVERLAY_PARAMS": {
		params:TwitchatDataTypes.DonationGoalOverlayConfig;
		goal:number;
		raisedTotal:number;
		raisedPersonnal:number;
		skin:"default"|string
	}
	"DONATION_EVENT":{
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

	"GET_CURRENT_TRACK": undefined;
	"CURRENT_TRACK": {
		params:TwitchatDataTypes.MusicPlayerParamsData;
		trackName?:string;
		artistName?:string;
		trackDuration?:number;
		trackPlaybackPos?:number;
		cover?:string;
		skin?:string;
	};
	"TRACK_ADDED_TO_QUEUE": TwitchatDataTypes.MusicTrackData;

	"MUSIC_PLAYER_HEAT_CLICK": TwitchatDataTypes.HeatClickData;

	"POLLS_OVERLAY_PRESENCE": undefined;
	"GET_POLLS_OVERLAY_PRESENCE": undefined;
	"GET_POLLS_OVERLAY_PARAMETERS": undefined;
	"POLL_PROGRESS":{poll:TwitchatDataTypes.MessagePollData}|undefined
	"POLLS_OVERLAY_PARAMETERS": {parameters:PollOverlayParamStoreData};
	
	"PREDICTIONS_OVERLAY_PRESENCE": undefined;
	"GET_PREDICTIONS_OVERLAY_PRESENCE": undefined;
	"GET_PREDICTIONS_OVERLAY_PARAMETERS": undefined;
	"PREDICTION_PROGRESS":{prediction:TwitchatDataTypes.MessagePredictionData}|undefined;
	"PREDICTIONS_OVERLAY_PARAMETERS": {parameters:PredictionOverlayParamStoreData};

	"TIMER_OVERLAY_PRESENCE": undefined;
	"GET_TIMER_OVERLAY_PRESENCE":undefined;
	"GET_TIMER_LIST":undefined;
	"GET_CURRENT_TIMERS": {
		/**
		 * Timer ID to get configs for
		 */
		id:string
	};
	"TIMER_START":TwitchatDataTypes.TimerData;
	"TIMER_ADD":{
		/**
		 * Value to add to the timer.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		timeAdd:string;
		timerId?:string;
	};
	"TIMER_STOP":TwitchatDataTypes.TimerData;
	"COUNTDOWN_START":TwitchatDataTypes.TimerData;
	"COUNTDOWN_ADD":{
		/**
		 * Value to add to the countdown.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		timeAdd:string;
		timerId?:string;
	};
	"COUNTDOWN_COMPLETE":TwitchatDataTypes.TimerData;

	"WHEEL_OVERLAY_PRESENCE": undefined;
	"GET_WHEEL_OVERLAY_PRESENCE": undefined;
	"WHEEL_OVERLAY_START":TwitchatDataTypes.WheelData;
	"WHEEL_OVERLAY_ANIMATION_COMPLETE":{
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
	
	"GET_AD_BREAK_OVERLAY_PRESENCE": undefined;
	"GET_AD_BREAK_OVERLAY_PARAMETERS": undefined;
	"AD_BREAK_OVERLAY_PRESENCE": undefined;
	"AD_BREAK_OVERLAY_PARAMETERS": TwitchatDataTypes.AdBreakOverlayData;
	"AD_BREAK_DATA": TwitchatDataTypes.CommercialData;

	"BITSWALL_OVERLAY_PRESENCE": undefined;
	"GET_BITSWALL_OVERLAY_PRESENCE": undefined;
	"GET_BITSWALL_OVERLAY_PARAMETERS": undefined;
	"BITSWALL_OVERLAY_PARAMETERS": TwitchatDataTypes.BitsWallOverlayData;
	
	"GET_CHAT_POLL_OVERLAY_PRESENCE": undefined;
	"CHAT_POLL_OVERLAY_PRESENCE": undefined;
	"GET_CHAT_POLL_OVERLAY_PARAMETERS": undefined
	"CHAT_POLL_OVERLAY_PARAMETERS": {parameters:PollOverlayParamStoreData};
	"CHAT_POLL_PROGRESS": {poll:TwitchatDataTypes.ChatPollData} | undefined;

	/**
	 * A chat message has been deleted
	 */
	"MESSAGE_DELETED": {
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	};
	"BITS":{
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
	"MESSAGE_WHISPER":{
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
	"MESSAGE_NON_FOLLOWER":{
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}
	"MENTION":{
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}
	"MESSAGE_FIRST":{
		channel: string;
		message: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}
	"REWARD_REDEEM":{
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
	"SUBSCRIPTION":{
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
	"FOLLOW":{
		channel: string;
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	}

	"EMERGENCY_MODE": {
		/**
		 * Enabled or disabled emergency mode
		 */
		enabled:boolean;
	}

	"LABELS_UPDATE":undefined;
	"GET_LABEL_OVERLAY_PLACEHOLDERS":undefined;
	"GET_LABEL_OVERLAY_PARAMS":{
		id:string;
	};
	"LABEL_OVERLAY_PLACEHOLDERS":{
		[tag: string]: {
			value: string | number;
			type: "string" | "number" | "date" | "time" | "datetime" | "day" | "month" | "year" | "hours" | "minutes" | "seconds" | "duration" | "image";
		};
	}
	"LABEL_OVERLAY_PARAMS":{
		/**
		 * Label ID
		 */
		id: string;
		data: LabelItemData | null;
		exists?: boolean;
		isValid?: boolean;
	}

	"SET_COLS_COUNT":{
		/**
		 * Number of chat columns
		 */
		count:number
	}

	"QNA_SESSION_GET_ALL": undefined
	"QNA_HIGHLIGHT": {
		qnaId:string;
	}
	"QNA_SKIP": {
		qnaId:string;
	}
	"QNA_SESSION_LIST": {
		qnaSessions:{
			id: string;
			command: string;
			open: boolean;
		}[]
	}

	"TIMER_LIST":{
		timers:{
			id: string;
			title: string;
			enabled: boolean;
			type: "timer" | "countdown";
		}[]
	}

	"TRIGGER_LIST":{
		triggers:{
			id: string;
			name: string;
		}[]
	}

	"PLAY_SFXR": {
		params:string;
		volume:number;
	}

	"AUTOMOD_ACCEPT": undefined
	"AUTOMOD_REJECT": undefined
	"MERGE_TOGGLE": undefined
	"HIDE_ALERT": undefined
	"POLL_TOGGLE":undefined;
	"PREDICTION_TOGGLE":undefined;
	"BINGO_TOGGLE":undefined;
	"VIEWERS_COUNT_TOGGLE":undefined;
	"MOD_TOOLS_TOGGLE":undefined;
	"CENSOR_DELETED_MESSAGES_TOGGLE":undefined;
	"POLL_CREATE":undefined;
	"START_EMERGENCY":undefined;
	"STOP_EMERGENCY":undefined;
	"SET_EMERGENCY_MODE":{
		enabled:boolean;
	} | undefined;
	"SHOUTOUT":undefined;
	"GET_COLS_COUNT":undefined;
	"CLEAR_CHAT_HIGHLIGHT":undefined;
	"CREATE_POLL":undefined;
	"CREATE_PREDICTION":undefined;
	"STOP_POLL":undefined;
	"STOP_PREDICTION":undefined;
	"SEND_MESSAGE":{
		message:string;
	};
	"RAFFLE_TOGGLE":undefined;
	"RAFFLE_START":undefined;
	"RAFFLE_END":undefined;
	"CREATE_RAFFLE":undefined;
	"STOP_RAFFLE":undefined;
	"RAFFLE_PICK_WINNER":undefined;
	"STOP_TTS":undefined;
	"EXECUTE_TRIGGER":{
		triggerId:string;
	}
	"TRIGGERS_GET_ALL":undefined
	"TOGGLE_TRIGGER":{
		triggerId:string;
		triggerAction:"enable" | "disable";
	};
	"CUSTOM_CHAT_MESSAGE":{
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
		icon?: string;
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
}