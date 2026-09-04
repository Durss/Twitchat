import type { OAuthClientMetadataInput } from "@atproto/oauth-client-browser";

/**
 * Client authentication for the AT Protocol OAuth client.
 *
 * The spec caps the sessions of "public" clients (clients that can't prove
 * their identity) at 2 weeks, whatever we do. Proving it requires signing a
 * JWT with a private key on every call to an authorization server's
 * token/PAR/revocation endpoint, which buys 2 year sessions instead.
 *
 * That key can't live here, so Twitchat's backend holds it and signs an
 * assertion on demand. The browser keeps everything else: the tokens, the DPoP
 * key they're bound to, and every API call. The backend never sees a user's
 * Bluesky session, and an assertion is useless without the DPoP key that stays
 * in this browser.
 *
 * Kept free of any Twitchat store or config dependency, ApiHelper included:
 * this also runs from popupBlueskyAuthResult.html, a standalone page that would
 * otherwise have to pull in the whole app graph to sign one assertion.
 *
 * @see https://github.com/bluesky-social/proposals/tree/main/0010-client-assertion-backend
 */

const CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

/**
 * Local view of our own client metadata document.
 *
 * The served document declares "private_key_jwt" so authorization servers treat
 * us as confidential, but @atproto/oauth-client-browser refuses to build a
 * client declaring it without a local keyset, and it has no way to accept one
 * (BrowserOAuthClient hardcodes `keyset: undefined`). So the lib gets a copy
 * declaring no client authentication, and the assertion is added to its
 * requests afterwards by clientAuthFetch().
 */
export function toLocalClientMetadata(
	metadata: Readonly<OAuthClientMetadataInput>,
): OAuthClientMetadataInput {
	const local = { ...metadata, token_endpoint_auth_method: "none" as const };
	//The lib rejects a signing alg on a client that doesn't authenticate
	delete local.token_endpoint_auth_signing_alg;
	return local;
}

/**
 * Builds the fetch the OAuth client will use, adding a client assertion to the
 * requests that authenticate Twitchat.
 *
 * Everything else (XRPC calls, blob uploads, identity resolution) goes through
 * untouched: only the authorization server endpoints are form encoded POSTs
 * carrying our client_id.
 */
export function clientAuthFetch(
	clientId: string,
	log: (step: string, info?: string) => void,
): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
	return async (input, init) => {
		const method = (
			init?.method ?? (input instanceof Request ? input.method : "GET")
		).toUpperCase();
		const headers = new Headers(
			init?.headers ?? (input instanceof Request ? input.headers : undefined),
		);
		if (method !== "POST" || !isFormEncoded(headers.get("content-type"))) {
			return fetch(input, init);
		}

		//Reading the body consumes the request, it has to be rebuilt in every
		//branch below. Passing an explicit body is what makes that legal.
		const request = init == null && input instanceof Request ? input : new Request(input, init);
		const body = await request.text();
		const params = new URLSearchParams(body);
		if (params.get("client_id") !== clientId || params.has("client_assertion")) {
			// oxlint-disable-next-line unicorn/no-invalid-fetch-options
			return fetch(new Request(request, { body }));
		}

		//No fallback to an unauthenticated request here: the authorization
		//server would reject it with a much less obvious error. Throwing a
		//plain Error (never a TypeError, which the lib treats as a dead
		//session) leaves the session alone, to be retried on the next call.
		const assertion = await requestAssertion(request.url, log);

		params.set("client_assertion_type", CLIENT_ASSERTION_TYPE);
		params.set("client_assertion", assertion);
		//The DPoP proof already set on the request covers the method and URL
		//only, so replacing the body doesn't invalidate it
		// oxlint-disable-next-line unicorn/no-invalid-fetch-options
		return fetch(new Request(request, { body: params.toString() }));
	};
}

/**
 * Asks the backend to sign an assertion for the given authorization server
 * endpoint.
 */
async function requestAssertion(
	endpoint: string,
	log: (step: string, info?: string) => void,
): Promise<string> {
	let status = 0;
	let json: { success?: boolean; assertion?: string; error?: string } = {};
	try {
		const res = await fetch(document.location.origin + "/api/bluesky/clientAssertion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ endpoint }),
		});
		status = res.status;
		json = await res.json();
	} catch (error) {
		//Network failures land here as a TypeError, which must not escape
		log("auth:assertionFailed", "network error " + (error as Error)?.message);
	}

	if (status !== 200 || !json.assertion) {
		//Worth its own log entry: this is the only failure mode that comes from
		//Twitchat rather than from Bluesky
		log("auth:assertionFailed", "status=" + status + " error=" + (json.error || "none"));
		//Deliberately a plain Error: the lib reads a TypeError as a dead session
		//and deletes it, where this one only fails the request at hand
		throw new Error("Twitchat couldn't sign the Bluesky client assertion (" + status + ")");
	}
	return json.assertion;
}

function isFormEncoded(contentType: string | null): boolean {
	return contentType?.split(";")[0]!.trim() === "application/x-www-form-urlencoded";
}
