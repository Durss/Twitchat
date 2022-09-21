import { storeAutomod } from '@/store/automod/storeAutomod';
import { storeChat } from '@/store/chat/storeChat';
import { storeEmergency } from '@/store/emergency/storeEmergency';
import { storeParams } from '@/store/params/storeParams';
import { storePoll } from '@/store/poll/storePoll';
import { storePrediction } from '@/store/prediction/storePrediction';
import { storeMain } from '@/store/storeMain';
import { storeStream } from '@/store/stream/storeStream';
import { storeUsers } from '@/store/users/storeUsers';
import type { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import TwitchUtils from '@/utils/TwitchUtils';
import { LoremIpsum } from "lorem-ipsum";
import type { ChatUserstate } from "tmi.js";
import type { JsonObject } from "type-fest";
import { reactive } from "vue";
import type { TwitchDataTypes } from '../types/TwitchDataTypes';
import { EventDispatcher } from "./EventDispatcher";
import IRCClient from "./IRCClient";
import type { IRCEventDataList } from './IRCEventDataTypes';
import OBSWebsocket from "./OBSWebsocket";
import PublicAPI from "./PublicAPI";
import type { PubSubDataTypes } from './PubSubDataTypes';
import PubSubEvent from "./PubSubEvent";
import TriggerActionHandler from "./TriggerActionHandler";
import TwitchatEvent from "./TwitchatEvent";
import UserSession from './UserSession';
import Utils from "./Utils";

/**
* Created : 13/01/2022 
*/
export default class PubSub extends EventDispatcher{

	private static _instance:PubSub;
	private socket!:WebSocket;
	private pingInterval!:number;
	private reconnectTimeout!:number;
	private hypeTrainApproachingTimer!:number;
	private hypeTrainProgressTimer!:number;
	private history:PubSubDataTypes.SocketMessage[] = [];
	private raidTimeout!:number;
	private lastRecentFollowers:PubSubDataTypes.Following[] = [];
	private followCache:{[key:string]:boolean} = {};
	private sPoll = storePoll();
	private sMain = storeMain();
	private sChat = storeChat();
	private sUsers = storeUsers();
	private sAutmod = storeAutomod();
	private sParams = storeParams();
	private sStream = storeStream();
	private sEmergency = storeEmergency();
	private sPrediction = storePrediction();
	
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

	public get eventsHistory():PubSubDataTypes.SocketMessage[] { return this.history; }
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
	}

	public connect():void {
		this.socket = new WebSocket("wss://pubsub-edge.twitch.tv");

		this.socket.onopen = async () => {
			//It's required to ping the server at least every 5min
			//to keep the connection alive
			clearInterval(this.pingInterval);
			this.pingInterval = window.setInterval(() => {
				this.ping();
			}, 60000*2.5);

			const uid = UserSession.instance.authToken.user_id;
			const subscriptions = [
				"channel-points-channel-v1."+uid,
				"chat_moderator_actions."+uid+"."+uid,
				"automod-queue."+uid+"."+uid,
				"user-moderation-notifications."+uid+"."+uid,
				"leaderboard-events-v1.bits-usage-by-channel-v1-"+uid+"-WEEK",
				"leaderboard-events-v1.sub-gifts-sent-"+uid+"-WEEK",
				"raid."+uid,
				"predictions-channel-v1."+uid,
				"polls."+uid,
				"hype-train-events-v1."+uid,
				"following."+uid,
				"ads."+uid,
				"video-playback-by-id."+uid,//Get viewer count
				"community-boost-events-v1."+uid,//Boost after a boost train complete
				"ad-property-refresh."+uid,
				"whispers."+uid,
				"chatrooms-user-v1."+uid,//TO or ban events
				"stream-chat-room-v1."+uid,//Host events or extension messages
				"broadcast-settings-update."+uid,//Stream info update
				// "user-drop-events."+uid,
				// "community-points-user-v1."+uid,
				// "presence."+uid,
				// "user-properties-update."+uid,
				// "onsite-notifications."+uid,

				"low-trust-users."+UserSession.instance.authToken.user_id+"."+UserSession.instance.authToken.user_id,
				// "stream-change-v1."+UserSession.instance.authToken.user_id,
			];

			
			if(IRCClient.instance.debugChans.length > 0) {
				//Subscribe to someone else's channel points
				let chans = IRCClient.instance.debugChans;
				const users = await TwitchUtils.loadUserInfo(undefined, chans);
				const uids = users.map(v=> v.id);
				for (let i = 0; i < uids.length; i++) {
					const uid = uids[i];
					subscriptions.push("raid."+uid);
					subscriptions.push("hype-train-events-v1."+uid);
					subscriptions.push("video-playback-by-id."+uid);//Get viewers count
					subscriptions.push("community-points-channel-v1."+uid);//Get channel points rewards
					subscriptions.push("community-boost-events-v1."+uid);//Get channel points rewards
					// subscriptions.push("channel-ad-poll-update-events."+uid);
					// subscriptions.push("predictions-channel-v1."+uid);//Get prediction events
					// subscriptions.push("polls."+uid);//Get prediction event//Get poll events
					// subscriptions.push("pv-watch-party-events."+uid);
					subscriptions.push("stream-chat-room-v1."+uid);//Host events
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
			if(message.type != "PONG" && message.data) {
				const data = JSON.parse(message.data.message);
				if(this.sMain.devmode) {
					//Ignore viewers count to avoid massive logs
					if(message.data.topic != "video-playback-by-id."+UserSession.instance.authToken.user_id) {
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
		const dateOffset = (PubsubJSON.RealHypeTrainData[1] as Date).getTime();
		const timeScale = .05;
		for (let i = 0; i < PubsubJSON.RealHypeTrainData.length; i+=2) {
			const date = PubsubJSON.RealHypeTrainData[i+1] as Date;
			const event = PubsubJSON.RealHypeTrainData[i] as {data:{message:string}};
			Utils.promisedTimeout((date.getTime() - dateOffset)*timeScale).then(()=> {
				const json = JSON.parse(event.data.message);
				this.parseEvent( json );
			})
		}
		// this.parseEvent(PubsubJSON.HypeTrainApproaching);
		// await Utils.promisedTimeout(10000);
		// this.parseEvent(PubsubJSON.HypeTrainStart);
		// await Utils.promisedTimeout(5000);
		// // this.parseEvent(PubsubJSON.HypeTrainProgressBits);
		// // this.parseEvent(PubsubJSON.HypeTrainConductorUpdateBits);
		// this.parseEvent(PubsubJSON.HypeTrainLevelUp2);
		// await Utils.promisedTimeout(10000);
		// // this.parseEvent(PubsubJSON.HypeTrainProgressSubGift);
		// // this.parseEvent(PubsubJSON.HypeTrainConductorUpdateSubGifts);
		// this.parseEvent(PubsubJSON.HypeTrainLevelUp5);
		// await Utils.promisedTimeout(10000);
		// // this.parseEvent(PubsubJSON.HypeTrainProgressSub);
		// // this.parseEvent(PubsubJSON.HypeTrainConductorUpdateSubs);
		// // await Utils.promisedTimeout(5000);
		// this.parseEvent(PubsubJSON.HypeTrainComplete);
		// await Utils.promisedTimeout(10000);
		// this.parseEvent(PubsubJSON.HypeTrainExpire);
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

	public async simulateChallengeContribution():Promise<void> {
		this.parseEvent(PubsubJSON.ChannelPointChallengeContribution);
	}

	public async simulateLowTrustUser():Promise<void> {
		const m = PubsubJSON.LowTrustMessage;
		m.data.message_id = IRCClient.instance.getFakeGuid();

		//Send fake message on tchat to flag it afterwards
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
		};

		IRCClient.instance.addMessage(m.data.message_content.fragments[0].text, tags, false);

		//Flag mesage as low trust
		this.parseEvent(m);
	}

	public async simulateFollowbotRaid():Promise<void> {
		const lorem = new LoremIpsum({ wordsPerSentence: { max: 16, min: 4 } });
		for (let i = 0; i < 400; i++) {
			const id = Math.round(Math.random()*1000000);
			const login = lorem.generateWords(Math.round(Math.random()*2)+1).split(" ").join("_");
			this.followingEvent({
				display_name: login,
				username: login,
				user_id:id.toString(),
			}, true)
			if(Math.random() > .5) {
				await Utils.promisedTimeout(Math.random()*40);
			}
		}
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

	private nonce(length = 18):string {
		let text = "";
		const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for(let i = 0; i < length; i++) {
			text += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return text;
	}

	private subscribe(topics:string[]):void {
		const access_token = UserSession.instance.authResult?.access_token;
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

	private parseEvent(data:{type:string, data?:unknown, raid?:PubSubDataTypes.RaidInfos}, topic?:string):void {
		
		if(topic && /following\.[0-9]+/.test(topic)) {
			const localObj = (data as unknown) as PubSubDataTypes.Following;
			this.followingEvent(localObj);



		}else if(topic && /video-playback-by-id\.[0-9]+/.test(topic)) {
			const localObj = (data as unknown) as PubSubDataTypes.PlaybackInfo;
			if(localObj.type == "viewcount") {
				this.sStream.setPlaybackState(localObj);
			}else 
			if(localObj.type == "stream-down") {
				this.sStream.setPlaybackState(undefined);
			}



		//sent when sending a whisper from anywhere
		}else if(data.type == "whisper_sent") {
			data.data = JSON.parse(data.data as string);//for this event it's a string..thanks twitch for your consistency
			const localObj = (data.data as unknown) as PubSubDataTypes.WhisperSent;
			localObj.tags.username = localObj.tags.display_name;
			localObj.tags["display-name"] = localObj.tags.display_name;//Thx twitch for your consistency
			localObj.tags["user-id"] = localObj.from_id.toString();
			localObj.tags["thread-id"] = localObj.thread_id;
			IRCClient.instance.addWhisper(localObj.body, localObj.tags, localObj.recipient.display_name);



		}else if(data.type == "updated_room") {
			//TODO sent when updating room status (see RoomStatusUpdate JSON example)



		}else if(data.type == "chat_rich_embed") {
			//TODO sent when a clip is sent on chat (see ChatRichEmbed JSON example).
			//Warning: JSON might be mostly empty/incomplete. Example bellow:
			//{"type":"chat_rich_embed","data":{"message_id":"1fda6833-d53c-44d2-958b-389dd2289ff8","request_url":"https://clips.twitch.tv/","thumbnail_url":"https://clips-media-assets2.twitch.tv/-preview-86x45.jpg","twitch_metadata":{"clip_metadata":{"game":"","channel_display_name":"","slug":"","id":"0","broadcaster_id":"","curator_id":""}}}}



		}else if(data.type == "broadcast_settings_update") {
			this.streamInfoUpdate(data as PubSubDataTypes.StreamInfo);



		}else if(data.type == "thread") {
			data.data = JSON.parse(data.data as string);//for this event it's a string..thanks twitch for your consistency
			this.whisperRead(data.data as PubSubDataTypes.WhisperRead);



		}else if(data.type == "hype-train-approaching") {
			this.hypeTrainApproaching(data.data as  PubSubDataTypes.HypeTrainApproaching);



		}else if(data.type == "hype-train-start") {
			this.hypeTrainStart(data.data as  PubSubDataTypes.HypeTrainStart);



		}else if(data.type == "hype-train-progression") {
			this.hypeTrainProgress(data.data as  PubSubDataTypes.HypeTrainProgress);



		}else if(data.type == "hype-train-level-up") {
			this.hypeTrainLevelUp(data.data as  PubSubDataTypes.HypeTrainLevelUp);



		}else if(data.type == "hype-train-end") {
			this.hypeTrainEnd(data.data as  PubSubDataTypes.HypeTrainEnd);



		}else if(data.type == "hype-train-cooldown-expiration") {
			IRCClient.instance.sendHighlight({
				channel: UserSession.instance.authToken.login,
				type:"highlight",
				tags:{
					"tmi-sent-ts":Date.now().toString(),
					"msg-id": "hype_cooldown_expired",
				},
			});



		}else if(data.type == "automod_caught_message") {
			this.automodEvent(data.data as  PubSubDataTypes.AutomodData);



		}else if(data.type == "low_trust_user_treatment_update") {
			//Called when flagging a user as suspicious



		}else if(data.type == "low_trust_user_new_message") {
			this.lowTrustMessage(data.data as  PubSubDataTypes.LowTrustMessage);



		}else if(data.type == "reward-redeemed") {
			//Manage rewards
			if(this.sParams.filters.showRewards.value) {
				const localObj = data.data as  PubSubDataTypes.RewardData;
				this.rewardEvent(localObj);
			}



		}else if(data.type == "community-goal-contribution") {
			//Channel points challenge progress
			const contrib = (data.data as {timpestamp:string, contribution:PubSubDataTypes.ChannelPointChallengeContribution}).contribution
			this.communityChallengeContributionEvent(contrib)



		}else if(data.type == "moderator_added") {
			const user = (data.data as PubSubDataTypes.ModeratorAdded).target_user_login;
			// IRCClient.instance.sendNotice("ban_success", "User "+user+" has been banned by "+localObj.created_by);
			TriggerActionHandler.instance.onMessage({ type:"mod", user});



		}else if(data.type == "vip_added") {
			const user = (data.data as PubSubDataTypes.VIPAdded).target_user_login;
			// IRCClient.instance.sendNotice("ban_success", "User "+user+" has been banned by "+localObj.created_by);
			TriggerActionHandler.instance.onMessage({ type:"vip", user});



		}else if(data.type == "extension_message") {
			//Manage extension messages
			const mess = data.data as PubSubDataTypes.ExtensionMessage;
			if(mess.content) {
				const badges:{[key:string]:string} = {};
				for (let i = 0; i < mess.sender.badges.length; i++) {
					const b = mess.sender.badges[i];
					badges[b.id] = b.version;
				}
				const tags:PubSubDataTypes.IRCTagsExtended = {
					"username": mess.sender.display_name,
					"color": mess.sender.chat_color,
					"display-name": mess.sender.display_name,
					"id": mess.id,
					"user-id": mess.sender.extension_client_id,
					"tmi-sent-ts": new Date(mess.sent_at).getTime().toString(),
					"message-type": "chat",
					"room-id": UserSession.instance.authToken.user_id,
					"badges": badges,
				};
				IRCClient.instance.addMessage(mess.content.text, tags, false);
			}



		}else if(data.type == "POLL_CREATE" || data.type == "POLL_UPDATE" || data.type == "POLL_COMPLETE" || data.type == "POLL_TERMINATE") {
			const localObj = data.data as PubSubDataTypes.PollData;
			this.pollEvent(localObj)



		}else if(data.type == "POLL_ARCHIVE" || data.type == "POLL_MODERATE" || data.type == "POLL_INVALID") {
			TwitchUtils.getPolls();



		}else if(data.type == "event-created" || data.type == "event-updated") {
			const localObj = data.data as PubSubDataTypes.PredictionData;
			this.predictionEvent(localObj);



		}else if(data.type == "raid_update_v2") {
			this.sStream.setRaiding(data.raid);

		}else if(data.type == "raid_go_v2") {
			if(this.sParams.features.stopStreamOnRaid.value === true) {
				clearTimeout(this.raidTimeout)
				this.raidTimeout = setTimeout(() => {
					OBSWebsocket.instance.stopStreaming();
				}, 1000);
			}
			this.sStream.setRaiding(undefined);



		}else if(data.type == "community-boost-start" || data.type == "community-boost-progression") {
			this.sStream.setCommunityBoost(data.data as PubSubDataTypes.CommunityBoost);
			
		}else if(data.type == "community-boost-end") {
			const boost = data.data as PubSubDataTypes.CommunityBoost;
			this.sStream.setCommunityBoost(boost);
			IRCClient.instance.sendHighlight({
				channel: UserSession.instance.authToken.login,
				viewers: boost.total_goal_progress? boost.total_goal_progress : boost.boost_orders[0].GoalProgress,
				type:"highlight",
				tags:{
					"tmi-sent-ts":Date.now().toString(),
					"msg-id": "community_boost_complete",
				},
			});
			
			setTimeout(()=> {
				//Automatically hide the boost after a few seconds
				this.sStream.setCommunityBoost(undefined);
			}, 30000);
			

			
		}else if(data.type == "moderation_action") {
			//Manage moderation actions
			const localObj = data.data as PubSubDataTypes.ModerationData;
			switch(localObj.moderation_action) {
				case "clear": {
					IRCClient.instance.sendNotice("usage_clear", "Chat cleared by "+localObj.created_by);
					break;
				}
				case "timeout": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown user-";
					const duration = localObj.args && localObj.args.length > 1? localObj.args[1] : "600";
					IRCClient.instance.sendNotice("timeout_success", localObj.created_by+" has banned "+user+" for "+duration+" seconds");
					TriggerActionHandler.instance.onMessage({ type:"timeout", duration:parseInt(duration), user});
					break;
				}
				case "untimeout": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown user-";
					IRCClient.instance.sendNotice("timeout_success", localObj.created_by+" has removed temporary ban from "+user);
					TriggerActionHandler.instance.onMessage({ type:"unban", user});
					break;
				}
				case "ban": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown-";
					IRCClient.instance.sendNotice("ban_success", "User "+user+" has been banned by "+localObj.created_by);
					TriggerActionHandler.instance.onMessage({ type:"ban", user});
					break;
				}
				case "unban": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown-";
					IRCClient.instance.sendNotice("ban_success", "User "+user+" has been unbanned by "+localObj.created_by);
					TriggerActionHandler.instance.onMessage({ type:"unban", user});
					break;
				}
				case "mod": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown-";
					IRCClient.instance.sendNotice("ban_success", "User "+user+" has been added to your mods by "+localObj.created_by);
					TriggerActionHandler.instance.onMessage({ type:"mod", user});
					break;
				}
				case "unmod": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown-";
					IRCClient.instance.sendNotice("ban_success", "User "+user+" has been unmod by "+localObj.created_by);
					TriggerActionHandler.instance.onMessage({ type:"unmod", user});
					break;
				}
				case "vip": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown-";
					TriggerActionHandler.instance.onMessage({ type:"vip", user});
					IRCClient.instance.sendNotice("ban_success", "User "+user+" has been added to VIPs by "+localObj.created_by);
					break;
				}
				case "unvip": {
					const user = localObj.args && localObj.args.length > 0? localObj.args[0] : "-unknown-";
					TriggerActionHandler.instance.onMessage({ type:"unvip", user});
					IRCClient.instance.sendNotice("ban_success", "User "+user+" has been unVIP by "+localObj.created_by);
					break;
				}
				case "raid": {
					const infos:PubSubDataTypes.RaidInfos = {
						id: IRCClient.instance.getFakeGuid(),
						creator_id: UserSession.instance.authToken.user_id,
						source_id: UserSession.instance.authToken.user_id,
						target_id: "",
						target_login: localObj.args? localObj.args[0] : "",
						target_display_name: localObj.args? localObj.args[0] : "",
						target_profile_image: "",
						transition_jitter_seconds: 1,
						force_raid_now_seconds: 90,
						viewer_count: 0,
					};
					this.sStream.setRaiding(infos);
					break;
				}
				case "unraid": {
					this.sStream.setRaiding(undefined);
					break;
				}
				case "delete": {
					const messageId = localObj.args? localObj.args[2] : "";
					const deleteData = localObj;
					this.sChat.delChatMessage(messageId, deleteData);
					let messageID = "";
					if(localObj.args && localObj.args.length > 2) messageID = localObj.args[2];
					this.dispatchEvent(new PubSubEvent(PubSubEvent.DELETE_MESSAGE, messageID));
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
	private automodEvent(localObj:PubSubDataTypes.AutomodData):void {
		if(localObj.status == "PENDING") {
			const tags:PubSubDataTypes.IRCTagsExtended = {
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
			this.dispatchEvent(new PubSubEvent(PubSubEvent.DELETE_MESSAGE, localObj.message.id));
			this.sChat.delChatMessage(localObj.message.id);
		}
	}

	/**
	 * Called when a low trust user is detected
	 * 
	 * @param localObj
	 */
	private lowTrustMessage(localObj:PubSubDataTypes.LowTrustMessage):void {
		this.sUsers.flagLowTrustMessage(localObj);
	}

	/**
	 * Called when a user redeems a reward
	 */
	private rewardEvent(localObj:PubSubDataTypes.RewardData):void {
		const tags:PubSubDataTypes.IRCTagsExtended = {
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
	 * Community challenge contribution 
	 */
	private communityChallengeContributionEvent(localObj:PubSubDataTypes.ChannelPointChallengeContribution):void {
		const tags:PubSubDataTypes.IRCTagsExtended = {
			"username":localObj.user.display_name,
			"display-name": localObj.user.display_name,
			"user-id": localObj.user.id,
			"tmi-sent-ts": Date.now().toString(),
			"message-type": "chat",
			"room-id": localObj.channel_id,
		};

		const data:IRCEventDataList.Highlight = {
			contribution: localObj,
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
	private pollEvent(localObj:PubSubDataTypes.PollData):void {
		//convert data to API style format
		const choices:TwitchDataTypes.PollChoice[] = [];
		for (let i = 0; i < localObj.poll.choices.length; i++) {
			const c = localObj.poll.choices[i];
			const votes = c.votes.total;
			// if(c.votes.channel_points) votes += c.votes.channel_points;
			// if(c.votes.bits) votes += c.votes.bits;
			choices.push({
				id: c.choice_id,
				title: c.title,
				votes: votes,
				channel_points_votes: c.votes.channel_points,
				bits_votes: c.votes.bits,
			})
		}
		const poll:TwitchDataTypes.Poll = {
			id: localObj.poll.poll_id,
			broadcaster_id: localObj.poll.owned_by,
			broadcaster_name: UserSession.instance.authToken.login,
			broadcaster_login: UserSession.instance.authToken.login,
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
		this.sPoll.setPolls([poll], true)
	}

	/**
	 * Called when a prediction event occurs (create/update/close)
	 */
	private predictionEvent(localObj:PubSubDataTypes.PredictionData):void {
	
		// convert data to API style format
		const outcomes:TwitchDataTypes.PredictionOutcome[] = [];
		for (let i = 0; i < localObj.event.outcomes.length; i++) {
			const c = localObj.event.outcomes[i];
			const top_predictors:TwitchDataTypes.PredictionPredictor[] = [];
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
		const prediction:TwitchDataTypes.Prediction = {
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
		this.sPrediction.setPredictions([prediction])
	}

	/**
	 * Called when having a new follower
	 */
	private followingEvent(data:PubSubDataTypes.Following, simulationMode:boolean = false):void {
		data.follow_date = Date.now();

		if(this.followCache[data.username] === true) return;
		this.followCache[data.username] = true;

		data.message = reactive({
			channel: IRCClient.instance.channel,
			tags:{
				"username":data.display_name,
				"user-id":data.user_id,
				"tmi-sent-ts": Date.now().toString(),
				"msg-id": "follow",
			},
			username: data.display_name,
			followBlocked:false,
			"type": "highlight",
		} as IRCEventDataList.Highlight);

		if(this.lastRecentFollowers.length > 1) {
			//duration between 2 follow events to consider them as a follow streak
			const minDuration = 500;
			let dateOffset:number = this.lastRecentFollowers[0].follow_date as number;
			for (let i = 1; i < this.lastRecentFollowers.length; i++) {
				const f = this.lastRecentFollowers[i];
				//more than the minDuration has past, reset the streak
				if((f.follow_date as number) - dateOffset > minDuration) {
					this.lastRecentFollowers = [];
					break;
				}
				dateOffset = f.follow_date as number;
			}
		}

		let blockList = [data];
		this.lastRecentFollowers.push( data );
		console.log(this.lastRecentFollowers);

		if(this.lastRecentFollowers.length > 30
		&& this.sEmergency.emergencyStarted !== true
		&& this.sEmergency.params.enabled === true
		&& this.sEmergency.params.autoEnableOnFollowbot === true) {
			console.log("START EMERGENCYYYYY !!!");
			//Set all the past users in the block list to process them
			blockList = this.lastRecentFollowers;
			//Start emergency mode
			this.sEmergency.setEmergencyMode(true);
		}


		//If emergency mode is enabled and we asked to automatically block
		//any new followser during that time, do it
		if(this.sEmergency.emergencyStarted === true) {
			for (let i = 0; i < blockList.length; i++) {
				const event = blockList[i];
				
				const followData:TwitchatDataTypes.EmergencyFollowerData = {
					uid:event.user_id,
					login:event.display_name,
					date:Date.now(),
					blocked:false,
					unblocked:false,
				}
				if(this.sEmergency.params.autoBlockFollows === true){
					(event.message as IRCEventDataList.Highlight).followBlocked = true;
					(async()=> {
						let res = false;
						if(simulationMode===true) {
							res = true;
						}else{
							res = await TwitchUtils.blockUser(event.user_id, "spam");
						}
						followData.blocked = res;
						//Unblock the user right away if requested
						if(this.sEmergency.params.autoUnblockFollows === true) {
							if(simulationMode===true) {
								res = true;
							}else{
								res = await TwitchUtils.unblockUser(event.user_id);
							}
							followData.unblocked = res;
							this.sEmergency.addEmergencyFollower(followData);
						}else{
							this.sEmergency.addEmergencyFollower(followData);
						}
					})();
				}else{
					this.sEmergency.addEmergencyFollower(followData);
				}
			}
		}

		let automoded = false;
		if(this.sAutmod.params.banUserNames === true) {
			let rule = Utils.isAutomoded(data.display_name, {username:data.username});
			if(rule) {
				(data.message as IRCEventDataList.Highlight).ttAutomod = rule;
				automoded = true;
				IRCClient.instance.sendMessage(`/ban ${data.username} banned by Twitchat's automod after following the channel because nickname matched mod rule "${rule.label}"`);
			}
		}

		IRCClient.instance.sendHighlight(data.message as IRCEventDataList.Highlight);

		if(!automoded) {
			//Broadcast to OBS-ws
			const wsMessage = {
				display_name: data.display_name,
				username: data.username,
				user_id: data.user_id,
			}
			PublicAPI.instance.broadcast(TwitchatEvent.FOLLOW, {user:wsMessage});
		}
	}

	/**
	 * Called when a hype train approaches
	 * @param data 
	 */
	private hypeTrainApproaching(data:PubSubDataTypes.HypeTrainApproaching):void {
		const key = Object.keys(data.events_remaining_durations)[0];
		const wasAlreadyApproaching = this.sStream.hypeTrain != undefined;
		const train:TwitchatDataTypes.HypeTrainStateData = {
			level:1,
			currentValue:0,
			goal:data.goal,
			approached_at:this.sStream.hypeTrain?.approached_at ?? Date.now(),
			started_at:Date.now(),
			updated_at:Date.now(),
			timeLeft:data.events_remaining_durations[key],
			state: "APPROACHING",
			is_boost_train:data.is_boost_train,
		};
		this.sStream.setHypeTrain(train);

		//Hide "hypetrain approaching" notification if expired
		this.hypeTrainApproachingTimer = setTimeout(()=> {
			this.sStream.setHypeTrain(undefined);
		}, train.timeLeft * 1000);

		if(!wasAlreadyApproaching) {
			const message:TwitchatDataTypes.HypeTrainTriggerData = {
				type: "hypeTrainApproach",
				level:0,
				percent:0,
			}
			TriggerActionHandler.instance.onMessage(message)
		}
	}

	/**
	 * Called when a hype train starts
	 * @param data 
	 */
	private hypeTrainStart(data:PubSubDataTypes.HypeTrainStart):void {
		clearTimeout(this.hypeTrainApproachingTimer);
		const train:TwitchatDataTypes.HypeTrainStateData = {
			level:data.progress.level.value,
			currentValue:data.progress.value,
			goal:data.progress.goal,
			approached_at:this.sStream.hypeTrain!.approached_at,
			started_at:Date.now(),
			updated_at:Date.now(),
			timeLeft:data.progress.remaining_seconds,
			state: "START",
			is_boost_train:data.is_boost_train,
		};
		
		//This line makes debug easier if I wanna start the train at any
		//point of its timeline
		if(!train.approached_at) train.approached_at = Date.now();
		
		this.sStream.setHypeTrain(train);
		const message:TwitchatDataTypes.HypeTrainTriggerData = {
			type: "hypeTrainStart",
			level:train.level,
			percent:Math.round(train.currentValue/train.goal * 100),
		}
		TriggerActionHandler.instance.onMessage(message)
	}
	
	/**
	 * Called when a hype train is progressing (new sub/bits)
	 * @param data 
	 */
	private hypeTrainProgress(data:PubSubDataTypes.HypeTrainProgress):void {
		clearTimeout(this.hypeTrainApproachingTimer);//Shouldn't be necessary, kind of a failsafe
		clearTimeout(this.hypeTrainProgressTimer);
		//postepone the progress event in case it's followed by a LEVEL UP event to avoid
		//having kind of two similar events
		this.hypeTrainProgressTimer = setTimeout(()=> {
			const storeTrain = this.sStream.hypeTrain!;
			const prevLevel = storeTrain.level;
			const prevValue = storeTrain.currentValue;
			//Makes sure that if a progress event follows the LEVEL UP event, only
			//the LEVEL UP event is handled.
			//ame goal as the setTimeout() above but if the events order is reversed
			if(data.progress.value == prevLevel && data.progress.level.value == prevValue) {
				//Make sure 2 identical progress events are not processed
				return;
			}
			const train:TwitchatDataTypes.HypeTrainStateData = {
				level:data.progress.level.value,
				currentValue:data.progress.value,
				goal:data.progress.goal,
				approached_at:storeTrain.approached_at,
				started_at:storeTrain.started_at,
				updated_at:Date.now(),
				timeLeft:data.progress.remaining_seconds,
				state: "PROGRESSING",
				is_boost_train:data.is_boost_train,
			};
			
			//This line makes debug easier if I wanna start the train at any
			//point of its timeline
			if(!train.approached_at) train.approached_at = Date.now();
			if(!train.started_at) train.started_at = Date.now();
			
			this.sStream.setHypeTrain(train);
			const message:TwitchatDataTypes.HypeTrainTriggerData = {
				type: "hypeTrainProgress",
				level:train.level,
				percent:Math.round(train.currentValue/train.goal * 100),
			}
			TriggerActionHandler.instance.onMessage(message)
		}, 200)
	}
	
	/**
	 * Called when a hype train levels up
	 * @param data 
	 */
	private hypeTrainLevelUp(data:PubSubDataTypes.HypeTrainLevelUp):void {
		clearTimeout(this.hypeTrainApproachingTimer);//Shouldn't be necessary, kind of a failsafe
		clearTimeout(this.hypeTrainProgressTimer);
		const train:TwitchatDataTypes.HypeTrainStateData = {
			level:data.progress.level.value,
			currentValue:data.progress.value,
			goal:data.progress.goal,
			approached_at:this.sStream.hypeTrain!.approached_at,
			started_at:this.sStream.hypeTrain!.started_at,
			updated_at:Date.now(),
			timeLeft:data.progress.remaining_seconds,
			state: "LEVEL_UP",
			is_boost_train:data.is_boost_train,
		};

		//This line makes debug easier if I wanna start the train at any
		//point of its timeline
		if(!train.approached_at) train.approached_at = Date.now();
		if(!train.started_at) train.started_at = Date.now();

		this.sStream.setHypeTrain(train);
		const message:TwitchatDataTypes.HypeTrainTriggerData = {
			type: "hypeTrainProgress",
			level:train.level,
			percent:Math.round(train.currentValue/train.goal * 100),
		}
		TriggerActionHandler.instance.onMessage(message)
	}
	
	/**
	 * Called when a hype train completes or expires
	 * @param data 
	 */
	private hypeTrainEnd(data:PubSubDataTypes.HypeTrainEnd):void {
		const storeData = this.sStream.hypeTrain!;
		const train:TwitchatDataTypes.HypeTrainStateData = {
			level: storeData.level,
			currentValue: storeData.currentValue,
			goal: storeData.goal,
			approached_at: storeData.approached_at,
			started_at: storeData.started_at,
			updated_at: storeData.updated_at,
			timeLeft: storeData.timeLeft,
			state: data.ending_reason,
			is_boost_train: storeData.is_boost_train,
		};
		this.sStream.setHypeTrain(train);
		
		setTimeout(()=> {
			//Hide hype train popin
			this.sStream.setHypeTrain(undefined);
		}, 10000)

		let level = storeData.level;
		if(storeData.currentValue < storeData.goal) level --;
		const message:TwitchatDataTypes.HypeTrainTriggerData = {
			type: "hypeTrainEnd",
			level,
			state:data.ending_reason,
			percent:Math.round(storeData.currentValue/storeData.goal * 100),
		}
		TriggerActionHandler.instance.onMessage(message)
	}
	
	/**
	 * Called when whispers are read
	 */
	private whisperRead(data:PubSubDataTypes.WhisperRead):void {
		data;//
		// StoreProxy.store.dispatch("closeWhispers", data.id.split("_")[1]);
	}
	
	/**
	 * Called when stream info are updated
	 */
	private streamInfoUpdate(data:PubSubDataTypes.StreamInfo):void {
		IRCClient.instance.sendNotice("broadcast_settings_update", "Stream info updated to <mark>\""+data.status+"\"</mark> in category <mark>\""+data.game+"\"</mark>");
		const message:TwitchatDataTypes.StreamInfoUpdate = {
			type: "streamInfoUpdate",
			title:data.status,
			category:data.game,
		}
		TriggerActionHandler.instance.onMessage(message);
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
	export const ChatRichEmbed = {"type":"chat_rich_embed","data":{"message_id":"7210d939-72b7-44a1-b711-4030c12088a4","request_url":"https://clips.twitch.tv/BumblingTriangularWitchMrDestructoid-QqRP6nMJmsWqb8B2","author_name":"Durss","thumbnail_url":"https://clips-media-assets2.twitch.tv/77t1WEKkT-pzCZrFqm_Adg/AT-cm%7C77t1WEKkT-pzCZrFqm_Adg-preview-86x45.jpg","title":"Live chill","twitch_metadata":{"clip_metadata":{"game":"Art","channel_display_name":"EncreMecanique","slug":"BumblingTriangularWitchMrDestructoid-QqRP6nMJmsWqb8B2","id":"3965327491","broadcaster_id":"190145142","curator_id":"29961813"}}}};
	export const RoomStatusUpdate = {"type":"updated_room","data":{"room":{"channel_id":"29961813","modes":{"followers_only_duration_minutes":30,"emote_only_mode_enabled":false,"r9k_mode_enabled":false,"subscribers_only_mode_enabled":false,"verified_only_mode_enabled":true,"slow_mode_duration_seconds":null,"slow_mode_set_at":"0001-01-01T00:00:00Z","account_verification_options":{"subscribers_exempt":true,"moderators_exempt":true,"vips_exempt":true,"phone_verification_mode":0,"email_verification_mode":2,"partial_phone_verification_config":{"restrict_first_time_chatters":true,"restrict_based_on_follower_age":true,"restrict_based_on_account_age":true,"minimum_follower_age_in_minutes":1440,"minimum_account_age_in_minutes":10080},"partial_email_verification_config":{"restrict_first_time_chatters":true,"restrict_based_on_follower_age":true,"restrict_based_on_account_age":true,"minimum_follower_age_in_minutes":1440,"minimum_account_age_in_minutes":10080}}},"rules":["Sois un amour de princesse ❤"]}}};
	export const ChannelPointChallengeContribution = {"type":"community-goal-contribution","data":{"timestamp":"2022-09-18T19:09:02.474511122Z","contribution":{"channel_id":"29961813","goal":{"id":"b34f2f91-89d7-4342-b221-b1cbc4e0d5c6","channel_id":"29961813","title":"My awesome challenge","description":"This is the channel point challenge description","goal_type":"CREATOR","is_in_stock":true,"goal_amount":100000,"points_contributed":10800,"small_contribution":250,"per_stream_maximum_user_contribution":2000,"status":"STARTED","duration_days":30,"started_at":"2022-09-16T17:00:49.967911644Z","ended_at":"2022-10-16T17:00:49.967911644Z","background_color":"#FF38DB","default_image":{"url_1x":"https://static-cdn.jtvnw.net/community-goal-images/default-1.png","url_2x":"https://static-cdn.jtvnw.net/community-goal-images/default-2.png","url_4x":"https://static-cdn.jtvnw.net/community-goal-images/default-4.png"},"image":{"url_1x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-1.png","url_2x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-2.png","url_4x":"https://static-cdn.jtvnw.net/community-goal-images/88616177/b34f2f91-89d7-4342-b221-b1cbc4e0d5c6/5a16c7dd-5060-4b2c-8e22-429a08f7f867/goal-4.png"}},"user":{"id":"29961813","login":"durss","display_name":"durss"},"amount":800,"stream_contribution":800,"total_contribution":800}}};

	export const RealHypeTrainData =[
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.180847952","message":"{\"type\":\"hype-train-approaching\",\"data\":{\"channel_id\":\"402890635\",\"goal\":3,\"events_remaining_durations\":{\"1\":261},\"level_one_rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_3114c3d12dc44f53810140f632128b54\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeSleep\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d457ecda087479f98501f80e23b5a04\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePat\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e7a6e7e24a844e709c4d93c0845422e1\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLUL\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCool\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_036fd741be4141198999b2ca4300668e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLove1\"}],\"creator_color\":\"00DADA\",\"participants\":[\"117971644\",\"661245368\"],\"approaching_hype_train_id\":\"50ced304-5348-4481-b4b2-de74d7203677\",\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:14:45 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":'{"type":"hype-train-approaching","data":{"channel_id":"402890635","goal":3,"events_remaining_durations":{"1":269},"level_one_rewards":[{"type":"EMOTE","id":"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeCool"},{"type":"EMOTE","id":"emotesv2_036fd741be4141198999b2ca4300668e","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLove1"},{"type":"EMOTE","id":"emotesv2_3114c3d12dc44f53810140f632128b54","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeSleep"},{"type":"EMOTE","id":"emotesv2_7d457ecda087479f98501f80e23b5a04","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypePat"},{"type":"EMOTE","id":"emotesv2_e7a6e7e24a844e709c4d93c0845422e1","group_id":"","reward_level":0,"set_id":"1a8f0108-5aee-4125-8067-d39e983e934b","token":"HypeLUL"}],"creator_color":"00AA7F","participants":["38001049","59580201"],"approaching_hype_train_id":"fbafb76e-0447-49ca-b008-c954f374be33","is_boost_train":false}}'}},
		new Date("Wed Aug 17 2022 21:15:25 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-start\",\"data\":{\"channel_id\":\"402890635\",\"id\":\"362ad65c-3a64-46cd-883e-a8041cce41bc\",\"started_at\":1660763732000,\"expires_at\":1660764032000,\"updated_at\":1660763732000,\"ended_at\":null,\"ending_reason\":null,\"config\":{\"channel_id\":\"402890635\",\"is_enabled\":true,\"is_whitelisted\":true,\"kickoff\":{\"num_of_events\":3,\"min_points\":100,\"duration\":300000000000},\"cooldown_duration\":7200000000000,\"level_duration\":300000000000,\"difficulty\":\"EASY\",\"reward_end_date\":null,\"participation_conversion_rates\":{\"BITS.CHEER\":1,\"BITS.EXTENSION\":1,\"BITS.POLL\":1,\"SUBS.TIER_1_GIFTED_SUB\":500,\"SUBS.TIER_1_SUB\":500,\"SUBS.TIER_2_GIFTED_SUB\":1000,\"SUBS.TIER_2_SUB\":1000,\"SUBS.TIER_3_GIFTED_SUB\":2500,\"SUBS.TIER_3_SUB\":2500},\"notification_thresholds\":{\"BITS.CHEER\":1000,\"BITS.EXTENSION\":1000,\"BITS.POLL\":1000,\"SUBS.TIER_1_GIFTED_SUB\":5,\"SUBS.TIER_1_SUB\":5,\"SUBS.TIER_2_GIFTED_SUB\":5,\"SUBS.TIER_2_SUB\":5,\"SUBS.TIER_3_GIFTED_SUB\":5,\"SUBS.TIER_3_SUB\":5},\"difficulty_settings\":{\"EASY\":[{\"value\":1,\"goal\":1600,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_e7a6e7e24a844e709c4d93c0845422e1\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLUL\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCool\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_036fd741be4141198999b2ca4300668e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLove1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_3114c3d12dc44f53810140f632128b54\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeSleep\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d457ecda087479f98501f80e23b5a04\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePat\"}],\"impressions\":300},{\"value\":2,\"goal\":3400,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_0457808073314f62962554c12ebb6b4d\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHands1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c40cd16027f48c0a70ac7b1fa1c397e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHands2\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_0330a84e75ad48c1821c1d29a7dadd4d\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeFail\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_9b68a8fa2f1d457496ac016b251e06b6\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHai\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_9bcc622c0b2a48b180a159c25a2b8245\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeNom\"}],\"impressions\":600},{\"value\":3,\"goal\":5500,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_08abf0cd0e78494a9da8a2315c3648f4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeBLEH\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_ccc146905a694f3b8df390f55e34002a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeApplause\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_4918bd32ff5b476f82bda49f3e958767\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeRage\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d01d1cf36b549098434c7a6e50a8828\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeMwah\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_43da115e6b6749828f7dee47d17dd315\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeHuh\"}],\"impressions\":900},{\"value\":4,\"goal\":7800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_663dbd72c3ae48c585ffd61f3c348fa9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeWave\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_271ea48a09ca418baad2ea1f734ab09e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeReading\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1337536bcecf49f4bb9cd1a699341ee2\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeShock\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_8c1d964bd7e14fe1b8bd61d29ee0eb8c\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeStress\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_cdc7a602ee08462e81fb6cc0e3e8de61\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCry\"}],\"impressions\":1200},{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500}]},\"conductor_rewards\":{\"BITS\":{\"CURRENT\":[{\"type\":\"BADGE\",\"id\":\"1\",\"group_id\":\"hype-train\",\"reward_level\":0,\"badge_id\":\"aHlwZS10cmFpbjsxOzQwMjg5MDYzNQ==\",\"image_url\":\"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2\"}],\"FORMER\":[{\"type\":\"BADGE\",\"id\":\"2\",\"group_id\":\"hype-train\",\"reward_level\":0,\"badge_id\":\"aHlwZS10cmFpbjsyOzQwMjg5MDYzNQ==\",\"image_url\":\"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2\"}]},\"SUBS\":{\"CURRENT\":[{\"type\":\"BADGE\",\"id\":\"1\",\"group_id\":\"hype-train\",\"reward_level\":0,\"badge_id\":\"aHlwZS10cmFpbjsxOzQwMjg5MDYzNQ==\",\"image_url\":\"https://static-cdn.jtvnw.net/badges/v1/fae4086c-3190-44d4-83c8-8ef0cbe1a515/2\"}],\"FORMER\":[{\"type\":\"BADGE\",\"id\":\"2\",\"group_id\":\"hype-train\",\"reward_level\":0,\"badge_id\":\"aHlwZS10cmFpbjsyOzQwMjg5MDYzNQ==\",\"image_url\":\"https://static-cdn.jtvnw.net/badges/v1/9c8d038a-3a29-45ea-96d4-5031fb1a7a81/2\"}]}},\"callout_emote_id\":\"304892672\",\"callout_emote_token\":\"peleriShy\",\"use_creator_color\":true,\"primary_hex_color\":\"46217E\",\"use_personalized_settings\":false,\"has_conductor_badges\":true,\"boost_train_config\":{\"twitch_impressions\":{\"EASY\":500,\"HARD\":500,\"INSANE\":500,\"MEDIUM\":500,\"SUPER HARD\":500}}},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":1,\"SUBS.TIER_1_SUB\":2},\"conductors\":{},\"progress\":{\"level\":{\"value\":1,\"goal\":1600,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_e7a6e7e24a844e709c4d93c0845422e1\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLUL\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCool\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_036fd741be4141198999b2ca4300668e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLove1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_3114c3d12dc44f53810140f632128b54\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeSleep\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d457ecda087479f98501f80e23b5a04\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePat\"}],\"impressions\":300},\"value\":1500,\"goal\":1600,\"total\":1500,\"remaining_seconds\":299},\"is_boost_train\":false,\"all_time_high_progress\":{\"level\":{\"value\":1,\"goal\":1600,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_e7a6e7e24a844e709c4d93c0845422e1\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLUL\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_e2a11d74a4824cbf9a8b28079e5e67dd\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCool\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_036fd741be4141198999b2ca4300668e\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLove1\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_3114c3d12dc44f53810140f632128b54\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeSleep\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7d457ecda087479f98501f80e23b5a04\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePat\"}],\"impressions\":300},\"value\":0,\"goal\":1600,\"total\":0,\"remaining_seconds\":299}}}"}},
		new Date("Wed Aug 17 2022 21:15:33 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"534165905\",\"login\":\"besso___\",\"display_name\":\"Besso___\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/f61ad8bb-293d-465a-a7f4-5757cf1b4b2e-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":1}}}"}},
		new Date("Wed Aug 17 2022 21:15:33 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"534165905\",\"login\":\"besso___\",\"display_name\":\"Besso___\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/f61ad8bb-293d-465a-a7f4-5757cf1b4b2e-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":1}}}"}},
		new Date("Wed Aug 17 2022 21:15:33 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"534165905\",\"login\":\"besso___\",\"display_name\":\"Besso___\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/f61ad8bb-293d-465a-a7f4-5757cf1b4b2e-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":1}}}"}},
		new Date("Wed Aug 17 2022 21:15:33 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"community-points-user-v1.29961813","message":"{\"type\":\"points-earned\",\"data\":{\"timestamp\":\"2022-08-17T19:15:38.055558707Z\",\"channel_id\":\"44345043\",\"point_gain\":{\"user_id\":\"29961813\",\"channel_id\":\"44345043\",\"total_points\":10,\"baseline_points\":10,\"reason_code\":\"WATCH\",\"multipliers\":[]},\"balance\":{\"user_id\":\"29961813\",\"channel_id\":\"44345043\",\"balance\":162559}}}"}},
		new Date("Wed Aug 17 2022 21:15:38 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660763760.148000,\"viewers\":127}"}},
		new Date("Wed Aug 17 2022 21:16:00 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660763789.884083,\"viewers\":129}"}},
		new Date("Wed Aug 17 2022 21:16:30 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"community-points-user-v1.29961813","message":"{\"type\":\"points-earned\",\"data\":{\"timestamp\":\"2022-08-17T19:16:46.751085263Z\",\"channel_id\":\"589180903\",\"point_gain\":{\"user_id\":\"29961813\",\"channel_id\":\"589180903\",\"total_points\":12,\"baseline_points\":10,\"reason_code\":\"WATCH\",\"multipliers\":[{\"reason_code\":\"SUB_T1\",\"factor\":0.2}]},\"balance\":{\"user_id\":\"29961813\",\"channel_id\":\"589180903\",\"balance\":1954}}}"}},
		new Date("Wed Aug 17 2022 21:16:47 GMT+0200"),
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
		{"type":"MESSAGE","data":{"topic":"community-points-user-v1.29961813","message":"{\"type\":\"active-multipliers-updated\",\"data\":{\"timestamp\":\"2022-08-17T19:16:57.70052134Z\",\"active_multipliers\":{\"user_id\":\"29961813\",\"channel_id\":\"402890635\",\"multipliers\":[{\"reason_code\":\"SUB_T1\",\"factor\":0.2}]}}}"}},
		new Date("Wed Aug 17 2022 21:16:57 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660763819.884909,\"viewers\":131}"}},
		new Date("Wed Aug 17 2022 21:17:00 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"user-subscribe-events-v1.29961813","message":"{\"user_id\":\"29961813\",\"channel_id\":\"402890635\"}"}},
		new Date("Wed Aug 17 2022 21:17:02 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660763850.069607,\"viewers\":134}"}},
		new Date("Wed Aug 17 2022 21:17:30 GMT+0200"),
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
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660763880.049570,\"viewers\":134}"}},
		new Date("Wed Aug 17 2022 21:18:00 GMT+0200"),
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
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660763910.318152,\"viewers\":142}"}},
		new Date("Wed Aug 17 2022 21:18:30 GMT+0200"),
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
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660763940.345852,\"viewers\":144}"}},
		new Date("Wed Aug 17 2022 21:19:00 GMT+0200"),
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
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660763970.354575,\"viewers\":142}"}},
		new Date("Wed Aug 17 2022 21:19:30 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660764000.358501,\"viewers\":138}"}},
		new Date("Wed Aug 17 2022 21:20:00 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660764030.445111,\"viewers\":151}"}},
		new Date("Wed Aug 17 2022 21:20:30 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"community-points-user-v1.29961813","message":"{\"type\":\"points-earned\",\"data\":{\"timestamp\":\"2022-08-17T19:20:39.848018275Z\",\"channel_id\":\"44345043\",\"point_gain\":{\"user_id\":\"29961813\",\"channel_id\":\"44345043\",\"total_points\":10,\"baseline_points\":10,\"reason_code\":\"WATCH\",\"multipliers\":[]},\"balance\":{\"user_id\":\"29961813\",\"channel_id\":\"44345043\",\"balance\":162569}}}"}},
		new Date("Wed Aug 17 2022 21:20:40 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660764060.394171,\"viewers\":174}"}},
		new Date("Wed Aug 17 2022 21:21:00 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660764089.930541,\"viewers\":202}"}},
		new Date("Wed Aug 17 2022 21:21:30 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"community-points-user-v1.29961813","message":"{\"type\":\"points-earned\",\"data\":{\"timestamp\":\"2022-08-17T19:21:45.534271536Z\",\"channel_id\":\"589180903\",\"point_gain\":{\"user_id\":\"29961813\",\"channel_id\":\"589180903\",\"total_points\":12,\"baseline_points\":10,\"reason_code\":\"WATCH\",\"multipliers\":[{\"reason_code\":\"SUB_T1\",\"factor\":0.2}]},\"balance\":{\"user_id\":\"29961813\",\"channel_id\":\"589180903\",\"balance\":1966}}}"}},
		new Date("Wed Aug 17 2022 21:21:45 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660764119.974692,\"viewers\":219}"}},
		new Date("Wed Aug 17 2022 21:22:00 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660764150.213241,\"viewers\":230}"}},
		new Date("Wed Aug 17 2022 21:22:30 GMT+0200"),
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
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660764180.207342,\"viewers\":2657}"}},
		new Date("Wed Aug 17 2022 21:23:00 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"last-x-experiment-event\",\"data\":{\"channel_id\":\"402890635\",\"event_id\":\"amzn1.twitch.payments.sub.158b5395-4c61-4c1e-bb71-afd36addfae7\",\"user_id\":\"187412887\",\"user_login\":\"dindonluisant\",\"user_display_name\":\"dindonluisant\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/2058ed5b-dddd-42ff-b61c-eb80b929bb22-profile_image-50x50.png\",\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1}}"}},
		new Date("Wed Aug 17 2022 21:23:04 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-progression\",\"data\":{\"user_id\":\"187412887\",\"user_login\":\"dindonluisant\",\"user_display_name\":\"dindonluisant\",\"user_profile_image_url\":\"https://static-cdn.jtvnw.net/jtv_user_pictures/2058ed5b-dddd-42ff-b61c-eb80b929bb22-profile_image-50x50.png\",\"sequence_id\":19500,\"action\":\"TIER_1_SUB\",\"source\":\"SUBS\",\"quantity\":1,\"progress\":{\"level\":{\"value\":5,\"goal\":10800,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1630ff0e5ff34a808f4b25320a540ee7\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeLurk\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_7b8e74be7bd64601a2608c2ff5f6eb7a\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypePopcorn\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_1885b5088372466b800789b02daf7b65\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeEvil\"},{\"type\":\"EMOTE\",\"id\":\"emotesv2_85a13cc47247425fa152b9292c4589a9\",\"group_id\":\"\",\"reward_level\":0,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeAwww\"}],\"impressions\":1500},\"value\":11700,\"goal\":3000,\"total\":19500,\"remaining_seconds\":45},\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:23:04 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-conductor-update\",\"data\":{\"source\":\"SUBS\",\"user\":{\"id\":\"681324004\",\"login\":\"blood_swords\",\"display_name\":\"blood_swords\",\"profile_image_url\":\"https://static-cdn.jtvnw.net/user-default-pictures-uv/ead5c8b2-a4c9-4724-b1dd-9f00b46cbd3d-profile_image-50x50.png\"},\"participations\":{\"SUBS.TIER_1_GIFTED_SUB\":15}}}"}},
		new Date("Wed Aug 17 2022 21:23:04 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"video-playback-by-id.402890635","message":"{\"type\":\"viewcount\",\"server_time\":1660764209.985546,\"viewers\":2610}"}},
		new Date("Wed Aug 17 2022 21:23:30 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.402890635","message":"{\"type\":\"hype-train-end\",\"data\":{\"ended_at\":1660764230000,\"ending_reason\":\"COMPLETED\",\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:23:50 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"user-subscribe-events-v1.29961813","message":"{\"user_id\":\"29961813\",\"channel_id\":\"0\"}"}},
		new Date("Wed Aug 17 2022 21:23:53 GMT+0200"),
		{"type":"MESSAGE","data":{"topic":"hype-train-events-v1.rewards.29961813","message":"{\"type\":\"hype-train-rewards\",\"data\":{\"channel_id\":\"402890635\",\"completed_level\":5,\"rewards\":[{\"type\":\"EMOTE\",\"id\":\"emotesv2_dd4f4f9cea1a4039ad3390e20900abe4\",\"group_id\":\"\",\"reward_level\":5,\"set_id\":\"1a8f0108-5aee-4125-8067-d39e983e934b\",\"token\":\"HypeCheer\"}],\"is_boost_train\":false}}"}},
		new Date("Wed Aug 17 2022 21:23:53 GMT+0200"),
	];
}
