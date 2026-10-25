import MessengerProxy from "@/messaging/MessengerProxy";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import { TriggerScheduleTypes, type TriggerData } from "@/types/TriggerActionDataTypes";
import { TriggerTypes } from "@/types/TriggerTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import Config from "@/utils/Config";
import SchedulerHelper from "@/utils/SchedulerHelper";
import { toast } from "@/utils/toast/toast";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import Utils from "@/utils/Utils";
import { acceptHMRUpdate, defineStore } from "pinia";
import { markRaw } from "vue";
import DataStore from "../DataStore";
import type { IChatCommandsActions, IChatCommandsGetters, IChatCommandsState } from "../StoreProxy";
import StoreProxy from "../StoreProxy";

const TRIGGER_ID_PREFIX = "chatcmd_";
const MAX_MESSAGE_LENGTH = 500;
const MAX_TRASH_SIZE = 20;
const LIST_COOLDOWN_MS = 30_000;
/**
 * Command used to add/edit/remove/list commands from chat
 */
export const MANAGE_CMD = "!command";

let listCooldownEnd = 0;

const getDefaultParams = (): TwitchatDataTypes.ChatCommandsParams => {
	return {
		manageEnabled: false,
		managePermissions: Utils.getDefaultPermissions(true, true, false, false, false, false),
	};
};

