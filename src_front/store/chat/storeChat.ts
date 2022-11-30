import MessengerProxy from '@/messaging/MessengerProxy'
import DataStore from '@/store/DataStore'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import ChatCypherPlugin from '@/utils/ChatCypherPlugin'
import PublicAPI from '@/utils/PublicAPI'
import SchedulerHelper from '@/utils/SchedulerHelper'
import TriggerActionHandler from '@/utils/TriggerActionHandler'
import type { PubSubDataTypes } from '@/utils/twitch/PubSubDataTypes'
import TwitchUtils from '@/utils/twitch/TwitchUtils'
import TwitchatEvent from '@/events/TwitchatEvent'
import Utils from '@/utils/Utils'
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket'
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { JsonObject } from 'type-fest'
import { reactive, type UnwrapRef } from 'vue'
import StoreProxy, { type IChatActions, type IChatGetters, type IChatState } from '../StoreProxy'
import EventBus from '@/events/EventBus'
import GlobalEvent from '@/events/GlobalEvent'
import { LoremIpsum } from "lorem-ipsum";

//Don't make this reactive, it kills performances on the long run
let messageList:TwitchatDataTypes.ChatMessageTypes[] = [];
let greetedUsers:{[key:string]:number} = {};
let greetedUsersInitialized:boolean = false;
let subgiftTriggerTimeout:number = -1;

