import StoreProxy from '@/store/StoreProxy'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import Utils from '@/utils/Utils'
import type { SpotifyAuthResult } from '@/utils/music/SpotifyDataTypes'
import Chat from '@/views/Chat.vue'
import ComponentList from '@/views/ComponentList.vue'
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Logout from '@/views/Logout.vue'
import Overlay from '@/views/Overlay.vue'
import PublicApiTest from '@/views/PublicApiTest.vue'
import RemoteVoiceControl from '@/views/RemoteVoiceControl.vue'
import Sponsor from '@/views/Sponsor.vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'


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
		path: '/components',
		name: 'components',
		component: ComponentList,
		meta: {
			overflow:true,
			needAuth:false,
		}
	},
	{
		path: '/login',
		name: 'login',
		component: Home,
		meta: {
			overflow:true,
			needAuth:false,
		}
	},
	{
		path: '/logout',
		name: 'logout',
		component: Logout
	},
	{
		path: '/oauth',
		name: 'oauth',
		component: Home,
		meta: {
			overflow:true,
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
			const sParams = StoreProxy.params;
			const sMusic = StoreProxy.music;
			if(!Utils.getQueryParameterByName("error")) {
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.SPOTIFY);
				const params:SpotifyAuthResult = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sMusic.setSpotifyAuthResult(params);
			}else{
				sMain.alert( StoreProxy.i18n.t("music.spotify_refused") );
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