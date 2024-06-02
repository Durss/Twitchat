import { EventDispatcher } from "@/events/EventDispatcher";
import SSEEvent from "@/events/SSEEvent";
import ApiHelper from "./ApiHelper";
import Config from "./Config";

/**
* Created : 29/02/2024
*/
export default class SSEHelper extends EventDispatcher {

	private static _instance:SSEHelper;
	private _sse!:EventSource;

	constructor() {
		super();
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
		if(this._sse) return;
		this.connect();
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Open SSE pipe
	 */
	private connect():void {
		this._sse = new EventSource(Config.instance.API_PATH+"/sse/register?token=Bearer "+ApiHelper.accessToken);
		this._sse.onmessage = (event) => this.onMessage(event);
		this._sse.onopen = (event) => {
			//randomize event so not everyone potentially spams server on its reconnect
			setTimeout(() => {
				this.dispatchEvent(new SSEEvent(SSEEvent.ON_CONNECT));
			}, Math.random()*1000);
		}
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
			this.dispatchEvent(new SSEEvent(json.code, json.data));
		}catch(error) {
			//ignore
		}
	}

}
