import OBSWebSocket from 'obs-websocket-js';
import { JsonArray, JsonObject } from 'type-fest';
import { reactive } from 'vue';
import { EventDispatcher } from './EventDispatcher';
import TwitchatEvent, { TwitchatActionType, TwitchatEventType } from './TwitchatEvent';

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

	public get obsSocket():OBSWebSocket { return this.obs; }
	
	
	
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
	 * Get all the sources references
	 * 
	 * @returns 
	 */
	public async getSources():Promise<OBSSourceItem[]> {
		if(!this.connected) return [];
		const scenes = await this.getScenes();
		let sources:OBSSourceItem[] = [];
		const idsDone:{[key:string]:boolean} = {};
		for (let i = 0; i < scenes.scenes.length; i++) {
			const scene = scenes.scenes[i] as {sceneIndex:number, sceneName:string};
			const list = await this.obs.call("GetSceneItemList", {sceneName:scene.sceneName});
			let items = (list.sceneItems as unknown) as OBSSourceItem[];
			items = items.filter(v => idsDone[v.sourceName] !== true);
			items.forEach(v => idsDone[v.sourceName] = true);
			sources = sources.concat(items);
		}
		return sources;
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
	 * Gets all the available filters of a specific source
	 * 
	 * @param sourceName 
	 * @returns 
	 */
	public async getSourceFilters(sourceName:string):Promise<OBSFilter[]> {
		if(!this.connected) return [];
		
		const res = await this.obs.call("GetSourceFilterList", {sourceName});
		return (res.filters as unknown) as OBSFilter[];
	}

	/**
	 * Broadcast a message to all the connected clients
	 * @param data
	 */
	public async broadcast(type:TwitchatEventType|TwitchatActionType, data?:JsonObject):Promise<void> {
		if(!this.connected) return;

		const eventData = { origin:"twitchat", type, data }
		this.obs.call("BroadcastCustomEvent", {eventData});
	}

	/**
	 * Change the content of a text source
	 * 
	 * @param sourceName 
	 * @param text 
	 */
	public setTextSourceContent(sourceName:string, text:string):void {
		this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:{text}});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		
	}
}

export type OBSInputKind = "window_capture" | "streamfx-source-mirror" | "browser_source" | "color_source_v3" | "dshow_input" | "image_source" | "null" | "monitor_capture" | "ffmpeg_source" | "wasapi_input_capture" | "text_gdiplus_v2";
export type OBSSourceType = "OBS_SOURCE_TYPE_INPUT" | "OBS_SOURCE_TYPE_SCENE";

export interface OBSAudioSource {inputKind:OBSInputKind, inputName:string, unversionedInputKind:string}
export interface OBSSourceItem {
	inputKind:OBSInputKind;
	isGroup:boolean|null;
	sceneItemId:number;
	sceneItemIndex:number;
	sourceName:string;
	sourceType:OBSSourceType;
}

export interface OBSFilter {
	filterEnabled: boolean;
	filterIndex: number;
	filterKind: string;
	filterName: string;
	filterSettings: unknown;
}

export const OBSSceneTriggerTypes = {
	FIRST_ALL_TIME:1,
	FIRST_TODAY:2,
	POLL_RESULT:3,
	PREDICTION_RESULT:4,
	RAFFLE_RESULT:5,
	BINGO_RESULT:6,
	CHAT_COMMAND:7,
	SUB:8,
	SUBGIFT:9,
	BITS:10,
	FOLLOW:11,
}

export const OBSSceneTriggers = [
	{label:"First message of a user all time", value:OBSSceneTriggerTypes.FIRST_ALL_TIME},
	{label:"First message of a user today", value:OBSSceneTriggerTypes.FIRST_TODAY},
	{label:"Poll result", value:OBSSceneTriggerTypes.POLL_RESULT},
	{label:"Prediction result", value:OBSSceneTriggerTypes.PREDICTION_RESULT},
	{label:"Raffle result", value:OBSSceneTriggerTypes.RAFFLE_RESULT},
	{label:"Bingo result", value:OBSSceneTriggerTypes.BINGO_RESULT},
	{label:"Chat command", value:OBSSceneTriggerTypes.CHAT_COMMAND},
	{label:"Sub", value:OBSSceneTriggerTypes.SUB},
	{label:"Subgift", value:OBSSceneTriggerTypes.SUBGIFT},
	{label:"Bits", value:OBSSceneTriggerTypes.BITS},
	{label:"New follower", value:OBSSceneTriggerTypes.FOLLOW},
]