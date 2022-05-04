import router from "@/router";
import store from "@/store";
import { Badges, ChatUserstate } from "tmi.js";
import BTTVUtils from "./BTTVUtils";
import Config from "./Config";
import FFZUtils from "./FFZUtils";
import IRCClient from "./IRCClient";
import { IRCEventDataList } from "./IRCEvent";
import Utils from "./Utils";

/**
* Created : 19/01/2021 
*/
export default class TwitchUtils {

	public static client_id:string = "";
	public static badgesCache:{[key:string]:{[key:string]:TwitchTypes.BadgesSet}} = {};
	public static cheermoteCache:{[key:string]:TwitchTypes.CheermoteSet[]} = {};
	public static emoteCache:TwitchTypes.Emote[] = [];
	public static rewardsCache:TwitchTypes.Reward[] = [];

	public static getOAuthURL(csrfToken:string):string {
		const path = router.resolve({name:"oauth"}).href;
		const redirect = encodeURIComponent( document.location.origin+path );
		const scopes = encodeURIComponent( Config.TWITCH_APP_SCOPES.join(" ") );

		let url = "https://id.twitch.tv/oauth2/authorize?";
		url += "client_id="+this.client_id
		url += "&redirect_uri="+redirect;
		url += "&response_type=code";
		url += "&scope="+scopes;
		url += "&state="+csrfToken;
		url += "&force_verify=true";
		return url;
	}
	
