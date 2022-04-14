import store, { HypeTrainStateData } from "@/store";
import { ChatUserstate } from "tmi.js";
import { JsonObject } from "type-fest";
import IRCClient, { IRCTagsExtended } from "./IRCClient";
import { IRCEventDataList } from "./IRCEvent";
import PublicAPI from "./PublicAPI";
import TwitchatEvent from "./TwitchatEvent";
import TwitchUtils, { TwitchTypes } from "./TwitchUtils";
import Utils from "./Utils";

/**
* Created : 13/01/2022 
*/
export default class PubSub {

	private static _instance:PubSub;
	private socket!:WebSocket;
	private pingInterval!:number;
	private reconnectTimeout!:number;
	private hypeTrainApproachingTimer!:number;
	private history:PubSubTypes.SocketMessage[] = [];
	
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

	public get eventsHistory():PubSubTypes.SocketMessage[] { return this.history; }
	
	
	
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
				"leaderboard-events-v1.bits-usage-by-channel-v1-"+store.state.user.user_id+"-WEEK",
				"leaderboard-events-v1.sub-gifts-sent-"+store.state.user.user_id+"-WEEK",
				"raid."+store.state.user.user_id,
				"predictions-channel-v1."+store.state.user.user_id,
				"polls."+store.state.user.user_id,
				"hype-train-events-v1."+store.state.user.user_id,
				"following."+store.state.user.user_id,
				"ads."+store.state.user.user_id,
				"video-playback-by-id."+store.state.user.user_id,
				"community-boost-events-v1."+store.state.user.user_id,
				"ad-property-refresh."+store.state.user.user_id,

