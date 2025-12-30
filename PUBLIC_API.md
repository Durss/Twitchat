
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
  * [OBS-websocket](#obs-websocket)
  * [Available events and actions](#available-events-and-actions)
* [Events you can receive](#events-you-can-receive)
* [Actions you can perform](#actions-you-can-perform)
* [Requesting data](#requesting-data)

<br>
<br>


# Prerequisites
This API needs [OBS-Websocket](https://github.com/obsproject/obs-websocket/releases/tag/5.0.0-beta1) V5 to be installed and running!\
\
After installing OBS-Websocket, start OBS, you may want set a password on `Tools -> obs-websocket Settings`.\
\
Once done, go on Twitchat, open the parameters and on the OBS panel specify the credentials to connect with OBS.\
\
OBS will act as a bridge to transmit Twitchat messages to any connected client.

<br>
<br>


# Connect example
To connect with OBS-Websocket you can use the [obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js) package that already handles everything.\
\
Below is a typescript example to use the API via `OBS-Websocket-js`.\
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

<!-- INJECT_AFTER -->

# Events you can receive
<details>
<summary>Events fired by Twitchat that can be listened to.</summary>

### **ON_AD_BREAK_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	showApproaching: boolean;
	showRunning: boolean;
	approachingDelay: number;
	approachingStyle: "text"|"bar";
	runningStyle: "text"|"bar";
	approachingSize: number;
	runningSize: number;
	approachingThickness: number;
	runningThickness: number;
	approachingColor: string;
	runningColor: string;
	approachingPlacement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	runningPlacement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	approachingLabel: string;
	runningLabel: string;
}
```

</details>

### **ON_AD_BREAK_OVERLAY_DATA**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_AD_BREAK_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_ANIMATED_TEXT_CLOSE**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_ANIMATED_TEXT_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_ANIMATED_TEXT_HIDE_COMPLETE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Query ID sent when setting the text from ANIMATED_TEXT_SET
	 */
	queryId: string;
}
```

</details>

### **ON_ANIMATED_TEXT_SHOW_COMPLETE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Query ID sent when setting the text from ANIMATED_TEXT_SET
	 */
	queryId: string;
}
```

</details>

### **ON_BINGO_GRID_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Bingo grid ID
	 */
	id: string;
	/**
	 * Bingo configs
	 */
	bingo: null|{
		id: string;
		title: string;
		enabled: boolean;
		showGrid: boolean;
		entries: {
			id: string;
			label: string;
			lock: boolean;
			check: boolean;
		}[];
		additionalEntries?: {
			id: string;
			label: string;
			lock: boolean;
			check: boolean;
		}[];
		cols: number;
		rows: number;
		textColor: string;
		backgroundColor: string;
		backgroundAlpha: number;
		textSize: number;
		chatCmd?: string;
		chatCmdPermissions: {
			broadcaster: boolean;
			follower: boolean;
			follower_duration_ms: number;
			mods: boolean;
			vips: boolean;
			subs: boolean;
			all: boolean;
			usersAllowed: string[];
			usersRefused: string[];
			users?: string;
		};
		winSoundVolume: number;
		autoShowHide: boolean;
		heatClick: boolean;
		heatClickPermissions: {
			broadcaster: boolean;
			follower: boolean;
			follower_duration_ms: number;
			mods: boolean;
			vips: boolean;
			subs: boolean;
			all: boolean;
			usersAllowed: string[];
			usersRefused: string[];
			users?: string;
		};
		chatAnnouncement: string;
		chatAnnouncementEnabled: boolean;
		overlayAnnouncement: boolean;
		overlayAnnouncementPermissions: {
			broadcaster: boolean;
			follower: boolean;
			follower_duration_ms: number;
			mods: boolean;
			vips: boolean;
			subs: boolean;
			all: boolean;
			usersAllowed: string[];
			usersRefused: string[];
			users?: string;
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

### **ON_BINGO_GRID_HEAT_CLICK**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Bingo grid ID to get parameters for
	 */
	id: string;
	/**
	 * Cell entry ID that was clicked
	 */
	entryId: string;
	/**
	 * Heat click data
	 */
	click: {
		id: string;
		channelId: string;
		anonymous: boolean;
		x: number;
		y: number;
		rotation: number;
		scaleX: number;
		scaleY: number;
		uid: string;
		login: string;
		isSub: boolean;
		isBan: boolean;
		isMod: boolean;
		isVip: boolean;
		isBroadcaster: boolean;
		isFollower: boolean;
		followDate: number;
		testMode: boolean;
		alt: boolean;
		ctrl: boolean;
		shift: boolean;
		page: string;
		twitchatOverlayID: string;
	};
}
```

</details>

### **ON_BINGO_GRID_LEADER_BOARD**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_BINGO_GRID_VIEWER_EVENT**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_BITS**
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	message: string;
	message_chunks?: {
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
		 * the chunk sshould be displayed as spoiler
		 */
		spoiler?: boolean;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk is a spoiler tag (||)
		 */
		spoilerTag?: boolean;
	}[];
	user: {
		id: string;
		login: string;
		displayName: string;
	};
	bits: number;
	pinned: boolean;
	pinLevel: number;
}
```

</details>

### **ON_BITSWALL_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	size: number;
	break: boolean;
	opacity: number;
	break_senderOnly: boolean;
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

### **ON_BITSWALL_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_CHAT_COLUMNS_COUNT**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Number of chat columns
	 */
	count: number;
}
```

</details>

### **ON_CHAT_POLL_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	parameters: {
		listMode: boolean;
		listModeOnlyMore2: boolean;
		showTitle: boolean;
		showLabels: boolean;
		showVotes: boolean;
		showPercent: boolean;
		showTimer: boolean;
		showOnlyResult: boolean;
		resultDuration_s: number;
		placement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	};
}
```

</details>

### **ON_CHAT_POLL_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_CHAT_POLL_PROGRESS**
<details>
<summary>JSON params</summary>

```typescript
{
	poll: {
		/**
		 * Poll title
		 */
		title: string;
		/**
		 * Poll choices
		 */
		choices: {
			id: any;
			/**
			 * Text of the choice
			 */
			label: any;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: any;
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
			id: any;
			/**
			 * Text of the choice
			 */
			label: any;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: any;
		};
		/**
		 * Permissions params
		 */
		permissions: {
			broadcaster: boolean;
			follower: boolean;
			follower_duration_ms: number;
			mods: boolean;
			vips: boolean;
			subs: boolean;
			all: boolean;
			usersAllowed: string[];
			usersRefused: string[];
			users?: string;
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

### **ON_COUNTDOWN_COMPLETE**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_COUNTDOWN_START**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_COUNTER_LIST**
<details>
<summary>JSON params</summary>

```typescript
{
	counterList: {
		id: string;
		name: string;
		perUser: boolean;
	}[];
}
```

</details>

### **ON_COUNTER_UPDATE**
<details>
<summary>JSON params</summary>

```typescript
{
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
				platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
				value: number;
				login?: string;
			};
		};
		/**
		 * Only available for counters overlay related to a "per user" counter
		 * Contains user info necessary for display on screen.
		 * Only contains 10 first users
		 */
		leaderboard?: {
			login: string;
			avatar: string;
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

### **ON_CURRENT_TRACK**
<details>
<summary>JSON params</summary>

```typescript
{
	params: {
		autoHide: boolean;
		erase: boolean;
		showCover: boolean;
		showArtist: boolean;
		showTitle: boolean;
		showProgressbar: boolean;
		openFromLeft: boolean;
		noScroll: boolean;
		customInfoTemplate: string;
	};
	trackName?: string;
	artistName?: string;
	trackDuration?: number;
	trackPlaybackPos?: number;
	cover?: string;
	skin?: string;
}
```

</details>

### **ON_CUSTOM_TRAIN_DATA**
<details>
<summary>JSON params</summary>

```typescript
{
	configs: {
		id: string;
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
			date: number;
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

### **ON_DISTORT_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	params: {
		id: string;
		name: string;
		obsItemPath: {
			sceneName: string;
			groupName: string;
			source: {
				id: number;
				name: string;
			};
		};
		permissions: {
			broadcaster: boolean;
			follower: boolean;
			follower_duration_ms: number;
			mods: boolean;
			vips: boolean;
			subs: boolean;
			all: boolean;
			usersAllowed: string[];
			usersRefused: string[];
			users?: string;
		};
		refuseAnon: boolean;
		effect: "liquid"|"expand"|"shrink"|"heart";
		filterName: string;
		browserSourceName: string;
		enabled: boolean;
		triggerOnly: boolean;
	};
}
```

</details>

### **ON_DONATION_EVENT**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_DONATION_GOALS_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	params: {
		id: string;
		title: string;
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
			id: string;
			title: string;
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
	goal: number;
	raisedTotal: number;
	raisedPersonnal: number;
	skin: string;
}
```

</details>

### **ON_EMERGENCY_MODE_CHANGED**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * New emergency mode state
	 */
	enabled: boolean;
}
```

</details>

### **ON_ENDING_CREDITS_COMPLETE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_ENDING_CREDITS_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	scale: number;
	padding: number;
	paddingTitle: number;
	stickyTitle: boolean;
	colorTitle: string;
	colorEntry: string;
	fontTitle: string;
	fontEntry: string;
	ignoreBots: boolean;
	ignoreCustomBots: string[];
	textShadow: number;
	timing: "speed"|"duration";
	duration: number;
	startDelay: number;
	loop: boolean;
	showIcons: boolean;
	powerUpEmotes: boolean;
	speed: number;
	fadeSize: number;
	slots: {
		id: string;
		slotType: "text"|"bans"|"mods"|"subs"|"vips"|"raids"|"polls"|"so_in"|"so_out"|"cheers"|"follows"|"rewards"|"chatters"|"timeouts"|"hypechats"|"hypetrains"|"predictions"|"tips"|"shoutouts"|"merch"|"patreonMembers"|"powerups"|"ytSuperchat"|"ytSuperSticker"|"tiktokLikes"|"tiktokShares"|"tiktokGifts";
		label: string;
		maxEntries: number;
		enabled: boolean;
		layout: "colLeft"|"col"|"colRight"|"left"|"center"|"right"|"2cols"|"3cols";
		customHTML?: boolean;
		htmlTemplate?: string;
		showAmounts?: boolean;
		showSubMonths?: boolean;
		showBadges?: boolean;
		showMods?: boolean;
		showVIPs?: boolean;
		showSubs?: boolean;
		showResubs?: boolean;
		showSubgifts?: boolean;
		showSubsPrime?: boolean;
		showSubsT1?: boolean;
		showSubsT2?: boolean;
		showSubsT3?: boolean;
		showAllSubs?: boolean;
		showAllSubgifters?: boolean;
		showSubsYoutube?: boolean;
		showSubsTiktok?: boolean;
		showSubgiftsYoutube?: boolean;
		showTipsKofi?: boolean;
		showSubsKofi?: boolean;
		showTipsTipeee?: boolean;
		showTipsPatreon?: boolean;
		showTipsStreamlabs?: boolean;
		showTipsStreamelements?: boolean;
		showMerchKofi?: boolean;
		showMerchStreamlabs?: boolean;
		sortByNames?: boolean;
		sortByRoles?: boolean;
		sortByAmounts?: boolean;
		sortByTotalAmounts?: boolean;
		sortBySubTypes?: boolean;
		showChatters?: boolean;
		showTrainConductors?: boolean;
		showPuSkin?: boolean;
		showPuEmote?: boolean;
		showPuCeleb?: boolean;
		showTotalAmounts?: boolean;
		uniqueUsers?: boolean;
		text?: string;
		currency?: string;
		filterRewards?: boolean;
		showRewardUsers?: boolean;
		showNormalCheers?: boolean;
		showPinnedCheers?: boolean;
		anonLastNames?: boolean;
		patreonTiers?: string[];
		rewardIds?: string[];
		showPremiumWarning?: boolean;
	}[];
	hideEmptySlots?: boolean;
}
```

</details>

### **ON_FOLLOW**
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	user: {
		id: string;
		login: string;
		displayName: string;
	};
}
```

</details>

### **ON_GLOBAL_STATES**
<details>
<summary>JSON params</summary>

```typescript
{
	activeTimers: string[];
	activeCountowns: string[];
	counterValues: {
		[key: string]: number;
	};
	emergencyMode: boolean;
	ttsSpeaking: boolean;
	canAutoShoutout: boolean;
	moderationToolsVisible: boolean;
	censorshipEnabled: boolean;
	hasActiveChatAlert: boolean;
	voiceBotEnabled: boolean;
}
```

</details>

### **ON_LABEL_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Label ID
	 */
	id: string;
	data: null|{
		id: string;
		title: string;
		enabled: boolean;
		placeholder: ""|"DATE"|"TIME"|"DATE_TIME"|"DAY"|"MONTH"|"YEAR"|"HOURS"|"MINUTES"|"SECONDS"|"VIEWER_COUNT_TWITCH"|"FOLLOWER_COUNT"|"SUB_COUNT"|"SUB_POINTS"|"STREAM_DURATION"|"STREAM_TITLE"|"STREAM_CATEGORY_NAME"|"STREAM_CATEGORY_COVER"|"SUB_NAME"|"SUB_ID"|"SUB_AVATAR"|"SUB_TIER"|"SUBGIFT_NAME"|"SUBGIFT_ID"|"SUBGIFT_AVATAR"|"SUBGIFT_TIER"|"SUBGIFT_COUNT"|"VIEWER_COUNT_YOUTUBE"|"SUB_YOUTUBE_NAME"|"SUB_YOUTUBE_ID"|"SUB_YOUTUBE_AVATAR"|"SUB_YOUTUBE_TIER"|"SUBGIFT_YOUTUBE_NAME"|"SUBGIFT_YOUTUBE_ID"|"SUBGIFT_YOUTUBE_AVATAR"|"SUBGIFT_YOUTUBE_TIER"|"SUBGIFT_YOUTUBE_COUNT"|"FOLLOWER_YOUTUBE_USER"|"FOLLOWER_YOUTUBE_AVATAR"|"VIEWER_COUNT"|"SUB_GENERIC_NAME"|"SUB_GENERIC_ID"|"SUB_GENERIC_AVATAR"|"SUB_GENERIC_TIER"|"SUBGIFT_GENERIC_NAME"|"SUBGIFT_GENERIC_ID"|"SUBGIFT_GENERIC_AVATAR"|"SUBGIFT_GENERIC_TIER"|"SUBGIFT_GENERIC_COUNT"|"SUPER_CHAT_NAME"|"SUPER_CHAT_ID"|"SUPER_CHAT_AVATAR"|"SUPER_CHAT_AMOUNT"|"SUPER_STICKER_NAME"|"SUPER_STICKER_ID"|"SUPER_STICKER_AVATAR"|"SUPER_STICKER_AMOUNT"|"SUPER_STICKER_IMAGE"|"CHEER_NAME"|"CHEER_ID"|"CHEER_AVATAR"|"CHEER_AMOUNT"|"COMBO_NAME"|"COMBO_ID"|"COMBO_AVATAR"|"COMBO_AMOUNT"|"FOLLOWER_NAME"|"FOLLOWER_ID"|"FOLLOWER_AVATAR"|"FOLLOWER_GENERIC_NAME"|"FOLLOWER_GENERIC_ID"|"FOLLOWER_GENERIC_AVATAR"|"REWARD_NAME"|"REWARD_ID"|"REWARD_AVATAR"|"REWARD_ICON"|"REWARD_TITLE"|"RAID_NAME"|"RAID_ID"|"RAID_AVATAR"|"RAID_COUNT"|"WATCH_STREAK_NAME"|"WATCH_STREAK_ID"|"WATCH_STREAK_AVATAR"|"WATCH_STREAK_COUNT"|"POWER_UP_GIANTIFIED_ID"|"POWER_UP_GIANTIFIED_NAME"|"POWER_UP_GIANTIFIED_AVATAR"|"POWER_UP_GIANTIFIED_CODE"|"POWER_UP_GIANTIFIED_IMAGE"|"POWER_UP_CELEBRATION_ID"|"POWER_UP_CELEBRATION_NAME"|"POWER_UP_CELEBRATION_AVATAR"|"POWER_UP_CELEBRATION_CODE"|"POWER_UP_CELEBRATION_IMAGE"|"POWER_UP_MESSAGE_ID"|"POWER_UP_MESSAGE_NAME"|"POWER_UP_MESSAGE_AVATAR"|"KOFI_TIP_NAME"|"KOFI_TIP_AMOUNT"|"KOFI_MERCH_USER"|"KOFI_MERCH_NAME"|"KOFI_MERCH_AMOUNT"|"STREAMLABS_TIP_NAME"|"STREAMLABS_TIP_AMOUNT"|"STREAMLABS_MERCH_USER"|"STREAMLABS_MERCH_NAME"|"STREAMLABS_CHARITY_NAME"|"STREAMLABS_CHARITY_IMAGE"|"STREAMLABS_CHARITY_RAISED"|"STREAMLABS_CHARITY_RAISED_PERSONNAL"|"STREAMLABS_CHARITY_GOAL"|"STREAMLABS_CHARITY_LAST_TIP_USER"|"STREAMLABS_CHARITY_LAST_TIP_AMOUNT"|"TILTIFY_LAST_TIP_USER"|"TILTIFY_LAST_TIP_AMOUNT"|"PATREON_USER"|"PATREON_AMOUNT"|"PATREON_TITLE"|"PATREON_AVATAR"|"PATREON_MEMBER_COUNT"|"STREAMELEMENTS_TIP_NAME"|"STREAMELEMENTS_TIP_AMOUNT"|"TIPEEE_TIP_NAME"|"TIPEEE_TIP_AMOUNT"|"TWITCH_CHARITY_NAME"|"TWITCH_CHARITY_IMAGE"|"TWITCH_CHARITY_RAISED"|"TWITCH_CHARITY_GOAL"|"TWITCH_CHARITY_LAST_TIP_USER"|"TWITCH_CHARITY_LAST_TIP_AMOUNT"|"TWITCH_CHARITY_LAST_TIP_AVATAR"|"VOICEMOD_EFFECT_TITLE"|"VOICEMOD_EFFECT_ICON"|"MUSIC_TITLE"|"MUSIC_ARTIST"|"MUSIC_ALBUM"|"MUSIC_COVER"|"VIEWER_COUNT_TIKTOK"|"TIKTOK_LIKE_TOTAL"|"TIKTOK_LIKE_USER"|"TIKTOK_LIKE_AVATAR"|"TIKTOK_LIKE_COUNT"|"TIKTOK_FOLLOWER_USER"|"TIKTOK_FOLLOWER_AVATAR"|"TIKTOK_SUB_USER"|"TIKTOK_SUB_AVATAR"|"TIKTOK_SHARE_USER"|"TIKTOK_SHARE_AVATAR"|"TIKTOK_GIFT_USER"|"TIKTOK_GIFT_AVATAR"|"TIKTOK_GIFT_IMAGE"|"TIKTOK_GIFT_COUNT"|"TIKTOK_GIFT_DIAMONDS";
		html: string;
		css: string;
		mode: "placeholder"|"html";
		fontSize: number;
		fontFamily: string;
		fontColor: string;
		textAlign: "left"|"center"|"right";
		scrollContent: boolean;
		backgroundEnabled: boolean;
		backgroundColor: string;
	};
	exists?: boolean;
	isValid?: boolean;
}
```

</details>

### **ON_LABEL_OVERLAY_PLACEHOLDERS**
<details>
<summary>JSON params</summary>

```typescript
{
	[key: string]: {
		value: string|number;
		type: "string"|"number"|"duration"|"date"|"time"|"datetime"|"day"|"month"|"year"|"hours"|"minutes"|"seconds"|"image";
	};
}
```

</details>

### **ON_MENTION**
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	message: string;
	user: {
		id: string;
		login: string;
		displayName: string;
	};
}
```

</details>

### **ON_MESSAGE_DELETED**
A chat message has been deleted  
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	message: string;
	user: {
		id: string;
		login: string;
		displayName: string;
	};
}
```

</details>

### **ON_MESSAGE_FIRST_ALL_TIME**
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	message: string;
	user: {
		id: string;
		login: string;
		displayName: string;
	};
}
```

</details>

### **ON_MESSAGE_FIRST_TODAY**
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	message: string;
	user: {
		id: string;
		login: string;
		displayName: string;
	};
}
```

