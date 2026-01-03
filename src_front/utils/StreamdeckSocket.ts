import { Event, EventDispatcher } from "@/events/EventDispatcher";
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import DataStore from "@/store/DataStore";
import { ref } from "vue";
import Utils from "./Utils";
import PublicAPI from "./PublicAPI";

/**
* Created : 26/02/2025
*/
export default class StreamdeckSocket extends EventDispatcher {

	private static _instance:StreamdeckSocket;
	public connected = ref(false);
	private _socket!:WebSocket;
	private _tryAgainTo:number = -1
	private _isMainApp:boolean = false;

	constructor() {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():StreamdeckSocket {
		if(!StreamdeckSocket._instance) {
			StreamdeckSocket._instance = new StreamdeckSocket();
		}
		return StreamdeckSocket._instance;
	}

	public get ip():string {
		const params:StoreData = JSON.parse(DataStore.get(DataStore.STREAMDECK_PARAMS) || '{}');
		return params?.ip || "127.0.0.1";
	}



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Initialize the socket connection
	 */
	public connect(ip?:string, isMainApp:boolean = false):Promise<boolean> {
		let isManualConnect = !!ip;
		this.connected.value = false;
		if(isMainApp === true) this._isMainApp = true;
		if(!ip && this.ip) {
			ip = this.ip;
		}
		window.clearTimeout(this._tryAgainTo);

		if(this._socket && this._socket.readyState === WebSocket.OPEN) {
			this._socket.close();
			this._socket.onopen = null;
			this._socket.onclose = null;
			this._socket.onerror = null;
			this._socket.onmessage = null;
		}
		return new Promise((resolve, reject) => {
			let protocol = (ip == "127.0.0.1" || ip == "localhost") ? "ws://" : "wss://";
			if(ip?.indexOf("ws") === 0) protocol = "";
			let port = protocol == "ws://" ? 30385 : 30386;
			const address = ip ? `${protocol}${ip}:${port}` : `ws://127.0.0.1:${port}`;
			if(isManualConnect) {
				if(ip != "127.0.0.1") {
					const data:StoreData = {
						ip: ip || "",
					}
					DataStore.set(DataStore.STREAMDECK_PARAMS, data);
				}else{
					DataStore.remove(DataStore.STREAMDECK_PARAMS);
				}
			}
			this._socket = new WebSocket(address);

			this._socket.onopen = () => {
				this.connected.value = true;
				isManualConnect = false;
				if(this._isMainApp) this.broadcast("ON_FLAG_MAIN_APP", Utils.getUUID());
				PublicAPI.instance.broadcast("ON_VOICE_CONTROL_STATE_CHANGE", {enabled:false});
				resolve(true);
			};

			this._socket.onmessage = (event) => {
				// console.log('Message from server ', event.data);
				const args:{action:keyof TwitchatEventMap, data?:TwitchatEventMap[keyof TwitchatEventMap]} = JSON.parse(event.data);
				this.dispatchEvent(new StreamdeckSocketEvent(StreamdeckSocketEvent.MESSAGE, args));
			};

			this._socket.onclose = () => {
				this.connected.value = false;
				if(!isManualConnect) {
					window.clearTimeout(this._tryAgainTo);
					this._tryAgainTo = window.setTimeout(() => {
						this.connect(ip, this._isMainApp);
					}, 5000); // Reconnect after 5 seconds
				}
				reject()
			};
			
			this._socket.onerror = (error) => {
				console.error('Socket encountered error: ', error);
				reject()
			};
		});
	}
	
	/**
	 * Broadcast a message
	 *
	 * @param message
	 */
	// public broadcast(type:TwitchatEventType|TwitchatActionType, eventId:string, data?:unknown):void {
	public broadcast<Event extends keyof TwitchatEventMap>(type: Event, eventId:string, data?: TwitchatEventMap[Event]):void {
		if(!this.connected.value) return;
		// console.log('Broadcast message ', type);
		this._socket.send(JSON.stringify({ type, data:data ? JSON.parse(JSON.stringify(data)) : undefined, id:eventId }));
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
}

export class StreamdeckSocketEvent<Event extends keyof TwitchatEventMap = keyof TwitchatEventMap> extends Event {
	public static readonly MESSAGE = 'message';

	constructor(type:string, public data?:{action:Event, data?:TwitchatEventMap[Event]}) {
		super(type);
	}

}

type StoreData = {
	ip: string;
};