import {
	type ITriggerPlaceholder,
	type TriggerActionData,
	type TriggerData,
} from "@/types/TriggerActionDataTypes";
import TriggerUtils from "@/utils/TriggerUtils";
import { onBeforeMount, ref, watch, type Ref } from "vue";

/**
 * Composable that replaces the AbstractTriggerActionEntry base class.
 * Sets up watchers on trigger actions and chat command params to keep
 * the available placeholder list up-to-date.
 *
 * @param action  - the current trigger action (prop)
 * @param triggerData - the parent trigger data (prop)
 * @param onPlaceholderUpdate - optional callback invoked when the placeholder list changes
 * @returns { placeholderList } - reactive ref to the current placeholder list
 */
export function useTriggerActionPlaceholders(
	action: TriggerActionData,
	triggerData: TriggerData,
	onPlaceholderUpdate?: (list: ITriggerPlaceholder<any>[]) => void,
): { placeholderList: Ref<ITriggerPlaceholder<any>[]> } {
	const placeholderList = ref<ITriggerPlaceholder<any>[]>([]);
	let placeholderIdCache: string[] = [];

	function updatePlaceholderList(): void {
		const list = TriggerUtils.getActionPlaceholderList(action, triggerData);
		const ids: string[] = list.map((v) => v.tag.toLowerCase()).sort();

		if (ids.join(",") !== placeholderIdCache.join(",")) {
			placeholderList.value = list;
			placeholderIdCache = list.map((v) => v.tag.toLowerCase()).sort();
			onPlaceholderUpdate?.(list);
		}
	}

	onBeforeMount(() => {
		let updateDebounce = -1;

		watch(
			() => triggerData.actions,
			() => {
				clearTimeout(updateDebounce);
				updateDebounce = window.setTimeout(() => {
					updatePlaceholderList();
				}, 100);
			},
			{ deep: true },
		);

		watch(
			() => triggerData.chatCommandParams,
			() => updatePlaceholderList(),
			{ deep: true },
		);

		updatePlaceholderList();
	});

	return { placeholderList };
}
