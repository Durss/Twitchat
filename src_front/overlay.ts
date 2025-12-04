import AppOverlay from "@/AppOverlay.vue";
import '@/less/index.less';
import router from '@/router/overlay';
import * as StoreProxy from '@/store/StoreProxy';
import CSSPlugin from "gsap/CSSPlugin";
import CustomEase from "gsap/CustomEase";
import ScrollToPlugin from "gsap/ScrollToPlugin";
import { gsap } from 'gsap/gsap-core';
import { createPinia } from 'pinia';
import { createApp } from "vue";
import { createI18n } from 'vue-i18n';
import Config from '@/utils/Config';
import { storeCommon } from './store/common/storeCommon';
import { SlowMo } from "gsap/all";

gsap.registerPlugin(ScrollToPlugin, CustomEase, CSSPlugin, SlowMo);
const pinia = createPinia();

let lang: string = navigator.language || (navigator as any)['userLanguage'];
lang = lang.substring(0, 2).toLowerCase();
const i18n = createI18n({
    locale: lang,
    fallbackLocale: 'en',
    warnHtmlInMessage: 'off',
    silentFallbackWarn: !Config.instance.IS_PROD,
    silentTranslationWarn: !Config.instance.IS_PROD,
});

/**
 * Include an image from the asset folder
 */
const asset = (path:string):string => {
	const map = import.meta.glob('/src_front/assets/**/*', { eager: true, import: 'default' });
	return map[`/src_front/assets/${path}`] as string;
}

async function buildApp() {
    const app = createApp(AppOverlay);
    app.use(pinia)
        .use(router)
        .use(i18n)
        .provide("$asset", asset);

    StoreProxy.default.i18n = i18n.global;
    StoreProxy.default.common = storeCommon();
    app.config.globalProperties.$asset = asset;
    app.config.globalProperties.$store = StoreProxy.default;

    await StoreProxy.default.common.initialize(false);
    app.mount('#app');
}

(async()=>{
    try {
        const res = await fetch('/labels.json?v='+import.meta.env.PACKAGE_VERSION);
        const labelsJSON = await res.json();
        for (const lang in labelsJSON) {
            i18n.global.setLocaleMessage(lang, labelsJSON[lang]);
        }
    }catch(e){
        console.log(e);
    }
    buildApp();
})();
