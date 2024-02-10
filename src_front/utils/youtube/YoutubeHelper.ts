import DataStore from "@/store/DataStore";
import StoreProxy, { type RequireField } from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { YoutubeAuthToken, YoutubeChannelInfo, YoutubeFollowerResult as YoutubeFollowerResult, YoutubeLiveBroadcast, YoutubeMessages } from "@/types/youtube/YoutubeDataTypes";
import { reactive } from "vue";
import ApiController from "../ApiController";
import Logger from "../Logger";
import Utils from "../Utils";
import TwitchUtils from "../twitch/TwitchUtils";
import type { YoutubeScopesString } from "./YoutubeScopes";

/**
* Created : 28/11/2023 
*/
export default class YoutubeHelper {

	public connected:boolean = false;
	public liveFound:boolean = false;
	public channelId:string = "";
	public tokenSavingEnabled:boolean = false;
	public availableLiveBroadcasts:YoutubeLiveBroadcast["items"] = [];
	
	private static _instance:YoutubeHelper;
	private _token:YoutubeAuthToken|null = null;
	private _currentLiveId:string = "";
	private _lastMessagePage:string = "";
	private _pollMessageTimeout:number = -1;
	private _pollFollowersTimeout:number = -1;
	private _pollSubscribersTimeout:number = -1;
	private _tokenSavingLogDebounce:number =  -1;
	private _tokenSavingLogDebounceMessageCount:number =  0;
	private _refreshTimeout:number = -1;
	private _creditsUsed:number = 0;
	private _emotes:{[key:string]:string} = {};
	private _uidToBanID:{[key:string]:string} = {};
	private _lastFollowerList:{[key:string]:boolean} = {};
	private _lastChatActivityTimeout:number = -1;
	private _chatInactivityDisconnect:number =  20 * 60 * 1000;
	
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

	public get currentLiveId():string { return this._currentLiveId; }

	public set currentLiveId(value:string) { this._currentLiveId = value; }

	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Connect to Youtube if a refresh token is available
	 */
	public connect():void {
		Logger.instance.log("youtube", {log:"Connecting to Youtube", credits: this._creditsUsed, liveID:this._currentLiveId})
		const token	= DataStore.get(DataStore.YOUTUBE_AUTH_TOKEN);
		if(token) {
			this._token = JSON.parse(token);
			this.refreshToken().then(async ()=> {
				await this.loadUserInfoAndEmotes();
				//Wait 5s so messages have time to load from DB to avoid duplicates
				//after loading history from youtube.
				//Yeah... extremely dirty way of dealing with async stuff... but I haven't slep for 26h T_T
				setTimeout(()=> {
					//This will start automatic polling session
					this.getCurrentLiveBroadcast();
				}, 5000)
				this.getLastestFollowers();
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
		StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.YOUTUBE);
		return false;
	}

	/**
	 * Starts youtube oAuth flow
	 */
	public async startAuthFlow(grantModerate:boolean):Promise<void> {
		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"youtube/auth"}).href;
		const oauth = await ApiController.call("youtube/oauthURL", "GET", {redirectURI, grantModerate});
		if(oauth.status == 200 && oauth.json.data.url)  {
			document.location.href = oauth.json.data.url;
		}else{
			console.log("Youtube authentication error !");
			console.log(oauth);
		}
	}
	
