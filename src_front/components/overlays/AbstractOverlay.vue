<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { ComponentBase, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractOverlay"
})
export default class AbstractOverlay extends Vue {

	private initDone:boolean = false;
	private obsWebsocketConnectedHandler!:() => void;

	public mounted():void {
		this.requestInfo();
		this.obsWebsocketConnectedHandler = () => {
			if(!this.initDone) this.requestInfo();
			this.initDone = true;//Avoids poential double init. Once when BrodcastChannel is ready and once when OBS-websocket is ready
		}
		OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, this.obsWebsocketConnectedHandler);
		OBSWebsocket.instance.addEventListener(TwitchatEvent.TWITCHAT_READY, this.obsWebsocketConnectedHandler);
	}

	public beforeUnmount():void {
		OBSWebsocket.instance.removeEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, this.obsWebsocketConnectedHandler);
		OBSWebsocket.instance.removeEventListener(TwitchatEvent.TWITCHAT_READY, this.obsWebsocketConnectedHandler);
	}

	/**
	 * Called on loading or when OBS-websocket connection is established
	 * Override this and request for any info (current music, a counter's data, ...)
	 */
	public requestInfo():void {}
}
</script>