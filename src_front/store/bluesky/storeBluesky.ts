import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import type { BrowserOAuthClient, OAuthSession } from "@atproto/oauth-client-browser";
import { acceptHMRUpdate, defineStore } from "pinia";
import DataStore from "../DataStore";
import type { IBlueskyActions, IBlueskyGetters, IBlueskyState } from "../StoreProxy";
import type { Agent } from "@atproto/api";

let oauthClient: BrowserOAuthClient | null = null;
let session: OAuthSession | null = null;
let agent: Agent | null = null;

export const storeBluesky = defineStore("bluesky", {
	state: (): IBlueskyState => ({
		connected: false,
		sub: "",
		profile: null,
		handleResolver: "https://bsky.social",
	}),
	getters: {
		session: function () {
			return session;
		},
	} satisfies StoreGetters<IBlueskyGetters, IBlueskyState>,
	actions: {
		async populateData() {
			const json = DataStore.get(DataStore.BLUESKY_CONFIGS);
			const data = json && (JSON.parse(json) as IStoreData);
			if (data) {
				this.handleResolver = data.handleResolver || this.handleResolver;
				this.sub = data.sub;
				if (data.connected && data.sub) {
					await this.authenticate(true);
				}
			}
		},

		async initClient() {
			if (oauthClient) return oauthClient;
			const { BrowserOAuthClient } = await import("@atproto/oauth-client-browser");
			oauthClient = await BrowserOAuthClient.load({
				clientId: document.location.origin + "/oauth/client-metadata.json",
				handleResolver: this.handleResolver,
			});
			return oauthClient;
		},

		async startOAuthProcess(handle: string) {
			const client = await this.initClient();
			try {
				// client.signInPopup(handle);//TODO: move to popup!
				const url = await client.authorize(handle.replace(/^@/, ""));
				window.open(url, "_self", "noopener");
			} catch (_error) {
				return false;
			}
			return true;
		},

		async authenticate(restore: boolean = false): Promise<void> {
			if (this.connected) return;
			try {
				const client = await this.initClient();
				if (restore) {
					session = await client.restore(this.sub);
				} else {
					const result = await client.init();
					session = result?.session ?? null;
				}
				console.log("RESULT", session);
				if (session) {
					this.sub = session.sub;
					this.connected = true;

					const { Agent } = await import("@atproto/api");
					agent = new Agent(session);
					const userProfile = await agent.getProfile({ actor: agent.did! });
					this.profile = userProfile.data;
					this.saveState();
				}
			} catch (error) {
				console.warn("Bluesky auth failed", error);
			}
			document.location.hash = "";
		},

		async disconnect() {
			if (session) {
				await session?.signOut();
				this.profile = null;
				this.connected = false;
				this.saveState();
			}
		},

		async setLiveStatus(live: boolean): Promise<void> {},

		saveState() {
			const data: IStoreData = {
				sub: this.sub,
				connected: this.connected,
				handleResolver: this.handleResolver,
			};
			DataStore.set(DataStore.BLUESKY_CONFIGS, data);
		},
	} satisfies StoreActions<"bluesky", IBlueskyState, IBlueskyGetters, IBlueskyActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeBluesky, import.meta.hot));
}

interface IStoreData {
	sub: string;
	connected: boolean;
	handleResolver: string;
}
