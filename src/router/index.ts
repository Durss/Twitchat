import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Chat from '../views/Chat.vue'
import ChatLight from '../views/ChatLight.vue'
import Login from '../views/Login.vue'

const routes: Array<RouteRecordRaw> = [
	{
		path: '/',
		name: 'home',
		component: Chat,
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
		path: '/chat/:login',
		name: 'chatLight',
		component: ChatLight,
		meta: {
			needAuth:false,
			public:true,
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
	}
]

const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes
})

export default router
