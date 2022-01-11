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
	}
]

const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes
})

export default router
