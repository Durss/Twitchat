import StoreProxy from "@/store/StoreProxy";
import {
	ANY_COUNTER,
	ANY_MELDSTUDIO_SCENE,
	ANY_OBS_SCENE,
	ANY_VALUE,
	TriggerEventPlaceholders,
	TriggerTypeDefinitionFromType,
	type ITriggerPlaceholder,
	type TriggerActionData,
	type TriggerActionTypes,
	type TriggerData,
	type TriggerTreeItemData,
	type TriggerTypeDefinition,
} from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TriggerActionHandler from "./triggers/TriggerActionHandler";
import { TwitchScopes } from "./twitch/TwitchScopes";
import TwitchUtils from "./twitch/TwitchUtils";
import { TriggerTypes } from "@/types/TriggerTypes";

/**
 * Created : 31/05/2024
 */
export default class TriggerUtils {
	constructor() {}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/******************
	 * PUBLIC METHODS *
	 ******************/

	/**
	 * Parses global placeholders only
	 *
	 * @param src
	 * @returns
	 */
	public static async parseGlobalPlaceholders(
		src: string,
		keepHTML: boolean = true,
		message?: TwitchatDataTypes.ChatMessageTypes,
	): Promise<string> {
		let placeholders: ITriggerPlaceholder<any>[] = [];
		if (
			message &&
			(message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE ||
				message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER)
		) {
			placeholders = placeholders.concat(
				TriggerEventPlaceholders(TriggerTypes.ANY_MESSAGE).concat(),
			);
		}
		const trigger: TriggerData = {
			id: "",
			type: TriggerTypes.GLOBAL_PLACEHOLDERS,
			enabled: true,
			actions: [],
		};
		if (!message) {
			message = {
				id: "",
				channel_id: "",
				platform: "twitch",
				date: Date.now(),
				is_short: false,
				message: "",
				message_html: "",
				message_chunks: [],
				message_size: 0,
				answers: [],
				type: TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				user: StoreProxy.auth.twitch.user,
			};
		}
		return await TriggerActionHandler.instance.parsePlaceholders({
			dynamicPlaceholders: {},
			actionPlaceholders: placeholders,
			trigger,
			message,
			src,
			subEvent: null,
			keepHTML,
		});
	}

