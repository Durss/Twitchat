/**
 * Check if given host is the local machine or a machine of the local network.
 * @param host may contain a protocol and a port
 * @returns
 */
export function isLocalNetworkHost(host: string): boolean {
	const h = cleanupHost(host);
	if (!h) return false;
	if (h == "localhost" || h == "127.0.0.1") return true;

	// IP v6 test
	if (h.indexOf(":") > -1) {
		if (h == "::1" || /^(0:){7}1$/.test(h)) return true; // Loopback
		if (/^f[cd]/.test(h)) return true; // Unique local address fc00::/7
		if (/^fe[89ab]/.test(h)) return true; // Link local address fe80::/10
		return false;
	}

	const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
	if (ipv4) {
		const a = parseInt(ipv4[1]!);
		const b = parseInt(ipv4[2]!);
		if (a == 0 || a == 127) return true; // "This host" and loopback
		if (a == 10) return true; // Private class A
		if (a == 172 && b >= 16 && b <= 31) return true; // Private class B
		if (a == 192 && b == 168) return true; // Private class C
		if (a == 169 && b == 254) return true; // Link local
		if (a == 100 && b >= 64 && b <= 127) return true; // Carrier-grade NAT (tailscale & co)
		return false;
	}

	// hostnames with no dot can only be resolved locally
	if (h.indexOf(".") == -1) return true;
	return [".local", ".localhost", ".lan", ".home"].some((tld) => h.endsWith(tld));
}

/**
 * Extracts the host from given uri
 * @param uri
 * @returns
 */
function cleanupHost(uri: string): string {
	const raw = (uri || "").trim();
	if (!raw) return "";
	try {
		return new URL(raw.includes("://") ? raw : "ws://" + raw).hostname.replace(/^\[|]$/g, "");
	} catch (_error) {
		// IP v6 are rejected, fallback test for it here
		const res = raw.toLowerCase();
		return /^[0-9a-f:.]+$/.test(res) ? res : "";
	}
}
