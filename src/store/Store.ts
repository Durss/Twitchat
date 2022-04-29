import Config from "@/utils/Config";
import { JsonValue } from "type-fest";
import store from ".";

/**
 * Fallback to sessionStorage if localStorage isn't available
 * Created : 18/10/2020 
 */
export default class Store {

	private static store:Storage;
	private static dataPrefix:string = "twitchat_";
	private static saveTO:number = -1;
	private static rawStore:{[key:string]:(JsonValue|unknown)} = {};
	
	
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

	public static getAll():{[key:string]:string|null} {
		if(!this.store) this.init();
		const props:{[key:string]:string|null} = {};
		for (let i = 0; i < this.store.length; i++) {
			const key = this.store.key(i);
			if(!key || key.indexOf(this.dataPrefix) == -1) continue;
			const k = key.replace(this.dataPrefix, "");
			props[k] = this.store.getItem(key);
		}
		return props;
	}

	public static set(key:string, value:JsonValue|unknown):void {
		if(!this.store) this.init();
		if(!value) return;
		this.rawStore[key] = value;
		this.store.setItem(this.dataPrefix + key, JSON.stringify(value));
		this.save();
	}

	public static remove(key:string):void {
		if(!this.store) this.init();
		this.store.removeItem(this.dataPrefix + key);
		this.save();
	}

	public static clear():void {
		if(!this.store) this.init();
		//Remove only the data with the proper prefix
		for (let i = 0; i < this.store.length; i++) {
			const key = this.store.key(i);
			if(!key || key.indexOf(this.dataPrefix) == -1) continue;
			this.store.removeItem(key);
		}
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
	private static init():void {
		this.store = localStorage? localStorage : sessionStorage;

		const items = this.getAll();
		for (const key in items) {
			try{
				items[key] = JSON.parse(items[key] as string);
			}catch(error) {
				//parsing failed, that's because it's a simple string, just keep it
			}
		}
		this.rawStore = items
		this.save();
	}

	private static save():void {
		clearTimeout(this.saveTO);
		const access_token = store.state.oAuthToken?.access_token;
		if(!access_token) return;
		
		this.saveTO = setTimeout(async () => {
			let json = {
				access_token,
				data:this.rawStore,
			};
			const res = await fetch(Config.API_PATH+"/user", {method:"POST", body:JSON.stringify(json)});
			json = await res.json();
		}, 1000);
	}
}