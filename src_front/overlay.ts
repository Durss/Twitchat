import AppOverlay from "@/AppOverlay.vue";
import "@/less/index.less";
import router from "@/router/overlay";
import * as StoreProxy from "@/store/StoreProxy";
import CSSPlugin from "gsap/CSSPlugin";
import CustomEase from "gsap/CustomEase";
import ScrollToPlugin from "gsap/ScrollToPlugin";
import { gsap } from "gsap/gsap-core";
import { createPinia } from "pinia";
import { createApp } from "vue";
import { storeCommon } from "./store/common/storeCommon";
import { SlowMo } from "gsap/all";
import Utils from "./utils/Utils";

gsap.registerPlugin(ScrollToPlugin, CustomEase, CSSPlugin, SlowMo);
const pinia = createPinia();

const app = createApp(AppOverlay);
app.use(pinia).use(router);

StoreProxy.default.common = storeCommon();
// oxlint-disable-next-line typescript/unbound-method
StoreProxy.default.asset = Utils.asset;
// oxlint-disable-next-line typescript/unbound-method
app.config.globalProperties.$asset = Utils.asset;
app.config.globalProperties.$store = StoreProxy.default;

void StoreProxy.default.common.initialize(false).then(() => {
	app.mount("#app");
});
