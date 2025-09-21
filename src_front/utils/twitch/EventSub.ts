import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { TwitchEventSubDataTypes } from "@/types/twitch/TwitchEventSubDataTypes";
import { LoremIpsum } from "lorem-ipsum";
import Config from "../Config";
import Logger from "../Logger";
import Utils from "../Utils";
import { TwitchChannelModerateV2Scopes, TwitchScopes } from "./TwitchScopes";
import TwitchUtils from "./TwitchUtils";
import ApiHelper from "../ApiHelper";
import MessengerProxy from "@/messaging/MessengerProxy";

/**
* Created : 02/12/2022
*/
export default class EventSub {

	private static _instance:EventSub;
	private socket!:WebSocket;
	private oldSocket!:WebSocket;
	private reconnectTimeout!:number;
	private keepalive_timeout_seconds!:number;
	private lastRecentFollowers:TwitchatDataTypes.MessageFollowingData[] = [];
	private debounceAutomodTermsUpdate:number = -1;
	private debouncedAutomodTerms:TwitchEventSubDataTypes.AutomodTermsUpdateEvent[] = [];
	private debouncedCombos:{[uid:string]:{bits:number, to:number}} = {};
	private sessionID:string = "";
	private connectURL:string = "";
	private chanSubscriptions:{[chanId:string]:{topic:string, uid:string, id:string}[]} = {};
	private lastChannelUpdateInfos = {title:"", category:"", tags:[""], viewers:0, live:false};

	constructor() {
		this.connectURL = Config.instance.TWITCH_EVENTSUB_PATH;
		window.addEventListener("beforeunload", ()=>{
			if(this.socket) this.cleanupSocket(this.socket);
		})
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
	/**
	 * Connect to Eventsub
	 */
	public async connect(disconnectPrevious:boolean = true):Promise<void> {

		clearTimeout(this.reconnectTimeout);

		if(disconnectPrevious && this.socket) {
			this.cleanupSocket(this.socket);
		}

		//Delete all previous event sub subscriptions
		/*
		try {
			const subscriptions = await TwitchUtils.eventsubGetSubscriptions();
			await Utils.promisedTimeout(5000);
			for (let i = 0; i < subscriptions.length; i++) {
				const v = subscriptions[i];
				//Delete by batch of 10
				if(i%10 === 9) {
					await TwitchUtils.eventsubDeleteSubscriptions(v.id);
				}else{
					TwitchUtils.eventsubDeleteSubscriptions(v.id);
				}
			}
		}catch(error) {
			//It's not a big deal if this crashes, it's safe to ignore
		}
		//*/

		this.socket = new WebSocket(this.connectURL);

		this.socket.onopen = async () => { };

		this.socket.onmessage = (event:unknown) => {
			const e = event as {data:string};
			const message = JSON.parse(e.data) as TwitchEventSubDataTypes.EventSubMessage;
			switch(message.metadata.message_type) {
				case "session_welcome": {
					let payload = message.payload as TwitchEventSubDataTypes.WelcomePayload;
					this.keepalive_timeout_seconds = payload.session.keepalive_timeout_seconds;
					if(this.oldSocket) {
						this.cleanupSocket(this.oldSocket);
					}
					if(disconnectPrevious) {
						this.sessionID = payload.session.id;
						console.log("EVENTSUB : Create subscriptions");
						this.connectToChannel( StoreProxy.auth.twitch.user );
					}
				}

				case "session_keepalive": {
					this.scheduleReconnect();
					break;
				}

				case "session_reconnect": {
					let payload = message.payload as TwitchEventSubDataTypes.ReconnectPayload;
					this.reconnect(payload.session.reconnect_url);
					break;
				}

				case "notification": {
					this.scheduleReconnect();
					this.parseEvent(message.metadata.subscription_type, message.payload as TwitchEventSubDataTypes.Payload);
					break;
				}

				case "revocation": {
					this.scheduleReconnect();
					//Remove subscriptions that got revoked
					let payload = message.payload as TwitchEventSubDataTypes.RevocationPayload;
					const subscriptions = this.chanSubscriptions[payload.subscription.condition.broadcaster_user_id];
					if(!subscriptions) break;
					for (let i = 0; i < subscriptions.length; i++) {
						const sub = subscriptions[i];
						if(sub.topic == payload.subscription.type) {
							subscriptions.splice(i, 1);
							i--;
						}
					}
					break;
				}

				default: {
					console.warn(`Unknown eventsub message type: ${message.metadata.message_type}`);
				}
			}
		};

		this.socket.onclose = (event) => {
			console.log("EVENTSUB : OnClose");
			//Twitch asked us to reconnect socket at a new URL, which we did
			//but disconnection of the old socket (current one) wasn't done.
			if(event.code == 4004) return;

			//Connection was created but we subscribed to no topic, twitch
			//closed the connection
			if(event.code == 4003) return;

			this.connectURL = Config.instance.TWITCH_EVENTSUB_PATH;

			// console.log("EVENTSUB : Closed");
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
	 * Simulates a followbot raids.
	 * Sends lots of fake follow events in a short amount of time
	 */
	public async simulateFollowbotRaid():Promise<void> {
		const lorem = new LoremIpsum({ wordsPerSentence: { max: 40, min: 40 } });
		const me = StoreProxy.auth.twitch.user;
		for (let i = 0; i < 200; i++) {
			const id = i;//Math.round(Math.random()*1000000);
			const login = lorem.generateWords(Math.round(Math.random()*2)+1).split(" ").join("_");
			this.followEvent(TwitchEventSubDataTypes.SubscriptionTypes.FOLLOW, {
				user_id: id.toString(),
				user_login: login,
				user_name: login,
				broadcaster_user_id: me.id,
				broadcaster_user_login: me.login,
				broadcaster_user_name: me.displayName,
				followed_at: new Date().toString(),
			} as TwitchEventSubDataTypes.FollowEvent);
			if(Math.random() > .5) {
				await Utils.promisedTimeout(Math.random()*40);
			}
		}
	}

	/**
	 * Simulates a hype train
	 */
	public async simulateHypeTrain(type: TwitchEventSubDataTypes.HypeTrainStartEvent["type"]):Promise<void> {
		const me = StoreProxy.auth.twitch.user;
		const typeToData: {[key in TwitchEventSubDataTypes.HypeTrainStartEvent["type"]]:(string|HypeTrainEvent)[]} = {
			golden_kappa: train_goldenKappa,
			regular: train_shared,
			treasure: train_treasure,
		};
		const train = JSON.parse(JSON.stringify(typeToData[type]).replace(/MY_UID/gi, me.id).replace(/MY_LOGIN/gi, me.login).replace(/MY_NAME/gi, me.displayName));
		const timeScale = 1;
		const globalOffset = Date.now() - new Date(train[0] as string).getTime();
		let dateOffset = new Date(train[0] as string).getTime();
		for (let i = 1; i < train.length; i++) {
			const entry = JSON.parse(JSON.stringify(train[i]));
			if(typeof entry == "string") {
				const ts = new Date(entry).getTime();
				const wait = (ts - dateOffset) * timeScale;
				await Utils.promisedTimeout(wait);
				dateOffset = ts;
			}else {
				entry.data.started_at = new Date(new Date(entry.data.started_at).getTime() + globalOffset).toISOString();
				if(entry.topic == "channel.hype_train.end") {
					const typedData = entry.data as TwitchEventSubDataTypes.HypeTrainEndEvent;
					typedData.ended_at = new Date(new Date(typedData.ended_at).getTime() + globalOffset).toISOString();
				}else{
					const typedData = entry.data as TwitchEventSubDataTypes.HypeTrainProgressEvent;
					typedData.expires_at = new Date(new Date(typedData.expires_at).getTime() + globalOffset).toISOString();
				}
				this.hypeTrainEvent(entry.topic, entry.data);
			}
		}
	}

	public simulateComboSpam():void {
		const me = StoreProxy.auth.twitch.user;
		const obj:TwitchEventSubDataTypes.BitsUseEvent = {
			"broadcaster_user_id":me.id,
			"broadcaster_user_login":me.login,
			"broadcaster_user_name":me.displayNameOriginal,
			"user_id":me.id,
			"user_login":me.login,
			"user_name":me.displayNameOriginal,
			"bits":Utils.pickRand([5, 10, 25, 50, 100]),
			"type":"combo",
			"power_up":null,
			"message":null
		};
		for (let i = 0; i < 10; i++) {
			this.bitsUsed(TwitchEventSubDataTypes.SubscriptionTypes.BITS_USE, obj);
		}
	}

	/**
	 * Connect to a channel chan.
	 * Will connect to appropriate topics depending on wether we're a mod
	 * on the given channel or not (make sure user.channelInfo[uid] is properly populated)
	 * @param user
	 */
	public async connectToChannel(user:TwitchatDataTypes.TwitchatUser):Promise<void> {
		const me	= StoreProxy.auth.twitch.user;
		const channelId	= user.id;
		const myUID	= me.id;
		const isBroadcaster	= me.id == user.id;
		const isMod	= me.channelInfo[channelId]?.is_moderator === true || isBroadcaster;
		this.chanSubscriptions[channelId] = [];

		if(isBroadcaster){
			this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHANNEL_UPDATE, "2");

			this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.RAID, "1", {from_broadcaster_user_id:channelId});

			//Used by online/offline triggers
			this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.STREAM_ON, "1");
			this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.STREAM_OFF, "1");

			if(TwitchUtils.hasScopes([TwitchScopes.CHARITY_READ])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHARITY_DONATE, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHARITY_PROGRESS, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHARITY_START, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHARITY_STOP, "1");
			}

