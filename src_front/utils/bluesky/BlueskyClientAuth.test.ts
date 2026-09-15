/**
 * Tests for the AT Protocol client authentication.
 *
 * Run with: npm test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientAuthFetch, toLocalClientMetadata } from "./BlueskyClientAuth";

const CLIENT_ID = "https://twitchat.fr/oauth/client-metadata.json";
const TOKEN_ENDPOINT = "https://bsky.social/oauth/token";
const ASSERTION = "signed.client.assertion";

/**
 * Requests the fake fetch received, in order.
 */
let calls: Request[] = [];
/**
 * Response the fake backend returns to an assertion request.
 */
let assertionResponse: { status: number; body: unknown } = {
	status: 200,
	body: { success: true, assertion: ASSERTION },
};

const logs: string[] = [];
const log = (step: string, info?: string) => void logs.push(step + " " + (info ?? ""));

beforeEach(() => {
	calls = [];
	logs.length = 0;
	assertionResponse = {
		status: 200,
		body: { success: true, assertion: ASSERTION },
	};
	vi.stubGlobal("document", { location: { origin: "https://twitchat.fr" } });
	vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
		const request = init == null && input instanceof Request ? input : new Request(input, init);
		calls.push(request);
		if (request.url.endsWith("/api/bluesky/clientAssertion")) {
			return new Response(JSON.stringify(assertionResponse.body), {
				status: assertionResponse.status,
				headers: { "Content-Type": "application/json" },
			});
		}
		return new Response("{}", { status: 200 });
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

/**
 * Builds the kind of request @atproto/oauth-client sends to an authorization
 * server: a form encoded POST carrying our client_id, with the DPoP proof
 * already attached.
 */
function authServerRequest(params: Record<string, string>, url = TOKEN_ENDPOINT): Request {
	return new Request(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			DPoP: "dpop.proof.jwt",
		},
		body: new URLSearchParams(params).toString(),
	});
}

describe("toLocalClientMetadata", () => {
	it("hides the client authentication the lib can't perform locally", () => {
		const local = toLocalClientMetadata({
			client_id: CLIENT_ID,
			redirect_uris: ["https://twitchat.fr/bluesky/oauth"],
			token_endpoint_auth_method: "private_key_jwt",
			token_endpoint_auth_signing_alg: "ES256",
			jwks_uri: "https://twitchat.fr/oauth/jwks.json",
		});

		expect(local.token_endpoint_auth_method).toBe("none");
		//The lib rejects a signing alg on a client that doesn't authenticate
		expect(local.token_endpoint_auth_signing_alg).toBeUndefined();
		//Everything else must stay identical to the served document
		expect(local.client_id).toBe(CLIENT_ID);
		expect(local.jwks_uri).toBe("https://twitchat.fr/oauth/jwks.json");
	});
});

describe("clientAuthFetch", () => {
	it("adds the assertion to an authorization server request", async () => {
		await clientAuthFetch(
			CLIENT_ID,
			log,
		)(
			authServerRequest({
				grant_type: "refresh_token",
				refresh_token: "ref-123",
				client_id: CLIENT_ID,
			}),
		);

		expect(calls).toHaveLength(2);
		//Signed for the exact endpoint being called
		expect(calls[0]!.url).toBe("https://twitchat.fr/api/bluesky/clientAssertion");
		expect(await calls[0]!.clone().json()).toEqual({ endpoint: TOKEN_ENDPOINT });

		const sent = new URLSearchParams(await calls[1]!.text());
		expect(sent.get("client_assertion")).toBe(ASSERTION);
		expect(sent.get("client_assertion_type")).toBe(
			"urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
		);
		//The original body must survive untouched
		expect(sent.get("grant_type")).toBe("refresh_token");
		expect(sent.get("refresh_token")).toBe("ref-123");
		expect(sent.get("client_id")).toBe(CLIENT_ID);
		//As must the DPoP proof, which the lib computed for this exact request
		expect(calls[1]!.headers.get("DPoP")).toBe("dpop.proof.jwt");
		expect(calls[1]!.url).toBe(TOKEN_ENDPOINT);
		expect(calls[1]!.method).toBe("POST");
	});

	it("authenticates the PAR and revocation endpoints too", async () => {
		const endpoint = "https://bsky.social/oauth/revoke";
		await clientAuthFetch(
			CLIENT_ID,
			log,
		)(authServerRequest({ token: "tok", client_id: CLIENT_ID }, endpoint));

		expect(await calls[0]!.clone().json()).toEqual({ endpoint });
		expect(new URLSearchParams(await calls[1]!.text()).get("client_assertion")).toBe(ASSERTION);
	});

	it("leaves the API calls alone", async () => {
		//An XRPC call: same host, but JSON and no client_id
		await clientAuthFetch(
			CLIENT_ID,
			log,
		)(
			new Request("https://bsky.social/xrpc/com.atproto.repo.putRecord", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ repo: "did:plc:abc" }),
			}),
		);
		//A blob upload
		await clientAuthFetch(
			CLIENT_ID,
			log,
		)(
			new Request("https://bsky.social/xrpc/com.atproto.repo.uploadBlob", {
				method: "POST",
				headers: { "Content-Type": "image/jpeg" },
				body: new Uint8Array([1, 2, 3]),
			}),
		);
		//Identity resolution
		await clientAuthFetch(CLIENT_ID, log)("https://bsky.social/.well-known/did.json");

		//No assertion was requested for any of them
		expect(calls.map((c) => c.url)).toEqual([
			"https://bsky.social/xrpc/com.atproto.repo.putRecord",
			"https://bsky.social/xrpc/com.atproto.repo.uploadBlob",
			"https://bsky.social/.well-known/did.json",
		]);
		expect(await calls[0]!.json()).toEqual({ repo: "did:plc:abc" });
	});

	it("leaves a form POST that isn't ours alone", async () => {
		await clientAuthFetch(
			CLIENT_ID,
			log,
		)(authServerRequest({ client_id: "https://someone.else/client-metadata.json" }));

		expect(calls).toHaveLength(1);
		expect(new URLSearchParams(await calls[0]!.text()).has("client_assertion")).toBe(false);
	});

	it("fails the request rather than sending it unauthenticated", async () => {
		assertionResponse = {
			status: 500,
			body: { success: false, error: "Signing failed" },
		};

		await expect(
			clientAuthFetch(
				CLIENT_ID,
				log,
			)(authServerRequest({ grant_type: "refresh_token", client_id: CLIENT_ID })),
		).rejects.toThrow(/client assertion/);

		//Only the assertion request went out, nothing reached Bluesky
		expect(calls).toHaveLength(1);
		expect(logs.some((l) => l.startsWith("auth:assertionFailed"))).toBe(true);
	});

	it("never throws a TypeError, which the lib reads as a dead session", async () => {
		vi.stubGlobal("fetch", async () => {
			throw new TypeError("Failed to fetch");
		});

		const error = await clientAuthFetch(
			CLIENT_ID,
			log,
		)(authServerRequest({ grant_type: "refresh_token", client_id: CLIENT_ID })).catch(
			(e: unknown) => e,
		);

		expect(error).toBeInstanceOf(Error);
		expect(error).not.toBeInstanceOf(TypeError);
	});
});
