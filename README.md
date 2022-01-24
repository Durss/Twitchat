
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
This is a custom twitch chat that aims to fill gaps in the official Twitch chat mostly for streamers.
<br>
The main goal is to reduce as much as possible the number of missed messages and better understand conversations between users.
<br>
<br>
<div align="center"><a href="https://raw.githubusercontent.com/Durss/Twitchat/main/preview.png" target="_blank"><img width="100%" alt="twitch" src="https://raw.githubusercontent.com/Durss/Twitchat/main/preview.png"></a></div>
<br>
<br>
<br>

# Features
- [x] Display the first message of users seperatly
- [x] Make it easier to follow a conversation between users
- [x] Allow to filter some messages *(bots, commands, self, etc...)*
- [x] Customizable message features *(remove badges, show minimalist badges, remove emotes, etc...)*
- [x] Customizable message appearance by roles *(viewers, mods, vips, subs)*
- [x] Display mod actions *(ban, timeout, delete message)*
- [x] Handle automod allow/deny flow
- [x] Pause chat autoscroll if scrolling it up
- [x] Possibility to connect to any channel without authentication to use it as OBS overlay
- [x] Display when it's the first message ever of a user on the channel
- [x] Display mod notifications
- [x] Display sub/bits/raid/reward messages
- [x] Highlight messages by roles *(mods, vips, subs)*
- [x] Create/Delete polls
- [x] Create/Delete predictions
- [x] Flag a message as "read" and scroll back to it easily

- [ ] Highlight a user temporarilly *(to make sure not to miss an answer)*
- [ ] Filter all commands but a custom list
- [ ] Expose an API to control some stuff remotely(?)
- [ ] Allow to read whispers
- [ ] Make it possible to define configurations via query params for OBS chats
- [ ] Parse BTTV and FFZ emotes
- [ ] Request scopes on-demand
- [ ] Autocomplete comands
- [ ] Emotes selector (in progress)
<br>
<br>
<br>

# Project setup
First create a `credentials.json` file on the root directory and fill in these values :
```json
{
	"client_id": "",
	"client_secret": "",
	"redirect_uri": "http://localhost:8080/oauth",
	"scopes": [
		"chat:read",
		"chat:edit",
		"channel:read:redemptions",
		"channel:moderate",
		"moderation:read",
		"moderator:manage:automod",
		"channel:manage:polls",
		"channel:manage:predictions",
		"channel:read:hype_train",
		"channel_editor"
	]
}
```
Create a [twitch application](https://dev.twitch.tv/console) and fill in the `client_id` and `client_secret` values.\
Configure the redirect URI of the twitch application with your localhost and/or production URI.\
Set it as the `redirect_uri` value of the credentials.\
The `redirect uri` must end with `/oauth`, example :
```
http://localhost:8080/oauth
```
<br>
By default the server listens on port 3018, you can change it on `server.js` and `src/utils/Config.ts`.
<br>
<br>
<br>

# Compile project
### Install dependencies
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Run server
```
node server.js
```
<br>
<br>

# Server
The server is super basic for now as there isn't much needs.
For this reason it's a just a single file server coded in vanila JS that doesn't need any compilation. That might change in the futur.
