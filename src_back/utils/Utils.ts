import Config from "./Config.js";
import * as fs from "fs";
import * as crypto from "crypto";
import fetch from "node-fetch";

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

	public static allowedLogCategories = ["streamlabs", "hypetrain", "tiltify", "kofi", "patreon", "random", "eventsub", "youtube"] as const;
	/**
	 * Saves a log
	 * @param logType
	 * @param logData
	 * @returns
	 */
	public static logToFile(logType:typeof this.allowedLogCategories[number] | "", logData:string):boolean {
		if(logType == "" || this.allowedLogCategories.indexOf(logType) == -1) {
			return false;
		}

		const logPath = Config.LOGS_PATH(logType);
		if(!fs.existsSync(logPath)) {
			fs.writeFileSync(logPath, "", "utf-8");
		}

		fs.appendFileSync(logPath, "\r\n"+JSON.stringify({date:new Date().toString(), body:logData}));
		return true;
	}

	/**
	 * Encrypts text using AES-256-CBC
	 * @param text Text to encrypt
	 * @returns encrypted text with IV prepended
	 */
	public static encrypt(text: string): string {

		// Convert hex key to Uint8Array
		const keyUint8 = new Uint8Array(Buffer.from(Config.credentials.patreon_cipherKey, 'hex'));

		if (keyUint8.length !== 32) {
			throw new Error('Secret key must be 32 bytes');
		}

		// Generate IV and convert to Uint8Array
		const ivUint8 = new Uint8Array(crypto.randomBytes(12));

		const cipher = crypto.createCipheriv('aes-256-gcm', keyUint8, ivUint8);
		const encryptedBuffer = Buffer.concat([
			cipher.update(Buffer.from(text, 'utf8')),
			cipher.final()
		]);

		const authTag = cipher.getAuthTag();

		return Buffer.from(ivUint8).toString('hex')
			+ ':' + encryptedBuffer.toString('hex')
			+ ':' + authTag.toString('hex');
	}

	/**
	 * Decrypts text using AES-256-CBC
	 * @param encryptedText Text to decrypt (with IV prepended)
	 * @returns decrypted text
	 */
	public static decrypt(encryptedText: string): string {
		const keyUint8 = new Uint8Array(Buffer.from(Config.credentials.patreon_cipherKey, 'hex'));

		if (keyUint8.length !== 32) {
			throw new Error('Secret key must be 32 bytes');
		}

		const [ivHex, encryptedHex, authTagHex] = encryptedText.split(':');
		const ivUint8 = new Uint8Array(Buffer.from(ivHex, 'hex'));
		const encryptedUint8 = new Uint8Array(Buffer.from(encryptedHex, 'hex'));
		const authTagUint8 = new Uint8Array(Buffer.from(authTagHex, 'hex'));

		const decipher = crypto.createDecipheriv('aes-256-gcm', keyUint8, ivUint8);
		decipher.setAuthTag(Buffer.from(authTagUint8));

		const decryptedBuffer = Buffer.concat([
			decipher.update(Buffer.from(encryptedUint8)),
			decipher.final()
		]);

		return decryptedBuffer.toString('utf8');
	}

	/**
	 * Send an SMS alert
	 * @param message
	 */
	public static sendSMSAlert(message:string):void {
		if(Config.credentials.sms_uid && Config.credentials.sms_token) {
			const urlSms = new URL("https://smsapi.free-mobile.fr/sendmsg");
			urlSms.searchParams.append("user", Config.credentials.sms_uid);
			urlSms.searchParams.append("pass", Config.credentials.sms_token);
			urlSms.searchParams.append("msg", message);
			fetch(urlSms, {method:"GET"});
		}
	}

	/**
	 * Sands a dashboard notification
	 * @param title 
	 * @param message 
	 * @param action 
	 */
	public static sendDashboardNotification(title:string, message: string, action?:{text:string, url:string}, status:'error'|'neutral'|'success' = 'neutral'): void {
		if(!Config.credentials.dashboard_url || !Config.credentials.dashboard_token) return;
		
		fetch(Config.credentials.dashboard_url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': Config.credentials.dashboard_token
			},
			body: JSON.stringify({
				title,
				source: 'Twitchat',
				description: message,
				status,
				buttonText: action?.text,
				buttonUrl: action?.url
			})
		})
	}
}
