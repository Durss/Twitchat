import type { JsonObject } from "type-fest";
import { EventDispatcher } from "../events/EventDispatcher";
import type { TwitchatActionType, TwitchatEventType } from "../events/TwitchatEvent";
import TwitchatEvent from "../events/TwitchatEvent";
import OBSWebsocket from "./OBSWebsocket";
import Utils from "./Utils";
// import StreamdeckSocket, { StreamdeckSocketEvent } from "./StreamdeckSocket";

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
	public async initialize(isMainApp:boolean):Promise<void> {

		if(typeof BroadcastChannel != "undefined") {
			this._bc = new BroadcastChannel("twitchat");

			//If receiving data from another browser tab, broadcast it
			this._bc.onmessage = (e: MessageEvent<IEnvelope>):void => {
				this.onMessage(e.data);
			}
		}

		// Listen for postMessage events for iframe communication
		window.addEventListener("message", (e: MessageEvent) => {
			if (e.data && e.data.origin === "twitchat") {
				this.onMessage(e.data);
			}
		});

		//Broadcast twitchat ready state
		if(isMainApp) this.broadcast(TwitchatEvent.TWITCHAT_READY, undefined, false);

		await this.listenOBS(isMainApp);
	}

	/**
	 * Broadcast a message
	 *
	 * @param type
	 * @param data
	 */
	public async broadcast<T extends JsonObject>(type:TwitchatEventType|TwitchatActionType, data?:T, broadcastToSelf:boolean = false, onlyLocal:boolean = false):Promise<void> {
		// console.log("[PUBLIC API] Broadcasting", type, data);
		const eventId = Utils.getUUID();
		if(!broadcastToSelf) this._idsDone[eventId] = true;//Avoid receiving self-broadcast events

		let dataClone:JsonObject | undefined = undefined;
		if(data) dataClone = JSON.parse(JSON.stringify(data));

		//Broadcast to other browser's tabs
		try {
			if(this._bc) {
				this._bc.postMessage({type, id:eventId, data:dataClone});
			}
		}catch(error) {
			console.error(error);
		}

		// Broadcast via postMessage for iframe communication
		try {
			// If we're in an iframe, send to parent
			if (window.parent && window.parent !== window) {
				window.parent.postMessage({origin: "twitchat", type, id:eventId, data:dataClone}, "*");
			}
			// If we're the parent, send to all iframes
			const iframes = document.querySelectorAll("iframe");
			iframes.forEach(iframe => {
				if (iframe.contentWindow) {
					iframe.contentWindow.postMessage({origin: "twitchat", type, id:eventId, data:dataClone}, "*");
				}
			});
		} catch(error) {
			console.error("PostMessage error:", error);
		}

		if(!OBSWebsocket.instance.connected || onlyLocal) {
			//OBS not connected and asked to broadcast to self, just
			//broadcast to self right away
			if(broadcastToSelf) this.dispatchEvent(new TwitchatEvent(type, dataClone));
		}else{
			//Broadcast to any OBS Websocket connected client
			OBSWebsocket.instance.broadcast(type, eventId, dataClone);
		}

		// StreamdeckSocket.instance.broadcast(type, eventId, dataClone);
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private listenOBS(isMainApp:boolean):Promise<void> {
		return new Promise((resolve,reject):void => {
			//OBS api not ready yet, wait for it
			if(!OBSWebsocket.instance.connected) {
				const connectHandler = () => {
					OBSWebsocket.instance.removeEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, connectHandler);
					if(isMainApp) this.broadcast(TwitchatEvent.TWITCHAT_READY, undefined, false);
					resolve();
				};
				OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, connectHandler);
			}else{
				resolve();
			}

			OBSWebsocket.instance.addEventListener("CustomEvent", (event:TwitchatEvent<IEnvelope>) => {
				if(event.data) {
					this.onMessage(event.data, true);
				}
			});

			// StreamdeckSocket.instance.addEventListener(StreamdeckSocketEvent.MESSAGE, (event:StreamdeckSocketEvent) => {
			// 	if(event.data) {
			// 		console.log("[PUBLIC API] DATA FROM SD:", event.data)
			// 		// this.onMessage(event.data, true);
			// 	}
			// });
		});
	}

	/**
	 * Called when receiving a message either from OBS os BroadcastChannel
	 * @param event
	 * @param checkOrigin
	 * @returns
	 */
	private onMessage(event:IEnvelope, checkOrigin:boolean = false):void {
		// console.log("[PUBLIC API] On message", event);
		if(checkOrigin && event.origin != "twitchat") return;
		if(event.type == undefined) return;

		if(event.id){
			if(this._idsDone[event.id] === true) return;
			this._idsDone[event.id] = true;
		}
		this.dispatchEvent(new TwitchatEvent(event.type, event.data));
	}
}

interface IEnvelope<T extends JsonObject | undefined = undefined> {
	origin:"twitchat";
	id:string;
	type:TwitchatActionType;
	data?:T
}
