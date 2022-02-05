import store from "@/store";
import IRCClient, { IRCTagsExtended } from "./IRCClient";
import { IRCEventDataList } from "./IRCEvent";
import TwitchUtils, { TwitchTypes } from "./TwitchUtils";

/**
* Created : 13/01/2022 
*/
export default class PubSub {

	private static _instance:PubSub;
	private socket!:WebSocket;
	private pingInterval!:number;
	private reconnectTimeout!:number;
	
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
				"user-moderation-notifications."+store.state.user.user_id+"."+store.state.user.user_id,
				"raid."+store.state.user.user_id,
				"predictions-channel-v1."+store.state.user.user_id,
				"polls."+store.state.user.user_id,
				"hype-train-events-v1."+store.state.user.user_id,
				"following."+store.state.user.user_id,
				// "stream-change-v1."+store.state.user.user_id,
			]);
		};
		
		this.socket.onmessage = (event:unknown) => {
			// alert(`[message] Data received from server: ${event.data}`);
			const e = event as {data:string};
			const message = JSON.parse(e.data) as {type:string, data:{message:string, topic:string}};
			if(message.type != "PONG" && message.data) {
				const data = JSON.parse(message.data.message);
				this.parseEvent(message.type, data, message.data.topic);
			// }else{
			// 	console.log(event);
			}
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

	private parseEvent(messageType:string, data:{type:string, data:unknown}, topic:string):void {
		if(topic == "following."+store.state.user.user_id) {
			const localObj = (data as unknown) as PubSubTypes.Following;
			this.followingEvent(localObj);


			
		}else if(data.type == "automod_caught_message") {
			const localObj = data.data as  PubSubTypes.AutomodData;
			this.automodEvent(localObj);


			
		}else if(data.type == "reward-redeemed") {
			//Manage rewards
			if(store.state.params.filters.showRewards.value) {
				const localObj = data.data as  PubSubTypes.RewardData;
				this.rewardEvent(localObj);
			}


			
		}else if(data.type == "POLL_CREATE" || data.type == "POLL_UPDATE" || data.type == "POLL_COMPLETE") {
			const localObj = data.data as PubSubTypes.PollData;
			this.pollEvent(localObj)


			
		}else if(data.type == "POLL_ARCHIVED" || data.type == "POLL_TERMINATE" || data.type == "POLL_MODERATE" || data.type == "POLL_INVALID") {
			TwitchUtils.getPolls();


			
		}else if(data.type == "event-created" || data.type == "event-updated") {
			const localObj = data.data as PubSubTypes.PredictionData;
			this.predictionEvent(localObj);
			


			
		}else if(data.type == "moderation_action") {
			//Manage moderation actions
			const localObj = data.data as PubSubTypes.ModerationData;
			switch(localObj.moderation_action) {
				case "clear": 
					IRCClient.instance.sendNotice("usage_clear", "Chat cleared by "+localObj.created_by);
					break;
				case "timeout": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown user-";
					const duration = localObj.args && localObj.args.length > 1? localObj.args[1] : "unknown";
					IRCClient.instance.sendNotice("timeout_success", localObj.created_by+" has banned "+user+" for "+duration+" seconds");
					break;
				}
				case "untimeout": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown user-";
					IRCClient.instance.sendNotice("timeout_success", localObj.created_by+" has removed temporary ban from "+user);
					break;
				}
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
				case "raid": {
					store.dispatch("setRaiding", localObj.args? localObj.args[0] : "");
					break;
				}
				case "unraid": {
					store.dispatch("setRaiding", "");
					break;
				}
				default:
					console.log("Unhandled event type: "+localObj.moderation_action);
					break;
			}
		}
	}

	/**
	 * Called when a message is held by automod
	 * @param localObj
	 */
	private automodEvent(localObj:PubSubTypes.AutomodData):void {
		if(localObj.status == "PENDING") {
			const tags:IRCTagsExtended = {
				"username":localObj.message.sender.login,
				"color": localObj.message.sender.chat_color,
				"display-name": localObj.message.sender.display_name,
				"id": localObj.message.id,
				"user-id": localObj.message.sender.user_id,
				"tmi-sent-ts": new Date(localObj.message.sent_at).getTime().toString(),
				"message-type": "chat",
				"room-id": localObj.message.sender.user_id,
			};
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
		}else 
		if(localObj.status == "DENIED" || localObj.status == "ALLOWED") {
			store.dispatch("delChatMessage", localObj.message.id);
		}
	}

	/**
	 * Called when a user redeems a reward
	 */
	private rewardEvent(localObj:PubSubTypes.RewardData):void {
		const tags:IRCTagsExtended = {
			"username":localObj.redemption.user.display_name,
			"display-name": localObj.redemption.user.display_name,
			"id": localObj.redemption.id,
			"user-id": localObj.redemption.user.id,
			"tmi-sent-ts": new Date(localObj.timestamp).getTime().toString(),
			"message-type": "chat",
			"room-id": localObj.redemption.channel_id,
		};

		const data:IRCEventDataList.Highlight = {
			reward: localObj,
			channel: IRCClient.instance.channel,
			tags,
			type:"highlight",
		}
		IRCClient.instance.addHighlight(data);
	}

	/**
	 * Called when a poll event occurs (create/update/close)
	 * @param localObj
	 */
	private pollEvent(localObj:PubSubTypes.PollData):void {
		//convert data to API style format
		const choices:TwitchTypes.PollChoice[] = [];
		for (let i = 0; i < localObj.poll.choices.length; i++) {
			const c = localObj.poll.choices[i];
			choices.push({
				id: c.choice_id,
				title: c.title,
				votes: c.total_voters,
				channel_points_votes: c.votes.channel_points,
				bits_votes: c.votes.bits,
			})
		}
		const poll:TwitchTypes.Poll = {
			id: localObj.poll.poll_id,
			broadcaster_id: localObj.poll.owned_by,
			broadcaster_name: store.state.user.login,
			broadcaster_login: store.state.user.login,
			title: localObj.poll.title,
			choices: choices,
			bits_voting_enabled: localObj.poll.settings.bits_votes.is_enabled,
			bits_per_vote: localObj.poll.settings.bits_votes.cost,
			channel_points_voting_enabled: localObj.poll.settings.channel_points_votes.is_enabled,
			channel_points_per_vote: localObj.poll.settings.channel_points_votes.cost,
			status: localObj.poll.status as "ACTIVE" | "COMPLETED" | "TERMINATED" | "ARCHIVED" | "MODERATED" | "INVALID",
			duration: localObj.poll.duration_seconds,
			started_at: localObj.poll.started_at,
			ended_at: localObj.poll.ended_at,
		}
		store.dispatch("setPolls", [poll])
	}

	/**
	 * Called when a prediction event occurs (create/update/close)
	 */
	private predictionEvent(localObj:PubSubTypes.PredictionData):void {
	
		// convert data to API style format
		const outcomes:TwitchTypes.PredictionOutcome[] = [];
		for (let i = 0; i < localObj.event.outcomes.length; i++) {
			const c = localObj.event.outcomes[i];
			const top_predictors:TwitchTypes.PredictionPredictor[] = [];
			for (let j = 0; j < c.top_predictors.length; j++) {
				const p = c.top_predictors[j];
				top_predictors.push({
					id:p.id,
					name:p.user_display_name,
					login:p.user_display_name,
					channel_points_used:p.points,
					channel_points_won:p.result?.points_won,
				})
			}
			outcomes.push({
				id: c.id,
				title: c.title,
				users: c.total_users,
				channel_points: c.total_points,
				color:c.color,
				top_predictors,
			})
		}
		if(localObj.event.status == "RESOLVE_PENDING") {
			localObj.event.status = "LOCKED";
		}
		const prediction:TwitchTypes.Prediction = {
			id: localObj.event.id,
			broadcaster_id: localObj.event.created_by.user_id,
			broadcaster_name: localObj.event.created_by.user_display_name,
			broadcaster_login: localObj.event.created_by.user_display_name,
			title: localObj.event.title,
			winning_outcome_id: "TODO",
			outcomes: outcomes,
			prediction_window: localObj.event.prediction_window_seconds,
			status: localObj.event.status as "ACTIVE" | "RESOLVED" | "CANCELED" | "LOCKED",
			created_at: localObj.event.created_at,
			ended_at: localObj.event.ended_at,
			locked_at: localObj.event.locked_at,
		}
		console.log(prediction);
		store.dispatch("setPredictions", [prediction])
	}

	private followingEvent(data:PubSubTypes.Following):void {
		const message:IRCEventDataList.Highlight = {
			channel: IRCClient.instance.channel,
			tags:{
				"username":data.display_name,
				"tmi-sent-ts": Date.now().toString(),
			},
			username: data.display_name,
			"msg-id": "follow",
			"type": "highlight",
		}
		IRCClient.instance.addHighlight(message);
	}
}