			if(TwitchUtils.hasScopes([TwitchScopes.ADS_READ])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.AD_BREAK_BEGIN, "1");
			}

			if(TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.AUTOMATIC_REWARD_REDEEM, "2");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_REDEEM, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_REDEEM_UPDATE, "1");
			}
			if(TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_START, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_PROGRESS, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_LOCK, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_END, "1");
			}

			//*
			if(TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.POLL_START, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.POLL_PROGRESS, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.POLL_END, "1");
			}
			if(TwitchUtils.hasScopes([TwitchScopes.READ_HYPE_TRAIN])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_START, "2");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_PROGRESS, "2");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_END, "2");
			}
			//*/

			//Not using those as IRC does it better
			// if(TwitchUtils.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) {
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SUB, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SUBGIFT, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.RESUB, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SUB_END, "1");
			// }

			//Not using this as IRC does it better
			// if(TwitchUtils.hasScopes([TwitchScopes.READ_CHEER])) {
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.BITS, "1");
			// }
			if(TwitchUtils.hasScopes([TwitchScopes.READ_CHEER])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.BITS_USE, "1");
			}

			//Don't need it
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_CREATE, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_UPDATE, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_DELETE, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.GOAL_START, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.GOAL_PROGRESS, "1");
				// this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.GOAL_END, "1");
		}

		if(isMod) {

			if(TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.FOLLOW, "2");
			}

			if(TwitchUtils.hasScopes(TwitchChannelModerateV2Scopes)) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHANNEL_MODERATE, "2");
			}else{
				//This topic does not support moderator token
				if(isBroadcaster && TwitchUtils.hasScopes([TwitchScopes.MODERATION_EVENTS])) {
					this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.UNBAN, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.UNBAN_REQUESTS])) {
					this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.UNBAN_REQUEST_NEW, "1");
					this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.UNBAN_REQUEST_RESOLVED, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.CHAT_WARNING])) {
					this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHAT_WARN_SENT, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.CHAT_READ_EVENTSUB])) {
					this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.DELETE_MESSAGE, "1", {user_id:myUID});
				}
			}

			if(isBroadcaster && TwitchUtils.hasScopes([TwitchScopes.MODERATION_EVENTS])) {
				//Using channel.ban event even if subscribing to channel.moderate V2.
				//The later does not allow to compute an accurate timeout duration.
				//This topic gives more accurate data in this case
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.BAN, "1");
			}
			if(TwitchUtils.hasScopes([TwitchScopes.CHAT_WARNING])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHAT_WARN_ACKNOWLEDGE, "1");
			}

			if(TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SHIELD_MODE_STOP, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SHIELD_MODE_START, "1");
			}

			if(TwitchUtils.hasScopes([TwitchScopes.SHOUTOUT])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SHOUTOUT_IN, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SHOUTOUT_OUT, "1");
			}

			if(TwitchUtils.hasScopes([TwitchScopes.AUTOMOD])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.AUTOMOD_TERMS_UPDATE, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.AUTOMOD_MESSAGE_UPDATE, "2");

				// if(!isBroadcaster) {
					//Only subbing to this as a moderator.
					//Broadcaster uses PubSub alternative that, to date, gives more details.
					//Eventsub doesn't tell which part of the message triggered the automod.
					this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.AUTOMOD_MESSAGE_HELD, "2");
				// }
			}

			if(TwitchUtils.hasScopes([TwitchScopes.SUSPICIOUS_USERS])) {
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SUSPICIOUS_USER_MESSAGE, "1");
				this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.SUSPICIOUS_USER_UPDATE, "1");
			}
		}

		if(TwitchUtils.hasScopes([TwitchScopes.CHAT_READ_EVENTSUB])) {
			this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHAT_MESSAGES, "1", {user_id:myUID});
			this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.CHAT_CLEAR, "1", {user_id:myUID});
		}

		if(TwitchUtils.hasScopes([TwitchScopes.WHISPER_MANAGE])) {
			// this.createSubscription("", "", TwitchEventSubDataTypes.SubscriptionTypes.WHISPERS, "1", {user_id:myUID});
		}

		this.createSubscription(channelId, myUID, TwitchEventSubDataTypes.SubscriptionTypes.RAID, "1", {to_broadcaster_user_id:channelId});
	}

	/**
	 * Disconnect from remote chan.
	 * Deletes all eventsub subscriptions related to given chan
	 * @param channel
	 */
	public async disconnectRemoteChan(channel:TwitchatDataTypes.TwitchatUser):Promise<void> {
		if(!this.chanSubscriptions[channel.id]) return;
		this.chanSubscriptions[channel.id].forEach(entry => {
			TwitchUtils.eventsubDeleteSubscriptions(entry.id);
		})
		delete this.chanSubscriptions[channel.id];
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	/**
	 * Reconnects the socket without recreating all subscriptions
	 * when twitch sends a "session_reconnect" frame
	 * @param url
	 */
	private reconnect(url:string):void {
		this.oldSocket = this.socket;
		this.connectURL = url;
		this.connect(false);
	}

	/**
	 * Cleanups a socket connection
	 *
	 * @param socket
	 */
	private cleanupSocket(socket:WebSocket):void {
		socket.onmessage = null;
		socket.onerror = null;
		socket.onclose = null;
		socket.onopen = null;
		socket.close();
	}

	/**
	 * Schedules a reconnect after requested duration of inactivity
	 */
	private scheduleReconnect():void {
		clearTimeout(this.reconnectTimeout);
		this.reconnectTimeout = window.setTimeout(()=>{
			console.log("EVENTSUB : Session keep alive not received within the expected timeframe");
			this.connect();
		}, (this.keepalive_timeout_seconds + 5) * 1000);
	}

	/**
	 * Subscribe to given topic on given channel for given user ID
	 */
	private async createSubscription(channelId:string, uid:string, topic:TwitchEventSubDataTypes.SubscriptionStringTypes, version:"beta"|"1"|"2"|"3", condition?:{[key:string]:any}):Promise<void> {
		if(this.chanSubscriptions[channelId]
		&& this.chanSubscriptions[channelId].findIndex(v => v.topic === topic && v.uid === uid) > -1) {
			//Already subscribed to this topic, stop there
			return;
		}
		TwitchUtils.eventsubSubscribe(channelId, uid, this.sessionID, topic, version, condition)
		.then(res => {
			if(res !== false) {
				this.chanSubscriptions[channelId].push({id:res, uid, topic});
			}
		});
	}

	/**
	 * Parse an event received from eventsub
	 */
	private parseEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, payload:TwitchEventSubDataTypes.Payload):void {

		switch(topic) {
			case TwitchEventSubDataTypes.SubscriptionTypes.CHANNEL_UPDATE: {
				this.updateStreamInfosEvent(topic, payload.event as TwitchEventSubDataTypes.ChannelUpdateEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.FOLLOW: {
				this.followEvent(topic, payload.event as TwitchEventSubDataTypes.FollowEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.SUB:
			case TwitchEventSubDataTypes.SubscriptionTypes.RESUB:
			case TwitchEventSubDataTypes.SubscriptionTypes.SUBGIFT: {
				this.subscriptionEvent(topic, payload.event as TwitchEventSubDataTypes.SubEvent | TwitchEventSubDataTypes.SubRenewEvent | TwitchEventSubDataTypes.SubgiftEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.BITS: {
				this.bitsEvent(topic, payload.event as TwitchEventSubDataTypes.BitsEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.RAID: {
				this.raidEvent(topic, payload.event as TwitchEventSubDataTypes.RaidEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.BAN: {
				this.banEvent(topic, payload.event as TwitchEventSubDataTypes.BanEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.UNBAN: {
				this.unbanEvent(topic, payload.event as TwitchEventSubDataTypes.UnbanEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.MODERATOR_ADD: {
				this.modAddEvent(topic, payload.event as TwitchEventSubDataTypes.ModeratorAddEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.MODERATOR_REMOVE: {
				this.modRemoveEvent(topic, payload.event as TwitchEventSubDataTypes.ModeratorRemoveEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.REWARD_REDEEM: {
				this.rewardRedeem(topic, payload.event as TwitchEventSubDataTypes.RewardRedeemEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.AUTOMATIC_REWARD_REDEEM: {
				this.automaticRewardRedeem(topic, payload.event as TwitchEventSubDataTypes.AutomaticRewardRedeemEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.AUTOMOD_TERMS_UPDATE: {
				this.automodTermsUpdate(topic, payload.event as TwitchEventSubDataTypes.AutomodTermsUpdateEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.AUTOMOD_MESSAGE_HELD: {
				this.automodMessageHeld(topic, payload.event as TwitchEventSubDataTypes.AutomodMessageHeldEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.AUTOMOD_MESSAGE_UPDATE: {
				this.automodMessageUpdate(topic, payload.event as TwitchEventSubDataTypes.AutomodMessageUpdateEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.SUSPICIOUS_USER_MESSAGE: {
				this.suspiciousUserMessage(topic, payload.event as TwitchEventSubDataTypes.SuspiciousUserMessage);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.SUSPICIOUS_USER_UPDATE: {
				this.suspiciousUserStateUpdate(topic, payload.event as TwitchEventSubDataTypes.SuspiciousUserStateUpdate);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.WHISPERS: {
				this.whisperMessage(topic, payload.event as TwitchEventSubDataTypes.WhisperEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.STREAM_ON:
			case TwitchEventSubDataTypes.SubscriptionTypes.STREAM_OFF: {
				this.streamStartStopEvent(topic, payload.event as TwitchEventSubDataTypes.StreamOnlineEvent | TwitchEventSubDataTypes.StreamOfflineEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.SHIELD_MODE_STOP:
			case TwitchEventSubDataTypes.SubscriptionTypes.SHIELD_MODE_START: {
				this.shieldModeEvent(topic, payload.event as TwitchEventSubDataTypes.ShieldModeStartEvent | TwitchEventSubDataTypes.ShieldModeStopEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.SHOUTOUT_IN:
			case TwitchEventSubDataTypes.SubscriptionTypes.SHOUTOUT_OUT: {
				this.shoutoutEvent(topic, payload.event as TwitchEventSubDataTypes.ShoutoutInEvent | TwitchEventSubDataTypes.ShoutoutOutEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.AD_BREAK_BEGIN: {
				this.adBreakEvent(topic, payload.event as TwitchEventSubDataTypes.AdBreakEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.UNBAN_REQUEST_NEW:
			case TwitchEventSubDataTypes.SubscriptionTypes.UNBAN_REQUEST_RESOLVED: {
				this.unbanRequestEvent(topic, payload.event as TwitchEventSubDataTypes.UnbanRequestEvent | TwitchEventSubDataTypes.UnbanRequestResolveEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHANNEL_MODERATE: {
				this.moderationEvent(topic, payload.event as TwitchEventSubDataTypes.ModerationEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHAT_WARN_ACKNOWLEDGE: {
				this.warningAcknowledgeEvent(topic, payload.event as TwitchEventSubDataTypes.WarningAcknowledgeEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHAT_WARN_SENT: {
				this.warningSendEvent(topic, payload.event as TwitchEventSubDataTypes.WarningSentEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_START:
			case TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_PROGRESS:
			case TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_END:
			case TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_LOCK: {
				this.predictionEvent(topic, payload.event as TwitchEventSubDataTypes.PredictionStartEvent | TwitchEventSubDataTypes.PredictionProgressEvent | TwitchEventSubDataTypes.PredictionEndEvent | TwitchEventSubDataTypes.PredictionLockEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.POLL_END:
			case TwitchEventSubDataTypes.SubscriptionTypes.POLL_START:
			case TwitchEventSubDataTypes.SubscriptionTypes.POLL_PROGRESS: {
				this.pollEvent(topic, payload.event as TwitchEventSubDataTypes.PollStartEvent | TwitchEventSubDataTypes.PollProgressEvent | TwitchEventSubDataTypes.PollEndEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHAT_MESSAGES: {
				this.chatMessageEvent(topic, payload.event as TwitchEventSubDataTypes.ChatMessageEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHARITY_START: {
				const charity = payload.event as TwitchEventSubDataTypes.CharityStartEvent;
				StoreProxy.twitchCharity.onCharityStart(charity);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHARITY_PROGRESS: {
				ApiHelper.call("log", "POST", {cat:"eventsub", log:{topic, tt_v:import.meta.env.PACKAGE_VERSION, data:payload.event}});
				const charity = payload.event as TwitchEventSubDataTypes.CharityProgressEvent;
				StoreProxy.twitchCharity.onCharityProgress(charity.id, charity.current_amount, charity.target_amount);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHARITY_DONATE: {
				ApiHelper.call("log", "POST", {cat:"eventsub", log:{topic, tt_v:import.meta.env.PACKAGE_VERSION, data:payload.event}});
				const donation = payload.event as TwitchEventSubDataTypes.CharityDonationEvent;
				const user = StoreProxy.users.getUserFrom("twitch", donation.user_id, donation.user_id, donation.user_login, donation.user_name, undefined, undefined, false, undefined, false);
				//Delay to give it a little more time to progress to come in before interpreting donation
				setTimeout(()=>{
					StoreProxy.twitchCharity.onCharityDonation(donation.campaign_id, user, donation.amount.value/Math.pow(10, donation.amount.decimal_places), donation.amount.currency);
				},500);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHARITY_STOP: {
				const charity = payload.event as TwitchEventSubDataTypes.CharityStopEvent;
				StoreProxy.twitchCharity.onCharityStop(charity.id);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.CHAT_CLEAR: {
				this.chatClearEvent(topic, payload.event as TwitchEventSubDataTypes.ChatClearEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.DELETE_MESSAGE: {
				const event = payload.event as TwitchEventSubDataTypes.ChatDeleteMessageEvent;
				StoreProxy.chat.deleteMessageByID(event.message_id, undefined, false);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.BITS_USE: {
				ApiHelper.call("log", "POST", {cat:"eventsub", log:{topic, tt_v:import.meta.env.PACKAGE_VERSION, data:payload.event}});
				this.bitsUsed(topic, payload.event as TwitchEventSubDataTypes.BitsUseEvent);
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_START:
			case TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_PROGRESS:
			case TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_END: {
				this.hypeTrainEvent(topic, payload.event as TwitchEventSubDataTypes.HypeTrainStartEvent | TwitchEventSubDataTypes.HypeTrainProgressEvent | TwitchEventSubDataTypes.HypeTrainEndEvent);
				break;
			}
		}
	}

	/**
	 * Called when enabling or disabling shield mode
	 * @param topic
	 * @param payload
	 */
	private shieldModeEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ShieldModeStartEvent | TwitchEventSubDataTypes.ShieldModeStopEvent):void {
		const enabled	= topic === TwitchEventSubDataTypes.SubscriptionTypes.SHIELD_MODE_START;

		if(StoreProxy.stream.shieldModeEnabled == enabled) return;

		const message = StoreProxy.i18n.t("global.moderation_action.shield_"+(enabled?"on":"off"), {MODERATOR:event.moderator_user_name});

		const m:TwitchatDataTypes.MessageShieldMode = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
			user:StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name, undefined, undefined, false, undefined, false),
			noticeId:TwitchatDataTypes.TwitchatNoticeType.SHIELD_MODE,
			message,
			enabled,
		};
		StoreProxy.chat.addMessage(m);
		StoreProxy.stream.shieldModeEnabled = enabled;

		//Sync emergency mod if requested
		if(StoreProxy.emergency.params.autoEnableOnShieldmode
		&& event.broadcaster_user_id == StoreProxy.auth.twitch.user.id) {
			StoreProxy.emergency.setEmergencyMode( enabled );
		}
	}

	/**
	 * Called when updating stream infos
	 * @param topic
	 * @param payload
	 */
	private async updateStreamInfosEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ChannelUpdateEvent):Promise<void> {
		const title:string = event.title;
		const category:string = event.category_name;
		let tags:string[] = [];
		let started_at:number = 0;
		let viewers:number = 0;
		let live:boolean = false;
		//Loading data from channel as they're more complete than what EventSub gives us.
		//tags and viewer count are missing from EventSub data
		const [streamInfos] = await TwitchUtils.getCurrentStreamInfo([event.broadcaster_user_id]);
		if(streamInfos) {
			live = true;
			tags = streamInfos.tags;
			started_at = new Date(streamInfos.started_at).getTime();
			viewers = streamInfos.viewer_count;
		}else{
			const [chanInfo] = await TwitchUtils.getChannelInfo([event.broadcaster_user_id])
			tags = chanInfo.tags;
		}

		let infos = StoreProxy.stream.currentStreamInfo[event.broadcaster_user_id];

		if(!infos) {
			infos = StoreProxy.stream.currentStreamInfo[event.broadcaster_user_id] = {
				title,
				category,
				tags,
				started_at,
				viewers,
				live,
				user: StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.broadcaster_user_id, event.broadcaster_user_login, event.broadcaster_user_name, undefined, undefined, false, undefined, false),
				lastSoDoneDate:0,
				previewUrl: streamInfos?.thumbnail_url.replace("{width}", "1920").replace("{height}", "1080") || "",
			}
		}
		infos.title = title;
		infos.category = category;
		infos.tags = tags;
		infos.viewers = viewers;
		infos.live = live;

		//Allows to dedupe update events
		const isChange = infos.title != this.lastChannelUpdateInfos.title
				|| infos.category != this.lastChannelUpdateInfos.category
				|| infos.tags.toString() != this.lastChannelUpdateInfos.tags.toString()
				|| infos.viewers != this.lastChannelUpdateInfos.viewers
				|| infos.live != this.lastChannelUpdateInfos.live;

		this.lastChannelUpdateInfos.title = infos.title;
		this.lastChannelUpdateInfos.category = infos.category;
		this.lastChannelUpdateInfos.tags = infos.tags;
		this.lastChannelUpdateInfos.viewers = infos.viewers;
		this.lastChannelUpdateInfos.live = infos.live;

		if(event.broadcaster_user_id == StoreProxy.auth.twitch.user.id) {
			const categoryData = await TwitchUtils.getCategoryByID(event.category_id);
			StoreProxy.labels.updateLabelValue("STREAM_TITLE", title);
			StoreProxy.labels.updateLabelValue("STREAM_CATEGORY_NAME", category);
			if(categoryData) {
				StoreProxy.labels.updateLabelValue("STREAM_CATEGORY_COVER", categoryData.box_art_url.replace("{width}", "138").replace("{height}", "190"));
			}else{
				StoreProxy.labels.updateLabelValue("STREAM_CATEGORY_COVER", "https://static-cdn.jtvnw.net/ttv-boxart/498566-138x190.jpg");
			}
			StoreProxy.labels.updateLabelValue("VIEWER_COUNT_TWITCH", viewers);
		}

		//This flag is here as a workaround for a sporadical twitch issue
		//where they trigger the event twice in a short timeframe (~1s)
		if(isChange) {
			const message:TwitchatDataTypes.MessageStreamInfoUpdate = {
				id:Utils.getUUID(),
				date:Date.now(),
				platform:"twitch",
				channel_id:event.broadcaster_user_id,
				type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
				message:StoreProxy.i18n.t("stream.notification", {TITLE:event.title, CATEGORY:event.category_name}),
				noticeId:TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE,
				title:infos.title,
				category:infos.category
			}

			StoreProxy.chat.addMessage(message);
		}
	}

	/**
	 * Called when someone follows
	 * @param topic
	 * @param payload
	 */
	private followEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.FollowEvent):void {
		if(StoreProxy.users.isAFollower("twitch", event.user_id)) return;

		const channelId = event.broadcaster_user_id;

		const message:TwitchatDataTypes.MessageFollowingData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id: channelId,
			type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			user: StoreProxy.users.getUserFrom("twitch", channelId, event.user_id, event.user_login, event.user_name, undefined, true, false, undefined, false),
			followed_at: Date.now(),
		};
		// message.user.channelInfo[channelId].online = true;

		this.lastRecentFollowers.push( message );
		if(this.lastRecentFollowers.length > 1) {
			//duration between 2 follow events to consider them as a follow streak
			const minDuration = 500;
			let dateOffset:number = this.lastRecentFollowers[0].followed_at;
			for (let i = 1; i < this.lastRecentFollowers.length; i++) {
				const f = this.lastRecentFollowers[i];
				//more than the minDuration has past, reset the streak
				if(f.followed_at - dateOffset > minDuration) {
					this.lastRecentFollowers = [];
					break;
				}
				dateOffset = f.followed_at;
			}
		}

		if(this.lastRecentFollowers.length > 20
		&& Date.now() > StoreProxy.chat.securityRaidGraceEndDate
		&& StoreProxy.emergency.params.enabled === true
		&& StoreProxy.emergency.emergencyStarted !== true
		&& StoreProxy.emergency.params.autoEnableOnFollowbot === true) {
			//Start emergency mode
			StoreProxy.emergency.setEmergencyMode(true);
		}


		//If emergency mode is enabled and we asked to automatically block
		//any new followser during that time, do it
		if(StoreProxy.emergency.emergencyStarted === true) {
			for (let i = 0; i < this.lastRecentFollowers.length; i++) {
				const followData = this.lastRecentFollowers[i];
				StoreProxy.emergency.addEmergencyFollower(followData);
			}
			this.lastRecentFollowers = [];
		}

		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when subscribing to the channel.
	 * A subgift will appear as a normal gift with "is_gift" flag set to true but there's apparently no way
	 * to know who subgifted the user.
	 *
	 * @param topic
	 * @param event
	 */
	private subscriptionEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.SubEvent | TwitchEventSubDataTypes.SubRenewEvent | TwitchEventSubDataTypes.SubgiftEvent):void {
		const sub = event as TwitchEventSubDataTypes.SubEvent;
		const renew = event as TwitchEventSubDataTypes.SubRenewEvent;
		const gift = event as TwitchEventSubDataTypes.SubgiftEvent;

		//THIS IS AN UNTESTED DRAFT THAT IS NOT USED AT THE MOMENT BECAUSE IRC DOES IT BETTER

		const channel_id = event.broadcaster_user_id;
		const tier_n = parseInt(event.tier);
		const message:TwitchatDataTypes.MessageSubscriptionData = {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			id:Utils.getUUID(),
			channel_id,
			date:Date.now(),
			user:StoreProxy.users.getUserFrom("twitch", channel_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false),
			tier: isNaN(tier_n)? "prime" : tier_n/1000 as 1|2|3,
			is_gift: sub.is_gift,
			is_giftUpgrade: false,
			is_resub: false,
			is_primeUpgrade: false,
			is_targetedSubgift:false,//no data for this??
			months:1,
			streakMonths:-1,
			totalSubDuration:-1,
			message_size:0,
		}

		if(renew.message) {
			const chunks			= TwitchUtils.parseMessageToChunks(renew.message.text, renew.message.emotes, true);
			message.message			= renew.message.text;
			message.message_chunks	= chunks;
			message.message_html	= TwitchUtils.messageChunksToHTML(chunks);
			message.message_size	= TwitchUtils.computeMessageSize(message.message_chunks);
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when receiving bits
	 *
	 * @param topic
	 * @param event
	 */
	private async bitsEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.BitsEvent):Promise<void> {

		//THIS IS AN UNTESTED DRAFT THAT IS NOT USED AT THE MOMENT

		const channel_id = event.broadcaster_user_id;
		const chunks = TwitchUtils.parseMessageToChunks(event.message, undefined, true);
		await TwitchUtils.parseCheermotes(chunks, channel_id);
		const user = StoreProxy.users.getUserFrom("twitch", channel_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false);
		const message:TwitchatDataTypes.MessageCheerData = {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.CHEER,
			id:Utils.getUUID(),
			channel_id,
			date:Date.now(),
			user,
			bits:event.bits ?? -1,
			message:event.message,
			message_chunks:chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			message_size:TwitchUtils.computeMessageSize(chunks),
			pinned:false,//TODO
			pinDuration_ms:0,//TODO
			pinLevel:0,//TODO
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when receiving or doing a raid
	 *
	 * @param topic
	 * @param event
	 */
	private async raidEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.RaidEvent):Promise<void> {
		const me = StoreProxy.auth.twitch.user;
		if(event.from_broadcaster_user_id == me.id) {
			//Raid complete
			StoreProxy.stream.onRaidComplete();
		}else{
			//Raided by someone
			const user = StoreProxy.users.getUserFrom("twitch", event.to_broadcaster_user_id, event.from_broadcaster_user_id, event.from_broadcaster_user_login, event.from_broadcaster_user_name, undefined, undefined, false, undefined, false);
			user.channelInfo[event.to_broadcaster_user_id].is_raider = true;

			//Check current live info
			const [currentStream] = await TwitchUtils.getCurrentStreamInfo([event.from_broadcaster_user_id]);
			let isLive:boolean = false, title = "", category = "", duration = 0;
			if(currentStream) {
				isLive = true;
				title = currentStream.title;
				category = currentStream.game_name;
				duration = Date.now() - new Date(currentStream.started_at).getTime();
			}else{
				//No current live found, load channel info
				const [chanInfo] = await TwitchUtils.getChannelInfo([event.from_broadcaster_user_id]);
				if(chanInfo) {
					title = chanInfo.title;
					category = chanInfo.game_name;
				}
			}

			const message:TwitchatDataTypes.MessageRaidData = {
				platform:"twitch",
				type:TwitchatDataTypes.TwitchatMessageType.RAID,
				id:Utils.getUUID(),
				channel_id: event.to_broadcaster_user_id,
				date:Date.now(),
				user,
				viewers:event.viewers,
				stream:{
					wasLive:isLive,
					title,
					category,
					duration,
					duration_str:Utils.formatDuration(duration),
				}
			};
			StoreProxy.chat.addMessage(message);
		}
	}

	/**
	 * Called when banning a user either permanently or temporarilly
	 * @param topic
	 * @param event
	 */
	private async banEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.BanEvent):Promise<void> {
		const moderator	= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name, undefined, undefined, false, undefined, false);
		const duration	= event.is_permanent? undefined : Math.round((new Date(event.ends_at).getTime() - new Date(event.banned_at).getTime()) / 1000)
		await StoreProxy.users.flagBanned("twitch", event.broadcaster_user_id, event.user_id, duration, moderator);
	}

	/**
	 * Called when unbanning a user
	 * @param topic
	 * @param event
	 */
	private unbanEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.UnbanEvent):void {
		const moderator = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name, undefined, undefined, false, undefined, false);
		StoreProxy.users.flagUnbanned("twitch", event.broadcaster_user_id, event.user_id, moderator);
	}

	/**
	 * Called when adding a modetator
	 */
	private modAddEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ModeratorAddEvent):void {
		const modedUser	= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false);
		const moderator		= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.broadcaster_user_id, event.broadcaster_user_login, event.broadcaster_user_name, undefined, undefined, false, undefined, false);
		const m:TwitchatDataTypes.MessageModerationAction = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
			noticeId:TwitchatDataTypes.TwitchatNoticeType.MOD,
			user:modedUser,
			message: StoreProxy.i18n.t("global.moderation_action.modded_by", {USER:modedUser.displayName, MODERATOR:moderator.displayName}),
		};
		StoreProxy.users.flagMod("twitch", event.broadcaster_user_id, modedUser.id);
		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Called when a moderator is removed
	 * @param topic
	 * @param event
	 */
	private modRemoveEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ModeratorRemoveEvent):void {
		const modedUser		= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false);
		const moderator		= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.broadcaster_user_id, event.broadcaster_user_login, event.broadcaster_user_name, undefined, undefined, false, undefined, false);
		const m:TwitchatDataTypes.MessageModerationAction = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
			noticeId:TwitchatDataTypes.TwitchatNoticeType.MOD,
			user:modedUser,
			message: StoreProxy.i18n.t("global.moderation_action.unmodded_by", {USER:modedUser.displayName, MODERATOR:moderator.displayName}),
		};
		StoreProxy.users.flagUnmod("twitch", event.broadcaster_user_id, modedUser.id);
		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Called when redeeming a reward except for power ups and
	 * automatic rewards like "highlight my message"
	 * @param topic
	 * @param payload
	 */
	private rewardRedeem(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.RewardRedeemEvent):void {
		const user = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false);
		const reward = StoreProxy.rewards.rewardList.find(r=>r.id == event.reward.id);
		const m:TwitchatDataTypes.MessageRewardRedeemData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.REWARD,
			user,
			reward:{
				id:event.reward.id,
				title:event.reward.title,
				cost:event.reward.cost,
				description:event.reward.prompt,
				color:reward? reward.background_color : "#ffffff",
				icon:{
					sd:reward?.image?.url_1x ?? StoreProxy.asset("icons/channelPoints.svg"),
					hd:reward?.image?.url_4x ?? StoreProxy.asset("icons/channelPoints.svg"),
				},
			},
			message_size:0,
			redeemId: event.id,
		};

		if(event.user_input) {
			const chunks	= TwitchUtils.parseMessageToChunks(event.user_input, undefined, true);
			m.message		= event.user_input;
			m.message_chunks= chunks;
			m.message_html	= TwitchUtils.messageChunksToHTML(chunks);
			m.message_size	= TwitchUtils.computeMessageSize(chunks);
		}

		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Called when redeeming an automatic reward (used only for "celebration" for now)
	 * EDIT: Not used anymore. Power-Ups are handle through "bits used" topic that gives more info
	 * and "highlight my message" is handled through IRC as it also works for external channels
	 * @param topic
	 * @param payload
	 */
	private automaticRewardRedeem(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.AutomaticRewardRedeemEvent):void {
		return;
		if(event.reward.type != "celebration") return;
		const user = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false);
		const m:TwitchatDataTypes.MessageTwitchCelebrationData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION,
			user,
			cost:event.reward.cost!,
			emoteID:event.reward.unlocked_emote?.id,
			emoteURL:"https://static-cdn.jtvnw.net/emoticons/v2/" + event.reward.unlocked_emote + "/default/light/3.0"
		};
		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Called when stream starts or stops
	 * @param topic
	 * @param event
	 */
	private async streamStartStopEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.StreamOnlineEvent | TwitchEventSubDataTypes.StreamOfflineEvent):Promise<void> {
		let streamInfo = StoreProxy.stream.currentStreamInfo[event.broadcaster_user_id]!;//Data is loaded at app load for currently authenticated chan
		streamInfo.live = topic === TwitchEventSubDataTypes.SubscriptionTypes.STREAM_ON;
		const message:TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData = {
			date:Date.now(),
			id:Utils.getUUID(),
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE,
			info: streamInfo,
			channel_id:event.broadcaster_user_id,
		}

		//Stream offline
		if(topic === TwitchEventSubDataTypes.SubscriptionTypes.STREAM_OFF) {
			StoreProxy.stream.setPlaybackState(event.broadcaster_user_id, undefined);
			StoreProxy.stream.setStreamStop(event.broadcaster_user_id);
			((message as unknown) as TwitchatDataTypes.MessageStreamOfflineData).type = TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE;

		//Stream online
		}else if(topic === TwitchEventSubDataTypes.SubscriptionTypes.STREAM_ON) {
			await StoreProxy.stream.grabCurrentStreamVOD();

			//Load stream info
			const [streamInfo] = await TwitchUtils.getCurrentStreamInfo([event.broadcaster_user_id]);
			if(streamInfo) {
				message.info.started_at = new Date(streamInfo.started_at).getTime();
				message.info.live = true;
				message.info.title = streamInfo.title;
				message.info.category = streamInfo.game_name;
				message.info.previewUrl = streamInfo.thumbnail_url.replace("{width}", "1920").replace("{height}", "1080");
			}else{
				//Fallback to channel info if API isn't synchronized yet
				const [chanInfo] = await TwitchUtils.getChannelInfo([event.broadcaster_user_id]);
				message.info.started_at = Date.now();
				message.info.live = true;
				message.info.title = chanInfo.title;
				message.info.category = chanInfo.game_name;
				message.info.previewUrl = "";
			}
			StoreProxy.stream.setStreamStart(event.broadcaster_user_id, message.info.started_at);
		}
		StoreProxy.chat.addMessage(message);
		StoreProxy.stream.currentStreamInfo[event.broadcaster_user_id] = streamInfo;
	}

	/**
	 * Called when stream starts or stops
	 * @param topic
	 * @param event
	 */
	private async shoutoutEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ShoutoutInEvent | TwitchEventSubDataTypes.ShoutoutOutEvent):Promise<void> {
		const so_in		= event as TwitchEventSubDataTypes.ShoutoutInEvent;
		const so_out	= event as TwitchEventSubDataTypes.ShoutoutOutEvent;

		const received = topic == TwitchEventSubDataTypes.SubscriptionTypes.SHOUTOUT_IN;
		let user!:TwitchatDataTypes.TwitchatUser;
		let moderator = user;
		if(received) {
			user		= StoreProxy.users.getUserFrom("twitch", so_in.broadcaster_user_id, so_in.from_broadcaster_user_id, so_in.from_broadcaster_user_login, so_in.from_broadcaster_user_name, undefined, undefined, false, undefined, false);
		}else{
			user		= StoreProxy.users.getUserFrom("twitch", so_out.broadcaster_user_id, so_out.to_broadcaster_user_id, so_out.to_broadcaster_user_login, so_out.to_broadcaster_user_name, undefined, undefined, false, undefined, false);
			moderator	= StoreProxy.users.getUserFrom("twitch", so_out.broadcaster_user_id, so_out.moderator_user_id, so_out.moderator_user_login, so_out.moderator_user_name, undefined, undefined, false, undefined, false);
		}

		let title:string = "";
		let category:string = "";
		const [stream] = await TwitchUtils.getCurrentStreamInfo([user.id]);
		if(!stream) {
			const [channel] = await TwitchUtils.getChannelInfo([user.id]);
			title = channel.title;
			category = channel.game_name;
		}else{
			title = stream.title;
			category = stream.game_name;
		}

		const channel_id = event.broadcaster_user_id;
		const message:TwitchatDataTypes.MessageShoutoutData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id,
			type:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT,
			user,
			viewerCount:event.viewer_count,
			stream: {
				category,
				title,
			},
			moderator,
			received,
		};
		StoreProxy.chat.addMessage(message);

		//If it's a sent shoutout, cleanup first pending SO found for this user
		if(!received) {
			StoreProxy.stream.currentStreamInfo[channel_id]!.lastSoDoneDate = Date.now();

			let list = StoreProxy.users.pendingShoutouts[channel_id];
			if(!list) list = [];
			const index = list.findIndex(v=>v.user.id === user.id);
			//Set the last SO date of the user
			user.channelInfo[channel_id].lastShoutout = Date.now();
			if(index > -1) {
				//Update existing item
				list.splice(index, 1);
			}
			StoreProxy.users.pendingShoutouts[channel_id] = list;

			if(StoreProxy.params.features.chatShoutout.value === true){
				let message = StoreProxy.chat.botMessages.shoutout.message;
				message = message.replace(/\{USER\}/gi, user.displayName);
				message = message.replace(/\{URL\}/gi, "twitch.tv/"+user.login);
				message = message.replace(/\{TITLE\}/gi, title);
				message = message.replace(/\{CATEGORY\}/gi, category);
				await MessengerProxy.instance.sendMessage(message);
			}
		}
	}

	/**
	 * Called when an Ad break is started.
	 * Either manually or automatically.
	 */
	private adBreakEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.AdBreakEvent):void {
		const infos = StoreProxy.stream.getCommercialInfo(event.broadcaster_user_id);
		//Thank you twitch for writing a completely wrong documentation...
		//don't know if they'll change the doc or the service, so i handle both cases
		infos.nextAdStart_at = new Date(typeof event.started_at == "number"? event.started_at * 1000 : event.started_at).getTime(),
		infos.currentAdDuration_ms = event.duration_seconds * 1000;
		let starter:TwitchatDataTypes.TwitchatUser | undefined = undefined;
		//Don't show notification if ad started by ourself or automatically
		if(!event.is_automatic && event.broadcaster_user_id != event.requester_user_id) {
			starter = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.requester_user_id, event.requester_user_login, undefined, undefined, undefined, false, undefined, false);
		}
		Logger.instance.log("ads", {
			es:event,
			internal:infos,
		})
		StoreProxy.stream.setCommercialInfo(event.broadcaster_user_id, infos, starter, true);

		window.setTimeout(() => {
			TwitchUtils.getAdSchedule()
		}, infos.currentAdDuration_ms + 60000);
	}

	/**
	 * Called when receiving a new unban request or when resolving an existing one
	 * @param topic
	 * @param event
	 */
	private async unbanRequestEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.UnbanRequestEvent | TwitchEventSubDataTypes.UnbanRequestResolveEvent):Promise<void> {
		let message:TwitchatDataTypes.MessageUnbanRequestData = {
			channel_id:event.broadcaster_user_id,
			date:Date.now(),
			id:Utils.getUUID(),
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.UNBAN_REQUEST,
			user:await StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false),
			isResolve:false,
			isFlagByAutomod:false,
			message:"",
		}
		if(topic == TwitchEventSubDataTypes.SubscriptionTypes.UNBAN_REQUEST_NEW) {
			event = event as TwitchEventSubDataTypes.UnbanRequestEvent;
			message.message = event.text;
			message.isFlagByAutomod = await TwitchUtils.checkAutomodFlag(message.message);

		}else if(topic == TwitchEventSubDataTypes.SubscriptionTypes.UNBAN_REQUEST_RESOLVED) {
			event = event as TwitchEventSubDataTypes.UnbanRequestResolveEvent;
			message.isResolve	= true;
			message.moderator	= await StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id,
																		//Falling back to broadcaster info if moderator info are missing
																		//(Until Twitch fixes it, "accept" event is broken for now and misses moderator info.)
																		event.moderator_user_id || event.broadcaster_user_id,
																		event.moderator_user_login || event.broadcaster_user_login,
																		event.moderator_user_name || event.broadcaster_user_name,
																		undefined, undefined, false, undefined, false),
			message.message		= event.resolution_text;
			message.accepted	= event.status != "denied";
		}

		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when automod terms are updated
	 * @param topic
	 * @param event
	 */
	private async automodTermsUpdate(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.AutomodTermsUpdateEvent):Promise<void> {
		//Debounce events and merge them
		this.debouncedAutomodTerms.push(event);
		clearTimeout(this.debounceAutomodTermsUpdate);
		this.debounceAutomodTermsUpdate = window.setTimeout(async () => {
			//Sort events by moderators
			const grouped:{[channelModAction:string]:TwitchEventSubDataTypes.AutomodTermsUpdateEvent[]} = {};
			this.debouncedAutomodTerms.forEach((t)=> {
				const key = t.broadcaster_user_id+"_"+t.moderator_user_id+"_"+t.action;
				if(!grouped[key]) grouped[key] = [];
				grouped[key].push(t);
			});

			this.debouncedAutomodTerms = [];

			for (const key in grouped) {
				const group = grouped[key];
				const ref = group[0];
				const message:TwitchatDataTypes.MessageBlockedTermsData = {
					channel_id:ref.broadcaster_user_id,
					date:Date.now(),
					id:Utils.getUUID(),
					platform:"twitch",
					type:TwitchatDataTypes.TwitchatMessageType.BLOCKED_TERMS,
					user:await StoreProxy.users.getUserFrom("twitch", ref.broadcaster_user_id, ref.moderator_user_id, ref.moderator_user_login, ref.moderator_user_name, undefined, undefined, false, undefined, false),
					action:ref.action,
					terms:group.map(v=>v.terms).flat(),
					temporary: event.from_automod === true,
				}
				StoreProxy.chat.addMessage(message);
			}
		}, 1000);
	}

	/**
	 * Called when a message is held by automod
	 * @param topic
	 * @param event
	 */
	private async automodMessageHeld(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.AutomodMessageHeldEvent):Promise<void> {
		// const reasons:string[] = [];
		// for (let i = 0; i < event.fragments.length; i++) {
		// 	const f = event.fragments[i];
		// 	if(!f.automod) continue;
		// 	for (const key in f.automod.topics) {
		// 		if(reasons.indexOf(key) == -1) reasons.push(key);
		// 	}
		// }

		//Build usable emotes set
		const chunks:TwitchatDataTypes.ParseMessageChunk[] = [];
		const words:string[] = [];
		let charCount = 0;
		for (let i = 0; i < event.message.fragments.length; i++) {
			const el = event.message.fragments[i];
			let automodChunk = false;
			if(event.automod) {
				automodChunk = event.automod.boundaries.findIndex(v=>v.start_pos <= charCount && v.end_pos >= charCount) > -1;
			}
			if(event.blocked_term) {
				automodChunk = event.blocked_term.terms_found.map(v=>v.boundary).findIndex(v=>v.start_pos <= charCount && v.end_pos >= charCount) > -1;
			}
			if(el.type == "emote") {
				chunks.push({
					type:"emote",
					value:el.text,
					emote:"https://static-cdn.jtvnw.net/emoticons/v2/"+el.emote.id+"/default/light/2.0",
					emoteHD:"https://static-cdn.jtvnw.net/emoticons/v2/"+el.emote.id+"/default/light/4.0",
				});

			}else if(automodChunk) {
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
			charCount += el.text.length;
		}

		const userData = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false);
		const messageHtml = TwitchUtils.messageChunksToHTML(chunks);
		const m:TwitchatDataTypes.MessageChatData = {
			id:event.message_id,
			channel_id:event.broadcaster_user_id,
			date:Date.now(),
			type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			platform:"twitch",
			user:userData,
			answers:[],
			message:event.message_id,
			message_chunks:chunks,
			message_html:messageHtml,
			message_size:0,
			twitch_automod:{ reasons:[event.reason == "blocked_term"? "blocked term" : event.automod?.category || ""], words },
			is_short:false,
		};
		m.message_size = TwitchUtils.computeMessageSize(m.message_chunks);
		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Called when the status of a message held by automod is updated
	 * @param topic
	 * @param event
	 */
	private async automodMessageUpdate(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.AutomodMessageUpdateEvent):Promise<void> {
		//Delete it even if allowed as it's actually sent back via IRC
		StoreProxy.chat.deleteMessageByID(event.message_id, undefined, false);
	}

	/**
	 * Called when a moderation event happens
	 * @param topic
	 * @param event
	 */
	private async moderationEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ModerationEvent):Promise<void> {
		const user = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.broadcaster_user_id, event.broadcaster_user_login, event.broadcaster_user_name, undefined, undefined, false, undefined, false);
		const moderator = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name, undefined, undefined, false, undefined, false);
		const isBroadcasterToken = user.id == moderator.id;
		switch(event.action) {
			case "raid":{
				const raidedUSer = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.raid.user_id, event.raid.user_login, event.raid.user_login, undefined, undefined, false, undefined, false)

				//Load user's avatar if not already available
				if(!raidedUSer.avatarPath) {
					const res = (await TwitchUtils.getUserInfo([raidedUSer.id]))[0];
					raidedUSer.avatarPath = res.profile_image_url;
				}

				const m:TwitchatDataTypes.RaidInfo = {
					channel_id: event.broadcaster_user_id,
					user: StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.raid.user_id, event.raid.user_login, event.raid.user_login, undefined, undefined, false, undefined, false),
					viewerCount: event.raid.viewer_count,
					startedAt: Date.now(),
					timerDuration_s: 90,
				};
				StoreProxy.stream.setRaiding(m);
				break;
			}

			case "unraid":{
				StoreProxy.stream.setRaiding();
				break;
			}

			case "clear":{
				//Ignore, already listened from dedicated topic
				break;
			}

			case "followers":
			case "followersoff": {
				const settings:TwitchatDataTypes.IRoomSettings = {}
				settings.followOnly = event.action == "followers"? event.followers.follow_duration_minutes : false;
				StoreProxy.stream.setRoomSettings(event.broadcaster_user_id, settings);
				break;
			}

			case "emoteonly":
			case "emoteonlyoff": {
				const settings:TwitchatDataTypes.IRoomSettings = {}
				settings.emotesOnly = event.action == "emoteonly";
				StoreProxy.stream.setRoomSettings(event.broadcaster_user_id, settings);
				break;
			}

			case "slow":
			case "slowoff": {
				const settings:TwitchatDataTypes.IRoomSettings = {}
				settings.slowMode = event.action == "slow"? event.slow.wait_time_seconds : 0;
				StoreProxy.stream.setRoomSettings(event.broadcaster_user_id, settings);
				break;
			}

			case "subscribers":
			case "subscribersoff": {
				const settings:TwitchatDataTypes.IRoomSettings = {}
				settings.subOnly = event.action == "subscribers";
				StoreProxy.stream.setRoomSettings(event.broadcaster_user_id, settings);
				break;
			}

			case "warn":{
				this.warningSendEvent(topic, {
					broadcaster_user_id: event.broadcaster_user_id,
					broadcaster_user_login: event.broadcaster_user_login,
					broadcaster_user_name: event.broadcaster_user_name,
					user_id: event.warn.user_id,
					user_login: event.warn.user_login,
					user_name: event.warn.user_name,
					moderator_user_id: event.moderator_user_id,
					moderator_user_login: event.moderator_user_login,
					moderator_user_name: event.moderator_user_name,
					reason: event.warn.reason,
					chat_rules_cited:event.warn.chat_rules_cited,
				});
				break;
			}

			case "vip":
			case "unvip":{
				let user:TwitchatDataTypes.TwitchatUser;
				if(event.action == "vip") {
					user = StoreProxy.users.getUserFrom("twitch", event.vip.user_id, event.vip.user_id, event.vip.user_login, undefined, undefined, undefined, false, undefined, false);
				}else{
					user = StoreProxy.users.getUserFrom("twitch", event.unvip.user_id, event.unvip.user_id, event.unvip.user_login, undefined, undefined, undefined, false, undefined, false);
				}
				const m:TwitchatDataTypes.MessageModerationAction = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					channel_id:event.broadcaster_user_id,
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					user,
					noticeId:TwitchatDataTypes.TwitchatNoticeType.VIP,
					message: StoreProxy.i18n.t(event.action == "vip"? "chat.vip.add" : "chat.vip.remove", {USER:user.displayName, MODERATOR:moderator.displayName}),
				};
				StoreProxy.chat.addMessage(m);
				break;
			}

			case "mod":
			case "unmod":{
				let user:TwitchatDataTypes.TwitchatUser;
				if(event.action == "mod") {
					user = StoreProxy.users.getUserFrom("twitch", event.mod.user_id, event.mod.user_id, event.mod.user_login, undefined, undefined, undefined, false, undefined, false);
				}else{
					user = StoreProxy.users.getUserFrom("twitch", event.unmod.user_id, event.unmod.user_id, event.unmod.user_login, undefined, undefined, undefined, false, undefined, false);
				}
				const m:TwitchatDataTypes.MessageModerationAction = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					channel_id:event.broadcaster_user_id,
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					user,
					noticeId:TwitchatDataTypes.TwitchatNoticeType.VIP,
					message: StoreProxy.i18n.t(event.action == "mod"? "chat.mod.add" : "chat.mod.remove", {USER:user.displayName, MODERATOR:moderator.displayName}),
				};
				StoreProxy.chat.addMessage(m);
				break;
			}

			case "ban":{
				//Stop there if the "channel:moderate" scope has been granted
				//and event is from a braodcaster token (event not available as mod)
				//In this case we subscribed to channel.ban topic that gives a
				//more accurate event data to compute timeout duration.
				//No need to parse this event as it would be a sort of duplicate
				//of the channel.ban event
				if(isBroadcasterToken && TwitchUtils.hasScopes([TwitchScopes.MODERATION_EVENTS])) return;

				this.banEvent(topic, {
					banned_at:new Date().toString(),
					broadcaster_user_id:event.broadcaster_user_id,
					broadcaster_user_login:event.broadcaster_user_login,
					broadcaster_user_name:event.broadcaster_user_name,
					moderator_user_id:event.moderator_user_id,
					moderator_user_login:event.moderator_user_login,
					moderator_user_name:event.moderator_user_name,
					is_permanent:true,
					ends_at:"",
					reason:event.ban.reason,
					user_id:event.ban.user_id,
					user_login:event.ban.user_login,
					user_name:event.ban.user_name,
				});
				break;
			}

			case "unban":{
				this.unbanEvent(topic, {
					broadcaster_user_id:event.broadcaster_user_id,
					broadcaster_user_login:event.broadcaster_user_login,
					broadcaster_user_name:event.broadcaster_user_name,
					moderator_user_id:event.moderator_user_id,
					moderator_user_login:event.moderator_user_login,
					moderator_user_name:event.moderator_user_name,
					user_id:event.unban.user_id,
					user_login:event.unban.user_login,
					user_name:event.unban.user_name,
				});
				break;
			}

			case "timeout":{
				//Stop there if the "channel:moderate" scope has been granted
				//and event is from a braodcaster token (event not available as mod)
				//In this case we subscribed to channel.ban topic that gives a
				//more accurate event data to compute timeout duration.
				//No need to parse this event as it would be a sort of duplicate
				//of the channel.ban event
				if(isBroadcasterToken && TwitchUtils.hasScopes([TwitchScopes.MODERATION_EVENTS])) return;

				this.banEvent(topic, {
					banned_at:new Date().toString(),
					broadcaster_user_id:event.broadcaster_user_id,
					broadcaster_user_login:event.broadcaster_user_login,
					broadcaster_user_name:event.broadcaster_user_name,
					moderator_user_id:event.moderator_user_id,
					moderator_user_login:event.moderator_user_login,
					moderator_user_name:event.moderator_user_name,
					is_permanent:false,
					ends_at:event.timeout.expires_at,
					reason:event.timeout.reason,
					user_id:event.timeout.user_id,
					user_login:event.timeout.user_login,
					user_name:event.timeout.user_name,
				});
				break;
			}

			case "untimeout":{
				this.unbanEvent(topic, {
					broadcaster_user_id:event.broadcaster_user_id,
					broadcaster_user_login:event.broadcaster_user_login,
					broadcaster_user_name:event.broadcaster_user_name,
					moderator_user_id:event.moderator_user_id,
					moderator_user_login:event.moderator_user_login,
					moderator_user_name:event.moderator_user_name,
					user_id:event.untimeout.user_id,
					user_login:event.untimeout.user_login,
					user_name:event.untimeout.user_name,
				});
				break;
			}

			case "delete": {
				const deleter = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name, undefined, false, false, false, false);
				StoreProxy.chat.deleteMessageByID(event.delete.message_id, deleter, false);
			}

			default: {
				console.log("Unhandled moderation event from eventsub");
				console.log(event);
			}
		}
	}

	/**
	 * Called when a user acknowledged a warning
	 * @param topic
	 * @param event
	 */
	private async warningAcknowledgeEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.WarningAcknowledgeEvent):Promise<void> {
		const message:TwitchatDataTypes.MessageWarnAcknowledgementData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.WARN_ACKNOWLEDGE,
			channel_id:event.broadcaster_user_id,
			user:StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false),
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when a user is sent a warning a warning
	 * @param topic
	 * @param event
	 */
	private async warningSendEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.WarningSentEvent):Promise<void> {
		const moderator = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name)
		const message:TwitchatDataTypes.MessageWarnUserData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.WARN_CHATTER,
			channel_id:event.broadcaster_user_id,
			user:StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false),
			moderator,
			rules:event.chat_rules_cited,
			customReason:event.reason? event.reason : undefined,
			abstractedReason:event.reason? event.reason : event.chat_rules_cited.join(" - "),
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when a user suspicious/restricted user sends a message
	 * @param topic
	 * @param event
	 */
	private async suspiciousUserMessage(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.SuspiciousUserMessage):Promise<void> {
		if(event.low_trust_status == "restricted") {
			const channelId = event.broadcaster_user_id;
			const userData = StoreProxy.users.getUserFrom("twitch", channelId, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false);
			const chunks = TwitchUtils.parseMessageToChunks(event.message.text);
			const m:TwitchatDataTypes.MessageChatData = {
				id:event.message.message_id,
				channel_id:channelId,
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				platform:"twitch",
				user:userData,
				answers:[],
				message:event.message.text,
				message_chunks:chunks,
				message_html:TwitchUtils.messageChunksToHTML(chunks),
				message_size: TwitchUtils.computeMessageSize(chunks),
				twitch_isRestricted:true,
				is_short:false,
			};

			const users = await TwitchUtils.getUserInfo(event.shared_ban_channel_ids);
			m.twitch_sharedBanChannels = users?.map(v=> { return {id:v.id, login:v.login}}) ?? [];
			StoreProxy.chat.addMessage(m);
		}else{
			StoreProxy.chat.flagSuspiciousMessage(event.message.message_id, event.shared_ban_channel_ids || []);
		}
	}

	/**
	 * Called when a user suspicious/restricted user sends a message
	 * @param topic
	 * @param event
	 */
	private async suspiciousUserStateUpdate(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.SuspiciousUserStateUpdate):Promise<void> {
		const m:TwitchatDataTypes.MessageLowtrustTreatmentData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.LOW_TRUST_TREATMENT,
			user:StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name),
			moderator:StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name, undefined, undefined, false, undefined, false),
			restricted:event.low_trust_status == "restricted",
			monitored:event.low_trust_status == "active_monitoring",
		};
		StoreProxy.chat.addMessage(m);
	}

	/**
	 * Called when a prediction event is received
	 * @param topic
	 * @param event
	 */
	private async predictionEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.PredictionStartEvent | TwitchEventSubDataTypes.PredictionProgressEvent | TwitchEventSubDataTypes.PredictionEndEvent | TwitchEventSubDataTypes.PredictionLockEvent):Promise<void> {
		if(topic === "channel.prediction.end" && (event as TwitchEventSubDataTypes.PredictionEndEvent).status == "canceled") {
			StoreProxy.prediction.setPrediction(null);
			return;
		}
		let totalPoints = 0;
		let totalUsers = 0;
		const currentPrediction = StoreProxy.prediction.data;
		const isComplete = topic === "channel.prediction.end" && (event as TwitchEventSubDataTypes.PredictionEndEvent).status == "resolved";
		const outcomes:TwitchatDataTypes.MessagePredictionDataOutcome[] = currentPrediction?.outcomes || [];
		//Merge outcomes with current data.
		//Eventsub "end" doesn't send back the vote/user count with the outcome.
		//because of this, we need to keep the local outcomes with their current
		//votes instead of simply using what EventSub gives us.
		if(topic == "channel.prediction.progress") {
			const typedEvent = event as TwitchEventSubDataTypes.PredictionProgressEvent;
			for (let i = 0; i < typedEvent.outcomes.length; i++) {
				const c = typedEvent.outcomes[i];
				totalPoints += c.channel_points;
				totalUsers += c.users;
				let outcome = outcomes.find(v=>v.id === c.id);
				if(outcome) {
					outcome.votes = c.channel_points;
					outcome.voters = c.users;
				}else{
					outcomes.push({
						id: c.id,
						label: c.title,
						votes: c.channel_points,
						voters: c.users,
					})
				}
			}
		}else{
			for (let i = 0; i < event.outcomes.length; i++) {
				const c = event.outcomes[i];
				if(outcomes.findIndex(v=>v.id === c.id) > -1) continue;
				outcomes.push({
					id: c.id,
					label: c.title,
					votes: 0,
					voters: 0,
				})
			}
		}
		let duration = currentPrediction?.duration_s || 30;
		if(topic === "channel.prediction.begin") {
			let typedEvent = event as TwitchEventSubDataTypes.PredictionStartEvent;
			duration = (new Date(typedEvent.locks_at).getTime() - new Date(event.started_at).getTime())/1000;
		}
		const prediction:TwitchatDataTypes.MessagePredictionData = {
			date:Date.now(),
			id:event.id,
			// creator: StoreProxy.users.getUserFrom("twitch", me.id, event.created_by.user_id, event.created_by.user_display_name.toLowerCase(), event.created_by.user_display_name),
			platform:"twitch",
			channel_id: event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.PREDICTION,
			title: event.title,
			outcomes,
			pendingAnswer: topic === "channel.prediction.lock",
			started_at: currentPrediction?.started_at || new Date(event.started_at).getTime() - 1000,
			duration_s: duration,
			totalPoints: totalPoints || currentPrediction?.totalPoints || 0,
			totalUsers: totalUsers || currentPrediction?.totalUsers || 0,
		};
		if(topic === "channel.prediction.end") {
			prediction.ended_at = new Date((event as TwitchEventSubDataTypes.PredictionEndEvent).ended_at).getTime()
		}
		if(topic === "channel.prediction.end") {
			prediction.winner = outcomes.find(v => v.id == (event as TwitchEventSubDataTypes.PredictionEndEvent).winning_outcome_id);
		}

		StoreProxy.prediction.setPrediction(prediction, isComplete);
		if(isComplete) {
			//Clear prediction
			StoreProxy.prediction.setPrediction(null);
		}
	}

	/**
	 * Called when a prediction event is received
	 * @param topic
	 * @param event
	 */
	private async pollEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.PollStartEvent | TwitchEventSubDataTypes.PollProgressEvent | TwitchEventSubDataTypes.PollEndEvent):Promise<void> {
		//Ignore archived event
		if(topic === TwitchEventSubDataTypes.SubscriptionTypes.POLL_END
		&& (event as TwitchEventSubDataTypes.PollEndEvent).status == "archived") return;

		const choices:TwitchatDataTypes.MessagePollDataChoice[] = [];
		let winner!:TwitchatDataTypes.MessagePollDataChoice;
		let winnerValue = -1;
		for (let i = 0; i < event.choices.length; i++) {
			const c = event.choices[i];
			let votes = 0
			if(topic != "channel.poll.begin") {
				const typedEvent = event as TwitchEventSubDataTypes.PollProgressEvent | TwitchEventSubDataTypes.PollEndEvent;
				votes = typedEvent.choices[i].votes;
			}
			const entry:TwitchatDataTypes.MessagePollDataChoice = { id: c.id, label: c.title, votes };
			if(entry.votes > winnerValue) {
				winner = entry;
				winnerValue = entry.votes;
			}
			choices.push(entry);
		}

		const poll:TwitchatDataTypes.MessagePollData = {
			date:Date.now(),
			id:event.id,
			platform:"twitch",
			channel_id: event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.POLL,
			title: event.title,
			choices,
			duration_s: (new Date(event.ends_at).getTime() - new Date(event.started_at).getTime())/1000,
			started_at: new Date(event.started_at).getTime(),
			ended_at: event.ends_at? new Date(event.ends_at).getTime() : undefined,
			winner,
		};

		const isComplete = topic === "channel.poll.end";
		StoreProxy.poll.setCurrentPoll(poll, isComplete);
		if(isComplete) {
			//Clear poll
			StoreProxy.poll.setCurrentPoll(null);
		}
	}

	private async chatMessageEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ChatMessageEvent):Promise<void> {
		//Ignore reward related messages as they're handled by the reward event
		if(event.channel_points_custom_reward_id) return;

		window.setTimeout(async () => {
			//Check if message is already in the list, otherwise add it as a fallback
			const messageList = StoreProxy.chat.messages;
			for (let index = messageList.length-1; index > Math.max(0, messageList.length-50); index--) {
				//Message found, stop there
				if(messageList[index].id === event.message_id) return
			}
			if(event.cheer) {
				const messageChunks:TwitchatDataTypes.ParseMessageChunk[] = await TwitchUtils.eventsubFragmentsToTwitchatChunks(event.message.fragments, event.broadcaster_user_id);
				const messageHTML = TwitchUtils.messageChunksToHTML(messageChunks);
				const message:TwitchatDataTypes.MessageCheerData = {
					id:event.message_id,
					channel_id:event.broadcaster_user_id,
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.CHEER,
					platform:"twitch",
					user:await StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.chatter_user_id, event.chatter_user_login, event.chatter_user_name),
					message: event.message.text,
					message_chunks: messageChunks,
					message_html: messageHTML,
					message_size: TwitchUtils.computeMessageSize(messageChunks),
					bits: event.cheer.bits,
					pinned:false,
					pinDuration_ms:0,
					pinLevel:0,
				};
				StoreProxy.chat.addMessage(message);
			}else{
				const messageChunks:TwitchatDataTypes.ParseMessageChunk[] = await TwitchUtils.eventsubFragmentsToTwitchatChunks(event.message.fragments, event.broadcaster_user_id);
				const messageHTML = TwitchUtils.messageChunksToHTML(messageChunks);
				const message:TwitchatDataTypes.MessageChatData = {
					id:event.message_id,
					channel_id:event.broadcaster_user_id,
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					platform:"twitch",
					user:await StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.chatter_user_id, event.chatter_user_login, event.chatter_user_name),
					answers: [],
					message: event.message.text,
					message_chunks: messageChunks,
					message_html: messageHTML,
					message_size: TwitchUtils.computeMessageSize(messageChunks),
					is_short:Utils.stripHTMLTags(messageHTML || "").length / (event.message.text.length||1) < .6 || event.message.text.length < 4,
					twitch_source:"eventsub",
				};

				//Check if it's a /me message
				if(/\u0001ACTION .*\u0001/.test(event.message.text)) {
					message.twitch_isSlashMe = true;
				}

				if(event.reply) {
					let messageList = StoreProxy.chat.messages;
					//Search for original message the user answered to
					for (let i = messageList.length-1; i >= Math.max(0, messageList.length-50); i--) {
						let m = messageList[i];
						if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) continue;
						if(m.id === event.reply.parent_message_id) {
							if(m.answersTo) m = m.answersTo;
							if(!m.answers) m.answers = [];
							m.answers.push( message );
							message.answersTo = m;
							break;
						}
					}
				}

				StoreProxy.chat.addMessage(message);
			}
		}, 2000);
	}

	/**
	 * Called when chat is cleared
	 * @param topic
	 * @param event
	 */
	private async chatClearEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ChatClearEvent):Promise<void> {
		const message:TwitchatDataTypes.MessageClearChatData = {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT,
			id:Utils.getUUID(),
			channel_id:event.broadcaster_user_id,
			date:Date.now(),
			fromAutomod:false,
			user: StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.broadcaster_user_id, event.broadcaster_user_login, event.broadcaster_user_name),
		};
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when receiving a whisper
	 * EDIT: not used because it lacks emotes data. We use the IRC whisper event instead
	 */
	private async whisperMessage(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.WhisperEvent):Promise<void> {
		const meID		= StoreProxy.auth.twitch.user.id;
		const sender	= StoreProxy.users.getUserFrom("twitch", meID, event.from_user_id);
		const receiver	= StoreProxy.users.getUserFrom("twitch", meID, event.to_user_id);
		const chunks	= TwitchUtils.parseMessageToChunks(event.whisper.text, undefined, true, "twitch");
		const whisper:TwitchatDataTypes.MessageWhisperData = {
			date:Date.now(),
			id:Utils.getUUID(),
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.WHISPER,
			channel_id:meID,
			user:sender,
			to: receiver,
			message: event.whisper.text,
			message_chunks: chunks,
			message_html: TwitchUtils.messageChunksToHTML(chunks),
			message_size: TwitchUtils.computeMessageSize(chunks),
		}
		StoreProxy.chat.addMessage(whisper);
	}

	/**
	 * Called when bits are used on the channel
	 */
	private async bitsUsed(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.BitsUseEvent):Promise<void> {
		const user = StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name, undefined, undefined, false, undefined, false);
		switch(event.type) {
			case "combo": {
				let debounced =  this.debouncedCombos[user.id];
				if(!debounced) this.debouncedCombos[user.id] = debounced = { bits: 0, to: -1 }
				else window.clearTimeout(debounced.to);
				debounced.bits += event.bits || 0;
				debounced.to = window.setTimeout(() => {
					const m:TwitchatDataTypes.MessageTwitchComboData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id:event.broadcaster_user_id,
						type:TwitchatDataTypes.TwitchatMessageType.TWITCH_COMBO,
						user,
						bits: debounced.bits,
					};
					delete this.debouncedCombos[user.id];
					StoreProxy.chat.addMessage(m);
				}, 5_000);
				break;
			}
			case "power_up": {
				if(event.power_up && event.power_up.type == "celebration") {
					const m:TwitchatDataTypes.MessageTwitchCelebrationData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id:event.broadcaster_user_id,
						type:TwitchatDataTypes.TwitchatMessageType.TWITCH_CELEBRATION,
						user,
						cost: event.bits,
						emoteID: event.power_up.emote.id,
						emoteURL:"https://static-cdn.jtvnw.net/emoticons/v2/" + event.power_up.emote.id + "/default/light/3.0"
					};
					StoreProxy.chat.addMessage(m);
				}else
				if(event.power_up && event.power_up.type == "gigantify_an_emote") {
					const messageChunks:TwitchatDataTypes.ParseMessageChunk[] = await TwitchUtils.eventsubFragmentsToTwitchatChunks(event.message?.fragments || [], event.broadcaster_user_id);
					const messageHTML = TwitchUtils.messageChunksToHTML(messageChunks);
					const m:TwitchatDataTypes.MessageTwitchGigantifiedEmoteData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:"twitch",
						channel_id:event.broadcaster_user_id,
						type:TwitchatDataTypes.TwitchatMessageType.GIGANTIFIED_EMOTE,
						user,
						cost: event.bits,
						emoteID: event.power_up.emote.id,
						emoteURL:"https://static-cdn.jtvnw.net/emoticons/v2/" + event.power_up.emote.id + "/default/light/3.0",
						message:event.message?.text || "",
						message_chunks:messageChunks,
						message_html:messageHTML,
						message_size:0,
					};
					StoreProxy.chat.addMessage(m);
				}
				break;
			}
		}
	}

	/**
	 * Called when a hype train event occurs
	 */
	private async hypeTrainEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.HypeTrainStartEvent | TwitchEventSubDataTypes.HypeTrainProgressEvent | TwitchEventSubDataTypes.HypeTrainEndEvent):Promise<void> {
		const isOwnChannel = event.broadcaster_user_id === StoreProxy.auth.twitch.user.id
		let storeTrain = StoreProxy.stream.hypeTrain;
		if(!isOwnChannel) {
			// Not an event for our own channel, check if we already have data for that
			// channel within our own train data
			storeTrain = storeTrain?.sharedStates? storeTrain.sharedStates[event.broadcaster_user_id] : undefined;
		}
		
		function getConductor(contributors:typeof event.top_contributions, type:typeof event.top_contributions[number]["type"]):TwitchatDataTypes.HypeTrainConductorData|undefined {
			if(!contributors) return undefined;
			const conductor = contributors.find(v=>v.type == type);
			if(!conductor) return undefined;
			return {
				user:StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, conductor.user_id, conductor.user_login, conductor.user_name, undefined, undefined, false, undefined, false),
				amount: conductor.total,
			}
		}
		const dateStart = new Date(event.started_at).getTime();
		const prevLevel = storeTrain?.level || 1;
		const train:TwitchatDataTypes.HypeTrainStateData = {
			channel_id: event.broadcaster_user_id,
			level: event.level,
			currentValue: 0,
			total: event.total || 0,
			goal: storeTrain?.goal || 0,
			approached_at: dateStart,
			started_at: dateStart,
			updated_at: storeTrain?.updated_at || dateStart,
			ends_at: dateStart,
			state: "START",
			type: event.type,
			isSharedTrain: event.is_shared_train,
			allTimeHighLevel: storeTrain?.allTimeHighLevel || Number.MAX_SAFE_INTEGER,
			allTimeHighTotal: storeTrain?.allTimeHighTotal || Number.MAX_SAFE_INTEGER,
			isAllTimeRecord: storeTrain?.isAllTimeRecord || false,
			conductor_bits: getConductor(event.top_contributions, "bits"),
			conductor_subs: getConductor(event.top_contributions, "subscription"),
			sharedStates: storeTrain?.sharedStates || {},
		};
		switch(topic) {
			case TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_START:{
				const typedEvent = event as TwitchEventSubDataTypes.HypeTrainStartEvent;
				train.allTimeHighLevel = typedEvent.all_time_high_level || Number.MAX_SAFE_INTEGER;
				train.allTimeHighTotal = typedEvent.all_time_high_total || Number.MAX_SAFE_INTEGER;
				// DO NOT BREAK THIS CASE
			}
			case TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_PROGRESS: {
				const typedEvent = event as TwitchEventSubDataTypes.HypeTrainProgressEvent;
				train.goal = typedEvent.goal;
				train.state = topic === TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_START? "START" : "PROGRESS";
				train.currentValue = typedEvent.progress;
				train.ends_at = new Date(typedEvent.expires_at).getTime();
				if(prevLevel > 1 && prevLevel < train.level) {
					train.state = "LEVEL_UP";
					train.updated_at = Date.now();
				}
				train.isAllTimeRecord = train.allTimeHighLevel > 1 && typedEvent.level >= train.allTimeHighLevel && typedEvent.total >= train.allTimeHighTotal;
				break;
			}

			case TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_END: {
				const typedEvent = event as TwitchEventSubDataTypes.HypeTrainEndEvent;
				train.state = train.level > 1 ? "COMPLETED" : "EXPIRED";
				train.updated_at = Date.now();
				train.ends_at = new Date(typedEvent.ended_at).getTime();
				break;
			}
		}
		
		if(isOwnChannel) {
			StoreProxy.stream.setHypeTrain(train);
	
			const eventMap:Record<typeof train.state, TwitchatDataTypes.MessageHypeTrainEventData["type"]> = {
				APPROACHING:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_APPROACHING,
				START:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_START,
				PROGRESS:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS,
				LEVEL_UP:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_PROGRESS,
				COMPLETED:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_COMPLETE,
				EXPIRED:TwitchatDataTypes.TwitchatMessageType.HYPE_TRAIN_CANCEL,
			};
	
			const message:TwitchatDataTypes.MessageHypeTrainEventData = {
				channel_id: event.broadcaster_user_id,
				platform:"twitch",
				date: Date.now(),
				id: Utils.getUUID(),
				type: eventMap[train.state],
				train,
				level: train.level,
				percent: Math.round(train.currentValue/train.goal * 100),
			}
			StoreProxy.chat.addMessage(message);
		}else if(!StoreProxy.stream.hypeTrain) {
			// Our own event has not been received yet, delay parsing of this message.
			// This is just a fail safe in case a shared hype train begin event is received
			// for someone else before our own hype train start event.
			setTimeout(() => {
				this.hypeTrainEvent(topic, event);
			}, 1000);
		}else{
			if(!StoreProxy.stream.hypeTrain.sharedStates) StoreProxy.stream.hypeTrain.sharedStates = {};
			StoreProxy.stream.hypeTrain.sharedStates[event.broadcaster_user_id] = train;
		}
	}

}

type HypeTrainEvent = {
	topic:TwitchEventSubDataTypes.SubscriptionStringTypes,
	tt_v:string,
	data:TwitchEventSubDataTypes.HypeTrainStartEvent|TwitchEventSubDataTypes.HypeTrainProgressEvent|TwitchEventSubDataTypes.HypeTrainEndEvent
};

const train_goldenKappa:(string|HypeTrainEvent)[] = [
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.begin","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"all_time_high_level":22,"all_time_high_total":299823,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"42114400","user_login":"vilkrin","user_name":"Vilkrin","type":"bits","total":100}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"42114400","user_login":"vilkrin","user_name":"Vilkrin","type":"bits","total":100},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"42114400","user_login":"vilkrin","user_name":"Vilkrin","type":"bits","total":100}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"42114400","user_login":"vilkrin","user_name":"Vilkrin","type":"bits","total":100},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19200,"progress":0,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19300,"progress":100,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:37 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19300,"progress":100,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:49 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19400,"progress":200,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:49 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19400,"progress":200,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:54 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19900,"progress":700,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:24:54 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":19900,"progress":700,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:27:08 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":20400,"progress":1200,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:27:08 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":20400,"progress":1200,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:27:14 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":20500,"progress":1300,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:27:14 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":20500,"progress":1300,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:27:26 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":21000,"progress":1800,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:27:26 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":21000,"progress":1800,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:27:31 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":21100,"progress":1900,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:27:31 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":21100,"progress":1900,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:28:34 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":23600,"progress":4400,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:28:34 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":23600,"progress":4400,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:29:14 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":23700,"progress":4500,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:29:14 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":23700,"progress":4500,"goal":5900,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","expires_at":"2025-06-15T10:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:29:38 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.end","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":23700,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","ended_at":"2025-06-15T10:29:37.270134755Z","cooldown_ends_at":"2025-06-15T11:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
	"Sun Jun 15 2025 10:29:38 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.end","tt_v":"16.2.4","data":{"id":"07c68e37-74c4-4e45-95ed-8bd8d02148e4","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":23700,"top_contributions":[{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"bits","total":5000},{"user_id":"26060247","user_login":"manmaed","user_name":"manmaed","type":"subscription","total":14000}],"level":8,"shared_train_participants":null,"started_at":"2025-06-15T10:24:37.270134755Z","ended_at":"2025-06-15T10:29:37.270134755Z","cooldown_ends_at":"2025-06-15T11:29:37.270134755Z","type":"golden_kappa","is_shared_train":false}},
]


const train_shared:(string|HypeTrainEvent)[] = [
	"Tue Jun 17 2025 04:00:54 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.begin","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"647389082","broadcaster_user_login":"durssbot","broadcaster_user_name":"DurssBot","total":5400,"progress":2000,"goal":2100,"top_contributions":[],"level":3,"all_time_high_level":1,"all_time_high_total":1100,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:05:53.830536296Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:00:54 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.begin","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":5400,"progress":2000,"goal":2100,"top_contributions":[{"user_id":"647389082","user_login":"durssbot","user_name":"DurssBot","type":"subscription","total":5000},{"user_id":"40203552","user_login":"twitchat","user_name":"Twitchat","type":"bits","total":400}],"level":3,"all_time_high_level":5,"all_time_high_total":7800,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:05:53.830536296Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:00:54 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.begin","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"40203552","broadcaster_user_login":"twitchat","broadcaster_user_name":"Twitchat","total":5400,"progress":2000,"goal":2100,"top_contributions":[],"level":3,"all_time_high_level":1,"all_time_high_total":1000,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:05:53.830536296Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:01:21 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":5500,"progress":0,"goal":2300,"top_contributions":[{"user_id":"40203552","user_login":"twitchat","user_name":"Twitchat","type":"bits","total":400}],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:01:21 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"40203552","broadcaster_user_login":"twitchat","broadcaster_user_name":"Twitchat","total":5500,"progress":0,"goal":2300,"top_contributions":[],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:01:21 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"647389082","broadcaster_user_login":"durssbot","broadcaster_user_name":"DurssBot","total":5500,"progress":0,"goal":2300,"top_contributions":[],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:02:26 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"647389082","broadcaster_user_login":"durssbot","broadcaster_user_name":"DurssBot","total":6000,"progress":500,"goal":2300,"top_contributions":[],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:02:26 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":6000,"progress":500,"goal":2300,"top_contributions":[{"user_id":"40203552","user_login":"twitchat","user_name":"Twitchat","type":"bits","total":400},{"user_id":"647389082","user_login":"durssbot","user_name":"DurssBot","type":"subscription","total":5000}],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:02:26 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"40203552","broadcaster_user_login":"twitchat","broadcaster_user_name":"Twitchat","total":6000,"progress":500,"goal":2300,"top_contributions":[],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:02:41 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"647389082","broadcaster_user_login":"durssbot","broadcaster_user_name":"DurssBot","total":6100,"progress":600,"goal":2300,"top_contributions":[],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:02:41 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":6100,"progress":600,"goal":2300,"top_contributions":[{"user_id":"647389082","user_login":"durssbot","user_name":"DurssBot","type":"subscription","total":5000},{"user_id":"40203552","user_login":"twitchat","user_name":"Twitchat","type":"bits","total":400}],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:02:41 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"40203552","broadcaster_user_login":"twitchat","broadcaster_user_name":"Twitchat","total":6100,"progress":600,"goal":2300,"top_contributions":[],"level":4,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:06:20.604506061Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:03:41 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"40203552","broadcaster_user_login":"twitchat","broadcaster_user_name":"Twitchat","total":8600,"progress":800,"goal":3000,"top_contributions":[],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:08:41.190260325Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:03:41 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":8600,"progress":800,"goal":3000,"top_contributions":[{"user_id":"40203552","user_login":"twitchat","user_name":"Twitchat","type":"bits","total":400},{"user_id":"647389082","user_login":"durssbot","user_name":"DurssBot","type":"subscription","total":5000}],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:08:41.190260325Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:03:41 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"647389082","broadcaster_user_login":"durssbot","broadcaster_user_name":"DurssBot","total":8600,"progress":800,"goal":3000,"top_contributions":[],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:08:41.190260325Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:07:42 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":8800,"progress":1000,"goal":3000,"top_contributions":[{"user_id":"40203552","user_login":"twitchat","user_name":"Twitchat","type":"bits","total":600},{"user_id":"647389082","user_login":"durssbot","user_name":"DurssBot","type":"subscription","total":5000}],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:08:41.190260325Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:07:42 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"40203552","broadcaster_user_login":"twitchat","broadcaster_user_name":"Twitchat","total":8800,"progress":1000,"goal":3000,"top_contributions":[],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:08:41.190260325Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:07:42 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"647389082","broadcaster_user_login":"durssbot","broadcaster_user_name":"DurssBot","total":8800,"progress":1000,"goal":3000,"top_contributions":[],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","expires_at":"2025-06-17T04:08:41.190260325Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:08:42 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.end","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":8800,"top_contributions":[{"user_id":"40203552","user_login":"twitchat","user_name":"Twitchat","type":"bits","total":600},{"user_id":"647389082","user_login":"durssbot","user_name":"DurssBot","type":"subscription","total":5000}],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","ended_at":"2025-06-17T04:08:41.190260325Z","cooldown_ends_at":"2025-06-17T06:08:41.190260325Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:08:42 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.end","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"40203552","broadcaster_user_login":"twitchat","broadcaster_user_name":"Twitchat","total":8800,"top_contributions":[],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","ended_at":"2025-06-17T04:08:41.190260325Z","cooldown_ends_at":"2025-06-17T06:08:41.190260325Z","type":"regular","is_shared_train":true}},
	"Tue Jun 17 2025 04:08:42 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.end","tt_v":"16.2.5","data":{"id":"72f8c818-1c1e-48fe-bfe6-89aa2c2b9565","broadcaster_user_id":"647389082","broadcaster_user_login":"durssbot","broadcaster_user_name":"DurssBot","total":8800,"top_contributions":[],"level":5,"shared_train_participants":[{"broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME"}],"started_at":"2025-06-17T04:00:53.830536296Z","ended_at":"2025-06-17T04:08:41.190260325Z","cooldown_ends_at":"2025-06-17T06:08:41.190260325Z","type":"regular","is_shared_train":true}},
]

const train_treasure:(string|HypeTrainEvent)[] = [
	"Wed Jun 18 2025 13:48:30 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.begin","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1100,"progress":1100,"goal":1600,"top_contributions":[{"user_id":"274598607","user_login":"ananonymousgifter","user_name":"AnAnonymousGifter","type":"subscription","total":500},{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":100}],"level":1,"all_time_high_level":22,"all_time_high_total":299823,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:29.667860052Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:48:30 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1100,"progress":1100,"goal":1600,"top_contributions":[{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500}],"level":1,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:29.667860052Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:48:30 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1100,"progress":1100,"goal":1600,"top_contributions":[{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500},{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":100}],"level":1,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:29.667860052Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:48:54 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1600,"progress":0,"goal":1800,"top_contributions":[{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":100},{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500}],"level":2,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:53.840016973Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:49:07 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1650,"progress":50,"goal":1800,"top_contributions":[{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":150},{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500}],"level":2,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:53.840016973Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:51:22 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1700,"progress":100,"goal":1800,"top_contributions":[{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":200},{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500}],"level":2,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:53.840016973Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:51:39 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1750,"progress":150,"goal":1800,"top_contributions":[{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":250},{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500}],"level":2,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:53.840016973Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:51:49 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1800,"progress":200,"goal":1800,"top_contributions":[{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":300},{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500}],"level":2,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:53.840016973Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:53:04 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.progress","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1850,"progress":250,"goal":1800,"top_contributions":[{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":300},{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500}],"level":2,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","expires_at":"2025-06-18T13:53:53.840016973Z","type":"treasure","is_shared_train":false}},
	"Wed Jun 18 2025 13:53:54 GMT+0000 (Coordinated Universal Time)",
	{"topic":"channel.hype_train.end","tt_v":"16.2.5","data":{"id":"1f1a5dec-191c-4eb6-b132-b51c1870a422","broadcaster_user_id":"MY_UID","broadcaster_user_login":"MY_LOGIN","broadcaster_user_name":"MY_NAME","total":1850,"top_contributions":[{"user_id":"94965475","user_login":"thxace","user_name":"thxace","type":"bits","total":300},{"user_id":"28303175","user_login":"ditaki","user_name":"Ditaki","type":"subscription","total":500}],"level":2,"shared_train_participants":null,"started_at":"2025-06-18T13:48:29.667860052Z","ended_at":"2025-06-18T13:53:53.840016973Z","cooldown_ends_at":"2025-06-18T14:53:53.840016973Z","type":"treasure","is_shared_train":false}},
]