import gsap from 'gsap';
import { ScrollToPlugin } from 'gsap/all';
import { createApp } from 'vue';
import { NavigationGuardNext, RouteLocation } from 'vue-router';
import App from './App.vue';
import './less/index.less';
import router from './router';
import store from './store';
import TwitchUtils, { TwitchTypes } from './utils/TwitchUtils';

gsap.registerPlugin(ScrollToPlugin);

/**
 * Refreshes the oauth token when necessary
 */
async function scheduleTokenRefresh():Promise<void> {
	const expire = (store.state.oAuthToken as TwitchTypes.AuthTokenResult).expires_at;
	const delay = (expire - 6000 * 5) - Date.now();
	
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
	
	if (!store.state.initComplete) {
		try {
			await store.dispatch("startApp");
			if(needAuth) {
				scheduleTokenRefresh();
			}
		}catch(error) {
			//Ignore
			error;
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
		//Already authenticated, reroute to home
		next({name: 'chat'});
		return;
	}
	next();
});

createApp(App)
.use(store)
.use(router)
.use(router)
.mount('#app');

// (
// 	async () => {
// 		const res = await TwitchUtils.validateToken("xxx");
// 		console.log(res);
// 	}
// )()