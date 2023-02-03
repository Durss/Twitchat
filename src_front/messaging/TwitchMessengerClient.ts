import rewardImg from '@/assets/icons/reward_highlight.svg';
import { EventDispatcher } from "@/events/EventDispatcher";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import BTTVUtils from "@/utils/emotes/BTTVUtils";
import FFZUtils from "@/utils/emotes/FFZUtils";
import SevenTVUtils from "@/utils/emotes/SevenTVUtils";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import * as tmi from "tmi.js";
import MessengerClientEvent from "./MessengerClientEvent";

/**
* Created : 25/09/2022 
*/
export default class TwitchMessengerClient extends EventDispatcher {

	private static _instance:TwitchMessengerClient;
	private _client!:tmi.Client;
	private _connectTimeout:number = -1;
	private _refreshingToken:boolean = false;
	private _channelList:string[] = [];
	private _connectedChannelCount:number = 0;
	private _channelIdToLogin:{[key:string]:string} = {};
	private _channelLoginToId:{[key:string]:string} = {};
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TwitchMessengerClient {
		if(!TwitchMessengerClient._instance) {
			TwitchMessengerClient._instance = new TwitchMessengerClient();
		}
		return TwitchMessengerClient._instance;
	}

	
	/******************
	* PUBLIC METHODS *
	******************/
	public loadMeta():void {
		TwitchUtils.loadGlobalBadges();
		StoreProxy.users.loadMyFollowings();
		StoreProxy.users.loadMyFollowers();
		StoreProxy.users.initBlockedUsers();

		const sParams = StoreProxy.params;
		if(sParams.appearance.bttvEmotes.value === true) {
			BTTVUtils.instance.enable();
		}else{
			BTTVUtils.instance.disable();
		}
		if(sParams.appearance.ffzEmotes.value === true) {
			FFZUtils.instance.enable();
		}else{
			FFZUtils.instance.disable();
		}
		if(sParams.appearance.sevenTVEmotes.value === true) {
			SevenTVUtils.instance.enable();
		}else{
			SevenTVUtils.instance.disable();
		}

		//Use an anonymous method to avoid blocking loading while
		//all twitch tags are loading
		try {
			if(StoreProxy.auth.twitch.user.is_affiliate || StoreProxy.auth.twitch.user.is_partner) {
				const channelId = StoreProxy.auth.twitch.user.id;
				TwitchUtils.getPolls(channelId);
				TwitchUtils.getPredictions(channelId);
			}
		}catch(e) {
			//User is probably not an affiliate
		}
	}

