
# Connect Twitchat with Spotify
Head over this link and connect with your spotify account:\
https://developer.spotify.com/dashboard

Once you've accepted the terms of service, you'll be on your developper dashboard.

Now there are two options:
<details>
  <summary>You already have a spotify application there</summary>

Open the existing application, click "`Edit`" on the bottom.\
Find the `Redirect URIs` section and add this URL :
```
https://twitchat.fr/spotify/auth
```
</details>
<br>
<details>
  <summary>You have no spotify aplication yet</summary>

You should have a `"Create an app"` button, click that.\
\
You'll be prompted for a Name and Description for your app.\
Write anything you want there and submit.\
\
On the top right you'll have a `"Settings"` button, click it:\
![image](https://user-images.githubusercontent.com/721001/231935112-ae1f929b-2695-481a-9bd8-96beb8c10337.png)

The page will show your app's info with a `"Show client secret"`   button.\
Click it to reveal the client secret value.\
![image](https://user-images.githubusercontent.com/721001/231935377-9ce182f0-5004-4f7c-b775-48e8ee4235c2.png)

\
Before putting these values on Twitchat there's one more thing to   do.\
Click on the `"Edit"` button on the bottom of the page.\
Scroll to the `"Redirect URIs"` section and add the following URL:
```
https://twitchat.fr/spotify/auth
```
![image](https://user-images.githubusercontent.com/721001/231935570-fc532ecb-30c1-41b3-bf2e-8ec6a0885a7a.png)
<br>

Scroll down to save the changes.\
You can now copy/paste the `Client ID` and the `Client Secret` on Twitchat and you should be good to go 🥳