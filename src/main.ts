import { createPopper } from '@popperjs/core';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/all';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import type { NavigationGuardNext, RouteLocation } from 'vue-router';
import VueSelect from "vue-select";
import 'vue-select/dist/vue-select.css';
import CountryFlag from 'vue3-country-flag-icon';
import 'vue3-country-flag-icon/dist/CountryFlag.css'; // import stylesheet
import App from './App.vue';
import './less/index.less';
import router from './router';
import { storeAccount } from './store/account/storeAccount';
import { storeAuth } from './store/auth/storeAuth';
import { storeAutomod } from './store/automod/storeAutomod';
import { storeBingo } from './store/bingo/storeBingo';
import { storeChat } from './store/chat/storeChat';
import { storeChatSuggestion } from './store/chatSugg/storeChatSuggestion';
import DataStore from './store/DataStore';
import { storeEmergency } from './store/emergency/storeEmergency';
import { storeMusic } from './store/music/storeMusic';
import { storeOBS } from './store/obs/storeOBS';
import { storeParams } from './store/params/storeParams';
import { storePoll } from './store/poll/storePoll';
import { storePrediction } from './store/prediction/storePrediction';
import { storeRaffle } from './store/raffle/storeRaffle';
import { storeMain } from './store/storeMain';
import StoreProxy from './store/StoreProxy';
import { storeStream } from './store/stream/storeStream';
import { storeTimer } from './store/timer/storeTimer';
import { storeTriggers } from './store/triggers/storeTriggers';
import { storeTTS } from './store/tts/storeTTS';
import { storeUsers } from './store/users/storeUsers';
import { storeVoice } from './store/voice/storeVoice';
import type { TwitchatDataTypes } from './types/TwitchatDataTypes';
import Utils from './utils/Utils';

const pinia = createPinia()
gsap.registerPlugin(ScrollToPlugin);

/**
 * Add route guards for login
 */
router.beforeEach(async (to: RouteLocation, from: RouteLocation, next: NavigationGuardNext) => {
	const sMain = storeMain();
	const sAuth = storeAuth();
	const needAuth = to.meta.needAuth !== false;
	const transparent = to.meta.noBG;
	if(transparent) {
		document.body.style.backgroundColor = "transparent";
	}else{
		document.body.style.backgroundColor = Utils.getLessVars().mainColor_dark as string;
	}

	//If landing on homepage, edirect to chat if an auth token is available
	const authToken = DataStore.get(DataStore.TWITCH_AUTH_TOKEN);
	if(authToken && to.name === "home") {
		next({name:"chat"});
		return;
	}
	
	if (!sMain.initComplete) {
		try {
			await new Promise((resolve) => {
				sMain.startApp({authenticate:needAuth, callback:resolve});
			});
		}catch(error) {
			console.log(error);
		}
	}

	if (!sAuth.authenticated) {
		//Not authenticated, reroute to login
		if(needAuth !== false && to.name != "login" && to.name != "oauth") {
			next({name: 'login', params: {redirect: to.name?.toString()}});
			return;
		}
	}

	next();
});

/**
 * Include an image from the asset folder
 */
const image = (path:string):string => {
	return new URL(`/src/assets/${path}`, import.meta.url).href;
}

/**
 * Opens up a confirm window so the user can confirm or cancel an action.
 */
const confirm = <T>(title: string,
	description?: string,
	data?: T,
	yesLabel?:string,
	noLabel?:string,
	STTOrigin?:boolean): Promise<T|undefined> => {
	const prom = <Promise<T|undefined>>new Promise((resolve, reject) => {
		const confirmData = {
			title,
			description,
			yesLabel,
			noLabel,
			STTOrigin,
			confirmCallback : () => {
				resolve(data);
			},
			cancelCallback : () => {
				reject(data);
			}
		}
		storeMain().confirmData(confirmData);
	});
	return prom;
}

/**
 * Gets an overlay's URL
 * @param id overlay ID
 * @returns 
 */
const overlayURL = (id:string):string => {
	const port = DataStore.get(DataStore.OBS_PORT);
	const pass = DataStore.get(DataStore.OBS_PASS);
	const ip = DataStore.get(DataStore.OBS_IP);
	const params = new URLSearchParams()
	if(port) params.append("obs_port", port);
	if(pass) params.append("obs_pass", pass);
	if(ip) params.append("obs_ip", ip);
	let suffix = params.toString()
	if(suffix) suffix = "?" + suffix;
	return document.location.origin + router.resolve({name:"overlay", params:{id}}).fullPath + suffix;
}

