import { PermissionsData } from '@/store';
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
	public async connect(port:string, pass:string, autoReconnect:boolean = true, ip:string = "127.0.0.1"):Promise<boolean> {
		clearTimeout(this.reconnectTimeout);
		this.autoReconnect = autoReconnect;

		try {
			await this.obs.connect("ws://"+ip+":"+port, pass, {rpcVersion:1});
		}catch(error) {
			if(this.autoReconnect) {
				clearTimeout(this.reconnectTimeout);
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
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = setTimeout(()=> {
					this.connect(port, pass);
				}, 5000);
			}
		});

		//@ts-ignore
		this.obs.on("CustomEvent", (e:{origin:"twitchat", type:TwitchatActionType, data:JsonObject | JsonArray | JsonValue}) => {
			if(e.type == undefined) return;
			if(e.origin != "twitchat") return;
			this.dispatchEvent(new TwitchatEvent(e.type, e.data));
		})

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
		const settings = await this.obs.call("GetInputSettings", {inputName: "MediaSourceTest"});
		console.log(settings);
		//*/

		return true;
	}

	public stopStreaming():void {
		this.obs.call("StopStream");
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
		
		return await this.obs.call("SetCurrentProgramScene", {sceneName:name});
	}

	/**
	 * Change the content of a text source
	 * 
	 * @param sourceName 
	 * @param text 
	 */
	public setTextSourceContent(sourceName:string, text:string):void {
		if(!this.connected) return;
		
		this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:{text}});
	}

	/**
	 * Change a filter's visibility
	 * 
	 * @param sourceName 
	 * @param filterName 
	 * @param visible 
	 */
	public setFilterState(sourceName:string, filterName:string, visible:boolean):void {
		if(!this.connected) return;
		
		//@ts-ignore ("SetSourceFilterEnabled" not yet defined on obs-websocket-js)
		this.obs.call("SetSourceFilterEnabled", {sourceName, filterName, filterEnabled:visible});
	}

	/**
	 * Set a sources's visibility on the current scene
	 * 
	 * @param sourceName 
	 * @param visible 
	 */
	public async setSourceState(sourceName:string, visible:boolean):Promise<void> {
		if(!this.connected) return;

		const scene = await this.obs.call("GetCurrentProgramScene");
		const itemsCall = await this.obs.call("GetSceneItemList", {sceneName:scene.currentProgramSceneName});
		const items = (itemsCall.sceneItems as unknown) as OBSSourceItem[];
		const item = items.find(v=> v.sourceName == sourceName)
		if(item) {
			this.obs.call("SetSceneItemEnabled", {
				sceneName:scene.currentProgramSceneName,
				sceneItemId:item.sceneItemId,
				sceneItemEnabled:visible
			});
		}
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
	 * Change the URL of a browser source
	 * 
	 * @param sourceName 
	 * @param url 
	 */
	public setBrowserSourceURL(sourceName:string, url:string):void {
		if(!this.connected) return;
		
		this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:{url}});
	}

	/**
	 * Change the URL of an media (ffmpeg) source
	 * 
	 * @param sourceName 
	 * @param url 
	 */
	public setMediaSourceURL(sourceName:string, url:string):void {
		if(!this.connected) return;
		
		this.obs.call("SetInputSettings", {inputName:sourceName as string, inputSettings:{local_file:url}});
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

export interface OBSFilter {
	filterEnabled: boolean;
	filterIndex: number;
	filterKind: string;
	filterName: string;
	filterSettings: unknown;
}

export interface OBSTriggerEventsType {
	label:string;
	value:string;
	isCategory?:boolean,
	jsonTest?:unknown,
	command?:string,
	permissions?:PermissionsData,
	cooldown?:{global:number, user:number},
	[paramater: string]: unknown;
}

export const OBSTriggerEventTypes = {
	FIRST_ALL_TIME:"1",
	FIRST_TODAY:"2",
	POLL_RESULT:"3",
	PREDICTION_RESULT:"4",
	RAFFLE_RESULT:"5",
	BINGO_RESULT:"6",
	CHAT_COMMAND:"7",
	SUB:"8",
	SUBGIFT:"9",
	BITS:"10",
	FOLLOW:"11",
	RAID:"12",
	REWARD_REDEEM:"13",
}

export const OBSTriggerEvents:OBSTriggerEventsType[] = [
	{label:"Chat command", value:OBSTriggerEventTypes.CHAT_COMMAND, isCategory:true, jsonTest:{"type":"message","message":"!test","tags":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000004","tmi-sent-ts":"1650938130680"},"channel":"#durss","self":true}},
	{label:"Channel point reward", value:OBSTriggerEventTypes.REWARD_REDEEM, isCategory:true, jsonTest:{"reward":{"timestamp":"2022-04-25T22:54:53.897356718Z","redemption":{"user":{"id":"29961813","login":"durss","display_name":"Durss"},"reward":{"id":"TEST_ID","channel_id":"29961813","title":"Text reward","prompt":"This is a reward description","cost":1000},"status":"UNFULFILLED"}},"tags":{"username":"Durss","display-name":"Durss","id":"bdeddedd-6184-4b26-a74e-87a5ff99a1be","user-id":"29961813","tmi-sent-ts":"1650927293897","message-type":"chat","room-id":"29961813"},"type":"highlight"}},
	{label:"First message of a user all time", value:OBSTriggerEventTypes.FIRST_ALL_TIME, jsonTest:{"type":"message","message":"This is my first message here !","tags":{"badges":{"premium":"1"},"client-nonce":"004c878edd9adf5b36717d6454db1b7c","color":"#9ACD32","display-name":"Durss","emote-only":true,"emotes":{},"first-msg":true,"flags":null,"id":"c5c54086-d0b5-4809-976a-254f4d206248","mod":false,"room-id":"121652526","subscriber":false,"tmi-sent-ts":"1642377332605","turbo":false,"user-id":"92203285","user-type":null,"emotes-raw":"","badge-info-raw":null,"badges-raw":"premium/1","username":"durss","message-type":"chat"},"channel":"#durss","self":false,"firstMessage":true}},
	{label:"First message of a user today", value:OBSTriggerEventTypes.FIRST_TODAY, jsonTest:{"type":"message","message":"This is my first message for today!","tags":{"badges":{"premium":"1"},"client-nonce":"004c878edd9adf5b36717d6454db1b7c","color":"#9ACD32","display-name":"Durss","emote-only":true,"emotes":{},"first-msg":false,"flags":null,"id":"c5c54086-d0b5-4809-976a-254f4d206248","mod":false,"room-id":"121652526","subscriber":false,"tmi-sent-ts":"1642377332605","turbo":false,"user-id":"92203285","user-type":null,"emotes-raw":"","badge-info-raw":null,"badges-raw":"premium/1","username":"durss","message-type":"chat"},"channel":"#durss","self":false,"firstMessage":true}},
	{label:"Poll result", value:OBSTriggerEventTypes.POLL_RESULT, jsonTest:{"tags":{"id":"00000000-0000-0000-0001-000000000034"},"type":"poll","data":{"id":"3c96966e-9141-4d0d-98fe-8e417301144c","broadcaster_id":"29961813","broadcaster_name":"durss","broadcaster_login":"durss","title":"Which option is the best?","choices":[{"id":"b2dc37a4-6469-41f3-9d09-57644cc813b3","title":"This one","votes":2,"channel_points_votes":450,"bits_votes":0},{"id":"a1b43c9c-b52a-4885-9d4e-2c2c0d99218b","title":"That one","votes":5,"channel_points_votes":250,"bits_votes":0}],"bits_voting_enabled":false,"bits_per_vote":0,"channel_points_voting_enabled":false,"channel_points_per_vote":0,"status":"COMPLETED","duration":60,"started_at":"2022-02-16T17:59:57.589127933Z","ended_at":"2022-02-16T18:00:57.589127933Z"}}},
	{label:"Prediction result", value:OBSTriggerEventTypes.PREDICTION_RESULT, jsonTest:{"tags":{"id":"00000000-0000-0000-0001-000000000017"},"type":"prediction","data":{"id":"09ced600-a679-45c5-ad50-4979090f6db1","broadcaster_id":"29961813","broadcaster_name":"Durss","broadcaster_login":"durss","title":"Is Twitchat amazing?","winning_outcome_id":"a9753995-f25d-40d1-81cd-a9b7605b58d7","outcomes":[{"id":"a9753995-f25d-40d1-81cd-a9b7605b58d7","title":"OMG YES","users":1,"channel_points":80,"top_predictors":[{"user_id":"647389082","user_login":"durssbot","user_name":"DurssBot","channel_points_used":80,"channel_points_won":0}],"color":"BLUE"},{"id":"7a483df8-3ec8-4e15-8e9a-da64fc574ad9","title":"it's ok","users":1,"channel_points":188,"top_predictors":[{"user_id":"29961813","user_login":"durss","user_name":"Durss","channel_points_used":188,"channel_points_won":0}],"color":"PINK"}],"prediction_window":30,"status":"RESOLVED","created_at":"2022-02-17T19:10:55.130396565Z","ended_at":"2022-02-17T19:11:30.109908422Z","locked_at":"2022-02-17T19:11:24.804100656Z"},"showHoverActions":false,"markedAsRead":false}},
	{label:"Raffle result", value:OBSTriggerEventTypes.RAFFLE_RESULT, jsonTest:{"type":"raffle","data":{"command":"!raffle","duration":10,"maxUsers":0,"created_at":1650674437311,"users":[{"score":1,"user":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000002","tmi-sent-ts":"1650674440278"}}],"followRatio":0,"vipRatio":0,"subRatio":0,"subgitRatio":0,"winners":[{"score":1,"user":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000002","tmi-sent-ts":"1650674440278"}}]},"tags":{"id":"00000000-0000-0000-0000-000000000003","tmi-sent-ts":"1650674447187"},"winner":{"score":1,"user":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000002","tmi-sent-ts":"1650674440278"}},"showHoverActions":false}},
	{label:"Bingo result", value:OBSTriggerEventTypes.BINGO_RESULT, jsonTest:{"type":"bingo","data":{"guessNumber":true,"guessEmote":false,"numberValue":6,"opened":true,"winners":[{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000005","tmi-sent-ts":"1650674495186"}]},"tags":{"id":"00000000-0000-0000-0000-000000000006","tmi-sent-ts":"1650674495236"},"winner":{"badge-info":{"subscriber":"13"},"badges":{"broadcaster":"1","subscriber":"12"},"color":"#9ACD32","display-name":"Durss","emote-sets":"","mod":false,"subscriber":true,"user-type":null,"badge-info-raw":"subscriber/13","badges-raw":"broadcaster/1,subscriber/12","username":"durss","emotes":{},"emotes-raw":null,"message-type":"chat","id":"00000000-0000-0000-0000-000000000005","tmi-sent-ts":"1650674495186"}}},
	{label:"Sub", value:OBSTriggerEventTypes.SUB, jsonTest:{"type":"highlight","channel":"#durss","username":"Durss","methods":{"prime":true,"plan":"Prime","planName":"Be a Little Whale !"},"tags":{"badge-info":{"subscriber":"0"},"badges":{"subscriber":"0","premium":"1"},"color":"#9ACD32","display-name":"Durss","emotes":null,"flags":null,"id":"639779e0-37b0-4e31-9045-2ee8f21f0b34","login":"durss","mod":false,"msg-id":"sub","msg-param-cumulative-months":true,"msg-param-months":false,"msg-param-multimonth-duration":false,"msg-param-multimonth-tenure":false,"msg-param-should-share-streak":false,"msg-param-sub-plan-name":"Be a Little Whale !","msg-param-sub-plan":"Prime","msg-param-was-gifted":"false","room-id":"121652526","subscriber":true,"system-msg":"durss subscribed with Prime.","tmi-sent-ts":"1642377377050","user-id":"29961813","user-type":null,"emotes-raw":null,"badge-info-raw":"subscriber/0","badges-raw":"subscriber/0,premium/1","message-type":"sub"},"message":"Woop wooooooop !"}},
	{label:"Subgift", value:OBSTriggerEventTypes.SUBGIFT, jsonTest:{"type":"highlight","channel":"#durss","username":"Durss","methods":{"prime":false,"plan":"3000","planName":"SUBSCRIBER"},"months":0,"tags":{"badge-info":{"subscriber":"12"},"badges":{"subscriber":"3012","sub-gifter":"5"},"color":"#9ACD32","display-name":"Durss","emotes":null,"flags":null,"id":"51e48d26-836b-409c-ac7f-708e84ccc5b1","login":"durss","mod":false,"msg-id":"subgift","msg-param-gift-months":true,"msg-param-months":true,"msg-param-origin-id":"cf 8a 7f a4 b1 9f ac e4 9f bc ac c8 c2 30 b3 5d 0c 84 c7 b1","msg-param-recipient-display-name":"Durssbot","msg-param-recipient-id":"452550058","msg-param-recipient-user-name":"Durssbot","msg-param-sender-count":false,"msg-param-sub-plan-name":"SUBSCRIBER","msg-param-sub-plan":"1000","room-id":"29961813","subscriber":true,"system-msg":"durss gifted a Tier 1 sub to Durssbot!","tmi-sent-ts":"1642377361661","user-id":"156668532","user-type":null,"emotes-raw":null,"badge-info-raw":"subscriber/12","badges-raw":"subscriber/3012,sub-gifter/5","message-type":"subgift"},"recipient":"Durssbot","firstMessage":false}},
	{label:"Bits", value:OBSTriggerEventTypes.BITS, jsonTest:{"type":"highlight","channel":"#durss","tags":{"badge-info":{"subscriber":"1"},"badges":{"subscriber":"0"},"bits":"51275","color":"#9ACD32","display-name":"Durss","emotes":{},"first-msg":false,"flags":null,"id":"2a1279df-d092-4f87-a2bc-a9123d64f39c","mod":false,"room-id":"29961813","subscriber":true,"tmi-sent-ts":"1642379087259","turbo":false,"user-id":"29961813","user-type":null,"emotes-raw":"","badge-info-raw":"subscriber/1","badges-raw":"subscriber/0","username":"durss","message-type":"chat"},"message":"Here are 51275 bits for you! Cheer1050 Cheer25 Corgo50000 Anon100 Muxy100"}},
	{label:"Follow", value:OBSTriggerEventTypes.FOLLOW, jsonTest:{"channel":"#durss","tags":{"username":"Durss","user-id":"29961813","tmi-sent-ts":"1644088397887","id":"00000000-0000-0000-0001-000000000000","msg-id":"follow"},"username":"Durss","type":"highlight","firstMessage":false}},
	{label:"Raid", value:OBSTriggerEventTypes.RAID, jsonTest:{"type":"highlight","channel":"#durss","tags":{"info":"this tags prop is a fake one to make things easier for my code","id":"16423778121330.0751974390273129","tmi-sent-ts":"1642377812133","msg-id":"raid"},"username":"Durss","viewers":727,"firstMessage":false}},
]