	/**
	 * Gets info about a trigger
	 * @param trigger
	 */
	public static getTriggerDisplayInfo(trigger: TriggerData) {
		const ref = TriggerTypeDefinitionFromType(trigger.type);
		const result: {
			label: string;
			labelKey?: string;
			descriptionKey?: string;
			disabledReasonKey?: string;
			icon: string;
			iconURL?: string;
			iconBgColor?: string;
			iconEmoji?: string;
			event?: TriggerTypeDefinition;
		} = {
			label: "",
			labelKey: ref?.labelKey,
			descriptionKey: ref?.descriptionKey,
			icon: "alert",
		};
		if (!ref) return result;
		result.event = ref;
		if (ref.icon) result.icon = ref.icon;
		if (trigger.name) result.label = trigger.name;
		if (ref.disabled) result.disabledReasonKey = ref.disabledReasonLabelKey;
		let prefix = "";

		switch (trigger.type) {
			case TriggerTypes.SLASH_COMMAND:
			case TriggerTypes.CHAT_COMMAND: {
				if (!result.label && trigger.chatCommand) result.label = trigger.chatCommand;
				break;
			}

			case TriggerTypes.REWARD_REDEEM: {
				if (TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
					const reward = StoreProxy.rewards.rewardList.find(
						(v) => v.id == trigger.rewardId,
					);
					if (!result.label) {
						if (reward) {
							result.label = reward.title;
						} else {
							result.label = StoreProxy.i18n.t("triggers.missing_reward");
						}
					}
					if (reward && reward.image) {
						result.iconURL = reward.image.url_2x ?? reward.image.url_1x;
						result.iconBgColor = reward.background_color;
					}
				} else if (!result.label) {
					result.label = StoreProxy.i18n.t("triggers.missing_reward_scope");
				}
				break;
			}

			case TriggerTypes.POWER_UP_CUSTOM: {
				if (TwitchUtils.hasScopes([TwitchScopes.READ_CHEER])) {
					const powerUp = StoreProxy.rewards.powerUpList.find(
						(v) => v.id == trigger.powerUpId,
					);
					if (!result.label) {
						if (powerUp) {
							result.label = powerUp.title;
						} else {
							result.label = StoreProxy.i18n.t("triggers.missing_powerup");
						}
					}
					if (powerUp && powerUp.image) {
						result.iconURL = powerUp.image.url_2x ?? powerUp.image.url_1x;
						result.iconBgColor = powerUp.background_color;
					}
				} else if (!result.label) {
					result.label = StoreProxy.i18n.t("triggers.missing_powerup_scope");
				}
				break;
			}

			case TriggerTypes.OBS_SCENE: {
				if (!result.label && trigger.obsScene) result.label = trigger.obsScene;

				if (trigger.obsScene == ANY_OBS_SCENE) {
					result.labelKey = "triggers.obs.anyScene";
					result.descriptionKey = "triggers.events.OBS_SCENE.description_any";
					result.label = trigger.name || StoreProxy.i18n.t(result.labelKey);
				}
				break;
			}

			case TriggerTypes.OBS_SOURCE_ON:
			case TriggerTypes.OBS_SOURCE_OFF: {
				if (!result.label && trigger.obsSource) result.label = trigger.obsSource;
				break;
			}

			case TriggerTypes.OBS_PLAYBACK_STARTED:
			case TriggerTypes.OBS_PLAYBACK_ENDED:
			case TriggerTypes.OBS_PLAYBACK_PAUSED:
			case TriggerTypes.OBS_PLAYBACK_RESTARTED:
			case TriggerTypes.OBS_PLAYBACK_NEXT:
			case TriggerTypes.OBS_PLAYBACK_PREVIOUS:
			case TriggerTypes.OBS_INPUT_MUTE:
			case TriggerTypes.OBS_INPUT_UNMUTE: {
				if (!result.label && trigger.obsInput) result.label = trigger.obsInput;
				break;
			}
			case TriggerTypes.MELDSTUDIO_EFFECT_VISIBILITY_CHANGE: {
				if (!result.label && trigger.meldItem)
					result.label =
						StoreProxy.meldStudio.effectList.find((l) => l.id === trigger.meldItem)
							?.name || result.label;
				break;
			}
			case TriggerTypes.MELDSTUDIO_LAYER_VISIBILITY_CHANGE: {
				if (!result.label && trigger.meldItem)
					result.label =
						StoreProxy.meldStudio.layerList.find((l) => l.id === trigger.meldItem)
							?.name || result.label;
				break;
			}
			case TriggerTypes.MELDSTUDIO_SCENE_CHANGE: {
				if (!result.label && trigger.meldItem)
					result.label =
						StoreProxy.meldStudio.sceneList.find((l) => l.id === trigger.meldItem)
							?.name || result.label;

				if (trigger.meldItem == ANY_MELDSTUDIO_SCENE) {
					result.labelKey = "triggers.meldstudio.anyScene";
					result.descriptionKey =
						"triggers.events.MELDSTUDIO_SCENE_CHANGE.description_any";
					result.label = trigger.name || StoreProxy.i18n.t(result.labelKey);
				}
				break;
			}
			case TriggerTypes.MELDSTUDIO_TRACK_MUTE_CHANGE: {
				if (!result.label && trigger.meldItem)
					result.label =
						StoreProxy.meldStudio.trackList.find((l) => l.id === trigger.meldItem)
							?.name || result.label;
				break;
			}

			case TriggerTypes.COUNTER_EDIT:
				prefix = "🖊";
			case TriggerTypes.COUNTER_ADD:
				prefix = "+";
			case TriggerTypes.COUNTER_DEL:
				if (!prefix) prefix = "-";
			case TriggerTypes.COUNTER_LOOPED:
				if (!prefix) prefix = "⟳";
			case TriggerTypes.COUNTER_MAXED:
				if (!prefix) prefix = "⤒";
			case TriggerTypes.COUNTER_MINED: {
				if (!prefix) prefix = "⤓";
				const counter = StoreProxy.counters.counterList.find(
					(v) => v.id === trigger.counterId,
				);
				if (!result.label && counter) {
					result.label = counter.name ?? "-unnamed counter-";
				} else if (!counter) {
					result.label = StoreProxy.i18n.t("triggers.missing_counter");
				}

				if (trigger.counterId == ANY_COUNTER) {
					result.labelKey = "triggers.count.any_counter";
					result.descriptionKey += "_any";
					result.label = trigger.name || StoreProxy.i18n.t(result.labelKey);
				}

				result.label = "(" + prefix + ") " + result.label;
				break;
			}

			case TriggerTypes.VALUE_UPDATE: {
				if (trigger.valueId == ANY_VALUE) {
					result.labelKey = "triggers.events.VALUE_UPDATE.label_any";
					result.descriptionKey = "triggers.events.VALUE_UPDATE.description_any";
					result.label = trigger.name || StoreProxy.i18n.t(result.labelKey);
				}
				break;
			}
		}

		if (!result.label) result.label = StoreProxy.i18n.t(ref.labelKey);
		if (!result.label) result.label = "-unknown trigger type-";

		if (trigger.icon) {
			if (trigger.icon.startsWith("http")) {
				result.iconURL = trigger.icon;
			} else {
				result.iconEmoji = trigger.icon;
			}
		}

		return result;
	}

