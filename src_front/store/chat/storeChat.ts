import EventBus from '@/events/EventBus'
import GlobalEvent from '@/events/GlobalEvent'
import TwitchatEvent from '@/events/TwitchatEvent'
import MessengerProxy from '@/messaging/MessengerProxy'
import DataStore from '@/store/DataStore'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import ChatCypherPlugin from '@/utils/ChatCypherPlugin'
import PublicAPI from '@/utils/PublicAPI'
import SchedulerHelper from '@/utils/SchedulerHelper'
import TriggerActionHandler from '@/utils/triggers/TriggerActionHandler'
import TTSUtils from '@/utils/TTSUtils'
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes'
import TwitchUtils from '@/utils/twitch/TwitchUtils'
import Utils from '@/utils/Utils'
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket'
import { defineStore, type PiniaCustomProperties, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { JsonObject } from 'type-fest'
import { reactive, type UnwrapRef } from 'vue'
import StoreProxy, { type IChatActions, type IChatGetters, type IChatState } from '../StoreProxy'

//Don't make this reactive, it kills performances on the long run
let messageList:TwitchatDataTypes.ChatMessageTypes[] = [];
let greetedUsers:{[key:string]:number} = {};
let greetedUsersInitialized:boolean = false;
let subgiftTriggerTimeout:number = -1;

export const storeChat = defineStore('chat', {
	state: () => ({
		searchMessages: "",
		realHistorySize: 20000,
		whispersUnreadCount: 0,
		pinedMessages: [],
		whispers: {},
		emoteSelectorCache: [],
		
		
		botMessages: {
			raffleStart: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleStart"),
			},
			raffle: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffle"),
			},
			raffleJoin: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.raffleJoin"),
			},
			bingoStart: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.bingoStart"),
			},
			bingo: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.bingo"),
			},
			shoutout: {
				enabled:true,
				message:StoreProxy.i18n.tm("params.botMessages.shoutout"),
			},
			twitchatAd: {
				enabled:false,
				message:StoreProxy.i18n.tm("params.botMessages.twitchatAd"),
			},
		},
		commands: [
			{
				id:"updates",
				cmd:"/updates",
				details:StoreProxy.i18n.t("params.commands.updates"),
			},
			{
				id:"tip",
				cmd:"/tip",
				details:StoreProxy.i18n.t("params.commands.tip"),
			},
			{
				id:"timerStart",
				cmd:"/timerStart",
				details:StoreProxy.i18n.t("params.commands.timerStart"),
			},
			{
				id:"timerAdd",
				cmd:"/timerAdd {(hh:)(mm:)ss}",
				details:StoreProxy.i18n.t("params.commands.timerAdd"),
			},
			{
				id:"timerRemove",
				cmd:"/timerRemove {(hh:)(mm:)ss}",
				details:StoreProxy.i18n.t("params.commands.timerRemove"),
			},
			{
				id:"timerStop",
				cmd:"/timerStop",
				details:StoreProxy.i18n.t("params.commands.timerStop"),
			},
			{
				id:"countdown",
				cmd:"/countdown {(hh:)(mm:)ss}",
				details:StoreProxy.i18n.t("params.commands.countdown"),
			},
			{
				id:"countdownAdd",
				cmd:"/countdownAdd {(hh:)(mm:)ss}",
				details:StoreProxy.i18n.t("params.commands.countdownAdd"),
			},
			{
				id:"countdownRemove",
				cmd:"/countdownRemove {(hh:)(mm:)ss}",
				details:StoreProxy.i18n.t("params.commands.countdownRemove"),
			},
			{
				id:"countdownStop",
				cmd:"/countdownStop",
				details:StoreProxy.i18n.t("params.commands.countdownStop"),
			},
			{
				id:"search",
				cmd:"/search {text}",
				details:StoreProxy.i18n.t("params.commands.search"),
			},
			{
				id:"userinfo",
				cmd:"/user {user}",
				alias:"/userinfo {user}",
				details:StoreProxy.i18n.t("params.commands.userinfo"),
			},
			{
				id:"raffle",
				cmd:"/raffle",
				details:StoreProxy.i18n.t("params.commands.raffle"),
			},
			{
				id:"bingo",
				cmd:"/bingo {number|emote}",
				details:StoreProxy.i18n.t("params.commands.bingo"),
			},
			{
				id:"raid",
				cmd:"/raid {user}",
				details:StoreProxy.i18n.t("params.commands.raid"),
				needModerator:true,
			},
			{
				id:"so",
				cmd:"/so {user}",
				details:StoreProxy.i18n.t("params.commands.so"),
				alias:"/shoutout {user}",
				needModerator:true,
			},
			{
				id:"poll",
				cmd:"/poll {title}",
				details:StoreProxy.i18n.t("params.commands.poll"),
				needChannelPoints:true,
				needModerator:true,
			},
			{
				id:"chatsugg",
				cmd:"/chatsugg",
				details:StoreProxy.i18n.t("params.commands.chatsugg"),
			},
			{
				id:"prediction",
				cmd:"/prediction {title}",
				details:StoreProxy.i18n.t("params.commands.prediction"),
				needChannelPoints:true,
				needModerator:true,
			},
			{
				id:"tts",
				cmd:"/tts {user}",
				details:StoreProxy.i18n.t("params.commands.tts"),
				needTTS:true,
			},
			{
				id:"ttsoff",
				cmd:"/ttsoff {user}",
				details:StoreProxy.i18n.t("params.commands.ttsoff"),
				needTTS:true,
			},
			{
				id:"simulatechat",
				cmd:"/simulateChat",
				details:StoreProxy.i18n.t("params.commands.simulatechat"),
			},
			{
				id:"announce",
				cmd:"/announce {message}",
				details:StoreProxy.i18n.t("params.commands.announce"),
				needModerator:true,
			},
			{
				id:"announceblue",
				cmd:"/announceblue {message}",
				details:StoreProxy.i18n.t("params.commands.announceblue"),
				needModerator:true,
			},
			{
				id:"announcegreen",
				cmd:"/announcegreen {message}",
				details:StoreProxy.i18n.t("params.commands.announcegreen"),
				needModerator:true,
			},
			{
				id:"announceorange",
				cmd:"/announceorange {message}",
				details:StoreProxy.i18n.t("params.commands.announceorange"),
				needModerator:true,
			},
			{
				id:"announcepurple",
				cmd:"/announcepurple {message}",
				details:StoreProxy.i18n.t("params.commands.announcepurple"),
				needModerator:true,
			},
			{
				id:"commercial",
				cmd:"/commercial {duration}",
				details:StoreProxy.i18n.t("params.commands.commercial"),
				needChannelPoints:false,
				needModerator:true,
			},
			{
				id:"to",
				cmd:"/timeout {user} {duration} {reason}",
				details:StoreProxy.i18n.t("params.commands.to"),
				needModerator:true,
			},
			{
				id:"ban",
				cmd:"/ban {user}",
				details:StoreProxy.i18n.t("params.commands.ban"),
				needModerator:true,
			},
			{
				id:"Unban",
				cmd:"/unban {user}",
				details:StoreProxy.i18n.t("params.commands.Unban"),
				needModerator:true,
			},
			{
				id:"block",
				cmd:"/block {user}",
				details:StoreProxy.i18n.t("params.commands.block"),
				needModerator:true,
			},
			{
				id:"Unblock",
				cmd:"/unblock {user}",
				details:StoreProxy.i18n.t("params.commands.Unblock"),
				needModerator:true,
			},
			{
				id:"Whisper",
				cmd:"/w {recipient} {message}",
				details:StoreProxy.i18n.t("params.commands.Whisper"),
				alias:"/whisper {recipient} {message}",
			},
			{
				id:"shieldOn",
				cmd:"/shield",
				details:StoreProxy.i18n.t("params.commands.shieldOn"),
				needModerator:true,
			},
			{
				id:"shieldOff",
				cmd:"/shieldoff",
				details:StoreProxy.i18n.t("params.commands.shieldOff"),
				needModerator:true,
			},
			{
				id:"ttsOn",
				cmd:"/tts {user}",
				details:StoreProxy.i18n.t("params.commands.ttsOn"),
			},
			{
				id:"ttsOff",
				cmd:"/ttsoff {user}",
				details:StoreProxy.i18n.t("params.commands.ttsOff"),
			},
			{
				id:"betaadd",
				cmd:"/betaAdd {user}",
				details:StoreProxy.i18n.t("params.commands.betaadd"),
				needAdmin:true,
			},
			{
				id:"betadel",
				cmd:"/betaDel {user}",
				details:StoreProxy.i18n.t("params.commands.betadel"),
				needAdmin:true,
			},
			{
				id:"betaclose",
				cmd:"/betaClose",
				details:StoreProxy.i18n.t("params.commands.betareset"),
				needAdmin:true,
			},
			{
				id:"devmode",
				cmd:"/devmode",
				details:StoreProxy.i18n.t("params.commands.devmode"),
				needAdmin:true,
			},
			{
				id:"mod",
				cmd:"/mod {user}",
				details:StoreProxy.i18n.t("params.commands.mod"),
				needModerator:true,
			},
			{
				id:"unmod",
				cmd:"/unmod {user}",
				details:StoreProxy.i18n.t("params.commands.unmod"),
				needModerator:true,
			},
			{
				id:"vip",
				cmd:"/vip {user}",
				details:StoreProxy.i18n.t("params.commands.vip"),
				needModerator:true,
			},
			{
				id:"unvip",
				cmd:"/unvip {user}",
				details:StoreProxy.i18n.t("params.commands.unvip"),
				needModerator:true,
			},
			{
				id:"userlist",
				cmd:"/userlist",
				details:StoreProxy.i18n.t("params.commands.userlist"),
				needAdmin:true,
			},
			{
				id:"greetduration",
				cmd:"/greetDuration {(hh:)(mm:)ss}",
				details:StoreProxy.i18n.t("params.commands.greetduration"),
			},
			{
				id:"pin",
				cmd:"/pin {message}",
				details:StoreProxy.i18n.t("params.commands.pin"),
			},
		],

		spoilerParams: {
			permissions:{
				broadcaster:true,
				mods:true,
				vips:false,
				subs:false,
				all:false,
				users:""
			},
		},

		isChatMessageHighlighted: false,
		chatHighlightOverlayParams: {
			position:"bl",
		},
	} as IChatState),



	getters: {
		messages():TwitchatDataTypes.ChatMessageTypes[] { return messageList; },
	},



	actions: {

		sendTwitchatAd(adType:TwitchatDataTypes.TwitchatAdStringTypes = -1) {
			if(adType == TwitchatDataTypes.TwitchatAdTypes.NONE) {
				let possibleAds:TwitchatDataTypes.TwitchatAdStringTypes[] = [];
				if(!StoreProxy.auth.twitch.user.donor.state===true || StoreProxy.auth.twitch.user.donor.level < 2) {
					possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.SPONSOR);
				}
				//Give more chances to hae anything but the "sponsor" ad
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.TIP_AND_TRICK);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);
				possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.DISCORD);

				const lastUpdateRead = parseInt(DataStore.get(DataStore.UPDATE_INDEX));
				if(isNaN(lastUpdateRead) || lastUpdateRead < StoreProxy.main.latestUpdateIndex) {
					//Force last updates if any not read
					possibleAds = [TwitchatDataTypes.TwitchatAdTypes.UPDATES];
				}else{
					//Add 4 empty slots for every content type available
					//to reduce chances to actually get an "ad"
					const len = 4*possibleAds.length;
					for (let i = 0; i < len; i++) possibleAds.push(TwitchatDataTypes.TwitchatAdTypes.NONE);
				}
		
				adType = Utils.pickRand(possibleAds);
				// adType = TwitchatDataTypes.TwitchatAdTypes.SPONSOR;//TODO comment this line
				if(adType == TwitchatDataTypes.TwitchatAdTypes.NONE) return;
			}

			this.addMessage( {
				platform:"twitch",
				id:Utils.getUUID(),
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
				adType,
			} );
		},

		
		async addMessage(message:TwitchatDataTypes.ChatMessageTypes) {
			const sParams = StoreProxy.params;
			const sStream = StoreProxy.stream;
			const sUsers = StoreProxy.users;
			const sAutomod = StoreProxy.automod;
			const sRaffle = StoreProxy.raffle;
			const sBingo = StoreProxy.bingo;
			const sChatSuggestion = StoreProxy.chatSuggestion;
			const sOBS = StoreProxy.obs;
			const sEmergency = StoreProxy.emergency;
			const sMain = StoreProxy.main;
			const sVoice = StoreProxy.voice;
			const sAuth = StoreProxy.auth;
			const s = Date.now();

			if(!greetedUsersInitialized) {
				greetedUsersInitialized = true;
				const history = DataStore.get(DataStore.GREET_HISTORY);
				greetedUsers = JSON.parse(history ?? "{}");
				//Previously they were stored in an array instead of an object, convert it
				if(Array.isArray(greetedUsers)) greetedUsers = {};
			}

			message = reactive(message);

			TTSUtils.instance.addMessageToQueue(message);

			switch(message.type) {
				case TwitchatDataTypes.TwitchatMessageType.MESSAGE:
				case TwitchatDataTypes.TwitchatMessageType.WHISPER: {
					if(message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
						const correspondantId = message.user.id == sAuth.twitch.user.id? message.to.id : message.user.id
						if(!this.whispers[correspondantId]) this.whispers[correspondantId] = [];
						this.whispers[correspondantId].push(message);
						this.whispersUnreadCount ++;
						const wsUser = {
							id:message.user.id,
							login:message.user.login,
							displayName:message.user.displayName,
						};
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_WHISPER, {unreadCount:this.whispersUnreadCount, user:wsUser, message:"<not set for privacy reasons>"});
						
					}else if(message.user.greeted !== true
					&& (!greetedUsers[message.user.id] || greetedUsers[message.user.id] < Date.now())) {
						message.todayFirst = true;
						message.user.greeted = true;
						greetedUsers[message.user.id] = Date.now() + (1000 * 60 * 60 * 8);//expire after 8 hours
						DataStore.set(DataStore.GREET_HISTORY, greetedUsers, false);
					}
					
					//Check if the message contains a mention
					if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
					&& StoreProxy.params.appearance.highlightMentions.value === true) {
						const login = StoreProxy.auth.twitch.user.login;
						message.hasMention = login != null
											&& new RegExp("(^| |@)("+login+")($|\\s)", "gim")
											.test(message.message ?? "");
					}
	
					//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
					if(ChatCypherPlugin.instance.isCyperCandidate(message.message)) {
						const original = message.message;
						message.message = message.message_html = await ChatCypherPlugin.instance.decrypt(message.message);
						message.cyphered = message.message != original;
					}

					//Search in the last 30 messages if this message has already been sent
					//If so, just increment the previous one
					if(sParams.features.groupIdenticalMessage.value === true) {
						const len = messageList.length;
						const end = Math.max(0, len - 30);
						for (let i = len-1; i > end; i--) {
							const m = messageList[i];
							if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE && m.type != TwitchatDataTypes.TwitchatMessageType.WHISPER) continue;
							if(m.user.id == message.user.id
							&& (m.date > Date.now() - 30000 || i > len-20)//"i > len-20" more or less means "if message is still visible on screen"
							&& message.message.toLowerCase() == m.message.toLowerCase()
							&& message.type == m.type) {
								if(!m.occurrenceCount) m.occurrenceCount = 0;
								//Remove message
								messageList.splice(i, 1);
								EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:true}));
								m.occurrenceCount ++;
								//Update timestamp
								m.date = Date.now();
								//Bring it back to bottom
								messageList.push(m);
								EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.ADD_MESSAGE, m));
								messageList = messageList;
								return;
							}
						}
					}



					if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						//Reset ad schedule if necessary
						if(!message.user.channelInfo[message.channel_id].is_broadcaster) {
							SchedulerHelper.instance.incrementMessageCount();
						}
						if(/(^|\s|https?:\/\/)twitchat\.fr($|\s)/gi.test(message.message)) {
							SchedulerHelper.instance.resetAdSchedule(message);
						}
	
						const wsMessage = {
							channel:message.channel_id,
							message:message.message,
							user: {
								id:message.user.id,
								login:message.user.login,
								displayName:message.user.displayName,
							}
						}
	
						//If it's a text message and user isn't a follower, broadcast to WS
						if(message.user.channelInfo[message.channel_id].is_following === false) {
							PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_NON_FOLLOWER, wsMessage);
						}
			
						//Check if the message contains a mention
						if(message.hasMention) {
							PublicAPI.instance.broadcast(TwitchatEvent.MENTION, wsMessage);
						}
			
						//If it's the first message today for this user
						if(message.todayFirst === true) {
							PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST, wsMessage);
						}
			
						//If it's the first message all time of the user
						if(message.twitch_isFirstMessage) {
							PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST_ALL_TIME, wsMessage);
						}
						
						const cmd = message.message.trim().split(" ")[0].toLowerCase();
	
						//If a raffle is in progress, check if the user can enter
						const raffle = sRaffle.data;
						if(raffle && raffle.mode == "chat" && cmd == raffle.command.trim().toLowerCase()) {
							sRaffle.checkRaffleJoin(message);
						}
			
						//If there's a suggestion poll and the timer isn't over
						const suggestionPoll = sChatSuggestion.data;
						if(suggestionPoll && cmd == suggestionPoll.command.toLowerCase().trim()) {
							sChatSuggestion.addChatSuggestion(message);
						}
	
						//Check if it's the winning choice of a bingo
						sBingo.checkBingoWinner(message);
	
						//Handle OBS commands
						sOBS.handleChatCommand(message, cmd);
						
						//Handle Emergency commands
						sEmergency.handleChatCommand(message, cmd);
						
						//Handle spoiler command
						if(message.answersTo && Utils.checkPermissions(this.spoilerParams.permissions, message.user, message.channel_id)) {
							const cmd = message.message.replace(/@[^\s]+\s?/, "").trim().toLowerCase();
							if(cmd.indexOf("!spoiler") === 0) {
								message.answersTo.spoiler = true;
							}
						}
	
						//Flag as spoiler
						if(message.message.indexOf("||") == 0) message.spoiler = true;
	
						//check if it's a chat alert command
						if(sParams.features.alertMode.value === true && 
						Utils.checkPermissions(sMain.chatAlertParams.permissions, message.user, message.channel_id)) {
							if(message.message.trim().toLowerCase().indexOf(sMain.chatAlertParams.chatCmd.trim().toLowerCase()) === 0) {
								//Remove command from message to make later things easier
								sMain.chatAlert = message;
								const trigger:TwitchatDataTypes.MessageChatAlertData = {
									date:Date.now(),
									id:Utils.getUUID(),
									platform:message.platform,
									type:TwitchatDataTypes.TwitchatMessageType.CHAT_ALERT,
									message:message,
								}
								TriggerActionHandler.instance.onMessage(trigger);
							}
						}
						
						//Check if it's a voicemod command
						if(sVoice.voicemodParams.enabled
						&& sVoice.voicemodParams.commandToVoiceID[cmd]
						&& Utils.checkPermissions(sVoice.voicemodParams.chatCmdPerms, message.user, message.channel_id)) {
							VoicemodWebSocket.instance.enableVoiceEffect(sVoice.voicemodParams.commandToVoiceID[cmd]);
						}
							
						//If there's a mention, search for last messages within
						//a max timeframe to find if the message may be a reply to
						//a message that was sent by the mentionned user
						if(/@\w/gi.test(message.message)) {
							// console.log("Mention found");
							const ts = Date.now();
							const messages = this.messages;
							const timeframe = 5*60*1000;//Check if a massage answers another within this timeframe
							const matches = message.message.match(/@\w+/gi) as RegExpMatchArray;
							for (let i = 0; i < matches.length; i++) {
								const match = matches[i].replace("@", "").toLowerCase();
								// console.log("Search for message from ", match);
								const candidates = messages.filter(m => {
									if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) return false;
									return m.user.login == match
								}) as TwitchatDataTypes.MessageChatData[];
								//Search for oldest matching candidate
								for (let j = 0; j < candidates.length; j++) {
									const c = candidates[j];
									// console.log("Found candidate", c);
									if(ts - c.date < timeframe) {
										// console.log("Timeframe is OK !");
										if(c.answers) {
											//If it's the root message of a conversation
											c.answers.push( message );
											message.answersTo = c;
										}else if(c.answersTo && c.answersTo.answers) {
											//If the messages answers to a message itself answering to another message
											c.answersTo.answers.push( message );
											message.answersTo = c.answersTo;
										}else{
											//If message answers to a message not from a conversation
											message.answersTo = c;
											if(!c.answers) c.answers = [];
											c.answers.push( message );
										}
										break;
									}
								}
							}
						}
					}
					break;
				}

				//Incomming raid
				case TwitchatDataTypes.TwitchatMessageType.RAID: {
					sStream.lastRaider = message.user;
					message.user.is_raider = true;
					if(sParams.features.raidHighlightUser.value) {
						message.user.is_tracked = true;
					}
					setTimeout(()=> {
						const localMess = message as TwitchatDataTypes.MessageRaidData;
						localMess.user.is_raider = false;
						if(sParams.features.raidHighlightUser.value) {
							localMess.user.is_tracked = false;
						}
					}, 5 * 60 * 1000)
					break;
				}

				//New sub
				case TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION: {
					//If it's a subgift, merge it with potential previous ones
					if(message.is_gift) {
						const len = Math.max(0, messageList.length-20);//Only check within the last 20 messages
						for (let i = messageList.length-1; i > len; i--) {
							const m = messageList[i];
							if(m.type != TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION || !message.gift_recipients) continue;
							//If the message is a subgift from the same user and happened with the same tier
							//in the last 5s, merge it.
							if(m.tier == message.tier && m.user.id == message.user.id
							&& Date.now() - m.date < 5000) {
								if(!m.gift_recipients) m.gift_recipients = [];
								m.date = Date.now();//Update timestamp
								for (let i = 0; i < message.gift_recipients.length; i++) {
									m.gift_recipients.push(message.gift_recipients[i]);
								}
								return;
							}
						}
					}
					break;
				}

				//Users joined, check if any need to be autobanned
				case TwitchatDataTypes.TwitchatMessageType.JOIN: {
					for (let i = 0; i < message.users.length; i++) {
						const user = message.users[i];
						const rule = Utils.isAutomoded(user.displayName, user, message.channel_id);
						if(rule != null) {
							if(user.platform == "twitch") {
								TwitchUtils.banUser(user, message.channel_id, undefined, `banned by Twitchat's automod because nickname matched an automod rule`);
							}
							//Most message on chat to alert the stream
							const mess:TwitchatDataTypes.MessageAutobanJoinData = {
								platform:user.platform,
								channel_id: message.channel_id,
								type:TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN,
								date:Date.now(),
								id:Utils.getUUID(),
								user,
								rule:rule,
							};
							this.addMessage(mess);
						}
					}
					break;
				}

				//New follower
				case TwitchatDataTypes.TwitchatMessageType.FOLLOWING: {
					
					sUsers.flagAsFollower(message.user, message.channel_id)

					//Merge all followbot events into one
					if(message.followbot === true) {
						const prevFollowbots:TwitchatDataTypes.MessageFollowingData[] = [];
						const deletedMessages:(TwitchatDataTypes.MessageFollowingData|TwitchatDataTypes.MessageFollowbotData)[] = [];
						let bulkMessage!:TwitchatDataTypes.MessageFollowbotData;
						
						//Search for any existing followbot event, delete them and group
						//them into a single followbot alert with all the users in it
						//Only search within the last 100 messages
						const maxIndex = Math.max(0, messageList.length - 100);
						let postMessage = true;
						for (let i = messageList.length-1; i >= maxIndex; i--) {
							const m = messageList[i];
							//Found a follow event, delete it
							if(m.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING
							&& m.followbot === true
							&& m.platform == message.platform) {
								m.deleted = true;
								deletedMessages.push(m);
								prevFollowbots.push(m);
								messageList.splice(i, 1);
								i--;
							}else
							//Found an existing bulk message not older than 1min, keep it aside
							if(m.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWBOT_LIST
							&& m.date > Date.now() - 1 * 60 * 1000
							&& m.platform == message.platform) {
								bulkMessage = m;
								if(i == messageList.length-1) {
									//Message already at the bottom, no need to delete/repost it
									postMessage = false;
								}else{
									postMessage = true;
									deletedMessages.push(m);
									messageList.splice(i, 1);//remove it, it will be pushed again later
									i--;
								}
							}
						}
						if(!bulkMessage) {
							bulkMessage = reactive({
								id:Utils.getUUID(),
								date:Date.now(),
								platform:message.platform,
								type:TwitchatDataTypes.TwitchatMessageType.FOLLOWBOT_LIST,
								users:[],
							});
						}
						if(prevFollowbots.length > 0) {
							bulkMessage.users = bulkMessage.users.concat(prevFollowbots.map(v=>v.user));
						}
						bulkMessage.date = Date.now();
						bulkMessage.users.push(message.user);
						message = bulkMessage;

						//Broadcast DELETE events
						while(deletedMessages.length > 0) {
							const m = deletedMessages.pop();
							if(!m) continue;
							EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:false}));
						}
						if(!postMessage) return;
					}else{
						const wsMessage = {
							user:{
								id: message.user.id,
								login: message.user.login,
								displayName: message.user.displayName,
							}
						}
						PublicAPI.instance.broadcast(TwitchatEvent.FOLLOW, wsMessage);
					}
					break;
				}

				//Request to clear chat
				case TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT: {
					if(message.channel_id) this.delChannelMessages(message.channel_id);
					break;
				}

				//Notice
				case TwitchatDataTypes.TwitchatMessageType.NOTICE: {
					switch(message.noticeId) {
						case TwitchatDataTypes.TwitchatNoticeType.BAN:
						case TwitchatDataTypes.TwitchatNoticeType.TIMEOUT:
							this.delUserMessages((message as TwitchatDataTypes.MessageModerationAction).user.id);
							break;
					}
					break;
				}
			}


			//Apply automod rules if requested
			if(sAutomod.params.enabled === true) {
				if( message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				|| message.type == TwitchatDataTypes.TwitchatMessageType.CHEER
				|| message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION
				|| message.type == TwitchatDataTypes.TwitchatMessageType.REWARD
				|| message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING
				|| message.type == TwitchatDataTypes.TwitchatMessageType.RAID) {
					if(sAutomod.params.banUserNames === true && !message.user.channelInfo[message.channel_id].is_banned) {
						//Check if nickname passes the automod
						const rule = Utils.isAutomoded(message.user.displayName, message.user, message.channel_id);
						if(rule) {
							if(message.user.platform == "twitch") {
								message.user.channelInfo[message.channel_id].is_banned = true;
								TwitchUtils.banUser(message.user, message.channel_id, undefined, "banned by Twitchat's automod because nickname matched an automod rule");
							}
							//Most message on chat to alert the stream
							const mess:TwitchatDataTypes.MessageAutobanJoinData = {
								platform:"twitchat",
								channel_id: message.channel_id,
								type:TwitchatDataTypes.TwitchatMessageType.AUTOBAN_JOIN,
								date:Date.now(),
								id:Utils.getUUID(),
								user:message.user,
								rule:rule,
							};
							this.addMessage(mess);
							return;
						}
					}

					//Check if message passes the automod
					if(message.type != TwitchatDataTypes.TwitchatMessageType.FOLLOWING
					&& message.type != TwitchatDataTypes.TwitchatMessageType.RAID
					&& message.message) {
						const rule = Utils.isAutomoded(message.message, message.user, message.channel_id);
						if(rule) {
							if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
								//If rule does not requests to be applied only to first time chatters
								//or if it's a first time chatter
								if(rule.firstTimeChatters !== true || 
									(rule.firstTimeChatters === true &&
										(
										message.twitch_isFirstMessage ||
										message.twitch_isPresentation
										)
									)
								) {
									message.automod = rule;
									if(message.user.platform == "twitch") {
										TwitchUtils.deleteMessages(message.channel_id, message.id);
										//No need to call this.deleteMessageByID(), IRC will call it when request completes
									}

									//Start emergency if requested
									if(rule.emergency === true && sEmergency.params.enabled === true) {
										sEmergency.setEmergencyMode(true);
									}
								}
							}
						}
					}
				}
			}
			
			//Limit history size
			const maxMessages = this.realHistorySize;
			if(messageList.length >= maxMessages) {
				// const firstMess = messages[0];
				// if(firstMess.type == "message") {
				// 	//reduce memory leak risks
				// 	firstMess.answers = [];
				// 	delete firstMess.answersTo;
				// }
				messageList = messageList.slice(-maxMessages);
			}

			//Only save messages to history if requested
			if(TwitchatDataTypes.DisplayableMessageTypes[message.type] === true) {
				messageList.push( message );
				EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.ADD_MESSAGE, message));
			}

			const e = Date.now();
			// console.log(messageList.length, e-s);
			if(e-s > 50) console.log("Message #"+ message.id, "took more than 50ms to be processed! - Type:\""+message.type+"\"", " - Sent at:"+message.date);
			
			if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION && message.is_gift) {
				//If it's a subgift, wait a little before calling the trigger as subgifts do not
				//come all at once but sequentially.
				//We wait a second to give them time to arrive so the trigger has all the
				//recipients references.
				clearTimeout(subgiftTriggerTimeout);
				subgiftTriggerTimeout = setTimeout(()=>{
					TriggerActionHandler.instance.onMessage(message);
				}, 1000);
			}else{
				TriggerActionHandler.instance.onMessage(message);
			}
		},
		
		deleteMessage(message:TwitchatDataTypes.ChatMessageTypes, deleter?:TwitchatDataTypes.TwitchatUser, callEndpoint = true) { 
			this.deleteMessageByID(message.id, deleter, callEndpoint)
		},
		
		deleteMessageByID(messageID:string, deleter?:TwitchatDataTypes.TwitchatUser, callEndpoint:boolean = true) { 
			//Start from most recent messages to find it faster
			for (let i = messageList.length-1; i > -1; i--) {
				const m = messageList[i];
				if(messageID == m.id) {
					m.deleted = true;
					if(m.type == TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD) {
						//Called if closing an ad
						messageList.splice(i, 1);
						EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:false}));
					}else if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						const wsMessage = {
							channel:m.channel_id,
							message:m.message,
							user:{
								id:m.user.id,
								login:m.user.login,
								displayName:m.user.displayName,
							}
						}
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, wsMessage);
	
						//Don't keep automod form message
						if(m.twitch_automod) {
							messageList.splice(i, 1);
						}

						if(deleter) {
							m.deletedData = { deleter };
						}
						
						if(callEndpoint && m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
							TwitchUtils.deleteMessages(m.channel_id, m.id);
						}
					}
					
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:false}));
					break;
				}
			}
		},

		delUserMessages(uid:string) {
			for (let i = 0; i < messageList.length; i++) {
				const m = messageList[i];
				if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				&& m.user.id == uid
				&& !m.deleted) {
					//Send public API events by batches of 5 to avoid clogging it
					setTimeout(()=> {
						const wsMessage = {
							channel:m.channel_id,
							message:m.message,
							user:{
								id:m.user.id,
								login:m.user.login,
								displayName:m.user.displayName,
							}
						}
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, wsMessage);
					}, Math.floor(i/5)*50)

					m.deleted = true;
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:false}));
				}
			}
		},

		delChannelMessages(channelId:string):void {
			for (let i = 0; i < messageList.length; i++) {
				const m = messageList[i];
				if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				&& m.channel_id == channelId
				&& !m.deleted) {
					//Send public API events by batches of 5 to avoid clogging it
					setTimeout(()=> {
						const wsMessage = {
							channel:m.channel_id,
							message:m.message,
							user:{
								id:m.user.id,
								login:m.user.login,
								displayName:m.user.displayName,
							}
						}
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, wsMessage);
					}, Math.floor(i/5)*50)

					m.deleted = true;
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:false}));
				}
			}
		},

		setEmoteSelectorCache(payload:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchatDataTypes.Emote[]}[]) { this.emoteSelectorCache = payload; },

		closeWhispers( userID:string) {
			delete this.whispers[userID];
		},

		doSearchMessages(value:string) { this.$state.searchMessages = value; },

		updateBotMessage(value:{key:TwitchatDataTypes.BotMessageField, enabled:boolean, message:string}) {
			this.botMessages[value.key].enabled = value.enabled;
			this.botMessages[value.key].message = value.message;
			DataStore.set(DataStore.BOT_MESSAGES, this.botMessages);
		},

		async shoutout(user:TwitchatDataTypes.TwitchatUser):Promise<void> {
			let message:string|null = null;
			let streamTitle = "";
			let streamCategory = "";
			if(user && user.platform == "twitch") {
				const userInfos = await TwitchUtils.loadUserInfo(user.id? [user.id] : undefined, user.login? [user.login] : undefined);
				if(userInfos?.length > 0) {
					const userLoc = userInfos[0];
					const channelInfo = await TwitchUtils.loadChannelInfo([userLoc.id]);
					message = this.botMessages.shoutout.message;
					streamTitle = channelInfo[0].title;
					streamCategory = channelInfo[0].game_name;
					if(!streamTitle) streamTitle = StoreProxy.i18n.t("error.no_stream");
					if(!streamCategory) streamCategory = StoreProxy.i18n.t("error.no_stream");
					message = message.replace(/\{USER\}/gi, userLoc.display_name);
					message = message.replace(/\{URL\}/gi, "twitch.tv/"+userLoc.login);
					message = message.replace(/\{TITLE\}/gi, streamTitle);
					message = message.replace(/\{CATEGORY\}/gi, streamCategory);
					user.avatarPath = userLoc.profile_image_url;
				}
			}
			if(message){
				await MessengerProxy.instance.sendMessage(message);
				
				if(user) {
					const so:TwitchatDataTypes.MessageShoutoutTwitchatData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:user.platform,
						type:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT_TWITCHAT,
						user,
						stream:{
							title:streamTitle,
							category:streamCategory,
						},
						viewerCount:StoreProxy.stream.playbackState?.viewers ?? 0,
					};
					this.addMessage(so);
				}
			}else{
				//Warn user doesn't exist
				StoreProxy.main.alertData = "User "+user+" doesn't exist.";
			}
		},
		
		setChatHighlightOverlayParams(params:TwitchatDataTypes.ChatHighlightParams) {
			this.chatHighlightOverlayParams = params;
			DataStore.set(DataStore.CHAT_HIGHLIGHT_PARAMS, params);
		},
		
		setSpoilerParams(params:TwitchatDataTypes.SpoilerParamsData) {
			this.spoilerParams = params;
			DataStore.set(DataStore.SPOILER_PARAMS, params);
		},
		
		pinMessage(message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData) {
			message.is_pinned = true;
			this.pinedMessages.push(message);
			EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.PIN_MESSAGE, message));
		},
		
		unpinMessage(message:TwitchatDataTypes.MessageChatData | TwitchatDataTypes.MessageWhisperData) {
			this.pinedMessages.forEach((v, index)=> {
				if(v.id == message.id) {
					message.is_pinned = false;
					this.pinedMessages.splice(index, 1);
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.UNPIN_MESSAGE, message));
				}
			})
		},
		
		async highlightChatMessageOverlay(message:TwitchatDataTypes.ChatMessageTypes|null) {
			if(message && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && message.user.id) {
				if(message.platform == "twitch"
				&& (!message.user.displayName || !message.user.avatarPath || !message.user.login)) {
					//Get user info
					const [twitchUser] = await TwitchUtils.loadUserInfo([message.user.id]);
					message.user.avatarPath = twitchUser.profile_image_url;
					//Populate more info just in case some are missing
					message.user.login = twitchUser.login;
					message.user.displayName = twitchUser.display_name;
				}

				let info:TwitchatDataTypes.ChatHighlightInfo = {
					message:message.message_html,
					user:message.user,
					params:this.chatHighlightOverlayParams
				};
				this.isChatMessageHighlighted = true;

				const m:TwitchatDataTypes.MessageChatHighlightData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:message.user.platform,
					type:TwitchatDataTypes.TwitchatMessageType.CHAT_HIGHLIGHT,
					info,
				};
				this.addMessage(m);
				PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (info as unknown) as JsonObject);
			}else{
				this.isChatMessageHighlighted = false;
			}
			
		},

		async flagSuspiciousMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number):Promise<void> {
			const list = this.messages;
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.id == data.message_id && m.type == "message") {
					if(data.low_trust_user.shared_ban_channel_ids?.length > 0) {
						const users = await TwitchUtils.loadUserInfo(data.low_trust_user.shared_ban_channel_ids);
						m.twitch_sharedBanChannels = users?.map(v=> { return {id:v.id, login:v.login}}) ?? [];
					}
					m.twitch_isSuspicious = true;
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, {message:m, force:false}));
					return;
				}
			}

			//If reaching this point, it's most probably because pubsub sent us the
			//event before receiving message on IRC. Wait a little and try again
			if(retryCount != 20) {
				retryCount = retryCount? retryCount++ : 1;
				setTimeout(()=>{
					this.flagSuspiciousMessage(data, retryCount);
				}, 100);
			}
		},
	} as IChatActions
	& ThisType<IChatActions
		& UnwrapRef<IChatState>
		& _StoreWithState<"chat", IChatState, IChatGetters, IChatActions>
		& _StoreWithGetters<IChatGetters>
		& PiniaCustomProperties
	>,
})