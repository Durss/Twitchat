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
	private pingInterval!:number;
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
			//It's required to ping the server at least every 5min
			//to keep the connection alive
			// clearInterval(this.pingInterval);
			this.pingInterval = window.setInterval(() => {
				// this.ping();
			}, 60000*2.5);

			// const subscriptions = [
			// 	"channel-points-channel-v1."+myUID,
			// 	// "shield-mode."+myUID+"."+myUID,//Not available with that token :(
			// 	"chat_moderator_actions."+myUID+"."+myUID,
			// 	"automod-queue."+myUID+"."+myUID,
			// 	"user-moderation-notifications."+myUID+"."+myUID,
			// 	// "leaderboard-events-v1.bits-usage-by-channel-v1-"+uid+"-WEEK",
			// 	// "leaderboard-events-v1.sub-gifts-sent-"+uid+"-WEEK",
			// 	"raid."+myUID,
			// 	"predictions-channel-v1."+myUID,
			// 	"polls."+myUID,
			// 	"hype-train-events-v1."+myUID,
			// 	"following."+myUID,
			// 	"ads."+myUID,
			// 	"video-playback-by-id."+myUID,//Get viewer count
			// 	"community-boost-events-v1."+myUID,//Boost after a boost train complete
			// 	"ad-property-refresh."+myUID,
			// 	"whispers."+myUID,
			// 	"chatrooms-user-v1."+myUID,//TO or ban events
			// 	"stream-chat-room-v1."+myUID,//Host events; room settings; extension messages
			// 	"broadcast-settings-update."+myUID,//Stream info update
			// 	"shoutout."+myUID,//when receiving a shoutout
			// 	// "user-drop-events."+uid,
			// 	// "community-points-user-v1."+uid,
			// 	// "presence."+uid,
			// 	// "user-properties-update."+uid,
			// 	// "onsite-notifications."+uid,

			// 	"low-trust-users."+StoreProxy.auth.twitch.user.id+"."+StoreProxy.auth.twitch.user.id,
			// 	// "stream-change-v1."+StoreProxy.auth.twitch.user.id,
			// ];

			
			// if(Config.instance.debugChans.length > 0) {
			// 	//Subscribe to someone else's channel points
			// 	const users = await TwitchUtils.loadUserInfo(undefined, Config.instance.debugChans.filter(v=>v.platform=="twitch").map(v=>v.login));
			// 	const uids = users.map(v=> v.id);
			// 	for (let i = 0; i < uids.length; i++) {
			// 		const uid = uids[i];
			// 		if(uid == myUID) continue;
			// 		subscriptions.push("raid."+uid);
			// 		subscriptions.push("hype-train-events-v1."+uid);
			// 		subscriptions.push("video-playback-by-id."+uid);//Get viewers count
			// 		subscriptions.push("community-points-channel-v1."+uid);//Get channel points rewards
			// 		subscriptions.push("community-boost-events-v1."+uid);//Get channel points rewards
			// 		// subscriptions.push("channel-ad-poll-update-events."+uid);
			// 		subscriptions.push("predictions-channel-v1."+uid);//Get prediction events
			// 		subscriptions.push("polls."+uid);//Get prediction event//Get poll events
			// 		// subscriptions.push("pv-watch-party-events."+uid);
			// 		subscriptions.push("stream-chat-room-v1."+uid);//Host events
			// 		subscriptions.push("shoutout."+uid);//Host events
			// 		// subscriptions.push("stream-change-by-channel."+uid);
			// 		// subscriptions.push("radio-events-v1."+uid);
			// 		// subscriptions.push("channel-sub-gifts-v1."+uid);
					
			// 	}
			// }
			// this.subscribe(subscriptions);
		};
		
		this.socket.onmessage = (event:unknown) => {
			// alert(`[message] Data received from server: ${event.data}`);
			const e = event as {data:string};
			const message = JSON.parse(e.data);// as PubSubDataTypes.SocketMessage;
			// console.log(message);
			if(message.metadata.message_type == "session_welcome") {
				this.keepalive_timeout_seconds = message.payload.session.keepalive_timeout_seconds;
				TwitchUtils.eventsubSubscribe(myUID, myUID, message.payload.session.id, "channel.shield_mode.begin", "beta");
				TwitchUtils.eventsubSubscribe(myUID, myUID, message.payload.session.id, "channel.shield_mode.end", "beta");
			}else
			if(message.metadata.message_type == "session_keepalive") {
				clearTimeout(this.reconnectTimeout);
				this.reconnectTimeout = setTimeout(()=>{
					this.connect();
				}, (this.keepalive_timeout_seconds+2) * 1000);
			}else{
				this.parseEvent(message.metadata.subscription_type, message.payload);
			}
			// if(message.type != "PONG" && message.data) {
			// 	const data = JSON.parse(message.data.message);
			// }
		};
		
		this.socket.onclose = (event) => {
			clearInterval(this.pingInterval);
			if (event.wasClean) {
				// alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
			} else {
				// alert('[close] Connection died');
			}
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

				const m:TwitchatDataTypes.MessageShieldMode = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					channel_id:payload.event.broadcaster_user_id,
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					user:StoreProxy.users.getUserFrom("twitch", payload.event.broadcaster_user_id, payload.event.moderator_user_id, payload.event.moderator_user_login, payload.event.moderator_user_name),
					noticeId:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE,
					message: "Shield mode "+(enabled? "started" : "stoped")+" by "+payload.event.moderator_user_name,
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