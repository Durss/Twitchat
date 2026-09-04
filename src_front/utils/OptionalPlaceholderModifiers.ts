/**
 * Optional Placeholder modifiers.
 *
 * PlaceholderModifiers.ts must stay dependency free as much as possible.
 * Here we declare modifiers that require store accesses. For example the
 * ".user()" that applies to Counters and Values which require to read the
 * related stores that are not available on overlayLabels.ts for example
 *
 * Created : 12/08/2026
 */

import StoreProxy from "@/store/StoreProxy";
import {
	COUNTER_VALUE_PLACEHOLDER_PREFIX,
	VALUE_PLACEHOLDER_PREFIX,
} from "@/types/TriggerActionDataTypes";
import type { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import { getUserIdFromLogin } from "./CounterValueUserIndex";
import { registerModifier, type IModifierContext } from "./PlaceholderModifiers";

type CounterOrValueData = TwitchatDataTypes.CounterData | TwitchatDataTypes.ValueData;

/**
 * Register optional modifiers
 */
export function registerOptionalPlaceholderModifiers(): void {
	registerModifier("user", counterValueUserModifier);
	registerModifier("has", counterValueHasModifier);
}

/**
 * Read the value of a Counter or Value for given user (can be a name or ID)
 */
function counterValueUserModifier(
	value: string,
	args: string[],
	context?: IModifierContext,
): string {
	const entry = getEntryFromTag(context?.tag);
	if (!entry) return value;

	// Do not parse if item is disabled and user isn't premium
	if (StoreProxy.auth.isPremium !== true && entry.enabled === false) return "NOT_PREMIUM";

	// For non-per-user entries just return the global value
	if (entry.perUser !== true) return entry.value.toString();

	//No user requested, keep the value the placeholder resolved to, which
	//is the one of the user the trigger is executing for
	const user = (args[0] || "").trim().replace(/^@/, "");
	if (!user) return value;

	const users = entry.users;
	if (!users) return "";

	//User IDs are the actual keys, logins have to go through the index.
	let userEntry = users[user];
	if (!userEntry) {
		const id = getUserIdFromLogin(user);
		if (id) userEntry = users[id];
	}
	return userEntry ? userEntry.value.toString() : "";
}

/**
 * Get if given user is part of a per-user counter or value
 */
function counterValueHasModifier(
	_value: string,
	args: string[],
	context?: IModifierContext,
): "true" | "false" | "NOT_PREMIUM" {
	const entry = getEntryFromTag(context?.tag);
	if (!entry) return "false";

	// Do not parse if item is disabled and user isn't premium
	if (StoreProxy.auth.isPremium !== true && entry.enabled === false) return "NOT_PREMIUM";

	// For non-per-user entries just return false
	if (entry.perUser !== true) return "false";

	const user = (args[0] || "").trim().replace(/^@/, "");
	// No user requested?
	if (!user) return "false";
	const users = entry.users;
	// Entry has no user list yet?
	if (!users) return "false";

	let userEntry = users[user];
	if (!userEntry) {
		const id = getUserIdFromLogin(user);
		if (id) userEntry = users[id];
	}
	return userEntry ? "true" : "false";
}

/**
 * Get a Counter or Value by its tag
 */
function getEntryFromTag(tag?: string): CounterOrValueData | undefined {
	if (!tag) return undefined;
	const tagU = tag.toUpperCase();

	//Counters are tested first, their prefix contains the values' one
	if (tagU.indexOf(COUNTER_VALUE_PLACEHOLDER_PREFIX) === 0) {
		const key = tagU.substring(COUNTER_VALUE_PLACEHOLDER_PREFIX.length);
		return StoreProxy.counters.counterList.find(
			(v) => (v.placeholderKey || "").toUpperCase() === key,
		);
	}

	if (tagU.indexOf(VALUE_PLACEHOLDER_PREFIX) === 0) {
		const key = tagU.substring(VALUE_PLACEHOLDER_PREFIX.length);
		return StoreProxy.values.valueList.find(
			(v) => (v.placeholderKey || "").toUpperCase() === key,
		);
	}

	return undefined;
}
