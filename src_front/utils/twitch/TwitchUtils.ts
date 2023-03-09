import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { BadgeInfo, Badges } from "tmi.js";
import type { TwitchDataTypes } from "../../types/twitch/TwitchDataTypes";
import Config from "../Config";
import BTTVUtils from "../emotes/BTTVUtils";
import FFZUtils from "../emotes/FFZUtils";
import SevenTVUtils from "../emotes/SevenTVUtils";
import Utils from "../Utils";
import { TwitchScopes, type TwitchScopesString } from "./TwitchScopes";

/**
* Created : 19/01/2021 
*/
export default class TwitchUtils {

	public static badgesCache:{[key:string]:{[key:string]:{[key:string]:TwitchatDataTypes.TwitchatUserBadge}}} = {};
	public static cheermoteCache:{[key:string]:TwitchDataTypes.CheermoteSet[]} = {};
	public static emotesCache:TwitchatDataTypes.Emote[] = [];
	public static rewardsCache:TwitchDataTypes.Reward[] = [];

	private static emotesCacheHashmap:{[key:string]:TwitchatDataTypes.Emote} = {};

	public static get headers():{[key:string]:string} {
		return {
			'Authorization': 'Bearer '+StoreProxy.auth.twitch.access_token,
			'Client-Id': Config.instance.TWITCH_CLIENT_ID,
			// 'Authorization': 'Bearer 358611f2ef5434a',//Fake IDs for twitch-cli
			// 'Client-Id': "ad6f8026c33565d701fa315320effc",//Fake IDs for twitch-cli
			'Content-Type': "application/json",
		};
	}

	public static getOAuthURL(csrfToken:string, scopes:string[]):string {
		const redirect = encodeURIComponent( document.location.origin+"/oauth" );
		const scopesStr = encodeURIComponent( scopes.join(" ") );

		let url = "https://id.twitch.tv/oauth2/authorize?";
		url += "client_id="+Config.instance.TWITCH_CLIENT_ID
		url += "&redirect_uri="+redirect;
		url += "&response_type=code";
		url += "&scope="+scopesStr;
		url += "&state="+csrfToken;
		url += "&force_verify=true";
		return url;
	}
	
	public static validateToken(token:string):Promise<TwitchDataTypes.Token|TwitchDataTypes.Error> {
		return new Promise((resolve, reject) => {
			const headers = {
				"Authorization":"Bearer "+token
			};
			const options = {
				method: "GET",
				headers: headers,
			};
			fetch("https://id.twitch.tv/oauth2/validate", options)
			.then((result) => {
				if(result.status == 200) {
					result.json().then((json)=> {
						resolve(json)
					});
				}else{
					reject();
				}
			}).catch((error) => {
				reject();
			});
		});
	}

	/**
	 * Gets a badge title from its raw info
	 */
	public static getBadgeTitle(setId:String, versionID:string):string {
		let title = "";
		const i18n = StoreProxy.i18n;
		//If it's the subscriber badge, create the title form its ID.
		//ID is in the form "XYYY" where X=tier and YYY the number of months
		if(setId === "subscriber") {
			let months = versionID.length == 4? parseInt(versionID.substring(1)) : parseInt(versionID);//Remove "tier" info
			const years = Math.floor(months/12);
			//Create title from the number of months
			if(years > 0) {
				months = (months-years*12);
				let duration = years+" "+i18n.tc("global.date.year", years);
				if(months > 0) duration += " and "+months+" "+i18n.tc("global.date.month", months);
				title = i18n.tc("global.badges.subscriber", {"DURATION":duration});
			}else{
				let duration = months+" "+i18n.tc("global.date.month", months);
				title = i18n.tc("global.badges.subscriber", {"DURATION":duration});
			}
		}else
		//If it's the prediction badge, use the ID as the title.
		//ID is like "blue-6". We replace the dashes by spaces
		if(setId === "predictions") {
			title = i18n.tc("global.badges.prediction", {"VALUE":versionID.replace("-", " ")});
		}else
		//If it's the sub-gift badge, use the ID as the number of gifts
		if(setId === "sub-gifter") {
			title = i18n.tc("global.badges.subgift", {"COUNT":versionID});
		}else
		//If it's the bits badge, use the ID as the number of bits
		if(setId === "bits") {
			title = i18n.tc("global.badges.bits", {"COUNT":versionID});
		}else
		//If it's the moments badge, use the ID as the number of moments
		if(setId === "moments") {
			title = i18n.tc("global.badges.moments", {"COUNT":versionID});
		} else {
			//Use the set ID as the title after.
			//It's in the form "this-is-the-label_X". Remove "_X" value if it's a number
			//then replace dashes and remaining underscores by spaces to make a sort of readable title
			//Don't replace _X if X isn't a number because of the "no_audio" and "no_sound"
			//badge codes
			title = setId.replace(/_[0-9]+/gi, "").replace(/(-|_)/g, " ");
		}
		return title;
	}

	/**
	 * Gets the badges of a channel
	 * @returns
	 */
	public static async loadUserBadges(uid:string):Promise<{[key:string]:{[key:string]:TwitchatDataTypes.TwitchatUserBadge}}> {
		if(this.badgesCache[uid]) return this.badgesCache[uid];

		const options = {
			method: "GET",
			// headers: {},
			headers: this.headers,
		};
		const result = await fetch(Config.instance.TWITCH_API_PATH+"chat/badges?broadcaster_id="+uid, options);
		// const result = await fetch("https://badges.twitch.tv/v1/badges/channels/"+uid+"/display", options);
		if(result.status == 200) {
			const json = await result.json();
			const list:TwitchDataTypes.BadgesSet[] = json.data as TwitchDataTypes.BadgesSet[];
			const hashmap:{[key:string]:{[key:string]:TwitchatDataTypes.TwitchatUserBadge}} = {};
			for (let i = 0; i < list.length; i++) {
				const s = list[i];
				if(!hashmap[s.set_id]) hashmap[s.set_id] = {};
				for (let j = 0; j < s.versions.length; j++) {
					const v = s.versions[j];
					const title = this.getBadgeTitle(s.set_id, v.id);
					hashmap[s.set_id][v.id] = {
						icon:{
							sd: v.image_url_1x,
							hd: v.image_url_4x,
						},
						id: s.set_id as TwitchatDataTypes.TwitchatUserBadgeType,
						title,
					};
				}
			}
			this.badgesCache[uid] = hashmap;
			// this.badgesCache[uid] = json.data;
			return this.badgesCache[uid];
		}else{
			throw({error:result});
		}
	}

	/**
	 * Gets the badges of a channel
	 * @returns
	 */
	public static async loadGlobalBadges():Promise<{[key:string]:{[key:string]:TwitchatDataTypes.TwitchatUserBadge}}> {
		if(this.badgesCache["global"]) return this.badgesCache["global"];

		const options = {
			method: "GET",
			// headers: {},
			headers: this.headers,
		};
		const result = await fetch(Config.instance.TWITCH_API_PATH+"chat/badges/global", options);
		// const result = await fetch("https://badges.twitch.tv/v1/badges/global/display", options);
		if(result.status == 200) {
			const json = await result.json();
			const list:TwitchDataTypes.BadgesSet[] = json.data as TwitchDataTypes.BadgesSet[];
			const hashmap:{[key:string]:{[key:string]:TwitchatDataTypes.TwitchatUserBadge}} = {};
			for (let i = 0; i < list.length; i++) {
				const s = list[i];
				if(!hashmap[s.set_id]) hashmap[s.set_id] = {};
				for (let j = 0; j < s.versions.length; j++) {
					const v = s.versions[j];
					const title = this.getBadgeTitle(s.set_id, v.id);
					hashmap[s.set_id][v.id] = {
						icon:{
							sd: v.image_url_1x,
							hd: v.image_url_4x,
						},
						id: s.set_id as TwitchatDataTypes.TwitchatUserBadgeType,
						title,
					};
				}
			}
			this.badgesCache["global"] = hashmap;
			// this.badgesCache["global"] = json.data;
			return this.badgesCache["global"];
		}else{
			throw({error:result});
		}
	}
	
	/**
	 * Converts a chat message badges to actual badges instances with images and IDs.
	 * @param userBadges
	 * @returns 
	 */
	public static getBadgesFromRawBadges(channelId:string, badgeInfos:BadgeInfo | undefined, userBadges:Badges|undefined):TwitchatDataTypes.TwitchatUserBadge[] {
		const result:TwitchatDataTypes.TwitchatUserBadge[] = [];
		const setID_done:{[key:string]:boolean} = {};
		for (const setID in userBadges) {
			const version = userBadges[ setID ] as string;
			const caches = [this.badgesCache[channelId], this.badgesCache["global"]];
			for (let i = 0; i < caches.length; i++) {
				const cache = caches[i];
				if(!cache) continue;
				if(setID_done[setID] === true) continue;//Badge already added. "subscriber" badge can be both on channel and global caches
				if(!cache[setID]) continue;
				if(!cache[setID][version]) continue;
				setID_done[setID] = true;
				const badge = JSON.parse(JSON.stringify(cache[setID][version])) as TwitchatDataTypes.TwitchatUserBadge;
				if(badgeInfos && badgeInfos[setID]) {
					badge.title = this.getBadgeTitle(setID, badgeInfos[setID] as string);
				}
				badge.version = version;
				result.push(badge);
			}
		}
		return result;
	}

