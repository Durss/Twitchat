/**
 * Created by Durss
 */
export default class Config {
	public static TWITCH_APP_SCOPES:string[] = [
												"chat:read",
												"chat:edit",
												"channel:read:redemptions",
												"channel:moderate",
												"moderation:read",
												"moderator:manage:automod",
											];

	public static SERVER_PORT:number = 3018;
	public static get API_PATH():string {
		if(document.location.hostname == "localhost") {
			return document.location.protocol+"//"+document.location.hostname+":"+Config.SERVER_PORT+"/api";
		}else{
			return "/api";
		}
	}
}