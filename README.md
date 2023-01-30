
<div align="center">
	<img src="https://shields.io/badge/vue-3-42b883?logo=Vue.js&labelColor=ffffff"> <img src="https://shields.io/badge/typescript-%3E=%204.5.4-3178c6?logo=TypeScript&labelColor=ffffff"> <img src="https://shields.io/badge/node-%3E=%2018.2.0-026e00?logo=node.js&labelColor=ffffff"> <img src="https://shields.io/badge/less-1d365d?logo=less&labelColor=ffffff&logoColor=000000">
	<br>
	<br>
	<br>
	<br>
</div>

<div align="center">
	<a href="https://twitchat.fr" target="_blank">
		<img width="400" alt="twitchat" src="https://raw.githubusercontent.com/Durss/Twitchat/main/src_front/assets/logo.svg">
	</a>
	<br>
	<br>
	- <a href="https://twitchat.fr" target="_blank">twitchat.fr</a> -
	<br>
	- <a href="https://discord.gg/fmqD2xUYvP1" target="_blank">Join discord</a> -
	
</div>
<br>
<br>
A custom twitch chat that aims to fill gaps in the official Twitch chat for streamers.
<br>
The main goal is to follow your chat as best as possible.
<br>
<br>

For developpers, **Twitchat exposes an API** to receive events and control some features remotely.\
[📖 Read its documentation](PUBLIC_API.md).
<br>
<br>
<br>

