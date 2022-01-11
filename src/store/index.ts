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
			Store.set("authToken", token);
		},

		setUser(state, user) { state.user = user; },

		setTmiToken(state, tmiToken) {
			state.tmiToken = tmiToken;
			state.authenticated = true;
			Store.set("tmiToken", tmiToken);
		},

		logout(state) {
			state.authToken = "";
			state.authenticated = false;
			Store.remove("authToken");
			Store.remove("tmiToken");
		},

		confirm(state, payload) { state.confirm = payload; },

		openTooltip(state, payload) { state.tooltip = payload; },
		
		closeTooltip(state) { state.tooltip = ""; },
	},
	actions: {
		async startApp({state, commit}) {
			const token = Config.REQUIRE_APP_AUTHORIZATION? Store.get("authToken") : Store.get("tmiToken");
			const tmiToken = Store.get("tmiToken");
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
			
			if(state.authenticated && !IRCClient.instance.connected) {
				try {
					IRCClient.instance.initialize(state.user.login, state.authToken);
				}catch(error){error}
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
	},
	modules: {
	}
})