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
import DataStore from './store/DataStore';
import { storeMain } from './store/storeMain';
import StoreProxy from './store/StoreProxy';
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
		storeMain().confirm(confirmData);
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


DataStore.init();

const app = createApp(App)
.use(pinia)
.use(router)
.component("country-flag", CountryFlag)
.component("vue-select", VueSelect)
.provide("$image", image)
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
app.config.globalProperties.$confirm = confirm;
app.config.globalProperties.$overlayURL = overlayURL;
app.config.globalProperties.$placeDropdown = placeDropdown;
app.mount('#app')

StoreProxy.main = storeMain();
StoreProxy.auth = storeAuth();
StoreProxy.chat = storeChat();
StoreProxy.bingo = storeBingo();
StoreProxy.automod = storeAutomod();
StoreProxy.account = storeAccount();

window.addEventListener("beforeinstallprompt", (e:Event)=> {
	e.preventDefault();
	storeMain().setAhsInstaller(e as TwitchatDataTypes.InstallHandler);
});