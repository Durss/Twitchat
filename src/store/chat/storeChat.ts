import DataStore from '@/store/DataStore'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import type { TwitchDataTypes } from '@/types/TwitchDataTypes'
import IRCClient from '@/utils/IRCClient'
import type { ActivityFeedData, ChatMessageTypes, IRCEventData, IRCEventDataList } from '@/utils/IRCEventDataTypes'
import PublicAPI from '@/utils/PublicAPI'
import type { PubSubDataTypes } from '@/utils/PubSubDataTypes'
import TriggerActionHandler from '@/utils/TriggerActionHandler'
import TwitchatEvent from '@/utils/TwitchatEvent'
import TwitchCypherPlugin from '@/utils/TwitchCypherPlugin'
import TwitchUtils from '@/utils/TwitchUtils'
import UserSession from '@/utils/UserSession'
import Utils from '@/utils/Utils'
import { defineStore } from 'pinia'
import type { JsonObject } from 'type-fest'
import { storeParams } from '../params/storeParams'
import { storeMain } from '../storeMain'
import { storeStream } from '../stream/storeStream'
import { storeUsers } from '../users/storeUsers'

export const storeChat = defineStore('chat', {
	state: () => ({
		searchMessages: "",
		realHistorySize: 5000,
		whispersUnreadCount: 0 as number,
		messages: [] as ChatMessageTypes[],
		pinedMessages: [] as IRCEventDataList.Message[],
		activityFeed: [] as ActivityFeedData[],
		emoteSelectorCache: {} as {user:TwitchDataTypes.UserInfo, emotes:TwitchDataTypes.Emote[]}[],
		whispers: {} as  {[key:string]:IRCEventDataList.Whisper[]},
		
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
		} as TwitchatDataTypes.IBotMessage,
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
		] as TwitchatDataTypes.CommandData[],

		spoilerParams: {
			permissions:{
				broadcaster:true,
				mods:true,
				vips:false,
				subs:false,
				all:false,
				users:""
			},
		} as TwitchatDataTypes.SpoilerParamsData,

		isChatMessageHighlighted: false,
		chatHighlightOverlayParams: {
			position:"bl",
		} as TwitchatDataTypes.ChatHighlightOverlayData,
	}),



	getters: {
	},



	actions: {

		sendTwitchatAd(contentID:TwitchatDataTypes.TwitchatAdStringTypes = -1) {
			if(contentID == -1) {
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
				if(isNaN(lastUpdateRead) || lastUpdateRead < storeMain().latestUpdateIndex) {
					//Force last updates if any not read
					possibleAds = [TwitchatDataTypes.TwitchatAdTypes.UPDATES];
				}else{
					//Add 2 empty slots for every content type available
					//to reduce chances to actually get an "ad"
					const len = 2*possibleAds.length;
					for (let i = 0; i < len; i++) possibleAds.push(-1);
				}
		
				contentID = Utils.pickRand(possibleAds);
				// contentID = TwitchatAdTypes.UPDATES;//TODO comment this line
				if(contentID == -1) return;
			}

			const list = this.messages.concat();
			list .push( {
				type:"ad",
				channel:"#"+UserSession.instance.authToken.login,
				markedAsRead:false,
				contentID,
				tags:{id:"twitchatAd"+Math.random()}
			} );
			this.messages = list;
		},

		
		async addChatMessage(payload:IRCEventData) {
			const sParams = storeParams();
			const sUsers = storeUsers();

			let messages = this.messages.concat() as (IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper)[];
			
			const message = payload as IRCEventDataList.Message|IRCEventDataList.Highlight|IRCEventDataList.Whisper
			const uid:string|undefined = message?.tags['user-id'];
			const messageStr = message.type == "whisper"? message.params[1] : message.message;
			const wsMessage = {
				channel:message.channel,
				message:messageStr as string,
				tags:message.tags,
			}

			//Limit history size
			// const maxMessages = sParams.appearance.historySize.value;
			const maxMessages = this.realHistorySize;
			if(messages.length >= maxMessages) {
				messages = messages.slice(-maxMessages);
				this.messages = messages;
			}

			if(payload.type == "notice") {
				if((payload as IRCEventDataList.Notice).msgid == "usage_host") {
					const raids = (messages as IRCEventDataList.Highlight[]).filter(v => v.viewers != undefined);
					for (let i = 0; i < raids.length; i++) {
						if(raids[i].username?.toLowerCase() == (payload as IRCEventDataList.Notice).username?.toLowerCase()) {
							console.log("Already raided ! Ignore host event");
							return;
						}
					}
				}
			}else{
				
				const textMessage = payload as IRCEventDataList.Message;

				//If it's a subgift, merge it with potential previous ones
				if(payload.type == "highlight" && payload.recipient) {
					for (let i = 0; i < messages.length; i++) {
						const m = messages[i];
						if(m.type != "highlight") continue;
						//If the message is a subgift from the same user and happened
						//in the last 5s, merge it.
						if(m.methods?.plan && m.tags.login == payload.tags.login
						&& Date.now() - parseInt(m.tags['tmi-sent-ts'] as string) < 5000) {
							if(!m.subgiftAdditionalRecipents) m.subgiftAdditionalRecipents = [];
							m.tags['tmi-sent-ts'] = Date.now().toString();//Update timestamp
							m.subgiftAdditionalRecipents.push(payload.recipient as string);
							return;
						}
					}
				}

				//If it's a subgift, merge it with potential previous ones
				if(payload.type == "highlight" && payload.tags["msg-id"] == "raid") {
					storeStream().lastRaiderLogin = payload.username as string;
				}

				//Search in the last 50 messages if this message has already been sent
				//If so, just increment the previous one
				if(sParams.features.groupIdenticalMessage.value === true) {
					const len = messages.length;
					const end = Math.max(0, len - 50);
					for (let i = len-1; i > end; i--) {
						const mess = messages[i];
						const messageStr = mess.type == "whisper"? mess.params[1] : mess.message;
						if(mess.type == "message"
						&& uid == mess.tags['user-id']
						&& (parseInt(mess.tags['tmi-sent-ts'] as string) > Date.now() - 30000 || i > len-20)//"i > len-20" more or less means "if message is still visible on screen"
						&& textMessage.message == messageStr) {
							if(!mess.occurrenceCount) mess.occurrenceCount = 0;
							mess.occurrenceCount ++;
							mess.tags['tmi-sent-ts'] = Date.now().toString();//Update timestamp
							messages.splice(i, 1);
							messages.push(mess);
							this.messages = messages;	
							return;
						}
					}
				}
				
				//Check if user is following
				if(sParams.appearance.highlightNonFollowers.value === true) {
					if(uid && sUsers.followingStates[uid] == undefined) {
						TwitchUtils.getFollowState(uid, textMessage.tags['room-id']).then((res:boolean) => {
							sUsers.followingStates[uid] = res;
							sUsers.followingStatesByNames[message.tags.username?.toLowerCase()] = res;
						}).catch(()=>{/*ignore*/})
					}
				}

				//If it's a follow event, flag user as a follower
				if(payload.type == "highlight") {
					if(payload.tags['msg-id'] == "follow") {
						sUsers.followingStates[payload.tags['user-id'] as string] = true;
						sUsers.followingStatesByNames[message.tags.username?.toLowerCase()] = true;
					}
				}
				
				//Check for user's pronouns
				if(sParams.features.showUserPronouns.value === true) {
					if(uid && sUsers.pronouns[uid] == undefined && textMessage.tags.username) {
						TwitchUtils.getPronouns(uid, textMessage.tags.username).then((res: TwitchatDataTypes.Pronoun | null) => {
							if (res !== null) {
								sUsers.pronouns[uid] = res.pronoun_id;
							}else{
								sUsers.pronouns[uid] = false;
							}
								
						}).catch(()=>{/*ignore*/})
					}
				}
				
				//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
				if(TwitchCypherPlugin.instance.isCyperCandidate(textMessage.message)) {
					const original = textMessage.message;
					textMessage.message = await TwitchCypherPlugin.instance.decrypt(textMessage.message);
					textMessage.cyphered = textMessage.message != original;
				}
				
				//If message is an answer, set original message's ref to the answer
				//Called when using the "answer feature" on twitch chat
				if(textMessage.tags && textMessage.tags["reply-parent-msg-id"]) {
					let original:IRCEventDataList.Message | null = null;
					const reply:IRCEventDataList.Message | null = textMessage;
					//Search for original message the user answered to
					for (let i = 0; i < messages.length; i++) {
						const c = messages[i] as IRCEventDataList.Message;
						if(c.tags.id === textMessage.tags["reply-parent-msg-id"]) {
							original = c;
							break;
						}
					}
	
					if(reply && original) {
						if(original.answerTo) {
							reply.answerTo = original.answerTo;
							if(original.answerTo.answers) {
								original.answerTo.answers.push( textMessage );
							}
						}else{
							reply.answerTo = original;
							if(!original.answers) original.answers = [];
							original.answers.push( textMessage );
						}
					}
				}else{
					//If there's a mention, search for last messages within
					//a max timeframe to find if the message may be a reply to
					//a message that was sent by the mentionned user
					if(/@\w/gi.test(textMessage.message)) {
						// console.log("Mention found");
						const ts = Date.now();
						const timeframe = 5*60*1000;//Check if a massage answers another within this timeframe
						const matches = textMessage.message.match(/@\w+/gi) as RegExpMatchArray;
						for (let i = 0; i < matches.length; i++) {
							const match = matches[i].replace("@", "").toLowerCase();
							// console.log("Search for message from ", match);
							const candidates = messages.filter(m => m.tags.username == match);
							//Search for oldest matching candidate
							for (let j = 0; j < candidates.length; j++) {
								const c = candidates[j] as IRCEventDataList.Message;
								// console.log("Found candidate", c);
								if(ts - parseInt(c.tags['tmi-sent-ts'] as string) < timeframe) {
									// console.log("Timeframe is OK !");
									if(c.answers) {
										//If it's the root message of a conversation
										c.answers.push( textMessage );
										textMessage.answerTo = c;
									}else if(c.answerTo && c.answerTo.answers) {
										//If the messages answers to a message itself answering to another message
										c.answerTo.answers.push( textMessage );
										textMessage.answerTo = c.answerTo;
									}else{
										//If message answers to a message not from a conversation
										textMessage.answerTo = c;
										if(!c.answers) c.answers = [];
										c.answers.push( textMessage );
									}
									break;
								}
							}
						}
					}
				}

				//If it's a text message and user isn't a follower, broadcast to WS
				if(payload.type == "message" && uid) {
					if(sUsers.followingStates[uid] === false) {
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_NON_FOLLOWER, {message:wsMessage});
					}
				}

				//Check if the message contains a mention
				if(textMessage.message && sParams.appearance.highlightMentions.value === true) {
					textMessage.hasMention = UserSession.instance.authToken.login != null
					&& new RegExp("(^| |@)("+UserSession.instance.authToken.login.toLowerCase()+")($|\\s)", "gim").test(textMessage.message.toLowerCase());
					if(textMessage.hasMention) {
						//Broadcast to OBS-Ws
						PublicAPI.instance.broadcast(TwitchatEvent.MENTION, {message:wsMessage});
					}
				}
			}

			//If it's a text message and user isn't a follower, broadcast to WS
			if(message.firstMessage === true)		PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST, {message:wsMessage});
			//If it's a text message and it's the all-time first message
			if(message.tags['first-msg'] === true)	PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_FIRST_ALL_TIME, {message:wsMessage});

			//Push some messages to activity feed
			if(payload.type == "highlight"
			|| payload.type == "poll"
			|| payload.type == "prediction"
			|| payload.type == "bingo"
			|| payload.type == "raffle"
			|| payload.type == "countdown"
			|| payload.type == "hype_train_end"
			|| (
				sParams.features.keepHighlightMyMessages.value === true
				&& payload.type == "message"
				&& (payload as IRCEventDataList.Message).tags["msg-id"] === "highlighted-message"
			)
			|| (payload as IRCEventDataList.Commercial).tags["msg-id"] === "commercial") {
				this.activityFeed.push(payload as ActivityFeedData);
			}

			messages.push( message );
			this.messages = messages;
		},
		
		delChatMessage(messageId:string, deleteData?:PubSubDataTypes.ModerationData) { 
			const keepDeletedMessages = storeParams().filters.keepDeletedMessages.value;
			const list = (this.messages.concat() as (IRCEventDataList.Message | IRCEventDataList.TwitchatAd)[]);
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(messageId == m.tags.id) {
					if(m.type == "ad") {
						//Called if closing an ad
						list.splice(i, 1);
					}else{
						//Broadcast to OBS-ws
						const wsMessage = {
							channel:m.channel,
							message:m.message,
							tags:m.tags,
						}
						PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, {message:wsMessage});
	
						if(keepDeletedMessages === true && !m.automod) {
							//Just flag as deleted so its render is faded
							m.deleted = true;
							m.deletedData = deleteData;
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

		delUserMessages(username:string) {
			username = username.toLowerCase()
			const keepDeletedMessages = storeParams().filters.keepDeletedMessages.value;
			const list = (this.messages.concat() as IRCEventDataList.Message[]);
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.tags.username?.toLowerCase() == username && m.type == "message") {
					//Broadcast to OBS-ws
					const wsMessage = {
						channel:list[i].channel,
						message:list[i].message,
						tags:list[i].tags,
					}
					PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_DELETED, {message:wsMessage});

					//Delete message from list
					if(keepDeletedMessages === true) {
						list[i].deleted = true;
					}else{
						list.splice(i, 1);
						i--;
					}
				}
			}
			this.messages = list;
		},

		setEmoteSelectorCache(payload:{user:TwitchDataTypes.UserInfo, emotes:TwitchDataTypes.Emote[]}[]) { this.emoteSelectorCache = payload; },

		closeWhispers( userID:string) {
			const whispers = this.whispers as {[key:string]:IRCEventDataList.Whisper[]};
			delete whispers[userID];
			this.whispers = whispers;
		},

		doSearchMessages(value:string) { this.$state.searchMessages = value; },

		updateBotMessage(value:{key:TwitchatDataTypes.BotMessageField, enabled:boolean, message:string}) {
			this.botMessages[value.key].enabled = value.enabled;
			this.botMessages[value.key].message = value.message;
			DataStore.set(DataStore.BOT_MESSAGES, this.botMessages);
		},

		async shoutout(username:string) {
			username = username.trim().replace(/^@/gi, "");
			const userInfos = await TwitchUtils.loadUserInfo(undefined, [username]);
			if(userInfos?.length > 0) {
				const channelInfo = await TwitchUtils.loadChannelInfo([userInfos[0].id]);
				let message = this.botMessages.shoutout.message
				let streamTitle = channelInfo[0].title;
				let category = channelInfo[0].game_name;
				if(!streamTitle) streamTitle = "no stream found"
				if(!category) category = "no stream found"
				message = message.replace(/\{USER\}/gi, userInfos[0].display_name);
				message = message.replace(/\{URL\}/gi, "twitch.tv/"+userInfos[0].login);
				message = message.replace(/\{TITLE\}/gi, streamTitle);
				message = message.replace(/\{CATEGORY\}/gi, category);
				await IRCClient.instance.sendMessage(message);
				
				const trigger:TwitchatDataTypes.ShoutoutTriggerData = {
					type: "shoutout",
					user:userInfos[0],
					stream:channelInfo[0],
				};
				TriggerActionHandler.instance.onMessage(trigger)
			}else{
				//Warn user doesn't exist
				storeMain().alert = "User "+username+" doesn't exist.";
			}
		},
		
		setChatHighlightOverlayParams(params:TwitchatDataTypes.ChatHighlightOverlayData) {
			this.chatHighlightOverlayParams = params;
			DataStore.set(DataStore.CHAT_HIGHLIGHT_PARAMS, params);
		},
		
		setSpoilerParams(params:TwitchatDataTypes.SpoilerParamsData) {
			this.spoilerParams = params;
			DataStore.set(DataStore.SPOILER_PARAMS, params);
		},
		
		pinMessage(message:IRCEventDataList.Message) { this.pinedMessages.push(message); },
		
		unpinMessage(message:IRCEventDataList.Message) {
			this.pinedMessages.forEach((v, index)=> {
				if(v.tags.id == message.tags.id) {
					this.pinedMessages.splice(index, 1);
				}
			})
		},
		
		async highlightChatMessageOverlay(payload:IRCEventDataList.Message|null) {
			let data:unknown = null;
			if(payload) {
				let [user] = await TwitchUtils.loadUserInfo([payload.tags['user-id'] as string]);
				//Allow custom parsing of emotes only if it's a message of ours sent
				//from current IRC client
				const customParsing = payload.sentLocally;
				const chunks = TwitchUtils.parseEmotes(payload.message, payload.tags['emotes-raw'], false, customParsing);
				let result = "";
				for (let i = 0; i < chunks.length; i++) {
					const v = chunks[i];
					if(v.type == "text") {
						v.value = v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
						result += Utils.parseURLs(v.value);
					}else if(v.type == "emote") {
					{}	let url = v.value.replace(/1.0$/gi, "3.0");//Twitch format
						url = url.replace(/1x$/gi, "3x");//BTTV format
						url = url.replace(/2x$/gi, "3x");//7TV format
						url = url.replace(/1$/gi, "4");//FFZ format
						result += "<img src='"+url+"' class='emote'>";
					}
				}
				data = {message:result, user, params:this.chatHighlightOverlayParams};
				this.isChatMessageHighlighted = true;

				const clonedData:TwitchatDataTypes.ChatHighlightInfo = JSON.parse(JSON.stringify(data));
				clonedData.type = "chatOverlayHighlight";
				TriggerActionHandler.instance.onMessage(clonedData);
			}else{
				this.isChatMessageHighlighted = false;

				// const clonedData:ChatHighlightInfo = {type: "chatOverlayHighlight"};
				// TriggerActionHandler.instance.onMessage(clonedData);
			}
			
			PublicAPI.instance.broadcast(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, data as JsonObject);
		},
	},
})