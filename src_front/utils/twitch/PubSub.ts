import Database from '@/store/Database';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import * as Sentry from "@sentry/vue";
import { EventDispatcher } from "../../events/EventDispatcher";
import SetIntervalWorker from '../SetIntervalWorker';
import Utils from "../Utils";
import type { PubSubDataTypes } from './PubSubDataTypes';
import { TwitchScopes } from './TwitchScopes';
import ApiHelper from '../ApiHelper';

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
	private rewardsParsed:{[key:string]:boolean} = {};

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
				"community-boost-events-v1."+myUID,//Boost after a boost train complete
				"chatrooms-user-v1."+myUID,//Host events (RIP)
				"pinned-chat-updates-v1."+myUID,//when a message is un/pinned
				// "predictions-channel-v1."+myUID,
				"polls."+myUID,
				"hype-train-events-v2."+myUID,
				// "hype-train-events-v2.37804856",//Testing golden kappa data
				// "hype-train-events-v2.43809079",//Testing golden kappa data
				// "hype-train-events-v2.153390618",//Testing golden kappa data
				// "hype-train-events-v2.402890635",//Testing golden kappa data
				// "hype-train-events-v2.115060112",//Testing golden kappa data
				// "hype-train-events-v2.53964156",//Testing golden kappa data
				// "hype-train-events-v2.117482317",//Testing golden kappa data
				"raid."+myUID,
				"community-moments-channel-v1."+myUID,
				"user-moderation-notifications."+myUID+"."+myUID,
				"ads."+myUID,//???
				"ad-property-refresh."+myUID,//???
				"stream-chat-room-v1."+myUID,//???
				"sponsorships-v1."+myUID,//???
				"community-points-channel-v1."+myUID,
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
			if(TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])){
				subscriptions.push("channel-points-channel-v1."+myUID);
			}
			if(TwitchUtils.hasScopes([TwitchScopes.WHISPER_READ])){
				subscriptions.push("whispers."+myUID);
			}
			if(TwitchUtils.hasScopes([TwitchScopes.MODERATION_EVENTS])){
				subscriptions.push("chat_moderator_actions."+myUID+"."+myUID);
				subscriptions.push("low-trust-users."+myUID+"."+myUID);
				// subscriptions.push("channel-chat-highlights."+myUID+"."+myUID);//Needs a twitch scope T_T. This is what allows to get "raider" message highlight
			}
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
			// if (event.wasClean) {
			// 	alert(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
			// } else {
			// 	alert('[close] Connection died');
			// }
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
	 * Simulate a fake accelerated hype train sequence
	 */
	public async simulateHypeTrain(goldenKappa:boolean = false):Promise<void> {
		const startedAt		= new Date(PubsubJSON.RealHypeTrainData[0].data.expires_at!).getTime() - PubsubJSON.RealHypeTrainData[0].data.events_remaining_durations!["1"]*1000;
		const dateOffset	= Date.now() - startedAt;
		for (let i = 0; i < PubsubJSON.RealHypeTrainData.length; i++) {
			const json = JSON.parse(JSON.stringify(PubsubJSON.RealHypeTrainData[i]));
			if(json.data.started_at) json.data.started_at += dateOffset;
			if(json.data.expires_at) json.data.expires_at = new Date(new Date(json.data.expires_at).getTime() + dateOffset).toString();
			if(json.data.ended_at) json.data.ended_at += dateOffset;
			if(json.data.updated_at) json.data.updated_at += dateOffset;
			if(goldenKappa) {
				if(json.data.is_golden_kappa_train != undefined) json.data.is_golden_kappa_train = true;
				if(json.data.hype_train) json.data.hype_train.isGoldenKappaTrain = true;
			}
			this.parseEvent( json );
			await Utils.promisedTimeout(2000);
		}
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
				StoreProxy.stream.setPlaybackState(channelId, localObj);
			}



		//sent when sending a whisper from anywhere
		}else if(data.type == "whisper_sent" || data.type == "whisper_received") {
			data.data = JSON.parse(data.data as string);//for this event it's a string..thanks twitch for your consistency
			const localObj		= (data.data as unknown) as PubSubDataTypes.WhisperSent;
			const senderID		= localObj.from_id.toString();
			const receiverID	= localObj.thread_id.replace(new RegExp("_?"+localObj.from_id+"_?", "gi"), "");
			const meID			= StoreProxy.auth.twitch.user.id;
			let emotes:string	= "";
			if(localObj.tags.emotes) {
				//Convert parsed emote data to raw data expected by the parser
				const list = (localObj.tags.emotes as unknown) as {emote_id:string, start:number, end:number}[];
				emotes = TwitchUtils.parsedEmoteDataToRawEmoteData(list);
			}

			const sender = StoreProxy.users.getUserFrom("twitch", meID, senderID);
			const receiver = StoreProxy.users.getUserFrom("twitch", meID, receiverID);
			sender.color = localObj.tags.color;
			receiver.color = localObj.recipient.color;
			const chunks = TwitchUtils.parseMessageToChunks(localObj.body, emotes);
			const whisper:TwitchatDataTypes.MessageWhisperData = {
				date:Date.now(),
				id:Utils.getUUID(),
				platform:"twitch",
				type:TwitchatDataTypes.TwitchatMessageType.WHISPER,
				channel_id:meID,
				user:sender,
				to: receiver,
				message: localObj.body,
				message_chunks: chunks,
				message_html: TwitchUtils.messageChunksToHTML(chunks),
				message_size: TwitchUtils.computeMessageSize(chunks),
			}
			StoreProxy.chat.addMessage(whisper);



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


		//sent when a clip is sent on chat (see ChatRichEmbed JSON example).
		}else if(data.type == "chat_rich_embed") {
			//Warning: JSON might be mostly empty/incomplete. Example bellow:
			//{"type":"chat_rich_embed","data":{"message_id":"1fda6833-d53c-44d2-958b-389dd2289ff8","request_url":"https://clips.twitch.tv/","thumbnail_url":"https://clips-media-assets2.twitch.tv/-preview-86x45.jpg","twitch_metadata":{"clip_metadata":{"game":"","channel_display_name":"","slug":"","id":"0","broadcaster_id":"","curator_id":""}}}}



		//Sent when a whisper is read
		}else if(data.type == "thread") {
			data.data = JSON.parse(data.data as string);//for this event it's a string..thanks twitch for your consistency
			this.whisperRead(data.data as PubSubDataTypes.WhisperRead);



		}else if(data.type == "hype-train-approaching") {
			this.hypeTrainApproaching(data.data as  PubSubDataTypes.HypeTrainApproaching, channelId);

		}else if(data.type == "hype-train-start") {
			this.hypeTrainStart(data.data as  PubSubDataTypes.HypeTrainStart, channelId);

		}else if(data.type == "hype-train-progression") {
			this.hypeTrainProgress(data.data as  PubSubDataTypes.HypeTrainProgress, channelId);

		}else if(data.type == "hype-train-level-up") {
			this.hypeTrainLevelUp(data.data as  PubSubDataTypes.HypeTrainLevelUp, channelId);

		}else if(data.type == "hype-train-conductor-update") {
			this.hypeTrainConductorUpdate(data.data as  PubSubDataTypes.HypeTrainConductorUpdate, channelId);

		}else if(data.type == "hype-train-end") {
			this.hypeTrainEnd(data.data as  PubSubDataTypes.HypeTrainEnd, channelId);

		}else if(data.type == "hype-train-cooldown-expiration") {
			const m:TwitchatDataTypes.MessageHypeTrainCooledDownData = {
				id:Utils.getUUID(),
				date:Date.now(),
				platform:"twitch",
				channel_id:channelId,
				type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COOLED_DOWN,
			};
			StoreProxy.chat.addMessage(m)


		//Manage rewards
		}else if(data.type == "reward-redeemed" &&
		(topic!.toLowerCase().indexOf("channel-points-channel") > -1 || topic!.toLowerCase().indexOf("community-points-channel") > -1)) {
			const localObj = data.data as  PubSubDataTypes.RewardData;
			this.rewardEvent(localObj);



		//Channel points challenge progress
		}else if(data.type == "community-goal-contribution") {
			const contrib = (data.data as {timpestamp:string, contribution:PubSubDataTypes.ChannelPointChallengeContribution}).contribution
			this.communityChallengeContributionEvent(contrib);


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



		}else if(data.type == "POLL_CREATE" || data.type == "POLL_UPDATE" || data.type == "POLL_COMPLETE" || data.type == "POLL_TERMINATE" || data.type == "POLL_ARCHIVE") {
			const localObj = data.data as PubSubDataTypes.PollData;
			if(data.type === "POLL_ARCHIVE" && StoreProxy.poll.data?.id != localObj.poll.poll_id) {
				return;
			}
			const isComplete = data.type == "POLL_COMPLETE" || data.type == "POLL_TERMINATE" || data.type == "POLL_ARCHIVE";
			this.pollEvent(localObj, isComplete);



		}else if(data.type == "POLL_MODERATE" || data.type == "POLL_INVALID") {
			// const localObj = data.data as PubSubDataTypes.PollData;
			// TwitchUtils.getPolls(localObj.poll.owned_by);



		}else if(data.type == "event-created" || data.type == "event-updated") {
			const localObj = data.data as PubSubDataTypes.PredictionData;
			this.predictionEvent(localObj);



		// }else if(data.type == "raid_update_v2" && data.raid) {
		// 	const currentRaidInfo = StoreProxy.stream.currentRaid;
		// 	const m:TwitchatDataTypes.RaidInfo = {
		// 		channel_id: channelId,
		// 		user: currentRaidInfo?.user ?? StoreProxy.users.getUserFrom("twitch", channelId, data.raid.target_id, data.raid.target_login, data.raid.target_display_name),
		// 		viewerCount: data.raid.viewer_count,
		// 		startedAt:currentRaidInfo?.startedAt ?? Date.now(),
		// 		timerDuration_s:currentRaidInfo?.timerDuration_s ?? 90,
		// 	};
		// 	StoreProxy.stream.setRaiding(m);

		// }else if(data.type == "raid_cancel_v2") { //|| data.type == "raid_go_v2" //<= removed in favor of eventsub
		// 	StoreProxy.stream.setRaiding();



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
	 * Called when a user redeems a reward
	 */
	private rewardEvent(localObj:PubSubDataTypes.RewardData):void {
		//We subscribe to 2 different events for rewards, one that works on our channel and
		//one that works on other user's channel.
		//Because of this we receive events twice. We filter that here.
		//TODO check if it's usefull to subscribe to "channel-points-channel-v1" for the broadcaster
		//or if the "community-points-channel-v1" could be enough to avoid those duplicates
		if(this.rewardsParsed[localObj.redemption.id] === true) return;
		this.rewardsParsed[localObj.redemption.id] = true;

		const channelId = localObj.redemption.channel_id;
		const img = localObj.redemption.reward.image ?? localObj.redemption.reward.default_image;
		const m:TwitchatDataTypes.MessageRewardRedeemData = {
			id:localObj.redemption.id,
			channel_id:channelId,
			date:Date.now(),
			type:TwitchatDataTypes.TwitchatMessageType.REWARD,
			platform:"twitch",
			reward:{
				id:localObj.redemption.reward.id,
				title:localObj.redemption.reward.title,
				cost:localObj.redemption.reward.cost,
				description:localObj.redemption.reward.prompt,
				color:localObj.redemption.reward.background_color,
				icon:{
					sd:img.url_2x,
					hd:img.url_4x,
				},
			},
			message_size:0,
			redeemId:localObj.redemption.id,
			user:StoreProxy.users.getUserFrom("twitch", channelId, localObj.redemption.user.id, localObj.redemption.user.login, localObj.redemption.user.display_name),
		};
		// m.user.channelInfo[channelId].online = true;
		if(localObj.redemption.user_input) {
			const chunks	= TwitchUtils.parseMessageToChunks(localObj.redemption.user_input, undefined, true);
			m.message		= localObj.redemption.user_input;
			m.message_chunks= chunks;
			m.message_html	= TwitchUtils.messageChunksToHTML(chunks);
			m.message_size	= TwitchUtils.computeMessageSize(chunks);
		}

		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Community challenge contribution
	 */
	private communityChallengeContributionEvent(localObj:PubSubDataTypes.ChannelPointChallengeContribution):void {
		const img = localObj.goal.image ?? localObj.goal.default_image;
		const m:TwitchatDataTypes.MessageCommunityChallengeContributionData =  {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id: localObj.channel_id,
			type:TwitchatDataTypes.TwitchatMessageType.COMMUNITY_CHALLENGE_CONTRIBUTION,
			user: StoreProxy.users.getUserFrom("twitch", localObj.channel_id, localObj.user.id, localObj.user.login, localObj.user.display_name),
			contribution: localObj.amount,
			stream_contribution:localObj.stream_contribution,
			total_contribution:localObj.total_contribution,
			challenge: {
				title:localObj.goal.title,
				goal:localObj.goal.goal_amount,
				progress:localObj.goal.points_contributed,
				progress_percent:parseFloat((localObj.goal.points_contributed/localObj.goal.goal_amount *100).toFixed(1)),
				description:localObj.goal.description,
				icon:{
					sd:img.url_2x,
					hd:img.url_4x,
				},
			}
		};
		// m.user.channelInfo[localObj.channel_id].online = true;
		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Called when a poll event occurs (create/update/close)
	 * @param localObj
	 */
	private pollEvent(localObj:PubSubDataTypes.PollData, isComplete:boolean):void {
		const choices:TwitchatDataTypes.MessagePollDataChoice[] = [];
		let winner!:TwitchatDataTypes.MessagePollDataChoice;
		let winnerValue = -1;
		for (let i = 0; i < localObj.poll.choices.length; i++) {
			const c = localObj.poll.choices[i];
			const entry = { id: c.choice_id, label: c.title, votes: c.votes.total };
			if(entry.votes > winnerValue) {
				winner = entry;
				winnerValue = entry.votes;
			}
			choices.push(entry);
		}

		const me = StoreProxy.auth.twitch.user;
		const poll:TwitchatDataTypes.MessagePollData = {
			date:Date.now(),
			id:localObj.poll.poll_id,
			creator: StoreProxy.users.getUserFrom("twitch", me.id, localObj.poll.created_by),
			platform:"twitch",
			channel_id: localObj.poll.owned_by,
			type:TwitchatDataTypes.TwitchatMessageType.POLL,
			title: localObj.poll.title,
			choices,
			duration_s: localObj.poll.duration_seconds,
			started_at: new Date(localObj.poll.started_at).getTime(),
			ended_at: localObj.poll.ended_at? new Date(localObj.poll.ended_at).getTime() : undefined,
			winner,
		};

		StoreProxy.poll.setCurrentPoll(poll, isComplete);
		if(isComplete) {
			//Clear poll
			StoreProxy.poll.setCurrentPoll(null);
		}
	}

	/**
	 * Called when a prediction event occurs (create/update/close)
	 */
	private predictionEvent(localObj:PubSubDataTypes.PredictionData):void {
		if(localObj.event.status === "CANCEL_PENDING") return;
		if(localObj.event.status === "CANCELED") {
			StoreProxy.prediction.setPrediction(null);
			return;
		}
		let totalPoints = 0;
		let totalUsers = 0;
		const isComplete = localObj.event.status == "RESOLVED";
		const outcomes:TwitchatDataTypes.MessagePredictionDataOutcome[] = [];
		for (let i = 0; i < localObj.event.outcomes.length; i++) {
			const c = localObj.event.outcomes[i];
			totalPoints += c.total_points;
			totalUsers += c.total_users;
			outcomes.push({
				id: c.id,
				label: c.title,
				votes: c.total_points,
				voters: c.total_users,
			})
		}
		const me = StoreProxy.auth.twitch.user;
		const prediction:TwitchatDataTypes.MessagePredictionData = {
			date:Date.now(),
			id:localObj.event.id,
			creator: StoreProxy.users.getUserFrom("twitch", me.id, localObj.event.created_by.user_id, localObj.event.created_by.user_display_name.toLowerCase(), localObj.event.created_by.user_display_name),
			platform:"twitch",
			channel_id: localObj.event.channel_id,
			type:TwitchatDataTypes.TwitchatMessageType.PREDICTION,
			title: localObj.event.title,
			outcomes,
			pendingAnswer: localObj.event.status === "RESOLVE_PENDING" || localObj.event.status === "LOCKED",
			started_at: new Date(localObj.event.created_at).getTime(),
			duration_s: localObj.event.prediction_window_seconds,
			totalPoints,
			totalUsers,
		};
		if(localObj.event.ended_at) {
			prediction.ended_at = new Date(localObj.event.ended_at).getTime()
		}
		if(localObj.event.winning_outcome_id) {
			prediction.winner = outcomes.find(v => v.id == localObj.event.winning_outcome_id);
		}

		StoreProxy.prediction.setPrediction(prediction, isComplete);
		if(isComplete) {
			//Clear prediction
			StoreProxy.prediction.setPrediction(null);
		}
	}


	/**
	 * Called when a hype train approaches
	 * @param data
	 */
	private hypeTrainApproaching(data:PubSubDataTypes.HypeTrainApproaching, channelId:string):void {
		const key = Object.keys(data.events_remaining_durations)[0];
		const wasAlreadyApproaching = StoreProxy.stream.hypeTrain != undefined;
		const train:TwitchatDataTypes.HypeTrainStateData = {
			channel_id:data.channel_id,
			level:1,
			currentValue:0,
			goal:data.goal,
			approached_at:StoreProxy.stream.hypeTrain?.approached_at ?? Date.now(),
			started_at:Date.now(),
			updated_at:Date.now(),
			timeLeft_s:data.events_remaining_durations[key],
			state: "APPROACHING",
			is_boost_train:data.is_boost_train,
			is_golden_kappa:data.is_golden_kappa_train == true,
			is_new_record:false,
			rawData:data,
		};
		StoreProxy.stream.setHypeTrain(train);

		//Hide "hypetrain approaching" notification if expired
		this.hypeTrainApproachingTimer = window.setTimeout(()=> {
			StoreProxy.stream.setHypeTrain(undefined);
		}, train.timeLeft_s * 1000);

		if(!wasAlreadyApproaching) {
			const message:TwitchatDataTypes.MessageHypeTrainEventData = {
				channel_id:data.channel_id,
				platform:"twitch",
				date:Date.now(),
				id:Utils.getUUID(),
				type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING,
				train,
				level:0,
				percent:0,
			}
			StoreProxy.chat.addMessage(message);
		}
	}

	/**
	 * Called when a hype train starts
	 * @param data
	 */
	private hypeTrainStart(data:PubSubDataTypes.HypeTrainStart, channelId:string):void {
		clearTimeout(this.hypeTrainApproachingTimer);
		const storeTrain = StoreProxy.stream.hypeTrain;
		const train:TwitchatDataTypes.HypeTrainStateData = {
			channel_id:channelId,
			level:data.progress.level.value,
			currentValue:data.progress.value || data.progress.progression,//Pubsub sometimes uses "value", sometimes "progression"
			goal:data.progress.goal,
			approached_at:storeTrain?.approached_at ?? Date.now(),
			started_at:Date.now(),
			updated_at:Date.now(),
			timeLeft_s:5 * 60 * 1000,//Need to hardcode it, not sent from pubsub anymore -_-
			state: "START",
			is_boost_train:false,
			is_golden_kappa:storeTrain?.is_golden_kappa || data.isGoldenKappaTrain === true || data.is_golden_kappa_train === true,
			is_new_record:false,
			conductor_bits:storeTrain?.conductor_bits,
			conductor_subs:storeTrain?.conductor_subs,
			rawData:data,
		};

		//This line makes debug easier if I wanna start the train at any
		//point of its timeline
		if(!train.approached_at) train.approached_at = Date.now();

		StoreProxy.stream.setHypeTrain(train);
		const message:TwitchatDataTypes.MessageHypeTrainEventData = {
			channel_id:channelId,
			platform:"twitch",
			date:Date.now(),
			id:Utils.getUUID(),
			type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START,
			train,
			level:train.level,
			percent:Math.round(train.currentValue/train.goal * 100),
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when a hype train is progressing (new sub/bits)
	 * @param data
	 */
	private hypeTrainProgress(data:PubSubDataTypes.HypeTrainProgress, channelId:string):void {
		clearTimeout(this.hypeTrainApproachingTimer);//Shouldn't be necessary, kind of a failsafe
		clearTimeout(this.hypeTrainProgressTimer);
		//postepone the progress event in case it's followed by a LEVEL UP event to avoid
		//having kind of two similar events
		this.hypeTrainProgressTimer = window.setTimeout(()=> {
			const storeTrain = StoreProxy.stream.hypeTrain;
			const prevLevel = storeTrain?.level ?? 0;
			const prevValue = storeTrain?.currentValue ?? 0;
			//Makes sure that if a progress event follows the LEVEL UP event, only
			//the LEVEL UP event is handled.
			//ame goal as the window.setTimeout() above but if the events order is reversed
			if(data.progress.value == prevLevel && data.progress.level.value == prevValue) {
				//Make sure 2 identical progress events are not processed
				return;
			}
			const train:TwitchatDataTypes.HypeTrainStateData = {
				channel_id:channelId ?? storeTrain?.channel_id ?? StoreProxy.auth.twitch.user.id,
				level:data.progress.level.value,
				currentValue:data.progress.value ?? data.progress.progression,
				goal:data.progress.goal,
				approached_at:storeTrain?.approached_at ?? Date.now(),
				started_at:storeTrain?.started_at ?? Date.now(),
				updated_at:Date.now(),
				timeLeft_s:data.progress.remaining_seconds,
				state: "PROGRESSING",
				is_boost_train:data.is_boost_train,
				is_golden_kappa:storeTrain?.is_golden_kappa || false,
				is_new_record:false,
				conductor_bits:storeTrain?.conductor_bits,
				conductor_subs:storeTrain?.conductor_subs,
				rawData:data,
			};

			//This line makes debug easier if I wanna start the train at any
			//point of its timeline
			if(!train.approached_at)	train.approached_at = Date.now();
			if(!train.started_at)		train.started_at = Date.now();

			StoreProxy.stream.setHypeTrain(train);
			const message:TwitchatDataTypes.MessageHypeTrainEventData = {
				channel_id:channelId ?? storeTrain?.channel_id ?? StoreProxy.auth.twitch.user.id,
				platform:"twitch",
				date:Date.now(),
				id:Utils.getUUID(),
				type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS,
				train,
				level:train.level,
				percent:Math.round(train.currentValue/train.goal * 100),
			}
			StoreProxy.chat.addMessage(message);
		}, 1000)
	}

	/**
	 * Called when a hype train levels up
	 * @param data
	 */
	private hypeTrainLevelUp(data:PubSubDataTypes.HypeTrainLevelUp, channelId:string):void {
		clearTimeout(this.hypeTrainApproachingTimer);//Shouldn't be necessary, kind of a failsafe
		clearTimeout(this.hypeTrainProgressTimer);
		const storeTrain = StoreProxy.stream.hypeTrain;
		const train:TwitchatDataTypes.HypeTrainStateData = {
			channel_id:channelId ?? storeTrain?.channel_id ?? StoreProxy.auth.twitch.user.id,
			level:data.progress.level.value,
			currentValue:data.progress.value ?? data.progress.progression,
			goal:data.progress.goal,
			approached_at:storeTrain?.approached_at ?? Date.now(),
			started_at:storeTrain?.started_at ?? Date.now(),
			updated_at:Date.now(),
			timeLeft_s:data.progress.remaining_seconds,
			state: "LEVEL_UP",
			is_boost_train:data.is_boost_train,
			is_golden_kappa:data.hype_train.isGoldenKappaTrain || storeTrain?.is_golden_kappa || false,
			is_new_record:storeTrain?.is_new_record ?? false,
			conductor_bits:storeTrain?.conductor_bits,
			conductor_subs:storeTrain?.conductor_subs,
			rawData:data,
		};

		//This line makes debug easier if I wanna start the train at any
		//point of its timeline
		if(!train.approached_at) train.approached_at = Date.now();
		if(!train.started_at) train.started_at = Date.now();

		StoreProxy.stream.setHypeTrain(train);
		const message:TwitchatDataTypes.MessageHypeTrainEventData = {
			channel_id:channelId ?? storeTrain?.channel_id ?? StoreProxy.auth.twitch.user.id,
			platform:"twitch",
			date:Date.now(),
			id:Utils.getUUID(),
			type:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS,
			train,
			level:train.level,
			percent:Math.round(train.currentValue/train.goal * 100),
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when a hype train conductor changes
	 * @param data
	 */
	private async hypeTrainConductorUpdate(data:PubSubDataTypes.HypeTrainConductorUpdate, channelId:string):Promise<void> {
		const storeTrain = StoreProxy.stream.hypeTrain!;
		if(storeTrain) {
			const contributions:TwitchatDataTypes.HypeTrainConductorContributionsData[] = [];
			type keys = keyof typeof data.participations;
			for (const key in data.participations) {
				const value = data.participations[key as keys];
				switch(key) {
					case "BITS.CHEER":				contributions.push({bits:value}); break;
					case "SUBS.TIER_1_SUB":			contributions.push({sub_t1:value}); break;
					case "SUBS.TIER_2_SUB":			contributions.push({sub_t2:value}); break;
					case "SUBS.TIER_3_SUB":			contributions.push({sub_t3:value}); break;
					case "SUBS.TIER_1_GIFTED_SUB":	contributions.push({subgift_t1:value}); break;
					case "SUBS.TIER_2_GIFTED_SUB":	contributions.push({subgift_t2:value}); break;
					case "SUBS.TIER_3_GIFTED_SUB":	contributions.push({subgift_t3:value}); break;
				}
			}
			const user = await StoreProxy.users.getUserFrom("twitch", channelId, data.user.id, data.user.login, data.user.display_name);
			user.avatarPath = data.user.profile_image_url;
			if(data.source === "BITS") {
				storeTrain.conductor_bits = {
					type:"BITS",
					user,
					contributions,
				}
			}
			if(data.source === "SUBS") {
				storeTrain.conductor_subs = {
					type:"SUBS",
					user,
					contributions,
				}
			}
		}
	}

	/**
	 * Called when a hype train completes or expires
	 * @param data
	 */
	private hypeTrainEnd(data:PubSubDataTypes.HypeTrainEnd, channelId:string):void {
		const storeTrain = StoreProxy.stream.hypeTrain!;

		if(!storeTrain) return;
		const train:TwitchatDataTypes.HypeTrainStateData = {
			channel_id:channelId ?? storeTrain?.channel_id ?? StoreProxy.auth.twitch.user.id,
			level: storeTrain.level,
			currentValue: storeTrain.currentValue,
			goal: storeTrain.goal,
			approached_at: storeTrain.approached_at,
			started_at: storeTrain.started_at,
			updated_at: storeTrain.updated_at,
			timeLeft_s: storeTrain.timeLeft_s,
			state: data.ending_reason,
			is_boost_train: storeTrain.is_boost_train,
			is_golden_kappa:storeTrain.is_golden_kappa,
			is_new_record:storeTrain.is_new_record,
			conductor_bits:storeTrain.conductor_bits,
			conductor_subs:storeTrain.conductor_subs,
			rawData:data,
		};
		StoreProxy.stream.setHypeTrain(train);


		window.setTimeout(()=> {
			if(Math.random() > .5) {
				//Randomly log hype trains to help me debugging constantly changing data
				const version = import.meta.env.PACKAGE_VERSION;
				ApiHelper.call("log", "POST", {cat:"hypetrain", log:{reason:"TRAIN END", tt_v:version, data:train}});
			}
			
			//Hide hype train popin
			StoreProxy.stream.setHypeTrain(undefined);
		}, 5000)

		//Remove one level if 100% not reached
		// let level = storeData.level;
		// if(storeData.currentValue < storeData.goal) level --;
		const message:TwitchatDataTypes.MessageHypeTrainEventData = {
			channel_id:channelId ?? storeTrain?.channel_id ?? StoreProxy.auth.twitch.user.id,
			platform:"twitch",
			date:Date.now(),
			id:Utils.getUUID(),
			type: data.ending_reason == "COMPLETED"?
					TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE
					:
					TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL,
			train,
			level:storeTrain.level,
			percent:Math.round(storeTrain.currentValue/storeTrain.goal * 100),
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when whispers are read
	 */
	private whisperRead(data:PubSubDataTypes.WhisperRead):void {
		data;//
		// StoreProxy.store.dispatch("closeWhispers", data.id.split("_")[1]);
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
	export const HypeTrainApproaching = {"type":"hype-train-approaching","data":{"channel_id":"227146018","goal":3,"events_remaining_durations":{"1":252},"level_one_rewards":[{"type":"EMOTE","id":"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCool"},{"type":"EMOTE","id":"emotesv2_036fd741be4141198999b2ca4300668e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLove1"},{"type":"EMOTE","id":"emotesv2_3114c3d12dc44f53810140f632128b54","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeSleep"},{"type":"EMOTE","id":"emotesv2_7d457ecda087479f98501f80e23b5a04","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePat"},{"type":"EMOTE","id":"emotesv2_e7a6e7e24a844e709c4d93c0845422e1","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLUL"}],"creator_color":"00AA7F","participants":["38001049","59580201"],"approaching_hype_train_id":"fbafb76e-0447-49ca-b008-c954f374be33","is_boost_train":false}};
	export const HypeTrainStart = {"type":"hype-train-start","data":{"channel_id":"227146018","id":"fbafb76e-0447-49ca-b008-c954f374be33","started_at":1648207198000,"expires_at":1648207498000,"updated_at":1648207198000,"ended_at":null,"ending_reason":null,"isGoldenKappaTrain":false,"config":{"channel_id":"227146018","is_enabled":true,"islisted":true,"kickoff":{"num_of_events":3,"min_points":100,"duration":300000000000},"cooldown_duration":3600000000000,"level_duration":300000000000,"difficulty":"EASY","reward_end_date":null,"participation_conversion_rates":{"BITS.CHEER":1,"BITS.EXTENSION":1,"BITS.POLL":1,"SUBS.TIER_1_GIFTED_SUB":500,"SUBS.TIER_1_SUB":500,"SUBS.TIER_2_GIFTED_SUB":1000,"SUBS.TIER_2_SUB":1000,"SUBS.TIER_3_GIFTED_SUB":2500,"SUBS.TIER_3_SUB":2500},"notification_thresholds":{"BITS.CHEER":1000,"BITS.EXTENSION":1000,"BITS.POLL":1000,"SUBS.TIER_1_GIFTED_SUB":5,"SUBS.TIER_1_SUB":5,"SUBS.TIER_2_GIFTED_SUB":5,"SUBS.TIER_2_SUB":5,"SUBS.TIER_3_GIFTED_SUB":5,"SUBS.TIER_3_SUB":5},"difficulty_settings":{"EASY":[{"value":1,"goal":1600,"rewards":[{"type":"EMOTE","id":"emotesv2_e7a6e7e24a844e709c4d93c0845422e1","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLUL"},{"type":"EMOTE","id":"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCool"},{"type":"EMOTE","id":"emotesv2_036fd741be4141198999b2ca4300668e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLove1"},{"type":"EMOTE","id":"emotesv2_3114c3d12dc44f53810140f632128b54","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeSleep"},{"type":"EMOTE","id":"emotesv2_7d457ecda087479f98501f80e23b5a04","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePat"}],"impressions":300},{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_0457808073314f62962554c12ebb6b4d","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHands1"},{"type":"EMOTE","id":"emotesv2_8c40cd16027f48c0a70ac7b1fa1c397e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHands2"},{"type":"EMOTE","id":"emotesv2_0330a84e75ad48c1821c1d29a7dadd4d","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeFail"},{"type":"EMOTE","id":"emotesv2_9b68a8fa2f1d457496ac016b251e06b6","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHai"},{"type":"EMOTE","id":"emotesv2_9bcc622c0b2a48b180a159c25a2b8245","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeNom"}],"impressions":600},{"value":3,"goal":5500,"rewards":[{"type":"EMOTE","id":"emotesv2_08abf0cd0e78494a9da8a2315c3648f4","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeBLEH"},{"type":"EMOTE","id":"emotesv2_ccc146905a694f3b8df390f55e34002a","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeApplause"},{"type":"EMOTE","id":"emotesv2_4918bd32ff5b476f82bda49f3e958767","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeRage"},{"type":"EMOTE","id":"emotesv2_7d01d1cf36b549098434c7a6e50a8828","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeMwah"},{"type":"EMOTE","id":"emotesv2_43da115e6b6749828f7dee47d17dd315","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeHuh"}],"impressions":900},{"value":4,"goal":7800,"rewards":[{"type":"EMOTE","id":"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeWave"},{"type":"EMOTE","id":"emotesv2_271ea48a09ca418baad2ea1f734ab09e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeReading"},{"type":"EMOTE","id":"emotesv2_1337536bcecf49f4bb9cd1a699341ee2","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeShock"},{"type":"EMOTE","id":"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeStress"},{"type":"EMOTE","id":"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCry"}],"impressions":1200},{"value":5,"goal":10800,"rewards":[{"type":"EMOTE","id":"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCheer"},{"type":"EMOTE","id":"emotesv2_1630ff0e5ff34a808f4b25320a540ee7","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLurk"},{"type":"EMOTE","id":"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePopcorn"},{"type":"EMOTE","id":"emotesv2_1885b5088372466b800789b02daf7b65","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeEvil"},{"type":"EMOTE","id":"emotesv2_85a13cc47247425fa152b9292c4589a9","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeAwww"}],"impressions":1500}]},"conductor_rewards":{"BITS":{"CURRENT":[{"type":"BADGE","id":"1","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsxOzIyNzE0NjAxOA==","image_url":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2"}],"FORMER":[{"type":"BADGE","id":"2","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsyOzIyNzE0NjAxOA==","image_url":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2"}]},"SUBS":{"CURRENT":[{"type":"BADGE","id":"1","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsxOzIyNzE0NjAxOA==","image_url":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2"}],"FORMER":[{"type":"BADGE","id":"2","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsyOzIyNzE0NjAxOA==","image_url":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2"}]}},"callout_emote_id":"emotesv2_cfe2a115df084866815c8595f849a5b8","callout_emote_token":"cabridMwaller","use_creator_color":true,"primary_hex_color":"00AA7F","use_personalized_settings":false,"has_conductor_badges":true,"boost_train_config":{"twitch_impressions":{"EASY":500,"HARD":500,"INSANE":500,"MEDIUM":500,"SUPER HARD":500}}},"participations":{"BITS.CHEER":100,"SUBS.TIER_1_GIFTED_SUB":2},"conductors":{},"progress":{"level":{"value":1,"goal":1600,"rewards":[{"type":"EMOTE","id":"emotesv2_e7a6e7e24a844e709c4d93c0845422e1","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLUL"},{"type":"EMOTE","id":"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCool"},{"type":"EMOTE","id":"emotesv2_036fd741be4141198999b2ca4300668e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLove1"},{"type":"EMOTE","id":"emotesv2_3114c3d12dc44f53810140f632128b54","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeSleep"},{"type":"EMOTE","id":"emotesv2_7d457ecda087479f98501f80e23b5a04","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePat"}],"impressions":300},"value":1100,"goal":1600,"total":1100,"remaining_seconds":299},"is_boost_train":false}};
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
	export const ChatRichEmbed = {"type":"chat_rich_embed","data":{"message_id":"7210d939-72b7-44a1-b711-4030c12088a4","request_url":"https://clips.twitch.tv/BumblingTriangularWitchMrDestructoid-QqRP6nMJmsWqb8B2","author_name":"Durss","thumbnail_url":"https://clips-media-assets2.twitch.tv/77t1WEKkT-pzCZrFqm_Adg/AT-cm%7C77t1WEKkT-pzCZrFqm_Adg-preview-86x45.jpg","title":"Live chill","twitch_metadata":{"clip_metadata":{"game":"Art","channel_display_name":"EncreMecanique","slug":"BumblingTriangularWitchMrDestructoid-QqRP6nMJmsWqb8B2","id":"3965327491","broadcaster_id":"190145142","curator_id":"29961813"}}}};
	export const RoomStatusUpdate = {"type":"updated_room","data":{"room":{"channel_id":"29961813","modes":{"followers_only_duration_minutes":30,"emote_only_mode_enabled":false,"r9k_mode_enabled":false,"subscribers_only_mode_enabled":false,"verified_only_mode_enabled":true,"slow_mode_duration_seconds":null,"slow_mode_set_at":"0001-01-01T00:00:00Z","account_verification_options":{"subscribers_exempt":true,"moderators_exempt":true,"vips_exempt":true,"phone_verification_mode":0,"email_verification_mode":2,"partial_phone_verification_config":{"restrict_first_time_chatters":true,"restrict_based_on_follower_age":true,"restrict_based_on_account_age":true,"minimum_follower_age_in_minutes":1440,"minimum_account_age_in_minutes":10080},"partial_email_verification_config":{"restrict_first_time_chatters":true,"restrict_based_on_follower_age":true,"restrict_based_on_account_age":true,"minimum_follower_age_in_minutes":1440,"minimum_account_age_in_minutes":10080}}},"rules":["Sois un amour de princesse ❤"]}}};
	export const ChannelPointChallengeContribution = {"type":"community-goal-contribution","data":{"timestamp":"2022-09-18T19:09:02.474511122Z","contribution":{"channel_id":"29961813","goal":{"id":"b34f2f91-89d7-4342-b221-b1cbc4e0d5c6","channel_id":"29961813","title":"My awesome challenge","description":"This is the channel point challenge description","goal_type":"CREATOR","is_in_stock":true,"goal_amount":100000,"points_contributed":10800,"small_contribution":250,"per_stream_maximum_user_contribution":2000,"status":"STARTED","duration_days":30,"started_at":"2022-09-16T17:00:49.967911644Z","ended_at":"2022-10-16T17:00:49.967911644Z","background_color":"#FF38DB","default_image":{"url_1x":"https://static-cdn.jtvnw.net/community-goal-images/default-1.png","url_2x":"https://static-cdn.jtvnw.net/community-goal-images/default-2.png","url_4x":"https://static-cdn.jtvnw.net/community-goal-images/default-4.png"},"image":{"url_1x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-1.png","url_2x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-2.png","url_4x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-4.png"}},"user":{"id":"29961813","login":"durss","display_name":"durss"},"amount":800,"stream_contribution":800,"total_contribution":800}}};
	export const ExtensionMessage = {"type":"extension_message","data":{"id":"08ed2f63-3c3b-42f4-8c9b-a8cdd62fa241","sent_at":"2022-09-28T18:29:25.593540319Z","content":{"text":"DurssBot SLAPPED A What the Duck? STICKER FOR 0 Bits","fragments":[{"text":"DurssBot SLAPPED A What the Duck? STICKER FOR 0 Bits"}]},"sender":{"extension_client_id":"5tbyqce941455yffg7fzg36tp6or8p","extension_version":"4.3.4","display_name":"Stream Stickers","chat_color":"#5f9ea0","badges":[{"id":"extension","version":"1"}]}}};
	export const FollowEvent = {"display_name":"DurssBot","username":"durssbot","user_id":"647389082"};
	export const RaiderHighlight = {"type":"chat-highlight","data":{"channel_id":"43809079","user_id":"45993015","msg_id":"5eb568d3-ae89-4ef1-bb90-51a1873c803c","highlights":[{"type":"raider","source_channel_id":"45993015","seconds_since_event":625}],"chat_sent_at":"2023-03-14T22:49:54.264262873Z","highlights_sent_at":"2023-03-14T22:49:54.396583087Z"}};
	export const ReturningHighlight = {"type":"chat-highlight","data":{"channel_id":"684410546","user_id":"89977877","msg_id":"efb2b09c-3dc8-46cf-acfa-4d8a99518f8c","highlights":[{"type":"returning_chatter","source_channel_id":"684410546"}],"chat_sent_at":"2023-04-24T21:40:43.110448688Z","highlights_sent_at":"2023-04-24T21:40:43.252016329Z"}};

	export const RealHypeTrainData =[
		{"type":"hype-train-approaching","data":{"channel_id":"93606527","goal":3,"events_remaining_durations":{"1":193},"level_one_rewards":[{"type":"EMOTE","id":"emotesv2_aa8db3de21e1465dab81bedfa47e29f2","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"MegaConsume","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_a3cdcbfcae9b41bb8215b012362eea35","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"FrogPonder","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_7fa0ba50748c418d956afa59c2e94883","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"ChillGirl","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_92d34a3642744c6bb540b091d3e9e9b0","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"ButtonMash","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"BatterUp","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_692f743d3e7147068bb1ddf842f9b99d","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"GoodOne","reward_end_date":"0001-01-01T00:00:00Z"}],"creator_color":"6618C4","participants":["106410077","658312617"],"approaching_hype_train_id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","is_boost_train":false,"is_golden_kappa_train":false,"expires_at":"2024-07-25T16:06:20.093881951Z"}},
		{"type":"hype-train-start","data":{"channel_id":"93606527","id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","started_at":1721923464000,"expires_at":1721923764000,"updated_at":1721923464000,"ended_at":null,"ending_reason":null,"config":{"channel_id":"93606527","is_enabled":true,"is_whitelisted":true,"kickoff":{"num_of_events":3,"min_points":100,"duration":300000000000},"cooldown_duration":3600000000000,"level_duration":300000000000,"difficulty":"EASY","reward_end_date":null,"participation_conversion_rates":{"BITS.CHEER":1,"BITS.EXTENSION":1,"BITS.POLL":1,"RAID.RAID":0,"SUBS.TIER_1_GIFTED_SUB":500,"SUBS.TIER_1_SUB":500,"SUBS.TIER_2_GIFTED_SUB":1000,"SUBS.TIER_2_SUB":1000,"SUBS.TIER_3_GIFTED_SUB":2500,"SUBS.TIER_3_SUB":2500},"currency_conversion_rates":{"AED":0.27,"AFN":0.012,"ALL":0.01,"AMD":0.0026,"AOA":0.0013,"ARS":0.004,"AUD":0.625,"AWG":0.55,"AZN":0.59,"BAM":0.56,"BBD":0.49,"BDT":0.0092,"BGN":0.56,"BHD":2.65,"BIF":0.00035,"BMD":1,"BND":0.74,"BOB":0.14,"BRL":0.16666667,"BSD":1,"BTN":0.012,"BWP":0.075,"BYN":0.39,"BZD":0.49,"CAD":0.76923077,"CDF":0.00042,"CHF":1,"CLP":0.12,"CNY":0.14,"COP":0.00024,"CRC":0.0018,"CUP":0.041,"CVE":0.0099,"CZK":0.046,"DJF":0.0056,"DKK":0.15,"DOP":0.018,"DZD":0.0074,"EGP":0.032,"ERN":0.066667,"ETB":0.018,"EUR":1,"FJD":0.45,"FKP":1.278,"GBP":1.27,"GEL":0.38,"GHS":0.088,"GIP":1.27682,"GMD":0.017,"GNF":0.00012,"GTQ":0.13,"GYD":0.0047,"HKD":0.13,"HNL":0.04,"HRK":0.145382,"HTG":0.0072,"HUF":0.003,"IDR":0.000067,"ILS":0.28,"INR":0.012,"IQD":0.00076,"IRR":0.000024,"ISK":0.0074,"JMD":0.0064,"JOD":1.41,"JPY":0.666667,"KES":0.0072,"KGS":0.011,"KHR":0.00024,"KMF":0.0022,"KPW":0.001111,"KRW":0.075,"KWD":3.25,"KYD":1.2,"KZT":0.0022,"LAK":0.000054,"LBP":0.000066,"LKR":0.0032,"LRD":0.0056,"LSL":0.054,"LYD":0.21,"MAD":0.1,"MDL":0.056,"MGA":0.00022,"MKD":0.018,"MMK":0.00047,"MNT":0.000289055,"MOP":0.12,"MRO":0.029,"MUR":0.022,"MVR":0.065,"MWK":0.00098,"MXN":0.05,"MYR":0.21,"MZN":0.016,"NAD":0.054,"NGN":0.0014,"NIO":0.027,"NOK":0.08196721,"NPR":0.0076,"NZD":0.62,"OMR":2.6,"PAB":1,"PEN":0.27,"PGK":0.28,"PHP":0.018,"PKR":0.0035,"PLN":0.25,"PYG":0.00014,"QAR":0.27,"RON":0.22,"RSD":0.0093,"RUB":0.012,"RWF":0.00086,"SAR":0.27,"SBD":0.12,"SCR":0.075,"SDG":0.0017,"SEK":0.07692308,"SGD":0.74,"SHP":1.27446,"SLL":0.000051,"SOS":0.0018,"SRD":0.026,"SSP":0.007677,"STD":0.0000444777,"SYP":0.000398,"SZL":0.054,"THB":0.028,"TJS":0.091,"TMT":0.29,"TND":0.32,"TOP":0.43,"TRY":0.041111,"TTD":0.15,"TWD":0.03333333,"TZS":0.00042,"UAH":0.027,"UGX":0.00027,"USD":1,"UYU":0.026,"UZS":0.000087,"VEF":3.66782e-7,"VND":0.000043,"VUV":0.00847045,"WST":0.369869,"XAF":0.0017,"XCD":0.37,"XOF":0.0017,"XPF":0.0091,"YER":0.004,"ZAR":0.054,"ZMW":0.056,"ZWL":0.003106},"notification_thresholds":{"BITS.CHEER":1000,"BITS.EXTENSION":1000,"BITS.POLL":1000,"SUBS.TIER_1_GIFTED_SUB":5,"SUBS.TIER_1_SUB":5,"SUBS.TIER_2_GIFTED_SUB":5,"SUBS.TIER_2_SUB":5,"SUBS.TIER_3_GIFTED_SUB":5,"SUBS.TIER_3_SUB":5},"difficulty_settings":{"EASY":[{"value":1,"goal":1600,"rewards":[{"type":"EMOTE","id":"emotesv2_a3cdcbfcae9b41bb8215b012362eea35","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"FrogPonder","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_7fa0ba50748c418d956afa59c2e94883","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"ChillGirl","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_92d34a3642744c6bb540b091d3e9e9b0","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"ButtonMash","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"BatterUp","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_692f743d3e7147068bb1ddf842f9b99d","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"GoodOne","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_aa8db3de21e1465dab81bedfa47e29f2","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"MegaConsume","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"AGiftForYou","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"KittyHype","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_da6ee66bc259434085eb866429687941","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"DangerDance","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"PersonalBest","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"HenloThere","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"GimmeDat","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":3,"goal":5500,"rewards":[{"type":"EMOTE","id":"emotesv2_2a52b54c6fb04a6fbb6b9eb51fa8e0d0","group_id":"","reward_level":0,"set_id":"db68b384-8eae-470e-9cde-2945ac64fd7d","token":"MegaMlep","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_91b3e913c6484fca894830ab953aa16b","group_id":"","reward_level":0,"set_id":"db68b384-8eae-470e-9cde-2945ac64fd7d","token":"RawkOut","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_8120b15b9e054b31a200a5cb6cade4c7","group_id":"","reward_level":0,"set_id":"db68b384-8eae-470e-9cde-2945ac64fd7d","token":"FallDamage","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_a83f8ade02cd4b37b8ae079584407c66","group_id":"","reward_level":0,"set_id":"db68b384-8eae-470e-9cde-2945ac64fd7d","token":"RedCard","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_c3db311615df4ecb9e3be0c492fbfc8b","group_id":"","reward_level":0,"set_id":"db68b384-8eae-470e-9cde-2945ac64fd7d","token":"ApplauseBreak","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_871fb6fa55d54fae8e807198c59e082f","group_id":"","reward_level":0,"set_id":"db68b384-8eae-470e-9cde-2945ac64fd7d","token":"TouchOfSalt","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":4,"goal":7800,"rewards":[{"type":"EMOTE","id":"emotesv2_3e61175d445245838665fff146bd2bb0","group_id":"","reward_level":0,"set_id":"2a3ad2cf-0072-474e-87b9-8abf86116202","token":"KittyLove","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_8b79f878cfff4671ae0fb7522c69ea07","group_id":"","reward_level":0,"set_id":"2a3ad2cf-0072-474e-87b9-8abf86116202","token":"TurnUp","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_1cce76af186d4022821e8e67bb367055","group_id":"","reward_level":0,"set_id":"2a3ad2cf-0072-474e-87b9-8abf86116202","token":"CatScare","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_e8236afbc65347ebb4938c6507a78012","group_id":"","reward_level":0,"set_id":"2a3ad2cf-0072-474e-87b9-8abf86116202","token":"LateSave","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_94736686188047bab48c9e2ca9666496","group_id":"","reward_level":0,"set_id":"2a3ad2cf-0072-474e-87b9-8abf86116202","token":"NoTheyDidNot","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_cef4e35f8d134fbc8172fe622bc51bfe","group_id":"","reward_level":0,"set_id":"2a3ad2cf-0072-474e-87b9-8abf86116202","token":"BeholdThis","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":5,"goal":10800,"rewards":[{"type":"EMOTE","id":"emotesv2_1d68d57fa07a4636aa3325e95c85f19a","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"RaccoonPop","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_f033a950174e447cb68a3380ed9da914","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GoblinJam","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b13f48e4ca704d1cb13123631467616e","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"YouMissed","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_c7aefc45412147b284273098a518c94b","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GriddyGoose","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b308322f860543f78e046294a9614c68","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"CheersToThat","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_827188949087491ab7d44ecfbfb4e58c","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"StirThePot","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":6,"goal":14500,"rewards":[{"type":"EMOTE","id":"emotesv2_1d68d57fa07a4636aa3325e95c85f19a","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"RaccoonPop","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_f033a950174e447cb68a3380ed9da914","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GoblinJam","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b13f48e4ca704d1cb13123631467616e","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"YouMissed","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_c7aefc45412147b284273098a518c94b","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GriddyGoose","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b308322f860543f78e046294a9614c68","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"CheersToThat","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_827188949087491ab7d44ecfbfb4e58c","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"StirThePot","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":7,"goal":19200,"rewards":[{"type":"EMOTE","id":"emotesv2_1d68d57fa07a4636aa3325e95c85f19a","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"RaccoonPop","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_f033a950174e447cb68a3380ed9da914","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GoblinJam","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b13f48e4ca704d1cb13123631467616e","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"YouMissed","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_c7aefc45412147b284273098a518c94b","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GriddyGoose","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b308322f860543f78e046294a9614c68","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"CheersToThat","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_827188949087491ab7d44ecfbfb4e58c","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"StirThePot","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":8,"goal":25100,"rewards":[{"type":"EMOTE","id":"emotesv2_1d68d57fa07a4636aa3325e95c85f19a","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"RaccoonPop","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_f033a950174e447cb68a3380ed9da914","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GoblinJam","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b13f48e4ca704d1cb13123631467616e","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"YouMissed","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_c7aefc45412147b284273098a518c94b","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GriddyGoose","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b308322f860543f78e046294a9614c68","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"CheersToThat","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_827188949087491ab7d44ecfbfb4e58c","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"StirThePot","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":9,"goal":32300,"rewards":[{"type":"EMOTE","id":"emotesv2_1d68d57fa07a4636aa3325e95c85f19a","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"RaccoonPop","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_f033a950174e447cb68a3380ed9da914","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GoblinJam","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b13f48e4ca704d1cb13123631467616e","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"YouMissed","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_c7aefc45412147b284273098a518c94b","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GriddyGoose","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b308322f860543f78e046294a9614c68","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"CheersToThat","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_827188949087491ab7d44ecfbfb4e58c","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"StirThePot","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":10,"goal":41100,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":11,"goal":51700,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":12,"goal":64300,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":13,"goal":79000,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":14,"goal":96100,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":15,"goal":115800,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":16,"goal":138200,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":17,"goal":163600,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":18,"goal":192200,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":19,"goal":224200,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":20,"goal":259700,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":21,"goal":299000,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":22,"goal":342300,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":23,"goal":389700,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":24,"goal":441500,"rewards":[{"type":"EMOTE","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"BleedPurpleHD","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":25,"goal":497900,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":26,"goal":559100,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":27,"goal":625200,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":28,"goal":696500,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":29,"goal":773200,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":30,"goal":855400,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":31,"goal":943400,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":32,"goal":1037400,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":33,"goal":1137600,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":34,"goal":1244100,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":35,"goal":1357200,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":36,"goal":1477100,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":37,"goal":1603900,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":38,"goal":1737900,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":39,"goal":1879300,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":40,"goal":2028300,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":41,"goal":2185000,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":42,"goal":2349700,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":43,"goal":2522600,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":44,"goal":2703800,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":45,"goal":2893600,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":46,"goal":3092200,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":47,"goal":3299800,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":48,"goal":3516500,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":49,"goal":3742600,"rewards":[{"type":"EMOTE","id":"emotesv2_132feb3980ee410e856244931d63fd31","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"HeyHeyGuys","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":50,"goal":3978200,"rewards":[{"type":"EMOTE","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"PogChomp","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":51,"goal":4223700,"rewards":[{"type":"EMOTE","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"PogChomp","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":52,"goal":4479100,"rewards":[{"type":"EMOTE","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"PogChomp","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":53,"goal":4744700,"rewards":[{"type":"EMOTE","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"PogChomp","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":54,"goal":5020600,"rewards":[{"type":"EMOTE","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"PogChomp","reward_end_date":"0001-01-01T00:00:00Z"}]},{"value":55,"goal":5307200,"rewards":[{"type":"EMOTE","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","group_id":"","reward_level":0,"set_id":"003a0964-e60f-4320-8b0e-c8bc36a2dc98","token":"PogChomp","reward_end_date":"0001-01-01T00:00:00Z"}]}]},"conductor_rewards":{"BITS":{"CURRENT":[{"type":"BADGE","id":"1","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsxOzkzNjA2NTI3","image_url":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2","reward_end_date":"0001-01-01T00:00:00Z"}],"FORMER":[{"type":"BADGE","id":"2","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsyOzkzNjA2NTI3","image_url":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2","reward_end_date":"0001-01-01T00:00:00Z"}]},"EXPLICIT_PURCHASE":{"CURRENT":[{"type":"BADGE","id":"1","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsxOzkzNjA2NTI3","image_url":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2","reward_end_date":"0001-01-01T00:00:00Z"}],"FORMER":[{"type":"BADGE","id":"2","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsyOzkzNjA2NTI3","image_url":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2","reward_end_date":"0001-01-01T00:00:00Z"}]},"SUBS":{"CURRENT":[{"type":"BADGE","id":"1","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsxOzkzNjA2NTI3","image_url":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2","reward_end_date":"0001-01-01T00:00:00Z"}],"FORMER":[{"type":"BADGE","id":"2","group_id":"hype-train","reward_level":0,"badge_id":"aHlwZS10cmFpbjsyOzkzNjA2NTI3","image_url":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2","reward_end_date":"0001-01-01T00:00:00Z"}]}},"callout_emote_id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","callout_emote_token":"PogChomp","use_creator_color":true,"primary_hex_color":"6618C4","use_personalized_settings":true,"has_conductor_badges":true,"boost_train_config":{"twitch_impressions":{"EASY":500,"HARD":500,"INSANE":500,"MEDIUM":500,"SUPER HARD":500}}},"participations":{"BITS.CHEER":200,"SUBS.TIER_1_SUB":2},"conductors":{},"progress":{"level":{"value":1,"goal":1600,"rewards":[{"type":"EMOTE","id":"emotesv2_a3cdcbfcae9b41bb8215b012362eea35","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"FrogPonder","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_7fa0ba50748c418d956afa59c2e94883","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"ChillGirl","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_92d34a3642744c6bb540b091d3e9e9b0","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"ButtonMash","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"BatterUp","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_692f743d3e7147068bb1ddf842f9b99d","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"GoodOne","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_aa8db3de21e1465dab81bedfa47e29f2","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"MegaConsume","reward_end_date":"0001-01-01T00:00:00Z"}]},"value":1200,"goal":1600,"total":1200,"remaining_seconds":299,"all_time_high_state":"NONE"},"is_boost_train":false,"is_golden_kappa_train":false,"all_time_high_progress":{"level":{"value":7,"goal":19200,"rewards":[{"type":"EMOTE","id":"emotesv2_1d68d57fa07a4636aa3325e95c85f19a","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"RaccoonPop","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_f033a950174e447cb68a3380ed9da914","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GoblinJam","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b13f48e4ca704d1cb13123631467616e","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"YouMissed","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_c7aefc45412147b284273098a518c94b","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"GriddyGoose","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_b308322f860543f78e046294a9614c68","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"CheersToThat","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_827188949087491ab7d44ecfbfb4e58c","group_id":"","reward_level":0,"set_id":"0137c100-a3e6-45d8-9674-73bd5c6b8956","token":"StirThePot","reward_end_date":"0001-01-01T00:00:00Z"}]},"value":2500,"goal":4700,"total":17000,"remaining_seconds":299,"all_time_high_state":"REACHED"}}},
		{"type":"hype-train-conductor-update","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797-SUBS","source":"SUBS","user":{"id":"106410077","login":"djpurplenoise","display_name":"djpurplenoise","profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/4c1f07f1-ff14-438a-8305-a5166dc8c34c-profile_image-50x50.png"},"participations":{"SUBS.TIER_1_SUB":1}}},
		{"type":"hype-train-conductor-update","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797-SUBS","source":"SUBS","user":{"id":"106410077","login":"djpurplenoise","display_name":"djpurplenoise","profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/4c1f07f1-ff14-438a-8305-a5166dc8c34c-profile_image-50x50.png"},"participations":{"SUBS.TIER_1_SUB":1}}},
		{"type":"hype-train-conductor-update","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797-BITS","source":"BITS","user":{"id":"59075828","login":"slep_p","display_name":"slep_p","profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/b0cc4110-f39c-4800-86b6-4a7970faa7a3-profile_image-50x50.png"},"participations":{"BITS.CHEER":200}}},
		{"type":"hype-train-progression","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","user_id":"503744803","user_login":"vengaju","user_display_name":"vengaju","user_profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/9b9ec151-52a3-4897-b685-532b4dc5265a-profile_image-50x50.png","sequence_id":1300,"action":"CHEER","source":"BITS","quantity":100,"progress":{"level":{"value":1,"goal":1600,"rewards":[{"type":"EMOTE","id":"emotesv2_a3cdcbfcae9b41bb8215b012362eea35","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"FrogPonder","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_7fa0ba50748c418d956afa59c2e94883","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"ChillGirl","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_92d34a3642744c6bb540b091d3e9e9b0","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"ButtonMash","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"BatterUp","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_692f743d3e7147068bb1ddf842f9b99d","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"GoodOne","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_aa8db3de21e1465dab81bedfa47e29f2","group_id":"","reward_level":0,"set_id":"8a3d6e77-b5cd-48dc-84f8-ad880db54e45","token":"MegaConsume","reward_end_date":"0001-01-01T00:00:00Z"}]},"value":1300,"goal":1600,"total":1300,"remaining_seconds":248,"all_time_high_state":"NONE"},"is_boost_train":false,"initiator_currency":null,"is_fast_mode":false,"expires_at":"2024-07-25T16:09:24.184351899Z","is_large_event":false}},
		{"type":"hype-train-progression","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","user_id":"59075828","user_login":"slep_p","user_display_name":"slep_p","user_profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/b0cc4110-f39c-4800-86b6-4a7970faa7a3-profile_image-50x50.png","sequence_id":1620,"action":"CHEER","source":"BITS","quantity":320,"progress":{"level":{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"AGiftForYou","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"KittyHype","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_da6ee66bc259434085eb866429687941","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"DangerDance","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"PersonalBest","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"HenloThere","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"GimmeDat","reward_end_date":"0001-01-01T00:00:00Z"}]},"value":20,"goal":1800,"total":1620,"remaining_seconds":299,"all_time_high_state":"NONE"},"is_boost_train":false,"initiator_currency":null,"is_fast_mode":false,"expires_at":"2024-07-25T16:10:17.524413443Z","is_large_event":false}},
		{"type":"hype-train-level-up","data":{"time_to_expire":1721923817000,"progress":{"level":{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"AGiftForYou","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"KittyHype","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_da6ee66bc259434085eb866429687941","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"DangerDance","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"PersonalBest","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"HenloThere","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"GimmeDat","reward_end_date":"0001-01-01T00:00:00Z"}]},"value":20,"goal":1800,"total":1620,"remaining_seconds":299,"all_time_high_state":"NONE"},"is_boost_train":false,"hype_train":{"__typename":"HypeTrainExecution","id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","startedAt":"2024-07-25T16:04:24.184351899Z","expiresAt":"2024-07-25T16:10:17.524413443Z","updatedAt":"2024-07-25T16:05:17.509980965Z","endedAt":null,"endReason":"IN_PROGRESS","isGoldenKappaTrain":false,"progress":{"__typename":"HypeTrainProgress","id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","goal":1800,"progression":20,"total":1620,"level":{"__typename":"HypeTrainLevel","id":"93606527:EASY:2","value":2,"goal":3400,"rewards":[{"__typename":"HypeTrainEmoteReward","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","token":"AGiftForYou"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","token":"KittyHype"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_da6ee66bc259434085eb866429687941","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_da6ee66bc259434085eb866429687941","token":"DangerDance"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","token":"PersonalBest"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","token":"HenloThere"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","token":"GimmeDat"}}]},"allTimeHighState":"NONE"},"conductors":[{"__typename":"HypeTrainConductor","id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797-SUBS","source":"SUBS","participation":[{"__typename":"HypeTrainParticipation","source":"SUBS","action":"TIER_1_SUB","quantity":1}],"user":{"__typename":"User","id":"106410077","displayName":"djpurplenoise","login":"djpurplenoise","profileImageURL":"https://static-cdn.jtvnw.net/jtv_user_pictures/4c1f07f1-ff14-438a-8305-a5166dc8c34c-profile_image-50x50.png"}},{"__typename":"HypeTrainConductor","id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797-BITS","source":"BITS","participation":[{"__typename":"HypeTrainParticipation","source":"BITS","action":"CHEER","quantity":200}],"user":{"__typename":"User","id":"59075828","displayName":"slep_p","login":"slep_p","profileImageURL":"https://static-cdn.jtvnw.net/jtv_user_pictures/b0cc4110-f39c-4800-86b6-4a7970faa7a3-profile_image-50x50.png"}}],"config":{"__typename":"HypeTrainConfig","id":"93606527:ba5ff6f9-c867-4058-9af8-e5e4a10d9797","willUseCreatorColor":true,"primaryHexColor":"6618C4","conductorRewards":[{"__typename":"HypeTrainConductorReward","source":"BITS","type":"FORMER","rewards":[{"__typename":"HypeTrainBadgeReward","id":"2","type":"BADGE","badge":{"__typename":"Badge","id":"aHlwZS10cmFpbjsyOzkzNjA2NTI3","setID":"hype-train","imageURL":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2"}}]},{"__typename":"HypeTrainConductorReward","source":"BITS","type":"CURRENT","rewards":[{"__typename":"HypeTrainBadgeReward","id":"1","type":"BADGE","badge":{"__typename":"Badge","id":"aHlwZS10cmFpbjsxOzkzNjA2NTI3","setID":"hype-train","imageURL":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2"}}]},{"__typename":"HypeTrainConductorReward","source":"SUBS","type":"CURRENT","rewards":[{"__typename":"HypeTrainBadgeReward","id":"1","type":"BADGE","badge":{"__typename":"Badge","id":"aHlwZS10cmFpbjsxOzkzNjA2NTI3","setID":"hype-train","imageURL":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2"}}]},{"__typename":"HypeTrainConductorReward","source":"SUBS","type":"FORMER","rewards":[{"__typename":"HypeTrainBadgeReward","id":"2","type":"BADGE","badge":{"__typename":"Badge","id":"aHlwZS10cmFpbjsyOzkzNjA2NTI3","setID":"hype-train","imageURL":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2"}}]},{"__typename":"HypeTrainConductorReward","source":"EXPLICIT_PURCHASE","type":"FORMER","rewards":[{"__typename":"HypeTrainBadgeReward","id":"2","type":"BADGE","badge":{"__typename":"Badge","id":"aHlwZS10cmFpbjsyOzkzNjA2NTI3","setID":"hype-train","imageURL":"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2"}}]},{"__typename":"HypeTrainConductorReward","source":"EXPLICIT_PURCHASE","type":"CURRENT","rewards":[{"__typename":"HypeTrainBadgeReward","id":"1","type":"BADGE","badge":{"__typename":"Badge","id":"aHlwZS10cmFpbjsxOzkzNjA2NTI3","setID":"hype-train","imageURL":"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2"}}]}],"participationConversionRates":[{"__typename":"HypeTrainParticipationConversionRate","action":"UNKNOWN","source":"UNKNOWN","value":0},{"__typename":"HypeTrainParticipationConversionRate","action":"TIER_3_SUB","source":"SUBS","value":2500},{"__typename":"HypeTrainParticipationConversionRate","action":"TIER_2_GIFTED_SUB","source":"SUBS","value":1000},{"__typename":"HypeTrainParticipationConversionRate","action":"TIER_1_SUB","source":"SUBS","value":500},{"__typename":"HypeTrainParticipationConversionRate","action":"TIER_3_GIFTED_SUB","source":"SUBS","value":2500},{"__typename":"HypeTrainParticipationConversionRate","action":"CHEER","source":"BITS","value":1},{"__typename":"HypeTrainParticipationConversionRate","action":"BITS_ON_EXTENSION","source":"BITS","value":1},{"__typename":"HypeTrainParticipationConversionRate","action":"TIER_2_SUB","source":"SUBS","value":1000},{"__typename":"HypeTrainParticipationConversionRate","action":"TIER_1_GIFTED_SUB","source":"SUBS","value":500},{"__typename":"HypeTrainParticipationConversionRate","action":"POLLS","source":"BITS","value":1}],"calloutEmote":{"__typename":"Emote","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","token":"PogChomp"},"difficulty":"EASY","difficultySettings":[{"__typename":"HypeTrainDifficultySettings","difficulty":"EASY","maxLevel":392}],"potentialRewards":[{"__typename":"HypeTrainPotentialReward","id":"2:emotesv2_e7c9f4491c9b44d68e41aff832851872","level":2,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","token":"AGiftForYou"}}},{"__typename":"HypeTrainPotentialReward","id":"2:emotesv2_3969f334f5a2425d9fad53daabb06982","level":2,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","token":"KittyHype"}}},{"__typename":"HypeTrainPotentialReward","id":"2:emotesv2_da6ee66bc259434085eb866429687941","level":2,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_da6ee66bc259434085eb866429687941","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_da6ee66bc259434085eb866429687941","token":"DangerDance"}}},{"__typename":"HypeTrainPotentialReward","id":"2:emotesv2_20a5c29af55240d4a276e0ffd828db3e","level":2,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","token":"PersonalBest"}}},{"__typename":"HypeTrainPotentialReward","id":"2:emotesv2_18479de9ad48456aab82a8c9e24e864b","level":2,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","token":"HenloThere"}}},{"__typename":"HypeTrainPotentialReward","id":"2:emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","level":2,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","token":"GimmeDat"}}},{"__typename":"HypeTrainPotentialReward","id":"106:emotesv2_6d23a98b64ad45d9a9c78cb7e48908d6","level":106,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_6d23a98b64ad45d9a9c78cb7e48908d6","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_6d23a98b64ad45d9a9c78cb7e48908d6","token":"DidIBreakIt"}}},{"__typename":"HypeTrainPotentialReward","id":"100:emotesv2_ae9328d25e4b424c8dd2af714045e538","level":100,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_ae9328d25e4b424c8dd2af714045e538","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_ae9328d25e4b424c8dd2af714045e538","token":"KappaInfinite"}}},{"__typename":"HypeTrainPotentialReward","id":"3:emotesv2_2a52b54c6fb04a6fbb6b9eb51fa8e0d0","level":3,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_2a52b54c6fb04a6fbb6b9eb51fa8e0d0","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_2a52b54c6fb04a6fbb6b9eb51fa8e0d0","token":"MegaMlep"}}},{"__typename":"HypeTrainPotentialReward","id":"3:emotesv2_91b3e913c6484fca894830ab953aa16b","level":3,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_91b3e913c6484fca894830ab953aa16b","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_91b3e913c6484fca894830ab953aa16b","token":"RawkOut"}}},{"__typename":"HypeTrainPotentialReward","id":"3:emotesv2_8120b15b9e054b31a200a5cb6cade4c7","level":3,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_8120b15b9e054b31a200a5cb6cade4c7","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_8120b15b9e054b31a200a5cb6cade4c7","token":"FallDamage"}}},{"__typename":"HypeTrainPotentialReward","id":"3:emotesv2_a83f8ade02cd4b37b8ae079584407c66","level":3,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_a83f8ade02cd4b37b8ae079584407c66","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_a83f8ade02cd4b37b8ae079584407c66","token":"RedCard"}}},{"__typename":"HypeTrainPotentialReward","id":"3:emotesv2_c3db311615df4ecb9e3be0c492fbfc8b","level":3,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_c3db311615df4ecb9e3be0c492fbfc8b","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_c3db311615df4ecb9e3be0c492fbfc8b","token":"ApplauseBreak"}}},{"__typename":"HypeTrainPotentialReward","id":"3:emotesv2_871fb6fa55d54fae8e807198c59e082f","level":3,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_871fb6fa55d54fae8e807198c59e082f","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_871fb6fa55d54fae8e807198c59e082f","token":"TouchOfSalt"}}},{"__typename":"HypeTrainPotentialReward","id":"50:emotesv2_00659fc4ae6948a6b23585e83f62d477","level":50,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_00659fc4ae6948a6b23585e83f62d477","token":"PogChomp"}}},{"__typename":"HypeTrainPotentialReward","id":"4:emotesv2_3e61175d445245838665fff146bd2bb0","level":4,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_3e61175d445245838665fff146bd2bb0","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_3e61175d445245838665fff146bd2bb0","token":"KittyLove"}}},{"__typename":"HypeTrainPotentialReward","id":"4:emotesv2_8b79f878cfff4671ae0fb7522c69ea07","level":4,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_8b79f878cfff4671ae0fb7522c69ea07","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_8b79f878cfff4671ae0fb7522c69ea07","token":"TurnUp"}}},{"__typename":"HypeTrainPotentialReward","id":"4:emotesv2_1cce76af186d4022821e8e67bb367055","level":4,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_1cce76af186d4022821e8e67bb367055","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_1cce76af186d4022821e8e67bb367055","token":"CatScare"}}},{"__typename":"HypeTrainPotentialReward","id":"4:emotesv2_e8236afbc65347ebb4938c6507a78012","level":4,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_e8236afbc65347ebb4938c6507a78012","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_e8236afbc65347ebb4938c6507a78012","token":"LateSave"}}},{"__typename":"HypeTrainPotentialReward","id":"4:emotesv2_94736686188047bab48c9e2ca9666496","level":4,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_94736686188047bab48c9e2ca9666496","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_94736686188047bab48c9e2ca9666496","token":"NoTheyDidNot"}}},{"__typename":"HypeTrainPotentialReward","id":"4:emotesv2_cef4e35f8d134fbc8172fe622bc51bfe","level":4,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_cef4e35f8d134fbc8172fe622bc51bfe","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_cef4e35f8d134fbc8172fe622bc51bfe","token":"BeholdThis"}}},{"__typename":"HypeTrainPotentialReward","id":"5:emotesv2_1d68d57fa07a4636aa3325e95c85f19a","level":5,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_1d68d57fa07a4636aa3325e95c85f19a","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_1d68d57fa07a4636aa3325e95c85f19a","token":"RaccoonPop"}}},{"__typename":"HypeTrainPotentialReward","id":"5:emotesv2_f033a950174e447cb68a3380ed9da914","level":5,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_f033a950174e447cb68a3380ed9da914","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_f033a950174e447cb68a3380ed9da914","token":"GoblinJam"}}},{"__typename":"HypeTrainPotentialReward","id":"5:emotesv2_b13f48e4ca704d1cb13123631467616e","level":5,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_b13f48e4ca704d1cb13123631467616e","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_b13f48e4ca704d1cb13123631467616e","token":"YouMissed"}}},{"__typename":"HypeTrainPotentialReward","id":"5:emotesv2_c7aefc45412147b284273098a518c94b","level":5,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_c7aefc45412147b284273098a518c94b","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_c7aefc45412147b284273098a518c94b","token":"GriddyGoose"}}},{"__typename":"HypeTrainPotentialReward","id":"5:emotesv2_b308322f860543f78e046294a9614c68","level":5,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_b308322f860543f78e046294a9614c68","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_b308322f860543f78e046294a9614c68","token":"CheersToThat"}}},{"__typename":"HypeTrainPotentialReward","id":"5:emotesv2_827188949087491ab7d44ecfbfb4e58c","level":5,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_827188949087491ab7d44ecfbfb4e58c","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_827188949087491ab7d44ecfbfb4e58c","token":"StirThePot"}}},{"__typename":"HypeTrainPotentialReward","id":"10:emotesv2_bf888b2af57b4abd80653dff26768ae5","level":10,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_bf888b2af57b4abd80653dff26768ae5","token":"BleedPurpleHD"}}},{"__typename":"HypeTrainPotentialReward","id":"25:emotesv2_132feb3980ee410e856244931d63fd31","level":25,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_132feb3980ee410e856244931d63fd31","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_132feb3980ee410e856244931d63fd31","token":"HeyHeyGuys"}}},{"__typename":"HypeTrainPotentialReward","id":"1:emotesv2_a3cdcbfcae9b41bb8215b012362eea35","level":1,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_a3cdcbfcae9b41bb8215b012362eea35","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_a3cdcbfcae9b41bb8215b012362eea35","token":"FrogPonder"}}},{"__typename":"HypeTrainPotentialReward","id":"1:emotesv2_7fa0ba50748c418d956afa59c2e94883","level":1,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_7fa0ba50748c418d956afa59c2e94883","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_7fa0ba50748c418d956afa59c2e94883","token":"ChillGirl"}}},{"__typename":"HypeTrainPotentialReward","id":"1:emotesv2_92d34a3642744c6bb540b091d3e9e9b0","level":1,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_92d34a3642744c6bb540b091d3e9e9b0","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_92d34a3642744c6bb540b091d3e9e9b0","token":"ButtonMash"}}},{"__typename":"HypeTrainPotentialReward","id":"1:emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","level":1,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","token":"BatterUp"}}},{"__typename":"HypeTrainPotentialReward","id":"1:emotesv2_692f743d3e7147068bb1ddf842f9b99d","level":1,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_692f743d3e7147068bb1ddf842f9b99d","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_692f743d3e7147068bb1ddf842f9b99d","token":"GoodOne"}}},{"__typename":"HypeTrainPotentialReward","id":"1:emotesv2_aa8db3de21e1465dab81bedfa47e29f2","level":1,"value":{"__typename":"HypeTrainEmoteReward","id":"emotesv2_aa8db3de21e1465dab81bedfa47e29f2","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_aa8db3de21e1465dab81bedfa47e29f2","token":"MegaConsume"}}}]},"allTimeHigh":{"__typename":"HypeTrainCompleted","goal":4700,"progression":2500,"total":17000,"level":{"__typename":"HypeTrainLevel","id":"93606527:EASY:7","value":7}},"isFastMode":false,"participations":[{"__typename":"HypeTrainParticipation","source":"SUBS","action":"TIER_1_SUB","quantity":2},{"__typename":"HypeTrainParticipation","source":"BITS","action":"CHEER","quantity":620}]}}},
		{"type":"hype-train-conductor-update","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797-BITS","source":"BITS","user":{"id":"59075828","login":"slep_p","display_name":"slep_p","profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/b0cc4110-f39c-4800-86b6-4a7970faa7a3-profile_image-50x50.png"},"participations":{"BITS.CHEER":520}}},
		{"type":"hype-train-progression","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","user_id":"827986816","user_login":"smog_pg","user_display_name":"Smog_PG","user_profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/85647253-2231-4ca3-81db-99ee74b290b6-profile_image-50x50.png","sequence_id":2120,"action":"TIER_1_SUB","source":"SUBS","quantity":1,"progress":{"level":{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"AGiftForYou","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"KittyHype","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_da6ee66bc259434085eb866429687941","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"DangerDance","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"PersonalBest","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"HenloThere","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"GimmeDat","reward_end_date":"0001-01-01T00:00:00Z"}]},"value":520,"goal":1800,"total":2120,"remaining_seconds":142,"all_time_high_state":"NONE"},"is_boost_train":false,"initiator_currency":null,"is_fast_mode":false,"expires_at":"2024-07-25T16:10:17.524413443Z","is_large_event":false}},
		{"type":"hype-train-progression","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","user_id":"64181167","user_login":"stef84460","user_display_name":"Stef84460","user_profile_image_url":"https://static-cdn.jtvnw.net/jtv_user_pictures/f469b4a1-8090-4968-8a93-879406682849-profile_image-50x50.png","sequence_id":2620,"action":"TIER_1_SUB","source":"SUBS","quantity":1,"progress":{"level":{"value":2,"goal":3400,"rewards":[{"type":"EMOTE","id":"emotesv2_e7c9f4491c9b44d68e41aff832851872","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"AGiftForYou","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_3969f334f5a2425d9fad53daabb06982","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"KittyHype","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_da6ee66bc259434085eb866429687941","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"DangerDance","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_20a5c29af55240d4a276e0ffd828db3e","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"PersonalBest","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_18479de9ad48456aab82a8c9e24e864b","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"HenloThere","reward_end_date":"0001-01-01T00:00:00Z"},{"type":"EMOTE","id":"emotesv2_0d9792a1c8d3499cac7c2b517dc0f682","group_id":"","reward_level":0,"set_id":"8a15970c-7e72-46d4-b560-1cb4997f4b0a","token":"GimmeDat","reward_end_date":"0001-01-01T00:00:00Z"}]},"value":1020,"goal":1800,"total":2620,"remaining_seconds":96,"all_time_high_state":"NONE"},"is_boost_train":false,"initiator_currency":null,"is_fast_mode":false,"expires_at":"2024-07-25T16:10:17.524413443Z","is_large_event":false}},
		{"type":"hype-train-end","data":{"id":"ba5ff6f9-c867-4058-9af8-e5e4a10d9797","ended_at":1721923817000,"ending_reason":"COMPLETED","is_boost_train":false,"participation_totals":[{"source":"SUBS","action":"TIER_1_SUB","quantity":4},{"source":"BITS","action":"CHEER","quantity":620}],"rewards":[{"__typename":"HypeTrainEmoteReward","id":"emotesv2_92d34a3642744c6bb540b091d3e9e9b0","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_92d34a3642744c6bb540b091d3e9e9b0","token":"ButtonMash"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_bc2ca1d0a58b4731a9fc3432cb175c86","token":"BatterUp"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_692f743d3e7147068bb1ddf842f9b99d","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_692f743d3e7147068bb1ddf842f9b99d","token":"GoodOne"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_aa8db3de21e1465dab81bedfa47e29f2","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_aa8db3de21e1465dab81bedfa47e29f2","token":"MegaConsume"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_a3cdcbfcae9b41bb8215b012362eea35","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_a3cdcbfcae9b41bb8215b012362eea35","token":"FrogPonder"}},{"__typename":"HypeTrainEmoteReward","id":"emotesv2_7fa0ba50748c418d956afa59c2e94883","type":"EMOTE","emote":{"__typename":"Emote","id":"emotesv2_7fa0ba50748c418d956afa59c2e94883","token":"ChillGirl"}}]}}
];
}
