import StoreProxy from "@/store/StoreProxy";
import Config from "./Config";

/**
* Created : 29/02/2024 
*/
export default class SSEHelper {

	private static _instance:SSEHelper;
	private _sse!:EventSource;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():SSEHelper {
		if(!SSEHelper._instance) {
			SSEHelper._instance = new SSEHelper();
		}
		return SSEHelper._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
		this.connect();
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Open SSE pipe
	 */
	private connect():void {
		this._sse = new EventSource(Config.instance.API_PATH+"/sse/register?token=Bearer "+StoreProxy.auth.twitch.access_token);
		this._sse.onmessage = (event) => this.onMessage(event);
		// this._sse.onopen = (event) => { }
	}

	/**
	 * Called when receiving a message
	 */
	private onMessage(event:MessageEvent<string>):void {
		try {
			let json = JSON.parse(event.data) as {code:string, data:any};
			if(json.code == "AUTHENTICATION_FAILED") {
				//Avoid autoreconnect
				this._sse.close();
			}
		}catch(error) {
			//ignore
		}
	}

}