	/**
	 * Get all placeholders available for the current trigger action
	 * Loads up all trigger related placeholders, chat command params and looks
	 * for any trigger action declaring a placeholder BEFORE the current action.
	 */
	public static getActionPlaceholderList(
		action: TriggerActionData,
		triggerData: TriggerData,
	): ITriggerPlaceholder<unknown>[] {
		//Get trigger's related placeholders
		const placeholdersList = TriggerEventPlaceholders(triggerData.type).concat();

		//If a placeholder already exists with the same name, replace it.
		//Chat command params and dynamic placeholders have priority over static ones
		const addPlaceholder = (placeholder: ITriggerPlaceholder<any>): void => {
			const existingIndex = placeholdersList.findIndex(
				(u) => u.tag.toLowerCase() == placeholder.tag.toLowerCase(),
			);
			if (existingIndex > -1) placeholdersList.splice(existingIndex, 1);
			placeholdersList.push(placeholder);
		};

		//Add command params
		if (triggerData.chatCommandParams) {
			triggerData.chatCommandParams.forEach((v) => {
				addPlaceholder({
					tag: v.tag,
					pointer: "",
					example: v.tag.toLowerCase(),
					isUserID: false,
					numberParsable: true,
					descKey: "triggers.condition.placeholder_cmd_param",
					descReplacedValues: { NAME: "{" + v.tag.toUpperCase() + "}" },
				});
			});
		}

		//Triggers already crawled, avoids infinite loops on recursive trigger calls
		const crawledTriggerIds = new Set<string>([triggerData.id]);

		//Search for custom placeholders defined on previous actions (eg: random value action)
		for (const a of triggerData.actions) {
			//If it's current action, stop there
			if (a.id == action.id) break;
			//If it's on a different condition, placeholder won't be shared, skip it
			if (
				a.condition !== action.condition &&
				(a.condition !== undefined || action.condition === false) &&
				(a.condition === false || action.condition !== undefined)
			)
				continue;

			for (const placeholder of this.getActionOutputPlaceholders(a, crawledTriggerIds)) {
				addPlaceholder(placeholder);
			}
		}

		return placeholdersList;
	}