	/**
	 * Connect to a channel
	 * @param channel 
	 * @param anonymous 
	 */
	public connectToChannel(channel:string):void {
		//Already connected to that channel ?
		if(this._channelList.findIndex(v=>v === channel) > -1) return;
		
		this._channelList.push(channel);
		
		//Debounce connection calls if calling it for multiple channels at once
		clearTimeout(this._connectTimeout);
		this._connectTimeout = setTimeout(async ()=>{
			const chans = await TwitchUtils.loadUserInfo(undefined, this._channelList);
			if(chans.length === 0) {
				StoreProxy.main.alert("Unable to load user info: "+ this._channelList);
				return;
			}
			chans.forEach(async v=> {
				this._channelIdToLogin[v.id] = v.login;
				this._channelLoginToId[v.login] = v.id;
				await StoreProxy.users.preloadTwitchModerators(v.id);
				//Check if we're a mod on this channel by testing if the get chatters endpoint
				//returns something or not
				const amIModThere = (await TwitchUtils.getChatters(v.id)) !== false;
				if(amIModThere) {
					let meObj = StoreProxy.auth.twitch.user;
					//Go through getUserFrom() that will init the channelInfo property for later use
					let me = StoreProxy.users.getUserFrom("twitch", v.id, meObj.id, meObj.login, meObj.displayName)
					//Flag self as mod of that channel
					me.channelInfo[v.id].is_moderator = true;
				}
				const u = StoreProxy.users.getUserFrom("twitch", v.id, v.id, v.login, v.display_name);//Preload user to storage
				u.channelInfo[u.id].online = true;
				
				const meId = StoreProxy.auth.twitch.user.id;
				TwitchUtils.loadUserBadges(v.id);
				TwitchUtils.loadCheermoteList(v.id);
				TwitchUtils.getRoomSettings(v.id).then(settings=> {
					if(settings) {
						StoreProxy.stream.setRoomSettings(v.id, settings);
						if(settings.chatDelay || settings.emotesOnly || settings.subOnly || typeof settings.followOnly === "number") {

							const message:TwitchatDataTypes.MessageRoomSettingsData = {
								id:Utils.getUUID(),
								date:Date.now(),
								type:"room_settings",
								platform:"twitch",
								channel_id:v.id,
								channel_name:v.login,
								settings
							}
							StoreProxy.chat.addMessage(message);
						}
					}
				});
				//Load chatters list if we have necessary rights
				TwitchUtils.getChatters(v.id, v.login).then(res => {
					(res || []).forEach((login) => {
						//Don't notify when joining our own room.
						//There's a "connect" notification for that
						if(v.login != login || v.id != StoreProxy.auth.twitch.user.id) {
							this.onJoin(v.login, login, v.id == meId, true);
						}
					});
				});
				BTTVUtils.instance.addChannel(v.id);
				FFZUtils.instance.addChannel(v.id);
				SevenTVUtils.instance.addChannel(v.id);
			});
			
			if(!this._client) {
				//Not yet connected to IRC, create client and connect to specified
				//channels with specified credentials
				const options:tmi.Options = {
					options: { debug: false, skipUpdatingEmotesets:true, },
					connection: { reconnect: true, maxReconnectInverval:2000 },
					channels:this._channelList.concat(),
				};
				options.identity = {
					username: StoreProxy.auth.twitch.user.login,
					password: "oauth:"+StoreProxy.auth.twitch.access_token,
				};
				this._client = new tmi.Client(options);
				this._client.connect();
				
				this.initialize();
			}else{
				//Already connected to IRC, add channel to the list
				//and reconnect IRC client
				const params = this._client.getOptions();
				params.channels = this._channelList;

				this.reconnect();
			}
		}, 100);
	}

	/**
	 * Disconnect from a specific channel
	 * @param channel 
	 */
	public async disconnectFromChannel(channel:string):Promise<void> {
		const params = this._client.getOptions();
		const index = this._channelList.findIndex(v=>v===channel);
		if(index > -1) {
			this._channelList.splice(index, 1);
			params.channels = this._channelList;
			await this.reconnect();
		}
	}

	/**
	 * Refresh IRC token
	 * Disconnects from all chans and connects back to it
	 * @param token 
	 */
	public async refreshToken(token:string):Promise<void> {
		if(!this._client) return;
		this._refreshingToken = true;
		this._connectedChannelCount = 0;
		const params = this._client.getOptions();
		if(!params.identity) {
			params.identity = {
				username: StoreProxy.auth.twitch.user.login,
				password: "oauth:"+StoreProxy.auth.twitch.access_token,
			}
		}
		params.identity.password = token;
		await this.reconnect();
	}
	
	/**
	 * Disconnect from all channels and cut IRC connection
	 */
	public disconnect():void {
		if(this._client) {
			this._client.disconnect();
		}
	}
	
