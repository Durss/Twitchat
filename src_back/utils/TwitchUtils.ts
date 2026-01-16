import fetch from "node-fetch";
import Config from "./Config.js";
import Logger from "./Logger.js";

/**
* Created : 08/07/2021 
*/
export default class TwitchUtils {

	private static _credentialToken:string|null;
	private static _token_invalidation_date:number;
	private static _tokenToUserCache:{[token:string]:TwitchToken} = {};
	private static _moderatorsCache:{[token:string]:ModeratorUser[]} = {};
	private static _moderatedChansCache:{[token:string]:ModeratedUser[]} = {};
	private static _uidToUser:{[uidOrLogin:string]:TwitchUserInfos} = {};
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/

	public static get ready():boolean {
		return this._credentialToken != null && this._credentialToken != undefined;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/

	/**
	 * Generates a credential token if necessary from the client and private keys
	 * @returns 
	 */
	public static async getClientCredentialToken(force:boolean = false):Promise<string> {
		//Invalidate token if expiration date is passed
		if(Date.now() > this._token_invalidation_date || force) this._credentialToken = null;
		//Avoid generating a new token if one already exists
		if(this._credentialToken) return this._credentialToken;

		//Generate a new token
		let headers:any = {
		};
		var options = {
			method: "POST",
			headers: headers,
		};
		const url = new URL("https://id.twitch.tv/oauth2/token");
		url.searchParams.set("client_id", Config.credentials.twitch_client_id);
		url.searchParams.set("client_secret", Config.credentials.twitch_client_secret);
		url.searchParams.set("grant_type", "client_credentials");
		url.searchParams.set("scope", "");
		let result = await fetch(url, options)
		if(result.status == 200) {
			let json = await result.json() as {access_token:string, expires_in:number, token_type:string};
			this._credentialToken = json.access_token;
			this._token_invalidation_date = Date.now() + (json.expires_in - 60000);
			return json.access_token;
		}else{
			try {
				let json = await result.json();
				throw(json);
			}catch(error){
				throw({status:403, message:"Invalid credentials", code:"INVALID_CREDENTIALS"});
			}
		}
	}

	/**
	 * Validates a token and returns the user data
	 */
	public static async getUserFromToken(token?:string):Promise<TwitchToken|null> {
		if(!token) return null;
		if(this._tokenToUserCache[token]) return this._tokenToUserCache[token];

		//Check access token validity
		const options = {
			method: "GET",
			headers: { "Authorization": token },
		};
	
		let result;
		try {
			result = await fetch("https://id.twitch.tv/oauth2/validate", options);
		}catch(error) {
			return null;
		}

		
		if(result.status == 200) {
			const json = await result.json() as TwitchToken;
			this._tokenToUserCache[token] = json;
			//Keep result in cache for 10min
			setTimeout(()=> {
				delete this._tokenToUserCache[token];
			}, 10 * 60 * 1000);
			return json;
		}else{
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
	public static async getUsers(logins?:string[], ids?:string[], failSafe:boolean = true):Promise<TwitchUserInfos[]|false> {
		this._uidToUser = {};
		const allCached = (logins ? logins : ids)?.map(idOrLogin => this._uidToUser[idOrLogin]).filter(v => !!v);
		if(allCached.length > 0) {
			return allCached;
		}

		await this.getClientCredentialToken();//This will refresh the token if necessary

		const url = new URL("https://api.twitch.tv/helix/users");
		if((logins || []).length > 100 || (ids || []).length > 100) {
			Logger.warn("You cannot load more than 100 profiles at once !");
			throw("You cannot load more than 100 profiles at once !");
		}

		if(ids) {
			ids = ids.filter(v => v != null && v != undefined);
			ids = ids.map(v => v.trim());
		}
		if(logins) {
			logins = logins.filter(v => v != null && v != undefined);
			logins = logins.map(v => v.trim());
		}
		
		if(logins) {
			logins.forEach(login => {
				url.searchParams.append("login", login);
			})
		}else 
		if(ids) {
			ids.forEach(id => {
				url.searchParams.append("id", id);
			})
		}
		let result = await fetch(url, {
			headers:{
				"Client-ID": Config.credentials.twitch_client_id,
				"Authorization": "Bearer "+this._credentialToken,
				"Content-Type": "application/json",
			}
		});
		//Token seem to expire before it's actual EOL date.
		//Make sure here the next request will work.
		if(result.status == 401) {
			this.getClientCredentialToken(true);
			if(failSafe) {
				return await this.getUsers(logins, ids, false);
			}
		}
		if(result.status == 200) {
			const results = (await result.json() as {data: TwitchUserInfos[]}).data;
			results.forEach(user => {
				this._uidToUser[user.id] = user;
				this._uidToUser[user.login] = user;
			});
			return results;
		}
		return false;
	}

	/**
	 * Get a list of channels the given user token is a moderator on.
	 */
	public static async getModeratedChannels(userId:string, token:string): Promise<ModeratedUser[]> {
		if(this._moderatedChansCache[token]) {
			return this._moderatedChansCache[token];
		}
		const url = new URL("https://api.twitch.tv/helix/moderation/channels");
		url.searchParams.append("user_id", userId);
		url.searchParams.append("first", "100");

		let list: ModeratedUser[] = [];
		let cursor: string | null = null;
		do {
			if (cursor) url.searchParams.set("after", cursor);
			const res = await fetch(url, {
				method: "GET",
				headers:{
					"Client-ID": Config.credentials.twitch_client_id,
					"Authorization": token,
					"Content-Type": "application/json",
				}
			});
			if (res.status == 200) {
				const json = await res.json() as { data: ModeratedUser[], pagination?: { cursor?: string } };
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else if (res.status == 500) break;
		} while (cursor != null);

		this._moderatedChansCache[token] = list;
		//Cleanup cache after a few minutes
		setTimeout(()=>{
			delete this._moderatedChansCache[token];
		}, 60 * 60 * 1000);
		return list;
	}

	/**
	 * Get a list of moderators on given channel
	 */
	public static async getModerators(channelId:string, token:string): Promise<ModeratorUser[]> {
		if(this._moderatorsCache[token]) {
			return this._moderatorsCache[token];
		}
		const url = new URL("https://api.twitch.tv/helix/moderation/moderators");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("first", "100");
		let list: ModeratorUser[] = [];
		let cursor: string | null = null;
		do {
			if (cursor) url.searchParams.set("after", cursor);
			const res = await fetch(url, {
				method: "GET",
				headers:{
					"Client-ID": Config.credentials.twitch_client_id,
					"Authorization": token,
					"Content-Type": "application/json",
				}
			});
			if (res.status == 200) {
				const json = await res.json() as { data: ModeratorUser[], pagination?: { cursor?: string } };
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else if (res.status == 500) break;
		} while (cursor != null)
		//Cleanup cache after a few minutes
		setTimeout(()=>{
			delete this._moderatorsCache[token];
		}, 60 * 60 * 1000);
		return list;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}

export interface TwitchToken {
	client_id: string;
	login: string;
	scopes: string[];
	user_id: string;
	expires_in: number;
}

export interface TwitchUserInfos {
	id:string;
	login:string;
	display_name:string;
	type:string;
	broadcaster_type:string;
	description:string;
	profile_image_url:string;
	offline_image_url:string;
	view_count:string;
	created_at:string;
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