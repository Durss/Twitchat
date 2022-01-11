/**
 * Fallback to sessionStorage if localStorage isn't available
 * Created : 18/10/2020 
 */
export default class Store {

	private static store:Storage;
	private static dataPrefix:string = "twitchat_";
	
	
	/********************
	* GETTER / SETTERS *
	********************/
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public static get(key:string):string {
		if(!this.store) this.init();
		return this.store.getItem(this.dataPrefix + key) as string;
	}
	public static set(key:string, value:string):void {
		if(!this.store) this.init();
		this.store.setItem(this.dataPrefix + key, value);
	}
	public static remove(key:string):void {
		if(!this.store) this.init();
		this.store.removeItem(this.dataPrefix + key);
	}
	public static clear():void {
		if(!this.store) this.init();
		this.store.clear();
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private static init():void {
		this.store = localStorage? localStorage : sessionStorage;
	}
}