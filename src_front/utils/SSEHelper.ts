import { EventDispatcher } from "@/events/EventDispatcher";
import SSEEvent, {type EventTypeMap} from "@/events/SSEEvent";
import ApiHelper from "./ApiHelper";
import Config from "./Config";

/**
* Created : 29/02/2024
*/
export default class SSEHelper extends EventDispatcher {

	private static _instance:SSEHelper;
	private _sse!:EventSource;
	private _failCount = 0;
	private _expectedPingInterval = 110*1000;
	private _pingFailTimeout:number = -1;

	constructor() {
		super();
		window.addEventListener("beforeunload", ()=>{
			if(this._sse && this._sse.readyState == this._sse.OPEN) this._sse.close();
		});
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

	override addEventListener<T extends keyof EventTypeMap>(event:T, listenerFunc:(e:SSEEvent<T>)=>void):void {
		super.addEventListener(event, listenerFunc);
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Open SSE pipe
	 */
	private connect():void {
		if(this._sse) {
			this._sse.onmessage = null;
			this._sse.onopen = null;
			this._sse.onerror = null;
			this._sse.close();
		}

		this._sse = new EventSource(Config.instance.API_PATH+"/sse/register?token=Bearer "+ApiHelper.accessToken);
		this._sse.onmessage = (event) => this.onMessage(event);
		this._sse.onopen = (event) => {
			this._failCount = 0;
			//randomize event so not everyone potentially spams server after rebooting it
			window.setTimeout(() => {
				this.dispatchEvent(new SSEEvent(SSEEvent.ON_CONNECT));
			}, Math.random()*5000);
		}
		this._sse.onerror = (event) => {
			console.log("ERROR");
			console.log(event);
			if(++this._failCount === 5) {
				this.dispatchEvent(new SSEEvent(SSEEvent.FAILED_CONNECT));
			}
			window.setTimeout(() => {
				this.connect();
			}, Math.random()*5000);
		};

		window.addEventListener("beforeunload", ()=>{
			this._sse.onmessage = null;
			this._sse.onopen = null;
			this._sse.onerror = null;
			this._sse.close();
		})
	}

	/**
	 * Called when receiving a message
	 */
	private onMessage(event:MessageEvent<string>):void {
		this._failCount = 0;
		try {
			let json = JSON.parse(event.data) as {code:string, data:any};
			
			clearTimeout(this._pingFailTimeout);
			this._pingFailTimeout = window.setTimeout(()=>{
				this.connect();
			}, this._expectedPingInterval);

			if(json.code == "AUTHENTICATION_FAILED") {
				//Avoid autoreconnect
				this._sse.close();
			}
			this.dispatchEvent(new SSEEvent(json.code as keyof EventTypeMap, json.data));
		}catch(error) {
			//ignore
		}
	}

}
