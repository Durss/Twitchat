import { createPopper } from '@popperjs/core';
import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/all';
import { createApp } from 'vue';
import type { NavigationGuardNext, RouteLocation } from 'vue-router';
import VueSelect from "vue-select";
import 'vue-select/dist/vue-select.css';
import App from './App.vue';
import './less/index.less';
import router from './router';
import store from './store';
import Store from './store/Store';
import StoreProxy from './utils/StoreProxy';
import Utils from './utils/Utils';

gsap.registerPlugin(ScrollToPlugin);

/**
 * Add route guards for login
 */
router.beforeEach(async (to: RouteLocation, from: RouteLocation, next: NavigationGuardNext) => {
	const needAuth = to.meta.needAuth;
	const transparent = to.meta.noBG;
	if(transparent) {
		document.body.style.backgroundColor = "transparent";
	}else{
		document.body.style.backgroundColor = Utils.getLessVars().mainColor_dark as string;
	}
	
	if (!store.state.initComplete) {
		try {
			await new Promise((resolve) => {
				store.dispatch("startApp", {authenticate:needAuth, callback:resolve});
			});
		}catch(error) {
			console.log(error);
		}
	}

	if (!store.state.authenticated) {
		//Not authenticated, reroute to login
		if(needAuth === true) {
			next({name: 'login'});
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

/**
 * Gets an overlay's URL
 * @param id overlay ID
 * @returns 
 */
const overlayURL = (id:string):string => {
	const port = Store.get(Store.OBS_PORT);
	const pass = Store.get(Store.OBS_PASS);
	const ip = Store.get(Store.OBS_IP);
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


StoreProxy.store = store;
Store.init();

const app = createApp(App)
.use(store)
.use(router)
.component("vue-select", VueSelect)
.provide("$store", store)
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

window.addEventListener("beforeinstallprompt", (e)=> {
	e.preventDefault();
	store.dispatch("ahsInstaller", e);
});
