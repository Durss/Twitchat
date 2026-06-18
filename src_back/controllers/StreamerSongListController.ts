import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fetch from "node-fetch";
import Config from "../utils/Config.js";
import Logger from "../utils/Logger.js";
import AbstractController from "./AbstractController.js";

/**
 * Handles StreamerSongList (SSL) OAuth2 authentication and API proxying.
 *
 * SSL is a standard OAuth2/OIDC provider (authorization code flow). Because we
 * use a confidential client (a client secret is issued), the code->token
 * exchange and token refresh happen server-side here; the front only ever
 * handles the authorization redirect and the resulting access token.
 *
 * Created : 15/06/2026
 */
export default class StreamerSongListController extends AbstractController {
	/**
	 * OAuth2 / OIDC endpoints (id.streamersonglist.com/oauth2).
	 * Overridable via credentials for staging, defaults to production.
	 */
	private authPath: string = "";
	/**
	 * REST API base (api.streamersonglist.com).
	 * Overridable via credentials for staging, defaults to production.
	 */
	private apiPath: string = "";

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
		this.apiPath = "https://id.staging.streamersonglist.com/";
		this.authPath = this.apiPath + "/oauth2";

		this.server.get(
			"/api/streamersonglist/info",
			async (request, response) => await this.getInfo(request, response),
		);
		this.server.post(
			"/api/streamersonglist/auth",
			async (request, response) => await this.postAuth(request, response),
		);
		this.server.delete(
			"/api/streamersonglist/auth",
			async (request, response) => await this.deleteAuth(request, response),
		);
		this.server.post(
			"/api/streamersonglist/token/refresh",
			async (request, response) => await this.postRefreshToken(request, response),
		);
		this.server.get("/api/streamersonglist/test", async (request, response) => {
			const res = await fetch("https://api.staging.streamersonglist.com/queue", {
				headers: {
					Authorization:
						"Bearer ory_at_eBSUj0hviP-A2HXJU8332fPhBdmvJQqdlvtJfVMzsJY.kWF4ynCuJqIRB6K438hxfNNxz207ftp6Ioo_LFb7nWA",
				},
			});
			console.log(res);
			response
				.header("Content-Type", "application/json")
				.status(500)
				.send(
					JSON.stringify({
						success: true,
						res,
					}),
				);
		});
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/

