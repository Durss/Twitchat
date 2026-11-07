/**
 * Tests for simple chat commands:
 * - managing commands from chat (add/edit/remove/list)
 * - "/" commands protection on messages added from chat
 * - undoing a deletion
 * - hidden triggers generation and timers scheduling
 *
 * Run with: npm test
 */

import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
	isPremium: false,
	sentMessages: [] as string[],
	feedMessages: [] as any[],
	triggerList: [] as any[],
	populateExtra: vi.fn(),
	scheduleTrigger: vi.fn(),
	replaceScheduledTrigger: vi.fn(),
	unscheduleTrigger: vi.fn(),
	toast: vi.fn(),
}));

vi.mock("../StoreProxy", () => ({
	default: {
		auth: {
			get isPremium() {
				return mocks.isPremium;
			},
			twitch: { user: { id: "me" } },
		},
		i18n: {
			t: (key: string, params?: Record<string, unknown>) =>
				params ? key + " " + JSON.stringify(params) : key,
		},
		triggers: {
			get triggerList() {
				return mocks.triggerList;
			},
		},
		chat: { addMessage: (message: any) => mocks.feedMessages.push(message) },
	},
}));
vi.mock("../DataStore", () => ({
	default: { CHAT_COMMANDS_CONFIGS: "chatCommandsConfigs", get: () => null, set: () => {} },
}));
vi.mock("@/messaging/MessengerProxy", () => ({
	default: {
		instance: {
			sendMessage: async (text: string) => {
				mocks.sentMessages.push(text);
				return true;
			},
		},
	},
}));
vi.mock("@/utils/triggers/TriggerActionHandler", () => ({
	default: { instance: { populateExtra: mocks.populateExtra } },
}));
vi.mock("@/utils/SchedulerHelper", () => ({
	default: {
		instance: {
			scheduleTrigger: mocks.scheduleTrigger,
			replaceScheduledTrigger: mocks.replaceScheduledTrigger,
			unscheduleTrigger: mocks.unscheduleTrigger,
		},
	},
}));
vi.mock("@/utils/Utils", () => ({
	default: {
		getUUID: () => crypto.randomUUID(),
		getDefaultPermissions: (
			broadcaster = true,
			mods = true,
			vips = true,
			subs = true,
			all = true,
			follower = true,
		) => ({
			broadcaster,
			mods,
			vips,
			subs,
			all,
			follower,
			follower_duration_ms: 0,
			usersAllowed: [],
			usersRefused: [],
		}),
		checkPermissions: async (permissions: any, user: any) =>
			permissions.all || (permissions.mods && user.isMod === true),
	},
}));
vi.mock("@/utils/Config", () => ({
	default: { instance: { MAX_CHAT_COMMANDS: 20, MAX_CHAT_COMMANDS_PREMIUM: 500 } },
}));
vi.mock("@/utils/toast/toast", () => ({ toast: mocks.toast }));
vi.mock("@/types/TriggerActionDataTypes", () => ({ TriggerScheduleTypes: { REGULAR_REPEAT: "1" } }));
vi.mock("@/types/TwitchatDataTypes", () => ({
	TwitchatDataTypes: {
		TwitchatMessageType: { MESSAGE: "message", CHAT_COMMAND_UPDATE: "chat_command_update" },
	},
}));

const { storeChatCommands } = await import("./storeChatCommands");

let now = Date.now();

/**
 * Builds a chat message the way storeChat sends it to the store
 */
function chatMessage(text: string, isMod = true, platform = "twitch"): any {
	return {
		id: crypto.randomUUID(),
		type: "message",
		platform,
		channel_id: "me",
		message: text,
		user: {
			id: isMod ? "mod_id" : "viewer_id",
			login: isMod ? "modo" : "viewer",
			displayNameOriginal: isMod ? "Modo" : "Viewer",
			isMod,
		},
	};
}

/**
 * Sends a message to the store, extracting the command like storeChat does
 */
async function send(text: string, isMod = true, platform = "twitch"): Promise<void> {
	const message = chatMessage(text, isMod, platform);
	const cmd = text.trim().split(" ")[0]!.toLowerCase();
	await storeChatCommands().handleChatCommand(message, cmd);
}

function addCommand(name: string, message = "Hello"): any {
	const store = storeChatCommands();
	const entry = store.createEntry();
	entry.command.name = name;
	entry.command.enabled = true;
	entry.message = message;
	store.entryList.push(entry);
	store.saveData();
	return entry;
}

beforeEach(() => {
	setActivePinia(createPinia());
	//List command has a cooldown based on current date
	vi.useFakeTimers({ toFake: ["Date"] });
	now += 60_000;
	vi.setSystemTime(now);
	mocks.isPremium = false;
	mocks.sentMessages = [];
	mocks.feedMessages = [];
	mocks.triggerList = [];
	vi.clearAllMocks();
	storeChatCommands().params.manageEnabled = true;
});

