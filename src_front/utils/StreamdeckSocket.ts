import { Event, EventDispatcher } from "@/events/EventDispatcher";
import type { TwitchatActionType, TwitchatEventType } from "@/events/TwitchatEvent";

/**
* Created : 26/02/2025
*/
export default class StreamdeckSocket extends EventDispatcher {

	private static _instance:StreamdeckSocket;
	private _socket!:WebSocket;
	private _connected:boolean = false;

	constructor() {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():StreamdeckSocket {
		if(!StreamdeckSocket._instance) {
			StreamdeckSocket._instance = new StreamdeckSocket();
			StreamdeckSocket._instance.initialize();
		}
		return StreamdeckSocket._instance;
	}



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Broadcast a message
	 *
	 * @param message
	 */
	public broadcast(type:TwitchatEventType|TwitchatActionType, eventId:string, data?:unknown):void {
		if(!this._connected) return;
		console.log('Broadcasting message ', type);
		this._socket.send(JSON.stringify({ type, data, id:eventId }));
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		console.log('Connect to streamdeck socket');
		if(this._socket) {
			this._socket.close();
			this._socket.onopen = null;
			this._socket.onclose = null;
			this._socket.onerror = null;
			this._socket.onmessage = null;
		}

		this._socket = new WebSocket('ws://localhost:30385');

		this._socket.onopen = () => {
			console.log('Socket connection established');
		};

		this._socket.onmessage = (event) => {
			this._connected = true;
			console.log('Message from server ', event.data);
			this.dispatchEvent(new StreamdeckSocketEvent(StreamdeckSocketEvent.MESSAGE, { data: event.data }));
		};

		this._socket.onclose = () => {
			console.log('Socket connection closed');
			this._connected = false;
			setTimeout(() => {
				this.initialize();
			}, 5000); // Reconnect after 5 seconds
		};

		this._socket.onerror = (error) => {
			console.error('Socket encountered error: ', error);
		};
	}
}

export class StreamdeckSocketEvent extends Event {
	public static readonly MESSAGE = 'message';

	constructor(type:string, public data?:unknown) {
		super(type);
	}

}
