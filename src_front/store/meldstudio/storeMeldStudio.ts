import DataStore from "@/store/DataStore";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { IMeldStudioActions, IMeldStudioGetters, IMeldStudioState } from "../StoreProxy";
import type { QWebChannelInstance } from "@/types/qwebchannel";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Utils from "@/utils/Utils";
import StoreProxy from "../StoreProxy";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import type { MeldStudio } from "@/types/MeldStudioTypes";

let socket: WebSocket | null = null;
let qWebChannelLoadingPromise: Promise<void> | null = null;
let meldInstance: MeldStudio | null;
let _channel: QWebChannelInstance | null = null;
let reconnectTimeout = -1;
let reconnectDelay = 2000;
let userRequestedDisconnect = false;

function loadQWebChannel(): Promise<void> {
	if (typeof window.QWebChannel === "function") return Promise.resolve();
	if (qWebChannelLoadingPromise) return qWebChannelLoadingPromise;

	qWebChannelLoadingPromise = new Promise<void>((resolve, reject) => {
		const src = "/qwebchannel.js";
		const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
		if (existing) {
			if (typeof window.QWebChannel === "function") {
				resolve();
			} else {
				existing.addEventListener("load", () => resolve(), { once: true });
				existing.addEventListener(
					"error",
					() => {
						qWebChannelLoadingPromise = null;
						reject(new Error("Failed to load qwebchannel.js"));
					},
					{ once: true },
				);
			}
			return;
		}

		const script = document.createElement("script");
		script.src = src;
		script.type = "text/javascript";
		script.onload = () => resolve();
		script.onerror = () => {
			qWebChannelLoadingPromise = null;
			reject(new Error("Failed to load qwebchannel.js"));
		};
		document.head.appendChild(script);
	});

	return qWebChannelLoadingPromise;
}

