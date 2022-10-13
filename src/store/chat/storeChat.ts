import MessengerProxy from '@/messaging/MessengerProxy'
import DataStore from '@/store/DataStore'
import type { TwitchDataTypes } from '@/types/twitch/TwitchDataTypes'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import PublicAPI from '@/utils/PublicAPI'
import SchedulerHelper from '@/utils/SchedulerHelper'
import TriggerActionHandler from '@/utils/TriggerActionHandler'
import TwitchUtils from '@/utils/twitch/TwitchUtils'
import TwitchatEvent from '@/utils/TwitchatEvent'
import UserSession from '@/utils/UserSession'
import Utils from '@/utils/Utils'
import VoicemodWebSocket from '@/utils/voice/VoicemodWebSocket'
import { defineStore, type PiniaCustomProperties, type _GettersTree, type _StoreWithGetters, type _StoreWithState } from 'pinia'
import type { JsonObject } from 'type-fest'
import type { UnwrapRef } from 'vue'
import StoreProxy, { type IChatActions, type IChatGetters, type IChatState } from '../StoreProxy'

export const storeChat = defineStore('chat', {
	state: () => ({
		searchMessages: "",
		realHistorySize: 5000,
		whispersUnreadCount: 0,
		messages: [],
		activityFeed: [],
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
				cmd:"/userinfo {user}",
				alias:"/user {user}",
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
				id:"unban",
				cmd:"/unban {user}",
				details:"Unban a user",
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
				id:"block",
				cmd:"/block {user}",
				details:"Block a user",
			},
			{
				id:"Unblock",
				cmd:"/unblock {user}",
				details:"Unblock a user",
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
	} as IChatGetters
	& ThisType<UnwrapRef<IChatState> & _StoreWithGetters<IChatGetters> & PiniaCustomProperties>
	& _GettersTree<IChatState>,



	actions: {

		sendTwitchatAd(adType:TwitchatDataTypes.TwitchatAdStringTypes = -1) {
			if(adType == -1) {
				let possibleAds:TwitchatDataTypes.TwitchatAdStringTypes[] = [];
				if(!UserSession.instance.isDonor || UserSession.instance.donorLevel < 2) {
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
					//Add 2 empty slots for every content type available
					//to reduce chances to actually get an "ad"
					const len = 2*possibleAds.length;
					for (let i = 0; i < len; i++) possibleAds.push(-1);
				}
		
				adType = Utils.pickRand(possibleAds);
				// contentID = TwitchatAdTypes.UPDATES;//TODO comment this line
				if(adType == -1) return;
			}

			const list = this.messages.concat();
			list .push( {
				platform:"twitch",
				id:Utils.getUUID(),
				date:Date.now(),
				type:TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD,
				adType,
			} );
			this.messages = list;
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

			if(message.type == TwitchatDataTypes.TwitchatMessageType.CLEAR_CHAT) {
				this.messages = [];
				return;
			}
			
			if(message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER) {
				//TODO sending a whisper increments the unread count and creates a conversation with ourself, fix that
				if(!this.whispers[message.user.id]) this.whispers[message.user.id] = [];
				this.whispers[message.user.id].push(message);
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
			}

			//make a copy to avoid triggering external watchers on temporary
			//modifications
			let messages = this.messages.concat();
			
			//Limit history size
			const maxMessages = this.realHistorySize;
			if(messages.length >= maxMessages) {
				messages = messages.slice(-maxMessages);
			}

			//If it's a raid, save it so we can do an SO with dedicated streamdeck button
			if(message.type == TwitchatDataTypes.TwitchatMessageType.RAID) sStream.lastRaider = message.user;

			//If it's a follow event, flag user as a follower
			if(message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING) sUsers.flagAsFollower(message.user, message.channel_id);

			//If it's a subgift, merge it with potential previous ones
			if(message.type == TwitchatDataTypes.TwitchatMessageType.SUBSCRIPTION && message.is_gift) {
				for (let i = 0; i < messages.length; i++) {
					const m = messages[i];
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

			//Search in the last 50 messages if this message has already been sent
			//If so, just increment the previous one
			if(sParams.features.groupIdenticalMessage.value === true &&
			(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
			|| message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER)) {
				const len = messages.length;
				const end = Math.max(0, len - 50);
				for (let i = len-1; i > end; i--) {
					const m = messages[i];
					if(m.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE && m.type != TwitchatDataTypes.TwitchatMessageType.WHISPER) continue;
					if(m.user.id == message.user.id
					&& (m.date > Date.now() - 30000 || i > len-20)//"i > len-20" more or less means "if message is still visible on screen"
					&& message.message.toLowerCase() == m.message.toLowerCase()
					&& message.type == m.type) {
						if(!m.occurrenceCount) m.occurrenceCount = 0;
						m.occurrenceCount ++;
						//Update timestamp
						m.date = Date.now();
						//Bring it back to bottom
						messages.splice(i, 1);
						messages.push(m);
						this.messages = messages;	
						return;
					}
				}
			}
			
			if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
				message.user.channelInfo[message.channel_id].messageHistory.push(message);
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
						let trigger:TwitchatDataTypes.MessageChatAlertData = {
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

				TriggerActionHandler.instance.onMessage(message);
			}
			
			//People joined the chat, check if any needs to be autobaned
			if(message.type == TwitchatDataTypes.TwitchatMessageType.JOIN) {
				for (let i = 0; i < message.users.length; i++) {
					const user = message.users[i];
					const rule = Utils.isAutomoded(user.displayName, user, message.channel_id);
					if(rule != null) {
						MessengerProxy.instance.sendMessage(user.platform, )
						if(user.platform == "twitch") {
							TwitchUtils.banUser(user.id, message.channel_id, undefined, `banned by Twitchat's automod because nickname matched an automod rule`);
						}
						//Most message on chat to alert the stream
						const mess:TwitchatDataTypes.MessageAutobanJoinData = {
							platform:"twitchat",
							channel_id: message.channel_id,
							type:"autoban_join",
							date:Date.now(),
							id:Utils.getUUID(),
							user,
							rule:rule,
						};
						this.addMessage(mess);
					}
				}
			}

			if(message.type == TwitchatDataTypes.TwitchatMessageType.FOLLOWING) {
				//TODO Broadcast to OBS-ws
				// const wsMessage = {
				// 	display_name: data.display_name,
				// 	username: data.username,
				// 	user_id: data.user_id,
				// }
				// PublicAPI.instance.broadcast(TwitchatEvent.FOLLOW, {user:wsMessage});
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
						let rule = Utils.isAutomoded(message.user.displayName, message.user, message.channel_id);
						if(rule) {
							if(message.user.platform == "twitch") {
								message.user.channelInfo[message.channel_id].is_banned = true;
								TwitchUtils.banUser(message.user.id, message.channel_id, undefined, "banned by Twitchat's automod because nickname matched an automod rule");
							}
							//Most message on chat to alert the stream
							const mess:TwitchatDataTypes.MessageAutobanJoinData = {
								platform:"twitchat",
								channel_id: message.channel_id,
								type:"autoban_join",
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
						let rule = Utils.isAutomoded(message.message, message.user, message.channel_id);
						if(rule) {
							if(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
								message.automod = rule;
								if(message.user.platform == "twitch") {
									TwitchUtils.deleteMessages(message.id);
								}
							}
						}
					}
				}
			}

			//Messages to push on activity feed
			//Don't use indexOf() instead of includes(). Performances are MUCH better with includes (like 12x faster)
			if(TwitchatDataTypes.ActivityFeedMessageTypes.includes(message.type)
			//Special case for highlighted and elevated messages
			|| (message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && (message.twitch_isHighlighted || message.elevatedInfo))
			//Special case for notice types
			|| (message.type == TwitchatDataTypes.TwitchatMessageType.NOTICE && TwitchatDataTypes.ActivityFeedNoticeTypes.includes(message.noticeId))
			) {
				this.activityFeed.push(message);
			}

			messages.push( message );
			this.messages = messages;
		},
		
		deleteMessage(messageId:string, deleter?:TwitchatDataTypes.TwitchatUser) { 
			const list = this.messages.concat();
			const keepDeletedMessages = StoreProxy.params.filters.keepDeletedMessages.value;
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(messageId == m.id) {
					m.deleted = true;
					if(m.type == TwitchatDataTypes.TwitchatMessageType.TWITCHAT_AD) {
						//Called if closing an ad
						list.splice(i, 1);
					}else if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE) {
						//TODO Broadcast to OBS-ws
						// const wsMessage = {
						// 	channel:m.channel,
						// 	message:m.message,
						// 	tags:m.tags,
						// }
						// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, {message:wsMessage});
	
						if(!m.twitch_automod//Don't keep automod form message
						&& keepDeletedMessages === true) {
							//Just flag as deleted but keep it
							if(deleter) {
								m.deletedData = { deleter };
							}
						}else{
							//Remove message from list
							list.splice(i, 1);
						}
					}
					break;
				}
			}
			this.messages = list;
		},

		delUserMessages(uid:string) {
			const keepDeletedMessages = StoreProxy.params.filters.keepDeletedMessages.value;
			const list = this.messages.concat();
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
				&& m.user.id == uid) {
					//TODO Broadcast to OBS-ws
					// const wsMessage = {
					// 	channel:list[i].channel,
					// 	message:list[i].message,
					// 	tags:list[i].tags,
					// }
					// PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, {message:wsMessage});

					//Delete message from list
					if(keepDeletedMessages === true) {
						m.deleted = true;
					}else{
						list.splice(i, 1);
						i--;
					}
				}
			}
			this.messages = list;
		},

		setEmoteSelectorCache(payload:{user:TwitchatDataTypes.TwitchatUser, emotes:TwitchDataTypes.Emote[]}[]) { this.emoteSelectorCache = payload; },

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
					const channelInfo = await TwitchUtils.loadChannelInfo([userInfos[0].id]);
					message = this.botMessages.shoutout.message;
					streamTitle = channelInfo[0].title;
					streamCategory = channelInfo[0].game_name;
					if(!streamTitle) streamTitle = "no stream found"
					if(!streamCategory) streamCategory = "no stream found"
					message = message.replace(/\{USER\}/gi, userInfos[0].display_name);
					message = message.replace(/\{URL\}/gi, "twitch.tv/"+userInfos[0].login);
					message = message.replace(/\{TITLE\}/gi, streamTitle);
					message = message.replace(/\{CATEGORY\}/gi, streamCategory);
				}
			}
			if(message){
				await MessengerProxy.instance.sendMessage(message);
				
				if(user) {
					const trigger:TwitchatDataTypes.MessageShoutoutData = {
						id:Utils.getUUID(),
						date:Date.now(),
						platform:user.platform,
						type: "shoutout",
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
			let data:TwitchatDataTypes.ChatHighlightInfo|null = null;
			if(message && message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE && message.user.id) {
				if(message.platform == "twitch"
				&& (!message.user.displayName || !message.user.avatarPath || !message.user.login)) {
					//Get user info
					let [twitchUser] = await TwitchUtils.loadUserInfo([message.user.id]);
					message.user.avatarPath = twitchUser.profile_image_url;
					//Populate more info just in case some are missing
					message.user.login = twitchUser.login;
					message.user.displayName = twitchUser.display_name;
				}
				data = {
					message:message.message_html,
					user:message.user,
					params:this.chatHighlightOverlayParams
				};
				this.isChatMessageHighlighted = true;

				const trigger:TwitchatDataTypes.MessageChatHighlightData = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:message.user.platform,
					type: "chat_highlight",
					info:message,
				};
				TriggerActionHandler.instance.onMessage(trigger);
			}else{
				this.isChatMessageHighlighted = false;
			}
			
			PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, data as JsonObject);
		},
	} as IChatActions
	& ThisType<IChatActions
		& UnwrapRef<IChatState>
		& _StoreWithState<"chat", IChatState, IChatGetters, IChatActions>
		& _StoreWithGetters<IChatGetters>
		& PiniaCustomProperties
	>,
})