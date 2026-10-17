import type { TriggerData } from "@/types/TriggerActionDataTypes";
import { TriggerTypes } from "@/types/TriggerTypes";

/**
 * Splits a trigger type from its sub event (command, reward ID, counter ID, ...)
 * on the event keys hashmap
 */
export const TRIGGER_EVENT_KEY_SPLITTER = "_";

/**
 * Gets the keys of the events a trigger reacts to.
 * All the triggers sharing a key are executed by the same event.
 *
 * @param t
 */
export function getTriggerEventKeys(t: TriggerData): string[] {
	const splitter = TRIGGER_EVENT_KEY_SPLITTER;
	let keys: string[] = [t.type];
	switch (t.type) {
		case TriggerTypes.CHAT_COMMAND: {
			keys[0] += splitter + t.chatCommand;
			if (t.chatCommandAliases) {
				for (let i = 0; i < t.chatCommandAliases.length; i++) {
					keys.push(t.type + splitter + t.chatCommandAliases[i]);
				}
			}
			break;
		}

		case TriggerTypes.AD_APPROACHING:
			keys[0] += splitter + (t.adBreakDelay || 0).toString();
			break;

		case TriggerTypes.REWARD_REDEEM:
			keys[0] += splitter + t.rewardId;
			break;

		case TriggerTypes.POWER_UP_CUSTOM:
			keys[0] += splitter + t.powerUpId;
			break;

		case TriggerTypes.OBS_SCENE:
			keys[0] += splitter + t.obsScene;
			break;

		case TriggerTypes.OBS_SOURCE_ON:
		case TriggerTypes.OBS_SOURCE_OFF:
			keys[0] += splitter + t.obsSource;
			break;

		case TriggerTypes.OBS_FILTER_ON:
		case TriggerTypes.OBS_FILTER_OFF:
			keys[0] += splitter + t.obsSource + splitter + t.obsFilter;
			break;

		case TriggerTypes.OBS_PLAYBACK_STARTED:
		case TriggerTypes.OBS_PLAYBACK_ENDED:
		case TriggerTypes.OBS_PLAYBACK_PAUSED:
		case TriggerTypes.OBS_PLAYBACK_RESTARTED:
		case TriggerTypes.OBS_PLAYBACK_NEXT:
		case TriggerTypes.OBS_PLAYBACK_PREVIOUS:
		case TriggerTypes.OBS_INPUT_MUTE:
		case TriggerTypes.OBS_INPUT_UNMUTE:
			keys[0] += splitter + t.obsInput;
			break;

		case TriggerTypes.MELDSTUDIO_TRACK_MUTE_CHANGE:
		case TriggerTypes.MELDSTUDIO_SCENE_CHANGE:
		case TriggerTypes.MELDSTUDIO_LAYER_VISIBILITY_CHANGE:
		case TriggerTypes.MELDSTUDIO_EFFECT_VISIBILITY_CHANGE:
			keys[0] += splitter + t.meldItem;
			break;

		case TriggerTypes.COUNTER_EDIT:
		case TriggerTypes.COUNTER_ADD:
		case TriggerTypes.COUNTER_DEL:
		case TriggerTypes.COUNTER_LOOPED:
		case TriggerTypes.COUNTER_MAXED:
		case TriggerTypes.COUNTER_MINED:
			keys[0] += splitter + t.counterId;
			break;

		case TriggerTypes.VALUE_UPDATE:
			keys[0] += splitter + t.valueId;
			break;

		case TriggerTypes.HEAT_CLICK: {
			if ((!t.heatClickSource || t.heatClickSource == "obs") && t.heatObsSource) {
				keys[0] += splitter + t.heatObsSource;
			} else if (t.heatClickSource == "area" && t.heatAreaIds) {
				keys = [];
				for (let i = 0; i < t.heatAreaIds.length; i++) {
					keys.push(t.type + splitter + t.heatAreaIds[i]);
				}
			}
			break;
		}

		case TriggerTypes.GOXLR_BUTTON_PRESSED:
		case TriggerTypes.GOXLR_BUTTON_RELEASED: {
			if (t.goxlrButtons) {
				keys = [];
				for (let i = 0; i < t.goxlrButtons.length; i++) {
					keys.push(t.type + splitter + t.goxlrButtons[i]);
				}
			}
		}
	}

	return keys.map((v) => v.toLowerCase());
}
