import { createOverlayConnector, type OverlayConnector } from "@/composables/useOverlayConnector";
import { ComponentBase, Vue } from "vue-facing-decorator";

@ComponentBase({
	name: "AbstractOverlay",
})
export default class AbstractOverlay extends Vue {
	private connector!: OverlayConnector;

	public mounted(): void {
		this.connector = createOverlayConnector(() => this.requestInfo());
		this.connector.start();
	}

	public beforeUnmount(): void {
		this.connector.stop();
	}

	/**
	 * Called on loading or when OBS-websocket connection is established
	 * Override this and request for any info (current music, a counter's data, ...)
	 */
	public requestInfo(): void {}
}
