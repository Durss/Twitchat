import { EventDispatcher } from "@/events/EventDispatcher";
import HeatEvent from "@/events/HeatEvent";
import StoreProxy from "@/store/StoreProxy";
import { reactive } from "vue";

/**
* Created : 21/06/2023 
*/
export default class HeatSocket extends EventDispatcher {

	private static _instance:HeatSocket;

	private ws:WebSocket | null = null;
	private socketIndex:number = 0;
	private reconnectTimeout:number = -1;

	public connected:boolean = false;
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():HeatSocket {
		if(!HeatSocket._instance) {
			HeatSocket._instance = reactive(new HeatSocket()) as HeatSocket;
			HeatSocket._instance.initialize();
		}
		return HeatSocket._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Connect to Heat server
	 * @param channelId 
	 */
	public connect(channelId:string):void {
		this.disconnect();

		this.socketIndex ++;
		let localSocketIndex = this.socketIndex;

        let url = `wss://heat-api.j38.net/channel/${channelId}`;
        console.log(`Connecting to ${url}.`);
        this.ws = new WebSocket(url);

        // Initial connection.
        this.ws.addEventListener('open', () => {
			if(localSocketIndex != this.socketIndex) {console.log("IGNORE OPEN"); return;}
			
			this.connected = true;
            console.log(`Connection open to Heat API server, channel ${channelId}.`);
        });

        // Message received.
        this.ws.addEventListener('message', (message) => {
			if(localSocketIndex != this.socketIndex) {console.log("IGNORE MESSAGE"); return;}
			
            let data = JSON.parse(message.data);
			if(data.type==="click") {
				this.fireEvent(data.id, data.x as number, data.y as number,
					data.modifiers?.ctrl === true,
					data.modifiers?.alt === true,
					data.modifiers?.shift === true);
			}

			if (data.type == "system") {
				console.log("System message: " + data.message);
			}
		});

		// Error handling.
		this.ws.addEventListener('error', (event) => {
			console.log("Error:");
			console.log(event);

			if(localSocketIndex != this.socketIndex) {console.log("IGNORE ERROR"); return;}
			
			this.connected = false;
		});

		// Handle close and reconnect.
		this.ws.addEventListener('close', (event) => {
			console.log("Connection closed:");
			console.log(event);

			if(localSocketIndex != this.socketIndex) {console.log("IGNORE CLOSE"); return;}

			this.connected = false;
			this.ws = null
			this.reconnectTimeout = setTimeout(() => { this.connect(channelId); }, 1000)
		});
	}

	/**
	 * Fire a click event
	 */
	public fireEvent(uid:string, px:number, py:number, alt:boolean, ctrl:boolean, shift:boolean, testMode:boolean = false) {
		let event = new HeatEvent(HeatEvent.CLICK,
									{ x: px, y:py },
									uid,
									ctrl,
									alt,
									shift,
									testMode
									);
		this.dispatchEvent(event);
	}

	/**
	 * Cu socket connection
	 */
	public disconnect():void {
		if(!this.ws) return;

		this.connected = false;
		this.socketIndex ++;
		this.ws.close();
		this.ws = null;
		clearTimeout(this.reconnectTimeout);
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/

	private initialize():void {
		//Create a global method that can be called from a popup
		//@ts-ignore
		window.simulateHeatClick = (x:number,y:number, altKey:boolean, ctrlKey:boolean, shiftKey:boolean):void => {
			const uid = StoreProxy.auth.twitch.user.id;
			this.fireEvent(uid, x,y, altKey, ctrlKey, shiftKey, true);
		};
	}
}