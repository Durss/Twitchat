import { EventDispatcher } from "@/events/EventDispatcher";
import SSEEvent, { type EventTypeMap } from "@/events/SSEEvent";
import ApiHelper from "./ApiHelper";
import Config from "./Config";

/**
 * Created : 29/02/2024
 */
export default class SSEHelper extends EventDispatcher {
	private static _instance: SSEHelper;
	private _sse: EventSource | null = null;
	private _failCount = 0;
	private _expectedPingInterval = 110 * 1000;
	private _pingFailTimeout: number = -1;
	private _reconnectTimeout: number = -1;
	private _reconnectDelay = 0;
	private _connectedAt = 0;
	private _isMainApp = false;
	private _initialized = false;
	private _connecting = false;
	private _stopped = false;

	constructor() {
		super();
		window.addEventListener("beforeunload", () => this.disconnect());
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/
	static get instance(): SSEHelper {
		if (!SSEHelper._instance) {
			SSEHelper._instance = new SSEHelper();
		}
		return SSEHelper._instance;
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public initialize(isMainApp: boolean): void {
		if (this._initialized) return;
		this._initialized = true;
		this._isMainApp = isMainApp;
		void this.connect();
	}

	override addEventListener<T extends keyof EventTypeMap>(
		event: T,
		listenerFunc: (e: SSEEvent<T>) => void,
	): void {
		super.addEventListener(event, listenerFunc);
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Open SSE pipe
	 */
	private async connect(): Promise<void> {
		if (this._stopped) return;
		if (this._connecting) return;
		this._connecting = true;

		this.cleanup();

		console.log("[SSE] Connecting...");

		// Get a short live auth token used to authenticate to SSE without
		// sending Twitch access_token as query parameter.
		// This would leak the token to proxy logs, referrer headers or CDN logs
		// which isn't ideal.
		// Ideally we would just send the twitch token in headers but that's
		// not possible with SSE.
		let sseToken = "";
		try {
			const res = await ApiHelper.call("sse/auth", "POST", undefined, false);
			if (res.status === 200 && res.json.success) sseToken = res.json.token || "";
		} catch (_error) {
			//handled right below
		}

		this._connecting = false;
		//Disconnected while awaiting the token
		if (this._stopped) return;

		if (!sseToken) {
			console.log("[SSE] ❌ Failed to mint SSE token");
			this.scheduleReconnect();
			return;
		}

		const source = new EventSource(
			Config.instance.API_PATH +
				"/sse/register?token=" +
				encodeURIComponent(sseToken) +
				(this._isMainApp ? "&mainApp=true" : ""),
		);
		this._sse = source;

		source.onmessage = (event) => {
			if (this._sse !== source) return;
			this.onMessage(event);
		};
		source.onopen = (_event) => {
			if (this._sse !== source) return;
			this._connectedAt = Date.now();
			console.log("[SSE] ✅ Connected");
			//randomize event so not everyone potentially spams server after rebooting it
			window.setTimeout(() => {
				if (this._sse !== source) return;
				this.dispatchEvent(new SSEEvent(SSEEvent.ON_CONNECT));
			}, Math.random() * 5000);
		};
		source.onerror = (_event) => {
			if (this._sse !== source) return;
			console.log("[SSE] ❌ Connection closed...");
			this.cleanup();
			this.scheduleReconnect();
		};
	}

	/**
	 * Disconnects current connection
	 */
	private disconnect(): void {
		this._stopped = true;
		this._connecting = false;
		this.cleanup();
	}

	/**
	 * Release current connection and reconnect attempts
	 */
	private cleanup(): void {
		clearTimeout(this._pingFailTimeout);
		clearTimeout(this._reconnectTimeout);
		if (this._sse) {
			this._sse.onmessage = null;
			this._sse.onopen = null;
			this._sse.onerror = null;
			this._sse.close();
			this._sse = null;
		}
	}

	/**
	 * Schedules a reconnect attempt
	 */
	private scheduleReconnect(): void {
		if (this._stopped) return;

		// reset failed count if socket has been up for at least 30s
		const uptime = this._connectedAt > 0 ? Date.now() - this._connectedAt : 0;
		if (uptime > 30_1000) this._failCount = 0;
		this._connectedAt = 0;

		if (++this._failCount === 5) {
			this.dispatchEvent(new SSEEvent(SSEEvent.FAILED_CONNECT));
		}

		let delay: number;
		// If server asked to reconnect after a specific delay, honor it
		if (this._reconnectDelay > 0) {
			delay = this._reconnectDelay;
			this._reconnectDelay = 0;
		} else {
			// reconnect with a longer and longer delay
			const backoff = Math.min(2000 * Math.pow(2, this._failCount - 1), 60_1000);
			// andd/remove 50% of the delay to randomize clients reconnects
			delay = backoff * 0.5 + Math.random() * backoff * 0.5;
		}

		console.log("[SSE] ⌛ Reconnect in " + Math.round(delay) + "ms");
		clearTimeout(this._reconnectTimeout);
		this._reconnectTimeout = window.setTimeout(() => void this.connect(), delay);
	}

	/**
	 * Called when receiving a message
	 */
	private onMessage(event: MessageEvent<string>): void {
		try {
			let json = JSON.parse(event.data) as { code: keyof EventTypeMap; data: any };

			clearTimeout(this._pingFailTimeout);
			this._pingFailTimeout = window.setTimeout(() => {
				console.log("[SSE] ❌ No ping received...");
				this.cleanup();
				this.scheduleReconnect();
			}, this._expectedPingInterval);

			if (json.code == "AUTHENTICATION_FAILED") {
				console.log("[SSE] ❌ Authentication failed");
				this.cleanup();
				this.scheduleReconnect();
				return;
			}

			if (json.code == "SERVER_UPDATE") {
				this._reconnectDelay = json.data.delay;
				console.log(
					"Server update received, reconnecting in " + this._reconnectDelay + "ms",
				);
				return;
			}
			this.dispatchEvent(new SSEEvent(json.code, json.data));
		} catch (_error) {
			//ignore
		}
	}
}