export const storeChat = defineStore('chat', {
	state: () => ({
		searchMessages: "",
		realHistorySize: 10000,
		whispersUnreadCount: 0,
		pinedMessages: [],
		whispers: {},
		emoteSelectorCache: [],
		
		
		botMessages: {
			raffleStart: {
				enabled:true,
				message:"/announce 🎉🎉🎉 Raffle has started 🎉🎉🎉 Use {CMD} command to enter!",
			},
			raffle: {
				enabled:true,
				message:"/announce 🎉🎉🎉 Congrats @{USER} you won the raffle 🎉🎉🎉",
			},
			raffleJoin: {
				enabled:true,
				message:"VoteYea @{USER} you entered the raffle.",
			},
			bingoStart: {
				enabled:true,
				message:"/announce 🎉🎉🎉 Bingo has started 🎉🎉🎉 {GOAL}",
			},
			bingo: {
				enabled:true,
				message:"/announce 🎉🎉🎉 Congrats @{USER} you won the bingo 🎉🎉🎉",
			},
			shoutout: {
				enabled:true,
				message:"/announce Go checkout {USER} {URL} . Their last stream title was \"{TITLE}\" in category \"{CATEGORY}\".",
			},
			twitchatAd: {
				enabled:false,
				message:"/announcepurple Are you a Twitch streamer? I'm using GivePLZ twitchat.fr TakeNRG, a full featured chat alternative for streamers. Take a look at it if you wish KomodoHype",
			},
		},
		commands: [
			{
				id:"updates",
				cmd:"/updates",
				details:"Show latest Twitchat updates",
			},
			{
				id:"tip",
				cmd:"/tip",
				details:"Get a tip about Twitchat",
			},
			{
				id:"timerStart",
				cmd:"/timerStart",
				details:"Start a timer",
			},
			{
				id:"timerStop",
				cmd:"/timerStop",
				details:"Stop the timer",
			},
			{
				id:"countdown",
				cmd:"/countdown {(hh:)(mm:)ss}",
				details:"Start a countdown",
			},
			{
				id:"search",
				cmd:"/search {text}",
				details:"Search for a message by its content",
			},
			{
				id:"userinfo",
				cmd:"/user {user}",
				alias:"/userinfo {user}",
				details:"Opens a user's profile info",
			},
			{
				id:"raffle",
				cmd:"/raffle",
				details:"Start a raffle",
			},
			{
				id:"bingo",
				cmd:"/bingo {number|emote}",
				details:"Create a bingo session",
			},
			{
				id:"raid",
				cmd:"/raid {user}",
				details:"Raid someone",
			},
			{
				id:"so",
				cmd:"/so {user}",
				details:"Shoutout a user",
			},
			{
				id:"poll",
				cmd:"/poll {title}",
				details:"Start a poll",
				needChannelPoints:true,
			},
			{
				id:"chatsugg",
				cmd:"/chatsugg",
				details:"Start a chat suggestion",
			},
			{
				id:"prediction",
				cmd:"/prediction {title}",
				details:"Start a prediction",
				needChannelPoints:true,
			},
			{
				id:"tts",
				cmd:"/tts {user}",
				details:"Start reading the messages of a user",
				needTTS:true,
			},
			{
				id:"ttsoff",
				cmd:"/ttsoff {user}",
				details:"Stop reading the messages of a user",
				needTTS:true,
			},
			{
				id:"announce",
				cmd:"/announce {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"announceblue",
				cmd:"/announceblue {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"announcegreen",
				cmd:"/announcegreen {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"announceorange",
				cmd:"/announceorange {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"announcepurple",
				cmd:"/announcepurple {message}",
				details:"Makes an announcement",
				needChannelPoints:false,
			},
			{
				id:"commercial",
				cmd:"/commercial {duration}",
				details:"Starts an ad. Duration: 30, 60, 90, 120, 150 or 180",
				needChannelPoints:false,
			},
			{
				id:"vip",
				cmd:"/vip {user}",
				details:"Give VIP status to a user",
				needChannelPoints:true,
			},
			{
				id:"unvip",
				cmd:"/unvip {user}",
				details:"Remove VIP status from a user",
				needChannelPoints:true,
			},
			{
				id:"to",
				cmd:"/timeout {user} {duration} {reason}",
				details:"Ban a user temporarily",
			},
			{
				id:"ban",
				cmd:"/ban {user}",
				details:"Bans a user",
			},
			{
				id:"Unban",
				cmd:"/unban {user}",
				details:"Unban a user",
			},
			{
				id:"block",
				cmd:"/block {user}",
				details:"Block a user",
			},
			{
				id:"Unblock",
				cmd:"/unblock {user}",
				details:"Unblock a user",
			},
			{
				id:"Whisper",
				cmd:"/w {recipient} {message}",
				alias:"/whisper {recipient} {message}",
				details:"Send a whisper",
			}
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

			if(message.type == TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT) {
				messageList = [];
				return;
			}

			if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
			
				if(message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
					const correspondantId = message.user.id == sAuth.twitch.user.id? message.to.id : message.user.id
					if(!this.whispers[correspondantId]) this.whispers[correspondantId] = [];
					this.whispers[correspondantId].push(message);
					this.whispersUnreadCount ++;
					//TODO Broadcast to OBS-ws
					// const wsUser = {
					// 	id: data.tags['user-id'],
					// 	login: data.tags.username,
					// 	color: data.tags.color,
					// 	badges: data.tags.badges as {[key:string]:JsonObject | JsonArray | JsonValue},
					// 	'display-name': data.tags['display-name'],
					// 	'message-id': data.tags['message-id'],
					// }
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_WHISPER, {unreadCount:sChat.whispersUnreadCount, user:wsUser, message:"<not set for privacy reasons>"});
				}else if(message.user.greeted !== true
				&& (!greetedUsers[message.user.id] || greetedUsers[message.user.id] < Date.now())) {
					message.todayFirst = true;
					message.user.greeted = true;
					greetedUsers[message.user.id] = Date.now() + (1000 * 60 * 60 * 8);//expire after 8 hours
					DataStore.set(DataStore.GREET_HISTORY, greetedUsers, false);
				}
				
				// todayFirst:user.greeted===false,
				//Check if the message contains a mention
				if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				&& StoreProxy.params.appearance.highlightMentions.value === true) {
					const login = StoreProxy.auth.twitch.user.login;
					message.hasMention = login != null
										&& new RegExp("(^| |@)("+login+")($|\\s)", "gim")
										.test(message.message ?? "");
					if(message.hasMention) {
						message.highlightWord = login;
					}
				}

				//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
				if(ChatCypherPlugin.instance.isCyperCandidate(message.message)) {
					const original = message.message;
					message.message = message.message_html = await ChatCypherPlugin.instance.decrypt(message.message);
					message.cyphered = message.message != original;
				}
			}

			//If it's a raid, save it so we can do an SO with dedicated streamdeck button
			if(message.type == TwitchatDataTypes.TwitchatMessageType.RAID) sStream.lastRaider = message.user;


			//If it's a subgift, merge it with potential previous ones
			if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION && message.is_gift) {
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

			//Search in the last 30 messages if this message has already been sent
			//If so, just increment the previous one
			if(sParams.features.groupIdenticalMessage.value === true &&
			(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER)) {
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
						EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, m));
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

				//If it's a text message and user isn't a follower, broadcast to WS
				if(message.user.channelInfo[message.channel_id].is_following) {
					//TODO Broadcast to OBS-ws
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_NON_FOLLOWER, {message:wsMessage});
				}
	
				//Check if the message contains a mention
				if(message.hasMention) {
					//TODO Broadcast to OBS-ws
					// PublicAPI.instance.broadcast(TwitchatEvent.MENTION, {message:wsMessage});
				}
	
				//If it's the first message today for this user
				if(message.todayFirst === true) {
					//TODO Broadcast to OBS-ws
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST, {message:wsMessage});
				}
	
				//If it's the first message all time of the user
				if(message.twitch_isFirstMessage) {
					//TODO Broadcast to OBS-ws
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST_ALL_TIME, {message:wsMessage});
				}
				
				const cmd = message.message.trim().split(" ")[0].toLowerCase();

				//If a raffle is in progress, check if the user can enter
				const raffle = sRaffle.data;
				if(raffle && raffle.mode == "chat" && cmd == raffle.command.trim().toLowerCase()) {
					sRaffle.checkRaffleJoin(message);
				}

				//If a raffle is in progress, check if the user can enter
				if(sBingo.data?.winners?.length == 0) {
					sBingo.checkBingoWinner(message);
				}
	
				//If there's a suggestion poll and the timer isn't over
				const suggestionPoll = sChatSuggestion.data;
				if(suggestionPoll && cmd == suggestionPoll.command.toLowerCase().trim()) {
					sChatSuggestion.addChatSuggestion(message);
				}

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
			
			//People joined the chat, check if any need to be autobaned
			if(message.type == TwitchatDataTypes.TwitchatMessageType.JOIN) {
				for (let i = 0; i < message.users.length; i++) {
					const user = message.users[i];
					const rule = Utils.isAutomoded(user.displayName, user, message.channel_id);
					if(rule != null) {
						MessengerProxy.instance.sendMessage(user.platform, )
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
			}

			//If it's a following event
			if(message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING) {
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
						EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, m));
					}
					if(!postMessage) return;
				}else{
					// TODO Broadcast to OBS-ws
					const wsMessage = {
						display_name: message.user.displayName,
						username: message.user.login,
						user_id: message.user.id,
					}
					PublicAPI.instance.broadcast(TwitchatEvent.FOLLOW, {user:wsMessage});
				}

			}

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
								message.automod = rule;
								if(message.user.platform == "twitch") {
									TwitchUtils.deleteMessages(message.channel_id, message.id);
									//No need to call this.deleteMessageByID(), IRC will call it when request completes
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

			if(message.type == TwitchatDataTypes.TwitchatMessageType.PREDICTION) {
				PublicAPI.instance.broadcast(TwitchatEvent.PREDICTION, {prediction: (message as unknown) as JsonObject});
			}

			if(message.type == TwitchatDataTypes.TwitchatMessageType.POLL) {
				PublicAPI.instance.broadcast(TwitchatEvent.POLL, {poll: (message as unknown) as JsonObject});
			}

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
					}else if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						//TODO Broadcast to OBS-ws
						// const wsMessage = {
						// 	channel:m.channel,
						// 	message:m.message,
						// 	tags:m.tags,
						// }
						// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, {message:wsMessage});
	
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
					
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, m));
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
					//TODO Broadcast to OBS-ws
					// const wsMessage = {
					// 	channel:list[i].channel,
					// 	message:list[i].message,
					// 	tags:list[i].tags,
					// }
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, {message:wsMessage});

					m.deleted = true;
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.DELETE_MESSAGE, m));
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
					if(!streamTitle) streamTitle = "no stream found"
					if(!streamCategory) streamCategory = "no stream found"
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
					const trigger:TwitchatDataTypes.MessageShoutoutData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:user.platform,
						type:TwitchatDataTypes.TwitchatMessageType.SHOUTOUT,
						user,
						stream:{
							title:streamTitle,
							category:streamCategory,
						},
					};
					TriggerActionHandler.instance.onMessage(trigger)
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
		
		pinMessage(message:TwitchatDataTypes.ChatMessageTypes) { this.pinedMessages.push(message); },
		
		unpinMessage(message:TwitchatDataTypes.ChatMessageTypes) {
			this.pinedMessages.forEach((v, index)=> {
				if(v.id == message.id) {
					this.pinedMessages.splice(index, 1);
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
				PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (m as unknown) as JsonObject);
			}else{
				this.isChatMessageHighlighted = false;
			}
			
		},

		flagSuspiciousMessage(data:PubSubDataTypes.LowTrustMessage, retryCount?:number) {
			const sChat = storeChat();
			//Ignore message if user is "restricted"
			if(data.low_trust_user.treatment == 'RESTRICTED') return;

			const list = sChat.messages;
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.id == data.message_id && m.type == "message") {
					m.twitch_isSuspicious = true;
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
		
		async gigaSpam():Promise<void> {
			const lorem = new LoremIpsum({
				sentencesPerParagraph: { max: 8, min: 4 },
				wordsPerSentence: { max: 8, min: 2 }
			});
			const channel_id = StoreProxy.auth.twitch.user.id;

			const followers = (await TwitchUtils.getFollowers(channel_id, 100));
			while(followers.length<50) {
				const id = Math.round(Math.random()*99999999).toString();
				followers.push({
					from_id:id,
					from_login:"",
					from_name:"",
					to_id:channel_id,
					to_login:"",
					to_name:"",
					followed_at:"",
				});
			}

			const users:TwitchatDataTypes.TwitchatUser[] = [];
			followers.forEach(v=> {
				const u = StoreProxy.users.getUserFrom("twitch", channel_id, v.from_id, v.from_login, v.from_name, undefined, true);
				users.push(u);
			})

			let mess!:TwitchatDataTypes.MessageChatData;
			for (let i = 0; i < this.realHistorySize; i++) {
				let message = lorem.generateSentences(Math.round(Math.random()*2) + 1);
				mess = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					user: Utils.pickRand(users),
					channel_id,
					type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					message,
					message_html:message,
					answers:[],
				};
				messageList.push(mess);
				if(i >= this.realHistorySize-50) {
					EventBus.instance.dispatchEvent(new GlobalEvent(GlobalEvent.ADD_MESSAGE, mess));
				}
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