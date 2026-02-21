import StoreProxy from "@/store/StoreProxy";
import { ANY_COUNTER, ANY_OBS_SCENE, ANY_VALUE, TriggerEventPlaceholders, TriggerTypes, TriggerTypesDefinitionList, type ITriggerPlaceholder, type TriggerActionData, type TriggerData, type TriggerTypeDefinition } from "@/types/TriggerActionDataTypes";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import TriggerActionHandler from "./triggers/TriggerActionHandler";
import { TwitchScopes } from "./twitch/TwitchScopes";
import TwitchUtils from "./twitch/TwitchUtils";

/**
* Created : 31/05/2024
*/
export default class TriggerUtils {

	constructor() {
	}

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
	public static async parseGlobalPlaceholders(src:string, stripHTMLTags:boolean = true, message?:TwitchatDataTypes.ChatMessageTypes):Promise<string> {
		let placeholders:ITriggerPlaceholder<any>[] = [];
		if(message
		&& (message.type == TwitchatDataTypes.TwitchatMessageType.MESSAGE
		|| message.type == TwitchatDataTypes.TwitchatMessageType.WHISPER)) {
			placeholders = placeholders.concat(TriggerEventPlaceholders(TriggerTypes.ANY_MESSAGE).concat());
		}
		const trigger:TriggerData = {
			id:"",
			type:TriggerTypes.GLOBAL_PLACEHOLDERS,
			enabled:true,
			actions:[],
		};
		if(!message) {
			message = {
				id:"",
				channel_id:"",
				platform:"twitch",
				date:Date.now(),
				is_short:false,
				message:"",
				message_html:"",
				message_chunks:[],
				message_size:0,
				answers:[],
				type:TwitchatDataTypes.TwitchatMessageType.MESSAGE,
				user:StoreProxy.auth.twitch.user,
			};
		}
		return await TriggerActionHandler.instance.parsePlaceholders({}, placeholders, trigger, message, src, null, false, false, stripHTMLTags);
	}

	/**
	 * Gets info about a trigger
	 * @param trigger
	 */
	public static getTriggerDisplayInfo(trigger:TriggerData) {
		const ref = TriggerTypesDefinitionList().find(v => v.value == trigger.type);
		const result:{label:string, labelKey?:string, descriptionKey?:string, disabledReasonKey?:string, icon:string, iconURL?:string, iconBgColor?:string, event?:TriggerTypeDefinition} = {label:"", labelKey:ref?.labelKey, descriptionKey:ref?.descriptionKey, icon:"alert"}
		if(!ref) return result
		result.event = ref;
		if(ref.icon) result.icon = ref.icon;
		if(trigger.name) result.label = trigger.name;
		if(ref.disabled) result.disabledReasonKey = ref.disabledReasonLabelKey;
		let prefix = "";

		switch(trigger.type) {

			case TriggerTypes.SLASH_COMMAND:
			case TriggerTypes.CHAT_COMMAND: {
				if(!result.label && trigger.chatCommand) result.label = trigger.chatCommand;
				break;
			}

			case TriggerTypes.REWARD_REDEEM: {
				if(TwitchUtils.hasScopes([TwitchScopes.LIST_REWARDS])) {
					const reward = StoreProxy.rewards.rewardList.find(v=>v.id == trigger.rewardId);
					if(!result.label) {
						if(reward) {
							result.label = reward.title;
						}else{
							result.label = StoreProxy.i18n.t("triggers.missing_reward");
						}
					}
					if(reward && reward.image) {
						result.iconURL = reward.image.url_2x ?? reward.image.url_1x;
						result.iconBgColor = reward.background_color;
					}
				}else if(!result.label){
					result.label = StoreProxy.i18n.t("triggers.missing_reward_scope");
				}
				break;
			}

			case TriggerTypes.OBS_SCENE: {
				if(!result.label && trigger.obsScene) result.label = trigger.obsScene;

				if(trigger.obsScene == ANY_OBS_SCENE) {
					result.labelKey = "triggers.obs.anyScene";
					result.descriptionKey = "triggers.events.OBS_SCENE.description_any";
					result.label = trigger.name || StoreProxy.i18n.t(result.labelKey);
				}
				break;
			}

			case TriggerTypes.OBS_SOURCE_ON:
			case TriggerTypes.OBS_SOURCE_OFF: {
				if(!result.label && trigger.obsSource) result.label = trigger.obsSource;
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
				if(!result.label && trigger.obsInput) result.label = trigger.obsInput;
				break;
			}

			case TriggerTypes.COUNTER_EDIT: prefix = "🖊";
			case TriggerTypes.COUNTER_ADD: prefix = "+";
			case TriggerTypes.COUNTER_DEL: if(!prefix) prefix = "-";
			case TriggerTypes.COUNTER_LOOPED: if(!prefix) prefix = "⟳";
			case TriggerTypes.COUNTER_MAXED: if(!prefix) prefix = "⤒";
			case TriggerTypes.COUNTER_MINED: {
				if(!prefix) prefix = "⤓";
				const counter = StoreProxy.counters.counterList.find(v=>v.id === trigger.counterId);
				if(!result.label && counter) {
					result.label = counter.name ?? "-unnamed counter-";
				}else if(!counter) {
					result.label = StoreProxy.i18n.t("triggers.missing_counter");
				}

				if(trigger.counterId == ANY_COUNTER) {
					result.labelKey = "triggers.count.any_counter";
					result.descriptionKey += "_any";
					result.label = trigger.name || StoreProxy.i18n.t(result.labelKey);
				}

				result.label = "("+prefix+") "+result.label;
				break;
			}

			case TriggerTypes.VALUE_UPDATE: {
				if(trigger.valueId == ANY_VALUE) {
					result.labelKey = "triggers.events.VALUE_UPDATE.label_any";
					result.descriptionKey = "triggers.events.VALUE_UPDATE.description_any";
					result.label = trigger.name || StoreProxy.i18n.t(result.labelKey);
				}

				result.label = result.label;
				break;
			}
		}

		if(!result.label) result.label = StoreProxy.i18n.t(ref.labelKey);
		if(!result.label) result.label = "-unknown trigger type-";

		return result;
	}