	/**
	 * Splits the message in chunks of type emote" and "text"
	 */
	public static parseEmotesToChunks(message:string, emotes:string|undefined, removeEmotes = false, customParsing = false, parsedEmotes?:TwitchatDataTypes.EmoteDef[]):TwitchDataTypes.ParseMessageChunk[] {

		let emotesList:TwitchatDataTypes.EmoteDef[] = [];

		if(!parsedEmotes) {

			function getProtectedRange(emotes:string):boolean[] {
				const protectedRanges:boolean[] = [];
				if(emotes) {
					const ranges:number[][]|undefined = emotes.match(/[0-9]+-[0-9]+/g)?.map(v=> v.split("-").map(v=> parseInt(v)));
					if(ranges) {
						for (let i = 0; i < ranges.length; i++) {
							const range = ranges[i];
							for (let j = range[0]; j <= range[1]; j++) {
								protectedRanges[j] = true;
							}
						}
					}
				}
				return protectedRanges;
			}
	
			if(!emotes || emotes.length == 0) {
				//Attempt to parse emotes manually.
				//TMI doesn't sends back proper emotes tag when sending
				//a message...
				//Parses for all emotes and generates a fake "emotes"
				//tag as if it was sent by IRC.
				if(customParsing && this.emotesCacheHashmap) {
					let fakeTag = "";
					const emoteList:TwitchatDataTypes.Emote[] = [];
					const emoteListHashmap = this.emotesCacheHashmap;
					// const start = Date.now();
					const chunks = message.split(/\s/);
					for (let i = 0; i < chunks.length; i++) {
						const txt = chunks[i].replace(/[^a-z0-9]+$/gi, "").replace(/^[^a-z0-9]+/gi, "");
						if(emoteListHashmap[txt]) {
							emoteList.push( emoteListHashmap[txt] );
						}
					}
					
					//Parse emotes
					const tagsDone:{[key:string]:boolean} = {};
					for (let i = 0; i < emoteList.length; i++) {
						const e = emoteList[i];
						const name = e.code.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
						if(tagsDone[name]) continue;
						tagsDone[name] = true;
						// const matches = [...message.matchAll(new RegExp("(^|\\s?)"+name+"(\\s|$)", "g"))];
						const matches = Array.from( message.matchAll(new RegExp(name, "gi")) );
						if(matches && matches.length > 0) {
							// //Current emote has been found
							// //Generate fake emotes data in the expected format:
							// //  ID:start-end,start-end/ID:start-end,start-end
							let tmpTag = e.id+":";
							let emoteCount = 0;
							for (let j = 0; j < matches.length; j++) {
								const start = (matches[j].index as number);
								const end = start+e.code.length-1;
								const range = getProtectedRange(fakeTag);
	
								if(range[start] === true || range[end] === true) continue;
								
								const prevOK = start == 0 || /[^0-9a-z]/i.test(message.charAt(start-1));
								const nextOK = end == message.length-1 || /[^0-9a-z]/i.test(message.charAt(end+1));
								//Emote has no space before or after or is not at the start or end of the message
								//ignore it.
								if(!prevOK || !nextOK) continue;
								emoteCount++;
								tmpTag += start+"-"+end;
	
								if(j < matches.length-1) tmpTag+=",";
							}
							if(emoteCount > 0) {
								fakeTag += tmpTag;
								if(i < emoteList.length -1 ) fakeTag +="/"
							}
						}
					}
					// const end = Date.now();
					// console.log((end-start)+"ms");
					if(fakeTag.length > 0) fakeTag +=";";
					emotes = fakeTag;
				}
			}
	
			if(!emotes) emotes = "";
			// ID:start-end,start-end/ID:start-end,start-end
			let bttvTag = BTTVUtils.instance.generateEmoteTag(message, getProtectedRange(emotes))
			if(bttvTag) {
				if(emotes.length > 0) bttvTag += "/";
				emotes = bttvTag + emotes;
			}
			let ffzTag = FFZUtils.instance.generateEmoteTag(message, getProtectedRange(emotes))
			if(ffzTag) {
				if(emotes.length > 0) ffzTag += "/";
				emotes = ffzTag + emotes;
			}
			let seventvTag = SevenTVUtils.instance.generateEmoteTag(message, getProtectedRange(emotes))
			if(seventvTag) {
				if(emotes.length > 0) seventvTag += "/";
				emotes = seventvTag + emotes;
			}
			
			if(!emotes || emotes.length == 0) {
				return [{type:"text", value:message}];
			}
	
			//Parse raw emotes data
			const chunks = (emotes as string).split("/");
			if(chunks.length > 0) {
				for (let i = 0; i < chunks.length; i++) {
					const c = chunks[i];
					if(c.indexOf(":") == -1) continue;
					const id = c.split(":")[0];
					const positions = c.split(":")[1].split(",");
					for (let j = 0; j < positions.length; j++) {
						const p = positions[j];
						const begin = parseInt(p.split("-")[0]);
						const end = parseInt(p.split("-")[1]);
						if(isNaN(begin) || isNaN(end)) continue;
						emotesList.push({id, begin, end});
					}
				}
			}
			//Sort emotes by start position
			emotesList.sort((a,b) => a.begin - b.begin);
		}else{
			emotesList = parsedEmotes;
		}

		let cursor = 0;
		const result:TwitchDataTypes.ParseMessageChunk[] = [];
		//Convert emotes to image tags
		for (let i = 0; i < emotesList.length; i++) {
			const e = emotesList[i];
			if(cursor < e.begin) {
				result.push( {type:"text", value: Array.from(message).slice(cursor, e.begin).join("")} );
			}
			if(!removeEmotes) {
				const code = Array.from(message).slice(e.begin, e.end + 1).join("").trim();
				if(e.id.indexOf("BTTV_") == 0) {
					const bttvE = BTTVUtils.instance.getEmoteFromCode(code);
					if(bttvE) {
						result.push( {type:"emote", label:"BTTV: "+code, emote:code, value:"https://cdn.betterttv.net/emote/"+bttvE.id+"/1x"} );
					}else{
						result.push( {type:"text", value:code} );
					}
				}else
				if(e.id.indexOf("FFZ_") == 0) {
					const ffzE = FFZUtils.instance.getEmoteFromCode(code);
					if(ffzE) {
						result.push( {type:"emote", label:"FFZ: "+code, emote:code, value:ffzE.urls[1]} );
					}else{
						result.push( {type:"text", value:code} );
					}
				}else
				if(e.id.indexOf("7TV_") == 0) {
					const stvE = SevenTVUtils.instance.getEmoteFromCode(code);
					if(stvE) {
						result.push( {type:"emote", label:"7TV: "+code, emote:code, value:stvE.urls[1][1]} );
					}else{
						result.push( {type:"text", value:code} );
					}
				}else{
					result.push( {type:"emote", label:code, emote:code, value:"https://static-cdn.jtvnw.net/emoticons/v2/"+e.id+"/default/light/1.0"} );
				}
			}
			cursor = e.end + 1;
		}
		result.push( {type:"text", value: Array.from(message).slice(cursor).join("")} );
		
		return result;
	}

	/**
	 * Replaces emotes by image tags on the message
	 */
	public static parseEmotes(message:string, emotes:string|undefined, removeEmotes = false, customParsing = false):string {
		const emoteChunks = TwitchUtils.parseEmotesToChunks(message, emotes, removeEmotes, customParsing);
		let message_html = "";
		for (let i = 0; i < emoteChunks.length; i++) {
			const v = emoteChunks[i];
			if(v.type == "text") {
				v.value = v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
				message_html += Utils.parseURLs(v.value);
			}else if(v.type == "emote") {
				let url = v.value.replace(/1.0$/gi, "3.0");//Twitch format
				url = url.replace(/1x$/gi, "3x");//BTTV format
				url = url.replace(/2x$/gi, "3x");//7TV format
				url = url.replace(/1$/gi, "4");//FFZ format
				const tt = "<img src='"+url+"' width='112' class='emote'><br><center>"+v.label+"</center>";
				message_html += "<img src='"+v.value+"' data-tooltip=\""+tt+"\" class='emote'>";
			}
		}
		return message_html;
	}

	/**
	 * Replaces emotes by image tags on the message
	 */
	public static parseEmotesFromObject(message:string, emotes:TwitchatDataTypes.EmoteDef[]|undefined, removeEmotes = false, customParsing = false):string {
		const emoteChunks = TwitchUtils.parseEmotesToChunks(message, undefined, removeEmotes, customParsing, emotes);
		let message_html = "";
		for (let i = 0; i < emoteChunks.length; i++) {
			const v = emoteChunks[i];
			if(v.type == "text") {
				v.value = v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
				message_html += Utils.parseURLs(v.value);
			}else if(v.type == "emote") {
				let url = v.value.replace(/1.0$/gi, "3.0");//Twitch format
				url = url.replace(/1x$/gi, "3x");//BTTV format
				url = url.replace(/2x$/gi, "3x");//7TV format
				url = url.replace(/1$/gi, "4");//FFZ format
				const tt = "<img src='"+url+"' width='112' class='emote'><br><center>"+v.label+"</center>";
				message_html += "<img src='"+v.value+"' data-tooltip=\""+tt+"\" class='emote'>";
			}
		}
		return message_html;
	}

