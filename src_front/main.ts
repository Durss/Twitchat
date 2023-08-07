import { createPopper } from '@popperjs/core';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/all';
import { createPinia } from 'pinia';
import { createApp, h, type DirectiveBinding, type VNode } from 'vue';
import { createI18n } from 'vue-i18n';
import type { NavigationGuardNext, RouteLocation } from 'vue-router';
import VueSelect from "vue-select";
import 'vue-select/dist/vue-select.css';
import CountryFlag from 'vue3-country-flag-icon';
import 'vue3-country-flag-icon/dist/CountryFlag.css';
import App from './App.vue';
import './less/index.less';
import router from './router';
import { storeAccessibility } from './store/accessibility/storeAccessibility';
import { storeAccount } from './store/account/storeAccount';
import { storeAdmin } from './store/admin/storeAdmin';
import { storeAuth } from './store/auth/storeAuth';
import { storeAutomod } from './store/automod/storeAutomod';
import { storeBingo } from './store/bingo/storeBingo';
import { storeChat } from './store/chat/storeChat';
import { storeChatSuggestion } from './store/chatSugg/storeChatSuggestion';
import { storeCounters } from './store/counters/storeCounters';
import DataStore from './store/DataStore';
import { storeDebug } from './store/debug/storeDebug';
import { storeEmergency } from './store/emergency/storeEmergency';
import { storeMusic } from './store/music/storeMusic';
import { storeOBS } from './store/obs/storeOBS';
import { storeParams } from './store/params/storeParams';
import { storePoll } from './store/poll/storePoll';
import { storePrediction } from './store/prediction/storePrediction';
import { storeRaffle } from './store/raffle/storeRaffle';
import { storeRewards } from './store/rewards/storeRewards';
import { storeMain } from './store/storeMain';
import StoreProxy, { type IAuthActions, type IAuthGetters, type IAuthState, type IChatActions, type IChatGetters, type IChatState, type ITriggersActions, type ITriggersGetters, type ITriggersState, type IUsersActions, type IUsersGetters, type IUsersState } from './store/StoreProxy';
import { storeStream } from './store/stream/storeStream';
import { storeTimer } from './store/timer/storeTimer';
import { storeTriggers } from './store/triggers/storeTriggers';
import { storeTTS } from './store/tts/storeTTS';
import { storeUsers } from './store/users/storeUsers';
import { storeVoice } from './store/voice/storeVoice';
import type { TwitchatDataTypes } from './types/TwitchatDataTypes';
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';
import ContextMenu from '@imengyu/vue3-context-menu';
import VueTippy from "vue-tippy";
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css'
import { setDefaultProps } from 'vue-tippy';
import Icon from './components/Icon.vue';
import { storeHeat } from './store/heat/storeHeat';
import { storePatreon } from './store/patreon/storePatreon';
import { divide } from 'mathjs';
import Config from './utils/Config';

setDefaultProps({
	theme:"twitchat",
	animation:"scale",
	duration:100,
	allowHTML:true,
	maxWidth:250,
});

const pinia = createPinia();
gsap.registerPlugin(ScrollToPlugin);
DataStore.init();

let lang: string = navigator.language || (<any>navigator)['userLanguage'];
lang = lang.substring(0, 2).toLowerCase();
const sLang = DataStore.get(DataStore.LANGUAGE);
if(sLang) lang = sLang;
const i18n = createI18n({
	locale:lang,
	fallbackLocale: 'en',
	fallbackWarn:false,
	warnHtmlInMessage: 'off',
	// modifiers:{
	// 	strong:(str)=> "<strong>"+str+"</strong>",
	// }
});


//Load labels before everything else so they are available when
//initializing stores data
(async()=> {
	try {
		const labelsRes = await fetch("/labels.json");
		const labelsJSON = await labelsRes.json();
		for (const lang in labelsJSON) {
			i18n.global.setLocaleMessage(lang, labelsJSON[lang]);
		}
	}catch(error) {
		console.log(error);
		setTimeout(() => {
			storeMain().alert( "An error occured when loading labels :(" );
			storeMain().initComplete = true;
		}, 1000);
	}
	buildApp();
})()

