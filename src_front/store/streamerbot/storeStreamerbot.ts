import DataStore from "@/store/DataStore";
import {
	acceptHMRUpdate,
	defineStore,
	type PiniaCustomProperties,
	type _StoreWithGetters,
	type _StoreWithState,
} from "pinia";
import type { UnwrapRef } from "vue";
import type { IStreamerbotActions, IStreamerbotGetters, IStreamerbotState } from "../StoreProxy";
import { StreamerbotClient } from "@streamerbot/client";

let initResolver!: (value: boolean) => void;
let socket!: StreamerbotClient;

export const storeStreamerbot = defineStore("streamerbot", {
	state: () =>
		({
			connected: false as boolean,
			connectionEnabled: false as boolean,
			ip: "127.0.0.1" as string,
			port: 8080 as number,
			password: "" as string,
			actionList: [] as IStreamerbotState["actionList"],
		}) satisfies IStreamerbotState,

	getters: {} satisfies IStreamerbotGetters &
		ThisType<
			UnwrapRef<IStreamerbotState> &
				_StoreWithGetters<IStreamerbotGetters> &
				PiniaCustomProperties
		>,

	actions: {
		populateData(): void {
			const json = DataStore.get(DataStore.STREAMERBOT_CONFIGS);
			if (json) {
				const pass = DataStore.get(DataStore.STREAMERBOT_WS_PASSWORD);
				const data = JSON.parse(json) as IStoreData;
				this.ip = data.ip || "127.0.0.1";
				this.port = data.port || 8080;
				this.connectionEnabled = data.connectionEnabled ?? true;
				this.password = pass || "";
				if (this.connectionEnabled) {
					void this.connect();
				}
			}
		},

		async connect(): Promise<boolean> {
			if (!this.connectionEnabled) return false;
			return new Promise<boolean>((resolve) => {
				initResolver = resolve;

				if (socket) {
					void socket.disconnect();
				}
				console.log(this.password);
				socket = new StreamerbotClient({
					port: this.port,
					host: this.ip,
					immediate: false,
					password: this.password,
					autoReconnect: true,
					onConnect: (_res) => {
						this.connected = true;
						initResolver(true);
						void this.listActions();
						this.saveConfigs();
					},
					onError: (_error) => {
						this.connected = false;
						initResolver(false);
					},
					// onDisconnect:()=>{
					// 	console.log("DISCONNECT??");
					// 	window.setTimeout(() => {
					// 		socket.connect();
					// 	}, 1000);
					// }
				});
				void socket.connect().catch((_error) => {
					this.connected = false;
					initResolver(false);
				});

				void socket.on("Application.ActionAdded", () => this.listActions());
				void socket.on("Application.ActionDeleted", () => this.listActions());
				void socket.on("Application.ActionUpdated", () => this.listActions());
			});
		},

		disconnect(): void {
			this.connected = false;
			void socket.disconnect();
		},

		doAction(id: string, args: { [key: string]: string | number }): void {
			const date = new Date();
			args.date =
				date.getFullYear() +
				"/" +
				(date.getMonth() + 1).toString().padStart(2, "0") +
				"/" +
				date.getDate().toString().padStart(2, "0");
			args.time =
				date.getHours().toString().padStart(2, "0") +
				":" +
				date.getMinutes().toString().padStart(2, "0");
			args.longtime = args.time + ":" + date.getSeconds().toString().padStart(2, "0");
			args.unixtime = Math.round(date.getTime() / 1000);
			args.eventSource = "Twitchat";
			if (socket.ready) void socket.doAction({ id }, args);
		},

		saveConfigs(): void {
			const data: IStoreData = {
				ip: this.ip,
				port: parseInt(this.port.toString()), //Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
				connectionEnabled: this.connectionEnabled,
			};
			DataStore.set(DataStore.STREAMERBOT_CONFIGS, data);
			DataStore.set(DataStore.STREAMERBOT_WS_PASSWORD, this.password);
		},

		async listActions(): Promise<void> {
			const actions = await socket.getActions();
			this.actionList = actions.actions;
		},
	} satisfies IStreamerbotActions &
		ThisType<
			IStreamerbotActions &
				UnwrapRef<IStreamerbotState> &
				_StoreWithState<
					"streamerbot",
					IStreamerbotState,
					IStreamerbotGetters,
					IStreamerbotActions
				> &
				_StoreWithGetters<IStreamerbotGetters> &
				PiniaCustomProperties
		>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeStreamerbot, import.meta.hot));
}

interface IStoreData {
	ip: string;
	port: number;
	connectionEnabled?: boolean;
}
