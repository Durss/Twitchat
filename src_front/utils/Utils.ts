import DataStore from '@/store/DataStore';
import StoreProxy from '@/store/StoreProxy';
import { TwitchatDataTypes } from '@/types/TwitchatDataTypes';
import { evaluate as MathEval } from 'mathjs';
import type { JsonObject } from 'type-fest';
import PublicAPI from './PublicAPI';

/**
 * Created by Durss
 */
export default class Utils {

	public static CURRENCY_AMOUNT_TOKEN = "{AMOUNT}";

	/**
	 * Formats a currency amount
	 * @param amount
	 * @param pattern must contain Utils.CURRENCY_AMOUNT_TOKEN token
	 * @returns
	 */
	public static formatCurrency(amount:number, pattern:string):string {
		return pattern.replace(Utils.CURRENCY_AMOUNT_TOKEN, (Math.round(amount*10)/10).toString());
	}

	/**
	 * Check if user browser them is light mode
	 */
	public static get isLightMode():boolean {
		return document.body.classList.contains("light");
	}

	/**
	 * Generates a random UUID
	 */
	public static getUUID():string {
		let uuid = "";
		try {
			if(crypto.randomUUID) {
				uuid = crypto.randomUUID();
			}
		} catch (error) {}
		if(!uuid) {
			const chars = "0123456789abcdef";
			for (let i = 0; i < 36; i++) {
				if (i === 8 || i === 13 || i === 18 || i === 23) {
					uuid += "-";
				} else if (i === 14) {
					uuid += "4";
				} else {
					const randomNum = Math.floor(Math.random() * chars.length);
					uuid += chars[randomNum];
				}
			}
		}
		return uuid;
	}

	/**
	 * Strip HTML tags from a string
	 */
	public static stripHTMLTags(message:string):string {
		// return message.replace(/<\/?\w+(?:\s+[^\s/>"'=]+(?:\s*=\s*(?:".*?[^"\\]"|'.*?[^'\\]'|[^\s>"']+))?)*?>/gim, "");//Strip HTML tags

		//The following 2 replace() are twice more efficient than the single one above
		//with the same effect as long as no HTML tags are defined on an attribute other
		//than data attributes (ex: data-xxx='lorem ipsum')
		message = message.replace(/data-.*?=".*?"/gim, "");//Strip data-attributes that can contain HTML
		return message.replace(/<[^>]*>/gim, "");//Strip HTML tags;
	}

	/**
	 * Picks random entry
	 *
	 * @param a
	 * @param removeFromSource
	 */
	public static pickRand<T>(a:T[], removeFromSource:boolean = false):T {
		const index = Math.floor(Math.random() * a.length);
		const res = a[index]!;
		if(removeFromSource) a.splice(index, 1);
		return res;
	}