/**
 * Global helper to place a dropdown list
 */
const placeDropdown = (dropdownList:HTMLDivElement, component:Vue, params:{width:string, left:string, top:string}) => {
	dropdownList.style.width = params.width;
	const popper = createPopper(component.$refs.toggle as HTMLElement, dropdownList, { placement: "top" })
	return () => popper.destroy()
}

/**
 * Global helper to place a dropdown list
 */
const storeAccess = (id:"main"|"account"|"auth"|"automod"|"bingo"|"chat"|"chatSuggestion"|"emergency"|"music"|"obs"|"params"|"poll"|"prediction"|"raffle"|"stream"|"timer"|"triggers"|"tts"|"users"|"voice") => {
	// main
	// account
	// auth
	// automod
	// bingo
	// chat
	// chatSuggestion
	// emergency
	// music
	// obs
	// params
	// poll
	// prediction
	// raffle
	// stream
	// timer
	// triggers
	// tts
	// users
	// voice
	switch(id) {
		case "main": return StoreProxy.main;
		case "account": return StoreProxy.account;
		case "auth": return StoreProxy.auth;
		case "automod": return StoreProxy.automod;
		case "bingo": return StoreProxy.bingo;
		case "chat": return StoreProxy.chat;
		case "chatSuggestion": return StoreProxy.chatSuggestion;
		case "emergency": return StoreProxy.emergency;
		case "music": return StoreProxy.music;
		case "obs": return StoreProxy.obs;
		case "params": return StoreProxy.params;
		case "poll": return StoreProxy.poll;
		case "prediction": return StoreProxy.prediction;
		case "raffle": return StoreProxy.raffle;
		case "stream": return StoreProxy.stream;
		case "timer": return StoreProxy.timer;
		case "triggers": return StoreProxy.triggers;
		case "tts": return StoreProxy.tts;
		case "users": return StoreProxy.users;
		case "voice": return StoreProxy.voice;
	}
}

DataStore.init();

const app = createApp(App)
.use(pinia)
.use(router)
.component("country-flag", CountryFlag)
.component("vue-select", VueSelect)
.provide("$image", image)
.provide("$store", storeAccess)
.provide("$confirm", confirm)
.provide("$overlayURL", overlayURL)
.provide("$placeDropdown", placeDropdown)
.directive('autofocus', {
	mounted(el:HTMLDivElement, binding:unknown) {
		if((binding as {[key:string]:boolean}).value !== false) {
			//Disabling scroll avoids breaking layout when opening
			//a ChannelNotifications content that has an autofocus element.
			//In such case, if the focus is given during the opening
			//transition, it completely breaks the chat layout, adding
			//lots of space under the chat and activities.
			//The "preventScroll" flag avoids this.
			el.focus({preventScroll:true});
		}
	}
});
app.config.globalProperties.$image = image;
app.config.globalProperties.$store = storeAccess;
app.config.globalProperties.$confirm = confirm;
app.config.globalProperties.$overlayURL = overlayURL;
app.config.globalProperties.$placeDropdown = placeDropdown;

StoreProxy.main = storeMain();
StoreProxy.account = storeAccount();
StoreProxy.auth = storeAuth();
StoreProxy.automod = storeAutomod();
StoreProxy.bingo = storeBingo();
StoreProxy.chat = storeChat();
StoreProxy.chatSuggestion = storeChatSuggestion();
StoreProxy.emergency = storeEmergency();
StoreProxy.music = storeMusic();
StoreProxy.obs = storeOBS();
StoreProxy.params = storeParams();
StoreProxy.poll = storePoll();
StoreProxy.prediction = storePrediction();
StoreProxy.raffle = storeRaffle();
StoreProxy.stream = storeStream();
StoreProxy.timer = storeTimer();
StoreProxy.triggers = storeTriggers();
StoreProxy.tts = storeTTS();
StoreProxy.users = storeUsers();
StoreProxy.voice = storeVoice();

window.addEventListener("beforeinstallprompt", (e:Event)=> {
	e.preventDefault();
	StoreProxy.main.setAhsInstaller(e as TwitchatDataTypes.InstallHandler);
});

app.mount('#app')