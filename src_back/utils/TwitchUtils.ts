import { LRUCache } from "lru-cache";
import fetch from "node-fetch";
import Config from "./Config.js";
import Logger from "./Logger.js";

/**
 * Created : 08/07/2021
 */
export default class TwitchUtils {
	private static _credentialToken: string | null;
	private static _token_invalidation_date: number;
	/**
	 * How long a token state is cached
	 */
	private static readonly TOKEN_CACHE_TTL = 60 * 1000;
	/**
	 * Gets a user from a cached token
	 */
	private static _tokenToUserCache = new LRUCache<string, TwitchToken>({
		max: 1_000,
		ttl: TwitchUtils.TOKEN_CACHE_TTL,
	});
	/**
	 * Gets a user's moderator from their token
	 */
	private static _moderatorsCache = new LRUCache<string, ModeratorUser[]>({
		max: 1_000,
		ttl: 60 * 60 * 1000,
	});
	/**
	 * Get moderated chans of a user from their token
	 */
	private static _moderatedChansCache = new LRUCache<string, ModeratedUser[]>({
		max: 1_000,
		ttl: 60 * 60 * 1000,
	});
	/**
	 * Get user data from theur login or id
	 */
	private static _uidOrLoginToUser = new LRUCache<string, TwitchUserInfos>({
		max: 10_000,
		ttl: 60 * 60 * 1000,
	});
	/**
	 * Max pages to request
	 */
	private static readonly MAX_PAGINATED_PAGES = 100;

	constructor() {}

	/********************
	 * GETTER / SETTERS *
	 ********************/

	public static get ready(): boolean {
		return this._credentialToken != null && this._credentialToken != undefined;
	}

	/******************
	 * PUBLIC METHODS *
	 ******************/

	/**
	 * Generates a credential token if necessary from the client and private keys
	 * @returns
	 */
	public static async getClientCredentialToken(force: boolean = false): Promise<string> {
		//Invalidate token if expiration date is passed
		if (Date.now() > this._token_invalidation_date || force) this._credentialToken = null;
		//Avoid generating a new token if one already exists
		if (this._credentialToken) return this._credentialToken;

		//Generate a new token
		let headers: any = {};
		var options = {
			method: "POST",
			headers: headers,
		};
		const url = new URL("https://id.twitch.tv/oauth2/token");
		url.searchParams.set("client_id", Config.credentials.twitch_client_id);
		url.searchParams.set("client_secret", Config.credentials.twitch_client_secret);
		url.searchParams.set("grant_type", "client_credentials");
		url.searchParams.set("scope", "");
		let result = await fetch(url, options);
		if (result.status == 200) {
			let json = (await result.json()) as {
				access_token: string;
				expires_in: number;
				token_type: string;
			};
			this._credentialToken = json.access_token;
			this._token_invalidation_date = Date.now() + (json.expires_in * 1000 - 60000);
			return json.access_token;
		} else {
			try {
				let json = await result.json();
				throw json;
			} catch (_error) {
				throw { status: 403, message: "Invalid credentials", code: "INVALID_CREDENTIALS" };
			}
		}
	}

	/**
	 * Validates a token and returns the user data
	 */
	public static async getUserFromToken(
		token?: string,
		skipCache: boolean = false,
	): Promise<TwitchToken | null> {
		if (!token) return null;
		if (skipCache) {
			this._tokenToUserCache.delete(token);
		} else {
			const cached = this._tokenToUserCache.get(token);
			if (cached) return cached;
		}

		//Check access token validity
		const options = {
			method: "GET",
			headers: { Authorization: token },
		};

		let result;
		try {
			result = await fetch("https://id.twitch.tv/oauth2/validate", options);
		} catch (_error) {
			return null;
		}

		if (result.status == 200) {
			const json = (await result.json()) as TwitchToken;

			//Make sure it's a twitchat token
			if (json.client_id !== Config.credentials.twitch_client_id) {
				Logger.warn(`eject ${json.login}'s token issued by client ID ${json.client_id}`);
				return null;
			}

			// Makes sure cache expires after token expires
			const remaining = (json.expires_in || 0) * 1000 - 60000;
			const ttl =
				remaining > 0 ? Math.min(this.TOKEN_CACHE_TTL, remaining) : this.TOKEN_CACHE_TTL;
			this._tokenToUserCache.set(token, json, { ttl });
			return json;
		} else {
			//Token dead, drop cache
			this._tokenToUserCache.delete(token);
			return null;
		}
	}

