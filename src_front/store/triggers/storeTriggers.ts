import SSEEvent from "@/events/SSEEvent";
import DataStore from "@/store/DataStore";
import {
	COUNTER_VALUE_PLACEHOLDER_PREFIX,
	TriggerTypes,
	VALUE_PLACEHOLDER_PREFIX,
	type SocketParams,
	type TriggerActionTypes,
	type TriggerData,
	type TriggerTreeItemData,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { StoreActions, StoreGetters } from "@/types/pinia-helpers";
import ApiHelper from "@/utils/ApiHelper";
import PublicAPI from "@/utils/PublicAPI";
import SSEHelper from "@/utils/SSEHelper";
import SchedulerHelper from "@/utils/SchedulerHelper";
import SetTimeoutWorker from "@/utils/SetTimeoutWorker";
import TriggerUtils from "@/utils/TriggerUtils";
import Utils from "@/utils/Utils";
import WebsocketTrigger from "@/utils/WebsocketTrigger";
import TriggerActionHandler from "@/utils/triggers/TriggerActionHandler";
import TwitchUtils from "@/utils/twitch/TwitchUtils";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { JsonObject } from "type-fest";
import type { ITriggersActions, ITriggersGetters, ITriggersState } from "../StoreProxy";
import StoreProxy from "../StoreProxy";

let discordCmdUpdateDebounce: number = -1;
let wasDiscordCmds = false;
let enabledStateCache: { [triggerId: string]: boolean } = {};

/**
 * Renames a placeholder on all given triggers.
 *
 * @param triggers			triggers to update
 * @param prefix			placeholder prefix (COUNTER_VALUE_, VALUE_,...)
 * @param oldPlaceholder	placeholder name to replace
 * @param newPlaceholder	placeholder name to replace it with
 * @returns true if at least one trigger has been updated
 */
function renamePlaceholder(
	triggers: TriggerData[],
	prefix: string,
	oldPlaceholder: string,
	newPlaceholder: string,
): boolean {
	if (!oldPlaceholder || !newPlaceholder) return false;

	//Make the searched placeholder regex safe
	const safeOldPlaceholder = (prefix + oldPlaceholder).replace(
		/[-[\]{}()*+?.,\\^$|#\s]/g,
		"\\$&",
	);
	// Rename placeholder while keeping modifiers
	const search = new RegExp("\\{" + safeOldPlaceholder + "(?=[.}])", "gi");
	const replacement = "{" + (prefix + newPlaceholder).toUpperCase();

	const renameOnNode = (node: Record<string, unknown>): boolean => {
		let updated = false;
		for (const key in node) {
			const value = node[key];
			if (typeof value == "string") {
				const renamed = value.replace(search, replacement);
				if (renamed === value) continue;
				node[key] = renamed;
				updated = true;
			} else if (value && typeof value == "object") {
				if (renameOnNode(value as Record<string, unknown>)) updated = true;
			}
		}
		return updated;
	};

	let updated = false;
	for (const trigger of triggers) {
		if (renameOnNode(trigger as unknown as Record<string, unknown>)) updated = true;
	}
	return updated;
}

/**
 * Adds a trigger entry to the given folder of the trigger tree.
 * Searches recursively at any depth.
 *
 * @returns true if the folder has been found
 */
function addTriggerToTreeFolder(
	treeItem: TriggerTreeItemData[],
	folderId: string,
	triggerId: string,
): boolean {
	for (const elem of treeItem) {
		if (elem.type != "folder") continue;
		if (elem.id === folderId) {
			if (!elem.children) elem.children = [];
			elem.children.push({
				id: Utils.getUUID(),
				type: "trigger",
				triggerId,
			});
			return true;
		}
		if (elem.children && addTriggerToTreeFolder(elem.children, folderId, triggerId))
			return true;
	}
	return false;
}

/**
 * Schedules/unschedules "schedule" triggers whose enabled state changed.
 */
function refreshScheduledTriggers(triggers: TriggerData[]): void {
	const knownIds = new Set<string>();
	for (const trigger of triggers) {
		knownIds.add(trigger.id);
		if (trigger.type != TriggerTypes.SCHEDULE) continue;
		const enabled = TriggerUtils.isTriggerEnabled(trigger);
		if (enabledStateCache[trigger.id] == enabled) continue;
		enabledStateCache[trigger.id] = enabled;
		if (enabled) {
			SchedulerHelper.instance.scheduleTrigger(trigger);
		} else {
			SchedulerHelper.instance.unscheduleTrigger(trigger);
		}
	}

	for (const id of Object.keys(enabledStateCache)) {
		if (!knownIds.has(id)) delete enabledStateCache[id];
	}
}

export const storeTriggers = defineStore("triggers", {
	state: (): ITriggersState => ({
		triggerList: [],
		clipboard: [],
		triggerTree: [],
		currentEditTriggerData: null,
		triggerIdToFolderEnabled: {},
	}),

	getters: {
		queues(): string[] {
			const done: { [key: string]: boolean } = {};
			const res = [];
			for (let i = 0; i < this.triggerList.length; i++) {
				const trigger = this.triggerList[i];
				if (!trigger) continue;
				const queue = trigger.queue;
				if (queue && !done[queue] && typeof queue == "string") {
					done[queue] = true;
					res.push(queue);
				}
			}
			return res;
		},
	} satisfies StoreGetters<ITriggersGetters, ITriggersState>,

	actions: {
		populateData() {
			//Init triggers
			const triggers = DataStore.get(DataStore.TRIGGERS);
			if (triggers && triggers != "undefined") {
				//Dunno how some users ended up having "undefined" as JSON T_T...
				Utils.mergeRemoteObject(
					JSON.parse(triggers),
					this.triggerList as unknown as JsonObject,
				);
				// sTriggers.triggerList = JSON.parse(triggers);
				TriggerActionHandler.instance.populate(this.triggerList);
			}

			//Init triggers tree structure
			const triggerTree = DataStore.get(DataStore.TRIGGERS_TREE);
			if (triggerTree) {
				Utils.mergeRemoteObject(
					JSON.parse(triggerTree),
					this.triggerTree as unknown as JsonObject,
				);
				this.computeTriggerTreeEnabledStates();
			}

			// Delete or schedule deletion for triggers with autoDelete_at
			const expiredTriggerIds: string[] = [];
			this.triggerList.forEach((t) => {
				// Check if trigger should be automatically deleted at some point
				if (t.autoDelete_at && t.autoDelete_at > 0) {
					if (t.autoDelete_at < Date.now() + 10000) {
						//Trigger is expired (with 10s margin), flag it for deletion.
						//Deletions are batched, deleteTrigger() rewrites and broadcasts
						//the whole trigger list on every call
						expiredTriggerIds.push(t.id);
					} else if (t.autoDelete_at > Date.now()) {
						// Schedule trigger for deletion at given date
						SetTimeoutWorker.instance.create(() => {
							this.deleteTrigger(t.id);
						}, t.autoDelete_at - Date.now());
					}
				}
			});

			if (expiredTriggerIds.length > 0) {
				const expired = new Set(expiredTriggerIds);
				this.triggerList = this.triggerList.filter((v) => !expired.has(v.id));
				expiredTriggerIds.forEach((id) => StoreProxy.params.unpinTriggerMenuItems(id));
				this.saveTriggers();
			}

			//Init trigger websocket
			const triggerSocketParams = DataStore.get(DataStore.WEBSOCKET_TRIGGER);
			if (triggerSocketParams) {
				const params = JSON.parse(triggerSocketParams) as SocketParams & {
					connectionEnabled?: boolean;
				};

				if (params.connectionEnabled) {
					WebsocketTrigger.instance
						.connect(params.ip, params.port, params.secured)
						.then(() => {})
						.catch(() => {});
				}
			}

			/**
			 * Listen for triggers executed from Discord
			 */
			SSEHelper.instance.addEventListener(SSEEvent.TRIGGER_SLASH_COMMAND, (event) => {
				const data = event.data!;
				//Search for the matching trigger
				const trigger = StoreProxy.triggers.triggerList.find((v) => {
					return (
						v.type == TriggerTypes.SLASH_COMMAND && v.chatCommand == "/" + data.command
					);
				});
				if (!trigger) return;
				let text: string[] = [];
				//Set params in the expected order
				if (trigger.chatCommandParams) {
					trigger.chatCommandParams.forEach((cmdParam) => {
						const param = (data.params || []).find(
							(v) => (v.name || "").toLowerCase() == cmdParam.tag.toLowerCase(),
						);
						// if(param?.value) text.push(param.value);
						if (param?.value) text.push("{" + param.name + "}");
					});
				}
				//Send message to be executed by the triggers
				// MessengerProxy.instance.sendMessage(message.join(" "));

				const placeholders: { [key: string]: string | number } = {};
				const message: TwitchatDataTypes.MessageChatData = {
					id: Utils.getUUID(),
					date: Date.now(),
					channel_id: StoreProxy.auth.twitch.user.id,
					answers: [],
					is_short: false,
					message: text.join(" "),
					message_chunks: [],
					message_html: "",
					message_size: 0,
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
					user: StoreProxy.auth.twitch.user,
				};
				data.params.forEach((p) => {
					placeholders[p.name.toUpperCase()] = TwitchUtils.messageChunksToHTML(
						TwitchUtils.parseMessageToChunks(p.value, undefined, true, "twitch"),
					);
				});
				void TriggerActionHandler.instance.executeTrigger(
					trigger,
					message,
					false,
					undefined,
					undefined,
					placeholders,
				);
			});

			PublicAPI.instance.addEventListener("SET_EXECUTE_TRIGGER", (e) => {
				const trigger = this.triggerList.find((v) => v.id == e.data.id);
				if (trigger) {
					const me = StoreProxy.auth.twitch.user;
					const fakeMessage: TwitchatDataTypes.MessageChatData = {
						platform: "twitch",
						type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
						channel_id: me.id,
						date: Date.now(),
						id: Utils.getUUID(),
						message: "",
						message_chunks: [],
						message_html: "",
						message_size: 0,
						user: me,
						is_short: false,
						answers: [],
					};
					void TriggerActionHandler.instance.executeTrigger(trigger, fakeMessage, false);
				}
			});
			PublicAPI.instance.addEventListener("SET_TRIGGER_STATE", (e) => {
				const id = e.data.id;
				const action = e.data.forcedState;
				const trigger = this.triggerList.find((v) => v.id == id);
				if (trigger) {
					switch (action) {
						case true:
							trigger.enabled = true;
							break;
						case false:
							trigger.enabled = false;
							break;
						default:
							trigger.enabled = !trigger.enabled;
							break;
					}
				}
				this.saveTriggers();
			});
			PublicAPI.instance.addEventListener("GET_TRIGGER_LIST", () =>
				this.broadcastTriggerList(),
			);
		},

		openTriggerEdition(data: TriggerData) {
			this.currentEditTriggerData = data;
			StoreProxy.params.openParamsPage(TwitchatDataTypes.ParameterPages.TRIGGERS);
		},

		openTriggerList() {
			this.currentEditTriggerData = null;
		},

		addTrigger(data: TriggerData, parentId?: string) {
			//If it is a schedule trigger add it to the scheduler
			if (data.type === TriggerTypes.SCHEDULE) {
				SchedulerHelper.instance.scheduleTrigger(data);
			}
			this.triggerList.push(data);

			//Add trigger to requested folder if necessary
			if (parentId) {
				addTriggerToTreeFolder(this.triggerTree, parentId, data.id);
			}
			this.saveTriggers();
		},

		deleteTrigger(id: string) {
			this.triggerList = this.triggerList.filter((v) => v.id != id);
			this.saveTriggers();

			// Unpin from pinned menu items if necessary
			StoreProxy.params.unpinTriggerMenuItems(id);
		},

		duplicateTrigger(id: string, parentId?: string) {
			const trigger = this.triggerList.find((v) => v.id === id);
			if (trigger) {
				const clone: TriggerData = JSON.parse(JSON.stringify(trigger));
				clone.id = Utils.getUUID();
				let name = clone.name || TriggerUtils.getTriggerDisplayInfo(clone).label;
				name += " (CLONE)";
				clone.name = name;
				clone.created_at = Date.now();

				//Add trigger to requested folder if necessary
				if (parentId) {
					addTriggerToTreeFolder(this.triggerTree, parentId, clone.id);
				}
				this.triggerList.push(clone);
				this.saveTriggers();
			}
		},

		saveTriggers(): void {
			//remove incomplete entries
			function cleanEmptyActions(actions: TriggerActionTypes[]): TriggerActionTypes[] {
				return actions.filter((v) => {
					if (v.type == null) return false;
					return true;
				});
				// .filter(v=> {
				// 	if(v.type == null) return false;
				// 	if(v.type == null) return false;
				// 	if(v.type == "obs") return true;//v.sourceName?.length > 0;
				// 	if(v.type == "chat") return true;//v.text?.length > 0;
				// 	if(v.type == "music") return true;
				// 	if(v.type == "tts") return true;
				// 	if(v.type == "raffle") return true;
				// 	if(v.type == "raffle_enter") return true;
				// 	if(v.type == "bingo") return true;
				// 	if(v.type == "voicemod") return true;
				// 	if(v.type == "highlight") return true;
				// 	if(v.type == "trigger") return true;
				// 	if(v.type == "triggerToggle") return true;
				// 	if(v.type == "http") return true;
				// 	if(v.type == "ws") return true;
				// 	if(v.type == "poll") return true;
				// 	if(v.type == "prediction") return true;
				// 	if(v.type == "count") return true;
				// 	if(v.type == "value") return true;
				// 	if(v.type == "random") return true;
				// 	if(v.type == "stream_infos") return true;
				// 	if(v.type == "delay") return true;
				// 	if(v.type == "goxlr") return true;
				// 	if(v.type == "customBadges") return true;
				// 	if(v.type == "customUsername") return true;
				// 	if(v.type == "chatSugg") return true;
				// 	if(v.type == "customChat") return true;
				// 	if(v.type == "vibrate") return true;
				// 	if(v.type == "heat_click") return true;
				// 	console.warn("Trigger action type not whitelisted on store : "+v.type);
				// 	return false;
				// })
			}

			const list = JSON.parse(JSON.stringify(this.triggerList));
			list.forEach((data: TriggerData) => {
				data.actions = cleanEmptyActions(data.actions);
			});

			this.computeTriggerTreeEnabledStates();
			refreshScheduledTriggers(this.triggerList);

			//Create discord commands if requested by some slash commands
			//and discord is linked
			if (StoreProxy.discord.discordLinked) {
				clearTimeout(discordCmdUpdateDebounce);
				discordCmdUpdateDebounce = window.setTimeout(() => {
					const commands: { name: string; params: { name: string }[] }[] = [];
					list.forEach((data: TriggerData) => {
						if (
							data.type == TriggerTypes.SLASH_COMMAND &&
							data.chatCommand &&
							data.addToDiscord === true &&
							TriggerUtils.isTriggerEnabled(data)
						) {
							const params: (typeof commands)[number]["params"] = [];
							if (data.chatCommandParams) {
								data.chatCommandParams.forEach((p) => {
									params.push({ name: p.tag });
								});
							}
							commands.push({
								name: data.chatCommand.replace(/[^a-z0-9]/gi, ""),
								params,
							});
						}
					});
					if (commands.length > 0 || wasDiscordCmds) {
						//Update discord commands
						void ApiHelper.call("discord/commands", "POST", { commands }, false);
					}
					wasDiscordCmds = commands.length > 0;
				}, 6000);
			}

			DataStore.set(DataStore.TRIGGERS, list);
			TriggerActionHandler.instance.populate(list);
			this.broadcastTriggerList();
		},

		renameOBSSource(oldName: string, newName: string): void {
			//Search for any trigger linked to the renamed source or any
			//trigger action controling that source and rename it
			for (const t of this.triggerList) {
				if (t.obsSource === oldName) t.obsSource = newName;
				if (t.obsInput === oldName) t.obsInput = newName;
				for (const a of t.actions) {
					if (a.type == "obs") {
						if (a.sourceName == oldName) a.sourceName = newName;
					}
				}
			}
			this.saveTriggers();
		},

		renameOBSScene(oldName: string, newName: string): void {
			//Search for any trigger linked to the renamed scene and any
			//trigger action controling that scene and rename it
			for (const t of this.triggerList) {
				if (t.obsScene === oldName) t.obsInput = newName;
			}
			this.saveTriggers();
		},

		renameOBSFilter(sourceName: string, oldName: string, newName: string): void {
			//Search for any trigger action controling that filter and rename it
			for (const t of this.triggerList) {
				if (t.obsFilter === oldName) t.obsFilter = newName;
				for (const a of t.actions) {
					if (a.type == "obs" && a.sourceName == sourceName) {
						if (a.filterName == oldName) a.filterName = newName;
					}
				}
			}
			this.saveTriggers();
		},

		renameCounterPlaceholder(oldPlaceholder: string, newPlaceholder: string): void {
			//Search for any trigger linked to the renamed counter and any
			//trigger action updating that counter and rename it
			const updated = renamePlaceholder(
				this.triggerList,
				COUNTER_VALUE_PLACEHOLDER_PREFIX,
				oldPlaceholder,
				newPlaceholder,
			);
			if (updated) this.saveTriggers();
		},

		renameValuePlaceholder(oldPlaceholder: string, newPlaceholder: string): void {
			//Search for any trigger linked to the renamed value and any
			//trigger action updating that value and rename it
			const updated = renamePlaceholder(
				this.triggerList,
				VALUE_PLACEHOLDER_PREFIX,
				oldPlaceholder,
				newPlaceholder,
			);
			if (updated) this.saveTriggers();
		},

		updateTriggerTree(data: TriggerTreeItemData[]): void {
			this.triggerTree = data;
			this.computeTriggerTreeEnabledStates();
			refreshScheduledTriggers(this.triggerList);
			DataStore.set(DataStore.TRIGGERS_TREE, this.triggerTree);
		},

		computeTriggerTreeEnabledStates(): void {
			this.triggerIdToFolderEnabled = {};
			/**
			 * Defines if a a trigger is enabled depending on its parent folder/s
			 * @param root
			 * @param enabled
			 */
			const parseItem = (root: TriggerTreeItemData[], enabled: boolean = true) => {
				root.forEach((v) => {
					if (v.type == "trigger") {
						this.triggerIdToFolderEnabled[v.triggerId!] = enabled;
					} else if (v.type == "folder") {
						parseItem(v.children || [], enabled && v.enabled !== false);
					}
				});
			};

			parseItem(this.triggerTree);
		},

		broadcastTriggerList(): void {
			const triggers = TriggerUtils.getTriggerListPublicData();
			PublicAPI.instance.broadcast("ON_TRIGGER_LIST", {
				triggerList: triggers.map((v) => ({
					id: v.id,
					name: v.name,
					disabled: v.enabled === false,
					iconEmoji: v.iconEmoji,
					iconUrl: v.iconUrl,
				})),
			});
			PublicAPI.instance.broadcastGlobalStates(triggers);
		},
	} satisfies StoreActions<"triggers", ITriggersState, ITriggersGetters, ITriggersActions>,
});

if (import.meta.hot) {
	import.meta.hot.accept(acceptHMRUpdate(storeTriggers, import.meta.hot));
}
