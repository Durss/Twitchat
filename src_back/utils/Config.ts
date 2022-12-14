import * as fs from "fs";
import * as path from "path";
import { LogStyle } from "../utils/Logger";
import * as fetch from "node-fetch";

/**
 * Created by Durss
 */
export default class Config {

	private static envName: EnvName;
	private static confPath: string = "env.conf";
	private static credentialsCache:Credentials;
	
	public static betaDataFolder = "./beta/";
	public static donorsDataFolder = "./donors/";

	public static get betaList(): string { return this.betaDataFolder + "betaUsers.json"; }
	public static get donorsList(): string { return this.donorsDataFolder + "donors.json"; }
	public static get donorsAnonStates(): string { return this.donorsDataFolder + "public_states.json"; }
	public static get donorsPublicList(): string { return this.donorsDataFolder + "public_cache.json"; }
	public static get donorsLevels(): number[] { return [0,20,30,50,80,100,200,300,400,500,999999]; }

	public static get credentials():Credentials {
		if(!this.credentialsCache) {
			this.credentialsCache = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
		}
		return this.credentialsCache;
	}

	/**
	 * Validates a token and return the user data
	 */
	public static async getUserFromToken(token):Promise<{
		client_id: string,
		login: string,
		scopes: string[],
		user_id: string,
		expires_in: number,
	}> {
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
			return await result.json();
		}else{
			return null;
		}
	}

	public static get LOCAL_TESTING(): boolean {
		return this.getEnvData({
			dev: true,
			prod: false,
		});
	}

	public static get LOGS_ENABLED(): boolean {
		return this.getEnvData({
			dev: true,
			prod: true,
		});
	}

	public static get PUBLIC_ROOT(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../dist/"),
			prod: path.join(__dirname, "../public/"),
		});
	}

	public static get USER_DATA_PATH(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../userData/"),
			prod: path.join(__dirname, "../userData/"),
		});
	}

	/**
	 * Extract a data from an hasmap depending on the current environment.
	 * @param map
	 * @returns {any}
	 */
	private static getEnvData(map: any): any {
		//Grab env name the first time
		if (!this.envName) {
			if (fs.existsSync(this.confPath)) {
				const content: string = fs.readFileSync(this.confPath, "utf8");
				this.envName = <EnvName>content;
				const str: string = "  :: Current environment \"" + content + "\" ::  ";
				const head: string = str.replace(/./g, " ");
				console.log("\n");
				console.log(LogStyle.BgGreen + head + LogStyle.Reset);
				console.log(LogStyle.Bright + LogStyle.BgGreen + LogStyle.FgWhite + str + LogStyle.Reset);
				console.log(LogStyle.BgGreen + head + LogStyle.Reset);
				console.log("\n");
				
			} else {
				this.envName = "dev";
				fs.writeFileSync(this.confPath, this.envName);
				const str: string = "  /!\\ Missing file \"./" + this.confPath + "\" /!\\  ";
				const head: string = str.replace(/./g, " ");
				console.log("\n");
				console.log(LogStyle.BgRed + head + LogStyle.Reset);
				console.log(LogStyle.Bright + LogStyle.BgRed + LogStyle.FgWhite + str + LogStyle.Reset);
				console.log(LogStyle.BgRed + head + LogStyle.Reset);
				console.log("\n");
				console.log("Creating env.conf file automatically and set it to \""+this.envName+"\"\n\n");
			}
		}

		//Get the data from hashmap
		if (map[this.envName] != undefined) return map[this.envName];
		return map[Object.keys(map)[0]];
	}
}

type EnvName = "dev" | "prod";

interface Credentials {
	server_port:number;

	admin_ids: string[];
	csrf_key: string;

	twitch_client_id: string;
	twitch_client_secret: string;
	twitch_redirect_uri: string;
	twitch_scopes: string[];
	
	spotify_client_id: string;
	spotify_client_secret: string;
	spotify_scopes: string;
	spotify_redirect_uri: string;
	
	deezer_scopes: string;
	deezer_client_id: string;
	deezer_client_secret: string;
	deezer_redirect_uri: string;
	deezer_dev_client_id: string;
	deezer_dev_client_secret: string;
	deezer_dev_redirect_uri: string;
}