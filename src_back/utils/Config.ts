import * as fs from "fs";
import * as path from "path";
import { LogStyle } from "../utils/Logger.js";
import { fileURLToPath } from 'url';
import Utils from "./Utils.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Created by Durss
 */
export default class Config {

	private static envName: EnvName;
	private static confPath: string = "env.conf";
	private static credentialsCache:Credentials;

	public static get maxTranslationsPerDay():number{ return 200; }
	public static get lifetimeDonorThreshold():number{ return 89; }
	public static get donorsList(): string { return this.DONORS_DATA_FOLDER + "donors.json"; }
	public static get earlyDonors(): string { return this.DONORS_DATA_FOLDER + "earlyDonors.json"; }
	public static get giftedPremium(): string { return this.DONORS_DATA_FOLDER + "giftedPremiums.json"; }
	public static get donorsAnonStates(): string { return this.DONORS_DATA_FOLDER + "public_states.json"; }
	public static get donorsPublicList(): string { return this.DONORS_DATA_FOLDER + "public_cache.json"; }
	public static get donorsLevels(): number[] { return [0,20,30,50,80,100,200,300,400,500,999999]; }
	public static get patreonToken(): string { return this.PATREON_DATA_FOLDER + "patreonToken.json"; }
	/**
	 * Get active patreon member list
	 */
	public static get patreonMembers(): string { return this.PATREON_DATA_FOLDER + "patreonMembers.json"; }
	/**
	 * Links a twitch user ID to a Patreon token
	 */
	public static get twitch2PatreonToken(): string { return this.PATREON_DATA_FOLDER + "twitch2PatreonToken.json"; }
	/**
	 * Links a twitch user ID to a Patreon member ID
	 */
	public static get twitch2Patreon(): string { return this.PATREON_DATA_FOLDER + "patreon2Twitch.json"; }
	/**
	 * Links a patreon user ID to their webhook secret
	 */
	public static get patreonUid2WebhookSecret(): string { return this.PATREON_DATA_FOLDER + "uid2webhookSecret.json"; }
	/**
	 * Links a twitch user ID to a discord guildID
	 */
	public static get discord2Twitch(): string { return this.DISCORD_DATA_FOLDER + "discord2Twitch.json"; }

	public static get credentials():Credentials {
		if(!this.credentialsCache) {
			this.credentialsCache = JSON.parse(fs.readFileSync(this.CREDENTIALS_ROOT+"credentials.json", "utf8"));
		}
		return this.credentialsCache;
	}

