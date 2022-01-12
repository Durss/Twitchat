import store from "@/store";
import { EventDispatcher } from "@/utils/EventDispatcher";
import * as tmi from "tmi.js";
import { reactive } from 'vue';
import IRCEvent from "./IRCEvent";
import TwitchUtils from "./TwitchUtils";
import Utils from "./Utils";

/**
* Created : 19/01/2021 
*/
export default class IRCClient extends EventDispatcher {

	
	private static _instance:IRCClient;
	private client!:tmi.Client;
	private login!:string;
	private debugMode:boolean = false;//Enable to subscribe to other twitch channels to get chat messages
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
				channels.push(customLogin);
			}
			if(this.debugMode) {
				channels = channels.concat(["angledroit", "antoinedaniel", "BagheraJones", "mistermv", "samueletienne", "Tonton", "avamind" ]);
				uids = uids.concat(["177146919", "135468063", "100744948", "28575692", "505902512", "72480716", "241808969" ]);
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

			// this.client.on('raw_message', (messageCloned, message) => {
			// 	console.log("################## ON RAW ##################");
			// 	console.log(messageCloned);
			// 	// if (message.command != "PRIVMSG") {
			// 		console.log(message.command);
			// 		console.log(message);
			// });
	
			this.client.on('message', (channel:string, tags:tmi.ChatUserstate, message:string, self:boolean) => {
				if(tags["message-type"] == "chat") {
					const login = tags.username as string;	
					
					//Ignore bot messages if requested
					if(store.state.params.hideBots && this.botsLogins.indexOf(login.toLowerCase()) > -1) {
						return;
					}
					//Ignore self if requested
					if(store.state.params.ignoreSelf && tags["user-id"] == store.state.user.user_id) {
						return;
					}
					//Ignore commands
					if(store.state.params.ignoreCommands && /^ *!.*/gi.test(message)) {
						return;
					}

					const data = {message, tags, channel, self, firstMessage:false};
					if(this.uidsDone[tags['user-id'] as string] !== true) {
						data.firstMessage = true;
						this.uidsDone[tags['user-id'] as string] = true;
					}
			

					this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, data));
				}
			});
	
			this.client.connect();
		})
	}

	public disconnect():void {
		this.client.disconnect();
		this.connected = false;
	}

	public deleteMessage(id:string):void {
		this.client.deletemessage(this.channel, id);
	}

	public sendMessage(message:string):Promise<[string]> {
		return this.client.say(this.login, message);
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}