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
}