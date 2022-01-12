import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { IRCEventDataList } from '@/utils/IRCEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import { Userstate } from 'tmi.js';
import { createStore } from 'vuex';
import Store from './Store';

export default createStore({
	state: {
		initComplete: false,
		authenticated: false,
		showParams: false,
		authToken: "",
		tmiToken: "",
		alert: "",
		tooltip: "",
		userCard: "",
		chatMessages: [],
		params: {

			firstMessage: {type:"toggle", value:true, label:"Show the first message of every viewer on a seperate list so you don't forget to say hello"},
			highlightMentions: {type:"toggle", value:true, label:"Highlight messages i'm mentioned in"},
			ignoreSelf: {type:"toggle", value:true, label:"Hide my messages"},
			hideBots: {type:"toggle", value:false, label:"Hide bots"},
			hideEmotes: {type:"toggle", value:false, label:"Hide emotes"},
			hideBadges: {type:"toggle", value:false, label:"Hide badges"},
			minimalistBadges: {type:"toggle", value:true, label:"Show minimalist badges"},
			displayTime: {type:"toggle", value:true, label:"Display time"},
			ignoreCommands: {type:"toggle", value:true, label:"Hide commands (messages starting with \"!\")"},
			historySize: {type:"slider", value:0, label:"Max chat message count", min:5, max:500, step:10},
			defaultSize: {type:"slider", value:0, label:"Default text size", min:1, max:4, step:1},
			modsSize: {type:"slider", value:0, label:"Text size of moderators", min:1, max:4, step:1, icon:""},
			vipsSize: {type:"slider", value:0, label:"Text size of VIPs", min:1, max:4, step:1, icon:""},
			subsSize: {type:"slider", value:0, label:"Text size of subs", min:1, max:4, step:1, icon:""},
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
		authenticate(state, token) {
			state.authToken = token;
			if(!Config.REQUIRE_APP_AUTHORIZATION) {
				IRCClient.instance.connect(state.user.login, state.authToken);
			}
			Store.set("authToken", token);
		},

		setUser(state, user) { state.user = user; },

		setTmiToken(state, tmiToken) {
			state.tmiToken = tmiToken;
			state.authenticated = true;
			Store.set("tmiToken", tmiToken);
			IRCClient.instance.connect(state.user.login, tmiToken);
		},

		logout(state) {
			state.authToken = "";
			state.authenticated = false;
			Store.remove("authToken");
			Store.remove("tmiToken");
			IRCClient.instance.disconnect();
		},

		confirm(state, payload) { state.confirm = payload; },

		openTooltip(state, payload) { state.tooltip = payload; },
		
		closeTooltip(state) { state.tooltip = ""; },
		
		showParams(state, payload) { state.showParams = payload; },

		openUserCard(state, payload) { state.userCard = payload; },
		
		addChatMessage(state, payload:IRCEventDataList.Message) {
			(state.chatMessages as IRCEventDataList.Message[]).push(payload);
			const maxMessages = state.params.historySize.value;
			if(state.chatMessages.length > maxMessages) {
				state.chatMessages = state.chatMessages.splice(state.chatMessages.length-maxMessages);
			}
		},
		
		delChatMessage(state, payload:IRCEventDataList.MessageDeleted) { 
			const list = (state.chatMessages as IRCEventDataList.Message[]);
			for (let i = 0; i < list.length; i++) {
				if(payload.deletedMessage == list[i].tags.id) {
					state.chatMessages.splice(i, 1);
				}
			}
		},

		delUserMessages(state, payload:Userstate) {
			const list = (state.chatMessages as IRCEventDataList.Message[]);
			for (let i = 0; i < list.length; i++) {
				const m = list[i];
				if(m.tags['user-id'] == payload['user-id']) {
					state.chatMessages.splice(i, 1);
					i--;
				}
				
			}
		},
	},
	actions: {
		async startApp({state, commit}) {
			const tmiToken = Store.get("tmiToken");
			const token = Config.REQUIRE_APP_AUTHORIZATION? Store.get("authToken") : tmiToken;

			//Loading parameters from storage and pushing them to the store
			const props = Store.getAll();
			for (const key in props) {
				if(props[key] == null) continue;

				const k:ParameterType = key.replace(/^p:/gi, "") as ParameterType;
				if(/^p:/gi.test(key) && k in state.params) {
					const v:string = props[key] as string;
					
					if(typeof state.params[k].value === 'boolean') {
						state.params[k].value = (v == "true") as never;
					}
					if(typeof state.params[k].value === 'string') {
						state.params[k].value = v as never;
					}
					if(typeof state.params[k].value === 'number') {
						state.params[k].value = parseFloat(v) as never;
					}
				}
			}

			if(token) {
				state.authToken = token;
				try {
					state.user = await TwitchUtils.validateToken(state.authToken);
					// console.log(Utils.formatDuration(state.user.expires_in))
					commit("authenticate", token);
					state.tmiToken = tmiToken;
					state.authenticated = tmiToken != "" && tmiToken != null;
				}catch(error) {
					state.authenticated = false;
					Store.remove("authToken");
					document.location.href = TwitchUtils.oAuthURL;
					// router.push({name: 'login'});
					return;
				}
			}

			IRCClient.instance.addEventListener(IRCEvent.MESSAGE, (event:IRCEvent) => {
				this.dispatch("addChatMessage", event.data);
			});

			IRCClient.instance.addEventListener(IRCEvent.DELETE_MESSAGE, (event:IRCEvent) => {
				this.dispatch("delChatMessage", event.data);
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

		authenticate({ commit }, token) { commit("authenticate", token); },

		setUser({ commit }, user) { commit("setUser", user); },

		setTmiToken({ commit }, tmiToken) { commit("setTmiToken", tmiToken); },

		logout({ commit }) { commit("logout"); },

		openTooltip({commit}, payload) { commit("openTooltip", payload); },
		
		closeTooltip({commit}) { commit("closeTooltip", null); },
		
		showParams({commit}, payload) { commit("showParams", payload); },
		
		openUserCard({commit}, payload) { commit("openUserCard", payload); },
		
		addChatMessage({commit}, payload) { commit("addChatMessage", payload); },
		
		delChatMessage({commit}, payload) { commit("delChatMessage", payload); },

		delUserMessages({commit}, payload) { commit("delUserMessages", payload); },
	},
	modules: {
	}
})

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