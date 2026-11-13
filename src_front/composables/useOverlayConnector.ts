import OBSWebsocket from "@/utils/OBSWebsocket";
import PublicAPI from "@/utils/PublicAPI";
import { onBeforeUnmount, onMounted } from "vue";

export interface OverlayConnector {
	start(): void;
	stop(): void;
}

/**
 * Makes sure an overlay requests for its config when twitchat is reachable
 * @param connectCallback called when overlay needs to request its configs
 */
export function createOverlayConnector(connectCallback: () => void): OverlayConnector {
	let debounce = -1;
	const request = (): void => {
		clearTimeout(debounce);
		debounce = window.setTimeout(() => connectCallback(), 500);
	};

	return {
		start(): void {
			//Own OBS-websocket connection established
			OBSWebsocket.instance.addEventListener("ON_OBS_WEBSOCKET_CONNECTED", request);
			//Twitchat (re)connected
			PublicAPI.instance.addEventListener("ON_OBS_WEBSOCKET_CONNECTED", request);
			PublicAPI.instance.addEventListener("ON_TWITCHAT_READY", request);
			request();
		},

		stop(): void {
			clearTimeout(debounce);
			OBSWebsocket.instance.removeEventListener("ON_OBS_WEBSOCKET_CONNECTED", request);
			PublicAPI.instance.removeEventListener("ON_OBS_WEBSOCKET_CONNECTED", request);
			PublicAPI.instance.removeEventListener("ON_TWITCHAT_READY", request);
		},
	};
}

export function useOverlayConnector(onConnect: () => void): void {
	const connector = createOverlayConnector(onConnect);

	onMounted(() => connector.start());
	onBeforeUnmount(() => connector.stop());
}
