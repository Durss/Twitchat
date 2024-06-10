/**
 * This is a super light overlay only made to display placeholders
 * It should import the bare minimum to be extra light as users
 * might abuse usage of such overlay.
 * It's not using Vue, only vanilla JS
 */

import OBSWebSocket from 'obs-websocket-js';
import type { JsonObject } from 'type-fest';
import TwitchatEvent, { type TwitchatActionType, type TwitchatEventType } from './events/TwitchatEvent';
import type { LabelItemData, LabelItemPlaceholder } from './types/ILabelOverlayData';
import '@/less/index.less';


const urlParams = new URLSearchParams(document.location.search);
let error = false;
let connected = false;
let messageIdsDone:{[key:string]:boolean} = {};
let broadcastChannelTunnel!:BroadcastChannel;
let obsConnected = false;
let reconnectTimeout = -1;
let obsSocket!:OBSWebSocket;
let parameters:LabelItemData | null = null;
let placeholders:{[key:string]:{
	tag:string;
	type:"string"|"number"|"image";
	value:string|number;
}} = {};

interface IEnvelope<T = undefined> {
	origin:"twitchat";
	id:string;
	type:TwitchatEventType | TwitchatActionType;
	data?:T
}


/**
 * Connects and automatically reconnects to OBS websocket
 */
async function connectToOBS():Promise<void> {
	if(!obsSocket) {
		obsSocket = new OBSWebSocket();
		obsSocket.addListener("ConnectionClosed", ()=> {
			obsConnected = false;
			clearTimeout(reconnectTimeout);
			reconnectTimeout = setTimeout(()=> {
				connectToOBS();
			}, 5000);
		});

		/**
		 * Called when receiving a custom event from OBS-websocket
		 */
		//@ts-ignore "CustomEvent" not yet defined on OBS-ws signatures
		obsSocket.on("CustomEvent", (e:IEnvelope) => {
			if(e.type == undefined) return;
			if(e.origin != "twitchat") return;
			onMessage(e);
		});
	}
	try {
		const ip = urlParams.get("obs_ip") || "127.0.0.1";
		const port = urlParams.get("obs_port") || "4455";
		const pass = urlParams.get("obs_pass") || "";
		const protocol = (ip == "127.0.0.1" || ip == "localhost") ? "ws://" : "wss://";
		const portValue = port && port?.length > 0 && port != "0"? ":"+port : "";
		await obsSocket.connect(protocol + ip + portValue, pass, {rpcVersion: 1});
		obsConnected = true;
		requestInitialInfo();
	}catch(error) {
		console.log(error);
		clearTimeout(reconnectTimeout);
		reconnectTimeout = setTimeout(()=> {
			connectToOBS();
		}, 5000);
	}
}

/**
 * initialize connection with twitchat
 */
function createConnectionTunnel():void {
	if(typeof BroadcastChannel != "undefined") {
		broadcastChannelTunnel = new BroadcastChannel("twitchat");
		broadcastChannelTunnel.onmessage = (e: MessageEvent<IEnvelope>):void => {
			onMessage(e.data);
		}
	}
	connectToOBS();
}

/**
 * Broadcast a message to Twitchat
 *
 * @param type
 * @param parameters
 */
async function broadcast<T>(type:TwitchatEventType|TwitchatActionType, parameters?:T):Promise<void> {
	// console.log("Broadcasting", type, data);
	const eventId = getUUID();
	messageIdsDone[eventId] = true;//Avoid receiving self-broadcast events

	let eventData:IEnvelope<typeof parameters> = {origin:"twitchat", type:type, id:eventId, data: parameters};

	//Broadcast to other browser's tabs
	try {
		if(broadcastChannelTunnel) broadcastChannelTunnel.postMessage(eventData);
	}catch(error) { console.error(error) }

	if(obsConnected) {
		//Broadcast to any OBS Websocket connected client
		obsSocket.call("BroadcastCustomEvent", {eventData:eventData as unknown as JsonObject});
	}
}

/**
 * Generate a UUID
 * @returns 
 */
function getUUID():string {
	if(crypto.randomUUID) {
		return crypto.randomUUID();
	}
	let uuid = "";
	const chars = "0123456789abcdef";
	for (let i = 0; i < 36; i++) {
		if (i === 8 || i === 13 || i === 18 || i === 23) {
			uuid += "-";
		} else if (i === 14) {
			uuid += "4";
		} else {
			const randomNum = Math.floor(Math.random() * chars.length);
			uuid += chars[randomNum];
		}
	}
	return uuid;
}

/**
 * Called when connection with Twitchat is established
 */
function requestInitialInfo():void {
	broadcast(TwitchatEvent.GET_LABEL_OVERLAY_PLACEHOLDERS);
	broadcast(TwitchatEvent.GET_LABEL_OVERLAY_PARAMS, {id:urlParams.get("twitchat_overlay_id")});
}

/**
 * Replaces placeholders by their values
 * @param src 
 */
function parsePlaceholders(src:string):string {
	for (const tag in placeholders) {
		const placeholder = placeholders[tag];
		const tagSafe = tag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		src = src.replace(new RegExp("\\{"+tagSafe+"\\}", "gi"), placeholder.value.toString() ?? "");
	}
	return src;
}

/**
 * Called when receiving an event from feither Obs-WS or BroadcastChannel
 * @param message 
 */
function onMessage(message:IEnvelope<unknown>):void {
	if(message.id){
		//Dedupe events in case they come from both OBS and BroadcastChannel
		if(messageIdsDone[message.id] === true) return;
		messageIdsDone[message.id] = true;
	}
	if(message.type == TwitchatEvent.TWITCHAT_READY || message.type == TwitchatEvent.OBS_WEBSOCKET_CONNECTED) {
		if(connected) return;
		requestInitialInfo();
		connected = true;
	}else

	if(message.type == TwitchatEvent.LABEL_OVERLAY_PLACEHOLDERS) {
		const data = message.data as {[key:string]:{value:number|string, placeholder:LabelItemPlaceholder}}
		for (const tag in data) {
			placeholders[tag] = {
				tag,
				value:data[tag].value,
				type:data[tag].placeholder.type,
			}
		}
		renderValue();
	}else

	if(message.type == TwitchatEvent.LABEL_OVERLAY_PARAMS) {
		const json = message.data as {id:string, data:typeof parameters};
		if(json.id == urlParams.get("twitchat_overlay_id")) {
			parameters = json.data;
			if(!parameters) {
				document.getElementById("error")!.style.display = "flex";
			}else{
				renderValue();
			}
			console.log(message.type, "::", message.data);
		}
	}
	
}

function renderValue():void {
	if(!parameters || Object.keys(placeholders).length === 0) return;
	const holder = document.getElementById("app")!;
	holder.innerHTML = parsePlaceholders(parameters.value || "");
	if(parameters.mode == "placeholder") {
		holder.style.fontFamily = parameters.fontFamily || "Inter";
		holder.style.fontSize = parameters.fontSize+"px";
	}
}


createConnectionTunnel();
requestInitialInfo();