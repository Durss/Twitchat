import OBSWebsocket from '@/utils/OBSWebsocket';
import BTTVUtils from '@/utils/BTTVUtils';
import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { ActivityFeedData, IRCEventData, IRCEventDataList } from '@/utils/IRCEvent';
import PubSub, { PubSubTypes } from '@/utils/PubSub';
import TwitchCypherPlugin from '@/utils/TwitchCypherPlugin';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import Utils from '@/utils/Utils';
import { ChatUserstate, UserNoticeState } from 'tmi.js';
import { createStore } from 'vuex';
import Store from './Store';

export default createStore({
	state: {
		initComplete: false,
		authenticated: false,
		showParams: false,
		devmode: false,
		canSplitView: false,
		hasChannelPoints: false,
		oAuthToken: {} as TwitchTypes.AuthTokenResult|null,
		alert: "",
		tooltip: "",
		userCard: "",
		searchMessages: "",
		chatMessages: [] as (IRCEventDataList.Message|IRCEventDataList.Highlight)[],
		activityFeed: [] as ActivityFeedData[],
		mods: [] as TwitchTypes.ModeratorUser[],
		currentPoll: {} as TwitchTypes.Poll,
		currentPrediction: {} as TwitchTypes.Prediction,
		cypherKey: '',
		cypherEnabled: false,
		tmiUserState: {} as UserNoticeState,
		userEmotesCache: {} as {user:TwitchTypes.UserInfo, emotes:TwitchTypes.Emote[]}[],
		emotesCache: [] as TwitchTypes.Emote[],
		trackedUsers: [] as TwitchTypes.TrackedUser[],
		onlineUsers: [] as string[],
		raffle: {} as RaffleData,
		bingo: {} as BingoData,
		whispers: {} as  {[key:string]:IRCEventDataList.Whisper[]},
		whispersUnreadCount: 0 as number,
		hypeTrain: {} as HypeTrainStateData,
		raiding: null as PubSubTypes.RaidInfos|null,
		realHistorySize: 1000,
		followingStates: {} as {[key:string]:boolean},
		playbackState: null as PubSubTypes.PlaybackInfo|null,
		communityBoostState: null as PubSubTypes.CommunityBoost|null,
		tempStoreValue: null as unknown,
		obsSceneCommands: [] as OBSSceneCommand[],
		obsMuteUnmuteCommands: null as OBSMuteUnmuteCommands|null,
		obsPermissions: null as OBSPermissions|null,
		commands: [
			{
				id:"search",
				cmd:"/search {text}",
				details:"Search for a message by its content",
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
				id:"prediction",
				cmd:"/prediction {title}",
				details:"Start a prediction",
				needChannelPoints:true,
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
				details:"Remove VIP status to a user",
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
			}
		] as CommandData[],
		params: {
			appearance: {
				splitView: {type:"toggle", value:true, label:"Split view if page is more than 600px wide (chat on left, notif/activities/greet on right)", id:13, icon:"split_purple.svg"},
				splitViewSwitch: {type:"toggle", value:false, label:"Switch columns", id:15, parent:13},
				highlightMods: {type:"toggle", value:true, label:"Highlight Mods", id:9, icon:"mod_purple.svg"},
				highlightVips: {type:"toggle", value:true, label:"Highlight VIPs", id:10, icon:"vip_purple.svg"},
				highlightSubs: {type:"toggle", value:false, label:"Highlight Subs", id:11, icon:"sub_purple.svg"},
				firstTimeMessage: {type:"toggle", value:true, label:"Highlight first message (all time)", id:7, icon:"firstTime_purple.svg", example:"firstMessage.png"},
				highlightNonFollowers: {type:"toggle", value:false, label:"Indicate non-followers (network intensive)", id:16, icon:"unfollow_purple.svg", example:"nofollow.png"},
				highlightMentions: {type:"toggle", value:true, label:"Highlight messages mentioning me", id:1, icon:"broadcaster_purple.svg"},
				showEmotes: {type:"toggle", value:true, label:"Show emotes", id:2, icon:"emote_purple.svg"},
				showViewersCount: {type:"toggle", value:true, label:"Show viewers count", id:17, icon:"user_purple.svg"},
				bttvEmotes: {type:"toggle", value:false, label:"Parse BTTV emotes", id:3, icon:"emote_purple.svg"},
				showBadges: {type:"toggle", value:true, label:"Show badges", id:4, icon:"badge_purple.svg"},
				minimalistBadges: {type:"toggle", value:false, label:"Minified badges", id:5, parent:4, example:"minibadges.png"},
				displayTime: {type:"toggle", value:false, label:"Display time", id:6, icon:"timeout_purple.svg"},
				shoutoutLabel: {type:"text", value:"Go checkout $USER $URL. Her/His last stream's title was \"$STREAM\" in category \"$CATEGORY\".", label:"Shoutout message ($URL, $USER, $STREAM, $CATEGORY)", id:14, icon:"shoutout_purple.svg", longText:true},
				historySize: {type:"slider", value:150, label:"Max chat message count", min:50, max:500, step:50, id:8},
				defaultSize: {type:"slider", value:2, label:"Default text size", min:1, max:5, step:1, id:12},
			} as {[key:string]:ParameterData},
			filters: {
				showSelf: {type:"toggle", value:true, label:"Show my messages", id:100},
				keepDeletedMessages: {type:"toggle", value:true, label:"Keep deleted messages", id:113},
				showSlashMe: {type:"toggle", value:true, label:"Show /me messages", id:101},
				showBots: {type:"toggle", value:true, label:"Show known bot's messages", id:102},
				hideUsers: {type:"text", value:"", label:"Hide specific users (coma seperated)", id:103, placeholder:"example: user1, user2, user3", icon:"user_purple.svg", longText:true},
				ignoreCommands: {type:"toggle", value:false, label:"Hide commands (messages starting with \"!\")", id:104, icon:"commands_purple.svg"},
				ignoreListCommands: {type:"toggle", value:false, label:"Block only specific commands", id:114, parent:104},
				blockedCommands: {type:"text", value:"", label:"", placeholder:"example: so, myuptime, ", id:115, parent:114, longText:true},
				showRewards: {type:"toggle", value:true, label:"Show rewards redeemed", id:105, icon:"channelPoints_purple.svg"},
				showRewardsInfos: {type:"toggle", value:false, label:"Show reward's details", id:110, parent:105, example:"rewardDetails.png"},
				showSubs: {type:"toggle", value:true, label:"Show sub alerts", id:106, icon:"sub_purple.svg"},
				showCheers: {type:"toggle", value:true, label:"Show bit alerts", id:107, icon:"bits_purple.svg"},
				showRaids: {type:"toggle", value:true, label:"Show raid alerts", id:108, icon:"raid_purple.svg"},
				showFollow: {type:"toggle", value:true, label:"Show follow alerts", id:109, icon:"follow_purple.svg"},
				showHypeTrain: {type:"toggle", value:true, label:"Show hype train alerts", id:111, icon:"train_purple.svg"},
				showPollPredResults: {type:"toggle", value:true, label:"Show polls and prediction results on chat", id:112, icon:"poll_purple.svg", example:"pollPredOnChat.png"},
			} as {[key:string]:ParameterData},
			features: {
				receiveWhispers: {type:"toggle", value:true, label:"Receive whispers", id:200, icon:"whispers_purple.svg"},
				firstMessage: {type:"toggle", value:true, label:"Show the first message of every viewer on a seperate list so you don't forget to say hello", id:201, icon:"firstTime_purple.svg", example:"greetThem.png"},
				conversationsEnabled: {type:"toggle", value:true, label:"Group conversations (allows to display conversations between users seperately)", id:202, icon:"conversation_purple.svg", example:"conversation.gif"},
				userHistoryEnabled: {type:"toggle", value:true, label:"Group a user's messages when hovering her/his name", id:203, icon:"conversation_purple.svg", example:"userHistory.gif"},
				markAsRead: {type:"toggle", value:true, label:"Click a message to remember where you stopped reading", id:204, icon:"read_purple.svg"},
				lockAutoScroll: {type:"toggle", value:true, label:"Pause chat on hover", id:205, icon:"pause_purple.svg"},
				showModTools: {type:"toggle", value:true, label:"Show mod tools (TO,ban,delete)", id:206, icon:"ban_purple.svg"},
				raidStreamInfo: {type:"toggle", value:true, label:"Show last stream info of the raider", id:207, icon:"raid_purple.svg", example:"raidStreamInfo.png"},
				raidHighlightUser: {type:"toggle", value:true, label:"Highlight raider's messages for 5 minutes", id:209, icon:"highlight.svg", example:"raidHighlightUser.png"},
				groupIdenticalMessage:{ type:"toggle", value:true, label:"Group identical messages of a user (sending the exact same message less than 30s later brings it back to bottom and increments a counter on it)", id:208, icon:"increment_purple.svg", example:"groupIdenticalMessage.gif"},
				keepHighlightMyMessages:{ type:"toggle", value:true, label:"Reward \"highlight my message\" pushes messages to activity feed", id:210, icon:"notification_purple.svg"},
			} as {[key:string]:ParameterData}
		} as IParameterCategory,
		roomStatusParams: {
			emotesOnly:{ type:"toggle", value:false, label:"Emotes only", id:300},
			followersOnly:{ type:"toggle", value:false, label:"Followers only", id:301},
			subsOnly:{ type:"toggle", value:false, label:"Subs only", id:302},
			slowMode:{ type:"toggle", value:false, label:"Slow mode", id:303}
		} as {[key:string]:ParameterData},
		user: {
			client_id: "",
			login: "",
			scopes: [""],
			user_id: "",
			expires_in: 0,
		},
		confirm:{
			title:"",
			description:"",
			confirmCallback:()=>{ },
			cancelCallback:()=>{ },
			yesLabel:"",
			noLabel:"",
		},
	},
	mutations: {
		async authenticate(state, payload) {
			const code = payload.code;
			const cb = payload.cb;
			const forceRefresh = payload.forceRefresh;
			try {

				let json:TwitchTypes.AuthTokenResult;
				if(code) {
					const res = await fetch(Config.API_PATH+"/gettoken?code="+code, {method:"GET"});
					json = await res.json();
				}else {
					json = JSON.parse(Store.get("oAuthToken"));
					//Refresh token if going to expire within the next 5 minutes
					if(json && (forceRefresh || json.expires_at < Date.now() - 60000*5)) {
						const res = await fetch(Config.API_PATH+"/refreshtoken?token="+json.refresh_token, {method:"GET"});
						json = await res.json();
					}
				}
				if(!json) {
					if(cb) cb(false);
					return;
				}
				const userRes:unknown = await TwitchUtils.validateToken(json.access_token);
				if(!(userRes as TwitchTypes.Token).expires_in
				&& (userRes as TwitchTypes.Error).status != 200) throw("invalid token");

				state.user = userRes as TwitchTypes.Token;
				//Check if all scopes are allowed
				for (let i = 0; i < Config.TWITCH_APP_SCOPES.length; i++) {
					if(state.user.scopes.indexOf(Config.TWITCH_APP_SCOPES[i]) == -1) {
						console.log("Missing scope:", Config.TWITCH_APP_SCOPES[i]);
						state.authenticated = false;
						state.oAuthToken = null;
						if(cb) cb(false);
						return;
					}
				}
				if(!json.expires_at) {
					json.expires_at = Date.now() + json.expires_in*1000;
				}
				state.oAuthToken = json;
				Store.set("oAuthToken", JSON.stringify(json));
				
				if(!state.authenticated) {
					//Connect if we were not connected before
					IRCClient.instance.connect(state.user.login, json.access_token);
					PubSub.instance.connect();
				}
				
				const users = await TwitchUtils.loadUserInfo([state.user.user_id]);
				state.hasChannelPoints = users[0].broadcaster_type != "";

				state.mods = await TwitchUtils.getModerators();

				state.authenticated = true;
				state.followingStates[state.user.user_id] = true;
				if(cb) cb(true);
			}catch(error) {
				console.log(error);
				state.authenticated = false;
				Store.remove("oAuthToken");
				state.alert = "Authentication failed";
				if(cb) cb(false);
			}
		},

		setUser(state, user) { state.user = user; },

		logout(state) {
			state.oAuthToken = null;
			state.authenticated = false;
			Store.remove("oAuthToken");
			IRCClient.instance.disconnect();
		},

		confirm(state, payload) { state.confirm = payload; },

		openTooltip(state, payload) { state.tooltip = payload; },
		
		closeTooltip(state) { state.tooltip = ""; },
		
		showParams(state, payload) { state.showParams = payload; },

		openUserCard(state, payload) { state.userCard = payload; },
		
		async addChatMessage(state, payload:IRCEventData) {
			let messages = state.chatMessages.concat() as (IRCEventDataList.Message|IRCEventDataList.Highlight)[];
			
			//Limit history size
			// const maxMessages = state.params.appearance.historySize.value;
			const maxMessages = state.realHistorySize;
			if(messages.length >= maxMessages) {
				messages = messages.slice(-maxMessages);
				state.chatMessages = messages;
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
				
				const m = payload as IRCEventDataList.Message;

				if(m.type == "message" && m.message) {
					const cmd = m.message.trim().toLowerCase();
					//check if it's a command to control OBS scene
					for (let i = 0; i < state.obsSceneCommands.length; i++) {
						const scene = state.obsSceneCommands[i];
						if(scene.command.trim().toLowerCase() == cmd) {
							if(
								state.obsPermissions?.mods && m.tags.badges?.moderator ||
								state.obsPermissions?.vips && m.tags.badges?.vip ||
								state.obsPermissions?.subs && m.tags.badges?.subscriber ||
								state.obsPermissions?.all ||
								m.tags.badges?.broadcaster
							) {
								OBSWebsocket.instance.setScene(scene.scene.sceneName);
							}
						}
					}

					//Check if it's a command to mute/unmute an audio source
					if(cmd == state.obsMuteUnmuteCommands?.muteCommand) {
						OBSWebsocket.instance.setMuteState(state.obsMuteUnmuteCommands?.audioSourceName, true);
					}
					if(cmd == state.obsMuteUnmuteCommands?.unmuteCommand) {
						OBSWebsocket.instance.setMuteState(state.obsMuteUnmuteCommands?.audioSourceName, false);
					}
				}

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

				//Search in the last 50 messages if this message has already been sent
				//If so, just increment the previous one
				if(state.params.features.groupIdenticalMessage.value === true) {
					const len = messages.length;
					const end = Math.max(0, len - 50);
					for (let i = len-1; i > end; i--) {
						const mess = messages[i];
						if(mess.type == "message"
						&& m.tags['user-id'] == mess.tags['user-id']
						&& (parseInt(mess.tags['tmi-sent-ts'] as string) > Date.now() - 30000 || i > len-20)//i > len-20 more or less says "if message is still visible on screen"
						&& m.message == mess.message) {
							if(!mess.occurrenceCount) mess.occurrenceCount = 0;
							mess.occurrenceCount ++;
							mess.tags['tmi-sent-ts'] = Date.now().toString();//Update timestamp
							messages.splice(i, 1);
							messages.push(mess);
							state.chatMessages = messages;	
							return;
						}
					}
				}
				
				//Check if user is following
				if(state.params.appearance.highlightNonFollowers.value === true) {
					const uid = m.tags['user-id'] as string;
					if(uid && state.followingStates[uid] == undefined) {
						TwitchUtils.getFollowState(uid, m.tags['room-id']).then((res:TwitchTypes.Following) => {
							state.followingStates[uid] = res != undefined;
						}).catch(()=>{/*ignore*/})
					}
				}

				//If it's a follow event, flag user as a follower
				if(payload.type == "highlight") {
					if(payload['msg-id'] == "follow") {
						state.followingStates[payload.tags['user-id'] as string] = true;
					}
				}

				//If a bingo's in progress, check if the user won it
				const bingo = state.bingo as BingoData;
				if(bingo.opened === true && m.message) {
					let win = bingo.numberValue && parseInt(m.message) == bingo.numberValue;
					win ||= bingo.emoteValue
					&& m.message.trim().toLowerCase().indexOf(bingo.emoteValue.name.toLowerCase()) === 0;

					if(win) {
						console.log("win !!");
						if(!bingo.winners) bingo.winners = [];
						bingo.winners.push(m.tags);
						bingo.opened = false;
						//For some reason TMI.js doesn't send the message back to the sender
						//if sending it on a new message event.
						//If we didn't wait for a frame, the message would be sent properly
						//but wouldn't appear on this chat.
						setTimeout(()=> {
							IRCClient.instance.sendMessage(`🎉🎉🎉 Congrats ${m.tags['display-name']} you won the bingo 🎉🎉🎉`);
						},0);
					}
				}
				
				//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
				if(TwitchCypherPlugin.instance.isCyperCandidate(m.message)) {
					const original = m.message;
					m.message = await TwitchCypherPlugin.instance.decrypt(m.message);
					m.cyphered = m.message != original;
				}
				
				//If message is an answer, set original message's ref to the answer
				//Called when using the "answer feature" on twitch chat
				if(m.tags && m.tags["reply-parent-msg-id"]) {
					let original:IRCEventDataList.Message | null = null;
					const reply:IRCEventDataList.Message | null = m;
					//Search for original message the user answered to
					for (let i = 0; i < messages.length; i++) {
						const c = messages[i] as IRCEventDataList.Message;
						if(c.tags.id === m.tags["reply-parent-msg-id"]) {
							original = c;
							break;
						}
					}
	
					if(reply && original) {
						if(original.answerTo) {
							reply.answerTo = original.answerTo;
							if(original.answerTo.answers) {
								original.answerTo.answers.push( m );
							}
						}else{
							reply.answerTo = original;
							if(!original.answers) original.answers = [];
							original.answers.push( m );
						}
					}
				}else{
					//If there's a mention, search for last messages within
					//a max timeframe to find if the message may be a reply to
					//a message that was sent by the mentionned user
					if(/@\w/gi.test(m.message)) {
						// console.log("Mention found");
						const ts = Date.now();
						const timeframe = 5*60*1000;//Check if a massage answers another within this timeframe
						const matches = m.message.match(/@\w+/gi) as RegExpMatchArray;
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
										c.answers.push( m );
										m.answerTo = c;
									}else if(c.answerTo && c.answerTo.answers) {
										//If the messages answers to a message itself answering to another message
										c.answerTo.answers.push( m );
										m.answerTo = c.answerTo;
									}else{
										//If message answers to a message not from a conversation
										m.answerTo = c;
										if(!c.answers) c.answers = [];
										c.answers.push( m );
									}
									break;
								}
							}
						}
					}
				}
			}

			if(payload.type == "highlight"
			|| payload.type == "poll"
			|| payload.type == "prediction"
			|| (
				state.params.features.keepHighlightMyMessages.value === true
				&& payload.type == "message"
				&& (payload as IRCEventDataList.Message).tags["msg-id"] === "highlighted-message"
			)) {
				console.log("ADD TO FEED");
				console.log(payload);
				state.activityFeed.push(payload as ActivityFeedData);
			}

			messages.push( payload as IRCEventDataList.Message|IRCEventDataList.Highlight );
			state.chatMessages = messages;
		},
		
		delChatMessage(state, messageId:string) { 
			const keepDeletedMessages = state.params.filters.keepDeletedMessages.value;
			const list = (state.chatMessages.concat() as IRCEventDataList.Message[]);
			for (let i = 0; i < list.length; i++) {
				if(messageId == list[i].tags.id) {
					if(keepDeletedMessages === true && !list[i].automod) {
						list[i].deleted = true;
					}else{
						list.splice(i, 1);
					}
					break;
				}
			}
			state.chatMessages = list;
		},

		delUserMessages(state, username:string) {
			username = username.toLowerCase()
			const keepDeletedMessages = state.params.filters.keepDeletedMessages.value;
			const list = (state.chatMessages.concat() as IRCEventDataList.Message[]);
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.tags.username?.toLowerCase() == username && m.type == "message") {
					if(keepDeletedMessages === true) {
						list[i].deleted = true;
					}else{
						list.splice(i, 1);
						i--;
					}
				}
			}
			state.chatMessages = list;
		},

		updateParams(state) {
			// const key = payload.key as "firstMessage";
			// state.params[key] = payload.value;
			for (const cat in state.params) {
				const c = cat as ParameterCategory;
				for (const key in state.params[c]) {
					/* eslint-disable-next-line */
					const v = state.params[c][key as ParameterCategory].value;
					Store.set("p:"+key, v.toString());
					if(key=="bttvEmotes") {
						if(v === true) {
							BTTVUtils.instance.enable();
						}else{
							BTTVUtils.instance.disable();
						}
					}
				}
			}
		},

		setCypherEnabled(state, payload:boolean) { state.cypherEnabled = payload; },

		setUserState(state, payload:UserNoticeState) { state.tmiUserState = payload; },

		setEmotes(state, payload:TwitchTypes.Emote[]) { state.emotesCache = payload; },

		setUserEmotesCache(state, payload:{user:TwitchTypes.UserInfo, emotes:TwitchTypes.Emote[]}[]) { state.userEmotesCache = payload; },

		trackUser(state, payload:IRCEventDataList.Message) {
			const list = state.trackedUsers as TwitchTypes.TrackedUser[];
			const index = list.findIndex(v=>v.user['user-id'] == payload.tags['user-id']);
			if(index == -1) {
				//Was not tracked, track the user
				state.trackedUsers.push({user:payload.tags, messages:[payload]});
			}else{
				//User was already tracked, untrack her/him
				list.splice(index,1);
			}
		},

		untrackUser(state, payload:ChatUserstate) {
			const list = state.trackedUsers as TwitchTypes.TrackedUser[];
			const index = list.findIndex(v=>v.user['user-id'] == payload['user-id']);
			if(index != -1) {
				state.trackedUsers.splice(index, 1);
			}
		},

		startRaffle(state, payload:RaffleData) { state.raffle = payload; },

		async startBingo(state, payload:BingoConfig) {
			const min = payload.min as number;
			const max = payload.max as number;
			
			let emotes = await TwitchUtils.getEmotes();
			emotes = emotes.filter(v => v.emote_type == "globals");

			const data:BingoData = {
				guessNumber: payload.guessNumber,
				guessEmote: payload.guessEmote,
				numberValue: Math.round(Math.random() * (max-min) + min),
				emoteValue: Utils.pickRand(emotes),
				opened: true,
			};
			state.bingo = data;
		},

		closeWhispers(state, userID:string) {
			const whispers = state.whispers as {[key:string]:IRCEventDataList.Whisper[]};
			delete whispers[userID];
			state.whispers = whispers;
		},

		setRaiding(state, infos:PubSubTypes.RaidInfos) { state.raiding = infos; },

		setViewersList(state, users:string[]) {
			//Dedupe users
			const list:string[] = [];
			const done:{[key:string]:boolean} = {};
			for (let i = 0; i < users.length; i++) {
				const user = users[i];
				if(!done[user]) {
					list.push(user);
					done[user] = true;
				}
			}
			state.onlineUsers.splice(0, state.onlineUsers.length);//cleanup prev users
			state.onlineUsers = state.onlineUsers.concat(list);//Add new users
			//Don't just do "state.onlineUsers = users" or the arrays's reference/reactivity
			//accross the app would be broken
		},
		
		toggleDevMode(state, forcedState?:boolean) {
			let notify = true;
			if(forcedState !== undefined) {
				state.devmode = forcedState;
				notify = forcedState
			}else{
				state.devmode = !state.devmode;
			}
			Store.set("devmode", state.devmode? "true" : "false");
			if(notify) {
				IRCClient.instance.sendNotice("devmode", "Developer mode "+(state.devmode?"enabled":"disabled"));
			}
		},

		setHypeTrain(state, data:HypeTrainStateData) { state.hypeTrain = data; },

		flagLowTrustMessage(state, data:PubSubTypes.LowTrustMessage) {
			//Ignore message if user is "restricted"
			if(data.low_trust_user.treatment == 'RESTRICTED') return;

			const list = (state.chatMessages.concat() as IRCEventDataList.Message[]);
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.tags.id == data.message_id) {
					list[i].lowTrust = true;
					return;
				}
			}

			//TODO if reaching this point that means the message was not found.
			//theorically the "low trust" message might arrive before the message itself.
			//We may want to handle such case.
		},

		canSplitView(state, value:boolean) { state.canSplitView = value; },

		searchMessages(state, value:string) { state.searchMessages = value; },

		setPlaybackState(state, value:PubSubTypes.PlaybackInfo) { state.playbackState = value; },

		setCommunityBoost(state, value:PubSubTypes.CommunityBoost) { state.communityBoostState = value; },

		setOBSSceneCommands(state, value:OBSSceneCommand[]) {
			state.obsSceneCommands = value;
			Store.set("obsConf_scenes", JSON.stringify(value));
		},

		setOBSMuteUnmuteCommands(state, value:OBSMuteUnmuteCommands) {
			state.obsMuteUnmuteCommands = value;
			Store.set("obsConf_muteUnmute", JSON.stringify(value));
		},

		setOBSPermissions(state, value:OBSPermissions) {
			state.obsPermissions = value;
			Store.set("obsConf_permissions", JSON.stringify(value));
		},

	},


	
	actions: {
		async startApp({state, commit}) {
			const res = await fetch(Config.API_PATH+"/configs");
			const jsonConfigs = await res.json();
			TwitchUtils.client_id = jsonConfigs.client_id;
			Config.TWITCH_APP_SCOPES = jsonConfigs.scopes;

			//Loading parameters from storage and pushing them to the store
			const props = Store.getAll();
			for (const cat in state.params) {
				const c = cat as ParameterCategory;
				for (const key in props) {
					const k = key.replace(/^p:/gi, "");
					if(props[key] == null) continue;
					if(/^p:/gi.test(key) && k in state.params[c]) {
						const v:string = props[key] as string;
						/* eslint-disable-next-line */
						const pointer = state.params[c][k as ParameterCategory];
						if(typeof pointer.value === 'boolean') {
							pointer.value = (v == "true");
						}
						if(typeof pointer.value === 'string') {
							pointer.value = v;
						}
						if(typeof pointer.value === 'number') {
							pointer.value = parseFloat(v);
						}
					}
				}
			}

			const queryParams = Utils.getQueryParameterByName("params");
			if(queryParams) {
				//eslint-disable-next-line
				let json:any;
				try {
					json = JSON.parse(atob(queryParams));
					for (const cat in state.params) {
						//eslint-disable-next-line
						const values = state.params[cat as ParameterCategory];
						for (const key in values) {
							const p = values[key] as ParameterData;
							if(Object.prototype.hasOwnProperty.call(json, p.id as number)) {
								p.value = json[p.id as number] as (string | number | boolean);
							}
						}
					}
					Store.set("oAuthToken", JSON.stringify(json.access_token));
				}catch(error){
					//ignore
				}
			}
			
			//Init OBS command params
			const obsSceneCommands = Store.get("obsConf_scenes");
			if(obsSceneCommands) {
				state.obsSceneCommands = JSON.parse(obsSceneCommands);
			}
			
			//Init OBS command params
			const OBSMuteUnmuteCommandss = Store.get("obsConf_muteUnmute");
			if(OBSMuteUnmuteCommandss) {
				state.obsMuteUnmuteCommands = JSON.parse(OBSMuteUnmuteCommandss);
			}
			
			//Init OBS permissions
			const obsPermissions = Store.get("obsConf_permissions");
			if(obsPermissions) {
				state.obsPermissions = JSON.parse(obsPermissions);
			}

			//Init OBS connection
			const port = Store.get("obsPort");
			const pass = Store.get("obsPass");
			if(port && pass) {
				OBSWebsocket.instance.connect(port, pass);
			}

			const token = Store.get("oAuthToken");
			if(token) {
				try {
					await new Promise((resolve,reject)=> {
						commit("authenticate", {cb:(success:boolean)=>{
							if(success) {
								resolve(null);
							}else{
								reject();
							}
						}});
					});

					//Use an anonymous method to avoid locking loading
					(async () => {
						try {
							await TwitchUtils.getPolls();
							await TwitchUtils.getPredictions();
						}catch(e) {
							//User is probably not an affiliate
						}
					})();
					//This was a way to check if a poll or prediction was active
					//before switching to pubsub events.
					// setInterval(()=> {
					// 	TwitchUtils.getPolls();
					// 	TwitchUtils.getPredictions();
					// }, 1*60*1000);
				}catch(error) {
					console.log(error);
					state.authenticated = false;
					Store.remove("oAuthToken");
					// document.location.href = TwitchUtils.oAuthURL;
					// router.push({name: 'login'});
					return;
				}
			}

			IRCClient.instance.addEventListener(IRCEvent.UNFILTERED_MESSAGE, (event:IRCEvent) => {
				const message = event.data as IRCEventDataList.Message;
				const trackedUser = (state.trackedUsers as TwitchTypes.TrackedUser[]).find(v => v.user['user-id'] == message.tags['user-id']);
				
				if(trackedUser) {
					if(!trackedUser.messages) trackedUser.messages = [];
					trackedUser.messages.push(message);
				}
				
				//If a raffle is in progress, check if the user can enter
				const raffle:RaffleData = state.raffle as RaffleData;
				if(raffle.command && message.message.toLowerCase().trim().indexOf(raffle.command.toLowerCase()) == 0) {
					const ellapsed = new Date().getTime() - new Date(raffle.created_at).getTime();
					//Check if within time frame and max users count isn't reached
					if(ellapsed <= raffle.duration * 60000
					&& (raffle.maxUsers <= 0 || raffle.users.length < raffle.maxUsers)
					&& !raffle.users.find(v=>v['user-id'] == message.tags['user-id'])) {
						raffle.users.push(message.tags);
					}
				}
			});

			IRCClient.instance.addEventListener(IRCEvent.BADGES_LOADED, () => {
				if(state.params.appearance.bttvEmotes.value === true) {
					BTTVUtils.instance.enable();
				}else{
					BTTVUtils.instance.disable();
				}
			});

			IRCClient.instance.addEventListener(IRCEvent.MESSAGE, (event:IRCEvent) => {
				this.dispatch("addChatMessage", event.data);
			});

			IRCClient.instance.addEventListener(IRCEvent.NOTICE, (event:IRCEvent) => {
				this.dispatch("addChatMessage", event.data);
			});

			IRCClient.instance.addEventListener(IRCEvent.HIGHLIGHT, (event:IRCEvent) => {
				this.dispatch("addChatMessage", event.data);
			});

			IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, (event:IRCEvent) => {
				this.dispatch("delChatMessage", (event.data as IRCEventDataList.MessageDeleted).tags['target-msg-id']);
			});

			IRCClient.instance.addEventListener(IRCEvent.BAN, (event:IRCEvent) => {
				this.dispatch("delUserMessages", (event.data as IRCEventDataList.Ban).username);
			});

			IRCClient.instance.addEventListener(IRCEvent.TIMEOUT, (event:IRCEvent) => {
				this.dispatch("delUserMessages", (event.data as IRCEventDataList.Timeout).username);
			});

			IRCClient.instance.addEventListener(IRCEvent.CLEARCHAT, () => {
				state.chatMessages = [];
			});

			IRCClient.instance.addEventListener(IRCEvent.WHISPER, (event:IRCEvent) => {
				if(state.params.features.receiveWhispers.value === true) {
					const data = event.data as IRCEventDataList.Whisper;
					const uid = data.tags['user-id'] as string;
					const whispers = state.whispers as {[key:string]:IRCEventDataList.Whisper[]};
					if(!whispers[uid]) whispers[uid] = [];
					data.timestamp = Date.now();
					whispers[uid].push(data);
					state.whispers = whispers;
					state.whispersUnreadCount ++;
				}
			});

			IRCClient.instance.addEventListener(IRCEvent.ROOMSTATE, (event:IRCEvent) => {
				const data = event.data as IRCEventDataList.RoomState
				if(data.tags['emote-only'] != undefined) state.roomStatusParams.emotesOnly.value = data.tags['emote-only'] != false;
				if(data.tags['subs-only'] != undefined) state.roomStatusParams.subsOnly.value = data.tags['subs-only'] != false;
				if(data.tags['followers-only'] != undefined) state.roomStatusParams.followersOnly.value = parseInt(data.tags['followers-only']) > -1;
				if(data.tags.slow != undefined) state.roomStatusParams.slowMode.value = data.tags.slow != false;
			});
			
			state.initComplete = true;

			//Makes sure all parameters have a unique ID !
			const uniqueIdsCheck:{[key:number]:boolean} = {};
			for (const cat in state.params) {
				//eslint-disable-next-line
				const values = state.params[cat as ParameterCategory];
				for (const key in values) {
					const p = values[key] as ParameterData;
					if(uniqueIdsCheck[p.id as number] === true) {
						state.alert = "Duplicate parameter id (" + p.id + ") found for parameter \"" + key + "\"";
						break;
					}
					uniqueIdsCheck[p.id as number] = true;
				}
			}
			
			TwitchCypherPlugin.instance.initialize();

			const devmode = Store.get("devmode") === "true";
			this.dispatch("toggleDevMode", devmode);
		},
		
		confirm({commit}, payload) { commit("confirm", payload); },

		authenticate({ commit }, payload) { commit("authenticate", payload); },

		setUser({ commit }, user) { commit("setUser", user); },

		logout({ commit }) { commit("logout"); },

		openTooltip({commit}, payload) { commit("openTooltip", payload); },
		
		closeTooltip({commit}) { commit("closeTooltip", null); },
		
		showParams({commit}, payload) { commit("showParams", payload); },
		
		openUserCard({commit}, payload) { commit("openUserCard", payload); },
		
		addChatMessage({commit}, payload) { commit("addChatMessage", payload); },
		
		delChatMessage({commit}, messageId) { commit("delChatMessage", messageId); },

		delUserMessages({commit}, payload) { commit("delUserMessages", payload); },

		updateParams({commit}) { commit("updateParams"); },

		setPolls({state}, payload:TwitchTypes.Poll[]) {
			const list = state.activityFeed as ActivityFeedData[];
			if(payload[0].status == "COMPLETED") {
				if(list.findIndex(v=>v.type == "poll" && v.data.id == payload[0].id) == -1) {
					const m:IRCEventDataList.PollResult = {
						tags:{
							id:IRCClient.instance.getFakeGuid(),
							"tmi-sent-ts": Date.now().toString()},
						type:"poll",
						data:payload[0]
					};
					this.dispatch("addChatMessage", m);
				}
			}
			state.currentPoll = payload.find(v => {
				return (v.status == "ACTIVE" || v.status == "COMPLETED" || v.status == "TERMINATED");
			}) as  TwitchTypes.Poll;
		},

		setPredictions({state}, payload:TwitchTypes.Prediction[]) {
			const list = state.activityFeed as ActivityFeedData[];
			if(payload[0].status == "RESOLVED" && new Date(payload[0].ended_at as string).getTime() > Date.now() - 5 * 60 * 1000) {
				if(list.findIndex(v=>v.type == "prediction" && v.data.id == payload[0].id) == -1) {
					const m:IRCEventDataList.PredictionResult = {
						tags:{
							id:IRCClient.instance.getFakeGuid(),
							"tmi-sent-ts": Date.now().toString()},
						type:"prediction",
						data:payload[0]
					};
					this.dispatch("addChatMessage", m);
				}
			}
			state.currentPrediction = payload.find(v => {
				return (v.status == "ACTIVE" || v.status == "LOCKED");
			}) as  TwitchTypes.Prediction;
		},

		setCypherEnabled({commit}, payload:boolean) { commit("setCypherEnabled", payload); },

		setUserState({commit}, payload:UserNoticeState) { commit("setUserState", payload); },

		setEmotes({commit}, payload:TwitchTypes.Emote[]) { commit("setEmotes", payload); },

		setUserEmotesCache({commit}, payload:{user:TwitchTypes.UserInfo, emotes:TwitchTypes.Emote[]}[]) { commit("setUserEmotesCache", payload); },

		trackUser({commit}, payload:IRCEventDataList.Message) { commit("trackUser", payload); },

		untrackUser({commit}, payload:ChatUserstate) { commit("untrackUser", payload); },

		startRaffle({commit}, payload:RaffleData) { commit("startRaffle", payload); },

		startBingo({commit}, payload:BingoConfig) { commit("startBingo", payload); },

		closeWhispers({commit}, userID:string) { commit("closeWhispers", userID); },

		setRaiding({commit}, infos:PubSubTypes.RaidInfos) { commit("setRaiding", infos); },

		setViewersList({commit}, users:string[]) { commit("setViewersList", users); },
		
		toggleDevMode({commit}, forcedState?:boolean) { commit("toggleDevMode", forcedState); },

		setHypeTrain({commit}, data:HypeTrainStateData) { commit("setHypeTrain", data); },

		flagLowTrustMessage({commit}, data:PubSubTypes.LowTrustMessage) { commit("flagLowTrustMessage", data); },

		canSplitView({commit}, value:boolean) { commit("canSplitView", value); },

		searchMessages({commit}, value:string) { commit("searchMessages", value); },

		setPlaybackState({commit}, value:PubSubTypes.PlaybackInfo) { commit("setPlaybackState", value); },

		setCommunityBoost({commit}, value:PubSubTypes.CommunityBoost) { commit("setCommunityBoost", value); },

		setOBSSceneCommands({commit}, value:OBSSceneCommand[]) { commit("setOBSSceneCommands", value); },

		setOBSMuteUnmuteCommands({commit}, value:OBSMuteUnmuteCommands[]) { commit("setOBSMuteUnmuteCommands", value); },

		setOBSPermissions({commit}, value:OBSPermissions) { commit("setOBSPermissions", value); },
	},
	modules: {
	}
})

