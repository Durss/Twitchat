import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import { TriggerTypes } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiHelper from "@/utils/ApiHelper";
import Config from "@/utils/Config";
import OBSWebsocket from "@/utils/OBSWebsocket";
import Utils from "@/utils/Utils";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { LoremIpsum } from "lorem-ipsum";
import MessengerClientEvent from "./MessengerClientEvent";
import TwitchMessengerClient from "./TwitchMessengerClient";
import YoutubeHelper from "@/utils/youtube/YoutubeHelper";
import EventBus from "@/events/EventBus";
import GlobalEvent from "@/events/GlobalEvent";
/**
* Created : 26/09/2022
*/
export default class MessengerProxy {

	private static _instance:MessengerProxy;

	private joinSpool:{channelId:string, user:TwitchatDataTypes.TwitchatUser}[] = [];
	private leaveSpool:{channelId:string, user:TwitchatDataTypes.TwitchatUser}[] = [];
	private joinSpoolTimeout:number = -1;
	private leaveSpoolTimeout:number = -1;
	private spamInterval:number = -1;

	constructor() {

	}

	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():MessengerProxy {
		if(!MessengerProxy._instance) {
			MessengerProxy._instance = new MessengerProxy();
			MessengerProxy._instance.initialize();
		}
		return MessengerProxy._instance;
	}



	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Sends a message
	 *
	 * @param message
	 * @param targetPlatforms
	 * @param channelId
	 * @return if the message has been sent properly (chat field is cleared if this returns true)
	 */
	public async sendMessage(message:string, targetPlatforms?:TwitchatDataTypes.ChatPlatform[], channelId?:string, replyTo?:TwitchatDataTypes.MessageChatData, noConfirm:boolean = false, sendAsBot:boolean = true):Promise<boolean> {
		if(replyTo) {
			targetPlatforms = [replyTo.platform!];
			channelId = replyTo.channel_id;
		}
		const hasPlatform = targetPlatforms && targetPlatforms.length>0;
		if(!channelId) channelId = StoreProxy.auth.twitch.user.id;

		if(await this.handleTwitchatCommands(message, targetPlatforms, channelId)) return true;

		// console.log("Send message:", message);
		// console.log("          to:", channelId);
		// console.log("          on:", targetPlatforms);
		if(!hasPlatform || targetPlatforms!.indexOf("twitch")>-1) {
			if(await TwitchMessengerClient.instance.sendMessage(channelId, message, replyTo, noConfirm, sendAsBot) === false) {
				return false;
			}
		}
		if(hasPlatform && targetPlatforms!.indexOf("youtube")>-1) {
			if(!YoutubeHelper.instance.sendMessage(message)) {
				return false;
			}
		}
		return true;
	}

	public async connect():Promise<void> {
		TwitchMessengerClient.instance.connectToChannel( StoreProxy.auth.twitch.user.login );
	}

	public disconnect():void {
		TwitchMessengerClient.instance.disconnect();
	}

