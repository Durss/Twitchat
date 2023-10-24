import type { JsonArray, JsonObject, JsonValue } from "type-fest";
import { EventDispatcher } from "../events/EventDispatcher";
import type { TwitchatActionType, TwitchatEventType } from "../events/TwitchatEvent";
import TwitchatEvent from "../events/TwitchatEvent";
import OBSWebsocket from "./OBSWebsocket";
import Utils from "./Utils";

/**
* Created : 14/04/2022 
*/
export default class PublicAPI extends EventDispatcher {

	private static _instance:PublicAPI;

	private _bc!:BroadcastChannel;
	private _idsDone:{[key:string]:boolean} = {};
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():PublicAPI {
		if(!PublicAPI._instance) {
			PublicAPI._instance = new PublicAPI();
			//@ts-ignore
			// window.broadcast = (a, b, c) => PublicAPI._instance.broadcast(a,b,c);
			//@ts-ignore
			// window.gsap = gsap;
			}
		return PublicAPI._instance;
	}

	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Initializes the public API
	 */
	public async initialize():Promise<void> {
		if(typeof BroadcastChannel == "undefined") return;
		
		this._bc = new BroadcastChannel("twitchat");

		//If receiving data from another browser tab, broadcast it
		this._bc.onmessage = (e: MessageEvent<unknown>):void => {
			const event = e.data as {type:TwitchatActionType, data:JsonObject | JsonArray | JsonValue}
			const data = event.data as {id:string};
			if(data.id){
				if(this._idsDone[data.id] === true) return;
				this._idsDone[data.id] = true;
			}
			this.dispatchEvent(new TwitchatEvent(event.type, data));
		}
		
		//Broadcast only to other browser tabs
		this.broadcast(TwitchatEvent.TWITCHAT_READY);
		
		await this.listenOBS();
	}

	/**
	 * Broadcast a message
	 * 
	 * @param type 
	 * @param data 
	 */
	public async broadcast(type:TwitchatEventType|TwitchatActionType, data?:JsonObject, broadcastToSelf:boolean = false, onlyLocal:boolean = false):Promise<void> {
		// console.log("Broadcasting", type, data);
		if(!data) data = {};
		data = JSON.parse(JSON.stringify(data)) as JsonObject;
		data.id = Utils.getUUID();
		if(!broadcastToSelf) this._idsDone[data.id] = true;//Avoid receiving self-broadcast events

		//Broadcast to other browser's tabs
		try {
			if(data) data = JSON.parse(JSON.stringify(data));
			if(this._bc) this._bc.postMessage({type, data});
		}catch(error) {
			console.error(error);
		}

		if(!OBSWebsocket.instance.connected || onlyLocal) {
			//OBS not connected and asked to broadcast to self, just
			//broadcast to self right away
			if(broadcastToSelf) this.dispatchEvent(new TwitchatEvent(type, data));
		}else{
			//Broadcast to any OBS Websocket connected client
			OBSWebsocket.instance.broadcast(type, data);
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private listenOBS():Promise<void> {
		return new Promise((resolve,reject):void => {
			//OBS api not ready yet, wait for it
			if(!OBSWebsocket.instance.connected) {
				OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, () => {
					this.listenOBS();
					resolve();
				});
				return;
			}

			this.broadcast(TwitchatEvent.TWITCHAT_READY);
			
			OBSWebsocket.instance.addEventListener("CustomEvent", (event:TwitchatEvent) => {
				const e = event.data as {origin:"twitchat", type:TwitchatActionType, data:JsonObject | JsonArray | JsonValue};
				if(e.type == undefined) return;
				if(e.origin != "twitchat") return;
				const data = e.data as {id:string};
				if(data.id){
					if(this._idsDone[data.id] === true) return;
					this._idsDone[data.id] = true;
				}
				this.dispatchEvent(new TwitchatEvent(e.type, e.data));
			})
		});
	}
}