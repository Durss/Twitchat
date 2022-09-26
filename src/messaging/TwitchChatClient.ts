import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { EventDispatcher } from "@/utils/EventDispatcher";
import TwitchCypherPlugin from "@/utils/TwitchCypherPlugin";
import TwitchUtils from "@/utils/TwitchUtils";
import UserSession from "@/utils/UserSession";
import Utils from "@/utils/Utils";
import * as tmi from "tmi.js";
import ChatClientEvent from "./ChatClientEvent";

/**
* Created : 25/09/2022 
*/
export default class TwitchClient extends EventDispatcher {

	private static _instance:TwitchClient;
	private _client!:tmi.Client;
	private _credentials:{token:string, username:string}|null = null;
	private _reconnecting:boolean = false;
	private _connectedAnonymously:boolean = false;
	private _connectTimeout:number = -1;
	private _connectedChannels:string[] = [];
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TwitchClient {
		if(!TwitchClient._instance) {
			TwitchClient._instance = new TwitchClient();
			TwitchClient._instance.initialize();
		}
		return TwitchClient._instance;
	}

	/**
	 * Set authentication token
	 */
	public set credentials(value:{token:string, username:string}) {
		this._credentials = value;
		this.connectToChannel(value.username);
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
		//Already connected to that channel ?
		if(this._connectedChannels.findIndex(v=>v === channel) > -1) return;
		
		this._connectedChannels.push(channel);
		clearTimeout(this._connectTimeout);

		//Debounce connection calls if calling it for multiple channels at once
		this._connectTimeout = setTimeout(()=>{
			if(!this._client) {
				//Not yet connected to IRC, create client and connect to specified
				//channels with specified credentials
				if(!this._credentials) {
					//not token given, anonymous authentication
					this._client = new tmi.Client({
						options: { debug: false, skipUpdatingEmotesets:true, },
						connection: { reconnect: true, maxReconnectInverval:2000 },
						channels:this._connectedChannels.concat(),
					});
					this._connectedAnonymously = true;
				}else{
					//Token exists, authenticate
					this._client = new tmi.Client({
						options: { debug: false, skipUpdatingEmotesets:true, },
						connection: { reconnect: true, maxReconnectInverval:2000 },
						channels:this._connectedChannels.concat(),
						identity: {
							username: this.credentials.username,
							password: "oauth:"+this._credentials?.token,
						},
					});
				}
				this.createHandlers();
			}else{
				//Already connected to IRC, add channel to the list
				//and reconnect IRC client
				const params = this._client.getOptions();
				params.channels = this._connectedChannels;
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
		const index = this._connectedChannels.findIndex(v=>v===channel);
		if(index > -1) {
			this._connectedChannels.splice(index, 1);
			params.channels = this._connectedChannels;
			await this.reconnect();
		}
	}

	/**
	 * Refresh IRC token
	 * Disconnects from all chans and connects back to it
	 * @param token 
	 */
	public async refreshToken(token:string):Promise<void> {
		const params = this._client.getOptions();
		if(!params.identity) {
			params.identity = {
				username: this.credentials.username,
				password: "oauth:"+this._credentials?.token,
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

	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}

	/**
	 * Refresh IRC connection
	 * Called after updating the token or the channels list
	 */
	private async reconnect():Promise<void> {
		this._reconnecting = true;
		await this._client.disconnect();
		await this._client.connect();
	}

	/**
	 * Create events handlers
	 */
	private createHandlers():void {
		this._client.on("join", this.onJoin);
		this._client.on("part", this.onLeave);
		this._client.on('cheer', this.onCheer);
		this._client.on('resub', this.resub);
		this._client.on('subscription', this.subscription);
		this._client.on('subgift', this.subgift);
		this._client.on('anonsubgift', this.anonsubgift);
		this._client.on('giftpaidupgrade', this.giftpaidupgrade);
		this._client.on('anongiftpaidupgrade', this.anongiftpaidupgrade);
		this._client.on("ban", this.ban);
		this._client.on("timeout", this.timeout);
		this._client.on("raided", this.raided);
		this._client.on("disconnected", this.disconnected);
		this._client.on("clearchat", this.clearchat);
		this._client.on('raw_message', this.raw_message);
		this._client.on('message', this.message);
	}

	/**
	 * Gets a user object from IRC tags
	 * @param tags 
	 * @returns 
	 */
	private getUserFromTags(tags:tmi.ChatUserstate|tmi.SubUserstate|tmi.SubGiftUpgradeUserstate|tmi.SubGiftUserstate|tmi.AnonSubGiftUserstate|tmi.AnonSubGiftUpgradeUserstate):TwitchatDataTypes.TwitchatUser {
		const login = tags.username ?? tags["display-name"];
		return StoreProxy.users.getUserFrom("twitch", tags.id, login, tags["display-name"])!;
	}

	/**
	 * Gets a user object from its login
	 * 
	 * @param login 
	 * @returns 
	 */
	private getUserFromLogin(login:string):TwitchatDataTypes.TwitchatUser {
		const res:TwitchatDataTypes.TwitchatUser = {
			source:"twitch",
			login: login,
			displayName: login,
		}
		//Search if a user with this name and source exists on store
		const storeUser = StoreProxy.users.getUserFrom("twitch", undefined, login);
		return storeUser ?? res;
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
	private getCommonSubObject(channel:string, tags:tmi.ChatUserstate|tmi.SubUserstate|tmi.SubGiftUpgradeUserstate|tmi.SubGiftUserstate|tmi.AnonSubGiftUserstate|tmi.AnonSubGiftUpgradeUserstate, methods?:tmi.SubMethods, message?:string):TwitchatDataTypes.MessageSubscriptionData {
		let res:TwitchatDataTypes.MessageSubscriptionData = {
			type:"subscription",
			id:Utils.getUUID(),
			channel_id:channel,
			date:parseInt(tags["tmi-sent-ts"] as string ?? Date.now().toString()),
			user:this.getUserFromTags(tags),
			tier: "1",
			is_gift: false,
			is_giftUpgrade: false,
			is_resub: false,
			months:typeof tags["msg-param-multimonth-duration"] == "string"? parseInt(tags["msg-param-multimonth-duration"]) : -1,
			streakMonths:typeof tags["msg-param-streak-months"] == "string"? parseInt(tags["msg-param-streak-months"]) : -1,
			totalSubDuration:typeof tags["msg-param-cumulative-months"] == "string"? parseInt(tags["msg-param-cumulative-months"]) : -1,
		}
		if(methods) res.tier =  methods.prime? "prime" : (parseInt((methods.plan as string) ?? 1000)/1000).toString() as ("1"|"2"|"3");
		if(message) res.message = message;
		return res;
	}

	private onJoin(channel:string, user:string):void {
		this.dispatchEvent(new ChatClientEvent("JOIN", {
			type:"join",
			id:Utils.getUUID(),
			channel_id:channel,
			date:Date.now(),
			users:[this.getUserFromLogin(user)],
		}));
	}

	private onLeave(channel:string, user:string):void {
		this.dispatchEvent(new ChatClientEvent("LEAVE", {
			type:"leave",
			id:Utils.getUUID(),
			channel_id:channel,
			date:Date.now(),
			users:[this.getUserFromLogin(user)],
		}));
	}

	private onCheer(channel:string, tags:tmi.ChatUserstate, message:string):void {
		this.dispatchEvent(new ChatClientEvent("CHEER", {
			type:"cheer",
			id:Utils.getUUID(),
			channel_id:channel,
			date:parseInt(tags["tmi-sent-ts"] as string ?? Date.now().toString()),
			user:this.getUserFromTags(tags),
			bits:parseFloat(tags.bits as string) ?? -1,
			message,
		}));
	}

	private resub(channel: string, username: string, months: number, message: string, tags: tmi.SubUserstate, methods: tmi.SubMethods):void {
		const data = this.getCommonSubObject(channel, tags, methods, message);
		data.is_resub = true;
		data.months = months;
		this.dispatchEvent(new ChatClientEvent("SUB", data));
	}

	private subscription(channel: string, username: string, methods: tmi.SubMethods, message: string, tags: tmi.SubUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods, message);
		this.dispatchEvent(new ChatClientEvent("SUB", data));
	}

	private subgift(channel: string, username: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.SubGiftUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		data.is_gift = true;
		data.gift_recipients = [this.getUserFromLogin(recipient)];
		this.dispatchEvent(new ChatClientEvent("SUB", data));
	}
	
	private anonsubgift(channel: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.AnonSubGiftUserstate):void {
		const data = this.getCommonSubObject(channel, tags, methods);
		data.is_gift = true;
		data.streakMonths = streakMonths
		data.gift_recipients = [this.getUserFromLogin(recipient)];
		this.dispatchEvent(new ChatClientEvent("SUB", data));
	}
	
	private giftpaidupgrade(channel: string, username: string, sender: string, tags: tmi.SubGiftUpgradeUserstate):void {
		const data = this.getCommonSubObject(channel, tags);
		data.is_giftUpgrade = true;
		this.dispatchEvent(new ChatClientEvent("SUB", data));
	}
	
	private anongiftpaidupgrade(channel: string, username: string, tags: tmi.AnonSubGiftUpgradeUserstate):void {
		const data = this.getCommonSubObject(channel, tags);
		data.is_giftUpgrade = true;
		this.dispatchEvent(new ChatClientEvent("SUB", data));
	}

	private ban(channel: string, username: string, reason: string):void {
		this.dispatchEvent(new ChatClientEvent("BAN", {
			type:"ban",
			id:Utils.getUUID(),
			channel_id:channel,
			date:Date.now(),
			user:this.getUserFromLogin(username),
			reason,
		}));
	}

	private timeout(channel: string, username: string, reason: string, duration: number):void {
		this.dispatchEvent(new ChatClientEvent("TIMEOUT", {
			type:"timeout",
			id:Utils.getUUID(),
			channel_id:channel,
			date:Date.now(),
			user:this.getUserFromLogin(username),
			duration_s:duration,
			reason,
		}));
	}

	private raided(channel: string, username: string, viewers: number):void {
		this.dispatchEvent(new ChatClientEvent("RAID", {
			type:"raid",
			id:Utils.getUUID(),
			channel_id:channel,
			date:Date.now(),
			user:this.getUserFromLogin(username),
			viewers
		}));
	}
	
	private disconnected(reason:string):void {
		this.dispatchEvent(new ChatClientEvent("DISCONNECT", {
			type:"disconnect",
			id:Utils.getUUID(),
			channel_id:"",
			date:Date.now(),
			reason
		}));
	}

	private clearchat(channel:string):void {
		this.dispatchEvent(new ChatClientEvent("CLEAR_CHAT", {
			type:"clear_chat",
			id:Utils.getUUID(),
			channel_id:channel,
			date:Date.now(),
		}));
	}

	private async message(channel:string, tags:tmi.ChatUserstate, message:string, self:boolean):Promise<void> {
		const data:TwitchatDataTypes.MessageChatData = {
			id:Utils.getUUID(),
			type:"message",
			channel_id:channel,
			date:Date.now(),

			source:"twitch",
			user: this.getUserFromTags(tags),
			message:message,
			message_html:"",
			todayFirst:false,//Overwritten later, just here to comply with typings
		};

		const emoteChunks = TwitchUtils.parseEmotes(message, tags["emotes-raw"]);
		let message_html = "";
		for (let i = 0; i < emoteChunks.length; i++) {
			const v = emoteChunks[i];
			if(v.type == "text") {
				v.value = v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
				message_html += Utils.parseURLs(v.value);
			}else if(v.type == "emote") {
				let url = v.value.replace(/1.0$/gi, "3.0");//Twitch format
				url = url.replace(/1x$/gi, "3x");//BTTV format
				url = url.replace(/2x$/gi, "3x");//7TV format
				url = url.replace(/1$/gi, "4");//FFZ format
				let tt = "<img src='"+url+"' width='112' height='112' class='emote'><br><center>"+v.label+"</center>";
				message_html += "<img src='"+url+"' data-tooltip=\""+tt+"\" class='emote'>";
			}
		}
		data.message_html = message_html;
				
		// If message is an answer, set original message's ref to the answer
		// Called when using the "answer feature" on twitch chat
		if(tags["reply-parent-msg-id"]) {
			const messages = StoreProxy.chat.messages;
			//Search for original message the user answered to
			for (let i = 0; i < messages.length; i++) {
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
		}else{
			//If there's a mention, search for last messages within
			//a max timeframe to find if the message may be a reply to
			//a message that was sent by the mentionned user
			if(/@\w/gi.test(message)) {
				// console.log("Mention found");
				const ts = Date.now();
				const messages = StoreProxy.chat.messages;
				const timeframe = 5*60*1000;//Check if a massage answers another within this timeframe
				const matches = message.match(/@\w+/gi) as RegExpMatchArray;
				for (let i = 0; i < matches.length; i++) {
					const match = matches[i].replace("@", "").toLowerCase();
					// console.log("Search for message from ", match);
					const candidates = messages.filter(m => {
						if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) return false;
						return m.user.login == match
					}) as TwitchatDataTypes.MessageChatData[];
					//Search for oldest matching candidate
					for (let j = 0; j < candidates.length; j++) {
						const c = candidates[j];
						// console.log("Found candidate", c);
						if(ts - c.date < timeframe) {
							// console.log("Timeframe is OK !");
							if(c.answers) {
								//If it's the root message of a conversation
								c.answers.push( data );
								data.answersTo = c;
							}else if(c.answersTo && c.answersTo.answers) {
								//If the messages answers to a message itself answering to another message
								c.answersTo.answers.push( data );
								data.answersTo = c.answersTo;
							}else{
								//If message answers to a message not from a conversation
								data.answersTo = c;
								if(!c.answers) c.answers = [];
								c.answers.push( data );
							}
							break;
						}
					}
				}
			}
		}
				
		//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
		if(TwitchCypherPlugin.instance.isCyperCandidate(message)) {
			const original = message;
			message = await TwitchCypherPlugin.instance.decrypt(original);
			data.cyphered = message != original;
		}

		//Check if the message contains a mention
		if(message && StoreProxy.params.appearance.highlightMentions.value === true) {
			data.hasMention = UserSession.instance.authToken.login != null && 
							new RegExp("(^| |@)("+UserSession.instance.authToken.login+")($|\\s)", "gim")
							.test(message);
		}
		
	
		data.twitch_isReturning		= tags["returning-chatter"] === true;
		data.twitch_isFirstMessage	= tags['first-msg'] === true && tags["msg-id"] != "user-intro";
		data.twitch_isPresentation	= tags["msg-id"] == "user-intro";
		data.twitch_isHighlighted	= tags["msg-id"] === "highlighted-message";

		this.dispatchEvent(new ChatClientEvent("MESSAGE", data));
	}

	private raw_message(messageCloned: { [property: string]: unknown }, data: { [property: string]: unknown }):void {
		//TODO handle /announcements
		//TODO handle whispers
		//TODO handle message IDs
	}

}