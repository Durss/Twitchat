import BTTVUtils from '@/utils/BTTVUtils';
import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { IRCEventData, IRCEventDataList } from '@/utils/IRCEvent';
import PubSub from '@/utils/PubSub';
import TwitchCypherPlugin from '@/utils/TwitchCypherPlugin';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import { ChatUserstate, UserNoticeState, Userstate } from 'tmi.js';
import { RouteLocation } from 'vue-router';
import { createStore } from 'vuex';
import Store from './Store';

export default createStore({
	state: {
		initComplete: false,
		authenticated: false,
		showParams: false,
		oAuthToken: {},
		alert: "",
		tooltip: "",
		userCard: "",
		chatMessages: [],
		mods: [],
		currentPoll: {},
		currentPrediction: {},
		cypherKey: '',
		cypherEnabled: false,
		isMessageMarkedAsRead: false,
		tmiUserState: {},
		userEmotesCache: {},
		emotesCache: [],
		trackedUsers: [],
		raffle: {},
		whispers: {},
		raiding: "",
		params: {
			appearance: {
				highlightMentions: {type:"toggle", value:true, label:"Highlight messages i'm mentioned in"},
				showEmotes: {type:"toggle", value:true, label:"Show emotes"},
				bttvEmotes: {type:"toggle", value:false, label:"Parse BTTV emotes"},
				showBadges: {type:"toggle", value:true, label:"Show badges"},
				minimalistBadges: {type:"toggle", value:false, label:"Minified badges"},
				displayTime: {type:"toggle", value:false, label:"Display time"},
				firstTimeMessage: {type:"toggle", value:true, label:"Highlight first message of a user (all time)"},
				historySize: {type:"slider", value:150, label:"Max chat message count", min:50, max:500, step:50},
				highlightMods: {type:"toggle", value:true, label:"Highlight Mods"},
				highlightVips: {type:"toggle", value:true, label:"Highlight VIPs"},
				highlightSubs: {type:"toggle", value:false, label:"Highlight Subs"},
				defaultSize: {type:"slider", value:2, label:"Default text size", min:1, max:5, step:1},
			},
			filters: {
				firstMessage: {type:"toggle", value:true, label:"Show the first message of every viewer on a seperate list so you don't forget to say hello"},
				receiveWhispers: {type:"toggle", value:false, label:"Receive whispers"},
				showSelf: {type:"toggle", value:true, label:"Show my messages"},
				showSlashMe: {type:"toggle", value:true, label:"Show /me messages"},
				showBots: {type:"toggle", value:true, label:"Show known bot's messages"},
				hideUsers: {type:"list", value:"", label:"Hide custom users (coma seperated)"},
				ignoreCommands: {type:"toggle", value:false, label:"Hide commands (messages starting with \"!\")"},
				showRewards: {type:"toggle", value:true, label:"Show rewards redeemed"},
				showSubs: {type:"toggle", value:true, label:"Show sub alerts"},
				showCheers: {type:"toggle", value:true, label:"Show bit alerts"},
				showRaids: {type:"toggle", value:true, label:"Show raid alerts"},
			},
			roomStatus: {
				emotesOnly:{ type:"toggle", value:false, label:"Emotes only" },
				followersOnly:{ type:"toggle", value:false, label:"Followers only" },
				subsOnly:{ type:"toggle", value:false, label:"Subs only" },
				slowMode:{ type:"toggle", value:false, label:"Slow mode" }
			}
		},
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
					if(Config.TWITCH_APP_SCOPES.indexOf(state.user.scopes[i]) == -1) {
						console.log("Missing scope:", state.user.scopes[i]);
						state.authenticated = false;
						state.oAuthToken = {};
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

				state.mods = await TwitchUtils.getModsList() as never[];

				state.authenticated = true;
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
			state.oAuthToken = {};
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
			const m = payload as IRCEventDataList.Message;
			let messages = state.chatMessages.concat() as (IRCEventDataList.Message|IRCEventDataList.Highlight)[];
			
			//Limit history size
			// const maxMessages = state.params.appearance.historySize.value;
			const maxMessages = 1000;
			if(messages.length >= maxMessages) {
				messages = messages.slice(-maxMessages);
				state.chatMessages = messages as never[];
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
				
				if(TwitchCypherPlugin.instance.isCyperCandidate(m.message)) {
					//Custom secret feature hehehe ( ͡~ ͜ʖ ͡°)
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
						const timeframe = 5*60*1000;//Check if a massges answers another within this timeframe
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

			messages.push( m );
			state.chatMessages = messages as never[];
		},
		
		delChatMessage(state, messageId:string) { 
			const list = (state.chatMessages as IRCEventDataList.Message[]);
			for (let i = 0; i < list.length; i++) {
				if(messageId == list[i].tags.id) {
					state.chatMessages.splice(i, 1);
				}
			}
		},
		delUserMessages(state, username:Userstate) {
			const list = (state.chatMessages as IRCEventDataList.Message[]);
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.tags.username?.toLowerCase() == username.toLowerCase()) {
					state.chatMessages.splice(i, 1);
					i--;
				}
				
			}
		},

		updateParams(state) {
			// const key = payload.key as "firstMessage";
			// state.params[key] = payload.value;
			for (const cat in state.params) {
				const c = cat as ParameterCategory;
				for (const key in state.params[c]) {
					/* eslint-disable-next-line */
					const v = (state.params[c] as any)[key].value;
					Store.set("p:"+key, v);
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

		setPolls(state, payload:TwitchTypes.Poll[]) {
			state.currentPoll = payload.find(v => {
				return (v.status == "ACTIVE" || v.status == "COMPLETED" || v.status == "TERMINATED");
			}) as  TwitchTypes.Poll;
		},
		
		setPredictions(state, payload:TwitchTypes.Prediction[]) {
			state.currentPrediction = payload.find(v => {
				return (v.status == "ACTIVE" || v.status == "LOCKED");
			}) as  TwitchTypes.Prediction;
		},

		setCypherEnabled(state, payload:boolean) { state.cypherEnabled = payload; },

		setUserState(state, payload:UserNoticeState) { state.tmiUserState = payload; },

		setEmotes(state, payload:TwitchTypes.Emote[]) { state.emotesCache = payload as never[]; },

		setUserEmotesCache(state, payload:{user:TwitchTypes.UserInfo, emotes:TwitchTypes.Emote[]}[]) { state.userEmotesCache = payload; },

		trackUser(state, payload:IRCEventDataList.Message) {
			const list = state.trackedUsers as TwitchTypes.TrackedUser[];
			if(list.findIndex(v=>v.user['user-id'] == payload.tags['user-id']) == -1) {
				state.trackedUsers.push({user:payload.tags, messages:[payload]} as never);
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

		closeWhispers(state, userID:string) {
			const whispers = state.whispers as {[key:string]:IRCEventDataList.Whisper[]};
			delete whispers[userID];
			state.whispers = whispers;
		},

		setRaiding(state, userName:string) { state.raiding = userName; },

	},


	
	actions: {
		async startApp({state, commit}, payload) {
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
						const pointer = (state.params[c] as any)[k];
						if(typeof pointer.value === 'boolean') {
							pointer.value = (v == "true") as never;
						}
						if(typeof pointer.value === 'string') {
							pointer.value = v as never;
						}
						if(typeof pointer.value === 'number') {
							pointer.value = parseFloat(v) as never;
						}
					}
				}
			}

			const token = Store.get("oAuthToken");
			if(token && (payload.to as RouteLocation).meta.public !== true) {
				try {
					await new Promise((resolve,reject)=> {
						commit("authenticate", {cb:(success:boolean)=>{
							if(success) {
								resolve(null);
							}else{
								reject();
							}
						}});
					})
					TwitchUtils.getPolls();
					TwitchUtils.getPredictions();
					setInterval(()=> {
						TwitchUtils.getPolls();
						TwitchUtils.getPredictions();
					}, 1*60*1000);
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
					&& !raffle.users.find(v=>v.user['user-id'] == message.tags['user-id'])) {
						console.log("enter raffle");
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
				if(state.params.filters.receiveWhispers.value === true) {
					const data = event.data as IRCEventDataList.Whisper;
					const uid = data.tags['user-id'] as string;
					const whispers = state.whispers as {[key:string]:IRCEventDataList.Whisper[]};
					if(!whispers[uid]) whispers[uid] = [];
					data.timestamp = Date.now();
					whispers[uid].push(data);
					state.whispers = whispers;
				}
			});

			IRCClient.instance.addEventListener(IRCEvent.ROOMSTATE, (event:IRCEvent) => {
				const data = event.data as IRCEventDataList.RoomState
				if(data.tags['emote-only'] != undefined) state.params.roomStatus.emotesOnly.value = data.tags['emote-only'] != false;
				if(data.tags['subs-only'] != undefined) state.params.roomStatus.subsOnly.value = data.tags['subs-only'] != false;
				if(data.tags['followers-only'] != undefined) state.params.roomStatus.followersOnly.value = parseInt(data.tags['followers-only']) > -1;
				if(data.tags.slow != undefined) state.params.roomStatus.slowMode.value = data.tags.slow != false;
			});
			
			state.initComplete = true;
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

		setPolls({commit}, payload:TwitchTypes.Poll[]) { commit("setPolls", payload); },

		setPredictions({commit}, payload:TwitchTypes.Prediction[]) { commit("setPredictions", payload); },

		setCypherEnabled({commit}, payload:boolean) { commit("setCypherEnabled", payload); },

		setUserState({commit}, payload:UserNoticeState) { commit("setUserState", payload); },

		setEmotes({commit}, payload:TwitchTypes.Emote[]) { commit("setEmotes", payload); },

		setUserEmotesCache({commit}, payload:{user:TwitchTypes.UserInfo, emotes:TwitchTypes.Emote[]}[]) { commit("setUserEmotesCache", payload); },

		trackUser({commit}, payload:IRCEventDataList.Message) { commit("trackUser", payload); },

		untrackUser({commit}, payload:ChatUserstate) { commit("untrackUser", payload); },

		startRaffle({commit}, payload:RaffleData) { commit("startRaffle", payload); },

		closeWhispers({commit}, userID:string) { commit("closeWhispers", userID); },

		setRaiding({commit}, userName:string) { commit("setRaiding", userName); },
	},
	modules: {
	}
})

export type ParameterCategory = "appearance" | "filters"| "roomStatus";

export interface ParameterData {
	type:"toggle"|"slider"|"number"|"list"|string;
	value:boolean|number|string;
	label:string;
	min?:number;
	max?:number;
	step?:number;
	icon?:string;
	placeholder?:string;
}

export interface RaffleData {
	command:string;
	duration:number;
	maxUsers:number;
	created_at:number;
	users:ChatUserstate[];
}