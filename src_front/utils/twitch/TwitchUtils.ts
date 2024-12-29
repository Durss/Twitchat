import StoreProxy from "@/store/StoreProxy";
import { TwitchatDataTypes } from "@/types/TwitchatDataTypes";
import type { TwitchDataTypes } from "../../types/twitch/TwitchDataTypes";
import Config from "../Config";
import Logger from "../Logger";
import Utils from "../Utils";
import BTTVUtils from "../emotes/BTTVUtils";
import FFZUtils from "../emotes/FFZUtils";
import SevenTVUtils from "../emotes/SevenTVUtils";
import { TwitchScopes, type TwitchScopesString } from "./TwitchScopes";
import * as Sentry from "@sentry/vue";
import Database from "@/store/Database";
import type { TwitchEventSubDataTypes } from "@/types/twitch/TwitchEventSubDataTypes";

/**
* Created : 19/01/2021
*/
export default class TwitchUtils {

	public static cheermoteCache: { [key: string]: TwitchDataTypes.CheermoteSet[] } = {};
	public static emotesCache: TwitchatDataTypes.Emote[] = [];
	private static badgesCache: { [key: string]: { [key: string]: { [key: string]: TwitchatDataTypes.TwitchatUserBadge } } } = {};
	private static rewardsCache: TwitchDataTypes.Reward[] = [];
	private static rewardsManageableCache: TwitchDataTypes.Reward[] = [];
	private static fakeUsersCache: TwitchatDataTypes.TwitchatUser[] = [];
	private static emotesCacheHashmap: { [key: string]: TwitchatDataTypes.Emote } = {};
	private static adblockAlertSent: boolean = false;
	private static callHistory: { date: number, path: string, params: URLSearchParams }[] = [];
	private static uid:string = "";
	private static scopes:string[] = [];
	private static accessToken:string = "";
	private static loadedChannelEmotes:{[uid:string]:boolean} = {};
	private static requestScopesCallback:(scopes:TwitchScopesString[])=>void;
	private static refreshTokenCallback:()=>Promise<false | TwitchDataTypes.AuthTokenResult>;

	public static get headers(): { [key: string]: string } {
		return {
			'Authorization': 'Bearer ' + this.accessToken,
			'Client-Id': Config.instance.TWITCH_CLIENT_ID,
			// 'Authorization': 'Bearer 358611f2ef5434a',//Fake IDs for twitch-cli
			// 'Client-Id': "ad6f8026c33565d701fa315320effc",//Fake IDs for twitch-cli
			'Content-Type': "application/json",
		};
	}

	/**
	 * Gets if emotes are loaded
	 */
	public static get emotesLoaded():boolean {
		return this.emotesCache.length > 0;
	}

	/**
	 * Updates authentication info
	 */
	public static updateAuthInfo(
		accessToken:string,
		scopes:string[],
		requestScopesCallback:(scopes:TwitchScopesString[])=>void,
		refreshTokenCallback:()=>Promise<false | TwitchDataTypes.AuthTokenResult>,
		uid?:string):void {
			if(uid) this.uid = uid;
			this.scopes = scopes;
			this.accessToken = accessToken;
			this.refreshTokenCallback = refreshTokenCallback;
			this.requestScopesCallback = requestScopesCallback;
	}

