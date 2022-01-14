/**
 * Created by Durss
 */
export default class Config {
	public static IS_PROD:boolean = document.location.hostname != "localhost";
	public static TWITCH_APP_SCOPES:string[] = [];

	public static SERVER_PORT:number = 3018;
	public static get API_PATH():string {
		if(!Config.IS_PROD) {
			return document.location.protocol+"//"+document.location.hostname+":"+Config.SERVER_PORT+"/api";
		}else{
			return "/api";
		}
	}
}