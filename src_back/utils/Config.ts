import * as fs from "fs";
import { LogStyle } from "../utils/Logger";
/**
 * Created by Durss
 */
export default class Config {

	private static _ENV_NAME: EnvName;
	private static _CONF_PATH: string = "env.conf";
	

	public static get envName(): string {
		return this._ENV_NAME;
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

	public static get SERVER_PORT(): number {
		return this.getEnvData({
			dev: 3018,
			prod: 3018,
		});
	}

	public static get PUBLIC_ROOT(): string {
		return this.getEnvData({
			dev: "../dist/",
			prod: "./public/",
		});
	}

	/**
	 * Extract a data from an hasmap depending on the current environment.
	 * @param map
	 * @returns {any}
	 */
	private static getEnvData(map: any): any {
		//Grab env name the first time
		if (!this._ENV_NAME) {
			if (fs.existsSync(this._CONF_PATH)) {
				let content: string = fs.readFileSync(this._CONF_PATH, "utf8");
				this._ENV_NAME = <EnvName>content;
				let str: String = "  :: Current environment \"" + content + "\" ::  ";
				let head: string = str.replace(/./g, " ");
				console.log("\n");
				console.log(LogStyle.BgGreen + head + LogStyle.Reset);
				console.log(LogStyle.Bright + LogStyle.BgGreen + LogStyle.FgWhite + str + LogStyle.Reset);
				console.log(LogStyle.BgGreen + head + LogStyle.Reset);
				console.log("\n");
				
			} else {
				this._ENV_NAME = "dev";
				fs.writeFileSync(this._CONF_PATH, this._ENV_NAME);
				let str: String = "  /!\\ Missing file \"./" + this._CONF_PATH + "\" /!\\  ";
				let head: string = str.replace(/./g, " ");
				console.log("\n");
				console.log(LogStyle.BgRed + head + LogStyle.Reset);
				console.log(LogStyle.Bright + LogStyle.BgRed + LogStyle.FgWhite + str + LogStyle.Reset);
				console.log(LogStyle.BgRed + head + LogStyle.Reset);
				console.log("\n");
				console.log("Creating env.conf file automatically and set it to \""+this._ENV_NAME+"\"\n\n");
			}
		}

		//Get the data from hashmap
		if (map[this._ENV_NAME] != undefined) return map[this._ENV_NAME];
		return map[Object.keys(map)[0]];
	}
}

type EnvName = "dev" | "prod";