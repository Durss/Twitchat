/**
 * Tests for triggers queues robustness:
 * - a trigger throwing an error still releases its queue
 * - a trigger waiting for its queue logs what's holding it
 * - waiting for an OBS media end can't block forever
 *
 * Run with: npm test
 */

import { TriggerTypes } from "@/types/TriggerTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { LogTrigger, LogTriggerStep } from "../Logger";
import Logger from "../Logger";
import TriggerActionHandler from "./TriggerActionHandler";

const mocks = vi.hoisted(() => ({
	checkPermissions: vi.fn(),
	promisedTimeout: vi.fn(),
	getMediaState: vi.fn(),
	obsListener: null as ((e: { data: { inputName: string } }) => void) | null,
	removeEventListener: vi.fn(),
}));

vi.mock("@/store/StoreProxy", () => ({
	default: {
		auth: { isPremium: true, twitch: { user: { id: "me" } } },
		triggers: { triggerIdToFolderEnabled: {}, triggerList: [] },
		i18n: { t: (key: string) => key, te: () => false },
	},
}));
vi.mock("@/store/DataStore", () => ({ default: {} }));
vi.mock("@/messaging/MessengerProxy", () => ({
	default: { instance: { sendMessage: async () => true } },
}));
vi.mock("../Utils", () => ({
	default: {
		getUUID: () => crypto.randomUUID(),
		checkPermissions: mocks.checkPermissions,
		promisedTimeout: mocks.promisedTimeout,
		toDigits: (num: number, digits = 2) => num.toString().padStart(digits, "0"),
		formatDuration: (millis: number) => Math.round(millis / 1000) + "s",
		formatDate: (date: Date) => date.toISOString(),
	},
}));
vi.mock("../TriggerUtils", () => ({
	default: { getTriggerDisplayInfo: (trigger: { name: string }) => ({ label: trigger.name }) },
}));
vi.mock("../OBSWebsocket", () => ({
	default: {
		instance: {
			connected: { value: true },
			getMediaState: mocks.getMediaState,
			addEventListener: (_type: string, listener: typeof mocks.obsListener) => {
				mocks.obsListener = listener;
			},
			removeEventListener: mocks.removeEventListener,
		},
	},
}));
vi.mock("../ApiHelper", () => ({ default: {} }));
vi.mock("../Config", () => ({ default: { instance: {} } }));
vi.mock("../OptionalPlaceholderModifiers", () => ({
	registerOptionalPlaceholderModifiers: () => {},
}));
vi.mock("../PublicAPI", () => ({ default: { instance: {} } }));
vi.mock("../SFXRUtils", () => ({ default: {} }));
vi.mock("../TTSUtils", () => ({ default: { instance: {} } }));
vi.mock("../WebsocketTrigger", () => ({ default: { instance: {} } }));
vi.mock("../goxlr/GoXLRSocket", () => ({ default: { instance: {} } }));
vi.mock("../music/SpotifyHelper", () => ({ default: { instance: {} } }));
vi.mock("../twitch/TwitchUtils", () => ({ default: {} }));
vi.mock("../voice/VoicemodWebSocket", () => ({ default: { instance: {} } }));
vi.mock("../youtube/YoutubeHelper", () => ({ default: { instance: {} } }));

vi.stubGlobal("window", globalThis);

function buildTrigger(id: string): any {
	return {
		id,
		name: "Trigger " + id,
		type: TriggerTypes.FOLLOW,
		enabled: true,
		queue: "alerts",
		permissions: {},
		actions: [{ id: id + "_delay", type: "delay", delay: 0 }],
	};
}

function buildMessage(): any {
	return {
		id: crypto.randomUUID(),
		date: Date.now(),
		platform: "twitch",
		type: TwitchatDataTypes.TwitchatMessageType.FOLLOWING,
		channel_id: "me",
		user: { id: "viewer", login: "viewer", channelInfo: {} },
	};
}

function getTriggerLog(triggerId: string): LogTrigger {
	const logs = Logger.instance.getLogs("triggers") as LogTrigger[];
	return logs.findLast((v) => v.trigger.id == triggerId)!;
}

function getLogMessages(log: LogTrigger): string[] {
	return log.entries.filter((v) => v.type == "message").map((v) => v.value);
}

