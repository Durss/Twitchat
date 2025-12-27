import { Event, EventDispatcher } from "@/events/EventDispatcher";
import type { TwitchatActionType, TwitchatEventType } from "@/events/TwitchatEvent";
import DataStore from "@/store/DataStore";
import { ref } from "vue";

/**
* Created : 26/02/2025
*/
export default class StreamdeckSocket extends EventDispatcher {

	private static _instance:StreamdeckSocket;
	public connected = ref(false);
	private _socket!:WebSocket;
	private _tryAgainTo:number = -1

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
		const params = JSON.parse(DataStore.get(DataStore.STREAMDECK_PARAMS) || '{}');
		return params?.ip || "127.0.0.1";
	}



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Initialize the socket connection
	 */
	public connect(ip?:string):Promise<boolean> {
		const isManualConnect = !!ip;
		this.connected.value = false;
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
					DataStore.set(DataStore.STREAMDECK_PARAMS, {
						ip: ip || "",
					});
				}else{
					DataStore.remove(DataStore.STREAMDECK_PARAMS);
				}
			}
			this._socket = new WebSocket(address);

			this._socket.onopen = () => {
				this.connected.value = true;
				resolve(true);
			};

			this._socket.onmessage = (event) => {
				// console.log('Message from server ', event.data);
				const args:{action:TwitchatActionType, data?:unknown} = JSON.parse(event.data);
				this.dispatchEvent(new StreamdeckSocketEvent(StreamdeckSocketEvent.MESSAGE, args));
			};

			this._socket.onclose = () => {
				this.connected.value = false;
				if(!isManualConnect) {
					window.clearTimeout(this._tryAgainTo);
					this._tryAgainTo = window.setTimeout(() => {
						this.connect();
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
	public broadcast(type:TwitchatEventType|TwitchatActionType, eventId:string, data?:unknown):void {
		if(!this.connected.value) return;
		// console.log('Broadcast message ', type);
		this._socket.send(JSON.stringify({ type, data, id:eventId }));
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
}

export class StreamdeckSocketEvent extends Event {
	public static readonly MESSAGE = 'message';

	constructor(type:string, public data?:{action:TwitchatActionType, data?:unknown}) {
		super(type);
	}

}

type StoreData = {
	ip: string;
};