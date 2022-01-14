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
	private client!:tmi.Client;
	private login!:string;
	private debugMode:boolean = true && !Config.IS_PROD;//Enable to subscribe to other twitch channels to get chat messages
	private uidsDone:{[key:string]:boolean} = {};
	
	public token!:string;
	public channel!:string;
	public connected:boolean = false;
	public botsLogins:string[] = [];
	
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
	public connect(login:string, token:string):Promise<void> {
		if(this.connected) return Promise.resolve();
		return new Promise((resolve, reject) => {
			this.login = login;
			this.token = token;
			let channels = [ login]
			let uids = [ store.state.user.user_id];
			const customLogin = Utils.getQueryParameterByName("login");
			if(customLogin) {
				const [login, uid] = customLogin.split(":");
				this.login = login;
				channels.push(login);
				uids.push(uid);
			}
			if(this.debugMode) {
				channels = channels.concat(["Alderiate", "NoWay4u_Sir", "tmxk319", "otplol_", "mistermv", "sweet_anita", "angledroit", "antoinedaniel", "BagheraJones", "samueletienne", "Tonton", "avamind" ]);
				uids = uids.concat(["77452537", "85397463", "148057505", "622498423", "28575692", "217377982", "177146919", "135468063", "100744948", "505902512", "72480716", "241808969" ]);
			}
			(async ()=> {
				try {
					//Load bots list
					const res = await fetch('https://api.twitchinsights.net/v1/bots/all');
					const json = await res.json();
					this.botsLogins = (json.bots as string[][]).map(b => b[0].toLowerCase());
				}catch(error) {
					//Fallback in case twitchinsights dies someday
					this.botsLogins = ["streamelements", "nightbot", "wizebot", "commanderroot", "anotherttvviewer", "streamlabs", "communityshowcase"];
				}

				await Utils.promisedTimeout(5000);
				await TwitchUtils.loadGlobalBadges();
				for (let i = 0; i < uids.length; i++) {
					await TwitchUtils.loadUserBadges(uids[i]);
				}
				this.dispatchEvent(new IRCEvent(IRCEvent.BADGES_LOADED));
			})();
			
	
			this.client = new tmi.Client({
				options: { debug: false },
				connection: { reconnect: true },
				channels,
				identity: {
					username: login,
					password: "oauth:"+token
				},
			});
	
			this.client.on("join", (channel:string, user:string)=> {
				this.channel = channel;
				if(user == this.login) {
					this.connected = true;
					console.log("IRCClient :: Connection succeed");
					resolve();
					this.dispatchEvent(new IRCEvent(IRCEvent.CONNECTED));
				}
			});

			this.client.on("ban", (channel: string, username: string, reason: string)=> {
				this.dispatchEvent(new IRCEvent(IRCEvent.BAN, {channel, username, reason}));
			});

			this.client.on("messagedeleted", (channel: string, username: string, deletedMessage: string, userstate: tmi.DeleteUserstate)=> {
				this.dispatchEvent(new IRCEvent(IRCEvent.DELETE_MESSAGE, {channel, username, deletedMessage, userstate}));
			});
			
			this.client.on("automod", (channel: string, msgID: 'msg_rejected' | 'msg_rejected_mandatory', message: string)=> {
				this.dispatchEvent(new IRCEvent(IRCEvent.DELETE_MESSAGE, {channel, msgID, message}));
			});

			this.client.on("clearchat", ()=> {
				this.dispatchEvent(new IRCEvent(IRCEvent.CLEARCHAT));
			});


			this.client.on("timeout", (channel: string, username: string, reason: string, duration: number)=> {
				this.dispatchEvent(new IRCEvent(IRCEvent.TIMEOUT, {channel, username, reason, duration}));
			});

			this.client.on("disconnected", ()=> {
				console.log("IRCClient :: Diconnected");
				if(!this.connected) {
					reject();
				}
				this.connected = false;
				this.dispatchEvent(new IRCEvent(IRCEvent.DISCONNECTED));
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
					case "PRIVMSG": {
						const tags = (data.tags as IRCTagsExtended);
						store.dispatch("setAnswerRef", {original:tags["reply-parent-msg-id"], reply:tags.id});
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
				if(tags["message-type"] == "chat") {
					const login = tags.username as string;
					
					// reply-parent-display-name: "Durss"
					// reply-parent-msg-body: "test"
					// reply-parent-msg-id: "f4f10aa8-3aee-4699-818e-5237af4f940a"
					// reply-parent-user-id: "29961813"
					// reply-parent-user-login: "durss"
					
					//Ignore bot messages if requested
					if(store.state.params.filters.hideBots.value && this.botsLogins.indexOf(login.toLowerCase()) > -1) {
						return;
					}
					//Ignore self if requested
					if(store.state.params.filters.ignoreSelf.value && tags["user-id"] == store.state.user.user_id) {
						return;
					}
					//Ignore commands
					if(store.state.params.filters.ignoreCommands.value && /^ *!.*/gi.test(message)) {
						return;
					}
					
					this.addMessage(message, tags, self)
				}
			});
	
			this.client.connect();
		})
	}

	public disconnect():void {
		this.client.disconnect();
		this.connected = false;
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
		// const params = message.split(" ").splice(1);
		// if(/\/slow .*/.test(message)) {
		// 	return this.client.slow(this.channel, parseInt(params[0]));
		// }else if(/\/mod.*/.test(message)) {
		// 	return this.client.mod(this.channel, params[0]);
		// }else if(/\/clear/.test(message)) {
		// 	return this.client.clear(this.channel);
		// }else if(/\/vip.*/.test(message)) {
		// 	return this.client.vip(this.channel, params[0]);
		// }else if(/\/unvip.*/.test(message)) {
		// 	return this.client.vip(this.channel, params[0]);
		// }else{
			return this.client.say(this.login, message);
		// }
	}

	public sendNotice(msgid:tmi.MsgID, message:string):void {
		const tags = this.getFakeTags();
		this.dispatchEvent(new IRCEvent(IRCEvent.NOTICE, {channel:this.channel, msgid, message, tags, notice:true}));
	}

	public addMessage(message:string, tags:tmi.ChatUserstate, self:boolean, automod?:PubSubTypes.AutomodData):void {
		const data:IRCEventDataList.Message = {message, tags, channel:this.channel, self, firstMessage:false, automod};

		//For some (stupid) reason, twitch does not send these
		//data for the broadcaster's messages...
		if(!tags.id) tags.id = Math.random().toString();
		if(!tags["tmi-sent-ts"]) tags["tmi-sent-ts"] = Date.now().toString();

		if(this.uidsDone[tags['user-id'] as string] !== true) {
			data.firstMessage = true;
			this.uidsDone[tags['user-id'] as string] = true;
		}

		this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, data));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private getFakeTags():tmi.ChatUserstate {
		return {
			info:"this tags prop is a fake one to make things easier for my code",
			id:Date.now().toString() + Math.random().toString(),
			"tmi-sent-ts": Date.now().toString(),
		};
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