	/**
	 * Get the placeholders populated by the given action for the actions after it.
	 *
	 * @param a action to get output placeholders of
	 * @param crawledTriggerIds triggers already crawled. If omitted, the triggers
	 * called by the action aren't crawled and only its own placeholders are returned.
	 */
	public static getActionOutputPlaceholders(
		a: TriggerActionTypes,
		crawledTriggerIds?: Set<string>,
	): ITriggerPlaceholder<any>[] {
		const result: ITriggerPlaceholder<any>[] = [];

		if (a.type == "trigger" || (a.type == "random" && a.mode == "trigger")) {
			if (!crawledTriggerIds) return result;
			const triggerIds = a.type == "trigger" ? [a.triggerId] : a.triggers || [];
			for (const triggerId of triggerIds) {
				if (!triggerId || crawledTriggerIds.has(triggerId)) continue;
				crawledTriggerIds.add(triggerId);
				const subTrigger = StoreProxy.triggers.triggerList.find((t) => t.id == triggerId);
				if (!subTrigger) continue;
				for (const subAction of subTrigger.actions) {
					result.push(...this.getActionOutputPlaceholders(subAction, crawledTriggerIds));
				}
			}
		} else if (a.type == "random") {
			//If custom placeholder isn't defined, ignore it
			if ((a.mode == "number" || a.mode === "list") && a.placeholder) {
				result.push({
					tag: a.placeholder.toUpperCase(),
					pointer: "",
					example: a.placeholder.toLowerCase(),
					isUserID: false,
					numberParsable: true,
					descKey: "triggers.random_placeholder",
					descReplacedValues: { NAME: "{" + a.placeholder.toUpperCase() + "}" },
				});
			}
			if ((a.mode == "counter" || a.mode === "value") && a.valueCounterPlaceholders) {
				const placeholders = [a.valueCounterPlaceholders!.value];
				if (
					a.mode == "counter" ||
					(a.mode == "value" &&
						StoreProxy.values.valueList.find((v) => v.id == a.valueSource)?.perUser ===
							true)
				) {
					placeholders.unshift(
						a.valueCounterPlaceholders!.userId,
						a.valueCounterPlaceholders!.userName,
					);
				}

				for (const ph of placeholders) {
					//Field may have been emptied on the form
					if (!ph) continue;
					result.push({
						tag: ph.toUpperCase(),
						pointer: "",
						example: ph.toLowerCase(),
						isUserID: ph === a.valueCounterPlaceholders!.userId,
						numberParsable: ph === a.valueCounterPlaceholders!.value,
						descKey: "triggers.random_placeholder",
						descReplacedValues: { NAME: "{" + ph.toUpperCase() + "}" },
					});
				}
			}
		} else if (a.type == "groq") {
			if (a.groqData?.outputPlaceholder && a.groqData.outputPlaceholder.trim().length > 0) {
				result.push({
					tag: a.groqData.outputPlaceholder.toUpperCase(),
					pointer: "",
					example: a.groqData.outputPlaceholder.toLowerCase(),
					isUserID: false,
					numberParsable: true,
					descKey: "triggers.http_placeholder",
					descReplacedValues: {
						NAME: "{" + a.groqData.outputPlaceholder.toUpperCase() + "}",
					},
				});
			}
		} else if (a.type == "http") {
			// Handle new simple outputPlaceholder
			if (a.outputPlaceholder && a.outputPlaceholder.trim().length > 0) {
				result.push({
					tag: a.outputPlaceholder.toUpperCase(),
					pointer: "",
					example: a.outputPlaceholder.toLowerCase(),
					isUserID: false,
					numberParsable: true,
					descKey: "triggers.http_placeholder",
					descReplacedValues: { NAME: "{" + a.outputPlaceholder.toUpperCase() + "}" },
				});
			}
		} else if (a.type == "json_extract") {
			for (const ph of a.jsonExtractData?.outputPlaceholderList || []) {
				if (!ph.placeholder || ph.placeholder.length === 0) continue;
				result.push({
					tag: ph.placeholder.toUpperCase(),
					pointer: "",
					example: ph.placeholder.toLowerCase(),
					isUserID: false,
					numberParsable: true,
					descKey: "triggers.json_placeholder",
					descReplacedValues: { NAME: "{" + ph.placeholder.toUpperCase() + "}" },
				});
			}
		} else if (a.type == "prompt") {
			for (const param of a.promptData?.params || []) {
				if (!param.placeholder || param.placeholder.length === 0) continue;
				result.push({
					tag: param.placeholder.toUpperCase(),
					pointer: "",
					example: param.placeholder.toLowerCase(),
					isUserID: false,
					numberParsable: param.type == "number" || param.type == "duration",
					descKey: "triggers.prompt_placeholder",
					descReplacedValues: {
						NAME: "{" + param.placeholder.toUpperCase() + "}",
					},
				});
			}
		} else if (a.type == "raffle") {
			if (a.raffleData.triggerWaitForWinner) {
				result.push({
					tag: "RAFFLE_WINNER_ENTRY",
					pointer: "",
					isUserID: false,
					numberParsable: false,
					descKey: "triggers.raffle_placeholder",
					example: "My raffle entry",
				});
			}
		} else if (a.type == "obs") {
			if (
				a.obsAction == "screenshot" &&
				a.screenshotImgMode == "get" &&
				a.screenshotImgSavePlaceholder
			) {
				result.push({
					tag: a.screenshotImgSavePlaceholder.toUpperCase(),
					pointer: "",
					isUserID: false,
					numberParsable: false,
					descKey: "triggers.screenshot_placeholder",
					example:
						"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAyADIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDx2iiimeYFFFFABRRRQAUUUUAWrWwlvLed4Bvki24j4G7J55J4wBmmLZzsisseQyxsDkdHOF/M02K9ntI5RCkMqyDDRTJuVv8AP9aIdb1OCCOEWVmwjREDMuSQv3c/N2PP1oN4Qpyjq9TX/wCEck+z7/P/AHuzPl7O+Omc/rVS30S9mlQSRGKMsQznHy4z2zk8j9c1A/iLWJAQ9taFCpVoyuQwPr83+c1Guuaiskcg02w8yNdiP5fKr6A7uBSNOSl3/Ekj02+kmeH7MwljVWddw4znGDnB6Hp6UkmnX0NuJ5oNkeWB+b5lIOOR79iM1Xj1fVYwoEEDEJEmWG7IjJIPJ689fyxVmXXdTvYmt7iC3SJupUHPBzxyaCZQppOzKtFFFM5gooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q==",
				});
			}

			if (a.obsAction == "getPersistedData" && a.persistedDataPlaceholder) {
				result.push({
					tag: a.persistedDataPlaceholder.toUpperCase(),
					pointer: "",
					isUserID: false,
					numberParsable: true,
					descKey: "triggers.persistentData_placeholder",
					descReplacedValues: {
						NAME: "{" + a.persistedDataPlaceholder.toUpperCase() + "}",
					},
					example: "Hello world",
				});
			}
		} else if (a.type == "bluesky") {
			if (a.blueskyData?.action == "get_latest_post") {
				if (a.blueskyData.getPostPlaceholderMessage) {
					result.push({
						tag: a.blueskyData.getPostPlaceholderMessage.toUpperCase(),
						pointer: "",
						isUserID: false,
						numberParsable: true,
						descKey: "triggers.actions.bluesky.placeholder_message",
						descReplacedValues: {
							NAME: "{" + a.blueskyData.getPostPlaceholderMessage.toUpperCase() + "}",
						},
						example: "Hello world",
					});
				}
				if (a.blueskyData.getPostPlaceholderURL) {
					result.push({
						tag: a.blueskyData.getPostPlaceholderURL.toUpperCase(),
						pointer: "",
						isUserID: false,
						numberParsable: true,
						descKey: "triggers.actions.bluesky.placeholder_url",
						descReplacedValues: {
							NAME: "{" + a.blueskyData.getPostPlaceholderURL.toUpperCase() + "}",
						},
						example: "https://bsky.app",
					});
				}
			}
		}

		return result;
	}

