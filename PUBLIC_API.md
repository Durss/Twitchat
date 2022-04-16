
<div align="center">
	<a href="https://twitchat.fr" target="_blank">
		<img width="400" alt="twitch" src="https://raw.githubusercontent.com/Durss/Twitchat/main/src/assets/logo.svg">
	</a>
	<br>
	<br>
	- <a href="https://twitchat.fr" target="_blank">twitchat.fr</a> -
</div>
<br>
<br>

Twitchat offers a websocket API through  [OBS-Websocket](https://github.com/obsproject/obs-websocket/releases) to control some features and receive some events.\

# Table of content
* [Prerequisites](#prerequisites)
* [Connect example](#connect-example)
  * [OBS-websocket](#obs-websocket)
  * [Available events and actions](#available-events-and-actions)
* [Events](#events)
* [Actions](#actions)


# Prerequisites
This API needs [OBS-Websocket](https://github.com/obsproject/obs-websocket/releases) V5 to be installed and running!\
\
After installing OBS-Websocket, start OBS, you may want set a password on `Tools -> obs-websocket Settings`.\
\
Once done, go on Twitchat, open the parameters and on the OBS panel specify the credentials to connect with OBS.\
\
OBS will act as a bridge to transmit Twitchat messages to any connected client.\

<br>

# Connect example
To connect with OBS-Websocket you can use the [obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js) package that already handles everything.\
\
Bellow is a typescript example to use the API via `OBS-Websocket`.\
The example refer to `TwitchatActionType` and `TwitchatEventType`. You can find their [signatures here](#available-events-and-actions).


## OBS-websocket

```typescript
import OBSWebSocket from 'obs-websocket-js';

const port:number = 4455;//Configure this
const pass:string "";//Configure this

const obs = new OBSWebSocket();

/**
 * Connect to OBS-websocket
 */
async function connect(port:string, pass:string):Promise<boolean> {
	try {
		await obs.connect("ws://127.0.0.1:"+port, pass, {rpcVersion:1});
	}catch(error) {
		setTimeout(()=> {
			//try again later
			connect(port, pass);
		}, 5000);
		return false;
	}
	obs.addListener("ConnectionClosed", ()=> {
		//Reconnect
		connect(port, pass);
	});

	//@ts-ignore ("CustomEvent" not yet declared in obs-websocket-js types. Need ts-ignore to avoid compilation error)
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

connect().then(()=> {
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
	| "MESSAGE_FILTERED"
	| "MESSAGE_DELETED"
	| "MESSAGE_FIRST"
	| "MESSAGE_FIRST_ALL_TIME"
	| "MESSAGE_WHISPER"
	| "FOLLOW"
	| "POLL_END"
	| "PREDICTION_END"
	| "MENTION"

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
	| "ACTIVITY_FEED_TOGGLE"
	| "VIEWERS_COUNT_TOGGLE"
	| "MOD_TOOLS_TOGGLE"
	| "CENSOR_DELETED_MESSAGES_TOGGLE";
```

# Events
List of the events fired by Twitchat you can listen to and the JSON data sent in parameters.


## **MESSAGE_READ**
Sent when clicking a message on the chat to mark it as read
```typescript
{
	channel:string,
	message:string,
	tags:any,//IRC tags data
}
```
## **MESSAGE_NON_FOLLOWER**
Sent when a non-follower sends a message
```typescript
{
	channel:string,
	message:string,
	tags:any,//IRC tags data
}
```
## **MESSAGE_FILTERED**
Sent when a message is filtered out.
If you don't want commands to be displayed on the chat, anytime a command is sent this event will be fired.
```typescript
{
	channel:string,
	message:string,
	tags:any,//IRC tags data
}
```
## **MESSAGE_DELETED**
Sent when a message is deleted.
```typescript
{
	channel:string,
	message:string,
	tags:any,//IRC tags data
}
```
## **MESSAGE_FIRST**
Sent when a user sends her/his first message of the stream *("Greet them" section)*.
```typescript
{
	channel:string,
	message:string,
	tags:any,//IRC tags data
}
```
## **MESSAGE_FIRST_ALL_TIME**
Sent when a user sends her/his first message on the channel.
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
		color: string,
		badges: any,//IRC parsed badges infos
		'display-name': string,
		'message-id': string,
	},
}
```
## **FOLLOW**
Sent when a user follows the channel
```typescript
{
	display_name: string,
	username: string,
	user_id: string,
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
## **POLL**
Sent when a poll starts, updates (when someone votes) and ends.
```typescript
{
	id: string,
	broadcaster_id: string,
	broadcaster_name: string,
	broadcaster_login: string,
	title: string,
	choices: {
				id: string,
				title: string,
				votes: number,
				channel_points_votes: number,
				bits_votes: number,
			},
	bits_voting_enabled: boolean,
	bits_per_vote: number,
	channel_points_voting_enabled: boolean,
	channel_points_per_vote: number,
	status: "ACTIVE" | "COMPLETED" | "TERMINATED" | "ARCHIVED" | "MODERATED" | "INVALID",
	duration: number,
	started_at: string,
	ended_at: string | undefined,
};
```
## **PREDICTION**
Sent when a prediction starts, updates (when someone votes) and ends.
```typescript
{
	id: string,
	broadcaster_id: string,
	broadcaster_name: string,
	broadcaster_login: string,
	title: string,
	outcomes: {
				id: string,
				title: string,
				users: number,
				channel_points: number,
				color:string,
				top_predictors:{
					id:string,
					name:string,
					login:string,
					channel_points_used:number,
					channel_points_won:number | undefined,
				},
			},
	prediction_window: number,
	status: "ACTIVE" | "RESOLVED" | "CANCELED" | "LOCKED",
	created_at: string,
	ended_at: string | undefined,
	locked_at: string | undefined,
}
```

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
## **ACTIVITY_FEED_TOGGLE**
Toggle activity feed's visibility
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