	/**
	 * Exchanges an authorization code for an access/refresh token.
	 * Called right after the user is redirected back to /oauth/ssl.
	 * @param request
	 * @param response
	 * @returns
	 */
	private async postAuth(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const result = await super.twitchUserGuard(request, response);
		if (result == false) return;

		const body = {
			grant_type: "authorization_code",
			code: (request.body as { code?: string }).code || "",
			client_id: Config.credentials.streamersonglist_client_id,
			client_secret: Config.credentials.streamersonglist_client_secret,
			redirect_uri: Config.credentials.streamersonglist_redirect_uri,
		};

		const token = await this.requestToken(body);
		if (token && token.access_token) {
			console.log(">>>>>>> ", token);
			response
				.header("Content-Type", "application/json")
				.status(200)
				.send(JSON.stringify({ success: true, token }));
		} else {
			Logger.error("[SSL] Authentication failed");
			if (token) console.log(token);
			response
				.header("Content-Type", "application/json")
				.status(500)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "AUTH_FAILED",
						error: token?.error_description || token?.error || "Authentication failed",
					}),
				);
		}
	}

	/**
	 * Refreshes an access token.
	 * SSL rotates refresh tokens: the response contains a brand new refresh
	 * token that must replace the previous one (handled client-side).
	 * @param request
	 * @param response
	 * @returns
	 */
	private async postRefreshToken(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const result = await super.twitchUserGuard(request, response);
		if (result == false) return;

		const body = {
			grant_type: "refresh_token",
			client_id: Config.credentials.streamersonglist_client_id,
			client_secret: Config.credentials.streamersonglist_client_secret,
			refresh_token: (request.body as { refreshToken?: string }).refreshToken || "",
		};

		const token = await this.requestToken(body);
		if (token && token.access_token) {
			response
				.header("Content-Type", "application/json")
				.status(200)
				.send(JSON.stringify({ success: true, token }));
		} else {
			Logger.error("[SSL] Unable to refresh token");
			if (token) console.log(token);
			response
				.header("Content-Type", "application/json")
				.status(500)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "REFRESH_FAILED",
						error: token?.error_description || token?.error || "unknown error",
					}),
				);
		}
	}

	/**
	 * Disconnects the user by revoking their tokens.
	 * @param request
	 * @param response
	 * @returns
	 */
	private async deleteAuth(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const twitchUser = await super.twitchUserGuard(request, response);
		if (twitchUser == false) return;

		const accessToken = (request.query as { token?: string }).token;
		if (accessToken) {
			try {
				await this.revokeToken(accessToken);
			} catch (error) {
				Logger.warn("[SSL] Token revocation failed");
				console.log(error);
			}
		}

		response
			.header("Content-Type", "application/json")
			.status(200)
			.send(JSON.stringify({ success: true }));
	}

	/**
	 * Loads the connected user's info from the OIDC userinfo endpoint.
	 * Used to display who is connected and to confirm the token is valid.
	 * @param request
	 * @param response
	 * @returns
	 */
	private async getInfo(request: FastifyRequest, response: FastifyReply): Promise<void> {
		const twitchUser = await super.twitchUserGuard(request, response);
		if (twitchUser == false) return;

		const accessToken = (request.query as { token?: string }).token;
		if (!accessToken) {
			response
				.header("Content-Type", "application/json")
				.status(401)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "UNAUTHORIZED",
						error: "Invalid or missing access token",
					}),
				);
			return;
		}

		try {
			const url = this.apiPath + "/userinfo";
			console.log(url);
			const userRes = await fetch(url, {
				method: "GET",
				headers: { Authorization: "Bearer " + accessToken },
			});
			if (userRes.status != 200) {
				const text = await userRes.text();
				Logger.error("[SSL] Failed loading user info with status " + userRes.status);
				console.log(text);
				response
					.header("Content-Type", "application/json")
					.status(userRes.status)
					.send(
						JSON.stringify({
							success: false,
							errorCode: "USERINFO_FAILED",
							error: "Failed loading user info",
						}),
					);
				return;
			}
			const user = (await userRes.json()) as SSLUserInfo;

			//TODO load the user's song queue from the REST API
			//(https://api.streamersonglist.com/docs/). Requires resolving the
			//streamer id first, then GET /v1/streamers/{id}/queue. Stubbed for now.

			response
				.header("Content-Type", "application/json")
				.status(200)
				.send(JSON.stringify({ success: true, user, queue: [] }));
		} catch (error) {
			Logger.error("[SSL] Failed loading user info");
			console.log(error);
			response
				.header("Content-Type", "application/json")
				.status(500)
				.send(
					JSON.stringify({
						success: false,
						errorCode: "UNKNOWN",
						error: "Failed loading user info",
					}),
				);
		}
	}

	/******************
	 * UTILITY METHODS *
	 ******************/

	/**
	 * Posts to the OAuth2 token endpoint.
	 * SSL is a standard OIDC provider: the token endpoint expects an
	 * application/x-www-form-urlencoded body with client_secret_post auth.
	 * @param params token request parameters
	 * @returns the parsed token (may contain an "error" field on failure)
	 */
	private async requestToken(params: Record<string, string>): Promise<SSLToken | null> {
		let text = "";
		try {
			const url = this.authPath + "/token";
			console.log("CALL", url);
			console.log(params);
			const res = await fetch(url, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams(params).toString(),
			});
			text = await res.text();
			return JSON.parse(text) as SSLToken;
		} catch (error) {
			Logger.error("[SSL] Token request failed");
			console.log(error);
			console.log(text);
			return null;
		}
	}

	/**
	 * Revokes a token on the OAuth2 revocation endpoint.
	 * @param token access or refresh token to revoke
	 */
	private async revokeToken(token: string): Promise<void> {
		await fetch(this.authPath + "/revoke", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				token,
				client_id: Config.credentials.streamersonglist_client_id,
				client_secret: Config.credentials.streamersonglist_client_secret,
			}).toString(),
		});
	}
}

interface SSLToken {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: string;
	token_type: string;
	id_token?: string;
	error?: string;
	error_description?: string;
}

interface SSLUserInfo {
	sub: string;
	name?: string;
	preferred_username?: string;
	email?: string;
	picture?: string;
	[key: string]: unknown;
}

