
# Connect Twitchat with Spotify
You may want to **carefully read all the following** to properly understand what you're about to do :)

# Table of content
* [Disclaimer](#disclaimer)
* [What can you do with these credentials](#what-can-you-do-with-these-credentials)
* [Create a Spotify application](#create-a-spotify-application)
<br><br>
## Disclaimer
The way Twitchat asks you to connect with Spotify is not normal. There should only be a connect button and it should not ask you any credentials.\
Problem is, `Spotify is refusing me to do that` because Twitchat is an app made for Twitch and they won't allow any tool linked to a streaming platform to use their API.\
\
Because of that, the only way for you to connect Twitchat with Spotify is by doing part of the job on your side, which is `creating a Spotify application` as explained bellow.
<br><br>

## What can you do with these credentials
These credentials allow to do nothing more than what Twitchat would be allowed to do if it was doing things the normal way.
But, having these credentials means that I *(Twitchat's developper)* could theorically use them for any another tool.\
\
But due to Spotify's limitations that actually wouldn't be much usefull as it would have the same quota and user count limitations.\
But, if you someday want to revoke Twitchat access to your Spotify account, you'll want to `"RESET"` the client secret to make sure Twitchat can't use your credentials anymore.
\
\
That being said, these credentials will never be stored anywhere else but your browser. They will never be sent to the server.
<br><br>

## Create a Spotify application
Head over this link and connect with your spotify account:\
https://developer.spotify.com/dashboard

Once you've accepted the terms of service, you'll be on your developper dashboard.\
You should have a `"Create an app"` button, click that.\
\
You'll be prompted for a Name and Description for your app.\
Write anything you want there and submit.\
\
On the top left you'll see your app's info with a `"Show client secret"` button.\
Click it to reveal the client secret value.\
![image](https://user-images.githubusercontent.com/721001/171720174-03a82937-2fbe-407b-9a61-6d221ab0d0b9.png)

\
Before putting these values on Twitchat there's one more thing to do.\
Click on the `"Edit settings"` button on the top right.\
Scroll to the `"Redirect URIs"` section and add the following URL:
```
https://twitchat.fr/spotify/auth
```
![image](https://user-images.githubusercontent.com/721001/171720089-c8094ec8-ebbb-4480-aa42-c48652633200.png)

Scroll down to save the change.
You can now copy/paste the `Client ID` and the `Client Secret` to Twitchat and you should be good to go 🥳