</details>

### **ON_MESSAGE_FROM_NON_FOLLOWER**
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	message: string;
	user: {
		id: string;
		login: string;
		displayName: string;
	};
}
```

</details>

### **ON_MESSAGE_MARKED_AS_READ**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_MESSAGE_WHISPER**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_MUSIC_PLAYER_HEAT_CLICK**
<details>
<summary>JSON params</summary>

```typescript
{
	id: string;
	channelId: string;
	anonymous: boolean;
	x: number;
	y: number;
	rotation: number;
	scaleX: number;
	scaleY: number;
	uid: string;
	login: string;
	isSub: boolean;
	isBan: boolean;
	isMod: boolean;
	isVip: boolean;
	isBroadcaster: boolean;
	isFollower: boolean;
	followDate: number;
	testMode: boolean;
	alt: boolean;
	ctrl: boolean;
	shift: boolean;
	page: string;
	twitchatOverlayID: string;
}
```

</details>

### **ON_OBS_WEBSOCKET_CONNECTED**
OBS Websocket connection established  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_OBS_WEBSOCKET_DISCONNECTED**
OBS Websocket connection lost  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_POLL_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	parameters: {
		listMode: boolean;
		listModeOnlyMore2: boolean;
		showTitle: boolean;
		showLabels: boolean;
		showVotes: boolean;
		showPercent: boolean;
		showTimer: boolean;
		showOnlyResult: boolean;
		resultDuration_s: number;
		placement: "tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	};
}
```

