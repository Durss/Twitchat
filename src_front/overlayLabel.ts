/**
 * This is a super light overlay only made to display placeholders
 * It should import the bare minimum to be extra light as users
 * might abuse usage of such overlay.
 * It's not using Vue, only vanilla JS
 */

import '@/less/index.less';
import OBSWebSocket from 'obs-websocket-js';
import type { JsonObject } from 'type-fest';
import type { LabelItemData, LabelItemPlaceholder } from './types/ILabelOverlayData';
import type { TwitchatEventMap } from '@/events/TwitchatEvent';


const urlParams = new URLSearchParams(document.location.search);
let connected = false;
let messageIdsDone:{[key:string]:boolean} = {};
let broadcastChannelTunnel!:BroadcastChannel;
let obsConnected = false;
let labelDisabled = false;
let reconnectTimeout = -1;
let prevHTML = "";
let timerIdInc = 0;
let scrollables:HTMLElement[] = [];
let obsSocket!:OBSWebSocket;
let parameters:LabelItemData | null = null;
let placeholders:{[tag:string]:{value:string|number, type:LabelItemPlaceholder["type"]}} = {};
let timerPlaceholder:{tag:string, params:(typeof placeholders[string])}[] = [];
let timerOffsets:{[key:string]:{dateOffset:number, type:LabelItemPlaceholder["type"]}} = {};
let mustRefreshRegularly = false;
let styleNode = document.createElement("style");
document.head.appendChild(styleNode);