	/**
	 * Disconnect from all channels and cut IRC connection
	 */
	public async sendMessage(channelId:string, text:string):Promise<boolean> {
		//TMI.js doesn't send the message back to their sender if sending
		//it just after receiving a message (same frame).
		//If we didn't wait for a frame, the message would be sent properly
		//to viewers, but wouldn't appear on this chat.
		//To make sure this isn't a problem through the app we always wait
		//a frame before sending the message
		await Utils.promisedTimeout(0);

		//Workaround to a weird behavior of TMI.js.
		//If the message starts by a "\" it's properly sent on all
		//connected clients, but never sent back to the sender.
		//Removing all of them to avoid that...
		text = text.replace(/^\\+/gi, "");

		if(text.charAt(0) == "/") {
			const chunks = text.split(/\s/gi).filter(v => v != "");
			let cmd = (chunks.shift() as string).toLowerCase();

			//If using /announce command, extract color
			if(cmd.indexOf("/announce") === 0) {
				let color = cmd.replace("/announce", "");
				if(color.length === 0) color = "primary";
				if(["blue","green","orange","purple","primary"].indexOf(color) === -1) {
					StoreProxy.main.alert("Invalid announcement color");
					return false;
				}
				cmd = "/announce";
				chunks.unshift(color);
			}

			async function getUserFromLogin(login:string, channelId:string):Promise<TwitchatDataTypes.TwitchatUser|null>{
				login = login.replace(/^@/gi, "");
				return new Promise((resolve)=>{
					StoreProxy.users.getUserFrom("twitch", channelId, undefined, login, undefined, (user)=> {
						if(user.errored) {
							StoreProxy.main.alert("User <strong>\""+login+"\"</strong> does not exists");
						}
						resolve(user);
					})
				})
				// let res:TwitchDataTypes.UserInfo[];
				// try {
				// 	res = await TwitchUtils.loadUserInfo(undefined, [login])
				// }catch(error) {
				// 	StoreProxy.main.alert("User @"+login+" not found on Twitch.");
				// 	return null;
				// }
				// return res[0];
			}

			switch(cmd) {
				case "/announce": await TwitchUtils.sendAnnouncement(channelId, chunks.splice(1).join(" "), chunks[0] as "blue"|"green"|"orange"|"purple"|"primary"); return true;
				case "/ban":{
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.banUser(user, channelId, undefined, chunks.splice(1).join(" "));
					return false;
				}
				case "/unban": {
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.unbanUser(user, channelId);
					return false;
				}
				case "/block":{
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.blockUser(user, channelId);
					return false;
				}
				case "/unblock": {
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.unblockUser(user, channelId);
					return false;
				}
				case "/timeout":{
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.banUser(user, channelId, parseInt(chunks[1]), chunks[2]);
					return false;
				}
				case "/untimeout": {
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.unbanUser(user, channelId);
					return false;
				}
				case "/vip": {
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.addRemoveVIP(false, channelId, user);
					return false;
				}
				case "/unvip": {
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.addRemoveVIP(true, channelId, user);
					return false;
				}
				case "/mod": {
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.addRemoveModerator(false, channelId, user);
					return false;
				}
				case "/unmod": {
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.addRemoveModerator(true, channelId, user);
					return false;
				}

				case "/commercial": {
					const duration = parseInt(chunks[0]);
					StoreProxy.stream.startAd(duration);
					return true;
				}
				case "/shield": return await TwitchUtils.setShieldMode(channelId, true);
				case "/shieldoff": return await TwitchUtils.setShieldMode(channelId, false);
				case "/delete": return await TwitchUtils.deleteMessages(channelId, chunks[0]);
				case "/clear": return await TwitchUtils.deleteMessages(channelId);
				case "/color": return await TwitchUtils.setColor(chunks[0]);
				case "/emoteonly": return await TwitchUtils.setRoomSettings(channelId, {emotesOnly:true});
				case "/emoteonlyoff": return await TwitchUtils.setRoomSettings(channelId, {emotesOnly:false});
				case "/followers": return await TwitchUtils.setRoomSettings(channelId, {followOnly:parseInt(chunks[0])});
				case "/followersoff": return await TwitchUtils.setRoomSettings(channelId, {followOnly:0});
				case "/slow": return await TwitchUtils.setRoomSettings(channelId, {slowMode:parseInt(chunks[0])});
				case "/slowoff": return await TwitchUtils.setRoomSettings(channelId, {slowMode:0});
				case "/subscribers": return await TwitchUtils.setRoomSettings(channelId, {subOnly:true});
				case "/subscribersoff": return await TwitchUtils.setRoomSettings(channelId, {subOnly:false});
				case "/raid": return await TwitchUtils.raidChannel(chunks[0]);
				case "/unraid": return await TwitchUtils.raidCancel();
				case "/clip": return await TwitchUtils.createClip();
				case "/whisper":
				case "/w": {
					const login = chunks[0];
					return await TwitchUtils.whisper(chunks.splice(1).join(" "), login);
				}

				//TODO
				case "/uniquechat": return false;
				case "/uniquechatoff": return false;
				case "/marker": return false;
				case "/mods": return false;
				case "/vips": return false;
			}

		}
		
		this._client.say(this._channelIdToLogin[channelId], text);
		return true
	}

	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private async initialize():Promise<void> {
		this._client.on('message', this.message.bind(this));
		this._client.on("join", this.onJoin.bind(this));
		this._client.on("part", this.onLeave.bind(this));
		this._client.on('cheer', this.onCheer.bind(this));
		this._client.on('resub', this.resub.bind(this));
		this._client.on('subscription', this.subscription.bind(this));
		this._client.on('primepaidupgrade', this.subscriptionPrimeUpgrade.bind(this));
		this._client.on('subgift', this.subgift.bind(this));
		this._client.on('anonsubgift', this.anonsubgift.bind(this));
		this._client.on('giftpaidupgrade', this.giftpaidupgrade.bind(this));
		this._client.on('anongiftpaidupgrade', this.anongiftpaidupgrade.bind(this));
		this._client.on("ban", this.onBanUser.bind(this));
		this._client.on("timeout", this.onTimeoutUser.bind(this));
		this._client.on("raided", this.raided.bind(this));
		this._client.on("disconnected", this.disconnected.bind(this));
		this._client.on("clearchat", this.clearchat.bind(this));
		this._client.on("messagedeleted", this.onDeleteMessage.bind(this));
		this._client.on('raw_message', this.raw_message.bind(this));

		const hashmap:{[key:string]:boolean} = {};
		try {
			//Load bots list
			const res = await fetch('https://api.twitchinsights.net/v1/bots/all');
			const json = await res.json();
			(json.bots as string[][]).forEach(b => hashmap[ b[0].toLowerCase() ] = true);
		}catch(error) {
			//Fallback in case twitchinsights dies someday
			["streamelements", "nightbot", "wizebot", "commanderroot", "anotherttvviewer", "streamlabs", "communityshowcase"]
			.forEach(b => hashmap[ b[0].toLowerCase() ] = true);
		}
		StoreProxy.users.setBotsMap("twitch", hashmap);
	}

