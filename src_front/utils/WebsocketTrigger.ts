import { reactive } from "vue";

/**
* Created : 15/03/2023 
*/
export default class WebsocketTrigger {
	
	public connected:boolean = false;

	private reconnectTimeout!:number;
	private socket!:WebSocket;
	private autoReconnect:boolean = false;
	private static _instance:WebsocketTrigger;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():WebsocketTrigger {
		if(!WebsocketTrigger._instance) {
			WebsocketTrigger._instance = reactive(new WebsocketTrigger()) as WebsocketTrigger;
		}
		return WebsocketTrigger._instance;
	}
	
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Disconnect from OBS Websocket
	 */
	public async disconnect():Promise<void> {
		this.autoReconnect = false;
		if(this.connected) {
			this.socket.close();
		}
		this.connected = false;
	}

	/**
	 * Connect to Eventsub
	 */
	public async connect(url:string, keepTringToConnect:boolean = true):Promise<void> {

		return new Promise((resolve, reject)=> {
			clearTimeout(this.reconnectTimeout);
	
			this.socket = new WebSocket(url);
	
			this.socket.onopen = async () => {
				resolve();
				this.connected = true;
				this.autoReconnect = true;
				keepTringToConnect = false;
			};
			
			this.socket.onmessage = (event:unknown) => { };
			
			this.socket.onclose = (event) => {
				if(!this.autoReconnect && !keepTringToConnect) return;
	
				this.connected = false;
				clearTimeout(this.reconnectTimeout)
				this.reconnectTimeout = setTimeout(()=>{
					this.connect(url);
				}, 5000);
			};
			
			this.socket.onerror = (error) => {
				console.log(error);
				reject();
			};
		})
	}

	public sendMessage(data:any):void {
		this.socket.send(JSON.stringify(data));
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}