	/**
	 * Get all placeholders available for the current trigger action
	 * Loads up all trigger related placeholders, chat command params and looks
	 * for any Random Value trigger action declaring a placeholder BEFORE the
	 * current action.
	 */
	public static getActionPlaceholderList(action: TriggerActionData, triggerData: TriggerData): ITriggerPlaceholder<unknown>[] {
		//Get trigger's related placeholders
		const placeholdersList = TriggerEventPlaceholders(triggerData.type).concat();

		//Add command params
		if(triggerData.chatCommandParams) {
			triggerData.chatCommandParams.forEach(v=> {
				//If a staitc placeholder already exists with the same name, remove it.
				//Chat command params have priority over them.
				const existingIndex = placeholdersList.findIndex(u=>u.tag.toLowerCase() == v.tag.toLowerCase());
				if(existingIndex > -1) placeholdersList.splice(existingIndex, 1);

				placeholdersList.push({
					tag:v.tag,
					pointer:"",
					isUserID:false,
					numberParsable:true,
					descKey:'triggers.condition.placeholder_cmd_param',
					descReplacedValues:{NAME:"{"+v.tag.toUpperCase()+"}"},
				});
			})
		}

		//Search for custom placeholders defined on previous actions (eg: random value action)
		for (const a of triggerData.actions) {
			//If it's current action, stop there
			if(a.id == action.id) break;
			//If it's on a different condition, placeholder won't be shared, skip it
			if(a.condition !== action.condition
			&& (a.condition !== undefined || action.condition === false)
			&& (a.condition === false || action.condition !== undefined)) continue;
			//If it's anything but an action that exports custom placeholder, skip it
			if(a.type != "random"
			&& a.type != "http"
			&& a.type != "raffle"
			&& a.type != "obs"
			&& a.type != "groq"
			&& a.type != "json_extract") continue;

			if(a.type == "random"){
				//If it's not a list or number random value mode, ignore it (onlye these have a custom placeholder)
				if(a.mode == "trigger") continue;
				//If custom placeholder isn't defined, ignore it
				if((a.mode == "number" || a.mode === "list") && a.placeholder) {
					//If a static placeholder already exists with the same name, remove it.
					//Dynamic placeholder have priority over them.
					const existingIndex = placeholdersList.findIndex(u=>u.tag.toLowerCase() == a.placeholder.toLowerCase());
					if(existingIndex > -1) placeholdersList.splice(existingIndex, 1);

					placeholdersList.push({
										tag:a.placeholder.toUpperCase(),
										pointer:"",
										isUserID:false,
										numberParsable:true,
										descKey:'triggers.random_placeholder',
										descReplacedValues:{NAME:"{"+a.placeholder.toUpperCase()+"}"},
									});
				}
				if((a.mode == "counter" || a.mode === "value") && a.valueCounterPlaceholders) {
					const placeholders = [
						a.valueCounterPlaceholders!.value,
					];
					if(a.mode == "counter"
					|| (a.mode == "value" && StoreProxy.values.valueList.find(v=>v.id == a.valueSource)?.perUser === true) ) {
						placeholders.unshift(
							a.valueCounterPlaceholders!.userId,
							a.valueCounterPlaceholders!.userName
						)
					}

					for (const ph of placeholders) {
						//If a static placeholder already exists with the same name, remove it.
						//Dynamic placeholder have priority over them.
						const existingIndex = placeholdersList.findIndex(u=>u.tag.toLowerCase() == ph.toLowerCase());
						if(existingIndex > -1) placeholdersList.splice(existingIndex, 1);

						placeholdersList.push({
											tag:ph.toUpperCase(),
											pointer:"",
											isUserID:ph === a.valueCounterPlaceholders!.userId,
											numberParsable:ph === a.valueCounterPlaceholders!.value,
											descKey:'triggers.random_placeholder',
											descReplacedValues:{NAME:"{"+ph.toUpperCase()+"}"},
										});
					}
				}
			}else

			if(a.type == "groq") {
				// Handle new simple outputPlaceholder
				if(a.groqData?.outputPlaceholder && a.groqData.outputPlaceholder.trim().length > 0) {
					placeholdersList.push({
						tag:a.groqData.outputPlaceholder.toUpperCase(),
						pointer:"",
						isUserID:false,
						numberParsable:true,
						descKey:'triggers.http_placeholder',
						descReplacedValues:{NAME:"{"+a.groqData.outputPlaceholder.toUpperCase()+"}"},
					});
				}

			}else

			if(a.type == "http") {
				// Handle new simple outputPlaceholder
				if(a.outputPlaceholder && a.outputPlaceholder.trim().length > 0) {
					placeholdersList.push({
						tag:a.outputPlaceholder.toUpperCase(),
						pointer:"",
						isUserID:false,
						numberParsable:true,
						descKey:'triggers.http_placeholder',
						descReplacedValues:{NAME:"{"+a.outputPlaceholder.toUpperCase()+"}"},
					});
				}
			}else

			if(a.type == "json_extract") {
				if(a.jsonExtractData.outputPlaceholderList && a.jsonExtractData.outputPlaceholderList.length > 0) {
					for (const ph of a.jsonExtractData.outputPlaceholderList) {
						if(!ph.placeholder || ph.placeholder.length === 0) continue;
						placeholdersList.push({
							tag:ph.placeholder.toUpperCase(),
							pointer:"",
							isUserID:false,
							numberParsable:true,
							descKey:'triggers.json_placeholder',
							descReplacedValues:{NAME:"{"+ph.placeholder.toUpperCase()+"}"},
						});
					}
				}
			}else

			if(a.type == "raffle") {
				if(a.raffleData.triggerWaitForWinner) {
					placeholdersList.push({
						tag:"RAFFLE_WINNER_ENTRY",
						pointer:"",
						isUserID:false,
						numberParsable:false,
						descKey:'triggers.raffle_placeholder',
						example:"My raffle entry"
					});
				}
			}else

			if(a.type == "obs") {
				if(a.obsAction == "screenshot" && a.screenshotImgMode == "get" && a.screenshotImgSavePlaceholder) {
					placeholdersList.push({
						tag:a.screenshotImgSavePlaceholder.toUpperCase(),
						pointer:"",
						isUserID:false,
						numberParsable:false,
						descKey:'triggers.screenshot_placeholder',
						example:"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAyADIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDx2iiimeYFFFFABRRRQAUUUUAWrWwlvLed4Bvki24j4G7J55J4wBmmLZzsisseQyxsDkdHOF/M02K9ntI5RCkMqyDDRTJuVv8AP9aIdb1OCCOEWVmwjREDMuSQv3c/N2PP1oN4Qpyjq9TX/wCEck+z7/P/AHuzPl7O+Omc/rVS30S9mlQSRGKMsQznHy4z2zk8j9c1A/iLWJAQ9taFCpVoyuQwPr83+c1Guuaiskcg02w8yNdiP5fKr6A7uBSNOSl3/Ekj02+kmeH7MwljVWddw4znGDnB6Hp6UkmnX0NuJ5oNkeWB+b5lIOOR79iM1Xj1fVYwoEEDEJEmWG7IjJIPJ689fyxVmXXdTvYmt7iC3SJupUHPBzxyaCZQppOzKtFFFM5gooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKAP/2Q=="
					});
				}

				if(a.obsAction == "getPersistedData" && a.persistedDataPlaceholder) {
					placeholdersList.push({
						tag:a.persistedDataPlaceholder.toUpperCase(),
						pointer:"",
						isUserID:false,
						numberParsable:true,
						descKey:'triggers.persistentData_placeholder',
						descReplacedValues:{NAME:"{"+a.persistedDataPlaceholder.toUpperCase()+"}"},
						example:"Hello world"
					});
				}
			}
		}

		return placeholdersList;

	}

	/**
	 * Gets if a trigger is enabled.
	 * Also checks for folders inheritences
	 * @param trigger
	 * @returns
	 */
	public static isTriggerEnabled(trigger:TriggerData):boolean {
		const parentsEnabled = StoreProxy.triggers.triggerIdToFolderEnabled[trigger.id] !== false;
		return trigger.enabled && parentsEnabled
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
}
