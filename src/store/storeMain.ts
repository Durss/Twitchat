import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import BTTVUtils from '@/utils/BTTVUtils';
import type { WheelItem } from '@/utils/CommonDataTypes';
import Config from '@/utils/Config';
import DeezerHelper from '@/utils/DeezerHelper';
import DeezerHelperEvent from '@/utils/DeezerHelperEvent';
import FFZUtils from '@/utils/FFZUtils';
import IRCClient from '@/utils/IRCClient';
import IRCEvent from '@/utils/IRCEvent';
import { getTwitchatMessageType, TwitchatMessageType, type IRCEventData, type IRCEventDataList } from '@/utils/IRCEventDataTypes';
import OBSWebsocket from '@/utils/OBSWebsocket';
import PublicAPI from '@/utils/PublicAPI';
import SchedulerHelper from '@/utils/SchedulerHelper';
import SevenTVUtils from '@/utils/SevenTVUtils';
import SpotifyHelper from '@/utils/SpotifyHelper';
import SpotifyHelperEvent from '@/utils/SpotifyHelperEvent';
import { TriggerTypes } from '@/utils/TriggerActionData';
import TriggerActionHandler from '@/utils/TriggerActionHandler';
import TTSUtils from '@/utils/TTSUtils';
import TwitchatEvent from '@/utils/TwitchatEvent';
import TwitchCypherPlugin from '@/utils/TwitchCypherPlugin';
import TwitchUtils from '@/utils/TwitchUtils';
import UserSession from '@/utils/UserSession';
import Utils from '@/utils/Utils';
import VoiceController from '@/utils/VoiceController';
import VoicemodEvent from '@/utils/VoicemodEvent';
import VoicemodWebSocket from '@/utils/VoicemodWebSocket';
import { defineStore } from 'pinia';
import type { JsonArray, JsonObject, JsonValue } from 'type-fest';
import DataStore from './DataStore';
import { storeAuth } from './auth/storeAuth';
import { storeAutomod } from './automod/storeAutomod';
import { storeBingo } from './bingo/storeBingo';
import { storeChat } from './chat/storeChat';
import { storeChatSuggestion } from './chatSugg/storeChatSuggestion';
import { storeEmergency } from './emergency/storeEmergency';
import { storeMusic } from './music/storeMusic';
import { storeOBS } from './obs/storeOBS';
import { storeParams } from './params/storeParams';
import { storePoll } from './poll/storePoll';
import { storePrediction } from './prediction/storePrediction';
import { storeRaffle } from './raffle/storeRaffle';
import { storeStream } from './stream/storeStream';
import { storeTimer } from './timer/storeTimer';
import { storeTriggers } from './triggers/storeTriggers';
import { storeTTS } from './tts/storeTTS';
import { storeUsers } from './users/storeUsers';
import { storeVoice } from './voice/storeVoice';

// const sOBS = storeOBS();
// const sTTS = storeTTS();
// const sChat = storeChat();
// const sPoll = storePoll();
// const sAuth = storeAuth();
// const sTimer = storeTimer();
// const sUsers = storeUsers();
// const sVoice = storeVoice();
// const sMusic = storeMusic();
// const sBingo = storeBingo();
// const sStream = storeStream();
// const sRaffle = storeRaffle();
// const sParams = storeParams();
// const sTriggers = storeTriggers();
// const sAutomod = storeAutomod();
// const sEmergency = storeEmergency();
// const sChatSugg = storeChatSuggestion();
// const sPrediction = storePrediction();

