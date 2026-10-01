/**
 * Tests for DataStore's server synchronization:
 * - uploading local changes that didn't reach the server before the page got closed
 * - private data never leaving the browser
 *
 * Run with: npm test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Fake backend mimicking UserController's user data endpoints
 */
const server = vi.hoisted(() => ({
	file: null as Record<string, any> | null,
	cachedVersion: 0,
	/**
	 * Server only rejects outdated versions if user has more than 1 connection
	 */
	connections: 2,
	/**
	 * "landed": data are written but the response never comes back (page closed)
	 * "lost": data never reach the server and the response never comes back
	 */
	nextPost: "normal" as "normal" | "landed" | "lost",
	/**
	 * Server unreachable, uploads fail right away
	 */
	down: false,
	/**
	 * Every POST received, whatever the endpoint
	 */
	posts: [] as { endpoint: string; body: any }[],
}));

vi.mock("@/utils/ApiHelper", () => ({
	default: {
		call: async (endpoint: string, method: string, body: any) => {
			if (method == "POST") {
				server.posts.push({ endpoint, body: JSON.parse(JSON.stringify(body)) });
			}
			if (endpoint != "user/data") return { status: 200, json: { success: true } };
			if (method == "GET") {
				if (!server.file) return { status: 404, json: { success: false } };
				return {
					status: 200,
					json: { success: true, data: JSON.parse(JSON.stringify(server.file)) },
				};
			}
			const mode = server.nextPost;
			server.nextPost = "normal";
			if (mode == "lost") return new Promise(() => {});
			if (server.down) return { status: 500, json: {} };
			const data = JSON.parse(JSON.stringify(body.data));
			if (body.forced === true) data.saveVersion = server.cachedVersion + 1;
			if (data.saveVersion <= server.cachedVersion && server.connections > 1) {
				return { status: 409, json: { success: false } };
			}
			server.cachedVersion = data.saveVersion;
			server.file = data;
			if (mode == "landed") return new Promise(() => {});
			return { status: 200, json: { success: true, version: server.cachedVersion } };
		},
	},
}));
vi.mock("./StoreProxy", () => ({
	default: {
		auth: { twitch: { access_token: "token" } },
		main: {
			outdatedDataVersion: false,
			offlineMode: false,
			showOutdatedDataVersionAlert: () => {},
		},
	},
}));
vi.mock("@/utils/Utils", () => ({ default: { getUUID: () => crypto.randomUUID() } }));
vi.mock("@/utils/Config", () => ({ default: {} }));
vi.mock("@/utils/TriggerUtils", () => ({ default: {} }));
vi.mock("@/utils/triggers/ChatCommandCaptureUtils", () => ({ default: {} }));
vi.mock("@/types/TriggerTypes", () => ({ TriggerTypes: {} }));
vi.mock("@/types/TriggerActionDataTypes", () => ({}));

class MemoryStorage {
	private items = new Map<string, string>();
	get length(): number {
		return this.items.size;
	}
	key(index: number): string | null {
		return [...this.items.keys()][index] ?? null;
	}
	getItem(key: string): string | null {
		return this.items.get(key) ?? null;
	}
	setItem(key: string, value: string): void {
		this.items.set(key, value);
	}
	removeItem(key: string): void {
		this.items.delete(key);
	}
	clear(): void {
		this.items.clear();
	}
}

/**
 * Opens twitchat on the given device (its local storage) the same way storeAuth does.
 * Any timer of a previous launch is dropped, as if its page had been closed.
 */
async function launch(device: MemoryStorage) {
	vi.clearAllTimers();
	vi.resetModules();
	vi.stubGlobal("localStorage", device);
	vi.stubGlobal("sessionStorage", new MemoryStorage());
	const { default: DataStore } = await import("./DataStore");
	DataStore.init();
	await DataStore.migrateLocalStorage();
	await DataStore.loadRemoteData();
	return DataStore;
}

/**
 * Lets any debounced upload complete
 */
async function flushUploads(): Promise<void> {
	await vi.runAllTimersAsync();
}

let deviceA: MemoryStorage;
let deviceB: MemoryStorage;

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal("window", globalThis);
	vi.spyOn(console, "log").mockImplementation(() => {});
	server.file = { v: 70, saveVersion: 5, saveId: "initial", theme: "initial" };
	server.cachedVersion = 5;
	server.connections = 2;
	server.nextPost = "normal";
	server.down = false;
	server.posts = [];
	deviceA = new MemoryStorage();
	deviceB = new MemoryStorage();
});

