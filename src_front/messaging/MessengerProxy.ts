import StoreProxy from "@/store/StoreProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import MessengerClientEvent from "./MessengerClientEvent";
import TwitchMessengerClient from "./TwitchMessengerClient";
/**
* Created : 26/09/2022 
*/
export default class MessengerProxy {

	private static _instance:MessengerProxy;

	private joinSpool:{channelId:string, user:TwitchatDataTypes.TwitchatUser}[] = [];
	private leaveSpool:{channelId:string, user:TwitchatDataTypes.TwitchatUser}[] = [];
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
	public sendMessage(message:string, targetPlatforms?:TwitchatDataTypes.ChatPlatform[], channelId?:string):boolean {
		const hasPlatform = targetPlatforms && targetPlatforms.length>0;
		if(!channelId) channelId = StoreProxy.auth.twitch.user.login;
		if(!hasPlatform || targetPlatforms.indexOf("twitch")) {
			if(!TwitchMessengerClient.instance.sendMessage(channelId, message)) {
				return false;
			}
		}
		return true;
	}

	public async connect():Promise<void> {
		const twitchChannels = Config.instance.debugChans.filter(v=>v.platform == "twitch");
		if(twitchChannels.length > 0) {
			twitchChannels.unshift({platform:"twitch", login:StoreProxy.auth.twitch.user.login})
			for (let i = 0; i < twitchChannels.length; i++) {
				//It's safe to spam this method as it has inner debounce
				TwitchMessengerClient.instance.connectToChannel(twitchChannels[i].login);
			}
			TwitchMessengerClient.instance.loadMeta();
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
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.REWARD, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.NOTICE, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.JOIN, (e:MessengerClientEvent)=> this.onJoinLeave(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.LEAVE, (e:MessengerClientEvent)=> this.onJoinLeave(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.REFRESH_TOKEN, (e:MessengerClientEvent)=> this.onRefreshToken(e));
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
			this.joinSpool.push({user:d.users[0], channelId:d.channel_id});
			clearTimeout(this.joinSpoolTimeout);
			this.joinSpoolTimeout = setTimeout(()=> {
				const d = e.data! as TwitchatDataTypes.MessageJoinData;
				StoreProxy.users.flagOnlineUsers(d.users, d.channel_id);
				
				//Split join events by channels
				const channels:{[key:string]:TwitchatDataTypes.TwitchatUser[]} = {}
				for (let i = 0; i < this.joinSpool.length; i++) {
					const entry = this.joinSpool[i];
					if(!channels[entry.channelId]) channels[entry.channelId] = [];
					channels[entry.channelId].push(entry.user);
				}
				
				//Send one message per channel
				for (const channel in channels) {
					this.onMessage(new MessengerClientEvent("JOIN", {
						platform:d.platform,
						type:"join",
						id:Utils.getUUID(),
						channel_id:channel,
						date:Date.now(),
						users:channels[channel],
					}));
				}
				
				this.joinSpool = [];
			}, 1000);
		}
		
		if(e.type === MessengerClientEvent.LEAVE) {
			this.leaveSpool.push({user:d.users[0], channelId:d.channel_id});
			
			clearTimeout(this.leaveSpoolTimeout);
			this.leaveSpoolTimeout = setTimeout(()=> {
				const d = e.data! as TwitchatDataTypes.MessageJoinData;
				StoreProxy.users.flagOfflineUsers(d.users, d.channel_id);
				
				//Split join events by channels
				const channels:{[key:string]:TwitchatDataTypes.TwitchatUser[]} = {}
				for (let i = 0; i < this.leaveSpool.length; i++) {
					const entry = this.leaveSpool[i];
					if(!channels[entry.channelId]) channels[entry.channelId] = [];
					channels[entry.channelId].push(entry.user);
				}
				
				//Send one message per channel
				for (const channel in channels) {
					this.onMessage(new MessengerClientEvent("LEAVE", {
						platform:d.platform,
						type:"leave",
						id:Utils.getUUID(),
						channel_id:channel,
						date:Date.now(),
						users:channels[channel],
					}));
				}
				
				this.leaveSpool = [];
			}, 1000);
		}
	}

	/**
	 * Called when requesting to refresh auth token
	 */
	private onRefreshToken(e:MessengerClientEvent):void {
		StoreProxy.auth.refreshAuthToken(true);
	}
}