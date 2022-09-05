import OBSWebSocket from 'obs-websocket-js';
import type { JsonArray, JsonObject } from 'type-fest';
import { reactive } from 'vue';
import { EventDispatcher } from './EventDispatcher';
import StoreProxy from './StoreProxy';
import type { TwitchatActionType, TwitchatEventType } from './TwitchatEvent';
import TwitchatEvent from './TwitchatEvent';
import Utils from './Utils';

/**
* Created : 29/03/2022 
*/
export default class OBSWebsocket extends EventDispatcher {

	private static _instance:OBSWebsocket;

	public connected = false;
	
	private obs!:OBSWebSocket;
	private reconnectTimeout!:number;
	private autoReconnect = false;
	
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
	public async connect(port:string, pass:string, autoReconnect = true, ip = "127.0.0.1"):Promise<boolean> {
		clearTimeout(this.reconnectTimeout);
		this.autoReconnect = autoReconnect;
		if(StoreProxy.store.state.obsConnectionEnabled !== true) return false;
		if(!ip || ip.length < 5) return false;

		try {
			const protocol = ip == "127.0.0.1" ? "ws://" : "wss://";
			const portValue = port && port?.length > 0 && port != "0"? ":"+port : "";
			await this.obs.connect(protocol + ip + portValue, pass, {rpcVersion:1});
			this.connected = true;
		}catch(error) {
			if(this.autoReconnect) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = setTimeout(()=> {
					this.connect(port, pass, autoReconnect, ip);
				}, 5000);
			}
			return false;
		}

		this.obs.addListener("ConnectionClosed", ()=> {
			this.connected = false;
			if(this.autoReconnect) {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = setTimeout(()=> {
					this.connect(port, pass, autoReconnect, ip);
				}, 5000);
			}
		});

		//@ts-ignore
		this.obs.on("CustomEvent", (e:{origin:"twitchat", type:TwitchatActionType, data:JsonObject | JsonArray | JsonValue}) => {
			if(e.type == undefined) return;
			if(e.origin != "twitchat") return;
			this.dispatchEvent(new TwitchatEvent(e.type, e.data));
		})

		console.log(await this.obs.call("GetInputList"));

		/* LIST ALL INPUT KINDS
		const sources = await this.getSources();
		const inputKinds:{[key:string]:boolean} = {}
		for (let i = 0; i < sources.length; i++) {
			const e = sources[i];
			if(inputKinds[e.inputKind] !== true) {
				inputKinds[e.inputKind] = true;
			}
		}
		console.log(inputKinds);
		//*/

		/* GET A SOURCE SETTINGS
		const settings = await this.obs.call("GetInputSettings", {inputName: "TTBrowerSourceTest"});
		console.log(settings);
		//*/

		/* GET ALL SOURCES OF A SCENE
		const itemsCall = await this.obs.call("GetSceneItemList", {sceneName:"👦 Face (FS)"});
		const items = (itemsCall.sceneItems as unknown) as OBSSourceItem[];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			console.log(item);
		}
		//*/

		// const res = await this.getSourceOnCurrentScene("TTImage");
		// console.log(res);

