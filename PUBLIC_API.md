
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

Twitchat offers a websocket API through  [OBS-Websocket](https://github.com/obsproject/obs-websocket/releases) to control some features and receive some events.

# Table of content
* [Prerequisites](#prerequisites)
* [Connect example](#connect-example)
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
Bellow is an example to connect to OBS-Websocket.
There's an example 

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

		console.log(`Twitchat event ${e.type} received !`)
	}

connect();

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
	| "ACTIVITY_FEED_TOGGLE"
	| "VIEWERS_COUNT_TOGGLE"
	| "MOD_TOOLS_TOGGLE";
```

# Events
List of the events fired by Twitchat you can listen to.\
_--**TODO**--_

# Actions
List of actions you can request Twitchat to perform.\
_--**TODO**--_