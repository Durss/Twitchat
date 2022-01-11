import router from "@/router";
import { Badges } from "tmi.js";
import Config from "./Config";

/**
* Created : 19/01/2021 
*/
export default class TwitchUtils {

	public static badgesCache:{[key:string]:{[key:string]:TwitchTypes.BadgesSet}} = {};

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
	public static async loadUserBadges(uid:string):Promise<{[key:string]:TwitchTypes.BadgesSet}> {
		if(this.badgesCache[uid]) return this.badgesCache[uid];

		const headers = {
			// "Authorization":"Bearer "+store.state.authToken,
			// "Client-Id": Config.TWITCH_CLIENT_ID
		};
		const options = {
			method: "GET",
			headers: headers,
		};
		//URL could be replaced with this one to avoid needing an auth token :
		//https://badges.twitch.tv/v1/badges/channels/{UID}/display
		// const result = await fetch("https://api.twitch.tv/helix/chat/badges?broadcaster_id="+uid, options);
		const result = await fetch("https://badges.twitch.tv/v1/badges/channels/"+uid+"/display", options);
		if(result.status == 200) {
			const json = await result.json();
			this.badgesCache[uid] = json.badge_sets;
			// this.badgesCache[uid] = json.data;
			return this.badgesCache[uid];
		}else{
			throw({error:result});
		}
	}

	/**
	 * Gets the badges of a channel
	 * @returns
	 */
	public static async loadGlobalBadges():Promise<{[key:string]:TwitchTypes.BadgesSet}> {
		if(this.badgesCache["global"]) return this.badgesCache["global"];

		const headers = {
			// "Authorization":"Bearer "+store.state.authToken,
			// "Client-Id": Config.TWITCH_CLIENT_ID
		};
		const options = {
			method: "GET",
			headers: headers,
		};
		//URL could be replaced with this one to avoid needing an auth token :
		//https://badges.twitch.tv/v1/badges/global/display
		// const result = await fetch("https://api.twitch.tv/helix/chat/badges/global", options);
		const result = await fetch("https://badges.twitch.tv/v1/badges/global/display", options);
		if(result.status == 200) {
			const json = await result.json();
			this.badgesCache["global"] = json.badge_sets;
			// this.badgesCache["global"] = json.data;
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
					const badgeSet = cache[userBadgeCategory];
					if(badgeSet) {
						const badge = badgeSet.versions[userBadgeID];
						if(badge) {
							result.push(badge);
						}
					}
				}
			}
		}
		return result;
	}

	/**
	 * Replaces emotes by image tags on the message
	 */
	public static parseEmotes(message:string, emotes:string|undefined, removeEmotes:boolean = false):string {
		message = message.replaceAll("<", "&lt;");
		message = message.replaceAll(">", "&gt;");
		if(!emotes || emotes.length == 0) {
			return message;
		}

		const emotesList:{id:string, start:number, end:number}[] = [];
		//Parse raw emotes data
		const chunks = (emotes as string).split("/");
		for (let i = 0; i < chunks.length; i++) {
			const c = chunks[i];
			const id = c.split(":")[0];
			const positions = c.split(":")[1].split(",");
			for (let j = 0; j < positions.length; j++) {
				const p = positions[j];
				const start = parseInt(p.split("-")[0]);
				const end = parseInt(p.split("-")[1]);
				emotesList.push({id, start, end});
			}
		}
		//Sort emotes by start position
		emotesList.sort((a,b) => a.start - b.start)
		
		let cursor = 0;
		let result = "";
		//Convert emotes to image tags
		for (let i = 0; i < emotesList.length; i++) {
			const e = emotesList[i];
			if(cursor < e.start) result += message.substring(cursor, e.start);
			if(!removeEmotes) {
				const code = message.substring(e.start, e.end + 1);
				const image = "<img src='https://static-cdn.jtvnw.net/emoticons/v2/"+e.id+"/default/light/1.0' data-tooltip='"+code+"'>";
				result += image;
			}
			cursor = e.end + 1;
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
		versions: {[key:string]:Badge};
	}

	export interface Badge {
		id: string;
		click_action: string;
		click_url: string;
		description: string;
		image_url_1x: string;
		image_url_2x: string;
		image_url_4x: string;
	}

	
}