/**
 * Created : 13/10/2026
 *
 * Reloads the overlay if received major version is higher than local one
 */
export default class OverlayVersionChecker {
	private static readonly STORAGE_KEY = "twitchat_overlay_version_reload";
	private static readonly RELOAD_COOLDOWN = 10 * 60 * 1000;

	/**
	 * Call this with the ON_TWITCHAT_READY event's data
	 * @param data
	 */
	public static check(data: unknown): void {
		const appVersion = (data as { appVersion?: unknown } | undefined)?.appVersion;
		if (typeof appVersion != "string") return;

		const appMajor = parseInt(appVersion.split(".")[0]!);
		const ownMajor = parseInt(String(import.meta.env.PACKAGE_VERSION).split(".")[0]!);
		if (isNaN(appMajor) || isNaN(ownMajor)) return;

		// ignore if for some reason overlay version is higher than app's
		if (appMajor <= ownMajor) return;

		//Loop guard: if we already reloaded for this version recently but still
		//run the old one (cached bundle, DNS cache, ...), don't reload again
		try {
			const last = JSON.parse(sessionStorage.getItem(this.STORAGE_KEY) || "null") as {
				major: number;
				date: number;
			} | null;
			if (last && last.major == appMajor && Date.now() - last.date < this.RELOAD_COOLDOWN) {
				return;
			}
			sessionStorage.setItem(
				this.STORAGE_KEY,
				JSON.stringify({ major: appMajor, date: Date.now() }),
			);
		} catch (_error) {
			//No sessionStorage to guard against reload loops, better not reload
			return;
		}

		console.log(
			"[OVERLAY] App runs v" +
				appVersion +
				", reloading overlay to update from v" +
				import.meta.env.PACKAGE_VERSION,
		);
		document.location.reload();
	}
}