		return true;
	}

	public async stopStreaming():Promise<void> {
		if(!this.connected) return;
		const status = await this.obs.call("GetStreamStatus");
		if(status.outputActive) {
			await this.obs.call("StopStream");
		}
	}

	/**
	 * Broadcast a message to all the connected clients
	 * @param data
	 */
	public async broadcast(type:TwitchatEventType|TwitchatActionType, data?:JsonObject):Promise<void> {
		if(!this.connected) {
			//Try again
			setTimeout(()=> this.broadcast(type, data), 1000);
			return;
		}

		const eventData = { origin:"twitchat", type, data }
		this.obs.call("BroadcastCustomEvent", {eventData});
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
	 * Get all the available inputs
	 * 
	 * @returns 
	 */
	public async getInputs():Promise<OBSInputItem[]> {
		if(!this.connected) return [];
		return ((await this.obs.call("GetInputList")).inputs as unknown) as OBSInputItem[];
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
		console.log(kinds);
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
	 * Set the current scene by its name
	 * 
	 * @param name 
	 * @returns 
	 */
	public async setCurrentScene(name:string):Promise<void> {
		if(!this.connected) return;
		
		await this.obs.call("SetCurrentProgramScene", {sceneName:name});
	}

	/**
	 * Change the content of a text source
	 * 
	 * @param sourceName 
	 * @param text 
	 */
	public async setTextSourceContent(sourceName:string, text:string):Promise<void> {
		if(!this.connected) return;
		
		await this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:{text}});
	}

	/**
	 * Change a filter's visibility
	 * 
	 * @param sourceName 
	 * @param filterName 
	 * @param visible 
	 */
	public async setFilterState(sourceName:string, filterName:string, visible:boolean):Promise<void> {
		if(!this.connected) return;
		
		//@ts-ignore ("SetSourceFilterEnabled" not yet defined on obs-websocket-js)
		await this.obs.call("SetSourceFilterEnabled", {sourceName, filterName, filterEnabled:visible});
		await Utils.promisedTimeout(20);
	}

	/**
	 * Set a sources's visibility on the current scene
	 * 
	 * @param sourceName 
	 * @param visible 
	 */
	public async setSourceState(sourceName:string, visible:boolean):Promise<void> {
		if(!this.connected) return;
		
		//FIXME if the requested source is on multiple scenes, this will only toggle one of them
		const item = await this.getSourceOnCurrentScene(sourceName);
		if(item) {
			await this.obs.call("SetSceneItemEnabled", {
				sceneName:item.scene,
				sceneItemId:item.source.sceneItemId,
				sceneItemEnabled:visible
			});
			await Utils.promisedTimeout(20);
		}
	}

	/**
	 * Get a source by its name on the current scene.
	 * Searches recursively on sub scenes
	 * 
	 * @param sourceName 
	 * @param sceneName 
	 * @returns 
	 */
	public async getSourceOnCurrentScene(sourceName:string, sceneName = ""):Promise<{scene:string, source:OBSSourceItem}|null> {
		if(!sceneName) {
			const scene = await this.obs.call("GetCurrentProgramScene");
			sceneName = scene.currentProgramSceneName;
		}
		const itemsCall = await this.obs.call("GetSceneItemList", {sceneName});
		const items = (itemsCall.sceneItems as unknown) as OBSSourceItem[];
		const item = items.find(v=> v.sourceName == sourceName);
		if(item) {
			return {scene:sceneName, source:item};
		}else{
			for (let i = 0; i < items.length; i++) {
				const item = items[i];
				if(!item.isGroup && item.sourceType == "OBS_SOURCE_TYPE_SCENE") {
					const res = await this.getSourceOnCurrentScene(sourceName, item.sourceName);
					if(res) return res;
				}
			}
		}
		return null;
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
		
		await this.obs.call("SetInputMute", {inputName:sourceName, inputMuted:mute});
	}

	/**
	 * Change the URL of a browser source
	 * 
	 * @param sourceName 
	 * @param url 
	 */
	public async setBrowserSourceURL(sourceName:string, url:string):Promise<void> {
		if(!this.connected) return;
		
		// const settings = await this.obs.call("GetInputSettings", {inputName: sourceName});
		const newSettings:BrowserSourceSettings = {shutdown:true, is_local_file:false, url}
		if(!/https?:\/\.*/i?.test(url)) {
			//If using a local file, do not use "local_file" param is it does not
			//supports query parameters. 
			newSettings.url = "file:///"+url;
		}
		
		await this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:newSettings as JsonObject});
	}

	/**
	 * Change the URL of an media (ffmpeg) source
	 * 
	 * @param sourceName 
	 * @param url 
	 */
	public async setMediaSourceURL(sourceName:string, url:string):Promise<void> {
		if(!this.connected) return;
		
		await this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:{local_file:url, file:url}});
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		this.obs = new OBSWebSocket();
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

export interface OBSInputItem {
	inputKind:OBSInputKind;
	inputName:string;
	unversionedInputKind:string;
}

export interface OBSFilter {
	filterEnabled: boolean;
	filterIndex: number;
	filterKind: string;
	filterName: string;
	filterSettings: unknown;
}

export interface BrowserSourceSettings {
	fps?: number;
	fps_custom?: boolean;
	height?: number;
	is_local_file?: boolean;
	local_file?: string;
	shutdown?: boolean;
	url?: string;
	width?: number;
}