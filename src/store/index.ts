import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { IRCEventDataList } from '@/utils/IRCEvent';
import PubSub from '@/utils/PubSub';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import { Userstate } from 'tmi.js';
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
		params: {
			appearance: {
				highlightMentions: {type:"toggle", value:true, label:"Highlight messages i'm mentioned in"},
				showEmotes: {type:"toggle", value:true, label:"Show emotes"},
				showBadges: {type:"toggle", value:true, label:"Show badges"},
				minimalistBadges: {type:"toggle", value:false, label:"Show minimalist badges"},
				displayTime: {type:"toggle", value:true, label:"Display time"},
				firstTimeMessage: {type:"toggle", value:true, label:"Highlight first message of a user (all time)"},
				historySize: {type:"slider", value:150, label:"Max chat message count", min:50, max:500, step:50},
				highlightMods: {type:"toggle", value:true, label:"Highlight Mods"},
				highlightVips: {type:"toggle", value:true, label:"Highlight VIPs"},
				highlightSubs: {type:"toggle", value:false, label:"Highlight Subs"},
				defaultSize: {type:"slider", value:2, label:"Default text size", min:1, max:4, step:1},
				modsSize: {type:"slider", value:2, label:"Text size of Mods", min:1, max:4, step:1, icon:""},
				vipsSize: {type:"slider", value:2, label:"Text size of VIPs", min:1, max:4, step:1, icon:""},
				subsSize: {type:"slider", value:2, label:"Text size of Subs", min:1, max:4, step:1, icon:""},
			},
			filters: {
				firstMessage: {type:"toggle", value:true, label:"Show the first message of every viewer on a seperate list so you don't forget to say hello"},
				showSelf: {type:"toggle", value:true, label:"Show my messages"},
				hideBots: {type:"toggle", value:false, label:"Hide bots"},
				ignoreCommands: {type:"toggle", value:true, label:"Hide commands (messages starting with \"!\")"},
				showRewards: {type:"toggle", value:true, label:"Show rewards redeemed"},
				showSubs: {type:"toggle", value:true, label:"Show subs alerts"},
				showCheers: {type:"toggle", value:true, label:"Show bits alerts"},
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
		
		addChatMessage(state, payload:IRCEventDataList.Message) {
			let messages = state.chatMessages as IRCEventDataList.Message[]
			messages.push(payload);
			const maxMessages = state.params.appearance.historySize.value;
			if(messages.length > maxMessages) {
				messages = messages.slice(-maxMessages);
				state.chatMessages = messages as never[];
			}
			
			//If message is an answer, set original message's ref to the answer
			if(payload.tags["reply-parent-msg-id"]) {
				//Called when using the "answer feature" on twitch chat
				let original:IRCEventDataList.Message | null = null;
				let reply:IRCEventDataList.Message | null = null;
				for (let i = 0; i < messages.length; i++) {
					const c = messages[i] as IRCEventDataList.Message;
					if(c.tags.id === payload.tags["reply-parent-msg-id"]) original = c;
					if(c.tags.id === payload.tags.id) reply = c;
					if(original && reply) break;
				}
				
				if(reply && original) {
					if(original.answerTo) {
						reply.answerTo = original.answerTo;
						if(original.answerTo.answers) {
							original.answerTo.answers.push(payload);
						}
					}else{
						reply.answerTo = original;
						if(!original.answers) original.answers = [];
						original.answers.push(payload);
					}
				}
			}else{
				//If there's a mention, search for last messages within
				//a max timeframe to find if the message may be a reply to
				//a message that was sent by the mentionned user
				if(/@\w/gi.test(payload.message)) {
					// console.log("Mention found");
					const ts = Date.now();
					const timeframe = 5*60*1000;//Check if a massges answers another within this timeframe
					const matches = payload.message.match(/@\w+/gi) as RegExpMatchArray;
					for (let i = 0; i < matches.length; i++) {
						const match = matches[i].replace("@", "").toLowerCase();
						// console.log("Search for message from ", match);
						const candidates = messages.filter(m => m.tags.username == match);
						//Search for oldest matching candidate
						for (let j = 0; j < candidates.length; j++) {
							const c = candidates[j];
							// console.log("Found candidate", c);
							if(ts - parseInt(c.tags['tmi-sent-ts'] as string) < timeframe) {
								// console.log("Timeframe is OK !");
								if(c.answers) {
									//If it's the root message of a conversation
									c.answers.push(payload);
									payload.answerTo = c;
								}else if(c.answerTo && c.answerTo.answers) {
									//If the messages answers to a message itself answering to another message
									c.answerTo.answers.push(payload);
									payload.answerTo = c.answerTo;
								}else{
									//If message answers to a message not from a conversation
									payload.answerTo = c;
									if(!c.answers) c.answers = [];
									c.answers.push(payload);
								}
								break;
							}
						}
					}
				}
			}
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
				}
			}
		},

		setPolls(state, payload:TwitchTypes.Poll[]) {
			state.currentPoll = payload.find(v => {
				const tooOld = v.ended_at ? Date.now() > new Date(v.ended_at).getTime() + 2*60*1000 : false;
				return v.status == "ACTIVE" && !tooOld
			}) as  TwitchTypes.Poll;
		},
		
		setPredictions(state, payload:TwitchTypes.Prediction[]) {
			state.currentPrediction = payload.find(v => {
				const tooOld = v.ended_at ? Date.now() > new Date(v.ended_at).getTime() + 2*60*1000 : false;
				return v.status == "ACTIVE" && !tooOld
			}) as  TwitchTypes.Prediction;
		},

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
					const k:ParameterType = key.replace(/^p:/gi, "") as ParameterType;
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
				}catch(error) {
					console.log(error);
					state.authenticated = false;
					Store.remove("oAuthToken");
					// document.location.href = TwitchUtils.oAuthURL;
					// router.push({name: 'login'});
					return;
				}
			}

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
	},
	modules: {
	}
})

export type ParameterCategory = "appearance" | "filters";
export type ParameterType = "hideBots" | "showBadges" | "showEmotes" | "minimalistBadges" | "historySize" | "firstMessage" | "highlightMentions" | "showSelf" | "displayTime" | "ignoreCommands" | "defaultSize" | "modsSize" | "vipsSize" | "subsSize";

export interface ParameterData {
	type:"toggle"|"slider"|"number"|string;
	value:boolean|number;
	label:string;
	min?:number;
	max?:number;
	step?:number;
	icon?:string;
}