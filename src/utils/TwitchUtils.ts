import type { Badges } from "tmi.js";
import type { TwitchDataTypes } from "../types/TwitchDataTypes";
import BTTVUtils from "./BTTVUtils";
import Config from "./Config";
import FFZUtils from "./FFZUtils";
import SevenTVUtils from "./SevenTVUtils";
import StoreProxy from "./StoreProxy";
import UserSession from "./UserSession";
import Utils from "./Utils";

/**
* Created : 19/01/2021 
*/
export default class TwitchUtils {

	public static client_id = "";
	public static badgesCache:{[key:string]:{[key:string]:TwitchDataTypes.BadgesSet}} = {};
	public static cheermoteCache:{[key:string]:TwitchDataTypes.CheermoteSet[]} = {};
	public static emoteCache:TwitchDataTypes.Emote[] = [];
	public static rewardsCache:TwitchDataTypes.Reward[] = [];

	private static tagsLoadingPromise:((value: TwitchDataTypes.StreamTag[] | PromiseLike<TwitchDataTypes.StreamTag[]>) => void) | null;
	private static tagsCache:TwitchDataTypes.StreamTag[] = [];

	private static get headers():{[key:string]:string} {
		return {
			'Authorization': 'Bearer '+UserSession.instance.token?.access_token,
			'Client-Id': this.client_id,
			'Content-Type': "application/json",
		};
	}