</details>

### **ON_POLL_PROGRESS**
<details>
<summary>JSON params</summary>

```typescript
{
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
			id: any;
			/**
			 * Text of the choice
			 */
			label: any;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: any;
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
			id: any;
			/**
			 * Text of the choice
			 */
			label: any;
			/**
			 * Number of "votes", represents the total channel points spent on it
			 */
			votes: any;
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

### **ON_POLLS_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_PREDICTION_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_PREDICTION_PROGRESS**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_PREDICTIONS_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_QNA_SESSION_LIST**
<details>
<summary>JSON params</summary>

```typescript
{
	sessionList: {
		id: string;
		command: string;
		open: boolean;
	}[];
}
```

</details>

### **ON_REWARD_REDEEM**
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	message?: string;
	message_chunks?: {
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
		 * the chunk sshould be displayed as spoiler
		 */
		spoiler?: boolean;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk is a spoiler tag (||)
		 */
		spoilerTag?: boolean;
	}[];
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
```

</details>

### **ON_SUBSCRIPTION**
<details>
<summary>JSON params</summary>

```typescript
{
	channel: string;
	message: string;
	message_chunks: {
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
		 * the chunk sshould be displayed as spoiler
		 */
		spoiler?: boolean;
		/**
		 * Only declared by the ChatMessageChunkParser component to define if
		 * the chunk is a spoiler tag (||)
		 */
		spoilerTag?: boolean;
	}[];
	user: {
		id: string;
		login: string;
		displayName: string;
	};
	tier: 1|2|3|"prime";
	months: number;
	recipients: {
		uid: string;
		login: string;
	}[];
	streakMonths: number;
	totalSubDuration: number;
	giftCount: number;
	isPrimeUpgrade: boolean;
	isGift: boolean;
	isGiftUpgrade: boolean;
	isResub: boolean;
}
```