	/**
	 * Refresh IRC connection
	 * Called after updating the token or the channels list
	 */
	private async reconnect():Promise<void> {
		await this._client.disconnect();
		await this._client.connect();
	}

	/**
	 * Gets a user object from IRC tags
	 * @param tags 
	 * @returns 
	 */
	private getUserFromTags(tags:tmi.ChatUserstate|tmi.SubUserstate|tmi.SubGiftUpgradeUserstate|tmi.SubGiftUserstate|tmi.AnonSubGiftUserstate|tmi.AnonSubGiftUpgradeUserstate|tmi.PrimeUpgradeUserstate, channelId:string):TwitchatDataTypes.TwitchatUser {
		const login			= tags.login ?? tags.username ?? tags["display-name"];
		const user			= StoreProxy.users.getUserFrom("twitch", channelId, tags["user-id"], login, tags["display-name"], undefined, false, true);
		const isMod			= tags.badges?.moderator != undefined || tags.mod === true;
		const isVip			= tags.badges?.vip != undefined;
		const isSub			= tags.badges?.subscriber != undefined || tags.subscriber === true;
		const isSubGifter	= tags.badges && tags.badges["sub-gifter"] != undefined;
		const isBroadcaster	= tags.badges?.broadcaster != undefined;
		const isPartner		= tags.badges?.partner != undefined;

		// user.channelInfo[channelId].online	= true;
		delete user.temporary;//Avoids useless server call
		
		if(tags.color)		user.color = tags.color;
		if(isMod)			user.channelInfo[channelId].is_moderator = true;
		if(isVip)			user.channelInfo[channelId].is_vip = true;
		if(isSub)			user.channelInfo[channelId].is_subscriber = true;
		if(isSubGifter)		user.channelInfo[channelId].is_gifter = true;
		if(isBroadcaster)	user.channelInfo[channelId].is_broadcaster = true;
		if(isPartner) {
			user.is_partner		= true;
			user.is_affiliate	= true;
		}

		if(tags.badges && tags["room-id"]) {
			user.channelInfo[channelId].badges = TwitchUtils.getBadgesFromRawBadges(tags["room-id"], tags["badge-info"], tags.badges);
		}else{
			//Cleanup badges from the user
			user.channelInfo[channelId].badges = [];
		}
		return user;
	}

