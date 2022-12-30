import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import Utils from "@/utils/Utils";
import MessengerClientEvent from "./MessengerClientEvent";
import TwitchMessengerClient from "./TwitchMessengerClient";
/**
* Created : 26/09/2022 
*/
export default class MessengerProxy {

	private static _instance:MessengerProxy;

	private joinSpool:{channelId:string, user:TwitchatDataTypes.TwitchatUser}[] = [];
	private leaveSpool:{channelId:string, user:TwitchatDataTypes.TwitchatUser}[] = [];
	private joinSpoolTimeout:number = -1;
	private leaveSpoolTimeout:number = -1;
	
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
	public async sendMessage(message:string, targetPlatforms?:TwitchatDataTypes.ChatPlatform[], channelId?:string):Promise<boolean> {
		const hasPlatform = targetPlatforms && targetPlatforms.length>0;
		if(!channelId) channelId = StoreProxy.auth.twitch.user.id;

		if(await this.handleTwitchatCommands(message, targetPlatforms, channelId)) return true;

		// console.log("Send message:", message);
		// console.log("          to:", channelId);
		// console.log("          on:", targetPlatforms);
		if(!hasPlatform || targetPlatforms.indexOf("twitch")>-1) {
			if(!TwitchMessengerClient.instance.sendMessage(channelId, message)) {
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
		TwitchMessengerClient.instance.loadMeta();
	}

	public disconnect():void {
		TwitchMessengerClient.instance.disconnect();
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
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.BAN, (e:MessengerClientEvent)=> this.onMessage(e));
		TwitchMessengerClient.instance.addEventListener(MessengerClientEvent.TIMEOUT, (e:MessengerClientEvent)=> this.onMessage(e));
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
				StoreProxy.users.flagOnlineUsers(d.users, d.channel_id);
				
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
				}
				
				this.joinSpool = [];
			}, 1000);
		}
		
		if(e.type === MessengerClientEvent.LEAVE) {
			this.leaveSpool.push({user:d.users[0], channelId:d.channel_id});
			
			clearTimeout(this.leaveSpoolTimeout);
			this.leaveSpoolTimeout = setTimeout(()=> {
				const d = e.data! as TwitchatDataTypes.MessageJoinData;
				StoreProxy.users.flagOfflineUsers(d.users, d.channel_id);
				
				//Split join events by channels
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
				}
				
				this.leaveSpool = [];
			}, 1000);
		}
	}

	/**
	 * Called when requesting to refresh auth token
	 */
	private onRefreshToken(e:MessengerClientEvent):void {
		StoreProxy.auth.twitch_tokenRefresh(true);
	}

	private async handleTwitchatCommands(message:string, targetPlatforms?:TwitchatDataTypes.ChatPlatform[], channelId?:string):Promise<boolean> {
		
		const params = message.split(/\s/gi).filter(v => v != "");
		const cmd = params.shift()?.toLowerCase();
		params.forEach((v, i) => { params[i] = v.trim() });

		if(cmd == "/devmode") {
			StoreProxy.main.toggleDevMode();
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

		if(cmd == "/timerstop") {
			StoreProxy.timer.timerStop();
			return true;
		}else

		if(cmd == "/voice") {
			//change voicemod voice
			//TODO
		}else

		if(cmd == "/search") {
			//Search a for messages
			const search = params.join(" ");
			// this.$emit("search", search);
			StoreProxy.chat.doSearchMessages(search);
			return true;
		}else

		if(cmd == "/shoutout" || cmd == "/pin") {
			StoreProxy.main.alert(StoreProxy.i18n.t("error.cmd_missing_api"));
			return true;
		}else

		if(cmd == "/so") {
			const user = await StoreProxy.users.getUserFrom("twitch", channelId, undefined, params[0]);
			//Make a shoutout
			await StoreProxy.chat.shoutout(user);
			return true;
		}else

		if(cmd == "/commercial") {
			StoreProxy.stream.startAd(params.length > 0? parseInt(params[0]) : 30);
			return true;
		}else

		if(cmd == "/updates") {
			StoreProxy.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.UPDATES);
			return true;
		}else

		if(cmd == "/tip") {
			StoreProxy.chat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
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
				}
				StoreProxy.chat.addMessage(notice);
			}else{
				if(parseInt(params[0]).toString() === params[0]) {
					const user = await TwitchUtils.loadUserInfo([params[0]]);
					params[0] = user[0].login;
				}
				const user = StoreProxy.users.getUserFrom("twitch", channelId, undefined, params[0]);
				StoreProxy.users.openUserCard( user );
			}
			return true;
		}else
				
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
						message:StoreProxy.i18n.t("error.user_param_not_found", {USER:"<mark>"+username+"</mark>"})
					}
					StoreProxy.chat.addMessage(notice);
				}else{
					const user = StoreProxy.users.getUserFrom("twitch", channelId, res[0].id, res[0].login, res[0].display_name);
					StoreProxy.tts.ttsReadUser(user, cmd == "/tts");
				}
			}catch(error) {}
			return true;
		}else

		if(cmd == "/logusers") {
			console.log(StoreProxy.users.users);
			return true;
		}else

		if(cmd == "/betaadd") {
			StoreProxy.admin.addBetaUser(params[0]);
			return true;
		}else

		if(cmd == "/betadel") {
			StoreProxy.admin.removeBetaUser(params[0]);
			return true;
		}else

		if(cmd == "/betaclose") {
			StoreProxy.admin.removeAllBetaUser();
			return true;
		}else

		if(cmd == "/greetduration") {
			let duration = this.paramsToDuration(params[0]);
			StoreProxy.params.greetThemAutoDelete = duration;
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
					StoreProxy.main.alert("Invalid bingo parameters: "+params);
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
					StoreProxy.main.alert("Invalid bingo parameters: "+params);
					return false;
				}
				payload.guessCustom = true;
				payload.customValue = params[1];
			}
			
			StoreProxy.bingo.startBingo(payload);
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