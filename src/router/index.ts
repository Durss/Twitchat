import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import Chat from '../views/Chat.vue'
import Home from '../views/Home.vue'
import ChatLight from '../views/ChatLight.vue'
import Login from '../views/Login.vue'
import Logout from '../views/Logout.vue'
import Overlay from '../views/Overlay.vue'
import store from '@/store'
import Utils from '@/utils/Utils'
import { SpotifyAuthResult } from '@/utils/SpotifyHelper'

const routes: Array<RouteRecordRaw> = [
	{
		path: '/',
		name: 'home',
		component: Home,
		meta: {
			overflow:true,
			needAuth:false,
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
			noBG:true,
		}
	},
	{
		path: '/login',
		name: 'login',
		component: Login
	},
	{
		path: '/logout',
		name: 'logout',
		component: Logout
	},
	{
		path: '/oauth',
		name: 'oauth',
		component: Login,
	},
	{
		path: '/spotify/auth',
		name: 'spotify/auth',
		redirect:() => {
			if(!Utils.getQueryParameterByName("error")) {
				store.state.showParams = true;//Open params
				store.state.tempStoreValue = "CONTENT:overlays";//Set default param tab to open
	
				const params:SpotifyAuthResult = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				store.dispatch("setSpotifyAuthResult", params)
			}
			return {name:"chat"}
		},
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/overlay/:id(.*)',
		name: 'overlay',
		component: Overlay,
		meta: {
			needAuth:false,
			public:true,
			noBG:true,
			overflow:false,
		}
	},
	{
		path: "/:path(.*)",
		redirect:() => {
			return {name:"home"}
		},
	}
]

const router = createRouter({
	history: createWebHistory(process.env.BASE_URL),
	routes
})

export default router
