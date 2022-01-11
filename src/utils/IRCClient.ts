import store from "@/store";
import { EventDispatcher } from "@/utils/EventDispatcher";
import * as tmi from "tmi.js";
import { reactive } from 'vue';
import IRCEvent from "./IRCEvent";
import TwitchUtils from "./TwitchUtils";

/**
* Created : 19/01/2021 
*/
export default class IRCClient extends EventDispatcher {

	private static _instance:IRCClient;
	private client!:tmi.Client;
	private login!:string;
	private isConnected:boolean = false;
	private debugMode:boolean = true;
	
	public token!:string;
	public channel!:string;
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():IRCClient {
		if(!IRCClient._instance) {
			IRCClient._instance = new IRCClient();
			reactive(IRCClient.instance);
		}
		return IRCClient._instance;
	}

	public get connected():boolean {
		return this.isConnected;
	}

	public get authenticatedUserLogin():string {
		return this.login;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize(login:string, token:string):Promise<void> {
		return new Promise((resolve, reject) => {
			this.login = login;
			this.token = token;
			let channels = [ login]
			let uids = [ store.state.user.user_id];
			if(this.debugMode) {
				channels = channels.concat(["thesushidragon", "lara6683" ]);
				uids = uids.concat([ "96738828", "80352893" ]);
			}
			TwitchUtils.getGlobalBadges();
			for (let i = 0; i < uids.length; i++) {
				TwitchUtils.getBadges(uids[i]);
			}
	
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
					this.isConnected = true;
					console.log("IRCClient :: Connection succeed");
					resolve();
				}
			});

			this.client.on("disconnected", ()=> {
				console.log("IRCClient :: Disconnected");
				if(!this.isConnected) {
					reject();
				}
				this.isConnected = false;
			});
	
			this.client.on('message', (channel:string, tags:tmi.ChatUserstate, message:string, self:boolean) => {
				if(tags["message-type"] == "chat") {
					this.dispatchEvent(new IRCEvent(IRCEvent.MESSAGE, message, tags, channel, self));
				}
			});
	
			this.client.connect();
		})
	}

	public deleteMessage(id:string):void {
		this.client.deletemessage(this.channel, id);
	}

	public sendMessage(message:string):void {
		this.client.say(this.login, message);
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}