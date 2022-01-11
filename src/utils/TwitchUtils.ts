import router from "@/router";
import store from "@/store";
import Config from "./Config";

/**
* Created : 19/01/2021 
*/
export default class TwitchUtils {

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

	public static async getBadges():Promise<void> {
		const headers = {
			"Authorization":"Bearer "+store.state.authToken,
			"Client-Id": Config.TWITCH_CLIENT_ID
		};
		const options = {
			method: "GET",
			headers: headers,
		};
		fetch(" https://api.twitch.tv/helix/chat/badges?broadcaster_id="+store.state.user.user_id, options)
		.then((result) => {
			if(result.status == 200) {
				result.json().then((json)=> {
					console.log(json);
					return json
				});
			}else{
				throw({error:result});
			}
		});
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
}