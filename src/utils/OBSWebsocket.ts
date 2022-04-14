import OBSWebSocket from 'obs-websocket-js';
import { JsonArray, JsonObject } from 'type-fest';
import { reactive } from 'vue';
import { EventDispatcher } from './EventDispatcher';
import TwitchatEvent, { TwitchatEventType } from './TwitchatEvent';

/**
* Created : 29/03/2022 
*/
export default class OBSWebsocket extends EventDispatcher {

	private static _instance:OBSWebsocket;

	public connected:boolean = false;
	
	private obs!:OBSWebSocket;
	private reconnectTimeout!:number;
	private autoReconnect:boolean = false;
	
	constructor() {
		super();
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():OBSWebsocket {
		if(!OBSWebsocket._instance) {
			OBSWebsocket._instance = reactive(new OBSWebsocket()) as OBSWebsocket;
			OBSWebsocket._instance.initialize();
		}
		return OBSWebsocket._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Disconnect from OBS Websocket
	 */
	public async disconnect():Promise<void> {
		this.autoReconnect = false;
		this.obs.disconnect();
	}

	/**
	 * Connect to OBS websocket
	 * 
	 * @param port 
	 * @param pass 
	 * @param autoReconnect 
	 * @returns 
	 */
	public async connect(port:string, pass:string, autoReconnect:boolean = true):Promise<boolean> {
		clearTimeout(this.reconnectTimeout);
		this.autoReconnect = autoReconnect;
		this.obs = new OBSWebSocket();

		try {
			await this.obs.connect("ws://127.0.0.1:"+port, pass, {rpcVersion:1});
		}catch(error) {
			console.log(error);
			if(this.autoReconnect) {
				this.reconnectTimeout = setTimeout(()=> {
					this.connect(port, pass);
				}, 5000);
			}
			return false;
		}
		this.connected = true;
		this.obs.addListener("ConnectionClosed", ()=> {
			this.connected = false;
			if(this.autoReconnect) {
				this.connect(port, pass);
			}
		});

		//@ts-ignore
		this.obs.on("CustomEvent", (e:{origin:"twitchat", type:TwitchatActionType, data:JsonObject | JsonArray | JsonValue}) => {
			if(e.type == undefined) return;
			if(e.origin != "twitchat") return;
			this.dispatchEvent(new TwitchatEvent(e.type, e.data));
		})

		return true;
	}

	/**
	 * Set the current scene by its name
	 * 
	 * @param name 
	 * @returns 
	 */
	public async setScene(name:string):Promise<void> {
		if(!this.connected) return;
		
		return await this.obs.call("SetCurrentProgramScene", {sceneName:name});
	}
	
	/**
	 * Get all the scenes references
	 * 
	 * @returns 
	 */
	public async getScenes():Promise<{
		currentProgramSceneName: string;
		currentPreviewSceneName: string;
		scenes: JsonArray;
	}> {
		if(!this.connected) return {currentProgramSceneName:"", currentPreviewSceneName:"", scenes:[]};
		
		return await this.obs.call("GetSceneList");
	}
	
	/**
	 * Get all the available audio sources
	 * 
	 * @returns 
	 */
	public async getAudioSources():Promise<{
		inputs: JsonArray;
	}> {
		if(!this.connected) return {inputs:[]};
		
		const kinds = await this.getInputKindList();
		const audioKind = kinds.inputKinds.find(kind=>kind.indexOf("input_capture") > -1);
		return await this.obs.call("GetInputList", {inputKind:audioKind});
	}
	
	/**
	 * Get all the available kinds of sources
	 * @returns 
	 */
	public async getInputKindList():Promise<{
		inputKinds: string[];
	}> {
		if(!this.connected) return {inputKinds:[]};
		
		return await this.obs.call("GetInputKindList");
	}

	/**
	 * Mute/unmute an audio source by its name
	 * 
	 * @param sourceName 
	 * @param mute 
	 * @returns 
	 */
	public async setMuteState(sourceName:string, mute:boolean):Promise<void> {
		if(!this.connected) return;
		
		return await this.obs.call("SetInputMute", {inputName:sourceName, inputMuted:mute});
	}

	/**
	 * Broadcast a message ot all the connected clients
	 * @param data
	 */
	public async broadcast(type:TwitchatEventType, data:JsonObject):Promise<void> {
		if(!this.connected) return;

		const eventData = { origin:"twitchat", type, data }
		this.obs.call("BroadcastCustomEvent", {eventData});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}
}

export interface OBSAudioSource {inputKind:string, inputName:string, unversionedInputKind:string}