	private getChannelID(login:string):string {
		login = login.replace("#", "");
		return this._channelLoginToId[login];
	}

	/**
	 * Gets a user's state object from its login
	 * 
	 * @param login 
	 * @param channelId 
	 * @returns 
	 */
	private getUserStateFromLogin(login:string, channelId:string):{user:TwitchatDataTypes.TwitchatUser, wasOnline:boolean} {
		//Search if a user with this name and source exists on store
		//If no user exists a temporary user object will be returned and
		//populated asynchronously via an API call
		const user		= StoreProxy.users.getUserFrom("twitch", channelId, undefined, login, undefined, undefined);
		const wasOnline	= user.channelInfo[channelId].online === true;
		// user.channelInfo[channelId].online = true;
		return {user, wasOnline};
	}
	
	/**
	 * Gets a sub object from data
	 * 
	 * @param channel 
	 * @param tags 
	 * @param methods 
	 * @param message 
	 * @returns 
	 */
	private getCommonSubObject(channel:string, tags:tmi.ChatUserstate|tmi.SubUserstate|tmi.SubGiftUpgradeUserstate|tmi.SubGiftUserstate|tmi.AnonSubGiftUserstate|tmi.AnonSubGiftUpgradeUserstate|tmi.PrimeUpgradeUserstate, methods?:tmi.SubMethods, message?:string):TwitchatDataTypes.MessageSubscriptionData {
		const channel_id = this.getChannelID(channel);
		const res:TwitchatDataTypes.MessageSubscriptionData = {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			id:tags.id ?? Utils.getUUID(),
			channel_id,
			date:parseInt(tags["tmi-sent-ts"] as string ?? Date.now().toString()),
			user:this.getUserFromTags(tags, channel_id),
			tier: 1,
			is_gift: false,
			is_giftUpgrade: false,
			is_resub: false,
			months:typeof tags["msg-param-multimonth-duration"] == "string"? parseInt(tags["msg-param-multimonth-duration"]) : -1,
			streakMonths:typeof tags["msg-param-streak-months"] == "string"? parseInt(tags["msg-param-streak-months"]) : -1,
			totalSubDuration:typeof tags["msg-param-cumulative-months"] == "string"? parseInt(tags["msg-param-cumulative-months"]) : -1,
			raw_data:{tags, methods, message}
		}
		if(methods) res.tier =  methods.prime? "prime" : (parseInt((methods.plan as string) || "1000")/1000) as (1|2|3);
		if(message) {
			res.message = message;
			res.message_html = TwitchUtils.parseEmotes(message, tags["emotes-raw"]);
		}
		return res;
	}

