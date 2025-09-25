import { reactive } from "vue";
import TriggerActionHandler from "./triggers/TriggerActionHandler";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import StoreProxy from "@/store/StoreProxy";
import Utils from "./Utils";

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
		window.addEventListener("beforeunload", ()=>{
			if(this.connected) this.disconnect();
		});
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
	public async connect(ip:string, port:number, securedConnection:boolean = false, keepTringToConnect:boolean = true):Promise<void> {

		return new Promise((resolve, reject)=> {
			clearTimeout(this.reconnectTimeout);
			
			let url = "";
			// If IP contains full url (ws:// or wss://), use it directly
			if(/wss?:\/\//.test(ip)) {
				url = ip
			}else{
				url = securedConnection === true? "wss://" : "ws://";
				url += ip;
				if(port) url += ":"+port;
			}

			this.socket = new WebSocket(url);
	
			this.socket.onopen = async () => {
				resolve();
				this.connected = true;
				this.autoReconnect = true;
				keepTringToConnect = false;
			};
			
			this.socket.onmessage = (event:MessageEvent) => {
				try {
					//If message is a JSON with a "topic" prop, call related triggers
					const json = JSON.parse(event.data);
					if(json && json.topic) {
						const m:TwitchatDataTypes.MessageWebsocketTopicData = {
							date:Date.now(),
							id:Utils.getUUID(),
							type:TwitchatDataTypes.TwitchatMessageType.WEBSOCKET_TOPIC,
							channel_id:StoreProxy.auth.twitch.user.id,
							message:event.data,
							topic:json.topic,
							platform:"twitchat",
						}
						TriggerActionHandler.instance.execute(m);
					}
				}catch(err){}
			};
			
			this.socket.onclose = (event) => {
				if(!this.autoReconnect && !keepTringToConnect) return;
	
				this.connected = false;
				clearTimeout(this.reconnectTimeout)
				this.reconnectTimeout = window.setTimeout(()=>{
					this.connect(ip, port, securedConnection);
				}, 5000);
			};
			
			this.socket.onerror = (error) => {
				console.log(error);
				reject("[Websocket trigger] Connection error");
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