import StoreProxy from "@/store/StoreProxy";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import type { Event } from "@/utils/EventDispatcher";
import ChatClientEvent from "./ChatClientEvent";
import TwitchChatClient from "./TwitchChatClient"
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
		if(!targets || targets.indexOf("twitch")) TwitchChatClient.instance.sendMessage(message);
	}

	public connect():void {
		const twitchChannels = Config.instance.debugChans.filter(v=>v.source == "twitch");
		for (let i = 0; i < twitchChannels.length; i++) {
			//It's safe to spam this method as it has inner debounce
			TwitchChatClient.instance.connectToChannel(twitchChannels[i].login);
		}
	}

	public disconnect():void {
		TwitchChatClient.instance.disconnect();
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		TwitchChatClient.instance.addEventListener(ChatClientEvent.MESSAGE, (e:ChatClientEvent)=> this.onMessage(e));
	}

	private onMessage(e:ChatClientEvent):void {
		const data = e.data as TwitchatDataTypes.MessageChatData;
		StoreProxy.chat.addMessage(data);
	}
}