export const storeChatCommands = defineStore("chatCommands", {
	state: (): IChatCommandsState => ({
		entryList: [],
		trash: [],
		params: getDefaultParams(),
		generatedTriggers: [],
	}),

	getters: {} satisfies StoreGetters<IChatCommandsGetters, IChatCommandsState>,

	actions: {
		populateData(): void {
			const json = DataStore.get(DataStore.CHAT_COMMANDS_CONFIGS);
			if (json) {
				const data = JSON.parse(json) as IStoreData;
				this.entryList = data.entryList || [];
				this.trash = data.trash || [];
				this.params = { ...getDefaultParams(), ...data.params };
			}
			syncTriggers(this);
		},

		createEntry(): TwitchatDataTypes.ChatCommandData {
			return {
				id: Utils.getUUID(),
				enabled: true,
				message: "",
				command: {
					//Enabled as soon as a name is set
					enabled: false,
					name: "",
					aliases: [],
					permissions: Utils.getDefaultPermissions(),
					cooldown: { global: 0, user: 0, alert: true },
					remoteChans: false,
				},
				schedule: {
					enabled: false,
					repeatDuration: 30 * 60,
					repeatMinMessages: 50,
				},
				created_at: Date.now(),
				updated_at: Date.now(),
			};
		},

		addEntry(entry: TwitchatDataTypes.ChatCommandData): boolean {
			if (!canAddEntry(this, entry)) return false;
			this.entryList.push(entry);
			this.saveData();
			return true;
		},

		deleteEntry(id: string, keepForUndo: boolean = false): void {
			const index = this.entryList.findIndex((v) => v.id == id);
			if (index == -1) return;
			const [entry] = this.entryList.splice(index, 1);
			if (keepForUndo && entry) {
				this.trash.unshift(entry);
				if (this.trash.length > MAX_TRASH_SIZE) this.trash.length = MAX_TRASH_SIZE;
			}
			this.saveData();
		},

		restoreEntry(id: string): boolean {
			const index = this.trash.findIndex((v) => v.id == id);
			const entry = this.trash[index];
			if (!entry) {
				toast(StoreProxy.i18n.t("chat_commands.restore_not_found"), { type: "error" });
				return false;
			}
			if (!canAddEntry(this, entry)) {
				toast(
					StoreProxy.i18n.t("chat_commands.restore_limit", {
						MAX: getMaxEntries(),
					}),
					{ type: "error" },
				);
				return false;
			}
			if (entry.command.enabled) {
				const conflict = this.getConflict(
					[entry.command.name, ...entry.command.aliases],
					entry.id,
				);
				if (conflict) {
					toast(StoreProxy.i18n.t("chat_commands.restore_conflict", { CMD: conflict }), {
						type: "error",
					});
					return false;
				}
			}
			this.trash.splice(index, 1);
			this.entryList.push(entry);
			this.saveData();
			return true;
		},

		getConflict(
			commands: string[],
			ignoreEntryId?: string,
			ignoreManageCommands: boolean = false,
		): string | null {
			const done = new Set<string>();
			const toCheck: string[] = [];
			for (const cmd of commands) {
				const lower = cmd.trim().toLowerCase();
				if (!lower) continue;
				//Same command declared multiple times
				if (done.has(lower)) return lower;
				done.add(lower);
				toCheck.push(lower);
			}
			const isTaken = (list: (string | undefined)[]): string | null => {
				for (const cmd of list) {
					const lower = (cmd || "").trim().toLowerCase();
					if (lower && done.has(lower)) return lower;
				}
				return null;
			};

			for (const entry of this.entryList) {
				if (entry.id == ignoreEntryId || !entry.command.enabled) continue;
				const res = isTaken([entry.command.name, ...entry.command.aliases]);
				if (res) return res;
			}

			for (const trigger of StoreProxy.triggers.triggerList) {
				if (trigger.type != TriggerTypes.CHAT_COMMAND) continue;
				const res = isTaken([trigger.chatCommand, ...(trigger.chatCommandAliases || [])]);
				if (res) return res;
			}

			if (this.params.manageEnabled && !ignoreManageCommands) {
				const res = isTaken([MANAGE_CMD]);
				if (res) return res;
			}

			return null;
		},

		async handleChatCommand(
			source: TwitchatDataTypes.TranslatableMessage,
			cmd: string,
		): Promise<void> {
			if (!this.params.manageEnabled) return;
			if (source.type != TwitchatDataTypes.TwitchatMessageType.MESSAGE) return;
			const message = source as TwitchatDataTypes.MessageChatData;
			if (message.platform != "twitch") return;
			if (cmd != MANAGE_CMD) return;

			//Remove invisible chars some chat clients add to bypass duplicate message protection
			const text = (message.message || "").replace(/\u{E0000}|͏/gu, "").trim();
			const chunks = text.match(/^\S+\s+(\S+)(?:\s+(\S+))?(?:\s+([\s\S]*))?$/);
			const action = (chunks?.[1] || "").toLowerCase();

			//Anyone can list commands
			if (action == "list") {
				await sendCommandList(this, message);
				return;
			}

			const allowed = await Utils.checkPermissions(
				this.params.managePermissions,
				message.user,
				message.channel_id,
			);
			if (!allowed) return;

			const name = normalizeCommandName(chunks?.[2] || "");
			const content = (chunks?.[3] || "").trim();
			const login = message.user.login;

			switch (action) {
				case "add": {
					if (!name || !content || name.charAt(0) == "/") {
						return reply(message, "chat_commands.chat.usage", { CMD: MANAGE_CMD });
					}
					if (!isAllowedMessage(content)) {
						return reply(message, "chat_commands.chat.forbidden_slash");
					}
					if (content.length > MAX_MESSAGE_LENGTH) {
						return reply(message, "chat_commands.chat.too_long", {
							MAX: MAX_MESSAGE_LENGTH,
						});
					}
					if (this.getConflict([name])) {
						return reply(message, "chat_commands.chat.conflict", { CMD: name });
					}
					const entry = this.createEntry();
					entry.message = content;
					entry.command.name = name;
					entry.command.enabled = true;
					entry.updatedBy = login;
					if (!this.addEntry(entry)) {
						return reply(message, "chat_commands.chat.limit", { MAX: getMaxEntries() });
					}
					postFeedMessage(message, "add", entry);
					return reply(message, "chat_commands.chat.added", { CMD: name });
				}

				case "edit": {
					if (!name || !content) {
						return reply(message, "chat_commands.chat.usage", { CMD: MANAGE_CMD });
					}
					const entry = findEntryByCommand(this.entryList, name);
					if (!entry) {
						return reply(message, "chat_commands.chat.not_found", { CMD: name });
					}
					if (!isAllowedMessage(content)) {
						return reply(message, "chat_commands.chat.forbidden_slash");
					}
					if (content.length > MAX_MESSAGE_LENGTH) {
						return reply(message, "chat_commands.chat.too_long", {
							MAX: MAX_MESSAGE_LENGTH,
						});
					}
					entry.message = content;
					entry.updated_at = Date.now();
					entry.updatedBy = login;
					this.saveData();
					postFeedMessage(message, "edit", entry);
					return reply(message, "chat_commands.chat.edited", { CMD: entry.command.name });
				}

				case "remove":
				case "delete":
				case "del": {
					if (!name) {
						return reply(message, "chat_commands.chat.usage", { CMD: MANAGE_CMD });
					}
					const entry = findEntryByCommand(this.entryList, name);
					if (!entry) {
						return reply(message, "chat_commands.chat.not_found", { CMD: name });
					}
					entry.updated_at = Date.now();
					entry.updatedBy = login;
					this.deleteEntry(entry.id, true);
					postFeedMessage(message, "remove", entry);
					return reply(message, "chat_commands.chat.removed", {
						CMD: entry.command.name,
					});
				}

				default: {
					return reply(message, "chat_commands.chat.usage", { CMD: MANAGE_CMD });
				}
			}
		},

		saveData(): void {
			const data: IStoreData = {
				entryList: this.entryList,
				trash: this.trash,
				params: this.params,
			};
			DataStore.set(DataStore.CHAT_COMMANDS_CONFIGS, data);
			syncTriggers(this);
		},
	} satisfies StoreActions<
		"chatCommands",
		IChatCommandsState,
		IChatCommandsGetters,
		IChatCommandsActions
	>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeChatCommands, import.meta.hot));
}