interface IEnvelope<T = undefined> {
	origin:"twitchat";
	id:string;
	type:keyof TwitchatEventMap;
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
			reconnectTimeout = window.setTimeout(()=> {
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
		if(!urlParams.get("obs_ip")) return;
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
		reconnectTimeout = window.setTimeout(()=> {
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
async function broadcast<Event extends keyof TwitchatEventMap>(
		type: Event,
		...args: TwitchatEventMap[Event] extends undefined
			? [broadcastToSelf?: boolean, onlyLocal?: boolean]
			: [data: TwitchatEventMap[Event], broadcastToSelf?: boolean, onlyLocal?: boolean]
	):Promise<void> {
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
	if(parameters) return;//Already initialized, no need to ask again
	broadcast("GET_LABEL_OVERLAY_PLACEHOLDERS");
	broadcast("GET_LABEL_OVERLAY_PARAMS", {id:urlParams.get("twitchat_overlay_id")!});
}

/**
 * Replaces placeholders by their values
 * @param src
 */
function parsePlaceholders(src:string):string {
	for (const tag in placeholders) {
		const placeholder = placeholders[tag]!;
		const tagSafe = tag.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		let replacement = placeholder.value?.toString() ?? "";
		if(placeholder.type == "duration"
		|| placeholder.type == "day"
		|| placeholder.type == "month"
		|| placeholder.type == "year"
		|| placeholder.type == "hours"
		|| placeholder.type == "minutes"
		|| placeholder.type == "seconds"
		|| placeholder.type == "date"
		|| placeholder.type == "time"
		|| placeholder.type == "datetime") {
			if(!replacement) replacement = "0";
			const id = (++timerIdInc).toString();
			timerOffsets[id] = {dateOffset:placeholder.value as number || Date.now(), type:placeholder.type};
			replacement = "<span data-timerid=\""+id+"\">"+renderTimerValue(id)+"</span>";
		}
		src = src.replace(new RegExp("\\{"+tagSafe+"\\}", "gi"), replacement);
	}
	return src;
}

/**
 * Called when receiving an event from either Obs-WS or BroadcastChannel
 * @param message
 */
function onMessage(message:IEnvelope<unknown>):void {
	if(message.id){
		//Dedupe events in case they come from both OBS and BroadcastChannel
		if(messageIdsDone[message.id] === true) return;
		messageIdsDone[message.id] = true;
	}

	if(message.type == "TWITCHAT_READY" || message.type == "OBS_WEBSOCKET_CONNECTED") {
		if(connected) return;
		requestInitialInfo();
		connected = true;
	}else

	if(message.type == "LABEL_OVERLAY_PLACEHOLDERS") {
		const data = message.data as {[tag:string]:{value:string|number, type:LabelItemPlaceholder["type"]}};
		for (const key in data) {
			const tag = data[key]!
			placeholders[key] = tag;
			if(tag.type == "duration"
			|| tag.type == "date"
			|| tag.type == "time"
			|| tag.type == "hours"
			|| tag.type == "minutes"
			|| tag.type == "seconds"
			|| tag.type == "day"
			|| tag.type == "month"
			|| tag.type == "year"
			|| tag.type == "datetime") {
				timerPlaceholder.push({tag: key, params:tag});
			}
		}

		renderValue();
	}else

	if(message.type == "LABEL_OVERLAY_PARAMS") {
		const json = message.data as {id:string, data:typeof parameters, disabled?:true, exists:boolean, isValid:boolean};
		if(json.id == urlParams.get("twitchat_overlay_id")) {
			parameters = json.data;
			labelDisabled = json.disabled === true;

			document.getElementById("error")!.style.display = "none";

			if(!parameters && labelDisabled !== true && !json.exists) {
				document.getElementById("error")!.style.display = "flex";

			}else if(!json.isValid){
				parameters = null;

			}else if(labelDisabled === true){
				const holder = document.getElementById("app")!;
				holder.removeAttribute("style");
				holder.innerHTML = "";
				prevHTML = "";

			}else if(parameters){
				const holder = document.getElementById("app")!;
				holder.removeAttribute("style");
				holder.style.fontFamily = `custom-font, ${parameters.fontFamily || 'Inter'}, sans-serif`;
				holder.style.fontSize = parameters.fontSize+"px";
				holder.style.color = parameters.fontColor;

				if(parameters.backgroundEnabled) {
					holder.style.padding = ".5em";
					holder.style.backgroundColor = parameters.backgroundColor;
					holder.style.borderRadius = ".5em";
				}

				if(parameters.mode == "placeholder") {
					holder.style.maxWidth = "100vw";
					if(!parameters.scrollContent) {
						holder.style.textOverflow	= "ellipsis";
					}

					const align = parameters.textAlign || "left";
					holder.style.textAlign	= align;
				}
					
				styleNode!.innerHTML = `
				@font-face {
					font-family: "custom-font";
					src: local("${parameters.fontFamily || 'Inter'}");
				}`;

				renderValue();
				setScrollSpeed();
			}

			if(json.data?.css) {
				setDynamicStyles(json.data.css);
			}
		}
	}

}

/**
 * Dynamically apply global CSS styles
 * @param css
 */
function setDynamicStyles(css:string):void {
    let styleElement = document.getElementById('customCSS');
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = 'customCSS';
        document.head.appendChild(styleElement);
    }
    styleElement.innerHTML = css;
}

/**
 * Renders current value
 * @returns
 */
function renderValue():void {
	if(!parameters || Object.keys(placeholders).length === 0) return;
	let value = parameters.mode == "placeholder"? parameters.placeholder : parameters.html;
	let html = "";
	timerOffsets = {};
	mustRefreshRegularly = false;
	if(parameters.mode == "placeholder") {
		const phRef = placeholders[parameters.placeholder]!;
		if(phRef.type == "image"){
			html = "<img src=\""+parsePlaceholders("{"+value+"}")+"\" onload=\""+setScrollSpeed()+"\">";
		}else{
			html = parsePlaceholders("{"+value+"}" || "");
		}
		mustRefreshRegularly = timerPlaceholder.findIndex(v=>v.tag.toLowerCase() === value.toLowerCase()) > -1;

	}else if(parameters.mode == "html") {
		html = parsePlaceholders(value);
		for (let i = 0; i < timerPlaceholder.length; i++) {
			const ph = timerPlaceholder[i]!;
			mustRefreshRegularly = timerPlaceholder.findIndex(v=>v.tag.toLowerCase() === ph.tag.toLowerCase()) > -1;
			if(mustRefreshRegularly) break;
		}
	}

	if(parameters.scrollContent && parameters.mode != "html") {
		html = "<div style=\"overflow:hidden\"><scroll>"+html+"</scroll></div>";
	}

	if(html != prevHTML) {
		const holder = document.getElementById("app")!;
		holder.innerHTML = html;
		prevHTML = html;
	}

	scrollables = [...document.querySelectorAll("scroll")] as HTMLElement[];
	setScrollSpeed();
}

function renderTimerValue(timerId:string):string {
	const timer = timerOffsets[timerId];
	if(!timer) return "";
	let result = "";
	let now = new Date();
	if(timer.type == "date") result = formatDate(now, false);
	if(timer.type == "time") result = formatDate(now, true, true);
	if(timer.type == "datetime") result = formatDate(now, true);
	if(timer.type == "duration") result = formatDuration(Date.now() - timer.dateOffset, true);
	if(timer.type == "hours") result = now.getHours().toString().padStart(2, "0");
	if(timer.type == "minutes") result = now.getMinutes().toString().padStart(2, "0");
	if(timer.type == "seconds") result = now.getSeconds().toString().padStart(2, "0");
	if(timer.type == "day") result = now.getDate().toString();
	if(timer.type == "month") result = (now.getMonth()+1).toString();
	if(timer.type == "year") result = now.getFullYear().toString();
	return result;
}

/**
 * Refreshes all timer values
 */
function refreshTimerValues():void {
	const timers = document.querySelectorAll<HTMLSpanElement>('[data-timerid]');
	timers.forEach(node => {
		node.innerText = renderTimerValue(node.dataset["timerid"] || "");
	})
}

/**
 * Format a duration
 *
 * @param millis
 * @returns
 */
function formatDuration(millis: number, forceMinutes:boolean = false): string {
	const h_ms = 3600 * 1000;
	const m_ms = 60 * 1000;
	const h = Math.floor(millis / h_ms);
	const m = Math.floor((millis - h * h_ms) / m_ms);
	const s = Math.floor((millis - h * h_ms - m * m_ms) / 1000);
	let res = toDigits(s);
	if(m > 0 || h > 0 || forceMinutes) res = toDigits(m) + ":" + res;
	if(h > 0) res = toDigits(h) + ":" + res;
	return res;
}

/**
 * Formats a date
 *
 * @param date
 * @param addTime
 * @returns
 */
function formatDate(date:Date, addTime:boolean = true, noDate:boolean = false):string {
	let res = "";
	if(!noDate) {
		res = toDigits(date.getDate())+ "/"
			+ toDigits(date.getMonth() + 1) + "/"
			+ date.getFullYear()
	}
	if(addTime) {
		if(!noDate) res  += " "
		res += toDigits(date.getHours()) + ":"
			+ toDigits(date.getMinutes())+ ":"
			+ toDigits(date.getSeconds());
	}
	return res;
}

/**
 * Adds digits to a number so it's at least "digits" long
 * @param num
 * @param digits
 * @returns
 */
function toDigits(num:number, digits = 2):string {
	let res = num.toString();
	while(res.length < digits) res = "0"+res;
	return res;
}

/**
 * Makes the label scroll horizontally
 */
function setScrollSpeed(attempts = 0) {
	if(!parameters) return;
	if(scrollables.length === 0) return;
	scrollables.forEach(node=>{
		const parent = node.parentElement;
		if(!parent) return;

		const speed = parseFloat(node.getAttribute("speed") || "") || 1;
		const bounds = node.getBoundingClientRect();
		if(bounds.width === 0) {
			//If bounds are empty, it's probably because an image isn't
			//completely rendered yet. This function is called on image
			//loading complete, but the reflow might take a few frames
			//before being done

			//if tried more than 100 times, give up to avoid looping for nothing
			if(attempts > 100) return;
			//Try again
			window.setTimeout(()=>setScrollSpeed(++attempts), 60);
		}else{
			const phType:LabelItemPlaceholder["type"] = parameters!.mode == "placeholder"? placeholders[parameters!.placeholder]!.type : "string";
			const ratio = phType == "image"? .5 : 20/parameters!.fontSize;
			const duration = bounds.width/30 * ratio;
			node.style.animationDuration = (duration/speed)+"s";
		}
	});
}

createConnectionTunnel();
requestInitialInfo();




window.setInterval(()=>{
	if(mustRefreshRegularly) refreshTimerValues();
}, 1000);

/*
onMessage({"origin":"twitchat","type":"LABEL_OVERLAY_PLACEHOLDERS","id":"9f9d0eff-04cc-4c9e-8f47-6cb4773a6d31","data":
	{
		"FOLLOWER_NAME":{
			"value":"AmazingTwitchUserName",
			"placeholder":{
				"tag":"FOLLOWER_NAME",
				"type":"string",
			},
		},
		"FOLLOWER_AVATAR":{
			"value":"https://static-cdn.jtvnw.net/jtv_user_pictures/06e9055c-7225-4bef-9949-2e0079a2dd9d-profile_image-300x300.png",
			"placeholder":{
				"tag":"FOLLOWER_AVATAR",
				"type":"image",
			}
		}
	}
});

onMessage({
    "origin": "twitchat",
    "type": "LABEL_OVERLAY_PARAMS",
    "id": "cb1cb8a0-7712-46e6-a2ef-5a3798288d2a",
    "data": {
        "id": "0e83c6a3-80f6-4656-99b3-167e849404a0",
        "data": {
            "id": "0e83c6a3-80f6-4656-99b3-167e849404a0",
            "enabled": true,
            "title": "last follow",
            "html": "<marquee scrollamount=\"3\">{FOLLOWER_NAME}</marquee>",
            "css": "",
            "placeholder": "FOLLOWER_NAME",
            "mode": "placeholder",
            "fontFamily": "Arial Rounded MT",
            "fontSize": 20,
            "backgroundColor": "#f0a9fe",
            "scrollContent": true,
            "backgroundEnabled": true,
            "fontColor": "#7f1494"
        }
    }
});
//*/