</details>

### **ON_TIMER_LIST**
<details>
<summary>JSON params</summary>

```typescript
{
	timerList: {
		id: string;
		title: string;
		enabled: boolean;
		type: "timer"|"countdown";
	}[];
}
```

</details>

### **ON_TIMER_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_TIMER_START**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_TIMER_STOP**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_TRACK_ADDED_TO_QUEUE**
<details>
<summary>JSON params</summary>

```typescript
{
	id: string;
	title: string;
	artist: string;
	album: string;
	cover: string;
	duration: number;
	url: string;
}
```

</details>

### **ON_TRIGGER_LIST**
<details>
<summary>JSON params</summary>

```typescript
{
	triggerList: {
		id: string;
		name: string;
		disabled: boolean;
	}[];
}
```

</details>

### **ON_TWITCHAT_READY**
Twitchat completed initialization and is ready.  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_VOICEMOD_VOICE_CHANGE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Voice ID that got selected
	 */
	voiceId: string;
}
```

</details>

### **ON_WHEEL_OVERLAY_ANIMATION_COMPLETE**
<details>
<summary>JSON params</summary>

```typescript
{
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

### **ON_WHEEL_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

### **ON_WHEEL_OVERLAY_START**
<details>
<summary>JSON params</summary>

```typescript
{
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

</details>

# Actions you can perform
<details>
<summary>Actions you can request Twitchat to perform.</summary>

## **SET_ANIMATED_TEXT_CONTENT**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_AUTOMOD_ACCEPT**
Accept latest message held by automod  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_AUTOMOD_REJECT**
Rject latest message held by automod  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_BINGO_GRID_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Bingo grid ID to advertise presence of
	 */
	id: string;
}
```

</details>

## **SET_BINGO_TOGGLE**
Toggle current bingo display (NOT bingo GRID!)  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_CENSOR_DELETED_MESSAGES_TOGGLE**
Toggle censorship of deleted messages  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_CHAT_FEED_PAUSE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_READ**
Move read marker in chat feed  
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_CHAT_FEED_READ_ALL**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SCROLL**
Scroll a chat feed by a specific amount  
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Number of pixels to scroll by.
	 * Default value: 100
	 */
	scrollBy?: number;
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SCROLL_BOTTOM**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SCROLL_DOWN**
Scroll a chat feed down  
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Number of pixels to scroll by
	 */
	scrollBy: number;
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SCROLL_UP**
Scroll a chat feed up  
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Number of pixels to scroll by
	 */
	scrollBy: number;
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SELECT**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_CHAT_FEED_SELECT_ACTION_BAN**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_CHAT_FEED_SELECT_ACTION_CANCEL**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SELECT_ACTION_DELETE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SELECT_ACTION_HIGHLIGHT**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SELECT_ACTION_SAVE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SELECT_ACTION_SHOUTOUT**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_SELECT_CHOOSING_ACTION**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_FEED_UNPAUSE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Column index
	 */
	colIndex: number;
}
```

</details>

## **SET_CHAT_HIGHLIGHT_OVERLAY_CLIP**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_CLEAR_CHAT_HIGHLIGHT**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_COUNTDOWN_ADD**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_COUNTER_ADD**
<details>
<summary>JSON params</summary>

```typescript
{
	id: string;
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

## **SET_EMERGENCY_MODE**
Enable/disable/toggle emergency mode
Either give an object with "enabled" boolean to force a specific
state, or don't give any parameter to toggle current state  
<details>
<summary>JSON params</summary>

```typescript
{
	enabled: boolean;
	/**
	 * If set to true, a confirmation modal will be shown
	 * to confirm the action
	 */
	promptConfirmation?: boolean;
}
```

</details>

## **SET_ENDING_CREDITS_CONTROL**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_ENDING_CREDITS_DATA**
<details>
<summary>JSON params</summary>

```typescript
{
	streamDuration: number;
	premiumWarningSlots?: {
		[key: string]: boolean;
	};
	params?: {
		scale: number;
		padding: number;
		paddingTitle: number;
		stickyTitle: boolean;
		colorTitle: string;
		colorEntry: string;
		fontTitle: string;
		fontEntry: string;
		ignoreBots: boolean;
		ignoreCustomBots: string[];
		textShadow: number;
		timing: "speed"|"duration";
		duration: number;
		startDelay: number;
		loop: boolean;
		showIcons: boolean;
		powerUpEmotes: boolean;
		speed: number;
		fadeSize: number;
		slots: {
			id: string;
			slotType: "text"|"bans"|"mods"|"subs"|"vips"|"raids"|"polls"|"so_in"|"so_out"|"cheers"|"follows"|"rewards"|"chatters"|"timeouts"|"hypechats"|"hypetrains"|"predictions"|"tips"|"shoutouts"|"merch"|"patreonMembers"|"powerups"|"ytSuperchat"|"ytSuperSticker"|"tiktokLikes"|"tiktokShares"|"tiktokGifts";
			label: string;
			maxEntries: number;
			enabled: boolean;
			layout: "colLeft"|"col"|"colRight"|"left"|"center"|"right"|"2cols"|"3cols";
			customHTML?: boolean;
			htmlTemplate?: string;
			showAmounts?: boolean;
			showSubMonths?: boolean;
			showBadges?: boolean;
			showMods?: boolean;
			showVIPs?: boolean;
			showSubs?: boolean;
			showResubs?: boolean;
			showSubgifts?: boolean;
			showSubsPrime?: boolean;
			showSubsT1?: boolean;
			showSubsT2?: boolean;
			showSubsT3?: boolean;
			showAllSubs?: boolean;
			showAllSubgifters?: boolean;
			showSubsYoutube?: boolean;
			showSubsTiktok?: boolean;
			showSubgiftsYoutube?: boolean;
			showTipsKofi?: boolean;
			showSubsKofi?: boolean;
			showTipsTipeee?: boolean;
			showTipsPatreon?: boolean;
			showTipsStreamlabs?: boolean;
			showTipsStreamelements?: boolean;
			showMerchKofi?: boolean;
			showMerchStreamlabs?: boolean;
			sortByNames?: boolean;
			sortByRoles?: boolean;
			sortByAmounts?: boolean;
			sortByTotalAmounts?: boolean;
			sortBySubTypes?: boolean;
			showChatters?: boolean;
			showTrainConductors?: boolean;
			showPuSkin?: boolean;
			showPuEmote?: boolean;
			showPuCeleb?: boolean;
			showTotalAmounts?: boolean;
			uniqueUsers?: boolean;
			text?: string;
			currency?: string;
			filterRewards?: boolean;
			showRewardUsers?: boolean;
			showNormalCheers?: boolean;
			showPinnedCheers?: boolean;
			anonLastNames?: boolean;
			patreonTiers?: string[];
			rewardIds?: string[];
			showPremiumWarning?: boolean;
		}[];
		hideEmptySlots?: boolean;
	};
	follows: {
		uid: string;
		login: string;
	}[];
	raids: {
		uid: string;
		login: string;
		raiders: number;
	}[];
	subs: {
		uid: string;
		login: string;
		tier: 1|2|3|"prime";
		subDuration?: number;
		fromActiveSubs?: true;
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
	}[];
	resubs: {
		uid: string;
		login: string;
		tier: 1|2|3|"prime";
		subDuration?: number;
		fromActiveSubs?: true;
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
	}[];
	subgifts: {
		uid: string;
		login: string;
		tier: 1|2|3|"prime";
		total: number;
		fromActiveSubs?: true;
		platform: "twitchat"|"twitch"|"instagram"|"youtube"|"tiktok"|"facebook"|"kick";
	}[];
	bits: {
		uid: string;
		login: string;
		bits: number;
		pinned: boolean;
	}[];
	hypeChats: {
		uid: string;
		login: string;
		amount: number;
		currency: string;
	}[];
	rewards: {
		uid: string;
		login: string;
		reward: {
			name: string;
			id: string;
			icon: string;
		};
	}[];
	shoutouts: {
		uid: string;
		login: string;
		received: boolean;
		viewers: number;
	}[];
	hypeTrains: {
		level: number;
		percent: number;
		conductorBits?: {
			uid: string;
			login: string;
			bits: number;
		};
		conductorSubs?: {
			uid: string;
			login: string;
			subs: number;
		};
	}[];
	polls: {
		title: string;
		votes: number;
		choices: {
			title: string;
			votes: number;
			win: boolean;
		}[];
	}[];
	predictions: {
		title: string;
		points: number;
		outcomes: {
			title: string;
			points: number;
			voters: number;
			win: boolean;
		}[];
	}[];
	chatters: {
		uid: string;
		login: string;
		count: number;
		vip: boolean;
		mod: boolean;
		sub: boolean;
		bans: number;
		tos: number;
		tosDuration: number;
	}[];
	tips: {
		login: string;
		amount: number;
		currency: string;
		platform: "kofi"|"streamlabs"|"streamelements"|"tipeee"|"patreon";
	}[];
	merch: {
		login: string;
		products: string[];
		total: number;
		currency: string;
		platform: "kofi"|"streamlabs";
	}[];
	powerups: {
		login: string;
		skinID?: undefined|"simmer"|"rainbow-eclipse"|"cosmic-abyss";
		emoteUrl?: string;
		type: "animation"|"gigantifiedemote"|"celebration";
	}[];
	superChats: {
		uid: string;
		login: string;
		amount: number;
		currency: string;
	}[];
	superStickers: {
		uid: string;
		login: string;
		amount: number;
		currency: string;
		stickerUrl: string;
	}[];
	tiktokGifts: {
		uid: string;
		login: string;
		count: number;
		amount: number;
		imageUrl: string;
	}[];
	tiktokLikes: {
		uid: string;
		login: string;
		count: number;
	}[];
	tiktokShares: {
		uid: string;
		login: string;
		count: number;
	}[];
	patreonMembers: {
		uid: string;
		login: string;
		months: number;
		tier: string;
		lifetimeAmount: number;
	}[];
	labels: {
		no_entry: string;
		train: string;
		premium_only: string;
		sub_duration: string;
	};
}
```

</details>

## **SET_ENDING_CREDITS_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_EXECUTE_TRIGGER**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Trigger ID to execute
	 */
	id: string;
}
```

</details>

## **SET_GREET_FEED_READ**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Number of messages to mark as read
	 */
	messageCount: number;
}
```