interface IStoreData {
	entryList: TwitchatDataTypes.ChatCommandData[];
	trash: TwitchatDataTypes.ChatCommandData[];
	params: TwitchatDataTypes.ChatCommandsParams;
}

function getMaxEntries(): number {
	return StoreProxy.auth.isPremium
		? Config.instance.MAX_CHAT_COMMANDS_PREMIUM
		: Config.instance.MAX_CHAT_COMMANDS;
}

/**
 * Checks if the given entry can be added without exceeding the limits.
 * Only enabled entries count toward the limit, the total amount is capped to
 * the premium limit
 */
function canAddEntry(state: IChatCommandsState, entry: TwitchatDataTypes.ChatCommandData): boolean {
	if (state.entryList.length >= Config.instance.MAX_CHAT_COMMANDS_PREMIUM) return false;
	if (!entry.enabled) return true;
	return state.entryList.filter((v) => v.enabled).length < getMaxEntries();
}

/**
 * Returns the ID of the generated trigger of an entry
 */
export function getCommandTriggerId(entryId: string): string {
	return TRIGGER_ID_PREFIX + entryId + "_cmd";
}

/**
 * Lowercases the command and prepends a "!" if it starts with
 * an alphanumeric char.
 * @param maxLength 100 for commands, 50 for aliases
 */
export function normalizeCommandName(name: string, maxLength: number = 100): string {
	let res = name.trim().replace(/\s+/g, "").toLowerCase();
	if (/^[\p{L}\p{N}]/u.test(res)) res = "!" + res;
	return res.substring(0, maxLength);
}

/**
 * Messages added from chat can't execute "/" commands (except /me and /announce)
 * as they would be executed in broadcaster's name.
 * Ex: "!command add !x /mod {USER}" would allow anyone to become moderator
 */
function isAllowedMessage(message: string): boolean {
	const text = message.trim().toLowerCase();
	if (text.charAt(0) != "/") return true;
	return /^\/(me|announce\w*)(\s|$)/.test(text);
}

function findEntryByCommand(
	list: TwitchatDataTypes.ChatCommandData[],
	name: string,
): TwitchatDataTypes.ChatCommandData | undefined {
	return list.find(
		(v) =>
			v.command.enabled &&
			[v.command.name, ...v.command.aliases].some((c) => c.toLowerCase() == name),
	);
}

async function reply(
	message: TwitchatDataTypes.MessageChatData,
	labelKey: string,
	params: Record<string, string | number> = {},
): Promise<void> {
	const text = StoreProxy.i18n.t(labelKey, { USER: message.user.login, ...params });
	await MessengerProxy.instance.sendMessage(text, [message.platform]);
}

/**
 * Posts a message on the feed to inform the streamer about a change made from chat.
 * A removal can be undone from that message.
 */
function postFeedMessage(
	message: TwitchatDataTypes.MessageChatData,
	action: TwitchatDataTypes.MessageChatCommandUpdateData["action"],
	entry: TwitchatDataTypes.ChatCommandData,
): void {
	const feedMessage: TwitchatDataTypes.MessageChatCommandUpdateData = {
		id: Utils.getUUID(),
		channel_id: StoreProxy.auth.twitch.user.id,
		date: Date.now(),
		platform: "twitchat",
		type: TwitchatDataTypes.TwitchatMessageType.CHAT_COMMAND_UPDATE,
		user: message.user,
		action,
		command: entry.command.name,
		message: entry.message,
		entryId: entry.id,
	};
	void StoreProxy.chat.addMessage(feedMessage);
}

/**
 * Sends the list of commands the user is allowed to use.
 * List is split in multiple messages if too long
 */
