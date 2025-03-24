import Database from '@/store/Database';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import * as Sentry from "@sentry/vue";
import { EventDispatcher } from "../../events/EventDispatcher";
import ApiHelper from '../ApiHelper';
import SetIntervalWorker from '../SetIntervalWorker';
import Utils from "../Utils";
import type { PubSubDataTypes } from './PubSubDataTypes';

/**
* Created : 13/01/2022
*/
export default class PubSub extends EventDispatcher {

	private static _instance:PubSub;
	private socket!:WebSocket;
	private pingInterval:string = "";
	private reconnectTimeout:number = -1;
	private hypeTrainApproachingTimer!:number;
	private hypeTrainProgressTimer!:number;
	private history:{date:string, message:PubSubDataTypes.SocketMessage}[] = [];

	constructor() {
		super();
	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():PubSub {
		if(!PubSub._instance) {
			PubSub._instance = new PubSub();
		}
		return PubSub._instance;
	}

	public get eventsHistory() { return this.history; }



	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
	}

	/**
	 * Connect to pubsub
	 */
	public connect():void {
		//Cleanup old socket if any exist
		if(this.socket) this.disconnect();

		this.socket = new WebSocket("wss://pubsub-edge.twitch.tv");

		this.socket.onopen = async () => {
			//It's required to ping the server at least every 5min
			//to keep the connection alive
			if(this.pingInterval) SetIntervalWorker.instance.delete(this.pingInterval);
			this.pingInterval = SetIntervalWorker.instance.create(()=>()=>{
				this.ping();
			}, 10000);

			const myUID = StoreProxy.auth.twitch.user.id;
			const subscriptions = [
				// "leaderboard-events-v1.bits-usage-by-channel-v1-"+myUID+"-WEEK",
				// "leaderboard-events-v1.sub-gifts-sent-"+myUID+"-WEEK",
				"video-playback-by-id."+myUID,//Get viewer count
				// "community-boost-events-v1."+myUID,//Boost after a boost train complete
				// "chatrooms-user-v1."+myUID,//Host events (RIP)
				"pinned-chat-updates-v1."+myUID,//when a message is un/pinned
				// "predictions-channel-v1."+myUID,
				// "polls."+myUID,
				// "hype-train-events-v2."+myUID,
				// "hype-train-events-v2.37804856",//Testing golden kappa data
				// "hype-train-events-v2.43809079",//Testing golden kappa data
				// "hype-train-events-v2.153390618",//Testing golden kappa data
				// "hype-train-events-v2.402890635",//Testing golden kappa data
				// "hype-train-events-v2.115060112",//Testing golden kappa data
				// "hype-train-events-v2.53964156",//Testing golden kappa data
				// "hype-train-events-v2.117482317",//Testing golden kappa data
				// "raid."+myUID,
				// "community-moments-channel-v1."+myUID,
				// "ads."+myUID,//???
				// "ad-property-refresh."+myUID,//???
				// "stream-chat-room-v1."+myUID,//???
				// "sponsorships-v1."+myUID,//???
				// "community-points-channel-v1."+myUID,
				//"user-preferences-update-v1."+myUID,//not allowed
				// "onsite-notifications."+myUID,//not allowed
				// "activity-feed-broadcaster-v2."+myUID,//not allowed
				// "user-unban-requests."+myUID+"."+myUID,//not allowed
				// "user-properties-update."+myUID,//not allowed
				// "user-drop-events."+myUID,
				// "community-points-user-v1."+myUID,
				// "presence."+myUID,
				// "stream-change-v1."+myUID,
			];
			this.subscribe(subscriptions);
		};

		this.socket.onmessage = (event:unknown) => {
			// alert(`[message] Data received from server: ${event.data}`);
			const e = event as {data:string};
			const message = JSON.parse(e.data) as PubSubDataTypes.SocketMessage;
			if(message.type != "PONG" && message.data && message.data.message) {
				try {
					const data = JSON.parse(message.data.message);
					if(StoreProxy.main.devmode) {
						//Ignore viewers count to avoid massive logs
						if(!/video-playback-by-id\./i.test(message.data.topic)) {
							this.history.push({date:new Date().toLocaleDateString() +" "+ new Date().toLocaleTimeString(), message});
						}
					}
					this.parseEvent(data, message.data.topic);
				}catch(error) {
					Sentry.captureException("Pubsub sent an invalid message data format:", {originalException:error as Error, attachments:[{filename:"pubsub-event"+message.type, data:JSON.stringify(message.data)}]});
				}
			// }else{
			// 	console.log(event);
			}
		};

		this.socket.onclose = (event) => {
			if(this.pingInterval) SetIntervalWorker.instance.delete(this.pingInterval);
			clearTimeout(this.reconnectTimeout)
			this.reconnectTimeout = window.setTimeout(()=>{
				this.connect();
			}, 1000);
		};

		this.socket.onerror = (error) => {
			console.log(error);
		};
	}

