import rewardImg from '@/assets/icons/reward_highlight.svg';
import { EventDispatcher } from "@/events/EventDispatcher";
import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from '@/utils/Config';
import Utils from "@/utils/Utils";
import BTTVUtils from "@/utils/emotes/BTTVUtils";
import FFZUtils from "@/utils/emotes/FFZUtils";
import SevenTVUtils from "@/utils/emotes/SevenTVUtils";
import { TwitchScopes } from '@/utils/twitch/TwitchScopes';
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import * as tmi from "tmi.js";
import MessengerClientEvent from "./MessengerClientEvent";
import * as Sentry from "@sentry/vue";
import Logger from '@/utils/Logger';
import Database from '@/store/Database';

/**
* Created : 25/09/2022
*/
export default class TwitchMessengerClient extends EventDispatcher {

	private static _instance:TwitchMessengerClient;
	private _client!:tmi.Client;
	private _connectTimeout:number = -1;
	private _refreshingToken:boolean = false;
	private _connectedChans:{[key:string]:boolean} = {};
	private _channelList:string[] = [];
	private _connectedChannelCount:number = 0;
	private _channelIdToLogin:{[key:string]:string} = {};
	private _channelLoginToId:{[key:string]:string} = {};
	private _remoteChanColorPointer:number = 0;
	private _remoteChanColors:string[] = ["#d08a64","#85c56e","#8180d3","#d578c2","#7bd0cf","#dcc87d"];
	private _remoteChanToColor:{[chanId:string]:string} = {};
	private _remoteIdToUser:{[chanId:string]:TwitchatDataTypes.TwitchatUser} = {};
	private _remoteIdToPromise:{[chanId:string]:Promise<TwitchatDataTypes.TwitchatUser>} = {}

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
	/**
	 * Connect to a channel
	 * @param channel
	 * @param anonymous
	 */
	public connectToChannel(channel:string):void {
		//Already connected to IRC, just add the channel
		// if(this._client) {
		// 	Logger.instance.log("irc", {info:"Connect to channel "+channel});
		// 	this._client.join(channel);
		// 	this.reconnect();
		// 	return;
		// }

		this._channelList.push(channel);

		//Debounce connection calls if calling it for multiple channels at once
		clearTimeout(this._connectTimeout);
		this._connectTimeout = window.setTimeout(async ()=>{
			Logger.instance.log("irc", {info:"Initial connect to channel(s) "+this._channelList.join(", ")});
			const chans = await TwitchUtils.getUserInfo(undefined, this._channelList);
			if(chans.length === 0) {
				Logger.instance.log("irc", {info:"Initial connect failed for channel(s) "+this._channelList.join(", ")+". Matching user not found on Twitch.", data:chans});
				StoreProxy.common.alert("Unable to load user info: "+ this._channelList);
				return;
			}

			const meObj = StoreProxy.auth.twitch.user;

			chans.forEach(async channel=> {
				//Skip it if already connected
				if(this._connectedChans[channel.id] === true) return;

				this._channelIdToLogin[channel.id] = channel.login;
				this._channelLoginToId[channel.login] = channel.id;

				//Check if we're a mod on this channel by testing if the get chatters endpoint
				//returns something or not (no dedicated API for this ATM)
				TwitchUtils.getChatters(channel.id).then(result => {
					const amIModThere = result !== false;
					if(amIModThere) {
						//Go through getUserFrom() that will init the channelInfo property for later use
						const me = StoreProxy.users.getUserFrom("twitch", channel.id, meObj.id, meObj.login, meObj.displayNameOriginal, undefined, undefined, false, undefined, false)
						//Flag self as mod of that channel
						me.channelInfo[channel.id].is_moderator = true;
					}
				})
				const u = StoreProxy.users.getUserFrom("twitch", channel.id, channel.id, channel.login, channel.display_name, undefined, undefined, false, undefined, false);//Preload user to storage
				u.channelInfo[channel.id].online = true;
				u.channelInfo[channel.id].is_broadcaster = true;

				//Init stream info
				if(!StoreProxy.stream.currentStreamInfo[channel.id]) {
					//Don't init if already existing. Authenticated user's stream info
					//are loaded during auth process
					StoreProxy.stream.currentStreamInfo[channel.id] = {
						title:"",
						category:"",
						live:false,
						started_at:0,
						tags:[],
						user:u,
						viewers:0,
						lastSoDoneDate:0,
						previewUrl: "",
					}
				}

				TwitchUtils.loadEmoteSets(channel.id);
				TwitchUtils.loadUserBadges(channel.id);
				TwitchUtils.loadCheermoteList(channel.id);
				TwitchUtils.getRoomSettings(channel.id, true).then(settings=> {
					if(settings) {
						StoreProxy.stream.setRoomSettings(channel.id, settings);
						if(settings.chatDelay || settings.emotesOnly || settings.subOnly || typeof settings.followOnly === "number") {

							const message:TwitchatDataTypes.MessageRoomSettingsData = {
								id:Utils.getUUID(),
								date:Date.now(),
								type:"room_settings",
								platform:"twitch",
								channel_id:channel.id,
								channel_name:channel.login,
								settings
							}
							StoreProxy.chat.addMessage(message);
						}
					}
				});
				//Load chatters list if we have necessary rights
				TwitchUtils.getChatters(channel.id, channel.login).then(res => {
					(res || []).forEach((login) => {
						//Don't notify when joining our own room.
						//There's a "connect" notification for that
						if(channel.login != login || channel.id != meObj.id) {
							this.onJoin(channel.login, login, login == meObj.login, true);
						}
					});
				});
				BTTVUtils.instance.addChannel(channel.id);
				FFZUtils.instance.addChannel(channel.id);
				SevenTVUtils.instance.addChannel(channel.id);


				if(this._client) {
					Logger.instance.log("irc", {info:"Join channel "+ channel.login});
					this._client.join(channel.login);
				}
			});

			//Not yet connected to IRC, create client and connect to specified
			//channels with specified credentials
			const options:tmi.Options = {
				options: { debug: false, skipUpdatingEmotesets:true, },
				connection: { reconnect: true, maxReconnectInterval:2000 },
				channels:this._channelList.concat(),
			};
			options.identity = {
				username: StoreProxy.auth.twitch.user.login,
				password: "oauth:"+StoreProxy.auth.twitch.access_token,
			};

			if(!this._client) {
				Logger.instance.log("irc", {info:"Create IRC client"});
				this._client = new tmi.Client(options);
				this._client.connect();

				this.initialize();
			}
		}, 1000);
	}

