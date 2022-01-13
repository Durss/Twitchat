import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { IRCEventDataList } from '@/utils/IRCEvent';
import PubSub from '@/utils/PubSub';
import TwitchUtils, { TwitchTypes } from '@/utils/TwitchUtils';
import { Userstate } from 'tmi.js';
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
		params: {
			appearance: {
				highlightMentions: {type:"toggle", value:true, label:"Highlight messages i'm mentioned in"},
				hideEmotes: {type:"toggle", value:false, label:"Hide emotes"},
				hideBadges: {type:"toggle", value:false, label:"Hide badges"},
				minimalistBadges: {type:"toggle", value:true, label:"Show minimalist badges"},
				displayTime: {type:"toggle", value:true, label:"Display time"},
				firstTimeMessage: {type:"toggle", value:true, label:"Highlight first message of a user (all time)"},
				historySize: {type:"slider", value:100, label:"Max chat message count", min:50, max:1000, step:50},
				defaultSize: {type:"slider", value:2, label:"Default text size", min:1, max:4, step:1},
				modsSize: {type:"slider", value:2, label:"Text size of moderators", min:1, max:4, step:1, icon:""},
				vipsSize: {type:"slider", value:2, label:"Text size of VIPs", min:1, max:4, step:1, icon:""},
				subsSize: {type:"slider", value:2, label:"Text size of subs", min:1, max:4, step:1, icon:""},
			},
			filters: {
				firstMessage: {type:"toggle", value:true, label:"Show the first message of every viewer on a seperate list so you don't forget to say hello"},
				ignoreSelf: {type:"toggle", value:true, label:"Hide my messages"},
				hideBots: {type:"toggle", value:false, label:"Hide bots"},
				ignoreCommands: {type:"toggle", value:true, label:"Hide commands (messages starting with \"!\")"},
				showRewards: {type:"toggle", value:true, label:"Show rewards redeemed"},
			},
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
				const res = await fetch(Config.API_PATH+"/client_id");
				const jsonClientID = await res.json();
				TwitchUtils.client_id = jsonClientID.client_id;

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
			(state.chatMessages as IRCEventDataList.Message[]).push(payload);
			const maxMessages = state.params.appearance.historySize.value;
			if(state.chatMessages.length > maxMessages) {
				state.chatMessages = state.chatMessages.splice(state.chatMessages.length-maxMessages);
			}
		},
		
		delChatMessage(state, messageId:string) { 
			const list = (state.chatMessages as IRCEventDataList.Message[]);
			console.log("Delete chat message id", messageId);
			for (let i = 0; i < list.length; i++) {
				console.log("test", list[i].tags.id);
				if(messageId == list[i].tags.id) {
					console.log("Message FOund !");
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
	},
	actions: {
		async startApp({state, commit}) {

			//Loading parameters from storage and pushing them to the store
			const props = Store.getAll();
			for (const cat in state.params) {
				const c = cat as ParameterCategory;
				for (const key in props) {
					const k:ParameterType = key.replace(/^p:/gi, "") as ParameterType;
					if(props[k] == null) continue;
					if(props[key] == null) continue;
					if(/^p:/gi.test(key) && k in state.params[c]) {
						const v:string = props[key] as string;
						/* eslint-disable-next-line */
						const pointer = (state.params[c] as any)[k];
						if(typeof pointer[k].value === 'boolean') {
							pointer[k].value = (v == "true") as never;
						}
						if(typeof pointer[k].value === 'string') {
							pointer[k].value = v as never;
						}
						if(typeof pointer[k].value === 'number') {
							pointer[k].value = parseFloat(v) as never;
						}
					}
				}
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
					})
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

			IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, (event:IRCEvent) => {
				this.dispatch("delChatMessage", (event.data as IRCEventDataList.MessageDeleted).userstate['target-msg-id']);
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
	},
	modules: {
	}
})

export type ParameterCategory = "appearance" | "filters";
export type ParameterType = "hideBots" | "hideBadges" | "hideEmotes" | "minimalistBadges" | "historySize" | "firstMessage" | "highlightMentions" | "ignoreSelf" | "displayTime" | "ignoreCommands" | "defaultSize" | "modsSize" | "vipsSize" | "subsSize";

export interface ParameterData {
	type:string;
	value:boolean|number;
	label:string;
	min?:number;
	max?:number;
	step?:number;
	icon?:string;
}