	/**
	 * Simulate a community boost
	 */
	public async simulateCommunityBoost():Promise<void> {
		this.parseEvent(PubsubJSON.BoostStarting);
		await Utils.promisedTimeout(5000);
		this.parseEvent(PubsubJSON.BoostProgress1);
		await Utils.promisedTimeout(5000);
		this.parseEvent(PubsubJSON.BoostProgress2);
		await Utils.promisedTimeout(5000);
		this.parseEvent(PubsubJSON.BoostComplete);
	}


	/*******************
	* PRIVATE METHODS *
	*******************/
	private ping():void {
		this.send({
			"type": "PING"
		});
	}

	/**
	 * Cleanup connexion
	 */
	private disconnect():void {
		this.socket.onopen = null;
		this.socket.onmessage = null;
		this.socket.onclose = null;
		this.socket.onerror = null;
		this.socket.close();
	}

	private send(json:unknown):void {
		this.socket.send(JSON.stringify(json));
	}

	private nonce(length = 18):string {
		let text = "";
		const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for(let i = 0; i < length; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	private subscribe(topics:string[]):void {
		const json = {
			"type": "LISTEN",
			"nonce": this.nonce(),
			"data": {
				"topics": topics,
				"auth_token": StoreProxy.auth.twitch.access_token
			}
		}
		this.send(json);
	}

	private async parseEvent(data:{type:string, data?:unknown, raid?:PubSubDataTypes.RaidInfos}, topic?:string):Promise<void> {
		let channelId:string = "";
		if(topic) {
			channelId = topic.match(/(\.|-)[0-9]+/g)?.slice(-1)[0] ?? "";
			channelId = channelId.replace(/\.|-/g, "");
		}

		//Viewer count and stream start/stop events
		if(topic && /video-playback-by-id\.[0-9]+/.test(topic)) {
			const localObj = (data as unknown) as PubSubDataTypes.PlaybackInfo;
			if(localObj.type == "viewcount") {
				StoreProxy.labels.updateLabelValue("VIEWER_COUNT", localObj.viewers);
				StoreProxy.stream.setPlaybackState(channelId, localObj.viewers);
			}


		//Un/Pin message events
		}else if(data.type == "pin-message") {
			const localObj = (data.data as unknown) as PubSubDataTypes.PinMessage;
			this.pinMessageEvent(localObj, channelId);

		}else if(data.type == "update-message") {
			const localObj = (data.data as unknown) as PubSubDataTypes.PinUpdateMessage;
			this.updatePinnedMessageEvent(localObj, channelId);

		}else if(data.type == "unpin-message") {
			const localObj = (data.data as unknown) as PubSubDataTypes.UnpinMessage;
			this.unpinMessageEvent(localObj, channelId);

		}else if(data.type == "extension_message") {
			//Manage extension messages
			const mess = data.data as PubSubDataTypes.ExtensionMessage;
			if(mess.content) {
				const badges:{[key:string]:string} = {};
				for (let i = 0; i < mess.sender.badges.length; i++) {
					const b = mess.sender.badges[i];
					badges[b.id] = b.version;
				}

				const user = StoreProxy.users.getUserFrom("twitch", channelId, undefined, mess.sender.display_name.replace(/\s/g, ""), mess.sender.display_name);
				user.color = mess.sender.chat_color;
				const chunks = TwitchUtils.parseMessageToChunks(mess.content.text, undefined, true);
				const m:TwitchatDataTypes.MessageChatData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					channel_id:channelId,
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					answers:[],
					user,
					bypassBotFilter:true,
					message:mess.content.text,
					message_chunks:chunks,
					message_html:TwitchUtils.messageChunksToHTML(chunks),
					message_size:0,
					is_short:false,
				};
				m.message_size = TwitchUtils.computeMessageSize(m.message_chunks);
				StoreProxy.chat.addMessage(m);
			}


		}else if(data.type == "community-boost-start" || data.type == "community-boost-progression" || data.type == "community-boost-end") {
			const currentBoost = StoreProxy.stream.communityBoostState
			const boost		= data.data as PubSubDataTypes.CommunityBoost;
			let goal		= boost.total_goal_target ?? currentBoost?.goal ?? 1;
			let progress	= boost.total_goal_progress ?? currentBoost?.progress ?? 0;
			if(boost.boost_orders) {
				progress	= boost.boost_orders[0].GoalProgress;
				goal		= boost.boost_orders[0].GoalTarget;
			}
			const m:TwitchatDataTypes.CommunityBoost = {
				channel_id:boost.channel_id,
				goal,
				progress,
			};
			StoreProxy.stream.setCommunityBoost(m);

			if(data.type == "community-boost-end") {
				window.setTimeout(()=> {
					//Automatically hide the boost after a few seconds
					StoreProxy.stream.setCommunityBoost(undefined);
				}, 15000);
				const m:TwitchatDataTypes.MessageCommunityBoostData = {
					id:Utils.getUUID(),
					channel_id:channelId,
					date:Date.now(),
					platform:"twitch",
					type:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_BOOST_COMPLETE,
					viewers:progress,
				};
				StoreProxy.chat.addMessage(m);
			}



		}
	}

	/**
	 * Called when a message is pinned
	 */
	private async pinMessageEvent(data:PubSubDataTypes.PinMessage, channel_id:string):Promise<void> {
		let message:TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageCheerData|undefined;
		let attempts = 10;

		do {
			message = StoreProxy.chat.messages.find(v=>v.id == data.message.id) as TwitchatDataTypes.MessageChatData|TwitchatDataTypes.MessageCheerData|undefined;
			if(!message) {
				//Message not found because probably not received on IRC yet.
				//Wait a little and try again
				attempts --;
				await Utils.promisedTimeout(200);
			}
		}while(!message && attempts > 0)

		if(message) {
			if(data.message.type == "CHEER") {
				//Cheer pins
				const cheer = message as TwitchatDataTypes.MessageCheerData;
				cheer.pinned = true;
				cheer.pinDuration_ms = (data.message.ends_at - data.message.starts_at) * 1000,
				cheer.pinLevel = {"ONE":0, "TWO":1, "THREE":2, "FOUR":3, "FIVE":4, "SIX":5, "SEVEN":6, "EIGHT":7, "NINE":8, "TEN":9}[data.message.metadata.level] || 0;
				//Update DB message with new data
				Database.instance.updateMessage(cheer);
				//Forces triggers to execute
				//[EDIT] don't, storeChat() delays cheers trigger exec by 1s to wait for this pin event
				// TriggerActionHandler.instance.execute(cheer);

			}else if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				//Simple pinned message
				const m:TwitchatDataTypes.MessagePinData = {
					id:"pin_"+data.message.id,
					date:Date.now(),
					platform:"twitch",
					type:"pinned",
					pinnedAt_ms:data.message.starts_at * 1000,
					updatedAt_ms:data.message.starts_at * 1000,
					unpinAt_ms:data.message.ends_at * 1000,
					chatMessage: message,
					moderator:StoreProxy.users.getUserFrom("twitch", channel_id, data.pinned_by.id, data.pinned_by.display_name.toLowerCase(), data.pinned_by.display_name),
					channel_id,
				};
				message.is_pinned = true;
				let timeoutRef = -1;
				if(data.message.ends_at*1000 > Date.now()) {
					//Schedule automatic unpin
					timeoutRef = window.setTimeout(()=> {
						this.unpinMessageEvent(m, channel_id);
					}, data.message.ends_at*1000 - Date.now());

					m.timeoutRef = timeoutRef;
				}
				StoreProxy.chat.addMessage(m);
			}
		}
	}

