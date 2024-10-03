import Config from "./Config.js";
import * as fs from "fs";

/**
* Created : 20/07/2023 
*/
export default class Utils {
	
	public static promisedTimeout(delay: number): Promise<void> {
		return new Promise(function (resolve) {
			setTimeout(() => resolve(), delay);
		})
	}

	public static getUUID(): string {
		const w = () => { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
		return `${w()}${w()}-${w()}-${w()}-${w()}-${w()}${w()}${w()}`;
	}

	/**
	 * Generates a 6 digits code
	 * @returns 
	 */
	public static generateCode(size:number) {
		const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let code = '';
		while(code.length < size) {
			const randomIndex = Math.floor(Math.random() * characters.length);
			code += characters[randomIndex];
		}
		return code;
	}

	/**
	 * Saves a log
	 * @param logType 
	 * @param logData 
	 * @returns 
	 */
	public static logToFile(logType:Parameters<typeof Config.LOGS_PATH>[0] | "", logData:string):boolean {
		
		const allowedCategories:Parameters<typeof Config.LOGS_PATH>[0][] = ["streamlabs", "hypetrain", "tiltify", "kofi", "patreon"];

		if(logType == "" || allowedCategories.indexOf(logType) == -1) {
			return false;
		}

		const logPath = Config.LOGS_PATH(logType);
		if(!fs.existsSync(logPath)) {
			fs.writeFileSync(logPath, "", "utf-8");
		}
		
		fs.appendFileSync(logPath, "\r\n"+logData);
		return true;
	}
}