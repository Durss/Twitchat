import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import IRCEvent, { IRCEventDataList } from '@/utils/IRCEvent';
import TwitchUtils from '@/utils/TwitchUtils';
import { Userstate } from 'tmi.js';
import { createStore } from 'vuex';
import Store from './Store';

export type ParameterType = "hideBots" | "hideBadges" | "hideEmotes" | "minimalistBadges" | "historySize" | "firstMessage" | "highlightMentions" | "ignoreSelf" | "displayTime" | "ignoreCommands" | "defaultSize" | "modsSize" | "vipsSize" | "subsSize";

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
			hideBots:true,
			hideBadges:true,
			hideEmotes:false,
			minimalistBadges:true,
			historySize:150,
			firstMessage:true,
			highlightMentions:true,
			ignoreSelf:false,
			displayTime:true,
			ignoreCommands:true,
			defaultSize:2,
			modsSize:2,
			vipsSize:2,
			subsSize:2,
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
		
		setParam(state, payload) {
			const key = payload.key as ParameterType;
			state.params[key] = payload.value as never;
			Store.set("p:"+key, payload.value);
			if(key == "historySize") {
				if(state.chatMessages.length > payload.value) {
					state.chatMessages = state.chatMessages.slice(0, payload.value);
				}
			}
		},
		
		showParams(state, payload) { state.showParams = payload; },

		openUserCard(state, payload) { state.userCard = payload; },
		
		addChatMessage(state, payload:IRCEventDataList.Message) {
			(state.chatMessages as IRCEventDataList.Message[]).push(payload);
			if(state.chatMessages.length > state.params.historySize) {
				state.chatMessages.shift();
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
			state.params.firstMessage = Store.get("p:firstMessage") != "false";
			state.params.hideBots = Store.get("p:hideBots") != "false";
			state.params.highlightMentions = Store.get("p:highlightMentions") != "false";
			state.params.ignoreCommands = Store.get("p:ignoreSelf") == "true";
			state.params.ignoreSelf = Store.get("p:ignoreSelf") == "true";
			state.params.displayTime = Store.get("p:displayTime") == "true";
			state.params.historySize = parseInt(Store.get("p:historySize")) || 100;
			state.params.defaultSize = parseInt(Store.get("p:defaultSize")) || 2;
			state.params.modsSize = parseInt(Store.get("p:modsSize")) || 2;
			state.params.vipsSize = parseInt(Store.get("p:vipsSize")) || 2;
			state.params.subsSize = parseInt(Store.get("p:subsSize")) || 2;

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
		
		setParam({commit}, payload) { commit("setParam", payload); },
		
		showParams({commit}, payload) { commit("showParams", payload); },
		
		openUserCard({commit}, payload) { commit("openUserCard", payload); },
		
		addChatMessage({commit}, payload) { commit("addChatMessage", payload); },
		
		delChatMessage({commit}, payload) { commit("delChatMessage", payload); },

		delUserMessages({commit}, payload) { commit("delUserMessages", payload); },
	},
	modules: {
	}
})