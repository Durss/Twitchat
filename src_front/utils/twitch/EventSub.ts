import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "../Utils";
import TwitchUtils from "./TwitchUtils";

/**
* Created : 02/12/2022 
*/
export default class EventSub {

	private static _instance:EventSub;
	private socket!:WebSocket;
	private reconnectTimeout!:number;
	private keepalive_timeout_seconds!:number;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():EventSub {
		if(!EventSub._instance) {
			EventSub._instance = new EventSub();
		}
		return EventSub._instance;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/

	public connect():void {
		this.socket = new WebSocket("wss://eventsub-beta.wss.twitch.tv/ws");
		const myUID = StoreProxy.auth.twitch.user.id;

		this.socket.onopen = async () => {

		};
		
		this.socket.onmessage = (event:unknown) => {
			const e = event as {data:string};
			const message = JSON.parse(e.data);
			switch(message.metadata.message_type) {
				case "session_welcome": {
					this.keepalive_timeout_seconds = message.payload.session.keepalive_timeout_seconds;
					TwitchUtils.eventsubSubscribe(myUID, myUID, message.payload.session.id, "channel.shield_mode.begin", "beta");
					TwitchUtils.eventsubSubscribe(myUID, myUID, message.payload.session.id, "channel.shield_mode.end", "beta");
					break;
				}

				case "session_keepalive": {
					clearTimeout(this.reconnectTimeout);
					this.reconnectTimeout = setTimeout(()=>{
						this.connect();
					}, (this.keepalive_timeout_seconds+2) * 1000);
					break;
				}

				case "notification": {
					this.parseEvent(message.metadata.subscription_type, message.payload);
					break;
				}
				
				default: {
					console.warn(`Unknown eventsub message type: ${message.metadata.message_type}`);
				  }
			}
		};
		
		this.socket.onclose = (event) => {
			// if (event.wasClean) {
			// 	console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
			// } else {
			// 	console.log('[close] Connection died');
			// }
			clearTimeout(this.reconnectTimeout)
			this.reconnectTimeout = setTimeout(()=>{
				this.connect();
			}, 1000);
		};
		
		this.socket.onerror = (error) => {
			console.log(error);
		};
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private parseEvent(topic:string, payload:any):void {

		switch(topic) {
			case "channel.shield_mode.end":
			case "channel.shield_mode.begin": {
				const enabled = topic === "channel.shield_mode.begin";
				
				if(StoreProxy.stream.shieldModeEnabled == enabled) return;

				const message = StoreProxy.i18n.t("global.moderation_action.shield_"+(enabled?"on":"off"), {MODERATOR:payload.event.moderator_user_name});

				const m:TwitchatDataTypes.MessageShieldMode = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					channel_id:payload.event.broadcaster_user_id,
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					user:StoreProxy.users.getUserFrom("twitch", payload.event.broadcaster_user_id, payload.event.moderator_user_id, payload.event.moderator_user_login, payload.event.moderator_user_name),
					noticeId:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE,
					message,
					enabled,
				};
				StoreProxy.chat.addMessage(m);
				StoreProxy.stream.shieldModeEnabled = enabled;

				//Sync emergency mod if requested
				if(StoreProxy.emergency.params.autoEnableOnShieldmode) {
					StoreProxy.emergency.setEmergencyMode( enabled );
				}
				break;
			}

		}
	}
}