				// "low-trust-users."+store.state.user.user_id+"."+store.state.user.user_id,
				// "stream-change-v1."+store.state.user.user_id,
			]);
		};
		
		this.socket.onmessage = (event:unknown) => {
			// alert(`[message] Data received from server: ${event.data}`);
			const e = event as {data:string};
			const message = JSON.parse(e.data) as PubSubTypes.SocketMessage;
			if(message.type != "PONG" && message.data) {
				const data = JSON.parse(message.data.message);
				if(store.state.devmode) {
					//Ignore viewers count to avoid massive logs
					if(message.data.topic != "video-playback-by-id."+store.state.user.user_id) {
						this.history.push(message);
					}
				}
				this.parseEvent(data, message.data.topic);
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

	public async simulateHypeCooldown():Promise<void> {
		this.parseEvent(PubsubJSON.HypeTrainCooldownOver);
	}

	public async simulateHypeTrain():Promise<void> {
		this.parseEvent(PubsubJSON.HypeTrainApproaching);
		await Utils.promisedTimeout(10000);
		this.parseEvent(PubsubJSON.HypeTrainStart);
		await Utils.promisedTimeout(5000);
		this.parseEvent(PubsubJSON.HypeTrainProgressBits);
		this.parseEvent(PubsubJSON.HypeTrainConductorUpdateBits);
		this.parseEvent(PubsubJSON.HypeTrainLevelUp2);
		await Utils.promisedTimeout(10000);
		this.parseEvent(PubsubJSON.HypeTrainProgressSubGift);
		this.parseEvent(PubsubJSON.HypeTrainConductorUpdateSubGifts);
		this.parseEvent(PubsubJSON.HypeTrainLevelUp5);
		await Utils.promisedTimeout(10000);
		this.parseEvent(PubsubJSON.HypeTrainProgressSub);
		this.parseEvent(PubsubJSON.HypeTrainConductorUpdateSubs);
		await Utils.promisedTimeout(5000);
		this.parseEvent(PubsubJSON.HypeTrainComplete);
		await Utils.promisedTimeout(10000);
		this.parseEvent(PubsubJSON.HypeTrainExpire);
	}

	public async simulateCommunityBoost():Promise<void> {
		this.parseEvent(PubsubJSON.BoostStarting);
		await Utils.promisedTimeout(5000);
		this.parseEvent(PubsubJSON.BoostProgress1);
		await Utils.promisedTimeout(5000);
		this.parseEvent(PubsubJSON.BoostProgress2);
		await Utils.promisedTimeout(5000);
		this.parseEvent(PubsubJSON.BoostComplete);

	}

	public async simulateLowTrustUser():Promise<void> {
		const m = PubsubJSON.LowTrustMessage;
		m.data.message_id = IRCClient.instance.getFakeGuid();
		const tags:ChatUserstate = {
			'message-type': "chat",
			username: m.data.low_trust_user.sender.login,
			color: m.data.low_trust_user.sender.chat_color,
			"display-name": m.data.low_trust_user.sender.display_name,
			id: m.data.message_id,
			mod: false,
			turbo: false,
			'emotes-raw': "",
			'badges-raw': "",
			'badge-info-raw': "",
			"room-id": m.data.low_trust_user.channel_id,
			subscriber: false,
			'user-type': "",
			"user-id": m.data.low_trust_user.sender.user_id,
			"tmi-sent-ts": Date.now().toString(),
		}
		IRCClient.instance.addMessage(m.data.message_content.fragments[0].text, tags, false);
		this.parseEvent(m);

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

	private parseEvent(data:{type:string, data?:unknown, raid?:PubSubTypes.RaidInfos}, topic?:string):void {
		if(topic == "following."+store.state.user.user_id) {
			const localObj = (data as unknown) as PubSubTypes.Following;
			this.followingEvent(localObj);



		}else if(topic == "video-playback-by-id."+store.state.user.user_id) {
			const localObj = (data as unknown) as PubSubTypes.PlaybackInfo;
			if(localObj.type == "viewcount") {
				store.dispatch("setPlaybackState", localObj);
			}else 
			if(localObj.type == "stream-down") {
				store.dispatch("setPlaybackState", null);
			}



		}else if(data.type == "hype-train-approaching") {
			this.hypeTrainApproaching(data.data as  PubSubTypes.HypeTrainApproaching);



		}else if(data.type == "hype-train-start") {
			this.hypeTrainStart(data.data as  PubSubTypes.HypeTrainStart);



		}else if(data.type == "hype-train-progression") {
			this.hypeTrainProgress(data.data as  PubSubTypes.HypeTrainProgress);



		}else if(data.type == "hype-train-level-up") {
			this.hypeTrainLevelUp(data.data as  PubSubTypes.HypeTrainLevelUp);



		}else if(data.type == "hype-train-end") {
			this.hypeTrainEnd(data.data as  PubSubTypes.HypeTrainEnd);



		}else if(data.type == "hype-train-cooldown-expiration") {
			IRCClient.instance.sendHighlight({
				channel: store.state.user.login,
				type:"highlight",
				tags:{
					"tmi-sent-ts":Date.now().toString(),
				},
				"msg-id": "hype_cooldown_expired",
			});



		}else if(data.type == "automod_caught_message") {
			this.automodEvent(data.data as  PubSubTypes.AutomodData);



		}else if(data.type == "low_trust_user_new_message") {
			this.lowTrustMessage(data.data as  PubSubTypes.LowTrustMessage);



		}else if(data.type == "reward-redeemed") {
			//Manage rewards
			if(store.state.params.filters.showRewards.value) {
				const localObj = data.data as  PubSubTypes.RewardData;
				this.rewardEvent(localObj);
			}



		}else if(data.type == "POLL_CREATE" || data.type == "POLL_UPDATE" || data.type == "POLL_COMPLETE") {
			const localObj = data.data as PubSubTypes.PollData;
			this.pollEvent(localObj)



		}else if(data.type == "POLL_ARCHIVE" || data.type == "POLL_TERMINATE" || data.type == "POLL_MODERATE" || data.type == "POLL_INVALID") {
			TwitchUtils.getPolls();



		}else if(data.type == "event-created" || data.type == "event-updated") {
			const localObj = data.data as PubSubTypes.PredictionData;
			this.predictionEvent(localObj);



		}else if(data.type == "raid_update_v2") {
			store.dispatch("setRaiding", data.raid);

		}else if(data.type == "raid_go_v2") {
			store.dispatch("setRaiding", null);



		}else if(data.type == "community-boost-start" || data.type == "community-boost-progression") {
			store.dispatch("setCommunityBoost", data.data as PubSubTypes.CommunityBoost);
			
		}else if(data.type == "community-boost-end") {
			const boost = data.data as PubSubTypes.CommunityBoost;
			store.dispatch("setCommunityBoost", boost);
			IRCClient.instance.sendHighlight({
				channel: store.state.user.login,
				viewers: boost.total_goal_progress? boost.total_goal_progress : boost.boost_orders[0].GoalProgress,
				type:"highlight",
				tags:{
					"tmi-sent-ts":Date.now().toString(),
				},
				"msg-id": "community_boost_complete",
			});
			
			setTimeout(()=> {
				//Automatically hide the boost after a few seconds
				store.dispatch("setCommunityBoost", null);
			}, 30000);
			

			
		}else if(data.type == "moderation_action") {
			//Manage moderation actions
			const localObj = data.data as PubSubTypes.ModerationData;
			switch(localObj.moderation_action) {
				case "clear": {
					IRCClient.instance.sendNotice("usage_clear", "Chat cleared by "+localObj.created_by);
					break;
				}
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
					const infos:PubSubTypes.RaidInfos = {
						id: IRCClient.instance.getFakeGuid(),
						creator_id: store.state.user.user_id,
						source_id: store.state.user.user_id,
						target_id: "",
						target_login: localObj.args? localObj.args[0] : "",
						target_display_name: localObj.args? localObj.args[0] : "",
						target_profile_image: "",
						transition_jitter_seconds: 1,
						force_raid_now_seconds: 90,
						viewer_count: 0,
					};
					store.dispatch("setRaiding", infos);
					break;
				}
				case "unraid": {
					store.dispatch("setRaiding", null);
					break;
				}
				case "delete": {
					const data = {
						messageId:localObj.args? localObj.args[2] : "",
						deleteData:localObj,
					}
					store.dispatch("delChatMessage", data);
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
			store.dispatch("delChatMessage", {messageId:localObj.message.id});
		}
	}

	/**
	 * Called when a low trust user is detected
	 * 
	 * @param localObj
	 */
	private lowTrustMessage(localObj:PubSubTypes.LowTrustMessage):void {
		store.dispatch("flagLowTrustMessage", localObj);
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
		IRCClient.instance.sendHighlight(data);
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
			let votes = c.total_voters;
			if(c.votes.channel_points) votes += c.votes.channel_points;
			if(c.votes.bits) votes += c.votes.bits;
			choices.push({
				id: c.choice_id,
				title: c.title,
				votes: votes,
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
		};

		PublicAPI.instance.broadcast(TwitchatEvent.POLL, {poll: (poll as unknown) as JsonObject});
		
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
		};

		PublicAPI.instance.broadcast(TwitchatEvent.PREDICTION, {prediction: (prediction as unknown) as JsonObject});
		store.dispatch("setPredictions", [prediction])
	}

	/**
	 * Called when having a new follower
	 */
	private followingEvent(data:PubSubTypes.Following):void {
		const message:IRCEventDataList.Highlight = {
			channel: IRCClient.instance.channel,
			tags:{
				"username":data.display_name,
				"user-id":data.user_id,
				"tmi-sent-ts": Date.now().toString(),
			},
			username: data.display_name,
			"msg-id": "follow",
			"type": "highlight",
		};

		//Broadcast to OBS-ws
		const wsMessage = {
			display_name: data.display_name,
			username: data.username,
			user_id: data.user_id,
		}
		PublicAPI.instance.broadcast(TwitchatEvent.FOLLOW, {user:wsMessage});
		
		IRCClient.instance.sendHighlight(message);
	}

	/**
	 * Called when a hype train approaches
	 * @param data 
	 */
	private hypeTrainApproaching(data:PubSubTypes.HypeTrainApproaching):void {
		const key = Object.keys(data.events_remaining_durations)[0];
		const train:HypeTrainStateData = {
			level:1,
			currentValue:0,
			goal:data.goal,
			started_at:Date.now(),
			timeLeft:data.events_remaining_durations[key],
			state: "APPROACHING",
			is_boost_train:data.is_boost_train,
		};
		store.dispatch("setHypeTrain", train);
		//Hide "hypetrain approaching" notification if expired
		this.hypeTrainApproachingTimer = setTimeout(()=> {
			store.dispatch("setHypeTrain", {});
		}, train.timeLeft * 1000);
	}

	/**
	 * Called when a hype train starts
	 * @param data 
	 */
	private hypeTrainStart(data:PubSubTypes.HypeTrainStart):void {
		clearTimeout(this.hypeTrainApproachingTimer);
		const train:HypeTrainStateData = {
			level:data.progress.level.value,
			currentValue:data.progress.value,
			goal:data.progress.goal,
			started_at:Date.now(),//data.started_at,
			timeLeft:data.progress.remaining_seconds,
			state: "START",
			is_boost_train:data.is_boost_train,
		};
		store.dispatch("setHypeTrain", train);
	}
	
	/**
	 * Called when a hype train is progressing (new sub/bits)
	 * @param data 
	 */
	private hypeTrainProgress(data:PubSubTypes.HypeTrainProgress):void {
		const train:HypeTrainStateData = {
			level:data.progress.level.value,
			currentValue:data.progress.value,
			goal:data.progress.goal,
			started_at:(store.state.hypeTrain as HypeTrainStateData).started_at,
			timeLeft:data.progress.remaining_seconds,
			state: "PROGRESSING",
			is_boost_train:data.is_boost_train,
		};
		store.dispatch("setHypeTrain", train);
	}
	
	/**
	 * Called when a hype train levels up
	 * @param data 
	 */
	private hypeTrainLevelUp(data:PubSubTypes.HypeTrainLevelUp):void {
		const train:HypeTrainStateData = {
			level:data.progress.level.value,
			currentValue:data.progress.value,
			goal:data.progress.goal,
			started_at:(store.state.hypeTrain as HypeTrainStateData).started_at,
			timeLeft:data.progress.remaining_seconds,
			state: "LEVEL_UP",
			is_boost_train:data.is_boost_train,
		};
		store.dispatch("setHypeTrain", train);
	}
	
	/**
	 * Called when a hype train completes or expires
	 * @param data 
	 */
	private hypeTrainEnd(data:PubSubTypes.HypeTrainEnd):void {
		const storeData:HypeTrainStateData = store.state.hypeTrain as HypeTrainStateData;
		if(data.ending_reason == "COMPLETED") {
			storeData.state = "COMPLETED";
		}
		if(data.ending_reason == "EXPIRE") {
			storeData.state = "EXPIRE";
		}
		store.dispatch("setHypeTrain", storeData);
		
		setTimeout(()=> {
			//Hide hype train popin
			store.dispatch("setHypeTrain", {});
		}, 20000)
	}
	
}

export namespace PubSubTypes {

	export interface SocketMessage {
		type: string;
		data: {
			message: string;
			topic: string;
		}
	}

	export interface Following {
		display_name: string;
		username: string;
		user_id:string;
	}

	export interface PlaybackInfo {
		type: string;
		server_time: number;
		viewers: number;
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

	export interface HypeTrainApproaching {
        channel_id: string;
        goal: number;
        events_remaining_durations:{[key:string]:number};
        level_one_rewards: {
			type: string;
			id: string;
			group_id: string;
			reward_level: number;
			set_id: string;
			token: string;
		}[];
        creator_color: string;
        participants: string[];
        approaching_hype_train_id: string;
        is_boost_train: boolean;
	}

	export interface HypeTrainStart {
		channel_id: string;
		id: string;
		started_at: number;
		expires_at: number;
		updated_at: number;
		ended_at?: number;
		ending_reason?: string;
		config: {
			channel_id: string;
			is_enabled: boolean;
			is_whitelisted: boolean;
			kickoff: {
				num_of_events: number;
				min_points: number;
				duration: number;
			};
			cooldown_duration: number;
			level_duration: number;
			difficulty: string;
			reward_end_date?: number;
			participation_conversion_rates: {
				"BITS.CHEER": number;
				"BITS.EXTENSION": number;
				"BITS.POLL": number;
				"SUBS.TIER_1_GIFTED_SUB": number;
				"SUBS.TIER_1_SUB": number;
				"SUBS.TIER_2_GIFTED_SUB": number;
				"SUBS.TIER_2_SUB": number;
				"SUBS.TIER_3_GIFTED_SUB": number;
				"SUBS.TIER_3_SUB": number;
			};
			notification_thresholds: {
				"BITS.CHEER": number;
				"BITS.EXTENSION": number;
				"BITS.POLL": number;
				"SUBS.TIER_1_GIFTED_SUB": number;
				"SUBS.TIER_1_SUB": number;
				"SUBS.TIER_2_GIFTED_SUB": number;
				"SUBS.TIER_2_SUB": number;
				"SUBS.TIER_3_GIFTED_SUB": number;
				"SUBS.TIER_3_SUB": number;
			};
			difficulty_settings: {
				MEDIUM: {
					value: number;
					goal: number;
					rewards: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						set_id: string;
						token: string;
					}[];
				}[];
			};
			conductor_rewards: {
				BITS: {
					
					CURRENT: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						badge_id: string;
						image_url: string;
					}[];
					FORMER: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						badge_id: string;
						image_url: string;
					}[];
				};
				SUBS: {
					CURRENT: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						badge_id: string;
						image_url: string;
					}[];
					FORMER: {
						type: string;
						id: string;
						group_id: string;
						reward_level: number;
						badge_id: string;
						image_url: string;
					}[];
				};
			};
			callout_emote_id: string;
			callout_emote_token: string;
			theme_color: string;
			has_conductor_badges: boolean;
		};
		participations: {
			"SUBS.TIER_1_GIFTED_SUB": number;
			"SUBS.TIER_1_SUB": number;
			"SUBS.TIER_3_SUB": number;
		};
		conductors: unknown;
		progress: HypeProgressInfo;
		is_boost_train:boolean;
	}

	export interface HypeTrainProgress {
		user_id: string;
		user_login: string;
		user_display_name: string;
		sequence_id: number;
		action: string;
		source: string;
		quantity: number;
		progress: HypeProgressInfo;
		is_boost_train:boolean;
	}

	export interface HypeTrainConductorUpdate {
		source: string;
		user: {
			id: string;
			login: string;
			display_name: string;
			profile_image_url: string;
		};
		participations: {
			"BITS.CHEER": number;
			"SUBS.TIER_1_SUB": number;
		};
	}

	export interface HypeTrainLevelUp {
		time_to_expire: number;
		progress: HypeProgressInfo;
		is_boost_train:boolean;
	}
	
	export interface HypeTrainEnd {
		ended_at: number;
		ending_reason: "COMPLETED" | "EXPIRE";
		is_boost_train:boolean;
	}
	
	interface HypeProgressInfo {
		level: {
			value: number;
			goal: number;
			rewards: {
				type: string;
				id: string;
				group_id: string;
				reward_level: number;
				set_id: string;
				token: string;
			}[]
		};
		value: number;
		goal: number;
		total: number;
		remaining_seconds: number;
		is_boost_train:boolean;
	}

	export interface LowTrustMessage {
		low_trust_user: LowTrustUser;
		message_content: {
			text: string;
			fragments: {
				text: string;
			}[];
		};
		message_id: string;
		sent_at: Date;
	}

	interface LowTrustUser {
		id: string;
		low_trust_id: string;
		channel_id: string;
		sender: {
			user_id: string;
			login: string;
			display_name: string;
			chat_color: string;
			badges: {
				id: string;
				version: string;
			}[];
		};
		evaluated_at: Date;
		updated_at: Date;
		ban_evasion_evaluation: "UNLIKELY_EVADER" | string;
		treatment: "RESTRICTED" | "ACTIVE_MONITORING";
		updated_by: {
			id: string;
			login: string;
			display_name: string;
		};
	}

	export interface RaidInfos {
		id: string;
		creator_id: string;
		source_id: string;
		target_id: string;
		target_login: string;
		target_display_name: string;
		target_profile_image: string;
		transition_jitter_seconds: number;
		force_raid_now_seconds: number;
		viewer_count: number;
	}

	export interface CommunityBoost {
        channel_id: string;
		total_goal_target:number;
		total_goal_progress?:number;
		ending_reason:"ORDER_STATE_FULFILLED";
        boost_orders: {
			ID: string;
			State: "ORDER_STATE_DELIVERING" | "DELIVERING_ORDER" | "ORDER_STATE_FULFILLED";
			GoalProgress: number;
			GoalTarget: number;
		}[];
	}

	export interface DeletedMessage {
		type: string;
		moderation_action: string;
		args: string[];
		created_by: string;
		created_by_user_id: string;
		created_at: string;
		msg_id: string;
		target_user_id: string;
		target_user_login: string;
		from_automod: boolean;
	}
}

