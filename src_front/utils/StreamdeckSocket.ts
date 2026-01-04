import { Event, EventDispatcher } from "@/events/EventDispatcher";
import type { TwitchatEventMap } from "@/events/TwitchatEvent";
import DataStore from "@/store/DataStore";
import { ref } from "vue";
import Utils from "./Utils";
import PublicAPI from "./PublicAPI";
import { i } from "mathjs";
import type TwitchatEvent from "@/events/TwitchatEvent";

/**
* Created : 26/02/2025
*/
export default class StreamdeckSocket extends EventDispatcher {

	private static _instance:StreamdeckSocket;
	public connected = ref(false);
	private _socket!:WebSocket;
	private _tryAgainTo:number = -1
	private _isMainApp:boolean = false;
	private _secretKey:string = "";
	private _ip:string = "";

	constructor() {
		super();
		const params:StoreData = JSON.parse(DataStore.get(DataStore.STREAMDECK_PARAMS) || '{}');
		if(params?.secretKey) {
			this._secretKey = params.secretKey;
		}
		if(params?.ip) {
			this._ip = params.ip;
		}
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

	public get ip():string { return this._ip || "127.0.0.1"; }

	public get secretKey():string { return this._secretKey; }



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Initialize the socket connection
	 */
	public connect(secretKey?:string, ip?:string, isMainApp:boolean = false):Promise<boolean> {
		let isManualConnect = !!ip || !!secretKey;
		this.connected.value = false;
		if(isMainApp === true) this._isMainApp = true;
		if(secretKey) this._secretKey = secretKey.substring(0, 100);
		if(ip) this._ip = ip;

		this.disconnect();
		
		if(!this._secretKey) return Promise.reject("MISSING_SECRET_KEY");

		return new Promise((resolve, reject) => {
			let protocol = (this.ip == "127.0.0.1" || this.ip == "localhost") ? "ws://" : "wss://";
			if(this.ip?.indexOf("ws") === 0) protocol = "";
			let port = protocol == "ws://" ? 30385 : 30386;
			const address = this.ip ? `${protocol}${this.ip}:${port}` : `ws://127.0.0.1:${port}`;
			if(isManualConnect) {
				if(ip || secretKey) {
					const data:StoreData = {
						ip: (this.ip && this.ip != "127.0.0.1")? this.ip : "",
						secretKey: this._secretKey || ""
					}
					DataStore.set(DataStore.STREAMDECK_PARAMS, data);
				}else{
					DataStore.remove(DataStore.STREAMDECK_PARAMS);
				}
			}
			this._socket = new WebSocket(address);

			this._socket.onopen = () => {
				isManualConnect = false;
				this.broadcast("SET_STREAMDECK_AUTHENTICATE",
					Utils.getUUID(),
					{ secretKey: this._secretKey, isMainApp: this._isMainApp },
					true
				);
			};

			this._socket.onmessage = (event) => {
				// console.log('Message from server ', event.data);
				
				// Local typing utils
				type TwitchatEvent = {
					[K in keyof TwitchatEventMap]: {
						action: K;
						data: TwitchatEventMap[K];
					};
				}[keyof TwitchatEventMap];
				
				function json2Event(json: string): TwitchatEvent {
					return JSON.parse(json) as TwitchatEvent;
				}

				const args = json2Event(event.data);
				if(args.action == "ON_STREAMDECK_AUTHENTICATION_RESULT") {
					if(args.data?.success === true) {
						this.connected.value = true;
						PublicAPI.instance.broadcast("ON_VOICE_CONTROL_STATE_CHANGE", {enabled:false});
						resolve(true);
					}else{
						reject("AUTH_FAILED");
					}
					return;
				}
				this.dispatchEvent(new StreamdeckSocketEvent(StreamdeckSocketEvent.MESSAGE, args));
			};

			this._socket.onclose = (event) => {
				this.connected.value = false;
				if(!isManualConnect && event.code !== 1002) {
					window.clearTimeout(this._tryAgainTo);
					this._tryAgainTo = window.setTimeout(() => {
						this.connect(secretKey, ip, this._isMainApp);
					}, 5000); // Reconnect after 5 seconds
				}
				if(event.code === 1002) {
					reject("AUTH_FAILED");
				}else{
					reject("CONNECT_FAILED")
				}
			};
			
			this._socket.onerror = (error) => {
				console.error('Socket encountered error: ', error);
				reject()
			};
		});
	}

	public disconnect():void {
		if(this._socket && this._socket.readyState === WebSocket.OPEN) {
			this.connected.value = false;
			this._socket.close();
			this._socket.onopen = null;
			this._socket.onclose = null;
			this._socket.onerror = null;
			this._socket.onmessage = null;
		}
		window.clearTimeout(this._tryAgainTo);
	}
	
	/**
	 * Broadcast a message
	 *
	 * @param message
	 */
	// public broadcast(type:TwitchatEventType|TwitchatActionType, eventId:string, data?:unknown):void {
	public broadcast<Event extends keyof TwitchatEventMap>(type: Event, eventId:string, data?: TwitchatEventMap[Event], byPassConnectCheck: boolean = false):void {
		if(!this.connected.value && !byPassConnectCheck) return;
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
	secretKey: string;
};