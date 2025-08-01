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
import { storeCommon } from './store/common/storeCommon';
import { SlowMo } from "gsap/all";

gsap.registerPlugin(ScrollToPlugin, CustomEase, CSSPlugin, SlowMo);
const pinia = createPinia();

/**
 * Include an image from the asset folder
 */
const asset = (path:string):string => {
	const map = import.meta.glob('/src_front/assets/**/*', { eager: true, import: 'default' });
	return map[`/src_front/assets/${path}`] as string;
}

const app = createApp(AppOverlay);
app.use(pinia)
.use(router)
.provide("$asset", asset);

StoreProxy.default.common = storeCommon();
app.config.globalProperties.$asset = asset;
app.config.globalProperties.$store = StoreProxy.default;

StoreProxy.default.common.initialize(false).then(()=>{
	app.mount('#app');
});