	/**
	 * Loads 1 or many users by their IDs or logins
	 * @param logins
	 * @param ids
	 * @param failSafe
	 * @returns
	 */
	public static async getUsers(
		logins?: string[],
		ids?: string[],
		failSafe: boolean = true,
	): Promise<TwitchUserInfos[] | false> {
		const keys = logins ?? ids ?? [];
		const allCached = keys
			.map((k) => this._uidOrLoginToUser.get(k))
			.filter((v): v is TwitchUserInfos => !!v);
		if (allCached.length === keys.length && keys.length > 0) {
			return allCached;
		}

		await this.getClientCredentialToken(); //This will refresh the token if necessary

		const url = new URL("https://api.twitch.tv/helix/users");
		if ((logins || []).length > 100 || (ids || []).length > 100) {
			Logger.warn("You cannot load more than 100 profiles at once !");
			throw "You cannot load more than 100 profiles at once !";
		}

		if (ids) {
			ids = ids.filter((v) => v != null && v != undefined);
			ids = ids.map((v) => v.trim());
		}
		if (logins) {
			logins = logins.filter((v) => v != null && v != undefined);
			logins = logins.map((v) => v.trim());
		}

		if (logins) {
			logins.forEach((login) => {
				url.searchParams.append("login", login);
			});
		} else if (ids) {
			ids.forEach((id) => {
				url.searchParams.append("id", id);
			});
		}
		let result = await fetch(url, {
			headers: {
				"Client-ID": Config.credentials.twitch_client_id,
				Authorization: "Bearer " + this._credentialToken,
				"Content-Type": "application/json",
			},
		});
		//Token seem to expire before it's actual EOL date.
		//Make sure here the next request will work.
		if (result.status == 401) {
			await this.getClientCredentialToken(true);
			if (failSafe) {
				return await this.getUsers(logins, ids, false);
			}
		}
		if (result.status == 200) {
			const results = ((await result.json()) as { data: TwitchUserInfos[] }).data;
			results.forEach((user) => {
				this._uidOrLoginToUser.set(user.id, user);
				this._uidOrLoginToUser.set(user.login, user);
			});
			return results;
		}
		return false;
	}

	/**
	 * Get a list of channels the given user token is a moderator on.
	 */
	public static async getModeratedChannels(
		userId: string,
		token: string,
	): Promise<ModeratedUser[]> {
		const cached = this._moderatedChansCache.get(token);
		if (cached) return cached;
		const url = new URL("https://api.twitch.tv/helix/moderation/channels");
		url.searchParams.append("user_id", userId);
		url.searchParams.append("first", "100");

		const { items, complete } = await this.fetchPaginated<ModeratedUser>(url, token);
		if (complete) this._moderatedChansCache.set(token, items);
		return items;
	}

	/**
	 * Get a list of moderators on given channel
	 */
	public static async getModerators(channelId: string, token: string): Promise<ModeratorUser[]> {
		const cached = this._moderatorsCache.get(token);
		if (cached) return cached;
		const url = new URL("https://api.twitch.tv/helix/moderation/moderators");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("first", "100");
		const { items, complete } = await this.fetchPaginated<ModeratorUser>(url, token);
		//Only cache a complete list. Caching a partial one would hide part of the
		//moderators for the whole TTL.
		if (complete) this._moderatorsCache.set(token, items);
		return items;
	}

	/*******************
	 * PRIVATE METHODS *
	 *******************/
	/**
	 * Fetches every page of a paginated helix endpoint.
	 * Returns what could be collected along with whether the list is complete,
	 * so the caller knows whether the result is safe to cache.
	 * @param url endpoint, "first" is expected to be set by the caller
	 * @param token user token
	 */
	private static async fetchPaginated<T>(
		url: URL,
		token: string,
	): Promise<{ items: T[]; complete: boolean }> {
		const items: T[] = [];
		let cursor: string | null = null;
		for (let page = 0; page < this.MAX_PAGINATED_PAGES; page++) {
			if (cursor) url.searchParams.set("after", cursor);
			const res = await fetch(url, {
				method: "GET",
				headers: {
					"Client-ID": Config.credentials.twitch_client_id,
					Authorization: token,
					"Content-Type": "application/json",
				},
			});

			if (res.status != 200) {
				await res.text().catch(() => {});
				Logger.warn(`[TWITCH] ${url.pathname} returned status ${res.status}`);
				return { items, complete: false };
			}

			const json = (await res.json()) as {
				data?: T[];
				pagination?: { cursor?: string };
			};
			if (json.data) items.push(...json.data);

			//An empty cursor means the last page has been reached
			cursor = json.pagination?.cursor || null;
			if (!cursor) return { items, complete: true };
		}

		//Safety net, a cursor that never resolves must not loop forever
		Logger.warn(
			`[TWITCH] ${url.pathname} pagination stopped after ${this.MAX_PAGINATED_PAGES} pages`,
		);
		return { items, complete: false };
	}
}

export interface TwitchToken {
	client_id: string;
	login: string;
	scopes: string[];
	user_id: string;
	expires_in: number;
}

export interface TwitchUserInfos {
	id: string;
	login: string;
	display_name: string;
	type: string;
	broadcaster_type: string;
	description: string;
	profile_image_url: string;
	offline_image_url: string;
	view_count: string;
	created_at: string;
}
export interface TwitchUSteamInfos {
	id: string;
	user_id: string;
	user_login: string;
	user_name: string;
	game_id: string;
	game_name: string;
	type: string;
	title: string;
	viewer_count: number;
	started_at: string;
	language: string;
	thumbnail_url: string;
	tags: string[];
	is_mature: boolean;
}

export interface ModeratedUser {
	broadcaster_id: string;
	broadcaster_login: string;
	broadcaster_name: string;
}
export interface ModeratorUser {
	user_id: string;
	user_login: string;
	user_name: string;
}
