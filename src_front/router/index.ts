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
			needAuth:false,
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
		path: '/twitchbot/oauth',
		name: 'twitchbot/auth',
		redirect:() => {
			if(window.opener) {
				window.opener.postMessage({
					type: 'TWITCHBOT_AUTH_RESULT',
					data: {
						code: Utils.getQueryParameterByName("code"),
						csrf: Utils.getQueryParameterByName("state")
					}
				}, document.location.origin);
				window.close();
				return {name:"chat", query:{}};
			}
			const sParams = StoreProxy.params;
			const params = {
				code:Utils.getQueryParameterByName("code") as string,
				csrf:Utils.getQueryParameterByName("state") as string,
			}
			if(params.code && !Utils.getQueryParameterByName("error")) {
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.TWITCHBOT);
				StoreProxy.twitchBot.completeOAuthProcess(params.code, params.csrf);
			}else{
				StoreProxy.common.alert( StoreProxy.i18n.t("twitch_bot.auth_refused") );
			}
			return {name:"chat", query:{}};
		},
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/spotify/auth',
		name: 'spotify/auth',
		redirect:() => {
			const sParams = StoreProxy.params;
			const sMusic = StoreProxy.music;
			if(!Utils.getQueryParameterByName("error")) {
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.SPOTIFY);
				const params:SpotifyAuthResult = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sMusic.setSpotifyAuthResult(params);
			}else{
				StoreProxy.common.alert( StoreProxy.i18n.t("music.spotify_refused") );
			}
			return {name:"chat", query:{}};
		},
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/patreon/auth',
		alias: '/patreon/auth/premium',
		name: 'patreon/auth',
		redirect:(to) => {
			const sParams = StoreProxy.params;
			const sPatreon = StoreProxy.patreon;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}

				sPatreon.setPatreonAuthResult(params);

				if(to.fullPath.indexOf("/premium") > -1) {
					sParams.openParamsPage(TwitchatDataTypes.ParameterPages.PREMIUM);
				}else{
					sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.PATREON);
				}
			}else{
				StoreProxy.common.alert( StoreProxy.i18n.t("error.patreon_denied") );
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
			const sParams = StoreProxy.params;
			const sYoutube = StoreProxy.youtube;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sYoutube.setYoutubeAuthResult(params);
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.YOUTUBE);
			}else{
				StoreProxy.common.alert( StoreProxy.i18n.t("error.youtube_denied") );
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
			const sParams = StoreProxy.params;
			const sStreamlabs = StoreProxy.streamlabs;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sStreamlabs.setAuthResult(params.code, params.csrf);
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.STREAMLABS);
			}else{
				StoreProxy.common.alert( StoreProxy.i18n.t("error.streamlabs_denied") );
			}
			return {name:"chat", query:{}};
		},
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/tipeee/auth',
		name: 'tipeee/auth',
		redirect:() => {
			const sParams = StoreProxy.params;
			const sTipeee = StoreProxy.tipeee;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sTipeee.setAuthResult(params.code, params.csrf);
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.TIPEEE);
			}else{
				StoreProxy.common.alert( StoreProxy.i18n.t("error.tipeee_denied") );
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
			const sParams = StoreProxy.params;
			const sStreamelements = StoreProxy.streamelements;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				};
				const csrf = Utils.getQueryParameterByName("csrf") as string;
				if(csrf) params.csrf = csrf;
				//Following redirects are here because streamelements has a TEEERRRIIIIBLLLEEEE app creation process
				//We must request credentials by some sort of mail (lol), and we can only provide
				//1 redirect URI. They refuse to add more than one (W.T.actual.F?!?!).
				//They also refuse to grant multiple credentials so we can at least have a way to
				//to redirect to the proper URL.
				//In other words, the only possible redirect URI is twitchat.fr/streamelements/auth.
				//This means that when authenticated from local or beta envs, we get redirected to
				//production anyway. Following lines check if the "state" params has a en prefix and
				//redirect to the corresponding URL.
				//But this means that if user refuses to grant access to their SE profile during
				//auth process, they'll be redirected to prod without "state" params wich means we
				//have no way to redirect them the proper env.
				//Thanks Streamelements! Very good work! (even more considering API is also pretty F** up...)
				if(/beta-/gi.test(params.csrf)) {
					params.csrf = params.csrf.replace(/^.*?-/, "");
					document.location.href = "https://beta.twitchat.fr/streamelements/auth?" + new URLSearchParams(params);
				}else
				if(/local-/gi.test(params.csrf)) {
					params.csrf = params.csrf.replace(/^.*?-/, "");
					document.location.href = "http://localhost:8081/streamelements/auth?" + new URLSearchParams(params);
				}else{
					sStreamelements.setAuthResult(params.code, params.csrf);
					sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.STREAMELEMENTS);
				}
			}else{
				StoreProxy.common.alert( StoreProxy.i18n.t("error.streamelements_denied") );
			}
			return {name:"chat", query:{}};
		},
		meta: {
			needAuth:true,
		}
	},
	{
		path: '/tiltify/auth',
		name: 'tiltify/auth',
		redirect:() => {
			const sParams = StoreProxy.params;
			const sTiltify = StoreProxy.tiltify;
			if(Utils.getQueryParameterByName("code")) {
				const params = {
					code:Utils.getQueryParameterByName("code") as string,
					csrf:Utils.getQueryParameterByName("state") as string,
				}
				sTiltify.setAuthResult(params.code, params.csrf);
				sParams.openParamsPage(TwitchatDataTypes.ParameterPages.CONNECTIONS, TwitchatDataTypes.ParamDeepSections.TILTIFY);
			}else{
				StoreProxy.common.alert( StoreProxy.i18n.t("error.tiltify_denied") );
			}
			return {name:"chat", query:{}};
		},
		meta: {
			needAuth:true,
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
		//This route is not actually used.
		//It's only here for route generation, but the actual /overlay
		//route targets the overlay.html page
		path: '/overlay/:id(.*)',
		name: 'overlay',
		redirect:()=>{
			return {name:"chat"}
		},
		meta: {
			needAuth:false,
			public:true,
			noBG:true,
			overflow:false,
		}
	},
	{
		//This route is not actually used.
		//It's only here for route generation, but the actual /overlay
		//route targets the public.html page
		path: '/public/bingo/:uid(.*)/:gridId(.*)',
		name: 'bingo_grid_public',
		redirect:()=>{
			return {name:"chat"}
		},
		meta: {
			needAdmin:false,
			overflow:true,
			needAuth:false,
		},
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
