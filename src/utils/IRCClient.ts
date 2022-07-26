import Store from "@/store/Store";
import { EventDispatcher } from "@/utils/EventDispatcher";
import * as tmi from "tmi.js";
import { reactive } from 'vue';
import BTTVUtils from "./BTTVUtils";
import Config from "./Config";
import FFZUtils from "./FFZUtils";
import IRCEvent from "./IRCEvent";
import type { IRCEventDataList } from "./IRCEventDataTypes";
import PublicAPI from "./PublicAPI";
import type { PubSubDataTypes } from "./PubSubDataTypes";
import SevenTVUtils from "./SevenTVUtils";
import StoreProxy from "./StoreProxy";
import TwitchatEvent from "./TwitchatEvent";
import TwitchUtils from "./TwitchUtils";
import UserSession from "./UserSession";
import Utils from "./Utils";

/**
* Created : 19/01/2021 
*/
export default class IRCClient extends EventDispatcher {
	
	private static _instance:IRCClient;
	public client!:tmi.Client;
	public channel!:string;
	public connected = false;
	public botsLogins:string[] = [];
	public onlineUsers:string[] = [];
	public debugMode:boolean = true && !Config.instance.IS_PROD;//Enable to subscribe to other twitch channels to get chat messages
	
	private fakeEvents:boolean = false && !Config.instance.IS_PROD;//Enable to send fake events and test different displays
	private login!:string;
	private uidsGreeted:{[key:string]:boolean} = {};
	private idToExample:{[key:string]:unknown} = {};
	private userToColor:{[key:string]:string} = {};
	private selfTags!:tmi.ChatUserstate;
	private joinSpool:string[] = [];
	private partSpool:string[] = [];
	private greetHistory:{d:number,uid:string}[] = [];
	private blockedUsers:{[key:string]:boolean} = {};
	private joinSpoolTimeout = -1;
	private partSpoolTimeout = -1;
	private refreshingToken = false;
	private increment = 0;
	
