import DataStore from "@/store/DataStore";
import StoreProxy from "@/store/StoreProxy";

/**
 * Get URL for given overlay ID and params
 * @param id
 * @param params
 * @returns
 */
export function overlayURL(id: string, params?: { k: string; v: string }[]): string {
	const port = DataStore.get(DataStore.OBS_PORT);
	const pass = DataStore.get(DataStore.OBS_PASS);
	const ip = DataStore.get(DataStore.OBS_IP);
	const urlParams = new URLSearchParams();
	if (params) {
		for (const p of params) {
			urlParams.append(p.k, p.v);
		}
	}
	if (port) urlParams.append("obs_port", port);
	if (pass) urlParams.append("obs_pass", pass);
	if (ip) urlParams.append("obs_ip", ip);
	let suffix = urlParams.toString();
	if (suffix) suffix = "?" + suffix;
	return (
		document.location.origin +
		StoreProxy.router.resolve({ name: "overlay", params: { id } }).fullPath +
		suffix
	);
}