export const storeMain = defineStore('main', {
	state: () => ({
		latestUpdateIndex: 9,
		initComplete: false,
		showParams: false,
		devmode: false,
		canSplitView: false,
		ahsInstaller: null as TwitchatDataTypes.InstallHandler|null,
		alert:"",
		tooltip: "",
		cypherKey: "",
		cypherEnabled: false,
		tempStoreValue: null as unknown,

		confirm:{
			title:"",
			description:"",
			confirmCallback:()=>{ },
			cancelCallback:()=>{ },
			yesLabel:"",
			noLabel:"",
			STTOrigin:false,
		} as TwitchatDataTypes.ConfirmData,
		
		chatAlertParams: {
			chatCmd:"!alert",
			message:true,
			shake:true,
			sound:true,
			blink:false,
			permissions:{
				broadcaster:true,
				mods:true,
				vips:false,
				subs:false,
				all:false,
				users:""
			},
		} as TwitchatDataTypes.AlertParamsData,
		chatAlert:null as IRCEventDataList.Message|IRCEventDataList.Whisper|null,
	}),
	

	getters: {
	},		

	
	actions: {

		async startApp(payload:{authenticate:boolean, callback:(value:unknown)=>void}) {
			let jsonConfigs;
			const sOBS = storeOBS();
			const sChat = storeChat();
			const sAuth = storeAuth();
			const sTimer = storeTimer();
			const sUsers = storeUsers();
			const sVoice = storeVoice();
			const sMusic = storeMusic();
			const sBingo = storeBingo();
			const sStream = storeStream();
			const sRaffle = storeRaffle();
			const sParams = storeParams();
			const sAutomod = storeAutomod();
			const sEmergency = storeEmergency();
			const sChatSugg = storeChatSuggestion();

			try {
				const res = await fetch(Config.instance.API_PATH+"/configs");
				jsonConfigs = await res.json();
			}catch(error) {
				this.alert = "Unable to contact server :(";
				this.initComplete = true;
				return;
			}
			TwitchUtils.client_id = jsonConfigs.client_id;
			Config.instance.TWITCH_APP_SCOPES = jsonConfigs.scopes;
			Config.instance.SPOTIFY_SCOPES  = jsonConfigs.spotify_scopes;
			Config.instance.SPOTIFY_CLIENT_ID = jsonConfigs.spotify_client_id;
			Config.instance.DEEZER_SCOPES  = jsonConfigs.deezer_scopes;
			Config.instance.DEEZER_CLIENT_ID = Config.instance.IS_PROD? jsonConfigs.deezer_client_id : jsonConfigs.deezer_dev_client_id;

			PublicAPI.instance.addEventListener(TwitchatEvent.GET_CURRENT_TIMERS, ()=> {
				if(sTimer.timerStart > 0) {
					PublicAPI.instance.broadcast(TwitchatEvent.TIMER_START, { startAt:sTimer.timerStart });
				}
				
				if(sTimer.countdown) {
					const data = { startAt:sTimer.countdown?.startAt, duration:sTimer.countdown?.duration };
					PublicAPI.instance.broadcast(TwitchatEvent.COUNTDOWN_START, data);
				}
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.RAFFLE_COMPLETE, (e:TwitchatEvent)=> {
				const data = (e.data as unknown) as {winner:WheelItem};
				storeRaffle().onRaffleComplete(data.winner);
			});

			PublicAPI.instance.addEventListener(TwitchatEvent.SHOUTOUT, (e:TwitchatEvent)=> {
				const login = storeStream().lastRaiderLogin;
				if(login) {
					sChat.shoutout(login);
				}else{
					this.alert = "You have not been raided yet"
				}
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.SET_EMERGENCY_MODE, (e:TwitchatEvent)=> {
				const enable = (e.data as unknown) as {enabled:boolean};
				let enabled = enable.enabled;
				//If no JSON is specified, just toggle the state
				if(!e.data || enabled === undefined) enabled = !sEmergency.emergencyStarted;
				sEmergency.setEmergencyMode(enabled)
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.SET_CHAT_HIGHLIGHT_OVERLAY_MESSAGE, (e:TwitchatEvent)=> {
				sChat.isChatMessageHighlighted = (e.data as {message:string}).message != undefined;
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.TEXT_UPDATE, (e:TwitchatEvent)=> {
				sVoice.voiceText.tempText = (e.data as {text:string}).text;
				sVoice.voiceText.finalText = "";
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.RAW_TEXT_UPDATE, (e:TwitchatEvent)=> {
				sVoice.voiceText.rawTempText = (e.data as {text:string}).text;
			});
			
			PublicAPI.instance.addEventListener(TwitchatEvent.SPEECH_END, (e:TwitchatEvent)=> {
				sVoice.voiceText.finalText = (e.data as {text:string}).text;
			});
			PublicAPI.instance.initialize();

			//Overwrite store data from URL
			const queryParams = Utils.getQueryParameterByName("params");
			if(queryParams) {
				//eslint-disable-next-line
				let json:any;
				try {
					json = JSON.parse(atob(queryParams));
					for (const cat in sParams.$state) {
						//eslint-disable-next-line
						const values = sParams.$state[cat as TwitchatDataTypes.ParameterCategory];
						for (const key in values) {
							const p = values[key] as TwitchatDataTypes.ParameterData;
							if(Object.prototype.hasOwnProperty.call(json, p.id as number)) {
								p.value = json[p.id as number] as (string | number | boolean);
							}
						}
					}
					DataStore.set(DataStore.TWITCH_AUTH_TOKEN, json.access_token, false);
				}catch(error){
					//ignore
				}
			}

			IRCClient.instance.addEventListener(IRCEvent.UNFILTERED_MESSAGE, async (event:IRCEvent) => {
				const type = getTwitchatMessageType(event.data as IRCEventData);

				if(sAutomod.params.enabled === true) {
					const messageData = event.data as IRCEventDataList.Message | IRCEventDataList.Highlight;
					if(type == TwitchatMessageType.MESSAGE) {
						//Make sure message passes the automod rules
						const m = (messageData as IRCEventDataList.Message);
						let rule = Utils.isAutomoded(m.message, m.tags);
						if(rule) {
							messageData.ttAutomod = rule;
							let id = messageData.tags.id as string;
							IRCClient.instance.deleteMessage(id);
							return;
						}
					}

					//Make sure user name passes the automod rules
					if(sAutomod.params.banUserNames === true) {
						let username = messageData.tags.username as string;
						if(type == TwitchatMessageType.SUB || type == TwitchatMessageType.SUB_PRIME) {
							username = (messageData as IRCEventDataList.Highlight).username as string
						}
						if(username) {
							let rule = Utils.isAutomoded(username, {username});
							if(rule) {
								messageData.ttAutomod = rule;
								IRCClient.instance.sendMessage(`/ban ${username} banned by Twitchat's automod because nickname matched mod rule "${rule.label}"`);
								return;
							}
						}
					}
				}
				
				if(type == TwitchatMessageType.MESSAGE) {
					const messageData = event.data as IRCEventDataList.Message;
					const cmd = (messageData.message as string).trim().split(" ")[0].toLowerCase();

					if(messageData.sentLocally !== true) {
						SchedulerHelper.instance.incrementMessageCount();
					}
					if(/(^|\s|https?:\/\/)twitchat\.fr($|\s)/gi.test(messageData.message as string)) {
						SchedulerHelper.instance.resetAdSchedule(messageData);
					}
					
					//Is it a tracked user ?
					const trackedUser = sUsers.trackedUsers.find(v => v.user['user-id'] == messageData.tags['user-id']);
					if(trackedUser) {
						if(!trackedUser.messages) trackedUser.messages = [];
						trackedUser.messages.push(messageData);
					}

					//If a raffle is in progress, check if the user can enter
					const raffle = sRaffle.data;
					if(raffle && raffle.mode == "chat"
					&& messageData.type == TwitchatMessageType.MESSAGE
					&& cmd == raffle.command.trim().toLowerCase()) {
						const ellapsed = new Date().getTime() - new Date(raffle.created_at).getTime();
						//Check if within time frame and max users count isn't reached and that user
						//hasn't already entered
						if(ellapsed <= raffle.duration * 60000
						&& (raffle.maxEntries <= 0 || raffle.entries.length < raffle.maxEntries)
						&& !raffle.entries.find(v=>v.id == messageData.tags['user-id'])) {
							let score = 1;
							const user = messageData.tags;
							//Apply ratios if any is defined
							if(raffle.vipRatio > 0 && user.badges?.vip) score += raffle.vipRatio;
							if(raffle.subRatio > 0 && user.badges?.subscriber)  score += raffle.subRatio;
							if(raffle.subgitRatio > 0 && user.badges?.['sub-gifter'])  score += raffle.subgitRatio;
							if(raffle.followRatio > 0) {
								//Check if user is following
								const uid = user['user-id'] as string;
								if(uid && sUsers.followingStates[uid] == undefined) {
									const res = await TwitchUtils.getFollowState(uid, user['room-id'])
									sUsers.followingStates[uid] = res != undefined;
									sUsers.followingStatesByNames[(user.username ?? user['display-name'] as string)?.toLowerCase()] = res;
								}
								if(sUsers.followingStates[uid] === true) score += raffle.followRatio;
							}
							raffle.entries.push( {
								score,
								label:user['display-name'] ?? user.username ?? "missing login",
								id:user['user-id'] as string,
							} );
							
							if(sChat.botMessages.raffleJoin.enabled) {
								let message = sChat.botMessages.raffleJoin.message;
								message = message.replace(/\{USER\}/gi, messageData.tags['display-name'] as string)
								IRCClient.instance.sendMessage(message);
							}
						}
					}
	
					//If a bingo's in progress, check if the user won it
					const bingo = sBingo.data;
					if(bingo && messageData.message && bingo.winners.length == 0) {
						let win = bingo.numberValue && parseInt(messageData.message) == bingo.numberValue;
						win ||= bingo.emoteValue
						&& messageData.message.trim().toLowerCase().indexOf(bingo.emoteValue.name.toLowerCase()) === 0;
						if(win) {
							const winner = messageData.tags['display-name'] as string;
							bingo.winners = [messageData.tags];
							if(sChat.botMessages.bingo.enabled) {
								//TMI.js never cease to amaze me.
								//It doesn't send the message back to the sender if sending
								//it just after receiving a message.
								//If we didn't wait for a frame, the message would be sent properly
								//but wouldn't appear on this chat.
								setTimeout(()=> {
									if(sChat.botMessages.bingo.enabled) {
										let message = sChat.botMessages.bingo.message;
										message = message.replace(/\{USER\}/gi, winner)
										IRCClient.instance.sendMessage(message);
									}
								},0);
							}
	
							//Post result on chat
							const payload:IRCEventDataList.BingoResult = {
								type:"bingo",
								data:sBingo.data!,
								winner,
								tags:IRCClient.instance.getFakeTags(),
							}
							sChat.addChatMessage(payload);
							TriggerActionHandler.instance.onMessage(payload);
						}
					}
	
					//If there's a suggestion poll and the timer isn't over
					const suggestionPoll = sChatSugg.data as TwitchatDataTypes.ChatSuggestionData;
					if(suggestionPoll && Date.now() - suggestionPoll.startTime < suggestionPoll.duration * 60 * 1000) {
						if(cmd == suggestionPoll.command.toLowerCase().trim()) {
							if(suggestionPoll.allowMultipleAnswers
							|| suggestionPoll.choices.findIndex(v=>v.user['user-id'] == messageData.tags['user-id'])==-1) {
								const text = messageData.message.replace(cmd, "").trim();
								if(text.length > 0) {
									suggestionPoll.choices.push({
										user: messageData.tags,
										text
									});
								}
							}
						}
					}
	
					if(messageData.type == "message" && cmd && messageData.tags.username) {
						//check if it's a command to control an OBS scene
						if(Utils.checkPermissions(sOBS.commandsPermissions, messageData.tags)) {
							for (let i = 0; i < sOBS.sceneCommands.length; i++) {
								const scene = sOBS.sceneCommands[i];
								if(scene.command.trim().toLowerCase() == cmd) {
									OBSWebsocket.instance.setCurrentScene(scene.scene.sceneName);
								}
							}
	
							const audioSourceName = sOBS.muteUnmuteCommands?.audioSourceName;
							if(audioSourceName) {
								//Check if it's a command to mute/unmute an audio source
								if(cmd == sOBS.muteUnmuteCommands!.muteCommand) {
									OBSWebsocket.instance.setMuteState(audioSourceName, true);
								}
								if(cmd == sOBS.muteUnmuteCommands!.unmuteCommand) {
									OBSWebsocket.instance.setMuteState(audioSourceName, false);
								}
							}
						}
						
						//check if its a command to start the emergency mode
						if(Utils.checkPermissions(sEmergency.params.chatCmdPerms, messageData.tags)) {
							const cmd = messageData.message.trim().toLowerCase();
							if(cmd===sEmergency.params.chatCmd.trim()) {
								sEmergency.setEmergencyMode(true);
							}
						}
	
						//check if its a spoiler request
						if(messageData.tags["reply-parent-msg-id"] && Utils.checkPermissions(sChat.spoilerParams.permissions, messageData.tags)) {
							const cmd = messageData.message.replace(/@[^\s]+\s?/, "").trim().toLowerCase();
							if(cmd.indexOf("!spoiler") === 0) {
								//Search for original message the user answered to
								for (let i = 0; i < sChat.messages.length; i++) {
									const c = sChat.messages[i] as IRCEventDataList.Message;
									if(c.tags.id === messageData.tags["reply-parent-msg-id"]) {
										c.message = "|| "+c.message;
										break;
									}
								}
							}
						}
	
						//check if it's a chat alert command
						if(Utils.checkPermissions(this.chatAlertParams.permissions, messageData.tags)
						&& sParams.features.alertMode.value === true) {
							if(messageData.message.trim().toLowerCase().indexOf(this.chatAlertParams.chatCmd.trim().toLowerCase()) === 0) {
								let mess:IRCEventDataList.Message = JSON.parse(JSON.stringify(messageData));
								//Remove command from message to make later things easier
								this.executeChatAlert(mess);
								let trigger:TwitchatDataTypes.ChatAlertInfo = {
									type:"chatAlert",
									message:mess,
								}
								TriggerActionHandler.instance.onMessage(trigger);
							}
						}
						
						//Check if it's a voicemod command
						if(Utils.checkPermissions(sVoice.voicemodParams.chatCmdPerms, messageData.tags)
						&& sVoice.voicemodParams.commandToVoiceID[cmd]) {
							VoicemodWebSocket.instance.enableVoiceEffect(sVoice.voicemodParams.commandToVoiceID[cmd]);
						}
					}
				}

				TriggerActionHandler.instance.onMessage(event.data as IRCEventData);
			});

			//Preload BTTV/FFS/7TV emotes onces IRC data are loaded
			IRCClient.instance.addEventListener(IRCEvent.BADGES_LOADED, () => {
				if(sParams.appearance.bttvEmotes.value === true) {
					BTTVUtils.instance.enable();
				}else{
					BTTVUtils.instance.disable();
				}
				if(sParams.appearance.ffzEmotes.value === true) {
					FFZUtils.instance.enable();
				}else{
					FFZUtils.instance.disable();
				}
				if(sParams.appearance.sevenTVEmotes.value === true) {
					SevenTVUtils.instance.enable();
				}else{
					SevenTVUtils.instance.disable();
				}
			});

			IRCClient.instance.addEventListener(IRCEvent.JOIN, async (event:IRCEvent) => {
				const data = event.data as IRCEventDataList.JoinLeaveList;
				const users = data.users;

				if(sParams.features.notifyJoinLeave.value === true) {
					const usersClone = users.concat();
					const join = usersClone.splice(0, 30);
					let message = "<mark>"+join.join("</mark>, <mark>")+"</mark>";
					if(usersClone.length > 0) {
						message += " and <mark>"+usersClone.length+"</mark> more";
					}else{
						message = message.replace(/,([^,]*)$/, " and$1");
					}
					message += " joined the chat room";
					IRCClient.instance.sendNotice("online", message, data.channel);
				}

				if(sAutomod.params.enabled === true
				&& sAutomod.params.banUserNames === true) {

					for (let i = 0; i < users.length; i++) {
						const username = users[i];
						const rule = Utils.isAutomoded(username, {username});
						if(rule != null) {
							IRCClient.instance.sendMessage(`/ban ${username} banned by Twitchat's automod because nickname matched mod rule "${rule!.label}"`);
							IRCClient.instance.sendHighlight({
								channel: UserSession.instance.authToken.login,
								type:"highlight",
								username,
								ttAutomod:rule as TwitchatDataTypes.AutomodParamsKeywordFilterData,
								tags:{
									"tmi-sent-ts":Date.now().toString(),
									"msg-id": "autoban_join",
								},
							});
						}
					}
				}

				//If non followers highlight option is enabled, get follow state of
				//all the users that joined
				if(sParams.appearance.highlightNonFollowers.value === true) {
					const channelInfos = await TwitchUtils.loadUserInfo(undefined, [data.channel.replace("#", "")]);
					const usersFull = await TwitchUtils.loadUserInfo(undefined, users);
					for (let i = 0; i < usersFull.length; i++) {
						const uid = usersFull[i].id;
						if(uid && sUsers.followingStates[uid] == undefined) {
							try {
								const follows:boolean = await TwitchUtils.getFollowState(uid, channelInfos[0].id);
								sUsers.followingStates[uid] = follows;
								sUsers.followingStatesByNames[usersFull[i].login.toLowerCase()] = follows;
							}catch(error) {
								/*ignore*/
								console.log("error checking follow state", error)
							}
						}
					}
				}
			});

			IRCClient.instance.addEventListener(IRCEvent.LEAVE, async (event:IRCEvent) => {
				if(sParams.features.notifyJoinLeave.value === true) {
					const data = event.data as IRCEventDataList.JoinLeaveList;
					const users = data.users;
					const leave = users.splice(0, 30);
					let message = "<mark>"+leave.join("</mark>, <mark>")+"</mark>";
					if(users.length > 0) {
						message += " and <mark>"+users.length+"</mark> more";
					}else{
						message = message.replace(/,([^,]*)$/, " and$1");
					}
					message += " left the chat room";
					IRCClient.instance.sendNotice("offline", message, data.channel);
				}
			});

			IRCClient.instance.addEventListener(IRCEvent.MESSAGE, (event:IRCEvent) => {
				sChat.addChatMessage(event.data as IRCEventData);
			});

			IRCClient.instance.addEventListener(IRCEvent.NOTICE, (event:IRCEvent) => {
				sChat.addChatMessage(event.data as IRCEventData);
			});

			IRCClient.instance.addEventListener(IRCEvent.HIGHLIGHT, (event:IRCEvent) => {
				sChat.addChatMessage(event.data as IRCEventData);
			});

			IRCClient.instance.addEventListener(IRCEvent.BAN, (event:IRCEvent) => {
				const data = (event.data as IRCEventDataList.Ban);
				sChat.delUserMessages(data.username!);
			});

			IRCClient.instance.addEventListener(IRCEvent.TIMEOUT, (event:IRCEvent) => {
				const data = (event.data as IRCEventDataList.Timeout);
				sChat.delUserMessages(data.username!);
			});

			IRCClient.instance.addEventListener(IRCEvent.CLEARCHAT, () => {
				sChat.messages = [];
			});

			IRCClient.instance.addEventListener(IRCEvent.WHISPER, (event:IRCEvent) => {
				if(sParams.features.receiveWhispers.value === true) {
					const data = event.data as IRCEventDataList.Whisper;
					const uid = data.tags['user-id'] as string;
					const whispers = sChat.whispers as {[key:string]:IRCEventDataList.Whisper[]};
					if(!whispers[uid]) whispers[uid] = [];
					data.timestamp = Date.now();
					whispers[uid].push(data);
					sChat.whispers = whispers;
					sChat.whispersUnreadCount ++;

					if(sParams.features.showWhispersOnChat.value === true){
					// && data.raw != "") {//Don't show whispers we sent to someone, on the chat
						data.type = "whisper";
						data.channel = IRCClient.instance.channel;
						data.tags['tmi-sent-ts'] = Date.now().toString();
						sChat.addChatMessage(data);
					}

					//Broadcast to OBS-ws
					const wsUser = {
						id: data.tags['user-id'],
						login: data.tags.username,
						color: data.tags.color,
						badges: data.tags.badges as {[key:string]:JsonObject | JsonArray | JsonValue},
						'display-name': data.tags['display-name'],
						'message-id': data.tags['message-id'],
					}
					PublicAPI.instance.broadcast(TwitchatEvent.MESSAGE_WHISPER, {unreadCount:sChat.whispersUnreadCount, user:wsUser, message:"<not set for privacy reasons>"});
				}
			});

			IRCClient.instance.addEventListener(IRCEvent.ROOMSTATE, (event:IRCEvent) => {
				const data = event.data as IRCEventDataList.RoomState
				if(data.tags['emote-only'] != undefined) sStream.roomStatusParams.emotesOnly.value = data.tags['emote-only'] != false;
				if(data.tags['subs-only'] != undefined) sStream.roomStatusParams.subsOnly.value = data.tags['subs-only'] != false;
				if(data.tags['followers-only'] != undefined) sStream.roomStatusParams.followersOnly.value = parseInt(data.tags['followers-only']) > -1;
				if(data.tags.slow != undefined) sStream.roomStatusParams.slowMode.value = data.tags.slow != false;
			});

			IRCClient.instance.addEventListener(IRCEvent.REFRESH_TOKEN, (event:IRCEvent) => {
				sAuth.authenticate({});
			});

			//Makes sure all parameters have a unique ID !
			let uniqueIdsCheck:{[key:number]:boolean} = {};
			for (const cat in sParams.$state) {
				const values = sParams.$state[cat as TwitchatDataTypes.ParameterCategory];
				for (const key in values) {
					const p = values[key] as TwitchatDataTypes.ParameterData;
					if(uniqueIdsCheck[p.id as number] === true) {
						this.alert = "Duplicate parameter id (" + p.id + ") found for parameter \"" + key + "\"";
						break;
					}
					uniqueIdsCheck[p.id as number] = true;
				}
			}
			
			//Make sure all triggers have a unique ID !
			uniqueIdsCheck = {};
			for (const key in TriggerTypes) {
				//@ts-ignore
				const v = TriggerTypes[key];
				if(uniqueIdsCheck[v] === true) {
					this.alert = "Duplicate trigger type id (" + v + ") found for trigger \"" + key + "\"";
					break;
				}
				uniqueIdsCheck[v] = true;
			}

			//Authenticate user
			const token = DataStore.get(DataStore.TWITCH_AUTH_TOKEN);
			let authenticated = false;
			if(token && payload.authenticate) {
				const cypherKey = DataStore.get(DataStore.CYPHER_KEY)
				TwitchCypherPlugin.instance.initialize(cypherKey);
				SpotifyHelper.instance.addEventListener(SpotifyHelperEvent.CONNECTED, (e:SpotifyHelperEvent)=>{
					sMusic.setSpotifyToken(e.token!);
				});
				SpotifyHelper.instance.addEventListener(SpotifyHelperEvent.ERROR, (e:SpotifyHelperEvent)=>{
					this.alert = e.error as string;
				});
				DeezerHelper.instance.addEventListener(DeezerHelperEvent.CONNECTED, ()=>{
					sMusic.setDeezerConnected(true);
				});
				DeezerHelper.instance.addEventListener(DeezerHelperEvent.CONNECT_ERROR, ()=>{
					sMusic.setDeezerConnected(false);
					this.alert = "Deezer authentication failed";
				});
				VoicemodWebSocket.instance.addEventListener(VoicemodEvent.VOICE_CHANGE, async (e:VoicemodEvent)=> {
					TriggerActionHandler.instance.onMessage({ type:"voicemod", voiceID: e.voiceID });
					for (let i = 0; i < VoicemodWebSocket.instance.voices.length; i++) {
						const v = VoicemodWebSocket.instance.voices[i];
						if(v.voiceID == e.voiceID) {
							const img = await VoicemodWebSocket.instance.getBitmapForVoice(v.voiceID);
							v.image = img;
							sVoice.voicemodCurrentVoice = v;
						}
					}
				})

				try {
					await new Promise((resolve,reject)=> {
						sAuth.authenticate({cb:(success:boolean)=>{
							if(success) {
								resolve(null);
							}else{
								reject();
							}
						}});
					});

					//Use an anonymous method to avoid blocking loading while
					//all twitch tags are loading
					(async () => {
						try {
							TwitchUtils.searchTag("");//Preload tags to build local cache
							if(UserSession.instance.hasChannelPoints) {
								await TwitchUtils.getPolls();
								await TwitchUtils.getPredictions();
							}
						}catch(e) {
							//User is probably not an affiliate
						}
					})();
				}catch(error) {
					console.log(error);
					sAuth.authenticated = false;
					DataStore.remove("oAuthToken");
					this.initComplete = true;
					payload.callback(null);
					return;
				}

				if(DataStore.syncToServer === true && sAuth.authenticated) {
					if(!await DataStore.loadRemoteData()) {
						//Force data sync popup to show up if remote
						//data have been deleted
						DataStore.remove(DataStore.SYNC_DATA_TO_SERVER);
					}
				}
	
				const devmode = DataStore.get(DataStore.DEVMODE) === "true";
				this.toggleDevMode(devmode);
				sChat.sendTwitchatAd();
				
				if(!DataStore.get(DataStore.TWITCHAT_AD_WARNED) && !UserSession.instance.isDonor) {
					setTimeout(()=>{
						sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_AD_WARNING);
					}, 5000)
				}else
				if(!DataStore.get(DataStore.TWITCHAT_SPONSOR_PUBLIC_PROMPT) && UserSession.instance.isDonor) {
					setTimeout(()=>{
						sChat.sendTwitchatAd(TwitchatDataTypes.TwitchatAdTypes.TWITCHAT_SPONSOR_PUBLIC_PROMPT);
					}, 5000)
				}

				authenticated = true;
			}
	
			this.loadDataFromStorage(authenticated);
			
			this.initComplete = true;
			
			payload.callback(null);
		},
		
		loadDataFromStorage(authenticated:boolean = false) {
			const sOBS = storeOBS();
			const sTTS = storeTTS();
			const sChat = storeChat();
			const sVoice = storeVoice();
			const sMusic = storeMusic();
			const sStream = storeStream();
			const sParams = storeParams();
			const sTriggers = storeTriggers();
			const sAutomod = storeAutomod();
			const sEmergency = storeEmergency();
			//Loading parameters from local storage and pushing them to current store
			const props = DataStore.getAll();
			for (const cat in sParams.$state) {
				const c = cat as TwitchatDataTypes.ParameterCategory;
				for (const key in props) {
					const k = key.replace(/^p:/gi, "");
					if(props[key] == null) continue;
					if(/^p:/gi.test(key) && k in sParams.$state[c]) {
						const v:string = props[key] as string;
						/* eslint-disable-next-line */
						const pointer = sParams.$state[c][k as TwitchatDataTypes.ParameterCategory];
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

			if(authenticated) {
				//Init OBS scenes params
				const obsSceneCommands = DataStore.get(DataStore.OBS_CONF_SCENES);
				if(obsSceneCommands) {
					sOBS.sceneCommands = JSON.parse(obsSceneCommands);
				}
				
				//Init OBS command params
				const obsMuteUnmuteCommands = DataStore.get(DataStore.OBS_CONF_MUTE_UNMUTE);
				if(obsMuteUnmuteCommands) {
					Utils.mergeRemoteObject(JSON.parse(obsMuteUnmuteCommands), (sOBS.muteUnmuteCommands as unknown) as JsonObject);
				}
				
				//Init OBS permissions
				const obsCommandsPermissions = DataStore.get(DataStore.OBS_CONF_PERMISSIONS);
				if(obsCommandsPermissions) {
					Utils.mergeRemoteObject(JSON.parse(obsCommandsPermissions), (sOBS.commandsPermissions as unknown) as JsonObject);
				}

				//Init TTS actions
				const tts = DataStore.get(DataStore.TTS_PARAMS);
				if (tts) {
					Utils.mergeRemoteObject(JSON.parse(tts), (sTTS.params as unknown) as JsonObject);
					TTSUtils.instance.enabled = sTTS.params.enabled;
				}
				
				//Init emergency actions
				const emergency = DataStore.get(DataStore.EMERGENCY_PARAMS);
				if(emergency) {
					Utils.mergeRemoteObject(JSON.parse(emergency), (sEmergency.params as unknown) as JsonObject);
				}
				
				//Init alert actions
				const alert = DataStore.get(DataStore.ALERT_PARAMS);
				if(alert) {
					Utils.mergeRemoteObject(JSON.parse(alert), (this.chatAlertParams as unknown) as JsonObject);
				}
				
				//Init spoiler param
				const spoiler = DataStore.get(DataStore.SPOILER_PARAMS);
				if(spoiler) {
					Utils.mergeRemoteObject(JSON.parse(spoiler), (sChat.spoilerParams as unknown) as JsonObject);
				}
				
				//Init chat highlight params
				const chatHighlight = DataStore.get(DataStore.CHAT_HIGHLIGHT_PARAMS);
				if(chatHighlight) {
					Utils.mergeRemoteObject(JSON.parse(chatHighlight), (sChat.chatHighlightOverlayParams as unknown) as JsonObject);
				}
				
				//Init triggers
				const triggers = DataStore.get(DataStore.TRIGGERS);
				if(triggers) {
					Utils.mergeRemoteObject(JSON.parse(triggers), (sTriggers.triggers as unknown) as JsonObject);
					TriggerActionHandler.instance.triggers = sTriggers.triggers;
				}
					
				//Init stream info presets
				const presets = DataStore.get(DataStore.STREAM_INFO_PRESETS);
				if(presets) {
					sStream.streamInfoPreset = JSON.parse(presets);
				}

				//Init emergency followers
				const emergencyFollows = DataStore.get(DataStore.EMERGENCY_FOLLOWERS);
				if(emergencyFollows) {
					sEmergency.follows = JSON.parse(emergencyFollows);
				}

				//Init music player params
				const musicPlayerParams = DataStore.get(DataStore.MUSIC_PLAYER_PARAMS);
				if(musicPlayerParams) {
					Utils.mergeRemoteObject(JSON.parse(musicPlayerParams), (sMusic.musicPlayerParams as unknown) as JsonObject);
				}
				
				//Init Voice control actions
				const voiceActions = DataStore.get("voiceActions");
				if(voiceActions) {
					sVoice.voiceActions = JSON.parse(voiceActions);
				}
				
				//Init Voice control language
				const voiceLang = DataStore.get("voiceLang");
				if(voiceLang) {
					sVoice.voiceLang = voiceLang;
					VoiceController.instance.lang = voiceLang;
				}
				
				//Init bot messages
				const botMessages = DataStore.get(DataStore.BOT_MESSAGES);
				if(botMessages) {
					//Merge remote and local to avoid losing potential new
					//default values on local data
					Utils.mergeRemoteObject(JSON.parse(botMessages), (sChat.botMessages as unknown) as JsonObject, true);
				}

				//Init spotify connection
				const spotifyAuthToken = DataStore.get(DataStore.SPOTIFY_AUTH_TOKEN);
				if(spotifyAuthToken && Config.instance.SPOTIFY_CLIENT_ID != "") {
					sMusic.setSpotifyToken(JSON.parse(spotifyAuthToken));
				}

				//Init spotify credentials
				const spotifyAppParams = DataStore.get(DataStore.SPOTIFY_APP_PARAMS);
				if(spotifyAuthToken && spotifyAppParams) {
					sMusic.setSpotifyCredentials(JSON.parse(spotifyAppParams));
				}

				//Init voicemod
				const voicemodParams = DataStore.get(DataStore.VOICEMOD_PARAMS);
				if(voicemodParams) {
					sVoice.setVoicemodParams(JSON.parse(voicemodParams));
					if(sVoice.voicemodParams.enabled) {
						VoicemodWebSocket.instance.connect();
					}
				}

				//Init automod
				const automodParams = DataStore.get(DataStore.AUTOMOD_PARAMS);
				if(automodParams) {
					Utils.mergeRemoteObject(JSON.parse(automodParams), (sAutomod.params as unknown) as JsonObject);
					sAutomod.setAutomodParams(sAutomod.params);
				}

				SchedulerHelper.instance.start();
			}
			
			//Initialise new toggle param for OBS connection.
			//If any OBS param exists, set it to true because the
			//user probably configured it. Otherwise set it to false
			if(DataStore.get(DataStore.OBS_CONNECTION_ENABLED) === null) {
				if(DataStore.get(DataStore.OBS_PASS) || DataStore.get(DataStore.OBS_PORT) || sOBS.muteUnmuteCommands || sOBS.sceneCommands.length > 0) {
					sOBS.connectionEnabled = true;
				}else{
					sOBS.connectionEnabled = false;
				}
				DataStore.set(DataStore.OBS_CONNECTION_ENABLED, sOBS.connectionEnabled);
			}else{
				sOBS.connectionEnabled = DataStore.get(DataStore.OBS_CONNECTION_ENABLED) === "true";
			}
			
			//Init OBS connection
			//If params are specified on URL, use them (used by overlays)
			let port = Utils.getQueryParameterByName("obs_port");
			let pass = Utils.getQueryParameterByName("obs_pass");
			let ip = Utils.getQueryParameterByName("obs_ip");
			const urlForced = port || pass || ip;
			if(!port) port = DataStore.get(DataStore.OBS_PORT);
			if(!pass) pass = DataStore.get(DataStore.OBS_PASS);
			if(!ip) ip = DataStore.get(DataStore.OBS_IP);
			//If OBS params are on URL or if connection is enabled, connect
			if((sOBS.connectionEnabled || urlForced)
			&& (port != undefined || pass != undefined || ip != undefined)) {
				sOBS.connectionEnabled = true;
				OBSWebsocket.instance.connect(port, pass, true, ip);
			}
		},

		confirm(payload:TwitchatDataTypes.ConfirmData) { this.$state.confirm = payload; },

		openTooltip(payload:string) { this.tooltip = payload; },
		
		closeTooltip() { this.tooltip = ""; },
		
		setShowParams(payload:boolean) { this.$state.showParams = payload; },
		
		setCypherKey(payload:string) {
			this.cypherKey = payload;
			TwitchCypherPlugin.instance.cypherKey = payload;
			DataStore.set(DataStore.CYPHER_KEY, payload);
		},

		setCypherEnabled(payload:boolean) { this.cypherEnabled = payload; },
		
		toggleDevMode(forcedState?:boolean) {
			let notify = true;
			if(forcedState !== undefined) {
				this.devmode = forcedState;
				notify = forcedState
			}else{
				this.devmode = !this.devmode;
			}
			if(this.devmode != JSON.parse(DataStore.get(DataStore.DEVMODE))) {
				DataStore.set(DataStore.DEVMODE, this.devmode);
			}
			if(notify) {
				IRCClient.instance.sendNotice("devmode", "Developer mode "+(this.devmode?"enabled":"disabled"));
			}
		},

		setCanSplitView(value:boolean) { this.canSplitView = value; },

		setAhsInstaller(value:TwitchatDataTypes.InstallHandler) { this.$state.ahsInstaller = value; },

		setAlertParams(params:TwitchatDataTypes.AlertParamsData) {
			this.chatAlertParams = params;
			DataStore.set(DataStore.ALERT_PARAMS, params);
		},

		async executeChatAlert(message:IRCEventDataList.Message|IRCEventDataList.Whisper) {
			this.chatAlert = message;
			await Utils.promisedTimeout(50);
			this.chatAlert = null;
		},
	}
})