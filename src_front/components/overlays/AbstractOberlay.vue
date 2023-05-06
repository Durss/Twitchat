<script lang="ts">
import TwitchatEvent from '@/events/TwitchatEvent';
import OBSWebsocket from '@/utils/OBSWebsocket';
import { ComponentBase, Vue } from 'vue-facing-decorator';

@ComponentBase({
    name: "AbstractOberlay"
})
export default class AbstractOberlay extends Vue {

	private obsWebsocketConnectedHandler!:() => void;

	public mounted():void {
		this.requestInfo();
		if(!OBSWebsocket.instance.connected) {
			this.obsWebsocketConnectedHandler = () => this.requestInfo();
			OBSWebsocket.instance.addEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, this.obsWebsocketConnectedHandler);
		}
	}

	public beforeUnmount():void {
		OBSWebsocket.instance.removeEventListener(TwitchatEvent.OBS_WEBSOCKET_CONNECTED, this.obsWebsocketConnectedHandler);
	}

	/**
	 * Called on loading or when OBS-websocket connection is established
	 * Override this and request for any info (current music, a counter's data, ...)
	 */
	public requestInfo():void {}
}
</script>