/**
* Created : 20/07/2023 
*/
export default class Utils {
	
	public static getUUID():string {
		var w = () => { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); }
		return  `${w()}${w()}-${w()}-${w()}-${w()}-${w()}${w()}${w()}`;
	}
}