import store from '@/store'
import Utils from '@/utils/Utils'
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Chat from '../views/Chat.vue'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'

const routes: Array<RouteRecordRaw> = [
	{
		path: '/',
		name: 'home',
		component: Home,
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/chat',
		name: 'chat',
		component: Chat,
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/login',
		name: 'login',
		component: Login
	},
	{
		path: '/oauth',
		name: 'oauth',
		component: Login,
		beforeEnter: ()=> {
			const token = Utils.getQueryParameterByName("access_token");
			// let state = Utils.getQueryParameterByName("state");//Contains the route's name before auth flow
			// let error = Utils.getQueryParameterByName("error");
			if(token) {
				store.dispatch("authenticate", token);
			}else{
				store.dispatch("alert", "Vous avez refusé l'accès à l'application Twitch.");
			}
			router.push({name:"home"});
		},
	}
]

const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes
})

export default router