	/**
	 * Called when a pinned message param is updated
	 */
	private updatePinnedMessageEvent(data:PubSubDataTypes.PinUpdateMessage, channel_id:string):void {
		const message = StoreProxy.chat.messages.find(v=>v.id == "pin_"+data.id) as TwitchatDataTypes.MessagePinData|undefined;
		if(message) {
			if(data.ends_at) {
				message.unpinAt_ms = data.ends_at * 1000;
			}else{
				message.unpinAt_ms = -1;
			}
			message.updatedAt_ms = data.updated_at * 1000;
			clearTimeout(message.timeoutRef);
			if(message.unpinAt_ms > Date.now()) {
				//Schedule automatic unpin
				message.timeoutRef = window.setTimeout(()=> {
					if(message!.chatMessage){
						this.unpinMessageEvent(data, channel_id);
					}
				}, message.unpinAt_ms - Date.now());
			}
		}
	}

	/**
	 * Called when a message is unpinned
	 */
	private unpinMessageEvent(data:PubSubDataTypes.UnpinMessage|PubSubDataTypes.PinUpdateMessage|TwitchatDataTypes.MessagePinData, channel_id:string):void {
		const pinMessage = StoreProxy.chat.messages.find(v=>v.id == "pin_"+data.id) as TwitchatDataTypes.MessagePinData|undefined;

		if(pinMessage) {
			pinMessage.chatMessage.is_pinned = false;
			let moderator:TwitchatDataTypes.TwitchatUser|undefined;
			if("unpinned_by" in data && Object.keys(data.unpinned_by).length > 0) {
				moderator = StoreProxy.users.getUserFrom("twitch", channel_id, data.unpinned_by.id, data.unpinned_by.display_name.toLowerCase(), data.unpinned_by.display_name)
			}
			const m:TwitchatDataTypes.MessageUnpinData = {
				id:Utils.getUUID(),
				date:Date.now(),
				platform:"twitch",
				type:TwitchatDataTypes.TwitchatMessageType.UNPINNED,
				chatMessage:pinMessage.chatMessage,
				moderator,
				channel_id,
			};
			console.log(data);
			console.log(pinMessage);
			clearTimeout(pinMessage.timeoutRef);
			StoreProxy.chat.addMessage(m);
		}
	}
}

