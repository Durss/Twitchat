# Changelog

## 13.0.0 - 2024-08-15

### ⭐ NEW ⭐
- **Bingo grid:** create bingo grids playable with your viewers. If you're premium, you'll get overlay notifications when a viewer gets a bingo and you'll be able to display a leaderboard
- **Merged chat:** connect to other channels to get a unified chat. Choose in which column to display every remote channel you connected to
- **Labels overlay:** new extra light overlay to display very simple real time values. More than 100 kind of labels already available.
- **Hate raid protection:** if 5 first time chatters in a row send the same message, multiple word sequences of it will be added to your blocked terms to stop any more messages from being received. *(This won't be effective for 3mins after a raid or if other regular user send the same message)*
- **Gift premium:** if you're feeling generous, you can offer Twitchat Premium to anyone
- **Custom badges:** you can set a column to display only the messages from users with specific custom badges
- **Warning:** new Twitch Warning system available. Send warning and get notified when a user acknowledges reception
- **YouTube:** You should now get notifications for:
	- New memberships _(AKA subscriptions)_
	- Gifted memberships _(AKA subgifts)_
	- Super chats _(AKA Pinned cheers)_
	- Super Stickers _(AKA Gigantified emotes)_
- **YouTube:** you can now connect to up to 3 live sessions in parallel

- **Raffles:** when starting a raffle from a `List` or a `Value`, a new option allows to remove the winning entry from the List/Value.

- **Ending credits:**
	- New option to add floating emotes for `Celebration` and `Gigantified emotes` received during the stream
	- New option to display the `subscription duration` of users
	- New option to display `YouTube` subscriptions
	- New section to display`Power-ups` received
	- New section to display `Super-chats` and `Super-stickers` received on YouTube
	- New section to display `Merch` bought on Streamlabs and Ko-Fi
	- New section to display `Tips` bought on Streamelements, Streamlabs, Ko-Fi and Tipeee

- **Q&A moderator:** you can share a Q&A session with your mods so they can manually add messages to the list for you. You can also manually add Q&A entries by right clicking a message
- **Q&A upvotes:** new option that brings Q&A entries to the top if the question gets multiple answers on chat. The more a question gets engagement, the closer to the top it will be

- **Spotify:**
	- When a track starts from a Song Request, you'll get a `reminder of who added` it
	- You'll also get the `search terms` that was used by the user
	- A new button allows to `reject a track` added by a user. This won't remove it from your queue as Spotify does not allow it, but as soon as the tracks starts it will be nexted
	- Add tracks to a Spotify `Playlist`

- **Block terms:** New option on a message's right click to add it to the blocked terms

- **Data sync:** you can sync your parameters and data between multiple accounts

- **Mutliple Twitchat:** if you run Twitchat more than once, you'll get a warning asking you to close them and why

- **Overlays:** massive size reduction. They are now ~85% lighter than before.

- **Chat columns:** you can set a background color to your chat columns. UYseful in vertical mode to better see their bounds

- **Stream deck:** 2 new buttons to accept/reject a message held by automod

- **Triggers:**
	- `Random Value` action can pick entries from Counters and Values
	- new `Delete message` action to automatically delete a chat message *(only available for chat message related triggers)*
	- Remove `Counters` or `Values` entries from the triggers. E.g. This can be used to flush all users from a Counter or a Value
	- New OBS option to toggle the state of a source or filter
	- 10 new trigger events:
		- /warn sent
		- /warn reception acknowledged
		- raffle winner selection started _(when wheel shows up)_
		- Power-up: Styled message
		- Power-up: Gigantified emote
		- Power-up: Celebration
		- YouTube: Super chat
		- YouTube: Super sticker
		- YouTube: new membership
		- YouTube: new gifted membership
	- The `User name` field of the `Custom Notification` trigger action now supports placholders
	- The `Custom badge` action now allows to edit all the entries and all the current chatters

 - **Raid:** you can new connect to the chat of the channel your raiding from the `Raiding` window
 - **Blocked terms:** Get notified when a blocked or permitted term is added or removed on your channel
 - **Chat highlights:** You can now define custom words to highlight on messages under `params` => `chat appearance` => `Highlight messages mentioning me`


### 🔧 CHANGES 🔧
- **Ads:** If you have less than 200 followers you won't get "twitchat ad" message sent on chat _(50 followers until then)_
- **Patreon:** it is no more needed to reconnect to Patreon to be considered a Premium user. Just connect once to validate you Premium subscription and things will keep running even if Patreon connexion is lost
- **Colors:** Subs, raids, bits, follows, polls and predictions icons now have the same colors as in Twitch dashboard
- **YouTube:** faster auto connect to your live sessions
- **Parameters menu:** The `pin` system has been replaced with a `+ More parameters` section. You can drag items from/to it.
- **Move OBS source:** Massive performance improvement if you animate move of an OBS source from the Triggers
- **Moderated channels:** On the user card, you can now pin only the moderated channels of your choice instead of having them all displayed by default
- **Channel points transfer:** transfering your channel points rewards has been made a little more user-friendly
- **Counter/values:** You can reorder your Values and Counters
- **Placeholders:** If a placeholder list is more than 5 items long, you'll get a search field to make it easier to find what you want
- **Triggers UX:** moving triggers to folders made a little easier. Also you can now create a new triggers directly within a folder.
- **Unban requests:** The message of an unban request will be blurred by default. If automod detects content is hateful, a warning is also displayed

### 🐛 BUG FIXES 🐛
- The `Wait for media to end playing` option of the `OBS` trigger action was sometimes indefinitely blocking a trigger due to [an OBS issue](https://github.com/obsproject/obs-studio/issues/11040). I added a patch that should avoid that
- A very rare issue that could block twitchat init if a specific data was corrupted has been fixed
- `Golden kappa Hype train` weren't displayed as such properly