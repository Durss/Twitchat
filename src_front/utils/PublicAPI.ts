import type { JsonObject } from "type-fest";
import { EventDispatcher } from "../events/EventDispatcher";
import TwitchatEvent, { type TwitchatEventMap } from "../events/TwitchatEvent";
import OBSWebsocket, { type OBSSourceItem } from "./OBSWebsocket";
import StreamdeckSocket, { StreamdeckSocketEvent } from "./StreamdeckSocket";
import Utils from "./Utils";

/**
* Created : 14/04/2022
*/
export default class PublicAPI extends EventDispatcher {

	private static _instance:PublicAPI;

	private _bc!:BroadcastChannel;
	private _idsDone = new Set<string>();

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

		this.listenStreamdeck();
		this.listenOBS(isMainApp);

		//Broadcast twitchat ready state
		if(isMainApp) this.broadcast("TWITCHAT_READY", undefined, false);
	}

	/**
	 * Broadcast a message
	 *
	 * @param type
	 * @param data
	 */
	public async broadcast<Event extends keyof TwitchatEventMap>(
		type: Event,
		...args: TwitchatEventMap[Event] extends undefined
			? [broadcastToSelf?: boolean, onlyLocal?: boolean]
			: [data: TwitchatEventMap[Event], broadcastToSelf?: boolean, onlyLocal?: boolean]
	): Promise<void> {

		const [data, broadcastToSelf = false, onlyLocal = false] =
			(args.length && typeof args[0] === "object")
				? [args[0] as TwitchatEventMap[Event], args[1] ?? false, args[2] ?? false]
				: [undefined, args[0] as boolean, args[1] as boolean];

		// --- rest of your original implementation ---
		const eventId = Utils.getUUID();
		if(!broadcastToSelf) {
			this._idsDone.add(eventId);//Avoid receiving self-broadcast events
			this.limitCacheSize();
		}

		let dataClone: JsonObject | undefined = undefined;
		if(data) dataClone = JSON.parse(JSON.stringify(data));

		try {
			if(this._bc) {
				this._bc.postMessage({ type, id: eventId, data: dataClone });
			}
		} catch(error) {
			console.error(error);
		}

		if(!OBSWebsocket.instance.connected.value || onlyLocal) {
			// @ts-ignore
			if(broadcastToSelf) this.dispatchEvent(new TwitchatEvent(type, dataClone));
		} else {
			// @ts-ignore
			OBSWebsocket.instance.broadcast(type, eventId, dataClone);
		}
		
		StreamdeckSocket.instance.broadcast(type, eventId, data);
	}

	public override addEventListener<Event extends keyof TwitchatEventMap>(typeStr:Event, listenerFunc:(e:TwitchatEvent<Event>)=>void):void {
		// @ts-ignore
		super.addEventListener(typeStr, listenerFunc);
	}

	public override removeEventListener<Event extends keyof TwitchatEventMap>(typeStr:Event, listenerFunc:(e:TwitchatEvent<Event>)=>void):void {
		// @ts-ignore
		super.removeEventListener(typeStr, listenerFunc);
	}




	/*******************
	* PRIVATE METHODS *
	*******************/
	private listenOBS(isMainApp:boolean):Promise<void> {
		return new Promise((resolve,reject):void => {
			//OBS api not ready yet, wait for it
			if(!OBSWebsocket.instance.connected.value) {
				const connectHandler = () => {
					OBSWebsocket.instance.removeEventListener("OBS_WEBSOCKET_CONNECTED", connectHandler);
					if(isMainApp) this.broadcast("TWITCHAT_READY", undefined, false);
					resolve();
				};
				OBSWebsocket.instance.addEventListener("OBS_WEBSOCKET_CONNECTED", connectHandler);
			}else{
				resolve();
			}
			
			OBSWebsocket.instance.addEventListener("OBS_WEBSOCKET_CONNECTED", (e) => this.broadcast("OBS_WEBSOCKET_CONNECTED", undefined, false));
			OBSWebsocket.instance.addEventListener("OBS_WEBSOCKET_DISCONNECTED", (e) => this.broadcast("OBS_WEBSOCKET_DISCONNECTED", undefined, false));
			OBSWebsocket.instance.socket.on("CustomEvent", (eventData:JsonObject) => {
				const eventDataTyped = eventData as unknown as IEnvelope;
				if(eventDataTyped.data) {
					this.onMessage(eventDataTyped, true);
				}
			});
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
			if(this._idsDone.has(event.id)) return;
			this._idsDone.add(event.id);
			this.limitCacheSize();
		}
		this.dispatchEvent(new TwitchatEvent(event.type, event.data));
	}

	private limitCacheSize():void {
		if (this._idsDone.size > 1000) {
			const first = this._idsDone.values().next().value;
			if(first) this._idsDone.delete(first);
		}
	}
	
	private listenStreamdeck():void {
		StreamdeckSocket.instance.addEventListener(StreamdeckSocketEvent.MESSAGE, (e:StreamdeckSocketEvent<keyof TwitchatEventMap>) => {
			if(e.data) {
				const event:IEnvelope = {
					id: Utils.getUUID(),
					origin: "twitchat",
					type: e.data.action,
					data: e.data.data
				}
				this.onMessage(event, true);
			}
		});
	}
}

export class PublicAPIEvent<Event extends keyof TwitchatEventMap> {
	public readonly type: Event;
	public readonly data: TwitchatEventMap[Event];

	constructor(type:Event, data:TwitchatEventMap[Event]) {
		this.type = type;
		this.data = data;
	}
}

interface IEnvelope<EventName extends keyof TwitchatEventMap = keyof TwitchatEventMap> {
	origin:"twitchat";
	id:string;
	type:EventName;
	data?:EventName extends keyof TwitchatEventMap ? TwitchatEventMap[EventName] : unknown;
}