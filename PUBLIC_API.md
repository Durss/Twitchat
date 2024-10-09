
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

Twitchat offers a websocket API through  [OBS-Websocket](https://github.com/obsproject/obs-websocket/releases/tag/5.0.0-beta1) to control some features and receive some events.

# WARNING
This documentation needs to be updated !\
It's missing many things and may contain outdated other things.

<br>
<br>

# Table of content
* [Prerequisites](#prerequisites)
* [Connect example](#connect-example)
  * [OBS-websocket](#obs-websocket)
  * [Available events and actions](#available-events-and-actions)
* [Events](#events)
* [Actions](#actions)


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
<br>
<br>
<br>
<br>
<br>
<br>
<br>


# Connect example
To connect with OBS-Websocket you can use the [obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js) package that already handles everything.\
\
Bellow is a typescript example to use the API via `OBS-Websocket-js`.\
The example refers to `TwitchatActionType` and `TwitchatEventType`.\
You can find their [signatures here](#available-events-and-actions).
<br></br>

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

	//"CustomEvent" not yet declared in obs-websocket-js types. Need @ts-ignore to avoid lint/compile errors
	//@ts-ignore
	obs.on("CustomEvent", (e:{origin:"twitchat", type:TwitchatEventType, data:unknown}) => onTwitchatEvent(e))
	return true;
}

/**
 * Send a message to Twitchat
 */
function sendMessage(type:TwitchatActionType, data:unknown):Promise<void> {
	const eventData = { origin:"twitchat", type, data };
	obs.call("BroadcastCustomEvent", {eventData});
}

/**
 * Called when receiving a message from Twitchat
 */
function onTwitchatEvent(e:{origin:"twitchat", type:TwitchatEventType, data:unknown}):void {
	if(e.type == undefined) return;
	//Ignore any message not coming from twitchat
	if(e.origin != "twitchat") return;

	console.log(`Twitchat event ${e.type} received !`);
	console.log(e.data);//JSON data of the event

	//Example
	if(e.type == "MESSAGE_NON_FOLLOWER") {
		console.log(`The user ${e.data.tags.username} is not following the channel and sent this message : ${e.data.message}`)
	}
}

connect(ip, port pass).then(()=> {
	//Marks 1 message as read in the "Greet them section"
	sendMessage("GREET_FEED_READ", {count:1});
});
```

## Available events and actions
Here are the types signatures used on the above examples
```typescript
//Events fired by Twitchat
export type TwitchatEventType =
	"MESSAGE_READ"
	| "MESSAGE_NON_FOLLOWER"
	| "MESSAGE_DELETED"
	| "MESSAGE_FIRST"
	| "MESSAGE_FIRST_ALL_TIME"
	| "MESSAGE_WHISPER"
	| "FOLLOW"
	| "MENTION"
	| "CURRENT_TRACK"
	| "TRACK_ADDED_TO_QUEUE"
	| "RAFFLE_CREATE",
	| "RAFFLE_STOP",
	| "RAFFLE_RESULT",
	| "COUNTDOWN_COMPLETE"
	| "COUNTDOWN_START"
	| "TIMER_START"
	| "TIMER_STOP"
	| "TIMER_OVERLAY_PRESENCE"
	| "WHEEL_OVERLAY_PRESENCE"
	| "EMERGENCY_MODE"
	| "CHAT_HIGHLIGHT_OVERLAY_PRESENCE"
	| "VOICEMOD_CHANGE"

//Actions you can request to Twitchat
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
	| "VIEWERS_COUNT_TOGGLE"
	| "MOD_TOOLS_TOGGLE"
	| "CENSOR_DELETED_MESSAGES_TOGGLE"
	| "GET_CURRENT_TRACK"
	| "WHEEL_OVERLAY_START"
	| "GET_WHEEL_OVERLAY_PRESENCE"
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
	| "CUSTOM_CHAT_MESSAGE"
	| "ENABLE_STT"
	| "DISABLE_STT"
```
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>


# Events
List of the events fired by Twitchat you can listen to and the JSON data sent in parameters.


## **MESSAGE_READ**
Sent when clicking a message on the chat to mark it as read.
Only sent for users' messages and whispers.
Poll results, sub/bits/.. alerts, notices, etc... won't fire this event
```typescript
{
	channel:string,
	message:string,
}
```
## **MESSAGE_NON_FOLLOWER**
Sent when a non-follower sends a message
```typescript
{
	channel:string,
	message:string,
	user: {
		id:string,
		login:string,
		displayName:string,
	}
}
```
## **MESSAGE_DELETED**
Sent when a message is deleted.
```typescript
{
	channel:string,
	message:string,
	user: {
		id:string,
		login:string,
		displayName:string,
	}
}
```
## **MESSAGE_FIRST**
Sent when a user sends their first message of the stream *("Greet them" section)*.
```typescript
{
	channel:string,
	message:string,
	tags:any,//IRC tags data
}
```
## **MESSAGE_FIRST_ALL_TIME**
Sent when a user sends their first message on the channel.
```typescript
{
	channel:string,
	message:string,
	tags:any,//IRC tags data
}
```
## **MESSAGE_WHISPER**
The actual message received isn't sent for privacy reasons.
```typescript
{
	unreadCount:number,//Number of unread whispers
	user:{
		id: string,
		login: string,
		displayName: string,
	},
}
```
## **FOLLOW**
Sent when a user follows the channel
```typescript
{
	user: {
		id: string,
		login: string,
		displayName: string,
	}
}
```
## **POLL_PROGRESS**
Sent when a poll starts, updates (when someone votes) and ends.
```typescript
{
	channel_id: string;
	id: string,
	duration_s: number,
	started_at: number,
	ended_at?: number,
	choices: {
		id: string,
		label: string,
		votes: number,
	}[],
	winner?:{
		id: string,
		label: string,
		votes: number,
	},
};
```
## **PREDICTION_PROGRESS**
Sent when a prediction starts, updates (when someone votes) and ends.
```typescript
{
	channel_id: string,
	title: string,
	duration_s: number,
	outcomes: {
		id: string;
		label: string;
		votes: number;
		voters: number;
	}[],
	pendingAnswer: boolean,
	started_at: number,
	ended_at?: number,
	winner?:{
		id: string;
		label: string;
		votes: number;
		voters: number;
	},
}
```
## **MENTION**
Called when a message contains a mention of your nickname
```typescript
{
	display_name: string,
	username: string,
	user_id: string,
}
```
## **CURRENT_TRACK**
Sent when a new track is playing on spotify or when playback is stopped
```typescript
{
	trackName:string,
	artistName:string,
	trackDuration:number,
	trackPlaybackPos:number,
	cover:string,
}
```
## **TRACK_ADDED_TO_QUEUE**
Sent when a new track is added to the queue\
### JSON param
```typescript
{
	title:string,
	artist:string,
	album:string,
	cover:string,
	duration:number,
	url:string,
}
```
## **RAFFLE_RESULT**
Sent when a raffle completes
### JSON param
```typescript
{
	winner:{
		label:string;
		id:string;//user ID in case of a chat raffle
		score:number;//Score value if using ponderation options
	},
}
```
## **COUNTDOWN_START**
Sent when a countdown start
### JSON param
```typescript
{
	startAt:string,//formated date
	startAt_ms:number,//Timestamp in ms
	duration:number,//Duration formated
	duration_ms:number,//Duration in ms
}
```
## **COUNTDOWN_COMPLETE**
Sent when a countdown completes
### JSON param
```typescript
{
	startAt:string,//formated date
	startAt_ms:number,//Timestamp in ms
	endAt:string,//formated date
	endAt_ms:number,//Timestamp in ms
	duration:number,//Duration formated
	duration_ms:number,//Duration in ms
}
```
## **TIMER_START**
Sent when a timer is started
### JSON param
```typescript
{
	startAt:number,//Timestamp in ms
}
```
## **TIMER_STOP**
Sent when stoping a timer
### JSON param
```typescript
{
	startAt:number,//Timestamp in ms
	stopAt:number,//Timestamp in ms
}
```
## **TIMER_OVERLAY_PRESENCE**
Sent when a timer overlay advertises its presence
### JSON param *(optional)*
```typescript
-none-
```
## **WHEEL_OVERLAY_PRESENCE**
Sent when a wheel overlay advertises its presence
### JSON param *(optional)*
```typescript
-none-
```
## **EMERGENCY_MODE**
Sent when the emergency mode is started or stopped
### JSON param *(optional)*
```typescript
{
	enabled:boolean
}
```
## **CHAT_HIGHLIGHT_OVERLAY_PRESENCE**
Sent when a chat highlight overlay advertises its presence
### JSON param *(optional)*
```typescript
{
	enabled:boolean
}
```
## **VOICEMOD_CHANGE**
Sent when changing voicemod voice effect
### JSON param
```typescript
{
	voice:string
}
```
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>

# Actions
List of actions you can request Twitchat to perform.\

## **GREET_FEED_READ**
Marks "`count`" messages as read in the "Greet them" section.\
*Default value = 1*
### JSON param *(optional)*
```typescript
{
	"count": number,
}
```
## **GREET_FEED_READ_ALL**
Marks all the messages as read in the "Greet them" section
### JSON param
```
-none-
```

## **CHAT_FEED_READ**
Marks "`count`" messages as read in the chat feed.\
`count` value can be negative to move the read mark back.
*Default value = 1*
### JSON param *(optional)*
```typescript
{
	"count": number,
}
```
## **CHAT_FEED_READ_ALL**
Marks all the messages as read in the chat feed.
### JSON param
```
-none-
```
## **CHAT_FEED_PAUSE**
Pauses the chat
### JSON param
```
-none-
```
## **CHAT_FEED_UNPAUSE**
Resumes the chat by scrolling back to bottom
### JSON param
```
-none-
```
## **CHAT_FEED_SCROLL_UP**
Scroll the chat feed up by the number of pixels specified in the `scrollBy` value.\
*Default value = 100*
### JSON param *(optional)*
```typescript
{
	"scrollBy":number
}
```
## **CHAT_FEED_SCROLL_DOWN**
Scroll the chat feed down by the number of pixels specified in the `scrollBy` value.\
*Default value = 100*
### JSON param *(optional)*
```typescript
{
	"scrollBy":number
}
```
## **POLL_TOGGLE**
Toggle current poll's visibility
### JSON param *(optional)*
```typescript
-none-
```
## **PREDICTION_TOGGLE**
Toggle current prediction's visibility
### JSON param *(optional)*
```typescript
-none-
```
## **BINGO_TOGGLE**
Toggle current bingo's visibility
### JSON param *(optional)*
```typescript
-none-
```
## **RAFFLE_TOGGLE**
Toggle current raffle's visibility
### JSON param *(optional)*
```typescript
-none-
```
## **VIEWERS_COUNT_TOGGLE**
Toggle viewer count's visibility
### JSON param *(optional)*
```typescript
-none-
```
## **MOD_TOOLS_TOGGLE**
Toggle moderation tools' visibility
### JSON param *(optional)*
```typescript
-none-
```
## **CENSOR_DELETED_MESSAGES_TOGGLE**
Toggle the censorship of the deleted messages\
If censorship is enabled, deleted messages content is replaced by `<deleted message>`.
### JSON param *(optional)*
```typescript
-none-
```
## **GET_CURRENT_TRACK**
Request the currently playing spotify track\
### JSON param *(optional)*
```typescript
-none-
```
## **WHEEL_OVERLAY_START**
Start a wheel animation.
### JSON param *(optional)*
`items` contains the list of wheel items to display on the wheel. There must be between 1 and an infinity of items.\
`winner` param is the `id` of the entry the wheel should stop to.
```typescript
{
	items:[
		{
			id:string;
			label:string;
			data:any;
		},
		//...
	],
	winner:string;
}
```
## **GET_WHEEL_OVERLAY_PRESENCE**
Ask of a wheel overlay exists.\
If it does you'll receive the `WHEEL_OVERLAY_PRESENCE` event.
### JSON param *(optional)*
```typescript
-none-
```
## **GET_CURRENT_TIMERS**
Request current timer / countdown values\
If it does you'll receive the `TIMER_START` nor `COUNTDOWN_START` event.
### JSON param *(optional)*
```typescript
-none-
```
## **GET_TIMER_OVERLAY_PRESENCE**
Ask if a timer overlay exists.\
If it does you'll receive the `TIMER_OVERLAY_PRESENCE` event.
### JSON param *(optional)*
```typescript
-none-
```
## **SET_EMERGENCY_MODE**
Starts or stops the emergency mode.
If no JSON is given it will simply toggle the current state
### JSON param *(optional)*
```typescript
{
	enabled:boolean
}
```
## **GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE**
Ask if a chat highlight overlay exists.\
If it does you'll receive the `CHAT_HIGHLIGHT_OVERLAY_PRESENCE` event.
### JSON param *(optional)*
```typescript
-none-
```
## **SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE**
Send a chat message on the "chat highlight" overlay
Send no data to hide the current message
### JSON param
```typescript
{
	message: string;//Message with emotes parsed as HTML tags
	user:{
		id: string;
		login: string;
		display_name: string;
		type: string;
		broadcaster_type: string;
		description: string;
		profile_image_url: string;
		offline_image_url: string;
		created_at: string;
	},
	params:{
		position:"tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	}
}
```
## **SHOW_CLIP**
Send a clip to be displayed on the chat highlight overlay
### JSON param
```typescript
{
	//This is the same JSON as the one sent by the Twitch API
	clip:{
		broadcaster_id: string;
		broadcaster_name: string;
		created_at: string;
		creator_id: string;
		creator_name: string;
		duration: number;
		embed_url: string;
		game_id: string;
		id: string;
		language: string;
		thumbnail_url: string;
		title: string;
		url: string;
		video_id: string;
		view_count: number;
	},
	params:{
		position:"tl"|"t"|"tr"|"l"|"m"|"r"|"bl"|"b"|"br";
	}
}
```
## **START_EMERGENCY**
Starts the emergency mode as the user clicked the emergency button
### JSON param *(optional)*
```typescript
-none-
```
## **STOP_EMERGENCY**
Stop the emergency mode
### JSON param *(optional)*
```typescript
-none-
```
## **SHOUTOUT**
Sends a shoutout to the latest raider
### JSON param *(optional)*
```typescript
-none-
```
## **STOP_TTS**
Stops any currently playing text to speech audio
### JSON param *(optional)*
```typescript
-none-
```
## **ENABLE_STT**
Enabled the speech recognition to control twitchat with your voice
### JSON param *(optional)*
```typescript
-none-
```
## **DISABLE_STT**
Disable the speech recognition
### JSON param *(optional)*
```typescript
-none-
```
## **CUSTOM_CHAT_MESSAGE**
Send chat notifications only visible by you on Twitchat.\
The `icon` props can have one of those values:
```
ad add alert animate announcement anon api automod badge ban bingo bits block boost bot broadcast broadcaster change channelPoints chatCommand chatPoll checkmark clearChat click clip coffee coin color commands conversation copy count countdown credits cross date debug delete dice discord donor download dragZone easing edit elevated elgato emergency emote enter filters firstTime fix follow follow_outline font fontSize fullscreen gift github goxlr goxlr_bleep goxlr_fx hand heat help hide highlight history hypeChat idea info internet kofi leave list live loader lock loop magnet markRead max merge microphone microphone_mute microphone_recording min minus mod move music mute newtab next noMusic notification number obs offline online orderable overlay params partner patreon pause paypal pin pipette placeholder play poll polygon prediction premium presentation press prev prime pros qna raid read refresh reply returning reward_highlight rightClick rotate save scale scroll scrollDown scrollUp search shadow shield shieldMode shoutout show skip slow spotify stars stop sub test thickness ticket tiktok timeout timer train train_boost translate trash tts twitch twitchat twitter ulule unban unblock unfollow unlock unmod unmute unpin unvip update upload url user vibrate vip voice voicemod volume watchStreak whispers youtube
```
### JSON param *(all props are optional)*
```typescript
{
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
}
```
