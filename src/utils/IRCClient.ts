import store from "@/store";
import { EventDispatcher } from "@/utils/EventDispatcher";
import * as tmi from "tmi.js";
import { reactive } from 'vue';
import Config from "./Config";
import IRCEvent, { IRCEventDataList } from "./IRCEvent";
import { PubSubTypes } from "./PubSub";
import TwitchUtils from "./TwitchUtils";
import Utils from "./Utils";

/**
* Created : 19/01/2021 
*/
export default class IRCClient extends EventDispatcher {

	
	private static _instance:IRCClient;
	private login!:string;
	private debugMode:boolean = false && !Config.IS_PROD;//Enable to subscribe to other twitch channels to get chat messages
	private fakeEvents:boolean = true && !Config.IS_PROD;//Enable to send fake events and test different displays
	private uidsDone:{[key:string]:boolean} = {};
	private idToExample:{[key:string]:unknown} = {};
	
	public client!:tmi.Client;
	public token!:string|undefined;
	public channel!:string;
	public connected:boolean = false;
	public botsLogins:string[] = [];
	public increment:number = 0;
	
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
		if(this.connected) return Promise.resolve();
		
		this.connected = true;
		return new Promise((resolve, reject) => {
			this.login = login;
			this.token = token;
			let channels = [ login ];
			this.channel = "#"+login;
			if(this.debugMode) {
				channels = channels.concat(["encremecanique", "pykamusic", "hortyunderscore", "tipstevens" ]);
			}

			(async ()=> {
				//Get user IDs from logins to then load their badges
				const userInfos = await fetch(Config.API_PATH+"/user?logins="+channels.join(","));
				const uids = ((await userInfos.json()) as [{id:string}]).map(user => user.id);
				
				//Load global badges infos
				await TwitchUtils.loadGlobalBadges();
				for (let i = 0; i < uids.length; i++) {
					//Load user specific badges infos
					await TwitchUtils.loadUserBadges(uids[i]);
					await TwitchUtils.loadCheermoteList(uids[i]);
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
					this.sendFakeEvents();
				}
			})();
			
			if(token) {
				this.client = new tmi.Client({
					options: { debug: false, skipUpdatingEmotesets:true, },
					connection: { reconnect: true },
					channels:channels.concat(),
					identity: {
						username: login,
						password: "oauth:"+token
					},
				});
			}else{
				this.client = new tmi.Client({
					channels:channels.concat(),
				});
				this.connected = true;
			}
			
			this.client.on("join", (channel:string, user:string)=> {
				if(user == this.login) {
					this.connected = true;
					console.log("IRCClient :: Connection succeed");
					resolve();
					this.dispatchEvent(new IRCEvent(IRCEvent.CONNECTED));
				}
			});

			this.client.on('cheer', async (channel:string, tags:tmi.ChatUserstate, message:string) => {
				if(!this.idToExample["cheer"]) this.idToExample["cheer"] = {type:"highlight", channel, tags, message};
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, {type:"highlight", channel, tags, message}));
			});
			