	constructor() {
		super();
		reactive(this);
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():IRCClient {
		if(!IRCClient._instance) {
			IRCClient._instance = new IRCClient();
		}
		return IRCClient._instance;
	}

	public get authenticatedUserLogin():string {
		return this.login;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public connect(login:string, token?:string):Promise<void> {
		if(this.client) return Promise.resolve();

		return new Promise((resolve, reject) => {
			this.login = login;
			let channels = [ login ];
			this.channel = "#"+login;
			if(this.debugMode) {
				channels = channels.concat(["fakhear"]);
			}

			(async ()=> {
				//Get user IDs from logins to then load their badges
				const users = await TwitchUtils.loadUserInfo(undefined, channels);
				const uids = users.map(user => user.id);
				
				//Get list of all blocked users and build a hashmap out of it
				try {
					const blockedUsers = await TwitchUtils.getBlockedUsers();
					this.blockedUsers = {};
					for (let i = 0; i < blockedUsers.length; i++) {
						const u = blockedUsers[i];
						this.blockedUsers[u.user_id] = true;
					}
				}catch(error) {/*ignore*/}

				//Load global badges infos
				await TwitchUtils.loadGlobalBadges();
				for (let i = 0; i < uids.length; i++) {
					//Load user specific badges infos
					await TwitchUtils.loadUserBadges(uids[i]);
					await TwitchUtils.loadCheermoteList(uids[i]);
					BTTVUtils.instance.addChannel(uids[i]);
					FFZUtils.instance.addChannel(uids[i]);
					SevenTVUtils.instance.addChannel(uids[i]);

					//Get current user's list
					const chattersRes = await fetch(Config.instance.API_PATH+"/chatters?channel="+channels[i]);
					if(chattersRes.status == 200) {
						const list: {chatters:{[key:string]:string[]}, chatter_count:number} = await chattersRes.json();
						for (const key in list.chatters) {
							const sublist = list.chatters[key];
							for (let i = 0; i < sublist.length; i++) {
								const u = sublist[i];
								if(StoreProxy.store.state.params.features.notifyJoinLeave.value === true) {
									this.joinSpool.push(u);
									this.userJoin(u, channels[i]);
								}

								const index = this.onlineUsers.indexOf(u);
								if(index > -1) break;
								this.onlineUsers.push(u);
							}
						}
						this.onlineUsers.sort();
						StoreProxy.store.dispatch("setViewersList", this.onlineUsers);
					}
				}

				this.dispatchEvent(new IRCEvent(IRCEvent.BADGES_LOADED));

				try {
					//Load bots list
					const res = await fetch('https://api.twitchinsights.net/v1/bots/all');
					const json = await res.json();
					this.botsLogins = (json.bots as string[][]).map(b => b[0].toLowerCase());
				}catch(error) {
					//Fallback in case twitchinsights dies someday
					this.botsLogins = ["streamelements", "nightbot", "wizebot", "commanderroot", "anotherttvviewer", "streamlabs", "communityshowcase"];
				}

				if(this.fakeEvents) {
					this.sendFakeEvent();
				}
			})();
			
			if(token) {
				this.client = new tmi.Client({
					options: { debug: false, skipUpdatingEmotesets:true, },
					connection: { reconnect: true, maxReconnectInverval:10000 },
					channels:channels.concat(),
					identity: {
						username: login,
						password: "oauth:"+token
					},
				});
				
				//Preload previous "greet them" history from the last 8 hours
				const expired_before = Date.now() - (1000 * 60 * 60 * 8);//Expire after 8 hours
				let historyStr = Store.get(Store.GREET_HISTORY);
				let prevGreetHistory:{d:number,uid:string}[] = [];
				this.greetHistory = [];
				if(historyStr) {
					try { prevGreetHistory = JSON.parse(historyStr); }catch(error){ /*ignore*/ }
				}
				for (let i = 0; i < prevGreetHistory.length; i++) {
					const e = prevGreetHistory[i];
					if(e.d >= expired_before) {
						this.uidsGreeted[e.uid] = true;
						this.greetHistory.push(e);
					}
				}
				Store.set(Store.GREET_HISTORY, this.greetHistory);
			}else{
				//Anonymous authentication
				this.client = new tmi.Client({
					channels:channels.concat(),
				});
				this.connected = true;
			}
			
			this.client.on("join", (channel:string, user:string) => {
				user = user.toLowerCase();
				if(user == this.login.toLowerCase()) {
					this.connected = true;
					console.log("IRCClient :: Connection succeed");
					resolve();
					this.dispatchEvent(new IRCEvent(IRCEvent.CONNECTED));
					if(!this.refreshingToken) {
						this.sendNotice("online", "Welcome to the chat room "+channel+"!", channel);
					}
					this.refreshingToken = false;
				}else{
					if(StoreProxy.store.state.params.features.notifyJoinLeave.value === true) {
						//Ignore bots
						if(this.botsLogins.indexOf(user) == -1) {
							this.userJoin(user, channel);
						}
					}
				}

				const index = this.onlineUsers.indexOf(user);
				if(index > -1) return;
				
				this.onlineUsers.push(user);
				this.onlineUsers.sort();
				StoreProxy.store.dispatch("setViewersList", this.onlineUsers);
			});
			
			this.client.on("part", (channel:string, user:string) => {
				user = user.toLowerCase();
				const index = this.onlineUsers.indexOf(user);
				if(index > -1) {
					this.onlineUsers.splice(index, 1);
				}
				if(StoreProxy.store.state.params.features.notifyJoinLeave.value === true) {
					//Ignore bots
					if(this.botsLogins.indexOf(user) == -1) {
						this.partSpool.push(user);
						clearTimeout(this.partSpoolTimeout);
						
						this.partSpoolTimeout = window.setTimeout(() => {
							const leave = this.partSpool.splice(0, 30);
							let message = "<mark>"+leave.join("</mark>, <mark>")+"</mark>";
							if(this.partSpool.length > 0) {
								message += " and <mark>"+this.partSpool.length+"</mark> more";
							}else{
								message = message.replace(/,([^,]*)$/, " and$1");
							}
							message += " left the chat room";
							this.sendNotice("offline", message, channel);
							this.partSpool = [];
						}, 1000);
					}
				}
				StoreProxy.store.dispatch("setViewersList", this.onlineUsers);
			});

			this.client.on('cheer', async (channel:string, tags:tmi.ChatUserstate, message:string) => {
				if(!this.idToExample["cheer"]) this.idToExample["cheer"] = {type:"highlight", channel, tags, message};
				this.sendHighlight({type:"highlight", channel, tags, message});
			});
			
			this.client.on('resub', async (channel: string, username: string, months: number, message: string, tags: tmi.SubUserstate, methods: tmi.SubMethods) => {
				if(!this.idToExample["resub"]) this.idToExample["resub"] = {type:"highlight", channel, tags, message, methods, months, username};
				this.sendHighlight({type:"highlight", channel, tags, message, methods, months, username});
			});
			
			this.client.on('subscription', async (channel: string, username: string, methods: tmi.SubMethods, message: string, tags: tmi.SubUserstate) => {
				if(!this.idToExample["subscription"]) this.idToExample["subscription"] = {type:"highlight", channel, username, methods, tags, message};
				this.sendHighlight({type:"highlight", channel, username, methods, tags, message});
			});
			
			this.client.on('subgift', async (channel: string, username: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.SubGiftUserstate) => {
				if(!this.idToExample["subgift"]) this.idToExample["subgift"] = {type:"highlight", channel, username, methods, months:streakMonths, tags, recipient};
				this.sendHighlight({type:"highlight", channel, username, methods, months:streakMonths, tags, recipient});
			});
			
			this.client.on('anonsubgift', async (channel: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.AnonSubGiftUserstate) => {
				if(!this.idToExample["anonsubgift"]) this.idToExample["anonsubgift"] = {type:"highlight", channel, username:"Un anonyme", methods, months:streakMonths, tags, recipient};
				this.sendHighlight({type:"highlight", channel, username:"Un anonyme", methods, months:streakMonths, tags, recipient});
			});
			
			this.client.on('giftpaidupgrade', async (channel: string, username: string, sender: string, tags: tmi.SubGiftUpgradeUserstate) => {
				if(!this.idToExample["giftpaidupgrade"]) this.idToExample["giftpaidupgrade"] = {type:"highlight", channel, username, sender, tags};
				this.sendHighlight({type:"highlight", channel, username, sender, tags});
			});
			
			this.client.on('anongiftpaidupgrade', async (channel: string, username: string, tags: tmi.AnonSubGiftUpgradeUserstate) => {
				if(!this.idToExample["anongiftpaidupgrade"]) this.idToExample["anongiftpaidupgrade"] = {type:"highlight", channel, username, tags};
				this.sendHighlight({type:"highlight", channel, username, tags});
			});
			
			this.client.on("ban", (channel: string, username: string, reason: string)=> {
				if(!this.idToExample["ban"]) this.idToExample["ban"] = {type:"notice", channel, username, reason};
				this.dispatchEvent(new IRCEvent(IRCEvent.BAN, {type:"notice", channel, username, reason}));
			});
			
			this.client.on("messagedeleted", (channel: string, username: string, deletedMessage: string, tags: tmi.DeleteUserstate)=> {
				this.dispatchEvent(new IRCEvent(IRCEvent.DELETE_MESSAGE, {type:"message", channel, username, deletedMessage, tags}));
			});
			
			this.client.on("automod", (channel: string, msgID: 'msg_rejected' | 'msg_rejected_mandatory', message: string)=> {
				if(!this.idToExample["automod"]) this.idToExample["automod"] = {type:"message", channel, msgID, message};
				this.dispatchEvent(new IRCEvent(IRCEvent.DELETE_MESSAGE, {type:"message", channel, msgID, message}));
			});
			
			this.client.on("raided", async (channel: string, username: string, viewers: number) => {
				// this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, {type:"notice", channel, username, viewers}));
				const tags = this.getFakeTags();
				tags["msg-id"] = "raid";
				if(!this.idToExample["raided"]) this.idToExample["raided"] = {type:"highlight", channel, tags, username, viewers};
				this.sendHighlight({type:"highlight", channel, tags, username, viewers});
				
				//If "highlight raider's messages for 5min" option is enabled
				if(StoreProxy.store.state.params.features.raidHighlightUser.value == true) {
					//Get user ID as the user tracking feature needs it
					const user = (await TwitchUtils.loadUserInfo(undefined, [username]))[0];
					const message:IRCEventDataList.Message = {
						tags:this.getFakeTags(),
						channel,
						message:"raiding with a party of "+viewers,
						self:false,
						firstMessage:false,
						type:"message"
					}
					message.tags.username = username;
					message.tags["display-name"] = user.display_name;
					message.tags["user-id"] = user.id;
					//Track the user
					StoreProxy.store.dispatch("trackUser", message);
					//Untrack the user after 5 minutes
					window.setTimeout(()=> {
						StoreProxy.store.dispatch("untrackUser", message.tags);
					}, 5 * 60 * 1000);
				}
			});
			
			this.client.on("timeout", (channel: string, username: string, reason: string, duration: number)=> {
				if(!this.idToExample["timeout"]) this.idToExample["timeout"] = {type:"notice", channel, username, reason, duration};
				this.dispatchEvent(new IRCEvent(IRCEvent.TIMEOUT, {type:"notice", channel, username, reason, duration}));
			});
			
			this.client.on("hosted", (channel: string, username: string, viewers: number, autohost: boolean)=> {
				let message = username+" is hosting with "+viewers+" viewers";
				if(autohost) message += " (autohost)";
				const tags = this.getFakeTags();
				this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, {type:"notice", msgid:"usage_host", channel, message, tags, username, viewers, autohost}));
			});

			this.client.on("disconnected", ()=> {
				console.log("IRCClient :: Disconnected");
				if(!this.connected) {
					reject();
					return;
				}
				this.connected = false;
				this.dispatchEvent(new IRCEvent(IRCEvent.DISCONNECTED));
				if(!this.refreshingToken) {
					this.sendNotice("offline", "You have been disconnected from the chat :(");
				}
			});

			this.client.on("clearchat", ()=> {
				this.dispatchEvent(new IRCEvent(IRCEvent.CLEARCHAT));
			});


			this.client.on('raw_message', (messageCloned: { [property: string]: unknown }, data: { [property: string]: unknown }) => {
				// console.log("################## ON RAW ##################");
				// console.log(messageCloned);
				// if (data.command != "PRIVMSG") {
				switch(data.command) {
					case "USERNOTICE": {
						if(((data.tags as tmi.ChatUserstate)["msg-id"] as unknown) === "announcement") {
							const params = data.params as string[];
							const tags = data.tags as tmi.ChatUserstate;
							tags.username = tags.login;

							//That darn TMI parses the "badges" and "badge-info" props right after
							//dispatching the "raw_message" event. Which fucks up the message display.
							//Let's wait a frame so the props are parsed and everything works fine! Love it!
							window.setTimeout(() => {
								this.addMessage(params[1], tags, params[0] == this.channel);
							},0)
						}
						break;
					}
					case "ROOMSTATE": {
						if((data.params as string[])[0] == this.channel) {
							this.dispatchEvent(new IRCEvent(IRCEvent.ROOMSTATE, (data as unknown) as IRCEventDataList.RoomState));
						}
						break;
					}
					case "WHISPER": {
						this.dispatchEvent(new IRCEvent(IRCEvent.WHISPER, (data as unknown) as IRCEventDataList.Whisper));
						break;
					}
					case "USERSTATE": {
						// console.log(data);
						StoreProxy.store.dispatch("setUserState", data as tmi.UserNoticeState);
						TwitchUtils.loadEmoteSets((data as tmi.UserNoticeState).tags["emote-sets"].split(","));
						break;
					}

					//Using this instead of the "notice" event from TMI as it's not
					//fired for many notices whereas here we get them all
					case "NOTICE": {
						let [msgid, , , , message] = (data.raw as string).replace(/@msg-id=(.*) :(.*) (.*) (#.*) :(.*)/gi, "$1::$2::$3::$4::$5").split("::");
						
						if(!message) {
							if(msgid.indexOf("bad_delete_message_error") > -1) {
								message = "You cannot delete this message.";
							}
							if(msgid.indexOf("authentication failed") > -1) {
								console.log(data);
								message = "Authentication failed. Refreshing token and trying again...";
								this.dispatchEvent(new IRCEvent(IRCEvent.REFRESH_TOKEN));
							}
						}
						this.sendNotice(msgid as tmi.MsgID, message);
						break;
					}
					default: break;
				}
			});
	
			this.client.on('message', (channel:string, tags:tmi.ChatUserstate, message:string, self:boolean) => {
				//Ignore rewards with text, they are also sent to PubSub with more info
				if(tags["custom-reward-id"]) return;

				if(tags["message-type"] == "chat" || tags["message-type"] == "action") {
					this.addMessage(message, tags, self, undefined, channel);
				}
			});
	
			this.client.connect();
		});
	}

	public async updateToken(token:string):Promise<void> {
		const params = this.client.getOptions();
		if(params.identity) params.identity.password = token;
		this.refreshingToken = true;
		await this.client.disconnect();
		await this.client.connect();
	}

	public disconnect():void {
		if(this.client) {
			this.client.disconnect();
			this.connected = false;
		}
	}

	public async deleteMessage(id:string):Promise<void> {
		try {
			await this.client.deletemessage(this.channel, id);
		}catch(error) {
			if(error === "bad_delete_message_error") {
				StoreProxy.store.state.alert = "Cannot delete broadcaster or moderator's message !";
			}
		}
	}

	public sendMessage(message:string):Promise<unknown> {
		if(!this.connected) return Promise.resolve();

		if(message == "/disconnect") {
			this.client.disconnect();
			return Promise.resolve();
		}

		//If sending an announcement
		if(message.trim().toLowerCase().indexOf("/announce") === 0) {
			const cmd = message.trim().substring(0, message.indexOf(" "));
			const color = cmd.replace("/announce", "").trim() as "blue"|"green"|"orange"|"purple"|"primary";
			return TwitchUtils.sendAnnouncement(message.replace(cmd, ""), color);

		}else{
			
			//Workaround to a weird behavior of TMI.js.
			//If the message starts by a "\" it's properly sent on all
			//connected clients, but never sent back to the sender.
			if(message.indexOf("\\") === 0) {
				const tags = this.selfTags? JSON.parse(JSON.stringify(this.selfTags)) : this.getFakeTags();
				tags.username = this.login;
				tags["display-name"] = this.login;
				tags["user-id"] = UserSession.instance.authToken.user_id;
				tags.id = this.getFakeGuid();
				this.addMessage(message, tags, true, undefined, this.channel);
			}
			
			return this.client.say(this.login, message);
		}
	}

	public async whisper(whisperSource:IRCEventDataList.Whisper, message:string):Promise<void> {
		if(!this.connected) return Promise.resolve();

		const data:IRCEventDataList.Whisper = {
			type:"whisper",
			channel:IRCClient.instance.channel,
			raw: "",
			command: "WHISPER",
			params: [this.login, message],
			tags: {
				"badges-raw": "",
				color: whisperSource.tags.color,
				"display-name": whisperSource.tags["display-name"],
				"emotes-raw": "",
				"message-id": this.increment.toString(),
				"message-type": "whisper",
				"thread-id": whisperSource.tags["thread-id"],
				turbo: false,
				"user-id": whisperSource.tags["user-id"],
				"user-type": "",
				username: whisperSource.tags.username,
				"tmi-sent-ts":Date.now().toString(),
			},
			firstMessage:false,
			markedAsRead:false,
			timestamp:Date.now(),
			isAnswer:true,
		}
		
		await this.client.whisper(whisperSource.tags.username as string, message);
		this.dispatchEvent(new IRCEvent(IRCEvent.WHISPER, data));
	}

	public sendNotice(msgid:tmi.MsgID|string, message:string, channel?:string):void {
		const tags = this.getFakeTags();
		tags["msg-id"] = msgid;
		channel = channel? channel : this.channel
		if(!this.idToExample[msgid]) this.idToExample[msgid] = {type:"notice", channel:this.channel, msgid, message, tags};
		this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, {type:"notice", channel, msgid, message, tags}));
	}


