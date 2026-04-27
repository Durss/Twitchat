import DataStore from "@/store/DataStore";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { ISammiActions, ISammiGetters, ISammiState } from "../StoreProxy";

export const storeSammi = defineStore("sammi", {
	state: (): ISammiState => ({
		connected: false,
		connectionEnabled: false,
		ip: "127.0.0.1",
		port: 9450,
		password: "",
	}),

	getters: {} satisfies StoreGetters<ISammiGetters, ISammiState>,

	actions: {
		populateData(): void {
			const json = DataStore.get(DataStore.SAMMI_CONFIGS);
			if (json) {
				const pass = DataStore.get(DataStore.SAMMI_API_PASSWORD);
				const data = JSON.parse(json) as IStoreData;
				this.ip = data.ip || "127.0.0.1";
				this.port = data.port || 9450;
				this.connectionEnabled = data.connectionEnabled ?? true;
				this.password = pass || "";
				if (this.connectionEnabled) {
					void this.connect();
				}
			}
		},

		async connect(): Promise<boolean> {
			let url = /https?:\/\//.test(this.ip) ? this.ip : "http://" + this.ip;
			if (this.port) url += ":" + this.port;
			const options: RequestInit = { method: "GET" };
			if (this.password) options.headers = { Authorization: this.password };

			try {
				const query = await fetch(url, options);
				if (query.status == 404) {
					let json = await query.json();
					this.connected = true;
					this.saveConfigs();
					return json.description != undefined;
				}
				this.connected = false;
			} catch (_error) {}
			return false;
		},

		disconnect(): void {
			this.connected = false;
		},

		async triggerButton(id: string): Promise<boolean> {
			let url = /https?:\/\//.test(this.ip) ? this.ip : "http://" + this.ip;
			if (this.port) url += ":" + this.port;
			url += "/api";
			const options: RequestInit = { method: "POST" };
			options.body = JSON.stringify({
				request: "triggerButton",
				buttonID: id,
			});
			if (this.password) options.headers = { Authorization: this.password };

			try {
				const query = await fetch(url, options);
				if (query.status == 200) {
					return true;
				}
			} catch (_error) {}
			return false;
		},

		saveConfigs(): void {
			const data: IStoreData = {
				ip: this.ip,
				port: parseInt(this.port.toString()), //Seems stupid but it enforces the type. Some browser still return strings from "number" fields.
				connectionEnabled: this.connectionEnabled,
			};
			DataStore.set(DataStore.SAMMI_CONFIGS, data);
			DataStore.set(DataStore.SAMMI_API_PASSWORD, this.password);
		},
	} satisfies StoreActions<"sammi", ISammiState, ISammiGetters, ISammiActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeSammi, import.meta.hot));
}

interface IStoreData {
	ip: string;
	port: number;
	connectionEnabled?: boolean;
}
