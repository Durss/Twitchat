import ContextMenu from '@imengyu/vue3-context-menu';
import '@imengyu/vue3-context-menu/lib/vue3-context-menu.css';
import { createPopper } from '@popperjs/core';
import { dedupeIntegration } from "@sentry/integrations";
import * as Sentry from "@sentry/vue";
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/all';
import { createPinia } from 'pinia';
import 'tippy.js/animations/scale.css';
import 'tippy.js/dist/tippy.css';
import { createApp, type DirectiveBinding, type VNode } from "vue";
import CountryFlag from 'vue-country-flag-next';
import { createI18n } from 'vue-i18n';
import type { NavigationGuardNext, RouteLocation } from 'vue-router';
import VueSelect from "vue-select";
import 'vue-select/dist/vue-select.css';
import VueTippy, { setDefaultProps } from "vue-tippy";
import App from './App.vue';
import Icon from './components/Icon.vue';
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
import { storeDiscord } from './store/discord/storeDiscord';
import { storeEmergency } from './store/emergency/storeEmergency';
import { storeExtension } from './store/extension/storeExtension';
import { storeHeat } from './store/heat/storeHeat';
import { storeKofi } from './store/kofi/storeKofi';
import { storeMusic } from './store/music/storeMusic';
import { storeOBS } from './store/obs/storeOBS';
import { storeParams } from './store/params/storeParams';
import { storePatreon } from './store/patreon/storePatreon';
import { storePoll } from './store/poll/storePoll';
import { storePrediction } from './store/prediction/storePrediction';
import { storeQna } from './store/qna/storeQna';
import { storeRaffle } from './store/raffle/storeRaffle';
import { storeRewards } from './store/rewards/storeRewards';
import { storeMain } from './store/storeMain';
import * as StoreProxy from './store/StoreProxy';
import { storeStream } from './store/stream/storeStream';
import { storeStreamelements } from './store/streamelements/storeStreamelements';
import { storeStreamlabs } from './store/streamlabs/storeStreamlabs';
import { storeTimer } from './store/timer/storeTimer';
import { storeTriggers } from './store/triggers/storeTriggers';
import { storeTTS } from './store/tts/storeTTS';
import { storeUsers } from './store/users/storeUsers';
import { storeValues } from './store/values/storeValues';
import { storeVoice } from './store/voice/storeVoice';
import { storeYoutube } from './store/youtube/storeYoutube';
import type { TwitchatDataTypes } from './types/TwitchatDataTypes';
import Config from './utils/Config';
import { storeLumia } from './store/lumia/storeLumia';
import { storeTipeee } from './store/tipeee/storeTipeee';

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
	warnHtmlInMessage:'off',
	silentFallbackWarn:!Config.instance.IS_PROD,
	silentTranslationWarn:!Config.instance.IS_PROD,
	// modifiers:{
	// 	strong:(str)=> "<strong>"+str+"</strong>",
	// }
});


