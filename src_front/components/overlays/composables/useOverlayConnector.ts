import PublicAPI from "@/utils/PublicAPI";
import { onBeforeUnmount, onMounted } from "vue";

export function useOverlayConnector(onConnect:()=>void) {

	let initDone = false;

	const publicAPIConnectedHandler = () => {
		if(!initDone) onConnect();
		initDone = true;//Avoids potential double init. Once when BroadcastChannel is ready and once when OBS-websocket is ready
	}

	onMounted(()=> {
		onConnect();
		PublicAPI.instance.addEventListener("ON_OBS_WEBSOCKET_CONNECTED", publicAPIConnectedHandler);
		PublicAPI.instance.addEventListener("ON_TWITCHAT_READY", publicAPIConnectedHandler);
	});

	onBeforeUnmount(()=> {
		PublicAPI.instance.removeEventListener("ON_OBS_WEBSOCKET_CONNECTED", publicAPIConnectedHandler);
		PublicAPI.instance.removeEventListener("ON_TWITCHAT_READY", publicAPIConnectedHandler);
	});

}