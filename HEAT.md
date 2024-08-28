
# Heat overlay made easy
Twitchat provides a [Heat](https://dashboard.twitch.tv/extensions/cr20njfkgll4okyrhag7xxph270sqk) integration to make it dead easy to create custom experiences based on users clicks on your stream.

# Context
Twitchat allows you to detect clicks on custom shape areas or OBS sources.\
But Twitchat also does something clever to make it easier for developers to interact with Heat. It computes coordinates relative to browser sources and send them that coordinate.

## Problem
When a user clicks on your stream, Heat sends the position of the click in percent of the screen size.\
BUT, suppose you have a browser source that listens for those events, for the coordinate system to work properly the browser source must be placed at the very top left of the screen and it ideally must fill the entire screen space.\
If the source is not placed at the top left, is scaled or is rotated, the received coordinate will be completely wrong.

## Solution
If Twitchat is connected with Heat and OBS, it will let any browser source know when and WHERE it has been clicked.\
This first means that you don't have to handle the websocket communication.\
But, **more importantly**, Twitchat will compute the coordinates of the click relative to the browser source.

What this means is that, no matter where the browser source is placed, if its scaled or if its rotated, the page will receive click coordinates that take care of these transforms.\
You also be given the scale and rotation of the source inf the global space if you need to adjust things.s

## How to
To get Heat clicks you only have to listen for the `heat-click` event this way:
```javascript
window.addEventListener("heat-click", event => {
	const px = event.detail.x * document.body.clientWidth;
	const py = event.detail.y * document.body.clientHeight;
	console.log(`Pos X: ${px}px`);
	console.log(`Pos Y: ${py}px`);
});
```

### 🚨 IMPORTANT 🚨
This event is emitted to the page thanks to OBS-websocket but it comes with a limitation. OBS-websocket doesn't allow to send this to only one specific browser source. It sends this to ALL available browser sources.\
This means that if another browser source is clicked, yours will also received the event.

To check if the event received is for your specific page, a hash of the URL of the clicked browser source is given in parameters of the event.\
You just need to compare that hash to the same hash for your page. If it's the same, the event is for you.

# Full example
```javascript
/**
 * Computes a SHA256
 */
async function sha256(input) {
	const data = new TextEncoder().encode(input);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
	return hashHex;
}

/**
 * Called when any browser sources is clicked via Heat
 */
window.addEventListener("heat-click", async (event) => {
	//Compute hash of the current page URL
	const hash = await sha256(document.location.href);

	//Check if the given hash matches the local hash.
	//If not, stop there.
	if(event.detail.page != hash) return;

	//Compute click coordinates in pixels on the local space
	const px = event.detail.x * document.body.clientWidth;
	const py = event.detail.y * document.body.clientHeight;
}
```

List of all available event properties:
```javascript
event.detail.id//ID of the click
event.detail.x//X coordinates in percent relative to top left of the source (rotation, scaling, nesting of the OBS source pre-computed)
event.detail.y//Y coordinates in percent relative to top left of the source (rotation, scaling, nesting of the OBS source pre-computed)
event.detail.scaleX//X scale of the browser source
event.detail.scaleY//Y scale of the browser source
event.detail.rotation//Rotation angle of the browser source in degrees

event.detail.channelId//id of the channel that triggered the click
event.detail.anonymous//is click anonymous?
event.detail.uid//User ID (anonymized one if user is anonymous)
event.detail.login//User login (if not anonymous)
event.detail.isSub//Is user a subscriber of the channel
event.detail.isBan//Is user banned on the channel
event.detail.isMod//Is user a moderator of the channel
event.detail.isVip//Is user a VIP on the channel
event.detail.isBroadcaster//Is user the broadcaster
event.detail.isFollower//Is user a follower of the channel
event.detail.followDate//following date of the user if their a follower (timestamp in milliseconds)

event.detail.shift//Shift key pressed ?
event.detail.alt//Alt key pressed ?
event.detail.ctrl//Ctrl key pressed ?

event.detail.page//Sha256 of the clicked browser source URL
event.detail.testMode//Is click simulated from Twitchat ?
event.detail.twitchatOverlayID//Optional overlay ID sent for some specific overlays
```

### Side note:
The hash received is the hash of what's written on the URL field of the browser source. If the protocol *(http(s)://)* is missing, the hash will be computed without it which will differ from the one computed locally.\
Also, if the browser source URL redirects to another URL, the hash won't match the new URL.\
There's sadly no way to know the actual URL of a browser source, only the one configured on its parameters.

### Why that hash stuff?
Simmply to avoid leaking URLs to other browser sources.\
When a browser source is clicked, its hash is sent to all the available browser sources. If it was the URL instead of a hash of it, every browser sources would know the URL. If that URL contains confidential data like credentials, they would be leaked, which is not something we want.