	public static validateToken(oAuthToken:string):Promise<TwitchTypes.Token|TwitchTypes.Error> {
		return new Promise((resolve, reject) => {
			const headers = {
				"Authorization":"Bearer "+oAuthToken
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
	public static async loadUserBadges(uid:string):Promise<{[key:string]:TwitchTypes.BadgesSet}> {
		if(this.badgesCache[uid]) return this.badgesCache[uid];

		const options = {
			method: "GET",
			headers: {},
		};
		//URL could be replaced with this one to avoid needing an auth token :
		//https://badges.twitch.tv/v1/badges/channels/{UID}/display
		// const result = await fetch(Config.TWITCH_API_PATH+"chat/badges?broadcaster_id="+uid, options);
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
	public static async loadGlobalBadges():Promise<{[key:string]:TwitchTypes.BadgesSet}> {
		if(this.badgesCache["global"]) return this.badgesCache["global"];

		const options = {
			method: "GET",
			headers: {},
		};
		//URL could be replaced with this one to avoid needing an auth token :
		//https://badges.twitch.tv/v1/badges/global/display
		// const result = await fetch(Config.TWITCH_API_PATH+"chat/badges/global", options);
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
	public static getBadgesImagesFromRawBadges(channelId:string, userBadges:Badges|undefined):TwitchTypes.Badge[] {
		const result:TwitchTypes.Badge[] = [];
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
	public static parseEmotes(message:string, emotes:string|undefined, removeEmotes:boolean = false, customParsing:boolean = false):TwitchTypes.ParseMessageChunk[] {
		if(!emotes || emotes.length == 0) {
			//Attempt to parse emotes manually.
			//Darn IRC that doesn't sends back proper emotes tag 
			//to its sender...
			//Parses for all emotes and generates a fake "emotes"
			//tag as if it was sent by IRC.
			if(customParsing && store.state.userEmotesCache) {
				let fakeTag = "";
				const emoteList = store.state.emotesCache as TwitchTypes.Emote[];
				const tagsDone:{[key:string]:boolean} = {};
				//Parse all available emotes
				for (let i = 0; i < emoteList.length; i++) {
					const e = emoteList[i];
					const name = e.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
					if(tagsDone[name]) continue;
					tagsDone[name] = true;
					const matches = [...message.matchAll(new RegExp("(^|\\s?)"+name+"(\\s|$)", "g"))];
					if(matches && matches.length > 0) {
						//Current emote has been found
						//Generate fake emotes data in the expected format:
						//  ID:start-end,start-end/ID:start-end,start-end
						if(fakeTag.length > 0) fakeTag += "/";
						fakeTag += e.id+":";
						for (let i = 0; i < matches.length; i++) {
							const index = (matches[i].index as number);
							fakeTag += index+"-"+(index+e.name.length);
							if(i < matches.length-1) fakeTag+=",";
						}
					}
				}
				if(fakeTag.length > 0) fakeTag +=";";
				emotes = fakeTag;
			}
		}

		if(!emotes) emotes = "";
		let bttvTag = BTTVUtils.instance.generateEmoteTag(message)
		if(bttvTag) {
			if(emotes.length > 0) bttvTag += "/";
			emotes = bttvTag + emotes;
		}
		let ffzTag = FFZUtils.instance.generateEmoteTag(message)
		if(ffzTag) {
			if(emotes.length > 0) ffzTag += "/";
			emotes = ffzTag + emotes;
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
				if(c.length == 0) continue;
				const id = c.split(":")[0];
				const positions = c.split(":")[1].split(",");
				for (let j = 0; j < positions.length; j++) {
					const p = positions[j];
					const start = parseInt(p.split("-")[0]);
					const end = parseInt(p.split("-")[1]);
					emotesList.push({id, start, end});
				}
			}
		}
		//Sort emotes by start position
		emotesList.sort((a,b) => a.start - b.start);

		let cursor = 0;
		const result:TwitchTypes.ParseMessageChunk[] = [];
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
		let emotes:TwitchTypes.CheermoteSet[];
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
				const bitsCount = parseInt(m.replace(list.prefix, ""));
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
	public static async loadChannelInfo(uids:string[]):Promise<TwitchTypes.ChannelInfo[]> {
	
		let channels:TwitchTypes.ChannelInfo[] = [];
		//Split by 100 max to comply with API limitations
		while(uids.length > 0) {
			const param = "broadcaster_id";
			const params = param+"="+uids.splice(0,100).join("&"+param+"=");
			const url = Config.TWITCH_API_PATH+"channels?"+params;
			const access_token = (store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token;
			const result = await fetch(url, {
				headers:{
					"Client-ID": this.client_id,
					"Authorization": "Bearer "+access_token,
					"Content-Type": "application/json",
				}
			});
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
	public static async loadUserInfo(ids?:string[], logins?:string[]):Promise<TwitchTypes.UserInfo[]> {
		let items:string[] | undefined = ids? ids : logins;
		if(items == undefined) return [];
		items = items.filter(v => v != null && v != undefined);
		items = items.map(v => encodeURIComponent(v));
	
		let users:TwitchTypes.UserInfo[] = [];
		//Split by 100 max to comply with API limitations
		while(items.length > 0) {
			const param = ids ? "id" : "login";
			const params = param+"="+items.splice(0,100).join("&"+param+"=");
			const url = Config.TWITCH_API_PATH+"users?"+params;
			const access_token = (store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token;
			const result = await fetch(url, {
				headers:{
					"Client-ID": this.client_id,
					"Authorization": "Bearer "+access_token,
					"Content-Type": "application/json",
				}
			});
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
	public static async loadCurrentStreamInfo(ids?:string[], logins?:string[]):Promise<TwitchTypes.StreamInfo[]> {
		let items:string[] | undefined = ids? ids : logins;
		if(items == undefined) return [];
		items = items.filter(v => v != null && v != undefined);
		items = items.map(v => encodeURIComponent(v));
	
		let streams:TwitchTypes.StreamInfo[] = [];
		//Split by 100 max to comply with API limitations
		while(items.length > 0) {
			const param = ids ? "user_id" : "user_login";
			const params = param+"="+items.splice(0,100).join("&"+param+"=");
			const url = Config.TWITCH_API_PATH+"streams?first=1&"+params;
			const access_token = (store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token;
			const result = await fetch(url, {
				headers:{
					"Client-ID": this.client_id,
					"Authorization": "Bearer "+access_token,
					"Content-Type": "application/json",
				}
			});
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
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
			body: JSON.stringify({
				user_id:store.state.user.user_id,
				msg_id:messageId,
				action:accept? "ALLOW" : "DENY",
			})
		}
		const res = await fetch(Config.TWITCH_API_PATH+"moderation/automod/message", options);
		return res.status <= 400;
	}

	/**
	 * Get the cheermote list of a channel
	 */
	public static async loadCheermoteList(uid:string):Promise<TwitchTypes.CheermoteSet[]> {
		if(this.cheermoteCache[uid]) return this.cheermoteCache[uid];
		
		const options = {
			method:"GET",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
		}
		const res = await fetch(Config.TWITCH_API_PATH+"bits/cheermotes?broadcaster_id="+store.state.user.user_id, options);
		const json = await res.json();
		this.cheermoteCache[uid] = json.data;
		return json.data;
	}

	/**
	 * Create a poll
	 */
	public static async createPoll(question:string, answers:string[], duration:number, bitsPerVote:number = 0, pointsPerVote:number = 0):Promise<TwitchTypes.Poll[]> {
		const options = {
			method:"POST",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
			body: JSON.stringify({
				broadcaster_id:store.state.user.user_id,
				title:question,
				choices:answers.map(v => {return {title:v}}),
				duration,
				bits_voting_enabled:bitsPerVote > 0,
				bits_per_vote:bitsPerVote,
				channel_points_voting_enabled:pointsPerVote > 0,
				channel_points_per_vote:pointsPerVote,
			})
		}
		const res = await fetch(Config.TWITCH_API_PATH+"polls", options);
		const json = await res.json();
		if(res.status == 200) {
			setTimeout(()=> {
				this.getPolls();
			}, (duration+1) * 1000);
			store.dispatch("setPolls", json.data);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get a list of the latest polls
	 */
	public static async getPolls():Promise<TwitchTypes.Poll[]> {
		const options = {
			method:"GET",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
		}
		const res = await fetch(Config.TWITCH_API_PATH+"polls?broadcaster_id="+store.state.user.user_id, options);
		const json = await res.json();
		if(res.status == 200) {
			store.dispatch("setPolls", json.data);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Ends a poll
	 */
	public static async endPoll(pollId:string):Promise<TwitchTypes.Poll[]> {
		const options = {
			method:"PATCH",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
			body: JSON.stringify({
				id:pollId,
				status:"TERMINATED",
				broadcaster_id:store.state.user.user_id,
			})
		}
		const res = await fetch(Config.TWITCH_API_PATH+"polls", options);
		const json = await res.json();
		if(res.status == 200) {
			store.dispatch("setPolls", json.data);
			return json.data;
		}
		throw(json);
	}


	

	/**
	 * Create a prediction
	 */
	public static async createPrediction(question:string, answers:string[], duration:number):Promise<TwitchTypes.Prediction[]> {
		const options = {
			method:"POST",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
			body: JSON.stringify({
				broadcaster_id:store.state.user.user_id,
				title:question,
				outcomes:answers.map(v => {return {title:v}}),
				prediction_window:duration,
			})
		}
		const res = await fetch(Config.TWITCH_API_PATH+"predictions", options);
		const json = await res.json();
		if(res.status == 200) {
			setTimeout(()=> {
				this.getPredictions();
			}, (duration+1) * 1000);
			store.dispatch("setPredictions", json.data);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get a list of the latest predictions
	 */
	public static async getPredictions():Promise<TwitchTypes.Prediction[]> {
		const options = {
			method:"GET",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
		}
		const res = await fetch(Config.TWITCH_API_PATH+"predictions?broadcaster_id="+store.state.user.user_id, options);
		const json = await res.json();
		if(res.status == 200) {
			store.dispatch("setPredictions", json.data);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Ends a prediction
	 */
	public static async endPrediction(pollId:string, winId:string, cancel:boolean = false):Promise<TwitchTypes.Prediction[]> {
		const options = {
			method:"PATCH",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
			body: JSON.stringify({
				id:pollId,
				status:cancel? "CANCELED" : "RESOLVED",
				winning_outcome_id:winId,
				broadcaster_id:store.state.user.user_id,
			})
		}
		const res = await fetch(Config.TWITCH_API_PATH+"predictions", options);
		const json = await res.json();
		if(res.status == 200) {
			store.dispatch("setPredictions", json.data);
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get the latest hype train info
	 */
	public static async getHypeTrains():Promise<TwitchTypes.HypeTrain[]> {
		const options = {
			method:"GET",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
		}
		const res = await fetch(Config.TWITCH_API_PATH+"hypetrain/events?broadcaster_id="+store.state.user.user_id, options);
		const json = await res.json();
		if(res.status == 200) {
			return json.data;
		}
		throw(json);
	}

	/**
	 * Get the emotes list
	 */
	public static async getEmotes():Promise<TwitchTypes.Emote[]> {
		while(this.emoteCache.length == 0) {
			await Utils.promisedTimeout(100);
		}
		return this.emoteCache;
	}

	/**
	 * Get the emotes list
	 */
	public static async loadEmoteSets(sets:string[]):Promise<TwitchTypes.Emote[]> {
		if(this.emoteCache.length > 0) return this.emoteCache;
		const options = {
			method:"GET",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
		}
		let emotes:TwitchTypes.Emote[] = [];
		do {
			const params = sets.splice(0,25).join("&emote_set_id=");
			const res = await fetch(Config.TWITCH_API_PATH+"chat/emotes/set?emote_set_id="+params, options);
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
		store.dispatch("setEmotes", emotes);
		return emotes;
	}

	/**
	 * Get the rewards list
	 */
	public static async loadRewards(forceReload:boolean = false):Promise<TwitchTypes.Reward[]> {
		if(this.rewardsCache.length > 0 && !forceReload) return this.rewardsCache;
		const options = {
			method:"GET",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
		}
		let rewards:TwitchTypes.Reward[] = [];
		const res = await fetch(Config.TWITCH_API_PATH+"channel_points/custom_rewards?broadcaster_id="+store.state.user.user_id, options);
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
	public static async loadRedemptions():Promise<TwitchTypes.RewardRedemption[]> {
		const options = {
			method:"GET",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
		}
		let redemptions:TwitchTypes.RewardRedemption[] = [];
		const res = await fetch(Config.TWITCH_API_PATH+"channel_points/custom_rewards/redemptions?broadcaster_id="+store.state.user.user_id, options);
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
		const headers = {
			'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
			'Client-Id': this.client_id,
			"Content-Type": "application/json",
		}
		const res = await fetch(Config.TWITCH_API_PATH+"channel_points/custom_rewards?broadcaster_id="+store.state.user.user_id+"&id="+id, {
			method:"PATCH",
			headers,
			// body:JSON.stringify({is_enabled:!enabled}),
			body:JSON.stringify({is_paused:!enabled}),
		})
		return await res.json();
	}

	/**
	 * Executes a shoutout
	 * 
	 * @param username 
	 */
	public static async shoutout(username:string):Promise<void> {
		//Make a shoutout
		username = username.trim().replace(/^@/gi, "");
		const userInfos = await TwitchUtils.loadUserInfo(undefined, [username]);
		if(userInfos?.length > 0) {
			const channelInfo = await TwitchUtils.loadChannelInfo([userInfos[0].id]);
			let message = store.state.params.appearance.shoutoutLabel.value as string;
			let streamTitle = channelInfo[0].title;
			let category = channelInfo[0].game_name;
			if(!streamTitle) streamTitle = "no stream found"
			if(!category) category = "no stream found"
			message = message.replace(/\$USER/gi, userInfos[0].display_name);
			message = message.replace(/\$URL/gi, "twitch.tv/"+userInfos[0].login);
			message = message.replace(/\$STREAM/gi, streamTitle);
			message = message.replace(/\$CATEGORY/gi, category);
			await IRCClient.instance.sendMessage(message);
		}else{
			//Warn user doesn't exist
			store.state.alert = "User "+username+" doesn't exist.";
		}
	}

	/**
	 * Get the moderators list of a channel
	 */
	public static async getModerators():Promise<TwitchTypes.ModeratorUser[]> {
		const headers = {
			'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
			'Client-Id': this.client_id,
			"Content-Type": "application/json",
		}
		let list:TwitchTypes.ModeratorUser[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.TWITCH_API_PATH+"moderation/moderators?first=100&broadcaster_id="+store.state.user.user_id+pCursor, {
				method:"GET",
				headers,
			});
			const json:{data:TwitchTypes.ModeratorUser[], pagination?:{cursor?:string}} = await res.json();
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
	public static async getActiveFollowedStreams():Promise<TwitchTypes.StreamInfo[]> {
		const headers = {
			'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
			'Client-Id': this.client_id,
			"Content-Type": "application/json",
		}
		let list:TwitchTypes.StreamInfo[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.TWITCH_API_PATH+"streams/followed?first=100&user_id="+store.state.user.user_id+pCursor, {
				method:"GET",
				headers,
			});
			const json:{data:TwitchTypes.StreamInfo[], pagination?:{cursor?:string}} = await res.json();
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
	public static async getFollowState(uid:string, channelId?:string):Promise<TwitchTypes.Following> {
		if(!channelId) channelId = store.state.user.user_id;
		const headers = {
			'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
			'Client-Id': this.client_id,
			"Content-Type": "application/json",
		}
		const res = await fetch(Config.TWITCH_API_PATH+"users/follows?to_id="+channelId+"&from_id="+uid, {
			method:"GET",
			headers,
		});
		const json:{data:TwitchTypes.Following[], pagination?:{cursor?:string}} = await res.json();
		return json.data[0];
	}

	/**
	 * Gets a list of the current subscribers to the specified channel
	 */
	public static async getSubsList(channelId?:string):Promise<TwitchTypes.Subscriber[]> {
		if(!channelId) channelId = store.state.user.user_id;
		const headers = {
			'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
			'Client-Id': this.client_id,
			"Content-Type": "application/json",
		}
		let list:TwitchTypes.Subscriber[] = [];
		let cursor:string|null = null;
		do {
			const pCursor = cursor? "&after="+cursor : "";
			const res = await fetch(Config.TWITCH_API_PATH+"subscriptions?first=100&broadcaster_id="+store.state.user.user_id+pCursor, {
				method:"GET",
				headers,
			});
			const json:{data:TwitchTypes.Subscriber[], pagination?:{cursor?:string}} = await res.json();
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
	public static async startCommercial(duration:number):Promise<TwitchTypes.Commercial> {
		// if(duration != 30 && duration != 60 && duration != 90 && duration != 120 && duration != 150 && duration != 180) {
		// 	throw("Invalid commercial duration, must be 30, 60, 90, 120, 150 or 180");
		// }
		const options = {
			method:"POST",
			headers: {
				'Authorization': 'Bearer '+(store.state.oAuthToken as TwitchTypes.AuthTokenResult).access_token,
				'Client-Id': this.client_id,
				'Content-Type': "application/json",
			},
		}
		const res = await fetch(Config.TWITCH_API_PATH+"channels/commercial?broadcaster_id="+store.state.user.user_id+"&length="+duration, options);
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
	public static async getPronouns(uid: string, username: string): Promise<TwitchTypes.Pronoun | null> {
		const getPronounsAlejo = async (): Promise<TwitchTypes.Pronoun | null> => {
			const res = await fetch(`https://pronouns.alejo.io/api/users/${username}`);
			const data = await res.json();

			if (data.error) {
				throw data;
			} else if (data.length > 0) {
				return data[0];
			}

			return null;
		};

		const getPronounsPronouDb = async (): Promise<TwitchTypes.Pronoun | null> => {
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

		let pronoun = await getPronounsAlejo();
		if (pronoun == null) {
			pronoun = await getPronounsPronouDb();
		}

		return pronoun;
	}
}

export namespace TwitchTypes {
	export interface ModeratorUser {
		user_id: string;
		user_login: string;
		user_name: string;
	}
	
	export interface Token {
		client_id: string;
		login: string;
		scopes: string[];
		user_id: string;
		expires_in: number;
	}
	
	export interface Error {
		status: number;
		message: string;
	}

	export interface StreamInfo {
		id:            string;
		user_id:       string;
		user_login:    string;
		user_name:     string;
		game_id:       string;
		game_name:     string;
		type:          string;
		title:         string;
		viewer_count:  number;
		started_at:    string;
		language:      string;
		thumbnail_url: string;
		tag_ids:       string[];
		//Custom tag
		user_info:     UserInfo;
	}

	export interface ChannelInfo {
		broadcaster_id:        string;
		broadcaster_login:     string;
		broadcaster_name:      string;
		broadcaster_language:  string;
		game_id:               string;
		game_name:             string;
		title:                 string;
		delay:                 number;
	}

	export interface UserInfo {
		id:                string;
		login:             string;
		display_name:      string;
		type:              string;
		broadcaster_type:  string;
		description:       string;
		profile_image_url: string;
		offline_image_url: string;
		view_count:        number;
		created_at:        string;
	}

	export interface BadgesSet {
		versions: {[key:string]:Badge};
	}

	export interface Badge {
		id: string;
		click_action: string;
		click_url: string;
		description: string;
		image_url_1x: string;
		image_url_2x: string;
		image_url_4x: string;
	}

	export interface AuthTokenResult {
		access_token: string;
		expires_in: number;
		refresh_token: string;
		scope: string[];
		token_type: string;
		//Custom injected data
		expires_at: number;
	}

	export interface CheermoteSet {
		prefix: string;
		tiers: CheermoteTier[];
		type: string;
		order: number;
		last_updated: Date;
		is_charitable: boolean;
	}
	export interface CheermoteTier {
		min_bits: number;
		id: string;
		color: string;
		images: {
			dark: CheermoteImageSet;
			light: CheermoteImageSet;
		};
		can_cheer: boolean;
		show_in_bits_card: boolean;
	}

	export interface CheermoteImageSet {
		animated: CheermoteImage;
		static: CheermoteImage;
	}

	export interface CheermoteImage {
		"1": string;
		"2": string;
		"3": string;
		"4": string;
		"1.5": string;
	}

	export interface Poll {
		id: string;
		broadcaster_id: string;
		broadcaster_name: string;
		broadcaster_login: string;
		title: string;
		choices: PollChoice[];
		bits_voting_enabled: boolean;
		bits_per_vote: number;
		channel_points_voting_enabled: boolean;
		channel_points_per_vote: number;
		status: "ACTIVE" | "COMPLETED" | "TERMINATED" | "ARCHIVED" | "MODERATED" | "INVALID";
		duration: number;
		started_at: string;
		ended_at?: string;
	}

	export interface PollChoice {
		id: string;
		title: string;
		votes: number;
		channel_points_votes: number;
		bits_votes: number;
	}

	export interface HypeTrain {
		id: string;
		event_type: string;
		event_timestamp: Date;
		version: string;
		event_data: {
			broadcaster_id: string;
			cooldown_end_time: string;
			expires_at: string;
			goal: number;
			id: string;
			last_contribution: {
				total: number;
				type: string;
				user: string;
			};
			level: number;
			started_at: string;
			top_contributions: {
				total: number;
				type: string;
				user: string;
			};
			total: number;
		};
	}

	export interface Prediction {
		id: string;
		broadcaster_id: string;
		broadcaster_name: string;
		broadcaster_login: string;
		title: string;
		winning_outcome_id?: string;
		outcomes: PredictionOutcome[];
		prediction_window: number;
		status: "ACTIVE" | "RESOLVED" | "CANCELED" | "LOCKED";
		created_at: string;
		ended_at?: string;
		locked_at?: string;
	}

	export interface PredictionOutcome {
		id: string;
		title: string;
		users: number;
		channel_points: number;
		top_predictors?: PredictionPredictor[];
		color: string;
	}

	export interface PredictionPredictor {
		id:string;
		name:string;
		login:string;
		channel_points_used:number;
		channel_points_won:number;
	}

	export interface Emote {
		id: string;
		name: string;
		images: {
			url_1x: string;
			url_2x: string;
			url_4x: string;
		};
		emote_type: string;
		emote_set_id: string;
		owner_id: string;
		format: "static" | "animated";
		scale: "1.0" | "2.0" | "3.0";
		theme_mode: "light" | "dark";
	}

	export interface TrackedUser {
		user:ChatUserstate;
		messages:IRCEventDataList.Message[];
	}

	export interface ParseMessageChunk {
		type:"text"|"emote";
		emote?:string;
		label?:string;
		value:string;
	}

	export interface Reward {
		broadcaster_name: string;
		broadcaster_login: string;
		broadcaster_id: string;
		id: string;
		image?: {
			url_1x: string;
			url_2x: string;
			url_4x: string;
		};
		background_color: string;
		is_enabled: boolean;
		cost: number;
		title: string;
		prompt: string;
		is_user_input_required: boolean;
		max_per_stream_setting: {
			is_enabled: boolean;
			max_per_stream: number;
		};
		max_per_user_per_stream_setting: {
			is_enabled: boolean;
			max_per_user_per_stream: number;
		};
		global_cooldown_setting: {
			is_enabled: boolean;
			global_cooldown_seconds: number;
		};
		is_paused: boolean;
		is_in_stock: boolean;
		default_image: {
			url_1x: string;
			url_2x: string;
			url_4x: string;
		};
		should_redemptions_skip_request_queue: boolean;
		redemptions_redeemed_current_stream?: number;
		cooldown_expires_at?: string;
	}

	export interface RewardRedemption {
		broadcaster_name: string;
		broadcaster_login: string;
		broadcaster_id: string;
		id: string;
		user_login: string;
		user_id: string;
		user_name: string;
		user_input: string;
		status: string;
		redeemed_at: string;
		reward: {
			id: string;
			title: string;
			prompt: string;
			cost: number;
		};
	}
	
	export interface Following {
		from_id: string;
		from_login: string;
		from_name: string;
		to_id: string;
		to_name: string;
		followed_at: string;
	}
	
	export interface Commercial {
		length: number;
		message: string;
		retry_after: number;
	}

    export interface Subscriber {
        broadcaster_id: string;
        broadcaster_login: string;
        broadcaster_name: string;
        gifter_id: string;
        gifter_login: string;
        gifter_name: string;
        is_gift: boolean;
        tier: string;
        plan_name: string;
        user_id: string;
        user_name: string;
        user_login: string;
    }

	export interface Pronoun {
		id:string;
		login:string;
		pronoun_id:string
	}
}