describe("chat management", () => {
	it("adds a command from chat", async () => {
		await send("!command add discord Join my discord {USER}");
		const store = storeChatCommands();
		expect(store.entryList).toHaveLength(1);
		expect(store.entryList[0]!.command.name).toBe("!discord");
		expect(store.entryList[0]!.message).toBe("Join my discord {USER}");
		expect(store.entryList[0]!.updatedBy).toBe("modo");
		expect(mocks.sentMessages[0]).toContain("chat_commands.chat.added");
		expect(mocks.feedMessages).toHaveLength(1);
		expect(mocks.feedMessages[0]).toMatchObject({
			type: "chat_command_update",
			action: "add",
			command: "!discord",
			message: "Join my discord {USER}",
			entryId: store.entryList[0]!.id,
		});
		expect(mocks.feedMessages[0].user.login).toBe("modo");
	});

	it("ignores users that aren't allowed to manage commands", async () => {
		await send("!command add !discord hello", false);
		expect(storeChatCommands().entryList).toHaveLength(0);
		expect(mocks.sentMessages).toHaveLength(0);
	});

	it("ignores management commands when disabled", async () => {
		storeChatCommands().params.manageEnabled = false;
		await send("!command add !discord hello");
		await send("!command list");
		expect(storeChatCommands().entryList).toHaveLength(0);
		expect(mocks.sentMessages).toHaveLength(0);
	});

	it("only handles Twitch messages", async () => {
		await send("!command add !discord hello", true, "youtube");
		expect(storeChatCommands().entryList).toHaveLength(0);
	});

	it.each(["/mod {USER}", "/raid someone", " /commercial 30", "/ban {TARGET}"])(
		"refuses messages executing a command: %s",
		async (message) => {
			await send("!command add !x " + message);
			expect(storeChatCommands().entryList).toHaveLength(0);
			expect(mocks.sentMessages[0]).toContain("chat_commands.chat.forbidden_slash");
		},
	);

	it.each(["/me waves", "/announce hello", "/announceblue hello"])(
		"accepts /me and /announce: %s",
		async (message) => {
			await send("!command add !x " + message);
			expect(storeChatCommands().entryList).toHaveLength(1);
		},
	);

	it("refuses to edit a message into a command", async () => {
		addCommand("!discord", "hello");
		await send("!command edit !discord /mod {USER}");
		expect(storeChatCommands().entryList[0]!.message).toBe("hello");
		expect(mocks.sentMessages[0]).toContain("chat_commands.chat.forbidden_slash");
	});

	it("refuses a command conflicting with a trigger", async () => {
		mocks.triggerList = [{ id: "t", type: "7", chatCommand: "!Discord", chatCommandAliases: [] }];
		await send("!command add !discord hello");
		expect(storeChatCommands().entryList).toHaveLength(0);
		expect(mocks.sentMessages[0]).toContain("chat_commands.chat.conflict");
	});

	it("refuses a command conflicting with another command's alias", async () => {
		const entry = addCommand("!discord");
		entry.command.aliases = ["!dc"];
		await send("!command add !DC hello");
		expect(storeChatCommands().entryList).toHaveLength(1);
		expect(mocks.sentMessages[0]).toContain("chat_commands.chat.conflict");
	});

	it("refuses a command once the limit is reached", async () => {
		for (let i = 0; i < 20; i++) addCommand("!cmd" + i);
		await send("!command add !one_more hello");
		expect(storeChatCommands().entryList).toHaveLength(20);
		expect(mocks.sentMessages[0]).toContain("chat_commands.chat.limit");
	});

	it("edits a command by its alias", async () => {
		const entry = addCommand("!discord", "old");
		entry.command.aliases = ["!dc"];
		await send("!command edit !dc new message");
		expect(entry.message).toBe("new message");
		expect(entry.updatedBy).toBe("modo");
		expect(mocks.sentMessages[0]).toContain("chat_commands.chat.edited");
	});

	it("answers with usage on invalid syntax", async () => {
		await send("!command add !discord");
		await send("!command foo");
		expect(mocks.sentMessages).toHaveLength(2);
		for (const m of mocks.sentMessages) expect(m).toContain("chat_commands.chat.usage");
	});
});

