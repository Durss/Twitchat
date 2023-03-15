import StoreProxy from '@/store/StoreProxy'
import type { SpotifyAuthResult } from '@/utils/music/SpotifyDataTypes'
import Utils from '@/utils/Utils'
import Chat from '@/views/Chat.vue'
import ChatLight from '@/views/ChatLight.vue'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Logout from '@/views/Logout.vue'
import Overlay from '@/views/Overlay.vue'
import RemoteVoiceControl from '@/views/RemoteVoiceControl.vue'
import Sponsor from '@/views/Sponsor.vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import PublicApiTest from '@/views/PublicApiTest.vue'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'


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
		path: '/home',
		name: 'home_forced',
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
		path: '/sponsor',
		name: 'sponsor',
		component: Sponsor,
		meta: {
			overflow:true,
			needAuth:false,
		}
	},
	{
		path: '/chat/:login',
		name: 'chatLight',
		component: ChatLight,
		meta: {
			needAuth:false,
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
		meta: {
			needAuth:false,
		}
	},
	{
		path: '/publicapi',
		name: 'publicapi',
		component: PublicApiTest,
		meta: {
			overflow:true,
		}
	},
	{
		path: '/voice',
		name: 'voice',
		component: RemoteVoiceControl,
		meta: {
			overflow:true,
			needAuth:false,
		}
	},
	{
		path: '/spotify/auth',
		name: 'spotify/auth',
		redirect:() => {
			const sMain = StoreProxy.main;
			const sMusic = StoreProxy.music;
			if(!Utils.getQueryParameterByName("error")) {
				sMain.showParams = true;//Open params
				sMain.tempStoreValue = "CONTENT:"+TwitchatDataTypes.ParamsCategories.CONNEXIONS;//Set default param tab to open
	
				const params:SpotifyAuthResult = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sMusic.setSpotifyAuthResult(params);
			}else{
				sMain.alertData = StoreProxy.i18n.t("music.spotify_refused");
			}
			return {name:"chat", query:{}};
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
	history: createWebHistory(),
	routes
})

export default router