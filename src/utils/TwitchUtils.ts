import router from "@/router";
import store from "@/store";
import { Badges } from "tmi.js";
import Config from "./Config";

/**
* Created : 19/01/2021 
*/
export default class TwitchUtils {

	public static badgesCache:{[key:string]:TwitchTypes.BadgesSet[]} = {};

	public static get oAuthURL():string {
		const path = router.resolve({name:"oauth"}).href;
		const redirect = encodeURIComponent( document.location.origin+path );
		const scopes = encodeURIComponent( Config.TWITCH_SCOPES.join(" ") );
		const clientID = Config.TWITCH_CLIENT_ID;

		let url = "https://id.twitch.tv/oauth2/authorize?";
		url += "client_id="+clientID
		url += "&redirect_uri="+redirect;
		url += "&response_type=token";
		url += "&scope="+scopes;
		url += "&state=";
		return url;
	}
	
	public static validateToken(oAuthToken:string):Promise<TwitchTypes.Token> {
		return new Promise((resolve, reject) => {
			const headers = {
				"Authorization":"OAuth "+oAuthToken
			};
			const options = {
				method: "GET",
				headers: headers,
			};
			fetch("https://id.twitch.tv/oauth2/validate", options)
			.then((result) => {
				if(result.status == 200) {
					result.json().then((json)=> {
						resolve(json)
					});
				}else{
					reject();
				}
			});
		});
	}

	/**
	 * Gets the badges of a channel
	 * @returns
	 */
	public static async getBadges(uid:string):Promise<TwitchTypes.BadgesSet[]> {
		if(this.badgesCache[uid]) return this.badgesCache[uid];

		const headers = {
			"Authorization":"Bearer "+store.state.authToken,
			"Client-Id": Config.TWITCH_CLIENT_ID
		};
		const options = {
			method: "GET",
			headers: headers,
		};
		const result = await fetch("https://api.twitch.tv/helix/chat/badges?broadcaster_id="+uid, options)
		if(result.status == 200) {
			const json = await result.json()
			this.badgesCache[uid] = json.data;
			return this.badgesCache[uid];
		}else{
			throw({error:result});
		}
	}

	/**
	 * Gets the badges of a channel
	 * @returns
	 */
	public static async getGlobalBadges():Promise<TwitchTypes.BadgesSet[]> {
		if(this.badgesCache["global"]) return this.badgesCache["global"];

		const headers = {
			"Authorization":"Bearer "+store.state.authToken,
			"Client-Id": Config.TWITCH_CLIENT_ID
		};
		const options = {
			method: "GET",
			headers: headers,
		};
		const result = await fetch("https://api.twitch.tv/helix/chat/badges/global", options)
		if(result.status == 200) {
			const json = await result.json()
			this.badgesCache["global"] = json.data;
			return this.badgesCache["global"];
		}else{
			throw({error:result});
		}
	}
	
	/**
	 * Converts a chat message badges to actual badges instances with images and IDs.
	 * @param userBadges
	 * @returns 
	 */
	public static getBadgesImagesFromRawBadges(channelId:string, userBadges:Badges|undefined):TwitchTypes.Badge[] {
		const result:TwitchTypes.Badge[] = [];
		for (const userBadgeCategory in userBadges) {
			const userBadgeID = userBadges[ userBadgeCategory ] as string;
			for (const key in this.badgesCache) {
				if(key == channelId || key == "global") {
					const cache = this.badgesCache[key];
					const badgeSet = cache.find(v => v.set_id == userBadgeCategory);
					if(badgeSet) {
						const badge = badgeSet.versions.find(v => v.id == userBadgeID);
						if(badge) {
							result.push(badge as TwitchTypes.Badge);
						}
					}
				}
			}
		}
		return result;
	}
}

export namespace TwitchTypes {
	export interface Token {
		client_id: string;
		login: string;
		scopes: string[];
		user_id: string;
		expires_in: number;
	}

	export interface StreamInfo {
		id:            string;
		user_id:       string;
		user_login:    string;
		user_name:     string;
		game_id:       string;
		game_name:     string;
		type:          string;
		title:         string;
		viewer_count:  number;
		started_at:    string;
		language:      string;
		thumbnail_url: string;
		tag_ids:       string[];
	}

	export interface UserInfo {
		id:                string;
		login:             string;
		display_name:      string;
		type:              string;
		broadcaster_type:  string;
		description:       string;
		profile_image_url: string;
		offline_image_url: string;
		view_count:        number;
		created_at:        string;
		
		//Custom injected data from server.
		streamInfos:       StreamInfo;
		//Custom injected data from server.
		rawData:       {
			id:string;
			lastActivity:number;//Timestamp
			created_at:number;//Timestamp
			description?:string;
			/**
			 * @deprecated Don't use this, it's only here for legacy purpose.
			 */
			name?:string;
		};
	}

	export interface BadgesSet {
		set_id: string;
		versions: Badge[];
	}

	export interface Badge {
		id: string;
		image_url_1x: string;
		image_url_2x: string;
		image_url_4x: string;
	}

	
}