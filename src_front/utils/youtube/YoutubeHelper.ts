import DataStore from "@/store/DataStore";
import StoreProxy, { type RequireField } from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { YoutubeAuthToken, YoutubeChannelInfo, YoutubeFollowerResult as YoutubeFollowerResult, YoutubeLiveBroadcast, YoutubeMessages } from "@/types/youtube/YoutubeDataTypes";
import { reactive } from "vue";
import ApiHelper from "../ApiHelper";
import Logger from "../Logger";
import Utils from "../Utils";
import TwitchUtils from "../twitch/TwitchUtils";
import { YoutubeScopes, type YoutubeScopesString } from "./YoutubeScopes";
import StickerList from "./sticker_list.json";

/**
* Created : 28/11/2023
*/
export default class YoutubeHelper {

	public connected:boolean = false;
	public liveFound:boolean = false;
	public availableLiveBroadcasts:YoutubeLiveBroadcast["items"] = [];

	private static _instance:YoutubeHelper;

	private API_PATH:string = "https://www.googleapis.com/youtube/v3/";
	private _token:YoutubeAuthToken|null = null;
	private _userData:YoutubeChannelInfo["items"][number]|null = null;
	private _currentLiveIds:string[] = [];
	private _lastMessagePage:{[key:string]:string} = {};
	private _lastMessageDate:number = -1;
	private _lastMessageDelay:number = -1;
	private _pollMessageTimeout:number = -1;
	private _pollFollowersTimeout:number = -1;
	private _pollSubscribersTimeout:number = -1;
	private _refreshTimeout:number = -1;
	private _creditsUsed:number = 0;
	private _emotes:{[key:string]:string} = {};
	private _uidToBanID:{[key:string]:string} = {};
	private _lastFollowerList:{[key:string]:boolean} = {};
	private _liveIdToChanId:{[liveId:string]:string} = {};
	private _consecutiveApiFails:number = 0;
	private _giftBombs:{[giftId:string]:TwitchatDataTypes.MessageYoutubeSubgiftData} = {};

	constructor() {

	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():YoutubeHelper {
		if(!YoutubeHelper._instance) {
			YoutubeHelper._instance = reactive(new YoutubeHelper()) as YoutubeHelper;
			YoutubeHelper._instance.initialize();
		}
		return YoutubeHelper._instance;
	}

	private get headers() {
		return {
			"Authorization": "Bearer "+this._token!.access_token,
			"Accept":"application/json"
		};
	}

	public get currentLiveIds():string[] { return this._currentLiveIds; }

	public set currentLiveIds(value:string[]) { this._currentLiveIds = value; }



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Connect to Youtube if a refresh token is available
	 */
	public connect():void {
		Logger.instance.log("youtube", {log:"Connecting to Youtube", credits: this._creditsUsed, liveID:this._currentLiveIds})
		const token	= DataStore.get(DataStore.YOUTUBE_AUTH_TOKEN);
		if(token) {
			this._token = JSON.parse(token);
			this.refreshToken().then(async ()=> {
				await this.loadEmotesAndUser();
				//Wait 5s so messages have time to load from DB to avoid duplicates
				//after loading history from youtube.
				//Yeah... extremely dirty way of dealing with async stuff... but I haven't slept for 26h T_T
				window.setTimeout(()=> {
					//This will start automatic polling session
					this.getCurrentLiveBroadcast();
					this.getLastestFollowers();
				}, 5000)
				// this.getLastestSubscribers();
			})
		}
	}

	/**
	 * Returns if current session includes the given scopes.
	 * All given scopes must be granted for this function to return true
	 *
	 * @param scopes
	 */
	public hasScopes(scopes:YoutubeScopesString[]):boolean {
		if(!this._token) return false;
		for (let i = 0; i < scopes.length; i++) {
			if(this._token.scope.split(" ").indexOf(scopes[i]) == -1) {
				return false;
			}
		}

		return true;
	}

	/**
	 * REquest for scopes
	 *
	 * @param scopes
	 */
	public requestScopes(scopes:YoutubeScopesString[]):boolean {
		if(this.hasScopes(scopes)) return true;
		StoreProxy.youtube.newScopesToRequest = scopes;
		StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.YOUTUBE);
		return false;
	}

