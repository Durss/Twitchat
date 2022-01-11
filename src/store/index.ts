import Config from '@/utils/Config';
import IRCClient from '@/utils/IRCClient';
import TwitchUtils from '@/utils/TwitchUtils';
import { createStore } from 'vuex';
import Store from './Store';

export default createStore({
	state: {
		initComplete: false,
		authenticated: false,
		authToken: "",
		tmiToken: "",
		alert: "",
		tooltip: "",
		params: {
			hideBots:true,
			hideBadges:true,
			hideEmotes:false,
			minimalistBadges:true,
			historySize:150,
			firstMessage:true,
			highlightMentions:true,
			ignoreSelf:true,
			displayTime:true,
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
			const key = payload.key as "firstMessage";
			state.params[key] = payload.value;
			Store.set("p:"+key, payload.value);
		},
	},
	actions: {
		async startApp({state, commit}) {
			const tmiToken = Store.get("tmiToken");
			const token = Config.REQUIRE_APP_AUTHORIZATION? Store.get("authToken") : tmiToken;
			state.params.firstMessage = Store.get("p:firstMessage") == "true";
			state.params.hideBots = Store.get("p:hideBots") == "true";
			state.params.highlightMentions = Store.get("p:highlightMentions") == "true";
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
	},
	modules: {
	}
})