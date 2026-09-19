import AppOverlay from "@/AppOverlay.vue";
import "@/less/index.less";
import router from "@/router/overlay";
import * as StoreProxy from "@/store/StoreProxy";
import * as Sentry from "@sentry/vue";
import CSSPlugin from "gsap/CSSPlugin";
import CustomEase from "gsap/CustomEase";
import ScrollToPlugin from "gsap/ScrollToPlugin";
import { gsap } from "gsap/gsap-core";
import { createPinia } from "pinia";
import { createApp } from "vue";
import { storeCommon } from "./store/common/storeCommon";
import { SlowMo } from "gsap/all";
import Config from "./utils/Config";
import Utils from "./utils/Utils";

gsap.registerPlugin(ScrollToPlugin, CustomEase, CSSPlugin, SlowMo);
const pinia = createPinia();
pinia.use(Sentry.createSentryPiniaPlugin({ attachPiniaState: false }));

const app = createApp(AppOverlay);
app.use(pinia).use(router);

const overlayType =
	document.location.pathname.split("/").filter((chunk) => chunk.length > 0)[1] || "unknown";

if (Config.instance.IS_PROD) {
	Sentry.init({
		app,
		debug: false,
		release: "twitchat@" + import.meta.env.PACKAGE_VERSION,
		dsn: Config.instance.SENTRY_DSN,
		environment: Config.instance.SENTRY_ENVIRONMENT,
		initialScope: {
			tags: {
				app: "overlay",
				overlay: overlayType,
				obs_browser_source: window.obsstudio != undefined,
			},
		},
		ignoreErrors: [
			"[-]", //Custom tag to ignore errors coming from specific parts of the app
			"OBS is not ready", //If trying to connect to OBS when OBS-ws is booting
			"Connection error", //websocket connection attempts
		],
	});
}

StoreProxy.default.common = storeCommon();
// oxlint-disable-next-line typescript/unbound-method
StoreProxy.default.asset = Utils.asset;
// oxlint-disable-next-line typescript/unbound-method
app.config.globalProperties.$asset = Utils.asset;
app.config.globalProperties.$store = StoreProxy.default;

void StoreProxy.default.common
	.initialize(false)
	.catch((error: unknown) => {
		Sentry.captureException(error);
	})
	.then(() => {
		app.mount("#app");
	});