	public sendHighlight(data:IRCEventDataList.Highlight):void {
		data.type = "highlight";
		
		if(!data.tags.id) data.tags.id = this.getFakeGuid();

		const key = data.tags['user-id'] as string;
		if(key && this.uidsGreeted[key] !== true) {
			data.firstMessage = true;
			this.uidsGreeted[key] = true;
			this.greetHistory.push({d:Date.now(), uid:key});
		}
		Store.set(Store.GREET_HISTORY, this.greetHistory.slice(-2000));//Keep only the last 2000 greetings
		
		this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, data));
		this.dispatchEvent(new IRCEvent(IRCEvent.UNFILTERED_MESSAGE, data));
	}

	public addMessage(message:string, tags:tmi.ChatUserstate, self:boolean, automod?:PubSubDataTypes.AutomodData, channel?:string):void {
		const login = tags.username as string;

		if(message == "!logJSON") console.log(this.idToExample);

		if(login == this.login) {
			if(!this.selfTags) this.selfTags = JSON.parse(JSON.stringify(tags));
			//Darn TMI doesn't send back the user ID when message is sent from this client
			if(!tags["user-id"]) tags["user-id"] = UserSession.instance.authToken.user_id;
			tags.id = this.getFakeGuid();
		}

		//Create message structure
		let data:IRCEventDataList.Message = {
												type:"message",
												message,
												tags,
												channel:channel? channel : this.channel,
												self,
												firstMessage:false,
												automod
											};

		//For some (stupid) reason, twitch does not send these
		//data for the broadcaster's messages...
		if(!tags.id) tags.id = this.getFakeGuid();
		if(!tags["tmi-sent-ts"]) tags["tmi-sent-ts"] = Date.now().toString();
		
		//User has no color giver her/him a random one
		if(!tags.color) {
			let color = this.userToColor[login];
			if(!color) {
				color = Utils.pickRand(["#ff0000","#0000ff","#008000","#b22222","#ff7f50","#9acd32","#ff4500","#2e8b57","#daa520","#d2691e","#5f9ea0","#1e90ff","#ff69b4","#8a2be2","#00ff7f"]);
				this.userToColor[login]	= color;
			}
			tags.color = color;
		}

		//Check if it's the first message of a user for today
		let uid = tags['user-id'] as string;
		if(this.uidsGreeted[uid] !== true) {
			if(!automod) data.firstMessage = true;
			this.greetHistory.push({d:Date.now(), uid});
			this.uidsGreeted[uid] = true;
			if(!this.idToExample["firstMessage"]) this.idToExample["firstMessage"] = data;
		}
		
		Store.set(Store.GREET_HISTORY, this.greetHistory.slice(-2000));//Keep only the last 2000 greetings
		
		//This line avoids an edge case issue.
		//If the current TMI client sends messages super fast (some ms between each message),
		//the tags property is not updated for the later messages that will receive
		//the exact same tags instance (not only the same values).
		//This makes multiple messages sharing the same ID which can cause
		//issues with VueJS keyed items (ex: on v-for loops) that would share
		//the same value which is not allowed
		data = JSON.parse(JSON.stringify(data)) as IRCEventDataList.Message;
		
		this.dispatchEvent(new IRCEvent(IRCEvent.UNFILTERED_MESSAGE, data));

		//Broadcast to OBS-ws
		const wsMessage = {
			channel:data.channel,
			message,
			tags:data.tags,
		}
		
		//Ignore /me messages if requested
		if(StoreProxy.store.state.params.filters.showSlashMe.value === false && tags["message-type"] == "action") {
			PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"slashMe"});
			return;
		}
		//Ignore self if requested
		if(StoreProxy.store.state.params.filters.showSelf.value === false && tags["user-id"] == UserSession.instance.authToken.user_id) {
			PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"self"});
			return;
		}
		//Ignore bot messages if requested
		if(StoreProxy.store.state.params.filters.showBots.value === false && this.botsLogins.indexOf(login.toLowerCase()) > -1) {
			PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"bot"});
			return;
		}
		//Ignore custom users
		if((StoreProxy.store.state.params.filters.hideUsers.value as string).toLowerCase().indexOf((tags.username as string).toLowerCase()) > -1) {
			PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"user"});
			return;
		}
		//Ignore commands
		if(StoreProxy.store.state.params.filters.ignoreCommands.value === true && /^ *!.*/gi.test(message)) {
			const blocked = StoreProxy.store.state.params.filters.blockedCommands.value as string;
			if(blocked.length > 0) {
				//Ignore all commands
				let blockedList = blocked.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);//Split commands by non-alphanumeric characters
				blockedList = blockedList.map(v=>v.replace(/^!/gi, ""))
				const cmd = message.split(" ")[0].substring(1).trim().toLowerCase();
				if(blockedList.indexOf(cmd) > -1) {
					PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"command"});
					return;
				}
			}else{
				//Ignore all commands
				PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FILTERED, {message:wsMessage, reason:"command"});
				return;
			}
		}
		
		const loginLower = (tags.username as string).toLowerCase();
		const index = this.onlineUsers.indexOf(loginLower);
		if(index == -1) {
			this.onlineUsers.push(loginLower);
			this.onlineUsers.sort();
			StoreProxy.store.dispatch("setViewersList", this.onlineUsers);
		}

		//If user is part of the block list, flag the message
		if(this.blockedUsers[data.tags["user-id"] as string] === true) {
			data.blockedUser = true;
		}
		
		this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, data));
	}

	/**
	 * Sends a fake event by its code (see fakeEvents.json)
	 * @param code
	 */
	public async sendFakeEvent(code?:string):Promise<void> {
		const fakeEventsRes = await fetch(Config.instance.API_PATH+"/fakeevents");
		const fakeEventsJSON = await fakeEventsRes.json();
		for (const key in fakeEventsJSON) {
			if(code && key != code) continue;

			const json = fakeEventsJSON[key];
			(json as IRCEventDataList.Notice).tags.id = this.getFakeGuid();
			(json as IRCEventDataList.Highlight).tags["tmi-sent-ts"] = Date.now().toString();
			if(json.type == "notice") {
				this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, json));
			}
			if(json.type == "message") {
				this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, json));
			}
			if(json.type == "poll") {
				this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, json));
			}
			if(json.type == "prediction") {
				this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, json));
			}
			
			if(json.type == "highlight") {
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, json));
			}
			this.dispatchEvent(new IRCEvent(IRCEvent.UNFILTERED_MESSAGE, json));

			await Utils.promisedTimeout(50);
		}
	}

	public getFakeGuid():string {
		let suffix = (this.increment++).toString(16);
		while(suffix.length < 12) suffix = "0" + suffix;
		return "00000000-0000-0000-0000-"+suffix;
	}

	public getFakeTags():tmi.ChatUserstate {
		return {
			info:"this tags prop is a fake one to make things easier for my code",
			id:this.getFakeGuid(),
			"tmi-sent-ts": Date.now().toString(),
		};
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private userJoin(user:string, channel:string):void {
		this.joinSpool.push(user);
		clearTimeout(this.joinSpoolTimeout);
		
		this.joinSpoolTimeout = window.setTimeout(() => {
			const spoolBackup = this.joinSpool.concat();
			const join = this.joinSpool.splice(0, 30);
			let message = "<mark>"+join.join("</mark>, <mark>")+"</mark>";
			if(this.joinSpool.length > 0) {
				message += " and <mark>"+this.joinSpool.length+"</mark> more";
			}else{
				message = message.replace(/,([^,]*)$/, " and$1");
			}
			message += " joined the chat room";
			this.sendNotice("online", message, channel);
			const data:IRCEventDataList.JoinList = {
				type:"join",
				users:spoolBackup,
			}
			this.dispatchEvent(new IRCEvent(IRCEvent.JOIN, data));
			this.joinSpool = [];
		}, 1000);
	}
}