# How to connect to a Youtube chat and poll its messages

The following code will grab chat messages from the given live and store them in the `data` var.
```js
const ACCESS_TOKEN = "MY_ACCESS_TOKEN";
const LIVE_CHAT_ID = "LIVE_CHAT_ID"
const data = [];
async function loadNext(page) {
    let suffix = page? "&pageToken="+page : "";
    const res = await fetch("https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId="+LIVE_CHAT_ID+"&part=id&part=snippet&part=authorDetails&maxResults=2000"+suffix, {headers:{
			"Authorization": "Bearer "+ACCESS_TOKEN,
			"Accept":"application/json"
		}});

    if(res.status == 200) {
        const json = await res.json();
        data = data.concat(json.items);
        if(json.nextPageToken) {
            setTimeout(() => {
                loadNext(json.nextPageToken);
            }, json.pollingIntervalMillis + 200);
        }
    }else{
        console.log("Ca a chié!");
    }
}

loadNext();
```

To get an `ACCESS_TOKEN` the easier is to connect to Youtube within Twitchat and grab the access_token from one of the queries' headers.

To get the "`LIVE_CHAT_ID`" value, call the following GET endpoint:\
`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id={LIVE_ID]&key={API_KEY}`
* LIVE_ID can be found on the URL of the live
* API_KEY must be created from google console