describe("remove and undo", () => {
	it("removes a command entirely, timer included", async () => {
		const entry = addCommand("!discord");
		entry.schedule.enabled = true;
		storeChatCommands().saveData();
		mocks.unscheduleTrigger.mockClear();

		await send("!command remove !discord");

		const store = storeChatCommands();
		expect(store.entryList).toHaveLength(0);
		expect(store.generatedTriggers).toHaveLength(0);
		expect(mocks.unscheduleTrigger).toHaveBeenCalledTimes(1);
		expect(store.trash[0]!.id).toBe(entry.id);
		expect(mocks.feedMessages[0]).toMatchObject({
			type: "chat_command_update",
			action: "remove",
			command: "!discord",
			entryId: entry.id,
		});
	});

	it("restores a removed command", async () => {
		const entry = addCommand("!discord");
		entry.schedule.enabled = true;
		await send("!command remove !discord");
		mocks.scheduleTrigger.mockClear();

		const store = storeChatCommands();
		expect(store.restoreEntry(entry.id)).toBe(true);
		expect(store.entryList).toHaveLength(1);
		expect(store.trash).toHaveLength(0);
		expect(store.generatedTriggers.map((v) => v.type)).toEqual(["7", "41"]);
		expect(mocks.scheduleTrigger).toHaveBeenCalledTimes(1);
	});

	it("refuses to restore a command whose name got reused", async () => {
		const entry = addCommand("!discord");
		await send("!command remove !discord");
		await send("!command add !discord new one");

		const store = storeChatCommands();
		expect(store.restoreEntry(entry.id)).toBe(false);
		expect(store.entryList).toHaveLength(1);
		expect(store.trash).toHaveLength(1);
		expect(mocks.toast).toHaveBeenCalledTimes(1);
	});

	it("refuses to restore an unknown command", () => {
		expect(storeChatCommands().restoreEntry("forged_id")).toBe(false);
		expect(storeChatCommands().entryList).toHaveLength(0);
	});
});

describe("commands list", () => {
	it("splits long lists in multiple messages without cutting names", async () => {
		mocks.isPremium = true;
		const names: string[] = [];
		for (let i = 0; i < 80; i++) {
			const name = "!some_long_command_name_" + i;
			names.push(name);
			addCommand(name);
		}

		await send("!command list", false);

		expect(mocks.sentMessages.length).toBeGreaterThan(1);
		const prefix = "chat_commands.chat.list_prefix ";
		const received: string[] = [];
		for (const m of mocks.sentMessages) {
			expect(m.length).toBeLessThanOrEqual(500);
			expect(m.startsWith(prefix)).toBe(true);
			received.push(...m.substring(prefix.length).split(", "));
		}
		expect(received).toEqual(names);
	});

	it("only lists commands the user can use", async () => {
		addCommand("!public");
		const modOnly = addCommand("!modonly");
		modOnly.command.permissions.all = false;
		addCommand("!disabled").enabled = false;

		await send("!command list", false);
		expect(mocks.sentMessages).toEqual(["chat_commands.chat.list_prefix !public"]);
	});

	it("ignores the legacy list command", async () => {
		addCommand("!public");
		await send("!commands", false);
		expect(mocks.sentMessages).toHaveLength(0);
	});

	it("has a cooldown", async () => {
		addCommand("!public");
		await send("!command list", false);
		await send("!command list", false);
		expect(mocks.sentMessages).toHaveLength(1);
	});
});

describe("hidden triggers", () => {
	it("generates stable trigger IDs", () => {
		const entry = addCommand("!discord");
		const store = storeChatCommands();
		const firstId = store.generatedTriggers[0]!.id;
		entry.message = "changed";
		store.saveData();
		expect(store.generatedTriggers[0]!.id).toBe(firstId);
		expect(mocks.populateExtra).toHaveBeenLastCalledWith(store.generatedTriggers);
	});

	it("only resets a timer when its schedule changes", () => {
		const entry = addCommand("!discord");
		const store = storeChatCommands();
		entry.schedule.enabled = true;
		store.saveData();
		expect(mocks.scheduleTrigger).toHaveBeenCalledTimes(1);

		//Text change: timer keeps its countdown
		entry.message = "changed";
		store.saveData();
		expect(mocks.scheduleTrigger).toHaveBeenCalledTimes(1);
		expect(mocks.replaceScheduledTrigger).toHaveBeenCalledTimes(1);
		expect(mocks.replaceScheduledTrigger.mock.calls[0]![0].actions[0].text).toBe("changed");

		//Interval change: timer is reset
		entry.schedule.repeatDuration = 60;
		store.saveData();
		expect(mocks.scheduleTrigger).toHaveBeenCalledTimes(2);

		//Disabled: timer is removed
		entry.schedule.enabled = false;
		store.saveData();
		expect(mocks.unscheduleTrigger).toHaveBeenCalledTimes(1);
	});

	it("stops timers of removed entries and reschedules them once loaded back", () => {
		const entry = addCommand("!discord");
		const store = storeChatCommands();
		entry.schedule.enabled = true;
		store.saveData();
		const saved = JSON.parse(JSON.stringify(entry));

		store.entryList = [];
		store.saveData();
		expect(mocks.unscheduleTrigger).toHaveBeenCalledTimes(1);
		expect(mocks.populateExtra).toHaveBeenLastCalledWith([]);

		mocks.scheduleTrigger.mockClear();
		store.entryList.push(saved);
		store.saveData();
		expect(mocks.scheduleTrigger).toHaveBeenCalledTimes(1);
	});

	it("generates nothing for disabled or empty entries", () => {
		addCommand("!disabled").enabled = false;
		addCommand("!empty", "  ");
		expect(storeChatCommands().generatedTriggers).toHaveLength(0);
	});
});