	/**
	 * Converts parsed emote data to raw IRC compatible emote data.
	 * PubSub only returns parsed emote data but the parser expect
	 * raw IRC data to work. This method allows to convert one format
	 * to the other.
	 * 
	 * @param data 
	 * @returns 
	 */
	public static parsedEmoteDataToRawEmoteData(data:{emote_id:string, start:number, end:number}[]):string {
		let result:string = "";
		const hashmap:{[key:string]:string[]} = {};
		for (let i = 0; i < data.length; i++) {
			const e = data[i];
			if(!hashmap[e.emote_id]) hashmap[e.emote_id] = [];
			hashmap[e.emote_id].push(e.start+"-"+e.end);
		}
		for (const emote in hashmap) {
			if(result.length > 0) result += "/";
			result += emote+":"+hashmap[emote].join(",")
		}
		return result;
	}

	/**
	 * Replaces emotes by image tags on the message
	 */
	public static async parseCheermotes(message:string, channel_id:string, removeCheermotes:boolean = false):Promise<string> {
		let emotes:TwitchDataTypes.CheermoteSet[];
		try {
			emotes = await this.loadCheermoteList(channel_id);
		}catch(err) {
			//Safe crash
			return message;
		}

		for (let j = 0; j < emotes.length; j++) {
			const list = emotes[j];
			
			const reg = new RegExp(list.prefix+"[0-9]+", "gi");
			const matches = message.match(reg) as RegExpMatchArray;
			if(!matches) continue;
			//Parse all the current cheermote matches
			for (let k = 0; k < matches.length; k++) {
				const m = matches[k];
				const bitsCount = parseInt(m.toLowerCase().replace(list.prefix.toLowerCase(), ""));
				let tiers = list.tiers[0];
				//Search for the lower nearest existing tier with the specified value
				for (let i = 1; i < list.tiers.length; i++) {
					if(bitsCount < list.tiers[i].min_bits) {
						tiers = list.tiers[i-1];
						break;
					}
				}
				let img = tiers.images.dark.animated["2"];
				if(!img) img = tiers.images.dark.static["2"];
				const replace = removeCheermotes? "" : "<img src='"+img+"' class='cheermote'>";
				message = message.replace(new RegExp(list.prefix+bitsCount, "gi"), replace)
			}
		}
		return message;
	}

	/**
	 * Gets user infos by their ID.
	 * 
	 * @param logins 
	 * @returns 
	 */
	public static async loadChannelInfo(uids:string[]):Promise<TwitchDataTypes.ChannelInfo[]> {
		let channels:TwitchDataTypes.ChannelInfo[] = [];
		let fails:string[] = [];
		//Split by 100 max to comply with API limitations
		while(uids.length > 0) {
			const param = "broadcaster_id";
			const params = param+"="+uids.splice(0,100).join("&"+param+"=");
			const url = Config.instance.TWITCH_API_PATH+"channels?"+params;
			try {
				const result = await fetch(url, { headers:this.headers });
				const json = await result.json();
				if(!json.error) {
					channels = channels.concat(json.data);
				}else{
					fails = fails.concat(uids);
				}
			}catch(error) {
				fails = fails.concat(uids);
			}
		}
		if(fails.length > 0) {
			StoreProxy.main.alert(StoreProxy.i18n.t("error.load_user_info", {ERROR:fails}));
		}
		return channels;
	}

	/**
	 * Gets user infos by their ID.
	 * 
	 * @param logins 
	 * @returns 
	 */
	public static async loadUserInfo(ids?:string[], logins?:string[]):Promise<TwitchDataTypes.UserInfo[]> {
		let items:string[] | undefined = ids? ids : logins;
		if(items == undefined) return [];
		items = items.filter(v => v != null && v != undefined);
		items = items.map(v => encodeURIComponent(v));
	
		let users:TwitchDataTypes.UserInfo[] = [];
		//Split by 100 max to comply with API limitations
		while(items.length > 0) {
			const param = ids ? "id" : "login";
			const params = param+"="+items.splice(0,100).join("&"+param+"=");
			const url = Config.instance.TWITCH_API_PATH+"users?"+params;
			const result = await fetch(url, {headers:this.headers});
			if(result.status === 200) {
				const json = await result.json();
				users = users.concat(json.data);
			}else if(result.status == 429){
				//Rate limit reached, try again after it's reset to fulle
				const resetDate = parseInt(result.headers.get("Ratelimit-Reset") as string ?? (Date.now()+1).toString) * 1000;
				await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
				return await this.loadUserInfo(ids, logins)
			}
		}
		return users;
	}

	/**
	 * Gets latest stream's info.
	 * 
	 * @param logins 
	 * @returns 
	 */
	public static async loadCurrentStreamInfo(ids?:string[], logins?:string[]):Promise<TwitchDataTypes.StreamInfo[]> {
		let items:string[] | undefined = ids? ids : logins;
		if(items == undefined) return [];
		items = items.filter(v => v != null && v != undefined);
		items = items.map(v => encodeURIComponent(v));
	
		let streams:TwitchDataTypes.StreamInfo[] = [];
		//Split by 100 max to comply with API limitations
		while(items.length > 0) {
			const url = new URL(Config.instance.TWITCH_API_PATH+"streams");
			const param = ids ? "user_id" : "user_login";
			const list = items.splice(0,100);
			for (let i = 0; i < list.length; i++) {
				url.searchParams.append(param, list[i]);
			}

			const result = await fetch(url, { headers:this.headers });
			const json = await result.json();
			streams = streams.concat(json.data);
		}
		return streams;
	}
	