	public static get FORCE_NON_PREMIUM(): boolean {
		return this.getEnvData({
			dev: false,
			beta: false,
			prod: false,
		});
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
			dev: path.join(this.DATA_ROOT, "/credentials/"),
			beta: path.join(this.DATA_ROOT, "/credentials/"),
			prod: path.join(this.DATA_ROOT, "/credentials/"),
		});
	}

	public static get USER_DATA_PATH(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/userData/"),
			beta: path.join(this.DATA_ROOT, "/userData/"),
			prod: path.join(this.DATA_ROOT, "/userData/"),
		});
	}
	public static get USER_DATA_BACKUP_PATH(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/userData_backup/"),
			beta: path.join(this.DATA_ROOT, "/userData_backup/"),
			prod: path.join(this.DATA_ROOT, "/userData_backup/"),
		});
	}

	public static get PRODUCTION_USER_DATA_PATH_FROM_BETA(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../userData_fake_production/"),
			beta: path.join(__dirname, "../../twitchat/data/userData/"),
			prod: path.join(__dirname, "../../twitchat/data/userData/"),
		});
	}

	public static get ANNOUNCEMENTS_PATH(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/announcements.json"),
			beta: path.join(this.DATA_ROOT, "/announcements.json"),
			prod: path.join(this.DATA_ROOT, "/announcements.json"),
		});
	}

	public static get DATA_SHARING(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/dataSharing.json"),
			beta: path.join(this.DATA_ROOT, "/dataSharing.json"),
			prod: path.join(this.DATA_ROOT, "/dataSharing.json"),
		});
	}

	public static get KO_FI_USERS(): string {
		return this.getEnvData({
			dev: path.join(this.KO_FI_DATA_FOLDER, "/kofi2Twitch.json"),
			beta: path.join(this.KO_FI_DATA_FOLDER, "/kofi2Twitch.json"),
			prod: path.join(this.KO_FI_DATA_FOLDER, "/kofi2Twitch.json"),
		});
	}

	public static get KO_FI_PRODUCT_CACHE(): string {
		return this.getEnvData({
			dev: path.join(this.KO_FI_DATA_FOLDER, "/kofiProduct.json"),
			beta: path.join(this.KO_FI_DATA_FOLDER, "/kofiProduct.json"),
			prod: path.join(this.KO_FI_DATA_FOLDER, "/kofiProduct.json"),
		});
	}

	public static get BINGO_ROOT(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/bingo"),
			beta: path.join(this.DATA_ROOT, "/bingo"),
			prod: path.join(this.DATA_ROOT, "/bingo"),
		});
	}

	public static get SETTINGS_PRESETS_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/sharedSettings/"),
			beta: path.join(this.DATA_ROOT, "../../twitchat/data/sharedSettings/"),
			prod: path.join(this.DATA_ROOT, "/sharedSettings/"),
		});
	}

	public static LOGS_PATH(category:typeof Utils.allowedLogCategories[number]): string {
		return this.getEnvData({
			dev: path.join(this.LOGS_FOLDER, "/"+category+".json"),
			beta: path.join(this.LOGS_FOLDER, "/"+category+".json"),
			prod: path.join(this.LOGS_FOLDER, "/"+category+".json"),
		});
	}

	public static BINGO_VIEWER_FILE(streamerId:string, bingoId:string, viewerId:string): string {
		return this.getEnvData({
			dev: path.join(this.BINGO_GRID_ROOT(streamerId, bingoId)+"/"+viewerId+".json"),
			beta: path.join(this.BINGO_GRID_ROOT(streamerId, bingoId)+"/"+viewerId+".json"),
			prod: path.join(this.BINGO_GRID_ROOT(streamerId, bingoId)+"/"+viewerId+".json"),
		});
	}

	public static BINGO_GRID_ROOT(streamerId:string, bingoId:string): string {
		return this.getEnvData({
			dev: path.join(this.BINGO_ROOT, "/"+streamerId+"/"+bingoId),
			beta: path.join(this.BINGO_ROOT, "/"+streamerId+"/"+bingoId),
			prod: path.join(this.BINGO_ROOT, "/"+streamerId+"/"+bingoId),
		});
	}

	/**
	 * File containing association between Tiltify campaign IDs and Twitch user IDs
	 */
	public static get TILTIFY_FACT_2_UID_MAP(): string {
		return this.getEnvData({
			dev: path.join(this.TILTIFY_DATA_FOLDER, "/factIdToUid.json"),
			beta: path.join(this.TILTIFY_DATA_FOLDER, "/factIdToUid.json"),
			prod: path.join(this.TILTIFY_DATA_FOLDER, "/factIdToUid.json"),
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
	 * File containing premium gift credits
	 * @returns {boolean|null} true if credits were used, false if no more credits, null if invalid code
	 */
	public static USE_PREMIUM_CREDITS(code:string): boolean | null {
		const filepath = this.getEnvData({
			dev: path.join(this.DONORS_DATA_FOLDER, "/premium_credits.json"),
			beta: path.join(this.DONORS_DATA_FOLDER, "/premium_credits.json"),
			prod: path.join(this.DONORS_DATA_FOLDER, "/premium_credits.json"),
		});

		if(fs.existsSync(filepath)) {
			const json = JSON.parse(fs.readFileSync(filepath, "utf-8")) as {[code:string]:number};
			if(json[code] != undefined) {//Code exists
				if(json[code] > 0) {//No more credits
					json[code] --;
					fs.writeFileSync(filepath, JSON.stringify(json, null, "\t"));
					return true;
				}
				return false;
			}
		}
		return null;
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
			dev: path.join(this.DATA_ROOT, "/beta/"),
			beta: path.join(this.DATA_ROOT, "/beta/"),
			prod: path.join(this.DATA_ROOT, "/beta/"),
		});
	}

	/**
	 * Folder containing donors infos
	 */
	public static get DONORS_DATA_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/donors/"),
			beta: path.join(this.DATA_ROOT, "../../twitchat/data/donors/"),
			prod: path.join(this.DATA_ROOT, "/donors/"),
		});
	}

	/**
	 * Folder containing patreon infos
	 */
	public static get PATREON_DATA_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/patreon/"),
			beta: path.join(this.DATA_ROOT, "/patreon/"),
			prod: path.join(this.DATA_ROOT, "/patreon/"),
		});
	}

	/**
	 * Folder containing discord data
	 */
	public static get DISCORD_DATA_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/discord/"),
			beta: path.join(this.DATA_ROOT, "/discord/"),
			prod: path.join(this.DATA_ROOT, "/discord/"),
		});
	}

	/**
	 * Folder containing ko-fi data
	 */
	public static get KO_FI_DATA_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/kofi/"),
			beta: path.join(this.DATA_ROOT, "/kofi/"),
			prod: path.join(this.DATA_ROOT, "/kofi/"),
		});
	}

	/**
	 * Folder containing Tiltify data
	 */
	public static get TILTIFY_DATA_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/tiltify/"),
			beta: path.join(this.DATA_ROOT, "/tiltify/"),
			prod: path.join(this.DATA_ROOT, "/tiltify/"),
		});
	}

	/**
	 * Folder containing ko-fi data
	 */
	public static get LOGS_FOLDER(): string {
		return this.getEnvData({
			dev: path.join(this.DATA_ROOT, "/logs/"),
			beta: path.join(this.DATA_ROOT, "/logs/"),
			prod: path.join(this.DATA_ROOT, "/logs/"),
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
	 * Root folder for all data folder
	 */
	private static get DATA_ROOT(): string {
		return this.getEnvData({
			dev: path.join(__dirname, "/../../data/"),
			beta: path.join(__dirname, "../data/"),
			prod: path.join(__dirname, "../data/"),
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

type EnvName = "dev" | "prod" | "beta";

interface Credentials {
	server_port:number;
	sms_uid?:string;
	sms_token?:string;
	dashboard_url: string;
	dashboard_token: string;

	admin_ids: string[];
	feature_flags?: {
		export_configs: string[]
	};
	csrf_key: string;

	twitch_client_id: string;
	twitch_client_secret: string;
	twitch_redirect_uri: string;
	twitch_scopes: string[];
	
	twitchExtension_client_id: string;
	twitchExtension_client_secret: string;

	spotify_client_id: string;
	spotify_client_secret: string;
	spotify_scopes: string;
	spotify_redirect_uri: string;

	patreon_client_id:string;
	patreon_client_secret:string;
	patreon_scopes:string;
	patreon_redirect_uri:string;

	patreon_client_id_server:string;
	patreon_client_secret_server:string;
	patreon_redirect_uri_server:string;
	patreon_webhook_url:string;
	patreon_webhook_secret:string;
	patreon_cipherKey:string;

	tenor_secret:string;
	youtube_key:string;
	youtube_scopes:string[];
	google_key:string;

	paypal_client_id:string;
	paypal_client_secret:string;

	donors_remote_api_secret:string;

	contact_mail:string;

	discord_client_id:string;
	discord_public_key:string;
	discord_bot_token:string;

	streamlabs_client_id:string;
	streamlabs_client_secret:string;
	streamlabs_redirect_uri:string;

	streamelements_client_id:string;
	streamelements_client_secret:string;
	streamelements_redirect_uri:string;

	tipeee_client_id:string;
	tipeee_client_secret:string;
	tipeee_redirect_uri:string;

	tiltify_client_id:string;
	tiltify_client_secret:string;
	tiltify_webhook_verify:string;
	tiltify_webhook_id:string;
	tiltify_redirect_uri:string;
	tiltify_scopes:string;
	tiltify_api_path:string;

	kofi_proxy:string;
}