describe("TriggerActionHandler queues", () => {
	let handler: TriggerActionHandler;

	beforeEach(() => {
		handler = new TriggerActionHandler();
		Logger.instance.clear("triggers");
		mocks.checkPermissions.mockReset().mockResolvedValue(true);
		mocks.promisedTimeout.mockReset().mockResolvedValue(undefined);
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("releases the queue when a trigger throws an error", async () => {
		mocks.checkPermissions.mockRejectedValueOnce(new Error("boom"));
		const message = buildMessage();
		const resA = handler.executeTrigger(buildTrigger("a"), message, false);
		const resB = handler.executeTrigger(buildTrigger("b"), message, false);

		const timeout = new Promise<string>((resolve) => setTimeout(() => resolve("stuck"), 1000));
		const results = await Promise.race([Promise.all([resA, resB]), timeout]);

		expect(results).toEqual([false, true]);
		const logA = getTriggerLog("a");
		expect(logA.criticalError).toBe(true);
		expect(getLogMessages(logA).some((v) => v.includes("boom"))).toBe(true);
		expect(getLogMessages(logA)).toContain("✔ Resolve queue alerts");
		expect(getTriggerLog("b").complete).toBe(true);
		expect((handler as any).triggerTypeToQueue["alerts"]).toEqual([]);
	});

	it("logs what's holding the queue on waiting triggers", async () => {
		vi.useFakeTimers();
		//First trigger never completes its action
		mocks.promisedTimeout.mockReturnValueOnce(new Promise(() => {}));
		const message = buildMessage();
		void handler.executeTrigger(buildTrigger("a"), message, false);
		void handler.executeTrigger(buildTrigger("b"), message, false);

		await vi.advanceTimersByTimeAsync(59_000);
		const logB = getTriggerLog("b");
		expect(getLogMessages(logB).some((v) => v.startsWith("⚠️"))).toBe(false);

		await vi.advanceTimersByTimeAsync(2_000);
		let warnings = getLogMessages(logB).filter((v) => v.startsWith("⚠️"));
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('Held by "Trigger a"');
		expect(warnings[0]).toContain('executing action 1/1 "delay"');

		//Warning is updated, not duplicated
		await vi.advanceTimersByTimeAsync(60_000);
		warnings = getLogMessages(logB).filter((v) => v.startsWith("⚠️"));
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain("still busy after 120s");
	});
});

describe("TriggerActionHandler waitForMediaEnd", () => {
	let handler: TriggerActionHandler;
	let logStep: LogTriggerStep;

	function waitForMediaEnd(): { done: () => boolean } {
		let done = false;
		void (handler as any).waitForMediaEnd("media", logStep).then(() => {
			done = true;
		});
		return { done: () => done };
	}

	beforeEach(() => {
		vi.useFakeTimers();
		handler = new TriggerActionHandler();
		logStep = { type: "step", id: "s", date: 0, error: false, data: {} as any, messages: [] };
		mocks.obsListener = null;
		mocks.removeEventListener.mockReset();
		mocks.getMediaState.mockReset().mockResolvedValue("OBS_MEDIA_STATE_PLAYING");
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("completes when OBS notifies the playback end", async () => {
		const wait = waitForMediaEnd();
		mocks.obsListener!({ data: { inputName: "other" } });
		await vi.advanceTimersByTimeAsync(0);
		expect(wait.done()).toBe(false);

		mocks.obsListener!({ data: { inputName: "media" } });
		await vi.advanceTimersByTimeAsync(0);
		expect(wait.done()).toBe(true);
		expect(mocks.removeEventListener).toHaveBeenCalled();
		expect(logStep.messages.at(-1)!.value).toContain("playing complete");
	});

	it("keeps waiting while the media is playing", async () => {
		const wait = waitForMediaEnd();
		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(wait.done()).toBe(false);
	});

	it("stops waiting when the media stopped without OBS notifying it", async () => {
		mocks.getMediaState.mockResolvedValue("OBS_MEDIA_STATE_ENDED");
		const wait = waitForMediaEnd();
		//A single check could race with the end notification
		await vi.advanceTimersByTimeAsync(2_000);
		expect(wait.done()).toBe(false);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(wait.done()).toBe(false);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(wait.done()).toBe(false);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(wait.done()).toBe(false);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(wait.done()).toBe(true);
		expect(logStep.messages.at(-1)!.value).toContain("OBS_MEDIA_STATE_ENDED");

		//No more check once complete
		const calls = mocks.getMediaState.mock.calls.length;
		await vi.advanceTimersByTimeAsync(60_000);
		expect(mocks.getMediaState.mock.calls.length).toBe(calls);
	});

	it("stops waiting when the source doesn't exist anymore", async () => {
		mocks.getMediaState.mockRejectedValue(new Error("not found"));
		const wait = waitForMediaEnd();
		await vi.advanceTimersByTimeAsync(10_000);
		expect(wait.done()).toBe(true);
	});
});
