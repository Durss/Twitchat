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
		//Broadcast to any OBS Websocket connected client
		OBSWebsocket.instance.broadcast(type, data);

		//Broadcast to other tabs
		this._bc.postMessage({type, data});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private initialize():void {
		this._bc = new BroadcastChannel("twitchat");
		
		//@ts-ignore
		OBSWebsocket.instance.obsSocket.on("CustomEvent",
		(e:{origin:"twitchat", type:TwitchatActionType, data:JsonObject | JsonArray | JsonValue}) => {
			if(e.type == undefined) return;
			if(e.origin != "twitchat") return;
			this.dispatchEvent(new TwitchatEvent(e.type, e.data));
		})
	}
}