	/**
	 * Starts youtube oAuth flow
	 */
	public async startAuthFlow(grantModerate:boolean):Promise<boolean> {
		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"youtube/auth"}).href;
		const oauth = await ApiHelper.call("youtube/oauthURL", "GET", {redirectURI, grantModerate});
		if(oauth.status == 200 && oauth.json.data.url)  {
			document.location.href = oauth.json.data.url;
			return true;
		}else{
			console.log("Youtube authentication error !");
			console.log(oauth);
		}
		return false;
	}

	/**
	 * Authenticate the user
	 */
	public async authenticate(code:string):Promise<YoutubeAuthToken|null> {
		Logger.instance.log("youtube", {log:"Authenticating user...", credits: this._creditsUsed, liveID:this._currentLiveIds});
		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"youtube/auth"}).href;
		const res = await ApiHelper.call("youtube/authenticate", "POST", {code, redirectURI});
		if(res.status == 200 && res.json.data.token) {
			const token = res.json.data.token as YoutubeAuthToken;
			DataStore.set(DataStore.YOUTUBE_AUTH_TOKEN, token, false);
			this._token = token;
			const refreshDelay = token.expiry_date - Date.now() - 60000;
			Logger.instance.log("youtube", {log:"User authenticated. Schedule auth token refresh in "+Utils.formatDuration(refreshDelay)+"s", credits: this._creditsUsed, liveID:this._currentLiveIds});
			//Refresh token 1min before it expires
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = window.setTimeout(()=> {
				this.refreshToken();
			}, refreshDelay);
			this.connected = true;
			//This will start automatic polling session
			await this.loadEmotesAndUser();
			await this.getCurrentLiveBroadcast();
			await this.getLastestFollowers();
			return token;
		}else {
			this._token = null;
			this.connected = false;
			Logger.instance.log("youtube", {log:"Failed refreshing auth token", error:await res.json, credits: this._creditsUsed, liveID:this._currentLiveIds});
			throw new Error("unknown error occured when loging in to Youtube");
		}
	}

	/**
	 * Get the current user info
	 */
	public async getCurrentUserInfo():Promise<void> {
		this._creditsUsed ++;
		Logger.instance.log("youtube", {log:"Loading user infos...", credits: this._creditsUsed, liveID:this._currentLiveIds});
		const url = new URL(this.API_PATH+"channels");
		url.searchParams.append("part", "id");
		url.searchParams.append("part", "snippet");
		url.searchParams.append("part", "status");
		url.searchParams.append("mine", "true");
		const res = await fetch(url, {method:"GET", headers:this.headers});
		if(res.status == 200) {
			const json = await res.json() as YoutubeChannelInfo;
			this._userData = json.items[0];
			const user = StoreProxy.users.getUserFrom("youtube", this._userData.id, this._userData.id, this._userData.snippet.title, this._userData.snippet.title, undefined, true, true, true);
			user.avatarPath = this._userData.snippet.thumbnails.default.url || this._userData.snippet.thumbnails.medium.url;
			const chanInfos = user.channelInfo[this._userData.id];
			chanInfos.is_broadcaster = true;
			chanInfos.is_moderator = true;
			Logger.instance.log("youtube", {log:"User infos loaded successfully. "+user.displayName+" (#"+user.id+")", credits: this._creditsUsed, liveID:this._currentLiveIds});
			StoreProxy.auth.youtube.user = user;
		}
	}

	/**
	 * Get the current live broadcast
	 */
	public async getCurrentLiveBroadcast():Promise<YoutubeLiveBroadcast|null> {
		clearTimeout(this._pollMessageTimeout);

		this._creditsUsed ++;
		Logger.instance.log("youtube", {log:"Loading current live broadcast", credits: this._creditsUsed, liveID:this._currentLiveIds});
		const url = new URL(this.API_PATH+"liveBroadcasts");
		url.searchParams.append("maxResults", "50");
		url.searchParams.append("mine", "true");
		url.searchParams.append("part", "id");
		url.searchParams.append("part", "status");
		url.searchParams.append("part", "snippet");
		url.searchParams.append("part", "contentDetails");
		url.searchParams.append("part", "monetizationDetails");
		url.searchParams.append("broadcastType", "all");
		const res = await fetch(url, {method:"GET", headers:this.headers});
		if(res.status == 200) {
			const json = await res.json() as YoutubeLiveBroadcast;
			Logger.instance.log("youtube", {log:"Current live broadcast loaded successfully", credits: this._creditsUsed, liveID:this._currentLiveIds});
			//Sort by life cycle status importance
			const items = json.items.sort((a,b)=> {
				if(a.status.lifeCycleStatus == "live" && b.status.lifeCycleStatus != "live") return -1;
				if(a.status.lifeCycleStatus != "live" && b.status.lifeCycleStatus == "live") return 1;
				if(a.status.lifeCycleStatus == "liveStarting" && b.status.lifeCycleStatus != "liveStarting") return -1;
				if(a.status.lifeCycleStatus != "liveStarting" && b.status.lifeCycleStatus == "liveStarting") return 1;
				if(a.status.lifeCycleStatus == "ready" && b.status.lifeCycleStatus != "ready") return -1;
				if(a.status.lifeCycleStatus != "ready" && b.status.lifeCycleStatus == "ready") return 1;
				if(a.status.lifeCycleStatus == "testStarting" && b.status.lifeCycleStatus != "testStarting") return -1;
				if(a.status.lifeCycleStatus != "testStarting" && b.status.lifeCycleStatus == "testStarting") return 1;
				if(a.status.lifeCycleStatus == "testing" && b.status.lifeCycleStatus != "testing") return -1;
				if(a.status.lifeCycleStatus != "testing" && b.status.lifeCycleStatus == "testing") return 1;
				return 0;
			})
			//Filter out past broadcast that got closed
			.filter(v=> v.status.recordingStatus == "recording" || v.status.recordingStatus == "notRecording");

			json.items.forEach(v=> {
				this._liveIdToChanId[v.snippet.liveChatId] = v.snippet.channelId;
			})

			//Get first item corresponding to a live running or coming.
			//Prioritise items with higher "live" status meaning
			let item = items.find(v=>v.status.lifeCycleStatus == "live");
			if(!item) item = items.find(v=>v.status.lifeCycleStatus == "liveStarting");
			if(!item) item = items.find(v=>v.status.lifeCycleStatus == "ready");
			if(!item) item = items.find(v=>v.status.lifeCycleStatus == "testing");
			if(!item) item = items.find(v=>v.status.lifeCycleStatus == "testStarting");
			if(item) {
				const liveId = item.snippet.liveChatId;
				this.liveFound = true;
				if(this._currentLiveIds.indexOf(liveId) == -1) {
					this._currentLiveIds.push(liveId);
				}
				this.availableLiveBroadcasts = items;
				this._lastMessageDate = Date.now();
				const messageNotification:TwitchatDataTypes.MessageCustomData = {
					id:Utils.getUUID(),
					date:Date.now(),
					channel_id:this._userData!.id,
					platform:"youtube",
					type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
					icon:"youtube",
					user:{name:"YouTube", color:"#ff0000"},
					message:StoreProxy.i18n.t("chat.youtube.connected_to", {TITLE:item.snippet.title}),
					col:0,
				};
				StoreProxy.chat.addMessage(messageNotification);
				Logger.instance.log("youtube", {log:"Select live \""+item.snippet.title+"\"", credits: this._creditsUsed, liveID:this._currentLiveIds});
				//Start polling messages
				this.getMessages();
			}else{
				Logger.instance.log("youtube", {log:"No live found matching required criterias", credits: this._creditsUsed, liveID:this._currentLiveIds});
				this.liveFound = false;
				this._currentLiveIds = [];
				this.availableLiveBroadcasts = [];
				//Search again in 1min
				this._pollMessageTimeout = window.setTimeout(()=> this.getCurrentLiveBroadcast(), 5000);
			}
			return json;
		}else{
			const txt = await res.text();
			if(res.status == 401) {
				Logger.instance.log("youtube", {log:"Failed loading current live broadcast (status: "+res.status+")", error:txt, credits: this._creditsUsed, liveID:this._currentLiveIds});
				if(await this.refreshToken()) {
					await Utils.promisedTimeout(1000);
					return this.getCurrentLiveBroadcast();
				}
			}else if(res.status == 403) {
				try {
					const json = JSON.parse(txt);
					const reason = json.error.errors[0].reason;
					Logger.instance.log("youtube", {log:"Failed loading current live broadcast (status: "+res.status+")", error:json, credits: this._creditsUsed, liveID:this._currentLiveIds});
					if(reason === "liveStreamingNotEnabled") {
						StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_no_broadcast"));
						return null;
					}
					if(reason == "quotaExceeded") {
						StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_no_credits"));
						return null;
					}
					StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_unknown"));
				}catch(error){
					Logger.instance.log("youtube", {log:"Failed loading current live broadcast (status: "+res.status+")", error:txt, credits: this._creditsUsed, liveID:this._currentLiveIds});
				}
				return null;
			}
		}
		return null;
	}

	/**
	 * Get latest messages of current live stream
	 */
	public async getMessages():Promise<void> {
		clearTimeout(this._pollMessageTimeout);
		let maxDelay = 1000;
		for (let i = 0; i < this._currentLiveIds.length; i++) {
			const liveId = this._currentLiveIds[i];
			const pageToken = this._lastMessagePage[liveId];
			if(!this._currentLiveIds) {
				Logger.instance.log("youtube", {log:"Tried to get messages but missing live broadcast ID.", credits: this._creditsUsed, liveID:this._currentLiveIds})
				return;
			}

			const url = new URL(this.API_PATH+"liveChat/messages");
			url.searchParams.append("part", "id");
			url.searchParams.append("part", "snippet");
			url.searchParams.append("part", "authorDetails");
			url.searchParams.append("liveChatId", liveId);
			if(pageToken) {
				url.searchParams.append("pageToken", pageToken);
			}
			try {
				const res = await fetch(url, {method:"GET", headers:this.headers});
				this._creditsUsed ++;
				if(res.status == 200) {
					this._consecutiveApiFails = 0;
					//Check all message IDs
					const idsDone:{[key:string]:boolean} = {};
					if(!pageToken) {
						//Only filter first call that returns full history
						StoreProxy.chat.messages.forEach(v => idsDone[v.id] = true );
					}

					const json = await res.json() as YoutubeMessages;
					let i = Math.max(0, json.items.length - 50);//Only keep 50 last messages
					for (; i < json.items.length; i++) {
						const m = json.items[i];
						//Message already registered? Skip it
						if(idsDone[m.id]) {
							console.log("SKIP", m.id, m);
							continue;
						}

						const data = await this.parseMessage(m, this._liveIdToChanId[liveId], liveId);
						if(data) {
							StoreProxy.chat.addMessage(data);
						}

						this._lastMessageDate = Date.now();
					}

					maxDelay = Math.max(maxDelay, json.pollingIntervalMillis || 10000);

					this._lastMessagePage[liveId] = json.nextPageToken;
				}else {
					let json:any = {};
					let errorCode:string = "";
					let errorReason:string = StoreProxy.i18n.t("error.youtube_unknown");
					try {
						json = await res.json() as {error:{code:number, errors:{domain:string, message:string, reason:string}[]}};
						Logger.instance.log("youtube", {log:"Failed polling chat messages (status: "+res.status+")", error:json, credits: this._creditsUsed, liveID:this._currentLiveIds});
						errorCode = json.error.errors[0].reason;
					}catch(error) {
						let text = "";
						try {
							text = await res.text();
						}catch(error){}
						Logger.instance.log("youtube", {log:"Failed decoding JSON returned by youtube API (status: "+res.status+")", error:text, credits: this._creditsUsed, liveID:this._currentLiveIds});
					}
					if(res.status == 401) {
						//Refresh auth token, stop there if refreshing failed
						if(!await this.refreshToken()) return;
					}else {
						if(++this._consecutiveApiFails === 11) {
							if(errorCode == "liveChatEnded") {
								//Live broadcast ended
								errorReason = StoreProxy.i18n.t("error.youtube_chat_ended");
							}
							if(errorCode == "liveChatNotFound") {
								//Live broadcast deleted
								errorReason = StoreProxy.i18n.t("error.youtube_chat_not_found");
							}
							if(errorCode == "liveChatDisabled") {
								//Chat not enabled for selected live broadcast
								errorReason = StoreProxy.i18n.t("error.youtube_chat_off");
							}
							if(errorCode == "quotaExceeded") {
								//No more Youtube API credits :/
								errorReason = StoreProxy.i18n.t("error.youtube_no_credits");
							}
							if(errorCode == "backendError") {
								//Just youtube failing
							}
							StoreProxy.common.alert(errorReason);
							this.currentLiveIds.splice(i, 1);
							i--;
						}
					}
				}
			}catch(error){
				console.log(error)
			}
		}

		//Expand next message check depending on the last chat activity
		//The more time with no new message, the more time we wait before
		//checking for new messages to reduce credits usage
		const delays = [
			{delay:0, add:0},
			{delay:60*1, add:2},
			{delay:60*5, add:10},
			{delay:60*10, add:30},
			{delay:60*20, add:60},
			{delay:60*60, add:60*2},
		];
		const elapsedTime = Math.round((Date.now() - this._lastMessageDate)/1000);
		const closestDelayEntry = delays.find(({ delay }) => delay >= elapsedTime) || delays[delays.length - 1];
		const additionalDelay = delays[Math.max(delays.indexOf(closestDelayEntry) - 1, 0)].add;

		//Log any delay change
		if(additionalDelay != this._lastMessageDelay) {
			Logger.instance.log("youtube", {log:"Message polling delayed by "+additionalDelay+"s after "+elapsedTime+"s with no message", credits: this._creditsUsed, liveID:this._currentLiveIds})
		}
		this._lastMessageDelay = additionalDelay;

		this._pollMessageTimeout = window.setTimeout(()=>this.getMessages(), maxDelay + additionalDelay*1000);
	}

	/**
	 * Get latest followers of the channel
	 */
	public async getLastestFollowers(isInit:boolean = true):Promise<YoutubeFollowerResult["items"]> {
		this._creditsUsed ++;
		clearTimeout(this._pollFollowersTimeout);
		const url = new URL(this.API_PATH+"subscriptions");
		url.searchParams.append("part", "id");
		url.searchParams.append("part", "subscriberSnippet");
		url.searchParams.append("maxResults", "50");
		url.searchParams.append("myRecentSubscribers", "true");
		try {
			const res = await fetch(url, {method:"GET", headers:this.headers});
			if(res.status == 200) {
				const json:YoutubeFollowerResult = await res.json() as YoutubeFollowerResult;
				const newFollowers:YoutubeFollowerResult["items"] = [];
				const channelId = StoreProxy.auth.youtube.user.id;
				//Parse all users.
				//Send a chat message for every new followers.
				json.items.forEach(v=> {
					if(!isInit && this._lastFollowerList[v.id] !== true) {
						newFollowers.push(v);
						const user = StoreProxy.users.getUserFrom("youtube", channelId, v.subscriberSnippet.channelId, v.subscriberSnippet.title, v.subscriberSnippet.title);
						user.avatarPath = v.subscriberSnippet.thumbnails.medium.url;
						const message:TwitchatDataTypes.MessageFollowingData = {
							channel_id:channelId,
							platform:"youtube",
							id:Utils.getUUID(),
							date:Date.now(),
							followed_at:Date.now(),
							type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
							user,
						};
						StoreProxy.chat.addMessage(message);
					}
					this._lastFollowerList[v.id] = true;
				});
				Logger.instance.log("youtube", {log:"Loaded latest followers: "+json.items.length, credits: this._creditsUsed, liveID:this._currentLiveIds});
				//Check for new followers in a minute
				this._pollFollowersTimeout = window.setTimeout(()=>this.getLastestFollowers(false), 60000);
				return newFollowers;
			}else {
				//Something failed :(
				Logger.instance.log("youtube", {log:"Failed getting latest followers (status: "+res.status+")", error:res.text(), credits: this._creditsUsed, liveID:this._currentLiveIds});
				if(res.status == 401) {
					if(!await this.refreshToken()) return [];
				}else if(res.status == 403) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_no_credits"));
					return [];
				}
			}
		}catch(error){}

		//Youtube API has random downs (404, 503, ...)
		//Re executing the same request with the same page token seems to work in such case.
		await Utils.promisedTimeout(10000);
		return await this.getLastestFollowers(isInit);
	}

	/**
	 * Get latest subscribers of the channel
	 */
	public async getLastestSubscribers(isInit:boolean = true):Promise<YoutubeFollowerResult["items"]> {
		this._creditsUsed ++;
		clearTimeout(this._pollSubscribersTimeout);
		const url = new URL(this.API_PATH+"members");
		url.searchParams.append("part", "snippet");
		url.searchParams.append("maxResults", "50");
		url.searchParams.append("mode", "updates");
		try {
			const res = await fetch(url, {method:"GET", headers:this.headers});
			if(res.status == 200) {
				this._pollSubscribersTimeout = window.setTimeout(()=>this.getLastestFollowers(false), 60000 * 5);
				//TODO
				return [];
			}else {
				//Something failed :(
				Logger.instance.log("youtube", {log:"Failed getting latest followers (status: "+res.status+")", error:res.text(), credits: this._creditsUsed, liveID:this._currentLiveIds});
				if(res.status == 401) {
					if(!await this.refreshToken()) return [];
				}else if(res.status == 403) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_no_credits"));
					return [];
				}
			}
		}catch(error){}

		//Youtube API has random downs (404, 503, ...)
		//Re executing the same request with the same page token seems to work in such case.
		await Utils.promisedTimeout(10000);
		return await this.getLastestFollowers(isInit);
	}

	/**
	 * Disconnect Youtube connexion
	 */
	public disconnect():void {
		Logger.instance.log("youtube", {log:"Disconnect from Youtube", credits: this._creditsUsed, liveID:this._currentLiveIds});
		this.connected = false;
		this._currentLiveIds = [];
		this.availableLiveBroadcasts = [];
		clearTimeout(this._pollMessageTimeout);
		clearTimeout(this._pollFollowersTimeout);
		clearTimeout(this._pollSubscribersTimeout);
		clearTimeout(this._refreshTimeout);
		DataStore.remove(DataStore.YOUTUBE_AUTH_TOKEN);
	}

	/**
	 * Ban a user for the given duration or permanently
	 * @param userId
	 * @param duration_s
	 * @returns
	 */
	public async banUser(userId:string, liveId:string, duration_s:number = 0):Promise<string> {
		this._creditsUsed += 50;
		const params:{snippet:{liveChatId:string, type:string, bannedUserDetails:{channelId:string}, banDurationSeconds?:number}} = {
			snippet: {
				liveChatId: liveId,
				type:duration_s > 0? "temporary" : "permanent",
				bannedUserDetails: {
					channelId:userId,
				}
			}
		};
		if(duration_s > 0) {
			Logger.instance.log("youtube", {log:"Timeout user #"+userId+" for "+duration_s+"s", credits: this._creditsUsed, liveID:this._currentLiveIds});
			params.snippet.banDurationSeconds = duration_s;
		}else{
			Logger.instance.log("youtube", {log:"Ban user #"+userId, credits: this._creditsUsed, liveID:this._currentLiveIds});
		}

		const url = new URL(this.API_PATH+"liveChat/bans");
		url.searchParams.append("part", "snippet");
		const body = JSON.stringify(params);

		const res = await fetch(url, {method:"POST", headers:this.headers, body});
		if(res.status == 200) {
			StoreProxy.users.flagBanned("youtube", this._liveIdToChanId[liveId], userId, duration_s);
			const json = await res.json();
			this._uidToBanID[userId] = json.id
			return json.id;
		}else{
			return "";
		}
	}

	/**
	 * Unban a user
	 * @param userId
	 * @returns
	 */
	public async unbanUser(userId:string, liveId:string):Promise<void> {
		this._creditsUsed += 50;
		Logger.instance.log("youtube", {log:"Unban user ID #"+userId, credits: this._creditsUsed, liveID:this._currentLiveIds});

		//Youtube API is pure shit.
		//One cannot unban a user unless they have a Ban ID which they can
		//only get after banning the user.
		//I keep the ban ID in the _uidToBanID hashmap lcoally but it will
		//be lost after a twitchat restart.
		//Also if the user got banned by a mod it will simply not be possible
		//to unban them from the API as we won't get the necessery Ban ID.
		//And no endpoint allows to retreive a Ban ID for an arbitrary user
		if(!this._uidToBanID[userId]) {
			Logger.instance.log("youtube", {log:"No ban ID found for this user. Cannot unban the user.", credits: this._creditsUsed, liveID:this._currentLiveIds});
			return;
		}

		const url = new URL(this.API_PATH+"liveChat/bans");
		url.searchParams.append("id", this._uidToBanID[userId]);

		const res = await fetch(url, {method:"DELETE", headers:this.headers});
		if(res.status == 200 || res.status == 204) {
			Logger.instance.log("youtube", {log:"User unbaned successfully", credits: this._creditsUsed, liveID:this._currentLiveIds});
			StoreProxy.users.flagUnbanned("youtube", this._liveIdToChanId[liveId], userId);
		}else{
			Logger.instance.log("youtube", {log:"An error occured when trying to unban the user", error:await res.text(), credits: this._creditsUsed, liveID:this._currentLiveIds});
			StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_api_is_shit_unban"));
		}
	}

	/**
	 * Deletes a message by its ID
	 * @param messageId
	 * @returns
	 */
	public async deleteMessage(messageId:string):Promise<boolean> {
		const url = new URL(this.API_PATH+"liveChat/messages");
		url.searchParams.append("id", messageId);

		this._creditsUsed += 50;
		const res = await fetch(url, {method:"DELETE", headers:this.headers});
		if(res.status == 200 || res.status == 204) {
			Logger.instance.log("youtube", {log:"Deleted message #"+messageId, credits: this._creditsUsed, liveID:this._currentLiveIds});
			return true;
		}else{
			Logger.instance.log("youtube", {log:"Cannot delete message #"+messageId, error:await res.text(), credits: this._creditsUsed, liveID:this._currentLiveIds});
			StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_message_delete"));
		}
		return false;
	}

	/**
	 * Send a message to given live ID or all if omited
	 */
	public async sendMessage(message:string, liveId?:string):Promise<boolean> {
		const url = new URL(this.API_PATH+"liveChat/messages");
		url.searchParams.append("part", "snippet");

		if(message.charAt(0) == "/") {
			const chunks = message.split(/\s/gi).filter(v => v != "");
			let cmd = (chunks.shift() as string).toLowerCase();

			switch(cmd) {
				case "/announce":
				case "/warn":
				case "/vip":
				case "/unvip":
				case "/mod":
				case "/unmod":
				case "/commercial":
				case "/shield":
				case "/shieldoff":
				case "/delete":
				case "/clear":
				case "/color":
				case "/emoteonly":
				case "/emoteonlyoff":
				case "/followers":
				case "/followersoff":
				case "/slow":
				case "/slowoff":
				case "/subscribers":
				case "/subscribersoff":
				case "/raid":
				case "/unraid":
				case "/clip":
				case "/whisper":
				case "/w":
				case "/marker":
				case "/uniquechat":
				case "/uniquechatoff":
				case "/mods":
				case "/vips": return false;

				case "/unban":
				case "/block":
				case "/unblock":
				case "/timeout":
				case "/untimeout": return false;

				case "/ban":{
					// if(!this.requestScopes([YoutubeScopes.CHAT_MODERATE])) return false;
					// // this.getCurrentUserInfo
					// const user = StoreProxy.users.getUserFrom("youtube", this._userData!.id, undefined, undefined, chunks.join(" "), undefined, true, true, false);
					// console.log(user);
					return false;
				}
			}
		}

		let success = false;
		const lives = liveId? [liveId] : this.currentLiveIds;
		for (let i = 0; i < lives.length; i++) {
			const live = lives[i];
			const body = {
				snippet: {
					liveChatId:live,
					type:"textMessageEvent",
					textMessageDetails: {
						messageText:message.substring(0, 200)//TODO split into multiple messages instead of just truncating
					}
				}
			}

			this._creditsUsed += 50;
			const res = await fetch(url, {method:"POST", headers:this.headers, body:JSON.stringify(body)});
			if(res.status == 200 || res.status == 204) {
				Logger.instance.log("youtube", {log:"Success post message to live "+live, credits:this._creditsUsed, liveID:this._currentLiveIds});
				success = true;
			}else{
				Logger.instance.log("youtube", {log:"Cannot post message to live "+live, error:await res.text(), credits: this._creditsUsed, liveID:this._currentLiveIds});
				StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_message_post"));
			}
		}
		return success;
	}

	/**
	 * Connects to a live by its URL
	 * @param url
	 */
	public async connectToLiveByURL(videoUrl:string):Promise<boolean> {
		const extractID = (url:string):string|false => {
			let regExp = /(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*)/g;
			let matches = [...url.matchAll(regExp)];
			return (matches.length > 0 && matches[0].length > 0 && matches[0][1].length==11)? matches[0][1].toString() : false;
		}
		const videoID = extractID(videoUrl);
		if(!videoID) return false;

		const url = new URL(this.API_PATH+"videos");
		url.searchParams.append("part", "snippet,contentDetails,statistics,liveStreamingDetails");
		url.searchParams.append("id", videoID);

		const res = await fetch(url, {method:"GET", headers:this.headers});
		if(res.status == 200 || res.status == 204) {
			const json = await res.json();
			if(json.items?.length > 0) {
				const liveID = json.items[0].liveStreamingDetails?.activeLiveChatId || "";
				if(liveID) {
					this._currentLiveIds.push(liveID);
					this._lastMessageDate = Date.now();
					this._liveIdToChanId[liveID] = json.items[0].snippet.channelId;
					this.getMessages();
					Logger.instance.log("youtube", {log:"Success connecting to live "+liveID, credits:this._creditsUsed, liveID:this._currentLiveIds});
					return true;
				}else{
					Logger.instance.log("youtube", {log:"Failed getting livechat ID from video ID "+videoID, credits:this._creditsUsed, liveID:this._currentLiveIds});
				}
			}else{
				Logger.instance.log("youtube", {log:"Failed getting video info from ID "+videoID, credits:this._creditsUsed, liveID:this._currentLiveIds});
			}
		}else{
			Logger.instance.log("youtube", {log:"Failed getting video info from ID "+videoID+". Status:"+ res.status, credits:this._creditsUsed, liveID:this._currentLiveIds});
		}
		return false;
	}

	public async getUserListInfo(ids:string[]):Promise<TwitchatDataTypes.TwitchatUser[]> {
		let users:TwitchatDataTypes.TwitchatUser[] = [];
		while(ids.length > 0) {
			const url = new URL(this.API_PATH+"channels");
			url.searchParams.append("part", "snippet,id");
			//Load by chunks of 50 users max
			ids.splice(0, 50).forEach(id => {
				url.searchParams.append("id", id);
			});

			const res = await fetch(url, {method:"GET", headers:this.headers});
			if(res.status >= 200 && res.status <= 204) {
				const json = await res.json() as YoutubeChannelInfo;
				json.items.forEach(ytUser => {
					const user = StoreProxy.users.getUserFrom("youtube", this._userData?.id || ytUser.id, ytUser.id, ytUser.snippet.title, ytUser.snippet.title, undefined, false, false, false, false);
					user.avatarPath = ytUser.snippet.thumbnails.default.url || ytUser.snippet.thumbnails.medium.url;
					users.push(user);
				});
			}
		}
		return users;
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {

	}

	/**
	 * Refresh the current token
	 */
	private async refreshToken():Promise<boolean> {
		if(!this._token) return false;
		clearTimeout(this._refreshTimeout);
		this._creditsUsed ++;
		Logger.instance.log("youtube", {log:"Refreshing auth token", credits: this._creditsUsed, liveID:this._currentLiveIds});

		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"youtube/auth"}).href;
		const params = {
			accessToken:this._token.access_token,
			expiryDate:this._token.expiry_date,
			refreshToken:this._token.refresh_token,
			tokenType:this._token.token_type,
			scope:this._token.scope,
			redirectURI,
		};
		const res = await ApiHelper.call("youtube/refreshtoken", "POST", params);

		if(res.status == 200 && res.json.data.token) {
			const token = res.json.data.token as YoutubeAuthToken;
			DataStore.set(DataStore.YOUTUBE_AUTH_TOKEN, token, false);
			this._token = token;
			const refreshDelay = token.expiry_date - Date.now() - 60000;
			Logger.instance.log("youtube", {log:"Auth token refreshed successfully. Schedule next refresh in "+Utils.formatDuration(refreshDelay)+"s", credits: this._creditsUsed, liveID:this._currentLiveIds});
			//Refresh token 1min before it expires
			this._refreshTimeout = window.setTimeout(()=> {
				this.refreshToken();
			}, refreshDelay);
			this.connected = true;
			return true;
		}else {
			this._token = null;
			DataStore.remove(DataStore.YOUTUBE_AUTH_TOKEN);
			Logger.instance.log("youtube", {log:"An error occured when refreshing auth token", credits: this._creditsUsed, liveID:this._currentLiveIds});
			StoreProxy.common.alert(StoreProxy.i18n.t("error.youtube_connect_expired"));
		}
		this.connected = false;
		return false;
	}

	/**
	 * Converts a message to a message chunks
	 *
	 * @param src
	 * @returns
	 */
	private parseMessageChunks(src:string):TwitchatDataTypes.ParseMessageChunk[] {
		const emoteDefs:TwitchatDataTypes.EmoteDef[] = [];
		for (const key in this._emotes) {
			const matches = [...src.matchAll(new RegExp(key, "gi"))];
			matches.forEach(v => {
				if(v.index == undefined) return;
				const sd = "/youtube/emotes/sd/"+this._emotes[key];
				const hd = "/youtube/emotes/hd/"+this._emotes[key];
				emoteDefs.push({
					begin:v.index,
					end:v.index + key.length - 1,
					id:key,
					sd,
					hd,
				})
			})
		}
		return TwitchUtils.parseMessageToChunks(src, emoteDefs, false, "youtube");
	}

	/**
	 * Loads user and emotes
	 */
	private async loadEmotesAndUser():Promise<void> {
		if(Object.keys(this._emotes).length == 0) {
			await this.getCurrentUserInfo();
			const emotesQuery = await fetch(StoreProxy.asset("youtube/emote_list.json"));
			const json = await emotesQuery.json();
			this._emotes = json;
		}
	}

	/**
	 * Parses a emssage
	 */
	private async parseMessage(m:YoutubeMessages["items"][number], channelId:string, liveId:string):Promise<TwitchatDataTypes.ChatMessageTypes|null> {

		//Create message
		const message =  m.snippet.displayMessage || "";
		const message_chunks = m.snippet.displayMessage? this.parseMessageChunks(m.snippet.displayMessage) : [];
		const message_html = TwitchUtils.messageChunksToHTML(message_chunks);
		const user = await StoreProxy.users.getUserFrom("youtube", channelId, m.authorDetails.channelId, m.authorDetails.displayName, m.authorDetails.displayName);
		const chanInfos = user.channelInfo[channelId];
		try {
			chanInfos.is_broadcaster = m.authorDetails.isChatOwner;
			chanInfos.is_moderator = m.authorDetails.isChatModerator || m.authorDetails.isChatOwner;
			user.is_partner = m.authorDetails.isChatSponsor;
			user.avatarPath = m.authorDetails.profileImageUrl;
		}catch(error) {
			console.error(error)
		}


		//Add badge if not already specified
		if(chanInfos.is_broadcaster && !chanInfos.badges.find(v=>v.id == "broadcaster")) {
			chanInfos.badges.push({
				icon:{sd:StoreProxy.asset("icons/broadcaster.svg")},
				id:"broadcaster",
				title:StoreProxy.i18n.t("chat.message.badges.broadcaster"),
			})
		}else
		//Add badge if not already specified
		if(chanInfos.is_moderator && !chanInfos.badges.find(v=>v.id == "moderator")) {
			chanInfos.badges.push({
				icon:{sd:StoreProxy.asset("icons/mod.svg")},
				id:"moderator",
				title:StoreProxy.i18n.t("chat.message.badges.moderator"),
			})
		}

		//Add badge if not already specified
		if(user.is_partner && !chanInfos.badges.find(v=>v.id == "partner")) {
			chanInfos.badges.push({
				icon:{sd:StoreProxy.asset("icons/partner.svg")},
				id:"partner",
				title:StoreProxy.i18n.t("chat.message.badges.partner"),
			})
		}

		switch(m.snippet.type) {
			case "textMessageEvent": {
				const data:TwitchatDataTypes.MessageChatData = {
					date:new Date(m.snippet.publishedAt).getTime(),
					id:m.id,
					platform:"youtube",
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					user,
					answers:[],
					channel_id:channelId,
					message,
					message_chunks,
					message_html,
					message_size:TwitchUtils.computeMessageSize(message_chunks),
					is_short:false,
					youtube_liveId:liveId,
				};

				data.is_short = Utils.stripHTMLTags(data.message_html).length / data.message.length < .6 || data.message.length < 4;
				data.raw_data = m;
				return data;
			}

			case "superChatEvent": {
				const data:TwitchatDataTypes.MessageYoutubeSuperChatData = {
					date:new Date(m.snippet.publishedAt).getTime(),
					id:m.id,
					platform:"youtube",
					type:TwitchatDataTypes.TwitchatMessageType.SUPER_CHAT,
					user,
					channel_id:channelId,
					message: m.snippet.superChatDetails.userComment,
					message_chunks: this.parseMessageChunks(m.snippet.superChatDetails.userComment),
					message_html,
					youtube_liveId:liveId,
					amount:m.snippet.superChatDetails.amountMicros / 1000000,
					amountDisplay:m.snippet.superChatDetails.amountDisplayString,
					currency:m.snippet.superChatDetails.currency,
					tier:m.snippet.superChatDetails.tier,
				};

				data.message_html = TwitchUtils.messageChunksToHTML(data.message_chunks || []);
				return data;
			}

			case "superStickerDetails": {
				const data:TwitchatDataTypes.MessageYoutubeSuperStickerData = {
					date:new Date(m.snippet.publishedAt).getTime(),
					id:m.id,
					platform:"youtube",
					type:TwitchatDataTypes.TwitchatMessageType.SUPER_STICKER,
					user,
					channel_id:channelId,
					youtube_liveId:liveId,
					amount:m.snippet.superStickerDetails.amountMicros / 1000000,
					amountDisplay:m.snippet.superStickerDetails.amountDisplayString,
					currency:m.snippet.superStickerDetails.currency,
					tier:m.snippet.superStickerDetails.tier,
					sticker_url:StickerList[m.snippet.superStickerDetails.superStickerMetadata.stickerId as keyof typeof StickerList] || "",
					sticker_id:m.snippet.superStickerDetails.superStickerMetadata.stickerId,
				};
				return data;
			}

			case "memberMilestoneChatEvent": {
				const data:TwitchatDataTypes.MessageYoutubeSubscriptionData = {
					date:new Date(m.snippet.publishedAt).getTime(),
					id:m.id,
					platform:"youtube",
					type:TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION,
					user,
					channel_id:channelId,
					message: m.snippet.memberMilestoneChatDetails.userComment || "",
					message_chunks: this.parseMessageChunks(m.snippet.memberMilestoneChatDetails.userComment || ""),
					message_html,
					youtube_liveId:liveId,
					is_resub: false,
					levelName: m.snippet.memberMilestoneChatDetails.memberLevelName,
					months: m.snippet.memberMilestoneChatDetails.memberMonth
				};
				data.message_html = TwitchUtils.messageChunksToHTML(data.message_chunks || []);
				return data;
			}

			case "newSponsorEvent": {
				const data:TwitchatDataTypes.MessageYoutubeSubscriptionData = {
					date:new Date(m.snippet.publishedAt).getTime(),
					id:m.id,
					platform:"youtube",
					type:TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBSCRIPTION,
					user,
					channel_id:channelId,
					message,
					message_chunks,
					message_html,
					youtube_liveId:liveId,
					is_resub: m.snippet.newSponsorDetails.isUpgrade,
					levelName: m.snippet.newSponsorDetails.memberLevelName || "",
					months: 1,
				};

				return data;
			}

			case "membershipGiftingEvent": {
				const data:TwitchatDataTypes.MessageYoutubeSubgiftData = {
					date:new Date(m.snippet.publishedAt).getTime(),
					id:m.id,
					platform:"youtube",
					type:TwitchatDataTypes.TwitchatMessageType.YOUTUBE_SUBGIFT,
					user,
					channel_id: channelId,
					youtube_liveId: liveId,
					gift_count: m.snippet.membershipGiftingDetails.giftMembershipsCount,
					levelName: m.snippet.membershipGiftingDetails.giftMembershipsLevelName,
					gift_recipients: [],
				};

				this._giftBombs[m.id] = data;

				window.setTimeout(() => {
					StoreProxy.chat.addMessage(data);
				}, 1000);

				//Special case, return null so the message isn't sent right away to chat.
				//Wait for "giftMembershipReceivedEvent" to be received so the data is properly populated
				//EDIT - me a month later: WTF is that comment?! See you in another month
				return null;
			}

			case "giftMembershipReceivedEvent": {
				break;
			}

			case "messageDeletedEvent": {
				StoreProxy.chat.deleteMessageByID(m.snippet.messageDeletedDetails.deletedMessageId);
				break;
			}

			case "userBannedEvent": {
				const bannedUser = await StoreProxy.users.getUserFrom("youtube", channelId, m.snippet.userBannedDetails.bannedUserDetails.channelId, m.snippet.userBannedDetails.bannedUserDetails.displayName, m.snippet.userBannedDetails.bannedUserDetails.displayName);
				StoreProxy.users.flagBanned("youtube", channelId, bannedUser.id, m.snippet.userBannedDetails.banDurationSeconds, user);
				break;
			}
		}

		return null;
	}
}
