import { RouteLocation } from 'vue-router';
import store from '../store';

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
		if (!url) url = window.location.href;
		name = name.replace(/[[]]/g, "\\$&");
		const regex = new RegExp("[#?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}

	public static secondsToInputValue(seconds: number): string {
		const h = Math.floor(seconds / 3600000);
		const m = Math.floor((seconds - h * 3600000) / 60000);
		const s = Math.round((seconds - h * 3600000 - m * 60000) / 1000);
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

	/**
	 * Parse all matched routes from last to first to check
	 * for a meta prop and return it.
	 * 
	 * @param route 
	 * @param metaKey 
	 */
	public static getRouteMetaValue(route:RouteLocation, metaKey:string):unknown {
		let res = null;
		for (let i = route.matched.length-1; i >= 0; i--) {
			const v = route.matched[i].meta[metaKey];
			if(v === undefined) continue;
			res = v;
			break;
		}
		return res;
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
		return text.replace(/([-a-zA-Z0-9@:%_+.~#?&//=]{2,256})(\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_+.~#?&//=]*)?)/gi, "<a href='$1$2' target='"+target+"'>$1$2</a>");
	}

	public static formatDuration(millis: number): string {
		let res = this.secondsToInputValue(millis);
		const days = Math.floor(millis / (24 * 3600*1000));
		if(days > 1) {
			res = days+"j "+res;
		}
		return res;
	}
}