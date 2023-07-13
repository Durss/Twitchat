import Config from "../Config";

/**
* Created : 13/07/2023 
*/
export default class PatreonHelper {
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public static async validateToken(code:string):Promise<void> {
		const url = new URL("https://www.patreon.com/api/oauth2/token");
		url.searchParams.append("code", code);
		url.searchParams.append("grant_type", "authorization_code");
		url.searchParams.append("client_id", Config.instance.PATREON_CLIENT_ID);
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}