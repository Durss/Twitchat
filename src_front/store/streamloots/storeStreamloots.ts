import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import type {
	StreamlootsAlertPayload,
	StreamlootsCardRedeemedEvent,
	StreamlootsEmotePayload,
	StreamlootsEvent,
	StreamlootsRarity,
} from "@/types/StreamlootsTypes";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import type { IStreamlootsActions, IStreamlootsGetters, IStreamlootsState } from "../StoreProxy";

let closeAlertsStream: (() => void) | null = null;
let closeEmotesStream: (() => void) | null = null;

export const storeStreamloots = defineStore("streamloots", {
	state: (): IStreamlootsState => ({
		widgetId: "",
		connected: false,
		connecting: false,
		invalidID: false,
	}),

	getters: {} satisfies StoreGetters<IStreamlootsGetters, IStreamlootsState>,

	actions: {
		populateData(): void {
			const data = DataStore.get(DataStore.STREAMLOOTS_CONFIGS);
			if (data) {
				const json = JSON.parse(data) as StreamlootsStoreData;
				this.widgetId = json.widgetId;
				if (this.widgetId) {
					void this.connect(this.widgetId);
				}
			}
		},

		async connect(widgetUrlOrId: string): Promise<boolean> {
			closeStreams();
			this.connected = false;

			const widgetId = extractWidgetId(widgetUrlOrId);
			this.invalidID = !widgetId;
			if (!widgetId) return false;

			this.widgetId = widgetId;
			this.saveData();
			this.connecting = true;

			return new Promise<boolean>((resolve) => {
				const timeout = window.setTimeout(() => {
					//Don't alter state if another connection replaced this one
					if (closeAlertsStream === closeAlerts) this.connecting = false;
					resolve(false);
				}, 60000);

				const closeAlerts = openStream(
					`https://widgets.streamloots.com/alerts/${widgetId}/media-stream`,
					(json) => this.onEvent(parseAlert(json as StreamlootsAlertPayload)),
					(open) => {
						this.connected = open;
						if (!open) return;
						clearTimeout(timeout);
						this.connecting = false;
						resolve(true);
					},
				);
				closeAlertsStream = closeAlerts;

				//Emotes stream only sends headers on first emote, its open state is meaningless
				closeEmotesStream = openStream(
					`https://widgets.streamloots.com/emotes/${widgetId}/media-stream`,
					(json) => {
						const payload = json as StreamlootsEmotePayload;
						//Same check as Streamloots' overlay
						if (!Array.isArray(payload.chat)) return;
						this.onEvent({
							type: "emote",
							username: payload.username,
							emotes: payload.chat,
							raw: payload,
						});
					},
				);
			});
		},

		disconnect(): void {
			closeStreams();
			this.widgetId = "";
			this.connected = false;
			this.connecting = false;
			this.invalidID = false;
			this.saveData();
		},

		onEvent(event: StreamlootsEvent): void {
			console.log("[STREAMLOOTS] Event received", event);
		},

		saveData(): void {
			const data: StreamlootsStoreData = {
				widgetId: this.widgetId,
			};
			DataStore.set(DataStore.STREAMLOOTS_CONFIGS, data);
		},
	} satisfies StoreActions<
		"streamloots",
		IStreamlootsState,
		IStreamlootsGetters,
		IStreamlootsActions
	>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStreamloots, import.meta.hot));
}

/**
 * Extracts widget ID from an alerts overlay URL or returns the ID itself
 */
function extractWidgetId(widgetUrlOrId: string): string | null {
	const match = widgetUrlOrId
		.trim()
		.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
	return match ? match[0].toLowerCase() : null;
}

/**
 * Opens an SSE stream that reopens itself if the browser gives up on it.
 * EventSource natively retries on network failures (readyState CONNECTING)
 * but stays CLOSED after an invalid answer, which is the case handled here.
 * @returns function closing the stream for good
 */
