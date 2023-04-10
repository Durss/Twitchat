import StoreProxy from "@/store/StoreProxy";
import { TwitchEventSubDataTypes } from "@/types/twitch/TwitchEventSubDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { LoremIpsum } from "lorem-ipsum";
import Config from "../Config";
import OBSWebsocket from "../OBSWebsocket";
import Utils from "../Utils";
import { TwitchScopes } from "./TwitchScopes";
import TwitchUtils from "./TwitchUtils";

/**
* Created : 02/12/2022 
*/
export default class EventSub {

	private static _instance:EventSub;
	private socket!:WebSocket;
	private oldSocket!:WebSocket;
	private reconnectTimeout!:number;
	private keepalive_timeout_seconds!:number;
	private raidTimeout:number = -1;
	private lastRecentFollowers:TwitchatDataTypes.MessageFollowingData[] = [];
	private connectURL:string = "";
	
	constructor() {
		this.connectURL = Config.instance.TWITCH_EVENTSUB_PATH;
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
			const message = JSON.parse(e.data);
			switch(message.metadata.message_type) {
				case "session_welcome": {
					this.keepalive_timeout_seconds = message.payload.session.keepalive_timeout_seconds;
					if(this.oldSocket) {
						this.cleanupSocket(this.oldSocket);
					}
					if(disconnectPrevious) {
						this.createSubscriptions( message.payload.session.id );
					}
				}

				case "session_keepalive": {
					break;
				}

				case "session_reconnect": {
					this.reconnect(message.payload.session.reconnect_url);
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
			
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = setTimeout(()=>{
				// console.log("EVENTSUB : Session keep alive not received");
				this.connect();
			}, (this.keepalive_timeout_seconds + 5) * 1000);
		};
		
		this.socket.onclose = (event) => {
			//Twitch asked us to reconnect socket at a new URL, which we did
			//but deconnection of the old socket (current one) wasn't done.
			if(event.code == 4004) return;
			
			//Connection was created but we subscribed to no topic, twitch
			//closed the connection
			if(event.code == 4003) return;

			// console.log("EVENTSUB : Closed");
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
	 * Create all eventsub subscriptions
	 */
	private async createSubscriptions(sessionId:string):Promise<void> {
		// console.log("EVENTSUB : Create subscriptions");
		const myUID = StoreProxy.auth.twitch.user.id;
		let uids = [myUID];
		if(Config.instance.debugChans.length > 0) {
			//Subscribe to someone else's infos
			const users = await TwitchUtils.loadUserInfo(undefined, Config.instance.debugChans.filter(v=>v.platform=="twitch").map(v=>v.login));
			uids = uids.concat( users.map(v=> v.id) );
		}

		//Create new event sub subscriptions
		const doneUids:{[key:string]:boolean} = {};
		for (let i = 0; i < uids.length; i++) {
			const uid = uids[i];
			if(doneUids[uid] === true) continue;
			doneUids[uid] = true;
			if(uid == myUID) {
				//These events are available only by the broadcaster
				TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.CHANNEL_UPDATE, "1");
				if(TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.FOLLOW, "2");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.MODERATION_EVENTS])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.BAN, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.UNBAN, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.READ_MODS_AND_BANNED])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.MODERATOR_ADD, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.MODERATOR_REMOVE, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_REDEEM, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_REDEEM_UPDATE, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.MANAGE_POLLS])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.POLL_START, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.POLL_PROGRESS, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.POLL_END, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.MANAGE_PREDICTIONS])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_START, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_PROGRESS, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_LOCK, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.PREDICTION_END, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.READ_HYPE_TRAIN])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_START, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_PROGRESS, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.HYPE_TRAIN_END, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.SHIELD_MODE])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.SHIELD_MODE_STOP, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.SHIELD_MODE_START, "1");
				}
				if(TwitchUtils.hasScopes([TwitchScopes.SHOUTOUT])) {
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.SHOUTOUT_IN, "1");
					TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.SHOUTOUT_OUT, "1");
				}
				
				//Don't need to listen for this event for anyone else but the broadcaster
				TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.RAID, "1", {from_broadcaster_user_id:uid});
				
				//Used by online/offline triggers
				TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.STREAM_ON, "1");
				TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.STREAM_OFF, "1");
				
				//Not using those as IRC does it better
				// if(TwitchUtils.hasScope(TwitchScopes.LIST_SUBS)) {
					// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.SUB, "1");
					// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.SUB_END, "1");
					// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.SUBGIFT, "1");
					// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.RESUB, "1");
				// }

				//Not using this as IRC does it better
				// if(TwitchUtils.hasScope(TwitchScopes.READ_CHEER)) {
					// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.BITS, "1");
				// }
				
				//Don't need it
				// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_CREATE, "1");
				// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_UPDATE, "1");
				// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.REWARD_DELETE, "1");
				// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.GOAL_START, "1");
				// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.GOAL_PROGRESS, "1");
				// TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.GOAL_END, "1");
			}
			//Receive raid
			TwitchUtils.eventsubSubscribe(uid, myUID, sessionId, TwitchEventSubDataTypes.SubscriptionTypes.RAID, "1", {to_broadcaster_user_id:uid});
		}
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
			case TwitchEventSubDataTypes.SubscriptionTypes.RESUB: {
				this.subscriptionEvent(topic, payload.event as TwitchEventSubDataTypes.SubEvent | TwitchEventSubDataTypes.SubRenewEvent);
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

			case TwitchEventSubDataTypes.SubscriptionTypes.RAID: {
				this.raidEvent(topic, payload.event as TwitchEventSubDataTypes.RaidEvent);
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
			user:StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name),
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
	}

	/**
	 * Called when updating stream infos
	 * @param topic 
	 * @param payload 
	 */
	private async updateStreamInfosEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ChannelUpdateEvent):Promise<void> {
		const [streamInfos] = await TwitchUtils.loadCurrentStreamInfo([event.broadcaster_user_id]);

		StoreProxy.stream.currentStreamInfo = {
			title:streamInfos.title,
			category:streamInfos.game_name,
			tags:streamInfos.tags,
			started_at:new Date(streamInfos.started_at).getTime(),
			user: StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.broadcaster_user_id, event.broadcaster_user_login, event.broadcaster_user_name)
		}

		const message:TwitchatDataTypes.MessageStreamInfoUpdate = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
			message:StoreProxy.i18n.t("stream.notification", {TITLE:event.title}),
			noticeId:TwitchatDataTypes.TwitchatNoticeType.STREAM_INFO_UPDATE,
			title:event.title,
			category:event.category_name
		}

		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when someone follows
	 * @param topic 
	 * @param payload 
	 */
	private followEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.FollowEvent):void {
		if(StoreProxy.users.isAFollower("twitch", event.user_id)) return;
		
		const channelId = StoreProxy.auth.twitch.user.id;

		const message:TwitchatDataTypes.MessageFollowingData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id: channelId,
			type:TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
			user: StoreProxy.users.getUserFrom("twitch", channelId, event.user_id, event.user_login, event.user_name, undefined, true),
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
	public subscriptionEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.SubEvent | TwitchEventSubDataTypes.SubRenewEvent):void {
		const sub = event as TwitchEventSubDataTypes.SubEvent;
		const renew = event as TwitchEventSubDataTypes.SubRenewEvent;

		//THIS IS AN UNTESTED DRAFT THAT IS NOT USED AT THE MOMENT BECAUSE IRC DOES IT BETTER

		const channel_id = event.broadcaster_user_id;
		const tier_n = parseInt(event.tier);
		const message:TwitchatDataTypes.MessageSubscriptionData = {
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION,
			id:Utils.getUUID(),
			channel_id,
			date:Date.now(),
			user:StoreProxy.users.getUserFrom("twitch", channel_id, event.user_id, event.user_login, event.user_name),
			tier: isNaN(tier_n)? "prime" : tier_n/1000 as 1|2|3,
			is_gift: sub.is_gift,
			is_giftUpgrade: false,
			is_resub: false,
			months:1,
			streakMonths:-1,
			totalSubDuration:-1,
		}

		if(renew.message) {
			const chunks			= TwitchUtils.parseMessageToChunks(renew.message.text, renew.message.emotes, true);
			message.message			= renew.message.text;
			message.message_chunks	= chunks;
			message.message_html	= TwitchUtils.messageChunksToHTML(chunks);
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when receiving bits
	 * 
	 * @param topic 
	 * @param event 
	 */
	public async bitsEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.BitsEvent):Promise<void> {

		//THIS IS AN UNTESTED DRAFT THAT IS NOT USED AT THE MOMENT

		const channel_id = event.broadcaster_user_id;
		const chunks = TwitchUtils.parseMessageToChunks(event.message, undefined, true);
		await TwitchUtils.parseCheermotes(chunks, channel_id);
		const user = StoreProxy.users.getUserFrom("twitch", channel_id, event.user_id, event.user_login, event.user_name);
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
		}
		StoreProxy.chat.addMessage(message);
	}

	/**
	 * Called when receiving or doing a raid
	 * 
	 * @param topic 
	 * @param event 
	 */
	public async raidEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.RaidEvent):Promise<void> {
		const me = StoreProxy.auth.twitch.user;
		if(event.from_broadcaster_user_id == me.id) {
			//Raid complete
			if(StoreProxy.params.features.stopStreamOnRaid.value === true) {
				clearTimeout(this.raidTimeout)
				this.raidTimeout = setTimeout(() => {
					OBSWebsocket.instance.stopStreaming();
				}, 1000);
			}
			StoreProxy.stream.setRaiding(undefined);
		}else{
			//Raided by someone
			const user = StoreProxy.users.getUserFrom("twitch", event.to_broadcaster_user_id, event.from_broadcaster_user_id, event.from_broadcaster_user_login, event.from_broadcaster_user_name);
			
			//Check current live info
			const [currentStream] = await TwitchUtils.loadCurrentStreamInfo([event.from_broadcaster_user_id]);
			let isLive:boolean = false, title:string = "", category:string = "", duration:number = 0;
			if(currentStream) {
				isLive = true;
				title = currentStream.title;
				category = currentStream.game_name;
				duration = Date.now() - new Date(currentStream.started_at).getTime();
			}else{
				//No current live found, load channel info
				const [chanInfo] = await TwitchUtils.loadChannelInfo([event.from_broadcaster_user_id]);
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
	public banEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.BanEvent):void {
		const bannedUser	= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name)
		const moderator		= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name);
		const m:TwitchatDataTypes.MessageBanData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.BAN,
			user:bannedUser,
			moderator,
		};
		
		if(!event.is_permanent) {
			m.duration_s = Math.round((new Date(event.ends_at).getTime() - new Date(event.banned_at).getTime()) / 1000);
		}
		
		StoreProxy.users.flagBanned("twitch", event.broadcaster_user_id, event.user_id, m.duration_s);
		StoreProxy.chat.addMessage(m);
	}
	
	public unbanEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.UnbanEvent):void {
		const unbannedUser	= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.user_id, event.user_login, event.user_name)
		const moderator		= StoreProxy.users.getUserFrom("twitch", event.broadcaster_user_id, event.moderator_user_id, event.moderator_user_login, event.moderator_user_name);
		const m:TwitchatDataTypes.MessageUnbanData = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			channel_id:event.broadcaster_user_id,
			type:TwitchatDataTypes.TwitchatMessageType.UNBAN,
			user:unbannedUser,
			moderator,
		};
		
		StoreProxy.users.flagUnbanned("twitch", event.broadcaster_user_id, event.user_id);
		StoreProxy.chat.addMessage(m);
	}
	
	public modAddEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ModeratorAddEvent):void {
		//TODO
	}
	
	public modRemoveEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.ModeratorRemoveEvent):void {
		//TODO
	}

	/**
	 * Called when stream starts or stops
	 * @param topic 
	 * @param event 
	 */
	private async streamStartStopEvent(topic:TwitchEventSubDataTypes.SubscriptionStringTypes, event:TwitchEventSubDataTypes.StreamOnlineEvent | TwitchEventSubDataTypes.StreamOfflineEvent):Promise<void> {
		const me = StoreProxy.auth.twitch.user;
		const message:TwitchatDataTypes.MessageStreamOnlineData | TwitchatDataTypes.MessageStreamOfflineData = {
			date:Date.now(),
			id:Utils.getUUID(),
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.STREAM_ONLINE,
			info: {
				tags:[],
				title: "",
				category:"",
				started_at:Date.now(),
				user: StoreProxy.users.getUserFrom("twitch", me.id, event.broadcaster_user_id, event.broadcaster_user_login, event.broadcaster_user_name),
			}
		}

		//Stream online
		if(topic === TwitchEventSubDataTypes.SubscriptionTypes.STREAM_OFF) {
			StoreProxy.stream.setPlaybackState(event.broadcaster_user_id, undefined);
			StoreProxy.stream.setStreamStop(event.broadcaster_user_id);
			((message as unknown) as TwitchatDataTypes.MessageStreamOfflineData).type = TwitchatDataTypes.TwitchatMessageType.STREAM_OFFLINE;
			
		//Stream offline
		}else if(topic === TwitchEventSubDataTypes.SubscriptionTypes.STREAM_ON) {
			//Load stream info
			const [streamInfo] = await TwitchUtils.loadCurrentStreamInfo([event.broadcaster_user_id]);
			if(streamInfo) {
				message.info.started_at = new Date(streamInfo.started_at).getTime();
				message.info.title = streamInfo.title;
				message.info.category = streamInfo.game_name;
				StoreProxy.stream.setStreamStart(event.broadcaster_user_id);
			}
		}
		StoreProxy.chat.addMessage(message);
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
			user		= StoreProxy.users.getUserFrom("twitch", so_in.broadcaster_user_id, so_in.from_broadcaster_user_id, so_in.from_broadcaster_user_login, so_in.from_broadcaster_user_name);
		}else{
			user		= StoreProxy.users.getUserFrom("twitch", so_out.broadcaster_user_id, so_out.to_broadcaster_user_id, so_out.to_broadcaster_user_login, so_out.to_broadcaster_user_name);
			moderator	= StoreProxy.users.getUserFrom("twitch", so_out.broadcaster_user_id, so_out.moderator_user_id, so_out.moderator_user_login, so_out.moderator_user_name);
		}
		
		let title:string = "";
		let category:string = "";
		let [stream] = await TwitchUtils.loadCurrentStreamInfo([user.id]);
		if(!stream) {
			let [channel] = await TwitchUtils.loadChannelInfo([user.id]);
			title = channel.title;
			category = channel.game_name;
		}else{
			title = stream.title;
			category = stream.game_name;
		}
		
		let channel_id = event.broadcaster_user_id;
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

		//If it's a sent shoutout, store it on the history
		if(!received) {
			console.log("ES : Shoutout received");
			let list = StoreProxy.users.shoutoutHistory[channel_id];
			if(!list) list = [];
			let item = list.find(v=>v.done == false && v.user.id === user.id);
			//Set the last SO date of the user
			user.channelInfo[channel_id].lastShoutout = Date.now();
			if(!item) {
				console.log("ES : Create item");
				//No matching item found on the list, push it
				list.push({
					id:Utils.getUUID(),
					done:true,
					user
				})
			}else{
				console.log("ES : Update item", item);
				//Update existing item
				item.done = true;
			}
			StoreProxy.users.shoutoutHistory[channel_id] = list;
		}
	}
	
}