	/**
	 * Shuffles an array
	 * Modifies the original array
	 */
	public static shuffle<T>(a: T[]): T[] {
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i]!, a[j]!] = [a[j]!, a[i]!];
		}
		return a;
	}

	/**
	 * Copies a text to clipboard
	 */
	public static async copyToClipboard(text: string): Promise<void> {
		try {
			await navigator.clipboard.writeText(text);
		}catch(error) {
			//Fallback to old shitty solution for OBS as they did not allow
			//the native way on chromium params when embedding it to OBS
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

	public static promisedTimeout(delay: number): Promise<void> {
		return new Promise(function (resolve) {
			window.setTimeout(() => resolve(), delay);
		})
	}

	public static toDigits(num:number, digits = 2):string {
		let res = num.toString();
		while(res.length < digits) res = "0"+res;
		return res;
	}

	/**
	 * Turns text url into &lt;a&gt; tags
	 * @param text
	 * @returns
	 */
	public static parseURLs(text:string, target:string = "_blank", replaceBy:string = ""):string {
		const replace = replaceBy.length > 0? replaceBy :"<a href='$1' target='"+target+"'>$1</a>";
		let res = text.replace(/(?:(?:http|ftp|https):\/\/)?((?:[\w_-]+(?:(?:\.[\w_-]+)+))(?:[\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-]))/gi, replace);
		if(replaceBy.length === 0) {
			res = res.replace(/href='(?!https?)(\/\/)?(.*?)'/gi, "href='https://$2'");
		}
		return res;
	}

	/**
	 * Format a duration
	 *
	 * @param millis
	 * @returns
	 */
	public static formatDuration(millis: number, forceMinutes:boolean = false, daysLabel?:string): string {
		const d_ms = 24 * 3600 * 1000;
		const h_ms = 3600 * 1000;
		const m_ms = 60 * 1000;
		const d = Math.floor(millis / d_ms);
		const h = Math.floor((millis - d * d_ms) / h_ms);
		const m = Math.floor((millis - d * d_ms - h * h_ms) / m_ms);
		const s = Math.floor((millis - d * d_ms - h * h_ms - m * m_ms) / 1000);
		let res = this.toDigits(s);
		if(m > 0 || h > 0 || forceMinutes) res = this.toDigits(m) + ":" + res;
		if(h > 0) res = this.toDigits(h) + ":" + res;
		if(d > 0) res = d + (daysLabel || StoreProxy.i18n.t("global.date_days")) + " " + res;
		return res;
	}

	/**
	 * Formats a date
	 *
	 * @param date
	 * @param addTime
	 * @returns
	 */
	public static formatDate(date:Date, addTime:boolean = true, noDate:boolean = false, elapsedMode:boolean = true):string {
		let res = "";
		if(!noDate && (!elapsedMode || (date.getTime() - Date.now() < 24 * 3600 * 1000))) {
			res = Utils.toDigits(date.getDate())+ "/"
				+ Utils.toDigits(date.getMonth() + 1) + "/"
				+ date.getFullYear()
		}
		if(addTime) {
			if(!noDate) res  += " "
			res += Utils.toDigits(date.getHours()) + "h"
				+ Utils.toDigits(date.getMinutes());
		}
		return res;
	}


	/**
	 * Returns the number of seconds, minutes, hours or days that past
	 * since the given date
	 */
	public static elapsedDuration(date:number, step?:number, daysLabel?:string) {
		let elapsed = Date.now() - date;
		const duration = step? step : elapsed < 60000? 1000 : elapsed < 60000*5? 5000 : elapsed < 60000*10? 10000 : 60000;

		//Round value to nearest update step to avoid having durations with random offsets
		elapsed = Math.floor(elapsed/duration) * duration;

		let time = "";
		if(elapsed < 60000) {
			time = "00:"+Utils.toDigits( Math.round(elapsed/1000) );
		}else
		if(elapsed < 60 * 60000) {
			const minutes = Math.floor(elapsed/60000);
			time = Utils.toDigits(minutes) + ":";
			time += Utils.toDigits( Math.round((elapsed - minutes*60000)/1000) );
		}else
		if(elapsed < 24 * 60 * 60000) {
			const hours = Math.floor(elapsed/(60 * 60000));
			time = hours + "h";
			time += Utils.toDigits( Math.round((elapsed - hours*(60 * 60000))/60000) );
		}else{
			const days = Math.floor(elapsed/(24 * 60 * 60000));
			time = days + (daysLabel || StoreProxy.i18n.t("global.date_days"))
		}
		return time;
	}

	/**
	 * Converts an RGB color to HSL
	 * @returns h:0-360 - s:0-1 - l:0-1
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
	 * Converts an HSL color to RGB
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
	 * Converts an RGB color to HSV
	 * @returns h:0-360 - s:0-1 - l:0-1
	 */
	public static rgb2hsv(color:number):{h:number,s:number,v:number} {
		const r:number = (color >> 16 & 0xff) / 0xff;
		const g:number = (color >> 8 & 0xff) / 0xff;
		const b:number = (color & 0xff) / 0xff;
		const v=Math.max(r,g,b), c=v-Math.min(r,g,b);
		const h= c && ((v==r) ? (g-b)/c : ((v==g) ? 2+(b-r)/c : 4+(r-g)/c));
		return {h:60*(h<0?h+6:h), s:v&&c/v, v};
	}

	/**
	 * Converts an HSV color to RGB
	 * @param h 0-360
	 * @param s 0-1
	 * @param l 0-1
	 * @returns
	 */
	public static hsv2rgb(h:number,s:number,v:number):number {
		const f= (n:number,k=(n+h/60)%6) => v - v*s*Math.max( Math.min(k,4-k,1), 0);
		return f(5)<<16 | f(3)<<8 | f(1);
	}

	/**
	 * Check if a user matches a permission criterias
	 */
	public static async checkPermissions(permissions:TwitchatDataTypes.PermissionsData, user:Pick<TwitchatDataTypes.TwitchatUser, "platform" | "id" | "login" | "channelInfo">, channelId:string, logToConsole:boolean = false):Promise<boolean> {
		const chanInfo = user.channelInfo[channelId];
		if(!chanInfo) return false;

		if(logToConsole) {
			console.log("checkPermissions", permissions, user, channelId, chanInfo);
		}

		if(permissions.usersAllowed && permissions.usersAllowed.findIndex(v=>v.toLowerCase() === user.login.toLowerCase()) > -1) {
			if(logToConsole) console.log("User specifically allowed")
				return true;
		}

		if(permissions.usersRefused && permissions.usersRefused.findIndex(v=>v.toLowerCase() === user.login.toLowerCase()) > -1) {
			if(logToConsole) console.log("User specifically refused")
			return false;
		}

		if(logToConsole) {
			console.log(chanInfo.is_broadcaster, permissions.broadcaster !== false);
			console.log(chanInfo.is_moderator, permissions.mods !== false, !chanInfo.is_broadcaster);
			console.log(chanInfo.is_vip, permissions.vips !== false);
			console.log(chanInfo.is_subscriber, permissions.subs !== false, !chanInfo.is_broadcaster);
			console.log(chanInfo.is_following, permissions.follower);
		}
		if(chanInfo.is_broadcaster && permissions.broadcaster !== false) return true;
		if(chanInfo.is_moderator && permissions.mods !== false && !chanInfo.is_broadcaster) return true;
		if(chanInfo.is_vip && permissions.vips !== false) return true;
		// if(permissions.subs === true && chanInfo.is_subscriber === undefined) {
			// await StoreProxy.users.isSub
		// }
		if(chanInfo.is_subscriber && permissions.subs !== false && !chanInfo.is_broadcaster) return true;

		if(permissions.follower === true && !chanInfo.is_broadcaster) {
			//Follower state not loaded yet, force its loading
			try {
				if(chanInfo.is_following === null) await StoreProxy.users.checkFollowerState(user, channelId);
			}catch(error) {
				//ignore
			}

			if(chanInfo.is_following === true) {
				const duration = Date.now() - (chanInfo.following_date_ms ?? 0);
				return duration >= (permissions.follower_duration_ms ?? 0);
			}
		}

		return permissions.all;

		//Refactoring attempt
		/*
		let flags = 0;
		//bit 0 = sub
		//bit 1 = follower
		//bit 2 = VIP
		//bit 3 = moderator
		//bit 4 = broadcaster
		if(chanInfo.is_subscriber)	flags |= 1<<0;
		if(chanInfo.is_following)	flags |= 1<<1;
		if(chanInfo.is_vip)			flags |= 1<<2;
		if(chanInfo.is_moderator)	flags |= 1<<3;
		if(chanInfo.is_broadcaster)	flags |= 1<<4;

		if(flags >> 4 == 1 && permissions.broadcaster === false)	return false;
		//Refuse access if EXCLUSIVELY matching a refused role
		if(flags == 0b01000 && permissions.mods === false)			return false;
		if(flags == 0b00100 && permissions.vips === false)			return false;
		if(flags == 0b00010 && permissions.follower === false)		return false;
		if(flags == 0b00001 && permissions.subs === false)			return false;

		if(chanInfo.is_following && permissions.follower === true) {
			const duration = Date.now() - chanInfo.following_date_ms;
			return duration >= permissions.follower_duration_ms;
		}

		return permissions.all || flags > 0;
		//*/

		//Old behavior
		/*
		const allowed = (permissions.mods && user.channelInfo[channelId].is_moderator) ||
						(permissions.vips && user.channelInfo[channelId].is_vip) ||
						(permissions.subs && user.channelInfo[channelId].is_subscriber) ||
						(permissions.broadcaster !== false && user.channelInfo[channelId].is_broadcaster) ||//checking "!== false" so "undefined" counts as "true" as this prop has been added later and i want it to count as "true" by default
						permissions.all ||
						allowedUsers?.indexOf(user.login.toLowerCase()) != -1;
		return allowed;
		//*/
	}

	/**
	 * Computes distance between two strings
	 *
	 * @param a
	 * @param b
	 * @returns {number}
	 */
	public static levenshtein(a:string, b:string):number {
		if(a.length == 0) return b.length;
		if(b.length == 0) return a.length;

		const matrix:number[][] = [];
		a = this.replaceDiacritics(a);
		b = this.replaceDiacritics(b);

		// increment along the first column of each row
		let i:number;
		for(i = 0; i <= b.length; i++){
			matrix[i] = [i];
		}

		// increment each column in the first row
		let j:number;
		for(j = 0; j <= a.length; j++){
			matrix[0]![j] = j;
		}

		// Fill in the rest of the matrix
		for(i = 1; i <= b.length; i++){
			for(j = 1; j <= a.length; j++){
				if(b.charAt(i-1) == a.charAt(j-1)){
					matrix[i]![j] = matrix[i-1]![j-1]!;
				} else {
					matrix[i]![j] = Math.min(matrix[i-1]![j-1]! + 1, // substitution
						Math.min(matrix[i]![j-1]! + 1, // insertion
							matrix[i-1]![j]! + 1)); // deletion
				}
			}
		}

		// Logger.log("Levenshtein",a,b,matrix[b.length][a.length])
		return matrix[b.length]![a.length]!;
	}

	/**
	 * Removes diacritics chars from a string and replaces them by their equivalent.
	 *
	 * @param str
	 * @returns {string|any|void}
	 */
	public static replaceDiacritics(str:string):string {
		if(!this.diacriticsMap) this.initDiacritics();
		return str.replace(/[^\u0000-\u007E]/g, (a) => {
			return this.diacriticsMap[a] || a;
		});
	}


	private static defaultDiacriticsRemovalMap = [
		{
			'base': 'A',
			'letters': '\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F'
		},
		{'base': 'AA', 'letters': '\uA732'},
		{'base': 'AE', 'letters': '\u00C6\u01FC\u01E2'},
		{'base': 'AO', 'letters': '\uA734'},
		{'base': 'AU', 'letters': '\uA736'},
		{'base': 'AV', 'letters': '\uA738\uA73A'},
		{'base': 'AY', 'letters': '\uA73C'},
		{'base': 'B', 'letters': '\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181'},
		{'base': 'C', 'letters': '\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E'},
		{
			'base': 'D',
			'letters': '\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779\u00D0'
		},
		{'base': 'DZ', 'letters': '\u01F1\u01C4'},
		{'base': 'Dz', 'letters': '\u01F2\u01C5'},
		{
			'base': 'E',
			'letters': '\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E'
		},
		{'base': 'F', 'letters': '\u0046\u24BB\uFF26\u1E1E\u0191\uA77B'},
		{
			'base': 'G',
			'letters': '\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E'
		},
		{
			'base': 'H',
			'letters': '\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D'
		},
		{
			'base': 'I',
			'letters': '\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197'
		},
		{'base': 'J', 'letters': '\u004A\u24BF\uFF2A\u0134\u0248'},
		{
			'base': 'K',
			'letters': '\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2'
		},
		{
			'base': 'L',
			'letters': '\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780'
		},
		{'base': 'LJ', 'letters': '\u01C7'},
		{'base': 'Lj', 'letters': '\u01C8'},
		{'base': 'M', 'letters': '\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C'},
		{
			'base': 'N',
			'letters': '\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4'
		},
		{'base': 'NJ', 'letters': '\u01CA'},
		{'base': 'Nj', 'letters': '\u01CB'},
		{
			'base': 'O',
			'letters': '\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C'
		},
		{'base': 'OI', 'letters': '\u01A2'},
		{'base': 'OO', 'letters': '\uA74E'},
		{'base': 'OU', 'letters': '\u0222'},
		{'base': 'OE', 'letters': '\u008C\u0152'},
		{'base': 'oe', 'letters': '\u009C\u0153'},
		{'base': 'P', 'letters': '\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754'},
		{'base': 'Q', 'letters': '\u0051\u24C6\uFF31\uA756\uA758\u024A'},
		{
			'base': 'R',
			'letters': '\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782'
		},
		{
			'base': 'S',
			'letters': '\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784'
		},
		{
			'base': 'T',
			'letters': '\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786'
		},
		{'base': 'TZ', 'letters': '\uA728'},
		{
			'base': 'U',
			'letters': '\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244'
		},
		{'base': 'V', 'letters': '\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245'},
		{'base': 'VY', 'letters': '\uA760'},
		{'base': 'W', 'letters': '\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72'},
		{'base': 'X', 'letters': '\u0058\u24CD\uFF38\u1E8A\u1E8C'},
		{
			'base': 'Y',
			'letters': '\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE'
		},
		{
			'base': 'Z',
			'letters': '\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762'
		},
		{
			'base': 'a',
			'letters': '\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250'
		},
		{'base': 'aa', 'letters': '\uA733'},
		{'base': 'ae', 'letters': '\u00E6\u01FD\u01E3'},
		{'base': 'ao', 'letters': '\uA735'},
		{'base': 'au', 'letters': '\uA737'},
		{'base': 'av', 'letters': '\uA739\uA73B'},
		{'base': 'ay', 'letters': '\uA73D'},
		{'base': 'b', 'letters': '\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253'},
		{'base': 'c', 'letters': '\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184'},
		{
			'base': 'd',
			'letters': '\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A'
		},
		{'base': 'dz', 'letters': '\u01F3\u01C6'},
		{
			'base': 'e',
			'letters': '\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD'
		},
		{'base': 'f', 'letters': '\u0066\u24D5\uFF46\u1E1F\u0192\uA77C'},
		{
			'base': 'g',
			'letters': '\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F'
		},
		{
			'base': 'h',
			'letters': '\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265'
		},
		{'base': 'hv', 'letters': '\u0195'},
		{
			'base': 'i',
			'letters': '\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131'
		},
		{'base': 'j', 'letters': '\u006A\u24D9\uFF4A\u0135\u01F0\u0249'},
		{
			'base': 'k',
			'letters': '\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3'
		},
		{
			'base': 'l',
			'letters': '\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747'
		},
		{'base': 'lj', 'letters': '\u01C9'},
		{'base': 'm', 'letters': '\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F'},
		{
			'base': 'n',
			'letters': '\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5'
		},
		{'base': 'nj', 'letters': '\u01CC'},
		{
			'base': 'o',
			'letters': '\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275'
		},
		{'base': 'oi', 'letters': '\u01A3'},
		{'base': 'ou', 'letters': '\u0223'},
		{'base': 'oo', 'letters': '\uA74F'},
		{'base': 'p', 'letters': '\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755'},
		{'base': 'q', 'letters': '\u0071\u24E0\uFF51\u024B\uA757\uA759'},
		{
			'base': 'r',
			'letters': '\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783'
		},
		{
			'base': 's',
			'letters': '\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B'
		},
		{
			'base': 't',
			'letters': '\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787'
		},
		{'base': 'tz', 'letters': '\uA729'},
		{
			'base': 'u',
			'letters': '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289'
		},
		{'base': 'v', 'letters': '\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C'},
		{'base': 'vy', 'letters': '\uA761'},
		{'base': 'w', 'letters': '\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73'},
		{'base': 'x', 'letters': '\u0078\u24E7\uFF58\u1E8B\u1E8D'},
		{
			'base': 'y',
			'letters': '\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF'
		},
		{'base': 'z', 'letters': '\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763'}
	];

	private static diacriticsMap:any = null;
	private static initDiacritics():void {
		this.diacriticsMap = {};
		for (const letters of this.defaultDiacriticsRemovalMap) {
			for (const letter of letters.letters) {
				this.diacriticsMap[letter] = letters.base;
			}
		}
	}

	/**
	 * Merges a remote data object into the local data object.
	 *
	 * @param data
	 */
	public static mergeRemoteObject(remote:JsonObject, local:JsonObject, log:boolean = false):void {
		if(!local || !remote) return;
		//If a data exists on the remote object, set it on the local object.
		//No need to do any cleanup as the server will clean any expired
		//or non-legitimate data
		for (const key in remote) {
			const v = remote[key];
			if(log) console.log(key, v);
			if(v == null) continue;

			if(Array.isArray(v)) {
				local[key] = v;

			}else
			if(typeof(v) == "object" && local.hasOwnProperty(key)) {
				if(log) console.log("Merge sub object", key);
				//Deep merge sub objects
				this.mergeRemoteObject(v as JsonObject, local[key] as JsonObject);

			}else{
				if(log) console.log("REPLACE");
				if(log) console.log(local[key]);
				if(log) console.log(v);
				local[key] = v;
			}
		}
	}

	/**
	 * Slugifies a string.
	 * Replace
	 * @param text
	 */
	public static slugify(text:string) {
		text = this.replaceDiacritics(text);
		return text.toString().toLowerCase().trim()
			.replace(/\s+/g, '-')        // Replace spaces with hyphens
			.replace(/[^\w-]+/g, '')    // Remove all non-word characters
			.replace(/--+/g, '-')      // Replace consecutive hyphens with a single hyphen
			.replace(/^-+/, '')          // Remove hyphens at the beginning of the string
			.replace(/-+$/, '');         // Remove hyphens at the end of the string
	}

	/**
	 * Test if given point coordinates is inside
	 * @param polygon
	 * @param px
	 * @param py
	 */
	public static isPointInsidePolygon(point:{x:number, y:number}, polygon:{x:number,y:number}[]) {
		let intersections = 0;
		const n = polygon.length;
		const px = point.x;
		const py = point.y;

		for (let i = 0; i < n; i++) {
			const x1 = polygon[i]!.x;
			const y1 = polygon[i]!.y;
			const x2 = polygon[(i + 1) % n]!.x;
			const y2 = polygon[(i + 1) % n]!.y;

			if ((y1 <= py && py < y2) || (y2 <= py && py < y1)) {
				if (px < (x2 - x1) * (py - y1) / (y2 - y1) + x1) {
					intersections++;
				}
			}
		}

		return intersections % 2 === 1;
	}

	/**
	 * Rotates a point around another arbitrary point
	 * @param point
	 * @param center
	 * @param angle_deg
	 */
	public static rotatePointAround(point:{x:number, y:number}, center:{x:number, y:number}, angle_deg:number):{x:number, y:number} {
		const angle_rad = angle_deg * Math.PI / 180;
		const { x, y } = point;
		const { x:cx, y:cy } = center;

		const cosTheta = Math.cos(angle_rad);
		const sinTheta = Math.sin(angle_rad);

		// Calculate the new coordinates
		const newX = cosTheta * (x - cx) - sinTheta * (y - cy) + cx;
		const newY = sinTheta * (x - cx) + cosTheta * (y - cy) + cy;

		return { x: newX, y: newY };
	}

	/**
	 * Computes SHA-256 hash of given input
	 * @param input
	 */
	public static async sha256(input:string):Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(input);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
		return hashHex;
	}

	/**
	 * Converts a file input to a base64 image
	 * @param input
	 */
	public static async fileToBase64Img(input:File):Promise<string> {
		return new Promise<string>((resolve, reject)=> {
			const img = new Image();
			img.onload = (event)=>{
				//Scale down image to a 32x32px image
				const size = 32;
				const sourceCanvas	= document.createElement("canvas");
				sourceCanvas.width	= size;
				sourceCanvas.height	= size;
				const sourceContext	= sourceCanvas.getContext('2d')!;
				sourceContext.drawImage(img, 0, 0, size, size);
				const base64Img = sourceCanvas.toDataURL();
				resolve(base64Img);
			};
			img.onerror = ()=>{
				StoreProxy.common.alert(StoreProxy.i18n.t("error.badge_file_loading_failed"));
			};
			img.src = URL.createObjectURL(input);
		})
	}

	/**
	 * Compare 2 semantic version number like "1.23.456"
	 * @param v1
	 * @param v2
	 * @returns true if v1 is greater than v2
	 */
	public static compareSementicVersion(v1:string, v2:string):boolean {
		const [major1, minor1, patch1] = v1.split(".").map(Number);
		const [major2, minor2, patch2] = v2.split(".").map(Number);

		if (major1 !== major2) return major1! > major2!;
		if (minor1 !== minor2) return minor1! > minor2!;
		return patch1! > patch2!;
	}

	/**
	 * Get a readable user's color
	 * @param user
	 */
	public static getUserColor(user:TwitchatDataTypes.TwitchatUser):string {
		let colorStr = user.color ?? "#ffffff";
		let color = 0xffffff;
		if(user.color) {
			color = parseInt(user.color.replace("#", ""), 16);
		}
		if(!Utils.isLightMode) {
			const hsl = Utils.rgb2hsl(color);
			const minL = .65;
			if(hsl.l < minL) {
				color = Utils.hsl2rgb(hsl.h, hsl.s, minL);
			}
			colorStr = color.toString(16);
		}else{
			const hsl = Utils.rgb2hsl(color);
			const maxL = .4;
			const minS = 1;
			if(hsl.l > maxL) {
				color = Utils.hsl2rgb(hsl.h, Math.max(hsl.s, minS), Math.min(hsl.l, maxL));
			}
			colorStr = color.toString(16);
		}
		while(colorStr.length < 6) colorStr = "0"+colorStr;
		colorStr = "#"+colorStr;
		return colorStr;
	}

	/**
	 * Starts a download session of a file
	 * @param data
	 * @param filename
	 * @param mimeType
	 */
	public static downloadFile(filename:string, data?:string, rawData?:string, mimeType:string = "application/json"):void {
		let url = rawData || "";
		if(data) {
			const blob = new Blob([data], { type: mimeType });
			url = window.URL.createObjectURL(blob);
		}
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	/**
	 * Unselects anything currently selected on the DOM
	 */
	public static unselectDom():void {
		const s = window.getSelection();
		if (s && s.rangeCount > 0) {
			for (let i = 0; i < s.rangeCount; i++) {
				s.removeRange(s.getRangeAt(i));
			}
		}
	}

	private static fontsCache:{fonts:string[], systemGranted:boolean}|null = null;
	/**
	 * Gets some of the available fonts
	 */
	public static async listAvailableFonts(requestPermission:boolean = false):Promise<{fonts:string[], systemGranted:boolean}> {
		if(this.fontsCache && this.fontsCache.fonts.length > 0 && !requestPermission) return this.fontsCache;

		await document.fonts.ready;

		const fontAvailable = new Set<string>();
		let systemGranted = false;
		if(requestPermission) {
			try {
				const fontList = await window.queryLocalFonts!();
				systemGranted = fontList.length > 0;
			}catch(error){
				//Refused fonts access. Not actually called apparently...
				systemGranted = false;
			}
		}

		try {
			const granted = await navigator.permissions.query(
				//@ts-ignore
				{ name: "local-fonts" }
			);
			if(granted.state == "granted") {
				(await window.queryLocalFonts!()).forEach(font=>{
					fontAvailable.add(font.postscriptName);
				})
				systemGranted = true;
			}
		}catch(error) {}

		if(fontAvailable.size === 0) {
			//Add standard fonts
			const fontCheck = new Set(['Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Impact', 'Times New Roman', 'Verdana'].sort());
			for (const font of fontCheck.values()) {
				if (document.fonts.check(`12px "${font}"`)) {
					fontAvailable.add(font);
				}else{
					console.log("Ignore", font);
				}
			}
		}

		//Add fonts loaded by the current page
		try {
			[...document.fonts.values()].forEach(f=> fontAvailable.add(f.family));
		}catch(error) {
			//old firefox browser version have issue with document.fonts not being an iterable
		}
		this.fontsCache = {fonts:[...fontAvailable.values()], systemGranted};
		return this.fontsCache;
	}

	/**
	 * Returns a seeded random generator.
	 * Just call the given function to get a new pseudo random number
	 * @param seed
	 * @returns
	 */
	public static seededRandom =(seed:number):()=>number => {
		return () => {
			seed |= 0;
			seed = seed + 0x9e3779b9 | 0;
			let t = seed ^ seed >>> 16;
			t = Math.imul(t, 0x21f0aaad);
			t = t ^ t >>> 15;
			t = Math.imul(t, 0x735a2d97);
			return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
		}
	}

	/**
	 * Deeply checks for differences between 2 arbitrary objects
	 * @param a
	 * @param b
	 * @returns
	 */
	public static deepEqual(a:unknown, b:unknown):boolean {
		if(a === b) return true;
		if(typeof a !== typeof b) return false;
		if(typeof a !== "object") return false;
		if(Array.isArray(a) !== Array.isArray(b)) return false;
		if(Array.isArray(a)) {
			if(a.length !== (b as any[]).length) return false;
			for (let i = 0; i < a.length; i++) {
				if(!this.deepEqual(a[i], (b as any[])[i])) return false;
			}
		}else{
			const keysA = Object.keys(a as Object);
			const keysB = Object.keys(b as Object);
			if(keysA.length !== keysB.length) return false;
			for (const key of keysA) {
				if(!this.deepEqual((a as any)[key], (b as any)[key])) return false;
			}
		}
		return true;
	}

	/**
	 * Make string "file name" safe by removing invalid characters
	 */
	public static makeFileSafe(str: string): string {
		// Remove or replace invalid filename characters
		return str
			// Replace characters invalid in Windows filenames
			.replace(/[<>:"/\\|?*]/g, '')
			// Replace spaces and dots with underscores
			// .replace(/[\s.]+/g, '_')
			// Remove non-printable characters
			.replace(/[^\x20-\x7E]/g, '')
			// Trim underscores and dashes from start/end
			.replace(/^[-_]+|[-_]+$/g, '')
			// Ensure the string is not empty
			|| 'unnamed';
	}

	/**
	 * Get all time record details of given custom train
	 * @param train
	 * @returns
	 */
	public static getAllTimeRecord(train:TwitchatDataTypes.CustomTrainData):{amount:number, amountFormatted:string, level:number, percent:number, date:Date, dateFormatted:string} | null {
		if(train && train.allTimeRecord) {
			const levels = train.levelAmounts.sort((a,b)=>a - b);
			let offset = 0;
			let goal = levels[0] || 0;
			let i = 0;
			for (i = 1; i < levels.length; i++) {
				const level = levels[i]!;
				if(level > train.allTimeRecord.amount || i === levels.length - 1) {
					offset = levels[i-1]!;
					goal = level - offset;
					break;
				}
			}
			return {
				level:i,
				amount:train.allTimeRecord.amount,
				amountFormatted:Utils.formatCurrency(train.allTimeRecord.amount, train.currency),
				percent:(train.allTimeRecord.amount - offset) / goal,
				date:new Date(train.allTimeRecord.date),
				dateFormatted:Utils.formatDate(new Date(train.allTimeRecord.date), false),
			}
		}
		return null;
	}

	/**
	 * Gets default permissions
	 * @returns
	 */
	public static getDefaultPermissions(broadcaster = true, mods = true, vips = true, subs = true, all = true, follower = true):TwitchatDataTypes.PermissionsData {
		return {
			broadcaster,
			mods,
			vips,
			subs,
			all,
			follower,
			follower_duration_ms:0,
			usersAllowed:[],
			usersRefused:[],
		}
	}
	
	/**
	 * Encrypt a message with a password using AES-GCM
	 * @param message 
	 * @param password 
	 * @returns base64 encoded encrypted data with IV prepended
	 */
	public static async encryptMessage(message: string, password: string): Promise<string> {
		// Convert password to key
		const passwordBuffer = new TextEncoder().encode(password);
		const passwordKey = await crypto.subtle.importKey(
			'raw',
			passwordBuffer,
			{ name: 'PBKDF2' },
			false,
			['deriveKey']
		);

		// Generate salt and derive key
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const key = await crypto.subtle.deriveKey(
			{
				name: 'PBKDF2',
				salt: salt,
				iterations: 100000,
				hash: 'SHA-256'
			},
			passwordKey,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt']
		);

		// Generate IV and encrypt
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const messageBuffer = new TextEncoder().encode(message);
		const encryptedBuffer = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: iv },
			key,
			messageBuffer
		);

		// Combine salt + iv + encrypted data
		const combined = new Uint8Array(salt.length + iv.length + encryptedBuffer.byteLength);
		combined.set(salt, 0);
		combined.set(iv, salt.length);
		combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

		// Convert to base64
		return btoa(String.fromCharCode(...combined));
	}

	/**
	 * Decrypt a message with a password
	 * @param encryptedData base64 encoded encrypted data with salt and IV prepended
	 * @param password 
	 * @returns decrypted message
	 */
	public static async decryptMessage(encryptedData: string, password: string): Promise<string> {
		try {
			// Convert from base64
			const combined = new Uint8Array(
				atob(encryptedData).split('').map(char => char.charCodeAt(0))
			);

			// Extract salt, IV, and encrypted data
			const salt = combined.slice(0, 16);
			const iv = combined.slice(16, 28);
			const encrypted = combined.slice(28);

			// Convert password to key
			const passwordBuffer = new TextEncoder().encode(password);
			const passwordKey = await crypto.subtle.importKey(
				'raw',
				passwordBuffer,
				{ name: 'PBKDF2' },
				false,
				['deriveKey']
			);

			// Derive the same key using the extracted salt
			const key = await crypto.subtle.deriveKey(
				{
					name: 'PBKDF2',
					salt: salt,
					iterations: 100000,
					hash: 'SHA-256'
				},
				passwordKey,
				{ name: 'AES-GCM', length: 256 },
				false,
				['decrypt']
			);

			// Decrypt
			const decryptedBuffer = await crypto.subtle.decrypt(
				{ name: 'AES-GCM', iv: iv },
				key,
				encrypted
			);

			// Convert back to string
			return new TextDecoder().decode(decryptedBuffer);
		} catch (error) {
			throw new Error('Decryption failed: Invalid password or corrupted data');
		}
	}

	/**
	 * Evaluate mathematical expressions
	 * @param expr 
	 * @returns 
	 */
	public static evalMath(expr: string): number | null {
		expr = expr.replace(/e/g, '.');
		if(
			//Ignore ranges notation as somthing like "1:0:0" kills CPU for a few seconds 
			!/\d(:\d)+/.test(expr.trim())
		) {
			try {
				const num = MathEval(expr);
				if(!isNaN(num) && num != Infinity) return num;
			}catch(error) {}
		}
		return null;
	}

	/**
	 * Check if highlight overlay exists
	 * @returns 
	 */
	public static async getHighlightOverPresence():Promise<boolean> {
		return new Promise((resolve, _reject)=> {
			const timeout = window.setTimeout(() =>{
				resolve(false);
				PublicAPI.instance.removeEventListener("SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE", handler);
			}, 1000)
			let handler = ()=> {
				clearTimeout(timeout)
				resolve(true);
				PublicAPI.instance.removeEventListener("SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE", handler);
			}
			PublicAPI.instance.addEventListener("SET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE", handler);
			PublicAPI.instance.broadcast("GET_CHAT_HIGHLIGHT_OVERLAY_PRESENCE");
		})
	}
	
	/**
	 * Converts a JSON object to a printable TypeScript type definition
	 */
	public static jsonToTS(
	json: any,
	typeName = "",
	indent = 2
	): string {
		function inferType(value: any, level: number): string {
			const pad = " ".repeat(level * indent);

			if (value === null) return "null";

			if (Array.isArray(value)) {
			if (value.length === 0) return "any[]";
			return `${inferType(value[0], level)}[]`;
			}

			if (typeof value === "object") {
			const entries = Object.entries(value)
				.map(
				([key, val]) =>
					`${pad}${" ".repeat(indent)}${key}: ${inferType(val, level + 1)};`
				)
				.join("\n");

			return `{\n${entries}\n${pad}}`;
			}

			return typeof value;
		}

		const prefix = typeName ? `type ${typeName} = ` : "";
		return `${prefix}${inferType(json, 0)};`;
	}

	

	/**
	 * Adjectives – short, universally understandable words.
	 * Many are language-agnostic or easily recognizable across cultures.
	 */
	private static readonly ADJECTIVES: string[] = [
		"Brave", "Bright", "Calm", "Clever", "Cool",
		"Cosmic", "Cozy", "Crisp", "Cute", "Daring",
		"Deep", "Eager", "Epic", "Fair", "Fancy",
		"Fast", "Fiery", "Fine", "Fleet", "Fresh",
		"Gentle", "Giant", "Glad", "Golden", "Grand",
		"Great", "Happy", "Hardy", "Hasty", "Icy",
		"Jade", "Jazzy", "Jolly", "Keen", "Kind",
		"Lively", "Lone", "Lucky", "Magic", "Mega",
		"Merry", "Mighty", "Mild", "Mini", "Misty",
		"Moody", "Neat", "Noble", "Nifty", "Odd",
		"Pale", "Plush", "Polar", "Prime", "Proud",
		"Pure", "Quick", "Quiet", "Rapid", "Rare",
		"Royal", "Rusty", "Sandy", "Sharp", "Shiny",
		"Silent", "Silver", "Slick", "Slim", "Sly",
		"Small", "Smart", "Snowy", "Soft", "Solar",
		"Spicy", "Steamy", "Steel", "Still", "Stone",
		"Storm", "Sunny", "Super", "Sure", "Sweet",
		"Swift", "Tall", "Tame", "Tidy", "Tiny",
		"Tough", "True", "Vast", "Vivid", "Warm",
		"Wavy", "Wild", "Wise", "Witty", "Zany",
		"Zen", "Agile", "Ample", "Azure", "Blaze",
		"Bold", "Brisk", "Cedar", "Chief", "Chill",
		"Coral", "Cyber", "Dawn", "Dizzy", "Dream",
		"Dusty", "Elder", "Ember", "Faint", "Fern",
		"Fizzy", "Foggy", "Frost", "Frosty", "Fuzzy",
		"Giddy", "Gleam", "Glow", "Grace", "Grim",
		"Gusty", "Hazy", "Honey", "Humid", "Hyper",
		"Inner", "Iron", "Ivory", "Jumpy", "Junior",
		"Lemon", "Light", "Lilac", "Lunar", "Maple",
		"Mango", "Marsh", "Mauve", "Metro", "Mint",
		"Misty", "Mocha", "Mossy", "Muted", "Navy",
		"Neon", "Night", "Nimble", "Nova", "Olive",
		"Opal", "Orbit", "Peach", "Pearl", "Perky",
		"Pixel", "Plaza", "Plum", "Prism", "Pulse",
		"Rift", "Robin", "Rocky", "Rose", "Rouge",
		"Sage", "Satin", "Snowy", "Sonic", "Spark",
		"Spry", "Starry", "Stark", "Suave", "Swirl",
		"Terra", "Tiger", "Titan", "Topaz", "Tropic",
		"Tulip", "Turbo", "Ultra", "Urban", "Vapor",
		"Velvet", "Vibe", "Violet", "Vista", "Vital",
		"Vivid", "Volt", "Wacky", "Windy", "Wistful",
		"Woody", "Yonder", "Young", "Zappy", "Zippy",
	];

	/**
	 * Nouns – mostly animals and nature words, fun and recognizable.
	 */
	private static readonly NOUNS: string[] = [
		"Panda", "Falcon", "Tiger", "Wolf", "Otter",
		"Fox", "Eagle", "Dolphin", "Bear", "Hawk",
		"Lynx", "Raven", "Shark", "Cobra", "Crane",
		"Drake", "Gecko", "Heron", "Ibis", "Koala",
		"Lemur", "Moose", "Newt", "Oriole", "Puma",
		"Quail", "Robin", "Sloth", "Toad", "Viper",
		"Whale", "Yak", "Zebra", "Ant", "Bison",
		"Cat", "Dove", "Elk", "Finch", "Goat",
		"Horse", "Iguana", "Jaguar", "Kite", "Lark",
		"Mole", "Nymph", "Owl", "Pike", "Ram",
		"Seal", "Trout", "Urchin", "Vole", "Wren",
		"Alpaca", "Badger", "Crab", "Dingo", "Egret",
		"Frog", "Gull", "Hyena", "Impala", "Jay",
		"Kiwi", "Lion", "Mink", "Narwhal", "Ocelot",
		"Parrot", "Quetzal", "Raccoon", "Squid", "Toucan",
		"Unicorn", "Vulture", "Walrus", "Xerus", "Yeti",
		"Zephyr", "Beetle", "Cicada", "Darter", "Ermine",
		"Ferret", "Gibbon", "Hornet", "Jackal", "Kelp",
		"Llama", "Mantis", "Osprey", "Puffin", "Raptor",
		"Salmon", "Tern", "Stork", "Wombat", "Flame",
		"Frost", "Storm", "Cloud", "Comet", "Flare",
		"Nova", "Orbit", "Pixel", "Prism", "Pulse",
		"Reef", "Ridge", "River", "Spark", "Star",
		"Stone", "Tide", "Trail", "Wave", "Blaze",
		"Bloom", "Breeze", "Brook", "Canyon", "Cedar",
		"Cliff", "Coral", "Creek", "Crest", "Crystal",
		"Delta", "Dune", "Echo", "Fern", "Fjord",
		"Flint", "Gem", "Glen", "Grove", "Harbor",
		"Haven", "Heath", "Jade", "Lake", "Leaf",
		"Maple", "Marsh", "Mesa", "Mist", "Moss",
		"Oasis", "Oak", "Peak", "Pine", "Pond",
		"Quartz", "Rain", "Reed", "Rock", "Sage",
		"Sand", "Shell", "Sky", "Snow", "Spruce",
		"Summit", "Thorn", "Vale", "Willow", "Birch",
		"Bolt", "Ember", "Gale", "Haze", "Isle",
		"Jet", "Lava", "Meadow", "Nebula", "Plume",
		"Ripple", "Shade", "Spire", "Vapor", "Zenith",
	];
	/**
	 * Generates a human-readable name from an opaque ID using a deterministic hash function.
	 * The same ID will always produce the same name, and different IDs will likely produce different names.
	 * @param id 
	 * @returns 
	 */
	public static getNameFromOpaqueId(id: string): string {
		function fnv1a(str: string): number {
			let hash = 0x811c9dc5; // FNV offset basis
			for (let i = 0; i < str.length; i++) {
				hash ^= str.charCodeAt(i);
				hash = Math.imul(hash, 0x01000193); // FNV prime
			}
			return hash >>> 0; // ensure unsigned
		}
		const hash = fnv1a(id);

		const adjIdx = hash % this.ADJECTIVES.length;
		const nounIdx = Math.floor(hash / this.ADJECTIVES.length) % this.NOUNS.length;
		const suffix = Math.floor(hash / (this.ADJECTIVES.length * this.NOUNS.length)) % 100;

		const adj = this.ADJECTIVES[adjIdx] as string;
		const noun = this.NOUNS[nounIdx] as string;
		const name = adj + noun + String(suffix).padStart(2, "0");
		return name;
	}

	/**
	 * Get URL for given overlay ID and params
	 * @param id 
	 * @param params 
	 * @returns 
	 */
	public static overlayURL(id:string, params?:{k:string, v:string}[]):string {
		const port = DataStore.get(DataStore.OBS_PORT);
		const pass = DataStore.get(DataStore.OBS_PASS);
		const ip = DataStore.get(DataStore.OBS_IP);
		const urlParams = new URLSearchParams()
		if(params) {
			for (const p of params) {
				urlParams.append(p.k, p.v);
			}
		}
		if(port) urlParams.append("obs_port", port);
		if(pass) urlParams.append("obs_pass", pass);
		if(ip) urlParams.append("obs_ip", ip);
		let suffix = urlParams.toString()
		if(suffix) suffix = "?" + suffix;
		return document.location.origin + StoreProxy.router.resolve({name:"overlay", params:{id}}).fullPath + suffix;
	}
	
	/**
	 * Check if answer is from a classic quiz
	 */
	public static isClassicQuizAnswer(mode: TwitchatDataTypes.QuizParams["mode"], _answer: any): _answer is TwitchatDataTypes.QuizParams<"classic">["questionList"][number]["answerList"][number] {
		return mode === "classic";
	}

	/**
	 * Check if answer is from a majority quiz
	 */
	public static isMajorityQuizAnswer(mode: TwitchatDataTypes.QuizParams["mode"], _answer: any): _answer is TwitchatDataTypes.QuizParams<"majority">["questionList"][number]["answerList"][number] {
		return mode === "majority";
	}

	/**
	 * Check if question is from a free answer quiz
	 */
	public static isFreeAnswerQuestion(mode: TwitchatDataTypes.QuizParams["mode"], _question: any): _question is TwitchatDataTypes.QuizParams<"freeAnswer">["questionList"][number] {
		return mode === "freeAnswer";
	}

	/**
	 * Search for a query in a string, ignoring diacritics
	 * @param src 
	 * @param query 
	 * @returns 
	 */
	public static search(src:string, query:string):boolean {
		const normalizedSrc = src.normalize("NFD").toLowerCase().replace(/\p{M}/gu, "");
		const normalizedQuery = query.normalize("NFD").toLowerCase().replace(/\p{M}/gu, "");
		return normalizedSrc.includes(normalizedQuery);
	}
}