	/**
	 * Authenticate the user
	 */
	public async authenticate(code:string):Promise<YoutubeAuthToken|null> {
		Logger.instance.log("youtube", {log:"Authenticating user...", credits: this._creditsUsed, liveID:this._currentLiveId});
		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"youtube/auth"}).href;
		const res = await ApiController.call("youtube/authenticate", "POST", {code, redirectURI});
		if(res.status == 200 && res.json.data.token) {
			const token = res.json.data.token as YoutubeAuthToken;
			DataStore.set(DataStore.YOUTUBE_AUTH_TOKEN, token, false);
			this._token = token;
			const refreshDelay = token.expiry_date - Date.now() - 60000;
			Logger.instance.log("youtube", {log:"User authenticated. Schedule auth token refresh in "+Utils.formatDuration(refreshDelay)+"s", credits: this._creditsUsed, liveID:this._currentLiveId});
			//Refresh token 1min before it expires
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = setTimeout(()=> {
				this.refreshToken();
			}, refreshDelay);
			this.connected = true;
			//This will start automatic polling session
			await this.loadUserInfoAndEmotes();
			await this.getCurrentLiveBroadcast();
			await this.getLastestFollowers();
			return token;
		}else {
			this._token = null;
			this.connected = false;
			Logger.instance.log("youtube", {log:"Failed refreshing auth token", error:await res.json, credits: this._creditsUsed, liveID:this._currentLiveId});
			throw new Error("unknown error occured when loging in to Youtube");
		}
	}

	/**
	 * Get the current user info
	 */
	public async getUserInfo():Promise<void> {
		this._creditsUsed ++;
		Logger.instance.log("youtube", {log:"Loading user infos...", credits: this._creditsUsed, liveID:this._currentLiveId});
		let url = new URL("https://www.googleapis.com/youtube/v3/channels");
		url.searchParams.append("part", "id");
		url.searchParams.append("part", "snippet");
		url.searchParams.append("part", "status");
		url.searchParams.append("mine", "true");
		let res = await fetch(url, {method:"GET", headers:this.headers});
		if(res.status == 200) {
			const json = await res.json() as YoutubeChannelInfo;
			const userData = json.items[0];
			const user = StoreProxy.users.getUserFrom("youtube", userData.id, userData.id, userData.snippet.title, userData.snippet.title);
			user.avatarPath = userData.snippet.thumbnails.default.url || userData.snippet.thumbnails.medium.url;
			const chanInfos = user.channelInfo[userData.id];
			chanInfos.is_broadcaster = true;
			chanInfos.is_moderator = true;
			Logger.instance.log("youtube", {log:"User infos loaded successfully. "+user.displayName+" (#"+user.id+")", credits: this._creditsUsed, liveID:this._currentLiveId});
			user.donor = {
				earlyDonor:false,
				isPremiumDonor:false,
				level:0,
				noAd:false,
				state:false,
				upgrade:false,
			};
			StoreProxy.auth.youtube.user = user as RequireField<TwitchatDataTypes.TwitchatUser, "donor">;
		}
	}

	/**
	 * Get the current live broadcast
	 */
	public async getCurrentLiveBroadcast():Promise<YoutubeLiveBroadcast|null> {
		clearTimeout(this._pollMessageTimeout);
		clearTimeout(this._tokenSavingLogDebounce);
		clearTimeout(this._lastChatActivityTimeout);
		
		this._creditsUsed ++;
		Logger.instance.log("youtube", {log:"Loading current live broadcast", credits: this._creditsUsed, liveID:this._currentLiveId});
		let url = new URL("https://www.googleapis.com/youtube/v3/liveBroadcasts");
		url.searchParams.append("mine", "true");
		url.searchParams.append("part", "id");
		url.searchParams.append("part", "status");
		url.searchParams.append("part", "snippet");
		url.searchParams.append("part", "contentDetails");
		url.searchParams.append("part", "monetizationDetails");
		url.searchParams.append("broadcastType", "all");
		let res = await fetch(url, {method:"GET", headers:this.headers});
		if(res.status == 200) {
			let json = await res.json() as YoutubeLiveBroadcast;
			Logger.instance.log("youtube", {log:"Current live broadcast loaded successfully", credits: this._creditsUsed, liveID:this._currentLiveId});
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

			//Get first item corresponding to a live running or coming.
			//Prioritise items with higher "live" status meaning
			let item = items.find(v=>v.status.lifeCycleStatus == "live");
			if(!item) item = items.find(v=>v.status.lifeCycleStatus == "liveStarting");
			if(!item) item = items.find(v=>v.status.lifeCycleStatus == "ready");
			if(!item) item = items.find(v=>v.status.lifeCycleStatus == "testing");
			if(!item) item = items.find(v=>v.status.lifeCycleStatus == "testStarting");
			if(item) {
				this.liveFound = true;
				this.channelId = item.snippet.channelId;
				this._currentLiveId = item.snippet.liveChatId;
				this.availableLiveBroadcasts = items;
				this.tokenSavingEnabled = false;
				Logger.instance.log("youtube", {log:"Select live \""+item.snippet.title+"\"", credits: this._creditsUsed, liveID:this._currentLiveId});
				//Start polling messages
				this.getMessages();
				this.scheduleTokenSaver();
			}else{
				Logger.instance.log("youtube", {log:"No live found matching required criterias", credits: this._creditsUsed, liveID:this._currentLiveId});
				this.liveFound = false;
				this._currentLiveId = "";
				this.availableLiveBroadcasts = [];
				//Search again in 1min
				this._pollMessageTimeout = setTimeout(()=> this.getCurrentLiveBroadcast(), 60000);
			}
			return json;
		}else{
			const txt = await res.text();
			if(res.status == 401) {
				Logger.instance.log("youtube", {log:"Failed loading current live broadcast (status: "+res.status+")", error:txt, credits: this._creditsUsed, liveID:this._currentLiveId});
				if(await this.refreshToken()) {
					await Utils.promisedTimeout(1000);
					return this.getCurrentLiveBroadcast();
				}
			}else if(res.status == 403) {
				try {
					const json = JSON.parse(txt);
					const reason = json.error.errors[0].reason;
					Logger.instance.log("youtube", {log:"Failed loading current live broadcast (status: "+res.status+")", error:json, credits: this._creditsUsed, liveID:this._currentLiveId});
					if(reason === "liveStreamingNotEnabled") {
						StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_no_broadcast"));
						return null;
					}
					if(reason == "quotaExceeded") {
						StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_no_credits"));
						return null;
					}
					StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_unknown"));
				}catch(error){
					Logger.instance.log("youtube", {log:"Failed loading current live broadcast (status: "+res.status+")", error:txt, credits: this._creditsUsed, liveID:this._currentLiveId});
				}
				return null;
			}
		}
		return null;
	}

	/**
	 * Restart automatic message polling
	 */
	public restartMessagePoll():void {
		Logger.instance.log("youtube", {log:"Restart polling chat messages after manual click.", credits: this._creditsUsed, liveID:this._currentLiveId})

		this.tokenSavingEnabled = false;
		clearTimeout(this._lastChatActivityTimeout);
		this.getMessages();
		this.scheduleTokenSaver();
	}

	/**
	 * Get latest messages of current live stream
	 */
	public async getMessages():Promise<YoutubeMessages|null> {
		clearTimeout(this._pollMessageTimeout);
		if(!this._currentLiveId) {
			Logger.instance.log("youtube", {log:"Tried to get messages but missing live broadcast ID.", credits: this._creditsUsed, liveID:this._currentLiveId})
			return null;
		}

		let url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
		url.searchParams.append("part", "id");
		url.searchParams.append("part", "snippet");
		url.searchParams.append("part", "authorDetails");
		url.searchParams.append("liveChatId", this._currentLiveId);
		if(this._lastMessagePage) {
			url.searchParams.append("pageToken", this._lastMessagePage);
		}
		let res = await fetch(url, {method:"GET", headers:this.headers});
		this._creditsUsed ++;
		if(res.status == 200) {
			//Check all message IDs
			const idsDone:{[key:string]:boolean} = {};
			if(!this._lastMessagePage) {
				//Only filter first call that returns full history
				StoreProxy.chat.messages.forEach(v => idsDone[v.id] = true );
			}

			let json = await res.json() as YoutubeMessages;
			let i = Math.max(0, json.items.length - 50);//Only keep 50 last messages
			for (; i < json.items.length; i++) {
				const m = json.items[i];
				//Message already registered? Skip it
				if(idsDone[m.id]) continue;
				//Apparently it's possible to get empty messages given a Sentry error :/
				if(!m.snippet.displayMessage) continue;

				//Create message
				const message_chunks = this.parseMessage(m.snippet.displayMessage);
				const user = await StoreProxy.users.getUserFrom("youtube", this.channelId, m.authorDetails.channelId, m.authorDetails.displayName, m.authorDetails.displayName);
				const chanInfos = user.channelInfo[this.channelId];
				chanInfos.is_broadcaster = m.authorDetails.isChatOwner;
				chanInfos.is_moderator = m.authorDetails.isChatModerator || m.authorDetails.isChatOwner;
				user.is_partner = m.authorDetails.isChatSponsor;
				user.avatarPath = m.authorDetails.profileImageUrl;
				
				//Add badge if not already specified
				if(chanInfos.is_broadcaster && !chanInfos.badges.find(v=>v.id == "broadcaster")) {
					chanInfos.badges.push({
						icon:{sd:"broadcaster"},
						id:"broadcaster",
						title:StoreProxy.i18n.t("chat.message.badges.broadcaster"),
					})
				}else
				//Add badge if not already specified
				if(chanInfos.is_moderator && !chanInfos.badges.find(v=>v.id == "moderator")) {
					chanInfos.badges.push({
						icon:{sd:"mod"},
						id:"moderator",
						title:StoreProxy.i18n.t("chat.message.badges.moderator"),
					})
				}
				
				//Add badge if not already specified
				if(user.is_partner && !chanInfos.badges.find(v=>v.id == "partner")) {
					chanInfos.badges.push({
						icon:{sd:"partner"},
						id:"partner",
						title:StoreProxy.i18n.t("chat.message.badges.partner"),
					})
				}

				const data:TwitchatDataTypes.MessageChatData = {
					// date:Date.now(),
					date:new Date(m.snippet.publishedAt).getTime(),
					id:m.id,
					platform:"youtube",
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					user,
					answers:[],
					channel_id:this.channelId,
					message: m.snippet.displayMessage,
					message_chunks,
					message_html:"",
					message_size:0,
					is_short:false,
				};
				
				data.message_chunks = message_chunks;
				data.message_html = TwitchUtils.messageChunksToHTML(message_chunks);
				data.message_size = TwitchUtils.computeMessageSize(message_chunks);
				data.is_short = Utils.stripHTMLTags(data.message_html).length / data.message.length < .6 || data.message.length < 4;

				StoreProxy.chat.addMessage(data);

				this._tokenSavingLogDebounceMessageCount ++;
				this.scheduleTokenSaver();
			}

			this._lastMessagePage = json.nextPageToken;

			if(!this.tokenSavingEnabled)  {
				this._pollMessageTimeout = setTimeout(()=>this.getMessages(), Math.min(5000, json.pollingIntervalMillis * 2));
			}
			
			return json;
		}else {
			let json:any = {};
			let errorCode:string = "";
			try {
				json = await res.json() as {error:{code:number, errors:{domain:string, message:string, reason:string}[]}};
				Logger.instance.log("youtube", {log:"Failed polling chat messages (status: "+res.status+")", error:json, credits: this._creditsUsed, liveID:this._currentLiveId});
				errorCode = json.error.errors[0].reason;
				if(errorCode == "liveChatEnded") {
					//Live broadcast ended
					StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_chat_ended"));
					return null;
				}
				if(errorCode == "liveChatDisabled") {
					//Chat not enabled for selected live broadcast
					StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_chat_off"));
					return null;
				}
				if(errorCode == "quotaExceeded") {
					//No more Youtube API credits :/
					StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_no_credits"));
					return null
				}
			}catch(error) {
				let text = "";
				try {
					text = await res.text();
				}catch(error){}
				Logger.instance.log("youtube", {log:"Failed decoding JSON returned by youtube API (status: "+res.status+")", error:text, credits: this._creditsUsed, liveID:this._currentLiveId});
			}
			if(res.status == 401) {
				//Refresh auth token, stop there if refreshing failed
				if(!await this.refreshToken()) return null;
			}else {
				StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_unknown"));
				return null;
			}
		}
		//Youtube API has random downs (404, 503, ...)
		//Re executing the same request with the same page token seems to work in such case.
		await Utils.promisedTimeout(1000);
		return await this.getMessages();
	}

	/**
	 * Get latest followers of the channel
	 */
	public async getLastestFollowers(isInit:boolean = true):Promise<YoutubeFollowerResult["items"]> {
		this._creditsUsed ++;
		clearTimeout(this._pollFollowersTimeout);
		const url = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
		url.searchParams.append("part", "id");
		url.searchParams.append("part", "subscriberSnippet");
		url.searchParams.append("maxResults", "50");
		url.searchParams.append("myRecentSubscribers", "true");
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
			Logger.instance.log("youtube", {log:"Loaded latest followers: "+json.items.length, credits: this._creditsUsed, liveID:this._currentLiveId});
			//Check for new followers in a minute
			this._pollFollowersTimeout = setTimeout(()=>this.getLastestFollowers(false), 60000);
			return newFollowers;
		}else {
			//Something failed :(
			Logger.instance.log("youtube", {log:"Failed getting latest followers (status: "+res.status+")", error:res.text(), credits: this._creditsUsed, liveID:this._currentLiveId});
			if(res.status == 401) {
				if(!await this.refreshToken()) return [];
			}else if(res.status == 403) {
				StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_no_credits"));
				return [];
			}
		}
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
		const url = new URL("https://www.googleapis.com/youtube/v3/members");
		url.searchParams.append("part", "snippet");
		url.searchParams.append("maxResults", "50");
		url.searchParams.append("mode", "updates");
		const res = await fetch(url, {method:"GET", headers:this.headers});
		if(res.status == 200) {
			// const json:YoutubeFollowerResult = await res.json() as YoutubeFollowerResult;
			// const newFollowers:YoutubeFollowerResult["items"] = [];
			// const channelId = StoreProxy.auth.youtube.user.id;
			// //Parse all users.
			// //Send a chat message for every new followers.
			// json.items.forEach(v=> {
			// 	if(!isInit && this._lastFollowerList[v.id] !== true) {
			// 		newFollowers.push(v);
			// 		const user = StoreProxy.users.getUserFrom("youtube", channelId, v.subscriberSnippet.channelId, v.subscriberSnippet.title, v.subscriberSnippet.title);
			// 		user.avatarPath = v.subscriberSnippet.thumbnails.medium.url;
			// 		const message:TwitchatDataTypes.MessageFollowingData = {
			// 			channel_id:channelId,
			// 			platform:"youtube",
			// 			id:Utils.getUUID(),
			// 			date:Date.now(),
			// 			followed_at:Date.now(),
			// 			type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			// 			user,
			// 		};
			// 		StoreProxy.chat.addMessage(message);
			// 	}
			// 	this._lastFollowerList[v.id] = true;
			// });
			//Check for new followers in a minute
			this._pollSubscribersTimeout = setTimeout(()=>this.getLastestFollowers(false), 60000 * 5);
			return [];
		}else {
			//Something failed :(
			Logger.instance.log("youtube", {log:"Failed getting latest followers (status: "+res.status+")", error:res.text(), credits: this._creditsUsed, liveID:this._currentLiveId});
			if(res.status == 401) {
				if(!await this.refreshToken()) return [];
			}else if(res.status == 403) {
				StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_no_credits"));
				return [];
			}
		}
		//Youtube API has random downs (404, 503, ...)
		//Re executing the same request with the same page token seems to work in such case.
		await Utils.promisedTimeout(10000);
		return await this.getLastestFollowers(isInit);
	}
	
	/**
	 * Disconnect Youtube connexion
	 */
	public disconnect():void {
		Logger.instance.log("youtube", {log:"Disconnect from Youtube", credits: this._creditsUsed, liveID:this._currentLiveId});
		this.connected = false;
		this._currentLiveId = "";
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
	public async banUser(userId:string, duration_s:number = 0):Promise<string> {
		this._creditsUsed += 50;
		const params:{snippet:{liveChatId:string, type:string, bannedUserDetails:{channelId:string}, banDurationSeconds?:number}} = {
			snippet: {
				liveChatId:this._currentLiveId,
				type:duration_s > 0? "temporary" : "permanent",
				bannedUserDetails: {
					channelId:userId,
				}
			}
		};
		if(duration_s > 0) {
			Logger.instance.log("youtube", {log:"Timeout user #"+userId+" for "+duration_s+"s", credits: this._creditsUsed, liveID:this._currentLiveId});
			params.snippet.banDurationSeconds = duration_s;
		}else{
			Logger.instance.log("youtube", {log:"Ban user #"+userId, credits: this._creditsUsed, liveID:this._currentLiveId});
		}
		
		const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/bans");
		url.searchParams.append("part", "snippet");
		const body = JSON.stringify(params);

		let res = await fetch(url, {method:"POST", headers:this.headers, body});
		if(res.status == 200) {
			StoreProxy.users.flagBanned("youtube", this.channelId, userId, duration_s);
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
	public async unbanUser(userId:string):Promise<void> {
		this._creditsUsed += 50;
		Logger.instance.log("youtube", {log:"Unban user ID #"+userId, credits: this._creditsUsed, liveID:this._currentLiveId});

		//Youtube API is pure shit.
		//One cannot unban a user unless they have a Ban ID which they can
		//only get after banning the user.
		//I keep the ban ID in the _uidToBanID hashmap lcoally but it will
		//be lost after a twitchat restart.
		//Also if the user got banned by a mod it will simply not be possible
		//to unban them from the API as we won't get the necessery Ban ID.
		//And no endpoint allows to retreive a Ban ID for an arbitrary user
		if(!this._uidToBanID[userId]) {
			Logger.instance.log("youtube", {log:"No ban ID found for this user. Cannot unban the user.", credits: this._creditsUsed, liveID:this._currentLiveId});
			return;
		}
		
		const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/bans");
		url.searchParams.append("id", this._uidToBanID[userId]);

		let res = await fetch(url, {method:"DELETE", headers:this.headers});
		if(res.status == 200 || res.status == 204) {
			Logger.instance.log("youtube", {log:"User unbaned successfully", credits: this._creditsUsed, liveID:this._currentLiveId});
			StoreProxy.users.flagUnbanned("youtube", this.channelId, userId);
		}else{
			Logger.instance.log("youtube", {log:"An error occured when trying to unban the user", error:await res.text(), credits: this._creditsUsed, liveID:this._currentLiveId});
			StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_api_is_shit_unban"));
		}
	}

	/**
	 * Deletes a message by its ID
	 * @param messageId 
	 * @returns 
	 */
	public async deleteMessage(messageId:string):Promise<void> {
		
		const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
		url.searchParams.append("id", messageId);
		
		this._creditsUsed += 50;
		let res = await fetch(url, {method:"DELETE", headers:this.headers});
		if(res.status == 200 || res.status == 204) {
			Logger.instance.log("youtube", {log:"Deleted message #"+messageId, credits: this._creditsUsed, liveID:this._currentLiveId});
		}else{
			Logger.instance.log("youtube", {log:"Cannot delete message #"+messageId, error:await res.text(), credits: this._creditsUsed, liveID:this._currentLiveId});
			StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_message_delete"));
		}
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
		Logger.instance.log("youtube", {log:"Refreshing auth token", credits: this._creditsUsed, liveID:this._currentLiveId});
	
		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"youtube/auth"}).href;
		const params = {
			accessToken:this._token.access_token,
			expiryDate:this._token.expiry_date,
			refreshToken:this._token.refresh_token,
			tokenType:this._token.token_type,
			scope:this._token.scope,
			redirectURI,
		};
		const res = await ApiController.call("youtube/refreshtoken", "POST", params);
		
		if(res.status == 200 && res.json.data.token) {
			const token = res.json.data.token as YoutubeAuthToken;
			DataStore.set(DataStore.YOUTUBE_AUTH_TOKEN, token, false);
			this._token = token;
			const refreshDelay = token.expiry_date - Date.now() - 60000;
			Logger.instance.log("youtube", {log:"Auth token refreshed successfully. Schedule next refresh in "+Utils.formatDuration(refreshDelay)+"s", credits: this._creditsUsed, liveID:this._currentLiveId});
			//Refresh token 1min before it expires
			this._refreshTimeout = setTimeout(()=> {
				this.refreshToken();
			}, refreshDelay);
			this.connected = true;
			return true;
		}else {
			this._token = null;
			DataStore.remove(DataStore.YOUTUBE_AUTH_TOKEN);
			Logger.instance.log("youtube", {log:"An error occured when refreshing auth token", credits: this._creditsUsed, liveID:this._currentLiveId});
			StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_connect_expired"));
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
	private parseMessage(src:string):TwitchatDataTypes.ParseMessageChunk[] {
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
	private async loadUserInfoAndEmotes():Promise<void> {
		if(Object.keys(this._emotes).length == 0) {
			await this.getUserInfo();
			const emotesQuery = await fetch("/youtube/emote_list.json");
			let json = await emotesQuery.json();
			this._emotes = json;
		}
	}

	/**
	 * Schedules the token saving mode
	 */
	private scheduleTokenSaver():void {
		this.tokenSavingEnabled = false;

		clearTimeout(this._tokenSavingLogDebounce);
		let halfway = this._chatInactivityDisconnect / 2;
		this._tokenSavingLogDebounce = setTimeout(()=>{
			Logger.instance.log("youtube", {log:"No activity for the last "+Utils.formatDuration(halfway)+"s. Received "+this._tokenSavingLogDebounceMessageCount+" messages before that.", credits: this._creditsUsed, liveID:this._currentLiveId})
			this._tokenSavingLogDebounceMessageCount = 0;
		}, halfway);

		clearTimeout(this._lastChatActivityTimeout);
		this._lastChatActivityTimeout = setTimeout(()=>{
			this.tokenSavingEnabled = true;
			Logger.instance.log("youtube", {log:"Enabling token saving after "+Utils.formatDuration(this._chatInactivityDisconnect)+"s chat inactivity. Received "+this._tokenSavingLogDebounceMessageCount+" messages.", credits: this._creditsUsed, liveID:this._currentLiveId})
		}, this._chatInactivityDisconnect);
	}
}