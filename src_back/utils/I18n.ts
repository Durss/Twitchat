import { Locale, LocaleString } from "discord.js";
import * as fs from "fs";
import * as path from "path";
import Config from "./Config";
//@ts-ignore avoid compile error I couldn't manage to fix properly
import labels from "../../static/labels.json";

/**
* Created : 24/02/2024 
*/
export default class I18n {

	private static _instance:I18n;
	private _labels:typeof labels;
	
	constructor() {
	
	}
	
	/********************
	* GETTER / SETTERS *
	********************/
	static get instance():I18n {
		if(!I18n._instance) {
			I18n._instance = new I18n();
		}
		return I18n._instance;
	}

	/**
	 * Get available languages
	 */
	public get discordLanguages():{discord:LocaleString, labels:string}[] {
		let result:{discord:LocaleString, labels:string}[] = [];
		const langs = Object.keys(this._labels);
		langs.forEach(lang=> {
			const code = I18n.instance.get(lang, "global.lang");
			for (const key in Locale) {
				if(Locale[key] === code || Locale[key] == lang) {
					result.push({discord:Locale[key], labels:lang});
				}
			}
		});
		return result;
	}
	
	
	
	/******************
	* PUBLIC METHODS *
	******************/
	public initialize():void {
		this._labels = JSON.parse(fs.readFileSync(path.join(Config.PUBLIC_ROOT, "labels.json"), "utf-8")) as typeof labels;
	}

	/**
	 * Get given label from given language
	 */
	public get(lang:string | keyof typeof labels, path:Path<typeof labels.en>, replaces?:{[key:string]:string}):string {
		const keys = path.split(".");
		let root:any = this._labels[lang];
		try {
			for (let i = 0; i < keys.length; i++) {
				root = root[keys[i]];
			}
		}catch(error){}
		if(!root) {
			if(lang != "en") {
				return this.get("en", path, replaces);
			}else{
				return "[missing label for language "+lang+": "+path+" ]";
			}
		}

		if(replaces) {
			for (const key in replaces) {
				root = root.replace(new RegExp("\{"+key+"\}", "gi"), replaces[key]);
			}
		}

		return root;
	}

	/**
	 * Get if given label exists for given language
	 */
	public exists(lang:string | keyof typeof labels, path:Path<typeof labels.en>, replaces?:{[key:string]:string}):boolean {
		const keys = path.split(".");
		let root:any = this._labels[lang];
		try {
			for (let i = 0; i < keys.length; i++) {
				root = root[keys[i]];
			}
		}catch(error){}

		return root != undefined;
	}
	
	
	
	/*******************
	* PRIVATE METHODS *
	*******************/
}

/**
 * Util to strongly type string object paths.
 */
type Path<T> = T extends Array<infer U>
? U extends object
? `${number}.${Path<U>}`
: `${number}`
: T extends object
? {
	[P in keyof T]: (P & string) | `${P & string}.${Path<T[P]>}`
}[keyof T]
: never;