</details>

## **SET_GREET_FEED_READ_ALL**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_HIDE_CHAT_ALERT**
Hide current chat alert
See settings => chat features => Enable chat alert  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_MERGE_TOGGLE**
Toggle merge feature
See settings => chat features => Merge consecutive messages of a user  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_MOD_TOOLS_TOGGLE**
Toggle moderation tools display  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_PLAY_SFXR**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_POLL_TOGGLE**
Toggle current poll display  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_PREDICTION_TOGGLE**
Toggle current prediction display  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_QNA_HIGHLIGHT**
Highlights the top most message of given Q&A session  
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Q&A session ID
	 */
	id: string;
}
```

</details>

## **SET_QNA_SKIP**
Skips the top most message of given Q&A session  
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Q&A session ID
	 */
	id: string;
}
```

</details>

## **SET_RAFFLE_PICK_WINNER**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_RAFFLE_TOGGLE**
Toggle current raffle display  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_SEND_CUSTOM_CHAT_MESSAGE**
<details>
<summary>JSON params</summary>

```typescript
{
	message?: string;
	canClose?: boolean;
	todayFirst?: boolean;
	user?: {
		name: string;
		color?: string;
	};
	col?: number;
	icon?: undefined|"number"|"prime"|"twitchat"|"twitch"|"youtube"|"tiktok"|"kofi"|"patreon"|"vip"|"premium"|"broadcaster"|"partner"|"rotate"|"poll"|"prediction"|"timer"|"countdown"|"emote"|"url"|"highlight"|"user"|"date"|"voicemod"|"music"|"placeholder"|"ad"|"add"|"alert"|"animate"|"announcement"|"anon"|"api"|"automod"|"badge"|"ban"|"bingo"|"bits"|"block"|"boost"|"bot"|"broadcast"|"change"|"channelPoints"|"chatCommand"|"chatPoll"|"checkmark"|"clearChat"|"click"|"clip"|"coffee"|"coin"|"color"|"commands"|"conversation"|"copy"|"count"|"credits"|"cross"|"debug"|"delete"|"dice"|"discord"|"donor"|"download"|"dragZone"|"easing"|"edit"|"elevated"|"elgato"|"emergency"|"enter"|"filters"|"firstTime"|"fix"|"follow"|"follow_outline"|"font"|"fontSize"|"fullscreen"|"gift"|"github"|"goxlr"|"goxlr_bleep"|"goxlr_fx"|"hand"|"heat"|"help"|"hide"|"history"|"hypeChat"|"idea"|"info"|"internet"|"leave"|"list"|"live"|"loader"|"lock"|"loop"|"magnet"|"markRead"|"max"|"merge"|"microphone"|"microphone_mute"|"microphone_recording"|"min"|"minus"|"mod"|"move"|"mute"|"newtab"|"next"|"noMusic"|"notification"|"obs"|"offline"|"online"|"orderable"|"overlay"|"params"|"pause"|"paypal"|"pin"|"pipette"|"play"|"polygon"|"presentation"|"press"|"prev"|"pros"|"qna"|"raid"|"read"|"refresh"|"reply"|"returning"|"reward_highlight"|"rightClick"|"save"|"scale"|"scroll"|"scrollDown"|"scrollUp"|"search"|"shadow"|"shield"|"shieldMode"|"shoutout"|"show"|"skip"|"slow"|"spotify"|"stars"|"stop"|"sub"|"test"|"thickness"|"ticket"|"timeout"|"train"|"train_boost"|"translate"|"trash"|"tts"|"twitter"|"ulule"|"unban"|"unblock"|"unfollow"|"unlock"|"unmod"|"unmute"|"unpin"|"unvip"|"update"|"upload"|"vibrate"|"voice"|"volume"|"watchStreak"|"whispers";
	highlightColor?: string;
	style?: undefined|"highlight"|"message"|"error";
	quote?: string;
	actions?: {
		icon?: string;
		label: string;
		actionType?: undefined|"trigger"|"url"|"discord"|"message";
		url?: string;
		urlTarget?: string;
		triggerId?: string;
		message?: string;
		theme?: undefined|"default"|"alert"|"primary"|"secondary";
	}[];
}
```

