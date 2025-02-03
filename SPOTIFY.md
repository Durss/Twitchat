
# Connect Twitchat with Spotify
You may want to **carefully read all the following** to properly understand what you're about to do :)

# Table of content
* [Disclaimer](#disclaimer)
* [Is there any risk?](#is-there-any-risk)
* [Create a Spotify application](#create-a-spotify-application)
<br><br>
## Disclaimer
The way Twitchat asks you to connect with Spotify is not normal. There should only be a connect button and it should not ask you any credentials.\
Problem is, `Spotify is refusing me to do that` because Twitchat is an app made for Twitch and they won't allow any tool linked to a streaming platform to use their API.\
\
Because of that, the only way for you to connect Twitchat with Spotify is by doing part of the job on your side, which is [`creating a Spotify application`](#create-a-spotify-application) as explained below.
<br><br>

## Is there any risk?
These credentials allow Twitchat to do nothing more than what it would if Twitchat was doing things the normal way.\
But, having these credentials means that I *(Twitchat's developper)* could theorically store them and use them for any other tool.\
\
But due to Spotify's limitations, that actually wouldn't be much usefull as it would have the same quota and 25 users max limitations.\
But, if you someday want to revoke Twitchat access from your Spotify account, you'll want to `"RESET"` the client secret to make sure Twitchat can't use your credentials anymore.
\
\
That being said, these credentials will never be stored anywhere else but your browser.\
**They will never be sent or saved to Twitchat's server.**
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
On the top right you'll have a `"Settings"` button, click it:\
![image](https://user-images.githubusercontent.com/721001/231935112-ae1f929b-2695-481a-9bd8-96beb8c10337.png)

The page will show your app's info with a `"Show client secret"` button.\
Click it to reveal the client secret value.\
![image](https://user-images.githubusercontent.com/721001/231935377-9ce182f0-5004-4f7c-b775-48e8ee4235c2.png)

\
Before putting these values on Twitchat there's one more thing to do.\
Click on the `"Edit"` button on the bottom of the page.\
Scroll to the `"Redirect URIs"` section and add the following URL:
```
https://twitchat.fr/spotify/auth
```
![image](https://user-images.githubusercontent.com/721001/231935570-fc532ecb-30c1-41b3-bf2e-8ec6a0885a7a.png)

Scroll down to save the changes.\
You can now copy/paste the `Client ID` and the `Client Secret` to Twitchat and you should be good to go 🥳
