/**
 * This is a super light overlay only made to display placeholders
 * It should import the bare minimum to be extra light as users
 * might abuse usage of such overlay.
 * It's not using Vue, only vanilla JS
 */

import OBSWebSocket from 'obs-websocket-js';
import {type TwitchatActionType} from './events/TwitchatEvent';

/**
 * Connects and automatically reconnects to OBS websocket
 */
async function connectToOBS():Promise<void> {
	const urlParams = new URLSearchParams(document.location.search);
	try {
		const ip = urlParams.get("obs_ip") || "127.0.0.1";
		const port = urlParams.get("obs_port") || "4455";
		const pass = urlParams.get("obs_pass") || "";
		const protocol = (ip == "127.0.0.1" || ip == "localhost") ? "ws://" : "wss://";
		const portValue = port && port?.length > 0 && port != "0"? ":"+port : "";
		await obsSocket.connect(protocol + ip + portValue, pass, {rpcVersion: 1});
		obsConnected = true;
	}catch(error) {
		console.log(error);
		clearTimeout(reconnectTimeout);
		reconnectTimeout = setTimeout(()=> {
			connectToOBS();
		}, 5000);
	}
}


let obsConnected = false;
let reconnectTimeout = -1;
const obsSocket = new OBSWebSocket();

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
obsSocket.on("CustomEvent", (e:{origin:"twitchat", type:TwitchatActionType, data:unknown}) => {
	if(e.type == undefined) return;
	if(e.origin != "twitchat") return;
	console.log(e.data);
	// this.dispatchEvent(new TwitchatEvent(e.type, e.data));
	// this.dispatchEvent(new TwitchatEvent("CustomEvent", e));
});

connectToOBS();