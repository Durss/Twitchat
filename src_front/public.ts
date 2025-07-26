import AppPublic from "@/AppPublic.vue";
import '@/less/index.less';
import router from '@/router/public';
import * as StoreProxy from '@/store/StoreProxy';
import Config from "@/utils/Config";
import CSSPlugin from "gsap/CSSPlugin";
import CustomEase from "gsap/CustomEase";
import ScrollToPlugin from "gsap/ScrollToPlugin";
import { gsap } from 'gsap/gsap-core';
import { createPinia } from 'pinia';
import 'tippy.js/animations/scale.css';
import 'tippy.js/dist/tippy.css';
import { createApp } from "vue";
import { createI18n } from 'vue-i18n';
import type { NavigationGuardNext, RouteLocation } from "vue-router";
import VueTippy, { setDefaultProps } from "vue-tippy";
import { storeCommon } from './store/common/storeCommon';
import { storePublic } from "./store/storePublic";

setDefaultProps({
	theme:"twitchat",
	animation:"scale",
	duration:100,
	allowHTML:true,
	maxWidth:250,
});


gsap.registerPlugin(ScrollToPlugin, CustomEase, CSSPlugin);
const pinia = createPinia();

let lang: string = navigator.language || (<any>navigator)['userLanguage'];
lang = lang.substring(0, 2).toLowerCase();
const i18n = createI18n({
	locale:lang,
	fallbackLocale: 'en',
	legacy: true,
	globalInjection: true,
	warnHtmlInMessage: false,
	warnHtmlMessage: false,
	silentFallbackWarn:!Config.instance.IS_PROD,
	silentTranslationWarn:!Config.instance.IS_PROD,
	// modifiers:{
	// 	strong:(str)=> "<strong>"+str+"</strong>",
	// }
});



//Load labels before everything else so they are available when
//initializing stores data
(async()=> {
	try {
		window.setInitMessage("loading labels");
		const labelsRes = await fetch("/labels.json");
		const labelsJSON = await labelsRes.json();
		for (const lang in labelsJSON) {
			i18n.global.setLocaleMessage(lang, labelsJSON[lang]);
		}
	}catch(error) {
		console.log(error);
		window.setTimeout(() => {
			StoreProxy.default.common.alert( "An error occured when loading labels :(" );
		}, 1000);
	}
	buildApp();
})();

function buildApp() {
	/**
	 * Add route guards for login
	 */
	router.beforeEach(async (to: RouteLocation, from: RouteLocation, next: NavigationGuardNext) => {
		const sPublic = StoreProxy.default.public;
		const needAdmin = to.meta.needAdmin === true;

		if (!sPublic.initComplete) {
			try {
				await sPublic.startApp();
			}catch(error) {
				console.log(error);
			}
		}

		next();
	});

	/**
	 * Include an image from the asset folder
	 */
	const asset = (path:string):string => {
		return new URL(`/src_front/assets/${path}`, import.meta.url).href;
	}

	window.setInitMessage("Building interface");
	const app = createApp(AppPublic);
	app.use(pinia)
	.use(router)
	.use(i18n)
	.use(VueTippy,{
		directive: "tooltip",
		component: "tooltip",
	})
	.provide("$asset", asset)
	.provide("$store", StoreProxy.default);

	StoreProxy.default.i18n = i18n.global;
	//Dirty typing. Couldn't figure out how to properly type pinia getters
	StoreProxy.default.public = storePublic();
	StoreProxy.default.common = storeCommon();
	app.config.globalProperties.$asset = asset;
	app.config.globalProperties.$store = StoreProxy.default;
	app.config.globalProperties.$config = Config.instance;

	StoreProxy.default.common.initialize(false).then(()=>{
		app.mount('#app');
	});


	document.addEventListener("keyup", (e:KeyboardEvent)=> {
		//Given a Sentry error, a user apparently succeeded to have an
		//"undefined" e.key value on an up to date Edge browser
		if(!e.key) return;
		const metaKey = e.metaKey || e.ctrlKey;

		//Toggle light/dark mode on CTRL+Shift+K
		if(e.key.toLowerCase() == "k" && metaKey && e.altKey) {
			const list = document.body.classList;
			if(list.contains("dark")) {
				list.remove("dark");
				list.add("light");
			}else{
				list.remove("light");
				list.add("dark");
			}
		}

		//Reload labels on CTRL+Shift+L
		if(e.key.toLowerCase() == "l" && metaKey && e.altKey) {
			StoreProxy.default.public.reloadLabels();
			e.preventDefault();
		}

		//Walk through available locales on CTRL+Shift+M
		if(e.key.toLowerCase() == "m" && metaKey && e.altKey) {
			const locales = i18n.global.availableLocales;
			i18n.global.locale = locales[(locales.indexOf(i18n.global.locale) + 1)%locales.length];
			e.preventDefault();
		}
	}, true);
}