	private async message(channel:string, tags:tmi.ChatUserstate, message:string, self:boolean):Promise<void> {
		
		//Ignore anything that's not a message or a /me
		if(tags["message-type"] != "chat" && tags["message-type"] != "action" && (tags["message-type"] as string) != "announcement") return;

		//Ignore rewards with text, they are also sent to PubSub with more info
		if(tags["custom-reward-id"]) return;

		const channel_id = this.getChannelID(channel);
		const user = this.getUserFromTags(tags, channel_id);

		const data:TwitchatDataTypes.MessageChatData = {
			id:tags.id!,
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			platform:"twitch",
			channel_id,
			date:Date.now(),

			user,
			message,
			answers:[],
			message_html:"",
			message_no_emotes:"",
			is_short:false,
			raw_data:{tags, message}
		};

		console.log(tags);
		data.message_html = TwitchUtils.parseEmotes(message, tags["emotes-raw"], false, tags.sentLocally == true);
		data.message_no_emotes = Utils.stripHTMLTags(data.message_html);
		data.is_short = data.message_no_emotes.length / data.message.length < .6 || data.message.length < 4;
				
		// If message is an answer, set original message's ref to the answer
		// Called when using the "answer feature" on twitch chat
		if(tags["reply-parent-msg-id"]) {
			const messages = StoreProxy.chat.messages;
			//Search for original message the user answered to
			for (let i = messages.length-1; i >= 0; i--) {
				let m = messages[i];
				if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
				if(m.id === tags["reply-parent-msg-id"]) {
					if(m.answersTo) m = m.answersTo;
					if(!m.answers) m.answers = [];
					m.answers.push( data );
					data.answersTo = m;
					break;
				}
			}
		}
		
		data.twitch_isSlashMe		= tags["message-type"] === "action";
		data.twitch_isReturning		= tags["returning-chatter"] === true;
		data.twitch_isFirstMessage	= tags['first-msg'] === true && tags["msg-id"] != "user-intro";
		data.twitch_isPresentation	= tags["msg-id"] == "user-intro";
		data.twitch_isHighlighted	= tags["msg-id"] === "highlighted-message";
		if(tags["msg-param-color"]) data.twitch_announcementColor= tags["msg-param-color"].toLowerCase();
		const pinAmount:number|undefined = tags["pinned-chat-paid-canonical-amount"];
		if(pinAmount) {
			data.elevatedInfo	= {amount:pinAmount, duration_s:{"5":30, "10":60, "25":90, "50":120, "100":150}[pinAmount] ?? 30};
		}

		//Send reward redeem message if the message comes from an "highlight my message" reward
		if(data.twitch_isHighlighted) {
			const reward:TwitchatDataTypes.MessageRewardRedeemData = {
				channel_id: data.channel_id,
				date: data.date,
				id:Utils.getUUID(),
				platform:"twitch",
				type:TwitchatDataTypes.TwitchatMessageType.REWARD,
				user: data.user,
				reward: {
					id:"highlighted-message",
					title:"Highlight my message",
					cost:-1,
					description:"",
					icon:{
						sd:rewardImg,
					}
				},
				message:data.message,
				message_html:data.message_html,
			}
			this.dispatchEvent(new MessengerClientEvent("REWARD", reward));
		}

		this.dispatchEvent(new MessengerClientEvent("MESSAGE", data));
	}

	private onJoin(channelName:string, username:string, self:boolean, isFakeJoin:boolean = false):void {
		if(this._refreshingToken && self) {
			//Don't show join info during a reconnect
			this._refreshingToken = ++this._connectedChannelCount < this._channelList.length;
			return;
		}

		const channel_id = this.getChannelID(channelName);
		const userState = this.getUserStateFromLogin(username, channel_id);
		userState.user.channelInfo[channel_id].online = true;

		if(self) {
			//Avoid sending a connect message on chat when joining others channels
			if(isFakeJoin) return;
			const d:TwitchatDataTypes.MessageConnectData = {
				platform:"twitch",
				type:TwitchatDataTypes.TwitchatMessageType.CONNECT,
				id:Utils.getUUID(),
				date:Date.now(),
				channel_id,
				user:userState.user,
			};
			this.dispatchEvent(new MessengerClientEvent("CONNECTED", d));
		}else{

			if(userState.wasOnline === true) return;//User was already here, don't send join notification
			this.dispatchEvent(new MessengerClientEvent("JOIN", {
				platform:"twitch",
				type:TwitchatDataTypes.TwitchatMessageType.JOIN,
				id:Utils.getUUID(),
				channel_id,
				date:Date.now(),
				users:[userState.user],
			}));
		}
	}

	private onLeave(channelName:string, username:string):void {
		const channel_id = this.getChannelID(channelName);
		const userState = this.getUserStateFromLogin(username, channel_id);

		this.dispatchEvent(new MessengerClientEvent("LEAVE", {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.LEAVE,
			id:Utils.getUUID(),
			channel_id,
			date:Date.now(),
			users:[userState.user],
		}));
	}