export type ParameterCategory = "appearance" | "filters"| "features";

export interface IParameterCategory {
	appearance:{[key:string]:ParameterData};
	filters:{[key:string]:ParameterData};
	features:{[key:string]:ParameterData};
}

export interface OBSPermissions {
	mods:boolean;
	vips:boolean;
	subs:boolean;
	all:boolean;
}

export interface OBSSceneCommand {
	scene:{
		sceneIndex:number;
		sceneName:string;
	}
	command:string;
}

export interface OBSMuteUnmuteCommands {
	audioSourceName:string;
	muteCommand:string;
	unmuteCommand:string;
}

export interface ParameterData {
	id?:number;
	type:"toggle"|"slider"|"number"|"text"|"password"|"list"|string;
	value:boolean|number|string|string;
	listValues?:string[];
	longText?:boolean;
	label:string;
	min?:number;
	max?:number;
	step?:number;
	icon?:string;
	placeholder?:string;
	parent?:number;
	example?:string;
	storage?:unknown;
}

export interface RaffleData {
	command:string;
	duration:number;
	maxUsers:number;
	created_at:number;
	users:ChatUserstate[];
}

export interface BingoConfig {
	guessNumber:boolean;
	guessEmote:boolean;
	min:number;
	max:number;
}

export interface BingoData {
	guessNumber:boolean;
	guessEmote:boolean;
	numberValue:number;
	emoteValue:TwitchTypes.Emote;
	winners?:ChatUserstate[];
	opened:boolean;
}

export interface HypeTrainStateData {
	level:number;
	currentValue:number;
	goal:number;
	started_at:number;
	timeLeft:number;
	state:"APPROACHING" | "START" | "PROGRESSING" | "LEVEL_UP" | "COMPLETED" | "EXPIRE";
	is_boost_train:boolean;
}

export interface CommandData {
	id:string;
	cmd:string;
	details:string;
	needChannelPoints?:boolean;
}