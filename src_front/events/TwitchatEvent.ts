import type { PollOverlayParamStoreData } from "@/store/poll/storePoll";
import type { PredictionOverlayParamStoreData } from "@/store/prediction/storePrediction";
import type { LabelItemData } from "@/types/ILabelOverlayData";
import type { TriggerActionCountDataAction } from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { OBSSourceItem } from '@/utils/OBSWebsocket';
import { Event } from './EventDispatcher';

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
		/**
		 * Enable or disable voice control
		 * Omit to toggle current state
		 */
		enabled?: boolean;
	};
	/**
	 * Triggered when voice control state is updated
	 */
	ON_VOICE_CONTROL_STATE_CHANGE: {
		/**
		 * Voice control enabled state
		 */
		enabled: boolean;
	};
	/**
	 * Scroll a chat feed by a specific amount
	 */
	SET_CHAT_FEED_SCROLL: {
		/**
		 * Number of pixels to scroll by.
		 * Default value: 100
		 */
		scrollBy?: number;
		/**
		 * Column index
		 */
		colIndex: number;
		/**
		 * Scroll mode.
		 * Scroll by messages or by pixels.
		 */
		mode: 'messages' | 'pixels';
	};
	/**
	 * Move read marker in chat feed
	 */
	SET_CHAT_FEED_READ: {
		/**
		 * Number of messages to read
		 */
		count: number;
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Mark all messages as read in a chat feed
	 */
	SET_CHAT_FEED_READ_ALL: {
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Pause auto-scrolling in a chat feed
	 */
	SET_CHAT_FEED_PAUSE_STATE: {
		/**
		 * Column index
		 */
		colIndex: number;
		/**
		 * Force paused state
		 * Omit to toggle current state
		 */
		pause?:boolean;
	};
	/**
	 * Scroll a chat feed to the bottom
	 */
	SET_CHAT_FEED_SCROLL_BOTTOM: {
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Move message selection in a chat feed
	 */
	SET_CHAT_FEED_SELECT: {
		/**
		 * Direction to move selection
		 * -1 = up
		 * 1 = down
		 * Can be greater than 1 or less than -1 to move multiple steps
		 */
		direction: number;
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Delete the currently selected message in a chat feed
	 * First select a message with SET_CHAT_FEED_SELECT
	 */
	SET_CHAT_FEED_SELECT_ACTION_DELETE: {
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Ban the user of the currently selected message in a chat feed
	 * First select a message with SET_CHAT_FEED_SELECT
	 */
	SET_CHAT_FEED_SELECT_ACTION_BAN: {
		/**
		 * Column index
		 */
		colIndex: number;
		/**
		 * Optional ban duration in seconds.
		 * If not set, a permanent ban is done
		 */
		duration?: number;
	};
	/**
	 * Open action chooser for the currently selected message in a chat feed
	 * First select a message with SET_CHAT_FEED_SELECT
	 */
	SET_CHAT_FEED_SELECT_CHOOSING_ACTION: {
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Save the currently selected message in a chat feed
	 * First select a message with SET_CHAT_FEED_SELECT
	 */
	SET_CHAT_FEED_SELECT_ACTION_SAVE: {
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Highlight the currently selected message in a chat feed
	 * First select a message with SET_CHAT_FEED_SELECT
	 */
	SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT: {
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Shoutout the user of the currently selected message in a chat feed
	 * First select a message with SET_CHAT_FEED_SELECT
	 */
	SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT: {
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Cancel the action selection for the currently selected message in a chat feed
	 */
	SET_CHAT_FEED_SELECT_ACTION_CANCEL: {
		/**
		 * Column index
		 */
		colIndex: number;
	};
	/**
	 * Mark messages as read in the greet them feed
	 */
	SET_GREET_FEED_READ: {
		/**
		 * Number of messages to mark as read
		 */
		messageCount: number;
	};
	/**
	 * Clears the greet them feed
	 */
	SET_GREET_FEED_READ_ALL: undefined;

	/**
	 * Triggered when the user changes Voicemod voice
	 */
	ON_VOICEMOD_VOICE_CHANGE: {
		/**
		 * Voice ID that got selected
		 */
		voiceId: string;
	};

	/**
	 * Request current ending credits overlay presence
	 * @answer SET_ENDING_CREDITS_PRESENCE
	 */
	GET_ENDING_CREDITS_PRESENCE: undefined;
	/**
	 * Response with current ending credits overlay presence
	 */
	SET_ENDING_CREDITS_PRESENCE: undefined;
	/**
	 * Request for ending credits data
	 * @answer SET_ENDING_CREDITS_DATA
	 */
	GET_ENDING_CREDITS_DATA: {
		/**
		 * Date offset to get data from
		 */
		dateOffset?: number;
		/**
		 * Include overlay parameters to response
		 */
		includeOverlayParams?: boolean;
	};
	/**
	 * Response with ending credits data
	 */
	SET_ENDING_CREDITS_DATA: TwitchatDataTypes.StreamSummaryData;
	/**
	 * Triggered when ending credits animation completes
	 */
	ON_ENDING_CREDITS_COMPLETE: undefined;
	/**
	 * Receive ending credits configuration data
	 */
	ON_ENDING_CREDITS_CONFIGS: TwitchatDataTypes.EndingCreditsParams;
	/**
	 * Control ending credits playback
	 */
	SET_ENDING_CREDITS_CONTROL: {
		/**
		 * Go to previous section
		 */
		prev?: true;
		/**
		 * Go to next section
		 */
		next?: true;
		/**
		 * Scrolling speed multiplier (can be negative for reverse direction)
		 */
		speed?: number;
		/**
		 * Section ID to jump to
		 */
		scrollToSectionID?: string;
	};

	/**
	 * Request current chat highlight overlay presence
	 * @answer SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE
	 */
	GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE: undefined;
	/**
	 * Advertise for highlight overlay presence
	 */
	SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE: undefined;
	/**
	 * Send a clip to the chat highlight overlay
	 */
	SET_CHAT_HIGHLIGHT_OVERLAY_CLIP: TwitchatDataTypes.ChatHighlightInfo;
	/**
	 * Send a message to the chat highlight overlay
	 */
	SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE: TwitchatDataTypes.ChatHighlightInfo | undefined;
	/**
	 * Sent by chat highlight overlay when a clip completes playing to
	 * request main app to close the highlight
	 */
	ON_CHAT_HIGHLIGHT_OVERLAY_CLOSE: undefined;

	/**
	 * Triggered when a message is marked or unmarked as read
	 */
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

	/**
	 * Request animated text overlay configuration
	 * @answer ON_ANIMATED_TEXT_CONFIGS
	 */
	GET_ANIMATED_TEXT_CONFIGS: {
		/**
		 * Animated text overlay ID
		 */
		id: string;
	};
	/**
	 * Receive animated text overlay configuration
	 */
	ON_ANIMATED_TEXT_CONFIGS: TwitchatDataTypes.AnimatedTextData;
	/**
	 * Set text content for an animated text overlay
	 */
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
	};
	/**
	 * Triggered when an animated text show animation completes
	 */
	ON_ANIMATED_TEXT_SHOW_COMPLETE: {
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		 */
		queryId: string;
	};
	/**
	 * Triggered when an animated text hide animation completes
	 */
	ON_ANIMATED_TEXT_HIDE_COMPLETE: {
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		 */
		queryId: string;
	};
	/**
	 * Triggered when an animated text overlay close animation completes
	 */
	ON_ANIMATED_TEXT_CLOSE: {
		/**
		 * ID of the overlay that finished closing animation
		 */
		id: string;
		/**
		 * Query ID sent when setting the text from ANIMATED_TEXT_SET
		 */
		queryId: string;
	};

	/**
	 * Request bingo grid configuration
	 * @answer ON_BINGO_GRID_CONFIGS
	 */
	GET_BINGO_GRID_CONFIGS: {
		/**
		 * Bingo grid ID to get parameters for
		 */
		id: string;
	};
	/**
	 * Receive a bingo grid configuration
	 */
	ON_BINGO_GRID_CONFIGS: {
		/**
		 * Bingo grid ID
		 */
		id: string;
		/**
		 * Bingo configs
		 */
		bingo: TwitchatDataTypes.BingoGridConfig | null;
		/**
		 * Row indexes to show a bingo animation on
		 */
		newVerticalBingos?: number[];
		/**
		 * Column indexes to show a bingo animation on
		 */
		newHorizontalBingos?: number[];
		/**
		 * Diagonal indexes to show a bingo animation on
		 * 0 => top-left to bottom-right
		 * 1 => bottom-left to top-right
		 */
		newDiagonalBingos?: (0 | 1)[];
	};
	/**
	 * Advertise bingo grid overlay presence
	 */
	SET_BINGO_GRID_OVERLAY_PRESENCE: {
		/**
		 * Bingo grid ID to advertise presence of
		 */
		id: string;
	};
	/**
	 * Set bingo grid visibility
	 */
	SET_BINGO_GRID_VISIBILITY: {
		/**
		 * Bingo grid ID to change visibility of
		 **/
		id: string;
		/**
		 * Show or hide the bingo grid
		 * Omit to toggle current visibility
		 */
		show?: boolean;
	}
	/**
	 * Triggered when a viewer completes a bingo
	 */
	ON_BINGO_GRID_VIEWER_EVENT: {
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
	};
	/**
	 * Receive bingo grid leaderboard
	 */
	ON_BINGO_GRID_LEADER_BOARD: {
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
	};

	/**
	 * Request list of all counters
	 * @answer ON_COUNTER_LIST
	 */
	GET_ALL_COUNTERS: undefined;
	/**
	 * Receive the list of all counters
	 */
	ON_COUNTER_LIST: {
		counterList: {
			id: string;
			name: string;
			perUser: boolean;
		}[];
	};
	/**
	 * Request a specific counter entity
	 * @answer ON_COUNTER_UPDATE
	 */
	GET_COUNTER: {
		/**
		 * Counter ID to get value of
		 */
		id: string;
	};
	/**
	 * Receive counter update
	 */
	ON_COUNTER_UPDATE: {
		/**
		 * Counter data
		 */
		counter: TwitchatDataTypes.CounterData;
	};
	/**
	 * Add a value to a counter
	 */
	SET_COUNTER_ADD: {
		/**
		 * Counter ID to add value to
		 */
		id: string;
		/**
		 * Action to perform
		 */
		action: TriggerActionCountDataAction;
		/**
		 * Value to add to the counter.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		value: string;
	};

	/**
	 * Request custom train data and state
	 * @answer ON_CUSTOM_TRAIN_DATA
	 */
	GET_CUSTOM_TRAIN_DATA: {
		/**
		 * Custom train ID to get state for
		 * */
		id: string;
	};
	/**
	 * Receive custom train configuration and state
	 */
	ON_CUSTOM_TRAIN_DATA: {
		configs: TwitchatDataTypes.CustomTrainData;
		state: TwitchatDataTypes.CustomTrainState;
	};

	/**
	 * Request distortion overlay configuration
	 * @answer ON_DISTORT_OVERLAY_CONFIGS
	 */
	GET_DISTORT_OVERLAY_CONFIGS: {
		/**
		 * Distortion overlay ID to get parameters for
		 */
		id: string;
	};
	/**
	 * Receive a distortion overlay configuration data
	 */
	ON_DISTORT_OVERLAY_CONFIGS: {
		params: TwitchatDataTypes.HeatDistortionData;
	};

	/**
	 * Request donation goals overlay configuration
	 * @answer ON_DONATION_GOALS_OVERLAY_CONFIGS
	 */
	GET_DONATION_GOALS_OVERLAY_CONFIGS: {
		/**
		 * Overlay ID to get parameters for
		 */
		id: string;
	};
	/**
	 * Receive a donation goals overlay configurations
	 */
	ON_DONATION_GOALS_OVERLAY_CONFIGS: {
		/**
		 * Overlay parameters
		 */
		params: TwitchatDataTypes.DonationGoalOverlayConfig;
		/**
		 * Goal to reach
		 */
		goal: number;
		/**
		 * Amount raised so far
		 */
		raisedTotal: number;
		/**
		 * Amount raised on our personnal fundraiser account.
		 * Only used for Streamlabs Charity to differenciate between personal donations and
		 * the total amount raised for the charity
		 */
		raisedPersonnal: number;
		/**
		 * Optional skin name
		 * @private
		 */
		skin: 'default' | string;
	};
	/**
	 * Triggered when a donation event occurs
	 */
	ON_DONATION_EVENT: {
		/**
		 * Overlay ID the donation event should be displayed on
		 */
		overlayId: string;
		/**
		 * Donation event username
		 */
		username: string;
		/**
		 * Donation amount
		 */
		amount: string;
	};

	/**
	 * Request current playing track information
	 * @answer ON_CURRENT_TRACK
	 */
	GET_CURRENT_TRACK: undefined;
	/**
	 * Receive current track information
	 */
	ON_CURRENT_TRACK: {
		/**
		 * Music player parameters
		 */
		params: TwitchatDataTypes.MusicPlayerParamsData;
		/**
		 * Current track title
		 */
		trackName?: string;
		/**
		 * Current track artist name
		 */
		artistName?: string;
		/***
		 * Current track duration in milliseconds
		 */
		trackDuration?: number;
		/**
		 * Current track playback position in milliseconds
		 */
		trackPlaybackPos?: number;
		/**
		 * Current track cover URL
		 */
		cover?: string;
		/**
		 * Optional skin name
		 * @private
		 */
		skin?: string;
	};
	/**
	 * Triggered when a track is added to the music queue
	 */
	ON_TRACK_ADDED_TO_QUEUE: TwitchatDataTypes.MusicTrackData;

	/**
	 * Triggered when a heat click occurs on the music player
	 */
	ON_MUSIC_PLAYER_HEAT_CLICK: TwitchatDataTypes.HeatClickData;

	/**
	 * Request polls overlay presence
	 * @answer ON_POLLS_OVERLAY_PRESENCE
	 */
	GET_POLLS_OVERLAY_PRESENCE: undefined;
	/**
	 * Advertise for polls overlay presence
	 */
	ON_POLLS_OVERLAY_PRESENCE: undefined;
	/**
	 * Request polls overlay configuration
	 * @answer ON_POLL_OVERLAY_CONFIGS
	 */
	GET_POLLS_OVERLAY_CONFIGS: undefined;
	/**
	 * Receive poll overlay configuration
	 */
	ON_POLL_OVERLAY_CONFIGS: { parameters: PollOverlayParamStoreData };
	/**
	 * Triggered when poll progress updates.
	 * If no active poll, body is undefined
	 */
	ON_POLL_PROGRESS: {
		/**
		 * Poll's data
		 */
		poll: TwitchatDataTypes.MessagePollData
	} | undefined;

	/**
	 * Request predictions overlay presence
	 * @answer ON_PREDICTIONS_OVERLAY_PRESENCE
	 */
	GET_PREDICTIONS_OVERLAY_PRESENCE: undefined;
	/**
	 * Advertise for predictions overlay presence
	 */
	ON_PREDICTIONS_OVERLAY_PRESENCE: undefined;
	/**
	 * Request predictions overlay configuration
	 * @answer ON_PREDICTION_OVERLAY_CONFIGS
	 */
	GET_PREDICTIONS_OVERLAY_CONFIGS: undefined;
	/**
	 * Receive prediction overlay configuration
	 */
	ON_PREDICTION_OVERLAY_CONFIGS: {
		/**
		 * Prediction overlay parameters
		 */
		parameters: PredictionOverlayParamStoreData
	};
	/**
	 * Triggered when prediction progress updates
	 * If no active prediction, body is undefined
	 */
	ON_PREDICTION_PROGRESS: {
		/**
		 * Prediction's data
		 */
		prediction: TwitchatDataTypes.MessagePredictionData
	} | undefined;

	/**
	 * Request timer overlay presence
	 * @answer ON_TIMER_OVERLAY_PRESENCE
	 */
	GET_TIMER_OVERLAY_PRESENCE: undefined;
	/**
	 * Advertise for timer overlay presence
	 */
	ON_TIMER_OVERLAY_PRESENCE: undefined;
	/**
	 * Request list of all timers
	 * @answer ON_TIMER_LIST
	 */
	GET_TIMER_LIST: undefined;
	/**
	 * Receive list of all timers and countdowns
	 */
	ON_TIMER_LIST: {
		/**
		 * List of timers and countdowns
		 */
		timerList: ({
			/**
			 * Timer ID
			 */
			id: string;
			/**
			 * Timer title
			 */
			title: string;
			/**
			 * Is the timer enabled ?
			 */
			enabled: boolean;
			/**
			 * Timer type
			 */
			type: 'timer' | 'countdown';
		} & Pick<TwitchatDataTypes.TimerData, "isDefault"|"startAt_ms"|"endAt_ms"|"offset_ms"|"pauseDuration_ms"|"paused"|"pausedAt_ms"|"duration_ms">)[];
	};

	/**
	 * Request specific timer configuration
	 * @answer ON_TIMER_START
	 */
	GET_TIMER: {
		/**
		 * Timer ID to get configs for
		 */
		id: string;
	};
	/**
	 * Triggered when a timer starts
	 */
	ON_TIMER_START: TwitchatDataTypes.TimerData;
	/**
	 * Add time to a timer
	 */
	SET_TIMER_ADD: {
		/**
		 * Timer ID to add time to
		 */
		id?: string;
		/**
		 * Value to add to the timer.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		value: string;
	};
	/**
	 * Triggered when a timer stops
	 */
	ON_TIMER_STOP: TwitchatDataTypes.TimerData;
	/**
	 * Triggered when a countdown starts
	 */
	ON_COUNTDOWN_START: TwitchatDataTypes.TimerData;
	/**
	 * Add time to a countdown
	 */
	SET_COUNTDOWN_ADD: {
		/**
		 * Countdown ID to add time to
		 */
		id?: string;
		/**
		 * Value to add to the countdown.
		 * Typed as string cause it can be an arithmetic expression or
		 * it can contain placeholders
		 */
		value: string;
	};
	/**
	 * Triggered when a countdown completes
	 */
	ON_COUNTDOWN_COMPLETE: TwitchatDataTypes.TimerData;

	/**
	 * Request wheel overlay presence
	 * @answer ON_WHEEL_OVERLAY_PRESENCE
	 */
	GET_WHEEL_OVERLAY_PRESENCE: undefined;
	/**
	 * Advertise for wheel overlay presence
	 */
	ON_WHEEL_OVERLAY_PRESENCE: undefined;
	/**
	 * Triggered when wheel overlay animation starts
	 */
	ON_WHEEL_OVERLAY_START: TwitchatDataTypes.WheelData;
	/**
	 * Triggered when wheel overlay animation completes
	 */
	ON_WHEEL_OVERLAY_ANIMATION_COMPLETE: {
		/**
		 * Winner info
		 */
		winner: TwitchatDataTypes.EntryItem;
		/**
		 * Raffle session ID the animation is for
		 */
		sessionId: string;
		/**
		 * Delay in ms before sending a chat message about the result
		 */
		delay?: number;
	};

	/**
	 * Request ad break overlay presence
	 * @answer ON_AD_BREAK_OVERLAY_PRESENCE
	 */
	GET_AD_BREAK_OVERLAY_PRESENCE: undefined;
	/**
	 * Advertise for ad break overlay presence
	 */
	ON_AD_BREAK_OVERLAY_PRESENCE: undefined;
	/**
	 * Request ad break overlay configuration
	 * @answer ON_AD_BREAK_OVERLAY_CONFIGS
	 */
	GET_AD_BREAK_OVERLAY_CONFIGS: undefined;
	/**
	 * Receive ad break overlay configuration
	 */
	ON_AD_BREAK_OVERLAY_CONFIGS: TwitchatDataTypes.AdBreakOverlayData;
	/**
	 * Triggered when an ad break occurs
	 */
	ON_AD_BREAK_OVERLAY_DATA: TwitchatDataTypes.CommercialData;

	/**
	 * Request bitswall overlay presence
	 * @answer ON_BITSWALL_OVERLAY_PRESENCE
	 */
	GET_BITSWALL_OVERLAY_PRESENCE: undefined;
	/**
	 * Advertise for bitswall overlay presence
	 */
	ON_BITSWALL_OVERLAY_PRESENCE: undefined;
	/**
	 * Request bitswall overlay configuration
	 * @answer ON_BITSWALL_OVERLAY_CONFIGS
	 */
	GET_BITSWALL_OVERLAY_CONFIGS: undefined;
	/**
	 * Receive bitswall overlay configuration
	 */
	ON_BITSWALL_OVERLAY_CONFIGS: TwitchatDataTypes.BitsWallOverlayData;

	/**
	 * Request chat poll overlay presence
	 * @answer ON_CHAT_POLL_OVERLAY_PRESENCE
	 */
	GET_CHAT_POLL_OVERLAY_PRESENCE: undefined;
	/**
	 * Advertise for chat poll overlay presence
	 */
	ON_CHAT_POLL_OVERLAY_PRESENCE: undefined;
	/**
	 * Request chat poll overlay configuration
	 * @answer ON_CHAT_POLL_OVERLAY_CONFIGS
	 */
	GET_CHAT_POLL_OVERLAY_CONFIGS: undefined;
	/**
	 * Receive chat poll overlay configuration
	 */
	ON_CHAT_POLL_OVERLAY_CONFIGS: { parameters: PollOverlayParamStoreData };
	/**
	 * Triggered when chat poll progress updates
	 */
	ON_CHAT_POLL_PROGRESS: { poll: TwitchatDataTypes.ChatPollData } | undefined;
	/**
	 * Start a chat poll
	 */
	SET_CHAT_POLL_START: {
		/**
		 * Poll title
		 */
		title:string;
		/**
		 * List of poll choices
		 */
		choices:string[];
		/**
		 * Duration of the poll in seconds
		 */
		duration:number;
		/**
		 * Maximum answers a user can vote for
		 */
		maxVotePerUser:number;
	};
	/**
	 * Triggerd when a chat poll ends
	 */
	SET_CHAT_POLL_STOP: undefined;
	/**
	 * Triggerd when a chat poll ends
	 */
	ON_CHAT_POLL_RESULT: {
		/**
		 * Poll title
		 */
		title:string;
		/**
		 * List of poll choices with their number of votes
		 */
		choices:{
			/**
			 * Choice title
			 */
			title:string;
			/**
			 * Number of votes for this choice
			 */
			votes:number;
		}[];
	};
	/**
	 * Request for current chat poll info
	 * @answer ON_CHAT_POLL_INFO
	 */
	GET_CHAT_POLL_INFO: undefined
	/**
	 * Receive current chat poll info.
	 * Call GET_CHAT_POLL_INFO to get this data
	 */
	ON_CHAT_POLL_INFO: {
		/**
		 * Poll title
		 */
		title:string;
		/**
		 * List of poll choices with their number of votes
		 */
		choices:{
			/**
			 * Choice title
			 */
			title:string;
			/**
			 * Number of votes for this choice
			 */
			votes:number;
		}[];
		/**
		 * Duration of the poll in seconds
		 */
		duration:number;
	}

	/**
	 * A chat message has been deleted
	 */
	ON_MESSAGE_DELETED: {
		/**
		 * Channel ID the message was deleted from
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
	/**
	 * Triggered when a user sends bits (cheers)
	 */
	ON_BITS: {
		/**
		 * Channel ID where bits were sent
		 */
		channel: string;
		/**
		 * Message content
		 */
		message: string;
		/**
		 * Parsed message chunks
		 */
		message_chunks?: TwitchatDataTypes.ParseMessageChunk[];
		/**
		 * User who sent bits
		 */
		user: {
			id: string;
			login: string;
			displayName: string;
		};
		/**
		 * Number of bits sent
		 */
		bits: number;
		/**
		 * Whether the message is pinned
		 */
		pinned: boolean;
		/**
		 * Pin level (1-10)
		 */
		pinLevel: number;
	};
	/**
	 * Triggered when a whisper message is received
	 */
	ON_MESSAGE_WHISPER: {
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
	};
	/**
	 * Triggered when a message is received from a non-follower
	 */
	ON_MESSAGE_FROM_NON_FOLLOWER: {
		/**
		 * Channel ID where the message was sent
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
	/**
	 * Triggered when the streamer is mentioned in a message
	 */
	ON_MENTION: {
		/**
		 * Channel ID where the message was sent
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
	/**
	 * Triggered when a user sends their first message of the day
	 */
	ON_MESSAGE_FIRST_TODAY: {
		/**
		 * Channel ID where the message was sent
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
	/**
	 * Triggered when a user sends their first message ever in the channel
	 */
	ON_MESSAGE_FIRST_ALL_TIME: {
		/**
		 * Channel ID where the message was sent
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
	/**
	 * Triggered when a channel point reward is redeemed
	 */
	ON_REWARD_REDEEM: {
		/**
		 * Channel ID where the reward was redeemed
		 */
		channel: string;
		/**
		 * Optional message sent with the reward redemption
		 */
		message?: string;
		/**
		 * Parsed message chunks
		 */
		message_chunks?: TwitchatDataTypes.ParseMessageChunk[];
		/**
		 * User info
		 */
		user: {
			id: string;
			login: string;
			displayName: string;
		};
		/**
		 * Reward info
		 */
		reward: {
			id: string;
			cost: number;
			title: string;
		};
	};
	/**
	 * Triggered when a subscription event occurs (new sub, resub, gift, etc.)
	 */
	ON_SUBSCRIPTION: {
		/**
		 * Channel ID where the subscription event occurred
		 */
		channel: string;
		/**
		 * Message content
		 */
		message: string;
		/**
		 * Parsed message chunks
		 */
		message_chunks: TwitchatDataTypes.ParseMessageChunk[];
		/**
		 * User info
		 */
		user: {
			id: string;
			login: string;
			displayName: string;
		};
		/**
		 * Subscription tier
		 */
		tier: TwitchatDataTypes.MessageSubscriptionData['tier'];
		/**
		 * Number of months the user subscribed for
		 */
		months: number;
		/**
		 * List of gift recipients (empty if not a gift)
		 */
		recipients: { uid: string; login: string }[];
		/**
		 * Number of consecutive months the user has been subscribed
		 */
		streakMonths: number;
		/**
		 * Total number of months the user has been subscribed for
		 */
		totalSubDuration: number;
		/**
		 * Number of gifts sent
		 */
		giftCount: number;
		/**
		 * Is subscription a Prime upgrade (went from prime to normal sub)
		 */
		isPrimeUpgrade: boolean;
		/**
		 * Is subscription a gift
		 */
		isGift: boolean;
		/**
		 * Is subscription a gift upgrade (gifted sub upgraded to normal sub)
		 */
		isGiftUpgrade: boolean;
		/**
		 * Is subscription a resubscription
		 */
		isResub: boolean;
	};
	/**
	 * Triggered when a user follows the channel
	 */
	ON_FOLLOW: {
		/**
		 * Channel ID where the follow occurred
		 */
		channel: string;
		/**
		 * Message content
		 */
		user: {
			id: string;
			login: string;
			displayName: string;
		};
	};

	/**
	 * Enable/disable/toggle emergency mode
	 * Either give an object with "enabled" boolean to force a specific
	 * state, or don't give any parameter to toggle current state
	 */
	SET_EMERGENCY_MODE:
		| {
				/**
				 * New emergency mode state
				 */
				enabled: boolean;
				/**
				 * If set to true, a confirmation modal will be shown
				 * to confirm the action
				 */
				promptConfirmation?: boolean;
		  }
		| undefined;
	ON_EMERGENCY_MODE_CHANGED: {
		/**
		 * New emergency mode state
		 */
		enabled: boolean;
	};

	/**
	 * Request available label overlay placeholders
	 * @answer ON_LABEL_OVERLAY_PLACEHOLDERS
	 */
	GET_LABEL_OVERLAY_PLACEHOLDERS: undefined;
	/**
	 * Advertise for label overlay placeholders
	 */
	ON_LABEL_OVERLAY_PLACEHOLDERS: {
		/**
		 * Hashmap of available placeholders
		 */
		[tag: string]: {
			/**
			 * Placeholder value
			 */
			value: string | number;
			/**
			 * Placeholder type
			 */
			type:
				| 'string'
				| 'number'
				| 'date'
				| 'time'
				| 'datetime'
				| 'day'
				| 'month'
				| 'year'
				| 'hours'
				| 'minutes'
				| 'seconds'
				| 'duration'
				| 'image';
		};
	};
	/**
	 * Request label overlay configuration
	 * @answer ON_LABEL_OVERLAY_CONFIGS
	 */
	GET_LABEL_OVERLAY_CONFIGS: {
		/**
		 * Label ID
		 */
		id: string;
	};
	/**
	 * Receive label overlay configuration
	 */
	ON_LABEL_OVERLAY_CONFIGS: {
		/**
		 * Label ID
		 */
		id: string;
		/**
		 * Label data
		 */
		data: LabelItemData | null;
		/**
		 * Does the label actually exists ?
		 * If not, overlay will show an error
		 */
		exists?: boolean;
		/**
		 * False if label mode is "placeholder" but related placeholder doesn't exist
		 */
		isValid?: boolean;
	};

	/**
	 * Request number of chat columns
	 * @answer ON_CHAT_COLUMNS_COUNT
	 */
	GET_CHAT_COLUMNS_COUNT: undefined;
	/**
	 * Receive number of chat columns
	 */
	ON_CHAT_COLUMNS_COUNT: {
		/**
		 * Number of chat columns
		 */
		count: number;
	};

	/**
	 * Request list of all Q&A sessions
	 * @answer ON_QNA_SESSION_LIST
	 */
	GET_QNA_SESSION_LIST: undefined;
	/**
	 * Receive list of all Q&A sessions
	 */
	ON_QNA_SESSION_LIST: {
		/**
		 * Available Q&A sessions
		 */
		sessionList: {
			/**
			 * Q&A session ID
			 */
			id: string;
			/**
			 * Command to use to submit a new entry
			 */
			command: string;
			/**
			 * Is the Q&A session currently open for new entries
			 */
			open: boolean;
		}[];
	};
	/**
	 * Highlights the top most message of given Q&A session
	 */
	SET_QNA_HIGHLIGHT: {
		/**
		 * Q&A session ID
		 */
		id: string;
	};
	/**
	 * Skips the top most message of given Q&A session
	 */
	SET_QNA_SKIP: {
		/**
		 * Q&A session ID
		 */
		id: string;
	};

	/**
	 * Execute a specific trigger manually
	 */
	SET_EXECUTE_TRIGGER: {
		/**
		 * Trigger ID to execute
		 */
		id: string;
	};
	/**
	 * Request list of all triggers
	 * @answer ON_TRIGGER_LIST
	 */
	GET_TRIGGER_LIST: undefined;
	/**
	 * Receive list of all triggers
	 */
	ON_TRIGGER_LIST: {
		/**
		 * Available trigger list
		 */
		triggerList: {
			/**
			 * Trigger ID
			 */
			id: string;
			/**
			 * Trigger name
			 */
			name: string;
			/**
			 * Is the trigger currently disabled
			 */
			disabled: boolean;
		}[];
	};
	/**
	 * Enable or disable a specific trigger
	 */
	SET_TRIGGER_STATE: {
		/**
		 * Trigger ID to change state of
		 */
		id: string;
		/**
		 * Force trigger state:
		 * - true: enable it
		 * - false: disable it
		 *
		 * Omit this field to toggle current state
		 */
		forcedState?: boolean;
	};

	/**
	 * Play an SFXR sound
	 */
	SET_PLAY_SFXR: {
		/**
		 * SFXR sound parameters as a string
		 * Generate string at:
		 * https://tsfxr.jdmnk.dev
		 */
		params: string;
		/**
		 * Volume from 0 to 1
		 */
		volume: number;
	};

	/**
	 * Accept latest message held by automod
	 */
	SET_AUTOMOD_ACCEPT: undefined;
	/**
	 * Reject latest message held by automod
	 */
	SET_AUTOMOD_REJECT: undefined;
	/**
	 * Toggle merge feature
	 * See settings => chat features => Merge consecutive messages of a user
	 */
	SET_MERGE_TOGGLE: undefined;
	/**
	 * Hide current chat alert
	 * See settings => chat features => Enable chat alert
	 */
	SET_HIDE_CHAT_ALERT: undefined;
	/**
	 * Toggle current poll display
	 */
	SET_POLL_TOGGLE: undefined;
	/**
	 * Toggle current prediction display
	 */
	SET_PREDICTION_TOGGLE: undefined;
	/**
	 * Toggle current bingo display (NOT bingo GRID!)
	 */
	SET_BINGO_TOGGLE: undefined;
	/**
	 * Toggle viewers count display
	 */
	SET_VIEWERS_COUNT_TOGGLE: undefined;
	/**
	 * Toggle moderation tools display
	 */
	SET_MOD_TOOLS_TOGGLE: undefined;
	/**
	 * Toggle censorship of deleted messages
	 */
	SET_CENSOR_DELETED_MESSAGES_TOGGLE: undefined;
	/**
	 * Toggle current raffle display
	 */
	SET_RAFFLE_TOGGLE: undefined;
	/**
	 * Shoutout the user that raided the channel the most recently
	 */
	SET_SHOUTOUT_LAST_RAIDER: undefined;
	/**
	 * Clear any current message or clip displayed in chat highlight overlay
	 */
	SET_CLEAR_CHAT_HIGHLIGHT: undefined;
	/**
	 * Stop any Twitch poll currently running
	 */
	SET_STOP_POLL: undefined;
	/**
	 * Stop any Twitch prediction currently running
	 */
	SET_STOP_PREDICTION: undefined;
	/**
	 * Send a message to chat
	 */
	SET_SEND_MESSAGE: {
		/**
		 * Message content to send
		 */
		message: string;
	};
	/**
	 * Pick a winner for the first active raffle.
	 * If multiple raffles are active, only the first one started will be considered.
	 */
	SET_RAFFLE_PICK_WINNER: undefined;
	/**
	 * Stop any current text-to-speech audio playback
	 */
	SET_STOP_CURRENT_TTS_AUDIO: undefined;
	/**
	 * Send a custom message to the chat feed with optional styling and actions
	 */
	SET_SEND_CUSTOM_CHAT_MESSAGE: {
		/**
		 * Message to display
		 */
		message?: string;
		/**
		 * Defines if the close button should be displayed
		 * Defaults to "true" if omitted
		 */
		canClose?: boolean;
		/**
		 * Defines if the message should be displayed on the "greet them" section
		 */
		todayFirst?: boolean;
		/**
		 * User info
		 */
		user?: {
			name: string;
			color?: string;
		};
		/**
		 * Column index to display the message to
		 */
		col?: number;
		/**
		 * Button icon see list of values above
		 */
		icon?:
			| 'ad'
			| 'add'
			| 'alert'
			| 'animate'
			| 'announcement'
			| 'anon'
			| 'api'
			| 'automod'
			| 'badge'
			| 'ban'
			| 'bingo'
			| 'bits'
			| 'block'
			| 'boost'
			| 'bot'
			| 'broadcast'
			| 'broadcaster'
			| 'change'
			| 'channelPoints'
			| 'chatCommand'
			| 'chatPoll'
			| 'checkmark'
			| 'clearChat'
			| 'click'
			| 'clip'
			| 'coffee'
			| 'coin'
			| 'color'
			| 'commands'
			| 'conversation'
			| 'copy'
			| 'count'
			| 'countdown'
			| 'credits'
			| 'cross'
			| 'date'
			| 'debug'
			| 'delete'
			| 'dice'
			| 'discord'
			| 'donor'
			| 'download'
			| 'dragZone'
			| 'easing'
			| 'edit'
			| 'elevated'
			| 'elgato'
			| 'emergency'
			| 'emote'
			| 'enter'
			| 'filters'
			| 'firstTime'
			| 'fix'
			| 'follow'
			| 'follow_outline'
			| 'font'
			| 'fontSize'
			| 'fullscreen'
			| 'gift'
			| 'github'
			| 'goxlr'
			| 'goxlr_bleep'
			| 'goxlr_fx'
			| 'hand'
			| 'heat'
			| 'help'
			| 'hide'
			| 'highlight'
			| 'history'
			| 'hypeChat'
			| 'idea'
			| 'info'
			| 'internet'
			| 'kofi'
			| 'leave'
			| 'list'
			| 'live'
			| 'loader'
			| 'lock'
			| 'loop'
			| 'magnet'
			| 'markRead'
			| 'max'
			| 'merge'
			| 'microphone'
			| 'microphone_mute'
			| 'microphone_recording'
			| 'min'
			| 'minus'
			| 'mod'
			| 'move'
			| 'music'
			| 'mute'
			| 'newtab'
			| 'next'
			| 'noMusic'
			| 'notification'
			| 'number'
			| 'obs'
			| 'offline'
			| 'online'
			| 'orderable'
			| 'overlay'
			| 'params'
			| 'partner'
			| 'patreon'
			| 'pause'
			| 'paypal'
			| 'pin'
			| 'pipette'
			| 'placeholder'
			| 'play'
			| 'poll'
			| 'polygon'
			| 'prediction'
			| 'premium'
			| 'presentation'
			| 'press'
			| 'prev'
			| 'prime'
			| 'pros'
			| 'qna'
			| 'raid'
			| 'read'
			| 'refresh'
			| 'reply'
			| 'returning'
			| 'reward_highlight'
			| 'rightClick'
			| 'rotate'
			| 'save'
			| 'scale'
			| 'scroll'
			| 'scrollDown'
			| 'scrollUp'
			| 'search'
			| 'shadow'
			| 'shield'
			| 'shieldMode'
			| 'shoutout'
			| 'show'
			| 'skip'
			| 'slow'
			| 'spotify'
			| 'stars'
			| 'stop'
			| 'sub'
			| 'test'
			| 'thickness'
			| 'ticket'
			| 'tiktok'
			| 'timeout'
			| 'timer'
			| 'train'
			| 'train_boost'
			| 'translate'
			| 'trash'
			| 'tts'
			| 'twitch'
			| 'twitchat'
			| 'twitter'
			| 'ulule'
			| 'unban'
			| 'unblock'
			| 'unfollow'
			| 'unlock'
			| 'unmod'
			| 'unmute'
			| 'unpin'
			| 'unvip'
			| 'update'
			| 'upload'
			| 'url'
			| 'user'
			| 'vibrate'
			| 'vip'
			| 'voice'
			| 'voicemod'
			| 'volume'
			| 'watchStreak'
			| 'whispers'
			| 'youtube';
		/**
		 * Color of the message for "highlight" style
		 */
		highlightColor?: string;
		/**
		 * Message style
		 */
		style?: 'message' | 'highlight' | 'error';
		/**
		 * Option quote displayed in a dedicated holder
		 */
		quote?: string;
		/**
		 * buttons to add
		 */
		actions?: {
			/**
			 * Button icon see list of values above
			 */
			icon?: string;
			/**
			 * Button label
			 */
			label: string;
			/**
			 * Type of action
			 */
			actionType?: 'url' | 'trigger' | 'message' | 'discord';
			/**
			 * Page to open in a new tab for "url" actionType
			 */
			url?: string;
			/**
			 * Window target for "url" actionType
			 */
			urlTarget?: string;
			/**
			 * Trigger to execute for "trigger" actionType.
			 * Use CTRL+Alt+D on your triggers list to show their IDs
			 */
			triggerId?: string;
			/**
			 * Message sent on chat for "message" and "discord" actionType values
			 */
			message?: string;
			/**
			 * Button style
			 */
			theme?: 'default' | 'primary' | 'secondary' | 'alert';
		}[];
	};

	/**
	 * Requests for global states
	 * @answer ON_GLOBAL_STATES
	 */
	GET_GLOBAL_STATES: undefined;

	/**
	 * Response to GET_GLOBAL_STATES
	 */
	ON_GLOBAL_STATES: {
		/**
		 * List of active timer and their state
		 */
		activeTimers: Pick<TwitchatDataTypes.TimerData, "id"|"duration_ms"|"enabled"|"endAt_ms"|"isDefault"|"offset_ms"|"pauseDuration_ms"|"paused"|"pausedAt_ms"|"startAt_ms"|"type">[];
		/**
		 * List of active countdowns and their state
		 */
		activeCountdowns: Pick<TwitchatDataTypes.TimerData, "id"|"duration_ms"|"enabled"|"endAt_ms"|"isDefault"|"offset_ms"|"pauseDuration_ms"|"paused"|"pausedAt_ms"|"startAt_ms"|"type">[];
		/**
		 * Current counter values
		 */
		counterValues: { id:string, value: number }[];
		/**
		 * Current emergency mode state
		 */
		emergencyMode: boolean;
		/**
		 * Is any text-to-speech currently speaking
		 */
		ttsSpeaking: boolean;
		/**
		 * Last raider's name
		 */
		lastRaiderName: string | undefined;
		/**
		 * Is the viewers count visible on chat bar
		 */
		moderationToolsVisible: boolean;
		/**
		 * Are deleted messages being censored
		 */
		censorshipEnabled: boolean;
		/**
		 * Is there an active chat alert being shown
		 */
		hasActiveChatAlert: boolean;
		/**
		 * Is voice control enabled
		 */
		voiceControlEnabled: boolean;
		/**
		 * Is viewer count visible
		 */
		showViewerCount: boolean;
		/**
		 * Is message merging enabled
		 */
		messageMergeEnabled: boolean;
		/**
		 * Is there a message highlighted
		 */
		isMessageHighlighted: boolean;
		/**
		 * Is there an active poll
		 */
		hasActivePoll: boolean;
		/**
		 * Is there an active prediction
		 */
		hasActivePrediction: boolean;
		/**
		 * Is there an active bingo
		 */
		hasActiveBingo: boolean;
		/**
		 * Is there an active raffle
		 */
		hasActiveRaffle: boolean;
		/**
		 * Is there an active raffle with at least one entry
		 */
		hasActiveRaffleWithEntries: boolean;
		/**
		 * Chat columns configurations
		 */
		chatColConfs:{
			paused: boolean;
		}[]
		/**
		 * List of animated texts overlays
		 */
		animatedTextList: {
			/**
			 * Animated text ID
			 */
			id: string;
			/**
			 * Animated text name
			 */
			name: string;
			/**
			 * Is the animated text enabled ?
			 */
			enabled: boolean;
		}[];
		/**
		 * List of bingo grids overlays
		 */
		bingoGridList: {
			/**
			 * Animated text ID
			 */
			id: string;
			/**
			 * Animated text name
			 */
			name: string;
			/**
			 * Is the animated text enabled ?
			 */
			enabled: boolean;
		}[];
	};

	/**
	 * @private
	 */
	SET_STREAMDECK_AUTHENTICATE: {
		/**
		 * Declare as an actual twitchat instance.
		 * If more than one is declared a warning will be shown on PI of the SD
		 */
		isMainApp: boolean;
		/**
		 * Secret key.
		 * Key is provided by SD, Twitchat must give it back to SD to validate connection.
		 * This avoids risks of unauthorized connections.
		 */
		secretKey: string;
	};
	/**
	 * Sent by SD to inform Twitchat about authentication result
	 * @private
	 */
	ON_STREAMDECK_AUTHENTICATION_RESULT: {
		success: boolean;
	};
	/**
	 * Live text when using speech-to-text
	 * @private
	 */
	ON_STT_TEXT_UPDATE: { text: string };
	/**
	 * @private
	 */
	ON_STT_RAW_TEXT_UPDATE: { text: string };
	/**
	 * @private
	 */
	ON_STT_REMOTE_TEMP_TEXT_EVENT: { text: string };
	/**
	 * @private
	 */
	ON_STT_REMOTE_FINAL_TEXT_EVENT: { text: string };
	/**
	 * @private
	 */
	ON_STT_SPEECH_END: { text: string };
	/**
	 * @private
	 */
	ON_STT_ACTION_BATCH: { id: keyof TwitchatEventMap; value?: { text: string } }[];
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
	ON_LABELS_UPDATE: undefined;
	/**
	 * Start a new raffle
	 * @private
	 */
	ON_OPEN_RAFFLE_CREATION_FORM: undefined;
	/**
	 * Open poll creation form
	 * @private
	 */
	ON_OPEN_POLL_CREATION_FORM: undefined;
	/**
	 * Open prediction creation form
	 * @private
	 */
	SET_OPEN_PREDICTION_CREATION_FORM: undefined;
	/**
	 * Scene has changed in OBS
	 * @private
	 */
	ON_OBS_SCENE_CHANGE: {
		sceneName: string;
	};
	/**
	 * Source mute state has changed in OBS
	 * @private
	 */
	ON_OBS_MUTE_TOGGLE: {
		inputName: string;
		inputMuted: boolean;
	};
	/**
	 * Playback has started in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_STARTED: {
		inputName: string;
	};
	/**
	 * Playback has paused in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_PAUSED: {
		inputName: string;
	};
	/**
	 * Started playing next item in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_NEXT: {
		inputName: string;
	};
	/**
	 * Started playing previous item in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_PREVIOUS: {
		inputName: string;
	};
	/**
	 * Playback has restarted in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_RESTARTED: {
		inputName: string;
	};
	/**
	 * Playback has ended in an OBS media source
	 * @private
	 */
	ON_OBS_PLAYBACK_ENDED: {
		inputName: string;
	};
	/**
	 * An input name has changed in OBS
	 * @private
	 */
	ON_OBS_INPUT_NAME_CHANGED: {
		inputName: string;
		oldInputName: string;
	};
	/**
	 * A scene name has changed in OBS
	 * @private
	 */
	ON_OBS_SCENE_NAME_CHANGED: {
		sceneName: string;
		oldSceneName: string;
	};
	/**
	 * A source filter name has changed in OBS
	 * @private
	 */
	ON_OBS_FILTER_NAME_CHANGED: {
		sourceName: string;
		filterName: string;
		oldFilterName: string;
	};
	/**
	 * A source has been added to a scene in OBS
	 * @private
	 */
	ON_OBS_SOURCE_TOGGLE: {
		item: OBSSourceItem;
		event: {
			sceneName: string;
			sceneItemId: number;
			sceneItemEnabled: boolean;
		};
	};
	/**
	 * A source filter has been enabled/disabled in OBS
	 * @private
	 */
	ON_OBS_FILTER_TOGGLE: {
		sourceName: string;
		filterName: string;
		filterEnabled: boolean;
	};
	/**
	 * Stream state has changed in OBS
	 * @private
	 */
	ON_OBS_STREAM_STATE: {
		outputActive: boolean;
		outputState: string;
	};
	/**
	 * Recording state has changed in OBS
	 * @private
	 */
	ON_OBS_RECORD_STATE: {
		outputActive: boolean;
		outputState: string;
		outputPath: string;
	};
	/**
	 * Alias of SET_ANIMATED_TEXT_CONTENT but that's listend by Twitchat.
	 * Twitchat will then broadcast SET_ANIMATED_TEXT_CONTENT to the overlay.
	 * This way SD can send animated text to the overlay even though it's not
	 * directly connected to it.
	 * @private
	 */
	SET_ANIMATED_TEXT_CONTENT_FROM_SD: TwitchatEventMap["SET_ANIMATED_TEXT_CONTENT"];
	/**
	 * Alias of SET_BINGO_GRID_VISIBILITY but that's listend by Twitchat.
	 * Twitchat will then broadcast SET_BINGO_GRID_VISIBILITY to the overlay.
	 * This way SD can change bingo grid visibility even though it's not
	 * directly connected to it.
	 * @private
	 */
	SET_BINGO_GRID_VISIBILITY_FROM_SD: TwitchatEventMap["SET_BINGO_GRID_VISIBILITY"];
}