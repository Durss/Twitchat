import StoreProxy from "@/store/StoreProxy";
import type { JsonObject } from "type-fest";
import { EventDispatcher } from "../events/EventDispatcher";
import TwitchatEvent, { type TwitchatEventMap } from "../events/TwitchatEvent";
import OBSWebSocket from "./OBSWebSocket";
import StreamdeckSocket, { StreamdeckSocketEvent } from "./StreamdeckSocket";
import Utils from "./Utils";
import VoiceController from "./voice/VoiceController";

/**
* Created : 14/04/2022
*/
export default class PublicAPI extends EventDispatcher {

	private static _instance:PublicAPI;

	private _bc!:BroadcastChannel;
	private _isMainApp:boolean = false;
	private _idsDone = new Set<string>();

	constructor() {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():PublicAPI {
		if(!PublicAPI._instance) {
			PublicAPI._instance = new PublicAPI();
			//@ts-ignore
			// window.broadcast = (a, b, c) => PublicAPI._instance.broadcast(a,b,c);
		}
		return PublicAPI._instance;
	}



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Initializes the public API
	 */
	public async initialize(isMainApp:boolean):Promise<void> {
		this._isMainApp = isMainApp;

		if(typeof BroadcastChannel != "undefined") {
			this._bc = new BroadcastChannel("twitchat");

			//If receiving data from another browser tab, broadcast it
			this._bc.onmessage = (e: MessageEvent<IEnvelope>):void => {
				this.onMessage(e.data);
			}
		}

		this.listenStreamdeck(isMainApp);
		this.listenOBS(isMainApp);

		//Broadcast twitchat ready state
		if(isMainApp) this.broadcast("ON_TWITCHAT_READY", undefined, false);
	}

	/**
	 * Broadcast a message
	 *
	 * @param type
	 * @param data
	 */
	public async broadcast<Event extends keyof TwitchatEventMap>(
		type: Event,
		...args: TwitchatEventMap[Event] extends undefined
			? [broadcastToSelf?: boolean, onlyLocal?: boolean]
			: [data: TwitchatEventMap[Event], broadcastToSelf?: boolean, onlyLocal?: boolean]
	): Promise<void> {

		const [data, broadcastToSelf = false, onlyLocal = false] =
			(args.length && typeof args[0] === "object" || args[0] === undefined)
				? [args[0] as TwitchatEventMap[Event], args[1] ?? false, args[2] ?? false]
				: [undefined, args[0] as boolean, args[1] as boolean];

		// --- rest of your original implementation ---
		const eventId = Utils.getUUID();
		if(!broadcastToSelf) {
			this._idsDone.add(eventId);//Avoid receiving self-broadcast events
			this.limitCacheSize();
		}

		let dataClone: JsonObject | undefined = undefined;
		if(data) dataClone = JSON.parse(JSON.stringify(data));

		try {
			if(this._bc) {
				this._bc.postMessage({ type, id: eventId, data: dataClone });
			}
		} catch(error) {
			console.error(error);
		}

		if(onlyLocal) {
			// @ts-ignore
			if(broadcastToSelf) this.dispatchEvent(new TwitchatEvent(type, dataClone));
		} else {
			if(OBSWebSocket.instance.connected.value) {
				// @ts-ignore
				OBSWebSocket.instance.broadcast(type, eventId, dataClone);
			}
			if(StreamdeckSocket.instance.connected.value) {
				// @ts-ignore
				StreamdeckSocket.instance.broadcast(type, eventId, data);
			}
		}
		switch(type) {
			case "ON_VOICE_CONTROL_STATE_CHANGE":
			case "ON_TIMER_LIST":
			case "ON_COUNTER_UPDATE":
			case "ON_CHAT_COLUMNS_COUNT":
			case "ON_EMERGENCY_MODE_CHANGED":
				PublicAPI.instance.broadcastGlobalStates();
				break;
		}
	}

	public broadcastGlobalStates():void {
		if(this._isMainApp == false) return;
		const lastAutomod = StoreProxy.chat.pendingAutomodMessages[ StoreProxy.chat.pendingAutomodMessages.length -1 ];
		const states:TwitchatEventMap["ON_GLOBAL_STATES"] = {
			activeCountdowns: StoreProxy.timers.timerList.filter(v=>v.startAt_ms && v.type == "countdown").map(({overlayParams, placeholderKey, ...rest}) => rest),
			activeTimers: StoreProxy.timers.timerList.filter(v=>v.startAt_ms && v.type == "timer").map(({overlayParams, placeholderKey, ...rest}) => rest),
			lastRaiderName: StoreProxy.stream.lastRaider?.login,
			emergencyMode: StoreProxy.emergency.emergencyStarted,
			censorshipEnabled: StoreProxy.params.appearance.censorDeletedMessages.value as boolean,
			counterValues: StoreProxy.counters.counterList.filter(v=>v.perUser === false).map(v=>({id:v.id, value:v.value})),
			hasActiveChatAlert: StoreProxy.main.chatAlert != null,
			moderationToolsVisible: StoreProxy.params.features.showModTools.value as boolean,
			ttsSpeaking: StoreProxy.tts.speaking,
			voiceControlEnabled: StoreProxy.voice.voiceBotConfigured && VoiceController.instance.started.value,
			showViewerCount: StoreProxy.params.appearance.showViewersCount.value as boolean,
			messageMergeEnabled: StoreProxy.params.features.mergeConsecutive.value as boolean,
			isMessageHighlighted: StoreProxy.chat.highlightedMessageId != null,
			hasActivePoll: StoreProxy.poll.data != null,
			hasActivePrediction: StoreProxy.prediction.data != null,
			hasActiveBingo: StoreProxy.bingo.data != null,
			hasActiveRaffle: StoreProxy.raffle.raffleList.filter(v=>!v.ghost).length > 0,
			hasActiveRaffleWithEntries: StoreProxy.raffle.raffleList.filter(v=>!v.ghost && v.entries.filter(w=>!v.winners || v.winners?.findIndex(x => x.id === w.id) === -1).length > 0).length > 0,
			chatColConfs: StoreProxy.params.chatColumnStates,
			animatedTextList:StoreProxy.animatedText.animatedTextList.map(v=> ({id:v.id, enabled:v.enabled, name:v.title})),
			bingoGridList:StoreProxy.bingoGrid.gridList.map(v=> ({id:v.id, enabled:v.enabled, name:v.title})),
			pendingAutomodMessage: !lastAutomod? null : {
					channel: lastAutomod.channel_id,
					message: lastAutomod.message,
					user: {
						id: lastAutomod.user.id,
						login: lastAutomod.user.login,
						displayName: lastAutomod.user.displayName,
					}
				},
		}
		PublicAPI.instance.broadcast("ON_GLOBAL_STATES", states);
	}

	public override addEventListener<Event extends keyof TwitchatEventMap>(typeStr:Event, listenerFunc:(e:TwitchatEvent<Event>)=>void):void {
		// @ts-ignore
		super.addEventListener(typeStr, listenerFunc);
		// This is a fallback to avoid breaking existing implementations before massive refactor.
		// For more clarity I renamed "CUSTOM_CHAT_MESSAGE" envet to "SET_SEND_CUSTOM_CHAT_MESSAGE".
		// But as there are multiple tools using that event, we register also register to the old
		// event name when requesting the new one.
		if(typeStr == "SET_SEND_CUSTOM_CHAT_MESSAGE") {
			// @ts-ignore
			super.addEventListener("ON_CUSTOM_CHAT_MESSAGE", listenerFunc);
		}
	}

	public override removeEventListener<Event extends keyof TwitchatEventMap>(typeStr:Event, listenerFunc:(e:TwitchatEvent<Event>)=>void):void {
		// @ts-ignore
		super.removeEventListener(typeStr, listenerFunc);
		if(typeStr == "SET_SEND_CUSTOM_CHAT_MESSAGE") {
			// @ts-ignore
			super.removeEventListener("ON_CUSTOM_CHAT_MESSAGE", listenerFunc);
		}
	}




	/*******************
	* PRIVATE METHODS *
	*******************/
	private listenOBS(isMainApp:boolean):Promise<void> {
		return new Promise((resolve, _reject):void => {
			//OBS api not ready yet, wait for it
			if(!OBSWebSocket.instance.connected.value) {
				const connectHandler = () => {
					OBSWebSocket.instance.removeEventListener("ON_OBS_WEBSOCKET_CONNECTED", connectHandler);
					if(isMainApp) this.broadcast("ON_TWITCHAT_READY", undefined, false);
					resolve();
				};
				OBSWebSocket.instance.addEventListener("ON_OBS_WEBSOCKET_CONNECTED", connectHandler);
			}else{
				resolve();
			}
			
			OBSWebSocket.instance.addEventListener("ON_OBS_WEBSOCKET_CONNECTED", (e) => this.broadcast("ON_OBS_WEBSOCKET_CONNECTED", undefined, false));
			OBSWebSocket.instance.addEventListener("ON_OBS_WEBSOCKET_DISCONNECTED", (e) => this.broadcast("ON_OBS_WEBSOCKET_DISCONNECTED", undefined, false));
			OBSWebSocket.instance.socket.on("CustomEvent", (eventData:JsonObject) => {
				const eventDataTyped = eventData as unknown as IEnvelope;
				this.onMessage(eventDataTyped, true);
			});
		});
	}

	private listenStreamdeck(isMainApp:boolean):void {
		StreamdeckSocket.instance.addEventListener(StreamdeckSocketEvent.MESSAGE, (e:StreamdeckSocketEvent<keyof TwitchatEventMap>) => {
			if(e.data) {
				const event:IEnvelope = {
					id: Utils.getUUID(),
					origin: "twitchat",
					type: e.data.action,
					data: e.data.data
				}
				this.onMessage(event, true);
			}
		});
	}

	/**
	 * Called when receiving a message either from OBS os BroadcastChannel
	 * @param event
	 * @param checkOrigin
	 * @returns
	 */
	private onMessage(event:IEnvelope, checkOrigin:boolean = false):void {
		if(checkOrigin && event.origin != "twitchat") return;
		if(event.type == undefined) return;

		if(event.id){
			if(this._idsDone.has(event.id)) return;
			this._idsDone.add(event.id);
			this.limitCacheSize();
		}
		this.dispatchEvent(new TwitchatEvent(event.type, event.data));
	}

	private limitCacheSize():void {
		if (this._idsDone.size > 1000) {
			const first = this._idsDone.values().next().value;
			if(first) this._idsDone.delete(first);
		}
	}

}

export class PublicAPIEvent<Event extends keyof TwitchatEventMap> {
	public readonly type: Event;
	public readonly data: TwitchatEventMap[Event];

	constructor(type:Event, data:TwitchatEventMap[Event]) {
		this.type = type;
		this.data = data;
	}
}

interface IEnvelope<EventName extends keyof TwitchatEventMap = keyof TwitchatEventMap> {
	origin:"twitchat";
	id:string;
	type:EventName;
	data?:EventName extends keyof TwitchatEventMap ? TwitchatEventMap[EventName] : unknown;
}