namespace PubsubJSON {
	export const HypeTrainApproaching = {"type":"hype-train-approaching","data":{"channel_id":"227146018","goal":3,"events_remaining_durations":{"1":252},"level_one_rewards":[{"type":"EMOTE","id":"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCool"},{"type":"EMOTE","id":"emotesv2_036fd741be4141198999b2ca4300668e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLove1"},{"type":"EMOTE","id":"emotesv2_3114c3d12dc44f53810140f632128b54","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeSleep"},{"type":"EMOTE","id":"emotesv2_7d457ecda087479f98501f80e23b5a04","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePat"},{"type":"EMOTE","id":"emotesv2_e7a6e7e24a844e709c4d93c0845422e1","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLUL"}],"creator_color":"00AA7F","participants":["38001049","59580201"],"approaching_hype_train_id":"fbafb76e-0447-49ca-b008-c954f374be33","is_boost_train":false}};
	export const HypeTrainStart = {"type":"hype-train-start","data":{"channel_id":"227146018","id":"fbafb76e-0447-49ca-b008-c954f374be33","started_at":1648207198000,"expires_at":1648207498000,"updated_at":1648207198000,"ended_at":null,"ending_reason":null,"config":{"channel_id":"227146018","is_enabled":true,"is_whitelisted":true,"kickoff":{"num_of_events":3,"min_points":100,"duration":300000000000},"cooldown_duration":3600000000000,"level_duration":300000000000,"difficulty":"EASY","reward_end_date":null,"participation_conversion_rates":{"BITS.CHEER":1,"BITS.EXTENSION":1,"BITS.POLL":1,"SUBS.TIER_1_GIFTED_SUB":500,"SUBS.TIER_1_SUB":500,"SUBS.TIER_2_GIFTED_SUB":1000,"SUBS.TIER_2_SUB":1000,"SUBS.TIER_3_GIFTED_SUB":2500,"SUBS.TIER_3_SUB":2500},"notification_thresholds":{"BITS.CHEER":1000,"BITS.EXTENSION":1000,"BITS.POLL":1000,"SUBS.TIER_1_GIFTED_SUB":5,"SUBS.TIER_1_SUB":5,"SUBS.TIER_2_GIFTED_SUB":5,"SUBS.TIER_2_SUB":5,"SUBS.TIER_3_GIFTED_SUB":5,"SUBS.TIER_3_SUB":5},"difficulty_settings":{"EASY":[{"value":1,"goal":1600,"rewards":[{"type":"EMOTE","id":"emotesv2_e7a6e7e24a844e709c4d93c0845422e1","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLUL"},{"type":"EMOTE","id":"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCool"},{"type":"EMOTE","id":"emotesv2_036fd741be4141198999b2ca4300668e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLove1"},{"type":"EMOTE","id":"emotesv2_3114c3d12dc44f53810140f632128b54","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeSleep"},{"type":"EMOTE","id":"emotesv2_7d457ecda087479f98501f80e23b5a04","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePat"}],"impressions":300},{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_0457808073314f62962554c12ebb6b4d","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHands1"},{"type":"EMOTE","id":"emotesv2_8c40cd16027f48c0a70ac7b1fa1c397e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHands2"},{"type":"EMOTE","id":"emotesv2_0330a84e75ad48c1821c1d29a7dadd4d","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeFail"},{"type":"EMOTE","id":"emotesv2_9b68a8fa2f1d457496ac016b251e06b6","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHai"},{"type":"EMOTE","id":"emotesv2_9bcc622c0b2a48b180a159c25a2b8245","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeNom"}],"impressions":600},{"value":3,"goal":5500,"rewards":[{"type":"EMOTE","id":"emotesv2_08abf0cd0e78494a9da8a2315c3648f4","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeBLEH"},{"type":"EMOTE","id":"emotesv2_ccc146905a694f3b8df390f55e34002a","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeApplause"},{"type":"EMOTE","id":"emotesv2_4918bd32ff5b476f82bda49f3e958767","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeRage"},{"type":"EMOTE","id":"emotesv2_7d01d1cf36b549098434c7a6e50a8828","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeMwah"},{"type":"EMOTE","id":"emotesv2_43da115e6b6749828f7dee47d17dd315","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHuh"}],"impressions":900},{"value":4,"goal":7800,"rewards":[{"type":"EMOTE","id":"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeWave"},{"type":"EMOTE","id":"emotesv2_271ea48a09ca418baad2ea1f734ab09e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeReading"},{"type":"EMOTE","id":"emotesv2_1337536bcecf49f4bb9cd1a699341ee2","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeShock"},{"type":"EMOTE","id":"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeStress"},{"type":"EMOTE","id":"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCry"}],"impressions":1200},{"value":5,"goal":10800,"rewards":[{"type":"EMOTE","id":"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCheer"},{"type":"EMOTE","id":"emotesv2_1630ff0e5ff34a808f4b25320a540ee7","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLurk"},{"type":"EMOTE","id":"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePopcorn"},{"type":"EMOTE","id":"emotesv2_1885b5088372466b800789b02daf7b65","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeEvil"},{"type":"EMOTE","id":"emotesv2_85a13cc47247425fa152b9292c4589a9","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeAwww"}],"impressions":1500}]},"conductor_rewards":{"BITS":{"CURRENT":[{"type":"BADGE","id":"1","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsxOzIyNzE0NjAxOA==","image_url":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2"}],"FORMER":[{"type":"BADGE","id":"2","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsyOzIyNzE0NjAxOA==","image_url":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2"}]},"SUBS":{"CURRENT":[{"type":"BADGE","id":"1","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsxOzIyNzE0NjAxOA==","image_url":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2"}],"FORMER":[{"type":"BADGE","id":"2","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsyOzIyNzE0NjAxOA==","image_url":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2"}]}},"callout_emote_id":"emotesv2_cfe2a115df084866815c8595f849a5b8","callout_emote_token":"cabridMwaller","use_creator_color":true,"primary_hex_color":"00AA7F","use_personalized_settings":false,"has_conductor_badges":true,"boost_train_config":{"twitch_impressions":{"EASY":500,"HARD":500,"INSANE":500,"MEDIUM":500,"SUPER HARD":500}}},"participations":{"BITS.CHEER":100,"SUBS.TIER_1_GIFTED_SUB":2},"conductors":{},"progress":{"level":{"value":1,"goal":1600,"rewards":[{"type":"EMOTE","id":"emotesv2_e7a6e7e24a844e709c4d93c0845422e1","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLUL"},{"type":"EMOTE","id":"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCool"},{"type":"EMOTE","id":"emotesv2_036fd741be4141198999b2ca4300668e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLove1"},{"type":"EMOTE","id":"emotesv2_3114c3d12dc44f53810140f632128b54","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeSleep"},{"type":"EMOTE","id":"emotesv2_7d457ecda087479f98501f80e23b5a04","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePat"}],"impressions":300},"value":1100,"goal":1600,"total":1100,"remaining_seconds":299},"is_boost_train":false}};
	export const HypeTrainConductorUpdateSubs = {"type":"hype-train-conductor-update","data":{"source":"SUBS","user":{"id":"38001049","login":"chunt3r","display_name":"chunt3r","profile_image_url":"https://static-cdn.jtvnw.net/user-default-pictures-uv/dbdc9198-def8-11e9-8681-784f43822e80-profile_image-50x50.png"},"participations":{"SUBS.TIER_1_SUB":1}}};
	export const HypeTrainConductorUpdateSubGifts = {"type":"hype-train-conductor-update","data":{"source":"SUBS","user":{"id":"38001049","login":"chunt3r","display_name":"chunt3r","profile_image_url":"https://static-cdn.jtvnw.net/user-default-pictures-uv/dbdc9198-def8-11e9-8681-784f43822e80-profile_image-50x50.png"},"participations":{"SUBS.TIER_1_GIFTED_SUB":1}}};
	export const HypeTrainConductorUpdateBits = {"type":"hype-train-conductor-update","data":{"source":"BITS","user":{"id":"59580201","login":"lemmycaution66","display_name":"Lemmycaution66","profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/lemmycaution66-profile_image-c6ca6e5082712677-50x50.jpeg"},"participations":{"BITS.CHEER":100}}};
	export const HypeTrainProgressSub = {"type":"hype-train-progression","data":{"user_id":"206185174","user_login":"sapioce","user_display_name":"Sapioce","user_profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/53c0895f-cc6d-4ab5-a171-7a0782d55ae5-profile_image-50x50.png","sequence_id":15000,"action":"TIER_1_SUB","source":"SUBS","quantity":1,"progress":{"level":{"value":5,"goal":10800,"rewards":[{"type":"EMOTE","id":"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCheer"},{"type":"EMOTE","id":"emotesv2_1630ff0e5ff34a808f4b25320a540ee7","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLurk"},{"type":"EMOTE","id":"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePopcorn"},{"type":"EMOTE","id":"emotesv2_1885b5088372466b800789b02daf7b65","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeEvil"},{"type":"EMOTE","id":"emotesv2_85a13cc47247425fa152b9292c4589a9","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeAwww"}]},"value":7200,"goal":3000,"total":15000,"remaining_seconds":63}}};
	export const HypeTrainProgressSubGift = {"type":"hype-train-progression","data":{"user_id":"38001049","user_login":"chunt3r","user_display_name":"chunt3r","user_profile_image_url":"https://static-cdn.jtvnw.net/user-default-pictures-uv/dbdc9198-def8-11e9-8681-784f43822e80-profile_image-50x50.png","sequence_id":1600,"action":"TIER_1_GIFTED_SUB","source":"SUBS","quantity":1,"progress":{"level":{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_0457808073314f62962554c12ebb6b4d","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHands1"},{"type":"EMOTE","id":"emotesv2_8c40cd16027f48c0a70ac7b1fa1c397e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHands2"},{"type":"EMOTE","id":"emotesv2_0330a84e75ad48c1821c1d29a7dadd4d","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeFail"},{"type":"EMOTE","id":"emotesv2_9b68a8fa2f1d457496ac016b251e06b6","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHai"},{"type":"EMOTE","id":"emotesv2_9bcc622c0b2a48b180a159c25a2b8245","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeNom"}],"impressions":600},"value":0,"goal":1800,"total":1600,"remaining_seconds":252},"is_boost_train":false}};
	export const HypeTrainProgressBits = {"type":"hype-train-progression","data":{"user_id":"490834664","user_login":"wulna","user_display_name":"wulna","user_profile_image_url":"https://static-cdn.jtvnw.net/user-default-pictures-uv/dbdc9198-def8-11e9-8681-784f43822e80-profile_image-50x50.png","sequence_id":25500,"action":"CHEER","source":"BITS","quantity":1000,"progress":{"level":{"value":5,"goal":10800,"rewards":[{"type":"EMOTE","id":"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCheer"},{"type":"EMOTE","id":"emotesv2_1630ff0e5ff34a808f4b25320a540ee7","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLurk"},{"type":"EMOTE","id":"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePopcorn"},{"type":"EMOTE","id":"emotesv2_1885b5088372466b800789b02daf7b65","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeEvil"},{"type":"EMOTE","id":"emotesv2_85a13cc47247425fa152b9292c4589a9","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeAwww"}]},"value":17700,"goal":3000,"total":25500,"remaining_seconds":22}}};
	export const HypeTrainLevelUp2 = {"type":"hype-train-level-up","data":{"time_to_expire":1648207545000,"progress":{"level":{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_0457808073314f62962554c12ebb6b4d","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHands1"},{"type":"EMOTE","id":"emotesv2_8c40cd16027f48c0a70ac7b1fa1c397e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHands2"},{"type":"EMOTE","id":"emotesv2_0330a84e75ad48c1821c1d29a7dadd4d","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeFail"},{"type":"EMOTE","id":"emotesv2_9b68a8fa2f1d457496ac016b251e06b6","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHai"},{"type":"EMOTE","id":"emotesv2_9bcc622c0b2a48b180a159c25a2b8245","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeNom"}],"impressions":600},"value":0,"goal":1800,"total":1600,"remaining_seconds":299},"is_boost_train":false}};
	export const HypeTrainLevelUp3 = {"type":"hype-train-level-up","data":{"time_to_expire":1648207714000,"progress":{"level":{"value":3,"goal":5500,"rewards":[{"type":"EMOTE","id":"emotesv2_08abf0cd0e78494a9da8a2315c3648f4","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeBLEH"},{"type":"EMOTE","id":"emotesv2_ccc146905a694f3b8df390f55e34002a","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeApplause"},{"type":"EMOTE","id":"emotesv2_4918bd32ff5b476f82bda49f3e958767","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeRage"},{"type":"EMOTE","id":"emotesv2_7d01d1cf36b549098434c7a6e50a8828","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeMwah"},{"type":"EMOTE","id":"emotesv2_43da115e6b6749828f7dee47d17dd315","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHuh"}],"impressions":900},"value":1200,"goal":2100,"total":4600,"remaining_seconds":299},"is_boost_train":false}};
	export const HypeTrainLevelUp4 = {"type":"hype-train-level-up","data":{"time_to_expire":1648207802000,"progress":{"level":{"value":4,"goal":7800,"rewards":[{"type":"EMOTE","id":"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeWave"},{"type":"EMOTE","id":"emotesv2_271ea48a09ca418baad2ea1f734ab09e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeReading"},{"type":"EMOTE","id":"emotesv2_1337536bcecf49f4bb9cd1a699341ee2","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeShock"},{"type":"EMOTE","id":"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeStress"},{"type":"EMOTE","id":"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCry"}],"impressions":1200},"value":1600,"goal":2300,"total":7100,"remaining_seconds":299},"is_boost_train":false}};
	export const HypeTrainLevelUp5 = {"type":"hype-train-level-up","data":{"time_to_expire":1648207960000,"progress":{"level":{"value":5,"goal":10800,"rewards":[{"type":"EMOTE","id":"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCheer"},{"type":"EMOTE","id":"emotesv2_1630ff0e5ff34a808f4b25320a540ee7","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLurk"},{"type":"EMOTE","id":"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePopcorn"},{"type":"EMOTE","id":"emotesv2_1885b5088372466b800789b02daf7b65","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeEvil"},{"type":"EMOTE","id":"emotesv2_85a13cc47247425fa152b9292c4589a9","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeAwww"}],"impressions":1500},"value":1800,"goal":3000,"total":9600,"remaining_seconds":299},"is_boost_train":false}};
	export const HypeTrainComplete = {"type":"hype-train-end","data":{"ended_at":1648207961000,"ending_reason":"COMPLETED","is_boost_train":false}};
	export const HypeTrainExpire = {"type":"hype-train-end","data":{"ended_at":1603128366000,"ending_reason":"EXPIRE"}};
	export const HypeTrainCooldownOver = {"type":"hype-train-cooldown-expiration"};
	export const LowTrustMessage = {"type":"low_trust_user_new_message","data":{"low_trust_user":{"id":"647389082","low_trust_id":"Mjk5NjE4MTMuNjQ3Mzg5MDgy","channel_id":"29961813","sender":{"user_id":"647389082","login":"durssbot","display_name":"DurssBot","chat_color":"#8A2BE2","badges":[{"id":"vip","version":"1"}]},"evaluated_at":"2022-01-12T15:39:44Z","updated_at":"2022-02-19T21:13:27Z","ban_evasion_evaluation":"UNLIKELY_EVADER","treatment":"ACTIVE_MONITORING","updated_by":{"id":"29961813","login":"durss","display_name":"Durss"}},"message_content":{"text":"test","fragments":[{"text":"test"}]},"message_id":"f5958f42-d1c1-45d0-857d-8533125b50a7","sent_at":"2022-02-19T21:14:41Z"}};
	export const MidrollRequest = {"type":"midroll_request","data":{"jitter_buckets":1,"jitter_time":5000,"warmup_time":5000,"commercial_id":"d6a04370d98f4cfea4e1516715ce0f6b","weighted_buckets":[1]}};
	export const VideoPlayback = {"type":"viewcount","server_time":1645373070.319400,"viewers":63}
	export const BoostStarting = {"type":"community-boost-start","data":{"channel_id":"29961813","boost_orders":[{"ID":"095321ce-5429-4109-929d-c5f8598c0a9f","State":"ORDER_STATE_DELIVERING","GoalProgress":0,"GoalTarget":1100}]}};
	export const BoostProgress1 = {"type":"community-boost-progression","data":{"channel_id":"29961813","boost_orders":[{"ID":"095321ce-5429-4109-929d-c5f8598c0a9f","State":"DELIVERING_ORDER","GoalProgress":150,"GoalTarget":1100}],"total_goal_progress":150, "total_goal_target":1100}};
	export const BoostProgress2 = {"type":"community-boost-progression","data":{"channel_id":"29961813","boost_orders":[{"ID":"095321ce-5429-4109-929d-c5f8598c0a9f","State":"DELIVERING_ORDER","GoalProgress":700,"GoalTarget":1100}],"total_goal_progress":700,"total_goal_target":1100}};
	export const BoostComplete = {"type":"community-boost-end","data":{"channel_id":"29961813","boost_orders":[{"ID":"095321ce-5429-4109-929d-c5f8598c0a9f","State":"ORDER_STATE_FULFILLED","GoalProgress":1104,"GoalTarget":1100}],"ending_reason":"ORDER_STATE_FULFILLED"}};
}