	private async onCheer(channel:string, tags:tmi.ChatUserstate, message:string):Promise<void> {
		let message_html = TwitchUtils.parseEmotes(message, tags["emotes-raw"]);
		message_html = await TwitchUtils.parseCheermotes(message_html, StoreProxy.auth.twitch.user.id);
		const channel_id = this.getChannelID(channel);
		this.dispatchEvent(new MessengerClientEvent("CHEER", {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.CHEER,
			id:tags.id ?? Utils.getUUID(),
			channel_id,
			date:parseInt(tags["tmi-sent-ts"] as string ?? Date.now().toString()),
			user:this.getUserFromTags(tags, channel_id),
			bits:parseFloat(tags.bits as string) ?? -1,
			message,
			message_html,
		}));
	}

	private resub(channel: string, username: string, months: number, message: string, tags: tmi.SubUserstate, methods: tmi.SubMethods):void {
		const data = this.getCommonSubObject(channel, tags, methods, message);
		data.is_resub = true;
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private subscription(channel: string, username: string, methods: tmi.SubMethods, message: string, tags: tmi.SubUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods, message);
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private subscriptionPrimeUpgrade(channel:string, username:string, methods:tmi.SubMethods, tags:tmi.PrimeUpgradeUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private subgift(channel: string, username: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.SubGiftUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		data.is_gift = true;
		data.streakMonths = streakMonths
		if(typeof tags["msg-param-gift-months"] == "string") {
			data.months = parseInt(tags["msg-param-gift-months"] ?? "1");
		}
		const recipientLogin = tags["msg-param-recipient-user-name"] ?? recipient;
		const recipientName = tags["msg-param-recipient-display-name"] ?? recipient;
		const recipientId = tags["msg-param-recipient-id"];
		const user = StoreProxy.users.getUserFrom("twitch", data.channel_id, recipientId, recipientLogin, recipientName);
		data.gift_recipients = [user];
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}
	
	private anonsubgift(channel: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.AnonSubGiftUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		data.is_gift = true;
		data.streakMonths = streakMonths
		if(typeof tags["msg-param-sender-count"] == "string") {
			data.months = parseInt(tags["msg-param-sender-count"] ?? "1");
		}
		const recipientLogin = tags["msg-param-recipient-user-name"] ?? recipient;
		const recipientName = tags["msg-param-recipient-display-name"] ?? recipient;
		const recipientId = tags["msg-param-recipient-id"];
		const user = StoreProxy.users.getUserFrom("twitch", data.channel_id, recipientId, recipientLogin, recipientName);
		data.gift_recipients = [user];
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}
	
	private giftpaidupgrade(channel: string, username: string, sender: string, tags: tmi.SubGiftUpgradeUserstate):void {
		const data = this.getCommonSubObject(channel, tags);
		data.is_giftUpgrade = true;
		data.gift_upgradeSender = this.getUserStateFromLogin(sender, data.channel_id).user;
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}
	
	private anongiftpaidupgrade(channel: string, username: string, tags: tmi.AnonSubGiftUpgradeUserstate):void {
		const data = this.getCommonSubObject(channel, tags);
		data.is_giftUpgrade = true;
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private async raided(channel: string, username: string, viewers: number):Promise<void> {
		/*
		const channel_id = this.getChannelID(channel);
		const user = this.getUserFromLogin(username, channel_id).user;
		let uid = user.id;
		if(user.temporary) {
			//Safe fallback in case user info are not loaded yet.
			uid = (await TwitchUtils.loadUserInfo(undefined, [username]))[0].id;
		}
		const streamInfo = await TwitchUtils.loadChannelInfo([uid]);
		const message:TwitchatDataTypes.MessageRaidData = {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.RAID,
			id:Utils.getUUID(),
			channel_id,
			date:Date.now(),
			user,
			viewers,
			stream:{
				title:streamInfo[0]?.title ?? "loading error :(",
				category:streamInfo[0]?.game_name ?? "loading error :(",
			}
		};
		this.dispatchEvent(new MessengerClientEvent("RAID", message));
		//*/
	}
	
	private disconnected(reason:string):void {
		//Don't show disconnect info if its a reconnect
		if(this._refreshingToken) return;

		console.log('Disconnected for reason: ', reason);

		const eventData:TwitchatDataTypes.MessageDisconnectData = {
			channel_id: StoreProxy.auth.twitch.user.id,
			platform:"twitch",
			id:Utils.getUUID(),
			type:TwitchatDataTypes.TwitchatMessageType.DISCONNECT,
			date:Date.now(),
			user:StoreProxy.auth.twitch.user,
		};
		this.dispatchEvent(new MessengerClientEvent("DISCONNECTED", eventData));
	}

	private clearchat(channel:string):void {
		const channel_id = this.getChannelID(channel);
		const me = StoreProxy.auth.twitch.user;
		
		//If we're the broadcaster we get clear details from pubsub
		if(channel_id == me.id) return;

		this.dispatchEvent(new MessengerClientEvent("CLEAR_CHAT", {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT,
			id:Utils.getUUID(),
			channel_id,
			date:Date.now(),
			fromAutomod:false,
		}));
	}
	
	
	private onDeleteMessage(channel: string, username: string, deletedMessage: string, tags:tmi.DeleteUserstate):void {
		const msgID = tags["target-msg-id"];
		if(!msgID) return;
		this.dispatchEvent(new MessengerClientEvent("DELETE_MESSAGE", msgID));
	}

	private onBanUser(channel: string, username: string, reason: string):void {
		const channel_id = this.getChannelID(channel);
		const user = this.getUserStateFromLogin(username, channel_id).user;
		StoreProxy.users.flagBanned("twitch", channel_id, user.id);
	}

	private onTimeoutUser(channel: string, username: string, reason: string, duration: number):void {
		const channel_id = this.getChannelID(channel);
		const user = this.getUserStateFromLogin(username, channel_id).user;
		StoreProxy.users.flagBanned("twitch", channel_id, user.id, duration);
	}

	private async raw_message(messageCloned: { [property: string]: unknown }, data: { [property: string]: unknown }):Promise<void> {
		//TMI parses the "badges" and "badge-info" props right AFTER dispatching
		//the "raw_message" event.
		//Let's wait a frame so the props are parsed
		await Utils.promisedTimeout(0);
		switch(data.command) {
			case "USERNOTICE": {
				//Handle announcement messages
				if(((data.tags as tmi.ChatUserstate)["msg-id"] as unknown) === "announcement") {
					const params = data.params as string[];
					const tags = data.tags as tmi.ChatUserstate;
					tags.username = tags.login;
					this.message(params[0], tags, params[1], false);
				}
				break;
			}


			case "USERSTATE": {
				const [channelName] = (data as {params:string[]}).params;
				const channelId = this.getChannelID(channelName);
				TwitchUtils.loadEmoteSets(channelId, ((data as tmi.UserNoticeState).tags["emote-sets"] ?? []).split(","));
				break;
			}

			//Using this instead of the "notice" event from TMI as it's not
			//fired for many notices whereas here we get them all
			case "NOTICE": {
				let [msgid, url, cmd, channel, message] = (data.raw as string).replace(/@msg-id=(.*) :(.*) (.*) (#.*) :(.*)/gi, "$1::$2::$3::$4::$5").split("::");
				let noticeId:TwitchatDataTypes.TwitchatNoticeStringType = TwitchatDataTypes.TwitchatNoticeType.GENERIC;
				if(!message) {
					if(msgid.indexOf("bad_delete_message_error") > -1) {
						message = StoreProxy.i18n.t("error.delete_message")
						noticeId = TwitchatDataTypes.TwitchatNoticeType.ERROR;
					}
					if(msgid.indexOf("authentication failed") > -1) {
						message = StoreProxy.i18n.t("error.irc_reconect");
						this.dispatchEvent(new MessengerClientEvent("REFRESH_TOKEN"));
						noticeId = TwitchatDataTypes.TwitchatNoticeType.ERROR;
					}
				}
				if(message) {
					this.notice(noticeId, channel, message);
				}
				break;
			}
			default: break;
		}
	}

	private notice(id:TwitchatDataTypes.TwitchatNoticeStringType, channel:string, message:string):void {
		const eventData:TwitchatDataTypes.MessageNoticeData = {
			channel_id: this.getChannelID(channel),
			id:Utils.getUUID(),
			type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
			date:Date.now(),
			platform:"twitch",
			message:message,
			noticeId:id,
		};
		this.dispatchEvent(new MessengerClientEvent("NOTICE", eventData));
	}

}