function buildApp() {
	/**
	 * Add route guards for login
	 */
	router.beforeEach(async (to: RouteLocation, from: RouteLocation, next: NavigationGuardNext) => {
		const sMain = StoreProxy.main;
		const sAuth = StoreProxy.auth;
		const needAuth = to.meta.needAuth !== false;
		const transparent = to.meta.noBG;
		if(transparent) {
			document.body.style.backgroundColor = "transparent";
		}
	
		//If landing on homepage, redirect to chat if an auth token is available
		const authToken = DataStore.get(DataStore.TWITCH_AUTH_TOKEN);
		if(authToken && to.name === "home") {
			next({name:"chat"});
			return;
		}
		
		if (!sMain.initComplete) {
			try {
				await new Promise((resolve) => { sMain.startApp(needAuth, resolve); });
			}catch(error) {
				console.log(error);
			}
		}
	
		if (!sAuth.authenticated) {
			//Not authenticated, reroute to login
			if(needAuth !== false && to.name != "login" && to.name != "logout" && to.name != "oauth") {
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
		return new URL(`/src_front/assets/${path}`, import.meta.url).href;
	}
	
	/**
	 * Fast acces to Configs
	 */
	const getConfig = ():Config => {
		return Config.instance;
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
		return StoreProxy.main.confirm(title, description, data, yesLabel, noLabel, STTOrigin);
	}
	
	/**
	 * Gets an overlay's URL
	 * @param id overlay ID
	 * @returns 
	 */
	const overlayURL = (id:string, params?:{k:string, v:string}[]):string => {
		const port = DataStore.get(DataStore.OBS_PORT);
		const pass = DataStore.get(DataStore.OBS_PASS);
		const ip = DataStore.get(DataStore.OBS_IP);
		const urlParams = new URLSearchParams()
		if(params) {
			for (let i = 0; i < params.length; i++) {
				urlParams.append(params[i].k, params[i].v);
			}
		}
		if(port) urlParams.append("obs_port", port);
		if(pass) urlParams.append("obs_pass", pass);
		if(ip) urlParams.append("obs_ip", ip);
		let suffix = urlParams.toString()
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
	const storeAccess = (id:"main"|"account"|"auth"|"automod"|"bingo"|"chat"|"chatSuggestion"|"emergency"|"music"|"obs"|"params"|"poll"|"prediction"|"raffle"|"stream"|"timer"|"triggers"|"tts"|"users"|"voice"|"debug"|"accessibility"|"admin"|"counters"|"rewards"|"heat"|"patreon") => {
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
			case "debug": return StoreProxy.debug;
			case "accessibility": return StoreProxy.accessibility;
			case "admin": return StoreProxy.admin;
			case "counters": return StoreProxy.counters;
			case "rewards": return StoreProxy.rewards;
			case "heat": return StoreProxy.heat;
			case "patreon": return StoreProxy.patreon;
		}
	}
	
	const app = createApp(App)
	.use(pinia);
	
	//Init stores before instanciating the router because the
	//router needs to access some stores
	StoreProxy.i18n = i18n.global;
	StoreProxy.image = image;
	StoreProxy.main = storeMain();
	StoreProxy.account = storeAccount();
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.auth = (storeAuth() as unknown) as IAuthState & IAuthGetters & IAuthActions & { $state: IAuthState; $reset:()=>void };
	StoreProxy.automod = storeAutomod();
	StoreProxy.bingo = storeBingo();
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.chat = (storeChat() as unknown) as IChatState & IChatGetters & IChatActions & { $state: IChatState; $reset:()=>void };
	StoreProxy.chatSuggestion = storeChatSuggestion();
	StoreProxy.emergency = storeEmergency();
	StoreProxy.music = storeMusic();
	StoreProxy.obs = storeOBS();
	StoreProxy.params = storeParams();
	StoreProxy.poll = storePoll();
	StoreProxy.prediction = storePrediction();
	StoreProxy.raffle = storeRaffle();
	StoreProxy.rewards = storeRewards();
	StoreProxy.stream = storeStream();
	StoreProxy.timer = storeTimer();
	StoreProxy.triggers = (storeTriggers() as unknown) as ITriggersState & ITriggersGetters & ITriggersActions & { $state: ITriggersState; $reset:()=>void };;
	StoreProxy.tts = storeTTS();
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.users = (storeUsers() as unknown) as IUsersState & IUsersGetters & IUsersActions & { $state: IUsersState; $reset:()=>void };
	StoreProxy.voice = storeVoice();
	StoreProxy.debug = storeDebug();
	StoreProxy.accessibility = storeAccessibility();
	StoreProxy.admin = storeAdmin();
	StoreProxy.counters = storeCounters();
	StoreProxy.heat = storeHeat();
	StoreProxy.patreon = storePatreon();
	StoreProxy.router = router;
	
	app.use(router)
	.use(i18n)
	.use(ContextMenu)
	.use(VueTippy,{
		directive: "tooltip",
		component: "tooltip",
	})
	.component("country-flag", CountryFlag)
	.component("vue-select", VueSelect)
	.component("Icon", Icon)
	.provide("$config", getConfig)
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
	})
	.directive('click2Select', {
		mounted(el:HTMLElement, binding:unknown) {
			if((binding as {[key:string]:boolean}).value !== false) {
				el.style.cursor = "default";
				el.addEventListener("click", ()=> {
					if(el.nodeName === "INPUT") {
						(el as HTMLInputElement).select();
					}else{
						el.ownerDocument?.getSelection()?.selectAllChildren(el);
					}
				});
			}
		}
	})
	.directive('newflag', {
		mounted(el:HTMLElement, binding:DirectiveBinding<{date:number, id:string, duration?:number}>, vnode:VNode<any, any, { [key: string]: any; }>) {
			if(binding && binding.value) {
				const {date, id} = binding.value;
				const maxDuration = binding.value.duration || 30 * 24 * 60 * 60000;
				//Flag as new only for 1 month
				if(Date.now() - date > maxDuration) return;

				//Don't flag is already marked as read
				const flagsDone = JSON.parse(DataStore.get(DataStore.NEW_FLAGS) || "[]");
				if(flagsDone.includes(id)) return;

				el.classList.add("newFlag");

				el.addEventListener("click", ()=>{
					const flagsDone = JSON.parse(DataStore.get(DataStore.NEW_FLAGS) || "[]");
					flagsDone.push(id);
					DataStore.set(DataStore.NEW_FLAGS, flagsDone);
					el.classList.remove("newFlag");
				});
			}
		},
		beforeUnmount(el:HTMLElement, binding:unknown) {
		}
	});
	app.config.globalProperties.$i18n = i18n;
	app.config.globalProperties.$image = image;
	app.config.globalProperties.$config = getConfig;
	app.config.globalProperties.$confirm = confirm;
	app.config.globalProperties.$store = storeAccess;
	app.config.globalProperties.$overlayURL = overlayURL;
	app.config.globalProperties.$placeDropdown = placeDropdown;
	
	window.addEventListener("beforeinstallprompt", (e:Event)=> {
		e.preventDefault();
		StoreProxy.main.setAhsInstaller(e as TwitchatDataTypes.InstallHandler);
	});
	
	app.mount('#app')
	
	document.addEventListener("keyup", (e:KeyboardEvent)=> {
		if(e.code == "KeyL" && e.ctrlKey && e.shiftKey) {
			StoreProxy.main.reloadLabels();
		}
		
		if(e.code == "KeyK" && e.ctrlKey && e.shiftKey) {
			StoreProxy.main.toggleTheme();
		}
		
		if(e.code == "Semicolon" && e.ctrlKey && e.shiftKey) {
			i18n.global.locale = i18n.global.locale == "fr"? "en" : "fr";
			DataStore.set(DataStore.LANGUAGE, i18n.global.locale);
		}
	})
}