			this.client.on('resub', async (channel: string, username: string, months: number, message: string, tags: tmi.SubUserstate, methods: tmi.SubMethods) => {
				if(!this.idToExample["resub"]) this.idToExample["resub"] = {type:"highlight", channel, tags, message, methods, months, username};
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, {type:"highlight", channel, tags, message, methods, months, username}));
			});
			
			this.client.on('subscription', async (channel: string, username: string, methods: tmi.SubMethods, message: string, tags: tmi.SubUserstate) => {
				if(!this.idToExample["subscription"]) this.idToExample["subscription"] = {type:"highlight", channel, username, methods, tags, message};
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, {type:"highlight", channel, username, methods, tags, message}));
			});
			
			this.client.on('subgift', async (channel: string, username: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.SubGiftUserstate) => {
				if(!this.idToExample["subgift"]) this.idToExample["subgift"] = {type:"highlight", channel, username, methods, months:streakMonths, tags, recipient};
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, {type:"highlight", channel, username, methods, months:streakMonths, tags, recipient}));
			});
			
			this.client.on('anonsubgift', async (channel: string, streakMonths: number, recipient: string, methods: tmi.SubMethods, tags: tmi.AnonSubGiftUserstate) => {
				if(!this.idToExample["anonsubgift"]) this.idToExample["anonsubgift"] = {type:"highlight", channel, username:"Un anonyme", methods, months:streakMonths, tags, recipient};
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, {type:"highlight", channel, username:"Un anonyme", methods, months:streakMonths, tags, recipient}));
			});
			
			this.client.on('giftpaidupgrade', async (channel: string, username: string, sender: string, tags: tmi.SubGiftUpgradeUserstate) => {
				if(!this.idToExample["giftpaidupgrade"]) this.idToExample["giftpaidupgrade"] = {type:"highlight", channel, username, sender, tags};
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, {type:"highlight", channel, username, sender, tags}));
			});
			
			this.client.on('anongiftpaidupgrade', async (channel: string, username: string, tags: tmi.AnonSubGiftUpgradeUserstate) => {
				if(!this.idToExample["anongiftpaidupgrade"]) this.idToExample["anongiftpaidupgrade"] = {type:"highlight", channel, username, tags};
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, {type:"highlight", channel, username, tags}));
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
			
			this.client.on("raided", (channel: string, username: string, viewers: number) => {
				// this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, {type:"notice", channel, username, viewers}));
				const tags = this.getFakeTags();
				if(!this.idToExample["raided"]) this.idToExample["raided"] = {type:"highlight", channel, tags, username, viewers};
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, {type:"highlight", channel, tags, username, viewers}));
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
				console.log("IRCClient :: Diconnected");
				if(!this.connected) {
					reject();
				}
				this.connected = false;
				this.dispatchEvent(new IRCEvent(IRCEvent.DISCONNECTED));
			});

			this.client.on("clearchat", ()=> {
				this.dispatchEvent(new IRCEvent(IRCEvent.CLEARCHAT));
			});

			// this.client.on("notice", (channel: string, msgid: tmi.MsgID, message: string)=> {
			// 	//Fake tags info
			// 	const tags = {
			// 		info:"this tags prop is a fake one to make things easier for my code",
			// 		id:Date.now().toString() + Math.random().toString(),
			// 		"tmi-sent-ts": Date.now().toString(),
			// 	};
			// 	console.log("NOTICE !", channel, msgid, message);
			// 	this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, {channel, msgid, message, tags, notice:true}));
			// });

			this.client.on('raw_message', (messageCloned: { [property: string]: unknown }, data: { [property: string]: unknown }) => {
				// console.log("################## ON RAW ##################");
				// console.log(messageCloned);
				// if (message.command != "PRIVMSG") {
					// console.log(data.command);
					// console.log(data);
				switch(data.command) {
					//Using this instead of the "notice" event from TMI as it's not
					//fired for many notices whereas here we get them all
					case "ROOMSTATE": {
						this.dispatchEvent(new IRCEvent(IRCEvent.ROOMSTATE, (data as unknown) as IRCEventDataList.RoomState));
						break;
					}
					case "USERSTATE": {
						// console.log(data);
						store.dispatch("setUserState", data as tmi.UserNoticeState);
						TwitchUtils.loadEmoteSets((data as tmi.UserNoticeState).tags["emote-sets"].split(","));
						break;
					}
					case "NOTICE": {
						/* eslint-disable-next-line */
						let [msgid, , , , message] = (data.raw as string).replace(/@msg-id=(.*) :(.*) (.*) (#.*) :(.*)/gi, "$1::$2::$3::$4::$5").split("::");
						
						if(!message) {
							if(msgid.indexOf("bad_delete_message_error")) {
								message = "You cannot delete this message.";
							}
						}
						this.sendNotice(msgid as tmi.MsgID, message);
						break;
					}
					default: break;
				}
			});
	
			this.client.on('message', (channel:string, tags:tmi.ChatUserstate, message:string, self:boolean) => {
				if(tags["message-type"] == "chat" || tags["message-type"] == "action") {
					this.addMessage(message, tags, self, undefined, channel);
				}
			});
	
			this.client.connect();
		});
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
				store.state.alert = "Cannot delete broadcaster or moderator's message !";
			}
		}
	}

	public sendMessage(message:string):Promise<unknown> {
		return this.client.say(this.login, message);
	}

	public sendNotice(msgid:tmi.MsgID|string, message:string):void {
		const tags = this.getFakeTags();
		if(!this.idToExample[msgid]) this.idToExample[msgid] = {type:"notice", channel:this.channel, msgid, message, tags};
		this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, {type:"notice", channel:this.channel, msgid, message, tags}));
	}


	public addHighlight(data:IRCEventDataList.Highlight):void {
		data.type = "highlight";

		if(this.uidsDone[data.tags['user-id'] as string] !== true) {
			data.firstMessage = true;
			this.uidsDone[data.tags['user-id'] as string] = true;
		}

		this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, data));
	}

	public addMessage(message:string, tags:tmi.ChatUserstate, self:boolean, automod?:PubSubTypes.AutomodData, channel?:string):void {
		const login = tags.username as string;

		if(message == "!logJSON") {
			console.log(this.idToExample);
		}

		//Add message
		let data:IRCEventDataList.Message = {type:"message",
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

		if(this.uidsDone[tags['user-id'] as string] !== true) {
			if(!automod) data.firstMessage = true;
			this.uidsDone[tags['user-id'] as string] = true;
			if(!this.idToExample["firstMessage"]) this.idToExample["firstMessage"] = data;
		}
		
		//This line avoids an edge case issue.
		//If the current TMI client sends messages super fast (some ms between each message),
		//the tags property is not updated for the later messages that will receive
		//the exact same tags instance (not only the same values).
		//This makes multiple mess	ages sharing the same ID which can cause
		//issues with VueJS keyd items (ex: on v-for loops) that would share
		//the same value which is not authorized
		data = JSON.parse(JSON.stringify(data)) as IRCEventDataList.Message;
		
		this.dispatchEvent(new IRCEvent(IRCEvent.UNFILTERED_MESSAGE, data));
		
		//Ignore /me messages
		if(!store.state.params.filters.showSlashMe.value && tags["message-type"] == "action") {
			return;
		}
		//Ignore self if requested
		if(!store.state.params.filters.showSelf.value && tags["user-id"] == store.state.user.user_id) {
			return;
		}
		//Ignore bot messages if requested
		if(!store.state.params.filters.showBots.value && this.botsLogins.indexOf(login.toLowerCase()) > -1) {
			return;
		}
		//Ignore custom users
		if(store.state.params.filters.hideUsers.value.toLowerCase().indexOf((tags.username as string).toLowerCase()) > -1) {
			return;
		}
		//Ignore commands
		if(store.state.params.filters.ignoreCommands.value && /^ *!.*/gi.test(message)) {
			return;
		}
		
		this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, data));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private getFakeTags():tmi.ChatUserstate {
		return {
			info:"this tags prop is a fake one to make things easier for my code",
			id:this.getFakeGuid(),
			"tmi-sent-ts": Date.now().toString(),
		};
	}

	private getFakeGuid():string {
		let suffix = (this.increment++).toString(16);
		while(suffix.length < 12) suffix = "0" + suffix;
		return "00000000-0000-0000-0000-"+suffix;
	}

	private async sendFakeEvents():Promise<void> {
		const fakeEventsRes = await fetch(Config.API_PATH+"/fakeevents");
		const fakeEventsJSON = await fakeEventsRes.json();
		for (const key in fakeEventsJSON) {
			const json = fakeEventsJSON[key];
			if(json.type == "notice") {
				this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, json));
			}
			if(json.type == "message") {
				this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, json));
			}
			if(json.type == "highlight") {
				this.dispatchEvent(new IRCEvent(IRCEvent.HIGHLIGHT, json));
			}
			await Utils.promisedTimeout(100);
		}
	}
}

//adding props missing from typings
export interface IRCTagsExtended extends tmi.ChatUserstate {
	"first-msg"?:boolean;
	"reply-parent-display-name"?:string;
	"reply-parent-msg-body"?:string;
	"reply-parent-msg-id"?:string;
	"reply-parent-user-id"?:string;
	"reply-parent-user-login"?:string;
}