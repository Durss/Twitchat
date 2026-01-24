
<div align="center">
	<a href="https://twitchat.fr" target="_blank">
		<img width="400" alt="twitch" src="https://raw.githubusercontent.com/Durss/Twitchat/main/src_front/assets/logo.svg">
	</a>
	<br>
	<br>
	- <a href="https://twitchat.fr" target="_blank">twitchat.fr</a> -
</div>
<br>
<br>

Twitchat offers a websocket API through  [OBS-Websocket](https://github.com/obsproject/obs-websocket/releases/tag/5.0.0-beta1) to control some features receive some events, and query some data.

<br>
<br>

# Table of content
* [Prerequisites](#prerequisites)
* [Connect example](#connect-example)
* [Events you can receive](#events-you-can-receive)
* [Actions you can perform](#actions-you-can-perform)
* [Requesting data](#requesting-data)

<br>


# Prerequisites
This API needs [OBS-Websocket](https://github.com/obsproject/obs-websocket/releases/tag/5.0.0-beta1) V5 to be installed and running!\
After installing OBS-Websocket, start OBS, you may want set a password on `Tools -> obs-websocket Settings`.\
Once done, go on Twitchat, open the parameters and on the OBS panel specify the credentials to connect with OBS.\
OBS will act as a bridge to transmit Twitchat messages to any connected client.

<br>


# Connect example
To connect with OBS-Websocket you can use the [obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js) package that already handles everything.\
\
Below is a typescript example to use the API via `OBS-Websocket-js`.

```typescript
import OBSWebSocket from 'obs-websocket-js';

const ip:string = "127.0.0.1";//Configure this
const port:number = 4455;//Configure this
const pass:string "";//Configure this

const obs = new OBSWebSocket();

/**
 * Connect to OBS-websocket
 */
async function connect(ip:string, port:string, pass:string):Promise<boolean> {
	try {
		await obs.connect(`ws://${ip}:${port}`, pass, {rpcVersion:1});
	}catch(error) {
		setTimeout(()=> {
			//try again later
			connect(ip, port, pass);
		}, 5000);
		return false;
	}
	obs.addListener("ConnectionClosed", ()=> {
		//Reconnect
		connect(ip, port, pass);
	});

	obs.on("CustomEvent", (e:{origin:"twitchat", type:string, data:unknown}) => onTwitchatEvent(e))
	return true;
}

/**
 * Send a message to Twitchat
 */
function sendMessage(type:string, data:unknown):Promise<void> {
	const eventData = { origin:"twitchat", type, data };
	obs.call("BroadcastCustomEvent", {eventData});
}

/**
 * Called when receiving a message from Twitchat
 */
function onTwitchatEvent(e:{origin:"twitchat", type:string, data:unknown}):void {
	if(e.type == undefined) return;
	//Ignore any message not coming from twitchat
	if(e.origin != "twitchat") return;

	console.log(`Twitchat event ${e.type} received !`);
	console.log(e.data);//JSON data of the event

	//Example
	if(e.type == "ON_MESSAGE_FROM_NON_FOLLOWER") {
		console.log(`The user ${e.data.user.username} is not following the channel and sent this message : ${e.data.message}`)
	}
}

connect(ip, port pass).then(()=> {
	//Marks 1 message as read in the "Greet them section"
	sendMessage("SET_GREET_FEED_READ", {messageCount:1});
});
```

<br>

<!-- INJECT_AFTER -->

# Events you can receive
Events fired by Twitchat that you can listen to.

- [ON_AD_BREAK_OVERLAY_CONFIGS](#on_ad_break_overlay_configs)
- [ON_AD_BREAK_OVERLAY_DATA](#on_ad_break_overlay_data)
- [ON_AD_BREAK_OVERLAY_PRESENCE](#on_ad_break_overlay_presence)
- [ON_ANIMATED_TEXT_CLOSE](#on_animated_text_close)
- [ON_ANIMATED_TEXT_CONFIGS](#on_animated_text_configs)
- [ON_ANIMATED_TEXT_HIDE_COMPLETE](#on_animated_text_hide_complete)
- [ON_ANIMATED_TEXT_SHOW_COMPLETE](#on_animated_text_show_complete)
- [ON_BINGO_GRID_CONFIGS](#on_bingo_grid_configs)
- [ON_BINGO_GRID_LEADER_BOARD](#on_bingo_grid_leader_board)
- [ON_BINGO_GRID_VIEWER_EVENT](#on_bingo_grid_viewer_event)
- [ON_BITS](#on_bits)
- [ON_BITSWALL_OVERLAY_CONFIGS](#on_bitswall_overlay_configs)
- [ON_BITSWALL_OVERLAY_PRESENCE](#on_bitswall_overlay_presence)
- [ON_CHAT_COLUMNS_COUNT](#on_chat_columns_count)
- [ON_CHAT_HIGHLIGHT_OVERLAY_CLOSE](#on_chat_highlight_overlay_close)
- [ON_CHAT_POLL_OVERLAY_CONFIGS](#on_chat_poll_overlay_configs)
- [ON_CHAT_POLL_OVERLAY_PRESENCE](#on_chat_poll_overlay_presence)
- [ON_CHAT_POLL_PROGRESS](#on_chat_poll_progress)
- [ON_COUNTDOWN_COMPLETE](#on_countdown_complete)
- [ON_COUNTDOWN_START](#on_countdown_start)
- [ON_COUNTER_LIST](#on_counter_list)
- [ON_COUNTER_UPDATE](#on_counter_update)
- [ON_CURRENT_TRACK](#on_current_track)
- [ON_CUSTOM_TRAIN_DATA](#on_custom_train_data)
- [ON_DISTORT_OVERLAY_CONFIGS](#on_distort_overlay_configs)
- [ON_DONATION_EVENT](#on_donation_event)
- [ON_DONATION_GOALS_OVERLAY_CONFIGS](#on_donation_goals_overlay_configs)
- [ON_EMERGENCY_MODE_CHANGED](#on_emergency_mode_changed)
- [ON_ENDING_CREDITS_COMPLETE](#on_ending_credits_complete)
- [ON_ENDING_CREDITS_CONFIGS](#on_ending_credits_configs)
- [ON_FOLLOW](#on_follow)
- [ON_GLOBAL_STATES](#on_global_states)
- [ON_LABEL_OVERLAY_CONFIGS](#on_label_overlay_configs)
- [ON_LABEL_OVERLAY_PLACEHOLDERS](#on_label_overlay_placeholders)
- [ON_MENTION](#on_mention)
- [ON_MESSAGE_DELETED](#on_message_deleted)
- [ON_MESSAGE_FIRST_ALL_TIME](#on_message_first_all_time)
- [ON_MESSAGE_FIRST_TODAY](#on_message_first_today)
- [ON_MESSAGE_FROM_NON_FOLLOWER](#on_message_from_non_follower)
- [ON_MESSAGE_MARKED_AS_READ](#on_message_marked_as_read)
- [ON_MESSAGE_WHISPER](#on_message_whisper)
- [ON_MUSIC_PLAYER_HEAT_CLICK](#on_music_player_heat_click)
- [ON_OBS_WEBSOCKET_CONNECTED](#on_obs_websocket_connected)
- [ON_OBS_WEBSOCKET_DISCONNECTED](#on_obs_websocket_disconnected)
- [ON_POLL_OVERLAY_CONFIGS](#on_poll_overlay_configs)
- [ON_POLL_PROGRESS](#on_poll_progress)
- [ON_POLLS_OVERLAY_PRESENCE](#on_polls_overlay_presence)
- [ON_PREDICTION_OVERLAY_CONFIGS](#on_prediction_overlay_configs)
- [ON_PREDICTION_PROGRESS](#on_prediction_progress)
- [ON_PREDICTIONS_OVERLAY_PRESENCE](#on_predictions_overlay_presence)
- [ON_QNA_SESSION_LIST](#on_qna_session_list)
- [ON_REWARD_REDEEM](#on_reward_redeem)
- [ON_SUBSCRIPTION](#on_subscription)
- [ON_TIMER_LIST](#on_timer_list)
- [ON_TIMER_OVERLAY_PRESENCE](#on_timer_overlay_presence)
- [ON_TIMER_START](#on_timer_start)
- [ON_TIMER_STOP](#on_timer_stop)
- [ON_TRACK_ADDED_TO_QUEUE](#on_track_added_to_queue)
- [ON_TRIGGER_LIST](#on_trigger_list)
- [ON_TWITCHAT_READY](#on_twitchat_ready)
- [ON_VOICE_CONTROL_STATE_CHANGE](#on_voice_control_state_change)
- [ON_VOICEMOD_VOICE_CHANGE](#on_voicemod_voice_change)
- [ON_WHEEL_OVERLAY_ANIMATION_COMPLETE](#on_wheel_overlay_animation_complete)
- [ON_WHEEL_OVERLAY_PRESENCE](#on_wheel_overlay_presence)
- [ON_WHEEL_OVERLAY_START](#on_wheel_overlay_start)




#### ON_AD_BREAK_OVERLAY_CONFIGS
Receive ad break overlay configuration  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_AD_BREAK_OVERLAY_CONFIGS = {
	/**
	 * Show approaching state ?
	 */
	showApproaching: boolean;
	/**
	 * Show running state ?
	 */
	showRunning: boolean;
	/**
	 * Delay before starting the ad break (in seconds)
	 */
	approachingDelay: number;
	/**
	 * Style of the approaching state
	 */
	approachingStyle: "text"|"bar";
	/**
	 * Style of the running state
	 */
	runningStyle: "text"|"bar";
	/**
	 * Size of the approaching render
	 */
	approachingSize: number;
	/**
	 * Size of the running render
	 */
	runningSize: number;
	/**
	 * Thickness of the approaching bar
	 */
	approachingThickness: number;
	/**
	 * Thickness of the running bar
	 */
	runningThickness: number;
	/**
	 * Color of the approaching render
	 */
	approachingColor: string;
	/**
	 * Color of the running render
	 */
	runningColor: string;
	/**
	 * Position of the approaching render
	 */
	approachingPlacement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	/**
	 * Position of the running render
	 */
	runningPlacement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	/**
	 * Label when approaching ad break
	 */
	approachingLabel: string;
	/**
	 * Label when running ad break
	 */
	runningLabel: string;
}
```

</details>

#### ON_AD_BREAK_OVERLAY_DATA
Triggered when an ad break occurs  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_AD_BREAK_OVERLAY_DATA = {
	/**
	 * Date in milliseconds the previous mid-roll started
	 */
	prevAdStart_at: number;
	/**
	 * Date in milliseconds the next mid-roll will start
	 */
	nextAdStart_at: number;
	/**
	 * Duration in milliseconds of the current md-roll
	 */
	currentAdDuration_ms: number;
	/**
	 * Number of snooze remaining
	 */
	remainingSnooze: number;
	/**
	 * Date in milliseconds a snooze will be unlocked
	 */
	nextSnooze_at: number;
}
```

</details>

#### ON_AD_BREAK_OVERLAY_PRESENCE
Advertise for ad break overlay presence  


#### ON_ANIMATED_TEXT_CLOSE
Triggered when an animated text overlay close animation completes  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_ANIMATED_TEXT_CLOSE = {
	/**
	 * ID of the overlay that finished closing animation
	 */
	id: string;
	/**
	 * Query ID sent when setting the text from ANIMATED_TEXT_SET
	 */
	queryId: string;
}
```

</details>

#### ON_ANIMATED_TEXT_CONFIGS
Receive animated text overlay configuration  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_ANIMATED_TEXT_CONFIGS = {
	id: string;
	enabled: boolean;
	/**
	 * Optional overlay title
	 */
	title: string;
	/**
	 * Animation style
	 */
	animStyle: "wave"|"typewriter"|"bounce"|"wobble"|"rotate"|"elastic"|"neon"|"swarm"|"caterpillar";
	/**
	 * Animation duration scale
	 * The higher the slower.
	 * Represents the delay between each letter
	 */
	animDurationScale: number;
	/**
	 * Animation strength
	 * The higher the value, the strong the animation effect
	 */
	animStrength: number;
	/**
	 * Text color
	 */
	colorBase: string;
	/**
	 * Highlighted text color
	 */
	colorHighlights: string;
	/**
	 * Text font
	 */
	textFont: string;
	/**
	 * Text size
	 */
	textSize: number;
}
```

</details>

#### ON_ANIMATED_TEXT_HIDE_COMPLETE
Triggered when an animated text hide animation completes  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_ANIMATED_TEXT_HIDE_COMPLETE = {
	/**
	 * Query ID sent when setting the text from ANIMATED_TEXT_SET
	 */
	queryId: string;
}
```

</details>

#### ON_ANIMATED_TEXT_SHOW_COMPLETE
Triggered when an animated text show animation completes  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_ANIMATED_TEXT_SHOW_COMPLETE = {
	/**
	 * Query ID sent when setting the text from ANIMATED_TEXT_SET
	 */
	queryId: string;
}
```

</details>

#### ON_BINGO_GRID_CONFIGS
Receive a bingo grid configuration  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_BINGO_GRID_CONFIGS = {
	/**
	 * Bingo grid ID
	 */
	id: string;
	/**
	 * Bingo configs
	 */
	bingo: null|{
		/**
		 * Bingo grid ID
		 */
		id: string;
		/**
		 * Bingo grid title
		 */
		title: string;
		/**
		 * Is the bingo grid enabled ?
		 */
		enabled: boolean;
		/**
		 * Show cell borders ?
		 */
		showGrid: boolean;
		/**
		 * Bingo grid entries
		 */
		entries: {
			/**
			 * Cell ID
			 */
			id: string;
			/**
			 * Cell label
			 */
			label: string;
			/**
			 * Is the cell locked (not movable) ?
			 */
			lock: boolean;
			/**
			 * Is the cell checked ?
			 */
			check: boolean;
		}[];
		/**
		 * Additional entries that can be used to fill the grid when shuffling it
		 */
		additionalEntries?: {
			/**
			 * Cell ID
			 */
			id: string;
			/**
			 * Cell label
			 */
			label: string;
			/**
			 * Is the cell locked (not movable) ?
			 */
			lock: boolean;
			/**
			 * Is the cell checked ?
			 */
			check: boolean;
		}[];
		/**
		 * Number of columns
		 */
		cols: number;
		/**
		 * Number of rows
		 */
		rows: number;
		/**
		 * Text color
		 */
		textColor: string;
		/**
		 * Background color
		 */
		backgroundColor: string;
		/**
		 * Background alpha (0-1)
		 */
		backgroundAlpha: number;
		/**
		 * Text size in pixels
		 */
		textSize: number;
		/**
		 * Chat command to tick a cell from chat
		 */
		chatCmd?: string;
		/**
		 * Users allowed to use the chat command
		 */
		chatCmdPermissions: {
			/**
			 * Allow broadcaster ?
			 */
			broadcaster: boolean;
			/**
			 * Allow followers ?
			 */
			follower: boolean;
			/**
			 * Minimum follower duration in ms
			 */
			follower_duration_ms: number;
			/**
			 * Allow moderators ?
			 */
			mods: boolean;
			/**
			 * Allow VIPS ?
			 */
			vips: boolean;
			/**
			 * Allow subscribers ?
			 */
			subs: boolean;
			/**
			 * Allow everyone
			 */
			all: boolean;
			/**
			 * Specific users allowed
			 */
			usersAllowed: string[];
			/**
			 * Specific users refused
			 */
			usersRefused: string[];
		};
		/**
		 * Volume of the sound played when a user fills a col/row/diagonal
		 */
		winSoundVolume: number;
		/**
		 * Should the bingo grid auto show/hide after inactivity ?
		 */
		autoShowHide: boolean;
		/**
		 * Allow to tick cells from heat extension
		 */
		heatClick: boolean;
		/**
		 * Users allowed to click on the bingo grid from heat extension
		 */
		heatClickPermissions: {
			/**
			 * Allow broadcaster ?
			 */
			broadcaster: boolean;
			/**
			 * Allow followers ?
			 */
			follower: boolean;
			/**
			 * Minimum follower duration in ms
			 */
			follower_duration_ms: number;
			/**
			 * Allow moderators ?
			 */
			mods: boolean;
			/**
			 * Allow VIPS ?
			 */
			vips: boolean;
			/**
			 * Allow subscribers ?
			 */
			subs: boolean;
			/**
			 * Allow everyone
			 */
			all: boolean;
			/**
			 * Specific users allowed
			 */
			usersAllowed: string[];
			/**
			 * Specific users refused
			 */
			usersRefused: string[];
		};
		/**
		 * Announcement message to send on chat when someone completes a row/col/diagonal
		 */
		chatAnnouncement: string;
		/**
		 * Is chat announcement enabled ?
		 */
		chatAnnouncementEnabled: boolean;
		/**
		 * Announce users that completed a row/col/diagonal on overlay
		 */
		overlayAnnouncement: boolean;
		/**
		 * Which users can be announced on overlay ?
		 */
		overlayAnnouncementPermissions: {
			/**
			 * Allow broadcaster ?
			 */
			broadcaster: boolean;
			/**
			 * Allow followers ?
			 */
			follower: boolean;
			/**
			 * Minimum follower duration in ms
			 */
			follower_duration_ms: number;
			/**
			 * Allow moderators ?
			 */
			mods: boolean;
			/**
			 * Allow VIPS ?
			 */
			vips: boolean;
			/**
			 * Allow subscribers ?
			 */
			subs: boolean;
			/**
			 * Allow everyone
			 */
			all: boolean;
			/**
			 * Specific users allowed
			 */
			usersAllowed: string[];
			/**
			 * Specific users refused
			 */
			usersRefused: string[];
		};
	};
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
	newDiagonalBingos?: 0|1[];
}
```

</details>

#### ON_BINGO_GRID_LEADER_BOARD
Receive bingo grid leaderboard  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_BINGO_GRID_LEADER_BOARD = {
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
		user_pic: string;
		score: number;
		pos: number;
	}[];
}
```

</details>

#### ON_BINGO_GRID_VIEWER_EVENT
Triggered when a viewer completes a bingo  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_BINGO_GRID_VIEWER_EVENT = {
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
```

</details>

#### ON_BITS
Triggered when a user sends bits (cheers)  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_BITS = {
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
	message_chunks?: {
		/**
		 * Chunk type
		 */
		type: "text"|"emote"|"cheermote"|"url"|"highlight"|"user";
		/**
		 * Possible values for each chunk types:
		 * - text: text content
		 * - emote: emote name
		 * - cheermote: cheermote name
		 * - url: url with protocol striped out
		 * - highlight: highlighted text
		 * - user: user name
		 */
		value: string;
		/**
		 * Emote or cheermote URL (low res) for "emote" and "cheermote" chunks
		 */
		emote?: string;
		/**
		 * Emote or cheermote URL (high def) for "emote" and "cheermote" chunks
		 */
		emoteHD?: string;
		/**
		 * Url of a "url" chunk
		 */
		href?: string;
		/**
		 * User login with potential "@" striped out
		 * if "@durss" is on the message, "value" will contain "@durss"
		 * but "username" will only contain "durss"
		 */
		username?: string;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk should be displayed as spoiler
		 */
		spoiler?: boolean;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk is a spoiler tag (||)
		 */
		spoilerTag?: boolean;
	}[];
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
}
```

</details>

#### ON_BITSWALL_OVERLAY_CONFIGS
Receive bitswall overlay configuration  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_BITSWALL_OVERLAY_CONFIGS = {
	/**
	 * Cheermotes size
	 */
	size: number;
	/**
	 * Opacity of the cheermotes (0 to 1)
	 */
	opacity: number;
	/**
	 * Can cheermote be broken by clicking them ?
	 */
	break: boolean;
	/**
	 * Can cheermotes be broken only by the sender ?
	 */
	break_senderOnly: boolean;
	/**
	 * Duration after which the cheermote automatically breaks (in seconds)
	 */
	break_durations?: {
		1: number;
		100: number;
		1000: number;
		5000: number;
		10000: number;
	};
}
```

</details>

#### ON_BITSWALL_OVERLAY_PRESENCE
Advertise for bitswall overlay presence  


#### ON_CHAT_COLUMNS_COUNT
Receive number of chat columns  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_CHAT_COLUMNS_COUNT = {
	/**
	 * Number of chat columns
	 */
	count: number;
}
```

</details>

#### ON_CHAT_HIGHLIGHT_OVERLAY_CLOSE
Sent by chat highlight overlay when a clip completes playing to
request main app to close the highlight  


#### ON_CHAT_POLL_OVERLAY_CONFIGS
Receive chat poll overlay configuration  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_CHAT_POLL_OVERLAY_CONFIGS = {
	parameters: {
		/**
		 * Display choices as a list ?
		 * Otherwise display them all in a single line
		 */
		listMode: boolean;
		/**
		 * Display choices as a list only if there is more than 2 choices
		 */
		listModeOnlyMore2: boolean;
		/**
		 * Show poll's title ?
		 */
		showTitle: boolean;
		/**
		 * Show entries title ?
		 */
		showLabels: boolean;
		/**
		 * Show vote counts ?
		 */
		showVotes: boolean;
		/**
		 * Show vote percentages ?
		 */
		showPercent: boolean;
		/**
		 * Show remaining time ?
		 */
		showTimer: boolean;
		/**
		 * Only show results of the poll ?
		 * Otherwise also show poll while it's running
		 */
		showOnlyResult: boolean;
		/**
		 * Duration to show results screen (in seconds)
		 */
		resultDuration_s: number;
		/**
		 * Screen placement of the overlay
		 */
		placement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	};
}
```

</details>

#### ON_CHAT_POLL_OVERLAY_PRESENCE
Advertise for chat poll overlay presence  


#### ON_CHAT_POLL_PROGRESS
Triggered when chat poll progress updates  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_CHAT_POLL_PROGRESS = {
	poll: {
		/**
		 * Poll title
		 */
		title: string;
		/**
		 * Poll choices
		 */
		choices: {
			id: string;
			/**
			 * Text of the choice
			 */
			label: string;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: number;
		}[];
		/**
		 * Poll duration in seconds
		 */
		duration_s: number;
		/**
		 * Timestamp when the poll has been started
		 */
		started_at: number;
		/**
		 * Timestamp when the poll has ended
		 */
		ended_at?: number;
		/**
		 * Winning choice
		 */
		winner?: {
			id: string;
			/**
			 * Text of the choice
			 */
			label: string;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: number;
		};
		/**
		 * Permissions params
		 */
		permissions: {
			/**
			 * Allow broadcaster ?
			 */
			broadcaster: boolean;
			/**
			 * Allow followers ?
			 */
			follower: boolean;
			/**
			 * Minimum follower duration in ms
			 */
			follower_duration_ms: number;
			/**
			 * Allow moderators ?
			 */
			mods: boolean;
			/**
			 * Allow VIPS ?
			 */
			vips: boolean;
			/**
			 * Allow subscribers ?
			 */
			subs: boolean;
			/**
			 * Allow everyone
			 */
			all: boolean;
			/**
			 * Specific users allowed
			 */
			usersAllowed: string[];
			/**
			 * Specific users refused
			 */
			usersRefused: string[];
		};
		/**
		 * Stores the poll's votes
		 */
		votes: {
			[key: string]: {
				indices: number[];
				login: string;
				platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
			};
		};
		/**
		 * Maximum answers a user can vote for
		 */
		maxVotePerUser: number;
	};
}
```

</details>

#### ON_COUNTDOWN_COMPLETE
Triggered when a countdown completes  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_COUNTDOWN_COMPLETE = {
	id: string;
	/**
	 * Is timer/countdown enabled
	 */
	enabled: boolean;
	/**
	 * Is the default timer/countdown
	 * These are static instances that cannot be deleted
	 * for use with the /timer and /countdown commands
	 */
	isDefault: boolean;
	/**
	 * Name of the timer/countdown
	 */
	title: string;
	/**
	 * Type of entry, timer or countdown
	 */
	type: "timer"|"countdown";
	/**
	 * Timer/countdown's placeholder for trigger
	 */
	placeholderKey: string;
	/**
	 * Date in ms the timer/countdown has been started at
	 */
	startAt_ms?: number;
	/**
	 * Duration added to the timer/countdown
	 */
	offset_ms: number;
	/**
	 * Duration the countdown has been paused for
	 */
	pauseDuration_ms: number;
	/**
	 * Is timer/countdown paused
	 */
	paused: boolean;
	/**
	 * Date in ms the timer/countdown has been paused at
	 */
	pausedAt_ms?: number;
	/**
	 * Date in ms the countdown has ended
	 */
	endAt_ms?: number;
	/**
	 * Duration of the countdown in ms
	 */
	duration_ms: number;
	/**
	 * Contains overlay's params
	 */
	overlayParams: {
		/**
		 * Style of display
		 * text: legacy mode
		 * bar: new render style for countdown with a progress bar reducing
		 */
		style: "text"|"bar";
		/**
		 * Background color
		 */
		bgColor: string;
		/**
		 * Show background
		 */
		bgEnabled: boolean;
		/**
		 * Show icon
		 */
		showIcon: boolean;
		/**
		 * Text font
		 */
		textFont: string;
		/**
		 * Text size
		 */
		textSize: number;
		/**
		 * Text color
		 */
		textColor: string;
		/**
		 * Size of the progress bar
		 */
		progressSize: number;
		/**
		 * Progress style for "bar" style
		 */
		progressStyle: "fill"|"empty";
	};
}
```

</details>

#### ON_COUNTDOWN_START
Triggered when a countdown starts  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_COUNTDOWN_START = {
	id: string;
	/**
	 * Is timer/countdown enabled
	 */
	enabled: boolean;
	/**
	 * Is the default timer/countdown
	 * These are static instances that cannot be deleted
	 * for use with the /timer and /countdown commands
	 */
	isDefault: boolean;
	/**
	 * Name of the timer/countdown
	 */
	title: string;
	/**
	 * Type of entry, timer or countdown
	 */
	type: "timer"|"countdown";
	/**
	 * Timer/countdown's placeholder for trigger
	 */
	placeholderKey: string;
	/**
	 * Date in ms the timer/countdown has been started at
	 */
	startAt_ms?: number;
	/**
	 * Duration added to the timer/countdown
	 */
	offset_ms: number;
	/**
	 * Duration the countdown has been paused for
	 */
	pauseDuration_ms: number;
	/**
	 * Is timer/countdown paused
	 */
	paused: boolean;
	/**
	 * Date in ms the timer/countdown has been paused at
	 */
	pausedAt_ms?: number;
	/**
	 * Date in ms the countdown has ended
	 */
	endAt_ms?: number;
	/**
	 * Duration of the countdown in ms
	 */
	duration_ms: number;
	/**
	 * Contains overlay's params
	 */
	overlayParams: {
		/**
		 * Style of display
		 * text: legacy mode
		 * bar: new render style for countdown with a progress bar reducing
		 */
		style: "text"|"bar";
		/**
		 * Background color
		 */
		bgColor: string;
		/**
		 * Show background
		 */
		bgEnabled: boolean;
		/**
		 * Show icon
		 */
		showIcon: boolean;
		/**
		 * Text font
		 */
		textFont: string;
		/**
		 * Text size
		 */
		textSize: number;
		/**
		 * Text color
		 */
		textColor: string;
		/**
		 * Size of the progress bar
		 */
		progressSize: number;
		/**
		 * Progress style for "bar" style
		 */
		progressStyle: "fill"|"empty";
	};
}
```

</details>

#### ON_COUNTER_LIST
Receive the list of all counters  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_COUNTER_LIST = {
	counterList: {
		id: string;
		name: string;
		perUser: boolean;
	}[];
}
```

</details>

#### ON_COUNTER_UPDATE
Receive counter update  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_COUNTER_UPDATE = {
	/**
	 * Counter data
	 */
	counter: {
		id: string;
		/**
		 * Counter name
		 */
		name: string;
		/**
		 * Counter placeholder for use in triggers
		 * If value is "XXX", the placeholder {COUNTER_VALUE_XXX} will be usable
		 * in all triggers
		 */
		placeholderKey: string;
		/**
		 * Current counter's value (if not "per user")
		 */
		value: number;
		/**
		 * Min value of the counter
		 */
		min: number|false;
		/**
		 * Max value of the counter
		 */
		max: number|false;
		/**
		 * Should the value loop to the opposite limit when reaching the min or max value
		 */
		loop: boolean;
		/**
		 * Is the counter is global (false) or per user (true)
		 */
		perUser: boolean;
		/**
		 * Users values
		 */
		users?: {
			[key: string]: {
				/**
				 * User's chat platform
				 */
				platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
				/**
				 * Value of that user
				 */
				value: number;
				/**
				 * User name
				 */
				login?: string;
			};
		};
		/**
		 * Only available for counters overlay related to a "per user" counter
		 * Contains user info necessary for display on screen.
		 * Only contains 10 first users
		 */
		leaderboard?: {
			/**
			 * User name
			 */
			login: string;
			/**
			 * User avatar URL
			 */
			avatar: string;
			/**
			 * Value of that user
			 */
			points: number;
		}[];
		/**
		 * Is the counter disabled ?
		 * It can be disabled if the user has to disable counters they're not
		 * premium and have more than the maximum counters allowed
		 */
		enabled?: boolean;
	};
}
```

</details>

#### ON_CURRENT_TRACK
Receive current track information  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_CURRENT_TRACK = {
	/**
	 * Music player parameters
	 */
	params: {
		/**
		 * Should the music overlay auto hide when no music is playing ?
		 */
		autoHide: boolean;
		/**
		 * Should current track info be cleared when no music is playing ?
		 */
		erase: boolean;
		/**
		 * Show current track cover?
		 */
		showCover: boolean;
		/**
		 * Show current track artist name?
		 */
		showArtist: boolean;
		/**
		 * Show current track title?
		 */
		showTitle: boolean;
		/**
		 * Show progress bar?
		 */
		showProgressbar: boolean;
		/**
		 * Open the overlay from left side instead of right?
		 */
		openFromLeft: boolean;
		/**
		 * Disable title and artist name scrolling when too long?
		 */
		noScroll: boolean;
		/**
		 * Custom rendering HTML template
		 */
		customInfoTemplate: string;
	};
	/**
	 * Current track title
	 */
	trackName?: string;
	/**
	 * Current track artist name
	 */
	artistName?: string;
	/**
	 * *
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
	 */
	skin?: string;
}
```

</details>

#### ON_CUSTOM_TRAIN_DATA
Receive custom train configuration and state  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_CUSTOM_TRAIN_DATA = {
	configs: {
		/**
		 * Custom train ID
		 */
		id: string;
		/**
		 * Is custom train enabled ?
		 */
		enabled: boolean;
		/**
		 * Is train being tested ?
		 */
		testing: boolean;
		/**
		 * Optional overlay title
		 */
		title: string;
		/**
		 * Level name "LVL" by default
		 */
		levelName: string;
		/**
		 * Fill color
		 */
		colorFill: string;
		/**
		 * Background color
		 */
		colorBg: string;
		/**
		 * Text font
		 */
		textFont: string;
		/**
		 * Text size
		 */
		textSize: number;
		/**
		 * Train unit currency
		 */
		currency: string;
		/**
		 * Number of events to get the train approaching
		 */
		approachEventCount: number;
		/**
		 * Number of events to start the train
		 */
		triggerEventCount: number;
		/**
		 * Duration to wait after a train before starting a new one
		 */
		cooldownDuration_s: number;
		/**
		 * Duration to complete a level
		 */
		levelsDuration_s: number;
		/**
		 * Date at which the current train/level expires
		 */
		expires_at: number;
		/**
		 * Contains the date at which the cooldown will end
		 */
		coolDownEnd_at: number;
		/**
		 * Post progress on chat?
		 */
		postLevelUpOnChat: boolean;
		/**
		 * Message to post on chat on level up
		 */
		postLevelUpChatMessage: string;
		/**
		 * Post success on chat?
		 */
		postSuccessOnChat: boolean;
		/**
		 * Message to post on chat on success
		 */
		postSuccessChatMessage: string;
		/**
		 * Text for the "level X complete"
		 */
		levelUpLabel: string;
		/**
		 * Text for the "train appraoching"
		 */
		approachingLabel: string;
		/**
		 * Emote for the "train appraoching"
		 */
		approachingEmote: string;
		/**
		 * Text displayed if train is failed
		 */
		failedLabel: string;
		/**
		 * Emote for the "train failed"
		 */
		failedEmote: string;
		/**
		 * Text displayed when train complete
		 */
		successLabel: string;
		/**
		 * Text displayed when train complete with level and percent reached
		 */
		successLabelSummary: string;
		/**
		 * Emote for the "train complete"
		 */
		successEmote: string;
		/**
		 * Text displayed on all time record
		 */
		recordLabel: string;
		/**
		 * Emote for all time record
		 */
		recordEmote: string;
		/**
		 * Fill color for all time record
		 */
		recordColorFill: string;
		/**
		 * Background color for all time record
		 */
		recordColorBg: string;
		/**
		 * Emote for the "level up" sequence
		 */
		levelUpEmote: string;
		/**
		 * Levels amounts.
		 * coma seperated numbers
		 */
		levelAmounts: number[];
		/**
		 * Current all time record info
		 */
		allTimeRecord?: {
			/**
			 * Date of the record (timestamp)
			 */
			date: number;
			/**
			 * Record amount
			 */
			amount: number;
		};
		/**
		 * Platforms allowed to make train progress
		 */
		platforms: {
			kofi: boolean;
			streamelements: boolean;
			patreon: boolean;
			streamlabs: boolean;
			tipeee: boolean;
			tiltify: boolean;
			streamlabs_charity: boolean;
			twitch_charity: boolean;
		};
	};
	state: {
		/**
		 * Date at which the train approached (0 if not yet)
		 */
		approached_at: number;
		/**
		 * Date at which the train started (0 if not yet)
		 */
		levelStarted_at: number;
		/**
		 * Current train amount
		 */
		amount: number;
		/**
		 * Reference to internal timeout
		 */
		timeoutRef?: string;
		/**
		 * Activities for this train
		 */
		activities: {
			id: string;
			/**
			 * Platform used to make the donation
			 */
			platform: "kofi"|"streamlabs"|"streamelements"|"tipeee"|"patreon"|"tiltify"|"streamlabs_charity"|"twitch_charity"|"trigger";
			/**
			 * Donation amount
			 */
			amount: number;
			/**
			 * Activity date
			 */
			created_at: number;
			/**
			 * Message that created this activity
			 */
			messageId: string;
		}[];
	};
}
```

</details>

#### ON_DISTORT_OVERLAY_CONFIGS
Receive a distortion overlay configuration data  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_DISTORT_OVERLAY_CONFIGS = {
	params: {
		/**
		 * Distortion overlay ID
		 */
		id: string;
		/**
		 * Overlay name
		 */
		name: string;
		/**
		 * OBS item path where to apply the distortion
		 */
		obsItemPath: {
			/**
			 * Name of the scene containing the item
			 */
			sceneName: string;
			/**
			 * Name of the group containing the item (if any)
			 */
			groupName: string;
			/**
			 * Source info
			 */
			source: {
				/**
				 * Source ID
				 */
				id: number;
				/**
				 * Source name
				 */
				name: string;
			};
		};
		/**
		 * Users allowed to trigger the distortion
		 */
		permissions: {
			/**
			 * Allow broadcaster ?
			 */
			broadcaster: boolean;
			/**
			 * Allow followers ?
			 */
			follower: boolean;
			/**
			 * Minimum follower duration in ms
			 */
			follower_duration_ms: number;
			/**
			 * Allow moderators ?
			 */
			mods: boolean;
			/**
			 * Allow VIPS ?
			 */
			vips: boolean;
			/**
			 * Allow subscribers ?
			 */
			subs: boolean;
			/**
			 * Allow everyone
			 */
			all: boolean;
			/**
			 * Specific users allowed
			 */
			usersAllowed: string[];
			/**
			 * Specific users refused
			 */
			usersRefused: string[];
		};
		/**
		 * Refuse anonymous clicks ?
		 */
		refuseAnon: boolean;
		/**
		 * Distortion effect type
		 */
		effect: "liquid"|"expand"|"shrink"|"heart";
		/**
		 * Name of the shadertastic filter added to the source to create the distortion
		 */
		filterName: string;
		/**
		 * Name of the browser source in OBS
		 */
		browserSourceName: string;
		/**
		 * Is the distortion enabled ?
		 */
		enabled: boolean;
		/**
		 * Should the disctortion only be used from the triggers ?
		 */
		triggerOnly: boolean;
	};
}
```

</details>

#### ON_DONATION_EVENT
Triggered when a donation event occurs  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_DONATION_EVENT = {
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
}
```

</details>

#### ON_DONATION_GOALS_OVERLAY_CONFIGS
Receive a donation goals overlay configurations  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_DONATION_GOALS_OVERLAY_CONFIGS = {
	/**
	 * Overlay parameters
	 */
	params: {
		/**
		 * Donation goal ID
		 */
		id: string;
		/**
		 * Donation goal title
		 */
		title: string;
		/**
		 * Is the donation goal enabled ?
		 */
		enabled: boolean;
		/**
		 * Notify donations on current goal
		 */
		notifyTips: boolean;
		/**
		 * Automatically show/hide all goals depending on activities
		 */
		autoDisplay: boolean;
		/**
		 * Close completed goals
		 */
		hideDone: boolean;
		/**
		 * Delay after which hide the goal
		 */
		hideDelay: number;
		/**
		 * Should the number of items bellow the current one be limited
		 */
		limitEntryCount: boolean;
		/**
		 * Maximum donation goals to display
		 */
		maxDisplayedEntries: number;
		/**
		 * Source to link this donation goal to
		 */
		dataSource: "tiltify"|"streamlabs_charity"|"twitch_charity"|"counter"|"twitch_subs"|"twitch_followers";
		/**
		 * Optional campaign ID.
		 * Not used by "streamlabs_charity" as the campaign
		 * is defined globaly and only one can be active
		 */
		campaignId?: string;
		/**
		 * Counter ID if "dataSource" is set to "counter"
		 */
		counterId?: string;
		/**
		 * Theme color
		 */
		color: string;
		/**
		 * Currency value
		 */
		currency: string;
		/**
		 * List of donation goal entries
		 */
		goalList: {
			/**
			 * Goal ID
			 */
			id: string;
			/**
			 * Goal title
			 */
			title: string;
			/**
			 * Goal amount to reach
			 */
			amount: number;
			/**
			 * If true, the goal's title will be censored until
			 * the goal is completed
			 */
			secret: boolean;
			/**
			 * Defines the secret type.
			 * blur (default): blurs the whole text and shows it only on complete
			 * progressive: shows random letter progressively
			 */
			secret_type?: undefined|"blur"|"progressive";
		}[];
	};
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
	 */
	skin: string;
}
```

</details>

#### ON_EMERGENCY_MODE_CHANGED
<details>
<summary>JSON parameters</summary>

```typescript
type ON_EMERGENCY_MODE_CHANGED = {
	/**
	 * New emergency mode state
	 */
	enabled: boolean;
}
```

</details>

#### ON_ENDING_CREDITS_COMPLETE
Triggered when ending credits animation completes  


#### ON_ENDING_CREDITS_CONFIGS
Receive ending credits configuration data  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_ENDING_CREDITS_CONFIGS = {
	/**
	 * Scale at which to render the credits
	 */
	scale: number;
	/**
	 * Padding around the categories (in pixels)
	 */
	padding: number;
	/**
	 * Padding bellow the title (in pixels)
	 */
	paddingTitle: number;
	/**
	 * Should title stick to the top when scrolling ?
	 */
	stickyTitle: boolean;
	/**
	 * Title color
	 */
	colorTitle: string;
	/**
	 * Color of the categories entries
	 */
	colorEntry: string;
	/**
	 * Font for the title
	 */
	fontTitle: string;
	/**
	 * Font for the entries
	 */
	fontEntry: string;
	/**
	 * Should bots be ignored ?
	 */
	ignoreBots: boolean;
	/**
	 * List of user names to ignore
	 */
	ignoreCustomBots: string[];
	/**
	 * Strength of the text shadow
	 */
	textShadow: number;
	/**
	 * Should the entries scroll at a specific speed or over a specific duration ?
	 */
	timing: "speed"|"duration";
	/**
	 * Duration of the credits scroll (in seconds)
	 */
	duration: number;
	/**
	 * Delay before starting the credits (in seconds)
	 */
	startDelay: number;
	/**
	 * Should credits loop after ending ?
	 */
	loop: boolean;
	/**
	 * Show icons on categories titles ?
	 */
	showIcons: boolean;
	/**
	 * Show power up emotes in the background ?
	 */
	powerUpEmotes: boolean;
	/**
	 * Speed of the credits scroll (in pixels per second)
	 */
	speed: number;
	/**
	 * Size of the fade at the top and bottom of the credits (in pixels)
	 */
	fadeSize: number;
	/**
	 * Slots to show in the ending credits
	 */
	slots: {
		/**
		 * Section ID
		 */
		id: string;
		/**
		 * Type of slot to show
		 */
		slotType: "text"|"bans"|"mods"|"subs"|"vips"|"raids"|"polls"|"so_in"|"so_out"|"cheers"|"follows"|"rewards"|"chatters"|"timeouts"|"hypechats"|"hypetrains"|"predictions"|"tips"|"shoutouts"|"merch"|"patreonMembers"|"powerups"|"ytSuperchat"|"ytSuperSticker"|"tiktokLikes"|"tiktokShares"|"tiktokGifts";
		/**
		 * Title for this slot
		 */
		label: string;
		/**
		 * Maximum entries that section should show
		 */
		maxEntries: number;
		/**
		 * Is the slot enabled ?
		 */
		enabled: boolean;
		/**
		 * Layout of the entries
		 */
		layout: "colLeft"|"col"|"colRight"|"left"|"center"|"right"|"2cols"|"3cols";
		/**
		 * Show entries amounts if any ?
		 */
		showAmounts?: boolean;
		/**
		 * Show sub months duration for subs slot ?
		 */
		showSubMonths?: boolean;
		/**
		 * Show mod/sub/vip badges next to chatters names ?
		 */
		showBadges?: boolean;
		/**
		 * Show moderators on chatters slot ?
		 */
		showMods?: boolean;
		/**
		 * Show VIPs on chatters slot ?
		 */
		showVIPs?: boolean;
		/**
		 * Show subscribers on sub slot ?
		 */
		showSubs?: boolean;
		/**
		 * Show resubs on subs slot ?
		 */
		showResubs?: boolean;
		/**
		 * Show subgifts on subs slot ?
		 */
		showSubgifts?: boolean;
		/**
		 * Show prime subs on subs slot ?
		 */
		showSubsPrime?: boolean;
		/**
		 * Show tier 1 subs on subs slot ?
		 */
		showSubsT1?: boolean;
		/**
		 * Show tier 2 subs on subs slot ?
		 */
		showSubsT2?: boolean;
		/**
		 * Show tier 3 subs on subs slot ?
		 */
		showSubsT3?: boolean;
		/**
		 * Show all subs/subgifters on subs slot ?
		 * Otherwise it only show subs that occured during the stream
		 */
		showAllSubs?: boolean;
		/**
		 * Show all subgifters on subs slot ?
		 * Otherwise it only show subgifters that occured during the stream
		 */
		showAllSubgifters?: boolean;
		/**
		 * Show subs from Youtube ?
		 */
		showSubsYoutube?: boolean;
		/**
		 * Show subs from TikTok ?
		 */
		showSubsTiktok?: boolean;
		/**
		 * Show subgifts from Youtube ?
		 */
		showSubgiftsYoutube?: boolean;
		/**
		 * Show tips from Kofi on tips slot ?
		 */
		showTipsKofi?: boolean;
		/**
		 * Show subs from Kofi on tips slot ?
		 */
		showSubsKofi?: boolean;
		/**
		 * Show tips from Tipeee on tips slot ?
		 */
		showTipsTipeee?: boolean;
		/**
		 * Show tips from Patreon on tips slot ?
		 */
		showTipsPatreon?: boolean;
		/**
		 * Show tips from Streamlabs on tips slot ?
		 */
		showTipsStreamlabs?: boolean;
		/**
		 * Show tips from Streamelements on tips slot ?
		 */
		showTipsStreamelements?: boolean;
		/**
		 * Show merch from Kofi on merch slot ?
		 */
		showMerchKofi?: boolean;
		/**
		 * Show merch from Streamlabs on merch slot ?
		 */
		showMerchStreamlabs?: boolean;
		/**
		 * Sort entries by names ?
		 */
		sortByNames?: boolean;
		/**
		 * Sort entries by roles ?
		 */
		sortByRoles?: boolean;
		/**
		 * Sort entries by amounts ?
		 */
		sortByAmounts?: boolean;
		/**
		 * Sort entries by amounts (if any) ?
		 */
		sortByTotalAmounts?: boolean;
		/**
		 * Sort entries by sub types ?
		 */
		sortBySubTypes?: boolean;
		/**
		 * Show all chatters for chatters slot ?
		 */
		showChatters?: boolean;
		/**
		 * Show train conductors for hypetrain slot ?
		 */
		showTrainConductors?: boolean;
		/**
		 * Show power up skin events ?
		 */
		showPuSkin?: boolean;
		/**
		 * Show power up gigantified emote events ?
		 */
		showPuEmote?: boolean;
		/**
		 * Show power up celebration events ?
		 */
		showPuCeleb?: boolean;
		/**
		 * Show total amounts for entries that have amounts ?
		 * ex: membership duration for Patreon members
		 */
		showTotalAmounts?: boolean;
		/**
		 * Show unique users only ?
		 * Multiple entries from the same user will be merged
		 */
		uniqueUsers?: boolean;
		/**
		 * Text content for text slot
		 */
		text?: string;
		/**
		 * Currency to use for amounts display
		 * ex: for Patreon total amount given
		 */
		currency?: string;
		/**
		 * Show user list tha tredeemed a reward ?
		 */
		showRewardUsers?: boolean;
		/**
		 * Show normal cheers ? (not pinned)
		 */
		showNormalCheers?: boolean;
		/**
		 * Show pinned cheers ?
		 */
		showPinnedCheers?: boolean;
		/**
		 * Anonymise last names of users ?
		 * ex: for patreon members show "john D." instead of "john Doe"
		 */
		anonLastNames?: boolean;
		/**
		 * Filter patreon tiers to show
		 */
		patreonTiers?: string[];
		/**
		 * Should we filter channel point reward redeems ?
		 */
		filterRewards?: boolean;
		/**
		 * Reward IDs to show if filterRewards is true
		 */
		rewardIds?: string[];
		showPremiumWarning?: boolean;
	}[];
	/**
	 * Hide slots that have no entry
	 */
	hideEmptySlots?: boolean;
}
```

</details>

#### ON_FOLLOW
Triggered when a user follows the channel  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_FOLLOW = {
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
}
```

</details>

#### ON_GLOBAL_STATES
Response to GET_GLOBAL_STATES  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_GLOBAL_STATES = {
	/**
	 * List of active timer and their state
	 */
	activeTimers: {
		id: string;
		/**
		 * Is the default timer/countdown
		 * These are static instances that cannot be deleted
		 * for use with the /timer and /countdown commands
		 */
		isDefault: boolean;
		/**
		 * Date in ms the timer/countdown has been started at
		 */
		startAt_ms?: number;
		/**
		 * Date in ms the countdown has ended
		 */
		endAt_ms?: number;
		/**
		 * Duration added to the timer/countdown
		 */
		offset_ms: number;
		/**
		 * Duration the countdown has been paused for
		 */
		pauseDuration_ms: number;
		/**
		 * Is timer/countdown paused
		 */
		paused: boolean;
		/**
		 * Date in ms the timer/countdown has been paused at
		 */
		pausedAt_ms?: number;
		/**
		 * Duration of the countdown in ms
		 */
		duration_ms: number;
		/**
		 * Is timer/countdown enabled
		 */
		enabled: boolean;
		/**
		 * Type of entry, timer or countdown
		 */
		type: "timer"|"countdown";
	}[];
	/**
	 * List of active countdowns and their state
	 */
	activeCountdowns: {
		id: string;
		/**
		 * Is the default timer/countdown
		 * These are static instances that cannot be deleted
		 * for use with the /timer and /countdown commands
		 */
		isDefault: boolean;
		/**
		 * Date in ms the timer/countdown has been started at
		 */
		startAt_ms?: number;
		/**
		 * Date in ms the countdown has ended
		 */
		endAt_ms?: number;
		/**
		 * Duration added to the timer/countdown
		 */
		offset_ms: number;
		/**
		 * Duration the countdown has been paused for
		 */
		pauseDuration_ms: number;
		/**
		 * Is timer/countdown paused
		 */
		paused: boolean;
		/**
		 * Date in ms the timer/countdown has been paused at
		 */
		pausedAt_ms?: number;
		/**
		 * Duration of the countdown in ms
		 */
		duration_ms: number;
		/**
		 * Is timer/countdown enabled
		 */
		enabled: boolean;
		/**
		 * Type of entry, timer or countdown
		 */
		type: "timer"|"countdown";
	}[];
	/**
	 * Current counter values
	 */
	counterValues: {
		id: string;
		value: number;
	}[];
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
	lastRaiderName: string;
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
	chatColConfs: {
		paused: boolean;
	}[];
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
}
```

</details>

#### ON_LABEL_OVERLAY_CONFIGS
Receive label overlay configuration  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_LABEL_OVERLAY_CONFIGS = {
	/**
	 * Label ID
	 */
	id: string;
	/**
	 * Label data
	 */
	data: null|{
		/**
		 * Label ID
		 */
		id: string;
		/**
		 * Label custom title
		 */
		title: string;
		/**
		 * Label is enabled ?
		 */
		enabled: boolean;
		/**
		 * Label placeholder tag to use if mode is "placeholder"
		 */
		placeholder: ""|"DATE"|"TIME"|"DATE_TIME"|"DAY"|"MONTH"|"YEAR"|"HOURS"|"MINUTES"|"SECONDS"|"VIEWER_COUNT_TWITCH"|"FOLLOWER_COUNT"|"SUB_COUNT"|"SUB_POINTS"|"STREAM_DURATION"|"STREAM_TITLE"|"STREAM_CATEGORY_NAME"|"STREAM_CATEGORY_COVER"|"SUB_NAME"|"SUB_ID"|"SUB_AVATAR"|"SUB_TIER"|"SUBGIFT_NAME"|"SUBGIFT_ID"|"SUBGIFT_AVATAR"|"SUBGIFT_TIER"|"SUBGIFT_COUNT"|"VIEWER_COUNT_YOUTUBE"|"SUB_YOUTUBE_NAME"|"SUB_YOUTUBE_ID"|"SUB_YOUTUBE_AVATAR"|"SUB_YOUTUBE_TIER"|"SUBGIFT_YOUTUBE_NAME"|"SUBGIFT_YOUTUBE_ID"|"SUBGIFT_YOUTUBE_AVATAR"|"SUBGIFT_YOUTUBE_TIER"|"SUBGIFT_YOUTUBE_COUNT"|"FOLLOWER_YOUTUBE_USER"|"FOLLOWER_YOUTUBE_AVATAR"|"VIEWER_COUNT"|"SUB_GENERIC_NAME"|"SUB_GENERIC_ID"|"SUB_GENERIC_AVATAR"|"SUB_GENERIC_TIER"|"SUBGIFT_GENERIC_NAME"|"SUBGIFT_GENERIC_ID"|"SUBGIFT_GENERIC_AVATAR"|"SUBGIFT_GENERIC_TIER"|"SUBGIFT_GENERIC_COUNT"|"SUPER_CHAT_NAME"|"SUPER_CHAT_ID"|"SUPER_CHAT_AVATAR"|"SUPER_CHAT_AMOUNT"|"SUPER_STICKER_NAME"|"SUPER_STICKER_ID"|"SUPER_STICKER_AVATAR"|"SUPER_STICKER_AMOUNT"|"SUPER_STICKER_IMAGE"|"CHEER_NAME"|"CHEER_ID"|"CHEER_AVATAR"|"CHEER_AMOUNT"|"COMBO_NAME"|"COMBO_ID"|"COMBO_AVATAR"|"COMBO_AMOUNT"|"FOLLOWER_NAME"|"FOLLOWER_ID"|"FOLLOWER_AVATAR"|"FOLLOWER_GENERIC_NAME"|"FOLLOWER_GENERIC_ID"|"FOLLOWER_GENERIC_AVATAR"|"REWARD_NAME"|"REWARD_ID"|"REWARD_AVATAR"|"REWARD_ICON"|"REWARD_TITLE"|"RAID_NAME"|"RAID_ID"|"RAID_AVATAR"|"RAID_COUNT"|"WATCH_STREAK_NAME"|"WATCH_STREAK_ID"|"WATCH_STREAK_AVATAR"|"WATCH_STREAK_COUNT"|"POWER_UP_GIANTIFIED_ID"|"POWER_UP_GIANTIFIED_NAME"|"POWER_UP_GIANTIFIED_AVATAR"|"POWER_UP_GIANTIFIED_CODE"|"POWER_UP_GIANTIFIED_IMAGE"|"POWER_UP_CELEBRATION_ID"|"POWER_UP_CELEBRATION_NAME"|"POWER_UP_CELEBRATION_AVATAR"|"POWER_UP_CELEBRATION_CODE"|"POWER_UP_CELEBRATION_IMAGE"|"POWER_UP_MESSAGE_ID"|"POWER_UP_MESSAGE_NAME"|"POWER_UP_MESSAGE_AVATAR"|"KOFI_TIP_NAME"|"KOFI_TIP_AMOUNT"|"KOFI_MERCH_USER"|"KOFI_MERCH_NAME"|"KOFI_MERCH_AMOUNT"|"STREAMLABS_TIP_NAME"|"STREAMLABS_TIP_AMOUNT"|"STREAMLABS_MERCH_USER"|"STREAMLABS_MERCH_NAME"|"STREAMLABS_CHARITY_NAME"|"STREAMLABS_CHARITY_IMAGE"|"STREAMLABS_CHARITY_RAISED"|"STREAMLABS_CHARITY_RAISED_PERSONNAL"|"STREAMLABS_CHARITY_GOAL"|"STREAMLABS_CHARITY_LAST_TIP_USER"|"STREAMLABS_CHARITY_LAST_TIP_AMOUNT"|"TILTIFY_LAST_TIP_USER"|"TILTIFY_LAST_TIP_AMOUNT"|"PATREON_USER"|"PATREON_AMOUNT"|"PATREON_TITLE"|"PATREON_AVATAR"|"PATREON_MEMBER_COUNT"|"STREAMELEMENTS_TIP_NAME"|"STREAMELEMENTS_TIP_AMOUNT"|"TIPEEE_TIP_NAME"|"TIPEEE_TIP_AMOUNT"|"TWITCH_CHARITY_NAME"|"TWITCH_CHARITY_IMAGE"|"TWITCH_CHARITY_RAISED"|"TWITCH_CHARITY_GOAL"|"TWITCH_CHARITY_LAST_TIP_USER"|"TWITCH_CHARITY_LAST_TIP_AMOUNT"|"TWITCH_CHARITY_LAST_TIP_AVATAR"|"VOICEMOD_EFFECT_TITLE"|"VOICEMOD_EFFECT_ICON"|"MUSIC_TITLE"|"MUSIC_ARTIST"|"MUSIC_ALBUM"|"MUSIC_COVER"|"VIEWER_COUNT_TIKTOK"|"TIKTOK_LIKE_TOTAL"|"TIKTOK_LIKE_USER"|"TIKTOK_LIKE_AVATAR"|"TIKTOK_LIKE_COUNT"|"TIKTOK_FOLLOWER_USER"|"TIKTOK_FOLLOWER_AVATAR"|"TIKTOK_SUB_USER"|"TIKTOK_SUB_AVATAR"|"TIKTOK_SHARE_USER"|"TIKTOK_SHARE_AVATAR"|"TIKTOK_GIFT_USER"|"TIKTOK_GIFT_AVATAR"|"TIKTOK_GIFT_IMAGE"|"TIKTOK_GIFT_COUNT"|"TIKTOK_GIFT_DIAMONDS";
		/**
		 * HTML content if mode is "html"
		 */
		html: string;
		/**
		 * Custom CSS for this label if mode is "html"
		 */
		css: string;
		/**
		 * Mode of this label.
		 * "placeholder": use a predefined placeholder
		 * "html": use custom HTML content
		 */
		mode: "placeholder"|"html";
		/**
		 * Font size in pixels
		 */
		fontSize: number;
		/**
		 * Font family
		 */
		fontFamily: string;
		/**
		 * Font color
		 */
		fontColor: string;
		/**
		 * Text horizontal alignment
		 */
		textAlign: "left"|"center"|"right";
		/**
		 * Should scroll content ?
		 */
		scrollContent: boolean;
		/**
		 * Show background ?
		 */
		backgroundEnabled: boolean;
		/**
		 * Background color
		 */
		backgroundColor: string;
	};
	/**
	 * Does the label actually exists ?
	 * If not, overlay will show an error
	 */
	exists?: boolean;
	/**
	 * False if label mode is "placeholder" but related placeholder doesn't exist
	 */
	isValid?: boolean;
}
```

</details>

#### ON_LABEL_OVERLAY_PLACEHOLDERS
Advertise for label overlay placeholders  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_LABEL_OVERLAY_PLACEHOLDERS = {
	[key: string]: {
		/**
		 * Placeholder value
		 */
		value: string|number;
		/**
		 * Placeholder type
		 */
		type: "string"|"number"|"duration"|"date"|"time"|"datetime"|"day"|"month"|"year"|"hours"|"minutes"|"seconds"|"image";
	};
}
```

</details>

#### ON_MENTION
Triggered when the streamer is mentioned in a message  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_MENTION = {
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
}
```

</details>

#### ON_MESSAGE_DELETED
A chat message has been deleted  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_MESSAGE_DELETED = {
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
}
```

</details>

#### ON_MESSAGE_FIRST_ALL_TIME
Triggered when a user sends their first message ever in the channel  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_MESSAGE_FIRST_ALL_TIME = {
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
}
```

</details>

#### ON_MESSAGE_FIRST_TODAY
Triggered when a user sends their first message of the day  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_MESSAGE_FIRST_TODAY = {
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
}
```

</details>

#### ON_MESSAGE_FROM_NON_FOLLOWER
Triggered when a message is received from a non-follower  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_MESSAGE_FROM_NON_FOLLOWER = {
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
}
```

</details>

#### ON_MESSAGE_MARKED_AS_READ
Triggered when a message is marked or unmarked as read  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_MESSAGE_MARKED_AS_READ = {
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
}
```

</details>

#### ON_MESSAGE_WHISPER
Triggered when a whisper message is received  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_MESSAGE_WHISPER = {
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
```

</details>

#### ON_MUSIC_PLAYER_HEAT_CLICK
Triggered when a heat click occurs on the music player  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_MUSIC_PLAYER_HEAT_CLICK = {
	/**
	 * Click ID
	 */
	id: string;
	/**
	 * Channel ID the click occured on
	 */
	channelId: string;
	/**
	 * Is the click anonymous ?
	 */
	anonymous: boolean;
	/**
	 * ID of the user who clicked
	 */
	uid: string;
	/**
	 * Login of the user who clicked
	 */
	login: string;
	/**
	 * Normalized X position (0 to 1) of the click
	 */
	x: number;
	/**
	 * Normalized Y position (0 to 1) of the click
	 */
	y: number;
	/**
	 * Is the user a subscriber ?
	 */
	isSub: boolean;
	/**
	 * Is the user banned ?
	 */
	isBan: boolean;
	/**
	 * Is the user a moderator ?
	 */
	isMod: boolean;
	/**
	 * Is the user a VIP ?
	 */
	isVip: boolean;
	/**
	 * Is the user the broadcaster ?
	 */
	isBroadcaster: boolean;
	/**
	 * Is the user a follower ?
	 */
	isFollower: boolean;
	/**
	 * Date at which the user followed the channel (if isFollower is true)
	 */
	followDate: number;
	/**
	 * Is it a test click ?
	 * Sent from settings => connections => heat => click on preview
	 */
	testMode: boolean;
	/**
	 * Was alt keys pressed ?
	 */
	alt: boolean;
	/**
	 * Was ctrl key pressed ?
	 */
	ctrl: boolean;
	/**
	 * Was shift key pressed ?
	 */
	shift: boolean;
	/**
	 * Sha256 of the clicked browser source URL
	 */
	page: string;
	/**
	 * Optional Twitchat overlay ID sent for some specific overlays
	 */
	twitchatOverlayID: string;
	/**
	 * X scale of the browser source
	 */
	scaleX: number;
	/**
	 * Y scale of the browser source
	 */
	scaleY: number;
	/**
	 * Rotation angle of the browser source in degrees
	 */
	rotation: number;
}
```

</details>

#### ON_OBS_WEBSOCKET_CONNECTED
OBS Websocket connection established  


#### ON_OBS_WEBSOCKET_DISCONNECTED
OBS Websocket connection lost  


#### ON_POLL_OVERLAY_CONFIGS
Receive poll overlay configuration  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_POLL_OVERLAY_CONFIGS = {
	parameters: {
		/**
		 * Display choices as a list ?
		 * Otherwise display them all in a single line
		 */
		listMode: boolean;
		/**
		 * Display choices as a list only if there is more than 2 choices
		 */
		listModeOnlyMore2: boolean;
		/**
		 * Show poll's title ?
		 */
		showTitle: boolean;
		/**
		 * Show entries title ?
		 */
		showLabels: boolean;
		/**
		 * Show vote counts ?
		 */
		showVotes: boolean;
		/**
		 * Show vote percentages ?
		 */
		showPercent: boolean;
		/**
		 * Show remaining time ?
		 */
		showTimer: boolean;
		/**
		 * Only show results of the poll ?
		 * Otherwise also show poll while it's running
		 */
		showOnlyResult: boolean;
		/**
		 * Duration to show results screen (in seconds)
		 */
		resultDuration_s: number;
		/**
		 * Screen placement of the overlay
		 */
		placement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	};
}
```

</details>

#### ON_POLL_PROGRESS
Triggered when poll progress updates.
If no active poll, body is undefined  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_POLL_PROGRESS = {
	/**
	 * Poll's data
	 */
	poll: {
		channel_id: string;
		type: "poll";
		/**
		 * Poll creator
		 */
		creator?: {
			id: string;
			platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
			login: string;
			/**
			 * Get the display name of the user.
			 * Returns eith the actual twitch display name, or the custom one defined
			 * on twitchat.
			 */
			displayName: string;
			/**
			 * Original twitch display name of the user
			 */
			displayNameOriginal: string;
			/**
			 * URL of the avatar
			 */
			avatarPath?: string;
			/**
			 * Account createion date
			 */
			created_at_ms?: number;
			/**
			 * Nickname chat color
			 */
			color?: string;
			/**
			 * Is a twitch partner?
			 */
			is_partner: boolean;
			/**
			 * Is a twitch affiliate?
			 */
			is_affiliate: boolean;
			/**
			 * Should this user's messages be highlighted?
			 */
			is_tracked: boolean;
			/**
			 * Is this a known bot account?
			 */
			is_bot: boolean;
			/**
			 * Is the user blocked by me?
			 */
			is_blocked: boolean;
			/**
			 * When a user is blocked, their messages are censored until we click
			 * on of them in which case messages stop being censored until next
			 * app start.
			 * This flag is here for this, stopping censor to ignore "is_blocked" state
			 */
			stop_block_censor?: boolean;
			/**
			 * Is a Twitchat admin?
			 */
			is_admin?: boolean;
			/**
			 * undefined=no loaded yet; false=no pronouns found; string=pronouns code
			 */
			pronouns: null|string|false;
			/**
			 * Pronouns label
			 */
			pronounsLabel: string|false;
			/**
			 * Pronouns tooltip
			 */
			pronounsTooltip: string|false;
			/**
			 * Contains one entry per connected channel with
			 * channel specific info.
			 */
			channelInfo: {
				[key: string]: {
					/**
					 * true if user is connected on the channel's chat
					 */
					online: boolean;
					/**
					 * true if user talked for the first time ever on our chat during this session
					 */
					is_new: boolean;
					/**
					 * true if user raided us
					 * Stays to "true" for the specified amount of duration on the parameters
					 * then switched back to false
					 */
					is_raider: boolean;
					/**
					 * Defines if user is a follower of the channel
					 * null = don't know yet
					 * true = is a follower
					 * false = is not a follower
					 */
					is_following: null|false|true;
					/**
					 * true if user is banned on the channel
					 */
					is_banned: boolean;
					/**
					 * true if user is a VIP of the channel
					 */
					is_vip: boolean;
					/**
					 * true if user is a moderator of the channel
					 */
					is_moderator: boolean;
					/**
					 * true if user is the broadcaster of the channel
					 */
					is_broadcaster: boolean;
					/**
					 * true if user is subscribed to the channel
					 */
					is_subscriber?: boolean;
					/**
					 * true if user has gifted subs on the channel
					 */
					is_gifter: boolean;
					/**
					 * Date at which the user followed the channel
					 * Value = 0 if not checked yet, -1 not following
					 */
					following_date_ms: number;
					/**
					 * User badges for this channel
					 */
					badges: {
						icon: {
							sd: string;
							hd?: string;
						};
						id: "predictions"|"subscriber"|"vip"|"premium"|"moderator"|"lead_moderator"|"staff"|"broadcaster"|"partner"|"founder"|"ambassador";
						title?: string;
						version?: string;
					}[];
					/**
					 * Date at which the ban expires on this channel
					 */
					banEndDate?: number;
					/**
					 * Contains the ban reason
					 */
					banReason?: string;
					/**
					 * Last date the user interracted on this channel
					 */
					lastActivityDate?: number;
					/**
					 * Number of subgifts the user made on this channel
					 * Only available after making a subgift
					 */
					totalSubgifts?: number;
					/**
					 * Store the date at which this user last got a shoutout
					 */
					lastShoutout?: number;
					/**
					 * Defines if the user should be moded back after their timeout completes
					 */
					autoRemod?: boolean;
					/**
					 * Is the user restricted in the channel?
					 */
					is_restricted?: boolean;
					/**
					 * Is the user suspicious in the channel?
					 */
					is_suspicious?: boolean;
				};
			};
			/**
			 * true when the details are loading
			 */
			temporary?: boolean;
			/**
			 * true if user data loading failed
			 */
			errored?: boolean;
			/**
			 * true if data respresents an anonymous user.
			 * For exemple an anonymous Heat user
			 */
			anonymous?: boolean;
			/**
			 * If set to true, this user's messages won't be automatically set
			 * as spoiler if the related option is enabled on the spoiler section
			 */
			noAutospoil?: boolean;
		};
		/**
		 * Poll title
		 */
		title: string;
		/**
		 * Poll choices
		 */
		choices: {
			id: string;
			/**
			 * Text of the choice
			 */
			label: string;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: number;
		}[];
		/**
		 * Poll duration in seconds
		 */
		duration_s: number;
		/**
		 * Timestamp when the poll has been started
		 */
		started_at: number;
		/**
		 * Timestamp when the poll has ended
		 */
		ended_at?: number;
		/**
		 * Winning choice
		 */
		winner?: {
			id: string;
			/**
			 * Text of the choice
			 */
			label: string;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: number;
		};
		/**
		 * Defines if it's the first event of the poll
		 * which means it's just been started
		 */
		isStart?: boolean;
		/**
		 * Set to true when simulating a poll for the overlay
		 */
		isFake?: boolean;
		id: string;
		date: number;
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
		/**
		 * Defines infos about the channel this message comes from.
		 * Only set for messages received from channels other than ours
		 */
		channelSource?: {
			color: string;
			name: string;
			pic?: string;
		};
		/**
		 * Defines if messages originates from a shared chat session.
		 */
		twitchSharedChat?: boolean;
		/**
		 * true if message has been deleted
		 */
		deleted?: boolean;
		/**
		 * true if message has been part of the cleared messages
		 * when using /clear command
		 */
		cleared?: boolean;
		/**
		 * Is it a fake message ?
		 */
		fake?: boolean;
		/**
		 * Optional column index to display the message to
		 * Can be an array of column indices
		 */
		col?: undefined|number|number[];
	};
}
```

</details>

#### ON_POLLS_OVERLAY_PRESENCE
Advertise for polls overlay presence  


#### ON_PREDICTION_OVERLAY_CONFIGS
Receive prediction overlay configuration  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_PREDICTION_OVERLAY_CONFIGS = {
	/**
	 * Prediction overlay parameters
	 */
	parameters: {
		listMode: boolean;
		listModeOnlyMore2: boolean;
		showTitle: boolean;
		showLabels: boolean;
		showVotes: boolean;
		showVoters: boolean;
		showPercent: boolean;
		showTimer: boolean;
		showOnlyResult: boolean;
		hideUntilResolved: boolean;
		resultDuration_s: number;
		placement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	};
}
```

</details>

#### ON_PREDICTION_PROGRESS
Triggered when prediction progress updates
If no active prediction, body is undefined  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_PREDICTION_PROGRESS = {
	/**
	 * Prediction's data
	 */
	prediction: {
		channel_id: string;
		type: "prediction";
		/**
		 * Prediction creator
		 */
		creator?: {
			id: string;
			platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
			login: string;
			/**
			 * Get the display name of the user.
			 * Returns eith the actual twitch display name, or the custom one defined
			 * on twitchat.
			 */
			displayName: string;
			/**
			 * Original twitch display name of the user
			 */
			displayNameOriginal: string;
			/**
			 * URL of the avatar
			 */
			avatarPath?: string;
			/**
			 * Account createion date
			 */
			created_at_ms?: number;
			/**
			 * Nickname chat color
			 */
			color?: string;
			/**
			 * Is a twitch partner?
			 */
			is_partner: boolean;
			/**
			 * Is a twitch affiliate?
			 */
			is_affiliate: boolean;
			/**
			 * Should this user's messages be highlighted?
			 */
			is_tracked: boolean;
			/**
			 * Is this a known bot account?
			 */
			is_bot: boolean;
			/**
			 * Is the user blocked by me?
			 */
			is_blocked: boolean;
			/**
			 * When a user is blocked, their messages are censored until we click
			 * on of them in which case messages stop being censored until next
			 * app start.
			 * This flag is here for this, stopping censor to ignore "is_blocked" state
			 */
			stop_block_censor?: boolean;
			/**
			 * Is a Twitchat admin?
			 */
			is_admin?: boolean;
			/**
			 * undefined=no loaded yet; false=no pronouns found; string=pronouns code
			 */
			pronouns: null|string|false;
			/**
			 * Pronouns label
			 */
			pronounsLabel: string|false;
			/**
			 * Pronouns tooltip
			 */
			pronounsTooltip: string|false;
			/**
			 * Contains one entry per connected channel with
			 * channel specific info.
			 */
			channelInfo: {
				[key: string]: {
					/**
					 * true if user is connected on the channel's chat
					 */
					online: boolean;
					/**
					 * true if user talked for the first time ever on our chat during this session
					 */
					is_new: boolean;
					/**
					 * true if user raided us
					 * Stays to "true" for the specified amount of duration on the parameters
					 * then switched back to false
					 */
					is_raider: boolean;
					/**
					 * Defines if user is a follower of the channel
					 * null = don't know yet
					 * true = is a follower
					 * false = is not a follower
					 */
					is_following: null|false|true;
					/**
					 * true if user is banned on the channel
					 */
					is_banned: boolean;
					/**
					 * true if user is a VIP of the channel
					 */
					is_vip: boolean;
					/**
					 * true if user is a moderator of the channel
					 */
					is_moderator: boolean;
					/**
					 * true if user is the broadcaster of the channel
					 */
					is_broadcaster: boolean;
					/**
					 * true if user is subscribed to the channel
					 */
					is_subscriber?: boolean;
					/**
					 * true if user has gifted subs on the channel
					 */
					is_gifter: boolean;
					/**
					 * Date at which the user followed the channel
					 * Value = 0 if not checked yet, -1 not following
					 */
					following_date_ms: number;
					/**
					 * User badges for this channel
					 */
					badges: {
						icon: {
							sd: string;
							hd?: string;
						};
						id: "predictions"|"subscriber"|"vip"|"premium"|"moderator"|"lead_moderator"|"staff"|"broadcaster"|"partner"|"founder"|"ambassador";
						title?: string;
						version?: string;
					}[];
					/**
					 * Date at which the ban expires on this channel
					 */
					banEndDate?: number;
					/**
					 * Contains the ban reason
					 */
					banReason?: string;
					/**
					 * Last date the user interracted on this channel
					 */
					lastActivityDate?: number;
					/**
					 * Number of subgifts the user made on this channel
					 * Only available after making a subgift
					 */
					totalSubgifts?: number;
					/**
					 * Store the date at which this user last got a shoutout
					 */
					lastShoutout?: number;
					/**
					 * Defines if the user should be moded back after their timeout completes
					 */
					autoRemod?: boolean;
					/**
					 * Is the user restricted in the channel?
					 */
					is_restricted?: boolean;
					/**
					 * Is the user suspicious in the channel?
					 */
					is_suspicious?: boolean;
				};
			};
			/**
			 * true when the details are loading
			 */
			temporary?: boolean;
			/**
			 * true if user data loading failed
			 */
			errored?: boolean;
			/**
			 * true if data respresents an anonymous user.
			 * For exemple an anonymous Heat user
			 */
			anonymous?: boolean;
			/**
			 * If set to true, this user's messages won't be automatically set
			 * as spoiler if the related option is enabled on the spoiler section
			 */
			noAutospoil?: boolean;
		};
		/**
		 * Prediction title
		 */
		title: string;
		/**
		 * Prediction duration in seconds
		 */
		duration_s: number;
		/**
		 * Prediction possible outcomes
		 */
		outcomes: {
			id: string;
			/**
			 * Text of the choice
			 */
			label: string;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: number;
			/**
			 * Number of users that voted for this answer
			 */
			voters: number;
		}[];
		/**
		 * true if the prediction is pending for choosing the winning outcome
		 */
		pendingAnswer: boolean;
		/**
		 * Timestamp when the Prediction has been started
		 */
		started_at: number;
		/**
		 * Timestamp when the Prediction has ended
		 */
		ended_at?: number;
		/**
		 * Winning choice
		 */
		winner?: {
			id: string;
			/**
			 * Text of the choice
			 */
			label: string;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: number;
			/**
			 * Number of users that voted for this answer
			 */
			voters: number;
		};
		/**
		 * Total channel points bet
		 */
		totalPoints: number;
		/**
		 * Total users participating
		 */
		totalUsers: number;
		/**
		 * Defines if it's the first event of the prediction
		 * which means it's just been started
		 */
		isStart?: boolean;
		/**
		 * Set to true when simulating a poll for the overlay
		 */
		isFake?: boolean;
		id: string;
		date: number;
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
		/**
		 * Defines infos about the channel this message comes from.
		 * Only set for messages received from channels other than ours
		 */
		channelSource?: {
			color: string;
			name: string;
			pic?: string;
		};
		/**
		 * Defines if messages originates from a shared chat session.
		 */
		twitchSharedChat?: boolean;
		/**
		 * true if message has been deleted
		 */
		deleted?: boolean;
		/**
		 * true if message has been part of the cleared messages
		 * when using /clear command
		 */
		cleared?: boolean;
		/**
		 * Is it a fake message ?
		 */
		fake?: boolean;
		/**
		 * Optional column index to display the message to
		 * Can be an array of column indices
		 */
		col?: undefined|number|number[];
	};
}
```

</details>

#### ON_PREDICTIONS_OVERLAY_PRESENCE
Advertise for predictions overlay presence  


#### ON_QNA_SESSION_LIST
Receive list of all Q&A sessions  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_QNA_SESSION_LIST = {
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
}
```

</details>

#### ON_REWARD_REDEEM
Triggered when a channel point reward is redeemed  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_REWARD_REDEEM = {
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
	message_chunks?: {
		/**
		 * Chunk type
		 */
		type: "text"|"emote"|"cheermote"|"url"|"highlight"|"user";
		/**
		 * Possible values for each chunk types:
		 * - text: text content
		 * - emote: emote name
		 * - cheermote: cheermote name
		 * - url: url with protocol striped out
		 * - highlight: highlighted text
		 * - user: user name
		 */
		value: string;
		/**
		 * Emote or cheermote URL (low res) for "emote" and "cheermote" chunks
		 */
		emote?: string;
		/**
		 * Emote or cheermote URL (high def) for "emote" and "cheermote" chunks
		 */
		emoteHD?: string;
		/**
		 * Url of a "url" chunk
		 */
		href?: string;
		/**
		 * User login with potential "@" striped out
		 * if "@durss" is on the message, "value" will contain "@durss"
		 * but "username" will only contain "durss"
		 */
		username?: string;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk should be displayed as spoiler
		 */
		spoiler?: boolean;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk is a spoiler tag (||)
		 */
		spoilerTag?: boolean;
	}[];
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
}
```

</details>

#### ON_SUBSCRIPTION
Triggered when a subscription event occurs (new sub, resub, gift, etc.)  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_SUBSCRIPTION = {
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
	message_chunks: {
		/**
		 * Chunk type
		 */
		type: "text"|"emote"|"cheermote"|"url"|"highlight"|"user";
		/**
		 * Possible values for each chunk types:
		 * - text: text content
		 * - emote: emote name
		 * - cheermote: cheermote name
		 * - url: url with protocol striped out
		 * - highlight: highlighted text
		 * - user: user name
		 */
		value: string;
		/**
		 * Emote or cheermote URL (low res) for "emote" and "cheermote" chunks
		 */
		emote?: string;
		/**
		 * Emote or cheermote URL (high def) for "emote" and "cheermote" chunks
		 */
		emoteHD?: string;
		/**
		 * Url of a "url" chunk
		 */
		href?: string;
		/**
		 * User login with potential "@" striped out
		 * if "@durss" is on the message, "value" will contain "@durss"
		 * but "username" will only contain "durss"
		 */
		username?: string;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk should be displayed as spoiler
		 */
		spoiler?: boolean;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk is a spoiler tag (||)
		 */
		spoilerTag?: boolean;
	}[];
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
	tier: 1|2|3|"prime";
	/**
	 * Number of months the user subscribed for
	 */
	months: number;
	/**
	 * List of gift recipients (empty if not a gift)
	 */
	recipients: {
		uid: string;
		login: string;
	}[];
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
}
```

</details>

#### ON_TIMER_LIST
Receive list of all timers and countdowns  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_TIMER_LIST = {
	/**
	 * List of timers and countdowns
	 */
	timerList: {
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
		type: "timer"|"countdown";
	} & {
		/**
		 * Is the default timer/countdown
		 * These are static instances that cannot be deleted
		 * for use with the /timer and /countdown commands
		 */
		isDefault: boolean;
		/**
		 * Date in ms the timer/countdown has been started at
		 */
		startAt_ms?: number;
		/**
		 * Date in ms the countdown has ended
		 */
		endAt_ms?: number;
		/**
		 * Duration added to the timer/countdown
		 */
		offset_ms: number;
		/**
		 * Duration the countdown has been paused for
		 */
		pauseDuration_ms: number;
		/**
		 * Is timer/countdown paused
		 */
		paused: boolean;
		/**
		 * Date in ms the timer/countdown has been paused at
		 */
		pausedAt_ms?: number;
		/**
		 * Duration of the countdown in ms
		 */
		duration_ms: number;
	}[];
}
```

</details>

#### ON_TIMER_OVERLAY_PRESENCE
Advertise for timer overlay presence  


#### ON_TIMER_START
Triggered when a timer starts  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_TIMER_START = {
	id: string;
	/**
	 * Is timer/countdown enabled
	 */
	enabled: boolean;
	/**
	 * Is the default timer/countdown
	 * These are static instances that cannot be deleted
	 * for use with the /timer and /countdown commands
	 */
	isDefault: boolean;
	/**
	 * Name of the timer/countdown
	 */
	title: string;
	/**
	 * Type of entry, timer or countdown
	 */
	type: "timer"|"countdown";
	/**
	 * Timer/countdown's placeholder for trigger
	 */
	placeholderKey: string;
	/**
	 * Date in ms the timer/countdown has been started at
	 */
	startAt_ms?: number;
	/**
	 * Duration added to the timer/countdown
	 */
	offset_ms: number;
	/**
	 * Duration the countdown has been paused for
	 */
	pauseDuration_ms: number;
	/**
	 * Is timer/countdown paused
	 */
	paused: boolean;
	/**
	 * Date in ms the timer/countdown has been paused at
	 */
	pausedAt_ms?: number;
	/**
	 * Date in ms the countdown has ended
	 */
	endAt_ms?: number;
	/**
	 * Duration of the countdown in ms
	 */
	duration_ms: number;
	/**
	 * Contains overlay's params
	 */
	overlayParams: {
		/**
		 * Style of display
		 * text: legacy mode
		 * bar: new render style for countdown with a progress bar reducing
		 */
		style: "text"|"bar";
		/**
		 * Background color
		 */
		bgColor: string;
		/**
		 * Show background
		 */
		bgEnabled: boolean;
		/**
		 * Show icon
		 */
		showIcon: boolean;
		/**
		 * Text font
		 */
		textFont: string;
		/**
		 * Text size
		 */
		textSize: number;
		/**
		 * Text color
		 */
		textColor: string;
		/**
		 * Size of the progress bar
		 */
		progressSize: number;
		/**
		 * Progress style for "bar" style
		 */
		progressStyle: "fill"|"empty";
	};
}
```

</details>

#### ON_TIMER_STOP
Triggered when a timer stops  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_TIMER_STOP = {
	id: string;
	/**
	 * Is timer/countdown enabled
	 */
	enabled: boolean;
	/**
	 * Is the default timer/countdown
	 * These are static instances that cannot be deleted
	 * for use with the /timer and /countdown commands
	 */
	isDefault: boolean;
	/**
	 * Name of the timer/countdown
	 */
	title: string;
	/**
	 * Type of entry, timer or countdown
	 */
	type: "timer"|"countdown";
	/**
	 * Timer/countdown's placeholder for trigger
	 */
	placeholderKey: string;
	/**
	 * Date in ms the timer/countdown has been started at
	 */
	startAt_ms?: number;
	/**
	 * Duration added to the timer/countdown
	 */
	offset_ms: number;
	/**
	 * Duration the countdown has been paused for
	 */
	pauseDuration_ms: number;
	/**
	 * Is timer/countdown paused
	 */
	paused: boolean;
	/**
	 * Date in ms the timer/countdown has been paused at
	 */
	pausedAt_ms?: number;
	/**
	 * Date in ms the countdown has ended
	 */
	endAt_ms?: number;
	/**
	 * Duration of the countdown in ms
	 */
	duration_ms: number;
	/**
	 * Contains overlay's params
	 */
	overlayParams: {
		/**
		 * Style of display
		 * text: legacy mode
		 * bar: new render style for countdown with a progress bar reducing
		 */
		style: "text"|"bar";
		/**
		 * Background color
		 */
		bgColor: string;
		/**
		 * Show background
		 */
		bgEnabled: boolean;
		/**
		 * Show icon
		 */
		showIcon: boolean;
		/**
		 * Text font
		 */
		textFont: string;
		/**
		 * Text size
		 */
		textSize: number;
		/**
		 * Text color
		 */
		textColor: string;
		/**
		 * Size of the progress bar
		 */
		progressSize: number;
		/**
		 * Progress style for "bar" style
		 */
		progressStyle: "fill"|"empty";
	};
}
```

</details>

#### ON_TRACK_ADDED_TO_QUEUE
Triggered when a track is added to the music queue  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_TRACK_ADDED_TO_QUEUE = {
	/**
	 * Track ID
	 */
	id: string;
	/**
	 * Track title
	 */
	title: string;
	/**
	 * Track artist name
	 */
	artist: string;
	/**
	 * Track album name
	 */
	album: string;
	/**
	 * Track cover URL
	 */
	cover: string;
	/**
	 * Track duration in milliseconds
	 */
	duration: number;
	/**
	 * Track public URL
	 */
	url: string;
}
```

</details>

#### ON_TRIGGER_LIST
Receive list of all triggers  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_TRIGGER_LIST = {
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
}
```

</details>

#### ON_TWITCHAT_READY
Twitchat completed initialization and is ready.  


#### ON_VOICE_CONTROL_STATE_CHANGE
Triggered when voice control state is updated  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_VOICE_CONTROL_STATE_CHANGE = {
	/**
	 * Voice control enabled state
	 */
	enabled: boolean;
}
```

</details>

#### ON_VOICEMOD_VOICE_CHANGE
Triggered when the user changes Voicemod voice  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_VOICEMOD_VOICE_CHANGE = {
	/**
	 * Voice ID that got selected
	 */
	voiceId: string;
}
```

</details>

#### ON_WHEEL_OVERLAY_ANIMATION_COMPLETE
Triggered when wheel overlay animation completes  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_WHEEL_OVERLAY_ANIMATION_COMPLETE = {
	/**
	 * Winner info
	 */
	winner: {
		id: string;
		label: string;
	};
	/**
	 * Raffle session ID the animation is for
	 */
	sessionId: string;
	/**
	 * Delay in ms before sending a chat message about the result
	 */
	delay?: number;
}
```

</details>

#### ON_WHEEL_OVERLAY_PRESENCE
Advertise for wheel overlay presence  


#### ON_WHEEL_OVERLAY_START
Triggered when wheel overlay animation starts  
<details>
<summary>JSON parameters</summary>

```typescript
type ON_WHEEL_OVERLAY_START = {
	items: {
		id: string;
		label: string;
	}[];
	winner: string;
	sessionId: string;
	skin?: string;
}
```

</details>



# Actions you can perform
Actions you can request Twitchat to perform.

- [SET_ANIMATED_TEXT_CONTENT](#set_animated_text_content)
- [SET_AUTOMOD_ACCEPT](#set_automod_accept)
- [SET_AUTOMOD_REJECT](#set_automod_reject)
- [SET_BINGO_GRID_CONFIGS_VISIBILITY](#set_bingo_grid_configs_visibility)
- [SET_BINGO_GRID_OVERLAY_PRESENCE](#set_bingo_grid_overlay_presence)
- [SET_BINGO_TOGGLE](#set_bingo_toggle)
- [SET_CENSOR_DELETED_MESSAGES_TOGGLE](#set_censor_deleted_messages_toggle)
- [SET_CHAT_FEED_PAUSE_STATE](#set_chat_feed_pause_state)
- [SET_CHAT_FEED_READ](#set_chat_feed_read)
- [SET_CHAT_FEED_READ_ALL](#set_chat_feed_read_all)
- [SET_CHAT_FEED_SCROLL](#set_chat_feed_scroll)
- [SET_CHAT_FEED_SCROLL_BOTTOM](#set_chat_feed_scroll_bottom)
- [SET_CHAT_FEED_SELECT](#set_chat_feed_select)
- [SET_CHAT_FEED_SELECT_ACTION_BAN](#set_chat_feed_select_action_ban)
- [SET_CHAT_FEED_SELECT_ACTION_CANCEL](#set_chat_feed_select_action_cancel)
- [SET_CHAT_FEED_SELECT_ACTION_DELETE](#set_chat_feed_select_action_delete)
- [SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT](#set_chat_feed_select_action_highlight)
- [SET_CHAT_FEED_SELECT_ACTION_SAVE](#set_chat_feed_select_action_save)
- [SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT](#set_chat_feed_select_action_shoutout)
- [SET_CHAT_FEED_SELECT_CHOOSING_ACTION](#set_chat_feed_select_choosing_action)
- [SET_CHAT_HIGHLIGHT_OVERLAY_CLIP](#set_chat_highlight_overlay_clip)
- [SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE](#set_chat_highlight_overlay_message)
- [SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE](#set_chat_highlight_overlay_presence)
- [SET_CLEAR_CHAT_HIGHLIGHT](#set_clear_chat_highlight)
- [SET_COUNTDOWN_ADD](#set_countdown_add)
- [SET_COUNTER_ADD](#set_counter_add)
- [SET_EMERGENCY_MODE](#set_emergency_mode)
- [SET_ENDING_CREDITS_CONTROL](#set_ending_credits_control)
- [SET_ENDING_CREDITS_DATA](#set_ending_credits_data)
- [SET_ENDING_CREDITS_PRESENCE](#set_ending_credits_presence)
- [SET_EXECUTE_TRIGGER](#set_execute_trigger)
- [SET_GREET_FEED_READ](#set_greet_feed_read)
- [SET_GREET_FEED_READ_ALL](#set_greet_feed_read_all)
- [SET_HIDE_CHAT_ALERT](#set_hide_chat_alert)
- [SET_MERGE_TOGGLE](#set_merge_toggle)
- [SET_MOD_TOOLS_TOGGLE](#set_mod_tools_toggle)
- [SET_PLAY_SFXR](#set_play_sfxr)
- [SET_POLL_TOGGLE](#set_poll_toggle)
- [SET_PREDICTION_TOGGLE](#set_prediction_toggle)
- [SET_QNA_HIGHLIGHT](#set_qna_highlight)
- [SET_QNA_SKIP](#set_qna_skip)
- [SET_RAFFLE_PICK_WINNER](#set_raffle_pick_winner)
- [SET_RAFFLE_TOGGLE](#set_raffle_toggle)
- [SET_SEND_CUSTOM_CHAT_MESSAGE](#set_send_custom_chat_message)
- [SET_SEND_MESSAGE](#set_send_message)
- [SET_SHOUTOUT_LAST_RAIDER](#set_shoutout_last_raider)
- [SET_STOP_CURRENT_TTS_AUDIO](#set_stop_current_tts_audio)
- [SET_STOP_POLL](#set_stop_poll)
- [SET_STOP_PREDICTION](#set_stop_prediction)
- [SET_TIMER_ADD](#set_timer_add)
- [SET_TRIGGER_STATE](#set_trigger_state)
- [SET_VIEWERS_COUNT_TOGGLE](#set_viewers_count_toggle)
- [SET_VOICE_CONTROL_STATE](#set_voice_control_state)




#### SET_ANIMATED_TEXT_CONTENT
Set text content for an animated text overlay  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_ANIMATED_TEXT_CONTENT = {
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
```

</details>

#### SET_AUTOMOD_ACCEPT
Accept latest message held by automod  


#### SET_AUTOMOD_REJECT
Reject latest message held by automod  


#### SET_BINGO_GRID_CONFIGS_VISIBILITY
Set bingo grid visibility  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_BINGO_GRID_CONFIGS_VISIBILITY = {
	/**
	 * Bingo grid ID to change visibility of
	 */
	id: string;
	/**
	 * Show or hide the bingo grid
	 * Omit to toggle current visibility
	 */
	show?: boolean;
}
```

</details>

#### SET_BINGO_GRID_OVERLAY_PRESENCE
Advertise bingo grid overlay presence  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_BINGO_GRID_OVERLAY_PRESENCE = {
	/**
	 * Bingo grid ID to advertise presence of
	 */
	id: string;
}
```

</details>

#### SET_BINGO_TOGGLE
Toggle current bingo display (NOT bingo GRID!)  


#### SET_CENSOR_DELETED_MESSAGES_TOGGLE
Toggle censorship of deleted messages  


#### SET_CHAT_FEED_PAUSE_STATE
Pause auto-scrolling in a chat feed  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_PAUSE_STATE = {
	/**
	 * Column index
	 */
	colIndex: number;
	/**
	 * Force paused state
	 * Omit to toggle current state
	 */
	pause?: boolean;
}
```

</details>

#### SET_CHAT_FEED_READ
Move read marker in chat feed  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_READ = {
	/**
	 * Number of messages to read
	 */
	count: number;
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_FEED_READ_ALL
Mark all messages as read in a chat feed  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_READ_ALL = {
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_FEED_SCROLL
Scroll a chat feed by a specific amount  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SCROLL = {
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
	mode: "messages"|"pixels";
}
```

</details>

#### SET_CHAT_FEED_SCROLL_BOTTOM
Scroll a chat feed to the bottom  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SCROLL_BOTTOM = {
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_FEED_SELECT
Move message selection in a chat feed  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SELECT = {
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
}
```

</details>

#### SET_CHAT_FEED_SELECT_ACTION_BAN
Ban the user of the currently selected message in a chat feed
First select a message with SET_CHAT_FEED_SELECT  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SELECT_ACTION_BAN = {
	/**
	 * Column index
	 */
	colIndex: number;
	/**
	 * Optional ban duration in seconds.
	 * If not set, a permanent ban is done
	 */
	duration?: number;
}
```

</details>

#### SET_CHAT_FEED_SELECT_ACTION_CANCEL
Cancel the action selection for the currently selected message in a chat feed  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SELECT_ACTION_CANCEL = {
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_FEED_SELECT_ACTION_DELETE
Delete the currently selected message in a chat feed
First select a message with SET_CHAT_FEED_SELECT  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SELECT_ACTION_DELETE = {
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT
Highlight the currently selected message in a chat feed
First select a message with SET_CHAT_FEED_SELECT  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT = {
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_FEED_SELECT_ACTION_SAVE
Save the currently selected message in a chat feed
First select a message with SET_CHAT_FEED_SELECT  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SELECT_ACTION_SAVE = {
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT
Shoutout the user of the currently selected message in a chat feed
First select a message with SET_CHAT_FEED_SELECT  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT = {
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_FEED_SELECT_CHOOSING_ACTION
Open action chooser for the currently selected message in a chat feed
First select a message with SET_CHAT_FEED_SELECT  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_FEED_SELECT_CHOOSING_ACTION = {
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

#### SET_CHAT_HIGHLIGHT_OVERLAY_CLIP
Send a clip to the chat highlight overlay  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_HIGHLIGHT_OVERLAY_CLIP = {
	date?: number;
	message?: string;
	user?: {
		id: string;
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
		login: string;
		/**
		 * Get the display name of the user.
		 * Returns eith the actual twitch display name, or the custom one defined
		 * on twitchat.
		 */
		displayName: string;
		/**
		 * Original twitch display name of the user
		 */
		displayNameOriginal: string;
		/**
		 * URL of the avatar
		 */
		avatarPath?: string;
		/**
		 * Account createion date
		 */
		created_at_ms?: number;
		/**
		 * Nickname chat color
		 */
		color?: string;
		/**
		 * Is a twitch partner?
		 */
		is_partner: boolean;
		/**
		 * Is a twitch affiliate?
		 */
		is_affiliate: boolean;
		/**
		 * Should this user's messages be highlighted?
		 */
		is_tracked: boolean;
		/**
		 * Is this a known bot account?
		 */
		is_bot: boolean;
		/**
		 * Is the user blocked by me?
		 */
		is_blocked: boolean;
		/**
		 * When a user is blocked, their messages are censored until we click
		 * on of them in which case messages stop being censored until next
		 * app start.
		 * This flag is here for this, stopping censor to ignore "is_blocked" state
		 */
		stop_block_censor?: boolean;
		/**
		 * Is a Twitchat admin?
		 */
		is_admin?: boolean;
		/**
		 * undefined=no loaded yet; false=no pronouns found; string=pronouns code
		 */
		pronouns: null|string|false;
		/**
		 * Pronouns label
		 */
		pronounsLabel: string|false;
		/**
		 * Pronouns tooltip
		 */
		pronounsTooltip: string|false;
		/**
		 * Contains one entry per connected channel with
		 * channel specific info.
		 */
		channelInfo: {
			[key: string]: {
				/**
				 * true if user is connected on the channel's chat
				 */
				online: boolean;
				/**
				 * true if user talked for the first time ever on our chat during this session
				 */
				is_new: boolean;
				/**
				 * true if user raided us
				 * Stays to "true" for the specified amount of duration on the parameters
				 * then switched back to false
				 */
				is_raider: boolean;
				/**
				 * Defines if user is a follower of the channel
				 * null = don't know yet
				 * true = is a follower
				 * false = is not a follower
				 */
				is_following: null|false|true;
				/**
				 * true if user is banned on the channel
				 */
				is_banned: boolean;
				/**
				 * true if user is a VIP of the channel
				 */
				is_vip: boolean;
				/**
				 * true if user is a moderator of the channel
				 */
				is_moderator: boolean;
				/**
				 * true if user is the broadcaster of the channel
				 */
				is_broadcaster: boolean;
				/**
				 * true if user is subscribed to the channel
				 */
				is_subscriber?: boolean;
				/**
				 * true if user has gifted subs on the channel
				 */
				is_gifter: boolean;
				/**
				 * Date at which the user followed the channel
				 * Value = 0 if not checked yet, -1 not following
				 */
				following_date_ms: number;
				/**
				 * User badges for this channel
				 */
				badges: {
					icon: {
						sd: string;
						hd?: string;
					};
					id: "predictions"|"subscriber"|"vip"|"premium"|"moderator"|"lead_moderator"|"staff"|"broadcaster"|"partner"|"founder"|"ambassador";
					title?: string;
					version?: string;
				}[];
				/**
				 * Date at which the ban expires on this channel
				 */
				banEndDate?: number;
				/**
				 * Contains the ban reason
				 */
				banReason?: string;
				/**
				 * Last date the user interracted on this channel
				 */
				lastActivityDate?: number;
				/**
				 * Number of subgifts the user made on this channel
				 * Only available after making a subgift
				 */
				totalSubgifts?: number;
				/**
				 * Store the date at which this user last got a shoutout
				 */
				lastShoutout?: number;
				/**
				 * Defines if the user should be moded back after their timeout completes
				 */
				autoRemod?: boolean;
				/**
				 * Is the user restricted in the channel?
				 */
				is_restricted?: boolean;
				/**
				 * Is the user suspicious in the channel?
				 */
				is_suspicious?: boolean;
			};
		};
		/**
		 * true when the details are loading
		 */
		temporary?: boolean;
		/**
		 * true if user data loading failed
		 */
		errored?: boolean;
		/**
		 * true if data respresents an anonymous user.
		 * For exemple an anonymous Heat user
		 */
		anonymous?: boolean;
		/**
		 * If set to true, this user's messages won't be automatically set
		 * as spoiler if the related option is enabled on the spoiler section
		 */
		noAutospoil?: boolean;
	};
	clip?: {
		duration: number;
		url: string;
		mp4?: string;
	};
	params: {
		position: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	};
	dateLabel: string;
	message_id: string;
	skin?: string;
}
```

</details>

#### SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE
Send a message to the chat highlight overlay  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE = {
	date?: number;
	message?: string;
	user?: {
		id: string;
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
		login: string;
		/**
		 * Get the display name of the user.
		 * Returns eith the actual twitch display name, or the custom one defined
		 * on twitchat.
		 */
		displayName: string;
		/**
		 * Original twitch display name of the user
		 */
		displayNameOriginal: string;
		/**
		 * URL of the avatar
		 */
		avatarPath?: string;
		/**
		 * Account createion date
		 */
		created_at_ms?: number;
		/**
		 * Nickname chat color
		 */
		color?: string;
		/**
		 * Is a twitch partner?
		 */
		is_partner: boolean;
		/**
		 * Is a twitch affiliate?
		 */
		is_affiliate: boolean;
		/**
		 * Should this user's messages be highlighted?
		 */
		is_tracked: boolean;
		/**
		 * Is this a known bot account?
		 */
		is_bot: boolean;
		/**
		 * Is the user blocked by me?
		 */
		is_blocked: boolean;
		/**
		 * When a user is blocked, their messages are censored until we click
		 * on of them in which case messages stop being censored until next
		 * app start.
		 * This flag is here for this, stopping censor to ignore "is_blocked" state
		 */
		stop_block_censor?: boolean;
		/**
		 * Is a Twitchat admin?
		 */
		is_admin?: boolean;
		/**
		 * undefined=no loaded yet; false=no pronouns found; string=pronouns code
		 */
		pronouns: null|string|false;
		/**
		 * Pronouns label
		 */
		pronounsLabel: string|false;
		/**
		 * Pronouns tooltip
		 */
		pronounsTooltip: string|false;
		/**
		 * Contains one entry per connected channel with
		 * channel specific info.
		 */
		channelInfo: {
			[key: string]: {
				/**
				 * true if user is connected on the channel's chat
				 */
				online: boolean;
				/**
				 * true if user talked for the first time ever on our chat during this session
				 */
				is_new: boolean;
				/**
				 * true if user raided us
				 * Stays to "true" for the specified amount of duration on the parameters
				 * then switched back to false
				 */
				is_raider: boolean;
				/**
				 * Defines if user is a follower of the channel
				 * null = don't know yet
				 * true = is a follower
				 * false = is not a follower
				 */
				is_following: null|false|true;
				/**
				 * true if user is banned on the channel
				 */
				is_banned: boolean;
				/**
				 * true if user is a VIP of the channel
				 */
				is_vip: boolean;
				/**
				 * true if user is a moderator of the channel
				 */
				is_moderator: boolean;
				/**
				 * true if user is the broadcaster of the channel
				 */
				is_broadcaster: boolean;
				/**
				 * true if user is subscribed to the channel
				 */
				is_subscriber?: boolean;
				/**
				 * true if user has gifted subs on the channel
				 */
				is_gifter: boolean;
				/**
				 * Date at which the user followed the channel
				 * Value = 0 if not checked yet, -1 not following
				 */
				following_date_ms: number;
				/**
				 * User badges for this channel
				 */
				badges: {
					icon: {
						sd: string;
						hd?: string;
					};
					id: "predictions"|"subscriber"|"vip"|"premium"|"moderator"|"lead_moderator"|"staff"|"broadcaster"|"partner"|"founder"|"ambassador";
					title?: string;
					version?: string;
				}[];
				/**
				 * Date at which the ban expires on this channel
				 */
				banEndDate?: number;
				/**
				 * Contains the ban reason
				 */
				banReason?: string;
				/**
				 * Last date the user interracted on this channel
				 */
				lastActivityDate?: number;
				/**
				 * Number of subgifts the user made on this channel
				 * Only available after making a subgift
				 */
				totalSubgifts?: number;
				/**
				 * Store the date at which this user last got a shoutout
				 */
				lastShoutout?: number;
				/**
				 * Defines if the user should be moded back after their timeout completes
				 */
				autoRemod?: boolean;
				/**
				 * Is the user restricted in the channel?
				 */
				is_restricted?: boolean;
				/**
				 * Is the user suspicious in the channel?
				 */
				is_suspicious?: boolean;
			};
		};
		/**
		 * true when the details are loading
		 */
		temporary?: boolean;
		/**
		 * true if user data loading failed
		 */
		errored?: boolean;
		/**
		 * true if data respresents an anonymous user.
		 * For exemple an anonymous Heat user
		 */
		anonymous?: boolean;
		/**
		 * If set to true, this user's messages won't be automatically set
		 * as spoiler if the related option is enabled on the spoiler section
		 */
		noAutospoil?: boolean;
	};
	clip?: {
		duration: number;
		url: string;
		mp4?: string;
	};
	params: {
		position: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	};
	dateLabel: string;
	message_id: string;
	skin?: string;
}
```

</details>

#### SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE
Advertise for highlight overlay presence  


#### SET_CLEAR_CHAT_HIGHLIGHT
Clear any current message or clip displayed in chat highlight overlay  


#### SET_COUNTDOWN_ADD
Add time to a countdown  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_COUNTDOWN_ADD = {
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
}
```

</details>

#### SET_COUNTER_ADD
Add a value to a counter  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_COUNTER_ADD = {
	/**
	 * Counter ID to add value to
	 */
	id: string;
	/**
	 * Action to perform
	 */
	action: "ADD"|"DEL"|"SET";
	/**
	 * Value to add to the counter.
	 * Typed as string cause it can be an arithmetic expression or
	 * it can contain placeholders
	 */
	value: string;
}
```

</details>

#### SET_EMERGENCY_MODE
Enable/disable/toggle emergency mode
Either give an object with "enabled" boolean to force a specific
state, or don't give any parameter to toggle current state  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_EMERGENCY_MODE = {
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
```

</details>

#### SET_ENDING_CREDITS_CONTROL
Control ending credits playback  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_ENDING_CREDITS_CONTROL = {
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
}
```

</details>

#### SET_ENDING_CREDITS_DATA
Response with ending credits data  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_ENDING_CREDITS_DATA = {
	/**
	 * Stream duration in seconds
	 */
	streamDuration: number;
	/**
	 * Slots that should show premium warning
	 * Only set when testing fake credits to let the user know these sections
	 * won't be shown in actual ending credits because they're not premium
	 */
	premiumWarningSlots?: {
		[key: string]: boolean;
	};
	/**
	 * Ending credits parameters
	 */
	params?: {
		/**
		 * Scale at which to render the credits
		 */
		scale: number;
		/**
		 * Padding around the categories (in pixels)
		 */
		padding: number;
		/**
		 * Padding bellow the title (in pixels)
		 */
		paddingTitle: number;
		/**
		 * Should title stick to the top when scrolling ?
		 */
		stickyTitle: boolean;
		/**
		 * Title color
		 */
		colorTitle: string;
		/**
		 * Color of the categories entries
		 */
		colorEntry: string;
		/**
		 * Font for the title
		 */
		fontTitle: string;
		/**
		 * Font for the entries
		 */
		fontEntry: string;
		/**
		 * Should bots be ignored ?
		 */
		ignoreBots: boolean;
		/**
		 * List of user names to ignore
		 */
		ignoreCustomBots: string[];
		/**
		 * Strength of the text shadow
		 */
		textShadow: number;
		/**
		 * Should the entries scroll at a specific speed or over a specific duration ?
		 */
		timing: "speed"|"duration";
		/**
		 * Duration of the credits scroll (in seconds)
		 */
		duration: number;
		/**
		 * Delay before starting the credits (in seconds)
		 */
		startDelay: number;
		/**
		 * Should credits loop after ending ?
		 */
		loop: boolean;
		/**
		 * Show icons on categories titles ?
		 */
		showIcons: boolean;
		/**
		 * Show power up emotes in the background ?
		 */
		powerUpEmotes: boolean;
		/**
		 * Speed of the credits scroll (in pixels per second)
		 */
		speed: number;
		/**
		 * Size of the fade at the top and bottom of the credits (in pixels)
		 */
		fadeSize: number;
		/**
		 * Slots to show in the ending credits
		 */
		slots: {
			/**
			 * Section ID
			 */
			id: string;
			/**
			 * Type of slot to show
			 */
			slotType: "text"|"bans"|"mods"|"subs"|"vips"|"raids"|"polls"|"so_in"|"so_out"|"cheers"|"follows"|"rewards"|"chatters"|"timeouts"|"hypechats"|"hypetrains"|"predictions"|"tips"|"shoutouts"|"merch"|"patreonMembers"|"powerups"|"ytSuperchat"|"ytSuperSticker"|"tiktokLikes"|"tiktokShares"|"tiktokGifts";
			/**
			 * Title for this slot
			 */
			label: string;
			/**
			 * Maximum entries that section should show
			 */
			maxEntries: number;
			/**
			 * Is the slot enabled ?
			 */
			enabled: boolean;
			/**
			 * Layout of the entries
			 */
			layout: "colLeft"|"col"|"colRight"|"left"|"center"|"right"|"2cols"|"3cols";
			/**
			 * Show entries amounts if any ?
			 */
			showAmounts?: boolean;
			/**
			 * Show sub months duration for subs slot ?
			 */
			showSubMonths?: boolean;
			/**
			 * Show mod/sub/vip badges next to chatters names ?
			 */
			showBadges?: boolean;
			/**
			 * Show moderators on chatters slot ?
			 */
			showMods?: boolean;
			/**
			 * Show VIPs on chatters slot ?
			 */
			showVIPs?: boolean;
			/**
			 * Show subscribers on sub slot ?
			 */
			showSubs?: boolean;
			/**
			 * Show resubs on subs slot ?
			 */
			showResubs?: boolean;
			/**
			 * Show subgifts on subs slot ?
			 */
			showSubgifts?: boolean;
			/**
			 * Show prime subs on subs slot ?
			 */
			showSubsPrime?: boolean;
			/**
			 * Show tier 1 subs on subs slot ?
			 */
			showSubsT1?: boolean;
			/**
			 * Show tier 2 subs on subs slot ?
			 */
			showSubsT2?: boolean;
			/**
			 * Show tier 3 subs on subs slot ?
			 */
			showSubsT3?: boolean;
			/**
			 * Show all subs/subgifters on subs slot ?
			 * Otherwise it only show subs that occured during the stream
			 */
			showAllSubs?: boolean;
			/**
			 * Show all subgifters on subs slot ?
			 * Otherwise it only show subgifters that occured during the stream
			 */
			showAllSubgifters?: boolean;
			/**
			 * Show subs from Youtube ?
			 */
			showSubsYoutube?: boolean;
			/**
			 * Show subs from TikTok ?
			 */
			showSubsTiktok?: boolean;
			/**
			 * Show subgifts from Youtube ?
			 */
			showSubgiftsYoutube?: boolean;
			/**
			 * Show tips from Kofi on tips slot ?
			 */
			showTipsKofi?: boolean;
			/**
			 * Show subs from Kofi on tips slot ?
			 */
			showSubsKofi?: boolean;
			/**
			 * Show tips from Tipeee on tips slot ?
			 */
			showTipsTipeee?: boolean;
			/**
			 * Show tips from Patreon on tips slot ?
			 */
			showTipsPatreon?: boolean;
			/**
			 * Show tips from Streamlabs on tips slot ?
			 */
			showTipsStreamlabs?: boolean;
			/**
			 * Show tips from Streamelements on tips slot ?
			 */
			showTipsStreamelements?: boolean;
			/**
			 * Show merch from Kofi on merch slot ?
			 */
			showMerchKofi?: boolean;
			/**
			 * Show merch from Streamlabs on merch slot ?
			 */
			showMerchStreamlabs?: boolean;
			/**
			 * Sort entries by names ?
			 */
			sortByNames?: boolean;
			/**
			 * Sort entries by roles ?
			 */
			sortByRoles?: boolean;
			/**
			 * Sort entries by amounts ?
			 */
			sortByAmounts?: boolean;
			/**
			 * Sort entries by amounts (if any) ?
			 */
			sortByTotalAmounts?: boolean;
			/**
			 * Sort entries by sub types ?
			 */
			sortBySubTypes?: boolean;
			/**
			 * Show all chatters for chatters slot ?
			 */
			showChatters?: boolean;
			/**
			 * Show train conductors for hypetrain slot ?
			 */
			showTrainConductors?: boolean;
			/**
			 * Show power up skin events ?
			 */
			showPuSkin?: boolean;
			/**
			 * Show power up gigantified emote events ?
			 */
			showPuEmote?: boolean;
			/**
			 * Show power up celebration events ?
			 */
			showPuCeleb?: boolean;
			/**
			 * Show total amounts for entries that have amounts ?
			 * ex: membership duration for Patreon members
			 */
			showTotalAmounts?: boolean;
			/**
			 * Show unique users only ?
			 * Multiple entries from the same user will be merged
			 */
			uniqueUsers?: boolean;
			/**
			 * Text content for text slot
			 */
			text?: string;
			/**
			 * Currency to use for amounts display
			 * ex: for Patreon total amount given
			 */
			currency?: string;
			/**
			 * Show user list tha tredeemed a reward ?
			 */
			showRewardUsers?: boolean;
			/**
			 * Show normal cheers ? (not pinned)
			 */
			showNormalCheers?: boolean;
			/**
			 * Show pinned cheers ?
			 */
			showPinnedCheers?: boolean;
			/**
			 * Anonymise last names of users ?
			 * ex: for patreon members show "john D." instead of "john Doe"
			 */
			anonLastNames?: boolean;
			/**
			 * Filter patreon tiers to show
			 */
			patreonTiers?: string[];
			/**
			 * Should we filter channel point reward redeems ?
			 */
			filterRewards?: boolean;
			/**
			 * Reward IDs to show if filterRewards is true
			 */
			rewardIds?: string[];
			showPremiumWarning?: boolean;
		}[];
		/**
		 * Hide slots that have no entry
		 */
		hideEmptySlots?: boolean;
	};
	/**
	 * Following events
	 */
	follows: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
	}[];
	/**
	 * Raid events
	 */
	raids: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * Raider's name
		 */
		login: string;
		/**
		 * Raiders count
		 */
		raiders: number;
	}[];
	/**
	 * Subscription events
	 */
	subs: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Subscription tier
		 */
		tier: 1|2|3|"prime";
		/**
		 * Subscription duration in months
		 */
		subDuration?: number;
		/**
		 * Is sub info from currently active subscribers ?
		 * Otherwise it's from new subs that happened during the stream
		 */
		fromActiveSubs?: true;
		/**
		 * Chat platform of the subscription
		 */
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
	}[];
	/**
	 * Resubscription events
	 */
	resubs: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Subscription tier
		 */
		tier: 1|2|3|"prime";
		/**
		 * Subscription duration in months
		 */
		subDuration?: number;
		/**
		 * Is sub info from currently active subscribers ?
		 * Otherwise it's from new subs that happened during the stream
		 */
		fromActiveSubs?: true;
		/**
		 * Chat platform of the subscription
		 */
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
	}[];
	/**
	 * Subgift events
	 */
	subgifts: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Subscription tier
		 */
		tier: 1|2|3|"prime";
		/**
		 * Number of subgifts
		 */
		total: number;
		/**
		 * Is subgift info from currently active subscribers ?
		 */
		fromActiveSubs?: true;
		/**
		 * Chat platform of the subscription
		 */
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
	}[];
	/**
	 * Bits events
	 */
	bits: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Number of bits
		 */
		bits: number;
		/**
		 * Is pinned cheer ?
		 */
		pinned: boolean;
	}[];
	/**
	 * Hype chat events
	 */
	hypeChats: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Amount paid
		 */
		amount: number;
		/**
		 * Currency used
		 */
		currency: string;
	}[];
	/**
	 * Reward redemption events
	 */
	rewards: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Channel point reward info
		 */
		reward: {
			/**
			 * Reward name
			 */
			name: string;
			/**
			 * Reward ID
			 */
			id: string;
			/**
			 * Reward icon URL
			 */
			icon: string;
		};
	}[];
	/**
	 * Shoutout events
	 */
	shoutouts: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Was the shoutout received or given ?
		 */
		received: boolean;
		/**
		 * Viewers count when the shoutout happened
		 */
		viewers: number;
	}[];
	/**
	 * Hype train events
	 */
	hypeTrains: {
		/**
		 * Hype train level reached
		 */
		level: number;
		/**
		 * Percent of the level completed
		 */
		percent: number;
		/**
		 * Bits conductor info
		 */
		conductorBits?: {
			/**
			 * User ID
			 */
			uid: string;
			/**
			 * User name
			 */
			login: string;
			/**
			 * Number of bits given
			 */
			bits: number;
		};
		/**
		 * Sub conductor info
		 */
		conductorSubs?: {
			/**
			 * User ID
			 */
			uid: string;
			/**
			 * User name
			 */
			login: string;
			/**
			 * Number of subs given
			 */
			subs: number;
		};
	}[];
	/**
	 * Poll events
	 */
	polls: {
		/**
		 * Poll title
		 */
		title: string;
		/**
		 * Total votes count
		 */
		votes: number;
		/**
		 * Poll choices
		 */
		choices: {
			/**
			 * Choice title
			 */
			title: string;
			/**
			 * Number of votes for this choice
			 */
			votes: number;
			/**
			 * Is this choice the winning one ?
			 */
			win: boolean;
		}[];
	}[];
	/**
	 * Chat poll events
	 */
	predictions: {
		/**
		 * Prediction title
		 */
		title: string;
		/**
		 * Total points used to vote
		 */
		points: number;
		/**
		 * Prediction outcomes
		 */
		outcomes: {
			/**
			 * Outcome title
			 */
			title: string;
			/**
			 * Number of points used to vote for this outcome
			 */
			points: number;
			/**
			 * Number of voters for this outcome
			 */
			voters: number;
			/**
			 * Is this outcome the winning one ?
			 */
			win: boolean;
		}[];
	}[];
	/**
	 * Chatters info
	 */
	chatters: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Number of messages sent
		 */
		count: number;
		/**
		 * Is user a VIP ?
		 */
		vip: boolean;
		/**
		 * Is user a moderator ?
		 */
		mod: boolean;
		/**
		 * Is user a subscriber ?
		 */
		sub: boolean;
		/**
		 * Number of timeouts
		 */
		bans: number;
		/**
		 * Number of times this user has been timedout
		 */
		tos: number;
		/**
		 * Total duration this user has been timedout for (in seconds)
		 */
		tosDuration: number;
	}[];
	/**
	 * Tip events
	 */
	tips: {
		/**
		 * User ID
		 */
		login: string;
		/**
		 * Tip amount
		 */
		amount: number;
		/**
		 * Currency used for the tip
		 */
		currency: string;
		/**
		 * Platform the tip was made on
		 */
		platform: "kofi"|"streamlabs"|"streamelements"|"tipeee"|"patreon";
	}[];
	/**
	 * Merch events
	 */
	merch: {
		/**
		 * User ID
		 */
		login: string;
		/**
		 * List of products bought
		 */
		products: string[];
		/**
		 * Total amount spent
		 */
		total: number;
		/**
		 * Currency used for the merch purchase
		 */
		currency: string;
		/**
		 * Platform the merch was bought on
		 */
		platform: "kofi"|"streamlabs";
	}[];
	/**
	 * Powerup events
	 */
	powerups: {
		/**
		 * User ID
		 */
		login: string;
		/**
		 * Skind ID for "animation" type
		 */
		skinID?: undefined|"simmer"|"rainbow-eclipse"|"cosmic-abyss";
		/**
		 * Emote URL for "gigantifiedemote" type
		 */
		emoteUrl?: string;
		/**
		 * Type of powerup
		 */
		type: "animation"|"gigantifiedemote"|"celebration";
	}[];
	/**
	 * Super chat events
	 */
	superChats: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Amount paid for the super chat
		 */
		amount: number;
		/**
		 * Currency used for the super chat
		 */
		currency: string;
	}[];
	/**
	 * Super stickers events
	 */
	superStickers: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Amount paid for the super sticker
		 */
		amount: number;
		/**
		 * Currency used for the super sticker
		 */
		currency: string;
		/**
		 * Sticker URL
		 */
		stickerUrl: string;
	}[];
	/**
	 * Tiktok gifts events
	 */
	tiktokGifts: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Number of gifts offered
		 */
		count: number;
		/**
		 * Amount paid for the gifts
		 */
		amount: number;
		/**
		 * Image URL of the gift
		 */
		imageUrl: string;
	}[];
	/**
	 * Tiktok likes events
	 */
	tiktokLikes: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Number of likes
		 */
		count: number;
	}[];
	/**
	 * Tiktok shares events
	 */
	tiktokShares: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Number of shares
		 */
		count: number;
	}[];
	/**
	 * Patreon members events
	 */
	patreonMembers: {
		/**
		 * User ID
		 */
		uid: string;
		/**
		 * User name
		 */
		login: string;
		/**
		 * Membership duration in months
		 */
		months: number;
		/**
		 * Membership tier name
		 */
		tier: string;
		/**
		 * Lifetime amount paid
		 */
		lifetimeAmount: number;
	}[];
	/**
	 * i18n labels for the ending credits
	 */
	labels: {
		no_entry: string;
		train: string;
		premium_only: string;
		sub_duration: string;
	};
}
```

</details>

#### SET_ENDING_CREDITS_PRESENCE
Response with current ending credits overlay presence  


#### SET_EXECUTE_TRIGGER
Execute a specific trigger manually  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_EXECUTE_TRIGGER = {
	/**
	 * Trigger ID to execute
	 */
	id: string;
}
```

</details>

#### SET_GREET_FEED_READ
Mark messages as read in the greet them feed  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_GREET_FEED_READ = {
	/**
	 * Number of messages to mark as read
	 */
	messageCount: number;
}
```

</details>

#### SET_GREET_FEED_READ_ALL
Clears the greet them feed  


#### SET_HIDE_CHAT_ALERT
Hide current chat alert
See settings => chat features => Enable chat alert  


#### SET_MERGE_TOGGLE
Toggle merge feature
See settings => chat features => Merge consecutive messages of a user  


#### SET_MOD_TOOLS_TOGGLE
Toggle moderation tools display  


#### SET_PLAY_SFXR
Play an SFXR sound  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_PLAY_SFXR = {
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
}
```

</details>

#### SET_POLL_TOGGLE
Toggle current poll display  


#### SET_PREDICTION_TOGGLE
Toggle current prediction display  


#### SET_QNA_HIGHLIGHT
Highlights the top most message of given Q&A session  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_QNA_HIGHLIGHT = {
	/**
	 * Q&A session ID
	 */
	id: string;
}
```

</details>

#### SET_QNA_SKIP
Skips the top most message of given Q&A session  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_QNA_SKIP = {
	/**
	 * Q&A session ID
	 */
	id: string;
}
```

</details>

#### SET_RAFFLE_PICK_WINNER
Pick a winner for the first active raffle.
If multiple raffles are active, only the first one started will be considered.  


#### SET_RAFFLE_TOGGLE
Toggle current raffle display  


#### SET_SEND_CUSTOM_CHAT_MESSAGE
Send a custom message to the chat feed with optional styling and actions  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_SEND_CUSTOM_CHAT_MESSAGE = {
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
	icon?: undefined|"number"|"prime"|"twitchat"|"twitch"|"youtube"|"tiktok"|"kofi"|"patreon"|"vip"|"premium"|"broadcaster"|"partner"|"rotate"|"poll"|"prediction"|"timer"|"countdown"|"emote"|"url"|"highlight"|"user"|"date"|"voicemod"|"music"|"placeholder"|"ad"|"add"|"alert"|"animate"|"announcement"|"anon"|"api"|"automod"|"badge"|"ban"|"bingo"|"bits"|"block"|"boost"|"bot"|"broadcast"|"change"|"channelPoints"|"chatCommand"|"chatPoll"|"checkmark"|"clearChat"|"click"|"clip"|"coffee"|"coin"|"color"|"commands"|"conversation"|"copy"|"count"|"credits"|"cross"|"debug"|"delete"|"dice"|"discord"|"donor"|"download"|"dragZone"|"easing"|"edit"|"elevated"|"elgato"|"emergency"|"enter"|"filters"|"firstTime"|"fix"|"follow"|"follow_outline"|"font"|"fontSize"|"fullscreen"|"gift"|"github"|"goxlr"|"goxlr_bleep"|"goxlr_fx"|"hand"|"heat"|"help"|"hide"|"history"|"hypeChat"|"idea"|"info"|"internet"|"leave"|"list"|"live"|"loader"|"lock"|"loop"|"magnet"|"markRead"|"max"|"merge"|"microphone"|"microphone_mute"|"microphone_recording"|"min"|"minus"|"mod"|"move"|"mute"|"newtab"|"next"|"noMusic"|"notification"|"obs"|"offline"|"online"|"orderable"|"overlay"|"params"|"pause"|"paypal"|"pin"|"pipette"|"play"|"polygon"|"presentation"|"press"|"prev"|"pros"|"qna"|"raid"|"read"|"refresh"|"reply"|"returning"|"reward_highlight"|"rightClick"|"save"|"scale"|"scroll"|"scrollDown"|"scrollUp"|"search"|"shadow"|"shield"|"shieldMode"|"shoutout"|"show"|"skip"|"slow"|"spotify"|"stars"|"stop"|"sub"|"test"|"thickness"|"ticket"|"timeout"|"train"|"train_boost"|"translate"|"trash"|"tts"|"twitter"|"ulule"|"unban"|"unblock"|"unfollow"|"unlock"|"unmod"|"unmute"|"unpin"|"unvip"|"update"|"upload"|"vibrate"|"voice"|"volume"|"watchStreak"|"whispers";
	/**
	 * Color of the message for "highlight" style
	 */
	highlightColor?: string;
	/**
	 * Message style
	 */
	style?: undefined|"highlight"|"message"|"error";
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
		actionType?: undefined|"trigger"|"url"|"discord"|"message";
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
		theme?: undefined|"default"|"alert"|"primary"|"secondary";
	}[];
}
```

</details>

#### SET_SEND_MESSAGE
Send a message to chat  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_SEND_MESSAGE = {
	/**
	 * Message content to send
	 */
	message: string;
}
```

</details>

#### SET_SHOUTOUT_LAST_RAIDER
Shoutout the user that raided the channel the most recently  


#### SET_STOP_CURRENT_TTS_AUDIO
Stop any current text-to-speech audio playback  


#### SET_STOP_POLL
Stop any Twitch poll currently running  


#### SET_STOP_PREDICTION
Stop any Twitch prediction currently running  


#### SET_TIMER_ADD
Add time to a timer  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_TIMER_ADD = {
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
}
```

</details>

#### SET_TRIGGER_STATE
Enable or disable a specific trigger  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_TRIGGER_STATE = {
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
}
```

</details>

#### SET_VIEWERS_COUNT_TOGGLE
Toggle viewers count display  


#### SET_VOICE_CONTROL_STATE
Set voice bot enabled/disabled state  
<details>
<summary>JSON parameters</summary>

```typescript
type SET_VOICE_CONTROL_STATE = {
	/**
	 * Enable or disable voice control
	 * Omit to toggle current state
	 */
	enabled?: boolean;
}
```

</details>



# Requesting data
Data you can request from Twitchat.

- [GET_AD_BREAK_OVERLAY_CONFIGS](#get_ad_break_overlay_configs)
- [GET_AD_BREAK_OVERLAY_PRESENCE](#get_ad_break_overlay_presence)
- [GET_ALL_COUNTERS](#get_all_counters)
- [GET_ANIMATED_TEXT_CONFIGS](#get_animated_text_configs)
- [GET_BINGO_GRID_CONFIGS](#get_bingo_grid_configs)
- [GET_BITSWALL_OVERLAY_CONFIGS](#get_bitswall_overlay_configs)
- [GET_BITSWALL_OVERLAY_PRESENCE](#get_bitswall_overlay_presence)
- [GET_CHAT_COLUMNS_COUNT](#get_chat_columns_count)
- [GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE](#get_chat_highlight_overlay_presence)
- [GET_CHAT_POLL_OVERLAY_CONFIGS](#get_chat_poll_overlay_configs)
- [GET_CHAT_POLL_OVERLAY_PRESENCE](#get_chat_poll_overlay_presence)
- [GET_COUNTER](#get_counter)
- [GET_CURRENT_TRACK](#get_current_track)
- [GET_CUSTOM_TRAIN_DATA](#get_custom_train_data)
- [GET_DISTORT_OVERLAY_CONFIGS](#get_distort_overlay_configs)
- [GET_DONATION_GOALS_OVERLAY_CONFIGS](#get_donation_goals_overlay_configs)
- [GET_ENDING_CREDITS_DATA](#get_ending_credits_data)
- [GET_ENDING_CREDITS_PRESENCE](#get_ending_credits_presence)
- [GET_GLOBAL_STATES](#get_global_states)
- [GET_LABEL_OVERLAY_CONFIGS](#get_label_overlay_configs)
- [GET_LABEL_OVERLAY_PLACEHOLDERS](#get_label_overlay_placeholders)
- [GET_POLLS_OVERLAY_CONFIGS](#get_polls_overlay_configs)
- [GET_POLLS_OVERLAY_PRESENCE](#get_polls_overlay_presence)
- [GET_PREDICTIONS_OVERLAY_CONFIGS](#get_predictions_overlay_configs)
- [GET_PREDICTIONS_OVERLAY_PRESENCE](#get_predictions_overlay_presence)
- [GET_QNA_SESSION_LIST](#get_qna_session_list)
- [GET_TIMER](#get_timer)
- [GET_TIMER_LIST](#get_timer_list)
- [GET_TIMER_OVERLAY_PRESENCE](#get_timer_overlay_presence)
- [GET_TRIGGER_LIST](#get_trigger_list)
- [GET_WHEEL_OVERLAY_PRESENCE](#get_wheel_overlay_presence)




#### GET_AD_BREAK_OVERLAY_CONFIGS
Request ad break overlay configuration  
Receive answer with: [ON_AD_BREAK_OVERLAY_CONFIGS](#on_ad_break_overlay_configs)  


#### GET_AD_BREAK_OVERLAY_PRESENCE
Request ad break overlay presence  
Receive answer with: [ON_AD_BREAK_OVERLAY_PRESENCE](#on_ad_break_overlay_presence)  


#### GET_ALL_COUNTERS
Request list of all counters  
Receive answer with: [ON_COUNTER_LIST](#on_counter_list)  


#### GET_ANIMATED_TEXT_CONFIGS
Request animated text overlay configuration  
Receive answer with: [ON_ANIMATED_TEXT_CONFIGS](#on_animated_text_configs)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_ANIMATED_TEXT_CONFIGS = {
	/**
	 * Animated text overlay ID
	 */
	id: string;
}
```

</details>

#### GET_BINGO_GRID_CONFIGS
Request bingo grid configuration  
Receive answer with: [ON_BINGO_GRID_CONFIGS](#on_bingo_grid_configs)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_BINGO_GRID_CONFIGS = {
	/**
	 * Bingo grid ID to get parameters for
	 */
	id: string;
}
```

</details>

#### GET_BITSWALL_OVERLAY_CONFIGS
Request bitswall overlay configuration  
Receive answer with: [ON_BITSWALL_OVERLAY_CONFIGS](#on_bitswall_overlay_configs)  


#### GET_BITSWALL_OVERLAY_PRESENCE
Request bitswall overlay presence  
Receive answer with: [ON_BITSWALL_OVERLAY_PRESENCE](#on_bitswall_overlay_presence)  


#### GET_CHAT_COLUMNS_COUNT
Request number of chat columns  
Receive answer with: [ON_CHAT_COLUMNS_COUNT](#on_chat_columns_count)  


#### GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE
Request current chat highlight overlay presence  
Receive answer with: [SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE](#set_chat_highlight_overlay_presence)  


#### GET_CHAT_POLL_OVERLAY_CONFIGS
Request chat poll overlay configuration  
Receive answer with: [ON_CHAT_POLL_OVERLAY_CONFIGS](#on_chat_poll_overlay_configs)  


#### GET_CHAT_POLL_OVERLAY_PRESENCE
Request chat poll overlay presence  
Receive answer with: [ON_CHAT_POLL_OVERLAY_PRESENCE](#on_chat_poll_overlay_presence)  


#### GET_COUNTER
Request a specific counter entity  
Receive answer with: [ON_COUNTER_UPDATE](#on_counter_update)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_COUNTER = {
	/**
	 * Counter ID to get value of
	 */
	id: string;
}
```

</details>

#### GET_CURRENT_TRACK
Request current playing track information  
Receive answer with: [ON_CURRENT_TRACK](#on_current_track)  


#### GET_CUSTOM_TRAIN_DATA
Request custom train data and state  
Receive answer with: [ON_CUSTOM_TRAIN_DATA](#on_custom_train_data)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_CUSTOM_TRAIN_DATA = {
	/**
	 * Custom train ID to get state for
	 */
	id: string;
}
```

</details>

#### GET_DISTORT_OVERLAY_CONFIGS
Request distortion overlay configuration  
Receive answer with: [ON_DISTORT_OVERLAY_CONFIGS](#on_distort_overlay_configs)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_DISTORT_OVERLAY_CONFIGS = {
	/**
	 * Distortion overlay ID to get parameters for
	 */
	id: string;
}
```

</details>

#### GET_DONATION_GOALS_OVERLAY_CONFIGS
Request donation goals overlay configuration  
Receive answer with: [ON_DONATION_GOALS_OVERLAY_CONFIGS](#on_donation_goals_overlay_configs)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_DONATION_GOALS_OVERLAY_CONFIGS = {
	/**
	 * Overlay ID to get parameters for
	 */
	id: string;
}
```

</details>

#### GET_ENDING_CREDITS_DATA
Request for ending credits data  
Receive answer with: [SET_ENDING_CREDITS_DATA](#set_ending_credits_data)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_ENDING_CREDITS_DATA = {
	/**
	 * Date offset to get data from
	 */
	dateOffset?: number;
	/**
	 * Include overlay parameters to response
	 */
	includeOverlayParams?: boolean;
}
```

</details>

#### GET_ENDING_CREDITS_PRESENCE
Request current ending credits overlay presence  
Receive answer with: [SET_ENDING_CREDITS_PRESENCE](#set_ending_credits_presence)  


#### GET_GLOBAL_STATES
Requests for global states  
Receive answer with: [ON_GLOBAL_STATES](#on_global_states)  


#### GET_LABEL_OVERLAY_CONFIGS
Request label overlay configuration  
Receive answer with: [ON_LABEL_OVERLAY_CONFIGS](#on_label_overlay_configs)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_LABEL_OVERLAY_CONFIGS = {
	/**
	 * Label ID
	 */
	id: string;
}
```

</details>

#### GET_LABEL_OVERLAY_PLACEHOLDERS
Request available label overlay placeholders  
Receive answer with: [ON_LABEL_OVERLAY_PLACEHOLDERS](#on_label_overlay_placeholders)  


#### GET_POLLS_OVERLAY_CONFIGS
Request polls overlay configuration  
Receive answer with: [ON_POLL_OVERLAY_CONFIGS](#on_poll_overlay_configs)  


#### GET_POLLS_OVERLAY_PRESENCE
Request polls overlay presence  
Receive answer with: [ON_POLLS_OVERLAY_PRESENCE](#on_polls_overlay_presence)  


#### GET_PREDICTIONS_OVERLAY_CONFIGS
Request predictions overlay configuration  
Receive answer with: [ON_PREDICTION_OVERLAY_CONFIGS](#on_prediction_overlay_configs)  


#### GET_PREDICTIONS_OVERLAY_PRESENCE
Request predictions overlay presence  
Receive answer with: [ON_PREDICTIONS_OVERLAY_PRESENCE](#on_predictions_overlay_presence)  


#### GET_QNA_SESSION_LIST
Request list of all Q&A sessions  
Receive answer with: [ON_QNA_SESSION_LIST](#on_qna_session_list)  


#### GET_TIMER
Request specific timer configuration  
Receive answer with: [ON_TIMER_START](#on_timer_start)  
<details>
<summary>JSON parameters</summary>

```typescript
type GET_TIMER = {
	/**
	 * Timer ID to get configs for
	 */
	id: string;
}
```

</details>

#### GET_TIMER_LIST
Request list of all timers  
Receive answer with: [ON_TIMER_LIST](#on_timer_list)  


#### GET_TIMER_OVERLAY_PRESENCE
Request timer overlay presence  
Receive answer with: [ON_TIMER_OVERLAY_PRESENCE](#on_timer_overlay_presence)  


#### GET_TRIGGER_LIST
Request list of all triggers  
Receive answer with: [ON_TRIGGER_LIST](#on_trigger_list)  


#### GET_WHEEL_OVERLAY_PRESENCE
Request wheel overlay presence  
Receive answer with: [ON_WHEEL_OVERLAY_PRESENCE](#on_wheel_overlay_presence)  