namespace PubsubJSON {
	export const BoostStarting = {"type":"community-boost-start","data":{"channel_id":"29961813","boost_orders":[{"ID":"095321ce-5429-4109-929d-c5f8598c0a9f","State":"ORDER_STATE_DELIVERING","GoalProgress":0,"GoalTarget":1100}]}};
	export const BoostProgress1 = {"type":"community-boost-progression","data":{"channel_id":"29961813","boost_orders":[{"ID":"095321ce-5429-4109-929d-c5f8598c0a9f","State":"DELIVERING_ORDER","GoalProgress":150,"GoalTarget":1100}],"total_goal_progress":150, "total_goal_target":1100}};
	export const BoostProgress2 = {"type":"community-boost-progression","data":{"channel_id":"29961813","boost_orders":[{"ID":"095321ce-5429-4109-929d-c5f8598c0a9f","State":"DELIVERING_ORDER","GoalProgress":700,"GoalTarget":1100}],"total_goal_progress":700,"total_goal_target":1100}};
	export const BoostComplete = {"type":"community-boost-end","data":{"channel_id":"29961813","boost_orders":[{"ID":"095321ce-5429-4109-929d-c5f8598c0a9f","State":"ORDER_STATE_FULFILLED","GoalProgress":1104,"GoalTarget":1100}],"ending_reason":"ORDER_STATE_FULFILLED"}};
}