	/***
	 * Allow or reject an automoded message
	 */
	public static async modMessage(accept:boolean, messageId:string):Promise<boolean> {
		const options = {
			method:"POST",
			headers: this.headers,
			body: JSON.stringify({
				user_id:StoreProxy.auth.twitch.user.id,
				msg_id:messageId,
				action:accept? "ALLOW" : "DENY",
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"moderation/automod/message", options);
		return res.status <= 400;
	}

	/**
	 * Get the cheermote list of a channel
	 */
	public static async loadCheermoteList(channelId:string):Promise<TwitchDataTypes.CheermoteSet[]> {
		if(this.cheermoteCache[channelId]) return this.cheermoteCache[channelId];
		
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"bits/cheermotes?broadcaster_id="+channelId, options);
		const json = await res.json();
		this.cheermoteCache[channelId] = json.data;
		return json.data;
	}

	/**
	 * Create a poll
	 */
	public static async createPoll(channelId:string, question:string, answers:string[], duration:number, pointsPerVote = 0):Promise<TwitchDataTypes.Poll[]> {
		if(!this.hasScope(TwitchScopes.MANAGE_POLLS)) return [];
		
		const options = {
			method:"POST",
			headers: this.headers,
			body: JSON.stringify({
				broadcaster_id:channelId,
				title:question,
				choices:answers.map(v => {return {title:v}}),
				duration,
				channel_points_voting_enabled:pointsPerVote > 0,
				channel_points_per_vote:pointsPerVote,
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"polls", options);
		const json = await res.json();
		if(res.status == 200) {
			setTimeout(()=> {
				//Schedule reload of the polls after poll ends
				this.getPolls(channelId);
			}, (duration+1) * 1000);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get a list of the latest polls and store any active one to the store
	 */
	public static async getPolls(channelId:string):Promise<TwitchDataTypes.Poll[]> {
		if(!this.hasScope(TwitchScopes.MANAGE_POLLS)) return [];
		
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"polls?broadcaster_id="+channelId, options);
		const json:{data:TwitchDataTypes.Poll[]} = await res.json();
		if(res.status == 200) {
			if(json.data[0].status == "ACTIVE") {
				const src = json.data[0];
				const choices:TwitchatDataTypes.MessagePollDataChoice[] = [];
				src.choices.forEach(v=> {
					choices.push({
						id:v.id,
						label:v.title,
						votes:v.votes,
					})
				});
				const poll:TwitchatDataTypes.MessagePollData = {
					id:src.id,
					channel_id:src.broadcaster_id,
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.POLL,
					platform:"twitch",
					duration_s:src.duration,
					started_at:new Date(src.started_at).getTime(),
					title:src.title,
					choices,
				}
				StoreProxy.poll.setCurrentPoll(poll);
			}
			return json.data;
		}
		throw(json);
	}
	
	/**
	 * Ends a poll
	 */
	public static async endPoll(pollId:string, channelId:string):Promise<TwitchDataTypes.Poll[]> {
		const options = {
			method:"PATCH",
			headers: this.headers,
			body: JSON.stringify({
				id:pollId,
				status:"TERMINATED",
				broadcaster_id:channelId,
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"polls", options);
		const json = await res.json();
		if(res.status == 200) {
			// StoreProxy.poll.setCurrentPoll(json.data);
			return json.data;
		}
		throw(json);
	}


	

	/**
	 * Create a prediction
	 */
	public static async createPrediction(channelId:string, question:string, answers:string[], duration:number):Promise<TwitchDataTypes.Prediction[]> {
		if(!this.hasScope(TwitchScopes.MANAGE_PREDICTIONS)) return [];
		
		const options = {
			method:"POST",
			headers: this.headers,
			body: JSON.stringify({
				broadcaster_id:channelId,
				title:question,
				outcomes:answers.map(v => {return {title:v}}),
				prediction_window:duration,
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"predictions", options);
		const json = await res.json();
		if(res.status == 200) {
			setTimeout(()=> {
				this.getPredictions(channelId);
			}, (duration+1) * 1000);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get a list of the latest predictions
	 */
	public static async getPredictions(channelId:string):Promise<TwitchDataTypes.Prediction[]> {
		if(!this.hasScope(TwitchScopes.MANAGE_PREDICTIONS)) return [];
		
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"predictions?broadcaster_id="+StoreProxy.auth.twitch.user.id, options);
		const json = await res.json();
		if(res.status == 200) {
			const src = json.data[0] as TwitchDataTypes.Prediction;
			if(src.status == "ACTIVE" || src.status == "LOCKED") {
				const outcomes:TwitchatDataTypes.MessagePredictionDataOutcome[] = [];
				src.outcomes.forEach(v=> {
					outcomes.push({
						id:v.id,
						label:v.title,
						votes:v.channel_points,
						voters:v.users,
					})
				});
				const prediction:TwitchatDataTypes.MessagePredictionData = {
					id:src.id,
					channel_id:src.broadcaster_id,
					date:Date.now(),
					type:TwitchatDataTypes.TwitchatMessageType.PREDICTION,
					platform:"twitch",
					duration_s:src.prediction_window,
					started_at:new Date(src.created_at).getTime(),
					title:src.title,
					outcomes,
					pendingAnswer:src.status == "LOCKED",
				}
				StoreProxy.prediction.setPrediction(prediction);
			}else{
				StoreProxy.prediction.setPrediction(null);
			}
			return json.data;
		}
		throw(json);
	}

	/**
	 * Ends a prediction
	 */
	public static async endPrediction(channelId:string, predictionId:string, winId:string, cancel = false):Promise<TwitchDataTypes.Prediction[]> {
		const options = {
			method:"PATCH",
			headers: this.headers,
			body: JSON.stringify({
				broadcaster_id:channelId,
				id:predictionId,
				status:cancel? "CANCELED" : "RESOLVED",
				winning_outcome_id:winId,
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"predictions", options);
		const json = await res.json();
		if(res.status == 200) {
			this.getPredictions(channelId);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get the latest hype train info
	 * not used as it contains no much info and is super restrictive..
	 */
	public static async getHypeTrains(channelId:string):Promise<TwitchDataTypes.HypeTrain[]> {
		if(!this.hasScope(TwitchScopes.READ_HYPE_TRAIN)) return [];
		
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"hypetrain/events?broadcaster_id="+channelId, options);
		const json = await res.json();
		if(res.status == 200) {
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get the emotes list
	 */
	public static async getEmotes():Promise<TwitchatDataTypes.Emote[]> {
		while(this.emotesCache.length == 0) {
			await Utils.promisedTimeout(100);
		}
		return this.emotesCache;
	}

	/**
	 * Loads specified emotes sets
	 */
	public static async loadEmoteSets(channelId:string, sets:string[]):Promise<TwitchatDataTypes.Emote[]> {
		if(this.emotesCache.length > 0) return this.emotesCache;
		const options = {
			method:"GET",
			headers: this.headers,
		}
		let emotes:TwitchatDataTypes.Emote[] = [];
		let emotesTwitch:TwitchDataTypes.Emote[] = [];
		do {
			const params = sets.splice(0,25).join("&emote_set_id=");
			const res = await fetch(Config.instance.TWITCH_API_PATH+"chat/emotes/set?emote_set_id="+params, options);
			const json = await res.json();
			if(res.status == 200) {
				emotesTwitch = emotesTwitch.concat(json.data);
			}else{
				throw(json);
			}
		}while(sets.length > 0);

		const uid2User:{[key:string]:TwitchatDataTypes.TwitchatUser} = {};//Avoid spamming store
		
		//Convert to twitchat's format
		emotes = emotesTwitch
		.filter(v=>v.owner_id != "twitch")//remove lots of useless emotes like ":p", ":o", ":-)", etc..
		.map((e:TwitchDataTypes.Emote):TwitchatDataTypes.Emote => {
			//Extract latest format available.
			//Should be aither "static" or "animated" but doing it this way will load
			//any potential new kind of emote in the future.
			const flag = (((e.format as unknown) as string[]).splice(-1)[0] ?? "static");
			let owner!:TwitchatDataTypes.TwitchatUser;
			if(e.owner_id == "0") {
				//Create a fake user for th "global" emotes.
				//They are linked to the twitch user "0" which does
				//not exists.
				owner = {
					id:"0",
					platform:"twitch",
					displayName:"Global",
					login:"Global",
					donor:{level:0, state:false, upgrade:false, noAd:false},
					is_raider:false,
					is_affiliate:false,
					is_partner:false,
					is_tracked:false,
					pronouns:false,
					is_bot:true,
					pronounsLabel:"",
					pronounsTooltip:"",
					channelInfo:{},
				}
			}else{
				owner = uid2User[e.owner_id] ?? StoreProxy.users.getUserFrom("twitch", channelId, e.owner_id)
				uid2User[e.owner_id] = owner;
			}
			return {
				id: e.id,
				code: e.name,
				is_public:e.emote_type === "globals",
				images: {
					// this : replace("static", flag)
					//replaces the static flag by "animated" if available
					url_1x: e.images.url_1x.replace("/static/", "/"+flag+"/"),
					url_2x: e.images.url_2x.replace("/static/", "/"+flag+"/"),
					url_4x: e.images.url_4x.replace("/static/", "/"+flag+"/"),
				},
				owner,
				platform: "twitch",
			}
		});

		//Sort them by name length DESC to make manual emote parsing easier.
		//When sending a message on IRC, we don't get a clean callback
		//message with parsed emotes (nor id, timestamp and other stuff)
		//This means that every message sent from this interface must be
		//parsed manually. Love it..
		emotes.sort((a,b)=> b.code.length - a.code.length );

		const hashmap:{[key:string]:TwitchatDataTypes.Emote} = {};
		emotes.forEach(e => { hashmap[e.code] = e; });
		this.emotesCacheHashmap = hashmap;
		this.emotesCache = emotes;

		return emotes;
	}

	/**
	 * Get the rewards list
	 */
	public static async getRewards(forceReload = false):Promise<TwitchDataTypes.Reward[]> {
		if(!this.hasScope(TwitchScopes.LIST_REWARDS)) return [];
		
		if(this.rewardsCache.length > 0 && !forceReload) return this.rewardsCache;
		const options = {
			method:"GET",
			headers: this.headers,
		}
		let rewards:TwitchDataTypes.Reward[] = [];
		const res = await fetch(Config.instance.TWITCH_API_PATH+"channel_points/custom_rewards?broadcaster_id="+StoreProxy.auth.twitch.user.id, options);
		const json = await res.json();
		if(res.status == 200) {
			rewards = json.data;
		}else{
			throw(json);
		}
		this.rewardsCache = rewards;
		return rewards;
	}

	/**
	 * Get the reward redemptions list
	 */
	public static async loadRedemptions():Promise<TwitchDataTypes.RewardRedemption[]> {
		if(!this.hasScope(TwitchScopes.LIST_REWARDS)) return [];
		
		const options = {
			method:"GET",
			headers: this.headers,
		}
		let redemptions:TwitchDataTypes.RewardRedemption[] = [];
		const res = await fetch(Config.instance.TWITCH_API_PATH+"channel_points/custom_rewards/redemptions?broadcaster_id="+StoreProxy.auth.twitch.user.id, options);
		const json = await res.json();
		if(res.status == 200) {
			redemptions = json.data;
		}else{
			throw(json);
		}
		return redemptions;
	}

	/**
	 * Lists all available rewards
	 * 
	 * @returns
	 */
	public static async setRewardEnabled(id:string, enabled:boolean):Promise<void> {
		if(!this.hasScope(TwitchScopes.LIST_REWARDS)) return;
		
		const res = await fetch(Config.instance.TWITCH_API_PATH+"channel_points/custom_rewards?broadcaster_id="+StoreProxy.auth.twitch.user.id+"&id="+id, {
			method:"PATCH",
			headers:this.headers,
			// body:JSON.stringify({is_enabled:!enabled}),
			body:JSON.stringify({is_paused:!enabled}),
		})
		return await res.json();
	}

	/**
	 * Get the moderators list of a channel
	 * Not much useful as it's restricted to the channel m
	 */
	public static async getModerators(channelId:string):Promise<TwitchDataTypes.ModeratorUser[]> {
		if(!this.hasScope(TwitchScopes.READ_MODS_AND_BANNED)) return [];
		
		let list:TwitchDataTypes.ModeratorUser[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.instance.TWITCH_API_PATH+"moderation/moderators?first=100&broadcaster_id="+channelId+pCursor, {
				method:"GET",
				headers:this.headers,
			});
			if(res.status == 200) {
				const json:{data:TwitchDataTypes.ModeratorUser[], pagination?:{cursor?:string}} = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if(json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			}else{
				return [];
			}
		}while(cursor != null)
		return list;
	}

	/**
	 * Get the banned states of specified users
	 */
	public static async getBannedUsers(channelId:string, uids:string[]):Promise<TwitchDataTypes.BannedUser[]> {
		if(!this.hasScope(TwitchScopes.READ_MODS_AND_BANNED)) return [];
		
		let channels:TwitchDataTypes.BannedUser[] = [];
		let fails:string[] = [];
		//Split by 100 max to comply with API limitations
		while(uids.length > 0) {
			const url = new URL(Config.instance.TWITCH_API_PATH+"moderation/banned");
			url.searchParams.append("broadcaster_id", channelId);
			uids.splice(0,100).forEach(v=> {
				url.searchParams.append("user_id", v);
			})
			try {
				const result = await fetch(url, { headers:this.headers });
				const json = await result.json();
				if(!json.error) {
					channels = channels.concat(json.data);
				}else{
					fails = fails.concat(uids);
				}
			}catch(error) {
				fails = fails.concat(uids);
			}
		}
		if(fails.length > 0) {
			StoreProxy.main.alert(StoreProxy.i18n.t("error.load_user_ban", {ERROR:fails}));
		}
		return channels;
	}

	/**
	 * Get all the active streams that the current user is following
	 */
	public static async getActiveFollowedStreams():Promise<TwitchDataTypes.StreamInfo[]> {
		if(!this.hasScope(TwitchScopes.LIST_FOLLOWINGS)) return [];
		
		let list:TwitchDataTypes.StreamInfo[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.instance.TWITCH_API_PATH+"streams/followed?first=100&user_id="+StoreProxy.auth.twitch.user.id+pCursor, {
				method:"GET",
				headers:this.headers,
			});
			const json:{data:TwitchDataTypes.StreamInfo[], pagination?:{cursor?:string}} = await res.json();
			list = list.concat(json.data);

			const uids = json.data.map(x => x.user_id);
			const users = await this.loadUserInfo(uids);
			users.forEach(u => {
				for (let i = 0; i < json.data.length; i++) {
					const s = json.data[i];
					if(s.user_id == u.id) {
						s.user_info = u;
						break;
					}
				}
			});

			cursor = null;
			if(json.pagination?.cursor) {
				cursor = json.pagination.cursor;
			}
		}while(cursor != null)
		return list;
	}

	/**
	 * Gets the specified user follows the specified channel
	 * 
	 * @param uid user ID
	 */
	public static async getFollowInfo(uid:string, channelId?:string):Promise<TwitchDataTypes.Following|null> {
		if(!channelId) channelId = StoreProxy.auth.twitch.user.id;
		const res = await fetch(Config.instance.TWITCH_API_PATH+"users/follows?to_id="+channelId+"&from_id="+uid, {
			method:"GET",
			headers:this.headers,
		});
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.getFollowInfo(uid, channelId);
		}
		const json:{error:string, data:TwitchDataTypes.Following[], pagination?:{cursor?:string}} = await res.json();
		if(json.error) {
			throw(json.error);
		}else{
			return json.data[0] ?? null;
		}
	}

	/**
	 * Gets a followers list
	 * 
	 * @param channelId channelId to get followers list
	 * @param tempDataCallback optional callback method to get results as they're loading
	 * 
	 * @deprecated will be disabled by twitch the 2023-08-03
	 */
	public static async getFollowers(channelId?:string|null, maxCount=-1, tempDataCallback?:(list:TwitchDataTypes.Following[])=>void):Promise<TwitchDataTypes.Following[]> {
		if(!channelId) channelId = StoreProxy.auth.twitch.user.id;
		let list:TwitchDataTypes.Following[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const count = maxCount==-1? 100 : Math.min(maxCount-list.length, 100);
			const res = await fetch(Config.instance.TWITCH_API_PATH+"users/follows?first="+count+"&to_id="+channelId+pCursor, {
				method:"GET",
				headers:this.headers,
			});
			if(res.status == 200) {
				const json:{data:TwitchDataTypes.Following[], pagination?:{cursor?:string}} = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if(json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
				if(tempDataCallback) {
					tempDataCallback(list);
				}
			}
		}while(cursor != null && (maxCount == -1 || list.length < maxCount));
		return list;
	}

	/**
	 * Gets a list of the channels following us (restricted to the authenticated user or their moderators)
	 * 
	 * @param channelId channelId to get followings list
	 * @param maxCount maximum followings to grabe
	 * @param tempDataCallback optional callback method to get results as they're loading
	 */
	public static async getFollowersV2(channelId?:string|null, maxCount=-1, tempDataCallback?:(list:TwitchDataTypes.FollowingV2[])=>void):Promise<TwitchDataTypes.FollowingV2[]> {
		if(!this.hasScope(TwitchScopes.LIST_FOLLOWERS)) return [];

		let list:TwitchDataTypes.FollowingV2[] = [];
		let cursor:string|null = null;
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH+"channels/followers");
			url.searchParams.append("broadcaster_id", StoreProxy.auth.twitch.user.id);
			url.searchParams.append("first", "100");
			if(cursor) url.searchParams.append("after", cursor);
			if(channelId) url.searchParams.append("user_id", channelId);
			const res = await fetch(url, {
				method:"GET",
				headers:this.headers,
			});
			if(res.status == 200) {
				const json:{data:TwitchDataTypes.FollowingV2[], pagination?:{cursor?:string}} = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if(json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
				if(tempDataCallback) {
					tempDataCallback(list);
				}
			}
		}while(cursor != null && (maxCount == -1 || list.length < maxCount));
		return list;
	}

	/**
	 * Gets a list of the channel followed by the specified user
	 * 
	 * @param channelId channelId to get followings list
	 * @param maxCount maximum followings to grabe
	 * @param tempDataCallback optional callback method to get results as they're loading
	 * 
	 * @deprecated will be disabled by twitch the 2023-08-03
	 */
	public static async getFollowings(channelId?:string|null, maxCount=-1, tempDataCallback?:(list:TwitchDataTypes.Following[])=>void):Promise<TwitchDataTypes.Following[]> {
		if(!channelId) channelId = StoreProxy.auth.twitch.user.id;
		let list:TwitchDataTypes.Following[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.instance.TWITCH_API_PATH+"users/follows?first=100&from_id="+channelId+pCursor, {
				method:"GET",
				headers:this.headers,
			});
			if(res.status == 200) {
				const json:{data:TwitchDataTypes.Following[], pagination?:{cursor?:string}} = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if(json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
				if(tempDataCallback) {
					tempDataCallback(list);
				}
			}
		}while(cursor != null && (maxCount == -1 || list.length < maxCount));
		return list;
	}

	/**
	 * Gets a list of the channels we follow
	 * 
	 * @param channelId channelId to get followings list
	 * @param maxCount maximum followings to grabe
	 * @param tempDataCallback optional callback method to get results as they're loading
	 */
	public static async getFollowingsV2(channelId:string, maxCount=-1, tempDataCallback?:(list:TwitchDataTypes.Following[])=>void):Promise<TwitchDataTypes.Following[]> {
		if(!this.hasScope(TwitchScopes.LIST_FOLLOWINGS)) return [];

		let list:TwitchDataTypes.Following[] = [];
		let cursor:string|null = null;
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH+"channels/followed");
			url.searchParams.append("first", "100");
			url.searchParams.append("user_id", channelId);
			if(cursor) url.searchParams.append("after", cursor);
			const res = await fetch(url, {
				method:"GET",
				headers:this.headers,
			});
			if(res.status == 200) {
				const json:{data:TwitchDataTypes.Following[], pagination?:{cursor?:string}} = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if(json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
				if(tempDataCallback) {
					tempDataCallback(list);
				}
			}
		}while(cursor != null && (maxCount == -1 || list.length < maxCount));
		return list;
	}

	/**
	 * Gets a list of the current subscribers to the specified channel
	 * Can only get our own subs
	 */
	public static async getSubsList():Promise<TwitchDataTypes.Subscriber[]> {
		if(!this.hasScope(TwitchScopes.LIST_SUBS)) return [];
		
		const channelId = StoreProxy.auth.twitch.user.id;
		let list:TwitchDataTypes.Subscriber[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.instance.TWITCH_API_PATH+"subscriptions?first=100&broadcaster_id="+channelId+pCursor, {
				method:"GET",
				headers:this.headers,
			});
			const json:{data:TwitchDataTypes.Subscriber[], pagination?:{cursor?:string}} = await res.json();
			list = list.concat(json.data);
			cursor = null;
			if(json.pagination?.cursor) {
				cursor = json.pagination.cursor;
			}
		}while(cursor != null)
		return list;
	}

	/**
	 * Gets the subscription state of a user to a channel
	 * Needs "user:read:subscriptions" scope
	 */
	public static async getSubscriptionState(userId:string, channelId?:string):Promise<TwitchDataTypes.Subscriber|null> {
		if(!this.hasScope(TwitchScopes.LIST_SUBS)) return null;
		
		if(!channelId) channelId = StoreProxy.auth.twitch.user.id;
		const res = await fetch(Config.instance.TWITCH_API_PATH+"subscriptions/user?broadcaster_id="+channelId+"&user_id="+userId, {
			method:"GET",
			headers:this.headers,
		});
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.getSubscriptionState(userId, channelId);
		}
		try {
			const json:{data:TwitchDataTypes.Subscriber[], pagination?:{cursor?:string}} = await res.json();
			if(json.data?.length > 0) {
				return json.data[0];
			}
		}catch(error) {}
		return null;
	}

	/**
	 * Gets if the specified user is following the channel
	 * 
	 * @param uid user ID list
	 */
	public static async startCommercial(duration:number, channelId:string):Promise<TwitchDataTypes.Commercial|null> {
		if(!this.hasScope(TwitchScopes.START_COMMERCIAL)) return null;
		
		const validDurations = [30, 60, 90, 120, 150, 180];
		//Invalid duration, force it to 30s
		if(!duration || isNaN(duration)) duration = validDurations[0];
		//Find the closest available duration to the one requested
		duration = validDurations.find(v=> v >= duration) ?? validDurations[validDurations.length-1];

		const options = {
			method:"POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"channels/commercial");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("length", duration.toString());
		const res = await fetch(url, options);
		const json = await res.json();
		if(json.error) {
			throw(json);
		}else{
			return json.data[0];
		}
	}

	/**
	 * Get pronouns of a user
	 */
	public static async getPronouns(uid: string, username: string): Promise<TwitchatDataTypes.Pronoun | null> {
		const getPronounAlejo = async (): Promise<TwitchatDataTypes.Pronoun | null> => {
			const res = await fetch(`https://pronouns.alejo.io/api/users/${username}`);
			const data = await res.json();

			if (data.error) {
				throw data;
			} else if (data.length > 0) {
				return data[0];
			}

			return null;
		};

		const getPronounPronounDb = async (): Promise<TwitchatDataTypes.Pronoun | null> => {
			const res = await fetch(`https://pronoundb.org/api/v1/lookup?platform=twitch&id=${uid}`);
			const data = await res.json();

			if (data.pronouns === "unspecified")
				return null;

			return {
				id: uid,
				login: username,
				pronoun_id: data.pronouns,
			};
		}

		let pronoun:TwitchatDataTypes.Pronoun | null = null;
		try {
			pronoun = await getPronounAlejo();
		}catch(error) {
			/*ignore*/
		}
		if (pronoun == null) {
			try {
				pronoun = await getPronounPronounDb();
			}catch(error) {
				/*ignore*/
			}
		}

		return pronoun;
	}

	/**
	 * Search for a stream category
	 * 
	 * @param search search term
	 */
	public static async searchCategory(search:string):Promise<TwitchDataTypes.StreamCategory[]> {
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"search/categories?first=50&query="+encodeURIComponent(search), options);
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.searchCategory(search);
		}
		const json = await res.json();
		if(json.error) {
			throw(json);
		}else{
			return json.data;
		}
	}

	/**
	 * Get a category's details
	 * 
	 * @param id category ID
	 */
	public static async getCategoryByID(id:string):Promise<TwitchDataTypes.StreamCategory> {
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"games?id="+encodeURIComponent(id), options);
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.getCategoryByID(id);
		}
		const json = await res.json();
		if(json.error) {
			throw(json);
		}else{
			return json.data[0];
		}
	}

	/**
	 * Update stream's title and game
	 */
	public static async setStreamInfos(title:string, categoryID:string, channelId:string, tags:string[] = []):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.SET_STREAM_INFOS)) return false;
		
		const options = {
			method:"PATCH",
			headers: this.headers,
			body: JSON.stringify({
				title,
				game_id:categoryID,
				//Make sure tags size and chars are valid
				tags:tags.forEach(v=> Utils.replaceDiacritics(v).replace(/[^a-z0-9]/gi, "").substring(0, 25).trim()),
				// delay:"0",
				// broadcaster_language:"en",
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"channels");
		url.searchParams.append("broadcaster_id", channelId);
		const res = await fetch(url.href, options);
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.setStreamInfos(title, categoryID, channelId, tags);
		}
		if(res.status == 204) {
			return true;
		}else{
			return false;
		}
	}

	/**
	 * Bans a user
	 */
	public static async banUser(user:TwitchatDataTypes.TwitchatUser, channelId:string, duration?:number, reason?:string):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.EDIT_BANNED)) return false;
		
		if(duration != undefined && duration === 0) return false;

		const body:{[key:string]:string|number} = {
			user_id:user.id,
		};
		if(duration) body.duration = duration;
		if(reason) body.reason = reason;
		
		const options = {
			method:"POST",
			headers: this.headers,
			body: JSON.stringify({data:body}),
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"moderation/bans");
		url.searchParams.append("broadcaster_id", StoreProxy.auth.twitch.user.id);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);

		const res = await fetch(url.href, options);
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.banUser(user, channelId, duration, reason);
		}
		if(res.status == 200) {
			StoreProxy.users.flagBanned("twitch", channelId, user.id, duration);
			return true;
		}else{
			const json = await res.json();
			if(json.message) {
				StoreProxy.main.alert(json.message);
			}
			return false;
		}
	}

	/**
	 * Unbans a user
	 */
	public static async unbanUser(user:TwitchatDataTypes.TwitchatUser, channelId:string):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.EDIT_BANNED)) return false;
		
		const options = {
			method:"DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"moderation/bans");
		url.searchParams.append("broadcaster_id", StoreProxy.auth.twitch.user.id);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);
		url.searchParams.append("user_id", user.id);

		const res = await fetch(url.href, options);
		if(res.status == 204) {
			StoreProxy.users.flagUnbanned("twitch", channelId, user.id);
			return true;
		}else 
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.unbanUser(user, channelId);
		}else {
			const json = await res.json();
			if(json.message) {
				StoreProxy.main.alert(json.message);
			}
			return false;
		}
	}

	/**
	 * Blocks a user
	 */
	public static async blockUser(user:TwitchatDataTypes.TwitchatUser, channelId:string, reason?:"spam" | "harassment" | "other", recursiveIndex:number=0):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.EDIT_BLOCKED)) return false;
		
		const options = {
			method:"PUT",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"users/blocks");
		url.searchParams.append("target_user_id", user.id);
		if(reason) url.searchParams.append("reason", reason);

		const res = await fetch(url.href, options);
		if(res.status == 204) {
			StoreProxy.users.flagBlocked("twitch", channelId, user.id);
			return true;
		}else 
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.blockUser(user, channelId, reason);
		}else {
			const json = await res.json();
			if(json.message) {
				StoreProxy.main.alert(json.message);
			}
			return false;
		}
	}

	/**
	 * Unblocks a user
	 */
	public static async unblockUser(user:TwitchatDataTypes.TwitchatUser, channelId:string):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.EDIT_BLOCKED)) return false;
		
		const options = {
			method:"DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"users/blocks");
		url.searchParams.append("target_user_id", user.id);

		const res = await fetch(url.href, options);
		if(res.status == 204) {
			StoreProxy.users.flagUnblocked("twitch", channelId, user.id);
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.unblockUser(user, channelId);
		} else {
			const json = await res.json();
			if(json.message) {
				StoreProxy.main.alert(json.message);
			}
			return false;
		}
	}

	/**
	 * Create a clip
	 */
	public static async createClip():Promise<boolean> {
		if(!this.hasScope(TwitchScopes.CLIPS)) return false;

		const message:TwitchatDataTypes.MessageClipCreate = {
			id:Utils.getUUID(),
			date:Date.now(),
			platform:"twitch",
			type:TwitchatDataTypes.TwitchatMessageType.CLIP_PENDING_PUBLICATION,
			clipUrl: "",
			clipID: "",
			error:false,
			loading:true,
		};
		StoreProxy.chat.addMessage(message);

		const options = {
			method:"POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"clips");
		url.searchParams.append("broadcaster_id", StoreProxy.auth.twitch.user.id);
		const res = await fetch(url.href, options);
		if(res.status > 200 && res.status < 204) {
			const json = await res.json();
			message.clipUrl = json.data[0].edit_url;
			message.clipID = json.data[0].id;
			
			let createdDate = Date.now();
			const interval = setInterval(async ()=> {
				const clip = await TwitchUtils.getClipById(message.clipID);
				if(clip) {
					clearInterval(interval);
					message.clipData = {
						url:clip.embed_url+"&autoplay=true&parent=twitchat.fr&parent=localhost",
						mp4:clip.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
						duration:clip.duration,
					};
					message.loading = false;
				}

				//If after 15s the clip is still not returned by the API, consider it failed
				if(Date.now() - createdDate > 15000) {
					message.error = true;
					message.loading = false;
					clearInterval(interval);
				}
			}, 1000);
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.raidCancel();
		}else {
			message.error = true;
			message.loading = false;
			try {
				const json = await res.json();
				if(json) StoreProxy.main.alert(json.message);
			}catch(error){
				StoreProxy.main.alert("Clip creation failed.");
			}
			return false;
		}
	}
	
	/**
	 * Get a clip by its ID
	 */
	public static async getClipById(clipId:string):Promise<TwitchDataTypes.ClipInfo|null> {
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"clips");
		url.searchParams.append("id", clipId);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			const json = await res.json();
			return json.data[0] ?? null;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.getClipById(clipId);
		} else {
			return null;
		}
	}

	/**
	 * Get a list of our blocked users
	 */
	public static async getBlockedUsers(max:number = 10000):Promise<TwitchDataTypes.BlockedUser[]> {
		if(!this.hasScope(TwitchScopes.LIST_BLOCKED)) return [];
		
		const options = {
			method:"GET",
			headers: this.headers,
		}
		let list:TwitchDataTypes.BlockedUser[] = [];
		let cursor:string|null = null;
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH+"users/blocks");
			url.searchParams.append("broadcaster_id", StoreProxy.auth.twitch.user.id);
			url.searchParams.append("first", "100");
			if(cursor) url.searchParams.append("after", cursor);
			const res = await fetch(url.href, options);
			if(res.status != 200) return [];//AS i managed to corrupt my twitch data, i need this to avoid errors everytime
			const json:{data:TwitchDataTypes.BlockedUser[], pagination?:{cursor?:string}} = await res.json();
			list = list.concat(json.data);
			cursor = null;
			if(json.pagination?.cursor) {
				cursor = json.pagination.cursor;
			}
			if(list.length >= max) break;
		}while(cursor != null)
		return list;
	}

	/**
	 * Sends an announcement
	 */
	public static async sendAnnouncement(channelId:string, message:string, color:"blue"|"green"|"orange"|"purple"|"primary" = "primary"):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.SEND_ANNOUNCE)) return false;
		
		const options = {
			method:"POST",
			headers: this.headers,
			body: JSON.stringify({ message, color }),
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"chat/announcements");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.sendAnnouncement(channelId, message, color);
		}else{
			return false;
		}
	}

	/**
	 * Deletes one or all chat message
	 * If no ID is specified, all messages are deleted
	 */
	public static async deleteMessages(channelId:string, messageId?:string):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.DELETE_MESSAGES)) return false;
		
		const options = {
			method:"DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"moderation/chat");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);
		if(messageId) url.searchParams.append("message_id", messageId);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.deleteMessages(channelId, messageId);
		}else{
			return false;
		}
	}

	/**
	 * Sets the shield mode state
	 */
	public static async setShieldMode(channelId:string, enabled:boolean):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.SHIELD_MODE)) return false;
		
		const options = {
			method:"PUT",
			headers: this.headers,
			body:JSON.stringify({
				is_active:enabled
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"moderation/shield_mode");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.setShieldMode(channelId, enabled);
		}else {
			return false;
		}
	}

	/**
	 * Change the user's chat color
	 */
	public static async setColor(color:"blue"|"blue_violet"|"cadet_blue"|"chocolate"|"coral"|"dodger_blue"|"firebrick"|"golden_rod"|"green"|"hot_pink"|"orange_red"|"red"|"sea_green"|"spring_green"|"yellow_green"|string):Promise<boolean> {
		const options = {
			method:"PUT",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"chat/color");
		url.searchParams.append("user_id", StoreProxy.auth.twitch.user.id);
		url.searchParams.append("color", color);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.setColor(color);
		}else {
			return false;
		}
	}

	/**
	 * Get the current room's settings
	 */
	public static async getRoomSettings(channelId:string):Promise<TwitchatDataTypes.IRoomSettings|null> {
		const options = {
			method:"GET",
			headers: this.headers,
		}

		const url = new URL(Config.instance.TWITCH_API_PATH+"chat/settings");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);
		const res = await fetch(url.href, options);
		if(res.status == 200)  {
			const json:{data:{
				broadcaster_id: string,
				slow_mode: boolean,
				slow_mode_wait_time?: any,
				follower_mode: boolean,
				follower_mode_duration: number,
				subscriber_mode: boolean,
				emote_mode: boolean,
				unique_chat_mode: boolean,
				non_moderator_chat_delay: boolean,
				non_moderator_chat_delay_duration: number,
			}[]} = await res.json();
			const data = json.data[0];
			const obj:TwitchatDataTypes.IRoomSettings = {};
			return {
				chatDelay:data.non_moderator_chat_delay === false? undefined : data.non_moderator_chat_delay_duration as number,
				emotesOnly:data.emote_mode === true,
				followOnly:data.follower_mode === false? undefined : data.follower_mode_duration,
				slowMode:data.slow_mode === false? undefined : data.slow_mode_wait_time,
				subOnly:data.subscriber_mode,
			}
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.getRoomSettings(channelId);
		}else {
			return null;
		}
	}

	/**
	 * Change rooms settings
	 */
	public static async setRoomSettings(channelId:string, settings:TwitchatDataTypes.IRoomSettings):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.SET_ROOM_SETTINGS)) return false;
		
		const body:any = {};
		if(typeof settings.emotesOnly == "boolean") body.emote_mode = settings.emotesOnly;
		
		if(typeof settings.subOnly == "boolean") body.subscriber_mode = settings.subOnly;StoreProxy.auth.twitch.user.id

		if(settings.followOnly===false) {
			body.follower_mode = false;
		}else if(typeof settings.followOnly == "number") {
			body.follower_mode = true;
			body.follower_mode_duration = Math.min(129600, Math.max(0, settings.followOnly));
		}

		if(settings.chatDelay===0) {
			body.non_moderator_chat_delay = false;
		}else if(typeof settings.chatDelay == "number") {
			body.non_moderator_chat_delay = true;
			body.non_moderator_chat_delay_duration = [2,4,6].find(v=> v >= settings.chatDelay!) ?? 2;
		}

		if(settings.slowMode===0) {
			body.slow_mode = false;
		}else if(typeof settings.slowMode == "number") {
			body.slow_mode = true;
			body.slow_mode_wait_time = Math.min(120, Math.max(3, settings.slowMode));
		}

		const options = {
			method:"PATCH",
			headers: this.headers,
			body:JSON.stringify(body),
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"chat/settings");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.setRoomSettings(channelId, settings);
		}else {
			return false;
		}
	}

	/**
	 * Add or remove a channel moderator
	 */
	public static async addRemoveModerator(removeMod:boolean, channelId:string, user:TwitchatDataTypes.TwitchatUser):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.EDIT_MODS)) return false;
		

		const options = {
			method:removeMod? "DELETE" : "POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"moderation/moderators");
		url.searchParams.append("broadcaster_id", StoreProxy.auth.twitch.user.id);
		url.searchParams.append("user_id", user.id);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			if(removeMod) {
				const m:TwitchatDataTypes.MessageModerationAction = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					channel_id:channelId,
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					noticeId:TwitchatDataTypes.TwitchatNoticeType.UNMOD,
					user,
					message:"User "+user.login+" has been unmod",//TODO translate
				};
				StoreProxy.chat.addMessage(m);
				StoreProxy.users.flagUnmod("twitch", channelId, user.id);
			}else{
				StoreProxy.users.flagMod("twitch", channelId, user.id);
			}
			return true;
		}else
		if(res.status == 400){
			const json = await res.json();
			if(/.*already.*mod.*/gi.test(json.message as string)){
				StoreProxy.main.alert("User "+user.login+" is already a moderator on this channel.");//TODO translate
			}else{
				StoreProxy.main.alert(json.message);
			}
			return false
		}else
		if(res.status == 422){
			const json = await res.json();
			const mess = json.message as string;
			if(removeMod) {
				StoreProxy.main.alert("User "+user.login+" is not a moderator of this channel");//TODO translate
			}else if(/.*is.*vip.*/gi.test(mess)){
				StoreProxy.main.alert("User "+user.login+" is a VIP of this channel. You first need to remove them from your VIPs");//TODO translate
			}
			return false
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.addRemoveModerator(removeMod, channelId, user);
		}else {
			return false;
		}
	}

	/**
	 * Add or remove a channel VIP
	 */
	public static async addRemoveVIP(removeVip:boolean, channelId:string, user:TwitchatDataTypes.TwitchatUser):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.EDIT_VIPS)) return false;
		
		const options = {
			method:removeVip? "DELETE" : "POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"channels/vips");
		url.searchParams.append("broadcaster_id", StoreProxy.auth.twitch.user.id);
		url.searchParams.append("user_id", user.id);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			if(removeVip) {
				const m:TwitchatDataTypes.MessageModerationAction = {
					id:Utils.getUUID(),
					date:Date.now(),
					platform:"twitch",
					channel_id:channelId,
					type:TwitchatDataTypes.TwitchatMessageType.NOTICE,
					noticeId:TwitchatDataTypes.TwitchatNoticeType.UNVIP,
					user,
					message:"User "+user.login+" has been removed from VIPs",//TODO translate
				};
				StoreProxy.chat.addMessage(m);
				StoreProxy.users.flagUnvip("twitch", channelId, user.id);
			}else{
				StoreProxy.users.flagVip("twitch", channelId, user.id);
			}
			return true;
		}else
		if(res.status == 400){
			const json = await res.json();
			StoreProxy.main.alert(json.message);
			return false
		}else
		if(res.status == 422){
			const json = await res.json();
			const mess = json.message as string;
			if(removeVip) {
				StoreProxy.main.alert("User "+user.login+" is not a VIP of this channel");//TODO translate
			}else if(/.*is.*moderator.*/gi.test(mess)){
				StoreProxy.main.alert("User "+user.login+" is a moderator of this channel. You first need to remove them from your mods");//TODO translate
			}else if(/.*is.*vip.*/gi.test(mess)){
				StoreProxy.main.alert("User "+user.login+" is already a VIP on this channel.");//TODO translate
			}
			return false
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.addRemoveVIP(removeVip, channelId, user);
		}else {
			return false;
		}
	}

	/**
	 * Raid a channel
	 */
	public static async raidChannel(channel:string):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.START_RAID)) return false;
		
		let channelId = "";
		try {
			channelId = (await this.loadUserInfo(undefined, [channel]))[0].id;
		}catch(error) {
			StoreProxy.main.alert("User "+channel+" not found");
			return false;
		}
		
		if(!channelId) return false;

		const options = {
			method:"POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"raids");
		url.searchParams.append("from_broadcaster_id", StoreProxy.auth.twitch.user.id);
		url.searchParams.append("to_broadcaster_id", channelId);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.raidChannel(channel);
		}else {
			let message = "Unable to raid "+channel+"."
			try {
				const json = await res.json();
				if(json.message) message = json.message;
			}catch(error) {}
			StoreProxy.main.alert(message);
			return false;
		}
	}

	/**
	 * Cancels the current raid
	 */
	public static async raidCancel():Promise<boolean> {
		const options = {
			method:"DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"raids");
		url.searchParams.append("broadcaster_id", StoreProxy.auth.twitch.user.id);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.raidCancel();
		}else {
			return false;
		}
	}

	/**
	 * Sends a whisper to someone
	 */
	public static async whisper(message:string, toLogin?:string, toId?:string):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.WHISPER_WRITE)) return false;
		
		if(!toId && toLogin) {
			try {
				toId = (await this.loadUserInfo(undefined, [toLogin]))[0].id;
			}catch(error) {
				StoreProxy.main.alert("User \""+toLogin+"\" not found");
				return false;
			}
		}
		
		if(!toId) return false;

		const options = {
			method:"POST",
			headers: this.headers,
			body:JSON.stringify({message})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"whispers");
		url.searchParams.append("from_user_id", StoreProxy.auth.twitch.user.id);
		url.searchParams.append("to_user_id", toId);
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.whisper(message, toLogin, toId);
		}else {
			try {
				const json = await res.json();
				if(json) StoreProxy.main.alert(json.message);
			}catch(error){
				StoreProxy.main.alert("You are not allowed to send whispers from Twitchat.");
			}
			return false;
		}
	}

	/**
	 * Get users on a chat room.
	 * Fallsback to old unofficial endpoint if don't have necessary rights to read
	 * chatters list with the new super restrictive endpoint..
	 * 
	 * @param channelId 	channel ID to get users
	 * @param channelName	give this to fallback to old unofficial endpoint
	 */
	public static async getChatters(channelId:string, channelName?:string):Promise<false|string[]> {
		if(!this.hasScope(TwitchScopes.LIST_CHATTERS)) return false;
		
		const options = {
			method:"GET",
			headers: this.headers,
		}
		
		const url = new URL(Config.instance.TWITCH_API_PATH+"chat/chatters");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);

		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			const json:{data:{user_id:string, user_login:string, user_name:string}[]} = await res.json();
			return json.data.map(v => v.user_login);
		}else 
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.getChatters(channelId, channelName);

		}else if(channelName && Date.now() < new Date("03-21-2023 00:00:00").getTime()) {//Unofficial api shutdown starts the 22nd of march
			//Fallback to unofficial endpoint while it still work..
			const res = await fetch(Config.instance.API_PATH+"/user/chatters?channel="+channelName);
			const json:{success:boolean, data:TwitchDataTypes.ChattersUnofficialEndpoint} = await res.json();
			if(!json.success) return false;
			let users:string[] = [];
			users = users.concat(json.data.chatters.admins);
			users = users.concat(json.data.chatters.broadcaster);
			users = users.concat(json.data.chatters.global_mods);
			users = users.concat(json.data.chatters.moderators);
			users = users.concat(json.data.chatters.vips);
			users = users.concat(json.data.chatters.staff);
			users = users.concat(json.data.chatters.viewers);
			return users;
		}
		return false;
	}

	/**
	 * Subscribe to an eventsub topic
	 */
	public static async eventsubSubscribe(channelId:string, userId:string, session_id:string, topic:string, version:"1"|"2"|"3"|"beta", additionalCondition?:{[key:string]:any}, attemptCount:number = 0):Promise<false|string[]> {
		const body ={
			type:topic,
			version,
			condition: {
				broadcaster_user_id:channelId,
				moderator_user_id:userId,
			}as {[key:string]:any},
			transport: {
				method:"websocket",
				session_id,
			}
		};

		if(additionalCondition) {
			for (const key in additionalCondition) {
				body.condition[key] = additionalCondition[key];
			}
		}

		const options = {
			method:"POST",
			headers: this.headers,
			body:JSON.stringify(body)
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"eventsub/subscriptions");
		
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			const json:{data:{user_login:string}[]} = await res.json();
			return json.data.map(v => v.user_login);
		}else 
		if(res.status == 429){
			//Rate limit reached, try again after it's reset to fulle
			let resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000;
			resetDate += 1000 * Math.pow(2,attemptCount);//Scale up the time frame 
			await Utils.promisedTimeout(Math.max(1000, resetDate - Date.now() + Math.random() * 5000));
			if(attemptCount<8) {
				return await this.eventsubSubscribe(channelId, userId, session_id, topic, version, additionalCondition, ++attemptCount);
			}
		}
		return false;
	}

	/**
	 * Get all eventsub subscriptions
	 */
	public static async eventsubGetSubscriptions():Promise<TwitchDataTypes.EventsubSubscription[]> {
		let cursor:string|null = null;
		let list:TwitchDataTypes.EventsubSubscription[] = [];
		const options = {
			method:"GET",
			headers: this.headers,
		}
		
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH+"eventsub/subscriptions");
			if(cursor) {
				url.searchParams.append("after", cursor)
			}
			const res = await fetch(url, options);
			if(res.status == 200 || res.status == 204) {
				const json:{data:TwitchDataTypes.EventsubSubscription[], pagination?:{cursor?:string}} = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if(json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			}else{
				return [];
			}
		}while(cursor != null)
		return list;
	}

	/**
	 * Delete an eventsub subscription
	 */
	public static async eventsubDeleteSubscriptions(id:string):Promise<boolean> {
		const options = {
			method:"DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"eventsub/subscriptions");
		url.searchParams.append("id", id);
		
		const res = await fetch(url.href, options);
		if(res.status == 200 || res.status == 204) {
			return true;
		}
		return false;
	}

	/**
	 * @deprecated Endpoint to be removed in 2023!
	 * Search for a stream tag
	 * Still used for data migration
	 * 
	 * @param search search term
	 */
	public static async searchTag(ids:string[]):Promise<{id:string, label:string}[]> {
		const result:{id:string, label:string}[] = [];

		const options = {
			method:"GET",
			headers: this.headers,
		}

		let list:TwitchDataTypes.StreamTag[] = [];
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH+"tags/streams");
			for (let i = 0; i < Math.min(100, ids.length); i++) {
				url.searchParams.append("tag_id", ids.pop()!);
			}
			url.searchParams.append("first", "100");

			const res = await fetch(url, options);
			const json:{data:TwitchDataTypes.StreamTag[], pagination?:{cursor?:string}} = await res.json();
			list = list.concat(json.data);
		}while(ids.length > 0);
		
		//@ts-ignore
		let userLang:string = navigator.language ?? navigator.userLanguage; 
		userLang = userLang.toLowerCase();
		if(userLang.indexOf("-") == -1) {
			userLang += "-"+userLang;
		}

		for (let i = 0; i < list.length; i++) {
			const t = list[i];
			let label = t.localization_names[userLang];
			if(!label) label = t.localization_names["en-us"];
			result.push({id:t.tag_id, label});
		}
		
		return result;
	}

	/**
	 * Returns if current session has 1 or multiple scopes granted.
	 * All given scopes must be granted for this function to return true
	 * 
	 * @param scopes
	 */
	public static hasScope(scopes:TwitchScopesString|TwitchScopesString[]):boolean {
		if(!Array.isArray(scopes)) {
			scopes = [scopes];
		}

		for (let i = 0; i < scopes.length; i++) {
			if(StoreProxy.auth.twitch.scopes.indexOf(scopes[i]) == -1) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Sends a whisper to someone
	 */
	public static async sendShoutout(channelId:string, user:TwitchatDataTypes.TwitchatUser):Promise<boolean> {
		if(!this.hasScope(TwitchScopes.SHOUTOUT)) return false;

		const options = {
			method:"POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH+"chat/shoutouts");
		url.searchParams.append("from_broadcaster_id", channelId);
		url.searchParams.append("to_broadcaster_id", user.id);
		url.searchParams.append("moderator_id", StoreProxy.auth.twitch.user.id);
		
		const res = await fetch(url.href, options);
		
		if(res.status == 200 || res.status == 204) {
			return true;
		}else
		if(res.status == 429){
			let message = "";
			try {
				const json = await res.json();
				if(json) message = json.message;
			}catch(error){
				StoreProxy.main.alert("Shoutout failed.");
			}
			if(message.indexOf("cooldown")) {
				StoreProxy.main.alert(StoreProxy.i18n.t("error.shoutout_cooldown"));
				return false;
			}
			//Rate limit reached, try again after it's reset to fulle
			const resetDate = parseInt(res.headers.get("Ratelimit-Reset") as string ?? Math.round(Date.now()/1000).toString()) * 1000 + 1000;
			await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
			return await this.sendShoutout(channelId, user);
		}else {
			try {
				const json = await res.json();
				if(json) StoreProxy.main.alert(json.message);
			}catch(error){
				StoreProxy.main.alert("Shoutout failed.");
			}
			return false;
		}
	}

	/**
	 * Requests for scopes if not yet granted
	 * @param scopes 
	 * @returns true if all scopes are granted. False if user iis prompted to grant access
	 */
	public static requestScopes(scopes:TwitchScopesString[]):boolean {
		if(this.hasScope(scopes)) return true;
		StoreProxy.auth.requestTwitchScopes(scopes);
		return false;
	}

	/**
	 * Gets a user's followers count
	 * 
	 * @param channelId channelId to get followers list
	 */
	public static async getFollowerCount(channelId?:string|null):Promise<number> {
		if(!channelId) channelId = StoreProxy.auth.twitch.user.id;
		
		const url = new URL(Config.instance.TWITCH_API_PATH+"channels/followers");
		url.searchParams.append("broadcaster_id", channelId);
		
		const res = await fetch(url, {
			method:"GET",
			headers:this.headers,
		});
		if(res.status == 200) {
			const json:{data:[], total:number} = await res.json();
			return json.total
		}
		return 0;
	}

}