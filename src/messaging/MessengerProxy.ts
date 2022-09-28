import StoreProxy from "@/store/StoreProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import type { Event } from "@/utils/EventDispatcher";
import MessengerClientEvent from "./MessengerClientEvent";
import TwitchMessengerClient from "./TwitchMessengerClient"
/**
* Created : 26/09/2022 
*/
export default class MessengerProxy {

	private static _instance:MessengerProxy;
	
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
	public sendMessage(message:string, targets?:TwitchatDataTypes.ChatSource):void {
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
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.JOIN, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.LEAVE, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.BAN, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.TIMEOUT, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.RAID, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.DISCONNECT, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.CLEAR_CHAT, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.REFRESH_TOKEN, (e:MessengerClientEvent)=> this.onMessage(e));
	}

	private onMessage(e:MessengerClientEvent):void {
		const data = e.data as TwitchatDataTypes.MessageChatData;
		StoreProxy.chat.addMessage(data);
	}
}