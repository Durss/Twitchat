import type { Event } from "@sentry/vue";

const FILTERED = "[Filtered]";
const SECRET_NAMES = "access_token|refresh_token|id_token|token|client_secret|secret|password";
// Secrets in a URL query or hash or as "name=value" text, plus OAuth codes and
// states in URLs
const URL_PARAM = new RegExp(
	`((?:^|[?&#\\s])(?:${SECRET_NAMES})=|[?&#](?:code|state)=)[^&#\\s"']*`,
	"gi",
);
// Secrets in JSON text, ex: a logged API response
const JSON_FIELD = new RegExp(`("(?:${SECRET_NAMES})"\\s*:\\s*")[^"]*"`, "gi");
const AUTH_HEADER = /\b(Bearer|Basic|OAuth)\s+[\w\-.~+/]{16,}=*/g;
const SECRET_KEY = new RegExp(`^(?:${SECRET_NAMES}|authorization)$`, "i");

function cleanupString(value: string): string {
	return value
		.replace(URL_PARAM, `$1${FILTERED}`)
		.replace(JSON_FIELD, `$1${FILTERED}"`)
		.replace(AUTH_HEADER, `$1${FILTERED}`);
}

// Sentry already turned event data into plain, size limited JSON at this point
function cleanupValue(value: unknown): unknown {
	if (typeof value === "string") return cleanupString(value);
	if (Array.isArray(value)) return value.map(cleanupValue);
	if (value && typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, v] of Object.entries(value)) {
			result[key] = SECRET_KEY.test(key) ? FILTERED : cleanupValue(v);
		}
		return result;
	}
	return value;
}

/**
 * Removes tokens and secrets from an event before it's sent to Sentry:
 * page URL, breadcrumbs (fetch URLs, navigations, console output),
 * error messages and extra data.
 */
export function cleanupSentryEvent<T extends Event>(event: T): T {
	if (event.request) event.request = cleanupValue(event.request) as T["request"];
	if (event.breadcrumbs) event.breadcrumbs = cleanupValue(event.breadcrumbs) as T["breadcrumbs"];
	if (event.extra) event.extra = cleanupValue(event.extra) as T["extra"];
	if (event.message) event.message = cleanupString(event.message);
	for (const exception of event.exception?.values ?? []) {
		if (exception.value) exception.value = cleanupString(exception.value);
	}
	return event;
}
