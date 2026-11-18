/**
 * Login => user ID index of the per-user counter and value entries.
 *
 * Counters and values key their per-user entries by user ID and only keep
 * the login as a sub prop.
 * To resolve an entry from the login we need another index which is what
 * this is.
 *
 * Created : 12/08/2026
 */

const loginToId: { [login: string]: string } = {};

/**
 * Indexes a single entry.
 */
export function indexUserLogin(login: string | undefined, id: string): void {
	if (!login || !id) return;
	loginToId[login.toLowerCase()] = id;
}

/**
 * Indexes all the entries of a Counter or Value
 */
export function indexUserLogins(
	users: { [userId: string]: { login?: string } | undefined } | undefined,
): void {
	if (!users) return;
	for (const id in users) indexUserLogin(users[id]?.login, id);
}

/**
 * Get the ID of an entry from its login
 */
export function getUserIdFromLogin(login: string): string | undefined {
	return loginToId[login.toLowerCase()];
}
