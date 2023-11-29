import StoreProxy, { type RequireField } from "@/store/StoreProxy";
import ApiController from "../ApiController";
import type { YoutubeAuthToken, YoutubeChannelInfo, YoutubeLiveBroadcast, YoutubeMessages } from "@/types/youtube/YoutubeDataTypes";
import DataStore from "@/store/DataStore";
import { reactive } from "vue";
import Utils from "../Utils";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TwitchUtils from "../twitch/TwitchUtils";

/**
* Created : 28/11/2023 
*/
export default class YoutubeHelper {

	public connected:boolean = false;
	public liveFound:boolean = false;
	public channelId:string = "";
	
	private static _instance:YoutubeHelper;
	private _token:YoutubeAuthToken|null = null;
	private _currentLiveId:string = "";
	private _pollTimeout:number = -1;
	private _refreshTimeout:number = -1;
	private _creditsUsed:number = 0;
	private _emotes:{[key:string]:string} = {};
	private _uidToBanID:{[key:string]:string} = {};
	
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

	public get headers() {
		return {
			"Authorization": "Bearer "+YoutubeHelper.instance._token!.access_token,
			"Accept":"application/json"
		};
	}

	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Connect to Youtube if a refresh token is available
	 */
	public connect():void {
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
			})
		}
	}

	/**
	 * Starts youtube oAuth flow
	 */
	public async startAuthFlow():Promise<void> {
		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"youtube/auth"}).href;
		const oauth = await ApiController.call("youtube/oauthURL", "GET", {redirectURI});
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
		const redirectURI = document.location.origin + StoreProxy.router.resolve({name:"youtube/auth"}).href;
		const res = await ApiController.call("youtube/authenticate", "POST", {code, redirectURI});
		if(res.status == 200 && res.json.data.token) {
			const token = res.json.data.token as YoutubeAuthToken;
			DataStore.set(DataStore.YOUTUBE_AUTH_TOKEN, token, false);
			this._token = token;
			//Refresh token 1min before it expires
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = setTimeout(()=> {
				this.refreshToken();
			}, token.expiry_date - Date.now() - 60000);
			this.connected = true;
			//This will start automatic polling session
			await this.loadUserInfoAndEmotes();
			await this.getCurrentLiveBroadcast();
			return token;
		}else {
			this._token = null;
			this.connected = false;
			throw new Error("unknown error occured when loging in to Youtube");
		}
	}

	/**
	 * Get the current live broadcast
	 */
	public async getUserInfo():Promise<void> {
		this._creditsUsed ++;
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
		clearTimeout(this._pollTimeout);
		this._creditsUsed ++;
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
			//Sort by life cycle status importance
			json.items.sort((a,b)=> {
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
			//Get first item corresponding to a live running or coming.
			//Prioritise items with higher "live" status meaning
			let item = json.items.find(v=>v.status.lifeCycleStatus == "live");
			if(!item) item = json.items.find(v=>v.status.lifeCycleStatus == "liveStarting");
			if(!item) item = json.items.find(v=>v.status.lifeCycleStatus == "ready");
			if(!item) item = json.items.find(v=>v.status.lifeCycleStatus == "testing");
			if(!item) item = json.items.find(v=>v.status.lifeCycleStatus == "testStarting");
			if(item) {
				this.liveFound = true;
				this._currentLiveId = item.snippet.liveChatId;
				this.channelId = item.snippet.channelId;
				//Start polling messages
				this.getMessages();
			}else{
				this.liveFound = false;
				this._currentLiveId = "";
				//Search again in 1min
				this._pollTimeout = setTimeout(()=> this.getCurrentLiveBroadcast(), 60000);
			}
			return json;
		}else if(res.status == 403 || res.status == 401) {
			if(await this.refreshToken()) {
				await Utils.promisedTimeout(1000);
				return this.getCurrentLiveBroadcast();
			}
		}
		return null;
	}

	/**
	 * Get latest messages of current live stream
	 */
	public async getMessages(page:string = ""):Promise<YoutubeMessages|null> {
		this._creditsUsed ++;
		if(!this._currentLiveId) return null;
		let url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
		url.searchParams.append("part", "id");
		url.searchParams.append("part", "snippet");
		url.searchParams.append("part", "authorDetails");
		url.searchParams.append("liveChatId", this._currentLiveId);
		if(page) {
			url.searchParams.append("pageToken", page);
		}
		let res = await fetch(url, {method:"GET", headers:this.headers});
		if(res.status == 200) {
			//Check all message IDs
			const idsDone:{[key:string]:boolean} = {};
			StoreProxy.chat.messages.forEach(v => idsDone[v.id] = true );

			let json = await res.json() as YoutubeMessages;
			for (let i = 0; i < json.items.length; i++) {
				const m = json.items[i];
				//Message already registered? Skip it
				if(idsDone[m.id]) continue;

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
					date:Date.now(),
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
			}

			clearTimeout(this._pollTimeout);
			this._pollTimeout = setTimeout(()=>this.getMessages(json.nextPageToken), json.pollingIntervalMillis);
			
			return json;
		}else if(res.status == 403 || res.status == 401) {
			if(await this.refreshToken()) {
				await Utils.promisedTimeout(1000);
				return this.getMessages(page);
			}
		}
		return null;
	}
	
	/**
	 * Disconnect Youtube connexion
	 */
	public disconnect():void {
		this.connected = false;
		clearTimeout(this._pollTimeout);
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
			params.snippet.banDurationSeconds = duration_s;
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

		//Youtube API is pure shit.
		//One cannot unban a user unless they have a Ban ID which they can
		//only get after banning the user.
		//I keep the ban ID in the _uidToBanID hashmap lcoally but it will
		//be lost after a twitchat restart.
		//Also if the user got banned by a mod it will simply not be possible
		//to unban them from the API as we won't get the necessery Ban ID.
		//And no endpoint allows to retreive a Ban ID for an arbitrary user
		if(!this._uidToBanID[userId]) return;
		
		const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/bans");
		url.searchParams.append("id", this._uidToBanID[userId]);

		let res = await fetch(url, {method:"DELETE", headers:this.headers});
		if(res.status == 200 || res.status == 204) {
			StoreProxy.users.flagUnbanned("youtube", this.channelId, userId);
		}else{
			StoreProxy.main.alert(StoreProxy.i18n.t("error.youtube_api_is_shit_unban"));
		}
	}

	/**
	 * Deletes a message by its ID
	 * @param messageId 
	 * @returns 
	 */
	public async deleteMessage(messageId:string):Promise<void> {
		this._creditsUsed += 50;
		
		const url = new URL("https://www.googleapis.com/youtube/v3/liveChat/messages");
		url.searchParams.append("id", messageId);

		let res = await fetch(url, {method:"DELETE", headers:this.headers});
		if(res.status == 200 || res.status == 204) {
			//
		}else{
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
			//Refresh token 1min before it expires
			this._refreshTimeout = setTimeout(()=> {
				this.refreshToken();
			}, token.expiry_date - Date.now() - 60000);
			this.connected = true;
			return true;
		}else {
			this._token = null;
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
}