//Load labels before everything else so they are available when
//initializing stores data
(async()=> {
	try {
		window.setInitMessage("loading labels");
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
		const sMain = StoreProxy.default.main;
		const sAuth = StoreProxy.default.auth;
		const needAuth = to.meta.needAuth !== false;
		const needAdmin = to.meta.needAdmin === true;
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
			if(needAuth && to.name != "login" && to.name != "logout" && to.name != "oauth") {
				next({name: 'login', params: {redirect: to.name?.toString()}});
				return;
			}
		}
	
		//Not admin, reroute to login
		if(needAdmin && !StoreProxy.default.auth.isAdmin) {
			next({name: 'home'});
			return;
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
	 * Opens up a confirm window so the user can confirm or cancel an action.
	 */
	const confirm = <T>(title: string,
		description?: string,
		data?: T,
		yesLabel?:string,
		noLabel?:string,
		STTOrigin?:boolean): Promise<T|undefined> => {
		return StoreProxy.default.main.confirm(title, description, data, yesLabel, noLabel, STTOrigin);
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
	const placeDropdown = (dropdownList:HTMLDivElement, component:{"$refs":{[key:string]:HTMLElement}}, params:{width:string, left:string, top:string}) => {
		dropdownList.style.width = params.width;
		const popper = createPopper(component.$refs.toggle, dropdownList, { placement: "top" })
		return () => popper.destroy()
	}
	
	const app = createApp(App)
	.use(pinia);
	
	//Init stores before instanciating the router because the
	//router needs to access some stores
	StoreProxy.default.router = router;
	StoreProxy.default.i18n = i18n.global;
	StoreProxy.default.image = image;
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.default.main = (storeMain() as unknown) as StoreProxy.IMainState & StoreProxy.IMainGetters & StoreProxy.IMainActions & { $state: StoreProxy.IMainState; $reset:()=>void };
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.default.auth = (storeAuth() as unknown) as StoreProxy.IAuthState & StoreProxy.IAuthGetters & StoreProxy.IAuthActions & { $state: StoreProxy.IAuthState; $reset:()=>void };
	StoreProxy.default.automod = storeAutomod();
	StoreProxy.default.bingo = storeBingo();
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.default.chat = (storeChat() as unknown) as StoreProxy.IChatState & StoreProxy.IChatGetters & StoreProxy.IChatActions & { $state: StoreProxy.IChatState; $reset:()=>void };
	StoreProxy.default.chatSuggestion = storeChatSuggestion();
	StoreProxy.default.emergency = storeEmergency();
	StoreProxy.default.music = storeMusic();
	StoreProxy.default.obs = storeOBS();
	StoreProxy.default.params = storeParams();
	StoreProxy.default.poll = storePoll();
	StoreProxy.default.prediction = storePrediction();
	StoreProxy.default.raffle = storeRaffle();
	StoreProxy.default.rewards = storeRewards();
	StoreProxy.default.stream = storeStream();
	StoreProxy.default.timer = storeTimer();
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.default.triggers = (storeTriggers() as unknown) as StoreProxy.ITriggersState & StoreProxy.ITriggersGetters & StoreProxy.ITriggersActions & { $state: StoreProxy.ITriggersState; $reset:()=>void };
	StoreProxy.default.tts = storeTTS();
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.default.users = (storeUsers() as unknown) as StoreProxy.IUsersState & StoreProxy.IUsersGetters & StoreProxy.IUsersActions & { $state: StoreProxy.IUsersState; $reset:()=>void };
	StoreProxy.default.voice = storeVoice();
	StoreProxy.default.debug = storeDebug();
	StoreProxy.default.accessibility = storeAccessibility();
	StoreProxy.default.admin = storeAdmin();
	StoreProxy.default.counters = storeCounters();
	StoreProxy.default.heat = storeHeat();
	StoreProxy.default.patreon = storePatreon();
	StoreProxy.default.youtube = storeYoutube();
	StoreProxy.default.values = storeValues();
	StoreProxy.default.account = storeAccount();
	StoreProxy.default.extension = storeExtension();
	StoreProxy.default.qna = storeQna();
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.default.discord = (storeDiscord() as unknown) as StoreProxy.IDiscordState & StoreProxy.IDiscordGetters & StoreProxy.IDiscordActions & { $state: StoreProxy.IDiscordState; $reset:()=>void };
	StoreProxy.default.streamlabs = storeStreamlabs();
	StoreProxy.default.streamelements = storeStreamelements();
	StoreProxy.default.kofi = storeKofi();
	StoreProxy.default.lumia = storeLumia();
	StoreProxy.default.tipeee = storeTipeee();

	const keys = Object.keys(StoreProxy.default);
	keys.forEach(k => {
		if(!StoreProxy.default[k as keyof typeof StoreProxy.default]) {
			console.error("ERROR !! StoreProxy \""+k+"\" not initialized !");
		}
	})

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
	.provide("$config", Config.instance)
	.provide("$image", image)
	.provide("$store", StoreProxy.default)
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
				//date : contains the date at which something has been flagged as new
				//id : id of the item flaged as new
				//duration : duration during which the item should be flaged as new (1 month by default)
				const {date, id, duration} = binding.value;
				const maxDuration = duration || 30 * 24 * 60 * 60000;
				//Flag as new only for 1 month
				if(Date.now() - date > maxDuration) return;

				//Don't flag is already marked as read
				const flagsDone = JSON.parse(DataStore.get(DataStore.NEW_FLAGS) || "[]");
				if(flagsDone.includes(id)) return;

				el.classList.add("newFlag");

				el.addEventListener("click", ()=>{
					const flagsDone = JSON.parse(DataStore.get(DataStore.NEW_FLAGS) || "[]");
					if(!flagsDone.includes(id)) {
						flagsDone.push(id);
						DataStore.set(DataStore.NEW_FLAGS, flagsDone);
					}
					el.classList.remove("newFlag");
				});
			}
		},
		beforeUnmount(el:HTMLElement, binding:unknown) {
		}
	});
	app.config.globalProperties.$image = image;
	app.config.globalProperties.$config = Config.instance;
	app.config.globalProperties.$confirm = confirm;
	app.config.globalProperties.$overlayURL = overlayURL;
	app.config.globalProperties.$placeDropdown = placeDropdown;
	app.config.globalProperties.$store = StoreProxy.default;
	
	window.addEventListener("beforeinstallprompt", (e:Event)=> {
		e.preventDefault();
		StoreProxy.default.main.setAhsInstaller(e as TwitchatDataTypes.InstallHandler);
	});

	const currentABVersion = 2;
	const userRangeTargetRatio = .75;
	let sentryParam = {v:currentABVersion, date:Date.now(), enabled:false};
	let sentryParamSrc = DataStore.get(DataStore.AB_SENTRY);
	//Reset old data format
	if(sentryParamSrc === "true" || sentryParamSrc === "false") sentryParamSrc = null;
	//Sentry params not yet defined, initialize it
	if(!sentryParamSrc)  {
		sentryParam.v = 2;
		sentryParam.enabled = Math.random() < userRangeTargetRatio;
		DataStore.set(DataStore.AB_SENTRY, sentryParam);
	}else{
		try {
			const json = JSON.parse(sentryParamSrc);
			sentryParam = json;
			if(sentryParam.v != currentABVersion) {
				sentryParam.v = currentABVersion;
				sentryParam.enabled = Math.random() < userRangeTargetRatio;
				DataStore.set(DataStore.AB_SENTRY, sentryParam);
			}
		}catch(error) { }
	}
	if((Config.instance.BETA_MODE || sentryParam.enabled) && document.location.hostname != "localhost") {
		Sentry.init({
			app,
			debug:false,
			release:"twitchat@"+import.meta.env.PACKAGE_VERSION,
			dsn: "https://0523bfa89ecd12c501ad6bc66ea6fe71@o4506682942095360.ingest.sentry.io/4506682943668224",
			integrations: [
				dedupeIntegration()
			],
			//@ts-ignore
			environment:{"beta.twitchat.fr":"beta", "twitchat.fr":"prod"}[document.location.hostname] || document.location.hostname,
			tracesSampleRate: 1.0,
			ignoreErrors: [
							"reading 'innerText'",//When emptying a content-editable field
							"venmo",//When opening paypal popup
							"Detected popup close",//When closing paypal popup
							"OBS is not ready",//If trying to connect to OBS when OBS-ws is booting
							"This is likely a Vue internals bug"//Dev potential exception
						],
		});
	}
	
	app.mount('#app');
	
	document.addEventListener("keyup", (e:KeyboardEvent)=> {
		//Given a Sentry error, a user apparently succeeded to have an
		//"undefined" e.key value on an up to date Edge browser
		if(!e.key) return;

		//Reload labels on CTRL+Shift+L
		if(e.key.toLowerCase() == "l" && e.ctrlKey && e.altKey) {
			StoreProxy.default.main.reloadLabels();
			e.preventDefault();
		}
		
		//Toggle light/dark mode on CTRL+Shift+K
		if(e.key.toLowerCase() == "k" && e.ctrlKey && e.altKey) {
			StoreProxy.default.main.toggleTheme();
			e.preventDefault();
		}

		//Walk through available locales on CTRL+Shift+M
		if(e.key.toLowerCase() == "m" && e.ctrlKey && e.altKey) {
			const locales = i18n.global.availableLocales;
			i18n.global.locale = locales[(locales.indexOf(i18n.global.locale) + 1)%locales.length];
			DataStore.set(DataStore.LANGUAGE, i18n.global.locale);
			e.preventDefault();
		}
	}, true);
}