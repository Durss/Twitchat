/**
 * Created by Durss
 */
export default class Config {
	public static REQUIRE_APP_AUTHORIZATION:boolean = true;
	public static TWITCH_CLIENT_ID:string = "9iiddxil0qvntyaudlb4oeb4ehwkzo";
	public static TWITCH_SCOPES:string[] = [
												"chat:read",
												"chat:edit",
												"channel:read:redemptions",
												"channel:moderate",
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