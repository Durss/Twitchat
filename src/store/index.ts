import IRCClient from '@/utils/IRCClient';
import TwitchUtils from '@/utils/TwitchUtils';
import { createStore } from 'vuex';
import Store from './Store';

export default createStore({
	state: {
		initComplete: false,
		authenticated: false,
		authToken: "",
		alert: "",
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
			state.authenticated = true;
			Store.set("authToken", token);
		},

		setUser(state, user) {
			state.user = user;
		},

		logout(state) {
			state.authToken = "";
			state.authenticated = false;
			Store.remove("authToken");
		},

		confirm(state, payload) { state.confirm = payload; },
	},
	actions: {
		async startApp({state, commit}) {
			const token = Store.get("authToken");
			// const token = "8qrlcjskxlnj6szsy99v1l5uewh7qt";
			if(token) {
				state.authToken = token;
				try {
					state.user = await TwitchUtils.validateToken(state.authToken);
					// console.log(Utils.formatDuration(state.user.expires_in))
					commit("authenticate", token);
					state.authenticated = true;
				}catch(error) {
					state.authenticated = false;
					Store.remove("authToken");
					// router.push({name: 'login'});
					return;
				}
			}
			
			if(state.authenticated && !IRCClient.instance.connected) {
				try {
					IRCClient.instance.initialize("thesushidragon", state.authToken);
					// IRCClient.instance.initialize(state.user.login, state.authToken);
				}catch(error){error}
			}

			state.initComplete = true;
		},
		
		confirm({commit}, payload) { commit("confirm", payload); },

		alert({commit}, payload) { commit("alert", payload); },

		authenticate({ commit }, token) { commit("authenticate", token); },

		setUser({ commit }, user) { commit("setUser", user); },

		logout({ commit }) { commit("logout"); },
	},
	modules: {
	}
})