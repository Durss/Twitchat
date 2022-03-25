
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
<br>

# Features
- [x] Display the first message of users seperatly so you don't forget to greet them
- [x] Make it easier to follow a conversation between users
- [x] Remember where you stopped reading the chat by clicking any message
- [x] Track a user to make sure not to miss her/his messages
- [x] Create a raffle with the viewers and pick random winners
- [x] Create a bingo in which users have to find a number or an emoji
- [x] See if a user is not following the channel
- [x] Display received whispers and answer them
- [x] Filter some messages *(bots, commands, self, /me, etc...)*
- [x] Customize messages *(remove badges, show minimalist badges, remove emotes)*
- [x] Customize messages appearance by roles *(viewers, mods, vips, subs)*
- [x] Moderate messages *(ban, timeout, delete message)*
- [x] Allow/deny messages blocked by automod
- [x] Display when it's the first message ever of a user on the channel
- [x] Display mod notifications on chat (ex: "User XXX has been banned by YYY")
- [x] Display sub/bits/raid/reward/follow notifications
- [x] Display hype train status
- [x] Show the last stream info of a raider
- [x] Integrated activity feed to see subs/cheers/follows/raids/rewards history
- [x] Create/Delete polls
- [x] Create/Delete predictions
- [x] Emote selector 
- [x] BTTV emotes supported
- [x] Message autocomplete nickname via "@", emotes via ":", commands via "/" or all via TAB key
- [x] Allow to search on all messages via command `/search`
- [x] Split view in half with chat on left and notifications/activity feed, new viewers, etc.. on the right
- [x] Filter out only specific commands
- [x] See live viewers count
- [x] Keep or remove deleted messages
- [x] See all my followings that are live to raid them easily
- [x] Supports new boost trains
<br>

- [ ] Expose an API to control some stuff remotely(?)
- [ ] Parse FFZ emotes
- [ ] Request scopes on-demand
- [ ] Handle new "low trust" feature *(Done but no available scope to actually receive the messages)*.
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
		"channel_editor",
		"whispers:edit",
		"user:read:follows"
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
