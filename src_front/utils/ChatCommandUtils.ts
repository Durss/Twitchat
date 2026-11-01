/**
 * Removes whitespaces from a chat command and prepends a "!" if it starts
 * with an alphanumeric char.
 * Other prefixes ("/", "?", ...) are left untouched.
 *
 * @param command
 * @param maxLength
 */
export function formatChatCommand(command: string, maxLength: number = 100): string {
	let res = command.replace(/\s+/g, "");
	if (/^[\p{L}\p{N}]/u.test(res)) res = "!" + res;
	return res.substring(0, maxLength);
}

/**
 * Removes whitespaces from a slash command and makes sure it starts with a
 * single "/".
 * An empty command stays empty.
 *
 * @param command
 */
export function formatSlashCommand(command: string): string {
	const res = command.replace(/\s+/g, "");
	if (!res) return "";
	return res.replace(/^\/*/, "/");
}