</details>

## **SET_SEND_MESSAGE**
<details>
<summary>JSON params</summary>

```typescript
{
	message: string;
}
```

</details>

## **SET_SHOUTOUT**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_STOP_CURRENT_TTS_AUDIO**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_STOP_POLL**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_STOP_PREDICTION**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_TIMER_ADD**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **SET_TRIGGER_STATE**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Trigger ID to change state of
	 */
	id: string;
	/**
	 * Force trigger state
	 * true to enable it
	 * false to disabled
	 * 
	 * Don't set this field to just toggle current state
	 */
	forcedState?: boolean;
}
```

</details>

## **SET_VIEWERS_COUNT_TOGGLE**
Toggle viewers count display  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **SET_VOICE_CONTROL_STATE**
Set voice bot enabled/disabled state  
<details>
<summary>JSON params</summary>

```typescript
{
	enabled: boolean;
}
```

</details>

</details>

# Requesting data
<details>
<summary>Data you can request from Twitchat.</summary>

## **GET_AD_BREAK_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_AD_BREAK_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_ALL_COUNTERS**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_ANIMATED_TEXT_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Animated text overlay ID
	 */
	id: string;
}
```

</details>

## **GET_BINGO_GRID_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Bingo grid ID to get parameters for
	 */
	id: string;
}
```

</details>

## **GET_BITSWALL_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_BITSWALL_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_CHAT_COLUMNS_COUNT**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_CHAT_POLL_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_CHAT_POLL_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_COUNTER**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Counter ID to get value of
	 */
	id: string;
}
```

