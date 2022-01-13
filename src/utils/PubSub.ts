import store from "@/store";
import IRCClient from "./IRCClient";
import { TwitchTypes } from "./TwitchUtils";

/**
* Created : 13/01/2022 
*/
export default class PubSub {

	private static _instance:PubSub;
	private socket!:WebSocket;
	private pingInterval!:number;
	
	constructor() {
	
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
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public connect():void {
		this.socket = new WebSocket("wss://pubsub-edge.twitch.tv");

		this.socket.onopen = () => {
			//It's required to ping the server at least every 5min
			//to keep the connection alive
			clearInterval(this.pingInterval);
			this.pingInterval = setInterval(() => {
				this.ping();
			}, 60000*2.5);
			
			this.subscribe([
				"channel-points-channel-v1."+store.state.user.user_id,
				"chat_moderator_actions."+store.state.user.user_id+"."+store.state.user.user_id,
				"automod-queue."+store.state.user.user_id+"."+store.state.user.user_id,
			]);
		};
		
		this.socket.onmessage = (event:unknown) => {
			// alert(`[message] Data received from server: ${event.data}`);
			const e = event as {data:string};
			const message = JSON.parse(e.data) as {type:string, data:{message:string, topic:string}};
			if(message.type != "PONG" && message.data) {
				const data = JSON.parse(message.data.message);
				this.parseEvent(data);
			}else{
				console.log(event);
			}
		};
		
		this.socket.onclose = (event) => {
			clearInterval(this.pingInterval);
			if (event.wasClean) {
				// alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
			} else {
				// alert('[close] Connection died');
			}
		};
		
		this.socket.onerror = (error) => {
			console.log(error);
		};

	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private ping():void {
		this.send({
			"type": "PING"
		});
	}

	private send(json:unknown):void {
		this.socket.send(JSON.stringify(json));
	}

	private nonce(length:number = 18):string {
		let text = "";
		const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for(let i = 0; i < length; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	private subscribe(topics:string[]):void {
		const access_token = (store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token;
		const json = {
			"type": "LISTEN",
			"nonce": this.nonce(),
			"data": {
				"topics": topics,
				"auth_token": access_token
			}
		}
		this.send(json);
	}

	private parseEvent(event:{type:string, data:unknown}):void {
		if(event.type == "automod_caught_message") {
			const localObj = event.data as  PubSubTypes.AutomodData;
			if(localObj.status == "PENDING") {
				const tags = {
					"username":localObj.message.sender.login,
					"color": localObj.message.sender.chat_color,
					"display-name": localObj.message.sender.display_name,
					"id": localObj.message.id,
					"user-id": localObj.message.sender.user_id,
					"tmi-sent-ts": new Date(localObj.message.sent_at).getTime().toString(),
					"badge-info": undefined,
					"badge-info-raw": undefined,
					"badges": undefined,
					"badges-raw": undefined,
					"emotes": undefined,
					"emotes-raw": undefined,
					"first-msg": false,
					"message-type": "chat" as "chat" | "action" | "whisper" | undefined,
					"mod": false,
					"room-id": "29961813",
					"subscriber": false,
					"turbo": false,
					"user-type": undefined,
				}
				let textMessage = "";
				for (let i = 0; i < localObj.message.content.fragments.length; i++) {
					const el = localObj.message.content.fragments[i];
					if(el.automod != undefined) textMessage += "<mark>"
					//Avoid XSS attack
					if(el.emoticon) {
						textMessage += "<img src='https://static-cdn.jtvnw.net/emoticons/v2/"+el.emoticon.emoticonID+"/default/light/1.0' data-tooltip='"+el.text+"'>";
					}else{
						textMessage += el.text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
					}
					if(el.automod != undefined) textMessage += "</mark>"
				}
				
				IRCClient.instance.addMessage(textMessage, tags, false, localObj);
			}



		}else if(event.type == "reward-redeemed") {
			//Manage rewards
			if(store.state.params.filters.showRewards.value) {
				const localObj = event.data as  PubSubTypes.RewardData;
				localObj.redemption.reward.title
				let message = localObj.redemption.user.display_name;
				message += " redeemed the reward <strong>"+localObj.redemption.reward.title+"</strong>";
				message += " (x"+localObj.redemption.reward.cost+" points)";
				IRCClient.instance.sendNotice("usage_clear", message);
			}


			
		}else if(event.type == "moderation_action") {
			//Manage moderation actions
			const localObj = event.data as PubSubTypes.ModerationData
			switch(localObj.moderation_action) {
				case "clear": 
					IRCClient.instance.sendNotice("usage_clear", "Chat clear by "+localObj.created_by);
					break;
				case "ban": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown-";
					IRCClient.instance.sendNotice("ban_success", "User "+user+" has been banned by "+localObj.created_by);
					break;
				}
				case "unban": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown-";
					IRCClient.instance.sendNotice("ban_success", "User "+user+" has been unbanned by "+localObj.created_by);
					break;
				}
				default:
					console.log("Unhandled event type: "+localObj.moderation_action);
					break;
			}
		}
	}
}

export namespace PubSubTypes {
	export interface AutomodData {
        content_classification: {
			category: string;
			level: number;
		};
        message: {
			content: {
				text: string;
				fragments: {
					text: string;
					emoticon: {
						emoticonID: string,
						emoticonSetID: string
					},
					automod: {
						topics: {[key:string]: string},
					};
				}[];
			};
			id: string;
			sender: {
				user_id: string;
				login: string;
				display_name: string;
				chat_color: string;
			};
			sent_at: string;
		};
        reason_code: string;
        resolver_id: string;
        resolver_login: string;
        status: string;
	}
	
	export interface ModerationData {
		type: string;
		moderation_action: string;
		args?: string[];
		created_by: string;
		created_by_user_id: string;
		created_at: string;
		msg_id: string;
		target_user_id: string;
		target_user_login: string;
		from_automod: boolean;
	}

	export interface RewardData {
        timestamp: string;
        redemption: {
			id: string;
			user: {
				id: string;
				login: string;
				display_name: string;
			};
			channel_id: string;
			redeemed_at: string;
			reward: {
				id: string;
				channel_id: string;
				title: string;
				prompt: string;
				cost: number;
				is_user_input_required: boolean;
				is_sub_only: boolean;
				image: Image;
				default_image: DefaultImage;
				background_color: string;
				is_enabled: boolean;
				is_paused: boolean;
				is_in_stock: boolean;
				max_per_stream: MaxPerStream;
				should_redemptions_skip_request_queue: boolean;
				template_id?: unknown;
				updated_for_indicator_at: string;
				max_per_user_per_stream: MaxPerUserPerStream;
				global_cooldown: GlobalCooldown;
				redemptions_redeemed_current_stream?: unknown;
				cooldown_expires_at?: unknown;
			};
			status: string;
		};
	}

    interface Image {
        url_1x: string;
        url_2x: string;
        url_4x: string;
    }

    interface DefaultImage {
        url_1x: string;
        url_2x: string;
        url_4x: string;
    }

    interface MaxPerStream {
        is_enabled: boolean;
        max_per_stream: number;
    }

    interface MaxPerUserPerStream {
        is_enabled: boolean;
        max_per_user_per_stream: number;
    }

    interface GlobalCooldown {
        is_enabled: boolean;
        global_cooldown_seconds: number;
    }
}