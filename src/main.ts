import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/all';
import { createApp } from 'vue';
import type { NavigationGuardNext, RouteLocation } from 'vue-router';
import VueSelect from "vue-select";
import 'vue-select/dist/vue-select.css';
import CountryFlag from 'vue3-country-flag-icon';
import 'vue3-country-flag-icon/dist/CountryFlag.css'; // import stylesheet
import App from './App.vue';
import './less/index.less';
import router from './router';
import store from './store';
import Store from './store/Store';
import StoreProxy from './utils/StoreProxy';
import UserSession from './utils/UserSession';
import Utils from './utils/Utils';

gsap.registerPlugin(ScrollToPlugin);

let tokenRefreshScheduled = false;

/**
 * Refreshes the oauth token when necessary
 */
async function scheduleTokenRefresh():Promise<void> {
	if(!UserSession.instance.authResult) return;

	const expire = UserSession.instance.authResult.expires_in;
	let delay = Math.max(0,expire*1000 - 60000 * 5);
	//Refresh at least every 1h
	const maxDelay = 1000 * 60 * 60;
	if(delay > maxDelay) delay = maxDelay;

	console.log("Refresh token in", delay);
	window.setTimeout(()=>{
		store.dispatch("authenticate", {forceRefresh:true, cb:(success:boolean)=>{
			if(success) {
				scheduleTokenRefresh();
			}else{
				router.push({name: 'login'});
			}
		}});
	}, delay);
}

/**
 * Add route guards for login
 */
router.beforeEach(async (to: RouteLocation, from: RouteLocation, next: NavigationGuardNext) => {
	const needAuth = to.meta.needAuth;
	const publicRoute = to.meta.public;
	const transparent = to.meta.noBG;
	if(transparent) {
		document.body.style.backgroundColor = "transparent";
	}else{
		document.body.style.backgroundColor = Utils.getLessVars().mainColor_dark as string;
	}
	
	if (!store.state.initComplete) {
		try {
			await new Promise((resolve) => {
				store.dispatch("startApp", {authenticate:needAuth || to.name == "home", callback:resolve});
			});
		}catch(error) {
			console.log(error);
		}
	}

	if (!store.state.authenticated) {
		//Not authenticated, reroute to login
		if(needAuth !== false && to.name != "login" && to.name != "oauth") {
			next({name: 'login', params: {redirect: to.name?.toString()}});
		}else{
			next();
		}
		return;
	}
	
	if(!needAuth && publicRoute !== true) {
		//Already authenticated, reroute to chat
		next({name: 'chat'});
		return;
	}

	if(needAuth && !tokenRefreshScheduled) {
		tokenRefreshScheduled = true;
		scheduleTokenRefresh();
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
	noLabel?:string): Promise<T|undefined> => {
	const prom = <Promise<T|undefined>>new Promise((resolve, reject) => {
		const confirmData = {
			title,
			description,
			yesLabel,
			noLabel,
			confirmCallback : () => {
				resolve(data);
			},
			cancelCallback : () => {
				reject(data);
			}
		}
		store.dispatch("confirm", confirmData);
	});
	return prom;
}

StoreProxy.store = store;

/**
 * Gets an overlay's URL
 * @param id overlay ID
 * @returns 
 */
const overlayURL = (id:string):string => {
	const port = Store.get("obsPort");
	const pass = Store.get("obsPass");
	const ip = Store.get("obsIP");
	const params = new URLSearchParams()
	params.append("obs_port", port);
	params.append("obs_pass", pass);
	params.append("obs_ip", ip);
	return document.location.origin + router.resolve({name:"overlay", params:{id}}).fullPath + "?" + params.toString();
}

const app = createApp(App)
.use(store)
.use(router)
.component("country-flag", CountryFlag)
.component("vue-select", VueSelect)
.provide("$store", store)
.provide("$image", image)
.provide("$confirm", confirm)
.provide("$overlayURL", overlayURL)
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
app.mount('#app')

window.addEventListener("beforeinstallprompt", (e)=> {
	e.preventDefault();
	store.dispatch("ahsInstaller", e);
});