export namespace PubSubTypes {
	export interface Following {
		display_name: string;
		username: string;
		user_id:string;
	}

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

	export interface PollData {
		poll:{
			poll_id: string;
			owned_by: string;
			created_by: string;
			title: string;
			started_at: string;
			ended_at?: string;
			ended_by?: string;
			duration_seconds: number;
			settings: {
				multi_choice: {is_enabled: boolean;};
				subscriber_only: {is_enabled: boolean;};
				subscriber_multiplier: {is_enabled: boolean;};
				bits_votes: {
					is_enabled: boolean;
					cost: number;
				};
				channel_points_votes: {
					is_enabled: boolean;
					cost: number;
				};
			};
			status: string;
			choices: {
				choice_id: string;
				title: string;
				votes: {
					total: number;
					bits: number;
					channel_points: number;
					base: number;
				};
				tokens: {
					bits: number;
					channel_points: number;
				};
				total_voters: number;
			}[];
			votes: {
				total: number;
				bits: number;
				channel_points: number;
				base: number;
			};
			tokens: {
				bits: number;
				channel_points: number;
			};
			total_voters: number;
			remaining_duration_milliseconds: number;
			top_contributor?: {
				user_id: string,
				display_name: string,
			};
			top_bits_contributor?: {
				user_id: string,
				display_name: string,
				bits_contributed: number
			};
			top_channel_points_contributor?: {
				user_id: string,
				display_name: string,
				channel_points_contributed: number
			};
		}
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

    export interface PredictionData {
        timestamp: string;
        event: {
			id: string;
			channel_id: string;
			created_at: string;
			created_by: {
				type: string;
				user_id: string;
				user_display_name: string;
				extension_client_id?: string;
			};
			ended_at?: string;
			ended_by?: string;
			locked_at?: string;
			locked_by?: string;
			outcomes: {
				id: string;
				color: string;
				title: string;
				total_points: number;
				total_users: number;
				top_predictors: {
					id: string,
					event_id: string,
					outcome_id: string,
					channel_id: string,
					points: number,
					predicted_at: string,
					updated_at: string,
					user_id: string,
					result: {
						type: "WIN"|"LOSE",
						points_won: number,
						is_acknowledged: boolean,
					},
					user_display_name: string
				}[];
				badge: {
					version: string;
					set_id: string;
				};
			}[];
			prediction_window_seconds: number;
			status: "RESOLVE_PENDING" | "RESOLVED" | "LOCKED" | "ACTIVE";
			title: string;
			winning_outcome_id?: string;
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