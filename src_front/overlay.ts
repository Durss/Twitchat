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

gsap.registerPlugin(ScrollToPlugin, CustomEase, CSSPlugin);
const pinia = createPinia();

/**
 * Include an image from the asset folder
 */
const image = (path:string):string => {
	return new URL(`/src_front/assets/${path}`, import.meta.url).href;
}

const app = createApp(AppOverlay);
app.use(pinia)
.use(router)
.provide("$image", image);

StoreProxy.default.common = storeCommon();
app.config.globalProperties.$image = image;
app.config.globalProperties.$store = StoreProxy.default;

StoreProxy.default.common.initialize(false).then(()=>{
	app.mount('#app');
});