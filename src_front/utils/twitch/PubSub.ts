import Database from '@/store/Database';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/twitch/TwitchUtils';
import { LoremIpsum } from "lorem-ipsum";
import { EventDispatcher } from "../../events/EventDispatcher";
import Config from '../Config';
import Utils from "../Utils";
import TriggerActionHandler from '../triggers/TriggerActionHandler';
import type { PubSubDataTypes } from './PubSubDataTypes';
import { TwitchScopes } from './TwitchScopes';
import * as Sentry from "@sentry/vue";
import SetIntervalWorker from '../SetIntervalWorker';

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
				"predictions-channel-v1."+myUID,
				"polls."+myUID,
				"hype-train-events-v1."+myUID,
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
				subscriptions.push("automod-queue."+myUID+"."+myUID);
				subscriptions.push("low-trust-users."+myUID+"."+myUID);
				// subscriptions.push("channel-chat-highlights."+myUID+"."+myUID);//Needs a twitch scope T_T. This is what allows to get "raider" message highlight
			}


			if(Config.instance.debugChans.length > 0) {
				//Subscribe to someone else's channel pointevents
				const users = await TwitchUtils.getUserInfo(undefined, Config.instance.debugChans.filter(v=>v.platform=="twitch").map(v=>v.login));
				const uids = users.map(v=> v.id);
				for (let i = 0; i < uids.length; i++) {
					const uid = uids[i];
					if(uid == myUID) continue;
					subscriptions.push("raid."+uid);
					subscriptions.push("hype-train-events-v1."+uid);
					subscriptions.push("video-playback-by-id."+uid);//Get viewers count
					subscriptions.push("community-points-channel-v1."+uid);//Get channel points rewards
					subscriptions.push("community-boost-events-v1."+uid);//Get channel points rewards
					subscriptions.push("predictions-channel-v1."+uid);//Get prediction events
					subscriptions.push("polls."+uid);//Get poll events
					subscriptions.push("stream-chat-room-v1."+uid);//Host events (RIP)
					//TODO check if we're mod on the "uid" channel
					subscriptions.push("chat_moderator_actions."+myUID+"."+uid);
					subscriptions.push("automod-queue."+myUID+"."+uid);
					subscriptions.push("low-trust-users."+myUID+"."+uid);
					subscriptions.push("pinned-chat-updates-v1."+uid);
					// subscriptions.push("user-moderation-notifications."+myUID+"."+uid);
					// subscriptions.push("channel-ad-poll-update-events."+uid);
					// subscriptions.push("pv-watch-party-events."+uid);
					// subscriptions.push("stream-change-by-channel."+uid);
					// subscriptions.push("radio-events-v1."+uid);
					// subscriptions.push("channel-sub-gifts-v1."+uid);
				}
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
			this.reconnectTimeout = setTimeout(()=>{
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
		const dateOffset = (PubsubJSON.RealHypeTrainData[1] as Date).getTime();
		const timeScale = 1.15;
		for (let i = 0; i < PubsubJSON.RealHypeTrainData.length; i+=2) {
			const date = PubsubJSON.RealHypeTrainData[i+1] as Date;
			const event = PubsubJSON.RealHypeTrainData[i] as {data:{message:string}};
			Utils.promisedTimeout((date.getTime() - dateOffset)*timeScale).then(()=> {
				const json = JSON.parse(event.data.message);
				if(goldenKappa && json.type === "hype-train-start") {
					(json.data as PubSubDataTypes.HypeTrainStart).isGoldenKappaTrain = true;
				}
				this.parseEvent( json );
			})
		}

		this.parseEvent(PubsubJSON.HypeTrainComplete);
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

	/**
	 * Simulate a low trust user message
	 */
	public async simulateLowTrustUser():Promise<void> {
		const uid = StoreProxy.auth.twitch.user.id;
		const message = "This is a message sent by a low trusted user";
		const m: TwitchatDataTypes.MessageChatData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:uid,
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			answers:[],
			user: StoreProxy.users.getUserFrom("twitch", uid, uid),
			message,
			message_chunks: TwitchUtils.parseMessageToChunks(message),
			message_html:message,
			message_size:0,
			twitch_isSuspicious:true,
			is_short:false,
		};
		m.message_size = TwitchUtils.computeMessageSize(m.message_chunks);
		StoreProxy.chat.addMessage(m)

		//Flag mesage as low trust
		this.parseEvent(m);
	}

	/**
	 * Simulate a follow bot event by sending lots of fake follow events
	 */
	public async simulateFollowbotItem():Promise<void> {
		const lorem = new LoremIpsum({ wordsPerSentence: { max: 40, min: 40 } });
		const login = lorem.generateWords(Math.round(Math.random()*2)+1).split(" ").join("_");
		const channelId = StoreProxy.auth.twitch.user.id;
		const uid = Math.round(Math.random()*99999999999).toString();
		const message:TwitchatDataTypes.MessageFollowingData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id: channelId,
			type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			user: StoreProxy.users.getUserFrom("twitch", channelId, uid, login, login , undefined, true),
			followed_at: Date.now(),
			followbot:true,
		};
		StoreProxy.chat.addMessage(message);
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
			this.hypeTrainApproaching(data.data as  PubSubDataTypes.HypeTrainApproaching);

		}else if(data.type == "hype-train-start") {
			this.hypeTrainStart(data.data as  PubSubDataTypes.HypeTrainStart);

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



		}else if(data.type == "automod_caught_message") {
			this.automodEvent(data.data as  PubSubDataTypes.AutomodData, channelId);



		//Called when un/flagging a user as suspicious/restrcited
		}else if(data.type == "low_trust_user_treatment_update") {
			const localObj = data.data as PubSubDataTypes.LowTrustTreatmentUpdate;
			this.lowTrustUserUpdate(localObj)



		}else if(data.type == "low_trust_user_new_message") {
			this.lowTrustMessage(data.data as  PubSubDataTypes.LowTrustMessage);



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



		}else if(data.type == "POLL_CREATE" || data.type == "POLL_UPDATE" || data.type == "POLL_COMPLETE" || data.type == "POLL_TERMINATE") {
			const localObj = data.data as PubSubDataTypes.PollData;
			const isComplete = data.type == "POLL_COMPLETE" || data.type == "POLL_TERMINATE";
			this.pollEvent(localObj, isComplete);



		}else if(data.type == "POLL_ARCHIVE" || data.type == "POLL_MODERATE" || data.type == "POLL_INVALID") {
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
				setTimeout(()=> {
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



		}else if(data.type == "moderation_action") {
			//Manage moderation actions
			const localObj = data.data as PubSubDataTypes.ModerationData;
			let noticeId:TwitchatDataTypes.TwitchatNoticeStringType|null = null;
			let noticeText:string|null = null;
			let moderatedUser:TwitchatDataTypes.TwitchatUser|null = null;
			const m:TwitchatDataTypes.MessageNoticeData = {
				id:Utils.getUUID(),
				date:Date.now(),
				platform:"twitch",
				channel_id:channelId,
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				message:"",
				noticeId,
			};
			const t = StoreProxy.i18n.t;

			switch(localObj.moderation_action) {
				case "clear": {
					const message:TwitchatDataTypes.MessageClearChatData = {
						platform:"twitch",
						type:TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT,
						id:Utils.getUUID(),
						channel_id:channelId,
						date:Date.now(),
						fromAutomod:false,
					};
					if(localObj.created_by) {
						message.user = StoreProxy.users.getUserFrom("twitch", channelId, localObj.created_by_user_id, localObj.created_by)
					}
					if(localObj.from_automod) {
						message.fromAutomod = true;
					}
					StoreProxy.chat.addMessage(message);
					break;
				}

				case "vip": {
					const username = localObj.args?.[0];
					moderatedUser = await new Promise<TwitchatDataTypes.TwitchatUser>((resolve)=> {
						StoreProxy.users.getUserFrom("twitch", channelId, undefined, username, undefined, (u)=> resolve(u));
					});
					noticeId = TwitchatDataTypes.TwitchatNoticeType.VIP;
					noticeText = t("global.moderation_action.viped_by", {USER:moderatedUser.displayName, MODERATOR:localObj.created_by});
					StoreProxy.users.flagVip("twitch", channelId, moderatedUser.id);
					break;
				}

				case "delete": {
					const [login, message, messageId] = localObj.args!;
					const deleter = StoreProxy.users.getUserFrom("twitch", channelId, localObj.created_by_user_id, localObj.created_by);
					StoreProxy.chat.deleteMessageByID(messageId, deleter, false);
					break;
				}

				default:
					console.log("Unhandled event type: "+localObj.moderation_action);
					break;
			}

			if(noticeId && noticeText) {
				m.noticeId = noticeId;
				m.message = noticeText;
				if(moderatedUser) {
					(m as TwitchatDataTypes.MessageModerationAction).user = moderatedUser;
				}
				StoreProxy.chat.addMessage(m);
			}
		}
	}

	/**
	 * Called when a message is held by automod
	 * @param localObj
	 */
	private automodEvent(localObj:PubSubDataTypes.AutomodData, channelId:string):void {
		if(localObj.status == "PENDING") {
			const reasons:string[] = [];
			for (let i = 0; i < localObj.message.content.fragments.length; i++) {
				const f = localObj.message.content.fragments[i];
				if(!f.automod) continue;
				for (const key in f.automod.topics) {
					if(reasons.indexOf(key) == -1) reasons.push(key);
				}
			}

			//Build usable emotes set
			const chunks:TwitchatDataTypes.ParseMessageChunk[] = [];
			const words:string[] = [];
			for (let i = 0; i < localObj.message.content.fragments.length; i++) {
				const el = localObj.message.content.fragments[i];
				if(el.emoticon) {
					chunks.push({
						type:"emote",
						value:el.text,
						emote:"https://static-cdn.jtvnw.net/emoticons/v2/"+el.emoticon.emoticonID+"/default/light/2.0",
						emoteHD:"https://static-cdn.jtvnw.net/emoticons/v2/"+el.emoticon.emoticonID+"/default/light/4.0",
					});
				}else if(el.automod) {
					chunks.push({
						type:"highlight",
						value:el.text,
					});
					words.push(el.text);
				}else if(el.text) {
					chunks.push({
						type:"text",
						value:el.text,
					});
				}
			}

			const user = localObj.message.sender;
			const userData = StoreProxy.users.getUserFrom("twitch", channelId, user.user_id, user.login, user.display_name);
			userData.color = user.chat_color;
			const messageHtml = TwitchUtils.messageChunksToHTML(chunks);
			const messageClean = Utils.stripHTMLTags(messageHtml);
			// const chunks = TwitchUtils.parseMessageToChunks(textMessage);
			const m:TwitchatDataTypes.MessageChatData = {
				id:localObj.message.id,
				channel_id:channelId,
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				platform:"twitch",
				user:userData,
				answers:[],
				message:messageClean,
				message_chunks:chunks,
				message_html:messageHtml,
				message_size:0,
				twitch_automod:{ reasons, words },
				is_short:false,
			};
			m.message_size = TwitchUtils.computeMessageSize(m.message_chunks);
			StoreProxy.chat.addMessage(m);

		}else
		if(localObj.status == "DENIED" || localObj.status == "ALLOWED") {
			//Search message by its ID
			const list = StoreProxy.chat.messages.concat();
			for (let i = list.length-1; i > -1; i--) {
				if(localObj.message.id == list[i].id) {
					//Delete it even if allowed as it's actually sent back via IRC
					StoreProxy.chat.deleteMessage(list[i], undefined, false);
				}
			}
		}
	}

	/**
	 * Called when a low trust user is detected
	 *
	 * @param localObj
	 */
	private async lowTrustUserUpdate(localObj:PubSubDataTypes.LowTrustTreatmentUpdate):Promise<void> {
		const m:TwitchatDataTypes.MessageLowtrustTreatmentData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:localObj.channel_id,
			type:TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT,
			user:StoreProxy.users.getUserFrom("twitch", localObj.channel_id, localObj.target_user_id, localObj.target_user),
			moderator:StoreProxy.users.getUserFrom("twitch", localObj.channel_id, localObj.updated_by.id, localObj.updated_by.login, localObj.updated_by.display_name),
			restricted:localObj.treatment == "RESTRICTED",
			monitored:localObj.treatment == "ACTIVE_MONITORING",
		};
		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Called when a low trust user is detected
	 *
	 * @param localObj
	 */
	private async lowTrustMessage(localObj:PubSubDataTypes.LowTrustMessage):Promise<void> {
		if(localObj.low_trust_user.treatment == 'RESTRICTED') {
			//Build usable emotes set
			const emotes:TwitchatDataTypes.EmoteDef[] = [];
			let offset = 0;
			for (let i = 0; i < localObj.message_content.fragments.length; i++) {
				const el = localObj.message_content.fragments[i];
				if(el.emoticon) {
					emotes.push({
						begin:offset,
						end:offset + el.text.length,
						id:el.emoticon.emoticonID,
					})
				}
				offset += el.text.length;
			}

			const user = localObj.low_trust_user.sender;
			const channelId = localObj.low_trust_user.channel_id;
			const userData = StoreProxy.users.getUserFrom("twitch", channelId, user.user_id, user.login, user.display_name);
			userData.color = user.chat_color;
			const chunks = TwitchUtils.parseMessageToChunks(localObj.message_content.text, emotes);
			const m:TwitchatDataTypes.MessageChatData = {
				id:localObj.message_id,
				channel_id:channelId,
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				platform:"twitch",
				user:userData,
				answers:[],
				message:localObj.message_content.text,
				message_chunks:chunks,
				message_html:TwitchUtils.messageChunksToHTML(chunks),
				message_size:0,
				twitch_isRestricted:true,
				is_short:false,
			};
			m.message_size = TwitchUtils.computeMessageSize(m.message_chunks);
			const users = await TwitchUtils.getUserInfo(localObj.low_trust_user.shared_ban_channel_ids);
			m.twitch_sharedBanChannels = users?.map(v=> { return {id:v.id, login:v.login}}) ?? [];
			StoreProxy.chat.addMessage(m);

		}else{
			StoreProxy.chat.flagSuspiciousMessage(localObj);
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
	private hypeTrainApproaching(data:PubSubDataTypes.HypeTrainApproaching):void {
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
			is_golden_kappa:false,
			is_new_record:false,
		};
		StoreProxy.stream.setHypeTrain(train);

		//Hide "hypetrain approaching" notification if expired
		this.hypeTrainApproachingTimer = setTimeout(()=> {
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
	private hypeTrainStart(data:PubSubDataTypes.HypeTrainStart):void {
		console.log("START", data);
		clearTimeout(this.hypeTrainApproachingTimer);
		const storeTrain = StoreProxy.stream.hypeTrain;
		const train:TwitchatDataTypes.HypeTrainStateData = {
			channel_id:data.channel_id,
			level:data.progress.level.value,
			currentValue:data.progress.value,
			goal:data.progress.goal,
			approached_at:storeTrain?.approached_at ?? Date.now(),
			started_at:Date.now(),
			updated_at:Date.now(),
			timeLeft_s:data.progress.remaining_seconds,
			state: "START",
			is_boost_train:data.is_boost_train,
			is_golden_kappa:data.isGoldenKappaTrain ?? false,
			is_new_record:false,
			conductor_bits:storeTrain?.conductor_bits,
			conductor_subs:storeTrain?.conductor_subs,
		};

		//This line makes debug easier if I wanna start the train at any
		//point of its timeline
		if(!train.approached_at) train.approached_at = Date.now();

		StoreProxy.stream.setHypeTrain(train);
		const message:TwitchatDataTypes.MessageHypeTrainEventData = {
			channel_id:data.channel_id,
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
		this.hypeTrainProgressTimer = setTimeout(()=> {
			const storeTrain = StoreProxy.stream.hypeTrain;
			const prevLevel = storeTrain?.level ?? 0;
			const prevValue = storeTrain?.currentValue ?? 0;
			//Makes sure that if a progress event follows the LEVEL UP event, only
			//the LEVEL UP event is handled.
			//ame goal as the setTimeout() above but if the events order is reversed
			if(data.progress.value == prevLevel && data.progress.level.value == prevValue) {
				//Make sure 2 identical progress events are not processed
				return;
			}
			const train:TwitchatDataTypes.HypeTrainStateData = {
				channel_id:channelId ?? storeTrain?.channel_id ?? StoreProxy.auth.twitch.user.id,
				level:data.progress.level.value,
				currentValue:data.progress.value,
				goal:data.progress.goal,
				approached_at:storeTrain?.approached_at ?? Date.now(),
				started_at:storeTrain?.started_at ?? Date.now(),
				updated_at:Date.now(),
				timeLeft_s:data.progress.remaining_seconds,
				state: "PROGRESSING",
				is_boost_train:data.is_boost_train,
				is_golden_kappa:storeTrain?.is_golden_kappa ?? false,
				is_new_record:false,//found no way to detect new record :(. Doesn't seem avalable on pubsub
				conductor_bits:storeTrain?.conductor_bits,
				conductor_subs:storeTrain?.conductor_subs,
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
			currentValue:data.progress.value,
			goal:data.progress.goal,
			approached_at:storeTrain?.approached_at ?? Date.now(),
			started_at:storeTrain?.started_at ?? Date.now(),
			updated_at:Date.now(),
			timeLeft_s:data.progress.remaining_seconds,
			state: "LEVEL_UP",
			is_boost_train:data.is_boost_train,
			is_golden_kappa:storeTrain?.is_golden_kappa ?? false,
			is_new_record:storeTrain?.is_new_record ?? false,
			conductor_bits:storeTrain?.conductor_bits,
			conductor_subs:storeTrain?.conductor_subs,
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
		};
		StoreProxy.stream.setHypeTrain(train);


		setTimeout(()=> {
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
					timeoutRef = setTimeout(()=> {
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
				message.timeoutRef = setTimeout(()=> {
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
		// {"type":"MESSAGE","data":{"topic":"hype-train-events-v1.180847952","message":"{\"type\":\"hype-train-approaching\",\"data\":{\"channel_id\":\"402890635\",\"goal\":3,\"events_remaining_durations\":{\"1\":261},\"level_one_rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_3114c3d12dc44f53810140f632128b54\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeSleep\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d457ecda087479f98501f80e23b5a04\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePat\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e7a6e7e24a844e709c4d93c0845422e1\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLUL\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCool\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_036fd741be4141198999b2ca4300668e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLove1\"}],\"creator_color\":\"00DADA\",\"participants\":[\"117971644\",\"661245368\"],\"approaching_hype_train_id\":\"50ced304-5348-4481-b4b2-de74d7203677\",\"is_boost_train\":false}}"}},
		// new Date("Wed Aug 17 2022 21:14:45 GMT+0200"),
		// {"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":'{"type":"hype-train-approaching","data":{"channel_id":"402890635","goal":3,"events_remaining_durations":{"1":269},"level_one_rewards":[{"type":"EMOTE","id":"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCool"},{"type":"EMOTE","id":"emotesv2_036fd741be4141198999b2ca4300668e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLove1"},{"type":"EMOTE","id":"emotesv2_3114c3d12dc44f53810140f632128b54","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeSleep"},{"type":"EMOTE","id":"emotesv2_7d457ecda087479f98501f80e23b5a04","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePat"},{"type":"EMOTE","id":"emotesv2_e7a6e7e24a844e709c4d93c0845422e1","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLUL"}],"creator_color":"00AA7F","participants":["38001049","59580201"],"approaching_hype_train_id":"fbafb76e-0447-49ca-b008-c954f374be33","is_boost_train":false}}'}},
		// new Date("Wed Aug 17 2022 21:15:25 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-start\",\"data\":{\"channel_id\":\"402890635\",\"id\":\"362ad65c-3a64-46cd-883e-a8041cce41bc\",\"started_at\":1660763732000,\"expires_at\":1660764032000,\"updated_at\":1660763732000,\"ended_at\":null,\"ending_reason\":null,\"config\":{\"channel_id\":\"402890635\",\"is_enabled\":true,\"islisted\":true,\"kickoff\":{\"num_of_events\":3,\"min_points\":100,\"duration\":300000000000},\"cooldown_duration\":7200000000000,\"level_duration\":300000000000,\"difficulty\":\"EASY\",\"reward_end_date\":null,\"participation_conversion_rates\":{\"BITS.CHEER\":1,\"BITS.EXTENSION\":1,\"BITS.POLL\":1,\"SUBS.TIER_1_GIFTED_SUB\":500,\"SUBS.TIER_1_SUB\":500,\"SUBS.TIER_2_GIFTED_SUB\":1000,\"SUBS.TIER_2_SUB\":1000,\"SUBS.TIER_3_GIFTED_SUB\":2500,\"SUBS.TIER_3_SUB\":2500},\"notification_thresholds\":{\"BITS.CHEER\":1000,\"BITS.EXTENSION\":1000,\"BITS.POLL\":1000,\"SUBS.TIER_1_GIFTED_SUB\":5,\"SUBS.TIER_1_SUB\":5,\"SUBS.TIER_2_GIFTED_SUB\":5,\"SUBS.TIER_2_SUB\":5,\"SUBS.TIER_3_GIFTED_SUB\":5,\"SUBS.TIER_3_SUB\":5},\"difficulty_settings\":{\"EASY\":[{\"value\":1,\"goal\":1600,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_e7a6e7e24a844e709c4d93c0845422e1\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLUL\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCool\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_036fd741be4141198999b2ca4300668e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLove1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_3114c3d12dc44f53810140f632128b54\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeSleep\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d457ecda087479f98501f80e23b5a04\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePat\"}],\"impressions\":300},{\"value\":2,\"goal\":3400,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_0457808073314f62962554c12ebb6b4d\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHands1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c40cd16027f48c0a70ac7b1fa1c397e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHands2\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_0330a84e75ad48c1821c1d29a7dadd4d\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeFail\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_9b68a8fa2f1d457496ac016b251e06b6\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHai\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_9bcc622c0b2a48b180a159c25a2b8245\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeNom\"}],\"impressions\":600},{\"value\":3,\"goal\":5500,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_08abf0cd0e78494a9da8a2315c3648f4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeBLEH\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_ccc146905a694f3b8df390f55e34002a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeApplause\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_4918bd32ff5b476f82bda49f3e958767\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeRage\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d01d1cf36b549098434c7a6e50a8828\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeMwah\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_43da115e6b6749828f7dee47d17dd315\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHuh\"}],\"impressions\":900},{\"value\":4,\"goal\":7800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeWave\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_271ea48a09ca418baad2ea1f734ab09e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeReading\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1337536bcecf49f4bb9cd1a699341ee2\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeShock\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeStress\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCry\"}],\"impressions\":1200},{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500}]},\"conductor_rewards\":{\"BITS\":{\"CURRENT\":[{\"type\":\"BADGE\",\"id\":\"1\",\"group_id\":\"hype-train\",\"reward_level\":0,\"badge_id\":\"aHlwZS10cmFpbjsxOzQwMjg5MDYzNQ==\",\"image_url\":\"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2\"}],\"FORMER\":[{\"type\":\"BADGE\",\"id\":\"2\",\"group_id\":\"hype-train\",\"reward_level\":0,\"badge_id\":\"aHlwZS10cmFpbjsyOzQwMjg5MDYzNQ==\",\"image_url\":\"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2\"}]},\"SUBS\":{\"CURRENT\":[{\"type\":\"BADGE\",\"id\":\"1\",\"group_id\":\"hype-train\",\"reward_level\":0,\"badge_id\":\"aHlwZS10cmFpbjsxOzQwMjg5MDYzNQ==\",\"image_url\":\"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2\"}],\"FORMER\":[{\"type\":\"BADGE\",\"id\":\"2\",\"group_id\":\"hype-train\",\"reward_level\":0,\"badge_id\":\"aHlwZS10cmFpbjsyOzQwMjg5MDYzNQ==\",\"image_url\":\"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2\"}]}},\"callout_emote_id\":\"304892672\",\"callout_emote_token\":\"peleriShy\",\"use_creator_color\":true,\"primary_hex_color\":\"46217E\",\"use_personalized_settings\":false,\"has_conductor_badges\":true,\"boost_train_config\":{\"twitch_impressions\":{\"EASY\":500,\"HARD\":500,\"INSANE\":500,\"MEDIUM\":500,\"SUPER HARD\":500}}},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":1,\"SUBS.TIER_1_SUB\":2},\"conductors\":{},\"progress\":{\"level\":{\"value\":1,\"goal\":1600,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_e7a6e7e24a844e709c4d93c0845422e1\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLUL\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCool\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_036fd741be4141198999b2ca4300668e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLove1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_3114c3d12dc44f53810140f632128b54\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeSleep\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d457ecda087479f98501f80e23b5a04\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePat\"}],\"impressions\":300},\"value\":1500,\"goal\":1600,\"total\":1500,\"remaining_seconds\":299},\"is_boost_train\":false,\"all_time_high_progress\":{\"level\":{\"value\":1,\"goal\":1600,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_e7a6e7e24a844e709c4d93c0845422e1\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLUL\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCool\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_036fd741be4141198999b2ca4300668e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLove1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_3114c3d12dc44f53810140f632128b54\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeSleep\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d457ecda087479f98501f80e23b5a04\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePat\"}],\"impressions\":300},\"value\":0,\"goal\":1600,\"total\":0,\"remaining_seconds\":299}}}"}},
		new Date("Wed Aug 17 2022 21:15:33 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"534165905\",\"login\":\"besso___\",\"display_name\":\"Besso___\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/f61ad8bb-293d-465a-a7f4-5757cf1b4b2e-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":1}}}"}},
		new Date("Wed Aug 17 2022 21:15:33 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"534165905\",\"login\":\"besso___\",\"display_name\":\"Besso___\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/f61ad8bb-293d-465a-a7f4-5757cf1b4b2e-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":1}}}"}},
		new Date("Wed Aug 17 2022 21:15:33 GMT+0200"),
		// {"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"534165905\",\"login\":\"besso___\",\"display_name\":\"Besso___\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/f61ad8bb-293d-465a-a7f4-5757cf1b4b2e-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":1}}}"}},
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":'{"type":"hype-train-conductor-update","data":{"source":"BITS","user":{"id":"127986005","login":"a1periko","display_name":"a1periko","profile_image_url":"https://static-cdn.jtvnw.net/user-default-pictures-uv/41780b5a-def8-11e9-94d9-784f43822e80-profile_image-50x50.png"},"participations":{"BITS.CHEER":2000}}}'}},
		new Date("Wed Aug 17 2022 21:15:33 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.order.45417bf0-07e9-4f4b-8f3b-338abcecc6ce\",\"user_id\":\"668696809\",\"user_login\":\"dazzlingrainb0w\",\"user_display_name\":\"dazzlingrainb0w\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/bf9b672f-9e96-40f1-b49a-7d50d6504aea-profile_image-50x50.png\",\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":2}}"}},
		new Date("Wed Aug 17 2022 21:16:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"668696809\",\"user_login\":\"dazzlingrainb0w\",\"user_display_name\":\"dazzlingrainb0w\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/bf9b672f-9e96-40f1-b49a-7d50d6504aea-profile_image-50x50.png\",\"sequence_id\":2500,\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":2,\"progress\":{\"level\":{\"value\":2,\"goal\":3400,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_0457808073314f62962554c12ebb6b4d\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHands1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c40cd16027f48c0a70ac7b1fa1c397e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHands2\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_0330a84e75ad48c1821c1d29a7dadd4d\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeFail\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_9b68a8fa2f1d457496ac016b251e06b6\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHai\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_9bcc622c0b2a48b180a159c25a2b8245\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeNom\"}],\"impressions\":600},\"value\":900,\"goal\":1800,\"total\":2500,\"remaining_seconds\":223},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:16:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-level-up\",\"data\":{\"time_to_expire\":1660764109000,\"progress\":{\"level\":{\"value\":2,\"goal\":3400,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_0457808073314f62962554c12ebb6b4d\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHands1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c40cd16027f48c0a70ac7b1fa1c397e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHands2\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_0330a84e75ad48c1821c1d29a7dadd4d\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeFail\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_9b68a8fa2f1d457496ac016b251e06b6\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHai\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_9bcc622c0b2a48b180a159c25a2b8245\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeNom\"}],\"impressions\":600},\"value\":900,\"goal\":1800,\"total\":2500,\"remaining_seconds\":299},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:16:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"668696809\",\"login\":\"dazzlingrainb0w\",\"display_name\":\"dazzlingrainb0w\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/bf9b672f-9e96-40f1-b49a-7d50d6504aea-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":2}}}"}},
		new Date("Wed Aug 17 2022 21:16:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":28,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":8,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":9,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":10,\"score\":2,\"entry_key\":\"78788043\"}],\"entry_context\":{\"entry\":{\"rank\":25,\"score\":1,\"entry_key\":\"668696809\"},\"context\":[{\"rank\":24,\"score\":1,\"entry_key\":\"764414464\"},{\"rank\":25,\"score\":1,\"entry_key\":\"668696809\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.45417bf0-07e9-4f4b-8f3b-338abcecc6ce:402890635:598374438\",\"time_of_event\":1660763809723091976,\"grouping_key\":\"402890635\",\"entry_key\":\"668696809\",\"event_value\":1,\"metadata\":{\"display_name\":\"dazzlingrainb0w\",\"login\":\"dazzlingrainb0w\"}}}"}},
		new Date("Wed Aug 17 2022 21:16:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":28,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":8,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":9,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":10,\"score\":2,\"entry_key\":\"78788043\"}],\"entry_context\":{\"entry\":{\"rank\":13,\"score\":2,\"entry_key\":\"668696809\"},\"context\":[{\"rank\":12,\"score\":2,\"entry_key\":\"476791727\"},{\"rank\":13,\"score\":2,\"entry_key\":\"668696809\"},{\"rank\":14,\"score\":1,\"entry_key\":\"108961936\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.45417bf0-07e9-4f4b-8f3b-338abcecc6ce:402890635:137163908\",\"time_of_event\":1660763809886144075,\"grouping_key\":\"402890635\",\"entry_key\":\"668696809\",\"event_value\":1,\"metadata\":{\"display_name\":\"dazzlingrainb0w\",\"login\":\"dazzlingrainb0w\"}}}"}},
		new Date("Wed Aug 17 2022 21:16:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"user-subscribe-events-v1.29961813","message":"{\"user_id\":\"29961813\",\"channel_id\":\"402890635\"}"}},
		new Date("Wed Aug 17 2022 21:16:57 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"user-subscribe-events-v1.29961813","message":"{\"user_id\":\"29961813\",\"channel_id\":\"402890635\"}"}},
		new Date("Wed Aug 17 2022 21:17:02 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"channel-sub-gifts-v1.402890635","message":"{\"count\":5,\"tier\":\"1000\",\"user_id\":\"579372764\",\"channel_id\":\"402890635\",\"uuid\":\"08348f24-39b8-45e3-9bff-f492927b6f47\",\"type\":\"mystery-gift-purchase\",\"user_name\":\"trevorblue_b\",\"display_name\":\"TrevorBlue_B\"}"}},
		new Date("Wed Aug 17 2022 21:17:36 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.order.c8074e45-b149-46f2-8bb3-011b7d5b5318\",\"user_id\":\"579372764\",\"user_login\":\"trevorblue_b\",\"user_display_name\":\"TrevorBlue_B\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\",\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":5}}"}},
		new Date("Wed Aug 17 2022 21:17:36 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"579372764\",\"user_login\":\"trevorblue_b\",\"user_display_name\":\"TrevorBlue_B\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\",\"sequence_id\":5000,\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":5,\"progress\":{\"level\":{\"value\":3,\"goal\":5500,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_08abf0cd0e78494a9da8a2315c3648f4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeBLEH\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_ccc146905a694f3b8df390f55e34002a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeApplause\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_4918bd32ff5b476f82bda49f3e958767\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeRage\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d01d1cf36b549098434c7a6e50a8828\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeMwah\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_43da115e6b6749828f7dee47d17dd315\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHuh\"}],\"impressions\":900},\"value\":1600,\"goal\":2100,\"total\":5000,\"remaining_seconds\":253},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:17:36 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-level-up\",\"data\":{\"time_to_expire\":1660764156000,\"progress\":{\"level\":{\"value\":3,\"goal\":5500,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_08abf0cd0e78494a9da8a2315c3648f4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeBLEH\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_ccc146905a694f3b8df390f55e34002a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeApplause\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_4918bd32ff5b476f82bda49f3e958767\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeRage\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d01d1cf36b549098434c7a6e50a8828\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeMwah\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_43da115e6b6749828f7dee47d17dd315\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHuh\"}],\"impressions\":900},\"value\":1600,\"goal\":2100,\"total\":5000,\"remaining_seconds\":299},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:17:36 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"579372764\",\"login\":\"trevorblue_b\",\"display_name\":\"TrevorBlue_B\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":5}}}"}},
		new Date("Wed Aug 17 2022 21:17:36 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":28,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":8,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":9,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":10,\"score\":2,\"entry_key\":\"78788043\"}],\"entry_context\":{\"entry\":{\"rank\":14,\"score\":2,\"entry_key\":\"579372764\"},\"context\":[{\"rank\":13,\"score\":2,\"entry_key\":\"668696809\"},{\"rank\":14,\"score\":2,\"entry_key\":\"579372764\"},{\"rank\":15,\"score\":1,\"entry_key\":\"108961936\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.c8074e45-b149-46f2-8bb3-011b7d5b5318:402890635:74210919\",\"time_of_event\":1660763857903159048,\"grouping_key\":\"402890635\",\"entry_key\":\"579372764\",\"event_value\":1,\"metadata\":{\"display_name\":\"TrevorBlue_B\",\"login\":\"trevorblue_b\"}}}"}},
		new Date("Wed Aug 17 2022 21:17:38 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":28,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":8,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":9,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":10,\"score\":3,\"entry_key\":\"579372764\"}],\"entry_context\":{\"entry\":{\"rank\":10,\"score\":3,\"entry_key\":\"579372764\"},\"context\":[{\"rank\":9,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":10,\"score\":3,\"entry_key\":\"579372764\"},{\"rank\":11,\"score\":2,\"entry_key\":\"78788043\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.c8074e45-b149-46f2-8bb3-011b7d5b5318:402890635:152360150\",\"time_of_event\":1660763857900082714,\"grouping_key\":\"402890635\",\"entry_key\":\"579372764\",\"event_value\":1,\"metadata\":{\"display_name\":\"TrevorBlue_B\",\"login\":\"trevorblue_b\"}}}"}},
		new Date("Wed Aug 17 2022 21:17:38 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":28,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":8,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":9,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":10,\"score\":4,\"entry_key\":\"579372764\"}],\"entry_context\":{\"entry\":{\"rank\":10,\"score\":4,\"entry_key\":\"579372764\"},\"context\":[{\"rank\":9,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":10,\"score\":4,\"entry_key\":\"579372764\"},{\"rank\":11,\"score\":2,\"entry_key\":\"78788043\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.c8074e45-b149-46f2-8bb3-011b7d5b5318:402890635:86987774\",\"time_of_event\":1660763857906084991,\"grouping_key\":\"402890635\",\"entry_key\":\"579372764\",\"event_value\":1,\"metadata\":{\"display_name\":\"TrevorBlue_B\",\"login\":\"trevorblue_b\"}}}"}},
		new Date("Wed Aug 17 2022 21:17:38 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":28,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":8,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":9,\"score\":5,\"entry_key\":\"579372764\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":9,\"score\":5,\"entry_key\":\"579372764\"},\"context\":[{\"rank\":8,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":9,\"score\":5,\"entry_key\":\"579372764\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.c8074e45-b149-46f2-8bb3-011b7d5b5318:402890635:147851967\",\"time_of_event\":1660763857934258375,\"grouping_key\":\"402890635\",\"entry_key\":\"579372764\",\"event_value\":1,\"metadata\":{\"display_name\":\"TrevorBlue_B\",\"login\":\"trevorblue_b\"}}}"}},
		new Date("Wed Aug 17 2022 21:17:38 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":28,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},\"context\":[{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.c8074e45-b149-46f2-8bb3-011b7d5b5318:402890635:67885371\",\"time_of_event\":1660763857942779019,\"grouping_key\":\"402890635\",\"entry_key\":\"579372764\",\"event_value\":1,\"metadata\":{\"display_name\":\"TrevorBlue_B\",\"login\":\"trevorblue_b\"}}}"}},
		new Date("Wed Aug 17 2022 21:17:38 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.order.61d0d07a-08ab-4df2-8af7-1e2ca192321a\",\"user_id\":\"467416058\",\"user_login\":\"yaga77\",\"user_display_name\":\"yaga77\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/75305d54-c7cc-40d1-bb9c-91fbe85943c7-profile_image-50x50.png\",\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1}}"}},
		new Date("Wed Aug 17 2022 21:18:13 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"467416058\",\"user_login\":\"yaga77\",\"user_display_name\":\"yaga77\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/75305d54-c7cc-40d1-bb9c-91fbe85943c7-profile_image-50x50.png\",\"sequence_id\":5500,\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1,\"progress\":{\"level\":{\"value\":4,\"goal\":7800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeWave\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_271ea48a09ca418baad2ea1f734ab09e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeReading\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1337536bcecf49f4bb9cd1a699341ee2\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeShock\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeStress\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCry\"}],\"impressions\":1200},\"value\":0,\"goal\":2300,\"total\":5500,\"remaining_seconds\":263},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:18:13 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-level-up\",\"data\":{\"time_to_expire\":1660764192000,\"progress\":{\"level\":{\"value\":4,\"goal\":7800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeWave\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_271ea48a09ca418baad2ea1f734ab09e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeReading\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1337536bcecf49f4bb9cd1a699341ee2\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeShock\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeStress\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCry\"}],\"impressions\":1200},\"value\":0,\"goal\":2300,\"total\":5500,\"remaining_seconds\":299},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:18:13 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"579372764\",\"login\":\"trevorblue_b\",\"display_name\":\"TrevorBlue_B\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":5}}}"}},
		new Date("Wed Aug 17 2022 21:18:13 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.sub.11541ccd-dc6b-48f7-aed1-3289f926316f\",\"user_id\":\"434509254\",\"user_login\":\"keligiis\",\"user_display_name\":\"keligiis\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/cd15e6c3-b023-405e-b63f-b20d20295bdc-profile_image-50x50.png\",\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1}}"}},
		new Date("Wed Aug 17 2022 21:18:19 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"434509254\",\"user_login\":\"keligiis\",\"user_display_name\":\"keligiis\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/cd15e6c3-b023-405e-b63f-b20d20295bdc-profile_image-50x50.png\",\"sequence_id\":6000,\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1,\"progress\":{\"level\":{\"value\":4,\"goal\":7800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeWave\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_271ea48a09ca418baad2ea1f734ab09e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeReading\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1337536bcecf49f4bb9cd1a699341ee2\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeShock\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeStress\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCry\"}],\"impressions\":1200},\"value\":500,\"goal\":2300,\"total\":6000,\"remaining_seconds\":293},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:18:19 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"579372764\",\"login\":\"trevorblue_b\",\"display_name\":\"TrevorBlue_B\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":5}}}"}},
		new Date("Wed Aug 17 2022 21:18:19 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.sub.0b2ee158-d420-4f14-a1d5-eb65a552dd36\",\"user_id\":\"74486265\",\"user_login\":\"marin_______\",\"user_display_name\":\"Marin_______\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/174ea931-9874-4e88-b78b-cecf22f50d1b-profile_image-50x50.png\",\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1}}"}},
		new Date("Wed Aug 17 2022 21:18:26 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"74486265\",\"user_login\":\"marin_______\",\"user_display_name\":\"Marin_______\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/174ea931-9874-4e88-b78b-cecf22f50d1b-profile_image-50x50.png\",\"sequence_id\":6500,\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1,\"progress\":{\"level\":{\"value\":4,\"goal\":7800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeWave\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_271ea48a09ca418baad2ea1f734ab09e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeReading\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1337536bcecf49f4bb9cd1a699341ee2\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeShock\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeStress\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCry\"}],\"impressions\":1200},\"value\":1000,\"goal\":2300,\"total\":6500,\"remaining_seconds\":286},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:18:26 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"579372764\",\"login\":\"trevorblue_b\",\"display_name\":\"TrevorBlue_B\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":5}}}"}},
		new Date("Wed Aug 17 2022 21:18:26 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"channel-sub-gifts-v1.402890635","message":"{\"count\":5,\"tier\":\"1000\",\"user_id\":\"681324004\",\"channel_id\":\"402890635\",\"uuid\":\"26796151-e5a9-40b4-a323-dfd3d359f3bc\",\"type\":\"mystery-gift-purchase\",\"user_name\":\"blood_swords\",\"display_name\":\"blood_swords\"}"}},
		new Date("Wed Aug 17 2022 21:18:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.order.076d012c-0044-4f66-9213-a244dd05a4d3\",\"user_id\":\"681324004\",\"user_login\":\"blood_swords\",\"user_display_name\":\"blood_swords\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/ead5c8b2-a4c9-4724-b1dd-9f00b46cbd3d-profile_image-50x50.png\",\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":5}}"}},
		new Date("Wed Aug 17 2022 21:18:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"681324004\",\"user_login\":\"blood_swords\",\"user_display_name\":\"blood_swords\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/ead5c8b2-a4c9-4724-b1dd-9f00b46cbd3d-profile_image-50x50.png\",\"sequence_id\":9000,\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":5,\"progress\":{\"level\":{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500},\"value\":1200,\"goal\":3000,\"total\":9000,\"remaining_seconds\":263},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:18:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-level-up\",\"data\":{\"time_to_expire\":1660764229000,\"progress\":{\"level\":{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500},\"value\":1200,\"goal\":3000,\"total\":9000,\"remaining_seconds\":299},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:18:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"579372764\",\"login\":\"trevorblue_b\",\"display_name\":\"TrevorBlue_B\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":5}}}"}},
		new Date("Wed Aug 17 2022 21:18:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":29,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":29,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":29,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.076d012c-0044-4f66-9213-a244dd05a4d3:402890635:125661132\",\"time_of_event\":1660763930422706745,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:18:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":30,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":30,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":30,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.076d012c-0044-4f66-9213-a244dd05a4d3:402890635:144592651\",\"time_of_event\":1660763930426115456,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:18:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":31,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":31,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":31,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.076d012c-0044-4f66-9213-a244dd05a4d3:402890635:72842559\",\"time_of_event\":1660763930437996822,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:18:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":32,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":32,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":32,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.076d012c-0044-4f66-9213-a244dd05a4d3:402890635:419192231\",\"time_of_event\":1660763930456524048,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:18:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":6,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.076d012c-0044-4f66-9213-a244dd05a4d3:402890635:88546090\",\"time_of_event\":1660763930423317633,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:18:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"channel-sub-gifts-v1.402890635","message":"{\"count\":5,\"tier\":\"1000\",\"user_id\":\"503688568\",\"channel_id\":\"402890635\",\"uuid\":\"929660df-4c1c-4a2d-81df-f3f7134f4e70\",\"type\":\"mystery-gift-purchase\",\"user_name\":\"saberan31\",\"display_name\":\"saberan31\"}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.order.0ea37662-0a53-43f6-96d7-daf694c95ecb\",\"user_id\":\"503688568\",\"user_login\":\"saberan31\",\"user_display_name\":\"saberan31\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/772ee170-14f5-4ade-a285-c252d350e9a8-profile_image-50x50.png\",\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":5}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-level-up\",\"data\":{\"time_to_expire\":1660764229000,\"progress\":{\"level\":{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500},\"value\":3700,\"goal\":3000,\"total\":11500,\"remaining_seconds\":284},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"503688568\",\"user_login\":\"saberan31\",\"user_display_name\":\"saberan31\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/772ee170-14f5-4ade-a285-c252d350e9a8-profile_image-50x50.png\",\"sequence_id\":11500,\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":5,\"progress\":{\"level\":{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500},\"value\":3700,\"goal\":3000,\"total\":11500,\"remaining_seconds\":284},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"579372764\",\"login\":\"trevorblue_b\",\"display_name\":\"TrevorBlue_B\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":5}}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":7,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":6,\"score\":7,\"entry_key\":\"503688568\"},\"context\":[{\"rank\":5,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":6,\"score\":7,\"entry_key\":\"503688568\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.0ea37662-0a53-43f6-96d7-daf694c95ecb:402890635:29731560\",\"time_of_event\":1660763945232697345,\"grouping_key\":\"402890635\",\"entry_key\":\"503688568\",\"event_value\":1,\"metadata\":{\"display_name\":\"saberan31\",\"login\":\"saberan31\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":8,\"entry_key\":\"503688568\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":5,\"score\":8,\"entry_key\":\"503688568\"},\"context\":[{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":8,\"entry_key\":\"503688568\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.0ea37662-0a53-43f6-96d7-daf694c95ecb:402890635:59677433\",\"time_of_event\":1660763945229687873,\"grouping_key\":\"402890635\",\"entry_key\":\"503688568\",\"event_value\":1,\"metadata\":{\"display_name\":\"saberan31\",\"login\":\"saberan31\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":9,\"entry_key\":\"503688568\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":5,\"score\":9,\"entry_key\":\"503688568\"},\"context\":[{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":9,\"entry_key\":\"503688568\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.0ea37662-0a53-43f6-96d7-daf694c95ecb:402890635:44481201\",\"time_of_event\":1660763945273724523,\"grouping_key\":\"402890635\",\"entry_key\":\"503688568\",\"event_value\":1,\"metadata\":{\"display_name\":\"saberan31\",\"login\":\"saberan31\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":10,\"entry_key\":\"503688568\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":5,\"score\":10,\"entry_key\":\"503688568\"},\"context\":[{\"rank\":4,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":5,\"score\":10,\"entry_key\":\"503688568\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.0ea37662-0a53-43f6-96d7-daf694c95ecb:402890635:404007570\",\"time_of_event\":1660763945245753885,\"grouping_key\":\"402890635\",\"entry_key\":\"503688568\",\"event_value\":1,\"metadata\":{\"display_name\":\"saberan31\",\"login\":\"saberan31\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},\"context\":[{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.0ea37662-0a53-43f6-96d7-daf694c95ecb:402890635:105608385\",\"time_of_event\":1660763945227850735,\"grouping_key\":\"402890635\",\"entry_key\":\"503688568\",\"event_value\":1,\"metadata\":{\"display_name\":\"saberan31\",\"login\":\"saberan31\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:05 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"channel-sub-gifts-v1.402890635","message":"{\"count\":5,\"tier\":\"1000\",\"user_id\":\"49723676\",\"channel_id\":\"402890635\",\"uuid\":\"1abf5d67-8818-42a9-a725-5a96cae91800\",\"type\":\"mystery-gift-purchase\",\"user_name\":\"johnyficus\",\"display_name\":\"JohnyFicus\"}"}},
		new Date("Wed Aug 17 2022 21:19:27 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.order.14ed3148-dd62-41b0-acdf-f84007075d58\",\"user_id\":\"49723676\",\"user_login\":\"johnyficus\",\"user_display_name\":\"JohnyFicus\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/johnyficus-profile_image-fdc6ad44d44558ec-50x50.png\",\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":5}}"}},
		new Date("Wed Aug 17 2022 21:19:27 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"49723676\",\"user_login\":\"johnyficus\",\"user_display_name\":\"JohnyFicus\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/johnyficus-profile_image-fdc6ad44d44558ec-50x50.png\",\"sequence_id\":14000,\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":5,\"progress\":{\"level\":{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500},\"value\":6200,\"goal\":3000,\"total\":14000,\"remaining_seconds\":261},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:19:28 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"579372764\",\"login\":\"trevorblue_b\",\"display_name\":\"TrevorBlue_B\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/014fb71b-6fb0-4212-aad1-4e475cc89b44-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":5}}}"}},
		new Date("Wed Aug 17 2022 21:19:28 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":26,\"score\":1,\"entry_key\":\"49723676\"},\"context\":[{\"rank\":25,\"score\":1,\"entry_key\":\"764414464\"},{\"rank\":26,\"score\":1,\"entry_key\":\"49723676\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.14ed3148-dd62-41b0-acdf-f84007075d58:402890635:185565250\",\"time_of_event\":1660763968583377183,\"grouping_key\":\"402890635\",\"entry_key\":\"49723676\",\"event_value\":1,\"metadata\":{\"display_name\":\"JohnyFicus\",\"login\":\"johnyficus\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:28 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":15,\"score\":2,\"entry_key\":\"49723676\"},\"context\":[{\"rank\":14,\"score\":2,\"entry_key\":\"668696809\"},{\"rank\":15,\"score\":2,\"entry_key\":\"49723676\"},{\"rank\":16,\"score\":1,\"entry_key\":\"108961936\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.14ed3148-dd62-41b0-acdf-f84007075d58:402890635:140252242\",\"time_of_event\":1660763968597613811,\"grouping_key\":\"402890635\",\"entry_key\":\"49723676\",\"event_value\":1,\"metadata\":{\"display_name\":\"JohnyFicus\",\"login\":\"johnyficus\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:28 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":11,\"score\":3,\"entry_key\":\"49723676\"},\"context\":[{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":11,\"score\":3,\"entry_key\":\"49723676\"},{\"rank\":12,\"score\":2,\"entry_key\":\"78788043\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.14ed3148-dd62-41b0-acdf-f84007075d58:402890635:596247114\",\"time_of_event\":1660763968664732799,\"grouping_key\":\"402890635\",\"entry_key\":\"49723676\",\"event_value\":1,\"metadata\":{\"display_name\":\"JohnyFicus\",\"login\":\"johnyficus\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:29 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"}],\"entry_context\":{\"entry\":{\"rank\":11,\"score\":4,\"entry_key\":\"49723676\"},\"context\":[{\"rank\":10,\"score\":4,\"entry_key\":\"534165905\"},{\"rank\":11,\"score\":4,\"entry_key\":\"49723676\"},{\"rank\":12,\"score\":2,\"entry_key\":\"78788043\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.14ed3148-dd62-41b0-acdf-f84007075d58:402890635:270921387\",\"time_of_event\":1660763968631217104,\"grouping_key\":\"402890635\",\"entry_key\":\"49723676\",\"event_value\":1,\"metadata\":{\"display_name\":\"JohnyFicus\",\"login\":\"johnyficus\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:29 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":33,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"},\"context\":[{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"},{\"rank\":11,\"score\":4,\"entry_key\":\"534165905\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.14ed3148-dd62-41b0-acdf-f84007075d58:402890635:93163383\",\"time_of_event\":1660763968619374877,\"grouping_key\":\"402890635\",\"entry_key\":\"49723676\",\"event_value\":1,\"metadata\":{\"display_name\":\"JohnyFicus\",\"login\":\"johnyficus\"}}}"}},
		new Date("Wed Aug 17 2022 21:19:29 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"channel-sub-gifts-v1.402890635","message":"{\"count\":10,\"tier\":\"1000\",\"user_id\":\"681324004\",\"channel_id\":\"402890635\",\"uuid\":\"2c319317-a839-403b-8f98-2f85f3591f23\",\"type\":\"mystery-gift-purchase\",\"user_name\":\"blood_swords\",\"display_name\":\"blood_swords\"}"}},
		new Date("Wed Aug 17 2022 21:22:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a\",\"user_id\":\"681324004\",\"user_login\":\"blood_swords\",\"user_display_name\":\"blood_swords\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/ead5c8b2-a4c9-4724-b1dd-9f00b46cbd3d-profile_image-50x50.png\",\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":10}}"}},
		new Date("Wed Aug 17 2022 21:22:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"681324004\",\"user_login\":\"blood_swords\",\"user_display_name\":\"blood_swords\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/ead5c8b2-a4c9-4724-b1dd-9f00b46cbd3d-profile_image-50x50.png\",\"sequence_id\":19000,\"action\":\"TIER_1_GIFTED_SUB\",\"source\":\"SUBS\",\"quantity\":10,\"progress\":{\"level\":{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500},\"value\":11200,\"goal\":3000,\"total\":19000,\"remaining_seconds\":60},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:22:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"681324004\",\"login\":\"blood_swords\",\"display_name\":\"blood_swords\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/ead5c8b2-a4c9-4724-b1dd-9f00b46cbd3d-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":15}}}"}},
		new Date("Wed Aug 17 2022 21:22:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":34,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":34,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":34,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:413569551\",\"time_of_event\":1660764169681993851,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:49 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":35,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":35,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":35,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:406365664\",\"time_of_event\":1660764169672219374,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":36,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":36,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":36,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:53767556\",\"time_of_event\":1660764169695279609,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":37,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":37,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":37,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:144237988\",\"time_of_event\":1660764169682868152,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":38,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":38,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":38,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:417009760\",\"time_of_event\":1660764169697731050,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":39,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":39,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":39,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:93492156\",\"time_of_event\":1660764169749619950,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":40,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":40,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":40,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:55592903\",\"time_of_event\":1660764169701361776,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":41,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":41,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":41,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:505659791\",\"time_of_event\":1660764169748917720,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":42,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":42,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":42,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:62032648\",\"time_of_event\":1660764169716333475,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"leaderboard-events-v1.sub-gifts-sent-402890635-MONTH","message":"{\"identifier\":{\"domain\":\"sub-gifts-sent\",\"grouping_key\":\"402890635\",\"time_aggregation_unit\":\"MONTH\",\"time_bucket\":\"2022-08-01T00:00:00-07:00\"},\"top\":[{\"rank\":1,\"score\":43,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"},{\"rank\":3,\"score\":17,\"entry_key\":\"131162212\"},{\"rank\":4,\"score\":11,\"entry_key\":\"503688568\"},{\"rank\":5,\"score\":10,\"entry_key\":\"116496636\"},{\"rank\":6,\"score\":7,\"entry_key\":\"38046330\"},{\"rank\":7,\"score\":6,\"entry_key\":\"579372764\"},{\"rank\":8,\"score\":5,\"entry_key\":\"177260299\"},{\"rank\":9,\"score\":5,\"entry_key\":\"148474909\"},{\"rank\":10,\"score\":5,\"entry_key\":\"49723676\"}],\"entry_context\":{\"entry\":{\"rank\":1,\"score\":43,\"entry_key\":\"681324004\"},\"context\":[{\"rank\":1,\"score\":43,\"entry_key\":\"681324004\"},{\"rank\":2,\"score\":20,\"entry_key\":\"101050759\"}]},\"event\":{\"domain\":\"sub-gifts-sent\",\"id\":\"amzn1.twitch.payments.order.5fa47561-f90b-46eb-a8b9-84644780b56a:402890635:57503116\",\"time_of_event\":1660764169718523857,\"grouping_key\":\"402890635\",\"entry_key\":\"681324004\",\"event_value\":1,\"metadata\":{\"display_name\":\"blood_swords\",\"login\":\"blood_swords\"}}}"}},
		new Date("Wed Aug 17 2022 21:22:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.sub.158b5395-4c61-4c1e-bb71-afd36addfae7\",\"user_id\":\"187412887\",\"user_login\":\"dindonluisant\",\"user_display_name\":\"dindonluisant\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/2058ed5b-dddd-42ff-b61c-eb80b929bb22-profile_image-50x50.png\",\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1}}"}},
		new Date("Wed Aug 17 2022 21:23:04 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"187412887\",\"user_login\":\"dindonluisant\",\"user_display_name\":\"dindonluisant\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/2058ed5b-dddd-42ff-b61c-eb80b929bb22-profile_image-50x50.png\",\"sequence_id\":19500,\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1,\"progress\":{\"level\":{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500},\"value\":11700,\"goal\":3000,\"total\":19500,\"remaining_seconds\":45},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:23:04 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"681324004\",\"login\":\"blood_swords\",\"display_name\":\"blood_swords\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/ead5c8b2-a4c9-4724-b1dd-9f00b46cbd3d-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":15}}}"}},
		new Date("Wed Aug 17 2022 21:23:04 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-end\",\"data\":{\"ended_at\":1660764230000,\"ending_reason\":\"COMPLETED\",\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:23:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"user-subscribe-events-v1.29961813","message":"{\"user_id\":\"29961813\",\"channel_id\":\"0\"}"}},
		new Date("Wed Aug 17 2022 21:23:53 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.rewards.29961813","message":"{\"type\":\"hype-train-rewards\",\"data\":{\"channel_id\":\"402890635\",\"completed_level\":5,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":5,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"}],\"is_boost_train\":false,\"is_golden_kappa_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:23:53 GMT+0200"),
	];
}
