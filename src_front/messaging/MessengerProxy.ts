import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";
import { TriggerTypes } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "@/types/twitch/TwitchDataTypes";
import ApiController from "@/utils/ApiController";
import Config from "@/utils/Config";
import Utils from "@/utils/Utils";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import { TwitchScopes } from "@/utils/twitch/TwitchScopes";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { LoremIpsum } from "lorem-ipsum";
import MessengerClientEvent from "./MessengerClientEvent";
import TwitchMessengerClient from "./TwitchMessengerClient";
import OBSWebsocket from "@/utils/OBSWebsocket";
import Logger from "@/utils/Logger";
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
	public async sendMessage(message:string, targetPlatforms?:TwitchatDataTypes.ChatPlatform[], channelId?:string, replyTo?:TwitchatDataTypes.MessageChatData, noConfirm:boolean = false):Promise<boolean> {
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
			if(!TwitchMessengerClient.instance.sendMessage(channelId, message, replyTo, noConfirm)) {
				return false;
			}
		}
		return true;
	}

	public async connect():Promise<void> {
		const twitchChannels = Config.instance.debugChans.filter(v=>v.platform == "twitch");
		twitchChannels.unshift({platform:"twitch", login:StoreProxy.auth.twitch.user.login})
		for (let i = 0; i < twitchChannels.length; i++) {
			//It's safe to spam this method as it has inner debounce
			TwitchMessengerClient.instance.connectToChannel(twitchChannels[i].login);
		}
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
			this.joinSpoolTimeout = setTimeout(()=> {
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
			this.leaveSpoolTimeout = setTimeout(()=> {
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
		const res = await StoreProxy.auth.twitch_tokenRefresh(true);
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
		
		//Check if the command matches one of the custom slash commands
		//created on the triggers
		let triggerCommands = StoreProxy.triggers.triggerList.filter(v=> v.type == TriggerTypes.SLASH_COMMAND && v.chatCommand);
		for (let i = 0; i < triggerCommands.length; i++) {
			const t = triggerCommands[i];
			if(cmd == t.chatCommand!.toLowerCase()) {
				const me = StoreProxy.auth.twitch.user;
				const chunks = TwitchUtils.parseMessageToChunks(message);
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
			let duration = this.paramsToDuration(params[0]);
			StoreProxy.timer.countdownStart(duration * 1000);
			return true;
		}else

		if(cmd == "/countdownadd") {
			let duration = this.paramsToDuration(params[0]);
			StoreProxy.timer.countdownAdd(duration * 1000);
			return true;
		}else

		if(cmd == "/countdownremove") {
			let duration = this.paramsToDuration(params[0]);
			StoreProxy.timer.countdownRemove(duration * 1000);
			return true;
		}else

		if(cmd == "/countdownpause") {
			StoreProxy.timer.countdownPause();
			return true;
		}else

		if(cmd == "/countdownunpause") {
			StoreProxy.timer.countdownUnpause();
			return true;
		}else

		if(cmd == "/countdownstop") {
			StoreProxy.timer.countdownStop();
			return true;
		}else

		if(cmd == "/timerstart") {
			StoreProxy.timer.timerStart();
			return true;
		}else

		if(cmd == "/timeradd") {
			let duration = this.paramsToDuration(params[0]);
			StoreProxy.timer.timerAdd(duration * 1000);
			return true;
		}else
		
		if(cmd == "/timerremove") {
			let duration = this.paramsToDuration(params[0]);
			StoreProxy.timer.timerRemove(duration * 1000);
			return true;
		}else

		if(cmd == "/timerpause") {
			StoreProxy.timer.timerPause();
			return true;
		}else

		if(cmd == "/timerunpause") {
			StoreProxy.timer.timerUnpause();
			return true;
		}else

		if(cmd == "/timerstop") {
			StoreProxy.timer.timerStop();
			return true;
		}else

		if(cmd == "/suggestion") {
			StoreProxy.params.openModal("chatsuggForm")
			return true;
		}else

		if(isAdmin && cmd == "/userlist") {
			StoreProxy.params.openModal("TTuserList")
			return true;
		}else

		if(isAdmin && cmd == "/logmessages") {
			console.log(StoreProxy.chat.messages)
			return true;
		}else

		if(cmd == "/__stopobsstream__") {
			OBSWebsocket.instance.stopStreaming();
			return true;
		}else

		if(cmd == "/raid" && (!params[0] || params[0] == "user")) {
			if(TwitchUtils.requestScopes([TwitchScopes.START_RAID])) {
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

		if(cmd == "/search") {
			//Search a for messages
			const search = params.join(" ");
			// this.$emit("search", search);
			StoreProxy.chat.doSearchMessages(search);
			StoreProxy.params.openModal("search", true);
			return true;
		}else

		if(cmd == "/pin") {
			StoreProxy.main.alert(StoreProxy.i18n.t("error.cmd_missing_api"));
			return true;
		}else

		if(cmd == "/so" || cmd == "/shoutout") {
			//Make a shoutout
			await StoreProxy.users.getUserFrom("twitch", channelId, undefined, params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim(), undefined, async (user)=> {
				await StoreProxy.users.shoutout(StoreProxy.auth.twitch.user.id, user);
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
				if(parseInt(username).toString() === username) {
					const user = await TwitchUtils.loadUserInfo([username]);
					username = user[0].login;
				}
				const user = StoreProxy.users.getUserFrom("twitch", channelId, undefined, username);
				StoreProxy.users.openUserCard( user, channelId, "twitch");
			}
			return true;
		}else

		if(cmd == "/userfromid") {
			const res = await TwitchUtils.loadUserInfo([params[0]]);
			if(res.length === 0) {
				StoreProxy.main.alert( StoreProxy.i18n.t("error.user_param_not_found", {USER:"<mark>"+params[0]+"</mark>"}) );
			}else{
				const userInfo = res[0];
				const user = StoreProxy.users.getUserFrom("twitch", StoreProxy.auth.twitch.user.id, userInfo.id, userInfo.login, userInfo.display_name);
				StoreProxy.users.openUserCard(user, channelId, "twitch");
			}
			return true;
		}
				
		if(cmd == "/logself") {
			console.log(StoreProxy.auth.twitch.user);
			return true;
		}else

		if(cmd == "/ttsoff" || cmd == "/tts") {
			const username = params[0].toLowerCase().replace(/[^a-z0-9_]+/gi, "").trim();
			try {
				const res = await TwitchUtils.loadUserInfo(undefined, [username]);
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
					const user = StoreProxy.users.getUserFrom("twitch", channelId, res[0].id, res[0].login, res[0].display_name);
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
		
		if(cmd == "/adslogs") {
			Logger.instance.download("ads");
			return true;
		}else
		
		if(cmd == "/irclogs") {
			Logger.instance.download("irc");
			return true;
		}else
		
		if(cmd == "/youtubelogs") {
			Logger.instance.download("youtube");
			return true;
		}else

		if(cmd == "/streamsummary") {
			StoreProxy.params.openModal("streamSummary");
			return true;
		}else

		if(cmd == "/greetduration") {
			let duration = this.paramsToDuration(params[0]);
			StoreProxy.params.setGreetThemAutoDelete(duration);
			return true;
		}else

		if(cmd == "/triggerlogs") {
			StoreProxy.params.openModal("triggersLogs");
			return true;
		}else

		if(cmd == "/startraffle") {
			await StoreProxy.raffle.pickWinner();
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
			const categories = await TwitchUtils.searchCategory(params[0]);
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
				min: 0,
				max: 100,
			};
			if(params[0] == "number") {
				if(params.length < 3
				|| parseInt(params[1]).toString() != params[1]
				|| parseInt(params[2]).toString() != params[2]){
					StoreProxy.main.alert(StoreProxy.i18n.t('error.invalid_bingo')+params);
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
					StoreProxy.main.alert(StoreProxy.i18n.t('error.invalid_bingo')+params);
					return false;
				}
				payload.guessCustom = true;
				payload.customValue = params[1];
			}
			
			StoreProxy.bingo.startBingo(payload);
			return true;
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
			const userInfos = await TwitchUtils.loadUserInfo([user.id]);
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
				let user = Utils.pickRand(fakeUsers);
				const userInfos = await TwitchUtils.loadUserInfo([user.id]);
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
			const countMode = count.toString() == params[0];
			let spamDelay = cmd == "/megaspam"? 50 : 200;
			//Check if spamming only a specific count of messages
			if(countMode) {
				params.splice(0, 1);
				spamDelay = 300;
			}
			const forcedMessage = params.join(" ");

			//Check if forcing a specific reward redeem
			let forcedType:TwitchatDataTypes.TwitchatMessageStringType|undefined = countMode? TwitchatDataTypes.TwitchatMessageType.MESSAGE : undefined;
			if(params[0] === "reward") {
				forcedType = TwitchatDataTypes.TwitchatMessageType.REWARD;
				spamDelay = 500;
			}
			if(params[0] === "follow") {
				forcedType = TwitchatDataTypes.TwitchatMessageType.FOLLOWING;
				spamDelay = 500;
			}
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
							m.todayFirst = false;
							m.twitch_isFirstMessage = false;
							m.twitch_isSuspicious = false;
						}
					});

				}else{
					if(count == 1) clearInterval(this.spamInterval);
					count --;
					const lorem = new LoremIpsum({wordsPerSentence: { max: 8, min: 1 }});
					const message = lorem.generateSentences(Math.round(Math.random()*2) + 1);
					StoreProxy.debug.sendRandomFakeMessage<TwitchatDataTypes.ChatMessageTypes>(true, forcedMessage.replace(/\{LOREM\}/gi, message), (m)=>{
						//Force a specific reward via "/spam reward {REWARD_ID}"
						if(m.type == TwitchatDataTypes.TwitchatMessageType.REWARD
						&& forcedType == TwitchatDataTypes.TwitchatMessageType.REWARD) {
							let rewardId = params[1];
							console.log(rewardId);
							let reward = StoreProxy.rewards.rewardList.find(v=>v.id == rewardId);
							if(reward) {
								console.log(reward);
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
					}, forcedType);
				}
			}, spamDelay);
			return true;
		}else

		if(isAdmin && cmd == "/fakewhisper" || cmd == "/fakewhispers") {
			let count = parseInt(params[0]) || 1;
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

		if(isAdmin && (cmd == "/userdata" || cmd == "/loaduserdata")) {
			if(params.length == 0) {
				StoreProxy.main.alert(StoreProxy.i18n.t('error.user_param_missing'));
			}else{
				let users:TwitchDataTypes.UserInfo[] = [];
				try {
					users = await TwitchUtils.loadUserInfo(undefined, [params[0]]);
				}catch(error) {}

				if(users.length == 0) {
					StoreProxy.main.alert(StoreProxy.i18n.t("error.user_param_not_found", {USER:params[0]}));
				}else{
					const res = await ApiController.call("user/data", "GET", {uid:users[0].id}, false);
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
						StoreProxy.main.alert("Unable to load user data");
					}
				}
			}
			return true;
		}
		
		return false;
	}

	private paramsToDuration(param:string):number {
		const chunks = param.split(/[^a-z0-9_]+/gi);
		let duration = 0;
		for(let i = 0; i < chunks.length; i++) {
			let value = parseInt(chunks[i]);
			let coeff = chunks.length - i;
			if(coeff > 1) coeff = Math.pow(60, coeff-1);
			duration += value * coeff;
		}
		return duration
	}
}