import OBSWebSocket from 'obs-websocket-js';
import { JsonArray } from 'type-fest';

/**
* Created : 29/03/2022 
*/
export default class OBSWebsocket {

	private static _instance:OBSWebsocket;

	public connected:boolean = false;

	private obs!:OBSWebSocket;
	private reconnectTimeout!:number;
	private connectAttempsCount:number = 0;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():OBSWebsocket {
		if(!OBSWebsocket._instance) {
			OBSWebsocket._instance = new OBSWebsocket();
			OBSWebsocket._instance.initialize();
		}
		return OBSWebsocket._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public async connect(port:string, pass:string, autoReconnect:boolean = true):Promise<boolean> {
		clearTimeout(this.reconnectTimeout);
		this.obs = new OBSWebSocket();
		try {
			await this.obs.connect("ws://127.0.0.1:"+port, pass, {rpcVersion:1});
		}catch(error) {
			if(autoReconnect) {
				this.connectAttempsCount ++;
				this.reconnectTimeout = setTimeout(()=> {
					this.connect(port, pass);
				}, Math.pow(this.connectAttempsCount, 3)*1000);
			}
			return false;
		}
		this.connected = true;
		this.obs.addListener("ConnectionClosed", ()=> {
			this.connected = false;
			if(autoReconnect) {
				this.connect(port, pass);
			}
		})
		return true;
	}

	public async setScene(name:string):Promise<void> {
		return await this.obs.call("SetCurrentProgramScene", {sceneName:name});
	}
	
	public async getScenes():Promise<{
		currentProgramSceneName: string;
		currentPreviewSceneName: string;
		scenes: JsonArray;
	}> {
		return await this.obs.call("GetSceneList");
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}
}