	/**
	 * Gets if IRC is connected to the given channel ID
	 */
	public getIsConnectedToChannelID(id:string):boolean {
		return this._connectedChans[id] === true;
	}

	/**
	 * Disconnect from a specific channel
	 * @param channel
	 */
	public async disconnectFromChannel(channel:string):Promise<void> {
		Logger.instance.log("irc", {info:"Disconnect from channel "+channel});
		const index = this._channelList.findIndex(v=>v===channel);
		if(index > -1) {
			this._channelList.splice(index, 1);
			this._client.part("#"+channel);
		}

		// const params = this._client.getOptions();
		// const index = this._channelList.findIndex(v=>v===channel);
		// if(index > -1) {
		// 	this._channelList.splice(index, 1);
		// 	params.channels = this._channelList;
		// 	await this.reconnect();
		// }
	}

	/**
	 * Refresh IRC token
	 * Disconnects from all chans and connects back to it
	 * @param token
	 */
	public async refreshToken(token:string):Promise<void> {
		if(!this._client) return;
		Logger.instance.log("irc", {info:"Refreshing token"});
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
	public async sendMessage(channelId:string, text:string, replyTo?:TwitchatDataTypes.MessageChatData, noConfirmCommercial:boolean = false, sendAsBot:boolean = true):Promise<boolean> {
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
					StoreProxy.common.alert("Invalid announcement color");
					return false;
				}
				cmd = "/announce";
				chunks.unshift(color);
			}

			async function getUserFromLogin(login:string, channelId:string):Promise<TwitchatDataTypes.TwitchatUser|null>{
				login = login.replace(/^@/, "");
				return new Promise((resolve)=>{
					StoreProxy.users.getUserFrom("twitch", channelId, undefined, login, undefined, (user)=> {
						if(user.errored) {
							StoreProxy.common.alert("User <strong>\""+login+"\"</strong> does not exists");
						}
						resolve(user);
					}, undefined, undefined, undefined, false)
				})
				// let res:TwitchDataTypes.UserInfo[];
				// try {
				// 	res = await TwitchUtils.getUserInfo(undefined, [login])
				// }catch(error) {
				// 	StoreProxy.common.alert("User @"+login+" not found on Twitch.");
				// 	return null;
				// }
				// return res[0];
			}