afterEach(() => {
	vi.clearAllTimers();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("DataStore unsynced changes", () => {
	it("uploads local changes on next launch if page closed before upload", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");
		//Page closed before the debounced upload

		store = await launch(deviceA);
		expect(store.get("theme")).toBe("A");
		await flushUploads();
		expect(server.file!.theme).toBe("A");
	});

	it("drops local changes if remote data were changed from another device meanwhile", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");
		//Page closed before the debounced upload

		const storeB = await launch(deviceB);
		await flushUploads();
		void storeB.set("theme", "B");
		await flushUploads();
		expect(server.file!.theme).toBe("B");

		store = await launch(deviceA);
		expect(store.get("theme")).toBe("B");
		await flushUploads();
		expect(server.file!.theme).toBe("B");
	});

	it("drops local changes if another device only got opened meanwhile", async () => {
		//Opening twitchat re-uploads remote data, which counts as a remote change
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");

		await launch(deviceB);
		await flushUploads();

		store = await launch(deviceA);
		expect(store.get("theme")).toBe("initial");
	});

	it("uploads later changes if page closed after an upload reached the server unacknowledged", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A1");
		server.nextPost = "landed";
		await flushUploads();
		expect(server.file!.theme).toBe("A1");
		//Made while the upload is still waiting for its response
		void store.set("theme", "A2");

		store = await launch(deviceA);
		expect(store.get("theme")).toBe("A2");
		await flushUploads();
		expect(server.file!.theme).toBe("A2");
	});

	it("uploads local changes if an upload never reached the server", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");
		server.nextPost = "lost";
		await flushUploads();
		expect(server.file!.theme).toBe("initial");

		store = await launch(deviceA);
		expect(store.get("theme")).toBe("A");
		await flushUploads();
		expect(server.file!.theme).toBe("A");
	});

	it("drops local changes if an upload never reached the server and another device saved", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");
		server.nextPost = "lost";
		await flushUploads();

		const storeB = await launch(deviceB);
		await flushUploads();
		void storeB.set("theme", "B");
		await flushUploads();

		store = await launch(deviceA);
		expect(store.get("theme")).toBe("B");
	});

	it("drops local changes if another device saved with the same save version", async () => {
		//This is why uploads are identified by a random ID and not by their version
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");
		server.nextPost = "lost";
		await flushUploads();
		//A's lost upload was v7

		//Edited right away, merged with the upload done when opening
		const storeB = await launch(deviceB);
		void storeB.set("theme", "B");
		await flushUploads();
		expect(server.file!.saveVersion).toBe(7);

		store = await launch(deviceA);
		expect(store.get("theme")).toBe("B");
		await flushUploads();
		expect(server.file!.theme).toBe("B");
	});

	it("uploads local changes after many failed uploads if server data didn't change", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		server.down = true;
		for (let i = 0; i < 25; i++) {
			void store.set("theme", "A" + i);
			await flushUploads();
		}
		server.down = false;
		expect(server.file!.theme).toBe("initial");

		store = await launch(deviceA);
		expect(store.get("theme")).toBe("A24");
		await flushUploads();
		expect(server.file!.theme).toBe("A24");
	});

	it("imports remote data normally once local changes were uploaded", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");
		await flushUploads();
		expect(JSON.parse(store.get(store.SYNC_STATE)!).pending).toBe(false);

		//Changed from a tool writing remote data without going through the app
		server.file!.theme = "external";
		store = await launch(deviceA);
		expect(store.get("theme")).toBe("external");
	});

	it("imports remote data that have no save ID", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");

		server.file = { v: 70, saveVersion: 5, theme: "legacy" };
		store = await launch(deviceA);
		expect(store.get("theme")).toBe("legacy");
	});

	it("uploads kept local changes with a version the server accepts", async () => {
		let store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A1");
		//Forced upload whose response got lost: server version is now above local one
		server.nextPost = "landed";
		void store.save(true);
		await flushUploads();
		server.cachedVersion = server.file!.saveVersion = 50;
		void store.set("theme", "A2");

		store = await launch(deviceA);
		await flushUploads();
		expect(server.file!.theme).toBe("A2");
		expect(server.file!.saveVersion).toBe(51);
	});

	it("never sends its sync state to the server", async () => {
		const store = await launch(deviceA);
		await flushUploads();
		void store.set("theme", "A");
		await flushUploads();
		expect(server.file![store.SYNC_STATE]).toBeUndefined();
		expect(typeof server.file![store.SAVE_ID]).toBe("string");
	});
});

describe("DataStore private data", () => {
	it("never uploads secrets, neither with user data nor with the emergency backup", async () => {
		const store = await launch(deviceA);
		await flushUploads();
		const secretKeys = [
			store.OBS_PASS,
			store.TWITCH_AUTH_TOKEN,
			store.SPOTIFY_AUTH_TOKEN,
			store.SPOTIFY_APP_PARAMS,
			store.YOUTUBE_AUTH_TOKEN,
			store.STREAMLABS,
			store.STREAMELEMENTS,
			store.TIPEEE,
			store.TILTIFY_TOKEN,
			store.STREAMERBOT_WS_PASSWORD,
			store.SAMMI_API_PASSWORD,
			store.GROQ_API_KEY,
			store.ELEVENLABS_API_KEY,
			store.TWITCH_BOT,
			store.STREAM_SOCKET_SECRET,
			store.BLUESKY_LINK,
		];
		for (const key of secretKeys) void store.set(key, "SECRET_VALUE", false);
		void store.set("theme", "A");
		await flushUploads();
		await store.emergencyBackupStorage(true);

		expect(server.file!.theme).toBe("A");
		expect(server.posts.map((p) => p.endpoint)).toContain("user/data/backup");
		for (const post of server.posts) {
			expect(JSON.stringify(post.body)).not.toContain("SECRET_VALUE");
		}
	});

	it("keeps every local-only automod rule when importing remote data", async () => {
		const rule = (id: string, serverSync: boolean) => ({ id, serverSync });
		server.file!.automodParams = { keywordsFilters: [rule("S1", true)] };
		//Local data without version are considered too old and wiped
		deviceA.setItem("twitchat_v", "70");
		deviceA.setItem(
			"twitchat_automodParams",
			JSON.stringify({
				keywordsFilters: [rule("U1", false), rule("U2", false), rule("S1", true)],
			}),
		);

		const store = await launch(deviceA);
		const localRules = JSON.parse(store.get(store.AUTOMOD_PARAMS)!).keywordsFilters;
		expect(localRules.map((r: { id: string }) => r.id).sort()).toEqual(["S1", "U1", "U2"]);
		await flushUploads();
		expect(server.file!.automodParams.keywordsFilters).toEqual([rule("S1", true)]);
	});
});
