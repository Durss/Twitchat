import PublicAPI from "../PublicAPI";

/**
 * Check if highlight overlay exists
 * @returns
 */
export function getHighlightOverPresence(): Promise<boolean> {
	return new Promise((resolve, _reject) => {
		const timeout = window.setTimeout(() => {
			resolve(false);
			PublicAPI.instance.removeEventListener("SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE", handler);
		}, 1000);
		let handler = () => {
			clearTimeout(timeout);
			resolve(true);
			PublicAPI.instance.removeEventListener("SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE", handler);
		};
		PublicAPI.instance.addEventListener("SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE", handler);
		PublicAPI.instance.broadcast("GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE");
	});
}