	/**
	 * Converts given placeholders to a list of entries grouped by category
	 */
	public static getPlaceholderGroupedListValues(
		placeholders: TwitchatDataTypes.PlaceholderEntry[],
	): TwitchatDataTypes.ParameterDataListValue<string>[] {
		return this.groupListValuesByCategory(
			placeholders.map((v) => ({
				label: StoreProxy.i18n.t(v.descKey, v.descReplacedValues || {}),
				secondaryLabel: "{" + v.tag + "}",
				value: v.tag,
				storage: v,
			})),
			(entry) => this.getPlaceholderCategory(entry.storage!),
		);
	}

	/**
	 * Gets the category a placeholder is displayed in
	 */
	public static getPlaceholderCategory(placeholder: TwitchatDataTypes.PlaceholderEntry): string {
		return placeholder.globalTag !== true ? "_trigger_" : placeholder.category || "misc";
	}

	/**
	 * Groups list entries by category
	 *
	 * @param getCategory returns the category of an entry (see getPlaceholderCategory)
	 */
	public static groupListValuesByCategory<StorageType>(
		entries: TwitchatDataTypes.ParameterDataListValue<string, StorageType>[],
		getCategory: (
			entry: TwitchatDataTypes.ParameterDataListValue<string, StorageType>,
		) => string,
	): TwitchatDataTypes.ParameterDataListValue<string, StorageType>[] {
		const categoryToEntries = new Map<
			string,
			TwitchatDataTypes.ParameterDataListValue<string, StorageType>[]
		>();
		for (const entry of entries) {
			const category = getCategory(entry);
			let group = categoryToEntries.get(category);
			if (!group) categoryToEntries.set(category, (group = []));
			group.push(entry);
		}

		const rank = (category: string): number =>
			category == "_trigger_" ? 0 : category == "misc" ? 1 : 2;
		return [...categoryToEntries.entries()]
			.sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
			.map(([category, group]) => ({
				label: StoreProxy.i18n.t("global.placeholder_selector_categories." + category),
				//Only used as a key, a group can't be selected
				value: "__group_" + category,
				group,
			}));
	}

	/**
	 * Gets if a trigger is enabled.
	 * Also checks for folders inheritences
	 * @param trigger
	 * @returns
	 */
	public static isTriggerEnabled(trigger: TriggerData): boolean {
		const parentsEnabled = StoreProxy.triggers.triggerIdToFolderEnabled[trigger.id] !== false;
		return trigger.enabled && parentsEnabled;
	}

	/**
	 * Get a flat list of all folders in the trigger tree, with their path as label
	 * @param root
	 * @returns
	 */
	public static getFlatFolderList(root?: TriggerTreeItemData[]): TriggerTreeItemData[] {
		if (!root) root = StoreProxy.triggers.triggerTree;
		let res: TriggerTreeItemData[] = [];
		for (const entry of root) {
			if (entry.type == "folder") {
				res.push(entry);
			}
			entry.children?.forEach((child) => {
				if (child.type == "folder") {
					res.push(child);
					if (child.children) {
						res.push(...this.getFlatFolderList(child.children));
					}
				}
			});
		}
		return res;
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
}