# Features
- [x] Enable an emergency button with custom actions to prevent from follow bots and doxxing
- [x] Create your own sub/follow/rewards/poll/... alerts and chat commands with the Trigger system that allows to control your OBS sources and filters as well as Spotify or Deezer when an event occurs
- [x] Control Twitchat and create polls or predictions with your voice
- [x] Read your messages and alerts out loud thank to the include text-to-speech
- [x] Pin messages and find them back later
- [x] Display the first message of users seperatly so you don't forget to greet them
- [x] Show any message of your chat on your stream with a single click
- [x] Stream Deck™ plugin
- [x] Custom spoiler feature so viewers can hide message contents to the streamer
- [x] Alert command to make Twitchat shake, blink, emit sound and display a message over everything else
- [x] Edit your stream's info from Twitchat with possibility to create pressets
- [x] Create a timer or a countdown with a simple command and show it on your stream
- [x] Control spotify or deezer from chat commands *(create your own song request system)* and show currently playing track on your stream
- [x] Make it easier to follow a conversation between users
- [x] Remember where you stopped reading the chat by clicking any message
- [x] Track a user to make sure not to miss their messages
- [x] Create a raffle and pick random winners. An overlay is available to display a wheel that selects a winner.
- [x] Create a bingo in which users have to find a number or an emoji
- [x] Ask your viewers for suggestions with a dedicated command
- [x] See if a user is not following the channel
- [x] Display received whispers and answer them
- [x] Filter some messages *(bots, commands, self, /me, etc...)*
- [x] Customize messages display *(remove badges, show minimalist badges, remove emotes)*
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
- [x] BTTV, FFZ and 7TV emotes supported
- [x] Message autocomplete nickname via "@", emotes via ":", commands via "/" or all via TAB key
- [x] Allow to search on all messages via command `/search`
- [x] Split view in half with chat on left and notifications/activity feed, new viewers, etc.. on the right
- [x] Filter out only specific commands
- [x] See live viewers count
- [x] Keep or remove deleted messages
- [x] See all your followings that are live to raid them easily
- [x] Supports boost trains
- [x] Supports `/announce message` feature
- [x] Allow your mods to control your OBS scenes or mute/unmute your mic from chat
- [x] Expose an API to control some stuff remotely
- [x] Chat suggestion feature: allow your viewers to give suggestions with a dedicated command and randomly pick one of them
- [x] Handles "low trust" feature ([more info](https://help.twitch.tv/s/article/ban-evasion))
- [x] And many other things....
<br>
<br>
<br>
<br>

# Project setup
First create a `credentials.json` file on the root directory and fill in these values :
```json
{
	"server_port": 3018,
	"admin_ids": ["YOUR_TWITCH_USER_ID"],
	"csrf_key": "",

	"twitch_client_id": "",
	"twitch_client_secret": "",
	"twitch_redirect_uri": "http://localhost:8080/oauth",
	"twitch_scopes": [
		"chat:read",
		"chat:edit",
		"channel:read:redemptions",
		"channel:manage:polls",
		"channel:manage:predictions",
		"moderator:manage:announcements",
		"moderator:manage:chat_messages",
		"moderator:manage:chat_settings",
		"channel:moderate",
		"moderation:read",
		"channel:manage:moderators",
		"channel:manage:vips",
		"channel:manage:raids",
		"channel:manage:broadcast",
		"channel:read:hype_train",
		"channel:edit:commercial",
		"channel:read:subscriptions",
		"channel:read:goals",
		"user:read:follows",
		"user:read:blocked_users",
		"user:manage:blocked_users",
		"moderator:manage:banned_users",
		"whispers:read",
		"user:manage:whispers",
		"moderator:manage:automod",
		"moderator:read:chatters",
		"moderator:manage:shield_mode"
	],
	
	"spotify_client_id": "",
	"spotify_client_secret": "",
	"spotify_scopes": "user-read-currently-playing user-modify-playback-state playlist-read-private",
	"spotify_redirect_uri": "http://localhost:8080/spotify/auth"
}
```
Create a [twitch application](https://dev.twitch.tv/console) and fill in the `client_id` and `client_secret` values.\
Write anything in the `csrf_key` field, it will be used to secure twitch authentication from CSRF attacks.\
Configure the redirect URI of the twitch application with your localhost and/or production URI.\
Set it as the `redirect_uri` value of the credentials.\
The `redirect uri` must end with `/oauth`, example :
```
http://localhost:8080/oauth
```
You can also create a [spotify application](https://developer.spotify.com/dashboard) and fill in the spotify `spotify_client_id` and `spotify_client_secret`
<br>
By default the server listens on port 3018, you can change it on `credentials.json` and `src_front/utils/Config.ts`.

<br>
<br>
<br>

# Environment setup
This project has been coded with VSCode with Volar plugin.\
It is recommended to install these plugins:\
Vue Language Features (Volar): https://marketplace.visualstudio.com/items?itemName=Vue.volar

TypeScript Vue Plugin: https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin

I18n-ally Plugin: https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally

For correct typings and better lint performance, it is advised to the enable the `Take over mode` by disabling the native VSCode's Typescript and Javascript features.
[Read how to](https://github.com/johnsoncodehk/volar/discussions/471).
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
npm run dev
```

### Compiles and minifies for production
```
npm run build
```

### Run server
```
node server/boostrap.js
```
<br>
<br>
<br>

# Install server
[Compile the project](#compile-project) and push the content of the `server` folder on your server.\
Next to this file, create a `dist` folder and push the content of your local `dist` folder inside it.\
Also add the `credentials.json` file at the root of the project.\
Create an `env.conf` file, just write `prod` inside, and push it at the root of the project.\
Install all the production dependencies and [run the server](#run-server).
\
Here is the expected file structure:\
─ root\
  ├─ node_modules/\
  ├─ dist/\
  ├─ controllers/\
  ├─ utils/\
  ├─ bootstrap.js\
  ├─ env.conf\
  ├─ credentials.json\
<br>
<br>
<br>

# Localization
App labels can be found under `i18n` folder.\
They are splitted by language then by sections.\
Any new file or folder structure can be added to this.\
These are all merged into `public/labels.json` during the build process.\
Files can have any name but should have full JSON structure so the plugin i18n-ally can check for label keys on the code.
Example:\
```
─ en\
  ├─ global.json\
  ├─ subFolder/\
  ├─── hello.json/\
```
`global.json` example:
```json
{
	"global":{
		"hello":"World"
	}
}
```
`hello.json` example:
```json
{
	"subFolder":{
		"hello":{
			"lorem":"ipsum dolor sit amet"
		}
	}
}
```
Will output this JSON file:
```json
{
	"en":{
		"global":{
			"hello":"World"
		},
		"subFolder":{
			"hello":{
				"lorem":"ipsum dolor sit amet"
			}
		}
	}
}
```
\
To make localization easier you can start the following PM2 process that will watch for any file change under `i18n` folder and rebuild the `labels.json` file.
```
pm2 start labels-pom2/json
```
Labels won't automatically be updated on the frontend though _(if anyone knows how to make Vite detect that...)_. To force labels refresh you can use this keyboard shortcut on Twitchat `CTRL+Shift+L`
<br>
<br>
<br>

# Package Stream Deck™ plugin
Run the following command:
```
npm run streamdeck_package
```
The file, compiled plugin will be there `streamdeck_plugin/fr.twitchat.streamDeckPlugin`.
<br>
<br>
<br>

# TODO
- [x] Review the filtering logic of the messages so they're not the ones responsible to decide their own visibility
- [x] Rebuild server with typescript
- [x] WIP: Make a MASSIVE refactoring to abstract twitch's data model throughout the codebase to make other services (youtube, tiktok, ...) easier to add to twitchat.