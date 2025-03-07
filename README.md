
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
	- <a href="https://discord.gg/fmqD2xUYvP" target="_blank">Join discord</a> -

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
- [x] Create your own sub/follow/rewards/poll/... alerts and chat commands with the Trigger system that allows to control your OBS sources and filters as well as Spotify when an event occurs
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
- [x] Control spotify from chat commands *(create your own song request system)* and show currently playing track on your stream
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
Create a `data/credentials/credentials.json` file and set the following content after filling values :
```json
{
	"server_port": 3018,
	"admin_ids": ["YOUR_TWITCH_USER_ID"],
	"csrf_key": "",

	"twitch_client_id": "",
	"twitch_client_secret": "",
	"twitch_redirect_uri": "http://localhost:8081/oauth",
	"twitch_scopes": [
		"chat:read+user:read:chat",
		"chat:edit+user:write:chat",
		"moderator:manage:announcements",
		"moderator:manage:chat_messages",
		"moderator:manage:shoutouts",
		"whispers:read",
		"user:manage:whispers",
		"moderator:read:chatters",
		"channel:read:redemptions",
		"channel:manage:redemptions",
		"channel:manage:polls",
		"channel:manage:predictions",
		"moderator:manage:chat_settings",
		"channel:moderate",
		"channel:manage:moderators",
		"channel:manage:vips",
		"channel:manage:raids",
		"channel:manage:broadcast",
		"channel:read:hype_train",
		"channel:edit:commercial",
		"channel:read:subscriptions",
		"user:read:emotes",
		"user:read:follows",
		"moderator:read:followers",
		"user:read:moderated_channels",
		"user:read:blocked_users",
		"user:manage:blocked_users",
		"user:edit:broadcast",
		"moderator:manage:banned_users",
		"moderator:manage:automod",
		"moderator:manage:shield_mode",
		"moderator:manage:unban_requests",
		"clips:edit",
		"channel:read:ads",
		"channel:manage:ads",
		"moderator:manage:blocked_terms",
		"moderator:manage:warnings",
		"moderator:read:moderators",
		"moderator:read:vips",
		"moderator:read:suspicious_users",
		"bits:read"
	],

	"spotify_client_id": "",
	"spotify_client_secret": "",
	"spotify_scopes": "user-read-currently-playing user-modify-playback-state playlist-read-private playlist-modify-public playlist-modify-private",
	"spotify_redirect_uri": "http://localhost:8081/spotify/auth",

	"patreon_client_id": "",
	"patreon_client_secret": "",
	"patreon_scopes": "identity campaigns campaigns.members w:campaigns.webhook",
	"patreon_redirect_uri": "http://localhost:8081/patreon/auth",

	"patreon_client_id_server": "",
	"patreon_client_secret_server": "",
	"patreon_redirect_uri_server": "http://localhost:3018/api/patreon/serverauth",
	"patreon_webhook_secret": "",
	"patreon_cipherKey":"", //64 chars hexadecimal
	"patreon_webhook_url":"https://your_domain.com/api/patreon/user/webhook/{ID}",

	"tenor_secret": "",
	"youtube_key": "path/to/key.json",
	"youtube_scopes": ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/youtube.force-ssl"],
	"google_key": "path/to/key.json",

	"paypal_client_id":"",
	"paypal_client_secret":"",

	"donors_remote_api_secret": "",
	"contact_mail": "",

	"discord_client_id":"",
	"discord_public_key":"",
	"discord_bot_token":"",

	"streamlabs_client_id":"",
	"streamlabs_client_secret":"",
	"streamlabs_redirect_uri":"",

	"streamelements_client_id":"",
	"streamelements_client_secret":"",

	"tipeee_client_id": "",
	"tipeee_client_secret": "",
	"tipeee_redirect_uri": "http://localhost:8081/tipeee/auth",

	"tiltify_client_id": "",
	"tiltify_client_secret": "",
	"tiltify_webhook_verify": "",
	"tiltify_webhook_id": "",
	"tiltify_redirect_uri": "http://localhost:8081/tiltify/auth",
	"tiltify_scopes": "public webhooks:write",
	"tiltify_api_path": "https://v5api.tiltify.com"
}
```
Create a [twitch application](https://dev.twitch.tv/console) and fill in the `client_id` and `client_secret` values.\
Write anything you want in the `csrf_key` field, it will be used to secure twitch authentication from CSRF attacks.\
Configure the redirect URI of the twitch application to:\
```
http://localhost:8081/oauth
```
*(adapt with the proper port and domain if deploying online)*\
Set the same value to the `redirect_uri` property of the `credentials.json` file.\

You can also create a [spotify application](https://developer.spotify.com/dashboard) and fill in the spotify `spotify_client_id` and `spotify_client_secret`
<br>
By default the server listens on port 3018, you can change it on `credentials.json` and `src_front/utils/Config.ts`.

<br>
<br>
<br>

# Environment setup
This project has been coded with VSCode.\
It is recommended to install these plugins:\
Vue Plugin: https://marketplace.visualstudio.com/items?itemName=Vue.volar

I18n-ally Plugin: https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally

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
All the following MUST be done on a seperate folder from the GIT project.\
[Compile the project](#compile-project) and push the content of the `server` folder on your server root.\
Next to this file, create a `public` folder and push the content of your local `dist` folder inside it.\
Also add the `credentials` folder inside a `data` older at the root of the project.\
Create an `env.conf` file, just write `prod` inside, and push it at the root of the project.\
Install all the production dependencies and [run the server](#run-server).
\
Here is the expected file structure:\
─ root\
  ├─ node_modules/\
  ├─ public/\
  ├─ utils/\
  ├─ data/\
    ├─ credentials/\
  ├─ controllers/\
  ├─ bootstrap.js\
  ├─ env.conf\
<br>
<br>
<br>

# Localization
# Adding new language
Just create a new folder under the `i18n` folder with the ISO 639-1 code of the language.\
Read the next section to know how to translate labels

# Translating labels
To make localization as easy as possible, a dedicated interface has been made that lists all available categories and labels with the possibility to edit them.\
Any update on this interface triggers a rebuild of the compiled file as well as an update on any twitchat page opened on the same browser.\
\
The interface is only accessible to adminitrators and can be found here:\
[localhost:8081/labels](https://localhost:8081/labels)\
To get admin rights you must set your twitch user ID under the `admin_ids` array in the `credentials.json` file.\

# Adding new labels
If you need to add new labels, you'll have to edit JSON sources.\
All label files can be found under `i18n` folder.\
They are splitted by language then by sections.\
Any new file or folder structure can be added to this.\
These are all merged into `static/labels.json` during the build process.\
\
Files can have any name but all labels within it must be under a single property that will be the base path to use the label. The property name is usually the same as the file's name.\
Example:
```
─ en\
  ├─ global.json\
  ├─ home.json/\
  ├─ triggers.json/\
```
`global.json` example:
```json
{
	"global":{
		"hello":"World"
	}
}
```
`home.json` example:
```json
{
	"home":{
		"lorem":"ipsum dolor sit amet"
	}
}
```
This will output this JSON file:
```json
{
	"en":{
		"global":{
			"hello":"World"
		},
		"hello":{
			"lorem":"ipsum dolor sit amet"
		}
	}
}
```
<br>
<br>
<br>

# Package Stream Deck™ plugin
Run the following command:
```
npm run streamdeck_package
```
The compiled plugin will be there `streamdeck_plugin/fr.twitchat.streamDeckPlugin`.