	public static getOAuthURL(csrfToken:string):string {
		const redirect = encodeURIComponent( document.location.origin+"/oauth" );
		const scopes = encodeURIComponent( Config.instance.TWITCH_APP_SCOPES.join(" ") );

		let url = "https://id.twitch.tv/oauth2/authorize?";
		url += "client_id="+this.client_id
		url += "&redirect_uri="+redirect;
		url += "&response_type=code";
		url += "&scope="+scopes;
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
			});
		});
	}

	/**
	 * Gets the badges of a channel
	 * @returns
	 */
	public static async loadUserBadges(uid:string):Promise<{[key:string]:TwitchDataTypes.BadgesSet}> {
		if(this.badgesCache[uid]) return this.badgesCache[uid];

		const options = {
			method: "GET",
			headers: {},
		};
		//URL could be replaced with this one to avoid needing an auth token :
		//https://badges.twitch.tv/v1/badges/channels/{UID}/display
		// const result = await fetch(Config.instance.TWITCH_API_PATH+"chat/badges?broadcaster_id="+uid, options);
		const result = await fetch("https://badges.twitch.tv/v1/badges/channels/"+uid+"/display", options);
		if(result.status == 200) {
			const json = await result.json();
			this.badgesCache[uid] = json.badge_sets;
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
	public static async loadGlobalBadges():Promise<{[key:string]:TwitchDataTypes.BadgesSet}> {
		if(this.badgesCache["global"]) return this.badgesCache["global"];

		const options = {
			method: "GET",
			headers: {},
		};
		//URL could be replaced with this one to avoid needing an auth token :
		//https://badges.twitch.tv/v1/badges/global/display
		// const result = await fetch(Config.instance.TWITCH_API_PATH+"chat/badges/global", options);
		const result = await fetch("https://badges.twitch.tv/v1/badges/global/display", options);
		if(result.status == 200) {
			const json = await result.json();
			this.badgesCache["global"] = json.badge_sets;
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
	public static getBadgesImagesFromRawBadges(channelId:string, userBadges:Badges|undefined):TwitchDataTypes.Badge[] {
		const result:TwitchDataTypes.Badge[] = [];
		for (const userBadgeCategory in userBadges) {
			const userBadgeID = userBadges[ userBadgeCategory ] as string;
			const caches = [this.badgesCache[channelId], this.badgesCache["global"]];
			for (let i = 0; i < caches.length; i++) {
				const cache = caches[i];
				if(!cache) continue;
				const badgeSet = cache[userBadgeCategory];
				if(badgeSet) {
					const badge = badgeSet.versions[userBadgeID];
					if(badge) {
						result.push(badge);
						break;
					}
				}
			}
		}
		return result;
	}

	/**
	 * Replaces emotes by image tags on the message
	 */
	public static parseEmotes(message:string, emotes:string|undefined, removeEmotes = false, customParsing = false):TwitchDataTypes.ParseMessageChunk[] {

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
			//Darn IRC that doesn't sends back proper emotes tag 
			//to its sender...
			//Parses for all emotes and generates a fake "emotes"
			//tag as if it was sent by IRC.
			if(customParsing && UserSession.instance.emotesCache) {
				let fakeTag = "";
				const emoteList = UserSession.instance.emotesCache;
				const tagsDone:{[key:string]:boolean} = {};
				// const start = Date.now();
				//Parse all available emotes
				for (let i = 0; i < emoteList.length; i++) {
					const e = emoteList[i];
					const name = e.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
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
							const end = start+e.name.length-1;
							const range = getProtectedRange(fakeTag);

							if(range[start] === true || range[end] === true) continue;
							
							const prevOK = start == 0 || /\s/.test(message.charAt(start-1));
							const nextOK = end == message.length-1 || /\s/.test(message.charAt(end+1));
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

		const emotesList:{id:string, start:number, end:number}[] = [];
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
					const start = parseInt(p.split("-")[0]);
					const end = parseInt(p.split("-")[1]);
					if(isNaN(start) || isNaN(end)) continue;
					emotesList.push({id, start, end});
				}
			}
		}
		//Sort emotes by start position
		emotesList.sort((a,b) => a.start - b.start);

		let cursor = 0;
		const result:TwitchDataTypes.ParseMessageChunk[] = [];
		//Convert emotes to image tags
		for (let i = 0; i < emotesList.length; i++) {
			const e = emotesList[i];
			if(cursor < e.start) {
				result.push( {type:"text", value: Array.from(message).slice(cursor, e.start).join("")} );
			}
			if(!removeEmotes) {
				const code = Array.from(message).slice(e.start, e.end + 1).join("").trim();
				if(e.id.indexOf("BTTV_") == 0) {
					const bttvE = BTTVUtils.instance.getEmoteFromCode(code);
					if(bttvE) {
						result.push( {type:"emote", label:"BTTV: "+code, emote:code, value:"https://cdn.betterttv.net/emote/"+bttvE.id+"/1x"} );
					}else{
						result.push( {type:"text", value:code} );
					}
				}else
				if(e.id.indexOf("FFZ_") == 0) {
					const bttvE = FFZUtils.instance.getEmoteFromCode(code);
					if(bttvE) {
						result.push( {type:"emote", label:"FFZ: "+code, emote:code, value:"https://"+bttvE.urls[1]} );
					}else{
						result.push( {type:"text", value:code} );
					}
				}else
				if(e.id.indexOf("7TV_") == 0) {
					const sevenTVE = SevenTVUtils.instance.getEmoteFromCode(code);
					if(sevenTVE) {
						result.push( {type:"emote", label:"7TV: "+code, emote:code, value:sevenTVE.urls[1][1]} );
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
	public static async parseCheermotes(message:string, channel_id:string):Promise<string> {
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
				message = message.replace(new RegExp(list.prefix+bitsCount, "gi"), "<img src='"+img+"' class='cheermote'>")
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
		//Split by 100 max to comply with API limitations
		while(uids.length > 0) {
			const param = "broadcaster_id";
			const params = param+"="+uids.splice(0,100).join("&"+param+"=");
			const url = Config.instance.TWITCH_API_PATH+"channels?"+params;
			const access_token = UserSession.instance.token?.access_token;
			const result = await fetch(url, { headers:this.headers });
			const json = await result.json();
			channels = channels.concat(json.data);
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
			const access_token = UserSession.instance.token?.access_token;
			const result = await fetch(url, {headers:this.headers});
			const json = await result.json();
			users = users.concat(json.data);
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
			const param = ids ? "user_id" : "user_login";
			const params = param+"="+items.splice(0,100).join("&"+param+"=");
			const url = Config.instance.TWITCH_API_PATH+"streams?first=1&"+params;
			const access_token = UserSession.instance.token?.access_token;
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
				user_id:UserSession.instance.user.user_id,
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
	public static async loadCheermoteList(uid:string):Promise<TwitchDataTypes.CheermoteSet[]> {
		if(this.cheermoteCache[uid]) return this.cheermoteCache[uid];
		
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"bits/cheermotes?broadcaster_id="+UserSession.instance.user.user_id, options);
		const json = await res.json();
		this.cheermoteCache[uid] = json.data;
		return json.data;
	}

	/**
	 * Create a poll
	 */
	public static async createPoll(question:string, answers:string[], duration:number, bitsPerVote = 0, pointsPerVote = 0):Promise<TwitchDataTypes.Poll[]> {
		const options = {
			method:"POST",
			headers: this.headers,
			body: JSON.stringify({
				broadcaster_id:UserSession.instance.user.user_id,
				title:question,
				choices:answers.map(v => {return {title:v}}),
				duration,
				bits_voting_enabled:bitsPerVote > 0,
				bits_per_vote:bitsPerVote,
				channel_points_voting_enabled:pointsPerVote > 0,
				channel_points_per_vote:pointsPerVote,
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"polls", options);
		const json = await res.json();
		if(res.status == 200) {
			window.setTimeout(()=> {
				this.getPolls();
			}, (duration+1) * 1000);
			StoreProxy.store.dispatch("setPolls", {data:json.data});
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get a list of the latest polls and store any active one to the store
	 */
	public static async getPolls():Promise<TwitchDataTypes.Poll[]> {
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"polls?broadcaster_id="+UserSession.instance.user.user_id, options);
		const json = await res.json();
		if(res.status == 200) {
			StoreProxy.store.dispatch("setPolls", {data:json.data});
			return json.data;
		}
		throw(json);
	}

	/**
	 * Ends a poll
	 */
	public static async endPoll(pollId:string):Promise<TwitchDataTypes.Poll[]> {
		const options = {
			method:"PATCH",
			headers: this.headers,
			body: JSON.stringify({
				id:pollId,
				status:"TERMINATED",
				broadcaster_id:UserSession.instance.user.user_id,
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"polls", options);
		const json = await res.json();
		if(res.status == 200) {
			StoreProxy.store.dispatch("setPolls", {data:json.data});
			return json.data;
		}
		throw(json);
	}


	

	/**
	 * Create a prediction
	 */
	public static async createPrediction(question:string, answers:string[], duration:number):Promise<TwitchDataTypes.Prediction[]> {
		const options = {
			method:"POST",
			headers: this.headers,
			body: JSON.stringify({
				broadcaster_id:UserSession.instance.user.user_id,
				title:question,
				outcomes:answers.map(v => {return {title:v}}),
				prediction_window:duration,
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"predictions", options);
		const json = await res.json();
		if(res.status == 200) {
			window.setTimeout(()=> {
				this.getPredictions();
			}, (duration+1) * 1000);
			StoreProxy.store.dispatch("setPredictions", json.data);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get a list of the latest predictions
	 */
	public static async getPredictions():Promise<TwitchDataTypes.Prediction[]> {
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"predictions?broadcaster_id="+UserSession.instance.user.user_id, options);
		const json = await res.json();
		if(res.status == 200) {
			StoreProxy.store.dispatch("setPredictions", json.data);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Ends a prediction
	 */
	public static async endPrediction(pollId:string, winId:string, cancel = false):Promise<TwitchDataTypes.Prediction[]> {
		const options = {
			method:"PATCH",
			headers: this.headers,
			body: JSON.stringify({
				id:pollId,
				status:cancel? "CANCELED" : "RESOLVED",
				winning_outcome_id:winId,
				broadcaster_id:UserSession.instance.user.user_id,
			})
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"predictions", options);
		const json = await res.json();
		if(res.status == 200) {
			StoreProxy.store.dispatch("setPredictions", json.data);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get the latest hype train info
	 */
	public static async getHypeTrains():Promise<TwitchDataTypes.HypeTrain[]> {
		const options = {
			method:"GET",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"hypetrain/events?broadcaster_id="+UserSession.instance.user.user_id, options);
		const json = await res.json();
		if(res.status == 200) {
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get the emotes list
	 */
	public static async getEmotes():Promise<TwitchDataTypes.Emote[]> {
		while(this.emoteCache.length == 0) {
			await Utils.promisedTimeout(100);
		}
		return this.emoteCache;
	}

	/**
	 * Get the emotes list
	 */
	public static async loadEmoteSets(sets:string[]):Promise<TwitchDataTypes.Emote[]> {
		if(this.emoteCache.length > 0) return this.emoteCache;
		const options = {
			method:"GET",
			headers: this.headers,
		}
		let emotes:TwitchDataTypes.Emote[] = [];
		do {
			const params = sets.splice(0,25).join("&emote_set_id=");
			const res = await fetch(Config.instance.TWITCH_API_PATH+"chat/emotes/set?emote_set_id="+params, options);
			const json = await res.json();
			if(res.status == 200) {
				emotes = emotes.concat(json.data);
			}else{
				throw(json);
			}
		}while(sets.length > 0);
		this.emoteCache = emotes;
		//Sort them by name length DESC to make manual emote parsing easier.
		//When sending a message on IRC, we don't get a clean callback
		//message with parsed emotes (nor id, timestamp and other stuff)
		//This means that every message sent from this interface must be
		//parsed manually. Love it..
		emotes.sort((a,b)=> b.name.length - a.name.length );
		StoreProxy.store.dispatch("setEmotes", emotes);
		return emotes;
	}

	/**
	 * Get the rewards list
	 */
	public static async loadRewards(forceReload = false):Promise<TwitchDataTypes.Reward[]> {
		if(this.rewardsCache.length > 0 && !forceReload) return this.rewardsCache;
		const options = {
			method:"GET",
			headers: this.headers,
		}
		let rewards:TwitchDataTypes.Reward[] = [];
		const res = await fetch(Config.instance.TWITCH_API_PATH+"channel_points/custom_rewards?broadcaster_id="+UserSession.instance.user.user_id, options);
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
		const options = {
			method:"GET",
			headers: this.headers,
		}
		let redemptions:TwitchDataTypes.RewardRedemption[] = [];
		const res = await fetch(Config.instance.TWITCH_API_PATH+"channel_points/custom_rewards/redemptions?broadcaster_id="+UserSession.instance.user.user_id, options);
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
		const res = await fetch(Config.instance.TWITCH_API_PATH+"channel_points/custom_rewards?broadcaster_id="+UserSession.instance.user.user_id+"&id="+id, {
			method:"PATCH",
			headers:this.headers,
			// body:JSON.stringify({is_enabled:!enabled}),
			body:JSON.stringify({is_paused:!enabled}),
		})
		return await res.json();
	}

	/**
	 * Get the moderators list of a channel
	 */
	public static async getModerators():Promise<TwitchDataTypes.ModeratorUser[]> {
		let list:TwitchDataTypes.ModeratorUser[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.instance.TWITCH_API_PATH+"moderation/moderators?first=100&broadcaster_id="+UserSession.instance.user.user_id+pCursor, {
				method:"GET",
				headers:this.headers,
			});
			const json:{data:TwitchDataTypes.ModeratorUser[], pagination?:{cursor?:string}} = await res.json();
			list = list.concat(json.data);
			cursor = null;
			if(json.pagination?.cursor) {
				cursor = json.pagination.cursor;
			}
		}while(cursor != null)
		return list;
	}
	

	/**
	 * Get all the active streams that the current user is following
	 */
	public static async getActiveFollowedStreams():Promise<TwitchDataTypes.StreamInfo[]> {
		let list:TwitchDataTypes.StreamInfo[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.instance.TWITCH_API_PATH+"streams/followed?first=100&user_id="+UserSession.instance.user.user_id+pCursor, {
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
	 * Gets if the specified user is following the channel
	 * 
	 * @param uid user ID list
	 */
	public static async getFollowState(uid:string, channelId?:string):Promise<boolean> {
		if(!channelId) channelId = UserSession.instance.user.user_id;
		const res = await fetch(Config.instance.TWITCH_API_PATH+"users/follows?to_id="+channelId+"&from_id="+uid, {
			method:"GET",
			headers:this.headers,
		});
		const json:{error:string, data:TwitchDataTypes.Following[], pagination?:{cursor?:string}} = await res.json();
		if(json.error) {
			throw(json.error);
		}else{
			return json.data.length > 0;
		}
	}

	/**
	 * Gets a followers' list
	 * 
	 * @param channelId channelId to get followers list
	 */
	public static async getFollowers(channelId?:string|null, maxCount=-1):Promise<TwitchDataTypes.Following[]> {
		if(!channelId) channelId = UserSession.instance.user.user_id;
		let list:TwitchDataTypes.Following[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.instance.TWITCH_API_PATH+"users/follows?first=100&to_id="+channelId+pCursor, {
				method:"GET",
				headers:this.headers,
			});
			const json:{data:TwitchDataTypes.Following[], pagination?:{cursor?:string}} = await res.json();
			list = list.concat(json.data);
			cursor = null;
			if(json.pagination?.cursor) {
				cursor = json.pagination.cursor;
			}
		}while(cursor != null && (maxCount == -1 || list.length < maxCount));
		return list;
	}

	/**
	 * Gets a list of the current subscribers to the specified channel
	 */
	public static async getSubsList(channelId?:string):Promise<TwitchDataTypes.Subscriber[]> {
		if(!channelId) channelId = UserSession.instance.user.user_id;
		let list:TwitchDataTypes.Subscriber[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.instance.TWITCH_API_PATH+"subscriptions?first=100&broadcaster_id="+UserSession.instance.user.user_id+pCursor, {
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
	 * Gets if the specified user is following the channel
	 * 
	 * @param uid user ID list
	 */
	public static async startCommercial(duration:number):Promise<TwitchDataTypes.Commercial> {
		// if(duration != 30 && duration != 60 && duration != 90 && duration != 120 && duration != 150 && duration != 180) {
		// 	throw("Invalid commercial duration, must be 30, 60, 90, 120, 150 or 180");
		// }
		const options = {
			method:"POST",
			headers: this.headers,
		}
		const res = await fetch(Config.instance.TWITCH_API_PATH+"channels/commercial?broadcaster_id="+UserSession.instance.user.user_id+"&length="+duration, options);
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
	public static async getPronouns(uid: string, username: string): Promise<TwitchDataTypes.Pronoun | null> {
		const getPronounAlejo = async (): Promise<TwitchDataTypes.Pronoun | null> => {
			const res = await fetch(`https://pronouns.alejo.io/api/users/${username}`);
			const data = await res.json();

			if (data.error) {
				throw data;
			} else if (data.length > 0) {
				return data[0];
			}

			return null;
		};

		const getPronounPronounDb = async (): Promise<TwitchDataTypes.Pronoun | null> => {
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

		let pronoun:TwitchDataTypes.Pronoun | null = null;
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
		const json = await res.json();
		if(json.error) {
			throw(json);
		}else{
			return json.data[0];
		}
	}

	/**
	 * Search for a stream tag
	 * 
	 * @param search search term
	 */
	public static async searchTag(search:string):Promise<TwitchDataTypes.StreamTag[]> {
		return new Promise(async (resolve, reject)=> {

			search = search.toLowerCase();
			
			//If tags list is already loing, wait for it to avoid multiple
			//parallel loading.
			if(this.tagsLoadingPromise) return this.tagsLoadingPromise;
			
			//Tags aren't loaded yet, load them all
			if(this.tagsCache.length == 0){
				this.tagsLoadingPromise = resolve;
	
				const options = {
					method:"GET",
					headers: this.headers,
				}
		
				let list:TwitchDataTypes.StreamTag[] = [];
				let cursor:string|null = null;
				do {
					const pCursor = cursor? "&after="+cursor : "";
					const res = await fetch(Config.instance.TWITCH_API_PATH+"tags/streams?first=100&"+pCursor, options);
					const json:{data:TwitchDataTypes.StreamTag[], pagination?:{cursor?:string}} = await res.json();
					list = list.concat(json.data);
					cursor = null;
					if(json.pagination?.cursor) {
						cursor = json.pagination.cursor;
					}
				}while(cursor != null);
				
				list = list.filter(v => !v.is_auto);
				this.tagsCache = list;
			}
	
			
			//@ts-ignore
			let userLang:string = navigator.language || navigator.userLanguage; 
			userLang = userLang.toLowerCase();
			if(userLang.indexOf("-") == -1) {
				userLang += "-"+userLang;
			}
	
			const result:TwitchDataTypes.StreamTag[] = [];
			for (let i = 0; i < this.tagsCache.length; i++) {
				const t = this.tagsCache[i];
				if(t.localization_names["en-us"].toLowerCase().indexOf(search) > -1) {
					result.push(t);
	
				}else if(userLang != 'en-us'
				&& t.localization_names[userLang]?.toLowerCase().indexOf(search) > -1) {
					result.push(t);
				}
			}

			this.tagsLoadingPromise = null;
	
			resolve(result);
		})
	}

	/**
	 * Get current stream's infos
	 */
	public static async getStreamInfos():Promise<TwitchDataTypes.ChannelInfo> {
		const options = {
			method:"GET",
			headers: this.headers
		}
		let url = new URL(Config.instance.TWITCH_API_PATH+"channels");
		url.searchParams.append("broadcaster_id", UserSession.instance.user.user_id);
		const res = await fetch(url.href, options);
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
	public static async setStreamInfos(title:string, categoryID:string):Promise<boolean> {
		const options = {
			method:"PATCH",
			headers: this.headers,
			body: JSON.stringify({
				title,
				game_id:categoryID,
				// delay:"0",
				// broadcaster_language:"en",
			})
		}
		let url = new URL(Config.instance.TWITCH_API_PATH+"channels");
		url.searchParams.append("broadcaster_id", UserSession.instance.user.user_id);
		const res = await fetch(url.href, options);
		if(res.status == 204) {
			return true;
		}else{
			return false;
		}
	}

	/**
	 * Get channel's tags
	 */
	public static async getStreamTags():Promise<TwitchDataTypes.StreamTag[]> {
		const options = {
			method:"GET",
			headers: this.headers
		}
		let url = new URL(Config.instance.TWITCH_API_PATH+"streams/tags");
		url.searchParams.append("broadcaster_id", UserSession.instance.user.user_id);
		const res = await fetch(url.href, options);
		const json = await res.json();
		if(json.error) {
			throw(json);
		}else{
			return (json.data as TwitchDataTypes.StreamTag[]).filter(v => !v.is_auto);
		}
	}

	/**
	 * Update channel's tags
	 */
	public static async setStreamTags(tagIDs:string[]):Promise<boolean> {
		const options = {
			method:"PUT",
			headers: this.headers,
			body: JSON.stringify({
				tag_ids:tagIDs,
			})
		}
		let url = new URL(Config.instance.TWITCH_API_PATH+"streams/tags");
		url.searchParams.append("broadcaster_id", UserSession.instance.user.user_id);
		const res = await fetch(url.href, options);
		if(res.status == 204) {
			return true;
		}else{
			return false;
		}
	}
}