import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { LRUCache } from "lru-cache";
import fetch from "node-fetch";
import BlueskyClientKey from "../utils/BlueskyClientKey.js";
import Logger from "../utils/Logger.js";
import AbstractController from "./AbstractController.js";
import Config from "../utils/Config.js";

interface AuthServerInfos {
	issuer: string;
	endpoints: string[];
}

interface AuthServerMetadata {
	issuer?: string;
	token_endpoint?: string;
	pushed_authorization_request_endpoint?: string;
	revocation_endpoint?: string;
}

/**
 * Serves everything that makes Twitchat a "confidential" AT Protocol OAuth
 * client:
 * - the client metadata document identifying the client,
 * - the public key set authorization servers verify our assertions against,
 * - the endpoint the frontend calls to get an assertion signed.
 *
 * Created : 17/08/2026
 */
export default class BlueskyController extends AbstractController {
	private asInfos_cache = new LRUCache<string, AuthServerInfos>({
		max: 1_000,
		ttl: 60 * 60 * 1000,
	});

	constructor(public server: FastifyInstance) {
		super();
	}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	/******************
	 * PUBLIC METHODS *
	 ******************/
	public async initialize(): Promise<void> {
		this.server.get(
			"/oauth/client-metadata.json",
			async (request: FastifyRequest, response: FastifyReply) =>
				this.getClientMetadata(request, response),
		);

		this.server.get(
			"/oauth/jwks.json",
			async (request: FastifyRequest, response: FastifyReply) =>
				this.getJWKS(request, response),
		);

		this.server.post(
			"/api/bluesky/clientAssertion",
			async (request: FastifyRequest, response: FastifyReply) =>
				this.postClientAssertion(request, response),
		);
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	/**
	 * Serves the Bluesky (AT Protocol) OAuth client metadata.
	 *
	 * The AT Protocol OAuth spec requires the "client_id" to be the exact URL
	 * the metadata document is served from, and the client loads it via
	 * `document.location.origin + "/oauth/client-metadata.json"`. As Twitchat
	 * runs on several domains we can't hardcode it, so the requesting origin is
	 * injected into the document on the fly.
	 */
	private getClientMetadata(request: FastifyRequest, response: FastifyReply): void {
		const origin = this.getOrigin(request);
		if (!origin) {
			response.header("Content-Type", "application/json");
			response.status(404);
			response.send(JSON.stringify({ success: false, error: "Not found" }));
			return;
		}

		const metadata = {
			client_id: origin + "/oauth/client-metadata.json",
			application_type: "web",
			client_name: "Twitchat",
			client_uri: origin,
			logo_uri: origin + "/logo.png",
			tos_uri: origin + "/termsofuse",
			policy_uri: origin + "/privacypolicy",
			dpop_bound_access_tokens: true,
			grant_types: ["authorization_code", "refresh_token"],
			redirect_uris: [origin + "/bluesky/oauth", origin + "/popupBlueskyAuthResult.html"],
			response_types: ["code"],
			scope: "atproto transition:generic transition:chat.bsky",
			//Declaring client authentication is what upgrades us from a "public"
			//client (sessions capped at 2 weeks) to a "confidential" one (2 years).
			//The matching private key never leaves the backend, see
			//BlueskyClientKey.
			token_endpoint_auth_method: "private_key_jwt",
			token_endpoint_auth_signing_alg: "ES256",
			jwks_uri: origin + "/oauth/jwks.json",
		};

		response.header("Content-Type", "application/json");
		response.header("Cache-Control", "public, max-age=300");
		response.status(200);
		response.send(JSON.stringify(metadata));
	}

	/**
	 * Serves the public half of the client key. Authorization servers download
	 * it to verify the assertions signed by createAssertion().
	 */
	private getJWKS(request: FastifyRequest, response: FastifyReply): void {
		if (!this.getOrigin(request)) {
			response.header("Content-Type", "application/json");
			response.status(404);
			response.send(JSON.stringify({ success: false, error: "Not found" }));
			return;
		}

		let jwks: { keys: unknown[] };
		try {
			jwks = BlueskyClientKey.jwks;
		} catch (error) {
			Logger.error("Bluesky JWKS generation failed");
			console.log(error);
			response.header("Content-Type", "application/json");
			response.status(500);
			response.send(JSON.stringify({ success: false, error: "Key unavailable" }));
			return;
		}

		response.header("Content-Type", "application/json");
		response.header("Cache-Control", "public, max-age=300");
		response.status(200);
		response.send(JSON.stringify(jwks));
	}

	/**
	 * Signs a client assertion for the authorization server endpoint the
	 * frontend is about to call.
	 *
	 * Deliberately not behind twitchUserGuard: the OAuth callback runs on the
	 * standalone popupBlueskyAuthResult.html page, which has no Twitch session,
	 * and gating this would also make every Bluesky token refresh depend on a
	 * valid Twitch token.
	 *
	 * That's safe because an assertion grants nothing on its own. It only says
	 * "this is the Twitchat app": authorization codes are only ever delivered to
	 * the redirect URIs declared on our metadata document, and the tokens they
	 * lead to are bound to a DPoP key that never leaves the user's browser.
	 * Restricting the callers to our own origins is what the proposal asks for.
	 */
	private async postClientAssertion(
		request: FastifyRequest,
		response: FastifyReply,
	): Promise<void> {
		response.header("Content-Type", "application/json");
		//Assertions are single use and short lived, they must never be cached
		response.header("Cache-Control", "no-store");

		const origin = this.getCallerOrigin(request);
		if (!origin) {
			response.status(403);
			response.send(
				JSON.stringify({
					success: false,
					errorCode: "INVALID_ORIGIN",
					error: "Not an allowed origin",
				}),
			);
			return;
		}

		const body = request.body as { endpoint?: string } | undefined;
		const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
		const audience = endpoint ? await this.getAudience(endpoint) : null;
		if (!audience) {
			response.status(400);
			response.send(
				JSON.stringify({
					success: false,
					errorCode: "INVALID_ENDPOINT",
					error: "Not an AT Protocol authorization server endpoint",
				}),
			);
			return;
		}

		let assertion: string;
		try {
			assertion = BlueskyClientKey.createAssertion(
				origin + "/oauth/client-metadata.json",
				audience,
			);
		} catch (error) {
			Logger.error("Bluesky client assertion signing failed");
			console.log(error);
			response.status(500);
			response.send(JSON.stringify({ success: false, error: "Signing failed" }));
			return;
		}

		response.status(200);
		response.send(JSON.stringify({ success: true, assertion }));
	}

	/**
	 * Resolves the issuer to use as the assertion's audience for the given
	 * endpoint URL, or null if that URL isn't an endpoint an AT Protocol
	 * authorization server advertises.
	 *
	 * Checking this against the server's own metadata rather than trusting the
	 * caller keeps this endpoint from acting as a blind signing oracle, and
	 * gets the audience exactly right for issuers that aren't a bare origin.
	 */
	private async getAudience(endpoint: string): Promise<string | null> {
		let url: URL;
		try {
			url = new URL(endpoint);
		} catch (_error) {
			return null;
		}
		//Authorization servers are always HTTPS
		if (url.protocol !== "https:") return null;

		let infos = this.asInfos_cache.get(url.origin);
		if (!infos) {
			try {
				const res = await fetch(url.origin + "/.well-known/oauth-authorization-server", {
					headers: { Accept: "application/json" },
				});
				if (!res.ok) return null;
				const json = (await res.json()) as AuthServerMetadata;
				if (typeof json.issuer !== "string") return null;
				infos = {
					issuer: json.issuer,
					endpoints: [
						json.token_endpoint,
						json.pushed_authorization_request_endpoint,
						json.revocation_endpoint,
					].filter((v): v is string => typeof v === "string"),
				};
				this.asInfos_cache.set(url.origin, infos);
			} catch (error) {
				Logger.error("Bluesky authorization server discovery failed => " + url.origin);
				console.log(error);
				return null;
			}
		}

		return infos.endpoints.includes(endpoint) ? infos.issuer : null;
	}

	/**
	 * Returns the origin to build the OAuth documents from, or null if the
	 * request wasn't made to a domain we actually serve.
	 *
	 * Only reflecting known domains keeps a spoofed Host header from injecting
	 * arbitrary domains into the generated documents.
	 */
	private getOrigin(request: FastifyRequest): string | null {
		if (!this.isKnownHostname(request.hostname)) return null;

		//Always HTTPS: every domain we serve is (prod, beta, and the dev tunnel),
		//and the AT Protocol spec requires an HTTPS client_id anyway. Hardcoded
		//rather than read from request.protocol because the hops behind the dev
		//tunnel are plain HTTP.
		return "https://" + request.host;
	}

	/**
	 * Returns the origin of the page that issued the request, or null if it
	 * isn't one of ours.
	 *
	 * Read from the "Origin" header rather than rebuilt from the host: that
	 * header is the page's own origin, which is exactly the client_id the
	 * frontend authenticates with, and unlike the host it isn't rewritten by
	 * the dev server's API proxy. Browsers always send it on POST requests.
	 */
	private getCallerOrigin(request: FastifyRequest): string | null {
		const origin = request.headers.origin;
		if (!origin) return null;

		let url: URL;
		try {
			url = new URL(origin);
		} catch (_error) {
			return null;
		}
		if (!this.isKnownHostname(url.hostname)) return null;
		//The AT Protocol spec only allows HTTPS client IDs
		if (url.protocol !== "https:") return null;

		return url.origin;
	}

	/**
	 * Tells whether the given hostname is the expected one by current env.
	 */
	private isKnownHostname(hostname: string): boolean {
		return hostname === Config.credentials.twitchat_baseURL.replace(/https?:\/\//, "");
	}
}
