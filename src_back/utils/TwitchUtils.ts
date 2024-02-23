import fetch from "node-fetch";
import Config from "./Config";
import Logger from "./Logger";
import { Utils } from "discord.js";

/**
* Created : 08/07/2021 
*/
export default class TwitchUtils {

	private static _token:string|null;
	private static _token_invalidation_date:number;
	private static _tokenToUserCache:{[key:string]:TwitchToken} = {};
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/

	public static get ready():boolean {
		return this._token != null && this._token != undefined;
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
		if(Date.now() > this._token_invalidation_date || force) this._token = null;
		//Avoid generating a new token if one already exists
		if(this._token) return this._token;

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
			let json =await result.json();
			this._token = json.access_token;
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
	 * Checks if the given token is valid
	 */
	public static validateToken(token:string):Promise<boolean|any> {
		return new Promise((resolve, reject) => {
			let headers:any = {
				"Authorization":"OAuth "+token
			};
			var options = {
				method: "GET",
				headers: headers,
			};
			fetch("https://id.twitch.tv/oauth2/validate", options)
			.then(async(result) => {
				if(result.status == 200) {
					result.json().then((json)=> {
						resolve(json)
					});
				}else{
					resolve(false);
				}
			});
		});
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
	public static async loadUsers(logins?:string[], ids?:string[], failSafe:boolean = true):Promise<TwitchUserInfos[]|false> {
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
				"Authorization": "Bearer "+this._token,
				"Content-Type": "application/json",
			}
		});
		//Token seem to expire before it's actual EOL date.
		//Make sure here the next request will work.
		if(result.status == 401) {
			this.getClientCredentialToken(true);
			if(failSafe) {
				return await this.loadUsers(logins, ids, false);
			}
		}
		if(result.status == 200) {
			return (await result.json()).data;
		}
		return false;
	}

	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}

interface TwitchToken {
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