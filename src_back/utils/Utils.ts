import Config from "./Config.js";
import * as fs from "fs";
import * as crypto from "crypto";

/**
* Created : 20/07/2023 
*/
export default class Utils {
	
	public static promisedTimeout(delay: number): Promise<void> {
		return new Promise(function (resolve) {
			//Node has a upper limit of 2147483647 seconds for timeouts
			setTimeout(() => resolve(), Math.min(2147483647, Math.max(0, delay)));
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
		
		const allowedCategories:Parameters<typeof Config.LOGS_PATH>[0][] = ["streamlabs", "hypetrain", "tiltify", "kofi", "patreon", "random"];

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

	/**
	 * Encrypts a data
	 * @param text 
	 * @returns 
	 */
	public static encrypt(text):string {
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(Config.credentials.patreon_cipherKey, 'hex'), iv);
		let encrypted = cipher.update(text);
		encrypted = Buffer.concat([encrypted, cipher.final()]);
		return iv.toString('hex') + ':' + encrypted.toString('hex');
	}
	
	/**
	 * Decrypts a data encrypted via encrypt()
	 * @see Utils.encrypt
	 */
	public static decrypt(text):string {
		const textParts = text.split(':');
		const iv = Buffer.from(textParts.shift(), 'hex');
		const encryptedText = Buffer.from(textParts.join(':'), 'hex');
		const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(Config.credentials.patreon_cipherKey, 'hex'), iv);
		let decrypted = decipher.update(encryptedText);
		decrypted = Buffer.concat([decrypted, decipher.final()]);
		return decrypted.toString();
	}
}