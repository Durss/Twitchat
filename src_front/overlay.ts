import AppOverlay from "@/AppOverlay.vue";
import '@/less/index.less';
import router from '@/router/overlay';
import * as StoreProxy from '@/store/StoreProxy';
import Config from "@/utils/Config";
import gsap from 'gsap';
import { CustomEase, ScrollToPlugin } from 'gsap/all';
import { createPinia } from 'pinia';
import { createApp } from "vue";
import { createI18n } from 'vue-i18n';
import { storeCommon } from './store/common/storeCommon';

const pinia = createPinia();
let lang: string = navigator.language || (<any>navigator)['userLanguage'];
lang = lang.substring(0, 2).toLowerCase();
const i18n = createI18n({
	locale:lang,
	fallbackLocale: 'en',
	warnHtmlInMessage:'off',
	silentFallbackWarn:!Config.instance.IS_PROD,
	silentTranslationWarn:!Config.instance.IS_PROD,
});

/**
 * Include an image from the asset folder
 */
const image = (path:string):string => {
	return new URL(`/src_front/assets/${path}`, import.meta.url).href;
}

const app = createApp(AppOverlay);
app.use(pinia)
.use(router)
.use(i18n)
.provide("$image", image)
.mount('#app');

console.log("OKOKKOOKOKOK")

gsap.registerPlugin(ScrollToPlugin, CustomEase);
StoreProxy.default.common = storeCommon();
app.config.globalProperties.$image = image;
app.config.globalProperties.$store = StoreProxy.default;

StoreProxy.default.common.initialize(false);
