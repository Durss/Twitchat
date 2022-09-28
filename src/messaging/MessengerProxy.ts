import StoreProxy from "@/store/StoreProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import type { Event } from "@/utils/EventDispatcher";
import Utils from "@/utils/Utils";
import MessengerClientEvent from "./MessengerClientEvent";
import TwitchMessengerClient from "./TwitchMessengerClient"
/**
* Created : 26/09/2022 
*/
export default class MessengerProxy {

	private static _instance:MessengerProxy;

	private joinSpool:TwitchatDataTypes.TwitchatUser[] = [];
	private leaveSpool:TwitchatDataTypes.TwitchatUser[] = [];
	private joinSpoolTimeout:number = -1;
	private leaveSpoolTimeout:number = -1;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():MessengerProxy {
		if(!MessengerProxy._instance) {
			MessengerProxy._instance = new MessengerProxy();
			MessengerProxy._instance.initialize();
		}
		return MessengerProxy._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public sendMessage(message:string, targets?:TwitchatDataTypes.ChatPlatform[]):void {
		if(!targets || targets.indexOf("twitch")) TwitchMessengerClient.instance.sendMessage(message);
	}

	public connect():void {
		const twitchChannels = Config.instance.debugChans.filter(v=>v.source == "twitch");
		for (let i = 0; i < twitchChannels.length; i++) {
			//It's safe to spam this method as it has inner debounce
			TwitchMessengerClient.instance.connectToChannel(twitchChannels[i].login);
		}
	}

	public disconnect():void {
		TwitchMessengerClient.instance.disconnect();
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.MESSAGE, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.WHISPER, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.SUB, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.CHEER, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.BAN, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.TIMEOUT, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.RAID, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.DISCONNECT, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.CLEAR_CHAT, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.REFRESH_TOKEN, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.REWARD, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.JOIN, (e:MessengerClientEvent)=> this.onJoinLeave(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.LEAVE, (e:MessengerClientEvent)=> this.onJoinLeave(e));
	}

	private onMessage(e:MessengerClientEvent):void {
		if(e.data) {
			StoreProxy.chat.addMessage(e.data);
		}
	}

	/**
	 * Called when users join/leave.
	 * This merges multiple sequential join/leave events in one single message
	 * @param e 
	 */
	private onJoinLeave(e:MessengerClientEvent):void {
		const d = e.data as TwitchatDataTypes.MessageJoinData | TwitchatDataTypes.MessageLeaveData;
		if(e.type === MessengerClientEvent.JOIN) {
			this.joinSpool = this.joinSpool.concat(d.users);
			clearTimeout(this.joinSpoolTimeout);
			this.joinSpoolTimeout = setTimeout(()=> {
				const d = e.data! as TwitchatDataTypes.MessageJoinData;
				StoreProxy.users.flagOnlineUSers(d.users);
				
				this.onMessage(new MessengerClientEvent("JOIN", {
					platform:"twitchat",//Actual platform can later be retrieved from the user object, no need for it here
					type:"join",
					id:Utils.getUUID(),
					channel_id:d.channel_id,
					date:Date.now(),
					users:this.joinSpool,
				}));
				
				this.joinSpool = [];
			}, 1000);
		}
		
		if(e.type === MessengerClientEvent.LEAVE) {
			this.leaveSpool = this.leaveSpool.concat(d.users);
			clearTimeout(this.leaveSpoolTimeout);
			this.leaveSpoolTimeout = setTimeout(()=> {
				const d = e.data! as TwitchatDataTypes.MessageJoinData;
				StoreProxy.users.flagOfflineUsers(d.users);
				
				this.onMessage(new MessengerClientEvent("LEAVE", {
					platform:"twitchat",//Actual platform can later be retrieved from the user object, no need for it here
					type:"leave",
					id:Utils.getUUID(),
					channel_id:d.channel_id,
					date:Date.now(),
					users:this.leaveSpool,
				}));
				
				this.leaveSpool = [];
			}, 1000);
		}
	}
}