function openStream(
	url: string,
	onMessage: (json: unknown) => void,
	onStateChange?: (open: boolean) => void,
): () => void {
	let source: EventSource | null = null;
	let retryTimeout = -1;
	let failCount = 0;
	let stopped = false;

	const open = () => {
		if (stopped) return;
		source = new EventSource(url);
		source.onopen = () => {
			failCount = 0;
			onStateChange?.(true);
		};
		source.onmessage = (event: MessageEvent<string>) => {
			let json: unknown;
			try {
				json = JSON.parse(event.data);
			} catch (_error) {
				return;
			}
			onMessage(json);
		};
		source.onerror = () => {
			onStateChange?.(false);
			if (source?.readyState !== EventSource.CLOSED) return;
			const delay = Math.min(2000 * Math.pow(2, failCount++), 60000);
			retryTimeout = window.setTimeout(open, delay);
		};
	};
	open();

	return () => {
		stopped = true;
		clearTimeout(retryTimeout);
		if (source) {
			source.onopen = null;
			source.onmessage = null;
			source.onerror = null;
			source.close();
			source = null;
		}
	};
}

function closeStreams(): void {
	closeAlertsStream?.();
	closeEmotesStream?.();
	closeAlertsStream = null;
	closeEmotesStream = null;
}

function getField(
	data: NonNullable<StreamlootsAlertPayload["data"]>,
	name: string,
): string | undefined {
	const value = data.fields?.find((field) => field.name === name)?.value;
	return value == undefined ? undefined : String(value);
}

/**
 * Decodes HTML entities (Streamloots sends alert texts HTML-encoded)
 */
function decodeHTML(html: string): string {
	return new DOMParser().parseFromString(html, "text/html").documentElement.textContent || "";
}

/**
 * Categorizes a raw alert.
 * See "data.type" doc in StreamlootsTypes for the special cases
 */
function parseAlert(payload: StreamlootsAlertPayload): StreamlootsEvent {
	const data = payload.data;
	if (!data) return { type: "unknown", raw: payload };

	const username = getField(data, "username") || "";

	//Reactions have no "type"
	if (data.reaction) {
		return {
			type: "reaction",
			username,
			reactionId: data.reaction._id,
			reactionName: data.reaction.name,
			raw: payload,
		};
	}

	//Streamloots' overlay expects this type but dashboard's test button sends it
	//as a redemption, only its video identifies it
	const mediaUrl = payload.videoUrl || payload.imageUrl || "";
	if (
		data.type === "legendary-card-obtained" ||
		mediaUrl.endsWith("/legendary-card-obtained.webm")
	) {
		return {
			type: "legendary_obtained",
			username,
			alertMessage: decodeHTML(payload.message || ""),
			raw: payload,
		};
	}

	switch (data.type) {
		case "redemption": {
			//"Automatic promotion" alerts are sent as redemptions
			const pageLink = getField(data, "publicPageLink");
			if (pageLink) return { type: "promotion", pageLink, raw: payload };
			if (!data.cardName) break;

			let trolled = false;
			let alertModifier: StreamlootsCardRedeemedEvent["alertModifier"];
			const inputs: StreamlootsCardRedeemedEvent["inputs"] = [];
			for (const field of data.redeemFields || []) {
				if (field.type === "TROLL") trolled = field.value === true;
				else if (field.type === "INPUT#TEXT" || field.type === "TEXTAREA") {
					inputs.push({
						name: field.name,
						label: field.label,
						value: field.value || "",
						multiline: field.type === "TEXTAREA",
					});
				} else if (field.type === "ALERT_MODIFIER") {
					alertModifier = {
						type: field.modifierType,
						//Same default as Streamloots' overlay
						durationSeconds: field.configuration?.durationSeconds ?? 60,
					};
				}
			}
			//Streamloots' overlay ignores modifiers of trolled cards
			if (trolled) alertModifier = undefined;

			return {
				type: "card_redeemed",
				username,
				cardId: data.cardId || "",
				cardName: data.cardName,
				rarity: (
					data.cardRarity ||
					getField(data, "rarity") ||
					"common"
				).toLowerCase() as StreamlootsRarity,
				inputs,
				alertMessage: decodeHTML(payload.message || ""),
				trolled,
				alertModifier,
				raw: payload,
			};
		}
		case "purchase": {
			const quantity = parseInt(getField(data, "quantity") || "1");
			//Gifts are purchases with a "giftee" field
			const giftee = getField(data, "giftee");
			if (giftee) {
				return { type: "pack_gifted", username, giftee, quantity, raw: payload };
			}
			return { type: "pack_purchased", username, quantity, raw: payload };
		}
	}

	return { type: "unknown", raw: payload };
}

interface StreamlootsStoreData {
	widgetId: string;
}

