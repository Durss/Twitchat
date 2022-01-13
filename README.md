
<div align="center"><a href="https://twitchat.durss.ninja" target="_blank"><img width="400" alt="twitch" src="https://raw.githubusercontent.com/Durss/twitchat/main/src/assets/logo.svg"></a></div>
<br>
<br>
This is a custom twitch chat that aims to fill gaps in the official Twitch chat.
<br>
The goal is to reduce as much as possible the number of missed messages with features missing from the Twitch chat.
<br>
<br>
<div align="center"><a href="https://raw.githubusercontent.com/Durss/twitchat/main/preview.png" target="_blank"><img width="100%" alt="twitch" src="https://raw.githubusercontent.com/Durss/twitchat/main/preview.png"></a></div>
<br>
<br>
<br>

# Features
- [x] Show first message of users for the day seperatly
- [x] Allow to filter some messages *(bots, commands, self, etc...)*
- [x] Customizable message features *(remove badges, show minimalist badges, remove emotes, etc...)*
- [x] Customizable message appearance by roles *(viewers, mods, vips, subs)*
- [x] Handle first message on your channel for a user
- [x] Allows mod actions
- [x] Show mod notifications
- [x] Show channel points notifications
- [x] Automod allow/deny flow
- [ ] Mark last message read and allow to go back to it
- [ ] Add highlight color by roles *(viewers, mods, vips, subs)*
- [ ] Make it easier to follow a conversation between users
- [ ] Highlight a user temporarilly *(to make sure not to miss an answer)*
- [ ] Filter all commands but a custom list
- [ ] Pause chat autoscroll on hover
- [ ] Expose an API to control some stuff remotely(?)
<br>
<br>
<br>

# Project setup
First create a `credentials.json` file on the root directory and fill in these values :
```json
{
	"client_id": "",
	"client_secret": "",
	"redirect_uri": "http://localhost:8080/oauth"
}
```
Create a [twitch application](https://dev.twitch.tv/console) and fill in the `client_id` and `client_secret` values.\
Configure the redirect URI of the application with your localhost and/or production URI. Set it as the  `redirect_uri` value of the credentials.\
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
<br>

# Server
The server is super basic for now as there isn't much needs.
For this reason it's a just a single file server coded in vanila JS that doesn't need any compilation. That might change in the futur.
