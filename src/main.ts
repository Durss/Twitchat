import { createApp } from 'vue';
import { NavigationGuardNext, RouteLocation } from 'vue-router';
import App from './App.vue';
import './less/index.less';
import router from './router';
import store from './store';
import Utils from './utils/Utils';


router.beforeEach(async (to: RouteLocation, from: RouteLocation, next: NavigationGuardNext) => {
	if (!store.state.initComplete) {
		try {
			await store.dispatch("startApp");
		}catch(error) {
			//Ignore
			error;
		}
	}

	const needAuth = Utils.getRouteMetaValue(to, "needAuth");
	if (!store.state.authenticated || !store.state.tmiToken) {
		//Not authenticated, reroute to login
		if(needAuth === true) {
			next({name: 'login'});
		}else{
			next();
		}
		return;
	}
	
	if(!needAuth) {
		//Already authenticated, reroute to home
		next({name: 'chat'});
		return;
	}
	next();
});

createApp(App).use(store).use(router).mount('#app');