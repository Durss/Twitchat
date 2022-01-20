import Store from "@/store/Store";

/**
* Created : 19/01/2022 
*/
export default class TwitchCypherPlugin {
	
	
	private static _instance:TwitchCypherPlugin;
	private _cypherKey = "";
    private buff_to_base64 = (buff:number[]) => btoa(String.fromCharCode.apply(null, buff));
    private base64_to_buf = (b64:string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    private enc = new TextEncoder();
    private dec = new TextDecoder();
    private chars:string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/=";
    private charsReplacements:string = "‒–—―ꟷ‖⸗ⱶ⌠⌡─ꞁ│┌┐└┘├┤┬┴┼═║╒╓╔╕╖╗╘╙╚╛╜╝╞╟╠╡╢╣╤╥╦╨╧╩╪╫╬▬ɭƖſ∏¦|[]¯‗∟≡₸";
	private regMatch!:RegExp;
	
	constructor() {
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():TwitchCypherPlugin {
		if(!TwitchCypherPlugin._instance) {
			TwitchCypherPlugin._instance = new TwitchCypherPlugin();
			TwitchCypherPlugin._instance.initialize();
		}
		return TwitchCypherPlugin._instance;
	}

	public set cypherKey(value:string) {
		this._cypherKey = value;
		Store.set("cypherKey", value);
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	/**
	 * Check if the specified message is an encrypted one
	 * 
	 * @param message 
	 * @returns 
	 */
	public isCyperCandidate(message:string):boolean {
		if(!this._cypherKey) return false;
		this.regMatch.lastIndex = 0;
		return this.regMatch.test(message);
	}

	/**
	 * Encrypts a message
	 * 
	 * @param data 
	 * @returns 
	 */
	public async encrypt(data:string):Promise<string> {
		const encryptedData = await this.encryptData(data, this._cypherKey);
		let result = "";
		for(let i=0; i < encryptedData.length; i++) {
			result += this.charsReplacements[ this.chars.indexOf(encryptedData.charAt(i)) ];
		}
		return result;
	}


	/**
	 * Decrypts a message
	 * 
	 * @param data 
	 * @returns 
	 */
	public async decrypt(encryptedData:string):Promise<string> {
		if(!encryptedData) return "";
		let result = "";
		for(let i=0; i < encryptedData.length; i++) {
			result += this.chars[ this.charsReplacements.indexOf(encryptedData.charAt(i)) ];
		}

		const decryptedData = await this.decryptData(result, this._cypherKey);
		return decryptedData || encryptedData;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private initialize():void {
		let safeChars = this.charsReplacements;
		safeChars = safeChars.replace(/\[/gi, "\\[");
		safeChars = safeChars.replace(/\]/gi, "\\]");
		this.regMatch = new RegExp("["+safeChars+"]", "g");
		const key = Store.get("cypherKey");
		if(key) this._cypherKey = key;
	}

    private getPasswordKey (password:string):Promise<CryptoKey> {
		return window.crypto.subtle.importKey("raw", this.enc.encode(password), "PBKDF2", false, [
			"deriveKey",
		]);
	}

    private deriveKey(passwordKey:CryptoKey, salt:ArrayBuffer, keyUsage:KeyUsage[]):Promise<CryptoKey> {
		return window.crypto.subtle.deriveKey(
			{
				name: "PBKDF2",
				salt: salt,
				iterations: 250000,
				hash: "SHA-256",
			},
			passwordKey,
			{ name: "AES-GCM", length: 256 },
			false,
			keyUsage
		);
	}

    private async encryptData(secretData:string, password:string) {
        try {
            const salt = window.crypto.getRandomValues(new Uint8Array(16));
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const passwordKey = await this.getPasswordKey(password);
            const aesKey = await this.deriveKey(passwordKey, salt, ["encrypt"]);
            const encryptedContent = await window.crypto.subtle.encrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                },
                aesKey,
                this.enc.encode(secretData)
            );

            const encryptedContentArr = new Uint8Array(encryptedContent);
            const buff = new Uint8Array(
                salt.byteLength + iv.byteLength + encryptedContentArr.byteLength
            );
            buff.set(salt, 0);
            buff.set(iv, salt.byteLength);
            buff.set(encryptedContentArr, salt.byteLength + iv.byteLength);
            const base64Buff = this.buff_to_base64((buff as unknown) as number[]);
            return base64Buff;
        } catch (e) {
            //console.log(`Error - ${e}`);
            return "";
        }
    }

    private async decryptData(encryptedData:string, password:string) {
        try {
            const encryptedDataBuff = this.base64_to_buf(encryptedData);
            const salt = encryptedDataBuff.slice(0, 16);
            const iv = encryptedDataBuff.slice(16, 16 + 12);
            const data = encryptedDataBuff.slice(16 + 12);
            const passwordKey = await this.getPasswordKey(password);
            const aesKey = await this.deriveKey(passwordKey, salt, ["decrypt"]);
            const decryptedContent = await window.crypto.subtle.decrypt(
                {
                    name: "AES-GCM",
                    iv: iv,
                },
                aesKey,
                data
            );
            return this.dec.decode(decryptedContent);
        } catch (e) {
            //console.log(`Error - ${e}`);
            return "";
        }
    }
}