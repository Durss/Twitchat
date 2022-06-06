import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/all';
import { createApp } from 'vue';
import { NavigationGuardNext, RouteLocation } from 'vue-router';
import App from './App.vue';
import './less/index.less';
import router from './router';
import store from './store';
import { TwitchTypes } from './utils/TwitchUtils';
import Utils from './utils/Utils';

gsap.registerPlugin(ScrollToPlugin);

let tokenRefreshScheduled = false;

/**
 * Refreshes the oauth token when necessary
 */
async function scheduleTokenRefresh():Promise<void> {
	const expire = (store.state.oAuthToken as TwitchTypes.AuthTokenResult).expires_in;
	let delay = Math.max(0,expire*1000 - 60000 * 5);
	//Refresh at least every 1h
	const maxDelay = 1000 * 60 * 60;
	if(delay > maxDelay) delay = maxDelay;

	console.log("Refresh token in", delay);
	setTimeout(()=>{
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
		if(needAuth === true) {
			next({name: 'login'});
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

createApp(App)
.use(store)
.use(router)
.provide("$store", store)
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
.mount('#app')

window.addEventListener("beforeinstallprompt", (e)=> {
	e.preventDefault();
	store.dispatch("ahsInstaller", e);
});