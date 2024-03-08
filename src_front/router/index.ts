import StoreProxy from '@/store/StoreProxy'
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes'
import Utils from '@/utils/Utils'
import type { SpotifyAuthResult } from '@/types/spotify/SpotifyDataTypes'
import Chat from '@/views/Chat.vue'
import Home from '@/views/Home.vue'
import Logout from '@/views/Logout.vue'
import Sponsor from '@/views/Sponsor.vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

const Overlay = () => import('@/views/Overlay.vue');
const TermsOfUse = () => import('@/views/TermsOfUse.vue');
const GoXLRDebug = () => import('@/views/GoXLRDebug.vue');
const LabelsEditor = () => import('@/views/LabelsEditor.vue');
const PrivacyPolicy = () => import('@/views/PrivacyPolicy.vue');
const PublicApiTest = () => import('@/views/PublicApiTest.vue');
const ComponentList = () => import('@/views/ComponentList.vue');
const HeatDebugPopout = () => import('@/views/HeatDebugPopout.vue');
const RemoteVoiceControl = () => import('@/views/RemoteVoiceControl.vue');


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
		path: '/heatDebug',
		name: 'heatDebug',
		component: HeatDebugPopout,
		meta: {
			overflow:true,
			needAuth:false,
		}
	},
	{
		path: '/labels',
		name: 'labels',
		component: LabelsEditor,
		meta: {
			needAdmin:true,
			overflow:true,
			needAuth:true,
		},
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
		path: '/patreon/auth',
		name: 'patreon/auth',
		redirect:() => {
			const sMain = StoreProxy.main;
			const sParams = StoreProxy.params;
			const sPatreon = StoreProxy.patreon;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
				sPatreon.setPatreonAuthResult(params);
			}else{
				sMain.alert( StoreProxy.i18n.t("error.patreon_denied") );
			}
			return {name:"chat", query:{}};
		},
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/youtube/auth',
		name: 'youtube/auth',
		redirect:() => {
			const sMain = StoreProxy.main;
			const sParams = StoreProxy.params;
			const sYoutube = StoreProxy.youtube;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sYoutube.setYoutubeAuthResult(params);
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.YOUTUBE);
			}else{
				sMain.alert( StoreProxy.i18n.t("error.youtube_denied") );
			}
			return {name:"chat", query:{}};
		},
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/streamlabs/auth',
		name: 'streamlabs/auth',
		redirect:() => {
			const sMain = StoreProxy.main;
			const sParams = StoreProxy.params;
			const sStreamlabs = StoreProxy.streamlabs;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sStreamlabs.setAuthResult(params.code, params.csrf);
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.STREAMLABS);
			}else{
				sMain.alert( StoreProxy.i18n.t("error.streamlabs_denied") );
			}
			return {name:"chat", query:{}};
		},
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/streamelements/auth',
		name: 'streamelements/auth',
		redirect:() => {
			const sMain = StoreProxy.main;
			const sParams = StoreProxy.params;
			const sStreamelements = StoreProxy.streamelements;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sStreamelements.setAuthResult(params.code, params.csrf);
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNEXIONS, TwitchatDataTypes.ParamDeepSections.STREAMELEMENTS);
			}else{
				sMain.alert( StoreProxy.i18n.t("error.streamelements_denied") );
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
		path: '/goxlr',
		name: 'goxlr',
		component: GoXLRDebug,
		meta: {
			needAuth:false,
			public:true,
		}
	},
	{
		path: '/privacypolicy',
		name: 'privacypolicy',
		component: PrivacyPolicy,
		meta: {
			needAuth:false,
			public:true,
			overflow:true,
		}
	},
	{
		path: '/termsofuse',
		name: 'termsofuse',
		component: TermsOfUse,
		meta: {
			needAuth:false,
			public:true,
			overflow:true,
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