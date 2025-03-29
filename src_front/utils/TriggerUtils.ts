import StoreProxy from "@/store/StoreProxy";
import { TriggerEventPlaceholders, TriggerTypes, TriggerTypesDefinitionList, type ITriggerPlaceholder, type TriggerData, type TriggerTypeDefinition } from "@/types/TriggerActionDataTypes";
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
	 * Gets the label of a trigger
	 * @param trigger
	 */
	public static getTriggerDisplayInfo(trigger:TriggerData):{label:string, icon:string, iconURL?:string, iconBgColor?:string, event?:TriggerTypeDefinition} {
		const ref = TriggerTypesDefinitionList().find(v => v.value == trigger.type);
		const result:{label:string, icon:string, iconURL?:string, iconBgColor?:string, event?:TriggerTypeDefinition} = {label:"", icon:"alert"}
		if(!ref) return result
		result.event = ref;
		if(ref.icon) result.icon = ref.icon;
		if(trigger.name) result.label = trigger.name;
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
				result.label = "("+prefix+") "+result.label;
				break;
			}
		}

		if(!result.label) result.label = StoreProxy.i18n.t(ref.labelKey);
		if(!result.label) result.label = "-unknown trigger type-";

		return result;
	}



	/*******************
	* PRIVATE METHODS *
	*******************/
}