async function sendCommandList(
	state: IChatCommandsState,
	message: TwitchatDataTypes.MessageChatData,
): Promise<void> {
	const now = Date.now();
	if (now < listCooldownEnd) return;
	listCooldownEnd = now + LIST_COOLDOWN_MS;

	const names: string[] = [];
	for (const entry of state.entryList) {
		if (!entry.enabled || !entry.command.enabled) continue;
		if (!entry.command.name || !entry.message.trim()) continue;
		const allowed = await Utils.checkPermissions(
			entry.command.permissions,
			message.user,
			message.channel_id,
		);
		if (allowed) names.push(entry.command.name);
	}

	if (names.length == 0) {
		return reply(message, "chat_commands.chat.list_empty");
	}

	const prefix = StoreProxy.i18n.t("chat_commands.chat.list_prefix") + " ";
	const maxLength = MAX_MESSAGE_LENGTH - prefix.length;
	const batches: string[] = [];
	let current = "";
	for (const name of names) {
		const next = current ? current + ", " + name : name;
		if (current && next.length > maxLength) {
			batches.push(current);
			current = name;
		} else {
			current = next;
		}
	}
	if (current) batches.push(current);

	for (const batch of batches) {
		await MessengerProxy.instance.sendMessage(prefix + batch, [message.platform]);
	}
}

/**
 * Builds the hidden triggers of given entry
 */
function buildTriggers(source: TwitchatDataTypes.ChatCommandData): TriggerData[] {
	const res: TriggerData[] = [];
	if (!source.enabled || !source.message.trim()) return res;
	//Break references with the store's data
	const entry = JSON.parse(JSON.stringify(source)) as TwitchatDataTypes.ChatCommandData;

	if (entry.command.enabled && entry.command.name) {
		const id = getCommandTriggerId(entry.id);
		res.push({
			id,
			type: TriggerTypes.CHAT_COMMAND,
			enabled: true,
			name: entry.command.name,
			chatCommand: entry.command.name,
			chatCommandAliases: entry.command.aliases.filter((v) => v.trim().length > 0),
			permissions: entry.command.permissions,
			cooldown: entry.command.cooldown,
			enableForRemoteChans: entry.command.remoteChans,
			actions: [{ id: id + "_chat", type: "chat", text: entry.message, sendAsReply: false }],
		});
	}

	if (entry.schedule.enabled) {
		const id = TRIGGER_ID_PREFIX + entry.id + "_schedule";
		res.push({
			id,
			type: TriggerTypes.SCHEDULE,
			enabled: true,
			name: entry.command.name || entry.message.substring(0, 50),
			scheduleParams: {
				type: TriggerScheduleTypes.REGULAR_REPEAT,
				repeatDuration: entry.schedule.repeatDuration,
				repeatMinMessages: entry.schedule.repeatMinMessages,
				dates: [],
			},
			actions: [{ id: id + "_chat", type: "chat", text: entry.message, sendAsReply: false }],
		});
	}

	return res;
}

/**
 * Rebuilds the hidden triggers, sends them to the triggers handler and
 * (re)schedules the timers.
 * A timer's countdown is only reset if its schedule changes.
 */
function syncTriggers(state: IChatCommandsState): void {
	//Currently scheduled timers
	const previous = new Map<string, { trigger: TriggerData; signature: string }>();
	for (const trigger of state.generatedTriggers) {
		const signature = getScheduleSignature(trigger);
		if (signature) previous.set(trigger.id, { trigger, signature });
	}

	const triggers = state.entryList.flatMap((v) => buildTriggers(v));
	state.generatedTriggers = markRaw(triggers);
	TriggerActionHandler.instance.populateExtra(triggers);

	for (const trigger of triggers) {
		const signature = getScheduleSignature(trigger);
		if (!signature) continue;
		if (previous.get(trigger.id)?.signature === signature) {
			SchedulerHelper.instance.replaceScheduledTrigger(trigger);
		} else {
			SchedulerHelper.instance.scheduleTrigger(trigger);
		}
		previous.delete(trigger.id);
	}

	//Unschedule timers that don't exist anymore
	for (const { trigger } of previous.values()) {
		SchedulerHelper.instance.unscheduleTrigger(trigger);
	}
}

/**
 * Returns a string representing the schedule params of a timer trigger
 * or null if given trigger isn't a timer
 */
function getScheduleSignature(trigger: TriggerData): string | null {
	if (trigger.type != TriggerTypes.SCHEDULE || !trigger.scheduleParams) return null;
	return trigger.scheduleParams.repeatDuration + "_" + trigger.scheduleParams.repeatMinMessages;
}