			switch(cmd) {
				case "/announce": {
					if(!TwitchUtils.requestScopes([TwitchScopes.SEND_ANNOUNCE])) return false;
					await TwitchUtils.sendAnnouncement(channelId, chunks.splice(1).join(" "), chunks[0] as "blue"|"green"|"orange"|"purple"|"primary", sendAsBot);
					return true;
				}
				case "/warn":{
					if(!TwitchUtils.requestScopes([TwitchScopes.CHAT_WARNING])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.sendWarning(user.id, chunks.splice(1).join(" "), channelId);
					return false;
				}
				case "/ban":{
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.banUser(user, channelId, undefined, chunks.splice(1).join(" "));
					return false;
				}
				case "/unban": {
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.unbanUser(user, channelId);
					return false;
				}
				case "/block":{
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.blockUser(user);
					return false;
				}
				case "/unblock": {
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BLOCKED])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.unblockUser(user);
					return false;
				}
				case "/timeout":{
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.banUser(user, channelId, parseInt(chunks[1]) || 600, chunks.splice(2).join(" "));
					return false;
				}
				case "/untimeout": {
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.unbanUser(user, channelId);
					return false;
				}
				case "/vip": {
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_VIPS])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.addRemoveVIP(false, channelId, user);
					return false;
				}
				case "/unvip": {
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_VIPS])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.addRemoveVIP(true, channelId, user);
					return false;
				}
				case "/mod": {
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_MODS])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.addRemoveModerator(false, channelId, user);
					return false;
				}
				case "/unmod": {
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_MODS])) return false;
					const user = await getUserFromLogin(chunks[0], channelId);
					if(user) return await TwitchUtils.addRemoveModerator(true, channelId, user);
					return false;
				}
				case "/commercial": {
					if(!StoreProxy.auth.twitch.user.is_affiliate && !StoreProxy.auth.twitch.user.is_partner) return false;
					if(!TwitchUtils.requestScopes([TwitchScopes.START_COMMERCIAL])) return false;
					const duration = parseInt(chunks[0]);
					StoreProxy.stream.startCommercial(channelId, duration, noConfirmCommercial);
					return true;
				}
				case "/shield":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SHIELD_MODE])) return false;
					return await TwitchUtils.setShieldMode(channelId, true);
				}
				case "/shieldoff":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SHIELD_MODE])) return false;
					return await TwitchUtils.setShieldMode(channelId, false);
				}
				case "/delete":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.DELETE_MESSAGES])) return false;
					return await TwitchUtils.deleteMessages(channelId, chunks[0]);
				}
				case "/clear":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.DELETE_MESSAGES])) return false;
					return await TwitchUtils.deleteMessages(channelId);
				}
				case "/color":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.EDIT_BANNED])) return false;
					return await TwitchUtils.setColor(chunks[0]);
				}
				case "/emoteonly":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;
					return await TwitchUtils.setRoomSettings(channelId, {emotesOnly:true});
				}
				case "/emoteonlyoff":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;
					return await TwitchUtils.setRoomSettings(channelId, {emotesOnly:false});
				}
				case "/followers":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;
					return await TwitchUtils.setRoomSettings(channelId, {followOnly:parseInt(chunks[0])});
				}
				case "/followersoff":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;
					return await TwitchUtils.setRoomSettings(channelId, {followOnly:false});
				}
				case "/slow":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;
					return await TwitchUtils.setRoomSettings(channelId, {slowMode:parseInt(chunks[0])});
				}
				case "/slowoff":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;
					return await TwitchUtils.setRoomSettings(channelId, {slowMode:0});
				}
				case "/subscribers":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;
					return await TwitchUtils.setRoomSettings(channelId, {subOnly:true});
				}
				case "/subscribersoff":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;
					return await TwitchUtils.setRoomSettings(channelId, {subOnly:false});
				}
				case "/raid":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.START_RAID])) return false;
					//First check for channel.moderate v1 scope
					if(!TwitchUtils.hasScopes([TwitchScopes.MODERATION_EVENTS])
					//Alternatively check for all permissions required by channel.moderate v2
					&& !TwitchUtils.hasScopes([TwitchScopes.START_RAID,
											TwitchScopes.BLOCKED_TERMS,
											TwitchScopes.SET_ROOM_SETTINGS,
											TwitchScopes.UNBAN_REQUESTS,
											TwitchScopes.EDIT_BANNED,
											TwitchScopes.DELETE_MESSAGES,
											TwitchScopes.CHAT_WARNING,
											TwitchScopes.READ_MODERATORS,
											TwitchScopes.READ_VIPS])) return false;
					return await TwitchUtils.raidChannel(chunks[0].replace(/^@/, "").toLowerCase());
				}
				case "/unraid":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.START_RAID])) return false;
					return await TwitchUtils.raidCancel();
				}
				case "/clip":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.CLIPS_EDIT])) return false;
					return await TwitchUtils.createClip();
				}
				case "/whisper":
				case "/w": {
					if(!TwitchUtils.requestScopes([TwitchScopes.WHISPER_MANAGE])) return false;
					const login = chunks[0].replace(/^@/, "").toLowerCase();
					return await TwitchUtils.whisper(chunks.splice(1).join(" "), login);
				}
				case "/marker":  {
					if(!TwitchUtils.requestScopes([TwitchScopes.SET_STREAM_INFOS])) return false;
					const comment = chunks[0];
					return await TwitchUtils.createStreamMarker(comment);
				}

				//TODO
				case "/uniquechat": return false;
				case "/uniquechatoff": return false;
				case "/mods": return false;
				case "/vips": return false;
			}

		}
		if(replyTo) {
			//@ts-ignore
			// this._client.reply(this._channelIdToLogin[channelId], text, replyTo.id);
			await TwitchUtils.sendMessage(channelId, text, replyTo.id, sendAsBot);
		}else{
			// this._client.say(this._channelIdToLogin[channelId], text);
			await TwitchUtils.sendMessage(channelId, text, undefined, sendAsBot);
		}
		return true
	}




	/*******************
	* PRIVATE METHODS *
	*******************/
	private async initialize():Promise<void> {
		this._client.on('message', this.onMessage.bind(this));
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
			["streamelements", "nightbot", "wizebot", "kikettebot", "commanderroot", "anotherttvviewer", "streamlabs", "communityshowcase"]
			.forEach(b => hashmap[ b[0].toLowerCase() ] = true);
			Logger.instance.log("irc", {info:"Failed loading bots list, using a static one"});
		}
		StoreProxy.users.setBotsMap("twitch", hashmap);
	}

	/**
	 * Refresh IRC connection
	 * Called after updating the token or the channels list
	 */
	private async reconnect():Promise<void> {
		Logger.instance.log("irc", {info:"Force IRC reconnect"});
		try {
			await this._client.disconnect();
		}catch(error) {
			//Ignore error, that's most probably because client is actually already disconnected
		}
		await this._client.connect();
	}

	/**
	 * Gets a user object from IRC tags
	 * @param tags
	 * @returns
	 */
	private getUserFromTags(tags:tmi.ChatUserstate|tmi.SubUserstate|tmi.SubGiftUpgradeUserstate|tmi.SubGiftUserstate|tmi.AnonSubGiftUserstate|tmi.AnonSubGiftUpgradeUserstate|tmi.PrimeUpgradeUserstate, channelId:string):TwitchatDataTypes.TwitchatUser {
		const login			= tags.login ?? tags.username ?? tags["display-name"];
		const isMod			= tags.badges?.moderator != undefined || tags.mod === true;
		const isVip			= tags.badges?.vip != undefined;
		const isSub			= tags.badges?.subscriber != undefined || tags.subscriber === true;
		const isSubGifter	= tags.badges && tags.badges["sub-gifter"] != undefined;
		const isBroadcaster	= tags.badges?.broadcaster != undefined;
		const isPartner		= tags.badges?.partner != undefined;
		const user			= StoreProxy.users.getUserFrom("twitch", channelId, tags["user-id"], login, tags["display-name"], undefined, false, true, isSub);

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
		const user		= StoreProxy.users.getUserFrom("twitch", channelId, undefined, login);
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
		let prepaidMonths = this.getNumValueFromTag(tags["msg-param-multimonth-duration"], -1);
		let isNewMultimonth = tags["msg-param-multimonth-tenure"]!==true;
		if(!isNewMultimonth || (prepaidMonths != 3 && prepaidMonths != 6)) prepaidMonths = 1;
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
			is_primeUpgrade: false,
			is_targetedSubgift:tags["msg-param-community-gift-id"] == undefined,
			months:prepaidMonths,
			streakMonths:this.getNumValueFromTag(tags["msg-param-streak-months"], -1),
			totalSubDuration:this.getNumValueFromTag(tags["msg-param-cumulative-months"], -1),
			raw_data:{tags, methods, message},
			message_size:0,
		}
		if(methods) res.tier =  methods.prime? "prime" : (parseInt((methods.plan as string) || "1000")/1000) as (1|2|3);
		if(message) {
			const chunks = TwitchUtils.parseMessageToChunks(message, tags["emotes-raw"]);
			res.message = message;
			res.message_chunks = chunks;
			res.message_html = TwitchUtils.messageChunksToHTML(chunks);
			res.message_size = TwitchUtils.computeMessageSize(chunks);
		}
		return res;
	}

	private async onMessage(channel:string, tags:tmi.ChatUserstate, message:string, self:boolean):Promise<void> {
		//Ignore anything that's not a message or a /me
		if(tags["message-type"] != "chat"
		&& tags["message-type"] != "whisper"
		&& tags["message-type"] != "action"
		&& tags["message-type"] != "announcement") {
			if(!Config.instance.IS_PROD) {
				let data:TwitchatDataTypes.MessageNoticeData = {
					channel_id:this.getChannelID(channel),
					date:Date.now(),
					id:Utils.getUUID(),
					message:"Unknown message type: "+ tags["message-type"],
					platform:"twitch",
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					noticeId:TwitchatDataTypes.TwitchatNoticeType.GENERIC,
				}
				this.dispatchEvent(new MessengerClientEvent("NOTICE", data));
			}
			return;
		}

		//Ignore rewards with text, they are also sent to EventSub
		if(tags["custom-reward-id"]) return

		//Receive whispers
		if(tags["message-type"] == "whisper") {
			const channel_id = StoreProxy.auth.twitch.user.id;
			const user = this.getUserFromTags(tags, channel_id);

			const data:TwitchatDataTypes.MessageWhisperData = {
				id:tags.id!,
				type:TwitchatDataTypes.TwitchatMessageType.WHISPER,
				to: StoreProxy.auth.twitch.user,
				platform:"twitch",
				channel_id,
				date:Date.now(),
				user,
				message,
				message_html:"",
				message_chunks:[],
				message_size:0,
			};

			data.message_chunks = TwitchUtils.parseMessageToChunks(message, tags["emotes-raw"], tags.sentLocally == true);
			data.message_html = TwitchUtils.messageChunksToHTML(data.message_chunks);
			data.message_size = TwitchUtils.computeMessageSize(data.message_chunks);
			this.dispatchEvent(new MessengerClientEvent("WHISPER", data));
			return;
		}

		const channel_id = this.getChannelID(channel);
		const user = this.getUserFromTags(tags, channel_id);
		const isSharedChatMessage = tags["source-room-id"] && tags["source-room-id"] != tags["room-id"];

		//Message comming from a shared chat session
		//If Twitchat is already connected to the given channel, ignore the message
		//as it will be received via the dedicated IRC connection
		if(isSharedChatMessage
		&& StoreProxy.stream.connectedTwitchChans.findIndex(v=>v.user.id === tags["source-room-id"]) > -1) {
			return;
		}

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
			message_chunks:[],
			message_size:0,
			is_short:false,
			raw_data:{tags, message},
			twitch_source:"irc",
		};

		if(isSharedChatMessage) {
			const chanId=  tags["source-room-id"];
			//Initialize remote data if not ready
			if(!this._remoteIdToUser[chanId]) {
				//Create promise if not existing
				if(!this._remoteIdToPromise[chanId]) {
					this._remoteIdToPromise[chanId] = new Promise<TwitchatDataTypes.TwitchatUser>((resolve)=>{
						StoreProxy.users.getUserFrom("twitch", chanId, chanId, undefined, undefined, (user)=>{
							resolve(user);
						}, undefined, undefined, undefined, false)
					});
				}

				//Wait for promise to resolve. This will be the case for the first message but
				//also for any other message received while the user's data is being resolved
				//to make sure no message is displayed before the channel info get loaded.
				const user = await this._remoteIdToPromise[chanId];

				this._remoteIdToUser[chanId] = user;
				this._remoteChanToColor[chanId] = this._remoteChanColors[this._remoteChanColorPointer];
				this._remoteChanColorPointer ++;
			}

			//Define remote channel info
			data.channelSource = {
				color:this._remoteChanToColor[chanId],
				pic:this._remoteIdToUser[chanId].avatarPath,
				name:this._remoteIdToUser[chanId].login,
			}
			data.twitchSharedChat = true;
		}

		data.message_chunks = TwitchUtils.parseMessageToChunks(message, tags["emotes-raw"], tags.sentLocally == true);
		data.message_html = TwitchUtils.messageChunksToHTML(data.message_chunks);
		data.message_size = TwitchUtils.computeMessageSize(data.message_chunks);
		data.is_short = Utils.stripHTMLTags(data.message_html).length / data.message.length < .6 || data.message.length < 4;

		// If message is an answer, set original message's ref to the answer
		// Called when using the "answer feature" on twitch chat
		if(tags["reply-parent-msg-id"]) {
			const messages = StoreProxy.chat.messages;
			//Search for original message the user answered to
			for (let i = messages.length-1; i >= Math.max(0, messages.length-1000); i--) {
				let m = messages[i];
				if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
				if(m.id === tags["reply-parent-msg-id"]) {
					if(!m.answers) m.answers = [];
					m.answers.push( data );
					StoreProxy.chat.notifyManyReplies(m);
					data.answersTo = m.answersTo || m;
					data.directlyAnswersTo = m
					Database.instance.updateMessage(m);
					break;
				}
			}
		}

		data.twitch_isSlashMe		= tags["message-type"] === "action";
		data.twitch_isReturning		= tags["returning-chatter"] === true;
		data.twitch_isFirstMessage	= tags['first-msg'] === true && tags["msg-id"] != "user-intro";
		data.twitch_isPresentation	= tags["msg-id"] == "user-intro";
		data.twitch_isHighlighted	= tags["msg-id"] === "highlighted-message";
		data.is_short				= tags["emote-only"] === true;
		if(tags["msg-id"] === "gigantified-emote-message") {
			const emote = data.message_chunks.findLast(v=>v.type == "emote");
			data.twitch_gigantifiedEmote = emote?.value;
			data.twitch_gigantifiedEmote_url = emote?.emoteHD;
		}
		if(tags["msg-id"] === "animated-message") data.twitch_animationId = tags["animation-id"];
		if(tags["msg-param-color"]) data.twitch_announcementColor= tags["msg-param-color"].toLowerCase();

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
					id:Config.instance.highlightMyMessageReward.id,
					title:Config.instance.highlightMyMessageReward.title,
					cost:-1,
					description:"",
					color:Config.instance.highlightMyMessageReward.background_color,
					icon:{
						sd:rewardImg,
					}
				},
				message:data.message,
				message_chunks:data.message_chunks,
				message_html:data.message_html,
				message_size:data.message_size,
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
			Logger.instance.log("irc", {info:"Connected to channel "+channelName+" #"+channel_id});
			StoreProxy.users.flagOnlineUsers([userState.user], channel_id);
			this.dispatchEvent(new MessengerClientEvent("CONNECTED", d));
			this._connectedChans[channel_id] = true;
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
		const me = StoreProxy.auth.twitch.user;

		this.dispatchEvent(new MessengerClientEvent("LEAVE", {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.LEAVE,
			id:Utils.getUUID(),
			channel_id,
			date:Date.now(),
			users:[userState.user],
		}));

		if(this._connectedChans[channel_id] === true && username == me.login) {
			this._connectedChans[channel_id] = false;

			const eventData:TwitchatDataTypes.MessageDisconnectData = {
				channel_id,
				platform:"twitch",
				id:Utils.getUUID(),
				type:TwitchatDataTypes.TwitchatMessageType.DISCONNECT,
				date:Date.now(),
				user:me,
			};
			Logger.instance.log("irc", {info:"Disconnected user \""+username+"\" from channel "+channelName+" #"+channel_id});
			this.dispatchEvent(new MessengerClientEvent("DISCONNECTED", eventData));
		}
	}

	private async onCheer(channel:string, tags:tmi.ChatUserstate, message:string):Promise<void> {
		const channel_id = this.getChannelID(channel);
		const chunks = TwitchUtils.parseMessageToChunks(message, tags["emotes-raw"]);
		setTimeout(() => {
			if(StoreProxy.chat.messages.findIndex(v=>v.id == tags.id) === -1) {
				let data:TwitchatDataTypes.MessageCustomData = {
					channel_id:this.getChannelID(channel),
					date:Date.now(),
					id:Utils.getUUID(),
					message:"Cheer not found on history after 5s !",
					platform:"twitch",
					type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
					style:"error",

				}
				this.dispatchEvent(new MessengerClientEvent("MESSAGE", data));
				console.log("MISSING CHEEEEEEEEER", channel, tags, message);
			}
		}, 5000);
		await TwitchUtils.parseCheermotes(chunks, channel_id);

		this.dispatchEvent(new MessengerClientEvent("CHEER", {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.CHEER,
			id:tags.id ?? Utils.getUUID(),
			channel_id,
			date:parseInt(tags["tmi-sent-ts"] as string ?? Date.now().toString()),
			user:this.getUserFromTags(tags, channel_id),
			bits:this.getNumValueFromTag(tags.bits||"0", -1),
			message,
			message_chunks:chunks,
			message_html:TwitchUtils.messageChunksToHTML(chunks),
			message_size:TwitchUtils.computeMessageSize(chunks),
			raw_data:tags,
			pinned:false,
			pinLevel:0,
			pinDuration_ms:0,
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
		data.is_primeUpgrade = true;
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private subgift(channel: string, username: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.SubGiftUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		data.is_gift = true;
		data.streakMonths = streakMonths;
		data.months = this.getNumValueFromTag(tags["msg-param-gift-months"], 1);
		const recipientLogin = tags["msg-param-recipient-user-name"] ?? recipient;
		const recipientName = tags["msg-param-recipient-display-name"] ?? recipient;
		const recipientId = tags["msg-param-recipient-id"];
		const user = StoreProxy.users.getUserFrom("twitch", data.channel_id, recipientId, recipientLogin, recipientName, undefined, undefined, false, undefined, false);
		data.gift_recipients = [user];
		data.gift_count = 1;
		this.dispatchEvent(new MessengerClientEvent("SUB", data));
	}

	private anonsubgift(channel: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.AnonSubGiftUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		data.is_gift = true;
		data.streakMonths = streakMonths;
		data.months = this.getNumValueFromTag(tags["msg-param-gift-months"], 1);
		const recipientLogin = tags["msg-param-recipient-user-name"] ?? recipient;
		const recipientName = tags["msg-param-recipient-display-name"] ?? recipient;
		const recipientId = tags["msg-param-recipient-id"];
		const user = StoreProxy.users.getUserFrom("twitch", data.channel_id, recipientId, recipientLogin, recipientName, undefined, undefined, false, undefined, false);
		data.gift_recipients = [user];
		data.gift_count = 1;
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
			uid = (await TwitchUtils.getUserInfo(undefined, [username]))[0].id;
		}
		const streamInfo = await TwitchUtils.getChannelInfo([uid]);
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
		const channel_id = StoreProxy.auth.twitch.user.id;

		//Don't show disconnect info if its a reconnect
		if(this._refreshingToken) return;
		//Avoid spamming "disconnected from chat" messages
		if(!this._connectedChans[channel_id]) return;

		this._connectedChans[channel_id] = false;

		console.log('Disconnected for reason: ', reason);
		Logger.instance.log("irc", {info:"Disconnected with reason \""+reason+"\""});

		const eventData:TwitchatDataTypes.MessageDisconnectData = {
			channel_id,
			platform:"twitch",
			id:Utils.getUUID(),
			type:TwitchatDataTypes.TwitchatMessageType.DISCONNECT,
			date:Date.now(),
			user:StoreProxy.auth.twitch.user,
		};
		this.dispatchEvent(new MessengerClientEvent("DISCONNECTED", eventData));
	}

	private onDeleteMessage(channel: string, username: string, deletedMessage: string, tags:tmi.DeleteUserstate):void {
		const msgID = tags["target-msg-id"];
		if(!msgID) return;
		this.dispatchEvent(new MessengerClientEvent("DELETE_MESSAGE", msgID));
	}
	// ban(channel, username, reason) {
	// timeout(channel, username, seconds, reason) {
	private onTimeoutUser(channel: string, username: string, reason: string, duration: number, userstate: tmi.TimeoutUserstate):void {
		this.onBanUser(channel, username, reason, userstate, duration);
	}

	private onBanUser(channel: string, username: string, reason: string, userstate: tmi.BanUserstate, duration?:number):void {
		//Wait 900ms before doing anything.
		//This is a work around an Eventsub limitation.
		//Eventsub does not allow to be notified for banned users of another channel
		//as a moderator. The only way to be notified is via IRC, right here.
		//Eventsub has more details so I kept it as the main source for this info,
		//but I use this IRC event as a fallback.
		//We wait 900ms to give it time to Eventsub to receive the event.
		//If Eventsub sent us the info the user will already be marked as banned, we
		//can then ignore the event. Otherwise, we send the notificaiton.
		//We don't wait 1s or more, otherwise if TO for 1s the user would be unbanned
		//before the setTimeout completes
		window.setTimeout(async ()=> {
			const channel_id = this.getChannelID(channel);
			const user = this.getUserStateFromLogin(username, channel_id).user;
			const isTO = !isNaN(duration as number);
			if(!user.channelInfo[channel_id].is_banned
			//if user is TOed and it's a perma ban
			|| (user.channelInfo[channel_id].banEndDate && !isTO)
			//if user is perma banned and it's a TO
			|| (!user.channelInfo[channel_id].banEndDate && isTO)) {
				//Flag as banned. This also populates the ban reason of the user
				await StoreProxy.users.flagBanned("twitch", channel_id, user.id, isTO? duration as number : undefined);
			}
		},990)
	}

	private async raw_message(raw: { [property: string]: unknown }, parsed: { [property: string]: unknown }):Promise<void> {
		//TMI parses the "badges" and "badge-info" props right AFTER dispatching
		//the "raw_message" event.
		//Let's wait a frame so the props are parsed
		await Utils.promisedTimeout(0);
		const category = (parsed.tags as tmi.ChatUserstate)["msg-param-category"] as string;
		switch(parsed.command) {
			case "USERNOTICE": {
				//Handle announcement messages
				if(((parsed.tags as tmi.ChatUserstate)["msg-id"] as unknown) === "announcement") {
					const params = parsed.params as string[];
					const tags = parsed.tags as tmi.ChatUserstate;
					tags.username = tags.login;
					this.onMessage(params[0], tags, params[1], false);
				}else

				//Handle viewer milestone (AKA consecutive watched streams)
				if(category === "watch-streak" || category === "watch-fk") {
					const tags = parsed.tags as tmi.ChatUserstate;
					const channelId = tags["room-id"] as string;
					const user = this.getUserFromTags(tags, channelId);

					const params = parsed.params as string[];
					const message = params[1] || "";
					const message_chunks = TwitchUtils.parseMessageToChunks(message, tags["emotes-raw"], tags.sentLocally == true);
					const message_html = TwitchUtils.messageChunksToHTML(message_chunks);
					const message_size = TwitchUtils.computeMessageSize(message_chunks);

					//Add watch streak specific message
					const eventData:TwitchatDataTypes.MessageWatchStreakData = {
						channel_id: channelId,
						id:Utils.getUUID(),
						type:TwitchatDataTypes.TwitchatMessageType.USER_WATCH_STREAK,
						date:Date.now(),
						platform:"twitch",
						streak:tags["msg-param-value"] as number,
						channelPointsEarned:tags["msg-param-copoReward"] as number,
						user,
						message_chunks,
						message_html,
						message_size,
					};
					this.dispatchEvent(new MessengerClientEvent("WATCH_STREAK", eventData));

					//Add as standard message
					const messageData:TwitchatDataTypes.MessageChatData = {
						channel_id: channelId,
						id:Utils.getUUID(),
						type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
						date:Date.now(),
						platform:"twitch",
						user,
						message,
						message_chunks,
						message_html,
						message_size,
						answers:[],
						twitch_watchStreak:tags["msg-param-value"] as number,
						is_short:Utils.stripHTMLTags(message_html || "").length / (message?.length||1) < .6 || message?.length < 4,
					};
					this.dispatchEvent(new MessengerClientEvent("MESSAGE", messageData));
				}

				//Handle subgift summaries
				//Grabs the number of subgifts made on the channel and store it to the user
				if((parsed.tags as tmi.ChatUserstate)["msg-param-sender-count"]) {
					// console.log("RECEIVED SUBGIFT INFO", data);
					const tags = parsed.tags as tmi.ChatUserstate;
					const channelId = tags["room-id"] as string;
					const user = this.getUserFromTags(tags, channelId);
					const total = this.getNumValueFromTag(tags["msg-param-sender-count"], -1);
					// console.log("User", user);
					// console.log("Channel", channelId);
					// console.log("Total", total);
					user.channelInfo[channelId].totalSubgifts = total;
				}
				break;
			}


			case "USERSTATE": {
				// const [channelName] = (parsed as {params:string[]}).params;
				// const channelId = this.getChannelID(channelName);
				// TwitchUtils.loadEmoteSets(channelId, ((parsed as tmi.UserNoticeState).tags["emote-sets"] ?? "").split(","));
				break;
			}

			//Using this instead of the "notice" event from TMI.js as it's not
			//fired for many notices whereas here we get them all
			case "NOTICE": {
				let [msgid, url, cmd, channel, message] = (parsed.raw as string).replace(/@msg-id=(.*) :(.*) (.*) (#.*) :(.*)/gi, "$1::$2::$3::$4::$5").split("::");
				console.log("NOTICE::", msgid, message);
				const msgIdToNoticeId:{[msgId:string]:TwitchatDataTypes.TwitchatNoticeStringType} = {
					"subs_on": TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_ON,
					"subs_off": TwitchatDataTypes.TwitchatNoticeType.SUB_ONLY_OFF,
					"followers_on": TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_ON,
					"followers_off": TwitchatDataTypes.TwitchatNoticeType.FOLLOW_ONLY_OFF,
					"emote_only_on": TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_ON,
					"emote_only_off": TwitchatDataTypes.TwitchatNoticeType.EMOTE_ONLY_OFF,
					"slow_on": TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_ON,
					"slow_off": TwitchatDataTypes.TwitchatNoticeType.SLOW_MODE_OFF,
				}
				let noticeId:TwitchatDataTypes.TwitchatNoticeStringType = msgIdToNoticeId[msgid] || TwitchatDataTypes.TwitchatNoticeType.GENERIC;
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
					Logger.instance.log("irc", {info:message, data:parsed});
					if(channel) {
						this.notice(noticeId, channel, message);
					}else{
						if((parsed.raw as string || "").toLowerCase() == "login authentication failed") {
							const chanName = channel || StoreProxy.auth.twitch.user.login;
							this.notice("error", chanName, StoreProxy.i18n.t("error.irc_auth_failure", {CHANNEL:chanName}));
							this.dispatchEvent(new MessengerClientEvent("REFRESH_TOKEN"));
						}
						Sentry.captureMessage("Received a notice with missing channel ID: "+ parsed.raw, "warning");
					}
				}
				break;
			}
			default: break;
		}
	}

	private notice(id:TwitchatDataTypes.TwitchatNoticeStringType, channel:string, message:string):void {
		const eventData:TwitchatDataTypes.MessageNoticeData = {
			id:Utils.getUUID(),
			type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
			date:Date.now(),
			platform:"twitch",
			message:message,
			noticeId:id,
			channel_id: this.getChannelID(channel),
		};
		this.dispatchEvent(new MessengerClientEvent("NOTICE", eventData));
	}

	/**
	 * Get a number value for an IRC tag
	 * @param val
	 * @param defaultValue
	 * @returns
	 */
	private getNumValueFromTag(val:string|number, defaultValue:number):number {
		if(typeof val == "string") return parseInt(val);
		if(typeof val == "number") return val;
		return defaultValue;
	}

}
