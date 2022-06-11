import router from '@/router';
import Store from '@/store/Store';
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
	 * Shuffles an array
	 * Modifies the original array
	 */
	public static shuffle<T>(a: T[]): T[] {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	/**
	 * Get a random GUID
	 * 
	 * @returns 
	 */
	public static guid():string {
		return  ([1e7].toString()+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(parseInt(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> parseInt(c) / 4).toString(16));
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
		let res = text.replace(/(?:(?:http|ftp|https):\/\/)?((?:[\w_-]+(?:(?:\.[\w_-]+)+))(?:[\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-]))/gi, "<a href='$1' target='"+target+"'>$1</a>");
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
		const allowedUsers = permissions?.users?.toLowerCase().split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9_]+/gi);//Split users by non-alphanumeric characters
		const mod = user.badges?.moderator != undefined;
		const vip = user.badges?.vip != undefined;
		const sub = user.badges?.subscriber != undefined;
		const broadcaster = user.badges?.broadcaster != undefined;
		const allowed = (permissions.mods && mod) ||
						(permissions.vips && vip) ||
						(permissions.subs && sub) ||
						permissions.all ||
						broadcaster ||
						allowedUsers?.indexOf((user.username as string).toLowerCase()) != -1;
		return allowed;
	}

	/**
	* getLessVars parses your LESS variables to Javascript (provided you make a dummy node in LESS)
	* @param {String} id The CSS-id your variables are listed under.
	* @param {Boolean} [parseNumbers=true] Try to parse units as numbers.
	* @return {Object} A value object containing your LESS variables.
	* @example
	* LESS:
	* 	@myLessVariable: 123px;
	* 	#dummyLessId { width: @myLessVariable; }
	* Javascript:
	* 	getLessVars('dummyLessId');
	* returns:
	* 	{myLessVariable:123}
	*/
	private static cachedVars:{[key:string]:string|number}|null = null;
	public static getLessVars(id:string = "lessVars", parseNumbers: boolean = true): {[key:string]:string|number} {
		if(this.cachedVars) return this.cachedVars;

		const bNumbers:boolean = parseNumbers === undefined ? true : parseNumbers;
		const oLess:{[key:string]:string|number} = {}
		const rgId:RegExp = /#[\w-]+/
		const rgKey:RegExp = /\.([\w-]+)/
		const rgUnit:RegExp = /[a-z]+$/
		const aUnits:string[] = 'em,ex,ch,rem,vw,vh,vmin,cm,mm,in,pt,pc,px,deg,grad,rad,turn,s,ms,Hz,kHz,dpi,dpcm,dppx'.split(',')
		const rgValue:RegExp = /:\s?(.*)\s?;\s?\}/
		const rgStr:RegExp = /^'([^']+)'$/
		const sId:string = '#' + id
		const oStyles = document.styleSheets;
		for (let i = 0, l = oStyles.length; i < l; i++) {
			let oRules:CSSRuleList;
			try { oRules = (oStyles[i]).cssRules; }
			catch (e) { continue; }
			if (oRules) {
				for (let j = 0, k = oRules.length; j < k; j++) {
					let sRule:string;
					try { sRule = oRules[j].cssText; }
					catch (e) { continue; }
					const aMatchId = sRule.match(rgId);
					if (aMatchId && aMatchId[0] == sId) {
						const aKey = sRule.match(rgKey);
						const aVal = sRule.match(rgValue);
						if (aKey && aVal) {
							const sKey:string = aKey[1];
							let oVal:string|number = aVal[1];
							let aUnit:RegExpMatchArray | null
							let aStr:RegExpMatchArray | null;
							if (bNumbers && (aUnit = oVal.match(rgUnit)) && aUnits.indexOf(aUnit[0]) !== -1) {
								oVal = parseFloat(oVal);
							} else {
								aStr = oVal.match(rgStr)
								if(aStr) oVal = aStr[1];
							}
							oLess[sKey] = oVal;
						}
					}
				}
			}
		}
		this.cachedVars = oLess;
		return oLess;
	}

	public static getOverlayURL(id:string):string {
		const port = Store.get("obsPort");
		const pass = Store.get("obsPass");
		const ip = Store.get("obsIP");
		const params = new URLSearchParams()
		params.append("obs_port", port);
		params.append("obs_pass", pass);
		params.append("obs_ip", ip);
		return document.location.origin + router.resolve({name:"overlay", params:{id}}).fullPath + "?" + params.toString();
	}
}