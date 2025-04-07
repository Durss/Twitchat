import { Event, EventDispatcher } from "@/events/EventDispatcher";

/**
 * Base implementation of the StreamSocket Twitch extension.
 * @see https://streamsocket.kadokta.com
* Created : 07/04/2025
*/
export default class StreamSocket extends EventDispatcher {

	private static _instance:StreamSocket;
	private _socket!:WebSocket;
	private _connected:boolean = false;
	private _secret:string = "";
	private _channelId:string = "";

	constructor() {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():StreamSocket {
		if(!StreamSocket._instance) {
			StreamSocket._instance = new StreamSocket();
		}
		return StreamSocket._instance;
	}



	/******************
	* PUBLIC METHODS *
	******************/
	public connect(channelId:string):void {
		if(this._connected) return;
		this._channelId = channelId;
		this.initialize();
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		console.log('[STREAMSOCKET] Connecting to socket');
		if(this._socket) {
			this._socket.close();
			this._socket.onopen = null;
			this._socket.onclose = null;
			this._socket.onerror = null;
			this._socket.onmessage = null;
		}

		this._socket = new WebSocket(`wss://streamsocket.kadokta.com/api/v1/streamer/custom/channel/${this._channelId}`);

		this._socket.onopen = () => {
			console.log('[STREAMSOCKET] connection established');
		};

		this._socket.onmessage = (event) => {
			this._connected = true;
			console.log('[STREAMSOCKET] Message from server ', event.data);
			const json = JSON.parse(event.data) as StreamSocketIncomingMessage;
			switch(json.type) {
				case "request_connection_check": {
					this._socket.send(JSON.stringify({
						"type": "response_connection_check",
						"data": {
							"secret": this._secret,
							"active": true
						}
					}));
					// this._socket.send(JSON.stringify({
					// 	"type": "notification_status_change",
					// 	"data": {
					// 		"secret": this._secret,
					// 		"active": true
					// 	}
					// }));
					// this._socket.send(JSON.stringify({
					// 	"type": "notification_event_unlock",
					// 	"data": {
					// 		"secret": this._secret,
					// 		"events": ["dfsf"]
					// 	}
					// }));
					break;
				}

				case "notification_event": {
					console.log('[STREAMSOCKET] Event from server ', json.data.event_display_name || json.data.event_id);
				}
			}
			this.dispatchEvent(new StreamSocketEvent(StreamSocketEvent.MESSAGE, { data: event.data }));
		};

		this._socket.onclose = () => {
			console.log('[STREAMSOCKET] connection closed');
			this._connected = false;
			setTimeout(() => {
				this.initialize();
			}, 5000); // Reconnect after 5 seconds
		};

		this._socket.onerror = (error) => {
			console.error('[STREAMSOCKET] error: ', error);
		};
	}
}

export class StreamSocketEvent extends Event {
	public static readonly MESSAGE = 'message';

	constructor(type:string, public data?:unknown) {
		super(type);
	}

}

export type StreamSocketIncomingMessage = ConnectionCheck|ActionUsed;

interface ConnectionCheck {
	type:"request_connection_check";
}

interface ActionUsed {
	type:"notification_event";
    data: {
        event_id: string;
        event_display_name: string;
        product_sku: string;
        product_bits: number;
        user_id: string;
        user_display_name:string;
    }
}