	public stopSpam():void {
		clearInterval(this.spamInterval);
		StoreProxy.chat.spamingFakeMessages = false;
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.MESSAGE, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.DELETE_MESSAGE, (e:MessengerClientEvent)=> this.onDeleteMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.WHISPER, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.SUB, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.CHEER, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.RAID, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.DISCONNECT, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.CLEAR_CHAT, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.REWARD, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.NOTICE, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.JOIN, (e:MessengerClientEvent)=> this.onJoinLeave(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.LEAVE, (e:MessengerClientEvent)=> this.onJoinLeave(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.CONNECTED, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.DISCONNECTED, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.REFRESH_TOKEN, (e:MessengerClientEvent)=> this.onRefreshToken(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.WATCH_STREAK, (e:MessengerClientEvent)=> this.onMessage(e));
	}

	/**
	 * Called when a new message is received
	 * @param e
	 */
	private onMessage(e:MessengerClientEvent):void {
		if(e.data && typeof e.data != "string") {//Typeof check only here for linting
			StoreProxy.chat.addMessage(e.data);
		}
	}

	/**
	 * Called when a message is deleted
	 */
	private onDeleteMessage(e:MessengerClientEvent):void {
		if(e.data && typeof e.data == "string") {//Typeof check only here for linting
			StoreProxy.chat.deleteMessageByID(e.data, undefined, false);
		}
	}

	/**
	 * Called when users join/leave.
	 * This merges multiple sequential join/leave events in one single message
	 * @param e
	 */
	private onJoinLeave(e:MessengerClientEvent):void {
		const d = e.data as TwitchatDataTypes.MessageJoinData | TwitchatDataTypes.MessageLeaveData;
		if(e.type === MessengerClientEvent.JOIN) {
			for (let i = 0; i < d.users.length; i++) {
				this.joinSpool.push({user:d.users[i], channelId:d.channel_id});
			}

			clearTimeout(this.joinSpoolTimeout);
			this.joinSpoolTimeout = window.setTimeout(()=> {
				const d = e.data! as TwitchatDataTypes.MessageJoinData;

				//Split join events by channels
				const channels:{[key:string]:TwitchatDataTypes.TwitchatUser[]} = {}
				for (let i = 0; i < this.joinSpool.length; i++) {
					const entry = this.joinSpool[i];
					if(!channels[entry.channelId]) channels[entry.channelId] = [];
					channels[entry.channelId].push(entry.user);
				}

				//Send one message per channel
				for (const channel in channels) {
					this.onMessage(new MessengerClientEvent("JOIN", {
						platform:d.platform,
						type:TwitchatDataTypes.TwitchatMessageType.JOIN,
						id:Utils.getUUID(),
						channel_id:channel,
						date:Date.now(),
						users:channels[channel],
					}));
					StoreProxy.users.flagOnlineUsers(channels[channel], channel);
				}

				this.joinSpool = [];
			}, 1000);
		}

		if(e.type === MessengerClientEvent.LEAVE) {
			this.leaveSpool.push({user:d.users[0], channelId:d.channel_id});

			clearTimeout(this.leaveSpoolTimeout);
			this.leaveSpoolTimeout = window.setTimeout(()=> {
				try {
					const d = e.data! as TwitchatDataTypes.MessageJoinData;

					//Split leave events by channels
					const channels:{[key:string]:TwitchatDataTypes.TwitchatUser[]} = {}
					for (let i = 0; i < this.leaveSpool.length; i++) {
						const entry = this.leaveSpool[i];
						if(!channels[entry.channelId]) channels[entry.channelId] = [];
						channels[entry.channelId].push(entry.user);
					}

					//Send one message per channel
					for (const channel in channels) {
						this.onMessage(new MessengerClientEvent("LEAVE", {
							platform:d.platform,
							type:TwitchatDataTypes.TwitchatMessageType.LEAVE,
							id:Utils.getUUID(),
							channel_id:channel,
							date:Date.now(),
							users:channels[channel],
						}));
						StoreProxy.users.flagOfflineUsers(channels[channel], channel);
					}

					this.leaveSpool = [];
				}catch(error) {
					console.error(error);
				}
			}, 1000);
		}
	}

	/**
	 * Called when requesting to refresh auth token
	 */
	private async onRefreshToken(e:MessengerClientEvent):Promise<void> {
		const res = await StoreProxy.auth.twitch_tokenRefresh();
		if(res !== false) {
			TwitchMessengerClient.instance.refreshToken(res.access_token);
		}
	}

	private async handleTwitchatCommands(message:string, targetPlatforms?:TwitchatDataTypes.ChatPlatform[], channelId?:string):Promise<boolean> {

		const params = message.split(/\s/gi).filter(v => v != "");
		const cmd = params.shift()?.toLowerCase();
		params.forEach((v, i) => { params[i] = v.trim() });
		if(!channelId) channelId = StoreProxy.auth.twitch.user.id;
		const isAdmin = StoreProxy.auth.twitch.user.is_admin === true;
		const hasChannelPoints = StoreProxy.auth.twitch.user.is_affiliate || StoreProxy.auth.twitch.user.is_partner;
		const me = StoreProxy.auth.twitch.user;
		let chunks:TwitchatDataTypes.ParseMessageChunk[] = [];

		//Check if the command matches one of the custom slash commands
		//created on the triggers
		const triggerCommands = StoreProxy.triggers.triggerList.filter(v=> v.type == TriggerTypes.SLASH_COMMAND && v.chatCommand);
		for (let i = 0; i < triggerCommands.length; i++) {
			const t = triggerCommands[i];
			if(cmd == t.chatCommand!.toLowerCase()) {
				if(!chunks) chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
				const messageData:TwitchatDataTypes.MessageChatData = {
					platform:"twitch",
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					channel_id:me.id,
					date:Date.now(),
					id:Utils.getUUID(),
					message:message,
					message_chunks:chunks,
					message_html:TwitchUtils.messageChunksToHTML(chunks),
					user:me,
					is_short:false,
					answers:[],
					message_size:0,
				}
				TriggerActionHandler.instance.executeTrigger(t, messageData, false, t.chatCommand);
				return true;
			}
		}

		if(cmd == "/devmode") {
			StoreProxy.main.toggleDevMode();
			return true;
		}else

		if(cmd == "/countdown") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "countdown" && v.isDefault)!;
			const duration = this.paramsToDuration(params[0]);
			entry.duration_ms = duration * 1000;
			StoreProxy.timers.timerStart(entry.id);
			return true;
		}else

		if(cmd == "/countdownadd") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "countdown" && v.isDefault)!;
			const duration = this.paramsToDuration(params[0]);
			StoreProxy.timers.timerAdd(entry.id, duration * 1000);
			return true;
		}else

		if(cmd == "/countdownremove") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "countdown" && v.isDefault)!;
			const duration = this.paramsToDuration(params[0]);
			StoreProxy.timers.timerRemove(entry.id, duration * 1000);
			return true;
		}else

		if(cmd == "/countdownpause") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "countdown" && v.isDefault)!;
			StoreProxy.timers.timerPause(entry.id);
			return true;
		}else

		if(cmd == "/countdownunpause") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "countdown" && v.isDefault)!;
			StoreProxy.timers.timerUnpause(entry.id);
			return true;
		}else

		if(cmd == "/countdownstop") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "countdown" && v.isDefault)!;
			StoreProxy.timers.timerStop(entry.id);
			return true;
		}else

		if(cmd == "/timerstart") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "timer" && v.isDefault)!;
			StoreProxy.timers.timerStart(entry.id);
			return true;
		}else

		if(cmd == "/timeradd") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "timer" && v.isDefault)!;
			const duration = this.paramsToDuration(params[0]);
			StoreProxy.timers.timerAdd(entry.id, duration * 1000);
			return true;
		}else

		if(cmd == "/timerremove") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "timer" && v.isDefault)!;
			const duration = this.paramsToDuration(params[0]);
			StoreProxy.timers.timerRemove(entry.id, duration * 1000);
			return true;
		}else

		if(cmd == "/timerpause") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "timer" && v.isDefault)!;
			StoreProxy.timers.timerPause(entry.id);
			return true;
		}else

		if(cmd == "/timerunpause") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "timer" && v.isDefault)!;
			StoreProxy.timers.timerUnpause(entry.id);
			return true;
		}else

		if(cmd == "/timerstop") {
			const entry = StoreProxy.timers.timerList.find(v=>v.type == "timer" && v.isDefault)!;
			StoreProxy.timers.timerStop(entry.id);
			return true;
		}else

		if(cmd == "/suggestion") {
			StoreProxy.params.openModal("chatsuggForm")
			return true;
		}else

		if(cmd == "/__logmessages__") {
			console.log(StoreProxy.chat.messages)
			return true;
		}else

		if(cmd == "/__stopobsstream__") {
			OBSWebsocket.instance.stopStreaming();
			return true;
		}else

		if(cmd == "/raid" && (!params[0] || params[0] == "user")) {
			if(TwitchUtils.requestScopes([TwitchScopes.START_RAID,
			TwitchScopes.BLOCKED_TERMS,
			TwitchScopes.SET_ROOM_SETTINGS,
			TwitchScopes.UNBAN_REQUESTS,
			TwitchScopes.EDIT_BANNED,
			TwitchScopes.DELETE_MESSAGES,
			TwitchScopes.CHAT_WARNING,
			TwitchScopes.READ_MODERATORS,
			TwitchScopes.READ_VIPS])) {
				//If starting a raid with /raid without specifying a user
				//open live followings list
				StoreProxy.params.openModal("liveStreams")
				return true;
			}
		}else

		if(cmd == "/poll") {
			if(TwitchUtils.requestScopes([TwitchScopes.MANAGE_POLLS]) && hasChannelPoints) {
				//Open poll form
				const title = params.join(" ");
				if(title != "title") {
					StoreProxy.main.tempStoreValue = title;
				}
				StoreProxy.params.openModal("poll")
				return true;
			}
		}else

		if(cmd == "/prediction") {
			if(TwitchUtils.requestScopes([TwitchScopes.MANAGE_PREDICTIONS]) && hasChannelPoints) {
				//Open prediction form
				const title = params.join(" ");
				if(title != "title") {
					StoreProxy.main.tempStoreValue = title;
				}
				StoreProxy.params.openModal("pred")
				return true;
			}
		}else

		if(cmd == "/raffle") {
			//Open raffle form
			StoreProxy.params.openModal("raffle")
			return true
		}else

		// Check for queue-specific commands first
		for(const queue of StoreProxy.queue.queueList) {
			if(queue.commands?.join && cmd === queue.commands.join.toLowerCase()) {
				// Handle custom join command
				const messageObj:TwitchatDataTypes.MessageChatData = {
					id: Utils.getUUID(),
					type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					date: Date.now(),
					platform: "twitch",
					channel_id: channelId,
					user: me,
					message: message,
					message_html: message,
					is_short: false,
					message_chunks: chunks,
					message_size: 0,
					answers: [],
				};
				await this.handleQueueJoin(queue, messageObj, StoreProxy.users.getUserFrom("twitch", channelId, channelId, me.login, me.login));
				return false; // Allow message to be sent to chat
			}
			if(queue.commands?.leave && cmd === queue.commands.leave.toLowerCase()) {
				// Handle custom leave command
				const messageObj:TwitchatDataTypes.MessageChatData = {
					id: Utils.getUUID(),
					type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					date: Date.now(),
					platform: "twitch",
					channel_id: channelId,
					user: me,
					message: message,
					message_html: message,
					is_short: false,
					message_chunks: chunks,
					message_size: 0,
					answers: [],
				};
				await this.handleQueueLeave(queue, messageObj, StoreProxy.users.getUserFrom("twitch", channelId, channelId, me.login, me.login));
				return false; // Allow message to be sent to chat
			}
		}

		if(cmd == "/queuepause") {
			//Pause a queue
			const queueRef = params.join(" ").trim();
			if(!queueRef) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_pause_usage");
				this.sendChatMessage(channelId, msg || "Usage: /queuepause {queue name, id or placeholder}");
				return true;
			}
			
			const queue = this.findQueue(queueRef);
			if(!queue) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_not_found", {queue: queueRef});
				this.sendChatMessage(channelId, msg || `Queue "${queueRef}" not found.`);
				return true;
			}
			
			StoreProxy.queue.pauseQueue(queue.id);
			const msg = StoreProxy.i18n.t("chat.commands.queue_paused", {queue: queue.title});
			this.sendChatMessage(channelId, msg || `Queue "${queue.title}" has been paused.`, queue.id, queue.title);
			return true;
		}else

		if(cmd == "/queueresume") {
			//Resume a queue
			const queueRef = params.join(" ").trim();
			if(!queueRef) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_resume_usage");
				this.sendChatMessage(channelId, msg || "Usage: /queueresume {queue name, id or placeholder}");
				return true;
			}
			
			const queue = this.findQueue(queueRef);
			if(!queue) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_not_found", {queue: queueRef});
				this.sendChatMessage(channelId, msg || `Queue "${queueRef}" not found.`);
				return true;
			}
			
			StoreProxy.queue.resumeQueue(queue.id);
			const msg = StoreProxy.i18n.t("chat.commands.queue_resumed", {queue: queue.title});
			this.sendChatMessage(channelId, msg || `Queue "${queue.title}" has been resumed.`, queue.id, queue.title);
			return true;
		}else

		if(cmd == "/queueclear") {
			//Clear queue, in-progress list, or removed list
			const queueRef = params[0];
			const listType = params[1]?.toLowerCase() || "queue";
			
			if(!queueRef) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_clear_usage");
				this.sendChatMessage(channelId, msg || "Usage: /queueclear {queue} [queue|progress|removed]");
				return true;
			}
			
			const queue = this.findQueue(queueRef);
			if(!queue) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_not_found", {queue: queueRef});
				this.sendChatMessage(channelId, msg || `Queue "${queueRef}" not found.`);
				return true;
			}
			
			if(listType === "removed") {
				// Emit event to clear removed users list
				EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.QUEUE_CLEAR_REMOVED, {
					queueId: queue.id
				}));
				const msg = StoreProxy.i18n.t("chat.commands.queue_removed_cleared", {queue: queue.title});
				this.sendChatMessage(channelId, msg || `Removed users list for "${queue.title}" has been cleared.`, queue.id, queue.title);
			} else if(listType === "progress" || listType === "inprogress") {
				StoreProxy.queue.clearInProgress(queue.id);
				const msg = StoreProxy.i18n.t("chat.commands.queue_progress_cleared", {queue: queue.title});
				this.sendChatMessage(channelId, msg || `In-progress list of "${queue.title}" has been cleared.`, queue.id, queue.title);
			} else {
				StoreProxy.queue.clearQueue(queue.id);
				const msg = StoreProxy.i18n.t("chat.commands.queue_cleared", {queue: queue.title});
				this.sendChatMessage(channelId, msg || `Queue "${queue.title}" has been cleared.`, queue.id, queue.title);
			}
			return true;
		}else

		if(cmd == "/queuepick") {
			//Pick a user from queue
			const queueRef = params[0];
			const mode = params[1]?.toLowerCase() || "first";
			
			if(!queueRef) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_pick_usage");
				this.sendChatMessage(channelId, msg || "Usage: /queuepick {queue} [first|random]");
				return true;
			}
			
			const queue = this.findQueue(queueRef);
			if(!queue) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_not_found", {queue: queueRef});
				this.sendChatMessage(channelId, msg || `Queue "${queueRef}" not found.`);
				return true;
			}
			
			if(queue.entries.length === 0) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_empty", {queue: queue.title});
				this.sendChatMessage(channelId, msg || `Queue "${queue.title}" is empty.`, queue.id, queue.title);
				return true;
			}
			
			let pickedUser:TwitchatDataTypes.TwitchatUser;
			
			if(queue.inProgressEnabled) {
				// Use the store methods which handle in-progress
				try {
					if(mode === "random") {
						pickedUser = StoreProxy.queue.pickRandomUser(queue.id);
						const msg = StoreProxy.i18n.t("chat.commands.queue_picked_random", {queue: queue.title, user: pickedUser.displayName});
						this.sendChatMessage(channelId, msg || `Randomly picked ${pickedUser.displayName} from "${queue.title}".`, queue.id, queue.title);
					} else {
						pickedUser = StoreProxy.queue.pickFirstUser(queue.id);
						const msg = StoreProxy.i18n.t("chat.commands.queue_picked_first", {queue: queue.title, user: pickedUser.displayName});
						this.sendChatMessage(channelId, msg || `Picked ${pickedUser.displayName} from "${queue.title}" (first in line).`, queue.id, queue.title);
					}
				} catch(error) {
					const msg = StoreProxy.i18n.t("chat.commands.queue_empty", {queue: queue.title});
					this.sendChatMessage(channelId, msg || `Queue "${queue.title}" is empty.`, queue.id, queue.title);
				}
			} else {
				// Handle manual removal when in-progress is disabled
				let entry: TwitchatDataTypes.QueueEntry;
				if(mode === "random") {
					const randomIndex = Math.floor(Math.random() * queue.entries.length);
					entry = queue.entries.splice(randomIndex, 1)[0];
				} else {
					entry = queue.entries.shift()!;
				}
				
				pickedUser = entry.user;
				
				// Emit event so QueueState can add to removedUsers
				EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.QUEUE_USER_REMOVED, {
					queueId: queue.id,
					entry: entry
				}));
				
				// Save the changes
				StoreProxy.queue.saveData();
				StoreProxy.queue.broadcastStates(queue.id);
				
				const msg = mode === "random"
					? StoreProxy.i18n.t("chat.commands.queue_picked_random", {queue: queue.title, user: pickedUser.displayName})
					: StoreProxy.i18n.t("chat.commands.queue_picked_first", {queue: queue.title, user: pickedUser.displayName});
				this.sendChatMessage(channelId, msg || `Picked ${pickedUser.displayName} from "${queue.title}".`, queue.id, queue.title);
			}
			return true;
		}else

		if(cmd == "/queuemove") {
			//Move user from queue to in-progress
			const queueRef = params[0];
			const username = params[1]?.toLowerCase();
			
			if(!queueRef || !username) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_move_usage");
				this.sendChatMessage(channelId, msg || "Usage: /queuemove {queue} {user}");
				return true;
			}
			
			const queue = this.findQueue(queueRef);
			if(!queue) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_not_found", {queue: queueRef});
				this.sendChatMessage(channelId, msg || `Queue "${queueRef}" not found.`);
				return true;
			}
			
			if(!queue.inProgressEnabled) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_no_progress", {queue: queue.title});
				this.sendChatMessage(channelId, msg || `Queue "${queue.title}" doesn't have in-progress list enabled.`, queue.id, queue.title);
				return true;
			}
			
			// Find user in queue
			const entry = queue.entries.find(e => e.user.login.toLowerCase() === username || e.user.displayName.toLowerCase() === username.toLowerCase());
			if(!entry) {
				const msg = StoreProxy.i18n.t("chat.commands.user_not_in_queue", {user: username, queue: queue.title});
				this.sendChatMessage(channelId, msg || `User "${username}" is not in queue "${queue.title}".`, queue.id, queue.title);
				return true;
			}
			
			StoreProxy.queue.moveToInProgress(queue.id, entry.user.id);
			const msg = StoreProxy.i18n.t("chat.commands.queue_moved_progress", {user: entry.user.displayName, queue: queue.title});
			this.sendChatMessage(channelId, msg || `Moved ${entry.user.displayName} to in-progress for queue "${queue.title}".`, queue.id, queue.title);
			return true;
		}else

		if(cmd == "/queueremove") {
			//Remove user from queue or in-progress
			const queueRef = params[0];
			const username = params[1]?.toLowerCase();
			const listType = params[2]?.toLowerCase() || "queue";
			
			if(!queueRef || !username) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_remove_usage");
				this.sendChatMessage(channelId, msg || "Usage: /queueremove {queue} {user} [queue|progress|all]");
				return true;
			}
			
			const queue = this.findQueue(queueRef);
			if(!queue) {
				const msg = StoreProxy.i18n.t("chat.commands.queue_not_found", {queue: queueRef});
				this.sendChatMessage(channelId, msg || `Queue "${queueRef}" not found.`);
				return true;
			}
			
			// Find user in appropriate list
			let user:TwitchatDataTypes.TwitchatUser|undefined;
			let removed = false;
			
			if(listType === "all") {
				// Remove from both lists
				const queueEntry = queue.entries.find(e => e.user.login.toLowerCase() === username || e.user.displayName.toLowerCase() === username.toLowerCase());
				const progressEntry = queue.inProgress?.find(e => e.user.login.toLowerCase() === username || e.user.displayName.toLowerCase() === username.toLowerCase());
				
				if(queueEntry) {
					user = queueEntry.user;
					StoreProxy.queue.removeViewerFromQueue(queue.id, queueEntry.user.id);
					removed = true;
				}
				if(progressEntry) {
					user = progressEntry.user;
					StoreProxy.queue.removeViewerFromInProgress(queue.id, progressEntry.user.id);
					removed = true;
				}
				
				if(removed && user) {
					const msg = StoreProxy.i18n.t("chat.commands.queue_removed_all", {user: user.displayName, queue: queue.title});
					this.sendChatMessage(channelId, msg || `Removed ${user.displayName} from all lists in queue "${queue.title}".`, queue.id, queue.title);
				} else {
					const msg = StoreProxy.i18n.t("chat.commands.user_not_found", {user: username, queue: queue.title});
					this.sendChatMessage(channelId, msg || `User "${username}" not found in queue "${queue.title}".`, queue.id, queue.title);
				}
			} else if(listType === "progress" || listType === "inprogress") {
				// Remove from in-progress only
				const entry = queue.inProgress?.find(e => e.user.login.toLowerCase() === username || e.user.displayName.toLowerCase() === username.toLowerCase());
				if(entry) {
					StoreProxy.queue.removeViewerFromInProgress(queue.id, entry.user.id);
					const msg = StoreProxy.i18n.t("chat.commands.queue_removed_progress", {user: entry.user.displayName, queue: queue.title});
					this.sendChatMessage(channelId, msg || `Removed ${entry.user.displayName} from in-progress list in queue "${queue.title}".`, queue.id, queue.title);
				} else {
					const msg = StoreProxy.i18n.t("chat.commands.user_not_in_progress", {user: username, queue: queue.title});
					this.sendChatMessage(channelId, msg || `User "${username}" not found in in-progress list for queue "${queue.title}".`, queue.id, queue.title);
				}
			} else {
				// Remove from queue only (default)
				const entry = queue.entries.find(e => e.user.login.toLowerCase() === username || e.user.displayName.toLowerCase() === username.toLowerCase());
				if(entry) {
					StoreProxy.queue.removeViewerFromQueue(queue.id, entry.user.id);
					const msg = StoreProxy.i18n.t("chat.commands.queue_removed", {user: entry.user.displayName, queue: queue.title});
					this.sendChatMessage(channelId, msg || `Removed ${entry.user.displayName} from queue "${queue.title}".`, queue.id, queue.title);
				} else {
					const msg = StoreProxy.i18n.t("chat.commands.user_not_in_queue", {user: username, queue: queue.title});
					this.sendChatMessage(channelId, msg || `User "${username}" not found in queue "${queue.title}".`, queue.id, queue.title);
				}
			}
			return true;
		}else

		if(cmd == "/search") {
			//Search a for messages
			const search = params.join(" ");
			// this.$emit("search", search);
			StoreProxy.chat.doSearchMessages(search);
			StoreProxy.params.openModal("search", true);
			return true;
		}else

		if(cmd == "/pin") {
			StoreProxy.common.alert(StoreProxy.i18n.t("error.cmd_missing_api"));
			return true;
		}else

		if(cmd == "/so" || cmd == "/shoutout") {
			//Make a shoutout
			await StoreProxy.users.getUserFrom("twitch", channelId, undefined, params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim(), undefined, async (user)=> {
				await StoreProxy.users.shoutout(StoreProxy.stream.currentChatChannel.id, user);
			});
			return true;
		}else

		if(cmd == "/updates") {
			// StoreProxy.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.UPDATES);
			StoreProxy.params.openModal("updates");
			return true;
		}else

		if(cmd == "/tip") {
			StoreProxy.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
			return true;
		}else

		if(cmd == "/snooze") {
			TwitchUtils.snoozeNextAd();
			return true;
		}else

		if(cmd == "/userinfo" || cmd == "/user") {
			if(!params[0]) {
				const notice:TwitchatDataTypes.MessageNoticeData = {
					id:Utils.getUUID(),
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					platform:"twitchat",
					noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
					message:StoreProxy.i18n.t("error.user_param_missing"),
					channel_id:channelId
				}
				StoreProxy.chat.addMessage(notice);
			}else{
				let username = params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim();
				if(params.length > 1) {
					const channelRef = await StoreProxy.users.getUserFrom("twitch", channelId, undefined, params[1]);
					channelId = channelRef.id;
				}
				const user = await StoreProxy.users.getUserFrom("twitch", channelId, undefined, username);
				StoreProxy.users.openUserCard( user, channelId, "twitch");
			}
			return true;
		}else

		if(cmd == "/userfromid") {
			const res = await TwitchUtils.getUserInfo([params[0]]);
			if(res.length === 0) {
				StoreProxy.common.alert( StoreProxy.i18n.t("error.user_param_not_found", {USER:"<mark>"+params[0]+"</mark>"}) );
			}else{
				const userInfo = res[0];
				const user = StoreProxy.users.getUserFrom("twitch", me.id, userInfo.id, userInfo.login, userInfo.display_name);
				StoreProxy.users.openUserCard(user, channelId, "twitch");
			}
			return true;
		}

		if(cmd == "/logself") {
			console.log(me);
			return true;
		}else

		if(cmd == "/ttsoff" || cmd == "/tts") {
			const username = params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim();
			try {
				const res = await TwitchUtils.getUserInfo(undefined, [username]);
				if(res.length == 0) {
					const notice:TwitchatDataTypes.MessageNoticeData = {
						id:Utils.getUUID(),
						date:Date.now(),
						type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
						platform:"twitchat",
						noticeId:TwitchatDataTypes.TwitchatNoticeType.ERROR,
						message:StoreProxy.i18n.t("error.user_param_not_found", {USER:"<mark>"+username+"</mark>"}),
						channel_id:channelId
					}
					StoreProxy.chat.addMessage(notice);
				}else{
					const user = StoreProxy.users.getUserFrom("twitch", channelId, res[0].id, res[0].login, res[0].display_name, undefined, undefined, false, undefined, false);
					StoreProxy.tts.ttsReadUser(user, cmd == "/tts");
				}
			}catch(error) {}
			return true;
		}else

		if(isAdmin && cmd == "/logusers") {
			console.log(StoreProxy.users.users);
			return true;
		}else

		if(isAdmin && cmd == "/betaadd") {
			StoreProxy.admin.addBetaUser(params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim());
			return true;
		}else

		if(isAdmin && cmd == "/betadel") {
			StoreProxy.admin.removeBetaUser(params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim());
			return true;
		}else

		if(isAdmin && cmd == "/betaclose") {
			StoreProxy.admin.removeAllBetaUser();
			return true;
		}else

		if(isAdmin && cmd == "/betamigrate") {
			StoreProxy.admin.migrateUserDataToProd(params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim());
			return true;
		}else

		if(isAdmin && cmd == "/giftpremium") {
			StoreProxy.admin.giftPremium(params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim());
			return true;
		}else

		if(isAdmin && cmd == "/ungiftpremium") {
			StoreProxy.admin.ungiftPremium(params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim());
			return true;
		}else

		if(isAdmin && cmd == "/userlist") {
			StoreProxy.params.openModal("TTuserList")
			return true;
		}else

		if(cmd == "/streamsummary") {
			StoreProxy.params.openModal("streamSummary");
			return true;
		}else

		if(cmd == "/greetduration") {
			const duration = this.paramsToDuration(params[0]);
			StoreProxy.params.setGreetThemAutoDelete(duration);
			return true;
		}else

		if(cmd == "/startraffle") {
			const list = StoreProxy.raffle.raffleList;
			if(list.length == 0) return true;
			await StoreProxy.raffle.pickWinner(list[0].sessionId || "");
			return true;
		}else

		if(cmd == "/clearobscache") {
			await OBSWebsocket.instance.clearSourceTransformCache();
			return true;
		}else

		if(cmd == "/setstreamtitle") {
			await TwitchUtils.setStreamInfos(channelId, params.join(" "));
			return true;
		}else

		if(cmd == "/setstreamcategory") {
			const categories = await TwitchUtils.searchCategory(params.join(" "));
			if(categories.length > 0) {
				await TwitchUtils.setStreamInfos(channelId, undefined, categories[0].id);
			}
			return true;
		}else

		if(cmd == "/setstreamtags") {
			const tags = params.map(v=>
				Utils.replaceDiacritics(v).replace(/[^a-z0-9]/gi, "").substring(0, 25).trim()
			)
			.filter(v => v.length > 0);
			await TwitchUtils.setStreamInfos(channelId, undefined, undefined, tags);
			return true;
		}else

		if(cmd == "/bingo") {
			//Open bingo form
			const payload:TwitchatDataTypes.BingoConfig = {
				guessNumber: false,
				guessEmote: false,
				guessCustom: false,
				genericValue: "",
				min: 0,
				max: 100,
			};
			if(params[0] == "number") {
				if(params.length < 3
				|| parseInt(params[1]).toString() != params[1]
				|| parseInt(params[2]).toString() != params[2]){
					StoreProxy.common.alert(StoreProxy.i18n.t('error.invalid_bingo'));
					return false;
				}else{
					payload.guessNumber = true;
					payload.min = Math.min(parseInt(params[1]), parseInt(params[2]));
					payload.max = Math.max(parseInt(params[1]), parseInt(params[2]));
				}

			}else if(params[0] == "emote") {
				payload.guessEmote = true;

			}else if(params[0] == "custom") {
				if(params.length < 2) {
					StoreProxy.common.alert(StoreProxy.i18n.t('error.invalid_bingo'));
					return false;
				}
				if(params.length > 2 && parseInt(params[1]).toString() === params[1]) {
					payload.customValueTolerance = Math.min(5, Math.max(0, parseInt(params[1]))) ?? 3;
					payload.customValue = params.slice(2).join(" ");
				}else{
					payload.customValueTolerance = 3;
					payload.customValue = params.slice(1).join(" ");
				}
				payload.guessCustom = true;
			}else {
				StoreProxy.common.alert(StoreProxy.i18n.t('error.invalid_bingo'));
				return false;
			}

			StoreProxy.bingo.startBingo(payload);
			return true;
		}else

		if(cmd == "/discord") {
			const discordChan = StoreProxy.discord.chatCmdTarget;
			if(discordChan) {
				let error = "";
				const messageToSend = params.join(" ").trim();
				if(messageToSend.length == 0) {
					error = StoreProxy.i18n.t("error.discord.EMPTY_MESSAGE");
				}else{
					const res = await ApiHelper.call("discord/message", "POST", {message:messageToSend, channelId:discordChan});
					if(res.status != 200) {
						switch(res.json.errorCode) {
							case "POST_FAILED":
								error = StoreProxy.i18n.t("error.discord.POST_FAILED", {CHANNEL:res.json.channelName});
								break;
							case "MISSING_ACCESS":
								error = StoreProxy.i18n.t("error.discord.MISSING_ACCESS", {CHANNEL:res.json.channelName});
								break;
							case "UNKNOWN_CHANNEL":
								error = StoreProxy.i18n.t("error.discord.UNKNOWN_CHANNEL", {CHANNEL:res.json.channelName});
								break;
							default:
								error = StoreProxy.i18n.t("error.discord.UNKNOWN");
								break;
						}
					}
				}
				if(error) {
					const message:TwitchatDataTypes.MessageCustomData = {
						date:Date.now(),
						id:Utils.getUUID(),
						channel_id:channelId,
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
						message: error,
						style: "error",
						icon: "alert",
					};
					StoreProxy.chat.addMessage(message);
				}
				return true;
			}
		}else

		if(isAdmin && cmd == "/fakeso" || cmd == "/fakeshoutout") {
			const fakeUsers = await TwitchUtils.getFakeUsers();
			let user = Utils.pickRand(fakeUsers);
			if(params[0] && params[0] != "true" && params[0] != "false") {
				user = await StoreProxy.users.getUserFrom("twitch", channelId, undefined, params[0]);
				if(!user) return true;
			}
			const done = params[0] === "true" || params[1] === "true";
			if(done) user.channelInfo[channelId].lastShoutout = Date.now();
			const userInfos = await TwitchUtils.getUserInfo([user.id]);
			user.avatarPath = userInfos[0].profile_image_url;
			if(!StoreProxy.users.pendingShoutouts[channelId]) {
				StoreProxy.users.pendingShoutouts[channelId] = [];
			}
			StoreProxy.users.pendingShoutouts[channelId]!.push({
				id:Utils.getUUID(),
				user,
				executeIn:0
			})
			return true;
		}else

		if(isAdmin && cmd == "/fakesolist") {
			const fakeUsers = await TwitchUtils.getFakeUsers();
			for (let i = 0; i < 10; i++) {
				const user = Utils.pickRand(fakeUsers);
				const userInfos = await TwitchUtils.getUserInfo([user.id]);
				user.avatarPath = userInfos[0].profile_image_url;
				if(!StoreProxy.users.pendingShoutouts[channelId]) {
					StoreProxy.users.pendingShoutouts[channelId] = [];
					//Set the SO date offset for this user to now
					user.channelInfo[channelId].lastShoutout = Date.now();
				}
				StoreProxy.users.pendingShoutouts[channelId]!.push({
					id:Utils.getUUID(),
					user,
					executeIn:0
				})
			}
			return true;
		}else

		if(isAdmin && cmd == "/fake") {
			let forcedMessage = params.join(" ");

			const lorem = new LoremIpsum({wordsPerSentence: { max: 8, min: 1 }});
			const message = lorem.generateSentences(Math.round(Math.random()*2) + 1);
			forcedMessage = forcedMessage.replace(/\{LOREM\}/gi, message);
			await StoreProxy.debug.sendRandomFakeMessage<TwitchatDataTypes.ChatMessageTypes>(true, forcedMessage, (m)=>{
				if(Config.instance.DEMO_MODE) m.fake = false;
			});
			return true;
		}else

		if(cmd == "/simulatechat" || cmd == "/spam" || cmd == "/megaspam") {

			clearInterval(this.spamInterval);

			const incMode = params[0] == "inc";
			let count = parseInt(params[0]);
			const countMode = params.length > 0 && count.toString().length == params[0].length;
			let spamDelay = cmd == "/megaspam"? 50 : 200;
			//Check if spamming only a specific count of messages
			if(countMode) {
				params.splice(0, 1);
				spamDelay = 300;
			}
			const channelSources:TwitchatDataTypes.AbstractTwitchatMessage["channelSource"][] = [];

			//Check if forcing a specific reward redeem
			let forcedType:TwitchatDataTypes.TwitchatMessageStringType|undefined = countMode? TwitchatDataTypes.TwitchatMessageType.MESSAGE : undefined;
			if(params[0] === "reward") {
				forcedType = TwitchatDataTypes.TwitchatMessageType.REWARD;
				spamDelay = 500;
				params.shift();
			}
			if(params[0] === "follow") {
				forcedType = TwitchatDataTypes.TwitchatMessageType.FOLLOWING;
				spamDelay = 500;
				params.shift();
			}
			if(params[0] === "shared") {
				const users = await TwitchUtils.getFakeUsers();
				channelSources.push({
					color:"#e04e00",
					name:users[0].displayName,
					pic:users[0].avatarPath,
				});
				channelSources.push({
					color:"#2eb200",
					name:users[1].displayName,
					pic:users[1].avatarPath,
				});
				params.shift();
			}

			const forcedMessage = params.join(" ");
			let inc = 0;
			StoreProxy.chat.spamingFakeMessages = !countMode;

			this.spamInterval = window.setInterval(()=> {
				if(incMode) {
					StoreProxy.debug.simulateMessage<TwitchatDataTypes.MessageChatData>(TwitchatDataTypes.TwitchatMessageType.MESSAGE, (m)=>{
						if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
							m.message = "Message "+(inc++);
							m.message_chunks = TwitchUtils.parseMessageToChunks(m.message);
							m.message_html = m.message;
							m.message_size = TwitchUtils.computeMessageSize(m.message_chunks);
							m.twitch_isFirstMessage = false;
							m.twitch_isSuspicious = false;
						}
					});

				}else{
					if(countMode && count == 1) {
						clearInterval(this.spamInterval);
						count --;
					}
					const lorem = new LoremIpsum({wordsPerSentence: { max: 8, min: 1 }});
					const message = lorem.generateSentences(Math.round(Math.random()*2) + 1);
					StoreProxy.debug.sendRandomFakeMessage<TwitchatDataTypes.ChatMessageTypes>(true, forcedMessage.replace(/\{LOREM\}/gi, message), (m)=>{
						//Force a specific reward via "/spam reward {REWARD_ID}"
						if(m.type == TwitchatDataTypes.TwitchatMessageType.REWARD
						&& forcedType == TwitchatDataTypes.TwitchatMessageType.REWARD) {
							const rewardId = params[1];
							const reward = StoreProxy.rewards.rewardList.find(v=>v.id == rewardId);
							if(reward) {
								m.reward = {
									color: reward.background_color,
									cost: reward.cost,
									description: reward.prompt,
									icon: {
										sd: reward.image!.url_1x,
										hd: reward.image!.url_4x,
									},
									id: rewardId,
									title: reward.title
								}
							}
						}
						if(channelSources.length> 0) {
							m.channelSource = Utils.pickRand(channelSources);
						}
					}, forcedType);
				}
			}, spamDelay);
			return true;
		}else

		if(cmd == "/alertstreamer") {
			//Execute alert
			message = message.replace(/\/alertstreamer\s*/gi, "");
			const chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
			const messageData:TwitchatDataTypes.MessageChatData = {
				platform:"twitchat",
				type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				channel_id:me.id,
				date:Date.now(),
				id:Utils.getUUID(),
				message:message,
				message_chunks:chunks,
				message_html:TwitchUtils.messageChunksToHTML(chunks),
				user:me,
				is_short:false,
				answers:[],
				message_size:0,
			}
			StoreProxy.main.chatAlert = messageData;

			//Execute trigger
			const trigger:TwitchatDataTypes.MessageChatAlertData = {
				date:Date.now(),
				id:Utils.getUUID(),
				platform:"twitchat",
				type:TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT,
				message:messageData,
				channel_id:messageData.channel_id,
			}
			TriggerActionHandler.instance.execute(trigger);
			return true;
		}else

		if(isAdmin && cmd == "/fakewhisper" || cmd == "/fakewhispers") {
			const count = parseInt(params[0]) || 1;
			for (let i = 0; i < count; i++) {
				StoreProxy.debug.simulateMessage(TwitchatDataTypes.TwitchatMessageType.WHISPER);
			}
			return true;
		}else

		if(cmd == "/gigaspam") {
			const count = StoreProxy.chat.realHistorySize;
			for (let i = 0; i < count; i++) {
				const post = i > count - 100;
				await StoreProxy.debug.sendRandomFakeMessage(post, undefined,(message:TwitchatDataTypes.ChatMessageTypes)=>{
					if(!post) {
						//Push message not posted on tchat to the message history
						StoreProxy.chat.messages.push(message);
					}
				});
			}
			return true;
		}else

		if(await Utils.sha256(cmd||'') == "bc65801f9bd87286a84409d0c8a33d1ada366e703bfc41c09e9f166f7905594e") {
			StoreProxy.groq.enabled = !StoreProxy.groq.enabled;
			return true;
		}else

		if(isAdmin && (cmd == "/userdata" || cmd == "/loaduserdata")) {
			if(params.length == 0) {
				StoreProxy.common.alert(StoreProxy.i18n.t('error.user_param_missing'));
			}else{
				let users:TwitchDataTypes.UserInfo[] = [];
				try {
					users = await TwitchUtils.getUserInfo(undefined, [params[0]]);
				}catch(error) {}

				if(users.length == 0) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.user_param_not_found", {USER:params[0]}));
				}else{
					const res = await ApiHelper.call("user/data", "GET", {uid:users[0].id}, false);
					if(res.status === 200) {
						if(cmd === "/loaduserdata") {
							DataStore.loadFromJSON(res.json.data);
						}else{
							//Open JSON on new tab
							const data = JSON.stringify(res.json.data);
							const blob = new Blob([data], { type: 'application/json' });
							const url = window.URL.createObjectURL(blob);
							window.open(url, "_blank");
						}
					}else{
						StoreProxy.common.alert("Unable to load user data");
					}
				}
			}
			return true;
		}else
		if(cmd && /^\/_.*_$/.test(cmd)) {
			// Reject if user is already lifetime premium
			const pType = StoreProxy.auth.premiumType;
			if(pType != "patreon" && pType != "") return true

			const code = cmd.replace(/\/|_/g, "").toLowerCase();
			const result = await ApiHelper.call("user/gift_premium", "POST", {code})
			if(result.status == 200) {
				if(result.json.result === "success") {
					StoreProxy.auth.premiumType = "gifted";
					const message:TwitchatDataTypes.MessageCustomData = {
						channel_id:channelId,
						date:Date.now(),
						id:Utils.getUUID(),
						platform:"twitchat",
						type:TwitchatDataTypes.TwitchatMessageType.CUSTOM,
						message: StoreProxy.i18n.t("premium.code_success", {CODE:code}),
						style: "highlight",
						highlightColor: "#c400da",
						icon: "premium",
					}
					console.log("Send message", message)
					StoreProxy.chat.addMessage(message);
				}else if (result.json.result === "empty_credits") {
					StoreProxy.common.alert(StoreProxy.i18n.t("premium.code_empty"));
				}else if (result.json.result === "invalid_code") {
					StoreProxy.common.alert(StoreProxy.i18n.t("premium.code_wrong"));
				}
			}
			return true;
		}

		return false;
	}

	private paramsToDuration(param:string):number {
		const chunks = param.split(/[^a-z0-9_]+/gi).filter(v => v != "");
		let duration = 0;
		for(let i = 0; i < chunks.length; i++) {
			const value = parseInt(chunks[i]);
			let coeff = chunks.length - i;
			if(coeff > 1) coeff = Math.pow(60, coeff-1);
			duration += value * coeff;
		}
		return duration
	}

	private findQueue(ref: string): TwitchatDataTypes.QueueData | undefined {
		const refLower = ref.toLowerCase();
		return StoreProxy.queue.queueList.find(q => 
			q.id === ref ||
			q.title.toLowerCase() === refLower ||
			q.placeholderKey.toLowerCase() === refLower
		);
	}

	private sendChatMessage(channelId: string, message: string, queueId?: string, queueTitle?: string): void {
		const msg:TwitchatDataTypes.MessageQueueCommandData = {
			id:Utils.getUUID(),
			date:Date.now(),
			type:TwitchatDataTypes.TwitchatMessageType.QUEUE_COMMAND,
			platform:"twitchat",
			message: message,
			channel_id:channelId,
			queueId: queueId,
			queueTitle: queueTitle
		};
		StoreProxy.chat.addMessage(msg);
	}

	private async handleQueueJoin(queue: TwitchatDataTypes.QueueData, message: TwitchatDataTypes.MessageChatData, channel: TwitchatDataTypes.TwitchatUser): Promise<boolean> {
		if(!queue.enabled || queue.paused) {
			StoreProxy.chat.addMessage({
				id: Utils.getUUID(),
				date: Date.now(),
				channel_id: channel.id,
				user: channel,
				answers: [],
				is_short: false,
				message: StoreProxy.i18n.t("chat.commands.queue_unavailable", {queue: queue.title}),
				message_html: StoreProxy.i18n.t("chat.commands.queue_unavailable", {queue: queue.title}),
				message_chunks: [],
				message_size: 0,
				platform: "twitchat",
				type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
			});
			return true;
		}
		
		//Add current user to queue
		if(message.user.id && message.user.id !== channel.id) {
			const existingEntry = queue.entries.find(e => e.user.id === message.user.id);
			const inProgress = queue.inProgress?.find(e => e.user.id === message.user.id);
			
			if(existingEntry || inProgress) {
				const position = existingEntry ? queue.entries.indexOf(existingEntry) + 1 : 0;
				StoreProxy.chat.addMessage({
					id: Utils.getUUID(),
					date: Date.now(),
					channel_id: channel.id,
					user: channel,
					answers: [],
					is_short: false,
					message: inProgress ? 
						StoreProxy.i18n.t("chat.commands.already_in_progress", {queue: queue.title}) :
						StoreProxy.i18n.t("chat.commands.already_in_queue", {queue: queue.title, position}),
					message_html: inProgress ? 
						StoreProxy.i18n.t("chat.commands.already_in_progress", {queue: queue.title}) :
						StoreProxy.i18n.t("chat.commands.already_in_queue", {queue: queue.title, position}),
					message_chunks: [],
					message_size: 0,
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				});
			} else {
				StoreProxy.queue.addViewer(queue.id, message.user);
				const position = queue.entries.length;
				StoreProxy.chat.addMessage({
					id: Utils.getUUID(),
					date: Date.now(),
					channel_id: channel.id,
					user: channel,
					answers: [],
					is_short: false,
					message: StoreProxy.i18n.t("chat.commands.joined_queue", {queue: queue.title, position}),
					message_html: StoreProxy.i18n.t("chat.commands.joined_queue", {queue: queue.title, position}),
					message_chunks: [],
					message_size: 0,
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				});
			}
		}
		return true;
	}

	private async handleQueueLeave(queue: TwitchatDataTypes.QueueData, message: TwitchatDataTypes.MessageChatData, channel: TwitchatDataTypes.TwitchatUser): Promise<boolean> {
		//Remove current user from queue
		if(message.user.id && message.user.id !== channel.id) {
			const entryIndex = queue.entries.findIndex(e => e.user.id === message.user.id);
			const inProgressIndex = queue.inProgress?.findIndex(e => e.user.id === message.user.id) ?? -1;
			
			if(entryIndex !== -1 || inProgressIndex !== -1) {
				StoreProxy.queue.removeViewer(queue.id, message.user.id);
				StoreProxy.chat.addMessage({
					id: Utils.getUUID(),
					date: Date.now(),
					channel_id: channel.id,
					user: channel,
					answers: [],
					is_short: false,
					message: StoreProxy.i18n.t("chat.commands.left_queue", {queue: queue.title}),
					message_html: StoreProxy.i18n.t("chat.commands.left_queue", {queue: queue.title}),
					message_chunks: [],
					message_size: 0,
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				});
			} else {
				StoreProxy.chat.addMessage({
					id: Utils.getUUID(),
					date: Date.now(),
					channel_id: channel.id,
					user: channel,
					answers: [],
					is_short: false,
					message: StoreProxy.i18n.t("chat.commands.not_in_queue", {queue: queue.title}),
					message_html: StoreProxy.i18n.t("chat.commands.not_in_queue", {queue: queue.title}),
					message_chunks: [],
					message_size: 0,
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				});
			}
		}
		return true;
	}
}
