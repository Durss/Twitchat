/**
 * This is a super light overlay only made to play SFXR sounds.
 * It's not using Vue, only vanilla JS
 */

import OBSWebSocket from 'obs-websocket-js';
import SFXRUtils from './utils/SFXRUtils';
import type { TwitchatEventMap } from '@/events/TwitchatEvent';
import StreamdeckSocket, { StreamdeckSocketEvent } from './utils/StreamdeckSocket';
import Utils from './utils/Utils';


const urlParams = new URLSearchParams(document.location.search);
let connected = false;
let messageIdsDone:{[key:string]:boolean} = {};
let broadcastChannelTunnel!:BroadcastChannel;
let reconnectTimeout = -1;
let obsSocket!:OBSWebSocket;

type IEnvelope = {
    [K in keyof TwitchatEventMap]: {
        origin: "twitchat";
        id: string;
        type: K;
        data: TwitchatEventMap[K];
    }
}[keyof TwitchatEventMap];

/**
 * Connects and automatically reconnects to OBS websocket
 */
async function connectToOBS():Promise<void> {
	if(!obsSocket) {
		obsSocket = new OBSWebSocket();
		obsSocket.addListener("ConnectionClosed", ()=> {
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
	connectToStreamDeck()
}

function connectToStreamDeck():void {
	StreamdeckSocket.instance.addEventListener(StreamdeckSocketEvent.MESSAGE, (e:StreamdeckSocketEvent) => {
		if(e.data) {
			const event = {
				id: Utils.getUUID(),
				origin: "twitchat",
				type: e.data.action,
				data: e.data.data
			} as IEnvelope;
			onMessage(event);
		}
	});
}


/**
 * Called when connection with Twitchat is established
 */
function requestInitialInfo():void {
}

/**
 * Called when receiving an event from either Obs-WS or BroadcastChannel
 * @param message
 */
function onMessage(message:IEnvelope):void {
	if(message.id){
		//Dedupe events in case they come from both OBS and BroadcastChannel
		if(messageIdsDone[message.id] === true) return;
		messageIdsDone[message.id] = true;
	}

	if(message.type == "ON_TWITCHAT_READY" || message.type == "ON_OBS_WEBSOCKET_CONNECTED") {
		if(connected) return;
		requestInitialInfo();
		connected = true;
	}else
	if(message.type == "SET_PLAY_SFXR" && message.data?.params) {
		SFXRUtils.playSFXRFromString(message.data.params, message.data.volume || 1, false);
	}

}

createConnectionTunnel();
requestInitialInfo();