export const storeMeldStudio = defineStore("meldstudio", {
	state: (): IMeldStudioState => ({
		connected: false,
		connecting: false,
		connectionEnabled: false,
		ip: "127.0.0.1",
		port: 13376,
		sceneList: [],
		layerList: [],
		effectList: [],
		trackList: [],
		currentSCene: null,
		visibilityCache: {},
		muteCache: {},
	}),

	getters: {
		meld: function () {
			return meldInstance;
		},
	} satisfies StoreGetters<IMeldStudioGetters, IMeldStudioState>,

	actions: {
		populateData(): void {
			const json = DataStore.get(DataStore.MELD_STUDIO_CONFIGS);
			if (json) {
				const data = JSON.parse(json) as IStoreData;
				this.ip = data.ip || "127.0.0.1";
				this.port = data.port || 13376;
				this.connectionEnabled = data.connectionEnabled ?? true;
				if (this.connectionEnabled) {
					void this.connect();
				}
			}
		},

		async connect(): Promise<boolean> {
			if (!this.connectionEnabled) return false;
			this.connecting = true;
			userRequestedDisconnect = false;
			clearTimeout(reconnectTimeout);
			await loadQWebChannel();
			if (socket != null) {
				socket.close();
			}
			return new Promise((resolve, reject) => {
				let url = "";
				// If IP contains full url (ws:// or wss://), use it directly
				if (/wss?:\/\//.test(this.ip)) {
					url = this.ip;
				} else {
					url = `ws://${this.ip}`;
					if (this.port) url += ":" + this.port;
				}
				socket = new WebSocket(url);

				socket.onopen = async () => {
					reconnectDelay = 2000;
					_channel = new QWebChannel(socket!, (channel) => {
						meldInstance = channel.objects.meld;
						if (!meldInstance) return;

						meldInstance.setClientName("Twitchat");

						const onSessionDataUpdate = (isFirstSync: boolean) => {
							if (!meldInstance) return;
							const items = meldInstance.session.items;
							this.sceneList = [];
							this.layerList = [];
							this.effectList = [];
							this.trackList = [];
							for (const id in items) {
								if (!Object.hasOwn(items, id)) continue;
								const item = items[id]!;
								switch (item.type) {
									case "scene":
										this.sceneList.push({ ...item, id });
										break;
									case "effect":
										this.effectList.push({ ...item, id });
										break;
									case "layer":
										this.layerList.push({ ...item, id });
										break;
									case "track":
										this.trackList.push({ ...item, id });
										break;
								}
							}

							const baseTriggerEvent: TwitchatDataTypes.AbstractTwitchatMessage = {
								id: Utils.getUUID(),
								date: Date.now(),
								platform: "twitchat",
								channel_id: StoreProxy.auth.twitch.user.id,
								type: "message",
							};

							// Check for layer visibility change
							this.layerList.forEach((v) => {
								if (!isFirstSync && v.visible != this.visibilityCache[v.id]) {
									const event: TwitchatDataTypes.MessageMeldStudioLayerVisibilityChangeData =
										{
											...baseTriggerEvent,
											type: TwitchatDataTypes.TwitchatMessageType
												.MELDSTUDIO_LAYER_VISIBILITY_CHANGE,
											meldstudioLayerVisibilityChange: {
												layerId: v.id,
												layerName: v.name,
												visible: v.visible,
											},
										};
									void TriggerActionHandler.instance.execute(event);
								}
								this.visibilityCache[v.id] = v.visible;
							});

							// Check for effect visibility change
							this.effectList.forEach((v) => {
								if (!isFirstSync && v.enabled != this.visibilityCache[v.id]) {
									const event: TwitchatDataTypes.MessageMeldStudioEffectVisibilityChangeData =
										{
											...baseTriggerEvent,
											type: TwitchatDataTypes.TwitchatMessageType
												.MELDSTUDIO_EFFECT_VISIBILITY_CHANGE,
											meldstudioFilterVisibilityChange: {
												effectId: v.id,
												effectName: v.name,
												enabled: v.enabled,
											},
										};
									void TriggerActionHandler.instance.execute(event);
								}
								this.visibilityCache[v.id] = v.enabled;
							});

							// Check for track mute change
							this.trackList.forEach((v) => {
								if (!isFirstSync && v.muted != this.muteCache[v.id]) {
									const event: TwitchatDataTypes.MessageMeldStudioTrackMuteChangeData =
										{
											...baseTriggerEvent,
											type: TwitchatDataTypes.TwitchatMessageType
												.MELDSTUDIO_TRACK_MUTE_CHANGE,
											meldstudioTrackMuteChange: {
												trackId: v.id,
												trackName: v.name,
												muted: v.muted,
											},
										};
									void TriggerActionHandler.instance.execute(event);
								}
								this.muteCache[v.id] = v.muted;
							});

							// Check for scene change
							const newScene = this.sceneList.find((v) => v.current);
							if (!isFirstSync && newScene && newScene.id != this.currentSCene?.id) {
								const event: TwitchatDataTypes.MessageMeldStudioSceneChangeData = {
									...baseTriggerEvent,
									type: TwitchatDataTypes.TwitchatMessageType
										.MELDSTUDIO_SCENE_CHANGE,
									meldstudioSceneChange: {
										sceneId: newScene.id,
										sceneName: newScene.name,
										prev_sceneId: this.currentSCene?.id || "",
										prev_sceneName: this.currentSCene?.name || "",
									},
								};
								void TriggerActionHandler.instance.execute(event);
							}
							if (newScene) {
								this.currentSCene = { name: newScene.name, id: newScene.id };
							}
						};

						// Called anytime something's changed on the scenes configurations
						meldInstance.sessionChanged.connect(() => onSessionDataUpdate(false));
						onSessionDataUpdate(true);

						// Called when streaming is started/stoped
						meldInstance.isStreamingChanged.connect(() => {
							if (!meldInstance) return;
							let m:
								| TwitchatDataTypes.MessageMeldStudioStartStreamData
								| TwitchatDataTypes.MessageMeldStudioStopStreamData = {
								id: Utils.getUUID(),
								date: Date.now(),
								platform: "twitchat",
								type: meldInstance.isStreaming
									? TwitchatDataTypes.TwitchatMessageType.MELDSTUDIO_START_STREAM
									: TwitchatDataTypes.TwitchatMessageType.MELDSTUDIO_STOP_STREAM,
								channel_id: StoreProxy.auth.twitch.user.id,
							};
							void TriggerActionHandler.instance.execute(m);
						});

						this.connected = true;
						this.connecting = false;
						resolve(true);
					});
				};

				socket.onclose = () => {
					meldInstance = null;
					this.connected = false;
					this.connecting = false;
					if (!userRequestedDisconnect) {
						reconnectDelay = Math.min(60000, reconnectDelay * 2);
						clearTimeout(reconnectTimeout);
						reconnectTimeout = window.setTimeout(() => {
							void this.connect();
						}, reconnectDelay);
					}
				};

				socket.onerror = (_error) => {
					meldInstance = null;
					this.connected = false;
					this.connecting = false;
					reject("[-][Websocket trigger] Socket error");
				};
			});
		},

		disconnect(): void {
			userRequestedDisconnect = true;
			clearTimeout(reconnectTimeout);
			if (!socket) return;
			socket.onopen = null;
			socket.close();
			socket = null;
			meldInstance = null;
			this.connected = false;
			this.connecting = false;
		},

		saveConfigs(): void {
			const data: IStoreData = {
				ip: this.ip,
				port: parseInt(this.port.toString()), //Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
				connectionEnabled: this.connectionEnabled,
			};
			DataStore.set(DataStore.MELD_STUDIO_CONFIGS, data);
		},
	} satisfies StoreActions<
		"meldstudio",
		IMeldStudioState,
		IMeldStudioGetters,
		IMeldStudioActions
	>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeMeldStudio, import.meta.hot));
}

interface IStoreData {
	ip: string;
	port: number;
	connectionEnabled?: boolean;
}