</details>

## **GET_CURRENT_TRACK**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_CUSTOM_TRAIN_DATA**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Custom train ID to get state for
	 */
	id: string;
}
```

</details>

## **GET_DISTORT_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Distortion overlay ID to get parameters for
	 */
	id: string;
}
```

</details>

## **GET_DONATION_GOALS_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Overlay ID to get parameters for
	 */
	id: string;
}
```

</details>

## **GET_ENDING_CREDITS_DATA**
<details>
<summary>JSON params</summary>

```typescript
{
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

## **GET_ENDING_CREDITS_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_GLOBAL_STATES**
Requests for global states  
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_LABEL_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Label ID
	 */
	id: string;
}
```

</details>

## **GET_LABEL_OVERLAY_PLACEHOLDERS**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_POLLS_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_POLLS_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_PREDICTIONS_OVERLAY_CONFIGS**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_PREDICTIONS_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_QNA_SESSION_LIST**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_TIMER**
<details>
<summary>JSON params</summary>

```typescript
{
	/**
	 * Timer ID to get configs for
	 */
	id: string;
}
```

</details>

## **GET_TIMER_LIST**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_TIMER_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_TRIGGER_LIST**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

## **GET_WHEEL_OVERLAY_PRESENCE**
<details>
<summary>JSON params</summary>

```
-none-
```

</details>

</details>

