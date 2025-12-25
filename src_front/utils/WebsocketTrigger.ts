import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { ref } from "vue";
import TriggerActionHandler from "./triggers/TriggerActionHandler";
import Utils from "./Utils";

/**
* Created : 15/03/2023 
*/
export default class WebsocketTrigger {
	
	public connected = ref(false);

	private reconnectTimeout!:number;
	private socket!:WebSocket;
	private autoReconnect:boolean = false;
	private static _instance:WebsocketTrigger;
	
	constructor() {
		window.addEventListener("beforeunload", ()=>{
			if(this.connected.value) this.disconnect();
		});
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():WebsocketTrigger {
		if(!WebsocketTrigger._instance) {
			WebsocketTrigger._instance = new WebsocketTrigger();
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
		if(this.connected.value) {
			this.socket.close();
		}
		this.connected.value = false;
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
				this.connected.value = true;
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
	
				this.connected.value = false;
				clearTimeout(this.reconnectTimeout)
				this.reconnectTimeout = window.setTimeout(()=>{
					this.connect(ip, port, securedConnection);
				}, 5000);
			};
			
			this.socket.onerror = (error) => {
				console.log(error);
				reject("[-][Websocket trigger] Socket error");
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