	/**
	 * Gets the badges of a channel
	 * @returns
	 */
	public static async loadUserBadges(uid: string): Promise<{ [key: string]: { [key: string]: TwitchatDataTypes.TwitchatUserBadge } }> {
		if (this.badgesCache[uid]) return this.badgesCache[uid];

		const options = {
			method: "GET",
			// headers: {},
			headers: this.headers,
		};
		const url = new URL(Config.instance.TWITCH_API_PATH + "chat/badges");
		url.searchParams.set("broadcaster_id", uid)
		const result = await this.callApi(url, options);
		if (result.status == 200) {
			const json = await result.json();
			const list: TwitchDataTypes.BadgesSet[] = json.data as TwitchDataTypes.BadgesSet[];
			const hashmap: { [key: string]: { [key: string]: TwitchatDataTypes.TwitchatUserBadge } } = {};
			for (let i = 0; i < list.length; i++) {
				const s = list[i];
				if (!hashmap[s.set_id]) hashmap[s.set_id] = {};
				for (let j = 0; j < s.versions.length; j++) {
					const v = s.versions[j];
					const title = this.getBadgeTitle(s.set_id, v.id);
					hashmap[s.set_id][v.id] = {
						icon: {
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
		} else {
			throw ({ error: result });
		}
	}

	/**
	 * Gets the badges of a channel
	 * @returns
	 */
	public static async loadGlobalBadges(): Promise<{ [key: string]: { [key: string]: TwitchatDataTypes.TwitchatUserBadge } }> {
		if (this.badgesCache["global"]) return this.badgesCache["global"];

		const options = {
			method: "GET",
			// headers: {},
			headers: this.headers,
		};
		const url = new URL(Config.instance.TWITCH_API_PATH + "chat/badges/global");
		const result = await this.callApi(url, options);
		if (result.status == 200) {
			const json = await result.json();
			const list: TwitchDataTypes.BadgesSet[] = json.data as TwitchDataTypes.BadgesSet[];
			const hashmap: { [key: string]: { [key: string]: TwitchatDataTypes.TwitchatUserBadge } } = {};
			for (let i = 0; i < list.length; i++) {
				const s = list[i];
				if (!hashmap[s.set_id]) hashmap[s.set_id] = {};
				for (let j = 0; j < s.versions.length; j++) {
					const v = s.versions[j];
					const title = this.getBadgeTitle(s.set_id, v.id);
					hashmap[s.set_id][v.id] = {
						icon: {
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
		} else {
			throw ({ error: result });
		}
	}

	public static getOAuthURL(csrfToken: string, scopes: string[], routePrefix:string = ""): string {
		const url = new URL("https://id.twitch.tv/oauth2/authorize");
		url.searchParams.set("client_id", Config.instance.TWITCH_CLIENT_ID);
		url.searchParams.set("redirect_uri", document.location.origin + routePrefix + "/oauth");
		url.searchParams.set("response_type", "code");
		url.searchParams.set("scope", scopes.join(" "));
		url.searchParams.set("state", csrfToken);
		url.searchParams.set("force_verify", "true");
		return url.toString();
	}

	/**
	 * Validates current token
	 */
	public static async validateToken(accessToken: string): Promise<TwitchDataTypes.Token | TwitchDataTypes.Error> {
		const headers = {
			"Authorization": "Bearer " + accessToken
		};
		const options = {
			method: "GET",
			headers: headers,
		};
		const result = await fetch("https://id.twitch.tv/oauth2/validate", options)
		return await result.json();
	}

	/**
	 * Gets user infos by their ID.
	 *
	 * @param logins
	 * @returns
	 */
	public static async getChannelInfo(uids: string[]): Promise<TwitchDataTypes.ChannelInfo[]> {
		let channels: TwitchDataTypes.ChannelInfo[] = [];
		let fails: string[] = [];
		//Split by 100 max to comply with API limitations
		while (uids.length > 0) {
			const url = new URL(Config.instance.TWITCH_API_PATH + "channels");
			uids.splice(0, 100).forEach(uid => {
				url.searchParams.append("broadcaster_id", uid);
			});
			try {
				const result = await this.callApi(url, { headers: this.headers });
				const json = await result.json();
				if (!json.error) {
					channels = channels.concat(json.data);
				} else {
					fails = fails.concat(uids);
				}
			} catch (error) {
				fails = fails.concat(uids);
			}
		}
		if (fails.length > 0) {
			StoreProxy.common.alert(StoreProxy.i18n.t("error.load_user_info", { ERROR: fails }));
		}
		return channels;
	}

	/**
	 * Gets user infos by their ID.
	 *
	 * @param logins
	 * @returns
	 */
	public static async getUserInfo(ids?: string[], logins?: string[], signal?:AbortSignal): Promise<TwitchDataTypes.UserInfo[]> {
		let items: string[] | undefined = ids ? ids : logins;
		if (items == undefined) return [];
		items = items.filter(v => v != null && v != undefined);
		items = items.map(v => encodeURIComponent(v));

		let users: TwitchDataTypes.UserInfo[] = [];
		//Split by 100 max to comply with API limitations
		while (items.length > 0) {
			const param = ids ? "id" : "login";
			const url = new URL(Config.instance.TWITCH_API_PATH + "users");
			let userCount = 0;
			items.splice(0, 100).forEach(v => {
				//If ID contains something else than numbers, ignore it to avoid crashing the whole query
				if (param == "id" && !/^[0-9]+$/.test(v)) return;
				url.searchParams.append(param, v);
				userCount ++;
			});
			if(userCount === 0) continue;
			const result = await this.callApi(url, { headers: this.headers, signal });
			if (result.status === 200) {
				const json = await result.json();
				users = users.concat(json.data);
			} else if (result.status == 429) {
				//Rate limit reached, try again after it's reset to fulle
				await this.onRateLimit(result.headers, url.pathname, 1);
				return await this.getUserInfo(ids, logins, signal)
			} else if (result.status == 500 || result.status == 499) break;
		}
		return users;
	}

	/**
	 * Search for users
	 *
	 * @param logins
	 * @returns
	 */
	public static async searchUser(search:string, maxLength:number = 15, signal:AbortSignal): Promise<{users:TwitchDataTypes.UserInfo[], liveStates:{[uid:string]:boolean}}> {
		search = Utils.slugify(search).replace(/-/g, "_").trim().toLowerCase();
		let users: TwitchDataTypes.UserInfo[] = [];
		let liveStates:{[uid:string]:boolean} = {};
		// const [bestResult] = await this.getChannelInfo([bestResult[0].id]);
		if(signal.aborted) return {users, liveStates};

		const url = new URL(Config.instance.TWITCH_API_PATH + "search/channels");
		url.searchParams.append("query", search);
		url.searchParams.append("first", "100");
		//Twitch search endpoint is terribly bad.
		const result = await this.callApi(url, { headers: this.headers, signal });
		if (result.status === 200) {
			const json = await result.json();
			const list = json.data as TwitchDataTypes.LiveChannelSearchResult[];

			list.forEach(v=> liveStates[v.id] = v.is_live);

			list.sort((a, b) => {
				if (a.broadcaster_login.toLowerCase() == search) return -1;
				if (b.broadcaster_login.toLowerCase() == search) return 1;
				return a.broadcaster_login.localeCompare(b.broadcaster_login, 'en', { sensitivity: 'base' });
			});

			const users = (await this.getUserInfo(list.slice(0, maxLength).map(v=>v.id), undefined, signal) || []).sort((a, b) => {
				if (a.login.toLowerCase().toLowerCase() == search) return -1;
				if (b.login.toLowerCase().toLowerCase() == search) return 1;
				return a.login.localeCompare(b.login, 'en', { sensitivity: 'base' });
			});
			const bestIndex = users.findIndex(v=>v.login.toLowerCase() === search);
			if(bestIndex > -1) {
				//Bring best match to top
				users.unshift( ...users.splice(bestIndex, 1) );
			}else {
				//The exact match may not be returned because it sorts results in the
				//most terrible way.
				//If exact match isn't on the result, try to search it specifically
				const [bestResult] = await this.getUserInfo(undefined, [search]);
				if(bestResult) {
					users.unshift( bestResult );
				}
			}
			return {users:users.slice(0, maxLength), liveStates};
		} else if (result.status == 429) {
			//Rate limit reached, try again after it's reset to fulle
			await this.onRateLimit(result.headers, url.pathname, 1);
			return await this.searchUser(search, maxLength, signal)
		}
		return {users, liveStates};
	}

	/**
	 * Gets latest stream's info.
	 *
	 * @param logins
	 * @returns
	 */
	public static async getCurrentStreamInfo(ids?: string[], logins?: string[]): Promise<TwitchDataTypes.StreamInfo[]> {
		let items: string[] | undefined = ids ? ids : logins;
		if (items == undefined) return [];
		items = items.filter(v => v != null && v != undefined);
		items = items.map(v => encodeURIComponent(v));

		let streams: TwitchDataTypes.StreamInfo[] = [];
		//Split by 100 max to comply with API limitations
		while (items.length > 0) {
			const url = new URL(Config.instance.TWITCH_API_PATH + "streams");
			const param = ids ? "user_id" : "user_login";
			items.splice(0, 100).forEach(v => {
				//If ID contains something else than numbers, ignore it to avoid crashing the whole query
				if (param == "user_id" && !/^[0-9]+$/.test(v)) return;
				url.searchParams.append(param, v);
			});

			const result = await this.callApi(url, { headers: this.headers });
			const json = await result.json();
			streams = streams.concat(json.data);
		}
		return streams;
	}

	/**
	 * Allow or reject an automoded message
	 */
	public static async automodAction(accept: boolean, messageId: string): Promise<boolean> {
		const options = {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				user_id: this.uid,
				msg_id: messageId,
				action: accept ? "ALLOW" : "DENY",
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/automod/message");
		const res = await this.callApi(url, options);
		return res.status <= 400;
	}

	/**
	 * Checks if given message would be flagged by automod or not
	 */
	public static async checkAutomodFlag(message: string): Promise<boolean> {
		const options = {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				data:[
					{
						msg_id: Utils.getUUID(),
						msg_text: message,
					}
				]
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/enforcements/status");
		const res = await this.callApi(url, options);
		const json = await res.json();
		return res.status == 200 && json.data[0].is_permitted === true;
	}

	/**
	 * Get the cheermote list of a channel
	 */
	public static async loadCheermoteList(channelId: string): Promise<TwitchDataTypes.CheermoteSet[]> {
		if (this.cheermoteCache[channelId]) return this.cheermoteCache[channelId];

		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "bits/cheermotes");
		url.searchParams.set("broadcaster_id", channelId);
		const res = await this.callApi(url, options);
		const json = await res.json();
		const list: TwitchDataTypes.CheermoteSet[] = json.data || [];
		//Sort them longer first.
		//This makes sure that when parsing them, smaller prefixes
		//don't cut longer ones.
		//Ex: parsing "Cheer100" before "HolidayCheer100" would leave
		//us with "Holiday *cheermote*"
		list.sort((a, b) => {
			if (a.prefix.length > b.prefix.length) return -1;
			if (a.prefix.length < b.prefix.length) return 1;
			return 0;
		})
		this.cheermoteCache[channelId] = list;
		return json.data;
	}

	/**
	 * Create a poll
	 */
	public static async createPoll(channelId: string, question: string, answers: string[], duration: number, pointsPerVote = 0): Promise<TwitchDataTypes.Poll[]> {
		if (!this.hasScopes([TwitchScopes.MANAGE_POLLS])) return [];

		const options = {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				broadcaster_id: channelId,
				title: question,
				choices: answers.filter(v=> v.trim().length > 0).map(v => { return { title: v } }),
				duration,
				channel_points_voting_enabled: pointsPerVote > 0,
				channel_points_per_vote: pointsPerVote,
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "polls");
		const res = await this.callApi(url, options);
		const json = await res.json();
		if (res.status == 200) {
			window.setTimeout(() => {
				//Schedule reload of the polls after poll ends
				this.getPolls();
			}, (duration + 1) * 1000);
			return json.data;
		}
		throw (json);
	}

	/**
	 * Get a list of the latest polls and store any active one to the store
	 */
	public static async getPolls(): Promise<TwitchDataTypes.Poll[]> {
		if (!this.hasScopes([TwitchScopes.MANAGE_POLLS])) return [];

		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "polls");
		url.searchParams.set("broadcaster_id", this.uid);
		const res = await this.callApi(url, options);
		const json: { data: TwitchDataTypes.Poll[] } = await res.json();
		if (res.status == 200) {
			if (json.data.length > 0 && json.data[0].status == "ACTIVE") {
				const src = json.data[0];
				const choices: TwitchatDataTypes.MessagePollDataChoice[] = [];
				src.choices.forEach(v => {
					choices.push({
						id: v.id,
						label: v.title,
						votes: v.votes,
					})
				});
				const poll: TwitchatDataTypes.MessagePollData = {
					id: src.id,
					channel_id: src.broadcaster_id,
					date: Date.now(),
					type: TwitchatDataTypes.TwitchatMessageType.POLL,
					platform: "twitch",
					duration_s: src.duration,
					started_at: new Date(src.started_at).getTime(),
					title: src.title,
					choices,
				}
				StoreProxy.poll.setCurrentPoll(poll);
			}
			return json.data;
		}
		throw (json);
	}

	/**
	 * Ends a poll
	 */
	public static async endPoll(pollId: string, channelId: string): Promise<TwitchDataTypes.Poll[]> {
		const options = {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({
				id: pollId,
				status: "TERMINATED",
				broadcaster_id: channelId,
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "polls");
		const res = await this.callApi(url, options);
		const json = await res.json();
		if (res.status == 200) {
			// StoreProxy.poll.setCurrentPoll(json.data);
			return json.data;
		}
		throw (json);
	}




	/**
	 * Create a prediction
	 */
	public static async createPrediction(channelId: string, question: string, answers: string[], duration: number): Promise<TwitchDataTypes.Prediction[]> {
		if (!this.hasScopes([TwitchScopes.MANAGE_PREDICTIONS])) return [];

		const options = {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({
				broadcaster_id: channelId,
				title: question,
				outcomes: answers.filter(v=> v.trim().length > 0).map(v => { return { title: v } }),
				prediction_window: duration,
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "predictions");
		const res = await this.callApi(url, options);
		const json = await res.json();
		if (res.status == 200) {
			window.setTimeout(() => {
				this.getPredictions();
			}, (duration + 1) * 1000);
			return json.data;
		}
		throw (json);
	}

	/**
	 * Get a list of the latest predictions
	 */
	public static async getPredictions(): Promise<TwitchDataTypes.Prediction[]> {
		if (!this.hasScopes([TwitchScopes.MANAGE_PREDICTIONS])) return [];

		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "predictions");
		url.searchParams.set("broadcaster_id", this.uid);
		const res = await this.callApi(url, options);
		const json = await res.json();
		if (res.status == 200) {
			let totalPoints = 0;
			let totalUsers = 0;
			if (json.data.length > 0) {
				const src = json.data[0] as TwitchDataTypes.Prediction;
				if (src.status == "ACTIVE" || src.status == "LOCKED") {
					const outcomes: TwitchatDataTypes.MessagePredictionDataOutcome[] = [];
					src.outcomes.forEach(v => {
						totalPoints += v.channel_points;
						totalUsers += v.users;
						outcomes.push({
							id: v.id,
							label: v.title,
							votes: v.channel_points,
							voters: v.users,
						})
					});
					const prediction: TwitchatDataTypes.MessagePredictionData = {
						id: src.id,
						channel_id: src.broadcaster_id,
						date: Date.now(),
						type: TwitchatDataTypes.TwitchatMessageType.PREDICTION,
						platform: "twitch",
						duration_s: src.prediction_window,
						started_at: new Date(src.created_at).getTime(),
						title: src.title,
						outcomes,
						pendingAnswer: src.status == "LOCKED",
						totalPoints,
						totalUsers,
					};
					StoreProxy.prediction.setPrediction(prediction);
				} else {
					StoreProxy.prediction.setPrediction(null);
				}
			}
			return json.data;
		}
		throw (json);
	}

	/**
	 * Ends a prediction
	 */
	public static async endPrediction(channelId: string, predictionId: string, winId: string, cancel = false): Promise<TwitchDataTypes.Prediction[]> {
		const options = {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({
				broadcaster_id: channelId,
				id: predictionId,
				status: cancel ? "CANCELED" : "RESOLVED",
				winning_outcome_id: winId,
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "predictions");
		const res = await this.callApi(url, options);
		const json = await res.json();
		if (res.status == 200) {
			//Wait 5s so pubsub has time to make a feedback.
			//Without that we would get these events:
			// prediction ended
			// resolve pending
			// resolved
			// prediction ended
			window.setTimeout(() => {
				this.getPredictions();
			}, 5000);
			return json.data;
		}
		throw (json);
	}

	/**
	 * Get the latest hype train info
	 * not used as it contains no much info and is super restrictive..
	 */
	public static async getHypeTrains(channelId: string): Promise<TwitchDataTypes.HypeTrain[]> {
		if (!this.hasScopes([TwitchScopes.READ_HYPE_TRAIN])) return [];

		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "hypetrain/events");
		url.searchParams.set("broadcaster_id", channelId);
		const res = await this.callApi(url, options);
		const json = await res.json();
		if (res.status == 200) {
			return json.data;
		}
		throw (json);
	}

	/**
	 * Get the emotes list
	 */
	public static async getEmotes(): Promise<TwitchatDataTypes.Emote[]> {
		while (this.emotesCache.length == 0) {
			await Utils.promisedTimeout(100);
		}
		return this.emotesCache;
	}

	/**
	 * Loads specified emotes sets
	 */
	public static async loadEmoteSets(channelId: string, staticEmotes?: TwitchDataTypes.Emote[]): Promise<void> {
		if(this.loadedChannelEmotes[channelId] === true) return;

		let emotesTwitch: TwitchDataTypes.Emote[] = [];
		if (!staticEmotes) {
			//Twitch global emotes
			const url = new URL(Config.instance.TWITCH_API_PATH + "chat/emotes/set");
			url.searchParams.append("emote_set_id", "0");
			const res = await this.callApi(url, { method: "GET", headers: this.headers });
			const json = await res.json();
			if (res.status == 200) {
				emotesTwitch = emotesTwitch.concat(json.data);
			} else {
				throw (json);
			}

			if (this.hasScopes([TwitchScopes.READ_EMOTES])) {
				let userEmotes = await this.getUserEmotes(channelId);
				if (userEmotes) {
					emotesTwitch = emotesTwitch.concat(userEmotes);
				}
			}

			//Dedupe emotes. Current API has a bug that returns broadcaster's emotes twice
			let emotesParsed: { [key: string]: boolean } = {};
			for (let i = 0; i < emotesTwitch.length; i++) {
				const emote = emotesTwitch[i];
				if (emotesParsed[emote.id] === true) {
					emotesTwitch.splice(i, 1);
					i--;
				}
				emotesParsed[emote.id] = true;
			}
		} else {
			emotesTwitch.push(...staticEmotes);
		}

		const uid2User: { [key: string]: TwitchatDataTypes.TwitchatUser } = {};//Avoid spamming user store

		//Convert to twitchat's format
		emotesTwitch
		.filter(emote => emote.owner_id != "twitch")//remove lots of useless emotes like ":p", ":o", ":-)", etc..
		.filter(emote => this.emotesCacheHashmap[emote.name] === undefined)//remove already registered emotes
		.map((e: TwitchDataTypes.Emote): TwitchatDataTypes.Emote => {
			//Extract latest format available.
			//Should be aither "static" or "animated" but doing it this way will load
			//any potential new kind of emote in the future.
			const flag = (((e.format as unknown) as string[]).splice(-1)[0] ?? "static");
			let owner!: TwitchatDataTypes.TwitchatUser;
			if (e.owner_id == "0") {
				//Create a fake user for the "global" emotes.
				//They are linked to the twitch user "0" which does
				//not exists.
				owner = {
					id: "0",
					platform: "twitch",
					displayName: "Global",
					displayNameOriginal: "Global",
					login: "Global",
					is_affiliate: false,
					is_partner: false,
					is_tracked: false,
					is_blocked: false,
					pronouns: false,
					is_bot: true,
					pronounsLabel: "",
					pronounsTooltip: "",
					channelInfo: {},
				}
			} else {
				owner = uid2User[e.owner_id] ?? StoreProxy.users.getUserFrom("twitch", channelId, e.owner_id)
				uid2User[e.owner_id] = owner;
			}
			return {
				id: e.id,
				code: e.name,
				is_public: e.emote_type === "globals",
				images: {
					// this : replace("static", flag)
					//replaces the static flag by "animated" if available
					url_1x: e.images.url_1x.replace("/static/", "/" + flag + "/"),
					url_2x: e.images.url_2x.replace("/static/", "/" + flag + "/"),
					url_4x: e.images.url_4x.replace("/static/", "/" + flag + "/"),
				},
				owner,
				platform: "twitch",
				ownerOnly: channelId != this.uid,
			}
		}).forEach(emote=>{
			this.emotesCacheHashmap[emote.code] = emote;
			this.emotesCache.push(emote);
		});

		//Sort them by name length DESC to make manual emote parsing easier.
		//When sending a message on IRC, we don't get a clean callback
		//message with parsed emotes (nor id, timestamp and other stuff)
		//This means that every message sent from this interface must be
		//parsed manually. Love it..
		this.emotesCache.sort((a, b) => b.code.length - a.code.length);

		this.loadedChannelEmotes[channelId] = true;
		//Invalidate cache
		StoreProxy.chat.setEmoteSelectorCache([]);
	}

	/**
	 * Get the rewards list
	 */
	public static async getRewards(forceReload = false, onlyManageable: boolean = false): Promise<TwitchDataTypes.Reward[]> {
		if (!this.hasScopes([TwitchScopes.LIST_REWARDS])) return [];

		if (!onlyManageable && this.rewardsCache.length > 0 && !forceReload) return this.rewardsCache.concat();
		if (onlyManageable && this.rewardsManageableCache.length > 0 && !forceReload) return this.rewardsManageableCache.concat();
		const options = {
			method: "GET",
			headers: this.headers,
		}
		let rewards: TwitchDataTypes.Reward[] = [];
		const url = new URL(Config.instance.TWITCH_API_PATH + "channel_points/custom_rewards");
		url.searchParams.append("broadcaster_id", this.uid);
		if (onlyManageable) url.searchParams.append("only_manageable_rewards", "true");
		const res = await this.callApi(url, options);
		const json = await res.json();
		if (res.status == 200) {
			rewards = json.data;
		} else {
			return [];
		}
		if (!onlyManageable) {
			this.rewardsCache = rewards;
		} else {
			this.rewardsManageableCache = rewards;
		}
		return rewards.concat();
	}

	/**
	 * Create a channel points reward
	 */
	public static async createReward(reward: TwitchDataTypes.RewardEdition): Promise<boolean | string> {
		if (!this.hasScopes([TwitchScopes.MANAGE_REWARDS])) return false;

		const url = new URL(Config.instance.TWITCH_API_PATH + "channel_points/custom_rewards");
		url.searchParams.append("broadcaster_id", this.uid);

		if (reward.cost != undefined && reward.cost) {
			if (reward.cost < 0) reward.cost = 0;
			if (reward.cost > 1000000000) reward.cost = 1000000000;
		}

		const res = await this.callApi(url, {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(reward),
		});
		if (res.status == 200) {
			return true;
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.createReward(reward);
		} else if (res.status === 400) {
			//TODO handle error cases
			let message = "";
			try {
				const json = await res.json();
				const code = "error.rewards." + json.message;
				if (StoreProxy.i18n.te(code)) {
					message = StoreProxy.i18n.t(code);
				}
			} catch (error) { }
			return message || false;
		}
		return false;
	}

	/**
	 * Delete a channel points reward
	 */
	public static async deleteReward(rewardId: string): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.MANAGE_REWARDS])) return false;

		const url = new URL(Config.instance.TWITCH_API_PATH + "channel_points/custom_rewards");
		url.searchParams.append("broadcaster_id", this.uid);
		url.searchParams.append("id", rewardId);

		const res = await this.callApi(url, {
			method: "DELETE",
			headers: this.headers,
		});
		if (res.status == 200) {
			// const json = await res.json();
			const rewardIndex = this.rewardsCache.findIndex(v => v.id == rewardId);
			const manageableIndex = this.rewardsManageableCache.findIndex(v => v.id == rewardId);
			if (rewardIndex > -1) this.rewardsCache.splice(rewardIndex, 1);
			if (manageableIndex > -1) this.rewardsManageableCache.splice(manageableIndex, 1);
			return true;
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.deleteReward(rewardId);
		}
		return false;
	}

	/**
	 * Get the reward redemptions list
	 */
	public static async loadRedemptions(): Promise<TwitchDataTypes.RewardRedemption[]> {
		if (!this.hasScopes([TwitchScopes.LIST_REWARDS])) return [];

		const options = {
			method: "GET",
			headers: this.headers,
		}
		let redemptions: TwitchDataTypes.RewardRedemption[] = [];

		const url = new URL(Config.instance.TWITCH_API_PATH + "channel_points/custom_rewards/redemptions");
		url.searchParams.append("broadcaster_id", this.uid);

		const res = await this.callApi(url, options);
		if (res.status == 200) {
			const json = await res.json();
			redemptions = json.data;
		} else {
			return [];
		}
		return redemptions;
	}

	/**
	 * Refund a redemption
	 */
	public static async refundRedemptions(redemptionIds: string[], rewardId: string): Promise<boolean|string> {
		if (!this.hasScopes([TwitchScopes.LIST_REWARDS])) return false;

		const options = {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify({ status: "CANCELED" }),
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "channel_points/custom_rewards/redemptions");
		url.searchParams.append("broadcaster_id", this.uid);
		url.searchParams.append("reward_id", rewardId);
		redemptionIds.forEach(v => {
			url.searchParams.append("id", v);
		});

		const res = await this.callApi(url, options);
		if (res.status == 200) {
			return true;
		}
		const json = await res.json();
		return json.message || false;
	}

	/**
	 * Updates a reward
	 *
	 * @returns
	 */
	public static async updateReward(rewardId: string, data: TwitchDataTypes.RewardEdition): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.LIST_REWARDS])) return false;

		const url = new URL(Config.instance.TWITCH_API_PATH + "channel_points/custom_rewards");
		url.searchParams.append("broadcaster_id", this.uid);
		url.searchParams.append("id", rewardId);
		if (data.cost != undefined && data.cost) {
			if (data.cost < 0) data.cost = 0;
			if (data.cost > 1000000000) data.cost = 1000000000;
		}

		const res = await this.callApi(url, {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(data),
		});
		if (res.status == 200) {
			const json = await res.json();
			//Update cached items
			const rewardIndex = this.rewardsCache.findIndex(v => v.id == rewardId);
			const manageableIndex = this.rewardsManageableCache.findIndex(v => v.id == rewardId);
			if (rewardIndex > -1) this.rewardsCache[rewardIndex] = json.data[0];
			if (manageableIndex > -1) this.rewardsManageableCache[manageableIndex] = json.data[0];
		}
		return res.status == 200;
	}

	/**
	 * Get the moderators list of a channel
	 * Limited to our own channel
	 */
	public static async getModerators(): Promise<TwitchDataTypes.ModeratorUser[]> {
		if (!this.hasScopes([TwitchScopes.READ_MODERATORS])) return [];

		let list: TwitchDataTypes.ModeratorUser[] = [];
		let cursor: string | null = null;
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/moderators");
		url.searchParams.append("broadcaster_id", this.uid);
		url.searchParams.append("first", "100");

		do {
			if (cursor) url.searchParams.set("after", cursor);
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.ModeratorUser[], pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else if (res.status == 500) break;
		} while (cursor != null)
		return list;
	}

	/**
	 * Get the VIPs list of a channel
	 * Limited to our own channel
	 */
	public static async getVIPs(): Promise<TwitchDataTypes.VIPUser[]> {
		if (!this.hasScopes([TwitchScopes.EDIT_VIPS])) return [];

		let list: TwitchDataTypes.VIPUser[] = [];
		let cursor: string | null = null;
		const url = new URL(Config.instance.TWITCH_API_PATH + "channels/vips");
		url.searchParams.append("broadcaster_id", this.uid);
		url.searchParams.append("first", "100");

		do {
			if (cursor) url.searchParams.set("after", cursor);
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.VIPUser[], pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else if (res.status == 500) break;
		} while (cursor != null)
		return list;
	}

	/**
	 * Get a list of channels the user is a moderator on.
	 */
	public static async getModeratedChannels(): Promise<TwitchDataTypes.ModeratedUser[]> {
		if (!this.hasScopes([TwitchScopes.LIST_MODERATED_CHANS])) return [];

		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/channels");
		url.searchParams.append("user_id", this.uid);
		url.searchParams.append("first", "100");

		let list: TwitchDataTypes.ModeratedUser[] = [];
		let cursor: string | null = null;
		do {
			if (cursor) url.searchParams.set("after", cursor);
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.ModeratedUser[], pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else if (res.status == 500) break;
		} while (cursor != null);
		return list;
	}

	/**
	 * Get the banned states of specified users
	 */
	public static async getBannedUsers(channelId: string, uids: string[]): Promise<TwitchDataTypes.BannedUser[]> {
		if (!this.hasScopes([TwitchScopes.EDIT_BANNED])) return [];
		//Can't get banned state for another channel even if we're a mod of that channel
		if (channelId != this.uid) return [];

		let channels: TwitchDataTypes.BannedUser[] = [];
		let fails: string[] = [];
		//Split by 100 max to comply with API limitations
		while (uids.length > 0) {
			const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/banned");
			url.searchParams.append("broadcaster_id", channelId);
			uids.splice(0, 100).forEach(v => {
				url.searchParams.append("user_id", v);
			})
			const result = await this.callApi(url, { headers: this.headers });
			if (result.status != 200) {
				fails = fails.concat(uids);
				continue;
			}
			const json = await result.json();
			if (!json.error) {
				channels = channels.concat(json.data);
			} else {
				fails = fails.concat(uids);
			}
		}
		if (fails.length > 0) {
			StoreProxy.common.alert(StoreProxy.i18n.t("error.load_user_ban", { ERROR: fails }));
		}
		return channels;
	}

	/**
	 * Get all the active streams that the current user is following
	 */
	public static async getActiveFollowedStreams(onAddEntries?: (entries: TwitchDataTypes.StreamInfo[]) => void): Promise<TwitchDataTypes.StreamInfo[]> {
		if (!this.hasScopes([TwitchScopes.LIST_FOLLOWINGS])) return [];

		let list: TwitchDataTypes.StreamInfo[] = [];
		let cursor: string | null = null;
		let creditsUsed = 0;
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "streams/followed");
			url.searchParams.set("first", "100");
			url.searchParams.set("user_id", this.uid);
			if (cursor) {
				url.searchParams.set("after", cursor);
			}
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 500) break;
			if (res.status != 200) continue;

			const json: { data: TwitchDataTypes.StreamInfo[], pagination?: { cursor?: string } } = await res.json();
			list = list.concat(json.data);

			const uids = json.data.map(x => x.user_id);
			const users = await this.getUserInfo(uids);
			users.forEach(u => {
				for (let i = 0; i < json.data.length; i++) {
					const s = json.data[i];
					if (s.user_id == u.id) {
						s.user_info = u;
						break;
					}
				}
			});
			if (onAddEntries) onAddEntries(json.data);

			cursor = null;
			if (json.pagination?.cursor) {
				cursor = json.pagination.cursor;
			}
			creditsUsed += 2;
			//Wait a minute to refresh API credits
			if (creditsUsed >= 400) {
				await Utils.promisedTimeout(60000);
				creditsUsed = 0;
			}
		} while (cursor != null)
		return list;
	}

	/**
	 * Gets a list of the channels following us (restricted to the authenticated user or their moderators)
	 *
	 * @param channelId channelId to get followings list
	 * @param maxCount maximum followings to grabe
	 * @param tempDataCallback optional callback method to get results as they're loading
	 */
	public static async getFollowers(channelId?: string | null, maxCount = -1, tempDataCallback?: (list: TwitchDataTypes.Follower[]) => void): Promise<TwitchDataTypes.Follower[]> {
		if (!this.hasScopes([TwitchScopes.LIST_FOLLOWERS])) return [];

		let list: TwitchDataTypes.Follower[] = [];
		let cursor: string | null = null;
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "channels/followers");
			url.searchParams.append("broadcaster_id", this.uid);
			url.searchParams.append("first", "100");
			if (cursor) url.searchParams.append("after", cursor);
			if (channelId) url.searchParams.append("user_id", channelId);
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.Follower[], pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
				if (tempDataCallback) {
					tempDataCallback(list);
				}
			} else {
				break;
			}
		} while (cursor != null && (maxCount == -1 || list.length < maxCount));
		return list;
	}

	/**
	 * Gets followers count
	 *
	 * @param userUds user IDs to get followers count of
	 */
	public static async getFollowersCount(userIds: string[]): Promise<{[key:string]:number}> {
		let list:{[key:string]:number} = {};
		do {
			const uid = userIds.shift()!;
			const url = new URL(Config.instance.TWITCH_API_PATH + "channels/followers");
			url.searchParams.append("broadcaster_id", uid);
			url.searchParams.append("first", "100");
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.Follower[], total:number, pagination?: { cursor?: string } } = await res.json();
				list[uid] = json.total;
			} else {
				break;
			}
		} while (userIds.length > 0);
		return list;
	}

	/**
	 * Check if user follows currently authenticated user
	 *
	 * @param userId channelId to get followings list
	 */
	public static async getFollowerState(userId: string): Promise<TwitchDataTypes.Follower | null> {
		if (!this.hasScopes([TwitchScopes.LIST_FOLLOWERS])) return null;

		const url = new URL(Config.instance.TWITCH_API_PATH + "channels/followers");
		url.searchParams.append("broadcaster_id", this.uid);
		url.searchParams.append("user_id", userId);
		const res = await this.callApi(url, {
			method: "GET",
			headers: this.headers,
		});
		if (res.status == 200) {
			const json: { data: TwitchDataTypes.Follower[], pagination?: { cursor?: string } } = await res.json();
			return json.data[0];
		}
		return null;
	}

	/**
	 * Gets a list of the channels we follow
	 *
	 * @param channelId channelId to get followings list
	 * @param maxCount maximum followings to grabe
	 * @param tempDataCallback optional callback method to get results as they're loading
	 */
	public static async getFollowings(channelId: string, maxCount = -1, tempDataCallback?: (list: TwitchDataTypes.Following[]) => void): Promise<TwitchDataTypes.Following[]> {
		if (!this.hasScopes([TwitchScopes.LIST_FOLLOWINGS])) return [];

		let list: TwitchDataTypes.Following[] = [];
		let cursor: string | null = null;
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "channels/followed");
			url.searchParams.append("first", "100");
			url.searchParams.append("user_id", channelId);
			if (cursor) url.searchParams.append("after", cursor);
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.Following[], pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
				if (tempDataCallback) {
					tempDataCallback(list);
				}
			} else {
				break;
			}
		} while (cursor != null && (maxCount == -1 || list.length < maxCount));
		return list;
	}

	/**
	 * Gets a list of the current subscribers to the specified channel
	 * Can only get our own subs
	 */
	public static async getSubsList(totalOnly: true): Promise<{ subs: number, points: number }>;
	public static async getSubsList(totalOnly: false): Promise<TwitchDataTypes.Subscriber[]>;
	public static async getSubsList(totalOnly: boolean): Promise<TwitchDataTypes.Subscriber[] | { subs: number, points: number }> {
		if (!this.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) return totalOnly?  {subs:0, points:0} : [];

		const channelId = this.uid;
		let list: TwitchDataTypes.Subscriber[] = [];
		let cursor: string | null = null;
		let subs = 0;
		let points = 0;
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "subscriptions");
			url.searchParams.append("broadcaster_id", channelId);
			if (totalOnly) {
				url.searchParams.append("first", "1");
			} else {
				url.searchParams.append("first", "100");
			}
			if (cursor) url.searchParams.append("after", cursor);
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.Subscriber[], total: number, points: number, pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
				subs = json.total;
				points = json.points;
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else
				if (res.status == 500) break;
		} while (cursor != null && !totalOnly)
		return totalOnly ? { subs, points } : list;
	}

	/**
	 * Gets the subscription state of spacific users to the authenticated user
	 * Needs "user:read:subscriptions" scope
	 */
	public static async getSubscriptionState(userIds: string[]): Promise<TwitchDataTypes.Subscriber[]> {
		if (!this.hasScopes([TwitchScopes.LIST_SUBSCRIBERS])) return [];

		let list: TwitchDataTypes.Subscriber[] = [];
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "subscriptions");
			url.searchParams.append("broadcaster_id", this.uid);
			userIds.splice(0, 100).forEach(v => {
				url.searchParams.append("user_id", v);
			})
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.Subscriber[], pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
			} else if (res.status == 500) {
				break;
			} else {
				//ignore :3
			}
		} while (userIds.length > 0)
		return list;
	}

	/**
	 * Gets if the specified user is following the channel
	 *
	 * @param uid user ID list
	 */
	public static async startCommercial(duration: number, channelId: string): Promise<TwitchDataTypes.Commercial | null> {
		if (!this.hasScopes([TwitchScopes.START_COMMERCIAL])) return null;

		Logger.instance.log("ads", {
			log: "Start a commercial for " + duration + "s"
		});

		const validDurations = [30, 60, 90, 120, 150, 180];
		//Invalid duration, force it to 30s
		if (!duration || isNaN(duration)) duration = validDurations[0];
		//Find the closest available duration to the one requested
		duration = validDurations.find(v => v >= duration) ?? validDurations[validDurations.length - 1];

		const options = {
			method: "POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "channels/commercial");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("length", duration.toString());
		const res = await this.callApi(url, options);
		const json = await res.json();
		this.getAdSchedule();//Refreshes current ad schedule data
		if (json.error) {
			throw (json);
		} else {
			return json.data[0];
		}
	}

	/**
	 * Get pronouns of a user
	 */
	public static async getPronouns(uid: string, username: string, platform:TwitchatDataTypes.ChatPlatform): Promise<TwitchatDataTypes.Pronoun | null> {
		if(platform != "twitch") return null;//No platform support anything else but twitch so far

		const getPronounAlejo = async (): Promise<TwitchatDataTypes.Pronoun | null> => {
			const url = new URL("https://pronouns.alejo.io/api/users/" + username);
			const res = await this.callApi(url);
			const data = await res.json();

			if (data.error) {
				throw data;
			} else if (data.length > 0) {
				return data[0];
			}

			return null;
		};

		const getPronounPronounDb = async (): Promise<TwitchatDataTypes.Pronoun | null> => {
			const url = new URL("https://pronoundb.org/api/v2/lookup")
			url.searchParams.set("platform", platform);
			url.searchParams.set("ids", uid);
			const res = await this.callApi(url);
			const data = await res.json();

			if (Object.keys(data).length === 0) return null;

			return {
				id: uid,
				login: username,
				pronoun_id: data[uid].sets.en.join("/"),
			};
		}

		let pronoun: TwitchatDataTypes.Pronoun | null = null;
		if(platform === "twitch") {
			try {
				pronoun = await getPronounAlejo();
			} catch (error) {
				/*ignore*/
			}
		}
		if (pronoun == null) {
			try {
				pronoun = await getPronounPronounDb();
			} catch (error) {
				/*ignore*/
			}
		}

		return pronoun;
	}

	/**
	 * Search for live channels
	 *
	 * @param search search term
	 */
	public static async searchLiveChannels(search: string): Promise<TwitchDataTypes.LiveChannelSearchResult[]> {
		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "search/channels");
		url.searchParams.append("query", search);
		url.searchParams.append("first", "20");
		url.searchParams.append("live_only", "true");
		const res = await this.callApi(url, options);
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.searchLiveChannels(search);
		}
		const json = await res.json();
		if (json.error) {
			throw (json);
		} else {
			return json.data;
		}
	}

	/**
	 * Search for a stream category
	 *
	 * @param search search term
	 */
	public static async searchCategory(search: string): Promise<TwitchDataTypes.StreamCategory[]> {
		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "search/categories");
		url.searchParams.set("first", "50");
		url.searchParams.set("query", search);
		const res = await this.callApi(url, options);
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.searchCategory(search);
		}
		const json = await res.json();
		if (json.error) {
			throw (json);
		} else {
			//Search if there's an exact match, if so, bring it to the top.
			//api doesn't seem to send most relevant category everytime.
			//Ex: "Valheim" bring "Valley" first, then "Valheim"
			const list = json.data as TwitchDataTypes.StreamCategory[];
			for (let i = 0; i < list.length; i++) {
				if (list[i].name.toLowerCase() === search.toLowerCase()) {
					const match = list.splice(i, 1);
					list.unshift(match[0]);
				}
			}
			return json.data;
		}
	}

	/**
	 * Get a category's details
	 *
	 * @param id category ID
	 */
	public static async getCategoryByID(id: string): Promise<TwitchDataTypes.StreamCategory> {
		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "games");
		url.searchParams.set("id", id);
		const res = await this.callApi(url, options);
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.getCategoryByID(id);
		}
		const json = await res.json();
		if (json.error) {
			throw (json);
		} else {
			return json.data[0];
		}
	}

	/**
	 * Update stream's title and game
	 */
	public static async setStreamInfos(channelId: string, title?: string, categoryID?: string, tags: string[] = [], branded?: boolean, labels: { id: string, enabled: boolean }[] = []): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.SET_STREAM_INFOS])) return false;

		const body: { [key: string]: any } = {}

		if (title) body.title = title;
		if (categoryID) body.game_id = categoryID;
		if (branded != undefined) body.is_branded_content = branded;
		if (labels && labels.length > 0) body.content_classification_labels = labels.map(v=> {
			return {id:v.id, is_enabled:v.enabled};
		});
		if (tags && tags.length > 0) body.tags = tags.map(v => v.replace(/[!"#$%&''()*+,\-./:;<=>?@\\\]^_`{|}~ ¡£§©«»¿˂˃˄˅\s]/g, "").substring(0, 25).trim());

		const options = {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(body)
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "channels");
		url.searchParams.append("broadcaster_id", channelId);
		const res = await this.callApi(url, options);
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.setStreamInfos(channelId, title, categoryID, tags);
		} else if (res.status == 400) {
			const json = await res.json();
			if (json.message) {
				StoreProxy.common.alert(StoreProxy.i18n.t("error.stream_info_updating", { MESSAGE: json.message }));
				throw (new Error(json.message));
			}
		}
		return res.status == 204;
	}

	/**
	 * Update stream's title and game
	 */
	public static async getContentClassificationLabels(): Promise<{ id: string, description: string, name: string }[]> {
		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "content_classification_labels");
		url.searchParams.append("locale", StoreProxy.i18n.t("global.lang"));
		const res = await this.callApi(url, options);
		const json = await res.json();
		if (json.error) {
			throw (json);
		} else {
			return json.data || json.Data;
		}
	}

	/**
	 * Bans a user
	 */
	public static async banUser(user: TwitchatDataTypes.TwitchatUser, channelId: string, duration?: number, reason?: string): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.EDIT_BANNED])) return false;

		if (duration != undefined && duration === 0) return false;

		const body: { [key: string]: string | number } = {
			user_id: user.id,
		};
		if (duration) body.duration = duration;
		if (reason) body.reason = reason;

		const options = {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({ data: body }),
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/bans");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", this.uid);

		const res = await this.callApi(url, options);
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.banUser(user, channelId, duration, reason);
		}
		if (res.status == 200) {
			StoreProxy.users.flagBanned("twitch", channelId, user.id, duration);
			return true;
		} else {
			const json = await res.json();
			if (json.message) {
				StoreProxy.common.alert(json.message);
			}
			return false;
		}
	}

	/**
	 * Unbans a user
	 */
	public static async unbanUser(user: TwitchatDataTypes.TwitchatUser, channelId: string): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.EDIT_BANNED])) return false;

		const options = {
			method: "DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/bans");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", this.uid);
		url.searchParams.append("user_id", user.id);

		const res = await this.callApi(url, options);
		if (res.status == 204) {
			StoreProxy.users.flagUnbanned("twitch", channelId, user.id);
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.unbanUser(user, channelId);
			} else {
				const json = await res.json();
				if (json.message) {
					StoreProxy.common.alert(json.message);
				}
				return false;
			}
	}

	/**
	 * Blocks a user
	 */
	public static async blockUser(user: TwitchatDataTypes.TwitchatUser, reason?: "spam" | "harassment" | "other", recursiveIndex: number = 0): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.EDIT_BLOCKED])) return false;

		const options = {
			method: "PUT",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "users/blocks");
		url.searchParams.append("target_user_id", user.id);
		if (reason) url.searchParams.append("reason", reason);

		const res = await this.callApi(url, options);
		if (res.status == 204) {
			StoreProxy.users.flagBlocked("twitch", user.id);
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.blockUser(user, reason);
			} else {
				const json = await res.json();
				if (json.message) {
					StoreProxy.common.alert(json.message);
				}
				return false;
			}
	}

	/**
	 * Unblocks a user
	 */
	public static async unblockUser(user: TwitchatDataTypes.TwitchatUser): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.EDIT_BLOCKED])) return false;

		const options = {
			method: "DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "users/blocks");
		url.searchParams.append("target_user_id", user.id);

		const res = await this.callApi(url, options);
		if (res.status == 204) {
			StoreProxy.users.flagUnblocked("twitch", user.id);
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.unblockUser(user);
			} else {
				const json = await res.json();
				if (json.message) {
					StoreProxy.common.alert(json.message);
				}
				return false;
			}
	}

	/**
	 * Create a clip
	 */
	public static async createClip(): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.CLIPS])) return false;

		const channel_id = this.uid;
		let message: TwitchatDataTypes.MessageClipCreate = {
			id: Utils.getUUID(),
			date: Date.now(),
			platform: "twitch",
			type: TwitchatDataTypes.TwitchatMessageType.CLIP_PENDING_PUBLICATION,
			clipUrl: "",
			clipPublicUrl: "",
			clipID: "",
			error: false,
			loading: true,
			channel_id,
		};
		StoreProxy.chat.addMessage(message);

		const options = {
			method: "POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "clips");
		url.searchParams.append("broadcaster_id", channel_id);
		const res = await this.callApi(url, options);
		if (res.status > 200 && res.status < 204) {
			const json = await res.json();
			message.clipUrl = json.data[0].edit_url;
			message.clipID = json.data[0].id;

			const createdDate = Date.now();
			const interval = window.setInterval(async () => {
				const clip = await TwitchUtils.getClipById(message.clipID);
				if (clip) {
					clearInterval(interval);
					const clipData = {
						url: clip.embed_url,
						// mp4: clip.thumbnail_url.replace(/-preview.*\.jpg/gi, ".mp4"),
						duration: clip.duration,
					};
					message.clipData = clipData;
					message.loading = false;
					Database.instance.updateMessage(message);

					//Send a message dedicated to the creation complete to execute related
					//triggers once clip loading completed
					message = {
						id: Utils.getUUID(),
						date: Date.now(),
						platform: "twitch",
						type: TwitchatDataTypes.TwitchatMessageType.CLIP_CREATION_COMPLETE,
						clipUrl: json.data[0].edit_url,
						clipPublicUrl: clip.url,
						clipID: json.data[0].id,
						error: false,
						loading: false,
						clipData,
						channel_id,
					};
					StoreProxy.chat.addMessage(message);
				}

				//If after 15s the clip is still not returned by the API, consider it failed
				if (Date.now() - createdDate > 15000) {
					message.error = true;
					message.loading = false;
					clearInterval(interval);
				}
			}, 1000);
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.raidCancel();
			} else {
				message.error = true;
				message.loading = false;
				try {
					const json = await res.json();
					if (json) StoreProxy.common.alert(json.message);
				} catch (error) {
					StoreProxy.common.alert("Clip creation failed.");
				}
				return false;
			}
	}

	/**
	 * Get a clip by its ID
	 */
	public static async getClipById(clipId: string, retries:number = 0): Promise<TwitchDataTypes.ClipInfo | null> {
		const options = {
			method: "GET",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "clips");
		url.searchParams.append("id", clipId);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			const json = await res.json();
			if(json.data.length == 0) {
				if(retries > 0) {
					await Utils.promisedTimeout(1000);
					return await this.getClipById(clipId, --retries);
				}
			}
			return json.data[0] ?? null;
		} else
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.getClipById(clipId);
		} else {
			if(retries > 0) {
				await Utils.promisedTimeout(1000);
				return await this.getClipById(clipId, --retries);
			}
			return null;
		}
	}

	/**
	 * Get a list of our blocked users
	 */
	public static async getBlockedUsers(max: number = 10000): Promise<TwitchDataTypes.BlockedUser[]> {
		if (!this.hasScopes([TwitchScopes.LIST_BLOCKED])) return [];

		const options = {
			method: "GET",
			headers: this.headers,
		}
		let list: TwitchDataTypes.BlockedUser[] = [];
		let cursor: string | null = null;
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "users/blocks");
			url.searchParams.append("broadcaster_id", this.uid);
			url.searchParams.append("first", "100");
			if (cursor) url.searchParams.append("after", cursor);
			const res = await this.callApi(url, options);

			//As i managed to corrupt my twitch data, i need this to avoid errors everytime
			if (res.status != 200) return [];

			const json: { data: TwitchDataTypes.BlockedUser[], pagination?: { cursor?: string } } = await res.json();
			list = list.concat(json.data);
			cursor = null;
			if (json.pagination?.cursor) {
				cursor = json.pagination.cursor;
			}
			if (list.length >= max) break;
		} while (cursor != null)
		return list;
	}

	/**
	 * Sends an announcement
	 */
	public static async sendAnnouncement(channelId: string, message: string, color: "blue" | "green" | "orange" | "purple" | "primary" = "primary", sendAsBot:boolean = true): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.SEND_ANNOUNCE])) return false;


		const url = new URL(Config.instance.TWITCH_API_PATH + "chat/announcements");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", this.uid);

		let headers = {...this.headers};
		if(sendAsBot && StoreProxy.twitchBot.connected && StoreProxy.twitchBot.userInfos) {
			url.searchParams.set("moderator_id", StoreProxy.twitchBot.userInfos.user_id);
			headers['Authorization'] = 'Bearer ' + StoreProxy.twitchBot.authToken!.access_token;
		}

		const options = {
			method: "POST",
			headers,
			body: JSON.stringify({ message, color }),
		}

		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.sendAnnouncement(channelId, message, color);
			} else {
				return false;
			}
	}

	/**
	 * Deletes one or all chat message
	 * If no ID is specified, all messages are deleted
	 */
	public static async deleteMessages(channelId: string, messageId?: string): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.DELETE_MESSAGES])) return false;

		const options = {
			method: "DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/chat");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", this.uid);
		if (messageId) url.searchParams.append("message_id", messageId);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.deleteMessages(channelId, messageId);
			} else {
				return false;
			}
	}

	/**
	 * Sets the shield mode state
	 */
	public static async setShieldMode(channelId: string, enabled: boolean): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.SHIELD_MODE])) return false;

		const options = {
			method: "PUT",
			headers: this.headers,
			body: JSON.stringify({
				is_active: enabled
			})
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/shield_mode");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", this.uid);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.setShieldMode(channelId, enabled);
			} else {
				return false;
			}
	}

	/**
	 * Change the user's chat color
	 */
	public static async setColor(color: "blue" | "blue_violet" | "cadet_blue" | "chocolate" | "coral" | "dodger_blue" | "firebrick" | "golden_rod" | "green" | "hot_pink" | "orange_red" | "red" | "sea_green" | "spring_green" | "yellow_green" | string): Promise<boolean> {
		const options = {
			method: "PUT",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "chat/color");
		url.searchParams.append("user_id", this.uid);
		url.searchParams.append("color", color);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.setColor(color);
			} else {
				return false;
			}
	}

	/**
	 * Get the current room's settings
	 */
	public static async getRoomSettings(channelId: string, retry: boolean = false): Promise<TwitchatDataTypes.IRoomSettings | null> {
		const options = {
			method: "GET",
			headers: this.headers,
		}

		const url = new URL(Config.instance.TWITCH_API_PATH + "chat/settings");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", this.uid);
		const res = await this.callApi(url, options);
		if (res.status == 200) {
			const json: {
				data: {
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
				}[]
			} = await res.json();
			const data = json.data[0];
			return {
				chatDelay: data.non_moderator_chat_delay === false ? undefined : data.non_moderator_chat_delay_duration as number,
				emotesOnly: data.emote_mode === true,
				followOnly: data.follower_mode === false ? false : data.follower_mode_duration,
				slowMode: data.slow_mode === false ? false : data.slow_mode_wait_time,
				subOnly: data.subscriber_mode,
			}
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				if (retry) {
					await this.onRateLimit(res.headers, url.pathname);
					return await this.getRoomSettings(channelId);
				}
				return null;
			} else {
				return null;
			}
	}

	/**
	 * Change rooms settings
	 */
	public static async setRoomSettings(channelId: string, settings: TwitchatDataTypes.IRoomSettings): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.SET_ROOM_SETTINGS])) return false;

		const body: any = {};
		if (typeof settings.emotesOnly == "boolean") body.emote_mode = settings.emotesOnly;

		if (typeof settings.subOnly == "boolean") body.subscriber_mode = settings.subOnly; this.uid

		if (settings.followOnly === false) {
			body.follower_mode = false;
		} else if (typeof settings.followOnly == "number") {
			body.follower_mode = true;
			body.follower_mode_duration = Math.min(129600, Math.max(0, settings.followOnly));
		}

		if (settings.chatDelay === 0) {
			body.non_moderator_chat_delay = false;
		} else if (typeof settings.chatDelay == "number") {
			body.non_moderator_chat_delay = true;
			body.non_moderator_chat_delay_duration = [2, 4, 6].find(v => v >= settings.chatDelay!) ?? 2;
		}

		if (settings.slowMode === 0) {
			body.slow_mode = false;
		} else if (typeof settings.slowMode == "number") {
			body.slow_mode = true;
			body.slow_mode_wait_time = Math.min(120, Math.max(3, settings.slowMode));
		}

		const options = {
			method: "PATCH",
			headers: this.headers,
			body: JSON.stringify(body),
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "chat/settings");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", this.uid);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			return true;
		} else
			if (res.status == 429) {
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.setRoomSettings(channelId, settings);
			} else {
				return false;
			}
	}

	/**
	 * Add or remove a channel moderator
	 */
	public static async addRemoveModerator(removeMod: boolean, channelId: string, user: TwitchatDataTypes.TwitchatUser): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.EDIT_MODS])) return false;


		const options = {
			method: removeMod ? "DELETE" : "POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/moderators");
		url.searchParams.append("broadcaster_id", this.uid);
		url.searchParams.append("user_id", user.id);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			if (removeMod) {
				StoreProxy.users.flagUnmod("twitch", channelId, user.id);
			} else {
				StoreProxy.users.flagMod("twitch", channelId, user.id);
			}
			return true;
		} else
			if (res.status == 400) {
				const json = await res.json();
				if (/.*already.*mod.*/gi.test(json.message as string)) {
					StoreProxy.common.alert("User " + user.login + " is already a moderator on this channel.");//TODO translate
				} else {
					StoreProxy.common.alert(json.message);
				}
				return false
			} else
				if (res.status == 422) {
					const json = await res.json();
					const mess = json.message as string;
					if (removeMod) {
						StoreProxy.common.alert("User " + user.login + " is not a moderator of this channel");//TODO translate
					} else if (/.*is.*vip.*/gi.test(mess)) {
						StoreProxy.common.alert("User " + user.login + " is a VIP of this channel. You first need to remove them from your VIPs");//TODO translate
					}
					return false
				} else
					if (res.status == 429) {
						//Rate limit reached, try again after it's reset to full
						await this.onRateLimit(res.headers, url.pathname);
						return await this.addRemoveModerator(removeMod, channelId, user);
					} else {
						return false;
					}
	}

	/**
	 * Add or remove a channel VIP
	 */
	public static async addRemoveVIP(removeVip: boolean, channelId: string, user: TwitchatDataTypes.TwitchatUser): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.EDIT_VIPS])) return false;

		const options = {
			method: removeVip ? "DELETE" : "POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "channels/vips");
		url.searchParams.append("broadcaster_id", this.uid);
		url.searchParams.append("user_id", user.id);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			if (removeVip) {
				StoreProxy.users.flagUnvip("twitch", channelId, user.id);
			} else {
				StoreProxy.users.flagVip("twitch", channelId, user.id);
			}
			return true;
		} else

		if (res.status == 400) {
			const json = await res.json();
			StoreProxy.common.alert(json.message);
			return false
		} else

		if (res.status == 422) {
			const json = await res.json();
			const mess = json.message as string;
			if (removeVip) {
				StoreProxy.common.alert("User " + user.login + " is not a VIP of this channel");//TODO translate
			} else if (/.*is.*moderator.*/gi.test(mess)) {
				StoreProxy.common.alert("User " + user.login + " is a moderator of this channel. You first need to remove them from your mods");//TODO translate
			} else if (/.*is.*vip.*/gi.test(mess)) {
				StoreProxy.common.alert("User " + user.login + " is already a VIP on this channel.");//TODO translate
			}
			return false
		} else

		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.addRemoveVIP(removeVip, channelId, user);
		} else {
			return false;
		}
	}

	/**
	 * Raid a channel
	 */
	public static async raidChannel(channel: string): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.START_RAID])) return false;

		let user!: TwitchDataTypes.UserInfo;
		try {
			user = (await this.getUserInfo(undefined, [channel]))[0];
		} catch (error) {
			StoreProxy.common.alert("User " + channel + " not found");
			return false;
		}

		if (!user || !user.id) return false;

		const storedUser = StoreProxy.users.getUserFrom("twitch", this.uid, user.id, user.login, user.display_name);
		storedUser.avatarPath = user.profile_image_url;

		const options = {
			method: "POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "raids");
		url.searchParams.append("from_broadcaster_id", this.uid);
		url.searchParams.append("to_broadcaster_id", user.id);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			return true;
		} else

		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.raidChannel(channel);
		} else {

			let message = "Unable to raid " + channel + "."
			try {
				const json = await res.json();
				if (json.message) message = json.message;
			} catch (error) { }
			StoreProxy.common.alert(message);
			return false;
		}
	}

	/**
	 * Cancels the current raid
	 */
	public static async raidCancel(): Promise<boolean> {
		const options = {
			method: "DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "raids");
		url.searchParams.append("broadcaster_id", this.uid);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			return true;
		} else

		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.raidCancel();
		} else {
			return false;
		}
	}

	/**
	 * Sends a whisper to someone
	 */
	public static async whisper(message: string, toLogin?: string, toId?: string): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.WHISPER_MANAGE])) return false;

		if (!toId && toLogin) {
			try {
				toId = (await this.getUserInfo(undefined, [toLogin]))[0].id;
			} catch (error) {
				StoreProxy.common.alert("User \"" + toLogin + "\" not found");
				return false;
			}
		}

		if (!toId) return false;

		const options = {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify({ message })
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "whispers");
		url.searchParams.append("from_user_id", this.uid);
		url.searchParams.append("to_user_id", toId);
		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			const me = StoreProxy.auth.twitch.user;
			const data:TwitchatDataTypes.MessageWhisperData = {
				id:Utils.getUUID(),
				type:TwitchatDataTypes.TwitchatMessageType.WHISPER,
				platform:"twitch",
				channel_id: me.id,
				date:Date.now(),
				user: me,
				to: StoreProxy.users.getUserFrom("twitch", me.id, toId),
				message,
				message_html:"",
				message_chunks:[],
				message_size:0,
			};

			data.message_chunks = TwitchUtils.parseMessageToChunks(message, undefined, true);
			data.message_html = TwitchUtils.messageChunksToHTML(data.message_chunks);
			data.message_size = TwitchUtils.computeMessageSize(data.message_chunks);

			StoreProxy.chat.addMessage(data);

			return true;
		} else
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.whisper(message, toLogin, toId);
		} else {
			try {
				const json = await res.json();
				if (json) StoreProxy.common.alert(json.message);
			} catch (error) {
				StoreProxy.common.alert("You are not allowed to send whispers from Twitchat.");
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
	public static async getChatters(channelId: string, channelName?: string): Promise<false | string[]> {
		if (!this.hasScopes([TwitchScopes.LIST_CHATTERS])) return false;

		const options = {
			method: "GET",
			headers: this.headers,
		}

		const url = new URL(Config.instance.TWITCH_API_PATH + "chat/chatters");
		url.searchParams.append("broadcaster_id", channelId);
		url.searchParams.append("moderator_id", this.uid);

		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
			const json: { data: { user_id: string, user_login: string, user_name: string }[] } = await res.json();
			return json.data.map(v => v.user_login);
		} else
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			await this.onRateLimit(res.headers, url.pathname);
			return await this.getChatters(channelId, channelName);
		}
		return false;
	}

	/**
	 * Subscribe to an eventsub topic
	 */
	public static async eventsubSubscribe(broadcasterId: string, userId: string, session_id: string, topic: string, version: "1" | "2" | "3" | "beta", additionalCondition?: { [key: string]: any }, attemptCount: number = 0): Promise<false | string> {
		const body = {
			type: topic,
			version,
			condition: {} as Record<string, string>,
			transport: {
				method: "websocket",
				session_id,
			}
		};

		if(broadcasterId) {
			body.condition.broadcaster_user_id = broadcasterId;
		}

		if(userId) {
			body.condition.moderator_user_id = userId;
		}

		if (additionalCondition) {
			for (const key in additionalCondition) {
				body.condition[key] = additionalCondition[key];
			}
		}

		const options = {
			method: "POST",
			headers: this.headers,
			body: JSON.stringify(body)
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "eventsub/subscriptions");
		const res = await this.callApi(url, options);
		if (res.status == 202) {
			const json: { data: TwitchDataTypes.EventsubSubscription[] } = await res.json();
			return json.data[0].id;
		} else
		if (res.status == 429) {
			//Rate limit reached, try again after it's reset to full
			// await this.onRateLimit(res.headers, url.pathname, attemptCount);
			// if (attemptCount < 2) {
			// 	attemptCount++;
			// 	return await this.eventsubSubscribe(channelId, userId, session_id, topic, version, additionalCondition, attemptCount);
			// }
		}
		return false;
	}

	/**
	 * Get all eventsub subscriptions
	 */
	public static async eventsubGetSubscriptions(): Promise<TwitchDataTypes.EventsubSubscription[]> {
		let cursor: string | null = null;
		let list: TwitchDataTypes.EventsubSubscription[] = [];
		const options = {
			method: "GET",
			headers: this.headers,
		}

		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "eventsub/subscriptions");
			if (cursor) {
				url.searchParams.append("after", cursor)
			}
			const res = await this.callApi(url, options);
			if (res.status == 200 || res.status == 204) {
				const json: { data: TwitchDataTypes.EventsubSubscription[], pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else {
				return [];
			}
		} while (cursor != null)
		return list;
	}

	/**
	 * Delete an eventsub subscription
	 */
	public static async eventsubDeleteSubscriptions(id: string): Promise<boolean> {
		const options = {
			method: "DELETE",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "eventsub/subscriptions");
		url.searchParams.append("id", id);

		const res = await this.callApi(url, options);
		if (res.status == 200 || res.status == 204) {
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
	public static async searchTag(ids: string[]): Promise<{ id: string, label: string }[]> {
		const result: { id: string, label: string }[] = [];

		const options = {
			method: "GET",
			headers: this.headers,
		}

		let list: TwitchDataTypes.StreamTag[] = [];
		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "tags/streams");
			for (let i = 0; i < Math.min(100, ids.length); i++) {
				url.searchParams.append("tag_id", ids.pop()!);
			}
			url.searchParams.append("first", "100");

			const res = await this.callApi(url, options);
			if (res.status == 500) break;
			if (res.status != 200) continue;
			const json: { data: TwitchDataTypes.StreamTag[], pagination?: { cursor?: string } } = await res.json();
			list = list.concat(json.data);
		} while (ids.length > 0);

		//@ts-ignore
		let userLang: string = navigator.language ?? navigator.userLanguage;
		userLang = userLang.toLowerCase();
		if (userLang.indexOf("-") == -1) {
			userLang += "-" + userLang;
		}

		for (let i = 0; i < list.length; i++) {
			const t = list[i];
			let label = t.localization_names[userLang];
			if (!label) label = t.localization_names["en-us"];
			result.push({ id: t.tag_id, label });
		}

		return result;
	}

	/**
	 * Sends a shoutout to someone
	 */
	public static async sendShoutout(channelId: string, user: TwitchatDataTypes.TwitchatUser): Promise<boolean|"NOT_LIVE"|"NOT_MODERATOR"|"RATE_LIMIT"> {
		if (!this.hasScopes([TwitchScopes.SHOUTOUT])) return false;

		const options = {
			method: "POST",
			headers: this.headers,
		}
		const url = new URL(Config.instance.TWITCH_API_PATH + "chat/shoutouts");
		url.searchParams.append("from_broadcaster_id", channelId);
		url.searchParams.append("to_broadcaster_id", user.id);
		url.searchParams.append("moderator_id", this.uid);

		const res = await this.callApi(url, options);

		if (res.status == 200 || res.status == 204) {
			return true;
		} else
			if (res.status == 429) {
				let message = "";
				try {
					const json = await res.json();
					if (json) message = (json.message || "").toLowerCase();
				} catch (error) {
					StoreProxy.common.alert("Shoutout failed.");
				}
				if (message.indexOf("cooldown") > -1) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.shoutout_cooldown"));
					return "RATE_LIMIT";
				}
				//Rate limit reached, try again after it's reset to full
				await this.onRateLimit(res.headers, url.pathname);
				return await this.sendShoutout(channelId, user);
			} else {
				let message = "";
				try {
					const json = await res.json();
					if (json) message = (json.message || "").toLowerCase();
				} catch (error) {
					StoreProxy.common.alert("Shoutout failed.");
				}
				if (message.indexOf("not streaming") > -1) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.shoutout_offline"));
					return "NOT_LIVE";
				}
				if (message.indexOf("channel moderator") > -1) {
					StoreProxy.common.alert(StoreProxy.i18n.t("error.shoutout_not_mod"));
					return "NOT_MODERATOR";
				}
				StoreProxy.common.alert(message);
				return false;
			}
	}

	/**
	 * Gets a user's followers count and latest followers
	 *
	 * @param channelId channelId to get followers list
	 */
	public static async getLastFollowers(channelId?: string | null): Promise<{ total: number, followers: TwitchDataTypes.Follower[] }> {
		if (!channelId) channelId = this.uid;

		const url = new URL(Config.instance.TWITCH_API_PATH + "channels/followers");
		url.searchParams.append("broadcaster_id", channelId);

		const res = await this.callApi(url, {
			method: "GET",
			headers: this.headers,
		});
		if (res.status == 200) {
			const json: { data: [], total: number } = await res.json();
			return { total: json.total, followers: json.data };
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.getLastFollowers(channelId);
		}
		return { total: 0, followers: [] };
	}

	/**
	 * Gets fake user entries (at least 20) from our followers if access to those is granted
	 * otherwise it will return some Twitch specific users
	 */
	public static async getFakeUsers(): Promise<TwitchatDataTypes.TwitchatUser[]> {
		if (this.fakeUsersCache.length > 0) return this.fakeUsersCache;

		const channelId: string = this.uid;
		let followers: TwitchDataTypes.Follower[] = [];
		//If followers listing has been granted, list them
		if (TwitchUtils.hasScopes([TwitchScopes.LIST_FOLLOWERS])) {
			followers = await TwitchUtils.getFollowers(null, 100);
			for (let i = 0; i < followers.length; i++) {
				const user = StoreProxy.users.getUserFrom("twitch", channelId, followers[i].user_id, followers[i].user_login, followers[i].user_name, undefined, true, false);
				user.channelInfo[channelId].following_date_ms = new Date(followers[i].followed_at).getTime();
				this.fakeUsersCache.push(user);
			}
		}

		//If there are not enough entries, add fake ones
		const additional: { id: string, login: string, displayName: string }[] = [
			{ id: "29961813", login: "durss", displayName: "Durss" },
			{ id: "647389082", login: "durssbot", displayName: "DurssBot" },
			{ id: "61260038", login: "twitchfr", displayName: "TwitchFR" },
			{ id: "3571950", login: "twitches", displayName: "TwitchES" },
			{ id: "129232627", login: "twitchth", displayName: "TwitchTH" },
			{ id: "89340006", login: "twitchtw", displayName: "TwitchTW" },
			{ id: "144403200", login: "twitchde", displayName: "TwitchDE" },
			{ id: "144300085", login: "twitchtw2", displayName: "TwitchTW2" },
			{ id: "527115020", login: "twitchgaming", displayName: "TwitchGaming" },
			{ id: "94443912", login: "twitchgamingfr", displayName: "TwitchGamingFR" },
			{ id: "141981764", login: "twitchdev", displayName: "TwitchDev" },
			{ id: "149747285", login: "twitchpresents", displayName: "TwitchPresents" },
			{ id: "233403700", login: "twitchpresentsfr", displayName: "TwitchPresentsFR" },
			{ id: "233398214", login: "twitchpresentses", displayName: "TwitchPresentsES" },
			{ id: "233397692", login: "twitchpresentsde", displayName: "TwitchPresentsDE" },
			{ id: "197886470", login: "twitchrivals", displayName: "TwitchRivals" },
			{ id: "443878817", login: "twitchrivals_fr", displayName: "twitchrivals_fr" },
			{ id: "239340769", login: "twitchrivals_es", displayName: "TwitchRivals_es" },
			{ id: "239336077", login: "twitchrivals_tw", displayName: "TwitchRivals_tw" },
			{ id: "477339272", login: "twitchhypetrain", displayName: "TwitchHypeTrain" },
		]

		const count = Math.min(20, additional.length);
		while (this.fakeUsersCache.length < count) {
			const [entry] = additional.splice(Math.floor(Math.random() * additional.length), 1);
			this.fakeUsersCache.push(StoreProxy.users.getUserFrom("twitch", channelId, entry.id, entry.login, entry.displayName, undefined, false, false));
		}

		//Get users that are missing avatars
		const missingAvatars: TwitchatDataTypes.TwitchatUser[] = [];
		for (let i = 0; i < this.fakeUsersCache.length; i++) {
			const u = this.fakeUsersCache[i];
			if (!u.avatarPath) missingAvatars.push(u);
		}

		//Load missing avatars
		if (missingAvatars.length > 0) {
			const res = await TwitchUtils.getUserInfo(missingAvatars.map(v => v.id));
			res.forEach(u => {
				const user = missingAvatars.find(v => v.id === u.id);
				if (user) user.avatarPath = u.profile_image_url;
			})
		}

		return this.fakeUsersCache;
	}

	/**
	 * Gets a user's followers count
	 *
	 * @param channelId channelId to get followers list
	 */
	public static async createStreamMarker(comment: string = ""): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.SET_STREAM_INFOS])) return false;

		const url = new URL(Config.instance.TWITCH_API_PATH + "streams/markers");
		url.searchParams.append("user_id", this.uid);
		if (comment) url.searchParams.append("description", comment);

		const res = await this.callApi(url, {
			method: "POST",
			headers: this.headers,
		});
		if (res.status == 200) {
			const message: TwitchatDataTypes.MessageNoticeData = {
				id: Utils.getUUID(),
				date: Date.now(),
				platform: "twitch",
				channel_id: this.uid,
				type: TwitchatDataTypes.TwitchatMessageType.NOTICE,
				noticeId: TwitchatDataTypes.TwitchatNoticeType.MARKER_CREATED,
				message: StoreProxy.i18n.t("chat.marker.created"),
			};
			StoreProxy.chat.addMessage(message);
			return true;
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.createStreamMarker(comment);
		}
		StoreProxy.common.alert(StoreProxy.i18n.t("error.marker_creation"));
		return false;
	}

	/**
	 * Gets Ad schedule
	 */
	public static async getAdSchedule(): Promise<TwitchDataTypes.AdSchedule | null> {
		if (!this.hasScopes([TwitchScopes.ADS_READ])) return null;

		Logger.instance.log("ads", {
			log: "Request ad schedule"
		});

		const url = new URL(Config.instance.TWITCH_API_PATH + "channels/ads");
		url.searchParams.append("broadcaster_id", this.uid);


		const res = await this.callApi(url, {
			method: "GET",
			headers: this.headers,
		});
		let body: string = "";

		if (res.status == 200) {
			const json = await res.json();
			if (json.data && json.data.length > 0) {
				const data = json.data[0] as TwitchDataTypes.AdSchedule;
				//Debug data
				// const data:TwitchDataTypes.AdSchedule = {
				// 	"snooze_count": 3,
				// 	"snooze_refresh_at": 0,
				// 	// "next_ad_at": (new Date("Sun Nov 12 2023 00:44:00 GMT+0100").getTime())/1000,
				// 	"next_ad_at": (Date.now() + 1 * 60 * 60000)/1000,
				// 	"length_seconds": 60,
				// 	"last_ad_at": 0,
				// 	"preroll_free_time_seconds": 0,
				// }
				const infos: TwitchatDataTypes.CommercialData = {
					remainingSnooze: data.snooze_count,
					currentAdDuration_ms: data.duration * 1000,
					//Thank you twitch for writing a wrong documentation...
					//Don't know if they'll change the doc or fix service, so i handle both cases
					nextAdStart_at: new Date(typeof data.next_ad_at == "number" ? data.next_ad_at * 1000 : data.next_ad_at).getTime(),
					prevAdStart_at: new Date(typeof data.last_ad_at == "number" ? data.last_ad_at * 1000 : data.last_ad_at).getTime(),
					nextSnooze_at: new Date(typeof data.snooze_refresh_at == "number" ? data.snooze_refresh_at * 1000 : data.snooze_refresh_at).getTime(),
				};
				Logger.instance.log("ads", {
					log: "Ad schedule loaded",
					api: json.data,
					internal: infos,
				});
				StoreProxy.stream.setCommercialInfo(this.uid, infos);
				return data;
			} else {
				Logger.instance.log("ads", {
					log: "Ad schedule returned no entry",
					api: json,
				});
			}

		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.getAdSchedule();

		} else if (res.status == 400) {
			//Channel not live or no ad scheduled
			const infos: TwitchatDataTypes.CommercialData = {
				remainingSnooze: 0,
				currentAdDuration_ms: 0,
				prevAdStart_at: 0,
				nextAdStart_at: 0,
				nextSnooze_at: 0,
			};
			StoreProxy.stream.setCommercialInfo(this.uid, infos);
		} else if (res.status == 500) {
			body = await res.text();
			if (!this.adblockAlertSent && /failed.*fetch/gi.test(body)) {
				const message: TwitchatDataTypes.MessageCustomData = {
					id: Utils.getUUID(),
					channel_id: this.uid,
					date: Date.now(),
					platform: "twitchat",
					type: TwitchatDataTypes.TwitchatMessageType.CUSTOM,
					icon: "alert",
					style: "error",
					message: StoreProxy.i18n.t("error.ad_block"),
				}
				StoreProxy.chat.addMessage(message, false);
				this.adblockAlertSent = true;
			}
		}
		try {
			Logger.instance.log("ads", {
				log: "Ad schedule return status " + res.status,
				body: body || await res.text(),
			});
		} catch (error) {

		}
		return null;
	}

	/**
	 * Snooze next ad
	 */
	public static async snoozeNextAd(): Promise<TwitchDataTypes.AdSnooze | null> {
		if (!this.hasScopes([TwitchScopes.ADS_SNOOZE])) return null

		const url = new URL(Config.instance.TWITCH_API_PATH + "channels/ads/schedule/snooze");
		url.searchParams.append("broadcaster_id", this.uid);

		const res = await this.callApi(url, {
			method: "POST",
			headers: this.headers,
		});
		if (res.status == 200) {
			const json = await res.json();
			if (json.data && json.data.length > 0) {
				const data = json.data[0] as TwitchDataTypes.AdSnooze;
				const prevInfo = StoreProxy.stream.getCommercialInfo(this.uid);
				const infos: TwitchatDataTypes.CommercialData = {
					currentAdDuration_ms: prevInfo.currentAdDuration_ms,
					remainingSnooze: data.snooze_count,
					prevAdStart_at: prevInfo.prevAdStart_at,
					nextAdStart_at: new Date(typeof data.next_ad_at == "number" ? data.next_ad_at * 1000 : data.next_ad_at).getTime(),
					nextSnooze_at: new Date(typeof data.snooze_refresh_at == "number" ? data.snooze_refresh_at * 1000 : data.snooze_refresh_at).getTime(),
				};
				StoreProxy.stream.setCommercialInfo(this.uid, infos);
				return data;
			}
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.snoozeNextAd();
		}
		return null;
	}

	/**
	 * List user's extensions
	 */
	public static async listExtensions<T extends boolean>(onlyActive: T): Promise<ExtensionReturnType<T> | null> {
		if (!this.hasScopes([TwitchScopes.EXTENSIONS])) return null;

		const url = new URL(Config.instance.TWITCH_API_PATH + (onlyActive ? "users/extensions" : "users/extensions/list"));
		url.searchParams.append("user_id", this.uid);

		const res = await this.callApi(url, {
			method: "GET",
			headers: this.headers,
		});
		if (res.status == 200) {
			const json = await res.json();
			return json.data as ExtensionReturnType<T>;
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.listExtensions(onlyActive);
		}
		return null;
	}

	/**
	 * Updates an extension
	 */
	public static async updateExtension(extensionId: string, extensionVersion: string, enabled: boolean, slotIndex: string, slotType: TwitchDataTypes.Extension["type"][number]): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.EXTENSIONS])) return false;

		const url = new URL(Config.instance.TWITCH_API_PATH + "users/extensions");
		const body: any = {};
		body[slotType] = {}
		body[slotType][slotIndex] = {
			id: extensionId,
			version: extensionVersion,
			active: enabled,
		}

		const res = await this.callApi(url, {
			method: "PUT",
			headers: this.headers,
			body: JSON.stringify({ data: body }),
		});
		if (res.status == 200) {
			return true;
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.updateExtension(extensionId, extensionVersion, enabled, slotIndex, slotType);
		}
		return false;
	}

	/**
	 * List user's extensions
	 */
	public static async getUserEmotes(uid: string): Promise<TwitchDataTypes.Emote[]> {
		if (!this.hasScopes([TwitchScopes.READ_EMOTES])) return [];

		let cursor: string | null = null;
		let list: TwitchDataTypes.Emote[] = [];
		const options = {
			method: "GET",
			headers: this.headers,
		}

		do {
			const url = new URL(Config.instance.TWITCH_API_PATH + "chat/emotes/user");
			url.searchParams.append("user_id", StoreProxy.auth.twitch.user.id);
			url.searchParams.append("broadcaster_id", uid);
			if (cursor) {
				url.searchParams.append("after", cursor)
			}
			const res = await this.callApi(url, options);
			if (res.status == 200 || res.status == 204) {
				const json: { data: Omit<TwitchDataTypes.Emote, "images">[], template: string, pagination?: { cursor?: string } } = await res.json();

				list = list.concat(json.data.map(v => {
					let format = v.format[v.format.length - 1];
					let theme = v.theme_mode.indexOf(StoreProxy.common.theme) > -1 ? StoreProxy.common.theme : v.theme_mode[0];
					return {
						emote_set_id: v.emote_set_id,
						emote_type: v.emote_type,
						format: v.format,
						id: v.id,
						name: v.name,
						owner_id: v.owner_id,
						scale: v.scale,
						theme_mode: v.theme_mode,
						images: {
							url_1x: json.template.replace("{{id}}", v.id).replace("{{format}}", format).replace("{{theme_mode}}", theme).replace("{{scale}}", v.scale[0]),
							url_2x: json.template.replace("{{id}}", v.id).replace("{{format}}", format).replace("{{theme_mode}}", theme).replace("{{scale}}", v.scale[1]),
							url_4x: json.template.replace("{{id}}", v.id).replace("{{format}}", format).replace("{{theme_mode}}", theme).replace("{{scale}}", v.scale[2]),
						},
					}
				}));
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else if (res.status == 500) break;
			else if (res.status != 200) continue;
			else return [];
		} while (cursor != null);

		return list;
	}

	/**
	 * Gets channel's banwords
	 * @param channelID channel to add the blocked terms on
	 */
	public static async getBanword(channelID?:string): Promise<TwitchDataTypes.BlockedTerm[]> {
		if (!this.hasScopes([TwitchScopes.BLOCKED_TERMS])) return [];

		let list: TwitchDataTypes.BlockedTerm[] = [];
		let cursor: string | null = null;
		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/blocked_terms");
		url.searchParams.append("broadcaster_id", channelID ?? this.uid);
		url.searchParams.append("moderator_id", this.uid);
		url.searchParams.append("first", "100");

		do {
			if (cursor) url.searchParams.set("after", cursor);
			const res = await this.callApi(url, {
				method: "GET",
				headers: this.headers,
			});
			if (res.status == 200) {
				const json: { data: TwitchDataTypes.BlockedTerm[], pagination?: { cursor?: string } } = await res.json();
				list = list.concat(json.data);
				cursor = null;
				if (json.pagination?.cursor) {
					cursor = json.pagination.cursor;
				}
			} else if (res.status == 500) break;
		} while (cursor != null)
		return list;
	}

	/**
	 * Adds a string to twitch banwords
	 * @param str blocked terms
	 * @param channelID channel to add the blocked terms on
	 */
	public static async addBanword(str: string, channelID?:string): Promise<false|{id:string, text:string}> {
		if (!this.hasScopes([TwitchScopes.BLOCKED_TERMS])) return false;

		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/blocked_terms");
		url.searchParams.append("broadcaster_id", channelID ?? this.uid);
		url.searchParams.append("moderator_id", this.uid);

		const res = await this.callApi(url, {
			method: "POST",
			headers: this.headers,
			body:JSON.stringify({
				text:str.substring(0, 500),
			})
		});
		if (res.status == 200) {
			const json = await res.json();
			return {id:json.data[0].id, text:json.data[0].text};
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.addBanword(str, channelID);
		}
		return false;
	}

	/**
	 * Removes a string from twitch banwords
	 * @param str blocked terms
	 * @param channelID channel to remove the blocked terms from
	 */
	public static async removeBanword(id: string, channelID?:string): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.BLOCKED_TERMS])) return false;

		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/blocked_terms");
		url.searchParams.append("broadcaster_id", channelID ?? this.uid);
		url.searchParams.append("moderator_id", this.uid);
		url.searchParams.append("id", id);

		const res = await this.callApi(url, {
			method: "DELETE",
			headers: this.headers,
		});
		if (res.status == 200 || res.status == 204) {
			return true;
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.removeBanword(id, channelID);
		}
		return false;
	}

	/**
	 * Sends a warning to a user
	 * @param uid user ID
	 * @param reason warning message
	 */
	public static async sendWarning(uid: string, reason:string, channelID?:string): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.BLOCKED_TERMS])) return false;

		const url = new URL(Config.instance.TWITCH_API_PATH + "moderation/warnings");
		url.searchParams.append("broadcaster_id", channelID ?? this.uid);
		url.searchParams.append("moderator_id", this.uid);

		const res = await this.callApi(url, {
			method: "POST",
			headers: this.headers,
			body:JSON.stringify({
				data: {
					user_id:uid,
					reason: reason.substring(0, 500),
				}
			})
		});
		if (res.status == 200 || res.status == 204) {
			return true;
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.sendWarning(uid, reason, channelID);
		}
		return false;
	}

	/**
	 * Sends a warning to a user
	 * @param uid user ID
	 * @param reason warning message
	 */
	public static async sendMessage(channelID: string, message:string, replyToID?:string, sendAsBot:boolean = true): Promise<boolean> {
		if (!this.hasScopes([TwitchScopes.BLOCKED_TERMS])) return false;

		while(message.length > 0) {
			const url = new URL(Config.instance.TWITCH_API_PATH + "chat/messages");
			const body:{[key:string]:string|number} = {
				broadcaster_id: channelID,
				sender_id: this.uid,
				message: message.substring(0, 499),
			}
			if(replyToID) {
				body.reply_parent_message_id = replyToID;
			}

			let headers = {...this.headers};
			if(sendAsBot && StoreProxy.twitchBot.connected && StoreProxy.twitchBot.userInfos) {
				body.sender_id = StoreProxy.twitchBot.userInfos.user_id;
				headers['Authorization'] = 'Bearer ' + StoreProxy.twitchBot.authToken!.access_token;
			}

			const res = await this.callApi(url, {
				method: "POST",
				headers,
				body:JSON.stringify(body),
			});
			if (res.status == 429) {
				await this.onRateLimit(res.headers, url.pathname);
				return this.sendMessage(channelID, message, replyToID);
			}

			message = message.substring(499);
		}
		return false;
	}

	/**
	 * Sends a warning to a user
	 * @param uid user ID
	 * @param reason warning message
	 */
	public static async getCharityList(channelID: string): Promise<TwitchDataTypes.CharityCampaign[]> {
		if (!this.hasScopes([TwitchScopes.CHARITY_READ])) return [];

		const url = new URL(Config.instance.TWITCH_API_PATH + "charity/campaigns");
		url.searchParams.append("broadcaster_id", channelID);

		const res = await this.callApi(url, {
			method: "GET",
			headers: this.headers,
		});
		if (res.status == 200 || res.status == 204) {
			const json = await res.json() as {data:TwitchDataTypes.CharityCampaign[]};
			return json.data;
		} else if (res.status == 429) {
			await this.onRateLimit(res.headers, url.pathname);
			return this.getCharityList(channelID);
		}
		return [];
	}




	/****************************************
	*************** UTILITIES ***************
	****************************************/



	/**
	 * Requests for scopes if not yet granted
	 * @param scopes
	 * @returns true if all scopes are granted. False if user is prompted to grant access
	 */
	public static requestScopes(scopes: TwitchScopesString[]): boolean {
		if (this.hasScopes(scopes)) return true;
		this.requestScopesCallback(scopes);
		return false;
	}

	/**
	 * Returns if current session includes the given scopes.
	 * All given scopes must be granted for this function to return true
	 *
	 * @param scopes
	 */
	public static hasScopes(scopes: TwitchScopesString[]): boolean {
		if (!Array.isArray(scopes)) {
			scopes = [scopes];
		}

		for (let i = 0; i < scopes.length; i++) {
			if (this.scopes.indexOf(scopes[i]) == -1) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Gets a badge title from its raw info
	 */
	public static getBadgeTitle(setId: string, versionID: string): string {
		let title = "";
		const i18n = StoreProxy.i18n;
		//If it's the subscriber badge, create the title form its ID.
		//ID is in the form "XYYY" where X=tier and YYY the number of months
		if (setId === "subscriber") {
			let months = versionID.length == 4 ? parseInt(versionID.substring(1)) : parseInt(versionID);//Remove "tier" info
			const years = Math.floor(months / 12);
			//Create title from the number of months
			if (years > 0) {
				months = (months - years * 12);
				let duration = years + " " + i18n.tc("global.date.year", years);
				if (months > 0) duration += " " + i18n.t("global.and") + " " + months + " " + i18n.tc("global.date.month", months);
				title = i18n.tc("global.badges.subscriber", { "DURATION": duration });
			} else {
				const duration = months + " " + i18n.tc("global.date.month", months);
				title = i18n.tc("global.badges.subscriber", { "DURATION": duration });
			}
		} else
			//If it's the prediction badge, use the ID as the title.
			//ID is like "blue-6". We replace the dashes by spaces
			if (setId === "predictions") {
				title = i18n.tc("global.badges.prediction", { "VALUE": versionID.replace("-", " ") });
			} else
				//If it's the sub-gift badge, use the ID as the number of gifts
				if (setId === "sub-gifter") {
					title = i18n.tc("global.badges.subgift", { "COUNT": versionID });
				} else
					//If it's the bits badge, use the ID as the number of bits
					if (setId === "bits") {
						title = i18n.tc("global.badges.bits", { "COUNT": versionID });
					} else
						//If it's the moments badge, use the ID as the number of moments
						if (setId === "moments") {
							title = i18n.tc("global.badges.moments", { "COUNT": versionID });
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
	 * Converts a chat message badges to actual badges instances with images and IDs.
	 * @param userBadges
	 * @returns
	 */
	public static getBadgesFromRawBadges(channelId: string, badgeInfos: BadgeInfo | undefined, userBadges: Badges | undefined): TwitchatDataTypes.TwitchatUserBadge[] {
		const result: TwitchatDataTypes.TwitchatUserBadge[] = [];
		const setID_done: { [key: string]: boolean } = {};
		for (const setID in userBadges) {
			const version = userBadges[setID] as string;
			const caches = [this.badgesCache[channelId], this.badgesCache["global"]];
			for (let i = 0; i < caches.length; i++) {
				const cache = caches[i];
				if (!cache) continue;
				if (setID_done[setID] === true) continue;//Badge already added. "subscriber" badge can be both on channel and global caches
				if (!cache[setID]) continue;
				if (!cache[setID][version]) continue;
				setID_done[setID] = true;
				const badge = JSON.parse(JSON.stringify(cache[setID][version])) as TwitchatDataTypes.TwitchatUserBadge;
				if (badgeInfos && badgeInfos[setID]) {
					badge.title = this.getBadgeTitle(setID, badgeInfos[setID] as string);
				}
				badge.version = version;
				result.push(badge);
			}
		}
		return result;
	}

	/**
	 * Splits the message in chunks of type "text", "emote", "cheermote", "url", "highlight" and "user"
	 */
	public static parseMessageToChunks(message: string, emotes?: string | TwitchatDataTypes.EmoteDef[], customParsing = false, platform: TwitchatDataTypes.ChatPlatform = "twitch", parseLinks:boolean = true): TwitchatDataTypes.ParseMessageChunk[] {
		if (!message) return [];

		const emotesList: TwitchatDataTypes.EmoteDef[] = (!emotes || typeof emotes == "string") ? [] : emotes;

		function getProtectedRange(emotes: string): boolean[] {
			const protectedRanges: boolean[] = [];
			if (emotes) {
				const ranges: number[][] | undefined = emotes.match(/[0-9]+-[0-9]+/g)?.map(v => v.split("-").map(v => parseInt(v)));
				if (ranges) {
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

		if (platform == "twitch" && (!emotes || typeof emotes == "string")) {
			if (!emotes || emotes.length == 0) {
				//Attempt to parse emotes manually.
				//TMI doesn't sends back proper emotes tag when sending
				//a message...
				//Parses for all emotes and generates a fake "emotes"
				//tag as if it was sent by IRC.
				if (customParsing && this.emotesCacheHashmap) {
					let fakeTag = "";
					const emoteList: TwitchatDataTypes.Emote[] = [];
					const emoteListHashmap = this.emotesCacheHashmap;
					// const start = Date.now();
					//Parce all words and check if they match an existing emote.
					//If so, keep it aside for faster parsing after
					const chunks = message.split(/\s/);
					for (let i = 0; i < chunks.length; i++) {
						const txt = chunks[i].replace(/[^a-z0-9]+$/gi, "").replace(/^[^a-z0-9]+/gi, "");
						if (emoteListHashmap[txt]) {
							emoteList.push(emoteListHashmap[txt]);
						}
					}

					//Parse found emotes
					const tagsDone: { [key: string]: boolean } = {};
					for (let i = 0; i < emoteList.length; i++) {
						const e = emoteList[i];
						const name = e.code.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
						if (tagsDone[name]) continue;
						tagsDone[name] = true;
						// const matches = [...message.matchAll(new RegExp("(^|\\s?)"+name+"(\\s|$)", "g"))];
						const matches = Array.from(message.matchAll(new RegExp(name, "gi")));
						if (matches && matches.length > 0) {
							// //Current emote has been found
							// //Generate fake emotes data in the expected format:
							// //  ID:start-end,start-end/ID:start-end,start-end
							let tmpTag = e.id + ":";
							let emoteCount = 0;
							for (let j = 0; j < matches.length; j++) {
								const start = (matches[j].index as number);
								const end = start + e.code.length - 1;
								const range = getProtectedRange(fakeTag);

								if (range[start] === true || range[end] === true) continue;

								const prevOK = start == 0 || /[^0-9a-z]/i.test(message.charAt(start - 1));
								const nextOK = end == message.length - 1 || /[^0-9a-z]/i.test(message.charAt(end + 1));
								//Emote has no space before or after or is not at the start or end of the message
								//ignore it.
								if (!prevOK || !nextOK) continue;
								emoteCount++;
								tmpTag += start + "-" + end;

								if (j < matches.length - 1) tmpTag += ",";
							}
							if (emoteCount > 0) {
								fakeTag += tmpTag;
								if (i < emoteList.length - 1) fakeTag += "/"
							}
						}
					}
					// const end = Date.now();
					// console.log((end-start)+"ms");
					if (fakeTag.length > 0) fakeTag += ";";
					emotes = fakeTag;
				}
			}

			if (!emotes) emotes = "";
			// ID:start-end,start-end/ID:start-end,start-end
			let bttvTag = BTTVUtils.instance.generateEmoteTag(message, getProtectedRange(emotes))
			if (bttvTag) {
				if (emotes.length > 0) bttvTag += "/";
				emotes = bttvTag + emotes;
			}
			let ffzTag = FFZUtils.instance.generateEmoteTag(message, getProtectedRange(emotes))
			if (ffzTag) {
				if (emotes.length > 0) ffzTag += "/";
				emotes = ffzTag + emotes;
			}
			let seventvTag = SevenTVUtils.instance.generateEmoteTag(message, getProtectedRange(emotes))
			if (seventvTag) {
				if (emotes.length > 0) seventvTag += "/";
				emotes = seventvTag + emotes;
			}

			//Parse raw emotes data
			const chunks = (emotes as string).split("/");
			if (chunks.length > 0) {
				for (let i = 0; i < chunks.length; i++) {
					const c = chunks[i];
					if (c.indexOf(":") == -1) continue;
					const id = c.split(":")[0];
					const positions = c.split(":")[1].split(",");
					for (let j = 0; j < positions.length; j++) {
						const p = positions[j];
						const begin = parseInt(p.split("-")[0]);
						const end = parseInt(p.split("-")[1]);
						if (isNaN(begin) || isNaN(end)) continue;
						emotesList.push({ id, begin, end });
					}
				}
			}
		}

		const result: TwitchatDataTypes.ParseMessageChunk[] = [];
		if (emotesList && emotesList.length > 0) {
			//Sort emotes by start position
			emotesList.sort((a, b) => a.begin - b.begin);

			let cursor = 0;
			//Convert emotes to image tags
			for (let i = 0; i < emotesList.length; i++) {
				const e = emotesList[i];
				if (cursor < e.begin) {
					result.push({ type: "text", value: Array.from(message).slice(cursor, e.begin).join("") });
				}
				const code = Array.from(message).slice(e.begin, e.end + 1).join("").trim();
				if (e.id.indexOf("BTTV_") == 0) {
					const bttvE = BTTVUtils.instance.getEmoteFromCode(code);
					if (bttvE) {
						result.push({ type: "emote", value: "BTTV: " + code, emote: "https://cdn.betterttv.net/emote/" + bttvE.id + "/1x", emoteHD: "https://cdn.betterttv.net/emote/" + bttvE.id + "/3x" });
					} else {
						result.push({ type: "text", value: code });
					}
				} else
					if (e.id.indexOf("FFZ_") == 0) {
						const ffzE = FFZUtils.instance.getEmoteFromCode(code);
						if (ffzE) {
							result.push({ type: "emote", value: "FFZ: " + code, emote: ffzE.urls[1], emoteHD: ffzE.urls[4] });
						} else {
							result.push({ type: "text", value: code });
						}
					} else
						if (e.id.indexOf("7TV_") == 0) {
							const stvE = SevenTVUtils.instance.getEmoteFromCode(code);
							if (stvE) {
								const rootURL = stvE.host.url + "/";
								const urls = stvE.host.files.filter(v => v.format == "WEBP");
								result.push({ type: "emote", value: "7TV: " + code, emote: rootURL + urls[0].name, emoteHD: rootURL + urls[urls.length - 1].name });
							} else {
								result.push({ type: "text", value: code });
							}
						} else if (platform == "twitch") {
							result.push({ type: "emote", value: code, emote: "https://static-cdn.jtvnw.net/emoticons/v2/" + e.id + "/default/light/1.0", emoteHD: "https://static-cdn.jtvnw.net/emoticons/v2/" + e.id + "/default/light/3.0" });
						} else if (platform == "youtube") {
							result.push({ type: "emote", value: code, emote: e.sd, emoteHD: e.hd });
						}
				cursor = e.end + 1;
			}
			result.push({ type: "text", value: Array.from(message).slice(cursor).join("") });
		} else {
			result.push({ type: "text", value: message });
		}

		//Parse URL chunks
		if(parseLinks) {
			for (let i = 0; i < result.length; i++) {
				const chunk = result[i];
				if (chunk.type == "text") {
					result.splice(i, 1);//Remove source chunk
					const res = (chunk.value || "").split(/((?:(?:http|ftp|https):\/\/)?(?:[\w_-]+(?:(?:\.[\w_-]+)+))(?:[\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-]))/gi);
					let subIndex = 0;
					res.forEach(v => {
						if(v == "") return;
						//Add sub chunks to original resulting chunks
						let islink = /((?:(?:http|ftp|https):\/\/)?(?:[\w_-]+(?:(?:\.[\w_-]+)+))(?:[\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-]))/gi.test(v);
						//Avoid floating numbers to be parsed as links
						if (/[0-9]+\.[0-9]+$/.test(v)) islink = false;
						const node: TwitchatDataTypes.ParseMessageChunk = {
							type: islink ? "url" : "text",
							value: v,
						};

						// console.log(node);

						if (islink) {
							node.href = !/^https?/gi.test(v) ? "https://" + v : v;
						}

						result.splice(i + subIndex, 0, node);
						subIndex++;
					})
				}
				if (result.length > 1000) {
					console.error("INFINITE LOOP DETECTED !", result);
					break;
				}
			}
		}

		//Parse username chunks
		//only for twitch ash we cannot retrive the actual user profile for other platforms
		if(platform == "twitch") {
			for (let i = 0; i < result.length; i++) {
				const chunk = result[i];
				if (chunk.type == "text") {
					result.splice(i, 1);//Remove source chunk
					const res = (chunk.value || "").split(/(@[a-z0-9_]{3,25})/gi);
					let subIndex = 0;
					res.forEach(v => {
						//Add sub chunks to original resulting chunks
						const isUsername = /(@[a-z0-9_]{3,25})/gi.test(v)
						const node: TwitchatDataTypes.ParseMessageChunk = {
							type: isUsername ? "user" : "text",
							value: v,
						};
						if (isUsername) {
							node.username = v.substring(1);//Remove "@"
						}
						result.splice(i + subIndex, 0, node);
						subIndex++;
					})
				}
			}
		}

		return result;
	}

	/**
	 * Computes the text size of a message.
	 * Emotes and cheermotes count as 2 chars
	 * @param message
	 */
	public static computeMessageSize(messageChunks: TwitchatDataTypes.ParseMessageChunk[]): number {
		let size = 0;
		messageChunks.forEach(v => {
			if (v.type == "emote" || v.type == "cheermote") size += 1;
			else size += v.value.length;
		});
		return size;
	}

	/**
	 * Replaces emotes by <img> tags and URL to <a> tags on the message
	 */
	public static messageChunksToHTML(chunks: TwitchatDataTypes.ParseMessageChunk[], cleanupHTML:boolean = true): string {
		let message_html = "";
		for (let i = 0; i < chunks.length; i++) {
			const v = chunks[i];
			const label = !cleanupHTML? v.value : v.value.replace(/</g, "&lt;").replace(/>/g, "&gt;");//Avoid XSS attack
			if (v.type == "text") {
				message_html += label;
			} else if (v.type == "highlight") {
				message_html += "<mark>" + label + "</mark>";
			} else if (v.type == "url") {
				const href = !/^https?/gi.test(label) ? "https://" + label : label;
				message_html += "<a href='" + encodeURI(href) + "'>" + label + "</a>";
			} else if (v.type == "emote" || v.type == "cheermote") {
				message_html += "<img src='" + (v.emoteHD || v.emote) + "' class='emote'>";
			} else if (v.type == "user") {
				message_html += "<span class='user'>" + label + "</span>";
			}
		}
		return message_html;
	}

	/**
	 * Converts Twitch fragments to Twitchat chunks
	 */
	public static async eventsubFragmentsToTwitchatChunks(fragments: TwitchEventSubDataTypes.MessageFragments, channelId:string):Promise<TwitchatDataTypes.ParseMessageChunk[]> {
		let chunks:TwitchatDataTypes.ParseMessageChunk[] = [];
		for (let i = 0; i < fragments.length; i++) {
			const f = fragments[i];
			switch(f.type) {
				default:
				case "text":{
					chunks.push({type:"text", value:f.text});
					break;
				}
				case "emote":{
					// New "bits use" eventsub topic seems to send "emote" fragments without
					// the "format" property. Added the [] fallback while i get some logs to
					// figure out that mess
					const type = (f.emote.format || []).includes("animated")? "animated" : "static";
					const url_1x = "https://static-cdn.jtvnw.net/emoticons/v2/"+f.emote.id+"/"+type+"/dark/1.0";
					const url_4x = "https://static-cdn.jtvnw.net/emoticons/v2/"+f.emote.id+"/"+type+"/dark/3.0";
					chunks.push({type:"emote", value:f.text, emote:url_1x, emoteHD:url_4x || url_1x});
					break;
				}
				case "cheermote":{
					const cheermoteList = await this.loadCheermoteList(channelId);
					const cheermote = cheermoteList.find(v=>v.prefix.toLowerCase() == f.cheermote.prefix.toLowerCase())?.tiers.find(v=>v.min_bits == f.cheermote.tier);
					if(!cheermote) {
						console.log("Cheermote not found", f.cheermote, cheermoteList);
						// chunks.push({type:"text", value:f.text});
						//Fallback to old parsing
						const defaultChunk:TwitchatDataTypes.ParseMessageChunk = {type:"text", value:f.text};
						const chunk = await this.parseCheermotes([defaultChunk], channelId);
						chunks.push(...chunk || defaultChunk);
					}else{
						const imgSD = cheermote.images.dark.animated["2"] ?? cheermote.images.dark.static["2"];
						const imgHD = cheermote.images.dark.animated["4"] ?? cheermote.images.dark.static["4"];
						chunks.push({type:"cheermote", value:f.text, emote:imgSD, emoteHD:imgHD || imgSD});
					}
					break;
				}
				case "mention":{
					chunks.push({type:"user", value:f.text, username:f.mention.user_login});
					break;
				}
			}
		}

		//TODO parse links on text chunks

		return chunks;
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
	public static parsedEmoteDataToRawEmoteData(data: { emote_id: string, start: number, end: number }[]): string {
		let result: string = "";
		const hashmap: { [key: string]: string[] } = {};
		for (let i = 0; i < data.length; i++) {
			const e = data[i];
			if (!hashmap[e.emote_id]) hashmap[e.emote_id] = [];
			hashmap[e.emote_id].push(e.start + "-" + e.end);
		}
		for (const emote in hashmap) {
			if (result.length > 0) result += "/";
			result += emote + ":" + hashmap[emote].join(",")
		}
		return result;
	}

	/**
	 * Parses cheermotes codes and replace/add necessary chunks
	 * Modifies the chunks array in place
	 */
	public static async parseCheermotes(chunks: TwitchatDataTypes.ParseMessageChunk[], channel_id: string): Promise<TwitchatDataTypes.ParseMessageChunk[]> {
		let cheermotes: TwitchDataTypes.CheermoteSet[];
		try {
			cheermotes = await this.loadCheermoteList(channel_id);
		} catch (err) {
			//Safe crash
			return chunks;
		}

		//Parse all cheermotes
		for (let i = 0; i < cheermotes.length; i++) {
			const list = cheermotes[i];
			const reg = new RegExp("(" + list.prefix + "[0-9]+)", "gi");
			//Parse all text chunks
			for (let j = 0; j < chunks.length; j++) {
				const chunk = chunks[j];
				//It's a text node, check if the current cheermote is there
				if (chunk.type == "text") {
					reg.lastIndex = 0;
					//Cheermote not found, skip it
					if (!reg.test(chunk.value.trim())) continue;

					//Cheermote found, remove current chunk and replace it by sub chunks
					chunks.splice(j, 1);

					//Split chunk into subchunks by cheermote codes
					const res = chunk.value.split(reg);

					//Parse all sub chunks
					res.forEach(v => {
						reg.lastIndex = 0;
						const isCheermote = reg.test(v);
						//Create new chunk node
						const node: TwitchatDataTypes.ParseMessageChunk = {
							type: isCheermote ? "cheermote" : "text",
							value: v,
						};
						//It's a matching cheermote sub chunk
						if (isCheermote) {
							//Search for the lower nearest existing tier with the specified value
							const bitsCount = parseInt(v.toLowerCase().replace(list.prefix.toLowerCase(), ""));
							let tiers = list.tiers[list.tiers.length - 1];
							for (let k = 0; k < list.tiers.length; k++) {
								if (list.tiers[k].min_bits > bitsCount) {
									tiers = list.tiers[k - 1];
									break;
								}
							}
							node.value = list.prefix + ": " + bitsCount + " bits";
							node.emote = tiers.images.dark.animated["2"] ?? tiers.images.dark.static["2"];
							node.emoteHD = tiers.images.dark.animated["4"] ?? tiers.images.dark.static["4"];
						}
						chunks.splice(j, 0, node);
						j++
					});
				}
			}
		}
		return chunks;
	}

	/**
	 * Updates a chunked message to highlight specific words.
	 * First call parseMessageToChunks() to generate compatible chunks, then call
	 * this method with the words you want to convert to "highlight" nodes
	 * Modifies the chunks array in place
	 *
	 * //TODO allow mentions starting with "@"
	 */
	public static highlightChunks(chunks: TwitchatDataTypes.ParseMessageChunk[], words: string[]): TwitchatDataTypes.ParseMessageChunk[] {
		for (let i = 0; i < words.length; i++) {
			const word = words[i].toLowerCase();
			for (let j = 0; j < chunks.length; j++) {
				const chunk = chunks[j];
				if (chunk.type != "text") continue;
				if (chunk.value.toLowerCase().indexOf(word) == -1) continue;

				//Cheermote found, remove current chunk and replace it by sub chunks
				chunks.splice(j, 1);

				//Split chunk into subchunks by cheermote codes
				const regSafeWord = word.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
				const reg = new RegExp("([a-z]*" + regSafeWord + "[a-z]*)", "gi");
				const res = chunk.value.split(reg);

				//Parse all sub chunks
				res.forEach(v => {
					reg.lastIndex = 0;
					const isWord = reg.test(v);
					//Create new chunk node
					const node: TwitchatDataTypes.ParseMessageChunk = {
						type: isWord ? "highlight" : "text",
						value: v,
					};
					chunks.splice(j, 0, node);
					j++
				});
			}
		}
		return chunks;
	}

	/**
	 * Waits a delay indicated by the rate limit returned in a request response headers
	 *
	 * @param headers
	 * @param attemptCount
	 */
	private static async onRateLimit(headers: Headers, url: string, attemptCount: number = 0): Promise<void> {
		Sentry.captureException("Twitch API quota exceeded", { attachments: [{ filename: "logs_history", data: JSON.stringify({ uid: this.uid, history: this.callHistory }) }] });
		let resetDate = parseInt(headers.get("ratelimit-reset") as string ?? Math.round(Date.now() / 1000).toString()) * 1000 + 1000;
		if (attemptCount > 0) resetDate += 1000 * Math.pow(2, attemptCount);//Scale up the time frame
		console.log("Rate limit", attemptCount, 1000 * Math.pow(2, attemptCount));
		await Utils.promisedTimeout(resetDate - Date.now() + Math.random() * 5000);
	}

	/**
	 * Calls an endpoint.
	 * If it returns a 401, attempt to refresh auth token and call the endpoint again
	 */
	private static async callApi(input: URL, init?: RequestInit | undefined): Promise<Response> {
		try {
			this.callHistory.push({ date: Date.now(), path: input.pathname, params: input.searchParams });
			if (this.callHistory.length >= 1000) this.callHistory.splice(0, 1);
			const result = await fetch(input, init);

			//Session still valid, return result
			if (result.status != 401) {
				return result;
			}

			//Session expired
			let res: false | TwitchDataTypes.AuthTokenResult = false;
			try {
				//Refresh session
				res = await this.refreshTokenCallback();
			} catch (error) { }
			if (res === false) return result;

			//Try to call endpoint again with fresh new token
			return await fetch(input, init);
		} catch (error: any) {
			if(init?.signal && init.signal.aborted) {
				return new Response(error.message, { status: 499 });
			}else{
				console.log(error);
				Sentry.captureException("Twitch API call error for endpoint " + input, { originalException: error as Error });
				return new Response(error.message, { status: 500 });
			}
		}
	}

}
type ExtensionReturnType<T extends boolean> = T extends true ? TwitchDataTypes.ActiveExtensions : TwitchDataTypes.Extension[];


//Extracted from tmi.js bundle to avoid embedding tmi.js dep
//on overlay route
interface Badges {
    admin?: string | undefined;
    bits?: string | undefined;
    broadcaster?: string | undefined;
    partner?: string | undefined;
    global_mod?: string | undefined;
    moderator?: string | undefined;
    vip?: string | undefined;
    subscriber?: string | undefined;
    staff?: string | undefined;
    turbo?: string | undefined;
    premium?: string | undefined;
    founder?: string | undefined;
    ["bits-leader"]?: string | undefined;
    ["sub-gifter"]?: string | undefined;
    [other: string]: string | undefined;
}

//Extracted from tmi.js bundle to avoid embedding tmi.js dep
//on overlay route
interface BadgeInfo {
    subscriber?: string | undefined;
    [other: string]: string | undefined;
}
