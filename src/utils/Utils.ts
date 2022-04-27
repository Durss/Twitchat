import { ChatUserstate } from 'tmi.js';
import store, { PermissionsData } from '../store';

/**
 * Created by Durss
 */
export default class Utils {
		
	/**
	 * Picks random entry
	 *
	 * @param a
	 */
	public static pickRand<T>(a:T[]):T {
		return a[ Math.floor(Math.random() * a.length) ];
	}


	/**
	 * Opens up a confirm window so the user can confirm or cancel an action.
	 */
	public static confirm<T>(title: string,
		description?: string,
		data?: T,
		yesLabel?:string,
		noLabel?:string): Promise<T|undefined> {
		const prom = <Promise<T|undefined>>new Promise((resolve, reject) => {
			const confirmData = {
				title,
				description,
				yesLabel,
				noLabel,
				confirmCallback : () => {
					resolve(data);
				},
				cancelCallback : () => {
					reject(data);
				}
			}
			store.dispatch("confirm", confirmData);
		});
		prom.catch(():void => {/*ignore*/ });//Avoid uncaugh error if not catched externally
		return prom;
	}


	/**
	 * Copies a text to clipboard
	 */
	public static copyToClipboard(text: string): void {
		const el = document.createElement('textarea');
		el.value = text;
		el.setAttribute('readonly', '');
		el.style.position = 'absolute';
		el.style.left = '-9999px';
		document.body.appendChild(el);
		const sel = document.getSelection();
		const selected =
			sel && sel.rangeCount > 0
				? document.getSelection()?.getRangeAt(0)
				: false;
		el.select();
		document.execCommand('copy');
		document.body.removeChild(el);
		if (selected && sel) {
			sel.removeAllRanges();
			sel.addRange(selected);
		}
	}

	public static getQueryParameterByName(name:string, url?:string):string|null {
		if(!url) url = document.location.search;
		return new URLSearchParams(url).get(name);
		// if (!url) url = window.location.href;
		// name = name.replace(/[[]]/g, "\\$&");
		// const regex = new RegExp("[#?&]" + name + "(=([^&#]*)|&|#|$)"),
		// 	results = regex.exec(url);
		// if (!results) return null;
		// if (!results[2]) return '';
		// return decodeURIComponent(results[2].replace(/\+/g, " "));
	}

	public static secondsToInputValue(seconds: number): string {
		const h = Math.floor(seconds / 3600000);
		const m = Math.floor((seconds - h * 3600000) / 60000);
		const s = Math.floor((seconds - h * 3600000 - m * 60000) / 1000);
		let res = this.toDigits(s);
		if(m > 0 || h > 0) res = this.toDigits(m) + ":" + res;
		if(h > 0) res = this.toDigits(h) + ":" + res;
		return res;
	}

	public static promisedTimeout(delay: number): Promise<void> {
		return new Promise(function (resolve) {
			setTimeout(() => resolve(), delay);
		})
	}

	public static toDigits(num:number, digits:number = 2):string {
		let res = num.toString();
		while(res.length < digits) res = "0"+res;
		return res;
	}

	/**
	 * Turns text url into <a> tags
	 * @param text 
	 * @returns 
	 */
	public static parseURLs(text:string, target:string = "_blank"):string {
		let res = text.replace(/([-a-zA-Z0-9@:%_+.~#?&/=]{2,256}\.[a-z]{2,10}\b(\/[-a-zA-Z0-9@:%_+.~#?&//=]*)?)/gi, "<a href='$1' target='"+target+"'>$1</a>");
		res = res.replace(/href='(?!https?)(\/\/)?(.*?)'/gi, "href='https://$2'");
		// res = res.replace(/(\.|,)$/gi, "");
		return res;
	}

	public static formatDuration(millis: number): string {
		let res = this.secondsToInputValue(millis);
		const days = Math.floor(millis / (24 * 3600*1000));
		if(days > 1) {
			res = days+"j "+res;
		}
		return res;
	}

	/**
	 * Converts an RGB color to HSL
	 * @returns h:360 - s:0-1 - l:0-1
	 */
	public static rgb2hsl(color:number):{h:number,s:number,l:number} {
		const r:number = (color >> 16 & 0xff) / 0xff;
		const g:number = (color >> 8 & 0xff) / 0xff;
		const b:number = (color & 0xff) / 0xff;
		const v = Math.max(r,g,b), c=v-Math.min(r,g,b), f=(1-Math.abs(v+v-c-1)); 
		const h = c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c)); 
		return {h:60*(h<0?h+6:h), s:f ? c/f : 0, l:(v+v-c)/2};
	}

	/**
	 * Converts an HTSL color to RGB
	 * @param h 0-360
	 * @param s 0-1
	 * @param l 0-1
	 * @returns 
	 */
	public static hsl2rgb(h:number,s:number,l:number):number {
		const a = s*Math.min(l,1-l);
		const f = (n:number,k:number=(n+h/30)%12) => l - a*Math.max(Math.min(k-3,9-k,1),-1);
		return ((f(0)*0xff)<<16) | ((f(8)*0xff)<<8) | (f(4)*0xff);
	}

	/**
	 * Check if a user matches a permission criterias
	 */
	public static checkPermissions(permissions:PermissionsData, user:ChatUserstate):boolean {
		const allowedUsers = permissions?.users?.toLowerCase().split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]+/gi);//Split users by non-alphanumeric characters
		const mod = user.badges?.moderator != undefined
		const vip = user.badges?.vip != undefined
		const sub = user.badges?.subscriber != undefined
		return permissions.mods && mod ||
			permissions.vips && vip ||
			permissions.subs && sub ||
			user.badges?.broadcaster != undefined ||
			permissions.all ||
			allowedUsers?.indexOf((user.username as string).toLowerCase()) != -1
	}
}