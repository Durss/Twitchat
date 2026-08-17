import DataStore from "@/store/DataStore";
import type { ObjectDirective } from "vue";

/**
 * Params expected by the `v-newflag` directive
 */
export interface NewFlagParams {
	/**
	 * Date (timestamp in ms) at which the item has been flagged as new.
	 * Use 0 to flag it forever until user clicks it.
	 */
	date: number;
	/**
	 * Unique ID of the item flagged as new.
	 * Used to remember the item has been seen after the user clicked it.
	 */
	id: string;
	/**
	 * Duration (in ms) during which the item should be flagged as new.
	 * @default 2592000000 (30 days)
	 */
	duration?: number;
}

/**
 * Value accepted by the `v-newflag` directive.
 * Nullish values simply disable the flag.
 */
export type NewFlagValue = NewFlagParams | null | undefined;

/**
 * Flags an element as "new" until the user clicks on it or until the
 * given duration has elapsed.
 * @example
 * ```html
 * <div v-newflag="{ date: $config.NEW_FLAGS_DATE_V17, id: 'my_item' }">...</div>
 * ```
 */
export const vNewflag: ObjectDirective<HTMLElement, NewFlagValue> = {
	mounted(el, binding) {
		if (binding && binding.value) {
			const { date, id, duration } = binding.value;
			const maxDuration = duration || 30 * 24 * 60 * 60000;
			//Flag as new only for 1 month
			if (Date.now() - date > maxDuration) return;

			//Don't flag is already marked as read
			const flagsDone = JSON.parse(DataStore.get(DataStore.NEW_FLAGS) || "[]") as string[];
			if (flagsDone.includes(id)) return;

			el.classList.add("newFlag");

			el.addEventListener("click", () => {
				const flagsDone = JSON.parse(
					DataStore.get(DataStore.NEW_FLAGS) || "[]",
				) as string[];
				if (!flagsDone.includes(id)) {
					flagsDone.push(id);
					DataStore.set(DataStore.NEW_FLAGS, flagsDone);
				}
				el.classList.remove("newFlag");
			});
		}
	},
};

declare module "vue" {
	interface GlobalDirectives {
		vNewflag: typeof vNewflag;
	}
}
