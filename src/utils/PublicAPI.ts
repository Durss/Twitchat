import { JsonArray, JsonObject, JsonValue } from "type-fest";
import { EventDispatcher } from "./EventDispatcher";
import OBSWebsocket from "./OBSWebsocket";
import TwitchatEvent, { TwitchatActionType, TwitchatEventType } from "./TwitchatEvent";

/**
* Created : 14/04/2022 
*/
export default class PublicAPI extends EventDispatcher {

	private static _instance:PublicAPI;

	private _bc!:BroadcastChannel;
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():PublicAPI {
		if(!PublicAPI._instance) {
			PublicAPI._instance = new PublicAPI();
			PublicAPI._instance.initialize();
		}
		return PublicAPI._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Broadcast a message
	 * 
	 * @param type 
	 * @param data 
	 */
	public async broadcast(type:TwitchatEventType, data:JsonObject):Promise<void> {
		//Broadcast to other browser's tabs
		try {
			this._bc.postMessage({type, data:JSON.parse(JSON.stringify(data))});
		}catch(error) {
			console.error(error);
		}

		//Broadcast to any OBS Websocket connected client
		OBSWebsocket.instance.broadcast(type, data);
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private initialize():void {
		this._bc = new BroadcastChannel("twitchat");

		//If receiving data from another browser tab, broadcast it
		this._bc.onmessage = (ev: MessageEvent<any>):any => {
			this.dispatchEvent(new TwitchatEvent(ev.data.type, ev.data.data));
		}
		
		//@ts-ignore
		OBSWebsocket.instance.obsSocket.on("CustomEvent",
		(e:{origin:"twitchat", type:TwitchatActionType, data:JsonObject | JsonArray | JsonValue}) => {
			if(e.type == undefined) return;
			if(e.origin != "twitchat") return;
			this.dispatchEvent(new TwitchatEvent(e.type, e.data));
		})
	}
}