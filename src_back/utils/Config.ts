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
	
	public static get maxTranslationsPerDay():number{ return 70; }
	public static get lifetimeDonorStep():number{ return 89; }
	public static get donorsList(): string { return this.DONORS_DATA_FOLDER + "donors.json"; }
	public static get earlyDonors(): string { return this.DONORS_DATA_FOLDER + "earlyDonors.json"; }
	public static get donorsAnonStates(): string { return this.DONORS_DATA_FOLDER + "public_states.json"; }
	public static get donorsPublicList(): string { return this.DONORS_DATA_FOLDER + "public_cache.json"; }
	public static get donorsLevels(): number[] { return [0,20,30,50,80,100,200,300,400,500,999999]; }
	public static get patreonToken(): string { return this.PATREON_DATA_FOLDER + "patreonToken.json"; }
	/**
	 * Get active patreon member list
	 */
	public static get patreonMembers(): string { return this.PATREON_DATA_FOLDER + "patreonMembers.json"; }
	/**
	 * Links a twitch user ID to a Patreon member ID
	 */
	public static get patreon2Twitch(): string { return this.PATREON_DATA_FOLDER + "patreon2Twitch.json"; }

	public static get credentials():Credentials {
		if(!this.credentialsCache) {
			this.credentialsCache = JSON.parse(fs.readFileSync(this.CREDENTIALS_ROOT+"credentials.json", "utf8"));
		}
		return this.credentialsCache;
	}

	public static get LOCAL_TESTING(): boolean {
		return this.getEnvData({
			dev: true,
			beta: false,
			prod: false,
		});
	}

	public static get LOGS_ENABLED(): boolean {
		return this.getEnvData({
			dev: true,
			beta: true,
			prod: true,
		});
	}

	public static get PUBLIC_ROOT(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../dist/"),
			beta: path.join(__dirname, "../public/"),
			prod: path.join(__dirname, "../public/"),
		});
	}

	public static get LABELS_ROOT(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../i18n/"),
			beta: path.join(__dirname, "../i18n/"),
			prod: path.join(__dirname, "../i18n/"),
		});
	}

	public static get CREDENTIALS_ROOT(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../credentials/"),
			beta: path.join(__dirname, "../credentials/"),
			prod: path.join(__dirname, "../credentials/"),
		});
	}

	public static get USER_DATA_PATH(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../userData/"),
			beta: path.join(__dirname, "../userData/"),
			prod: path.join(__dirname, "../userData/"),
		});
	}

	public static get PRODUCTION_USER_DATA_PATH_FROM_BETA(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../userData_fake_production/"),
			beta: path.join(__dirname, "../../twitchat/userData/"),
			prod: path.join(__dirname, "../../twitchat/userData/"),
		});
	}

	public static get ANNOUNCEMENTS_PATH(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../announcements.json"),
			beta: path.join(__dirname, "../announcements.json"),
			prod: path.join(__dirname, "../announcements.json"),
		});
	}


	/**
	 * Get if SMS warning for patreon requesting authentication is enabled
	 */
	public static get SMS_WARN_PATREON_AUTH(): boolean {
		return this.getEnvData({
			dev: false,
			beta: true,
			prod: true,
		});
	}

	/**
	 * List of beta users
	 */
	public static get BETA_USER_LIST(): string {
		return this.BETA_DATA_FOLDER + "betaUsers.json";
	}

	/**
	 * Golder containing beta user list
	 */
	public static get BETA_DATA_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "../../beta/"),
			beta: path.join(__dirname, "../beta/"),
			prod: path.join(__dirname, "../beta/"),
		});
	}
	
	/**
	 * Folder containing donors infos
	 */
	public static get DONORS_DATA_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "../../donors/"),
			beta: path.join(__dirname, "../../twitchat/donors/"),
			prod: path.join(__dirname, "../donors/"),
		});
	}
	
	/**
	 * Folder containing patreon infos
	 */
	public static get PATREON_DATA_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "../../patreon/"),
			beta: path.join(__dirname, "../patreon/"),
			prod: path.join(__dirname, "../patreon/"),
		});
	}
	
	/**
	 * Paypal API endpoint
	 */
	public static get PAYPAL_ENDPOINT(): string {
		return this.getEnvData({
			dev: "https://api-m.sandbox.paypal.com",
			beta: "https://api-m.paypal.com",
			prod: "https://api-m.paypal.com",
		});
	}
	
	/**
	 * External endpoint that manages donors through google sheet (not part of this repository)
	 */
	public static get DONORS_REMOTE_ENDPOINT(): string {
		return this.getEnvData({
			dev: "http://127.0.0.1:3025/",
			beta: "http://127.0.0.1:3025/",
			prod: "http://127.0.0.1:3025/",
		});
	}

	/**
	 * Gets youtube client ID if any
	 */
	public static get YOUTUBE_CREDENTIALS():{client_id: string;project_id: string;auth_uri: string;token_uri: string;auth_provider_x509_cert_url: string;client_secret: string;redirect_uris: string[];javascript_origins: string[]}|null {
		if(!this.credentials.youtube_key) return null;
		const filePath = this.CREDENTIALS_ROOT + this.credentials.youtube_key;
		if(!fs.existsSync(filePath)) return null;
		const file = JSON.parse(fs.readFileSync(filePath, "utf-8") || "{web:{}}");
		return file.web;
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

type EnvName = "dev" | "prod" | "beta";

interface Credentials {
	server_port:number;
	sms_uid?:string;
	sms_token?:string;

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
	
	patreon_client_id:string;
	patreon_client_secret:string;
	patreon_scopes:string;
	patreon_redirect_uri:string;
	
	patreon_my_uid:string;
	patreon_client_id_server:string;
	patreon_client_secret_server:string;
	patreon_redirect_uri_server:string;
	patreon_webhook_secret:string;

	tenor_secret:string;
	youtube_key:string;
	youtube_scopes:string[];
	google_key:string;

	paypal_client_id:string;
	paypal_client_secret:string;

	donors_remote_api_secret:string;

	contact_mail:string;

	discord_app_id:string;
	discord_public_key:string;
	discord_bot_token:string;
}